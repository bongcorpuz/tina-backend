// PATCH-08I scaffold: contract-only memory write eligibility and non-persistent write plans.
// Pure, deterministic, in-memory evaluation only. Candidates arrive as in-memory objects
// from callers/tests. No DB, Supabase, network, file, or env access; no pipeline, route,
// retrieval, source-card, or sourceAvailability imports; no durable writes and no persistence.

import {
  isValidMemoryClass,
  isValidPermissionLevel,
  isValidScopeType
} from "./memory-taxonomy-registry.js";
import { validatePrimaryScopeContract } from "./memory-scope-policy.js";
import {
  isConsentRequired,
  validateConsentResponseContract,
  applyConsentDecision
} from "./memory-consent-policy.js";
import { validateMemoryAuthoritySeparation } from "./memory-authority-separation-policy.js";

const FLAG_NAME = "TINA_ENABLE_MEMORY_WRITES";

const WRITE_ALLOWED_PLAN_ONLY = "WRITE_ALLOWED_PLAN_ONLY";
const WRITE_DENIED = "WRITE_DENIED";
const WRITE_REQUIRES_CONSENT = "WRITE_REQUIRES_CONSENT";
const WRITE_REQUIRES_SCOPE_CONFIRMATION = "WRITE_REQUIRES_SCOPE_CONFIRMATION";
const WRITE_FLAG_OFF = "WRITE_FLAG_OFF";
const WRITE_PROHIBITED = "WRITE_PROHIBITED";

const NO_DURABLE_WRITE_RESPONSES = Object.freeze(["deny", "session_only", "ask_later"]);
const APPROVAL_RESPONSES = Object.freeze(["approve", "approve_with_edits"]);

const CONSENT_STATE_BLOCK_CODES = Object.freeze({
  denied: "DENIED_CONSENT_BLOCKS_WRITE",
  revoked: "REVOKED_CONSENT_BLOCKS_WRITE",
  expired: "EXPIRED_CONSENT_BLOCKS_WRITE_UNTIL_REFRESHED",
  invalid: "INVALID_CONSENT_BLOCKS_WRITE",
  superseded: "SUPERSEDED_CONSENT_CANNOT_AUTHORIZE_WRITE"
});

const PROHIBITED_CONTENT_PATTERN =
  /password|passphrase|api[\s_-]?key|access[\s_-]?token|private[\s_-]?key|\bsecrets?\b|\bcredentials?\b/i;

