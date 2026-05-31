// FILE: assessment-handler.js
"use strict";

/**
 * TINA Assessment Handler
 * Version: 4.0.0
 *
 * Uses context-orchestration-engine.js only for all OpenAI calls.
 */

import { saveModeState, getModeState } from "./mode-state.js";
import { generateQuizQuestion } from "./learning/quiz-engine.js";
import { selectNextSubtopic } from "./learning/question-bank-router.js";
import {
  buildQuestionSignature,
  hasRecentQuestionSignature,
  recordQuestionSignature
} from "./learning/session-engine.js";

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

import { safeParseQuizQuestion } from "./services/schema-validator.js";

import {
  callOpenAIWithOrchestration as defaultCallOpenAIWithOrchestration
} from "./context-orchestration-engine.js";

import {
  generateTraceId,
  startTrace,
  endTrace,
  flushObservability
} from "./services/observability-service.js";

const ENGINE_VERSION = "4.0.0";

function getModel(openaiModel = null) {
  return openaiModel || process.env.OPENAI_MODEL || "gpt-4o-mini";
}

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

function trimText(value = "", max = 1800) {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()} ...[trimmed]`;
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

function compactSourceChunk(chunk = {}) {
  return {
    title:
      chunk.title ||
      chunk.sourceTitle ||
      chunk.document_title ||
      chunk.metadata?.documentTitle ||
      chunk.metadata?.originalFileName ||
      chunk.originalSource ||
      chunk.original_source ||
      chunk.source ||
      "Quiz Source",

    authorityType:
      chunk.authorityType ||
      chunk.authority_type ||
      chunk.metadata?.authorityType ||
      "UNKNOWN",

    citation:
      chunk.citation ||
      chunk.reference ||
      chunk.normalizedReference ||
      chunk.normalized_reference ||
      chunk.metadata?.normalizedReference ||
      "",

    url:
      chunk.url ||
      chunk.driveViewUrl ||
      chunk.drive_view_url ||
      chunk.metadata?.driveViewUrl ||
      "",

    text: trimText(
      chunk.text ||
        chunk.content ||
        chunk.excerpt ||
        chunk.preview ||
        "",
      1200
    ),

    score:
      Number(
        chunk.finalScore ||
          chunk.final_score ||
          chunk.retrievalScore ||
          chunk.score ||
          chunk.similarity ||
          0
      ) || 0
  };
}

function compactQuizHistory(history = []) {
  return safeArray(history).slice(0, 8).map((item) => ({
    topic: item.topic || null,
    subtopic: item.subtopic || null,
    question: trimText(item.question || item.quiz_question || "", 280),
    correctAnswer: item.correct_answer || null,
    isCorrect: item.is_correct ?? null
  }));
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

function buildContextOrchestration(input = {}) {
  return {
    callOpenAIWithOrchestration:
      input?.callOpenAIWithOrchestration ||
      defaultCallOpenAIWithOrchestration
  };
}

function extractOpenAIText(result = {}) {
  return (
    result.answer ||
    result.text ||
    result.output_text ||
    result.completion?.choices?.[0]?.message?.content ||
    result.raw?.choices?.[0]?.message?.content ||
    ""
  ).trim();
}

export function createAssessmentHandler({
  supabase,
  openai,
  contextOrchestration = null,
  openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini"
}) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("createAssessmentHandler requires a valid Supabase client.");
  }

  if (!openai) {
    throw new Error("createAssessmentHandler requires a valid OpenAI client.");
  }

  const orchestration = buildContextOrchestration(contextOrchestration || {});
  const model = getModel(openaiModel);

  async function callAssessmentOpenAI({
    userQuery = "",
    systemPrompt = "",
    masterPrompt = "",
    retrievedSources = [],
    classification = {},
    intent = {},
    conversationHistory = [],
    quizMode = false,
    adaptiveContext = {},
    _traceId = undefined
  }) {
    const result = await orchestration.callOpenAIWithOrchestration({
      openai,
      userQuery,
      systemPrompt,
      masterPrompt,
      retrievedSources: safeArray(retrievedSources).map(compactSourceChunk),
      classification,
      intent,
      conversationHistory: safeArray(conversationHistory).slice(-6),
      model,
      quizMode,
      adaptiveContext,
      _traceId
    });

    return extractOpenAIText(result);
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

    return await callAssessmentOpenAI({
      userQuery: `Teach this CPALE taxation topic briefly and clearly: ${cleanTopic}`,
      systemPrompt: `
