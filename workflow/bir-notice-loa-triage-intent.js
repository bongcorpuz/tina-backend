// FILE: workflow/bir-notice-loa-triage-intent.js
// PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1
//
// Pure, dependency-free, standalone scaffold classifying Philippine BIR
// audit-related documents/notices (LOA/eLA, replacement eLA, consolidated
// eLA, Mission Order, TVN, document checklist/requests, pre-subpoena/
// subpoena, NOD/DOD, PAN, FAN/FLD, FDDA, protest, action on protest,
// termination letter, VAT non-consolidation, written conformity, waiver of
// prescription, VATAS/LTVAU and VAT-refund transition) into safe workflow
// intent classes: notice type, procedural stage, and routing targets. This
// module has NO I/O, NO network calls, NO Supabase/OpenAI/Google Drive/n8n/
// Firecrawl/Crawlee/MCP dependency, NO web search, NO browser automation,
// NO OCR, NO filesystem access, NO process.env dependency, NO
// Date.now/randomness, and NO side effects. It imports nothing from any
// other module in this repository. It performs no live authority retrieval,
// stores nothing, mutates no global state, and is not wired into
// ask-handler.js, pipeline.js, server.js, routes, authentication, or the
// frontend. It classifies and routes; it does not decide. It never produces
// a final legal conclusion and never claims a notice, LOA, eLA, replacement
// eLA, PAN, FAN, FLD, FDDA, assessment, protest action, or BIR audit action
// is void, invalid, cancelled, final, enforceable, or legally conclusive.

"use strict";

export const PHASE_09M_BIR_NOTICE_LOA_TRIAGE_INTENT_VERSION = "PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1";

export const BIR_NOTICE_LOA_TRIAGE_INTENT_MODE_ID = "bir_notice_loa_triage_intent";

export const SUPPORTED_BIR_NOTICE_TYPES = Object.freeze([
  "BIR_LOA_FULL_EXAMINATION",
  "BIR_ELECTRONIC_LOA",
  "BIR_REPLACEMENT_ELA",
  "BIR_CONSOLIDATED_ELA",
  "BIR_MISSION_ORDER",
  "BIR_TAX_VERIFICATION_NOTICE",
  "BIR_NOTICE_PRESENTATION_SUBMISSION_DOCUMENTS",
  "BIR_CHECKLIST_REQUIREMENTS_PRESENTATION_SUBMISSION",
  "BIR_INITIAL_DOCUMENT_REQUEST",
  "BIR_ADDITIONAL_DOCUMENT_REQUEST",
  "BIR_PRE_SUBPOENA_DUCES_TECUM_REMINDER",
  "BIR_SUBPOENA_DUCES_TECUM",
  "BIR_NOD",
  "BIR_DOD",
  "BIR_PAN",
  "BIR_CONSOLIDATED_PAN",
  "BIR_FAN",
  "BIR_CONSOLIDATED_FAN",
  "BIR_FLD",
  "BIR_FDDA",
  "BIR_PROTEST_REQUEST_RECONSIDERATION",
  "BIR_PROTEST_REQUEST_REINVESTIGATION",
  "BIR_ACTION_ON_PROTEST",
  "BIR_AUDIT_TERMINATION_LETTER",
  "BIR_REQUEST_FOR_NON_CONSOLIDATION_VAT",
  "BIR_WRITTEN_CONFORMITY_TO_CONSOLIDATION",
  "BIR_WAIVER_OF_PRESCRIPTION",
  "BIR_VATAS_LTVAU_TRANSITION_NOTICE",
  "BIR_VAT_REFUND_TRANSITION_NOTICE",
  "UNKNOWN_BIR_NOTICE"
]);

export const SUPPORTED_BIR_NOTICE_STAGES = Object.freeze([
  "AUDIT_AUTHORITY",
  "DOCUMENT_REQUEST",
  "DOCUMENT_ESCALATION",
  "DISCREPANCY_DISCUSSION",
  "PRE_ASSESSMENT",
  "FINAL_ASSESSMENT",
  "ADMINISTRATIVE_PROTEST",
  "POST_PROTEST",
  "APPEAL_WATCH",
  "AUDIT_CLOSURE",
  "CONSOLIDATION",
  "PRESCRIPTION",
  "VAT_TRANSITION",
  "UNKNOWN_STAGE"
]);

export const SUPPORTED_BIR_TRIAGE_ROUTES = Object.freeze([
  "AUTHORITY_SAFE_PROCEDURAL_FALLBACK",
  "LOA_AUTHENTICITY_CHECK",
  "RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW",
  "RMC_14_2026_REPLACEMENT_ELA_REVIEW",
  "RMO_6_2026_CONSOLIDATION_REVIEW",
  "DOCUMENT_COMPLIANCE_MATRIX",
  "PAN_REPLY_WORKFLOW",
  "FAN_FLD_PROTEST_WORKFLOW",
  "FDDA_CTA_APPEAL_WATCH",
  "AUDIT_TERMINATION_REVIEW",
  "HUMAN_TAX_LEGAL_REVIEW"
]);

const ALLOWED_SOURCE_CARD_AUTHORITY_TIERS = Object.freeze([
  "official_reference_required",
  "uploaded_reference_pattern",
  "future_authority_corpus_required",
  "procedural_design_reference"
]);

const STANDARD_HUMAN_REVIEW_NOTICE =
  "This scaffold provides procedural-safe triage only and does not constitute a final legal or tax conclusion. The taxpayer should have this matter reviewed against applicable BIR issuances (including RMO No. 1-2026, RMO No. 6-2026, and RMC No. 14-2026) and jurisprudence by a qualified tax professional before any filing deadline.";

