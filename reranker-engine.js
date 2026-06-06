// FILE: reranker-engine.js
"use strict";

/**
 * TINA Enterprise Reranker Engine
 * Version: 4.2.0
 *
 * Constitutional role:
 * - Rerank already-retrieved sources.
 * - Preserve issue classification, tax-engine hints, authority hierarchy, and supersession status.
 * - Never retrieve, call OpenAI, render answers, or fabricate authorities.
 */

import {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import { applySupersessionFilter } from "./supersession-engine.js";
import { analyzeQueryIntent } from "./query-intent-engine.js";

const ENGINE_VERSION = "4.2.0";
const DEFAULT_LIMIT = 12;

const ISSUE_TYPE = Object.freeze({
  VAT_REFUND: "VAT_REFUND",
  VAT_LIABILITY: "VAT_LIABILITY",
  VAT_DEFINITION: "VAT_DEFINITION",
  VAT_ZERO_RATING: "VAT_ZERO_RATING",
  VAT_EXEMPTION: "VAT_EXEMPTION",
  VAT_REGISTRATION: "VAT_REGISTRATION",
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

// PATCH 6 — Tier boost multipliers applied on top of base score.
// Superseded authorities receive score = 0 (excluded from top results).
const TIER_BOOST = Object.freeze({
  CONSTITUTION:          0.35,
  STATUTE:               0.35,
  NIRC:                  0.35,
  TAX_CODE:              0.35,
  CMTA:                  0.35,
  LGC:                   0.35,
  REPUBLIC_ACT:          0.35,
  RA:                    0.35,
  TAX_TREATY:            0.30,
  TREATY:                0.30,
  SUPREME_COURT_EN_BANC: 0.25,
  SUPREME_COURT:         0.25,
  CTA_EN_BANC:           0.15,
  CTA_DIVISION:          0.15,
  COURT_OF_APPEALS:      0.15,
  RR:                    0.10,
  REVENUE_REGULATION:    0.10,
  RMC:                   0.00,
  RMO:                   0.00,
  RAMO:                  0.00,
  BIR_RULING:            -0.02,
  PFRS:                  -0.03,
  PAS:                   -0.03,
  PSA:                   -0.03,
  OECD_GUIDANCE:         -0.04,
  FOREIGN_AUTHORITY:     -0.04,
  SECONDARY:             -0.05,
  CPA_NOTES:             -0.05,
  REVIEW_MATERIALS:      -0.05,
  UNKNOWN:               -0.05
});

/**
 * Master Prompt hierarchy:
 * 1 Constitution
 * 2 NIRC / CMTA / LGC / primary statutes
 * 3 Tax treaties
 * 4 Supreme Court En Banc
 * 5 Supreme Court Division
 * 6 CTA En Banc
 * 7 CTA Division
 * 8 RR
 * 9 RMC / RMO / RAMO
 * 10 BIR rulings
 * 11 LGU / BOC issuances
 * 12 PFRS / PAS / PSA when accounting applies
 * 13 OECD / foreign persuasive
 * 14 CPA reviewer notes / secondary
 */
const AUTHORITY_PRECEDENCE = Object.freeze({
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
  BOC_ISSUANCE: 11,
  FIRB_ISSUANCE: 11,
  PEZA_MEMO: 11,
  SEC_GUIDANCE: 11,

  PFRS: 12,
  PAS: 12,
  PSA: 12,

  OECD_GUIDANCE: 13,
  FOREIGN_AUTHORITY: 13,

  SECONDARY: 14,
  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,

  UNKNOWN: 99
});

const AUTHORITY_WEIGHT = Object.freeze({
  CONSTITUTION: 150,

  STATUTE: 145,
  NIRC: 145,
  TAX_CODE: 145,
  CMTA: 145,
  LGC: 145,
  REPUBLIC_ACT: 145,
  RA: 145,

  TAX_TREATY: 138,
  TREATY: 138,

  SUPREME_COURT_EN_BANC: 132,
  SUPREME_COURT: 126,

  CTA_EN_BANC: 118,
  CTA_DIVISION: 112,
  COURT_OF_APPEALS: 112,

  RR: 104,
  REVENUE_REGULATION: 104,

  RMC: 96,
  RMO: 94,
  RAMO: 94,

  BIR_RULING: 86,

  LGU: 78,
  BOC_ISSUANCE: 78,
  FIRB_ISSUANCE: 78,
  PEZA_MEMO: 78,
  SEC_GUIDANCE: 76,

  PFRS: 70,
  PAS: 70,
  PSA: 66,

  OECD_GUIDANCE: 45,
  FOREIGN_AUTHORITY: 45,

  SECONDARY: 8,
  CPA_NOTES: 8,
  REVIEW_MATERIALS: 8,

  UNKNOWN: 0
});

const DOMAIN_AUTHORITY_PROFILE = Object.freeze({
  VAT: ["STATUTE", "TREATY", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR", "RMC"],
  CIT: ["STATUTE", "TREATY", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR", "RMC"],
  IIT: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC"],
  WHT: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC", "BIR_RULING"],
  EST: ["STATUTE", "SUPREME_COURT", "RR", "RMC"],
  PCT: ["STATUTE", "SUPREME_COURT", "RR", "RMC"],
  EXC: ["STATUTE", "SUPREME_COURT", "RR", "RMC"],
  PRE: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR", "RMC"],
  DIS: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR"],
  LGT: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "LGU"],
  CUS: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "BOC_ISSUANCE"],
  SPC: ["STATUTE", "SUPREME_COURT", "RR", "RMC", "OECD_GUIDANCE"],
  CON: ["CONSTITUTION", "SUPREME_COURT", "CTA_EN_BANC"]
});

const ISSUE_AUTHORITY_PROFILE = Object.freeze({
  VAT_DEFINITION: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC"],
  VAT_LIABILITY: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC"],
  VAT_REFUND: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR"],
  VAT_ZERO_RATING: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC"],
  VAT_EXEMPTION: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC"],
  VAT_REGISTRATION: ["STATUTE", "SUPREME_COURT", "RR", "RMC"],

  WITHHOLDING: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC", "BIR_RULING"],
  INCOME_TAX: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC"],
  PROCEDURAL: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC", "RMO"],
  EVIDENTIARY: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR"],
  JURISDICTIONAL: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC"],

  CASE_LAW: ["SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"],
  ISSUANCE: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC", "RMO", "RAMO", "BIR_RULING"],

  CONTRACT: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "PFRS"],
  TRANSACTION: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "PFRS"],
  ECONOMIC_SUBSTANCE: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR"],
  PRINCIPAL_AGENT: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "PFRS"],
  PASS_THROUGH: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC", "PFRS"],
  REIMBURSEMENT: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC", "PFRS"],
  BUNDLED_TRANSACTION: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "PFRS"],

  AUDIT: ["PFRS", "PAS", "PSA", "STATUTE", "SUPREME_COURT"],
  ACCOUNTING: ["PFRS", "PAS", "PSA", "STATUTE"],
  PFRS: ["PFRS", "PAS", "PSA"],

  CONFLICT_ANALYSIS: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR", "RMC"],
  DOCTRINE: ["SUPREME_COURT", "CTA_EN_BANC", "STATUTE", "RR"],
  GENERAL: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "RR", "RMC"]
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
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
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
    CMTA: "STATUTE",
    LGC: "STATUTE",

    TAX_TREATY: "TREATY",
    TREATY: "TREATY",

    SUPREME_COURT_EN_BANC: "SUPREME_COURT_EN_BANC",
    SUPREME_COURT_DECISION: "SUPREME_COURT",
    SUPREME_COURT: "SUPREME_COURT",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",

    CTA: "CTA_DIVISION",
    CTA_CASE: "CTA_DIVISION",
    CTA_EN_BANC_DECISION: "CTA_EN_BANC",
    CTA_EN_BANC: "CTA_EN_BANC",
    CTA_DIVISION: "CTA_DIVISION",
    COURT_OF_APPEALS: "COURT_OF_APPEALS",

    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    RR: "RR",

    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    RMC: "RMC",

    REVENUE_MEMORANDUM_ORDER: "RMO",
    RMO: "RMO",

    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    RAMO: "RAMO",

    BIR_RULING: "BIR_RULING",
    BIR_RULINGS: "BIR_RULING",

    LGU_ISSUANCE: "LGU",
    LGU: "LGU",
    BOC_ISSUANCE: "BOC_ISSUANCE",
    BOC: "BOC_ISSUANCE",

    OECD_GUIDANCE: "OECD_GUIDANCE",
    FOREIGN_AUTHORITY: "FOREIGN_AUTHORITY",

    PFRS_FOR_SMES: "PFRS",
    IFRS: "PFRS",
    PFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",

    SECONDARY_SOURCE: "SECONDARY",
    CPA_NOTES: "SECONDARY",
    REVIEW_MATERIALS: "SECONDARY"
  };

  return aliases[raw] || raw;
}

