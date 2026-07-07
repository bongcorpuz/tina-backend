// FILE: workflow/bir-document-compliance-transmittal.js
// PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1
//
// Pure, dependency-free, standalone scaffold structuring BIR document
// submission responses (LOA checklists, notices for presentation/
// submission, additional document requests, pre-subpoena/subpoena
// document organization, NOD/DOD/PAN/FAN/FLD/reinvestigation/FDDA
// supporting documents, termination supporting documents) into a
// controlled document compliance and transmittal plan. This module has NO
// I/O, NO network calls, NO Supabase/OpenAI/Google Drive/n8n/Firecrawl/
// Crawlee/MCP dependency, NO web search, NO browser automation, NO OCR, NO
// filesystem access, NO process.env dependency, NO Date.now/randomness,
// and NO side effects. It imports nothing from any other module in this
// repository. It performs no live authority retrieval, generates no
// filing-ready transmittal letter, affidavit, certification, email,
// protest, CTA pleading, tax opinion, or legal opinion, never submits
// anything, stores nothing, mutates no global state, and is not wired into
// ask-handler.js, pipeline.js, server.js, routes, authentication, or the
// frontend. It creates a structured compliance/transmittal plan only; it
// does not decide legal validity and does not draft final submissions. It
// never claims a document request, subpoena, LOA/eLA, PAN, FAN, FLD, FDDA,
// assessment, protest, or BIR action is void, invalid, cancelled, final,
// enforceable, appealable, or legally conclusive.

"use strict";

export const PHASE_09P_BIR_DOCUMENT_COMPLIANCE_TRANSMITTAL_VERSION = "PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1";

export const BIR_DOCUMENT_COMPLIANCE_TRANSMITTAL_MODE_ID = "bir_document_compliance_transmittal";

export const SUPPORTED_DOCUMENT_COMPLIANCE_ITEM_STATUSES = Object.freeze([
  "provided",
  "to_follow",
  "not_applicable",
  "unavailable",
  "non_existent",
  "substitute_proof_available",
  "requires_reconciliation",
  "requires_certified_copy",
  "requires_on_premise_review",
  "requires_bir_clarification",
  "unknown"
]);

export const SUPPORTED_DOCUMENT_COMPLIANCE_REQUEST_TYPES = Object.freeze([
  "LOA_INITIAL_CHECKLIST",
  "NOTICE_FOR_PRESENTATION_SUBMISSION",
  "CHECKLIST_OF_REQUIREMENTS",
  "ADDITIONAL_DOCUMENT_REQUEST",
  "PRE_SUBPOENA_REMINDER",
  "SUBPOENA_DUCES_TECUM",
  "NOD_DOD_SUPPORTING_DOCUMENTS",
  "PAN_REPLY_SUPPORTING_DOCUMENTS",
  "FAN_FLD_PROTEST_SUPPORTING_DOCUMENTS",
  "REINVESTIGATION_SUPPORTING_DOCUMENTS",
  "FDDA_APPEAL_SUPPORTING_DOCUMENTS",
  "TERMINATION_LETTER_SUPPORTING_DOCUMENTS",
  "UNKNOWN_DOCUMENT_REQUEST"
]);

export const SUPPORTED_DOCUMENT_COMPLIANCE_RESPONSE_TYPES = Object.freeze([
  "DOCUMENT_TRANSMITTAL_MATRIX",
  "ITEMIZED_STATUS_RESPONSE",
  "NON_APPLICABILITY_EXPLANATION",
  "UNAVAILABLE_DOCUMENT_EXPLANATION",
  "NON_EXISTENT_DOCUMENT_EXPLANATION",
  "SUBSTITUTE_PROOF_PLAN",
  "AFFIDAVIT_OR_CERTIFICATION_PLAN",
  "REQUEST_FOR_CLARIFICATION",
  "REQUEST_FOR_EXTENSION",
  "RECEIVING_PROOF_TRACKER",
  "CLIENT_STATUS_UPDATE",
  "HUMAN_REVIEW_REQUIRED"
]);

export const SUPPORTED_DOCUMENT_COMPLIANCE_ROUTES = Object.freeze([
  "AUTHORITY_SAFE_PROCEDURAL_FALLBACK",
  "BIR_NOTICE_TRIAGE",
  "BIR_AUDIT_DEFENSE_MATRIX",
  "PAN_FAN_FLD_PROTEST_WORKFLOW",
  "DOCUMENT_COMPLIANCE_TRANSMITTAL",
  "AUTHORITY_CORPUS_RESEARCH",
  "HUMAN_TAX_LEGAL_REVIEW"
]);

const ALLOWED_SOURCE_CARD_AUTHORITY_TIERS = Object.freeze([
  "official_reference_required",
  "uploaded_reference_pattern",
  "future_authority_corpus_required",
  "procedural_design_reference"
]);

const STANDARD_HUMAN_REVIEW_NOTICE =
  "This scaffold provides procedural-safe document compliance planning only and does not constitute a final legal or tax conclusion. Document status, submission proof, and BIR response should be verified, and this matter should be reviewed by a qualified tax professional before any filing deadline.";

const BASE_SOURCE_CARDS = Object.freeze([
  Object.freeze({
    label: "RMO No. 1-2026 standardized checklist and document request safeguards",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for standardized checklist, additional document request limits, relevance, necessity, audit scope, and documented explanation. This scaffold does not perform live verification."
  }),
  Object.freeze({
    label: "RMO No. 1-2026 voluminous records and certified copy reference",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for voluminous books/records, on-premise examination potential, and certified-copy submission concepts. This scaffold does not perform live verification."
  }),
  Object.freeze({
    label: "RMC No. 14-2026 prior notices/checklists/subpoenas under replacement eLA reference",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for treatment of prior notices, checklists, and subpoenas when a replacement eLA is issued for continuity. This scaffold does not perform live verification."
  }),
  Object.freeze({
    label: "RMC No. 5-2026 LOA/eLA verification reference",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Use BIR REVIE / LOA Verifier workflow when authority corpus is wired. This scaffold does not perform live verification."
  }),
  Object.freeze({
    label: "Uploaded professional document transmittal reference pattern",
    sourceType: "private uploaded reference",
    authorityTier: "uploaded_reference_pattern",
    note: "Use only as private development pattern; fixtures must be sanitized and must not expose real taxpayer data."
  }),
  Object.freeze({
    label: "Uploaded affidavit / substitute proof reference pattern",
    sourceType: "private uploaded reference",
    authorityTier: "uploaded_reference_pattern",
    note: "Use only as private development pattern for non-existent or unavailable documents; no real taxpayer data may be used."
  })
]);

