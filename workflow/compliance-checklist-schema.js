// FILE: workflow/compliance-checklist-schema.js
// PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1
//
// Pure, dependency-free schema scaffold for the compliance_checklist workflow
// mode designed in PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 and
// registered in PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1. This module has
// NO I/O, NO network calls, NO Supabase/OpenAI/Google Drive/n8n/Firecrawl/
// Crawlee dependency, NO filesystem access, NO process.env dependency, NO
// Date.now/randomness, and NO side effects. It generates no live compliance
// checklists and is not wired into ask-handler.js, pipeline.js, server.js,
// routes, or the frontend.

"use strict";

export const PHASE_09F_COMPLIANCE_CHECKLIST_SCHEMA_VERSION = "1.0.0";

export const COMPLIANCE_CHECKLIST_REQUIRED_INPUTS = Object.freeze(["complianceTopic", "taxpayerType", "taxPeriodOrDate", "facts", "intendedUse"]);

export const COMPLIANCE_CHECKLIST_OPTIONAL_INPUTS = Object.freeze([
  "jurisdiction",
  "rdoOrOffice",
  "registrationType",
  "taxType",
  "transactionType",
  "deadline",
  "availableDocuments",
  "responsibleParties",
  "currentStatus",
  "urgency",
  "userAssumptions",
  "desiredDepth"
]);

// Stable, ordered canonical output columns (per checklist task).
export const COMPLIANCE_CHECKLIST_REQUIRED_OUTPUT_COLUMNS = Object.freeze([
  "task",
  "responsibleParty",
  "requiredDocument",
  "deadlineTiming",
  "authoritySource",
  "status",
  "priority",
  "notes",
  "assumptions",
  "missingFacts",
  "sourceCards",
  "humanReviewNotice"
]);

export const COMPLIANCE_CHECKLIST_REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  "mode",
  "schemaKey",
  "checklistItems",
  "summary",
  "assumptions",
  "missingFacts",
  "documentsNeeded",
  "sourceCards",
  "humanReviewNotice",
  "metadata"
]);

export const COMPLIANCE_CHECKLIST_STATUS_VALUES = Object.freeze([
  "not_started",
  "in_progress",
  "pending_client",
  "pending_bir",
  "pending_sec",
  "pending_lgu",
  "completed",
  "blocked",
  "not_applicable",
  "unknown"
]);

export const COMPLIANCE_CHECKLIST_PRIORITY_VALUES = Object.freeze(["low", "normal", "high", "urgent", "unknown"]);

export const COMPLIANCE_CHECKLIST_GOVERNANCE_RULES = Object.freeze([
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
  "deadline_disclosure_required_if_known",
  "task_must_be_tied_to_authority_or_assumption",
  "status_must_be_labeled",
  "priority_must_be_labeled",
  "final_filing_false",
  "automatic_submission_false",
  "no_memory_activation",
  "no_persistent_client_matter_storage",
  "no_generated_work_product_persistence",
  "no_third_party_egress",
  "no_production_change"
]);

export const COMPLIANCE_CHECKLIST_PROHIBITED_BEHAVIORS = Object.freeze([
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
  "guaranteed_compliance_outcome_claim",
  "task_without_authority_or_assumption",
  "deadline_claim_without_date_basis",
  "false_timeliness_assurance",
  "automatic_filing_claim"
]);

