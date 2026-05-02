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
  if (q.includes("local tax") || q.includes("business tax")) return "Local Taxation";

  return null;
}

export function pickRandomTaxTopic() {
  return TAX_TOPICS[Math.floor(Math.random() * TAX_TOPICS.length)];
}

export async function getAdaptiveQuizProfile(supabase, userId, requestedTopic = "") {
  const profile = await getOrCreateLearnerProfile(supabase, userId);

  const topic =
    detectQuizTopic(requestedTopic) ||
    requestedTopic ||
    profile?.last_reviewed_topic ||
    pickRandomTaxTopic();

  const mastery = await getTopicMastery(supabase, userId, topic, "");

  const difficulty = mastery?.difficulty_level || 1;

  return {
    profile,
    topic,
    subtopic: "",
    difficulty
  };
}

export function buildAdaptiveQuizPrompt({
  topic,
  difficulty,
  profile
}) {
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

Rules:
- Philippine taxation only.
- Ask only ONE question.
- Give exactly four choices: A, B, C, D.
- Provide the correct answer internally in the JSON.
- Provide a concise explanation.
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

export function safeParseQuizJson(text = "") {
  try {
    const cleaned = String(text || "")
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Quiz JSON parse error:", error.message);
    return null;
  }
}

export async function saveQuizAttempt(
  supabase,
  {
    userId,
    sessionId,
    mode = "ADAPTIVE_QUIZ",
    quiz,
    userAnswer,
    isCorrect
  }
) {
  if (!userId || !quiz) return null;

  const { data, error } = await supabase
    .from("tina_learning_attempts")
    .insert({
      user_id: userId,
      session_id: sessionId,
      mode,
      topic: quiz.topic,
      subtopic: quiz.subtopic || "",
      difficulty: quiz.difficulty || 1,
      question: quiz.question,
      choices: quiz.choices,
      correct_answer: quiz.correctAnswer,
      user_answer: userAnswer,
      is_correct: isCorrect,
      explanation: quiz.explanation
    })
    .select()
    .single();

  if (error) {
    console.error("Save quiz attempt error:", error.message);
    return null;
  }

  await updateLearnerProfileStats(supabase, {
    userId,
    topic: quiz.topic,
    isCorrect
  });

  await updateTopicMastery(supabase, {
    userId,
    topic: quiz.topic,
    subtopic: quiz.subtopic || "",
    isCorrect
  });

  return data;
}

export async function getLastUnansweredQuiz(supabase, userId, sessionId = null) {
  if (!userId) return null;

  let query = supabase
    .from("tina_learning_attempts")
    .select("*")
    .eq("user_id", userId)
    .is("user_answer", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Get unanswered quiz error:", error.message);
    return null;
  }

  return data || null;
}

export async function storeUnansweredQuiz(
  supabase,
  {
    userId,
    sessionId,
    quiz,
    mode = "ADAPTIVE_QUIZ"
  }
) {
  if (!userId || !quiz) return null;

  const { data, error } = await supabase
    .from("tina_learning_attempts")
    .insert({
      user_id: userId,
      session_id: sessionId,
      mode,
      topic: quiz.topic,
      subtopic: quiz.subtopic || "",
      difficulty: quiz.difficulty || 1,
      question: quiz.question,
      choices: quiz.choices,
      correct_answer: quiz.correctAnswer,
      user_answer: null,
      is_correct: null,
      explanation: quiz.explanation
    })
    .select()
    .single();

  if (error) {
    console.error("Store unanswered quiz error:", error.message);
    return null;
  }

  return data;
}

export async function answerLastQuiz(
  supabase,
  {
    userId,
    sessionId,
    userAnswer
  }
) {
  const lastQuiz = await getLastUnansweredQuiz(supabase, userId, sessionId);

  if (!lastQuiz) {
    return {
      found: false,
      message: "No pending quiz question found."
    };
  }

  const cleanAnswer = String(userAnswer || "").trim().toUpperCase();
  const correctAnswer = String(lastQuiz.correct_answer || "").trim().toUpperCase();
  const isCorrect = cleanAnswer === correctAnswer;

  const { data, error } = await supabase
    .from("tina_learning_attempts")
    .update({
      user_answer: cleanAnswer,
      is_correct: isCorrect
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

  return {
    found: true,
    isCorrect,
    correctAnswer,
    attempt: data,
    mastery,
    explanation: lastQuiz.explanation
  };
}
