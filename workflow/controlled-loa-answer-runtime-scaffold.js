// FILE: workflow/controlled-loa-answer-runtime-scaffold.js
// PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1
//
// Pure, dependency-free, standalone controlled scaffold that can classify
// the narrow live-answer query family "I received a BIR LOA, what should
// I do?" and generate a procedural-safe answer preview using Phase 9
// concepts (09L/09M/09S/09P/09O/09Q), WITHOUT wiring anything to /ask.
// This module has NO I/O, NO network calls, NO Supabase/OpenAI/Google
// Drive/n8n/Firecrawl/Crawlee/MCP dependency, NO web search, NO browser
// automation, NO OCR, NO filesystem access, NO process.env dependency, NO
// Date.now/randomness, and NO side effects. It imports nothing from any
// other module in this repository. It performs no live search, scraping,
// browsing, downloading, OCR, authority ingestion, embeddings, vector
// storage, or database writes, never submits or stores anything, mutates
// no global state, and is not wired into ask-handler.js, pipeline.js,
// server.js, routes, authentication, or the frontend. It never decides
// that any LOA, eLA, replacement eLA, consolidated eLA, PAN, FAN, FLD,
// FDDA, assessment, protest, or BIR notice is valid, invalid, void,
// cancelled, final, enforceable, appealable, or legally conclusive, and it
// never generates filing-ready documents or claims an automatic BIR
// submission occurred. Live /ask behavior is unchanged by this module's
// mere existence -- calling it requires a separately approved future
// wiring gate.

"use strict";

export const PHASE_09Y_CONTROLLED_LOA_ANSWER_RUNTIME_WIRING_SCAFFOLD_VERSION = "PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1";

export const CONTROLLED_LOA_ANSWER_RUNTIME_SCAFFOLD_MODE_ID = "controlled_loa_answer_runtime_scaffold";

export const SUPPORTED_CONTROLLED_LOA_INTENTS = Object.freeze([
  "BIR_LOA_RECEIVED_WHAT_TO_DO",
  "BIR_ELA_RECEIVED_WHAT_TO_DO",
  "LETTER_OF_AUTHORITY_FIRST_STEPS",
  "BIR_LOA_DOCUMENTS_TO_PREPARE",
  "BIR_ELA_DETAILS_TO_CHECK",
  "REPLACEMENT_ELA_RECEIVED_PROCEDURAL_REVIEW",
  "CONSOLIDATED_ELA_RECEIVED_PROCEDURAL_REVIEW",
  "LOA_CHECKLIST_RECEIVED",
  "NOTICE_FOR_PRESENTATION_SUBMISSION_RECEIVED",
  "PRE_SUBPOENA_REMINDER_RECEIVED",
  "UNKNOWN_SAFE_LOA_HELP"
]);

export const EXCLUDED_CONTROLLED_LOA_INTENTS = Object.freeze([
  "LOA_VALIDITY_CONCLUSION_REQUEST",
  "ELA_VOIDNESS_CONCLUSION_REQUEST",
  "IGNORE_LOA_REQUEST",
  "BIR_ASSESSMENT_POWER_CONCLUSION_REQUEST",
  "ASSESSMENT_FINALITY_REQUEST",
  "CTA_STRATEGY_REQUEST",
  "FAN_VOIDNESS_REQUEST",
  "FDDA_APPEALABILITY_CONCLUSION_REQUEST",
  "OUTCOME_PREDICTION_REQUEST",
  "FILING_READY_PROTEST_REQUEST",
  "AUTOMATIC_BIR_SUBMISSION_REQUEST",
  "LEGAL_OPINION_REQUEST",
  "UNKNOWN_UNSAFE_REQUEST"
]);

export const SUPPORTED_CONTROLLED_LOA_RESPONSE_MODES = Object.freeze([
  "SAFE_BASIC_LOA_GUIDANCE",
  "REPLACEMENT_ELA_REVIEW_GUIDANCE",
  "CONSOLIDATED_ELA_REVIEW_GUIDANCE",
  "DOCUMENT_CHECKLIST_GUIDANCE",
  "PRE_SUBPOENA_ESCALATION_GUIDANCE",
  "UNKNOWN_BIR_NOTICE_GUIDANCE",
  "HUMAN_REVIEW_REQUIRED",
  "AUTHORITY_FALLBACK_REQUIRED"
]);

export const SUPPORTED_CONTROLLED_LOA_SAFETY_GATES = Object.freeze([
  "NARROW_LOA_INTENT_GUARD",
  "SCOPE_GUARD",
  "NO_VALIDITY_CONCLUSION_GATE",
  "NO_FINALITY_CONCLUSION_GATE",
  "NO_PRESCRIPTION_CONCLUSION_GATE",
  "NO_CTA_STRATEGY_CONCLUSION_GATE",
  "NO_FILING_READY_OUTPUT_GATE",
  "NO_AUTOMATIC_SUBMISSION_GATE",
  "NO_REAL_TAXPAYER_DATA_GATE",
  "SOURCE_CARD_DISCIPLINE_GATE",
  "HUMAN_REVIEW_NOTICE_GATE",
  "RUNTIME_NOT_WIRED_GATE"
]);

