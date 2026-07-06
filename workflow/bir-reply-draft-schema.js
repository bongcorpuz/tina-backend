// FILE: workflow/bir-reply-draft-schema.js
// PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1
//
// Pure, dependency-free schema scaffold for the bir_reply_protest_draft
// workflow mode designed in PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1
// and registered in PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1. This module
// has NO I/O, NO network calls, NO Supabase/OpenAI/Google Drive/n8n/
// Firecrawl/Crawlee dependency, NO filesystem access, NO process.env
// dependency, NO Date.now/randomness, and NO side effects. It generates no
// live BIR replies, protests, position papers, or filings and is not wired
// into ask-handler.js, pipeline.js, server.js, routes, or the frontend.

"use strict";

export const PHASE_09E_BIR_REPLY_DRAFT_SCHEMA_VERSION = "1.0.0";

export const BIR_REPLY_DRAFT_REQUIRED_INPUTS = Object.freeze([
  "birDocumentType",
  "assessmentStage",
  "facts",
  "issue",
  "taxPeriod",
  "amountInvolved",
  "availableDocuments"
]);

export const BIR_REPLY_DRAFT_OPTIONAL_INPUTS = Object.freeze([
  "taxpayerType",
  "rdoOrOffice",
  "letterDate",
  "receivedDate",
  "deadline",
  "loaDate",
  "panDate",
  "fanDate",
  "fddaDate",
  "nodDate",
  "subpoenaDate",
  "taxType",
  "transactionType",
  "deficiencyTaxType",
  "assessmentNumber",
  "docketOrReferenceNumber",
  "birFindings",
  "taxpayerPosition",
  "knownAuthorities",
  "unavailableDocuments",
  "intendedAudience",
  "requestedRelief",
  "desiredTone",
  "userAssumptions"
]);

// Stable, ordered canonical output sections.
export const BIR_REPLY_DRAFT_REQUIRED_OUTPUT_SECTIONS = Object.freeze([
  "background",
  "assessmentIssue",
  "taxpayerPosition",
  "legalBasis",
  "factualDocumentaryBasis",
  "requestedAction",
  "attachmentsEvidenceChecklist",
  "caveats",
  "assumptions",
  "missingFacts",
  "sourceCards",
  "humanReviewNotice"
]);

export const BIR_REPLY_DRAFT_REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  "mode",
  "schemaKey",
  "background",
  "assessmentIssue",
  "taxpayerPosition",
  "legalBasis",
  "factualDocumentaryBasis",
  "requestedAction",
  "attachmentsEvidenceChecklist",
  "caveats",
  "assumptions",
  "missingFacts",
  "sourceCards",
  "humanReviewNotice",
  "metadata"
]);

export const BIR_REPLY_DRAFT_DOCUMENT_TYPES = Object.freeze([
  "loa",
  "pan",
  "fan",
  "fdda",
  "nod",
  "subpoena",
  "notice",
  "assessment_notice",
  "letter_notice",
  "request_for_documents",
  "other",
  "unknown"
]);

export const BIR_REPLY_DRAFT_ASSESSMENT_STAGES = Object.freeze([
  "audit",
  "loa",
  "pan_reply",
  "fan_protest",
  "reinvestigation",
  "reconsideration",
  "fdda_appeal",
  "nod_response",
  "subpoena_response",
  "document_submission",
  "administrative_response",
  "court_litigation",
  "other",
  "unknown"
]);

export const BIR_REPLY_DRAFT_GOVERNANCE_RULES = Object.freeze([
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
  "deadline_disclosure_required_if_known",
  "taxpayer_position_must_depend_on_facts",
  "bir_document_type_must_be_labeled",
  "assessment_stage_must_be_labeled",
  "draft_only_not_final_filing",
  "final_filing_false",
  "automatic_submission_false",
  "no_memory_activation",
  "no_persistent_client_matter_storage",
  "no_generated_work_product_persistence",
  "no_third_party_egress",
  "no_production_change"
]);

export const BIR_REPLY_DRAFT_PROHIBITED_BEHAVIORS = Object.freeze([
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
  "guaranteed_bir_outcome_claim",
  "taxpayer_position_without_factual_basis",
  "unlabeled_bir_document_type",
  "unlabeled_assessment_stage",
  "deadline_claim_without_date_basis",
  "false_timeliness_assurance"
]);

