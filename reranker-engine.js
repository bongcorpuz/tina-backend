// FILE: reranker-engine.js
"use strict";

/**
 * reranker-engine.js
 * TINA Adaptive Retrieval Reranker
 *
 * Purpose:
 * - hierarchy-sensitive reranking
 * - issue-sensitive reranking
 * - exact authority prioritization
 * - adaptive-mode-aware reranking
 * - transaction/evidence/audit-aware reranking
 * - jurisprudence-safe reranking
 *
 * Compatible with:
 * - query-intent-engine.js
 * - supersession-engine.js
 * - jurisprudence-engine.js
 * - adaptive-response-planner.js
 * - ask-handler.js
 * - rag-answer-handler.js
 */

const {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} = require("./authority-engine.js");

const ENGINE_VERSION = "2.1.0";
const DEFAULT_LIMIT = 12;

const ISSUE_TYPE = Object.freeze({
  VAT_REFUND: "VAT_REFUND",
  VAT_LIABILITY: "VAT_LIABILITY",
  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",
  JURISDICTIONAL: "JURISDICTIONAL",
  WITHHOLDING: "WITHHOLDING",
  INCOME_TAX: "INCOME_TAX",
  NAMED_LAW: "NAMED_LAW",
  CASE_LAW: "CASE_LAW",

  CONTRACT: "CONTRACT",
  TRANSACTION: "TRANSACTION",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",
  PRINCIPAL_AGENT: "PRINCIPAL_AGENT",
  PASS_THROUGH: "PASS_THROUGH",
  REIMBURSEMENT: "REIMBURSEMENT",
  BUNDLED_TRANSACTION: "BUNDLED_TRANSACTION",

  AUDIT: "AUDIT",
  ACCOUNTING: "ACCOUNTING",
  PFRS: "PFRS",

  CONFLICT_ANALYSIS: "CONFLICT_ANALYSIS",
  DOCTRINE: "DOCTRINE",

  GENERAL: "GENERAL"
});

