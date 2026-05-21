// FILE: learning/session-engine.js
"use strict";

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
import { generateReviewMaterial, splitReviewContent } from "./review-engine.js";

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

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
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
    currentQuestionId: null,
    sessionStartedAt: new Date().toISOString()
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
  } else {
    updated.weakSubtopics = updated.weakSubtopics.filter((s) => s !== subtopic);
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
        callOpenAI: callAssessmentOpenAI,
        supabase
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

    // Update session state
    const updatedState = updateLearningStateAfterQuestion({
      sessionLearning,
      subtopic,
      storedQuizId: questionResult.storedQuiz?.id || null
    });

    await saveLearningState({
      supabase, userId, conversationId, hookConfig, sessionLearning: updatedState
    });

    const visibleSources = finalizeSourcesForResponse(questionResult.sourceChunks, {
      maxItems: MAX_VISIBLE_SOURCES
    });

    await saveConversationTurn({
      conversationId, userId,
      question: hookConfig.originalQuestion,
      answerText: questionResult.answerText,
      sourcesUsed: visibleSources
    });

    await saveModeState(supabase, {
      userId,
      sessionId: conversationId || null,
      activeHook: hookConfig.hook_code,
      activeMode: hookConfig.mode,
      modeTitle: hookConfig.title,
      lastQuestion: hookConfig.originalQuestion || "",
      lastAnswer: questionResult.answerText,
      adaptiveContext: { learning: updatedState }
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
        answer: questionResult.answerText,
        answerMode: "quiz_question_generated",
        quizId: questionResult.storedQuiz?.id || null,
        topic: domain,
        subtopic,
        difficulty: questionResult.quiz?.difficulty || 1,
        correctAnswerStored: Boolean(questionResult.storedQuiz?.correct_answer),
        pendingAnswerStored: questionResult.storedQuiz?.user_answer === null,
        confidence: visibleSources.length ? "GDRIVE_GROUNDED" : "GENERAL_ADAPTIVE",
        sourceStatus: visibleSources.length ? "GDRIVE_GROUNDED_QUESTION_READY" : "GENERAL_QUESTION_READY",
        sources: visibleSources,
        sourcesUsed: visibleSources,
        sourceCards: visibleSources,
        vectorMatches: visibleSources.length,
        sessionScore: updatedState.score,
        learningSystemVersion: ENGINE_VERSION,
        directOpenAICallDisabled: true
      }
    };
  }

  // ── evaluate review answer + generate next topic ────────────────────────────

  async function handleReviewAnswerEvaluation({
    userId, conversationId, hookConfig, sessionLearning, cleanAnswer
  }) {
    const { pendingAnswer } = sessionLearning;
    const correctAnswer = String(pendingAnswer?.correctAnswer || "").toUpperCase();
    const answerSectionText = String(pendingAnswer?.answerText || "No answer data available.");
    const isCorrect = cleanAnswer === correctAnswer;

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
          callOpenAI: callAssessmentOpenAI,
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
  }

  // ── generate review material ────────────────────────────────────────────────

  async function handleReviewGeneration({
    userId, conversationId, hookConfig, domain, sessionLearning
  }) {
    const subtopic = selectNextSubtopic(domain, sessionLearning);

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
        callOpenAI: callAssessmentOpenAI,
        supabase
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
        // Non-A/B/C/D received while answer is pending (ask-handler gate should prevent this, but handle gracefully)
        return {
          handled: true,
          response: {
            success: false,
            engine: "TINA Learning System",
            mode: "REVIEW_ANSWER_GATED",
            answer: `Please answer the current question using A, B, C, or D. Type /bye to exit reviewer mode.`,
            sources: [], sourcesUsed: [], sourceCards: [], vectorMatches: 0
          }
        };
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