const REQUIRED_FUTURE_AUTHORITY_CATEGORIES = Object.freeze([
  "RMC No. 5-2026 — LOA/eLA verification",
  "RMO No. 1-2026 — single-instance audit framework / standardized checklist / document request limits",
  "RMO No. 6-2026 — consolidation safeguards / FDDA and final-FAN limits / proper service / no-regression",
  "RMC No. 14-2026 — replacement eLA / TVN scope / prior notices / VATAS-LTVAU transition",
  "RR No. 18-2013 — PAN/FAN/protest/reinvestigation procedure",
  "NIRC Sec. 228 — due process for assessment",
  "RR No. 12-99, as amended — service / assessment procedure",
  "CTA rules — appeal-watch only, not conclusion"
]);

const PROHIBITED_CLAIM_PHRASES = Object.freeze([
  "this loa is valid",
  "this loa is invalid",
  "this ela is void",
  "this replacement ela is invalid",
  "this consolidated ela is invalid",
  "the bir cannot assess you",
  "you can ignore the loa",
  "the assessment is final.",
  "the assessment is not final.",
  "the deadline is definitely",
  "you will win",
  "the assessment is cancelled",
  "this is a final legal opinion",
  "this is official legal advice",
  "this protest will succeed",
  "cta appeal is definitely available",
  "this document is ready for filing",
  "i will submit this to the bir",
  "live /ask behavior was changed",
  "ask behavior changed by 09y",
  "runtime is now active",
  "runtime has been activated"
]);

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
  "loa_validity_determination",
  "ela_voidness_determination",
  "assessment_finality_determination",
  "cta_strategy_conclusion",
  "outcome_prediction_claim",
  "filing_ready_document_claim",
  "automatic_submission_claim",
  "final_legal_opinion_claim"
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeSourceCard(card) {
  const src = isPlainObject(card) ? card : {};
  const allowedTiers = ["official_reference_required", "uploaded_reference_pattern", "future_authority_corpus_required", "procedural_design_reference", "private_uploaded_pattern"];
  const authorityTier = allowedTiers.includes(src.authorityTier) ? src.authorityTier : "procedural_design_reference";
  return {
    label: isNonBlankString(src.label) ? src.label.trim() : "Procedural design reference",
    sourceType: isNonBlankString(src.sourceType) ? src.sourceType.trim() : "procedural design reference",
    authorityTier,
    note: isNonBlankString(src.note) ? src.note.trim() : "Design/reference card only; no live authority verification performed."
  };
}