const RESPONSE_MODE = Object.freeze({
  QUICK: "QUICK",
  STANDARD: "STANDARD",
  TECHNICAL: "TECHNICAL",
  AUDIT: "AUDIT",
  LITIGATION: "LITIGATION",
  CONTRACT: "CONTRACT",
  TRANSACTION: "TRANSACTION",
  EVIDENCE_HEAVY: "EVIDENCE_HEAVY",
  REVIEWER: "REVIEWER"
});

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function uniqueDocs(docs = []) {
  const seen = new Set();
  const output = [];

  for (const doc of docs || []) {
    if (!doc) continue;

    const key =
      doc.id ||
      doc.fileId ||
      doc.file_id ||
      doc.metadata?.fileId ||
      doc.metadata?.file_id ||
      doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.normalizedReference ||
      doc.path ||
      doc.source_path ||
      doc.metadata?.path ||
      doc.source ||
      doc.originalSource ||
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
      doc.originalSource,
      doc.title,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      ...(doc.normalizedAliases || []),
      ...(doc.normalized_aliases || []),
      ...(doc.metadata?.normalizedAliases || [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function detectIssueTypes(text = "") {
  const value = lower(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(
    /\b(vat refund|input vat refund|tax credit certificate|120\+30|administrative claim|judicial claim)\b/i.test(value),
    ISSUE_TYPE.VAT_REFUND
  );

  push(
    /\b(vat liability|output vat|subject to vat|vatable|gross receipts)\b/i.test(value),
    ISSUE_TYPE.VAT_LIABILITY
  );

  push(
    /\b(file|filing|deadline|appeal|assessment|loa|pan|fan|return|remedy)\b/i.test(value),
    ISSUE_TYPE.PROCEDURAL
  );

  push(
    /\b(invoice|receipt|substantiation|documentary|evidence|records|burden of proof)\b/i.test(value),
    ISSUE_TYPE.EVIDENTIARY
  );

  push(
    /\b(jurisdiction|jurisdictional|cta|condition precedent)\b/i.test(value),
    ISSUE_TYPE.JURISDICTIONAL
  );

  push(
    /\b(withholding|ewt|expanded withholding|2307|1601)\b/i.test(value),
    ISSUE_TYPE.WITHHOLDING
  );

  push(
    /\b(income tax|rcit|mcit|nolco|deductible)\b/i.test(value),
    ISSUE_TYPE.INCOME_TAX
  );

  push(
    /\b(contract|agreement|lease agreement|concession agreement|clause)\b/i.test(value),
    ISSUE_TYPE.CONTRACT
  );

  push(
    /\b(principal vs agent|gross or net|pass-through|pass through|reimbursement|bundled|inclusive package)\b/i.test(value),
    ISSUE_TYPE.TRANSACTION
  );

  push(
    /\b(economic substance|substance over form|sham|simulation)\b/i.test(value),
    ISSUE_TYPE.ECONOMIC_SUBSTANCE
  );

  push(
    /\b(principal vs agent|agent|principal)\b/i.test(value),
    ISSUE_TYPE.PRINCIPAL_AGENT
  );

  push(
    /\b(pass-through|pass through)\b/i.test(value),
    ISSUE_TYPE.PASS_THROUGH
  );

  push(
    /\b(reimbursement|reimbursable)\b/i.test(value),
    ISSUE_TYPE.REIMBURSEMENT
  );

  push(
    /\b(bundled|package|inclusive)\b/i.test(value),
    ISSUE_TYPE.BUNDLED_TRANSACTION
  );

  push(
    /\b(audit|misstatement|working paper|qualified opinion)\b/i.test(value),
    ISSUE_TYPE.AUDIT
  );

  push(
    /\b(pfrs|pas|financial statements|afs)\b/i.test(value),
    ISSUE_TYPE.PFRS
  );

  push(
    /\b(accounting treatment|classification|presentation|recognition)\b/i.test(value),
    ISSUE_TYPE.ACCOUNTING
  );

  push(
    /\b(conflict|hierarchy|prevails|override)\b/i.test(value),
    ISSUE_TYPE.CONFLICT_ANALYSIS
  );

  push(
    /\b(doctrine|jurisprudence|substance over form)\b/i.test(value),
    ISSUE_TYPE.DOCTRINE
  );

  push(
    /\b(create|train|eopt|create more|republic act|nirc|tax code)\b/i.test(value),
    ISSUE_TYPE.NAMED_LAW
  );

  push(
    /\b(g\.?\s*r\.?\s*no\.?|cta|supreme court|court of appeals| v\. | vs\.? )\b/i.test(value),
    ISSUE_TYPE.CASE_LAW
  );

  return unique(issues.length ? issues : [ISSUE_TYPE.GENERAL]);
}

function issueOverlap(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || queryIssues.includes(ISSUE_TYPE.GENERAL)) {
    return true;
  }

  if (!docIssues.length || docIssues.includes(ISSUE_TYPE.GENERAL)) {
    return true;
  }

  return queryIssues.some((issue) => docIssues.includes(issue));
}

function issueMismatch(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return false;

  if (
    queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY) &&
    docIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_REFUND)
  ) {
    return true;
  }

  if (
    queryIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    docIssues.includes(ISSUE_TYPE.VAT_LIABILITY) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY)
  ) {
    return true;
  }

  return false;
}

function authorityWeight(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  const weights = {
    CONSTITUTION: 100,
    STATUTE: 98,
    RR: 94,
    SUPREME_COURT: 92,
    TREATY: 86,

    RMC: 82,
    RMO: 78,
    RAMO: 76,

    BIR_RULING: 68,

    CTA_EN_BANC: 66,
    COURT_OF_APPEALS: 62,
    CTA_DIVISION: 58,

    LGU: 45,

    SECONDARY: 5
  };

  return weights[type] ?? 0;
}

function authorityPenalty(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);
  const text = lower(docText(doc));

  let penalty = 0;

  if (type === "SECONDARY") penalty += 45;

  if (text.includes("07_cpa_notes")) penalty += 35;
  if (text.includes("08_review_materials")) penalty += 35;
  if (text.includes("working_papers")) penalty += 35;
  if (text.includes("drafts")) penalty += 30;
  if (text.includes("reviewer")) penalty += 25;
  if (text.includes("handout")) penalty += 25;
  if (text.includes("lecture notes")) penalty += 25;

  return penalty;
}

function extractExactReferenceSignals(text = "") {
  const value = normalizeText(text);
  const signals = [];

  const raMatches = value.matchAll(
    /\b(?:ra|r\.a\.|republic act)\s*(?:no\.?)?\s*(\d{4,6})\b/gi
  );

  for (const match of raMatches) {
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
      signals.push(
        `${prefix}_${String(match[1]).replace(/^0+/, "")}_${match[2]}`
      );
    }
  }

  const grMatches = value.matchAll(
    /\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/gi
  );

  for (const match of grMatches) {
    signals.push(`GR_${String(match[1]).toUpperCase()}`);
  }

  return unique(signals);
}

