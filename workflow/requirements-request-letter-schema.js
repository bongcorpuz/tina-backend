// FILE: workflow/requirements-request-letter-schema.js
// PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1
//
// Pure, dependency-free schema scaffold for the requirements_request_letter
// workflow mode designed in PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1
// and registered in PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1. This module
// has NO I/O, NO network calls, NO Supabase/OpenAI/Google Drive/n8n/
// Firecrawl/Crawlee dependency, NO filesystem access, NO process.env
// dependency, NO Date.now/randomness, and NO side effects. It generates no
// live requirements request letters and is not wired into ask-handler.js,
// pipeline.js, server.js, routes, or the frontend.

"use strict";

export const PHASE_09I_REQUIREMENTS_REQUEST_LETTER_SCHEMA_VERSION = "1.0.0";

export const REQUIREMENTS_REQUEST_LETTER_REQUIRED_INPUTS = Object.freeze([
  "requestContext",
  "recipientType",
  "purpose",
  "facts",
  "requestedDocumentsOrInformation",
  "intendedUse"
]);

export const REQUIREMENTS_REQUEST_LETTER_OPTIONAL_INPUTS = Object.freeze([
  "taxpayerType",
  "taxPeriod",
  "deadline",
  "senderRole",
  "recipientName",
  "recipientOrganization",
  "communicationChannel",
  "desiredTone",
  "urgency",
  "availableDocuments",
  "missingDocuments",
  "knownAuthorities",
  "engagementContext",
  "matterReference",
  "userAssumptions",
  "requestedFormat"
]);

// Stable, ordered canonical output sections.
export const REQUIREMENTS_REQUEST_LETTER_REQUIRED_OUTPUT_SECTIONS = Object.freeze([
  "subject",
  "salutation",
  "openingContext",
  "purposeOfRequest",
  "requirementsRequested",
  "deadlineOrTiming",
  "submissionInstructions",
  "closingStatement",
  "assumptions",
  "missingFacts",
  "sourceCards",
  "humanReviewNotice"
]);

export const REQUIREMENTS_REQUEST_LETTER_REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  "mode",
  "schemaKey",
  "subject",
  "salutation",
  "openingContext",
  "purposeOfRequest",
  "requirementsRequested",
  "deadlineOrTiming",
  "submissionInstructions",
  "closingStatement",
  "assumptions",
  "missingFacts",
  "sourceCards",
  "humanReviewNotice",
  "metadata"
]);

export const REQUIREMENTS_REQUEST_LETTER_AUDIENCE_TYPES = Object.freeze([
  "client",
  "management",
  "board",
  "owner",
  "accountant",
  "employee",
  "vendor",
  "counterparty",
  "government_office",
  "legal",
  "auditor",
  "internal_team",
  "unknown"
]);

export const REQUIREMENTS_REQUEST_LETTER_REQUEST_CONTEXTS = Object.freeze([
  "tax_compliance",
  "tax_audit",
  "bir_assessment",
  "accounting",
  "audit",
  "business_registration",
  "business_closure",
  "sec_compliance",
  "lgu_permit",
  "payroll",
  "bookkeeping",
  "engagement_requirements",
  "due_diligence",
  "other",
  "unknown"
]);

export const REQUIREMENTS_REQUEST_LETTER_TONE_VALUES = Object.freeze([
  "professional",
  "formal",
  "concise",
  "firm",
  "polite",
  "urgent",
  "neutral",
  "unknown"
]);

export const REQUIREMENTS_REQUEST_LETTER_GOVERNANCE_RULES = Object.freeze([
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
  "request_must_be_tied_to_facts_or_authority",
  "recipient_type_must_be_labeled",
  "request_context_must_be_labeled",
  "draft_only_not_final_correspondence",
  "final_filing_false",
  "automatic_submission_false",
  "no_memory_activation",
  "no_persistent_client_matter_storage",
  "no_generated_work_product_persistence",
  "no_third_party_egress",
  "no_production_change"
]);

