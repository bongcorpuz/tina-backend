// FILE: context-orchestration-engine.js
"use strict";

/**
 * TINA Context Orchestration Engine
 * Version: 3.0.0
 *
 * Single source of truth for:
 * - token estimation
 * - mode selection
 * - retrieval trimming
 * - source compression
 * - prompt assembly
 * - final message trimming
 * - OpenAI call safety
 */

import OpenAI from "openai";

const DEFAULT_MODEL =
  process.env.OPENAI_MODEL ||
  process.env.DEFAULT_OPENAI_MODEL ||
  "gpt-4o-mini";

const MODEL_CONTEXT_LIMITS = {
  "gpt-4o-mini": 128000,
  "gpt-4o": 128000,
  "gpt-4.1-mini": 1000000,
  "gpt-4.1": 1000000,
  "gpt-4.1-nano": 1000000,
  "gpt-5": 400000,
  "gpt-5-mini": 400000,
  "gpt-5-nano": 400000
};

const DEFAULT_CONTEXT_LIMIT =
  MODEL_CONTEXT_LIMITS[DEFAULT_MODEL] ||
  Number(process.env.OPENAI_CONTEXT_LIMIT || 128000);

const HARD_SAFETY_RATIO = 0.65;

const MODE_CONFIG = {
  FAST_DEFINITION: {
    maxInputTokens: 10000,
    maxOutputTokens: 900,
    maxSources: 3,
    maxCharsPerSource: 1200,
    maxHistoryItems: 3,
    temperature: 0.1
  },

  STANDARD_TAX: {
    maxInputTokens: 22000,
    maxOutputTokens: 1600,
    maxSources: 5,
    maxCharsPerSource: 1800,
    maxHistoryItems: 4,
    temperature: 0.1
  },

  LEGAL_ANALYSIS: {
    maxInputTokens: 36000,
    maxOutputTokens: 2200,
    maxSources: 6,
    maxCharsPerSource: 2200,
    maxHistoryItems: 4,
    temperature: 0.1
  },

  COMPLEX_ADVISORY: {
    maxInputTokens: 48000,
    maxOutputTokens: 2600,
    maxSources: 8,
    maxCharsPerSource: 2200,
    maxHistoryItems: 5,
    temperature: 0.1
  },

  EMERGENCY_TRIM: {
    maxInputTokens: 9000,
    maxOutputTokens: 700,
    maxSources: 2,
    maxCharsPerSource: 700,
    maxHistoryItems: 2,
    temperature: 0.1
  }
};

