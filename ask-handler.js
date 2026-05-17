// FILE: ask-handler.js
"use strict";

/**
 * TINA Ask Handler
 * Version: 7.0.0
 *
 * ORCHESTRATION-FIRST ROUTE CONTROLLER
 *
 * Correct flow:
 * ask-handler.js
 * → query-intent-engine.js
 * → issue-classification-engine.js
 * → retrieval-engine.js
 * → rag-answer-handler.js
 * → context-orchestration-engine.js
 *
 * This file does NOT:
 * - call OpenAI directly
 * - assemble prompts
 * - estimate tokens
 * - inject raw retrieval payloads
 * - inject raw engine objects
 */

import {
  getModeState,
  saveModeState,
  clearModeState,
  isExplicitModeHook
} from "./mode-state.js";

import {
  extractMemoryHooks,
  saveMemoryHooks
} from "./memory-hooks.js";

import { saveMessage } from "./conversation-memory.js";
import { storeFeedbackEntry } from "./feedback-learning.js";

import {
  extractQuizAnswer
} from "./ask-helpers.js";

import {
  createAssessmentHandler
} from "./assessment-handler.js";

import {
  generateRagAnswer
} from "./rag-answer-handler.js";

import {
  buildOpenAIContext as defaultBuildOpenAIContext,
  callOpenAIWithOrchestration as defaultCallOpenAIWithOrchestration
} from "./context-orchestration-engine.js";

import * as QueryIntentEngine from "./query-intent-engine.js";
import * as IssueClassificationEngine from "./issue-classification-engine.js";
import * as RetrievalEngine from "./retrieval-engine.js";

const ENGINE_VERSION = "7.0.0";

const EXIT_COMMANDS = ["/bye", "/exit", "/stop", "/quit", "/reset"];

const ALLOWED_HOOKS = [
  "/ask",
  "/tax",
  "/review",
  "/quiz",
  "/diagnostic",
  "/progress",
  "/feedback",
  "/source"
];

const RAG_ROUTED_HOOKS = new Set([
  "/ask",
  "/tax",
  "/review",
  "/source"
]);

const SPECIAL_ASSESSMENT_HOOKS = new Set([
  "/quiz",
  "/diagnostic"
]);

const DEFAULT_RETRIEVAL_LIMIT = 6;
const SIMPLE_RETRIEVAL_LIMIT = 3;
const MAX_RETRIEVAL_LIMIT = 8;

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeLower(value = "") {
  return normalizeText(value).toLowerCase();
}

function isExitCommand(value = "") {
  return EXIT_COMMANDS.includes(normalizeLower(value));
}

function normalizeHookCommand(value = "") {
  return normalizeLower(value).split(/\s+/)[0] || "";
}

