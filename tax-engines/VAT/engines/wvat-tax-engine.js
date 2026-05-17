// FILE: tax-engines/VAT/engines/wvat-tax-engine.js
"use strict";

/**
 * TINA VAT Withholding VAT Tax Engine
 * Version: 2.0.0
 *
 * VAT → WITHHOLDING_VAT
 *
 * Scope:
 * - government withholding VAT
 * - 5% final withholding VAT
 * - Sec. 114(C) analysis
 * - government money payments
 * - VAT withholding vs EWT/CWT distinction
 * - remittance/compliance review
 * - supplier VAT reporting impact
 * - government procurement/payment analysis
 * - audit-risk analysis
 *
 * Boundary:
 * - No OpenAI calls
 * - No direct retrieval
 * - No final-answer generation
 * - No orchestration duplication
 * - Does not replace WHT domain engines
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../../shared/authority-hierarchy.js";

export const VAT_WVAT_TAX_ENGINE_VERSION = "2.0.0";

export const VAT_WVAT_TAX_PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS",
  "06_COURT_CASES"
]);

export const VAT_WVAT_TAX_EXCLUDED_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

export const VAT_WVAT_TAX_AUTHORITY_HIERARCHY = Object.freeze([
  "CONSTITUTION",
  "STATUTE",
  "TAX_TREATY",
  "SUPREME_COURT_EN_BANC",
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "CTA_DIVISION",
  "RR",
  "RMC",
  "RMO",
  "RAMO",
  "BIR_RULING",
  "ADMINISTRATIVE_GUIDANCE",
  "OECD_GUIDANCE",
  "FOREIGN_AUTHORITY",
  "SECONDARY"
]);

export const VAT_WVAT_TAX_SUB_ISSUE = Object.freeze({
  code: "WITHHOLDING_VAT",
  subIssue: "WITHHOLDING_VAT",

  domain: "VAT",
  domainCode: "VAT",
  domainName: "Value-Added Tax",

  title:
    "Withholding VAT — Government Transactions; 5% Final Withholding VAT",

  description:
    "Reusable VAT WITHHOLDING_VAT sub-issue engine for government withholding VAT, 5% final withholding VAT, Sec. 114(C), government money payments, VAT withholding vs EWT/CWT distinction, remittance compliance, supplier VAT reporting impact, procurement/payment review, and audit-risk routing.",

  primaryIssue: "VAT",
  legacyPrimaryIssue: "WITHHOLDING_VAT",
  primarySubIssue: "WITHHOLDING_VAT",

  retrievalStrategy:
    "VAT_WITHHOLDING_GOVERNMENT_FIRST",

  targetAuthorities: [
    "NIRC Sec. 114(C)",
    "RR 1-2012",
    "RR 13-2018",
    "RMC 40-2012",
    "RR 16-2005 withholding VAT provisions"
  ],

  controllingAuthorities: [
    "NIRC Sec. 114(C)",
    "RR 16-2005 provisions on VAT withholding, where applicable",
    "RR 1-2012",
    "RR 13-2018, where applicable",
    "RMC 40-2012"
  ],

  supportingAuthorities: [
    "Relevant RMCs/RRs on government money payments and VAT withholding",
    "Applicable BIR forms/remittance issuances, if retrieved",
    "Applicable government procurement/payment guidance, if retrieved"
  ],

  supportingJurisprudence: [
    "Issue-relevant Supreme Court or CTA cases only if retrieved or included by domain config"
  ],

  preferredAuthorityTypes: [
    "STATUTE",
    "RR",
    "RMC",
    "RMO",
    "BIR_RULING",
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "CTA_DIVISION"
  ],

  retrievalPriorityAuthorities: [
    "NIRC Sec. 114(C)",
    "RR 1-2012",
    "RR 13-2018",
    "RMC 40-2012",
    "RR 16-2005 VAT withholding provisions, where applicable",
    "Other BIR issuances on government money payments and VAT withholding",
    "Issue-relevant jurisprudence only if directly applicable"
  ],

  priorityFolders:
    VAT_WVAT_TAX_PRIORITY_FOLDERS,

  excludedFolders:
    VAT_WVAT_TAX_EXCLUDED_FOLDERS,

  authorityHierarchy:
    VAT_WVAT_TAX_AUTHORITY_HIERARCHY,

  legalDimensions: [
    "SUBSTANTIVE",
    "COMPLIANCE",
    "PROCEDURAL",
    "EVIDENTIARY",
    "AUDIT",
    "TRANSACTION"
  ],

  legalConcepts: [
    "withholding VAT",
    "government withholding VAT",
    "5% final withholding VAT",
    "government money payments",
    "Sec. 114(C)",
    "VAT withholding by government agencies",
    "NGA VAT withholding",
    "LGU VAT withholding",
    "GOCC VAT withholding",
    "VAT withheld at source",
    "VAT remittance",
    "VAT withholding certificate",
    "supplier VAT reporting impact",
    "government procurement VAT",
    "VAT withholding vs EWT",
    "VAT withholding vs CWT",
    "VAT withholding vs final withholding income tax",
    "government payment characterization",
    "WVAT audit risk"
  ],

  tpmProfile: "STANDARD",

  sourceGroundingRequired: true,

  complianceSensitive: true,
  remittanceSensitive: true,
  governmentTransactionSensitive: true,
  procurementSensitive: true,
  invoiceSensitive: true,
  auditRiskSensitive: true,
  doctrinallySensitive: true,
  conflictSensitive: false,
  litigationSensitive: false,

  withholdingVatType:
    "GOVERNMENT_FINAL_WITHHOLDING_VAT_ANALYSIS",

  withholdingVatRiskCategory:
    "GOVERNMENT_PAYOR_REMITTANCE_DISTINCTION_AND_REPORTING_RISK",

  relatedButDifferentIssues: [
    "DEFINITION",
    "REFUND_CREDIT",
    "ZERO_RATING",
    "INPUT_TAX",
    "EXEMPTION",
    "OUTPUT_TAX",
    "REGISTRATION",
    "COMPLIANCE",
    "TRANSITIONAL_INPUT_TAX",
    "DEEMED_SALE",
    "WHT",
    "CREDITABLE_WHT",
    "FINAL_WHT"
  ]
});

export const VAT_WVAT_TAX_KEYWORDS = Object.freeze([
  "withholding vat",
  "wvat",
  "withheld vat",
  "vat withheld",
  "vat withheld by government",
  "vat withheld at source",
  "final withholding vat",
  "5% withholding vat",
  "5% final withholding vat",
  "five percent final withholding vat",
  "government withholding vat",
  "government transaction",
  "government transactions",
  "government money payment",
  "government money payments",
  "government payment",
  "government payments",
  "government agency",
  "national government",
  "nga",
  "local government",
  "lgu",
  "government-owned or controlled corporation",
  "government owned or controlled corporation",
  "gocc",
  "government instrumentality",
  "government procurement",
  "government procurement vat",
  "vat on government transactions",
  "nirc 114(c)",
  "section 114(c)",
  "sec. 114(c)",
  "114(c)",
  "rr 1-2012",
  "rr 13-2018",
  "rr 13-2018 amended",
  "rmc 40-2012",
  "rr 16-2005 withholding vat",
  "vat remittance",
  "wvat remittance",
  "vat withholding certificate",
  "withholding vat certificate",
  "supplier vat reporting",
  "vat payable vs vat withheld",
  "withholding vat vs ewt",
  "withholding vat vs cwt",
  "withholding vat vs final withholding tax",
  "2307 vat",
  "government payment voucher"
]);

export const VAT_WVAT_TAX_ALIASES = Object.freeze([
  "WITHHOLDING_VAT",
  "VAT_WITHHOLDING",
  "WVAT",
  "FINAL_WITHHOLDING_VAT",
  "FIVE_PERCENT_FINAL_WITHHOLDING_VAT",
  "GOVERNMENT_WITHHOLDING_VAT",
  "GOVERNMENT_MONEY_PAYMENT",
  "VAT_WITHHELD_AT_SOURCE",
  "VAT_REMITTANCE",
  "WVAT_REMITTANCE",
  "WVAT_CERTIFICATE",
  "GOVERNMENT_PROCUREMENT_VAT"
]);

const GOVERNMENT_PAYOR_KEYWORDS = Object.freeze([
  "government",
  "government agency",
  "national government",
  "nga",
  "local government",
  "lgu",
  "gocc",
  "government-owned or controlled corporation",
  "government owned or controlled corporation",
  "government instrumentality",
  "government office",
  "public sector",
  "procurement"
]);

const REMITTANCE_COMPLIANCE_KEYWORDS = Object.freeze([
  "remit",
  "remittance",
  "filing",
  "return",
  "deadline",
  "due date",
  "payment form",
  "bir form",
  "withholding vat certificate",
  "vat withholding certificate",
  "certificate",
  "government payment voucher",
  "voucher",
  "compliance"
]);

const WVAT_EWT_DISTINCTION_KEYWORDS = Object.freeze([
  "ewt",
  "cwt",
  "expanded withholding tax",
  "creditable withholding tax",
  "final withholding tax",
  "fwt",
  "income tax withholding",
  "withholding tax on income",
  "2307",
  "2306",
  "withholding vat vs ewt",
  "withholding vat vs cwt"
]);

const INVOICE_REPORTING_KEYWORDS = Object.freeze([
  "invoice",
  "sales invoice",
  "official receipt",
  "billing",
  "vat invoice",
  "vat return",
  "2550q",
  "2550m",
  "vat payable",
  "output vat",
  "vat withheld",
  "supplier reporting",
  "slsp",
  "summary list"
]);

const PROCUREMENT_KEYWORDS = Object.freeze([
  "procurement",
  "bid",
  "contract",
  "purchase order",
  "po",
  "notice of award",
  "payment voucher",
  "disbursement voucher",
  "government contract",
  "supply contract",
  "service contract"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "vat refund",
  "input vat refund",
  "section 112",
  "zero-rated",
  "zero rated",
  "input tax credit",
  "vat registration",
  "registration threshold",
  "transitional input tax",
  "deemed sale only"
]);

export const VAT_WVAT_TAX_ANSWER_STRUCTURE = Object.freeze({
  SIMPLE_WVAT_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. WITHHOLDING VAT RULE",
    "D. PRACTICAL NOTE"
  ],

  LEGAL_ANALYSIS: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    "D. APPLICATION TO GOVERNMENT PAYMENT",
    "E. COMPLIANCE / REMITTANCE RISK",
    "F. PRACTICAL NOTE / DOCUMENTATION REQUIRED"
  ],

  GOVERNMENT_PROCUREMENT_PAYMENT_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. GOVERNMENT PAYOR / SUPPLIER CHARACTERIZATION",
    "D. WITHHOLDING VAT COMPUTATION / REPORTING IMPACT",
    "E. DOCUMENTARY AND REMITTANCE REQUIREMENTS",
    "F. PRACTICAL POSITION"
  ]
});

export const VAT_WVAT_TAX_DOCTRINAL_METADATA = Object.freeze({
  doctrines: [
    {
      code: "WVAT_DISTINCT_FROM_INCOME_WITHHOLDING",
      label: "Withholding VAT is distinct from EWT/CWT/FWT on income",
      description:
        "Withholding VAT is a VAT mechanism and should not be confused with expanded withholding tax, creditable withholding tax, or final withholding tax on income."
    },
    {
      code: "GOVERNMENT_WITHHOLDING_CONDITIONS_REQUIRED",
      label: "Government withholding VAT requires statutory/regulatory conditions",
      description:
        "Government withholding VAT applies only when the payor, payment, supplier, transaction, and applicable authority support WVAT treatment."
    },
    {
      code: "SUPPLIER_REPORTING_IMPACT",
      label: "WVAT affects supplier VAT reporting",
      description:
        "VAT withheld by government may affect the supplier's VAT payable/reporting, subject to retrieved authority and supporting documentation."
    },
    {
      code: "GOVERNMENT_PAYMENT_CHARACTERIZATION",
      label: "Government payment classification matters",
      description:
        "The nature of the government payment, procurement, goods, services, invoice, and supplier VAT status must be characterized before concluding WVAT treatment."
    },
    {
      code: "ADMIN_ISSUANCE_LIMIT",
      label: "Administrative issuances cannot override statute",
      description:
        "Revenue regulations, RMCs, RMOs, and BIR rulings may implement or clarify the NIRC but cannot override the NIRC or controlling jurisprudence."
    }
  ],

  conflictRule:
    "Do not mark conflict automatically. Conflict metadata is valid only if same exact issue, same legal dimension, opposite rule or holding, hierarchy analysis, and conflict-resolution basis are present.",

  automaticConflictDetection: false,
  wvatIsNotEwtOrCwt: true,
  allGovernmentPaymentsAreNotAutomaticallySubjectToWvat: true,
  wvatIsNotOrdinaryOutputVatComputationOnly: true,
  rateAndRemittanceRulesRequireIndexedAuthority: true
});

export const VAT_WVAT_TAX_FACT_PATTERN_METADATA = Object.freeze({
  supportsFactPatternRouting: true,
  doesNotPerformFullFactPatternAnalysis: true,

  usableFor: [
    "government payor classification",
    "supplier VAT status review",
    "transaction/payment characterization",
    "procurement/payment documentation review",
    "invoice compliance review",
    "VAT return reporting review",
    "withholding certificate review",
    "remittance compliance review",
    "audit-risk analysis",
    "VAT/EWT distinction analysis"
  ],

  requiredFactInputs: [
    "identity of government payor",
    "whether payor is NGA, LGU, GOCC, agency, instrumentality, or other covered payor",
    "supplier VAT registration status",
    "nature of goods, services, lease, or procurement payment",
    "contract or purchase order",
    "billing and invoice support",
    "amount paid and VAT component",
    "withholding VAT certificate or support",
    "remittance proof, if available",
    "VAT return treatment",
    "whether EWT/CWT/FWT income withholding is separately involved"
  ]
});

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s%+./()–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s/-]+/g, "_");
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function scoreKeywordSet(text = "", keywords = []) {
  let score = 0;
  const matchedTerms = [];

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) continue;

    if (text.includes(normalizedKeyword)) {
      matchedTerms.push(keyword);
      score += normalizedKeyword.length >= 14 ? 3 : normalizedKeyword.length >= 8 ? 2 : 1;
    }
  }

  return { score, matchedTerms };
}

export function getVatWithholdingConfig() {
  return {
    engine: "tax-engines/VAT/engines/wvat-tax-engine.js",
    version: VAT_WVAT_TAX_ENGINE_VERSION,
    ...VAT_WVAT_TAX_SUB_ISSUE,
    keywords: VAT_WVAT_TAX_KEYWORDS,
    aliases: VAT_WVAT_TAX_ALIASES,
    answerStructure: VAT_WVAT_TAX_ANSWER_STRUCTURE,
    doctrinalMetadata: VAT_WVAT_TAX_DOCTRINAL_METADATA,
    factPatternMetadata: VAT_WVAT_TAX_FACT_PATTERN_METADATA,
    retrievalHints: buildVatWithholdingRetrievalHints()
  };
}

export function getVatWithholdingAuthorities() {
  return {
    targetAuthorities: VAT_WVAT_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_WVAT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_WVAT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_WVAT_TAX_SUB_ISSUE.supportingJurisprudence,
    preferredAuthorityTypes: VAT_WVAT_TAX_SUB_ISSUE.preferredAuthorityTypes,
    authorityHierarchy: VAT_WVAT_TAX_AUTHORITY_HIERARCHY,
    priorityFolders: VAT_WVAT_TAX_PRIORITY_FOLDERS,
    excludedFolders: VAT_WVAT_TAX_EXCLUDED_FOLDERS
  };
}

export function getVatWithholdingKeywords() {
  return {
    keywords: VAT_WVAT_TAX_KEYWORDS,
    aliases: VAT_WVAT_TAX_ALIASES,
    governmentPayorKeywords: GOVERNMENT_PAYOR_KEYWORDS,
    remittanceComplianceKeywords: REMITTANCE_COMPLIANCE_KEYWORDS,
    wvatEwtDistinctionKeywords: WVAT_EWT_DISTINCTION_KEYWORDS,
    invoiceReportingKeywords: INVOICE_REPORTING_KEYWORDS,
    procurementKeywords: PROCUREMENT_KEYWORDS,
    diversionKeywords: NEGATIVE_OR_DIVERSION_KEYWORDS
  };
}

export function normalizeVatWithholdingConcept(value = "") {
  const normalized = normalizeCode(value);

  const aliases = {
    WITHHOLDING_VAT: "WITHHOLDING_VAT",
    VAT_WITHHOLDING: "WITHHOLDING_VAT",
    WVAT: "WITHHOLDING_VAT",
    FINAL_WITHHOLDING_VAT: "FINAL_WITHHOLDING_VAT",
    FIVE_PERCENT_FINAL_WITHHOLDING_VAT: "FINAL_WITHHOLDING_VAT",
    GOVERNMENT_WITHHOLDING_VAT: "GOVERNMENT_WITHHOLDING_VAT",
    GOVERNMENT_MONEY_PAYMENT: "GOVERNMENT_MONEY_PAYMENT",
    VAT_WITHHELD_AT_SOURCE: "VAT_WITHHELD_AT_SOURCE",
    VAT_REMITTANCE: "REMITTANCE_COMPLIANCE",
    WVAT_REMITTANCE: "REMITTANCE_COMPLIANCE",
    WVAT_CERTIFICATE: "CERTIFICATE_REVIEW",
    VAT_WITHHOLDING_CERTIFICATE: "CERTIFICATE_REVIEW",
    GOVERNMENT_PROCUREMENT_VAT: "GOVERNMENT_PROCUREMENT_PAYMENT",
    WVAT_EWT_DISTINCTION: "WVAT_EWT_DISTINCTION",
    EWT_CWT_DISTINCTION: "WVAT_EWT_DISTINCTION"
  };

  return aliases[normalized] || normalized || "WITHHOLDING_VAT";
}

export function classifyVatWithholdingType(query = "") {
  const normalizedQuery = normalizeText(query);

  const governmentPayorScore = scoreKeywordSet(normalizedQuery, GOVERNMENT_PAYOR_KEYWORDS);
  const remittanceScore = scoreKeywordSet(normalizedQuery, REMITTANCE_COMPLIANCE_KEYWORDS);
  const whtDistinctionScore = scoreKeywordSet(normalizedQuery, WVAT_EWT_DISTINCTION_KEYWORDS);
  const invoiceReportingScore = scoreKeywordSet(normalizedQuery, INVOICE_REPORTING_KEYWORDS);
  const procurementScore = scoreKeywordSet(normalizedQuery, PROCUREMENT_KEYWORDS);

  const requiresGovernmentPayorCheck =
    governmentPayorScore.score > 0 ||
    /government|agency|lgu|gocc|nga|instrumentality/i.test(normalizedQuery);

  const requiresSupplierVatStatusCheck =
    /supplier|seller|contractor|vat registered|vat taxpayer/i.test(normalizedQuery);

  const requiresPaymentCharacterization =
    /payment|money payment|goods|services|lease|procurement|contract|billing/i.test(normalizedQuery) ||
    procurementScore.score > 0;

  const requiresVatWithholdingRateCheck =
    /5%|five percent|rate|final withholding vat|withholding vat rate/i.test(normalizedQuery);

  const requiresWvatEwtDistinction =
    whtDistinctionScore.score > 0 ||
    /ewt|cwt|income tax withholding|2307|2306|final withholding tax/i.test(normalizedQuery);

  const requiresRemittanceReview =
    remittanceScore.score > 0 ||
    /remit|remittance|filing|payment form|bir form|deadline|due date/i.test(normalizedQuery);

  const requiresCertificateReview =
    /certificate|withholding vat certificate|vat withholding certificate/i.test(normalizedQuery);

  const requiresInvoiceReview =
    invoiceReportingScore.score > 0 ||
    /invoice|billing|sales invoice|official receipt/i.test(normalizedQuery);

  const requiresVatReturnTieOut =
    /vat return|2550q|2550m|vat payable|output vat|slsp|summary list/i.test(normalizedQuery) ||
    invoiceReportingScore.score > 0;

  const requiresAuditEvidenceReview =
    requiresGovernmentPayorCheck ||
    requiresPaymentCharacterization ||
    requiresRemittanceReview ||
    requiresInvoiceReview;

  const requiresProcurementDocumentReview =
    procurementScore.score > 0 ||
    /procurement|purchase order|contract|payment voucher|disbursement voucher|notice of award/i.test(normalizedQuery);

  const withholdingVatType =
    requiresProcurementDocumentReview
      ? "GOVERNMENT_PROCUREMENT_WVAT"
      : requiresWvatEwtDistinction
        ? "WVAT_EWT_CWT_DISTINCTION"
        : requiresRemittanceReview
          ? "WVAT_REMITTANCE_COMPLIANCE"
          : requiresGovernmentPayorCheck
            ? "GOVERNMENT_PAYOR_WVAT"
            : "WITHHOLDING_VAT_ANALYSIS";

  const withholdingVatRiskCategory =
    requiresWvatEwtDistinction
      ? "WVAT_EWT_CWT_MISCLASSIFICATION_RISK"
      : requiresRemittanceReview
        ? "REMITTANCE_AND_COMPLIANCE_RISK"
        : requiresProcurementDocumentReview
          ? "PROCUREMENT_PAYMENT_DOCUMENTATION_RISK"
          : requiresInvoiceReview
            ? "INVOICE_AND_VAT_REPORTING_RISK"
            : "STANDARD_WVAT_RISK";

  return {
    withholdingVatType,
    withholdingVatRiskCategory,

    requiresGovernmentPayorCheck,
    requiresSupplierVatStatusCheck,
    requiresPaymentCharacterization,
    requiresVatWithholdingRateCheck,
    requiresWvatEwtDistinction,
    requiresRemittanceReview,
    requiresCertificateReview,
    requiresInvoiceReview,
    requiresVatReturnTieOut,
    requiresAuditEvidenceReview,
    requiresProcurementDocumentReview,

    distinctionRequired:
      requiresWvatEwtDistinction ||
      /output vat|vat payable|ewt|cwt|final withholding tax|withholding tax/i.test(normalizedQuery),

    candidateSubIssues: unique([
      "WITHHOLDING_VAT",
      /output vat|vat payable/i.test(normalizedQuery) ? "OUTPUT_TAX" : null,
      /ewt|expanded withholding tax|cwt|creditable withholding tax/i.test(normalizedQuery)
        ? "WHT:CREDITABLE_WHT"
        : null,
      /final withholding tax|fwt|withholding tax on income/i.test(normalizedQuery)
        ? "WHT:FINAL_WHT"
        : null
    ]),

    matchedTerms: unique([
      ...governmentPayorScore.matchedTerms,
      ...remittanceScore.matchedTerms,
      ...whtDistinctionScore.matchedTerms,
      ...invoiceReportingScore.matchedTerms,
      ...procurementScore.matchedTerms
    ])
  };
}

export function buildVatWithholdingRetrievalHints({
  reviewMode = false,
  extraAuthorities = []
} = {}) {
  return {
    domainCode: "VAT",
    domainName: "Value-Added Tax",
    subIssue: "WITHHOLDING_VAT",
    retrievalStrategy: VAT_WVAT_TAX_SUB_ISSUE.retrievalStrategy,

    targetAuthorities: unique([
      ...VAT_WVAT_TAX_SUB_ISSUE.targetAuthorities,
      ...extraAuthorities
    ]),

    controllingAuthorities: VAT_WVAT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_WVAT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_WVAT_TAX_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_WVAT_TAX_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_WVAT_TAX_EXCLUDED_FOLDERS,

    preserveControllingAuthorities: true,
    preserveTargetAuthorityMatches: true,
    preserveIssueClassificationMatches: true,
    preserveWvatSources: true,
    preserveGovernmentPaymentSources: true,
    preserveRemittanceSources: true,

    sourceGroundingRequired: true,
    compactSourcesOnly: true
  };
}

export function matchVatWithholdingQuery(query = "", options = {}) {
  return classifyVatWvatTaxQuery(query, options);
}

export function classifyVatWvatTaxQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, [
    ...VAT_WVAT_TAX_KEYWORDS,
    ...VAT_WVAT_TAX_ALIASES
  ]);

  const governmentPayor = scoreKeywordSet(normalizedQuery, GOVERNMENT_PAYOR_KEYWORDS);
  const remittanceCompliance = scoreKeywordSet(normalizedQuery, REMITTANCE_COMPLIANCE_KEYWORDS);
  const wvatEwtDistinction = scoreKeywordSet(normalizedQuery, WVAT_EWT_DISTINCTION_KEYWORDS);
  const invoiceReporting = scoreKeywordSet(normalizedQuery, INVOICE_REPORTING_KEYWORDS);
  const procurement = scoreKeywordSet(normalizedQuery, PROCUREMENT_KEYWORDS);
  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score =
    positive.score +
    governmentPayor.score * 0.55 +
    remittanceCompliance.score * 0.35 +
    wvatEwtDistinction.score * 0.45 +
    invoiceReporting.score * 0.25 +
    procurement.score * 0.35 -
    negative.score;

  const priorSubIssue = normalizeCode(options.priorSubIssue || "");
  const primaryDomain = normalizeCode(options.primaryDomain || options.domainCode || "");
  const primaryIssue = normalizeCode(options.primaryIssue || "");

  if (priorSubIssue === "WITHHOLDING_VAT") score += 6;
  if (primaryDomain === "VAT") score += 3;
  if (primaryIssue === "VAT" || primaryIssue === "WITHHOLDING_VAT") score += 2;
  if (primaryIssue === "WHT" || primaryIssue === "WITHHOLDING") score += 1;

  const withholdingType = classifyVatWithholdingType(query);

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 24, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/wvat-tax-engine.js",
    version: VAT_WVAT_TAX_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "WITHHOLDING_VAT",
    primarySubIssue: "WITHHOLDING_VAT",
    subIssue: "WITHHOLDING_VAT",

    matched: score > 0,
    score,
    confidence,

    matchedTerms: unique([
      ...positive.matchedTerms,
      ...governmentPayor.matchedTerms,
      ...remittanceCompliance.matchedTerms,
      ...wvatEwtDistinction.matchedTerms,
      ...invoiceReporting.matchedTerms,
      ...procurement.matchedTerms,
      ...withholdingType.matchedTerms
    ]),

    diversionTerms: negative.matchedTerms,

    shouldUseThisEngine: score > 0 && confidence >= 0.45,
    fallbackClassificationUsed: score <= 0,

    distinctionRequired: withholdingType.distinctionRequired,
    candidateSubIssues: withholdingType.candidateSubIssues,

    ...withholdingType,

    retrievalStrategy: VAT_WVAT_TAX_SUB_ISSUE.retrievalStrategy,
    targetAuthorities: VAT_WVAT_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_WVAT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_WVAT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_WVAT_TAX_SUB_ISSUE.supportingJurisprudence,
    sourceGroundingRequired: true
  };
}

export function buildVatWvatTaxRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 10,
  reviewMode = false
} = {}) {
  const classification = classifyVatWvatTaxQuery(query, {
    primaryDomain:
      issueClassification.primaryDomain ||
      issueClassification.domainCode,
    primaryIssue:
      issueClassification.primaryIssue,
    priorSubIssue:
      issueClassification.primarySubIssue ||
      issueClassification.subIssue ||
      issueClassification.taxDomainClassification?.primarySubIssue
  });

  const targetAuthorityTypes = sortAuthorityTypes(
    buildTargetAuthorityProfile({
      primaryDomain: "VAT",
      primaryIssue: "VAT",
      subIssues: ["WITHHOLDING_VAT"],
      targetAuthorities: VAT_WVAT_TAX_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 114(C) withholding VAT government money payments",
    "RR 1-2012 final withholding VAT government money payments",
    "RR 13-2018 5% final withholding VAT government transactions",
    "RMC 40-2012 withholding VAT government transactions",
    "RR 16-2005 withholding VAT provisions government payments",
    "withholding VAT government payments supplier VAT reporting",
    "withholding VAT versus EWT CWT final withholding tax income",
    "government procurement VAT withholding certificate remittance",
    ...classification.matchedTerms.map((term) => `withholding VAT government ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  return {
    engine: "tax-engines/VAT/engines/wvat-tax-engine.js",
    version: VAT_WVAT_TAX_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "WITHHOLDING_VAT",
    primarySubIssue: "WITHHOLDING_VAT",
    subIssue: "WITHHOLDING_VAT",

    retrievalStrategy: VAT_WVAT_TAX_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_WVAT_TAX_SUB_ISSUE.legalDimensions,

    targetAuthorities: VAT_WVAT_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_WVAT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_WVAT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_WVAT_TAX_SUB_ISSUE.supportingJurisprudence,

    targetAuthorityTypes,
    namedTargetAuthorities: VAT_WVAT_TAX_SUB_ISSUE.targetAuthorities,

    governingStatutes: [
      "NIRC Sec. 114(C)",
      "RR 1-2012",
      "RR 13-2018",
      "RMC 40-2012",
      "RR 16-2005 withholding VAT provisions"
    ],

    preferredCases: VAT_WVAT_TAX_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_WVAT_TAX_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_WVAT_TAX_EXCLUDED_FOLDERS,

    searchQueries,

    boostTerms: unique([
      "Withholding VAT",
      "WVAT",
      "Final Withholding VAT",
      "5% Final Withholding VAT",
      "Government Transactions",
      "Government Money Payments",
      "NIRC Sec. 114(C)",
      "RR 1-2012",
      "RR 13-2018",
      "RMC 40-2012",
      "RR 16-2005",
      "Government Payor",
      "Government Procurement",
      "VAT Withholding Certificate",
      "VAT Remittance",
      "WVAT vs EWT",
      "WVAT vs CWT",
      ...VAT_WVAT_TAX_SUB_ISSUE.legalConcepts,
      ...classification.matchedTerms
    ]),

    suppressIssues: [
      "DEFINITION",
      "REFUND_CREDIT",
      "ZERO_RATING",
      "INPUT_TAX",
      "EXEMPTION",
      !classification.candidateSubIssues.includes("OUTPUT_TAX") ? "OUTPUT_TAX" : null,
      "REGISTRATION",
      "COMPLIANCE",
      "TRANSITIONAL_INPUT_TAX",
      "DEEMED_SALE"
    ].filter(Boolean),

    distinctionRequired: classification.distinctionRequired,
    candidateSubIssues: classification.candidateSubIssues,

    sourceGroundingRequired: true,
    tpmProfile: VAT_WVAT_TAX_SUB_ISSUE.tpmProfile,
    compactSourcesOnly: true,

    classification
  };
}

export function buildVatWvatTaxAnswerRules(mode = "LEGAL_ANALYSIS") {
  const normalizedMode = normalizeCode(mode);

  const structure =
    normalizedMode === "SIMPLE_WVAT_QUERY" ||
    normalizedMode === "FAST_DEFINITION" ||
    normalizedMode === "QUICK"
      ? VAT_WVAT_TAX_ANSWER_STRUCTURE.SIMPLE_WVAT_QUERY
      : normalizedMode === "GOVERNMENT_PROCUREMENT_PAYMENT_QUERY" ||
          normalizedMode === "PROCUREMENT" ||
          normalizedMode === "GOVERNMENT_PAYMENT"
        ? VAT_WVAT_TAX_ANSWER_STRUCTURE.GOVERNMENT_PROCUREMENT_PAYMENT_QUERY
        : VAT_WVAT_TAX_ANSWER_STRUCTURE.LEGAL_ANALYSIS;

  return {
    engine: "tax-engines/VAT/engines/wvat-tax-engine.js",
    version: VAT_WVAT_TAX_ENGINE_VERSION,

    requiredStructure: structure,
    answerStructure: VAT_WVAT_TAX_ANSWER_STRUCTURE,

    directAnswerRule:
      "Determine withholding VAT only from retrieved indexed authorities and supplied facts. Do not confuse WVAT with EWT, CWT, final withholding tax on income, or ordinary output VAT computation.",

    controllingLegalBasisRule:
      "Prioritize NIRC Sec. 114(C), RR 1-2012, RR 13-2018, RMC 40-2012, and RR 16-2005 withholding VAT provisions where applicable.",

    governmentPayorRule:
      "Check whether the payor is a covered government office, agency, instrumentality, LGU, GOCC, or other government payor under retrieved authority before concluding WVAT treatment.",

    paymentCharacterizationRule:
      "Characterize the payment, supplier VAT status, goods/services/lease/procurement arrangement, invoice, and VAT component before applying WVAT.",

    distinctionRule:
      "Separate WVAT from EWT/CWT and final withholding tax on income. If income tax withholding is involved, route that portion to the WHT domain.",

    rateRule:
      "Do not hallucinate WVAT rate, computation, forms, deadlines, or remittance rules. Use only retrieved indexed authority.",

    remittanceRule:
      "If remittance or compliance is involved, require remittance support, applicable BIR form or certificate, government payment voucher, and VAT return/reporting tie-out based on retrieved authority.",

    supplierReportingRule:
      "If supplier reporting is involved, flag VAT payable, VAT withheld, VAT return disclosure, invoice support, and SLSP tie-out as potential reconciliation points.",

    auditRiskRule:
      "Flag WVAT/EWT misclassification, wrong payor classification, unsupported government payment characterization, missing certificate/remittance proof, invoice deficiencies, and VAT return mismatch where relevant.",

    conflictRule:
      VAT_WVAT_TAX_DOCTRINAL_METADATA.conflictRule,

    exclusionRule:
      "Do not treat VAT refund, zero-rating, input tax, output VAT computation, registration, exemption, or transitional input tax as the controlling issue unless the query specifically asks those issues.",

    insufficientSourceRule:
      'If indexed controlling authorities are not available, say: "Indexed source not found."',

    noFinalAnswerGeneration: true
  };
}

export function enhanceIssueClassificationWithVatWvatTax(issueClassification = {}, query = "") {
  const reviewMode =
    issueClassification.reviewMode === true ||
    issueClassification.requiresReviewMode === true ||
    issueClassification.queryIntent?.requiresReviewMode === true ||
    issueClassification.intentFlags?.requiresReviewMode === true;

  const retrievalPlan = buildVatWvatTaxRetrievalPlan({
    query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
    issueClassification,
    reviewMode
  });

  return {
    ...issueClassification,

    primaryDomain: "VAT",
    primaryDomainName: "Value-Added Tax",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: issueClassification.primaryIssue || "VAT",
    legacyPrimaryIssue: "WITHHOLDING_VAT",
    primarySubIssue: "WITHHOLDING_VAT",
    subIssue: "WITHHOLDING_VAT",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "VAT",
      "WITHHOLDING_VAT"
    ]),

    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "SUBSTANTIVE",
      "COMPLIANCE",
      "PROCEDURAL",
      "EVIDENTIARY",
      "AUDIT",
      "TRANSACTION"
    ]),

    targetAuthorities: retrievalPlan.targetAuthorities,
    controllingAuthorities: retrievalPlan.controllingAuthorities,
    supportingAuthorities: retrievalPlan.supportingAuthorities,
    supportingJurisprudence: retrievalPlan.supportingJurisprudence,

    retrievalStrategy: retrievalPlan.retrievalStrategy,
    priorityFolders: retrievalPlan.priorityFolders,
    excludedFolders: retrievalPlan.excludedFolders,
    tpmProfile: retrievalPlan.tpmProfile,
    sourceGroundingRequired: true,

    distinctionRequired: retrievalPlan.classification.distinctionRequired,
    candidateSubIssues: retrievalPlan.classification.candidateSubIssues,

    wvatFlags: {
      requiresGovernmentPayorCheck: retrievalPlan.classification.requiresGovernmentPayorCheck,
      requiresSupplierVatStatusCheck: retrievalPlan.classification.requiresSupplierVatStatusCheck,
      requiresPaymentCharacterization: retrievalPlan.classification.requiresPaymentCharacterization,
      requiresVatWithholdingRateCheck: retrievalPlan.classification.requiresVatWithholdingRateCheck,
      requiresWvatEwtDistinction: retrievalPlan.classification.requiresWvatEwtDistinction,
      requiresRemittanceReview: retrievalPlan.classification.requiresRemittanceReview,
      requiresCertificateReview: retrievalPlan.classification.requiresCertificateReview,
      requiresInvoiceReview: retrievalPlan.classification.requiresInvoiceReview,
      requiresVatReturnTieOut: retrievalPlan.classification.requiresVatReturnTieOut,
      requiresAuditEvidenceReview: retrievalPlan.classification.requiresAuditEvidenceReview,
      requiresProcurementDocumentReview: retrievalPlan.classification.requiresProcurementDocumentReview
    },

    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),

      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      domainCode: "VAT",
      domainName: "Value-Added Tax",

      primaryIssue: issueClassification.primaryIssue || "VAT",
      legacyPrimaryIssue: "WITHHOLDING_VAT",
      primarySubIssue: "WITHHOLDING_VAT",
      subIssue: "WITHHOLDING_VAT",
      subIssues: ["WITHHOLDING_VAT"],

      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      controllingAuthorities: retrievalPlan.controllingAuthorities,
      supportingAuthorities: retrievalPlan.supportingAuthorities,
      supportingJurisprudence: retrievalPlan.supportingJurisprudence,

      retrievalStrategy: retrievalPlan.retrievalStrategy,
      priorityFolders: retrievalPlan.priorityFolders,
      excludedFolders: retrievalPlan.excludedFolders,
      requiredAnswerSections: VAT_WVAT_TAX_ANSWER_STRUCTURE.LEGAL_ANALYSIS,
      tpmProfile: retrievalPlan.tpmProfile,
      sourceGroundingRequired: true,

      retrievalHints: buildVatWithholdingRetrievalHints({
        reviewMode
      }),

      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/wvat-tax-engine.js",
        identityEngineCode: "WITHHOLDING_VAT",
        requiresIssueSpecificRetrieval: true,
        requiresAuthorityHierarchy: true,
        requiresSupersessionCheck: true,
        requiresConflictCheck: false,
        requiresJurisprudence: false,
        requiresEvidenceEvaluation: true,
        requiresFactPatternEngine: true,
        supportsFactPatternRouting: true,
        requiresLegalValidation: true,
        requiresWhtDomainRouting:
          retrievalPlan.classification.requiresWvatEwtDistinction
      },

      confidence: retrievalPlan.classification.confidence,
      fallbackClassificationUsed: retrievalPlan.classification.fallbackClassificationUsed
    },

    vatWvatTax: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatWvatTaxAnswerRules(
        retrievalPlan.classification.requiresProcurementDocumentReview
          ? "GOVERNMENT_PROCUREMENT_PAYMENT_QUERY"
          : issueClassification.responseMode ||
              issueClassification.orchestrationMode ||
              "LEGAL_ANALYSIS"
      ),
      doctrinalMetadata: VAT_WVAT_TAX_DOCTRINAL_METADATA,
      factPatternMetadata: VAT_WVAT_TAX_FACT_PATTERN_METADATA
    }
  };
}

export function validateVatWvatTaxSource(doc = {}) {
  const haystack = normalizeText(
    [
      doc.title,
      doc.source,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.folder,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.normalizedReference,
      doc.normalized_reference,
      doc.metadata?.normalizedReference,
      doc.citation,
      doc.reference,
      doc.authorityType,
      doc.authority_type,
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview
    ]
      .filter(Boolean)
      .join(" ")
  );

  const positive = scoreKeywordSet(haystack, [
    "nirc 114(c)",
    "section 114(c)",
    "sec. 114(c)",
    "rr 1-2012",
    "rr 13-2018",
    "rmc 40-2012",
    "rr 16-2005",
    "withholding vat",
    "wvat",
    "final withholding vat",
    "5% final withholding vat",
    "government transactions",
    "government money payments",
    "government agency",
    "national government",
    "local government",
    "gocc",
    "vat withheld"
  ]);

  const negative = scoreKeywordSet(haystack, [
    "expanded withholding tax",
    "creditable withholding tax",
    "final withholding tax on income",
    "section 112",
    "vat refund",
    "input vat refund",
    "zero-rated",
    "input tax",
    "vat registration"
  ]);

  const authorityType = String(
    doc.authorityType ||
      doc.authority_type ||
      doc.metadata?.authorityType ||
      "UNKNOWN"
  ).toUpperCase();

  const authorityAllowed = [
    "STATUTE",
    "NIRC",
    "TAX_CODE",
    "RR",
    "RMC",
    "RMO",
    "BIR_RULING",
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "CTA_DIVISION"
  ].includes(authorityType);

  const score = positive.score - negative.score + (authorityAllowed ? 3 : 0);

  return {
    relevant: score > 0,
    score,
    authorityAllowed,
    matchedTerms: positive.matchedTerms,
    diversionTerms: negative.matchedTerms,
    authorityType,
    sourceGroundingCompatible: true,
    shouldPreserveForVatWvat:
      score > 0 && authorityAllowed
  };
}

export function vatWvatTaxEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_WVAT_TAX_ENGINE",
    version: VAT_WVAT_TAX_ENGINE_VERSION,
    domain: "VAT",
    subIssue: "WITHHOLDING_VAT",

    targetAuthorities: VAT_WVAT_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_WVAT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_WVAT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_WVAT_TAX_SUB_ISSUE.supportingJurisprudence,

    retrievalStrategy: VAT_WVAT_TAX_SUB_ISSUE.retrievalStrategy,
    priorityFolders: VAT_WVAT_TAX_PRIORITY_FOLDERS,
    excludedFolders: VAT_WVAT_TAX_EXCLUDED_FOLDERS,

    supportsIssueClassificationEngine: true,
    supportsVatDomainConfig: true,
    supportsRetrievalEngine: true,
    supportsRerankerEngine: true,
    supportsContextOrchestrationEngine: true,
    supportsRagAnswerHandler: true,
    supportsAuthorityEngine: true,
    supportsLegalValidationEngine: true,
    supportsAnswerRenderer: true,

    noOpenAICalls: true,
    noDirectRetrieval: true,
    noFinalAnswerGeneration: true,
    tpmConscious: true,
    sourceGroundingRequired: true,

    supportsGovernmentTransactionAnalysis: true,
    supportsFivePercentFinalWithholdingVat: true,
    supportsRemittanceCompliance: true,
    supportsSupplierVatReportingImpact: true,
    supportsProcurementPaymentAnalysis: true,

    avoidsIncomeWithholdingMisclassification: true,
    avoidsEwtCwtConfusion: true,
    avoidsOrdinaryOutputVatMisclassification: true
  };
}

export {
  VAT_WVAT_TAX_ENGINE_VERSION as VAT_WITHHOLDING_ENGINE_VERSION,
  VAT_WVAT_TAX_SUB_ISSUE as VAT_WITHHOLDING_SUB_ISSUE,
  VAT_WVAT_TAX_PRIORITY_FOLDERS as VAT_WITHHOLDING_PRIORITY_FOLDERS,
  VAT_WVAT_TAX_EXCLUDED_FOLDERS as VAT_WITHHOLDING_EXCLUDED_FOLDERS,
  VAT_WVAT_TAX_AUTHORITY_HIERARCHY as VAT_WITHHOLDING_AUTHORITY_HIERARCHY,
  VAT_WVAT_TAX_KEYWORDS as VAT_WITHHOLDING_KEYWORDS,
  VAT_WVAT_TAX_ALIASES as VAT_WITHHOLDING_ALIASES,
  VAT_WVAT_TAX_ANSWER_STRUCTURE as VAT_WITHHOLDING_ANSWER_STRUCTURE,
  VAT_WVAT_TAX_DOCTRINAL_METADATA as VAT_WITHHOLDING_DOCTRINAL_METADATA,
  VAT_WVAT_TAX_FACT_PATTERN_METADATA as VAT_WITHHOLDING_FACT_PATTERN_METADATA,

  classifyVatWvatTaxQuery as classifyVatWithholdingVatQuery,
  buildVatWvatTaxRetrievalPlan as buildVatWithholdingVatRetrievalPlan,
  buildVatWvatTaxAnswerRules as buildVatWithholdingVatAnswerRules,
  enhanceIssueClassificationWithVatWvatTax as enhanceIssueClassificationWithVatWithholdingVat,
  validateVatWvatTaxSource as validateVatWithholdingVatSource,
  vatWvatTaxEngineHealthCheck as vatWithholdingVatEngineHealthCheck
};

export default {
  VAT_WVAT_TAX_ENGINE_VERSION,
  VAT_WVAT_TAX_SUB_ISSUE,
  VAT_WVAT_TAX_PRIORITY_FOLDERS,
  VAT_WVAT_TAX_EXCLUDED_FOLDERS,
  VAT_WVAT_TAX_AUTHORITY_HIERARCHY,
  VAT_WVAT_TAX_KEYWORDS,
  VAT_WVAT_TAX_ALIASES,
  VAT_WVAT_TAX_ANSWER_STRUCTURE,
  VAT_WVAT_TAX_DOCTRINAL_METADATA,
  VAT_WVAT_TAX_FACT_PATTERN_METADATA,

  getVatWithholdingConfig,
  getVatWithholdingAuthorities,
  getVatWithholdingKeywords,
  matchVatWithholdingQuery,
  normalizeVatWithholdingConcept,
  classifyVatWithholdingType,
  buildVatWithholdingRetrievalHints,

  classifyVatWvatTaxQuery,
  buildVatWvatTaxRetrievalPlan,
  buildVatWvatTaxAnswerRules,
  enhanceIssueClassificationWithVatWvatTax,
  validateVatWvatTaxSource,
  vatWvatTaxEngineHealthCheck,

  classifyVatWithholdingVatQuery: classifyVatWvatTaxQuery,
  buildVatWithholdingVatRetrievalPlan: buildVatWvatTaxRetrievalPlan,
  buildVatWithholdingVatAnswerRules: buildVatWvatTaxAnswerRules,
  enhanceIssueClassificationWithVatWithholdingVat: enhanceIssueClassificationWithVatWvatTax,
  validateVatWithholdingVatSource: validateVatWvatTaxSource,
  vatWithholdingVatEngineHealthCheck: vatWvatTaxEngineHealthCheck
};
