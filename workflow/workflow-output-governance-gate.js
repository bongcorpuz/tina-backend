// FILE: workflow/workflow-output-governance-gate.js
// PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1
//
// Pure, dependency-free cross-cutting governance gate for the Phase 9
// Professional Workflow Co-Pilot schemas. This module has NO I/O, NO network
// calls, NO Supabase/OpenAI/Google Drive/n8n/Firecrawl/Crawlee dependency, NO
// filesystem access, NO process.env dependency, NO Date.now/randomness, and NO
// side effects. It imports only the pure Phase 9 schema/registry helper files
// listed below — never server.js, routes, pipeline, ask-handler, engines,
// database clients, or any env-dependent module. It generates no live
// professional outputs and is not wired into ask-handler.js, pipeline.js,
// server.js, routes, or the frontend.

"use strict";

import { WORKFLOW_MODE_IDS, getWorkflowMode, normalizeWorkflowModeId } from "./workflow-mode-registry.js";
import {
  TAX_MEMO_SCHEMA,
  TAX_MEMO_GOVERNANCE_RULES,
  TAX_MEMO_PROHIBITED_BEHAVIORS,
  getTaxMemoSourceCardRequirement,
  validateTaxMemoSchema
} from "./tax-memo-schema.js";
import {
  AUDIT_DEFENSE_MATRIX_SCHEMA,
  AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES,
  AUDIT_DEFENSE_MATRIX_PROHIBITED_BEHAVIORS,
  getAuditDefenseMatrixSourceCardRequirement,
  validateAuditDefenseMatrixSchema
} from "./audit-defense-matrix-schema.js";
import {
  BIR_REPLY_DRAFT_SCHEMA,
  BIR_REPLY_DRAFT_GOVERNANCE_RULES,
  BIR_REPLY_DRAFT_PROHIBITED_BEHAVIORS,
  getBirReplyDraftSourceCardRequirement,
  validateBirReplyDraftSchema
} from "./bir-reply-draft-schema.js";
import {
  CLIENT_ADVISORY_SCHEMA,
  CLIENT_ADVISORY_GOVERNANCE_RULES,
  CLIENT_ADVISORY_PROHIBITED_BEHAVIORS,
  getClientAdvisorySourceCardRequirement,
  validateClientAdvisorySchema
} from "./client-advisory-schema.js";
import {
  COMPLIANCE_CHECKLIST_SCHEMA,
  COMPLIANCE_CHECKLIST_GOVERNANCE_RULES,
  COMPLIANCE_CHECKLIST_PROHIBITED_BEHAVIORS,
  getComplianceChecklistSourceCardRequirement,
  validateComplianceChecklistSchema
} from "./compliance-checklist-schema.js";

export const PHASE_09G_WORKFLOW_OUTPUT_GOVERNANCE_GATE_VERSION = "1.0.0";

export const WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_FLAGS = Object.freeze([
  "runtimeWiringFalse",
  "featureFlagDefaultOff",
  "humanReviewRequired",
  "sourceCardsRequired",
  "missingFactsRequired",
  "assumptionsRequired",
  "finalFilingFalse",
  "automaticSubmissionFalse",
  "liveGenerationFalse",
  "persistentStorageFalse",
  "memoryInactive",
  "productionUnchanged"
]);

export const WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_POLICIES = Object.freeze([
  "existing_retrieval_only",
  "no_live_web_search",
  "no_new_authority_ingestion",
  "no_unapproved_sources",
  "source_cards_required",
  "missing_facts_required",
  "assumptions_required",
  "human_review_required",
  "no_fabricated_citations",
  "controlling_authority_prioritized",
  "related_authority_disclosed_as_related",
  "currentness_unknown_disclosed",
  "authority_type_label_required",
  "unsupported_authority_disclosure_required",
  "no_memory_activation",
  "no_persistent_client_matter_storage",
  "no_generated_work_product_persistence",
  "no_third_party_egress",
  "no_production_change"
]);

// Minimum prohibited-behavior subset shared by every dedicated Phase 9 mode
// schema (mode-specific extras like guaranteed_bir_outcome_claim are not
// universal and are intentionally excluded from this cross-schema check).
const UNIVERSAL_MINIMUM_PROHIBITED_BEHAVIORS = Object.freeze([
  "fabricated_authority",
  "unsupported_legal_conclusion",
  "final_filing_claim",
  "automatic_submission",
  "live_web_search",
  "new_authority_ingestion",
  "unapproved_source_citation",
  "memory_write",
  "client_matter_persistence",
  "generated_work_product_persistence",
  "third_party_egress",
  "production_change",
  "official_url_verification_claim_without_official_url",
  "currentness_claim_without_currentness_status"
]);

