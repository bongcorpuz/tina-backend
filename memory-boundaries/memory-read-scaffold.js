// PATCH-08H scaffold: contract-only memory read eligibility and non-authority context.
// Pure, deterministic, in-memory evaluation only. Candidates arrive as in-memory arrays
// from callers/tests. No DB, Supabase, network, file, or env access; no pipeline, route,
// retrieval, source-card, or sourceAvailability imports; no persistent memory reads.

import {
  isScopeReadEligible,
  validateScopeReferenceContract
} from "./memory-scope-policy.js";
import {
  validateMemoryAuthoritySeparation,
  buildNonAuthorityMemoryContext
} from "./memory-authority-separation-policy.js";

const FLAG_NAME = "TINA_ENABLE_MEMORY_READS";
const PERMITTED_CONTEXT_PHRASING = "user/matter context indicates:";

const READ_ALLOWED = "READ_ALLOWED";
const READ_DENIED = "READ_DENIED";
const READ_REQUIRES_CONFIRMATION = "READ_REQUIRES_CONFIRMATION";
const READ_FLAG_OFF = "READ_FLAG_OFF";

const CONSENT_BLOCK_CODES = Object.freeze({
  denied: "DENIED_CONSENT_BLOCKS_DURABLE_READ",
  revoked: "REVOKED_CONSENT_BLOCKS_DURABLE_READ",
  expired: "EXPIRED_CONSENT_BLOCKS_DURABLE_READ_UNTIL_REFRESHED",
  invalid: "INVALID_CONSENT_BLOCKS_DURABLE_READ",
  superseded: "SUPERSEDED_CONSENT_CANNOT_AUTHORIZE_READ",
  required_pending: "PENDING_CONSENT_BLOCKS_DURABLE_READ",
  requested: "REQUESTED_CONSENT_BLOCKS_DURABLE_READ"
});

const SCOPE_TYPE_BY_CLASS = Object.freeze({
  user_profile: "global_user",
  user_preference: "global_user",
  client_entity: "client",
  matter: "matter",
  temporary_session: "session",
  source_derived: "source_document"
});

