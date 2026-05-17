// FILE: tax-engines/VAT/engines/zero-rating-engine.js
"use strict";

/**
 * TINA VAT Zero-Rating Engine
 * Version: 2.0.0
 *
 * VAT → ZERO_RATING
 *
 * Scope:
 * - zero-rated sales
 * - export sales
 * - effectively zero-rated transactions
 * - PEZA / BOI / CREATE transactions
 * - cross-border doctrine
 * - destination principle
 * - substantiation
 * - zero-rating vs exemption distinction
 * - refund overlap analysis
 * - audit-risk analysis
 *
 * Boundary:
 * - No OpenAI calls
 * - No direct retrieval
 * - No final-answer generation
 * - No orchestration duplication
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../../shared/authority-hierarchy.js";

export const VAT_ZERO_RATING_ENGINE_VERSION = "2.0.0";

export const VAT_ZERO_RATING_PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "06_COURT_CASES",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS"
]);

export const VAT_ZERO_RATING_EXCLUDED_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

export const VAT_ZERO_RATING_AUTHORITY_HIERARCHY = Object.freeze([
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

export const VAT_ZERO_RATING_SUB_ISSUE = Object.freeze({
  code: "ZERO_RATING",
  subIssue: "ZERO_RATING",

  domain: "VAT",
  domainCode: "VAT",
  domainName: "Value-Added Tax",

  title:
    "Zero-Rating — Export Sales; Effectively Zero-Rated Transactions; PEZA/BOI/CREATE",

  description:
    "Reusable VAT ZERO_RATING sub-issue engine for zero-rated sales, export sales, effectively zero-rated transactions, cross-border doctrine, destination principle, PEZA/BOI/CREATE-related transactions, substantiation, exemption distinction, refund overlap, and audit-risk routing.",

  primaryIssue: "VAT",
  legacyPrimaryIssue: "ZERO_RATED_SALES",
  primarySubIssue: "ZERO_RATING",

  retrievalStrategy:
    "VAT_ZERO_RATING_AUTHORITY_AND_CASE_FIRST",

  targetAuthorities: [
    "NIRC Sec. 106(A)(2)",
    "NIRC Sec. 108(B)",
    "RR 16-2005",
    "RMC 50-2007",
    "PEZA Law R.A. 7916, where applicable",
    "CREATE Act R.A. 11534, where relevant",
    "CIR v. Toshiba",
    "CIR v. Seagate"
  ],

  controllingAuthorities: [
    "NIRC Sec. 106(A)(2)",
    "NIRC Sec. 108(B)",
    "RR 16-2005",
    "Applicable CREATE / PEZA / BOI provisions, where relevant"
  ],

  supportingAuthorities: [
    "RMC 50-2007, where applicable",
    "PEZA Law R.A. 7916, where applicable",
    "CREATE Act R.A. 11534, where relevant",
    "CREATE IRR / applicable RR, where relevant",
    "Other BIR issuances on zero-rating, if retrieved"
  ],

  supportingJurisprudence: [
    "CIR v. Toshiba",
    "CIR v. Seagate",
    "Other issue-relevant Supreme Court or CTA cases only if retrieved or included by domain config"
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
    "NIRC Sec. 106(A)(2)",
    "NIRC Sec. 108(B)",
    "RR 16-2005 zero-rating provisions",
    "CREATE / PEZA / BOI legal basis where relevant",
    "CIR v. Toshiba and CIR v. Seagate, where relevant",
    "RMC 50-2007 and other BIR issuances where relevant",
    "NIRC Sec. 112 only if refund or input VAT credit claim is implicated"
  ],

  priorityFolders:
    VAT_ZERO_RATING_PRIORITY_FOLDERS,

  excludedFolders:
    VAT_ZERO_RATING_EXCLUDED_FOLDERS,

  authorityHierarchy:
    VAT_ZERO_RATING_AUTHORITY_HIERARCHY,

  legalDimensions: [
    "SUBSTANTIVE",
    "EVIDENTIARY",
    "COMPLIANCE",
    "TRANSACTION",
    "AUDIT"
  ],

  legalConcepts: [
    "zero-rated sales",
    "export sales",
    "effectively zero-rated sales",
    "foreign currency denominated sales",
    "services to nonresident foreign corporation",
    "cross-border doctrine",
    "destination principle",
    "PEZA transactions",
    "BOI transactions",
    "CREATE transactions",
    "registered export enterprise",
    "direct and exclusive use",
    "sale to export enterprise",
    "zero-rating substantiation",
    "zero-rating vs exemption",
    "zero-rating vs ordinary VATable sale",
    "zero-rated input VAT refund overlap",
    "proof of foreign buyer",
    "proof of foreign consumption",
    "proof of export",
    "VAT return reconciliation",
    "SLSP tie-out",
    "zero-rating audit risk"
  ],

  tpmProfile: "HEAVY",

  sourceGroundingRequired: true,

  doctrinallySensitive: true,
  conflictSensitive: true,
  litigationSensitive: false,
  auditRiskSensitive: true,
  refundOverlapSensitive: true,
  pezaSensitive: true,
  createSensitive: true,
  exportSensitive: true,
  crossBorderSensitive: true,
  destinationPrincipleSensitive: true,
  substantiationSensitive: true,

  zeroRatingType:
    "VAT_ZERO_RATED_SALES_ANALYSIS",

  zeroRatingRiskCategory:
    "QUALIFICATION_SUBSTANTIATION_AND_REFUND_OVERLAP_RISK",

  relatedButDifferentIssues: [
    "DEFINITION",
    "REFUND_CREDIT",
    "INPUT_TAX",
    "EXEMPTION",
    "OUTPUT_TAX",
    "REGISTRATION",
    "COMPLIANCE",
    "WITHHOLDING_VAT",
    "TRANSITIONAL_INPUT_TAX",
    "DEEMED_SALE"
  ]
});

export const VAT_ZERO_RATING_KEYWORDS = Object.freeze([
  "zero-rating",
  "zero rating",
  "zero-rated",
  "zero rated",
  "zero-rated vat",
  "0% vat",
  "zero-rated sale",
  "zero-rated sales",
  "effectively zero-rated",
  "effectively zero rated",
  "export sales",
  "export sale",
  "foreign currency denominated sale",
  "foreign currency denominated sales",
  "foreign currency",
  "services to nonresident",
  "nonresident foreign corporation",
  "cross-border",
  "cross border",
  "cross-border doctrine",
  "destination principle",
  "destination-based vat",
  "peza",
  "boi",
  "create",
  "registered export enterprise",
  "export enterprise",
  "direct and exclusive use",
  "sale to peza",
  "sale to export enterprise",
  "peza registered",
  "peza enterprise",
  "eco-zone",
  "ecozone",
  "special economic zone",
  "ra 7916",
  "r.a. 7916",
  "peza law",
  "ra 11534",
  "r.a. 11534",
  "create act",
  "nirc 106",
  "section 106",
  "sec. 106",
  "106(a)(2)",
  "nirc 108",
  "section 108",
  "sec. 108",
  "108(b)",
  "rr 16-2005",
  "rmc 50-2007",
  "toshiba",
  "seagate",
  "zero-rated input vat",
  "zero-rated input tax",
  "vat refund zero-rated"
]);

export const VAT_ZERO_RATING_ALIASES = Object.freeze([
  "VAT_ZERO_RATING",
  "ZERO_RATING",
  "ZERO_RATED_SALES",
  "EFFECTIVELY_ZERO_RATED",
  "EXPORT_SALES",
  "CROSS_BORDER_DOCTRINE",
  "DESTINATION_PRINCIPLE",
  "PEZA_ZERO_RATING",
  "BOI_ZERO_RATING",
  "CREATE_ZERO_RATING",
  "REGISTERED_EXPORT_ENTERPRISE",
  "DIRECT_AND_EXCLUSIVE_USE",
  "ZERO_RATED_REFUND_OVERLAP"
]);

const EXEMPTION_OVERLAP_KEYWORDS = Object.freeze([
  "vat exempt",
  "vat-exempt",
  "exempt sales",
  "exempt transaction",
  "section 109",
  "sec. 109",
  "nirc 109",
  "non-vat",
  "non vat",
  "exemption",
  "outside vat"
]);

const REFUND_OVERLAP_KEYWORDS = Object.freeze([
  "vat refund",
  "input vat refund",
  "input tax refund",
  "section 112",
  "sec. 112",
  "nirc 112",
  "unutilized input vat",
  "excess input vat",
  "tax credit certificate",
  "tcc",
  "administrative claim",
  "judicial claim"
]);

const OUTPUT_TAX_OVERLAP_KEYWORDS = Object.freeze([
  "output vat",
  "output tax",
  "vatable sales",
  "ordinary vat",
  "12% vat",
  "sale of goods",
  "sale of services",
  "gross receipts",
  "gross selling price"
]);

const PEZA_CREATE_KEYWORDS = Object.freeze([
  "peza",
  "boi",
  "create",
  "create act",
  "registered export enterprise",
  "export enterprise",
  "direct and exclusive use",
  "sale to peza",
  "sale to export enterprise",
  "local purchase",
  "incentives",
  "eco-zone",
  "ecozone",
  "ra 7916",
  "ra 11534"
]);

const SUBSTANTIATION_KEYWORDS = Object.freeze([
  "substantiation",
  "documentary",
  "evidence",
  "proof",
  "invoice",
  "zero-rated invoice",
  "sales invoice",
  "foreign buyer",
  "foreign consumption",
  "export documents",
  "contract",
  "certificate",
  "certificate of entitlement",
  "peza certificate",
  "vat return",
  "2550q",
  "slsp"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "define vat",
  "what is vat",
  "nature of vat",
  "registration threshold",
  "2550m",
  "withholding vat",
  "5% final withholding vat",
  "transitional input tax",
  "deemed sale only"
]);

export const VAT_ZERO_RATING_ANSWER_STRUCTURE = Object.freeze({
  SIMPLE_ZERO_RATING_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. ZERO-RATING REQUIREMENT",
    "D. PRACTICAL NOTE"
  ],

  LEGAL_ANALYSIS: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    "D. SUPPORTING JURISPRUDENCE",
    "E. APPLICATION TO TRANSACTION",
    "F. PRACTICAL NOTE / AUDIT RISK"
  ],

  PEZA_CREATE_EXPORT_ZERO_RATING_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. QUALIFICATION REQUIREMENTS",
    "D. DIRECT AND EXCLUSIVE USE / EXPORT STATUS CHECK",
    "E. DOCUMENTARY SUPPORT",
    "F. VAT RISK / PRACTICAL POSITION"
  ],

  REFUND_OVERLAP_ZERO_RATING_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. ZERO-RATED SALES QUALIFICATION",
    "D. INPUT VAT REFUND / CREDIT ROUTING",
    "E. DOCUMENTARY REQUIREMENTS",
    "F. PRACTICAL POSITION"
  ]
});

export const VAT_ZERO_RATING_DOCTRINAL_METADATA = Object.freeze({
  doctrines: [
    {
      code: "ZERO_RATING_DIFFERS_FROM_EXEMPTION",
      label: "Zero-rating differs from exemption",
      description:
        "Zero-rating is not the same as VAT exemption. A zero-rated sale remains a taxable transaction subject to 0% VAT, while exemption generally removes the transaction from output VAT but may affect input VAT creditability."
    },
    {
      code: "DESTINATION_PRINCIPLE",
      label: "Destination principle",
      description:
        "The destination principle and cross-border doctrine may be relevant in export and effectively zero-rated transactions, subject to exact statutory and factual requirements."
    },
    {
      code: "CROSS_BORDER_DOCTRINE",
      label: "Cross-border doctrine",
      description:
        "Cross-border doctrine analysis must be limited to relevant export or effectively zero-rated transactions and supported by indexed authorities."
    },
    {
      code: "PEZA_CREATE_EXACT_QUALIFICATION",
      label: "PEZA/BOI/CREATE qualification requires exact fit",
      description:
        "PEZA, BOI, CREATE, or registered export enterprise zero-rating requires exact statutory, regulatory, registration, and factual qualification."
    },
    {
      code: "ZERO_RATED_REFUND_SEPARATE_SECTION_112_ANALYSIS",
      label: "Refund overlap requires separate Sec. 112 analysis",
      description:
        "Zero-rated sales may give rise to input VAT refund or credit issues, but refund entitlement must be separately analyzed under Sec. 112 and applicable doctrine."
    },
    {
      code: "SUBSTANTIATION_REQUIRED",
      label: "Zero-rating substantiation required",
      description:
        "Zero-rating requires documentary support such as proper invoices, export documents, buyer/customer status, foreign consumption or export support, and applicable certificates where required."
    },
    {
      code: "ADMIN_ISSUANCE_LIMIT",
      label: "Administrative issuances cannot override statute or Supreme Court doctrine",
      description:
        "Administrative issuances may implement or clarify the NIRC but cannot override the NIRC or controlling Supreme Court jurisprudence."
    }
  ],

  conflictRule:
    "Do not mark conflict automatically. Conflict metadata is valid only if same exact issue, same legal dimension, opposite rule or holding, hierarchy analysis, and conflict-resolution basis are present.",

  automaticConflictDetection: false,
  zeroRatingIsNotExemption: true,
  exemptionIsNotZeroRating: true,
  pezaTransactionIsNotAutomaticallyZeroRated: true,
  foreignCurrencyTransactionIsNotAutomaticallyZeroRated: true,
  zeroRatedSaleIsNotAutomaticallyRefundable: true
});

export const VAT_ZERO_RATING_FACT_PATTERN_METADATA = Object.freeze({
  supportsFactPatternRouting: true,
  doesNotPerformFullFactPatternAnalysis: true,

  usableFor: [
    "transaction characterization",
    "export status verification",
    "PEZA/BOI/CREATE qualification review",
    "direct and exclusive use analysis",
    "customer registration status review",
    "documentary evidence review",
    "VAT return reconciliation",
    "SLSP/VAT return tie-out",
    "input VAT refund routing",
    "audit-risk analysis",
    "position-strength scoring",
    "economic substance review"
  ],

  requiredFactInputs: [
    "nature of transaction",
    "whether sale is goods, services, export sale, or effectively zero-rated transaction",
    "buyer/customer identity and registration status",
    "foreign buyer or nonresident status where relevant",
    "foreign consumption or export support where relevant",
    "PEZA/BOI/CREATE/registered export enterprise status where relevant",
    "direct and exclusive use facts where relevant",
    "contract and purchase order terms",
    "zero-rated invoice or sales invoice support",
    "export documents or proof of inward remittance where relevant",
    "VAT return treatment",
    "SLSP tie-out",
    "whether input VAT refund or credit is claimed"
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

export function getVatZeroRatingConfig() {
  return {
    engine: "tax-engines/VAT/engines/zero-rating-engine.js",
    version: VAT_ZERO_RATING_ENGINE_VERSION,
    ...VAT_ZERO_RATING_SUB_ISSUE,
    keywords: VAT_ZERO_RATING_KEYWORDS,
    aliases: VAT_ZERO_RATING_ALIASES,
    answerStructure: VAT_ZERO_RATING_ANSWER_STRUCTURE,
    doctrinalMetadata: VAT_ZERO_RATING_DOCTRINAL_METADATA,
    factPatternMetadata: VAT_ZERO_RATING_FACT_PATTERN_METADATA,
    retrievalHints: buildVatZeroRatingRetrievalHints()
  };
}

export function getVatZeroRatingAuthorities() {
  return {
    targetAuthorities: VAT_ZERO_RATING_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_ZERO_RATING_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_ZERO_RATING_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_ZERO_RATING_SUB_ISSUE.supportingJurisprudence,
    preferredAuthorityTypes: VAT_ZERO_RATING_SUB_ISSUE.preferredAuthorityTypes,
    authorityHierarchy: VAT_ZERO_RATING_AUTHORITY_HIERARCHY,
    priorityFolders: VAT_ZERO_RATING_PRIORITY_FOLDERS,
    excludedFolders: VAT_ZERO_RATING_EXCLUDED_FOLDERS
  };
}

export function getVatZeroRatingKeywords() {
  return {
    keywords: VAT_ZERO_RATING_KEYWORDS,
    aliases: VAT_ZERO_RATING_ALIASES,
    exemptionOverlapKeywords: EXEMPTION_OVERLAP_KEYWORDS,
    refundOverlapKeywords: REFUND_OVERLAP_KEYWORDS,
    outputTaxOverlapKeywords: OUTPUT_TAX_OVERLAP_KEYWORDS,
    pezaCreateKeywords: PEZA_CREATE_KEYWORDS,
    substantiationKeywords: SUBSTANTIATION_KEYWORDS,
    diversionKeywords: NEGATIVE_OR_DIVERSION_KEYWORDS
  };
}

export function normalizeVatZeroRatingConcept(value = "") {
  const normalized = normalizeCode(value);

  const aliases = {
    VAT_ZERO_RATING: "ZERO_RATING",
    ZERO_RATING: "ZERO_RATING",
    ZERO_RATED: "ZERO_RATING",
    ZERO_RATED_SALES: "ZERO_RATING",
    EFFECTIVELY_ZERO_RATED: "EFFECTIVELY_ZERO_RATED",
    EXPORT_SALES: "EXPORT_SALES",
    FOREIGN_CURRENCY_DENOMINATED_SALES: "FOREIGN_CURRENCY_DENOMINATED_SALES",
    CROSS_BORDER: "CROSS_BORDER_DOCTRINE",
    CROSS_BORDER_DOCTRINE: "CROSS_BORDER_DOCTRINE",
    DESTINATION_PRINCIPLE: "DESTINATION_PRINCIPLE",
    PEZA: "PEZA_ZERO_RATING",
    BOI: "BOI_ZERO_RATING",
    CREATE: "CREATE_ZERO_RATING",
    CREATE_ACT: "CREATE_ZERO_RATING",
    REGISTERED_EXPORT_ENTERPRISE: "REGISTERED_EXPORT_ENTERPRISE",
    EXPORT_ENTERPRISE: "REGISTERED_EXPORT_ENTERPRISE",
    DIRECT_AND_EXCLUSIVE_USE: "DIRECT_AND_EXCLUSIVE_USE",
    ZERO_RATED_REFUND: "REFUND_OVERLAP",
    ZERO_RATED_INPUT_VAT: "REFUND_OVERLAP"
  };

  return aliases[normalized] || normalized || "ZERO_RATING";
}

export function classifyVatZeroRatingType(query = "") {
  const normalizedQuery = normalizeText(query);

  const exportScore = scoreKeywordSet(normalizedQuery, [
    "export sales",
    "export sale",
    "foreign buyer",
    "foreign currency",
    "foreign currency denominated",
    "nonresident foreign corporation",
    "foreign consumption",
    "export documents"
  ]);

  const serviceScore = scoreKeywordSet(normalizedQuery, [
    "services to nonresident",
    "sale of services",
    "section 108",
    "108(b)",
    "nonresident foreign corporation"
  ]);

  const pezaCreateScore = scoreKeywordSet(normalizedQuery, PEZA_CREATE_KEYWORDS);
  const crossBorderScore = scoreKeywordSet(normalizedQuery, [
    "cross-border",
    "cross border",
    "cross-border doctrine",
    "destination principle",
    "destination-based vat"
  ]);

  const exemptionScore = scoreKeywordSet(normalizedQuery, EXEMPTION_OVERLAP_KEYWORDS);
  const refundScore = scoreKeywordSet(normalizedQuery, REFUND_OVERLAP_KEYWORDS);
  const outputTaxScore = scoreKeywordSet(normalizedQuery, OUTPUT_TAX_OVERLAP_KEYWORDS);
  const substantiationScore = scoreKeywordSet(normalizedQuery, SUBSTANTIATION_KEYWORDS);

  const requiresExportStatusCheck = exportScore.score > 0;
  const requiresForeignBuyerCheck =
    exportScore.score > 0 ||
    serviceScore.score > 0 ||
    /nonresident|foreign buyer|foreign customer/i.test(normalizedQuery);

  const requiresForeignConsumptionCheck =
    crossBorderScore.score > 0 ||
    /foreign consumption|outside the philippines|destination/i.test(normalizedQuery);

  const requiresPEZAStatusCheck =
    /peza|eco-zone|ecozone|special economic zone/i.test(normalizedQuery);

  const requiresBOIStatusCheck =
    /\bboi\b|board of investments/i.test(normalizedQuery);

  const requiresCREATEQualificationCheck =
    /create|registered export enterprise|export enterprise|direct and exclusive use/i.test(normalizedQuery);

  const requiresDirectExclusiveUseCheck =
    /direct and exclusive use|directly and exclusively|registered export enterprise|create/i.test(normalizedQuery);

  const requiresSubstantiationReview =
    substantiationScore.score > 0 ||
    /invoice|documentary|proof|certificate|contract|export documents/i.test(normalizedQuery);

  const requiresInputTaxRefundRouting =
    refundScore.score > 0 ||
    /input vat refund|unutilized input vat|excess input vat|tax credit certificate|tcc/i.test(normalizedQuery);

  const requiresZeroRatingExemptionDistinction =
    exemptionScore.score > 0 ||
    /zero-rating vs exemption|zero rated vs exempt|exempt vs zero-rated/i.test(normalizedQuery);

  const requiresDestinationPrincipleAnalysis =
    /destination principle|destination-based vat|foreign consumption/i.test(normalizedQuery);

  const requiresCrossBorderDoctrineAnalysis =
    crossBorderScore.score > 0 ||
    /cross-border doctrine|cross border doctrine/i.test(normalizedQuery);

  const zeroRatingType =
    requiresInputTaxRefundRouting
      ? "REFUND_OVERLAP_ZERO_RATING"
      : requiresPEZAStatusCheck || requiresBOIStatusCheck || requiresCREATEQualificationCheck
        ? "PEZA_BOI_CREATE_ZERO_RATING"
        : requiresExportStatusCheck
          ? "EXPORT_SALES_ZERO_RATING"
          : requiresForeignBuyerCheck || requiresCrossBorderDoctrineAnalysis
            ? "CROSS_BORDER_OR_SERVICE_ZERO_RATING"
            : "ORDINARY_ZERO_RATING_ANALYSIS";

  const zeroRatingRiskCategory =
    requiresPEZAStatusCheck || requiresBOIStatusCheck || requiresCREATEQualificationCheck
      ? "PEZA_CREATE_QUALIFICATION_RISK"
      : requiresInputTaxRefundRouting
        ? "REFUND_OVERLAP_RISK"
        : requiresSubstantiationReview
          ? "SUBSTANTIATION_RISK"
          : requiresZeroRatingExemptionDistinction
            ? "CLASSIFICATION_RISK"
            : "STANDARD_ZERO_RATING_RISK";

  return {
    zeroRatingType,
    zeroRatingRiskCategory,

    requiresExportStatusCheck,
    requiresForeignBuyerCheck,
    requiresForeignConsumptionCheck,
    requiresPEZAStatusCheck,
    requiresBOIStatusCheck,
    requiresCREATEQualificationCheck,
    requiresDirectExclusiveUseCheck,
    requiresSubstantiationReview,
    requiresInvoiceReview: requiresSubstantiationReview,
    requiresVatReturnTieOut:
      /vat return|2550q|2550m|return/i.test(normalizedQuery) || substantiationScore.score > 0,
    requiresSLSPTieOut:
      /slsp|summary list/i.test(normalizedQuery),
    requiresInputTaxRefundRouting,
    requiresRefundRiskReview:
      requiresInputTaxRefundRouting || refundScore.score > 0,
    requiresZeroRatingExemptionDistinction,
    requiresDestinationPrincipleAnalysis,
    requiresCrossBorderDoctrineAnalysis,
    requiresAuditEvidenceReview:
      requiresSubstantiationReview ||
      requiresPEZAStatusCheck ||
      requiresCREATEQualificationCheck,

    distinctionRequired:
      exemptionScore.score > 0 ||
      refundScore.score > 0 ||
      outputTaxScore.score > 0,

    candidateSubIssues: unique([
      "ZERO_RATING",
      exemptionScore.score > 0 ? "EXEMPTION" : null,
      outputTaxScore.score > 0 ? "OUTPUT_TAX" : null,
      refundScore.score > 0 ? "REFUND_CREDIT" : null
    ]),

    matchedTerms: unique([
      ...exportScore.matchedTerms,
      ...serviceScore.matchedTerms,
      ...pezaCreateScore.matchedTerms,
      ...crossBorderScore.matchedTerms,
      ...exemptionScore.matchedTerms,
      ...refundScore.matchedTerms,
      ...outputTaxScore.matchedTerms,
      ...substantiationScore.matchedTerms
    ])
  };
}

export function buildVatZeroRatingRetrievalHints({
  reviewMode = false,
  extraAuthorities = [],
  includeRefundAuthorities = false,
  includePezaCreateAuthorities = false
} = {}) {
  return {
    domainCode: "VAT",
    domainName: "Value-Added Tax",
    subIssue: "ZERO_RATING",
    retrievalStrategy: VAT_ZERO_RATING_SUB_ISSUE.retrievalStrategy,

    targetAuthorities: unique([
      ...VAT_ZERO_RATING_SUB_ISSUE.targetAuthorities,
      ...(includeRefundAuthorities ? ["NIRC Sec. 112", "VAT refund authorities"] : []),
      ...(includePezaCreateAuthorities ? ["CREATE Act R.A. 11534", "CREATE IRR / applicable RR"] : []),
      ...extraAuthorities
    ]),

    controllingAuthorities: VAT_ZERO_RATING_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_ZERO_RATING_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_ZERO_RATING_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_ZERO_RATING_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_ZERO_RATING_EXCLUDED_FOLDERS,

    preserveControllingAuthorities: true,
    preserveTargetAuthorityMatches: true,
    preserveIssueClassificationMatches: true,
    preserveZeroRatingSources: true,
    preservePezaCreateSources: true,
    preserveJurisprudenceSources: true,

    sourceGroundingRequired: true,
    compactSourcesOnly: true
  };
}

export function matchVatZeroRatingQuery(query = "", options = {}) {
  return classifyVatZeroRatingQuery(query, options);
}

export function classifyVatZeroRatingQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, [
    ...VAT_ZERO_RATING_KEYWORDS,
    ...VAT_ZERO_RATING_ALIASES
  ]);

  const exemptionOverlap = scoreKeywordSet(normalizedQuery, EXEMPTION_OVERLAP_KEYWORDS);
  const refundOverlap = scoreKeywordSet(normalizedQuery, REFUND_OVERLAP_KEYWORDS);
  const outputTaxOverlap = scoreKeywordSet(normalizedQuery, OUTPUT_TAX_OVERLAP_KEYWORDS);
  const pezaCreate = scoreKeywordSet(normalizedQuery, PEZA_CREATE_KEYWORDS);
  const substantiation = scoreKeywordSet(normalizedQuery, SUBSTANTIATION_KEYWORDS);
  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score =
    positive.score +
    pezaCreate.score * 0.65 +
    substantiation.score * 0.35 +
    refundOverlap.score * 0.35 +
    exemptionOverlap.score * 0.25 -
    outputTaxOverlap.score * 0.15 -
    negative.score;

  const priorSubIssue = normalizeCode(options.priorSubIssue || "");
  const primaryDomain = normalizeCode(options.primaryDomain || options.domainCode || "");
  const primaryIssue = normalizeCode(options.primaryIssue || "");

  if (priorSubIssue === "ZERO_RATING") score += 6;
  if (primaryDomain === "VAT") score += 3;
  if (primaryIssue === "VAT" || primaryIssue === "ZERO_RATED_SALES" || primaryIssue === "ZERO_RATING") score += 2;
  if (primaryIssue === "VAT_REFUND" || primaryIssue === "REFUND_CREDIT") score -= 1;

  const zeroRatingType = classifyVatZeroRatingType(query);

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 24, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/zero-rating-engine.js",
    version: VAT_ZERO_RATING_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "ZERO_RATED_SALES",
    primarySubIssue: "ZERO_RATING",
    subIssue: "ZERO_RATING",

    matched: score > 0,
    score,
    confidence,

    matchedTerms: unique([
      ...positive.matchedTerms,
      ...exemptionOverlap.matchedTerms,
      ...refundOverlap.matchedTerms,
      ...outputTaxOverlap.matchedTerms,
      ...pezaCreate.matchedTerms,
      ...substantiation.matchedTerms,
      ...zeroRatingType.matchedTerms
    ]),

    diversionTerms: negative.matchedTerms,

    shouldUseThisEngine: score > 0 && confidence >= 0.45,
    fallbackClassificationUsed: score <= 0,

    distinctionRequired: zeroRatingType.distinctionRequired,
    candidateSubIssues: zeroRatingType.candidateSubIssues,

    ...zeroRatingType,

    retrievalStrategy: VAT_ZERO_RATING_SUB_ISSUE.retrievalStrategy,
    targetAuthorities: VAT_ZERO_RATING_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_ZERO_RATING_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_ZERO_RATING_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_ZERO_RATING_SUB_ISSUE.supportingJurisprudence,
    sourceGroundingRequired: true
  };
}

export function buildVatZeroRatingRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 10,
  reviewMode = false
} = {}) {
  const classification = classifyVatZeroRatingQuery(query, {
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
      subIssues: ["ZERO_RATING"],
      targetAuthorities: VAT_ZERO_RATING_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 106(A)(2) VAT zero-rated export sales",
    "NIRC Section 108(B) VAT zero-rated services nonresident foreign corporation",
    "RR 16-2005 VAT zero-rating export sales effectively zero-rated",
    "VAT zero-rating cross-border doctrine destination principle",
    "effectively zero-rated VAT PEZA BOI CREATE registered export enterprise",
    "CIR v Toshiba VAT zero-rating",
    "CIR v Seagate VAT zero-rating PEZA",
    "RMC 50-2007 VAT zero-rating PEZA",
    "PEZA Law RA 7916 VAT zero-rating",
    "CREATE Act RA 11534 VAT zero-rating registered export enterprise",
    ...(classification.requiresInputTaxRefundRouting
      ? [
          "NIRC Section 112 input VAT refund zero-rated sales",
          "VAT refund credit zero-rated sales Sec. 112"
        ]
      : []),
    ...classification.matchedTerms.map((term) => `VAT zero-rating ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  return {
    engine: "tax-engines/VAT/engines/zero-rating-engine.js",
    version: VAT_ZERO_RATING_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "ZERO_RATED_SALES",
    primarySubIssue: "ZERO_RATING",
    subIssue: "ZERO_RATING",

    retrievalStrategy: VAT_ZERO_RATING_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_ZERO_RATING_SUB_ISSUE.legalDimensions,

    targetAuthorities: unique([
      ...VAT_ZERO_RATING_SUB_ISSUE.targetAuthorities,
      ...(classification.requiresInputTaxRefundRouting
        ? ["NIRC Sec. 112", "VAT refund authorities"]
        : []),
      ...(classification.requiresCREATEQualificationCheck
        ? ["CREATE Act R.A. 11534", "CREATE IRR / applicable RR"]
        : [])
    ]),

    controllingAuthorities: VAT_ZERO_RATING_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_ZERO_RATING_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_ZERO_RATING_SUB_ISSUE.supportingJurisprudence,

    targetAuthorityTypes,
    namedTargetAuthorities: VAT_ZERO_RATING_SUB_ISSUE.targetAuthorities,

    governingStatutes: [
      "NIRC Sec. 106(A)(2)",
      "NIRC Sec. 108(B)",
      "RR 16-2005",
      ...(classification.requiresPEZAStatusCheck ? ["PEZA Law R.A. 7916"] : []),
      ...(classification.requiresCREATEQualificationCheck ? ["CREATE Act R.A. 11534"] : [])
    ],

    preferredCases: VAT_ZERO_RATING_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_ZERO_RATING_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_ZERO_RATING_EXCLUDED_FOLDERS,

    searchQueries,

    boostTerms: unique([
      "VAT Zero-Rating",
      "Zero-Rated Sales",
      "Effectively Zero-Rated",
      "Export Sales",
      "Cross-Border Doctrine",
      "Destination Principle",
      "NIRC Sec. 106(A)(2)",
      "NIRC Sec. 108(B)",
      "RR 16-2005",
      "RMC 50-2007",
      "PEZA",
      "BOI",
      "CREATE",
      "Registered Export Enterprise",
      "Direct and Exclusive Use",
      "R.A. 7916",
      "R.A. 11534",
      "Toshiba",
      "Seagate",
      "VAT Return",
      "SLSP",
      ...VAT_ZERO_RATING_SUB_ISSUE.legalConcepts,
      ...classification.matchedTerms
    ]),

    suppressIssues: [
      "DEFINITION",
      !classification.candidateSubIssues.includes("REFUND_CREDIT") ? "REFUND_CREDIT" : null,
      "INPUT_TAX",
      !classification.candidateSubIssues.includes("EXEMPTION") ? "EXEMPTION" : null,
      !classification.candidateSubIssues.includes("OUTPUT_TAX") ? "OUTPUT_TAX" : null,
      "REGISTRATION",
      "COMPLIANCE",
      "WITHHOLDING_VAT",
      "TRANSITIONAL_INPUT_TAX",
      "DEEMED_SALE"
    ].filter(Boolean),

    distinctionRequired: classification.distinctionRequired,
    candidateSubIssues: classification.candidateSubIssues,

    sourceGroundingRequired: true,
    tpmProfile: VAT_ZERO_RATING_SUB_ISSUE.tpmProfile,
    compactSourcesOnly: true,

    classification
  };
}

export function buildVatZeroRatingAnswerRules(mode = "LEGAL_ANALYSIS") {
  const normalizedMode = normalizeCode(mode);

  const structure =
    normalizedMode === "SIMPLE_ZERO_RATING_QUERY" ||
    normalizedMode === "FAST_DEFINITION" ||
    normalizedMode === "QUICK"
      ? VAT_ZERO_RATING_ANSWER_STRUCTURE.SIMPLE_ZERO_RATING_QUERY
      : normalizedMode === "REFUND_OVERLAP_ZERO_RATING_QUERY" ||
          normalizedMode === "REFUND_OVERLAP"
        ? VAT_ZERO_RATING_ANSWER_STRUCTURE.REFUND_OVERLAP_ZERO_RATING_QUERY
        : normalizedMode === "PEZA_CREATE_EXPORT_ZERO_RATING_QUERY" ||
            normalizedMode === "PEZA" ||
            normalizedMode === "CREATE" ||
            normalizedMode === "EXPORT"
          ? VAT_ZERO_RATING_ANSWER_STRUCTURE.PEZA_CREATE_EXPORT_ZERO_RATING_QUERY
          : VAT_ZERO_RATING_ANSWER_STRUCTURE.LEGAL_ANALYSIS;

  return {
    engine: "tax-engines/VAT/engines/zero-rating-engine.js",
    version: VAT_ZERO_RATING_ENGINE_VERSION,

    requiredStructure: structure,
    answerStructure: VAT_ZERO_RATING_ANSWER_STRUCTURE,

    directAnswerRule:
      "Determine zero-rating only from retrieved indexed authorities and supplied facts. Do not treat zero-rated sales as exempt sales, exempt sales as zero-rated sales, or every PEZA/foreign-currency transaction as automatically zero-rated.",

    controllingLegalBasisRule:
      "Prioritize NIRC Sec. 106(A)(2), NIRC Sec. 108(B), RR 16-2005, and applicable CREATE/PEZA/BOI provisions where relevant. Use Sec. 112 only when refund or input VAT credit claim is implicated.",

    supportingRulesRule:
      "Use RMC 50-2007, PEZA Law R.A. 7916, CREATE Act R.A. 11534, CREATE IRR/applicable RR, and other BIR issuances only when relevant to the exact zero-rating issue.",

    jurisprudenceRule:
      "Use Toshiba and Seagate only where the issue involves zero-rating, cross-border doctrine, destination principle, PEZA/ecozone status, or effectively zero-rated treatment. Do not invent zero-rating cases.",

    doctrineRule:
      "Distinguish zero-rating from exemption and ordinary VATable sales. Explain destination principle or cross-border doctrine only when relevant and supported by indexed sources.",

    pezaCreateRule:
      "For PEZA/BOI/CREATE questions, require exact statutory, regulatory, registration, customer-status, and direct-and-exclusive-use facts. Do not hallucinate CREATE/PEZA qualifications.",

    refundRoutingRule:
      "If the query involves input VAT refund, unutilized input VAT, excess input VAT, TCC, or Sec. 112, route the refund portion to VAT REFUND_CREDIT.",

    substantiationRule:
      "Flag missing zero-rated invoice, sales invoice, export documents, foreign-buyer support, PEZA/BOI/CREATE status, direct-and-exclusive-use support, contracts, VAT returns, and SLSP as evidence gaps where relevant.",

    auditRiskRule:
      "Flag classification risk, zero-rating support gaps, wrong VAT return disclosure, SLSP mismatch, unsubstantiated export status, and refund-overlap risk where relevant.",

    conflictRule:
      VAT_ZERO_RATING_DOCTRINAL_METADATA.conflictRule,

    exclusionRule:
      "Do not treat exemption, refund, output VAT computation, registration, or general VAT definition as the controlling issue unless the user query specifically asks those issues.",

    insufficientSourceRule:
      'If indexed controlling authorities are not available, say: "Indexed source not found."',

    noFinalAnswerGeneration: true
  };
}

export function enhanceIssueClassificationWithVatZeroRating(issueClassification = {}, query = "") {
  const reviewMode =
    issueClassification.reviewMode === true ||
    issueClassification.requiresReviewMode === true ||
    issueClassification.queryIntent?.requiresReviewMode === true ||
    issueClassification.intentFlags?.requiresReviewMode === true;

  const retrievalPlan = buildVatZeroRatingRetrievalPlan({
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
    legacyPrimaryIssue: "ZERO_RATED_SALES",
    primarySubIssue: "ZERO_RATING",
    subIssue: "ZERO_RATING",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "VAT",
      "ZERO_RATED_SALES",
      "ZERO_RATING"
    ]),

    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "SUBSTANTIVE",
      "EVIDENTIARY",
      "COMPLIANCE",
      "TRANSACTION",
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

    zeroRatingFlags: {
      requiresExportStatusCheck: retrievalPlan.classification.requiresExportStatusCheck,
      requiresForeignBuyerCheck: retrievalPlan.classification.requiresForeignBuyerCheck,
      requiresForeignConsumptionCheck: retrievalPlan.classification.requiresForeignConsumptionCheck,
      requiresPEZAStatusCheck: retrievalPlan.classification.requiresPEZAStatusCheck,
      requiresBOIStatusCheck: retrievalPlan.classification.requiresBOIStatusCheck,
      requiresCREATEQualificationCheck: retrievalPlan.classification.requiresCREATEQualificationCheck,
      requiresDirectExclusiveUseCheck: retrievalPlan.classification.requiresDirectExclusiveUseCheck,
      requiresSubstantiationReview: retrievalPlan.classification.requiresSubstantiationReview,
      requiresInvoiceReview: retrievalPlan.classification.requiresInvoiceReview,
      requiresVatReturnTieOut: retrievalPlan.classification.requiresVatReturnTieOut,
      requiresSLSPTieOut: retrievalPlan.classification.requiresSLSPTieOut,
      requiresInputTaxRefundRouting: retrievalPlan.classification.requiresInputTaxRefundRouting,
      requiresRefundRiskReview: retrievalPlan.classification.requiresRefundRiskReview,
      requiresZeroRatingExemptionDistinction: retrievalPlan.classification.requiresZeroRatingExemptionDistinction,
      requiresDestinationPrincipleAnalysis: retrievalPlan.classification.requiresDestinationPrincipleAnalysis,
      requiresCrossBorderDoctrineAnalysis: retrievalPlan.classification.requiresCrossBorderDoctrineAnalysis,
      requiresAuditEvidenceReview: retrievalPlan.classification.requiresAuditEvidenceReview
    },

    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),

      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      domainCode: "VAT",
      domainName: "Value-Added Tax",

      primaryIssue: issueClassification.primaryIssue || "VAT",
      legacyPrimaryIssue: "ZERO_RATED_SALES",
      primarySubIssue: "ZERO_RATING",
      subIssue: "ZERO_RATING",
      subIssues: ["ZERO_RATING"],

      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      controllingAuthorities: retrievalPlan.controllingAuthorities,
      supportingAuthorities: retrievalPlan.supportingAuthorities,
      supportingJurisprudence: retrievalPlan.supportingJurisprudence,

      retrievalStrategy: retrievalPlan.retrievalStrategy,
      priorityFolders: retrievalPlan.priorityFolders,
      excludedFolders: retrievalPlan.excludedFolders,
      requiredAnswerSections: VAT_ZERO_RATING_ANSWER_STRUCTURE.LEGAL_ANALYSIS,
      tpmProfile: retrievalPlan.tpmProfile,
      sourceGroundingRequired: true,

      retrievalHints: buildVatZeroRatingRetrievalHints({
        reviewMode,
        includeRefundAuthorities: retrievalPlan.classification.requiresInputTaxRefundRouting,
        includePezaCreateAuthorities:
          retrievalPlan.classification.requiresCREATEQualificationCheck ||
          retrievalPlan.classification.requiresPEZAStatusCheck ||
          retrievalPlan.classification.requiresBOIStatusCheck
      }),

      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/zero-rating-engine.js",
        identityEngineCode: "ZERO_RATING",
        requiresIssueSpecificRetrieval: true,
        requiresAuthorityHierarchy: true,
        requiresSupersessionCheck: true,
        requiresConflictCheck: true,
        requiresJurisprudence: true,
        requiresEvidenceEvaluation: true,
        requiresFactPatternEngine: true,
        supportsFactPatternRouting: true,
        requiresLegalValidation: true,
        requiresRefundRouting: retrievalPlan.classification.requiresInputTaxRefundRouting
      },

      confidence: retrievalPlan.classification.confidence,
      fallbackClassificationUsed: retrievalPlan.classification.fallbackClassificationUsed
    },

    vatZeroRating: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatZeroRatingAnswerRules(
        retrievalPlan.classification.requiresInputTaxRefundRouting
          ? "REFUND_OVERLAP_ZERO_RATING_QUERY"
          : retrievalPlan.classification.requiresPEZAStatusCheck ||
              retrievalPlan.classification.requiresBOIStatusCheck ||
              retrievalPlan.classification.requiresCREATEQualificationCheck ||
              retrievalPlan.classification.requiresExportStatusCheck
            ? "PEZA_CREATE_EXPORT_ZERO_RATING_QUERY"
            : issueClassification.responseMode ||
                issueClassification.orchestrationMode ||
                "LEGAL_ANALYSIS"
      ),
      doctrinalMetadata: VAT_ZERO_RATING_DOCTRINAL_METADATA,
      factPatternMetadata: VAT_ZERO_RATING_FACT_PATTERN_METADATA
    }
  };
}

export function validateVatZeroRatingSource(doc = {}) {
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
    "106(a)(2)",
    "section 106",
    "sec. 106",
    "108(b)",
    "section 108",
    "sec. 108",
    "rr 16-2005",
    "zero-rated",
    "zero rated",
    "zero-rating",
    "effectively zero-rated",
    "cross-border",
    "destination principle",
    "foreign currency",
    "nonresident",
    "peza",
    "boi",
    "create",
    "registered export enterprise",
    "direct and exclusive use",
    "r.a. 7916",
    "ra 7916",
    "r.a. 11534",
    "ra 11534",
    "rmc 50-2007",
    "toshiba",
    "seagate"
  ]);

  const negative = scoreKeywordSet(haystack, [
    "section 112",
    "vat refund",
    "input vat refund",
    "120-day",
    "30-day",
    "section 109",
    "vat exempt",
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
    shouldPreserveForVatZeroRating:
      score > 0 && authorityAllowed
  };
}

export function vatZeroRatingEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_ZERO_RATING_ENGINE",
    version: VAT_ZERO_RATING_ENGINE_VERSION,
    domain: "VAT",
    subIssue: "ZERO_RATING",

    targetAuthorities: VAT_ZERO_RATING_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_ZERO_RATING_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_ZERO_RATING_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_ZERO_RATING_SUB_ISSUE.supportingJurisprudence,

    retrievalStrategy: VAT_ZERO_RATING_SUB_ISSUE.retrievalStrategy,
    priorityFolders: VAT_ZERO_RATING_PRIORITY_FOLDERS,
    excludedFolders: VAT_ZERO_RATING_EXCLUDED_FOLDERS,

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
    avoidsExemptionMisclassification: true,
    avoidsAutomaticPezaZeroRating: true,
    avoidsAutomaticForeignCurrencyZeroRating: true,
    supportsCrossBorderDoctrine: true,
    supportsPezaBoiCreateZeroRating: true,
    supportsRefundOverlapRouting: true,
    supportsSubstantiationReview: true
  };
}

export default {
  VAT_ZERO_RATING_ENGINE_VERSION,
  VAT_ZERO_RATING_SUB_ISSUE,
  VAT_ZERO_RATING_PRIORITY_FOLDERS,
  VAT_ZERO_RATING_EXCLUDED_FOLDERS,
  VAT_ZERO_RATING_AUTHORITY_HIERARCHY,
  VAT_ZERO_RATING_KEYWORDS,
  VAT_ZERO_RATING_ALIASES,
  VAT_ZERO_RATING_ANSWER_STRUCTURE,
  VAT_ZERO_RATING_DOCTRINAL_METADATA,
  VAT_ZERO_RATING_FACT_PATTERN_METADATA,

  getVatZeroRatingConfig,
  getVatZeroRatingAuthorities,
  getVatZeroRatingKeywords,
  matchVatZeroRatingQuery,
  normalizeVatZeroRatingConcept,
  classifyVatZeroRatingType,
  buildVatZeroRatingRetrievalHints,

  classifyVatZeroRatingQuery,
  buildVatZeroRatingRetrievalPlan,
  buildVatZeroRatingAnswerRules,
  enhanceIssueClassificationWithVatZeroRating,
  validateVatZeroRatingSource,
  vatZeroRatingEngineHealthCheck
};