function isRagRoutedHook(hookCode = "") {
  return RAG_ROUTED_HOOKS.has(String(hookCode || "").toLowerCase());
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function getUserId(req) {
  return (
    req?.user?.id ||
    req?.user?.userId ||
    req?.user?.sub ||
    req?.auth?.userId ||
    req?.body?.userId ||
    null
  );
}

function getConversationId(req) {
  return (
    req?.body?.conversationId ||
    req?.body?.sessionId ||
    req?.headers?.["x-conversation-id"] ||
    null
  );
}

function getForcedHook(req) {
  const forced = req?.body?.forcedHook || req?.body?.hook || null;
  if (!forced) return null;

  const normalized = normalizeLower(forced);
  return ALLOWED_HOOKS.includes(normalized) ? normalized : null;
}

function buildHardcodedHookConfig(hookCode = "/ask") {
  const hooks = {
    "/ask": {
      hook_code: "/ask",
      mode: "ASK",
      title: "Default TINA Assistant",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "STANDARD"
    },

    "/tax": {
      hook_code: "/tax",
      mode: "TAX_EXPERT",
      title: "Big 4 Tax Expert Mode",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "TECHNICAL"
    },

    "/review": {
      hook_code: "/review",
      mode: "TAX_REVIEWER",
      title: "CPALE Tax Reviewer Mode",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "REVIEWER"
    },

    "/quiz": {
      hook_code: "/quiz",
      mode: "QUIZ_MASTER",
      title: "Tax Quiz Mode",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "REVIEWER"
    },

    "/diagnostic": {
      hook_code: "/diagnostic",
      mode: "ADAPTIVE_QUIZ",
      title: "Adaptive CPALE Diagnostic Quiz",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "REVIEWER"
    },

    "/progress": {
      hook_code: "/progress",
      mode: "LEARNING_PROGRESS",
      title: "Learning Progress Tracker",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "STANDARD"
    },

    "/feedback": {
      hook_code: "/feedback",
      mode: "FEEDBACK",
      title: "Feedback Mode",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: true,
      adaptiveResponseMode: "STANDARD"
    },

    "/source": {
      hook_code: "/source",
      mode: "SOURCE_FINDER",
      title: "Source Finder Mode",
      requires_retrieval: true,
      requires_memory: false,
      requires_feedback: false,
      adaptiveResponseMode: "STANDARD"
    }
  };

  return hooks[hookCode] || hooks["/ask"];
}

function buildContextOrchestration(input = {}) {
  return {
    buildOpenAIContext:
      input.buildOpenAIContext ||
      defaultBuildOpenAIContext,

    callOpenAIWithOrchestration:
      input.callOpenAIWithOrchestration ||
      defaultCallOpenAIWithOrchestration
  };
}

function buildCompactExistingMode(existingMode = null) {
  if (!existingMode) return null;

  return {
    active_hook: existingMode.active_hook || null,
    active_mode: existingMode.active_mode || null,
    mode_title: existingMode.mode_title || null
  };
}

function buildCompactPendingQuiz(pendingQuiz = null) {
  if (!pendingQuiz) return false;

  return {
    exists: true,
    id: pendingQuiz.id || null,
    hook: pendingQuiz.hook || pendingQuiz.active_hook || null,
    status: pendingQuiz.status || null
  };
}

function buildCompactHookConfig(hookConfig = {}) {
  return {
    hook_code: hookConfig.hook_code || "/ask",
    mode: hookConfig.mode || "ASK",
    title: hookConfig.title || "Default TINA Assistant",
    requires_retrieval: Boolean(hookConfig.requires_retrieval),
    requires_memory: Boolean(hookConfig.requires_memory),
    requires_feedback: Boolean(hookConfig.requires_feedback),
    adaptiveResponseMode: hookConfig.adaptiveResponseMode || "STANDARD",
    cleanQuestion: hookConfig.cleanQuestion || "",
    originalQuestion: hookConfig.originalQuestion || "",
    forcedHookApplied: Boolean(hookConfig.forcedHookApplied),
    engineVersion: ENGINE_VERSION
  };
}

async function loadTaxHookConfig({
  supabase,
  rawQuestion = "",
  forcedHook = null
}) {
  const text = normalizeText(rawQuestion);

  let hookCode = "/ask";
  let cleanQuestion = text;

  if (forcedHook && ALLOWED_HOOKS.includes(forcedHook)) {
    hookCode = forcedHook;

    if (normalizeHookCommand(text) === forcedHook) {
      cleanQuestion = text.slice(forcedHook.length).trim();
    }
  } else {
    const firstWord = normalizeHookCommand(text);

    if (ALLOWED_HOOKS.includes(firstWord)) {
      hookCode = firstWord;
      cleanQuestion = text.slice(firstWord.length).trim();
    }
  }

  const fallbackConfig = buildHardcodedHookConfig(hookCode);

  try {
    const { data, error } = await supabase
      .from("tina_tax_hooks")
      .select("*")
      .eq("hook_code", hookCode)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Hook config load error:", error.message);
    }

    if (data) {
      return {
        ...fallbackConfig,
        hook_code: fallbackConfig.hook_code,
        mode: fallbackConfig.mode,
        requires_retrieval: isRagRoutedHook(fallbackConfig.hook_code),

        requires_memory:
          data.requires_memory ??
          fallbackConfig.requires_memory,

        requires_feedback:
          data.requires_feedback ??
          fallbackConfig.requires_feedback,

        title:
          data.title ||
          fallbackConfig.title,

        adaptiveResponseMode:
          data.adaptiveResponseMode ||
          data.adaptive_response_mode ||
          fallbackConfig.adaptiveResponseMode,

        cleanQuestion: cleanQuestion || text,
        originalQuestion: text,

        forcedHookApplied: Boolean(forcedHook),
        engineVersion: ENGINE_VERSION
      };
    }
  } catch (error) {
    console.error("Hook config fallback used:", error.message);
  }

  return {
    ...fallbackConfig,
    cleanQuestion: cleanQuestion || text,
    originalQuestion: text,
    forcedHookApplied: Boolean(forcedHook),
    engineVersion: ENGINE_VERSION
  };
}

