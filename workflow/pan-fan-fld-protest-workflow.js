// FILE: workflow/pan-fan-fld-protest-workflow.js
// PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1
//
// Pure, dependency-free, standalone scaffold modeling the Philippine BIR
// administrative assessment-defense workflow after a PAN/FAN/FLD/FDDA/
// protest notice is detected: workflow stage, protest path, deadline
// signals, an assessment issue matrix, protest strategy, procedural
// safeguards, and authority needs. This module has NO I/O, NO network
// calls, NO Supabase/OpenAI/Google Drive/n8n/Firecrawl/Crawlee/MCP
// dependency, NO web search, NO browser automation, NO OCR, NO filesystem
// access, NO process.env dependency, NO Date.now/randomness, and NO side
// effects. It imports nothing from any other module in this repository. It
// performs no live authority retrieval, generates no filing-ready protest
// document, never submits anything, stores nothing, mutates no global
// state, and is not wired into ask-handler.js, pipeline.js, server.js,
// routes, authentication, or the frontend. It models workflow; it does not
// decide. It never produces a final legal conclusion and never claims a
// PAN, FAN, FLD, FDDA, protest, assessment, LOA/eLA, or BIR audit action is
// void, invalid, cancelled, final, enforceable, appealable, or legally
// conclusive.

"use strict";

export const PHASE_09N_PAN_FAN_FLD_PROTEST_WORKFLOW_VERSION = "PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1";

export const PAN_FAN_FLD_PROTEST_WORKFLOW_MODE_ID = "pan_fan_fld_protest_workflow";

export const SUPPORTED_ASSESSMENT_NOTICE_TYPES = Object.freeze([
  "BIR_PAN",
  "BIR_CONSOLIDATED_PAN",
  "BIR_FAN",
  "BIR_CONSOLIDATED_FAN",
  "BIR_FLD",
  "BIR_FAN_FLD",
  "BIR_FDDA",
  "BIR_PROTEST_REQUEST_RECONSIDERATION",
  "BIR_PROTEST_REQUEST_REINVESTIGATION",
  "BIR_ACTION_ON_PROTEST",
  "UNKNOWN_ASSESSMENT_NOTICE"
]);

export const SUPPORTED_PROTEST_PATHS = Object.freeze([
  "PAN_REPLY",
  "REQUEST_FOR_RECONSIDERATION",
  "REQUEST_FOR_REINVESTIGATION",
  "FDDA_CTA_APPEAL_WATCH",
  "CTA_INACTION_APPEAL_WATCH",
  "POST_PROTEST_REEVALUATION_MONITORING",
  "NO_PROTEST_PATH_YET",
  "HUMAN_REVIEW_REQUIRED"
]);

export const SUPPORTED_PROTEST_WORKFLOW_STAGES = Object.freeze([
  "PAN_REPLY_STAGE",
  "FAN_FLD_PROTEST_STAGE",
  "REINVESTIGATION_DOCUMENT_SUBMISSION_STAGE",
  "PROTEST_PENDING_STAGE",
  "FDDA_RECEIVED_STAGE",
  "CTA_APPEAL_WATCH_STAGE",
  "ACTION_ON_PROTEST_STAGE",
  "POST_PROTEST_REEVALUATION_STAGE",
  "FINALITY_RISK_STAGE",
  "UNKNOWN_STAGE"
]);

export const SUPPORTED_ASSESSMENT_ISSUE_TYPES = Object.freeze([
  "INCOME_TAX",
  "VALUE_ADDED_TAX",
  "EXPANDED_WITHHOLDING_TAX",
  "FINAL_WITHHOLDING_TAX",
  "WITHHOLDING_TAX_DEDUCTIBILITY",
  "CWT_SUBSTANTIATION",
  "INPUT_VAT_SUBSTANTIATION",
  "VAT_EXEMPT_VS_ZERO_RATED",
  "PEZA_ZERO_RATING",
  "OUTPUT_VAT",
  "UNSUPPORTED_SALES_CLASSIFICATION",
  "UNSUPPORTED_EXPENSES",
  "RELATED_PARTY_OR_INTERCOMPANY",
  "DIVIDEND_FWT",
  "COMPROMISE_PENALTY",
  "SURCHARGE",
  "INTEREST",
  "PRESCRIPTION",
  "LOA_OR_ELA_AUTHORITY",
  "REPLACEMENT_ELA",
  "CONSOLIDATED_NOTICE",
  "DUE_PROCESS",
  "PROPER_SERVICE",
  "UNKNOWN_ISSUE"
]);

const ALLOWED_SOURCE_CARD_AUTHORITY_TIERS = Object.freeze([
  "official_reference_required",
  "uploaded_reference_pattern",
  "future_authority_corpus_required",
  "procedural_design_reference"
]);

const STANDARD_HUMAN_REVIEW_NOTICE =
  "This scaffold provides procedural-safe workflow guidance only and does not constitute a final legal or tax conclusion. Receipt date, notice type, protest type, and applicable rules must be verified before final deadline computation, and this matter should be reviewed by a qualified tax professional before any filing deadline.";