export const REQUIREMENTS_REQUEST_LETTER_PROHIBITED_BEHAVIORS = Object.freeze([
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
  "guaranteed_compliance_outcome_claim",
  "deadline_claim_without_date_basis",
  "false_timeliness_assurance",
  "automatic_filing_claim",
  "final_correspondence_claim",
  "sending_claim_without_user_approval",
  "recipient_type_unlabeled",
  "request_context_unlabeled"
]);

// Conceptual per-item field shapes — documentation-only descriptors, not
// enforced runtime types.
const REQUIREMENTS_REQUEST_ITEM_SHAPE = Object.freeze([
  "requirement",
  "purpose",
  "priority",
  "responsibleParty",
  "deadlineOrTiming",
  "formatOrTemplate",
  "authorityOrBasis",
  "notes",
  "assumptions",
  "missingFacts",
  "sourceCards"
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
  mode: "requirements_request_letter",
  schemaKey: "requirementsRequestLetterOutput",
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
    "Prepare structured professional request-letter drafts or requirement-list communications for clients, management, taxpayers, employees, accounting staff, counterparties, or external parties, using existing TINA retrieval only and preserving professional, non-final, human-review-first safeguards.",
  requiredInputs: REQUIREMENTS_REQUEST_LETTER_REQUIRED_INPUTS,
  optionalInputs: REQUIREMENTS_REQUEST_LETTER_OPTIONAL_INPUTS,
  requiredOutputSections: REQUIREMENTS_REQUEST_LETTER_REQUIRED_OUTPUT_SECTIONS,
  requiredTopLevelFields: REQUIREMENTS_REQUEST_LETTER_REQUIRED_TOP_LEVEL_FIELDS,
  audienceTypes: REQUIREMENTS_REQUEST_LETTER_AUDIENCE_TYPES,
  requestContexts: REQUIREMENTS_REQUEST_LETTER_REQUEST_CONTEXTS,
  toneValues: REQUIREMENTS_REQUEST_LETTER_TONE_VALUES,
  requirementsRequestItemShape: REQUIREMENTS_REQUEST_ITEM_SHAPE,
  sourceCardItemShape: {
    currentPhase9: SOURCE_CARD_ITEM_SHAPE_CURRENT_PHASE9,
    futurePhase10: SOURCE_CARD_ITEM_SHAPE_FUTURE_PHASE10
  },
  sourceCardPolicyNote:
    "In Phase 9, GDrive/archive source cards are acceptable; officialUrl/canonicalSourceId may be absent. If officialUrl is absent, output must not claim official URL verification. Future Phase 10 will upgrade source cards to the officialUrl/archiveUrl/canonicalSourceId model.",
  governanceRules: REQUIREMENTS_REQUEST_LETTER_GOVERNANCE_RULES,
  prohibitedBehaviors: REQUIREMENTS_REQUEST_LETTER_PROHIBITED_BEHAVIORS
});

function deepClone(value) {
  if (Array.isArray(value)) return value.map((item) => deepClone(item));
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) out[key] = deepClone(value[key]);
    return out;
  }
  return value;
}

/**
 * Returns a defensive deep-cloned copy of the Requirements Request Letter
 * schema descriptor.
 *
 * @returns {object}
 */
export function getRequirementsRequestLetterSchema() {
  return deepClone(RAW_SCHEMA);
}

// One-time deep clone of RAW_SCHEMA exposed for direct-import convenience.
// Mutating this export cannot affect RAW_SCHEMA or subsequent
// getRequirementsRequestLetterSchema() calls.
export const REQUIREMENTS_REQUEST_LETTER_SCHEMA = deepClone(RAW_SCHEMA);

/**
 * Returns a defensive copy of the required-inputs list.
 *
 * @returns {string[]}
 */
