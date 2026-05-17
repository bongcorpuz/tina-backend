// FILE: tax-engines/VAT/engines/definition-engine.js
"use strict";

/**
 * TINA VAT Definition Engine
 * Version: 2.0.0
 *
 * Handles VAT Sub-Issue:
 * DEFINITION — Nature and scope of VAT; taxable transactions.
 *
 * Boundary:
 * - Does not call OpenAI
 * - Does not retrieve sources directly
 * - Does not generate final answers
 * - Does not duplicate retrieval-engine.js or rag-answer-handler.js
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../../shared/authority-hierarchy.js";

export const VAT_DEFINITION_ENGINE_VERSION = "2.0.0";

export const VAT_DEFINITION_PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS",
  "06_COURT_CASES"
]);

export const VAT_DEFINITION_EXCLUDED_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

export const VAT_DEFINITION_AUTHORITY_HIERARCHY = Object.freeze([
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

export const VAT_DEFINITION_SUB_ISSUE = Object.freeze({
  code: "DEFINITION",
  subIssue: "DEFINITION",
  domain: "VAT",
  domainCode: "VAT",
  domainName: "Value-Added Tax",
  title: "Definition — Nature and Scope of VAT; Taxable Transactions",
  description:
    "Reusable VAT definition sub-issue engine for VAT nature, scope, taxable transactions, persons liable, sale of goods, sale of services, importation, indirect tax characterization, destination principle, and VAT business concept.",

  primaryIssue: "VAT",
  legacyPrimaryIssue: "VAT_LIABILITY",
  primarySubIssue: "DEFINITION",

  retrievalStrategy: "VAT_DEFINITION_AUTHORITY_FIRST",

  targetAuthorities: [
    "NIRC Sec. 105",
    "NIRC Sec. 106",
    "NIRC Sec. 107",
    "NIRC Sec. 108",
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
    "Relevant RR 16-2005 provisions",
    "Applicable RMCs if relevant"
  ],

  supportingJurisprudence: [
    "CIR v. Seagate Technology",
    "CIR v. Aichi Forging",
    "CIR v. Toshiba"
  ],

  preferredAuthorityTypes: [
    "STATUTE",
    "RR",
    "RMC",
    "SUPREME_COURT"
  ],

  priorityFolders: VAT_DEFINITION_PRIORITY_FOLDERS,
  excludedFolders: VAT_DEFINITION_EXCLUDED_FOLDERS,
  authorityHierarchy: VAT_DEFINITION_AUTHORITY_HIERARCHY,

  legalDimensions: [
    "SUBSTANTIVE"
  ],

  legalConcepts: [
    "VAT nature and scope",
    "taxable transactions",
    "persons liable to VAT",
    "sale of goods",
    "sale of services",
    "lease of properties",
    "importation",
    "gross sales",
    "gross receipts",
    "indirect tax",
    "destination principle",
    "cross-border doctrine",
    "VAT business test",
    "VAT taxable transaction characterization"
  ],

  tpmProfile: "LIGHT",
  sourceGroundingRequired: true,
  doctrinallySensitive: true,
  conflictSensitive: false,
  litigationSensitive: false,
  auditRiskSensitive: false,

  relatedButDifferentIssues: [
    "REFUND_CREDIT",
    "VAT_REFUND",
    "ZERO_RATING",
    "INPUT_TAX",
    "EXEMPTION",
    "OUTPUT_TAX",
    "REGISTRATION",
    "COMPLIANCE",
    "WITHHOLDING_VAT",
    "TRANSITIONAL_INPUT_TAX",
    "DEEMED_SALE"
  ]
});

export const VAT_DEFINITION_KEYWORDS = Object.freeze([
  "vat",
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
  "persons liable to vat",
  "sale of goods",
  "sale of services",
  "lease of properties",
  "importation",
  "course of trade",
  "course of business",
  "gross sales",
  "gross receipts",
  "indirect tax",
  "destination principle",
  "cross-border doctrine",
  "vat business concept",
  "business test",
  "nirc 105",
  "section 105",
  "nirc sec. 105",
  "nirc 106",
  "section 106",
  "nirc sec. 106",
  "nirc 107",
  "section 107",
  "nirc sec. 107",
  "nirc 108",
  "section 108",
  "nirc sec. 108",
  "rr 16-2005",
  "revenue regulations 16-2005",
  "seagate",
  "aichi",
  "toshiba"
]);

export const VAT_DEFINITION_ALIASES = Object.freeze([
  "VAT_DEFINITION",
  "NATURE_SCOPE",
  "FOUNDATIONAL_VAT",
  "VAT_NATURE",
  "VAT_SCOPE",
  "VAT_TAXABLE_TRANSACTION",
  "VAT_BUSINESS_CONCEPT",
  "VALUE_ADDED_TAX_DEFINITION"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "refund",
  "tax credit certificate",
  "tcc",
  "section 112",
  "sec. 112",
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
  "sec. 109",
  "zero-rated",
  "zero rated",
  "input tax allocation",
  "transitional input tax",
  "deemed sale",
  "2550q",
  "2550m",
  "withholding vat",
  "5% final withholding vat"
]);

export const VAT_DEFINITION_ANSWER_STRUCTURE = Object.freeze({
  SIMPLE_DEFINITION: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. PRACTICAL NOTE"
  ],
  LEGAL_ANALYSIS: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUPPORTING RULES",
    "D. SUPPORTING JURISPRUDENCE",
    "E. DOCTRINAL STATUS",
    "F. PRACTICAL APPLICATION"
  ]
});

export const VAT_DEFINITION_DOCTRINAL_METADATA = Object.freeze({
  doctrines: [
    {
      code: "DESTINATION_PRINCIPLE",
      label: "Destination Principle",
      description:
        "VAT generally follows the destination principle where consumption is taxed in the jurisdiction of destination, subject to statutory and regulatory requirements."
    },
    {
      code: "CROSS_BORDER_DOCTRINE",
      label: "Cross-Border Doctrine",
      description:
        "Relevant only when the VAT definition question involves cross-border or zero-rating context; not a substitute for a zero-rating analysis."
    },
    {
      code: "INDIRECT_TAX_CHARACTERIZATION",
      label: "VAT as Indirect Tax",
      description:
        "VAT is imposed on the seller/person liable but may be shifted to the buyer as part of the price, subject to the applicable VAT rules."
    },
    {
      code: "VAT_BUSINESS_CONCEPT",
      label: "VAT Business Concept",
      description:
        "VAT attaches to transactions made in the course of trade or business, including regular conduct or pursuit of commercial or economic activity."
    },
    {
      code: "TAXABLE_TRANSACTION_CHARACTERIZATION",
      label: "VAT Taxable Transaction Characterization",
      description:
        "Definition analysis may identify whether the transaction is sale of goods, sale of services, lease of properties, or importation."
    }
  ],
  conflictRule:
    "Do not mark conflict automatically. Conflict metadata is valid only if the same exact issue, same legal dimension, opposite rule or holding, hierarchy analysis, and conflict-resolution basis are present.",
  automaticConflictDetection: false
});

export const VAT_DEFINITION_FACT_PATTERN_METADATA = Object.freeze({
  supportsFactPatternRouting: true,
  doesNotPerformFullFactPatternAnalysis: true,
  usableFor: [
    "transaction characterization",
    "economic substance analysis",
    "principal vs agent analysis",
    "gross vs net revenue analysis",
    "VAT leakage analysis",
    "bundled transaction analysis"
  ],
  requiredFactInputs: [
    "identity of seller/service provider",
    "nature of transaction",
    "whether transaction is in the course of trade or business",
    "gross selling price or gross receipts",
    "whether there is importation",
    "contractual role of parties",
    "whether amount is principal revenue or pass-through/reimbursement"
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

export function getVatDefinitionConfig() {
  return {
    engine: "tax-engines/VAT/engines/definition-engine.js",
    version: VAT_DEFINITION_ENGINE_VERSION,
    ...VAT_DEFINITION_SUB_ISSUE,
    keywords: VAT_DEFINITION_KEYWORDS,
    aliases: VAT_DEFINITION_ALIASES,
    answerStructure: VAT_DEFINITION_ANSWER_STRUCTURE,
    doctrinalMetadata: VAT_DEFINITION_DOCTRINAL_METADATA,
    factPatternMetadata: VAT_DEFINITION_FACT_PATTERN_METADATA,
    retrievalHints: {
      domainCode: "VAT",
      domainName: "Value-Added Tax",
      subIssue: "DEFINITION",
      retrievalStrategy: VAT_DEFINITION_SUB_ISSUE.retrievalStrategy,
      targetAuthorities: VAT_DEFINITION_SUB_ISSUE.targetAuthorities,
      controllingAuthorities: VAT_DEFINITION_SUB_ISSUE.controllingAuthorities,
      supportingAuthorities: VAT_DEFINITION_SUB_ISSUE.supportingAuthorities,
      supportingJurisprudence: VAT_DEFINITION_SUB_ISSUE.supportingJurisprudence,
      priorityFolders: VAT_DEFINITION_PRIORITY_FOLDERS,
      excludedFolders: VAT_DEFINITION_EXCLUDED_FOLDERS,
      preserveControllingAuthorities: true,
      preserveTargetAuthorityMatches: true,
      preserveIssueClassificationMatches: true,
      sourceGroundingRequired: true,
      compactSourcesOnly: true
    }
  };
}

export function getVatDefinitionAuthorities() {
  return {
    targetAuthorities: VAT_DEFINITION_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_DEFINITION_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_DEFINITION_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_DEFINITION_SUB_ISSUE.supportingJurisprudence,
    preferredAuthorityTypes: VAT_DEFINITION_SUB_ISSUE.preferredAuthorityTypes,
    authorityHierarchy: VAT_DEFINITION_AUTHORITY_HIERARCHY,
    priorityFolders: VAT_DEFINITION_PRIORITY_FOLDERS,
    excludedFolders: VAT_DEFINITION_EXCLUDED_FOLDERS
  };
}

export function getVatDefinitionKeywords() {
  return {
    keywords: VAT_DEFINITION_KEYWORDS,
    aliases: VAT_DEFINITION_ALIASES,
    diversionKeywords: NEGATIVE_OR_DIVERSION_KEYWORDS
  };
}

export function normalizeVatDefinitionConcept(value = "") {
  const normalized = normalizeCode(value);

  const aliases = {
    VAT_DEFINITION: "DEFINITION",
    NATURE_SCOPE: "DEFINITION",
    FOUNDATIONAL_VAT: "DEFINITION",
    VAT_NATURE: "DEFINITION",
    VAT_SCOPE: "DEFINITION",
    VAT_TAXABLE_TRANSACTION: "DEFINITION",
    VALUE_ADDED_TAX_DEFINITION: "DEFINITION",
    BUSINESS_CONCEPT: "VAT_BUSINESS_CONCEPT",
    INDIRECT_TAX: "INDIRECT_TAX_CHARACTERIZATION",
    DESTINATION: "DESTINATION_PRINCIPLE",
    DESTINATION_PRINCIPLE: "DESTINATION_PRINCIPLE",
    CROSS_BORDER: "CROSS_BORDER_DOCTRINE",
    CROSS_BORDER_DOCTRINE: "CROSS_BORDER_DOCTRINE"
  };

  return aliases[normalized] || normalized || "DEFINITION";
}

export function matchVatDefinitionQuery(query = "", options = {}) {
  return classifyVatDefinitionQuery(query, options);
}

export function classifyVatDefinitionQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, [
    ...VAT_DEFINITION_KEYWORDS,
    ...VAT_DEFINITION_ALIASES
  ]);

  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);

  let score = positive.score - negative.score;

  const priorSubIssue = normalizeCode(options.priorSubIssue || "");
  const primaryDomain = normalizeCode(options.primaryDomain || options.domainCode || "");
  const primaryIssue = normalizeCode(options.primaryIssue || "");

  if (priorSubIssue === "DEFINITION") score += 6;
  if (primaryDomain === "VAT") score += 3;
  if (primaryIssue === "VAT" || primaryIssue === "VAT_LIABILITY") score += 2;

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 24, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/definition-engine.js",
    version: VAT_DEFINITION_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "VAT_LIABILITY",
    primarySubIssue: "DEFINITION",
    subIssue: "DEFINITION",

    matched: score > 0,
    score,
    confidence,

    matchedTerms: positive.matchedTerms,
    diversionTerms: negative.matchedTerms,

    shouldUseThisEngine: score > 0 && confidence >= 0.45,
    fallbackClassificationUsed: score <= 0,

    retrievalStrategy: VAT_DEFINITION_SUB_ISSUE.retrievalStrategy,
    targetAuthorities: VAT_DEFINITION_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_DEFINITION_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_DEFINITION_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_DEFINITION_SUB_ISSUE.supportingJurisprudence,
    sourceGroundingRequired: true
  };
}

export function buildVatDefinitionRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 8,
  reviewMode = false
} = {}) {
  const classification = classifyVatDefinitionQuery(query, {
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
      subIssues: ["DEFINITION"],
      targetAuthorities: VAT_DEFINITION_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 105 value-added tax nature of VAT",
    "NIRC Section 106 VAT sale of goods or properties",
    "NIRC Section 107 VAT importation",
    "NIRC Section 108 VAT sale of services lease of properties",
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
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "VAT_LIABILITY",
    primarySubIssue: "DEFINITION",
    subIssue: "DEFINITION",

    retrievalStrategy: VAT_DEFINITION_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_DEFINITION_SUB_ISSUE.legalDimensions,

    targetAuthorities: VAT_DEFINITION_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_DEFINITION_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_DEFINITION_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_DEFINITION_SUB_ISSUE.supportingJurisprudence,

    targetAuthorityTypes,
    namedTargetAuthorities: VAT_DEFINITION_SUB_ISSUE.targetAuthorities,
    governingStatutes: [
      "NIRC Sec. 105",
      "NIRC Sec. 106",
      "NIRC Sec. 107",
      "NIRC Sec. 108",
      "RR 16-2005"
    ],

    preferredCases: VAT_DEFINITION_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_DEFINITION_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_DEFINITION_EXCLUDED_FOLDERS,

    searchQueries,

    boostTerms: unique([
      "VAT",
      "Value-Added Tax",
      "value added tax",
      "NIRC Sec. 105",
      "NIRC Sec. 106",
      "NIRC Sec. 107",
      "NIRC Sec. 108",
      "RR 16-2005",
      "Seagate Technology",
      "Aichi Forging",
      "Toshiba",
      ...VAT_DEFINITION_SUB_ISSUE.legalConcepts,
      ...classification.matchedTerms
    ]),

    suppressIssues: VAT_DEFINITION_SUB_ISSUE.relatedButDifferentIssues,

    sourceGroundingRequired: true,
    tpmProfile: VAT_DEFINITION_SUB_ISSUE.tpmProfile,
    compactSourcesOnly: true,

    classification
  };
}

export function buildVatDefinitionAnswerRules(mode = "LEGAL_ANALYSIS") {
  const normalizedMode = normalizeCode(mode);
  const structure =
    normalizedMode === "SIMPLE_DEFINITION" ||
    normalizedMode === "FAST_DEFINITION" ||
    normalizedMode === "QUICK"
      ? VAT_DEFINITION_ANSWER_STRUCTURE.SIMPLE_DEFINITION
      : VAT_DEFINITION_ANSWER_STRUCTURE.LEGAL_ANALYSIS;

  return {
    engine: "tax-engines/VAT/engines/definition-engine.js",
    version: VAT_DEFINITION_ENGINE_VERSION,

    requiredStructure: structure,
    answerStructure: VAT_DEFINITION_ANSWER_STRUCTURE,

    directAnswerRule:
      "Define VAT only from retrieved indexed authorities. Anchor the definition on NIRC Secs. 105–108 and RR 16-2005.",

    controllingLegalBasisRule:
      "Prioritize NIRC Secs. 105–108 and RR 16-2005. Do not use VAT refund provisions under Sec. 112 as the controlling basis for a pure VAT definition question.",

    supportingRulesRule:
      "Use RR 16-2005 and relevant RMCs only when they explain VAT nature, taxable transactions, taxable persons, sale of goods, sale of services, importation, or VAT business concept.",

    jurisprudenceRule:
      "Use only jurisprudence relevant to VAT nature, scope, taxable transactions, VAT system, indirect tax characterization, destination principle, or foundational VAT doctrine. Do not cite refund-only cases unless they expressly discuss VAT nature.",

    doctrinalStatusRule:
      "Explain destination principle, cross-border doctrine, VAT as indirect tax, or business concept only when relevant to the user question and supported by indexed sources.",

    conflictRule:
      VAT_DEFINITION_DOCTRINAL_METADATA.conflictRule,

    exclusionRule:
      "Do not treat refund, input-tax substantiation, zero-rating, exemption, registration, withholding VAT, deemed sale, or filing issues as controlling unless the user specifically asks those issues.",

    insufficientSourceRule:
      'If indexed controlling authorities are not available, say: "Indexed source not found."',

    noFinalAnswerGeneration: true
  };
}

export function enhanceIssueClassificationWithVatDefinition(issueClassification = {}, query = "") {
  const reviewMode =
    issueClassification.reviewMode === true ||
    issueClassification.requiresReviewMode === true ||
    issueClassification.queryIntent?.requiresReviewMode === true ||
    issueClassification.intentFlags?.requiresReviewMode === true;

  const retrievalPlan = buildVatDefinitionRetrievalPlan({
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
    legacyPrimaryIssue: "VAT_LIABILITY",
    primarySubIssue: "DEFINITION",
    subIssue: "DEFINITION",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "VAT",
      "VAT_LIABILITY",
      "DEFINITION"
    ]),

    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "SUBSTANTIVE"
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

    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),

      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      domainCode: "VAT",
      domainName: "Value-Added Tax",

      primaryIssue: issueClassification.primaryIssue || "VAT",
      legacyPrimaryIssue: "VAT_LIABILITY",
      primarySubIssue: "DEFINITION",
      subIssue: "DEFINITION",
      subIssues: ["DEFINITION"],

      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      controllingAuthorities: retrievalPlan.controllingAuthorities,
      supportingAuthorities: retrievalPlan.supportingAuthorities,
      supportingJurisprudence: retrievalPlan.supportingJurisprudence,

      retrievalStrategy: retrievalPlan.retrievalStrategy,
      priorityFolders: retrievalPlan.priorityFolders,
      excludedFolders: retrievalPlan.excludedFolders,
      requiredAnswerSections: VAT_DEFINITION_ANSWER_STRUCTURE.LEGAL_ANALYSIS,
      tpmProfile: retrievalPlan.tpmProfile,
      sourceGroundingRequired: true,

      retrievalHints: {
        domainCode: "VAT",
        domainName: "Value-Added Tax",
        primarySubIssue: "DEFINITION",
        subIssue: "DEFINITION",
        boostTerms: retrievalPlan.boostTerms,
        targetAuthorities: retrievalPlan.targetAuthorities,
        controllingAuthorities: retrievalPlan.controllingAuthorities,
        supportingAuthorities: retrievalPlan.supportingAuthorities,
        supportingJurisprudence: retrievalPlan.supportingJurisprudence,
        preferredAuthorities: retrievalPlan.targetAuthorityTypes,
        priorityFolders: retrievalPlan.priorityFolders,
        excludedFolders: retrievalPlan.excludedFolders,
        preserveControllingAuthorities: true,
        preserveTargetAuthorityMatches: true,
        preserveIssueClassificationMatches: true,
        compactSourcesOnly: true,
        sourceGroundingRequired: true
      },

      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/definition-engine.js",
        identityEngineCode: "DEFINITION",
        requiresIssueSpecificRetrieval: true,
        requiresAuthorityHierarchy: true,
        requiresSupersessionCheck: true,
        requiresConflictCheck: false,
        requiresJurisprudence: true,
        requiresEvidenceEvaluation: false,
        requiresFactPatternEngine: false,
        supportsFactPatternRouting: true
      },

      confidence: retrievalPlan.classification.confidence,
      fallbackClassificationUsed: retrievalPlan.classification.fallbackClassificationUsed
    },

    vatDefinition: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatDefinitionAnswerRules(
        issueClassification.responseMode ||
        issueClassification.orchestrationMode ||
        "LEGAL_ANALYSIS"
      ),
      doctrinalMetadata: VAT_DEFINITION_DOCTRINAL_METADATA,
      factPatternMetadata: VAT_DEFINITION_FACT_PATTERN_METADATA
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
    "nirc 105",
    "section 105",
    "nirc sec 105",
    "nirc 106",
    "section 106",
    "nirc sec 106",
    "nirc 107",
    "section 107",
    "nirc sec 107",
    "nirc 108",
    "section 108",
    "nirc sec 108",
    "rr 16-2005",
    "revenue regulations 16-2005",
    "seagate",
    "aichi",
    "toshiba",
    "value-added tax",
    "value added tax",
    "sale of goods",
    "sale of services",
    "importation",
    "course of trade",
    "course of business"
  ]);

  const negative = scoreKeywordSet(haystack, NEGATIVE_OR_DIVERSION_KEYWORDS);

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
    "SUPREME_COURT"
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
    shouldPreserveForVatDefinition:
      score > 0 && authorityAllowed
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
    controllingAuthorities: VAT_DEFINITION_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_DEFINITION_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_DEFINITION_SUB_ISSUE.supportingJurisprudence,

    retrievalStrategy: VAT_DEFINITION_SUB_ISSUE.retrievalStrategy,
    priorityFolders: VAT_DEFINITION_PRIORITY_FOLDERS,
    excludedFolders: VAT_DEFINITION_EXCLUDED_FOLDERS,

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
    avoidsVatRefundMisclassification: true
  };
}

export default {
  VAT_DEFINITION_ENGINE_VERSION,
  VAT_DEFINITION_SUB_ISSUE,
  VAT_DEFINITION_PRIORITY_FOLDERS,
  VAT_DEFINITION_EXCLUDED_FOLDERS,
  VAT_DEFINITION_AUTHORITY_HIERARCHY,
  VAT_DEFINITION_KEYWORDS,
  VAT_DEFINITION_ALIASES,
  VAT_DEFINITION_ANSWER_STRUCTURE,
  VAT_DEFINITION_DOCTRINAL_METADATA,
  VAT_DEFINITION_FACT_PATTERN_METADATA,

  getVatDefinitionConfig,
  getVatDefinitionAuthorities,
  getVatDefinitionKeywords,
  matchVatDefinitionQuery,
  normalizeVatDefinitionConcept,

  classifyVatDefinitionQuery,
  buildVatDefinitionRetrievalPlan,
  buildVatDefinitionAnswerRules,
  enhanceIssueClassificationWithVatDefinition,
  validateVatDefinitionSource,
  vatDefinitionEngineHealthCheck
};
