// FILE: memory-hooks.js

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function isSupabaseClient(value) {
  return Boolean(value) && typeof value.from === "function";
}

function safeLimit(value, fallback = 8, max = 100) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(1, Math.min(Math.floor(num), max));
}

/* =========================================================
   GET LAST TOPIC STATE
========================================================= */

export async function getLastTopicState(supabase, userId, sessionId) {
  if (!isSupabaseClient(supabase)) {
    throw new Error(
      "getLastTopicState requires a valid Supabase client as the first argument."
    );
  }

  const cleanUserId = normalizeText(userId);
  const cleanSessionId = normalizeText(sessionId);

  let query = supabase
    .from("tina_topic_state")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (cleanSessionId) {
    query = query.eq("session_id", cleanSessionId);
  }

  if (cleanUserId) {
    query = query.eq("user_id", cleanUserId);
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
  if (!isSupabaseClient(supabase)) return null;

  const cleanSessionId = normalizeText(sessionId);
  if (!cleanSessionId) return null;

  const payload = {
    user_id: normalizeText(userId) || null,
    session_id: cleanSessionId,
    current_topic: normalizeText(topic) || "general",
    current_subject: normalizeText(subject || question) || "general",
    current_tax_type: normalizeText(taxType) || "general",
    last_question: normalizeText(question),
    last_answer: normalizeText(answer),
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
  if (!isSupabaseClient(supabase)) return null;

  const cleanRole = normalizeText(role);
  const cleanContent = normalizeText(content);

  if (!cleanRole || !cleanContent) return null;

  const { data, error } = await supabase
    .from("tina_conversation_memory")
    .insert({
      user_id: normalizeText(userId) || null,
      session_id: normalizeText(sessionId) || null,
      role: cleanRole,
      content: cleanContent,
      topic: normalizeText(topic) || "general",
      subject: normalizeText(subject) || "general",
      tax_type: normalizeText(taxType) || "general",
      source: normalizeText(source) || "chat"
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
  if (!isSupabaseClient(supabase)) return [];

  const cleanUserId = normalizeText(userId);
  const cleanSessionId = normalizeText(sessionId);

  let query = supabase
    .from("tina_conversation_memory")
    .select("role, content, topic, subject, tax_type, created_at")
    .order("created_at", { ascending: false })
    .limit(safeLimit(limit, 8, 100));

  if (cleanSessionId) {
    query = query.eq("session_id", cleanSessionId);
  }

  if (cleanUserId) {
    query = query.eq("user_id", cleanUserId);
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
  if (!isSupabaseClient(supabase)) return null;

  const cleanMemoryKey = normalizeText(memoryKey);
  const cleanMemoryValue = normalizeText(memoryValue);

  if (!cleanMemoryKey || !cleanMemoryValue) return null;

  const payload = {
    user_id: normalizeText(userId) || null,
    memory_type: normalizeText(memoryType) || "preference",
    memory_key: cleanMemoryKey,
    memory_value: cleanMemoryValue,
    confidence: Number.isFinite(Number(confidence)) ? Number(confidence) : 0.8,
    source: normalizeText(source) || "chat",
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
  if (!isSupabaseClient(supabase)) return [];

  const cleanUserId = normalizeText(userId);
  if (!cleanUserId) return [];

  const { data, error } = await supabase
    .from("tina_long_term_memory")
    .select("memory_type, memory_key, memory_value, confidence, updated_at")
    .eq("user_id", cleanUserId)
    .order("updated_at", { ascending: false })
    .limit(safeLimit(limit, 10, 100));

  if (error) {
    console.error("getLongTermMemory error:", error.message);
    return [];
  }

  return data || [];
}

/* =========================================================
   EXTRACT MEMORY HOOKS
========================================================= */

export function extractMemoryHooks(text = "") {
  const content = normalizeText(text);
  if (!content) return [];

  const value = lower(content);
  const hooks = [];

  if (value.includes("vat")) hooks.push("VAT");
  if (value.includes("input vat")) hooks.push("INPUT_VAT");
  if (value.includes("output vat")) hooks.push("OUTPUT_VAT");

  if (
    value.includes("withholding") ||
    value.includes("ewt") ||
    value.includes("expanded withholding")
  ) {
    hooks.push("EWT");
  }

  if (
    value.includes("income tax") ||
    value.includes("rcit") ||
    value.includes("mcit") ||
    value.includes("nolco")
  ) {
    hooks.push("INCOME_TAX");
  }

  if (
    value.includes("create law") ||
    value.includes("create act") ||
    /\bra\s*11534\b/i.test(content)
  ) {
    hooks.push("CREATE_LAW");
  }

  if (
    value.includes("train law") ||
    value.includes("train act") ||
    /\bra\s*10963\b/i.test(content)
  ) {
    hooks.push("TRAIN_LAW");
  }

  if (
    value.includes("eopt") ||
    value.includes("ease of paying taxes") ||
    /\bra\s*11976\b/i.test(content)
  ) {
    hooks.push("EOPT");
  }

  if (value.includes("create more") || /\bra\s*12066\b/i.test(content)) {
    hooks.push("CREATE_MORE");
  }

  if (/\brr\s*[\d-]+/i.test(content) || value.includes("revenue regulation")) {
    hooks.push("REVENUE_REGULATION");
  }

  if (
    /\brmc\s*[\d-]+/i.test(content) ||
    value.includes("revenue memorandum circular")
  ) {
    hooks.push("RMC");
  }

  if (
    /\brmo\s*[\d-]+/i.test(content) ||
    value.includes("revenue memorandum order")
  ) {
    hooks.push("RMO");
  }

  if (
    /\bramo\s*[\d-]+/i.test(content) ||
    value.includes("revenue audit memorandum order")
  ) {
    hooks.push("RAMO");
  }

  if (value.includes("bir ruling") || value.includes("ruling no")) {
    hooks.push("BIR_RULING");
  }

  if (
    value.includes("case") ||
    value.includes("cta") ||
    value.includes("supreme court") ||
    value.includes("court of appeals") ||
    value.includes("court of tax appeals") ||
    value.includes("g.r. no") ||
    value.includes("g.r no") ||
    value.includes("ca-g.r.") ||
    value.includes(" v. ") ||
    value.includes(" vs ")
  ) {
    hooks.push("CASE_LAW");
  }

  if (
    value.includes("risk") ||
    value.includes("audit") ||
    value.includes("exposure") ||
    value.includes("deficiency")
  ) {
    hooks.push("AUDIT_RISK");
  }

  if (
    value.includes("deadline") ||
    value.includes("filing") ||
    value.includes("form") ||
    value.includes("penalty") ||
    value.includes("compliance")
  ) {
    hooks.push("COMPLIANCE");
  }

  return unique(hooks);
}

/* =========================================================
   SAVE MEMORY HOOKS
========================================================= */

export async function saveMemoryHooks(supabase, userId, hooks = []) {
  if (!isSupabaseClient(supabase)) return [];

  const cleanUserId = normalizeText(userId);
  if (!cleanUserId || !Array.isArray(hooks) || hooks.length === 0) {
    return [];
  }

  const rows = unique(hooks.map((hook) => normalizeText(hook))).map((hook) => ({
    user_id: cleanUserId,
    hook,
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
  if (!isSupabaseClient(supabase)) return false;

  const cleanSessionId = normalizeText(sessionId);
  const cleanUserId = normalizeText(userId);

  if (!cleanSessionId) return false;

  let query = supabase
    .from("tina_conversation_memory")
    .delete()
    .eq("session_id", cleanSessionId);

  if (cleanUserId) {
    query = query.eq("user_id", cleanUserId);
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
  if (!isSupabaseClient(supabase)) return false;

  const cleanSessionId = normalizeText(sessionId);
  const cleanUserId = normalizeText(userId);

  if (!cleanSessionId) return false;

  let query = supabase
    .from("tina_topic_state")
    .delete()
    .eq("session_id", cleanSessionId);

  if (cleanUserId) {
    query = query.eq("user_id", cleanUserId);
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
  if (!isSupabaseClient(supabase)) {
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