You are TINA, a CPALE taxation reviewer.

Rules:
- Philippine taxation context only.
- Be concise, useful, and exam-oriented.
- Do not write a long memo.
- Do not create a practice question in this block.
- Do not ask for a free-text answer.
- Use compact reviewer format only.
`.trim(),
      masterPrompt: `
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
`.trim(),
      retrievedSources: [],
      classification: {
        primaryIssue: "REVIEWER",
        subIssue: "CPALE_REVIEW",
        retrievalStrategy: "NO_RETRIEVAL_TEACHING_BLOCK",
        targetAuthorities: []
      },
      intent: {
        intent: "TAX_REVIEW_TEACHING",
        requiresSimpleDefinition: true,
        requiresLegalAnalysis: false,
        requiresRiskAnalysis: false,
        requiresFactPatternAnalysis: false
      }
    });
  }

  async function generateStoredAssessmentQuestion({
    userId,
    conversationId,
    hookConfig,
    requestedTopic,
    teachingText = ""
  }) {
    let quizProfile;
    try {
      quizProfile = await getAdaptiveQuizProfile(supabase, userId, requestedTopic);
    } catch (profileErr) {
      console.error("[QUIZ PROFILE] getAdaptiveQuizProfile failed:", profileErr?.message);
      quizProfile = {
        profile: null,
        topic: requestedTopic || "VAT",
        subtopic: "",
        difficulty: 1
      };
    }

    let recentHistory = [];
    try {
      recentHistory = await getRecentQuizHistory(supabase, {
        userId,
        topic: quizProfile.topic,
        limit: 20
      });
    } catch (histErr) {
      console.error("[QUIZ HISTORY] getRecentQuizHistory failed:", histErr?.message);
    }

    const exclusions = buildQuizExclusionFromHistory(recentHistory);

    // BUG-043: Wrap source retrieval in a 5-second timeout.
    // The metadata JSON ilike queries in smartSearch cause Postgres statement
    // timeouts (code 57014). If retrieval fails, quiz generation continues with
    // an empty source list — topic context is sufficient for quiz generation.
    let sourceChunks = [];
    try {
      sourceChunks = await Promise.race([
        getQuizSourceChunks({
          topic: quizProfile.topic,
          excludeSourcePaths: safeArray(exclusions.excludeSourcePaths),
          excludeChunkIds: safeArray(exclusions.excludeChunkIds),
          limit: 3
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(Object.assign(new Error("Quiz source retrieval timed out"), { code: "QUIZ_SOURCE_TIMEOUT" })),
            5000
          )
        )
      ]);
    } catch (sourceErr) {
      console.error("[QUIZ SOURCE] Retrieval failed — continuing with topic-only quiz:", {
        message: sourceErr?.message,
        code: sourceErr?.code,
        topic: quizProfile.topic
      });
      sourceChunks = [];
    }

    const compactSources = safeArray(sourceChunks).map(compactSourceChunk);
    const compactHistory = compactQuizHistory(recentHistory);

    const quizPrompt = buildAdaptiveQuizPrompt({
      topic: quizProfile.topic,
      difficulty: quizProfile.difficulty,
      profile: quizProfile.profile,
      sourceChunks: compactSources,
      recentQuestions: compactHistory,
      excludeQuestionFingerprints: safeArray(exclusions.excludeQuestionFingerprints)
    });

    const rawQuiz = await callAssessmentOpenAI({
      userQuery: quizPrompt,
      systemPrompt: `
You are TINA's CPALE Philippine Tax Quiz Generator.

Generate exactly one multiple-choice question in valid JSON only.
No markdown.
No explanations outside JSON.
Use the compact source excerpts only when available.
Avoid repeating recent questions.
Do not include raw source text or debug data.
`.trim(),
      masterPrompt: `
