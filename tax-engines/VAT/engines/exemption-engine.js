// FILE: tax-engines/VAT/engines/exemption-engine.js
"use strict";

/**
 * TINA VAT Exemption Engine
 * Version: 2.0.0
 *
 * Handles VAT Sub-Issue:
 * EXEMPTION — Sec. 109 VAT exemptions, special law exemptions,
 * entity/transaction-based exemptions, and exemption distinction routing.
 *
 * Boundary:
 * - Does not call OpenAI
 * - Does not retrieve sources directly
 * - Does not generate final answers
 * - Does not duplicate retrieval-engine.js, context-orchestration-engine.js,
 *   or rag-answer-handler.js
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../../shared/authority-hierarchy.js";

export const VAT_EXEMPTION_ENGINE_VERSION = "2.0.0";

export const VAT_EXEMPTION_PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS",
  "06_COURT_CASES"
]);

export const VAT_EXEMPTION_EXCLUDED_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

export const VAT_EXEMPTION_AUTHORITY_HIERARCHY = Object.freeze([
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

export const VAT_EXEMPTION_SUB_ISSUE = Object.freeze({
  code: "EXEMPTION",
  subIssue: "EXEMPTION",
  domain: "VAT",
  domainCode: "VAT",
  domainName: "Value-Added Tax",
  title: "Exemption — Sec. 109 VAT-exempt transactions and special law exemptions",
  description:
    "Reusable VAT exemption sub-issue engine for Sec. 109 exemptions, special law exemptions, entity-based exemptions, transaction-based exemptions, BIR ruling-sensitive exemptions, and exemption distinction routing.",

  primaryIssue: "VAT",
  legacyPrimaryIssue: "VAT_EXEMPTION",
  primarySubIssue: "EXEMPTION",

  retrievalStrategy: "VAT_EXEMPTION_STATUTE_AND_RULING_FIRST",

  targetAuthorities: [
    "NIRC Sec. 109",
    "RR 16-2005 VAT exemption provisions",
    "Applicable special laws",
    "Relevant BIR rulings",
    "RMC 30-2008",
    "Issue-relevant VAT exemption jurisprudence"
  ],

  controllingAuthorities: [
    "NIRC Sec. 109",
    "RR 16-2005 VAT exemption provisions",
    "Applicable special laws, where relevant"
  ],

  supportingAuthorities: [
    "BIR rulings for specific entities or transactions",
    "RMC 30-2008, where applicable",
    "Other VAT exemption-related RMCs/RRs if relevant"
  ],

  supportingJurisprudence: [
    "Issue-relevant Supreme Court or CTA VAT exemption cases only if retrieved or included by targetAuthorities"
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

  priorityFolders: VAT_EXEMPTION_PRIORITY_FOLDERS,
  excludedFolders: VAT_EXEMPTION_EXCLUDED_FOLDERS,
  authorityHierarchy: VAT_EXEMPTION_AUTHORITY_HIERARCHY,

  legalDimensions: [
    "SUBSTANTIVE",
    "EVIDENTIARY"
  ],

  legalConcepts: [
    "Sec. 109 VAT exemption",
    "VAT-exempt transaction",
    "transaction-based exemption",
    "entity-based exemption",
    "special law exemption",
    "BIR ruling-sensitive exemption",
    "exemption certificate",
    "exemption vs zero-rating",
    "exemption vs outside VAT",
    "exemption substantiation",
    "input tax allocation risk",
    "output tax risk"
  ],

  tpmProfile: "STANDARD",
  sourceGroundingRequired: true,
  doctrinallySensitive: true,
  conflictSensitive: true,
  litigationSensitive: false,
  auditRiskSensitive: true,
  rulingSensitive: true,
  specialLawSensitive: true,

  exemptionType: "MIXED_ENTITY_AND_TRANSACTION_BASED",
  exemptionNature:
    "VAT exemption must be grounded on NIRC Sec. 109, a valid special law, or applicable authority. It must not be presumed from non-VAT status, zero-rating, or outside-scope treatment.",

  relatedButDifferentIssues: [
    "DEFINITION",
    "ZERO_RATING",
    "INPUT_TAX",
    "OUTPUT_TAX",
    "REGISTRATION",
    "COMPLIANCE",
    "WITHHOLDING_VAT",
    "TRANSITIONAL_INPUT_TAX",
    "DEEMED_SALE"
  ]
});

export const VAT_EXEMPTION_KEYWORDS = Object.freeze([
  "vat exemption",
  "vat-exempt",
  "vat exempt",
  "exempt transaction",
  "exempt sale",
  "exempt service",
  "exempt importation",
  "exempt from vat",
  "sec. 109",
  "section 109",
  "nirc 109",
  "nirc sec. 109",
  "non-vat",
  "non vat",
  "non-vat taxpayer",
  "exemption certificate",
  "bir ruling",
  "cooperative exemption",
  "educational exemption",
  "hospital exemption",
  "medical services",
  "agricultural products",
  "marine food products",
  "lease exemption",
  "special law exemption",
  "entity-based exemption",
  "transaction-based exemption",
  "vat exempt entity",
  "vat exempt transaction",
  "zero-rated vs exempt",
  "zero rating vs exemption",
  "outside vat",
  "outside the scope of vat",
  "not subject to vat",
  "rmc 30-2008",
  "rr 16-2005 exemption"
]);

export const VAT_EXEMPTION_ALIASES = Object.freeze([
  "VAT_EXEMPTION",
  "SECTION_109",
  "SEC_109",
  "EXEMPT_TRANSACTION",
  "EXEMPT_SALE",
  "NON_VAT",
  "VAT_EXEMPT",
  "SPECIAL_LAW_EXEMPTION",
  "ENTITY_BASED_EXEMPTION",
  "TRANSACTION_BASED_EXEMPTION",
  "BIR_RULING_EXEMPTION"
]);

const ZERO_RATING_DISTINCTION_KEYWORDS = Object.freeze([
  "zero-rated",
  "zero rated",
  "zero-rating",
  "0% vat",
  "export sales",
  "effectively zero-rated",
  "cross-border",
  "destination principle"
]);

const OUTSIDE_SCOPE_DISTINCTION_KEYWORDS = Object.freeze([
  "outside vat",
  "outside the scope",
  "not subject to vat",
  "not a sale",
  "mutuality",
  "non-taxable",
  "not income",
  "capital transaction",
  "not in course of business"
]);

const RULING_SENSITIVE_KEYWORDS = Object.freeze([
  "bir ruling",
  "ruling",
  "confirmatory ruling",
  "exemption certificate",
  "certificate of exemption",
  "entity exemption",
  "specific taxpayer",
  "specific entity"
]);

const SPECIAL_LAW_KEYWORDS = Object.freeze([
  "special law",
  "peza",
  "boi",
  "cooperative",
  "educational institution",
  "non-stock",
  "non-profit",
  "hospital",
  "government",
  "ra ",
  "republic act"
]);

const NEGATIVE_OR_DIVERSION_KEYWORDS = Object.freeze([
  "vat refund",
  "input vat refund",
  "section 112",
  "sec. 112",
  "120-day",
  "120 day",
  "30-day",
  "30 day",
  "tax credit certificate",
  "tcc",
  "output vat computation",
  "2550q",
  "2550m",
  "withholding vat",
  "5% final withholding vat",
  "transitional input tax",
  "deemed sale"
]);

export const VAT_EXEMPTION_ANSWER_STRUCTURE = Object.freeze({
  SIMPLE_EXEMPTION_QUERY: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. EXEMPTION CLASSIFICATION",
    "D. PRACTICAL NOTE"
  ],

  LEGAL_ANALYSIS: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    "D. APPLICATION TO TRANSACTION OR ENTITY",
    "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "F. PRACTICAL NOTE / AUDIT RISK"
  ],

  RULING_SENSITIVE_EXEMPTION: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. BIR RULING / SPECIAL LAW CHECK",
    "D. DOCUMENTARY REQUIREMENTS",
    "E. AUDIT RISK",
    "F. PRACTICAL POSITION"
  ]
});

export const VAT_EXEMPTION_DOCTRINAL_METADATA = Object.freeze({
  doctrines: [
    {
      code: "STRICT_CONSTRUCTION",
      label: "Tax exemption strictly construed",
      description:
        "A claimed VAT exemption must be supported by clear statutory or special-law basis and is generally construed strictly against the taxpayer claiming it."
    },
    {
      code: "EXEMPTION_VS_ZERO_RATING",
      label: "Exemption differs from zero-rating",
      description:
        "VAT exemption is not the same as zero-rating. Zero-rated sales remain taxable at 0% and may have different input VAT consequences."
    },
    {
      code: "EXEMPTION_VS_OUTSIDE_SCOPE",
      label: "Exemption differs from outside-scope treatment",
      description:
        "A transaction outside the scope of VAT is not necessarily a VAT-exempt transaction under Sec. 109."
    },
    {
      code: "STATUTE_PREVAILS",
      label: "Statutory exemption prevails over administrative interpretation",
      description:
        "Administrative issuances and BIR rulings cannot override the NIRC, special laws, or controlling jurisprudence."
    },
    {
      code: "SPECIAL_LAW_EXACT_FIT",
      label: "Special law exemption requires exact fit",
      description:
        "Special law exemptions require exact factual, entity, and statutory fit."
    },
    {
      code: "BIR_RULING_FACT_SPECIFIC",
      label: "BIR ruling sensitivity",
      description:
        "A BIR ruling generally applies to the requesting taxpayer and exact facts unless the ruling or issuance is generally applicable."
    }
  ],
  conflictRule:
    "Do not mark conflict automatically. Conflict metadata is valid only if same exact issue, same legal dimension, opposite rule or holding, hierarchy analysis, and conflict-resolution basis are present.",
  automaticConflictDetection: false,
  zeroRatingIsNotExemption: true,
  outsideScopeIsNotAutomaticallyExempt: true
});

export const VAT_EXEMPTION_FACT_PATTERN_METADATA = Object.freeze({
  supportsFactPatternRouting: true,
  doesNotPerformFullFactPatternAnalysis: true,
  usableFor: [
    "transaction characterization",
    "entity-status review",
    "special law qualification",
    "economic substance analysis",
    "documentary substantiation",
    "VAT audit-risk analysis",
    "exemption certificate/ruling review",
    "gross vs exempt revenue classification",
    "VAT return disclosure"
  ],
  requiredFactInputs: [
    "identity and legal status of taxpayer/entity",
    "nature of transaction",
    "whether exemption is entity-based or transaction-based",
    "specific statutory or special-law basis claimed",
    "existence of BIR ruling or exemption certificate",
    "documentation supporting exemption",
    "whether transaction may instead be zero-rated or outside VAT",
    "input VAT allocation treatment",
    "VAT return disclosure treatment"
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

export function getVatExemptionConfig() {
  return {
    engine: "tax-engines/VAT/engines/exemption-engine.js",
    version: VAT_EXEMPTION_ENGINE_VERSION,
    ...VAT_EXEMPTION_SUB_ISSUE,
    keywords: VAT_EXEMPTION_KEYWORDS,
    aliases: VAT_EXEMPTION_ALIASES,
    answerStructure: VAT_EXEMPTION_ANSWER_STRUCTURE,
    doctrinalMetadata: VAT_EXEMPTION_DOCTRINAL_METADATA,
    factPatternMetadata: VAT_EXEMPTION_FACT_PATTERN_METADATA,
    retrievalHints: buildVatExemptionRetrievalHints()
  };
}

export function getVatExemptionAuthorities() {
  return {
    targetAuthorities: VAT_EXEMPTION_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_EXEMPTION_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_EXEMPTION_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_EXEMPTION_SUB_ISSUE.supportingJurisprudence,
    preferredAuthorityTypes: VAT_EXEMPTION_SUB_ISSUE.preferredAuthorityTypes,
    authorityHierarchy: VAT_EXEMPTION_AUTHORITY_HIERARCHY,
    priorityFolders: VAT_EXEMPTION_PRIORITY_FOLDERS,
    excludedFolders: VAT_EXEMPTION_EXCLUDED_FOLDERS
  };
}

export function getVatExemptionKeywords() {
  return {
    keywords: VAT_EXEMPTION_KEYWORDS,
    aliases: VAT_EXEMPTION_ALIASES,
    zeroRatingDistinctionKeywords: ZERO_RATING_DISTINCTION_KEYWORDS,
    outsideScopeDistinctionKeywords: OUTSIDE_SCOPE_DISTINCTION_KEYWORDS,
    rulingSensitiveKeywords: RULING_SENSITIVE_KEYWORDS,
    specialLawKeywords: SPECIAL_LAW_KEYWORDS,
    diversionKeywords: NEGATIVE_OR_DIVERSION_KEYWORDS
  };
}

export function normalizeVatExemptionConcept(value = "") {
  const normalized = normalizeCode(value);

  const aliases = {
    VAT_EXEMPTION: "EXEMPTION",
    SECTION_109: "EXEMPTION",
    SEC_109: "EXEMPTION",
    EXEMPT_TRANSACTION: "TRANSACTION_BASED_EXEMPTION",
    EXEMPT_SALE: "TRANSACTION_BASED_EXEMPTION",
    EXEMPT_SERVICE: "TRANSACTION_BASED_EXEMPTION",
    EXEMPT_IMPORTATION: "TRANSACTION_BASED_EXEMPTION",
    NON_VAT: "NON_VAT_DISTINCTION",
    VAT_EXEMPT_ENTITY: "ENTITY_BASED_EXEMPTION",
    SPECIAL_LAW_EXEMPTION: "SPECIAL_LAW_EXEMPTION",
    BIR_RULING: "BIR_RULING_SENSITIVE",
    EXEMPTION_CERTIFICATE: "DOCUMENTARY_SUPPORT_REQUIRED",
    ZERO_RATING_DISTINCTION: "ZERO_RATING_DISTINCTION",
    OUTSIDE_SCOPE: "OUTSIDE_SCOPE_DISTINCTION"
  };

  return aliases[normalized] || normalized || "EXEMPTION";
}

export function classifyVatExemptionType(query = "") {
  const normalizedQuery = normalizeText(query);

  const entityScore = scoreKeywordSet(normalizedQuery, [
    "entity",
    "vat exempt entity",
    "cooperative",
    "educational institution",
    "hospital",
    "non-stock",
    "non-profit",
    "government",
    "peza",
    "boi"
  ]);

  const transactionScore = scoreKeywordSet(normalizedQuery, [
    "transaction",
    "sale",
    "service",
    "importation",
    "lease",
    "medical services",
    "agricultural products",
    "marine food products",
    "exempt sale"
  ]);

  const specialLawScore = scoreKeywordSet(normalizedQuery, SPECIAL_LAW_KEYWORDS);
  const rulingScore = scoreKeywordSet(normalizedQuery, RULING_SENSITIVE_KEYWORDS);
  const zeroRatingScore = scoreKeywordSet(normalizedQuery, ZERO_RATING_DISTINCTION_KEYWORDS);
  const outsideScopeScore = scoreKeywordSet(normalizedQuery, OUTSIDE_SCOPE_DISTINCTION_KEYWORDS);

  const isEntityBasedExemption = entityScore.score > 0;
  const isTransactionBasedExemption = transactionScore.score > 0 || !isEntityBasedExemption;
  const isSpecialLawExemption = specialLawScore.score > 0;
  const isBIRRulingSensitive = rulingScore.score > 0 || isEntityBasedExemption || isSpecialLawExemption;

  const zeroRatingDistinctionRequired = zeroRatingScore.score > 0;
  const outsideScopeDistinctionRequired = outsideScopeScore.score > 0;

  return {
    exemptionType:
      isEntityBasedExemption && isTransactionBasedExemption
        ? "MIXED_ENTITY_AND_TRANSACTION_BASED"
        : isEntityBasedExemption
          ? "ENTITY_BASED"
          : "TRANSACTION_BASED",

    exemptionNature:
      isSpecialLawExemption
        ? "SPECIAL_LAW_SENSITIVE"
        : isBIRRulingSensitive
          ? "RULING_OR_ENTITY_STATUS_SENSITIVE"
          : "SECTION_109_TRANSACTION_BASED",

    isEntityBasedExemption,
    isTransactionBasedExemption,
    isSpecialLawExemption,
    isBIRRulingSensitive,

    requiresExactStatutoryFit: true,
    requiresDocumentarySupport: true,
    requiresExemptionCertificate: isBIRRulingSensitive || isSpecialLawExemption,

    zeroRatingDistinctionRequired,
    outsideScopeDistinctionRequired,
    distinctionRequired:
      zeroRatingDistinctionRequired || outsideScopeDistinctionRequired,

    outputTaxRisk: true,
    inputTaxAllocationRisk: true,

    candidateSubIssues:
      zeroRatingDistinctionRequired || outsideScopeDistinctionRequired
        ? ["EXEMPTION", "ZERO_RATING", "DEFINITION"]
        : ["EXEMPTION"],

    matchedTerms: unique([
      ...entityScore.matchedTerms,
      ...transactionScore.matchedTerms,
      ...specialLawScore.matchedTerms,
      ...rulingScore.matchedTerms,
      ...zeroRatingScore.matchedTerms,
      ...outsideScopeScore.matchedTerms
    ])
  };
}

export function buildVatExemptionRetrievalHints({
  reviewMode = false,
  extraAuthorities = []
} = {}) {
  return {
    domainCode: "VAT",
    domainName: "Value-Added Tax",
    subIssue: "EXEMPTION",
    retrievalStrategy: VAT_EXEMPTION_SUB_ISSUE.retrievalStrategy,

    targetAuthorities: unique([
      ...VAT_EXEMPTION_SUB_ISSUE.targetAuthorities,
      ...extraAuthorities
    ]),
    controllingAuthorities: VAT_EXEMPTION_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_EXEMPTION_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_EXEMPTION_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_EXEMPTION_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_EXEMPTION_EXCLUDED_FOLDERS,

    preserveControllingAuthorities: true,
    preserveTargetAuthorityMatches: true,
    preserveIssueClassificationMatches: true,
    preserveBIRRulingSources: true,
    preserveSpecialLawSources: true,

    sourceGroundingRequired: true,
    compactSourcesOnly: true
  };
}

export function matchVatExemptionQuery(query = "", options = {}) {
  return classifyVatExemptionQuery(query, options);
}

export function classifyVatExemptionQuery(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);

  const positive = scoreKeywordSet(normalizedQuery, [
    ...VAT_EXEMPTION_KEYWORDS,
    ...VAT_EXEMPTION_ALIASES
  ]);

  const negative = scoreKeywordSet(normalizedQuery, NEGATIVE_OR_DIVERSION_KEYWORDS);
  const zeroRating = scoreKeywordSet(normalizedQuery, ZERO_RATING_DISTINCTION_KEYWORDS);
  const outsideScope = scoreKeywordSet(normalizedQuery, OUTSIDE_SCOPE_DISTINCTION_KEYWORDS);

  let score = positive.score - negative.score;

  const priorSubIssue = normalizeCode(options.priorSubIssue || "");
  const primaryDomain = normalizeCode(options.primaryDomain || options.domainCode || "");
  const primaryIssue = normalizeCode(options.primaryIssue || "");

  if (priorSubIssue === "EXEMPTION") score += 6;
  if (primaryDomain === "VAT") score += 3;
  if (primaryIssue === "VAT" || primaryIssue === "VAT_EXEMPTION") score += 2;

  if (zeroRating.score > 0 || outsideScope.score > 0) {
    score += 1;
  }

  const exemptionType = classifyVatExemptionType(query);

  const confidence =
    score <= 0
      ? 0.25
      : Number(Math.min(0.55 + score / 24, 0.98).toFixed(2));

  return {
    engine: "tax-engines/VAT/engines/exemption-engine.js",
    version: VAT_EXEMPTION_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "VAT_EXEMPTION",
    primarySubIssue: "EXEMPTION",
    subIssue: "EXEMPTION",

    matched: score > 0,
    score,
    confidence,

    matchedTerms: unique([
      ...positive.matchedTerms,
      ...exemptionType.matchedTerms
    ]),
    diversionTerms: negative.matchedTerms,

    shouldUseThisEngine: score > 0 && confidence >= 0.45,
    fallbackClassificationUsed: score <= 0,

    distinctionRequired: exemptionType.distinctionRequired,
    candidateSubIssues: exemptionType.candidateSubIssues,

    ...exemptionType,

    retrievalStrategy: VAT_EXEMPTION_SUB_ISSUE.retrievalStrategy,
    targetAuthorities: VAT_EXEMPTION_SUB_ISSUE.targetAuthorities,
    controllingAuthorities: VAT_EXEMPTION_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_EXEMPTION_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_EXEMPTION_SUB_ISSUE.supportingJurisprudence,
    sourceGroundingRequired: true
  };
}

export function buildVatExemptionRetrievalPlan({
  query = "",
  issueClassification = {},
  maxQueries = 8,
  reviewMode = false
} = {}) {
  const classification = classifyVatExemptionQuery(query, {
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
      subIssues: ["EXEMPTION"],
      targetAuthorities: VAT_EXEMPTION_SUB_ISSUE.preferredAuthorityTypes
    })
  );

  const searchQueries = unique([
    query,
    "NIRC Section 109 VAT exempt transactions",
    "RR 16-2005 VAT exemption provisions",
    "VAT exemption special law",
    "VAT exempt transaction BIR ruling",
    "RMC 30-2008 VAT exemption",
    "VAT exemption vs zero-rating",
    "VAT exemption outside scope of VAT",
    "VAT exemption documentary support",
    ...classification.matchedTerms.map((term) => `VAT exemption ${term}`)
  ])
    .filter(Boolean)
    .slice(0, maxQueries);

  const extraAuthorities =
    classification.isSpecialLawExemption
      ? ["Applicable special laws"]
      : [];

  return {
    engine: "tax-engines/VAT/engines/exemption-engine.js",
    version: VAT_EXEMPTION_ENGINE_VERSION,

    domain: "VAT",
    domainCode: "VAT",
    domainName: "Value-Added Tax",

    primaryIssue: "VAT",
    legacyPrimaryIssue: "VAT_EXEMPTION",
    primarySubIssue: "EXEMPTION",
    subIssue: "EXEMPTION",

    retrievalStrategy: VAT_EXEMPTION_SUB_ISSUE.retrievalStrategy,
    legalDimensions: VAT_EXEMPTION_SUB_ISSUE.legalDimensions,

    targetAuthorities: unique([
      ...VAT_EXEMPTION_SUB_ISSUE.targetAuthorities,
      ...extraAuthorities
    ]),
    controllingAuthorities: VAT_EXEMPTION_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_EXEMPTION_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_EXEMPTION_SUB_ISSUE.supportingJurisprudence,

    targetAuthorityTypes,
    namedTargetAuthorities: VAT_EXEMPTION_SUB_ISSUE.targetAuthorities,
    governingStatutes: [
      "NIRC Sec. 109",
      "RR 16-2005 VAT exemption provisions"
    ],

    preferredCases: VAT_EXEMPTION_SUB_ISSUE.supportingJurisprudence,

    priorityFolders: VAT_EXEMPTION_PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : VAT_EXEMPTION_EXCLUDED_FOLDERS,

    searchQueries,

    boostTerms: unique([
      "VAT",
      "Value-Added Tax",
      "NIRC Sec. 109",
      "RR 16-2005",
      "VAT exemption",
      "VAT-exempt transaction",
      "BIR ruling",
      "RMC 30-2008",
      "special law exemption",
      ...VAT_EXEMPTION_SUB_ISSUE.legalConcepts,
      ...classification.matchedTerms
    ]),

    suppressIssues: [
      "REFUND_CREDIT",
      "INPUT_TAX",
      "OUTPUT_TAX",
      "WITHHOLDING_VAT",
      "TRANSITIONAL_INPUT_TAX",
      "DEEMED_SALE"
    ],

    distinctionRequired: classification.distinctionRequired,
    candidateSubIssues: classification.candidateSubIssues,

    sourceGroundingRequired: true,
    tpmProfile: VAT_EXEMPTION_SUB_ISSUE.tpmProfile,
    compactSourcesOnly: true,

    classification
  };
}

export function buildVatExemptionAnswerRules(mode = "LEGAL_ANALYSIS") {
  const normalizedMode = normalizeCode(mode);
  const structure =
    normalizedMode === "SIMPLE_EXEMPTION_QUERY" ||
    normalizedMode === "FAST_DEFINITION" ||
    normalizedMode === "QUICK"
      ? VAT_EXEMPTION_ANSWER_STRUCTURE.SIMPLE_EXEMPTION_QUERY
      : normalizedMode === "RULING_SENSITIVE_EXEMPTION"
        ? VAT_EXEMPTION_ANSWER_STRUCTURE.RULING_SENSITIVE_EXEMPTION
        : VAT_EXEMPTION_ANSWER_STRUCTURE.LEGAL_ANALYSIS;

  return {
    engine: "tax-engines/VAT/engines/exemption-engine.js",
    version: VAT_EXEMPTION_ENGINE_VERSION,

    requiredStructure: structure,
    answerStructure: VAT_EXEMPTION_ANSWER_STRUCTURE,

    directAnswerRule:
      "Determine VAT exemption only from retrieved indexed authorities. Do not presume exemption from non-VAT status, zero-rating, or outside-scope treatment.",

    controllingLegalBasisRule:
      "Prioritize NIRC Sec. 109, RR 16-2005 VAT exemption provisions, and applicable special laws. Administrative issuances and BIR rulings cannot override the NIRC, special laws, or controlling jurisprudence.",

    supportingRulesRule:
      "Use BIR rulings, RMC 30-2008, and other RMC/RR issuances only when they are relevant to the exact exemption, entity, transaction, or special law involved.",

    jurisprudenceRule:
      "Use only issue-relevant Supreme Court or CTA cases if retrieved or included by targetAuthorities. Do not invent exemption cases.",

    doctrineRule:
      "Distinguish VAT exemption from zero-rating and outside-scope treatment. Require exact statutory or special-law fit for claimed exemption.",

    rulingSensitiveRule:
      "A BIR ruling should be treated as fact-specific unless it is a generally applicable issuance. Require exact taxpayer, transaction, and factual fit before relying on it.",

    auditRiskRule:
      "Flag output VAT exposure, input tax allocation risk, wrong VAT return disclosure, missing exemption certificate/ruling, and insufficient documentary support where relevant.",

    conflictRule:
      VAT_EXEMPTION_DOCTRINAL_METADATA.conflictRule,

    exclusionRule:
      "Do not treat zero-rated sales as exempt sales. Do not treat transactions outside VAT as Sec. 109 exempt transactions unless indexed authorities support that classification.",

    insufficientSourceRule:
      'If indexed controlling authorities are not available, say: "Indexed source not found."',

    noFinalAnswerGeneration: true
  };
}

export function enhanceIssueClassificationWithVatExemption(issueClassification = {}, query = "") {
  const reviewMode =
    issueClassification.reviewMode === true ||
    issueClassification.requiresReviewMode === true ||
    issueClassification.queryIntent?.requiresReviewMode === true ||
    issueClassification.intentFlags?.requiresReviewMode === true;

  const retrievalPlan = buildVatExemptionRetrievalPlan({
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
    legacyPrimaryIssue: "VAT_EXEMPTION",
    primarySubIssue: "EXEMPTION",
    subIssue: "EXEMPTION",
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      "VAT",
      "VAT_EXEMPTION",
      "EXEMPTION"
    ]),

    legalDimensions: unique([
      ...(issueClassification.legalDimensions || []),
      "SUBSTANTIVE",
      "EVIDENTIARY"
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

    exemptionFlags: {
      isEntityBasedExemption: retrievalPlan.classification.isEntityBasedExemption,
      isTransactionBasedExemption: retrievalPlan.classification.isTransactionBasedExemption,
      isSpecialLawExemption: retrievalPlan.classification.isSpecialLawExemption,
      isBIRRulingSensitive: retrievalPlan.classification.isBIRRulingSensitive,
      requiresExactStatutoryFit: retrievalPlan.classification.requiresExactStatutoryFit,
      requiresDocumentarySupport: retrievalPlan.classification.requiresDocumentarySupport,
      requiresExemptionCertificate: retrievalPlan.classification.requiresExemptionCertificate,
      zeroRatingDistinctionRequired: retrievalPlan.classification.zeroRatingDistinctionRequired,
      outsideScopeDistinctionRequired: retrievalPlan.classification.outsideScopeDistinctionRequired,
      outputTaxRisk: retrievalPlan.classification.outputTaxRisk,
      inputTaxAllocationRisk: retrievalPlan.classification.inputTaxAllocationRisk
    },

    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),

      primaryDomain: "VAT",
      primaryDomainName: "Value-Added Tax",
      domainCode: "VAT",
      domainName: "Value-Added Tax",

      primaryIssue: issueClassification.primaryIssue || "VAT",
      legacyPrimaryIssue: "VAT_EXEMPTION",
      primarySubIssue: "EXEMPTION",
      subIssue: "EXEMPTION",
      subIssues: ["EXEMPTION"],

      governingStatutes: retrievalPlan.governingStatutes,
      targetAuthorities: retrievalPlan.targetAuthorities,
      controllingAuthorities: retrievalPlan.controllingAuthorities,
      supportingAuthorities: retrievalPlan.supportingAuthorities,
      supportingJurisprudence: retrievalPlan.supportingJurisprudence,

      retrievalStrategy: retrievalPlan.retrievalStrategy,
      priorityFolders: retrievalPlan.priorityFolders,
      excludedFolders: retrievalPlan.excludedFolders,
      requiredAnswerSections: VAT_EXEMPTION_ANSWER_STRUCTURE.LEGAL_ANALYSIS,
      tpmProfile: retrievalPlan.tpmProfile,
      sourceGroundingRequired: true,

      retrievalHints: buildVatExemptionRetrievalHints({
        reviewMode,
        extraAuthorities:
          retrievalPlan.classification.isSpecialLawExemption
            ? ["Applicable special laws"]
            : []
      }),

      engineRouting: {
        useDomainEngine: true,
        domainEnginePath: "./tax-engines/VAT/domain-config.js",
        useIdentityEngine: true,
        identityEnginePath: "./tax-engines/VAT/engines/exemption-engine.js",
        identityEngineCode: "EXEMPTION",
        requiresIssueSpecificRetrieval: true,
        requiresAuthorityHierarchy: true,
        requiresSupersessionCheck: true,
        requiresConflictCheck: true,
        requiresJurisprudence: false,
        requiresEvidenceEvaluation: true,
        requiresFactPatternEngine: true,
        supportsFactPatternRouting: true,
        requiresLegalValidation: true
      },

      confidence: retrievalPlan.classification.confidence,
      fallbackClassificationUsed: retrievalPlan.classification.fallbackClassificationUsed
    },

    vatExemption: {
      classification: retrievalPlan.classification,
      retrievalPlan,
      answerRules: buildVatExemptionAnswerRules(
        retrievalPlan.classification.isBIRRulingSensitive
          ? "RULING_SENSITIVE_EXEMPTION"
          : issueClassification.responseMode ||
              issueClassification.orchestrationMode ||
              "LEGAL_ANALYSIS"
      ),
      doctrinalMetadata: VAT_EXEMPTION_DOCTRINAL_METADATA,
      factPatternMetadata: VAT_EXEMPTION_FACT_PATTERN_METADATA
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
    "nirc 109",
    "section 109",
    "nirc sec 109",
    "rr 16-2005",
    "vat exemption",
    "vat exempt",
    "exempt transaction",
    "exempt sale",
    "exempt service",
    "exempt importation",
    "bir ruling",
    "rmc 30-2008",
    "special law exemption",
    "cooperative",
    "educational institution",
    "hospital",
    "medical services",
    "agricultural products",
    "marine food products"
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
    shouldPreserveForVatExemption:
      score > 0 && authorityAllowed
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
    controllingAuthorities: VAT_EXEMPTION_SUB_ISSUE.controllingAuthorities,
    supportingAuthorities: VAT_EXEMPTION_SUB_ISSUE.supportingAuthorities,
    supportingJurisprudence: VAT_EXEMPTION_SUB_ISSUE.supportingJurisprudence,

    retrievalStrategy: VAT_EXEMPTION_SUB_ISSUE.retrievalStrategy,
    priorityFolders: VAT_EXEMPTION_PRIORITY_FOLDERS,
    excludedFolders: VAT_EXEMPTION_EXCLUDED_FOLDERS,

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

    avoidsZeroRatingMisclassification: true,
    avoidsOutsideScopeMisclassification: true,
    rulingSensitive: true,
    specialLawSensitive: true,
    auditRiskSensitive: true
  };
}

export default {
  VAT_EXEMPTION_ENGINE_VERSION,
  VAT_EXEMPTION_SUB_ISSUE,
  VAT_EXEMPTION_PRIORITY_FOLDERS,
  VAT_EXEMPTION_EXCLUDED_FOLDERS,
  VAT_EXEMPTION_AUTHORITY_HIERARCHY,
  VAT_EXEMPTION_KEYWORDS,
  VAT_EXEMPTION_ALIASES,
  VAT_EXEMPTION_ANSWER_STRUCTURE,
  VAT_EXEMPTION_DOCTRINAL_METADATA,
  VAT_EXEMPTION_FACT_PATTERN_METADATA,

  getVatExemptionConfig,
  getVatExemptionAuthorities,
  getVatExemptionKeywords,
  matchVatExemptionQuery,
  normalizeVatExemptionConcept,
  classifyVatExemptionType,
  buildVatExemptionRetrievalHints,

  classifyVatExemptionQuery,
  buildVatExemptionRetrievalPlan,
  buildVatExemptionAnswerRules,
  enhanceIssueClassificationWithVatExemption,
  validateVatExemptionSource,
  vatExemptionEngineHealthCheck
};
