// FILE: ask-handler.js

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
  getUserId,
  extractQuizAnswer
} from "./ask-helpers.js";

import { createAssessmentHandler } from "./assessment-handler.js";
import { createRagAnswerHandler } from "./rag-answer-handler.js";

const EXIT_COMMANDS = ["/bye", "/exit", "/stop", "/quit", "/reset"];

function isExitCommand(value = "") {
  return EXIT_COMMANDS.includes(String(value || "").trim().toLowerCase());
}

function normalizeHookCommand(value = "") {
  return String(value || "").trim().split(/\s+/)[0]?.toLowerCase() || "";
}

function buildHardcodedHookConfig(hookCode = "/ask") {
  const hooks = {
    "/ask": {
      hook_code: "/ask",
      mode: "ASK",
      title: "Default TINA Assistant",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false
    },
    "/tax": {
      hook_code: "/tax",
      mode: "TAX_EXPERT",
      title: "Big 4 Tax Expert Mode",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false
    },
    "/review": {
      hook_code: "/review",
      mode: "TAX_REVIEWER",
      title: "CPALE Tax Reviewer Mode",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false
    },
    "/quiz": {
      hook_code: "/quiz",
      mode: "QUIZ_MASTER",
      title: "Tax Quiz Mode",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false
    },
    "/diagnostic": {
      hook_code: "/diagnostic",
      mode: "ADAPTIVE_QUIZ",
      title: "Adaptive CPALE Diagnostic Quiz",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false
    },
    "/progress": {
      hook_code: "/progress",
      mode: "LEARNING_PROGRESS",
      title: "Learning Progress Tracker",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false
    },
    "/feedback": {
      hook_code: "/feedback",
      mode: "FEEDBACK",
      title: "Feedback Mode",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: true
    },
    "/source": {
      hook_code: "/source",
      mode: "SOURCE_FINDER",
      title: "Source Finder Mode",
      requires_retrieval: true,
      requires_memory: false,
      requires_feedback: false
    }
  };

  return hooks[hookCode] || hooks["/ask"];
}

async function loadTaxHookConfig({ supabase, rawQuestion = "" }) {
  const text = String(rawQuestion || "").trim();

  let hookCode = "/ask";
  let cleanQuestion = text;

  const firstWord = normalizeHookCommand(text);

  const allowedHooks = [
    "/ask",
    "/tax",
    "/review",
    "/quiz",
    "/diagnostic",
    "/progress",
    "/feedback",
    "/source"
  ];

  if (allowedHooks.includes(firstWord)) {
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
        requires_retrieval: fallbackConfig.requires_retrieval,
        title: data.title || fallbackConfig.title,
        requires_memory: data.requires_memory ?? fallbackConfig.requires_memory,
        requires_feedback:
          data.requires_feedback ?? fallbackConfig.requires_feedback,
        cleanQuestion: cleanQuestion || text,
        originalQuestion: text
      };
    }
  } catch (error) {
    console.error("Hook config fallback used:", error.message);
  }

  return {
    ...fallbackConfig,
    cleanQuestion: cleanQuestion || text,
    originalQuestion: text
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
    const cleanCorrection = String(correction || "").trim();
    const cleanFeedbackType = String(feedbackType || "general_feedback").trim();

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
      originalQuestion: hookConfig.originalQuestion,
      originalAnswer: "",
      feedbackType: cleanFeedbackType,
      userCorrection: cleanCorrection
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
        vectorMatches: 0
      }
    };
  }

  return async function handleAsk(req, res) {
    try {
      const { question, conversationId, correction, feedbackType } = req.body || {};
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User ID not found in token. Cannot proceed."
        });
      }

      const rawQuestion = String(question || "").trim();

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

        return res.json({
          success: true,
          engine: "TINA Mode State System",
          mode: "MODE_CLEARED",
          previousMode: activeHook,
          answer: answerText,
          sourceStatus: "MODE_STATE_CLEARED",
          sourcesUsed: [],
          sources: [],
          vectorMatches: 0
        });
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

      if (assessmentHandler.isAssessmentMode(hookConfig.mode)) {
        const result = await assessmentHandler.handleAssessmentCommand({
          userId,
          conversationId,
          hookConfig,
          cleanQuestion: hookConfig.cleanQuestion,
          originalQuestion: hookConfig.originalQuestion
        });

        return res.json(result.response);
      }

      return ragAnswerHandler.handleRagAnswer({
        res,
        userId,
        conversationId,
        hookConfig,
        cleanQuestion: hookConfig.cleanQuestion,
        originalQuestion: hookConfig.originalQuestion
      });
    } catch (error) {
      console.error("Ask dispatcher error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Ask failed"
      });
    }
  };
}
