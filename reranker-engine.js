// FILE: reranker-engine.js
"use strict";

/**
 * TINA Enterprise Reranker Engine
 * Version: 4.1.0
 *
 * Integrated with:
 * - main-tax-engine-classification.js
 * - issue-classification-engine.js
 * - retrieval-engine.js
 * - authority-engine.js
 * - supersession-engine.js
 * - query-intent-engine.js
 */

import {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import { applySupersessionFilter } from "./supersession-engine.js";
import { analyzeQueryIntent } from "./query-intent-engine.js";

const ENGINE_VERSION = "4.1.0";
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

const DOMAIN_AUTHORITY_PROFILE = Object.freeze({
  VAT: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
  CIT: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
  IIT: ["STATUTE", "RR", "RMC"],
  WHT: ["STATUTE", "RR", "RMC", "BIR_RULING"],
  EST: ["STATUTE", "RR", "RMC"],
  PCT: ["STATUTE", "RR", "RMC"],
  EXC: ["STATUTE", "RR", "RMC"],
  PRE: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR", "RMC"],
  DIS: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR"],
  LGT: ["STATUTE", "SUPREME_COURT", "LGU"],
  CUS: ["STATUTE", "BOC_ISSUANCE", "SUPREME_COURT", "CTA_EN_BANC"],
  SPC: ["RR", "STATUTE", "RMC", "OECD_GUIDANCE"],
  CON: ["CONSTITUTION", "SUPREME_COURT"]
});

const ISSUE_AUTHORITY_PROFILE = Object.freeze({
  VAT_LIABILITY: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
  VAT_REFUND: ["STATUTE", "RR", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],
  WITHHOLDING: ["STATUTE", "RR", "RMC", "BIR_RULING"],
  INCOME_TAX: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
  PROCEDURAL: ["STATUTE", "RR", "RMC", "RMO", "SUPREME_COURT"],
  EVIDENTIARY: ["STATUTE", "RR", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],
  JURISDICTIONAL: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC"],
  CASE_LAW: ["SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"],
  ISSUANCE: ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"],
  CONTRACT: ["STATUTE", "SUPREME_COURT", "SECONDARY"],
  TRANSACTION: ["STATUTE", "RR", "SUPREME_COURT", "SECONDARY"],
  ECONOMIC_SUBSTANCE: ["STATUTE", "SUPREME_COURT", "RR"],
  PRINCIPAL_AGENT: ["STATUTE", "RR", "PFRS", "SECONDARY"],
  PASS_THROUGH: ["STATUTE", "RR", "RMC", "PFRS", "SECONDARY"],
  REIMBURSEMENT: ["STATUTE", "RR", "RMC", "PFRS", "SECONDARY"],
  BUNDLED_TRANSACTION: ["STATUTE", "RR", "PFRS", "SECONDARY"],
  AUDIT: ["PFRS", "PSA", "SECONDARY"],
  ACCOUNTING: ["PFRS", "PAS", "SECONDARY"],
  PFRS: ["PFRS", "PAS", "SECONDARY"],
  CONFLICT_ANALYSIS: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
  DOCTRINE: ["SUPREME_COURT", "STATUTE", "RR"],
  GENERAL: ["STATUTE", "RR", "SUPREME_COURT", "RMC"]
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

function arrayify(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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

function detectIssueTypes(text = "") {
  const value = lower(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|unutilized input vat|excess input vat)\b/i.test(value), ISSUE_TYPE.VAT_REFUND);
  push(/\b(vat liability|output vat|subject to vat|vatable|gross receipts|sale of goods|sale of services|define vat|what is vat|value[- ]added tax)\b/i.test(value), ISSUE_TYPE.VAT_LIABILITY);
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

function normalizeIssue(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!raw) return null;

  const aliases = {
    VAT: ISSUE_TYPE.VAT_LIABILITY,
    OUTPUT_VAT: ISSUE_TYPE.VAT_LIABILITY,
    OUTPUT_TAX: ISSUE_TYPE.VAT_LIABILITY,
    INPUT_VAT: ISSUE_TYPE.VAT_REFUND,
    INPUT_VAT_REFUND: ISSUE_TYPE.VAT_REFUND,
    VAT_REFUNDS: ISSUE_TYPE.VAT_REFUND,
    REFUND: ISSUE_TYPE.VAT_REFUND,
    TAX_REFUND: ISSUE_TYPE.VAT_REFUND,
    REMEDIES: ISSUE_TYPE.PROCEDURAL,
    PROCEDURE: ISSUE_TYPE.PROCEDURAL,
    SUBSTANTIATION: ISSUE_TYPE.EVIDENTIARY,
    PROOF: ISSUE_TYPE.EVIDENTIARY,
    EWT: ISSUE_TYPE.WITHHOLDING,
    CWT: ISSUE_TYPE.WITHHOLDING,
    FWT: ISSUE_TYPE.WITHHOLDING,
    WHT: ISSUE_TYPE.WITHHOLDING,
    WITHHOLDING_TAX: ISSUE_TYPE.WITHHOLDING,
    CIT: ISSUE_TYPE.INCOME_TAX,
    IIT: ISSUE_TYPE.INCOME_TAX,
    RCIT: ISSUE_TYPE.INCOME_TAX,
    MCIT: ISSUE_TYPE.INCOME_TAX,
    NOLCO: ISSUE_TYPE.INCOME_TAX,
    CASE: ISSUE_TYPE.CASE_LAW,
    JURISPRUDENCE: ISSUE_TYPE.CASE_LAW,
    REVENUE_REGULATION: ISSUE_TYPE.ISSUANCE,
    REVENUE_MEMORANDUM_CIRCULAR: ISSUE_TYPE.ISSUANCE,
    AGREEMENT: ISSUE_TYPE.CONTRACT,
    PRINCIPAL_VS_AGENT: ISSUE_TYPE.PRINCIPAL_AGENT,
    GROSS_NET: ISSUE_TYPE.PRINCIPAL_AGENT,
    GROSS_OR_NET: ISSUE_TYPE.PRINCIPAL_AGENT,
    PASS_THROUGH_CHARGES: ISSUE_TYPE.PASS_THROUGH,
    REIMBURSABLE: ISSUE_TYPE.REIMBURSEMENT,
    PACKAGE: ISSUE_TYPE.BUNDLED_TRANSACTION,
    FINANCIAL_REPORTING: ISSUE_TYPE.PFRS
  };

  if (aliases[raw]) return aliases[raw];
  if (Object.values(ISSUE_TYPE).includes(raw)) return raw;

  return raw;
}

function normalizeDomain(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!raw) return null;

  const aliases = {
    VALUE_ADDED_TAX: "VAT",
    CORPORATE_INCOME_TAX: "CIT",
    INCOME_TAX: "CIT",
    INDIVIDUAL_INCOME_TAX: "IIT",
    WITHHOLDING: "WHT",
    WITHHOLDING_TAX: "WHT",
    ESTATE_TAX: "EST",
    DONOR_TAX: "EST",
    PERCENTAGE_TAX: "PCT",
    EXCISE_TAX: "EXC",
    PRESCRIPTION: "PRE",
    ASSESSMENT: "PRE",
    DISPUTE: "DIS",
    DISPUTE_RESOLUTION: "DIS",
    LOCAL_TAX: "LGT",
    CUSTOMS: "CUS",
    CUSTOMS_TARIFF: "CUS",
    TRANSFER_PRICING: "SPC",
    SPECIAL_TAX_REGIMES: "SPC",
    CONSTITUTIONAL_TAX: "CON"
  };

  return aliases[raw] || raw;
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!raw) return null;

  const aliases = {
    CONSTITUTION: "CONSTITUTION",
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    STATUTORY: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    RA: "STATUTE",
    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    SUPREME_COURT_DECISION: "SUPREME_COURT",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
    CTA_CASE: "CTA_DIVISION",
    CTA_EN_BANC_DECISION: "CTA_EN_BANC",
    BIR_RULING: "BIR_RULING",
    LGU_ISSUANCE: "LGU",
    BOC_ISSUANCE: "BOC_ISSUANCE",
    TAX_TREATY: "TAX_TREATY",
    OECD_GUIDANCE: "OECD_GUIDANCE",
    PFRS_FOR_SMES: "PFRS",
    IFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",
    SECONDARY_SOURCE: "SECONDARY"
  };

  return aliases[raw] || raw;
}

function extractIssueClassification({
  query = "",
  queryIntent = {},
  adaptiveContext = {},
  issueClassification = null
} = {}) {
  const candidate =
    issueClassification ||
    queryIntent?.issueClassification ||
    queryIntent?.classification ||
    queryIntent?.taxIssueClassification ||
    queryIntent?.issue ||
    adaptiveContext?.issueClassification ||
    adaptiveContext?.classification ||
    adaptiveContext?.responsePlan?.issueClassification ||
    {};

  const taxDomainClassification =
    candidate.taxDomainClassification ||
    candidate.tax_domain_classification ||
    queryIntent?.taxDomainClassification ||
    adaptiveContext?.taxDomainClassification ||
    adaptiveContext?.responsePlan?.taxDomainClassification ||
    null;

  const detected = detectIssueTypes(query);

  const primaryDomain =
    normalizeDomain(candidate.primaryDomain) ||
    normalizeDomain(candidate.primary_domain) ||
    normalizeDomain(taxDomainClassification?.primaryDomain) ||
    normalizeDomain(taxDomainClassification?.primary_domain) ||
    null;

  const primaryIssue =
    normalizeIssue(candidate.primaryIssue) ||
    normalizeIssue(candidate.primary_issue) ||
    normalizeIssue(candidate.issueType) ||
    normalizeIssue(candidate.issue_type) ||
    normalizeIssue(taxDomainClassification?.primaryIssue) ||
    normalizeIssue(taxDomainClassification?.primary_issue) ||
    normalizeIssue(taxDomainClassification?.primarySubIssue) ||
    normalizeIssue(taxDomainClassification?.primary_sub_issue) ||
    normalizeIssue(queryIntent?.primaryIssue) ||
    normalizeIssue(adaptiveContext?.primaryIssue) ||
    detected[0] ||
    ISSUE_TYPE.GENERAL;

  const subIssues = unique([
    primaryIssue,
    normalizeIssue(candidate.subIssue),
    normalizeIssue(candidate.sub_issue),
    normalizeIssue(taxDomainClassification?.primarySubIssue),
    normalizeIssue(taxDomainClassification?.primary_sub_issue),
    ...arrayify(candidate.subIssues).map(normalizeIssue),
    ...arrayify(candidate.sub_issues).map(normalizeIssue),
    ...arrayify(taxDomainClassification?.subIssues).map(normalizeIssue),
    ...arrayify(taxDomainClassification?.sub_issues).map(normalizeIssue),
    ...arrayify(queryIntent?.subIssue).map(normalizeIssue),
    ...arrayify(queryIntent?.subIssues).map(normalizeIssue),
    ...detected
  ]).filter(Boolean);

  const targetAuthorities = unique([
    ...arrayify(candidate.targetAuthorities).map(normalizeAuthority),
    ...arrayify(candidate.target_authorities).map(normalizeAuthority),
    ...arrayify(taxDomainClassification?.targetAuthorities).map(normalizeAuthority),
    ...arrayify(taxDomainClassification?.target_authorities).map(normalizeAuthority),
    ...arrayify(queryIntent?.targetAuthorities).map(normalizeAuthority),
    ...arrayify(adaptiveContext?.targetAuthorities).map(normalizeAuthority),
    ...(primaryDomain && DOMAIN_AUTHORITY_PROFILE[primaryDomain]
      ? DOMAIN_AUTHORITY_PROFILE[primaryDomain]
      : []),
    ...(ISSUE_AUTHORITY_PROFILE[primaryIssue] || [])
  ]).filter(Boolean);

  const legalDimensions = unique([
    ...arrayify(candidate.legalDimensions).map((item) => String(item || "").toUpperCase()),
    ...arrayify(candidate.legal_dimension).map((item) => String(item || "").toUpperCase()),
    ...arrayify(taxDomainClassification?.legalDimensions).map((item) => String(item || "").toUpperCase()),
    ...arrayify(queryIntent?.legalDimensions).map((item) => String(item || "").toUpperCase())
  ]).filter(Boolean);

  const retrievalStrategy =
    candidate.retrievalStrategy ||
    candidate.retrieval_strategy ||
    taxDomainClassification?.retrievalStrategy ||
    taxDomainClassification?.retrieval_strategy ||
    queryIntent?.retrievalStrategy ||
    adaptiveContext?.retrievalStrategy ||
    "ISSUE_AUTHORITY_RERANK";

  const boostTerms = unique([
    primaryDomain,
    primaryIssue,
    ...subIssues,
    ...arrayify(candidate.keyTerms),
    ...arrayify(candidate.key_terms),
    ...arrayify(taxDomainClassification?.retrievalHints?.boostTerms),
    ...arrayify(taxDomainClassification?.retrieval_hints?.boost_terms)
  ]).filter(Boolean);

  return {
    ...candidate,
    primaryDomain,
    primaryIssue,
    subIssue:
      candidate.subIssue ||
      candidate.sub_issue ||
      taxDomainClassification?.primarySubIssue ||
      taxDomainClassification?.primary_sub_issue ||
      subIssues[0] ||
      primaryIssue,
    subIssues: unique(subIssues.length ? subIssues : [primaryIssue]),
    legalDimensions,
    retrievalStrategy,
    targetAuthorities,
    taxDomainClassification,
    boostTerms
  };
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

  if (
    queryIssues.includes(ISSUE_TYPE.WITHHOLDING) &&
    (docIssues.includes(ISSUE_TYPE.VAT_REFUND) || docIssues.includes(ISSUE_TYPE.VAT_LIABILITY)) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY)
  ) {
    return true;
  }

  if (
    queryIssues.includes(ISSUE_TYPE.INCOME_TAX) &&
    docIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_REFUND)
  ) {
    return true;
  }

  if (
    queryIssues.includes(ISSUE_TYPE.CONTRACT) &&
    docIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_REFUND)
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
    NIRC: 98,
    TAX_CODE: 98,
    SUPREME_COURT: 97,
    RR: 95,
    TAX_TREATY: 90,
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
    BOC_ISSUANCE: 44,
    OECD_GUIDANCE: 20,
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

