// FILE: memory-hooks.js

function normalizeText(value = "") {
  return String(value || "").trim();
}

/* =========================================================
   GET LAST TOPIC STATE
========================================================= */

export async function getLastTopicState(supabase, userId, sessionId) {
  if (!supabase || !sessionId) return null;

  let query = supabase
    .from("tina_topic_state")
    .select("*")
    .eq("session_id", sessionId);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("getLastTopicState error:", error.message);
    return null;
  }

  return data || null;
}

/* =========================================================
   SAVE / UPDATE TOPIC STATE
========================================================= */

export async function saveTopicState(
  supabase,
  {
    userId = null,
    sessionId,
    topic = "general",
    subject = "general",
    taxType = "general",
    question = "",
    answer = ""
  }
) {
  if (!supabase || !sessionId) return null;

  const payload = {
    user_id: userId || null,
    session_id: sessionId,
    current_topic: topic || "general",
    current_subject: subject || question || "general",
    current_tax_type: taxType || "general",
    last_question: question || "",
    last_answer: answer || "",
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("tina_topic_state")
    .upsert(payload, { onConflict: "session_id" })
    .select()
    .maybeSingle();

  if (error) {
    console.error("saveTopicState error:", error.message);
    return null;
  }

  return data || null;
}

/* =========================================================
   SAVE CONVERSATION MEMORY
========================================================= */

export async function saveConversationMemory(
  supabase,
  {
    userId = null,
    sessionId = null,
    role,
    content,
    topic = "general",
    subject = "general",
    taxType = "general",
    source = "chat"
  }
) {
  if (!supabase || !content || !role) return null;

  const { data, error } = await supabase
    .from("tina_conversation_memory")
    .insert({
      user_id: userId || null,
      session_id: sessionId || null,
      role,
      content,
      topic: topic || "general",
      subject: subject || "general",
      tax_type: taxType || "general",
      source: source || "chat"
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error("saveConversationMemory error:", error.message);
    return null;
  }

  return data || null;
}

/* =========================================================
   GET RECENT CONVERSATION MEMORY
========================================================= */

export async function getRecentConversationMemory(
  supabase,
  userId,
  sessionId,
  limit = 8
) {
  if (!supabase || !sessionId) return [];

  let query = supabase
    .from("tina_conversation_memory")
    .select("role, content, topic, subject, tax_type, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getRecentConversationMemory error:", error.message);
    return [];
  }

  return (data || []).reverse();
}

/* =========================================================
   SAVE LONG-TERM MEMORY
========================================================= */

export async function saveLongTermMemory(
  supabase,
  {
    userId = null,
    memoryType = "preference",
    memoryKey,
    memoryValue,
    confidence = 0.8,
    source = "chat"
  }
) {
  if (!supabase || !memoryKey || !memoryValue) return null;

  const payload = {
    user_id: userId || null,
    memory_type: memoryType || "preference",
    memory_key: memoryKey,
    memory_value: memoryValue,
    confidence,
    source: source || "chat",
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("tina_long_term_memory")
    .upsert(payload, { onConflict: "user_id,memory_key" })
    .select()
    .maybeSingle();

  if (error) {
    console.error("saveLongTermMemory error:", error.message);
    return null;
  }

  return data || null;
}

/* =========================================================
   GET LONG-TERM MEMORY
========================================================= */

export async function getLongTermMemory(supabase, userId, limit = 10) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("tina_long_term_memory")
    .select("memory_type, memory_key, memory_value, confidence, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getLongTermMemory error:", error.message);
    return [];
  }

  return data || [];
}

/* =========================================================
   EXTRACT MEMORY HOOKS
   Required by server.js
========================================================= */

export function extractMemoryHooks(text = "") {
  const content = normalizeText(text);
  if (!content) return [];

  const lower = content.toLowerCase();
  const hooks = [];

  if (lower.includes("vat")) hooks.push("VAT");
  if (lower.includes("input vat")) hooks.push("INPUT_VAT");
  if (lower.includes("output vat")) hooks.push("OUTPUT_VAT");

  if (
    lower.includes("withholding") ||
    lower.includes("ewt") ||
    lower.includes("expanded withholding")
  ) {
    hooks.push("EWT");
  }

  if (
    lower.includes("income tax") ||
    lower.includes("rcit") ||
    lower.includes("mcit") ||
    lower.includes("nolco")
  ) {
    hooks.push("INCOME_TAX");
  }

  if (/\brr\s*[\d-]+/i.test(content) || lower.includes("revenue regulation")) {
    hooks.push("REVENUE_REGULATION");
  }

  if (
    /\brmc\s*[\d-]+/i.test(content) ||
    lower.includes("revenue memorandum circular")
  ) {
    hooks.push("RMC");
  }

  if (/\brmo\s*[\d-]+/i.test(content) || lower.includes("revenue memorandum order")) {
    hooks.push("RMO");
  }

  if (lower.includes("bir ruling") || lower.includes("ruling no")) {
    hooks.push("BIR_RULING");
  }

  if (
    lower.includes("case") ||
    lower.includes("cta") ||
    lower.includes("supreme court") ||
    lower.includes("g.r. no") ||
    lower.includes(" v. ") ||
    lower.includes(" vs ")
  ) {
    hooks.push("CASE_LAW");
  }

  if (
    lower.includes("risk") ||
    lower.includes("audit") ||
    lower.includes("exposure") ||
    lower.includes("deficiency")
  ) {
    hooks.push("AUDIT_RISK");
  }

  if (
    lower.includes("deadline") ||
    lower.includes("filing") ||
    lower.includes("form") ||
    lower.includes("penalty") ||
    lower.includes("compliance")
  ) {
    hooks.push("COMPLIANCE");
  }

  return [...new Set(hooks)];
}

/* =========================================================
   SAVE MEMORY HOOKS
   Required by server.js
========================================================= */

export async function saveMemoryHooks(supabase, userId, hooks = []) {
  if (!supabase || !userId || !Array.isArray(hooks) || hooks.length === 0) {
    return [];
  }

  const rows = hooks.map((hook) => ({
    user_id: String(userId),
    hook: String(hook),
    created_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from("tina_memory_hooks")
    .insert(rows)
    .select();

  if (error) {
    console.error("saveMemoryHooks error:", error.message);
    return [];
  }

  return data || [];
}

/* =========================================================
   DELETE SESSION MEMORY
========================================================= */

export async function clearSessionMemory(supabase, userId, sessionId) {
  if (!supabase || !sessionId) return false;

  let query = supabase
    .from("tina_conversation_memory")
    .delete()
    .eq("session_id", sessionId);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { error } = await query;

  if (error) {
    console.error("clearSessionMemory error:", error.message);
    return false;
  }

  return true;
}

/* =========================================================
   DELETE TOPIC STATE
========================================================= */

export async function clearTopicState(supabase, userId, sessionId) {
  if (!supabase || !sessionId) return false;

  let query = supabase
    .from("tina_topic_state")
    .delete()
    .eq("session_id", sessionId);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { error } = await query;

  if (error) {
    console.error("clearTopicState error:", error.message);
    return false;
  }

  return true;
}

/* =========================================================
   MEMORY HEALTH CHECK
========================================================= */

export async function memoryHealthCheck(supabase) {
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase client is required"
    };
  }

  const { error } = await supabase
    .from("tina_topic_state")
    .select("id")
    .limit(1);

  if (error) {
    console.error("memoryHealthCheck error:", error.message);
    return {
      ok: false,
      error: error.message
    };
  }

  return {
    ok: true,
    message: "Supabase memory hooks connected"
  };
}