function safeAuthorityType(doc = {}) {
  return normalizeAuthority(
    doc.authorityType ||
      doc.authority_type ||
      doc.metadata?.authorityType ||
      doc.metadata?.sourceType ||
      getAuthorityTypeForDoc(doc) ||
      "UNKNOWN"
  ) || "UNKNOWN";
}

function masterPrecedenceForDoc(doc = {}) {
  const explicit = Number(
    doc.controllingPrecedence ??
      doc.controlling_precedence ??
      doc.authorityPrecedence ??
      doc.authority_precedence ??
      doc.authorityLevel ??
      doc.authority_level ??
      doc.metadata?.controllingPrecedence ??
      doc.metadata?.authorityLevel ??
      0
  );

  if (Number.isFinite(explicit) && explicit > 0 && explicit < 99) {
    return explicit;
  }

  return AUTHORITY_PRECEDENCE[safeAuthorityType(doc)] || 99;
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

  push(/\b(define vat|definition of vat|what is vat|value[- ]added tax)\b/i.test(value), ISSUE_TYPE.VAT_DEFINITION);
  push(/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|unutilized input vat|excess input vat)\b/i.test(value), ISSUE_TYPE.VAT_REFUND);
  push(/\b(vat liability|output vat|subject to vat|vatable|gross receipts|sale of goods|sale of services)\b/i.test(value), ISSUE_TYPE.VAT_LIABILITY);
  push(/\b(zero[- ]rated|zero rating|export sales)\b/i.test(value), ISSUE_TYPE.VAT_ZERO_RATING);
  push(/\b(vat exempt|vat exemption|section 109)\b/i.test(value), ISSUE_TYPE.VAT_EXEMPTION);
  push(/\b(vat registration|register for vat|vat threshold)\b/i.test(value), ISSUE_TYPE.VAT_REGISTRATION);
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
    DEFINITION: ISSUE_TYPE.VAT_DEFINITION,
    VAT_DEFINITION: ISSUE_TYPE.VAT_DEFINITION,
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
    boostTerms,
    masterPromptAuthorityHierarchyApplied: true
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
  ) return true;

  if (
    queryIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    docIssues.includes(ISSUE_TYPE.VAT_LIABILITY) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY)
  ) return true;

  if (
    queryIssues.includes(ISSUE_TYPE.VAT_DEFINITION) &&
    (docIssues.includes(ISSUE_TYPE.VAT_REFUND) || docIssues.includes(ISSUE_TYPE.VAT_ZERO_RATING)) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_ZERO_RATING)
  ) return true;

  if (
    queryIssues.includes(ISSUE_TYPE.WITHHOLDING) &&
    (docIssues.includes(ISSUE_TYPE.VAT_REFUND) || docIssues.includes(ISSUE_TYPE.VAT_LIABILITY)) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY)
  ) return true;

  if (
    queryIssues.includes(ISSUE_TYPE.INCOME_TAX) &&
    docIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_REFUND)
  ) return true;

  if (
    queryIssues.includes(ISSUE_TYPE.CONTRACT) &&
    docIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_REFUND)
  ) return true;

  return false;
}