const CHECKLIST_TASK_SHAPE = Object.freeze([
  "task",
  "responsibleParty",
  "requiredDocument",
  "deadlineTiming",
  "authoritySource",
  "status",
  "priority",
  "notes",
  "assumptions",
  "missingFacts",
  "sourceCards",
  "dependency",
  "caveat"
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
  mode: "compliance_checklist",
  schemaKey: "complianceChecklistOutput",
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
    "Generate structured Philippine tax, registration, closure, VAT, EWT, withholding, BIR, SEC, and related compliance task checklists using existing TINA retrieval only.",
  requiredInputs: COMPLIANCE_CHECKLIST_REQUIRED_INPUTS,
  optionalInputs: COMPLIANCE_CHECKLIST_OPTIONAL_INPUTS,
  requiredOutputColumns: COMPLIANCE_CHECKLIST_REQUIRED_OUTPUT_COLUMNS,
  requiredTopLevelFields: COMPLIANCE_CHECKLIST_REQUIRED_TOP_LEVEL_FIELDS,
  statusValues: COMPLIANCE_CHECKLIST_STATUS_VALUES,
  priorityValues: COMPLIANCE_CHECKLIST_PRIORITY_VALUES,
  checklistTaskShape: CHECKLIST_TASK_SHAPE,
  sourceCardItemShape: {
    currentPhase9: SOURCE_CARD_ITEM_SHAPE_CURRENT_PHASE9,
    futurePhase10: SOURCE_CARD_ITEM_SHAPE_FUTURE_PHASE10
  },
  sourceCardPolicyNote:
    "In Phase 9, GDrive/archive source cards are acceptable; officialUrl/canonicalSourceId may be absent. If officialUrl is absent, output must not claim official URL verification. Future Phase 10 will upgrade source cards to the officialUrl/archiveUrl/canonicalSourceId model.",
  governanceRules: COMPLIANCE_CHECKLIST_GOVERNANCE_RULES,
  prohibitedBehaviors: COMPLIANCE_CHECKLIST_PROHIBITED_BEHAVIORS
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
 * Returns a defensive deep-cloned copy of the Compliance Checklist schema
 * descriptor.
 *
 * @returns {object}
 */
export function getComplianceChecklistSchema() {
  return deepClone(RAW_SCHEMA);
}

// One-time deep clone of RAW_SCHEMA exposed for direct-import convenience.
// Mutating this export cannot affect RAW_SCHEMA or subsequent
// getComplianceChecklistSchema() calls.
export const COMPLIANCE_CHECKLIST_SCHEMA = deepClone(RAW_SCHEMA);

/**
 * Returns a defensive copy of the required-inputs list.
 *
 * @returns {string[]}
 */
export function getComplianceChecklistRequiredInputs() {
  return [...COMPLIANCE_CHECKLIST_REQUIRED_INPUTS];
}

/**
 * Returns a defensive copy of the required output-columns list, in stable
 * canonical order.
 *
 * @returns {string[]}
 */
export function getComplianceChecklistRequiredOutputColumns() {
  return [...COMPLIANCE_CHECKLIST_REQUIRED_OUTPUT_COLUMNS];
}

/**
 * Returns a defensive copy of the governance-rules list.
 *
 * @returns {string[]}
 */
export function getComplianceChecklistGovernanceRules() {
  return [...COMPLIANCE_CHECKLIST_GOVERNANCE_RULES];
}

/**
 * Returns a defensive copy of the supported status values.
 *
 * @returns {string[]}
 */
export function getComplianceChecklistStatusValues() {
  return [...COMPLIANCE_CHECKLIST_STATUS_VALUES];
}

/**
 * Returns a defensive copy of the supported priority values.
 *
 * @returns {string[]}
 */
export function getComplianceChecklistPriorityValues() {
  return [...COMPLIANCE_CHECKLIST_PRIORITY_VALUES];
}

/**
 * Returns the source-card requirement descriptor for the compliance_checklist
 * mode.
 *
 * @returns {object}
 */
export function getComplianceChecklistSourceCardRequirement() {
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
 * Returns a fresh, defensive empty Compliance Checklist task scaffold. Every
 * call returns new arrays/objects; no shared mutable references are
 * returned.
 *
 * @returns {object}
 */
export function createEmptyComplianceChecklistTask() {
  return {
    task: "",
    responsibleParty: "",
    requiredDocument: "",
    deadlineTiming: "",
    authoritySource: [],
    status: "unknown",
    priority: "unknown",
    notes: "",
    assumptions: [],
    missingFacts: [],
    sourceCards: [],
    humanReviewNotice: ""
  };
}

/**
 * Returns a fresh, defensive empty Compliance Checklist output scaffold.
 * Every call returns new arrays/objects; no shared mutable references are
 * returned.
 *
 * @returns {object}
 */
export function createEmptyComplianceChecklistOutput() {
  return {
    mode: "compliance_checklist",
    schemaKey: "complianceChecklistOutput",
    checklistItems: [],
    summary: "",
    assumptions: [],
    missingFacts: [],
    documentsNeeded: [],
    sourceCards: [],
    humanReviewNotice: "",
    metadata: {
      generatedBy: "TINA",
      workflowMode: "compliance_checklist",
      schemaVersion: PHASE_09F_COMPLIANCE_CHECKLIST_SCHEMA_VERSION,
      retrievalPolicy: [...COMPLIANCE_CHECKLIST_GOVERNANCE_RULES].filter((rule) =>
        ["existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion", "no_unapproved_sources"].includes(rule)
      ),
      authorityPolicy: [...COMPLIANCE_CHECKLIST_GOVERNANCE_RULES].filter((rule) =>
        [
          "no_fabricated_citations",
          "controlling_authority_prioritized",
          "related_authority_disclosed_as_related",
          "currentness_unknown_disclosed",
          "authority_type_label_required"
        ].includes(rule)
      ),
      sourceCardPolicy: ["current_phase9_gdrive_archive_acceptable", "phase10_official_url_archive_url_canonical_source_id_future"],
      privacyPolicy: [...COMPLIANCE_CHECKLIST_GOVERNANCE_RULES].filter((rule) =>
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
 * Normalizes a candidate list of compliance-checklist topics into a clean
 * array of non-blank, trimmed strings. Never throws on malformed input.
 *
 * @param {*} topics
 * @returns {string[]}
 */
export function normalizeComplianceChecklistTopics(topics) {
  if (Array.isArray(topics)) {
    return topics
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (typeof topics === "string") {
    const trimmed = topics.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return [];
}

const STATUS_ALIASES = Object.freeze({
  "not started": "not_started",
  open: "not_started",
  "in progress": "in_progress",
  ongoing: "in_progress",
  "pending client": "pending_client",
  "pending bir": "pending_bir",
  "pending sec": "pending_sec",
  "pending lgu": "pending_lgu",
  done: "completed",
  completed: "completed",
  blocked: "blocked",
  "n/a": "not_applicable",
  "not applicable": "not_applicable"
});

/**
 * Normalizes a candidate status value to one of
 * COMPLIANCE_CHECKLIST_STATUS_VALUES. Unsupported/blank/null input
 * normalizes to "unknown". Never throws.
 *
 * @param {*} status
 * @returns {string}
 */
export function normalizeComplianceChecklistStatus(status) {
  if (typeof status !== "string") return "unknown";
  const key = status.trim().toLowerCase();
  if (key.length === 0) return "unknown";
  return Object.prototype.hasOwnProperty.call(STATUS_ALIASES, key) ? STATUS_ALIASES[key] : "unknown";
}

const PRIORITY_ALIASES = Object.freeze({
  low: "low",
  normal: "normal",
  medium: "normal",
  med: "normal",
  high: "high",
  urgent: "urgent",
  critical: "urgent"
});

/**
 * Normalizes a candidate priority value to one of
 * COMPLIANCE_CHECKLIST_PRIORITY_VALUES. Unsupported/blank/null input
 * normalizes to "unknown". Never throws.
 *
 * @param {*} priority
 * @returns {string}
 */
export function normalizeComplianceChecklistPriority(priority) {
  if (typeof priority !== "string") return "unknown";
  const key = priority.trim().toLowerCase();
  if (key.length === 0) return "unknown";
  return Object.prototype.hasOwnProperty.call(PRIORITY_ALIASES, key) ? PRIORITY_ALIASES[key] : "unknown";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validates the shape of a candidate Compliance Checklist task object
 * without throwing. Always returns a structured result object.
 *
 * @param {*} task
 * @returns {{valid: boolean, errors: string[], warnings: string[], schemaKey: string, mode: string}}
 */
export function validateComplianceChecklistTaskShape(task) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(task)) {
    errors.push("task must be a plain object");
    return { valid: false, errors, warnings, schemaKey: "complianceChecklistOutput", mode: "compliance_checklist" };
  }

  for (const column of COMPLIANCE_CHECKLIST_REQUIRED_OUTPUT_COLUMNS) {
    if (!Object.prototype.hasOwnProperty.call(task, column)) {
      errors.push(`missing required output column: ${column}`);
    }
  }

  if (typeof task.task !== "string") errors.push("task must be a string");
  if (!Object.prototype.hasOwnProperty.call(task, "responsibleParty")) errors.push("responsibleParty must exist");
  if (!Object.prototype.hasOwnProperty.call(task, "requiredDocument")) errors.push("requiredDocument must exist");
  if (!Object.prototype.hasOwnProperty.call(task, "deadlineTiming")) errors.push("deadlineTiming must exist");
  if (!Object.prototype.hasOwnProperty.call(task, "authoritySource")) errors.push("authoritySource must exist");
  if (!Object.prototype.hasOwnProperty.call(task, "notes")) errors.push("notes must exist");

  if (!COMPLIANCE_CHECKLIST_STATUS_VALUES.includes(task.status)) {
    errors.push(`status must be one of ${COMPLIANCE_CHECKLIST_STATUS_VALUES.join("/")} (found: ${JSON.stringify(task.status)})`);
  }
  if (!COMPLIANCE_CHECKLIST_PRIORITY_VALUES.includes(task.priority)) {
    errors.push(`priority must be one of ${COMPLIANCE_CHECKLIST_PRIORITY_VALUES.join("/")} (found: ${JSON.stringify(task.priority)})`);
  }

  const arrayColumns = ["assumptions", "missingFacts", "sourceCards"];
  for (const column of arrayColumns) {
    if (Object.prototype.hasOwnProperty.call(task, column) && !Array.isArray(task[column])) {
      errors.push(`column ${column} must be an array`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(task, "humanReviewNotice") && typeof task.humanReviewNotice !== "string") {
    errors.push("humanReviewNotice must be a string");
  }

  if (errors.length === 0) {
    if (typeof task.task === "string" && task.task.length === 0) warnings.push("task is empty");
    if (Array.isArray(task.authoritySource) && task.authoritySource.length === 0) warnings.push("authoritySource is empty");
    if (typeof task.requiredDocument === "string" && task.requiredDocument.length === 0) warnings.push("requiredDocument is empty");
    if (Array.isArray(task.sourceCards) && task.sourceCards.length === 0) warnings.push("sourceCards is empty");
    if (Array.isArray(task.missingFacts) && task.missingFacts.length === 0) warnings.push("missingFacts is empty");
    if (Array.isArray(task.assumptions) && task.assumptions.length === 0) warnings.push("assumptions is empty");
    if (task.status === "unknown") warnings.push("status is unknown");
    if (task.priority === "unknown") warnings.push("priority is unknown");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaKey: "complianceChecklistOutput",
    mode: "compliance_checklist"
  };
}

/**
 * Validates the shape of a candidate Compliance Checklist output object
 * without throwing. Always returns a structured result object. Validates
 * every checklistItems item via validateComplianceChecklistTaskShape().
 *
 * @param {*} output
 * @returns {{valid: boolean, errors: string[], warnings: string[], schemaKey: string, mode: string}}
 */
export function validateComplianceChecklistOutputShape(output) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(output)) {
    errors.push("output must be a plain object");
    return { valid: false, errors, warnings, schemaKey: "complianceChecklistOutput", mode: "compliance_checklist" };
  }

  if (output.mode !== "compliance_checklist") {
    errors.push(`mode must be "compliance_checklist" (found: ${JSON.stringify(output.mode)})`);
  }
  if (output.schemaKey !== "complianceChecklistOutput") {
    errors.push(`schemaKey must be "complianceChecklistOutput" (found: ${JSON.stringify(output.schemaKey)})`);
  }

  for (const field of COMPLIANCE_CHECKLIST_REQUIRED_TOP_LEVEL_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(output, field)) {
      errors.push(`missing required top-level field: ${field}`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(output, "checklistItems") && !Array.isArray(output.checklistItems)) {
    errors.push("checklistItems must be an array");
  }
  if (Object.prototype.hasOwnProperty.call(output, "summary") && typeof output.summary !== "string") {
    errors.push("summary must be a string");
  }

  const arrayFields = ["assumptions", "missingFacts", "documentsNeeded", "sourceCards"];
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

  if (Array.isArray(output.checklistItems)) {
    output.checklistItems.forEach((task, index) => {
      const taskResult = validateComplianceChecklistTaskShape(task);
      if (!taskResult.valid) {
        for (const err of taskResult.errors) errors.push(`checklistItems[${index}]: ${err}`);
      }
      for (const warn of taskResult.warnings) warnings.push(`checklistItems[${index}]: ${warn}`);
    });
  }

  if (errors.length === 0) {
    if (Array.isArray(output.checklistItems) && output.checklistItems.length === 0) {
      warnings.push("checklistItems is empty — not a final professional output");
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
    if (Array.isArray(output.documentsNeeded) && output.documentsNeeded.length === 0) {
      warnings.push("documentsNeeded is empty — not a final professional output");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaKey: "complianceChecklistOutput",
    mode: "compliance_checklist"
  };
}

/**
 * Validates the internal schema descriptor's shape and policy invariants
 * without throwing. Always returns a structured result object.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], requiredFieldCount: number, requiredInputCount: number, requiredOutputColumnCount: number, governanceRuleCount: number, prohibitedBehaviorCount: number, statusValueCount: number, priorityValueCount: number}}
 */
export function validateComplianceChecklistSchema() {
  const errors = [];
  const warnings = [];
  const schema = RAW_SCHEMA;

  if (schema.mode !== "compliance_checklist") errors.push("schema mode must be compliance_checklist");
  if (schema.schemaKey !== "complianceChecklistOutput") errors.push("schema schemaKey must be complianceChecklistOutput");
  if (schema.runtimeWiring !== false) errors.push("schema runtimeWiring must be false");
  if (schema.featureFlagDefault !== "off") errors.push("schema featureFlagDefault must be off");
  if (schema.humanReviewRequired !== true) errors.push("schema humanReviewRequired must be true");
  if (schema.sourceCardsRequired !== true) errors.push("schema sourceCardsRequired must be true");
  if (schema.missingFactsRequired !== true) errors.push("schema missingFactsRequired must be true");
  if (schema.assumptionsRequired !== true) errors.push("schema assumptionsRequired must be true");
  if (schema.finalFiling !== false) errors.push("schema finalFiling must be false");
  if (schema.automaticSubmission !== false) errors.push("schema automaticSubmission must be false");

  for (const input of ["complianceTopic", "taxpayerType", "taxPeriodOrDate", "facts", "intendedUse"]) {
    if (!COMPLIANCE_CHECKLIST_REQUIRED_INPUTS.includes(input)) {
      errors.push(`required inputs must include: ${input}`);
    }
  }

  const expectedColumns = [
    "task",
    "responsibleParty",
    "requiredDocument",
    "deadlineTiming",
    "authoritySource",
    "status",
    "priority",
    "notes",
    "assumptions",
    "missingFacts",
    "sourceCards",
    "humanReviewNotice"
  ];
  if (COMPLIANCE_CHECKLIST_REQUIRED_OUTPUT_COLUMNS.join(",") !== expectedColumns.join(",")) {
    errors.push("required output columns do not match the stable canonical list/order");
  }

  for (const status of [
    "not_started",
    "in_progress",
    "pending_client",
    "pending_bir",
    "pending_sec",
    "pending_lgu",
    "completed",
    "blocked",
    "not_applicable",
    "unknown"
  ]) {
    if (!COMPLIANCE_CHECKLIST_STATUS_VALUES.includes(status)) {
      errors.push(`status values must include: ${status}`);
    }
  }

  for (const priority of ["low", "normal", "high", "urgent", "unknown"]) {
    if (!COMPLIANCE_CHECKLIST_PRIORITY_VALUES.includes(priority)) {
      errors.push(`priority values must include: ${priority}`);
    }
  }

  for (const rule of [
    "no_fabricated_citations",
    "existing_retrieval_only",
    "no_live_web_search",
    "no_new_authority_ingestion",
    "no_memory_activation",
    "task_must_be_tied_to_authority_or_assumption",
    "deadline_disclosure_required_if_known"
  ]) {
    if (!COMPLIANCE_CHECKLIST_GOVERNANCE_RULES.includes(rule)) {
      errors.push(`governance rules must include: ${rule}`);
    }
  }

  for (const behavior of [
    "fabricated_authority",
    "final_filing_claim",
    "live_web_search",
    "memory_write",
    "production_change",
    "guaranteed_compliance_outcome_claim",
    "deadline_claim_without_date_basis",
    "automatic_filing_claim"
  ]) {
    if (!COMPLIANCE_CHECKLIST_PROHIBITED_BEHAVIORS.includes(behavior)) {
      errors.push(`prohibited behaviors must include: ${behavior}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiredFieldCount: COMPLIANCE_CHECKLIST_REQUIRED_TOP_LEVEL_FIELDS.length,
    requiredInputCount: COMPLIANCE_CHECKLIST_REQUIRED_INPUTS.length,
    requiredOutputColumnCount: COMPLIANCE_CHECKLIST_REQUIRED_OUTPUT_COLUMNS.length,
    governanceRuleCount: COMPLIANCE_CHECKLIST_GOVERNANCE_RULES.length,
    prohibitedBehaviorCount: COMPLIANCE_CHECKLIST_PROHIBITED_BEHAVIORS.length,
    statusValueCount: COMPLIANCE_CHECKLIST_STATUS_VALUES.length,
    priorityValueCount: COMPLIANCE_CHECKLIST_PRIORITY_VALUES.length
  };
}
