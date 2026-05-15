// FILE: retrieval-engine.js
"use strict";

/**
 * TINA Enterprise Retrieval Orchestration Engine
 * Version: 3.1.0
 */

import {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import {
  applySupersessionFilter
} from "./supersession-engine.js";

import {
  analyzeQueryIntent
} from "./query-intent-engine.js";

import {
  rerankForTina
} from "./reranker-engine.js";

const ENGINE_VERSION = "3.1.0";

const DEFAULT_TOP_K = 12;
const DEFAULT_POOL_K = 36;

const HIDDEN_OR_WEAK_PATTERNS = [
  "07_cpa_notes",
  "08_review_materials",
  "internal_notes",
  "drafts",
  "working_papers",
  "reviewer",
  "handout",
  "lecture notes"
];

const MODE_ALIASES = Object.freeze({
  QUICK_MODE: "QUICK",
  STANDARD_TAX_MODE: "STANDARD",
  TECHNICAL_TAX_MODE: "TECHNICAL",
  AUDIT_MODE: "AUDIT",
  LITIGATION_LEGAL_DEFENSE_MODE: "LITIGATION",
  TRANSACTION_CHARACTERIZATION_MODE: "TRANSACTION",
  CONTRACT_INTERPRETATION_MODE: "CONTRACT",
  EVIDENCE_EVALUATION_MODE: "EVIDENCE_HEAVY",
  FACT_PATTERN_ANALYSIS_MODE: "TECHNICAL",
  REVIEWER_LEARNING_MODE: "REVIEWER",
  ASK: "STANDARD",
  TAX_EXPERT: "TECHNICAL",
  TAX_REVIEWER: "REVIEWER",
  QUIZ_MASTER: "REVIEWER",
  SOURCE_FINDER: "STANDARD"
});

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeMode(mode = "STANDARD") {
  const value = String(mode || "STANDARD").trim().toUpperCase();

  if (MODE_ALIASES[value]) return MODE_ALIASES[value];

  if (
    [
      "QUICK",
      "STANDARD",
      "TECHNICAL",
      "AUDIT",
      "LITIGATION",
      "CONTRACT",
      "TRANSACTION",
      "EVIDENCE_HEAVY",
      "REVIEWER"
    ].includes(value)
  ) {
    return value;
  }

  if (value.includes("AUDIT")) return "AUDIT";
  if (value.includes("LITIGATION") || value.includes("LEGAL")) return "LITIGATION";
  if (value.includes("CONTRACT")) return "CONTRACT";
  if (value.includes("TRANSACTION")) return "TRANSACTION";
  if (value.includes("EVIDENCE")) return "EVIDENCE_HEAVY";
  if (value.includes("REVIEWER") || value.includes("QUIZ")) return "REVIEWER";
  if (value.includes("TECHNICAL") || value.includes("DOCTRINE")) return "TECHNICAL";
  if (value.includes("QUICK")) return "QUICK";

  return "STANDARD";
}

function uniqueDocs(docs = []) {
  const seen = new Set();
  const output = [];

  for (const doc of docs || []) {
    if (!doc) continue;

    const key =
      doc.fileId ||
      doc.file_id ||
      doc.id ||
      doc.metadata?.fileId ||
      doc.metadata?.file_id ||
      doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.normalizedReference ||
      doc.path ||
      doc.source_path ||
      doc.metadata?.path ||
      doc.originalSource ||
      doc.original_source ||
      doc.source ||
      doc.title ||
      JSON.stringify(doc);

    if (seen.has(key)) continue;

    seen.add(key);
    output.push(doc);
  }

  return output;
}

function docText(doc = {}) {
  return normalizeText(
    [
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview,
      doc.source,
      doc.title,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      ...(Array.isArray(doc.normalizedAliases) ? doc.normalizedAliases : []),
      ...(Array.isArray(doc.normalized_aliases) ? doc.normalized_aliases : []),
      ...(Array.isArray(doc.metadata?.normalizedAliases) ? doc.metadata.normalizedAliases : [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isHiddenOrWeakSource(doc = {}) {
  const haystack = lower(docText(doc));
  return HIDDEN_OR_WEAK_PATTERNS.some((pattern) => haystack.includes(pattern));
}

function detectIssueType(query = "") {
  const q = lower(query);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|unutilized input vat|excess input vat)\b/i.test(q), "VAT_REFUND");
  push(/\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|gross selling price|gross receipts|define vat|what is vat)\b/i.test(q), "VAT_LIABILITY");
  push(/\b(invoice|receipt|substantiation|documentary|proof|evidence|support|invoicing)\b/i.test(q), "EVIDENTIARY");
  push(/\b(jurisdiction|jurisdictional|prescriptive|deadline|due date|filing|appeal|protest|assessment|loa|pan|fan|fld)\b/i.test(q), "PROCEDURAL");
  push(/\b(withholding|ewt|expanded withholding|final withholding|fwt)\b/i.test(q), "WITHHOLDING");
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|deduction)\b/i.test(q), "INCOME_TAX");
  push(/\b(create|train|eopt|ease of paying taxes|create more|republic act|ra\s*\d{4,6}|nirc|tax code)\b/i.test(q), "NAMED_LAW");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(q), "CONTRACT");
  push(/\b(principal vs agent|pass-through|pass through|reimbursement|bundled|gross or net|economic substance|substance over form)\b/i.test(q), "TRANSACTION");
  push(/\b(audit|afs|working paper|pfrs|pas|misstatement)\b/i.test(q), "AUDIT");
  push(/\b(g\.?\s*r\.?\s*no\.?|cta|supreme court|court of appeals|jurisprudence|case)\b/i.test(q), "CASE_LAW");
  push(/\b(rr|rmc|rmo|ramo|revenue regulation|revenue memorandum circular|revenue memorandum order)\s*(?:no\.?)?\s*\d+/i.test(q), "ISSUANCE");

  return [...new Set(issues)];
}

