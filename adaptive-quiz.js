// FILE: adaptive-quiz.js
"use strict";

/* ================= TINA SOURCE-GROUNDED ADAPTIVE QUIZ ENGINE ================= */

import {
  getOrCreateLearnerProfile,
  updateLearnerProfileStats,
  getTopicMastery,
  updateTopicMastery
} from "./learner-profile.js";

import { safeParseQuizQuestion } from "./services/schema-validator.js";

const ENGINE_VERSION = "3.0.0";

const TAX_TOPICS = [
  "Income Tax",
  "VAT",
  "Percentage Tax",
  "Withholding Tax",
  "Final Tax",
  "Capital Gains Tax",
  "Donor's Tax",
  "Estate Tax",
  "Documentary Stamp Tax",
  "Tax Remedies",
  "Tax Administration",
  "Local Taxation"
];

/* ================= HELPERS ================= */

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((item) => normalizeText(item)).filter(Boolean))];
}

function safeInteger(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.floor(num));
}

function normalizeDifficulty(value = 1) {
  const difficulty = safeInteger(value, 1) || 1;
  return Math.min(Math.max(difficulty, 1), 5);
}

function isSupabaseClient(value) {
  return Boolean(value) && typeof value.from === "function";
}

function safeJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeChoiceLetter(value = "") {
  return String(value || "")
    .replace(/[^A-Da-d]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, 1);
}

/* ================= TOPIC DETECTION ================= */

export function detectQuizTopic(text = "") {
  const q = lower(text);

  if (q.includes("vat") || q.includes("value-added") || q.includes("value added")) return "VAT";
  if (q.includes("withholding") || q.includes("ewt") || q.includes("cwt")) return "Withholding Tax";
  if (q.includes("income tax") || q.includes("rcit") || q.includes("mcit") || q.includes("nolco")) return "Income Tax";
  if (q.includes("percentage tax")) return "Percentage Tax";
  if (q.includes("final tax")) return "Final Tax";
  if (q.includes("capital gains") || q.includes("cgt")) return "Capital Gains Tax";
  if (q.includes("donor")) return "Donor's Tax";
  if (q.includes("estate")) return "Estate Tax";
  if (q.includes("dst") || q.includes("documentary stamp")) return "Documentary Stamp Tax";
  if (q.includes("remedy") || q.includes("assessment") || q.includes("protest")) return "Tax Remedies";
  if (q.includes("admin") || q.includes("registration") || q.includes("filing")) return "Tax Administration";
  if (q.includes("local tax") || q.includes("business tax")) return "Local Taxation";

  return null;
}

export function pickRandomTaxTopic() {
  return TAX_TOPICS[Math.floor(Math.random() * TAX_TOPICS.length)];
}

/* ================= ADAPTIVE PROFILE ================= */

export async function getAdaptiveQuizProfile(
  supabase,
  userId,
  requestedTopic = ""
) {
  if (!isSupabaseClient(supabase) || !userId) {
    return {
      profile: null,
      topic: detectQuizTopic(requestedTopic) || normalizeText(requestedTopic) || pickRandomTaxTopic(),
      subtopic: "",
      difficulty: 1
    };
  }

  const profile = await getOrCreateLearnerProfile(supabase, userId);

  const detectedTopic = detectQuizTopic(requestedTopic);
  const cleanRequestedTopic = normalizeText(requestedTopic);

  const topic =
    detectedTopic ||
    cleanRequestedTopic ||
    profile?.last_reviewed_topic ||
    pickRandomTaxTopic();

  const mastery = await getTopicMastery(supabase, userId, topic, "");
  const difficulty = normalizeDifficulty(mastery?.difficulty_level || 1);

  return {
    profile,
    topic,
    subtopic: "",
    difficulty
  };
}

/* ================= RECENT QUIZ HISTORY ================= */

