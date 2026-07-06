// FILE: workflow/audit-defense-matrix-schema.js
// PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1
//
// Pure, dependency-free schema scaffold for the audit_defense_matrix workflow
// mode designed in PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 and
// registered in PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1. This module has NO
// I/O, NO network calls, NO Supabase/OpenAI/Google Drive/n8n/Firecrawl/Crawlee
// dependency, NO filesystem access, NO process.env dependency, NO Date.now/
// randomness, and NO side effects. It generates no live audit defense matrices
// and is not wired into ask-handler.js, pipeline.js, server.js, routes, or the
// frontend.

"use strict";

export const PHASE_09D_AUDIT_DEFENSE_MATRIX_SCHEMA_VERSION = "1.0.0";

export const AUDIT_DEFENSE_MATRIX_REQUIRED_INPUTS = Object.freeze([
  "issues",
  "auditorPosition",
  "facts",
  "taxPeriod",
  "availableDocuments",
  "intendedUse"
]);

export const AUDIT_DEFENSE_MATRIX_OPTIONAL_INPUTS = Object.freeze([
  "taxpayerType",
  "birDocumentType",
  "assessmentStage",
  "loaDate",
  "panDate",
  "fanDate",
  "fddaDate",
  "amountInvolved",
  "taxType",
  "transactionType",
  "knownAuthorities",
  "unavailableDocuments",
  "deadline",
  "intendedAudience",
  "riskTolerance",
  "userAssumptions",
  "desiredDepth"
]);

// Stable, ordered canonical output columns (per matrix row).
export const AUDIT_DEFENSE_MATRIX_REQUIRED_OUTPUT_COLUMNS = Object.freeze([
  "issue",
  "birAuditorPosition",
  "taxpayerPosition",
  "authority",
  "evidenceNeeded",
  "riskLevel",
  "recommendedAction",
  "assumptions",
  "missingFacts",
  "sourceCards",
  "humanReviewNotice"
]);

export const AUDIT_DEFENSE_MATRIX_REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  "mode",
  "schemaKey",
  "matrixRows",
  "summary",
  "overallRisks",
  "assumptions",
  "missingFacts",
  "documentsNeeded",
  "sourceCards",
  "humanReviewNotice",
  "metadata"
]);

export const AUDIT_DEFENSE_MATRIX_RISK_LEVELS = Object.freeze(["low", "moderate", "high", "critical", "unknown"]);

export const AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES = Object.freeze([
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
  "evidence_gap_disclosure_required",
  "risk_level_required",
  "taxpayer_position_must_depend_on_facts",
  "bir_auditor_position_must_be_labeled",
  "final_filing_false",
  "automatic_submission_false",
  "no_memory_activation",
  "no_persistent_client_matter_storage",
  "no_generated_work_product_persistence",
  "no_third_party_egress",
  "no_production_change"
]);

export const AUDIT_DEFENSE_MATRIX_PROHIBITED_BEHAVIORS = Object.freeze([
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
  "evidence_strength_overclaim",
  "guaranteed_audit_outcome_claim",
  "taxpayer_position_without_factual_basis",
  "unlabeled_bir_auditor_position"
]);