// Conservative, deterministic, lowercased-substring prohibited-claim
// phrases. No AI model, no network, no mutation.
const PROHIBITED_CLAIM_PHRASES = Object.freeze([
  "this assessment is void",
  "this loa is invalid",
  "this ela is invalid",
  "this replacement ela is invalid",
  "this fan is invalid",
  "this fld is invalid",
  "this pan is invalid",
  "this fdda is invalid",
  "the bir cannot assess you",
  "the case is fully cancelled",
  "the assessment is cancelled",
  "you are permanently cleared",
  "no need to consult a professional",
  "submit everything without review",
  "ignore the notice",
  "you will win",
  "guaranteed cancellation",
  "final legal opinion",
  "official legal advice",
  "court-tested defense",
  "foolproof defense",
  "the protest is guaranteed to succeed",
  "cta appeal is definitely available",
  "the assessment is final",
  "the assessment is not final",
  "the deadline is definitely",
  "bir will accept this document",
  "this submission fully complies",
  "no further action is needed",
  "records never need to be brought to the bir",
  "all additional document requests are improper"
]);

// Real reference-corpus identifiers supplied only as a private do-not-leak
// list for this task; never emitted by this module and rejected on input.
const REAL_TAXPAYER_NAME_FRAGMENTS = Object.freeze(["TRUE FREIGHT GLOBAL LOGISTICS INC", "ALL ECARS INC", "SOCIAL HOMES INCORPORATED"]);
const REAL_OFFICER_NAME_FRAGMENTS = Object.freeze([
  "SUSAN F. SANTIAGO",
  "RENATO N. MOLINA",
  "PATRICIA ANN H. GUTIERREZ",
  "MARIA RUBIE AGANAN",
  "BRENNA ROSE VENERAYAN",
  "CECILLE ASILO",
  "MYRABEL DELA CRUZ",
  "AL-HELMEY F. ABDULRASHID",
  "ETHEL C. EVANGELISTA"
]);
const REAL_ELA_NUMBER_FRAGMENTS = Object.freeze(["eLA202400099140", "eLA202300040925", "eLA20240018917", "eLA202400055996"]);
const REAL_AUDIT_CASE_NUMBER_FRAGMENTS = Object.freeze(["AUDM16-00.8A-2025-016972", "AUDM29-048-2024-027259", "AUDM29-041-2026-150797"]);
const REAL_ASSESSMENT_AMOUNT_FRAGMENTS = Object.freeze(["9,367,987.68", "2,841,029.91", "614,038.19", "737,273.97", "13,106,907.66", "13,545,329.75"]);

const PROHIBITED_CONCLUSION_LABELS = Object.freeze([
  "document_acceptance_guarantee",
  "full_compliance_determination",
  "final_legal_opinion",
  "filing_ready_document_generation",
  "automatic_submission_determination"
]);

const REQUEST_TYPE_GUIDANCE = Object.freeze({
  LOA_INITIAL_CHECKLIST: Object.freeze({
    safeWarnings: Object.freeze(["Do not blindly submit every requested item without review.", "Classify each item and prepare a controlled written transmittal."]),
    recommendedNextActions: Object.freeze(["Match each checklist item to available records.", "Prepare an itemized transmittal schedule.", "Preserve BIR-stamped or email proof of submission."])
  }),
  NOTICE_FOR_PRESENTATION_SUBMISSION: Object.freeze({
    safeWarnings: Object.freeze(["Do not blindly submit every requested item without review.", "Classify each item and prepare a controlled written transmittal."]),
    recommendedNextActions: Object.freeze(["Match each requested item to available records.", "Prepare an itemized transmittal schedule.", "Preserve BIR-stamped or email proof of submission."])
  }),
  CHECKLIST_OF_REQUIREMENTS: Object.freeze({
    safeWarnings: Object.freeze(["Do not blindly submit every requested item without review.", "Classify each item and prepare a controlled written transmittal."]),
    recommendedNextActions: Object.freeze(["Match each checklist item to available records.", "Prepare an itemized transmittal schedule.", "Preserve BIR-stamped or email proof of submission."])
  }),
  ADDITIONAL_DOCUMENT_REQUEST: Object.freeze({
    safeWarnings: Object.freeze(["Additional requests should be checked for relevance, necessity, audit scope, and documentation before compliance."]),
    recommendedNextActions: Object.freeze(["Confirm the stated basis for the additional request.", "Classify each additional item and prepare a written transmittal.", "Ask BIR to identify scope and basis if unclear."])
  }),
  PRE_SUBPOENA_REMINDER: Object.freeze({
    safeWarnings: Object.freeze(["Treat this reminder as an escalation risk.", "Do not disregard the reminder."]),
    recommendedNextActions: Object.freeze(["Prepare an itemized status response covering every previously requested item.", "Attach proof of prior submission where available.", "Submit or file a response promptly."])
  }),
  SUBPOENA_DUCES_TECUM: Object.freeze({
    safeWarnings: Object.freeze(["This is a formal escalation instrument.", "Immediate professional review is recommended before any response."]),
    recommendedNextActions: Object.freeze(["Escalate to professional legal/tax review immediately.", "Preserve proof of all prior submissions.", "Do not respond without professional guidance."])
  }),
  NOD_DOD_SUPPORTING_DOCUMENTS: Object.freeze({
    safeWarnings: Object.freeze(["Track discussion dates, minutes, and unresolved issues for supporting documents submitted."]),
    recommendedNextActions: Object.freeze(["Match supporting documents to unresolved discrepancy items.", "Preserve copies of all documents submitted during discussion."])
  }),
  PAN_REPLY_SUPPORTING_DOCUMENTS: Object.freeze({
    safeWarnings: Object.freeze(["Preserve proof of filing for PAN reply supporting documents."]),
    recommendedNextActions: Object.freeze(["Match each supporting document to the issue-by-issue reply matrix.", "Capture the complete attachment list.", "Preserve proof of filing."])
  }),
  FAN_FLD_PROTEST_SUPPORTING_DOCUMENTS: Object.freeze({
    safeWarnings: Object.freeze(["Preserve proof of filing for FAN/FLD protest supporting documents."]),
    recommendedNextActions: Object.freeze(["Match each supporting document to the issue-by-issue protest matrix.", "Capture the complete attachment list.", "Preserve proof of filing."])
  }),
  REINVESTIGATION_SUPPORTING_DOCUMENTS: Object.freeze({
    safeWarnings: Object.freeze(["Track the supporting-document submission period for reinvestigation."]),
    recommendedNextActions: Object.freeze(["Match each supporting document to the reinvestigation issues.", "Capture the complete attachment list.", "Preserve proof of filing and attachment submission."])
  }),
  FDDA_APPEAL_SUPPORTING_DOCUMENTS: Object.freeze({
    safeWarnings: Object.freeze(["Preserve proof of filing for FDDA appeal-watch supporting documents."]),
    recommendedNextActions: Object.freeze(["Match each supporting document to the appeal-watch matrix.", "Capture the complete attachment list.", "Preserve proof of filing."])
  }),
  TERMINATION_LETTER_SUPPORTING_DOCUMENTS: Object.freeze({
    safeWarnings: Object.freeze([
      "Match closure scope to the covered LOA/eLA, taxable period, and tax types.",
      "Do not treat this as blanket or permanent clearance for unrelated periods, tax types, fraud, false returns, or refund issues."
    ]),
    recommendedNextActions: Object.freeze(["Preserve payment proof and related records permanently.", "Match the termination letter to its covered LOA/eLA, period, and tax types."])
  }),
  UNKNOWN_DOCUMENT_REQUEST: Object.freeze({
    safeWarnings: Object.freeze(["This scaffold could not confidently classify the document request type from the information provided."]),
    recommendedNextActions: Object.freeze(["Provide additional details or select a specific request type if known.", "Escalate to professional review."])
  })
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
  if (Array.isArray(value)) return value.map((item) => deepClone(item));
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) out[key] = deepClone(value[key]);
    return out;
  }
  return value;
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return [];
}