const BASE_SOURCE_CARDS = Object.freeze([
  Object.freeze({
    label: "RR No. 18-2013 assessment protest procedure reference",
    sourceType: "BIR regulation",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for PAN reply, FAN/FLD protest, reconsideration, reinvestigation, supporting document period, inaction, and CTA appeal-watch rules. This scaffold does not perform live verification."
  }),
  Object.freeze({
    label: "NIRC Sec. 228 assessment due process reference",
    sourceType: "Tax Code",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for assessment notices stating facts, law, rules, regulations, or jurisprudence. This scaffold does not provide final legal conclusions."
  }),
  Object.freeze({
    label: "RMO No. 6-2026 consolidated PAN/FAN safeguard reference",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for consolidated PAN/FAN safeguards, fresh response/protest periods, proper service, no-regression rule, and FDDA/finality limitations."
  }),
  Object.freeze({
    label: "RMC No. 14-2026 replacement eLA and consolidation clarification",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for replacement eLA continuity, prior LOA/eLA validity, and consolidation transition issues."
  }),
  Object.freeze({
    label: "Uploaded professional PAN/FAN/FLD/protest workflow reference pattern",
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
const REAL_ASSESSMENT_AMOUNT_FRAGMENTS = Object.freeze(["9,367,987.68", "2,841,029.91", "614,038.19", "737,273.97", "15,000.00", "13,106,907.66", "13,545,329.75"]);

const PROHIBITED_CONCLUSION_LABELS = Object.freeze([
  "notice_validity_determination",
  "assessment_finality_determination",
  "protest_outcome_guarantee",
  "final_legal_opinion",
  "filing_ready_document_generation",
  "automatic_submission_determination"
]);

const ISSUE_TYPE_GUIDANCE = Object.freeze({
  VAT_EXEMPT_VS_ZERO_RATED: Object.freeze({
    authorityNeeded: Object.freeze(["NIRC VAT provisions", "BIR VAT zero-rating rules", "PEZA / export rules if applicable", "VAT invoicing/substantiation rules", "CTA / Supreme Court jurisprudence"]),
    substituteProofOptions: Object.freeze([
      "sales invoices",
      "contracts",
      "client registration/support",
      "export/foreign currency/remittance support if applicable",
      "PEZA or incentive documents if applicable",
      "SLSP reconciliation",
      "VAT return reconciliation"
    ]),
    proceduralDefenseTopics: Object.freeze(["due process on discrepancy characterization", "stated legal/factual basis for reclassification"]),
    substantiveDefenseTopics: Object.freeze(["VAT invoicing compliance", "zero-rating/exemption documentary support", "sales classification basis"]),
    warning: "Do not treat accounting-system tagging alone as conclusive tax treatment."
  }),
  CWT_SUBSTANTIATION: Object.freeze({
    authorityNeeded: Object.freeze(["RR No. 2-98", "BIR Form 2307 rules", "NIRC income tax credit provisions", "jurisprudence on withholding tax credits"]),
    substituteProofOptions: Object.freeze(["BIR Form 2307", "SAWT", "income tax return", "sales/collection records", "withholding agent confirmation", "reconciliation schedule"]),
    proceduralDefenseTopics: Object.freeze(["documentary matching between certificates and returns"]),
    substantiveDefenseTopics: Object.freeze(["timeliness and receipt of withholding certificates", "substantiation of creditable withholding tax"]),
    warning: "Unsupported CWT claims require documentary matching; timing and receipt of certificates may require legal review."
  }),
  WITHHOLDING_TAX_DEDUCTIBILITY: Object.freeze({
    authorityNeeded: Object.freeze(["NIRC Sec. 34(K)", "RR No. 2-98", "withholding tax regulations", "jurisprudence on deductibility and withholding"]),
    substituteProofOptions: Object.freeze(["expense schedule", "supplier invoices", "withholding tax returns", "proof of remittance", "reconciliation of per-books vs. per-return amounts"]),
    proceduralDefenseTopics: Object.freeze(["basis for disallowance stated by BIR"]),
    substantiveDefenseTopics: Object.freeze(["deductibility conditioned on withholding compliance"]),
    warning: null
  }),
  INPUT_VAT_SUBSTANTIATION: Object.freeze({
    authorityNeeded: Object.freeze(["NIRC Sec. 110", "VAT invoicing requirements", "input VAT substantiation rules", "jurisprudence"]),
    substituteProofOptions: Object.freeze(["supplier invoices", "VAT registration support", "purchase journal", "input VAT schedule", "proof of payment if relevant", "VAT return reconciliation"]),
    proceduralDefenseTopics: Object.freeze(["documentary basis for input VAT disallowance"]),
    substantiveDefenseTopics: Object.freeze(["input VAT invoicing and substantiation compliance"]),
    warning: null
  }),
  DIVIDEND_FWT: Object.freeze({
    authorityNeeded: Object.freeze(["NIRC final withholding tax provisions", "dividend tax rules", "withholding remittance rules", "corporate records"]),
    substituteProofOptions: Object.freeze(["board resolution", "dividend declaration records", "shareholder ledger", "withholding tax return", "proof of remittance", "general ledger"]),
    proceduralDefenseTopics: Object.freeze([]),
    substantiveDefenseTopics: Object.freeze(["dividend characterization and withholding compliance"]),
    warning: null
  }),
  LOA_OR_ELA_AUTHORITY: Object.freeze({
    authorityNeeded: Object.freeze(["RMC No. 5-2026", "RMO No. 1-2026", "RMO No. 6-2026", "RMC No. 14-2026", "LOA/eLA jurisprudence"]),
    substituteProofOptions: Object.freeze([]),
    proceduralDefenseTopics: Object.freeze(["LOA/eLA authenticity and scope verification"]),
    substantiveDefenseTopics: Object.freeze([]),
    warning: "Do not conclude invalidity from the scaffold alone."
  }),
  REPLACEMENT_ELA: Object.freeze({
    authorityNeeded: Object.freeze(["RMC No. 5-2026", "RMO No. 1-2026", "RMO No. 6-2026", "RMC No. 14-2026", "LOA/eLA jurisprudence"]),
    substituteProofOptions: Object.freeze([]),
    proceduralDefenseTopics: Object.freeze(["replacement eLA continuity and proper service verification"]),
    substantiveDefenseTopics: Object.freeze([]),
    warning: "Do not conclude invalidity from the scaffold alone."
  }),
  CONSOLIDATED_NOTICE: Object.freeze({
    authorityNeeded: Object.freeze(["RMO No. 1-2026", "RMO No. 6-2026", "RMC No. 14-2026", "NIRC Sec. 228", "RR No. 18-2013"]),
    substituteProofOptions: Object.freeze([]),
    proceduralDefenseTopics: Object.freeze(["consolidation stage, service, and prior-notice review"]),
    substantiveDefenseTopics: Object.freeze([]),
    warning: "Consolidated notices require stage, service, prior notice, and deadline review."
  })
});

const DEFAULT_ISSUE_GUIDANCE = Object.freeze({
  authorityNeeded: Object.freeze(["Applicable NIRC provisions", "Applicable BIR issuances", "Applicable jurisprudence"]),
  substituteProofOptions: Object.freeze([]),
  proceduralDefenseTopics: Object.freeze(["due process and documentary basis review"]),
  substantiveDefenseTopics: Object.freeze(["substantiation and legal basis review"]),
  warning: null
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

function normalizeAssessmentIssueInput(issue) {
  const src = isPlainObject(issue) ? issue : {};
  const riskLevel = ["low", "medium", "high"].includes(src.riskLevel) ? src.riskLevel : "unknown";
  return {
    issueType: typeof src.issueType === "string" && SUPPORTED_ASSESSMENT_ISSUE_TYPES.includes(src.issueType) ? src.issueType : "UNKNOWN_ISSUE",
    birFinding: isNonBlankString(src.birFinding) ? src.birFinding.trim() : null,
    taxpayerPosition: isNonBlankString(src.taxpayerPosition) ? src.taxpayerPosition.trim() : null,
    documentsAvailable: normalizeStringArray(src.documentsAvailable),
    documentsMissing: normalizeStringArray(src.documentsMissing),
    authorityNeeded: normalizeStringArray(src.authorityNeeded),
    riskLevel
  };
}

/**
 * Recursively scans a value for prohibited PAN/FAN/FLD/protest workflow
 * claim phrases. Pure, synchronous, never mutates input, performs no I/O.
 *
 * @param {*} value
 * @returns {{hasProhibitedClaims: boolean, matches: string[]}}
 */
export function detectProhibitedPanFanFldProtestClaims(value) {
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
 * Normalizes candidate PAN/FAN/FLD/protest workflow input into a defensive,
 * fully-shaped object. Never mutates input; never throws. Always forces the
 * safe scaffold-only option values regardless of caller input --
 * validatePanFanFldProtestWorkflowInput() is the gate that flags an attempt
 * to request unsafe option values.
 *
 * @param {*} input
 * @returns {object}
 */
export function normalizePanFanFldProtestWorkflowInput(input) {
  const src = isPlainObject(input) ? input : {};
  const triageSrc = isPlainObject(src.triageResult) ? src.triageResult : {};
  const factsSrc = isPlainObject(src.knownFacts) ? src.knownFacts : {};
  const issuesSrc = Array.isArray(src.assessmentIssues) ? src.assessmentIssues : [];
  const noticeType = typeof src.noticeType === "string" && SUPPORTED_ASSESSMENT_NOTICE_TYPES.includes(src.noticeType) ? src.noticeType : null;

  return {
    userQuery: typeof src.userQuery === "string" ? src.userQuery.trim() : "",
    noticeType,
    triageResult: {
      noticeType: isNonBlankString(triageSrc.noticeType) ? triageSrc.noticeType.trim() : null,
      noticeStage: isNonBlankString(triageSrc.noticeStage) ? triageSrc.noticeStage.trim() : null,
      routingTargets: normalizeStringArray(triageSrc.routingTargets)
    },
    knownFacts: {
      dateIssued: isNonBlankString(factsSrc.dateIssued) ? factsSrc.dateIssued.trim() : null,
      dateReceived: isNonBlankString(factsSrc.dateReceived) ? factsSrc.dateReceived.trim() : null,
      taxablePeriod: isNonBlankString(factsSrc.taxablePeriod) ? factsSrc.taxablePeriod.trim() : null,
      taxTypes: normalizeStringArray(factsSrc.taxTypes),
      amountsPresent: factsSrc.amountsPresent === true,
      protestLanguagePresent: factsSrc.protestLanguagePresent === true,
      appealLanguagePresent: factsSrc.appealLanguagePresent === true,
      consolidatedNotice: factsSrc.consolidatedNotice === true,
      replacementElaIssue: factsSrc.replacementElaIssue === true,
      loaAuthorityIssue: factsSrc.loaAuthorityIssue === true,
      fddaReceived: factsSrc.fddaReceived === true,
      actionOnProtestReceived: factsSrc.actionOnProtestReceived === true,
      requestTypeKnown: factsSrc.requestTypeKnown === true,
      identifiesReinvestigation: factsSrc.identifiesReinvestigation === true,
      priorPanReceived: factsSrc.priorPanReceived === true,
      priorNodDodReceived: factsSrc.priorNodDodReceived === true,
      receiptDateKnown: factsSrc.receiptDateKnown === true,
      ctaInactionScenario: factsSrc.ctaInactionScenario === true,
      properlyServed: factsSrc.properlyServed === true
    },
    assessmentIssues: issuesSrc.map((issue) => normalizeAssessmentIssueInput(issue)),
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
 * Validates candidate PAN/FAN/FLD/protest workflow input. Never throws.
 * Rejects missing input, missing/empty userQuery+noticeType, an
 * unsupported noticeType, any attempt to request unsafe option values,
 * source cards claiming completed verification/final legal conclusion,
 * assessment issues claiming guaranteed cancellation or a final void/
 * invalid/cancelled conclusion, and any known real taxpayer/officer name,
 * real LOA/eLA/audit-case number, or exact real assessment amount from the
 * private reference corpus.
 *
 * @param {*} input
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validatePanFanFldProtestWorkflowInput(input) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(input)) {
    errors.push("input must be a plain object");
    return { valid: false, errors, warnings };
  }

  const userQuery = typeof input.userQuery === "string" ? input.userQuery.trim() : "";
  const noticeTypeRaw = typeof input.noticeType === "string" ? input.noticeType.trim() : "";
  if (userQuery.length === 0 && noticeTypeRaw.length === 0) {
    errors.push("userQuery and noticeType must not both be missing/empty");
  }

  if (input.noticeType !== undefined && !SUPPORTED_ASSESSMENT_NOTICE_TYPES.includes(input.noticeType)) {
    errors.push(`unsupported noticeType: ${JSON.stringify(input.noticeType)}`);
  }

  const options = isPlainObject(input.options) ? input.options : {};
  if (options.runtimeActive === true) errors.push("runtimeActive must not be true");
  if (options.scaffoldOnly === false) errors.push("scaffoldOnly must not be false");
  if (options.allowLegalConclusion === true) errors.push("allowLegalConclusion must not be true");
  if (options.allowLiveRetrieval === true) errors.push("allowLiveRetrieval must not be true");
  if (options.allowRealTaxpayerData === true) errors.push("allowRealTaxpayerData must not be true");
  if (options.generateFilingReadyDocument === true) errors.push("generateFilingReadyDocument must not be true");
  if (options.automaticSubmission === true) errors.push("automaticSubmission must not be true");

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

  const issues = Array.isArray(input.assessmentIssues) ? input.assessmentIssues : [];
  const guaranteedCancellationPattern = /guarantee[ds]?\s*(?:cancellation|to\s*(?:win|succeed))/i;
  const finalConclusionPattern = /\b(?:is|are)\s+(?:void|invalid|cancelled)\b/i;
  issues.forEach((issue, index) => {
    if (isPlainObject(issue)) {
      const combined = `${issue.birFinding || ""} ${issue.taxpayerPosition || ""}`;
      if (guaranteedCancellationPattern.test(combined)) errors.push(`assessmentIssues[${index}] must not claim guaranteed cancellation`);
      if (finalConclusionPattern.test(combined)) errors.push(`assessmentIssues[${index}] must not claim the assessment is void/invalid/cancelled as a final conclusion`);
    }
  });

  const combinedRaw = `${input.userQuery || ""} ${JSON.stringify(input.knownFacts || {})} ${JSON.stringify(input.assessmentIssues || [])}`;
  const realDataHit = containsRealDataFragments(combinedRaw);
  if (realDataHit) errors.push(`input must not contain a known real ${realDataHit} from uploaded materials`);

  return { valid: errors.length === 0, errors, warnings };
}

function defaultDeadlineSignals() {
  return {
    receiptDateKnown: false,
    dateIssuedKnown: false,
    panReply15DayPotential: false,
    fanFldProtest30DayPotential: false,
    reinvestigation60DayPotential: false,
    inaction180DayPotential: false,
    fddaAppeal30DayPotential: false,
    ctaInactionAppealPotential: false,
    freshPanResponsePeriodPotential: false,
    freshFanProtestPeriodPotential: false,
    deadlineComputationStatus: "not_computed",
    deadlineCannotBeComputedReason: null
  };
}

function defaultProceduralSafeguards() {
  return {
    dueProcessCheckNeeded: false,
    properServiceCheckNeeded: false,
    statementOfFactsAndLawCheckNeeded: false,
    loaOrElaAuthorityCheckNeeded: false,
    replacementElaCheckNeeded: false,
    consolidatedNoticeCheckNeeded: false,
    prescriptionCheckNeeded: false,
    noRegressionRuleCheckNeeded: false,
    priorNoticeConsistencyCheckNeeded: false
  };
}

function buildPanWorkflow() {
  return {
    workflowStage: "PAN_REPLY_STAGE",
    protestPath: "PAN_REPLY",
    deadline: { panReply15DayPotential: true },
    safeguards: { dueProcessCheckNeeded: true, statementOfFactsAndLawCheckNeeded: true, priorNoticeConsistencyCheckNeeded: true },
    safeWarnings: [
      "A PAN generally requires a timely response.",
      "Failure to respond may lead to FAN/FLD issuance and may weaken the taxpayer's procedural position.",
      "This scaffold does not determine the final deadline or legal sufficiency of the PAN."
    ],
    recommendedNextActions: [
      "Record date of receipt.",
      "Identify tax types and issues.",
      "Build issue-by-issue reply matrix.",
      "Match each BIR finding to taxpayer facts and documents.",
      "Prepare supporting documents.",
      "Preserve proof of filing.",
      "Do not ignore the PAN."
    ],
    authorityNeeds: { controllingAuthoritiesNeeded: ["NIRC Sec. 228"], birIssuancesNeeded: ["RR No. 18-2013"], jurisprudenceNeeded: [], ctaRulesNeeded: [], authorityStatus: "authority_limited" },
    protestStrategy: {
      requiredAttachments: ["Issue-by-issue reply matrix", "Supporting documents for each finding"],
      filingProofRequirements: ["Proof of filing of PAN reply"],
      monitoringEvents: ["FAN/FLD issuance"]
    }
  };
}

function buildConsolidatedPanWorkflow() {
  return {
    workflowStage: "PAN_REPLY_STAGE",
    protestPath: "PAN_REPLY",
    deadline: { panReply15DayPotential: true, freshPanResponsePeriodPotential: true },
    safeguards: { consolidatedNoticeCheckNeeded: true, properServiceCheckNeeded: true, noRegressionRuleCheckNeeded: true, priorNoticeConsistencyCheckNeeded: true },
    safeWarnings: ["A consolidated PAN may create a fresh response period only if proper service and consolidation safeguards apply."],
    recommendedNextActions: [
      "Record date of receipt.",
      "Confirm proper service of the consolidated PAN.",
      "Build an issue-by-issue reply matrix.",
      "Preserve proof of filing."
    ],
    authorityNeeds: {
      controllingAuthoritiesNeeded: ["NIRC Sec. 228"],
      birIssuancesNeeded: ["RMO No. 6-2026 consolidation safeguards", "RMO No. 1-2026 single-instance audit framework", "RR No. 18-2013"],
      jurisprudenceNeeded: [],
      ctaRulesNeeded: [],
      authorityStatus: "authority_required"
    },
    protestStrategy: {
      requiredAttachments: ["Issue-by-issue reply matrix", "Supporting documents for each finding"],
      filingProofRequirements: ["Proof of filing of consolidated PAN reply"],
      monitoringEvents: ["FAN/FLD issuance"]
    }
  };
}

function buildFanFldWorkflow(normalized) {
  const protestPath = normalized.knownFacts.requestTypeKnown && normalized.knownFacts.identifiesReinvestigation ? "REQUEST_FOR_REINVESTIGATION" : "HUMAN_REVIEW_REQUIRED";
  return {
    workflowStage: "FAN_FLD_PROTEST_STAGE",
    protestPath,
    deadline: {
      fanFldProtest30DayPotential: true,
      reinvestigation60DayPotential: true,
      inaction180DayPotential: true,
      fddaAppeal30DayPotential: true,
      ctaInactionAppealPotential: true
    },
    safeguards: {
      dueProcessCheckNeeded: true,
      properServiceCheckNeeded: true,
      statementOfFactsAndLawCheckNeeded: true,
      loaOrElaAuthorityCheckNeeded: normalized.knownFacts.loaAuthorityIssue === true,
      prescriptionCheckNeeded: true
    },
    safeWarnings: [
      "Failure to file a valid protest within the applicable period may cause finality risk.",
      "This scaffold does not determine whether the FAN/FLD is valid, final, void, or appealable."
    ],
    recommendedNextActions: [
      "Record date of receipt.",
      "Calendar the protest period for review.",
      "Determine whether reconsideration or reinvestigation is appropriate.",
      "Identify procedural defenses.",
      "Identify substantive tax defenses.",
      "Prepare an issue-by-issue protest matrix.",
      "Preserve proof of filing.",
      "Monitor FDDA, denial, or inaction.",
      "Escalate for professional legal/tax review."
    ],
    authorityNeeds: { controllingAuthoritiesNeeded: ["NIRC Sec. 228"], birIssuancesNeeded: ["RR No. 18-2013"], jurisprudenceNeeded: [], ctaRulesNeeded: [], authorityStatus: "authority_required" },
    protestStrategy: {
      requiredAttachments: ["Issue-by-issue protest matrix", "Supporting documents for each finding"],
      filingProofRequirements: ["Proof of filing of the protest"],
      monitoringEvents: ["FDDA", "denial", "inaction"]
    }
  };
}

function buildConsolidatedFanWorkflow() {
  return {
    workflowStage: "FAN_FLD_PROTEST_STAGE",
    protestPath: "HUMAN_REVIEW_REQUIRED",
    deadline: {
      fanFldProtest30DayPotential: true,
      freshFanProtestPeriodPotential: true,
      inaction180DayPotential: true,
      fddaAppeal30DayPotential: true,
      ctaInactionAppealPotential: true
    },
    safeguards: {
      consolidatedNoticeCheckNeeded: true,
      properServiceCheckNeeded: true,
      noRegressionRuleCheckNeeded: true,
      priorNoticeConsistencyCheckNeeded: true,
      prescriptionCheckNeeded: true
    },
    safeWarnings: ["Consolidated FAN treatment depends on valid service, non-finality, protest timing, written conformity, waiver of prescription where needed, and no-regression safeguards."],
    recommendedNextActions: [
      "Record date of receipt.",
      "Confirm proper service of the consolidated FAN.",
      "Prepare an issue-by-issue protest matrix.",
      "Preserve proof of filing.",
      "Escalate for professional legal/tax review."
    ],
    authorityNeeds: {
      controllingAuthoritiesNeeded: ["NIRC Sec. 228"],
      birIssuancesNeeded: ["RMO No. 6-2026 FAN-level consolidation safeguards", "RMO No. 1-2026 single-instance audit framework", "RR No. 18-2013"],
      jurisprudenceNeeded: [],
      ctaRulesNeeded: ["CTA appeal rules"],
      authorityStatus: "authority_required"
    },
    protestStrategy: {
      requiredAttachments: ["Issue-by-issue protest matrix", "Supporting documents for each finding"],
      filingProofRequirements: ["Proof of filing of the consolidated protest"],
      monitoringEvents: ["FDDA", "denial", "inaction"]
    }
  };
}

function buildReconsiderationWorkflow() {
  return {
    workflowStage: "FAN_FLD_PROTEST_STAGE",
    protestPath: "REQUEST_FOR_RECONSIDERATION",
    deadline: {},
    safeguards: {},
    safeWarnings: [
      "The proper protest path depends on facts and supporting documents; human review is required.",
      "This path generally does not require a new investigation of facts unless the facts themselves require it."
    ],
    recommendedNextActions: ["Preserve proof of filing.", "Monitor FDDA, denial, inaction, or re-evaluation."],
    authorityNeeds: { controllingAuthoritiesNeeded: ["NIRC Sec. 228"], birIssuancesNeeded: ["RR No. 18-2013"], jurisprudenceNeeded: [], ctaRulesNeeded: [], authorityStatus: "authority_required" },
    protestStrategy: {
      reconsiderationAppropriateWhen: ["the protest relies on existing records already submitted", "the protest relies on legal arguments only", "no new investigation of facts is required"],
      filingProofRequirements: ["Proof of filing of the request for reconsideration"],
      monitoringEvents: ["FDDA", "denial", "inaction", "re-evaluation"]
    }
  };
}

function buildReinvestigationWorkflow() {
  return {
    workflowStage: "REINVESTIGATION_DOCUMENT_SUBMISSION_STAGE",
    protestPath: "REQUEST_FOR_REINVESTIGATION",
    deadline: { reinvestigation60DayPotential: true, inaction180DayPotential: true, fddaAppeal30DayPotential: true, ctaInactionAppealPotential: true },
    safeguards: {},
    safeWarnings: ["Failure to submit relevant supporting documents within the applicable period may create finality risk."],
    recommendedNextActions: ["Track the supporting-document submission period.", "Preserve proof of filing and attachment submission.", "Monitor FDDA, denial, inaction, or re-evaluation."],
    authorityNeeds: { controllingAuthoritiesNeeded: ["NIRC Sec. 228"], birIssuancesNeeded: ["RR No. 18-2013"], jurisprudenceNeeded: [], ctaRulesNeeded: [], authorityStatus: "authority_required" },
    protestStrategy: {
      reinvestigationAppropriateWhen: ["additional evidence is needed", "newly submitted documents support the protest", "further factual examination is required"],
      filingProofRequirements: ["Proof of filing of the request for reinvestigation", "Proof of supporting-document submission"],
      monitoringEvents: ["FDDA", "denial", "inaction", "re-evaluation"]
    }
  };
}

function buildActionOnProtestWorkflow() {
  return {
    workflowStage: "ACTION_ON_PROTEST_STAGE",
    protestPath: "POST_PROTEST_REEVALUATION_MONITORING",
    deadline: {},
    safeguards: {},
    safeWarnings: [
      "Acceptance or grant of a protest request for re-evaluation does not automatically mean substantive cancellation.",
      "Do not treat the matter as substantively resolved without further authority and BIR action."
    ],
    recommendedNextActions: [
      "Confirm what the BIR granted or acted upon.",
      "Distinguish procedural acceptance from substantive cancellation.",
      "Monitor re-evaluation, amended assessment, denial, FDDA, or inaction.",
      "Keep proof of the original protest and attachments."
    ],
    authorityNeeds: { controllingAuthoritiesNeeded: ["NIRC Sec. 228"], birIssuancesNeeded: ["RR No. 18-2013"], jurisprudenceNeeded: [], ctaRulesNeeded: [], authorityStatus: "authority_limited" },
    protestStrategy: {
      monitoringEvents: ["re-evaluation result", "amended assessment", "denial", "FDDA", "inaction"],
      filingProofRequirements: ["Proof of the original protest filing and attachments"]
    }
  };
}

function buildFddaWorkflow() {
  return {
    workflowStage: "FDDA_RECEIVED_STAGE",
    protestPath: "FDDA_CTA_APPEAL_WATCH",
    deadline: { fddaAppeal30DayPotential: true },
    safeguards: { statementOfFactsAndLawCheckNeeded: true, properServiceCheckNeeded: true, dueProcessCheckNeeded: true },
    safeWarnings: ["FDDA receipt may trigger CTA appeal-watch.", "This scaffold does not determine the final appeal deadline or legal sufficiency of the FDDA."],
    recommendedNextActions: ["Record date of receipt.", "Calendar the CTA appeal-watch period for review.", "Preserve proof of the prior protest filing.", "Escalate for professional legal/tax review."],
    authorityNeeds: {
      controllingAuthoritiesNeeded: ["NIRC Sec. 228"],
      birIssuancesNeeded: ["RR No. 18-2013"],
      jurisprudenceNeeded: ["Jurisdictional appeal-period jurisprudence"],
      ctaRulesNeeded: ["CTA rules"],
      authorityStatus: "authority_required"
    },
    protestStrategy: {
      filingProofRequirements: ["Proof of the prior protest filing"],
      monitoringEvents: ["CTA appeal-watch period"]
    }
  };
}

function buildUnknownWorkflow() {
  return {
    workflowStage: "UNKNOWN_STAGE",
    protestPath: "NO_PROTEST_PATH_YET",
    deadline: {},
    safeguards: {},
    safeWarnings: ["This scaffold could not confidently classify the assessment notice type from the information provided.", "Escalate to professional review before taking any procedural action."],
    recommendedNextActions: ["Provide additional details or select a specific notice type if known.", "Escalate to professional review."],
    authorityNeeds: { controllingAuthoritiesNeeded: [], birIssuancesNeeded: [], jurisprudenceNeeded: [], ctaRulesNeeded: [], authorityStatus: "authority_required" },
    protestStrategy: {}
  };
}

const WORKFLOW_BUILDERS = Object.freeze({
  BIR_PAN: () => buildPanWorkflow(),
  BIR_CONSOLIDATED_PAN: () => buildConsolidatedPanWorkflow(),
  BIR_FAN: (n) => buildFanFldWorkflow(n),
  BIR_FLD: (n) => buildFanFldWorkflow(n),
  BIR_FAN_FLD: (n) => buildFanFldWorkflow(n),
  BIR_CONSOLIDATED_FAN: () => buildConsolidatedFanWorkflow(),
  BIR_FDDA: () => buildFddaWorkflow(),
  BIR_PROTEST_REQUEST_RECONSIDERATION: () => buildReconsiderationWorkflow(),
  BIR_PROTEST_REQUEST_REINVESTIGATION: () => buildReinvestigationWorkflow(),
  BIR_ACTION_ON_PROTEST: () => buildActionOnProtestWorkflow(),
  UNKNOWN_ASSESSMENT_NOTICE: () => buildUnknownWorkflow()
});

function buildAssessmentIssueMatrix(issues) {
  const list = issues.length > 0 ? issues : [normalizeAssessmentIssueInput({ issueType: "UNKNOWN_ISSUE" })];
  return list.map((issue) => {
    const guidance = ISSUE_TYPE_GUIDANCE[issue.issueType] || DEFAULT_ISSUE_GUIDANCE;
    return {
      issueType: issue.issueType,
      birFinding: issue.birFinding,
      taxpayerPosition: issue.taxpayerPosition,
      documentsAvailable: [...issue.documentsAvailable],
      documentsMissing: [...issue.documentsMissing],
      substituteProofOptions: [...guidance.substituteProofOptions],
      authorityNeeded: dedupe([...issue.authorityNeeded, ...guidance.authorityNeeded]),
      proceduralDefenseTopics: [...guidance.proceduralDefenseTopics],
      substantiveDefenseTopics: [...guidance.substantiveDefenseTopics],
      riskLevel: issue.riskLevel,
      humanReviewRequired: true
    };
  });
}

function collectIssueTypeWarnings(matrix) {
  const warnings = [];
  for (const item of matrix) {
    const guidance = ISSUE_TYPE_GUIDANCE[item.issueType];
    if (guidance && guidance.warning) warnings.push(guidance.warning);
  }
  return warnings;
}

/**
 * Builds a full PAN/FAN/FLD/protest workflow result for the given (raw or
 * normalized) input. Never throws. Always returns the full result shape
 * regardless of input validity -- callers should call
 * validatePanFanFldProtestWorkflowInput() beforehand to gate whether to
 * proceed. Performs no I/O, no network calls, no live retrieval, and
 * generates no filing-ready document; models workflow only.
 *
 * @param {*} input
 * @returns {object}
 */
export function createPanFanFldProtestWorkflowResult(input) {
  const normalized = normalizePanFanFldProtestWorkflowInput(input);

  const derivedFromTriage = SUPPORTED_ASSESSMENT_NOTICE_TYPES.includes(normalized.triageResult.noticeType) ? normalized.triageResult.noticeType : null;
  const noticeType = normalized.noticeType || derivedFromTriage || "UNKNOWN_ASSESSMENT_NOTICE";
  const confidence = normalized.noticeType ? "high" : derivedFromTriage ? "medium" : "low";
  const reasonCodes = normalized.noticeType ? ["explicit_notice_type"] : derivedFromTriage ? ["derived_from_triage_result"] : ["no_notice_type_defaulted_to_unknown"];

  const builder = WORKFLOW_BUILDERS[noticeType] || buildUnknownWorkflow;
  const built = builder(normalized);

  let workflowStage = built.workflowStage;
  let protestPath = built.protestPath;
  const deadlineSignals = { ...defaultDeadlineSignals(), ...built.deadline };
  const proceduralSafeguards = { ...defaultProceduralSafeguards(), ...built.safeguards };
  let safeWarnings = [...built.safeWarnings];
  const recommendedNextActions = [...built.recommendedNextActions];

  if (normalized.knownFacts.ctaInactionScenario === true) {
    workflowStage = "CTA_APPEAL_WATCH_STAGE";
    protestPath = "CTA_INACTION_APPEAL_WATCH";
    deadlineSignals.inaction180DayPotential = true;
    deadlineSignals.ctaInactionAppealPotential = true;
    safeWarnings = [
      ...safeWarnings,
      "Inaction appeal strategy depends on filing date, protest type, supporting document submission, and controlling CTA rules; human review is required."
    ];
  }

  deadlineSignals.receiptDateKnown = Boolean(normalized.knownFacts.dateReceived) || normalized.knownFacts.receiptDateKnown === true;
  deadlineSignals.dateIssuedKnown = Boolean(normalized.knownFacts.dateIssued);
  if (!deadlineSignals.receiptDateKnown) {
    deadlineSignals.deadlineComputationStatus = "facts_missing";
    deadlineSignals.deadlineCannotBeComputedReason = "date of receipt not provided";
  } else {
    deadlineSignals.deadlineComputationStatus = "rule_identified_no_final_deadline";
  }

  const assessmentIssueMatrix = buildAssessmentIssueMatrix(normalized.assessmentIssues);
  const issueTypeWarnings = collectIssueTypeWarnings(assessmentIssueMatrix);
  safeWarnings = dedupe([...safeWarnings, ...issueTypeWarnings]);

  const authorityNeeds = {
    controllingAuthoritiesNeeded: dedupe(built.authorityNeeds.controllingAuthoritiesNeeded || []),
    jurisprudenceNeeded: dedupe(built.authorityNeeds.jurisprudenceNeeded || []),
    birIssuancesNeeded: dedupe(built.authorityNeeds.birIssuancesNeeded || []),
    ctaRulesNeeded: dedupe(built.authorityNeeds.ctaRulesNeeded || []),
    authorityStatus: built.authorityNeeds.authorityStatus || "authority_limited"
  };

  const protestStrategy = {
    recommendedPath: protestPath,
    reconsiderationAppropriateWhen: built.protestStrategy.reconsiderationAppropriateWhen || [],
    reinvestigationAppropriateWhen: built.protestStrategy.reinvestigationAppropriateWhen || [],
    requiredAttachments: built.protestStrategy.requiredAttachments || [],
    filingProofRequirements: built.protestStrategy.filingProofRequirements || ["Proof of filing (receiving stamp or acknowledgment)"],
    monitoringEvents: built.protestStrategy.monitoringEvents || ["FDDA", "denial", "amended assessment", "inaction"],
    prohibitedOverreach: built.protestStrategy.prohibitedOverreach || [
      "Do not treat this workflow model as a final legal conclusion.",
      "Do not generate a filing-ready protest document from this scaffold."
    ]
  };

  const combinedSourceCards = [...deepClone(normalized.sourceCards), ...deepClone(BASE_SOURCE_CARDS)];

  return {
    phase: "09N",
    mode: PAN_FAN_FLD_PROTEST_WORKFLOW_MODE_ID,
    version: PHASE_09N_PAN_FAN_FLD_PROTEST_WORKFLOW_VERSION,
    runtimeActive: false,
    workflow: { noticeType, workflowStage, protestPath, confidence, reasonCodes },
    deadlineSignals,
    assessmentIssueMatrix,
    protestStrategy,
    proceduralSafeguards,
    authorityNeeds,
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
 * Validates a candidate PAN/FAN/FLD/protest workflow result object. Never
 * throws.
 *
 * @param {*} result
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validatePanFanFldProtestWorkflowResult(result) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(result)) {
    errors.push("result must be a plain object");
    return { valid: false, errors, warnings };
  }

  if (!isNonBlankString(result.phase)) errors.push("phase is required");
  if (!isNonBlankString(result.mode)) errors.push("mode is required");
  if (result.runtimeActive !== false) errors.push("runtimeActive must be false");

  if (!isPlainObject(result.workflow)) {
    errors.push("workflow is required");
  } else {
    if (!isNonBlankString(result.workflow.noticeType)) errors.push("workflow.noticeType is required");
    else if (!SUPPORTED_ASSESSMENT_NOTICE_TYPES.includes(result.workflow.noticeType)) errors.push(`unsupported workflow.noticeType: ${result.workflow.noticeType}`);

    if (!isNonBlankString(result.workflow.workflowStage)) errors.push("workflow.workflowStage is required");
    else if (!SUPPORTED_PROTEST_WORKFLOW_STAGES.includes(result.workflow.workflowStage)) errors.push(`unsupported workflow.workflowStage: ${result.workflow.workflowStage}`);

    if (!isNonBlankString(result.workflow.protestPath)) errors.push("workflow.protestPath is required");
    else if (!SUPPORTED_PROTEST_PATHS.includes(result.workflow.protestPath)) errors.push(`unsupported workflow.protestPath: ${result.workflow.protestPath}`);
  }

  if (!isPlainObject(result.deadlineSignals)) errors.push("deadlineSignals is required");

  if (!Array.isArray(result.assessmentIssueMatrix)) errors.push("assessmentIssueMatrix must be an array");

  if (!isPlainObject(result.protestStrategy)) errors.push("protestStrategy is required");
  if (!isPlainObject(result.proceduralSafeguards)) errors.push("proceduralSafeguards is required");
  if (!isPlainObject(result.authorityNeeds)) errors.push("authorityNeeds is required");
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
  if (metadata.filingReadyDocumentGenerated !== false) errors.push("metadata.filingReadyDocumentGenerated must be false");
  if (metadata.automaticSubmission !== false) errors.push("metadata.automaticSubmission must be false");
  if (metadata.finalOutcomeGuaranteed !== false) errors.push("metadata.finalOutcomeGuaranteed must be false");

  const claimCheck = detectProhibitedPanFanFldProtestClaims(result);
  if (claimCheck.hasProhibitedClaims) errors.push(`prohibited claims detected in result: ${claimCheck.matches.join(", ")}`);

  const leakCheck = detectRealDataLeak(result);
  if (leakCheck.hasRealDataLeak) errors.push(`real data leak detected in result: ${leakCheck.matches.join(", ")}`);

  return { valid: errors.length === 0, errors, warnings };
}
