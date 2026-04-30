import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

/* =========================================================
   GET LAST TOPIC STATE
   Used to understand follow-up questions
========================================================= */

export async function getLastTopicState(userId, sessionId) {
  if (!sessionId) return null;

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
   One active topic per session
========================================================= */

export async function saveTopicState({
  userId = null,
  sessionId,
  topic = "general",
  subject = "general",
  taxType = "general",
  question = "",
  answer = ""
}) {
  if (!sessionId) return null;

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

  return data;
}

/* =========================================================
   SAVE CONVERSATION MEMORY
   Stores user and assistant messages
========================================================= */

export async function saveConversationMemory({
  userId = null,
  sessionId = null,
  role,
  content,
  topic = "general",
  subject = "general",
  taxType = "general",
  source = "chat"
}) {
  if (!content || !role) return null;

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

  return data;
}

/* =========================================================
   GET RECENT CONVERSATION MEMORY
   Used to give TINA short-term chat context
========================================================= */

export async function getRecentConversationMemory(userId, sessionId, limit = 8) {
  if (!sessionId) return [];

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
   Stores durable user/company/tax preferences or recurring facts
========================================================= */

export async function saveLongTermMemory({
  userId = null,
  memoryType = "preference",
  memoryKey,
  memoryValue,
  confidence = 0.8,
  source = "chat"
}) {
  if (!memoryKey || !memoryValue) return null;

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

  return data;
}

/* =========================================================
   GET LONG-TERM MEMORY
   Used to personalize TINA responses
========================================================= */

export async function getLongTermMemory(userId, limit = 10) {
  if (!userId) return [];

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
   DELETE SESSION MEMORY
   Useful for reset chat button
========================================================= */

export async function clearSessionMemory(userId, sessionId) {
  if (!sessionId) return false;

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
   Useful when starting a new topic/session
========================================================= */

export async function clearTopicState(userId, sessionId) {
  if (!sessionId) return false;

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
   Useful for /health endpoint
========================================================= */

export async function memoryHealthCheck() {
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
