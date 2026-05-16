// FILE: rag-answer-handler.js
"use strict";

/**
 * TINA Enterprise RAG Answer Handler
 * Version: 7.0.0
 *
 * Uses context-orchestration-engine.js only for OpenAI calls.
 */

import OpenAI from "openai";

import {
  buildOpenAIContext,
  callOpenAIWithOrchestration
} from "./context-orchestration-engine.js";

import {
  planAdaptiveResponse,
  buildResponsePlannerInstruction
} from "./adaptive-response-planner.js";

import {
  buildContextOrchestrationPromptContract
} from "./adaptive-tina-master-prompt.js";

import {
  renderTinaJsonPayload
} from "./answer-renderer.js";

import {
  buildFinalCompliantAnswer
} from "./final-answer-compliance.js";

import {
  sanitizeAnswerForDisplay,
  finalizeSourcesForResponse,
  buildSourcesForOpenAI,
  buildCompactConversationHistory
} from "./ask-helpers.js";

const ENGINE_VERSION = "7.0.0";

const DEFAULT_MODEL =
  process.env.OPENAI_MODEL ||
  process.env.DEFAULT_OPENAI_MODEL ||
  "gpt-4o-mini";

const HARD_MAX_SOURCES = 8;

const DEFAULT_SYSTEM_GUARDRAILS = `
You are TINA.

Rules:
- Use only compact orchestration context.
- Do not inject raw retrieval objects.
- Do not inject full source text.
- Do not inject debug JSON.
- Do not invent authorities, cases, or issuance numbers.
- Do not say "Conflict Detected: YES" unless complete conflict metadata exists.
- Use issue-matched and target-authority-matched sources only.
`.trim();

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