function domainBonus(issueClassification = {}, doc = {}) {
  const primaryDomain = normalizeDomain(issueClassification.primaryDomain);
  if (!primaryDomain) return 0;

  const authorityType = getAuthorityTypeForDoc(doc);
  const text = lower(docText(doc));
  let bonus = 0;

  if (DOMAIN_AUTHORITY_PROFILE[primaryDomain]?.includes(authorityType)) bonus += 45;

  const domainTerms = {
    VAT: ["vat", "value-added tax", "output vat", "input vat"],
    CIT: ["corporate income tax", "income tax", "rcit", "mcit", "nolco"],
    IIT: ["individual income tax", "compensation", "self-employed"],
    WHT: ["withholding", "ewt", "cwt", "fwt"],
    EST: ["estate tax", "donor tax", "donation"],
    PCT: ["percentage tax"],
    EXC: ["excise tax"],
    PRE: ["prescription", "assessment", "loa", "pan", "fan"],
    DIS: ["protest", "appeal", "cta", "dispute"],
    LGT: ["local business tax", "real property tax", "lgu"],
    CUS: ["customs", "tariff", "import duty"],
    SPC: ["transfer pricing", "peza", "create incentives"],
    CON: ["constitution", "due process", "equal protection"]
  };

  for (const term of domainTerms[primaryDomain] || []) {
    if (text.includes(term)) bonus += 12;
  }

  return bonus;
}