const first = (item, names) => {
  for (const name of names) {
    const value = item[name];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const valueCount = (values) =>
  values.filter((value) => value !== undefined && value !== null && value !== "").length;

const decision = (allowed, code, reason, extra = {}) => Object.freeze({ allowed, code, reason, ...extra });

const memoryClassOf = (item) => first(item, ["memoryClass", "memory_class"]);
const permissionLevelOf = (item) => first(item, ["permissionLevel", "permission_level"]);
const scopeTypeOf = (item) => first(item, ["primary_scope_type", "primaryScopeType"]);
const scopeIdOf = (item) => first(item, ["primary_scope_id", "primaryScopeId"]);
const scopeLabelOf = (item) => first(item, ["scopeLabel", "proposedScopeLabel"]);

const consentStateOf = (candidate, opts) => {
  const state = opts.consentState ?? first(candidate, ["consentState", "consent_state"]);
  return typeof state === "string" ? state : state?.id;
};

function writeDecision(outcome, reasons, extra = {}) {
  return Object.freeze({
    eligible: outcome === WRITE_ALLOWED_PLAN_ONLY,
    decision: outcome,
    reasons: Object.freeze(reasons.slice()),
    proposedWritePlan: extra.proposedWritePlan ?? null,
    consentProof: extra.consentProof ?? null,
    scopeProof: extra.scopeProof ?? null,
    authorityUseProhibited: true,
    legalConclusionProhibited: true,
    sourceAuthorityMutationAllowed: false,
    persistentWritePerformed: false
  });
}

export function getMemoryWriteScaffoldContract() {
  return Object.freeze({
    id: "PATCH-08I-MEMORY-WRITE-SCAFFOLD-1",
    type: "memory_write_scaffold_only",
    persistentWriteAllowed: false,
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

export function isMemoryWriteFlagEnabled(flagState) {
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

export function rejectProhibitedMemoryCandidate(candidate) {
  const c = candidate ?? {};
  const categories = [];

  if (c.containsCredentials === true || c.containsSecrets === true) {
    categories.push("credential_or_secret");
  }
  const scannableText = [c.contentSummary, c.rawContent, c.userNotes]
    .filter((value) => typeof value === "string")
    .join(" ");
  if (scannableText && PROHIBITED_CONTENT_PATTERN.test(scannableText)) {
    if (!categories.includes("credential_or_secret")) categories.push("credential_or_secret");
  }
  if (
    c.containsRawConfidentialDocumentText === true ||
    c.contentType === "raw_confidential_document" ||
    (typeof c.rawConfidentialDocumentText === "string" && c.rawConfidentialDocumentText.length > 0)
  ) {
    categories.push("raw_confidential_document_text");
  }
  if (c.unsupportedLegalConclusionAsAuthority === true) {
    categories.push("unsupported_legal_conclusion_as_authority");
  }
  if (c.unsupportedTaxConclusionAsAuthority === true) {
    categories.push("unsupported_tax_conclusion_as_authority");
  }
  if (c.claimsCaseStatus === true || c.assertsCaseCurrentness === true || c.caseStatus) {
    categories.push("court_case_currentness_claim");
  }
  if (c.claimsLegalCurrentness === true || c.assertsSupersession === true || c.sourceCurrentnessStatus) {
    categories.push("source_currentness_or_supersession_claim");
  }
  if (c.bypassPhase10Deferral === true) {
    categories.push("phase10_bypass_claim");
  }

  const rejected = categories.length > 0;
  return Object.freeze({
    rejected,
    code: rejected ? "PROHIBITED_MEMORY_CANDIDATE" : "NO_PROHIBITED_CONTENT_DETECTED",
    reason: rejected
      ? `Candidate contains prohibited content: ${categories.join(", ")}.`
      : "No prohibited content detected in the candidate.",
    prohibitedCategories: Object.freeze(categories)
  });
}

export function validateWriteCandidateContract(candidate) {
  const c = candidate ?? {};

  if (valueCount([c.memory_class, c.memoryClass]) !== 1) {
    return decision(false, "MEMORY_CLASS_REQUIRED_EXACTLY_ONCE", "Exactly one memory_class is required.");
  }
  if (!isValidMemoryClass(memoryClassOf(c))) {
    return decision(false, "INVALID_MEMORY_CLASS", "memory_class must be a Phase 8B taxonomy class.");
  }
  if (valueCount([c.permission_level, c.permissionLevel]) !== 1) {
    return decision(false, "PERMISSION_LEVEL_REQUIRED_EXACTLY_ONCE", "Exactly one permission_level is required.");
  }
  if (!isValidPermissionLevel(permissionLevelOf(c))) {
    return decision(false, "INVALID_PERMISSION_LEVEL", "permission_level must be a Phase 8B permission level.");
  }
  const primary = validatePrimaryScopeContract(c);
  if (!primary.allowed) return primary;
  if (!isValidScopeType(scopeTypeOf(c))) {
    return decision(false, "INVALID_PRIMARY_SCOPE_TYPE", "primary_scope_type must be a Phase 8B/8D scope type.");
  }
  if (c.authorityUseProhibited !== true) {
    return decision(false, "AUTHORITY_USE_PROHIBITED_MUST_BE_TRUE", "Write candidates must carry authorityUseProhibited true.");
  }
  if (c.legalConclusionProhibited !== true) {
    return decision(false, "LEGAL_CONCLUSION_PROHIBITED_MUST_BE_TRUE", "Write candidates must carry legalConclusionProhibited true.");
  }
  return decision(true, "WRITE_CANDIDATE_CONTRACT_VALID", "Write candidate contract is satisfied.");
}

export function buildNonPersistentWritePlan(candidate, consentResponse, requestContext, options) {
  const c = candidate ?? {};
  const response = consentResponse ?? {};
  const isEdit = response.userResponse === "approve_with_edits";

  return Object.freeze({
    planType: "non_persistent_write_plan",
    proposedMemoryClass: memoryClassOf(c) ?? null,
    proposedPermissionLevel: permissionLevelOf(c) ?? null,
    proposedPrimaryScopeType: scopeTypeOf(c) ?? null,
    proposedPrimaryScopeId: scopeIdOf(c) ?? null,
    contentSummary: isEdit ? response.editedContentSummary ?? null : c.contentSummary ?? null,
    originalCandidateSuperseded: isEdit === true,
    sensitivityLabel: c.sensitivityLabel ?? "unlabeled",
    confidenceState: c.confidenceState ?? "unverified",
    consentEventRequired: true,
    consentEventId: response.consentEventId ?? response.consentRequestId ?? null,
    sourceRefs: Object.freeze(Array.isArray(c.sourceRefs) ? c.sourceRefs.slice() : []),
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
    auditEventsToCreateLater: Object.freeze(["consent_granted", "memory_written_after_consent"]),
    persistentWritePerformed: false,
    databaseWritePerformed: false,
    durableMemoryCreated: false,
    authorityUseProhibited: true,
    legalConclusionProhibited: true,
    citationAuthorityCreated: false,
    sourceCurrentnessClaimed: false,
    caseStatusClaimed: false
  });
}

export function evaluateMemoryWriteEligibility(candidate, requestContext, options) {
  const c = candidate ?? {};
  const context = requestContext ?? {};
  const opts = options ?? {};
  const flag = isMemoryWriteFlagEnabled(opts.flagState);

  if (!flag.allowed) {
    return writeDecision(WRITE_FLAG_OFF, [`MEMORY_WRITE_FLAG_OFF: ${flag.reason}`]);
  }

  const prohibited = rejectProhibitedMemoryCandidate(c);
  if (prohibited.rejected) {
    return writeDecision(WRITE_PROHIBITED, [prohibited.code, ...prohibited.prohibitedCategories]);
  }

  const memoryClass = memoryClassOf(c);
  const permissionLevel = permissionLevelOf(c);
  const scopeType = scopeTypeOf(c);
  const consentResponse = opts.consentResponse ?? null;
  const consentState = consentStateOf(c, opts);

  if (memoryClass === "prohibited_sensitive" || permissionLevel === "prohibited") {
    return writeDecision(WRITE_PROHIBITED, ["PROHIBITED_SENSITIVE_MEMORY_NEVER_WRITABLE"]);
  }
  if (memoryClass === "source_derived") {
    return writeDecision(WRITE_DENIED, ["SOURCE_DERIVED_PROVENANCE_ONLY_NO_DURABLE_WRITE"]);
  }
  if (permissionLevel === "no_store") {
    return writeDecision(WRITE_DENIED, ["NO_STORE_MEMORY_NEVER_PERSISTABLE"]);
  }
  if (permissionLevel === "session_only" || memoryClass === "temporary_session") {
    return writeDecision(WRITE_DENIED, ["SESSION_ONLY_CREATES_NO_DURABLE_MEMORY"]);
  }
  if (!scopeType || scopeType === "ambiguous") {
    return writeDecision(WRITE_DENIED, ["AMBIGUOUS_SCOPE_DEFAULTS_SESSION_ONLY_NO_DURABLE_WRITE"]);
  }
  if (scopeType === "global_user" &&
      (c.containsClientConfidentialFact === true || c.sensitivityLabel === "client_confidential")) {
    return writeDecision(WRITE_DENIED, ["GLOBAL_USER_MEMORY_CANNOT_CONTAIN_CLIENT_CONFIDENTIAL_FACTS"]);
  }

  const separation = validateMemoryAuthoritySeparation(c);
  if (!separation.allowed) {
    return writeDecision(WRITE_DENIED, [separation.code]);
  }

  const contract = validateWriteCandidateContract(c);
  if (!contract.allowed) {
    return writeDecision(WRITE_DENIED, [contract.code]);
  }

  if (consentState && CONSENT_STATE_BLOCK_CODES[consentState]) {
    return writeDecision(WRITE_DENIED, [CONSENT_STATE_BLOCK_CODES[consentState]]);
  }

  if (consentResponse && NO_DURABLE_WRITE_RESPONSES.includes(consentResponse.userResponse)) {
    const applied = applyConsentDecision(c, consentResponse);
    return writeDecision(WRITE_DENIED, [applied.code, `${consentResponse.userResponse.toUpperCase()}_CREATES_NO_DURABLE_WRITE`]);
  }
  if (consentResponse) {
    const responseCheck = validateConsentResponseContract(consentResponse);
    if (!responseCheck.allowed) {
      const outcome = responseCheck.code === "DIFFERENT_SCOPE_REQUIRES_SCOPE_VALIDATION"
        ? WRITE_REQUIRES_SCOPE_CONFIRMATION
        : WRITE_DENIED;
      return writeDecision(outcome, [responseCheck.code]);
    }
  }

  const needsVisibleScope = memoryClass === "client_entity" || memoryClass === "matter";
  const scopeLabel = scopeLabelOf(c);
  const visibleScopeConfirmed =
    Boolean(scopeLabel) &&
    (context.visibleScopeConfirmed === true ||
      context.scopeConfirmationVisible === true ||
      consentResponse?.scopeConfirmed === true);
  if (needsVisibleScope && !visibleScopeConfirmed) {
    return writeDecision(WRITE_REQUIRES_SCOPE_CONFIRMATION, [
      memoryClass === "client_entity"
        ? "CLIENT_ENTITY_REQUIRES_VISIBLE_CLIENT_SCOPE_CONFIRMATION"
        : "MATTER_MEMORY_REQUIRES_VISIBLE_MATTER_SCOPE_CONFIRMATION"
    ]);
  }

  const consentRequirement = isConsentRequired(c);
  const sensitiveConsentRequired = consentRequirement.code === "SENSITIVE_CLIENT_MATTER_REQUIRES_EXPLICIT_CONSENT";
  const approvedResponse =
    consentResponse !== null &&
    APPROVAL_RESPONSES.includes(consentResponse.userResponse) &&
    consentResponse.approved === true;

  if (sensitiveConsentRequired && !approvedResponse) {
    return writeDecision(WRITE_REQUIRES_CONSENT, ["SENSITIVE_CLIENT_MATTER_REQUIRES_EXPLICIT_CONSENT"]);
  }
  if (!approvedResponse && consentState !== "granted") {
    return writeDecision(WRITE_REQUIRES_CONSENT, ["DURABLE_WRITE_REQUIRES_APPROVED_CONSENT", "DEFAULT_CONSENT_RESPONSE_IS_NEVER_APPROVE"]);
  }

  const reasons = [
    "WRITE_CONTRACTS_SATISFIED_PLAN_ONLY",
    "NO_PERSISTENT_WRITE_PERFORMED",
    "CONSENT_AUTHORIZES_STORAGE_ONLY_NEVER_AUTHORITY"
  ];
  if (consentResponse?.userResponse === "approve_with_edits") {
    reasons.push("APPROVE_WITH_EDITS_SUPERSEDES_ORIGINAL_CANDIDATE");
  }

  return writeDecision(WRITE_ALLOWED_PLAN_ONLY, reasons, {
    proposedWritePlan: buildNonPersistentWritePlan(c, consentResponse, context, opts),
    consentProof: Object.freeze({
      userResponse: consentResponse?.userResponse ?? null,
      approved: approvedResponse,
      consentState: consentState ?? null,
      explicitConsent: sensitiveConsentRequired || needsVisibleScope,
      consentEventId: consentResponse?.consentEventId ?? consentResponse?.consentRequestId ?? null,
      authorizesStorageOnly: true,
      authorizesAuthorityUse: false
    }),
    scopeProof: Object.freeze({
      scopeType,
      scopeId: scopeIdOf(c) ?? null,
      scopeLabel: scopeLabel ?? null,
      visibleScopeConfirmed: needsVisibleScope ? true : visibleScopeConfirmed
    })
  });
}

export function explainMemoryWriteDecision(writeDecisionValue) {
  const value = writeDecisionValue ?? {};
  const reasons = Array.isArray(value.reasons) && value.reasons.length > 0
    ? value.reasons.join("; ")
    : "no reasons recorded";
  return `${value.decision ?? "UNKNOWN_DECISION"} (eligible=${value.eligible === true}, persistentWritePerformed=false): ${reasons}. Memory is context, never authority.`;
}

export function assertWriteScaffoldNoRuntimeSideEffects() {
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
    performsPersistentWrites: false,
    performsWrites: false,
    mutatesAuthorityState: false
  });
}
