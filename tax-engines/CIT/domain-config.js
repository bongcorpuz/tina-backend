// FILE: tax-engines/CIT/domain-config.js
"use strict";

/**
 * TINA CIT Domain Config — Corporate Income Tax
 * Version: 3.0.0
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../shared/authority-hierarchy.js";

export const DOMAIN_CONFIG_VERSION = "3.0.0";

export const PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS",
  "06_COURT_CASES"
]);

export const EXCLUDED_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

export const AUTHORITY_HIERARCHY = Object.freeze([
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

export const REQUIRED_ANSWER_SECTIONS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
  "D. SUPPORTING JURISPRUDENCE",
  "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "F. PRACTICAL NOTE / APPLICATION"
]);

export const CIT_DOMAIN = Object.freeze({
  code: "CIT",
  domainCode: "CIT",
  name: "Corporate Income Tax",
  domainName: "Corporate Income Tax",
  domainLabel: "CIT — Corporate Income Tax",
  title: "Corporate Income Tax",
  domainDescription:
    "CIT is the income tax imposed on domestic corporations, resident foreign corporations, and non-resident foreign corporations on their taxable income from all sources within and without the Philippines, subject to the NIRC, CREATE Act, applicable regulations, and special laws.",
  primaryStatutes: ["NIRC Title II", "NIRC Secs. 27–31", "NIRC Sec. 34"],
  primaryRegulations: ["RR 2-1940", "RR 9-2021 (CREATE)"],
  primaryAuthorities: ["NIRC Secs. 27–31", "RR 2-1940", "RR 9-2021"],
  defaultAuthorities: [
    "STATUTE", "RR", "RMC", "BIR_RULING", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"
  ],
  defaultRetrievalStrategy: "CIT_GENERAL_AUTHORITY_FIRST",
  baseRetrievalStrategy: "CIT_DOMAIN_ISSUE_SPECIFIC_RETRIEVAL",
  priorityFolders: PRIORITY_FOLDERS,
  excludedFolders: EXCLUDED_FOLDERS,
  authorityHierarchy: AUTHORITY_HIERARCHY,
  defaultAnswerSections: REQUIRED_ANSWER_SECTIONS,
  requiredAnswerSections: REQUIRED_ANSWER_SECTIONS,
  sourceGroundingRequired: true,
  compactSourcesOnly: true
});

export const SUB_ISSUE = Object.freeze({
  RCIT: "RCIT",
  MCIT: "MCIT",
  NOLCO: "NOLCO",
  GROSS_INCOME: "GROSS_INCOME",
  DEDUCTIONS: "DEDUCTIONS",
  CAPITAL_GAINS: "CAPITAL_GAINS",
  RELATED_PARTY: "RELATED_PARTY",
  CREATE_INCENTIVES: "CREATE_INCENTIVES",
  DIVIDENDS: "DIVIDENDS",
  PASSIVE_INCOME: "PASSIVE_INCOME",
  TAX_TREATY: "TAX_TREATY"
});

function buildSubIssueConfig({
  subIssue,
  label,
  description,
  keywords = [],
  aliases = [],
  retrievalStrategy,
  targetAuthorities = [],
  controllingAuthorities = [],
  supportingAuthorities = [],
  supportingJurisprudence = [],
  tpmProfile = "STANDARD",
  legalDimensions = [],
  conflictSensitive = false,
  doctrineSensitive = true,
  complianceSensitive = false,
  computationSensitive = false,
  auditRiskSensitive = false
}) {
  return Object.freeze({
    code: subIssue,
    subIssue,
    label,
    description,
    keywords,
    aliases,
    retrievalStrategy,
    targetAuthorities,
    controllingAuthorities,
    supportingAuthorities,
    supportingJurisprudence,
    priorityFolders: PRIORITY_FOLDERS,
    excludedFolders: EXCLUDED_FOLDERS,
    requiredAnswerSections: REQUIRED_ANSWER_SECTIONS,
    tpmProfile,
    sourceGroundingRequired: true,
    authorityHierarchy: AUTHORITY_HIERARCHY,
    legalDimensions,
    conflictSensitive,
    doctrineSensitive,
    complianceSensitive,
    computationSensitive,
    auditRiskSensitive,
    enginePath: `./engines/${subIssue.toLowerCase().replace(/_/g, "-")}-engine.js`
  });
}

export const SUB_ISSUE_REGISTRY = Object.freeze({
  RCIT: buildSubIssueConfig({
    subIssue: "RCIT",
    label: "Regular CIT — NIRC Sec. 27(A)",
    description: "Regular Corporate Income Tax at the applicable rate on net taxable income of domestic and resident foreign corporations.",
    keywords: ["rcit", "regular corporate income tax", "25%", "20%", "net taxable income", "domestic corporation", "resident foreign corporation", "corporate tax rate"],
    aliases: ["REGULAR_CIT", "REGULAR_CORPORATE_INCOME_TAX"],
    retrievalStrategy: "CIT_RCIT_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 27(A)", "RR 2-1940", "RR 9-2021", "CIR v. Filinvest Development Corp"],
    controllingAuthorities: ["NIRC Sec. 27(A)", "RR 2-1940"],
    supportingAuthorities: ["RR 9-2021"],
    supportingJurisprudence: ["CIR v. Filinvest Development Corp"],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"],
    computationSensitive: true
  }),

  MCIT: buildSubIssueConfig({
    subIssue: "MCIT",
    label: "Minimum CIT — NIRC Sec. 27(E)",
    description: "Minimum Corporate Income Tax equal to 2% (1% under CREATE transition) of gross income when it exceeds the RCIT.",
    keywords: ["mcit", "minimum corporate income tax", "minimum cit", "2% gross income", "1% gross income", "gross income tax", "sec. 27(e)", "section 27e"],
    aliases: ["MINIMUM_CIT", "MINIMUM_CORPORATE_INCOME_TAX"],
    retrievalStrategy: "CIT_MCIT_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 27(E)", "RR 9-98", "RMC 4-2003"],
    controllingAuthorities: ["NIRC Sec. 27(E)", "RR 9-98"],
    supportingAuthorities: ["RMC 4-2003"],
    supportingJurisprudence: [],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"],
    computationSensitive: true
  }),

  NOLCO: buildSubIssueConfig({
    subIssue: "NOLCO",
    label: "Net Operating Loss Carryover — NIRC Sec. 34(D)(3)",
    description: "Net operating loss carryover; carry-forward of net operating losses of domestic corporations.",
    keywords: ["nolco", "net operating loss", "loss carry-over", "loss carryover", "carry forward loss", "sec. 34(d)(3)", "section 34d3", "operating loss"],
    aliases: ["NET_OPERATING_LOSS", "LOSS_CARRYOVER"],
    retrievalStrategy: "CIT_NOLCO_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 34(D)(3)", "RR 14-2001"],
    controllingAuthorities: ["NIRC Sec. 34(D)(3)", "RR 14-2001"],
    supportingAuthorities: [],
    supportingJurisprudence: [],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"],
    computationSensitive: true
  }),

  GROSS_INCOME: buildSubIssueConfig({
    subIssue: "GROSS_INCOME",
    label: "Gross Income — NIRC Sec. 32",
    description: "Gross income inclusions and exclusions for corporate income tax purposes.",
    keywords: ["gross income", "income inclusion", "income exclusion", "sec. 32", "section 32", "taxable income", "income recognition", "all sources"],
    aliases: ["CIT_GROSS_INCOME", "INCOME_INCLUSION"],
    retrievalStrategy: "CIT_GROSS_INCOME_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 32", "RR 2-1940"],
    controllingAuthorities: ["NIRC Sec. 32", "RR 2-1940"],
    supportingAuthorities: [],
    supportingJurisprudence: [],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"],
    computationSensitive: true
  }),

  DEDUCTIONS: buildSubIssueConfig({
    subIssue: "DEDUCTIONS",
    label: "Allowable Deductions — NIRC Sec. 34",
    description: "Ordinary and necessary business expenses, interest, taxes, losses, depreciation, and other allowable deductions; optional standard deduction.",
    keywords: ["deduction", "allowable deduction", "ordinary and necessary", "business expense", "interest expense", "depreciation", "osd", "optional standard deduction", "sec. 34", "section 34", "substantiation", "non-deductible"],
    aliases: ["ALLOWABLE_DEDUCTIONS", "BUSINESS_EXPENSE", "OSD"],
    retrievalStrategy: "CIT_DEDUCTIONS_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 34", "RR 2-1940", "RR 16-2008"],
    controllingAuthorities: ["NIRC Sec. 34", "RR 2-1940", "RR 16-2008"],
    supportingAuthorities: [],
    supportingJurisprudence: [],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION", "EVIDENTIARY"],
    computationSensitive: true,
    auditRiskSensitive: true
  }),

  CAPITAL_GAINS: buildSubIssueConfig({
    subIssue: "CAPITAL_GAINS",
    label: "Capital Gains (Corporate) — NIRC Secs. 27(D)(2), 27(D)(5)",
    description: "Final tax on capital gains from sale of shares and real property for domestic corporations.",
    keywords: ["capital gains", "capital gains tax", "cgt", "sale of shares", "sale of real property", "sec. 27(d)(2)", "sec. 27(d)(5)", "final capital gains tax", "unlisted shares"],
    aliases: ["CORPORATE_CAPITAL_GAINS", "CGT_CORPORATE"],
    retrievalStrategy: "CIT_CAPITAL_GAINS_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 27(D)(2)", "NIRC Sec. 27(D)(5)", "RR 7-2003"],
    controllingAuthorities: ["NIRC Sec. 27(D)(2)", "NIRC Sec. 27(D)(5)", "RR 7-2003"],
    supportingAuthorities: [],
    supportingJurisprudence: [],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"],
    computationSensitive: true
  }),

  RELATED_PARTY: buildSubIssueConfig({
    subIssue: "RELATED_PARTY",
    label: "Related Party Transactions — NIRC Sec. 50",
    description: "Transfer pricing; arm's length principle; related party transactions; Section 50 allocation.",
    keywords: ["related party", "transfer pricing", "arm's length", "intercompany", "sec. 50", "section 50", "rr 2-2013", "tp documentation", "controlled transaction"],
    aliases: ["TRANSFER_PRICING", "RELATED_PARTY_TRANSACTIONS", "SECTION_50"],
    retrievalStrategy: "CIT_RELATED_PARTY_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 50", "RR 2-2013", "Filinvest Development Corp v. CIR"],
    controllingAuthorities: ["NIRC Sec. 50", "RR 2-2013"],
    supportingAuthorities: [],
    supportingJurisprudence: ["Filinvest Development Corp v. CIR"],
    legalDimensions: ["SUBSTANTIVE", "EVIDENTIARY", "COMPUTATION"],
    conflictSensitive: true,
    auditRiskSensitive: true
  }),

  CREATE_INCENTIVES: buildSubIssueConfig({
    subIssue: "CREATE_INCENTIVES",
    label: "CREATE Act Incentives — RA 11534",
    description: "Fiscal incentives under the CREATE Act; SCIT; EDR; income tax holiday; PEZA/BOI incentives under CREATE.",
    keywords: ["create act", "ra 11534", "create incentives", "scit", "special corporate income tax", "edr", "enhanced deductions", "income tax holiday", "ith", "rr 9-2021", "rmc 28-2021", "fiscal incentives"],
    aliases: ["CREATE_ACT", "RA_11534", "SCIT", "EDR"],
    retrievalStrategy: "CIT_CREATE_INCENTIVES_AUTHORITY_FIRST",
    targetAuthorities: ["RA 11534", "RR 9-2021", "RMC 28-2021"],
    controllingAuthorities: ["RA 11534", "RR 9-2021", "RMC 28-2021"],
    supportingAuthorities: [],
    supportingJurisprudence: [],
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE"],
    complianceSensitive: true
  }),

  DIVIDENDS: buildSubIssueConfig({
    subIssue: "DIVIDENDS",
    label: "Dividend Income — NIRC Secs. 27(D)(4), 28(B)(5)(b)",
    description: "Tax treatment of dividend income received by domestic and foreign corporations; intercorporate dividend exemption.",
    keywords: ["dividend", "dividend income", "intercorporate dividend", "sec. 27(d)(4)", "sec. 28(b)(5)(b)", "dividends received", "stock dividend", "cash dividend"],
    aliases: ["DIVIDEND_INCOME", "INTERCORPORATE_DIVIDEND"],
    retrievalStrategy: "CIT_DIVIDENDS_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 27(D)(4)", "NIRC Sec. 28(B)(5)(b)"],
    controllingAuthorities: ["NIRC Sec. 27(D)(4)", "NIRC Sec. 28(B)(5)(b)"],
    supportingAuthorities: [],
    supportingJurisprudence: [],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"]
  }),

  PASSIVE_INCOME: buildSubIssueConfig({
    subIssue: "PASSIVE_INCOME",
    label: "Passive Income (Corporate) — NIRC Sec. 27(D)(1)-(3)",
    description: "Final tax on passive income of domestic corporations: interest, royalties, and prizes.",
    keywords: ["passive income", "interest income", "royalty income", "prize", "final tax", "sec. 27(d)", "section 27d", "corporate passive income", "final withholding"],
    aliases: ["CORPORATE_PASSIVE_INCOME", "FINAL_TAX_CORPORATE"],
    retrievalStrategy: "CIT_PASSIVE_INCOME_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 27(D)", "RR 2-1940"],
    controllingAuthorities: ["NIRC Sec. 27(D)", "RR 2-1940"],
    supportingAuthorities: [],
    supportingJurisprudence: [],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"],
    computationSensitive: true
  }),

  TAX_TREATY: buildSubIssueConfig({
    subIssue: "TAX_TREATY",
    label: "Tax Treaty Application (CIT) — Applicable DTAs",
    description: "Application of double tax agreements to corporate income tax; treaty relief; non-resident foreign corporation taxation.",
    keywords: ["tax treaty", "double tax agreement", "dta", "treaty relief", "non-resident foreign corporation", "nrfc", "rmc 46-2020", "tax treaty relief", "treaty benefit"],
    aliases: ["TAX_TREATY_CIT", "DOUBLE_TAX_AGREEMENT", "DTA_CIT"],
    retrievalStrategy: "CIT_TAX_TREATY_AUTHORITY_FIRST",
    targetAuthorities: ["Applicable Double Tax Agreement", "NIRC Sec. 28", "RMC 46-2020", "OECD Model Tax Convention"],
    controllingAuthorities: ["Applicable Double Tax Agreement", "NIRC Sec. 28", "RMC 46-2020"],
    supportingAuthorities: ["OECD Model Tax Convention"],
    supportingJurisprudence: [],
    legalDimensions: ["SUBSTANTIVE", "PROCEDURAL"],
    conflictSensitive: true
  })
});

function normalizeCode(value = "") {
  return String(value || "").trim().toUpperCase().replace(/[\s/-]+/g, "_");
}

function normalizeText(value = "") {
  return String(value || "").toLowerCase().replace(/[^\w\s%+./()–—-]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreKeywords(text = "", terms = []) {
  let score = 0;
  const matchedTerms = [];
  for (const term of terms || []) {
    const n = normalizeText(term);
    if (!n) continue;
    if (text.includes(n)) {
      matchedTerms.push(term);
      score += n.length >= 14 ? 3 : n.length >= 8 ? 2 : 1;
    }
  }
  return { score, matchedTerms };
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

export function getDomainConfig() {
  return {
    engine: "tax-engines/CIT/domain-config.js",
    version: DOMAIN_CONFIG_VERSION,
    domain: CIT_DOMAIN,
    subIssues: SUB_ISSUE_REGISTRY,
    priorityFolders: PRIORITY_FOLDERS,
    excludedFolders: EXCLUDED_FOLDERS,
    authorityHierarchy: AUTHORITY_HIERARCHY,
    answerSections: { default: REQUIRED_ANSWER_SECTIONS }
  };
}

export function getSubIssue(code = "") {
  const n = normalizeCode(code);
  return SUB_ISSUE_REGISTRY[n] || null;
}

export function classifyCITSubIssue(query = "", options = {}) {
  const nq = normalizeText(query);
  const priorSubIssue = normalizeCode(options.priorSubIssue || "");
  const candidates = [];

  for (const si of Object.values(SUB_ISSUE_REGISTRY)) {
    const ks = scoreKeywords(nq, [si.code, si.subIssue, si.label, si.description, ...(si.keywords || []), ...(si.aliases || []), ...(si.controllingAuthorities || [])]);
    let score = ks.score;
    if (priorSubIssue && priorSubIssue === si.code) score += 8;
    if (score > 0) candidates.push({ ...si, score, matchedTerms: ks.matchedTerms });
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0] || { ...SUB_ISSUE_REGISTRY.RCIT, score: 0, matchedTerms: [] };
  const second = candidates[1] || null;
  const confidence = top.score <= 0 ? 0.35 : Number(Math.min(0.55 + top.score / 30 + Math.max(top.score - (second?.score || 0), 0) / 25, 0.99).toFixed(2));

  return {
    domain: CIT_DOMAIN.code, domainCode: CIT_DOMAIN.code, domainName: CIT_DOMAIN.name,
    primarySubIssue: top.code, subIssue: top.code, primarySubIssueLabel: top.label,
    targetAuthorities: top.targetAuthorities, controllingAuthorities: top.controllingAuthorities,
    supportingAuthorities: top.supportingAuthorities, supportingJurisprudence: top.supportingJurisprudence,
    priorityFolders: PRIORITY_FOLDERS, excludedFolders: EXCLUDED_FOLDERS,
    requiredAnswerSections: REQUIRED_ANSWER_SECTIONS, tpmProfile: top.tpmProfile,
    sourceGroundingRequired: true, legalDimensions: top.legalDimensions || [],
    matchedTerms: top.matchedTerms, confidence,
    fallbackClassificationUsed: top.score <= 0,
    distinctionRequired: !!second && top.code !== second.code && top.score - second.score <= 2,
    candidates
  };
}

export function buildCITClassificationObject({ query = "", primaryIssue = "CIT", priorSubIssue = "", targetAuthorities = [], legalDimensions = [], reviewMode = false } = {}) {
  const classified = classifyCITSubIssue(query, { priorSubIssue });
  const authorityTypes = sortAuthorityTypes(buildTargetAuthorityProfile({
    primaryDomain: CIT_DOMAIN.code, primaryIssue,
    subIssues: [classified.primarySubIssue],
    targetAuthorities: unique([...CIT_DOMAIN.defaultAuthorities, ...targetAuthorities])
  }));

  return {
    engine: "tax-engines/CIT/domain-config.js", version: DOMAIN_CONFIG_VERSION,
    status: classified.confidence >= 0.7 ? "CIT_SUB_ISSUE_CLASSIFIED" : "LOW_CONFIDENCE_CIT_SUB_ISSUE_CLASSIFIED",
    primaryDomain: CIT_DOMAIN.code, domainCode: CIT_DOMAIN.code, domainName: CIT_DOMAIN.name,
    primaryIssue, primarySubIssue: classified.primarySubIssue, subIssue: classified.primarySubIssue,
    primaryStatutes: CIT_DOMAIN.primaryStatutes, primaryRegulations: CIT_DOMAIN.primaryRegulations,
    targetAuthorities: unique([...(classified.targetAuthorities || []), ...targetAuthorities]),
    targetAuthorityTypes: authorityTypes,
    controllingAuthorities: classified.controllingAuthorities,
    supportingAuthorities: classified.supportingAuthorities,
    supportingJurisprudence: classified.supportingJurisprudence,
    priorityFolders: PRIORITY_FOLDERS,
    excludedFolders: reviewMode ? [] : EXCLUDED_FOLDERS,
    requiredAnswerSections: REQUIRED_ANSWER_SECTIONS,
    tpmProfile: classified.tpmProfile, sourceGroundingRequired: true,
    authorityHierarchy: AUTHORITY_HIERARCHY,
    legalDimensions: unique([...(classified.legalDimensions || []), ...legalDimensions]),
    confidence: classified.confidence, fallbackClassificationUsed: classified.fallbackClassificationUsed
  };
}

export function mergeCITIntoIssueClassification(issueClassification = {}, query = "") {
  const citClassification = buildCITClassificationObject({
    query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
    primaryIssue: issueClassification.primaryIssue || "CIT",
    priorSubIssue: issueClassification.primarySubIssue || issueClassification.subIssue || "",
    targetAuthorities: issueClassification.targetAuthorities || [],
    legalDimensions: issueClassification.legalDimensions || [],
    reviewMode: issueClassification.reviewMode === true
  });

  return {
    ...issueClassification,
    primaryDomain: "CIT", domainCode: "CIT", domainName: CIT_DOMAIN.name,
    taxDomainClassification: { ...(issueClassification.taxDomainClassification || {}), ...citClassification },
    primarySubIssue: citClassification.primarySubIssue, subIssue: citClassification.primarySubIssue,
    targetAuthorities: citClassification.targetAuthorities,
    controllingAuthorities: citClassification.controllingAuthorities,
    supportingAuthorities: citClassification.supportingAuthorities,
    supportingJurisprudence: citClassification.supportingJurisprudence,
    priorityFolders: citClassification.priorityFolders,
    excludedFolders: citClassification.excludedFolders,
    requiredAnswerSections: citClassification.requiredAnswerSections,
    tpmProfile: citClassification.tpmProfile, sourceGroundingRequired: true,
    legalDimensions: citClassification.legalDimensions,
    citClassification
  };
}

export function citDomainHealthCheck() {
  return {
    ok: true, engine: "TINA_CIT_DOMAIN_CONFIG", version: DOMAIN_CONFIG_VERSION,
    domain: CIT_DOMAIN.code, subIssueCount: Object.keys(SUB_ISSUE_REGISTRY).length,
    noOpenAICalls: true, noDirectRetrieval: true, noFinalAnswerGeneration: true,
    sourceGroundingRequired: true
  };
}

export default {
  DOMAIN_CONFIG_VERSION, CIT_DOMAIN, SUB_ISSUE, SUB_ISSUE_REGISTRY,
  PRIORITY_FOLDERS, EXCLUDED_FOLDERS, AUTHORITY_HIERARCHY, REQUIRED_ANSWER_SECTIONS,
  getDomainConfig, getSubIssue, classifyCITSubIssue, buildCITClassificationObject,
  mergeCITIntoIssueClassification, citDomainHealthCheck
};
