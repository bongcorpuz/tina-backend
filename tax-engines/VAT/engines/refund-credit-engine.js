// FILE: tax-engines/VAT/engines/refund-credit-engine.js
"use strict";

/**
 * TINA VAT Refund / Credit Engine
 * Version: 1.0.0
 *
 * Handles VAT Sub-Issue #2:
 * REFUND / CREDIT — Sec. 112 VAT refund; 120-day/30-day rule; administrative claim.
 *
 * Target Authorities:
 * - NIRC Sec. 112
 * - CIR v. San Roque Power (2013)
 * - CIR v. Aichi Forging (2010)
 * - CIR v. Mirant Pagbilao (2014)
 * - CIR v. Pilipinas Total Gas (2015)
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../../shared/authority-hierarchy.js";

export const VAT_REFUND_CREDIT_ENGINE_VERSION = "1.0.0";

export const VAT_REFUND_CREDIT_SUB_ISSUE = Object.freeze({
  code: "REFUND_CREDIT",
  domain: "VAT",
  title: "Refund / Credit — Section 112 VAT Refund; 120-day/30-day Rule; Administrative Claim",
  description:
    "Determines whether the query involves VAT refund, input VAT tax credit, administrative claim, judicial claim, prescriptive periods, or the 120-day/30-day rule under NIRC Sec. 112.",
  primaryIssue: "VAT_REFUND",
  primarySubIssue: "REFUND_CREDIT",
  controllingAuthorities: ["STATUTE", "RR", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],
  targetAuthorities: [
    "NIRC Sec. 112",
    "CIR v. San Roque Power (2013)",
    "CIR v. Aichi Forging (2010)",
    "CIR v. Mirant Pagbilao (2014)",
    "CIR v. Pilipinas Total Gas (2015)"
  ],
  preferredAuthorityTypes: ["STATUTE", "RR", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],
  retrievalStrategy: "VAT_REFUND_CREDIT_SECTION_112_PROCEDURAL_JURISPRUDENCE_FIRST",
  legalDimensions: ["PROCEDURAL", "EVIDENTIARY", "JURISDICTIONAL"],
  relatedButDifferentIssues: [
    "DEFINITION",
    "ZERO_RATING",
    "INPUT_TAX",
    "EXEMPTION",
    "OUTPUT_TAX",
    "REGISTRATION",
    "COMPLIANCE",
    "WITHHOLDING_VAT",
    "TRANSITIONAL"
  ]
});

const POSITIVE_KEYWORDS = Object.freeze([
  "vat refund",
  "input vat refund",
  "refund of input vat",
  "claim for refund",
  "tax credit",
  "tax credit certificate",
  "tcc",
  "unutilized input vat",
  "unused input vat",
  "excess input vat",
  "section 112",
  "sec. 112",
  "nirc 112",
  "administrative claim",
  "judicial claim",
  "120-day",
  "120 day",
  "30-day",
  "30 day",
  "120+30",
  "two-year prescriptive period",
  "prescriptive period",
  "san roque",
  "aichi",
  "mirant",
  "pagbilao",
  "pilipinas total gas",
  "total gas"
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
  "2550q",
  "withholding vat",
  "5% final withholding vat",
  "transitional input tax",
  "section 109",
  "vat exempt"
]);

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s%+.-]/g, " ")
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

export function classifyVatRefundCreditQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, POSITIVE_KEYWORDS);
  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score = positive.score - negative.score;

  if (options.priorSubIssue === "REFUND_CREDIT") score += 5;
  if (options.primaryDomain === "VAT") score += 2;
  if (options.primaryIssue === "VAT_REFUND") score += 3;
  if (options.primaryIssue === "VAT_LIABILITY") score -= 2;

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 20, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/refund-credit-engine.js",
    version: VAT_REFUND_CREDIT_ENGINE_VERSION,
    domain: "VAT",
    primaryIssue: "VAT_REFUND",
    primarySubIssue: "REFUND_CREDIT",
    matched: score > 0,
    score,
    confidence,
    matchedTerms: positive.matchedTerms,
    diversionTerms: negative.matchedTerms,
    shouldUseThisEngine: score > 0 && confidence >= 0.45
  };
}

export function buildVatRefundCreditRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 10
} = {}) {
  const classification = classifyVatRefundCreditQuery(query, {
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
      primaryIssue: "VAT_REFUND",
      subIssues: ["REFUND_CREDIT"],
      targetAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 112 VAT refund administrative claim judicial claim",
    "NIRC Sec. 112 input VAT refund tax credit certificate",
    "VAT refund 120-day 30-day rule Section 112",
    "CIR v San Roque Power VAT refund 120 30 rule",
    "CIR v Aichi Forging VAT refund 120 day rule",
    "CIR v Mirant Pagbilao VAT refund",
    "CIR v Pilipinas Total Gas VAT refund",
    ...classification.matchedTerms.map((term) => `VAT refund credit Section 112 ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  return {
    engine: "tax-engines/VAT/engines/refund-credit-engine.js",
    version: VAT_REFUND_CREDIT_ENGINE_VERSION,
    domain: "VAT",
    primaryIssue: "VAT_REFUND",
    primarySubIssue: "REFUND_CREDIT",
    retrievalStrategy: VAT_REFUND_CREDIT_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_REFUND_CREDIT_SUB_ISSUE.legalDimensions,
    targetAuthorities,
    namedTargetAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.targetAuthorities,
    governingStatutes: ["NIRC Sec. 112", "RR 16-2005"],
    preferredCases: [
      "CIR v. San Roque Power (2013)",
      "CIR v. Aichi Forging (2010)",
      "CIR v. Mirant Pagbilao (2014)",
      "CIR v. Pilipinas Total Gas (2015)"
    ],
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
      "Tax Credit Certificate",
      "San Roque Power",
      "Aichi Forging",
      "Mirant Pagbilao",
      "Pilipinas Total Gas",
      ...classification.matchedTerms
    ]),
    suppressIssues: VAT_REFUND_CREDIT_SUB_ISSUE.relatedButDifferentIssues,
    classification
  };
}

export function buildVatRefundCreditAnswerRules() {
  return {
    engine: "tax-engines/VAT/engines/refund-credit-engine.js",
    version: VAT_REFUND_CREDIT_ENGINE_VERSION,
    requiredStructure: [
      "A. DIRECT ANSWER",
      "B. CONTROLLING LEGAL BASIS",
      "C. SUPPORTING JURISPRUDENCE",
      "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
      "E. HIERARCHY ANALYSIS",
      "F. PRACTICAL APPLICATION"
    ],
    directAnswerRule:
      "Answer specifically on whether the VAT refund or tax credit claim is allowable, timely, and procedurally compliant, subject to retrieved facts and evidence.",
    controllingLegalBasisRule:
      "Use NIRC Sec. 112 as the controlling statutory basis. Do not use NIRC Secs. 105-108 as the primary basis unless explaining general VAT framework only.",
    jurisprudenceRule:
      "Prioritize San Roque, Aichi, Mirant Pagbilao, and Pilipinas Total Gas only when the issue is VAT refund, Section 112, administrative claim, judicial claim, or timing. Do not cite them as controlling authorities for a pure VAT definition question.",
    proceduralRule:
      "Separate the administrative claim, judicial claim, 120-day period, 30-day period, and two-year prescriptive period where applicable.",
    evidentiaryRule:
      "Flag missing invoices, official receipts, zero-rating documents, input VAT schedules, sales declarations, and proof of filing/payment as evidence gaps.",
    conflictRule:
      "Do not state 'Conflict detected: YES' unless same-issue, same-legal-dimension, opposite-holding, and hierarchy-resolution metadata are complete.",
    exclusionRule:
      "Do not treat exemption, registration, output VAT computation, or general VAT definition as the controlling issue unless the user query specifically asks those issues."
  };
}

export function enhanceIssueClassificationWithVatRefundCredit(issueClassification = {}, query = "") {
  const retrievalPlan = buildVatRefundCreditRetrievalPlan({
    query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
    issueClassification
  });

  return {
    ...issueClassification,
    primaryDomain: "VAT",
    primaryIssue: "VAT_REFUND",
    primarySubIssue: "REFUND_CREDIT",
    subIssue: "REFUND_CREDIT",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "VAT_REFUND",
      "REFUND_CREDIT"
    ]),
    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "PROCEDURAL",
      "EVIDENTIARY",
      "JURISDICTIONAL"
    ]),
    targetAuthorities: retrievalPlan.targetAuthorities,
    retrievalStrategy: retrievalPlan.retrievalStrategy,
    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),
      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      primaryIssue: "VAT_REFUND",
      primarySubIssue: "REFUND_CREDIT",
      subIssues: ["REFUND_CREDIT"],
      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      retrievalStrategy: retrievalPlan.retrievalStrategy,
      retrievalHints: {
        domainCode: "VAT",
        domainName: "Value-Added Tax",
        primarySubIssue: "REFUND_CREDIT",
        boostTerms: retrievalPlan.boostTerms,
        preferredAuthorities: retrievalPlan.targetAuthorities
      },
      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/refund-credit-engine.js",
        identityEngineCode: "REFUND_CREDIT"
      },
      confidence: retrievalPlan.classification.confidence
    },
    vatRefundCredit: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatRefundCreditAnswerRules()
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
    "nirc 112",
    "section 112",
    "sec. 112",
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
    "total gas"
  ]);

  const negative = scoreKeywordSet(haystack, [
    "section 105",
    "section 106",
    "section 107",
    "section 108",
    "define vat",
    "nature of vat",
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
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "CTA_DIVISION",
    "RMC"
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

export function vatRefundCreditEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_REFUND_CREDIT_ENGINE",
    version: VAT_REFUND_CREDIT_ENGINE_VERSION,
    domain: "VAT",
    subIssue: "REFUND_CREDIT",
    targetAuthorities: VAT_REFUND_CREDIT_SUB_ISSUE.targetAuthorities,
    supportsIssueClassificationEngine: true,
    supportsVatDomainConfig: true,
    supportsRetrievalEngine: true,
    supportsRerankerEngine: true,
    supportsRagAnswerHandler: true,
    supportsAnswerRenderer: true,
    avoidsVatDefinitionMisclassification: true,
    supportsSection112ProceduralAnalysis: true
  };
}

export default {
  VAT_REFUND_CREDIT_ENGINE_VERSION,
  VAT_REFUND_CREDIT_SUB_ISSUE,
  classifyVatRefundCreditQuery,
  buildVatRefundCreditRetrievalPlan,
  buildVatRefundCreditAnswerRules,
  enhanceIssueClassificationWithVatRefundCredit,
  validateVatRefundCreditSource,
  vatRefundCreditEngineHealthCheck
};
