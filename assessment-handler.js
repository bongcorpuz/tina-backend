// FILE: assessment-handler.js

import { saveModeState } from "./mode-state.js";

import {
  extractMemoryHooks,
  saveMemoryHooks
} from "./memory-hooks.js";

import { saveMessage } from "./conversation-memory.js";

import {
  getAdaptiveQuizProfile,
  buildAdaptiveQuizPrompt,
  safeParseQuizJson,
  storeUnansweredQuiz,
  getRecentQuizHistory,
  buildQuizExclusionFromHistory
} from "./adaptive-quiz.js";

import {
  getOrCreateLearnerProfile,
  updateLearnerProfileStats,
  updateTopicMastery
} from "./learner-profile.js";

import { getQuizSourceChunks } from "./vector-store.js";

import {
  MAX_VISIBLE_SOURCES,
  extractQuizAnswer,
  formatQuestionBlock,
  finalizeSourcesForResponse
} from "./ask-helpers.js";

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function isAssessmentHook(hook = "") {
  return ["/quiz", "/review", "/diagnostic"].includes(
    String(hook || "").toLowerCase()
  );
}

function isAssessmentMode(mode = "") {
  return ["QUIZ_MASTER", "TAX_REVIEWER", "ADAPTIVE_QUIZ"].includes(
    String(mode || "").toUpperCase()
  );
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function buildAssessmentModeConfig(mode = "QUIZ_MASTER") {
  const normalizedMode = String(mode || "QUIZ_MASTER").toUpperCase();

  if (normalizedMode === "TAX_REVIEWER") {
    return {
      hook_code: "/review",
      mode: "TAX_REVIEWER",
      title: "CPALE Tax Reviewer Mode",
      requires_memory: true
    };
  }

  if (normalizedMode === "ADAPTIVE_QUIZ") {
    return {
      hook_code: "/diagnostic",
      mode: "ADAPTIVE_QUIZ",
      title: "Adaptive CPALE Diagnostic Quiz",
      requires_memory: true
    };
  }

  return {
    hook_code: "/quiz",
    mode: "QUIZ_MASTER",
    title: "Tax Quiz Mode",
    requires_memory: true
  };
}

export function createAssessmentHandler({ supabase, openai }) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("createAssessmentHandler requires a valid Supabase client.");
  }

  if (!openai) {
    throw new Error("createAssessmentHandler requires a valid OpenAI client.");
  }

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

  async function fetchLatestPendingQuiz(userId, conversationId = null) {
    if (!userId) return null;

    let query = supabase
      .from("tina_learning_attempts")
      .select("*")
      .eq("user_id", String(userId))
      .is("user_answer", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (conversationId) {
      query = query.eq("session_id", conversationId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("fetchLatestPendingQuiz error:", error.message);
      return null;
    }

    return data || null;
  }

  async function updatePendingQuizAnswer({
    pendingQuiz,
    cleanAnswer,
    isCorrect
  }) {
    if (!pendingQuiz?.id) {
      return {
        data: null,
        error: new Error("Pending quiz id is required.")
      };
    }

    const payload = {
      user_answer: cleanAnswer,
      is_correct: Boolean(isCorrect),
      answered_at: new Date().toISOString()
    };

    if (pendingQuiz.updated_at !== undefined) {
      payload.updated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("tina_learning_attempts")
      .update(payload)
      .eq("id", pendingQuiz.id)
      .select();

    if (error) {
      console.error("updatePendingQuizAnswer error:", error.message);
      return { data: null, error };
    }

    const updatedRow = Array.isArray(data) ? data[0] || null : data || null;

    if (!updatedRow) {
      return {
        data: null,
        error: new Error("No quiz row was updated.")
      };
    }

    return { data: updatedRow, error: null };
  }

  async function clearPendingQuizAttempts(userId, conversationId = null) {
    if (!userId) return;

    const payload = {
      user_answer: "CLEARED",
      is_correct: false,
      answered_at: new Date().toISOString()
    };

    let query = supabase
      .from("tina_learning_attempts")
      .update(payload)
      .eq("user_id", String(userId))
      .is("user_answer", null);

    if (conversationId) {
      query = query.eq("session_id", conversationId);
    }

    const { error } = await query;

    if (error) {
      console.error("clearPendingQuizAttempts error:", error.message);
    }
  }

  async function buildReviewTeachingBlock(topic = "") {
    const cleanTopic = String(topic || "Philippine taxation").trim();

    const prompt = `
You are TINA, a CPALE taxation reviewer.

Teach this topic briefly and clearly:
${cleanTopic}

Rules:
- Philippine taxation context only
- concise, useful, exam-oriented
- no long memo
- no practice question
- no free-text answer request

Output format exactly:

Topic:
[topic]

Core Concept:
[brief explanation]

Rule:
[brief rule]

Simple Example:
[brief example]

CPALE Trap:
[brief trap]

Quick Recall:
[memory aid]
`.trim();

    const response = await openai.chat.completions.create({
      model: getModel(),
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }]
    });

    return response.choices?.[0]?.message?.content?.trim() || "";
  }

  async function generateStoredAssessmentQuestion({
    userId,
    conversationId,
    hookConfig,
    requestedTopic,
    teachingText = ""
  }) {
    const quizProfile = await getAdaptiveQuizProfile(
      supabase,
      userId,
      requestedTopic
    );

    const recentHistory = await getRecentQuizHistory(supabase, {
      userId,
      topic: quizProfile.topic,
      limit: 20
    });

    const exclusions = buildQuizExclusionFromHistory(recentHistory);

    const sourceChunks = await getQuizSourceChunks({
      topic: quizProfile.topic,
      excludeSourcePaths: normalizeArray(exclusions.excludeSourcePaths),
      excludeChunkIds: normalizeArray(exclusions.excludeChunkIds),
      limit: 3
    });

    const quizPrompt = buildAdaptiveQuizPrompt({
      topic: quizProfile.topic,
      difficulty: quizProfile.difficulty,
      profile: quizProfile.profile,
      sourceChunks,
      recentQuestions: recentHistory
    });

    const response = await openai.chat.completions.create({
      model: getModel(),
      temperature: 0.3,
      messages: [{ role: "user", content: quizPrompt }]
    });

    const rawQuiz = response.choices?.[0]?.message?.content?.trim() || "";
    const quiz = safeParseQuizJson(rawQuiz);

    if (!quiz) {
      return {
        ok: false,
        error: "Unable to generate valid multiple-choice question JSON.",
        rawQuiz,
        sourceChunks
      };
    }

    const storedQuiz = await storeUnansweredQuiz(supabase, {
      userId,
      sessionId: conversationId || null,
      quiz,
      mode: hookConfig.mode,
      sourceChunks
    });

    if (!storedQuiz || storedQuiz.saveFailed) {
      return {
        ok: false,
        error: "Question was generated but could not be saved.",
        supabaseError: storedQuiz?.error || null,
        rawQuiz,
        quiz,
        sourceChunks
      };
    }

    const answerText = formatQuestionBlock({
      quiz,
      storedQuiz,
      teachingText
    });

    return {
      ok: true,
      quiz,
      storedQuiz,
      sourceChunks,
      answerText
    };
  }

  async function continueAssessmentLoop({
    userId,
    conversationId,
    incomingAnswer
  }) {
    const pendingQuiz = await fetchLatestPendingQuiz(userId, conversationId);

    if (!pendingQuiz) {
      return { handled: false };
    }

    const cleanAnswer = extractQuizAnswer(incomingAnswer);

    if (!cleanAnswer) {
      return {
        handled: true,
        response: {
          success: false,
          engine: "TINA Continuous Learning Engine",
          mode: "INVALID_ANSWER",
          answer:
            "Please answer using letter A, B, C, or D only. Example: A. Type /bye or /exit to stop.",
          sourceStatus: "INVALID_QUIZ_ANSWER",
          sourcesUsed: [],
          sources: [],
          vectorMatches: 0
        }
      };
    }

    const correctAnswer = String(pendingQuiz.correct_answer || "")
      .replace(/[^A-Da-d]/g, "")
      .trim()
      .toUpperCase();

    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      return {
        handled: true,
        response: {
          success: false,
          engine: "TINA Continuous Learning Engine",
          mode: "INVALID_PENDING_QUESTION",
          answer: "Pending question has invalid correct-answer data.",
          sourceStatus: "INVALID_PENDING_QUIZ_DATA",
          sourcesUsed: [],
          sources: [],
          vectorMatches: 0
        }
      };
    }

    const isCorrect = cleanAnswer === correctAnswer;

    const { data: answeredQuiz, error: answerError } =
      await updatePendingQuizAnswer({
        pendingQuiz,
        cleanAnswer,
        isCorrect
      });

    if (answerError || !answeredQuiz) {
      return {
        handled: true,
        response: {
          success: false,
          engine: "TINA Continuous Learning Engine",
          mode: "ANSWER_SAVE_FAILED",
          answer: "TINA failed to save your answer.",
          sourceStatus: "QUIZ_UPDATE_FAILED",
          sourcesUsed: [],
          sources: [],
          vectorMatches: 0
        }
      };
    }

    await updateLearnerProfileStats(supabase, {
      userId,
      topic: pendingQuiz.topic,
      isCorrect
    });

    const mastery = await updateTopicMastery(supabase, {
      userId,
      topic: pendingQuiz.topic,
      subtopic: pendingQuiz.subtopic || "",
      isCorrect
    });

    const nextHookConfig = buildAssessmentModeConfig(pendingQuiz.mode);

    const nextQuestion = await generateStoredAssessmentQuestion({
      userId,
      conversationId,
      hookConfig: nextHookConfig,
      requestedTopic: pendingQuiz.topic || "VAT",
      teachingText: ""
    });

    let nextQuestionText =
      "\nNext question could not be generated. Type the mode command again to continue.";
    let nextSources = [];

    if (nextQuestion.ok) {
      nextSources = finalizeSourcesForResponse(nextQuestion.sourceChunks || [], {
        maxItems: MAX_VISIBLE_SOURCES
      });
      nextQuestionText = ["", "Next Question:", nextQuestion.answerText].join("\n");
    }

    const finalAnswer = [
      isCorrect ? "Correct ✅" : "Incorrect ❌",
      "",
      `Your Answer: ${cleanAnswer}`,
      `Correct Answer: ${correctAnswer}`,
      "",
      `Explanation: ${pendingQuiz.explanation || "No explanation available."}`,
      nextQuestionText
    ]
      .filter(Boolean)
      .join("\n");

    await saveConversationTurn({
      conversationId,
      userId,
      question: incomingAnswer,
      answerText: finalAnswer,
      sourcesUsed: nextSources,
      fallbackReferences: []
    });

    await saveModeState(supabase, {
      userId,
      sessionId: conversationId || null,
      activeHook: nextHookConfig.hook_code,
      activeMode: nextHookConfig.mode,
      modeTitle: nextHookConfig.title,
      lastQuestion: incomingAnswer,
      lastAnswer: finalAnswer
    });

    return {
      handled: true,
      response: {
        success: true,
        engine: "TINA Continuous Learning Engine",
        mode: "ANSWER_CHECKED_AND_NEXT_READY",
        answer: finalAnswer,
        isCorrect,
        mastery,
        topic: pendingQuiz.topic || null,
        difficulty: pendingQuiz.difficulty || null,
        sourceStatus: nextSources.length
          ? "GDRIVE_GROUNDED_NEXT_QUESTION"
          : "GENERAL_NEXT_QUESTION",
        sourcesUsed: nextSources,
        sources: nextSources,
        vectorMatches: nextSources.length
      }
    };
  }

  async function handleLearningProgress({
    userId,
    conversationId,
    hookConfig,
    originalQuestion,
    saveMode = true
  }) {
    const profile = await getOrCreateLearnerProfile(supabase, userId);

    const weakTopics = Array.isArray(profile?.weak_topics)
      ? profile.weak_topics
      : [];
    const strongTopics = Array.isArray(profile?.strong_topics)
      ? profile.strong_topics
      : [];

    const answerText = profile
      ? [
          "Learning Progress",
          "",
          `Skill Level: ${profile.skill_level || "beginner"}`,
          `Learning Goal: ${profile.learning_goal || "CPALE"}`,
          `Total Questions: ${profile.total_questions || 0}`,
          `Correct Answers: ${profile.correct_answers || 0}`,
          `Accuracy Rate: ${Math.round(Number(profile.accuracy_rate || 0) * 100)}%`,
          `Last Reviewed Topic: ${profile.last_reviewed_topic || "None"}`,
          "",
          `Weak Topics: ${weakTopics.join(", ") || "None yet"}`,
          `Strong Topics: ${strongTopics.join(", ") || "None yet"}`
        ].join("\n")
      : "No learning profile found yet.";

    await saveConversationTurn({
      conversationId,
      userId,
      question: originalQuestion,
      answerText,
      sourcesUsed: [],
      fallbackReferences: []
    });

    if (saveMode) {
      await saveModeState(supabase, {
        userId,
        sessionId: conversationId || null,
        activeHook: hookConfig.hook_code,
        activeMode: hookConfig.mode,
        modeTitle: hookConfig.title,
        lastQuestion: originalQuestion,
        lastAnswer: answerText
      });
    }

    return {
      handled: true,
      response: {
        success: true,
        engine: "TINA Adaptive Learning Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: answerText,
        answerMode: "learning_progress",
        sourceStatus: "LEARNING_PROFILE_USED",
        sourcesUsed: [],
        sources: [],
        vectorMatches: 0
      }
    };
  }

  async function handleAssessmentCommand({
    userId,
    conversationId,
    hookConfig,
    cleanQuestion,
    originalQuestion
  }) {
    if (!isAssessmentMode(hookConfig.mode)) {
      return { handled: false };
    }

    const teachingText =
      hookConfig.mode === "TAX_REVIEWER"
        ? await buildReviewTeachingBlock(cleanQuestion)
        : "";

    const questionResult = await generateStoredAssessmentQuestion({
      userId,
      conversationId,
      hookConfig,
      requestedTopic: cleanQuestion,
      teachingText
    });

    if (!questionResult.ok) {
      return {
        handled: true,
        response: {
          success: false,
          engine: "TINA Continuous Learning Engine",
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          error: questionResult.error,
          rawQuiz: questionResult.rawQuiz || null,
          supabaseError: questionResult.supabaseError || null,
          answer:
            teachingText ||
            "TINA failed to generate the next stored multiple-choice question.",
          sourceStatus: "QUIZ_GENERATION_FAILED",
          sourcesUsed: [],
          sources: [],
          vectorMatches: 0
        }
      };
    }

    const quizSourcesUsed = finalizeSourcesForResponse(
      questionResult.sourceChunks || [],
      { maxItems: MAX_VISIBLE_SOURCES }
    );

    await saveConversationTurn({
      conversationId,
      userId,
      question: originalQuestion,
      answerText: questionResult.answerText,
      sourcesUsed: quizSourcesUsed,
      fallbackReferences: []
    });

    await saveModeState(supabase, {
      userId,
      sessionId: conversationId || null,
      activeHook: hookConfig.hook_code,
      activeMode: hookConfig.mode,
      modeTitle: hookConfig.title,
      lastQuestion: originalQuestion,
      lastAnswer: questionResult.answerText
    });

    return {
      handled: true,
      response: {
        success: true,
        engine: "TINA Continuous Learning Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: questionResult.answerText,
        answerMode:
          hookConfig.mode === "TAX_REVIEWER"
            ? "review_then_continuous_question_generated"
            : "continuous_question_generated",
        quizId: questionResult.storedQuiz.id,
        topic: questionResult.quiz.topic,
        difficulty: questionResult.quiz.difficulty,
        correctAnswerStored: Boolean(questionResult.storedQuiz.correct_answer),
        pendingAnswerStored: questionResult.storedQuiz.user_answer === null,
        confidence: quizSourcesUsed.length
          ? "GDRIVE_GROUNDED"
          : "GENERAL_ADAPTIVE",
        sourceStatus: quizSourcesUsed.length
          ? "GDRIVE_GROUNDED_QUESTION_READY"
          : "GENERAL_QUESTION_READY",
        sourcesUsed: quizSourcesUsed,
        sources: quizSourcesUsed,
        vectorMatches: quizSourcesUsed.length
      }
    };
  }

  function buildAssessmentLockedResponse(activeHook = "/quiz") {
    let lockedModeLabel = "quiz";
    let lockedModeMessage =
      "You are still in active quiz mode. Please answer using A, B, C, or D only. Type /bye or /exit to leave quiz mode.";

    if (activeHook === "/review") {
      lockedModeLabel = "review";
      lockedModeMessage =
        "You are still in active review mode. Please answer the current multiple-choice question using A, B, C, or D only. Type /bye or /exit to leave review mode.";
    } else if (activeHook === "/diagnostic") {
      lockedModeLabel = "diagnostic";
      lockedModeMessage =
        "You are still in active diagnostic mode. Please answer the current multiple-choice question using A, B, C, or D only. Type /bye or /exit to leave diagnostic mode.";
    }

    return {
      success: false,
      engine: "TINA Continuous Learning Engine",
      mode: "QUIZ_MODE_LOCKED",
      lockedMode: lockedModeLabel,
      answer: lockedModeMessage,
      sourceStatus: "QUIZ_MODE_LOCKED",
      sourcesUsed: [],
      sources: [],
      vectorMatches: 0
    };
  }

  return {
    isAssessmentHook,
    isAssessmentMode,
    fetchLatestPendingQuiz,
    clearPendingQuizAttempts,
    continueAssessmentLoop,
    handleAssessmentCommand,
    handleLearningProgress,
    buildAssessmentLockedResponse
  };
}
