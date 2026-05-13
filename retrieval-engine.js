// FILE: retrieval-engine.js

import {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc
} from "./authority-engine.js";

import { applySupersessionFilter } from "./supersession-engine.js";

const DEFAULT_TOP_K = 12;
const DEFAULT_POOL_K = 30;

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

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
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
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      ...(doc.normalizedAliases || []),
      ...(doc.metadata?.normalizedAliases || [])
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

  if (/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|unutilized input vat|excess input vat)\b/i.test(q)) {
    issues.push("VAT_REFUND");
  }

  if (/\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|gross selling price|gross receipts|define vat|what is vat)\b/i.test(q)) {
    issues.push("VAT_LIABILITY");
  }

  if (/\b(invoice|receipt|substantiation|documentary|proof|evidence|support|invoicing)\b/i.test(q)) {
    issues.push("EVIDENTIARY");
  }

  if (/\b(jurisdiction|jurisdictional|prescriptive|deadline|due date|filing|appeal|protest|assessment|loa|pan|fan|fld)\b/i.test(q)) {
    issues.push("PROCEDURAL");
  }

  if (/\b(withholding|ewt|expanded withholding|final withholding|fwt)\b/i.test(q)) {
    issues.push("WITHHOLDING");
  }

  if (/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|deduction)\b/i.test(q)) {
    issues.push("INCOME_TAX");
  }

  if (/\b(create|train|eopt|ease of paying taxes|create more)\b/i.test(q)) {
    issues.push("NAMED_LAW");
  }

  return [...new Set(issues)];
}

function detectDocIssueType(doc = {}) {
  return detectIssueType(docText(doc));
}

function hasIssueMismatch(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return false;

  if (queryIssues.includes("VAT_LIABILITY") && docIssues.includes("VAT_REFUND")) {
    return true;
  }

  if (queryIssues.includes("VAT_REFUND") && docIssues.includes("VAT_LIABILITY")) {
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
    RR: 94,
    SUPREME_COURT: 92,
    RMC: 82,
    RMO: 78,
    RAMO: 76,
    BIR_RULING: 68,
    CTA_EN_BANC: 66,
    COURT_OF_APPEALS: 62,
    CTA_DIVISION: 58,
    TREATY: 86,
    LGU: 45,
    SECONDARY: 5
  };

  return weights[type] ?? 0;
}

function issueWeight(query = "", doc = {}) {
  const queryIssues = detectIssueType(query);
  const docIssues = detectDocIssueType(doc);

  if (hasIssueMismatch(queryIssues, docIssues)) return -45;
  if (hasIssueOverlap(queryIssues, docIssues)) return 30;

  return 0;
}

function weakSourcePenalty(doc = {}) {
  return isHiddenOrWeakSource(doc) ? -60 : 0;
}

function computeRetrievalScore(query = "", doc = {}) {
  const baseScore = Number(
    doc.finalScore ||
      doc.combined_score ||
      doc.score ||
      doc.similarity ||
      0
  );

  const hierarchyScore = authorityWeight(doc);
  const issueScore = issueWeight(query, doc);
  const weakPenalty = weakSourcePenalty(doc);
  const level = getAuthorityLevelForDoc(doc);

  const levelBonus = level <= 3 ? 35 : level <= 8 ? 20 : level <= 11 ? 8 : 0;

  return Number(
    (
      baseScore * 0.4 +
      hierarchyScore * 0.35 +
      issueScore +
      levelBonus +
      weakPenalty
    ).toFixed(4)
  );
}

function filterRetrievalNoise(query = "", docs = []) {
  const queryIssues = detectIssueType(query);

  return docs.filter((doc) => {
    if (!doc) return false;

    const authorityType = getAuthorityTypeForDoc(doc);
    const docIssues = detectDocIssueType(doc);

    if (authorityType === "SECONDARY" && isHiddenOrWeakSource(doc)) {
      return false;
    }

    if (hasIssueMismatch(queryIssues, docIssues)) {
      return false;
    }

    return true;
  });
}

async function runVectorRetrieval({
  vectorStore,
  supabase,
  query,
  poolK = DEFAULT_POOL_K
}) {
  if (vectorStore?.smartSearch) {
    const result = await vectorStore.smartSearch({
      supabase,
      query,
      topK: poolK
    });

    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.results)) return result.results;
    if (Array.isArray(result?.docs)) return result.docs;
  }

  if (vectorStore?.searchSimilar) {
    const result = await vectorStore.searchSimilar({
      supabase,
      query,
      topK: poolK
    });

    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.results)) return result.results;
    if (Array.isArray(result?.docs)) return result.docs;
  }

  throw new Error("retrieval-engine requires vectorStore.smartSearch or vectorStore.searchSimilar.");
}

function buildRetrievalAudit({
  query = "",
  rawCount = 0,
  filteredCount = 0,
  activeCount = 0,
  finalCount = 0,
  queryIssues = []
}) {
  return {
    query,
    queryIssues,
    rawCount,
    filteredCount,
    activeCount,
    finalCount,
    retrievalPolicy:
      "Hierarchy-first, issue-matched retrieval. Secondary notes and issue-mismatched cases are suppressed before final legal synthesis.",
    warning:
      finalCount === 0
        ? "No issue-matched controlling authority was retrieved."
        : null
  };
}

export async function retrieveForTina({
  supabase,
  vectorStore,
  query = "",
  topK = DEFAULT_TOP_K,
  poolK = DEFAULT_POOL_K,
  asOfDate = new Date()
}) {
  if (!query || !String(query).trim()) {
    return {
      results: [],
      audit: buildRetrievalAudit({
        query,
        rawCount: 0,
        filteredCount: 0,
        activeCount: 0,
        finalCount: 0,
        queryIssues: []
      })
    };
  }

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

  const scored = activeDocs.map((doc) => ({
    ...doc,
    retrievalIssueType: detectDocIssueType(doc),
    retrievalScore: computeRetrievalScore(query, doc)
  }));

  const ranked = rerankByHierarchy(scored, query)
    .map((doc) => ({
      ...doc,
      retrievalScore: computeRetrievalScore(query, doc),
      finalScore: Math.max(
        Number(doc.finalScore || 0),
        computeRetrievalScore(query, doc)
      )
    }))
    .sort((a, b) => {
      if (b.retrievalScore !== a.retrievalScore) {
        return b.retrievalScore - a.retrievalScore;
      }

      return getAuthorityLevelForDoc(a) - getAuthorityLevelForDoc(b);
    })
    .slice(0, topK);

  return {
    results: ranked,
    supersessionResult,
    audit: buildRetrievalAudit({
      query,
      rawCount: uniqueRaw.length,
      filteredCount: filtered.length,
      activeCount: activeDocs.length,
      finalCount: ranked.length,
      queryIssues: detectIssueType(query)
    })
  };
}

export async function hybridRetrieve({
  supabase,
  vectorStore,
  query = "",
  questionType = "",
  taxType = "",
  topK = DEFAULT_TOP_K,
  poolK = DEFAULT_POOL_K,
  asOfDate = new Date()
}) {
  const retrieval = await retrieveForTina({
    supabase,
    vectorStore,
    query,
    topK,
    poolK,
    asOfDate
  });

  return {
    ...retrieval,
    questionType,
    taxType,
    exactCitation: {
      matched: retrieval.results.some((doc) => Number(doc.citationMatchBonus || 0) > 0),
      query
    }
  };
}

export default {
  retrieveForTina,
  hybridRetrieve
};