Required JSON shape:
{
  "topic": "string",
  "subtopic": "string",
  "difficulty": "easy|moderate|hard",
  "question": "string",
  "choices": {
    "A": "string",
    "B": "string",
    "C": "string",
    "D": "string"
  },
  "correctAnswer": "A|B|C|D",
  "explanation": "string"
}
`.trim(),
      retrievedSources: compactSources,
      classification: {
        primaryIssue: "QUIZ",
        subIssue: "CPALE_TAX_QUESTION",
        retrievalStrategy: "COMPACT_SOURCE_GROUNDED_QUIZ",
        targetAuthorities: compactSources.map((s) => s.authorityType).filter(Boolean)
      },
      intent: {
        intent: "GENERATE_MULTIPLE_CHOICE_TAX_QUIZ",
        requiresSimpleDefinition: false,
        requiresLegalAnalysis: false,
        requiresRiskAnalysis: false,
        requiresFactPatternAnalysis: false,
        requiresEvidenceEvaluation: false
      },
      quizMode: true,
      adaptiveContext: { activeHook: "/quiz", quizMode: true, orchestrationMode: "QUIZ" }
    });

    const quiz = safeParseQuizJson(rawQuiz);

    if (!quiz) {
      return {
        ok: false,
        error: "Unable to generate valid multiple-choice question JSON.",
        sourceChunks: compactSources
      };
    }

    // Validate shape before writing to Supabase
    const quizValidation = safeParseQuizQuestion(quiz);
    if (!quizValidation.ok) {
      console.error(
        "[ASSESSMENT] Quiz schema invalid after parse:",
        quizValidation.error?.issues
          ?.map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
          .join("; ")
      );
      return {
        ok: false,
        error: "Quiz shape validation failed.",
        sourceChunks: compactSources
      };
    }

    let storedQuiz = null;
    try {
      storedQuiz = await Promise.race([
        storeUnansweredQuiz(supabase, {
          userId,
          sessionId: conversationId || null,
          quiz,
          mode: hookConfig.mode,
          sourceChunks: compactSources
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(Object.assign(new Error("storeUnansweredQuiz timed out"), { code: "QUIZ_STORE_TIMEOUT" })),
            5000
          )
        )
      ]);
    } catch (storeErr) {
      console.error("[QUIZ STORE] storeUnansweredQuiz failed — returning untracked quiz:", {
        message: storeErr?.message,
        code: storeErr?.code
      });
      storedQuiz = null;
    }

    // Even if storage failed, return the quiz text so the user sees the question.
    // Answers can't be tracked for this question, but that is better than an error.
    const answerText = formatQuestionBlock({
      quiz,
      storedQuiz: storedQuiz || { id: null, correct_answer: quiz.correctAnswer },
      teachingText
    });

    return {
      ok: true,
      quiz,
      storedQuiz: storedQuiz || { id: null, correct_answer: quiz.correctAnswer },
      sourceChunks: compactSources,
      answerText,
      saveFailed: !storedQuiz || Boolean(storedQuiz?.saveFailed)
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
          vectorMatches: 0,
          contextOrchestrationEnabled: true
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
          vectorMatches: 0,
          contextOrchestrationEnabled: true
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
          vectorMatches: 0,
          contextOrchestrationEnabled: true
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

    // Split stored explanation (strip any trailing CPALE Trap line)
    const rawExplanation = String(pendingQuiz.explanation || "No explanation available.");
    const cleanExplanation = rawExplanation.split(/\nCPALE Trap:/i)[0].trim();

    const correctAnswerText = pendingQuiz.source_metadata?.correctAnswerText || "";
    const answerDisplay = correctAnswerText
      ? `${correctAnswer}. ${correctAnswerText}`
      : correctAnswer;

    // ── /quiz mode: use quiz-engine for next question + clean result format ──
    if (nextHookConfig.hook_code === "/quiz") {
      // Load session state so subtopic rotation and score tracking are correct
      let sessionLearning = {
        domain: pendingQuiz.topic || "VAT",
        mode: "QUIZ",
        subtopic: pendingQuiz.subtopic || null,
        coveredSubtopics: [],
        askedQuestionIds: [],
        score: { correct: 0, total: 0 },
        weakSubtopics: [],
        weakSubtopicSchedule: {},      // preserved across answer cycles — spaced reinforcement
        askedQuestionSignatures: [],   // preserved across answer cycles — dedup ring buffer
        currentQuestionId: null,
        pendingAnswer: null
      };

      try {
        const modeState = await getModeState(supabase, userId, conversationId || null);
        const stored = modeState?.adaptive_context?.learning;
        if (stored && stored.domain) {
          sessionLearning = {
            domain: stored.domain || pendingQuiz.topic || "VAT",
            mode: "QUIZ",
            subtopic: stored.subtopic || pendingQuiz.subtopic || null,
            coveredSubtopics: safeArray(stored.coveredSubtopics),
            askedQuestionIds: safeArray(stored.askedQuestionIds),
            score: stored.score || { correct: 0, total: 0 },
            weakSubtopics: safeArray(stored.weakSubtopics),
            weakSubtopicSchedule: safeObject(stored.weakSubtopicSchedule),     // Blocker A fix
            askedQuestionSignatures: safeArray(stored.askedQuestionSignatures), // Blocker A fix
            currentQuestionId: stored.currentQuestionId || null,
            pendingAnswer: null
          };
        }
      } catch {
        // non-fatal — use defaults above
      }

      const domain = sessionLearning.domain;
      const currentSubtopic = pendingQuiz.subtopic || sessionLearning.subtopic || "";

      // Update score
      const updatedScore = {
        correct: (sessionLearning.score?.correct || 0) + (isCorrect ? 1 : 0),
        total: (sessionLearning.score?.total || 0) + 1
      };

      // Update weak subtopics
      const updatedWeakSubtopics = isCorrect
        ? sessionLearning.weakSubtopics.filter((s) => s !== currentSubtopic)
        : [...new Set([...sessionLearning.weakSubtopics, currentSubtopic])];

      // ── Spaced reinforcement schedule ────────────────────────────────────────
      // Track when each subtopic was answered incorrectly.  When selecting the
      // next subtopic, we exclude subtopics scheduled within the last 7 questions
      // so the student sees different content before the weak concept re-appears.
      const _existingSchedule = safeObject(sessionLearning.weakSubtopicSchedule);
      let _updatedSchedule = { ..._existingSchedule };
      if (!isCorrect && currentSubtopic && _updatedSchedule[currentSubtopic] == null) {
        _updatedSchedule[currentSubtopic] = updatedScore.total;
        console.log("[QUIZ_WEAK_CONCEPT_SCHEDULED]", {
          domain,
          subtopic:     currentSubtopic,
          scheduledAt:  updatedScore.total,
          revisitAfter: updatedScore.total + 7
        });
      } else if (isCorrect && currentSubtopic) {
        delete _updatedSchedule[currentSubtopic]; // mastered — clear spaced schedule
      }

      const scoredLearning = {
        ...sessionLearning,
        score: updatedScore,
        weakSubtopics: updatedWeakSubtopics,
        weakSubtopicSchedule: _updatedSchedule
      };

      // Spaced reinforcement: on incorrect answer, pick a DIFFERENT subtopic now
      // and let the scheduler re-introduce the weak subtopic after ≥7 questions.
      // On correct answer, rotate normally (weak subtopics that have matured are
      // still prioritized by selectNextSubtopic via the weakSubtopics array).
      const _currentTotal = updatedScore.total;
      const _matureWeak = updatedWeakSubtopics.filter(s => {
        const _at = _updatedSchedule[s];
        return _at == null || _currentTotal >= _at + 7;
      });
      const _selectionLearning = {
        ...scoredLearning,
        weakSubtopics:    _matureWeak,
        // On incorrect: temporarily mark currentSubtopic as recently-covered so
        // selectNextSubtopic skips it for this round without persisting the change.
        coveredSubtopics: !isCorrect
          ? [...safeArray(scoredLearning.coveredSubtopics), currentSubtopic]
          : safeArray(scoredLearning.coveredSubtopics)
      };
      const nextSubtopic = selectNextSubtopic(domain, _selectionLearning) || currentSubtopic;
      // ── End spaced reinforcement ──────────────────────────────────────────────

      // Generate next quiz question via quiz-engine
      const _quizNextTraceId = generateTraceId();
      startTrace({ traceId: _quizNextTraceId, name: "tina-quiz-answer", hook: "/quiz", metadata: { domain, isCorrect } });
      const _tracedQuizCall = (params) => callAssessmentOpenAI({ ...params, _traceId: _quizNextTraceId });
      let nextQuizResult = null;
      try {
        nextQuizResult = await generateQuizQuestion({
          domain,
          subtopic: nextSubtopic,
          sessionLearning: { ...scoredLearning, subtopic: nextSubtopic },
          userId,
          conversationId,
          hookConfig: nextHookConfig,
          callOpenAI: _tracedQuizCall,
          supabase,
          persist: false  // all candidates preview-only; winner stored after dedup selection
        });
      } catch (err) {
        console.error("[ASSESSMENT] Quiz next question generation failed:", err?.message);
      }
      console.warn("[QUIZ_NEXT_RESULT_DIAGNOSTIC]", {
        topic:                 domain,
        subtopic:              nextSubtopic,
        selectedNextSubtopic:  nextSubtopic,
        isCorrect,
        conversationIdPresent: Boolean(conversationId),
        userIdPresent:         Boolean(userId),
        resultPresent:         Boolean(nextQuizResult),
        ok:                    Boolean(nextQuizResult?.ok),
        noSource:              Boolean(nextQuizResult?.noSource),
        saveFailed:            Boolean(nextQuizResult?.saveFailed),
        hasQuestion:           Boolean(nextQuizResult?.quiz?.question),
        hasAnswer:             Boolean(nextQuizResult?.quiz?.correctAnswer),
        hasExplanation:        Boolean(nextQuizResult?.quiz?.explanation),
        hasAnswerText:         Boolean(nextQuizResult?.answerText),
        sourceChunkCount:      safeArray(nextQuizResult?.sourceChunks).length,
        previewOnly:           Boolean(nextQuizResult?.storedQuiz?.previewOnly),
        error:                 nextQuizResult?.error || null,
        resultKeys:            nextQuizResult ? Object.keys(nextQuizResult) : []
      });
      endTrace({ traceId: _quizNextTraceId, metadata: { domain, isCorrect, nextSubtopic } });
      flushObservability().catch(() => {});

      // ── Hard dedup + atomic store for the next question ─────────────────────
      // All candidates are generated with persist:false — nothing written to DB yet.
      // Dedup selection picks the winner; exactly one store follows.
      const _sessionSigs = safeArray(sessionLearning.askedQuestionSignatures);
      if (nextQuizResult?.ok) {
        const _nextSig = buildQuestionSignature(nextQuizResult.quiz?.question, domain, "QUIZ");
        if (hasRecentQuestionSignature(_sessionSigs, _nextSig)) {
          console.log("[QUIZ_DEDUP_HIT]", {
            domain, subtopic: nextSubtopic, sig: _nextSig.slice(0, 12), context: "after_answer"
          });
          try {
            const _dedupRetry = await generateQuizQuestion({
              domain,
              subtopic: nextSubtopic,
              sessionLearning: { ...scoredLearning, subtopic: nextSubtopic },
              userId,
              conversationId,
              hookConfig: nextHookConfig,
              callOpenAI: _tracedQuizCall,
              supabase,
              persist: false  // preview-only candidate
            });
            if (_dedupRetry?.ok) {
              const _retrySig = buildQuestionSignature(_dedupRetry.quiz?.question, domain, "QUIZ");
              if (!hasRecentQuestionSignature(_sessionSigs, _retrySig)) {
                nextQuizResult = _dedupRetry;  // swap to winner; store unconditionally below
              }
            }
          } catch (_dErr) {
            console.warn("[QUIZ_DEDUP_RETRY] after-answer retry failed (non-fatal):", _dErr?.message);
          }
        }

        // Store exactly one DB row for the final selected question.
        // Nothing has been written yet (initial + retry calls both used persist:false).
        let _storedNext = null;
        try {
          _storedNext = await storeUnansweredQuiz(supabase, {
            userId,
            sessionId: conversationId || null,
            quiz: nextQuizResult.quiz,
            mode: nextHookConfig?.mode || "QUIZ_MASTER",
            sourceChunks: nextQuizResult.sourceChunks || []
          });
        } catch (_sErr) {
          console.warn("[QUIZ_DEDUP] store winner failed (non-fatal):", _sErr?.message);
        }
        if (_storedNext && !_storedNext.saveFailed) {
          nextQuizResult = { ...nextQuizResult, storedQuiz: _storedNext, saveFailed: false };
        } else {
          // Store failed — mark so downstream can omit question or show fallback.
          nextQuizResult = { ...nextQuizResult, saveFailed: true };
          console.warn("[QUIZ_DEDUP] next question store failed; question will not be presented as answerable");
        }
      }
      // ── End dedup + atomic store ───────────────────────────────────────────────

      console.warn("[QUIZ_NEXT_RESULT_POST_STORE]", {
        topic:             domain,
        subtopic:          nextSubtopic,
        ok:                Boolean(nextQuizResult?.ok),
        noSource:          Boolean(nextQuizResult?.noSource),
        storeAttempted:    Boolean(nextQuizResult?.ok),
        storeSucceeded:    Boolean(nextQuizResult?.ok) && !Boolean(nextQuizResult?.saveFailed),
        saveFailed:        Boolean(nextQuizResult?.saveFailed),
        storedQuizId:      nextQuizResult?.storedQuiz?.id || null,
        storedQuizPreview: Boolean(nextQuizResult?.storedQuiz?.previewOnly),
        error:             nextQuizResult?.error || null
      });

      let nextQuestionText = "\nNext question could not be generated. Type /quiz to continue.";

      if (nextQuizResult?.ok && !nextQuizResult.saveFailed) {
        const storedId = nextQuizResult.storedQuiz?.id || null;
        const _nextFinalSig = buildQuestionSignature(nextQuizResult.quiz?.question, domain, "QUIZ");
        const finalLearning = {
          ...scoredLearning,
          subtopic: nextSubtopic,
          coveredSubtopics: scoredLearning.coveredSubtopics.includes(nextSubtopic)
            ? scoredLearning.coveredSubtopics
            : [...scoredLearning.coveredSubtopics, nextSubtopic],
          askedQuestionIds: storedId
            ? [...scoredLearning.askedQuestionIds.slice(-49), String(storedId)]
            : scoredLearning.askedQuestionIds,
          currentQuestionId: storedId,
          askedQuestionSignatures: recordQuestionSignature(_sessionSigs, _nextFinalSig)
        };

        try {
          await saveModeState(supabase, {
            userId,
            sessionId: conversationId || null,
            activeHook: nextHookConfig.hook_code,
            activeMode: nextHookConfig.mode,
            modeTitle: nextHookConfig.title,
            lastQuestion: incomingAnswer,
            lastAnswer: "",
            adaptiveContext: { learning: finalLearning }
          });
        } catch {
          // non-fatal
        }

        nextQuestionText = ["", "---", "", "## Next Question", "", nextQuizResult.answerText].join("\n");
      }

      const resultParts = [
        "## Result",
        isCorrect ? "Correct ✅" : "Incorrect ❌",
        "",
        "## Correct Answer",
        answerDisplay,
        "",
        "## Explanation",
        cleanExplanation,
        nextQuestionText
      ];

      const finalAnswer = resultParts
        .filter((line) => line !== null && line !== undefined)
        .join("\n");

      await saveConversationTurn({
        conversationId,
        userId,
        question: incomingAnswer,
        answerText: finalAnswer,
        sourcesUsed: [],
        fallbackReferences: []
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
          sourceStatus: "QUIZ_GROUNDED",
          sourcesUsed: [],
          sources: [],
          sourceCards: [],
          vectorMatches: 0,
          contextOrchestrationEnabled: true,
          directOpenAICallDisabled: true
        }
      };
    }

    // ── /diagnostic (and other modes): existing behavior with full result detail ──
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
      nextQuestionText = ["", "---", "**Next Question:**", "", nextQuestion.answerText].join("\n");
    }

    const cpaleTrap = pendingQuiz.source_metadata?.cpaleTrap || null;
    const choices = pendingQuiz.choices || {};

    const wrongChoiceLines = ["A", "B", "C", "D"]
      .filter((l) => l !== correctAnswer)
      .map((l) => {
        const choiceText = choices[l];
        return choiceText ? `**${l}.** ${choiceText} — Incorrect.` : null;
      })
      .filter(Boolean);

    const resultParts = [
      "## Result",
      isCorrect ? "Correct ✅" : "Incorrect ❌",
      "",
      "## Correct Answer",
      answerDisplay,
      "",
      "## Explanation",
      cleanExplanation
    ];

    if (cpaleTrap) {
      resultParts.push("", "## Reviewer Trap", cpaleTrap);
    }

    if (wrongChoiceLines.length) {
      resultParts.push("", "## Why the Other Choices Are Wrong", ...wrongChoiceLines);
    }

    resultParts.push(nextQuestionText);

    const finalAnswer = resultParts
      .filter((line) => line !== null && line !== undefined)
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
        vectorMatches: nextSources.length,
        contextOrchestrationEnabled: true,
        directOpenAICallDisabled: true
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

    const lastUpdated = profile?.updated_at
      ? new Date(profile.updated_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
      : "Unknown";

    const answerText = profile
      ? [
          "Learning Progress",
          "",
          `Skill Level: ${profile.skill_level || "beginner"}`,
          `Learning Goal: ${profile.learning_goal || "CPALE"}`,
          `Preferred Style: ${profile.preferred_style || "reviewer"}`,
          `Total Questions: ${profile.total_questions || 0}`,
          `Correct Answers: ${profile.correct_answers || 0}`,
          `Accuracy Rate: ${Math.round(Number(profile.accuracy_rate || 0) * 100)}%`,
          `Last Reviewed Topic: ${profile.last_reviewed_topic || "None"}`,
          `Last Updated: ${lastUpdated}`,
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
        vectorMatches: 0,
        contextOrchestrationEnabled: true,
        directOpenAICallDisabled: true
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

    let questionResult;
    try {
      questionResult = await generateStoredAssessmentQuestion({
        userId,
        conversationId,
        hookConfig,
        requestedTopic: cleanQuestion,
        teachingText
      });
    } catch (genError) {
      console.error("ASSESSMENT GENERATION ERROR:", {
        message: genError?.message,
        stack: genError?.stack,
        code: genError?.code,
        details: genError?.details,
        hint: genError?.hint,
        topic: cleanQuestion,
        hookCode: hookConfig.hook_code,
        mode: hookConfig.mode
      });

      return {
        handled: true,
        response: {
          success: false,
          engine: "TINA Continuous Learning Engine",
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          error: genError?.message || "Assessment generation failed",
          answer:
            teachingText ||
            `TINA encountered an error generating the quiz question for "${cleanQuestion || "the requested topic"}". Please try again.`,
          sourceStatus: "QUIZ_GENERATION_ERROR",
          sourcesUsed: [],
          sources: [],
          vectorMatches: 0,
          contextOrchestrationEnabled: true,
          directOpenAICallDisabled: true
        }
      };
    }

    if (!questionResult.ok) {
      console.error("ASSESSMENT GENERATION ERROR:", {
        message: questionResult.error,
        code: questionResult.supabaseError?.code,
        details: questionResult.supabaseError?.message,
        hint: questionResult.supabaseError?.hint,
        topic: cleanQuestion,
        hookCode: hookConfig.hook_code,
        mode: hookConfig.mode
      });

      return {
        handled: true,
        response: {
          success: false,
          engine: "TINA Continuous Learning Engine",
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          error: questionResult.error,
          supabaseError: questionResult.supabaseError || null,
          answer:
            teachingText ||
            `TINA could not generate a quiz question for "${cleanQuestion || "the requested topic"}". Please try again or pick a different topic.`,
          sourceStatus: "QUIZ_GENERATION_FAILED",
          sourcesUsed: [],
          sources: [],
          vectorMatches: 0,
          contextOrchestrationEnabled: true,
          directOpenAICallDisabled: true
        }
      };
    }

    const quizSourcesUsed = finalizeSourcesForResponse(
      questionResult.sourceChunks || [],
      { maxItems: MAX_VISIBLE_SOURCES }
    );

    try {
      await saveConversationTurn({
        conversationId,
        userId,
        question: originalQuestion,
        answerText: questionResult.answerText,
        sourcesUsed: quizSourcesUsed,
        fallbackReferences: []
      });
    } catch (saveErr) {
      console.error("[QUIZ] saveConversationTurn failed (non-fatal):", saveErr?.message);
    }

    try {
      await saveModeState(supabase, {
        userId,
        sessionId: conversationId || null,
        activeHook: hookConfig.hook_code,
        activeMode: hookConfig.mode,
        modeTitle: hookConfig.title,
        lastQuestion: originalQuestion,
        lastAnswer: questionResult.answerText
      });
    } catch (modeErr) {
      console.error("[QUIZ] saveModeState failed (non-fatal):", modeErr?.message);
    }

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
        sourceCards: quizSourcesUsed,
        vectorMatches: quizSourcesUsed.length,
        contextOrchestrationEnabled: true,
        directOpenAICallDisabled: true
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
      vectorMatches: 0,
      contextOrchestrationEnabled: true,
      directOpenAICallDisabled: true
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

export function assessmentHandlerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ASSESSMENT_HANDLER",
    version: ENGINE_VERSION,
    contextOrchestrationCompatible: true,
    usesOrchestrationOnly: true,
    directOpenAICallPrevented: true,
    compactQuizSourcesEnabled: true,
    rawQuizLeakagePrevented: true,
    oversizedPromptProtectionEnabled: true
  };
}

export default {
  createAssessmentHandler,
  assessmentHandlerHealthCheck
};