function dedupe(arr) {
  return [...new Set(arr)];
}

function normalizeSourceCard(card) {
  const src = isPlainObject(card) ? card : {};
  const authorityTier = ALLOWED_SOURCE_CARD_AUTHORITY_TIERS.includes(src.authorityTier) ? src.authorityTier : "procedural_design_reference";
  return {
    label: isNonBlankString(src.label) ? src.label.trim() : "Procedural design reference",
    sourceType: isNonBlankString(src.sourceType) ? src.sourceType.trim() : "procedural design reference",
    authorityTier,
    note: isNonBlankString(src.note) ? src.note.trim() : "Design/reference card only; no live authority verification performed."
  };
}

function normalizeDocumentItemInput(item) {
  const src = isPlainObject(item) ? item : {};
  const status = SUPPORTED_DOCUMENT_COMPLIANCE_ITEM_STATUSES.includes(src.status) ? src.status : "unknown";
  const substituteProofContext = ["unavailable", "non_existent", "not_applicable"].includes(src.substituteProofContext) ? src.substituteProofContext : "unavailable";
  return {
    itemName: isNonBlankString(src.itemName) ? src.itemName.trim() : "Unclassified requested item",
    itemCategory: isNonBlankString(src.itemCategory) ? src.itemCategory.trim() : null,
    requestedByBir: src.requestedByBir !== false,
    status,
    documentsAvailable: normalizeStringArray(src.documentsAvailable),
    documentsMissing: normalizeStringArray(src.documentsMissing),
    substituteProofOptions: normalizeStringArray(src.substituteProofOptions),
    substituteProofContext,
    explanationNeeded: src.explanationNeeded === true,
    reconciliationNeeded: src.reconciliationNeeded === true,
    certifiedCopyNeeded: src.certifiedCopyNeeded === true,
    onPremiseReviewNeeded: src.onPremiseReviewNeeded === true,
    birClarificationNeeded: src.birClarificationNeeded === true,
    riskLevel: ["low", "medium", "high", "critical"].includes(src.riskLevel) ? src.riskLevel : "unknown"
  };
}

/**
 * Recursively scans a value for prohibited BIR document compliance/
 * transmittal claim phrases. Pure, synchronous, never mutates input,
 * performs no I/O.
 *
 * @param {*} value
 * @returns {{hasProhibitedClaims: boolean, matches: string[]}}
 */
export function detectProhibitedBirDocumentComplianceClaims(value) {
  const matches = [];

  function walk(node) {
    if (typeof node === "string") {
      const lower = node.toLowerCase();
      for (const phrase of PROHIBITED_CLAIM_PHRASES) {
        if (lower.includes(phrase)) matches.push(phrase);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item));
      return;
    }
    if (node && typeof node === "object") {
      for (const key of Object.keys(node)) walk(node[key]);
    }
  }

  walk(value);

  return { hasProhibitedClaims: matches.length > 0, matches };
}

function detectRealDataLeak(value) {
  const raw = JSON.stringify(value);
  const upper = raw.toUpperCase();
  const matches = [];
  for (const fragment of REAL_TAXPAYER_NAME_FRAGMENTS) if (upper.includes(fragment)) matches.push(`taxpayer_name:${fragment}`);
  for (const fragment of REAL_OFFICER_NAME_FRAGMENTS) if (upper.includes(fragment)) matches.push(`officer_name:${fragment}`);
  for (const fragment of REAL_ELA_NUMBER_FRAGMENTS) if (raw.includes(fragment)) matches.push(`ela_number:${fragment}`);
  for (const fragment of REAL_AUDIT_CASE_NUMBER_FRAGMENTS) if (raw.includes(fragment)) matches.push(`audit_case_number:${fragment}`);
  for (const fragment of REAL_ASSESSMENT_AMOUNT_FRAGMENTS) if (raw.includes(fragment)) matches.push(`assessment_amount:${fragment}`);
  return { hasRealDataLeak: matches.length > 0, matches };
}

