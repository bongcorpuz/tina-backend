// FILE: tax-engines/VAT/domain-config.js
"use strict";

/**
 * TINA VAT Domain Config
 * Version: 1.0.0
 *
 * VAT identities are intentionally mapped to separate engine files.
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../shared/authority-hierarchy.js";

export const VAT_DOMAIN_CONFIG_VERSION = "1.0.0";

export const VAT_DOMAIN = Object.freeze({
  code: "VAT",
  name: "Value-Added Tax",
  title: "Value-Added Tax",
  primaryStatutes: ["NIRC Title IV", "NIRC Sections 105-115", "RR 16-2005"],
  defaultAuthorities: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
  baseRetrievalStrategy: "VAT_DOMAIN_ISSUE_SPECIFIC_RETRIEVAL"
});

export const VAT_SUB_ISSUE = Object.freeze({
  DEFINITION: "DEFINITION",
  REFUND_CREDIT: "REFUND_CREDIT",
  ZERO_RATING: "ZERO_RATING",
  INPUT_TAX: "INPUT_TAX",
  EXEMPTION: "EXEMPTION",
  OUTPUT_TAX: "OUTPUT_TAX",
  REGISTRATION: "REGISTRATION",
  COMPLIANCE: "COMPLIANCE",
  WITHHOLDING_VAT: "WITHHOLDING_VAT",
  TRANSITIONAL: "TRANSITIONAL"
});

export const VAT_IDENTITY_ENGINES = Object.freeze({
  DEFINITION: "./engines/definition-engine.js",
  REFUND_CREDIT: "./engines/refund-credit-engine.js",
  ZERO_RATING: "./engines/zero-rating-engine.js",
  INPUT_TAX: "./engines/input-tax-engine.js",
  EXEMPTION: "./engines/exemption-engine.js",
  OUTPUT_TAX: "./engines/output-tax-engine.js",
  REGISTRATION: "./engines/registration-engine.js",
  COMPLIANCE: "./engines/compliance-engine.js",
  WITHHOLDING_VAT: "./engines/withholding-vat-engine.js",
  TRANSITIONAL: "./engines/transitional-engine.js"
});

export const VAT_SUB_ISSUE_REGISTRY = Object.freeze({
  DEFINITION: {
    code: "DEFINITION",
    label: "Definition — Nature of VAT and transactions subject to VAT",
    controllingAuthorities: ["STATUTE", "RR", "SUPREME_COURT"],
    primaryStatutes: ["NIRC Sec. 105", "NIRC Secs. 106-108", "RR 16-2005"],
    enginePath: VAT_IDENTITY_ENGINES.DEFINITION,
    retrievalStrategy: "VAT_DEFINITION_FOUNDATIONAL_AUTHORITY_FIRST",
    legalDimensions: ["SUBSTANTIVE"],
    keywords: [
      "what is vat",
      "define vat",
      "nature of vat",
      "value-added tax",
      "transactions subject to vat",
      "vat liability",
      "sale of goods",
      "sale of services",
      "importation"
    ]
  },

  REFUND_CREDIT: {
    code: "REFUND_CREDIT",
    label: "Refund / Credit — Section 112 administrative claim and 120-day/30-day rule",
    controllingAuthorities: ["STATUTE", "RR", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],
    primaryStatutes: ["NIRC Sec. 112", "RR 16-2005"],
    enginePath: VAT_IDENTITY_ENGINES.REFUND_CREDIT,
    retrievalStrategy: "VAT_REFUND_PROCEDURAL_JURISPRUDENCE_FIRST",
    legalDimensions: ["PROCEDURAL", "EVIDENTIARY", "JURISDICTIONAL"],
    keywords: [
      "vat refund",
      "refund",
      "tax credit",
      "input vat refund",
      "section 112",
      "120-day",
      "30-day",
      "administrative claim",
      "judicial claim",
      "unutilized input vat",
      "excess input vat",
      "tcc"
    ]
  },

  ZERO_RATING: {
    code: "ZERO_RATING",
    label: "Zero-Rating — Cross-border doctrine and effectively zero-rated transactions",
    controllingAuthorities: ["STATUTE", "RR", "SUPREME_COURT", "RMC", "CTA_EN_BANC"],
    primaryStatutes: ["NIRC Sec. 106(A)(2)", "NIRC Sec. 108(B)", "RR 16-2005"],
    enginePath: VAT_IDENTITY_ENGINES.ZERO_RATING,
    retrievalStrategy: "VAT_ZERO_RATING_CROSS_BORDER_AUTHORITY_FIRST",
    legalDimensions: ["SUBSTANTIVE", "EVIDENTIARY"],
    keywords: [
      "zero-rated",
      "zero rating",
      "zero-rated sales",
      "effectively zero-rated",
      "export sales",
      "foreign currency",
      "cross-border",
      "nonresident foreign corporation",
      "services to nonresident",
      "destination principle"
    ]
  },

  INPUT_TAX: {
    code: "INPUT_TAX",
    label: "Input Tax — Creditable input tax, substantiation, 70% limit, amortization",
    controllingAuthorities: ["STATUTE", "RR", "RMC", "SUPREME_COURT"],
    primaryStatutes: ["NIRC Sec. 110", "RR 16-2005"],
    enginePath: VAT_IDENTITY_ENGINES.INPUT_TAX,
    retrievalStrategy: "VAT_INPUT_TAX_SUBSTANTIATION_AUTHORITY_FIRST",
    legalDimensions: ["SUBSTANTIVE", "EVIDENTIARY", "COMPLIANCE"],
    keywords: [
      "input vat",
      "input tax",
      "creditable input tax",
      "substantiation",
      "70% limit",
      "amortization",
      "capital goods",
      "input tax allocation",
      "invoice support",
      "official receipt support"
    ]
  },

  EXEMPTION: {
    code: "EXEMPTION",
    label: "Exemption — Section 109 NIRC exempt transactions and special law exemptions",
    controllingAuthorities: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
    primaryStatutes: ["NIRC Sec. 109", "RR 16-2005"],
    enginePath: VAT_IDENTITY_ENGINES.EXEMPTION,
    retrievalStrategy: "VAT_EXEMPTION_SECTION_109_AUTHORITY_FIRST",
    legalDimensions: ["SUBSTANTIVE"],
    keywords: [
      "vat exempt",
      "exempt from vat",
      "section 109",
      "exempt transaction",
      "non-vat",
      "special law exemption",
      "vat exemption",
      "exempt sale"
    ]
  },

  OUTPUT_TAX: {
    code: "OUTPUT_TAX",
    label: "Output Tax — Computation, invoice requirements, advance VAT",
    controllingAuthorities: ["STATUTE", "RR", "RMC", "SUPREME_COURT"],
    primaryStatutes: ["NIRC Secs. 106-108", "NIRC Sec. 110", "RR 16-2005"],
    enginePath: VAT_IDENTITY_ENGINES.OUTPUT_TAX,
    retrievalStrategy: "VAT_OUTPUT_TAX_COMPUTATION_INVOICING_FIRST",
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE", "ACCOUNTING"],
    keywords: [
      "output vat",
      "output tax",
      "vat on sales",
      "vatable sales",
      "vat computation",
      "invoice requirements",
      "advance vat",
      "gross selling price",
      "gross receipts",
      "vat billing"
    ]
  },

  REGISTRATION: {
    code: "REGISTRATION",
    label: "Registration — VAT registration threshold, optional registration, cancellation",
    controllingAuthorities: ["STATUTE", "RR", "RMC"],
    primaryStatutes: ["NIRC Sec. 236", "NIRC Sec. 109", "RR 16-2005"],
    enginePath: VAT_IDENTITY_ENGINES.REGISTRATION,
    retrievalStrategy: "VAT_REGISTRATION_COMPLIANCE_AUTHORITY_FIRST",
    legalDimensions: ["COMPLIANCE", "PROCEDURAL"],
    keywords: [
      "vat registration",
      "registration threshold",
      "optional vat registration",
      "cancellation",
      "vat taxpayer",
      "non-vat to vat",
      "3 million threshold",
      "bir registration"
    ]
  },

  COMPLIANCE: {
    code: "COMPLIANCE",
    label: "Compliance — Filing BIR Form 2550M/Q, deadlines, EFPS",
    controllingAuthorities: ["STATUTE", "RR", "RMC", "RMO"],
    primaryStatutes: ["NIRC Sec. 114", "RR 16-2005"],
    enginePath: VAT_IDENTITY_ENGINES.COMPLIANCE,
    retrievalStrategy: "VAT_COMPLIANCE_FILING_DEADLINE_AUTHORITY_FIRST",
    legalDimensions: ["COMPLIANCE", "PROCEDURAL"],
    keywords: [
      "2550m",
      "2550q",
      "vat return",
      "vat filing",
      "deadline",
      "due date",
      "efps",
      "filing",
      "payment",
      "slsp",
      "summary list"
    ]
  },

  WITHHOLDING_VAT: {
    code: "WITHHOLDING_VAT",
    label: "Withholding VAT — Government transactions and 5% final withholding VAT",
    controllingAuthorities: ["STATUTE", "RR", "RMC", "BIR_RULING"],
    primaryStatutes: ["NIRC Sec. 114(C)", "RR 16-2005"],
    enginePath: VAT_IDENTITY_ENGINES.WITHHOLDING_VAT,
    retrievalStrategy: "VAT_WITHHOLDING_GOVERNMENT_TRANSACTION_FIRST",
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE"],
    keywords: [
      "withholding vat",
      "5% final withholding vat",
      "government transaction",
      "government money payment",
      "final vat",
      "vat withheld",
      "withheld vat"
    ]
  },

  TRANSITIONAL: {
    code: "TRANSITIONAL",
    label: "Transitional — Input tax on beginning inventory and deemed transactions",
    controllingAuthorities: ["STATUTE", "RR", "RMC"],
    primaryStatutes: ["NIRC Sec. 111", "RR 16-2005"],
    enginePath: VAT_IDENTITY_ENGINES.TRANSITIONAL,
    retrievalStrategy: "VAT_TRANSITIONAL_INPUT_TAX_AUTHORITY_FIRST",
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE", "ACCOUNTING"],
    keywords: [
      "transitional input tax",
      "beginning inventory",
      "deemed transactions",
      "deemed sale",
      "change of status",
      "inventory input tax",
      "transitional"
    ]
  }
});

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

function scoreKeywords(text = "", keywords = []) {
  let score = 0;
  const matchedTerms = [];

  for (const keyword of keywords || []) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) continue;

    if (text.includes(normalizedKeyword)) {
      matchedTerms.push(keyword);
      score += normalizedKeyword.length >= 12 ? 2 : 1;
    }
  }

  return { score, matchedTerms };
}

export function getVatSubIssue(code = "") {
  const normalized = String(code || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return VAT_SUB_ISSUE_REGISTRY[normalized] || null;
}

export function listVatSubIssues() {
  return Object.values(VAT_SUB_ISSUE_REGISTRY).map((item) => ({
    code: item.code,
    label: item.label,
    primaryStatutes: item.primaryStatutes,
    controllingAuthorities: item.controllingAuthorities,
    enginePath: item.enginePath,
    retrievalStrategy: item.retrievalStrategy,
    legalDimensions: item.legalDimensions
  }));
}

export function classifyVatSubIssue(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);
  const priorSubIssue = String(options.priorSubIssue || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const candidates = [];

  for (const subIssue of Object.values(VAT_SUB_ISSUE_REGISTRY)) {
    const keywordScore = scoreKeywords(normalizedQuery, [
      subIssue.code,
      subIssue.label,
      ...(subIssue.keywords || []),
      ...(subIssue.primaryStatutes || [])
    ]);

    let score = keywordScore.score;

    if (priorSubIssue && priorSubIssue === subIssue.code) score += 5;

    if (score > 0) {
      candidates.push({
        code: subIssue.code,
        label: subIssue.label,
        score,
        matchedTerms: keywordScore.matchedTerms,
        enginePath: subIssue.enginePath,
        retrievalStrategy: subIssue.retrievalStrategy,
        primaryStatutes: subIssue.primaryStatutes,
        controllingAuthorities: subIssue.controllingAuthorities,
        legalDimensions: subIssue.legalDimensions
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const top = candidates[0] || {
    code: "DEFINITION",
    label: VAT_SUB_ISSUE_REGISTRY.DEFINITION.label,
    score: 0,
    matchedTerms: [],
    enginePath: VAT_IDENTITY_ENGINES.DEFINITION,
    retrievalStrategy: VAT_SUB_ISSUE_REGISTRY.DEFINITION.retrievalStrategy,
    primaryStatutes: VAT_SUB_ISSUE_REGISTRY.DEFINITION.primaryStatutes,
    controllingAuthorities: VAT_SUB_ISSUE_REGISTRY.DEFINITION.controllingAuthorities,
    legalDimensions: VAT_SUB_ISSUE_REGISTRY.DEFINITION.legalDimensions
  };

  const second = candidates[1] || null;

  const confidence =
    top.score <= 0
      ? 0.35
      : Number(
          Math.min(
            0.55 + top.score / 25 + Math.max(top.score - (second?.score || 0), 0) / 20,
            0.99
          ).toFixed(2)
        );

  return {
    domain: VAT_DOMAIN.code,
    domainName: VAT_DOMAIN.name,
    primarySubIssue: top.code,
    primarySubIssueLabel: top.label,
    enginePath: top.enginePath,
    retrievalStrategy: top.retrievalStrategy,
    governingStatutes: unique([...VAT_DOMAIN.primaryStatutes, ...(top.primaryStatutes || [])]),
    controllingAuthorities: top.controllingAuthorities,
    legalDimensions: top.legalDimensions,
    matchedTerms: top.matchedTerms,
    confidence,
    candidates
  };
}

export function buildVatClassificationObject({
  query = "",
  primaryIssue = "VAT_LIABILITY",
  priorSubIssue = "",
  targetAuthorities = [],
  legalDimensions = []
} = {}) {
  const classified = classifyVatSubIssue(query, { priorSubIssue });
  const subIssueConfig = getVatSubIssue(classified.primarySubIssue);

  const mergedAuthorities = sortAuthorityTypes(
    buildTargetAuthorityProfile({
      primaryDomain: VAT_DOMAIN.code,
      primaryIssue,
      subIssues: [classified.primarySubIssue],
      targetAuthorities: unique([
        ...VAT_DOMAIN.defaultAuthorities,
        ...(subIssueConfig?.controllingAuthorities || []),
        ...targetAuthorities
      ])
    })
  );

  return {
    engine: "tax-engines/VAT/domain-config.js",
    version: VAT_DOMAIN_CONFIG_VERSION,
    status: classified.confidence >= 0.7 ? "VAT_SUB_ISSUE_CLASSIFIED" : "LOW_CONFIDENCE_VAT_SUB_ISSUE_CLASSIFIED",

    primaryDomain: VAT_DOMAIN.code,
    primaryDomainName: VAT_DOMAIN.name,
    primaryIssue,
    primarySubIssue: classified.primarySubIssue,
    primarySubIssueLabel: classified.primarySubIssueLabel,
    subIssue: classified.primarySubIssue,
    subIssues: [classified.primarySubIssue],

    governingStatutes: classified.governingStatutes,
    primaryStatutes: VAT_DOMAIN.primaryStatutes,
    targetAuthorities: mergedAuthorities,
    controllingAuthorities: classified.controllingAuthorities,
    legalDimensions: unique([...classified.legalDimensions, ...legalDimensions]),

    retrievalStrategy: classified.retrievalStrategy,
    retrievalHints: {
      domainCode: VAT_DOMAIN.code,
      domainName: VAT_DOMAIN.name,
      primarySubIssue: classified.primarySubIssue,
      boostTerms: unique([
        VAT_DOMAIN.code,
        VAT_DOMAIN.name,
        ...VAT_DOMAIN.primaryStatutes,
        ...(subIssueConfig?.keywords || []),
        ...(subIssueConfig?.primaryStatutes || [])
      ]),
      preferredAuthorities: mergedAuthorities
    },

    engineRouting: {
      useDomainEngine: true,
      domainEnginePath: "./tax-engines/VAT/domain-config.js",
      useIdentityEngine: true,
      identityEnginePath: classified.enginePath,
      identityEngineCode: classified.primarySubIssue,
      requiresIssueSpecificRetrieval: true,
      requiresAuthorityHierarchy: true,
      requiresSupersessionCheck: true,
      requiresConflictCheck: ["REFUND_CREDIT", "ZERO_RATING", "EXEMPTION"].includes(classified.primarySubIssue),
      requiresJurisprudence: ["REFUND_CREDIT", "ZERO_RATING", "EXEMPTION", "DEFINITION"].includes(classified.primarySubIssue),
      requiresEvidenceEvaluation: ["REFUND_CREDIT", "INPUT_TAX", "ZERO_RATING", "COMPLIANCE"].includes(classified.primarySubIssue)
    },

    confidence: classified.confidence,
    classificationSignals: {
      matchedTerms: classified.matchedTerms,
      candidates: classified.candidates
    }
  };
}

export function mergeVatIntoIssueClassification(issueClassification = {}, query = "") {
  const vatClassification = buildVatClassificationObject({
    query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
    primaryIssue: issueClassification.primaryIssue || "VAT_LIABILITY",
    priorSubIssue:
      issueClassification.primarySubIssue ||
      issueClassification.subIssue ||
      issueClassification.taxDomainClassification?.primarySubIssue ||
      "",
    targetAuthorities: issueClassification.targetAuthorities || [],
    legalDimensions: issueClassification.legalDimensions || []
  });

  return {
    ...issueClassification,
    primaryDomain: "VAT",
    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),
      ...vatClassification
    },
    primarySubIssue: vatClassification.primarySubIssue,
    subIssue: vatClassification.primarySubIssue,
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      vatClassification.primarySubIssue
    ]),
    targetAuthorities: vatClassification.targetAuthorities,
    legalDimensions: vatClassification.legalDimensions,
    retrievalStrategy: vatClassification.retrievalStrategy,
    vatClassification
  };
}

export function vatDomainHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_DOMAIN_CONFIG",
    version: VAT_DOMAIN_CONFIG_VERSION,
    domain: VAT_DOMAIN.code,
    subIssueCount: Object.keys(VAT_SUB_ISSUE_REGISTRY).length,
    hasSeparateIdentityEngines: true,
    identityEngines: VAT_IDENTITY_ENGINES,
    supportsIssueClassificationEngine: true,
    supportsMainTaxEngineClassification: true,
    supportsRetrievalEngine: true,
    supportsRerankerEngine: true,
    supportsRagAnswerHandler: true
  };
}

export default {
  VAT_DOMAIN_CONFIG_VERSION,
  VAT_DOMAIN,
  VAT_SUB_ISSUE,
  VAT_IDENTITY_ENGINES,
  VAT_SUB_ISSUE_REGISTRY,
  getVatSubIssue,
  listVatSubIssues,
  classifyVatSubIssue,
  buildVatClassificationObject,
  mergeVatIntoIssueClassification,
  vatDomainHealthCheck
};
