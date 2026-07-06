// FILE: workflow/workflow-mode-registry.js
// PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1
//
// Pure, dependency-free registry of the six Phase 9 professional workflow modes
// designed in PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1. This module has
// NO I/O, NO network calls, NO Supabase/OpenAI/Google Drive/n8n/Firecrawl/Crawlee
// dependency, NO filesystem access, NO process.env dependency, NO Date.now/
// randomness, and NO side effects. It is not wired into ask-handler.js,
// pipeline.js, server.js, routes, or the frontend. runtimeWiring is false and
// featureFlagDefault is "off" for every mode; this scaffold changes no runtime
// behavior.

"use strict";

export const PHASE_09B_WORKFLOW_REGISTRY_VERSION = "1.0.0";

export const WORKFLOW_MODE_IDS = Object.freeze([
  "tax_memo",
  "bir_reply_protest_draft",
  "audit_defense_matrix",
  "client_advisory",
  "compliance_checklist",
  "requirements_request_letter"
]);

const RETRIEVAL_POLICY = Object.freeze([
  "existing_retrieval_only",
  "no_live_web_search",
  "no_new_authority_ingestion",
  "no_unapproved_sources",
  "source_cards_required",
  "if_authority_unavailable_disclose"
]);

const AUTHORITY_POLICY = Object.freeze([
  "no_fabricated_citations",
  "controlling_authority_prioritized",
  "related_authority_disclosed_as_related",
  "currentness_unknown_disclosed",
  "authority_type_label_required"
]);

const SOURCE_CARD_POLICY = Object.freeze([
  "current_phase9_gdrive_archive_acceptable",
  "phase10_official_url_archive_url_canonical_source_id_future",
  "source_cards_required_for_professional_outputs"
]);

const PRIVACY_POLICY = Object.freeze([
  "no_persistent_client_matter_storage",
  "no_generated_work_product_persistence",
  "no_memory_activation",
  "no_third_party_egress",
  "no_n8n_firecrawl_crawlee",
  "no_production_change"
]);

const PROHIBITED_BEHAVIORS = Object.freeze([
  "final_filing_claim",
  "automatic_submission",
  "fabricated_authority",
  "unsupported_legal_conclusion",
  "live_web_search",
  "new_authority_ingestion",
  "memory_write",
  "client_matter_persistence",
  "third_party_egress",
  "production_change"
]);

const COMMON_MODE_FIELDS = Object.freeze({
  phase: "09",
  status: "scaffolded",
  runtimeWiring: false,
  featureFlagDefault: "off",
  outputType: "structured_professional_draft",
  retrievalPolicy: RETRIEVAL_POLICY,
  authorityPolicy: AUTHORITY_POLICY,
  sourceCardPolicy: SOURCE_CARD_POLICY,
  privacyPolicy: PRIVACY_POLICY,
  prohibitedBehaviors: PROHIBITED_BEHAVIORS,
  humanReviewRequired: true,
  missingFactsRequired: true,
  assumptionsRequired: true,
  sourceCardsRequired: true
});