function classifiedIssueBonus(issueClassification = {}, doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);
  const docIssues = detectIssueTypes(docText(doc));
  const primaryIssue = issueClassification.primaryIssue || ISSUE_TYPE.GENERAL;
  const classifiedIssues = unique([primaryIssue, ...(issueClassification.subIssues || [])]);
  const targetAuthorities = issueClassification.targetAuthorities || [];

  let bonus = 0;

  if (targetAuthorities.includes(authorityType)) bonus += 75;
  if (docIssues.includes(primaryIssue)) bonus += 80;

  const subIssueHits = classifiedIssues.filter((issue) => docIssues.includes(issue)).length;
  bonus += subIssueHits * 25;

  if (issueOverlap(classifiedIssues, docIssues)) bonus += 35;
  if (issueMismatch(classifiedIssues, docIssues)) bonus -= 140;

  bonus += domainBonus(issueClassification, doc);

  const text = lower(docText(doc));
  for (const term of arrayify(issueClassification.boostTerms)) {
    const normalized = lower(String(term).replace(/_/g, " "));
    if (normalized.length >= 3 && text.includes(normalized)) bonus += 8;
  }

  return bonus;
}

function classifiedIssuePenalty(issueClassification = {}, doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);
  const docIssues = detectIssueTypes(docText(doc));
  const primaryIssue = issueClassification.primaryIssue || ISSUE_TYPE.GENERAL;
  const classifiedIssues = unique([primaryIssue, ...(issueClassification.subIssues || [])]);
  const targetAuthorities = issueClassification.targetAuthorities || [];

  let penalty = 0;

  if (issueMismatch(classifiedIssues, docIssues)) penalty += 160;

  if (
    primaryIssue !== ISSUE_TYPE.GENERAL &&
    !issueOverlap(classifiedIssues, docIssues) &&
    ["SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(authorityType)
  ) {
    penalty += 90;
  }

  if (
    targetAuthorities.length &&
    !targetAuthorities.includes(authorityType) &&
    ["SECONDARY", "UNKNOWN", "CTA_DIVISION", "COURT_OF_APPEALS"].includes(authorityType)
  ) {
    penalty += 35;
  }

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
    if (haystack.includes(normalizedRef)) bonus += 140;
  }

  return bonus;
}

