// FILE: workflow/tax-memo-schema.js
// PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1
//
// Pure, dependency-free schema scaffold for the tax_memo workflow mode designed
// in PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 and registered in
// PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1. This module has NO I/O, NO
// network calls, NO Supabase/OpenAI/Google Drive/n8n/Firecrawl/Crawlee
// dependency, NO filesystem access, NO process.env dependency, NO Date.now/
// randomness, and NO side effects. It generates no live tax memos and is not
// wired into ask-handler.js, pipeline.js, server.js, routes, or the frontend.

"use strict";

export const PHASE_09C_TAX_MEMO_SCHEMA_VERSION = "1.0.0";

export const TAX_MEMO_REQUIRED_INPUTS = Object.freeze([
  "facts",
  "issue",
  "taxpayerType",
  "taxPeriod",
  "intendedAudience"
]);

export const TAX_MEMO_OPTIONAL_INPUTS = Object.freeze([
  "jurisdiction",
  "transactionType",
  "taxType",
  "assessmentStage",
  "amountsInvolved",
  "availableDocuments",
  "desiredDepth",
  "urgency",
  "clientName",
  "matterReference",
  "outputTone",
  "knownAuthorities",
  "userAssumptions"
]);

// Stable, ordered canonical output sections.
export const TAX_MEMO_REQUIRED_OUTPUT_SECTIONS = Object.freeze([
  "factsProvided",
  "issues",
  "applicableAuthorities",
  "analysis",
  "conclusion",
  "risksLimitations",
  "assumptions",
  "missingFacts",
  "documentsNeeded",
  "sourceCards",
  "humanReviewNotice"
]);

export const TAX_MEMO_REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  "mode",
  "schemaKey",
  "factsProvided",
  "issues",
  "applicableAuthorities",
  "analysis",
  "conclusion",
  "risksLimitations",
  "assumptions",
  "missingFacts",
  "documentsNeeded",
  "sourceCards",
  "humanReviewNotice",
  "metadata"
]);

export const TAX_MEMO_GOVERNANCE_RULES = Object.freeze([
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
  "final_filing_false",
  "automatic_submission_false",
  "no_memory_activation",
  "no_persistent_client_matter_storage",
  "no_generated_work_product_persistence",
  "no_third_party_egress",
  "no_production_change"
]);

