// FILE: doctrine-tagging-engine.js

import { rerankByHierarchy } from "./authority-engine.js";

const DOCTRINE_LIBRARY = {
  SUBSTANCE_OVER_FORM: {
    label: "Substance Over Form",
    aliases: [
      "substance over form",
      "economic substance",
      "real nature of the transaction",
      "true nature of the transaction",
      "real transaction",
      "substance controls over form"
    ],
    concepts: [
      "transaction should be judged by its real substance",
      "formal structure cannot defeat tax consequences",
      "sham arrangements should not control"
    ]
  },
  BUSINESS_PURPOSE_TEST: {
    label: "Business Purpose Test",
    aliases: [
      "business purpose",
      "business purpose test",
      "no real business activity",
      "legitimate business purpose",
      "valid business purpose"
    ],
    concepts: [
      "transaction must have a real business reason",
      "mere tax reduction is not enough",
      "lack of commercial purpose may indicate avoidance or evasion risk"
    ]
  },
  SIMULATION: {
    label: "Simulation of Transactions",
    aliases: [
      "simulation",
      "simulated transaction",
      "fictitious transaction",
      "sham transaction",
      "dummy corporation",
      "dummy entity",
      "no real business activity"
    ],
    concepts: [
      "transaction may be unreal or fictitious",
      "paper arrangement without real substance",
      "simulated acts may conceal true tax consequences"
    ]
  },
  FRAUD_INTENT: {
    label: "Fraud / Intent",
    aliases: [
      "fraud",
      "fraudulent intent",
      "intent to evade",
      "willful",
      "deliberate",
      "bad faith",
      "tax evasion"
    ],
    concepts: [
      "tax evasion requires wrongful intent or fraud",
      "willful attempt to evade tax is material",
      "bad faith may distinguish evasion from avoidance"
    ]
  },
  ECONOMIC_SUBSTANCE: {
    label: "Economic Substance",
    aliases: [
      "economic substance",
      "real economic effect",
      "commercial reality",
      "no economic substance"
    ],
    concepts: [
      "arrangement must have meaningful economic consequences",
      "mere formal compliance may be insufficient"
    ]
  },
  TAX_AVOIDANCE_VS_EVASION: {
    label: "Tax Avoidance vs Tax Evasion",
    aliases: [
      "tax avoidance",
      "tax evasion",
      "distinguish tax avoidance and tax evasion",
      "avoidance versus evasion",
      "avoidance vs evasion"
    ],
    concepts: [
      "avoidance is generally legal",
      "evasion is generally illegal",
      "fraud, deceit, or sham may turn the arrangement into evasion"
    ]
  },
  VAT_NATURE: {
    label: "Nature of VAT",
    aliases: [
      "vat",
      "value-added tax",
      "value added tax",
      "indirect tax",
      "tax on sale of goods and services"
    ],
    concepts: [
      "vat is an indirect tax",
      "vat is imposed on sale, barter, exchange, or lease",
      "vat is borne by the end consumer"
    ]
  }
};

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function tokenize(value = "") {
  return lower(value)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function sourcePathOf(doc = {}) {
  return (
    doc.path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    null
  );
}

function sourceTitleOf(doc = {}) {
  return (
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.originalSource ||
    doc.source ||
    sourcePathOf(doc) ||
    "Unknown source"
  );
}

function doctrineEntries() {
  return Object.entries(DOCTRINE_LIBRARY);
}

export function detectDoctrineIntent(question = "") {
  const q = lower(question);
  const matched = [];

  for (const [code, item] of doctrineEntries()) {
    const aliasHit = item.aliases.some((alias) => q.includes(lower(alias)));
    const conceptHit = item.concepts.some((concept) => q.includes(lower(concept)));
    if (aliasHit || conceptHit) {
      matched.push({
        code,
        label: item.label
      });
    }
  }

  const explicitSignals = [
    "doctrine",
    "apply the doctrine",
    "legal doctrine",
    "business purpose test",
    "substance over form",
    "simulation",
    "economic substance",
    "fraud",
    "intent"
  ];

  const isDoctrineFocused =
    matched.length > 0 ||
    explicitSignals.some((signal) => q.includes(signal));

  return {
    isDoctrineFocused,
    matchedDoctrineCodes: matched.map((item) => item.code),
    matchedDoctrineLabels: matched.map((item) => item.label)
  };
}

function computePhraseHits(text = "", phrases = []) {
  const haystack = lower(text);
  let hits = 0;

  for (const phrase of phrases) {
    if (haystack.includes(lower(phrase))) {
      hits += 1;
    }
  }

  return hits;
}

function computeTokenOverlap(query = "", text = "") {
  const queryTokens = unique(tokenize(query)).filter((token) => token.length > 2);
  const textTokens = new Set(tokenize(text));

  if (!queryTokens.length || !textTokens.size) return 0;

  let hits = 0;
  for (const token of queryTokens) {
    if (textTokens.has(token)) hits += 1;
  }

  return hits / queryTokens.length;
}

function buildDocDoctrineText(doc = {}) {
  return [
    doc.text,
    doc.source,
    doc.originalSource,
    doc.path,
    doc.metadata?.path,
    doc.metadata?.documentTitle,
    doc.metadata?.originalFileName
  ]
    .filter(Boolean)
    .join(" ");
}

function scoreDoctrineAgainstDoc(doctrineCode, doc = {}, question = "") {
  const doctrine = DOCTRINE_LIBRARY[doctrineCode];
  if (!doctrine) {
    return {
      doctrineCode,
      doctrineLabel: doctrineCode,
      score: 0,
      aliasHits: 0,
      conceptHits: 0,
      queryOverlap: 0
    };
  }

  const text = buildDocDoctrineText(doc);
  const aliasHits = computePhraseHits(text, doctrine.aliases);
  const conceptHits = computePhraseHits(text, doctrine.concepts);
  const queryOverlap = computeTokenOverlap(question, text);

  const score =
    aliasHits * 0.5 +
    conceptHits * 0.3 +
    queryOverlap * 0.2;

  return {
    doctrineCode,
    doctrineLabel: doctrine.label,
    score: Number(score.toFixed(4)),
    aliasHits,
    conceptHits,
    queryOverlap: Number(queryOverlap.toFixed(4))
  };
}

export function tagDoctrineCandidates({
  question = "",
  retrievedResults = [],
  limit = 8
}) {
  const reranked = rerankByHierarchy(retrievedResults, question);
  const intent = detectDoctrineIntent(question);

  const activeDoctrineCodes =
    intent.matchedDoctrineCodes.length > 0
      ? intent.matchedDoctrineCodes
      : doctrineEntries().map(([code]) => code);

  const tagged = reranked.map((doc) => {
    const doctrineScores = activeDoctrineCodes
      .map((code) => scoreDoctrineAgainstDoc(code, doc, question))
      .sort((a, b) => b.score - a.score);

    const topDoctrine = doctrineScores[0] || null;

    return {
      ...doc,
      doctrineTags: doctrineScores.filter((item) => item.score > 0),
      topDoctrineCode: topDoctrine?.doctrineCode || null,
      topDoctrineLabel: topDoctrine?.doctrineLabel || null,
      doctrineScore: topDoctrine?.score || 0,
      doctrineFinalScore:
        Number(doc.finalScore || doc.score || 0) * 0.7 +
        Number(topDoctrine?.score || 0) * 30 * 0.3
    };
  });

  return {
    intent,
    candidates: tagged
      .filter((doc) => doc.doctrineScore > 0 || !intent.isDoctrineFocused)
      .sort((a, b) => b.doctrineFinalScore - a.doctrineFinalScore)
      .slice(0, limit)
  };
}

export function selectTopDoctrineAuthorities({
  question = "",
  retrievedResults = [],
  limit = 3
}) {
  const { intent, candidates } = tagDoctrineCandidates({
    question,
    retrievedResults,
    limit: Math.max(limit * 2, 6)
  });

  return {
    intent,
    topAuthorities: candidates.slice(0, limit).map((doc) => ({
      doctrineCode: doc.topDoctrineCode,
      doctrineLabel: doc.topDoctrineLabel,
      doctrineScore: doc.doctrineScore,
      source: sourcePathOf(doc),
      title: sourceTitleOf(doc),
      authorityType:
        doc.authorityType ||
        doc.authority_type ||
        doc.metadata?.authorityType ||
        "UNKNOWN",
      authorityLevel:
        doc.authorityLevel ||
        doc.authority_level ||
        doc.metadata?.authorityLevel ||
        99,
      excerpt: normalizeText(doc.text || "").slice(0, 320)
    }))
  };
}

export function buildDoctrineSummary({
  question = "",
  retrievedResults = [],
  limit = 3
}) {
  const { intent, topAuthorities } = selectTopDoctrineAuthorities({
    question,
    retrievedResults,
    limit
  });

  const summary = topAuthorities.length
    ? topAuthorities
        .map((item, index) =>
          [
            `${index + 1}. ${item.doctrineLabel || "Untitled Doctrine"}`,
            `Source: ${item.title || item.source || "Unknown source"}`,
            `Authority: ${item.authorityType} (Level ${item.authorityLevel})`,
            `Excerpt: ${item.excerpt}`
          ].join("\n")
        )
        .join("\n\n")
    : "No strong doctrine-tagged authority found.";

  return {
    intent,
    topAuthorities,
    summary
  };
}

export function buildDoctrinePrompt({
  question = "",
  doctrineSummary = ""
}) {
  return `
You are TINA, a Philippine tax research and compliance assistant.

STRICT RULES:
1. Use only the doctrine-tagged indexed authorities below.
2. Do not invent doctrine names, holdings, or legal tests.
3. Prefer higher-authority legal sources.
4. If doctrine support is weak, say so clearly.
5. Never mention ChatGPT.

RESPONSE FORMAT:
1. DIRECT ANSWER
2. DOCTRINE APPLIED
3. LEGAL BASIS
4. ANALYSIS
5. PRACTICAL IMPLICATION
6. SOURCES USED

QUESTION:
${question}

DOCTRINE-TAGGED AUTHORITIES:
${doctrineSummary}
`.trim();
}

export async function maybeGenerateDoctrineAnswer({
  openai,
  question = "",
  retrievedResults = [],
  model = process.env.OPENAI_MODEL || "gpt-4o-mini"
}) {
  const { intent, topAuthorities, summary } = buildDoctrineSummary({
    question,
    retrievedResults,
    limit: 3
  });

  if (!intent.isDoctrineFocused) {
    return {
      handled: false,
      answer: "",
      intent,
      topAuthorities: []
    };
  }

  if (!topAuthorities.length) {
    return {
      handled: true,
      answer: "I cannot find sufficient doctrine support in the uploaded knowledge base.",
      intent,
      topAuthorities: []
    };
  }

  const prompt = buildDoctrinePrompt({
    question,
    doctrineSummary: summary
  });

  const response = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Answer this doctrine-focused tax question strictly from the doctrine-tagged authorities:\n${question}`
      }
    ]
  });

  const answer =
    response.choices?.[0]?.message?.content?.trim() ||
    "I cannot find sufficient doctrine support in the uploaded knowledge base.";

  return {
    handled: true,
    answer,
    intent,
    topAuthorities
  };
}

export {
  DOCTRINE_LIBRARY
};
