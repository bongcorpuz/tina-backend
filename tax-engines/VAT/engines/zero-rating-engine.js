// FILE: tax-engines/VAT/engines/zero-rating-engine.js
"use strict";

/**
 * TINA VAT Zero-Rating Engine
 * Version: 1.0.0
 *
 * Handles VAT Sub-Issue #3:
 * ZERO-RATING — Cross-border doctrine; effectively zero-rated; PEZA/BOI.
 *
 * Target Authorities:
 * - NIRC Secs. 106(A)(2), 108(B)
 * - CIR v. Toshiba (2006)
 * - CIR v. Seagate (2007)
 * - RMC 50-2007
 * - PEZA Law R.A. 7916
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../../shared/authority-hierarchy.js";

export const VAT_ZERO_RATING_ENGINE_VERSION = "1.0.0";

export const VAT_ZERO_RATING_SUB_ISSUE = Object.freeze({
  code: "ZERO_RATING",
  domain: "VAT",
  title: "Zero-Rating — Cross-Border Doctrine; Effectively Zero-Rated; PEZA/BOI",
  description:
    "Determines whether the query involves VAT zero-rating, export sales, effectively zero-rated transactions, cross-border doctrine, PEZA/BOI transactions, or destination-principle VAT treatment.",
  primaryIssue: "ZERO_RATED_SALES",
  primarySubIssue: "ZERO_RATING",
  controllingAuthorities: ["STATUTE", "RR", "RMC", "SUPREME_COURT"],
  targetAuthorities: [
    "NIRC Sec. 106(A)(2)",
    "NIRC Sec. 108(B)",
    "CIR v. Toshiba (2006)",
    "CIR v. Seagate (2007)",
    "RMC 50-2007",
    "PEZA Law R.A. 7916"
  ],
  preferredAuthorityTypes: ["STATUTE", "RR", "RMC", "SUPREME_COURT"],
  retrievalStrategy: "VAT_ZERO_RATING_CROSS_BORDER_PEZABOI_AUTHORITY_FIRST",
  legalDimensions: ["SUBSTANTIVE", "EVIDENTIARY", "COMPLIANCE"],
  relatedButDifferentIssues: [
    "DEFINITION",
    "REFUND_CREDIT",
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
  "zero-rating",
  "zero rating",
  "zero-rated",
  "zero rated",
  "zero-rated sale",
  "zero-rated sales",
  "effectively zero-rated",
  "effectively zero rated",
  "export sales",
  "export sale",
  "cross-border",
  "cross border",
  "cross-border doctrine",
  "destination principle",
  "foreign currency",
  "foreign currency denominated sale",
  "services to nonresident",
  "nonresident foreign corporation",
  "peza",
  "boi",
  "peza registered",
  "peza enterprise",
  "eco-zone",
  "ecozone",
  "special economic zone",
  "ra 7916",
  "r.a. 7916",
  "peza law",
  "nirc 106",
  "section 106",
  "106(a)(2)",
  "nirc 108",
  "section 108",
  "108(b)",
  "rmc 50-2007",
  "toshiba",
  "seagate"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "define vat",
  "what is vat",
  "nature of vat",
  "section 112",
  "vat refund",
  "input vat refund",
  "120-day",
  "30-day",
  "administrative claim",
  "judicial claim",
  "section 109",
  "vat exempt",
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

export function classifyVatZeroRatingQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, POSITIVE_KEYWORDS);
  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score = positive.score - negative.score;

  if (options.priorSubIssue === "ZERO_RATING") score += 5;
  if (options.primaryDomain === "VAT") score += 2;
  if (options.primaryIssue === "ZERO_RATED_SALES") score += 3;
  if (options.primaryIssue === "VAT_REFUND") score -= 1;

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 20, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/zero-rating-engine.js",
    version: VAT_ZERO_RATING_ENGINE_VERSION,
    domain: "VAT",
    primaryIssue: "ZERO_RATED_SALES",
    primarySubIssue: "ZERO_RATING",
    matched: score > 0,
    score,
    confidence,
    matchedTerms: positive.matchedTerms,
    diversionTerms: negative.matchedTerms,
    shouldUseThisEngine: score > 0 && confidence >= 0.45
  };
}

export function buildVatZeroRatingRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 10
} = {}) {
  const classification = classifyVatZeroRatingQuery(query, {
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
      primaryIssue: "ZERO_RATED_SALES",
      subIssues: ["ZERO_RATING"],
      targetAuthorities: VAT_ZERO_RATING_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 106(A)(2) VAT zero-rated export sales",
    "NIRC Section 108(B) VAT zero-rated services nonresident foreign corporation",
    "VAT zero-rating cross-border doctrine destination principle",
    "effectively zero-rated VAT PEZA BOI",
    "CIR v Toshiba VAT zero-rating",
    "CIR v Seagate VAT zero-rating PEZA",
    "RMC 50-2007 VAT zero-rating PEZA",
    "PEZA Law RA 7916 VAT zero-rating",
    ...classification.matchedTerms.map((term) => `VAT zero-rating ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  return {
    engine: "tax-engines/VAT/engines/zero-rating-engine.js",
    version: VAT_ZERO_RATING_ENGINE_VERSION,
    domain: "VAT",
    primaryIssue: "ZERO_RATED_SALES",
    primarySubIssue: "ZERO_RATING",
    retrievalStrategy: VAT_ZERO_RATING_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_ZERO_RATING_SUB_ISSUE.legalDimensions,
    targetAuthorities,
    namedTargetAuthorities: VAT_ZERO_RATING_SUB_ISSUE.targetAuthorities,
    governingStatutes: [
      "NIRC Sec. 106(A)(2)",
      "NIRC Sec. 108(B)",
      "RR 16-2005",
      "RMC 50-2007",
      "PEZA Law R.A. 7916"
    ],
    preferredCases: [
      "CIR v. Toshiba (2006)",
      "CIR v. Seagate (2007)"
    ],
    searchQueries,
    boostTerms: unique([
      "VAT Zero-Rating",
      "Zero-Rated Sales",
      "Effectively Zero-Rated",
      "Cross-Border Doctrine",
      "Destination Principle",
      "NIRC Sec. 106(A)(2)",
      "NIRC Sec. 108(B)",
      "RR 16-2005",
      "RMC 50-2007",
      "PEZA",
      "BOI",
      "R.A. 7916",
      "Toshiba",
      "Seagate",
      ...classification.matchedTerms
    ]),
    suppressIssues: VAT_ZERO_RATING_SUB_ISSUE.relatedButDifferentIssues,
    classification
  };
}

export function buildVatZeroRatingAnswerRules() {
  return {
    engine: "tax-engines/VAT/engines/zero-rating-engine.js",
    version: VAT_ZERO_RATING_ENGINE_VERSION,
    requiredStructure: [
      "A. DIRECT ANSWER",
      "B. CONTROLLING LEGAL BASIS",
      "C. SUPPORTING JURISPRUDENCE",
      "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
      "E. HIERARCHY ANALYSIS",
      "F. PRACTICAL APPLICATION"
    ],
    directAnswerRule:
      "Answer specifically whether the transaction qualifies for VAT zero-rating or effective zero-rating, subject to the statutory category, buyer status, place of consumption, documentation, and retrieved authorities.",
    controllingLegalBasisRule:
      "Use NIRC Sec. 106(A)(2), NIRC Sec. 108(B), RR 16-2005, RMC 50-2007, and PEZA Law R.A. 7916 where applicable. Do not use NIRC Sec. 112 as the controlling basis unless the query also asks about refund of input VAT.",
    jurisprudenceRule:
      "Use Toshiba and Seagate only where the issue involves zero-rating, cross-border doctrine, destination principle, PEZA/eco-zone status, or effectively zero-rated treatment. Do not use refund-only jurisprudence as controlling authority for zero-rating qualification.",
    evidentiaryRule:
      "Flag missing export documents, foreign-currency payment support, proof of nonresident buyer, PEZA/BOI registration, certificate of entitlement, zero-rated invoices, and relevant contracts as evidence gaps.",
    pezaBoiRule:
      "For PEZA/BOI questions, verify whether the issue is statutory zero-rating, effectively zero-rated local purchase, incentive qualification, or input VAT refund arising from zero-rated sales.",
    conflictRule:
      "Do not state 'Conflict detected: YES' unless same-issue, same-legal-dimension, opposite-holding, and hierarchy-resolution metadata are complete.",
    exclusionRule:
      "Do not treat VAT exemption, VAT refund, registration, or general VAT definition as the controlling issue unless the user query specifically asks those issues."
  };
}

export function enhanceIssueClassificationWithVatZeroRating(issueClassification = {}, query = "") {
  const retrievalPlan = buildVatZeroRatingRetrievalPlan({
    query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
    issueClassification
  });

  return {
    ...issueClassification,
    primaryDomain: "VAT",
    primaryIssue: "ZERO_RATED_SALES",
    primarySubIssue: "ZERO_RATING",
    subIssue: "ZERO_RATING",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "ZERO_RATED_SALES",
      "ZERO_RATING"
    ]),
    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "SUBSTANTIVE",
      "EVIDENTIARY",
      "COMPLIANCE"
    ]),
    targetAuthorities: retrievalPlan.targetAuthorities,
    retrievalStrategy: retrievalPlan.retrievalStrategy,
    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),
      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      primaryIssue: "ZERO_RATED_SALES",
      primarySubIssue: "ZERO_RATING",
      subIssues: ["ZERO_RATING"],
      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      retrievalStrategy: retrievalPlan.retrievalStrategy,
      retrievalHints: {
        domainCode: "VAT",
        domainName: "Value-Added Tax",
        primarySubIssue: "ZERO_RATING",
        boostTerms: retrievalPlan.boostTerms,
        preferredAuthorities: retrievalPlan.targetAuthorities
      },
      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/zero-rating-engine.js",
        identityEngineCode: "ZERO_RATING"
      },
      confidence: retrievalPlan.classification.confidence
    },
    vatZeroRating: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatZeroRatingAnswerRules()
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
    "106(a)(2)",
    "section 106",
    "108(b)",
    "section 108",
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
    "r.a. 7916",
    "ra 7916",
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

export function vatZeroRatingEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_ZERO_RATING_ENGINE",
    version: VAT_ZERO_RATING_ENGINE_VERSION,
    domain: "VAT",
    subIssue: "ZERO_RATING",
    targetAuthorities: VAT_ZERO_RATING_SUB_ISSUE.targetAuthorities,
    supportsIssueClassificationEngine: true,
    supportsVatDomainConfig: true,
    supportsRetrievalEngine: true,
    supportsRerankerEngine: true,
    supportsRagAnswerHandler: true,
    supportsAnswerRenderer: true,
    avoidsVatRefundMisclassification: true,
    supportsCrossBorderDoctrine: true,
    supportsPezaBoiZeroRating: true
  };
}

export default {
  VAT_ZERO_RATING_ENGINE_VERSION,
  VAT_ZERO_RATING_SUB_ISSUE,
  classifyVatZeroRatingQuery,
  buildVatZeroRatingRetrievalPlan,
  buildVatZeroRatingAnswerRules,
  enhanceIssueClassificationWithVatZeroRating,
  validateVatZeroRatingSource,
  vatZeroRatingEngineHealthCheck
};
