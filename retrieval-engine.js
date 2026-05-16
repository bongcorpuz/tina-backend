// FILE: retrieval-engine.js
"use strict";

/**
 * TINA Enterprise Retrieval Orchestration Engine
 * Version: 4.0.0
 *
 * Patch:
 * - Accepts issueClassification, primaryIssue, subIssue, subIssues, legalDimensions,
 *   retrievalStrategy, and targetAuthorities from rag-answer-handler.js.
 * - Produces structured issueClassificationMatch object for downstream engines.
 * - Produces targetAuthorityMatch boolean for source visibility and citation formatting.
 * - Uses controllingPrecedence consistently.
 * - Keeps /ask, /tax, /review, /source on one issue-aware RAG retrieval path.
 */

import {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import { applySupersessionFilter } from "./supersession-engine.js";
import { analyzeQueryIntent } from "./query-intent-engine.js";

import {
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc
} from "./issue-classification-engine.js";

import { rerankForTina } from "./reranker-engine.js";

const ENGINE_VERSION = "4.0.0";

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
  ASK: "STANDARD",
  TAX_EXPERT: "TECHNICAL",
  TAX_REVIEWER: "REVIEWER",
  SOURCE_FINDER: "STANDARD",
  QUICK_MODE: "QUICK",
  STANDARD_TAX_MODE: "STANDARD",
  TECHNICAL_TAX_MODE: "TECHNICAL",
  AUDIT_MODE: "AUDIT",
  LITIGATION_LEGAL_DEFENSE_MODE: "LITIGATION",
  TRANSACTION_CHARACTERIZATION_MODE: "TRANSACTION",
  CONTRACT_INTERPRETATION_MODE: "CONTRACT",
  EVIDENCE_EVALUATION_MODE: "EVIDENCE_HEAVY",
  FACT_PATTERN_ANALYSIS_MODE: "TECHNICAL",
  REVIEWER_LEARNING_MODE: "REVIEWER"
});

const AUTHORITY_GROUP_TO_TYPES = Object.freeze({
  constitution: ["CONSTITUTION"],
  nirc: ["STATUTE", "NIRC", "TAX_CODE"],
  statute: ["STATUTE", "NIRC", "TAX_CODE"],
  taxCode: ["STATUTE", "NIRC", "TAX_CODE"],
  supremeCourt: ["SUPREME_COURT"],
  ctaEnBanc: ["CTA_EN_BANC"],
  ctaDivision: ["CTA_DIVISION"],
  courtOfAppeals: ["COURT_OF_APPEALS"],
  rr: ["RR"],
  rmc: ["RMC"],
  rmo: ["RMO"],
  ramo: ["RAMO"],
  birRulings: ["BIR_RULING"],
  birRuling: ["BIR_RULING"],
  pfrs: ["PFRS"],
  pas: ["PAS"],
  psa: ["PSA"]
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

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
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

function normalizeIssue(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VAT: "VAT_LIABILITY",
    OUTPUT_VAT: "VAT_LIABILITY",
    INPUT_VAT: "VAT_REFUND",
    INPUT_VAT_REFUND: "VAT_REFUND",
    TAX_REFUND: "VAT_REFUND",
    REFUND: "VAT_REFUND",
    EWT: "WITHHOLDING",
    CWT: "WITHHOLDING",
    FWT: "WITHHOLDING",
    WITHHOLDING_TAX: "WITHHOLDING",
    RCIT: "INCOME_TAX",
    MCIT: "INCOME_TAX",
    NOLCO: "INCOME_TAX",
    PRINCIPAL_AGENT: "TRANSACTION",
    PRINCIPAL_VS_AGENT: "TRANSACTION",
    GROSS_NET: "TRANSACTION",
    PASS_THROUGH: "TRANSACTION",
    REIMBURSEMENT: "TRANSACTION",
    AGREEMENT: "CONTRACT",
    CHARACTERIZATION: "TRANSACTION",
    DEFINITION: "VAT_LIABILITY",
    REFUND_PROCEDURE: "VAT_REFUND"
  };

  return aliases[raw] || raw || null;
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    REVENUE_REGULATION: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
    BIR_RULING: "BIR_RULING",
    IFRS: "PFRS"
  };

  return aliases[raw] || raw || null;
}

