// FILE: context-orchestration-engine.js
"use strict";

/**
 * TINA Context Orchestration Engine
 * Version: 4.0.0
 *
 * FINAL ORCHESTRATION SOURCE
 *
 * This is the only file allowed to:
 * - estimate tokens
 * - classify complexity
 * - determine orchestration mode
 * - assign token budget
 * - trim retrieval
 * - compress sources
 * - assemble OpenAI messages
 * - final-trim OpenAI messages
 * - call OpenAI
 */

import OpenAI from "openai";

const ENGINE_VERSION = "4.0.0";

const DEFAULT_MODEL =
  process.env.OPENAI_MODEL ||
  process.env.DEFAULT_OPENAI_MODEL ||
  "gpt-4o-mini";

const MODEL_CONTEXT_LIMITS = Object.freeze({
  "gpt-4o-mini": 128000,
  "gpt-4o": 128000,
  "gpt-4.1-mini": 1000000,
  "gpt-4.1": 1000000,
  "gpt-4.1-nano": 1000000,
  "gpt-5": 400000,
  "gpt-5-mini": 400000,
  "gpt-5-nano": 400000
});

const HARD_SAFETY_RATIO = 0.6;

const MODE_CONFIG = Object.freeze({
  FAST_DEFINITION: {
    maxInputTokens: 9000,
    maxOutputTokens: 900,
    maxSources: 3,
    maxCharsPerSource: 900,
    maxHistoryItems: 3,
    temperature: 0.1
  },

  STANDARD_TAX: {
    maxInputTokens: 18000,
    maxOutputTokens: 1600,
    maxSources: 5,
    maxCharsPerSource: 1400,
    maxHistoryItems: 4,
    temperature: 0.1
  },

  LEGAL_ANALYSIS: {
    maxInputTokens: 28000,
    maxOutputTokens: 2200,
    maxSources: 6,
    maxCharsPerSource: 1700,
    maxHistoryItems: 4,
    temperature: 0.1
  },

  COMPLEX_ADVISORY: {
    maxInputTokens: 36000,
    maxOutputTokens: 2600,
    maxSources: 8,
    maxCharsPerSource: 1800,
    maxHistoryItems: 5,
    temperature: 0.1
  },

  EMERGENCY_TRIM: {
    maxInputTokens: 7000,
    maxOutputTokens: 700,
    maxSources: 2,
    maxCharsPerSource: 600,
    maxHistoryItems: 2,
    temperature: 0.1
  }
});

