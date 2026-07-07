// FILE: workflow/bir-audit-defense-matrix.js
// PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1
//
// Pure, dependency-free, standalone scaffold structuring Philippine BIR
// audit-defense issues into a professional matrix connecting BIR findings,
// taxpayer facts, documents, missing evidence, substitute proof, procedural
// defenses, substantive defenses, authority needs, risk level, and
// recommended safe next actions. This module has NO I/O, NO network calls,
// NO Supabase/OpenAI/Google Drive/n8n/Firecrawl/Crawlee/MCP dependency, NO
// web search, NO browser automation, NO OCR, NO filesystem access, NO
// process.env dependency, NO Date.now/randomness, and NO side effects. It
// imports nothing from any other module in this repository. It performs no
// live authority retrieval, generates no filing-ready protest, BIR
// submission, CTA pleading, or tax memo, never submits anything, stores
// nothing, mutates no global state, and is not wired into ask-handler.js,
// pipeline.js, server.js, routes, authentication, or the frontend. It
// models defense strategy; it does not decide the defense. It never
// produces a final legal conclusion and never claims an LOA, eLA, PAN, FAN,
// FLD, FDDA, assessment, protest, or BIR action is void, invalid, cancelled,
// final, enforceable, appealable, or legally conclusive.

"use strict";

export const PHASE_09O_BIR_AUDIT_DEFENSE_MATRIX_VERSION = "PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1";

export const BIR_AUDIT_DEFENSE_MATRIX_MODE_ID = "bir_audit_defense_matrix";

export const SUPPORTED_DEFENSE_MATRIX_ISSUE_TYPES = Object.freeze([
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
  "DOCUMENT_REQUEST_SCOPE",
  "SUBPOENA_OR_PRE_SUBPOENA",
  "NOD_DOD_PROCESS",
  "PAN_REPLY",
  "FAN_FLD_PROTEST",
  "FDDA_APPEAL_WATCH",
  "TERMINATION_LETTER_SCOPE",
  "UNKNOWN_ISSUE"
]);

export const SUPPORTED_DEFENSE_MATRIX_RISK_LEVELS = Object.freeze(["low", "medium", "high", "critical", "unknown"]);

export const SUPPORTED_DEFENSE_MATRIX_EVIDENCE_STATUSES = Object.freeze([
  "available",
  "partial",
  "missing",
  "not_applicable",
  "non_existent",
  "substitute_available",
  "requires_reconciliation",
  "unknown"
]);

