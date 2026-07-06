// FILE: workflow/client-advisory-schema.js
// PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1
//
// Pure, dependency-free schema scaffold for the client_advisory workflow mode
// designed in PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 and registered
// in PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1. This module has NO I/O, NO
// network calls, NO Supabase/OpenAI/Google Drive/n8n/Firecrawl/Crawlee
// dependency, NO filesystem access, NO process.env dependency, NO Date.now/
// randomness, and NO side effects. It generates no live client advisories and
// is not wired into ask-handler.js, pipeline.js, server.js, routes, or the
// frontend.

"use strict";

export const PHASE_09F_CLIENT_ADVISORY_SCHEMA_VERSION = "1.0.0";

export const CLIENT_ADVISORY_REQUIRED_INPUTS = Object.freeze(["issue", "facts", "taxpayerType", "intendedAudience", "urgency"]);

export const CLIENT_ADVISORY_OPTIONAL_INPUTS = Object.freeze([
  "taxPeriod",
  "transactionType",
  "taxType",
  "businessContext",
  "desiredTone",
  "managementObjective",
  "knownAuthorities",
  "availableDocuments",
  "deadline",
  "amountInvolved",
  "userAssumptions",
  "requestedAction"
]);

// Stable, ordered canonical output sections.
export const CLIENT_ADVISORY_REQUIRED_OUTPUT_SECTIONS = Object.freeze([
  "plainLanguageAnswer",
  "businessImpact",
  "complianceAction",
  "deadlinesIfKnown",
  "risks",
  "documentsNeeded",
  "assumptions",
  "missingFacts",
  "sourceCards",
  "humanReviewNotice"
]);

export const CLIENT_ADVISORY_REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  "mode",
  "schemaKey",
  "plainLanguageAnswer",
  "businessImpact",
  "complianceAction",
  "deadlinesIfKnown",
  "risks",
  "documentsNeeded",
  "assumptions",
  "missingFacts",
  "sourceCards",
  "humanReviewNotice",
  "metadata"
]);

export const CLIENT_ADVISORY_AUDIENCE_TYPES = Object.freeze([
  "client",
  "management",
  "board",
  "owner",
  "accountant",
  "legal",
  "operations",
  "unknown"
]);

export const CLIENT_ADVISORY_GOVERNANCE_RULES = Object.freeze([
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
  "plain_language_required",
  "business_impact_must_be_tied_to_facts",
  "compliance_action_must_be_tied_to_authority_or_assumption",
  "deadlines_disclosed_only_if_known",
  "final_filing_false",
  "automatic_submission_false",
  "no_memory_activation",
  "no_persistent_client_matter_storage",
  "no_generated_work_product_persistence",
  "no_third_party_egress",
  "no_production_change"
]);

export const CLIENT_ADVISORY_PROHIBITED_BEHAVIORS = Object.freeze([
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
  "business_impact_without_factual_basis",
  "deadline_claim_without_date_basis",
  "false_timeliness_assurance"
]);

// Conceptual per-item field shapes — documentation-only descriptors, not
// enforced runtime types.
const BUSINESS_IMPACT_ITEM_SHAPE = Object.freeze(["impact", "severity", "affectedArea", "explanation", "caveat"]);

const COMPLIANCE_ACTION_ITEM_SHAPE = Object.freeze(["action", "responsibleParty", "deadlineOrTiming", "priority", "dependency", "caveat"]);

const RISK_ITEM_SHAPE = Object.freeze(["risk", "likelihood", "severity", "mitigation", "limitation"]);

const DOCUMENT_NEEDED_ITEM_SHAPE = Object.freeze(["documentName", "purpose", "priority", "responsibleParty", "notes"]);

const SOURCE_CARD_ITEM_SHAPE_CURRENT_PHASE9 = Object.freeze([
  "sourceCardId",
  "title",
  "authorityType",
  "issuer",
  "archiveUrl",
  "gdriveFileId",
  "excerpt",
  "pageOrSection",
  "relevance",
  "retrievalStatus"
]);

