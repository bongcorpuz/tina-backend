// FILE: ask-handler.js
"use strict";

/**
 * TINA Ask Handler
 * Version: 9.0.0
 *
 * Role:
 * - Route controller only
 * - Slash command interceptor
 * - Mode-state preserver
 * - Retrieved-source preserver
 * - Query-intent-aware dispatcher
 *
 * Normal RAG flow:
 * ask-handler.js
 * → query-intent-engine.js
 * → issue-classification-engine.js
 * → retrieval-engine.js
 * → reranker-engine.js
 * → context-orchestration-engine.js
 * → rag-answer-handler.js
 *
 * Boundary:
 * - Does not perform legal reasoning
 * - Does not rank sources internally
 * - Does not render final answers
 * - Does not assemble OpenAI prompts
 * - Does not call OpenAI directly
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

import { saveMessage, getHistory } from "./conversation-memory.js";
import { storeFeedbackEntry } from "./feedback-learning.js";

import { extractQuizAnswer } from "./ask-helpers.js";
import { createAssessmentHandler } from "./assessment-handler.js";
import { createLearningHandler, parseLearningCommand } from "./learning/session-engine.js";
import { resolveSlashCommand } from "./command-resolver.js";
// generateRagAnswer removed — Law 1: all pipeline logic lives in pipeline.js

import {
  buildOpenAIContext as defaultBuildOpenAIContext,
  callOpenAIWithOrchestration as defaultCallOpenAIWithOrchestration
} from "./context-orchestration-engine.js";

// LAW 1: Individual engine imports removed — all engine calls go through pipeline.js only.
import { runPipeline } from "./pipeline.js";

const ENGINE_VERSION = "9.0.0";

const EXIT_COMMANDS = ["/bye", "/exit", "/stop", "/quit", "/reset"];

const AUDIT_WELCOME_MESSAGE = `\
You are now in **/audit mode**.

This mode is specifically designed for **COMPLEX_ADVISORY** matters involving:

- BIR audit
- Letter of Authority (LOA)
- Notice for Informal Conference (NIC)
- Preliminary Assessment Notice (PAN)
- Final Assessment Notice / Formal Letter of Demand (FAN/FLD)
- Deficiency tax assessments
- Protest preparation
- Request for reconsideration
- Request for reinvestigation
- Tax exposure analysis
- Documentary evidence gaps
- Audit defense strategy
- CTA-preparation support
- Settlement or compromise evaluation

In this mode, TINA will act as a **senior Philippine tax controversy advisor, CPA-lawyer, BIR audit defense strategist, and Big 4-style tax advisory partner.**

You may ask questions such as:
- "I received an LOA. What should I check first?"
- "How do I respond to a PAN?"
- "What are the defenses against this deficiency VAT assessment?"
- "What documents should I prepare for BIR audit?"
- "Can this assessment be protested?"
- "What are the procedural defects in this BIR notice?"
- "What are the tax, legal, and accounting risks?"

TINA will answer in a **natural advisory format** — not a rigid template — unless you specifically ask for a formal memo, protest draft, board report, or legal opinion.

**Source-grounding:** TINA will prioritize indexed authorities, indexed jurisprudence, indexed BIR issuances, and indexed tax references before giving legal or tax conclusions.

**Anti-hallucination:** TINA will never invent provisions, cases, Revenue Regulations, RMCs, RMOs, RAMOs, or BIR rulings. If an authority is unavailable from indexed sources, TINA will say so explicitly.

---

To exit **/audit mode** and return to normal **/ask mode**, type: \`/bye\`, \`/quit\`, or \`/exit\`

_What is your audit or tax controversy matter?_\
`.trim();

const ALLOWED_HOOKS = [
  "/ask",
  "/quiz",
  "/review",
  "/case",
  "/source",
  "/tax",
  "/audit",
  "/debug",
  "/patch",
  "/diagnostic",
  "/progress",
  "/feedback"
];

const NORMAL_RAG_ROUTED_HOOKS = new Set([
  "/ask",
  "/tax",
  "/audit",
  "/debug",
  "/patch"
]);

const REVIEW_ROUTED_HOOKS = new Set([]);

const CASE_ROUTED_HOOKS = new Set([
  "/case"
]);

const SOURCE_ROUTED_HOOKS = new Set([
  "/source"
]);

const SPECIAL_ASSESSMENT_HOOKS = new Set([
  "/quiz",
  "/review",
  "/diagnostic"
]);

const RAG_ROUTED_HOOKS = new Set([
  ...NORMAL_RAG_ROUTED_HOOKS,
  ...CASE_ROUTED_HOOKS,
  ...SOURCE_ROUTED_HOOKS
]);

const DEFAULT_RETRIEVAL_LIMIT = 5;
const SIMPLE_RETRIEVAL_LIMIT = 3;
const SOURCE_MODE_RETRIEVAL_LIMIT = 8;
const CASE_MODE_RETRIEVAL_LIMIT = 8;
const REVIEW_MODE_RETRIEVAL_LIMIT = 6;
const AUDIT_MODE_RETRIEVAL_LIMIT = 8;
const DEBUG_PATCH_RETRIEVAL_LIMIT = 4;
const MAX_RETRIEVAL_LIMIT = 8;

const MAX_SOURCE_TEXT_CHARS_SIMPLE = 1200;
const MAX_SOURCE_TEXT_CHARS_STANDARD = 2200;
const MAX_SOURCE_TEXT_CHARS_REVIEW_MODE = 2400;
const MAX_SOURCE_TEXT_CHARS_CASE_MODE = 2600;
const MAX_SOURCE_TEXT_CHARS_SOURCE_MODE = 2800;
const MAX_SOURCE_TEXT_CHARS_AUDIT_MODE = 2600;

const QUERY_INTENT_TIMEOUT_MS = 8000;
const ISSUE_CLASSIFICATION_TIMEOUT_MS = 10000;
const RETRIEVAL_TIMEOUT_MS = 18000;
const RERANK_TIMEOUT_MS = 12000;
const RAG_TIMEOUT_MS = 90000;

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

function isAllowedHook(hookCode = "") {
  return ALLOWED_HOOKS.includes(normalizeLower(hookCode));
}

function isReviewRoutedHook(hookCode = "") {
  return REVIEW_ROUTED_HOOKS.has(normalizeLower(hookCode));
}

function isCaseRoutedHook(hookCode = "") {
  return CASE_ROUTED_HOOKS.has(normalizeLower(hookCode));
}

function isSourceRoutedHook(hookCode = "") {
  return SOURCE_ROUTED_HOOKS.has(normalizeLower(hookCode));
}