function authorityWeight(doc = {}) {
  return AUTHORITY_WEIGHT[safeAuthorityType(doc)] ?? AUTHORITY_WEIGHT.UNKNOWN;
}

function authorityPenalty(doc = {}) {
  const type = safeAuthorityType(doc);
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

  const authorityType = safeAuthorityType(doc);
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
  const authorityType = safeAuthorityType(doc);
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

  // Text-absence guard: if the query is VAT-focused but the chunk text contains
  // no VAT terms, reduce the classification bonus so metadata alone cannot
  // outrank a chunk with actual on-topic content.
  const _vatPrimarySet = new Set([
    "VAT_LIABILITY", "VAT_REFUND", "VAT_DEFINITION",
    "VAT_ZERO_RATING", "VAT_EXEMPTION", "VAT_REGISTRATION"
  ]);
  if (bonus > 0 && _vatPrimarySet.has(primaryIssue)) {
    const chunkText = lower(docText(doc));
    const hasVatText = /\bv\.?a\.?t\b|value[- ]added tax|output vat|input vat|output tax|input tax|zero[- ]rated|vatable|importation|sale of goods|sale of services/.test(chunkText);
    if (!hasVatText) {
      bonus = Math.max(0, bonus - 50);
    }
  }

  return bonus;
}