const BASE_SOURCE_CARDS = Object.freeze([
  Object.freeze({
    label: "RMC No. 5-2026 LOA/eLA verification reference",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Use BIR REVIE / LOA Verifier workflow when authority corpus is wired. This scaffold does not perform live verification."
  }),
  Object.freeze({
    label: "RMO No. 1-2026 single-instance audit framework",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for 2026-and-later audit authority, eLA consolidation, standardized checklist, document request limits, and audit safeguards."
  }),
  Object.freeze({
    label: "RMO No. 6-2026 consolidation safeguards",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for consolidation prohibitions, FAN-level consolidation, written conformity, waiver of prescription, proper service, and no-regression rule."
  }),
  Object.freeze({
    label: "RMC No. 14-2026 replacement eLA and transition clarification",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for replacement eLA continuity, prior LOA/eLA validity, TVN scope, consolidation timing, and VATAS/LTVAU transition."
  }),
  Object.freeze({
    label: "Uploaded professional BIR audit workflow reference pattern",
    sourceType: "private uploaded reference",
    authorityTier: "uploaded_reference_pattern",
    note: "Use only as private development pattern; fixtures must be sanitized and must not expose real taxpayer data."
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
  "this pan is invalid",
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
  "all multiple elas are invalid",
  "all vatas audits are void",
  "replacement ela always restarts the audit",
  "replacement ela always requires new cir approval",
  "questioning the replacement ela suspends the audit",
  "prior notices are invalidated by replacement ela",
  "fdda cases can be consolidated",
  "final and executory fan can be consolidated",
  "the case is won",
  "no further action is needed",
  "the bir can never reopen anything",
  "this is full immunity"
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
const REAL_TIN_FRAGMENTS = Object.freeze(["008-826-456-000", "010-841-602-000", "005-055-069-00000"]);

const PROHIBITED_CONCLUSION_LABELS = Object.freeze([
  "notice_validity_determination",
  "assessment_cancellation_determination",
  "final_legal_opinion",
  "guaranteed_outcome_determination",
  "automatic_filing_or_submission_determination"
]);

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

/**
 * Recursively scans a value for prohibited BIR-notice-triage claim phrases.
 * Pure, synchronous, never mutates input, performs no I/O.
 *
 * @param {*} value
 * @returns {{hasProhibitedClaims: boolean, matches: string[]}}
 */
export function detectProhibitedBirNoticeClaims(value) {
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
  for (const fragment of REAL_TIN_FRAGMENTS) if (raw.includes(fragment)) matches.push(`tin:${fragment}`);
  return { hasRealDataLeak: matches.length > 0, matches };
}

function containsRealDataFragments(text) {
  const upper = (text || "").toUpperCase();
  for (const fragment of REAL_TAXPAYER_NAME_FRAGMENTS) if (upper.includes(fragment)) return "taxpayer name";
  for (const fragment of REAL_OFFICER_NAME_FRAGMENTS) if (upper.includes(fragment)) return "BIR officer name";
  for (const fragment of REAL_ELA_NUMBER_FRAGMENTS) if ((text || "").includes(fragment)) return "LOA/eLA number";
  for (const fragment of REAL_AUDIT_CASE_NUMBER_FRAGMENTS) if ((text || "").includes(fragment)) return "audit case number";
  return null;
}

/**
 * Normalizes candidate BIR notice/LOA triage input into a defensive, fully-
 * shaped object. Never mutates input; never throws. Always forces the safe
 * scaffold-only option values regardless of caller input --
 * validateBirNoticeLoaTriageInput() is the gate that flags an attempt to
 * request unsafe option values.
 *
 * @param {*} input
 * @returns {object}
 */
export function normalizeBirNoticeLoaTriageInput(input) {
  const src = isPlainObject(input) ? input : {};
  const factsSrc = isPlainObject(src.knownFacts) ? src.knownFacts : {};
  const userSelectedNoticeType =
    typeof src.userSelectedNoticeType === "string" && SUPPORTED_BIR_NOTICE_TYPES.includes(src.userSelectedNoticeType) ? src.userSelectedNoticeType : null;

  return {
    userQuery: typeof src.userQuery === "string" ? src.userQuery.trim() : "",
    noticeText: typeof src.noticeText === "string" ? src.noticeText.trim() : "",
    userSelectedNoticeType,
    knownFacts: {
      dateIssued: isNonBlankString(factsSrc.dateIssued) ? factsSrc.dateIssued.trim() : null,
      dateReceived: isNonBlankString(factsSrc.dateReceived) ? factsSrc.dateReceived.trim() : null,
      taxablePeriod: isNonBlankString(factsSrc.taxablePeriod) ? factsSrc.taxablePeriod.trim() : null,
      taxTypes: normalizeStringArray(factsSrc.taxTypes),
      hasLOANumber: factsSrc.hasLOANumber === true,
      hasELANumber: factsSrc.hasELANumber === true,
      hasReplacementELANumber: factsSrc.hasReplacementELANumber === true,
      hasAuditCaseNumber: factsSrc.hasAuditCaseNumber === true,
      hasMissionOrderNumber: factsSrc.hasMissionOrderNumber === true,
      hasTVNNumber: factsSrc.hasTVNNumber === true,
      hasPANNumber: factsSrc.hasPANNumber === true,
      hasFANNumber: factsSrc.hasFANNumber === true,
      hasFLDNumber: factsSrc.hasFLDNumber === true,
      hasFDDANumber: factsSrc.hasFDDANumber === true,
      hasTaxpayerName: factsSrc.hasTaxpayerName === true,
      hasTIN: factsSrc.hasTIN === true,
      hasOfficerNames: factsSrc.hasOfficerNames === true,
      hasGroupSupervisor: factsSrc.hasGroupSupervisor === true,
      hasSignatory: factsSrc.hasSignatory === true,
      issuingOffice: isNonBlankString(factsSrc.issuingOffice) ? factsSrc.issuingOffice.trim() : null,
      revenueRegion: isNonBlankString(factsSrc.revenueRegion) ? factsSrc.revenueRegion.trim() : null,
      rdoOrOffice: isNonBlankString(factsSrc.rdoOrOffice) ? factsSrc.rdoOrOffice.trim() : null,
      scopeTextPresent: factsSrc.scopeTextPresent === true,
      documentChecklistPresent: factsSrc.documentChecklistPresent === true,
      amountsPresent: factsSrc.amountsPresent === true,
      protestLanguagePresent: factsSrc.protestLanguagePresent === true,
      appealLanguagePresent: factsSrc.appealLanguagePresent === true,
      terminationLanguagePresent: factsSrc.terminationLanguagePresent === true,
      withoutPrejudiceLanguagePresent: factsSrc.withoutPrejudiceLanguagePresent === true,
      mentionsReplacement: factsSrc.mentionsReplacement === true,
      mentionsConsolidation: factsSrc.mentionsConsolidation === true,
      mentionsPAN: factsSrc.mentionsPAN === true,
      mentionsFAN: factsSrc.mentionsFAN === true,
      mentionsFDDA: factsSrc.mentionsFDDA === true,
      mentionsTermination: factsSrc.mentionsTermination === true,
      multipleAuthoritiesSameYear: factsSrc.multipleAuthoritiesSameYear === true
    },
    options: {
      scaffoldOnly: true,
      runtimeActive: false,
      allowLegalConclusion: false,
      allowLiveRetrieval: false,
      allowRealTaxpayerData: false
    },
    sourceCards: (Array.isArray(src.sourceCards) ? src.sourceCards : []).map((card) => normalizeSourceCard(card))
  };
}

/**
 * Validates candidate BIR notice/LOA triage input. Never throws. Rejects
 * missing input, missing/empty userQuery+noticeText, an unsupported
 * userSelectedNoticeType, any attempt to request unsafe option values,
 * source cards claiming completed verification/final legal conclusion, and
 * any known real taxpayer/officer name or real LOA/eLA/audit-case number
 * from the private reference corpus.
 *
 * @param {*} input
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateBirNoticeLoaTriageInput(input) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(input)) {
    errors.push("input must be a plain object");
    return { valid: false, errors, warnings };
  }

  const userQuery = typeof input.userQuery === "string" ? input.userQuery.trim() : "";
  const noticeText = typeof input.noticeText === "string" ? input.noticeText.trim() : "";
  if (userQuery.length === 0 && noticeText.length === 0) {
    errors.push("userQuery and noticeText must not both be missing/empty");
  }

  if (input.userSelectedNoticeType !== undefined && !SUPPORTED_BIR_NOTICE_TYPES.includes(input.userSelectedNoticeType)) {
    errors.push(`unsupported userSelectedNoticeType: ${JSON.stringify(input.userSelectedNoticeType)}`);
  }

  const options = isPlainObject(input.options) ? input.options : {};
  if (options.runtimeActive === true) errors.push("runtimeActive must not be true");
  if (options.scaffoldOnly === false) errors.push("scaffoldOnly must not be false");
  if (options.allowLegalConclusion === true) errors.push("allowLegalConclusion must not be true");
  if (options.allowLiveRetrieval === true) errors.push("allowLiveRetrieval must not be true");
  if (options.allowRealTaxpayerData === true) errors.push("allowRealTaxpayerData must not be true");

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

  const combinedRaw = `${input.userQuery || ""} ${input.noticeText || ""}`;
  const realDataHit = containsRealDataFragments(combinedRaw);
  if (realDataHit) errors.push(`input must not contain a known real ${realDataHit} from uploaded materials`);

  return { valid: errors.length === 0, errors, warnings };
}

const NOTICE_TYPE_KEYWORD_DETECTORS = Object.freeze([
  ["BIR_REPLACEMENT_ELA", [/replacement (?:e-?la|electronic letter of authority)/i]],
  ["BIR_CONSOLIDATED_ELA", [/consolidated (?:e-?la|electronic letter of authority)/i, /consolidation of (?:e-?la|elas)/i]],
  ["BIR_ELECTRONIC_LOA", [/electronic letter of authority/i, /\bela\b/i]],
  ["BIR_LOA_FULL_EXAMINATION", [/letter of authority/i, /\bloa\b/i]],
  ["BIR_MISSION_ORDER", [/mission order/i]],
  ["BIR_TAX_VERIFICATION_NOTICE", [/tax verification notice/i, /\btvn\b/i]],
  ["BIR_CHECKLIST_REQUIREMENTS_PRESENTATION_SUBMISSION", [/checklist of requirements/i, /\bchecklist\b/i]],
  ["BIR_NOTICE_PRESENTATION_SUBMISSION_DOCUMENTS", [/presentation\/?submission of documents/i, /notice for presentation/i]],
  ["BIR_ADDITIONAL_DOCUMENT_REQUEST", [/additional document/i, /additional requirement/i]],
  ["BIR_INITIAL_DOCUMENT_REQUEST", [/initial document request/i, /initial requirement/i]],
  ["BIR_PRE_SUBPOENA_DUCES_TECUM_REMINDER", [/reminder before issuance of subpoena/i, /pre-subpoena/i]],
  ["BIR_SUBPOENA_DUCES_TECUM", [/subpoena duces tecum/i]],
  ["BIR_NOD", [/notice of discrepancy/i, /\bnod\b/i]],
  ["BIR_DOD", [/discussion of discrepancy/i, /\bdod\b/i]],
  ["BIR_CONSOLIDATED_PAN", [/consolidated (?:pan|preliminary assessment notice)/i]],
  ["BIR_PAN", [/preliminary assessment notice/i, /\bpan\b/i]],
  ["BIR_CONSOLIDATED_FAN", [/consolidated (?:fan|final assessment notice)/i]],
  ["BIR_FLD", [/formal letter of demand/i, /\bfld\b/i]],
  ["BIR_FAN", [/final assessment notice/i, /\bfan\b/i]],
  ["BIR_FDDA", [/final decision on disputed assessment/i, /\bfdda\b/i]],
  ["BIR_ACTION_ON_PROTEST", [/action on protest/i, /action letter/i]],
  ["BIR_PROTEST_REQUEST_REINVESTIGATION", [/request for reinvestigation/i, /\breinvestigation\b/i]],
  ["BIR_PROTEST_REQUEST_RECONSIDERATION", [/request for reconsideration/i, /\breconsideration\b/i, /protest letter/i]],
  ["BIR_AUDIT_TERMINATION_LETTER", [/termination letter/i, /audit termination/i]],
  ["BIR_REQUEST_FOR_NON_CONSOLIDATION_VAT", [/non-?consolidation/i]],
  ["BIR_WRITTEN_CONFORMITY_TO_CONSOLIDATION", [/written conformity/i]],
  ["BIR_WAIVER_OF_PRESCRIPTION", [/waiver of prescription/i, /waiver of the statute of limitations/i]],
  ["BIR_VATAS_LTVAU_TRANSITION_NOTICE", [/\bvatas\b/i, /\bltvau\b/i]],
  ["BIR_VAT_REFUND_TRANSITION_NOTICE", [/vat refund/i]]
]);

function classifyNoticeType(combinedText) {
  for (const [typeId, patterns] of NOTICE_TYPE_KEYWORD_DETECTORS) {
    if (patterns.some((p) => p.test(combinedText))) return typeId;
  }
  return "UNKNOWN_BIR_NOTICE";
}

function has2026Indicators(ctx) {
  const { combinedText, facts } = ctx;
  if (/2026|single[- ]instance audit|rmo no\.? 1-2026|rmo 1-2026|rmc no\.? 5-2026/i.test(combinedText)) return true;
  const yearOf = (str) => {
    const m = /(\d{4})/.exec(str || "");
    return m ? parseInt(m[1], 10) : null;
  };
  const issuedYear = yearOf(facts.dateIssued);
  const receivedYear = yearOf(facts.dateReceived);
  if ((issuedYear && issuedYear >= 2026) || (receivedYear && receivedYear >= 2026)) return true;
  if (facts.taxablePeriod && /2026/.test(facts.taxablePeriod)) return true;
  return false;
}

function defaultAudit2026Signals() {
  return {
    rmo1_2026PotentiallyApplies: false,
    rmc14_2026PotentiallyApplies: false,
    rmo6_2026PotentiallyApplies: false,
    preRmo1Authority: false,
    postRmo1Authority: false,
    replacementForContinuity: false,
    replacementExpandsScope: false,
    replacementExpandsTaxablePeriod: false,
    sameTaxpayer: null,
    sameTaxablePeriod: null,
    sameScope: null,
    multipleAuthoritiesSameYear: false,
    consolidationPotential: false,
    consolidationRequired: null,
    consolidationProhibited: null,
    consolidationStage: null,
    vatNonConsolidationPotential: false,
    vatNonConsolidationDeadlineRelevant: false,
    vatasOrLtvauInvolved: false,
    vatasLtvauTransitionRelevant: false,
    tvnLimitedScope: false,
    tvnPotentialScopeExpansion: false,
    standardizedChecklistPresent: false,
    additionalRequestLimitCheckNeeded: false,
    voluminousRecordsIssue: false,
    onPremiseExaminationPotential: false,
    certifiedCopySubmissionPotential: false,
    waiverOfPrescriptionPresent: false,
    writtenConformityNeeded: false,
    freshResponsePeriodPotential: false,
    freshProtestPeriodPotential: false,
    noRegressionRulePotential: false,
    properServiceRequired: false
  };
}

function defaultDeadlineSignals() {
  return {
    receiptDateKnown: false,
    panReply15DayPotential: false,
    fanFldProtest30DayPotential: false,
    reinvestigation60DayPotential: false,
    ctaAppeal30DayPotential: false,
    inaction180DayPotential: false,
    deadlineCannotBeComputedReason: null
  };
}

function buildLoaTriage(ctx) {
  const routingExtra = has2026Indicators(ctx) ? ["RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW"] : [];
  return {
    stage: "AUDIT_AUTHORITY",
    routingTargets: dedupe(["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "LOA_AUTHENTICITY_CHECK", "DOCUMENT_COMPLIANCE_MATRIX", ...routingExtra, "HUMAN_TAX_LEGAL_REVIEW"]),
    safeWarnings: [
      "Do not conclude from this scaffold alone whether the LOA/eLA is valid or invalid.",
      "Verify authenticity, scope, date received, taxable period, tax types, RO/GS, signatory, and issuing office."
    ],
    recommendedNextActions: [
      "Verify LOA/eLA authenticity.",
      "Record date of receipt.",
      "Identify taxable period and tax types.",
      "Check document checklist and submission deadline.",
      "Prepare document compliance matrix.",
      "Preserve proof of submission."
    ],
    audit2026: { rmo1_2026PotentiallyApplies: has2026Indicators(ctx) },
    deadline: {}
  };
}

function buildReplacementElaTriage(ctx) {
  const { combinedText, facts } = ctx;
  const continuityPattern = /reassign|substitut|restructur|transfer|continuation|continuity/;
  const expansionPattern = /broader scope|expanded scope|new taxable period|different taxable period|additional taxable period|wider scope/;
  const replacementForContinuity = continuityPattern.test(combinedText) || facts.mentionsReplacement === true;
  const expands = expansionPattern.test(combinedText);
  return {
    stage: "AUDIT_AUTHORITY",
    routingTargets: [
      "AUTHORITY_SAFE_PROCEDURAL_FALLBACK",
      "LOA_AUTHENTICITY_CHECK",
      "RMC_14_2026_REPLACEMENT_ELA_REVIEW",
      "RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW",
      "HUMAN_TAX_LEGAL_REVIEW"
    ],
    safeWarnings: [
      "A replacement eLA may preserve audit continuity, but scope, taxpayer, taxable period, service, and underlying authority must still be checked.",
      "Do not assume a replacement eLA is defective solely because it was issued on or after RMO No. 1-2026 took effect.",
      "Do not assume a replacement eLA creates a brand-new audit authority when it is issued only for continuity due to reassignment or restructuring."
    ],
    recommendedNextActions: [
      "Compare the replacement eLA against the original eLA for taxpayer, taxable period, and scope.",
      "Confirm proper service of the replacement eLA.",
      "Verify the continuity basis (reassignment, restructuring, or similar) against RMC No. 14-2026.",
      "Escalate to professional review for legal conclusions."
    ],
    audit2026: {
      rmc14_2026PotentiallyApplies: true,
      rmo1_2026PotentiallyApplies: true,
      replacementForContinuity,
      replacementExpandsScope: expands,
      replacementExpandsTaxablePeriod: expands,
      properServiceRequired: true
    },
    deadline: {}
  };
}

function buildConsolidatedElaTriage(ctx) {
  const { combinedText, facts } = ctx;
  const multiplePattern = /multiple elas|multiple letters of authority|more than one ela|two elas|another ela covering/;
  const multipleAuthoritiesSameYear = multiplePattern.test(combinedText) || facts.multipleAuthoritiesSameYear === true || facts.mentionsConsolidation === true;
  return {
    stage: "CONSOLIDATION",
    routingTargets: ["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW", "RMO_6_2026_CONSOLIDATION_REVIEW", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: [
      "Multiple eLAs covering the same taxpayer and taxable period may raise consolidation issues that require review.",
      "Consolidation treatment depends on stage, dates, any VAT non-consolidation request, finality, FDDA status, and applicable procedural safeguards."
    ],
    recommendedNextActions: [
      "Compare all eLAs for taxpayer, taxable period, and scope overlap.",
      "Identify the current stage of each related case (pre-assessment, FAN/FLD, FDDA, or closed).",
      "Escalate to professional review before responding to any consolidated proceeding."
    ],
    audit2026: {
      rmo1_2026PotentiallyApplies: true,
      rmo6_2026PotentiallyApplies: true,
      multipleAuthoritiesSameYear,
      consolidationPotential: true,
      properServiceRequired: true
    },
    deadline: {}
  };
}

function buildMissionOrderTriage() {
  return {
    stage: "AUDIT_AUTHORITY",
    routingTargets: ["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: ["A Mission Order is not the same instrument as a full eLA; its scope and authority must be checked against the instrument itself and applicable BIR rules."],
    recommendedNextActions: [
      "Confirm the specific scope and purpose stated on the Mission Order.",
      "Verify the issuing authority and validity period.",
      "Escalate to professional review if audit activity appears to exceed the Mission Order's stated scope."
    ],
    audit2026: { rmo1_2026PotentiallyApplies: true },
    deadline: {}
  };
}

function buildTvnTriage(ctx) {
  const { combinedText } = ctx;
  const expansionPattern = /broader (?:tax )?issue|expand(?:ed|ing)? (?:the )?scope|additional tax issue|beyond the (?:stated |declared )?transaction/;
  return {
    stage: "AUDIT_AUTHORITY",
    routingTargets: ["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: [
      "A Tax Verification Notice is limited to the specific transaction, declaration, or claim identified in the notice.",
      "If broader tax issues arise, a separate eLA may be required before further full audit activity proceeds."
    ],
    recommendedNextActions: [
      "Confirm the specific transaction, declaration, or claim referenced in the TVN.",
      "Watch for any indication that the inquiry is expanding beyond the TVN's stated scope.",
      "Escalate to professional review if scope expansion is suspected."
    ],
    audit2026: { rmo1_2026PotentiallyApplies: true, tvnLimitedScope: true, tvnPotentialScopeExpansion: expansionPattern.test(combinedText) },
    deadline: {}
  };
}

function buildChecklistTriage(ctx) {
  const { combinedText } = ctx;
  const checklistWordingPattern = /checklist|annex [a-z]|list of requirements|list of documents/;
  const voluminousPattern = /\bbooks\b|\bcas\b|\bcba\b|general ledger|\bgl\b|ledgers|voluminous/;
  const routingExtra = has2026Indicators(ctx) ? ["RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW"] : [];
  const voluminous = voluminousPattern.test(combinedText);
  return {
    stage: "DOCUMENT_REQUEST",
    routingTargets: dedupe(["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "DOCUMENT_COMPLIANCE_MATRIX", ...routingExtra, "HUMAN_TAX_LEGAL_REVIEW"]),
    safeWarnings: [
      "Do not blindly submit every requested item without review.",
      "Any additional document request should be checked for relevance, necessity, audit scope, explanation, and documentation."
    ],
    recommendedNextActions: [
      "Match each requested document to available records.",
      "Classify each item as provided, to follow, not applicable, unavailable, or non-existent.",
      "Prepare a written transmittal and preserve proof of receipt."
    ],
    audit2026: {
      rmo1_2026PotentiallyApplies: has2026Indicators(ctx),
      standardizedChecklistPresent: checklistWordingPattern.test(combinedText),
      additionalRequestLimitCheckNeeded: true,
      voluminousRecordsIssue: voluminous,
      onPremiseExaminationPotential: voluminous,
      certifiedCopySubmissionPotential: voluminous
    },
    deadline: {}
  };
}

function buildAdditionalDocumentRequestTriage() {
  return {
    stage: "DOCUMENT_REQUEST",
    routingTargets: ["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "DOCUMENT_COMPLIANCE_MATRIX", "RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: ["Additional requests must be evaluated against the identified audit issues, necessity, authorized scope, explanation, and documentation."],
    recommendedNextActions: ["Confirm the stated basis for the additional request.", "Classify each additional item and prepare a written transmittal.", "Preserve proof of receipt."],
    audit2026: { rmo1_2026PotentiallyApplies: true, additionalRequestLimitCheckNeeded: true },
    deadline: {}
  };
}

function buildPreSubpoenaTriage() {
  return {
    stage: "DOCUMENT_ESCALATION",
    routingTargets: ["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "DOCUMENT_COMPLIANCE_MATRIX", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: ["Treat this reminder as an escalation risk.", "Do not disregard the reminder."],
    recommendedNextActions: ["Prepare an itemized response covering every previously requested item.", "Preserve proof of prior submission.", "Submit or file a response promptly."],
    audit2026: {},
    deadline: {}
  };
}

function buildSubpoenaTriage() {
  return {
    stage: "DOCUMENT_ESCALATION",
    routingTargets: ["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "DOCUMENT_COMPLIANCE_MATRIX", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: ["This is a formal escalation instrument.", "Immediate professional review is recommended before any response."],
    recommendedNextActions: ["Escalate to professional legal/tax review immediately.", "Preserve proof of all prior submissions.", "Do not respond without professional guidance."],
    audit2026: {},
    deadline: {}
  };
}

function buildNodDodTriage(ctx) {
  const consolidationIndicated = ctx.facts.mentionsConsolidation === true || /consolidat/.test(ctx.combinedText);
  const routingExtra = consolidationIndicated ? ["RMO_6_2026_CONSOLIDATION_REVIEW"] : [];
  return {
    stage: "DISCREPANCY_DISCUSSION",
    routingTargets: dedupe(["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "DOCUMENT_COMPLIANCE_MATRIX", ...routingExtra, "HUMAN_TAX_LEGAL_REVIEW"]),
    safeWarnings: ["Track discussion dates, minutes, unresolved issues, and documents submitted for this notice."],
    recommendedNextActions: [
      "Record all discussion dates and unresolved issues.",
      "Confirm whether a subsequent PAN reflects only the unresolved matters.",
      "Preserve copies of all documents submitted during discussion."
    ],
    audit2026: { consolidationPotential: consolidationIndicated },
    deadline: {}
  };
}

function buildPanTriage(typeId) {
  const isConsolidated = typeId === "BIR_CONSOLIDATED_PAN";
  const routingExtra = isConsolidated ? ["RMO_6_2026_CONSOLIDATION_REVIEW"] : [];
  return {
    stage: "PRE_ASSESSMENT",
    routingTargets: dedupe(["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "PAN_REPLY_WORKFLOW", ...routingExtra, "HUMAN_TAX_LEGAL_REVIEW"]),
    safeWarnings: [
      "Record the date of receipt of the PAN.",
      "A PAN generally requires a timely reply within the applicable response period.",
      ...(isConsolidated ? ["A consolidated PAN may trigger a fresh response period if properly served and if consolidation rules apply."] : [])
    ],
    recommendedNextActions: ["Record date of receipt.", "Build an issue-by-issue defense matrix.", "Escalate to professional review before the reply deadline."],
    audit2026: isConsolidated ? { rmo6_2026PotentiallyApplies: true, freshResponsePeriodPotential: true, properServiceRequired: true } : {},
    deadline: { panReply15DayPotential: true }
  };
}

function buildFanFldTriage(typeId) {
  const isConsolidated = typeId === "BIR_CONSOLIDATED_FAN";
  const routingExtra = isConsolidated ? ["RMO_6_2026_CONSOLIDATION_REVIEW"] : [];
  return {
    stage: "FINAL_ASSESSMENT",
    routingTargets: dedupe(["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "FAN_FLD_PROTEST_WORKFLOW", ...routingExtra, "HUMAN_TAX_LEGAL_REVIEW"]),
    safeWarnings: [
      "Record the date of receipt of the FAN/FLD.",
      "A FAN/FLD generally requires a valid administrative protest within the applicable period.",
      ...(isConsolidated ? ["A consolidated FAN may trigger a fresh protest period if properly served and if consolidation safeguards apply."] : [])
    ],
    recommendedNextActions: ["Record date of receipt.", "Determine whether reconsideration or reinvestigation is appropriate.", "Prepare a supported protest before the deadline."],
    audit2026: isConsolidated
      ? { rmo6_2026PotentiallyApplies: true, freshProtestPeriodPotential: true, properServiceRequired: true, noRegressionRulePotential: true }
      : {},
    deadline: {
      fanFldProtest30DayPotential: true,
      reinvestigation60DayPotential: true,
      inaction180DayPotential: true,
      ctaAppeal30DayPotential: true
    }
  };
}

function buildFddaTriage() {
  return {
    stage: "APPEAL_WATCH",
    routingTargets: ["FDDA_CTA_APPEAL_WATCH", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: [
      "FDDA-stage cases generally require appeal-period monitoring.",
      "Under RMO No. 6-2026, cases that have reached the FDDA stage should proceed independently rather than being folded into a consolidation."
    ],
    recommendedNextActions: ["Calendar the CTA appeal period.", "Preserve proof of the prior protest filing.", "Escalate to professional legal/tax review promptly."],
    audit2026: { consolidationProhibited: true },
    deadline: { ctaAppeal30DayPotential: true }
  };
}

function buildProtestRequestTriage(typeId) {
  const isReinvestigation = typeId === "BIR_PROTEST_REQUEST_REINVESTIGATION";
  return {
    stage: "ADMINISTRATIVE_PROTEST",
    routingTargets: ["FAN_FLD_PROTEST_WORKFLOW", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: [
      "Confirm whether the protest is a request for reconsideration or a request for reinvestigation.",
      "Track supporting-document periods, the 180-day inaction window, any FDDA, and CTA appeal windows."
    ],
    recommendedNextActions: ["Confirm the chosen protest remedy.", "Prepare supporting documents matched to that remedy.", "Preserve proof of filing."],
    audit2026: {},
    deadline: {
      ...(isReinvestigation ? { reinvestigation60DayPotential: true } : {}),
      inaction180DayPotential: true,
      ctaAppeal30DayPotential: true
    }
  };
}

function buildActionOnProtestTriage() {
  return {
    stage: "POST_PROTEST",
    routingTargets: ["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "FAN_FLD_PROTEST_WORKFLOW", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: [
      "Acceptance of a protest for re-evaluation does not, by itself, mean the assessment was resolved in the taxpayer's favor.",
      "Monitor for the re-evaluation result, any FDDA, amended assessment, denial, or inaction."
    ],
    recommendedNextActions: ["Confirm precisely what the action letter granted.", "Preserve proof of protest filing and attachments.", "Continue monitoring for further BIR action."],
    audit2026: {},
    deadline: {}
  };
}

function buildTerminationTriage() {
  return {
    stage: "AUDIT_CLOSURE",
    routingTargets: ["AUDIT_TERMINATION_REVIEW", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: [
      "Match the audit closure to the covered LOA/eLA, taxable period, and tax types.",
      "Closure may be without prejudice to future action in cases involving fraud, false returns, refund issues, or other legally recognized grounds."
    ],
    recommendedNextActions: ["Retain the termination letter permanently.", "Match it to the covered LOA/eLA, taxable period, and tax types.", "Preserve payment proof and related records."],
    audit2026: {},
    deadline: {}
  };
}

function buildVatNonConsolidationTriage(ctx) {
  return {
    stage: "CONSOLIDATION",
    routingTargets: ["RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW", "RMO_6_2026_CONSOLIDATION_REVIEW", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: [
      "Whether VAT non-consolidation applies depends on the filing date, the affected eLAs, VAT audit status, and applicable transition rules.",
      "Do not assume a separate VAT audit may continue independently without checking the applicable deadlines and safeguards."
    ],
    recommendedNextActions: [
      "Confirm the filing date of the non-consolidation request.",
      "Identify the affected eLAs and their VAT audit status.",
      "Escalate to professional review before relying on this classification."
    ],
    audit2026: { vatNonConsolidationPotential: true, vatNonConsolidationDeadlineRelevant: true, vatasOrLtvauInvolved: /vatas|ltvau/.test(ctx.combinedText) },
    deadline: {}
  };
}

function buildWrittenConformityTriage(ctx) {
  const isFanConsolidation = /\bfan\b/.test(ctx.combinedText) || ctx.facts.mentionsFAN === true;
  const isPanNodConsolidation = /\bpan\b|\bnod\b/.test(ctx.combinedText) || ctx.facts.mentionsPAN === true;
  return {
    stage: "CONSOLIDATION",
    routingTargets: ["RMO_6_2026_CONSOLIDATION_REVIEW", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: ["Written conformity should not be treated as an admission of liability or a waiver of substantive defenses or legal remedies."],
    recommendedNextActions: ["Review the written conformity text carefully before signing.", "Confirm what specifically is being consolidated.", "Escalate to professional review before providing conformity."],
    audit2026: {
      writtenConformityNeeded: true,
      properServiceRequired: true,
      freshResponsePeriodPotential: isPanNodConsolidation,
      freshProtestPeriodPotential: isFanConsolidation
    },
    deadline: {}
  };
}

function buildWaiverTriage() {
  return {
    stage: "PRESCRIPTION",
    routingTargets: ["RMO_6_2026_CONSOLIDATION_REVIEW", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: ["Waiver validity requires authority review.", "A replacement eLA does not automatically require a new waiver if the existing waiver remains valid and binding."],
    recommendedNextActions: ["Confirm the waiver's execution date, coverage, and validity requirements.", "Escalate to professional review before relying on any waiver.", "Preserve the original waiver document."],
    audit2026: { waiverOfPrescriptionPresent: true, properServiceRequired: true },
    deadline: {}
  };
}

function buildVatasLtvauTriage() {
  return {
    stage: "VAT_TRANSITION",
    routingTargets: ["RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW", "RMO_6_2026_CONSOLIDATION_REVIEW", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: ["VATAS/LTVAU transition treatment depends on dates, pending audit status, VAT refund status, and applicable consolidation rules."],
    recommendedNextActions: ["Confirm the transition date and pending-case status.", "Identify whether a VAT refund claim is involved.", "Escalate to professional review before relying on this classification."],
    audit2026: { vatasOrLtvauInvolved: true, vatasLtvauTransitionRelevant: true },
    deadline: {}
  };
}

function buildVatRefundTransitionTriage() {
  return {
    stage: "VAT_TRANSITION",
    routingTargets: ["RMO_6_2026_CONSOLIDATION_REVIEW", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: ["VAT refund jurisdiction and processing depend on the receipt date and applicable VATAS/LTVAU wind-up rules."],
    recommendedNextActions: ["Confirm the receipt date of the transition notice.", "Identify the current processing office for the VAT refund claim.", "Escalate to professional review before relying on this classification."],
    audit2026: { vatasOrLtvauInvolved: true, vatasLtvauTransitionRelevant: true },
    deadline: {}
  };
}

function buildUnknownTriage() {
  return {
    stage: "UNKNOWN_STAGE",
    routingTargets: ["AUTHORITY_SAFE_PROCEDURAL_FALLBACK", "HUMAN_TAX_LEGAL_REVIEW"],
    safeWarnings: ["This scaffold could not confidently classify the notice type from the information provided.", "Escalate to professional review before taking any procedural action."],
    recommendedNextActions: ["Provide additional details or select a specific notice type if known.", "Escalate to professional review."],
    audit2026: {},
    deadline: {}
  };
}

const TRIAGE_BUILDERS = Object.freeze({
  BIR_LOA_FULL_EXAMINATION: (ctx) => buildLoaTriage(ctx),
  BIR_ELECTRONIC_LOA: (ctx) => buildLoaTriage(ctx),
  BIR_REPLACEMENT_ELA: (ctx) => buildReplacementElaTriage(ctx),
  BIR_CONSOLIDATED_ELA: (ctx) => buildConsolidatedElaTriage(ctx),
  BIR_MISSION_ORDER: () => buildMissionOrderTriage(),
  BIR_TAX_VERIFICATION_NOTICE: (ctx) => buildTvnTriage(ctx),
  BIR_NOTICE_PRESENTATION_SUBMISSION_DOCUMENTS: (ctx) => buildChecklistTriage(ctx),
  BIR_CHECKLIST_REQUIREMENTS_PRESENTATION_SUBMISSION: (ctx) => buildChecklistTriage(ctx),
  BIR_INITIAL_DOCUMENT_REQUEST: (ctx) => buildChecklistTriage(ctx),
  BIR_ADDITIONAL_DOCUMENT_REQUEST: () => buildAdditionalDocumentRequestTriage(),
  BIR_PRE_SUBPOENA_DUCES_TECUM_REMINDER: () => buildPreSubpoenaTriage(),
  BIR_SUBPOENA_DUCES_TECUM: () => buildSubpoenaTriage(),
  BIR_NOD: (ctx) => buildNodDodTriage(ctx),
  BIR_DOD: (ctx) => buildNodDodTriage(ctx),
  BIR_PAN: () => buildPanTriage("BIR_PAN"),
  BIR_CONSOLIDATED_PAN: () => buildPanTriage("BIR_CONSOLIDATED_PAN"),
  BIR_FAN: () => buildFanFldTriage("BIR_FAN"),
  BIR_CONSOLIDATED_FAN: () => buildFanFldTriage("BIR_CONSOLIDATED_FAN"),
  BIR_FLD: () => buildFanFldTriage("BIR_FLD"),
  BIR_FDDA: () => buildFddaTriage(),
  BIR_PROTEST_REQUEST_RECONSIDERATION: () => buildProtestRequestTriage("BIR_PROTEST_REQUEST_RECONSIDERATION"),
  BIR_PROTEST_REQUEST_REINVESTIGATION: () => buildProtestRequestTriage("BIR_PROTEST_REQUEST_REINVESTIGATION"),
  BIR_ACTION_ON_PROTEST: () => buildActionOnProtestTriage(),
  BIR_AUDIT_TERMINATION_LETTER: () => buildTerminationTriage(),
  BIR_REQUEST_FOR_NON_CONSOLIDATION_VAT: (ctx) => buildVatNonConsolidationTriage(ctx),
  BIR_WRITTEN_CONFORMITY_TO_CONSOLIDATION: (ctx) => buildWrittenConformityTriage(ctx),
  BIR_WAIVER_OF_PRESCRIPTION: () => buildWaiverTriage(),
  BIR_VATAS_LTVAU_TRANSITION_NOTICE: () => buildVatasLtvauTriage(),
  BIR_VAT_REFUND_TRANSITION_NOTICE: () => buildVatRefundTransitionTriage(),
  UNKNOWN_BIR_NOTICE: () => buildUnknownTriage()
});

function buildExtractedFields(normalized, noticeType, noticeStage) {
  const f = normalized.knownFacts;
  return {
    noticeType,
    noticeStage,
    taxpayerNamePresent: f.hasTaxpayerName,
    taxpayerTinPresent: f.hasTIN,
    issuingOffice: f.issuingOffice,
    revenueRegion: f.revenueRegion,
    rdoOrOffice: f.rdoOrOffice,
    taxablePeriod: f.taxablePeriod,
    taxTypes: [...f.taxTypes],
    LOANumberPresent: f.hasLOANumber,
    eLANumberPresent: f.hasELANumber,
    replacementELANumberPresent: f.hasReplacementELANumber,
    auditCaseNumberPresent: f.hasAuditCaseNumber,
    missionOrderNumberPresent: f.hasMissionOrderNumber,
    tvnNumberPresent: f.hasTVNNumber,
    panNumberPresent: f.hasPANNumber,
    fanNumberPresent: f.hasFANNumber,
    fldNumberPresent: f.hasFLDNumber,
    fddaNumberPresent: f.hasFDDANumber,
    dateIssued: f.dateIssued,
    dateReceived: f.dateReceived,
    deadlineComputable: Boolean(f.dateReceived),
    responseDeadlineType: null,
    officersNamed: f.hasOfficerNames,
    groupSupervisorNamed: f.hasGroupSupervisor,
    signatoryNamed: f.hasSignatory,
    scopeTextPresent: f.scopeTextPresent,
    documentChecklistPresent: f.documentChecklistPresent,
    amountsPresent: f.amountsPresent,
    protestLanguagePresent: f.protestLanguagePresent,
    appealLanguagePresent: f.appealLanguagePresent,
    terminationLanguagePresent: f.terminationLanguagePresent,
    withoutPrejudiceLanguagePresent: f.withoutPrejudiceLanguagePresent
  };
}

/**
 * Builds a full BIR notice/LOA triage-intent result for the given (raw or
 * normalized) input. Never throws. Always returns the full result shape
 * regardless of input validity -- callers should call
 * validateBirNoticeLoaTriageInput() beforehand to gate whether to proceed.
 * Performs no I/O, no network calls, and no live retrieval; classifies and
 * routes only.
 *
 * @param {*} input
 * @returns {object}
 */
export function createBirNoticeLoaTriageIntentResult(input) {
  const normalized = normalizeBirNoticeLoaTriageInput(input);
  const combinedText = `${normalized.userQuery} ${normalized.noticeText}`.toLowerCase();
  const ctx = { normalized, combinedText, facts: normalized.knownFacts };

  const classifiedType = classifyNoticeType(combinedText);
  const noticeType = normalized.userSelectedNoticeType || classifiedType;
  const confidence = normalized.userSelectedNoticeType ? "high" : noticeType === "UNKNOWN_BIR_NOTICE" ? "low" : "medium";
  const reasonCodes = normalized.userSelectedNoticeType
    ? ["user_selected_notice_type"]
    : noticeType === "UNKNOWN_BIR_NOTICE"
      ? ["no_keyword_match_defaulted_to_unknown"]
      : [`keyword_pattern_match:${noticeType.toLowerCase()}`];

  const builder = TRIAGE_BUILDERS[noticeType] || buildUnknownTriage;
  const built = builder(ctx);

  const audit2026Signals = { ...defaultAudit2026Signals(), ...built.audit2026 };
  const deadlineSignals = { ...defaultDeadlineSignals(), ...built.deadline };
  deadlineSignals.receiptDateKnown = Boolean(normalized.knownFacts.dateReceived);
  if (!deadlineSignals.receiptDateKnown) {
    deadlineSignals.deadlineCannotBeComputedReason = "date of receipt not provided";
  }

  let responseDeadlineType = null;
  if (deadlineSignals.panReply15DayPotential) responseDeadlineType = "PAN_15_DAY_REPLY";
  else if (deadlineSignals.fanFldProtest30DayPotential) responseDeadlineType = "FAN_FLD_30_DAY_PROTEST";
  else if (deadlineSignals.ctaAppeal30DayPotential) responseDeadlineType = "CTA_APPEAL_30_DAY";

  const extractedFields = buildExtractedFields(normalized, noticeType, built.stage);
  extractedFields.responseDeadlineType = responseDeadlineType;

  const combinedSourceCards = [...deepClone(normalized.sourceCards), ...deepClone(BASE_SOURCE_CARDS)];

  return {
    phase: "09M",
    mode: BIR_NOTICE_LOA_TRIAGE_INTENT_MODE_ID,
    version: PHASE_09M_BIR_NOTICE_LOA_TRIAGE_INTENT_VERSION,
    runtimeActive: false,
    triage: {
      noticeType,
      noticeStage: built.stage,
      confidence,
      routingTargets: dedupe(built.routingTargets),
      reasonCodes
    },
    extractedFields,
    audit2026Signals,
    deadlineSignals,
    safeWarnings: [...built.safeWarnings],
    recommendedNextActions: [...built.recommendedNextActions],
    prohibitedConclusions: [...PROHIBITED_CONCLUSION_LABELS],
    sourceCards: combinedSourceCards,
    humanReviewNotice: STANDARD_HUMAN_REVIEW_NOTICE,
    metadata: {
      scaffoldOnly: true,
      legalConclusionProvided: false,
      liveRetrievalPerformed: false,
      externalSearchPerformed: false,
      realTaxpayerDataUsed: false,
      generatedFilingReadyDocument: false,
      automaticSubmission: false,
      finalOutcomeGuaranteed: false
    }
  };
}

/**
 * Validates a candidate BIR notice/LOA triage-intent result object. Never
 * throws.
 *
 * @param {*} result
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateBirNoticeLoaTriageResult(result) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(result)) {
    errors.push("result must be a plain object");
    return { valid: false, errors, warnings };
  }

  if (!isNonBlankString(result.phase)) errors.push("phase is required");
  if (!isNonBlankString(result.mode)) errors.push("mode is required");
  if (result.runtimeActive !== false) errors.push("runtimeActive must be false");

  if (!isPlainObject(result.triage)) {
    errors.push("triage is required");
  } else {
    if (!isNonBlankString(result.triage.noticeType)) errors.push("triage.noticeType is required");
    else if (!SUPPORTED_BIR_NOTICE_TYPES.includes(result.triage.noticeType)) errors.push(`unsupported triage.noticeType: ${result.triage.noticeType}`);

    if (!isNonBlankString(result.triage.noticeStage)) errors.push("triage.noticeStage is required");
    else if (!SUPPORTED_BIR_NOTICE_STAGES.includes(result.triage.noticeStage)) errors.push(`unsupported triage.noticeStage: ${result.triage.noticeStage}`);

    if (!Array.isArray(result.triage.routingTargets)) {
      errors.push("triage.routingTargets is required");
    } else if (result.triage.routingTargets.length === 0) {
      errors.push("triage.routingTargets must not be empty");
    } else {
      for (const route of result.triage.routingTargets) {
        if (!SUPPORTED_BIR_TRIAGE_ROUTES.includes(route)) errors.push(`unsupported routing target: ${route}`);
      }
    }
  }

  if (!isPlainObject(result.extractedFields)) errors.push("extractedFields is required");
  if (!isPlainObject(result.audit2026Signals)) errors.push("audit2026Signals is required");
  if (!isPlainObject(result.deadlineSignals)) errors.push("deadlineSignals is required");
  if (!Array.isArray(result.safeWarnings)) errors.push("safeWarnings must be an array");
  if (!Array.isArray(result.recommendedNextActions)) errors.push("recommendedNextActions must be an array");
  if (!Array.isArray(result.prohibitedConclusions)) errors.push("prohibitedConclusions must be an array");
  if (!Array.isArray(result.sourceCards)) {
    errors.push("sourceCards is required");
  } else if (result.sourceCards.length === 0) {
    errors.push("sourceCards must not be empty");
  }
  if (!isNonBlankString(result.humanReviewNotice)) errors.push("humanReviewNotice is required");

  const metadata = isPlainObject(result.metadata) ? result.metadata : {};
  if (metadata.scaffoldOnly !== true) errors.push("metadata.scaffoldOnly must be true");
  if (metadata.legalConclusionProvided !== false) errors.push("metadata.legalConclusionProvided must be false");
  if (metadata.liveRetrievalPerformed !== false) errors.push("metadata.liveRetrievalPerformed must be false");
  if (metadata.externalSearchPerformed !== false) errors.push("metadata.externalSearchPerformed must be false");
  if (metadata.realTaxpayerDataUsed !== false) errors.push("metadata.realTaxpayerDataUsed must be false");
  if (metadata.automaticSubmission !== false) errors.push("metadata.automaticSubmission must be false");
  if (metadata.finalOutcomeGuaranteed !== false) errors.push("metadata.finalOutcomeGuaranteed must be false");

  const claimCheck = detectProhibitedBirNoticeClaims(result);
  if (claimCheck.hasProhibitedClaims) errors.push(`prohibited claims detected in result: ${claimCheck.matches.join(", ")}`);

  const leakCheck = detectRealDataLeak(result);
  if (leakCheck.hasRealDataLeak) errors.push(`real data leak detected in result: ${leakCheck.matches.join(", ")}`);

  return { valid: errors.length === 0, errors, warnings };
}
