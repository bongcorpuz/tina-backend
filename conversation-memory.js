// FILE: conversation-memory.js
"use strict";

const ENGINE_VERSION = "2.2.0";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSupabaseClient(value) {
  return Boolean(value) && typeof value.from === "function";
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
      if (sanitized !== undefined) output[key] = sanitized;
    }

    return output;
  }

  return undefined;
}

function normalizeArray(value) {
  if (!Array.isArray(value) || value.length === 0) return null;

  const sanitized = value
    .map((item) => sanitizeJsonValue(item))
    .filter((item) => item !== undefined);

  return sanitized.length ? sanitized : null;
}

function normalizeJsonObject(value, fallback = null) {
  if (!value) return fallback;
  const sanitized = sanitizeJsonValue(value);
  return sanitized && isPlainObject(sanitized) ? sanitized : fallback;
}

function normalizeAdaptiveMode(mode = null) {
  const value = String(mode || "").trim().toUpperCase();

  const aliases = {
    ASK: "STANDARD_TAX_MODE",
    TAX_EXPERT: "TECHNICAL_TAX_MODE",
    TAX_REVIEWER: "REVIEWER_LEARNING_MODE",
    QUIZ_MASTER: "REVIEWER_LEARNING_MODE",
    SOURCE_FINDER: "STANDARD_TAX_MODE",
    FEEDBACK: "STANDARD_TAX_MODE",

    QUICK: "QUICK_MODE",
    STANDARD: "STANDARD_TAX_MODE",
    TECHNICAL: "TECHNICAL_TAX_MODE",
    AUDIT: "AUDIT_MODE",
    LITIGATION: "LITIGATION_LEGAL_DEFENSE_MODE",
    TRANSACTION: "TRANSACTION_CHARACTERIZATION_MODE",
    CONTRACT: "CONTRACT_INTERPRETATION_MODE",
    EVIDENCE_HEAVY: "EVIDENCE_EVALUATION_MODE",
    REVIEWER: "REVIEWER_LEARNING_MODE"
  };

  if (aliases[value]) return aliases[value];

  if (value.includes("AUDIT")) return "AUDIT_MODE";
  if (value.includes("LITIGATION") || value.includes("LEGAL")) return "LITIGATION_LEGAL_DEFENSE_MODE";
  if (value.includes("TRANSACTION")) return "TRANSACTION_CHARACTERIZATION_MODE";
  if (value.includes("CONTRACT")) return "CONTRACT_INTERPRETATION_MODE";
  if (value.includes("EVIDENCE")) return "EVIDENCE_EVALUATION_MODE";
  if (value.includes("FACT")) return "FACT_PATTERN_ANALYSIS_MODE";
  if (value.includes("REVIEW") || value.includes("QUIZ") || value.includes("LEARNING")) return "REVIEWER_LEARNING_MODE";
  if (value.includes("TECHNICAL") || value.includes("DOCTRINE")) return "TECHNICAL_TAX_MODE";
  if (value.includes("QUICK")) return "QUICK_MODE";

  return null;
}