export const WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_BEHAVIORS = Object.freeze([
  "fabricated_authority",
  "unsupported_legal_conclusion",
  "final_filing_claim",
  "automatic_submission",
  "live_web_search",
  "new_authority_ingestion",
  "unapproved_source_citation",
  "memory_write",
  "client_matter_persistence",
  "generated_work_product_persistence",
  "third_party_egress",
  "production_change",
  "official_url_verification_claim_without_official_url",
  "currentness_claim_without_currentness_status",
  "guaranteed_tax_outcome_claim",
  "guaranteed_bir_outcome_claim",
  "guaranteed_audit_outcome_claim",
  "guaranteed_compliance_outcome_claim",
  "deadline_claim_without_date_basis",
  "false_timeliness_assurance",
  "automatic_filing_claim"
]);

// Conservative, deterministic, lowercased-substring phrase definitions for
// each prohibited claim. No AI model, no network, no mutation. Callers should
// treat these as documentation-only pattern lists consumed by
// detectProhibitedWorkflowClaims().
const CLAIM_PHRASES = Object.freeze({
  final_filing_claim: Object.freeze(["this constitutes a final filing", "final filing has been submitted", "officially filed with the bir"]),
  automatic_submission_claim: Object.freeze(["automatically submitted to the bir", "has been automatically filed", "auto-submitted on your behalf"]),
  production_ready_claim: Object.freeze(["production ready", "ready for production", "production-ready"]),
  memory_enabled_claim: Object.freeze(["memory is enabled", "memory enabled", "persistent memory is active"]),
  client_matter_persistence_claim: Object.freeze(["client matter has been saved", "matter persisted to the database", "client data stored permanently"]),
  generated_work_product_persistence_claim: Object.freeze(["work product saved to the database", "this output has been persisted", "draft stored permanently"]),
  external_search_implemented_claim: Object.freeze(["live web search performed", "external search implemented", "searched the web for this"]),
  n8n_implemented_claim: Object.freeze(["n8n workflow executed", "n8n implemented", "sent to n8n for processing"]),
  firecrawl_implemented_claim: Object.freeze(["firecrawl implemented", "crawled using firecrawl", "firecrawl fetch completed"]),
  crawlee_implemented_claim: Object.freeze(["crawlee implemented", "crawled using crawlee"]),
  phase10_source_governance_implemented_claim: Object.freeze(["phase 10 implemented", "authority search engine implemented", "phase 10 source governance implemented"]),
  phase11_retrieval_optimization_implemented_claim: Object.freeze(["phase 11 implemented", "retrieval optimization implemented", "hybrid bm25 retrieval implemented"]),
  official_url_verification_without_official_url_claim: Object.freeze(["official url verified", "official url verification complete", "official url has been verified"]),
  currentness_fully_verified_claim: Object.freeze(["currentness fully verified", "fully verified as current", "confirmed fully current"]),
  guaranteed_tax_outcome_claim: Object.freeze(["guaranteed tax outcome", "guaranteed favorable tax ruling", "guaranteed to win this tax case"]),
  guaranteed_bir_outcome_claim: Object.freeze(["guaranteed bir outcome", "guaranteed approval by the bir", "guaranteed to win the protest"]),
  guaranteed_audit_outcome_claim: Object.freeze(["guaranteed audit outcome", "guaranteed to pass the audit", "guaranteed audit result"]),
  guaranteed_compliance_outcome_claim: Object.freeze(["guaranteed compliance outcome", "guaranteed full compliance", "guaranteed to satisfy the bir"]),
  automatic_filing_implemented_claim: Object.freeze(["automatic filing implemented", "auto-filing implemented", "automatically filed with the bir"])
});

export const WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_CLAIMS = Object.freeze(
  Object.fromEntries(Object.entries(CLAIM_PHRASES).map(([claimId, phrases]) => [claimId, { patterns: [...phrases] }]))
);

export const WORKFLOW_OUTPUT_GOVERNANCE_SCHEMA_COVERAGE = Object.freeze({
  dedicated: Object.freeze(["tax_memo", "bir_reply_protest_draft", "audit_defense_matrix", "client_advisory", "compliance_checklist"]),
  registryOnlyPending: Object.freeze(["requirements_request_letter"])
});

