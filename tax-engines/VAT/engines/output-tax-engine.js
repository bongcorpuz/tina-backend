// FILE: tax-engines/VAT/engines/output-tax-engine.js
"use strict";

/**
 * TINA VAT Output Tax Engine
 * Version: 1.0.0
 *
 * Handles VAT Sub-Issue #6:
 * OUTPUT TAX — Computation; invoice requirements; advance VAT.
 *
 * Target Authorities:
 * - NIRC Secs. 106, 108
 * - RR 16-2005
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../../shared/authority-hierarchy.js";

export const VAT_OUTPUT_TAX_ENGINE_VERSION = "1.0.0";

export const VAT_OUTPUT_TAX_SUB_ISSUE = Object.freeze({
  code: "OUTPUT_TAX",
  domain: "VAT",
  title: "Output Tax — Computation; Invoice Requirements; Advance VAT",
  description:
    "Determines whether the query involves VAT output tax computation, tax base, invoice requirements, gross selling price, gross receipts, advance payments, or timing of output VAT under NIRC Secs. 106 and 108 and RR 16-2005.",
  primaryIssue: "OUTPUT_TAX",
  primarySubIssue: "OUTPUT_TAX",
  controllingAuthorities: ["STATUTE", "RR", "RMC"],
  targetAuthorities: [
    "NIRC Sec. 106",
    "NIRC Sec. 108",
    "RR 16-2005"
  ],
  preferredAuthorityTypes: ["STATUTE", "RR", "RMC"],
  retrievalStrategy: "VAT_OUTPUT_TAX_COMPUTATION_INVOICE_AUTHORITY_FIRST",
  legalDimensions: ["SUBSTANTIVE", "COMPLIANCE", "ACCOUNTING"],
  relatedButDifferentIssues: [
    "DEFINITION",
    "REFUND_CREDIT",
    "ZERO_RATING",
    "INPUT_TAX",
    "EXEMPTION",
    "REGISTRATION",
    "COMPLIANCE",
    "WITHHOLDING_VAT",
    "TRANSITIONAL"
  ]
});

const POSITIVE_KEYWORDS = Object.freeze([
  "output tax",
  "output vat",
  "vat output",
  "vat on sales",
  "vatable sales",
  "vatable sale",
  "vat computation",
  "compute vat",
  "vat payable",
  "gross selling price",
  "gross receipts",
  "sale of goods",
  "sale of services",
  "invoice requirements",
  "vat invoice",
  "sales invoice",
  "official receipt",
  "advance vat",
  "advance payment",
  "advance billing",
  "billing",
  "tax base",
  "12% vat",
  "twelve percent vat",
  "nirc 106",
  "section 106",
  "sec. 106",
  "nirc 108",
  "section 108",
  "sec. 108",
  "rr 16-2005"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "vat refund",
  "input vat refund",
  "section 112",
  "administrative claim",
  "judicial claim",
  "120-day",
  "30-day",
  "input tax credit",
  "creditable input tax",
  "section 110",
  "zero-rated",
  "zero rated",
  "section 109",
  "vat exempt",
  "registration threshold",
  "withholding vat",
  "5% final withholding vat",
  "transitional input tax"
]);

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s%+().-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
      score += normalizedKeyword.length >= 12 ? 2 : 1;
    }
  }

  return { score, matchedTerms };
}

export function classifyVatOutputTaxQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, POSITIVE_KEYWORDS);
  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score = positive.score - negative.score;

  if (options.priorSubIssue === "OUTPUT_TAX") score += 5;
  if (options.primaryDomain === "VAT") score += 2;
  if (options.primaryIssue === "OUTPUT_TAX" || options.primaryIssue === "VAT_LIABILITY") score += 3;
  if (options.primaryIssue === "VAT_REFUND") score -= 2;

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 20, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/output-tax-engine.js",
    version: VAT_OUTPUT_TAX_ENGINE_VERSION,
    domain: "VAT",
    primaryIssue: "OUTPUT_TAX",
    primarySubIssue: "OUTPUT_TAX",
    matched: score > 0,
    score,
    confidence,
    matchedTerms: positive.matchedTerms,
    diversionTerms: negative.matchedTerms,
    shouldUseThisEngine: score > 0 && confidence >= 0.45
  };
}

export function buildVatOutputTaxRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 10
} = {}) {
  const classification = classifyVatOutputTaxQuery(query, {
    primaryDomain: issueClassification.primaryDomain,
    primaryIssue: issueClassification.primaryIssue,
    priorSubIssue:
      issueClassification.primarySubIssue ||
      issueClassification.subIssue ||
      issueClassification.taxDomainClassification?.primarySubIssue
  });

  const targetAuthorities = sortAuthorityTypes(
    buildTargetAuthorityProfile({
      primaryDomain: "VAT",
      primaryIssue: "OUTPUT_TAX",
      subIssues: ["OUTPUT_TAX"],
      targetAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 106 VAT output tax sale of goods gross selling price",
    "NIRC Section 108 VAT output tax sale of services gross receipts",
    "RR 16-2005 output VAT computation invoice requirements",
    "VAT output tax computation gross selling price gross receipts",
    "VAT invoice requirements advance VAT advance payment",
    ...classification.matchedTerms.map((term) => `VAT output tax computation ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  return {
    engine: "tax-engines/VAT/engines/output-tax-engine.js",
    version: VAT_OUTPUT_TAX_ENGINE_VERSION,
    domain: "VAT",
    primaryIssue: "OUTPUT_TAX",
    primarySubIssue: "OUTPUT_TAX",
    retrievalStrategy: VAT_OUTPUT_TAX_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_OUTPUT_TAX_SUB_ISSUE.legalDimensions,
    targetAuthorities,
    namedTargetAuthorities: VAT_OUTPUT_TAX_SUB_ISSUE.targetAuthorities,
    governingStatutes: [
      "NIRC Sec. 106",
      "NIRC Sec. 108",
      "RR 16-2005"
    ],
    preferredCases: [],
    searchQueries,
    boostTerms: unique([
      "Output VAT",
      "Output Tax",
      "NIRC Sec. 106",
      "NIRC Sec. 108",
      "RR 16-2005",
      "Gross Selling Price",
      "Gross Receipts",
      "Invoice Requirements",
      "Advance VAT",
      "Advance Payment",
      "VAT Computation",
      ...classification.matchedTerms
    ]),
    suppressIssues: VAT_OUTPUT_TAX_SUB_ISSUE.relatedButDifferentIssues,
    classification
  };
}

export function buildVatOutputTaxAnswerRules() {
  return {
    engine: "tax-engines/VAT/engines/output-tax-engine.js",
    version: VAT_OUTPUT_TAX_ENGINE_VERSION,
    requiredStructure: [
      "A. DIRECT ANSWER",
      "B. CONTROLLING LEGAL BASIS",
      "C. SUPPORTING JURISPRUDENCE / ADMINISTRATIVE GUIDANCE",
      "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
      "E. HIERARCHY ANALYSIS",
      "F. PRACTICAL APPLICATION"
    ],
    directAnswerRule:
      "Answer specifically on output VAT computation, timing, invoice requirements, tax base, and VAT treatment of advance billing or advance payment.",
    controllingLegalBasisRule:
      "Use NIRC Sec. 106 for sale of goods/properties, NIRC Sec. 108 for sale of services/use or lease of properties, and RR 16-2005 for implementing rules. Do not use NIRC Sec. 112 as controlling authority unless refund is asked.",
    computationRule:
      "Identify the tax base first: gross selling price for goods/properties or gross receipts for services/lease, subject to the exact facts and retrieved authority.",
    invoicingRule:
      "Where invoicing is involved, identify whether the issue concerns VAT invoice requirements, sales invoice/official receipt transition, timing of recognition, or documentary support.",
    advanceVatRule:
      "Where advance VAT or advance payment is involved, distinguish advance billing, advance collection, deposits, prepayments, and whether VAT is triggered under the applicable VAT timing rule.",
    accountingRule:
      "If accounting treatment is involved, distinguish output VAT liability, sales/revenue recognition, deferred revenue, advance collections, and VAT payable.",
    conflictRule:
      "Do not state 'Conflict detected: YES' unless same-issue, same-legal-dimension, opposite-holding, and hierarchy-resolution metadata are complete.",
    exclusionRule:
      "Do not treat VAT refund, input tax creditability, zero-rating, exemption, registration, withholding VAT, or transitional input tax as the controlling issue unless the query specifically asks those issues."
  };
}

export function enhanceIssueClassificationWithVatOutputTax(issueClassification = {}, query = "") {
  const retrievalPlan = buildVatOutputTaxRetrievalPlan({
    query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
    issueClassification
  });

  return {
    ...issueClassification,
    primaryDomain: "VAT",
    primaryIssue: "OUTPUT_TAX",
    primarySubIssue: "OUTPUT_TAX",
    subIssue: "OUTPUT_TAX",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "VAT_LIABILITY",
      "OUTPUT_TAX"
    ]),
    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "SUBSTANTIVE",
      "COMPLIANCE",
      "ACCOUNTING"
    ]),
    targetAuthorities: retrievalPlan.targetAuthorities,
    retrievalStrategy: retrievalPlan.retrievalStrategy,
    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),
      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      primaryIssue: "OUTPUT_TAX",
      primarySubIssue: "OUTPUT_TAX",
      subIssues: ["OUTPUT_TAX"],
      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      retrievalStrategy: retrievalPlan.retrievalStrategy,
      retrievalHints: {
        domainCode: "VAT",
        domainName: "Value-Added Tax",
        primarySubIssue: "OUTPUT_TAX",
        boostTerms: retrievalPlan.boostTerms,
        preferredAuthorities: retrievalPlan.targetAuthorities
      },
      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/output-tax-engine.js",
        identityEngineCode: "OUTPUT_TAX"
      },
      confidence: retrievalPlan.classification.confidence
    },
    vatOutputTax: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatOutputTaxAnswerRules()
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
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.normalizedReference,
      doc.normalized_reference,
      doc.metadata?.normalizedReference,
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
    "output tax",
    "output vat",
    "vat on sales",
    "gross selling price",
    "gross receipts",
    "invoice requirements",
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

  const authorityType =
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    "UNKNOWN";

  const authorityAllowed = [
    "STATUTE",
    "RR",
    "RMC",
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "CTA_DIVISION"
  ].includes(String(authorityType).toUpperCase());

  const score = positive.score - negative.score + (authorityAllowed ? 2 : 0);

  return {
    relevant: score > 0,
    score,
    authorityAllowed,
    matchedTerms: positive.matchedTerms,
    diversionTerms: negative.matchedTerms,
    authorityType
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
    supportsIssueClassificationEngine: true,
    supportsVatDomainConfig: true,
    supportsRetrievalEngine: true,
    supportsRerankerEngine: true,
    supportsRagAnswerHandler: true,
    supportsAnswerRenderer: true,
    supportsOutputVatComputation: true,
    supportsInvoiceRequirements: true,
    supportsAdvanceVatAnalysis: true,
    avoidsVatRefundMisclassification: true,
    avoidsInputTaxMisclassification: true
  };
}

export default {
  VAT_OUTPUT_TAX_ENGINE_VERSION,
  VAT_OUTPUT_TAX_SUB_ISSUE,
  classifyVatOutputTaxQuery,
  buildVatOutputTaxRetrievalPlan,
  buildVatOutputTaxAnswerRules,
  enhanceIssueClassificationWithVatOutputTax,
  validateVatOutputTaxSource,
  vatOutputTaxEngineHealthCheck
};