function containsRealDataFragments(text) {
  const upper = (text || "").toUpperCase();
  for (const fragment of REAL_TAXPAYER_NAME_FRAGMENTS) if (upper.includes(fragment)) return "taxpayer name";
  for (const fragment of REAL_OFFICER_NAME_FRAGMENTS) if (upper.includes(fragment)) return "BIR officer name";
  for (const fragment of REAL_ELA_NUMBER_FRAGMENTS) if ((text || "").includes(fragment)) return "LOA/eLA number";
  for (const fragment of REAL_AUDIT_CASE_NUMBER_FRAGMENTS) if ((text || "").includes(fragment)) return "audit case number";
  for (const fragment of REAL_ASSESSMENT_AMOUNT_FRAGMENTS) if ((text || "").includes(fragment)) return "assessment amount";
  return null;
}

/**
 * Normalizes candidate BIR document compliance/transmittal input into a
 * defensive, fully-shaped object. Never mutates input; never throws.
 * Always forces the safe scaffold-only option values regardless of caller
 * input -- validateBirDocumentComplianceTransmittalInput() is the gate
 * that flags an attempt to request unsafe option values.
 *
 * @param {*} input
 * @returns {object}
 */
export function normalizeBirDocumentComplianceTransmittalInput(input) {
  const src = isPlainObject(input) ? input : {};
  const contextSrc = isPlainObject(src.workflowContext) ? src.workflowContext : {};
  const itemsSrc = Array.isArray(src.requestedDocuments) ? src.requestedDocuments : [];
  const requestType = typeof src.requestType === "string" && SUPPORTED_DOCUMENT_COMPLIANCE_REQUEST_TYPES.includes(src.requestType) ? src.requestType : null;

  return {
    userQuery: typeof src.userQuery === "string" ? src.userQuery.trim() : "",
    requestType,
    workflowContext: {
      noticeType: isNonBlankString(contextSrc.noticeType) ? contextSrc.noticeType.trim() : null,
      noticeStage: isNonBlankString(contextSrc.noticeStage) ? contextSrc.noticeStage.trim() : null,
      taxablePeriod: isNonBlankString(contextSrc.taxablePeriod) ? contextSrc.taxablePeriod.trim() : null,
      taxTypes: normalizeStringArray(contextSrc.taxTypes),
      receiptDateKnown: contextSrc.receiptDateKnown === true,
      deadlineSignalsKnown: contextSrc.deadlineSignalsKnown === true,
      preSubpoenaReminderReceived: contextSrc.preSubpoenaReminderReceived === true,
      subpoenaReceived: contextSrc.subpoenaReceived === true,
      additionalRequest: contextSrc.additionalRequest === true,
      voluminousRecords: contextSrc.voluminousRecords === true,
      onPremiseReviewPotential: contextSrc.onPremiseReviewPotential === true,
      certifiedCopySubmissionPotential: contextSrc.certifiedCopySubmissionPotential === true,
      birStampedSubmissionAvailable: contextSrc.birStampedSubmissionAvailable === true,
      emailTrailAvailable: contextSrc.emailTrailAvailable === true,
      receivingProofAvailable: contextSrc.receivingProofAvailable === true
    },
    requestedDocuments: itemsSrc.map((item) => normalizeDocumentItemInput(item)),
    options: {
      scaffoldOnly: true,
      runtimeActive: false,
      allowLegalConclusion: false,
      allowLiveRetrieval: false,
      allowRealTaxpayerData: false,
      generateFilingReadyDocument: false,
      automaticSubmission: false
    },
    sourceCards: (Array.isArray(src.sourceCards) ? src.sourceCards : []).map((card) => normalizeSourceCard(card))
  };
}

