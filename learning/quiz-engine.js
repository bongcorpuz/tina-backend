// FILE: learning/quiz-engine.js
"use strict";

import {
  buildAdaptiveQuizPrompt,
  safeParseQuizJson,
  storeUnansweredQuiz,
  getRecentQuizHistory,
  buildQuizExclusionFromHistory
} from "../adaptive-quiz.js";

import { getQuizSourceChunks } from "../vector-store.js";
import { buildRetrievalHints } from "./question-bank-router.js";
import { getSubtopicLabel, getDomainConfig } from "./domain-normalizer.js";
import { safeParseQuizQuestion } from "../services/schema-validator.js";

const ENGINE_VERSION = "1.0.0";

const DIFFICULTY_LABELS = {
  1: "Basic",
  2: "Standard",
  3: "Applied",
  4: "Analytical",
  5: "Advanced"
};

const DIFFICULTY_MAP = {
  easy: 1, basic: 1,
  standard: 2, moderate: 2,
  applied: 3, hard: 3,
  analytical: 4,
  advanced: 5, "bar/cta": 5, "bar": 5, "cta": 5
};

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function trimText(value = "", max = 1200) {
  const text = normalizeText(value);
  return text.length <= max ? text : `${text.slice(0, max).trim()} ...[trimmed]`;
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
      chunk.authorityType || chunk.authority_type || chunk.metadata?.authorityType || "UNKNOWN",

    citation:
      chunk.citation ||
      chunk.reference ||
      chunk.normalizedReference ||
      chunk.normalized_reference ||
      chunk.metadata?.normalizedReference ||
      "",

    url:
      chunk.url || chunk.driveViewUrl || chunk.drive_view_url || chunk.metadata?.driveViewUrl || "",

    text: trimText(
      chunk.text || chunk.content || chunk.excerpt || chunk.preview || "", 1200
    ),

    score:
      Number(chunk.finalScore || chunk.final_score || chunk.retrievalScore || chunk.score || chunk.similarity || 0) || 0
  };
}

function compactHistory(history = []) {
  return safeArray(history).slice(0, 8).map((item) => ({
    topic: item.topic || null,
    subtopic: item.subtopic || null,
    question: trimText(item.question || item.quiz_question || "", 280),
    correctAnswer: item.correct_answer || null,
    isCorrect: item.is_correct ?? null
  }));
}

// Normalizes choices from either array or {A,B,C,D} object into a plain text array.
function normalizeQuizChoices(raw) {
  const letters = ["A", "B", "C", "D"];
  if (Array.isArray(raw?.choices)) {
    return raw.choices.slice(0, 4).map((choice) => {
      if (typeof choice === "string") return choice.replace(/^[A-D][.)]\s*/i, "").trim();
      if (choice && typeof choice === "object") {
        return String(choice.text || choice.label || choice.value || "").replace(/^[A-D][.)]\s*/i, "").trim();
      }
      return "";
    });
  }
  if (raw?.choices && typeof raw.choices === "object") {
    return letters.map((l) => String(raw.choices[l] || "").replace(/^[A-D][.)]\s*/i, "").trim());
  }
  return [];
}

function resolveDifficulty(sessionLearning = {}) {
  const score = sessionLearning.score || { correct: 0, total: 0 };
  const total = score.total || 0;
  const correct = score.correct || 0;
  const accuracy = total > 0 ? correct / total : 0;

  if (accuracy >= 0.85 && total >= 3) return 4;
  if (accuracy >= 0.65 && total >= 2) return 3;
  if (accuracy >= 0.45) return 2;
  return 1;
}

