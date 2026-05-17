// FILE: ask-handler.js
"use strict";

/**
 * TINA Ask Handler
 * Version: 7.2.0
 *
 * TPM-conscious orchestration route controller.
 *
 * Correct flow:
 * ask-handler.js
 * → query-intent-engine.js
 * → issue-classification-engine.js
 * → retrieval-engine.js
 * → rag-answer-handler.js
 * → context-orchestration-engine.js
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

import { extractQuizAnswer } from "./ask-helpers.js";
import { createAssessmentHandler } from "./assessment-handler.js";
import { generateRagAnswer } from "./rag-answer-handler.js";

import {
  buildOpenAIContext as defaultBuildOpenAIContext,
  callOpenAIWithOrchestration as defaultCallOpenAIWithOrchestration
} from "./context-orchestration-engine.js";

import * as QueryIntentEngine from "./query-intent-engine.js";
import * as IssueClassificationEngine from "./issue-classification-engine.js";
import * as RetrievalEngine from "./retrieval-engine.js";

const ENGINE_VERSION = "7.2.0";

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

const DEFAULT_RETRIEVAL_LIMIT = 5;
const SIMPLE_RETRIEVAL_LIMIT = 3;
const SOURCE_MODE_RETRIEVAL_LIMIT = 8;
const MAX_RETRIEVAL_LIMIT = 8;

const MAX_SOURCE_TEXT_CHARS_SIMPLE = 1200;
const MAX_SOURCE_TEXT_CHARS_STANDARD = 2200;
const MAX_SOURCE_TEXT_CHARS_SOURCE_MODE = 2800;

const QUERY_INTENT_TIMEOUT_MS = 8000;
const ISSUE_CLASSIFICATION_TIMEOUT_MS = 10000;
const RETRIEVAL_TIMEOUT_MS = 18000;
const RAG_TIMEOUT_MS = 45000;

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

function compactString(value = "", maxChars = 2000) {
  const text = normalizeText(value).replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
}

function timeoutAfter(ms, label = "Operation") {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms.`));
    }, ms);
  });
}

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    timeoutAfter(ms, label)
  ]);
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

function isSimpleDefinitionQuestion(question = "") {
  const q = normalizeLower(question);

  return (
    q.length <= 160 &&
    /^(what is|define|meaning of|ano ang|ano ibig sabihin ng)\b/i.test(q) &&
    !/\b(analyze|risk|audit|contract|jurisprudence|doctrine|conflict|case|legal consequence|assessment|substance|evidence|compare|reconcile|compute|calculate)\b/i.test(q)
  );
}

function isComplexReasoningQuestion(question = "") {
  const q = normalizeLower(question);

  return /\b(analyze|evaluate|risk|audit|contract|jurisprudence|doctrine|conflict|legal basis|legal consequence|assessment|substance|evidence|compare|reconcile|position|defend|explain why|case law)\b/i.test(q);
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
    buildOpenAIContext: input.buildOpenAIContext || defaultBuildOpenAIContext,
    callOpenAIWithOrchestration:
      input.callOpenAIWithOrchestration || defaultCallOpenAIWithOrchestration
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
        requires_memory: data.requires_memory ?? fallbackConfig.requires_memory,
        requires_feedback: data.requires_feedback ?? fallbackConfig.requires_feedback,
        title: data.title || fallbackConfig.title,
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
      contextOrchestrationEnabled: Boolean(contextOrchestrationEnabled),
      tpmConscious: true,
      compactContextOnly: true
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
        onlyPassCompactMetadata: true,
        maxVisibleSources: MAX_RETRIEVAL_LIMIT,
        tpmConscious: true
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
    tpmConscious: true,

    routeHook: extra.routeHook || null,
    routeMode: extra.routeMode || null,
    retrievalSourceCount: Number(extra.retrievalSourceCount || 0)
  };
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

  if (
    moduleObject.default &&
    typeof moduleObject.default === "object"
  ) {
    for (const name of candidateNames) {
      if (typeof moduleObject.default[name] === "function") {
        return moduleObject.default[name];
      }
    }
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
      requiresLegalAnalysis:
        hookConfig.mode === "TAX_EXPERT" ||
        isComplexReasoningQuestion(question),
      routeHook: hookConfig.hook_code,
      routeMode: hookConfig.mode,
      fallbackIntentUsed: true
    };
  }

  try {
    const result = await withTimeout(
      fn({
        question,
        query: question,
        userQuery: question,
        hookConfig,
        adaptiveContext
      }),
      QUERY_INTENT_TIMEOUT_MS,
      "Query intent engine"
    );

    return safeObject(result);
  } catch (error) {
    console.error("Query intent engine failed:", error.message);

    return {
      intent: "GENERAL_TAX_QUERY",
      requiresSimpleDefinition: isSimpleDefinitionQuestion(question),
      requiresLegalAnalysis:
        hookConfig.mode === "TAX_EXPERT" ||
        isComplexReasoningQuestion(question),
      routeHook: hookConfig.hook_code,
      routeMode: hookConfig.mode,
      fallbackIntentUsed: true,
      error: error.message
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
  } else if (/\bzero[-\s]?rated|zero rating|0%\s*vat/i.test(q)) {
    primaryIssue = "VAT_LIABILITY";
    subIssue = "VAT_ZERO_RATING";
    targetAuthorities = ["NIRC", "RR", "RMC"];
  } else if (/\binput tax|input vat|refund|tax credit certificate|tcc\b/i.test(q)) {
    primaryIssue = "VAT_LIABILITY";
    subIssue = "VAT_INPUT_TAX_REFUND_CREDIT";
    targetAuthorities = ["NIRC", "RR", "RMC", "JURISPRUDENCE"];
  } else if (/\bwithholding|ewt|cwt|fwt\b/i.test(q)) {
    primaryIssue = "WITHHOLDING";
    subIssue = "WITHHOLDING_TAX";
    targetAuthorities = ["NIRC", "RR", "RMC"];
  } else if (/\bincome tax|rcit|mcit|nolco\b/i.test(q)) {
    primaryIssue = "INCOME_TAX";
    subIssue = "CORPORATE_INCOME_TAX";
    targetAuthorities = ["NIRC", "RR", "RMC"];
  } else if (/\bcapital gains tax|cgt|documentary stamp|dst\b/i.test(q)) {
    primaryIssue = "PROPERTY_AND_TRANSFER_TAX";
    subIssue = "CGT_DST";
    targetAuthorities = ["NIRC", "RR", "RMC"];
  }

  const simple = Boolean(
    queryIntent?.requiresSimpleDefinition ||
      isSimpleDefinitionQuestion(question)
  );

  const complex = Boolean(
    queryIntent?.requiresLegalAnalysis ||
      isComplexReasoningQuestion(question) ||
      hookConfig.mode === "TAX_EXPERT"
  );

  return {
    primaryIssue,
    subIssue,
    retrievalStrategy: simple
      ? "FAST_DEFINITION_PRIMARY_AUTHORITY"
      : complex
        ? "ISSUE_AUTHORITY_HIERARCHY_WITH_JURISPRUDENCE"
        : "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",
    targetAuthorities,
    responseMode: simple
      ? "FAST_DEFINITION"
      : complex
        ? "LEGAL_ANALYSIS"
        : "STANDARD_TAX",
    orchestrationMode: simple
      ? "FAST_DEFINITION"
      : complex
        ? "LEGAL_ANALYSIS"
        : "STANDARD_TAX",
    complexity: simple ? "simple" : complex ? "complex" : "standard",
    fallbackClassificationUsed: true
  };
}

function normalizeIssueClassificationResult(result = {}, fallbackInput = {}) {
  const fallback = buildFallbackIssueClassification(fallbackInput);

  const source =
    result?.orchestrationClassification ||
    result?.issueClassification ||
    result?.classification ||
    result ||
    {};

  return {
    ...fallback,
    ...safeObject(source),

    primaryIssue:
      source.primaryIssue ||
      source.primary_issue ||
      source.domain ||
      fallback.primaryIssue,

    subIssue:
      source.subIssue ||
      source.sub_issue ||
      source.issueType ||
      fallback.subIssue,

    retrievalStrategy:
      source.retrievalStrategy ||
      source.retrieval_strategy ||
      fallback.retrievalStrategy,

    targetAuthorities:
      safeArray(
        source.targetAuthorities ||
          source.target_authorities ||
          fallback.targetAuthorities
      ),

    responseMode:
      source.responseMode ||
      source.response_mode ||
      fallback.responseMode,

    orchestrationMode:
      source.orchestrationMode ||
      source.orchestration_mode ||
      source.contextMode ||
      fallback.orchestrationMode,

    complexity:
      source.complexity ||
      fallback.complexity
  };
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
    const result = await withTimeout(
      fn({
        question,
        query: question,
        userQuery: question,
        queryIntent,
        intent: queryIntent,
        hookConfig,
        adaptiveContext
      }),
      ISSUE_CLASSIFICATION_TIMEOUT_MS,
      "Issue classification engine"
    );

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

function getSourceTextLimit({
  question,
  hookConfig,
  issueClassification
}) {
  if (
    issueClassification?.orchestrationMode === "FAST_DEFINITION" ||
    isSimpleDefinitionQuestion(question)
  ) {
    return MAX_SOURCE_TEXT_CHARS_SIMPLE;
  }

  if (hookConfig?.mode === "SOURCE_FINDER") {
    return MAX_SOURCE_TEXT_CHARS_SOURCE_MODE;
  }

  return MAX_SOURCE_TEXT_CHARS_STANDARD;
}

function normalizeRetrievedSources(
  result = {},
  {
    question = "",
    hookConfig = {},
    issueClassification = {}
  } = {}
) {
  const raw =
    result?.retrievedSources ||
    result?.sources ||
    result?.results ||
    result?.matches ||
    result?.documents ||
    result?.data ||
    [];

  const textLimit = getSourceTextLimit({
    question,
    hookConfig,
    issueClassification
  });

  const normalized = safeArray(raw)
    .map((source, index) => {
      const text =
        source.text ||
        source.content ||
        source.chunkText ||
        source.chunk_text ||
        source.excerpt ||
        source.preview ||
        source.pageContent ||
        source.summary ||
        "";

      return {
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
          source.metadata?.authority_type ||
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

        text: compactString(text, textLimit),
        content: compactString(text, textLimit),

        score:
          Number(
            source.finalScore ??
              source.final_score ??
              source.rerankScore ??
              source.rerank_score ??
              source.retrievalScore ??
              source.retrieval_score ??
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
          source.issueClassificationMatch ||
          source.issue_classification_match ||
          null,

        targetAuthorityMatch:
          source.targetAuthorityMatch === true ||
          source.target_authority_match === true ||
          source.issueClassificationMatch?.targetAuthorityMatch === true,

        issueMismatch:
          source.issueMismatch === true ||
          source.issue_mismatch === true ||
          source.issueClassificationMatch?.issueMismatch === true,

        superseded:
          source.superseded === true ||
          source.isSuperseded === true ||
          source.is_superseded === true,

        hidden:
          source.hidden === true ||
          source.isHidden === true ||
          source.is_hidden === true
      };
    })
    .filter((source) => source.text || source.content)
    .filter((source) => !source.issueMismatch)
    .filter((source) => !source.hidden)
    .sort((a, b) => {
      if (a.superseded !== b.superseded) return a.superseded ? 1 : -1;
      if (a.targetAuthorityMatch !== b.targetAuthorityMatch) {
        return a.targetAuthorityMatch ? -1 : 1;
      }
      if (a.controllingPrecedence !== b.controllingPrecedence) {
        return a.controllingPrecedence - b.controllingPrecedence;
      }
      return b.score - a.score;
    });

  const deduped = [];
  const seen = new Set();

  for (const source of normalized) {
    const key = normalizeLower(
      `${source.title}|${source.citation}|${source.url}`
    );

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(source);
  }

  return deduped.slice(0, MAX_RETRIEVAL_LIMIT);
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
    hookConfig?.mode === "SOURCE_FINDER"
      ? SOURCE_MODE_RETRIEVAL_LIMIT
      : issueClassification?.orchestrationMode === "FAST_DEFINITION" ||
          queryIntent?.requiresSimpleDefinition ||
          isSimpleDefinitionQuestion(question)
        ? SIMPLE_RETRIEVAL_LIMIT
        : DEFAULT_RETRIEVAL_LIMIT;

  try {
    const result = await withTimeout(
      fn({
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
        maxResults: limit,
        maxSources: limit,
        tpmConscious: true
      }),
      RETRIEVAL_TIMEOUT_MS,
      "Retrieval engine"
    );

    return {
      ...safeObject(result),
      retrievedSources: normalizeRetrievedSources(result, {
        question,
        hookConfig,
        issueClassification
      }),
      retrievalLimit: limit,
      retrievalEngineCalled: true
    };
  } catch (error) {
    console.error("Retrieval engine failed:", error.message);

    return {
      retrievedSources: [],
      retrievalError: error.message,
      retrievalEngineCalled: true,
      retrievalLimit: limit,
      retrievalMetadata: {
        reason: "Retrieval engine failed or timed out."
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

  const retrievedSources = normalizeRetrievedSources(retrievalResult, {
    question,
    hookConfig,
    issueClassification
  });

  return {
    queryIntent,
    issueClassification,
    retrievalResult: {
      ...safeObject(retrievalResult),
      retrievedSources
    },
    retrievedSources
  };
}

export function createAskHandler({
  supabase,
  openai,
  contextOrchestration = null,
  openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini"
}) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("createAskHandler requires a valid Supabase client.");
  }

  if (!openai) {
    throw new Error("createAskHandler requires OpenAI client.");
  }

  const resolvedContextOrchestration =
    buildContextOrchestration(contextOrchestration || {});

  const assessmentHandler =
    createAssessmentHandler({
      supabase,
      openai,
      contextOrchestration: resolvedContextOrchestration,
      openaiModel
    });

  async function saveConversationTurn({
    conversationId,
    userId,
    question,
    answerText,
    sourcesUsed = [],
    fallbackReferences = []
  }) {
    if (!conversationId || !userId) return;

    try {
      await saveMessage(supabase, {
        conversationId,
        userId,
        role: "user",
        content: question
      });

      await saveMessage(supabase, {
        conversationId,
        userId,
        role: "assistant",
        content: answerText,
        sourcesUsed,
        fallbackReferences
      });

      const hooks = extractMemoryHooks(question);

      await saveMemoryHooks(
        supabase,
        userId,
        hooks
      );
    } catch (error) {
      console.error("Conversation save skipped:", error.message);
    }
  }

  async function handleFeedback({
    userId,
    conversationId,
    correction,
    feedbackType,
    hookConfig
  }) {
    const cleanCorrection = normalizeText(correction);
    const cleanFeedbackType = normalizeText(feedbackType || "general_feedback");

    if (!cleanCorrection) {
      return {
        status: 400,
        body: {
          success: false,
          error: "Feedback correction is required.",
          hint: "Send { question, conversationId, correction, feedbackType }"
        }
      };
    }

    const feedbackResult =
      await storeFeedbackEntry(supabase, {
        userId,
        sessionId: conversationId || null,
        conversationId: conversationId || null,
        originalQuestion: hookConfig.originalQuestion,
        originalAnswer: "",
        feedbackType: cleanFeedbackType,
        userCorrection: cleanCorrection,
        detectedMode: hookConfig.mode,
        adaptiveMode: hookConfig.mode,
        plannerMode: hookConfig.mode,

        metadata: {
          hookCode: hookConfig.hook_code,
          hookTitle: hookConfig.title,
          askHandlerVersion: ENGINE_VERSION,
          issueClassificationAware: true,
          contextOrchestrationAware: true,
          tpmConscious: true
        }
      });

    const answerText =
      "Feedback received and stored for review. Thank you. TINA will only learn from this after validation.";

    await saveConversationTurn({
      conversationId,
      userId,
      question: hookConfig.originalQuestion,
      answerText,
      sourcesUsed: [],
      fallbackReferences: []
    });

    await saveModeState(supabase, {
      userId,
      sessionId: conversationId || null,
      activeHook: hookConfig.hook_code,
      activeMode: hookConfig.mode,
      modeTitle: hookConfig.title,
      lastQuestion: hookConfig.originalQuestion,
      lastAnswer: answerText
    });

    return {
      status: 200,
      body: {
        success: true,
        engine: "TINA Feedback Learning Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: answerText,
        answerMode: "feedback_stored_for_review",
        confidence: "N/A",
        sourceStatus: "FEEDBACK_STORED",
        feedbackId: feedbackResult?.id || null,
        feedbackType: cleanFeedbackType,
        originalQuestion: hookConfig.originalQuestion,
        resolvedQuestion: hookConfig.cleanQuestion,
        sourcesUsed: [],
        sources: [],
        vectorMatches: 0,
        askHandlerVersion: ENGINE_VERSION,
        contextOrchestrationEnabled: true
      }
    };
  }

  async function clearActiveMode({
    userId,
    conversationId,
    existingMode
  }) {
    const activeHook = existingMode?.active_hook || "/ask";

    await clearModeState(supabase, userId, conversationId || null);

    await assessmentHandler.clearPendingQuizAttempts(
      userId,
      conversationId || null
    );

    let answerText = "You are already in normal /ask mode.";

    if (activeHook === "/quiz") {
      answerText = "Quiz mode ended. You are now back in normal /ask mode.";
    } else if (activeHook === "/review") {
      answerText = "Review mode ended. You are now back in normal /ask mode.";
    } else if (activeHook === "/diagnostic") {
      answerText = "Diagnostic mode ended. You are now back in normal /ask mode.";
    } else if (activeHook !== "/ask") {
      answerText = `Mode ${activeHook} ended. You are now back in normal /ask mode.`;
    }

    return {
      success: true,
      engine: "TINA Mode State System",
      mode: "MODE_CLEARED",
      previousMode: activeHook,
      answer: answerText,
      sourceStatus: "MODE_STATE_CLEARED",
      sourcesUsed: [],
      sources: [],
      vectorMatches: 0,
      askHandlerVersion: ENGINE_VERSION,
      contextOrchestrationEnabled: true
    };
  }

  async function handleRagRoute({
    res,
    userId,
    conversationId,
    hookConfig,
    adaptiveContext,
    orchestrationMetadata
  }) {
    const question = hookConfig.cleanQuestion || hookConfig.originalQuestion;

    const pipeline = await buildRagPipelineContext({
      question,
      hookConfig,
      adaptiveContext,
      supabase
    });

    const ragInput = {
      question,
      retrievedSources: pipeline.retrievedSources,
      retrievalResult: pipeline.retrievalResult,
      conversationHistory: [],
      issueClassification: pipeline.issueClassification,
      queryIntent: pipeline.queryIntent,

      orchestrationIntent: {
        ...safeObject(pipeline.queryIntent),
        routeHook: hookConfig.hook_code,
        routeMode: hookConfig.mode,
        responseMode: hookConfig.adaptiveResponseMode || null,
        tpmConscious: true
      },

      adaptiveContext: {
        ...safeObject(adaptiveContext),
        issueClassification: pipeline.issueClassification,
        queryIntent: pipeline.queryIntent,
        retrievalMetadata: {
          retrievalEngineCalled: Boolean(pipeline.retrievalResult?.retrievalEngineCalled),
          retrievalLimit: pipeline.retrievalResult?.retrievalLimit || null,
          retrievalError: pipeline.retrievalResult?.retrievalError || null,
          retrievalEngineMissing: Boolean(pipeline.retrievalResult?.retrievalEngineMissing),
          sourceCount: pipeline.retrievedSources.length
        }
      },

      model: openaiModel,

      metadata: {
        userId,
        conversationId,
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        ...safeObject(orchestrationMetadata),
        queryIntentEngineCalled: true,
        issueClassificationEngineCalled: true,
        retrievalEngineCalled: true,
        retrievalSourceCount: pipeline.retrievedSources.length,
        primaryIssue: pipeline.issueClassification.primaryIssue || null,
        subIssue: pipeline.issueClassification.subIssue || null,
        retrievalStrategy: pipeline.issueClassification.retrievalStrategy || null,
        targetAuthorities: pipeline.issueClassification.targetAuthorities || [],
        tpmConscious: true
      },

      openai,
      contextOrchestration: resolvedContextOrchestration
    };

    let result;

    try {
      result = await withTimeout(
        generateRagAnswer(ragInput),
        RAG_TIMEOUT_MS,
        "RAG answer generation"
      );
    } catch (error) {
      console.error("RAG answer generation failed:", error.message);

      result = {
        answer:
          "I could not complete the full sourced answer because the retrieval or answer-generation process failed or timed out. Please try again with a narrower question.",
        sources: [],
        metadata: {
          ragError: error.message,
          fallbackAnswerUsed: true
        }
      };
    }

    const resultSources = safeArray(result.sources);

    const payload = {
      success: true,
      engine: "TINA_ASK_HANDLER",
      version: ENGINE_VERSION,
      hook: hookConfig.hook_code,
      mode: hookConfig.mode,
      hookTitle: hookConfig.title,
      answer: result.answer || "",
      sources: resultSources,
      sourcesUsed: resultSources,
      vectorMatches: resultSources.length,
      sourceStatus: resultSources.length
        ? "ISSUE_MATCHED_CONTEXT_USED"
        : pipeline.retrievedSources.length
          ? "RETRIEVED_CONTEXT_USED_NO_VISIBLE_SOURCES"
          : "NO_VISIBLE_SOURCE",
      metadata: {
        ...safeObject(result.metadata),
        askHandlerVersion: ENGINE_VERSION,
        correctFlowEnabled: true,
        queryIntentEngineCalled: true,
        issueClassificationEngineCalled: true,
        retrievalEngineCalled: true,
        retrievalSourceCount: pipeline.retrievedSources.length,
        orchestrationFirstArchitecture: true,
        routeControllerOnly: true,
        noDirectOpenAICall: true,
        noPromptAssembly: true,
        noTokenEstimation: true,
        noRawRetrievalPayloadInjection: true,
        noRawEngineObjectInjection: true,
        tpmConscious: true
      }
    };

    await saveConversationTurn({
      conversationId,
      userId,
      question: hookConfig.originalQuestion,
      answerText: payload.answer,
      sourcesUsed: payload.sourcesUsed,
      fallbackReferences: []
    });

    await saveModeState(supabase, {
      userId,
      sessionId: conversationId || null,
      activeHook: hookConfig.hook_code,
      activeMode: hookConfig.mode,
      modeTitle: hookConfig.title,
      lastQuestion: hookConfig.originalQuestion,
      lastAnswer: payload.answer
    });

    return res.json(payload);
  }

  return async function handleAsk(req, res) {
    try {
      const { question, correction, feedbackType } = req.body || {};

      const userId = getUserId(req);
      const conversationId = getConversationId(req);
      const forcedHook = getForcedHook(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User ID not found in token. Cannot proceed."
        });
      }

      const rawQuestion = normalizeText(question);

      if (!rawQuestion) {
        return res.status(400).json({
          success: false,
          error: "Question required"
        });
      }

      const existingMode =
        await getModeState(supabase, userId, conversationId || null);

      if (isExitCommand(rawQuestion)) {
        const cleared =
          await clearActiveMode({
            userId,
            conversationId,
            existingMode
          });

        return res.json(cleared);
      }

      const activeHook = existingMode?.active_hook || null;
      const hasActiveAssessmentMode = assessmentHandler.isAssessmentHook(activeHook);

      const pendingQuiz =
        await assessmentHandler.fetchLatestPendingQuiz(
          userId,
          conversationId || null
        );

      if (pendingQuiz && !hasActiveAssessmentMode) {
        await assessmentHandler.clearPendingQuizAttempts(
          userId,
          conversationId || null
        );
      }

      const quizAnswer = extractQuizAnswer(rawQuestion);

      if (pendingQuiz && hasActiveAssessmentMode && quizAnswer) {
        const loopResult =
          await assessmentHandler.continueAssessmentLoop({
            userId,
            conversationId: conversationId || null,
            incomingAnswer: rawQuestion
          });

        if (loopResult.handled) {
          return res.json(loopResult.response);
        }
      }

      if (pendingQuiz && hasActiveAssessmentMode && !quizAnswer) {
        return res.json(
          assessmentHandler.buildAssessmentLockedResponse(activeHook)
        );
      }

      let effectiveQuestion = rawQuestion;

      if (
        !forcedHook &&
        existingMode?.active_hook &&
        existingMode.active_hook !== "/ask" &&
        !isExplicitModeHook(rawQuestion)
      ) {
        effectiveQuestion = `${existingMode.active_hook} ${rawQuestion}`;
      }

      const hookConfig =
        await loadTaxHookConfig({
          supabase,
          rawQuestion: effectiveQuestion,
          forcedHook
        });

      const compactHookConfig = buildCompactHookConfig(hookConfig);

      if (compactHookConfig.mode === "LEARNING_PROGRESS") {
        const result =
          await assessmentHandler.handleLearningProgress({
            userId,
            conversationId,
            hookConfig: compactHookConfig,
            originalQuestion: compactHookConfig.originalQuestion
          });

        return res.json(result.response);
      }

      if (compactHookConfig.mode === "FEEDBACK") {
        const result =
          await handleFeedback({
            userId,
            conversationId,
            correction,
            feedbackType,
            hookConfig: compactHookConfig
          });

        return res.status(result.status).json(result.body);
      }

      if (
        SPECIAL_ASSESSMENT_HOOKS.has(compactHookConfig.hook_code) ||
        (
          assessmentHandler.isAssessmentMode(compactHookConfig.mode) &&
          !isRagRoutedHook(compactHookConfig.hook_code)
        )
      ) {
        const result =
          await assessmentHandler.handleAssessmentCommand({
            userId,
            conversationId,
            hookConfig: compactHookConfig,
            cleanQuestion: compactHookConfig.cleanQuestion,
            originalQuestion: compactHookConfig.originalQuestion
          });

        return res.json(result.response);
      }

      const adaptiveContext =
        buildAdaptiveContextForHook({
          hookConfig: compactHookConfig,
          existingMode,
          pendingQuiz,
          contextOrchestrationEnabled: true
        });

      const orchestrationMetadata =
        buildCompactOrchestrationMetadata({
          routeHook: compactHookConfig.hook_code,
          routeMode: compactHookConfig.mode
        });

      return handleRagRoute({
        res,
        userId,
        conversationId,
        hookConfig: compactHookConfig,
        adaptiveContext,
        orchestrationMetadata
      });
    } catch (error) {
      console.error("Ask dispatcher error:", error);

      return res.status(500).json({
        success: false,
        error: error.message || "Ask failed",
        engine: "TINA Ask Handler",
        askHandlerVersion: ENGINE_VERSION,
        contextOrchestrationEnabled: true,
        orchestrationFirstArchitecture: true,
        tpmConscious: true
      });
    }
  };
}

export function askHandlerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ASK_HANDLER",
    version: ENGINE_VERSION,
    correctFlowEnabled: true,
    flow: [
      "query-intent-engine.js",
      "issue-classification-engine.js",
      "retrieval-engine.js",
      "rag-answer-handler.js",
      "context-orchestration-engine.js"
    ],
    orchestrationFirstArchitecture: true,
    routeControllerOnly: true,
    noDirectOpenAICall: true,
    noPromptAssembly: true,
    noTokenEstimation: true,
    noRawRetrievalPayloadInjection: true,
    noRawEngineObjectInjection: true,
    retrievalBeforeRag: true,
    emptySourcesBugFixed: true,
    timeoutProtected: true,
    tpmConscious: true,
    compactSourcesOnly: true,
    adaptiveCompatible: true,
    assessmentCompatible: true,
    ragCompatible: true,
    feedbackCompatible: true,
    modeStateCompatible: true
  };
}

export default {
  createAskHandler,
  askHandlerHealthCheck
};
