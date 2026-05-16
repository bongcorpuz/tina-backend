// FILE: tax-engines/VAT/engines/input-tax-engine.js
"use strict";

/**
 * TINA VAT Input Tax Engine
 * Version: 1.0.0
 *
 * Handles VAT Sub-Issue #4:
 * INPUT TAX — Creditable input tax; substantiation; 70% limit.
 *
 * Target Authorities:
 * - NIRC Sec. 110
 * - RR 16-2005 Sec. 4.110
 * - CIR v. Medicard Philippines (2017)
 * - RMC 42-2003
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../../shared/authority-hierarchy.js";

export const VAT_INPUT_TAX_ENGINE_VERSION = "1.0.0";

export const VAT_INPUT_TAX_SUB_ISSUE = Object.freeze({
  code: "INPUT_TAX",
  domain: "VAT",
  title: "Input Tax — Creditable Input Tax; Substantiation; 70% Limit",
  description:
    "Determines whether the query involves creditable input VAT, input tax substantiation, allocation, amortization, capital goods, or the 70% input tax limit under NIRC Sec. 110 and RR 16-2005 Sec. 4.110.",
  primaryIssue: "INPUT_TAX",
  primarySubIssue: "INPUT_TAX",
  controllingAuthorities: ["STATUTE", "RR", "RMC", "SUPREME_COURT"],
  targetAuthorities: [
    "NIRC Sec. 110",
    "RR 16-2005 Sec. 4.110",
    "CIR v. Medicard Philippines (2017)",
    "RMC 42-2003"
  ],
  preferredAuthorityTypes: ["STATUTE", "RR", "RMC", "SUPREME_COURT"],
  retrievalStrategy: "VAT_INPUT_TAX_CREDITABLE_SUBSTANTIATION_AUTHORITY_FIRST",
  legalDimensions: ["SUBSTANTIVE", "EVIDENTIARY", "COMPLIANCE", "ACCOUNTING"],
  relatedButDifferentIssues: [
    "DEFINITION",
    "REFUND_CREDIT",
    "ZERO_RATING",
    "EXEMPTION",
    "OUTPUT_TAX",
    "REGISTRATION",
    "COMPLIANCE",
    "WITHHOLDING_VAT",
    "TRANSITIONAL"
  ]
});

const POSITIVE_KEYWORDS = Object.freeze([
  "input tax",
  "input vat",
  "creditable input tax",
  "creditable input vat",
  "claim input vat",
  "input tax credit",
  "input vat credit",
  "substantiation",
  "substantiate input vat",
  "support input vat",
  "invoice support",
  "official receipt support",
  "vat invoice",
  "sales invoice",
  "official receipt",
  "70% limit",
  "70 percent limit",
  "seventy percent limit",
  "input tax allocation",
  "allocate input tax",
  "mixed transactions",
  "capital goods",
  "amortization",
  "deferred input tax",
  "nirc 110",
  "section 110",
  "sec. 110",
  "rr 16-2005 sec. 4.110",
  "sec. 4.110",
  "4.110",
  "medicard",
  "medicard philippines",
  "rmc 42-2003"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "section 112",
  "vat refund",
  "input vat refund",
  "administrative claim",
  "judicial claim",
  "120-day",
  "30-day",
  "zero-rated",
  "zero rated",
  "section 109",
  "vat exempt",
  "define vat",
  "what is vat",
  "output vat only",
  "registration threshold",
  "2550q",
  "2550m",
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

export function classifyVatInputTaxQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, POSITIVE_KEYWORDS);
  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score = positive.score - negative.score;

  if (options.priorSubIssue === "INPUT_TAX") score += 5;
  if (options.primaryDomain === "VAT") score += 2;
  if (options.primaryIssue === "INPUT_TAX") score += 3;
  if (options.primaryIssue === "VAT_REFUND") score -= 1;

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 20, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/input-tax-engine.js",
    version: VAT_INPUT_TAX_ENGINE_VERSION,
    domain: "VAT",
    primaryIssue: "INPUT_TAX",
    primarySubIssue: "INPUT_TAX",
    matched: score > 0,
    score,
    confidence,
    matchedTerms: positive.matchedTerms,
    diversionTerms: negative.matchedTerms,
    shouldUseThisEngine: score > 0 && confidence >= 0.45
  };
}

export function buildVatInputTaxRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 10
} = {}) {
  const classification = classifyVatInputTaxQuery(query, {
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
      primaryIssue: "INPUT_TAX",
      subIssues: ["INPUT_TAX"],
      targetAuthorities: VAT_INPUT_TAX_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 110 creditable input tax input VAT",
    "RR 16-2005 Section 4.110 input tax creditable input VAT",
    "VAT input tax substantiation invoice official receipt",
    "VAT input tax 70% limit",
    "VAT input tax allocation mixed transactions capital goods amortization",
    "CIR v Medicard Philippines input VAT substantiation",
    "RMC 42-2003 input VAT substantiation",
    ...classification.matchedTerms.map((term) => `VAT input tax ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  return {
    engine: "tax-engines/VAT/engines/input-tax-engine.js",
    version: VAT_INPUT_TAX_ENGINE_VERSION,
    domain: "VAT",
    primaryIssue: "INPUT_TAX",
    primarySubIssue: "INPUT_TAX",
    retrievalStrategy: VAT_INPUT_TAX_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_INPUT_TAX_SUB_ISSUE.legalDimensions,
    targetAuthorities,
    namedTargetAuthorities: VAT_INPUT_TAX_SUB_ISSUE.targetAuthorities,
    governingStatutes: [
      "NIRC Sec. 110",
      "RR 16-2005 Sec. 4.110",
      "RMC 42-2003"
    ],
    preferredCases: [
      "CIR v. Medicard Philippines (2017)"
    ],
    searchQueries,
    boostTerms: unique([
      "Input VAT",
      "Input Tax",
      "Creditable Input Tax",
      "NIRC Sec. 110",
      "RR 16-2005 Sec. 4.110",
      "Sec. 4.110",
      "70% Limit",
      "Substantiation",
      "Invoice",
      "Official Receipt",
      "Medicard Philippines",
      "RMC 42-2003",
      ...classification.matchedTerms
    ]),
    suppressIssues: VAT_INPUT_TAX_SUB_ISSUE.relatedButDifferentIssues,
    classification
  };
}

export function buildVatInputTaxAnswerRules() {
  return {
    engine: "tax-engines/VAT/engines/input-tax-engine.js",
    version: VAT_INPUT_TAX_ENGINE_VERSION,
    requiredStructure: [
      "A. DIRECT ANSWER",
      "B. CONTROLLING LEGAL BASIS",
      "C. SUPPORTING JURISPRUDENCE",
      "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
      "E. HIERARCHY ANALYSIS",
      "F. PRACTICAL APPLICATION"
    ],
    directAnswerRule:
      "Answer specifically whether the input VAT may be claimed as creditable input tax, subject to statutory conditions, substantiation, allocation, timing, and documentation.",
    controllingLegalBasisRule:
      "Use NIRC Sec. 110 and RR 16-2005 Sec. 4.110 as the controlling authorities. Do not use NIRC Sec. 112 as the controlling basis unless the query asks for refund or tax credit of unutilized input VAT.",
    jurisprudenceRule:
      "Use Medicard only where the issue involves input VAT, substantiation, documentary support, or VAT assessment implications. Do not cite refund-only cases as controlling for ordinary input tax creditability unless the refund issue is present.",
    substantiationRule:
      "Require sales invoices, official receipts, VAT registration status, TIN, tax base, VAT separately indicated where applicable, and linkage to VATable or zero-rated taxable activity.",
    seventyPercentRule:
      "If the query involves the 70% input tax limit, separate the statutory/regulatory rule, computation, excess treatment, and accounting impact.",
    accountingRule:
      "Where accounting treatment is involved, distinguish input VAT asset, expense, deferred input VAT, allocation to exempt sales, and amortization of capital goods.",
    conflictRule:
      "Do not state 'Conflict detected: YES' unless same-issue, same-legal-dimension, opposite-holding, and hierarchy-resolution metadata are complete.",
    exclusionRule:
      "Do not treat VAT refund, zero-rating, exemption, registration, or output VAT computation as the controlling issue unless the user query specifically asks those issues."
  };
}

export function enhanceIssueClassificationWithVatInputTax(issueClassification = {}, query = "") {
  const retrievalPlan = buildVatInputTaxRetrievalPlan({
    query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
    issueClassification
  });

  return {
    ...issueClassification,
    primaryDomain: "VAT",
    primaryIssue: "INPUT_TAX",
    primarySubIssue: "INPUT_TAX",
    subIssue: "INPUT_TAX",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "INPUT_TAX"
    ]),
    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "SUBSTANTIVE",
      "EVIDENTIARY",
      "COMPLIANCE",
      "ACCOUNTING"
    ]),
    targetAuthorities: retrievalPlan.targetAuthorities,
    retrievalStrategy: retrievalPlan.retrievalStrategy,
    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),
      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      primaryIssue: "INPUT_TAX",
      primarySubIssue: "INPUT_TAX",
      subIssues: ["INPUT_TAX"],
      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      retrievalStrategy: retrievalPlan.retrievalStrategy,
      retrievalHints: {
        domainCode: "VAT",
        domainName: "Value-Added Tax",
        primarySubIssue: "INPUT_TAX",
        boostTerms: retrievalPlan.boostTerms,
        preferredAuthorities: retrievalPlan.targetAuthorities
      },
      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/input-tax-engine.js",
        identityEngineCode: "INPUT_TAX"
      },
      confidence: retrievalPlan.classification.confidence
    },
    vatInputTax: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatInputTaxAnswerRules()
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
    "70% limit",
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

export function vatInputTaxEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_INPUT_TAX_ENGINE",
    version: VAT_INPUT_TAX_ENGINE_VERSION,
    domain: "VAT",
    subIssue: "INPUT_TAX",
    targetAuthorities: VAT_INPUT_TAX_SUB_ISSUE.targetAuthorities,
    supportsIssueClassificationEngine: true,
    supportsVatDomainConfig: true,
    supportsRetrievalEngine: true,
    supportsRerankerEngine: true,
    supportsRagAnswerHandler: true,
    supportsAnswerRenderer: true,
    avoidsVatRefundMisclassification: true,
    supportsInputTaxSubstantiation: true,
    supportsSeventyPercentLimit: true
  };
}

export default {
  VAT_INPUT_TAX_ENGINE_VERSION,
  VAT_INPUT_TAX_SUB_ISSUE,
  classifyVatInputTaxQuery,
  buildVatInputTaxRetrievalPlan,
  buildVatInputTaxAnswerRules,
  enhanceIssueClassificationWithVatInputTax,
  validateVatInputTaxSource,
  vatInputTaxEngineHealthCheck
};