/**
 * Validates candidate BIR document compliance/transmittal input. Never
 * throws. Rejects missing input, missing userQuery+requestedDocuments, an
 * unsupported requestType or requested-document status, any attempt to
 * request unsafe option values, filing-ready or automatic-submission
 * requests, source cards claiming completed verification/final legal
 * conclusion, requested-document items claiming guaranteed BIR acceptance
 * or a final legal conclusion, and any known real taxpayer/officer name,
 * real LOA/eLA/audit-case number, or exact real assessment amount from the
 * private reference corpus.
 *
 * @param {*} input
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateBirDocumentComplianceTransmittalInput(input) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(input)) {
    errors.push("input must be a plain object");
    return { valid: false, errors, warnings };
  }

  const userQuery = typeof input.userQuery === "string" ? input.userQuery.trim() : "";
  const requestedDocuments = Array.isArray(input.requestedDocuments) ? input.requestedDocuments : [];
  if (userQuery.length === 0 && requestedDocuments.length === 0) {
    errors.push("userQuery and requestedDocuments must not both be missing/empty");
  }

  if (input.requestType !== undefined && !SUPPORTED_DOCUMENT_COMPLIANCE_REQUEST_TYPES.includes(input.requestType)) {
    errors.push(`unsupported requestType: ${JSON.stringify(input.requestType)}`);
  }

  requestedDocuments.forEach((item, index) => {
    if (isPlainObject(item) && item.status !== undefined && !SUPPORTED_DOCUMENT_COMPLIANCE_ITEM_STATUSES.includes(item.status)) {
      errors.push(`requestedDocuments[${index}] unsupported status: ${JSON.stringify(item.status)}`);
    }
  });

  const options = isPlainObject(input.options) ? input.options : {};
  if (options.runtimeActive === true) errors.push("runtimeActive must not be true");
  if (options.scaffoldOnly === false) errors.push("scaffoldOnly must not be false");
  if (options.allowLegalConclusion === true) errors.push("allowLegalConclusion must not be true");
  if (options.allowLiveRetrieval === true) errors.push("allowLiveRetrieval must not be true");
  if (options.allowRealTaxpayerData === true) errors.push("allowRealTaxpayerData must not be true");
  if (options.generateFilingReadyDocument === true) errors.push("generateFilingReadyDocument must not be true");
  if (options.automaticSubmission === true) errors.push("automaticSubmission must not be true");

  const filingReadyRequestPattern =
    /generate\s+(?:a\s+)?filing-ready|prepare\s+(?:a\s+)?filing-ready|filing-ready\s+(?:letter|email|affidavit|certification|protest|document|submission)|draft\s+(?:a\s+)?(?:final\s+)?(?:letter|email|affidavit|certification|protest)/i;
  if (filingReadyRequestPattern.test(userQuery)) errors.push("input must not request a filing-ready letter/email/affidavit/certification/protest");

  const automaticSubmissionRequestPattern = /automatically\s+submit|auto[- ]submit|submit\s+(?:this|it|these)\s+automatically/i;
  if (automaticSubmissionRequestPattern.test(userQuery)) errors.push("input must not request automatic BIR submission");

  const sourceCards = Array.isArray(input.sourceCards) ? input.sourceCards : [];
  const verificationClaimPattern = /final authority verification is complete|official verification complete|verification (?:is |has been )?complete|officially verified/i;
  const legalConclusionClaimPattern = /final legal conclusion|final legal opinion|official legal advice|legally conclusive/i;
  sourceCards.forEach((card, index) => {
    if (isPlainObject(card)) {
      const combined = `${card.label || ""} ${card.note || ""}`;
      if (verificationClaimPattern.test(combined)) errors.push(`sourceCards[${index}] must not claim final authority verification is complete`);
      if (legalConclusionClaimPattern.test(combined)) errors.push(`sourceCards[${index}] must not claim a final legal conclusion`);
    }
  });

  const guaranteedAcceptancePattern = /guarantee[ds]?\s*(?:acceptance|to\s*be\s*accepted)/i;
  const finalConclusionPattern = /\b(?:is|are)\s+(?:void|invalid|cancelled|final|legally conclusive)\b/i;
  requestedDocuments.forEach((item, index) => {
    if (isPlainObject(item)) {
      const combined = `${item.itemName || ""} ${(Array.isArray(item.documentsAvailable) ? item.documentsAvailable.join(" ") : "")} ${(Array.isArray(item.documentsMissing) ? item.documentsMissing.join(" ") : "")}`;
      if (guaranteedAcceptancePattern.test(combined)) errors.push(`requestedDocuments[${index}] must not claim guaranteed acceptance by BIR`);
      if (finalConclusionPattern.test(combined)) errors.push(`requestedDocuments[${index}] must not claim a final legal conclusion`);
    }
  });

  const combinedRaw = `${input.userQuery || ""} ${JSON.stringify(input.workflowContext || {})} ${JSON.stringify(input.requestedDocuments || [])}`;
  const realDataHit = containsRealDataFragments(combinedRaw);
  if (realDataHit) errors.push(`input must not contain a known real ${realDataHit} from uploaded materials`);

  return { valid: errors.length === 0, errors, warnings };
}

function explanationTypeForStatus(status, substituteProofContext) {
  switch (status) {
    case "to_follow":
      return "to_follow";
    case "not_applicable":
      return "not_applicable";
    case "unavailable":
      return "unavailable";
    case "non_existent":
      return "non_existent";
    case "substitute_proof_available":
      return substituteProofContext;
    case "requires_reconciliation":
      return "requires_reconciliation";
    case "requires_bir_clarification":
      return "requires_clarification";
    default:
      return "none";
  }
}

function buildDocumentMatrixRow(item) {
  let receivingProofNeeded = false;
  let withoutPrejudiceLanguageNeeded = false;
  let certifiedCopyNeeded = item.certifiedCopyNeeded;
  let onPremiseReviewNeeded = item.onPremiseReviewNeeded;
  let reconciliationNeeded = item.reconciliationNeeded;
  let birClarificationNeeded = item.birClarificationNeeded;
  let explanationNeeded = item.explanationNeeded;
  let recommendedSafeAction = [];
  let riskReason = "";

  switch (item.status) {
    case "provided":
      receivingProofNeeded = true;
      recommendedSafeAction = ["Include this item in the itemized transmittal schedule.", "Preserve BIR-stamped or email proof of submission."];
      riskReason = "documentary support is available; preserve proof of submission";
      break;
    case "to_follow":
      recommendedSafeAction = ["List this item with a target submission date for review.", "Preserve proof of the later submission."];
      riskReason = "document is not yet available; track submission deadline";
      break;
    case "not_applicable":
      explanationNeeded = true;
      withoutPrejudiceLanguageNeeded = true;
      recommendedSafeAction = [
        "Prepare a factual explanation of non-applicability.",
        "Support with AFS note, tax return, registration date, activity status, or official record where applicable."
      ];
      riskReason = "item does not apply on the stated facts; a factual explanation is required";
      break;
    case "unavailable":
      explanationNeeded = true;
      withoutPrejudiceLanguageNeeded = true;
      recommendedSafeAction = ["Prepare a factual explanation of unavailability.", "Identify substitute proof options for professional review."];
      riskReason = "documentary support is unavailable; escalate to professional review if material";
      break;
    case "non_existent":
      explanationNeeded = true;
      withoutPrejudiceLanguageNeeded = true;
      recommendedSafeAction = [
        "Prepare a factual explanation that the document does not exist.",
        "Prepare an affidavit/certification/substitute proof plan for professional review.",
        "Ask BIR to identify the specific document and basis if it insists the document exists."
      ];
      riskReason = "the document does not exist; do not fabricate it, prepare substitute proof instead";
      break;
    case "substitute_proof_available":
      withoutPrejudiceLanguageNeeded = true;
      recommendedSafeAction = ["Prepare substitute proof (affidavit, management certification, AFS note, tax return support, official record, or third-party confirmation) for professional review."];
      riskReason = "substitute proof identified; escalate for professional review before submission";
      break;
    case "requires_reconciliation":
      reconciliationNeeded = true;
      recommendedSafeAction = ["Reconcile per-books vs. per-return vs. attachment vs. third-party support before submission."];
      riskReason = "documentary figures require reconciliation before submission";
      break;
    case "requires_certified_copy":
      certifiedCopyNeeded = true;
      receivingProofNeeded = true;
      recommendedSafeAction = ["Track certified-copy submission and preserve proof of certification."];
      riskReason = "a certified copy is required before submission";
      break;
    case "requires_on_premise_review":
      onPremiseReviewNeeded = true;
      recommendedSafeAction = ["Consider on-premise review for voluminous books/records.", "Do not assume books/records can be withheld entirely from BIR examination."];
      riskReason = "voluminous records may require on-premise review";
      break;
    case "requires_bir_clarification":
      birClarificationNeeded = true;
      recommendedSafeAction = ["Ask BIR to identify the specific document, audit issue, relevance, necessity, scope, and basis.", "Do not refuse compliance outright while clarification is pending."];
      riskReason = "request scope is unclear; clarification is needed before full compliance";
      break;
    default:
      recommendedSafeAction = ["Classify this item and escalate to professional review."];
      riskReason = "insufficient information to classify this item";
  }

  return {
    itemName: item.itemName,
    itemCategory: item.itemCategory,
    requestedByBir: item.requestedByBir,
    status: item.status,
    documentsAvailable: [...item.documentsAvailable],
    documentsMissing: [...item.documentsMissing],
    substituteProofOptions: [...item.substituteProofOptions],
    explanationNeeded,
    explanationType: explanationTypeForStatus(item.status, item.substituteProofContext),
    reconciliationNeeded,
    certifiedCopyNeeded,
    onPremiseReviewNeeded,
    birClarificationNeeded,
    receivingProofNeeded,
    withoutPrejudiceLanguageNeeded,
    riskLevel: item.riskLevel,
    riskReason,
    recommendedSafeAction,
    prohibitedOverreach: ["Do not claim this item guarantees BIR acceptance.", "Do not treat this matrix entry as a final legal conclusion."],
    humanReviewRequired: true
  };
}

function buildSubstituteProofPlan(matrix) {
  const affidavitPotentialItems = [];
  const managementCertificationPotentialItems = [];
  const afsNotePotentialItems = [];
  const taxReturnSupportPotentialItems = [];
  const officialRecordPotentialItems = [];
  const thirdPartyConfirmationPotentialItems = [];

  for (const row of matrix) {
    if (!["unavailable", "non_existent", "substitute_proof_available", "not_applicable"].includes(row.status)) continue;
    const optionsText = row.substituteProofOptions.join(" ").toLowerCase();
    const hasSpecificOption = optionsText.length > 0;
    if (!hasSpecificOption || optionsText.includes("affidavit")) affidavitPotentialItems.push(row.itemName);
    if (optionsText.includes("certification") || optionsText.includes("management")) managementCertificationPotentialItems.push(row.itemName);
    if (optionsText.includes("afs")) afsNotePotentialItems.push(row.itemName);
    if (optionsText.includes("tax return")) taxReturnSupportPotentialItems.push(row.itemName);
    if (optionsText.includes("official record")) officialRecordPotentialItems.push(row.itemName);
    if (optionsText.includes("third-party") || optionsText.includes("third party")) thirdPartyConfirmationPotentialItems.push(row.itemName);
  }

  return {
    affidavitPotentialItems: dedupe(affidavitPotentialItems),
    managementCertificationPotentialItems: dedupe(managementCertificationPotentialItems),
    afsNotePotentialItems: dedupe(afsNotePotentialItems),
    taxReturnSupportPotentialItems: dedupe(taxReturnSupportPotentialItems),
    officialRecordPotentialItems: dedupe(officialRecordPotentialItems),
    thirdPartyConfirmationPotentialItems: dedupe(thirdPartyConfirmationPotentialItems)
  };
}

function buildReceivingProofTracker(workflowContext, matrix) {
  const anyReceivingProofNeeded = matrix.some((row) => row.receivingProofNeeded);
  const birStampedSubmission = workflowContext.birStampedSubmissionAvailable === true;
  const emailTrail = workflowContext.emailTrailAvailable === true;
  const receivingProofAvailable = workflowContext.receivingProofAvailable === true;

  const proofGapWarnings = [];
  if (anyReceivingProofNeeded && !birStampedSubmission && !emailTrail && !receivingProofAvailable) {
    proofGapWarnings.push("No BIR-stamped, email, or other receiving proof has been confirmed yet for items requiring proof of submission.");
  }

  return {
    birStampedSubmission,
    emailTrail,
    courierProof: false,
    uploadConfirmation: false,
    receivingOfficerOrOfficeCaptured: birStampedSubmission || emailTrail,
    dateTimeCaptured: birStampedSubmission || emailTrail,
    attachmentListCaptured: matrix.length > 0,
    proofGapWarnings
  };
}

function isChecklistFamily(requestType) {
  return ["LOA_INITIAL_CHECKLIST", "NOTICE_FOR_PRESENTATION_SUBMISSION", "CHECKLIST_OF_REQUIREMENTS"].includes(requestType);
}

function buildScopeAndAuthorityChecks(requestType, workflowContext, matrix) {
  const isAdditionalRequest = requestType === "ADDITIONAL_DOCUMENT_REQUEST";
  const checklistFamily = isChecklistFamily(requestType);
  const voluminous = workflowContext.voluminousRecords === true || matrix.some((row) => row.onPremiseReviewNeeded);

  return {
    standardizedChecklistCheckNeeded: checklistFamily,
    additionalRequestLimitCheckNeeded: isAdditionalRequest,
    relevanceCheckNeeded: isAdditionalRequest,
    necessityCheckNeeded: isAdditionalRequest,
    auditScopeCheckNeeded: checklistFamily || isAdditionalRequest,
    explanationDocumentationCheckNeeded: isAdditionalRequest,
    voluminousRecordsCheckNeeded: voluminous,
    onPremiseExaminationPotential: workflowContext.onPremiseReviewPotential === true || matrix.some((row) => row.onPremiseReviewNeeded),
    certifiedCopySubmissionPotential: workflowContext.certifiedCopySubmissionPotential === true || matrix.some((row) => row.certifiedCopyNeeded),
    preSubpoenaEscalationRisk: requestType === "PRE_SUBPOENA_REMINDER",
    subpoenaEscalationRisk: requestType === "SUBPOENA_DUCES_TECUM"
  };
}

function buildTransmittalPlan(requestType, workflowContext, matrix) {
  const anyClarificationNeeded = matrix.some((row) => row.birClarificationNeeded);
  const anyToFollow = matrix.some((row) => row.status === "to_follow");
  const anyWithoutPrejudice = matrix.some((row) => row.withoutPrejudiceLanguageNeeded);

  const base = {
    responseType: "DOCUMENT_TRANSMITTAL_MATRIX",
    transmittalModeOptions: ["in-person filing with receiving stamp", "registered mail", "email submission with acknowledgment"],
    itemizedScheduleNeeded: true,
    receivingProofRequired: true,
    birStampedCopyRequired: true,
    emailAcknowledgmentRequired: true,
    authorizedRepresentativeCheckNeeded: true,
    deadlineTrackingNeeded: workflowContext.deadlineSignalsKnown === true || anyToFollow,
    withoutPrejudiceLanguageNeeded: anyWithoutPrejudice,
    clarificationRequestNeeded: anyClarificationNeeded,
    extensionRequestPotential: anyToFollow,
    clientStatusUpdateRecommended: true
  };

  switch (requestType) {
    case "LOA_INITIAL_CHECKLIST":
    case "NOTICE_FOR_PRESENTATION_SUBMISSION":
    case "CHECKLIST_OF_REQUIREMENTS":
      return base;
    case "ADDITIONAL_DOCUMENT_REQUEST":
      return { ...base, responseType: anyClarificationNeeded ? "REQUEST_FOR_CLARIFICATION" : "ITEMIZED_STATUS_RESPONSE" };
    case "PRE_SUBPOENA_REMINDER":
      return { ...base, responseType: "ITEMIZED_STATUS_RESPONSE" };
    case "SUBPOENA_DUCES_TECUM":
      return { ...base, responseType: "HUMAN_REVIEW_REQUIRED" };
    case "NOD_DOD_SUPPORTING_DOCUMENTS":
    case "PAN_REPLY_SUPPORTING_DOCUMENTS":
    case "FAN_FLD_PROTEST_SUPPORTING_DOCUMENTS":
    case "REINVESTIGATION_SUPPORTING_DOCUMENTS":
    case "FDDA_APPEAL_SUPPORTING_DOCUMENTS":
      return { ...base, responseType: "DOCUMENT_TRANSMITTAL_MATRIX", deadlineTrackingNeeded: true };
    case "TERMINATION_LETTER_SUPPORTING_DOCUMENTS":
      return { ...base, responseType: "RECEIVING_PROOF_TRACKER", withoutPrejudiceLanguageNeeded: true };
    default:
      return { ...base, responseType: "HUMAN_REVIEW_REQUIRED" };
  }
}

/**
 * Builds a full BIR document compliance/transmittal result for the given
 * (raw or normalized) input. Never throws. Always returns the full result
 * shape regardless of input validity -- callers should call
 * validateBirDocumentComplianceTransmittalInput() beforehand to gate
 * whether to proceed. Performs no I/O, no network calls, no live
 * retrieval, and generates no filing-ready document; creates a structured
 * compliance/transmittal plan only.
 *
 * @param {*} input
 * @returns {object}
 */