function exactReferenceBonus(query = "", doc = {}) {
  const queryRefs = extractExactReferenceSignals(query);

  if (!queryRefs.length) return 0;

  const haystack = lower(docText(doc)).replace(/[^a-z0-9]+/g, "_");

  let bonus = 0;

  for (const ref of queryRefs) {
    const normalizedRef = lower(ref).replace(/[^a-z0-9]+/g, "_");

    if (haystack.includes(normalizedRef)) {
      bonus += 100;
    }
  }

  return bonus;
}

function issueBonus(query = "", doc = {}) {
  const queryIssues = detectIssueTypes(query);
  const docIssues = detectIssueTypes(docText(doc));

  if (issueMismatch(queryIssues, docIssues)) {
    return -80;
  }

  if (issueOverlap(queryIssues, docIssues)) {
    return 35;
  }

  return 0;
}

function controllingBonus(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);
  const level = getAuthorityLevelForDoc(doc);
  const precedence = getControllingPrecedenceForDoc(doc);

  let bonus = 0;

  if (
    ["CONSTITUTION", "STATUTE", "RR", "SUPREME_COURT"].includes(type)
  ) {
    bonus += 45;
  } else if (
    ["RMC", "RMO", "RAMO"].includes(type)
  ) {
    bonus += 25;
  } else if (type === "BIR_RULING") {
    bonus += 15;
  } else if (
    ["CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(type)
  ) {
    bonus += 10;
  }

  if (level <= 3) bonus += 30;
  else if (level <= 8) bonus += 20;
  else if (level <= 11) bonus += 8;

  if (precedence <= 5) bonus += 20;
  else if (precedence <= 9) bonus += 10;

  return bonus;
}

function semanticScore(doc = {}) {
  return Number(
    doc.score ||
      doc.similarity ||
      doc.finalScore ||
      doc.final_score ||
      doc.retrievalScore ||
      doc.retrieval_score ||
      0
  );
}

function adaptiveModeBonus(responseMode = RESPONSE_MODE.STANDARD, doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);
  const text = lower(docText(doc));

  let bonus = 0;

  if (responseMode === RESPONSE_MODE.AUDIT) {
    if (/\bpfrs\b|\bpas\b|\bfinancial statements\b/i.test(text)) {
      bonus += 35;
    }
  }

  if (responseMode === RESPONSE_MODE.CONTRACT) {
    if (/\bcontract\b|\bagreement\b|\bclause\b/i.test(text)) {
      bonus += 40;
    }
  }

  if (responseMode === RESPONSE_MODE.TRANSACTION) {
    if (
      /\bprincipal\b|\bagent\b|\bpass-through\b|\breimbursement\b|\bgross\b|\bnet\b/i.test(
        text
      )
    ) {
      bonus += 45;
    }
  }

  if (responseMode === RESPONSE_MODE.EVIDENCE_HEAVY) {
    if (
      /\binvoice\b|\breceipt\b|\bsubstantiation\b|\bevidence\b/i.test(text)
    ) {
      bonus += 45;
    }
  }

  if (
    responseMode === RESPONSE_MODE.TECHNICAL &&
    authorityType === "SUPREME_COURT"
  ) {
    bonus += 40;
  }

  return bonus;
}

function supersessionPenalty(doc = {}) {
  if (
    doc.superseded === true ||
    doc.isSuperseded === true ||
    doc.metadata?.superseded === true
  ) {
    return 120;
  }

  return 0;
}

function weakCasePenalty(query = "", doc = {}) {
  const queryIssues = detectIssueTypes(query);
  const text = lower(docText(doc));

  if (
    queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY) &&
    text.includes("refund")
  ) {
    return 50;
  }

  if (
    queryIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    text.includes("output vat")
  ) {
    return 50;
  }

  return 0;
}

function computeTinaRerankScore({
  query = "",
  doc = {},
  responseMode = RESPONSE_MODE.STANDARD
}) {
  const score =
    semanticScore(doc) * 0.25 +
    authorityWeight(doc) * 0.28 +
    exactReferenceBonus(query, doc) * 0.16 +
    issueBonus(query, doc) * 0.13 +
    controllingBonus(doc) * 0.10 +
    adaptiveModeBonus(responseMode, doc) * 0.08 -
    authorityPenalty(doc) -
    supersessionPenalty(doc) -
    weakCasePenalty(query, doc);

  return Number(score.toFixed(4));
}

