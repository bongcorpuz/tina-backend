// FILE: feedback-learning.js
"use strict";

/**
 * TINA Enterprise Feedback Learning Engine
 * Version: 3.0.0
 */

const ENGINE_VERSION = "3.0.0";

/* =========================================================
 * HELPERS
 * ========================================================= */

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeLower(value = "") {
  return normalizeText(value).toLowerCase();
}

function safeJson(value) {
  if (!value || typeof value !== "object") return {};
  return value;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildAdaptiveMetadata(metadata = {}) {
  return {
    engine: "TINA_FEEDBACK_LEARNING_ENGINE",
    version: ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    ...safeJson(metadata)
  };
}

/* =========================================================
 * FEEDBACK TYPE CLASSIFICATION
 * ========================================================= */

export const FEEDBACK_TYPES = {
  GENERAL_FEEDBACK: "general_feedback",
  FACTUAL_CORRECTION: "factual_correction",
  LEGAL_CORRECTION: "legal_correction",
  CITATION_CORRECTION: "citation_correction",
  HALLUCINATION_REPORT: "hallucination_report",
  DOCTRINAL_CONFLICT: "doctrinal_conflict",
  EVIDENCE_GAP: "evidence_gap",
  RENDERING_ISSUE: "rendering_issue",
  MODE_ROUTING_ISSUE: "mode_routing_issue",
  RISK_ANALYSIS_ISSUE: "risk_analysis_issue",
  TAX_POSITION_ISSUE: "tax_position_issue",
  AUDIT_ANALYSIS_ISSUE: "audit_analysis_issue",
  TRANSACTION_CLASSIFICATION_ISSUE:
    "transaction_classification_issue",
  CONTRACT_INTERPRETATION_ISSUE:
    "contract_interpretation_issue",
  ECONOMIC_SUBSTANCE_ISSUE:
    "economic_substance_issue"
};

function normalizeFeedbackType(type = "") {
  const clean = normalizeLower(type);

  return (
    Object.values(FEEDBACK_TYPES).find(
      (item) => item === clean
    ) || FEEDBACK_TYPES.GENERAL_FEEDBACK
  );
}

/* =========================================================
 * STORE FEEDBACK
 * ========================================================= */

export async function storeFeedbackEntry(
  supabase,
  {
    userId,
    sessionId = null,
    conversationId = null,
    messageId = null,

    originalQuestion = "",
    originalAnswer = "",

    feedbackType = FEEDBACK_TYPES.GENERAL_FEEDBACK,
    userCorrection = "",

    detectedMode = null,
    adaptiveMode = null,
    plannerMode = null,

    doctrinalConflict = false,
    hallucinationRisk = false,
    evidenceGapDetected = false,

    sourcesUsed = [],
    citedAuthorities = [],

    metadata = {}
  }
) {
  const cleanUserId = normalizeText(userId);
  const cleanQuestion = normalizeText(originalQuestion);
  const cleanAnswer = normalizeText(originalAnswer);
  const cleanCorrection = normalizeText(userCorrection);

  if (!cleanUserId) {
    throw new Error("userId is required");
  }

  if (!cleanCorrection) {
    throw new Error("userCorrection is required");
  }

  const payload = {
    user_id: cleanUserId,

    session_id: normalizeText(sessionId) || null,
    conversation_id:
      normalizeText(conversationId) || null,
    message_id: normalizeText(messageId) || null,

    original_question:
      cleanQuestion || null,

    original_answer:
      cleanAnswer || null,

    feedback_type:
      normalizeFeedbackType(feedbackType),

    user_correction:
      cleanCorrection,

    detected_mode:
      normalizeText(detectedMode) || null,

    adaptive_mode:
      normalizeText(adaptiveMode) || null,

    planner_mode:
      normalizeText(plannerMode) || null,

    doctrinal_conflict:
      Boolean(doctrinalConflict),

    hallucination_risk:
      Boolean(hallucinationRisk),

    evidence_gap_detected:
      Boolean(evidenceGapDetected),

    sources_used:
      safeArray(sourcesUsed),

    cited_authorities:
      safeArray(citedAuthorities),

    metadata:
      buildAdaptiveMetadata(metadata),

    status: "pending",

    created_at:
      new Date().toISOString()
  };

  const { data, error } =
    await supabase
      .from("tina_feedback_entries")
      .insert(payload)
      .select("*")
      .single();

  if (error) {
    throw new Error(
      error.message ||
        "Failed to store feedback entry"
    );
  }

  return data;
}

/* =========================================================
 * LIST FEEDBACK
 * ========================================================= */

export async function listPendingFeedback(
  supabase,
  limit = 100
) {
  const safeLimit = Math.max(
    1,
    Math.min(Number(limit) || 100, 500)
  );

  const { data, error } =
    await supabase
      .from("tina_feedback_entries")
      .select("*")
      .eq("status", "pending")
      .order("created_at", {
        ascending: false
      })
      .limit(safeLimit);

  if (error) {
    throw new Error(
      error.message ||
        "Failed to list pending feedback"
    );
  }

  return data || [];
}

/* =========================================================
 * APPROVE FEEDBACK
 * ========================================================= */

export async function approveFeedbackEntry(
  supabase,
  feedbackId,
  reviewer,
  notes = ""
) {
  const cleanFeedbackId =
    normalizeText(feedbackId);

  const cleanReviewer =
    normalizeText(reviewer);

  const cleanNotes =
    normalizeText(notes);

  if (!cleanFeedbackId) {
    throw new Error("feedbackId is required");
  }

  if (!cleanReviewer) {
    throw new Error("reviewer is required");
  }

  const payload = {
    status: "approved",

    reviewer_notes:
      cleanNotes || null,

    reviewed_by:
      cleanReviewer,

    reviewed_at:
      new Date().toISOString()
  };

  const { data, error } =
    await supabase
      .from("tina_feedback_entries")
      .update(payload)
      .eq("id", cleanFeedbackId)
      .select("*")
      .single();

  if (error) {
    throw new Error(
      error.message ||
        "Failed to approve feedback entry"
    );
  }

  return data;
}

/* =========================================================
 * REJECT FEEDBACK
 * ========================================================= */

export async function rejectFeedbackEntry(
  supabase,
  feedbackId,
  reviewer,
  notes = ""
) {
  const cleanFeedbackId =
    normalizeText(feedbackId);

  const cleanReviewer =
    normalizeText(reviewer);

  const cleanNotes =
    normalizeText(notes);

  if (!cleanFeedbackId) {
    throw new Error("feedbackId is required");
  }

  if (!cleanReviewer) {
    throw new Error("reviewer is required");
  }

  const payload = {
    status: "rejected",

    reviewer_notes:
      cleanNotes || null,

    reviewed_by:
      cleanReviewer,

    reviewed_at:
      new Date().toISOString()
  };

  const { data, error } =
    await supabase
      .from("tina_feedback_entries")
      .update(payload)
      .eq("id", cleanFeedbackId)
      .select("*")
      .single();

  if (error) {
    throw new Error(
      error.message ||
        "Failed to reject feedback entry"
    );
  }

  return data;
}

/* =========================================================
 * APPLY APPROVED FEEDBACK
 * ========================================================= */

export async function applyApprovedFeedbackToKnowledge(
  supabase,
  feedbackId
) {
  const cleanFeedbackId =
    normalizeText(feedbackId);

  if (!cleanFeedbackId) {
    throw new Error("feedbackId is required");
  }

  const {
    data: feedback,
    error: fetchError
  } = await supabase
    .from("tina_feedback_entries")
    .select("*")
    .eq("id", cleanFeedbackId)
    .single();

  if (fetchError) {
    throw new Error(
      fetchError.message ||
        "Failed to load feedback entry"
    );
  }

  if (!feedback) {
    throw new Error(
      "Feedback entry not found"
    );
  }

  if (feedback.status !== "approved") {
    throw new Error(
      "Only approved feedback can be applied"
    );
  }

  const actionPayload = {
    feedback_entry_id:
      feedback.id,

    action_type:
      determineLearningAction(feedback),

    target_table:
      determineTargetTable(feedback),

    target_id: null,

    action_status:
      "pending",

    adaptive_metadata:
      buildAdaptiveMetadata({
        feedbackType:
          feedback.feedback_type,

        adaptiveMode:
          feedback.adaptive_mode,

        doctrinalConflict:
          feedback.doctrinal_conflict,

        hallucinationRisk:
          feedback.hallucination_risk,

        evidenceGapDetected:
          feedback.evidence_gap_detected
      }),

    executed_at: null
  };

  const {
    data: action,
    error: insertError
  } = await supabase
    .from(
      "tina_feedback_learning_actions"
    )
    .insert(actionPayload)
    .select("*")
    .single();

  if (insertError) {
    throw new Error(
      insertError.message ||
        "Failed to create feedback learning action"
    );
  }

  return {
    feedback,
    action
  };
}

/* =========================================================
 * LEARNING DECISION HELPERS
 * ========================================================= */

function determineLearningAction(
  feedback = {}
) {
  const type = normalizeFeedbackType(
    feedback.feedback_type
  );

  if (
    [
      FEEDBACK_TYPES.HALLUCINATION_REPORT,
      FEEDBACK_TYPES.LEGAL_CORRECTION,
      FEEDBACK_TYPES.CITATION_CORRECTION,
      FEEDBACK_TYPES.DOCTRINAL_CONFLICT
    ].includes(type)
  ) {
    return "priority_legal_review";
  }

  if (
    [
      FEEDBACK_TYPES.EVIDENCE_GAP,
      FEEDBACK_TYPES.CONTRACT_INTERPRETATION_ISSUE,
      FEEDBACK_TYPES.ECONOMIC_SUBSTANCE_ISSUE,
      FEEDBACK_TYPES.TRANSACTION_CLASSIFICATION_ISSUE
    ].includes(type)
  ) {
    return "evidence_pipeline_review";
  }

  if (
    [
      FEEDBACK_TYPES.MODE_ROUTING_ISSUE,
      FEEDBACK_TYPES.RENDERING_ISSUE
    ].includes(type)
  ) {
    return "adaptive_pipeline_review";
  }

  return "manual_review_required";
}

function determineTargetTable(
  feedback = {}
) {
  const type = normalizeFeedbackType(
    feedback.feedback_type
  );

  if (
    [
      FEEDBACK_TYPES.CITATION_CORRECTION,
      FEEDBACK_TYPES.LEGAL_CORRECTION,
      FEEDBACK_TYPES.DOCTRINAL_CONFLICT
    ].includes(type)
  ) {
    return "documents";
  }

  if (
    [
      FEEDBACK_TYPES.RENDERING_ISSUE,
      FEEDBACK_TYPES.MODE_ROUTING_ISSUE
    ].includes(type)
  ) {
    return "tina_mode_state";
  }

  return "tina_knowledge_cards";
}

/* =========================================================
 * ANALYTICS
 * ========================================================= */

export async function summarizeFeedbackStats(
  supabase
) {
  const { data, error } =
    await supabase
      .from("tina_feedback_entries")
      .select("feedback_type,status");

  if (error) {
    throw new Error(
      error.message ||
        "Failed to summarize feedback stats"
    );
  }

  const rows = data || [];

  const summary = {
    total: rows.length,
    approved: 0,
    rejected: 0,
    pending: 0,
    byType: {}
  };

  for (const row of rows) {
    const type =
      row.feedback_type ||
      FEEDBACK_TYPES.GENERAL_FEEDBACK;

    summary.byType[type] =
      (summary.byType[type] || 0) + 1;

    if (row.status === "approved") {
      summary.approved += 1;
    } else if (
      row.status === "rejected"
    ) {
      summary.rejected += 1;
    } else {
      summary.pending += 1;
    }
  }

  return summary;
}

/* =========================================================
 * HEALTH CHECK
 * ========================================================= */

export function feedbackLearningHealthCheck() {
  return {
    ok: true,
    engine:
      "TINA_FEEDBACK_LEARNING_ENGINE",
    version: ENGINE_VERSION,

    adaptiveCompatible: true,
    plannerCompatible: true,
    rendererCompatible: true,
    doctrinalCompatible: true,
    evidenceCompatible: true,
    supabaseCompatible: true
  };
}

export default {
  FEEDBACK_TYPES,

  storeFeedbackEntry,
  listPendingFeedback,

  approveFeedbackEntry,
  rejectFeedbackEntry,

  applyApprovedFeedbackToKnowledge,

  summarizeFeedbackStats,

  feedbackLearningHealthCheck
};