const MODE_SCHEMA_KEY_MAP = Object.freeze({
  tax_memo: "taxMemoOutput",
  bir_reply_protest_draft: "birReplyDraftOutput",
  audit_defense_matrix: "auditDefenseMatrixOutput",
  client_advisory: "clientAdvisoryOutput",
  compliance_checklist: "complianceChecklistOutput",
  requirements_request_letter: "requirementsRequestLetterOutput"
});

const DEDICATED_SCHEMA_TABLE = Object.freeze({
  tax_memo: Object.freeze({
    schema: TAX_MEMO_SCHEMA,
    governanceRules: TAX_MEMO_GOVERNANCE_RULES,
    prohibitedBehaviors: TAX_MEMO_PROHIBITED_BEHAVIORS,
    getSourceCardRequirement: getTaxMemoSourceCardRequirement,
    validateSchema: validateTaxMemoSchema
  }),
  bir_reply_protest_draft: Object.freeze({
    schema: BIR_REPLY_DRAFT_SCHEMA,
    governanceRules: BIR_REPLY_DRAFT_GOVERNANCE_RULES,
    prohibitedBehaviors: BIR_REPLY_DRAFT_PROHIBITED_BEHAVIORS,
    getSourceCardRequirement: getBirReplyDraftSourceCardRequirement,
    validateSchema: validateBirReplyDraftSchema
  }),
  audit_defense_matrix: Object.freeze({
    schema: AUDIT_DEFENSE_MATRIX_SCHEMA,
    governanceRules: AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES,
    prohibitedBehaviors: AUDIT_DEFENSE_MATRIX_PROHIBITED_BEHAVIORS,
    getSourceCardRequirement: getAuditDefenseMatrixSourceCardRequirement,
    validateSchema: validateAuditDefenseMatrixSchema
  }),
  client_advisory: Object.freeze({
    schema: CLIENT_ADVISORY_SCHEMA,
    governanceRules: CLIENT_ADVISORY_GOVERNANCE_RULES,
    prohibitedBehaviors: CLIENT_ADVISORY_PROHIBITED_BEHAVIORS,
    getSourceCardRequirement: getClientAdvisorySourceCardRequirement,
    validateSchema: validateClientAdvisorySchema
  }),
  compliance_checklist: Object.freeze({
    schema: COMPLIANCE_CHECKLIST_SCHEMA,
    governanceRules: COMPLIANCE_CHECKLIST_GOVERNANCE_RULES,
    prohibitedBehaviors: COMPLIANCE_CHECKLIST_PROHIBITED_BEHAVIORS,
    getSourceCardRequirement: getComplianceChecklistSourceCardRequirement,
    validateSchema: validateComplianceChecklistSchema
  })
});

const REGISTRY_ONLY_REQUIRED_PROHIBITED_BEHAVIORS = Object.freeze([
  "live_web_search",
  "new_authority_ingestion",
  "memory_write",
  "production_change"
]);

function deepClone(value) {
  if (Array.isArray(value)) return value.map((item) => deepClone(item));
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) out[key] = deepClone(value[key]);
    return out;
  }
  return value;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeSnippet(text) {
  const collapsed = String(text).replace(/\s+/g, " ").trim();
  return collapsed.length > 120 ? `${collapsed.slice(0, 117)}...` : collapsed;
}

/**
 * Returns a fresh governance-result scaffold. Every call returns new
 * arrays/objects; no shared mutable references are returned.
 *
 * @returns {object}
 */
export function createWorkflowGovernanceResult() {
  return {
    valid: true,
    errors: [],
    warnings: [],
    mode: null,
    schemaKey: null,
    checks: [],
    prohibitedClaims: {
      hasProhibitedClaims: false,
      matches: []
    }
  };
}

/**
 * Normalizes a candidate mode identifier via the workflow mode registry's
 * normalization (which already covers Phase 9 aliases). Returns null for
 * unsupported input.
 *
 * @param {*} modeId
 * @returns {string|null}
 */
export function normalizeGovernanceModeId(modeId) {
  return normalizeWorkflowModeId(modeId);
}

/**
 * Returns a defensive deep-cloned copy of all governance requirements.
 *
 * @returns {object}
 */
