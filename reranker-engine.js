// FILE: reranker-engine.js
"use strict";

/**
 * TINA Enterprise Reranker Engine
 */

const {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} = require("./authority-engine.js");

const { applySupersessionFilter } = require("./supersession-engine.js");
const { analyzeQueryIntent } = require("./query-intent-engine.js");

const ENGINE_VERSION = "3.0.0";
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
  ISSUANCE: "ISSUANCE",
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
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeMode(mode = RESPONSE_MODE.STANDARD) {
  const value = String(mode || RESPONSE_MODE.STANDARD).trim().toUpperCase();

  const aliases = {
    QUICK_MODE: RESPONSE_MODE.QUICK,
    STANDARD_TAX_MODE: RESPONSE_MODE.STANDARD,
    TECHNICAL_TAX_MODE: RESPONSE_MODE.TECHNICAL,
    AUDIT_MODE: RESPONSE_MODE.AUDIT,
    LITIGATION_LEGAL_DEFENSE_MODE: RESPONSE_MODE.LITIGATION,
    TRANSACTION_CHARACTERIZATION_MODE: RESPONSE_MODE.TRANSACTION,
    CONTRACT_INTERPRETATION_MODE: RESPONSE_MODE.CONTRACT,
    EVIDENCE_EVALUATION_MODE: RESPONSE_MODE.EVIDENCE_HEAVY,
    REVIEWER_LEARNING_MODE: RESPONSE_MODE.REVIEWER,
    ASK: RESPONSE_MODE.STANDARD,
    TAX_EXPERT: RESPONSE_MODE.TECHNICAL,
    TAX_REVIEWER: RESPONSE_MODE.REVIEWER,
    QUIZ_MASTER: RESPONSE_MODE.REVIEWER,
    SOURCE_FINDER: RESPONSE_MODE.STANDARD
  };

  if (aliases[value]) return aliases[value];
  if (Object.values(RESPONSE_MODE).includes(value)) return value;

  if (value.includes("AUDIT")) return RESPONSE_MODE.AUDIT;
  if (value.includes("LITIGATION") || value.includes("LEGAL")) return RESPONSE_MODE.LITIGATION;
  if (value.includes("CONTRACT")) return RESPONSE_MODE.CONTRACT;
  if (value.includes("TRANSACTION")) return RESPONSE_MODE.TRANSACTION;
  if (value.includes("EVIDENCE")) return RESPONSE_MODE.EVIDENCE_HEAVY;
  if (value.includes("REVIEW") || value.includes("QUIZ")) return RESPONSE_MODE.REVIEWER;
  if (value.includes("TECHNICAL") || value.includes("DOCTRINE")) return RESPONSE_MODE.TECHNICAL;
  if (value.includes("QUICK")) return RESPONSE_MODE.QUICK;

  return RESPONSE_MODE.STANDARD;
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
      doc.original_source ||
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
      doc.original_source,
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

  push(/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|unutilized input vat|excess input vat)\b/i.test(value), ISSUE_TYPE.VAT_REFUND);
  push(/\b(vat liability|output vat|subject to vat|vatable|gross receipts|sale of goods|sale of services|define vat|what is vat)\b/i.test(value), ISSUE_TYPE.VAT_LIABILITY);
  push(/\b(file|filing|deadline|appeal|assessment|loa|pan|fan|return|remedy|protest|prescription)\b/i.test(value), ISSUE_TYPE.PROCEDURAL);
  push(/\b(invoice|receipt|substantiation|documentary|evidence|records|burden of proof|supporting document)\b/i.test(value), ISSUE_TYPE.EVIDENTIARY);
  push(/\b(jurisdiction|jurisdictional|cta|condition precedent)\b/i.test(value), ISSUE_TYPE.JURISDICTIONAL);
  push(/\b(withholding|ewt|expanded withholding|cwt|fwt|2307|1601)\b/i.test(value), ISSUE_TYPE.WITHHOLDING);
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|taxable income|gross income)\b/i.test(value), ISSUE_TYPE.INCOME_TAX);
  push(/\b(rr|rmc|rmo|ramo|revenue regulation|revenue memorandum circular|revenue memorandum order)\s*(?:no\.?)?\s*\d+/i.test(value), ISSUE_TYPE.ISSUANCE);
  push(/\b(contract|agreement|lease agreement|concession agreement|clause)\b/i.test(value), ISSUE_TYPE.CONTRACT);
  push(/\b(principal vs agent|gross or net|pass-through|pass through|reimbursement|bundled|inclusive package|concession)\b/i.test(value), ISSUE_TYPE.TRANSACTION);
  push(/\b(economic substance|substance over form|sham|simulation)\b/i.test(value), ISSUE_TYPE.ECONOMIC_SUBSTANCE);
  push(/\b(agent|principal)\b/i.test(value), ISSUE_TYPE.PRINCIPAL_AGENT);
  push(/\b(pass-through|pass through)\b/i.test(value), ISSUE_TYPE.PASS_THROUGH);
  push(/\b(reimbursement|reimbursable)\b/i.test(value), ISSUE_TYPE.REIMBURSEMENT);
  push(/\b(bundled|package|inclusive)\b/i.test(value), ISSUE_TYPE.BUNDLED_TRANSACTION);
  push(/\b(audit|misstatement|working paper|qualified opinion)\b/i.test(value), ISSUE_TYPE.AUDIT);
  push(/\b(pfrs|pas|financial statements|afs)\b/i.test(value), ISSUE_TYPE.PFRS);
  push(/\b(accounting treatment|classification|presentation|recognition)\b/i.test(value), ISSUE_TYPE.ACCOUNTING);
  push(/\b(conflict|hierarchy|prevails|override)\b/i.test(value), ISSUE_TYPE.CONFLICT_ANALYSIS);
  push(/\b(doctrine|jurisprudence|substance over form)\b/i.test(value), ISSUE_TYPE.DOCTRINE);
  push(/\b(create|train|eopt|create more|republic act|nirc|tax code)\b/i.test(value), ISSUE_TYPE.NAMED_LAW);
  push(/\b(g\.?\s*r\.?\s*no\.?|cta|supreme court|court of appeals| v\. | vs\.? )\b/i.test(value), ISSUE_TYPE.CASE_LAW);

  return unique(issues.length ? issues : [ISSUE_TYPE.GENERAL]);
}