const SOURCE_CARD_ITEM_SHAPE_FUTURE_PHASE10 = Object.freeze([
  "officialUrl",
  "canonicalSourceId",
  "fileHash",
  "retrievedAt",
  "lastVerifiedAt",
  "currentnessStatus",
  "reviewStatus",
  "sourceLineage",
  "supersedes",
  "supersededBy"
]);

const RAW_SCHEMA = Object.freeze({
  mode: "client_advisory",
  schemaKey: "clientAdvisoryOutput",
  phase: "09",
  status: "scaffolded",
  runtimeWiring: false,
  featureFlagDefault: "off",
  humanReviewRequired: true,
  sourceCardsRequired: true,
  missingFactsRequired: true,
  assumptionsRequired: true,
  finalFiling: false,
  automaticSubmission: false,
  liveGeneration: false,
  persistentStorage: false,
  purpose:
    "Generate client-facing or management-facing Philippine tax/compliance explanations using professional plain-language framing, existing TINA retrieval only, and source-card-backed authority discipline.",
  requiredInputs: CLIENT_ADVISORY_REQUIRED_INPUTS,
  optionalInputs: CLIENT_ADVISORY_OPTIONAL_INPUTS,
  requiredOutputSections: CLIENT_ADVISORY_REQUIRED_OUTPUT_SECTIONS,
  requiredTopLevelFields: CLIENT_ADVISORY_REQUIRED_TOP_LEVEL_FIELDS,
  audienceTypes: CLIENT_ADVISORY_AUDIENCE_TYPES,
  businessImpactItemShape: BUSINESS_IMPACT_ITEM_SHAPE,
  complianceActionItemShape: COMPLIANCE_ACTION_ITEM_SHAPE,
  riskItemShape: RISK_ITEM_SHAPE,
  documentNeededItemShape: DOCUMENT_NEEDED_ITEM_SHAPE,
  sourceCardItemShape: {
    currentPhase9: SOURCE_CARD_ITEM_SHAPE_CURRENT_PHASE9,
    futurePhase10: SOURCE_CARD_ITEM_SHAPE_FUTURE_PHASE10
  },
  sourceCardPolicyNote:
    "In Phase 9, GDrive/archive source cards are acceptable; officialUrl/canonicalSourceId may be absent. If officialUrl is absent, output must not claim official URL verification. Future Phase 10 will upgrade source cards to the officialUrl/archiveUrl/canonicalSourceId model.",
  governanceRules: CLIENT_ADVISORY_GOVERNANCE_RULES,
  prohibitedBehaviors: CLIENT_ADVISORY_PROHIBITED_BEHAVIORS
});

/**
 * Recursively clones a plain object/array so the returned value shares no
 * references with the source. Pure, synchronous, no I/O.
 *
 * @param {*} value
 * @returns {*}
 */
function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = deepClone(value[key]);
    }
    return out;
  }
  return value;
}

/**
 * Returns a defensive deep-cloned copy of the Client Advisory schema
 * descriptor.
 *
 * @returns {object}
 */
export function getClientAdvisorySchema() {
  return deepClone(RAW_SCHEMA);
}

// One-time deep clone of RAW_SCHEMA exposed for direct-import convenience.
// Mutating this export cannot affect RAW_SCHEMA or subsequent
// getClientAdvisorySchema() calls.
export const CLIENT_ADVISORY_SCHEMA = deepClone(RAW_SCHEMA);

/**
 * Returns a defensive copy of the required-inputs list.
 *
 * @returns {string[]}
 */
export function getClientAdvisoryRequiredInputs() {
  return [...CLIENT_ADVISORY_REQUIRED_INPUTS];
}

/**
 * Returns a defensive copy of the required output-sections list, in stable
 * canonical order.
 *
 * @returns {string[]}
 */
export function getClientAdvisoryRequiredOutputSections() {
  return [...CLIENT_ADVISORY_REQUIRED_OUTPUT_SECTIONS];
}

/**
 * Returns a defensive copy of the governance-rules list.
 *
 * @returns {string[]}
 */
export function getClientAdvisoryGovernanceRules() {
  return [...CLIENT_ADVISORY_GOVERNANCE_RULES];
}