function safeString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function normalizeWhitespace(text = "") {
  return safeString(text)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function estimateTokens(text = "") {
  const str = safeString(text);
  if (!str) return 0;
  return Math.ceil(str.length / 3.6);
}

export function estimatePromptTokens(text = "") {
  return estimateTokens(text);
}

export function estimateMessagesTokens(messages = []) {
  return (Array.isArray(messages) ? messages : []).reduce((sum, msg) => {
    return (
      sum +
      estimateTokens(msg.role || "") +
      estimateTokens(msg.content || "") +
      6
    );
  }, 0);
}

function truncateByChars(text = "", maxChars = 2000) {
  const str = safeString(text);
  if (str.length <= maxChars) return str;
  return `${str.slice(0, maxChars).trim()}\n\n[Trimmed due to context budget.]`;
}

function truncateByTokens(text = "", maxTokens = 1000) {
  return truncateByChars(text, Math.max(0, Math.floor(maxTokens * 3.6)));
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function normalizeIssue(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function detectComplexity(userQuery = "", classification = {}, intent = {}) {
  const q = safeString(userQuery).toLowerCase();

  if (classification?.complexity) return classification.complexity;
  if (intent?.complexity) return intent.complexity;

  const simple =
    q.length <= 140 &&
    /^(what is|define|meaning of|ano ang)\b/i.test(q) &&
    !/\b(analyze|risk|audit|contract|jurisprudence|doctrine|conflict|legal consequence|assessment|substance|evidence)\b/i.test(q);

  if (simple || intent?.requiresSimpleDefinition) return "simple";

  if (
    intent?.requiresFactPatternAnalysis ||
    intent?.requiresEvidenceEvaluation ||
    intent?.requiresContractInterpretation ||
    intent?.requiresTransactionCharacterization ||
    intent?.requiresEconomicSubstance ||
    /\b(audit|risk|contract|transaction|economic substance|substance over form|evidence|reconcile|legal consequence)\b/i.test(q)
  ) {
    return "complex";
  }

  if (
    intent?.requiresLegalAnalysis ||
    intent?.requiresJurisprudence ||
    /\b(jurisprudence|doctrine|conflict|legal basis|supreme court|cta|g\.?\s*r\.?\s*no)\b/i.test(q)
  ) {
    return "moderate";
  }

  return "standard";
}

function determineMode(userQuery = "", classification = {}, intent = {}) {
  const q = safeString(userQuery).toLowerCase();
  const complexity = detectComplexity(userQuery, classification, intent);
  const primaryIssue = normalizeIssue(classification?.primaryIssue || "");

  if (
    complexity === "simple" ||
    intent?.requiresSimpleDefinition ||
    (q.length <= 140 && /\b(what is|define|meaning)\b/i.test(q))
  ) {
    return "FAST_DEFINITION";
  }

  if (
    intent?.requiresFactPatternAnalysis ||
    intent?.requiresEvidenceEvaluation ||
    intent?.requiresContractInterpretation ||
    intent?.requiresTransactionCharacterization ||
    intent?.requiresEconomicSubstance ||
    ["TRANSACTION", "CONTRACT", "ECONOMIC_SUBSTANCE", "AUDIT"].includes(primaryIssue) ||
    /\b(audit|risk|contract|transaction|economic substance|substance over form|evidence|reconcile)\b/i.test(q)
  ) {
    return "COMPLEX_ADVISORY";
  }

  if (
    intent?.requiresLegalAnalysis ||
    intent?.requiresJurisprudence ||
    ["CASE_LAW", "DOCTRINE", "ASSESSMENT"].includes(primaryIssue) ||
    /\b(jurisprudence|doctrine|conflict|legal basis|case law|supreme court|cta)\b/i.test(q)
  ) {
    return "LEGAL_ANALYSIS";
  }

  return "STANDARD_TAX";
}

function assignBudget(model = DEFAULT_MODEL, mode = "STANDARD_TAX") {
  const modelLimit = MODEL_CONTEXT_LIMITS[model] || DEFAULT_CONTEXT_LIMIT;
  const hardInputLimit = Math.floor(modelLimit * HARD_SAFETY_RATIO);
  const config = MODE_CONFIG[mode] || MODE_CONFIG.STANDARD_TAX;

  return {
    model,
    modelLimit,
    mode,
    maxInputTokens: Math.min(config.maxInputTokens, hardInputLimit),
    maxOutputTokens: config.maxOutputTokens,
    maxSources: config.maxSources,
    maxCharsPerSource: config.maxCharsPerSource,
    maxHistoryItems: config.maxHistoryItems,
    temperature: config.temperature
  };
}

function normalizeSource(source = {}, index = 0) {
  const title =
    source.title ||
    source.sourceTitle ||
    source.source_title ||
    source.name ||
    source.fileName ||
    source.filename ||
    source.documentTitle ||
    source.metadata?.documentTitle ||
    source.metadata?.originalFileName ||
    source.originalSource ||
    source.source ||
    `Source ${index + 1}`;

  const authorityType =
    source.authorityType ||
    source.authority_type ||
    source.type ||
    source.category ||
    source.sourceType ||
    source.metadata?.authorityType ||
    "UNKNOWN";

  const citation =
    source.citation ||
    source.reference ||
    source.normalizedReference ||
    source.normalized_reference ||
    source.url ||
    source.driveViewUrl ||
    source.sourceUrl ||
    source.source_url ||
    source.fileId ||
    source.id ||
    "";

  const text =
    source.text ||
    source.content ||
    source.chunkText ||
    source.excerpt ||
    source.preview ||
    source.pageContent ||
    source.summary ||
    source.doctrineSummary ||
    "";

  const score =
    Number(
      source.finalScore ??
        source.final_score ??
        source.rerankScore ??
        source.retrievalScore ??
        source.score ??
        source.similarity ??
        source.relevance ??
        source.rankScore ??
        0
    ) || 0;

  const controllingPrecedence =
    Number(
      source.controllingPrecedence ??
        source.controlling_precedence ??
        source.authorityLevel ??
        source.authority_level ??
        source.metadata?.controllingPrecedence ??
        99
    ) || 99;

  return {
    title: safeString(title),
    authorityType: safeString(authorityType),
    citation: safeString(citation),
    url: source.url || source.driveViewUrl || source.sourceUrl || "",
    text: normalizeWhitespace(text),
    score,
    controllingPrecedence,
    issueClassificationMatch: source.issueClassificationMatch || null,
    targetAuthorityMatch:
      source.targetAuthorityMatch === true ||
      source.issueClassificationMatch?.targetAuthorityMatch === true,
    issueMismatch:
      source.issueMismatch === true ||
      source.issueClassificationMatch?.issueMismatch === true
  };
}

function authorityPriority(source = {}) {
  const authority = `${source.title} ${source.authorityType} ${source.citation}`.toLowerCase();

  if (authority.includes("constitution")) return 110;
  if (authority.includes("nirc") || authority.includes("tax code") || authority.includes("statute")) return 100;
  if (authority.includes("supreme court") || authority.includes("g.r.") || authority.includes("gr no")) return 98;
  if (authority.includes("revenue regulation") || /\brr\b/.test(authority)) return 95;
  if (authority.includes("revenue memorandum circular") || /\brmc\b/.test(authority)) return 88;
  if (authority.includes("revenue memorandum order") || /\brmo\b/.test(authority)) return 84;
  if (authority.includes("ramo")) return 82;
  if (authority.includes("bir ruling")) return 76;
  if (authority.includes("cta")) return 70;
  if (authority.includes("pfrs") || authority.includes("pas ")) return 60;
  return 40;
}

function sourceSortScore(source = {}) {
  const issueBonus = source.issueClassificationMatch?.matched || source.issueClassificationMatch?.issueOverlap ? 80 : 0;
  const targetBonus = source.targetAuthorityMatch ? 100 : 0;
  const mismatchPenalty = source.issueMismatch ? -1000 : 0;

  return (
    authorityPriority(source) +
    issueBonus +
    targetBonus +
    Number(source.score || 0) -
    Number(source.controllingPrecedence || 99) +
    mismatchPenalty
  );
}

function trimRetrieval(sources = [], budget = assignBudget()) {
  return safeArray(sources)
    .map((source, index) => normalizeSource(source, index))
    .filter((source) => source.text && !source.issueMismatch)
    .sort((a, b) => sourceSortScore(b) - sourceSortScore(a))
    .slice(0, budget.maxSources);
}

function compressOneSource(source = {}, budget = assignBudget(), index = 0) {
  const text = truncateByChars(source.text, budget.maxCharsPerSource);

  return [
    `SOURCE ${index + 1}`,
    `Title: ${source.title}`,
    `Authority Type: ${source.authorityType}`,
    source.citation ? `Citation/Link: ${source.citation}` : null,
    `Score: ${source.score}`,
    source.targetAuthorityMatch ? "Target Authority Match: YES" : null,
    source.issueClassificationMatch ? "Issue Classification Match: YES" : null,
    "Relevant Extract:",
    text
  ]
    .filter(Boolean)
    .join("\n");
}

function compressSources(sources = [], budget = assignBudget()) {
  return trimRetrieval(sources, budget)
    .map((source, index) => compressOneSource(source, budget, index))
    .join("\n\n---\n\n");
}

export function compressRetrievedSources(sources = [], maxChars = 1200) {
  return safeArray(sources)
    .map((source, index) => normalizeSource(source, index))
    .filter((source) => source.text && !source.issueMismatch)
    .map((source) => ({
      title: source.title,
      authorityType: source.authorityType,
      citation: source.citation,
      url: source.url,
      score: source.score,
      controllingPrecedence: source.controllingPrecedence,
      targetAuthorityMatch: source.targetAuthorityMatch,
      issueClassificationMatch: source.issueClassificationMatch,
      text: truncateByChars(source.text, maxChars),
      content: truncateByChars(source.text, maxChars)
    }));
}

function buildSystemInstruction({ systemPrompt = "", masterPrompt = "", mode = "STANDARD_TAX" }) {
  const base = `
You are TINA, a Philippine tax information and reasoning assistant.

Operating Mode: ${mode}

Core rules:
1. Answer directly first.
2. Use only relevant authorities and retrieved extracts.
3. Prefer controlling Philippine authorities.
4. Do not invent citations.
5. If sources are insufficient, say so clearly.
6. Do not dump unrelated jurisprudence.
7. Do not include raw source text, full debug objects, retrieval payloads, embeddings, or full engine outputs.
8. Do not say "Conflict Detected: YES" unless same issue, same legal dimension, opposite holding, conflict type, and hierarchy resolution are established.
9. Keep the answer proportionate to the query.
`.trim();

  return normalizeWhitespace([base, systemPrompt, masterPrompt].filter(Boolean).join("\n\n"));
}

function buildUserPrompt({
  userQuery = "",
  classification = {},
  intent = {},
  compressedSources = "",
  mode = "STANDARD_TAX"
}) {
  const compactClassification = {
    primaryIssue: classification?.primaryIssue || classification?.domain || null,
    subIssue: classification?.subIssue || null,
    retrievalStrategy: classification?.retrievalStrategy || null,
    targetAuthorities: safeArray(classification?.targetAuthorities).slice(0, 10)
  };

  const compactIntent = {
    intent: intent?.intent || intent?.type || null,
    requiresLegalAnalysis: Boolean(intent?.requiresLegalAnalysis),
    requiresRiskAnalysis: Boolean(intent?.requiresRiskAnalysis),
    requiresFactPatternAnalysis: Boolean(intent?.requiresFactPatternAnalysis),
    requiresEvidenceEvaluation: Boolean(intent?.requiresEvidenceEvaluation),
    requiresContractInterpretation: Boolean(intent?.requiresContractInterpretation),
    requiresTransactionCharacterization: Boolean(intent?.requiresTransactionCharacterization),
    requiresEconomicSubstance: Boolean(intent?.requiresEconomicSubstance),
    requiresSimpleDefinition: Boolean(intent?.requiresSimpleDefinition)
  };

  return normalizeWhitespace(`
USER QUERY:
${userQuery}

CLASSIFICATION:
${JSON.stringify(compactClassification, null, 2)}

INTENT:
${JSON.stringify(compactIntent, null, 2)}

RETRIEVED RELEVANT AUTHORITIES / EXTRACTS:
${compressedSources || "[No retrieved source extracts supplied.]"}

RESPONSE INSTRUCTION:
Use ${mode}. Answer only what is necessary. Do not include irrelevant cases, irrelevant regulations, debug data, hidden metadata, or internal engine objects.
`);
}

export function trimMessagesToBudget(messages = [], maxTokens = 12000) {
  const output = [];
  let running = 0;

  for (const msg of [...safeArray(messages)].reverse()) {
    const cost = estimateMessagesTokens([msg]);
    if (running + cost > maxTokens) break;

    running += cost;
    output.unshift({
      role: msg.role || "user",
      content: safeString(msg.content || "")
    });
  }

  return output;
}

function finalTrimMessages(messages = [], budget = assignBudget()) {
  let currentTokens = estimateMessagesTokens(messages);

  if (currentTokens <= budget.maxInputTokens) {
    return {
      messages,
      estimatedInputTokens: currentTokens,
      wasTrimmed: false
    };
  }

  let trimmedMessages = messages.map((m) => ({ ...m }));

  if (trimmedMessages[0]) {
    trimmedMessages[0].content = truncateByTokens(
      trimmedMessages[0].content,
      Math.floor(budget.maxInputTokens * 0.25)
    );
  }

  if (trimmedMessages[trimmedMessages.length - 1]) {
    trimmedMessages[trimmedMessages.length - 1].content = truncateByTokens(
      trimmedMessages[trimmedMessages.length - 1].content,
      Math.floor(budget.maxInputTokens * 0.68)
    );
  }

  currentTokens = estimateMessagesTokens(trimmedMessages);

  if (currentTokens > budget.maxInputTokens) {
    const emergencyBudget = assignBudget(budget.model, "EMERGENCY_TRIM");

    trimmedMessages = trimmedMessages.map((m, idx) => ({
      ...m,
      content: truncateByTokens(
        m.content,
        idx === 0
          ? Math.floor(emergencyBudget.maxInputTokens * 0.25)
          : Math.floor(emergencyBudget.maxInputTokens * 0.68)
      )
    }));

    currentTokens = estimateMessagesTokens(trimmedMessages);
  }

  return {
    messages: trimmedMessages,
    estimatedInputTokens: currentTokens,
    wasTrimmed: true
  };
}

function normalizeBuildArgs(args = {}) {
  return {
    userQuery: args.userQuery || args.question || args.query || "",
    systemPrompt: args.systemPrompt || "",
    masterPrompt: args.masterPrompt || "",
    retrievedSources: args.retrievedSources || args.sources || [],
    classification:
      args.classification?.orchestrationClassification ||
      args.classification ||
      args.issueClassification?.orchestrationClassification ||
      args.issueClassification ||
      {},
    intent:
      args.intent?.orchestrationIntent ||
      args.intent?.intentFlags ||
      args.intent ||
      args.orchestrationIntent ||
      {},
    conversationHistory: args.conversationHistory || args.messages || [],
    model: args.model || DEFAULT_MODEL
  };
}

export function buildOpenAIContext(args = {}) {
  const {
    userQuery,
    systemPrompt,
    masterPrompt,
    retrievedSources,
    classification,
    intent,
    conversationHistory,
    model
  } = normalizeBuildArgs(args);

  const mode = determineMode(userQuery, classification, intent);
  const budget = assignBudget(model, mode);

  const compressedSources = compressSources(retrievedSources, budget);

  const systemInstruction = buildSystemInstruction({
    systemPrompt,
    masterPrompt,
    mode
  });

  const userPrompt = buildUserPrompt({
    userQuery,
    classification,
    intent,
    compressedSources,
    mode
  });

  const safeHistory = safeArray(conversationHistory)
    .slice(-budget.maxHistoryItems)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: truncateByTokens(m.content || m.message || m.text || "", 500)
    }))
    .filter((m) => m.content);

  const rawMessages = [
    {
      role: "system",
      content: systemInstruction
    },
    ...safeHistory,
    {
      role: "user",
      content: userPrompt
    }
  ];

  const final = finalTrimMessages(rawMessages, budget);

  return {
    model: budget.model,
    mode,
    contextMode: mode,
    orchestrationMode: mode,
    complexity: detectComplexity(userQuery, classification, intent),
    messages: final.messages,
    temperature: budget.temperature,
    maxOutputTokens: budget.maxOutputTokens,
    max_tokens: budget.maxOutputTokens,
    maxCompletionTokens: budget.maxOutputTokens,
    estimatedInputTokens: final.estimatedInputTokens,
    wasTrimmed: final.wasTrimmed,
    budget,
    responsePlan: {
      responseMode: mode,
      orchestrationMode: mode,
      contextMode: mode,
      contextBudgetPolicy: budget
    },
    diagnostics: {
      sourceCountInput: safeArray(retrievedSources).length,
      sourceCountUsed: trimRetrieval(retrievedSources, budget).length,
      estimatedInputTokens: final.estimatedInputTokens,
      maxInputTokens: budget.maxInputTokens,
      maxOutputTokens: budget.maxOutputTokens,
      mode
    }
  };
}