export function getWorkflowGovernanceRequirements() {
  return {
    requiredFlags: [...WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_FLAGS],
    requiredPolicies: [...WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_POLICIES],
    prohibitedClaims: deepClone(WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_CLAIMS),
    prohibitedBehaviors: [...WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_BEHAVIORS],
    schemaCoverage: deepClone(WORKFLOW_OUTPUT_GOVERNANCE_SCHEMA_COVERAGE)
  };
}

/**
 * Returns a defensive deep-cloned copy of the schema coverage map.
 *
 * @returns {object}
 */
export function getWorkflowGovernanceSchemaCoverage() {
  return deepClone(WORKFLOW_OUTPUT_GOVERNANCE_SCHEMA_COVERAGE);
}

/**
 * Recursively scans a value (string/array/object) for prohibited claim
 * phrases. Pure, synchronous, never mutates input, performs no I/O.
 *
 * @param {*} value
 * @param {{claimIds?: string[]}} [options]
 * @returns {{hasProhibitedClaims: boolean, matches: Array<{claimId: string, path: string, matchedText: string}>}}
 */
export function detectProhibitedWorkflowClaims(value, options = {}) {
  const claimIds = Array.isArray(options.claimIds) ? options.claimIds : Object.keys(CLAIM_PHRASES);
  const matches = [];

  function walk(node, path) {
    if (typeof node === "string") {
      const lower = node.toLowerCase();
      for (const claimId of claimIds) {
        const phrases = CLAIM_PHRASES[claimId];
        if (!phrases) continue;
        if (phrases.some((phrase) => lower.includes(phrase))) {
          matches.push({ claimId, path: path || "root", matchedText: sanitizeSnippet(node) });
        }
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, path ? `${path}[${i}]` : `[${i}]`));
      return;
    }
    if (node && typeof node === "object") {
      for (const key of Object.keys(node)) {
        walk(node[key], path ? `${path}.${key}` : key);
      }
    }
  }

  walk(value, "");

  return { hasProhibitedClaims: matches.length > 0, matches };
}