// Builds the quiz prompt for a specific domain + subtopic (different from the base adaptive prompt)
function buildDomainSubtopicQuizPrompt({
  domain,
  subtopic,
  subtopicLabel,
  difficulty,
  difficultyLabel,
  profile,
  sourceChunks,
  recentQuestions,
  excludeFingerprints
}) {
  const sourceContext = safeArray(sourceChunks)
    .map((chunk, i) => {
      const text = String(chunk.text || chunk.content || "").slice(0, 2500);
      return `SOURCE ${i + 1}\nTitle: ${chunk.title || "Untitled"}\nAuthority: ${chunk.authorityType || "UNKNOWN"}\nCitation: ${chunk.citation || "N/A"}\nText:\n${text}`;
    })
    .join("\n\n---\n\n");

  const recentQTexts = safeArray(recentQuestions)
    .map((q, i) => `${i + 1}. ${q.question}`)
    .filter(Boolean)
    .slice(0, 10)
    .join("\n");

  const excludedTexts = safeArray(excludeFingerprints).slice(0, 30).join("\n");

  const allExcluded = [recentQTexts, excludedTexts].filter(Boolean).join("\n").trim();

  if (!sourceContext) {
    return `
You are TINA, a CPALE Philippine Tax Examiner.

Generate ONE multiple-choice question on: **${subtopicLabel}**

Subtopic: ${subtopic}
Domain: ${domain}
Difficulty: ${difficultyLabel} (${difficulty}/5)

RULES:
- Philippine taxation only (NIRC, RR, RMC, Supreme Court, CTA).
- One question, four choices: A, B, C, D.
- Randomize where the correct answer falls (do not always put it at A).
- Exam-level accuracy required. Do not fabricate specific GR numbers, dates, or rates you are uncertain of.
- Avoid repeating the following questions:
${allExcluded || "None yet."}
- Return valid JSON only. No markdown. No text outside JSON.

JSON structure:
{
  "topic": "${domain}",
  "subtopic": "${subtopic}",
  "difficulty": ${difficulty},
  "question": "...",
  "choices": [
    "First choice text (no letter prefix)",
    "Second choice text (no letter prefix)",
    "Third choice text (no letter prefix)",
    "Fourth choice text (no letter prefix)"
  ],
  "correctAnswer": "A",
  "explanation": "...",
  "cpaleTrap": "...",
  "sourceSupport": "GENERAL_FALLBACK_NO_INDEXED_SOURCE",
  "groundingStatus": "limited_indexed_source",
  "validationStatus": "GENERAL_FALLBACK"
}
`.trim();
  }

  return `
You are TINA, a source-grounded CPALE Philippine Tax Examiner.

Generate ONE multiple-choice question on: **${subtopicLabel}**

Subtopic: ${subtopic}
Domain: ${domain}
Difficulty: ${difficultyLabel} (${difficulty}/5)

Difficulty guide: 1=definition, 2=rule application, 3=computation, 4=exception/trap, 5=mixed CPALE scenario

SOURCE CONTEXT:
${sourceContext}

Questions already asked (do not repeat):
${allExcluded || "None yet."}

RULES:
- Create the question from SOURCE CONTEXT only.
- The correct answer MUST be directly supported by SOURCE CONTEXT.
- Do not fabricate legal bases, rates, or citations not in SOURCE CONTEXT.
- Four choices: A, B, C, D. Randomize the correct answer position.
- Wrong choices must be plausible but clearly wrong per SOURCE CONTEXT.
- Explanation must cite SOURCE CONTEXT.
- Return valid JSON only. No markdown. No text outside JSON.

JSON structure:
{
  "topic": "${domain}",
  "subtopic": "${subtopic}",
  "difficulty": ${difficulty},
  "question": "...",
  "choices": [
    "First choice text (no letter prefix)",
    "Second choice text (no letter prefix)",
    "Third choice text (no letter prefix)",
    "Fourth choice text (no letter prefix)"
  ],
  "correctAnswer": "A",
  "explanation": "...",
  "cpaleTrap": "...",
  "sourceSupport": "Quote or close paraphrase from SOURCE CONTEXT supporting the answer",
  "groundingStatus": "grounded",
  "validationStatus": "SOURCE_GROUNDED"
}
`.trim();
}

