// FILE: feedback-learning.js

function normalizeText(value = "") {
  return String(value || "").trim();
}

export async function storeFeedbackEntry(
  supabase,
  {
    userId,
    sessionId = null,
    messageId = null,
    originalQuestion = "",
    originalAnswer = "",
    feedbackType = "general_feedback",
    userCorrection = ""
  }
) {
  const cleanUserId = normalizeText(userId);
  const cleanQuestion = normalizeText(originalQuestion);
  const cleanAnswer = normalizeText(originalAnswer);
  const cleanFeedbackType = normalizeText(feedbackType || "general_feedback");
  const cleanCorrection = normalizeText(userCorrection);

  if (!cleanUserId) {
    throw new Error("userId is required");
  }

  if (!cleanCorrection) {
    throw new Error("userCorrection is required");
  }

  const payload = {
    user_id: cleanUserId,
    session_id: sessionId || null,
    message_id: messageId || null,
    original_question: cleanQuestion || null,
    original_answer: cleanAnswer || null,
    feedback_type: cleanFeedbackType,
    user_correction: cleanCorrection,
    status: "pending"
  };

  const { data, error } = await supabase
    .from("tina_feedback_entries")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to store feedback entry");
  }

  return data;
}

export async function listPendingFeedback(supabase) {
  const { data, error } = await supabase
    .from("tina_feedback_entries")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to list pending feedback");
  }

  return data || [];
}

export async function approveFeedbackEntry(supabase, feedbackId, reviewer) {
  const cleanFeedbackId = normalizeText(feedbackId);
  const cleanReviewer = normalizeText(reviewer);

  if (!cleanFeedbackId) {
    throw new Error("feedbackId is required");
  }

  if (!cleanReviewer) {
    throw new Error("reviewer is required");
  }

  const payload = {
    status: "approved",
    reviewed_by: cleanReviewer,
    reviewed_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("tina_feedback_entries")
    .update(payload)
    .eq("id", cleanFeedbackId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to approve feedback entry");
  }

  return data;
}

export async function rejectFeedbackEntry(
  supabase,
  feedbackId,
  reviewer,
  notes = ""
) {
  const cleanFeedbackId = normalizeText(feedbackId);
  const cleanReviewer = normalizeText(reviewer);
  const cleanNotes = normalizeText(notes);

  if (!cleanFeedbackId) {
    throw new Error("feedbackId is required");
  }

  if (!cleanReviewer) {
    throw new Error("reviewer is required");
  }

  const payload = {
    status: "rejected",
    reviewer_notes: cleanNotes || null,
    reviewed_by: cleanReviewer,
    reviewed_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("tina_feedback_entries")
    .update(payload)
    .eq("id", cleanFeedbackId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to reject feedback entry");
  }

  return data;
}

export async function applyApprovedFeedbackToKnowledge(supabase, feedbackId) {
  const cleanFeedbackId = normalizeText(feedbackId);

  if (!cleanFeedbackId) {
    throw new Error("feedbackId is required");
  }

  const { data: feedback, error: fetchError } = await supabase
    .from("tina_feedback_entries")
    .select("*")
    .eq("id", cleanFeedbackId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message || "Failed to load feedback entry");
  }

  if (!feedback) {
    throw new Error("Feedback entry not found");
  }

  if (feedback.status !== "approved") {
    throw new Error("Only approved feedback can be applied");
  }

  const { data: action, error: insertError } = await supabase
    .from("tina_feedback_learning_actions")
    .insert({
      feedback_entry_id: feedback.id,
      action_type: "manual_review_required",
      target_table: "tina_knowledge_cards",
      target_id: null,
      action_status: "pending",
      executed_at: null
    })
    .select("*")
    .single();

  if (insertError) {
    throw new Error(
      insertError.message || "Failed to create feedback learning action"
    );
  }

  return {
    feedback,
    action
  };
}