const first = (item, names) => {
  for (const name of names) {
    const value = item[name];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const memoryClassOf = (item) => first(item, ["memoryClass", "memory_class"]);
const scopeIdOf = (item) => first(item, ["primary_scope_id", "primaryScopeId", "clientId", "matterId"]);
const memoryIdOf = (item) => first(item, ["memoryId", "memory_id"]) ?? null;
const scopeTypeOf = (item) =>
  first(item, ["primary_scope_type", "primaryScopeType"]) ?? SCOPE_TYPE_BY_CLASS[memoryClassOf(item)];

const consentStateOf = (item) => {
  const state = first(item, ["consentState", "consent_state"]);
  return typeof state === "string" ? state : state?.id;
};

function isHighRiskTaxLegalContext(requestContext, options) {
  const riskLevel = options.riskContext?.riskLevel ?? options.riskLevel ?? requestContext.riskLevel;
  const domain = options.riskContext?.domain ?? requestContext.domain;
  return riskLevel === "high" && ["tax", "legal", "tax_legal"].includes(domain);
}

function readDecision(decision, reasons, extra = {}) {
  return Object.freeze({
    eligible: decision === READ_ALLOWED,
    decision,
    reasons: Object.freeze(reasons.slice()),
    scopeProof: extra.scopeProof ?? null,
    sourcesStillRequired: extra.sourcesStillRequired === true,
    authorityUseProhibited: true,
    legalConclusionProhibited: true,
    sourceAuthorityMutationAllowed: false
  });
}

export function getMemoryReadScaffoldContract() {
  return Object.freeze({
    id: "PATCH-08H-MEMORY-READ-SCAFFOLD-1",
    type: "memory_read_scaffold_only",
    persistentReadAllowed: false,
    durableWriteAllowed: false,
    databaseAccessAllowed: false,
    pipelineIntegrationAllowed: false,
    runtimeBehaviorChangeAllowed: false,
    sourceAuthorityMutationAllowed: false,
    requiresFeatureFlag: FLAG_NAME,
    defaultEnabled: false,
    productionEnabled: false
  });
}

export function isMemoryReadFlagEnabled(flagState) {
  const allowed = Boolean(flagState) && flagState[FLAG_NAME] === true;
  return Object.freeze({
    allowed,
    reason: allowed
      ? `${FLAG_NAME} is explicitly boolean true in the provided flag object.`
      : `${FLAG_NAME} defaults to OFF; only an explicit boolean true in a provided flag object enables it.`,
    flagName: FLAG_NAME,
    defaultOff: true
  });
}

export function evaluateMemoryReadEligibility(memoryItem, requestContext, options) {
  const item = memoryItem ?? {};
  const context = requestContext ?? {};
  const opts = options ?? {};
  const flag = isMemoryReadFlagEnabled(opts.flagState);
  const base = { sourcesStillRequired: context.authorityGoverned === true };

  if (!flag.allowed) {
    return readDecision(READ_FLAG_OFF, [`MEMORY_READ_FLAG_OFF: ${flag.reason}`], base);
  }

  const memoryClass = memoryClassOf(item);
  const permissionLevel = first(item, ["permissionLevel", "permission_level"]);
  const consentState = consentStateOf(item);
  const scopeType = scopeTypeOf(item);

  if (permissionLevel === "no_store") {
    return readDecision(READ_DENIED, ["NO_STORE_MEMORY_NEVER_READABLE"], base);
  }
  if (memoryClass === "prohibited_sensitive" || permissionLevel === "prohibited") {
    return readDecision(READ_DENIED, ["PROHIBITED_SENSITIVE_MEMORY_NEVER_READABLE"], base);
  }
  if (item.status === "revoked" || item.confidenceState === "revoked" || consentState === "revoked") {
    return readDecision(READ_DENIED, ["REVOKED_MEMORY_UNREADABLE_IMMEDIATELY"], base);
  }
  if (consentState && CONSENT_BLOCK_CODES[consentState]) {
    return readDecision(READ_DENIED, [CONSENT_BLOCK_CODES[consentState]], base);
  }

  const separation = validateMemoryAuthoritySeparation(item);
  if (!separation.allowed) {
    return readDecision(READ_DENIED, [separation.code], base);
  }
  if (memoryClass === "source_derived" &&
      (item.assertsCurrentness === true || item.assertsCaseStatus === true || item.assertsSupersession === true)) {
    return readDecision(READ_DENIED, ["SOURCE_DERIVED_CANNOT_ASSERT_CURRENTNESS_OR_CASE_STATUS"], base);
  }

  const referenceCheck = validateScopeReferenceContract(item);
  if (!referenceCheck.allowed) {
    return readDecision(READ_DENIED, [referenceCheck.code], base);
  }

  if (item.confidenceState === "contradicted") {
    return readDecision(READ_REQUIRES_CONFIRMATION, ["CONTRADICTED_MEMORY_REQUIRES_CLARIFICATION_BEFORE_READ"], base);
  }
  if (item.confidenceState === "stale" && isHighRiskTaxLegalContext(context, opts)) {
    return readDecision(READ_REQUIRES_CONFIRMATION, ["STALE_MEMORY_HIGH_RISK_TAX_LEGAL_REQUIRES_CONFIRMATION"], base);
  }

  if (!scopeType || scopeType === "ambiguous") {
    return readDecision(READ_DENIED, ["AMBIGUOUS_SCOPE_DEFAULTS_SESSION_ONLY_NOT_DURABLE_READ"], base);
  }
  if (scopeType === "session") {
    return readDecision(READ_DENIED, ["SESSION_ONLY_MEMORY_IS_NOT_DURABLY_READABLE"], base);
  }
  if (scopeType === "global_user" &&
      (item.containsClientConfidentialFact === true || item.sensitivityLabel === "client_confidential")) {
    return readDecision(READ_DENIED, ["GLOBAL_USER_MEMORY_CANNOT_CONTAIN_CLIENT_CONFIDENTIAL_FACTS"], base);
  }

  if (memoryClass === "source_derived" || scopeType === "source_document") {
    return readDecision(READ_ALLOWED, [
      "SOURCE_DERIVED_PROVENANCE_ONLY_READ",
      "LIVE_INDEX_STATE_WINS_OVER_STORED_PROVENANCE"
    ], {
      ...base,
      scopeProof: Object.freeze({
        scopeType: "source_document",
        scopeId: scopeIdOf(item) ?? null,
        provenanceOnly: true,
        currentnessAssertionAllowed: false,
        readExpansionAllowed: false
      })
    });
  }

  const transferConfirmed = context.explicitMatterTransferConfirmed === true || opts.explicitMatterTransferConfirmed === true;
  const scopeContext = transferConfirmed && context.explicitMatterTransferConfirmed !== true
    ? { ...context, explicitMatterTransferConfirmed: true }
    : context;
  const scopeCheck = isScopeReadEligible(item, scopeContext);
  if (!scopeCheck.allowed) {
    return readDecision(READ_DENIED, [scopeCheck.code], base);
  }

  const reasons = [
    "SCOPE_CONSENT_AND_AUTHORITY_SEPARATION_CONTRACTS_SATISFIED",
    "LIVE_FACTS_WIN_OVER_STORED_MEMORY"
  ];
  if (scopeType === "matter" && scopeIdOf(item) !== context.matterId && transferConfirmed) {
    reasons.push("EXPLICIT_MATTER_TRANSFER_CONFIRMATION_APPLIED");
  }
  if (base.sourcesStillRequired) {
    reasons.push("AUTHORITY_GOVERNED_QUESTION_STILL_REQUIRES_INDEXED_SOURCES");
  }

  const matchedRequestScope =
    scopeType === "client" ? context.clientId ?? null :
    scopeType === "matter" ? context.matterId ?? null :
    scopeType;

  return readDecision(READ_ALLOWED, reasons, {
    ...base,
    scopeProof: Object.freeze({
      scopeType,
      scopeId: scopeIdOf(item) ?? null,
      matchedRequestScope,
      provenanceOnly: false
    })
  });
}

export function selectEligibleMemoryForContext(memoryItems, requestContext, options) {
  const items = Array.isArray(memoryItems) ? memoryItems : [];
  const opts = options ?? {};
  const flagState = isMemoryReadFlagEnabled(opts.flagState);
  const selectedMemoryItems = [];
  const rejectedMemoryItems = [];
  const decisions = [];

  for (const item of items) {
    const itemDecision = evaluateMemoryReadEligibility(item, requestContext, options);
    decisions.push(Object.freeze({ memoryId: memoryIdOf(item ?? {}), ...itemDecision }));
    if (flagState.allowed && itemDecision.eligible) {
      selectedMemoryItems.push(item);
    } else {
      rejectedMemoryItems.push(item);
    }
  }

  return Object.freeze({
    selectedMemoryItems: Object.freeze(selectedMemoryItems),
    rejectedMemoryItems: Object.freeze(rejectedMemoryItems),
    decisions: Object.freeze(decisions),
    flagState,
    authorityUseProhibited: true,
    legalConclusionProhibited: true
  });
}

export function buildStructuredMemoryContext(selectedMemoryItems, requestContext, options) {
  const opts = options ?? {};
  const flagState = isMemoryReadFlagEnabled(opts.flagState);
  const items = flagState.allowed && Array.isArray(selectedMemoryItems) ? selectedMemoryItems : [];
  const contextItems = buildNonAuthorityMemoryContext(items);

  return Object.freeze({
    memoryContextAllowed: contextItems.length > 0,
    phrasing: PERMITTED_CONTEXT_PHRASING,
    contextItems: Object.freeze(contextItems),
    prohibitedUses: Object.freeze([
      "legal or tax authority use",
      "legal conclusion support",
      "citation creation",
      "source-card creation or mutation",
      "source currentness claims",
      "case status claims",
      "SAE, sourceAvailability, retrieval, or Authority Lock mutation",
      "overriding live conversation facts"
    ]),
    authorityUseProhibited: true,
    legalConclusionProhibited: true,
    citationAuthorityCreated: false,
    sourceCurrentnessClaimed: false,
    caseStatusClaimed: false
  });
}

export function explainMemoryReadDecision(decision) {
  const value = decision ?? {};
  const reasons = Array.isArray(value.reasons) && value.reasons.length > 0
    ? value.reasons.join("; ")
    : "no reasons recorded";
  return `${value.decision ?? "UNKNOWN_DECISION"} (eligible=${value.eligible === true}): ${reasons}. Memory is context, never authority.`;
}

export function assertReadScaffoldNoRuntimeSideEffects() {
  return Object.freeze({
    importsRuntimePipeline: false,
    importsRoutes: false,
    importsDatabase: false,
    importsSupabase: false,
    importsOpenAI: false,
    importsRetrieval: false,
    importsSourceCards: false,
    importsSourceAvailability: false,
    performsPersistentReads: false,
    performsWrites: false,
    mutatesAuthorityState: false
  });
}