export function getRequirementsRequestLetterRequiredInputs() {
  return [...REQUIREMENTS_REQUEST_LETTER_REQUIRED_INPUTS];
}

/**
 * Returns a defensive copy of the required output-sections list, in stable
 * canonical order.
 *
 * @returns {string[]}
 */
export function getRequirementsRequestLetterRequiredOutputSections() {
  return [...REQUIREMENTS_REQUEST_LETTER_REQUIRED_OUTPUT_SECTIONS];
}

/**
 * Returns a defensive copy of the governance-rules list.
 *
 * @returns {string[]}
 */
export function getRequirementsRequestLetterGovernanceRules() {
  return [...REQUIREMENTS_REQUEST_LETTER_GOVERNANCE_RULES];
}

/**
 * Returns a defensive copy of the supported audience types.
 *
 * @returns {string[]}
 */
export function getRequirementsRequestLetterAudienceTypes() {
  return [...REQUIREMENTS_REQUEST_LETTER_AUDIENCE_TYPES];
}

/**
 * Returns a defensive copy of the supported request contexts.
 *
 * @returns {string[]}
 */
export function getRequirementsRequestLetterRequestContexts() {
  return [...REQUIREMENTS_REQUEST_LETTER_REQUEST_CONTEXTS];
}

/**
 * Returns a defensive copy of the supported tone values.
 *
 * @returns {string[]}
 */
export function getRequirementsRequestLetterToneValues() {
  return [...REQUIREMENTS_REQUEST_LETTER_TONE_VALUES];
}

/**
 * Returns the source-card requirement descriptor for the
 * requirements_request_letter mode.
 *
 * @returns {object}
 */