export const SUPPORTED_DEFENSE_MATRIX_ROUTES = Object.freeze([
  "AUTHORITY_SAFE_PROCEDURAL_FALLBACK",
  "BIR_NOTICE_TRIAGE",
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
  "This scaffold provides procedural-safe matrix guidance only and does not constitute a final legal or tax conclusion. The available facts are insufficient for a final legal conclusion; this matter should be reviewed against applicable BIR issuances and jurisprudence by a qualified tax professional before any filing deadline.";

const BASE_SOURCE_CARDS = Object.freeze([
  Object.freeze({
    label: "RR No. 18-2013 assessment protest procedure reference",
    sourceType: "BIR regulation",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for PAN reply, FAN/FLD protest, reconsideration, reinvestigation, and CTA appeal-watch rules. This scaffold does not perform live verification."
  }),
  Object.freeze({
    label: "NIRC Sec. 228 assessment due process reference",
    sourceType: "Tax Code",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for assessment notices stating facts, law, rules, regulations, or jurisprudence. This scaffold does not provide final legal conclusions."
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
    label: "RMC No. 14-2026 replacement eLA and consolidation clarification",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for replacement eLA continuity, prior LOA/eLA validity, and consolidation transition issues."
  }),
  Object.freeze({
    label: "RMC No. 5-2026 LOA/eLA verification reference",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Use BIR REVIE / LOA Verifier workflow when authority corpus is wired. This scaffold does not perform live verification."
  }),
  Object.freeze({
    label: "Uploaded professional audit-defense workflow reference pattern",
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
  "the deadline is definitely"
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
  "notice_validity_determination",
  "assessment_finality_determination",
  "protest_outcome_guarantee",
  "final_legal_opinion",
  "filing_ready_document_generation",
  "automatic_submission_determination"
]);

const RECEIVING_PROOF_BASELINE = Object.freeze(["Proof of filing/submission with receiving stamp or acknowledgment"]);

const ISSUE_TYPE_GUIDANCE = Object.freeze({
  VAT_EXEMPT_VS_ZERO_RATED: Object.freeze({
    authorityNeeded: Object.freeze(["NIRC VAT provisions", "BIR VAT zero-rating rules", "PEZA / export rules if applicable", "VAT invoicing/substantiation rules", "CTA / Supreme Court jurisprudence"]),
    substituteProofOptions: Object.freeze([
      "sales invoices",
      "contracts",
      "client registration/support",
      "PEZA or incentive documents if applicable",
      "export/foreign currency/remittance support if applicable",
      "SLSP reconciliation",
      "VAT return reconciliation"
    ]),
    reconciliationHints: Object.freeze(["SLSP reconciliation", "VAT return reconciliation"]),
    proceduralDefenseTopics: Object.freeze(["due process on discrepancy characterization", "stated legal/factual basis for reclassification"]),
    substantiveDefenseTopics: Object.freeze(["VAT invoicing compliance", "zero-rating/exemption documentary support", "sales classification basis"]),
    recommendedSafeAction: Object.freeze(["Gather sales invoices and supporting contracts.", "Reconcile SLSP and VAT return figures.", "Escalate classification basis to professional review."]),
    warning: "Do not treat accounting-system tagging alone as conclusive tax treatment."
  }),
  CWT_SUBSTANTIATION: Object.freeze({
    authorityNeeded: Object.freeze(["RR No. 2-98", "BIR Form 2307 rules", "NIRC income tax credit provisions", "jurisprudence on withholding tax credits"]),
    substituteProofOptions: Object.freeze(["BIR Form 2307", "SAWT", "income tax return", "sales/collection records", "withholding agent confirmation", "reconciliation schedule"]),
    reconciliationHints: Object.freeze(["reconciliation schedule"]),
    proceduralDefenseTopics: Object.freeze(["documentary matching between certificates and returns"]),
    substantiveDefenseTopics: Object.freeze(["timeliness and receipt of withholding certificates", "substantiation of creditable withholding tax"]),
    recommendedSafeAction: Object.freeze(["Collect BIR Form 2307 and SAWT records.", "Reconcile CWT claimed against the income tax return.", "Escalate timing/receipt issues to professional review."]),
    warning: "Unsupported CWT claims require documentary matching; timing and receipt of certificates may require legal review."
  }),
  WITHHOLDING_TAX_DEDUCTIBILITY: Object.freeze({
    authorityNeeded: Object.freeze(["NIRC Sec. 34(K)", "RR No. 2-98", "withholding tax regulations", "jurisprudence on deductibility and withholding"]),
    substituteProofOptions: Object.freeze(["expense schedule", "supplier invoices", "withholding tax returns", "proof of remittance", "reconciliation of per-books vs. per-return amounts"]),
    reconciliationHints: Object.freeze(["reconciliation of per-books vs. per-return amounts"]),
    proceduralDefenseTopics: Object.freeze(["basis for disallowance stated by BIR"]),
    substantiveDefenseTopics: Object.freeze(["deductibility conditioned on withholding compliance"]),
    recommendedSafeAction: Object.freeze(["Gather expense schedule and supplier invoices.", "Reconcile per-books vs. per-return withholding amounts.", "Escalate deductibility basis to professional review."]),
    warning: null
  }),
  INPUT_VAT_SUBSTANTIATION: Object.freeze({
    authorityNeeded: Object.freeze(["NIRC Sec. 110", "VAT invoicing requirements", "input VAT substantiation rules", "jurisprudence"]),
    substituteProofOptions: Object.freeze(["supplier invoices", "VAT registration support", "purchase journal", "input VAT schedule", "proof of payment if relevant", "VAT return reconciliation"]),
    reconciliationHints: Object.freeze(["VAT return reconciliation"]),
    proceduralDefenseTopics: Object.freeze(["documentary basis for input VAT disallowance"]),
    substantiveDefenseTopics: Object.freeze(["input VAT invoicing and substantiation compliance"]),
    recommendedSafeAction: Object.freeze(["Gather supplier invoices and purchase journal.", "Reconcile input VAT schedule against VAT returns.", "Escalate invoicing compliance issues to professional review."]),
    warning: null
  }),
  DIVIDEND_FWT: Object.freeze({
    authorityNeeded: Object.freeze(["NIRC final withholding tax provisions", "dividend tax rules", "withholding remittance rules", "corporate records"]),
    substituteProofOptions: Object.freeze(["board resolution", "dividend declaration records", "shareholder ledger", "withholding tax return", "proof of remittance", "general ledger"]),
    reconciliationHints: Object.freeze([]),
    proceduralDefenseTopics: Object.freeze([]),
    substantiveDefenseTopics: Object.freeze(["dividend characterization and withholding compliance"]),
    recommendedSafeAction: Object.freeze(["Gather board resolution and dividend declaration records.", "Confirm withholding tax remittance.", "Escalate dividend characterization to professional review."]),
    warning: null
  }),
  LOA_OR_ELA_AUTHORITY: Object.freeze({
    authorityNeeded: Object.freeze(["RMC No. 5-2026", "RMO No. 1-2026", "RMO No. 6-2026", "RMC No. 14-2026", "LOA/eLA jurisprudence"]),
    substituteProofOptions: Object.freeze([]),
    reconciliationHints: Object.freeze([]),
    proceduralDefenseTopics: Object.freeze(["LOA/eLA authenticity and scope verification"]),
    substantiveDefenseTopics: Object.freeze([]),
    recommendedSafeAction: Object.freeze(["Verify LOA/eLA authenticity and scope.", "Escalate to professional review before relying on this classification."]),
    warning: "Do not conclude invalidity from the scaffold alone."
  }),
  REPLACEMENT_ELA: Object.freeze({
    authorityNeeded: Object.freeze(["RMC No. 5-2026", "RMO No. 1-2026", "RMO No. 6-2026", "RMC No. 14-2026", "LOA/eLA jurisprudence"]),
    substituteProofOptions: Object.freeze([]),
    reconciliationHints: Object.freeze([]),
    proceduralDefenseTopics: Object.freeze(["replacement eLA continuity and proper service verification"]),
    substantiveDefenseTopics: Object.freeze([]),
    recommendedSafeAction: Object.freeze(["Verify replacement eLA continuity and proper service.", "Escalate to professional review before relying on this classification."]),
    warning: "Do not conclude invalidity from the scaffold alone."
  }),
  CONSOLIDATED_NOTICE: Object.freeze({
    authorityNeeded: Object.freeze(["RMO No. 1-2026", "RMO No. 6-2026", "RMC No. 14-2026", "NIRC Sec. 228", "RR No. 18-2013"]),
    substituteProofOptions: Object.freeze([]),
    reconciliationHints: Object.freeze([]),
    proceduralDefenseTopics: Object.freeze(["consolidation stage, service, and prior-notice review"]),
    substantiveDefenseTopics: Object.freeze([]),
    recommendedSafeAction: Object.freeze(["Confirm consolidation stage and proper service.", "Check prior-notice consistency and fresh response/protest period.", "Escalate to professional review."]),
    warning: "Consolidated notices require stage, service, prior notice, and deadline review."
  }),
  DOCUMENT_REQUEST_SCOPE: Object.freeze({
    authorityNeeded: Object.freeze(["RMO No. 1-2026 standardized checklist and request-limit rules"]),
    substituteProofOptions: Object.freeze([]),
    reconciliationHints: Object.freeze([]),
    proceduralDefenseTopics: Object.freeze(["relevance, necessity, and audit-scope basis for the request", "voluminous-record/on-premise/certified-copy review"]),
    substantiveDefenseTopics: Object.freeze([]),
    recommendedSafeAction: Object.freeze(["Classify each requested item against audit scope.", "Check relevance, necessity, and documentation of the request.", "Escalate voluminous-record handling to professional review."]),
    warning: "Do not assume every additional document request is automatically within audit scope."
  }),
  PAN_REPLY: Object.freeze({
    authorityNeeded: Object.freeze(["RR No. 18-2013", "NIRC Sec. 228"]),
    substituteProofOptions: Object.freeze([]),
    reconciliationHints: Object.freeze([]),
    proceduralDefenseTopics: Object.freeze(["15-day reply period review", "prior NOD/DOD consistency"]),
    substantiveDefenseTopics: Object.freeze([]),
    recommendedSafeAction: Object.freeze(["Build an issue-by-issue reply matrix.", "Check prior NOD/DOD consistency.", "Preserve proof of filing."]),
    warning: "This scaffold does not determine the final reply deadline or legal sufficiency of the PAN."
  }),
  FAN_FLD_PROTEST: Object.freeze({
    authorityNeeded: Object.freeze(["RR No. 18-2013", "NIRC Sec. 228", "CTA appeal rules"]),
    substituteProofOptions: Object.freeze([]),
    reconciliationHints: Object.freeze([]),
    proceduralDefenseTopics: Object.freeze(["30-day protest period review", "reconsideration vs. reinvestigation path", "60-day reinvestigation document period", "180-day inaction watch", "FDDA/CTA watch"]),
    substantiveDefenseTopics: Object.freeze([]),
    recommendedSafeAction: Object.freeze(["Determine whether reconsideration or reinvestigation is appropriate.", "Track the 60-day reinvestigation document period if applicable.", "Monitor FDDA, denial, or inaction."]),
    warning: "This scaffold does not determine whether the FAN/FLD is valid, final, void, or appealable."
  }),
  FDDA_APPEAL_WATCH: Object.freeze({
    authorityNeeded: Object.freeze(["NIRC Sec. 228", "RR No. 18-2013", "CTA rules", "jurisdictional appeal-period jurisprudence"]),
    substituteProofOptions: Object.freeze([]),
    reconciliationHints: Object.freeze([]),
    proceduralDefenseTopics: Object.freeze(["CTA appeal-watch", "proper service", "statement of facts and law", "jurisdictional deadline review"]),
    substantiveDefenseTopics: Object.freeze([]),
    recommendedSafeAction: Object.freeze(["Calendar the CTA appeal-watch period for review.", "Confirm proper service of the FDDA.", "Escalate to professional legal/tax review."]),
    warning: "This scaffold does not determine the final appeal deadline or legal sufficiency of the FDDA."
  }),
  TERMINATION_LETTER_SCOPE: Object.freeze({
    authorityNeeded: Object.freeze(["Applicable RMO/RR on audit closure and reopening grounds"]),
    substituteProofOptions: Object.freeze([]),
    reconciliationHints: Object.freeze([]),
    proceduralDefenseTopics: Object.freeze(["matching closure to LOA/eLA, tax period, and tax types", "without-prejudice language review"]),
    substantiveDefenseTopics: Object.freeze([]),
    recommendedSafeAction: Object.freeze(["Match the termination letter to its covered LOA/eLA, period, and tax types.", "Retain payment proof and related records permanently."]),
    warning: "Do not treat a termination letter as blanket clearance for unrelated periods, tax types, fraud, false returns, or refund issues."
  })
});

// EXPANDED_WITHHOLDING_TAX and PEZA_ZERO_RATING share guidance with their
// closest dedicated issue type per the required matrix rules.
const ISSUE_TYPE_ALIASES = Object.freeze({
  EXPANDED_WITHHOLDING_TAX: "WITHHOLDING_TAX_DEDUCTIBILITY",
  PEZA_ZERO_RATING: "VAT_EXEMPT_VS_ZERO_RATED"
});

const DEFAULT_ISSUE_GUIDANCE = Object.freeze({
  authorityNeeded: Object.freeze(["Applicable NIRC provisions", "Applicable BIR issuances", "Applicable jurisprudence"]),
  substituteProofOptions: Object.freeze([]),
  reconciliationHints: Object.freeze([]),
  proceduralDefenseTopics: Object.freeze(["due process and documentary basis review"]),
  substantiveDefenseTopics: Object.freeze(["substantiation and legal basis review"]),
  recommendedSafeAction: Object.freeze(["Gather relevant supporting documents.", "Escalate to professional review."]),
  warning: null
});

function resolveIssueGuidance(issueType) {
  const canonical = ISSUE_TYPE_ALIASES[issueType] || issueType;
  return ISSUE_TYPE_GUIDANCE[canonical] || DEFAULT_ISSUE_GUIDANCE;
}

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

function normalizeFindingInput(finding) {
  const src = isPlainObject(finding) ? finding : {};
  const issueType = typeof src.issueType === "string" && SUPPORTED_DEFENSE_MATRIX_ISSUE_TYPES.includes(src.issueType) ? src.issueType : "UNKNOWN_ISSUE";
  const riskLevel = SUPPORTED_DEFENSE_MATRIX_RISK_LEVELS.includes(src.riskLevel) ? src.riskLevel : "unknown";
  const evidenceStatus = SUPPORTED_DEFENSE_MATRIX_EVIDENCE_STATUSES.includes(src.evidenceStatus) ? src.evidenceStatus : "unknown";
  return {
    issueType,
    birFinding: isNonBlankString(src.birFinding) ? src.birFinding.trim() : null,
    taxpayerPosition: isNonBlankString(src.taxpayerPosition) ? src.taxpayerPosition.trim() : null,
    amountPresent: src.amountPresent === true,
    documentsAvailable: normalizeStringArray(src.documentsAvailable),
    documentsMissing: normalizeStringArray(src.documentsMissing),
    evidenceStatus,
    authorityNeeded: normalizeStringArray(src.authorityNeeded),
    proceduralDefenseTopics: normalizeStringArray(src.proceduralDefenseTopics),
    substantiveDefenseTopics: normalizeStringArray(src.substantiveDefenseTopics),
    riskLevel
  };
}

/**
 * Recursively scans a value for prohibited BIR audit-defense matrix claim
 * phrases. Pure, synchronous, never mutates input, performs no I/O.
 *
 * @param {*} value
 * @returns {{hasProhibitedClaims: boolean, matches: string[]}}
 */
export function detectProhibitedBirAuditDefenseMatrixClaims(value) {
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
 * Normalizes candidate BIR audit defense matrix input into a defensive,
 * fully-shaped object. Never mutates input; never throws. Always forces the
 * safe scaffold-only option values regardless of caller input --
 * validateBirAuditDefenseMatrixInput() is the gate that flags an attempt to
 * request unsafe option values.
 *
 * @param {*} input
 * @returns {object}
 */
export function normalizeBirAuditDefenseMatrixInput(input) {
  const src = isPlainObject(input) ? input : {};
  const contextSrc = isPlainObject(src.workflowContext) ? src.workflowContext : {};
  const findingsSrc = Array.isArray(src.findings) ? src.findings : [];

  return {
    userQuery: typeof src.userQuery === "string" ? src.userQuery.trim() : "",
    workflowContext: {
      noticeType: isNonBlankString(contextSrc.noticeType) ? contextSrc.noticeType.trim() : null,
      noticeStage: isNonBlankString(contextSrc.noticeStage) ? contextSrc.noticeStage.trim() : null,
      taxablePeriod: isNonBlankString(contextSrc.taxablePeriod) ? contextSrc.taxablePeriod.trim() : null,
      taxTypes: normalizeStringArray(contextSrc.taxTypes),
      receiptDateKnown: contextSrc.receiptDateKnown === true,
      deadlineSignalsKnown: contextSrc.deadlineSignalsKnown === true,
      consolidatedNotice: contextSrc.consolidatedNotice === true,
      replacementElaIssue: contextSrc.replacementElaIssue === true,
      loaAuthorityIssue: contextSrc.loaAuthorityIssue === true
    },
    findings: findingsSrc.map((finding) => normalizeFindingInput(finding)),
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
 * Validates candidate BIR audit defense matrix input. Never throws. Rejects
 * missing input, missing userQuery+findings, unsupported issueType/risk/
 * evidenceStatus values, any attempt to request unsafe option values,
 * filing-ready-output requests, source cards claiming completed
 * verification/final legal conclusion, findings claiming guaranteed
 * cancellation or a final void/invalid/cancelled conclusion, and any known
 * real taxpayer/officer name, real LOA/eLA/audit-case number, or exact real
 * assessment amount from the private reference corpus.
 *
 * @param {*} input
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateBirAuditDefenseMatrixInput(input) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(input)) {
    errors.push("input must be a plain object");
    return { valid: false, errors, warnings };
  }

  const userQuery = typeof input.userQuery === "string" ? input.userQuery.trim() : "";
  const findings = Array.isArray(input.findings) ? input.findings : [];
  if (userQuery.length === 0 && findings.length === 0) {
    errors.push("userQuery and findings must not both be missing/empty");
  }

  const filingReadyRequestPattern = /generate\s+(?:a\s+)?filing-ready|prepare\s+(?:a\s+)?filing-ready|filing-ready\s+(?:protest|document|submission)/i;
  if (filingReadyRequestPattern.test(userQuery)) {
    errors.push("input must not request a filing-ready document");
  }

  findings.forEach((finding, index) => {
    if (!isPlainObject(finding)) return;
    if (finding.issueType !== undefined && !SUPPORTED_DEFENSE_MATRIX_ISSUE_TYPES.includes(finding.issueType)) {
      errors.push(`findings[${index}] unsupported issueType: ${JSON.stringify(finding.issueType)}`);
    }
    if (finding.riskLevel !== undefined && !SUPPORTED_DEFENSE_MATRIX_RISK_LEVELS.includes(finding.riskLevel)) {
      errors.push(`findings[${index}] unsupported riskLevel: ${JSON.stringify(finding.riskLevel)}`);
    }
    if (finding.evidenceStatus !== undefined && !SUPPORTED_DEFENSE_MATRIX_EVIDENCE_STATUSES.includes(finding.evidenceStatus)) {
      errors.push(`findings[${index}] unsupported evidenceStatus: ${JSON.stringify(finding.evidenceStatus)}`);
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

  const guaranteedCancellationPattern = /guarantee[ds]?\s*(?:cancellation|to\s*(?:win|succeed))/i;
  const finalConclusionPattern = /\b(?:is|are)\s+(?:void|invalid|cancelled|final)\b/i;
  findings.forEach((finding, index) => {
    if (isPlainObject(finding)) {
      const combined = `${finding.birFinding || ""} ${finding.taxpayerPosition || ""}`;
      if (guaranteedCancellationPattern.test(combined)) errors.push(`findings[${index}] must not claim guaranteed cancellation`);
      if (finalConclusionPattern.test(combined)) errors.push(`findings[${index}] must not claim the assessment is void/invalid/cancelled/final as a final conclusion`);
    }
  });

  const combinedRaw = `${input.userQuery || ""} ${JSON.stringify(input.workflowContext || {})} ${JSON.stringify(input.findings || [])}`;
  const realDataHit = containsRealDataFragments(combinedRaw);
  if (realDataHit) errors.push(`input must not contain a known real ${realDataHit} from uploaded materials`);

  return { valid: errors.length === 0, errors, warnings };
}

function buildDefenseMatrixRow(finding) {
  const guidance = resolveIssueGuidance(finding.issueType);
  const needsReconciliation = ["partial", "requires_reconciliation", "missing"].includes(finding.evidenceStatus);
  const riskReason =
    finding.evidenceStatus === "missing" || finding.evidenceStatus === "non_existent"
      ? "documentary support is missing or non-existent for this issue"
      : finding.riskLevel === "unknown"
        ? "insufficient information to assess risk level"
        : "risk level as assessed from provided facts, pending professional review";

  return {
    issueType: finding.issueType,
    birFinding: finding.birFinding,
    taxpayerPosition: finding.taxpayerPosition,
    documentsAvailable: [...finding.documentsAvailable],
    documentsMissing: [...finding.documentsMissing],
    substituteProofOptions: [...guidance.substituteProofOptions],
    evidenceStatus: finding.evidenceStatus,
    reconciliationNeeded: needsReconciliation ? [...guidance.reconciliationHints] : [],
    authorityNeeded: dedupe([...finding.authorityNeeded, ...guidance.authorityNeeded]),
    jurisprudenceNeeded: guidance.authorityNeeded.filter((item) => /jurisprudence/i.test(item)),
    proceduralDefenseTopics: dedupe([...finding.proceduralDefenseTopics, ...guidance.proceduralDefenseTopics]),
    substantiveDefenseTopics: dedupe([...finding.substantiveDefenseTopics, ...guidance.substantiveDefenseTopics]),
    riskLevel: finding.riskLevel,
    riskReason,
    recommendedSafeAction: [...guidance.recommendedSafeAction],
    prohibitedOverreach: ["Do not conclude this issue is resolved in the taxpayer's favor.", "Do not treat this matrix entry as a final legal conclusion."],
    humanReviewRequired: true
  };
}

function collectIssueTypeWarnings(matrix) {
  const warnings = [];
  for (const item of matrix) {
    const guidance = resolveIssueGuidance(item.issueType);
    if (guidance.warning) warnings.push(guidance.warning);
  }
  return dedupe(warnings);
}

function buildEvidencePlan(matrix) {
  const documentsToSubmit = dedupe(matrix.flatMap((item) => item.documentsAvailable));
  const documentsToReconcile = dedupe(matrix.flatMap((item) => item.reconciliationNeeded));
  const substituteProofToPrepare = dedupe(
    matrix.filter((item) => ["missing", "partial", "non_existent"].includes(item.evidenceStatus)).flatMap((item) => item.substituteProofOptions)
  );
  const nonApplicableItemsToExplain = dedupe(
    matrix.filter((item) => ["not_applicable", "non_existent"].includes(item.evidenceStatus)).map((item) => `${item.issueType}: not applicable / non-existent documentation`)
  );
  const gapsToEscalate = dedupe(
    matrix
      .filter((item) => ["missing", "non_existent"].includes(item.evidenceStatus) || item.riskLevel === "high" || item.riskLevel === "critical")
      .map((item) => item.issueType)
  );

  return {
    documentsToSubmit,
    documentsToReconcile,
    substituteProofToPrepare,
    nonApplicableItemsToExplain,
    receivingProofNeeded: [...RECEIVING_PROOF_BASELINE],
    gapsToEscalate
  };
}

function buildProceduralDefensePlan(matrix, workflowContext) {
  const issueTypes = new Set(matrix.map((item) => item.issueType));
  const loaOrElaAuthorityCheckNeeded = workflowContext.loaAuthorityIssue === true || issueTypes.has("LOA_OR_ELA_AUTHORITY");
  const replacementElaCheckNeeded = workflowContext.replacementElaIssue === true || issueTypes.has("REPLACEMENT_ELA");
  const consolidatedNoticeCheckNeeded = workflowContext.consolidatedNotice === true || issueTypes.has("CONSOLIDATED_NOTICE");

  return {
    loaOrElaAuthorityCheckNeeded,
    replacementElaCheckNeeded,
    consolidatedNoticeCheckNeeded,
    properServiceCheckNeeded: consolidatedNoticeCheckNeeded || issueTypes.has("FAN_FLD_PROTEST") || issueTypes.has("FDDA_APPEAL_WATCH"),
    dueProcessCheckNeeded: true,
    statementOfFactsAndLawCheckNeeded: true,
    prescriptionCheckNeeded: issueTypes.has("PRESCRIPTION"),
    documentRequestScopeCheckNeeded: issueTypes.has("DOCUMENT_REQUEST_SCOPE") || issueTypes.has("SUBPOENA_OR_PRE_SUBPOENA"),
    noRegressionRuleCheckNeeded: consolidatedNoticeCheckNeeded,
    priorNoticeConsistencyCheckNeeded: issueTypes.has("NOD_DOD_PROCESS") || issueTypes.has("PAN_REPLY") || issueTypes.has("CONSOLIDATED_NOTICE")
  };
}

function buildSubstantiveDefensePlan(matrix) {
  const issueTypes = new Set(matrix.map((item) => item.issueType));
  return {
    vatClassificationReviewNeeded: ["VAT_EXEMPT_VS_ZERO_RATED", "PEZA_ZERO_RATING", "OUTPUT_VAT", "VALUE_ADDED_TAX", "UNSUPPORTED_SALES_CLASSIFICATION"].some((t) => issueTypes.has(t)),
    cwtSubstantiationReviewNeeded: issueTypes.has("CWT_SUBSTANTIATION"),
    withholdingDeductibilityReviewNeeded: ["WITHHOLDING_TAX_DEDUCTIBILITY", "EXPANDED_WITHHOLDING_TAX", "FINAL_WITHHOLDING_TAX"].some((t) => issueTypes.has(t)),
    inputVatSupportReviewNeeded: issueTypes.has("INPUT_VAT_SUBSTANTIATION"),
    dividendFwtReviewNeeded: issueTypes.has("DIVIDEND_FWT"),
    relatedPartyReviewNeeded: issueTypes.has("RELATED_PARTY_OR_INTERCOMPANY"),
    incomeTaxExpenseSupportReviewNeeded: ["INCOME_TAX", "UNSUPPORTED_EXPENSES"].some((t) => issueTypes.has(t))
  };
}

function buildAuthorityNeeds(matrix) {
  const controllingAuthoritiesNeeded = dedupe(matrix.flatMap((item) => item.authorityNeeded.filter((a) => /NIRC|Sec\./i.test(a))));
  const birIssuancesNeeded = dedupe(matrix.flatMap((item) => item.authorityNeeded.filter((a) => /RR No\.|RMO No\.|RMC No\./i.test(a))));
  const jurisprudenceNeeded = dedupe(matrix.flatMap((item) => item.jurisprudenceNeeded));
  const ctaRulesNeeded = dedupe(matrix.flatMap((item) => item.authorityNeeded.filter((a) => /CTA/i.test(a))));
  const authorityStatus = matrix.some((item) => item.authorityNeeded.length > 0) ? "authority_required" : "authority_limited";

  return { controllingAuthoritiesNeeded, birIssuancesNeeded, jurisprudenceNeeded, ctaRulesNeeded, authorityStatus };
}

/**
 * Builds a full BIR audit defense matrix result for the given (raw or
 * normalized) input. Never throws. Always returns the full result shape
 * regardless of input validity -- callers should call
 * validateBirAuditDefenseMatrixInput() beforehand to gate whether to
 * proceed. Performs no I/O, no network calls, no live retrieval, and
 * generates no filing-ready document; models defense strategy only.
 *
 * @param {*} input
 * @returns {object}
 */
export function createBirAuditDefenseMatrixResult(input) {
  const normalized = normalizeBirAuditDefenseMatrixInput(input);
  const findings = normalized.findings.length > 0 ? normalized.findings : [normalizeFindingInput({ issueType: "UNKNOWN_ISSUE" })];

  const defenseMatrix = findings.map((finding) => buildDefenseMatrixRow(finding));
  const riskWarnings = collectIssueTypeWarnings(defenseMatrix);
  const evidencePlan = buildEvidencePlan(defenseMatrix);
  const proceduralDefensePlan = buildProceduralDefensePlan(defenseMatrix, normalized.workflowContext);
  const substantiveDefensePlan = buildSubstantiveDefensePlan(defenseMatrix);
  const authorityNeeds = buildAuthorityNeeds(defenseMatrix);

  const highRiskIssueCount = defenseMatrix.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical").length;
  const evidenceGapCount = defenseMatrix.filter((item) => ["missing", "partial", "non_existent", "requires_reconciliation"].includes(item.evidenceStatus)).length;
  const hasKnownIssueTypes = normalized.findings.some((f) => f.issueType !== "UNKNOWN_ISSUE");
  const confidence = normalized.workflowContext.noticeType ? "high" : hasKnownIssueTypes ? "medium" : "low";

  const matrixSummary = {
    noticeType: normalized.workflowContext.noticeType,
    noticeStage: normalized.workflowContext.noticeStage,
    totalIssues: defenseMatrix.length,
    highRiskIssueCount,
    evidenceGapCount,
    authorityResearchNeeded: defenseMatrix.some((item) => item.authorityNeeded.length > 0),
    humanReviewRequired: true,
    confidence
  };

  const recommendedNextActions = dedupe(defenseMatrix.flatMap((item) => item.recommendedSafeAction));

  const combinedSourceCards = [...deepClone(normalized.sourceCards), ...deepClone(BASE_SOURCE_CARDS)];

  return {
    phase: "09O",
    mode: BIR_AUDIT_DEFENSE_MATRIX_MODE_ID,
    version: PHASE_09O_BIR_AUDIT_DEFENSE_MATRIX_VERSION,
    runtimeActive: false,
    matrixSummary,
    defenseMatrix,
    evidencePlan,
    proceduralDefensePlan,
    substantiveDefensePlan,
    authorityNeeds,
    riskWarnings,
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
 * Validates a candidate BIR audit defense matrix result object. Never
 * throws.
 *
 * @param {*} result
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateBirAuditDefenseMatrixResult(result) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(result)) {
    errors.push("result must be a plain object");
    return { valid: false, errors, warnings };
  }

  if (!isNonBlankString(result.phase)) errors.push("phase is required");
  if (!isNonBlankString(result.mode)) errors.push("mode is required");
  if (result.runtimeActive !== false) errors.push("runtimeActive must be false");

  if (!isPlainObject(result.matrixSummary)) {
    errors.push("matrixSummary is required");
  } else if (result.matrixSummary.humanReviewRequired !== true) {
    errors.push("matrixSummary.humanReviewRequired must be true");
  }

  if (!Array.isArray(result.defenseMatrix)) {
    errors.push("defenseMatrix must be an array");
  } else {
    result.defenseMatrix.forEach((item, index) => {
      if (!isPlainObject(item)) {
        errors.push(`defenseMatrix[${index}] must be an object`);
        return;
      }
      if (!SUPPORTED_DEFENSE_MATRIX_ISSUE_TYPES.includes(item.issueType)) errors.push(`defenseMatrix[${index}] unsupported issueType: ${item.issueType}`);
      if (!SUPPORTED_DEFENSE_MATRIX_RISK_LEVELS.includes(item.riskLevel)) errors.push(`defenseMatrix[${index}] unsupported riskLevel: ${item.riskLevel}`);
      if (!SUPPORTED_DEFENSE_MATRIX_EVIDENCE_STATUSES.includes(item.evidenceStatus)) errors.push(`defenseMatrix[${index}] unsupported evidenceStatus: ${item.evidenceStatus}`);
      if (item.humanReviewRequired !== true) errors.push(`defenseMatrix[${index}] humanReviewRequired must be true`);
    });
  }

  if (!isPlainObject(result.evidencePlan)) errors.push("evidencePlan is required");
  if (!isPlainObject(result.proceduralDefensePlan)) errors.push("proceduralDefensePlan is required");
  if (!isPlainObject(result.substantiveDefensePlan)) errors.push("substantiveDefensePlan is required");
  if (!isPlainObject(result.authorityNeeds)) errors.push("authorityNeeds is required");
  if (!Array.isArray(result.riskWarnings)) errors.push("riskWarnings must be an array");
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

  const claimCheck = detectProhibitedBirAuditDefenseMatrixClaims(result);
  if (claimCheck.hasProhibitedClaims) errors.push(`prohibited claims detected in result: ${claimCheck.matches.join(", ")}`);

  const leakCheck = detectRealDataLeak(result);
  if (leakCheck.hasRealDataLeak) errors.push(`real data leak detected in result: ${leakCheck.matches.join(", ")}`);

  return { valid: errors.length === 0, errors, warnings };
}
