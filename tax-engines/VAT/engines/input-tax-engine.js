// FILE: tax-engines/VAT/engines/input-tax-engine.js
"use strict";

/**
 * TINA VAT Input Tax Engine
 * Version: 2.0.0
 *
 * VAT → INPUT_TAX
 *
 * Scope:
 * - creditable input VAT
 * - substantiation
 * - invoice / OR compliance
 * - mixed transaction allocation
 * - exempt vs VATable allocation
 * - zero-rated attribution
 * - carry-over
 * - refund overlap routing
 * - audit-risk indicators
 * - VAT return tie-out
 *
 * Boundary:
 * - No OpenAI calls
 * - No final-answer generation
 * - No retrieval duplication
 * - No orchestration duplication
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../../shared/authority-hierarchy.js";

export const VAT_INPUT_TAX_ENGINE_VERSION = "2.0.0";

export const VAT_INPUT_TAX_PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS",
  "06_COURT_CASES"
]);

export const VAT_INPUT_TAX_EXCLUDED_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

export const VAT_INPUT_TAX_AUTHORITY_HIERARCHY = Object.freeze([
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

export const VAT_INPUT_TAX_SUB_ISSUE = Object.freeze({
  code: "INPUT_TAX",
  subIssue: "INPUT_TAX",

  domain: "VAT",
  domainCode: "VAT",
  domainName: "Value-Added Tax",

  title:
    "Input Tax — Creditable Input VAT; Substantiation; Allocation; Audit Risk",

  description:
    "Reusable VAT INPUT_TAX sub-issue engine for creditable input VAT, substantiation, invoice/OR compliance, mixed transaction allocation, disallowance risk, carry-over, and refund-overlap routing.",

  primaryIssue: "VAT",
  legacyPrimaryIssue: "INPUT_TAX",
  primarySubIssue: "INPUT_TAX",

  retrievalStrategy:
    "VAT_INPUT_TAX_SUBSTANTIATION_FIRST",

  targetAuthorities: [
    "NIRC Sec. 110",
    "RR 16-2005 Sec. 4.110",
    "Invoice/substantiation provisions under the NIRC and VAT regulations",
    "RMC 42-2003",
    "Issue-relevant jurisprudence if retrieved"
  ],

  controllingAuthorities: [
    "NIRC Sec. 110",
    "RR 16-2005 Sec. 4.110",
    "Applicable invoice/substantiation provisions"
  ],

  supportingAuthorities: [
    "RMC 42-2003",
    "Applicable RMCs/RRs on invoicing and substantiation",
    "Relevant e-invoicing/e-receipting issuances if retrieved"
  ],

  supportingJurisprudence: [
    "CIR v. Medicard Philippines",
    "Issue-relevant Supreme Court or CTA cases only if retrieved"
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
    "NIRC Sec. 110",
    "RR 16-2005 Sec. 4.110",
    "Invoice/substantiation provisions",
    "RMC 42-2003",
    "Issue-relevant jurisprudence",
    "Sec. 112 authorities only if refund overlap exists"
  ],

  priorityFolders: VAT_INPUT_TAX_PRIORITY_FOLDERS,
  excludedFolders: VAT_INPUT_TAX_EXCLUDED_FOLDERS,

  authorityHierarchy:
    VAT_INPUT_TAX_AUTHORITY_HIERARCHY,

  legalDimensions: [
    "SUBSTANTIVE",
    "EVIDENTIARY",
    "COMPLIANCE",
    "ACCOUNTING",
    "AUDIT"
  ],

  legalConcepts: [
    "creditable input VAT",
    "input VAT substantiation",
    "valid VAT invoice",
    "official receipt support",
    "sales invoice support",
    "mixed transaction allocation",
    "zero-rated attribution",
    "input VAT disallowance",
    "carry-over",
    "refund overlap",
    "capital goods input VAT",
    "input VAT amortization",
    "supplier VAT registration",
    "VAT return tie-out",
    "SLSP reconciliation",
    "audit-risk analysis"
  ],

  tpmProfile: "STANDARD",

  sourceGroundingRequired: true,

  doctrinallySensitive: true,
  conflictSensitive: true,
  litigationSensitive: false,
  auditRiskSensitive: true,
  substantiationSensitive: true,
  invoiceSensitive: true,
  refundOverlapSensitive: true,
  allocationSensitive: true,
  mixedTransactionSensitive: true,

  inputTaxType:
    "CREDITABLE_INPUT_TAX_ANALYSIS",

  inputTaxRiskCategory:
    "SUBSTANTIATION_AND_ALLOCATION_RISK",

  relatedButDifferentIssues: [
    "DEFINITION",
    "REFUND_CREDIT",
    "ZERO_RATING",
    "EXEMPTION",
    "OUTPUT_TAX",
    "REGISTRATION",
    "COMPLIANCE",
    "WITHHOLDING_VAT",
    "TRANSITIONAL_INPUT_TAX",
    "DEEMED_SALE"
  ]
});

export const VAT_INPUT_TAX_KEYWORDS = Object.freeze([
  "input tax",
  "input vat",
  "creditable input tax",
  "creditable input vat",
  "input tax credit",
  "input vat credit",
  "claim input vat",
  "sec. 110",
  "section 110",
  "nirc 110",
  "nirc sec. 110",
  "rr 16-2005 sec. 4.110",
  "sec. 4.110",
  "4.110",
  "vat invoice",
  "official receipt",
  "sales invoice",
  "invoice compliance",
  "invoice substantiation",
  "substantiation",
  "vat substantiation",
  "input vat allocation",
  "mixed transactions",
  "allocation",
  "capital goods",
  "capital goods input tax",
  "amortization",
  "carry-over",
  "carry over",
  "supplier vat status",
  "vat registration status",
  "input vat refund",
  "disallowed input vat",
  "input vat disallowance",
  "zero-rated input vat",
  "exempt sales input vat",
  "timing of input tax",
  "input tax recognition",
  "slsp",
  "2550q",
  "vat return tie-out",
  "medicard",
  "medicard philippines",
  "rmc 42-2003",
  "e-invoicing",
  "e-receipting"
]);

export const VAT_INPUT_TAX_ALIASES = Object.freeze([
  "VAT_INPUT_TAX",
  "INPUT_VAT",
  "INPUT_VAT_CREDIT",
  "CREDITABLE_INPUT_VAT",
  "INPUT_TAX_CREDIT",
  "VAT_SUBSTANTIATION",
  "INPUT_TAX_ALLOCATION",
  "INPUT_VAT_ALLOCATION",
  "INPUT_VAT_DISALLOWANCE",
  "CAPITAL_GOODS_INPUT_VAT",
  "INPUT_VAT_CARRY_OVER"
]);

const REFUND_OVERLAP_KEYWORDS = Object.freeze([
  "refund",
  "tax credit certificate",
  "tcc",
  "section 112",
  "sec. 112",
  "unutilized input vat",
  "excess input vat",
  "administrative claim",
  "judicial claim",
  "120-day",
  "120 day",
  "30-day",
  "30 day"
]);

const ZERO_RATING_OVERLAP_KEYWORDS = Object.freeze([
  "zero-rated",
  "zero rated",
  "0% vat",
  "effectively zero-rated",
  "export sales",
  "cross-border",
  "destination principle"
]);

const EXEMPTION_OVERLAP_KEYWORDS = Object.freeze([
  "vat exempt",
  "section 109",
  "sec. 109",
  "non-vat",
  "non vat",
  "exempt sales"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "define vat",
  "what is vat",
  "output vat only",
  "registration threshold",
  "withholding vat",
  "5% final withholding vat"
]);

export const VAT_INPUT_TAX_ANSWER_STRUCTURE = Object.freeze({
  SIMPLE_INPUT_TAX_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUBSTANTIATION REQUIREMENT",
    "D. PRACTICAL NOTE"
  ],

  LEGAL_ANALYSIS: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    "D. APPLICATION TO TRANSACTION OR DOCUMENTS",
    "E. AUDIT RISK / DISALLOWANCE RISK",
    "F. PRACTICAL NOTE / DOCUMENTATION REQUIRED"
  ],

  REFUND_OVERLAP_INPUT_TAX_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. INPUT TAX QUALIFICATION",
    "D. REFUND / CREDIT ROUTING",
    "E. DOCUMENTARY REQUIREMENTS",
    "F. PRACTICAL POSITION"
  ]
});

export const VAT_INPUT_TAX_DOCTRINAL_METADATA = Object.freeze({
  doctrines: [
    {
      code: "VALID_DOCUMENT_SUPPORT",
      label: "Input VAT requires valid VAT document support",
      description:
        "Input VAT creditability must be supported by valid VAT invoice, official receipt, sales invoice, or other applicable VAT documentation under the governing rules."
    },
    {
      code: "ATTRIBUTION_TO_TAXABLE_ACTIVITY",
      label: "Input VAT must be attributable to VATable or zero-rated taxable activity",
      description:
        "Input VAT must be connected to VATable or zero-rated transactions unless a specific rule permits a different treatment."
    },
    {
      code: "EXEMPT_SALE_ALLOCATION",
      label: "Input VAT related to exempt sales may be non-creditable or subject to allocation",
      description:
        "Input VAT attributable to exempt transactions may be disallowed, expensed, or allocated depending on the applicable rule and facts."
    },
    {
      code: "REFUND_ROUTING",
      label: "Refund overlap requires Sec. 112 routing",
      description:
        "Input VAT refund or credit claims, especially unutilized input VAT from zero-rated sales, must be routed to VAT REFUND_CREDIT analysis."
    },
    {
      code: "SUBSTANTIATION_DEFECT_RISK",
      label: "Substantiation defects create disallowance risk",
      description:
        "Defects in VAT documentation, supplier status, invoice particulars, or linkage to taxable activity create audit and disallowance risk."
    },
    {
      code: "ADMIN_ISSUANCE_LIMIT",
      label: "Administrative issuances cannot override the NIRC",
      description:
        "Administrative issuances may implement or clarify the law but cannot override the NIRC or controlling jurisprudence."
    }
  ],

  conflictRule:
    "Do not mark conflict automatically. Conflict metadata is valid only if same exact issue, same legal dimension, opposite rule or holding, hierarchy analysis, and conflict-resolution basis are present.",

  automaticConflictDetection: false,
  refundIsSeparateSubIssue: true,
  unsupportedInputVatIsNotAutomaticallyCreditable: true,
  exemptInputVatIsNotAutomaticallyCreditable: true
});

export const VAT_INPUT_TAX_FACT_PATTERN_METADATA = Object.freeze({
  supportsFactPatternRouting: true,
  doesNotPerformFullFactPatternAnalysis: true,

  usableFor: [
    "transaction characterization",
    "supplier/customer VAT status review",
    "document sufficiency review",
    "input VAT allocation analysis",
    "mixed transaction analysis",
    "economic substance analysis",
    "audit-risk analysis",
    "VAT return reconciliation",
    "SLSP/VAT return tie-out",
    "refund eligibility routing",
    "CAJE/tax adjustment review"
  ],

  requiredFactInputs: [
    "nature of purchase or importation",
    "supplier VAT registration status",
    "VAT invoice / official receipt / sales invoice details",
    "TIN and VAT separately indicated where applicable",
    "linkage to VATable, zero-rated, exempt, or mixed transactions",
    "whether input VAT is claimed as credit, carry-over, expense, or refund",
    "VAT return treatment",
    "SLSP tie-out",
    "supporting schedules and source documents"
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

export function getVatInputTaxConfig() {
  return {
    engine: "tax-engines/VAT/engines/input-tax-engine.js",
    version: VAT_INPUT_TAX_ENGINE_VERSION,
    ...VAT_INPUT_TAX_SUB_ISSUE,
    keywords: VAT_INPUT_TAX_KEYWORDS,
    aliases: VAT_INPUT_TAX_ALIASES,
    answerStructure: VAT_INPUT_TAX_ANSWER_STRUCTURE,
    doctrinalMetadata: VAT_INPUT_TAX_DOCTRINAL_METADATA,
    factPatternMetadata: VAT_INPUT_TAX_FACT_PATTERN_METADATA,
    retrievalHints: buildVatInputTaxRetrievalHints()
  };
}

export function getVatInputTaxAuthorities() {
  return {
    targetAuthorities: VAT_INPUT_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_INPUT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_INPUT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_INPUT_TAX_SUB_ISSUE.supportingJurisprudence,
    preferredAuthorityTypes: VAT_INPUT_TAX_SUB_ISSUE.preferredAuthorityTypes,
    authorityHierarchy: VAT_INPUT_TAX_AUTHORITY_HIERARCHY,
    priorityFolders: VAT_INPUT_TAX_PRIORITY_FOLDERS,
    excludedFolders: VAT_INPUT_TAX_EXCLUDED_FOLDERS
  };
}

export function getVatInputTaxKeywords() {
  return {
    keywords: VAT_INPUT_TAX_KEYWORDS,
    aliases: VAT_INPUT_TAX_ALIASES,
    refundOverlapKeywords: REFUND_OVERLAP_KEYWORDS,
    zeroRatingOverlapKeywords: ZERO_RATING_OVERLAP_KEYWORDS,
    exemptionOverlapKeywords: EXEMPTION_OVERLAP_KEYWORDS,
    diversionKeywords: NEGATIVE_OR_DIVERSION_KEYWORDS
  };
}

export function normalizeVatInputTaxConcept(value = "") {
  const normalized = normalizeCode(value);

  const aliases = {
    INPUT_TAX: "INPUT_TAX",
    VAT_INPUT_TAX: "INPUT_TAX",
    INPUT_VAT: "INPUT_TAX",
    CREDITABLE_INPUT_TAX: "CREDITABLE_INPUT_TAX",
    CREDITABLE_INPUT_VAT: "CREDITABLE_INPUT_TAX",
    INPUT_TAX_CREDIT: "CREDITABLE_INPUT_TAX",
    INPUT_VAT_CREDIT: "CREDITABLE_INPUT_TAX",
    VAT_SUBSTANTIATION: "SUBSTANTIATION",
    SUBSTANTIATION: "SUBSTANTIATION",
    INPUT_TAX_ALLOCATION: "INPUT_TAX_ALLOCATION",
    INPUT_VAT_ALLOCATION: "INPUT_TAX_ALLOCATION",
    MIXED_TRANSACTIONS: "MIXED_TRANSACTION_ALLOCATION",
    EXEMPT_SALES_INPUT_VAT: "EXEMPT_SALE_ALLOCATION",
    ZERO_RATED_INPUT_VAT: "ZERO_RATED_ATTRIBUTION",
    INPUT_VAT_REFUND: "REFUND_OVERLAP",
    INPUT_TAX_REFUND: "REFUND_OVERLAP",
    CARRY_OVER: "CARRY_OVER_ANALYSIS",
    INPUT_VAT_CARRY_OVER: "CARRY_OVER_ANALYSIS",
    CAPITAL_GOODS: "CAPITAL_GOODS_INPUT_TAX",
    CAPITAL_GOODS_INPUT_VAT: "CAPITAL_GOODS_INPUT_TAX",
    DISALLOWED_INPUT_VAT: "DISALLOWANCE_RISK",
    INPUT_VAT_DISALLOWANCE: "DISALLOWANCE_RISK",
    VAT_RETURN_TIE_OUT: "VAT_RETURN_TIE_OUT",
    SLSP_TIE_OUT: "SLSP_TIE_OUT"
  };

  return aliases[normalized] || normalized || "INPUT_TAX";
}

export function classifyVatInputTaxType(query = "") {
  const normalizedQuery = normalizeText(query);

  const substantiationScore = scoreKeywordSet(normalizedQuery, [
    "substantiation",
    "invoice",
    "official receipt",
    "sales invoice",
    "vat invoice",
    "invoice compliance",
    "documentary support",
    "supporting documents"
  ]);

  const allocationScore = scoreKeywordSet(normalizedQuery, [
    "allocation",
    "mixed transactions",
    "mixed sales",
    "vatable and exempt",
    "exempt sales input vat",
    "input vat allocation"
  ]);

  const zeroRatedScore = scoreKeywordSet(normalizedQuery, ZERO_RATING_OVERLAP_KEYWORDS);
  const exemptionScore = scoreKeywordSet(normalizedQuery, EXEMPTION_OVERLAP_KEYWORDS);
  const refundScore = scoreKeywordSet(normalizedQuery, REFUND_OVERLAP_KEYWORDS);

  const carryOverScore = scoreKeywordSet(normalizedQuery, [
    "carry-over",
    "carry over",
    "carried over",
    "excess input tax carried over"
  ]);

  const disallowanceScore = scoreKeywordSet(normalizedQuery, [
    "disallow",
    "disallowed",
    "disallowance",
    "unsupported input vat",
    "invalid invoice",
    "supplier not vat registered",
    "audit finding"
  ]);

  const returnTieOutScore = scoreKeywordSet(normalizedQuery, [
    "2550q",
    "2550m",
    "vat return",
    "slsp",
    "summary list",
    "tie-out",
    "tie out",
    "reconciliation"
  ]);

  const capitalGoodsScore = scoreKeywordSet(normalizedQuery, [
    "capital goods",
    "capital asset",
    "amortization",
    "deferred input tax"
  ]);

  const requiresRefundRouting = refundScore.score > 0;
  const requiresZeroRatedAttribution = zeroRatedScore.score > 0;
  const requiresExemptSaleAllocation = exemptionScore.score > 0;
  const requiresInputTaxAllocation = allocationScore.score > 0 || requiresExemptSaleAllocation;
  const requiresSubstantiationReview = substantiationScore.score > 0 || disallowanceScore.score > 0;

  return {
    inputTaxType:
      requiresRefundRouting
        ? "REFUND_OVERLAP_INPUT_TAX"
        : requiresInputTaxAllocation
          ? "ALLOCATED_OR_MIXED_INPUT_TAX"
          : requiresSubstantiationReview
            ? "SUBSTANTIATION_SENSITIVE_INPUT_TAX"
            : capitalGoodsScore.score > 0
              ? "CAPITAL_GOODS_INPUT_TAX"
              : "ORDINARY_CREDITABLE_INPUT_TAX",

    inputTaxRiskCategory:
      disallowanceScore.score > 0
        ? "HIGH_DISALLOWANCE_RISK"
        : requiresSubstantiationReview
          ? "SUBSTANTIATION_RISK"
          : requiresInputTaxAllocation
            ? "ALLOCATION_RISK"
            : requiresRefundRouting
              ? "REFUND_ROUTING_RISK"
              : "STANDARD_CREDITABILITY_RISK",

    requiresValidVatInvoice: true,
    requiresSupplierVatStatusCheck: true,
    requiresSubstantiationReview,
    requiresInputTaxAllocation,
    requiresMixedTransactionAnalysis: allocationScore.score > 0,
    requiresExemptSaleAllocation,
    requiresZeroRatedAttribution,
    requiresRefundRouting,
    requiresCarryOverAnalysis: carryOverScore.score > 0,
    requiresDisallowanceRiskReview:
      disallowanceScore.score > 0 || requiresSubstantiationReview,
    requiresVatReturnTieOut: returnTieOutScore.score > 0,
    requiresSLSPTieOut:
      returnTieOutScore.matchedTerms.some((term) => /slsp|summary list/i.test(term)),
    requiresAuditEvidenceReview:
      requiresSubstantiationReview ||
      disallowanceScore.score > 0 ||
      returnTieOutScore.score > 0,

    distinctionRequired:
      requiresRefundRouting ||
      requiresZeroRatedAttribution ||
      requiresExemptSaleAllocation,

    candidateSubIssues:
      unique([
        "INPUT_TAX",
        requiresRefundRouting ? "REFUND_CREDIT" : null,
        requiresZeroRatedAttribution ? "ZERO_RATING" : null,
        requiresExemptSaleAllocation ? "EXEMPTION" : null
      ]),

    matchedTerms: unique([
      ...substantiationScore.matchedTerms,
      ...allocationScore.matchedTerms,
      ...zeroRatedScore.matchedTerms,
      ...exemptionScore.matchedTerms,
      ...refundScore.matchedTerms,
      ...carryOverScore.matchedTerms,
      ...disallowanceScore.matchedTerms,
      ...returnTieOutScore.matchedTerms,
      ...capitalGoodsScore.matchedTerms
    ])
  };
}

export function buildVatInputTaxRetrievalHints({
  reviewMode = false,
  extraAuthorities = [],
  includeRefundAuthorities = false
} = {}) {
  return {
    domainCode: "VAT",
    domainName: "Value-Added Tax",
    subIssue: "INPUT_TAX",
    retrievalStrategy: VAT_INPUT_TAX_SUB_ISSUE.retrievalStrategy,

    targetAuthorities: unique([
      ...VAT_INPUT_TAX_SUB_ISSUE.targetAuthorities,
      ...(includeRefundAuthorities ? ["NIRC Sec. 112", "VAT refund authorities"] : []),
      ...extraAuthorities
    ]),

    controllingAuthorities: VAT_INPUT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_INPUT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_INPUT_TAX_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_INPUT_TAX_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_INPUT_TAX_EXCLUDED_FOLDERS,

    preserveControllingAuthorities: true,
    preserveTargetAuthorityMatches: true,
    preserveIssueClassificationMatches: true,
    preserveSubstantiationSources: true,
    preserveInvoiceComplianceSources: true,

    sourceGroundingRequired: true,
    compactSourcesOnly: true
  };
}

export function matchVatInputTaxQuery(query = "", options = {}) {
  return classifyVatInputTaxQuery(query, options);
}

export function classifyVatInputTaxQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, [
    ...VAT_INPUT_TAX_KEYWORDS,
    ...VAT_INPUT_TAX_ALIASES
  ]);

  const refundOverlap = scoreKeywordSet(normalizedQuery, REFUND_OVERLAP_KEYWORDS);
  const zeroRatingOverlap = scoreKeywordSet(normalizedQuery, ZERO_RATING_OVERLAP_KEYWORDS);
  const exemptionOverlap = scoreKeywordSet(normalizedQuery, EXEMPTION_OVERLAP_KEYWORDS);
  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score =
    positive.score +
    refundOverlap.score * 0.5 +
    zeroRatingOverlap.score * 0.35 +
    exemptionOverlap.score * 0.35 -
    negative.score;

  const priorSubIssue = normalizeCode(options.priorSubIssue || "");
  const primaryDomain = normalizeCode(options.primaryDomain || options.domainCode || "");
  const primaryIssue = normalizeCode(options.primaryIssue || "");

  if (priorSubIssue === "INPUT_TAX") score += 6;
  if (primaryDomain === "VAT") score += 3;
  if (primaryIssue === "VAT" || primaryIssue === "INPUT_TAX") score += 2;

  const inputTaxType = classifyVatInputTaxType(query);

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 24, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/input-tax-engine.js",
    version: VAT_INPUT_TAX_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "INPUT_TAX",
    primarySubIssue: "INPUT_TAX",
    subIssue: "INPUT_TAX",

    matched: score > 0,
    score,
    confidence,

    matchedTerms: unique([
      ...positive.matchedTerms,
      ...refundOverlap.matchedTerms,
      ...zeroRatingOverlap.matchedTerms,
      ...exemptionOverlap.matchedTerms,
      ...inputTaxType.matchedTerms
    ]),

    diversionTerms: negative.matchedTerms,

    shouldUseThisEngine: score > 0 && confidence >= 0.45,
    fallbackClassificationUsed: score <= 0,

    distinctionRequired: inputTaxType.distinctionRequired,
    candidateSubIssues: inputTaxType.candidateSubIssues,

    ...inputTaxType,

    retrievalStrategy: VAT_INPUT_TAX_SUB_ISSUE.retrievalStrategy,
    targetAuthorities: VAT_INPUT_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_INPUT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_INPUT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_INPUT_TAX_SUB_ISSUE.supportingJurisprudence,
    sourceGroundingRequired: true
  };
}

export function buildVatInputTaxRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 10,
  reviewMode = false
} = {}) {
  const classification = classifyVatInputTaxQuery(query, {
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
      subIssues: ["INPUT_TAX"],
      targetAuthorities: VAT_INPUT_TAX_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 110 creditable input tax input VAT",
    "RR 16-2005 Section 4.110 input tax creditable input VAT",
    "VAT input tax substantiation invoice official receipt sales invoice",
    "VAT input tax allocation mixed transactions exempt sales zero-rated sales",
    "VAT input tax carry-over disallowance audit risk",
    "VAT input tax capital goods amortization",
    "VAT return 2550Q SLSP input VAT tie-out",
    "CIR v Medicard Philippines input VAT substantiation",
    "RMC 42-2003 input VAT substantiation",
    ...(classification.requiresRefundRouting
      ? [
          "NIRC Section 112 input VAT refund unutilized input tax",
          "VAT refund credit input VAT Sec. 112"
        ]
      : []),
    ...classification.matchedTerms.map((term) => `VAT input tax ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  return {
    engine: "tax-engines/VAT/engines/input-tax-engine.js",
    version: VAT_INPUT_TAX_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "INPUT_TAX",
    primarySubIssue: "INPUT_TAX",
    subIssue: "INPUT_TAX",

    retrievalStrategy: VAT_INPUT_TAX_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_INPUT_TAX_SUB_ISSUE.legalDimensions,

    targetAuthorities: unique([
      ...VAT_INPUT_TAX_SUB_ISSUE.targetAuthorities,
      ...(classification.requiresRefundRouting
        ? ["NIRC Sec. 112", "VAT refund authorities"]
        : [])
    ]),

    controllingAuthorities: VAT_INPUT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_INPUT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_INPUT_TAX_SUB_ISSUE.supportingJurisprudence,

    targetAuthorityTypes,
    namedTargetAuthorities: VAT_INPUT_TAX_SUB_ISSUE.targetAuthorities,

    governingStatutes: [
      "NIRC Sec. 110",
      "RR 16-2005 Sec. 4.110",
      "Applicable invoice/substantiation provisions"
    ],

    preferredCases: VAT_INPUT_TAX_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_INPUT_TAX_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_INPUT_TAX_EXCLUDED_FOLDERS,

    searchQueries,

    boostTerms: unique([
      "Input VAT",
      "Input Tax",
      "Creditable Input Tax",
      "NIRC Sec. 110",
      "RR 16-2005 Sec. 4.110",
      "VAT invoice",
      "Official Receipt",
      "Sales Invoice",
      "Substantiation",
      "Input VAT allocation",
      "Mixed transactions",
      "Disallowed input VAT",
      "VAT return",
      "SLSP",
      "Medicard Philippines",
      "RMC 42-2003",
      ...VAT_INPUT_TAX_SUB_ISSUE.legalConcepts,
      ...classification.matchedTerms
    ]),

    suppressIssues: [
      "DEFINITION",
      !classification.requiresRefundRouting ? "REFUND_CREDIT" : null,
      !classification.requiresZeroRatedAttribution ? "ZERO_RATING" : null,
      !classification.requiresExemptSaleAllocation ? "EXEMPTION" : null,
      "OUTPUT_TAX",
      "REGISTRATION",
      "COMPLIANCE",
      "WITHHOLDING_VAT",
      "TRANSITIONAL_INPUT_TAX",
      "DEEMED_SALE"
    ].filter(Boolean),

    distinctionRequired: classification.distinctionRequired,
    candidateSubIssues: classification.candidateSubIssues,

    sourceGroundingRequired: true,
    tpmProfile: VAT_INPUT_TAX_SUB_ISSUE.tpmProfile,
    compactSourcesOnly: true,

    classification
  };
}

export function buildVatInputTaxAnswerRules(mode = "LEGAL_ANALYSIS") {
  const normalizedMode = normalizeCode(mode);

  const structure =
    normalizedMode === "SIMPLE_INPUT_TAX_QUERY" ||
    normalizedMode === "FAST_DEFINITION" ||
    normalizedMode === "QUICK"
      ? VAT_INPUT_TAX_ANSWER_STRUCTURE.SIMPLE_INPUT_TAX_QUERY
      : normalizedMode === "REFUND_OVERLAP_INPUT_TAX_QUERY"
        ? VAT_INPUT_TAX_ANSWER_STRUCTURE.REFUND_OVERLAP_INPUT_TAX_QUERY
        : VAT_INPUT_TAX_ANSWER_STRUCTURE.LEGAL_ANALYSIS;

  return {
    engine: "tax-engines/VAT/engines/input-tax-engine.js",
    version: VAT_INPUT_TAX_ENGINE_VERSION,

    requiredStructure: structure,
    answerStructure: VAT_INPUT_TAX_ANSWER_STRUCTURE,

    directAnswerRule:
      "Determine input VAT creditability only from retrieved indexed authorities. Do not treat all input VAT as automatically creditable or refundable.",

    controllingLegalBasisRule:
      "Prioritize NIRC Sec. 110, RR 16-2005 Sec. 4.110, and applicable invoice/substantiation provisions. Use Sec. 112 only when refund or tax credit of unutilized input VAT is actually implicated.",

    supportingRulesRule:
      "Use RMC 42-2003 and other invoicing or substantiation issuances only when relevant to the exact input tax issue.",

    jurisprudenceRule:
      "Use Medicard or other cases only if retrieved or included in targetAuthorities and relevant to input VAT, substantiation, or VAT assessment implications.",

    substantiationRule:
      "Check VAT invoice, official receipt, sales invoice, supplier VAT status, TIN, VAT amount, transaction linkage, and documentary support, subject to retrieved authority.",

    allocationRule:
      "If transactions are mixed VATable, zero-rated, and exempt, route to input VAT allocation analysis. Do not treat input VAT related to exempt sales as automatically creditable.",

    refundRoutingRule:
      "If the issue involves refund, tax credit certificate, unutilized input VAT, Sec. 112, or zero-rated refund claim, route the refund portion to VAT REFUND_CREDIT.",

    auditRiskRule:
      "Flag unsupported invoices, invalid supplier VAT status, mismatch with VAT returns, SLSP discrepancies, unsupported carry-over, and allocation errors as audit risks where relevant.",

    conflictRule:
      VAT_INPUT_TAX_DOCTRINAL_METADATA.conflictRule,

    exclusionRule:
      "Do not treat refund, zero-rating, exemption, registration, output VAT, or filing as the controlling issue unless the user specifically asks those issues.",

    insufficientSourceRule:
      'If indexed controlling authorities are not available, say: "Indexed source not found."',

    noFinalAnswerGeneration: true
  };
}

export function enhanceIssueClassificationWithVatInputTax(issueClassification = {}, query = "") {
  const reviewMode =
    issueClassification.reviewMode === true ||
    issueClassification.requiresReviewMode === true ||
    issueClassification.queryIntent?.requiresReviewMode === true ||
    issueClassification.intentFlags?.requiresReviewMode === true;

  const retrievalPlan = buildVatInputTaxRetrievalPlan({
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
    legacyPrimaryIssue: "INPUT_TAX",
    primarySubIssue: "INPUT_TAX",
    subIssue: "INPUT_TAX",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "VAT",
      "INPUT_TAX"
    ]),

    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "SUBSTANTIVE",
      "EVIDENTIARY",
      "COMPLIANCE",
      "ACCOUNTING",
      "AUDIT"
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

    inputTaxFlags: {
      requiresValidVatInvoice: retrievalPlan.classification.requiresValidVatInvoice,
      requiresSupplierVatStatusCheck: retrievalPlan.classification.requiresSupplierVatStatusCheck,
      requiresSubstantiationReview: retrievalPlan.classification.requiresSubstantiationReview,
      requiresInputTaxAllocation: retrievalPlan.classification.requiresInputTaxAllocation,
      requiresMixedTransactionAnalysis: retrievalPlan.classification.requiresMixedTransactionAnalysis,
      requiresExemptSaleAllocation: retrievalPlan.classification.requiresExemptSaleAllocation,
      requiresZeroRatedAttribution: retrievalPlan.classification.requiresZeroRatedAttribution,
      requiresRefundRouting: retrievalPlan.classification.requiresRefundRouting,
      requiresCarryOverAnalysis: retrievalPlan.classification.requiresCarryOverAnalysis,
      requiresDisallowanceRiskReview: retrievalPlan.classification.requiresDisallowanceRiskReview,
      requiresVatReturnTieOut: retrievalPlan.classification.requiresVatReturnTieOut,
      requiresSLSPTieOut: retrievalPlan.classification.requiresSLSPTieOut,
      requiresAuditEvidenceReview: retrievalPlan.classification.requiresAuditEvidenceReview
    },

    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),

      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      domainCode: "VAT",
      domainName: "Value-Added Tax",

      primaryIssue: issueClassification.primaryIssue || "VAT",
      legacyPrimaryIssue: "INPUT_TAX",
      primarySubIssue: "INPUT_TAX",
      subIssue: "INPUT_TAX",
      subIssues: ["INPUT_TAX"],

      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      controllingAuthorities: retrievalPlan.controllingAuthorities,
      supportingAuthorities: retrievalPlan.supportingAuthorities,
      supportingJurisprudence: retrievalPlan.supportingJurisprudence,

      retrievalStrategy: retrievalPlan.retrievalStrategy,
      priorityFolders: retrievalPlan.priorityFolders,
      excludedFolders: retrievalPlan.excludedFolders,
      requiredAnswerSections: VAT_INPUT_TAX_ANSWER_STRUCTURE.LEGAL_ANALYSIS,
      tpmProfile: retrievalPlan.tpmProfile,
      sourceGroundingRequired: true,

      retrievalHints: buildVatInputTaxRetrievalHints({
        reviewMode,
        includeRefundAuthorities: retrievalPlan.classification.requiresRefundRouting
      }),

      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/input-tax-engine.js",
        identityEngineCode: "INPUT_TAX",
        requiresIssueSpecificRetrieval: true,
        requiresAuthorityHierarchy: true,
        requiresSupersessionCheck: true,
        requiresConflictCheck: true,
        requiresJurisprudence: false,
        requiresEvidenceEvaluation: true,
        requiresFactPatternEngine: true,
        supportsFactPatternRouting: true,
        requiresLegalValidation: true
      },

      confidence: retrievalPlan.classification.confidence,
      fallbackClassificationUsed: retrievalPlan.classification.fallbackClassificationUsed
    },

    vatInputTax: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatInputTaxAnswerRules(
        retrievalPlan.classification.requiresRefundRouting
          ? "REFUND_OVERLAP_INPUT_TAX_QUERY"
          : issueClassification.responseMode ||
              issueClassification.orchestrationMode ||
              "LEGAL_ANALYSIS"
      ),
      doctrinalMetadata: VAT_INPUT_TAX_DOCTRINAL_METADATA,
      factPatternMetadata: VAT_INPUT_TAX_FACT_PATTERN_METADATA
    }
  };
}

export function validateVatInputTaxSource(doc = {}) {
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
    "nirc 110",
    "section 110",
    "sec. 110",
    "rr 16-2005",
    "sec. 4.110",
    "4.110",
    "input tax",
    "input vat",
    "creditable input tax",
    "substantiation",
    "invoice",
    "official receipt",
    "sales invoice",
    "vat invoice",
    "capital goods",
    "amortization",
    "medicard",
    "rmc 42-2003"
  ]);

  const negative = scoreKeywordSet(haystack, [
    "section 112",
    "vat refund",
    "input vat refund",
    "120-day",
    "30-day",
    "section 109",
    "vat exempt",
    "zero-rated",
    "zero rated",
    "registration threshold",
    "withholding vat"
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
    shouldPreserveForVatInputTax:
      score > 0 && authorityAllowed
  };
}

export function vatInputTaxEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_INPUT_TAX_ENGINE",
    version: VAT_INPUT_TAX_ENGINE_VERSION,
    domain: "VAT",
    subIssue: "INPUT_TAX",

    targetAuthorities: VAT_INPUT_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_INPUT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_INPUT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_INPUT_TAX_SUB_ISSUE.supportingJurisprudence,

    retrievalStrategy: VAT_INPUT_TAX_SUB_ISSUE.retrievalStrategy,
    priorityFolders: VAT_INPUT_TAX_PRIORITY_FOLDERS,
    excludedFolders: VAT_INPUT_TAX_EXCLUDED_FOLDERS,

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

    avoidsVatRefundMisclassification: true,
    avoidsAutomaticCreditability: true,
    supportsInputTaxSubstantiation: true,
    supportsInputTaxAllocation: true,
    supportsRefundOverlapRouting: true,
    supportsVatReturnTieOut: true,
    auditRiskSensitive: true
  };
}

export default {
  VAT_INPUT_TAX_ENGINE_VERSION,
  VAT_INPUT_TAX_SUB_ISSUE,
  VAT_INPUT_TAX_PRIORITY_FOLDERS,
  VAT_INPUT_TAX_EXCLUDED_FOLDERS,
  VAT_INPUT_TAX_AUTHORITY_HIERARCHY,
  VAT_INPUT_TAX_KEYWORDS,
  VAT_INPUT_TAX_ALIASES,
  VAT_INPUT_TAX_ANSWER_STRUCTURE,
  VAT_INPUT_TAX_DOCTRINAL_METADATA,
  VAT_INPUT_TAX_FACT_PATTERN_METADATA,

  getVatInputTaxConfig,
  getVatInputTaxAuthorities,
  getVatInputTaxKeywords,
  matchVatInputTaxQuery,
  normalizeVatInputTaxConcept,
  classifyVatInputTaxType,
  buildVatInputTaxRetrievalHints,

  classifyVatInputTaxQuery,
  buildVatInputTaxRetrievalPlan,
  buildVatInputTaxAnswerRules,
  enhanceIssueClassificationWithVatInputTax,
  validateVatInputTaxSource,
  vatInputTaxEngineHealthCheck
};
