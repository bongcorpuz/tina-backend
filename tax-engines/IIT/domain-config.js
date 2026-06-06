// FILE: tax-engines/IIT/domain-config.js
"use strict";

/**
 * TINA IIT Domain Config — Individual Income Tax
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

export const IIT_DOMAIN = Object.freeze({
  code: "IIT",
  domainCode: "IIT",
  name: "Individual Income Tax",
  domainName: "Individual Income Tax",
  domainLabel: "IIT — Individual Income Tax",
  title: "Individual Income Tax",
  domainDescription:
    "IIT is the income tax imposed on individual taxpayers (residents, non-residents, special aliens) on compensation, business, professional, mixed income, and passive income, subject to the NIRC, TRAIN Law, and applicable regulations.",
  primaryStatutes: ["NIRC Title II Part II", "NIRC Secs. 24–26"],
  primaryRegulations: ["RR 2-1940", "RR 8-2018 (TRAIN)"],
  primaryAuthorities: ["NIRC Secs. 24–26", "RR 2-1940", "RR 8-2018"],
  defaultAuthorities: [
    "STATUTE", "RR", "RMC", "BIR_RULING", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"
  ],
  defaultRetrievalStrategy: "IIT_GENERAL_AUTHORITY_FIRST",
  baseRetrievalStrategy: "IIT_DOMAIN_ISSUE_SPECIFIC_RETRIEVAL",
  priorityFolders: PRIORITY_FOLDERS,
  excludedFolders: EXCLUDED_FOLDERS,
  authorityHierarchy: AUTHORITY_HIERARCHY,
  defaultAnswerSections: REQUIRED_ANSWER_SECTIONS,
  requiredAnswerSections: REQUIRED_ANSWER_SECTIONS,
  sourceGroundingRequired: true,
  compactSourcesOnly: true
});

export const SUB_ISSUE = Object.freeze({
  COMPENSATION: "COMPENSATION",
  SELF_EMPLOYMENT: "SELF_EMPLOYMENT",
  MIXED_INCOME: "MIXED_INCOME",
  DE_MINIMIS: "DE_MINIMIS",
  THIRTEENTH_MONTH: "THIRTEENTH_MONTH",
  FRINGE_BENEFITS: "FRINGE_BENEFITS",
  PASSIVE_INCOME_IIT: "PASSIVE_INCOME_IIT",
  CAPITAL_GAINS_IIT: "CAPITAL_GAINS_IIT",
  NON_RESIDENT_ALIEN: "NON_RESIDENT_ALIEN",
  EXPATRIATE: "EXPATRIATE"
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
    code: subIssue, subIssue, label, description, keywords, aliases,
    retrievalStrategy, targetAuthorities, controllingAuthorities,
    supportingAuthorities, supportingJurisprudence,
    priorityFolders: PRIORITY_FOLDERS, excludedFolders: EXCLUDED_FOLDERS,
    requiredAnswerSections: REQUIRED_ANSWER_SECTIONS, tpmProfile,
    sourceGroundingRequired: true, authorityHierarchy: AUTHORITY_HIERARCHY,
    legalDimensions, conflictSensitive, doctrineSensitive,
    complianceSensitive, computationSensitive, auditRiskSensitive,
    enginePath: `./engines/${subIssue.toLowerCase().replace(/_/g, "-")}-engine.js`
  });
}

export const SUB_ISSUE_REGISTRY = Object.freeze({
  COMPENSATION: buildSubIssueConfig({
    subIssue: "COMPENSATION",
    label: "Compensation Income — NIRC Sec. 24(A)",
    description: "Taxation of compensation income including salaries, wages, allowances, and other emoluments of employees.",
    keywords: ["compensation", "salary", "wages", "employee income", "sec. 24(a)", "section 24a", "compensation income", "employment income", "withholding on compensation"],
    aliases: ["COMPENSATION_INCOME", "SALARY_INCOME"],
    retrievalStrategy: "IIT_COMPENSATION_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 24(A)", "RR 2-1998", "RR 8-2018"],
    controllingAuthorities: ["NIRC Sec. 24(A)", "RR 2-1998", "RR 8-2018"],
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE", "COMPUTATION"],
    computationSensitive: true
  }),

  SELF_EMPLOYMENT: buildSubIssueConfig({
    subIssue: "SELF_EMPLOYMENT",
    label: "Self-Employment/Business Income — NIRC Sec. 24(A)(2)",
    description: "Taxation of self-employed individuals and professionals; graduated rates or 8% flat tax option.",
    keywords: ["self-employed", "self employment", "professional income", "business income", "8%", "eight percent", "sec. 24(a)(2)", "section 24a2", "freelancer", "independent contractor"],
    aliases: ["SELF_EMPLOYED", "PROFESSIONAL_INCOME", "BUSINESS_INCOME_IIT"],
    retrievalStrategy: "IIT_SELF_EMPLOYMENT_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 24(A)(2)", "RR 8-2018"],
    controllingAuthorities: ["NIRC Sec. 24(A)(2)", "RR 8-2018"],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"],
    computationSensitive: true
  }),

  MIXED_INCOME: buildSubIssueConfig({
    subIssue: "MIXED_INCOME",
    label: "Mixed Income — NIRC Sec. 24(A)(2)(b)",
    description: "Taxation of individuals earning both compensation and business/professional income.",
    keywords: ["mixed income", "compensation and business", "sec. 24(a)(2)(b)", "rmc 50-2018", "mixed income earner"],
    aliases: ["MIXED_INCOME_EARNER"],
    retrievalStrategy: "IIT_MIXED_INCOME_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 24(A)(2)(b)", "RMC 50-2018"],
    controllingAuthorities: ["NIRC Sec. 24(A)(2)(b)", "RMC 50-2018"],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"],
    computationSensitive: true
  }),

  DE_MINIMIS: buildSubIssueConfig({
    subIssue: "DE_MINIMIS",
    label: "De Minimis Benefits — NIRC Sec. 33",
    description: "Tax-exempt de minimis benefits; nature, limits, and exclusions from gross income.",
    keywords: ["de minimis", "de minimis benefits", "rice allowance", "uniform allowance", "sec. 33", "section 33", "rr 3-1998", "rr 11-2018", "non-taxable benefit"],
    aliases: ["DE_MINIMIS_BENEFITS", "TAX_EXEMPT_BENEFITS"],
    retrievalStrategy: "IIT_DE_MINIMIS_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 33", "RR 3-1998", "RR 11-2018"],
    controllingAuthorities: ["NIRC Sec. 33", "RR 3-1998", "RR 11-2018"],
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE"]
  }),

  THIRTEENTH_MONTH: buildSubIssueConfig({
    subIssue: "THIRTEENTH_MONTH",
    label: "13th Month Pay — NIRC Sec. 32(B)(7)(e)",
    description: "Tax exemption of 13th month pay and other benefits up to the statutory threshold.",
    keywords: ["13th month", "thirteenth month", "13th month pay", "year-end bonus", "sec. 32(b)(7)(e)", "rr 8-2000", "rr 8-2018", "90000", "90,000", "tax exempt bonus"],
    aliases: ["THIRTEENTH_MONTH_PAY", "13TH_MONTH", "YEAR_END_BONUS"],
    retrievalStrategy: "IIT_THIRTEENTH_MONTH_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 32(B)(7)(e)", "RR 8-2000", "RR 8-2018"],
    controllingAuthorities: ["NIRC Sec. 32(B)(7)(e)", "RR 8-2000", "RR 8-2018"],
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE"]
  }),

  FRINGE_BENEFITS: buildSubIssueConfig({
    subIssue: "FRINGE_BENEFITS",
    label: "Fringe Benefits Tax — NIRC Sec. 33",
    description: "Fringe benefits tax imposed on managerial and supervisory employees; tax base and rate.",
    keywords: ["fringe benefit", "fringe benefits tax", "fbt", "managerial employee", "supervisory employee", "sec. 33", "section 33", "rr 3-1998", "company car", "housing benefit"],
    aliases: ["FBT", "FRINGE_BENEFITS_TAX"],
    retrievalStrategy: "IIT_FRINGE_BENEFITS_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 33", "RR 3-1998"],
    controllingAuthorities: ["NIRC Sec. 33", "RR 3-1998"],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"],
    computationSensitive: true
  }),

  PASSIVE_INCOME_IIT: buildSubIssueConfig({
    subIssue: "PASSIVE_INCOME_IIT",
    label: "Passive Income (Individual) — NIRC Sec. 24(B)-(D)",
    description: "Final tax on passive income of individual taxpayers: interest, royalties, prizes, and other income.",
    keywords: ["passive income", "interest income individual", "royalty individual", "final tax individual", "sec. 24(b)", "sec. 24(c)", "sec. 24(d)", "section 24b", "individual passive income"],
    aliases: ["INDIVIDUAL_PASSIVE_INCOME", "FINAL_TAX_IIT"],
    retrievalStrategy: "IIT_PASSIVE_INCOME_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 24(B)", "NIRC Sec. 24(C)", "NIRC Sec. 24(D)"],
    controllingAuthorities: ["NIRC Sec. 24(B)", "NIRC Sec. 24(C)", "NIRC Sec. 24(D)"],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"],
    computationSensitive: true
  }),

  CAPITAL_GAINS_IIT: buildSubIssueConfig({
    subIssue: "CAPITAL_GAINS_IIT",
    label: "Capital Gains (Individual) — NIRC Secs. 24(C), 24(D)",
    description: "Capital gains tax on sale of shares and real property by individuals.",
    keywords: ["capital gains individual", "capital gains tax individual", "cgt individual", "sale of shares individual", "sale of real property individual", "sec. 24(c)", "sec. 24(d)", "rr 7-2003"],
    aliases: ["INDIVIDUAL_CAPITAL_GAINS", "CGT_IIT"],
    retrievalStrategy: "IIT_CAPITAL_GAINS_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 24(C)", "NIRC Sec. 24(D)", "RR 7-2003"],
    controllingAuthorities: ["NIRC Sec. 24(C)", "NIRC Sec. 24(D)", "RR 7-2003"],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"],
    computationSensitive: true
  }),

  NON_RESIDENT_ALIEN: buildSubIssueConfig({
    subIssue: "NON_RESIDENT_ALIEN",
    label: "Non-Resident Alien — NIRC Sec. 25",
    description: "Taxation of non-resident alien individuals engaged or not engaged in trade or business in the Philippines.",
    keywords: ["non-resident alien", "nra", "non resident alien", "sec. 25", "section 25", "alien individual", "nraetb", "nranetb", "foreign individual"],
    aliases: ["NRA", "NONRESIDENT_ALIEN", "NON_RESIDENT_ALIEN_INDIVIDUAL"],
    retrievalStrategy: "IIT_NON_RESIDENT_ALIEN_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 25", "RR 2-1940"],
    controllingAuthorities: ["NIRC Sec. 25", "RR 2-1940"],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"]
  }),

  EXPATRIATE: buildSubIssueConfig({
    subIssue: "EXPATRIATE",
    label: "Expatriate/Special Alien — NIRC Sec. 25(C)-(E)",
    description: "Special tax rates for alien individuals occupying managerial and technical positions in certain entities.",
    keywords: ["expatriate", "special alien", "alien executive", "regional headquarters", "offshore banking unit", "sec. 25(c)", "sec. 25(d)", "sec. 25(e)", "rr 3-1998", "foreign national"],
    aliases: ["SPECIAL_ALIEN", "EXPAT", "ALIEN_EXECUTIVE"],
    retrievalStrategy: "IIT_EXPATRIATE_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 25(C)", "NIRC Sec. 25(D)", "NIRC Sec. 25(E)", "RR 3-1998"],
    controllingAuthorities: ["NIRC Sec. 25(C)", "NIRC Sec. 25(D)", "NIRC Sec. 25(E)", "RR 3-1998"],
    legalDimensions: ["SUBSTANTIVE", "COMPUTATION"],
    computationSensitive: true
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
    engine: "tax-engines/IIT/domain-config.js", version: DOMAIN_CONFIG_VERSION,
    domain: IIT_DOMAIN, subIssues: SUB_ISSUE_REGISTRY,
    priorityFolders: PRIORITY_FOLDERS, excludedFolders: EXCLUDED_FOLDERS,
    authorityHierarchy: AUTHORITY_HIERARCHY, answerSections: { default: REQUIRED_ANSWER_SECTIONS }
  };
}

export function getSubIssue(code = "") {
  return SUB_ISSUE_REGISTRY[normalizeCode(code)] || null;
}

export function classifyIITSubIssue(query = "", options = {}) {
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
  const top = candidates[0] || { ...SUB_ISSUE_REGISTRY.COMPENSATION, score: 0, matchedTerms: [] };
  const second = candidates[1] || null;
  const confidence = top.score <= 0 ? 0.35 : Number(Math.min(0.55 + top.score / 30 + Math.max(top.score - (second?.score || 0), 0) / 25, 0.99).toFixed(2));

  return {
    domain: IIT_DOMAIN.code, domainCode: IIT_DOMAIN.code, domainName: IIT_DOMAIN.name,
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

export function buildIITClassificationObject({ query = "", primaryIssue = "IIT", priorSubIssue = "", targetAuthorities = [], legalDimensions = [], reviewMode = false } = {}) {
  const classified = classifyIITSubIssue(query, { priorSubIssue });
  const authorityTypes = sortAuthorityTypes(buildTargetAuthorityProfile({
    primaryDomain: IIT_DOMAIN.code, primaryIssue,
    subIssues: [classified.primarySubIssue],
    targetAuthorities: unique([...IIT_DOMAIN.defaultAuthorities, ...targetAuthorities])
  }));

  return {
    engine: "tax-engines/IIT/domain-config.js", version: DOMAIN_CONFIG_VERSION,
    status: classified.confidence >= 0.7 ? "IIT_SUB_ISSUE_CLASSIFIED" : "LOW_CONFIDENCE_IIT_SUB_ISSUE_CLASSIFIED",
    primaryDomain: IIT_DOMAIN.code, domainCode: IIT_DOMAIN.code, domainName: IIT_DOMAIN.name,
    primaryIssue, primarySubIssue: classified.primarySubIssue, subIssue: classified.primarySubIssue,
    primaryStatutes: IIT_DOMAIN.primaryStatutes, primaryRegulations: IIT_DOMAIN.primaryRegulations,
    targetAuthorities: unique([...(classified.targetAuthorities || []), ...targetAuthorities]),
    targetAuthorityTypes: authorityTypes,
    controllingAuthorities: classified.controllingAuthorities,
    supportingAuthorities: classified.supportingAuthorities,
    supportingJurisprudence: classified.supportingJurisprudence,
    priorityFolders: PRIORITY_FOLDERS, excludedFolders: reviewMode ? [] : EXCLUDED_FOLDERS,
    requiredAnswerSections: REQUIRED_ANSWER_SECTIONS, tpmProfile: classified.tpmProfile,
    sourceGroundingRequired: true, authorityHierarchy: AUTHORITY_HIERARCHY,
    legalDimensions: unique([...(classified.legalDimensions || []), ...legalDimensions]),
    confidence: classified.confidence, fallbackClassificationUsed: classified.fallbackClassificationUsed
  };
}

export function mergeIITIntoIssueClassification(issueClassification = {}, query = "") {
  const iitClassification = buildIITClassificationObject({
    query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
    primaryIssue: issueClassification.primaryIssue || "IIT",
    priorSubIssue: issueClassification.primarySubIssue || issueClassification.subIssue || "",
    targetAuthorities: issueClassification.targetAuthorities || [],
    legalDimensions: issueClassification.legalDimensions || [],
    reviewMode: issueClassification.reviewMode === true
  });

  return {
    ...issueClassification,
    primaryDomain: "IIT", domainCode: "IIT", domainName: IIT_DOMAIN.name,
    taxDomainClassification: { ...(issueClassification.taxDomainClassification || {}), ...iitClassification },
    primarySubIssue: iitClassification.primarySubIssue, subIssue: iitClassification.primarySubIssue,
    targetAuthorities: iitClassification.targetAuthorities,
    controllingAuthorities: iitClassification.controllingAuthorities,
    sourceGroundingRequired: true, legalDimensions: iitClassification.legalDimensions,
    iitClassification
  };
}

export function iitDomainHealthCheck() {
  return {
    ok: true, engine: "TINA_IIT_DOMAIN_CONFIG", version: DOMAIN_CONFIG_VERSION,
    domain: IIT_DOMAIN.code, subIssueCount: Object.keys(SUB_ISSUE_REGISTRY).length,
    noOpenAICalls: true, noDirectRetrieval: true, noFinalAnswerGeneration: true,
    sourceGroundingRequired: true
  };
}

export default {
  DOMAIN_CONFIG_VERSION, IIT_DOMAIN, SUB_ISSUE, SUB_ISSUE_REGISTRY,
  PRIORITY_FOLDERS, EXCLUDED_FOLDERS, AUTHORITY_HIERARCHY, REQUIRED_ANSWER_SECTIONS,
  getDomainConfig, getSubIssue, classifyIITSubIssue, buildIITClassificationObject,
  mergeIITIntoIssueClassification, iitDomainHealthCheck
};
