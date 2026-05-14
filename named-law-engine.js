// FILE: named-law-engine.js
"use strict";

/**
 * TINA Enterprise Named Law Engine
 * Version: 3.0.1
 *
 * Patch:
 * - Fixed CommonJS authority-engine.js import compatibility.
 * - Keeps this file as ES Module.
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);

const {
  AUTHORITY_LEVEL = {},
  classifyAuthorityFromDocument
} = require("./authority-engine.js");

const ENGINE_VERSION = "3.0.1";

/* =========================================================
 * OFFICIAL SOURCES
 * ========================================================= */

const OFFICIAL_SOURCES = {
  LAWPHIL: "https://lawphil.net",
  BIR: "https://www.bir.gov.ph",
  FIRB: "https://firb.gov.ph",
  DOF: "https://www.dof.gov.ph"
};

/* =========================================================
 * HELPERS
 * ========================================================= */

function uniq(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeWhitespace(text = "") {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(text = "") {
  return String(text || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

/* =========================================================
 * LAW NORMALIZATION
 * ========================================================= */

export function normalizeLawText(text = "") {
  return normalizeWhitespace(
    String(text || "")
      .toLowerCase()
      .replace(/[“”"'`]/g, "")
      .replace(/\brepublic\s+act\s+no\.?\s*/g, "ra ")
      .replace(/\br\.?\s*a\.?\s*no\.?\s*/g, "ra ")
      .replace(/\br\.?\s*a\.?\s*/g, "ra ")
      .replace(/\bnational internal revenue code\b/g, "nirc")
      .replace(/\bease of paying taxes act\b/g, "eopt")
      .replace(/\bcorporate recovery and tax incentives for enterprises act\b/g, "create law")
      .replace(/\bcorporate recovery and tax incentives for enterprises\b/g, "create law")
      .replace(/\btax reform for acceleration and inclusion act\b/g, "train law")
      .replace(/\btax reform for acceleration and inclusion\b/g, "train law")
      .replace(/\bcreate more act\b/g, "create more")
      .replace(/\bcreate act\b/g, "create law")
      .replace(/\beopt act\b/g, "eopt")
      .replace(/\bthe tax code\b/g, "tax code")
      .replace(/[()\-_,:;]+/g, " ")
  );
}

/* =========================================================
 * DOCUMENT HELPERS
 * ========================================================= */

function getDocPath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.originalSource ||
    doc.original_source ||
    doc.source ||
    doc.title ||
    ""
  );
}

function getDocAliases(doc = {}) {
  return uniq([
    ...safeArray(doc.normalizedAliases),
    ...safeArray(doc.normalized_aliases),
    ...safeArray(doc.metadata?.normalizedAliases)
  ]);
}

function buildDocHaystack(doc = {}) {
  return normalizeLawText(
    [
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.title,
      doc.text?.slice?.(0, 5000),
      doc.content?.slice?.(0, 5000),
      doc.metadata?.path,
      doc.metadata?.originalSource,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      doc.normalizedReference,
      doc.normalized_reference,
      ...getDocAliases(doc)
    ]
      .filter(Boolean)
      .join(" ")
  );
}

/* =========================================================
 * AUTHORITY DETECTION
 * ========================================================= */

function detectDocAuthorityType(doc = {}) {
  const explicit =
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    "";

  if (explicit) {
    return String(explicit).toUpperCase();
  }

  if (typeof classifyAuthorityFromDocument === "function") {
    return classifyAuthorityFromDocument({
      fileName: doc.source || doc.originalSource || doc.title || "",
      path: getDocPath(doc),
      text: doc.text || doc.content || ""
    });
  }

  return "UNKNOWN";
}

function authorityWeightForNamedLaw(authorityType = "") {
  const type = String(authorityType || "").toUpperCase();

  switch (type) {
    case "CONSTITUTION":
      return 200;
    case "STATUTE":
      return 180;
    case "TREATY":
      return 160;
    case "SUPREME_COURT":
      return 145;
    case "CTA_EN_BANC":
      return 138;
    case "COURT_OF_APPEALS":
      return 132;
    case "CTA_DIVISION":
      return 126;
    case "RR":
      return 110;
    case "RMC":
      return 80;
    case "RMO":
      return 72;
    case "RAMO":
      return 68;
    case "BIR_RULING":
      return 60;
    default:
      return 0;
  }
}

/* =========================================================
 * ISSUANCE REFERENCES
 * ========================================================= */

function extractIssuanceRefs(text = "") {
  const value = normalizeLawText(text);
  const refs = [];

  const patterns = [
    { type: "rr", regex: /\brr\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g },
    { type: "rmc", regex: /\brmc\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g },
    { type: "rmo", regex: /\brmo\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g },
    { type: "ramo", regex: /\bramo\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g }
  ];

  for (const { type, regex } of patterns) {
    for (const match of value.matchAll(regex)) {
      const year =
        String(match[2]).length === 2
          ? `20${match[2]}`
          : String(match[2]);

      refs.push(`${type}-${String(match[1]).replace(/^0+/, "")}-${year}`);
    }
  }

  return uniq(refs);
}

/* =========================================================
 * NAMED LAW REGISTRY
 * ========================================================= */

export const NAMED_LAW_REGISTRY = [
  {
    id: "RA-8424",
    canonicalTitle: "National Internal Revenue Code of 1997",
    shortTitle: "Tax Code",
    republicActNumber: "8424",
    category: "tax_code",
    enactedOn: "1997-12-11",
    authorityType: "STATUTE",
    authorityLevel: AUTHORITY_LEVEL.STATUTE || 2,
    aliases: [
      "ra 8424",
      "nirc",
      "tax code",
      "national internal revenue code",
      "philippine tax code"
    ],
    officialSources: [
      `${OFFICIAL_SOURCES.LAWPHIL}/statutes/repacts/ra1997/ra_8424_1997.html`
    ]
  },
  {
    id: "RA-10963",
    canonicalTitle: "Tax Reform for Acceleration and Inclusion Act",
    shortTitle: "TRAIN Law",
    republicActNumber: "10963",
    category: "tax_reform",
    enactedOn: "2017-12-19",
    authorityType: "STATUTE",
    authorityLevel: AUTHORITY_LEVEL.STATUTE || 2,
    aliases: [
      "ra 10963",
      "train",
      "train law"
    ],
    officialSources: [
      `${OFFICIAL_SOURCES.LAWPHIL}/statutes/repacts/ra2017/ra_10963_2017.html`
    ]
  },
  {
    id: "RA-11534",
    canonicalTitle: "Corporate Recovery and Tax Incentives for Enterprises Act",
    shortTitle: "CREATE Law",
    republicActNumber: "11534",
    category: "tax_reform",
    enactedOn: "2021-03-26",
    authorityType: "STATUTE",
    authorityLevel: AUTHORITY_LEVEL.STATUTE || 2,
    aliases: [
      "ra 11534",
      "create",
      "create law"
    ],
    officialSources: [
      `${OFFICIAL_SOURCES.LAWPHIL}/statutes/repacts/ra2021/ra_11534_2021.html`
    ]
  },
  {
    id: "RA-11976",
    canonicalTitle: "Ease of Paying Taxes Act",
    shortTitle: "EOPT",
    republicActNumber: "11976",
    category: "tax_administration",
    enactedOn: "2024-01-05",
    authorityType: "STATUTE",
    authorityLevel: AUTHORITY_LEVEL.STATUTE || 2,
    aliases: [
      "ra 11976",
      "eopt",
      "ease of paying taxes"
    ],
    officialSources: [
      `${OFFICIAL_SOURCES.LAWPHIL}/statutes/repacts/ra2024/ra_11976_2024.html`
    ]
  }
];

/* =========================================================
 * INDEX
 * ========================================================= */

export const NAMED_LAW_INDEX = NAMED_LAW_REGISTRY.map((entry) => ({
  ...entry,
  normalizedAliases: uniq(
    [
      entry.canonicalTitle,
      entry.shortTitle,
      entry.republicActNumber ? `ra ${entry.republicActNumber}` : null,
      ...(entry.aliases || [])
    ].map(normalizeLawText)
  )
}));

/* =========================================================
 * EXTRACTION
 * ========================================================= */

export function extractRepublicActNumbers(text = "") {
  const value = normalizeLawText(text);

  const matches = [
    ...value.matchAll(/\b(?:ra|republic act(?: no)?)\s*(\d{4,6})\b/g)
  ];

  return uniq(matches.map((match) => match[1]));
}

/* =========================================================
 * LAW DETECTION
 * ========================================================= */

export function detectNamedLaw(question = "") {
  const normalizedQuestion = normalizeLawText(question);

  if (!normalizedQuestion) {
    return {
      matched: false,
      normalizedQuestion,
      exactMatches: [],
      genericRaNumbers: [],
      bestMatch: null,
      allMatches: []
    };
  }

  const scored = NAMED_LAW_INDEX.map((entry) => {
    let score = 0;
    const matchedAliases = [];

    for (const alias of entry.normalizedAliases) {
      if (!alias) continue;

      const wholeWord = new RegExp(
        `(^|\\b)${escapeRegex(alias)}(\\b|$)`,
        "i"
      );

      if (wholeWord.test(normalizedQuestion)) {
        matchedAliases.push(alias);
        score += alias.startsWith("ra ") ? 20 : 12;
      }
    }

    return {
      ...entry,
      matchedAliases: uniq(matchedAliases),
      score
    };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    matched: scored.length > 0,
    normalizedQuestion,
    exactMatches: scored,
    genericRaNumbers: extractRepublicActNumbers(normalizedQuestion),
    bestMatch: scored[0] || null,
    allMatches: scored
  };
}

/* =========================================================
 * SEARCH QUERY BUILDER
 * ========================================================= */

export function buildNamedLawSearchQueries(question = "", options = {}) {
  const {
    includeOriginalQuestion = true,
    maxQueries = 12
  } = options;

  const detection = detectNamedLaw(question);
  const queries = [];

  if (includeOriginalQuestion && question) {
    queries.push(question);
  }

  if (detection.bestMatch) {
    const best = detection.bestMatch;

    if (best.republicActNumber) {
      queries.push(`RA ${best.republicActNumber}`);
      queries.push(`Republic Act No. ${best.republicActNumber}`);
    }

    queries.push(best.canonicalTitle);

    if (best.shortTitle) {
      queries.push(best.shortTitle);
    }

    for (const alias of best.aliases || []) {
      queries.push(alias);
    }
  }

  return uniq(queries).slice(0, maxQueries);
}

/* =========================================================
 * SCORING
 * ========================================================= */

export function scoreDocAgainstNamedLaw(doc = {}, lawMatch = null) {
  if (!lawMatch) return 0;

  const haystack = buildDocHaystack(doc);
  if (!haystack) return 0;

  const authorityType = detectDocAuthorityType(doc);

  let score = authorityWeightForNamedLaw(authorityType);

  const exactRa = new RegExp(
    `\\bra\\s*${escapeRegex(lawMatch.republicActNumber)}\\b`,
    "i"
  ).test(haystack);

  if (exactRa) {
    score += authorityType === "STATUTE" ? 300 : 90;
  }

  for (const alias of lawMatch.normalizedAliases || []) {
    if (haystack.includes(alias)) {
      score += alias.startsWith("ra ") ? 24 : 12;
    }
  }

  const issuanceRefs = extractIssuanceRefs(haystack);

  if (lawMatch.id === "RA-11534") {
    if (issuanceRefs.includes("rr-5-2021")) {
      score += authorityType === "RR" ? 140 : 20;
    }

    if (issuanceRefs.includes("rmc-99-2021")) {
      score -= authorityType === "RMC" ? 120 : 30;
    }
  }

  return score;
}

/* =========================================================
 * FILTERING
 * ========================================================= */

export function filterDocsForNamedLaw(docs = [], lawDetection = null, options = {}) {
  const {
    minScore = 40,
    hardFilter = true,
    maxDocs = 12
  } = options;

  const bestMatch = lawDetection?.bestMatch || null;

  if (!bestMatch) {
    return {
      lawMatched: false,
      bestMatch: null,
      matchedDocs: docs.slice(0, maxDocs),
      discardedDocs: [],
      scoredDocs: docs.map((doc) => ({
        doc,
        namedLawScore: 0,
        authorityType: detectDocAuthorityType(doc)
      }))
    };
  }

  const scoredDocs = docs
    .map((doc) => {
      const authorityType = detectDocAuthorityType(doc);

      return {
        doc,
        authorityType,
        namedLawScore: scoreDocAgainstNamedLaw(doc, bestMatch)
      };
    })
    .sort((a, b) => b.namedLawScore - a.namedLawScore);

  const matchedDocs = scoredDocs
    .filter((item) => item.namedLawScore >= minScore)
    .map((item) => ({
      ...item.doc,
      namedLawScore: item.namedLawScore,
      namedLawAuthorityType: item.authorityType
    }));

  const discardedDocs = scoredDocs
    .filter((item) => item.namedLawScore < minScore)
    .map((item) => ({
      ...item.doc,
      namedLawScore: item.namedLawScore,
      namedLawAuthorityType: item.authorityType
    }));

  return {
    lawMatched: true,
    bestMatch,
    matchedDocs: matchedDocs.slice(0, maxDocs),
    discardedDocs: hardFilter ? [] : discardedDocs.slice(0, maxDocs),
    scoredDocs
  };
}

/* =========================================================
 * DEBUG SUMMARY
 * ========================================================= */

export function buildNamedLawDebugSummary(question = "", docs = []) {
  const detection = detectNamedLaw(question);

  const filtered = filterDocsForNamedLaw(docs, detection, {
    minScore: 40,
    hardFilter: true,
    maxDocs: 5
  });

  return {
    engine: "TINA_NAMED_LAW_ENGINE",
    version: ENGINE_VERSION,
    question,
    normalizedQuestion: detection.normalizedQuestion,
    namedLawMatched: detection.matched,

    bestMatch: detection.bestMatch
      ? {
          id: detection.bestMatch.id,
          canonicalTitle: detection.bestMatch.canonicalTitle,
          shortTitle: detection.bestMatch.shortTitle,
          republicActNumber: detection.bestMatch.republicActNumber,
          matchedAliases: detection.bestMatch.matchedAliases
        }
      : null,

    suggestedQueries: buildNamedLawSearchQueries(question),

    topDocScores: filtered.scoredDocs.slice(0, 5).map((item) => ({
      title:
        item.doc.title ||
        item.doc.originalSource ||
        item.doc.source ||
        item.doc.path ||
        "Untitled Source",
      authorityType: item.authorityType,
      namedLawScore: item.namedLawScore
    }))
  };
}

/* =========================================================
 * HEALTH CHECK
 * ========================================================= */

export function namedLawEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_NAMED_LAW_ENGINE",
    version: ENGINE_VERSION,
    adaptiveCompatible: true,
    plannerCompatible: true,
    retrievalCompatible: true,
    authorityCompatible: true,
    supersessionCompatible: true
  };
}

export default {
  ENGINE_VERSION,
  NAMED_LAW_REGISTRY,
  NAMED_LAW_INDEX,
  normalizeLawText,
  extractRepublicActNumbers,
  detectNamedLaw,
  buildNamedLawSearchQueries,
  scoreDocAgainstNamedLaw,
  filterDocsForNamedLaw,
  buildNamedLawDebugSummary,
  namedLawEngineHealthCheck
};
