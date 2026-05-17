// FILE: rag-answer-handler.js
"use strict";

/**
 * TINA RAG Answer Handler
 * Version: 8.0.0
 *
 * Boundary rule:
 * - no giant prompt assembly
 * - no raw retrieval injection
 * - no raw engine-object injection
 * - calls context-orchestration-engine.js only
 * - receives answer, then applies final compliance and rendering
 */

import {
  callOpenAIWithOrchestration
} from "./context-orchestration-engine.js";

import {
  renderTinaJsonPayload
} from "./answer-renderer.js";

import {
  buildFinalCompliantAnswer
} from "./final-answer-compliance.js";

import {
  sanitizeAnswerForDisplay,
  finalizeSourcesForResponse,
  buildCompactConversationHistory
} from "./ask-helpers.js";

const ENGINE_VERSION = "8.0.0";

const DEFAULT_MODEL =
  process.env.OPENAI_MODEL ||
  process.env.DEFAULT_OPENAI_MODEL ||
  "gpt-4o-mini";

const HARD_MAX_SOURCES = 8;
const HARD_MAX_SOURCE_CHARS = 1400;
const HARD_MAX_HISTORY_ITEMS = 6;

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function trimText(value = "", max = 1200) {
  const text = normalizeText(value);
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max).trim()} ...[trimmed]`;
}

function pickText(source = {}) {
  return (
    source.text ||
    source.content ||
    source.excerpt ||
    source.preview ||
    source.summary ||
    source.chunkText ||
    source.pageContent ||
    ""
  );
}

function compactSource(source = {}, index = 0) {
  return {
    title: trimText(
      source.title ||
        source.sourceTitle ||
        source.source_title ||
        source.documentTitle ||
        source.document_title ||
        source.source ||
        source.sourcePath ||
        source.source_path ||
        source.path ||
        `Source ${index + 1}`,
      220
    ),

    authorityType:
      source.authorityType ||
      source.authority_type ||
      source.authorityLabel ||
      source.authority_label ||
      source.metadata?.authorityType ||
      "UNKNOWN",

    citation: trimText(
      source.citation ||
        source.reference ||
        source.normalizedReference ||
        source.normalized_reference ||
        source.issuanceNumber ||
        source.issuance_number ||
        "",
      260
    ),

    url:
      source.url ||
      source.driveViewUrl ||
      source.drive_view_url ||
      source.sourceUrl ||
      source.source_url ||
      "",

    text: trimText(pickText(source), HARD_MAX_SOURCE_CHARS),
    content: trimText(pickText(source), HARD_MAX_SOURCE_CHARS),

    score:
      Number(
        source.finalScore ??
          source.final_score ??
          source.rerankScore ??
          source.retrievalScore ??
          source.score ??
          source.similarity ??
          0
      ) || 0,

    controllingPrecedence:
      Number(
        source.controllingPrecedence ??
          source.controlling_precedence ??
          source.authorityLevel ??
          source.authority_level ??
          99
      ) || 99,

    targetAuthorityMatch:
      source.targetAuthorityMatch === true ||
      source.issueClassificationMatch?.targetAuthorityMatch === true,

    issueClassificationMatch:
      source.issueClassificationMatch || null,

    issueMismatch:
      source.issueMismatch === true ||
      source.issueClassificationMatch?.issueMismatch === true
  };
}

function normalizeIssueClassification({
  issueClassification = null,
  queryIntent = null,
  retrievalResult = null,
  adaptiveContext = null
} = {}) {
  return (
    issueClassification?.orchestrationClassification ||
    issueClassification ||
    retrievalResult?.issueClassification?.orchestrationClassification ||
    retrievalResult?.issueClassification ||
    queryIntent?.issueClassification?.orchestrationClassification ||
    queryIntent?.issueClassification ||
    adaptiveContext?.issueClassification?.orchestrationClassification ||
    adaptiveContext?.issueClassification ||
    {}
  );
}

function normalizeIntent({
  queryIntent = null,
  orchestrationIntent = null,
  adaptiveContext = null
} = {}) {
  return (
    orchestrationIntent ||
    queryIntent?.orchestrationIntent ||
    queryIntent?.intentFlags ||
    queryIntent ||
    adaptiveContext?.orchestrationIntent ||
    {}
  );
}

function normalizeRetrievedSources({
  retrievedSources = [],
  retrievalResult = null,
  issueClassification = {}
} = {}) {
  const rawSources =
    retrievedSources?.length
      ? retrievedSources
      : retrievalResult?.retrievedSources ||
        retrievalResult?.sources ||
        retrievalResult?.results ||
        retrievalResult?.matches ||
        [];

  const visibleSources = finalizeSourcesForResponse(
    safeArray(rawSources).slice(0, HARD_MAX_SOURCES),
    {
      issueClassification,
      maxItems: HARD_MAX_SOURCES
    }
  );

  return visibleSources
    .map(compactSource)
    .filter((source) => !source.issueMismatch)
    .slice(0, HARD_MAX_SOURCES);
}

function normalizeConversationHistory(history = []) {
  return buildCompactConversationHistory(
    safeArray(history).slice(-HARD_MAX_HISTORY_ITEMS),
    HARD_MAX_HISTORY_ITEMS
  ).map((item) => ({
    role: item.role === "assistant" ? "assistant" : "user",
    content: trimText(item.content || "", 700)
  }));
}

function buildCompactClassification(issueClassification = {}) {
  return {
    primaryIssue: issueClassification.primaryIssue || null,
    subIssue: issueClassification.subIssue || null,
    retrievalStrategy: issueClassification.retrievalStrategy || null,
    targetAuthorities: safeArray(issueClassification.targetAuthorities).slice(0, 10),
    responseMode: issueClassification.responseMode || null,
    factSensitivity: issueClassification.factSensitivity || null
  };
}

function buildCompactIntent(intent = {}) {
  return {
    intent: intent.intent || intent.type || null,
    requiresSimpleDefinition: Boolean(intent.requiresSimpleDefinition),
    requiresLegalAnalysis: Boolean(intent.requiresLegalAnalysis),
    requiresJurisprudence: Boolean(intent.requiresJurisprudence),
    requiresRiskAnalysis: Boolean(intent.requiresRiskAnalysis),
    requiresFactPatternAnalysis: Boolean(intent.requiresFactPatternAnalysis),
    requiresEvidenceEvaluation: Boolean(intent.requiresEvidenceEvaluation),
    requiresContractInterpretation: Boolean(intent.requiresContractInterpretation),
    requiresTransactionCharacterization: Boolean(intent.requiresTransactionCharacterization),
    requiresEconomicSubstance: Boolean(intent.requiresEconomicSubstance)
  };
}

function buildCompactAdaptiveContext(adaptiveContext = {}) {
  return {
    activeMode:
      adaptiveContext.activeMode ||
      adaptiveContext.mode ||
      adaptiveContext.hookConfig?.mode ||
      null,

    activeHook:
      adaptiveContext.activeHook ||
      adaptiveContext.hookConfig?.hook_code ||
      null,

    responseMode:
      adaptiveContext.responseMode ||
      adaptiveContext.responsePlan?.responseMode ||
      null,

    orchestrationMode:
      adaptiveContext.orchestrationMode ||
      adaptiveContext.responsePlan?.orchestrationMode ||
      null
  };
}

function extractAnswerFromOpenAIResult(result = {}) {
  return (
    result.answer ||
    result.text ||
    result.output_text ||
    result.completion?.choices?.[0]?.message?.content ||
    result.raw?.choices?.[0]?.message?.content ||
    ""
  );
}

function extractOrchestrationMetadata(result = {}) {
  return (
    result.orchestration ||
    result.orchestrationContext ||
    result.context ||
    {}
  );
}

function buildFallbackAnswer({ error = null } = {}) {
  return [
    "A. DIRECT ANSWER",
    "TINA could not complete the RAG response due to a processing limitation.",
    "",
    "B. SYSTEM LIMITATION",
    trimText(error?.message || "The orchestration-safe OpenAI call failed.", 600),
    "",
    "C. NEXT STEP",
    "- Retry with a narrower issue.",
    "- Reduce attached facts or source scope.",
    "- Re-run issue-specific retrieval."
  ].join("\n");
}

async function callOrchestrationOnly({
  openai = null,
  question = "",
  sources = [],
  conversationHistory = [],
  issueClassification = {},
  intent = {},
  adaptiveContext = {},
  model = DEFAULT_MODEL,
  temperature = null
} = {}) {
  return await callOpenAIWithOrchestration({
    openai,
    userQuery: question,
    retrievedSources: sources,
    classification: buildCompactClassification(issueClassification),
    intent: buildCompactIntent(intent),
    conversationHistory,
    adaptiveContext: buildCompactAdaptiveContext(adaptiveContext),
    model,
    temperature
  });
}

function buildSafeMetadata({
  metadata = {},
  sources = [],
  issueClassification = {},
  intent = {},
  orchestration = {}
} = {}) {
  return {
    ...safeObject(metadata),

    ragAnswerHandlerVersion: ENGINE_VERSION,
    usesOrchestrationOnly: true,
    directOpenAICallDisabled: true,

    noGiantPromptAssembly: true,
    rawRetrievalPayloadInjectionPrevented: true,
    rawEngineObjectInjectionPrevented: true,
    fullDebugObjectInjectionPrevented: true,
    fullEngineOutputInjectionPrevented: true,
    compactSourcesOnly: true,

    primaryIssue: issueClassification?.primaryIssue || null,
    subIssue: issueClassification?.subIssue || null,
    targetAuthorities: safeArray(issueClassification?.targetAuthorities),
    sourceCount: safeArray(sources).length,

    intent: intent?.intent || intent?.type || null,
    orchestrationMode:
      orchestration?.mode ||
      orchestration?.orchestrationMode ||
      orchestration?.contextMode ||
      null,

    estimatedInputTokens:
      orchestration?.estimatedInputTokens ||
      orchestration?.diagnostics?.estimatedInputTokens ||
      null,

    wasTrimmed:
      orchestration?.wasTrimmed ||
      false
  };
}

function applyFinalGateAndRender({
  answer = "",
  fallbackAnswer = "",
  sources = [],
  issueClassification = {},
  adaptiveContext = {},
  question = "",
  jurisprudencePayload = null,
  hierarchyConflict = null,
  conflicts = [],
  orchestration = {},
  metadata = {}
} = {}) {
  const compliantAnswer = buildFinalCompliantAnswer({
    draftAnswer: answer,
    fallbackAnswer,
    legalBasisDocs: sources,
    sourcesUsed: sources,
    hierarchyConflict,
    conflicts,
    jurisprudencePayload,
    query: question,
    issueClassification,
    orchestrationMode:
      orchestration?.mode ||
      orchestration?.orchestrationMode ||
      orchestration?.contextMode ||
      issueClassification?.orchestrationMode ||
      null,
    responseMode:
      issueClassification?.responseMode ||
      null,
    contextMode:
      orchestration?.contextMode ||
      orchestration?.mode ||
      null
  });

  const cleanAnswer = sanitizeAnswerForDisplay(compliantAnswer);

  return renderTinaJsonPayload({
    answer: cleanAnswer,
    sources,
    includeSourcesInAnswer: false,
    adaptiveContext,
    issueClassification,
    jurisprudencePayload,
    hierarchyConflict,
    orchestrationMode:
      orchestration?.mode ||
      orchestration?.orchestrationMode ||
      orchestration?.contextMode ||
      null,
    contextMode:
      orchestration?.contextMode ||
      orchestration?.mode ||
      null,
    metadata: {
      ...metadata,
      finalGateApplied: true,
      finalAnswerComplianceEngine: "final-answer-compliance.js",
      rendererEngine: "answer-renderer.js",
      ragAnswerHandlerVersion: ENGINE_VERSION
    }
  });
}

export async function generateRagAnswer({
  question = "",
  retrievedSources = [],
  conversationHistory = [],
  issueClassification = {},
  orchestrationIntent = {},
  adaptiveContext = {},
  model = DEFAULT_MODEL,
  temperature = null,
  metadata = {},
  openai = null,
  jurisprudencePayload = null,
  hierarchyConflict = null,
  conflicts = []
} = {}) {
  const finalIssueClassification =
    issueClassification?.orchestrationClassification ||
    issueClassification ||
    {};

  const finalIntent = normalizeIntent({
    orchestrationIntent,
    adaptiveContext
  });

  const sources = normalizeRetrievedSources({
    retrievedSources,
    issueClassification: finalIssueClassification
  });

  const history = normalizeConversationHistory(conversationHistory);

  let answer = "";
  let orchestration = {};
  let error = null;

  try {
    const result = await callOrchestrationOnly({
      openai,
      question,
      sources,
      conversationHistory: history,
      issueClassification: finalIssueClassification,
      intent: finalIntent,
      adaptiveContext,
      model,
      temperature
    });

    answer = extractAnswerFromOpenAIResult(result);
    orchestration = extractOrchestrationMetadata(result);
  } catch (err) {
    error = err;
    answer = buildFallbackAnswer({ error: err });
    orchestration = {};
  }

  const safeMetadata = buildSafeMetadata({
    metadata,
    sources,
    issueClassification: finalIssueClassification,
    intent: finalIntent,
    orchestration
  });

  return applyFinalGateAndRender({
    answer,
    fallbackAnswer: buildFallbackAnswer({ error }),
    sources,
    issueClassification: finalIssueClassification,
    adaptiveContext,
    question,
    jurisprudencePayload,
    hierarchyConflict,
    conflicts,
    orchestration,
    metadata: safeMetadata
  });
}

export async function generateRagAnswerWithContextOrchestration(args = {}) {
  return generateRagAnswer({
    ...args,
    metadata: {
      ...safeObject(args.metadata),
      usedContextOrchestrationEngine: true
    }
  });
}

export async function generateSimpleRagAnswer({
  question = "",
  retrievedSources = [],
  openai = null,
  model = DEFAULT_MODEL
} = {}) {
  return generateRagAnswer({
    question,
    retrievedSources,
    openai,
    model,
    issueClassification: {
      primaryIssue: "GENERAL_TAX",
      responseMode: "FAST_DEFINITION",
      orchestrationMode: "FAST_DEFINITION"
    },
    orchestrationIntent: {
      requiresSimpleDefinition: true
    },
    metadata: {
      simpleMode: true
    }
  });
}

export function ragAnswerHandlerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_RAG_ANSWER_HANDLER",
    version: ENGINE_VERSION,

    orchestrationOnly: true,
    directOpenAICallDisabled: true,

    noGiantPromptAssembly: true,
    rawRetrievalPayloadInjectionPrevented: true,
    rawEngineObjectInjectionPrevented: true,
    fullDebugObjectInjectionPrevented: true,
    fullEngineOutputInjectionPrevented: true,

    compactSourcesOnly: true,
    compactMetadataOnly: true,

    contextOrchestrationCompatible: true,
    finalAnswerComplianceCompatible: true,
    answerRendererCompatible: true,

    esmCompatible: true
  };
}

export default {
  generateRagAnswer,
  generateRagAnswerWithContextOrchestration,
  generateSimpleRagAnswer,
  ragAnswerHandlerHealthCheck
};