function containsRealDataFragments(text) {
  const upper = (text || "").toUpperCase();
  for (const fragment of REAL_TAXPAYER_NAME_FRAGMENTS) if (upper.includes(fragment)) return "taxpayer name";
  for (const fragment of REAL_OFFICER_NAME_FRAGMENTS) if (upper.includes(fragment)) return "BIR officer name";
  for (const fragment of REAL_ELA_NUMBER_FRAGMENTS) if ((text || "").includes(fragment)) return "LOA/eLA number";
  for (const fragment of REAL_AUDIT_CASE_NUMBER_FRAGMENTS) if ((text || "").includes(fragment)) return "audit case number";
  for (const fragment of REAL_TIN_FRAGMENTS) if ((text || "").includes(fragment)) return "TIN";
  for (const fragment of REAL_ASSESSMENT_AMOUNT_FRAGMENTS) if ((text || "").includes(fragment)) return "assessment amount";
  return null;
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

function detectProhibitedControlledLoaClaims(value) {
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

/**
 * Normalizes candidate controlled-LOA-answer input into a defensive,
 * fully-shaped object. Never mutates input; never throws. Always forces
 * every runtime/live/legal/real-data/filing/submission option flag to its
 * safe value, never infers a final legal/validity status, and never marks
 * live /ask wiring as active. validateControlledLoaAnswerInput() is the
 * gate that flags an attempt to request unsafe option values.
 *
 * @param {*} input
 * @returns {object}
 */
export function normalizeControlledLoaAnswerInput(input) {
  const src = isPlainObject(input) ? input : {};
  const contextSrc = isPlainObject(src.context) ? src.context : {};
  const optionsSrc = isPlainObject(src.options) ? src.options : {};

  const context = {
    noticeType: isNonBlankString(contextSrc.noticeType) ? contextSrc.noticeType.trim() : "",
    hasUploadedNotice: contextSrc.hasUploadedNotice === true,
    receiptDateKnown: contextSrc.receiptDateKnown === true,
    replacementElaMentioned: contextSrc.replacementElaMentioned === true,
    consolidatedElaMentioned: contextSrc.consolidatedElaMentioned === true,
    checklistMentioned: contextSrc.checklistMentioned === true,
    noticeForPresentationMentioned: contextSrc.noticeForPresentationMentioned === true,
    preSubpoenaMentioned: contextSrc.preSubpoenaMentioned === true,
    asksValidity: contextSrc.asksValidity === true,
    asksFinality: contextSrc.asksFinality === true,
    asksPrescription: contextSrc.asksPrescription === true,
    asksCtaStrategy: contextSrc.asksCtaStrategy === true,
    asksFilingReadyOutput: contextSrc.asksFilingReadyOutput === true,
    asksAutomaticSubmission: contextSrc.asksAutomaticSubmission === true
  };

  return {
    userQuery: typeof src.userQuery === "string" ? src.userQuery.trim() : "",
    context,
    options: {
      scaffoldOnly: true,
      runtimeActive: false,
      liveAskWired: false,
      allowLegalConclusion: false,
      allowLiveRetrieval: false,
      allowRealTaxpayerData: false,
      generateFilingReadyDocument: false,
      automaticSubmission: false
    },
    sourceCards: (Array.isArray(src.sourceCards) ? src.sourceCards : []).map((card) => normalizeSourceCard(card))
  };
}

const VERIFICATION_CLAIM_PATTERN = /verification (?:is |has been )?complete|officially verified|final authority verification/i;
const LEGAL_CONCLUSION_CLAIM_PATTERN = /final legal conclusion|final legal opinion|official legal advice|legally conclusive/i;

/**
 * Validates candidate controlled-LOA-answer input. Never throws. Rejects
 * missing input, missing/empty userQuery, unsafe runtime/legal/live
 * option values, source cards claiming completed verification or a final
 * legal conclusion, and any known real taxpayer/officer name, real TIN,
 * real LOA/eLA/audit-case number, or exact real assessment amount from
 * the private reference corpus. Ordinary questions about LOA/eLA
 * validity, finality, CTA strategy, etc. are NOT rejected here -- they
 * are safely redirected to a fallback/human-review response mode by
 * classifyControlledLoaIntent() instead of being refused as invalid
 * input.
 *
 * @param {*} input
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateControlledLoaAnswerInput(input) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(input)) {
    errors.push("input must be a plain object");
    return { valid: false, errors, warnings };
  }

  if (!isNonBlankString(input.userQuery)) {
    errors.push("userQuery is required and must not be empty");
  }

  const options = isPlainObject(input.options) ? input.options : {};
  if (options.runtimeActive === true) errors.push("runtimeActive must not be true");
  if (options.liveAskWired === true) errors.push("liveAskWired must not be true");
  if (options.scaffoldOnly === false) errors.push("scaffoldOnly must not be false");
  if (options.allowLegalConclusion === true) errors.push("allowLegalConclusion must not be true");
  if (options.allowLiveRetrieval === true) errors.push("allowLiveRetrieval must not be true");
  if (options.allowRealTaxpayerData === true) errors.push("allowRealTaxpayerData must not be true");
  if (options.generateFilingReadyDocument === true) errors.push("generateFilingReadyDocument must not be true");
  if (options.automaticSubmission === true) errors.push("automaticSubmission must not be true");

  const sourceCards = Array.isArray(input.sourceCards) ? input.sourceCards : [];
  sourceCards.forEach((card, index) => {
    if (isPlainObject(card)) {
      const combined = `${card.label || ""} ${card.note || ""}`;
      if (VERIFICATION_CLAIM_PATTERN.test(combined)) errors.push(`sourceCards[${index}] must not claim completed authority verification`);
      if (LEGAL_CONCLUSION_CLAIM_PATTERN.test(combined)) errors.push(`sourceCards[${index}] must not claim a final legal conclusion`);
    }
  });

  const combinedRaw = `${input.userQuery || ""} ${JSON.stringify(input.context || {})} ${JSON.stringify(input.sourceCards || [])}`;
  const realDataHit = containsRealDataFragments(combinedRaw);
  if (realDataHit) errors.push(`input must not contain a known real ${realDataHit} from uploaded materials`);

  return { valid: errors.length === 0, errors, warnings };
}

function categorize(normalized) {
  const q = normalized.userQuery || "";
  const ctx = normalized.context;

  const mentionsEla = /\bela\b/i.test(q);
  const mentionsLoa = /\bloa\b|letter of authority/i.test(q);
  const mentionsReplacement = ctx.replacementElaMentioned || /replacement\s+(?:e-?la|loa)/i.test(q);
  const mentionsConsolidated = ctx.consolidatedElaMentioned || /consolidated\s+(?:e-?la|loa)/i.test(q);
  const mentionsChecklist = ctx.checklistMentioned || /checklist/i.test(q);
  const mentionsNoticeForPresentation = ctx.noticeForPresentationMentioned || /notice for presentation|presentation\/submission|presentation or submission/i.test(q);
  const mentionsPreSubpoena = ctx.preSubpoenaMentioned || /pre-subpoena|before (?:the )?(?:issuance of )?subpoena|subpoena duces tecum|reminder.*subpoena/i.test(q);
  const mentionsDocumentsToPrepare = /documents.*prepare|prepare.*documents|what documents/i.test(q);
  const mentionsFirstSteps = /first step/i.test(q);
  const mentionsDetailsToCheck = /details to check|what should i check/i.test(q);

  const asksValidity = ctx.asksValidity || /\binvalid\b|\bis\s+(?:my|this|the)\s+(?:loa|ela)\s+valid\b|\bvoid\b/i.test(q);
  const asksIgnore = /\bignore\b/i.test(q);
  const asksAssessmentPower = /\bcan\s+(?:the\s+)?bir\s+assess\b|\bbir\s+cannot\s+assess\b/i.test(q);
  const asksFinality = ctx.asksFinality || /\bis\s+the\s+assessment\s+final\b|\bassessment\b[^.?!]*\bfinal\b/i.test(q);
  const asksPrescription = ctx.asksPrescription || /\bprescri(?:be|ption|bed)\b/i.test(q);
  // PHASE-10A2: narrowed from a bare `\bcta\b` mention to require an
  // action/strategy verb near "CTA" -- a bare mention (e.g. "What did CTA
  // Case No. 9369 rule?") is a legitimate jurisprudence/case-law question,
  // not a request for the user's own appeal strategy.
  const asksCta = ctx.asksCtaStrategy ||
    /\b(?:should|shall|do)\s+(?:i|we)\s+appeal\b[^.?!]*\bcta\b|\bappeal\s+to\s+(?:the\s+)?cta\b|\bcta\s+strategy\b|\bmy\s+cta\s+(?:case|appeal)\b/i.test(q);
  const asksFanVoid = /\bfan\b[^.?!]*\b(?:void|invalid)\b/i.test(q);
  const asksFddaAppeal = /\bfdda\b[^.?!]*\bappeal/i.test(q);
  // PHASE-10A2: broadened beyond the literal "will I/we win" phrasing to
  // also catch "chances of winning" and "likely to succeed/win" wording.
  const asksOutcome = /\bwill\s+(?:i|we)\s+win\b|\bchances?\s+of\s+winning\b|\blikely\s+to\s+(?:succeed|win)\b/i.test(q);
  const asksFilingReady = ctx.asksFilingReadyOutput || /\bdraft\b[^.?!]*\bprotest\b|\bfiling-ready\b|\bwrite\b[^.?!]*\bprotest\b now/i.test(q);
  const asksAutoSubmit = ctx.asksAutomaticSubmission || /\bsubmit\b[^.?!]*\bbir\b|\bautomatically\s+submit\b/i.test(q);
  const asksLegalOpinion = /\blegal opinion\b|\bofficial legal advice\b/i.test(q);
  // PHASE-10A2: catches definitive-conclusion phrasing ("tell me
  // conclusively", "decide whether") that asks for a final determination
  // without naming a specific validity/finality/CTA keyword.
  const asksDefinitiveConclusion = /\bconclusively\b|\bdecide\s+whether\b|\bdetermine\s+(?:conclusively|definitively)\b/i.test(q);
  // PHASE-10A2: catches guaranteed-outcome strategy requests ("best legal
  // strategy", "legal action [that] guarantees success") distinct from the
  // CTA-specific and outcome-prediction patterns above.
  const asksGuaranteedStrategy = /\bbest\s+(?:legal\s+)?strategy\b|\bguarantees?\s+success\b|\blegal\s+action\b[^.?!]*\bguarantees?\b/i.test(q);

  return {
    mentionsEla,
    mentionsLoa,
    mentionsReplacement,
    mentionsConsolidated,
    mentionsChecklist,
    mentionsNoticeForPresentation,
    mentionsPreSubpoena,
    mentionsDocumentsToPrepare,
    mentionsFirstSteps,
    mentionsDetailsToCheck,
    asksValidity,
    asksIgnore,
    asksAssessmentPower,
    asksFinality,
    asksPrescription,
    asksCta,
    asksFanVoid,
    asksFddaAppeal,
    asksOutcome,
    asksFilingReady,
    asksAutoSubmit,
    asksLegalOpinion,
    asksDefinitiveConclusion,
    asksGuaranteedStrategy
  };
}

/**
 * Classifies a normalized controlled-LOA-answer input into a supported or
 * excluded intent, a response mode, a confidence tier, human-readable
 * reasons, and the safety gates that were triggered. Pure, synchronous,
 * never throws, never infers a final legal/validity conclusion.
 *
 * @param {object} normalizedInput result of normalizeControlledLoaAnswerInput()
 * @returns {{supported: boolean, excluded: boolean, intent: string, responseMode: string, confidence: string, reasons: string[], safetyGatesTriggered: string[]}}
 */
export function classifyControlledLoaIntent(normalizedInput) {
  const normalized = isPlainObject(normalizedInput) && isPlainObject(normalizedInput.context) ? normalizedInput : normalizeControlledLoaAnswerInput(normalizedInput);
  const s = categorize(normalized);
  const baseGates = ["NARROW_LOA_INTENT_GUARD", "SCOPE_GUARD"];

  // Excluded intents take priority: a query mentioning "LOA" alongside a
  // finality/validity/strategy/filing-ready/automatic-submission demand
  // must never fall through to a supported procedural-guidance mode.
  if (s.asksFilingReady) {
    return {
      supported: false,
      excluded: true,
      intent: "FILING_READY_PROTEST_REQUEST",
      responseMode: "HUMAN_REVIEW_REQUIRED",
      confidence: "high",
      reasons: ["Query requests a filing-ready protest/reply/letter/affidavit/certification, which this scaffold never generates."],
      safetyGatesTriggered: [...baseGates, "NO_FILING_READY_OUTPUT_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.asksAutoSubmit) {
    return {
      supported: false,
      excluded: true,
      intent: "AUTOMATIC_BIR_SUBMISSION_REQUEST",
      responseMode: "HUMAN_REVIEW_REQUIRED",
      confidence: "high",
      reasons: ["Query requests automatic submission to the BIR, which this scaffold never performs."],
      safetyGatesTriggered: [...baseGates, "NO_AUTOMATIC_SUBMISSION_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.asksGuaranteedStrategy) {
    return {
      supported: false,
      excluded: true,
      intent: "DEFINITIVE_STRATEGY_REQUEST",
      responseMode: "HUMAN_REVIEW_REQUIRED",
      confidence: "high",
      reasons: ["Query requests a guaranteed-success legal strategy, which this scaffold never provides."],
      safetyGatesTriggered: [...baseGates, "NO_VALIDITY_CONCLUSION_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.asksDefinitiveConclusion) {
    return {
      supported: false,
      excluded: true,
      intent: "DEFINITIVE_LEGAL_CONCLUSION_REQUEST",
      responseMode: "HUMAN_REVIEW_REQUIRED",
      confidence: "high",
      reasons: ["Query requests a conclusive/definitive legal determination, which requires official-source verification and human review."],
      safetyGatesTriggered: [...baseGates, "NO_VALIDITY_CONCLUSION_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.asksLegalOpinion) {
    return {
      supported: false,
      excluded: true,
      intent: "LEGAL_OPINION_REQUEST",
      responseMode: "HUMAN_REVIEW_REQUIRED",
      confidence: "high",
      reasons: ["Query requests a legal opinion, which requires human tax/legal review."],
      safetyGatesTriggered: [...baseGates, "NO_VALIDITY_CONCLUSION_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.asksIgnore) {
    return {
      supported: false,
      excluded: true,
      intent: "IGNORE_LOA_REQUEST",
      responseMode: "HUMAN_REVIEW_REQUIRED",
      confidence: "high",
      reasons: ["Query asks whether the notice may be disregarded; this scaffold never recommends ignoring a BIR notice."],
      safetyGatesTriggered: [...baseGates, "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.asksAssessmentPower) {
    return {
      supported: false,
      excluded: true,
      intent: "BIR_ASSESSMENT_POWER_CONCLUSION_REQUEST",
      responseMode: "HUMAN_REVIEW_REQUIRED",
      confidence: "high",
      reasons: ["Query asks for a conclusion about BIR's assessment power, which requires official-source verification and human review."],
      safetyGatesTriggered: [...baseGates, "NO_VALIDITY_CONCLUSION_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.asksFinality) {
    return {
      supported: false,
      excluded: true,
      intent: "ASSESSMENT_FINALITY_REQUEST",
      responseMode: "HUMAN_REVIEW_REQUIRED",
      confidence: "high",
      reasons: ["Query asks whether an assessment is final, which requires official-source verification and human review."],
      safetyGatesTriggered: [...baseGates, "NO_FINALITY_CONCLUSION_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.asksCta) {
    return {
      supported: false,
      excluded: true,
      intent: "CTA_STRATEGY_REQUEST",
      responseMode: "HUMAN_REVIEW_REQUIRED",
      confidence: "high",
      reasons: ["Query asks for CTA appeal strategy, which requires official-source verification and human tax/legal review."],
      safetyGatesTriggered: [...baseGates, "NO_CTA_STRATEGY_CONCLUSION_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.asksFanVoid) {
    return {
      supported: false,
      excluded: true,
      intent: "FAN_VOIDNESS_REQUEST",
      responseMode: "HUMAN_REVIEW_REQUIRED",
      confidence: "high",
      reasons: ["Query asks whether a FAN is void/invalid, which requires official-source verification and human review."],
      safetyGatesTriggered: [...baseGates, "NO_VALIDITY_CONCLUSION_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.asksFddaAppeal) {
    return {
      supported: false,
      excluded: true,
      intent: "FDDA_APPEALABILITY_CONCLUSION_REQUEST",
      responseMode: "HUMAN_REVIEW_REQUIRED",
      confidence: "high",
      reasons: ["Query asks whether an FDDA is appealable, which requires official-source verification and human review."],
      safetyGatesTriggered: [...baseGates, "NO_CTA_STRATEGY_CONCLUSION_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.asksOutcome) {
    return {
      supported: false,
      excluded: true,
      intent: "OUTCOME_PREDICTION_REQUEST",
      responseMode: "HUMAN_REVIEW_REQUIRED",
      confidence: "high",
      reasons: ["Query asks for an outcome prediction, which this scaffold never provides."],
      safetyGatesTriggered: [...baseGates, "NO_VALIDITY_CONCLUSION_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.asksValidity) {
    const intent = s.mentionsEla && /void/i.test(normalized.userQuery || "") ? "ELA_VOIDNESS_CONCLUSION_REQUEST" : "LOA_VALIDITY_CONCLUSION_REQUEST";
    return {
      supported: false,
      excluded: true,
      intent,
      responseMode: "AUTHORITY_FALLBACK_REQUIRED",
      confidence: "high",
      reasons: ["Query asks for a validity/voidness conclusion, which requires official-source verification not yet available to this scaffold."],
      safetyGatesTriggered: [...baseGates, "NO_VALIDITY_CONCLUSION_GATE", "SOURCE_CARD_DISCIPLINE_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }

  // Supported procedural-help intents.
  if (s.mentionsPreSubpoena) {
    return {
      supported: true,
      excluded: false,
      intent: "PRE_SUBPOENA_REMINDER_RECEIVED",
      responseMode: "PRE_SUBPOENA_ESCALATION_GUIDANCE",
      confidence: "high",
      reasons: ["Query describes a pre-subpoena / reminder-before-subpoena scenario."],
      safetyGatesTriggered: [...baseGates, "SOURCE_CARD_DISCIPLINE_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.mentionsChecklist) {
    return {
      supported: true,
      excluded: false,
      intent: "LOA_CHECKLIST_RECEIVED",
      responseMode: "DOCUMENT_CHECKLIST_GUIDANCE",
      confidence: "high",
      reasons: ["Query describes receiving a standardized checklist of requirements."],
      safetyGatesTriggered: [...baseGates, "SOURCE_CARD_DISCIPLINE_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.mentionsNoticeForPresentation) {
    return {
      supported: true,
      excluded: false,
      intent: "NOTICE_FOR_PRESENTATION_SUBMISSION_RECEIVED",
      responseMode: "DOCUMENT_CHECKLIST_GUIDANCE",
      confidence: "high",
      reasons: ["Query describes receiving a notice for presentation/submission of documents."],
      safetyGatesTriggered: [...baseGates, "SOURCE_CARD_DISCIPLINE_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.mentionsReplacement) {
    return {
      supported: true,
      excluded: false,
      intent: "REPLACEMENT_ELA_RECEIVED_PROCEDURAL_REVIEW",
      responseMode: "REPLACEMENT_ELA_REVIEW_GUIDANCE",
      confidence: "high",
      reasons: ["Query describes receiving a replacement eLA and asks for procedural next steps."],
      safetyGatesTriggered: [...baseGates, "SOURCE_CARD_DISCIPLINE_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.mentionsConsolidated) {
    return {
      supported: true,
      excluded: false,
      intent: "CONSOLIDATED_ELA_RECEIVED_PROCEDURAL_REVIEW",
      responseMode: "CONSOLIDATED_ELA_REVIEW_GUIDANCE",
      confidence: "high",
      reasons: ["Query describes receiving a consolidated eLA and asks for procedural next steps."],
      safetyGatesTriggered: [...baseGates, "SOURCE_CARD_DISCIPLINE_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.mentionsDocumentsToPrepare && s.mentionsLoa) {
    return {
      supported: true,
      excluded: false,
      intent: "BIR_LOA_DOCUMENTS_TO_PREPARE",
      responseMode: "SAFE_BASIC_LOA_GUIDANCE",
      confidence: "high",
      reasons: ["Query asks which documents to prepare after receiving a BIR LOA."],
      safetyGatesTriggered: [...baseGates, "SOURCE_CARD_DISCIPLINE_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.mentionsEla) {
    const intent = s.mentionsDetailsToCheck ? "BIR_ELA_DETAILS_TO_CHECK" : "BIR_ELA_RECEIVED_WHAT_TO_DO";
    return {
      supported: true,
      excluded: false,
      intent,
      responseMode: "SAFE_BASIC_LOA_GUIDANCE",
      confidence: "high",
      reasons: ["Query describes receiving a BIR eLA and asks for procedural next steps."],
      safetyGatesTriggered: [...baseGates, "SOURCE_CARD_DISCIPLINE_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }
  if (s.mentionsLoa) {
    const intent = s.mentionsFirstSteps ? "LETTER_OF_AUTHORITY_FIRST_STEPS" : "BIR_LOA_RECEIVED_WHAT_TO_DO";
    return {
      supported: true,
      excluded: false,
      intent,
      responseMode: "SAFE_BASIC_LOA_GUIDANCE",
      confidence: "high",
      reasons: ["Query describes receiving a BIR LOA and asks for procedural next steps."],
      safetyGatesTriggered: [...baseGates, "SOURCE_CARD_DISCIPLINE_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
    };
  }

  return {
    supported: true,
    excluded: false,
    intent: "UNKNOWN_SAFE_LOA_HELP",
    responseMode: "UNKNOWN_BIR_NOTICE_GUIDANCE",
    confidence: "low",
    reasons: ["Query could not be confidently classified against a specific supported LOA/eLA intent."],
    safetyGatesTriggered: [...baseGates, "SOURCE_CARD_DISCIPLINE_GATE", "HUMAN_REVIEW_NOTICE_GATE"]
  };
}

function buildControlledAnswer(intentClassification) {
  const humanReviewNotice =
    "Validity, prescription, finality, appealability, protest strategy, CTA strategy, and legal conclusions require official-source verification and human tax/legal review.";
  const authorityVerificationNotice =
    "Official-source verification is required before relying on any authority referenced in this guidance; no source has been live-verified by this scaffold.";

  if (intentClassification.excluded) {
    return {
      answerType: intentClassification.responseMode,
      proceduralGuidance: [
        "This question requires official-source verification and human tax/legal review before any conclusion.",
        "This scaffold does not provide a final validity, finality, prescription, CTA-strategy, protest-strategy, filing-ready, or automatic-submission response."
      ],
      detailsToCheck: [],
      documentComplianceSteps: [],
      receivingProofSteps: [],
      substituteProofWarnings: [],
      auditStageWatch: [],
      authorityVerificationNotice,
      humanReviewNotice
    };
  }

  return {
    answerType: intentClassification.responseMode,
    proceduralGuidance: [
      "Do not ignore the LOA/eLA.",
      "Preserve the date and manner of receipt.",
      "Keep a clear copy of the notice and attachments.",
      "Verify the LOA/eLA through the available BIR verification process where applicable, including the BIR REVIE / LOA Verifier process under RMC No. 5-2026 when relevant.",
      "Determine whether the document is an original eLA, replacement eLA, consolidated eLA, TVN, Mission Order, checklist, notice for presentation/submission, or pre-subpoena reminder.",
      "Avoid unnecessary admissions.",
      humanReviewNotice
    ],
    detailsToCheck: [
      "Taxpayer name",
      "TIN",
      "Taxable period",
      "Tax types covered",
      "Issuing office",
      "LOA/eLA number",
      "Audit case number",
      "Revenue Officer (RO)",
      "Group Supervisor (GS)",
      "Approving/signing official",
      "Documents requested"
    ],
    documentComplianceSteps: [
      "Prepare a document compliance matrix.",
      "Classify each requested document as provided, to-follow, not applicable, unavailable, non-existent, substitute proof available, requires reconciliation, requires certified copy, requires on-premise review, or requires BIR clarification.",
      "Submit documents through controlled transmittal."
    ],
    receivingProofSteps: ["Keep proof of submission, such as BIR receiving stamp, email acknowledgement, courier proof, attachment list, receiving office/officer, and date/time of submission."],
    substituteProofWarnings: [
      "Do not fabricate non-existent, unavailable, or not-applicable documents.",
      "Prepare a factual explanation and, where appropriate, substitute proof such as management certification, affidavit, AFS note, tax return support, official record, or third-party confirmation."
    ],
    auditStageWatch: ["Monitor possible next stages: additional document request, NOD/DOD, PAN, FAN/FLD, protest, FDDA, and CTA appeal-watch."],
    authorityVerificationNotice,
    humanReviewNotice
  };
}

function buildSafeResponsePreview(intentClassification) {
  const closing =
    "This is procedural guidance only. Human tax/legal review remains required for validity, prescription, finality, appealability, protest strategy, CTA strategy, or legal conclusions.";

  if (intentClassification.excluded) {
    return `This question requires official-source verification and cannot be answered as a final conclusion here. ${closing}`;
  }

  return (
    "If you received a BIR LOA/eLA, do not ignore it. Preserve the date and manner of receipt, keep a copy of the notice, and verify it through the available BIR verification process " +
    "(for example, the REVIE / LOA Verifier process under RMC No. 5-2026) where applicable. Prepare a document compliance matrix, submit through controlled transmittal, and keep proof of " +
    `submission. Do not fabricate unavailable or non-existent documents; use substitute proof where appropriate. ${closing}`
  );
}

/**
 * Builds a full controlled LOA answer runtime scaffold result for the
 * given (raw or normalized) input. Never throws. Always returns the full
 * result shape regardless of input validity -- callers should call
 * validateControlledLoaAnswerInput() beforehand to gate whether to
 * proceed. Performs no I/O, no network calls, no live retrieval,
 * scraping, downloading, ingestion, embedding, or database writes;
 * `runtimeActive` and `liveAskWired` are always false, and this function
 * is never called from the live `/ask` path.
 *
 * @param {*} input
 * @returns {object}
 */
export function createControlledLoaAnswerRuntimeScaffoldResult(input) {
  const normalized = normalizeControlledLoaAnswerInput(input);
  const intentClassification = classifyControlledLoaIntent(normalized);
  const controlledAnswer = buildControlledAnswer(intentClassification);
  const safeResponsePreview = buildSafeResponsePreview(intentClassification);

  const phase9ScaffoldUsePlan = {
    use09LProceduralFallback: true,
    use09MNoticeTriage: true,
    use09S2026BaselineSignals: true,
    use09PDocumentCompliance: true,
    use09OAuditDefenseMatrix: true,
    use09QAuthorityCorpusRequirement: true,
    runtimeWiredNow: false
  };

  const safetyGateResults = {
    narrowLoaIntentGuard: true,
    scopeGuard: true,
    noValidityConclusion: true,
    noFinalityConclusion: true,
    noPrescriptionConclusion: true,
    noCtaStrategyConclusion: true,
    noFilingReadyOutput: true,
    noAutomaticSubmission: true,
    noRealTaxpayerData: true,
    sourceCardDiscipline: true,
    humanReviewNoticePresent: true,
    runtimeNotWired: true
  };

  const sourceCardPolicy = {
    verifiedSourceCardsAvailable: false,
    legalCitationAllowed: false,
    sourceCardsRequiredForFutureLegalClaims: true,
    fallbackIfUnverified: "Use procedural-safe language and state that official-source verification is required; avoid legal citation and final authority claims.",
    requiredFutureAuthorityCategories: [...REQUIRED_FUTURE_AUTHORITY_CATEGORIES]
  };

  const recommendedNextActions = [
    "Verify the LOA/eLA and any related notice against official BIR sources before relying on it.",
    "Route replacement/consolidated eLA, 2026 baseline, and document-request signals to the appropriate Phase 9 workflow for further structuring.",
    "Escalate validity, finality, prescription, CTA-strategy, or filing-ready requests to human tax/legal review.",
    "Do not activate this scaffold in live /ask without a separate approved wiring gate."
  ];

  return {
    phase: "09Y",
    mode: CONTROLLED_LOA_ANSWER_RUNTIME_SCAFFOLD_MODE_ID,
    version: PHASE_09Y_CONTROLLED_LOA_ANSWER_RUNTIME_WIRING_SCAFFOLD_VERSION,
    runtimeActive: false,
    liveAskWired: false,
    intentClassification,
    controlledAnswer,
    phase9ScaffoldUsePlan,
    safetyGateResults,
    sourceCardPolicy,
    safeResponsePreview,
    prohibitedConclusions: [...PROHIBITED_CONCLUSION_LABELS],
    recommendedNextActions,
    metadata: {
      scaffoldOnly: true,
      runtimeActive: false,
      liveAskWired: false,
      legalConclusionProvided: false,
      liveRetrievalPerformed: false,
      externalSearchPerformed: false,
      scrapingPerformed: false,
      downloadPerformed: false,
      ingestionPerformed: false,
      embeddingPerformed: false,
      databaseWritePerformed: false,
      realTaxpayerDataUsed: false,
      filingReadyDocumentGenerated: false,
      automaticSubmission: false,
      finalOutcomeGuaranteed: false
    }
  };
}

/**
 * Validates a candidate controlled LOA answer runtime scaffold result
 * object. Never throws.
 *
 * @param {*} result
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateControlledLoaAnswerResult(result) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(result)) {
    errors.push("result must be a plain object");
    return { valid: false, errors, warnings };
  }

  if (!isNonBlankString(result.phase)) errors.push("phase is required");
  if (!isNonBlankString(result.mode)) errors.push("mode is required");
  if (result.runtimeActive !== false) errors.push("runtimeActive must be false");
  if (result.liveAskWired !== false) errors.push("liveAskWired must be false");

  if (!isPlainObject(result.intentClassification)) errors.push("intentClassification is required");
  if (!isPlainObject(result.controlledAnswer)) errors.push("controlledAnswer is required");
  if (!isPlainObject(result.phase9ScaffoldUsePlan)) errors.push("phase9ScaffoldUsePlan is required");
  if (!isPlainObject(result.safetyGateResults)) errors.push("safetyGateResults is required");
  if (!isPlainObject(result.sourceCardPolicy)) {
    errors.push("sourceCardPolicy is required");
  } else {
    if (result.sourceCardPolicy.verifiedSourceCardsAvailable !== false) errors.push("sourceCardPolicy.verifiedSourceCardsAvailable must be false");
    if (result.sourceCardPolicy.legalCitationAllowed !== false) errors.push("sourceCardPolicy.legalCitationAllowed must be false");
  }
  if (!isNonBlankString(result.safeResponsePreview)) errors.push("safeResponsePreview is required");

  const metadata = isPlainObject(result.metadata) ? result.metadata : {};
  if (!isPlainObject(result.metadata)) {
    errors.push("metadata is required");
  } else {
    if (metadata.scaffoldOnly !== true) errors.push("metadata.scaffoldOnly must be true");
    if (metadata.runtimeActive !== false) errors.push("metadata.runtimeActive must be false");
    if (metadata.liveAskWired !== false) errors.push("metadata.liveAskWired must be false");
    if (metadata.legalConclusionProvided !== false) errors.push("metadata.legalConclusionProvided must be false");
    if (metadata.liveRetrievalPerformed !== false) errors.push("metadata.liveRetrievalPerformed must be false");
    if (metadata.externalSearchPerformed !== false) errors.push("metadata.externalSearchPerformed must be false");
    if (metadata.scrapingPerformed !== false) errors.push("metadata.scrapingPerformed must be false");
    if (metadata.downloadPerformed !== false) errors.push("metadata.downloadPerformed must be false");
    if (metadata.ingestionPerformed !== false) errors.push("metadata.ingestionPerformed must be false");
    if (metadata.embeddingPerformed !== false) errors.push("metadata.embeddingPerformed must be false");
    if (metadata.databaseWritePerformed !== false) errors.push("metadata.databaseWritePerformed must be false");
    if (metadata.realTaxpayerDataUsed !== false) errors.push("metadata.realTaxpayerDataUsed must be false");
    if (metadata.filingReadyDocumentGenerated !== false) errors.push("metadata.filingReadyDocumentGenerated must be false");
    if (metadata.automaticSubmission !== false) errors.push("metadata.automaticSubmission must be false");
    if (metadata.finalOutcomeGuaranteed !== false) errors.push("metadata.finalOutcomeGuaranteed must be false");
  }

  const claimCheck = detectProhibitedControlledLoaClaims(result);
  if (claimCheck.hasProhibitedClaims) errors.push(`prohibited claims detected in result: ${claimCheck.matches.join(", ")}`);

  const leakCheck = detectRealDataLeak(result);
  if (leakCheck.hasRealDataLeak) errors.push(`real data leak detected in result: ${leakCheck.matches.join(", ")}`);

  return { valid: errors.length === 0, errors, warnings };
}
