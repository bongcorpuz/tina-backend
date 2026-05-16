// FILE: rag-answer-handler.js
"use strict";

/**
 * TINA Enterprise RAG Answer Handler
 * Version: 6.0.0
 *
 * PURPOSE
 * ------------------------------------------------------------------
 * - Main RAG answer orchestration layer
 * - Connects:
 *      context-orchestration-engine.js
 *      adaptive-response-planner.js
 *      adaptive-tina-master-prompt.js
 *      answer-renderer.js
 *      final-answer-compliance.js
 * - Prevents:
 *      raw source injection
 *      oversized context payloads
 *      full debug object leakage
 *      full engine output injection
 *      uncapped retrieval
 *      hallucinated doctrinal conflicts
 * - Uses compact orchestration-safe context only
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
  enforceFinalAnswerCompliance
} from "./final-answer-compliance.js";

import {
  sanitizeAnswerForDisplay,
  finalizeSourcesForResponse,
  buildSourcesForOpenAI,
  buildCompactConversationHistory
} from "./ask-helpers.js";

const ENGINE_VERSION = "6.0.0";

const DEFAULT_MODEL =
  process.env.OPENAI_MODEL ||
  process.env.DEFAULT_OPENAI_MODEL ||
  "gpt-5";

const DEFAULT_TEMPERATURE = 0.15;

const DEFAULT_MAX_COMPLETION_TOKENS = 1800;

const HARD_MAX_COMPLETION_TOKENS = 3200;

const HARD_MAX_SOURCES = 8;

const DEFAULT_SYSTEM_GUARDRAILS = `
You are TINA.

STRICT RULES:
- Never fabricate authorities.
- Never fabricate jurisprudence.
- Never fabricate RR/RMC/RMO numbers.
- Never say conflict exists unless conflict metadata supports it.
- Never inject raw retrieval objects.
- Never inject full source text.
- Never inject raw JSON payloads.
- Never inject debug objects.
- Never inject full engine outputs.
- Use issue-matched authorities only.
- Use concise source summaries only.
`.trim();

function normalizeText(value = "") {
  return String(value || "").trim();
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value)
    ? value.filter(Boolean)
    : [value].filter(Boolean);
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function clamp(number, min, max) {
  const value = Number(number);

  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, value));
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function trimText(value = "", max = 1200) {
  const text = compactSpaces(value);

  if (!text) return "";

  if (text.length <= max) return text;

  return `${text.slice(0, max).trim()} ...[trimmed]`;
}

function buildSystemPrompt({
  plannerInstruction = null,
  orchestrationContract = null,
  extraSystemPrompt = ""
} = {}) {
  const sections = [
    DEFAULT_SYSTEM_GUARDRAILS
  ];

  if (orchestrationContract?.masterPrompt) {
    sections.push(orchestrationContract.masterPrompt);
  }

  if (plannerInstruction?.instruction?.length) {
    sections.push(
      plannerInstruction.instruction.join("\n")
    );
  }

  if (extraSystemPrompt) {
    sections.push(extraSystemPrompt);
  }

  return sections
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function buildCompactUserPayload({
  question = "",
  retrievedSources = [],
  conversationHistory = [],
  issueClassification = {},
  orchestrationIntent = {},
  responsePlan = {},
  adaptiveContext = {}
} = {}) {
  return {
    userQuestion: trimText(question, 5000),

    issueClassification: {
      primaryIssue:
        issueClassification.primaryIssue || null,

      subIssue:
        issueClassification.subIssue || null,

      retrievalStrategy:
        issueClassification.retrievalStrategy || null,

      targetAuthorities:
        safeArray(issueClassification.targetAuthorities).slice(0, 10)
    },

    orchestrationIntent: {
      requiresLegalAnalysis:
        orchestrationIntent.requiresLegalAnalysis || false,

      requiresEvidenceEvaluation:
        orchestrationIntent.requiresEvidenceEvaluation || false,

      requiresTransactionCharacterization:
        orchestrationIntent.requiresTransactionCharacterization || false,

      requiresContractInterpretation:
        orchestrationIntent.requiresContractInterpretation || false,

      requiresEconomicSubstance:
        orchestrationIntent.requiresEconomicSubstance || false
    },

    responsePlan: {
      responseMode:
        responsePlan.responseMode || null,

      orchestrationMode:
        responsePlan.orchestrationMode || null,

      responseDepth:
        responsePlan.responseDepth || null
    },

    adaptiveContext: {
      activeMode:
        adaptiveContext.activeMode || null,

      activeHook:
        adaptiveContext.activeHook || null
    },

    conversationHistory:
      safeArray(conversationHistory).slice(-6),

    retrievedSources:
      safeArray(retrievedSources).slice(0, HARD_MAX_SOURCES)
  };
}

function buildMessages({
  systemPrompt = "",
  userPayload = {}
} = {}) {
  return [
    {
      role: "system",
      content: systemPrompt
    },

    {
      role: "user",
      content: JSON.stringify(userPayload)
    }
  ];
}

function extractCompletionText(response = {}) {
  try {
    if (typeof response.output_text === "string") {
      return response.output_text;
    }

    if (Array.isArray(response.output)) {
      return response.output
        .flatMap((item) =>
          safeArray(item.content)
        )
        .map((item) => item.text || "")
        .join("\n");
    }

    if (response.choices?.length) {
      return response.choices
        .map((choice) =>
          choice?.message?.content || ""
        )
        .join("\n");
    }

    return "";
  } catch {
    return "";
  }
}

function buildOpenAIClient({
  apiKey = process.env.OPENAI_API_KEY
} = {}) {
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY environment variable."
    );
  }

  return new OpenAI({ apiKey });
}

function sanitizeRetrievedSources(
  sources = [],
  issueClassification = {}
) {
  return finalizeSourcesForResponse(
    safeArray(sources).slice(0, HARD_MAX_SOURCES),
    {
      issueClassification,
      maxItems: HARD_MAX_SOURCES
    }
  );
}

function sanitizeConversationHistory(
  history = []
) {
  return buildCompactConversationHistory(
    history,
    6
  );
}

function buildPlanner({
  question = "",
  issueClassification = {},
  orchestrationIntent = {},
  adaptiveContext = {}
} = {}) {
  return planAdaptiveResponse({
    question,
    issueClassification,
    orchestrationIntent,
    adaptiveContext
  });
}

function buildPromptContract({
  responsePlan = {},
  orchestrationMode = null
} = {}) {
  return buildContextOrchestrationPromptContract(
    responsePlan.responseMode ||
      "STANDARD_TAX_MODE",
    {
      orchestrationMode:
        orchestrationMode ||
        responsePlan.orchestrationMode
    }
  );
}

function buildTokenPolicy({
  responsePlan = {}
} = {}) {
  const policy =
    responsePlan.contextBudgetPolicy || {};

  return {
    maxCompletionTokens: clamp(
      policy.maxCompletionTokens ||
        DEFAULT_MAX_COMPLETION_TOKENS,
      300,
      HARD_MAX_COMPLETION_TOKENS
    ),

    maxPromptTokens: clamp(
      policy.maxPromptTokens || 9000,
      1000,
      15000
    )
  };
}

function buildCompletionRequest({
  model = DEFAULT_MODEL,
  messages = [],
  temperature = DEFAULT_TEMPERATURE,
  tokenPolicy = {}
} = {}) {
  return {
    model,

    input: messages,

    temperature,

    max_output_tokens:
      tokenPolicy.maxCompletionTokens
  };
}

async function executeOpenAICompletion({
  openai,
  requestPayload = {}
} = {}) {
  if (!openai) {
    throw new Error(
      "OpenAI client is required."
    );
  }

  try {
    const response =
      await openai.responses.create(
        requestPayload
      );

    return {
      success: true,
      raw: response,
      answer: extractCompletionText(response)
    };
  } catch (error) {
    return {
      success: false,
      error,
      answer: "",
      raw: null
    };
  }
}

function buildFallbackAnswer({
  question = "",
  responsePlan = {},
  error = null
} = {}) {
  const restriction =
    responsePlan?.conclusionRule
      ?.requiredLanguage ||
    "Based on the available facts, the position is preliminary and subject to verification.";

  return `
A. DIRECT ANSWER

TINA could not complete a fully optimized response due to a processing limitation.

B. SYSTEM LIMITATION

The orchestration layer prevented unsafe oversized context injection or invalid payload construction.

C. PRELIMINARY POSITION

${restriction}

D. NEXT STEP

Retry with:
- narrower issue scope;
- fewer attached facts;
- or issue-specific retrieval.
`.trim();
}

function buildSafeMetadata({
  responsePlan = {},
  orchestrationContract = {},
  retrievedSources = [],
  issueClassification = {}
} = {}) {
  return {
    ragAnswerHandlerVersion:
      ENGINE_VERSION,

    responseMode:
      responsePlan.responseMode,

    orchestrationMode:
      responsePlan.orchestrationMode,

    responseDepth:
      responsePlan.responseDepth,

    contextOrchestrationCompatible:
      true,

    rendererCompatible:
      true,

    finalComplianceCompatible:
      true,

    issueClassificationAware:
      true,

    issueClassificationMatchAware:
      true,

    targetAuthorityAware:
      true,

    sourceCount:
      safeArray(retrievedSources).length,

    primaryIssue:
      issueClassification.primaryIssue ||
      null,

    targetAuthorities:
      safeArray(
        issueClassification.targetAuthorities
      ),

    rawSourceInjectionPrevented:
      true,

    fullDebugObjectInjectionPrevented:
      true,

    fullEngineOutputInjectionPrevented:
      true,

    compactPromptCompatible:
      true,

    orchestrationContractVersion:
      orchestrationContract.version ||
      null
  };
}

async function runOpenAIWithPlanner({
  question = "",
  retrievedSources = [],
  conversationHistory = [],
  issueClassification = {},
  orchestrationIntent = {},
  adaptiveContext = {},
  extraSystemPrompt = "",
  model = DEFAULT_MODEL,
  temperature = DEFAULT_TEMPERATURE,
  openai = null
} = {}) {
  const responsePlan =
    buildPlanner({
      question,
      issueClassification,
      orchestrationIntent,
      adaptiveContext
    });

  const plannerInstruction =
    buildResponsePlannerInstruction(
      responsePlan
    );

  const orchestrationContract =
    buildPromptContract({
      responsePlan,
      orchestrationMode:
        responsePlan.orchestrationMode
    });

  const tokenPolicy =
    buildTokenPolicy({
      responsePlan
    });

  const sanitizedSources =
    sanitizeRetrievedSources(
      retrievedSources,
      issueClassification
    );

  const sanitizedHistory =
    sanitizeConversationHistory(
      conversationHistory
    );

  const userPayload =
    buildCompactUserPayload({
      question,
      retrievedSources:
        buildSourcesForOpenAI(
          sanitizedSources,
          {
            issueClassification,
            maxItems:
              tokenPolicy.maxPromptTokens > 9000
                ? 8
                : 5
          }
        ),

      conversationHistory:
        sanitizedHistory,

      issueClassification,

      orchestrationIntent,

      responsePlan,

      adaptiveContext
    });

  const systemPrompt =
    buildSystemPrompt({
      plannerInstruction,
      orchestrationContract,
      extraSystemPrompt
    });

  const messages =
    buildMessages({
      systemPrompt,
      userPayload
    });

  const requestPayload =
    buildCompletionRequest({
      model,
      messages,
      temperature,
      tokenPolicy
    });

  const completionResult =
    await executeOpenAICompletion({
      openai,
      requestPayload
    });

  if (!completionResult.success) {
    return {
      success: false,
      answer: buildFallbackAnswer({
        question,
        responsePlan,
        error: completionResult.error
      }),
      error: completionResult.error,
      responsePlan,
      orchestrationContract,
      retrievedSources:
        sanitizedSources
    };
  }

  return {
    success: true,
    answer:
      completionResult.answer || "",
    raw:
      completionResult.raw || null,
    responsePlan,
    orchestrationContract,
    retrievedSources:
      sanitizedSources
  };
}

function applyComplianceAndRender({
  answer = "",
  responsePlan = {},
  orchestrationContract = {},
  retrievedSources = [],
  issueClassification = {},
  adaptiveContext = {},
  metadata = {}
} = {}) {
  const complianceResult =
    enforceFinalAnswerCompliance({
      answer,

      responseMode:
        responsePlan.responseMode,

      orchestrationMode:
        responsePlan.orchestrationMode,

      rendererContract:
        orchestrationContract.rendererContract,

      responsePlan,

      issueClassification,

      adaptiveContext
    });

  const compliantAnswer =
    sanitizeAnswerForDisplay(
      complianceResult.answer ||
        answer
    );

  return renderTinaJsonPayload({
    answer:
      compliantAnswer,

    sources:
      retrievedSources,

    includeSourcesInAnswer:
      true,

    adaptiveContext,

    responsePlan,

    issueClassification,

    orchestrationMode:
      responsePlan.orchestrationMode,

    contextMode:
      responsePlan.contextMode,

    metadata: {
      ...metadata,

      complianceApplied:
        true,

      complianceVersion:
        complianceResult.version ||
        null
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
  temperature = DEFAULT_TEMPERATURE,
  extraSystemPrompt = "",
  metadata = {}
} = {}) {
  const openai =
    buildOpenAIClient();

  const result =
    await runOpenAIWithPlanner({
      question,
      retrievedSources,
      conversationHistory,
      issueClassification,
      orchestrationIntent,
      adaptiveContext,
      model,
      temperature,
      extraSystemPrompt,
      openai
    });

  const safeMetadata =
    buildSafeMetadata({
      responsePlan:
        result.responsePlan,

      orchestrationContract:
        result.orchestrationContract,

      retrievedSources:
        result.retrievedSources,

      issueClassification
    });

  return applyComplianceAndRender({
    answer:
      result.answer,

    responsePlan:
      result.responsePlan,

    orchestrationContract:
      result.orchestrationContract,

    retrievedSources:
      result.retrievedSources,

    issueClassification,

    adaptiveContext,

    metadata: {
      ...metadata,
      ...safeMetadata
    }
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
  temperature = DEFAULT_TEMPERATURE,
  metadata = {}
} = {}) {
  const orchestrationContext =
    await buildOpenAIContext({
      question,
      retrievedSources,
      conversationHistory,
      issueClassification,
      orchestrationIntent,
      adaptiveContext
    });

  const openaiResult =
    await callOpenAIWithOrchestration({
      orchestrationContext,
      model,
      temperature
    });

  const responsePlan =
    orchestrationContext.responsePlan ||
    buildPlanner({
      question,
      issueClassification,
      orchestrationIntent,
      adaptiveContext
    });

  const orchestrationContract =
    buildPromptContract({
      responsePlan,
      orchestrationMode:
        responsePlan.orchestrationMode
    });

  const safeMetadata =
    buildSafeMetadata({
      responsePlan,
      orchestrationContract,
      retrievedSources,
      issueClassification
    });

  const answer =
    openaiResult?.answer ||
    openaiResult?.text ||
    openaiResult?.output_text ||
    extractCompletionText(openaiResult?.raw || openaiResult || {}) ||
    "";

  return applyComplianceAndRender({
    answer,
    responsePlan,
    orchestrationContract,
    retrievedSources: sanitizeRetrievedSources(
      retrievedSources,
      issueClassification
    ),
    issueClassification,
    adaptiveContext,
    metadata: {
      ...metadata,
      ...safeMetadata,
      usedContextOrchestrationEngine: true
    }
  });
}

export function createRagAnswerHandler({
  supabase = null,
  openai = null,
  contextOrchestration = null,
  openaiModel = DEFAULT_MODEL
} = {}) {
  const resolvedOpenAI =
    openai ||
    buildOpenAIClient();

  const orchestration =
    contextOrchestration || {
      buildOpenAIContext,
      callOpenAIWithOrchestration
    };

  async function handleRagAnswer({
    res = null,
    userId = null,
    conversationId = null,
    cleanQuestion = "",
    originalQuestion = "",
    hookConfig = {},
    adaptiveContext = {},
    contextOrchestration: routeContextOrchestration = null,
    openaiModel: routeOpenAIModel = null,
    orchestrationMetadata = {},
    retrievedSources = [],
    retrievalResult = null,
    conversationHistory = [],
    issueClassification = null,
    queryIntent = null
  } = {}) {
    try {
      const question =
        cleanQuestion ||
        originalQuestion ||
        "";

      const finalIssueClassification =
        issueClassification ||
        retrievalResult?.issueClassification ||
        queryIntent?.issueClassification ||
        adaptiveContext?.issueClassification ||
        {};

      const finalOrchestrationIntent =
        queryIntent?.orchestrationIntent ||
        queryIntent?.intentFlags ||
        adaptiveContext?.orchestrationIntent ||
        {};

      const finalRetrievedSources =
        retrievedSources?.length
          ? retrievedSources
          : retrievalResult?.retrievedSources ||
            retrievalResult?.results ||
            [];

      const finalAdaptiveContext = {
        ...adaptiveContext,
        hookConfig: {
          hook_code: hookConfig.hook_code,
          mode: hookConfig.mode,
          title: hookConfig.title
        },
        orchestrationMetadata
      };

      const effectiveOrchestration =
        routeContextOrchestration ||
        orchestration;

      let result;

      if (
        effectiveOrchestration?.callOpenAIWithOrchestration &&
        effectiveOrchestration?.buildOpenAIContext
      ) {
        result =
          await generateRagAnswerWithContextOrchestration({
            question,
            retrievedSources:
              finalRetrievedSources,
            conversationHistory,
            issueClassification:
              finalIssueClassification,
            orchestrationIntent:
              finalOrchestrationIntent,
            adaptiveContext:
              finalAdaptiveContext,
            model:
              routeOpenAIModel ||
              openaiModel,
            metadata: {
              userId,
              conversationId,
              hook: hookConfig.hook_code,
              mode: hookConfig.mode,
              ...orchestrationMetadata
            }
          });
      } else {
        result =
          await generateRagAnswer({
            question,
            retrievedSources:
              finalRetrievedSources,
            conversationHistory,
            issueClassification:
              finalIssueClassification,
            orchestrationIntent:
              finalOrchestrationIntent,
            adaptiveContext:
              finalAdaptiveContext,
            model:
              routeOpenAIModel ||
              openaiModel,
            metadata: {
              userId,
              conversationId,
              hook: hookConfig.hook_code,
              mode: hookConfig.mode,
              ...orchestrationMetadata
            }
          });
      }

      const payload = {
        success: true,
        engine: "TINA_RAG_ANSWER_HANDLER",
        version: ENGINE_VERSION,
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: result.answer,
        sources: result.sources || [],
        sourcesUsed: result.sources || [],
        vectorMatches:
          result.sources?.length || 0,
        sourceStatus:
          result.sources?.length
            ? "ISSUE_MATCHED_CONTEXT_USED"
            : "NO_VISIBLE_SOURCE",
        metadata: {
          ...(result.metadata || {}),
          ragAnswerHandlerVersion:
            ENGINE_VERSION,
          contextOrchestrationCompatible:
            true,
          rawSourceInjectionPrevented:
            true,
          fullDebugObjectInjectionPrevented:
            true,
          fullEngineOutputInjectionPrevented:
            true
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
          contextOrchestrationCompatible:
            true,
          rawSourceInjectionPrevented:
            true,
          fullDebugObjectInjectionPrevented:
            true,
          fullEngineOutputInjectionPrevented:
            true
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
    plannerCompatible: true,
    adaptiveMasterPromptCompatible: true,
    rendererCompatible: true,
    finalAnswerComplianceCompatible: true,
    compactSourcesOnly: true,
    rawSourceInjectionPrevented: true,
    fullDebugObjectInjectionPrevented: true,
    fullEngineOutputInjectionPrevented: true,
    directOversizedOpenAICallPrevented: true
  };
}

export default {
  generateRagAnswer,
  generateRagAnswerWithContextOrchestration,
  createRagAnswerHandler,
  ragAnswerHandlerHealthCheck
};
