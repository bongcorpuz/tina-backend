// FILE: clarification-route-orchestrator-helper.js
"use strict";

/**
 * PATCH-07B-CLARIFICATION-ROUTE-HELPER-1 narrow route clarification helper.
 *
 * Boundary:
 * - Computes a structured future route clarification decision object.
 * - Does not wire routes, prompts, response generation, pipeline flow, frontend,
 *   retrieval, reranker, sourceAvailability, source cards, DB, vector, corpus,
 *   indexing, ingestion, model generation, or dependencies.
 */

export const CLARIFICATION_ROUTE_HELPER_VERSION = "07B-CLARIFICATION-ROUTE-HELPER-1";
export const CLARIFICATION_ROUTE_HELPER_IMPLEMENTATION_SCOPE = "CLARIFICATION_ROUTE_ORCHESTRATOR_HELPER_ONLY";

const INSERTION_POINT = "RUNPIPELINE_AFTER_STEP_6_5_BEFORE_STEP_13_14";
const FEATURE_FLAG_OFF_BEHAVIOR = "BYTE_IDENTICAL_CURRENT_BEHAVIOR_REQUIRED";

const RESPONSE_TYPES = Object.freeze([
  "clarification",
  "answer_with_followup",
  "document_request_with_cautious_answer",
  "source_limited_orientation",
  "phase10_deferred_orientation",
  "answer"
]);

const COMPACT_SOURCE_CARD_FIELDS = Object.freeze([
  "id",
  "title",
  "sourceTitle",
  "authorityType",
  "normalizedReference",
  "section",
  "url",
  "citation",
  "authorityMatchTier",
  "sourceState"
]);

const RAW_TEXT_KEYS = new Set([
  "body",
  "content",
  "text",
  "rawText",
  "fullText",
  "excerpt",
  "pageText",
  "chunkText",
  "fullDocument",
  "rawBody",
  "documentText",
  "fullDocumentText",
  "rawContent",
  "chunks",
  "pages"
]);

const SUMMARY_KEYS = Object.freeze([
  "decision",
  "clarificationDecision",
  "allowedAnswerPosture",
  "safetyPosture",
  "qualitativeAuditRiskLabel",
  "applicabilityClassification",
  "authorityApplicabilityClassification",
  "authorityState",
  "sourceAvailabilityState",
  "implementationScope",
  "canReachFinalConclusion",
  "answerAllowed"
]);

const PROHIBITED_CONCLUSIONS = Object.freeze([
  "Do not provide a final legal or tax conclusion when facts are insufficient.",
  "Do not state that the assessment is void.",
  "Do not state that BIR has no case.",
  "Do not state that the taxpayer will win.",
  "Do not state that BIR will win.",
  "Do not provide a guaranteed outcome.",
  "Do not provide a settlement recommendation.",
  "Do not provide protest strategy.",
  "Do not provide CTA strategy.",
  "Do not provide litigation strategy.",
  "Do not provide a fake citation.",
  "Do not provide an unsupported authority conclusion."
]);

function safeString(value = "") {
  return String(value || "").trim();
}