// Conceptual per-item field shapes — documentation-only descriptors, not
// enforced runtime types.
const LEGAL_BASIS_ITEM_SHAPE = Object.freeze([
  "authorityType",
  "authorityNumber",
  "title",
  "issuer",
  "doctrineOrRule",
  "relevance",
  "controllingStatus",
  "currentnessStatus",
  "sourceCardId",
  "citationLabel",
  "limitations"
]);

const FACTUAL_DOCUMENTARY_BASIS_ITEM_SHAPE = Object.freeze([
  "factOrDocument",
  "purpose",
  "supportsWhichIssue",
  "status",
  "limitation",
  "sourceOrAttachmentRef"
]);

const ATTACHMENT_EVIDENCE_CHECKLIST_ITEM_SHAPE = Object.freeze([
  "documentName",
  "purpose",
  "status",
  "priority",
  "responsibleParty",
  "deadlineOrTiming",
  "notes"
]);

const REQUESTED_ACTION_ITEM_SHAPE = Object.freeze(["request", "legalOrFactualBasis", "desiredOutcome", "caveat"]);

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
  mode: "bir_reply_protest_draft",
  schemaKey: "birReplyDraftOutput",
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
    "Draft professional reply/protest language for Philippine BIR assessment, audit, LOA, PAN, FAN, FDDA, NOD, subpoena, notice, or related tax controversy situations using existing TINA retrieval only.",
  requiredInputs: BIR_REPLY_DRAFT_REQUIRED_INPUTS,
  optionalInputs: BIR_REPLY_DRAFT_OPTIONAL_INPUTS,
  requiredOutputSections: BIR_REPLY_DRAFT_REQUIRED_OUTPUT_SECTIONS,
  requiredTopLevelFields: BIR_REPLY_DRAFT_REQUIRED_TOP_LEVEL_FIELDS,
  documentTypes: BIR_REPLY_DRAFT_DOCUMENT_TYPES,
  assessmentStages: BIR_REPLY_DRAFT_ASSESSMENT_STAGES,
  legalBasisItemShape: LEGAL_BASIS_ITEM_SHAPE,
  factualDocumentaryBasisItemShape: FACTUAL_DOCUMENTARY_BASIS_ITEM_SHAPE,
  attachmentEvidenceChecklistItemShape: ATTACHMENT_EVIDENCE_CHECKLIST_ITEM_SHAPE,
  requestedActionItemShape: REQUESTED_ACTION_ITEM_SHAPE,
  sourceCardItemShape: {
    currentPhase9: SOURCE_CARD_ITEM_SHAPE_CURRENT_PHASE9,
    futurePhase10: SOURCE_CARD_ITEM_SHAPE_FUTURE_PHASE10
  },
  sourceCardPolicyNote:
    "In Phase 9, GDrive/archive source cards are acceptable; officialUrl/canonicalSourceId may be absent. If officialUrl is absent, output must not claim official URL verification. Future Phase 10 will upgrade source cards to the officialUrl/archiveUrl/canonicalSourceId model.",
  governanceRules: BIR_REPLY_DRAFT_GOVERNANCE_RULES,
  prohibitedBehaviors: BIR_REPLY_DRAFT_PROHIBITED_BEHAVIORS
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
 * Returns a defensive deep-cloned copy of the BIR Reply / Protest Draft
 * schema descriptor.
 *
 * @returns {object}
 */
export function getBirReplyDraftSchema() {
  return deepClone(RAW_SCHEMA);
}

// One-time deep clone of RAW_SCHEMA exposed for direct-import convenience.
// Mutating this export cannot affect RAW_SCHEMA or subsequent
// getBirReplyDraftSchema() calls.
export const BIR_REPLY_DRAFT_SCHEMA = deepClone(RAW_SCHEMA);

/**
 * Returns a defensive copy of the required-inputs list.
 *
 * @returns {string[]}
 */
export function getBirReplyDraftRequiredInputs() {
  return [...BIR_REPLY_DRAFT_REQUIRED_INPUTS];
}

/**
 * Returns a defensive copy of the required output-sections list, in stable
 * canonical order.
 *
 * @returns {string[]}
 */
export function getBirReplyDraftRequiredOutputSections() {
  return [...BIR_REPLY_DRAFT_REQUIRED_OUTPUT_SECTIONS];
}

/**
 * Returns a defensive copy of the governance-rules list.
 *
 * @returns {string[]}
 */
export function getBirReplyDraftGovernanceRules() {
  return [...BIR_REPLY_DRAFT_GOVERNANCE_RULES];
}

/**
 * Returns a defensive copy of the supported BIR document types.
 *
 * @returns {string[]}
 */