function issueBonus(query = "", doc = {}) {
  const queryIssues = detectIssueTypes(query);
  const docIssues = detectIssueTypes(docText(doc));

  if (issueMismatch(queryIssues, docIssues)) return -100;
  if (issueOverlap(queryIssues, docIssues)) return 45;

  return 0;
}

function controllingBonus(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);
  const level = getAuthorityLevelForDoc(doc);
  const precedence = getControllingPrecedenceForDoc(doc);

  let bonus = 0;

  if (["CONSTITUTION", "STATUTE", "RR", "SUPREME_COURT"].includes(type)) bonus += 55;
  else if (["RMC", "RMO", "RAMO"].includes(type)) bonus += 28;
  else if (type === "BIR_RULING") bonus += 16;
  else if (["CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(type)) bonus += 10;
  else if (["PFRS", "PAS", "PSA"].includes(type)) bonus += 18;

  if (level <= 3) bonus += 35;
  else if (level <= 8) bonus += 22;
  else if (level <= 11) bonus += 8;

  if (precedence <= 5) bonus += 25;
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

  if (mode === RESPONSE_MODE.AUDIT && /\bpfrs\b|\bpas\b|\bfinancial statements\b|\bafs\b|\baudit\b/i.test(text)) bonus += 45;
  if (mode === RESPONSE_MODE.CONTRACT && /\bcontract\b|\bagreement\b|\bclause\b|\blease\b|\bconcession\b/i.test(text)) bonus += 48;
  if (mode === RESPONSE_MODE.TRANSACTION && /\bprincipal\b|\bagent\b|\bpass-through\b|\breimbursement\b|\bgross\b|\bnet\b|\bbundled\b/i.test(text)) bonus += 50;
  if (mode === RESPONSE_MODE.EVIDENCE_HEAVY && /\binvoice\b|\breceipt\b|\bsubstantiation\b|\bevidence\b|\bproof\b/i.test(text)) bonus += 50;
  if (mode === RESPONSE_MODE.TECHNICAL && authorityType === "SUPREME_COURT") bonus += 42;
  if (mode === RESPONSE_MODE.LITIGATION && authorityType === "SUPREME_COURT") bonus += 58;

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
  return isSupersededDoc(doc) ? 175 : 0;
}

function weakCasePenalty(query = "", doc = {}, issueClassification = {}) {
  const queryIssues = unique([
    ...detectIssueTypes(query),
    issueClassification.primaryIssue,
    ...(issueClassification.subIssues || [])
  ]).filter(Boolean);

  const text = lower(docText(doc));
  const authorityType = getAuthorityTypeForDoc(doc);

  let penalty = 0;

  if (queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY) && /\brefund\b|\binput vat refund\b/.test(text)) penalty += 75;
  if (queryIssues.includes(ISSUE_TYPE.VAT_REFUND) && /\boutput vat\b|\bvat liability\b/.test(text)) penalty += 75;

  if (
    queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY) &&
    ["SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"].includes(authorityType) &&
    /\brefund\b|\bclaim for refund\b|\bunutilized input vat\b|\btcc\b/.test(text)
  ) {
    penalty += 100;
  }

  if (
    queryIssues.includes(ISSUE_TYPE.WITHHOLDING) &&
    ["SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"].includes(authorityType) &&
    /\bvat refund\b|\binput vat\b/.test(text)
  ) {
    penalty += 90;
  }

  return penalty;
}

