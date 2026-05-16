// FILE: context-orchestration-engine.js
// PURPOSE:
// Central context-governance layer for TINA before any OpenAI API call.
// It prevents token overflow by classifying complexity, assigning mode/budget,
// trimming retrieval, compressing sources, assembling messages, estimating tokens,
// and performing final trimming before model execution.

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const MODEL_CONTEXT_LIMITS = {
  "gpt-4o-mini": 128000,
  "gpt-4o": 128000,
  "gpt-4.1-mini": 1000000,
  "gpt-4.1": 1000000,
  "gpt-4.1-nano": 1000000
};

const DEFAULT_CONTEXT_LIMIT =
  MODEL_CONTEXT_LIMITS[DEFAULT_MODEL] || Number(process.env.OPENAI_CONTEXT_LIMIT || 128000);

const HARD_SAFETY_RATIO = 0.7;

const MODE_CONFIG = {
  FAST_DEFINITION: {
    maxInputTokens: 12000,
    maxOutputTokens: 1200,
    maxSources: 3,
    maxCharsPerSource: 1800,
    temperature: 0.1
  },
  STANDARD_TAX: {
    maxInputTokens: 30000,
    maxOutputTokens: 2500,
    maxSources: 5,
    maxCharsPerSource: 3000,
    temperature: 0.1
  },
  LEGAL_ANALYSIS: {
    maxInputTokens: 55000,
    maxOutputTokens: 4000,
    maxSources: 8,
    maxCharsPerSource: 4500,
    temperature: 0.1
  },
  COMPLEX_ADVISORY: {
    maxInputTokens: 75000,
    maxOutputTokens: 5500,
    maxSources: 10,
    maxCharsPerSource: 5500,
    temperature: 0.1
  },
  EMERGENCY_TRIM: {
    maxInputTokens: 18000,
    maxOutputTokens: 1800,
    maxSources: 4,
    maxCharsPerSource: 2000,
    temperature: 0.1
  }
};

function safeString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
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

function estimateTokens(text = "") {
  const str = safeString(text);
  if (!str) return 0;

  // Conservative estimate:
  // English/legal text is roughly 3.5 to 4 chars per token.
  return Math.ceil(str.length / 3.6);
}

function estimateMessagesTokens(messages = []) {
  return messages.reduce((sum, msg) => {
    return sum + estimateTokens(msg.role || "") + estimateTokens(msg.content || "") + 6;
  }, 0);
}

function truncateByTokens(text = "", maxTokens = 1000) {
  const str = safeString(text);
  const approxChars = Math.max(0, Math.floor(maxTokens * 3.6));
  if (str.length <= approxChars) return str;
  return str.slice(0, approxChars).trim() + "\n\n[Trimmed due to context budget.]";
}

function truncateByChars(text = "", maxChars = 3000) {
  const str = safeString(text);
  if (str.length <= maxChars) return str;
  return str.slice(0, maxChars).trim() + "\n\n[Trimmed due to context budget.]";
}

function detectComplexity(userQuery = "", classification = {}, intent = {}) {
  const q = safeString(userQuery).toLowerCase();

  const simplePatterns = [
    /^what is\b/,
    /^define\b/,
    /^meaning of\b/,
    /^ano ang\b/,
    /^what are\b/,
    /^explain\b/
  ];

  const complexSignals = [
    "analyze",
    "evaluate",
    "risk",
    "legal consequence",
    "conflict",
    "jurisprudence",
    "case law",
    "doctrine",
    "tax treatment",
    "audit",
    "reconcile",
    "compare",
    "defend",
    "position",
    "assessment",
    "bir risk",
    "withholding",
    "vat risk",
    "income tax impact",
    "transaction",
    "contract",
    "economic substance",
    "substance over form",
    "supporting documents",
    "legal basis versus",
    "why",
    "how about",
    "what if"
  ];

  const legalSignals = [
    "nirc",
    "rr ",
    "revenue regulation",
    "rmc",
    "rmo",
    "bir ruling",
    "supreme court",
    "cta",
    "gr no",
    "g.r.",
    "jurisprudence",
    "case",
    "doctrine",
    "legal basis"
  ];

  const isSimple =
    userQuery.length <= 120 &&
    simplePatterns.some((p) => p.test(q)) &&
    !complexSignals.some((s) => q.includes(s));

  const hasComplex = complexSignals.some((s) => q.includes(s));
  const hasLegal = legalSignals.some((s) => q.includes(s));

  if (classification?.complexity) return classification.complexity;

  if (isSimple) return "simple";
  if (hasComplex && hasLegal) return "complex";
  if (hasComplex || hasLegal) return "moderate";

  if (intent?.requiresLegalAnalysis || intent?.requiresRiskAnalysis) return "complex";

  return "standard";
}