export function getBirReplyDraftDocumentTypes() {
  return [...BIR_REPLY_DRAFT_DOCUMENT_TYPES];
}

/**
 * Returns a defensive copy of the supported assessment stages.
 *
 * @returns {string[]}
 */
export function getBirReplyDraftAssessmentStages() {
  return [...BIR_REPLY_DRAFT_ASSESSMENT_STAGES];
}

/**
 * Returns the source-card requirement descriptor for the
 * bir_reply_protest_draft mode.
 *
 * @returns {object}
 */
export function getBirReplyDraftSourceCardRequirement() {
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
 * Returns a fresh, defensive empty BIR Reply / Protest Draft output scaffold.
 * Every call returns new arrays/objects; no shared mutable references are
 * returned.
 *
 * @returns {object}
 */
export function createEmptyBirReplyDraftOutput() {
  return {
    mode: "bir_reply_protest_draft",
    schemaKey: "birReplyDraftOutput",
    background: "",
    assessmentIssue: [],
    taxpayerPosition: [],
    legalBasis: [],
    factualDocumentaryBasis: [],
    requestedAction: [],
    attachmentsEvidenceChecklist: [],
    caveats: [],
    assumptions: [],
    missingFacts: [],
    sourceCards: [],
    humanReviewNotice: "",
    metadata: {
      generatedBy: "TINA",
      workflowMode: "bir_reply_protest_draft",
      schemaVersion: PHASE_09E_BIR_REPLY_DRAFT_SCHEMA_VERSION,
      birDocumentType: "unknown",
      assessmentStage: "unknown",
      retrievalPolicy: [...BIR_REPLY_DRAFT_GOVERNANCE_RULES].filter((rule) =>
        ["existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion", "no_unapproved_sources"].includes(rule)
      ),
      authorityPolicy: [...BIR_REPLY_DRAFT_GOVERNANCE_RULES].filter((rule) =>
        [
          "no_fabricated_citations",
          "controlling_authority_prioritized",
          "related_authority_disclosed_as_related",
          "currentness_unknown_disclosed",
          "authority_type_label_required"
        ].includes(rule)
      ),
      sourceCardPolicy: ["current_phase9_gdrive_archive_acceptable", "phase10_official_url_archive_url_canonical_source_id_future"],
      privacyPolicy: [...BIR_REPLY_DRAFT_GOVERNANCE_RULES].filter((rule) =>
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
 * Normalizes a candidate list of BIR reply issues into a clean array of
 * non-blank, trimmed strings. Never throws on malformed input.
 *
 * @param {*} issues
 * @returns {string[]}
 */
export function normalizeBirReplyIssues(issues) {
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

const DOCUMENT_TYPE_ALIASES = Object.freeze({
  loa: "loa",
  "letter of authority": "loa",
  pan: "pan",
  "preliminary assessment notice": "pan",
  fan: "fan",
  "formal assessment notice": "fan",
  fld: "fan",
  "formal letter of demand": "fan",
  "fan/fld": "fan",
  "formal assessment notice/formal letter of demand": "fan",
  fdda: "fdda",
  "final decision on disputed assessment": "fdda",
  nod: "nod",
  "notice of denial": "nod",
  subpoena: "subpoena",
  notice: "notice",
  "assessment notice": "assessment_notice",
  "letter notice": "letter_notice",
  "request for documents": "request_for_documents",
  "document request": "request_for_documents"
});

/**
 * Normalizes a candidate BIR document-type value to one of
 * BIR_REPLY_DRAFT_DOCUMENT_TYPES. Unsupported/blank/null input normalizes to
 * "unknown". Never throws.
 *
 * @param {*} input
 * @returns {string}
 */
export function normalizeBirDocumentType(input) {
  if (typeof input !== "string") return "unknown";
  const key = input.trim().toLowerCase();
  if (key.length === 0) return "unknown";
  return Object.prototype.hasOwnProperty.call(DOCUMENT_TYPE_ALIASES, key) ? DOCUMENT_TYPE_ALIASES[key] : "unknown";
}

const ASSESSMENT_STAGE_ALIASES = Object.freeze({
  audit: "audit",
  loa: "loa",
  "letter of authority": "loa",
  "pan reply": "pan_reply",
  "reply to pan": "pan_reply",
  "fan protest": "fan_protest",
  protest: "fan_protest",
  "protest to fan": "fan_protest",
  reinvestigation: "reinvestigation",
  reconsideration: "reconsideration",
  "fdda appeal": "fdda_appeal",
  "appeal from fdda": "fdda_appeal",
  "nod response": "nod_response",
  "notice of denial response": "nod_response",
  "subpoena response": "subpoena_response",
  "document submission": "document_submission",
  "administrative response": "administrative_response",
  court: "court_litigation",
  litigation: "court_litigation",
  cta: "court_litigation"
});

/**
 * Normalizes a candidate assessment-stage value to one of
 * BIR_REPLY_DRAFT_ASSESSMENT_STAGES. Unsupported/blank/null input normalizes
 * to "unknown". Never throws.
 *
 * @param {*} input
 * @returns {string}
 */
export function normalizeBirAssessmentStage(input) {
  if (typeof input !== "string") return "unknown";
  const key = input.trim().toLowerCase();
  if (key.length === 0) return "unknown";
  return Object.prototype.hasOwnProperty.call(ASSESSMENT_STAGE_ALIASES, key) ? ASSESSMENT_STAGE_ALIASES[key] : "unknown";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validates the shape of a candidate BIR Reply / Protest Draft output object
 * without throwing. Always returns a structured result object.
 *
 * @param {*} output
 * @returns {{valid: boolean, errors: string[], warnings: string[], schemaKey: string, mode: string}}
 */
export function validateBirReplyDraftOutputShape(output) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(output)) {
    errors.push("output must be a plain object");
    return { valid: false, errors, warnings, schemaKey: "birReplyDraftOutput", mode: "bir_reply_protest_draft" };
  }

  if (output.mode !== "bir_reply_protest_draft") {
    errors.push(`mode must be "bir_reply_protest_draft" (found: ${JSON.stringify(output.mode)})`);
  }
  if (output.schemaKey !== "birReplyDraftOutput") {
    errors.push(`schemaKey must be "birReplyDraftOutput" (found: ${JSON.stringify(output.schemaKey)})`);
  }

  for (const field of BIR_REPLY_DRAFT_REQUIRED_TOP_LEVEL_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(output, field)) {
      errors.push(`missing required top-level field: ${field}`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(output, "background") && typeof output.background !== "string") {
    errors.push("background must be a string");
  }

  const arrayFields = [
    "assessmentIssue",
    "taxpayerPosition",
    "legalBasis",
    "factualDocumentaryBasis",
    "requestedAction",
    "attachmentsEvidenceChecklist",
    "caveats",
    "assumptions",
    "missingFacts",
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
    if (!BIR_REPLY_DRAFT_DOCUMENT_TYPES.includes(output.metadata.birDocumentType)) {
      errors.push(`metadata.birDocumentType must be a supported document type (found: ${JSON.stringify(output.metadata.birDocumentType)})`);
    }
    if (!BIR_REPLY_DRAFT_ASSESSMENT_STAGES.includes(output.metadata.assessmentStage)) {
      errors.push(`metadata.assessmentStage must be a supported assessment stage (found: ${JSON.stringify(output.metadata.assessmentStage)})`);
    }
  }

  if (errors.length === 0) {
    if (Array.isArray(output.assessmentIssue) && output.assessmentIssue.length === 0) {
      warnings.push("assessmentIssue is empty — not a final professional output");
    }
    if (Array.isArray(output.taxpayerPosition) && output.taxpayerPosition.length === 0) {
      warnings.push("taxpayerPosition is empty — not a final professional output");
    }
    if (Array.isArray(output.legalBasis) && output.legalBasis.length === 0) {
      warnings.push("legalBasis is empty — not a final professional output");
    }
    if (Array.isArray(output.factualDocumentaryBasis) && output.factualDocumentaryBasis.length === 0) {
      warnings.push("factualDocumentaryBasis is empty — not a final professional output");
    }
    if (Array.isArray(output.attachmentsEvidenceChecklist) && output.attachmentsEvidenceChecklist.length === 0) {
      warnings.push("attachmentsEvidenceChecklist is empty — not a final professional output");
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
    if (isPlainObject(output.metadata) && output.metadata.birDocumentType === "unknown") {
      warnings.push("metadata.birDocumentType is unknown");
    }
    if (isPlainObject(output.metadata) && output.metadata.assessmentStage === "unknown") {
      warnings.push("metadata.assessmentStage is unknown");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaKey: "birReplyDraftOutput",
    mode: "bir_reply_protest_draft"
  };
}

/**
 * Validates the internal schema descriptor's shape and policy invariants
 * without throwing. Always returns a structured result object.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], requiredFieldCount: number, requiredInputCount: number, requiredOutputSectionCount: number, governanceRuleCount: number, prohibitedBehaviorCount: number, documentTypeCount: number, assessmentStageCount: number}}
 */
export function validateBirReplyDraftSchema() {
  const errors = [];
  const warnings = [];
  const schema = RAW_SCHEMA;

  if (schema.mode !== "bir_reply_protest_draft") errors.push("schema mode must be bir_reply_protest_draft");
  if (schema.schemaKey !== "birReplyDraftOutput") errors.push("schema schemaKey must be birReplyDraftOutput");
  if (schema.runtimeWiring !== false) errors.push("schema runtimeWiring must be false");
  if (schema.featureFlagDefault !== "off") errors.push("schema featureFlagDefault must be off");
  if (schema.humanReviewRequired !== true) errors.push("schema humanReviewRequired must be true");
  if (schema.sourceCardsRequired !== true) errors.push("schema sourceCardsRequired must be true");
  if (schema.missingFactsRequired !== true) errors.push("schema missingFactsRequired must be true");
  if (schema.assumptionsRequired !== true) errors.push("schema assumptionsRequired must be true");
  if (schema.finalFiling !== false) errors.push("schema finalFiling must be false");
  if (schema.automaticSubmission !== false) errors.push("schema automaticSubmission must be false");

  for (const input of ["birDocumentType", "assessmentStage", "facts", "issue", "taxPeriod", "amountInvolved", "availableDocuments"]) {
    if (!BIR_REPLY_DRAFT_REQUIRED_INPUTS.includes(input)) {
      errors.push(`required inputs must include: ${input}`);
    }
  }

  const expectedSections = [
    "background",
    "assessmentIssue",
    "taxpayerPosition",
    "legalBasis",
    "factualDocumentaryBasis",
    "requestedAction",
    "attachmentsEvidenceChecklist",
    "caveats",
    "assumptions",
    "missingFacts",
    "sourceCards",
    "humanReviewNotice"
  ];
  if (BIR_REPLY_DRAFT_REQUIRED_OUTPUT_SECTIONS.join(",") !== expectedSections.join(",")) {
    errors.push("required output sections do not match the stable canonical list/order");
  }

  for (const docType of ["loa", "pan", "fan", "fdda", "nod", "subpoena", "unknown"]) {
    if (!BIR_REPLY_DRAFT_DOCUMENT_TYPES.includes(docType)) {
      errors.push(`document types must include: ${docType}`);
    }
  }

  for (const stage of ["audit", "loa", "pan_reply", "fan_protest", "fdda_appeal", "subpoena_response", "unknown"]) {
    if (!BIR_REPLY_DRAFT_ASSESSMENT_STAGES.includes(stage)) {
      errors.push(`assessment stages must include: ${stage}`);
    }
  }

  for (const rule of [
    "no_fabricated_citations",
    "existing_retrieval_only",
    "no_live_web_search",
    "no_new_authority_ingestion",
    "no_memory_activation",
    "bir_document_type_must_be_labeled",
    "assessment_stage_must_be_labeled",
    "draft_only_not_final_filing"
  ]) {
    if (!BIR_REPLY_DRAFT_GOVERNANCE_RULES.includes(rule)) {
      errors.push(`governance rules must include: ${rule}`);
    }
  }

  for (const behavior of [
    "fabricated_authority",
    "final_filing_claim",
    "live_web_search",
    "memory_write",
    "production_change",
    "guaranteed_bir_outcome_claim",
    "deadline_claim_without_date_basis",
    "false_timeliness_assurance"
  ]) {
    if (!BIR_REPLY_DRAFT_PROHIBITED_BEHAVIORS.includes(behavior)) {
      errors.push(`prohibited behaviors must include: ${behavior}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiredFieldCount: BIR_REPLY_DRAFT_REQUIRED_TOP_LEVEL_FIELDS.length,
    requiredInputCount: BIR_REPLY_DRAFT_REQUIRED_INPUTS.length,
    requiredOutputSectionCount: BIR_REPLY_DRAFT_REQUIRED_OUTPUT_SECTIONS.length,
    governanceRuleCount: BIR_REPLY_DRAFT_GOVERNANCE_RULES.length,
    prohibitedBehaviorCount: BIR_REPLY_DRAFT_PROHIBITED_BEHAVIORS.length,
    documentTypeCount: BIR_REPLY_DRAFT_DOCUMENT_TYPES.length,
    assessmentStageCount: BIR_REPLY_DRAFT_ASSESSMENT_STAGES.length
  };
}