export function createBirDocumentComplianceTransmittalResult(input) {
  const normalized = normalizeBirDocumentComplianceTransmittalInput(input);
  const items = normalized.requestedDocuments.length > 0 ? normalized.requestedDocuments : [normalizeDocumentItemInput({ status: "unknown" })];

  const documentMatrix = items.map((item) => buildDocumentMatrixRow(item));
  const requestType = normalized.requestType || "UNKNOWN_DOCUMENT_REQUEST";
  const guidance = REQUEST_TYPE_GUIDANCE[requestType] || REQUEST_TYPE_GUIDANCE.UNKNOWN_DOCUMENT_REQUEST;

  const transmittalPlan = buildTransmittalPlan(requestType, normalized.workflowContext, documentMatrix);
  const substituteProofPlan = buildSubstituteProofPlan(documentMatrix);
  const receivingProofTracker = buildReceivingProofTracker(normalized.workflowContext, documentMatrix);
  const scopeAndAuthorityChecks = buildScopeAndAuthorityChecks(requestType, normalized.workflowContext, documentMatrix);

  const providedCount = documentMatrix.filter((row) => row.status === "provided").length;
  const toFollowCount = documentMatrix.filter((row) => row.status === "to_follow").length;
  const notApplicableCount = documentMatrix.filter((row) => row.status === "not_applicable").length;
  const unavailableCount = documentMatrix.filter((row) => row.status === "unavailable").length;
  const nonExistentCount = documentMatrix.filter((row) => row.status === "non_existent").length;
  const substituteProofCount = documentMatrix.filter((row) => row.status === "substitute_proof_available").length;
  const clarificationNeededCount = documentMatrix.filter((row) => row.birClarificationNeeded).length;
  const reconciliationNeededCount = documentMatrix.filter((row) => row.reconciliationNeeded).length;
  const certifiedCopyNeededCount = documentMatrix.filter((row) => row.certifiedCopyNeeded).length;
  const onPremiseReviewNeededCount = documentMatrix.filter((row) => row.onPremiseReviewNeeded).length;
  const highRiskItemCount = documentMatrix.filter((row) => row.riskLevel === "high" || row.riskLevel === "critical").length;
  const hasKnownStatuses = normalized.requestedDocuments.some((item) => item.status !== "unknown");
  const confidence = normalized.requestType ? "high" : hasKnownStatuses ? "medium" : "low";

  const complianceSummary = {
    requestType,
    totalItems: documentMatrix.length,
    providedCount,
    toFollowCount,
    notApplicableCount,
    unavailableCount,
    nonExistentCount,
    substituteProofCount,
    clarificationNeededCount,
    reconciliationNeededCount,
    certifiedCopyNeededCount,
    onPremiseReviewNeededCount,
    highRiskItemCount,
    humanReviewRequired: true,
    confidence
  };

  const safeWarnings = [...guidance.safeWarnings];
  const recommendedNextActions = [...guidance.recommendedNextActions];

  const combinedSourceCards = [...deepClone(normalized.sourceCards), ...deepClone(BASE_SOURCE_CARDS)];

  return {
    phase: "09P",
    mode: BIR_DOCUMENT_COMPLIANCE_TRANSMITTAL_MODE_ID,
    version: PHASE_09P_BIR_DOCUMENT_COMPLIANCE_TRANSMITTAL_VERSION,
    runtimeActive: false,
    complianceSummary,
    documentMatrix,
    transmittalPlan,
    substituteProofPlan,
    receivingProofTracker,
    scopeAndAuthorityChecks,
    safeWarnings,
    recommendedNextActions,
    prohibitedConclusions: [...PROHIBITED_CONCLUSION_LABELS],
    sourceCards: combinedSourceCards,
    humanReviewNotice: STANDARD_HUMAN_REVIEW_NOTICE,
    metadata: {
      scaffoldOnly: true,
      legalConclusionProvided: false,
      liveRetrievalPerformed: false,
      externalSearchPerformed: false,
      realTaxpayerDataUsed: false,
      filingReadyDocumentGenerated: false,
      automaticSubmission: false,
      finalOutcomeGuaranteed: false
    }
  };
}