function classifiedIssuePenalty(issueClassification = {}, doc = {}) {
  const authorityType = safeAuthorityType(doc);
  const docIssues = detectIssueTypes(docText(doc));
  const primaryIssue = issueClassification.primaryIssue || ISSUE_TYPE.GENERAL;
  const classifiedIssues = unique([primaryIssue, ...(issueClassification.subIssues || [])]);
  const targetAuthorities = issueClassification.targetAuthorities || [];

  let penalty = 0;

  if (issueMismatch(classifiedIssues, docIssues)) penalty += 160;

  if (
    primaryIssue !== ISSUE_TYPE.GENERAL &&
    !issueOverlap(classifiedIssues, docIssues) &&
    ["SUPREME_COURT", "SUPREME_COURT_EN_BANC", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(authorityType)
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

  for (const match of value.matchAll(/\b(?:nirc|tax code)?\s*(?:sec\.?|section)\s*(\d{1,4}[a-z]?)\b/gi)) {
    signals.push(`NIRC_SEC_${String(match[1]).toUpperCase()}`);
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

/**
 * Returns true when any value in `authorities` appears as a substring in the
 * doc's provision-identifying metadata fields.
 *
 * targetAuthorities values are provision-level strings like "NIRC Sec. 105" or
 * "RR 16-2005" — they will never equal an authorityType string ("STATUTE", "RR"),
 * so the old `targetAuthorities.includes(authorityType)` check always returned false.
 * This check compares against the fields that actually store the citation text:
 *   normalized_reference, citation, document_title, title, source (and metadata variants).
 * Comparison is case-insensitive substring match.
 */
function matchesTargetAuthority(doc = {}, authorities = []) {
  if (!authorities.length) return false;
  const fields = unique([
    doc.normalized_reference,
    doc.normalizedReference,
    doc.citation,
    doc.document_title,
    doc.documentTitle,
    doc.title,
    doc.source,
    doc.original_source,
    doc.originalSource,
    doc.metadata?.normalized_reference,
    doc.metadata?.normalizedReference
  ]).filter(Boolean).map(v => lower(v));

  for (const authority of authorities) {
    if (!authority) continue;
    const norm = lower(authority);
    if (norm && fields.some(f => f.includes(norm))) return true;
  }
  return false;
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
  const type = safeAuthorityType(doc);
  const level = getAuthorityLevelForDoc(doc);
  const precedence = masterPrecedenceForDoc(doc);

  let bonus = 0;

  if (["CONSTITUTION", "STATUTE", "NIRC", "TAX_CODE", "TAX_TREATY", "TREATY"].includes(type)) bonus += 60;
  else if (["SUPREME_COURT_EN_BANC", "SUPREME_COURT"].includes(type)) bonus += 55;
  else if (["CTA_EN_BANC", "CTA_DIVISION", "COURT_OF_APPEALS"].includes(type)) bonus += 42;
  else if (type === "RR") bonus += 30;
  else if (["RMC", "RMO", "RAMO"].includes(type)) bonus += 20;
  else if (type === "BIR_RULING") bonus += 14;
  else if (["PFRS", "PAS", "PSA"].includes(type)) bonus += 18;

  if (level <= 3) bonus += 30;
  else if (level <= 7) bonus += 20;
  else if (level <= 12) bonus += 8;

  if (precedence <= 5) bonus += 24;
  else if (precedence <= 7) bonus += 16;
  else if (precedence <= 10) bonus += 8;

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
  const authorityType = safeAuthorityType(doc);
  const text = lower(docText(doc));

  let bonus = 0;

  if (mode === RESPONSE_MODE.AUDIT && /\bpfrs\b|\bpas\b|\bfinancial statements\b|\bafs\b|\baudit\b/i.test(text)) bonus += 45;
  if (mode === RESPONSE_MODE.CONTRACT && /\bcontract\b|\bagreement\b|\bclause\b|\blease\b|\bconcession\b/i.test(text)) bonus += 48;
  if (mode === RESPONSE_MODE.TRANSACTION && /\bprincipal\b|\bagent\b|\bpass-through\b|\breimbursement\b|\bgross\b|\bnet\b|\bbundled\b/i.test(text)) bonus += 50;
  if (mode === RESPONSE_MODE.EVIDENCE_HEAVY && /\binvoice\b|\breceipt\b|\bsubstantiation\b|\bevidence\b|\bproof\b/i.test(text)) bonus += 50;
  if (mode === RESPONSE_MODE.TECHNICAL && ["SUPREME_COURT_EN_BANC", "SUPREME_COURT", "CTA_EN_BANC"].includes(authorityType)) bonus += 42;
  if (mode === RESPONSE_MODE.LITIGATION && ["SUPREME_COURT_EN_BANC", "SUPREME_COURT", "CTA_EN_BANC"].includes(authorityType)) bonus += 58;

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
  const authorityType = safeAuthorityType(doc);

  let penalty = 0;

  if (queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY) && /\brefund\b|\binput vat refund\b/.test(text)) penalty += 75;
  if (queryIssues.includes(ISSUE_TYPE.VAT_REFUND) && /\boutput vat\b|\bvat liability\b/.test(text)) penalty += 75;

  if (
    queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY) &&
    ["SUPREME_COURT", "SUPREME_COURT_EN_BANC", "CTA_EN_BANC", "CTA_DIVISION"].includes(authorityType) &&
    /\brefund\b|\bclaim for refund\b|\bunutilized input vat\b|\btcc\b/.test(text)
  ) {
    penalty += 100;
  }

  // VAT_DEFINITION: demote refund/zero-rating content and named contaminating cases
  if (queryIssues.includes(ISSUE_TYPE.VAT_DEFINITION)) {
    if (/\brefund\b|\bunutilized\b|\bexcess input\b|\bsec\.?\s*112\b|\b120\+30\b|\badministrative claim\b|\bjudicial claim\b/.test(text)) penalty += 140;
    if (/\bzero[- ]rated\b|\bzero rating\b|\beffectively zero\b/.test(text) && !/(define|definition|what is|sale of goods|sale of services|course of trade)/i.test(text)) penalty += 90;
    if (/\baichi\b/i.test(text)) penalty += 180;
    if (/\bsan roque\b/i.test(text)) penalty += 180;
    if (/\btoshiba\b/i.test(text)) penalty += 160;
    if (/\bseagate\b/i.test(text)) penalty += 160;
    if (/\bmirant\b/i.test(text)) penalty += 160;
  }

  if (
    queryIssues.includes(ISSUE_TYPE.WITHHOLDING) &&
    ["SUPREME_COURT", "SUPREME_COURT_EN_BANC", "CTA_EN_BANC", "CTA_DIVISION"].includes(authorityType) &&
    /\bvat refund\b|\binput vat\b/.test(text)
  ) {
    penalty += 90;
  }

  return penalty;
}

function tierBoostForDoc(doc = {}) {
  const type = safeAuthorityType(doc);
  return TIER_BOOST[type] ?? TIER_BOOST.UNKNOWN;
}

/**
 * Returns true when the authority string is a section range
 * (e.g. "NIRC Secs. 84-97", "NIRC Secs. 116-122").
 */
function isRangeAuthority(authority = "") {
  return /\bsecs?\.\s*\d+\s*[-–]\s*\d+/i.test(authority);
}

/**
 * Returns true when one of the doc's citation fields contains a section number
 * that falls numerically within the range expressed by rangeAuthority.
 * docFieldsLower: pre-lowercased array of citation/reference strings from the doc.
 */
function sectionFallsInRange(docFieldsLower = [], rangeAuthority = "") {
  const m = rangeAuthority.match(/^(.*?)\bsecs?\.\s*(\d+)\s*[-–]\s*(\d+)/i);
  if (!m) return false;

  const prefix = lower(m[1].trim());
  const start = parseInt(m[2], 10);
  const end = parseInt(m[3], 10);
  if (!prefix || isNaN(start) || isNaN(end) || start > end) return false;

  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const secRe = new RegExp(`${escaped}\\s*sec\\.?\\s*(\\d+)`, "i");

  for (const field of docFieldsLower) {
    const hit = field.match(secRe);
    if (hit) {
      const secNum = parseInt(hit[1], 10);
      if (secNum >= start && secNum <= end) return true;
    }
  }

  return false;
}

/**
 * Computes a numerical authority match tier (1–4) for a single doc against the
 * effective issue classification.  Lower = stronger match.
 *
 * Tier 1 — Exact Provision Match
 *   A specific provision target from the classifier (e.g. "NIRC Sec. 116",
 *   "RR 2-98") is found as a substring in the doc's citation/reference fields.
 *
 * Tier 2 — Range Match
 *   The doc's provision number falls within a range target in the classifier
 *   (e.g. "NIRC Secs. 116-122" covers Sec. 119).
 *
 * Tier 3 — Authority Family Match
 *   The doc's authorityType (e.g. "STATUTE") matches a generic type entry in
 *   targetAuthorities (populated from DOMAIN_AUTHORITY_PROFILE / ISSUE_AUTHORITY_PROFILE).
 *
 * Tier 4 — No Match (contextual/semantic only)
 *
 * This prevents "Authority Type Saturation": a generic STATUTE match for VAT Sec. 106
 * (Tier 3) cannot outrank an exact match for PCT Sec. 116 (Tier 1), even if the VAT
 * chunk has higher semantic similarity.
 */
function computeAuthorityMatchTier(doc = {}, effectiveIssueClassification = {}) {
  const authorityType = safeAuthorityType(doc);

  // Raw provision-level targets preserved from the original classification via
  // the ...candidate spread in extractIssueClassification (human-readable form:
  // "NIRC Sec. 116", "RR 2-98", "NIRC Secs. 84-97", etc.)
  const rawControlling = arrayify(
    effectiveIssueClassification.controllingAuthorities ||
      effectiveIssueClassification.targetAuthorityGroups?.controllingAuthorities
  );
  const rawSupporting = arrayify(
    effectiveIssueClassification.supportingAuthorities ||
      effectiveIssueClassification.targetAuthorityGroups?.supportingAuthorities
  );
  const rawProvisionTargets = unique([...rawControlling, ...rawSupporting]);

  // Generic authority-type entries have no digits (e.g. "STATUTE", "RR", "SUPREME_COURT").
  // These come from DOMAIN_AUTHORITY_PROFILE / ISSUE_AUTHORITY_PROFILE merged into
  // effectiveIssueClassification.targetAuthorities.
  const normalizedTargets = arrayify(effectiveIssueClassification.targetAuthorities);
  const genericTypeTargets = normalizedTargets.filter((a) => !/\d/.test(a));

  // Lowercased doc citation / reference fields for substring matching
  const docFieldsLower = unique([
    doc.normalized_reference,
    doc.normalizedReference,
    doc.citation,
    doc.document_title,
    doc.documentTitle,
    doc.title,
    doc.source,
    doc.original_source,
    doc.originalSource,
    doc.metadata?.normalized_reference,
    doc.metadata?.normalizedReference
  ])
    .filter(Boolean)
    .map((f) => lower(f));

  // Tier 1: exact provision or exact range-document match.
  // Covers both specific sections ("NIRC Sec. 116" in doc field) AND docs whose
  // reference IS the range string itself ("NIRC Secs. 84-97" doc vs same target).
  for (const target of rawProvisionTargets) {
    if (!target) continue;
    const normTarget = lower(target);
    if (normTarget && docFieldsLower.some((f) => f.includes(normTarget))) return 1;
  }

  // Tier 2: numeric range match — doc's specific section number falls WITHIN a range
  // target (e.g. Sec. 91 within "NIRC Secs. 84-97").  Only reached when the doc did
  // not match the range string exactly in Tier 1 above.
  for (const target of rawProvisionTargets) {
    if (!target || !isRangeAuthority(target)) continue;
    if (sectionFallsInRange(docFieldsLower, target)) return 2;
  }

  // Tier 3: generic authority-family match (e.g. authorityType "STATUTE" in targetAuthorities)
  if (genericTypeTargets.includes(authorityType)) return 3;

  // Tier 4: no authority match
  return 4;
}

function computeTinaRerankScore({
  query = "",
  doc = {},
  responseMode = RESPONSE_MODE.STANDARD,
  issueClassification = null
}) {
  // Superseded authorities are excluded — score = 0 (LAW 2 / PATCH 6)
  if (isSupersededDoc(doc)) return 0;

  const classification =
    issueClassification ||
    extractIssueClassification({
      query,
      queryIntent: {},
      adaptiveContext: {}
    });

  const base =
    semanticScore(doc) * 0.20 +
    authorityWeight(doc) * 0.25 +
    exactReferenceBonus(query, doc) * 0.18 +
    issueBonus(query, doc) * 0.08 +
    classifiedIssueBonus(classification, doc) * 0.18 +
    controllingBonus(doc) * 0.07 +
    adaptiveModeBonus(responseMode, doc) * 0.04 -
    authorityPenalty(doc) -
    weakCasePenalty(query, doc, classification) -
    classifiedIssuePenalty(classification, doc);

  // PATCH 6 — tier boost multiplier applied after base score
  const boost = tierBoostForDoc(doc);
  const score = base + base * boost;

  return Number(score.toFixed(4));
}

function safeAnalyzeQueryIntent(query = "", options = {}) {
  try {
    return analyzeQueryIntent(query, options) || {};
  } catch {
    return {};
  }
}

function safeSupersessionActiveDocs(docs = [], suppressSuperseded = true) {
  if (!suppressSuperseded) return docs;

  try {
    const result = applySupersessionFilter(docs);

    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.activeDocs)) return result.activeDocs;
    if (Array.isArray(result?.active)) return result.active;
    if (Array.isArray(result?.results)) return result.results;

    return docs.filter((doc) => !isSupersededDoc(doc));
  } catch {
    return docs.filter((doc) => !isSupersededDoc(doc));
  }
}