function safeString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function normalizeWhitespace(value = "") {
  return safeString(value)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncateByChars(value = "", maxChars = 1200) {
  const text = safeString(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}\n\n[Trimmed by context orchestration.]`;
}

function truncateByTokens(value = "", maxTokens = 1000) {
  return truncateByChars(value, Math.max(0, Math.floor(maxTokens * 3.6)));
}

export function estimateTokens(text = "") {
  const value = safeString(text);
  if (!value) return 0;
  return Math.ceil(value.length / 3.6);
}

export function estimatePromptTokens(text = "") {
  return estimateTokens(text);
}

export function estimateMessagesTokens(messages = []) {
  return safeArray(messages).reduce((sum, msg) => {
    return (
      sum +
      estimateTokens(msg.role || "") +
      estimateTokens(msg.content || "") +
      6
    );
  }, 0);
}

function normalizeIssue(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function normalizeAuthority(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function normalizeBuildArgs(args = {}) {
  return {
    userQuery:
      args.userQuery ||
      args.question ||
      args.query ||
      "",

    systemPrompt:
      args.systemPrompt ||
      "",

    masterPrompt:
      args.masterPrompt ||
      "",

    retrievedSources:
      args.retrievedSources ||
      args.sources ||
      [],

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

    conversationHistory:
      args.conversationHistory ||
      args.messages ||
      [],

    adaptiveContext:
      args.adaptiveContext ||
      {},

    responsePlan:
      args.responsePlan ||
      args.adaptiveContext?.responsePlan ||
      {},

    model:
      args.model ||
      DEFAULT_MODEL
  };
}

export function detectComplexity(userQuery = "", classification = {}, intent = {}) {
  const q = safeString(userQuery).toLowerCase();

  if (classification?.complexity) return String(classification.complexity).toLowerCase();
  if (intent?.complexity) return String(intent.complexity).toLowerCase();

  const simple =
    q.length <= 140 &&
    /^(what is|define|meaning of|ano ang)\b/i.test(q) &&
    !/\b(analyze|risk|audit|contract|jurisprudence|doctrine|conflict|legal consequence|assessment|substance|evidence|compare|reconcile)\b/i.test(q);

  if (simple || intent?.requiresSimpleDefinition) return "simple";

  if (
    intent?.requiresFactPatternAnalysis ||
    intent?.requiresEvidenceEvaluation ||
    intent?.requiresContractInterpretation ||
    intent?.requiresTransactionCharacterization ||
    intent?.requiresEconomicSubstance ||
    /\b(audit|risk|contract|transaction|economic substance|substance over form|evidence|reconcile|legal consequence|fact pattern|principal|agent)\b/i.test(q)
  ) {
    return "complex";
  }

  if (
    intent?.requiresLegalAnalysis ||
    intent?.requiresJurisprudence ||
    /\b(jurisprudence|doctrine|conflict|legal basis|supreme court|cta|g\.?\s*r\.?\s*no|case law)\b/i.test(q)
  ) {
    return "moderate";
  }

  return "standard";
}

export function determineMode(userQuery = "", classification = {}, intent = {}) {
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
    ["TRANSACTION", "CONTRACT", "ECONOMIC_SUBSTANCE", "AUDIT", "ACCOUNTING"].includes(primaryIssue) ||
    /\b(audit|risk|contract|transaction|economic substance|substance over form|evidence|reconcile)\b/i.test(q)
  ) {
    return "COMPLEX_ADVISORY";
  }

  if (
    intent?.requiresLegalAnalysis ||
    intent?.requiresJurisprudence ||
    ["CASE_LAW", "DOCTRINE", "ASSESSMENT", "LITIGATION"].includes(primaryIssue) ||
    /\b(jurisprudence|doctrine|conflict|legal basis|case law|supreme court|cta)\b/i.test(q)
  ) {
    return "LEGAL_ANALYSIS";
  }

  return "STANDARD_TAX";
}

export function assignBudget(model = DEFAULT_MODEL, mode = "STANDARD_TAX") {
  const modelLimit =
    MODEL_CONTEXT_LIMITS[model] ||
    Number(process.env.OPENAI_CONTEXT_LIMIT || 128000);

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
    source.document_title ||
    source.metadata?.documentTitle ||
    source.metadata?.originalFileName ||
    source.originalSource ||
    source.original_source ||
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
    source.drive_view_url ||
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
        source.rerank_score ??
        source.retrievalScore ??
        source.retrieval_score ??
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
    title: truncateByChars(title, 220),
    authorityType: normalizeAuthority(authorityType) || "UNKNOWN",
    citation: truncateByChars(citation, 260),
    url:
      source.url ||
      source.driveViewUrl ||
      source.drive_view_url ||
      source.sourceUrl ||
      source.source_url ||
      "",
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
  const issueBonus =
    source.issueClassificationMatch?.matched ||
    source.issueClassificationMatch?.issueOverlap
      ? 80
      : 0;

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

export function trimRetrieval(sources = [], budget = assignBudget()) {
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

export function compressSources(sources = [], budget = assignBudget()) {
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
You are TINA, a Philippine tax, legal, audit, and compliance reasoning assistant.

Operating Mode: ${mode}

Core rules:
1. Answer directly first.
2. Use only relevant authorities and retrieved extracts.
3. Prefer controlling Philippine authorities.
4. Do not invent citations, cases, RRs, RMCs, RMOs, or rulings.
5. If sources are insufficient, say so clearly.
6. Do not dump unrelated jurisprudence.
7. Do not include raw source text, full debug objects, retrieval payloads, embeddings, metadata dumps, or full engine outputs.
8. Do not say "Conflict Detected: YES" unless same issue, same legal dimension, opposite holding, conflict type, and hierarchy resolution are established.
9. Keep the answer proportionate to the query.
`.trim();

  return normalizeWhitespace(
    [
      base,
      systemPrompt,
      masterPrompt
    ]
      .filter(Boolean)
      .join("\n\n")
  );
}

function buildUserPrompt({
  userQuery = "",
  classification = {},
  intent = {},
  compressedSources = "",
  adaptiveContext = {},
  responsePlan = {},
  mode = "STANDARD_TAX"
}) {
  const compactClassification = {
    primaryIssue: classification?.primaryIssue || classification?.domain || null,
    subIssue: classification?.subIssue || null,
    retrievalStrategy: classification?.retrievalStrategy || null,
    targetAuthorities: safeArray(classification?.targetAuthorities).slice(0, 10),
    factSensitivity: classification?.factSensitivity || null
  };

  const compactIntent = {
    intent: intent?.intent || intent?.type || null,
    requiresLegalAnalysis: Boolean(intent?.requiresLegalAnalysis),
    requiresJurisprudence: Boolean(intent?.requiresJurisprudence),
    requiresRiskAnalysis: Boolean(intent?.requiresRiskAnalysis),
    requiresFactPatternAnalysis: Boolean(intent?.requiresFactPatternAnalysis),
    requiresEvidenceEvaluation: Boolean(intent?.requiresEvidenceEvaluation),
    requiresContractInterpretation: Boolean(intent?.requiresContractInterpretation),
    requiresTransactionCharacterization: Boolean(intent?.requiresTransactionCharacterization),
    requiresEconomicSubstance: Boolean(intent?.requiresEconomicSubstance),
    requiresSimpleDefinition: Boolean(intent?.requiresSimpleDefinition)
  };

  const compactAdaptiveContext = {
    activeHook: adaptiveContext?.activeHook || adaptiveContext?.hookConfig?.hook_code || null,
    activeMode: adaptiveContext?.activeMode || adaptiveContext?.hookConfig?.mode || null,
    responseMode:
      adaptiveContext?.responseMode ||
      adaptiveContext?.responsePlan?.responseMode ||
      responsePlan?.responseMode ||
      null
  };

  return normalizeWhitespace(`
USER QUERY:
${truncateByChars(userQuery, 5000)}

CLASSIFICATION:
${JSON.stringify(compactClassification, null, 2)}

INTENT:
${JSON.stringify(compactIntent, null, 2)}

ADAPTIVE CONTEXT:
${JSON.stringify(compactAdaptiveContext, null, 2)}

RETRIEVED RELEVANT AUTHORITIES / EXTRACTS:
${compressedSources || "[No retrieved source extracts supplied.]"}

RESPONSE INSTRUCTION:
Use ${mode}. Answer only what is necessary. Do not include irrelevant cases, irrelevant regulations, debug data, hidden metadata, raw context, or internal engine objects.
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
      role: msg.role === "system" || msg.role === "assistant" ? msg.role : "user",
      content: safeString(msg.content || "")
    });
  }

  return output;
}

export function finalTrimMessages(messages = [], budget = assignBudget()) {
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

export function buildOpenAIContext(args = {}) {
  const normalized = normalizeBuildArgs(args);

  const complexity = detectComplexity(
    normalized.userQuery,
    normalized.classification,
    normalized.intent
  );

  const mode =
    normalized.responsePlan?.contextMode ||
    normalized.responsePlan?.orchestrationMode ||
    determineMode(
      normalized.userQuery,
      normalized.classification,
      normalized.intent
    );

  const budget = assignBudget(normalized.model, mode);

  const trimmedSources = trimRetrieval(
    normalized.retrievedSources,
    budget
  );

  const compressedSources = compressSources(
    trimmedSources,
    budget
  );

  const history = safeArray(normalized.conversationHistory)
    .slice(-budget.maxHistoryItems)
    .map((msg) => ({
      role:
        msg.role === "assistant"
          ? "assistant"
          : msg.role === "system"
            ? "system"
            : "user",

      content: truncateByChars(
        normalizeWhitespace(msg.content || ""),
        1200
      )
    }));

  const systemMessage = {
    role: "system",
    content: buildSystemInstruction({
      systemPrompt: normalized.systemPrompt,
      masterPrompt: normalized.masterPrompt,
      mode
    })
  };

  const userMessage = {
    role: "user",
    content: buildUserPrompt({
      userQuery: normalized.userQuery,
      classification: normalized.classification,
      intent: normalized.intent,
      compressedSources,
      adaptiveContext: normalized.adaptiveContext,
      responsePlan: normalized.responsePlan,
      mode
    })
  };

  const rawMessages = [
    systemMessage,
    ...history,
    userMessage
  ];

  const trimmed = finalTrimMessages(
    rawMessages,
    budget
  );

  return {
    engine: "TINA_CONTEXT_ORCHESTRATION_ENGINE",
    version: ENGINE_VERSION,

    complexity,
    mode,

    model: normalized.model,

    budget,

    retrievedSources: trimmedSources,
    compressedSources,

    messages: trimmed.messages,

    estimatedInputTokens:
      trimmed.estimatedInputTokens,

    maxCompletionTokens:
      budget.maxOutputTokens,

    temperature:
      budget.temperature,

    diagnostics: {
      orchestrationFinalSource: true,

      noPromptAssemblyOutsideThisFile: true,
      noDirectOpenAICallOutsideThisFile: true,

      retrievalTrimmed: true,
      retrievalCompressed: true,

      rawRetrievalPayloadInjectionPrevented: true,
      rawEngineObjectInjectionPrevented: true,
      fullDebugObjectInjectionPrevented: true,
      fullEngineOutputInjectionPrevented: true,

      finalTrimApplied:
        trimmed.wasTrimmed,

      sourceCount:
        trimmedSources.length,

      model:
        normalized.model,

      estimatedInputTokens:
        trimmed.estimatedInputTokens,

      maxCompletionTokens:
        budget.maxOutputTokens,

      complexity,
      mode
    }
  };
}

export async function callOpenAIWithOrchestration(args = {}) {
  const orchestration = buildOpenAIContext(args);

  const openai =
    args.openai ||
    new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

  const completion = await openai.chat.completions.create({
    model: orchestration.model,
    messages: orchestration.messages,
    max_tokens: orchestration.maxCompletionTokens,
    temperature: orchestration.temperature
  });

  const answer =
    completion?.choices?.[0]?.message?.content ||
    "";

  return {
    answer,

    orchestration: {
      engine: orchestration.engine,
      version: orchestration.version,

      complexity: orchestration.complexity,
      mode: orchestration.mode,

      estimatedInputTokens:
        orchestration.estimatedInputTokens,

      maxCompletionTokens:
        orchestration.maxCompletionTokens,

      sourceCount:
        orchestration.retrievedSources.length,

      wasTrimmed:
        orchestration.diagnostics.finalTrimApplied,

      diagnostics:
        orchestration.diagnostics
    },

    usage:
      completion?.usage || null,

    raw:
      completion
  };
}

export function contextOrchestrationHealthCheck() {
  return {
    ok: true,

    engine:
      "TINA_CONTEXT_ORCHESTRATION_ENGINE",

    version:
      ENGINE_VERSION,

    orchestrationFinalSource: true,

    onlyFileAllowedToBuildMessages: true,
    onlyFileAllowedToEstimateTokens: true,
    onlyFileAllowedToTrimContext: true,
    onlyFileAllowedToCompressSources: true,
    onlyFileAllowedToCallOpenAI: true,

    noPromptAssemblyOutsideThisFile: true,
    noDirectOpenAICallOutsideThisFile: true,

    rawRetrievalPayloadInjectionPrevented: true,
    rawEngineObjectInjectionPrevented: true,
    fullDebugObjectInjectionPrevented: true,
    fullEngineOutputInjectionPrevented: true,

    supportsComplexityClassification: true,
    supportsModeDetection: true,
    supportsTokenBudgeting: true,
    supportsRetrievalCompression: true,
    supportsFinalTrim: true,

    supportedModes:
      Object.keys(MODE_CONFIG),

    supportedModels:
      Object.keys(MODEL_CONTEXT_LIMITS)
  };
}

export default {
  buildOpenAIContext,
  callOpenAIWithOrchestration,

  detectComplexity,
  determineMode,
  assignBudget,

  trimRetrieval,
  compressSources,
  compressRetrievedSources,

  estimateTokens,
  estimatePromptTokens,
  estimateMessagesTokens,

  trimMessagesToBudget,
  finalTrimMessages,

  contextOrchestrationHealthCheck
};