export async function getRecentQuizHistory(
  supabase,
  {
    userId,
    topic = "",
    limit = 50
  } = {}
) {
  if (!isSupabaseClient(supabase) || !userId) return [];

  // Fetch across all sessions for cross-session deduplication.
  // Limit 50 by default so fingerprint exclusion is effective.
  let query = supabase
    .from("tina_learning_attempts")
    .select("id, topic, subtopic, question, source_path, chunk_index, source_metadata, created_at, is_correct, user_answer")
    .eq("user_id", String(userId))
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(safeInteger(limit, 50), 200)));

  if (topic) {
    query = query.ilike("topic", `%${topic}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getRecentQuizHistory error:", error.message);
    return [];
  }

  return data || [];
}

export function buildQuizExclusionFromHistory(history = []) {
  const excludeSourcePaths = [];
  const excludeChunkIds = [];
  const excludeQuestionFingerprints = [];

  for (const item of history || []) {
    // Source/chunk exclusion: only for correctly answered questions.
    // Incorrectly answered questions keep their source available so a
    // reinforcement question on the same subtopic can still use it.
    if (item.is_correct === true) {
      if (item.source_path && !excludeSourcePaths.includes(item.source_path)) {
        excludeSourcePaths.push(item.source_path);
      }

      const metadata = safeJson(item.source_metadata, {});
      const sourceChunkId = metadata.sourceChunkId || metadata.chunkId || null;

      if (sourceChunkId && !excludeChunkIds.includes(String(sourceChunkId))) {
        excludeChunkIds.push(String(sourceChunkId));
      }

      if (item.chunk_index != null && item.source_path) {
        const compoundKey = `${item.source_path}::${item.chunk_index}`;
        if (!excludeChunkIds.includes(compoundKey)) excludeChunkIds.push(compoundKey);
      }
    }

    // Question fingerprint exclusion: always, regardless of correctness.
    // Prevents the exact same wording being shown again in the same session.
    const qText = normalizeText(item.question || item.quiz_question || "");
    if (qText) {
      const fingerprint = qText.toLowerCase().replace(/\s+/g, " ").slice(0, 120);
      if (!excludeQuestionFingerprints.includes(fingerprint)) {
        excludeQuestionFingerprints.push(fingerprint);
      }
    }
  }

  return {
    excludeSourcePaths,
    excludeChunkIds,
    excludeQuestionFingerprints
  };
}

/* ================= SOURCE HELPERS ================= */

function normalizeSourceChunk(sourceChunk = null) {
  if (!sourceChunk) return null;

  const metadata = sourceChunk.metadata || {};

  return {
    source_file_id:
      sourceChunk.fileId ||
      sourceChunk.file_id ||
      metadata.fileId ||
      metadata.file_id ||
      null,

    source_title:
      sourceChunk.sourceTitle ||
      sourceChunk.title ||
      metadata.documentTitle ||
      metadata.originalFileName ||
      sourceChunk.originalSource ||
      sourceChunk.original_source ||
      sourceChunk.source ||
      null,

    source_path:
      sourceChunk.sourcePath ||
      sourceChunk.path ||
      sourceChunk.source_path ||
      metadata.path ||
      sourceChunk.originalSource ||
      sourceChunk.original_source ||
      sourceChunk.source ||
      null,

    chunk_index:
      typeof sourceChunk.chunkIndex === "number"
        ? sourceChunk.chunkIndex
        : sourceChunk.chunk_index ?? null,

    source_excerpt: String(
      sourceChunk.text ||
        sourceChunk.content ||
        sourceChunk.excerpt ||
        sourceChunk.preview ||
        ""
    ).slice(0, 1500),

    source_metadata: {
      ...metadata,
      sourceChunkId: sourceChunk.id || metadata.sourceChunkId || null,
      authorityType: sourceChunk.authorityType || sourceChunk.authority_type || metadata.authorityType || null,
      authorityLevel: sourceChunk.authorityLevel || sourceChunk.authority_level || metadata.authorityLevel || null,
      normalizedReference:
        sourceChunk.normalizedReference ||
        sourceChunk.normalized_reference ||
        metadata.normalizedReference ||
        null,
      tinaAdaptiveQuizVersion: ENGINE_VERSION
    }
  };
}

function buildSourceContext(sourceChunks = []) {
  if (!Array.isArray(sourceChunks) || sourceChunks.length === 0) return "";

  return sourceChunks
    .map((chunk, index) => {
      const text = String(chunk.text || chunk.content || chunk.excerpt || chunk.preview || "").slice(0, 3000);

      return `
SOURCE ${index + 1}
Title: ${chunk.sourceTitle || chunk.title || chunk.originalSource || chunk.original_source || chunk.source || "Untitled"}
Path: ${chunk.sourcePath || chunk.path || chunk.source_path || chunk.metadata?.path || "No path"}
Authority Type: ${chunk.authorityType || chunk.authority_type || chunk.metadata?.authorityType || "N/A"}
Chunk Index: ${chunk.chunkIndex ?? chunk.chunk_index ?? "N/A"}
Text:
${text}
      `.trim();
    })
    .join("\n\n---\n\n");
}

function pickPrimarySourceChunk(sourceChunks = []) {
  if (!Array.isArray(sourceChunks) || sourceChunks.length === 0) return null;

  return [...sourceChunks].sort((a, b) => {
    const aLevel = Number(a.authorityLevel || a.authority_level || a.metadata?.authorityLevel || 99);
    const bLevel = Number(b.authorityLevel || b.authority_level || b.metadata?.authorityLevel || 99);

    if (aLevel !== bLevel) return aLevel - bLevel;

    const aScore = Number(a.finalScore || a.retrievalScore || a.score || 0);
    const bScore = Number(b.finalScore || b.retrievalScore || b.score || 0);

    return bScore - aScore;
  })[0];
}

/* ================= SOURCE-GROUNDED PROMPT ================= */

export function buildAdaptiveQuizPrompt({
  topic,
  difficulty,
  profile,
  sourceChunks = [],
  recentQuestions = [],
  excludeQuestionFingerprints = []
}) {
  const safeTopic = normalizeText(topic) || "General Taxation";
  const safeDifficulty = normalizeDifficulty(difficulty);
  const sourceContext = buildSourceContext(sourceChunks);

  // Combine recentQuestions text with fingerprints for a stronger deduplication signal
  const recentTexts = uniqueStrings(
    (recentQuestions || []).map((q) => q.question)
  ).slice(0, 10);

  const fingerprintTexts = uniqueStrings(excludeQuestionFingerprints || []).slice(0, 30);

  const allExcludedTexts = uniqueStrings([...recentTexts, ...fingerprintTexts]);

  const recentQuestionText = allExcludedTexts
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n");

  if (!sourceContext) {
    return `
You are TINA, an adaptive CPALE Taxation examiner.

Create ONE general Philippine taxation multiple-choice question.

Topic:
${safeTopic}

Learner skill level:
${profile?.skill_level || "beginner"}

Difficulty level:
${safeDifficulty}

STRICT RULES:
- Philippine taxation only.
- Ask only ONE question.
- Give exactly four choices: A, B, C, D.
- Randomize where the correct answer appears.
- Do not cite specific RR numbers, RMC numbers, RMO numbers, BIR rulings, case names, G.R. numbers, deadlines, tax rates, or statutory section numbers unless they appear in the retrieved indexed source context. If no indexed source is available, use general framework explanation only and say: Indexed source is limited for this topic.
- Avoid repeating recent questions.
- Return valid JSON only.
- Do not include markdown.
- Do not include extra text outside JSON.

Recent questions already asked:
${recentQuestionText || "None"}

Return this JSON structure only:

{
  "topic": "${safeTopic}",
  "subtopic": "",
  "difficulty": ${safeDifficulty},
  "question": "Question text here",
  "choices": {
    "A": "Choice A",
    "B": "Choice B",
    "C": "Choice C",
    "D": "Choice D"
  },
  "correctAnswer": "A",
  "correctAnswerText": "Exact correct answer text here",
  "explanation": "Short explanation here",
  "cpaleTrap": "Common CPALE trap here",
  "sourceSupport": "GENERAL_FALLBACK_NO_INDEXED_SOURCE",
  "validationStatus": "GENERAL_FALLBACK"
}
`.trim();
  }

  return `
You are TINA, a source-grounded CPALE Taxation examiner for Philippine taxation.

Your task is to create ONE multiple-choice question strictly from the SOURCE CONTEXT.

Topic:
${safeTopic}

Learner skill level:
${profile?.skill_level || "beginner"}

Difficulty level:
${safeDifficulty}

Difficulty guide:
1 = basic definition
2 = rule application
3 = simple computation
4 = exception or CPALE trap
5 = mixed CPALE-style scenario

SOURCE CONTEXT:
${sourceContext}

Recent questions already asked:
${recentQuestionText || "None"}

STRICT SOURCE-GROUNDED RULES:
- Create the question only from the SOURCE CONTEXT.
- The correct answer must be directly supported by the SOURCE CONTEXT.
- Do not invent legal bases, rates, deadlines, forms, exceptions, or citations not found in the SOURCE CONTEXT.
- Do not create a question if the answer cannot be supported by the SOURCE CONTEXT.
- Avoid repeating recent questions.
- Give exactly four choices: A, B, C, D.
- Randomize where the correct answer appears.
- Make the wrong choices plausible but clearly wrong based on the SOURCE CONTEXT.
- Provide a concise explanation grounded in the SOURCE CONTEXT.
- Provide one CPALE trap.
- Return valid JSON only.
- Do not include markdown.
- Do not include extra text outside JSON.

Return this JSON structure only:

{
  "topic": "${safeTopic}",
  "subtopic": "",
  "difficulty": ${safeDifficulty},
  "question": "Question text here",
  "choices": {
    "A": "Choice A",
    "B": "Choice B",
    "C": "Choice C",
    "D": "Choice D"
  },
  "correctAnswer": "A",
  "correctAnswerText": "Exact correct answer text here",
  "explanation": "Short explanation grounded in the source context",
  "cpaleTrap": "Common CPALE trap here",
  "sourceSupport": "Quote or close paraphrase from SOURCE CONTEXT that supports the answer",
  "validationStatus": "SOURCE_GROUNDED"
}
`.trim();
}

/* ================= SERVER-SIDE ANSWER SHUFFLER ================= */

// Fisher-Yates shuffle of quiz choices so the correct answer
// is not always in position A (which GPT defaults to despite prompt instructions).
function shuffleQuizChoices(quiz) {
  if (!quiz || typeof quiz.choices !== "object") return quiz;

  const letters = ["A", "B", "C", "D"];
  const correctText = quiz.choices[quiz.correctAnswer];
  if (!correctText) return quiz;

  // Collect all 4 values and shuffle them
  const values = letters.map((l) => quiz.choices[l]).filter(Boolean);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  const shuffled = {};
  for (let i = 0; i < letters.length; i++) {
    shuffled[letters[i]] = values[i];
  }

  // Re-derive correctAnswer from the shuffled positions
  const newCorrect = letters.find((l) => shuffled[l] === correctText) || quiz.correctAnswer;

  return {
    ...quiz,
    choices: shuffled,
    correctAnswer: newCorrect,
    correctAnswerText: correctText
  };
}

/* ================= JSON PARSER ================= */

export function safeParseQuizJson(text = "") {
  try {
    const cleaned = String(text || "")
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Normalize all fields before schema validation
    const normalizedCorrectAnswer = normalizeChoiceLetter(parsed.correctAnswer);

    // Accept both array format ["a","b","c","d"] and object format {A,B,C,D}
    const choiceLetters = ["A", "B", "C", "D"];
    let rawChoices = parsed.choices;
    if (Array.isArray(rawChoices)) {
      const obj = {};
      rawChoices.slice(0, 4).forEach((choice, i) => {
        if (choiceLetters[i]) {
          const choiceText = typeof choice === "string"
            ? choice
            : String(choice?.text || choice?.label || choice?.value || "");
          obj[choiceLetters[i]] = choiceText.replace(/^[A-D][.)]\s*/i, "").trim();
        }
      });
      rawChoices = obj;
    }
    const normalizedChoices = {
      A: normalizeText(String(rawChoices?.A || "")),
      B: normalizeText(String(rawChoices?.B || "")),
      C: normalizeText(String(rawChoices?.C || "")),
      D: normalizeText(String(rawChoices?.D || ""))
    };
    const candidate = {
      ...parsed,
      topic:            normalizeText(parsed.topic) || "General Taxation",
      subtopic:         normalizeText(parsed.subtopic || ""),
      difficulty:       normalizeDifficulty(parsed.difficulty || 1),
      correctAnswer:    normalizedCorrectAnswer,
      correctAnswerText: normalizeText(
        parsed.correctAnswerText || normalizedChoices[normalizedCorrectAnswer] || ""
      ),
      choices:          normalizedChoices,
      explanation:      normalizeText(parsed.explanation || ""),
      cpaleTrap:        normalizeText(parsed.cpaleTrap || ""),
      sourceSupport:    normalizeText(parsed.sourceSupport || ""),
      validationStatus: normalizeText(parsed.validationStatus || "")
    };

    const validation = safeParseQuizQuestion(candidate);
    if (!validation.ok) {
      console.error(
        "Quiz JSON schema validation failed:",
        validation.error.issues
          ?.map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
          .join("; ")
      );
      return null;
    }

    // Shuffle choices server-side so correctAnswer is not always A
    return shuffleQuizChoices(validation.data);
  } catch (error) {
    console.error("Quiz JSON parse error:", error.message);
    return null;
  }
}

/* ================= STORE QUIZ ================= */

export async function storeUnansweredQuiz(
  supabase,
  {
    userId,
    sessionId = null,
    quiz,
    mode = "ADAPTIVE_QUIZ",
    sourceChunks = []
  } = {}
) {
  if (!isSupabaseClient(supabase)) {
    return {
      saveFailed: true,
      error: "Invalid Supabase client"
    };
  }

  if (!userId || !quiz) {
    console.error("STORE QUIZ FAILED: missing userId or quiz", { userId, quiz });
    return {
      saveFailed: true,
      error: "Missing userId or quiz"
    };
  }

  let choices = quiz.choices || {};

  if (typeof choices === "string") {
    try {
      choices = JSON.parse(choices);
    } catch (error) {
      console.error("STORE QUIZ FAILED: invalid choices JSON", {
        choices,
        error: error.message
      });

      return {
        saveFailed: true,
        error: "Invalid choices JSON"
      };
    }
  }

  const correctAnswer = normalizeChoiceLetter(quiz.correctAnswer || quiz.correct_answer);
  const primarySource = normalizeSourceChunk(pickPrimarySourceChunk(sourceChunks));

  const sourceMetadata = {
    ...(primarySource?.source_metadata || {}),
    correctAnswerText: quiz.correctAnswerText || choices?.[correctAnswer] || "",
    cpaleTrap: quiz.cpaleTrap || "",
    sourceSupport: quiz.sourceSupport || "",
    validationStatus: quiz.validationStatus || "",
    tinaAdaptiveQuizVersion: ENGINE_VERSION
  };

  const explanationParts = [
    quiz.explanation ? String(quiz.explanation) : ""
  ].filter(Boolean);

  const payload = {
    user_id: String(userId),
    session_id: sessionId || null,
    mode: mode || "ADAPTIVE_QUIZ",
    topic: normalizeText(quiz.topic) || "General Taxation",
    subtopic: normalizeText(quiz.subtopic),
    difficulty: normalizeDifficulty(quiz.difficulty || 1),
    question: normalizeText(quiz.question || ""),
    choices,
    correct_answer: correctAnswer,
    user_answer: null,
    is_correct: null,
    explanation: explanationParts.join("\n"),
    source_file_id: primarySource?.source_file_id || null,
    source_title: primarySource?.source_title || null,
    source_path: primarySource?.source_path || null,
    chunk_index: primarySource?.chunk_index ?? null,
    source_excerpt: primarySource?.source_excerpt || null,
    source_metadata: sourceMetadata
  };

  if (
    !payload.question ||
    !payload.correct_answer ||
    !["A", "B", "C", "D"].includes(payload.correct_answer)
  ) {
    console.error("STORE QUIZ FAILED: invalid payload", payload);
    return {
      saveFailed: true,
      error: "Invalid quiz payload"
    };
  }

  const { data, error } = await supabase
    .from("tina_learning_attempts")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("STORE UNANSWERED QUIZ ERROR:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload
    });

    return {
      saveFailed: true,
      error
    };
  }

  return data;
}

/* ================= RETRIEVE PENDING QUIZ ================= */

export async function getLastUnansweredQuiz(supabase, userId, sessionId = null) {
  if (!isSupabaseClient(supabase) || !userId) return null;

  let query = supabase
    .from("tina_learning_attempts")
    .select("*")
    .eq("user_id", String(userId))
    .is("user_answer", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Primary unanswered quiz fetch error:", error.message);
    return null;
  }

  return data || null;
}

/* ================= ANSWER CHECKER ================= */

export async function answerLastQuiz(
  supabase,
  {
    userId,
    userAnswer,
    sessionId = null
  } = {}
) {
  const lastQuiz = await getLastUnansweredQuiz(supabase, userId, sessionId);

  if (!lastQuiz) {
    return {
      found: false,
      message: "No pending quiz question found."
    };
  }

  const cleanAnswer = normalizeChoiceLetter(userAnswer);
  const correctAnswer = normalizeChoiceLetter(lastQuiz.correct_answer);

  if (!cleanAnswer) {
    return {
      found: true,
      invalidAnswer: true,
      message: "Please answer with A, B, C, or D only.",
      attempt: lastQuiz
    };
  }

  const isCorrect = cleanAnswer === correctAnswer;

  const updatePayload = {
    user_answer: cleanAnswer,
    is_correct: isCorrect
  };

  const { data, error } = await supabase
    .from("tina_learning_attempts")
    .update(updatePayload)
    .eq("id", lastQuiz.id)
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error("Answer quiz error:", error?.message || "No row updated.");
    return {
      found: false,
      message: "Failed to save quiz answer."
    };
  }

  await updateLearnerProfileStats(supabase, {
    userId,
    topic: lastQuiz.topic,
    isCorrect
  });

  const mastery = await updateTopicMastery(supabase, {
    userId,
    topic: lastQuiz.topic,
    subtopic: lastQuiz.subtopic || "",
    isCorrect
  });

  return {
    found: true,
    isCorrect,
    correctAnswer,
    userAnswer: cleanAnswer,
    attempt: data,
    mastery,
    explanation: lastQuiz.explanation,
    topic: lastQuiz.topic,
    subtopic: lastQuiz.subtopic || "",
    difficulty: lastQuiz.difficulty,
    sourceTitle: lastQuiz.source_title || null,
    sourcePath: lastQuiz.source_path || null,
    sourceExcerpt: lastQuiz.source_excerpt || null,
    sourceMetadata: lastQuiz.source_metadata || null
  };
}

/* ================= HEALTH CHECK ================= */

export function adaptiveQuizHealthCheck() {
  return {
    ok: true,
    engine: "TINA_SOURCE_GROUNDED_ADAPTIVE_QUIZ_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    sourceGroundedCompatible: true,
    learnerProfileCompatible: true
  };
}
