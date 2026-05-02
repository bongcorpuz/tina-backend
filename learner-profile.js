/* ================= TINA LEARNER PROFILE ENGINE ================= */

export async function getOrCreateLearnerProfile(supabase, userId) {
  if (!userId) return null;

  const { data: existing, error: selectError } = await supabase
    .from("tina_learner_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("Get learner profile error:", selectError.message);
    return null;
  }

  if (existing) return existing;

  const { data, error } = await supabase
    .from("tina_learner_profiles")
    .insert({
      user_id: userId,
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
  if (!userId) return null;

  const profile = await getOrCreateLearnerProfile(supabase, userId);
  if (!profile) return null;

  const totalQuestions = Number(profile.total_questions || 0) + 1;
  const correctAnswers = Number(profile.correct_answers || 0) + (isCorrect ? 1 : 0);
  const accuracyRate = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

  let skillLevel = profile.skill_level || "beginner";

  if (accuracyRate >= 0.85 && totalQuestions >= 20) skillLevel = "cpale_ready";
  else if (accuracyRate >= 0.7 && totalQuestions >= 10) skillLevel = "advanced";
  else if (accuracyRate >= 0.5 && totalQuestions >= 5) skillLevel = "intermediate";
  else skillLevel = "beginner";

  let weakTopics = Array.isArray(profile.weak_topics) ? profile.weak_topics : [];
  let strongTopics = Array.isArray(profile.strong_topics) ? profile.strong_topics : [];

  if (topic) {
    if (!isCorrect && !weakTopics.includes(topic)) {
      weakTopics.push(topic);
    }

    if (isCorrect && !strongTopics.includes(topic)) {
      strongTopics.push(topic);
    }

    if (isCorrect) {
      weakTopics = weakTopics.filter((t) => t !== topic);
    }
  }

  const { data, error } = await supabase
    .from("tina_learner_profiles")
    .update({
      skill_level: skillLevel,
      weak_topics: weakTopics,
      strong_topics: strongTopics,
      accuracy_rate: accuracyRate,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      last_reviewed_topic: topic || profile.last_reviewed_topic,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Update learner profile error:", error.message);
    return null;
  }

  return data;
}

export async function getTopicMastery(supabase, userId, topic, subtopic = "") {
  if (!userId || !topic) return null;

  const { data, error } = await supabase
    .from("tina_topic_mastery")
    .select("*")
    .eq("user_id", userId)
    .eq("topic", topic)
    .eq("subtopic", subtopic || "")
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
  if (!userId || !topic) return null;

  const existing = await getTopicMastery(supabase, userId, topic, subtopic);

  const totalAttempts = Number(existing?.total_attempts || 0) + 1;
  const correctAttempts = Number(existing?.correct_attempts || 0) + (isCorrect ? 1 : 0);
  const wrongAttempts = Number(existing?.wrong_attempts || 0) + (!isCorrect ? 1 : 0);

  const masteryScore = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

  let difficultyLevel = Number(existing?.difficulty_level || 1);

  if (isCorrect && masteryScore >= 0.75) {
    difficultyLevel = Math.min(difficultyLevel + 1, 5);
  }

  if (!isCorrect) {
    difficultyLevel = Math.max(difficultyLevel - 1, 1);
  }

  const payload = {
    user_id: userId,
    topic,
    subtopic: subtopic || "",
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