export const TAX_MEMO_PROHIBITED_BEHAVIORS = Object.freeze([
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

// Conceptual per-item field shapes — documentation-only descriptors, not
// enforced runtime types. Consumed by getTaxMemoSchema()/getWorkflowModeOutputSchema
// style callers to understand the intended item structure.
const APPLICABLE_AUTHORITY_ITEM_SHAPE = Object.freeze([
  "authorityType",
  "authorityNumber",
  "title",
  "issuer",
  "relevance",
  "controllingStatus",
  "currentnessStatus",
  "sourceCardId",
  "citationLabel",
  "limitations"
]);

const ANALYSIS_ITEM_SHAPE = Object.freeze([
  "issue",
  "discussion",
  "authorityRefs",
  "factualDependencies",
  "riskLevel",
  "missingFactsImpact"
]);

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
  mode: "tax_memo",
  schemaKey: "taxMemoOutput",
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
    "Produce structured professional Philippine tax memoranda grounded on existing TINA retrieval and source cards.",
  requiredInputs: TAX_MEMO_REQUIRED_INPUTS,
  optionalInputs: TAX_MEMO_OPTIONAL_INPUTS,
  requiredOutputSections: TAX_MEMO_REQUIRED_OUTPUT_SECTIONS,
  requiredTopLevelFields: TAX_MEMO_REQUIRED_TOP_LEVEL_FIELDS,
  applicableAuthorityItemShape: APPLICABLE_AUTHORITY_ITEM_SHAPE,
  analysisItemShape: ANALYSIS_ITEM_SHAPE,
  sourceCardItemShape: {
    currentPhase9: SOURCE_CARD_ITEM_SHAPE_CURRENT_PHASE9,
    futurePhase10: SOURCE_CARD_ITEM_SHAPE_FUTURE_PHASE10
  },
  sourceCardPolicyNote:
    "In Phase 9, GDrive/archive source cards are acceptable; officialUrl/canonicalSourceId may be absent. If officialUrl is absent, output must not claim official URL verification. Future Phase 10 will upgrade source cards to the officialUrl/archiveUrl/canonicalSourceId model.",
  governanceRules: TAX_MEMO_GOVERNANCE_RULES,
  prohibitedBehaviors: TAX_MEMO_PROHIBITED_BEHAVIORS
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
 * Returns a defensive deep-cloned copy of the Tax Memo schema descriptor.
 *
 * @returns {object}
 */
export function getTaxMemoSchema() {
  return deepClone(RAW_SCHEMA);
}

// Backward-referenceable frozen export mirroring getTaxMemoSchema() at module
// load time. Consumers wanting a live defensive copy should prefer
// getTaxMemoSchema(); this export exists for direct-import convenience and is
// itself a one-time deep clone of RAW_SCHEMA, so mutating it cannot affect
// RAW_SCHEMA or subsequent getTaxMemoSchema() calls.
export const TAX_MEMO_SCHEMA = deepClone(RAW_SCHEMA);

/**
 * Returns a defensive copy of the required-inputs list.
 *
 * @returns {string[]}
 */
export function getTaxMemoRequiredInputs() {
  return [...TAX_MEMO_REQUIRED_INPUTS];
}

/**
 * Returns a defensive copy of the required output-sections list, in stable
 * canonical order.
 *
 * @returns {string[]}
 */
export function getTaxMemoRequiredOutputSections() {
  return [...TAX_MEMO_REQUIRED_OUTPUT_SECTIONS];
}

/**
 * Returns a defensive copy of the governance-rules list.
 *
 * @returns {string[]}
 */
export function getTaxMemoGovernanceRules() {
  return [...TAX_MEMO_GOVERNANCE_RULES];
}

/**
 * Returns the source-card requirement descriptor for the tax_memo mode.
 *
 * @returns {object}
 */
export function getTaxMemoSourceCardRequirement() {
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
 * Returns a fresh, defensive empty Tax Memo output scaffold. Every call
 * returns new arrays/objects; no shared mutable references are returned.
 *
 * @returns {object}
 */
export function createEmptyTaxMemoOutput() {
  return {
    mode: "tax_memo",
    schemaKey: "taxMemoOutput",
    factsProvided: [],
    issues: [],
    applicableAuthorities: [],
    analysis: [],
    conclusion: "",
    risksLimitations: [],
    assumptions: [],
    missingFacts: [],
    documentsNeeded: [],
    sourceCards: [],
    humanReviewNotice: "",
    metadata: {
      generatedBy: "TINA",
      workflowMode: "tax_memo",
      schemaVersion: PHASE_09C_TAX_MEMO_SCHEMA_VERSION,
      retrievalPolicy: [...TAX_MEMO_GOVERNANCE_RULES].filter((rule) =>
        ["existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion", "no_unapproved_sources"].includes(rule)
      ),
      authorityPolicy: [...TAX_MEMO_GOVERNANCE_RULES].filter((rule) =>
        [
          "no_fabricated_citations",
          "controlling_authority_prioritized",
          "related_authority_disclosed_as_related",
          "currentness_unknown_disclosed",
          "authority_type_label_required"
        ].includes(rule)
      ),
      sourceCardPolicy: ["current_phase9_gdrive_archive_acceptable", "phase10_official_url_archive_url_canonical_source_id_future"],
      privacyPolicy: [...TAX_MEMO_GOVERNANCE_RULES].filter((rule) =>
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
 * Normalizes a candidate list of tax memo issues into a clean array of
 * non-blank, trimmed strings. Never throws on malformed input.
 *
 * @param {*} issues
 * @returns {string[]}
 */
export function normalizeTaxMemoIssueList(issues) {
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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validates the shape of a candidate Tax Memo output object without
 * throwing. Always returns a structured result object.
 *
 * @param {*} output
 * @returns {{valid: boolean, errors: string[], warnings: string[], schemaKey: string, mode: string}}
 */
export function validateTaxMemoOutputShape(output) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(output)) {
    errors.push("output must be a plain object");
    return { valid: false, errors, warnings, schemaKey: "taxMemoOutput", mode: "tax_memo" };
  }

  if (output.mode !== "tax_memo") {
    errors.push(`mode must be "tax_memo" (found: ${JSON.stringify(output.mode)})`);
  }
  if (output.schemaKey !== "taxMemoOutput") {
    errors.push(`schemaKey must be "taxMemoOutput" (found: ${JSON.stringify(output.schemaKey)})`);
  }

  for (const field of TAX_MEMO_REQUIRED_TOP_LEVEL_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(output, field)) {
      errors.push(`missing required top-level field: ${field}`);
    }
  }

  const arrayFields = [
    "factsProvided",
    "issues",
    "applicableAuthorities",
    "analysis",
    "risksLimitations",
    "assumptions",
    "missingFacts",
    "documentsNeeded",
    "sourceCards"
  ];
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
  }

  if (errors.length === 0) {
    if (Array.isArray(output.sourceCards) && output.sourceCards.length === 0) {
      warnings.push("sourceCards is empty — not a final professional output");
    }
    if (Array.isArray(output.missingFacts) && output.missingFacts.length === 0) {
      warnings.push("missingFacts is empty — confirm no facts are actually missing");
    }
    if (Array.isArray(output.assumptions) && output.assumptions.length === 0) {
      warnings.push("assumptions is empty — confirm no assumptions were made");
    }
    if (Array.isArray(output.applicableAuthorities) && output.applicableAuthorities.length === 0) {
      warnings.push("applicableAuthorities is empty — not a final professional output");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaKey: "taxMemoOutput",
    mode: "tax_memo"
  };
}

/**
 * Validates the internal schema descriptor's shape and policy invariants
 * without throwing. Always returns a structured result object.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], requiredFieldCount: number, requiredInputCount: number, requiredOutputSectionCount: number, governanceRuleCount: number, prohibitedBehaviorCount: number}}
 */
export function validateTaxMemoSchema() {
  const errors = [];
  const warnings = [];
  const schema = RAW_SCHEMA;

  if (schema.mode !== "tax_memo") errors.push("schema mode must be tax_memo");
  if (schema.schemaKey !== "taxMemoOutput") errors.push("schema schemaKey must be taxMemoOutput");
  if (schema.runtimeWiring !== false) errors.push("schema runtimeWiring must be false");
  if (schema.featureFlagDefault !== "off") errors.push("schema featureFlagDefault must be off");
  if (schema.humanReviewRequired !== true) errors.push("schema humanReviewRequired must be true");
  if (schema.sourceCardsRequired !== true) errors.push("schema sourceCardsRequired must be true");
  if (schema.missingFactsRequired !== true) errors.push("schema missingFactsRequired must be true");
  if (schema.assumptionsRequired !== true) errors.push("schema assumptionsRequired must be true");
  if (schema.finalFiling !== false) errors.push("schema finalFiling must be false");
  if (schema.automaticSubmission !== false) errors.push("schema automaticSubmission must be false");

  for (const input of ["facts", "issue", "taxpayerType", "taxPeriod", "intendedAudience"]) {
    if (!TAX_MEMO_REQUIRED_INPUTS.includes(input)) {
      errors.push(`required inputs must include: ${input}`);
    }
  }

  const expectedSections = [
    "factsProvided",
    "issues",
    "applicableAuthorities",
    "analysis",
    "conclusion",
    "risksLimitations",
    "assumptions",
    "missingFacts",
    "documentsNeeded",
    "sourceCards",
    "humanReviewNotice"
  ];
  if (TAX_MEMO_REQUIRED_OUTPUT_SECTIONS.join(",") !== expectedSections.join(",")) {
    errors.push("required output sections do not match the stable canonical list/order");
  }

  for (const rule of [
    "no_fabricated_citations",
    "existing_retrieval_only",
    "no_live_web_search",
    "no_new_authority_ingestion",
    "no_memory_activation"
  ]) {
    if (!TAX_MEMO_GOVERNANCE_RULES.includes(rule)) {
      errors.push(`governance rules must include: ${rule}`);
    }
  }

  for (const behavior of ["fabricated_authority", "final_filing_claim", "live_web_search", "memory_write", "production_change"]) {
    if (!TAX_MEMO_PROHIBITED_BEHAVIORS.includes(behavior)) {
      errors.push(`prohibited behaviors must include: ${behavior}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiredFieldCount: TAX_MEMO_REQUIRED_TOP_LEVEL_FIELDS.length,
    requiredInputCount: TAX_MEMO_REQUIRED_INPUTS.length,
    requiredOutputSectionCount: TAX_MEMO_REQUIRED_OUTPUT_SECTIONS.length,
    governanceRuleCount: TAX_MEMO_GOVERNANCE_RULES.length,
    prohibitedBehaviorCount: TAX_MEMO_PROHIBITED_BEHAVIORS.length
  };
}
