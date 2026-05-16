// FILE: tax-engines/VAT/engines/definition-engine.js
"use strict";

/**
 * TINA VAT Definition Engine
 * Version: 1.0.0
 *
 * Handles VAT Sub-Issue #1:
 * DEFINITION — Nature and scope of VAT; taxable transactions.
 *
 * Target Authorities:
 * - NIRC Secs. 105-108
 * - RR 16-2005
 * - CIR v. Seagate Technology (2007)
 * - CIR v. Aichi Forging (2010)
 * - CIR v. Toshiba (2006)
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../../shared/authority-hierarchy.js";

export const VAT_DEFINITION_ENGINE_VERSION = "1.0.0";

export const VAT_DEFINITION_SUB_ISSUE = Object.freeze({
  code: "DEFINITION",
  domain: "VAT",
  title: "Definition — Nature and Scope of VAT; Taxable Transactions",
  description:
    "Determines whether the query asks about the nature, scope, definition, taxable transactions, and basic VAT liability framework under Philippine VAT law.",
  primaryIssue: "VAT_LIABILITY",
  primarySubIssue: "DEFINITION",
  controllingAuthorities: ["STATUTE", "RR", "SUPREME_COURT"],
  targetAuthorities: [
    "NIRC Secs. 105-108",
    "RR 16-2005",
    "CIR v. Seagate Technology (2007)",
    "CIR v. Aichi Forging (2010)",
    "CIR v. Toshiba (2006)"
  ],
  preferredAuthorityTypes: ["STATUTE", "RR", "SUPREME_COURT"],
  retrievalStrategy: "VAT_DEFINITION_FOUNDATIONAL_AUTHORITY_FIRST",
  legalDimensions: ["SUBSTANTIVE"],
  relatedButDifferentIssues: [
    "VAT_REFUND",
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
  "what is vat",
  "define vat",
  "definition of vat",
  "meaning of vat",
  "nature of vat",
  "scope of vat",
  "value-added tax",
  "value added tax",
  "taxable transaction",
  "taxable transactions",
  "subject to vat",
  "vatable transaction",
  "vatable sale",
  "sale of goods",
  "sale of services",
  "importation",
  "course of trade",
  "course of business",
  "nirc 105",
  "section 105",
  "nirc 106",
  "section 106",
  "nirc 107",
  "section 107",
  "nirc 108",
  "section 108",
  "rr 16-2005",
  "revenue regulations 16-2005",
  "seagate",
  "aichi",
  "toshiba"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "refund",
  "tax credit certificate",
  "tcc",
  "section 112",
  "120-day",
  "120 day",
  "30-day",
  "30 day",
  "administrative claim",
  "judicial claim",
  "unutilized input vat",
  "excess input vat",
  "vat exempt",
  "section 109",
  "zero-rated",
  "zero rated",
  "input tax allocation",
  "transitional input tax",
  "2550q",
  "2550m",
  "withholding vat",
  "5% final withholding vat"
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

export function classifyVatDefinitionQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, POSITIVE_KEYWORDS);
  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score = positive.score - negative.score;

  if (options.priorSubIssue === "DEFINITION") score += 5;
  if (options.primaryDomain === "VAT") score += 2;
  if (options.primaryIssue === "VAT_LIABILITY") score += 2;

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 20, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/definition-engine.js",
    version: VAT_DEFINITION_ENGINE_VERSION,
    domain: "VAT",
    primaryIssue: "VAT_LIABILITY",
    primarySubIssue: "DEFINITION",
    matched: score > 0,
    score,
    confidence,
    matchedTerms: positive.matchedTerms,
    diversionTerms: negative.matchedTerms,
    shouldUseThisEngine: score > 0 && confidence >= 0.45
  };
}

export function buildVatDefinitionRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 8
} = {}) {
  const classification = classifyVatDefinitionQuery(query, {
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
      primaryIssue: "VAT_LIABILITY",
      subIssues: ["DEFINITION"],
      targetAuthorities: VAT_DEFINITION_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 105 value-added tax nature of VAT",
    "NIRC Sections 105 106 107 108 VAT taxable transactions",
    "RR 16-2005 VAT definition taxable transactions",
    "CIR v Seagate Technology VAT nature scope",
    "CIR v Aichi Forging VAT",
    "CIR v Toshiba VAT",
    ...classification.matchedTerms.map((term) => `VAT definition ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  return {
    engine: "tax-engines/VAT/engines/definition-engine.js",
    version: VAT_DEFINITION_ENGINE_VERSION,
    domain: "VAT",
    primaryIssue: "VAT_LIABILITY",
    primarySubIssue: "DEFINITION",
    retrievalStrategy: VAT_DEFINITION_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_DEFINITION_SUB_ISSUE.legalDimensions,
    targetAuthorities,
    namedTargetAuthorities: VAT_DEFINITION_SUB_ISSUE.targetAuthorities,
    governingStatutes: ["NIRC Secs. 105-108", "RR 16-2005"],
    preferredCases: [
      "CIR v. Seagate Technology (2007)",
      "CIR v. Aichi Forging (2010)",
      "CIR v. Toshiba (2006)"
    ],
    searchQueries,
    boostTerms: unique([
      "VAT",
      "Value-Added Tax",
      "NIRC Sec. 105",
      "NIRC Sec. 106",
      "NIRC Sec. 107",
      "NIRC Sec. 108",
      "RR 16-2005",
      "Seagate Technology",
      "Aichi Forging",
      "Toshiba",
      ...classification.matchedTerms
    ]),
    suppressIssues: VAT_DEFINITION_SUB_ISSUE.relatedButDifferentIssues,
    classification
  };
}

export function buildVatDefinitionAnswerRules() {
  return {
    engine: "tax-engines/VAT/engines/definition-engine.js",
    version: VAT_DEFINITION_ENGINE_VERSION,
    requiredStructure: [
      "A. DIRECT ANSWER",
      "B. CONTROLLING LEGAL BASIS",
      "C. SUPPORTING JURISPRUDENCE",
      "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
      "E. HIERARCHY ANALYSIS",
      "F. PRACTICAL APPLICATION"
    ],
    directAnswerRule:
      "Define VAT as a tax on value added imposed on sale, barter, exchange, lease of goods or properties, sale or exchange of services, and importation, subject to the exact retrieved authority.",
    controllingLegalBasisRule:
      "Prioritize NIRC Secs. 105-108 and RR 16-2005. Do not use VAT refund provisions under Sec. 112 as the controlling basis for a pure VAT definition question.",
    jurisprudenceRule:
      "Use only jurisprudence relevant to VAT nature, scope, taxable transactions, VAT system, or foundational VAT doctrine. Do not cite refund-only cases unless they expressly discuss the nature of VAT.",
    conflictRule:
      "Do not state 'Conflict detected: YES' unless same-issue, same-legal-dimension, opposite-holding, and hierarchy-resolution metadata are complete.",
    exclusionRule:
      "Do not treat refund, input-tax substantiation, zero-rating, exemption, registration, or filing issues as controlling unless the user query specifically asks those issues."
  };
}

export function enhanceIssueClassificationWithVatDefinition(issueClassification = {}, query = "") {
  const retrievalPlan = buildVatDefinitionRetrievalPlan({
    query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
    issueClassification
  });

  return {
    ...issueClassification,
    primaryDomain: "VAT",
    primaryIssue: "VAT_LIABILITY",
    primarySubIssue: "DEFINITION",
    subIssue: "DEFINITION",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "VAT_LIABILITY",
      "DEFINITION"
    ]),
    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "SUBSTANTIVE"
    ]),
    targetAuthorities: retrievalPlan.targetAuthorities,
    retrievalStrategy: retrievalPlan.retrievalStrategy,
    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),
      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      primaryIssue: "VAT_LIABILITY",
      primarySubIssue: "DEFINITION",
      subIssues: ["DEFINITION"],
      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      retrievalStrategy: retrievalPlan.retrievalStrategy,
      retrievalHints: {
        domainCode: "VAT",
        domainName: "Value-Added Tax",
        primarySubIssue: "DEFINITION",
        boostTerms: retrievalPlan.boostTerms,
        preferredAuthorities: retrievalPlan.targetAuthorities
      },
      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/definition-engine.js",
        identityEngineCode: "DEFINITION"
      },
      confidence: retrievalPlan.classification.confidence
    },
    vatDefinition: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatDefinitionAnswerRules()
    }
  };
}

export function validateVatDefinitionSource(doc = {}) {
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
    "nirc 105",
    "section 105",
    "nirc 106",
    "section 106",
    "nirc 107",
    "section 107",
    "nirc 108",
    "section 108",
    "rr 16-2005",
    "seagate",
    "aichi",
    "toshiba",
    "value-added tax",
    "value added tax",
    "sale of goods",
    "sale of services",
    "importation"
  ]);

  const negative = scoreKeywordSet(haystack, NEGATIVE_OR_DIVERSION_KEYWORDS);

  const authorityType =
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    "UNKNOWN";

  const authorityAllowed = ["STATUTE", "RR", "SUPREME_COURT", "RMC"].includes(
    String(authorityType).toUpperCase()
  );

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

export function vatDefinitionEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_DEFINITION_ENGINE",
    version: VAT_DEFINITION_ENGINE_VERSION,
    domain: "VAT",
    subIssue: "DEFINITION",
    targetAuthorities: VAT_DEFINITION_SUB_ISSUE.targetAuthorities,
    supportsIssueClassificationEngine: true,
    supportsVatDomainConfig: true,
    supportsRetrievalEngine: true,
    supportsRerankerEngine: true,
    supportsRagAnswerHandler: true,
    supportsAnswerRenderer: true,
    avoidsVatRefundMisclassification: true
  };
}

export default {
  VAT_DEFINITION_ENGINE_VERSION,
  VAT_DEFINITION_SUB_ISSUE,
  classifyVatDefinitionQuery,
  buildVatDefinitionRetrievalPlan,
  buildVatDefinitionAnswerRules,
  enhanceIssueClassificationWithVatDefinition,
  validateVatDefinitionSource,
  vatDefinitionEngineHealthCheck
};
