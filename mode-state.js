/* ================= TINA MODE STATE SYSTEM ================= */

export async function getModeState(supabase, userId, sessionId = null) {
  if (!userId) return null;

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

  return data || null;
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
    lastAnswer = ""
  }
) {
  if (!userId) return null;

  const existing = await getModeState(supabase, userId, sessionId);

  const payload = {
    user_id: userId,
    session_id: sessionId,
    active_hook: activeHook,
    active_mode: activeMode,
    mode_title: modeTitle,
    last_question: lastQuestion,
    last_answer: lastAnswer,
    updated_at: new Date().toISOString()
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("tina_mode_state")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Update mode state error:", error.message);
      return null;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("tina_mode_state")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Insert mode state error:", error.message);
    return null;
  }

  return data;
}

export async function clearModeState(supabase, userId, sessionId = null) {
  if (!userId) return false;

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
  const firstWord = String(text || "").trim().split(/\s+/)[0]?.toLowerCase();

  return [
    "/ask",
    "/tax",
    "/review",
    "/quiz",
    "/feedback",
    "/source",
    "/exit",
    "/reset",
    "/mode"
  ].includes(firstWord);
}