// Raw (pre-freeze) mode definitions. Frozen and exposed only via defensive
// copies from getWorkflowMode()/listWorkflowModes() so callers cannot mutate
// the internal registry.
const RAW_MODES = {
  tax_memo: {
    ...COMMON_MODE_FIELDS,
    id: "tax_memo",
    label: "Tax Memo",
    shortLabel: "Tax Memo",
    purpose:
      "Produce structured professional Philippine tax memoranda grounded on existing TINA retrieval and source cards.",
    outputSections: [
      "factsProvided",
      "issues",
      "applicableAuthorities",
      "analysis",
      "conclusion",
      "risksLimitations",
      "missingFacts",
      "documentsNeeded",
      "sourceCards"
    ],
    requiredInputs: ["facts", "issue", "taxpayerType", "taxPeriod", "intendedAudience"],
    optionalInputs: ["amountInvolved", "availableDocuments", "urgency", "jurisdiction"],
    schemaKey: "taxMemoOutput",
    nextScaffoldPatch: "PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1"
  },
  bir_reply_protest_draft: {
    ...COMMON_MODE_FIELDS,
    id: "bir_reply_protest_draft",
    label: "BIR Reply / Protest Draft",
    shortLabel: "BIR Reply/Protest",
    purpose:
      "Draft professional reply/protest language for Philippine BIR assessment or audit situations using existing TINA retrieval only.",
    outputSections: [
      "background",
      "assessmentIssue",
      "taxpayerPosition",
      "legalBasis",
      "factualDocumentaryBasis",
      "requestedAction",
      "attachmentsEvidenceChecklist",
      "caveats",
      "missingFacts",
      "sourceCards"
    ],
    requiredInputs: [
      "birDocumentType",
      "assessmentStage",
      "facts",
      "issue",
      "taxPeriod",
      "amountInvolved",
      "availableDocuments"
    ],
    optionalInputs: ["taxpayerType", "intendedAudience", "urgency", "jurisdiction"],
    schemaKey: "birReplyDraftOutput",
    nextScaffoldPatch: "PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1"
  },
  audit_defense_matrix: {
    ...COMMON_MODE_FIELDS,
    id: "audit_defense_matrix",
    label: "Audit Defense Matrix",
    shortLabel: "Audit Defense Matrix",
    purpose:
      "Map audit or tax assessment issues to taxpayer positions, authorities, evidence, risk, and recommended actions.",
    outputSections: [
      "issue",
      "birAuditorPosition",
      "taxpayerPosition",
      "authority",
      "evidenceNeeded",
      "riskLevel",
      "recommendedAction",
      "missingFacts",
      "sourceCards"
    ],
    requiredInputs: ["issues", "auditorPosition", "facts", "taxPeriod", "availableDocuments", "intendedUse"],
    optionalInputs: ["taxpayerType", "amountInvolved", "jurisdiction"],
    schemaKey: "auditDefenseMatrixOutput",
    nextScaffoldPatch: "PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1"
  },
  client_advisory: {
    ...COMMON_MODE_FIELDS,
    id: "client_advisory",
    label: "Client Advisory",
    shortLabel: "Client Advisory",
    purpose:
      "Generate client or management-facing explanation of Philippine tax/compliance issues using professional plain-language framing.",
    outputSections: [
      "plainLanguageAnswer",
      "businessImpact",
      "complianceAction",
      "deadlinesIfKnown",
      "risks",
      "documentsNeeded",
      "missingFacts",
      "sourceCards"
    ],
    requiredInputs: ["issue", "facts", "taxpayerType", "intendedAudience", "urgency"],
    optionalInputs: ["taxPeriod", "amountInvolved", "jurisdiction"],
    schemaKey: "clientAdvisoryOutput",
    nextScaffoldPatch: "PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1"
  },
  compliance_checklist: {
    ...COMMON_MODE_FIELDS,
    id: "compliance_checklist",
    label: "Compliance Checklist",
    shortLabel: "Compliance Checklist",
    purpose:
      "Generate structured compliance task checklists for Philippine tax, registration, closure, VAT, EWT, withholding, and related compliance workflows.",
    outputSections: [
      "task",
      "responsibleParty",
      "requiredDocument",
      "deadlineTiming",
      "authoritySource",
      "status",
      "notes",
      "missingFacts",
      "sourceCards"
    ],
    requiredInputs: ["complianceTopic", "taxpayerType", "taxPeriodOrDate", "facts", "intendedUse"],
    optionalInputs: ["urgency", "jurisdiction"],
    schemaKey: "complianceChecklistOutput",
    nextScaffoldPatch: "PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1"
  },
  requirements_request_letter: {
    ...COMMON_MODE_FIELDS,
    id: "requirements_request_letter",
    label: "Requirements Request Letter",
    shortLabel: "Requirements Letter",
    purpose:
      "Generate professional request-list letter or email asking a client for documents and facts needed for tax/compliance/audit work.",
    outputSections: [
      "opening",
      "requestedDocuments",
      "purposeOfEachRequest",
      "deadlineRequestedTiming",
      "professionalCaveat",
      "closing",
      "missingFacts",
      "sourceCards"
    ],
    requiredInputs: ["clientContext", "engagementPurpose", "requestedDocumentsOrIssues", "deadline", "intendedTone"],
    optionalInputs: ["taxpayerType", "urgency"],
    schemaKey: "requirementsRequestLetterOutput",
    nextScaffoldPatch: "PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1"
  }
};

