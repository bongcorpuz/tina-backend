// FILE: mode-state.js
"use strict";

/* ================= TINA MODE STATE SYSTEM ================= */

const ENGINE_VERSION = "2.2.0";

const LEGACY_TO_ADAPTIVE_MODE = Object.freeze({
  ASK: "STANDARD_TAX_MODE",
  TAX_EXPERT: "TECHNICAL_TAX_MODE",
  TAX_REVIEWER: "REVIEWER_LEARNING_MODE",
  QUIZ_MASTER: "REVIEWER_LEARNING_MODE",
  ADAPTIVE_QUIZ: "REVIEWER_LEARNING_MODE",
  SOURCE_FINDER: "STANDARD_TAX_MODE",
  FEEDBACK: "STANDARD_TAX_MODE",
  LEARNING_PROGRESS: "REVIEWER_LEARNING_MODE"
});

const HOOK_TO_LEGACY_MODE = Object.freeze({
  "/ask": "ASK",
  "/tax": "TAX_EXPERT",
  "/review": "TAX_REVIEWER",
  "/quiz": "QUIZ_MASTER",
  "/diagnostic": "TAX_REVIEWER",
  "/progress": "LEARNING_PROGRESS",
  "/feedback": "FEEDBACK",
  "/source": "SOURCE_FINDER"
});

function normalizeText(value = "") {
  return String(value || "").trim();
}

function isSupabaseClient(value) {
  return Boolean(value) && typeof value.from === "function";
}

function normalizeLegacyMode(mode = "ASK") {
  const value = normalizeText(mode).toUpperCase();
  return value || "ASK";
}

function normalizeAdaptiveMode(mode = "STANDARD_TAX_MODE") {
  const value = normalizeText(mode).toUpperCase();

  if (LEGACY_TO_ADAPTIVE_MODE[value]) {
    return LEGACY_TO_ADAPTIVE_MODE[value];
  }

  if (value.includes("AUDIT")) return "AUDIT_MODE";
  if (value.includes("LITIGATION") || value.includes("LEGAL")) {
    return "LITIGATION_LEGAL_DEFENSE_MODE";
  }
  if (value.includes("TRANSACTION")) return "TRANSACTION_CHARACTERIZATION_MODE";
  if (value.includes("CONTRACT")) return "CONTRACT_INTERPRETATION_MODE";
  if (value.includes("EVIDENCE")) return "EVIDENCE_EVALUATION_MODE";
  if (value.includes("FACT")) return "FACT_PATTERN_ANALYSIS_MODE";
  if (value.includes("REVIEW") || value.includes("QUIZ") || value.includes("LEARNING")) {
    return "REVIEWER_LEARNING_MODE";
  }
  if (value.includes("TECHNICAL") || value.includes("DOCTRINE")) {
    return "TECHNICAL_TAX_MODE";
  }
  if (value.includes("QUICK")) return "QUICK_MODE";

  return "STANDARD_TAX_MODE";
}

function normalizeHook(hook = "/ask") {
  const value = normalizeText(hook).toLowerCase();
  return value.startsWith("/") ? value : `/${value || "ask"}`;
}

function deriveLegacyMode(activeHook = "/ask", activeMode = "ASK") {
  const hook = normalizeHook(activeHook);
  const mode = normalizeLegacyMode(activeMode);

  return HOOK_TO_LEGACY_MODE[hook] || mode || "ASK";
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

export async function getModeState(supabase, userId, sessionId = null) {
  if (!isSupabaseClient(supabase) || !userId) return null;

  let query = supabase
    .from("tina_mode_state")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Get mode state error:", error.message);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    adaptive_context: safeJson(data.adaptive_context, {}),
    response_plan: safeJson(data.response_plan, {}),
    risk_snapshot: safeJson(data.risk_snapshot, {}),
    mode_metadata: safeJson(data.mode_metadata, {})
  };
}