/**
 * Returns a defensive copy of the supported audience types.
 *
 * @returns {string[]}
 */
export function getClientAdvisoryAudienceTypes() {
  return [...CLIENT_ADVISORY_AUDIENCE_TYPES];
}

/**
 * Returns the source-card requirement descriptor for the client_advisory
 * mode.
 *
 * @returns {object}
 */
export function getClientAdvisorySourceCardRequirement() {
  return {
    required: true,
    currentPhase9Policy: "gdrive_archive_acceptable",
    futurePhase10Policy: "official_url_primary_archive_url_secondary_canonical_source_id_internal",
    officialUrlRequiredInPhase9: false,
    canonicalSourceIdRequiredInPhase9: false,
    unsupportedAuthorityDisclosureRequired: true,
    sourceCardsRequiredForProfessionalOutput: true
  };
}

/**
 * Returns a fresh, defensive empty Client Advisory output scaffold. Every
 * call returns new arrays/objects; no shared mutable references are
 * returned.
 *
 * @returns {object}
 */
export function createEmptyClientAdvisoryOutput() {
  return {
    mode: "client_advisory",
    schemaKey: "clientAdvisoryOutput",
    plainLanguageAnswer: "",
    businessImpact: [],
    complianceAction: [],
    deadlinesIfKnown: [],
    risks: [],
    documentsNeeded: [],
    assumptions: [],
    missingFacts: [],
    sourceCards: [],
    humanReviewNotice: "",
    metadata: {
      generatedBy: "TINA",
      workflowMode: "client_advisory",
      schemaVersion: PHASE_09F_CLIENT_ADVISORY_SCHEMA_VERSION,
      audienceType: "unknown",
      retrievalPolicy: [...CLIENT_ADVISORY_GOVERNANCE_RULES].filter((rule) =>
        ["existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion", "no_unapproved_sources"].includes(rule)
      ),
      authorityPolicy: [...CLIENT_ADVISORY_GOVERNANCE_RULES].filter((rule) =>
        [
          "no_fabricated_citations",
          "controlling_authority_prioritized",
          "related_authority_disclosed_as_related",
          "currentness_unknown_disclosed",
          "authority_type_label_required"
        ].includes(rule)
      ),
      sourceCardPolicy: ["current_phase9_gdrive_archive_acceptable", "phase10_official_url_archive_url_canonical_source_id_future"],
      privacyPolicy: [...CLIENT_ADVISORY_GOVERNANCE_RULES].filter((rule) =>
        [
          "no_memory_activation",
          "no_persistent_client_matter_storage",
          "no_generated_work_product_persistence",
          "no_third_party_egress",
          "no_production_change"
        ].includes(rule)
      ),
      finalFiling: false,
      automaticSubmission: false,
      runtimeWiring: false,
      featureFlagDefault: "off"
    }
  };
}

/**
 * Normalizes a candidate list of client advisory issues into a clean array
 * of non-blank, trimmed strings. Never throws on malformed input.
 *
 * @param {*} issues
 * @returns {string[]}
 */
