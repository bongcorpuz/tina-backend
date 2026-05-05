// FILE: conversation-memory.js

export async function createConversation(
  supabase,
  { userId, title = "New Conversation" }
) {
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      title
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getUserConversations(supabase, userId) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getConversationMessages(
  supabase,
  { conversationId, userId }
) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
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
  if (!conversationId || !userId || !role || !content) {
    return null;
  }

  const payload = {
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
    sources_used: Array.isArray(sourcesUsed) ? sourcesUsed : null,
    fallback_references: Array.isArray(fallbackReferences)
      ? fallbackReferences
      : null
  };

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", userId);

  return data;
}
