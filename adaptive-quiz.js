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

/* ================= TOPIC DETECTION ================= */

export function detectQuizTopic(text = "") {
  const q = String(text || "").toLowerCase();

  if (q.includes("vat") || q.includes("value-added")) return "VAT";
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

export async function getAdaptiveQuizProfile(supabase, userId, requestedTopic = "") {
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

  if (topic) query = query.eq("topic", topic);

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
    source_excerpt: String(sourceChunk.text || "").slice(0, 2000),
    source_metadata: sourceChunk.metadata || {}
  };
}

function pickPrimarySourceChunk(sourceChunks = []) {
  if (!Array.isArray(sourceChunks) || sourceChunks.length === 0) return null;
  return sourceChunks[0] || null;
}

function buildSourceContext(sourceChunks = []) {
  if (!Array.isArray(sourceChunks) || sourceChunks.length === 0) return "";

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

function answerTextFromQuiz(quiz) {
  const letter = String(quiz.correctAnswer || quiz.correct_answer || "")
    .trim()
    .toUpperCase();

  return quiz?.choices?.[letter] || "";
}

function validateQuizAgainstSource(quiz, sourceChunks = []) {
  if (!quiz) {
    return {
      ok: false,
      reason: "No quiz object."
    };
  }

  if (!Array.isArray(sourceChunks) || sourceChunks.length === 0) {
    return {
      ok: true,
      reason: "No source chunks provided; general fallback quiz."
    };
  }

  const sourceText = sourceChunks
    .map((s) => String(s.text || "").toLowerCase())
    .join(" ");

  const correctText = String(answerTextFromQuiz(quiz) || "")
    .toLowerCase()
    .replace(/[^\w\s%-]/g, "")
    .trim();

  const explanation = String(quiz.explanation || "").toLowerCase();

  const hasSomeAnswerSupport =
    correctText.length >= 3 &&
    correctText
      .split(/\s+/)
     