function getOpenAIClient(openai = null) {
  if (openai?.chat?.completions?.create) return openai;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

function extractCompletionText(completion = {}) {
  return (
    completion?.choices?.[0]?.message?.content ||
    completion?.output_text ||
    ""
  );
}

export async function callOpenAIWithOrchestration(args = {}) {
  const openai = getOpenAIClient(args.openai);

  const orchestration =
    args.orchestrationContext ||
    buildOpenAIContext(args);

  const completion = await openai.chat.completions.create({
    model: args.model || orchestration.model,
    messages: orchestration.messages,
    temperature:
      args.temperature ??
      orchestration.temperature ??
      0.1,
    max_tokens:
      args.max_tokens ||
      args.maxOutputTokens ||
      orchestration.maxOutputTokens
  });

  const answer = extractCompletionText(completion);

  return {
    completion,
    orchestration,
    answer,
    text: answer,
    output_text: answer
  };
}

export function contextOrchestrationHealthCheck() {
  return {
    ok: true,
    engine: "TINA_CONTEXT_ORCHESTRATION_ENGINE",
    version: "3.0.0",
    singleSourceOfTruthForTokenControl: true,
    exportsEstimateTokens: true,
    exportsEstimateMessagesTokens: true,
    exportsEstimatePromptTokens: true,
    exportsCompressRetrievedSources: true,
    exportsTrimMessagesToBudget: true,
    buildOpenAIContextReady: true,
    callOpenAIWithOrchestrationReady: true,
    oversizedPromptProtectionEnabled: true
  };
}

export {
  determineMode,
  detectComplexity,
  assignBudget,
  trimRetrieval,
  compressSources,
  finalTrimMessages
};

export default {
  buildOpenAIContext,
  callOpenAIWithOrchestration,
  estimateTokens,
  estimateMessagesTokens,
  estimatePromptTokens,
  determineMode,
  detectComplexity,
  assignBudget,
  trimRetrieval,
  compressSources,
  compressRetrievedSources,
  trimMessagesToBudget,
  contextOrchestrationHealthCheck
};