function trimText(value = "", max = 2000) {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()} ...[trimmed]`;
}

function buildOpenAIClient({ apiKey = process.env.OPENAI_API_KEY } = {}) {
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  return new OpenAI({ apiKey });
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

  return finalizeSourcesForResponse(safeArray(rawSources).slice(0, HARD_MAX_SOURCES), {
    issueClassification,
    maxItems: HARD_MAX_SOURCES
  });
}

function normalizeConversationHistory(history = []) {
  return buildCompactConversationHistory(safeArray(history), 6);
}

function buildResponsePlan({
  question = "",
  issueClassification = {},
  intent = {},
  adaptiveContext = {}
} = {}) {
  return planAdaptiveResponse({
    question,
    issueClassification,
    orchestrationIntent: intent,
    queryIntent: intent,
    adaptiveContext
  });
}

function buildPromptContract({
  responsePlan = {},
  extraInstructions = []
} = {}) {
  return buildContextOrchestrationPromptContract(
    responsePlan.responseMode || "STANDARD_TAX_MODE",
    {
      orchestrationMode:
        responsePlan.orchestrationMode ||
        responsePlan.contextMode ||
        "STANDARD_TAX",
      extraInstructions
    }
  );
}

function buildPlannerSystemPrompt({
  responsePlan = {},
  orchestrationContract = {},
  extraSystemPrompt = ""
} = {}) {
  let plannerInstruction = null;

  try {
    plannerInstruction = buildResponsePlannerInstruction(responsePlan);
  } catch {
    plannerInstruction = null;
  }

  return [
    DEFAULT_SYSTEM_GUARDRAILS,
    orchestrationContract?.masterPrompt || "",
    plannerInstruction?.instruction?.join("\n") || "",
    extraSystemPrompt || ""
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function buildCompactSourcesForOpenAI({
  sources = [],
  issueClassification = {},
  responsePlan = {}
} = {}) {
  const maxItems =
    responsePlan?.contextBudgetPolicy?.maxSources ||
    responsePlan?.rendererContract?.contextBudgetPolicy?.maxSources ||
    6;

  return buildSourcesForOpenAI(sources, {
    issueClassification,
    maxItems: Math.min(maxItems, HARD_MAX_SOURCES),
    maxTextChars:
      responsePlan?.contextBudgetPolicy?.maxSourceChars ||
      responsePlan?.rendererContract?.contextBudgetPolicy?.maxSourceChars ||
      1600
  });
}

function buildOrchestrationPayload({
  question = "",
  sources = [],
  conversationHistory = [],
  issueClassification = {},
  intent = {},
  adaptiveContext = {},
  responsePlan = {},
  orchestrationContract = {},
  model = DEFAULT_MODEL,
  extraSystemPrompt = ""
} = {}) {
  const systemPrompt = buildPlannerSystemPrompt({
    responsePlan,
    orchestrationContract,
    extraSystemPrompt
  });

  const compactSources = buildCompactSourcesForOpenAI({
    sources,
    issueClassification,
    responsePlan
  });

  return {
    openai: null,
    userQuery: question,
    systemPrompt,
    masterPrompt: orchestrationContract?.masterPrompt || "",
    retrievedSources: compactSources,
    classification: issueClassification,
    intent,
    conversationHistory,
    model,
    adaptiveContext,
    responsePlan
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

function buildFallbackAnswer({
  responsePlan = {},
  error = null
} = {}) {
  const restriction =
    responsePlan?.conclusionRule?.requiredLanguage ||
    "Based on the available facts, the position is preliminary and subject to verification.";

  return [
    "A. DIRECT ANSWER",
    "TINA could not complete the optimized RAG response due to a processing limitation.",
    "",
    "B. SYSTEM LIMITATION",
    trimText(error?.message || "The orchestration-safe OpenAI call failed.", 600),
    "",
    "C. PRELIMINARY POSITION",
    restriction,
    "",
    "D. NEXT STEP",
    "- Retry with a narrower issue.",
    "- Reduce attached facts or source scope.",
    "- Re-run issue-specific retrieval."
  ].join("\n");
}

function applyFinalCompliance({
  answer = "",
  fallbackAnswer = "",
  responsePlan = {},
  orchestrationContract = {},
  sources = [],
  issueClassification = {},
  adaptiveContext = {},
  question = "",
  jurisprudencePayload = null,
  hierarchyConflict = null,
  conflicts = [],
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
    mode:
      responsePlan?.responseMode ||
      orchestrationContract?.responseMode ||
      null,
    orchestrationMode:
      responsePlan?.orchestrationMode ||
      orchestrationContract?.orchestrationMode ||
      null,
    responseMode:
      responsePlan?.responseMode ||
      null,
    contextMode:
      responsePlan?.contextMode ||
      responsePlan?.orchestrationMode ||
      null
  });

  const cleanAnswer = sanitizeAnswerForDisplay(compliantAnswer);

  return renderTinaJsonPayload({
    answer: cleanAnswer,
    sources,
    includeSourcesInAnswer: false,
    adaptiveContext,
    responsePlan,
    issueClassification,
    jurisprudencePayload,
    hierarchyConflict,
    orchestrationMode:
      responsePlan?.orchestrationMode ||
      responsePlan?.contextMode ||
      null,
    contextMode:
      responsePlan?.contextMode ||
      responsePlan?.orchestrationMode ||
      null,
    metadata: {
      ...metadata,
      finalComplianceApplied: true,
      finalAnswerComplianceEngine: "final-answer-compliance.js",
      rendererEngine: "answer-renderer.js",
      ragAnswerHandlerVersion: ENGINE_VERSION
    }
  });
}

function buildSafeMetadata({
  responsePlan = {},
  orchestrationContract = {},
  sources = [],
  issueClassification = {},
  orchestration = null,
  metadata = {}
} = {}) {
  return {
    ...metadata,
    ragAnswerHandlerVersion: ENGINE_VERSION,
    contextOrchestrationCompatible: true,
    usesOrchestrationOnly: true,
    directOpenAICallDisabled: true,
    rawSourceInjectionPrevented: true,
    fullDebugObjectInjectionPrevented: true,
    fullEngineOutputInjectionPrevented: true,
    compactSourcesOnly: true,
    responseMode:
      responsePlan?.responseMode ||
      orchestrationContract?.responseMode ||
      null,
    orchestrationMode:
      responsePlan?.orchestrationMode ||
      responsePlan?.contextMode ||
      orchestrationContract?.orchestrationMode ||
      null,
    responseDepth:
      responsePlan?.responseDepth ||
      null,
    primaryIssue:
      issueClassification?.primaryIssue ||
      null,
    targetAuthorities:
      safeArray(issueClassification?.targetAuthorities),
    sourceCount:
      safeArray(sources).length,
    estimatedInputTokens:
      orchestration?.estimatedInputTokens ||
      orchestration?.diagnostics?.estimatedInputTokens ||
      null,
    wasTrimmed:
      orchestration?.wasTrimmed ||
      false
  };
}

async function executeOrchestratedAnswer({
  openai = null,
  question = "",
  sources = [],
  conversationHistory = [],
  issueClassification = {},
  intent = {},
  adaptiveContext = {},
  responsePlan = {},
  orchestrationContract = {},
  model = DEFAULT_MODEL,
  temperature = null,
  extraSystemPrompt = ""
} = {}) {
  const resolvedOpenAI = openai || buildOpenAIClient();

  const payload = buildOrchestrationPayload({
    question,
    sources,
    conversationHistory,
    issueClassification,
    intent,
    adaptiveContext,
    responsePlan,
    orchestrationContract,
    model,
    extraSystemPrompt
  });

  payload.openai = resolvedOpenAI;

  const result = await callOpenAIWithOrchestration({
    ...payload,
    temperature:
      temperature ??
      responsePlan?.contextBudgetPolicy?.temperature ??
      responsePlan?.rendererContract?.contextBudgetPolicy?.temperature
  });

  return {
    raw: result,
    answer: extractAnswerFromOpenAIResult(result),
    orchestration: result.orchestration || result.orchestrationContext || null
  };
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
  extraSystemPrompt = "",
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

  const responsePlan = buildResponsePlan({
    question,
    issueClassification: finalIssueClassification,
    intent: finalIntent,
    adaptiveContext
  });

  const orchestrationContract = buildPromptContract({
    responsePlan
  });

  const sources = normalizeRetrievedSources({
    retrievedSources,
    issueClassification: finalIssueClassification
  });

  const history = normalizeConversationHistory(conversationHistory);

  let execution;

  try {
    execution = await executeOrchestratedAnswer({
      openai,
      question,
      sources,
      conversationHistory: history,
      issueClassification: finalIssueClassification,
      intent: finalIntent,
      adaptiveContext,
      responsePlan,
      orchestrationContract,
      model,
      temperature,
      extraSystemPrompt
    });
  } catch (error) {
    execution = {
      raw: null,
      answer: buildFallbackAnswer({
        responsePlan,
        error
      }),
      orchestration: null,
      error
    };
  }

  const safeMetadata = buildSafeMetadata({
    responsePlan,
    orchestrationContract,
    sources,
    issueClassification: finalIssueClassification,
    orchestration: execution.orchestration,
    metadata
  });

  return applyFinalCompliance({
    answer: execution.answer,
    fallbackAnswer: buildFallbackAnswer({
      responsePlan,
      error: execution.error
    }),
    responsePlan,
    orchestrationContract,
    sources,
    issueClassification: finalIssueClassification,
    adaptiveContext,
    question,
    jurisprudencePayload,
    hierarchyConflict,
    conflicts,
    metadata: safeMetadata
  });
}

export async function generateRagAnswerWithContextOrchestration({
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
  return generateRagAnswer({
    question,
    retrievedSources,
    conversationHistory,
    issueClassification,
    orchestrationIntent,
    adaptiveContext,
    model,
    temperature,
    metadata: {
      ...metadata,
      usedContextOrchestrationEngine: true
    },
    openai,
    jurisprudencePayload,
    hierarchyConflict,
    conflicts
  });
}

export function createRagAnswerHandler({
  supabase = null,
  openai = null,
  contextOrchestration = null,
  openaiModel = DEFAULT_MODEL
} = {}) {
  async function handleRagAnswer({
    res = null,
    userId = null,
    conversationId = null,
    cleanQuestion = "",
    originalQuestion = "",
    hookConfig = {},
    adaptiveContext = {},
    openaiModel: routeOpenAIModel = null,
    orchestrationMetadata = {},
    retrievedSources = [],
    retrievalResult = null,
    conversationHistory = [],
    issueClassification = null,
    queryIntent = null,
    orchestrationIntent = null,
    jurisprudencePayload = null,
    hierarchyConflict = null,
    conflicts = [],
    extraSystemPrompt = ""
  } = {}) {
    try {
      const question = cleanQuestion || originalQuestion || "";

      const finalIssueClassification = normalizeIssueClassification({
        issueClassification,
        queryIntent,
        retrievalResult,
        adaptiveContext
      });

      const finalIntent = normalizeIntent({
        queryIntent,
        orchestrationIntent,
        adaptiveContext
      });

      const finalSources = normalizeRetrievedSources({
        retrievedSources,
        retrievalResult,
        issueClassification: finalIssueClassification
      });

      const finalAdaptiveContext = {
        ...safeObject(adaptiveContext),
        hookConfig: {
          hook_code: hookConfig?.hook_code || null,
          mode: hookConfig?.mode || null,
          title: hookConfig?.title || null
        },
        orchestrationMetadata: {
          ...safeObject(orchestrationMetadata),
          routeUsesOrchestrationOnly: true
        }
      };

      const result = await generateRagAnswer({
        question,
        retrievedSources: finalSources,
        conversationHistory,
        issueClassification: finalIssueClassification,
        orchestrationIntent: finalIntent,
        adaptiveContext: finalAdaptiveContext,
        model: routeOpenAIModel || openaiModel,
        temperature: null,
        extraSystemPrompt,
        metadata: {
          userId,
          conversationId,
          hook: hookConfig?.hook_code || null,
          mode: hookConfig?.mode || null,
          ...safeObject(orchestrationMetadata)
        },
        openai,
        jurisprudencePayload,
        hierarchyConflict,
        conflicts
      });

      const payload = {
        success: true,
        engine: "TINA_RAG_ANSWER_HANDLER",
        version: ENGINE_VERSION,
        hook: hookConfig?.hook_code || null,
        mode: hookConfig?.mode || null,
        hookTitle: hookConfig?.title || null,
        answer: result.answer,
        sources: result.sources || [],
        sourcesUsed: result.sources || [],
        vectorMatches: safeArray(result.sources).length,
        sourceStatus: safeArray(result.sources).length
          ? "ISSUE_MATCHED_CONTEXT_USED"
          : "NO_VISIBLE_SOURCE",
        metadata: {
          ...safeObject(result.metadata),
          ragAnswerHandlerVersion: ENGINE_VERSION,
          contextOrchestrationCompatible: true,
          usesOrchestrationOnly: true,
          directOpenAICallDisabled: true,
          rawSourceInjectionPrevented: true,
          fullDebugObjectInjectionPrevented: true,
          fullEngineOutputInjectionPrevented: true
        }
      };

      if (res && typeof res.json === "function") {
        return res.json(payload);
      }

      return payload;
    } catch (error) {
      const fallbackPayload = {
        success: false,
        engine: "TINA_RAG_ANSWER_HANDLER",
        version: ENGINE_VERSION,
        error:
          error?.message ||
          "RAG answer generation failed.",
        answer:
          "TINA could not complete the response due to a processing error. Please retry with a narrower question or fewer facts.",
        sources: [],
        sourcesUsed: [],
        vectorMatches: 0,
        sourceStatus: "RAG_HANDLER_ERROR",
        metadata: {
          contextOrchestrationCompatible: true,
          usesOrchestrationOnly: true,
          directOpenAICallDisabled: true,
          rawSourceInjectionPrevented: true,
          fullDebugObjectInjectionPrevented: true,
          fullEngineOutputInjectionPrevented: true
        }
      };

      if (res && typeof res.status === "function") {
        return res.status(500).json(fallbackPayload);
      }

      return fallbackPayload;
    }
  }

  return {
    handleRagAnswer
  };
}

export function ragAnswerHandlerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_RAG_ANSWER_HANDLER",
    version: ENGINE_VERSION,
    contextOrchestrationCompatible: true,
    usesOrchestrationOnly: true,
    directOpenAICallDisabled: true,
    plannerCompatible: true,
    adaptiveMasterPromptCompatible: true,
    rendererCompatible: true,
    finalAnswerComplianceCompatible: true,
    compactSourcesOnly: true,
    rawSourceInjectionPrevented: true,
    fullDebugObjectInjectionPrevented: true,
    fullEngineOutputInjectionPrevented: true
  };
}

export default {
  generateRagAnswer,
  generateRagAnswerWithContextOrchestration,
  createRagAnswerHandler,
  ragAnswerHandlerHealthCheck
};