export const WORKFLOW_MODE_REGISTRY = Object.freeze(
  Object.fromEntries(
    WORKFLOW_MODE_IDS.map((id) => [id, Object.freeze(deepFreezeClone(RAW_MODES[id]))])
  )
);

// Alias table for normalizeWorkflowModeId(). Keys are lower-cased, trimmed,
// whitespace-collapsed alias strings; values are canonical mode IDs.
const ALIAS_TABLE = Object.freeze({
  tax_memo: "tax_memo",
  "tax memo": "tax_memo",
  memo: "tax_memo",
  taxmemo: "tax_memo",

  bir_reply_protest_draft: "bir_reply_protest_draft",
  "bir reply": "bir_reply_protest_draft",
  "bir reply protest draft": "bir_reply_protest_draft",
  "bir reply/protest draft": "bir_reply_protest_draft",
  "reply draft": "bir_reply_protest_draft",
  protest: "bir_reply_protest_draft",
  "protest draft": "bir_reply_protest_draft",

  audit_defense_matrix: "audit_defense_matrix",
  "audit defense": "audit_defense_matrix",
  "audit defense matrix": "audit_defense_matrix",
  "defense matrix": "audit_defense_matrix",

  client_advisory: "client_advisory",
  "client advisory": "client_advisory",
  advisory: "client_advisory",

  compliance_checklist: "compliance_checklist",
  checklist: "compliance_checklist",
  "compliance checklist": "compliance_checklist",

  requirements_request_letter: "requirements_request_letter",
  "requirements letter": "requirements_request_letter",
  "request letter": "requirements_request_letter",
  "requirements request letter": "requirements_request_letter"
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

function deepFreezeClone(value) {
  const cloned = deepClone(value);
  return cloned;
}

/**
 * Normalizes free-text or canonical mode identifiers to a canonical
 * WORKFLOW_MODE_IDS value. Returns null for unsupported input.
 *
 * @param {*} input
 * @returns {string|null}
 */
export function normalizeWorkflowModeId(input) {
  if (typeof input !== "string") return null;
  const key = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (key.length === 0) return null;

  if (Object.prototype.hasOwnProperty.call(ALIAS_TABLE, key)) {
    return ALIAS_TABLE[key];
  }

  // Also allow the same alias lookup with spaces collapsed to underscores,
  // to tolerate "tax-memo" / "tax_memo" style variants.
  const underscored = key.replace(/[\s-]+/g, "_");
  if (Object.prototype.hasOwnProperty.call(ALIAS_TABLE, underscored)) {
    return ALIAS_TABLE[underscored];
  }

  return null;
}

/**
 * True if `modeId` (canonical or alias) resolves to a supported workflow mode.
 *
 * @param {*} modeId
 * @returns {boolean}
 */
export function isSupportedWorkflowMode(modeId) {
  return normalizeWorkflowModeId(modeId) !== null;
}

/**
 * Returns a defensive (deep-cloned) copy of the mode definition, or null if
 * unsupported. Mutating the returned object never mutates the registry.
 *
 * @param {*} modeId
 * @returns {object|null}
 */
export function getWorkflowMode(modeId) {
  const canonical = normalizeWorkflowModeId(modeId);
  if (!canonical) return null;
  return deepClone(WORKFLOW_MODE_REGISTRY[canonical]);
}

/**
 * Returns defensive copies of all workflow modes, in the stable deterministic
 * order defined by WORKFLOW_MODE_IDS.
 *
 * @returns {object[]}
 */
export function listWorkflowModes() {
  return WORKFLOW_MODE_IDS.map((id) => deepClone(WORKFLOW_MODE_REGISTRY[id]));
}

/**
 * Returns a conceptual output-schema descriptor for the given mode, or null
 * if unsupported.
 *
 * @param {*} modeId
 * @returns {object|null}
 */
export function getWorkflowModeOutputSchema(modeId) {
  const mode = getWorkflowMode(modeId);
  if (!mode) return null;
  return {
    mode: mode.id,
    schemaKey: mode.schemaKey,
    requiredTopLevelFields: [...mode.outputSections],
    sourceCardsRequired: true,
    missingFactsRequired: true,
    assumptionsRequired: true,
    humanReviewRequired: true,
    finalFiling: false,
    automaticSubmission: false
  };
}

/**
 * Returns the required-inputs array for the given mode, or null if
 * unsupported.
 *
 * @param {*} modeId
 * @returns {string[]|null}
 */
export function getWorkflowModeRequiredInputs(modeId) {
  const mode = getWorkflowMode(modeId);
  if (!mode) return null;
  return [...mode.requiredInputs];
}

/**
 * Returns the source-card requirement descriptor for the given mode, or null
 * if unsupported.
 *
 * @param {*} modeId
 * @returns {object|null}
 */
export function getWorkflowModeSourceCardRequirement(modeId) {
  const mode = getWorkflowMode(modeId);
  if (!mode) return null;
  return {
    required: true,
    currentPhase9Policy: "gdrive_archive_acceptable",
    futurePhase10Policy: "official_url_primary_archive_url_secondary_canonical_source_id_internal",
    unsupportedAuthorityDisclosureRequired: true
  };
}

const REQUIRED_MODE_FIELDS = Object.freeze([
  "id",
  "label",
  "shortLabel",
  "purpose",
  "phase",
  "status",
  "runtimeWiring",
  "featureFlagDefault",
  "outputType",
  "outputSections",
  "requiredInputs",
  "optionalInputs",
  "retrievalPolicy",
  "authorityPolicy",
  "sourceCardPolicy",
  "privacyPolicy",
  "prohibitedBehaviors",
  "humanReviewRequired",
  "missingFactsRequired",
  "assumptionsRequired",
  "sourceCardsRequired",
  "schemaKey",
  "nextScaffoldPatch"
]);

/**
 * Validates the internal registry shape and policy invariants without
 * throwing. Always returns a structured result object.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], modeCount: number, modeIds: string[]}}
 */
export function validateWorkflowModeRegistry() {
  const errors = [];
  const warnings = [];
  const modeIds = Object.keys(WORKFLOW_MODE_REGISTRY);

  if (modeIds.length !== 6) {
    errors.push(`expected exactly 6 modes, found ${modeIds.length}`);
  }

  const seen = new Set();
  for (const expectedId of WORKFLOW_MODE_IDS) {
    if (!Object.prototype.hasOwnProperty.call(WORKFLOW_MODE_REGISTRY, expectedId)) {
      errors.push(`missing required mode id: ${expectedId}`);
    }
  }

  for (const id of modeIds) {
    if (seen.has(id)) {
      errors.push(`duplicate mode id: ${id}`);
    }
    seen.add(id);

    const mode = WORKFLOW_MODE_REGISTRY[id];

    for (const field of REQUIRED_MODE_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(mode, field)) {
        errors.push(`mode ${id} missing required field: ${field}`);
      }
    }

    if (mode.sourceCardsRequired !== true) errors.push(`mode ${id} sourceCardsRequired must be true`);
    if (mode.missingFactsRequired !== true) errors.push(`mode ${id} missingFactsRequired must be true`);
    if (mode.assumptionsRequired !== true) errors.push(`mode ${id} assumptionsRequired must be true`);
    if (mode.humanReviewRequired !== true) errors.push(`mode ${id} humanReviewRequired must be true`);
    if (mode.runtimeWiring !== false) errors.push(`mode ${id} runtimeWiring must be false`);
    if (mode.featureFlagDefault !== "off") errors.push(`mode ${id} featureFlagDefault must be off`);

    const prohibited = Array.isArray(mode.prohibitedBehaviors) ? mode.prohibitedBehaviors : [];
    for (const required of ["live_web_search", "new_authority_ingestion", "memory_write", "production_change"]) {
      if (!prohibited.includes(required)) {
        errors.push(`mode ${id} must prohibit ${required}`);
      }
    }

    if (!mode.schemaKey) errors.push(`mode ${id} missing schemaKey`);
    if (!mode.nextScaffoldPatch) errors.push(`mode ${id} missing nextScaffoldPatch`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    modeCount: modeIds.length,
    modeIds
  };
}
