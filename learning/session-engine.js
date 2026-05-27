// FILE: learning/session-engine.js
"use strict";

import { createHash } from "crypto";

/**
 * TINA Learning Session Engine
 *
 * Entry point for /quiz and /review commands.
 * Intercepts before issue classification and legal RAG flow.
 * Routes to quiz-engine.js or review-engine.js.
 *
 * Required flow:
 * ask-handler.js
 *   → parseLearningCommand()
 *   → session-engine.js (handleLearningCommand)
 *     → question-bank-router.js (selectNextSubtopic)
 *     → quiz-engine.js OR review-engine.js
 *   → response formatter
 */

import { saveModeState, getModeState } from "../mode-state.js";
import { saveMessage } from "../conversation-memory.js";
import {
  getOrCreateLearnerProfile,
  updateLearnerProfileStats,
  updateTopicMastery
} from "../learner-profile.js";
import {
  callOpenAIWithOrchestration as defaultCallOpenAI
} from "../context-orchestration-engine.js";
import { finalizeSourcesForResponse, extractQuizAnswer } from "../ask-helpers.js";
import {
  normalizeTaxDomain,
  resolveTaxDomain,
  buildDomainMenuText,
  getDomainConfig,
  getDomainSubtopics
} from "./domain-normalizer.js";
import { selectNextSubtopic } from "./question-bank-router.js";
import { generateQuizQuestion } from "./quiz-engine.js";
import { storeUnansweredQuiz } from "../adaptive-quiz.js";
import { generateReviewMaterial, splitReviewContent } from "./review-engine.js";
import {
  generateTraceId,
  startTrace,
  endTrace,
  flushObservability
} from "../services/observability-service.js";

const ENGINE_VERSION = "1.0.0";
const MAX_VISIBLE_SOURCES = 5;

// ─── helpers ──────────────────────────────────────────────────────────────────

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