function detectDocIssueType(doc = {}) {
  return detectIssueType(docText(doc));
}

function hasIssueMismatch(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return false;

  if (
    queryIssues.includes("VAT_LIABILITY") &&
    docIssues.includes("VAT_REFUND") &&
    !queryIssues.includes("VAT_REFUND")
  ) {
    return true;
  }

  if (
    queryIssues.includes("VAT_REFUND") &&
    docIssues.includes("VAT_LIABILITY") &&
    !queryIssues.includes("VAT_LIABILITY")
  ) {
    return true;
  }

  return false;
}

function hasIssueOverlap(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return true;
  return queryIssues.some((issue) => docIssues.includes(issue));
}

function authorityWeight(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  const weights = {
    CONSTITUTION: 100,
    STATUTE: 98,
    SUPREME_COURT: 97,
    RR: 95,
    TREATY: 90,
    RMC: 84,
    RMO: 80,
    RAMO: 78,
    BIR_RULING: 70,
    CTA_EN_BANC: 68,
    COURT_OF_APPEALS: 64,
    CTA_DIVISION: 60,
    LGU: 45,
    SECONDARY: 5,
    UNKNOWN: 0
  };

  return weights[type] ?? 0;
}

function extractExactReferenceSignals(text = "") {
  const value = normalizeText(text);
  const signals = [];

  for (const match of value.matchAll(/\b(?:ra|r\.a\.|republic act)\s*(?:no\.?)?\s*(\d{4,6})\b/gi)) {
    signals.push(`RA_${match[1]}`);
  }

  const issuancePatterns = [
    ["RR", /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/gi],
    ["RMC", /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/gi],
    ["RMO", /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/gi],
    ["RAMO", /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/gi]
  ];

  for (const [prefix, regex] of issuancePatterns) {
    for (const match of value.matchAll(regex)) {
      signals.push(`${prefix}_${String(match[1]).replace(/^0+/, "")}_${match[2]}`);
    }
  }

  for (const match of value.matchAll(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/gi)) {
    signals.push(`GR_${String(match[1]).toUpperCase()}`);
  }

  return [...new Set(signals)];
}

function exactReferenceBonus(query = "", doc = {}) {
  const queryRefs = extractExactReferenceSignals(query);
  if (!queryRefs.length) return 0;

  const haystack = lower(docText(doc)).replace(/[^a-z0-9]+/g, "_");

  let bonus = 0;

  for (const ref of queryRefs) {
    const normalizedRef = lower(ref).replace(/[^a-z0-9]+/g, "_");
    if (haystack.includes(normalizedRef)) bonus += 120;
  }

  return bonus;
}