export function getRequirementsRequestLetterSourceCardRequirement() {
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
 * Returns a fresh, defensive empty Requirements Request Letter output
 * scaffold. Every call returns new arrays/objects; no shared mutable
 * references are returned.
 *
 * @returns {object}
 */
export function createEmptyRequirementsRequestLetterOutput() {
  return {
    mode: "requirements_request_letter",
    schemaKey: "requirementsRequestLetterOutput",
    subject: "",
    salutation: "",
    openingContext: "",
    purposeOfRequest: "",
    requirementsRequested: [],
    deadlineOrTiming: "",
    submissionInstructions: "",
    closingStatement: "",
    assumptions: [],
    missingFacts: [],
    sourceCards: [],
    humanReviewNotice: "",
    metadata: {
      generatedBy: "TINA",
      workflowMode: "requirements_request_letter",
      schemaVersion: PHASE_09I_REQUIREMENTS_REQUEST_LETTER_SCHEMA_VERSION,
      requestContext: "unknown",
      recipientType: "unknown",
      tone: "professional",
      retrievalPolicy: [...REQUIREMENTS_REQUEST_LETTER_GOVERNANCE_RULES].filter((rule) =>
        ["existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion", "no_unapproved_sources"].includes(rule)
      ),
      authorityPolicy: [...REQUIREMENTS_REQUEST_LETTER_GOVERNANCE_RULES].filter((rule) =>
        [
          "no_fabricated_citations",
          "controlling_authority_prioritized",
          "related_authority_disclosed_as_related",
          "currentness_unknown_disclosed",
          "authority_type_label_required"
        ].includes(rule)
      ),
      sourceCardPolicy: ["current_phase9_gdrive_archive_acceptable", "phase10_official_url_archive_url_canonical_source_id_future"],
      privacyPolicy: [...REQUIREMENTS_REQUEST_LETTER_GOVERNANCE_RULES].filter((rule) =>
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
 * Returns a fresh, defensive empty requirements-request item scaffold. Every
 * call returns new arrays/objects; no shared mutable references are
 * returned.
 *
 * @returns {object}
 */
export function createEmptyRequirementsRequestItem() {
  return {
    requirement: "",
    purpose: "",
    priority: "",
    responsibleParty: "",
    deadlineOrTiming: "",
    formatOrTemplate: "",
    authorityOrBasis: "",
    notes: "",
    assumptions: [],
    missingFacts: [],
    sourceCards: []
  };
}

/**
 * Normalizes a candidate list of requirements-request topics into a clean
 * array of non-blank, trimmed strings. Never throws on malformed input.
 *
 * @param {*} topics
 * @returns {string[]}
 */
export function normalizeRequirementsRequestTopics(topics) {
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
  employee: "employee",
  staff: "employee",
  vendor: "vendor",
  supplier: "vendor",
  counterparty: "counterparty",
  "third party": "counterparty",
  government: "government_office",
  "government office": "government_office",
  bir: "government_office",
  sec: "government_office",
  lgu: "government_office",
  legal: "legal",
  lawyer: "legal",
  counsel: "legal",
  auditor: "auditor",
  "external auditor": "auditor",
  internal: "internal_team",
  team: "internal_team",
  "internal team": "internal_team"
});

/**
 * Normalizes a candidate audience/recipient-type value to one of
 * REQUIREMENTS_REQUEST_LETTER_AUDIENCE_TYPES. Unsupported/blank/null input
 * normalizes to "unknown". Never throws.
 *
 * @param {*} input
 * @returns {string}
 */
export function normalizeRequirementsRequestAudienceType(input) {
  if (typeof input !== "string") return "unknown";
  const key = input.trim().toLowerCase();
  if (key.length === 0) return "unknown";
  return Object.prototype.hasOwnProperty.call(AUDIENCE_TYPE_ALIASES, key) ? AUDIENCE_TYPE_ALIASES[key] : "unknown";
}

const REQUEST_CONTEXT_ALIASES = Object.freeze({
  tax: "tax_compliance",
  "tax compliance": "tax_compliance",
  "tax audit": "tax_audit",
  "bir assessment": "bir_assessment",
  assessment: "bir_assessment",
  accounting: "accounting",
  audit: "audit",
  "external audit": "audit",
  "business registration": "business_registration",
  registration: "business_registration",
  "business closure": "business_closure",
  closure: "business_closure",
  sec: "sec_compliance",
  "sec compliance": "sec_compliance",
  lgu: "lgu_permit",
  "business permit": "lgu_permit",
  "mayor's permit": "lgu_permit",
  "mayors permit": "lgu_permit",
  payroll: "payroll",
  bookkeeping: "bookkeeping",
  engagement: "engagement_requirements",
  "engagement requirements": "engagement_requirements",
  "due diligence": "due_diligence"
});

/**
 * Normalizes a candidate request-context value to one of
 * REQUIREMENTS_REQUEST_LETTER_REQUEST_CONTEXTS. Unsupported/blank/null
 * input normalizes to "unknown". Never throws.
 *
 * @param {*} input
 * @returns {string}
 */
export function normalizeRequirementsRequestContext(input) {
  if (typeof input !== "string") return "unknown";
  const key = input.trim().toLowerCase();
  if (key.length === 0) return "unknown";
  return Object.prototype.hasOwnProperty.call(REQUEST_CONTEXT_ALIASES, key) ? REQUEST_CONTEXT_ALIASES[key] : "unknown";
}

const TONE_ALIASES = Object.freeze({
  professional: "professional",
  formal: "formal",
  short: "concise",
  brief: "concise",
  concise: "concise",
  firm: "firm",
  strict: "firm",
  polite: "polite",
  courteous: "polite",
  urgent: "urgent",
  rush: "urgent",
  neutral: "neutral"
});

/**
 * Normalizes a candidate tone value to one of
 * REQUIREMENTS_REQUEST_LETTER_TONE_VALUES. Unsupported/blank/null input
 * normalizes to "unknown". Never throws.
 *
 * @param {*} input
 * @returns {string}
 */
export function normalizeRequirementsRequestTone(input) {
  if (typeof input !== "string") return "unknown";
  const key = input.trim().toLowerCase();
  if (key.length === 0) return "unknown";
  return Object.prototype.hasOwnProperty.call(TONE_ALIASES, key) ? TONE_ALIASES[key] : "unknown";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validates the shape of a candidate requirements-request item object
 * without throwing. Always returns a structured result object.
 *
 * @param {*} item
 * @returns {{valid: boolean, errors: string[], warnings: string[], schemaKey: string, mode: string}}
 */
export function validateRequirementsRequestItemShape(item) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(item)) {
    errors.push("item must be a plain object");
    return { valid: false, errors, warnings, schemaKey: "requirementsRequestLetterOutput", mode: "requirements_request_letter" };
  }

  if (typeof item.requirement !== "string") errors.push("requirement must be a string");
  for (const field of ["purpose", "priority", "responsibleParty", "deadlineOrTiming", "formatOrTemplate", "authorityOrBasis", "notes"]) {
    if (!Object.prototype.hasOwnProperty.call(item, field)) errors.push(`${field} must exist`);
  }

  const arrayFields = ["assumptions", "missingFacts", "sourceCards"];
  for (const field of arrayFields) {
    if (Object.prototype.hasOwnProperty.call(item, field) && !Array.isArray(item[field])) {
      errors.push(`field ${field} must be an array`);
    }
  }

  if (errors.length === 0) {
    if (typeof item.requirement === "string" && item.requirement.length === 0) warnings.push("requirement is empty");
    if (typeof item.purpose === "string" && item.purpose.length === 0) warnings.push("purpose is empty");
    if (typeof item.authorityOrBasis === "string" && item.authorityOrBasis.length === 0) warnings.push("authorityOrBasis is empty");
    if (Array.isArray(item.sourceCards) && item.sourceCards.length === 0) warnings.push("sourceCards is empty");
    if (Array.isArray(item.missingFacts) && item.missingFacts.length === 0) warnings.push("missingFacts is empty");
    if (Array.isArray(item.assumptions) && item.assumptions.length === 0) warnings.push("assumptions is empty");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaKey: "requirementsRequestLetterOutput",
    mode: "requirements_request_letter"
  };
}

/**
 * Validates the shape of a candidate Requirements Request Letter output
 * object without throwing. Always returns a structured result object.
 * Validates every requirementsRequested item via
 * validateRequirementsRequestItemShape().
 *
 * @param {*} output
 * @returns {{valid: boolean, errors: string[], warnings: string[], schemaKey: string, mode: string}}
 */
export function validateRequirementsRequestLetterOutputShape(output) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(output)) {
    errors.push("output must be a plain object");
    return { valid: false, errors, warnings, schemaKey: "requirementsRequestLetterOutput", mode: "requirements_request_letter" };
  }

  if (output.mode !== "requirements_request_letter") {
    errors.push(`mode must be "requirements_request_letter" (found: ${JSON.stringify(output.mode)})`);
  }
  if (output.schemaKey !== "requirementsRequestLetterOutput") {
    errors.push(`schemaKey must be "requirementsRequestLetterOutput" (found: ${JSON.stringify(output.schemaKey)})`);
  }

  for (const field of REQUIREMENTS_REQUEST_LETTER_REQUIRED_TOP_LEVEL_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(output, field)) {
      errors.push(`missing required top-level field: ${field}`);
    }
  }

  const stringFields = ["subject", "salutation", "openingContext", "purposeOfRequest", "deadlineOrTiming", "submissionInstructions", "closingStatement"];
  for (const field of stringFields) {
    if (Object.prototype.hasOwnProperty.call(output, field) && typeof output[field] !== "string") {
      errors.push(`field ${field} must be a string`);
    }
  }

  const arrayFields = ["requirementsRequested", "assumptions", "missingFacts", "sourceCards"];
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
    if (!REQUIREMENTS_REQUEST_LETTER_REQUEST_CONTEXTS.includes(output.metadata.requestContext)) {
      errors.push(`metadata.requestContext must be a supported request context (found: ${JSON.stringify(output.metadata.requestContext)})`);
    }
    if (!REQUIREMENTS_REQUEST_LETTER_AUDIENCE_TYPES.includes(output.metadata.recipientType)) {
      errors.push(`metadata.recipientType must be a supported audience type (found: ${JSON.stringify(output.metadata.recipientType)})`);
    }
    if (!REQUIREMENTS_REQUEST_LETTER_TONE_VALUES.includes(output.metadata.tone)) {
      errors.push(`metadata.tone must be a supported tone value (found: ${JSON.stringify(output.metadata.tone)})`);
    }
  }

  if (Array.isArray(output.requirementsRequested)) {
    output.requirementsRequested.forEach((item, index) => {
      const itemResult = validateRequirementsRequestItemShape(item);
      if (!itemResult.valid) {
        for (const err of itemResult.errors) errors.push(`requirementsRequested[${index}]: ${err}`);
      }
      for (const warn of itemResult.warnings) warnings.push(`requirementsRequested[${index}]: ${warn}`);
    });
  }

  if (errors.length === 0) {
    if (typeof output.subject === "string" && output.subject.length === 0) warnings.push("subject is empty");
    if (typeof output.openingContext === "string" && output.openingContext.length === 0) warnings.push("openingContext is empty");
    if (typeof output.purposeOfRequest === "string" && output.purposeOfRequest.length === 0) warnings.push("purposeOfRequest is empty");
    if (Array.isArray(output.requirementsRequested) && output.requirementsRequested.length === 0) {
      warnings.push("requirementsRequested is empty — not a final professional output");
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
    if (typeof output.humanReviewNotice === "string" && output.humanReviewNotice.length === 0) {
      warnings.push("humanReviewNotice is empty");
    }
    if (isPlainObject(output.metadata) && output.metadata.requestContext === "unknown") {
      warnings.push("metadata.requestContext is unknown");
    }
    if (isPlainObject(output.metadata) && output.metadata.recipientType === "unknown") {
      warnings.push("metadata.recipientType is unknown");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaKey: "requirementsRequestLetterOutput",
    mode: "requirements_request_letter"
  };
}

/**
 * Validates the internal schema descriptor's shape and policy invariants
 * without throwing. Always returns a structured result object.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], requiredFieldCount: number, requiredInputCount: number, requiredOutputSectionCount: number, governanceRuleCount: number, prohibitedBehaviorCount: number, audienceTypeCount: number, requestContextCount: number, toneValueCount: number}}
 */
export function validateRequirementsRequestLetterSchema() {
  const errors = [];
  const warnings = [];
  const schema = RAW_SCHEMA;

  if (schema.mode !== "requirements_request_letter") errors.push("schema mode must be requirements_request_letter");
  if (schema.schemaKey !== "requirementsRequestLetterOutput") errors.push("schema schemaKey must be requirementsRequestLetterOutput");
  if (schema.runtimeWiring !== false) errors.push("schema runtimeWiring must be false");
  if (schema.featureFlagDefault !== "off") errors.push("schema featureFlagDefault must be off");
  if (schema.humanReviewRequired !== true) errors.push("schema humanReviewRequired must be true");
  if (schema.sourceCardsRequired !== true) errors.push("schema sourceCardsRequired must be true");
  if (schema.missingFactsRequired !== true) errors.push("schema missingFactsRequired must be true");
  if (schema.assumptionsRequired !== true) errors.push("schema assumptionsRequired must be true");
  if (schema.finalFiling !== false) errors.push("schema finalFiling must be false");
  if (schema.automaticSubmission !== false) errors.push("schema automaticSubmission must be false");

  for (const input of ["requestContext", "recipientType", "purpose", "facts", "requestedDocumentsOrInformation", "intendedUse"]) {
    if (!REQUIREMENTS_REQUEST_LETTER_REQUIRED_INPUTS.includes(input)) {
      errors.push(`required inputs must include: ${input}`);
    }
  }

  const expectedSections = [
    "subject",
    "salutation",
    "openingContext",
    "purposeOfRequest",
    "requirementsRequested",
    "deadlineOrTiming",
    "submissionInstructions",
    "closingStatement",
    "assumptions",
    "missingFacts",
    "sourceCards",
    "humanReviewNotice"
  ];
  if (REQUIREMENTS_REQUEST_LETTER_REQUIRED_OUTPUT_SECTIONS.join(",") !== expectedSections.join(",")) {
    errors.push("required output sections do not match the stable canonical list/order");
  }

  for (const audience of [
    "client", "management", "board", "owner", "accountant", "employee", "vendor",
    "counterparty", "government_office", "legal", "auditor", "internal_team", "unknown"
  ]) {
    if (!REQUIREMENTS_REQUEST_LETTER_AUDIENCE_TYPES.includes(audience)) errors.push(`audience types must include: ${audience}`);
  }

  for (const context of [
    "tax_compliance", "tax_audit", "bir_assessment", "accounting", "audit", "business_registration",
    "business_closure", "sec_compliance", "lgu_permit", "payroll", "bookkeeping",
    "engagement_requirements", "due_diligence", "unknown"
  ]) {
    if (!REQUIREMENTS_REQUEST_LETTER_REQUEST_CONTEXTS.includes(context)) errors.push(`request contexts must include: ${context}`);
  }

  for (const tone of ["professional", "formal", "concise", "firm", "polite", "urgent", "neutral", "unknown"]) {
    if (!REQUIREMENTS_REQUEST_LETTER_TONE_VALUES.includes(tone)) errors.push(`tone values must include: ${tone}`);
  }

  for (const rule of [
    "no_fabricated_citations",
    "existing_retrieval_only",
    "no_live_web_search",
    "no_new_authority_ingestion",
    "no_memory_activation",
    "request_must_be_tied_to_facts_or_authority",
    "recipient_type_must_be_labeled",
    "request_context_must_be_labeled",
    "draft_only_not_final_correspondence"
  ]) {
    if (!REQUIREMENTS_REQUEST_LETTER_GOVERNANCE_RULES.includes(rule)) errors.push(`governance rules must include: ${rule}`);
  }

  for (const behavior of [
    "fabricated_authority",
    "final_filing_claim",
    "live_web_search",
    "memory_write",
    "production_change",
    "deadline_claim_without_date_basis",
    "false_timeliness_assurance",
    "final_correspondence_claim",
    "sending_claim_without_user_approval",
    "recipient_type_unlabeled",
    "request_context_unlabeled"
  ]) {
    if (!REQUIREMENTS_REQUEST_LETTER_PROHIBITED_BEHAVIORS.includes(behavior)) errors.push(`prohibited behaviors must include: ${behavior}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiredFieldCount: REQUIREMENTS_REQUEST_LETTER_REQUIRED_TOP_LEVEL_FIELDS.length,
    requiredInputCount: REQUIREMENTS_REQUEST_LETTER_REQUIRED_INPUTS.length,
    requiredOutputSectionCount: REQUIREMENTS_REQUEST_LETTER_REQUIRED_OUTPUT_SECTIONS.length,
    governanceRuleCount: REQUIREMENTS_REQUEST_LETTER_GOVERNANCE_RULES.length,
    prohibitedBehaviorCount: REQUIREMENTS_REQUEST_LETTER_PROHIBITED_BEHAVIORS.length,
    audienceTypeCount: REQUIREMENTS_REQUEST_LETTER_AUDIENCE_TYPES.length,
    requestContextCount: REQUIREMENTS_REQUEST_LETTER_REQUEST_CONTEXTS.length,
    toneValueCount: REQUIREMENTS_REQUEST_LETTER_TONE_VALUES.length
  };
}