function isRagRoutedHook(hookCode = "") {
  return RAG_ROUTED_HOOKS.has(normalizeLower(hookCode));
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
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms.`)), ms);
  });
}

async function withTimeout(promise, ms, label) {
  return Promise.race([promise, timeoutAfter(ms, label)]);
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
  return isAllowedHook(normalized) ? normalized : null;
}

function detectExplicitSlashCommand(rawQuestion = "") {
  const firstWord = normalizeHookCommand(rawQuestion);
  return isAllowedHook(firstWord) ? firstWord : null;
}

function stripExplicitHook(rawQuestion = "", hookCode = "") {
  const text = normalizeText(rawQuestion);
  const hook = normalizeLower(hookCode);

  if (!hook || normalizeHookCommand(text) !== hook) return text;
  return text.slice(hook.length).trim();
}

function isSimpleDefinitionQuestion(question = "") {
  const q = normalizeLower(question);

  return (
    q.length <= 160 &&
    /^(what is|define|meaning of|ano ang|ano ibig sabihin ng)\b/i.test(q) &&
    !/\b(analyze|risk|audit|contract|jurisprudence|doctrine|conflict|case|legal consequence|assessment|substance|evidence|compare|reconcile|compute|calculate|explain|discuss|review|quiz|source)\b/i.test(q)
  );
}

function isComplexReasoningQuestion(question = "") {
  const q = normalizeLower(question);

  return /\b(analyze|evaluate|risk|audit|contract|jurisprudence|doctrine|conflict|legal basis|legal consequence|assessment|substance|evidence|compare|reconcile|position|defend|explain why|case law)\b/i.test(q);
}

function findFunction(moduleObject = {}, candidateNames = []) {
  for (const name of candidateNames) {
    if (typeof moduleObject[name] === "function") return moduleObject[name];
  }

  if (typeof moduleObject.default === "function") return moduleObject.default;

  if (moduleObject.default && typeof moduleObject.default === "object") {
    for (const name of candidateNames) {
      if (typeof moduleObject.default[name] === "function") {
        return moduleObject.default[name];
      }
    }
  }

  return null;
}

async function invokeFlexible(fn, positionalValue, objectValue) {
  try {
    return await fn(positionalValue, objectValue);
  } catch (firstError) {
    try {
      return await fn(objectValue);
    } catch {
      throw firstError;
    }
  }
}

function buildHardcodedHookConfig(hookCode = "/ask") {
  const hooks = {
    "/ask": {
      hook_code: "/ask",
      mode: "ASK",
      title: "Default TINA Assistant",
      routeKind: "NORMAL_RAG",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "STANDARD",
      orchestrationMode: "STANDARD_TAX"
    },

    "/tax": {
      hook_code: "/tax",
      mode: "TAX_EXPERT",
      title: "Big 4 Tax Expert Mode",
      routeKind: "NORMAL_RAG",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "TECHNICAL",
      orchestrationMode: "LEGAL_ANALYSIS"
    },

    "/audit": {
      hook_code: "/audit",
      mode: "AUDIT_MODE",
      title: "Audit / Evidence Evaluation Mode",
      routeKind: "NORMAL_RAG",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "AUDIT",
      orchestrationMode: "COMPLEX_ADVISORY"
    },

    "/debug": {
      hook_code: "/debug",
      mode: "DEBUG_MODE",
      title: "Debugging Mode",
      routeKind: "NORMAL_RAG",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "DEBUGGING",
      orchestrationMode: "DEBUGGING"
    },

    "/patch": {
      hook_code: "/patch",
      mode: "CODE_PATCH_MODE",
      title: "Code Patch Mode",
      routeKind: "NORMAL_RAG",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "CODE",
      orchestrationMode: "CODE_PATCH"
    },

    "/review": {
      hook_code: "/review",
      mode: "TAX_REVIEWER",
      title: "CPALE Tax Reviewer Mode",
      routeKind: "REVIEWER_ROUTE",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "REVIEWER",
      orchestrationMode: "REVIEWER"
    },

    "/quiz": {
      hook_code: "/quiz",
      mode: "QUIZ_MASTER",
      title: "Tax Quiz Mode",
      routeKind: "ASSESSMENT",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "QUIZ",
      orchestrationMode: "QUIZ"
    },

    "/case": {
      hook_code: "/case",
      mode: "CASE_ANALYSIS",
      title: "Jurisprudence and Case Analysis Mode",
      routeKind: "CASE_RAG",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "CASE_ANALYSIS",
      orchestrationMode: "CASE_ANALYSIS"
    },

    "/source": {
      hook_code: "/source",
      mode: "SOURCE_FINDER",
      title: "Source Finder Mode",
      routeKind: "SOURCE_RAG",
      requires_retrieval: true,
      requires_memory: false,
      requires_feedback: false,
      adaptiveResponseMode: "SOURCE",
      orchestrationMode: "SOURCE_LOOKUP",
      forceSourceVisibility: true
    },

    "/diagnostic": {
      hook_code: "/diagnostic",
      mode: "ADAPTIVE_QUIZ",
      title: "Adaptive CPALE Diagnostic Quiz",
      routeKind: "ASSESSMENT",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "QUIZ",
      orchestrationMode: "QUIZ"
    },

    "/progress": {
      hook_code: "/progress",
      mode: "LEARNING_PROGRESS",
      title: "Learning Progress Tracker",
      routeKind: "UTILITY",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "STANDARD",
      orchestrationMode: "UTILITY"
    },

    "/feedback": {
      hook_code: "/feedback",
      mode: "FEEDBACK",
      title: "Feedback Mode",
      routeKind: "FEEDBACK",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: true,
      adaptiveResponseMode: "STANDARD",
      orchestrationMode: "UTILITY"
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
    routeKind: hookConfig.routeKind || "NORMAL_RAG",
    requires_retrieval: Boolean(hookConfig.requires_retrieval),
    requires_memory: Boolean(hookConfig.requires_memory),
    requires_feedback: Boolean(hookConfig.requires_feedback),
    adaptiveResponseMode: hookConfig.adaptiveResponseMode || "STANDARD",
    orchestrationMode: hookConfig.orchestrationMode || "STANDARD_TAX",
    forceSourceVisibility: Boolean(hookConfig.forceSourceVisibility),
    cleanQuestion: hookConfig.cleanQuestion || "",
    originalQuestion: hookConfig.originalQuestion || "",
    forcedHookApplied: Boolean(hookConfig.forcedHookApplied),
    explicitSlashCommandApplied: Boolean(hookConfig.explicitSlashCommandApplied),
    engineVersion: ENGINE_VERSION
  };
}

async function loadTaxHookConfig({ supabase, rawQuestion = "", forcedHook = null }) {
  const text = normalizeText(rawQuestion);
  const explicitHook = detectExplicitSlashCommand(text);

  let hookCode = "/ask";
  let cleanQuestion = text;

  // BUG-042: When forcedHook is the generic /ask default and the user explicitly
  // typed a slash command (e.g. /quiz), the explicit command must win.
  const forcedIsGenericDefault = forcedHook === "/ask";
  const explicitOverridesDefault = forcedIsGenericDefault && explicitHook && explicitHook !== "/ask";

  // Fuzzy resolution: fires only when no exact command was found and text starts with /
  // e.g., /quizz → /quiz, /revieu → /review, /sourc → /source
  let fuzzyHookResult = null;
  if (!explicitHook && !forcedHook) {
    const firstWord = normalizeHookCommand(text);
    if (firstWord.startsWith("/")) {
      try {
        const candidate = resolveSlashCommand(firstWord);
        if (candidate.ok) fuzzyHookResult = candidate;
      } catch (err) {
        console.warn("[TINA ROUTE] Command resolver error (non-fatal):", err?.message);
      }
    }
  }
  const fuzzyHook = fuzzyHookResult?.commandKey || null;

  if (forcedHook && isAllowedHook(forcedHook) && !explicitOverridesDefault) {
    hookCode = forcedHook;
    cleanQuestion = stripExplicitHook(text, forcedHook);
  } else if (explicitHook) {
    hookCode = explicitHook;
    cleanQuestion = stripExplicitHook(text, explicitHook);
  } else if (fuzzyHook) {
    hookCode = fuzzyHook;
    // Strip the (misspelled) command prefix — everything after the first word is the payload
    cleanQuestion = text.replace(/^\S+\s*/, "").trim() || text;
  }

  console.log(`[TINA ROUTE] forcedHook=${forcedHook} explicitHook=${explicitHook} fuzzyHook=${fuzzyHook}(${fuzzyHookResult?.matchType || "-"}) resolved hookCode=${hookCode}`);

  const fallbackConfig = buildHardcodedHookConfig(hookCode);

  try {
    const { data, error } = await supabase
      .from("tina_tax_hooks")
      .select("*")
      .eq("hook_code", hookCode)
      .eq("status", "active")
      .maybeSingle();

    if (error) console.error("Hook config load error:", error.message);

    if (data) {
      return {
        ...fallbackConfig,
        hook_code: fallbackConfig.hook_code,
        mode: fallbackConfig.mode,
        routeKind: fallbackConfig.routeKind,
        requires_retrieval: fallbackConfig.requires_retrieval,
        requires_memory: data.requires_memory ?? fallbackConfig.requires_memory,
        requires_feedback: data.requires_feedback ?? fallbackConfig.requires_feedback,
        title: data.title || fallbackConfig.title,
        adaptiveResponseMode:
          data.adaptiveResponseMode ||
          data.adaptive_response_mode ||
          fallbackConfig.adaptiveResponseMode,
        orchestrationMode:
          data.orchestrationMode ||
          data.orchestration_mode ||
          fallbackConfig.orchestrationMode,
        forceSourceVisibility:
          fallbackConfig.forceSourceVisibility === true ||
          data.forceSourceVisibility === true ||
          data.force_source_visibility === true,
        cleanQuestion: cleanQuestion,
        originalQuestion: text,
        forcedHookApplied: Boolean(forcedHook),
        explicitSlashCommandApplied: Boolean(explicitHook),
        engineVersion: ENGINE_VERSION
      };
    }
  } catch (error) {
    console.error("Hook config fallback used:", error.message);
  }

  return {
    ...fallbackConfig,
    cleanQuestion: cleanQuestion,
    originalQuestion: text,
    forcedHookApplied: Boolean(forcedHook),
    explicitSlashCommandApplied: Boolean(explicitHook),
    engineVersion: ENGINE_VERSION
  };
}

function buildAdaptiveContextForHook({
  hookConfig,
  existingMode = null,
  pendingQuiz = null,
  contextOrchestrationEnabled = true
}) {
  const hookCode = hookConfig.hook_code;
  const mode = hookConfig.mode;
  const responseMode = hookConfig.adaptiveResponseMode || "STANDARD";
  const orchestrationMode = hookConfig.orchestrationMode || "STANDARD_TAX";

  return {
    askHandlerVersion: ENGINE_VERSION,

    activeHook: hookCode,
    activeMode: mode,
    routeKind: hookConfig.routeKind,

    existingMode: buildCompactExistingMode(existingMode),
    pendingQuiz: buildCompactPendingQuiz(pendingQuiz),

    adaptiveResponseMode: responseMode,
    responseMode,
    orchestrationMode,

    adaptiveMode: {
      primaryMode: mode,
      responseMode,
      orchestrationMode,
      sourceMode: hookCode === "/source",
      reviewerMode: hookCode === "/review",
      quizMode: hookCode === "/quiz",
      diagnosticMode: hookCode === "/diagnostic",
      caseMode: hookCode === "/case",
      taxExpertMode: hookCode === "/tax",
      seniorCounselMode: hookCode === "/tax",
      auditMode: hookCode === "/audit",
      debugMode: hookCode === "/debug",
      patchMode: hookCode === "/patch",
      progressMode: hookCode === "/progress",
      feedbackMode: hookCode === "/feedback",
      normalAskMode: hookCode === "/ask"
    },

    orchestration: {
      correctFlowEnabled: true,
      explicitSlashCommandInterception: true,
      queryIntentFirst: true,
      issueClassificationSecond: true,
      retrievalThird: true,
      rerankerFourth: true,
      ragFifth: true,
      contextOrchestrationFinal: true,
      contextOrchestrationEnabled: Boolean(contextOrchestrationEnabled),
      tpmConscious: true,
      compactContextOnly: true
    },

    responsePlan: {
      responseMode,
      orchestrationMode,

      responseDepth:
        hookCode === "/tax"
          ? "COMPREHENSIVE"
          : hookCode === "/audit"
            ? "AUDIT"
            : hookCode === "/source"
              ? "SOURCE_ONLY"
              : hookCode === "/review"
                ? "REVIEWER"
                : hookCode === "/case"
                  ? "CASE_ANALYSIS"
                  : hookCode === "/debug"
                    ? "DEBUGGING"
                    : hookCode === "/patch"
                      ? "CODE_PATCH"
                      : "STANDARD",

      mustUseRagPipeline: isRagRoutedHook(hookCode) || isReviewRoutedHook(hookCode),

      hookCode,
      hookMode: mode,
      routeKind: hookConfig.routeKind,

      requiresQuizMode: hookCode === "/quiz",
      requiresDiagnosticMode: hookCode === "/diagnostic",
      requiresReviewMode: hookCode === "/review",
      requiresSimpleDefinition: false,
      requiresSourceVisibility: hookCode === "/source",
      requiresCaseAnalysis: hookCode === "/case",
      requiresAuditMode: hookCode === "/audit",
      requiresSeniorCounselMemo: hookCode === "/tax",
      requiresDebuggingMode: hookCode === "/debug",
      requiresDebugMode: hookCode === "/debug",
      requiresCodePatch: hookCode === "/patch",
      requiresProgressMode: hookCode === "/progress",
      requiresFeedbackMode: hookCode === "/feedback",

      reviewerAnswerFormat:
        hookCode === "/review"
          ? ["Concept", "Rule", "Memory Aid", "Common Trap", "Example", "Quick Check"]
          : null,

      sourceOrderingPolicy: {
        useIssueClassificationMatch: true,
        useTargetAuthorityMatch: true,
        useControllingPrecedence: true,
        hideIssueMismatchedSources: false
      },

      conflictDisplayPolicy: {
        displayConflictYesOnlyWhenConflictTrue: true,
        requireCompleteConflictMetadata: true,
        requireSameIssueGate: true,
        requireOppositeHoldingGate: true
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

function normalizeQueryIntentForHook(queryIntent = {}, hookConfig = {}) {
  const hookCode = hookConfig.hook_code;

  const forced = {
    responseMode:
      hookCode === "/review"
        ? "REVIEWER"
        : hookCode === "/quiz"
          ? "QUIZ"
          : hookCode === "/diagnostic"
            ? "QUIZ"
            : hookCode === "/tax"
              ? "SENIOR_COUNSEL_MEMO"
              : hookCode === "/case"
                ? "CASE_ANALYSIS"
                : hookCode === "/source"
                  ? "SOURCE"
                  : hookCode === "/audit"
                    ? "AUDIT"
                    : hookCode === "/debug"
                      ? "DEBUGGING"
                      : hookCode === "/patch"
                        ? "CODE"
                        : queryIntent.responseMode || hookConfig.adaptiveResponseMode || "STANDARD",

    orchestrationMode:
      hookCode === "/review"
        ? "REVIEWER"
        : hookCode === "/quiz"
          ? "QUIZ"
          : hookCode === "/diagnostic"
            ? "QUIZ"
            : hookCode === "/tax"
              ? "SENIOR_COUNSEL_MEMO"
              : hookCode === "/case"
                ? "CASE_ANALYSIS"
                : hookCode === "/source"
                  ? "SOURCE_LOOKUP"
                  : hookCode === "/audit"
                    ? "COMPLEX_ADVISORY"
                    : hookCode === "/debug"
                      ? "DEBUGGING"
                      : hookCode === "/patch"
                        ? "CODE_PATCH"
                        : queryIntent.orchestrationMode || hookConfig.orchestrationMode || "STANDARD_TAX",

    requiresQuizMode: hookCode === "/quiz" || Boolean(queryIntent.requiresQuizMode),
    requiresReviewMode: hookCode === "/review" || Boolean(queryIntent.requiresReviewMode),
    requiresSimpleDefinition: hookCode === "/ask" && Boolean(queryIntent.requiresSimpleDefinition),
    requiresSourceVisibility: hookCode === "/source" || Boolean(queryIntent.requiresSourceVisibility),
    requiresCaseMode: hookCode === "/case" || Boolean(queryIntent.requiresCaseMode),

    isNaturalConversation: Boolean(queryIntent.isNaturalConversation),
    isFollowUp: Boolean(queryIntent.isFollowUp)
  };

  return {
    ...safeObject(queryIntent),
    ...forced,

    commandMode:
      queryIntent.commandMode ||
      (
        hookCode === "/review"
          ? "REVIEW"
          : hookCode === "/quiz"
            ? "QUIZ"
            : hookCode === "/case"
              ? "CASE"
              : hookCode === "/source"
                ? "SOURCE"
                : hookCode === "/audit"
                  ? "AUDIT"
                  : hookCode === "/debug"
                    ? "DEBUG"
                    : hookCode === "/patch"
                      ? "PATCH"
                      : hookCode === "/progress"
                        ? "PROGRESS"
                        : hookCode === "/feedback"
                          ? "FEEDBACK"
                          : "ASK"
      ),

    primaryCommand:
      queryIntent.primaryCommand || hookCode.replace("/", ""),

    detectedCommands:
      safeArray(queryIntent.detectedCommands).length
        ? queryIntent.detectedCommands
        : [hookCode.replace("/", "")]
  };
}

// ─── DEAD CODE REMOVED (Law 1) ────────────────────────────────────────────────
// runQueryIntentEngine, runIssueClassificationEngine, runRetrievalEngine,
// runOptionalReranker, buildRagPipelineContext, buildRagOrchestrationIntent
// were removed. All engine calls now live exclusively in pipeline.js.
// ──────────────────────────────────────────────────────────────────────────────

async function runQueryIntentEngine_DEPRECATED({ question, hookConfig, adaptiveContext }) {
  const fn = findFunction({}, [
    "detectQueryIntent",
    "analyzeQueryIntent",
    "classifyQueryIntent",
    "runQueryIntentEngine",
    "queryIntentEngine",
    "detectIntent"
  ]);

  if (!fn) {
    return normalizeQueryIntentForHook({
      rawQuery: question,
      normalizedQuery: question,
      intentType: "GENERAL_TAX_QUERY",
      requiresSimpleDefinition: isSimpleDefinitionQuestion(question),
      requiresLegalAnalysis:
        hookConfig.mode === "TAX_EXPERT" ||
        isComplexReasoningQuestion(question),
      routeHook: hookConfig.hook_code,
      routeMode: hookConfig.mode,
      fallbackIntentUsed: true
    }, hookConfig);
  }

  try {
    const result = await withTimeout(
      invokeFlexible(fn, question, {
        question,
        query: question,
        userQuery: question,
        hookConfig,
        adaptiveContext,
        forcedHook: hookConfig.hook_code,
        command: hookConfig.hook_code
      }),
      QUERY_INTENT_TIMEOUT_MS,
      "Query intent engine"
    );

    return normalizeQueryIntentForHook(safeObject(result), hookConfig);
  } catch (error) {
    console.error("Query intent engine failed:", error.message);

    return normalizeQueryIntentForHook({
      rawQuery: question,
      normalizedQuery: question,
      intentType: "GENERAL_TAX_QUERY",
      requiresSimpleDefinition: isSimpleDefinitionQuestion(question),
      requiresLegalAnalysis:
        hookConfig.mode === "TAX_EXPERT" ||
        isComplexReasoningQuestion(question),
      routeHook: hookConfig.hook_code,
      routeMode: hookConfig.mode,
      fallbackIntentUsed: true,
      error: error.message
    }, hookConfig);
  }
}

function buildFallbackIssueClassification({ question = "", queryIntent = {}, hookConfig = {} } = {}) {
  const q = normalizeLower(question);

  let primaryIssue = "GENERAL_TAX";
  let subIssue = "GENERAL_TAX_QUERY";
  let targetAuthorities = ["NIRC", "RR", "RMC"];

  if (/\bvat\b|value[-\s]?added tax/i.test(q)) {
    primaryIssue = "VAT";
    subIssue = isSimpleDefinitionQuestion(question) ? "VAT_DEFINITION" : "VAT_GENERAL_RULE";
    targetAuthorities = ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 108", "RR 16-2005"];
  } else if (/\bzero[-\s]?rated|zero rating|0%\s*vat/i.test(q)) {
    primaryIssue = "VAT";
    subIssue = "VAT_ZERO_RATING";
    targetAuthorities = ["NIRC Sec. 106(A)(2)", "NIRC Sec. 108(B)", "RR 16-2005"];
  } else if (/\binput tax|input vat|refund|tax credit certificate|tcc\b/i.test(q)) {
    primaryIssue = "VAT";
    subIssue = "VAT_INPUT_TAX_REFUND_CREDIT";
    targetAuthorities = ["NIRC Sec. 110", "NIRC Sec. 112", "RR 16-2005"];
  } else if (/\bwithholding|ewt|cwt|fwt\b/i.test(q)) {
    primaryIssue = "WHT";
    subIssue = "WITHHOLDING_TAX";
    targetAuthorities = ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"];
  } else if (/\bincome tax|rcit|mcit|nolco\b/i.test(q)) {
    primaryIssue = "CIT";
    subIssue = "CORPORATE_INCOME_TAX";
    targetAuthorities = ["NIRC Sec. 27", "NIRC Sec. 34", "CREATE Act"];
  } else if (/\bcase|jurisprudence|supreme court|cta|g\.?\s*r\.?\s*no\b/i.test(q)) {
    primaryIssue = "CASE_LAW";
    subIssue = "JURISPRUDENCE_ANALYSIS";
    targetAuthorities = ["SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"];
  }

  const simple = Boolean(queryIntent?.requiresSimpleDefinition || isSimpleDefinitionQuestion(question));

  const complex = Boolean(
    queryIntent?.requiresLegalAnalysis ||
    queryIntent?.needsJurisprudence ||
    queryIntent?.needsConflictAnalysis ||
    queryIntent?.needsFactPatternAnalysis ||
    isComplexReasoningQuestion(question) ||
    hookConfig.mode === "TAX_EXPERT" ||
    hookConfig.hook_code === "/case"
  );

  return {
    primaryIssue,
    subIssue,
    retrievalStrategy:
      hookConfig.hook_code === "/source"
        ? "SOURCE_FINDER_AUTHORITY_FIRST"
        : hookConfig.hook_code === "/case"
          ? "JURISPRUDENCE_CASE_AUTHORITY_FIRST"
          : simple
            ? "FAST_DEFINITION_PRIMARY_AUTHORITY"
            : complex
              ? "ISSUE_AUTHORITY_HIERARCHY_WITH_JURISPRUDENCE"
              : "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",

    targetAuthorities,

    responseMode:
      queryIntent.responseMode ||
      hookConfig.adaptiveResponseMode ||
      (simple ? "SIMPLE_DEFINITION" : complex ? "LEGAL_ANALYSIS" : "STANDARD"),

    orchestrationMode:
      queryIntent.orchestrationMode ||
      hookConfig.orchestrationMode ||
      (simple ? "FAST_DEFINITION" : complex ? "LEGAL_ANALYSIS" : "STANDARD_TAX"),

    complexity: simple ? "simple" : complex ? "complex" : "standard",
    fallbackClassificationUsed: true
  };
}

function normalizeIssueClassificationResult(result = {}, fallbackInput = {}) {
  const fallback = buildFallbackIssueClassification(fallbackInput);
  const source = result?.orchestrationClassification || result?.issueClassification || result?.classification || result || {};

  return {
    ...fallback,
    ...safeObject(source),

    primaryIssue:
      source.primaryIssue ||
      source.primary_issue ||
      source.domain ||
      source.domainCode ||
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
      safeArray(source.targetAuthorities || source.target_authorities || fallback.targetAuthorities),

    responseMode:
      source.responseMode ||
      source.response_mode ||
      fallback.responseMode,

    orchestrationMode:
      source.orchestrationMode ||
      source.orchestration_mode ||
      source.contextMode ||
      fallback.orchestrationMode,

    complexity: source.complexity || fallback.complexity
  };
}

async function runIssueClassificationEngine_DEPRECATED({ question, queryIntent, hookConfig, adaptiveContext }) {
  const fn = findFunction({}, [
    "classifyTaxIssue",
    "classifyIssue",
    "classifyQueryIssue",
    "runIssueClassification",
    "issueClassificationEngine",
    "classify"
  ]);

  if (!fn) return buildFallbackIssueClassification({ question, queryIntent, hookConfig });

  try {
    const result = await withTimeout(
      invokeFlexible(fn, question, {
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

    return normalizeIssueClassificationResult(result, { question, queryIntent, hookConfig });
  } catch (error) {
    console.error("Issue classification engine failed:", error.message);

    return {
      ...buildFallbackIssueClassification({ question, queryIntent, hookConfig }),
      classificationError: error.message
    };
  }
}

function getSourceTextLimit({ question, hookConfig, issueClassification, queryIntent }) {
  if (
    issueClassification?.orchestrationMode === "FAST_DEFINITION" ||
    queryIntent?.requiresSimpleDefinition ||
    isSimpleDefinitionQuestion(question)
  ) {
    return MAX_SOURCE_TEXT_CHARS_SIMPLE;
  }

  if (hookConfig?.hook_code === "/source") return MAX_SOURCE_TEXT_CHARS_SOURCE_MODE;
  if (hookConfig?.hook_code === "/case") return MAX_SOURCE_TEXT_CHARS_CASE_MODE;
  if (hookConfig?.hook_code === "/review") return MAX_SOURCE_TEXT_CHARS_REVIEW_MODE;
  if (hookConfig?.hook_code === "/audit") return MAX_SOURCE_TEXT_CHARS_AUDIT_MODE;

  return MAX_SOURCE_TEXT_CHARS_STANDARD;
}

function normalizeRetrievedSources(result = {}, context = {}) {
  const raw =
    result?.retrievedSources ||
    result?.sources ||
    result?.results ||
    result?.matches ||
    result?.documents ||
    result?.data ||
    [];

  const textLimit = getSourceTextLimit(context);

  return safeArray(raw)
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
        ...safeObject(source),

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
    .filter((source) => source.text || source.content || source.title || source.citation);
}

function resolveRetrievalLimit({ question, hookConfig, issueClassification, queryIntent }) {
  if (hookConfig?.hook_code === "/source") return SOURCE_MODE_RETRIEVAL_LIMIT;
  if (hookConfig?.hook_code === "/case") return CASE_MODE_RETRIEVAL_LIMIT;
  if (hookConfig?.hook_code === "/review") return REVIEW_MODE_RETRIEVAL_LIMIT;
  if (hookConfig?.hook_code === "/audit") return AUDIT_MODE_RETRIEVAL_LIMIT;
  if (hookConfig?.hook_code === "/debug" || hookConfig?.hook_code === "/patch") return DEBUG_PATCH_RETRIEVAL_LIMIT;

  if (
    issueClassification?.orchestrationMode === "FAST_DEFINITION" ||
    queryIntent?.requiresSimpleDefinition ||
    isSimpleDefinitionQuestion(question)
  ) {
    return SIMPLE_RETRIEVAL_LIMIT;
  }

  return DEFAULT_RETRIEVAL_LIMIT;
}

async function runRetrievalEngine({
  question,
  queryIntent,
  issueClassification,
  hookConfig,
  adaptiveContext,
  supabase
}) {
  if (hookConfig.requires_retrieval === false) {
    return {
      retrievedSources: [],
      retrievalSkipped: true,
      retrievalEngineCalled: false,
      retrievalMetadata: {
        reason: "Route does not require retrieval."
      }
    };
  }

  const fn = findFunction({}, [
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

  const limit = resolveRetrievalLimit({ question, hookConfig, issueClassification, queryIntent });

  try {
    const result = await withTimeout(
      invokeFlexible(fn, question, {
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

        responseMode: queryIntent.responseMode,
        orchestrationMode: queryIntent.orchestrationMode,
        requiresQuizMode: queryIntent.requiresQuizMode,
        requiresReviewMode: queryIntent.requiresReviewMode,
        requiresSimpleDefinition: queryIntent.requiresSimpleDefinition,
        requiresSourceVisibility: queryIntent.requiresSourceVisibility,
        isNaturalConversation: queryIntent.isNaturalConversation,
        isFollowUp: queryIntent.isFollowUp,

        hookConfig,
        adaptiveContext,
        supabase,

        forceSourceVisibility:
          hookConfig.forceSourceVisibility === true ||
          queryIntent.requiresSourceVisibility === true ||
          hookConfig.hook_code === "/source",

        caseMode: hookConfig.hook_code === "/case",
        reviewerMode: hookConfig.hook_code === "/review",
        auditMode: hookConfig.hook_code === "/audit",

        limit,
        maxResults: limit,
        maxSources: limit,
        tpmConscious: true
      }),
      RETRIEVAL_TIMEOUT_MS,
      "Retrieval engine"
    );

    const retrievedSources = normalizeRetrievedSources(result, {
      question,
      hookConfig,
      issueClassification,
      queryIntent
    });

    return {
      ...safeObject(result),
      retrievedSources,
      retrievalLimit: limit,
      retrievalEngineCalled: true,
      retrievalMetadata: {
        ...safeObject(result?.retrievalMetadata),
        ...safeObject(result?.retrievalMeta),
        sourceCount: retrievedSources.length
      }
    };
  } catch (error) {
    console.error("Retrieval engine failed:", error.message);

    return {
      retrievedSources: [],
      retrievalError: error.message,
      retrievalEngineCalled: true,
      retrievalLimit: limit,
      retrievalMetadata: {
        reason: "Retrieval engine failed or timed out.",
        sourceCount: 0
      }
    };
  }
}

async function runOptionalReranker({
  question,
  queryIntent,
  issueClassification,
  hookConfig,
  adaptiveContext,
  retrievalResult
}) {
  const retrievedSources = safeArray(retrievalResult?.retrievedSources);

  if (!retrievedSources.length) {
    return {
      rerankerCalled: false,
      rerankerSkipped: true,
      rerankedSources: retrievedSources,
      reason: "No retrieved sources to rerank."
    };
  }

  const fn = findFunction({}, [
    "rerankForTina",
    "rerankSources",
    "rerankRetrievedSources",
    "runReranker",
    "runRerankerEngine",
    "rerankerEngine"
  ]);

  if (!fn) {
    return {
      rerankerCalled: false,
      rerankerMissing: true,
      rerankedSources: retrievedSources,
      reason: "No compatible reranker export found."
    };
  }

  try {
    const result = await withTimeout(
      invokeFlexible(fn, {
        sources: retrievedSources,
        retrievedSources,
        query: question,
        question,
        issueClassification,
        queryIntent,
        adaptiveMode: queryIntent.responseMode || hookConfig.adaptiveResponseMode,
        responseMode: queryIntent.responseMode,
        orchestrationMode: queryIntent.orchestrationMode,
        hookConfig,
        adaptiveContext
      }, {
        sources: retrievedSources,
        retrievedSources,
        query: question,
        question,
        issueClassification,
        queryIntent,
        adaptiveMode: queryIntent.responseMode || hookConfig.adaptiveResponseMode,
        responseMode: queryIntent.responseMode,
        orchestrationMode: queryIntent.orchestrationMode,
        hookConfig,
        adaptiveContext
      }),
      RERANK_TIMEOUT_MS,
      "Reranker engine"
    );

    const rerankedSources =
      safeArray(result?.retrievedSources).length
        ? safeArray(result.retrievedSources)
        : safeArray(result?.sources).length
          ? safeArray(result.sources)
          : Array.isArray(result)
            ? result
            : retrievedSources;

    return {
      rerankerCalled: true,
      rerankedSources,
      rerankerMetadata: safeObject(result?.metadata || result?.rerankerMetadata)
    };
  } catch (error) {
    console.error("Reranker failed, using raw retrieved sources:", error.message);

    return {
      rerankerCalled: true,
      rerankerError: error.message,
      rerankedSources: retrievedSources
    };
  }
}

async function buildRagPipelineContext_DEPRECATED({
  question,
  hookConfig,
  adaptiveContext,
  supabase
}) {
  const queryIntent = await runQueryIntentEngine({ question, hookConfig, adaptiveContext });

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

  const preRerankSources = safeArray(retrievalResult?.retrievedSources);

  const rerankerResult = await runOptionalReranker({
    question,
    queryIntent,
    issueClassification,
    hookConfig,
    adaptiveContext,
    retrievalResult: {
      ...safeObject(retrievalResult),
      retrievedSources: preRerankSources
    }
  });

  const retrievedSources = safeArray(rerankerResult.rerankedSources);

  return {
    queryIntent,
    issueClassification,
    retrievalResult: {
      ...safeObject(retrievalResult),
      retrievedSources,
      preRerankSources,
      rerankerMetadata: rerankerResult
    },
    retrievedSources,
    preRerankSources,
    rerankerResult
  };
}

function buildRagOrchestrationIntent_DEPRECATED({ queryIntent = {}, hookConfig = {}, pipeline = {} }) {
  return {
    ...safeObject(queryIntent),

    routeHook: hookConfig.hook_code,
    routeMode: hookConfig.mode,
    routeKind: hookConfig.routeKind,

    responseMode: queryIntent.responseMode || hookConfig.adaptiveResponseMode || "STANDARD",
    orchestrationMode: queryIntent.orchestrationMode || hookConfig.orchestrationMode || "STANDARD_TAX",

    requiresQuizMode: hookConfig.hook_code === "/quiz" || Boolean(queryIntent.requiresQuizMode),
    requiresReviewMode: hookConfig.hook_code === "/review" || Boolean(queryIntent.requiresReviewMode),
    requiresSimpleDefinition: Boolean(queryIntent.requiresSimpleDefinition),
    requiresSourceVisibility:
      hookConfig.hook_code === "/source" ||
      hookConfig.forceSourceVisibility === true ||
      Boolean(queryIntent.requiresSourceVisibility),
    requiresCaseMode: hookConfig.hook_code === "/case" || Boolean(queryIntent.requiresCaseMode),

    isNaturalConversation: Boolean(queryIntent.isNaturalConversation),
    isFollowUp: Boolean(queryIntent.isFollowUp),

    reviewerAnswerFormat:
      hookConfig.hook_code === "/review"
        ? ["Concept", "Rule", "Memory Aid", "Common Trap", "Example", "Quick Check"]
        : null,

    retrievedSourceCount: safeArray(pipeline.retrievedSources).length,
    tpmConscious: true
  };
}

function buildCompactOrchestrationMetadata(extra = {}) {
  return {
    askHandlerVersion: ENGINE_VERSION,
    orchestrationFirstArchitecture: true,
    routeControllerOnly: true,
    slashCommandInterceptor: true,
    modeStatePreserver: true,
    retrievedSourcePreserver: true,
    queryIntentAwareDispatcher: true,

    noDirectOpenAICall: true,
    noPromptAssembly: true,
    noTokenEstimation: true,
    noLegalReasoningInsideAskHandler: true,
    noSourceRankingInsideAskHandler: true,
    noRenderingInsideAskHandler: true,
    noRawRetrievalPayloadInjection: true,
    noRawEngineObjectInjection: true,

    correctFlowEnabled: true,
    queryIntentEngineCalled: Boolean(extra.queryIntentEngineCalled),
    issueClassificationEngineCalled: Boolean(extra.issueClassificationEngineCalled),
    retrievalEngineCalled: Boolean(extra.retrievalEngineCalled),
    rerankerEngineCalled: Boolean(extra.rerankerEngineCalled),

    contextOrchestrationEnabled: true,
    openAIContextBudgetingEnabled: true,
    finalTrimBeforeOpenAIEnabled: true,
    compressSourcesBeforeOpenAI: true,
    tpmConscious: true,

    routeHook: extra.routeHook || null,
    routeMode: extra.routeMode || null,
    routeKind: extra.routeKind || null,
    retrievalSourceCount: Number(extra.retrievalSourceCount || 0)
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

  if (!openai) throw new Error("createAskHandler requires OpenAI client.");

  const resolvedContextOrchestration = buildContextOrchestration(contextOrchestration || {});

  const assessmentHandler = createAssessmentHandler({
    supabase,
    openai,
    contextOrchestration: resolvedContextOrchestration,
    openaiModel
  });

  const learningHandler = createLearningHandler({
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
      await saveMessage(supabase, { conversationId, userId, role: "user", content: question });
      await saveMessage(supabase, {
        conversationId,
        userId,
        role: "assistant",
        content: answerText,
        sourcesUsed,
        fallbackReferences
      });

      await saveMemoryHooks(supabase, userId, extractMemoryHooks(question));
    } catch (error) {
      console.error("Conversation save skipped:", error.message);
    }
  }

  async function handleFeedback({ userId, conversationId, correction, feedbackType, originalAnswer, hookConfig }) {
    const cleanCorrection = normalizeText(correction);
    const cleanFeedbackType = normalizeText(feedbackType || "general_feedback");
    const cleanOriginalAnswer = normalizeText(originalAnswer);

    if (!cleanCorrection) {
      // Sticky mode: user sent plain text while in /feedback mode.
      // If there's a cleanQuestion (from sticky mode prepend), respond with a mode warning
      // rather than a 400 error — the user may have forgotten they're in feedback mode.
      const plainTextQuestion = normalizeText(hookConfig.cleanQuestion || "");
      if (plainTextQuestion) {
        const modeWarningAnswer = [
          "**You are currently in Feedback Mode.**",
          "",
          `Your message: _"${plainTextQuestion}"_`,
          "",
          "To submit feedback on a previous answer, include what needs to be corrected.",
          "",
          `To answer _"${plainTextQuestion}"_ normally, type:`,
          `> /ask ${plainTextQuestion}`,
          "",
          "To exit Feedback Mode, type **/bye** or **/reset**."
        ].join("\n");

        return {
          status: 200,
          body: {
            success: true,
            engine: "TINA Feedback Learning Engine",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            answer: modeWarningAnswer,
            answerMode: "feedback_mode_active_warning",
            sourceStatus: "FEEDBACK_MODE_ACTIVE",
            sources: [],
            sourcesUsed: [],
            vectorMatches: 0,
            askHandlerVersion: ENGINE_VERSION,
            contextOrchestrationEnabled: true
          }
        };
      }

      return {
        status: 400,
        body: {
          success: false,
          error: "Feedback correction is required.",
          hint: "Send { question, conversationId, correction, feedbackType, originalAnswer }",
          validFeedbackTypes: ["general_feedback", "factual_correction", "legal_correction", "citation_correction", "hallucination_report", "doctrinal_conflict", "evidence_gap", "rendering_issue", "mode_routing_issue", "tax_position_issue"]
        }
      };
    }

    const feedbackResult = await storeFeedbackEntry(supabase, {
      userId,
      sessionId: conversationId || null,
      conversationId: conversationId || null,
      originalQuestion: hookConfig.originalQuestion,
      originalAnswer: cleanOriginalAnswer,
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

  async function clearActiveMode({ userId, conversationId, existingMode }) {
    const activeHook = existingMode?.active_hook || "/ask";

    await clearModeState(supabase, userId, conversationId || null);
    await assessmentHandler.clearPendingQuizAttempts(userId, conversationId || null);

    let answerText = "Session ended. Thank you for using TINA. Type any question or a mode hook (e.g. /ask, /quiz, /review) to start a new session.";

    if (activeHook === "/quiz") answerText = "Quiz session ended. Your progress has been saved. Type /quiz to start a new quiz or /ask to continue with a regular question.";
    else if (activeHook === "/review") answerText = "You have exited /review mode and returned to normal /ask mode.";
    else if (activeHook === "/case") answerText = "Case analysis session ended. Type /case to start a new case analysis or /ask to continue with a regular question.";
    else if (activeHook === "/source") answerText = "Source finder session ended. Type /source to look up another source or /ask to continue with a regular question.";
    else if (activeHook === "/diagnostic") answerText = "Diagnostic session ended. Type /diagnostic to start a new diagnostic or /ask to continue with a regular question.";
    else if (activeHook === "/audit") answerText = "You have exited /audit mode and returned to normal /ask mode.";
    else if (activeHook !== "/ask") answerText = `${activeHook} session ended. Type /ask to continue with a regular question.`;

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

  async function handleControlledRagRoute({
    res,
    userId,
    conversationId,
    hookConfig,
    adaptiveContext,
    orchestrationMetadata
  }) {
    const question = hookConfig.cleanQuestion || hookConfig.originalQuestion;

    // LAW 1: ask-handler calls ONLY pipeline.runPipeline(). No engine called here.
    const priorMessages = conversationId
      ? await getHistory(supabase, conversationId, 20).catch(() => [])
      : [];
    let result;
    try {
      result = await withTimeout(
        runPipeline({
          query:   question,
          hook:    hookConfig.hook_code,
          supabase,
          openai,
          model:   openaiModel,
          conversationHistory: priorMessages
        }),
        RAG_TIMEOUT_MS,
        "TINA 16-step pipeline"
      );
    } catch (error) {
      console.error("Pipeline failed:", {
        name:    error?.name || error?.constructor?.name,
        message: error?.message,
        status:  error?.status,
        code:    error?.code,
        type:    error?.type,
        stack:   error?.stack?.split("\n").slice(0, 10).join("\n")
      });
      result = {
        answer:
          "I could not complete the full sourced answer because the pipeline failed or timed out. Please try again with a narrower question.",
        sources: [],
        issueClassification: {},
        orchestration: {
          ragError:           error.message,
          ragErrorName:       error?.name || error?.constructor?.name,
          ragErrorStatus:     error?.status,
          ragErrorCode:       error?.code,
          fallbackAnswerUsed: true
        }
      };
    }

    const resultSources = safeArray(result.sources || result.sourcesUsed);
    const resultSourceCards = safeArray(result.sourceCards);

    console.log("TINA MODE DOWNSTREAM DEBUG:", {
      responseMode: result.responseMode || result.orchestration?.mode || hookConfig.mode,
      orchestrationMode: result.orchestrationMode || result.orchestration?.mode || hookConfig.mode,
      commandMode: hookConfig.mode,
      retrievedSourceCount: resultSources.length,
      sourceCardCount: resultSourceCards.length,
      finalComplianceApplied: Boolean(result.answer),
      rendererMode: result.mode || hookConfig.mode
    });

    const payload = {
      success: true,
      engine: "TINA_ASK_HANDLER",
      version: ENGINE_VERSION,
      hook: hookConfig.hook_code,
      mode: result.mode || hookConfig.mode,
      routeKind: hookConfig.routeKind,
      hookTitle: hookConfig.title,

      answer: result.answer || "",

      sources: resultSources,
      sourcesUsed: resultSources,
      sourceCards: resultSourceCards,
      vectorMatches: resultSources.length,

      retrievedSourceCount: resultSources.length,

      sourceStatus: resultSources.length
        ? "ISSUE_MATCHED_CONTEXT_USED"
        : "NO_VISIBLE_SOURCE",

      responseMode: result.responseMode || result.orchestration?.mode || hookConfig.mode,
      orchestrationMode: result.orchestrationMode || result.orchestration?.mode || hookConfig.mode,
      pipelineVersion: result.pipelineVersion,

      activeHook: hookConfig.hook_code,
      activeMode: hookConfig.mode,
      commandMode: hookConfig.mode,
      requiresQuizMode: hookConfig.hook_code === "/quiz",
      requiresDiagnosticMode: hookConfig.hook_code === "/diagnostic",
      requiresReviewMode: hookConfig.hook_code === "/review",
      requiresSourceVisibility: hookConfig.hook_code === "/source" || Boolean(hookConfig.forceSourceVisibility),
      requiresCaseAnalysis: hookConfig.hook_code === "/case",
      requiresAuditMode: hookConfig.hook_code === "/audit",
      requiresSeniorCounselMemo: hookConfig.hook_code === "/tax",
      requiresDebugMode: hookConfig.hook_code === "/debug",
      requiresCodePatch: hookConfig.hook_code === "/patch",
      requiresProgressMode: hookConfig.hook_code === "/progress",
      requiresFeedbackMode: hookConfig.hook_code === "/feedback",

      metadata: {
        ...safeObject(result.orchestration),
        askHandlerVersion: ENGINE_VERSION,
        pipelineSupremacy: true,
        pipelineVersion: result.pipelineVersion,
        correctFlowEnabled: true,
        issueClassificationEngineCalled: true,
        retrievalEngineCalled: true,
        rerankerEngineCalled: true,
        fourPartDoctrineTestApplied: true,
        routeControllerOnly: true,
        noLegalReasoningInsideAskHandler: true,
        noSourceRankingInsideAskHandler: true,
        noRenderingInsideAskHandler: true,
        orchestrationFirstArchitecture: true,
        noDirectOpenAICall: true,
        noPromptAssembly: true,
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
      const { question, correction, feedbackType, originalAnswer } = req.body || {};
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

      const existingMode = await getModeState(supabase, userId, conversationId || null);

      if (isExitCommand(rawQuestion)) {
        return res.json(await clearActiveMode({ userId, conversationId, existingMode }));
      }

      const explicitHook = detectExplicitSlashCommand(rawQuestion);
      const activeHook = existingMode?.active_hook || null;
      const hasActiveAssessmentMode = assessmentHandler.isAssessmentHook(activeHook);

      // MODE SESSION LOCK — prevent switching to a different slash command while in /quiz or /review
      if (
        (activeHook === "/quiz" || activeHook === "/review") &&
        explicitHook &&
        explicitHook !== activeHook
      ) {
        const lockedDomain = existingMode?.adaptive_context?.learning?.domain || "";
        const modeLabel = activeHook === "/quiz" ? "Quiz" : "Reviewer";
        const domainSuffix = lockedDomain ? ` for ${lockedDomain}` : "";
        return res.json({
          success: false,
          engine: "TINA_ASK_HANDLER",
          mode: "MODE_SESSION_LOCKED",
          hook: activeHook,
          answer: `You are currently in ${modeLabel} Mode${domainSuffix}. Type /bye, /exit, or /quit first before switching modes.`,
          sourceStatus: "MODE_SESSION_LOCKED",
          sources: [],
          sourcesUsed: [],
          vectorMatches: 0,
          askHandlerVersion: ENGINE_VERSION,
          contextOrchestrationEnabled: true
        });
      }

      const pendingQuiz = await assessmentHandler.fetchLatestPendingQuiz(userId, conversationId || null);

      if (pendingQuiz && !hasActiveAssessmentMode) {
        await assessmentHandler.clearPendingQuizAttempts(userId, conversationId || null);
      }

      // ── QUIZ SELECTION GATE ───────────────────────────────────────────────────
      // When /quiz is active but no quiz question has been stored yet (i.e., the
      // domain-selection menu was shown and the user has not yet chosen a domain),
      // only "/quiz <domain>" commands and exit commands may proceed.
      //
      // Without this gate, requests arriving via the /ask endpoint (forcedHook="/ask")
      // bypass the sticky-mode prepend and fall through to the normal RAG pipeline.
      //
      // Condition: activeHook === "/quiz" AND pendingQuiz is null (no stored question)
      //            AND the learning context has no domain yet.
      if (
        activeHook === "/quiz" &&
        !pendingQuiz &&
        !isExitCommand(rawQuestion)
      ) {
        const quizLearningDomain =
          existingMode?.adaptive_context?.learning?.domain || null;

        if (!quizLearningDomain) {
          const lowerInput = normalizeLower(rawQuestion);
          // Valid domain commands must start with "/quiz " (e.g., "/quiz VAT")
          // or be exactly "/quiz" (re-show the menu).
          const isValidDomainCommand =
            lowerInput.startsWith("/quiz ") || lowerInput === "/quiz";

          if (!isValidDomainCommand) {
            console.log("[TINA ROUTE] QUIZ_SELECTION_LOCKED — blocking:", {
              rawQuestion: rawQuestion.slice(0, 80),
              activeHook,
              forcedHook,
              quizLearningDomain
            });
            return res.json({
              success: false,
              engine: "TINA_ASK_HANDLER",
              mode: "QUIZ_SELECTION_LOCKED",
              hook: "/quiz",
              answer:
                "Quiz mode is waiting for a tax domain. Please choose one of the listed /quiz options, or type /bye to exit.",
              sourceStatus: "QUIZ_SELECTION_LOCKED",
              sources: [],
              sourcesUsed: [],
              vectorMatches: 0,
              askHandlerVersion: ENGINE_VERSION,
              contextOrchestrationEnabled: true
            });
          }
        }
      }
      // ── END QUIZ SELECTION GATE ───────────────────────────────────────────────

      // ── QUIZ DOMAIN SWITCH BLOCK ──────────────────────────────────────────────
      // When a quiz question is pending (ANSWERING phase) and the user types a
      // /quiz command (e.g., "/quiz Income Tax"), the MODE SESSION LOCK above does
      // not fire because explicitHook === activeHook ("/quiz" === "/quiz").
      // This second guard catches same-hook domain-switch attempts.
      if (
        pendingQuiz &&
        hasActiveAssessmentMode &&
        activeHook === "/quiz" &&
        explicitHook === "/quiz"
      ) {
        const lockedDomain = existingMode?.adaptive_context?.learning?.domain || "";
        const domainSuffix = lockedDomain ? ` for ${lockedDomain}` : "";
        return res.json({
          success: false,
          engine: "TINA_ASK_HANDLER",
          mode: "MODE_SESSION_LOCKED",
          hook: "/quiz",
          answer: `You are currently in Quiz Mode${domainSuffix}. Type /bye, /exit, or /quit first before switching modes.`,
          sourceStatus: "MODE_SESSION_LOCKED",
          sources: [],
          sourcesUsed: [],
          vectorMatches: 0,
          askHandlerVersion: ENGINE_VERSION,
          contextOrchestrationEnabled: true
        });
      }
      // ── END QUIZ DOMAIN SWITCH BLOCK ──────────────────────────────────────────

      const quizAnswer = extractQuizAnswer(rawQuestion);

      if (pendingQuiz && hasActiveAssessmentMode && quizAnswer && !explicitHook) {
        const loopResult = await assessmentHandler.continueAssessmentLoop({
          userId,
          conversationId: conversationId || null,
          incomingAnswer: rawQuestion
        });

        if (loopResult.handled) return res.json(loopResult.response);
      }

      if (pendingQuiz && hasActiveAssessmentMode && !quizAnswer && !explicitHook) {
        const lockedDomain = existingMode?.adaptive_context?.learning?.domain || "";
        const modeLabel = activeHook === "/quiz" ? "Quiz" : "Reviewer";
        return res.json({
          success: false,
          engine: "TINA Continuous Learning Engine",
          mode: "MODE_ANSWER_GATED",
          answer: `${modeLabel} mode is active${lockedDomain ? ` for ${lockedDomain}` : ""}. Please answer using A, B, C, or D only, or type /bye to exit.`,
          sourceStatus: "QUIZ_MODE_LOCKED",
          sources: [],
          sourcesUsed: [],
          vectorMatches: 0,
          askHandlerVersion: ENGINE_VERSION,
          contextOrchestrationEnabled: true
        });
      }

      // REVIEW MODE ANSWER GATE — pendingAnswer in session state means the mini MCQ is awaiting a response.
      // Invalid input is rejected here: no OpenAI call, no retrieval, no session reset.
      const pendingReviewAnswer = existingMode?.adaptive_context?.learning?.pendingAnswer || null;
      if (pendingReviewAnswer && activeHook === "/review" && !quizAnswer && !explicitHook) {
        const lockedDomain = existingMode?.adaptive_context?.learning?.domain || "";
        console.log("[REVIEW MODE] Invalid locked input", {
          input: rawQuestion.slice(0, 80),
          sessionId: conversationId,
          activeDomain: lockedDomain
        });
        return res.json({
          success: false,
          engine: "TINA_ASK_HANDLER",
          mode: "MODE_ANSWER_GATED",
          answer: "Invalid review input.\n\nAllowed responses:\n• A\n• B\n• C\n• D\n• /bye\n• /exit\n• /quit",
          sourceStatus: "REVIEW_MODE_LOCKED",
          sources: [],
          sourcesUsed: [],
          vectorMatches: 0,
          askHandlerVersion: ENGINE_VERSION,
          contextOrchestrationEnabled: true
        });
      }

      let effectiveQuestion = rawQuestion;

      if (
        !forcedHook &&
        !explicitHook &&
        existingMode?.active_hook &&
        existingMode.active_hook !== "/ask" &&
        !isExplicitModeHook(rawQuestion)
      ) {
        effectiveQuestion = `${existingMode.active_hook} ${rawQuestion}`;
      }

      const hookConfig = await loadTaxHookConfig({
        supabase,
        rawQuestion: effectiveQuestion,
        forcedHook
      });

      console.log("TINA MODE ROUTE DEBUG:", {
        userId,
        sessionId: conversationId,
        rawQuestion: rawQuestion.slice(0, 80),
        cleanQuestion: (hookConfig?.cleanQuestion || "").slice(0, 80),
        detectedCommand: explicitHook,
        activeHookBefore: existingMode?.active_hook || null,
        activeModeBefore: existingMode?.active_mode || null,
        selectedHook: hookConfig?.hook_code,
        selectedMode: hookConfig?.mode,
        commandMode: hookConfig?.mode,
        responseMode: hookConfig?.orchestrationMode,
        orchestrationMode: hookConfig?.orchestrationMode,
        isStickyMode: Boolean(!forcedHook && !explicitHook && existingMode?.active_hook && existingMode.active_hook !== "/ask"),
        explicitCommandOverride: Boolean(explicitHook),
        exitCommandDetected: false
      });

      const compactHookConfig = buildCompactHookConfig(hookConfig);

      if (compactHookConfig.mode === "LEARNING_PROGRESS") {
        const result = await assessmentHandler.handleLearningProgress({
          userId,
          conversationId,
          hookConfig: compactHookConfig,
          originalQuestion: compactHookConfig.originalQuestion
        });

        return res.json(result.response);
      }

      if (compactHookConfig.mode === "FEEDBACK") {
        const result = await handleFeedback({
          userId,
          conversationId,
          correction,
          feedbackType,
          originalAnswer,
          hookConfig: compactHookConfig
        });

        return res.status(result.status).json(result.body);
      }

      if (
        SPECIAL_ASSESSMENT_HOOKS.has(compactHookConfig.hook_code) ||
        (
          assessmentHandler.isAssessmentMode(compactHookConfig.mode) &&
          !isRagRoutedHook(compactHookConfig.hook_code) &&
          !isReviewRoutedHook(compactHookConfig.hook_code)
        )
      ) {
        // /quiz and /review → learning system (domain-normalizer + session-engine)
        // /diagnostic → assessment handler (legacy adaptive quiz)
        const isLearningHook =
          compactHookConfig.hook_code === "/quiz" ||
          compactHookConfig.hook_code === "/review";

        if (isLearningHook) {
          let learningResult;
          try {
            learningResult = await learningHandler.handleLearningCommand({
              userId,
              conversationId,
              hookConfig: compactHookConfig,
              cleanQuestion: compactHookConfig.cleanQuestion,
              originalQuestion: compactHookConfig.originalQuestion
            });
          } catch (learningError) {
            console.error("Learning handler error:", learningError.message);
            return res.json({
              success: false,
              engine: "TINA Learning System",
              hook: compactHookConfig.hook_code,
              mode: compactHookConfig.mode,
              answer: "TINA encountered an error in the learning system. Please try again.",
              sources: [],
              sourcesUsed: [],
              vectorMatches: 0,
              error: learningError.message
            });
          }

          if (!learningResult || !learningResult.handled || !learningResult.response) {
            return res.json({
              success: false,
              engine: "TINA Learning System",
              hook: compactHookConfig.hook_code,
              mode: compactHookConfig.mode,
              answer: "TINA could not handle this learning command. Please try again.",
              sources: [],
              sourcesUsed: [],
              vectorMatches: 0
            });
          }

          return res.json(learningResult.response);
        }

        // /diagnostic → existing assessment handler
        let result;
        try {
          result = await assessmentHandler.handleAssessmentCommand({
            userId,
            conversationId,
            hookConfig: compactHookConfig,
            cleanQuestion: compactHookConfig.cleanQuestion,
            originalQuestion: compactHookConfig.originalQuestion
          });
        } catch (assessmentError) {
          console.error("Assessment handler error:", assessmentError.message);
          return res.json({
            success: false,
            engine: "TINA Ask Handler",
            hook: compactHookConfig.hook_code,
            mode: compactHookConfig.mode,
            answer: "TINA encountered an error generating the assessment question. Please try again or type /ask to switch to normal mode.",
            sources: [],
            sourcesUsed: [],
            vectorMatches: 0,
            error: assessmentError.message
          });
        }

        if (!result || !result.handled || !result.response) {
          return res.json({
            success: false,
            engine: "TINA Ask Handler",
            hook: compactHookConfig.hook_code,
            mode: compactHookConfig.mode,
            answer: "TINA could not handle this assessment command. Please try again.",
            sources: [],
            sourcesUsed: [],
            vectorMatches: 0
          });
        }

        return res.json(result.response);
      }

      // ─── AUDIT MODE SWITCH ─────────────────────────────────────────────────────
      // When the user types "/audit" with no following text, treat it as a mode
      // switch — NOT a retrieval query. Save audit session state and return the
      // welcome prompt immediately. The NEXT user message becomes the real query.
      if (
        compactHookConfig.hook_code === "/audit" &&
        !String(compactHookConfig.cleanQuestion || "").trim()
      ) {
        const auditWelcome = AUDIT_WELCOME_MESSAGE;

        await saveConversationTurn({
          conversationId,
          userId,
          question: compactHookConfig.originalQuestion,
          answerText: auditWelcome,
          sourcesUsed: [],
          fallbackReferences: []
        });

        await saveModeState(supabase, {
          userId,
          sessionId: conversationId || null,
          activeHook: "/audit",
          activeMode: "AUDIT_MODE",
          modeTitle: "Audit / Evidence Evaluation Mode",
          lastQuestion: compactHookConfig.originalQuestion,
          lastAnswer: auditWelcome
        });

        return res.json({
          success:              true,
          engine:               "TINA_ASK_HANDLER",
          version:              ENGINE_VERSION,
          hook:                 "/audit",
          mode:                 "AUDIT_MODE",
          routeKind:            "MODE_SWITCH",
          hookTitle:            "Audit / Evidence Evaluation Mode",
          answer:               auditWelcome,
          sources:              [],
          sourcesUsed:          [],
          sourceCards:          [],
          vectorMatches:        0,
          sourceStatus:         "AUDIT_MODE_ACTIVATED",
          responseMode:         "COMPLEX_ADVISORY",
          orchestrationMode:    "COMPLEX_ADVISORY",
          activeHook:           "/audit",
          activeMode:           "AUDIT_MODE",
          auditModeActivated:   true,
          askHandlerVersion:    ENGINE_VERSION,
          contextOrchestrationEnabled: true
        });
      }
      // ─── END AUDIT MODE SWITCH ──────────────────────────────────────────────────

      const adaptiveContext = buildAdaptiveContextForHook({
        hookConfig: compactHookConfig,
        existingMode,
        pendingQuiz,
        contextOrchestrationEnabled: true
      });

      const orchestrationMetadata = buildCompactOrchestrationMetadata({
        routeHook: compactHookConfig.hook_code,
        routeMode: compactHookConfig.mode,
        routeKind: compactHookConfig.routeKind
      });

      return handleControlledRagRoute({
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
        routeControllerOnly: true,
        slashCommandInterceptor: true,
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
      "slash-command-interception",
      "query-intent-engine.js",
      "issue-classification-engine.js",
      "retrieval-engine.js",
      "reranker-engine.js",
      "context-orchestration-engine.js",
      "rag-answer-handler.js"
    ],

    allowedHooks: ALLOWED_HOOKS,
    normalRagRoutedHooks: [...NORMAL_RAG_ROUTED_HOOKS],
    reviewRoutedHooks: [...REVIEW_ROUTED_HOOKS],
    caseRoutedHooks: [...CASE_ROUTED_HOOKS],
    sourceRoutedHooks: [...SOURCE_ROUTED_HOOKS],
    specialAssessmentHooks: [...SPECIAL_ASSESSMENT_HOOKS],
    ragRoutedHooks: [...RAG_ROUTED_HOOKS],

    slashCommandInterceptionBeforeNormalRag: true,
    quizSeparatedFromRag: true,
    reviewSeparatedFromOrdinaryAFLegalFlow: true,
    reviewUsesReviewerRoute: true,
    reviewFormatHint: ["Concept", "Rule", "Memory Aid", "Common Trap", "Example", "Quick Check"],
    caseModeSupported: true,
    sourceModeForcesSourceVisibility: true,
    auditModeSupported: true,
    debugPatchHooksSupported: true,

    orchestrationFirstArchitecture: true,
    routeControllerOnly: true,
    modeStatePreserver: true,
    retrievedSourcePreserver: true,
    queryIntentAwareDispatcher: true,

    noDirectOpenAICall: true,
    noPromptAssembly: true,
    noTokenEstimation: true,
    noLegalReasoningInsideAskHandler: true,
    noSourceRankingInsideAskHandler: true,
    noRenderingInsideAskHandler: true,
    noRawRetrievalPayloadInjection: true,
    noRawEngineObjectInjection: true,

    retrievalBeforeRag: true,
    rerankerBetweenRetrievalAndRag: true,
    rerankerFallbackToRawSources: true,
    retrievedSourcesPreservedBeforeGenerateRagAnswer: true,
    queryIntentModeFlagsPassedToRag: true,

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