function buildAdaptiveContextForHook({
  hookConfig,
  existingMode = null,
  pendingQuiz = null,
  contextOrchestrationEnabled = true
}) {
  const mode = hookConfig.mode;

  const responseModeByHook = {
    ASK: "STANDARD",
    TAX_EXPERT: "TECHNICAL",
    TAX_REVIEWER: "REVIEWER",
    SOURCE_FINDER: "STANDARD"
  };

  const responseMode =
    hookConfig.adaptiveResponseMode ||
    responseModeByHook[mode] ||
    "STANDARD";

  return {
    askHandlerVersion: ENGINE_VERSION,

    activeHook: hookConfig.hook_code,
    activeMode: mode,

    existingMode: buildCompactExistingMode(existingMode),
    pendingQuiz: buildCompactPendingQuiz(pendingQuiz),

    adaptiveResponseMode: responseMode,

    adaptiveMode: {
      primaryMode: mode,
      responseMode,
      sourceMode: mode === "SOURCE_FINDER",
      reviewerMode: mode === "TAX_REVIEWER",
      taxExpertMode: mode === "TAX_EXPERT"
    },

    orchestration: {
      correctFlowEnabled: true,
      queryIntentFirst: true,
      issueClassificationSecond: true,
      retrievalThird: true,
      ragFourth: true,
      contextOrchestrationFinal: true,
      contextOrchestrationEnabled: Boolean(contextOrchestrationEnabled)
    },

    responsePlan: {
      responseMode,

      responseDepth:
        mode === "TAX_EXPERT"
          ? "COMPREHENSIVE"
          : mode === "SOURCE_FINDER"
            ? "SOURCE_ONLY"
            : "STANDARD",

      mustUseRagPipeline: true,

      hookCode: hookConfig.hook_code,
      hookMode: mode,

      sourceOrderingPolicy: {
        useIssueClassificationMatch: true,
        useTargetAuthorityMatch: true,
        useControllingPrecedence: true,
        hideIssueMismatchedSources: true
      },

      conflictDisplayPolicy: {
        displayConflictYesOnlyWhenConflictTrue: true,
        requireCompleteConflictMetadata: true,
        requireSameIssueGate: true,
        requireOppositeHoldingGate: true,
        otherwiseTreatAsDistinguishableOrNoDirectConflict: true
      },

      contextBudgetPolicy: {
        useContextOrchestrationEngine: true,
        preventRawFullDocumentInjection: true,
        preventFullDebugObjectInjection: true,
        preventFullEngineOutputInjection: true,
        compressSourcesBeforeOpenAI: true,
        finalTrimBeforeOpenAI: true,
        onlyPassCompactMetadata: true
      }
    }
  };
}

function buildCompactOrchestrationMetadata(extra = {}) {
  return {
    askHandlerVersion: ENGINE_VERSION,

    orchestrationFirstArchitecture: true,
    routeControllerOnly: true,
    noDirectOpenAICall: true,
    noPromptAssembly: true,
    noTokenEstimation: true,
    noRawRetrievalPayloadInjection: true,
    noRawEngineObjectInjection: true,

    correctFlowEnabled: true,
    queryIntentEngineCalled: Boolean(extra.queryIntentEngineCalled),
    issueClassificationEngineCalled: Boolean(extra.issueClassificationEngineCalled),
    retrievalEngineCalled: Boolean(extra.retrievalEngineCalled),

    contextOrchestrationEnabled: true,
    openAIContextBudgetingEnabled: true,
    finalTrimBeforeOpenAIEnabled: true,
    compressSourcesBeforeOpenAI: true,

    routeHook: extra.routeHook || null,
    routeMode: extra.routeMode || null,

    retrievalSourceCount:
      Number(extra.retrievalSourceCount || 0)
  };
}

function isSimpleDefinitionQuestion(question = "") {
  const q = normalizeLower(question);

  return (
    q.length <= 160 &&
    /^(what is|define|meaning of|ano ang)\b/i.test(q) &&
    !/\b(analyze|risk|audit|contract|jurisprudence|doctrine|conflict|case|legal consequence|assessment|substance|evidence|compare)\b/i.test(q)
  );
}

function findFunction(moduleObject = {}, candidateNames = []) {
  for (const name of candidateNames) {
    if (typeof moduleObject[name] === "function") {
      return moduleObject[name];
    }
  }

  if (typeof moduleObject.default === "function") {
    return moduleObject.default;
  }

  return null;
}