export async function generateQuizQuestion({
  domain,
  subtopic,
  sessionLearning = {},
  userId,
  conversationId,
  hookConfig,
  callOpenAI,
  supabase
}) {
  const subtopicLabel = getSubtopicLabel(domain, subtopic);
  const difficulty = resolveDifficulty(sessionLearning);
  const difficultyLabel = DIFFICULTY_LABELS[difficulty] || String(difficulty);

  // Quiz history for deduplication
  let recentHistory = [];
  try {
    recentHistory = await Promise.race([
      getRecentQuizHistory(supabase, { userId, topic: domain, limit: 30 }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("history timeout")), 4000))
    ]);
  } catch {
    // non-fatal
  }

  const exclusions = buildQuizExclusionFromHistory(recentHistory);
  const compactedHistory = compactHistory(recentHistory);

  // Source retrieval scoped to domain + subtopic
  const hints = buildRetrievalHints(domain, subtopic);
  let sourceChunks = [];
  try {
    sourceChunks = await Promise.race([
      getQuizSourceChunks({
        topic: hints.primaryQuery,
        excludeSourcePaths: safeArray(exclusions.excludeSourcePaths),
        excludeChunkIds: safeArray(exclusions.excludeChunkIds),
        limit: 3
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("source timeout")), 5000))
    ]);
  } catch (err) {
    console.error("[QUIZ ENGINE] Source retrieval failed (topic-only fallback):", err?.message);
    sourceChunks = [];
  }

  const compactSources = safeArray(sourceChunks).map(compactSourceChunk);

  const quizPrompt = buildDomainSubtopicQuizPrompt({
    domain,
    subtopic,
    subtopicLabel,
    difficulty,
    difficultyLabel,
    profile: sessionLearning.learnerProfile || null,
    sourceChunks: compactSources,
    recentQuestions: compactedHistory,
    excludeFingerprints: safeArray(exclusions.excludeQuestionFingerprints)
  });

  const rawQuiz = await callOpenAI({
    userQuery: quizPrompt,
    systemPrompt: `
You are TINA's CPALE Philippine Tax Quiz Generator.
Generate exactly one multiple-choice question in valid JSON only.
No markdown. No explanations outside JSON. Do not add any text before or after the JSON.
Philippine taxation context only. Authority-grounded only.
`.trim(),
    masterPrompt: `Return only this exact JSON structure with all fields populated.`,
    retrievedSources: compactSources,
    classification: {
      primaryIssue: domain,
      subIssue: subtopic,
      retrievalStrategy: compactSources.length ? "SOURCE_GROUNDED_QUIZ" : "GENERAL_QUIZ",
      targetAuthorities: hints.targetAuthorities
    },
    intent: {
      intent: "GENERATE_QUIZ_QUESTION",
      requiresQuizMode: true,
      quizDomain: domain,
      quizSubtopic: subtopic
    },
    quizMode: true,
    adaptiveContext: { activeHook: "/quiz", quizMode: true, orchestrationMode: "QUIZ" }
  });

  let quiz = safeParseQuizJson(rawQuiz);

  if (!quiz) {
    console.warn("[QUIZ ENGINE] safeParseQuizJson failed — retrying once");
    try {
      const retryRaw = await callOpenAI({
        userQuery: quizPrompt,
        systemPrompt: `Return ONLY valid JSON. No markdown, no code blocks, no extra text.\nStructure: {"topic":"","subtopic":"","difficulty":0,"question":"","choices":["","","",""],"correctAnswer":"A","explanation":"","cpaleTrap":"","sourceSupport":"","groundingStatus":"limited_indexed_source","validationStatus":"GENERAL_FALLBACK"}`,
        masterPrompt: `Return only valid JSON. Nothing else.`,
        retrievedSources: compactSources,
        classification: {
          primaryIssue: domain,
          subIssue: subtopic,
          retrievalStrategy: compactSources.length ? "SOURCE_GROUNDED_QUIZ" : "GENERAL_QUIZ",
          targetAuthorities: hints.targetAuthorities
        },
        intent: {
          intent: "GENERATE_QUIZ_QUESTION",
          requiresQuizMode: true,
          quizDomain: domain,
          quizSubtopic: subtopic
        },
        quizMode: true,
        adaptiveContext: { activeHook: "/quiz", quizMode: true, orchestrationMode: "QUIZ" }
      });
      quiz = safeParseQuizJson(retryRaw);
    } catch (retryErr) {
      console.error("[QUIZ ENGINE] Retry failed:", retryErr?.message);
    }
  }

  if (!quiz) {
    return { ok: false, error: "Quiz JSON parse failed.", sourceChunks: compactSources };
  }

  // Defense-in-depth: confirm shape is valid before writing to DB
  const quizValidation = safeParseQuizQuestion(quiz);
  if (!quizValidation.ok) {
    console.error(
      "[QUIZ ENGINE] Post-parse schema check failed:",
      quizValidation.error?.issues
        ?.map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
        .join("; ")
    );
    return { ok: false, error: "Quiz schema invalid after parsing.", sourceChunks: compactSources };
  }

  // Ensure subtopic is set
  quiz.subtopic = quiz.subtopic || subtopic;
  quiz.topic = quiz.topic || domain;

  // Store in tina_learning_attempts for answer lock
  let storedQuiz = null;
  try {
    storedQuiz = await Promise.race([
      storeUnansweredQuiz(supabase, {
        userId,
        sessionId: conversationId || null,
        quiz,
        mode: hookConfig?.mode || "QUIZ_MASTER",
        sourceChunks: compactSources
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("store timeout")), 5000))
    ]);
  } catch (err) {
    console.error("[QUIZ ENGINE] storeUnansweredQuiz failed (untracked quiz returned):", err?.message);
    storedQuiz = null;
  }

  const domainConfig = getDomainConfig(domain) || {};
  const domainLabel = domainConfig.label || domain;
  const isGrounded = compactSources.length > 0;
  const answerText = formatQuizBlock({
    quiz,
    subtopicLabel,
    domainLabel,
    isGrounded
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

function formatQuizBlock({ quiz, subtopicLabel, domainLabel, isGrounded }) {
  const letters = ["A", "B", "C", "D"];
  const choicesObj = quiz.choices || {};
  const renderedChoices = letters
    .map((l) => `${l}. ${String(choicesObj[l] || "").trim()}`)
    .join("\n");

  // Strip "Domain — " prefix from subtopicLabel so the title reads cleanly
  const topicName = subtopicLabel.includes(" — ")
    ? subtopicLabel.split(" — ").slice(1).join(" — ")
    : subtopicLabel;

  const parts = [`# ${domainLabel} Quiz — ${topicName}`, ""];

  if (isGrounded === false) {
    parts.push("Indexed source is limited for this topic.", "");
  }

  parts.push(
    "## Question",
    quiz.question || "Question unavailable.",
    "",
    renderedChoices,
    "",
    "Answer with A, B, C, or D only.",
    "Type /bye to exit."
  );

  return parts.filter((line) => line !== null && line !== undefined).join("\n").trim();
}

export function quizEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_QUIZ_ENGINE",
    version: ENGINE_VERSION,
    sourceGrounded: true,
    subtopicAware: true,
    difficultyAdaptive: true
  };
}
