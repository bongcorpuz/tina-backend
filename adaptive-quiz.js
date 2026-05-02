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

export function buildAdaptiveQuizPrompt({ topic, difficulty, profile }) {
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

export async function storeUnansweredQuiz(
  supabase,
  {
    userId,
    sessionId = null,
    quiz,
    mode = "ADAPTIVE_QUIZ"
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
    explanation: String(quiz.explanation || "")
  };

  if (!payload.question || !payload.correct_answer || !["A", "B", "C", "D"].includes(payload.correct_answer)) {
    console.error("STORE QUIZ FAILED: invalid payload", payload);
    return {
      saveFailed: true,
      error: "Invalid quiz payload"
    };
  }

  console.log("STORE QUIZ PAYLOAD:", payload);

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
    correctAnswer: data.correct_answer
  });

  return data;
}

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
    difficulty: lastQuiz.difficulty
  };
}