function rerankForTina({
  query = "",
  docs = [],
  limit = DEFAULT_LIMIT,
  suppressIssueMismatch = true,
  suppressWeakSecondary = true,
  suppressSuperseded = true,
  responseMode = RESPONSE_MODE.STANDARD
} = {}) {
  const queryIssues = detectIssueTypes(query);

  const hierarchyRanked = rerankByHierarchy(
    uniqueDocs(docs),
    query
  );

  const ranked = hierarchyRanked
    .map((doc) => {
      const docIssues = detectIssueTypes(docText(doc));

      const mismatch = issueMismatch(queryIssues, docIssues);

      const weakSecondary =
        getAuthorityTypeForDoc(doc) === "SECONDARY" &&
        authorityPenalty(doc) >= 45;

      const superseded =
        doc.superseded === true ||
        doc.isSuperseded === true ||
        doc.metadata?.superseded === true;

      return {
        ...doc,

        rerankIssueTypes: docIssues,

        rerankScore: computeTinaRerankScore({
          query,
          doc,
          responseMode
        }),

        issueMismatch: mismatch,
        weakSecondary,
        superseded
      };
    })
    .filter((doc) => {
      if (suppressIssueMismatch && doc.issueMismatch) return false;
      if (suppressWeakSecondary && doc.weakSecondary) return false;
      if (suppressSuperseded && doc.superseded) return false;

      return true;
    })
    .sort((a, b) => {
      const aExact = exactReferenceBonus(query, a);
      const bExact = exactReferenceBonus(query, b);

      if (bExact !== aExact) {
        return bExact - aExact;
      }

      const aLevel = getAuthorityLevelForDoc(a);
      const bLevel = getAuthorityLevelForDoc(b);

      if (aLevel !== bLevel) {
        return aLevel - bLevel;
      }

      const aPrecedence = getControllingPrecedenceForDoc(a);
      const bPrecedence = getControllingPrecedenceForDoc(b);

      if (aPrecedence !== bPrecedence) {
        return aPrecedence - bPrecedence;
      }

      return b.rerankScore - a.rerankScore;
    })
    .slice(0, limit);

  return {
    results: ranked,

    audit: {
      engine: "TINA_RERANKER_ENGINE",
      version: ENGINE_VERSION,

      query,
      queryIssues,

      responseMode,

      inputCount: Array.isArray(docs) ? docs.length : 0,
      outputCount: ranked.length,

      suppressIssueMismatch,
      suppressWeakSecondary,
      suppressSuperseded,

      policy:
        "TINA reranker prioritizes controlling authority, exact authority matching, adaptive-mode relevance, issue-matched jurisprudence, and suppresses superseded or weak secondary authorities."
    }
  };
}

function selectControllingAuthorities({
  query = "",
  docs = [],
  limit = 5,
  responseMode = RESPONSE_MODE.STANDARD
} = {}) {
  const { results } = rerankForTina({
    query,
    docs,
    limit: Math.max(limit * 2, 10),
    suppressIssueMismatch: true,
    suppressWeakSecondary: true,
    suppressSuperseded: true,
    responseMode
  });

  return results
    .filter(
      (doc) => getAuthorityTypeForDoc(doc) !== "SECONDARY"
    )
    .slice(0, limit);
}

function selectIssueRelevantCases({
  query = "",
  docs = [],
  limit = 4,
  responseMode = RESPONSE_MODE.TECHNICAL
} = {}) {
  const { results } = rerankForTina({
    query,
    docs,
    limit: Math.max(limit * 3, 12),
    suppressIssueMismatch: true,
    suppressWeakSecondary: true,
    suppressSuperseded: true,
    responseMode
  });

  return results
    .filter((doc) =>
      [
        "SUPREME_COURT",
        "CTA_EN_BANC",
        "COURT_OF_APPEALS",
        "CTA_DIVISION"
      ].includes(getAuthorityTypeForDoc(doc))
    )
    .slice(0, limit);
}

module.exports = {
  ENGINE_VERSION,

  ISSUE_TYPE,
  RESPONSE_MODE,

  computeTinaRerankScore,

  rerankForTina,

  selectControllingAuthorities,
  selectIssueRelevantCases
};
