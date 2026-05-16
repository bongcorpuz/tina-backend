// FILE: ask-handler.js
"use strict";

/**
 * TINA Ask Handler
 * Version: 4.1.0
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
import { createRagAnswerHandler } from "./rag-answer-handler.js";

const ENGINE_VERSION = "4.1.0";

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

async function loadTaxHookConfig({ supabase, rawQuestion = "" }) {
  const text = normalizeText(rawQuestion);

  let hookCode = "/ask";
  let cleanQuestion = text;

  const firstWord = normalizeHookCommand(text);

  if (ALLOWED_HOOKS.includes(firstWord)) {
    hookCode = firstWord;
    cleanQuestion = text.slice(firstWord.length).trim();
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
        ...data,
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
    engineVersion: ENGINE_VERSION
  };
}

function buildAdaptiveContextForHook({
  hookConfig,
  existingMode = null,
  pendingQuiz = false
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
    existingMode,
    pendingQuiz: Boolean(pendingQuiz),

    adaptiveResponseMode: responseMode,

    adaptiveMode: {
      primaryMode: mode,
      responseMode,
      sourceMode: mode === "SOURCE_FINDER",
      reviewerMode: mode === "TAX_REVIEWER",
      taxExpertMode: mode === "TAX_EXPERT"
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
      }
    }
  };
}

export function createAskHandler({ supabase, openai }) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("createAskHandler requires a valid Supabase client.");
  }

  if (!openai) {
    throw new Error("createAskHandler requires OpenAI client.");
  }

  const assessmentHandler = createAssessmentHandler({ supabase, openai });
  const ragAnswerHandler = createRagAnswerHandler({ supabase, openai });

  async function saveConversationTurn({
    conversationId,
    userId,
    question,
    answerText,
    sourcesUsed = [],
    fallbackReferences = []
  }) {
    if (!conversationId || !userId) return;

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
    await saveMemoryHooks(supabase, userId, hooks);
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

    const feedbackResult = await storeFeedbackEntry(supabase, {
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
        askHandlerVersion: ENGINE_VERSION
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
        askHandlerVersion: ENGINE_VERSION
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
      askHandlerVersion: ENGINE_VERSION
    };
  }

  return async function handleAsk(req, res) {
    try {
      const {
        question,
        correction,
        feedbackType
      } = req.body || {};

      const userId = getUserId(req);
      const conversationId = getConversationId(req);

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

      const existingMode = await getModeState(
        supabase,
        userId,
        conversationId || null
      );

      if (isExitCommand(rawQuestion)) {
        const cleared = await clearActiveMode({
          userId,
          conversationId,
          existingMode
        });

        return res.json(cleared);
      }

      const activeHook = existingMode?.active_hook || null;
      const hasActiveAssessmentMode =
        assessmentHandler.isAssessmentHook(activeHook);

      const pendingQuiz = await assessmentHandler.fetchLatestPendingQuiz(
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
        const loopResult = await assessmentHandler.continueAssessmentLoop({
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
        existingMode?.active_hook &&
        existingMode.active_hook !== "/ask" &&
        !isExplicitModeHook(rawQuestion)
      ) {
        effectiveQuestion = `${existingMode.active_hook} ${rawQuestion}`;
      }

      const hookConfig = await loadTaxHookConfig({
        supabase,
        rawQuestion: effectiveQuestion
      });

      if (hookConfig.mode === "LEARNING_PROGRESS") {
        const result = await assessmentHandler.handleLearningProgress({
          userId,
          conversationId,
          hookConfig,
          originalQuestion: hookConfig.originalQuestion
        });

        return res.json(result.response);
      }

      if (hookConfig.mode === "FEEDBACK") {
        const result = await handleFeedback({
          userId,
          conversationId,
          correction,
          feedbackType,
          hookConfig
        });

        return res.status(result.status).json(result.body);
      }

      if (
        SPECIAL_ASSESSMENT_HOOKS.has(hookConfig.hook_code) ||
        (
          assessmentHandler.isAssessmentMode(hookConfig.mode) &&
          !isRagRoutedHook(hookConfig.hook_code)
        )
      ) {
        const result = await assessmentHandler.handleAssessmentCommand({
          userId,
          conversationId,
          hookConfig,
          cleanQuestion: hookConfig.cleanQuestion,
          originalQuestion: hookConfig.originalQuestion
        });

        return res.json(result.response);
      }

      if (isRagRoutedHook(hookConfig.hook_code) || hookConfig.requires_retrieval) {
        return ragAnswerHandler.handleRagAnswer({
          res,
          userId,
          conversationId,
          hookConfig: {
            ...hookConfig,
            requires_retrieval: true
          },
          cleanQuestion: hookConfig.cleanQuestion || hookConfig.originalQuestion,
          originalQuestion: hookConfig.originalQuestion,
          adaptiveContext: buildAdaptiveContextForHook({
            hookConfig,
            existingMode,
            pendingQuiz
          })
        });
      }

      return ragAnswerHandler.handleRagAnswer({
        res,
        userId,
        conversationId,
        hookConfig: buildHardcodedHookConfig("/ask"),
        cleanQuestion: hookConfig.cleanQuestion || hookConfig.originalQuestion,
        originalQuestion: hookConfig.originalQuestion,
        adaptiveContext: buildAdaptiveContextForHook({
          hookConfig: buildHardcodedHookConfig("/ask"),
          existingMode,
          pendingQuiz
        })
      });
    } catch (error) {
      console.error("Ask dispatcher error:", error);

      return res.status(500).json({
        success: false,
        error: error.message || "Ask failed",
        engine: "TINA Ask Handler",
        askHandlerVersion: ENGINE_VERSION
      });
    }
  };
}

export function askHandlerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ASK_HANDLER",
    version: ENGINE_VERSION,
    adaptiveCompatible: true,
    assessmentCompatible: true,
    ragCompatible: true,
    feedbackCompatible: true,
    modeStateCompatible: true,
    ragRoutedHooks: [...RAG_ROUTED_HOOKS],
    assessmentHooks: [...SPECIAL_ASSESSMENT_HOOKS],
    sourceOrderingPolicyPassedDownstream: true,
    conflictDisplayPolicyPassedDownstream: true
  };
}