function issueWeight(query = "", doc = {}) {
  const queryIssues = detectIssueType(query);
  const docIssues = detectDocIssueType(doc);

  if (hasIssueMismatch(queryIssues, docIssues)) return -60;
  if (hasIssueOverlap(queryIssues, docIssues)) return 35;

  return 0;
}

function weakSourcePenalty(doc = {}) {
  return isHiddenOrWeakSource(doc) ? -75 : 0;
}

function adaptiveModeBonus({ mode = "STANDARD", doc = {} }) {
  const normalizedMode = normalizeMode(mode);
  const authority = getAuthorityTypeForDoc(doc);
  const text = lower(docText(doc));

  if (normalizedMode === "LITIGATION" && authority === "SUPREME_COURT") return 55;
  if (normalizedMode === "TECHNICAL" && authority === "SUPREME_COURT") return 42;

  if (normalizedMode === "AUDIT") {
    if (/\bpfrs\b|\bpas\b|\bfinancial statements\b|\bafs\b|\baudit\b/i.test(text)) return 45;
    if (["STATUTE", "RR", "RMC"].includes(authority)) return 25;
  }

  if (normalizedMode === "TRANSACTION") {
    if (/\bprincipal\b|\bagent\b|\breimbursement\b|\bpass-through\b|\bgross\b|\bnet\b|\beconomic substance\b|\bbundled\b/i.test(text)) return 50;
    if (authority === "RR") return 28;
  }

  if (normalizedMode === "CONTRACT") {
    if (/\bcontract\b|\bagreement\b|\bclause\b|\blease\b|\bconcession\b/i.test(text)) return 48;
    if (authority === "SUPREME_COURT") return 24;
  }

  if (normalizedMode === "EVIDENCE_HEAVY") {
    if (/\binvoice\b|\breceipt\b|\bsubstantiation\b|\bevidence\b|\bproof\b/i.test(text)) return 50;
  }

  return 0;
}

function isSupersededDoc(doc = {}) {
  return Boolean(
    doc.superseded === true ||
      doc.isSuperseded === true ||
      doc.is_superseded === true ||
      doc.metadata?.superseded === true ||
      doc.metadata?.isSuperseded === true ||
      doc.metadata?.is_superseded === true
  );
}

function computeRetrievalScore({ query = "", doc = {}, adaptiveMode = "STANDARD" }) {
  const baseScore = Number(
    doc.rerankScore ??
      doc.retrievalScore ??
      doc.retrieval_score ??
      doc.finalScore ??
      doc.final_score ??
      doc.combined_score ??
      doc.score ??
      doc.similarity ??
      0
  );

  const hierarchyScore = authorityWeight(doc);
  const issueScore = issueWeight(query, doc);
  const weakPenalty = weakSourcePenalty(doc);
  const citationBonus = exactReferenceBonus(query, doc);

  const level = getAuthorityLevelForDoc(doc);
  const precedence = getControllingPrecedenceForDoc(doc);

  const levelBonus = level <= 3 ? 38 : level <= 8 ? 24 : level <= 11 ? 10 : 0;
  const precedenceBonus = precedence <= 5 ? 24 : precedence <= 9 ? 12 : 0;

  const modeBonus = adaptiveModeBonus({
    mode: adaptiveMode,
    doc
  });

  const supersessionPenalty = isSupersededDoc(doc) ? -150 : 0;

  return Number(
    (
      baseScore * 0.28 +
      hierarchyScore * 0.30 +
      citationBonus * 0.20 +
      issueScore +
      levelBonus +
      precedenceBonus +
      modeBonus +
      weakPenalty +
      supersessionPenalty
    ).toFixed(4)
  );
}

function filterRetrievalNoise(query = "", docs = []) {
  const queryIssues = detectIssueType(query);

  return uniqueDocs(docs).filter((doc) => {
    if (!doc) return false;

    const authorityType = getAuthorityTypeForDoc(doc);
    const docIssues = detectDocIssueType(doc);

    if (authorityType === "SECONDARY" && isHiddenOrWeakSource(doc)) return false;
    if (hasIssueMismatch(queryIssues, docIssues)) return false;

    return true;
  });
}