// Conceptual per-item field shapes — documentation-only descriptors, not
// enforced runtime types.
const AUTHORITY_ITEM_SHAPE = Object.freeze([
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

const EVIDENCE_ITEM_SHAPE = Object.freeze(["documentName", "purpose", "status", "priority", "responsibleParty", "notes"]);

const RECOMMENDED_ACTION_ITEM_SHAPE = Object.freeze([
  "action",
  "priority",
  "deadlineOrTiming",
  "responsibleParty",
  "dependency",
  "caveat"
]);

const MATRIX_ROW_SHAPE = Object.freeze([
  "issue",
  "birAuditorPosition",
  "taxpayerPosition",
  "authority",
  "evidenceNeeded",
  "riskLevel",
  "recommendedAction",
  "assumptions",
  "missingFacts",
  "sourceCards",
  "authorityStrength",
  "evidenceStrength",
  "defenseStrength",
  "limitationNotes"
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
  mode: "audit_defense_matrix",
  schemaKey: "auditDefenseMatrixOutput",
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
    "Map Philippine tax audit or assessment issues to BIR/auditor positions, taxpayer positions, supporting authorities, evidence requirements, risk levels, recommended actions, missing facts, assumptions, and source cards using existing TINA retrieval only.",
  requiredInputs: AUDIT_DEFENSE_MATRIX_REQUIRED_INPUTS,
  optionalInputs: AUDIT_DEFENSE_MATRIX_OPTIONAL_INPUTS,
  requiredOutputColumns: AUDIT_DEFENSE_MATRIX_REQUIRED_OUTPUT_COLUMNS,
  requiredTopLevelFields: AUDIT_DEFENSE_MATRIX_REQUIRED_TOP_LEVEL_FIELDS,
  riskLevels: AUDIT_DEFENSE_MATRIX_RISK_LEVELS,
  matrixRowShape: MATRIX_ROW_SHAPE,
  authorityItemShape: AUTHORITY_ITEM_SHAPE,
  evidenceItemShape: EVIDENCE_ITEM_SHAPE,
  recommendedActionItemShape: RECOMMENDED_ACTION_ITEM_SHAPE,
  sourceCardItemShape: {
    currentPhase9: SOURCE_CARD_ITEM_SHAPE_CURRENT_PHASE9,
    futurePhase10: SOURCE_CARD_ITEM_SHAPE_FUTURE_PHASE10
  },
  sourceCardPolicyNote:
    "In Phase 9, GDrive/archive source cards are acceptable; officialUrl/canonicalSourceId may be absent. If officialUrl is absent, output must not claim official URL verification. Future Phase 10 will upgrade source cards to the officialUrl/archiveUrl/canonicalSourceId model.",
  governanceRules: AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES,
  prohibitedBehaviors: AUDIT_DEFENSE_MATRIX_PROHIBITED_BEHAVIORS
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
 * Returns a defensive deep-cloned copy of the Audit Defense Matrix schema
 * descriptor.
 *
 * @returns {object}
 */
export function getAuditDefenseMatrixSchema() {
  return deepClone(RAW_SCHEMA);
}

// One-time deep clone of RAW_SCHEMA exposed for direct-import convenience.
// Mutating this export cannot affect RAW_SCHEMA or subsequent
// getAuditDefenseMatrixSchema() calls.
export const AUDIT_DEFENSE_MATRIX_SCHEMA = deepClone(RAW_SCHEMA);

/**
 * Returns a defensive copy of the required-inputs list.
 *
 * @returns {string[]}
 */
export function getAuditDefenseMatrixRequiredInputs() {
  return [...AUDIT_DEFENSE_MATRIX_REQUIRED_INPUTS];
}

/**
 * Returns a defensive copy of the required output-columns list, in stable
 * canonical order.
 *
 * @returns {string[]}
 */
export function getAuditDefenseMatrixRequiredOutputColumns() {
  return [...AUDIT_DEFENSE_MATRIX_REQUIRED_OUTPUT_COLUMNS];
}

/**
 * Returns a defensive copy of the governance-rules list.
 *
 * @returns {string[]}
 */
export function getAuditDefenseMatrixGovernanceRules() {
  return [...AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES];
}

/**
 * Returns a defensive copy of the risk-levels list.
 *
 * @returns {string[]}
 */
export function getAuditDefenseMatrixRiskLevels() {
  return [...AUDIT_DEFENSE_MATRIX_RISK_LEVELS];
}

/**
 * Returns the source-card requirement descriptor for the audit_defense_matrix
 * mode.
 *
 * @returns {object}
 */
export function getAuditDefenseMatrixSourceCardRequirement() {
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
 * Returns a fresh, defensive empty Audit Defense Matrix row scaffold. Every
 * call returns new arrays/objects; no shared mutable references are returned.
 *
 * @returns {object}
 */
export function createEmptyAuditDefenseMatrixRow() {
  return {
    issue: "",
    birAuditorPosition: "",
    taxpayerPosition: "",
    authority: [],
    evidenceNeeded: [],
    riskLevel: "unknown",
    recommendedAction: [],
    assumptions: [],
    missingFacts: [],
    sourceCards: [],
    humanReviewNotice: ""
  };
}

/**
 * Returns a fresh, defensive empty Audit Defense Matrix output scaffold. Every
 * call returns new arrays/objects; no shared mutable references are returned.
 *
 * @returns {object}
 */
export function createEmptyAuditDefenseMatrixOutput() {
  return {
    mode: "audit_defense_matrix",
    schemaKey: "auditDefenseMatrixOutput",
    matrixRows: [],
    summary: "",
    overallRisks: [],
    assumptions: [],
    missingFacts: [],
    documentsNeeded: [],
    sourceCards: [],
    humanReviewNotice: "",
    metadata: {
      generatedBy: "TINA",
      workflowMode: "audit_defense_matrix",
      schemaVersion: PHASE_09D_AUDIT_DEFENSE_MATRIX_SCHEMA_VERSION,
      retrievalPolicy: [...AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES].filter((rule) =>
        ["existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion", "no_unapproved_sources"].includes(rule)
      ),
      authorityPolicy: [...AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES].filter((rule) =>
        [
          "no_fabricated_citations",
          "controlling_authority_prioritized",
          "related_authority_disclosed_as_related",
          "currentness_unknown_disclosed",
          "authority_type_label_required"
        ].includes(rule)
      ),
      sourceCardPolicy: ["current_phase9_gdrive_archive_acceptable", "phase10_official_url_archive_url_canonical_source_id_future"],
      privacyPolicy: [...AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES].filter((rule) =>
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
 * Normalizes a candidate list of audit-defense issues into a clean array of
 * non-blank, trimmed strings. Never throws on malformed input.
 *
 * @param {*} issues
 * @returns {string[]}
 */
export function normalizeAuditDefenseMatrixIssues(issues) {
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

const RISK_LEVEL_ALIASES = Object.freeze({
  low: "low",
  medium: "moderate",
  moderate: "moderate",
  med: "moderate",
  high: "high",
  critical: "critical",
  urgent: "critical",
  unknown: "unknown"
});

/**
 * Normalizes a candidate risk-level value to one of
 * AUDIT_DEFENSE_MATRIX_RISK_LEVELS. Unsupported/blank/null input normalizes to
 * "unknown". Never throws.
 *
 * @param {*} riskLevel
 * @returns {string}
 */
export function normalizeAuditDefenseRiskLevel(riskLevel) {
  if (typeof riskLevel !== "string") return "unknown";
  const key = riskLevel.trim().toLowerCase();
  if (key.length === 0) return "unknown";
  return Object.prototype.hasOwnProperty.call(RISK_LEVEL_ALIASES, key) ? RISK_LEVEL_ALIASES[key] : "unknown";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validates the shape of a candidate Audit Defense Matrix row object without
 * throwing. Always returns a structured result object.
 *
 * @param {*} row
 * @returns {{valid: boolean, errors: string[], warnings: string[], schemaKey: string, mode: string}}
 */
export function validateAuditDefenseMatrixRowShape(row) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(row)) {
    errors.push("row must be a plain object");
    return { valid: false, errors, warnings, schemaKey: "auditDefenseMatrixOutput", mode: "audit_defense_matrix" };
  }

  for (const column of AUDIT_DEFENSE_MATRIX_REQUIRED_OUTPUT_COLUMNS) {
    if (!Object.prototype.hasOwnProperty.call(row, column)) {
      errors.push(`missing required output column: ${column}`);
    }
  }

  if (typeof row.issue !== "string") errors.push("issue must be a string");
  if (!Object.prototype.hasOwnProperty.call(row, "birAuditorPosition")) errors.push("birAuditorPosition must exist");
  if (!Object.prototype.hasOwnProperty.call(row, "taxpayerPosition")) errors.push("taxpayerPosition must exist");

  const arrayColumns = ["authority", "evidenceNeeded", "recommendedAction", "assumptions", "missingFacts", "sourceCards"];
  for (const column of arrayColumns) {
    if (Object.prototype.hasOwnProperty.call(row, column) && !Array.isArray(row[column])) {
      errors.push(`column ${column} must be an array`);
    }
  }

  if (!AUDIT_DEFENSE_MATRIX_RISK_LEVELS.includes(row.riskLevel)) {
    errors.push(`riskLevel must be one of ${AUDIT_DEFENSE_MATRIX_RISK_LEVELS.join("/")} (found: ${JSON.stringify(row.riskLevel)})`);
  }

  if (Object.prototype.hasOwnProperty.call(row, "humanReviewNotice") && typeof row.humanReviewNotice !== "string") {
    errors.push("humanReviewNotice must be a string");
  }

  if (errors.length === 0) {
    if (Array.isArray(row.authority) && row.authority.length === 0) warnings.push("authority is empty");
    if (Array.isArray(row.evidenceNeeded) && row.evidenceNeeded.length === 0) warnings.push("evidenceNeeded is empty");
    if (Array.isArray(row.sourceCards) && row.sourceCards.length === 0) warnings.push("sourceCards is empty");
    if (Array.isArray(row.missingFacts) && row.missingFacts.length === 0) warnings.push("missingFacts is empty");
    if (Array.isArray(row.assumptions) && row.assumptions.length === 0) warnings.push("assumptions is empty");
    if (row.riskLevel === "unknown") warnings.push("riskLevel is unknown");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaKey: "auditDefenseMatrixOutput",
    mode: "audit_defense_matrix"
  };
}

/**
 * Validates the shape of a candidate Audit Defense Matrix output object
 * without throwing. Always returns a structured result object. Validates
 * every matrixRows item via validateAuditDefenseMatrixRowShape().
 *
 * @param {*} output
 * @returns {{valid: boolean, errors: string[], warnings: string[], schemaKey: string, mode: string}}
 */
export function validateAuditDefenseMatrixOutputShape(output) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(output)) {
    errors.push("output must be a plain object");
    return { valid: false, errors, warnings, schemaKey: "auditDefenseMatrixOutput", mode: "audit_defense_matrix" };
  }

  if (output.mode !== "audit_defense_matrix") {
    errors.push(`mode must be "audit_defense_matrix" (found: ${JSON.stringify(output.mode)})`);
  }
  if (output.schemaKey !== "auditDefenseMatrixOutput") {
    errors.push(`schemaKey must be "auditDefenseMatrixOutput" (found: ${JSON.stringify(output.schemaKey)})`);
  }

  for (const field of AUDIT_DEFENSE_MATRIX_REQUIRED_TOP_LEVEL_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(output, field)) {
      errors.push(`missing required top-level field: ${field}`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(output, "matrixRows") && !Array.isArray(output.matrixRows)) {
    errors.push("matrixRows must be an array");
  }
  if (Object.prototype.hasOwnProperty.call(output, "summary") && typeof output.summary !== "string") {
    errors.push("summary must be a string");
  }

  const arrayFields = ["overallRisks", "assumptions", "missingFacts", "documentsNeeded", "sourceCards"];
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

  if (Array.isArray(output.matrixRows)) {
    output.matrixRows.forEach((row, index) => {
      const rowResult = validateAuditDefenseMatrixRowShape(row);
      if (!rowResult.valid) {
        for (const err of rowResult.errors) errors.push(`matrixRows[${index}]: ${err}`);
      }
      for (const warn of rowResult.warnings) warnings.push(`matrixRows[${index}]: ${warn}`);
    });
  }

  if (errors.length === 0) {
    if (Array.isArray(output.matrixRows) && output.matrixRows.length === 0) {
      warnings.push("matrixRows is empty — not a final professional output");
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
    if (Array.isArray(output.overallRisks) && output.overallRisks.length === 0) {
      warnings.push("overallRisks is empty — not a final professional output");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaKey: "auditDefenseMatrixOutput",
    mode: "audit_defense_matrix"
  };
}

/**
 * Validates the internal schema descriptor's shape and policy invariants
 * without throwing. Always returns a structured result object.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], requiredFieldCount: number, requiredInputCount: number, requiredOutputColumnCount: number, governanceRuleCount: number, prohibitedBehaviorCount: number, riskLevelCount: number}}
 */
export function validateAuditDefenseMatrixSchema() {
  const errors = [];
  const warnings = [];
  const schema = RAW_SCHEMA;

  if (schema.mode !== "audit_defense_matrix") errors.push("schema mode must be audit_defense_matrix");
  if (schema.schemaKey !== "auditDefenseMatrixOutput") errors.push("schema schemaKey must be auditDefenseMatrixOutput");
  if (schema.runtimeWiring !== false) errors.push("schema runtimeWiring must be false");
  if (schema.featureFlagDefault !== "off") errors.push("schema featureFlagDefault must be off");
  if (schema.humanReviewRequired !== true) errors.push("schema humanReviewRequired must be true");
  if (schema.sourceCardsRequired !== true) errors.push("schema sourceCardsRequired must be true");
  if (schema.missingFactsRequired !== true) errors.push("schema missingFactsRequired must be true");
  if (schema.assumptionsRequired !== true) errors.push("schema assumptionsRequired must be true");
  if (schema.finalFiling !== false) errors.push("schema finalFiling must be false");
  if (schema.automaticSubmission !== false) errors.push("schema automaticSubmission must be false");

  for (const input of ["issues", "auditorPosition", "facts", "taxPeriod", "availableDocuments", "intendedUse"]) {
    if (!AUDIT_DEFENSE_MATRIX_REQUIRED_INPUTS.includes(input)) {
      errors.push(`required inputs must include: ${input}`);
    }
  }

  const expectedColumns = [
    "issue",
    "birAuditorPosition",
    "taxpayerPosition",
    "authority",
    "evidenceNeeded",
    "riskLevel",
    "recommendedAction",
    "assumptions",
    "missingFacts",
    "sourceCards",
    "humanReviewNotice"
  ];
  if (AUDIT_DEFENSE_MATRIX_REQUIRED_OUTPUT_COLUMNS.join(",") !== expectedColumns.join(",")) {
    errors.push("required output columns do not match the stable canonical list/order");
  }

  for (const level of ["low", "moderate", "high", "critical", "unknown"]) {
    if (!AUDIT_DEFENSE_MATRIX_RISK_LEVELS.includes(level)) {
      errors.push(`risk levels must include: ${level}`);
    }
  }

  for (const rule of [
    "no_fabricated_citations",
    "existing_retrieval_only",
    "no_live_web_search",
    "no_new_authority_ingestion",
    "no_memory_activation",
    "evidence_gap_disclosure_required",
    "risk_level_required"
  ]) {
    if (!AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES.includes(rule)) {
      errors.push(`governance rules must include: ${rule}`);
    }
  }

  for (const behavior of [
    "fabricated_authority",
    "final_filing_claim",
    "live_web_search",
    "memory_write",
    "production_change",
    "guaranteed_audit_outcome_claim",
    "taxpayer_position_without_factual_basis"
  ]) {
    if (!AUDIT_DEFENSE_MATRIX_PROHIBITED_BEHAVIORS.includes(behavior)) {
      errors.push(`prohibited behaviors must include: ${behavior}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiredFieldCount: AUDIT_DEFENSE_MATRIX_REQUIRED_TOP_LEVEL_FIELDS.length,
    requiredInputCount: AUDIT_DEFENSE_MATRIX_REQUIRED_INPUTS.length,
    requiredOutputColumnCount: AUDIT_DEFENSE_MATRIX_REQUIRED_OUTPUT_COLUMNS.length,
    governanceRuleCount: AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES.length,
    prohibitedBehaviorCount: AUDIT_DEFENSE_MATRIX_PROHIBITED_BEHAVIORS.length,
    riskLevelCount: AUDIT_DEFENSE_MATRIX_RISK_LEVELS.length
  };
}