/**
 * Validates governance invariants on a candidate metadata object. Never
 * throws.
 *
 * @param {*} metadata
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateWorkflowMetadataGovernance(metadata) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(metadata)) {
    errors.push("metadata must be an object");
    return { valid: false, errors, warnings };
  }

  if (metadata.finalFiling !== false) errors.push("metadata.finalFiling must be false");
  if (metadata.automaticSubmission !== false) errors.push("metadata.automaticSubmission must be false");
  if (metadata.runtimeWiring !== false) errors.push("metadata.runtimeWiring must be false");
  if (metadata.featureFlagDefault !== "off") errors.push('metadata.featureFlagDefault must be "off"');

  if (Object.prototype.hasOwnProperty.call(metadata, "retrievalPolicy")) {
    if (!Array.isArray(metadata.retrievalPolicy) || !metadata.retrievalPolicy.includes("existing_retrieval_only")) {
      errors.push("metadata.retrievalPolicy must include existing_retrieval_only when present");
    }
  } else {
    warnings.push("metadata.retrievalPolicy missing");
  }

  if (Object.prototype.hasOwnProperty.call(metadata, "authorityPolicy")) {
    if (!Array.isArray(metadata.authorityPolicy) || !metadata.authorityPolicy.includes("no_fabricated_citations")) {
      errors.push("metadata.authorityPolicy must include no_fabricated_citations when present");
    }
  } else {
    warnings.push("metadata.authorityPolicy missing");
  }

  if (!Object.prototype.hasOwnProperty.call(metadata, "sourceCardPolicy")) {
    warnings.push("metadata.sourceCardPolicy missing");
  }

  if (Object.prototype.hasOwnProperty.call(metadata, "privacyPolicy")) {
    const p = metadata.privacyPolicy;
    if (!Array.isArray(p) || !p.includes("no_memory_activation") || !p.includes("no_third_party_egress")) {
      errors.push("metadata.privacyPolicy must include no_memory_activation and no_third_party_egress when present");
    }
  } else {
    warnings.push("metadata.privacyPolicy missing");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates governance invariants on a candidate sourceCards array. Never
 * throws.
 *
 * @param {*} sourceCards
 * @param {{requireNonEmpty?: boolean, allowPhase9ArchiveOnly?: boolean, requireOfficialUrl?: boolean, requireCanonicalSourceId?: boolean}} [options]
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateWorkflowSourceCards(sourceCards, options = {}) {
  const opts = {
    requireNonEmpty: true,
    allowPhase9ArchiveOnly: true,
    requireOfficialUrl: false,
    requireCanonicalSourceId: false,
    ...options
  };
  const errors = [];
  const warnings = [];

  if (!Array.isArray(sourceCards)) {
    errors.push("sourceCards must be an array");
    return { valid: false, errors, warnings };
  }

  if (opts.requireNonEmpty && sourceCards.length === 0) {
    errors.push("sourceCards must be non-empty");
  }

  sourceCards.forEach((card, index) => {
    if (!isPlainObject(card)) {
      errors.push(`sourceCards[${index}] must be an object`);
      return;
    }

    const identifyingFields = ["sourceCardId", "title", "archiveUrl", "gdriveFileId", "excerpt"];
    const hasIdentifyingField = identifyingFields.some((field) => {
      const v = card[field];
      return v !== undefined && v !== null && v !== "";
    });
    if (!hasIdentifyingField) {
      errors.push(`sourceCards[${index}] must have at least one of ${identifyingFields.join("/")}`);
    }

    const hasOfficialUrl = typeof card.officialUrl === "string" && card.officialUrl.length > 0;
    const hasCurrentnessStatus =
      typeof card.currentnessStatus === "string" && card.currentnessStatus.length > 0 && card.currentnessStatus !== "unknown";

    const cardClaims = detectProhibitedWorkflowClaims(card, {
      claimIds: ["official_url_verification_without_official_url_claim", "currentness_fully_verified_claim"]
    });

    if (!hasOfficialUrl && cardClaims.matches.some((m) => m.claimId === "official_url_verification_without_official_url_claim")) {
      errors.push(`sourceCards[${index}] claims official URL verification without an officialUrl`);
    }
    if (!hasCurrentnessStatus && cardClaims.matches.some((m) => m.claimId === "currentness_fully_verified_claim")) {
      errors.push(`sourceCards[${index}] claims currentness fully verified without a currentnessStatus`);
    }

    if (opts.requireOfficialUrl && !hasOfficialUrl) {
      errors.push(`sourceCards[${index}] missing required officialUrl`);
    }
    if (opts.requireCanonicalSourceId && !(typeof card.canonicalSourceId === "string" && card.canonicalSourceId.length > 0)) {
      errors.push(`sourceCards[${index}] missing required canonicalSourceId`);
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates a candidate Phase 9 professional output object against
 * cross-cutting governance requirements. Never throws.
 *
 * @param {*} output
 * @param {{modeId?: string, requireNonEmptySourceCards?: boolean, allowPhase9ArchiveOnly?: boolean}} [options]
 * @returns {object} createWorkflowGovernanceResult()-shaped result
 */