function safeArray(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function unique(values = []) {
  return [...new Set(values)];
}

function normalizeMode(mode) {
  const clean = safeString(mode);
  if (clean === "ask" || clean === "/ask") return "ask";
  if (clean === "tax" || clean === "/tax") return "tax";
  if (clean === "audit" || clean === "/audit") return "audit";
  return clean || "ask";
}

function decisionFrom(input = {}) {
  const result = input.clarificationResult && typeof input.clarificationResult === "object"
    ? input.clarificationResult
    : input;
  return safeString(result.clarificationDecision || result.decision);
}

function answerAllowedFrom(input = {}) {
  const result = input.clarificationResult && typeof input.clarificationResult === "object"
    ? input.clarificationResult
    : input;
  return result.answerAllowed === false ? false : true;
}

function canReachFinalConclusionFrom(clarificationResult = {}) {
  return clarificationResult.canReachFinalConclusion === true && clarificationResult.answerAllowed !== false;
}

export function normalizeClarificationResponseType(input = {}) {
  const clarificationResult = input.clarificationResult && typeof input.clarificationResult === "object"
    ? input.clarificationResult
    : input;
  const answerAllowed = answerAllowedFrom({ clarificationResult });
  const decision = decisionFrom({ clarificationResult }) || safeString(input.decision);

  if (answerAllowed === false) return "clarification";
  if (decision === "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP") return "answer_with_followup";
  if (decision === "REQUEST_DOCUMENTS") return "document_request_with_cautious_answer";
  if (decision === "DISCLOSE_SOURCE_LIMITATION") return "source_limited_orientation";
  if (decision === "DISCLOSE_PHASE10_DEFERRAL") return "phase10_deferred_orientation";
  if (decision === "ANSWER_NOW_NO_CLARIFICATION_NEEDED") return "answer";
  return "answer_with_followup";
}

export function shouldBlockFullAnswerGeneration(input = {}) {
  return input.featureFlagEnabled === true && input.clarificationResult?.answerAllowed === false;
}

function routeActionFor(responseType, blocked) {
  if (blocked) return "RETURN_CLARIFICATION_ONLY";
  if (responseType === "answer") return "CONTINUE_TO_FULL_ANSWER";
  if (responseType === "answer_with_followup") return "CONTINUE_WITH_FOLLOWUP_CONSTRAINTS";
  if (responseType === "document_request_with_cautious_answer") return "CONTINUE_WITH_DOCUMENT_REQUEST_CONSTRAINTS";
  if (responseType === "source_limited_orientation") return "CONTINUE_WITH_SOURCE_LIMITATION_CONSTRAINTS";
  if (responseType === "phase10_deferred_orientation") return "CONTINUE_WITH_PHASE10_DEFERRAL_CONSTRAINTS";
  return "CONTINUE_WITH_CLARIFICATION_CONSTRAINTS";
}

function renderingHintsFor(mode) {
  if (mode === "tax") {
    return {
      format: "senior_memo",
      maxQuestions: 3,
      noFinalOpinionWhenClarificationRequired: true
    };
  }
  if (mode === "audit") {
    return {
      format: "procedural_first",
      maxQuestions: 3,
      noProtestSettlementCTAWhenClarificationRequired: true
    };
  }
  return {
    format: "conversational",
    maxQuestions: 3
  };
}

function compactQuestions(value) {
  return safeArray(value).slice(0, 3);
}

function compactDocumentRequests(value) {
  return safeArray(value);
}

function compactSourceCards(sourceCards) {
  if (!Array.isArray(sourceCards)) return [];
  return sourceCards.map((card) => {
    if (!card || typeof card !== "object") return {};
    const compact = {};
    for (const field of COMPACT_SOURCE_CARD_FIELDS) {
      if (Object.hasOwn(card, field) && card[field] !== undefined && card[field] !== null) {
        compact[field] = card[field];
      }
    }
    return compact;
  });
}

function compactMetadata(value, depth = 0) {
  if (depth > 3) return undefined;
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((item) => compactMetadata(item, depth + 1)).filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      if (RAW_TEXT_KEYS.has(key)) continue;
      const compact = compactMetadata(child, depth + 1);
      if (compact !== undefined) output[key] = compact;
    }
    return output;
  }
  return undefined;
}

function summarizeOneHelperOutput(value) {
  if (!value || typeof value !== "object") return { present: false };
  const summary = { present: true };
  for (const key of SUMMARY_KEYS) {
    if (Object.hasOwn(value, key)) summary[key] = value[key];
  }
  for (const [key, child] of Object.entries(value)) {
    if (/label$/i.test(key) || /decision$/i.test(key) || /posture$/i.test(key)) {
      if (typeof child === "string" || typeof child === "boolean") summary[key] = child;
    }
  }
  return summary;
}

function summarizeHelperOutputs(helperOutputs = {}) {
  if (!helperOutputs || typeof helperOutputs !== "object") return {};
  const summary = {};
  for (const [key, value] of Object.entries(helperOutputs)) {
    summary[key] = summarizeOneHelperOutput(value);
  }
  return summary;
}

function sourceCoverageLimitationsFrom(clarificationResult = {}, fallback = []) {
  return unique(safeArray(clarificationResult.sourceCoverageLimitations).concat(safeArray(fallback)));
}