async function runQueryIntentEngine({
  question,
  hookConfig,
  adaptiveContext
}) {
  const fn = findFunction(QueryIntentEngine, [
    "detectQueryIntent",
    "analyzeQueryIntent",
    "classifyQueryIntent",
    "runQueryIntentEngine",
    "queryIntentEngine",
    "detectIntent"
  ]);

  if (!fn) {
    return {
      intent: "GENERAL_TAX_QUERY",
      requiresSimpleDefinition: isSimpleDefinitionQuestion(question),
      requiresLegalAnalysis: hookConfig.mode === "TAX_EXPERT",
      routeHook: hookConfig.hook_code,
      routeMode: hookConfig.mode,
      fallbackIntentUsed: true
    };
  }

  try {
    const result = await fn({
      question,
      query: question,
      userQuery: question,
      hookConfig,
      adaptiveContext
    });

    return safeObject(result);
  } catch (error) {
    console.error("Query intent engine failed:", error.message);

    return {
      intent: "GENERAL_TAX_QUERY",
      requiresSimpleDefinition: isSimpleDefinitionQuestion(question),
      requiresLegalAnalysis: hookConfig.mode === "TAX_EXPERT",
      routeHook: hookConfig.hook_code,
      routeMode: hookConfig.mode,
      fallbackIntentUsed: true,
      error: error.message
    };
  }
}

async function runIssueClassificationEngine({
  question,
  queryIntent,
  hookConfig,
  adaptiveContext
}) {
  const fn = findFunction(IssueClassificationEngine, [
    "classifyTaxIssue",
    "classifyIssue",
    "classifyQueryIssue",
    "runIssueClassification",
    "issueClassificationEngine",
    "classify"
  ]);

  if (!fn) {
    return buildFallbackIssueClassification({
      question,
      queryIntent,
      hookConfig
    });
  }

  try {
    const result = await fn({
      question,
      query: question,
      userQuery: question,
      queryIntent,
      intent: queryIntent,
      hookConfig,
      adaptiveContext
    });

    return normalizeIssueClassificationResult(result, {
      question,
      queryIntent,
      hookConfig
    });
  } catch (error) {
    console.error("Issue classification engine failed:", error.message);

    return {
      ...buildFallbackIssueClassification({
        question,
        queryIntent,
        hookConfig
      }),
      classificationError: error.message
    };
  }
}

function buildFallbackIssueClassification({
  question = "",
  queryIntent = {},
  hookConfig = {}
} = {}) {
  const q = normalizeLower(question);

  let primaryIssue = "GENERAL_TAX";
  let subIssue = "GENERAL_TAX_QUERY";
  let targetAuthorities = ["NIRC", "RR", "RMC"];

  if (/\bvat\b|value[-\s]?added tax/i.test(q)) {
    primaryIssue = "VAT_LIABILITY";
    subIssue = isSimpleDefinitionQuestion(question)
      ? "VAT_DEFINITION"
      : "VAT_GENERAL_RULE";
    targetAuthorities = ["NIRC", "RR"];
  } else if (/\bwithholding|ewt|cwt|fwt\b/i.test(q)) {
    primaryIssue = "WITHHOLDING";
    subIssue = "WITHHOLDING_TAX";
    targetAuthorities = ["NIRC", "RR"];
  } else if (/\bincome tax|rcit|mcit|nolco\b/i.test(q)) {
    primaryIssue = "INCOME_TAX";
    subIssue = "CORPORATE_INCOME_TAX";
    targetAuthorities = ["NIRC", "RR", "RMC"];
  }

  const simple = Boolean(
    queryIntent?.requiresSimpleDefinition ||
      isSimpleDefinitionQuestion(question)
  );

  return {
    primaryIssue,
    subIssue,
    retrievalStrategy: simple
      ? "FAST_DEFINITION_PRIMARY_AUTHORITY"
      : "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",
    targetAuthorities,
    responseMode:
      simple
        ? "FAST_DEFINITION"
        : hookConfig.mode === "TAX_EXPERT"
          ? "LEGAL_ANALYSIS"
          : "STANDARD_TAX",
    orchestrationMode:
      simple
        ? "FAST_DEFINITION"
        : hookConfig.mode === "TAX_EXPERT"
          ? "LEGAL_ANALYSIS"
          : "STANDARD_TAX",
    complexity: simple ? "simple" : "standard",
    fallbackClassificationUsed: true
  };
}

function normalizeIssueClassificationResult(result = {}, fallbackInput = {}) {
  const source =
    result?.orchestrationClassification ||
    result?.issueClassification ||
    result?.classification ||
    result ||
    {};

  return {
    ...buildFallbackIssueClassification(fallbackInput),
    ...safeObject(source),
    primaryIssue:
      source.primaryIssue ||
      source.primary_issue ||
      source.domain ||
      buildFallbackIssueClassification(fallbackInput).primaryIssue,
    subIssue:
      source.subIssue ||
      source.sub_issue ||
      source.issueType ||
      buildFallbackIssueClassification(fallbackInput).subIssue,
    retrievalStrategy:
      source.retrievalStrategy ||
      source.retrieval_strategy ||
      buildFallbackIssueClassification(fallbackInput).retrievalStrategy,
    targetAuthorities:
      safeArray(
        source.targetAuthorities ||
          source.target_authorities ||
          buildFallbackIssueClassification(fallbackInput).targetAuthorities
      )
  };
}

