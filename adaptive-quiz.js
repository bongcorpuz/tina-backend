/* ================= TINA ADAPTIVE QUIZ ENGINE ================= */

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

/* ================= TOPIC DETECTION ================= */

export function detectQuizTopic(text = "") {
  const q = String(text || "").toLowerCase();

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

  const topic =
    detectQuizTopic(requestedTopic) ||
    requestedTopic ||
    profile?.last_reviewed_topic ||
    pickRandomTaxTopic();

  const mastery = await getTopicMastery(supabase, userId, topic, "");
  const difficulty = Number(mastery?.difficulty_level || 1);

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
${String(chunk.text || "").slice(0, 2500)}
      `.trim();
    })
    .join("\n\n---\n\n");
}

function pickPrimarySourceChunk(sourceChunks = []) {
  if (!Array.isArray(sourceChunks) || sourceChunks.length === 0) return null;
  return sourceChunks[0] || null;
}

/* ================= PROMPTS ================= */

export function buildAdaptiveQuizPrompt({
  topic,
  difficulty,
  profile,
  sourceChunks = [],
  recentQuestions = []
}) {
  const sourceContext = buildSourceContext(sourceChunks);

  const recentQuestionText = (recentQuestions || [])
    .map((q, i) => `${i + 1}. ${q.question}`)
    .join("\n");

  const sourceInstruction = sourceContext
    ? `
SOURCE CONTEXT:
${sourceContext}

STRICT SOURCE RULES:
- Create the question primarily from the SOURCE CONTEXT.
- Do not invent legal bases not found in the SOURCE CONTEXT.
- If the source is incomplete, ask a conceptual question only from what is shown.
- The explanation must be supported by the SOURCE CONTEXT.
`
    : `
SOURCE CONTEXT:
No indexed source chunk was provided.

GENERAL FALLBACK RULES:
- Create a general Philippine taxation CPALE-style question.
- Do not cite a specific RR, RMC, RMO, case, date, section, form, rate, or deadline unless certain.
`;

  return `
You are TINA, an adaptive CPALE Taxation examiner.

Create ONE multiple-choice question.

Topic:
${topic}

Learner skill level:
${profile?.skill_level || "beginner"}

Difficulty level:
${difficulty}

Difficulty guide:
1 = basic definition
2 = rule application
3 = simple computation
4 = exception or CPALE trap
5 = mixed CPALE-style scenario

${sourceInstruction}

Recent questions already asked:
${recentQuestionText || "None"}

Rules:
- Philippine taxation only.
- Ask only ONE question.
- Give exactly four choices: A, B, C, D.
- Avoid repeating recent questions.
- Provide the correct answer internally in JSON.
- Provide a concise explanation.
- Provide a CPALE trap.
- Do not include markdown.
- Do not include extra text outside JSON.

Return valid JSON only using this structure:

{
  "topic": "${topic}",
  "subtopic": "",
  "difficulty": ${difficulty},
  "question": "Question text here",
  "choices": {
    "A": "Choice A",
    "B": "Choice B",
    "C": "Choice C",
    "D": "Choice D"
  },
  "correctAnswer": "A",
  "explanation": "Short explanation here",
  "cpaleTrap": "Common CPALE trap here"
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

    parsed.topic = parsed.topic || "General Taxation";
    parsed.subtopic = parsed.subtopic || "";
    parsed.difficulty = Number(parsed.difficulty || 1);
    parsed.correctAnswer = String(parsed.correctAnswer).trim().toUpperCase();

    if (!["A", "B", "C", "D"].includes(parsed.correctAnswer)) {
      console.error("Quiz JSON invalid correctAnswer.");
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

  const payload = {
    user_id: String(userId),
    session_id: sessionId || null,
    mode: mode || "ADAPTIVE_QUIZ",
    topic: quiz.topic || "General Taxation",
    subtopic: quiz.subtopic || "",
    difficulty: Number(quiz.difficulty || 1),
    question: String(quiz.question || ""),
    choices,
    correct_answer: String(quiz.correctAnswer || quiz.correct_answer || "")
      .trim()
      .toUpperCase(),
    user_answer: null,
    is_correct: null,
    explanation: String(quiz.explanation || ""),
    source_file_id: primarySource?.source_file_id || null,
    source_title: primarySource?.source_title || null,
    source_path: primarySource?.source_path || null,
    chunk_index: primarySource?.chunk_index ?? null,
    source_excerpt: primarySource?.source_excerpt || null,
    source_metadata: primarySource?.source_metadata || {}
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

  console.log("STORE QUIZ PAYLOAD:", {
    ...payload,
    source_excerpt: payload.source_excerpt
      ? payload.source_excerpt.slice(0, 150)
      : null
  });

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

  console.log("QUIZ STORED SUCCESSFULLY:", {
    id: data.id,
    userId: data.user_id,
    topic: data.topic,
    correctAnswer: data.correct_answer,
    sourceTitle: data.source_title
  });

  return data;
}

/* ================= RETRIEVE PENDING QUIZ ================= */

export async function getLastUnansweredQuiz(supabase, userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("tina_learning_attempts")
    .select("*")
    .eq("user_id", String(userId))
    .is("user_answer", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Get latest unanswered quiz error:", error.message);
    return null;
  }

  return data || null;
}

/* ================= ANSWER CHECKER ================= */

export async function answerLastQuiz(
  supabase,
  {
    userId,
    userAnswer
  }
) {
  console.log("FETCHING LATEST UNANSWERED QUIZ FOR USER:", {
    userId,
    userAnswer
  });

  const lastQuiz = await getLastUnansweredQuiz(supabase, userId);

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

  const { data, error } = await supabase
    .from("tina_learning_attempts")
    .update({
      user_answer: cleanAnswer,
      is_correct: isCorrect,
      answered_at: new Date().toISOString()
    })
    .eq("id", lastQuiz.id)
    .select()
    .single();

  if (error) {
    console.error("Answer quiz error:", error.message);
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

  console.log("QUIZ ANSWER RECORDED:", {
    quizId: lastQuiz.id,
    topic: lastQuiz.topic,
    userAnswer: cleanAnswer,
    correctAnswer,
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
