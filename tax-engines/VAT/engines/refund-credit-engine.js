// FILE: tax-engines/VAT/engines/refund-credit-engine.js
"use strict";

/**
 * TINA VAT Refund / Credit Engine
 * Version: 2.0.0
 *
 * VAT → REFUND_CREDIT
 *
 * Scope:
 * - VAT refund / tax credit
 * - Sec. 112 claims
 * - administrative and judicial claims
 * - 120-day / 30-day rule where applicable
 * - zero-rated sales refund
 * - excess input VAT
 * - substantiation
 * - prescription / jurisdiction analysis
 * - CTA-sensitive refund issues
 * - San Roque / Aichi doctrine routing
 * - refund denial risk analysis
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

export const VAT_REFUND_CREDIT_ENGINE_VERSION = "2.0.0";

export const VAT_REFUND_CREDIT_PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "06_COURT_CASES",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS"
]);

export const VAT_REFUND_CREDIT_EXCLUDED_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

export const VAT_REFUND_CREDIT_AUTHORITY_HIERARCHY = Object.freeze([
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

export const VAT_REFUND_CREDIT_SUB_ISSUE = Object.freeze({
  code: "REFUND_CREDIT",
  subIssue: "REFUND_CREDIT",

  domain: "VAT",
  domainCode: "VAT",
  domainName: "Value-Added Tax",

  title:
    "Refund / Credit — Sec. 112 VAT Refund; Administrative and Judicial Claims",

  description:
    "Reusable VAT REFUND_CREDIT sub-issue engine for Sec. 112 VAT refund or tax credit claims, administrative and judicial claims, 120-day/30-day rule where applicable, zero-rated sales refund, excess input VAT, substantiation, prescription, CTA jurisdiction, and denial-risk analysis.",

  primaryIssue: "VAT",
  legacyPrimaryIssue: "VAT_REFUND",
  primarySubIssue: "REFUND_CREDIT",

  retrievalStrategy:
    "VAT_REFUND_CREDIT_JURISPRUDENCE_FIRST",

  targetAuthorities: [
    "NIRC Sec. 112",
    "NIRC Sec. 110, where input tax creditability is also implicated",
    "RR 16-2005 refund/input VAT provisions",
    "CIR v. San Roque Power Corporation",
    "CIR v. Aichi Forging Company of Asia, Inc.",
    "CIR v. Mirant Pagbilao Corporation",
    "CIR v. Pilipinas Total Gas, Inc."
  ],

  controllingAuthorities: [
    "NIRC Sec. 112",
    "NIRC Sec. 110, where input tax creditability is also implicated",
    "RR 16-2005 refund/input VAT provisions, where applicable"
  ],

  supportingAuthorities: [
    "Relevant RMCs/RRs on VAT refund procedure",
    "CTA rules, if litigation or appeal is implicated",
    "BIR administrative issuances on refund processing, if retrieved"
  ],

  supportingJurisprudence: [
    "CIR v. San Roque Power Corporation",
    "CIR v. Aichi Forging Company of Asia, Inc.",
    "CIR v. Mirant Pagbilao Corporation",
    "CIR v. Pilipinas Total Gas, Inc.",
    "Other issue-relevant Supreme Court or CTA cases only if retrieved or included by domain config"
  ],

  preferredAuthorityTypes: [
    "STATUTE",
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "CTA_DIVISION",
    "RR",
    "RMC",
    "RMO",
    "BIR_RULING"
  ],

  retrievalPriorityAuthorities: [
    "NIRC Sec. 112",
    "Supreme Court VAT refund jurisprudence",
    "RR 16-2005 refund/input VAT provisions",
    "NIRC Sec. 110, if creditability/substantiation is implicated",
    "RMC/RR refund procedure issuances",
    "CTA decisions only as persuasive or lower court support where useful"
  ],

  priorityFolders:
    VAT_REFUND_CREDIT_PRIORITY_FOLDERS,

  excludedFolders:
    VAT_REFUND_CREDIT_EXCLUDED_FOLDERS,

  authorityHierarchy:
    VAT_REFUND_CREDIT_AUTHORITY_HIERARCHY,

  legalDimensions: [
    "PROCEDURAL",
    "EVIDENTIARY",
    "JURISDICTIONAL",
    "SUBSTANTIVE",
    "LITIGATION",
    "AUDIT"
  ],

  legalConcepts: [
    "Sec. 112 VAT refund",
    "administrative claim",
    "judicial claim",
    "120-day rule",
    "30-day rule",
    "two-year prescriptive period",
    "zero-rated sales refund",
    "effectively zero-rated sales",
    "export sales refund",
    "excess input VAT",
    "attributable input VAT",
    "tax credit certificate",
    "input tax substantiation",
    "VAT invoice support",
    "sales invoice support",
    "proof of zero-rated sales",
    "proof of actual payment",
    "CTA jurisdiction",
    "refund denial risk",
    "San Roque doctrine",
    "Aichi doctrine",
    "Mirant doctrine",
    "Pilipinas Total Gas doctrine"
  ],

  tpmProfile: "HEAVY",

  sourceGroundingRequired: true,

  doctrinallySensitive: true,
  conflictSensitive: true,
  litigationSensitive: true,
  auditRiskSensitive: true,
  prescriptionSensitive: true,
  jurisdictionSensitive: true,
  substantiationSensitive: true,
  inputTaxOverlapSensitive: true,
  zeroRatingOverlapSensitive: true,
  proceduralDeadlineSensitive: true,

  refundType:
    "SECTION_112_VAT_REFUND_OR_TAX_CREDIT",

  refundRiskCategory:
    "PROCEDURAL_TIMING_JURISDICTION_AND_SUBSTANTIATION_RISK",

  relatedButDifferentIssues: [
    "DEFINITION",
    "ZERO_RATING",
    "INPUT_TAX",
    "EXEMPTION",
    "OUTPUT_TAX",
    "REGISTRATION",
    "COMPLIANCE",
    "WITHHOLDING_VAT",
    "TRANSITIONAL_INPUT_TAX",
    "DEEMED_SALE",
    "PRE",
    "PRESCRIPTION"
  ]
});

export const VAT_REFUND_CREDIT_KEYWORDS = Object.freeze([
  "vat refund",
  "input vat refund",
  "refund of input vat",
  "claim for refund",
  "tax refund",
  "vat tax credit",
  "tax credit",
  "tax credit certificate",
  "tcc",
  "refund credit",
  "unutilized input vat",
  "unused input vat",
  "excess input vat",
  "attributable input vat",
  "zero-rated sales refund",
  "zero rated sales refund",
  "effectively zero-rated",
  "effectively zero rated",
  "export sales refund",
  "section 112",
  "sec. 112",
  "nirc 112",
  "nirc sec. 112",
  "administrative claim",
  "judicial claim",
  "120-day rule",
  "120 day rule",
  "120-day",
  "120 day",
  "30-day rule",
  "30 day rule",
  "30-day",
  "30 day",
  "120+30",
  "two-year prescriptive period",
  "prescriptive period",
  "prescription",
  "cta refund",
  "cta appeal",
  "refund denial",
  "denial of refund",
  "documentary substantiation",
  "substantiation",
  "vat invoice support",
  "sales invoice support",
  "proof of zero-rated sales",
  "proof of actual payment",
  "san roque",
  "aichi",
  "mirant",
  "mirant pagbilao",
  "pilipinas total gas",
  "total gas"
]);

export const VAT_REFUND_CREDIT_ALIASES = Object.freeze([
  "VAT_REFUND",
  "REFUND_CREDIT",
  "INPUT_VAT_REFUND",
  "SECTION_112",
  "SEC_112",
  "VAT_TAX_CREDIT",
  "TAX_CREDIT_CERTIFICATE",
  "TCC",
  "ADMINISTRATIVE_CLAIM",
  "JUDICIAL_CLAIM",
  "ZERO_RATED_REFUND",
  "EXCESS_INPUT_VAT",
  "CTA_REFUND",
  "SAN_ROQUE_AICHI"
]);

const INPUT_TAX_OVERLAP_KEYWORDS = Object.freeze([
  "input tax",
  "input vat",
  "creditable input tax",
  "input tax credit",
  "section 110",
  "sec. 110",
  "nirc 110",
  "actual payment",
  "invoice support",
  "substantiation"
]);

const ZERO_RATING_OVERLAP_KEYWORDS = Object.freeze([
  "zero-rated",
  "zero rated",
  "0% vat",
  "effectively zero-rated",
  "effectively zero rated",
  "export sales",
  "foreign currency",
  "cross-border",
  "destination principle"
]);

const PRESCRIPTION_JURISDICTION_KEYWORDS = Object.freeze([
  "prescription",
  "prescriptive period",
  "two-year",
  "two year",
  "120-day",
  "120 day",
  "30-day",
  "30 day",
  "120+30",
  "jurisdiction",
  "jurisdictional",
  "late filing",
  "premature filing",
  "administrative claim",
  "judicial claim",
  "cta",
  "appeal"
]);

const EVIDENCE_SUBSTANTIATION_KEYWORDS = Object.freeze([
  "substantiation",
  "documentary",
  "evidence",
  "proof",
  "invoice",
  "sales invoice",
  "official receipt",
  "vat invoice",
  "input vat schedule",
  "zero-rated sales",
  "vat return",
  "2550q",
  "slsp",
  "actual payment"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "define vat",
  "what is vat",
  "nature of vat",
  "sale of goods",
  "sale of services",
  "output vat only",
  "vat registration",
  "2550m",
  "withholding vat",
  "5% final withholding vat",
  "transitional input tax",
  "section 109",
  "vat exempt",
  "deemed sale"
]);

export const VAT_REFUND_CREDIT_ANSWER_STRUCTURE = Object.freeze({
  SIMPLE_REFUND_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. PROCEDURAL REQUIREMENT",
    "D. PRACTICAL NOTE"
  ],

  LEGAL_ANALYSIS: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUPPORTING JURISPRUDENCE",
    "D. PROCEDURAL / PRESCRIPTIVE PERIOD ANALYSIS",
    "E. DOCUMENTARY REQUIREMENTS / SUBSTANTIATION",
    "F. PRACTICAL POSITION / RISK"
  ],

  CTA_LITIGATION_REFUND_QUERY: [
    "A. DIRECT ANSWER",
    "B. ISSUE FOR RESOLUTION",
    "C. CONTROLLING LEGAL BASIS",
    "D. SUPPORTING JURISPRUDENCE",
    "E. TIMELINESS / JURISDICTION ANALYSIS",
    "F. EVIDENCE AND SUBSTANTIATION GAPS",
    "G. TAXPAYER POSITION / BIR POSITION",
    "H. PRACTICAL LITIGATION RISK"
  ]
});

export const VAT_REFUND_CREDIT_DOCTRINAL_METADATA = Object.freeze({
  doctrines: [
    {
      code: "STRICT_SECTION_112_COMPLIANCE",
      label: "Strict compliance with Sec. 112",
      description:
        "VAT refund or tax credit claims under Sec. 112 require compliance with statutory and procedural requirements."
    },
    {
      code: "ADMINISTRATIVE_AND_JUDICIAL_CLAIM_DISTINCTION",
      label: "Administrative and judicial claim distinction",
      description:
        "Refund analysis must separate administrative claim filing, BIR action or inaction, and judicial claim filing."
    },
    {
      code: "AICHI_TIMING_DOCTRINE",
      label: "Aichi timing doctrine",
      description:
        "Aichi is relevant to the timing of judicial claims and premature filing analysis where the doctrine applies."
    },
    {
      code: "SAN_ROQUE_EXCEPTION_AND_CLARIFICATION",
      label: "San Roque doctrine",
      description:
        "San Roque must be applied only on the exact timing, reliance, and transitional facts recognized by controlling jurisprudence."
    },
    {
      code: "INPUT_TAX_ATTRIBUTION_AND_SUBSTANTIATION",
      label: "Input VAT attribution and substantiation",
      description:
        "Refundable input VAT must be attributable to qualifying sales and supported by competent documentary evidence."
    },
    {
      code: "CTA_REFUND_EVIDENCE_HEAVY",
      label: "CTA refund claims are evidence-heavy",
      description:
        "CTA refund cases require proof of sales, input tax, filing, payment, and compliance with jurisdictional requirements."
    },
    {
      code: "ADMIN_ISSUANCE_LIMIT",
      label: "Administrative issuances cannot override statute or Supreme Court doctrine",
      description:
        "RMCs, RMOs, and administrative issuances cannot override the NIRC or controlling Supreme Court jurisprudence."
    }
  ],

  conflictRule:
    "Do not mark conflict automatically. Conflict metadata is valid only if same exact issue, same legal dimension, opposite rule or holding, hierarchy analysis, and conflict-resolution basis are present.",

  automaticConflictDetection: false,
  sanRoqueAndAichiAreNotAutomaticallyConflicting: true,
  timingIssueRequiresExactFactualPeriod: true,
  documentaryDefectsAreNotAutomaticallyCurable: true,
  zeroRatedSalesDoNotAutomaticallyValidateRefund: true
});

export const VAT_REFUND_CREDIT_FACT_PATTERN_METADATA = Object.freeze({
  supportsFactPatternRouting: true,
  doesNotPerformFullFactPatternAnalysis: true,

  usableFor: [
    "zero-rated sales review",
    "input tax substantiation review",
    "documentary evidence review",
    "VAT return reconciliation",
    "SLSP/VAT return tie-out",
    "sales invoice and input invoice review",
    "timing and filing analysis",
    "CTA jurisdiction analysis",
    "BIR denial risk",
    "refund claim strength analysis",
    "position-strength scoring",
    "audit evidence review"
  ],

  requiredFactInputs: [
    "taxable period covered",
    "date of administrative claim filing",
    "date of BIR action or inaction",
    "date of judicial claim filing",
    "nature of sales giving rise to refund",
    "whether sales are zero-rated or effectively zero-rated",
    "input VAT amount claimed",
    "input VAT attribution to qualifying sales",
    "VAT returns filed",
    "SLSP schedules",
    "sales invoices and input invoices",
    "proof of actual payment",
    "BIR denial letter or FDDA if any",
    "CTA petition filing date if litigation is involved"
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

export function getVatRefundCreditConfig() {
  return {
    engine: "tax-engines/VAT/engines/refund-credit-engine.js",
    version: VAT_REFUND_CREDIT_ENGINE_VERSION,
    ...VAT_REFUND_CREDIT_SUB_ISSUE,
    keywords: VAT_REFUND_CREDIT_KEYWORDS,
    aliases: VAT_REFUND_CREDIT_ALIASES,
    answerStructure: VAT_REFUND_CREDIT_ANSWER_STRUCTURE,
    doctrinalMetadata: VAT_REFUND_CREDIT_DOCTRINAL_METADATA,
    factPatternMetadata: VAT_REFUND_CREDIT_FACT_PATTERN_METADATA,
    retrievalHints: buildVatRefundCreditRetrievalHints()
  };
}

export function getVatRefundCreditAuthorities() {
  return {
    targetAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_REFUND_CREDIT_SUB_ISSUE.supportingJurisprudence,
    preferredAuthorityTypes: VAT_REFUND_CREDIT_SUB_ISSUE.preferredAuthorityTypes,
    authorityHierarchy: VAT_REFUND_CREDIT_AUTHORITY_HIERARCHY,
    priorityFolders: VAT_REFUND_CREDIT_PRIORITY_FOLDERS,
    excludedFolders: VAT_REFUND_CREDIT_EXCLUDED_FOLDERS
  };
}

export function getVatRefundCreditKeywords() {
  return {
    keywords: VAT_REFUND_CREDIT_KEYWORDS,
    aliases: VAT_REFUND_CREDIT_ALIASES,
    inputTaxOverlapKeywords: INPUT_TAX_OVERLAP_KEYWORDS,
    zeroRatingOverlapKeywords: ZERO_RATING_OVERLAP_KEYWORDS,
    prescriptionJurisdictionKeywords: PRESCRIPTION_JURISDICTION_KEYWORDS,
    evidenceSubstantiationKeywords: EVIDENCE_SUBSTANTIATION_KEYWORDS,
    diversionKeywords: NEGATIVE_OR_DIVERSION_KEYWORDS
  };
}

export function normalizeVatRefundCreditConcept(value = "") {
  const normalized = normalizeCode(value);

  const aliases = {
    VAT_REFUND: "REFUND_CREDIT",
    INPUT_VAT_REFUND: "REFUND_CREDIT",
    VAT_TAX_CREDIT: "REFUND_CREDIT",
    TAX_CREDIT_CERTIFICATE: "TAX_CREDIT_CERTIFICATE",
    TCC: "TAX_CREDIT_CERTIFICATE",
    SECTION_112: "SECTION_112_REFUND",
    SEC_112: "SECTION_112_REFUND",
    ADMINISTRATIVE_CLAIM: "ADMINISTRATIVE_CLAIM",
    JUDICIAL_CLAIM: "JUDICIAL_CLAIM",
    PRESCRIPTION: "PRESCRIPTION_ANALYSIS",
    PRESCRIPTIVE_PERIOD: "PRESCRIPTION_ANALYSIS",
    JURISDICTION: "JURISDICTION_ANALYSIS",
    CTA_REFUND: "CTA_LITIGATION_REFUND",
    ZERO_RATED_REFUND: "ZERO_RATED_SALES_REFUND",
    EXCESS_INPUT_VAT: "EXCESS_INPUT_VAT_REFUND",
    SAN_ROQUE: "SAN_ROQUE_DOCTRINE",
    AICHI: "AICHI_DOCTRINE",
    MIRANT: "MIRANT_DOCTRINE",
    PILIPINAS_TOTAL_GAS: "PILIPINAS_TOTAL_GAS_DOCTRINE"
  };

  return aliases[normalized] || normalized || "REFUND_CREDIT";
}

export function classifyVatRefundType(query = "") {
  const normalizedQuery = normalizeText(query);

  const inputTaxScore = scoreKeywordSet(normalizedQuery, INPUT_TAX_OVERLAP_KEYWORDS);
  const zeroRatingScore = scoreKeywordSet(normalizedQuery, ZERO_RATING_OVERLAP_KEYWORDS);
  const timingScore = scoreKeywordSet(normalizedQuery, PRESCRIPTION_JURISDICTION_KEYWORDS);
  const evidenceScore = scoreKeywordSet(normalizedQuery, EVIDENCE_SUBSTANTIATION_KEYWORDS);

  const ctaScore = scoreKeywordSet(normalizedQuery, [
    "cta",
    "court of tax appeals",
    "petition for review",
    "judicial claim",
    "appeal",
    "jurisdiction"
  ]);

  const denialScore = scoreKeywordSet(normalizedQuery, [
    "denial",
    "denied",
    "refund denied",
    "bir denied",
    "disallowed",
    "denial risk"
  ]);

  const doctrineScore = scoreKeywordSet(normalizedQuery, [
    "san roque",
    "aichi",
    "mirant",
    "pilipinas total gas",
    "120-day",
    "30-day",
    "premature",
    "late filing"
  ]);

  const requiresAdministrativeClaimCheck =
    /administrative claim|bir claim|filed with bir|filing with bir/i.test(normalizedQuery) ||
    timingScore.score > 0;

  const requiresJudicialClaimCheck =
    /judicial claim|cta|court of tax appeals|petition for review/i.test(normalizedQuery) ||
    ctaScore.score > 0;

  const requiresPrescriptionAnalysis =
    /prescription|prescriptive|two-year|two year|120-day|120 day|30-day|30 day|120\+30/i.test(normalizedQuery) ||
    timingScore.score > 0;

  const requiresJurisdictionAnalysis =
    /jurisdiction|jurisdictional|premature|late filing|cta/i.test(normalizedQuery) ||
    requiresJudicialClaimCheck;

  const requiresZeroRatedSalesProof =
    zeroRatingScore.score > 0 ||
    /zero-rated sales|export sales|effectively zero-rated/i.test(normalizedQuery);

  const requiresInputTaxAttribution =
    inputTaxScore.score > 0 ||
    /attributable input vat|excess input vat|unutilized input vat/i.test(normalizedQuery);

  const requiresSubstantiationReview =
    evidenceScore.score > 0 ||
    /substantiation|documentary|proof|invoice|evidence/i.test(normalizedQuery);

  const requiresCTAAnalysis =
    ctaScore.score > 0 || requiresJudicialClaimCheck;

  const requiresAichiSanRoqueDistinction =
    doctrineScore.score > 0 ||
    /aichi|san roque|120-day|30-day|premature|late filing/i.test(normalizedQuery);

  const refundType =
    requiresCTAAnalysis
      ? "CTA_LITIGATION_REFUND"
      : requiresZeroRatedSalesProof
        ? "ZERO_RATED_SALES_REFUND"
        : requiresInputTaxAttribution
          ? "EXCESS_INPUT_VAT_REFUND"
          : "SECTION_112_REFUND_OR_TAX_CREDIT";

  const refundRiskCategory =
    requiresJurisdictionAnalysis
      ? "HIGH_JURISDICTION_AND_TIMELINESS_RISK"
      : requiresSubstantiationReview
        ? "SUBSTANTIATION_AND_EVIDENCE_RISK"
        : denialScore.score > 0
          ? "REFUND_DENIAL_RISK"
          : "STANDARD_SECTION_112_RISK";

  return {
    refundType,
    refundRiskCategory,

    requiresAdministrativeClaimCheck,
    requiresJudicialClaimCheck,
    requiresPrescriptionAnalysis,
    requiresJurisdictionAnalysis,
    requiresZeroRatedSalesProof,
    requiresInputTaxAttribution,
    requiresSubstantiationReview,
    requiresInvoiceReview: requiresSubstantiationReview,
    requiresVatReturnTieOut:
      /vat return|2550q|2550m|return/i.test(normalizedQuery) || evidenceScore.score > 0,
    requiresSLSPTieOut:
      /slsp|summary list/i.test(normalizedQuery),
    requiresEvidenceEvaluation:
      requiresSubstantiationReview || evidenceScore.score > 0,
    requiresPositionStrengthAnalysis:
      denialScore.score > 0 || requiresCTAAnalysis || requiresJurisdictionAnalysis,
    requiresCTAAnalysis,
    requiresRefundRiskScoring:
      true,
    requiresAichiSanRoqueDistinction,
    requiresDenialRiskReview:
      denialScore.score > 0 || requiresSubstantiationReview || requiresCTAAnalysis,

    distinctionRequired:
      inputTaxScore.score > 0 ||
      zeroRatingScore.score > 0 ||
      requiresPrescriptionAnalysis,

    candidateSubIssues: unique([
      "REFUND_CREDIT",
      inputTaxScore.score > 0 ? "INPUT_TAX" : null,
      zeroRatingScore.score > 0 ? "ZERO_RATING" : null,
      requiresPrescriptionAnalysis ? "PRE" : null,
      requiresPrescriptionAnalysis ? "PRESCRIPTION" : null
    ]),

    matchedTerms: unique([
      ...inputTaxScore.matchedTerms,
      ...zeroRatingScore.matchedTerms,
      ...timingScore.matchedTerms,
      ...evidenceScore.matchedTerms,
      ...ctaScore.matchedTerms,
      ...denialScore.matchedTerms,
      ...doctrineScore.matchedTerms
    ])
  };
}

export function buildVatRefundCreditRetrievalHints({
  reviewMode = false,
  extraAuthorities = [],
  includeInputTaxAuthorities = false,
  includeCTAAuthorities = false
} = {}) {
  return {
    domainCode: "VAT",
    domainName: "Value-Added Tax",
    subIssue: "REFUND_CREDIT",
    retrievalStrategy: VAT_REFUND_CREDIT_SUB_ISSUE.retrievalStrategy,

    targetAuthorities: unique([
      ...VAT_REFUND_CREDIT_SUB_ISSUE.targetAuthorities,
      ...(includeInputTaxAuthorities ? ["NIRC Sec. 110", "Input tax substantiation authorities"] : []),
      ...(includeCTAAuthorities ? ["CTA Rules", "CTA refund procedure authorities"] : []),
      ...extraAuthorities
    ]),

    controllingAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_REFUND_CREDIT_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_REFUND_CREDIT_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_REFUND_CREDIT_EXCLUDED_FOLDERS,

    preserveControllingAuthorities: true,
    preserveTargetAuthorityMatches: true,
    preserveIssueClassificationMatches: true,
    preserveJurisprudenceSources: true,
    preserveCTAProcedureSources: true,

    sourceGroundingRequired: true,
    compactSourcesOnly: true
  };
}

export function matchVatRefundCreditQuery(query = "", options = {}) {
  return classifyVatRefundCreditQuery(query, options);
}

export function classifyVatRefundCreditQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, [
    ...VAT_REFUND_CREDIT_KEYWORDS,
    ...VAT_REFUND_CREDIT_ALIASES
  ]);

  const inputTaxOverlap = scoreKeywordSet(normalizedQuery, INPUT_TAX_OVERLAP_KEYWORDS);
  const zeroRatingOverlap = scoreKeywordSet(normalizedQuery, ZERO_RATING_OVERLAP_KEYWORDS);
  const prescriptionJurisdiction = scoreKeywordSet(normalizedQuery, PRESCRIPTION_JURISDICTION_KEYWORDS);
  const evidenceSubstantiation = scoreKeywordSet(normalizedQuery, EVIDENCE_SUBSTANTIATION_KEYWORDS);
  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score =
    positive.score +
    inputTaxOverlap.score * 0.35 +
    zeroRatingOverlap.score * 0.55 +
    prescriptionJurisdiction.score * 0.75 +
    evidenceSubstantiation.score * 0.35 -
    negative.score;

  const priorSubIssue = normalizeCode(options.priorSubIssue || "");
  const primaryDomain = normalizeCode(options.primaryDomain || options.domainCode || "");
  const primaryIssue = normalizeCode(options.primaryIssue || "");

  if (priorSubIssue === "REFUND_CREDIT") score += 6;
  if (primaryDomain === "VAT") score += 3;
  if (primaryIssue === "VAT" || primaryIssue === "VAT_REFUND" || primaryIssue === "REFUND_CREDIT") score += 2;
  if (primaryIssue === "VAT_LIABILITY" || primaryIssue === "DEFINITION") score -= 2;

  const refundType = classifyVatRefundType(query);

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 24, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/refund-credit-engine.js",
    version: VAT_REFUND_CREDIT_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "VAT_REFUND",
    primarySubIssue: "REFUND_CREDIT",
    subIssue: "REFUND_CREDIT",

    matched: score > 0,
    score,
    confidence,

    matchedTerms: unique([
      ...positive.matchedTerms,
      ...inputTaxOverlap.matchedTerms,
      ...zeroRatingOverlap.matchedTerms,
      ...prescriptionJurisdiction.matchedTerms,
      ...evidenceSubstantiation.matchedTerms,
      ...refundType.matchedTerms
    ]),

    diversionTerms: negative.matchedTerms,

    shouldUseThisEngine: score > 0 && confidence >= 0.45,
    fallbackClassificationUsed: score <= 0,

    distinctionRequired: refundType.distinctionRequired,
    candidateSubIssues: refundType.candidateSubIssues,

    ...refundType,

    retrievalStrategy: VAT_REFUND_CREDIT_SUB_ISSUE.retrievalStrategy,
    targetAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_REFUND_CREDIT_SUB_ISSUE.supportingJurisprudence,
    sourceGroundingRequired: true
  };
}

export function buildVatRefundCreditRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 10,
  reviewMode = false
} = {}) {
  const classification = classifyVatRefundCreditQuery(query, {
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
      subIssues: ["REFUND_CREDIT"],
      targetAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 112 VAT refund administrative claim judicial claim",
    "NIRC Sec. 112 input VAT refund tax credit certificate",
    "RR 16-2005 VAT refund input VAT provisions",
    "VAT refund 120-day 30-day rule Section 112",
    "CIR v San Roque Power VAT refund 120 30 rule",
    "CIR v Aichi Forging VAT refund 120 day rule",
    "CIR v Mirant Pagbilao VAT refund",
    "CIR v Pilipinas Total Gas VAT refund",
    "VAT refund substantiation zero-rated sales input tax attribution",
    "CTA VAT refund jurisdiction administrative judicial claim",
    ...(classification.requiresInputTaxAttribution
      ? [
          "NIRC Section 110 input tax creditability substantiation",
          "VAT input tax attribution refund Sec. 112"
        ]
      : []),
    ...classification.matchedTerms.map((term) => `VAT refund credit Section 112 ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  return {
    engine: "tax-engines/VAT/engines/refund-credit-engine.js",
    version: VAT_REFUND_CREDIT_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "VAT_REFUND",
    primarySubIssue: "REFUND_CREDIT",
    subIssue: "REFUND_CREDIT",

    retrievalStrategy: VAT_REFUND_CREDIT_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_REFUND_CREDIT_SUB_ISSUE.legalDimensions,

    targetAuthorities: unique([
      ...VAT_REFUND_CREDIT_SUB_ISSUE.targetAuthorities,
      ...(classification.requiresInputTaxAttribution
        ? ["NIRC Sec. 110", "Input tax substantiation authorities"]
        : []),
      ...(classification.requiresCTAAnalysis
        ? ["CTA Rules", "CTA refund procedure authorities"]
        : [])
    ]),

    controllingAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_REFUND_CREDIT_SUB_ISSUE.supportingJurisprudence,

    targetAuthorityTypes,
    namedTargetAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.targetAuthorities,

    governingStatutes: [
      "NIRC Sec. 112",
      "RR 16-2005 refund/input VAT provisions",
      ...(classification.requiresInputTaxAttribution ? ["NIRC Sec. 110"] : [])
    ],

    preferredCases: VAT_REFUND_CREDIT_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_REFUND_CREDIT_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_REFUND_CREDIT_EXCLUDED_FOLDERS,

    searchQueries,

    boostTerms: unique([
      "VAT Refund",
      "Input VAT Refund",
      "NIRC Sec. 112",
      "Section 112",
      "Administrative Claim",
      "Judicial Claim",
      "120-day rule",
      "30-day rule",
      "Two-year prescriptive period",
      "Tax Credit Certificate",
      "Zero-rated sales refund",
      "Excess input VAT",
      "San Roque Power",
      "Aichi Forging",
      "Mirant Pagbilao",
      "Pilipinas Total Gas",
      "CTA VAT refund",
      "Substantiation",
      "VAT invoice",
      "SLSP",
      ...VAT_REFUND_CREDIT_SUB_ISSUE.legalConcepts,
      ...classification.matchedTerms
    ]),

    suppressIssues: [
      "DEFINITION",
      !classification.candidateSubIssues.includes("ZERO_RATING") ? "ZERO_RATING" : null,
      !classification.candidateSubIssues.includes("INPUT_TAX") ? "INPUT_TAX" : null,
      "EXEMPTION",
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
    tpmProfile: VAT_REFUND_CREDIT_SUB_ISSUE.tpmProfile,
    compactSourcesOnly: true,

    classification
  };
}

export function buildVatRefundCreditAnswerRules(mode = "LEGAL_ANALYSIS") {
  const normalizedMode = normalizeCode(mode);

  const structure =
    normalizedMode === "SIMPLE_REFUND_QUERY" ||
    normalizedMode === "FAST_DEFINITION" ||
    normalizedMode === "QUICK"
      ? VAT_REFUND_CREDIT_ANSWER_STRUCTURE.SIMPLE_REFUND_QUERY
      : normalizedMode === "CTA_LITIGATION_REFUND_QUERY" ||
          normalizedMode === "TAX_LITIGATION" ||
          normalizedMode === "LITIGATION"
        ? VAT_REFUND_CREDIT_ANSWER_STRUCTURE.CTA_LITIGATION_REFUND_QUERY
        : VAT_REFUND_CREDIT_ANSWER_STRUCTURE.LEGAL_ANALYSIS;

  return {
    engine: "tax-engines/VAT/engines/refund-credit-engine.js",
    version: VAT_REFUND_CREDIT_ENGINE_VERSION,

    requiredStructure: structure,
    answerStructure: VAT_REFUND_CREDIT_ANSWER_STRUCTURE,

    directAnswerRule:
      "Determine VAT refund or tax credit entitlement only from retrieved indexed authorities and facts. Do not treat every input VAT issue as refundable or every zero-rated sale as automatically sufficient for refund.",

    controllingLegalBasisRule:
      "Use NIRC Sec. 112 as the controlling VAT refund statute. Use NIRC Sec. 110 only when input tax creditability, attribution, or substantiation is implicated. Use RR 16-2005 only within its implementing scope.",

    jurisprudenceRule:
      "Use San Roque, Aichi, Mirant Pagbilao, Pilipinas Total Gas, and other cases only for VAT refund, Sec. 112, timing, administrative/judicial claim, jurisdiction, or substantiation issues. Do not cite them for pure VAT definition issues.",

    proceduralRule:
      "Separate administrative claim filing, BIR action or inaction, judicial claim filing, 120-day/30-day timing where applicable, and the two-year prescriptive period. Do not hallucinate deadlines; rely only on retrieved authorities and supplied facts.",

    jurisdictionRule:
      "If CTA or judicial claim is involved, flag jurisdiction sensitivity and require exact dates of administrative claim, BIR action/inaction, and judicial filing.",

    evidentiaryRule:
      "Flag missing invoices, sales invoices, input VAT schedules, zero-rated sales support, VAT returns, proof of payment, SLSP, and filing proofs as evidence gaps where relevant.",

    doctrineRule:
      "Distinguish Aichi and San Roque accurately. Do not treat them as automatically conflicting; apply the exact issue, period, reliance facts, and hierarchy.",

    denialRiskRule:
      "Flag denial risk where timing, jurisdiction, input tax attribution, zero-rated sales proof, documentary support, or VAT return reconciliation is incomplete.",

    conflictRule:
      VAT_REFUND_CREDIT_DOCTRINAL_METADATA.conflictRule,

    exclusionRule:
      "Do not treat exemption, registration, output VAT computation, or general VAT definition as the controlling issue unless the user query specifically asks those issues.",

    insufficientSourceRule:
      'If indexed controlling authorities are not available, say: "Indexed source not found."',

    noFinalAnswerGeneration: true
  };
}

export function enhanceIssueClassificationWithVatRefundCredit(issueClassification = {}, query = "") {
  const reviewMode =
    issueClassification.reviewMode === true ||
    issueClassification.requiresReviewMode === true ||
    issueClassification.queryIntent?.requiresReviewMode === true ||
    issueClassification.intentFlags?.requiresReviewMode === true;

  const retrievalPlan = buildVatRefundCreditRetrievalPlan({
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
    legacyPrimaryIssue: "VAT_REFUND",
    primarySubIssue: "REFUND_CREDIT",
    subIssue: "REFUND_CREDIT",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "VAT",
      "VAT_REFUND",
      "REFUND_CREDIT"
    ]),

    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "PROCEDURAL",
      "EVIDENTIARY",
      "JURISDICTIONAL",
      "SUBSTANTIVE",
      "LITIGATION",
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

    refundCreditFlags: {
      requiresAdministrativeClaimCheck: retrievalPlan.classification.requiresAdministrativeClaimCheck,
      requiresJudicialClaimCheck: retrievalPlan.classification.requiresJudicialClaimCheck,
      requiresPrescriptionAnalysis: retrievalPlan.classification.requiresPrescriptionAnalysis,
      requiresJurisdictionAnalysis: retrievalPlan.classification.requiresJurisdictionAnalysis,
      requiresZeroRatedSalesProof: retrievalPlan.classification.requiresZeroRatedSalesProof,
      requiresInputTaxAttribution: retrievalPlan.classification.requiresInputTaxAttribution,
      requiresSubstantiationReview: retrievalPlan.classification.requiresSubstantiationReview,
      requiresInvoiceReview: retrievalPlan.classification.requiresInvoiceReview,
      requiresVatReturnTieOut: retrievalPlan.classification.requiresVatReturnTieOut,
      requiresSLSPTieOut: retrievalPlan.classification.requiresSLSPTieOut,
      requiresEvidenceEvaluation: retrievalPlan.classification.requiresEvidenceEvaluation,
      requiresPositionStrengthAnalysis: retrievalPlan.classification.requiresPositionStrengthAnalysis,
      requiresCTAAnalysis: retrievalPlan.classification.requiresCTAAnalysis,
      requiresRefundRiskScoring: retrievalPlan.classification.requiresRefundRiskScoring,
      requiresAichiSanRoqueDistinction: retrievalPlan.classification.requiresAichiSanRoqueDistinction,
      requiresDenialRiskReview: retrievalPlan.classification.requiresDenialRiskReview
    },

    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),

      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      domainCode: "VAT",
      domainName: "Value-Added Tax",

      primaryIssue: issueClassification.primaryIssue || "VAT",
      legacyPrimaryIssue: "VAT_REFUND",
      primarySubIssue: "REFUND_CREDIT",
      subIssue: "REFUND_CREDIT",
      subIssues: ["REFUND_CREDIT"],

      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      controllingAuthorities: retrievalPlan.controllingAuthorities,
      supportingAuthorities: retrievalPlan.supportingAuthorities,
      supportingJurisprudence: retrievalPlan.supportingJurisprudence,

      retrievalStrategy: retrievalPlan.retrievalStrategy,
      priorityFolders: retrievalPlan.priorityFolders,
      excludedFolders: retrievalPlan.excludedFolders,
      requiredAnswerSections: VAT_REFUND_CREDIT_ANSWER_STRUCTURE.LEGAL_ANALYSIS,
      tpmProfile: retrievalPlan.tpmProfile,
      sourceGroundingRequired: true,

      retrievalHints: buildVatRefundCreditRetrievalHints({
        reviewMode,
        includeInputTaxAuthorities: retrievalPlan.classification.requiresInputTaxAttribution,
        includeCTAAuthorities: retrievalPlan.classification.requiresCTAAnalysis
      }),

      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/refund-credit-engine.js",
        identityEngineCode: "REFUND_CREDIT",
        requiresIssueSpecificRetrieval: true,
        requiresAuthorityHierarchy: true,
        requiresSupersessionCheck: true,
        requiresConflictCheck: true,
        requiresJurisprudence: true,
        requiresEvidenceEvaluation: true,
        requiresFactPatternEngine: true,
        supportsFactPatternRouting: true,
        requiresLegalValidation: true,
        requiresCTAAnalysis: retrievalPlan.classification.requiresCTAAnalysis,
        requiresPositionStrength: retrievalPlan.classification.requiresPositionStrengthAnalysis
      },

      confidence: retrievalPlan.classification.confidence,
      fallbackClassificationUsed: retrievalPlan.classification.fallbackClassificationUsed
    },

    vatRefundCredit: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatRefundCreditAnswerRules(
        retrievalPlan.classification.requiresCTAAnalysis
          ? "CTA_LITIGATION_REFUND_QUERY"
          : issueClassification.responseMode ||
              issueClassification.orchestrationMode ||
              "LEGAL_ANALYSIS"
      ),
      doctrinalMetadata: VAT_REFUND_CREDIT_DOCTRINAL_METADATA,
      factPatternMetadata: VAT_REFUND_CREDIT_FACT_PATTERN_METADATA
    }
  };
}

export function validateVatRefundCreditSource(doc = {}) {
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
    "nirc 112",
    "section 112",
    "sec. 112",
    "rr 16-2005",
    "vat refund",
    "input vat refund",
    "tax credit",
    "tax credit certificate",
    "administrative claim",
    "judicial claim",
    "120-day",
    "120 day",
    "30-day",
    "30 day",
    "san roque",
    "aichi",
    "mirant",
    "pagbilao",
    "pilipinas total gas",
    "total gas",
    "cta",
    "zero-rated sales",
    "substantiation"
  ]);

  const negative = scoreKeywordSet(haystack, [
    "section 105",
    "section 106",
    "section 107",
    "section 108",
    "define vat",
    "nature of vat",
    "registration threshold",
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
    shouldPreserveForVatRefundCredit:
      score > 0 && authorityAllowed
  };
}

export function vatRefundCreditEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_REFUND_CREDIT_ENGINE",
    version: VAT_REFUND_CREDIT_ENGINE_VERSION,
    domain: "VAT",
    subIssue: "REFUND_CREDIT",

    targetAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_REFUND_CREDIT_SUB_ISSUE.supportingJurisprudence,

    retrievalStrategy: VAT_REFUND_CREDIT_SUB_ISSUE.retrievalStrategy,
    priorityFolders: VAT_REFUND_CREDIT_PRIORITY_FOLDERS,
    excludedFolders: VAT_REFUND_CREDIT_EXCLUDED_FOLDERS,

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

    avoidsVatDefinitionMisclassification: true,
    avoidsEveryInputTaxAsRefundable: true,
    supportsSection112ProceduralAnalysis: true,
    supportsSanRoqueAichiDoctrineRouting: true,
    supportsCTARefundAnalysis: true,
    supportsRefundRiskScoring: true,
    supportsEvidenceSubstantiationRouting: true
  };
}

export default {
  VAT_REFUND_CREDIT_ENGINE_VERSION,
  VAT_REFUND_CREDIT_SUB_ISSUE,
  VAT_REFUND_CREDIT_PRIORITY_FOLDERS,
  VAT_REFUND_CREDIT_EXCLUDED_FOLDERS,
  VAT_REFUND_CREDIT_AUTHORITY_HIERARCHY,
  VAT_REFUND_CREDIT_KEYWORDS,
  VAT_REFUND_CREDIT_ALIASES,
  VAT_REFUND_CREDIT_ANSWER_STRUCTURE,
  VAT_REFUND_CREDIT_DOCTRINAL_METADATA,
  VAT_REFUND_CREDIT_FACT_PATTERN_METADATA,

  getVatRefundCreditConfig,
  getVatRefundCreditAuthorities,
  getVatRefundCreditKeywords,
  matchVatRefundCreditQuery,
  normalizeVatRefundCreditConcept,
  classifyVatRefundType,
  buildVatRefundCreditRetrievalHints,

  classifyVatRefundCreditQuery,
  buildVatRefundCreditRetrievalPlan,
  buildVatRefundCreditAnswerRules,
  enhanceIssueClassificationWithVatRefundCredit,
  validateVatRefundCreditSource,
  vatRefundCreditEngineHealthCheck
};