function determineMode(userQuery = "", classification = {}, intent = {}) {
  const complexity = detectComplexity(userQuery, classification, intent);
  const q = safeString(userQuery).toLowerCase();

  if (
    complexity === "simple" &&
    (q.includes("what is") || q.includes("define") || q.includes("meaning"))
  ) {
    return "FAST_DEFINITION";
  }

  if (
    q.includes("jurisprudence") ||
    q.includes("doctrine") ||
    q.includes("conflict") ||
    q.includes("legal basis") ||
    q.includes("case law") ||
    intent?.requiresLegalAnalysis
  ) {
    return "LEGAL_ANALYSIS";
  }

  if (
    q.includes("audit") ||
    q.includes("risk") ||
    q.includes("contract") ||
    q.includes("economic substance") ||
    q.includes("transaction") ||
    q.includes("reconcile") ||
    intent?.requiresRiskAnalysis ||
    intent?.requiresFactPatternAnalysis
  ) {
    return "COMPLEX_ADVISORY";
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
    temperature: config.temperature
  };
}

function normalizeSource(source = {}, index = 0) {
  const title =
    source.title ||
    source.name ||
    source.fileName ||
    source.filename ||
    source.documentTitle ||
    `Source ${index + 1}`;

  const authorityType =
    source.authorityType ||
    source.type ||
    source.category ||
    source.sourceType ||
    "General Source";

  const citation =
    source.citation ||
    source.url ||
    source.webUrl ||
    source.sourceUrl ||
    source.fileId ||
    source.id ||
    "";

  const text =
    source.text ||
    source.content ||
    source.chunkText ||
    source.excerpt ||
    source.pageContent ||
    source.summary ||
    "";

  const score =
    Number(source.score ?? source.similarity ?? source.relevance ?? source.rankScore ?? 0) || 0;

  return {
    ...source,
    _normalizedTitle: safeString(title),
    _normalizedAuthorityType: safeString(authorityType),
    _normalizedCitation: safeString(citation),
    _normalizedText: normalizeWhitespace(text),
    _normalizedScore: score
  };
}

function authorityPriority(source = {}) {
  const text = `${source._normalizedTitle} ${source._normalizedAuthorityType} ${source._normalizedCitation}`.toLowerCase();

  if (text.includes("nirc") || text.includes("tax code")) return 100;
  if (text.includes("revenue regulation") || /\brr\b/.test(text)) return 95;
  if (text.includes("revenue memorandum circular") || /\brmc\b/.test(text)) return 90;
  if (text.includes("revenue memorandum order") || /\brmo\b/.test(text)) return 85;
  if (text.includes("bir ruling")) return 80;
  if (text.includes("supreme court") || text.includes("g.r.") || text.includes("gr no")) return 75;
  if (text.includes("cta")) return 70;
  if (text.includes("sec")) return 65;
  if (text.includes("pfrs") || text.includes("pas ")) return 60;
  return 40;
}

function trimRetrieval(sources = [], budget = assignBudget()) {
  const normalized = Array.isArray(sources)
    ? sources.map((s, i) => normalizeSource(s, i)).filter((s) => s._normalizedText)
    : [];

  const sorted = normalized.sort((a, b) => {
    const ap = authorityPriority(a);
    const bp = authorityPriority(b);

    if (bp !== ap) return bp - ap;
    return b._normalizedScore - a._normalizedScore;
  });

  return sorted.slice(0, budget.maxSources);
}

function compressOneSource(source = {}, budget = assignBudget(), index = 0) {
  const text = truncateByChars(source._normalizedText, budget.maxCharsPerSource);

  return [
    `SOURCE ${index + 1}`,
    `Title: ${source._normalizedTitle}`,
    `Authority Type: ${source._normalizedAuthorityType}`,
    source._normalizedCitation ? `Citation/Link: ${source._normalizedCitation}` : null,
    `Relevant Extract:`,
    text
  ]
    .filter(Boolean)
    .join("\n");
}

function compressSources(sources = [], budget = assignBudget()) {
  const trimmed = trimRetrieval(sources, budget);
  return trimmed.map((source, index) => compressOneSource(source, budget, index)).join("\n\n---\n\n");
}

