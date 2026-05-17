// FILE: tax-engines/VAT/engines/registration-tax-engine.js
"use strict";

/**
 * TINA VAT Registration Tax Engine
 * Version: 2.0.0
 *
 * VAT → REGISTRATION
 *
 * Scope:
 * - mandatory VAT registration
 * - optional VAT registration
 * - VAT threshold analysis
 * - non-VAT taxpayer distinction
 * - cancellation/update of VAT registration
 * - BIR registration compliance
 * - COR/invoicing implications
 * - registration audit-risk analysis
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

export const VAT_REGISTRATION_TAX_ENGINE_VERSION = "2.0.0";

export const VAT_REGISTRATION_TAX_PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS",
  "06_COURT_CASES"
]);

export const VAT_REGISTRATION_TAX_EXCLUDED_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

export const VAT_REGISTRATION_TAX_AUTHORITY_HIERARCHY = Object.freeze([
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

export const VAT_REGISTRATION_TAX_SUB_ISSUE = Object.freeze({
  code: "REGISTRATION",
  subIssue: "REGISTRATION",

  domain: "VAT",
  domainCode: "VAT",
  domainName: "Value-Added Tax",

  title:
    "Registration — VAT Threshold; Mandatory/Optional Registration; Cancellation/Update",

  description:
    "Reusable VAT REGISTRATION sub-issue engine for mandatory VAT registration, optional VAT registration, threshold analysis, non-VAT taxpayer distinction, cancellation/update of VAT registration, BIR registration compliance, COR/invoicing implications, and registration audit-risk routing.",

  primaryIssue: "VAT",
  legacyPrimaryIssue: "VAT_REGISTRATION",
  primarySubIssue: "REGISTRATION",

  retrievalStrategy:
    "VAT_REGISTRATION_COMPLIANCE_FIRST",

  targetAuthorities: [
    "NIRC Sec. 236",
    "NIRC Sec. 109(BB)",
    "RR 16-2005 Secs. 4.100–4.103",
    "RMC 75-2015",
    "Related BIR registration issuances if retrieved"
  ],

  controllingAuthorities: [
    "NIRC Sec. 236",
    "NIRC Sec. 109(BB), where VAT threshold or non-VAT taxpayer issue is implicated",
    "RR 16-2005 Secs. 4.100–4.103",
    "Applicable NIRC registration and invoicing provisions where relevant"
  ],

  supportingAuthorities: [
    "RMC 75-2015, where applicable",
    "Applicable RMCs/RRs on VAT registration, cancellation, and BIR registration updates",
    "BIR registration/COR/invoicing issuances if retrieved"
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
    "NIRC Sec. 236",
    "NIRC Sec. 109(BB), if threshold or non-VAT taxpayer issue is involved",
    "RR 16-2005 Secs. 4.100–4.103",
    "RMC 75-2015 and related BIR issuances",
    "Relevant registration/cancellation/invoicing issuances",
    "Issue-relevant jurisprudence only if directly applicable"
  ],

  priorityFolders:
    VAT_REGISTRATION_TAX_PRIORITY_FOLDERS,

  excludedFolders:
    VAT_REGISTRATION_TAX_EXCLUDED_FOLDERS,

  authorityHierarchy:
    VAT_REGISTRATION_TAX_AUTHORITY_HIERARCHY,

  legalDimensions: [
    "COMPLIANCE",
    "PROCEDURAL",
    "SUBSTANTIVE",
    "EVIDENTIARY",
    "AUDIT"
  ],

  legalConcepts: [
    "VAT registration",
    "mandatory VAT registration",
    "optional VAT registration",
    "VAT threshold",
    "gross sales threshold",
    "gross receipts threshold",
    "non-VAT taxpayer distinction",
    "non-VAT to VAT transition",
    "VAT cancellation",
    "registration update",
    "change of tax type",
    "BIR Certificate of Registration",
    "COR implications",
    "invoice authority",
    "invoicing implications",
    "BIR registration compliance",
    "VAT return consequence",
    "registration audit risk",
    "penalty risk"
  ],

  tpmProfile: "STANDARD",

  sourceGroundingRequired: true,

  complianceSensitive: true,
  registrationSensitive: true,
  thresholdSensitive: true,
  cancellationSensitive: true,
  invoiceSensitive: true,
  auditRiskSensitive: true,
  penaltySensitive: true,
  doctrinallySensitive: true,
  conflictSensitive: false,
  litigationSensitive: false,

  registrationType:
    "VAT_REGISTRATION_COMPLIANCE_ANALYSIS",

  registrationRiskCategory:
    "THRESHOLD_STATUS_CANCELLATION_AND_COMPLIANCE_RISK",

  relatedButDifferentIssues: [
    "DEFINITION",
    "REFUND_CREDIT",
    "ZERO_RATING",
    "INPUT_TAX",
    "EXEMPTION",
    "OUTPUT_TAX",
    "COMPLIANCE",
    "WITHHOLDING_VAT",
    "TRANSITIONAL_INPUT_TAX",
    "DEEMED_SALE"
  ]
});

export const VAT_REGISTRATION_TAX_KEYWORDS = Object.freeze([
  "vat registration",
  "register as vat",
  "register as a vat taxpayer",
  "vat registered",
  "vat taxpayer",
  "non-vat",
  "non vat",
  "non-vat taxpayer",
  "vat threshold",
  "threshold",
  "registration threshold",
  "gross sales threshold",
  "gross receipts threshold",
  "mandatory vat registration",
  "required to register as vat",
  "optional registration",
  "optional vat registration",
  "voluntary vat registration",
  "vat cancellation",
  "cancel vat registration",
  "cancellation of vat registration",
  "update registration",
  "bir registration",
  "certificate of registration",
  "cor",
  "bir cor",
  "change tax type",
  "change of tax type",
  "non-vat to vat",
  "non vat to vat",
  "vat to non-vat",
  "vat to non vat",
  "nirc 109(bb)",
  "section 109(bb)",
  "sec. 109(bb)",
  "nirc 236",
  "section 236",
  "sec. 236",
  "rr 16-2005 sec. 4.100",
  "rr 16-2005 sec. 4.101",
  "rr 16-2005 sec. 4.102",
  "rr 16-2005 sec. 4.103",
  "4.100",
  "4.101",
  "4.102",
  "4.103",
  "rmc 75-2015",
  "invoice authority",
  "authority to print",
  "atp",
  "sales invoice registration",
  "bir form 1905",
  "registration update"
]);

export const VAT_REGISTRATION_TAX_ALIASES = Object.freeze([
  "VAT_REGISTRATION",
  "REGISTRATION",
  "VAT_THRESHOLD",
  "MANDATORY_VAT_REGISTRATION",
  "OPTIONAL_VAT_REGISTRATION",
  "VOLUNTARY_VAT_REGISTRATION",
  "VAT_CANCELLATION",
  "CANCELLATION_OF_VAT_REGISTRATION",
  "NON_VAT_TO_VAT",
  "VAT_TO_NON_VAT",
  "BIR_REGISTRATION",
  "CERTIFICATE_OF_REGISTRATION",
  "COR",
  "CHANGE_TAX_TYPE",
  "REGISTRATION_UPDATE"
]);

const THRESHOLD_KEYWORDS = Object.freeze([
  "threshold",
  "vat threshold",
  "registration threshold",
  "gross sales threshold",
  "gross receipts threshold",
  "exceeded threshold",
  "expected to exceed",
  "annual gross sales",
  "annual gross receipts",
  "3 million",
  "three million"
]);

const OPTIONAL_REGISTRATION_KEYWORDS = Object.freeze([
  "optional registration",
  "optional vat registration",
  "voluntary vat registration",
  "elect to register",
  "elected to register",
  "vat election",
  "voluntary registration"
]);

const CANCELLATION_KEYWORDS = Object.freeze([
  "cancellation",
  "cancel vat registration",
  "cancellation of vat registration",
  "cancel registration",
  "vat to non-vat",
  "vat to non vat",
  "closure",
  "change of status",
  "erroneous registration",
  "registration cancellation"
]);

const BIR_REGISTRATION_KEYWORDS = Object.freeze([
  "bir registration",
  "certificate of registration",
  "cor",
  "bir cor",
  "registration update",
  "change tax type",
  "bir form 1905",
  "form 1905",
  "books of accounts",
  "invoice authority",
  "authority to print",
  "atp",
  "sales invoice",
  "invoicing"
]);

const EXEMPTION_OVERLAP_KEYWORDS = Object.freeze([
  "vat exempt",
  "vat-exempt",
  "exempt sales",
  "exempt transaction",
  "section 109",
  "sec. 109",
  "nirc 109",
  "exemption",
  "outside vat"
]);

const OUTPUT_TAX_OVERLAP_KEYWORDS = Object.freeze([
  "output vat",
  "output tax",
  "vatable sales",
  "12% vat",
  "vat computation",
  "gross receipts",
  "gross selling price"
]);

const COMPLIANCE_OVERLAP_KEYWORDS = Object.freeze([
  "2550q",
  "2550m",
  "vat return",
  "filing",
  "deadline",
  "due date",
  "slsp",
  "summary list",
  "compliance"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "vat refund",
  "input vat refund",
  "section 112",
  "120-day",
  "30-day",
  "zero-rated",
  "zero rated",
  "input tax credit",
  "creditable input tax",
  "withholding vat",
  "5% final withholding vat",
  "transitional input tax",
  "deemed sale only"
]);

export const VAT_REGISTRATION_TAX_ANSWER_STRUCTURE = Object.freeze({
  SIMPLE_REGISTRATION_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. REGISTRATION RULE",
    "D. PRACTICAL NOTE"
  ],

  LEGAL_ANALYSIS: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    "D. APPLICATION TO TAXPAYER STATUS",
    "E. COMPLIANCE / REGISTRATION RISK",
    "F. PRACTICAL NOTE / REQUIRED ACTION"
  ],

  THRESHOLD_OR_CANCELLATION_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. THRESHOLD OR CANCELLATION TEST",
    "D. DOCUMENTARY / BIR REGISTRATION REQUIREMENTS",
    "E. AUDIT OR PENALTY RISK",
    "F. PRACTICAL POSITION"
  ]
});

export const VAT_REGISTRATION_TAX_DOCTRINAL_METADATA = Object.freeze({
  doctrines: [
    {
      code: "REGISTRATION_NOT_SAME_AS_VATABILITY",
      label: "VAT registration is not the same as VATability of every transaction",
      description:
        "VAT registration affects taxpayer status and compliance obligations, but the VATability of each transaction must still be analyzed under the applicable VAT provisions."
    },
    {
      code: "THRESHOLD_REQUIRES_GROSS_SALES_OR_RECEIPTS_FACTS",
      label: "Threshold analysis requires gross sales or receipts facts",
      description:
        "VAT threshold analysis must be based on gross sales or gross receipts, taxpayer activity, and the applicable statutory and regulatory rule."
    },
    {
      code: "NON_VAT_IS_NOT_AUTOMATIC_EXEMPTION",
      label: "Non-VAT status is not automatic VAT exemption",
      description:
        "Non-VAT taxpayer status should not be confused with a transaction-based VAT exemption or zero-rating analysis."
    },
    {
      code: "CANCELLATION_REQUIRES_BIR_COMPLIANCE",
      label: "Cancellation requires BIR compliance",
      description:
        "Cancellation or update of VAT registration requires compliance with applicable BIR rules and supporting documentation."
    },
    {
      code: "REGISTRATION_AFFECTS_INVOICING_AND_REPORTING",
      label: "Registration affects invoicing and VAT reporting",
      description:
        "VAT registration status affects invoicing, COR, tax type, and VAT return/reporting obligations."
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
  nonVatIsNotAutomaticExemption: true,
  registrationStatusIsNotDeterminativeOfAllTransactionTaxability: true,
  thresholdRequiresFacts: true,
  cancellationRequiresBIRValidation: true
});

export const VAT_REGISTRATION_TAX_FACT_PATTERN_METADATA = Object.freeze({
  supportsFactPatternRouting: true,
  doesNotPerformFullFactPatternAnalysis: true,

  usableFor: [
    "taxpayer status review",
    "gross sales/gross receipts threshold analysis",
    "VATable vs exempt sales classification",
    "non-VAT vs VAT transition analysis",
    "registration cancellation review",
    "invoice compliance review",
    "BIR registration document review",
    "compliance penalty review",
    "audit-risk analysis",
    "VAT return filing requirement analysis"
  ],

  requiredFactInputs: [
    "taxpayer business activity",
    "annual gross sales",
    "annual gross receipts",
    "breakdown of VATable, exempt, zero-rated, and other sales",
    "current BIR Certificate of Registration tax types",
    "BIR registration date",
    "whether registration is mandatory or optional",
    "whether cancellation or update is being requested",
    "BIR Form 1905 or registration update documents, if applicable",
    "invoice authority / ATP / sales invoice status",
    "VAT return filing history",
    "taxpayer books and registration records"
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

export function getVatRegistrationConfig() {
  return {
    engine: "tax-engines/VAT/engines/registration-tax-engine.js",
    version: VAT_REGISTRATION_TAX_ENGINE_VERSION,
    ...VAT_REGISTRATION_TAX_SUB_ISSUE,
    keywords: VAT_REGISTRATION_TAX_KEYWORDS,
    aliases: VAT_REGISTRATION_TAX_ALIASES,
    answerStructure: VAT_REGISTRATION_TAX_ANSWER_STRUCTURE,
    doctrinalMetadata: VAT_REGISTRATION_TAX_DOCTRINAL_METADATA,
    factPatternMetadata: VAT_REGISTRATION_TAX_FACT_PATTERN_METADATA,
    retrievalHints: buildVatRegistrationRetrievalHints()
  };
}

export function getVatRegistrationAuthorities() {
  return {
    targetAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_REGISTRATION_TAX_SUB_ISSUE.supportingJurisprudence,
    preferredAuthorityTypes: VAT_REGISTRATION_TAX_SUB_ISSUE.preferredAuthorityTypes,
    authorityHierarchy: VAT_REGISTRATION_TAX_AUTHORITY_HIERARCHY,
    priorityFolders: VAT_REGISTRATION_TAX_PRIORITY_FOLDERS,
    excludedFolders: VAT_REGISTRATION_TAX_EXCLUDED_FOLDERS
  };
}

export function getVatRegistrationKeywords() {
  return {
    keywords: VAT_REGISTRATION_TAX_KEYWORDS,
    aliases: VAT_REGISTRATION_TAX_ALIASES,
    thresholdKeywords: THRESHOLD_KEYWORDS,
    optionalRegistrationKeywords: OPTIONAL_REGISTRATION_KEYWORDS,
    cancellationKeywords: CANCELLATION_KEYWORDS,
    birRegistrationKeywords: BIR_REGISTRATION_KEYWORDS,
    exemptionOverlapKeywords: EXEMPTION_OVERLAP_KEYWORDS,
    outputTaxOverlapKeywords: OUTPUT_TAX_OVERLAP_KEYWORDS,
    complianceOverlapKeywords: COMPLIANCE_OVERLAP_KEYWORDS,
    diversionKeywords: NEGATIVE_OR_DIVERSION_KEYWORDS
  };
}

export function normalizeVatRegistrationConcept(value = "") {
  const normalized = normalizeCode(value);

  const aliases = {
    VAT_REGISTRATION: "REGISTRATION",
    REGISTRATION: "REGISTRATION",
    VAT_REGISTERED: "REGISTRATION_STATUS",
    REGISTER_AS_VAT: "MANDATORY_OR_OPTIONAL_REGISTRATION",
    VAT_THRESHOLD: "THRESHOLD_ANALYSIS",
    REGISTRATION_THRESHOLD: "THRESHOLD_ANALYSIS",
    GROSS_SALES_THRESHOLD: "THRESHOLD_ANALYSIS",
    GROSS_RECEIPTS_THRESHOLD: "THRESHOLD_ANALYSIS",
    MANDATORY_VAT_REGISTRATION: "MANDATORY_REGISTRATION",
    OPTIONAL_VAT_REGISTRATION: "OPTIONAL_REGISTRATION",
    VOLUNTARY_VAT_REGISTRATION: "OPTIONAL_REGISTRATION",
    VAT_CANCELLATION: "CANCELLATION",
    CANCELLATION_OF_VAT_REGISTRATION: "CANCELLATION",
    NON_VAT_TO_VAT: "NON_VAT_TO_VAT_TRANSITION",
    VAT_TO_NON_VAT: "VAT_TO_NON_VAT_TRANSITION",
    BIR_REGISTRATION: "BIR_REGISTRATION_COMPLIANCE",
    CERTIFICATE_OF_REGISTRATION: "COR_REVIEW",
    COR: "COR_REVIEW",
    CHANGE_TAX_TYPE: "REGISTRATION_UPDATE",
    REGISTRATION_UPDATE: "REGISTRATION_UPDATE",
    BIR_FORM_1905: "REGISTRATION_UPDATE",
    INVOICE_AUTHORITY: "INVOICE_COMPLIANCE",
    AUTHORITY_TO_PRINT: "INVOICE_COMPLIANCE",
    ATP: "INVOICE_COMPLIANCE"
  };

  return aliases[normalized] || normalized || "REGISTRATION";
}

export function classifyVatRegistrationType(query = "") {
  const normalizedQuery = normalizeText(query);

  const thresholdScore = scoreKeywordSet(normalizedQuery, THRESHOLD_KEYWORDS);
  const optionalScore = scoreKeywordSet(normalizedQuery, OPTIONAL_REGISTRATION_KEYWORDS);
  const cancellationScore = scoreKeywordSet(normalizedQuery, CANCELLATION_KEYWORDS);
  const birRegistrationScore = scoreKeywordSet(normalizedQuery, BIR_REGISTRATION_KEYWORDS);
  const exemptionScore = scoreKeywordSet(normalizedQuery, EXEMPTION_OVERLAP_KEYWORDS);
  const outputTaxScore = scoreKeywordSet(normalizedQuery, OUTPUT_TAX_OVERLAP_KEYWORDS);
  const complianceScore = scoreKeywordSet(normalizedQuery, COMPLIANCE_OVERLAP_KEYWORDS);

  const requiresThresholdAnalysis =
    thresholdScore.score > 0 ||
    /threshold|gross sales|gross receipts|exceeded|annual sales|annual receipts/i.test(normalizedQuery);

  const requiresGrossSalesReview =
    /gross sales|sales threshold|annual sales/i.test(normalizedQuery);

  const requiresGrossReceiptsReview =
    /gross receipts|receipts threshold|annual receipts/i.test(normalizedQuery);

  const requiresTaxpayerActivityClassification =
    /business activity|taxpayer activity|nature of business|vatable|exempt|mixed/i.test(normalizedQuery) ||
    exemptionScore.score > 0 ||
    outputTaxScore.score > 0;

  const requiresOptionalRegistrationCheck =
    optionalScore.score > 0 ||
    /optional|voluntary|elect to register|elected/i.test(normalizedQuery);

  const requiresMandatoryRegistrationCheck =
    /mandatory|required to register|must register|exceeded threshold|register as vat/i.test(normalizedQuery) ||
    requiresThresholdAnalysis;

  const requiresCancellationCheck =
    cancellationScore.score > 0 ||
    /cancel|cancellation|vat to non-vat|closure|change of status/i.test(normalizedQuery);

  const requiresBirRegistrationReview =
    birRegistrationScore.score > 0 ||
    /bir registration|cor|certificate of registration|form 1905|registration update/i.test(normalizedQuery);

  const requiresCertificateOfRegistrationReview =
    /certificate of registration|bir cor|\bcor\b/i.test(normalizedQuery);

  const requiresInvoiceComplianceReview =
    /invoice|sales invoice|authority to print|atp|invoicing/i.test(normalizedQuery);

  const requiresPenaltyRiskReview =
    /penalty|penalties|late registration|unregistered|wrong registration|audit risk/i.test(normalizedQuery);

  const requiresComplianceFilingReview =
    complianceScore.score > 0 ||
    /vat return|2550q|filing|deadline|slsp|summary list/i.test(normalizedQuery);

  const registrationType =
    requiresCancellationCheck
      ? "CANCELLATION_OR_UPDATE"
      : requiresOptionalRegistrationCheck
        ? "OPTIONAL_VAT_REGISTRATION"
        : requiresMandatoryRegistrationCheck
          ? "MANDATORY_VAT_REGISTRATION"
          : requiresBirRegistrationReview
            ? "BIR_REGISTRATION_UPDATE"
            : "VAT_REGISTRATION_STATUS_ANALYSIS";

  const registrationRiskCategory =
    requiresPenaltyRiskReview
      ? "PENALTY_AND_AUDIT_RISK"
      : requiresCancellationCheck
        ? "CANCELLATION_OR_UPDATE_RISK"
        : requiresThresholdAnalysis
          ? "THRESHOLD_CLASSIFICATION_RISK"
          : requiresInvoiceComplianceReview
            ? "COR_AND_INVOICE_COMPLIANCE_RISK"
            : "STANDARD_REGISTRATION_RISK";

  return {
    registrationType,
    registrationRiskCategory,

    requiresThresholdAnalysis,
    requiresGrossSalesReview,
    requiresGrossReceiptsReview,
    requiresTaxpayerActivityClassification,
    requiresOptionalRegistrationCheck,
    requiresMandatoryRegistrationCheck,
    requiresCancellationCheck,
    requiresBirRegistrationReview,
    requiresCertificateOfRegistrationReview,
    requiresInvoiceComplianceReview,
    requiresPenaltyRiskReview,
    requiresComplianceFilingReview,
    requiresAuditRiskReview:
      requiresPenaltyRiskReview ||
      requiresThresholdAnalysis ||
      requiresCancellationCheck ||
      requiresInvoiceComplianceReview,
    requiresDocumentarySupportReview:
      requiresBirRegistrationReview ||
      requiresCancellationCheck ||
      requiresCertificateOfRegistrationReview,
    requiresEffectiveDateCheck:
      /effective date|date of registration|when effective|start of vat/i.test(normalizedQuery),
    requiresVATReturnConsequenceCheck:
      requiresComplianceFilingReview ||
      /vat return|2550q|2550m|filing/i.test(normalizedQuery),

    distinctionRequired:
      exemptionScore.score > 0 ||
      outputTaxScore.score > 0 ||
      complianceScore.score > 0,

    candidateSubIssues: unique([
      "REGISTRATION",
      exemptionScore.score > 0 ? "EXEMPTION" : null,
      outputTaxScore.score > 0 ? "OUTPUT_TAX" : null,
      complianceScore.score > 0 ? "COMPLIANCE" : null
    ]),

    matchedTerms: unique([
      ...thresholdScore.matchedTerms,
      ...optionalScore.matchedTerms,
      ...cancellationScore.matchedTerms,
      ...birRegistrationScore.matchedTerms,
      ...exemptionScore.matchedTerms,
      ...outputTaxScore.matchedTerms,
      ...complianceScore.matchedTerms
    ])
  };
}

export function buildVatRegistrationRetrievalHints({
  reviewMode = false,
  extraAuthorities = [],
  includeThresholdAuthorities = false
} = {}) {
  return {
    domainCode: "VAT",
    domainName: "Value-Added Tax",
    subIssue: "REGISTRATION",
    retrievalStrategy: VAT_REGISTRATION_TAX_SUB_ISSUE.retrievalStrategy,

    targetAuthorities: unique([
      ...VAT_REGISTRATION_TAX_SUB_ISSUE.targetAuthorities,
      ...(includeThresholdAuthorities ? ["NIRC Sec. 109(BB)"] : []),
      ...extraAuthorities
    ]),

    controllingAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_REGISTRATION_TAX_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_REGISTRATION_TAX_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_REGISTRATION_TAX_EXCLUDED_FOLDERS,

    preserveControllingAuthorities: true,
    preserveTargetAuthorityMatches: true,
    preserveIssueClassificationMatches: true,
    preserveRegistrationSources: true,
    preserveThresholdSources: true,
    preserveBIRRegistrationSources: true,

    sourceGroundingRequired: true,
    compactSourcesOnly: true
  };
}

export function matchVatRegistrationQuery(query = "", options = {}) {
  return classifyVatRegistrationTaxQuery(query, options);
}

export function classifyVatRegistrationTaxQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, [
    ...VAT_REGISTRATION_TAX_KEYWORDS,
    ...VAT_REGISTRATION_TAX_ALIASES
  ]);

  const threshold = scoreKeywordSet(normalizedQuery, THRESHOLD_KEYWORDS);
  const optionalRegistration = scoreKeywordSet(normalizedQuery, OPTIONAL_REGISTRATION_KEYWORDS);
  const cancellation = scoreKeywordSet(normalizedQuery, CANCELLATION_KEYWORDS);
  const birRegistration = scoreKeywordSet(normalizedQuery, BIR_REGISTRATION_KEYWORDS);
  const exemptionOverlap = scoreKeywordSet(normalizedQuery, EXEMPTION_OVERLAP_KEYWORDS);
  const outputTaxOverlap = scoreKeywordSet(normalizedQuery, OUTPUT_TAX_OVERLAP_KEYWORDS);
  const complianceOverlap = scoreKeywordSet(normalizedQuery, COMPLIANCE_OVERLAP_KEYWORDS);
  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score =
    positive.score +
    threshold.score * 0.65 +
    optionalRegistration.score * 0.55 +
    cancellation.score * 0.65 +
    birRegistration.score * 0.45 +
    complianceOverlap.score * 0.25 -
    exemptionOverlap.score * 0.1 -
    outputTaxOverlap.score * 0.1 -
    negative.score;

  const priorSubIssue = normalizeCode(options.priorSubIssue || "");
  const primaryDomain = normalizeCode(options.primaryDomain || options.domainCode || "");
  const primaryIssue = normalizeCode(options.primaryIssue || "");

  if (priorSubIssue === "REGISTRATION") score += 6;
  if (primaryDomain === "VAT") score += 3;
  if (primaryIssue === "VAT" || primaryIssue === "VAT_REGISTRATION" || primaryIssue === "REGISTRATION") score += 2;

  const registrationType = classifyVatRegistrationType(query);

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 24, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/registration-tax-engine.js",
    version: VAT_REGISTRATION_TAX_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "VAT_REGISTRATION",
    primarySubIssue: "REGISTRATION",
    subIssue: "REGISTRATION",

    matched: score > 0,
    score,
    confidence,

    matchedTerms: unique([
      ...positive.matchedTerms,
      ...threshold.matchedTerms,
      ...optionalRegistration.matchedTerms,
      ...cancellation.matchedTerms,
      ...birRegistration.matchedTerms,
      ...exemptionOverlap.matchedTerms,
      ...outputTaxOverlap.matchedTerms,
      ...complianceOverlap.matchedTerms,
      ...registrationType.matchedTerms
    ]),

    diversionTerms: negative.matchedTerms,

    shouldUseThisEngine: score > 0 && confidence >= 0.45,
    fallbackClassificationUsed: score <= 0,

    distinctionRequired: registrationType.distinctionRequired,
    candidateSubIssues: registrationType.candidateSubIssues,

    ...registrationType,

    retrievalStrategy: VAT_REGISTRATION_TAX_SUB_ISSUE.retrievalStrategy,
    targetAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_REGISTRATION_TAX_SUB_ISSUE.supportingJurisprudence,
    sourceGroundingRequired: true
  };
}

export function buildVatRegistrationTaxRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 10,
  reviewMode = false
} = {}) {
  const classification = classifyVatRegistrationTaxQuery(query, {
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
      subIssues: ["REGISTRATION"],
      targetAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 236 VAT registration cancellation update",
    "NIRC Section 109(BB) VAT threshold non-VAT taxpayer",
    "RR 16-2005 Sections 4.100 4.101 4.102 4.103 VAT registration",
    "RMC 75-2015 VAT registration threshold optional registration cancellation",
    "VAT registration threshold mandatory optional cancellation",
    "VAT registration Certificate of Registration COR invoice authority",
    "VAT non-VAT taxpayer threshold gross sales gross receipts",
    "VAT registration update BIR Form 1905 change tax type",
    ...classification.matchedTerms.map((term) => `VAT registration ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  return {
    engine: "tax-engines/VAT/engines/registration-tax-engine.js",
    version: VAT_REGISTRATION_TAX_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "VAT_REGISTRATION",
    primarySubIssue: "REGISTRATION",
    subIssue: "REGISTRATION",

    retrievalStrategy: VAT_REGISTRATION_TAX_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_REGISTRATION_TAX_SUB_ISSUE.legalDimensions,

    targetAuthorities: unique([
      ...VAT_REGISTRATION_TAX_SUB_ISSUE.targetAuthorities,
      ...(classification.requiresThresholdAnalysis
        ? ["NIRC Sec. 109(BB)"]
        : [])
    ]),

    controllingAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_REGISTRATION_TAX_SUB_ISSUE.supportingJurisprudence,

    targetAuthorityTypes,
    namedTargetAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.targetAuthorities,

    governingStatutes: [
      "NIRC Sec. 236",
      ...(classification.requiresThresholdAnalysis ? ["NIRC Sec. 109(BB)"] : []),
      "RR 16-2005 Secs. 4.100–4.103",
      "RMC 75-2015"
    ],

    preferredCases: VAT_REGISTRATION_TAX_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_REGISTRATION_TAX_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_REGISTRATION_TAX_EXCLUDED_FOLDERS,

    searchQueries,

    boostTerms: unique([
      "VAT Registration",
      "VAT Threshold",
      "Mandatory VAT Registration",
      "Optional VAT Registration",
      "Cancellation of VAT Registration",
      "Non-VAT Taxpayer",
      "Certificate of Registration",
      "COR",
      "BIR Registration",
      "Change Tax Type",
      "NIRC Sec. 236",
      "NIRC Sec. 109(BB)",
      "RR 16-2005 Sec. 4.100",
      "RR 16-2005 Sec. 4.101",
      "RR 16-2005 Sec. 4.102",
      "RR 16-2005 Sec. 4.103",
      "RMC 75-2015",
      ...VAT_REGISTRATION_TAX_SUB_ISSUE.legalConcepts,
      ...classification.matchedTerms
    ]),

    suppressIssues: [
      "DEFINITION",
      "REFUND_CREDIT",
      "ZERO_RATING",
      "INPUT_TAX",
      !classification.candidateSubIssues.includes("EXEMPTION") ? "EXEMPTION" : null,
      !classification.candidateSubIssues.includes("OUTPUT_TAX") ? "OUTPUT_TAX" : null,
      !classification.candidateSubIssues.includes("COMPLIANCE") ? "COMPLIANCE" : null,
      "WITHHOLDING_VAT",
      "TRANSITIONAL_INPUT_TAX",
      "DEEMED_SALE"
    ].filter(Boolean),

    distinctionRequired: classification.distinctionRequired,
    candidateSubIssues: classification.candidateSubIssues,

    sourceGroundingRequired: true,
    tpmProfile: VAT_REGISTRATION_TAX_SUB_ISSUE.tpmProfile,
    compactSourcesOnly: true,

    classification
  };
}

export function buildVatRegistrationTaxAnswerRules(mode = "LEGAL_ANALYSIS") {
  const normalizedMode = normalizeCode(mode);

  const structure =
    normalizedMode === "SIMPLE_REGISTRATION_QUERY" ||
    normalizedMode === "FAST_DEFINITION" ||
    normalizedMode === "QUICK"
      ? VAT_REGISTRATION_TAX_ANSWER_STRUCTURE.SIMPLE_REGISTRATION_QUERY
      : normalizedMode === "THRESHOLD_OR_CANCELLATION_QUERY" ||
          normalizedMode === "THRESHOLD" ||
          normalizedMode === "CANCELLATION"
        ? VAT_REGISTRATION_TAX_ANSWER_STRUCTURE.THRESHOLD_OR_CANCELLATION_QUERY
        : VAT_REGISTRATION_TAX_ANSWER_STRUCTURE.LEGAL_ANALYSIS;

  return {
    engine: "tax-engines/VAT/engines/registration-tax-engine.js",
    version: VAT_REGISTRATION_TAX_ENGINE_VERSION,

    requiredStructure: structure,
    answerStructure: VAT_REGISTRATION_TAX_ANSWER_STRUCTURE,

    directAnswerRule:
      "Determine VAT registration status only from retrieved indexed authorities and supplied facts. Do not hallucinate thresholds, cancellation rules, or effective dates.",

    controllingLegalBasisRule:
      "Prioritize NIRC Sec. 236, NIRC Sec. 109(BB) where threshold or non-VAT taxpayer status is implicated, RR 16-2005 Secs. 4.100–4.103, and applicable BIR registration issuances.",

    thresholdRule:
      "If threshold is involved, require gross sales or gross receipts facts, taxpayer activity, applicable period, and sales classification. Do not conclude threshold crossing without facts and indexed authority.",

    optionalRegistrationRule:
      "If optional VAT registration is involved, distinguish mandatory from voluntary registration and state compliance consequences only if supported by retrieved authority.",

    cancellationRule:
      "If cancellation/update is involved, require BIR registration status, COR, reason for cancellation/change, effective date, and supporting BIR registration documents.",

    nonVatRule:
      "Non-VAT taxpayer status is not automatically the same as VAT exemption. Route transaction-based exemption or VATability questions to EXEMPTION or OUTPUT_TAX where applicable.",

    invoiceRule:
      "If COR or invoicing is involved, flag invoice authority, sales invoice, ATP or applicable invoicing support, and BIR registration update requirements where supported by retrieved authority.",

    auditRiskRule:
      "Flag wrong tax type, late registration, unsupported threshold computation, invalid cancellation, COR mismatch, invoice authority issues, and VAT return filing consequences where relevant.",

    conflictRule:
      VAT_REGISTRATION_TAX_DOCTRINAL_METADATA.conflictRule,

    exclusionRule:
      "Do not treat refund, input tax creditability, zero-rating, exemption, output VAT computation, withholding VAT, or transitional input tax as the controlling issue unless the user specifically asks those issues.",

    insufficientSourceRule:
      'If indexed controlling authorities are not available, say: "Indexed source not found."',

    noFinalAnswerGeneration: true
  };
}

export function enhanceIssueClassificationWithVatRegistrationTax(issueClassification = {}, query = "") {
  const reviewMode =
    issueClassification.reviewMode === true ||
    issueClassification.requiresReviewMode === true ||
    issueClassification.queryIntent?.requiresReviewMode === true ||
    issueClassification.intentFlags?.requiresReviewMode === true;

  const retrievalPlan = buildVatRegistrationTaxRetrievalPlan({
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
    legacyPrimaryIssue: "VAT_REGISTRATION",
    primarySubIssue: "REGISTRATION",
    subIssue: "REGISTRATION",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "VAT",
      "VAT_REGISTRATION",
      "REGISTRATION"
    ]),

    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "COMPLIANCE",
      "PROCEDURAL",
      "SUBSTANTIVE",
      "EVIDENTIARY",
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

    registrationFlags: {
      requiresThresholdAnalysis: retrievalPlan.classification.requiresThresholdAnalysis,
      requiresGrossSalesReview: retrievalPlan.classification.requiresGrossSalesReview,
      requiresGrossReceiptsReview: retrievalPlan.classification.requiresGrossReceiptsReview,
      requiresTaxpayerActivityClassification: retrievalPlan.classification.requiresTaxpayerActivityClassification,
      requiresOptionalRegistrationCheck: retrievalPlan.classification.requiresOptionalRegistrationCheck,
      requiresMandatoryRegistrationCheck: retrievalPlan.classification.requiresMandatoryRegistrationCheck,
      requiresCancellationCheck: retrievalPlan.classification.requiresCancellationCheck,
      requiresBirRegistrationReview: retrievalPlan.classification.requiresBirRegistrationReview,
      requiresCertificateOfRegistrationReview: retrievalPlan.classification.requiresCertificateOfRegistrationReview,
      requiresInvoiceComplianceReview: retrievalPlan.classification.requiresInvoiceComplianceReview,
      requiresPenaltyRiskReview: retrievalPlan.classification.requiresPenaltyRiskReview,
      requiresComplianceFilingReview: retrievalPlan.classification.requiresComplianceFilingReview,
      requiresAuditRiskReview: retrievalPlan.classification.requiresAuditRiskReview,
      requiresDocumentarySupportReview: retrievalPlan.classification.requiresDocumentarySupportReview,
      requiresEffectiveDateCheck: retrievalPlan.classification.requiresEffectiveDateCheck,
      requiresVATReturnConsequenceCheck: retrievalPlan.classification.requiresVATReturnConsequenceCheck
    },

    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),

      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      domainCode: "VAT",
      domainName: "Value-Added Tax",

      primaryIssue: issueClassification.primaryIssue || "VAT",
      legacyPrimaryIssue: "VAT_REGISTRATION",
      primarySubIssue: "REGISTRATION",
      subIssue: "REGISTRATION",
      subIssues: ["REGISTRATION"],

      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      controllingAuthorities: retrievalPlan.controllingAuthorities,
      supportingAuthorities: retrievalPlan.supportingAuthorities,
      supportingJurisprudence: retrievalPlan.supportingJurisprudence,

      retrievalStrategy: retrievalPlan.retrievalStrategy,
      priorityFolders: retrievalPlan.priorityFolders,
      excludedFolders: retrievalPlan.excludedFolders,
      requiredAnswerSections: VAT_REGISTRATION_TAX_ANSWER_STRUCTURE.LEGAL_ANALYSIS,
      tpmProfile: retrievalPlan.tpmProfile,
      sourceGroundingRequired: true,

      retrievalHints: buildVatRegistrationRetrievalHints({
        reviewMode,
        includeThresholdAuthorities: retrievalPlan.classification.requiresThresholdAnalysis
      }),

      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/registration-tax-engine.js",
        identityEngineCode: "REGISTRATION",
        requiresIssueSpecificRetrieval: true,
        requiresAuthorityHierarchy: true,
        requiresSupersessionCheck: true,
        requiresConflictCheck: false,
        requiresJurisprudence: false,
        requiresEvidenceEvaluation: true,
        requiresFactPatternEngine: true,
        supportsFactPatternRouting: true,
        requiresLegalValidation: true
      },

      confidence: retrievalPlan.classification.confidence,
      fallbackClassificationUsed: retrievalPlan.classification.fallbackClassificationUsed
    },

    vatRegistrationTax: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatRegistrationTaxAnswerRules(
        retrievalPlan.classification.requiresThresholdAnalysis ||
        retrievalPlan.classification.requiresCancellationCheck
          ? "THRESHOLD_OR_CANCELLATION_QUERY"
          : issueClassification.responseMode ||
              issueClassification.orchestrationMode ||
              "LEGAL_ANALYSIS"
      ),
      doctrinalMetadata: VAT_REGISTRATION_TAX_DOCTRINAL_METADATA,
      factPatternMetadata: VAT_REGISTRATION_TAX_FACT_PATTERN_METADATA
    }
  };
}

export function validateVatRegistrationTaxSource(doc = {}) {
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
    "nirc 109(bb)",
    "section 109(bb)",
    "sec. 109(bb)",
    "nirc 236",
    "section 236",
    "sec. 236",
    "rr 16-2005",
    "4.100",
    "4.101",
    "4.102",
    "4.103",
    "rmc 75-2015",
    "vat registration",
    "vat threshold",
    "optional registration",
    "mandatory registration",
    "cancellation of vat registration",
    "certificate of registration",
    "cor",
    "bir registration"
  ]);

  const negative = scoreKeywordSet(haystack, [
    "section 112",
    "vat refund",
    "input vat refund",
    "zero-rated",
    "zero rated",
    "input tax",
    "output vat computation",
    "withholding vat",
    "deemed sale"
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
    shouldPreserveForVatRegistration:
      score > 0 && authorityAllowed
  };
}

export function vatRegistrationTaxEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_REGISTRATION_TAX_ENGINE",
    version: VAT_REGISTRATION_TAX_ENGINE_VERSION,
    domain: "VAT",
    subIssue: "REGISTRATION",

    targetAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_REGISTRATION_TAX_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_REGISTRATION_TAX_SUB_ISSUE.supportingJurisprudence,

    retrievalStrategy: VAT_REGISTRATION_TAX_SUB_ISSUE.retrievalStrategy,
    priorityFolders: VAT_REGISTRATION_TAX_PRIORITY_FOLDERS,
    excludedFolders: VAT_REGISTRATION_TAX_EXCLUDED_FOLDERS,

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

    supportsVatThresholdAnalysis: true,
    supportsMandatoryRegistrationAnalysis: true,
    supportsOptionalRegistrationAnalysis: true,
    supportsCancellationAnalysis: true,
    supportsCorInvoiceImplications: true,
    supportsRegistrationAuditRisk: true,

    avoidsVatRefundMisclassification: true,
    avoidsNonVatAsAutomaticExemption: true,
    avoidsRegistrationAsAutomaticVatability: true
  };
}

export {
  VAT_REGISTRATION_TAX_ENGINE_VERSION as VAT_REGISTRATION_ENGINE_VERSION,
  VAT_REGISTRATION_TAX_SUB_ISSUE as VAT_REGISTRATION_SUB_ISSUE,
  VAT_REGISTRATION_TAX_PRIORITY_FOLDERS as VAT_REGISTRATION_PRIORITY_FOLDERS,
  VAT_REGISTRATION_TAX_EXCLUDED_FOLDERS as VAT_REGISTRATION_EXCLUDED_FOLDERS,
  VAT_REGISTRATION_TAX_AUTHORITY_HIERARCHY as VAT_REGISTRATION_AUTHORITY_HIERARCHY,
  VAT_REGISTRATION_TAX_KEYWORDS as VAT_REGISTRATION_KEYWORDS,
  VAT_REGISTRATION_TAX_ALIASES as VAT_REGISTRATION_ALIASES,
  VAT_REGISTRATION_TAX_ANSWER_STRUCTURE as VAT_REGISTRATION_ANSWER_STRUCTURE,
  VAT_REGISTRATION_TAX_DOCTRINAL_METADATA as VAT_REGISTRATION_DOCTRINAL_METADATA,
  VAT_REGISTRATION_TAX_FACT_PATTERN_METADATA as VAT_REGISTRATION_FACT_PATTERN_METADATA,

  classifyVatRegistrationTaxQuery as classifyVatRegistrationQuery,
  buildVatRegistrationTaxRetrievalPlan as buildVatRegistrationRetrievalPlan,
  buildVatRegistrationTaxAnswerRules as buildVatRegistrationAnswerRules,
  enhanceIssueClassificationWithVatRegistrationTax as enhanceIssueClassificationWithVatRegistration,
  validateVatRegistrationTaxSource as validateVatRegistrationSource,
  vatRegistrationTaxEngineHealthCheck as vatRegistrationEngineHealthCheck
};

export default {
  VAT_REGISTRATION_TAX_ENGINE_VERSION,
  VAT_REGISTRATION_TAX_SUB_ISSUE,
  VAT_REGISTRATION_TAX_PRIORITY_FOLDERS,
  VAT_REGISTRATION_TAX_EXCLUDED_FOLDERS,
  VAT_REGISTRATION_TAX_AUTHORITY_HIERARCHY,
  VAT_REGISTRATION_TAX_KEYWORDS,
  VAT_REGISTRATION_TAX_ALIASES,
  VAT_REGISTRATION_TAX_ANSWER_STRUCTURE,
  VAT_REGISTRATION_TAX_DOCTRINAL_METADATA,
  VAT_REGISTRATION_TAX_FACT_PATTERN_METADATA,

  getVatRegistrationConfig,
  getVatRegistrationAuthorities,
  getVatRegistrationKeywords,
  matchVatRegistrationQuery,
  normalizeVatRegistrationConcept,
  classifyVatRegistrationType,
  buildVatRegistrationRetrievalHints,

  classifyVatRegistrationTaxQuery,
  buildVatRegistrationTaxRetrievalPlan,
  buildVatRegistrationTaxAnswerRules,
  enhanceIssueClassificationWithVatRegistrationTax,
  validateVatRegistrationTaxSource,
  vatRegistrationTaxEngineHealthCheck,

  classifyVatRegistrationQuery: classifyVatRegistrationTaxQuery,
  buildVatRegistrationRetrievalPlan: buildVatRegistrationTaxRetrievalPlan,
  buildVatRegistrationAnswerRules: buildVatRegistrationTaxAnswerRules,
  enhanceIssueClassificationWithVatRegistration: enhanceIssueClassificationWithVatRegistrationTax,
  validateVatRegistrationSource: validateVatRegistrationTaxSource,
  vatRegistrationEngineHealthCheck: vatRegistrationTaxEngineHealthCheck
};
