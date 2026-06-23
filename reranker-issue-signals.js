// FILE: reranker-issue-signals.js
"use strict";

import { lower, unique } from "./reranker-normalizers.js";

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

export {
  ISSUE_TYPE,
  detectIssueTypes,
  normalizeIssue,
  normalizeDomain,
  issueOverlap,
  issueMismatch
};

export default {
  ISSUE_TYPE,
  detectIssueTypes,
  normalizeIssue,
  normalizeDomain,
  issueOverlap,
  issueMismatch
};