export function validateWorkflowOutputGovernance(output, options = {}) {
  const result = createWorkflowGovernanceResult();

  if (!isPlainObject(output)) {
    result.valid = false;
    result.errors.push("output must be a plain object");
    return result;
  }

  const modeId = normalizeGovernanceModeId(options.modeId !== undefined ? options.modeId : output.mode);
  result.mode = modeId;

  if (!modeId || !Object.prototype.hasOwnProperty.call(MODE_SCHEMA_KEY_MAP, modeId)) {
    result.valid = false;
    result.errors.push(`unsupported mode: ${JSON.stringify(options.modeId !== undefined ? options.modeId : output.mode)}`);
    return result;
  }

  const expectedSchemaKey = MODE_SCHEMA_KEY_MAP[modeId];
  result.schemaKey = output.schemaKey;
  if (output.schemaKey !== expectedSchemaKey) {
    result.valid = false;
    result.errors.push(`schemaKey mismatch: expected "${expectedSchemaKey}", found ${JSON.stringify(output.schemaKey)}`);
  }

  if (modeId === "requirements_request_letter") {
    result.warnings.push("dedicated_schema_pending");
  }

  if (!Array.isArray(output.sourceCards)) {
    result.valid = false;
    result.errors.push("sourceCards must exist and be an array");
  } else if (output.sourceCards.length === 0) {
    result.warnings.push("sourceCards is empty");
  }

  if (!Array.isArray(output.missingFacts)) {
    result.valid = false;
    result.errors.push("missingFacts must exist and be an array");
  } else if (output.missingFacts.length === 0) {
    result.warnings.push("missingFacts is empty");
  }

  if (!Array.isArray(output.assumptions)) {
    result.valid = false;
    result.errors.push("assumptions must exist and be an array");
  } else if (output.assumptions.length === 0) {
    result.warnings.push("assumptions is empty");
  }

  if (typeof output.humanReviewNotice !== "string") {
    result.valid = false;
    result.errors.push("humanReviewNotice must exist and be a string");
  } else if (output.humanReviewNotice.length === 0) {
    result.warnings.push("humanReviewNotice is empty");
  }

  const metadataResult = validateWorkflowMetadataGovernance(output.metadata);
  result.checks.push({ check: "metadata", ...metadataResult });
  if (!metadataResult.valid) {
    result.valid = false;
    result.errors.push(...metadataResult.errors.map((e) => `metadata: ${e}`));
  }
  result.warnings.push(...metadataResult.warnings.map((w) => `metadata: ${w}`));

  if (Array.isArray(output.sourceCards)) {
    const sourceCardResult = validateWorkflowSourceCards(output.sourceCards, {
      requireNonEmpty: false,
      allowPhase9ArchiveOnly: options.allowPhase9ArchiveOnly !== undefined ? options.allowPhase9ArchiveOnly : true,
      requireOfficialUrl: false,
      requireCanonicalSourceId: false
    });
    result.checks.push({ check: "sourceCards", ...sourceCardResult });
    if (!sourceCardResult.valid) {
      result.valid = false;
      result.errors.push(...sourceCardResult.errors.map((e) => `sourceCards: ${e}`));
    }
    result.warnings.push(...sourceCardResult.warnings.map((w) => `sourceCards: ${w}`));
  }

  // Context-independent claim scan (excludes the two contextual claim ids
  // already handled with per-card context inside validateWorkflowSourceCards).
  const contextIndependentClaimIds = Object.keys(CLAIM_PHRASES).filter(
    (id) => id !== "official_url_verification_without_official_url_claim" && id !== "currentness_fully_verified_claim"
  );
  const claimCheck = detectProhibitedWorkflowClaims(output, { claimIds: contextIndependentClaimIds });
  result.prohibitedClaims = claimCheck;
  if (claimCheck.hasProhibitedClaims) {
    result.valid = false;
    result.errors.push("prohibited claims detected in output");
  }

  return result;
}

/**
 * Validates schema-level governance for a single Phase 9 workflow mode.
 * Dedicated-schema modes are checked against their own schema constant and
 * policy lists; requirements_request_letter (no dedicated schema yet) is
 * checked at the registry level only and always returns a
 * "dedicated_schema_pending" warning.
 *
 * @param {*} modeId
 * @returns {{valid: boolean, errors: string[], warnings: string[], mode: string|null}}
 */