function issueOverlap(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || queryIssues.includes(ISSUE_TYPE.GENERAL)) return true;
  if (!docIssues.length || docIssues.includes(ISSUE_TYPE.GENERAL)) return true;
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

function authorityPenalty(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);
  const text = lower(docText(doc));

  let penalty = 0;

  if (type === "SECONDARY" || type === "UNKNOWN") penalty += 45;
  if (text.includes("07_cpa_notes")) penalty += 35;
  if (text.includes("08_review_materials")) penalty += 35;
  if (text.includes("working_papers")) penalty += 35;
  if (text.includes("internal_notes")) penalty += 35;
  if (text.includes("drafts")) penalty += 30;
  if (text.includes("reviewer")) penalty += 25;
  if (text.includes("handout")) penalty += 25;
  if (text.includes("lecture notes")) penalty += 25;

  return penalty;
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

  return unique(signals);
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

function issueBonus(query = "", doc = {}) {
  const queryIssues = detectIssueTypes(query);
  const docIssues = detectIssueTypes(docText(doc));

  if (issueMismatch(queryIssues, docIssues)) return -90;
  if (issueOverlap(queryIssues, docIssues)) return 40;

  return 0;
}

function controllingBonus(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);
  const level = getAuthorityLevelForDoc(doc);
  const precedence = getControllingPrecedenceForDoc(doc);

  let bonus = 0;

  if (["CONSTITUTION", "STATUTE", "RR", "SUPREME_COURT"].includes(type)) bonus += 50;
  else if (["RMC", "RMO", "RAMO"].includes(type)) bonus += 25;
  else if (type === "BIR_RULING") bonus += 15;
  else if (["CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(type)) bonus += 10;

  if (level <= 3) bonus += 32;
  else if (level <= 8) bonus += 22;
  else if (level <= 11) bonus += 8;

  if (precedence <= 5) bonus += 22;
  else if (precedence <= 9) bonus += 10;

  return bonus;
}

function semanticScore(doc = {}) {
  return Number(
    doc.rerankScore ??
      doc.retrievalScore ??
      doc.retrieval_score ??
      doc.finalScore ??
      doc.final_score ??
      doc.score ??
      doc.similarity ??
      0
  );
}

function adaptiveModeBonus(responseMode = RESPONSE_MODE.STANDARD, doc = {}) {
  const mode = normalizeMode(responseMode);
  const authorityType = getAuthorityTypeForDoc(doc);
  const text = lower(docText(doc));

  let bonus = 0;

  if (mode === RESPONSE_MODE.AUDIT && /\bpfrs\b|\bpas\b|\bfinancial statements\b|\bafs\b|\baudit\b/i.test(text)) bonus += 40;
  if (mode === RESPONSE_MODE.CONTRACT && /\bcontract\b|\bagreement\b|\bclause\b|\blease\b|\bconcession\b/i.test(text)) bonus += 45;
  if (mode === RESPONSE_MODE.TRANSACTION && /\bprincipal\b|\bagent\b|\bpass-through\b|\breimbursement\b|\bgross\b|\bnet\b|\bbundled\b/i.test(text)) bonus += 48;
  if (mode === RESPONSE_MODE.EVIDENCE_HEAVY && /\binvoice\b|\breceipt\b|\bsubstantiation\b|\bevidence\b|\bproof\b/i.test(text)) bonus += 48;
  if (mode === RESPONSE_MODE.TECHNICAL && authorityType === "SUPREME_COURT") bonus += 40;
  if (mode === RESPONSE_MODE.LITIGATION && authorityType === "SUPREME_COURT") bonus += 55;

  return bonus;
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

function supersessionPenalty(doc = {}) {
  return isSupersededDoc(doc) ? 150 : 0;
}

function weakCasePenalty(query = "", doc = {}) {
  const queryIssues = detectIssueTypes(query);
  const text = lower(docText(doc));

  if (queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY) && /\brefund\b|\binput vat refund\b/.test(text)) return 60;
  if (queryIssues.includes(ISSUE_TYPE.VAT_REFUND) && /\boutput vat\b|\bvat liability\b/.test(text)) return 60;

  return 0;
}

function computeTinaRerankScore({
  query = "",
  doc = {},
  responseMode = RESPONSE_MODE.STANDARD
}) {
  const score =
    semanticScore(doc) * 0.24 +
    authorityWeight(doc) * 0.29 +
    exactReferenceBonus(query, doc) * 0.17 +
    issueBonus(query, doc) * 0.13 +
    controllingBonus(doc) * 0.10 +
    adaptiveModeBonus(responseMode, doc) * 0.07 -
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
  responseMode = RESPONSE_MODE.STANDARD,
  adaptiveContext = {}
} = {}) {
  const queryIntent = analyzeQueryIntent(query);
  const effectiveMode = normalizeMode(
    responseMode ||
      queryIntent?.adaptiveMode ||
      queryIntent?.detectedMode ||
      adaptiveContext?.responsePlan?.responseMode ||
      RESPONSE_MODE.STANDARD
  );

  const queryIssues = detectIssueTypes(query);
  const uniqueInputDocs = uniqueDocs(docs);

  const supersessionResult = applySupersessionFilter(uniqueInputDocs);
  const activeDocs = suppressSuperseded
    ? supersessionResult?.activeDocs || uniqueInputDocs
    : uniqueInputDocs;

  const hierarchyRanked = rerankByHierarchy(uniqueDocs(activeDocs), query);

  const ranked = hierarchyRanked
    .map((doc) => {
      const docIssues = detectIssueTypes(docText(doc));
      const mismatch = issueMismatch(queryIssues, docIssues);

      const weakSecondary =
        ["SECONDARY", "UNKNOWN"].includes(getAuthorityTypeForDoc(doc)) &&
        authorityPenalty(doc) >= 45;

      const superseded = isSupersededDoc(doc);

      const rerankScore = computeTinaRerankScore({
        query,
        doc,
        responseMode: effectiveMode
      });

      return {
        ...doc,
        rerankIssueTypes: docIssues,
        rerankScore,
        issueMismatch: mismatch,
        weakSecondary,
        superseded,
        citationMatchBonus: exactReferenceBonus(query, doc),
        rerankMetadata: {
          responseMode: effectiveMode,
          hierarchyAware: true,
          issueAware: true,
          exactAuthorityAware: true,
          supersessionAware: true,
          adaptiveContextAware: true,
          tinaRerankerVersion: ENGINE_VERSION
        }
      };
    })
    .filter((doc) => {
      if (suppressIssueMismatch && doc.issueMismatch) return false;
      if (suppressWeakSecondary && doc.weakSecondary) return false;
      if (suppressSuperseded && doc.superseded) return false;
      return true;
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

      return b.rerankScore - a.rerankScore;
    })
    .slice(0, limit);

  return {
    results: ranked,
    supersessionResult,
    queryIntent,
    audit: {
      engine: "TINA_RERANKER_ENGINE",
      version: ENGINE_VERSION,
      query,
      queryIssues,
      responseMode: effectiveMode,
      inputCount: Array.isArray(docs) ? docs.length : 0,
      uniqueInputCount: uniqueInputDocs.length,
      activeInputCount: activeDocs.length,
      outputCount: ranked.length,
      suppressIssueMismatch,
      suppressWeakSecondary,
      suppressSuperseded,
      policy:
        "TINA reranker prioritizes controlling authority, exact authority matching, adaptive-mode relevance, issue-matched jurisprudence, and suppresses superseded or weak secondary authorities.",
      generatedAt: new Date().toISOString()
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
    .filter((doc) => !["SECONDARY", "UNKNOWN"].includes(getAuthorityTypeForDoc(doc)))
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
      ["SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(
        getAuthorityTypeForDoc(doc)
      )
    )
    .slice(0, limit);
}

function rerankerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_RERANKER_ENGINE",
    version: ENGINE_VERSION,
    commonJsCompatible: true,
    adaptiveCompatible: true,
    jurisprudenceCompatible: true,
    supersessionCompatible: true
  };
}

module.exports = {
  ENGINE_VERSION,
  ISSUE_TYPE,
  RESPONSE_MODE,

  normalizeMode,
  detectIssueTypes,
  computeTinaRerankScore,

  rerankForTina,
  selectControllingAuthorities,
  selectIssueRelevantCases,

  rerankerHealthCheck
};