/**
 * Validates a candidate BIR document compliance/transmittal result object.
 * Never throws.
 *
 * @param {*} result
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateBirDocumentComplianceTransmittalResult(result) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(result)) {
    errors.push("result must be a plain object");
    return { valid: false, errors, warnings };
  }

  if (!isNonBlankString(result.phase)) errors.push("phase is required");
  if (!isNonBlankString(result.mode)) errors.push("mode is required");
  if (result.runtimeActive !== false) errors.push("runtimeActive must be false");

  if (!isPlainObject(result.complianceSummary)) errors.push("complianceSummary is required");

  if (!Array.isArray(result.documentMatrix)) {
    errors.push("documentMatrix must be an array");
  } else if (result.documentMatrix.length === 0) {
    errors.push("documentMatrix must not be empty");
  } else {
    result.documentMatrix.forEach((row, index) => {
      if (!isPlainObject(row)) {
        errors.push(`documentMatrix[${index}] must be an object`);
        return;
      }
      if (!SUPPORTED_DOCUMENT_COMPLIANCE_ITEM_STATUSES.includes(row.status)) errors.push(`documentMatrix[${index}] unsupported status: ${row.status}`);
      if (!["low", "medium", "high", "critical", "unknown"].includes(row.riskLevel)) errors.push(`documentMatrix[${index}] unsupported riskLevel: ${row.riskLevel}`);
      if (row.humanReviewRequired !== true) errors.push(`documentMatrix[${index}] humanReviewRequired must be true`);
    });
  }

  if (!isPlainObject(result.transmittalPlan)) errors.push("transmittalPlan is required");
  if (!isPlainObject(result.substituteProofPlan)) errors.push("substituteProofPlan is required");
  if (!isPlainObject(result.receivingProofTracker)) errors.push("receivingProofTracker is required");
  if (!isPlainObject(result.scopeAndAuthorityChecks)) errors.push("scopeAndAuthorityChecks is required");
  if (!Array.isArray(result.safeWarnings)) errors.push("safeWarnings must be an array");
  if (!Array.isArray(result.recommendedNextActions)) errors.push("recommendedNextActions must be an array");
  if (!Array.isArray(result.prohibitedConclusions)) errors.push("prohibitedConclusions must be an array");
  if (!Array.isArray(result.sourceCards)) {
    errors.push("sourceCards is required");
  } else if (result.sourceCards.length === 0) {
    errors.push("sourceCards must not be empty");
  } else {
    const verificationClaimPattern = /verification (?:is |has been )?complete|officially verified|final authority verification/i;
    result.sourceCards.forEach((card, index) => {
      if (isPlainObject(card)) {
        if (!ALLOWED_SOURCE_CARD_AUTHORITY_TIERS.includes(card.authorityTier)) errors.push(`sourceCards[${index}] unsupported authorityTier: ${card.authorityTier}`);
        if (verificationClaimPattern.test(`${card.label || ""} ${card.note || ""}`)) errors.push(`sourceCards[${index}] must not claim completed authority verification`);
      }
    });
  }
  if (!isNonBlankString(result.humanReviewNotice)) errors.push("humanReviewNotice is required");

  const metadata = isPlainObject(result.metadata) ? result.metadata : {};
  if (metadata.scaffoldOnly !== true) errors.push("metadata.scaffoldOnly must be true");
  if (metadata.legalConclusionProvided !== false) errors.push("metadata.legalConclusionProvided must be false");
  if (metadata.liveRetrievalPerformed !== false) errors.push("metadata.liveRetrievalPerformed must be false");
  if (metadata.externalSearchPerformed !== false) errors.push("metadata.externalSearchPerformed must be false");
  if (metadata.realTaxpayerDataUsed !== false) errors.push("metadata.realTaxpayerDataUsed must be false");
  if (metadata.filingReadyDocumentGenerated !== false) errors.push("metadata.filingReadyDocumentGenerated must be false");
  if (metadata.automaticSubmission !== false) errors.push("metadata.automaticSubmission must be false");
  if (metadata.finalOutcomeGuaranteed !== false) errors.push("metadata.finalOutcomeGuaranteed must be false");

  const claimCheck = detectProhibitedBirDocumentComplianceClaims(result);
  if (claimCheck.hasProhibitedClaims) errors.push(`prohibited claims detected in result: ${claimCheck.matches.join(", ")}`);

  const leakCheck = detectRealDataLeak(result);
  if (leakCheck.hasRealDataLeak) errors.push(`real data leak detected in result: ${leakCheck.matches.join(", ")}`);

  return { valid: errors.length === 0, errors, warnings };
}
