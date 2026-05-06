// FILE: conversation-memory.js

function normalizeText(value = "") {
  return String(value || "").trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeJsonValue(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeJsonValue(item))
      .filter((item) => item !== undefined);
  }

  if (isPlainObject(value)) {
    const output = {};

    for (const [key, item] of Object.entries(value)) {
      const sanitized = sanitizeJsonValue(item);
      if (sanitized !== undefined) {
        output[key] = sanitized;
      }
    }

    return output;
  }

  return undefined;
}

function normalizeArray(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const sanitized = value
    .map((item) => sanitizeJsonValue(item))
    .filter((item) => item !== undefined);

  return sanitized.length ? sanitized : null;
}

export async function createConversation(
  supabase,
  { userId, title = "New Conversation" }
) {
  const cleanUserId = normalizeText(userId);
  const cleanTitle = normalizeText(title) || "New Conversation";

  if (!cleanUserId) {
    throw new Error("userId is required to create a conversation.");
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: cleanUserId,
      title: cleanTitle
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUserConversations(supabase, userId) {
  const cleanUserId = normalizeText(userId);

  if (!cleanUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", cleanUserId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getConversationMessages(
  supabase,
  { conversationId, userId }
) {
  const cleanConversationId = normalizeText(conversationId);
  const cleanUserId = normalizeText(userId);

  if (!cleanConversationId || !cleanUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", cleanConversationId)
    .eq("user_id", cleanUserId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function saveMessage(
  supabase,
  {
    conversationId,
    userId,
    role,
    content,
    sourcesUsed = null,
    fallbackReferences = null
  }
) {
  const cleanConversationId = normalizeText(conversationId);
  const cleanUserId = normalizeText(userId);
  const cleanRole = normalizeText(role);
  const cleanContent = normalizeText(content);

  if (!cleanConversationId || !cleanUserId || !cleanRole || !cleanContent) {
    return null;
  }

  const payload = {
    conversation_id: cleanConversationId,
    user_id: cleanUserId,
    role: cleanRole,
    content: cleanContent,
    sources_used: normalizeArray(sourcesUsed),
    fallback_references: normalizeArray(fallbackReferences)
  };

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { error: updateError } = await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", cleanConversationId)
    .eq("user_id", cleanUserId);

  if (updateError) {
    throw updateError;
  }

  return data;
}
