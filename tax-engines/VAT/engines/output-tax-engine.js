// FILE: tax-engines/VAT/engines/output-tax-engine.js
"use strict";

/**
 * TINA VAT Output Tax Engine
 * Version: 2.0.0
 *
 * VAT → OUTPUT_TAX
 *
 * Scope:
 * - output VAT computation
 * - sale of goods/services
 * - lease transactions
 * - gross selling price
 * - gross receipts
 * - timing of output VAT
 * - invoicing requirements
 * - bundled transactions
 * - gross vs net VAT issues
 * - mixed sales
 * - deemed sale overlap
 * - output VAT audit-risk analysis
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

export const VAT_OUTPUT_TAX_ENGINE_VERSION = "2.0.0";

export const VAT_OUTPUT_TAX_PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS",
  "06_COURT_CASES"
]);

export const VAT_OUTPUT_TAX_EXCLUDED_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

export const VAT_OUTPUT_TAX_AUTHORITY_HIERARCHY = Object.freeze([
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

export const VAT_OUTPUT_TAX_SUB_ISSUE = Object.freeze({
  code: "OUTPUT_TAX",
  subIssue: "OUTPUT_TAX",

  domain: "VAT",
  domainCode: "VAT",
  domainName: "Value-Added Tax",

  title:
    "Output Tax — Computation; Tax Base; Timing; Invoicing; Audit Risk",

  description:
    "Reusable VAT OUTPUT_TAX sub-issue engine for output VAT computation, sale of goods, sale of services, lease transactions, gross selling price, gross receipts, timing, invoicing, bundled transactions, gross-vs-net analysis, mixed sales, deemed sale overlap, and output VAT audit risk.",

  primaryIssue: "VAT",
  legacyPrimaryIssue: "OUTPUT_TAX",
  primarySubIssue: "OUTPUT_TAX",

  retrievalStrategy:
    "VAT_OUTPUT_TAX_COMPUTATION_FIRST",

  targetAuthorities: [
    "NIRC Sec. 106",
    "NIRC Sec. 108",
    "RR 16-2005",
    "RR 18-2011",
    "RMC 55-2019",
    "Applicable invoicing provisions under the NIRC and VAT regulations",
    "Issue-relevant jurisprudence if retrieved"
  ],

  controllingAuthorities: [
    "NIRC Sec. 106",
    "NIRC Sec. 108",
    "RR 16-2005",
    "Applicable invoicing provisions under the NIRC and VAT regulations"
  ],

  supportingAuthorities: [
    "RR 18-2011, where applicable",
    "RMC 55-2019, where applicable",
    "Applicable RMCs/RRs on invoice, receipt, gross receipts, or VAT reporting"
  ],

  supportingJurisprudence: [
    "Issue-relevant Supreme Court or CTA cases only if retrieved or included by targetAuthorities"
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
    "NIRC Sec. 106",
    "NIRC Sec. 108",
    "RR 16-2005",
    "Invoicing / sales invoice / VAT reporting provisions",
    "RR 18-2011",
    "RMC 55-2019",
    "Issue-relevant jurisprudence",
    "NIRC Sec. 106(B) only if deemed sale is implicated"
  ],

  priorityFolders:
    VAT_OUTPUT_TAX_PRIORITY_FOLDERS,

  excludedFolders:
    VAT_OUTPUT_TAX_EXCLUDED_FOLDERS,

  authorityHierarchy:
    VAT_OUTPUT_TAX_AUTHORITY_HIERARCHY,

  legalDimensions: [
    "SUBSTANTIVE",
    "COMPLIANCE",
    "ACCOUNTING",
    "AUDIT",
    "TRANSACTION"
  ],

  legalConcepts: [
    "output VAT",
    "output tax computation",
    "sale of goods",
    "sale of services",
    "lease of properties",
    "gross selling price",
    "gross receipts",
    "tax base",
    "timing of VAT liability",
    "advance VAT",
    "advance payments",
    "VAT invoice",
    "sales invoice",
    "official receipt transition",
    "VATable sales",
    "exempt sales",
    "zero-rated sales",
    "mixed sales",
    "bundled transactions",
    "gross vs net revenue",
    "principal vs agent",
    "deemed sale overlap",
    "VAT return reconciliation",
    "SLSP tie-out",
    "sales vs VAT base reconciliation",
    "output VAT audit risk"
  ],

  tpmProfile: "STANDARD",

  sourceGroundingRequired: true,

  doctrinallySensitive: true,
  conflictSensitive: true,
  litigationSensitive: false,
  auditRiskSensitive: true,
  computationSensitive: true,
  invoiceSensitive: true,
  timingSensitive: true,
  grossReceiptsSensitive: true,
  bundledTransactionSensitive: true,
  mixedSalesSensitive: true,
  deemedSaleOverlapSensitive: true,

  outputTaxRiskCategory:
    "VAT_BASE_TIMING_INVOICE_AND_REVENUE_CLASSIFICATION_RISK",

  relatedButDifferentIssues: [
    "DEFINITION",
    "REFUND_CREDIT",
    "ZERO_RATING",
    "INPUT_TAX",
    "EXEMPTION",
    "REGISTRATION",
    "COMPLIANCE",
    "WITHHOLDING_VAT",
    "TRANSITIONAL_INPUT_TAX",
    "DEEMED_SALE"
  ]
});

export const VAT_OUTPUT_TAX_KEYWORDS = Object.freeze([
  "output tax",
  "output vat",
  "vat output",
  "output vat payable",
  "vat payable",
  "vat on sales",
  "vatable sales",
  "vatable sale",
  "sale of goods",
  "sale of services",
  "lease of property",
  "lease of properties",
  "gross selling price",
  "gross receipts",
  "tax base",
  "vat computation",
  "compute vat",
  "12% vat",
  "twelve percent vat",
  "timing of vat",
  "timing of output vat",
  "advance vat",
  "advance payment vat",
  "advance payment",
  "advance billing",
  "vat invoice",
  "sales invoice",
  "official receipt",
  "invoice requirements",
  "billing",
  "gross vs net revenue",
  "gross or net",
  "principal agent",
  "principal vs agent",
  "bundled transaction",
  "bundled transactions",
  "package",
  "mixed sales",
  "exempt sales",
  "zero-rated sales",
  "deemed sale",
  "transactions deemed sale",
  "vat return",
  "2550q",
  "2550m",
  "slsp",
  "vat reconciliation",
  "nirc 106",
  "section 106",
  "sec. 106",
  "nirc 108",
  "section 108",
  "sec. 108",
  "rr 16-2005",
  "rr 18-2011",
  "rmc 55-2019"
]);

export const VAT_OUTPUT_TAX_ALIASES = Object.freeze([
  "VAT_OUTPUT_TAX",
  "OUTPUT_VAT",
  "VATABLE_SALES",
  "VAT_PAYABLE",
  "OUTPUT_TAX_COMPUTATION",
  "VAT_TAX_BASE",
  "GROSS_SELLING_PRICE",
  "GROSS_RECEIPTS",
  "VAT_INVOICE_REQUIREMENTS",
  "ADVANCE_VAT",
  "BUNDLED_TRANSACTION_OUTPUT_VAT",
  "GROSS_VS_NET_OUTPUT_VAT",
  "OUTPUT_VAT_RECONCILIATION"
]);

const DEEMED_SALE_OVERLAP_KEYWORDS = Object.freeze([
  "deemed sale",
  "transactions deemed sale",
  "transaction deemed sale",
  "section 106(b)",
  "sec. 106(b)",
  "nirc 106(b)",
  "distribution to shareholders",
  "transfer of goods",
  "consignment",
  "retirement from business"
]);

const EXEMPTION_OVERLAP_KEYWORDS = Object.freeze([
  "vat exempt",
  "exempt sales",
  "section 109",
  "sec. 109",
  "non-vat",
  "non vat",
  "outside vat"
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

const INPUT_TAX_OVERLAP_KEYWORDS = Object.freeze([
  "input tax",
  "input vat",
  "creditable input tax",
  "input vat credit",
  "section 110",
  "sec. 110"
]);

const BUNDLED_GROSS_NET_KEYWORDS = Object.freeze([
  "bundled",
  "package",
  "gross vs net",
  "gross or net",
  "principal agent",
  "principal vs agent",
  "pass-through",
  "reimbursement",
  "commission",
  "concession",
  "lease contract only"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "vat refund",
  "input vat refund",
  "section 112",
  "administrative claim",
  "judicial claim",
  "120-day",
  "30-day",
  "registration threshold",
  "withholding vat",
  "5% final withholding vat",
  "transitional input tax"
]);

export const VAT_OUTPUT_TAX_ANSWER_STRUCTURE = Object.freeze({
  SIMPLE_OUTPUT_TAX_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. COMPUTATION / TAX BASE",
    "D. PRACTICAL NOTE"
  ],

  LEGAL_ANALYSIS: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    "D. APPLICATION TO TRANSACTION",
    "E. OUTPUT VAT / AUDIT RISK",
    "F. PRACTICAL NOTE / DOCUMENTATION REQUIRED"
  ],

  BUNDLED_TRANSACTION_GROSS_NET_OUTPUT_VAT_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. TRANSACTION CHARACTERIZATION",
    "D. OUTPUT VAT BASE ANALYSIS",
    "E. GROSS VS NET / PRINCIPAL VS AGENT RISK",
    "F. PRACTICAL POSITION"
  ]
});

export const VAT_OUTPUT_TAX_DOCTRINAL_METADATA = Object.freeze({
  doctrines: [
    {
      code: "VATABLE_TRANSACTION_REQUIRED",
      label: "Output VAT depends on a VATable transaction",
      description:
        "Output VAT requires a VATable sale, service, lease, or deemed sale. Not every receipt or revenue item is automatically VATable."
    },
    {
      code: "TAX_BASE_DEPENDS_ON_TRANSACTION_TYPE",
      label: "Tax base depends on transaction classification",
      description:
        "The VAT base may differ depending on whether the transaction is a sale of goods/properties, sale of services, lease, or deemed sale."
    },
    {
      code: "GROSS_SELLING_PRICE_VS_GROSS_RECEIPTS",
      label: "Gross selling price vs gross receipts",
      description:
        "Sale of goods/properties generally routes to gross selling price analysis, while sale of services/lease generally routes to gross receipts analysis."
    },
    {
      code: "INVOICE_COMPLIANCE_AUDIT_RISK",
      label: "Invoice compliance affects audit risk",
      description:
        "VAT invoice, sales invoice, official receipt transition, and reporting support affect compliance and audit risk."
    },
    {
      code: "GROSS_NET_REQUIRES_TRANSACTION_CHARACTERIZATION",
      label: "Gross vs net requires transaction characterization",
      description:
        "Gross-vs-net VAT base questions require principal-agent, pass-through, reimbursement, contractual, and economic substance analysis."
    },
    {
      code: "BUNDLED_TRANSACTION_REQUIRES_FACT_PATTERN",
      label: "Bundled transaction requires fact-pattern analysis",
      description:
        "Bundled transaction output VAT issues should not be resolved by assumption. They require contract, pricing, control, service-delivery, and economic-substance facts."
    },
    {
      code: "ADMIN_ISSUANCE_LIMIT",
      label: "Administrative issuances cannot override statute",
      description:
        "Administrative issuances may implement or clarify the NIRC but cannot override the statute or controlling jurisprudence."
    }
  ],

  conflictRule:
    "Do not mark conflict automatically. Conflict metadata is valid only if same exact issue, same legal dimension, opposite rule or holding, hierarchy analysis, and conflict-resolution basis are present.",

  automaticConflictDetection: false,
  everyRevenueIsNotAutomaticallyVatable: true,
  bundledPaymentIsNotAutomaticallyGrossVatBase: true,
  exemptAndZeroRatedSalesAreNotOrdinaryVatableSales: true
});

export const VAT_OUTPUT_TAX_FACT_PATTERN_METADATA = Object.freeze({
  supportsFactPatternRouting: true,
  doesNotPerformFullFactPatternAnalysis: true,

  usableFor: [
    "transaction characterization",
    "economic substance analysis",
    "principal vs agent analysis",
    "gross vs net revenue analysis",
    "bundled transaction analysis",
    "lease vs service vs sale classification",
    "output VAT audit-risk analysis",
    "VAT return reconciliation",
    "SLSP/VAT return tie-out",
    "sales vs VAT base reconciliation",
    "invoice sufficiency review",
    "CAJE/tax adjustment review"
  ],

  requiredFactInputs: [
    "nature of transaction",
    "whether sale of goods, sale of services, lease, or deemed sale",
    "contractual role of parties",
    "principal or agent status",
    "gross selling price or gross receipts",
    "whether amount is pass-through or reimbursement",
    "whether sale is VATable, zero-rated, exempt, or outside VAT",
    "timing of billing or collection",
    "invoice or sales invoice support",
    "VAT return treatment",
    "SLSP tie-out",
    "sales/revenue vs VAT base reconciliation"
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

export function getVatOutputTaxConfig() {
  return {
    engine: "tax-engines/VAT/engines/output-tax-engine.js",
    version: VAT_OUTPUT_TAX_ENGINE_VERSION,
    ...VAT_OUTPUT_TAX_SUB_ISSUE,
    keywords: VAT_OUTPUT_TAX_KEYWORDS,
    aliases: VAT_OUTPUT_TAX_ALIASES,
    answerStructure: VAT_OUTPUT_TAX_ANSWER_STRUCTURE,
    doctrinalMetadata: VAT_OUTPUT_TAX_DOCTRINAL_METADATA,
    factPatternMetadata: VAT_OUTPUT_TAX_FACT_PATTERN_METADATA,
    retrievalHints: buildVatOutputTaxRetrievalHints()
  };
}

export function getVatOutputTaxAuthorities() {
  return {
    targetAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_OUTPUT_TAX_SUB_ISSUE.supportingJurisprudence,
    preferredAuthorityTypes: VAT_OUTPUT_TAX_SUB_ISSUE.preferredAuthorityTypes,
    authorityHierarchy: VAT_OUTPUT_TAX_AUTHORITY_HIERARCHY,
    priorityFolders: VAT_OUTPUT_TAX_PRIORITY_FOLDERS,
    excludedFolders: VAT_OUTPUT_TAX_EXCLUDED_FOLDERS
  };
}

export function getVatOutputTaxKeywords() {
  return {
    keywords: VAT_OUTPUT_TAX_KEYWORDS,
    aliases: VAT_OUTPUT_TAX_ALIASES,
    deemedSaleOverlapKeywords: DEEMED_SALE_OVERLAP_KEYWORDS,
    exemptionOverlapKeywords: EXEMPTION_OVERLAP_KEYWORDS,
    zeroRatingOverlapKeywords: ZERO_RATING_OVERLAP_KEYWORDS,
    inputTaxOverlapKeywords: INPUT_TAX_OVERLAP_KEYWORDS,
    bundledGrossNetKeywords: BUNDLED_GROSS_NET_KEYWORDS,
    diversionKeywords: NEGATIVE_OR_DIVERSION_KEYWORDS
  };
}

export function normalizeVatOutputTaxConcept(value = "") {
  const normalized = normalizeCode(value);

  const aliases = {
    OUTPUT_TAX: "OUTPUT_TAX",
    VAT_OUTPUT_TAX: "OUTPUT_TAX",
    OUTPUT_VAT: "OUTPUT_TAX",
    VAT_PAYABLE: "OUTPUT_TAX",
    VATABLE_SALES: "VATABLE_SALES",
    VAT_ON_SALES: "VATABLE_SALES",
    GROSS_SELLING_PRICE: "GROSS_SELLING_PRICE",
    GROSS_RECEIPTS: "GROSS_RECEIPTS",
    TAX_BASE: "VAT_TAX_BASE",
    VAT_TAX_BASE: "VAT_TAX_BASE",
    ADVANCE_VAT: "TIMING_OR_ADVANCE_VAT",
    ADVANCE_PAYMENT: "TIMING_OR_ADVANCE_VAT",
    TIMING_OF_VAT: "TIMING_OR_ADVANCE_VAT",
    VAT_INVOICE: "INVOICE_REQUIREMENTS",
    SALES_INVOICE: "INVOICE_REQUIREMENTS",
    OFFICIAL_RECEIPT: "INVOICE_REQUIREMENTS",
    INVOICE_REQUIREMENTS: "INVOICE_REQUIREMENTS",
    GROSS_VS_NET: "GROSS_VS_NET_ANALYSIS",
    GROSS_OR_NET: "GROSS_VS_NET_ANALYSIS",
    PRINCIPAL_AGENT: "PRINCIPAL_AGENT_ANALYSIS",
    PRINCIPAL_VS_AGENT: "PRINCIPAL_AGENT_ANALYSIS",
    BUNDLED_TRANSACTION: "BUNDLED_TRANSACTION_ANALYSIS",
    PACKAGE: "BUNDLED_TRANSACTION_ANALYSIS",
    MIXED_SALES: "MIXED_SALES_ANALYSIS",
    DEEMED_SALE: "DEEMED_SALE_OVERLAP",
    VAT_RETURN: "VAT_RETURN_TIE_OUT",
    SLSP: "SLSP_TIE_OUT"
  };

  return aliases[normalized] || normalized || "OUTPUT_TAX";
}

export function classifyVatOutputTaxType(query = "") {
  const normalizedQuery = normalizeText(query);

  const goodsScore = scoreKeywordSet(normalizedQuery, [
    "sale of goods",
    "sale of properties",
    "gross selling price",
    "goods",
    "properties",
    "inventory"
  ]);

  const servicesScore = scoreKeywordSet(normalizedQuery, [
    "sale of services",
    "services",
    "gross receipts",
    "lease",
    "lease of property",
    "lease of properties",
    "rent",
    "rental"
  ]);

  const timingScore = scoreKeywordSet(normalizedQuery, [
    "timing",
    "advance vat",
    "advance payment",
    "advance billing",
    "advance collection",
    "deposit",
    "prepayment"
  ]);

  const invoiceScore = scoreKeywordSet(normalizedQuery, [
    "invoice",
    "sales invoice",
    "official receipt",
    "invoice requirements",
    "billing",
    "e-invoicing",
    "e-receipting"
  ]);

  const bundledScore = scoreKeywordSet(normalizedQuery, BUNDLED_GROSS_NET_KEYWORDS);
  const mixedSalesScore = scoreKeywordSet(normalizedQuery, [
    "mixed sales",
    "vatable and exempt",
    "vatable and zero-rated",
    "mixed transactions",
    "different components"
  ]);

  const deemedSaleScore = scoreKeywordSet(normalizedQuery, DEEMED_SALE_OVERLAP_KEYWORDS);
  const exemptionScore = scoreKeywordSet(normalizedQuery, EXEMPTION_OVERLAP_KEYWORDS);
  const zeroRatingScore = scoreKeywordSet(normalizedQuery, ZERO_RATING_OVERLAP_KEYWORDS);
  const inputTaxScore = scoreKeywordSet(normalizedQuery, INPUT_TAX_OVERLAP_KEYWORDS);

  const returnTieOutScore = scoreKeywordSet(normalizedQuery, [
    "2550q",
    "2550m",
    "vat return",
    "slsp",
    "summary list",
    "tie-out",
    "tie out",
    "reconciliation",
    "sales vs vat base"
  ]);

  const requiresGrossSellingPriceAnalysis = goodsScore.score > 0;
  const requiresGrossReceiptsAnalysis = servicesScore.score > 0;
  const requiresTimingAnalysis = timingScore.score > 0;
  const requiresInvoiceReview = invoiceScore.score > 0;
  const requiresBundledTransactionAnalysis = bundledScore.score > 0;
  const requiresPrincipalAgentAnalysis = bundledScore.matchedTerms.some((term) =>
    /principal|agent|pass-through|reimbursement|commission|concession/i.test(term)
  );
  const requiresEconomicSubstanceAnalysis =
    requiresBundledTransactionAnalysis ||
    /economic substance|substance over form|business purpose|actual arrangement/i.test(normalizedQuery);
  const requiresMixedSalesAnalysis = mixedSalesScore.score > 0;
  const requiresExemptZeroRatedDistinction =
    exemptionScore.score > 0 || zeroRatingScore.score > 0;
  const requiresDeemedSaleRouting = deemedSaleScore.score > 0;
  const requiresVatReturnTieOut = returnTieOutScore.score > 0;

  return {
    outputTaxType:
      requiresBundledTransactionAnalysis
        ? "BUNDLED_OR_GROSS_NET_OUTPUT_VAT"
        : requiresDeemedSaleRouting
          ? "DEEMED_SALE_OVERLAP_OUTPUT_VAT"
          : requiresGrossReceiptsAnalysis
            ? "SERVICE_OR_LEASE_OUTPUT_VAT"
            : requiresGrossSellingPriceAnalysis
              ? "GOODS_OR_PROPERTY_OUTPUT_VAT"
              : requiresTimingAnalysis
                ? "TIMING_OR_ADVANCE_OUTPUT_VAT"
                : "ORDINARY_OUTPUT_VAT",

    outputTaxRiskCategory:
      requiresBundledTransactionAnalysis
        ? "HIGH_GROSS_VS_NET_AND_PRINCIPAL_AGENT_RISK"
        : requiresDeemedSaleRouting
          ? "DEEMED_SALE_ROUTING_RISK"
          : requiresExemptZeroRatedDistinction
            ? "CLASSIFICATION_AND_TAX_BASE_RISK"
            : requiresInvoiceReview
              ? "INVOICE_AND_TIMING_RISK"
              : requiresVatReturnTieOut
                ? "VAT_RETURN_RECONCILIATION_RISK"
                : "STANDARD_OUTPUT_VAT_RISK",

    requiresVatBaseDetermination: true,
    requiresGrossReceiptsAnalysis,
    requiresGrossSellingPriceAnalysis,
    requiresTimingAnalysis,
    requiresInvoiceReview,
    requiresBundledTransactionAnalysis,
    requiresPrincipalAgentAnalysis,
    requiresEconomicSubstanceAnalysis,
    requiresMixedSalesAnalysis,
    requiresExemptZeroRatedDistinction,
    requiresDeemedSaleRouting,
    requiresVatReturnTieOut,
    requiresSLSPTieOut:
      returnTieOutScore.matchedTerms.some((term) => /slsp|summary list/i.test(term)),
    requiresAuditEvidenceReview:
      requiresInvoiceReview ||
      requiresBundledTransactionAnalysis ||
      requiresVatReturnTieOut ||
      requiresMixedSalesAnalysis,

    distinctionRequired:
      requiresDeemedSaleRouting ||
      requiresExemptZeroRatedDistinction ||
      inputTaxScore.score > 0,

    candidateSubIssues: unique([
      "OUTPUT_TAX",
      requiresDeemedSaleRouting ? "DEEMED_SALE" : null,
      exemptionScore.score > 0 ? "EXEMPTION" : null,
      zeroRatingScore.score > 0 ? "ZERO_RATING" : null,
      inputTaxScore.score > 0 ? "INPUT_TAX" : null
    ]),

    matchedTerms: unique([
      ...goodsScore.matchedTerms,
      ...servicesScore.matchedTerms,
      ...timingScore.matchedTerms,
      ...invoiceScore.matchedTerms,
      ...bundledScore.matchedTerms,
      ...mixedSalesScore.matchedTerms,
      ...deemedSaleScore.matchedTerms,
      ...exemptionScore.matchedTerms,
      ...zeroRatingScore.matchedTerms,
      ...inputTaxScore.matchedTerms,
      ...returnTieOutScore.matchedTerms
    ])
  };
}

export function buildVatOutputTaxRetrievalHints({
  reviewMode = false,
  extraAuthorities = [],
  includeDeemedSaleAuthorities = false
} = {}) {
  return {
    domainCode: "VAT",
    domainName: "Value-Added Tax",
    subIssue: "OUTPUT_TAX",
    retrievalStrategy: VAT_OUTPUT_TAX_SUB_ISSUE.retrievalStrategy,

    targetAuthorities: unique([
      ...VAT_OUTPUT_TAX_SUB_ISSUE.targetAuthorities,
      ...(includeDeemedSaleAuthorities ? ["NIRC Sec. 106(B)", "RR 16-2005 deemed sale rules"] : []),
      ...extraAuthorities
    ]),

    controllingAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_OUTPUT_TAX_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_OUTPUT_TAX_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_OUTPUT_TAX_EXCLUDED_FOLDERS,

    preserveControllingAuthorities: true,
    preserveTargetAuthorityMatches: true,
    preserveIssueClassificationMatches: true,
    preserveInvoiceComplianceSources: true,
    preserveVatBaseSources: true,

    sourceGroundingRequired: true,
    compactSourcesOnly: true
  };
}

export function matchVatOutputTaxQuery(query = "", options = {}) {
  return classifyVatOutputTaxQuery(query, options);
}

export function classifyVatOutputTaxQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, [
    ...VAT_OUTPUT_TAX_KEYWORDS,
    ...VAT_OUTPUT_TAX_ALIASES
  ]);

  const deemedSaleOverlap = scoreKeywordSet(normalizedQuery, DEEMED_SALE_OVERLAP_KEYWORDS);
  const exemptionOverlap = scoreKeywordSet(normalizedQuery, EXEMPTION_OVERLAP_KEYWORDS);
  const zeroRatingOverlap = scoreKeywordSet(normalizedQuery, ZERO_RATING_OVERLAP_KEYWORDS);
  const inputTaxOverlap = scoreKeywordSet(normalizedQuery, INPUT_TAX_OVERLAP_KEYWORDS);
  const bundledGrossNet = scoreKeywordSet(normalizedQuery, BUNDLED_GROSS_NET_KEYWORDS);
  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score =
    positive.score +
    deemedSaleOverlap.score * 0.45 +
    exemptionOverlap.score * 0.25 +
    zeroRatingOverlap.score * 0.25 +
    bundledGrossNet.score * 0.75 -
    inputTaxOverlap.score * 0.35 -
    negative.score;

  const priorSubIssue = normalizeCode(options.priorSubIssue || "");
  const primaryDomain = normalizeCode(options.primaryDomain || options.domainCode || "");
  const primaryIssue = normalizeCode(options.primaryIssue || "");

  if (priorSubIssue === "OUTPUT_TAX") score += 6;
  if (primaryDomain === "VAT") score += 3;
  if (primaryIssue === "VAT" || primaryIssue === "OUTPUT_TAX" || primaryIssue === "VAT_LIABILITY") score += 2;

  const outputTaxType = classifyVatOutputTaxType(query);

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 24, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/output-tax-engine.js",
    version: VAT_OUTPUT_TAX_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "OUTPUT_TAX",
    primarySubIssue: "OUTPUT_TAX",
    subIssue: "OUTPUT_TAX",

    matched: score > 0,
    score,
    confidence,

    matchedTerms: unique([
      ...positive.matchedTerms,
      ...deemedSaleOverlap.matchedTerms,
      ...exemptionOverlap.matchedTerms,
      ...zeroRatingOverlap.matchedTerms,
      ...inputTaxOverlap.matchedTerms,
      ...bundledGrossNet.matchedTerms,
      ...outputTaxType.matchedTerms
    ]),

    diversionTerms: negative.matchedTerms,

    shouldUseThisEngine: score > 0 && confidence >= 0.45,
    fallbackClassificationUsed: score <= 0,

    distinctionRequired: outputTaxType.distinctionRequired,
    candidateSubIssues: outputTaxType.candidateSubIssues,

    ...outputTaxType,

    retrievalStrategy: VAT_OUTPUT_TAX_SUB_ISSUE.retrievalStrategy,
    targetAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_OUTPUT_TAX_SUB_ISSUE.supportingJurisprudence,
    sourceGroundingRequired: true
  };
}

export function buildVatOutputTaxRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 10,
  reviewMode = false
} = {}) {
  const classification = classifyVatOutputTaxQuery(query, {
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
      subIssues: ["OUTPUT_TAX"],
      targetAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 106 VAT output tax sale of goods gross selling price",
    "NIRC Section 108 VAT output tax sale of services gross receipts lease",
    "RR 16-2005 output VAT computation invoice requirements",
    "RR 18-2011 VAT invoicing output tax",
    "RMC 55-2019 VAT invoicing output tax",
    "VAT output tax computation gross selling price gross receipts",
    "VAT invoice sales invoice official receipt output VAT",
    "VAT output tax timing advance payment advance billing",
    "VAT output tax bundled transaction gross vs net principal agent",
    "VAT return 2550Q SLSP output VAT reconciliation",
    ...(classification.requiresDeemedSaleRouting
      ? [
          "NIRC Section 106(B) deemed sale VAT output tax",
          "RR 16-2005 deemed sale rules"
        ]
      : []),
    ...classification.matchedTerms.map((term) => `VAT output tax ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  return {
    engine: "tax-engines/VAT/engines/output-tax-engine.js",
    version: VAT_OUTPUT_TAX_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "OUTPUT_TAX",
    primarySubIssue: "OUTPUT_TAX",
    subIssue: "OUTPUT_TAX",

    retrievalStrategy: VAT_OUTPUT_TAX_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_OUTPUT_TAX_SUB_ISSUE.legalDimensions,

    targetAuthorities: unique([
      ...VAT_OUTPUT_TAX_SUB_ISSUE.targetAuthorities,
      ...(classification.requiresDeemedSaleRouting
        ? ["NIRC Sec. 106(B)", "RR 16-2005 deemed sale rules"]
        : [])
    ]),

    controllingAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_OUTPUT_TAX_SUB_ISSUE.supportingJurisprudence,

    targetAuthorityTypes,
    namedTargetAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.targetAuthorities,

    governingStatutes: [
      "NIRC Sec. 106",
      "NIRC Sec. 108",
      "RR 16-2005",
      "Applicable invoicing provisions"
    ],

    preferredCases: VAT_OUTPUT_TAX_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_OUTPUT_TAX_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_OUTPUT_TAX_EXCLUDED_FOLDERS,

    searchQueries,

    boostTerms: unique([
      "Output VAT",
      "Output Tax",
      "NIRC Sec. 106",
      "NIRC Sec. 108",
      "RR 16-2005",
      "RR 18-2011",
      "RMC 55-2019",
      "Gross Selling Price",
      "Gross Receipts",
      "VAT invoice",
      "Sales Invoice",
      "Official Receipt",
      "VAT Computation",
      "Advance VAT",
      "Bundled Transaction",
      "Gross vs Net",
      "Principal vs Agent",
      "VAT Return",
      "SLSP",
      ...VAT_OUTPUT_TAX_SUB_ISSUE.legalConcepts,
      ...classification.matchedTerms
    ]),

    suppressIssues: [
      "DEFINITION",
      "REFUND_CREDIT",
      !classification.candidateSubIssues.includes("ZERO_RATING") ? "ZERO_RATING" : null,
      !classification.candidateSubIssues.includes("EXEMPTION") ? "EXEMPTION" : null,
      !classification.candidateSubIssues.includes("INPUT_TAX") ? "INPUT_TAX" : null,
      "REGISTRATION",
      "COMPLIANCE",
      "WITHHOLDING_VAT",
      "TRANSITIONAL_INPUT_TAX",
      !classification.requiresDeemedSaleRouting ? "DEEMED_SALE" : null
    ].filter(Boolean),

    distinctionRequired: classification.distinctionRequired,
    candidateSubIssues: classification.candidateSubIssues,

    sourceGroundingRequired: true,
    tpmProfile: VAT_OUTPUT_TAX_SUB_ISSUE.tpmProfile,
    compactSourcesOnly: true,

    classification
  };
}

export function buildVatOutputTaxAnswerRules(mode = "LEGAL_ANALYSIS") {
  const normalizedMode = normalizeCode(mode);

  const structure =
    normalizedMode === "SIMPLE_OUTPUT_TAX_QUERY" ||
    normalizedMode === "FAST_DEFINITION" ||
    normalizedMode === "QUICK"
      ? VAT_OUTPUT_TAX_ANSWER_STRUCTURE.SIMPLE_OUTPUT_TAX_QUERY
      : normalizedMode === "BUNDLED_TRANSACTION_GROSS_NET_OUTPUT_VAT_QUERY" ||
          normalizedMode === "BUNDLED_TRANSACTION" ||
          normalizedMode === "GROSS_VS_NET"
        ? VAT_OUTPUT_TAX_ANSWER_STRUCTURE.BUNDLED_TRANSACTION_GROSS_NET_OUTPUT_VAT_QUERY
        : VAT_OUTPUT_TAX_ANSWER_STRUCTURE.LEGAL_ANALYSIS;

  return {
    engine: "tax-engines/VAT/engines/output-tax-engine.js",
    version: VAT_OUTPUT_TAX_ENGINE_VERSION,

    requiredStructure: structure,
    answerStructure: VAT_OUTPUT_TAX_ANSWER_STRUCTURE,

    directAnswerRule:
      "Determine output VAT only from retrieved indexed authorities. Do not treat every revenue item, receipt, or bundled payment as automatically VATable without transaction classification and source support.",

    controllingLegalBasisRule:
      "Prioritize NIRC Sec. 106 for sale of goods/properties, NIRC Sec. 108 for sale of services/use or lease of properties, RR 16-2005, and applicable invoicing provisions. Use Sec. 106(B) only when deemed sale is implicated.",

    supportingRulesRule:
      "Use RR 18-2011, RMC 55-2019, and other invoicing or reporting issuances only when relevant to the exact output VAT issue.",

    jurisprudenceRule:
      "Use only issue-relevant Supreme Court or CTA cases if retrieved or included in targetAuthorities. Do not invent output VAT jurisprudence.",

    computationRule:
      "Identify the VAT tax base first: gross selling price for sale of goods/properties, gross receipts for services or lease, or a deemed-sale base only if Sec. 106(B) is implicated.",

    timingRule:
      "If advance billing, advance collection, deposits, or prepayments are involved, separate timing, billing, collection, revenue recognition, and output VAT recognition issues.",

    invoicingRule:
      "If invoicing is involved, identify the VAT invoice, sales invoice, official receipt transition, documentary support, and reporting requirement based on retrieved authority.",

    grossNetRule:
      "Gross-vs-net or bundled transaction issues require principal-agent, pass-through, reimbursement, contract, and economic substance analysis. Do not assume gross VAT base without facts.",

    auditRiskRule:
      "Flag wrong VAT base, wrong timing, invoice deficiencies, SLSP/VAT return mismatch, gross-vs-net misclassification, and sales-vs-output-VAT reconciliation issues where relevant.",

    conflictRule:
      VAT_OUTPUT_TAX_DOCTRINAL_METADATA.conflictRule,

    exclusionRule:
      "Do not treat refund, input tax creditability, zero-rating, exemption, registration, withholding VAT, or transitional input tax as the controlling issue unless the user specifically asks those issues.",

    insufficientSourceRule:
      'If indexed controlling authorities are not available, say: "Indexed source not found."',

    noFinalAnswerGeneration: true
  };
}

export function enhanceIssueClassificationWithVatOutputTax(issueClassification = {}, query = "") {
  const reviewMode =
    issueClassification.reviewMode === true ||
    issueClassification.requiresReviewMode === true ||
    issueClassification.queryIntent?.requiresReviewMode === true ||
    issueClassification.intentFlags?.requiresReviewMode === true;

  const retrievalPlan = buildVatOutputTaxRetrievalPlan({
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
    legacyPrimaryIssue: "OUTPUT_TAX",
    primarySubIssue: "OUTPUT_TAX",
    subIssue: "OUTPUT_TAX",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "VAT",
      "VAT_LIABILITY",
      "OUTPUT_TAX"
    ]),

    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "SUBSTANTIVE",
      "COMPLIANCE",
      "ACCOUNTING",
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

    outputTaxFlags: {
      requiresVatBaseDetermination: retrievalPlan.classification.requiresVatBaseDetermination,
      requiresGrossReceiptsAnalysis: retrievalPlan.classification.requiresGrossReceiptsAnalysis,
      requiresGrossSellingPriceAnalysis: retrievalPlan.classification.requiresGrossSellingPriceAnalysis,
      requiresTimingAnalysis: retrievalPlan.classification.requiresTimingAnalysis,
      requiresInvoiceReview: retrievalPlan.classification.requiresInvoiceReview,
      requiresBundledTransactionAnalysis: retrievalPlan.classification.requiresBundledTransactionAnalysis,
      requiresPrincipalAgentAnalysis: retrievalPlan.classification.requiresPrincipalAgentAnalysis,
      requiresEconomicSubstanceAnalysis: retrievalPlan.classification.requiresEconomicSubstanceAnalysis,
      requiresMixedSalesAnalysis: retrievalPlan.classification.requiresMixedSalesAnalysis,
      requiresExemptZeroRatedDistinction: retrievalPlan.classification.requiresExemptZeroRatedDistinction,
      requiresDeemedSaleRouting: retrievalPlan.classification.requiresDeemedSaleRouting,
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
      legacyPrimaryIssue: "OUTPUT_TAX",
      primarySubIssue: "OUTPUT_TAX",
      subIssue: "OUTPUT_TAX",
      subIssues: ["OUTPUT_TAX"],

      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      controllingAuthorities: retrievalPlan.controllingAuthorities,
      supportingAuthorities: retrievalPlan.supportingAuthorities,
      supportingJurisprudence: retrievalPlan.supportingJurisprudence,

      retrievalStrategy: retrievalPlan.retrievalStrategy,
      priorityFolders: retrievalPlan.priorityFolders,
      excludedFolders: retrievalPlan.excludedFolders,
      requiredAnswerSections: VAT_OUTPUT_TAX_ANSWER_STRUCTURE.LEGAL_ANALYSIS,
      tpmProfile: retrievalPlan.tpmProfile,
      sourceGroundingRequired: true,

      retrievalHints: buildVatOutputTaxRetrievalHints({
        reviewMode,
        includeDeemedSaleAuthorities: retrievalPlan.classification.requiresDeemedSaleRouting
      }),

      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/output-tax-engine.js",
        identityEngineCode: "OUTPUT_TAX",
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

    vatOutputTax: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatOutputTaxAnswerRules(
        retrievalPlan.classification.requiresBundledTransactionAnalysis
          ? "BUNDLED_TRANSACTION_GROSS_NET_OUTPUT_VAT_QUERY"
          : issueClassification.responseMode ||
              issueClassification.orchestrationMode ||
              "LEGAL_ANALYSIS"
      ),
      doctrinalMetadata: VAT_OUTPUT_TAX_DOCTRINAL_METADATA,
      factPatternMetadata: VAT_OUTPUT_TAX_FACT_PATTERN_METADATA
    }
  };
}

export function validateVatOutputTaxSource(doc = {}) {
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
    "nirc 106",
    "section 106",
    "sec. 106",
    "nirc 108",
    "section 108",
    "sec. 108",
    "rr 16-2005",
    "rr 18-2011",
    "rmc 55-2019",
    "output tax",
    "output vat",
    "vat on sales",
    "gross selling price",
    "gross receipts",
    "invoice requirements",
    "sales invoice",
    "official receipt",
    "advance vat",
    "advance payment",
    "vat computation"
  ]);

  const negative = scoreKeywordSet(haystack, [
    "section 112",
    "vat refund",
    "input vat refund",
    "120-day",
    "30-day",
    "section 110",
    "input tax",
    "section 109",
    "vat exempt",
    "zero-rated",
    "zero rated",
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
    shouldPreserveForVatOutputTax:
      score > 0 && authorityAllowed
  };
}

export function vatOutputTaxEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_OUTPUT_TAX_ENGINE",
    version: VAT_OUTPUT_TAX_ENGINE_VERSION,
    domain: "VAT",
    subIssue: "OUTPUT_TAX",

    targetAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_OUTPUT_TAX_SUB_ISSUE.supportingJurisprudence,

    retrievalStrategy: VAT_OUTPUT_TAX_SUB_ISSUE.retrievalStrategy,
    priorityFolders: VAT_OUTPUT_TAX_PRIORITY_FOLDERS,
    excludedFolders: VAT_OUTPUT_TAX_EXCLUDED_FOLDERS,

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

    supportsOutputVatComputation: true,
    supportsInvoiceRequirements: true,
    supportsAdvanceVatAnalysis: true,
    supportsBundledTransactionRouting: true,
    supportsGrossNetAnalysis: true,
    supportsDeemedSaleRouting: true,
    supportsVatReturnTieOut: true,

    avoidsVatRefundMisclassification: true,
    avoidsInputTaxMisclassification: true,
    avoidsAutomaticVatableRevenueAssumption: true
  };
}

export default {
  VAT_OUTPUT_TAX_ENGINE_VERSION,
  VAT_OUTPUT_TAX_SUB_ISSUE,
  VAT_OUTPUT_TAX_PRIORITY_FOLDERS,
  VAT_OUTPUT_TAX_EXCLUDED_FOLDERS,
  VAT_OUTPUT_TAX_AUTHORITY_HIERARCHY,
  VAT_OUTPUT_TAX_KEYWORDS,
  VAT_OUTPUT_TAX_ALIASES,
  VAT_OUTPUT_TAX_ANSWER_STRUCTURE,
  VAT_OUTPUT_TAX_DOCTRINAL_METADATA,
  VAT_OUTPUT_TAX_FACT_PATTERN_METADATA,

  getVatOutputTaxConfig,
  getVatOutputTaxAuthorities,
  getVatOutputTaxKeywords,
  matchVatOutputTaxQuery,
  normalizeVatOutputTaxConcept,
  classifyVatOutputTaxType,
  buildVatOutputTaxRetrievalHints,

  classifyVatOutputTaxQuery,
  buildVatOutputTaxRetrievalPlan,
  buildVatOutputTaxAnswerRules,
  enhanceIssueClassificationWithVatOutputTax,
  validateVatOutputTaxSource,
  vatOutputTaxEngineHealthCheck
};