function normalizeRetrievedSources(result = {}) {
  const raw =
    result?.retrievedSources ||
    result?.sources ||
    result?.results ||
    result?.matches ||
    result?.documents ||
    result?.data ||
    [];

  return safeArray(raw)
    .map((source, index) => ({
      title:
        source.title ||
        source.sourceTitle ||
        source.source_title ||
        source.documentTitle ||
        source.document_title ||
        source.source ||
        source.path ||
        `Source ${index + 1}`,

      authorityType:
        source.authorityType ||
        source.authority_type ||
        source.type ||
        source.category ||
        source.metadata?.authorityType ||
        "UNKNOWN",

      citation:
        source.citation ||
        source.reference ||
        source.normalizedReference ||
        source.normalized_reference ||
        source.url ||
        source.driveViewUrl ||
        "",

      url:
        source.url ||
        source.driveViewUrl ||
        source.drive_view_url ||
        source.sourceUrl ||
        "",

      text:
        source.text ||
        source.content ||
        source.chunkText ||
        source.excerpt ||
        source.preview ||
        source.pageContent ||
        source.summary ||
        "",

      content:
        source.content ||
        source.text ||
        source.chunkText ||
        source.excerpt ||
        source.preview ||
        "",

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

      issueClassificationMatch:
        source.issueClassificationMatch || null,

      targetAuthorityMatch:
        source.targetAuthorityMatch === true ||
        source.issueClassificationMatch?.targetAuthorityMatch === true,

      issueMismatch:
        source.issueMismatch === true ||
        source.issueClassificationMatch?.issueMismatch === true
    }))
    .filter((source) => source.text || source.content)
    .filter((source) => !source.issueMismatch)
    .slice(0, MAX_RETRIEVAL_LIMIT);
}

async function runRetrievalEngine({
  question,
  queryIntent,
  issueClassification,
  hookConfig,
  adaptiveContext,
  supabase
}) {
  const fn = findFunction(RetrievalEngine, [
    "retrieveSources",
    "retrieveForQuestion",
    "runRetrieval",
    "runRetrievalEngine",
    "getRelevantSources",
    "searchRelevantSources",
    "retrievalEngine"
  ]);

  if (!fn) {
    return {
      retrievedSources: [],
      retrievalEngineMissing: true,
      retrievalMetadata: {
        reason: "No compatible retrieval function export found."
      }
    };
  }

  const limit =
    issueClassification?.orchestrationMode === "FAST_DEFINITION" ||
    queryIntent?.requiresSimpleDefinition ||
    isSimpleDefinitionQuestion(question)
      ? SIMPLE_RETRIEVAL_LIMIT
      : DEFAULT_RETRIEVAL_LIMIT;

  try {
    const result = await fn({
      question,
      query: question,
      userQuery: question,
      intent: queryIntent,
      queryIntent,
      issueClassification,
      primaryIssue: issueClassification.primaryIssue,
      subIssue: issueClassification.subIssue,
      retrievalStrategy: issueClassification.retrievalStrategy,
      targetAuthorities: issueClassification.targetAuthorities,
      hookConfig,
      adaptiveContext,
      supabase,
      limit,
      maxResults: limit
    });

    return {
      ...safeObject(result),
      retrievedSources: normalizeRetrievedSources(result),
      retrievalLimit: limit,
      retrievalEngineCalled: true
    };
  } catch (error) {
    console.error("Retrieval engine failed:", error.message);

    return {
      retrievedSources: [],
      retrievalError: error.message,
      retrievalEngineCalled: true,
      retrievalMetadata: {
        reason: "Retrieval engine threw an error."
      }
    };
  }
}

async function buildRagPipelineContext({
  question,
  hookConfig,
  adaptiveContext,
  supabase
}) {
  const queryIntent = await runQueryIntentEngine({
    question,
    hookConfig,
    adaptiveContext
  });

  const issueClassification = await runIssueClassificationEngine({
    question,
    queryIntent,
    hookConfig,
    adaptiveContext
  });

  const retrievalResult = await runRetrievalEngine({
    question,
    queryIntent,
    issueClassification,
    hookConfig,
    adaptiveContext,
    supabase
  });

  const retrievedSources = normalizeRetrievedSources(retrievalResult);

  return {
    queryIntent,
    issueClassification,
    retrievalResult: {
      ...safeObject(retrievalResult),
      retrievedSources