export function validateWorkflowSchemaGovernance(modeId) {
  const errors = [];
  const warnings = [];
  const canonical = normalizeGovernanceModeId(modeId);

  if (!canonical) {
    return { valid: false, errors: [`unsupported mode: ${JSON.stringify(modeId)}`], warnings, mode: null };
  }

  if (canonical === "requirements_request_letter") {
    warnings.push("dedicated_schema_pending");
    const mode = getWorkflowMode("requirements_request_letter");
    if (!mode) {
      errors.push("requirements_request_letter mode missing from registry");
      return { valid: false, errors, warnings, mode: canonical };
    }
    if (mode.runtimeWiring !== false) errors.push("registry mode runtimeWiring must be false");
    if (mode.featureFlagDefault !== "off") errors.push("registry mode featureFlagDefault must be off");
    if (mode.humanReviewRequired !== true) errors.push("registry mode humanReviewRequired must be true");
    if (mode.sourceCardsRequired !== true) errors.push("registry mode sourceCardsRequired must be true");
    if (mode.missingFactsRequired !== true) errors.push("registry mode missingFactsRequired must be true");
    if (mode.assumptionsRequired !== true) errors.push("registry mode assumptionsRequired must be true");
    const prohibited = Array.isArray(mode.prohibitedBehaviors) ? mode.prohibitedBehaviors : [];
    for (const behavior of REGISTRY_ONLY_REQUIRED_PROHIBITED_BEHAVIORS) {
      if (!prohibited.includes(behavior)) errors.push(`registry mode must prohibit ${behavior}`);
    }
    return { valid: errors.length === 0, errors, warnings, mode: canonical };
  }

  const entry = DEDICATED_SCHEMA_TABLE[canonical];
  if (!entry) {
    errors.push(`no dedicated schema table entry for mode: ${canonical}`);
    return { valid: false, errors, warnings, mode: canonical };
  }

  const schema = entry.schema;
  if (schema.runtimeWiring !== false) errors.push("schema runtimeWiring must be false");
  if (schema.featureFlagDefault !== "off") errors.push("schema featureFlagDefault must be off");
  if (schema.humanReviewRequired !== true) errors.push("schema humanReviewRequired must be true");
  if (schema.sourceCardsRequired !== true) errors.push("schema sourceCardsRequired must be true");
  if (schema.missingFactsRequired !== true) errors.push("schema missingFactsRequired must be true");
  if (schema.assumptionsRequired !== true) errors.push("schema assumptionsRequired must be true");
  if (schema.finalFiling !== false) errors.push("schema finalFiling must be false");
  if (schema.automaticSubmission !== false) errors.push("schema automaticSubmission must be false");

  for (const policy of WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_POLICIES) {
    if (!entry.governanceRules.includes(policy)) errors.push(`schema governance rules must include: ${policy}`);
  }
  for (const behavior of UNIVERSAL_MINIMUM_PROHIBITED_BEHAVIORS) {
    if (!entry.prohibitedBehaviors.includes(behavior)) errors.push(`schema prohibited behaviors must include: ${behavior}`);
  }

  const sourceCardReq = entry.getSourceCardRequirement();
  if (sourceCardReq.required !== true) errors.push("source-card requirement must be required: true");
  if (sourceCardReq.currentPhase9Policy !== "gdrive_archive_acceptable") errors.push("currentPhase9Policy must be gdrive_archive_acceptable");
  if (sourceCardReq.officialUrlRequiredInPhase9 !== false) errors.push("officialUrlRequiredInPhase9 must be false");
  if (sourceCardReq.canonicalSourceIdRequiredInPhase9 !== false) errors.push("canonicalSourceIdRequiredInPhase9 must be false");

  const schemaSelfCheck = entry.validateSchema();
  if (!schemaSelfCheck.valid) {
    errors.push(...schemaSelfCheck.errors.map((e) => `schema self-check: ${e}`));
  }

  return { valid: errors.length === 0, errors, warnings, mode: canonical };
}

/**
 * Runs validateWorkflowSchemaGovernance() for every registered Phase 9
 * workflow mode.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], modeResults: object[]}}
 */
export function validateAllWorkflowSchemaGovernance() {
  const errors = [];
  const warnings = [];
  const modeResults = WORKFLOW_MODE_IDS.map((modeId) => validateWorkflowSchemaGovernance(modeId));

  for (const result of modeResults) {
    if (!result.valid) errors.push(...result.errors.map((e) => `${result.mode}: ${e}`));
    warnings.push(...result.warnings.map((w) => `${result.mode}: ${w}`));
  }

  return { valid: errors.length === 0, errors, warnings, modeResults };
}

/**
 * Validates the governance gate itself: presence of the required governance
 * catalogs, correct schema coverage classification, and passing schema
 * governance across all six registered modes.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], schemaCoverage: object, allSchemaGovernance: object}}
 */
export function validateWorkflowGovernanceGate() {
  const errors = [];
  const warnings = [];

  if (WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_FLAGS.length === 0) errors.push("required flags must be non-empty");
  if (WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_POLICIES.length === 0) errors.push("required policies must be non-empty");
  if (Object.keys(WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_CLAIMS).length === 0) errors.push("prohibited claims must be non-empty");
  if (WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_BEHAVIORS.length === 0) errors.push("prohibited behaviors must be non-empty");

  const coverage = getWorkflowGovernanceSchemaCoverage();
  if (coverage.dedicated.length !== 5) errors.push("schema coverage must record exactly five dedicated schema modes");
  if (coverage.registryOnlyPending.length !== 1 || coverage.registryOnlyPending[0] !== "requirements_request_letter") {
    errors.push("schema coverage must record requirements_request_letter as the sole registry-only pending mode");
  }

  const allSchemaGovernance = validateAllWorkflowSchemaGovernance();
  if (!allSchemaGovernance.valid) {
    errors.push(...allSchemaGovernance.errors.map((e) => `schema governance: ${e}`));
  }
  warnings.push(...allSchemaGovernance.warnings.map((w) => `schema governance: ${w}`));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaCoverage: coverage,
    allSchemaGovernance
  };
}
