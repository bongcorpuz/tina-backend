// FILE: tax-engines/VAT/engines/exemption-engine.js
"use strict";

/**
 * TINA VAT Exemption Engine
 * Version: 1.0.0
 *
 * Handles VAT Sub-Issue #5:
 * EXEMPTION — Sec. 109 exempt transactions; special law exemptions.
 *
 * Target Authorities:
 * - NIRC Sec. 109
 * - Applicable special laws
 * - BIR Rulings for specific entities
 * - RMC 30-2008
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../../shared/authority-hierarchy.js";

export const VAT_EXEMPTION_ENGINE_VERSION = "1.0.0";

export const VAT_EXEMPTION_SUB_ISSUE = Object.freeze({
  code: "EXEMPTION",
  domain: "VAT",
  title: "Exemption — Section 109 Exempt Transactions; Special Law Exemptions",
  description:
    "Determines whether the query involves VAT-exempt transactions under NIRC Sec. 109, exemption under special laws, or entity-specific BIR rulings.",
  primaryIssue: "VAT_EXEMPTION",
  primarySubIssue: "EXEMPTION",
  controllingAuthorities: ["STATUTE", "RR", "RMC", "BIR_RULING", "SUPREME_COURT"],
  targetAuthorities: [
    "NIRC Sec. 109",
    "Applicable special laws",
    "BIR Rulings for specific entities",
    "RMC 30-2008"
  ],
  preferredAuthorityTypes: ["STATUTE", "RR", "RMC", "BIR_RULING", "SUPREME_COURT"],
  retrievalStrategy: "VAT_EXEMPTION_SECTION_109_SPECIAL_LAW_AUTHORITY_FIRST",
  legalDimensions: ["SUBSTANTIVE", "COMPLIANCE", "EVIDENTIARY"],
  relatedButDifferentIssues: [
    "DEFINITION",
    "REFUND_CREDIT",
    "ZERO_RATING",
    "INPUT_TAX",
    "OUTPUT_TAX",
    "REGISTRATION",
    "COMPLIANCE",
    "WITHHOLDING_VAT",
    "TRANSITIONAL"
  ]
});

const POSITIVE_KEYWORDS = Object.freeze([
  "vat exempt",
  "vat-exempt",
  "exempt from vat",
  "vat exemption",
  "exempt transaction",
  "exempt transactions",
  "section 109",
  "sec. 109",
  "nirc 109",
  "non-vat",
  "non vat",
  "special law exemption",
  "special laws",
  "special law",
  "bir ruling",
  "specific entity",
  "specific entities",
  "rmc 30-2008",
  "medical",
  "educational",
  "religious",
  "charitable",
  "association dues",
  "condominium dues",
  "homeowners association",
  "senior citizen",
  "pwd",
  "cooperative",
  "vat exempt sale"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "zero-rated",
  "zero rated",
  "zero-rating",
  "effectively zero-rated",
  "input vat refund",
  "vat refund",
  "section 112",
  "administrative claim",
  "judicial claim",
  "120-day",
  "30-day",
  "input tax",
  "creditable input tax",
  "output vat",
  "vat registration",
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

export function classifyVatExemptionQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, POSITIVE_KEYWORDS);
  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score = positive.score - negative.score;

  if (options.priorSubIssue === "EXEMPTION") score += 5;
  if (options.primaryDomain === "VAT") score += 2;
  if (options.primaryIssue === "VAT_EXEMPTION") score += 3;
  if (options.primaryIssue === "ZERO_RATED_SALES") score -= 2;
  if (options.primaryIssue === "VAT_REFUND") score -= 2;

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 20, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/exemption-engine.js",
    version: VAT_EXEMPTION_ENGINE_VERSION,
    domain: "VAT",
    primaryIssue: "VAT_EXEMPTION",
    primarySubIssue: "EXEMPTION",
    matched: score > 0,
    score,
    confidence,
    matchedTerms: positive.matchedTerms,
    diversionTerms: negative.matchedTerms,
    shouldUseThisEngine: score > 0 && confidence >= 0.45
  };
}

export function buildVatExemptionRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 10
} = {}) {
  const classification = classifyVatExemptionQuery(query, {
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
      primaryIssue: "VAT_EXEMPTION",
      subIssues: ["EXEMPTION"],
      targetAuthorities: VAT_EXEMPTION_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 109 VAT exempt transactions",
    "VAT exemption Section 109 exempt sale",
    "RR 16-2005 VAT exempt transactions Section 109",
    "RMC 30-2008 VAT exemption",
    "BIR Ruling VAT exemption specific entity",
    "VAT exemption special law",
    "VAT exempt special laws",
    ...classification.matchedTerms.map((term) => `VAT exemption Section 109 ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  return {
    engine: "tax-engines/VAT/engines/exemption-engine.js",
    version: VAT_EXEMPTION_ENGINE_VERSION,
    domain: "VAT",
    primaryIssue: "VAT_EXEMPTION",
    primarySubIssue: "EXEMPTION",
    retrievalStrategy: VAT_EXEMPTION_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_EXEMPTION_SUB_ISSUE.legalDimensions,
    targetAuthorities,
    namedTargetAuthorities: VAT_EXEMPTION_SUB_ISSUE.targetAuthorities,
    governingStatutes: [
      "NIRC Sec. 109",
      "RR 16-2005",
      "RMC 30-2008",
      "Applicable special laws",
      "Applicable BIR rulings for specific entities"
    ],
    preferredCases: [],
    searchQueries,
    boostTerms: unique([
      "VAT Exemption",
      "VAT-Exempt",
      "NIRC Sec. 109",
      "Section 109",
      "RR 16-2005",
      "RMC 30-2008",
      "BIR Ruling",
      "Special Law Exemption",
      "Exempt Transactions",
      ...classification.matchedTerms
    ]),
    suppressIssues: VAT_EXEMPTION_SUB_ISSUE.relatedButDifferentIssues,
    classification
  };
}

export function buildVatExemptionAnswerRules() {
  return {
    engine: "tax-engines/VAT/engines/exemption-engine.js",
    version: VAT_EXEMPTION_ENGINE_VERSION,
    requiredStructure: [
      "A. DIRECT ANSWER",
      "B. CONTROLLING LEGAL BASIS",
      "C. SUPPORTING JURISPRUDENCE / ADMINISTRATIVE GUIDANCE",
      "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
      "E. HIERARCHY ANALYSIS",
      "F. PRACTICAL APPLICATION"
    ],
    directAnswerRule:
      "Answer specifically whether the transaction or entity is VAT-exempt, subject to NIRC Sec. 109, applicable special law, or entity-specific BIR ruling.",
    controllingLegalBasisRule:
      "Use NIRC Sec. 109 as the controlling statutory basis for VAT-exempt transactions. Use special laws only when the entity or transaction falls under that special law. Use BIR rulings only for the specific taxpayer/entity or as limited administrative guidance.",
    specialLawRule:
      "For special law exemptions, identify the exact special law, the covered entity, the covered transaction, and whether the exemption is from VAT specifically or from taxes generally.",
    birRulingRule:
      "Do not generalize entity-specific BIR rulings unless the ruling is clearly applicable to the same entity, transaction, and legal issue. BIR rulings cannot override NIRC, Revenue Regulations, or Supreme Court doctrine.",
    exemptionVsZeroRatingRule:
      "Distinguish VAT exemption from zero-rating. VAT exemption generally means no output VAT and no input VAT credit, while zero-rating may allow input VAT recovery if statutory requirements are met.",
    evidentiaryRule:
      "Flag missing documents such as exemption certificate, BIR ruling, special law basis, registration documents, contracts, invoices, and proof of nature of transaction.",
    conflictRule:
      "Do not state 'Conflict detected: YES' unless same-issue, same-legal-dimension, opposite-holding, and hierarchy-resolution metadata are complete.",
    exclusionRule:
      "Do not treat zero-rating, VAT refund, input tax creditability, registration, or output VAT computation as the controlling issue unless the user query specifically asks those issues."
  };
}

export function enhanceIssueClassificationWithVatExemption(issueClassification = {}, query = "") {
  const retrievalPlan = buildVatExemptionRetrievalPlan({
    query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
    issueClassification
  });

  return {
    ...issueClassification,
    primaryDomain: "VAT",
    primaryIssue: "VAT_EXEMPTION",
    primarySubIssue: "EXEMPTION",
    subIssue: "EXEMPTION",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "VAT_EXEMPTION",
      "EXEMPTION"
    ]),
    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "SUBSTANTIVE",
      "COMPLIANCE",
      "EVIDENTIARY"
    ]),
    targetAuthorities: retrievalPlan.targetAuthorities,
    retrievalStrategy: retrievalPlan.retrievalStrategy,
    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),
      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      primaryIssue: "VAT_EXEMPTION",
      primarySubIssue: "EXEMPTION",
      subIssues: ["EXEMPTION"],
      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      retrievalStrategy: retrievalPlan.retrievalStrategy,
      retrievalHints: {
        domainCode: "VAT",
        domainName: "Value-Added Tax",
        primarySubIssue: "EXEMPTION",
        boostTerms: retrievalPlan.boostTerms,
        preferredAuthorities: retrievalPlan.targetAuthorities
      },
      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/exemption-engine.js",
        identityEngineCode: "EXEMPTION"
      },
      confidence: retrievalPlan.classification.confidence
    },
    vatExemption: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatExemptionAnswerRules()
    }
  };
}

export function validateVatExemptionSource(doc = {}) {
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
    "nirc 109",
    "section 109",
    "sec. 109",
    "vat exempt",
    "vat-exempt",
    "exempt from vat",
    "vat exemption",
    "exempt transaction",
    "special law exemption",
    "special laws",
    "bir ruling",
    "rmc 30-2008",
    "rr 16-2005"
  ]);

  const negative = scoreKeywordSet(haystack, [
    "zero-rated",
    "zero rated",
    "zero-rating",
    "section 112",
    "vat refund",
    "input vat refund",
    "120-day",
    "30-day",
    "input tax",
    "output vat",
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
    "BIR_RULING",
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

export function vatExemptionEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_EXEMPTION_ENGINE",
    version: VAT_EXEMPTION_ENGINE_VERSION,
    domain: "VAT",
    subIssue: "EXEMPTION",
    targetAuthorities: VAT_EXEMPTION_SUB_ISSUE.targetAuthorities,
    supportsIssueClassificationEngine: true,
    supportsVatDomainConfig: true,
    supportsRetrievalEngine: true,
    supportsRerankerEngine: true,
    supportsRagAnswerHandler: true,
    supportsAnswerRenderer: true,
    avoidsZeroRatingMisclassification: true,
    avoidsVatRefundMisclassification: true,
    supportsSpecialLawExemptions: true,
    supportsEntitySpecificBirRulings: true
  };
}

export default {
  VAT_EXEMPTION_ENGINE_VERSION,
  VAT_EXEMPTION_SUB_ISSUE,
  classifyVatExemptionQuery,
  buildVatExemptionRetrievalPlan,
  buildVatExemptionAnswerRules,
  enhanceIssueClassificationWithVatExemption,
  validateVatExemptionSource,
  vatExemptionEngineHealthCheck
};