function phase10DeferralsFrom(clarificationResult = {}) {
  return unique(safeArray(clarificationResult.phase10Deferrals));
}

function prohibitedConclusionsFrom(clarificationResult = {}) {
  return unique(safeArray(clarificationResult.prohibitedConclusions).concat(PROHIBITED_CONCLUSIONS));
}

function buildStructuredClarificationObject(input, context) {
  const {
    mode,
    decision,
    responseType,
    answerAllowed,
    blocked
  } = context;
  const clarificationResult = input.clarificationResult || {};
  return {
    mode,
    decision,
    responseType,
    answerAllowed,
    canReachFinalConclusion: blocked ? false : canReachFinalConclusionFrom(clarificationResult),
    allowedAnswerPosture: safeString(clarificationResult.allowedAnswerPosture) || (answerAllowed ? "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS" : "NO_ANSWER_UNTIL_CLARIFIED"),
    prohibitedConclusions: prohibitedConclusionsFrom(clarificationResult),
    sourceCoverageLimitations: sourceCoverageLimitationsFrom(clarificationResult, input.sourceCoverageNeeds),
    phase10Deferrals: phase10DeferralsFrom(clarificationResult),
    questions: compactQuestions(clarificationResult.questions),
    documentRequests: compactDocumentRequests(clarificationResult.documentRequests),
    sourceAvailabilityState: safeString(input.sourceAvailabilityState),
    authorityState: safeString(input.authorityState),
    sourceCoverageNeeds: safeArray(input.sourceCoverageNeeds),
    sourceCards: compactSourceCards(input.sourceCards),
    retrievalContext: compactMetadata(input.retrievalContext || {}),
    knownFacts: compactMetadata(input.knownFacts || {}),
    helperOutputsSummary: summarizeHelperOutputs(input.helperOutputs || {}),
    renderingHints: renderingHintsFor(mode),
    implementationScope: CLARIFICATION_ROUTE_HELPER_IMPLEMENTATION_SCOPE
  };
}

function implementationFlags() {
  return {
    liveRouteImplemented: false,
    promptIntegrationImplemented: false,
    responseGenerationImplemented: false,
    productionOrchestratorImplemented: false,
    frontendImplemented: false
  };
}

export function buildClarificationRouteDecision(input = {}) {
  const mode = normalizeMode(input.mode);
  const flags = implementationFlags();

  if (input.featureFlagEnabled !== true) {
    return {
      enabled: false,
      routeBranchActive: false,
      mode,
      responseType: "answer",
      shouldBuildFullAnswerPrompt: true,
      shouldCallOpenAIForFullAnswer: true,
      featureFlagOffBehavior: FEATURE_FLAG_OFF_BEHAVIOR,
      structuredClarificationObject: null,
      ...flags
    };
  }

  const clarificationResult = input.clarificationResult || {};
  const answerAllowed = answerAllowedFrom({ clarificationResult });
  const blocked = shouldBlockFullAnswerGeneration({ featureFlagEnabled: true, clarificationResult });
  const decision = decisionFrom({ clarificationResult }) || "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP";
  const responseType = normalizeClarificationResponseType({ clarificationResult });
  const structuredClarificationObject = buildStructuredClarificationObject(input, {
    mode,
    decision,
    responseType,
    answerAllowed,
    blocked
  });

  return {
    enabled: true,
    routeBranchActive: true,
    mode,
    insertionPoint: INSERTION_POINT,
    shouldRunBeforePromptConstruction: true,
    shouldRunBeforeOpenAIGeneration: true,
    responseType,
    shouldBuildFullAnswerPrompt: !blocked,
    shouldCallOpenAIForFullAnswer: !blocked,
    blockingTrigger: blocked ? "answerAllowed === false" : null,
    routeAction: routeActionFor(responseType, blocked),
    answerAllowed,
    canReachFinalConclusion: blocked ? false : structuredClarificationObject.canReachFinalConclusion,
    structuredClarificationObject,
    responseTypeTaxonomy: RESPONSE_TYPES,
    ...flags
  };
}

export default {
  buildClarificationRouteDecision,
  normalizeClarificationResponseType,
  shouldBlockFullAnswerGeneration
};