function normalizeTargetAuthorities(targetAuthorities = null) {
  const output = [];

  if (Array.isArray(targetAuthorities)) {
    for (const item of targetAuthorities) {
      const normalized = normalizeAuthority(item);
      if (normalized) output.push(normalized);
    }
    return unique(output);
  }

  if (targetAuthorities && typeof targetAuthorities === "object") {
    for (const [group, values] of Object.entries(targetAuthorities)) {
      const groupTypes = AUTHORITY_GROUP_TO_TYPES[group] || [];

      for (const type of groupTypes) output.push(type);

      for (const value of safeArray(values)) {
        const normalized = normalizeAuthority(value);
        if (normalized) output.push(normalized);
      }
    }
  }

  return unique(output);
}

function detectIssueType(text = "") {
  const q = lower(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|unutilized input vat|excess input vat|claim for refund)\b/i.test(q), "VAT_REFUND");
  push(/\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|gross selling price|gross receipts|define vat|what is vat|value-added tax)\b/i.test(q), "VAT_LIABILITY");
  push(/\b(invoice|receipt|substantiation|documentary|proof|evidence|support|invoicing|burden of proof)\b/i.test(q), "EVIDENTIARY");
  push(/\b(jurisdiction|jurisdictional|prescriptive|deadline|due date|filing|appeal|protest|assessment|loa|pan|fan|fld)\b/i.test(q), "PROCEDURAL");
  push(/\b(withholding|ewt|expanded withholding|final withholding|fwt|cwt)\b/i.test(q), "WITHHOLDING");
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|deduction|taxable income|gross income)\b/i.test(q), "INCOME_TAX");
  push(/\b(create|train|eopt|ease of paying taxes|create more|republic act|ra\s*\d{4,6}|nirc|tax code)\b/i.test(q), "NAMED_LAW");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(q), "CONTRACT");
  push(/\b(principal vs agent|principal|agent|pass-through|pass through|reimbursement|bundled|gross or net|economic substance|substance over form)\b/i.test(q), "TRANSACTION");
  push(/\b(audit|afs|working paper|pfrs|pas|misstatement|financial statements)\b/i.test(q), "AUDIT");
  push(/\b(g\.?\s*r\.?\s*no\.?|cta|supreme court|court of appeals|jurisprudence|case)\b/i.test(q), "CASE_LAW");
  push(/\b(rr|rmc|rmo|ramo|revenue regulation|revenue memorandum circular|revenue memorandum order)\s*(?:no\.?)?\s*\d+/i.test(q), "ISSUANCE");

  return unique(issues);
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
      doc.metadata?.authorityType,
      doc.authorityType,
      doc.authority_type,
      ...(Array.isArray(doc.normalizedAliases) ? doc.normalizedAliases : []),
      ...(Array.isArray(doc.normalized_aliases) ? doc.normalized_aliases : []),
      ...(Array.isArray(doc.metadata?.normalizedAliases) ? doc.metadata.normalizedAliases : [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function detectDocIssueType(doc = {}) {
  return detectIssueType(docText(doc));
}

function normalizeExternalIssueClassification({
  query = "",
  issueClassification = null,
  primaryIssue = null,
  subIssue = null,
  subIssues = [],
  legalDimensions = [],
  retrievalStrategy = null,
  targetAuthorities = null,
  queryIntent = null
} = {}) {
  const detected = detectIssueType(query);

  let engineClassification = null;

  if (!issueClassification?.primaryIssue) {
    try {
      engineClassification = classifyTaxIssue(query);
    } catch (error) {
      engineClassification = {
        classificationError: error?.message || "Issue classification failed."
      };
    }
  }

  const source = issueClassification?.primaryIssue
    ? issueClassification
    : engineClassification || {};

  const normalizedPrimaryIssue =
    normalizeIssue(primaryIssue) ||
    normalizeIssue(source.primaryIssue) ||
    normalizeIssue(source.primary_issue) ||
    normalizeIssue(source.issueType) ||
    normalizeIssue(source.issue_type) ||
    normalizeIssue(queryIntent?.primaryIssue) ||
    detected.map(normalizeIssue).filter(Boolean)[0] ||
    "GENERAL_TAX";

  const normalizedSubIssues = unique([
    normalizedPrimaryIssue,
    normalizeIssue(subIssue),
    ...safeArray(subIssues).map(normalizeIssue),
    ...safeArray(source.subIssues).map(normalizeIssue),
    ...safeArray(source.subIssue).map(normalizeIssue),
    ...safeArray(source.sub_issues).map(normalizeIssue),
    ...safeArray(source.sub_issue).map(normalizeIssue),
    ...safeArray(queryIntent?.subIssues).map(normalizeIssue),
    ...detected.map(normalizeIssue)
  ]).filter(Boolean);

  const normalizedLegalDimensions = unique([
    ...safeArray(legalDimensions).map((item) => String(item || "").toUpperCase()),
    ...safeArray(source.legalDimensions).map((item) => String(item || "").toUpperCase()),
    ...safeArray(source.legalDimension).map((item) => String(item || "").toUpperCase()),
    ...safeArray(queryIntent?.legalDimensions).map((item) => String(item || "").toUpperCase())
  ]).filter(Boolean);

  const normalizedTargetAuthorities = unique([
    ...normalizeTargetAuthorities(targetAuthorities),
    ...normalizeTargetAuthorities(source.targetAuthorities),
    ...normalizeTargetAuthorities(source.target_authorities),
    ...normalizeTargetAuthorities(queryIntent?.targetAuthorities)
  ]);

  return {
    ...source,
    primaryIssue: normalizedPrimaryIssue,
    subIssue:
      source.subIssue ||
      source.sub_issue ||
      normalizedSubIssues[0] ||
      normalizedPrimaryIssue,
    subIssues: normalizedSubIssues,
    legalDimensions: normalizedLegalDimensions,
    retrievalStrategy:
      retrievalStrategy ||
      source.retrievalStrategy ||
      source.retrieval_strategy ||
      queryIntent?.retrievalStrategy ||
      "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",
    targetAuthorities: normalizedTargetAuthorities,
    keyTerms: unique([
      ...safeArray(source.keyTerms),
      normalizedPrimaryIssue,
      ...normalizedSubIssues
    ]),
    taxDomains: unique([
      ...safeArray(source.taxDomains),
      normalizedPrimaryIssue
    ]),
    legalQuestionPresented:
      source.legalQuestionPresented ||
      source.legal_question_presented ||
      query,
    factSensitivity:
      source.factSensitivity ||
      source.fact_sensitivity ||
      "moderate",
    exactAuthority:
      source.exactAuthority || {
        detected: false,
        type: null,
        reference: null
      },
    retrievalControls: {
      issueFirst: true,
      suppressIssueMismatchedCases: true,
      suppressVatRefundCasesUnlessRefundIssue:
        normalizedPrimaryIssue !== "VAT_REFUND",
      requirePrimaryAuthorityForDefinitions:
        normalizedPrimaryIssue === "VAT_LIABILITY",
      ...(source.retrievalControls || {})
    }
  };
}

function safeIssueClassification(query = "", existingClassification = null, extras = {}) {
  return normalizeExternalIssueClassification({
    query,
    issueClassification: existingClassification,
    ...extras
  });
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

function isHiddenOrWeakSource(doc = {}) {
  const haystack = lower(docText(doc));
  return HIDDEN_OR_WEAK_PATTERNS.some((pattern) => haystack.includes(pattern));
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

  if (
    queryIssues.includes("WITHHOLDING") &&
    (docIssues.includes("VAT_REFUND") || docIssues.includes("VAT_LIABILITY")) &&
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
    NIRC: 98,
    TAX_CODE: 98,
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
    PFRS: 58,
    PAS: 58,
    PSA: 52,
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

function docTargetAuthorityMatch(classification = {}, doc = {}) {
  const targets = normalizeTargetAuthorities(classification.targetAuthorities);
  if (!targets.length) return false;
  return targets.includes(getAuthorityTypeForDoc(doc));
}

function issueClassificationCompatible(classification = {}, doc = {}) {
  try {
    const result = isIssueClassificationCompatibleWithDoc(classification, doc);
    return result !== false;
  } catch {
    const docIssues = detectDocIssueType(doc).map(normalizeIssue);
    const queryIssues = safeArray(classification.subIssues).map(normalizeIssue).filter(Boolean);

    if (!queryIssues.length || !docIssues.length) return true;

    if (hasIssueMismatch(queryIssues, docIssues)) return false;

    return hasIssueOverlap(queryIssues, docIssues);
  }
}

function targetAuthorityBonus(classification = {}, doc = {}) {
  const targetTypes = normalizeTargetAuthorities(classification.targetAuthorities);
  if (!targetTypes.length) return 0;

  const docType = getAuthorityTypeForDoc(doc);
  const haystack = lower(docText(doc));

  let bonus = 0;

  if (targetTypes.includes(docType)) bonus += 75;

  for (const target of targetTypes) {
    const normalized = lower(String(target).replace(/_/g, " "));
    if (normalized && haystack.includes(normalized)) bonus += 10;
  }

  return bonus;
}

function buildIssueClassificationMatch(query = "", classification = {}, doc = {}) {
  const docIssues = detectDocIssueType(doc).map(normalizeIssue).filter(Boolean);
  const queryIssues = unique([
    normalizeIssue(classification.primaryIssue),
    ...safeArray(classification.subIssues).map(normalizeIssue)
  ]).filter(Boolean);

  const issueMismatch = hasIssueMismatch(queryIssues, docIssues);
  const issueOverlap = hasIssueOverlap(queryIssues, docIssues);
  const compatible = issueClassificationCompatible(classification, doc) && !issueMismatch;
  const targetAuthorityMatch = docTargetAuthorityMatch(classification, doc);

  return {
    matched: compatible && (issueOverlap || targetAuthorityMatch || !docIssues.length),
    compatible,
    issueOverlap,
    issueMismatch,
    targetAuthorityMatch,
    primaryIssue: classification.primaryIssue || null,
    subIssues: classification.subIssues || [],
    legalDimensions: classification.legalDimensions || [],
    retrievalStrategy: classification.retrievalStrategy || null,
    targetAuthorities: classification.targetAuthorities || [],
    docIssues,
    docAuthorityType: getAuthorityTypeForDoc(doc)
  };
}

function issueClassificationBonus(query = "", classification = {}, doc = {}) {
  if (!classification?.primaryIssue) return 0;

  const match = buildIssueClassificationMatch(query, classification, doc);

  if (match.issueMismatch || match.compatible === false) return -150;

  const haystack = lower(docText(doc));
  let bonus = 0;

  if (match.issueOverlap) bonus += 60;
  if (match.targetAuthorityMatch) bonus += 75;

  if (
    classification.primaryIssue &&
    haystack.includes(lower(String(classification.primaryIssue).replace(/_/g, " ")))
  ) {
    bonus += 15;
  }

  for (const issue of safeArray(classification.subIssues)) {
    const term = lower(String(issue).replace(/_/g, " "));
    if (term.length >= 3 && haystack.includes(term)) bonus += 10;
  }

  for (const term of safeArray(classification.keyTerms)) {
    const normalized = lower(String(term).replace(/_/g, " "));
    if (normalized && haystack.includes(normalized)) bonus += 8;
  }

  if (classification.retrievalControls?.suppressVatRefundCasesUnlessRefundIssue) {
    if (/\bvat refund\b|\bsection 112\b|\b120\+30\b|\bunutilized input vat\b|\bexcess input vat\b/i.test(haystack)) {
      bonus -= 95;
    }
  }

  return bonus;
}

function issueWeight(query = "", doc = {}, classification = null) {
  const queryIssues = classification?.subIssues?.length
    ? classification.subIssues.map(normalizeIssue).filter(Boolean)
    : detectIssueType(query).map(normalizeIssue).filter(Boolean);

  const docIssues = detectDocIssueType(doc).map(normalizeIssue).filter(Boolean);

  if (classification && !issueClassificationCompatible(classification, doc)) return -120;
  if (hasIssueMismatch(queryIssues, docIssues)) return -80;
  if (hasIssueOverlap(queryIssues, docIssues)) return 35;

  return 0;
}

function weakSourcePenalty(doc = {}) {
  return isHiddenOrWeakSource(doc) ? -75 : 0;
}

function adaptiveModeBonus({ mode = "STANDARD", doc = {}, classification = null }) {
  const normalizedMode = normalizeMode(mode);
  const authority = getAuthorityTypeForDoc(doc);
  const text = lower(docText(doc));

  let bonus = 0;

  if (normalizedMode === "LITIGATION" && authority === "SUPREME_COURT") bonus += 55;
  if (normalizedMode === "TECHNICAL" && authority === "SUPREME_COURT") bonus += 42;

  if (normalizedMode === "AUDIT") {
    if (/\bpfrs\b|\bpas\b|\bfinancial statements\b|\bafs\b|\baudit\b/i.test(text)) bonus += 45;
    if (["STATUTE", "RR", "RMC"].includes(authority)) bonus += 25;
  }

  if (normalizedMode === "TRANSACTION") {
    if (/\bprincipal\b|\bagent\b|\breimbursement\b|\bpass-through\b|\bgross\b|\bnet\b|\beconomic substance\b|\bbundled\b/i.test(text)) bonus += 50;
    if (authority === "RR") bonus += 28;
  }

  if (normalizedMode === "CONTRACT") {
    if (/\bcontract\b|\bagreement\b|\bclause\b|\blease\b|\bconcession\b/i.test(text)) bonus += 48;
    if (authority === "SUPREME_COURT") bonus += 24;
  }

  if (normalizedMode === "EVIDENCE_HEAVY") {
    if (/\binvoice\b|\breceipt\b|\bsubstantiation\b|\bevidence\b|\bproof\b/i.test(text)) bonus += 50;
  }

  if (classification?.retrievalStrategy) {
    const strategy = lower(classification.retrievalStrategy);

    if (strategy.includes("foundational") || strategy.includes("definition")) {
      if (["STATUTE", "NIRC", "TAX_CODE", "RR", "SUPREME_COURT"].includes(authority)) bonus += 30;
    }

    if (strategy.includes("procedural")) {
      if (["STATUTE", "RR", "RMC", "RMO", "SUPREME_COURT", "CTA_EN_BANC"].includes(authority)) bonus += 24;
    }

    if (strategy.includes("jurisprudential")) {
      if (["SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "COURT_OF_APPEALS"].includes(authority)) bonus += 35;
    }

    if (strategy.includes("fact") || strategy.includes("transaction")) {
      if (/\bfacts\b|\btransaction\b|\bcontract\b|\bactual\b|\bevidence\b|\bsubstance\b/i.test(text)) bonus += 28;
    }
  }

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

function computeRetrievalScore({
  query = "",
  doc = {},
  adaptiveMode = "STANDARD",
  issueClassification = null
}) {
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
  const issueScore = issueWeight(query, doc, issueClassification);
  const classificationScore = issueClassificationBonus(query, issueClassification, doc);
  const weakPenalty = weakSourcePenalty(doc);
  const citationBonus = exactReferenceBonus(query, doc);
  const level = getAuthorityLevelForDoc(doc);
  const precedence = getControllingPrecedenceForDoc(doc);
  const levelBonus = level <= 3 ? 38 : level <= 8 ? 24 : level <= 12 ? 10 : 0;
  const precedenceBonus = precedence <= 5 ? 24 : precedence <= 9 ? 12 : 0;

  const modeBonus = adaptiveModeBonus({
    mode: adaptiveMode,
    doc,
    classification: issueClassification
  });

  const supersessionPenalty = isSupersededDoc(doc) ? -150 : 0;

  return Number(
    (
      baseScore * 0.24 +
      hierarchyScore * 0.28 +
      citationBonus * 0.18 +
      classificationScore +
      issueScore +
      levelBonus +
      precedenceBonus +
      modeBonus +
      weakPenalty +
      supersessionPenalty
    ).toFixed(4)
  );
}

function filterRetrievalNoise(query = "", docs = [], issueClassification = null) {
  const queryIssues = issueClassification?.subIssues?.length
    ? issueClassification.subIssues.map(normalizeIssue).filter(Boolean)
    : detectIssueType(query).map(normalizeIssue).filter(Boolean);

  return uniqueDocs(docs).filter((doc) => {
    if (!doc) return false;

    const authorityType = getAuthorityTypeForDoc(doc);
    const docIssues = detectDocIssueType(doc).map(normalizeIssue).filter(Boolean);

    if (authorityType === "SECONDARY" && isHiddenOrWeakSource(doc)) return false;
    if (hasIssueMismatch(queryIssues, docIssues)) return false;

    if (
      issueClassification?.retrievalControls?.suppressIssueMismatchedCases &&
      !issueClassificationCompatible(issueClassification, doc)
    ) {
      return false;
    }

    return true;
  });
}

function buildIssueSpecificQueries(query = "", queryIntent = {}, classification = {}, maxQueries = 8) {
  let issueQueries = [];

  try {
    issueQueries = buildIssueClassificationSearchQueries(classification, maxQueries);
  } catch {
    issueQueries = [];
  }

  const queries = [
    query,
    classification.legalQuestionPresented,
    `${query} ${classification.primaryIssue || ""}`,
    ...safeArray(classification.subIssues).map((issue) => `${query} ${issue}`),
    ...issueQueries
  ];

  for (const term of queryIntent?.retrievalHints?.priorityTerms || []) {
    queries.push(`${classification.legalQuestionPresented || query} ${term}`);
  }

  return unique(queries.map(normalizeText)).slice(0, maxQueries);
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
  supersededCount = 0,
  issueClassification = null,
  retrievalQueries = []
}) {
  return {
    engine: "TINA_RETRIEVAL_ENGINE",
    version: ENGINE_VERSION,
    query,
    queryIssues,
    adaptiveMode: normalizeMode(adaptiveMode),
    retrievalStrategy,
    issueClassification: issueClassification
      ? {
          primaryIssue: issueClassification.primaryIssue,
          subIssue: issueClassification.subIssue,
          subIssues: issueClassification.subIssues,
          legalDimensions: issueClassification.legalDimensions,
          retrievalStrategy: issueClassification.retrievalStrategy,
          legalQuestionPresented: issueClassification.legalQuestionPresented,
          factSensitivity: issueClassification.factSensitivity,
          targetAuthorities: issueClassification.targetAuthorities,
          excludedAuthorities: issueClassification.excludedAuthorities,
          caseRoleFilters: issueClassification.caseRoleFilters
        }
      : null,
    retrievalQueries,
    rawCount,
    filteredCount,
    activeCount,
    finalCount,
    supersededCount,
    exactCitationMatched,
    usedReranker,
    retrievalPolicy:
      "Issue-first, hierarchy-first, exact-citation-aware retrieval. Documents are filtered and scored using primaryIssue, subIssues, legalDimensions, retrievalStrategy, targetAuthorities, authority hierarchy, supersession status, and issue compatibility.",
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
  adaptiveContext = {},
  issueClassification = null,
  primaryIssue = null,
  subIssue = null,
  subIssues = [],
  legalDimensions = [],
  retrievalStrategy = null,
  targetAuthorities = []
}) {
  const normalizedMode = normalizeMode(adaptiveMode);

  if (!query || !String(query).trim()) {
    return {
      results: [],
      supersessionResult: null,
      queryIntent: null,
      issueClassification: null,
      retrievalMetadata: {
        adaptiveMode: normalizedMode,
        hierarchyAware: true,
        issueFiltered: true,
        issueFirst: true,
        supersessionFiltered: false,
        exactCitationAware: true,
        rerankerAware: true,
        targetAuthorityAware: true
      },
      audit: buildRetrievalAudit({
        query,
        queryIssues: [],
        adaptiveMode: normalizedMode
      })
    };
  }

  const preliminaryClassification = safeIssueClassification(query, issueClassification, {
    primaryIssue,
    subIssue,
    subIssues,
    legalDimensions,
    retrievalStrategy,
    targetAuthorities
  });

  const queryIntent = analyzeQueryIntent(query, {
    issueClassification: preliminaryClassification
  });

  const classification = safeIssueClassification(query, preliminaryClassification, {
    queryIntent,
    primaryIssue,
    subIssue,
    subIssues,
    legalDimensions,
    retrievalStrategy,
    targetAuthorities
  });

  const effectiveMode = normalizeMode(
    adaptiveMode ||
      queryIntent?.adaptiveMode ||
      queryIntent?.detectedMode ||
      adaptiveContext?.responsePlan?.responseMode ||
      "STANDARD"
  );

  const retrievalQueries = buildIssueSpecificQueries(query, queryIntent, classification, 8);
  const rawResultBatches = [];

  for (const retrievalQuery of retrievalQueries) {
    const batch = await runVectorRetrieval({
      vectorStore,
      supabase,
      query: retrievalQuery,
      poolK
    });

    rawResultBatches.push(...batch);
  }

  const uniqueRaw = uniqueDocs(rawResultBatches);
  const filtered = filterRetrievalNoise(query, uniqueRaw, classification);
  const supersessionResult = applySupersessionFilter(filtered, asOfDate);

  const activeDocs =
    supersessionResult?.activeDocs?.length > 0
      ? supersessionResult.activeDocs
      : filtered;

  const scored = activeDocs.map((doc) => {
    const citationMatchBonus = exactReferenceBonus(query, doc);
    const issueClassificationMatch = buildIssueClassificationMatch(query, classification, doc);
    const targetAuthorityMatch = issueClassificationMatch.targetAuthorityMatch;

    const retrievalScore = computeRetrievalScore({
      query,
      doc,
      adaptiveMode: effectiveMode,
      issueClassification: classification
    });

    return {
      ...doc,
      citationMatchBonus,
      retrievalIssueType: detectDocIssueType(doc),
      issueClassificationMatch,
      targetAuthorityMatch,
      issueMismatch: issueClassificationMatch.issueMismatch,
      issueClassificationBonus: issueClassificationBonus(query, classification, doc),
      targetAuthorityBonus: targetAuthorityBonus(classification, doc),
      retrievalScore,
      finalScore: Math.max(Number(doc.finalScore || doc.final_score || 0), retrievalScore),
      retrievalMetadata: {
        ...(doc.retrievalMetadata || {}),
        adaptiveMode: effectiveMode,
        exactCitationAware: true,
        hierarchyAware: true,
        issueAware: true,
        issueFirst: true,
        primaryIssue: classification.primaryIssue,
        subIssue: classification.subIssue,
        subIssues: classification.subIssues,
        legalDimensions: classification.legalDimensions,
        retrievalStrategy: classification.retrievalStrategy,
        legalQuestionPresented: classification.legalQuestionPresented,
        targetAuthorities: classification.targetAuthorities,
        targetAuthorityMatch,
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
    adaptiveContext: {
      ...adaptiveContext,
      queryIntent,
      issueClassification: classification
    },
    issueClassification: classification
  });

  const reranked = Array.isArray(rerankedPayload?.results)
    ? rerankedPayload.results
    : [];

  const ranked = (reranked.length ? reranked : scored)
    .map((doc) => {
      const issueClassificationMatch =
        doc.issueClassificationMatch && typeof doc.issueClassificationMatch === "object"
          ? doc.issueClassificationMatch
          : buildIssueClassificationMatch(query, classification, doc);

      const retrievalScore = computeRetrievalScore({
        query,
        doc,
        adaptiveMode: effectiveMode,
        issueClassification: classification
      });

      return {
        ...doc,
        issueClassificationMatch,
        targetAuthorityMatch:
          doc.targetAuthorityMatch === true ||
          issueClassificationMatch.targetAuthorityMatch === true,
        issueMismatch:
          doc.issueMismatch === true ||
          issueClassificationMatch.issueMismatch === true,
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

      const aTarget = Number(a.targetAuthorityMatch === true);
      const bTarget = Number(b.targetAuthorityMatch === true);
      if (bTarget !== aTarget) return bTarget - aTarget;

      const aIssue = Number(a.issueClassificationMatch?.matched === true);
      const bIssue = Number(b.issueClassificationMatch?.matched === true);
      if (bIssue !== aIssue) return bIssue - aIssue;

      const aBonus = Number(a.issueClassificationBonus || 0);
      const bBonus = Number(b.issueClassificationBonus || 0);
      if (bBonus !== aBonus) return bBonus - aBonus;

      const aPrecedence = getControllingPrecedenceForDoc(a);
      const bPrecedence = getControllingPrecedenceForDoc(b);
      if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

      const aLevel = getAuthorityLevelForDoc(a);
      const bLevel = getAuthorityLevelForDoc(b);
      if (aLevel !== bLevel) return aLevel - bLevel;

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
    issueClassification: classification,

    retrievalMetadata: {
      adaptiveMode: effectiveMode,
      hierarchyAware: true,
      issueFiltered: true,
      issueFirst: true,
      primaryIssue: classification.primaryIssue,
      subIssue: classification.subIssue,
      subIssues: classification.subIssues,
      legalDimensions: classification.legalDimensions,
      legalQuestionPresented: classification.legalQuestionPresented,
      targetAuthorities: classification.targetAuthorities,
      targetAuthorityAware: true,
      supersessionFiltered: true,
      exactCitationAware: true,
      rerankerAware: true,
      retrievalStrategy:
        queryIntent?.retrievalStrategy ||
        classification?.retrievalStrategy ||
        "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC"
    },

    audit: buildRetrievalAudit({
      query,
      rawCount: uniqueRaw.length,
      filteredCount: filtered.length,
      activeCount: activeDocs.length,
      finalCount: ranked.length,
      queryIssues: classification.subIssues || detectIssueType(query),
      adaptiveMode: effectiveMode,
      exactCitationMatched,
      retrievalStrategy:
        queryIntent?.retrievalStrategy ||
        classification?.retrievalStrategy ||
        "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",
      usedReranker: Boolean(reranked.length),
      supersededCount:
        supersessionResult?.supersededCount ||
        supersessionResult?.superseded?.length ||
        0,
      issueClassification: classification,
      retrievalQueries
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
  adaptiveContext = {},
  issueClassification = null,
  primaryIssue = null,
  subIssue = null,
  subIssues = [],
  legalDimensions = [],
  retrievalStrategy = null,
  targetAuthorities = []
}) {
  const retrieval = await retrieveForTina({
    supabase,
    vectorStore,
    query,
    topK,
    poolK,
    asOfDate,
    adaptiveMode,
    adaptiveContext,
    issueClassification,
    primaryIssue,
    subIssue,
    subIssues,
    legalDimensions,
    retrievalStrategy,
    targetAuthorities
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
    exactCitationAware: true,
    issueClassificationCompatible: true,
    issueFirstRetrievalReady: true,
    targetAuthorityAware: true,
    structuredIssueClassificationMatch: true,
    ragAnswerHandlerCompatible: true
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