export async function createConversation(
  supabase,
  { userId, title = "New Conversation", metadata = null } = {}
) {
  if (!isSupabaseClient(supabase)) {
    throw new Error("createConversation requires a valid Supabase client.");
  }

  const cleanUserId = normalizeText(userId);
  const cleanTitle = normalizeText(title) || "New Conversation";

  if (!cleanUserId) {
    throw new Error("userId is required to create a conversation.");
  }

  const payload = {
    user_id: cleanUserId,
    title: cleanTitle
  };

  const cleanMetadata = normalizeJsonObject(metadata, null);
  if (cleanMetadata) {
    payload.metadata = {
      ...cleanMetadata,
      tinaConversationMemoryVersion: ENGINE_VERSION
    };
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function getUserConversations(supabase, userId) {
  if (!isSupabaseClient(supabase)) return [];

  const cleanUserId = normalizeText(userId);
  if (!cleanUserId) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", cleanUserId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getConversationMessages(
  supabase,
  { conversationId, userId, limit = null } = {}
) {
  if (!isSupabaseClient(supabase)) return [];

  const cleanConversationId = normalizeText(conversationId);
  const cleanUserId = normalizeText(userId);

  if (!cleanConversationId || !cleanUserId) return [];

  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", cleanConversationId)
    .eq("user_id", cleanUserId)
    .order("created_at", { ascending: true });

  if (limit && Number.isFinite(Number(limit))) {
    query = query.limit(Math.max(1, Math.floor(Number(limit))));
  }

  const { data, error } = await query;

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
    fallbackReferences = null,

    adaptiveMode = null,
    responseMode = null,
    responseDepth = null,
    adaptiveContext = null,
    responsePlan = null,
    riskScore = null,
    positionStrength = null,
    assumptionGap = null,
    queryIntent = null,
    retrievalMetadata = null,
    supersessionAudit = null,
    authorityUsed = null,
    confidenceLevel = null,
    messageMetadata = null
  } = {}
) {
  if (!isSupabaseClient(supabase)) return null;

  const cleanConversationId = normalizeText(conversationId);
  const cleanUserId = normalizeText(userId);
  const cleanRole = normalizeText(role);
  const cleanContent = normalizeText(content);

  if (!cleanConversationId || !cleanUserId || !cleanRole || !cleanContent) {
    return null;
  }

  const adaptivePayload = {
    adaptiveMode: normalizeAdaptiveMode(adaptiveMode) || adaptiveMode || null,
    responseMode: responseMode || responsePlan?.responseMode || null,
    responseDepth: responseDepth || responsePlan?.responseDepth || null,
    queryIntent: normalizeJsonObject(queryIntent, null),
    adaptiveContext: normalizeJsonObject(adaptiveContext, null),
    responsePlan: normalizeJsonObject(responsePlan, null),
    riskScore: normalizeJsonObject(riskScore, null),
    positionStrength: normalizeJsonObject(positionStrength, null),
    assumptionGap: normalizeJsonObject(assumptionGap, null),
    retrievalMetadata: normalizeJsonObject(retrievalMetadata, null),
    supersessionAudit: normalizeArray(supersessionAudit),
    authorityUsed: normalizeArray(authorityUsed),
    confidenceLevel: confidenceLevel || null,
    tinaConversationMemoryVersion: ENGINE_VERSION
  };

  const payload = {
    conversation_id: cleanConversationId,
    user_id: cleanUserId,
    role: cleanRole,
    content: cleanContent,
    sources_used: normalizeArray(sourcesUsed),
    fallback_references: normalizeArray(fallbackReferences)
  };

  const cleanMessageMetadata = normalizeJsonObject(messageMetadata, {});

  payload.metadata = {
    ...cleanMessageMetadata,
    adaptive: sanitizeJsonValue(adaptivePayload)
  };

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      updated_at: new Date().toISOString(),
      last_message_preview: cleanContent.slice(0, 300)
    })
    .eq("id", cleanConversationId)
    .eq("user_id", cleanUserId);

  if (updateError) {
    console.warn("Conversation timestamp update skipped:", updateError.message);
  }

  return data;
}

export function buildConversationMemoryContext(messages = [], maxChars = 6000) {
  const lines = (messages || [])
    .filter((message) => message?.role && message?.content)
    .map((message) => {
      const role = String(message.role).toUpperCase();
      const content = normalizeText(message.content);
      return `${role}: ${content}`;
    });

  const text = lines.join("\n\n");

  return text.length > maxChars ? `${text.slice(-maxChars)}\n...[recent memory truncated]` : text;
}

export function conversationMemoryHealthCheck() {
  return {
    ok: true,
    engine: "TINA_CONVERSATION_MEMORY",
    version: ENGINE_VERSION,
    adaptiveMetadataCompatible: true
  };
}