function safeHierarchyRank(docs = [], query = "") {
  try {
    const ranked = rerankByHierarchy(uniqueDocs(docs), query);
    return Array.isArray(ranked) ? ranked : uniqueDocs(docs);
  } catch {
    return uniqueDocs(docs);
  }
}

function rerankForTina({
  query = "",
  docs = [],
  sources = [],
  retrievedSources = [],
  limit = DEFAULT_LIMIT,
  suppressIssueMismatch = false,
  suppressWeakSecondary = true,
  suppressSuperseded = true,
  responseMode = RESPONSE_MODE.STANDARD,
  adaptiveMode = null,
  adaptiveContext = {},
  issueClassification = null
} = {}) {
  const inputDocs = arrayify(docs).length
    ? docs
    : arrayify(sources).length
      ? sources
      : retrievedSources;

  const queryIntent = safeAnalyzeQueryIntent(query, {
    issueClassification
  });

  const effectiveMode = normalizeMode(
    responseMode ||
      adaptiveMode ||
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

  const uniqueInputDocs = uniqueDocs(inputDocs);
  const activeDocs = safeSupersessionActiveDocs(uniqueInputDocs, suppressSuperseded);
  const hierarchyRanked = safeHierarchyRank(activeDocs, query);

  const ranked = hierarchyRanked
    .map((doc) => {
      const docIssues = detectIssueTypes(docText(doc));
      const mismatch = issueMismatch(queryIssues, docIssues);
      const authorityType = safeAuthorityType(doc);

      const weakSecondary =
        ["SECONDARY", "CPA_NOTES", "REVIEW_MATERIALS", "UNKNOWN"].includes(authorityType) &&
        authorityPenalty(doc) >= 45;

      const superseded = isSupersededDoc(doc);

      const rerankScore = computeTinaRerankScore({
        query,
        doc,
        responseMode: effectiveMode,
        issueClassification: effectiveIssueClassification
      });

      // targetAuthorities contains provision-level strings ("NIRC Sec. 105",
      // "RR 16-2005") which will never equal authorityType ("STATUTE", "RR").
      // matchesTargetAuthority() performs case-insensitive substring matching
      // against normalized_reference, citation, document_title, title, source.
      const targetAuthorityMatch =
        (effectiveIssueClassification.targetAuthorities?.includes(authorityType) || false) ||
        matchesTargetAuthority(doc, effectiveIssueClassification.targetAuthorities || []);

      // Numerical tier for authority specificity.  Replaces the binary
      // targetAuthorityMatch as the primary sort key to prevent generic
      // STATUTE matches from ranking equally with exact provision matches.
      const authorityMatchTier = computeAuthorityMatchTier(doc, effectiveIssueClassification);

      const domainAwareBonus = domainBonus(effectiveIssueClassification, doc);
      const precedence = masterPrecedenceForDoc(doc);

      return {
        ...doc,
        authorityType,
        controllingPrecedence:
          doc.controllingPrecedence ||
          doc.controlling_precedence ||
          precedence,
        rerankIssueTypes: docIssues,
        rerankScore,
        issueMismatch: mismatch,
        weakSecondary,
        superseded,
        targetAuthorityMatch,
        authorityMatchTier,
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
          authorityMatchTier,
          issueOverlap: issueOverlap(queryIssues, docIssues),
          issueMismatch: mismatch,
          taxDomainClassification:
            effectiveIssueClassification.taxDomainClassification || null
        },
        rerankMetadata: {
          responseMode: effectiveMode,
          hierarchyAware: true,
          masterPromptAuthorityHierarchyApplied: true,
          courtAuthorityNotSubordinatedToBIRIssuances: true,
          issueAware: true,
          domainAware: true,
          classifiedIssueAware: true,
          exactAuthorityAware: true,
          targetAuthorityAware: true,
          authorityMatchTierAware: true,
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
      // authorityMatchTier: 1 (exact provision) → 2 (range) → 3 (family) → 4 (none)
      // Lower tier = stronger match = sorts first.  Replaces the binary
      // targetAuthorityMatch to prevent generic STATUTE hits from equalling
      // exact-provision matches (Authority Type Saturation fix).
      const aTier = Number(a.authorityMatchTier || 4);
      const bTier = Number(b.authorityMatchTier || 4);
      if (aTier !== bTier) return aTier - bTier;

      const aExact = Number(a.citationMatchBonus || 0);
      const bExact = Number(b.citationMatchBonus || 0);
      if (bExact !== aExact) return bExact - aExact;

      const aDomain = Number(a.domainAwareBonus || 0);
      const bDomain = Number(b.domainAwareBonus || 0);
      if (bDomain !== aDomain) return bDomain - aDomain;

      const aPrecedence = Number(a.controllingPrecedence || masterPrecedenceForDoc(a));
      const bPrecedence = Number(b.controllingPrecedence || masterPrecedenceForDoc(b));
      if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

      return b.rerankScore - a.rerankScore;
    })
    .slice(0, limit);

  const supersessionResult = {
    activeDocs,
    inputCount: uniqueInputDocs.length,
    activeCount: activeDocs.length
  };

  return {
    results: ranked,
    sources: ranked,
    retrievedSources: ranked,
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
      inputCount: Array.isArray(inputDocs) ? inputDocs.length : 0,
      uniqueInputCount: uniqueInputDocs.length,
      activeInputCount: activeDocs.length,
      outputCount: ranked.length,
      suppressIssueMismatch,
      suppressWeakSecondary,
      suppressSuperseded,
      domainAware: true,
      mainTaxEngineClassificationCompatible: true,
      masterPromptAuthorityHierarchyApplied: true,
      courtAuthorityNotSubordinatedToBIRIssuances: true,
      policy:
        "TINA reranker prioritizes Master Prompt hierarchy, exact authority matching, issue relevance, domain relevance, target-authority matching, adaptive-mode relevance, and penalizes superseded, weak secondary, or issue-mismatched sources.",
      generatedAt: new Date().toISOString()
    }
  };
}

function selectControllingAuthorities({
  query = "",
  docs = [],
  sources = [],
  retrievedSources = [],
  limit = 5,
  responseMode = RESPONSE_MODE.STANDARD,
  adaptiveContext = {},
  issueClassification = null
} = {}) {
  const { results } = rerankForTina({
    query,
    docs,
    sources,
    retrievedSources,
    limit: Math.max(limit * 2, 10),
    suppressIssueMismatch: false,
    suppressWeakSecondary: true,
    suppressSuperseded: true,
    responseMode,
    adaptiveContext,
    issueClassification
  });

  return results
    .filter((doc) => !["SECONDARY", "CPA_NOTES", "REVIEW_MATERIALS", "UNKNOWN"].includes(safeAuthorityType(doc)))
    .slice(0, limit);
}

function selectIssueRelevantCases({
  query = "",
  docs = [],
  sources = [],
  retrievedSources = [],
  limit = 4,
  responseMode = RESPONSE_MODE.TECHNICAL,
  adaptiveContext = {},
  issueClassification = null
} = {}) {
  const { results } = rerankForTina({
    query,
    docs,
    sources,
    retrievedSources,
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
      ["SUPREME_COURT_EN_BANC", "SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(
        safeAuthorityType(doc)
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
    targetAuthorityAware: true,
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    noRetrieval: true,
    noOpenAI: true,
    noRendering: true
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
