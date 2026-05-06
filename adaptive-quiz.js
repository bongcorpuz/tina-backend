// FILE: adaptive-quiz.js

/* ================= TINA SOURCE-GROUNDED ADAPTIVE QUIZ ENGINE ================= */

import {
  getOrCreateLearnerProfile,
  updateLearnerProfileStats,
  getTopicMastery,
  updateTopicMastery
} from "./learner-profile.js";

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

/* ================= TOPIC DETECTION ================= */

export function detectQuizTopic(text = "") {
  const q = lower(text);

  if (q.includes("vat") || q.includes("value-added")) return "VAT";
  if (q.includes("withholding") || q.includes("ewt") || q.includes("cwt")) return "Withholding Tax";
  if (
    q.includes("income tax") ||
    q.includes("rcit") ||
    q.includes("mcit") ||
    q.includes("nolco")
  ) return "Income Tax";
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
    limit = 20
  }
) {
  if (!userId) return [];

  let query = supabase
    .from("tina_learning_attempts")
    .select("id, topic, subtopic, question, source_path, chunk_index, created_at")
    .eq("user_id", String(userId))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (topic) {
    query = query.eq("topic", topic);
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

  for (const item of history || []) {
    if (item.source_path && !excludeSourcePaths.includes(item.source_path)) {
      excludeSourcePaths.push(item.source_path);
    }

    if (item.id && !excludeChunkIds.includes(String(item.id))) {
      excludeChunkIds.push(String(item.id));
    }
  }

  return {
    excludeSourcePaths,
    excludeChunkIds
  };
}

/* ================= SOURCE HELPERS ================= */

function normalizeSourceChunk(sourceChunk = null) {
  if (!sourceChunk) return null;

  return {
    source_file_id: sourceChunk.fileId || sourceChunk.metadata?.fileId || null,
    source_title:
      sourceChunk.sourceTitle ||
      sourceChunk.metadata?.originalFileName ||
      sourceChunk.originalSource ||
      sourceChunk.source ||
      null,
    source_path:
      sourceChunk.sourcePath ||
      sourceChunk.metadata?.path ||
      sourceChunk.originalSource ||
      sourceChunk.source ||
      null,
    chunk_index:
      typeof sourceChunk.chunkIndex === "number"
        ? sourceChunk.chunkIndex
        : sourceChunk.chunk_index ?? null,
    source_excerpt: String(sourceChunk.text || "").slice(0, 1500),
    source_metadata: sourceChunk.metadata || {}
  };
}

function buildSourceContext(sourceChunks = []) {
  if (!Array.isArray(sourceChunks) || sourceChunks.length === 0) {
    return "";
  }

  return sourceChunks
    .map((chunk, index) => {
      return `
SOURCE ${index + 1}
Title: ${chunk.sourceTitle || chunk.originalSource || chunk.source || "Untitled"}
Path: ${chunk.sourcePath || chunk.metadata?.path || "No path"}
Chunk Index: ${chunk.chunkIndex ?? chunk.chunk_index ?? "N/A"}
Text:
${String(chunk.text || "").slice(0, 3000)}
      `.trim();
    })
    .join("\n\n---\n\n");
}

function pickPrimarySourceChunk(sourceChunks = []) {
  if (!Array.isArray(sourceChunks) || sourceChunks.length === 0) return null;
  return sourceChunks[0] || null;
}

/* ================= SOURCE-GROUNDED PROMPT ================= */

export function buildAdaptiveQuizPrompt({
  topic,
  difficulty,
  profile,
  sourceChunks = [],
  recentQuestions = []
}) {
  const safeTopic = normalizeText(topic) || "General Taxation";
  const safeDifficulty = normalizeDifficulty(difficulty);
  const sourceContext = buildSourceContext(sourceChunks);

  const recentQuestionText = uniqueStrings(
    (recentQuestions || []).map((q) => q.question)
  )
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
- Do not cite a specific RR, RMC, RMO, case, date, section, form, rate, or deadline unless certain.
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

/* ================= JSON PARSER ================= */

export function safeParseQuizJson(text = "") {
  try {
    const cleaned = String(text || "")
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    if (
      !parsed.question ||
      !parsed.choices ||
      !parsed.choices.A ||
      !parsed.choices.B ||
      !parsed.choices.C ||
      !parsed.choices.D ||
      !parsed.correctAnswer
    ) {
      console.error("Quiz JSON invalid structure.");
      return null;
    }

    parsed.topic = normalizeText(parsed.topic) || "General Taxation";
    parsed.subtopic = normalizeText(parsed.subtopic);
    parsed.difficulty = normalizeDifficulty(parsed.difficulty || 1);
    parsed.correctAnswer = String(parsed.correctAnswer).trim().toUpperCase();

    if (!["A", "B", "C", "D"].includes(parsed.correctAnswer)) {
      console.error("Quiz JSON invalid correctAnswer.");
      return null;
    }

    parsed.correctAnswerText = normalizeText(parsed.correctAnswerText || "");
    parsed.explanation = normalizeText(parsed.explanation || "");
    parsed.cpaleTrap = normalizeText(parsed.cpaleTrap || "");
    parsed.sourceSupport = normalizeText(parsed.sourceSupport || "");
    parsed.validationStatus = normalizeText(parsed.validationStatus || "UNVALIDATED");

    parsed.choices = {
      A: normalizeText(parsed.choices.A),
      B: normalizeText(parsed.choices.B),
      C: normalizeText(parsed.choices.C),
      D: normalizeText(parsed.choices.D)
    };

    if (!parsed.choices.A || !parsed.choices.B || !parsed.choices.C || !parsed.choices.D) {
      console.error("Quiz JSON invalid choices.");
      return null;
    }

    return parsed;
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
  }
) {
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

  const primarySource = normalizeSourceChunk(pickPrimarySourceChunk(sourceChunks));

  const sourceMetadata = {
    ...(primarySource?.source_metadata || {}),
    correctAnswerText: quiz.correctAnswerText || "",
    cpaleTrap: quiz.cpaleTrap || "",
    sourceSupport: quiz.sourceSupport || "",
    validationStatus: quiz.validationStatus || "UNVALIDATED"
  };

  const explanationParts = [
    quiz.explanation ? String(quiz.explanation) : "",
    quiz.cpaleTrap ? `CPALE Trap: ${quiz.cpaleTrap}` : "",
    quiz.sourceSupport ? `Source Support: ${quiz.sourceSupport}` : "",
    quiz.validationStatus ? `Validation: ${quiz.validationStatus}` : ""
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
    correct_answer: String(quiz.correctAnswer || quiz.correct_answer || "")
      .trim()
      .toUpperCase(),
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
  if (!userId) return null;

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

  let { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Primary unanswered quiz fetch error:", error.message);
  }

  if (data) return data;

  if (sessionId) {
    return null;
  }

  const fallback = await supabase
    .from("tina_learning_attempts")
    .select("*")
    .is("user_answer", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallback.error) {
    console.error("Fallback unanswered quiz fetch error:", fallback.error.message);
    return null;
  }

  return fallback.data || null;
}

/* ================= ANSWER CHECKER ================= */

export async function answerLastQuiz(
  supabase,
  {
    userId,
    userAnswer,
    sessionId = null
  }
) {
  const lastQuiz = await getLastUnansweredQuiz(supabase, userId, sessionId);

  if (!lastQuiz) {
    return {
      found: false,
      message: "No pending quiz question found."
    };
  }

  const cleanAnswer = String(userAnswer || "")
    .replace(/[^A-Da-d]/g, "")
    .trim()
    .toUpperCase();

  const correctAnswer = String(lastQuiz.correct_answer || "")
    .replace(/[^A-Da-d]/g, "")
    .trim()
    .toUpperCase();

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
