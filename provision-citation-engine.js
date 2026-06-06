// FILE: provision-citation-engine.js
"use strict";

/**
 * TINA Enterprise Provision Citation Engine
 * Version: 4.2.0
 *
 * Role:
 * - Select and rank exact provisions, issuances, and authority snippets.
 * - Preserve issueClassificationMatch and targetAuthorityMatch.
 * - Prepare compact provision packets for context-orchestration-engine.js.
 *
 * This file must NOT:
 * - call OpenAI,
 * - assemble final OpenAI prompts,
 * - retrieve new sources,
 * - render final answers,
 * - fabricate provisions or citations.
 */

import {
  classifyAuthorityFromDocument,
  AUTHORITY_LEVEL,
  AUTHORITY_LABEL,
  normalizeLegalReference,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import {
  resolveCourtOverride,
  isGenuineConflict,
  analyzeConflictPair
} from "./conflict-engine.js";

import { applySupersessionFilter } from "./supersession-engine.js";

const ENGINE_VERSION = "4.2.0";

const MAX_PROVISION_DOCS = 6;
const MAX_CONTEXT_CHARS = 4200;
const MAX_EXCERPT_CHARS = 900;

/**
 * Master Prompt hierarchy:
 * 1 Constitution
 * 2 NIRC / CMTA / LGC / primary statutes
 * 3 Tax Treaties
 * 4 Supreme Court En Banc
 * 5 Supreme Court Division
 * 6 CTA En Banc
 * 7 CTA Division
 * 8 Revenue Regulations
 * 9 RMC / RMO / RAMO
 * 10 BIR Rulings
 * 11 LGU / BOC issuances
 * 12 PFRS / PAS / PSA
 * 13 OECD / foreign persuasive authorities
 * 14 CPA reviewer notes / secondary materials
 */
const MASTER_AUTHORITY_PRECEDENCE = Object.freeze({
  CONSTITUTION: 1,

  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  CMTA: 2,
  LGC: 2,
  REPUBLIC_ACT: 2,
  RA: 2,

  TAX_TREATY: 3,
  TREATY: 3,

  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
  SC: 5,

  CTA_EN_BANC: 6,
  CTA_DIVISION: 7,
  COURT_OF_APPEALS: 7,

  RR: 8,
  REVENUE_REGULATION: 8,

  RMC: 9,
  RMO: 9,
  RAMO: 9,

  BIR_RULING: 10,

  LGU: 11,
  LGU_ISSUANCE: 11,
  BOC_ISSUANCE: 11,
  FIRB_ISSUANCE: 11,
  PEZA_MEMO: 11,
  PEZA_ISSUANCE: 11,
  SEC_GUIDANCE: 11,

  PFRS: 12,
  PAS: 12,
  PSA: 12,

  OECD_GUIDANCE: 13,
  FOREIGN_AUTHORITY: 13,

  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,
  SECONDARY: 14,

  UNKNOWN: 99
});

const PRIMARY_PROVISION_TYPES = Object.freeze([
  "CONSTITUTION",
  "STATUTE",
  "NIRC",
  "TAX_CODE",
  "CMTA",
  "LGC",
  "REPUBLIC_ACT",
  "RA",
  "TAX_TREATY",
  "TREATY",
  "RR",
  "RMC",
  "RMO",
  "RAMO",
  "BIR_RULING",
  "LGU",
  "BOC_ISSUANCE",
  "FIRB_ISSUANCE",
  "PEZA_MEMO",
  "SEC_GUIDANCE",
  "PFRS",
  "PAS",
  "PSA"
]);

const COURT_TYPES = Object.freeze([
  "SUPREME_COURT_EN_BANC",
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "COURT_OF_APPEALS",
  "CTA_DIVISION"
]);

const AUTHORITY_ALIASES = Object.freeze({
  CONSTITUTION: "CONSTITUTION",

  NIRC: "STATUTE",
  TAX_CODE: "STATUTE",
  LAW: "STATUTE",
  STATUTE: "STATUTE",
  REVENUE_CODE: "STATUTE",
  REPUBLIC_ACT: "STATUTE",
  RA: "STATUTE",
  CMTA: "CMTA",
  LGC: "LGC",

  TAX_TREATY: "TREATY",
  TREATY: "TREATY",

  SUPREME_COURT_EN_BANC: "SUPREME_COURT_EN_BANC",
  SUPREME_COURT: "SUPREME_COURT",
  SC: "SUPREME_COURT",
  CASE: "SUPREME_COURT",
  JURISPRUDENCE: "SUPREME_COURT",

  CTA_EN_BANC: "CTA_EN_BANC",
  CTA: "CTA_DIVISION",
  CTA_DIVISION: "CTA_DIVISION",
  COURT_OF_APPEALS: "COURT_OF_APPEALS",

  REVENUE_REGULATION: "RR",
  REVENUE_REGULATIONS: "RR",
  REVENUE_MEMORANDUM_CIRCULAR: "RMC",
  REVENUE_MEMORANDUM_ORDER: "RMO",
  REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
  BIR_RULINGS: "BIR_RULING",

  LGU_ISSUANCE: "LGU",
  BOC: "BOC_ISSUANCE",
  FIRB: "FIRB_ISSUANCE",
  PEZA: "PEZA_MEMO",
  PEZA_ISSUANCE: "PEZA_MEMO",
  SEC: "SEC_GUIDANCE",

  IFRS: "PFRS",
  OECD: "OECD_GUIDANCE",
  FOREIGN: "FOREIGN_AUTHORITY",

  CPA_NOTE: "CPA_NOTES",
  CPA_NOTES: "CPA_NOTES",
  REVIEW: "REVIEW_MATERIALS",
  REVIEWER: "REVIEW_MATERIALS",
  SECONDARY_SOURCE: "SECONDARY"
});

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function trimText(value = "", max = 1000) {
  const text = normalizeText(value);
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max).trim()} ...[trimmed]`;
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
    ZERO_RATING: "VAT_ZERO_RATING",
    VAT_ZERO_RATING: "VAT_ZERO_RATING",
    EXEMPTION: "VAT_EXEMPTION",
    VAT_EXEMPTION: "VAT_EXEMPTION",
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
    DEFINITION: "VAT_LIABILITY",
    CHARACTERIZATION: "TRANSACTION"
  };

  return aliases[raw] || raw || null;
}

function normalizeDimension(value = "") {
  return String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_") || null;
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return AUTHORITY_ALIASES[raw] || raw || null;
}

function normalizeTargetAuthorities(targetAuthorities = null) {
  if (!targetAuthorities) return [];

  if (Array.isArray(targetAuthorities)) {
    return unique(targetAuthorities.map(normalizeAuthority).filter(Boolean));
  }

  if (typeof targetAuthorities === "object") {
    const output = [];

    for (const value of Object.values(targetAuthorities)) {
      for (const item of safeArray(value)) {
        const normalized = normalizeAuthority(item);
        if (normalized) output.push(normalized);
      }
    }

    return unique(output);
  }

  return [];
}

function detectIssueSignals(text = "") {
  const q = lower(text);
  const issues = [];

  const push = (condition, value) => {
    if (condition) issues.push(value);
  };

  push(/\b(vat refund|input vat refund|120\+30|administrative claim|judicial claim|tcc|unutilized input vat|excess input vat|claim for refund)\b/i.test(q), "VAT_REFUND");
  push(/\b(vat liability|output vat|subject to vat|vatable|gross receipts|sale of goods|sale of services|value-added tax)\b/i.test(q), "VAT_LIABILITY");
  push(/\b(zero-rated|zero rated|zero rating|export sales)\b/i.test(q), "VAT_ZERO_RATING");
  push(/\b(vat exempt|vat-exempt|exemption|tax exempt)\b/i.test(q), "VAT_EXEMPTION");
  push(/\b(invoice|receipt|substantiation|documentary|proof|evidence|records|burden of proof)\b/i.test(q), "EVIDENTIARY");
  push(/\b(filing|deadline|protest|appeal|assessment|loa|pan|fan|fdda|prescription|remedy)\b/i.test(q), "PROCEDURAL");
  push(/\b(jurisdiction|jurisdictional|cta|condition precedent)\b/i.test(q), "JURISDICTIONAL");
  push(/\b(withholding|ewt|cwt|fwt|expanded withholding|final withholding)\b/i.test(q), "WITHHOLDING");
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|gross income|taxable income)\b/i.test(q), "INCOME_TAX");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(q), "CONTRACT");
  push(/\b(principal|agent|pass-through|reimbursement|bundled|economic substance|substance over form)\b/i.test(q), "TRANSACTION");
  push(/\b(pfrs|pas|psa|afs|financial statements|recognition|presentation|measurement|audit)\b/i.test(q), "ACCOUNTING");

  return unique(issues);
}

function detectLegalDimensions(text = "") {
  const q = lower(text);
  const dimensions = [];

  const push = (condition, value) => {
    if (condition) dimensions.push(value);
  };

  push(/\b(taxable|liable|subject to|exempt|zero-rated|deductible|output vat|income tax|withholding tax|gross income|gross receipts)\b/i.test(q), "SUBSTANTIVE");
  push(/\b(file|filing|deadline|period|administrative claim|judicial claim|appeal|assessment|loa|pan|fan|return|remedy|protest|prescription)\b/i.test(q), "PROCEDURAL");
  push(/\b(invoice|receipt|substantiation|documentary|proof|evidence|burden of proof|records|supporting documents)\b/i.test(q), "EVIDENTIARY");
  push(/\b(jurisdiction|jurisdictional|cta|condition precedent|120\+30)\b/i.test(q), "JURISDICTIONAL");
  push(/\b(effective|retroactive|prospective|transition|amended|repealed|superseded)\b/i.test(q), "TEMPORAL");
  push(/\b(transaction|actual circumstances|facts|factual|actual facts)\b/i.test(q), "FACTUAL");
  push(/\b(contract|agreement|clause|lease|concession)\b/i.test(q), "CONTRACTUAL");
  push(/\b(economic substance|substance over form|sham|simulation)\b/i.test(q), "ECONOMIC_SUBSTANCE");

  return unique(dimensions.length ? dimensions : ["GENERAL"]);
}

function normalizeIssueClassification(issueClassification = null, question = "", adaptiveContext = {}) {
  const source =
    issueClassification?.orchestrationClassification ||
    issueClassification ||
    adaptiveContext?.issueClassification?.orchestrationClassification ||
    adaptiveContext?.issueClassification ||
    adaptiveContext?.queryIntent?.issueClassification ||
    adaptiveContext?.responsePlan?.issueClassification ||
    {};

  const fallbackIssues = detectIssueSignals(question).map(normalizeIssue).filter(Boolean);
  const fallbackDimensions = detectLegalDimensions(question).map(normalizeDimension).filter(Boolean);

  const primaryIssue =
    normalizeIssue(source.primaryIssue) ||
    normalizeIssue(source.primary_issue) ||
    normalizeIssue(source.issueType) ||
    normalizeIssue(source.issue_type) ||
    fallbackIssues[0] ||
    "GENERAL";

  const subIssues = unique([
    primaryIssue,
    ...safeArray(source.subIssues).map(normalizeIssue),
    ...safeArray(source.subIssue).map(normalizeIssue),
    ...safeArray(source.sub_issues).map(normalizeIssue),
    ...safeArray(source.sub_issue).map(normalizeIssue),
    ...fallbackIssues
  ]).filter(Boolean);

  const legalDimensions = unique([
    ...safeArray(source.legalDimensions).map(normalizeDimension),
    ...safeArray(source.legalDimension).map(normalizeDimension),
    ...safeArray(source.legal_dimensions).map(normalizeDimension),
    ...safeArray(source.legal_dimension).map(normalizeDimension),
    ...fallbackDimensions
  ]).filter(Boolean);

  const targetAuthorities = unique([
    ...normalizeTargetAuthorities(source.targetAuthorities),
    ...normalizeTargetAuthorities(source.target_authorities)
  ]);

  return {
    primaryIssue,
    subIssues,
    legalDimensions,
    retrievalStrategy:
      source.retrievalStrategy ||
      source.retrieval_strategy ||
      "PROVISION_ISSUE_CLASSIFIED_RETRIEVAL",
    targetAuthorities,
    raw: source,
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true
  };
}

function looksLikeProvisionQuestion(question = "") {
  const q = lower(question);

  return (
    /\b(section|sec\.?|article|art\.?|paragraph|para\.?|clause|provision|cite|citation|legal basis|basis|authority)\b/i.test(q) ||
    /\bunder\s+(the\s+)?(nirc|tax code|cmta|lgc|rr|rmc|rmo|ramo|republic act|ra|bir ruling)\b/i.test(q) ||
    /\b(rr|rmc|rmo|ramo)\s*(?:no\.?)?\s*\d+[-/_ ]+\d{2,4}\b/i.test(q) ||
    /\bwhat does\b/i.test(q)
  );
}

function extractProvisionHint(question = "") {
  const text = String(question || "");

  const sectionMatch =
    text.match(/\bsection\s+(\d+[a-zA-Z\-]*(?:\([A-Za-z0-9]+\))*)/i) ||
    text.match(/\bsec\.?\s+(\d+[a-zA-Z\-]*(?:\([A-Za-z0-9]+\))*)/i);

  if (sectionMatch) return `Section ${sectionMatch[1]}`;

  const articleMatch =
    text.match(/\barticle\s+([A-Za-z0-9\-]+)/i) ||
    text.match(/\bart\.?\s+([A-Za-z0-9\-]+)/i);

  if (articleMatch) return `Article ${articleMatch[1]}`;

  const paragraphMatch =
    text.match(/\bparagraph\s+([A-Za-z0-9().\-]+)/i) ||
    text.match(/\bpara\.?\s+([A-Za-z0-9().\-]+)/i);

  if (paragraphMatch) return `Paragraph ${paragraphMatch[1]}`;

  return "";
}

function buildSourceSnippet(doc = {}, maxLen = MAX_EXCERPT_CHARS) {
  return trimText(doc.text || doc.content || doc.excerpt || doc.preview || "", maxLen);
}

function getAuthorityType(doc = {}) {
  const explicit =
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    null;

  if (explicit) return normalizeAuthority(explicit) || String(explicit).toUpperCase();

  return normalizeAuthority(
    getAuthorityTypeForDoc?.(doc) ||
      classifyAuthorityFromDocument({
        fileName: doc.source || doc.originalSource || doc.title || "",
        path: doc.path || doc.source_path || doc.metadata?.path || "",
        text: doc.text || doc.content || doc.excerpt || ""
      }) ||
      "UNKNOWN"
  ) || "UNKNOWN";
}

function getAuthorityLevel(doc = {}) {
  const type = getAuthorityType(doc);

  return (
    Number(
      doc.authorityLevel ??
        doc.authority_level ??
        doc.metadata?.authorityLevel ??
        getAuthorityLevelForDoc?.(doc)
    ) ||
    AUTHORITY_LEVEL[type] ||
    MASTER_AUTHORITY_PRECEDENCE[type] ||
    99
  );
}

function getControllingPrecedence(doc = {}) {
  const type = getAuthorityType(doc);

  return (
    Number(
      doc.controllingPrecedence ??
        doc.controlling_precedence ??
        doc.metadata?.controllingPrecedence ??
        getControllingPrecedenceForDoc?.(doc)
    ) ||
    MASTER_AUTHORITY_PRECEDENCE[type] ||
    99
  );
}

function getSourceTitle(doc = {}) {
  return (
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
    doc.title ||
    "Unknown Source"
  );
}

function getSourcePath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.metadata?.fileName ||
    doc.originalSource ||
    doc.original_source ||
    doc.source ||
    getSourceTitle(doc) ||
    "Unknown Path"
  );
}

function getDocBlob(doc = {}) {
  return lower(
    [
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      doc.normalizedReference,
      doc.normalized_reference,
      ...safeArray(doc.normalizedAliases),
      ...safeArray(doc.normalized_aliases),
      ...safeArray(doc.metadata?.normalizedAliases)
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isCourtAuthority(type = "") {
  return COURT_TYPES.includes(String(type || "").toUpperCase());
}

function isBIRAuthority(type = "") {
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(String(type || "").toUpperCase());
}

function isPrimaryOrControllingAuthority(type = "") {
  return [...PRIMARY_PROVISION_TYPES, ...COURT_TYPES].includes(String(type || "").toUpperCase());
}

function hasIssueOverlap(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return true;
  if (queryIssues.includes("GENERAL") || docIssues.includes("GENERAL")) return true;
  return queryIssues.some((issue) => docIssues.includes(issue));
}

function hasDimensionOverlap(queryDimensions = [], docDimensions = []) {
  if (!queryDimensions.length || queryDimensions.includes("GENERAL")) return true;
  if (!docDimensions.length || docDimensions.includes("GENERAL")) return true;
  return queryDimensions.some((dimension) => docDimensions.includes(dimension));
}

function hasIssueMismatch(issueClassification = {}, doc = {}, question = "") {
  const profile = normalizeIssueClassification(issueClassification, question);
  const docIssues = detectIssueSignals(getDocBlob(doc)).map(normalizeIssue).filter(Boolean);

  if (
    profile.primaryIssue === "VAT_LIABILITY" &&
    docIssues.includes("VAT_REFUND") &&
    !profile.subIssues.includes("VAT_REFUND")
  ) return true;

  if (
    profile.primaryIssue === "VAT_REFUND" &&
    docIssues.includes("VAT_LIABILITY") &&
    !profile.subIssues.includes("VAT_LIABILITY")
  ) return true;

  if (
    profile.primaryIssue === "WITHHOLDING" &&
    (docIssues.includes("VAT_REFUND") || docIssues.includes("VAT_LIABILITY"))
  ) return true;

  if (
    profile.primaryIssue === "INCOME_TAX" &&
    docIssues.includes("VAT_REFUND") &&
    !profile.subIssues.includes("VAT_REFUND")
  ) return true;

  if (
    profile.primaryIssue === "CONTRACT" &&
    docIssues.includes("VAT_REFUND") &&
    !profile.subIssues.includes("VAT_REFUND")
  ) return true;

  return false;
}

function targetAuthorityMatched(profile = {}, doc = {}) {
  const authorityType = getAuthorityType(doc);
  return safeArray(profile.targetAuthorities).includes(authorityType);
}

function buildStructuredIssueClassificationMatch(question = "", doc = {}, issueClassification = null) {
  const profile = normalizeIssueClassification(issueClassification, question);
  const docIssues = detectIssueSignals(getDocBlob(doc)).map(normalizeIssue).filter(Boolean);
  const docDimensions = detectLegalDimensions(getDocBlob(doc)).map(normalizeDimension).filter(Boolean);
  const queryIssues = safeArray(profile.subIssues).map(normalizeIssue).filter(Boolean);
  const queryDimensions = safeArray(profile.legalDimensions).map(normalizeDimension).filter(Boolean);

  const issueMismatch = hasIssueMismatch(profile, doc, question);
  const issueOverlap = hasIssueOverlap(queryIssues, docIssues);
  const dimensionOverlap = hasDimensionOverlap(queryDimensions, docDimensions);
  const targetAuthorityMatch = targetAuthorityMatched(profile, doc);

  const matched =
    !issueMismatch &&
    (
      targetAuthorityMatch ||
      (issueOverlap && dimensionOverlap) ||
      !docIssues.length
    );

  return {
    matched,
    compatible: matched,
    issueOverlap,
    dimensionOverlap,
    issueMismatch,
    targetAuthorityMatch,
    primaryIssue: profile.primaryIssue,
    subIssues: profile.subIssues,
    legalDimensions: profile.legalDimensions,
    retrievalStrategy: profile.retrievalStrategy,
    targetAuthorities: profile.targetAuthorities,
    docIssues,
    docDimensions,
    docAuthorityType: getAuthorityType(doc),
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true
  };
}

function buildProvisionMatchBonus(question = "", doc = {}) {
  const hint = extractProvisionHint(question);
  const rawText = getDocBlob(doc);

  let bonus = 0;

  if (hint && rawText.includes(lower(hint))) bonus += 80;

  const citationIntent = normalizeLegalReference(question);

  if (citationIntent?.normalized) {
    const normalizedNeedle = lower(citationIntent.normalized);

    if (rawText.includes(normalizedNeedle)) bonus += 120;

    const aliasHit = safeArray(citationIntent.aliases).some((alias) =>
      rawText.includes(lower(alias))
    );

    if (aliasHit) bonus += 70;
  }

  if (/\b(section|sec\.?|article|art\.?|paragraph|clause)\b/i.test(question)) bonus += 12;

  return bonus;
}

function buildIssueClassificationBonus(question = "", doc = {}, issueClassification = null) {
  const profile = normalizeIssueClassification(issueClassification, question);
  const match = buildStructuredIssueClassificationMatch(question, doc, profile);
  const authorityType = getAuthorityType(doc);

  let bonus = 0;

  if (match.issueMismatch) bonus -= 150;
  if (match.issueOverlap) bonus += 75;
  if (match.dimensionOverlap) bonus += 20;
  if (match.targetAuthorityMatch) bonus += 50;
  if (PRIMARY_PROVISION_TYPES.includes(authorityType)) bonus += 25;
  if (COURT_TYPES.includes(authorityType)) bonus += 20;

  return bonus;
}

function uniqueDocs(docs = []) {
  const seen = new Set();
  const output = [];

  for (const doc of docs || []) {
    const key =
      doc.id ||
      doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.normalizedReference ||
      getSourcePath(doc) ||
      getSourceTitle(doc);

    if (!key || seen.has(key)) continue;

    seen.add(key);
    output.push(doc);
  }

  return output;
}

function safeSupersessionActiveDocs(results = []) {
  try {
    const supersessionResult = applySupersessionFilter(results || []);
    return supersessionResult?.activeDocs?.length > 0
      ? supersessionResult.activeDocs
      : results || [];
  } catch {
    return results || [];
  }
}

function rankProvisionDocs(results = [], question = "", options = {}) {
  const {
    suppressIssueMismatch = true,
    issueClassification = null
  } = options;

  const profile = normalizeIssueClassification(issueClassification, question);
  const activeDocs = safeSupersessionActiveDocs(results || []);

  return uniqueDocs(activeDocs)
    .filter((doc) => {
      const type = getAuthorityType(doc);
      if (!isPrimaryOrControllingAuthority(type)) return false;

      const match = buildStructuredIssueClassificationMatch(question, doc, profile);

      if (suppressIssueMismatch && match.issueMismatch) return false;

      return match.matched || buildProvisionMatchBonus(question, doc) > 0;
    })
    .map((doc) => {
      const authorityType = getAuthorityType(doc);
      const rawScore = Number(doc.finalScore ?? doc.final_score ?? doc.retrievalScore ?? doc.score ?? 0);
      const provisionBonus = buildProvisionMatchBonus(question, doc);
      const issueBonus = buildIssueClassificationBonus(question, doc, profile);
      const issueClassificationMatch = buildStructuredIssueClassificationMatch(question, doc, profile);
      const primaryBonus = isPrimaryOrControllingAuthority(authorityType) ? 20 : 0;
      const precedence = getControllingPrecedence(doc);
      const hierarchyBonus = Math.max(0, 120 - precedence * 5);

      const compositeScore =
        rawScore +
        provisionBonus +
        issueBonus +
        primaryBonus +
        hierarchyBonus;

      return {
        ...doc,
        authorityType,
        authorityLevel: getAuthorityLevel(doc),
        controllingPrecedence: precedence,
        issueClassificationMatch: {
          ...issueClassificationMatch,
          profile,
          provisionBonus,
          issueBonus
        },
        targetAuthorityMatch: issueClassificationMatch.targetAuthorityMatch,
        issueMismatch: issueClassificationMatch.issueMismatch,
        provisionCompositeScore: compositeScore,
        masterPromptAuthorityHierarchyApplied: true,
        courtAuthorityNotSubordinatedToBIRIssuances: true
      };
    })
    .filter((doc) => {
      const match = doc.issueClassificationMatch || {};
      const bonus = match.issueBonus || 0;
      const provisionBonus = match.provisionBonus || 0;

      if (match.issueMismatch) return false;

      return match.matched || bonus > 0 || provisionBonus > 0;
    })
    .sort((a, b) => {
      const override = isGenuineConflict(a, b) ? resolveCourtOverride(a, b) : null;

      if (override?.overrideApplies) {
        if (override.winningSource === a) return -1;
        if (override.winningSource === b) return 1;
      }

      const targetDiff = Number(b.targetAuthorityMatch === true) - Number(a.targetAuthorityMatch === true);
      if (targetDiff !== 0) return targetDiff;

      const aProvisionBonus = a.issueClassificationMatch?.provisionBonus || 0;
      const bProvisionBonus = b.issueClassificationMatch?.provisionBonus || 0;
      if (bProvisionBonus !== aProvisionBonus) return bProvisionBonus - aProvisionBonus;

      const aPrecedence = getControllingPrecedence(a);
      const bPrecedence = getControllingPrecedence(b);
      if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

      return Number(b.provisionCompositeScore || 0) - Number(a.provisionCompositeScore || 0);
    });
}

function buildContextBlock(docs = []) {
  return trimText(
    docs
      .map((doc, index) => {
        const authorityType = getAuthorityType(doc);
        const authorityLevel = getAuthorityLevel(doc);
        const authorityLabel = AUTHORITY_LABEL[authorityType] || authorityType;

        return [
          `SOURCE ${index + 1}`,
          `Title: ${getSourceTitle(doc)}`,
          `Path: ${getSourcePath(doc)}`,
          `Authority Type: ${authorityType}`,
          `Authority Label: ${authorityLabel}`,
          `Authority Level: ${authorityLevel}`,
          `Controlling Precedence: ${getControllingPrecedence(doc)}`,
          `Target Authority Match: ${doc.targetAuthorityMatch ? "YES" : "NO"}`,
          `Issue Classification Match: ${JSON.stringify(doc.issueClassificationMatch || {})}`,
          "Excerpt:",
          buildSourceSnippet(doc) || "[No excerpt available]"
        ].join("\n");
      })
      .join("\n\n--------------------\n\n"),
    MAX_CONTEXT_CHARS
  );
}

function sanitizeConflictReview(item = {}) {
  return {
    conflict: Boolean(item.conflict),
    apparentConflict: Boolean(item.apparentConflict),
    conflictType: item.conflictType || null,
    doctrinalConflict: Boolean(item.doctrinalConflict),
    hierarchyConflict: Boolean(item.hierarchyConflict),
    sameExactIssue: item.sameExactIssue === true,
    sameLegalDimension: item.sameLegalDimension === true,
    oppositeHoldingOrRule: item.oppositeHoldingOrRule === true,
    exactIssue: trimText(item.exactIssue, 300),
    exactLegalDimension: trimText(item.exactLegalDimension, 300),
    distinctionType: trimText(item.distinctionType, 300),
    hierarchyAnalysis: trimText(item.hierarchyAnalysis, 700),
    conflictResolutionBasis: trimText(item.conflictResolutionBasis || item.resolutionBasis || item.reason, 700),
    conflictLabelMayBeDisplayed:
      item.sameExactIssue === true &&
      item.sameLegalDimension === true &&
      item.oppositeHoldingOrRule === true &&
      Boolean(item.hierarchyAnalysis) &&
      Boolean(item.conflictResolutionBasis || item.resolutionBasis)
  };
}

function buildConflictContext(docs = []) {
  const conflicts = [];

  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      try {
        const analysis = analyzeConflictPair(docs[i], docs[j]);

        if (analysis?.conflict || analysis?.apparentConflict) {
          conflicts.push(sanitizeConflictReview(analysis));
        }
      } catch (error) {
        conflicts.push({
          conflict: false,
          apparentConflict: false,
          error: trimText(error.message, 300)
        });
      }
    }
  }

  if (!conflicts.length) {
    return {
      conflict: false,
      reviews: [],
      text: "No direct doctrinal or hierarchy conflict detected from the retrieved provision sources."
    };
  }

  const reviews = conflicts.slice(0, 3);

  return {
    conflict: reviews.some((item) => item.conflict && item.conflictLabelMayBeDisplayed),
    reviews,
    text: reviews
      .map((item, index) =>
        [
          `CONFLICT REVIEW ${index + 1}`,
          `Conflict: ${item.conflict && item.conflictLabelMayBeDisplayed ? "YES" : "NO"}`,
          `Conflict Type: ${item.conflictType || "N/A"}`,
          `Doctrinal Conflict: ${item.doctrinalConflict ? "YES" : "NO"}`,
          `Hierarchy Conflict: ${item.hierarchyConflict ? "YES" : "NO"}`,
          `Apparent Conflict Only: ${item.apparentConflict ? "YES" : "NO"}`,
          `Same Exact Issue: ${item.sameExactIssue ? "YES" : "NO"}`,
          `Same Legal Dimension: ${item.sameLegalDimension ? "YES" : "NO"}`,
          `Opposite Holding/Rule: ${item.oppositeHoldingOrRule ? "YES" : "NO"}`,
          `Exact Issue: ${item.exactIssue || "Not determined"}`,
          `Exact Legal Dimension: ${item.exactLegalDimension || "Not determined"}`,
          `Distinction Type: ${item.distinctionType || "Not determined"}`,
          `Hierarchy Analysis: ${item.hierarchyAnalysis || "Not determined"}`,
          `Resolution Basis: ${item.conflictResolutionBasis || "Not determined"}`
        ].join("\n")
      )
      .join("\n\n")
  };
}

function buildSourcesUsed(topDocs = []) {
  return topDocs.map((doc) => ({
    title: getSourceTitle(doc),
    source: getSourcePath(doc),
    authorityType: getAuthorityType(doc),
    authorityLevel: getAuthorityLevel(doc),
    controllingPrecedence: getControllingPrecedence(doc),
    issueClassificationMatch: doc.issueClassificationMatch || null,
    targetAuthorityMatch: doc.targetAuthorityMatch === true,
    excerpt: buildSourceSnippet(doc, 500),
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    rawFullTextHidden: true
  }));
}

function buildProvisionPacket({
  question = "",
  ranked = [],
  issueClassification = null,
  responseMode = "TECHNICAL",
  adaptiveContext = {}
} = {}) {
  const topDocs = ranked.slice(0, MAX_PROVISION_DOCS);
  const provisionHint = extractProvisionHint(question);
  const conflictContext = buildConflictContext(topDocs);

  return {
    handled: topDocs.length > 0,
    answer: "",
    topDocs,
    sourcesUsed: buildSourcesUsed(topDocs),
    responseMode,
    adaptiveContext,
    issueClassification,
    engineVersion: ENGINE_VERSION,
    provisionCitationMetadata: {
      provisionHint,
      rankedCount: ranked.length,
      topDocCount: topDocs.length,
      contextBlock: buildContextBlock(topDocs),
      conflictContext: conflictContext.text,
      conflictReview: conflictContext,
      hierarchyAware: true,
      conflictAware: true,
      supersessionAware: true,
      issueClassificationAware: true,
      exactProvisionAware: true,
      targetAuthorityAware: true,
      structuredIssueClassificationMatch: true,
      contextOrchestrationCompatible: true,
      rendererCompatible: true,
      plannerCompatible: true,
      directOpenAICallRemoved: true,
      noOpenAICalls: true,
      noPromptAssembly: true,
      masterPromptAuthorityHierarchyApplied: true,
      courtAuthorityNotSubordinatedToBIRIssuances: true
    }
  };
}

export async function maybeGenerateProvisionCitationAnswer({
  question = "",
  retrievedResults = [],
  responseMode = "TECHNICAL",
  adaptiveContext = {},
  issueClassification = null
} = {}) {
  try {
    if (!looksLikeProvisionQuestion(question)) {
      return {
        handled: false,
        engineVersion: ENGINE_VERSION,
        noOpenAICalls: true
      };
    }

    const effectiveIssueClassification = normalizeIssueClassification(
      issueClassification,
      question,
      adaptiveContext
    );

    const ranked = rankProvisionDocs(retrievedResults || [], question, {
      issueClassification: effectiveIssueClassification,
      suppressIssueMismatch: true
    });

    return buildProvisionPacket({
      question,
      ranked,
      issueClassification: effectiveIssueClassification,
      responseMode,
      adaptiveContext
    });
  } catch (error) {
    console.error("maybeGenerateProvisionCitationAnswer error:", error.message);

    return {
      handled: false,
      error: error.message,
      engineVersion: ENGINE_VERSION,
      noOpenAICalls: true
    };
  }
}

export function provisionCitationHealthCheck() {
  return {
    ok: true,
    engine: "TINA_PROVISION_CITATION_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    authorityEngineCompatible: true,
    conflictEngineCompatible: true,
    supersessionCompatible: true,
    issueClassificationCompatible: true,
    targetAuthorityAware: true,
    structuredIssueClassificationMatch: true,
    contextOrchestrationCompatible: true,
    plannerCompatible: true,
    rendererCompatible: true,
    finalAnswerComplianceCompatible: true,
    directOpenAICallRemoved: true,
    noOpenAICalls: true,
    noRetrieval: true,
    noRendering: true,
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true
  };
}

export {
  ENGINE_VERSION,
  looksLikeProvisionQuestion,
  extractProvisionHint,
  normalizeIssueClassification,
  buildStructuredIssueClassificationMatch,
  rankProvisionDocs,
  buildContextBlock,
  buildConflictContext,
  buildSourcesUsed
};

export default {
  maybeGenerateProvisionCitationAnswer,
  provisionCitationHealthCheck,
  looksLikeProvisionQuestion,
  extractProvisionHint,
  normalizeIssueClassification,
  buildStructuredIssueClassificationMatch,
  rankProvisionDocs,
  buildContextBlock,
  buildConflictContext,
  buildSourcesUsed
};