async function callRetriever(fn, { supabase, query, poolK }) {
  const attempts = [
    { supabase, query, topK: poolK },
    { query, topK: poolK, supabase },
    { query, limit: poolK, supabase },
    query
  ];

  let lastError = null;

  for (const args of attempts) {
    try {
      const result = typeof args === "string" ? await fn(args, poolK) : await fn(args);

      if (Array.isArray(result)) return result;
      if (Array.isArray(result?.results)) return result.results;
      if (Array.isArray(result?.docs)) return result.docs;
      if (Array.isArray(result?.matches)) return result.matches;
      if (Array.isArray(result?.data)) return result.data;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;

  return [];
}

async function runVectorRetrieval({
  vectorStore,
  supabase,
  query,
  poolK = DEFAULT_POOL_K
}) {
  if (vectorStore?.smartSearch) {
    const results = await callRetriever(vectorStore.smartSearch, {
      supabase,
      query,
      poolK
    });

    if (results.length) return results;
  }

  if (vectorStore?.searchSimilar) {
    return await callRetriever(vectorStore.searchSimilar, {
      supabase,
      query,
      poolK
    });
  }

  throw new Error("retrieval-engine requires vectorStore.smartSearch or vectorStore.searchSimilar.");
}

function buildRetrievalAudit({
  query = "",
  rawCount = 0,
  filteredCount = 0,
  activeCount = 0,
  finalCount = 0,
  queryIssues = [],
  adaptiveMode = "STANDARD",
  exactCitationMatched = false,
  retrievalStrategy = null,
  usedReranker = false,
  supersededCount = 0
}) {
  return {
    engine: "TINA_RETRIEVAL_ENGINE",
    version: ENGINE_VERSION,
    query,
    queryIssues,
    adaptiveMode: normalizeMode(adaptiveMode),
    retrievalStrategy,

    rawCount,
    filteredCount,
    activeCount,
    finalCount,
    supersededCount,

    exactCitationMatched,
    usedReranker,

    retrievalPolicy:
      "Hierarchy-first, exact-citation-aware, issue-matched retrieval. Secondary notes, superseded authorities, and issue-mismatched cases are suppressed before final legal synthesis.",

    warning:
      finalCount === 0
        ? "No issue-matched controlling authority was retrieved."
        : null,

    generatedAt: new Date().toISOString()
  };
}

async function retrieveForTina({
  supabase,
  vectorStore,
  query = "",
  topK = DEFAULT_TOP_K,
  poolK = DEFAULT_POOL_K,
  asOfDate = new Date(),
  adaptiveMode = "STANDARD",
  adaptiveContext = {}
}) {
  const normalizedMode = normalizeMode(adaptiveMode);

  if (!query || !String(query).trim()) {
    return {
      results: [],
      supersessionResult: null,
      queryIntent: null,
      retrievalMetadata: {
        adaptiveMode: normalizedMode,
        hierarchyAware: true,
        issueFiltered: true,
        supersessionFiltered: false,
        exactCitationAware: true,
        rerankerAware: true
      },
      audit: buildRetrievalAudit({
        query,
        queryIssues: [],
        adaptiveMode: normalizedMode
      })
    };
  }

  const queryIntent = analyzeQueryIntent(query);

  const effectiveMode = normalizeMode(
    adaptiveMode ||
      queryIntent?.adaptiveMode ||
      queryIntent?.detectedMode ||
      adaptiveContext?.responsePlan?.responseMode ||
      "STANDARD"
  );

  const rawResults = await runVectorRetrieval({
    vectorStore,
    supabase,
    query,
    poolK
  });

  const uniqueRaw = uniqueDocs(rawResults);
  const filtered = filterRetrievalNoise(query, uniqueRaw);
  const supersessionResult = applySupersessionFilter(filtered, asOfDate);

  const activeDocs =
    supersessionResult?.activeDocs?.length > 0
      ? supersessionResult.activeDocs
      : filtered;

  const scored = activeDocs.map((doc) => {
    const citationMatchBonus = exactReferenceBonus(query, doc);

    const retrievalScore = computeRetrievalScore({
      query,
      doc,
      adaptiveMode: effectiveMode
    });

    return {
      ...doc,
      citationMatchBonus,
      retrievalIssueType: detectDocIssueType(doc),
      retrievalScore,
      finalScore: Math.max(Number(doc.finalScore || doc.final_score || 0), retrievalScore),
      retrievalMetadata: {
        ...(doc.retrievalMetadata || {}),
        adaptiveMode: effectiveMode,
        exactCitationAware: true,
        hierarchyAware: true,
        issueAware: true,
        supersessionAware: true,
        rerankerAware: true,
        tinaRetrievalEngineVersion: ENGINE_VERSION
      }
    };
  });

  const rerankedPayload = rerankForTina({
    query,
    docs: rerankByHierarchy(scored, query),
    limit: Math.max(topK, DEFAULT_TOP_K),
    suppressIssueMismatch: true,
    suppressWeakSecondary: true,
    suppressSuperseded: true,
    responseMode: effectiveMode,
    adaptiveContext
  });

  const reranked = Array.isArray(rerankedPayload?.results)
    ? rerankedPayload.results
    : [];

  const ranked = (reranked.length ? reranked : scored)
    .map((doc) => {
      const retrievalScore = computeRetrievalScore({
        query,
        doc,
        adaptiveMode: effectiveMode
      });

      return {
        ...doc,
        retrievalScore,
        finalScore: Math.max(
          Number(doc.finalScore || doc.final_score || doc.rerankScore || 0),
          retrievalScore
        )
      };
    })
    .sort((a, b) => {
      const aExact = Number(a.citationMatchBonus || 0);
      const bExact = Number(b.citationMatchBonus || 0);

      if (bExact !== aExact) return bExact - aExact;

      const aLevel = getAuthorityLevelForDoc(a);
      const bLevel = getAuthorityLevelForDoc(b);

      if (aLevel !== bLevel) return aLevel - bLevel;

      const aPrecedence = getControllingPrecedenceForDoc(a);
      const bPrecedence = getControllingPrecedenceForDoc(b);

      if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

      return Number(b.finalScore || 0) - Number(a.finalScore || 0);
    })
    .slice(0, topK);

  const exactCitationMatched = ranked.some(
    (doc) => Number(doc.citationMatchBonus || 0) > 0
  );

  return {
    results: ranked,
    supersessionResult,
    queryIntent,

    retrievalMetadata: {
      adaptiveMode: effectiveMode,
      hierarchyAware: true,
      issueFiltered: true,
      supersessionFiltered: true,
      exactCitationAware: true,
      rerankerAware: true,
      retrievalStrategy:
        queryIntent?.retrievalStrategy ||
        "AUTHORITY_HIERARCHY_SEMANTIC"
    },

    audit: buildRetrievalAudit({
      query,
      rawCount: uniqueRaw.length,
      filteredCount: filtered.length,
      activeCount: activeDocs.length,
      finalCount: ranked.length,
      queryIssues: detectIssueType(query),
      adaptiveMode: effectiveMode,
      exactCitationMatched,
      retrievalStrategy:
        queryIntent?.retrievalStrategy ||
        "AUTHORITY_HIERARCHY_SEMANTIC",
      usedReranker: Boolean(reranked.length),
      supersededCount: supersessionResult?.supersededCount || supersessionResult?.superseded?.length || 0
    })
  };
}

async function hybridRetrieve({
  supabase,
  vectorStore,
  query = "",
  questionType = "",
  taxType = "",
  topK = DEFAULT_TOP_K,
  poolK = DEFAULT_POOL_K,
  asOfDate = new Date(),
  adaptiveMode = "STANDARD",
  adaptiveContext = {}
}) {
  const retrieval = await retrieveForTina({
    supabase,
    vectorStore,
    query,
    topK,
    poolK,
    asOfDate,
    adaptiveMode,
    adaptiveContext
  });

  return {
    ...retrieval,
    questionType,
    taxType,
    exactCitation: {
      matched: Boolean(retrieval.audit?.exactCitationMatched),
      query
    }
  };
}

function retrievalEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_RETRIEVAL_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    adaptiveCompatible: true,
    rerankerCompatible: true,
    supersessionCompatible: true,
    exactCitationAware: true
  };
}

export {
  ENGINE_VERSION,
  normalizeMode,
  detectIssueType,
  detectDocIssueType,
  computeRetrievalScore,
  retrieveForTina,
  hybridRetrieve,
  retrievalEngineHealthCheck
};

export default {
  ENGINE_VERSION,
  normalizeMode,
  detectIssueType,
  detectDocIssueType,
  computeRetrievalScore,
  retrieveForTina,
  hybridRetrieve,
  retrievalEngineHealthCheck
};
