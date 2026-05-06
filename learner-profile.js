// FILE: learner-profile.js

/* ================= TINA LEARNER PROFILE ENGINE ================= */

function normalizeText(value = "") {
  return String(value || "").trim();
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((item) => normalizeText(item)).filter(Boolean))];
}

function toSafeRatio(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(1, num));
}

function toSafeInt(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.floor(num));
}

function inferSkillLevel({ accuracyRate = 0, totalQuestions = 0 }) {
  if (accuracyRate >= 0.85 && totalQuestions >= 20) return "cpale_ready";
  if (accuracyRate >= 0.7 && totalQuestions >= 10) return "advanced";
  if (accuracyRate >= 0.5 && totalQuestions >= 5) return "intermediate";
  return "beginner";
}

export async function getOrCreateLearnerProfile(supabase, userId) {
  const cleanUserId = normalizeText(userId);
  if (!supabase || !cleanUserId) return null;

  const { data: existing, error: selectError } = await supabase
    .from("tina_learner_profiles")
    .select("*")
    .eq("user_id", cleanUserId)
    .maybeSingle();

  if (selectError) {
    console.error("Get learner profile error:", selectError.message);
    return null;
  }

  if (existing) return existing;

  const { data, error } = await supabase
    .from("tina_learner_profiles")
    .insert({
      user_id: cleanUserId,
      skill_level: "beginner",
      learning_goal: "CPALE",
      preferred_style: "reviewer"
    })
    .select()
    .single();

  if (error) {
    console.error("Create learner profile error:", error.message);
    return null;
  }

  return data;
}

export async function updateLearnerProfileStats(
  supabase,
  {
    userId,
    topic,
    isCorrect
  }
) {
  const cleanUserId = normalizeText(userId);
  const cleanTopic = normalizeText(topic);

  if (!supabase || !cleanUserId) return null;

  const profile = await getOrCreateLearnerProfile(supabase, cleanUserId);
  if (!profile) return null;

  const totalQuestions = toSafeInt(profile.total_questions, 0) + 1;
  const correctAnswers =
    toSafeInt(profile.correct_answers, 0) + (isCorrect ? 1 : 0);
  const accuracyRate =
    totalQuestions > 0 ? toSafeRatio(correctAnswers / totalQuestions, 0) : 0;

  const skillLevel = inferSkillLevel({
    accuracyRate,
    totalQuestions
  });

  let weakTopics = Array.isArray(profile.weak_topics) ? profile.weak_topics : [];
  let strongTopics = Array.isArray(profile.strong_topics) ? profile.strong_topics : [];

  weakTopics = uniqueStrings(weakTopics);
  strongTopics = uniqueStrings(strongTopics);

  if (cleanTopic) {
    if (!isCorrect && !weakTopics.includes(cleanTopic)) {
      weakTopics.push(cleanTopic);
    }

    if (isCorrect && !strongTopics.includes(cleanTopic)) {
      strongTopics.push(cleanTopic);
    }

    if (isCorrect) {
      weakTopics = weakTopics.filter((item) => item !== cleanTopic);
    }

    if (!isCorrect) {
      strongTopics = strongTopics.filter((item) => item !== cleanTopic);
    }
  }

  const { data, error } = await supabase
    .from("tina_learner_profiles")
    .update({
      skill_level: skillLevel,
      weak_topics: uniqueStrings(weakTopics),
      strong_topics: uniqueStrings(strongTopics),
      accuracy_rate: accuracyRate,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      last_reviewed_topic: cleanTopic || profile.last_reviewed_topic,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", cleanUserId)
    .select()
    .single();

  if (error) {
    console.error("Update learner profile error:", error.message);
    return null;
  }

  return data;
}

export async function getTopicMastery(supabase, userId, topic, subtopic = "") {
  const cleanUserId = normalizeText(userId);
  const cleanTopic = normalizeText(topic);
  const cleanSubtopic = normalizeText(subtopic);

  if (!supabase || !cleanUserId || !cleanTopic) return null;

  const { data, error } = await supabase
    .from("tina_topic_mastery")
    .select("*")
    .eq("user_id", cleanUserId)
    .eq("topic", cleanTopic)
    .eq("subtopic", cleanSubtopic)
    .maybeSingle();

  if (error) {
    console.error("Get topic mastery error:", error.message);
    return null;
  }

  return data || null;
}

export async function updateTopicMastery(
  supabase,
  {
    userId,
    topic,
    subtopic = "",
    isCorrect
  }
) {
  const cleanUserId = normalizeText(userId);
  const cleanTopic = normalizeText(topic);
  const cleanSubtopic = normalizeText(subtopic);

  if (!supabase || !cleanUserId || !cleanTopic) return null;

  const existing = await getTopicMastery(
    supabase,
    cleanUserId,
    cleanTopic,
    cleanSubtopic
  );

  const totalAttempts = toSafeInt(existing?.total_attempts, 0) + 1;
  const correctAttempts =
    toSafeInt(existing?.correct_attempts, 0) + (isCorrect ? 1 : 0);
  const wrongAttempts =
    toSafeInt(existing?.wrong_attempts, 0) + (!isCorrect ? 1 : 0);

  const masteryScore =
    totalAttempts > 0 ? toSafeRatio(correctAttempts / totalAttempts, 0) : 0;

  let difficultyLevel = toSafeInt(existing?.difficulty_level, 1) || 1;

  if (isCorrect && masteryScore >= 0.75) {
    difficultyLevel = Math.min(difficultyLevel + 1, 5);
  }

  if (!isCorrect) {
    difficultyLevel = Math.max(difficultyLevel - 1, 1);
  }

  const payload = {
    user_id: cleanUserId,
    topic: cleanTopic,
    subtopic: cleanSubtopic,
    mastery_score: masteryScore,
    total_attempts: totalAttempts,
    correct_attempts: correctAttempts,
    wrong_attempts: wrongAttempts,
    difficulty_level: difficultyLevel,
    last_attempt_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("tina_topic_mastery")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Update topic mastery error:", error.message);
      return null;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("tina_topic_mastery")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Insert topic mastery error:", error.message);
    return null;
  }

  return data;
}