// Extracts and hashes the ## Mini Question section to detect repeated questions.
// Returns a 16-char hex string, or null if no mini question section is found.
function hashMiniQuestion(text = "") {
  const marker = "\n## Mini Question";
  const idx = String(text || "").indexOf(marker);
  if (idx === -1) return null;
  const raw = text.slice(idx + marker.length).trim();
  const normalized = raw.replace(/\s+/g, " ").trim().slice(0, 300);
  if (!normalized.length) return null;
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

// ─── quiz / review dedup helpers ─────────────────────────────────────────────
//
// These are exported so assessment-handler.js can apply the same hard dedup
// when generating the next question after an answer is submitted.

// Stable canonical form: lowercase, strip punctuation, collapse whitespace, cap length.
// Two questions that are the same topic phrased identically will produce the same output.
export function normalizeQuestionText(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

// 24-char hex sha256 signature keyed on domain + mode + normalized question text.
// Stable across sessions for the same user + domain pair.
export function buildQuestionSignature(questionText = "", domain = "", mode = "QUIZ") {
  const input = `${String(domain)}::${String(mode)}::${normalizeQuestionText(questionText)}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 24);
}

// Returns true when sig appears anywhere in the recent signature ring buffer.
export function hasRecentQuestionSignature(signatures = [], sig = "") {
  return safeArray(signatures).includes(sig);
}

// Appends sig to the ring buffer, trimming oldest entries beyond limit.
export function recordQuestionSignature(signatures = [], sig = "", limit = 50) {
  const next = [...safeArray(signatures), sig];
  return next.length > limit ? next.slice(-limit) : next;
}

// Returns true when a scheduled weak subtopic has "matured" — enough new questions
// have been answered since it was marked wrong to warrant re-introduction.
export function shouldRevisitWeakConcept(weakSubtopicSchedule = {}, subtopic = "", currentTotal = 0) {
  if (!subtopic) return false;
  const scheduledAt = safeObject(weakSubtopicSchedule)[subtopic];
  if (scheduledAt == null) return false;
  return currentTotal >= scheduledAt + 7;
}

// ─── session learning state (stored in adaptive_context.learning) ─────────────

function emptyLearningState(domain = "", mode = "QUIZ") {
  return {
    domain,
    mode,
    subtopic: null,
    coveredSubtopics: [],
    askedQuestionIds: [],
    score: { correct: 0, total: 0 },
    weakSubtopics: [],
    weakSubtopicSchedule: {},    // {subtopicKey: score.total at time of wrong answer}
    askedQuestionSignatures: [], // [24-char sha256 hex, ...] hard-dedup ring buffer (last 50)
    currentQuestionId: null,
    sessionStartedAt: new Date().toISOString(),
    reviewHistory: {
      seenChunkIds: [],
      seenSourcePaths: [],
      seenQuestionHashes: [],
      lastSubtopic: null
    }
  };
}

function readLearningState(adaptiveContext = {}, domain = "", mode = "QUIZ") {
  const stored = adaptiveContext?.learning || null;

  if (stored && stored.domain === domain && stored.mode === mode) {
    return { ...emptyLearningState(domain, mode), ...stored };
  }

  return emptyLearningState(domain, mode);
}

async function saveLearningState({ supabase, userId, conversationId, hookConfig, sessionLearning }) {
  try {
    await saveModeState(supabase, {
      userId,
      sessionId: conversationId || null,
      activeHook: hookConfig.hook_code,
      activeMode: hookConfig.mode,
      modeTitle: hookConfig.title,
      lastQuestion: hookConfig.originalQuestion || "",
      lastAnswer: "",
      adaptiveContext: { learning: sessionLearning },
      modeMetadata: { learningEngineVersion: ENGINE_VERSION }
    });
  } catch (err) {
    console.error("[SESSION ENGINE] saveLearningState failed (non-fatal):", err?.message);
  }
}

function updateLearningStateAfterQuestion({ sessionLearning, subtopic, storedQuizId }) {
  const updated = { ...sessionLearning };

  updated.subtopic = subtopic;

  if (!updated.coveredSubtopics.includes(subtopic)) {
    updated.coveredSubtopics = [...updated.coveredSubtopics, subtopic];
  }

  if (storedQuizId && !updated.askedQuestionIds.includes(String(storedQuizId))) {
    updated.askedQuestionIds = [...updated.askedQuestionIds.slice(-49), String(storedQuizId)];
  }

  updated.currentQuestionId = storedQuizId || null;

  return updated;
}

function updateLearningStateAfterAnswer({ sessionLearning, subtopic, isCorrect }) {
  const updated = { ...sessionLearning };

  updated.score = {
    correct: (updated.score?.correct || 0) + (isCorrect ? 1 : 0),
    total: (updated.score?.total || 0) + 1
  };

  if (!isCorrect) {
    if (!updated.weakSubtopics.includes(subtopic)) {
      updated.weakSubtopics = [...updated.weakSubtopics, subtopic];
    }
    // Spaced reinforcement: record the score.total at the time of wrong answer.
    // assessment-handler.js uses this to skip re-introducing the subtopic for
    // ~7 questions, then allows it back in with a potentially different wording.
    const schedule = safeObject(updated.weakSubtopicSchedule);
    if (schedule[subtopic] == null) {
      updated.weakSubtopicSchedule = { ...schedule, [subtopic]: updated.score.total };
    }
  } else {
    updated.weakSubtopics = updated.weakSubtopics.filter((s) => s !== subtopic);
    // Clear the spaced schedule when the concept is answered correctly.
    const schedule = safeObject(updated.weakSubtopicSchedule);
    if (schedule[subtopic] != null) {
      const cleared = { ...schedule };
      delete cleared[subtopic];
      updated.weakSubtopicSchedule = cleared;
    }
  }

  return updated;
}

// ─── parseLearningCommand ────────────────────────────────────────────────────

export function parseLearningCommand(rawQuestion = "", hookCode = "") {
  const text = normalizeText(rawQuestion);
  const hook = String(hookCode || "").toLowerCase();

  if (hook !== "/quiz" && hook !== "/review") {
    return { isLearningCommand: false, domain: null, mode: null };
  }

  if (!text) {
    return { isLearningCommand: true, domain: null, mode: hook === "/review" ? "REVIEW" : "QUIZ" };
  }

  // Strip the hook from the front if present
  const stripped = text.replace(/^\/(quiz|review)\s*/i, "").trim();
  const mode = hook === "/review" ? "REVIEW" : "QUIZ";

  if (!stripped) {
    return { isLearningCommand: true, domain: null, domainText: null, mode };
  }

  const resolution = resolveTaxDomain(stripped);

  return {
    isLearningCommand: true,
    domain: resolution.ok ? resolution.domainKey : null,
    domainText: stripped,
    mode,
    resolution
  };
}

// ─── factory ─────────────────────────────────────────────────────────────────

export function createLearningHandler({
  supabase,
  openai,
  contextOrchestration = null,
  openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini"
}) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("createLearningHandler requires a valid Supabase client.");
  }

  if (!openai) throw new Error("createLearningHandler requires a valid OpenAI client.");

  const callOpenAI = contextOrchestration?.callOpenAIWithOrchestration || defaultCallOpenAI;

  function extractText(result = {}) {
    return (
      result.answer || result.text || result.output_text ||
      result.completion?.choices?.[0]?.message?.content ||
      result.raw?.choices?.[0]?.message?.content || ""
    ).trim();
  }

  async function callAssessmentOpenAI(params) {
    const result = await callOpenAI({ openai, model: openaiModel, ...params });
    return extractText(result);
  }

  async function saveConversationTurn({ conversationId, userId, question, answerText, sourcesUsed = [] }) {
    if (!conversationId || !userId) return;
    try {
      await saveMessage(supabase, { conversationId, userId, role: "user", content: question });
      await saveMessage(supabase, { conversationId, userId, role: "assistant", content: answerText, sourcesUsed });
    } catch (err) {
      console.error("[SESSION ENGINE] saveConversationTurn failed (non-fatal):", err?.message);
    }
  }

  // ── domain menu response ────────────────────────────────────────────────────

  function buildDomainMenuResponse(hookCode = "/quiz") {
    return {
      handled: true,
      response: {
        success: true,
        engine: "TINA Learning System",
        version: ENGINE_VERSION,
        hook: hookCode,
        mode: hookCode === "/review" ? "TAX_REVIEWER" : "QUIZ_MASTER",
        answer: buildDomainMenuText(hookCode),
        answerMode: "domain_menu",
        sourceStatus: "DOMAIN_SELECTION_REQUIRED",
        sources: [],
        sourcesUsed: [],
        sourceCards: [],
        vectorMatches: 0,
        learningSystemVersion: ENGINE_VERSION
      }
    };
  }

  // ── unknown domain response ─────────────────────────────────────────────────

  function buildUnknownDomainResponse(hookCode = "/quiz", domainText = "") {
    const menu = buildDomainMenuText(hookCode);
    const answer = [
      `"${domainText}" is not a recognized tax domain.`,
      "",
      menu
    ].join("\n");

    return {
      handled: true,
      response: {
        success: true,
        engine: "TINA Learning System",
        version: ENGINE_VERSION,
        hook: hookCode,
        mode: hookCode === "/review" ? "TAX_REVIEWER" : "QUIZ_MASTER",
        answer,
        answerMode: "domain_menu",
        sourceStatus: "DOMAIN_UNRECOGNIZED",
        sources: [],
        sourcesUsed: [],
        sourceCards: [],
        vectorMatches: 0,
        learningSystemVersion: ENGINE_VERSION
      }
    };
  }

  // ── generate quiz question ──────────────────────────────────────────────────

  async function handleQuizGeneration({
    userId, conversationId, hookConfig, domain, sessionLearning
  }) {
    const traceId = generateTraceId();
    startTrace({ traceId, name: "tina-quiz", hook: "/quiz", metadata: { domain } });
    const _tracedCall = (params) => callAssessmentOpenAI({ ...params, _traceId: traceId });

    try {
      const subtopic = selectNextSubtopic(domain, sessionLearning);

      if (!subtopic) {
        return {
          handled: true,
          response: {
            success: false,
            engine: "TINA Learning System",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            answer: `No subtopics found for domain "${domain}". Type /quiz to choose a different domain.`,
            sources: [], sourcesUsed: [], sourceCards: [], vectorMatches: 0
          }
        };
      }

      let questionResult;
      try {
        questionResult = await generateQuizQuestion({
          domain,
          subtopic,
          sessionLearning,
          userId,
          conversationId,
          hookConfig,
          callOpenAI: _tracedCall,
          supabase,
          persist: false  // all candidates are preview-only; winner stored after dedup selection
        });
      } catch (err) {
        console.error("[SESSION ENGINE] generateQuizQuestion failed:", err?.message);
        return {
          handled: true,
          response: {
            success: false,
            engine: "TINA Learning System",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            answer: `TINA could not generate a quiz question for "${domain}". Please try again.`,
            error: err?.message,
            sources: [], sourcesUsed: [], sourceCards: [], vectorMatches: 0
          }
        };
      }

      if (!questionResult.ok) {
        return {
          handled: true,
          response: {
            success: false,
            engine: "TINA Learning System",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            answer: `TINA could not generate a quiz question for "${domain}" / "${subtopic}". Please try again.`,
            sources: [], sourcesUsed: [], sourceCards: [], vectorMatches: 0
          }
        };
      }

      // ── Hard question-signature dedup (atomic) ───────────────────────────────
      // All candidates are generated with persist:false — no DB rows exist yet.
      // Soft dedup runs inside quiz-engine.js via excludeQuestionFingerprints.
      // This hard check catches cases where the model ignores that signal.
      // Retry limit = 2 (bounded, never infinite).
      // After selection, exactly one DB row is written for the winner.
      const _MAX_DEDUP_RETRIES = 2;
      const _existingSigs = safeArray(sessionLearning.askedQuestionSignatures);
      const _initialSig   = buildQuestionSignature(questionResult.quiz?.question, domain, "QUIZ");
      let   _finalResult  = questionResult;
      let   _finalSig     = _initialSig;

      if (hasRecentQuestionSignature(_existingSigs, _initialSig)) {
        console.log("[QUIZ_DEDUP_HIT]", { domain, subtopic, sig: _initialSig.slice(0, 12) });
        let _retryCount = 0;
        while (_retryCount < _MAX_DEDUP_RETRIES) {
          _retryCount++;
          console.log("[QUIZ_DEDUP_RETRY]", { domain, subtopic, attempt: _retryCount });
          let _retryQR;
          try {
            _retryQR = await generateQuizQuestion({
              domain, subtopic, sessionLearning, userId, conversationId, hookConfig,
              callOpenAI: _tracedCall, supabase,
              persist: false  // preview-only candidate
            });
          } catch (_rErr) {
            console.warn("[QUIZ_DEDUP_RETRY] generation failed (non-fatal):", _rErr?.message);
            break;
          }
          if (_retryQR?.ok) {
            const _retrySig = buildQuestionSignature(_retryQR.quiz?.question, domain, "QUIZ");
            if (!hasRecentQuestionSignature(_existingSigs, _retrySig)) {
              _finalResult = _retryQR;
              _finalSig    = _retrySig;
              break;
            }
          }
        }
        if (_finalResult === questionResult) {
          console.log("[QUIZ_DEDUP_EXHAUSTED]", {
            domain, subtopic, sig: _initialSig.slice(0, 12),
            note: "all retries duplicated — using original candidate"
          });
        }
      }

      // Store exactly one DB row for the final selected question.
      // Nothing has been written yet (all calls used persist:false).
      let _storedFinal = null;
      try {
        _storedFinal = await storeUnansweredQuiz(supabase, {
          userId,
          sessionId: conversationId || null,
          quiz: _finalResult.quiz,
          mode: hookConfig?.mode || "QUIZ_MASTER",
          sourceChunks: _finalResult.sourceChunks || []
        });
      } catch (_storeErr) {
        console.error("[QUIZ_DEDUP] storeUnansweredQuiz for winner failed:", _storeErr?.message);
      }
      if (_storedFinal && !_storedFinal.saveFailed) {
        _finalResult = { ..._finalResult, storedQuiz: _storedFinal, saveFailed: false };
      } else {
        // Store failed — cannot present this question as answerable.
        console.error("[QUIZ_DEDUP] store failed; will not display untracked quiz", {
          domain, subtopic, storedFinal: _storedFinal
        });
        endTrace({ traceId, metadata: { domain, subtopic, error: "store_failed" } });
        flushObservability().catch(() => {});
        return {
          handled: true,
          response: {
            success: false,
            engine: "TINA Learning System",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            answer: "TINA could not prepare a quiz question right now. Please type /quiz to try again.",
            sources: [], sourcesUsed: [], sourceCards: [], vectorMatches: 0
          }
        };
      }
      // ── End hard dedup + atomic store ─────────────────────────────────────────

      // Update session state
      const updatedState = updateLearningStateAfterQuestion({
        sessionLearning,
        subtopic,
        storedQuizId: _finalResult.storedQuiz?.id || null
      });
      // Record the question's signature in the ring buffer for future dedup checks.
      updatedState.askedQuestionSignatures = recordQuestionSignature(_existingSigs, _finalSig);

      await saveLearningState({
        supabase, userId, conversationId, hookConfig, sessionLearning: updatedState
      });

      const visibleSources = finalizeSourcesForResponse(_finalResult.sourceChunks, {
        maxItems: MAX_VISIBLE_SOURCES
      });

      await saveConversationTurn({
        conversationId, userId,
        question: hookConfig.originalQuestion,
        answerText: _finalResult.answerText,
        sourcesUsed: visibleSources
      });

      await saveModeState(supabase, {
        userId,
        sessionId: conversationId || null,
        activeHook: hookConfig.hook_code,
        activeMode: hookConfig.mode,
        modeTitle: hookConfig.title,
        lastQuestion: hookConfig.originalQuestion || "",
        lastAnswer: _finalResult.answerText,
        adaptiveContext: { learning: updatedState }
      });

      // ── Quiz source suppression ───────────────────────────────────────────────
      // Sources are retrieved internally to ground the question (kept in
      // saveConversationTurn above and may surface in the post-answer explanation
      // rendered by assessment-handler.js).  They are NOT sent to the client
      // before the student submits an answer — showing the legal basis / authority
      // before answering defeats the assessment purpose of the question.
      //
      // Suppressed fields: sources, sourcesUsed, sourceCards, vectorMatches.
      // Internal grounding via saveConversationTurn() is unaffected.
      // /review mode is NOT affected — handleReviewGeneration retains its sources.
      console.log("[QUIZ_SOURCE_SUPPRESSED]", {
        hook:        "/quiz",
        domain,
        subtopic,
        sourceCount: visibleSources.length,
        reason:      "quiz_question_pre_answer — sources hidden until student submits"
      });

      return {
        handled: true,
        response: {
          success: true,
          engine: "TINA Learning System",
          version: ENGINE_VERSION,
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          answer: _finalResult.answerText,
          answerMode: "quiz_question_generated",
          quizId: _finalResult.storedQuiz?.id || null,
          topic: domain,
          subtopic,
          difficulty: _finalResult.quiz?.difficulty || 1,
          correctAnswerStored: Boolean(_finalResult.storedQuiz?.correct_answer),
          pendingAnswerStored: _finalResult.storedQuiz?.user_answer === null,
          confidence: visibleSources.length ? "GDRIVE_GROUNDED" : "GENERAL_ADAPTIVE",
          sourceStatus: visibleSources.length ? "QUIZ_QUESTION_SOURCES_HIDDEN" : "GENERAL_QUESTION_READY",
          sources:       [],
          sourcesUsed:   [],
          sourceCards:   [],
          vectorMatches: 0,
          sessionScore: updatedState.score,
          learningSystemVersion: ENGINE_VERSION,
          directOpenAICallDisabled: true
        }
      };
    } finally {
      endTrace({ traceId, metadata: { domain } });
      flushObservability().catch(() => {});
    }
  }

  // ── evaluate review answer + generate next topic ────────────────────────────

  async function handleReviewAnswerEvaluation({
    userId, conversationId, hookConfig, sessionLearning, cleanAnswer
  }) {
    const traceId = generateTraceId();
    startTrace({ traceId, name: "tina-review-answer", hook: "/review", metadata: { domain: sessionLearning.domain } });
    const _tracedCall = (params) => callAssessmentOpenAI({ ...params, _traceId: traceId });

    try {
      const { pendingAnswer } = sessionLearning;
      const correctAnswer = String(pendingAnswer?.correctAnswer || "").toUpperCase();
      const answerSectionText = String(pendingAnswer?.answerText || "No answer data available.");
      const isCorrect = cleanAnswer === correctAnswer;

      console.log("[REVIEW ANSWER ACCEPTED]", {
        answer: cleanAnswer,
        isCorrect,
        domain: sessionLearning.domain,
        subtopic: sessionLearning.subtopic,
        sessionId: conversationId
      });

      // Update score, clear pendingAnswer
      const scoredState = updateLearningStateAfterAnswer({
        sessionLearning,
        subtopic: sessionLearning.subtopic || sessionLearning.domain,
        isCorrect
      });
      scoredState.pendingAnswer = null;

      // Generate next review topic
      const nextSubtopic = selectNextSubtopic(scoredState.domain, scoredState);
      let nextDisplayContent = null;
      let nextAnswerText = null;
      let nextCorrectAnswer = null;
      let nextSourceChunks = [];

      if (nextSubtopic) {
        try {
          const nextReview = await generateReviewMaterial({
            domain: scoredState.domain,
            subtopic: nextSubtopic,
            sessionLearning: scoredState,
            callOpenAI: _tracedCall,
            supabase
          });
          if (nextReview.ok) {
            const split = splitReviewContent(nextReview.reviewText);
            nextDisplayContent = split.displayContent;
            nextAnswerText = split.answerText;
            nextCorrectAnswer = split.correctAnswer;
            nextSourceChunks = nextReview.sourceChunks || [];
          }
        } catch (err) {
          console.error("[SESSION ENGINE] handleReviewAnswerEvaluation next generation failed:", err?.message);
        }
      }

      // Update state with next subtopic and new pending answer
      const finalState = nextSubtopic
        ? updateLearningStateAfterQuestion({ sessionLearning: scoredState, subtopic: nextSubtopic, storedQuizId: null })
        : { ...scoredState };

      finalState.pendingAnswer = nextCorrectAnswer
        ? { answerText: nextAnswerText, correctAnswer: nextCorrectAnswer }
        : null;

      // Build combined response
      const parts = [
        "## Result",
        isCorrect ? "Correct ✅" : "Incorrect ❌",
        "",
        answerSectionText
      ];

      if (nextDisplayContent) {
        parts.push("", "---", "", nextDisplayContent);
      } else {
        parts.push("", "---", `Type \`/review ${scoredState.domain}\` to continue with another topic.`);
      }

      const fullAnswer = parts.join("\n");

      const visibleSources = finalizeSourcesForResponse(nextSourceChunks, {
        maxItems: MAX_VISIBLE_SOURCES
      });

      await saveConversationTurn({
        conversationId, userId,
        question: cleanAnswer,
        answerText: fullAnswer,
        sourcesUsed: visibleSources
      });

      await saveModeState(supabase, {
        userId,
        sessionId: conversationId || null,
        activeHook: hookConfig.hook_code,
        activeMode: hookConfig.mode,
        modeTitle: hookConfig.title,
        lastQuestion: cleanAnswer,
        lastAnswer: fullAnswer,
        adaptiveContext: { learning: finalState }
      });

      return {
        handled: true,
        response: {
          success: true,
          engine: "TINA Learning System",
          version: ENGINE_VERSION,
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          answer: fullAnswer,
          answerMode: "review_answer_evaluated",
          isCorrect,
          topic: scoredState.domain,
          subtopic: nextSubtopic || sessionLearning.subtopic,
          sessionScore: finalState.score,
          sourceStatus: visibleSources.length ? "GDRIVE_GROUNDED" : "TRAINING_KNOWLEDGE",
          sources: visibleSources,
          sourcesUsed: visibleSources,
          sourceCards: visibleSources,
          vectorMatches: visibleSources.length,
          learningSystemVersion: ENGINE_VERSION,
          directOpenAICallDisabled: true
        }
      };
    } finally {
      endTrace({ traceId, metadata: { domain: sessionLearning.domain } });
      flushObservability().catch(() => {});
    }
  }

  // ── generate review material ────────────────────────────────────────────────

  async function handleReviewGeneration({
    userId, conversationId, hookConfig, domain, sessionLearning
  }) {
    const traceId = generateTraceId();
    startTrace({ traceId, name: "tina-review", hook: "/review", metadata: { domain } });
    const _tracedCall = (params) => callAssessmentOpenAI({ ...params, _traceId: traceId });

    try {
      // Extract review anti-repetition state
      const reviewHistory = safeObject(sessionLearning.reviewHistory);
      const seenChunkIds = safeArray(reviewHistory.seenChunkIds).map(String);
      const seenSourcePaths = safeArray(reviewHistory.seenSourcePaths);
      const seenQuestionHashes = safeArray(reviewHistory.seenQuestionHashes);
      const lastSubtopic = reviewHistory.lastSubtopic || null;

      let subtopic = selectNextSubtopic(domain, sessionLearning);

      // Prevent immediate re-selection of the last subtopic when alternatives exist
      if (lastSubtopic && subtopic === lastSubtopic) {
        const allSubtopics = getDomainSubtopics(domain);
        if (allSubtopics.filter(s => s !== lastSubtopic).length > 0) {
          const fakeSession = {
            ...sessionLearning,
            coveredSubtopics: [...safeArray(sessionLearning.coveredSubtopics), lastSubtopic]
          };
          const alt = selectNextSubtopic(domain, fakeSession);
          if (alt && alt !== lastSubtopic) {
            console.log("[REVIEW MEMORY]", {
              event: "SUBTOPIC_REPEAT_PREVENTED",
              from: lastSubtopic,
              to: alt,
              domain,
              sessionId: conversationId
            });
            subtopic = alt;
          }
        }
      }

      if (!subtopic) {
        return {
          handled: true,
          response: {
            success: false,
            engine: "TINA Learning System",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            answer: `No subtopics found for domain "${domain}". Type /review to choose a different domain.`,
            sources: [], sourcesUsed: [], sourceCards: [], vectorMatches: 0
          }
        };
      }

      let reviewResult;
      try {
        reviewResult = await generateReviewMaterial({
          domain,
          subtopic,
          sessionLearning,
          callOpenAI: _tracedCall,
          supabase,
          excludeChunkIds: seenChunkIds,
          excludeSourcePaths: seenSourcePaths
        });
      } catch (err) {
        console.error("[SESSION ENGINE] generateReviewMaterial failed:", err?.message);
        return {
          handled: true,
          response: {
            success: false,
            engine: "TINA Learning System",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            answer: `TINA could not generate review material for "${domain}". Please try again.`,
            error: err?.message,
            sources: [], sourcesUsed: [], sourceCards: [], vectorMatches: 0
          }
        };
      }

      if (!reviewResult.ok) {
        return {
          handled: true,
          response: {
            success: false,
            engine: "TINA Learning System",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            answer: `TINA could not generate review material for "${domain}" / "${subtopic}". Please try again.`,
            sources: [], sourcesUsed: [], sourceCards: [], vectorMatches: 0
          }
        };
      }

      // Detect repeated mini-question via hash — up to one retry attempt.
      // Strengthened check: retryHash must NOT be in the full seenQuestionHashes list
      // (not just different from firstHash) to catch matches against older sessions.
      const firstHash = hashMiniQuestion(reviewResult.reviewText);
      if (firstHash && seenQuestionHashes.includes(firstHash)) {
        console.log("[REVIEW_DEDUP_HIT]", {
          hash: firstHash.slice(0, 12), subtopic, domain, sessionId: conversationId
        });
        console.log("[REVIEW MEMORY]", {
          event: "QUESTION_REPEAT_DETECTED",
          hash: firstHash,
          subtopic,
          domain,
          sessionId: conversationId,
          retrying: true
        });
        try {
          const retryResult = await generateReviewMaterial({
            domain,
            subtopic,
            sessionLearning,
            callOpenAI: _tracedCall,
            supabase,
            excludeChunkIds: seenChunkIds,
            excludeSourcePaths: seenSourcePaths
          });
          if (retryResult.ok) {
            const retryHash = hashMiniQuestion(retryResult.reviewText);
            if (!seenQuestionHashes.includes(retryHash)) {
              reviewResult = retryResult;
              console.log("[REVIEW MEMORY]", {
                event: "QUESTION_RETRY_USED",
                hash: retryHash,
                subtopic,
                sessionId: conversationId
              });
            }
          }
        } catch (retryErr) {
          console.warn("[REVIEW MEMORY] Retry failed (non-fatal):", retryErr?.message);
        }
      }

      // Split review content — gate the answer section until user responds
      const { displayContent, answerText, correctAnswer } = splitReviewContent(reviewResult.reviewText);

      // Update session state + store pendingAnswer
      const updatedState = updateLearningStateAfterQuestion({
        sessionLearning,
        subtopic,
        storedQuizId: null
      });
      updatedState.pendingAnswer = correctAnswer
        ? { answerText, correctAnswer }
        : null;

      // Build updated anti-repetition history
      const qHash = hashMiniQuestion(displayContent);
      const newChunkIds = safeArray(reviewResult.sourceChunks)
        .map(s => String(s.id || "")).filter(Boolean);
      const newSourcePaths = [...new Set(
        safeArray(reviewResult.sourceChunks).map(s => s.sourcePath || "").filter(Boolean)
      )];
      updatedState.reviewHistory = {
        seenChunkIds: [...new Set([...seenChunkIds, ...newChunkIds])].slice(-30),
        seenSourcePaths: [...new Set([...seenSourcePaths, ...newSourcePaths])].slice(-15),
        seenQuestionHashes: [...new Set([...seenQuestionHashes, ...(qHash ? [qHash] : [])])].slice(-20),
        lastSubtopic: subtopic
      };

      const visibleSources = finalizeSourcesForResponse(reviewResult.sourceChunks, {
        maxItems: MAX_VISIBLE_SOURCES
      });

      await saveConversationTurn({
        conversationId, userId,
        question: hookConfig.originalQuestion,
        answerText: displayContent,
        sourcesUsed: visibleSources
      });

      await saveModeState(supabase, {
        userId,
        sessionId: conversationId || null,
        activeHook: hookConfig.hook_code,
        activeMode: hookConfig.mode,
        modeTitle: hookConfig.title,
        lastQuestion: hookConfig.originalQuestion || "",
        lastAnswer: displayContent,
        adaptiveContext: { learning: updatedState }
      });

      console.log("[REVIEW LOCK]", {
        domain,
        subtopic,
        sessionId: conversationId,
        sourceCount: visibleSources.length,
        pendingAnswer: Boolean(updatedState.pendingAnswer)
      });

      console.log("[REVIEW MEMORY]", {
        event: "STATE_UPDATED",
        domain,
        subtopic,
        sessionId: conversationId,
        questionHash: qHash,
        seenChunkCount: updatedState.reviewHistory.seenChunkIds.length,
        seenSourceCount: updatedState.reviewHistory.seenSourcePaths.length,
        seenHashCount: updatedState.reviewHistory.seenQuestionHashes.length
      });

      return {
        handled: true,
        response: {
          success: true,
          engine: "TINA Learning System",
          version: ENGINE_VERSION,
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          answer: displayContent,
          answerMode: "review_material_generated",
          topic: domain,
          subtopic,
          subtopicLabel: reviewResult.subtopicLabel,
          confidence: visibleSources.length ? "GDRIVE_GROUNDED" : "TRAINING_KNOWLEDGE",
          sourceStatus: visibleSources.length ? "GDRIVE_GROUNDED_REVIEW_READY" : "TRAINING_KNOWLEDGE_REVIEW",
          sources: visibleSources,
          sourcesUsed: visibleSources,
          sourceCards: visibleSources,
          vectorMatches: visibleSources.length,
          sessionScore: updatedState.score,
          learningSystemVersion: ENGINE_VERSION,
          directOpenAICallDisabled: true
        }
      };
    } finally {
      endTrace({ traceId, metadata: { domain } });
      flushObservability().catch(() => {});
    }
  }

  // ── handle answer validation (from continueAssessmentLoop) ─────────────────
  // NOTE: Answer validation for /quiz still flows through assessment-handler.js
  // (which calls continueAssessmentLoop). After validation it calls handleQuizGeneration
  // for the next question. No changes needed here — session engine only handles
  // fresh /quiz and /review commands.

  // ── main entry point ────────────────────────────────────────────────────────

  async function handleLearningCommand({
    userId,
    conversationId,
    hookConfig,
    cleanQuestion,
    originalQuestion
  }) {
    const hookCode = hookConfig.hook_code;

    if (hookCode !== "/quiz" && hookCode !== "/review") {
      return { handled: false };
    }

    // Fetch mode state first — needed for pending answer check and session context
    let existingModeState = null;
    try {
      existingModeState = await getModeState(supabase, userId, conversationId || null);
    } catch (err) {
      console.error("[SESSION ENGINE] getModeState failed:", err?.message);
    }

    const adaptiveContext = safeObject(existingModeState?.adaptive_context);

    // Check for pending review answer BEFORE parseLearningCommand.
    // When pendingAnswer is stored, the user must submit A/B/C/D before getting the next topic.
    if (hookCode === "/review") {
      const storedLearning = safeObject(adaptiveContext?.learning);
      if (storedLearning.pendingAnswer) {
        const quizAnswer = extractQuizAnswer(cleanQuestion || "");
        if (quizAnswer) {
          const sessionLearning = {
            ...emptyLearningState(storedLearning.domain || "", "REVIEW"),
            ...storedLearning
          };
          return handleReviewAnswerEvaluation({
            userId, conversationId, hookConfig, sessionLearning, cleanAnswer: quizAnswer
          });
        }
        // Non-A/B/C/D received while answer is pending — ask-handler gate should prevent this, but handle defensively.
        // No OpenAI call, no retrieval, no session reset.
        return {
          handled: true,
          response: {
            success: false,
            engine: "TINA Learning System",
            mode: "REVIEW_ANSWER_GATED",
            answer: `## Invalid Response\n\nAllowed responses:\n• A\n• B\n• C\n• D\n• /bye\n• /exit\n• /quit\n\nYou are currently inside /review ${storedLearning.domain || ""}.\n\nDo not answer questions directly in review mode.\n\nTYPE:\n• A/B/C/D to answer\n• /bye to exit`,
            sources: [], sourcesUsed: [], sourceCards: [], vectorMatches: 0
          }
        };
      } else {
        // pendingAnswer not set — if A/B/C/D arrives anyway, log it (no question pending)
        const orphanAnswer = extractQuizAnswer(cleanQuestion || "");
        if (orphanAnswer) {
          console.log("[REVIEW ANSWER ROUTE BLOCKED]", {
            input: cleanQuestion,
            reason: "no pending review question"
          });
        }
      }
    }

    const mode = hookCode === "/review" ? "REVIEW" : "QUIZ";

    // Parse domain from cleanQuestion
    const parsed = parseLearningCommand(cleanQuestion || "", hookCode);

    // No domain provided — show domain menu.
    // Save mode state first so sticky mode works for the follow-up domain selection
    // (e.g. user types "/review" → sees menu → types "VAT" → gets routed as "/review VAT").
    if (!parsed.domain) {
      try {
        await saveModeState(supabase, {
          userId,
          sessionId: conversationId || null,
          activeHook: hookConfig.hook_code,
          activeMode: hookConfig.mode,
          modeTitle: hookConfig.title,
          lastQuestion: hookConfig.originalQuestion || "",
          lastAnswer: ""
        });
      } catch (err) {
        console.error("[SESSION ENGINE] saveModeState (domain menu) failed (non-fatal):", err?.message);
      }
      if (parsed.domainText) {
        return buildUnknownDomainResponse(hookCode, parsed.domainText);
      }
      return buildDomainMenuResponse(hookCode);
    }

    const domain = parsed.domain;
    const domainConfig = getDomainConfig(domain);

    if (!domainConfig) {
      return buildUnknownDomainResponse(hookCode, cleanQuestion || "");
    }

    // adaptiveContext is already loaded above
    const sessionLearning = readLearningState(adaptiveContext, domain, mode);

    // Load learner profile for difficulty adaptation
    try {
      const profile = await getOrCreateLearnerProfile(supabase, userId);
      sessionLearning.learnerProfile = profile;
    } catch {
      // non-fatal
    }

    if (mode === "REVIEW") {
      return handleReviewGeneration({
        userId, conversationId, hookConfig, domain, sessionLearning
      });
    }

    return handleQuizGeneration({
      userId, conversationId, hookConfig, domain, sessionLearning
    });
  }

  return {
    handleLearningCommand,
    parseLearningCommand,
    buildDomainMenuResponse,
    buildUnknownDomainResponse
  };
}

export function sessionEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_LEARNING_SESSION_ENGINE",
    version: ENGINE_VERSION,
    interceptsBeforeIssueClassification: true,
    quizEngineCompatible: true,
    reviewEngineCompatible: true,
    subtopicRotationEnabled: true,
    sessionStatePreserved: true,
    noLegalRAGFlowEntered: true
  };
}
