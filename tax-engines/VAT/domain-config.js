// FILE: tax-engines/VAT/domain-config.js
"use strict";

/**
 * TINA VAT Domain Config
 * Version: 3.0.0
 *
 * Purpose:
 * - Central reusable VAT domain authority map
 * - VAT sub-issue classification support
 * - Retrieval strategy metadata
 * - Google Drive source priority metadata
 * - Authority hierarchy metadata
 * - Answer-structure metadata
 * - Doctrinal/conflict metadata
 * - Downstream compatibility for VAT sub-issue engines
 *
 * Boundary:
 * - No OpenAI calls
 * - No retrieval execution
 * - No final-answer generation
 * - No RAG answer duplication
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../shared/authority-hierarchy.js";

export const VAT_DOMAIN_CONFIG_VERSION = "3.0.0";

export const VAT_PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS",
  "06_COURT_CASES"
]);

export const VAT_JURISPRUDENCE_PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "06_COURT_CASES",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS"
]);

export const VAT_EXCLUDED_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

export const VAT_AUTHORITY_HIERARCHY = Object.freeze([
  "CONSTITUTION",
  "STATUTE",
  "TREATY",
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

export const VAT_REQUIRED_ANSWER_SECTIONS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
  "D. SUPPORTING JURISPRUDENCE",
  "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "F. PRACTICAL NOTE / APPLICATION"
]);

export const VAT_SIMPLE_ANSWER_SECTIONS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. PRACTICAL NOTE"
]);

export const VAT_REFUND_ANSWER_SECTIONS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. PROCEDURAL / PRESCRIPTIVE PERIOD ANALYSIS",
  "E. DOCUMENTARY REQUIREMENTS / SUBSTANTIATION",
  "F. PRACTICAL POSITION / RISK"
]);

export const VAT_FACT_PATTERN_ANSWER_SECTIONS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. TRANSACTION CHARACTERIZATION",
  "D. VAT TREATMENT ANALYSIS",
  "E. AUDIT RISK / DOCUMENTARY GAPS",
  "F. PRACTICAL POSITION"
]);

export const VAT_DOMAIN = Object.freeze({
  code: "VAT",
  domainCode: "VAT",
  name: "Value-Added Tax",
  domainName: "Value-Added Tax",
  domainLabel: "VAT — Value-Added Tax",
  title: "Value-Added Tax",
  domainDescription:
    "VAT is a transaction tax on consumption imposed on taxable sales, barter, exchange, lease of goods or properties, sale or exchange of services, and importation of goods, subject to statutory exemptions, zero-rating, input tax rules, refund rules, registration rules, compliance rules, and withholding VAT rules.",

  primaryStatutes: [
    "NIRC Title IV",
    "NIRC Secs. 105–115"
  ],

  primaryRegulations: [
    "RR 16-2005"
  ],

  primaryAuthorities: [
    "NIRC Secs. 105–115",
    "RR 16-2005"
  ],

  defaultAuthorities: [
    "STATUTE",
    "RR",
    "RMC",
    "RMO",
    "BIR_RULING",
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "CTA_DIVISION"
  ],

  defaultRetrievalStrategy: "VAT_GENERAL_AUTHORITY_FIRST",
  baseRetrievalStrategy: "VAT_DOMAIN_ISSUE_SPECIFIC_RETRIEVAL",

  priorityFolders: VAT_PRIORITY_FOLDERS,
  excludedFolders: VAT_EXCLUDED_FOLDERS,
  authorityHierarchy: VAT_AUTHORITY_HIERARCHY,

  defaultAnswerSections: VAT_REQUIRED_ANSWER_SECTIONS,
  requiredAnswerSections: VAT_REQUIRED_ANSWER_SECTIONS,

  sourceGroundingRequired: true,
  compactSourcesOnly: true
});

export const VAT_SUB_ISSUE = Object.freeze({
  GENERAL: "GENERAL",
  DEFINITION: "DEFINITION",
  REFUND_CREDIT: "REFUND_CREDIT",
  ZERO_RATING: "ZERO_RATING",
  INPUT_TAX: "INPUT_TAX",
  EXEMPTION: "EXEMPTION",
  OUTPUT_TAX: "OUTPUT_TAX",
  REGISTRATION: "REGISTRATION",
  COMPLIANCE: "COMPLIANCE",
  WITHHOLDING_VAT: "WITHHOLDING_VAT",
  TRANSITIONAL_INPUT_TAX: "TRANSITIONAL_INPUT_TAX",
  DEEMED_SALE: "DEEMED_SALE",

  TRANSITIONAL: "TRANSITIONAL_INPUT_TAX",
  WVAT: "WITHHOLDING_VAT"
});

export const VAT_IDENTITY_ENGINES = Object.freeze({
  DEFINITION: "./engines/definition-engine.js",
  REFUND_CREDIT: "./engines/refund-credit-engine.js",
  ZERO_RATING: "./engines/zero-rating-engine.js",
  INPUT_TAX: "./engines/input-tax-engine.js",
  EXEMPTION: "./engines/exemption-engine.js",
  OUTPUT_TAX: "./engines/output-tax-engine.js",
  REGISTRATION: "./engines/registration-tax-engine.js",
  COMPLIANCE: "./engines/compliance-engine.js",
  WITHHOLDING_VAT: "./engines/wvat-tax-engine.js",
  TRANSITIONAL_INPUT_TAX: "./engines/transitional-input-tax-engine.js",
  DEEMED_SALE: "./engines/deemed-sale-engine.js",

  TRANSITIONAL: "./engines/transitional-input-tax-engine.js",
  WVAT: "./engines/wvat-tax-engine.js"
});

export const VAT_DOCTRINAL_RULES = Object.freeze({
  doctrines: [
    {
      code: "VAT_TRANSACTION_CONSUMPTION_TAX",
      label: "VAT as transaction/consumption tax",
      description:
        "VAT applies to transactions involving taxable sales, services, leases, importations, and deemed sales, subject to statutory rules."
    },
    {
      code: "VAT_INDIRECT_TAX",
      label: "VAT as indirect tax",
      description:
        "VAT is generally imposed on the seller or person liable but may be shifted to the buyer as part of the price."
    },
    {
      code: "ZERO_RATING_DIFFERS_FROM_EXEMPTION",
      label: "Zero-rating differs from exemption",
      description:
        "Zero-rated sales remain taxable at 0%, while exempt transactions are treated differently for output and input VAT purposes."
    },
    {
      code: "EXEMPTION_DIFFERS_FROM_OUTSIDE_SCOPE",
      label: "Exemption differs from outside-scope/non-VAT treatment",
      description:
        "A transaction outside VAT scope is not automatically the same as a VAT-exempt transaction under Sec. 109."
    },
    {
      code: "INPUT_TAX_REQUIRES_SUBSTANTIATION",
      label: "Input tax requires statutory basis and support",
      description:
        "Input VAT creditability depends on statutory requirements, attribution, and valid supporting documents."
    },
    {
      code: "REFUND_REQUIRES_SECTION_112_ANALYSIS",
      label: "VAT refund requires Sec. 112 analysis",
      description:
        "VAT refund or tax credit claims require separate Sec. 112, timing, jurisdiction, and substantiation analysis."
    },
    {
      code: "OUTPUT_TAX_REQUIRES_TRANSACTION_CHARACTERIZATION",
      label: "Output VAT requires transaction characterization",
      description:
        "Output VAT base and timing may require sale/service/lease/deemed-sale, gross-vs-net, and principal-agent analysis."
    },
    {
      code: "WVAT_DISTINCT_FROM_EWT_CWT",
      label: "Withholding VAT differs from EWT/CWT",
      description:
        "Government withholding VAT is a VAT mechanism and must not be confused with income tax withholding."
    },
    {
      code: "ADMIN_ISSUANCE_LIMIT",
      label: "Administrative issuances cannot override statute or Supreme Court doctrine",
      description:
        "RRs, RMCs, RMOs, rulings, and administrative guidance cannot override the NIRC or controlling Supreme Court jurisprudence."
    }
  ],

  conflictRule:
    "Do not mark conflict automatically. Conflict metadata is valid only if same exact issue, same legal dimension, opposite rule or holding, hierarchy analysis, and conflict-resolution basis are present.",

  automaticConflictDetection: false,
  retrievalPriorityIsNotLegalSupremacy: true
});

export const VAT_SOURCE_GROUNDING_RULES = Object.freeze({
  sourceGroundingRequired: true,
  compactSourcesOnly: true,
  preserveExactAuthorityReferences: true,
  preserveTargetAuthorityMatches: true,
  preserveIssueClassificationMatches: true,
  preserveControllingAuthorities: true,
  excludeReviewMaterialsUnlessReviewMode: true,
  excludedFolders: VAT_EXCLUDED_FOLDERS,
  normalPriorityFolders: VAT_PRIORITY_FOLDERS,
  jurisprudencePriorityFolders: VAT_JURISPRUDENCE_PRIORITY_FOLDERS
});

export const VAT_DISTINCTION_RULES = Object.freeze({
  commonDistinctions: [
    ["ZERO_RATING", "EXEMPTION"],
    ["EXEMPTION", "OUTSIDE_SCOPE"],
    ["INPUT_TAX", "REFUND_CREDIT"],
    ["OUTPUT_TAX", "DEEMED_SALE"],
    ["REGISTRATION", "COMPLIANCE"],
    ["WITHHOLDING_VAT", "WHT:CREDITABLE_WHT"],
    ["WITHHOLDING_VAT", "WHT:FINAL_WHT"]
  ],
  distinctionRequiredWhenAmbiguous: true
});

function buildSubIssueConfig({
  subIssue,
  label,
  description,
  keywords = [],
  aliases = [],
  patterns = [],
  retrievalStrategy,
  targetAuthorities = [],
  controllingAuthorities = [],
  supportingAuthorities = [],
  supportingJurisprudence = [],
  priorityFolders = VAT_PRIORITY_FOLDERS,
  excludedFolders = VAT_EXCLUDED_FOLDERS,
  requiredAnswerSections = VAT_REQUIRED_ANSWER_SECTIONS,
  tpmProfile = "STANDARD",
  sourceGroundingRequired = true,
  expectedSourceTypes = [],
  legalDimensions = [],
  enginePath = null,
  conflictSensitive = false,
  doctrineSensitive = true,
  complianceSensitive = false,
  computationSensitive = false,
  refundSensitive = false,
  auditRiskSensitive = false,
  flags = {}
}) {
  return Object.freeze({
    code: subIssue,
    subIssue,
    label,
    description,
    keywords,
    aliases,
    patterns,

    retrievalStrategy,
    targetAuthorities,
    controllingAuthorities,
    supportingAuthorities,
    supportingJurisprudence,

    priorityFolders,
    excludedFolders,
    requiredAnswerSections,
    tpmProfile,
    sourceGroundingRequired,
    expectedSourceTypes,

    authorityHierarchy: VAT_AUTHORITY_HIERARCHY,
    legalDimensions,
    enginePath,

    conflictSensitive,
    doctrineSensitive,
    complianceSensitive,
    computationSensitive,
    refundSensitive,
    auditRiskSensitive,

    flags: Object.freeze({
      requiresTransactionCharacterization: false,
      requiresEconomicSubstanceAnalysis: false,
      requiresPrincipalAgentAnalysis: false,
      requiresGrossVsNetAnalysis: false,
      requiresInputTaxAllocation: false,
      requiresSubstantiationReview: false,
      requiresInvoiceReview: false,
      requiresVatReturnTieOut: false,
      requiresSLSPTieOut: false,
      requiresRefundRouting: false,
      requiresPrescriptionAnalysis: false,
      requiresZeroRatingExemptionDistinction: false,
      requiresOutputTaxComputation: false,
      requiresRegistrationThresholdAnalysis: false,
      requiresGovernmentPayorCheck: false,
      requiresAuditEvidenceReview: false,
      requiresPositionStrengthAnalysis: false,
      requiresRiskScoring: false,
      ...flags
    }),

    doctrinalRules: VAT_DOCTRINAL_RULES,
    conflictRules: {
      conflictRule: VAT_DOCTRINAL_RULES.conflictRule,
      automaticConflictDetection: false
    },

    retrievalHints: {
      domainCode: VAT_DOMAIN.code,
      domainName: VAT_DOMAIN.name,
      primarySubIssue: subIssue,
      subIssue,
      retrievalStrategy,
      boostTerms: [],
      targetAuthorities,
      controllingAuthorities,
      supportingAuthorities,
      supportingJurisprudence,
      priorityFolders,
      excludedFolders,
      sourceGroundingRequired,
      compactSourcesOnly: true,
      preserveTargetAuthorityMatches: true,
      preserveIssueClassificationMatches: true,
      preserveControllingAuthorities: true
    }
  });
}

export const VAT_SUB_ISSUE_REGISTRY = Object.freeze({
  GENERAL: buildSubIssueConfig({
    subIssue: "GENERAL",
    label: "General VAT — NIRC Title IV and RR 16-2005",
    description:
      "Fallback VAT classification when the precise VAT sub-issue cannot be determined.",
    keywords: [
      "vat",
      "value-added tax",
      "value added tax",
      "vatable",
      "taxable transaction",
      "sale of goods",
      "sale of services",
      "importation"
    ],
    aliases: ["VAT_GENERAL", "GENERAL_VAT"],
    retrievalStrategy: "VAT_GENERAL_AUTHORITY_FIRST",
    targetAuthorities: [
      "NIRC Secs. 105–115",
      "RR 16-2005"
    ],
    controllingAuthorities: [
      "NIRC Secs. 105–115",
      "RR 16-2005"
    ],
    supportingAuthorities: [],
    supportingJurisprudence: [],
    requiredAnswerSections: VAT_REQUIRED_ANSWER_SECTIONS,
    tpmProfile: "STANDARD",
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE"],
    enginePath: "./tax-engines/VAT/domain-config.js"
  }),

  DEFINITION: buildSubIssueConfig({
    subIssue: "DEFINITION",
    label: "Definition — Nature and scope of VAT",
    description:
      "Nature and scope of VAT; taxable transactions; persons liable; sale of goods; sale of services; importation.",
    keywords: [
      "what is vat",
      "define vat",
      "vat definition",
      "vat meaning",
      "nature of vat",
      "scope of vat",
      "value-added tax",
      "value added tax",
      "indirect tax",
      "destination principle",
      "taxable transaction",
      "transactions subject to vat",
      "persons liable",
      "sale of goods",
      "sale of services",
      "importation"
    ],
    aliases: [
      "VAT_DEFINITION",
      "NATURE_SCOPE",
      "FOUNDATIONAL_VAT",
      "VAT_LIABILITY"
    ],
    retrievalStrategy: "VAT_DEFINITION_AUTHORITY_FIRST",
    targetAuthorities: [
      "NIRC Secs. 105–108",
      "RR 16-2005",
      "CIR v. Seagate Technology",
      "CIR v. Aichi Forging",
      "CIR v. Toshiba"
    ],
    controllingAuthorities: [
      "NIRC Sec. 105",
      "NIRC Sec. 106",
      "NIRC Sec. 107",
      "NIRC Sec. 108",
      "RR 16-2005"
    ],
    supportingAuthorities: [
      "RR 16-2005"
    ],
    supportingJurisprudence: [
      "CIR v. Seagate Technology",
      "CIR v. Aichi Forging",
      "CIR v. Toshiba"
    ],
    requiredAnswerSections: VAT_SIMPLE_ANSWER_SECTIONS,
    tpmProfile: "LIGHT",
    expectedSourceTypes: ["STATUTE", "RR", "SUPREME_COURT"],
    legalDimensions: ["SUBSTANTIVE"],
    enginePath: VAT_IDENTITY_ENGINES.DEFINITION,
    conflictSensitive: false,
    doctrineSensitive: true
  }),

  REFUND_CREDIT: buildSubIssueConfig({
    subIssue: "REFUND_CREDIT",
    label: "Refund / Credit — VAT refund, tax credit, and Sec. 112 claims",
    description:
      "Sec. 112 VAT refund or tax credit; administrative claim; judicial claim; 120-day/30-day rule; zero-rated input VAT refund.",
    keywords: [
      "vat refund",
      "input vat refund",
      "tax credit",
      "tax credit certificate",
      "tcc",
      "sec. 112",
      "section 112",
      "administrative claim",
      "judicial claim",
      "120-day rule",
      "30-day rule",
      "unutilized input vat",
      "excess input vat",
      "zero-rated sales refund",
      "cta refund"
    ],
    aliases: [
      "VAT_REFUND",
      "INPUT_VAT_REFUND",
      "SECTION_112",
      "TAX_CREDIT",
      "REFUND"
    ],
    retrievalStrategy: "VAT_REFUND_CREDIT_JURISPRUDENCE_FIRST",
    targetAuthorities: [
      "NIRC Sec. 112",
      "NIRC Sec. 110, where input tax creditability is implicated",
      "RR 16-2005 refund/input tax provisions",
      "CIR v. San Roque Power",
      "CIR v. Aichi Forging",
      "CIR v. Mirant Pagbilao",
      "CIR v. Pilipinas Total Gas"
    ],
    controllingAuthorities: [
      "NIRC Sec. 112",
      "NIRC Sec. 110, where input tax creditability is implicated",
      "RR 16-2005 refund/input tax provisions"
    ],
    supportingAuthorities: [
      "Relevant RMCs/RRs on VAT refund procedure",
      "CTA rules, if litigation or appeal is implicated"
    ],
    supportingJurisprudence: [
      "CIR v. San Roque Power",
      "CIR v. Aichi Forging",
      "CIR v. Mirant Pagbilao",
      "CIR v. Pilipinas Total Gas"
    ],
    priorityFolders: VAT_JURISPRUDENCE_PRIORITY_FOLDERS,
    requiredAnswerSections: VAT_REFUND_ANSWER_SECTIONS,
    tpmProfile: "HEAVY",
    expectedSourceTypes: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR", "RMC"],
    legalDimensions: ["PROCEDURAL", "EVIDENTIARY", "JURISDICTIONAL", "LITIGATION"],
    enginePath: VAT_IDENTITY_ENGINES.REFUND_CREDIT,
    conflictSensitive: true,
    refundSensitive: true,
    auditRiskSensitive: true,
    flags: {
      requiresRefundRouting: true,
      requiresPrescriptionAnalysis: true,
      requiresSubstantiationReview: true,
      requiresInvoiceReview: true,
      requiresVatReturnTieOut: true,
      requiresSLSPTieOut: true,
      requiresAuditEvidenceReview: true,
      requiresPositionStrengthAnalysis: true,
      requiresRiskScoring: true
    }
  }),

  ZERO_RATING: buildSubIssueConfig({
    subIssue: "ZERO_RATING",
    label: "Zero-Rating — Export sales, PEZA/BOI/CREATE, and cross-border doctrine",
    description:
      "Zero-rated sales; export sales; effectively zero-rated sales; cross-border doctrine; destination principle; PEZA/BOI/CREATE-related zero-rating.",
    keywords: [
      "zero-rated",
      "zero rating",
      "0% vat",
      "zero-rated sales",
      "effectively zero-rated",
      "export sales",
      "foreign currency",
      "cross-border doctrine",
      "destination principle",
      "services to nonresident",
      "peza",
      "boi",
      "create",
      "registered export enterprise",
      "direct and exclusive use"
    ],
    aliases: [
      "ZERO_RATED_SALES",
      "EFFECTIVELY_ZERO_RATED",
      "EXPORT_SALES",
      "CROSS_BORDER",
      "PEZA_ZERO_RATING",
      "CREATE_ZERO_RATING"
    ],
    retrievalStrategy: "VAT_ZERO_RATING_AUTHORITY_AND_CASE_FIRST",
    targetAuthorities: [
      "NIRC Sec. 106(A)(2)",
      "NIRC Sec. 108(B)",
      "RR 16-2005",
      "RMC 50-2007",
      "PEZA Law R.A. 7916, where applicable",
      "CREATE Act R.A. 11534, where applicable",
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
      "CREATE Act R.A. 11534, where applicable"
    ],
    supportingJurisprudence: [
      "CIR v. Toshiba",
      "CIR v. Seagate"
    ],
    priorityFolders: VAT_JURISPRUDENCE_PRIORITY_FOLDERS,
    requiredAnswerSections: VAT_FACT_PATTERN_ANSWER_SECTIONS,
    tpmProfile: "HEAVY",
    expectedSourceTypes: ["STATUTE", "RR", "RMC", "SUPREME_COURT"],
    legalDimensions: ["SUBSTANTIVE", "EVIDENTIARY", "COMPLIANCE", "TRANSACTION"],
    enginePath: VAT_IDENTITY_ENGINES.ZERO_RATING,
    conflictSensitive: true,
    refundSensitive: true,
    auditRiskSensitive: true,
    flags: {
      requiresTransactionCharacterization: true,
      requiresSubstantiationReview: true,
      requiresInvoiceReview: true,
      requiresVatReturnTieOut: true,
      requiresSLSPTieOut: true,
      requiresRefundRouting: true,
      requiresZeroRatingExemptionDistinction: true,
      requiresAuditEvidenceReview: true,
      requiresRiskScoring: true
    }
  })
});

const VAT_SUB_ISSUE_REGISTRY_PART_2 = Object.freeze({
  INPUT_TAX: buildSubIssueConfig({
    subIssue: "INPUT_TAX",
    label: "Input Tax — Creditable input VAT, substantiation, allocation, and carry-over",
    description:
      "Creditable input tax; substantiation; invoice support; input tax allocation; mixed transactions; input VAT carry-over; refund overlap.",
    keywords: [
      "input tax",
      "input vat",
      "creditable input tax",
      "creditable input vat",
      "vat invoice",
      "substantiation",
      "input vat allocation",
      "mixed transactions",
      "exempt sales input vat",
      "zero-rated input vat",
      "capital goods",
      "carry-over",
      "input vat disallowance",
      "sec. 110",
      "section 110",
      "rmc 42-2003"
    ],
    aliases: [
      "VAT_INPUT_TAX",
      "INPUT_VAT",
      "CREDITABLE_INPUT_TAX",
      "INPUT_TAX_CREDIT",
      "INPUT_TAX_SUBSTANTIATION"
    ],
    retrievalStrategy: "VAT_INPUT_TAX_SUBSTANTIATION_FIRST",
    targetAuthorities: [
      "NIRC Sec. 110",
      "RR 16-2005 Sec. 4.110",
      "RMC 42-2003, where applicable",
      "CIR v. Medicard Philippines, if relevant and retrieved"
    ],
    controllingAuthorities: [
      "NIRC Sec. 110",
      "RR 16-2005 Sec. 4.110",
      "Applicable invoice/substantiation provisions"
    ],
    supportingAuthorities: [
      "RMC 42-2003, where applicable",
      "Applicable RMCs/RRs on invoicing and substantiation"
    ],
    supportingJurisprudence: [
      "CIR v. Medicard Philippines, if relevant and retrieved"
    ],
    requiredAnswerSections: VAT_FACT_PATTERN_ANSWER_SECTIONS,
    tpmProfile: "STANDARD",
    expectedSourceTypes: ["STATUTE", "RR", "RMC", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],
    legalDimensions: ["SUBSTANTIVE", "EVIDENTIARY", "COMPLIANCE", "ACCOUNTING"],
    enginePath: VAT_IDENTITY_ENGINES.INPUT_TAX,
    conflictSensitive: true,
    computationSensitive: true,
    auditRiskSensitive: true,
    flags: {
      requiresInputTaxAllocation: true,
      requiresSubstantiationReview: true,
      requiresInvoiceReview: true,
      requiresVatReturnTieOut: true,
      requiresSLSPTieOut: true,
      requiresRefundRouting: true,
      requiresAuditEvidenceReview: true,
      requiresRiskScoring: true
    }
  }),

  EXEMPTION: buildSubIssueConfig({
    subIssue: "EXEMPTION",
    label: "Exemption — Sec. 109 VAT exemptions and special law exemptions",
    description:
      "VAT-exempt transactions under Sec. 109; special law exemptions; entity-based exemptions; transaction-based exemptions; BIR ruling-sensitive exemptions.",
    keywords: [
      "vat exempt",
      "vat-exempt",
      "exempt transaction",
      "exempt sale",
      "exempt from vat",
      "sec. 109",
      "section 109",
      "special law exemption",
      "bir ruling",
      "outside vat",
      "non-vat",
      "entity-based exemption",
      "transaction-based exemption",
      "rmc 30-2008"
    ],
    aliases: [
      "VAT_EXEMPTION",
      "SECTION_109",
      "SEC_109",
      "EXEMPT_TRANSACTION",
      "NON_VAT",
      "SPECIAL_LAW_EXEMPTION"
    ],
    retrievalStrategy: "VAT_EXEMPTION_STATUTE_AND_RULING_FIRST",
    targetAuthorities: [
      "NIRC Sec. 109",
      "RR 16-2005 exemption provisions",
      "Applicable special laws",
      "BIR rulings for specific entities or transactions",
      "RMC 30-2008, where applicable"
    ],
    controllingAuthorities: [
      "NIRC Sec. 109",
      "RR 16-2005 exemption provisions",
      "Applicable special laws, where relevant"
    ],
    supportingAuthorities: [
      "BIR rulings for specific entities or transactions",
      "RMC 30-2008, where applicable",
      "Other VAT exemption-related RMCs/RRs if relevant"
    ],
    supportingJurisprudence: [
      "Issue-relevant VAT exemption jurisprudence only if retrieved"
    ],
    requiredAnswerSections: VAT_FACT_PATTERN_ANSWER_SECTIONS,
    tpmProfile: "STANDARD",
    expectedSourceTypes: ["STATUTE", "RR", "RMC", "BIR_RULING", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],
    legalDimensions: ["SUBSTANTIVE", "EVIDENTIARY", "TRANSACTION"],
    enginePath: VAT_IDENTITY_ENGINES.EXEMPTION,
    conflictSensitive: true,
    auditRiskSensitive: true,
    flags: {
      requiresTransactionCharacterization: true,
      requiresZeroRatingExemptionDistinction: true,
      requiresSubstantiationReview: true,
      requiresAuditEvidenceReview: true,
      requiresRiskScoring: true
    }
  }),

  OUTPUT_TAX: buildSubIssueConfig({
    subIssue: "OUTPUT_TAX",
    label: "Output Tax — Computation, tax base, timing, invoicing, and bundled transactions",
    description:
      "Output VAT computation; sale of goods; sale of services; lease of properties; gross selling price; gross receipts; timing; invoice requirements; bundled transactions.",
    keywords: [
      "output tax",
      "output vat",
      "vat payable",
      "vatable sales",
      "sale of goods",
      "sale of services",
      "gross selling price",
      "gross receipts",
      "tax base",
      "invoice requirements",
      "bundled transaction",
      "gross vs net revenue",
      "principal agent",
      "sec. 106",
      "section 106",
      "sec. 108",
      "section 108",
      "rr 18-2011",
      "rmc 55-2019"
    ],
    aliases: [
      "VAT_OUTPUT_TAX",
      "OUTPUT_VAT",
      "VATABLE_SALES",
      "VAT_PAYABLE",
      "OUTPUT_TAX_COMPUTATION",
      "VAT_TAX_BASE"
    ],
    retrievalStrategy: "VAT_OUTPUT_TAX_COMPUTATION_FIRST",
    targetAuthorities: [
      "NIRC Sec. 106",
      "NIRC Sec. 108",
      "RR 16-2005",
      "RR 18-2011, where applicable",
      "RMC 55-2019, where applicable"
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
      "Issue-relevant VAT output tax jurisprudence only if retrieved"
    ],
    requiredAnswerSections: VAT_FACT_PATTERN_ANSWER_SECTIONS,
    tpmProfile: "STANDARD",
    expectedSourceTypes: ["STATUTE", "RR", "RMC", "BIR_RULING", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE", "ACCOUNTING", "TRANSACTION"],
    enginePath: VAT_IDENTITY_ENGINES.OUTPUT_TAX,
    conflictSensitive: true,
    computationSensitive: true,
    auditRiskSensitive: true,
    flags: {
      requiresTransactionCharacterization: true,
      requiresEconomicSubstanceAnalysis: true,
      requiresPrincipalAgentAnalysis: true,
      requiresGrossVsNetAnalysis: true,
      requiresInvoiceReview: true,
      requiresVatReturnTieOut: true,
      requiresSLSPTieOut: true,
      requiresOutputTaxComputation: true,
      requiresAuditEvidenceReview: true,
      requiresRiskScoring: true
    }
  }),

  REGISTRATION: buildSubIssueConfig({
    subIssue: "REGISTRATION",
    label: "Registration — VAT threshold, mandatory/optional registration, and cancellation",
    description:
      "Mandatory VAT registration; optional VAT registration; VAT threshold; non-VAT taxpayer distinction; cancellation/update of VAT registration.",
    keywords: [
      "vat registration",
      "register as vat",
      "vat registered",
      "non-vat",
      "non vat",
      "vat threshold",
      "registration threshold",
      "mandatory vat registration",
      "optional vat registration",
      "cancellation of vat registration",
      "certificate of registration",
      "cor",
      "bir registration",
      "sec. 236",
      "section 236",
      "sec. 109(bb)",
      "rmc 75-2015"
    ],
    aliases: [
      "VAT_REGISTRATION",
      "REGISTRATION_THRESHOLD",
      "OPTIONAL_REGISTRATION",
      "MANDATORY_REGISTRATION",
      "CANCELLATION"
    ],
    retrievalStrategy: "VAT_REGISTRATION_COMPLIANCE_FIRST",
    targetAuthorities: [
      "NIRC Sec. 236",
      "NIRC Sec. 109(BB), where threshold/non-VAT issue is implicated",
      "RR 16-2005 Secs. 4.100–4.103",
      "RMC 75-2015"
    ],
    controllingAuthorities: [
      "NIRC Sec. 236",
      "NIRC Sec. 109(BB), where VAT threshold or non-VAT taxpayer issue is implicated",
      "RR 16-2005 Secs. 4.100–4.103"
    ],
    supportingAuthorities: [
      "RMC 75-2015, where applicable",
      "Applicable RMCs/RRs on VAT registration, cancellation, and BIR registration updates"
    ],
    supportingJurisprudence: [
      "Issue-relevant VAT registration jurisprudence only if retrieved"
    ],
    requiredAnswerSections: VAT_FACT_PATTERN_ANSWER_SECTIONS,
    tpmProfile: "STANDARD",
    expectedSourceTypes: ["STATUTE", "RR", "RMC", "RMO", "BIR_RULING"],
    legalDimensions: ["COMPLIANCE", "PROCEDURAL", "SUBSTANTIVE", "EVIDENTIARY"],
    enginePath: VAT_IDENTITY_ENGINES.REGISTRATION,
    complianceSensitive: true,
    auditRiskSensitive: true,
    flags: {
      requiresRegistrationThresholdAnalysis: true,
      requiresVatReturnTieOut: true,
      requiresInvoiceReview: true,
      requiresAuditEvidenceReview: true,
      requiresRiskScoring: true
    }
  }),

  COMPLIANCE: buildSubIssueConfig({
    subIssue: "COMPLIANCE",
    label: "Compliance — VAT returns, BIR Forms 2550M/2550Q, SLSP, filing, and payment",
    description:
      "VAT return filing and payment; BIR Forms 2550M/2550Q; eFPS/eBIR filing; invoicing; deadlines; penalties; SLSP/VAT reconciliation.",
    keywords: [
      "2550m",
      "2550q",
      "bir form 2550m",
      "bir form 2550q",
      "vat return",
      "vat filing",
      "vat payment",
      "deadline",
      "due date",
      "efps",
      "ebir",
      "ebirforms",
      "slsp",
      "summary list of sales",
      "summary list of purchases",
      "vat reconciliation",
      "penalty"
    ],
    aliases: [
      "VAT_COMPLIANCE",
      "VAT_RETURN",
      "2550Q",
      "2550M",
      "SLSP",
      "VAT_FILING"
    ],
    retrievalStrategy: "VAT_COMPLIANCE_ADMIN_FIRST",
    targetAuthorities: [
      "NIRC Sec. 114",
      "RR 16-2005",
      "Applicable VAT filing/payment issuances",
      "BIR Form 2550M/Q rules",
      "eFPS/eBIR filing issuances"
    ],
    controllingAuthorities: [
      "NIRC Sec. 114",
      "RR 16-2005"
    ],
    supportingAuthorities: [
      "Applicable VAT filing/payment issuances",
      "BIR Form 2550M/Q rules",
      "eFPS/eBIR filing issuances"
    ],
    supportingJurisprudence: [],
    requiredAnswerSections: VAT_FACT_PATTERN_ANSWER_SECTIONS,
    tpmProfile: "LIGHT",
    expectedSourceTypes: ["STATUTE", "RR", "RMC", "RMO", "BIR_RULING", "ADMINISTRATIVE_GUIDANCE"],
    legalDimensions: ["COMPLIANCE", "PROCEDURAL", "EVIDENTIARY"],
    enginePath: VAT_IDENTITY_ENGINES.COMPLIANCE,
    complianceSensitive: true,
    auditRiskSensitive: true,
    flags: {
      requiresInvoiceReview: true,
      requiresVatReturnTieOut: true,
      requiresSLSPTieOut: true,
      requiresAuditEvidenceReview: true,
      requiresRiskScoring: true
    }
  })
});

const VAT_SUB_ISSUE_REGISTRY_PART_3 = Object.freeze({
  WITHHOLDING_VAT: buildSubIssueConfig({
    subIssue: "WITHHOLDING_VAT",
    label: "Withholding VAT — Government money payments and final withholding VAT",
    description:
      "Government withholding VAT; 5% final withholding VAT; government money payments; withholding VAT vs EWT/CWT distinction.",
    keywords: [
      "withholding vat",
      "wvat",
      "government withholding vat",
      "5% final withholding vat",
      "final withholding vat",
      "government money payment",
      "government payments",
      "vat withheld",
      "vat withheld by government",
      "sec. 114(c)",
      "section 114(c)",
      "rr 1-2012",
      "rr 13-2018",
      "rmc 40-2012",
      "withholding vat vs ewt",
      "withholding vat vs cwt"
    ],
    aliases: [
      "VAT_WITHHOLDING",
      "WITHHOLDING_VAT",
      "WVAT",
      "FINAL_WITHHOLDING_VAT",
      "GOVERNMENT_MONEY_PAYMENT"
    ],
    retrievalStrategy: "VAT_WITHHOLDING_GOVERNMENT_FIRST",
    targetAuthorities: [
      "NIRC Sec. 114(C)",
      "RR 1-2012",
      "RR 13-2018",
      "RMC 40-2012",
      "RR 16-2005 withholding VAT provisions, where applicable"
    ],
    controllingAuthorities: [
      "NIRC Sec. 114(C)",
      "RR 16-2005 provisions on VAT withholding, where applicable",
      "RR 1-2012",
      "RR 13-2018",
      "RMC 40-2012"
    ],
    supportingAuthorities: [
      "Relevant RMCs/RRs on government money payments and VAT withholding",
      "Applicable BIR forms/remittance issuances, if retrieved"
    ],
    supportingJurisprudence: [
      "Issue-relevant WVAT jurisprudence only if retrieved"
    ],
    requiredAnswerSections: VAT_FACT_PATTERN_ANSWER_SECTIONS,
    tpmProfile: "STANDARD",
    expectedSourceTypes: ["STATUTE", "RR", "RMC", "RMO", "BIR_RULING"],
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE", "PROCEDURAL", "EVIDENTIARY"],
    enginePath: VAT_IDENTITY_ENGINES.WITHHOLDING_VAT,
    complianceSensitive: true,
    auditRiskSensitive: true,
    flags: {
      requiresGovernmentPayorCheck: true,
      requiresInvoiceReview: true,
      requiresVatReturnTieOut: true,
      requiresAuditEvidenceReview: true,
      requiresRiskScoring: true
    }
  }),

  TRANSITIONAL_INPUT_TAX: buildSubIssueConfig({
    subIssue: "TRANSITIONAL_INPUT_TAX",
    label: "Transitional Input Tax — Beginning inventory and newly VAT-registered taxpayers",
    description:
      "Transitional input tax; beginning inventory; newly VAT-registered taxpayers; change from non-VAT to VAT.",
    keywords: [
      "transitional input tax",
      "transitional input vat",
      "beginning inventory",
      "newly vat-registered",
      "new vat taxpayer",
      "non-vat to vat",
      "change from non-vat to vat",
      "sec. 111",
      "section 111"
    ],
    aliases: [
      "TRANSITIONAL",
      "TRANSITIONAL_INPUT_VAT",
      "BEGINNING_INVENTORY_INPUT_TAX"
    ],
    retrievalStrategy: "VAT_TRANSITIONAL_INPUT_TAX_FIRST",
    targetAuthorities: [
      "NIRC Sec. 111",
      "RR 16-2005",
      "Relevant BIR rulings or issuances"
    ],
    controllingAuthorities: [
      "NIRC Sec. 111",
      "RR 16-2005"
    ],
    supportingAuthorities: [
      "Relevant BIR rulings or issuances"
    ],
    supportingJurisprudence: [],
    requiredAnswerSections: VAT_FACT_PATTERN_ANSWER_SECTIONS,
    tpmProfile: "STANDARD",
    expectedSourceTypes: ["STATUTE", "RR", "RMC", "RMO", "BIR_RULING"],
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE", "ACCOUNTING", "EVIDENTIARY"],
    enginePath: VAT_IDENTITY_ENGINES.TRANSITIONAL_INPUT_TAX,
    computationSensitive: true,
    auditRiskSensitive: true,
    flags: {
      requiresSubstantiationReview: true,
      requiresInvoiceReview: true,
      requiresAuditEvidenceReview: true,
      requiresRiskScoring: true
    }
  }),

  DEEMED_SALE: buildSubIssueConfig({
    subIssue: "DEEMED_SALE",
    label: "Deemed Sale — Transactions deemed sale for VAT purposes",
    description:
      "Deemed sale transactions; transfer, use, or consumption not in the ordinary course of business; distribution to shareholders/investors/creditors; retirement or cessation.",
    keywords: [
      "deemed sale",
      "transactions deemed sale",
      "transaction deemed sale",
      "sec. 106(b)",
      "section 106(b)",
      "distribution to shareholders",
      "distribution to investors",
      "distribution to creditors",
      "transfer of goods",
      "consignment",
      "retirement",
      "cessation",
      "change in business activity"
    ],
    aliases: [
      "TRANSACTIONS_DEEMED_SALE",
      "SECTION_106B",
      "DEEMED_OUTPUT_VAT",
      "DEEMED_SALE_OUTPUT_TAX"
    ],
    retrievalStrategy: "VAT_DEEMED_SALE_STATUTE_FIRST",
    targetAuthorities: [
      "NIRC Sec. 106(B)",
      "RR 16-2005 deemed sale provisions"
    ],
    controllingAuthorities: [
      "NIRC Sec. 106(B)",
      "RR 16-2005 deemed sale provisions"
    ],
    supportingAuthorities: [],
    supportingJurisprudence: [],
    requiredAnswerSections: VAT_FACT_PATTERN_ANSWER_SECTIONS,
    tpmProfile: "STANDARD",
    expectedSourceTypes: ["STATUTE", "RR", "RMC", "BIR_RULING"],
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE", "ACCOUNTING", "TRANSACTION"],
    enginePath: VAT_IDENTITY_ENGINES.DEEMED_SALE,
    computationSensitive: true,
    auditRiskSensitive: true,
    flags: {
      requiresTransactionCharacterization: true,
      requiresOutputTaxComputation: true,
      requiresVatReturnTieOut: true,
      requiresAuditEvidenceReview: true,
      requiresRiskScoring: true
    }
  })
});

export const VAT_COMPLETE_SUB_ISSUE_REGISTRY = Object.freeze({
  ...VAT_SUB_ISSUE_REGISTRY,
  ...VAT_SUB_ISSUE_REGISTRY_PART_2,
  ...VAT_SUB_ISSUE_REGISTRY_PART_3
});

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s%+./()–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value = "") {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s/-]+/g, "_");

  const aliases = {
    VAT_GENERAL: "GENERAL",
    GENERAL_VAT: "GENERAL",

    VAT_DEFINITION: "DEFINITION",
    NATURE_SCOPE: "DEFINITION",
    FOUNDATIONAL_VAT: "DEFINITION",
    VAT_LIABILITY: "DEFINITION",

    INPUT_VAT_REFUND: "REFUND_CREDIT",
    VAT_REFUND: "REFUND_CREDIT",
    TAX_CREDIT: "REFUND_CREDIT",
    SECTION_112: "REFUND_CREDIT",
    REFUND: "REFUND_CREDIT",

    ZERO_RATED: "ZERO_RATING",
    ZERO_RATED_SALES: "ZERO_RATING",
    EFFECTIVELY_ZERO_RATED: "ZERO_RATING",
    EXPORT_SALES: "ZERO_RATING",
    PEZA_ZERO_RATING: "ZERO_RATING",
    CREATE_ZERO_RATING: "ZERO_RATING",

    VAT_INPUT: "INPUT_TAX",
    INPUT_VAT: "INPUT_TAX",
    CREDITABLE_INPUT_TAX: "INPUT_TAX",

    VAT_EXEMPTION: "EXEMPTION",
    SECTION_109: "EXEMPTION",
    SEC_109: "EXEMPTION",
    EXEMPT_TRANSACTION: "EXEMPTION",
    NON_VAT: "EXEMPTION",

    VAT_OUTPUT: "OUTPUT_TAX",
    OUTPUT_VAT: "OUTPUT_TAX",
    VATABLE_SALES: "OUTPUT_TAX",
    VAT_PAYABLE: "OUTPUT_TAX",

    VAT_REGISTRATION: "REGISTRATION",
    REGISTRATION_THRESHOLD: "REGISTRATION",

    VAT_RETURN: "COMPLIANCE",
    FILING: "COMPLIANCE",
    VAT_FILING: "COMPLIANCE",
    "2550Q": "COMPLIANCE",
    "2550M": "COMPLIANCE",

    VAT_WITHHOLDING: "WITHHOLDING_VAT",
    WITHHOLDING: "WITHHOLDING_VAT",
    WVAT: "WITHHOLDING_VAT",
    FINAL_WITHHOLDING_VAT: "WITHHOLDING_VAT",

    TRANSITIONAL: "TRANSITIONAL_INPUT_TAX",
    TRANSITIONAL_INPUT: "TRANSITIONAL_INPUT_TAX",
    TRANSITIONAL_INPUT_VAT: "TRANSITIONAL_INPUT_TAX",

    SECTION_106B: "DEEMED_SALE",
    TRANSACTIONS_DEEMED_SALE: "DEEMED_SALE"
  };

  return aliases[raw] || raw;
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function scoreKeywords(text = "", terms = []) {
  let score = 0;
  const matchedTerms = [];

  for (const term of terms || []) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;

    if (text.includes(normalizedTerm)) {
      matchedTerms.push(term);
      score += normalizedTerm.length >= 14 ? 3 : normalizedTerm.length >= 8 ? 2 : 1;
    }
  }

  return { score, matchedTerms };
}

export function isVatReviewMode(context = {}) {
  const mode = String(
    context.mode ||
      context.responseMode ||
      context.orchestrationMode ||
      context.queryIntent?.intent ||
      context.intent ||
      ""
  ).toUpperCase();

  return (
    context.reviewMode === true ||
    context.requiresReviewMode === true ||
    context.requiresQuizMode === true ||
    context.queryIntent?.requiresReviewMode === true ||
    context.queryIntent?.requiresQuizMode === true ||
    ["REVIEW_MODE", "TAX_REVIEWER", "QUIZ_MODE", "LEARNING_MODE", "ASSESSMENT"].includes(mode) ||
    String(context.originalQuery || context.query || "").toLowerCase().includes("/review")
  );
}

export function normalizeVatSubIssue(value = "") {
  return normalizeCode(value);
}

export function getVatDomainConfig() {
  return {
    engine: "tax-engines/VAT/domain-config.js",
    version: VAT_DOMAIN_CONFIG_VERSION,
    domain: VAT_DOMAIN,
    subIssues: VAT_COMPLETE_SUB_ISSUE_REGISTRY,
    priorityFolders: VAT_PRIORITY_FOLDERS,
    jurisprudencePriorityFolders: VAT_JURISPRUDENCE_PRIORITY_FOLDERS,
    excludedFolders: VAT_EXCLUDED_FOLDERS,
    authorityHierarchy: VAT_AUTHORITY_HIERARCHY,
    answerSections: {
      default: VAT_REQUIRED_ANSWER_SECTIONS,
      simple: VAT_SIMPLE_ANSWER_SECTIONS,
      refund: VAT_REFUND_ANSWER_SECTIONS,
      factPattern: VAT_FACT_PATTERN_ANSWER_SECTIONS
    },
    doctrinalRules: VAT_DOCTRINAL_RULES,
    sourceGroundingRules: VAT_SOURCE_GROUNDING_RULES,
    distinctionRules: VAT_DISTINCTION_RULES
  };
}

export function getVatSubIssue(code = "") {
  const normalized = normalizeCode(code);
  return VAT_COMPLETE_SUB_ISSUE_REGISTRY[normalized] || null;
}

export function getVatSubIssueConfig(subIssue = "") {
  return getVatSubIssue(subIssue);
}

export function getVatTargetAuthorities(subIssue = "GENERAL") {
  const config = getVatSubIssue(subIssue) || VAT_COMPLETE_SUB_ISSUE_REGISTRY.GENERAL;
  return config.targetAuthorities || [];
}

export function getVatRetrievalStrategy(subIssue = "GENERAL") {
  const config = getVatSubIssue(subIssue) || VAT_COMPLETE_SUB_ISSUE_REGISTRY.GENERAL;
  return config.retrievalStrategy || VAT_DOMAIN.defaultRetrievalStrategy;
}

export function getVatKeywords(subIssue = "") {
  if (subIssue) {
    const config = getVatSubIssue(subIssue);
    return {
      keywords: config?.keywords || [],
      aliases: config?.aliases || []
    };
  }

  return {
    keywords: unique(
      Object.values(VAT_COMPLETE_SUB_ISSUE_REGISTRY).flatMap((item) => item.keywords || [])
    ),
    aliases: unique(
      Object.values(VAT_COMPLETE_SUB_ISSUE_REGISTRY).flatMap((item) => item.aliases || [])
    )
  };
}

export function getVatRetrievalHints(subIssue = "GENERAL", context = {}) {
  const config = getVatSubIssue(subIssue) || VAT_COMPLETE_SUB_ISSUE_REGISTRY.GENERAL;
  const reviewMode = isVatReviewMode(context);

  return {
    ...(config.retrievalHints || {}),
    domainCode: VAT_DOMAIN.code,
    domainName: VAT_DOMAIN.name,
    primarySubIssue: config.subIssue,
    subIssue: config.subIssue,
    retrievalStrategy: config.retrievalStrategy,
    boostTerms: unique([
      VAT_DOMAIN.code,
      VAT_DOMAIN.name,
      ...VAT_DOMAIN.primaryAuthorities,
      ...(config.keywords || []),
      ...(config.aliases || []),
      ...(config.targetAuthorities || []),
      ...(config.controllingAuthorities || []),
      ...(config.supportingAuthorities || []),
      ...(config.supportingJurisprudence || [])
    ]),
    targetAuthorities: config.targetAuthorities,
    controllingAuthorities: config.controllingAuthorities,
    supportingAuthorities: config.supportingAuthorities,
    supportingJurisprudence: config.supportingJurisprudence,
    priorityFolders: config.priorityFolders,
    excludedFolders: reviewMode ? [] : config.excludedFolders,
    sourceGroundingRequired: true,
    compactSourcesOnly: true,
    preserveTargetAuthorityMatches: true,
    preserveIssueClassificationMatches: true,
    preserveControllingAuthorities: true
  };
}

export function listVatSubIssues() {
  return Object.values(VAT_COMPLETE_SUB_ISSUE_REGISTRY).map((item) => ({
    code: item.code,
    subIssue: item.subIssue,
    label: item.label,
    description: item.description,
    targetAuthorities: item.targetAuthorities,
    controllingAuthorities: item.controllingAuthorities,
    supportingAuthorities: item.supportingAuthorities,
    supportingJurisprudence: item.supportingJurisprudence,
    priorityFolders: item.priorityFolders,
    excludedFolders: item.excludedFolders,
    requiredAnswerSections: item.requiredAnswerSections,
    tpmProfile: item.tpmProfile,
    sourceGroundingRequired: item.sourceGroundingRequired,
    enginePath: item.enginePath,
    retrievalStrategy: item.retrievalStrategy,
    legalDimensions: item.legalDimensions,
    expectedSourceTypes: item.expectedSourceTypes,
    flags: item.flags
  }));
}

export function classifyVatSubIssue(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);
  const priorSubIssue = normalizeCode(options.priorSubIssue || "");
  const candidates = [];

  for (const subIssue of Object.values(VAT_COMPLETE_SUB_ISSUE_REGISTRY)) {
    const keywordScore = scoreKeywords(normalizedQuery, [
      subIssue.code,
      subIssue.subIssue,
      subIssue.label,
      subIssue.description,
      ...(subIssue.keywords || []),
      ...(subIssue.aliases || []),
      ...(subIssue.targetAuthorities || []),
      ...(subIssue.controllingAuthorities || []),
      ...(subIssue.supportingAuthorities || []),
      ...(subIssue.supportingJurisprudence || [])
    ]);

    let score = keywordScore.score;

    if (priorSubIssue && priorSubIssue === subIssue.code) score += 8;

    if (subIssue.code === "GENERAL" && score > 0) score = Math.max(1, score - 4);

    if (score > 0) {
      candidates.push({
        code: subIssue.code,
        subIssue: subIssue.subIssue,
        label: subIssue.label,
        description: subIssue.description,
        score,
        matchedTerms: keywordScore.matchedTerms,
        enginePath: subIssue.enginePath,
        retrievalStrategy: subIssue.retrievalStrategy,
        targetAuthorities: subIssue.targetAuthorities,
        controllingAuthorities: subIssue.controllingAuthorities,
        supportingAuthorities: subIssue.supportingAuthorities,
        supportingJurisprudence: subIssue.supportingJurisprudence,
        priorityFolders: subIssue.priorityFolders,
        excludedFolders: subIssue.excludedFolders,
        requiredAnswerSections: subIssue.requiredAnswerSections,
        tpmProfile: subIssue.tpmProfile,
        sourceGroundingRequired: subIssue.sourceGroundingRequired,
        legalDimensions: subIssue.legalDimensions,
        expectedSourceTypes: subIssue.expectedSourceTypes,
        flags: subIssue.flags
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const top = candidates[0] || {
    ...VAT_COMPLETE_SUB_ISSUE_REGISTRY.GENERAL,
    score: 0,
    matchedTerms: []
  };

  const second = candidates[1] || null;

  const distinctionRequired =
    !!second &&
    top.code !== second.code &&
    top.score - second.score <= 2;

  const confidence =
    top.score <= 0
      ? 0.35
      : Number(
          Math.min(
            0.55 + top.score / 30 + Math.max(top.score - (second?.score || 0), 0) / 25,
            0.99
          ).toFixed(2)
        );

  return {
    domain: VAT_DOMAIN.code,
    domainCode: VAT_DOMAIN.code,
    domainName: VAT_DOMAIN.name,

    primarySubIssue: top.code,
    primarySubIssueLabel: top.label,
    subIssue: top.code,
    subIssueDescription: top.description,

    enginePath: top.enginePath,
    retrievalStrategy: top.retrievalStrategy,

    targetAuthorities: top.targetAuthorities,
    controllingAuthorities: top.controllingAuthorities,
    supportingAuthorities: top.supportingAuthorities,
    supportingJurisprudence: top.supportingJurisprudence,

    priorityFolders: top.priorityFolders,
    excludedFolders: top.excludedFolders,
    requiredAnswerSections: top.requiredAnswerSections,
    tpmProfile: top.tpmProfile,
    sourceGroundingRequired: top.sourceGroundingRequired,

    governingStatutes: unique([
      ...VAT_DOMAIN.primaryAuthorities,
      ...(top.controllingAuthorities || [])
    ]),

    legalDimensions: top.legalDimensions || [],
    expectedSourceTypes: top.expectedSourceTypes || [],
    flags: top.flags || {},

    matchedTerms: top.matchedTerms || [],
    confidence,
    fallbackClassificationUsed: top.score <= 0 || top.code === "GENERAL",
    distinctionRequired,
    candidateSubIssues: distinctionRequired
      ? unique([top.code, second.code])
      : [top.code],
    candidates
  };
}

export function matchVatSubIssue(query = "", options = {}) {
  return classifyVatSubIssue(query, options);
}

export function buildVatClassificationObject({
  query = "",
  primaryIssue = "VAT",
  priorSubIssue = "",
  targetAuthorities = [],
  legalDimensions = [],
  reviewMode = false
} = {}) {
  const classified = classifyVatSubIssue(query, { priorSubIssue });
  const subIssueConfig = getVatSubIssue(classified.primarySubIssue) || VAT_COMPLETE_SUB_ISSUE_REGISTRY.GENERAL;

  const authorityTypes = sortAuthorityTypes(
    buildTargetAuthorityProfile({
      primaryDomain: VAT_DOMAIN.code,
      primaryIssue,
      subIssues: [classified.primarySubIssue],
      targetAuthorities: unique([
        ...VAT_DOMAIN.defaultAuthorities,
        ...targetAuthorities
      ])
    })
  );

  const mergedTargetAuthorities = unique([
    ...(classified.targetAuthorities || []),
    ...targetAuthorities
  ]);

  const retrievalHints = getVatRetrievalHints(classified.primarySubIssue, {
    reviewMode,
    query
  });

  return {
    engine: "tax-engines/VAT/domain-config.js",
    version: VAT_DOMAIN_CONFIG_VERSION,
    status:
      classified.confidence >= 0.7
        ? "VAT_SUB_ISSUE_CLASSIFIED"
        : "LOW_CONFIDENCE_VAT_SUB_ISSUE_CLASSIFIED",

    primaryDomain: VAT_DOMAIN.code,
    primaryDomainName: VAT_DOMAIN.name,
    domainCode: VAT_DOMAIN.code,
    domainName: VAT_DOMAIN.name,

    primaryIssue,
    primarySubIssue: classified.primarySubIssue,
    primarySubIssueLabel: classified.primarySubIssueLabel,
    subIssue: classified.primarySubIssue,
    subIssueDescription: classified.subIssueDescription,
    subIssues: [classified.primarySubIssue],

    governingStatutes: classified.governingStatutes,
    primaryStatutes: VAT_DOMAIN.primaryStatutes,
    primaryRegulations: VAT_DOMAIN.primaryRegulations,

    targetAuthorities: mergedTargetAuthorities,
    targetAuthorityTypes: authorityTypes,
    controllingAuthorities: classified.controllingAuthorities,
    supportingAuthorities: classified.supportingAuthorities,
    supportingJurisprudence: classified.supportingJurisprudence,

    priorityFolders: classified.priorityFolders,
    excludedFolders: reviewMode ? [] : classified.excludedFolders,
    requiredAnswerSections: classified.requiredAnswerSections,
    tpmProfile: classified.tpmProfile,
    sourceGroundingRequired: classified.sourceGroundingRequired,

    authorityHierarchy: VAT_AUTHORITY_HIERARCHY,
    legalDimensions: unique([...(classified.legalDimensions || []), ...legalDimensions]),
    expectedSourceTypes: classified.expectedSourceTypes || [],
    flags: classified.flags || {},

    conflictSensitive: subIssueConfig.conflictSensitive,
    doctrineSensitive: subIssueConfig.doctrineSensitive,
    complianceSensitive: subIssueConfig.complianceSensitive,
    computationSensitive: subIssueConfig.computationSensitive,
    refundSensitive: subIssueConfig.refundSensitive,
    auditRiskSensitive: subIssueConfig.auditRiskSensitive,

    doctrinalRules: VAT_DOCTRINAL_RULES,
    conflictRules: {
      conflictRule: VAT_DOCTRINAL_RULES.conflictRule,
      automaticConflictDetection: false
    },

    distinctionRequired: classified.distinctionRequired,
    candidateSubIssues: classified.candidateSubIssues,

    retrievalStrategy: classified.retrievalStrategy,
    retrievalHints: {
      ...retrievalHints,
      targetAuthorities: mergedTargetAuthorities,
      preferredAuthorities: authorityTypes
    },

    engineRouting: {
      useDomainEngine: true,
      domainEnginePath: "./tax-engines/VAT/domain-config.js",
      useIdentityEngine: classified.primarySubIssue !== "GENERAL",
      identityEnginePath: subIssueConfig.enginePath,
      identityEngineCode: classified.primarySubIssue,
      requiresIssueSpecificRetrieval: true,
      requiresAuthorityHierarchy: true,
      requiresSupersessionCheck: true,
      requiresConflictCheck: subIssueConfig.conflictSensitive === true,
      requiresJurisprudence:
        (classified.supportingJurisprudence || []).length > 0,
      requiresEvidenceEvaluation:
        classified.flags?.requiresAuditEvidenceReview === true ||
        classified.flags?.requiresSubstantiationReview === true,
      requiresFactPatternEngine:
        classified.flags?.requiresTransactionCharacterization === true ||
        classified.flags?.requiresEconomicSubstanceAnalysis === true,
      requiresRiskScoring:
        classified.flags?.requiresRiskScoring === true
    },

    confidence: classified.confidence,
    fallbackClassificationUsed: classified.fallbackClassificationUsed,

    classificationSignals: {
      matchedTerms: classified.matchedTerms,
      candidates: classified.candidates
    }
  };
}

export function mergeVatIntoIssueClassification(issueClassification = {}, query = "") {
  const reviewMode = isVatReviewMode(issueClassification);

  const vatClassification = buildVatClassificationObject({
    query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
    primaryIssue: issueClassification.primaryIssue || "VAT",
    priorSubIssue:
      issueClassification.primarySubIssue ||
      issueClassification.subIssue ||
      issueClassification.taxDomainClassification?.primarySubIssue ||
      "",
    targetAuthorities: issueClassification.targetAuthorities || [],
    legalDimensions: issueClassification.legalDimensions || [],
    reviewMode
  });

  return {
    ...issueClassification,

    primaryIssue: issueClassification.primaryIssue || "VAT",
    primaryDomain: "VAT",
    primaryDomainName: VAT_DOMAIN.name,
    domainCode: "VAT",
    domainName: VAT_DOMAIN.name,

    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),
      ...vatClassification
    },

    primarySubIssue: vatClassification.primarySubIssue,
    subIssue: vatClassification.primarySubIssue,
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      vatClassification.primarySubIssue
    ]),

    targetAuthorities: vatClassification.targetAuthorities,
    controllingAuthorities: vatClassification.controllingAuthorities,
    supportingAuthorities: vatClassification.supportingAuthorities,
    supportingJurisprudence: vatClassification.supportingJurisprudence,

    priorityFolders: vatClassification.priorityFolders,
    excludedFolders: vatClassification.excludedFolders,
    requiredAnswerSections: vatClassification.requiredAnswerSections,
    tpmProfile: vatClassification.tpmProfile,
    sourceGroundingRequired: vatClassification.sourceGroundingRequired,

    legalDimensions: vatClassification.legalDimensions,
    expectedSourceTypes: vatClassification.expectedSourceTypes,
    flags: vatClassification.flags,

    distinctionRequired: vatClassification.distinctionRequired,
    candidateSubIssues: vatClassification.candidateSubIssues,

    retrievalStrategy: vatClassification.retrievalStrategy,
    retrievalHints: vatClassification.retrievalHints,

    doctrinalRules: vatClassification.doctrinalRules,
    conflictRules: vatClassification.conflictRules,

    engineRouting: {
      ...(issueClassification.engineRouting || {}),
      ...vatClassification.engineRouting
    },

    vatClassification
  };
}

export function vatDomainHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_DOMAIN_CONFIG",
    version: VAT_DOMAIN_CONFIG_VERSION,
    domain: VAT_DOMAIN.code,
    subIssueCount: Object.keys(VAT_COMPLETE_SUB_ISSUE_REGISTRY).length,

    supportsGeneral: true,
    supportsDefinition: true,
    supportsRefundCredit: true,
    supportsZeroRating: true,
    supportsInputTax: true,
    supportsExemption: true,
    supportsOutputTax: true,
    supportsRegistration: true,
    supportsCompliance: true,
    supportsWithholdingVat: true,
    supportsTransitionalInputTax: true,
    supportsDeemedSale: true,

    hasSeparateIdentityEngines: true,
    identityEngines: VAT_IDENTITY_ENGINES,

    authorityHierarchyAware: true,
    googleDriveFolderPriorityAware: true,
    jurisprudencePriorityAware: true,
    excludesReviewMaterialsUnlessReviewMode: true,
    sourceGroundingRequired: true,
    tpmProfileAware: true,
    doctrinalRulesAware: true,
    conflictRulesAware: true,
    answerStructureAware: true,
    riskFlagsAware: true,

    noOpenAICalls: true,
    noDirectRetrieval: true,
    noFinalAnswerGeneration: true,

    supportsIssueClassificationEngine: true,
    supportsMainTaxEngineClassification: true,
    supportsRetrievalEngine: true,
    supportsRerankerEngine: true,
    supportsContextOrchestrationEngine: true,
    supportsRagAnswerHandler: true,
    supportsAuthorityEngine: true,
    supportsLegalValidationEngine: true,
    supportsAnswerRenderer: true,
    supportsFinalAnswerCompliance: true
  };
}

export default {
  VAT_DOMAIN_CONFIG_VERSION,
  VAT_DOMAIN,
  VAT_SUB_ISSUE,
  VAT_IDENTITY_ENGINES,
  VAT_SUB_ISSUE_REGISTRY: VAT_COMPLETE_SUB_ISSUE_REGISTRY,
  VAT_COMPLETE_SUB_ISSUE_REGISTRY,
  VAT_PRIORITY_FOLDERS,
  VAT_JURISPRUDENCE_PRIORITY_FOLDERS,
  VAT_EXCLUDED_FOLDERS,
  VAT_AUTHORITY_HIERARCHY,
  VAT_REQUIRED_ANSWER_SECTIONS,
  VAT_SIMPLE_ANSWER_SECTIONS,
  VAT_REFUND_ANSWER_SECTIONS,
  VAT_FACT_PATTERN_ANSWER_SECTIONS,
  VAT_DOCTRINAL_RULES,
  VAT_SOURCE_GROUNDING_RULES,
  VAT_DISTINCTION_RULES,

  isVatReviewMode,
  normalizeVatSubIssue,
  getVatDomainConfig,
  getVatSubIssue,
  getVatSubIssueConfig,
  getVatTargetAuthorities,
  getVatRetrievalStrategy,
  getVatRetrievalHints,
  getVatKeywords,
  listVatSubIssues,
  classifyVatSubIssue,
  matchVatSubIssue,
  buildVatClassificationObject,
  mergeVatIntoIssueClassification,
  vatDomainHealthCheck
};