export function normalizeClientAdvisoryIssues(issues) {
  if (Array.isArray(issues)) {
    return issues
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (typeof issues === "string") {
    const trimmed = issues.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return [];
}

const AUDIENCE_TYPE_ALIASES = Object.freeze({
  client: "client",
  management: "management",
  manager: "management",
  board: "board",
  bod: "board",
  directors: "board",
  owner: "owner",
  shareholder: "owner",
  stockholder: "owner",
  accountant: "accountant",
  accounting: "accountant",
  legal: "legal",
  lawyer: "legal",
  counsel: "legal",
  operations: "operations",
  ops: "operations"
});

/**
 * Normalizes a candidate audience-type value to one of
 * CLIENT_ADVISORY_AUDIENCE_TYPES. Unsupported/blank/null input normalizes to
 * "unknown". Never throws.
 *
 * @param {*} input
 * @returns {string}
 */
export function normalizeClientAdvisoryAudienceType(input) {
  if (typeof input !== "string") return "unknown";
  const key = input.trim().toLowerCase();
  if (key.length === 0) return "unknown";
  return Object.prototype.hasOwnProperty.call(AUDIENCE_TYPE_ALIASES, key) ? AUDIENCE_TYPE_ALIASES[key] : "unknown";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validates the shape of a candidate Client Advisory output object without
 * throwing. Always returns a structured result object.
 *
 * @param {*} output
 * @returns {{valid: boolean, errors: string[], warnings: string[], schemaKey: string, mode: string}}
 */
export function validateClientAdvisoryOutputShape(output) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(output)) {
    errors.push("output must be a plain object");
    return { valid: false, errors, warnings, schemaKey: "clientAdvisoryOutput", mode: "client_advisory" };
  }

  if (output.mode !== "client_advisory") {
    errors.push(`mode must be "client_advisory" (found: ${JSON.stringify(output.mode)})`);
  }
  if (output.schemaKey !== "clientAdvisoryOutput") {
    errors.push(`schemaKey must be "clientAdvisoryOutput" (found: ${JSON.stringify(output.schemaKey)})`);
  }

  for (const field of CLIENT_ADVISORY_REQUIRED_TOP_LEVEL_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(output, field)) {
      errors.push(`missing required top-level field: ${field}`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(output, "plainLanguageAnswer") && typeof output.plainLanguageAnswer !== "string") {
    errors.push("plainLanguageAnswer must be a string");
  }

  const arrayFields = ["businessImpact", "complianceAction", "deadlinesIfKnown", "risks", "documentsNeeded", "assumptions", "missingFacts", "sourceCards"];
  for (const field of arrayFields) {
    if (Object.prototype.hasOwnProperty.call(output, field) && !Array.isArray(output[field])) {
      errors.push(`field ${field} must be an array`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(output, "humanReviewNotice") && typeof output.humanReviewNotice !== "string") {
    errors.push("humanReviewNotice must be a string");
  }

  if (!isPlainObject(output.metadata)) {
    errors.push("metadata must be an object");
  } else {
    if (output.metadata.finalFiling !== false) errors.push("metadata.finalFiling must be false");
    if (output.metadata.automaticSubmission !== false) errors.push("metadata.automaticSubmission must be false");
    if (output.metadata.runtimeWiring !== false) errors.push("metadata.runtimeWiring must be false");
    if (output.metadata.featureFlagDefault !== "off") errors.push('metadata.featureFlagDefault must be "off"');
    if (!CLIENT_ADVISORY_AUDIENCE_TYPES.includes(output.metadata.audienceType)) {
      errors.push(`metadata.audienceType must be a supported audience type (found: ${JSON.stringify(output.metadata.audienceType)})`);
    }
  }

  if (errors.length === 0) {
    if (typeof output.plainLanguageAnswer === "string" && output.plainLanguageAnswer.length === 0) {
      warnings.push("plainLanguageAnswer is empty — not a final professional output");
    }
    if (Array.isArray(output.businessImpact) && output.businessImpact.length === 0) {
      warnings.push("businessImpact is empty — not a final professional output");
    }
    if (Array.isArray(output.complianceAction) && output.complianceAction.length === 0) {
      warnings.push("complianceAction is empty — not a final professional output");
    }
    if (Array.isArray(output.risks) && output.risks.length === 0) {
      warnings.push("risks is empty — not a final professional output");
    }
    if (Array.isArray(output.sourceCards) && output.sourceCards.length === 0) {
      warnings.push("sourceCards is empty — not a final professional output");
    }
    if (Array.isArray(output.missingFacts) && output.missingFacts.length === 0) {
      warnings.push("missingFacts is empty — confirm no facts are actually missing");
    }
    if (Array.isArray(output.assumptions) && output.assumptions.length === 0) {
      warnings.push("assumptions is empty — confirm no assumptions were made");
    }
    if (isPlainObject(output.metadata) && output.metadata.audienceType === "unknown") {
      warnings.push("metadata.audienceType is unknown");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaKey: "clientAdvisoryOutput",
    mode: "client_advisory"
  };
}

/**
 * Validates the internal schema descriptor's shape and policy invariants
 * without throwing. Always returns a structured result object.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], requiredFieldCount: number, requiredInputCount: number, requiredOutputSectionCount: number, governanceRuleCount: number, prohibitedBehaviorCount: number, audienceTypeCount: number}}
 */
export function validateClientAdvisorySchema() {
  const errors = [];
  const warnings = [];
  const schema = RAW_SCHEMA;

  if (schema.mode !== "client_advisory") errors.push("schema mode must be client_advisory");
  if (schema.schemaKey !== "clientAdvisoryOutput") errors.push("schema schemaKey must be clientAdvisoryOutput");
  if (schema.runtimeWiring !== false) errors.push("schema runtimeWiring must be false");
  if (schema.featureFlagDefault !== "off") errors.push("schema featureFlagDefault must be off");
  if (schema.humanReviewRequired !== true) errors.push("schema humanReviewRequired must be true");
  if (schema.sourceCardsRequired !== true) errors.push("schema sourceCardsRequired must be true");
  if (schema.missingFactsRequired !== true) errors.push("schema missingFactsRequired must be true");
  if (schema.assumptionsRequired !== true) errors.push("schema assumptionsRequired must be true");
  if (schema.finalFiling !== false) errors.push("schema finalFiling must be false");
  if (schema.automaticSubmission !== false) errors.push("schema automaticSubmission must be false");

  for (const input of ["issue", "facts", "taxpayerType", "intendedAudience", "urgency"]) {
    if (!CLIENT_ADVISORY_REQUIRED_INPUTS.includes(input)) {
      errors.push(`required inputs must include: ${input}`);
    }
  }

  const expectedSections = [
    "plainLanguageAnswer",
    "businessImpact",
    "complianceAction",
    "deadlinesIfKnown",
    "risks",
    "documentsNeeded",
    "assumptions",
    "missingFacts",
    "sourceCards",
    "humanReviewNotice"
  ];
  if (CLIENT_ADVISORY_REQUIRED_OUTPUT_SECTIONS.join(",") !== expectedSections.join(",")) {
    errors.push("required output sections do not match the stable canonical list/order");
  }

  for (const audience of ["client", "management", "board", "owner", "accountant", "legal", "operations", "unknown"]) {
    if (!CLIENT_ADVISORY_AUDIENCE_TYPES.includes(audience)) {
      errors.push(`audience types must include: ${audience}`);
    }
  }

  for (const rule of [
    "no_fabricated_citations",
    "existing_retrieval_only",
    "no_live_web_search",
    "no_new_authority_ingestion",
    "no_memory_activation",
    "plain_language_required",
    "business_impact_must_be_tied_to_facts",
    "deadlines_disclosed_only_if_known"
  ]) {
    if (!CLIENT_ADVISORY_GOVERNANCE_RULES.includes(rule)) {
      errors.push(`governance rules must include: ${rule}`);
    }
  }

  for (const behavior of [
    "fabricated_authority",
    "final_filing_claim",
    "live_web_search",
    "memory_write",
    "production_change",
    "guaranteed_tax_outcome_claim",
    "business_impact_without_factual_basis",
    "false_timeliness_assurance"
  ]) {
    if (!CLIENT_ADVISORY_PROHIBITED_BEHAVIORS.includes(behavior)) {
      errors.push(`prohibited behaviors must include: ${behavior}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiredFieldCount: CLIENT_ADVISORY_REQUIRED_TOP_LEVEL_FIELDS.length,
    requiredInputCount: CLIENT_ADVISORY_REQUIRED_INPUTS.length,
    requiredOutputSectionCount: CLIENT_ADVISORY_REQUIRED_OUTPUT_SECTIONS.length,
    governanceRuleCount: CLIENT_ADVISORY_GOVERNANCE_RULES.length,
    prohibitedBehaviorCount: CLIENT_ADVISORY_PROHIBITED_BEHAVIORS.length,
    audienceTypeCount: CLIENT_ADVISORY_AUDIENCE_TYPES.length
  };
}