function computeTinaRerankScore({
  query = "",
  doc = {},
  responseMode = RESPONSE_MODE.STANDARD,
  issueClassification = null
}) {
  const classification =
    issueClassification ||
    extractIssueClassification({
      query,
      queryIntent: {},
      adaptiveContext: {}
    });

  const score =
    semanticScore(doc) * 0.20 +
    authorityWeight(doc) * 0.25 +
    exactReferenceBonus(query, doc) * 0.18 +
    issueBonus(query, doc) * 0.08 +
    classifiedIssueBonus(classification, doc) * 0.18 +
    controllingBonus(doc) * 0.07 +
    adaptiveModeBonus(responseMode, doc) * 0.04 -
    authorityPenalty(doc) -
    supersessionPenalty(doc) -
    weakCasePenalty(query, doc, classification) -
    classifiedIssuePenalty(classification, doc);

  return Number(score.toFixed(4));
}

function rerankForTina({
  query = "",
  docs = [],
  limit = DEFAULT_LIMIT,
  suppressIssueMismatch = false,
  suppressWeakSecondary = true,
  suppressSuperseded = true,
  responseMode = RESPONSE_MODE.STANDARD,
  adaptiveContext = {},
  issueClassification = null
} = {}) {
  const queryIntent = analyzeQueryIntent(query, {
    issueClassification
  });

  const effectiveMode = normalizeMode(
    responseMode ||
      queryIntent?.adaptiveMode ||
      queryIntent?.detectedMode ||
      adaptiveContext?.responsePlan?.responseMode ||
      RESPONSE_MODE.STANDARD
  );

  const effectiveIssueClassification = extractIssueClassification({
    query,
    queryIntent,
    adaptiveContext,
    issueClassification
  });

  const queryIssues = unique([
    effectiveIssueClassification.primaryIssue,
    ...(effectiveIssueClassification.subIssues || []),
    ...detectIssueTypes(query)
  ]).filter(Boolean);

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
      const authorityType = getAuthorityTypeForDoc(doc);

      const weakSecondary =
        ["SECONDARY", "UNKNOWN"].includes(authorityType) &&
        authorityPenalty(doc) >= 45;

      const superseded = isSupersededDoc(doc);

      const rerankScore = computeTinaRerankScore({
        query,
        doc,
        responseMode: effectiveMode,
        issueClassification: effectiveIssueClassification
      });

      const targetAuthorityMatch =
        effectiveIssueClassification.targetAuthorities?.includes(authorityType) || false;

      const domainAwareBonus = domainBonus(effectiveIssueClassification, doc);

      return {
        ...doc,
        rerankIssueTypes: docIssues,
        rerankScore,
        issueMismatch: mismatch,
        weakSecondary,
        superseded,
        targetAuthorityMatch,
        domainAwareBonus,
        primaryDomain: effectiveIssueClassification.primaryDomain || null,
        citationMatchBonus: exactReferenceBonus(query, doc),
        issueClassificationMatch: {
          primaryDomain: effectiveIssueClassification.primaryDomain || null,
          primaryIssue: effectiveIssueClassification.primaryIssue,
          subIssue: effectiveIssueClassification.subIssue || null,
          subIssues: effectiveIssueClassification.subIssues,
          legalDimensions: effectiveIssueClassification.legalDimensions || [],
          retrievalStrategy: effectiveIssueClassification.retrievalStrategy,
          targetAuthorities: effectiveIssueClassification.targetAuthorities,
          matchedAuthorityType: authorityType,
          targetAuthorityMatch,
          issueOverlap: issueOverlap(queryIssues, docIssues),
          issueMismatch: mismatch,
          taxDomainClassification:
            effectiveIssueClassification.taxDomainClassification || null
        },
        rerankMetadata: {
          responseMode: effectiveMode,
          hierarchyAware: true,
          issueAware: true,
          domainAware: true,
          classifiedIssueAware: true,
          exactAuthorityAware: true,
          targetAuthorityAware: true,
          supersessionAware: true,
          adaptiveContextAware: true,
          mainTaxEngineClassificationCompatible: true,
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
      const bTarget = b.targetAuthorityMatch ? 1 : 0;
      const aTarget = a.targetAuthorityMatch ? 1 : 0;
      if (bTarget !== aTarget) return bTarget - aTarget;

      const aExact = Number(a.citationMatchBonus || 0);
      const bExact = Number(b.citationMatchBonus || 0);
      if (bExact !== aExact) return bExact - aExact;

      const aDomain = Number(a.domainAwareBonus || 0);
      const bDomain = Number(b.domainAwareBonus || 0);
      if (bDomain !== aDomain) return bDomain - aDomain;

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
    issueClassification: effectiveIssueClassification,
    audit: {
      engine: "TINA_RERANKER_ENGINE",
      version: ENGINE_VERSION,
      query,
      primaryDomain: effectiveIssueClassification.primaryDomain || null,
      queryIssues,
      responseMode: effectiveMode,
      inputCount: Array.isArray(docs) ? docs.length : 0,
      uniqueInputCount: uniqueInputDocs.length,
      activeInputCount: activeDocs.length,
      outputCount: ranked.length,
      suppressIssueMismatch,
      suppressWeakSecondary,
      suppressSuperseded,
      domainAware: true,
      mainTaxEngineClassificationCompatible: true,
      policy:
        "TINA reranker prioritizes controlling authority, exact authority matching, domain-aware classified-issue relevance, target-authority matching, adaptive-mode relevance, issue-matched jurisprudence, and penalizes superseded, weak secondary, or issue-mismatched cases.",
      generatedAt: new Date().toISOString()
    }
  };
}

function selectControllingAuthorities({
  query = "",
  docs = [],
  limit = 5,
  responseMode = RESPONSE_MODE.STANDARD,
  adaptiveContext = {},
  issueClassification = null
} = {}) {
  const { results } = rerankForTina({
    query,
    docs,
    limit: Math.max(limit * 2, 10),
    suppressIssueMismatch: false,
    suppressWeakSecondary: true,
    suppressSuperseded: true,
    responseMode,
    adaptiveContext,
    issueClassification
  });

  return results
    .filter((doc) => !["SECONDARY", "UNKNOWN"].includes(getAuthorityTypeForDoc(doc)))
    .slice(0, limit);
}

function selectIssueRelevantCases({
  query = "",
  docs = [],
  limit = 4,
  responseMode = RESPONSE_MODE.TECHNICAL,
  adaptiveContext = {},
  issueClassification = null
} = {}) {
  const { results } = rerankForTina({
    query,
    docs,
    limit: Math.max(limit * 3, 12),
    suppressIssueMismatch: false,
    suppressWeakSecondary: true,
    suppressSuperseded: true,
    responseMode,
    adaptiveContext,
    issueClassification
  });

  return results
    .filter((doc) =>
      ["SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(
        getAuthorityTypeForDoc(doc)
      )
    )
    .filter((doc) => !doc.issueMismatch)
    .slice(0, limit);
}

function rerankerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_RERANKER_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    adaptiveCompatible: true,
    jurisprudenceCompatible: true,
    supersessionCompatible: true,
    issueClassificationCompatible: true,
    mainTaxEngineClassificationCompatible: true,
    domainAware: true,
    targetAuthorityAware: true
  };
}

export {
  ENGINE_VERSION,
  ISSUE_TYPE,
  RESPONSE_MODE,
  normalizeMode,
  detectIssueTypes,
  extractIssueClassification,
  computeTinaRerankScore,
  rerankForTina,
  selectControllingAuthorities,
  selectIssueRelevantCases,
  rerankerHealthCheck
};

export default {
  ENGINE_VERSION,
  ISSUE_TYPE,
  RESPONSE_MODE,
  normalizeMode,
  detectIssueTypes,
  extractIssueClassification,
  computeTinaRerankScore,
  rerankForTina,
  selectControllingAuthorities,
  selectIssueRelevantCases,
  rerankerHealthCheck
};