export async function saveModeState(
  supabase,
  {
    userId,
    sessionId = null,
    activeHook = "/ask",
    activeMode = "ASK",
    modeTitle = "Default TINA Assistant",
    lastQuestion = "",
    lastAnswer = "",

    adaptiveMode = null,
    adaptiveContext = {},
    responsePlan = {},
    riskSnapshot = {},
    modeMetadata = {}
  }
) {
  if (!isSupabaseClient(supabase) || !userId) return null;

  const normalizedHook = normalizeHook(activeHook);
  const legacyMode = deriveLegacyMode(normalizedHook, activeMode);
  const normalizedAdaptiveMode = normalizeAdaptiveMode(adaptiveMode || legacyMode);

  const payload = {
    user_id: userId,
    session_id: sessionId,
    active_hook: normalizedHook,
    active_mode: legacyMode,
    adaptive_mode: normalizedAdaptiveMode,
    mode_title: normalizeText(modeTitle) || "Default TINA Assistant",
    last_question: normalizeText(lastQuestion),
    last_answer: normalizeText(lastAnswer),
    adaptive_context: adaptiveContext || {},
    response_plan: responsePlan || {},
    risk_snapshot: riskSnapshot || {},
    mode_metadata: {
      ...(modeMetadata || {}),
      tinaModeStateVersion: ENGINE_VERSION,
      normalizedAt: new Date().toISOString()
    },
    updated_at: new Date().toISOString()
  };

  const existing = await getModeState(supabase, userId, sessionId);

  // Remove mode_metadata from payload if schema hasn't been migrated yet.
  function withoutMissingCol(p, colName) {
    const { [colName]: _dropped, ...rest } = p;
    return rest;
  }

  if (existing?.id) {
    let { data, error } = await supabase
      .from("tina_mode_state")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();

    if (error?.message?.includes("mode_metadata")) {
      const retry = await supabase
        .from("tina_mode_state")
        .update(withoutMissingCol(payload, "mode_metadata"))
        .eq("id", existing.id)
        .select()
        .single();
      if (retry.error) console.error("Update mode state error:", retry.error.message);
      return retry.data ?? null;
    }

    if (error) {
      console.error("Update mode state error:", error.message);
      return null;
    }

    return data;
  }

  let { data, error } = await supabase
    .from("tina_mode_state")
    .insert(payload)
    .select()
    .single();

  if (error?.message?.includes("mode_metadata")) {
    const retry = await supabase
      .from("tina_mode_state")
      .insert(withoutMissingCol(payload, "mode_metadata"))
      .select()
      .single();
    if (retry.error) console.error("Insert mode state error:", retry.error.message);
    return retry.data ?? null;
  }

  if (error) {
    console.error("Insert mode state error:", error.message);
    return null;
  }

  return data;
}

export async function clearModeState(supabase, userId, sessionId = null) {
  if (!isSupabaseClient(supabase) || !userId) return false;

  let query = supabase
    .from("tina_mode_state")
    .delete()
    .eq("user_id", userId);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { error } = await query;

  if (error) {
    console.error("Clear mode state error:", error.message);
    return false;
  }

  return true;
}

export function isExplicitModeHook(text = "") {
  const firstWord = String(text || "")
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase();

  return [
    "/ask",
    "/tax",
    "/review",
    "/quiz",
    "/diagnostic",
    "/progress",
    "/feedback",
    "/source",
    "/bye",
    "/exit",
    "/stop",
    "/quit",
    "/reset",
    "/mode"
  ].includes(firstWord);
}

export function parseModeHook(text = "") {
  const firstWord = String(text || "")
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase();

  if (!isExplicitModeHook(firstWord)) {
    return {
      hasHook: false,
      hook: null,
      legacyMode: null,
      adaptiveMode: null
    };
  }

  const hook = normalizeHook(firstWord);
  const legacyMode = HOOK_TO_LEGACY_MODE[hook] || "ASK";

  return {
    hasHook: true,
    hook,
    legacyMode,
    adaptiveMode: normalizeAdaptiveMode(legacyMode)
  };
}

export function stripModeHook(text = "") {
  if (!isExplicitModeHook(text)) return String(text || "").trim();

  return String(text || "")
    .trim()
    .split(/\s+/)
    .slice(1)
    .join(" ")
    .trim();
}

export function modeStateHealthCheck() {
  return {
    ok: true,
    engine: "TINA_MODE_STATE_SYSTEM",
    version: ENGINE_VERSION,
    legacyModeCompatible: true,
    adaptiveModeCompatible: true
  };
}