function buildSystemInstruction({ systemPrompt = "", masterPrompt = "", mode = "STANDARD_TAX" }) {
  const base = `
You are TINA, a Philippine tax information and reasoning assistant.

Operating Mode: ${mode}

Core response rules:
1. Answer the user directly first.
2. Use only relevant authorities and retrieved extracts.
3. Prefer Philippine primary authorities: NIRC, revenue regulations, RMCs, RMOs, BIR rulings, Supreme Court, CTA, and official agencies.
4. Do not invent citations.
5. If sources are insufficient, say so clearly.
6. Do not dump irrelevant jurisprudence.
7. If no direct conflict exists, state that no direct doctrinal conflict was detected.
8. If a conflict exists, explain the exact issue, exact conflict, controlling authority, and why one prevails.
9. Keep the answer proportionate to the user query.
10. Avoid excessive background when the question is simple.
`;

  const raw = [base, systemPrompt, masterPrompt].filter(Boolean).join("\n\n");
  return normalizeWhitespace(raw);
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
    targetAuthorities: classification?.targetAuthorities || null
  };

  const compactIntent = {
    intent: intent?.intent || intent?.type || null,
    requiresLegalAnalysis: Boolean(intent?.requiresLegalAnalysis),
    requiresRiskAnalysis: Boolean(intent?.requiresRiskAnalysis),
    requiresFactPatternAnalysis: Boolean(intent?.requiresFactPatternAnalysis)
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
Use the operating mode ${mode}. Answer only what is necessary. Do not include irrelevant cases, irrelevant regulations, debug data, hidden metadata, or internal engine objects.
`);
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

  // First trim system instruction.
  trimmedMessages[0].content = truncateByTokens(
    trimmedMessages[0].content,
    Math.floor(budget.maxInputTokens * 0.25)
  );

  // Then trim user prompt.
  trimmedMessages[trimmedMessages.length - 1].content = truncateByTokens(
    trimmedMessages[trimmedMessages.length - 1].content,
    Math.floor(budget.maxInputTokens * 0.7)
  );

  currentTokens = estimateMessagesTokens(trimmedMessages);

  // Emergency trim if still too large.
  if (currentTokens > budget.maxInputTokens) {
    const emergencyBudget = assignBudget(budget.model, "EMERGENCY_TRIM");

    trimmedMessages = trimmedMessages.map((m, idx) => {
      const max = idx === 0
        ? Math.floor(emergencyBudget.maxInputTokens * 0.25)
        : Math.floor(emergencyBudget.maxInputTokens * 0.7);

      return {
        ...m,
        content: truncateByTokens(m.content, max)
      };
    });

    currentTokens = estimateMessagesTokens(trimmedMessages);
  }

  return {
    messages: trimmedMessages,
    estimatedInputTokens: currentTokens,
    wasTrimmed: true
  };
}

export function buildOpenAIContext({
  userQuery = "",
  systemPrompt = "",
  masterPrompt = "",
  retrievedSources = [],
  classification = {},
  intent = {},
  conversationHistory = [],
  model = DEFAULT_MODEL
} = {}) {
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

  const safeHistory = Array.isArray(conversationHistory)
    ? conversationHistory
        .slice(-4)
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: truncateByTokens(m.content || "", 700)
        }))
    : [];

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
    complexity: detectComplexity(userQuery, classification, intent),
    messages: final.messages,
    temperature: budget.temperature,
    maxOutputTokens: budget.maxOutputTokens,
    max_tokens: budget.maxOutputTokens,
    estimatedInputTokens: final.estimatedInputTokens,
    wasTrimmed: final.wasTrimmed,
    budget,
    diagnostics: {
      sourceCountInput: Array.isArray(retrievedSources) ? retrievedSources.length : 0,
      sourceCountUsed: trimRetrieval(retrievedSources, budget).length,
      estimatedInputTokens: final.estimatedInputTokens,
      maxInputTokens: budget.maxInputTokens,
      maxOutputTokens: budget.maxOutputTokens,
      mode
    }
  };
}

export async function callOpenAIWithOrchestration({
  openai,
  userQuery = "",
  systemPrompt = "",
  masterPrompt = "",
  retrievedSources = [],
  classification = {},
  intent = {},
  conversationHistory = [],
  model = DEFAULT_MODEL
} = {}) {
  if (!openai?.chat?.completions?.create) {
    throw new Error("Invalid OpenAI client supplied to callOpenAIWithOrchestration().");
  }

  const orchestration = buildOpenAIContext({
    userQuery,
    systemPrompt,
    masterPrompt,
    retrievedSources,
    classification,
    intent,
    conversationHistory,
    model
  });

  const completion = await openai.chat.completions.create({
    model: orchestration.model,
    messages: orchestration.messages,
    temperature: orchestration.temperature,
    max_tokens: orchestration.maxOutputTokens
  });

  return {
    completion,
    orchestration
  };
}

export default {
  buildOpenAIContext,
  callOpenAIWithOrchestration,
  estimateTokens,
  estimateMessagesTokens,
  determineMode,
  detectComplexity,
  assignBudget,
  trimRetrieval,
  compressSources
};
