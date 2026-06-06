// FILE: tax-engines/EST/domain-config.js
"use strict";

/**
 * TINA EST Domain Config — Estate and Donor's Tax
 * Version: 3.0.0
 */

import { buildTargetAuthorityProfile, sortAuthorityTypes } from "../shared/authority-hierarchy.js";

export const DOMAIN_CONFIG_VERSION = "3.0.0";
export const PRIORITY_FOLDERS = Object.freeze(["01_TAX_CODE","02_REVENUE_REGULATIONS","03_RMC","04_RMO","05_BIR_RULINGS","06_COURT_CASES"]);
export const EXCLUDED_FOLDERS = Object.freeze(["07_CPA_NOTES","08_REVIEW_MATERIALS"]);
export const AUTHORITY_HIERARCHY = Object.freeze(["CONSTITUTION","STATUTE","TREATY","SUPREME_COURT_EN_BANC","SUPREME_COURT","CTA_EN_BANC","CTA_DIVISION","RR","RMC","RMO","RAMO","BIR_RULING","ADMINISTRATIVE_GUIDANCE","OECD_GUIDANCE","FOREIGN_AUTHORITY","SECONDARY"]);
export const REQUIRED_ANSWER_SECTIONS = Object.freeze(["A. DIRECT ANSWER","B. CONTROLLING LEGAL BASIS","C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES","D. SUPPORTING JURISPRUDENCE","E. DOCTRINAL STATUS / CONFLICT ANALYSIS","F. PRACTICAL NOTE / APPLICATION"]);

export const EST_DOMAIN = Object.freeze({
  code: "EST", domainCode: "EST", name: "Estate and Donor's Tax", domainName: "Estate and Donor's Tax",
  domainLabel: "EST — Estate and Donor's Tax", title: "Estate and Donor's Tax",
  domainDescription: "EST covers estate tax, donor's tax, gross estate computation, deductions, tax rates, estate tax amnesty, exempt donations, and property valuation rules under NIRC Title III.",
  primaryStatutes: ["NIRC Title III","NIRC Secs. 84–104"],
  primaryRegulations: ["RR 12-2018 (TRAIN)","RR 2-2003"],
  primaryAuthorities: ["NIRC Secs. 84–104","RR 12-2018"],
  defaultAuthorities: ["STATUTE","RR","RMC","BIR_RULING","SUPREME_COURT","CTA_EN_BANC","CTA_DIVISION"],
  defaultRetrievalStrategy: "EST_GENERAL_AUTHORITY_FIRST",
  baseRetrievalStrategy: "EST_DOMAIN_ISSUE_SPECIFIC_RETRIEVAL",
  priorityFolders: PRIORITY_FOLDERS, excludedFolders: EXCLUDED_FOLDERS,
  authorityHierarchy: AUTHORITY_HIERARCHY,
  defaultAnswerSections: REQUIRED_ANSWER_SECTIONS, requiredAnswerSections: REQUIRED_ANSWER_SECTIONS,
  sourceGroundingRequired: true, compactSourcesOnly: true
});

export const SUB_ISSUE = Object.freeze({
  GROSS_ESTATE: "GROSS_ESTATE", ESTATE_DEDUCTIONS: "ESTATE_DEDUCTIONS",
  ESTATE_RATE: "ESTATE_RATE", ESTATE_AMNESTY: "ESTATE_AMNESTY",
  DONORS_RATE: "DONORS_RATE", EXEMPT_DONATIONS: "EXEMPT_DONATIONS",
  PROPERTY_VALUATION: "PROPERTY_VALUATION"
});

function buildSubIssueConfig({ subIssue, label, description, keywords = [], aliases = [], retrievalStrategy, targetAuthorities = [], controllingAuthorities = [], supportingAuthorities = [], supportingJurisprudence = [], tpmProfile = "STANDARD", legalDimensions = [], computationSensitive = false, complianceSensitive = false }) {
  return Object.freeze({ code: subIssue, subIssue, label, description, keywords, aliases, retrievalStrategy, targetAuthorities, controllingAuthorities, supportingAuthorities, supportingJurisprudence, priorityFolders: PRIORITY_FOLDERS, excludedFolders: EXCLUDED_FOLDERS, requiredAnswerSections: REQUIRED_ANSWER_SECTIONS, tpmProfile, sourceGroundingRequired: true, authorityHierarchy: AUTHORITY_HIERARCHY, legalDimensions, computationSensitive, complianceSensitive, doctrineSensitive: true, enginePath: `./engines/${subIssue.toLowerCase().replace(/_/g, "-")}-engine.js` });
}

export const SUB_ISSUE_REGISTRY = Object.freeze({
  GROSS_ESTATE: buildSubIssueConfig({
    subIssue: "GROSS_ESTATE", label: "Gross Estate — NIRC Secs. 85–86",
    description: "Composition of gross estate; properties included in the gross estate of a decedent.",
    keywords: ["gross estate","estate tax","decedent's estate","properties included","sec. 85","sec. 86","section 85","section 86","rr 12-2018"],
    aliases: ["ESTATE_GROSS","DECEDENT_ESTATE"],
    retrievalStrategy: "EST_GROSS_ESTATE_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 85","NIRC Sec. 86","RR 12-2018"],
    controllingAuthorities: ["NIRC Sec. 85","NIRC Sec. 86","RR 12-2018"],
    legalDimensions: ["SUBSTANTIVE","COMPUTATION"], computationSensitive: true
  }),
  ESTATE_DEDUCTIONS: buildSubIssueConfig({
    subIssue: "ESTATE_DEDUCTIONS", label: "Estate Tax Deductions — NIRC Sec. 86",
    description: "Allowable deductions from gross estate; standard deduction; family home deduction; claims against estate.",
    keywords: ["estate deduction","standard deduction estate","family home","claims against estate","sec. 86","section 86","rr 12-2018","vanishing deduction"],
    aliases: ["ESTATE_TAX_DEDUCTIONS","DEDUCTIONS_FROM_ESTATE"],
    retrievalStrategy: "EST_DEDUCTIONS_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 86","RR 12-2018"],
    controllingAuthorities: ["NIRC Sec. 86","RR 12-2018"],
    legalDimensions: ["SUBSTANTIVE","COMPUTATION"], computationSensitive: true
  }),
  ESTATE_RATE: buildSubIssueConfig({
    subIssue: "ESTATE_RATE", label: "Estate Tax Rate and Computation — NIRC Sec. 84",
    description: "Estate tax rate (6% flat rate under TRAIN); computation of estate tax due.",
    keywords: ["estate tax rate","6%","flat rate estate","estate tax computation","sec. 84","section 84","rr 12-2018","estate tax due"],
    aliases: ["ESTATE_TAX_RATE","ESTATE_TAX_COMPUTATION"],
    retrievalStrategy: "EST_RATE_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 84","RR 12-2018"],
    controllingAuthorities: ["NIRC Sec. 84","RR 12-2018"],
    legalDimensions: ["SUBSTANTIVE","COMPUTATION"], computationSensitive: true
  }),
  ESTATE_AMNESTY: buildSubIssueConfig({
    subIssue: "ESTATE_AMNESTY", label: "Estate Tax Amnesty — RA 11213, RA 11569",
    description: "Estate tax amnesty under RA 11213 and RA 11569; availment period; conditions and coverage.",
    keywords: ["estate tax amnesty","ra 11213","ra 11569","rr 6-2019","amnesty availment","etar","estate amnesty"],
    aliases: ["ESTATE_TAX_AMNESTY","ETAR"],
    retrievalStrategy: "EST_AMNESTY_AUTHORITY_FIRST",
    targetAuthorities: ["RA 11213","RA 11569","RR 6-2019"],
    controllingAuthorities: ["RA 11213","RA 11569","RR 6-2019"],
    legalDimensions: ["SUBSTANTIVE","PROCEDURAL"], complianceSensitive: true
  }),
  DONORS_RATE: buildSubIssueConfig({
    subIssue: "DONORS_RATE", label: "Donor's Tax Rate — NIRC Sec. 99",
    description: "Donor's tax rate (6% flat under TRAIN); computation of donor's tax; taxable gifts.",
    keywords: ["donor's tax","donor tax rate","6% donor","gift tax","sec. 99","section 99","rr 12-2018","donation tax","donors tax"],
    aliases: ["DONORS_TAX_RATE","GIFT_TAX"],
    retrievalStrategy: "EST_DONORS_RATE_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 99","RR 12-2018"],
    controllingAuthorities: ["NIRC Sec. 99","RR 12-2018"],
    legalDimensions: ["SUBSTANTIVE","COMPUTATION"], computationSensitive: true
  }),
  EXEMPT_DONATIONS: buildSubIssueConfig({
    subIssue: "EXEMPT_DONATIONS", label: "Exempt Donations — NIRC Sec. 101",
    description: "Donations exempt from donor's tax; gifts to charitable organizations; dowries; small gifts.",
    keywords: ["exempt donation","exempt gift","sec. 101","section 101","rr 12-2018","charitable donation","dowry","gift exemption","donor's tax exemption"],
    aliases: ["EXEMPT_GIFTS","DONORS_TAX_EXEMPTION"],
    retrievalStrategy: "EST_EXEMPT_DONATIONS_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 101","RR 12-2018"],
    controllingAuthorities: ["NIRC Sec. 101","RR 12-2018"],
    legalDimensions: ["SUBSTANTIVE"]
  }),
  PROPERTY_VALUATION: buildSubIssueConfig({
    subIssue: "PROPERTY_VALUATION", label: "Property Valuation — NIRC Secs. 85, 88",
    description: "Valuation of properties in the gross estate; fair market value; zonal value; BIR-appraised value.",
    keywords: ["property valuation","fair market value","zonal value","bir appraised","sec. 85","sec. 88","section 85","section 88","rr 12-2018","estate valuation"],
    aliases: ["ESTATE_VALUATION","FMV_ESTATE"],
    retrievalStrategy: "EST_PROPERTY_VALUATION_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 85","NIRC Sec. 88","RR 12-2018"],
    controllingAuthorities: ["NIRC Sec. 85","NIRC Sec. 88","RR 12-2018"],
    legalDimensions: ["SUBSTANTIVE","COMPUTATION"], computationSensitive: true
  })
});

function normalizeCode(v = "") { return String(v || "").trim().toUpperCase().replace(/[\s/-]+/g, "_"); }
function normalizeText(v = "") { return String(v || "").toLowerCase().replace(/[^\w\s%+./()–—-]/g, " ").replace(/\s+/g, " ").trim(); }
function scoreKeywords(text = "", terms = []) {
  let score = 0; const matchedTerms = [];
  for (const term of terms || []) { const n = normalizeText(term); if (!n) continue; if (text.includes(n)) { matchedTerms.push(term); score += n.length >= 14 ? 3 : n.length >= 8 ? 2 : 1; } }
  return { score, matchedTerms };
}
function unique(values = []) { return [...new Set((values || []).filter(Boolean))]; }

export function getDomainConfig() { return { engine: "tax-engines/EST/domain-config.js", version: DOMAIN_CONFIG_VERSION, domain: EST_DOMAIN, subIssues: SUB_ISSUE_REGISTRY, priorityFolders: PRIORITY_FOLDERS, excludedFolders: EXCLUDED_FOLDERS, authorityHierarchy: AUTHORITY_HIERARCHY, answerSections: { default: REQUIRED_ANSWER_SECTIONS } }; }
export function getSubIssue(code = "") { return SUB_ISSUE_REGISTRY[normalizeCode(code)] || null; }

export function classifyESTSubIssue(query = "", options = {}) {
  const nq = normalizeText(query); const priorSubIssue = normalizeCode(options.priorSubIssue || ""); const candidates = [];
  for (const si of Object.values(SUB_ISSUE_REGISTRY)) {
    const ks = scoreKeywords(nq, [si.code, si.subIssue, si.label, si.description, ...(si.keywords || []), ...(si.aliases || []), ...(si.controllingAuthorities || [])]);
    let score = ks.score; if (priorSubIssue && priorSubIssue === si.code) score += 8;
    if (score > 0) candidates.push({ ...si, score, matchedTerms: ks.matchedTerms });
  }
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0] || { ...SUB_ISSUE_REGISTRY.GROSS_ESTATE, score: 0, matchedTerms: [] };
  const second = candidates[1] || null;
  const confidence = top.score <= 0 ? 0.35 : Number(Math.min(0.55 + top.score / 30 + Math.max(top.score - (second?.score || 0), 0) / 25, 0.99).toFixed(2));
  return { domain: EST_DOMAIN.code, domainCode: EST_DOMAIN.code, domainName: EST_DOMAIN.name, primarySubIssue: top.code, subIssue: top.code, primarySubIssueLabel: top.label, targetAuthorities: top.targetAuthorities, controllingAuthorities: top.controllingAuthorities, supportingAuthorities: top.supportingAuthorities, supportingJurisprudence: top.supportingJurisprudence, priorityFolders: PRIORITY_FOLDERS, excludedFolders: EXCLUDED_FOLDERS, requiredAnswerSections: REQUIRED_ANSWER_SECTIONS, tpmProfile: top.tpmProfile, sourceGroundingRequired: true, legalDimensions: top.legalDimensions || [], matchedTerms: top.matchedTerms, confidence, fallbackClassificationUsed: top.score <= 0, distinctionRequired: !!second && top.code !== second.code && top.score - second.score <= 2, candidates };
}

export function buildESTClassificationObject({ query = "", primaryIssue = "EST", priorSubIssue = "", targetAuthorities = [], legalDimensions = [], reviewMode = false } = {}) {
  const classified = classifyESTSubIssue(query, { priorSubIssue });
  const authorityTypes = sortAuthorityTypes(buildTargetAuthorityProfile({ primaryDomain: EST_DOMAIN.code, primaryIssue, subIssues: [classified.primarySubIssue], targetAuthorities: unique([...EST_DOMAIN.defaultAuthorities, ...targetAuthorities]) }));
  return { engine: "tax-engines/EST/domain-config.js", version: DOMAIN_CONFIG_VERSION, status: classified.confidence >= 0.7 ? "EST_SUB_ISSUE_CLASSIFIED" : "LOW_CONFIDENCE_EST_SUB_ISSUE_CLASSIFIED", primaryDomain: EST_DOMAIN.code, domainCode: EST_DOMAIN.code, domainName: EST_DOMAIN.name, primaryIssue, primarySubIssue: classified.primarySubIssue, subIssue: classified.primarySubIssue, primaryStatutes: EST_DOMAIN.primaryStatutes, primaryRegulations: EST_DOMAIN.primaryRegulations, targetAuthorities: unique([...(classified.targetAuthorities || []), ...targetAuthorities]), targetAuthorityTypes: authorityTypes, controllingAuthorities: classified.controllingAuthorities, supportingAuthorities: classified.supportingAuthorities, supportingJurisprudence: classified.supportingJurisprudence, priorityFolders: PRIORITY_FOLDERS, excludedFolders: reviewMode ? [] : EXCLUDED_FOLDERS, requiredAnswerSections: REQUIRED_ANSWER_SECTIONS, tpmProfile: classified.tpmProfile, sourceGroundingRequired: true, authorityHierarchy: AUTHORITY_HIERARCHY, legalDimensions: unique([...(classified.legalDimensions || []), ...legalDimensions]), confidence: classified.confidence, fallbackClassificationUsed: classified.fallbackClassificationUsed };
}

export function mergeESTIntoIssueClassification(issueClassification = {}, query = "") {
  const estClassification = buildESTClassificationObject({ query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "", primaryIssue: issueClassification.primaryIssue || "EST", priorSubIssue: issueClassification.primarySubIssue || issueClassification.subIssue || "", targetAuthorities: issueClassification.targetAuthorities || [], legalDimensions: issueClassification.legalDimensions || [], reviewMode: issueClassification.reviewMode === true });
  return { ...issueClassification, primaryDomain: "EST", domainCode: "EST", domainName: EST_DOMAIN.name, taxDomainClassification: { ...(issueClassification.taxDomainClassification || {}), ...estClassification }, primarySubIssue: estClassification.primarySubIssue, subIssue: estClassification.primarySubIssue, targetAuthorities: estClassification.targetAuthorities, controllingAuthorities: estClassification.controllingAuthorities, sourceGroundingRequired: true, legalDimensions: estClassification.legalDimensions, estClassification };
}

export function estDomainHealthCheck() { return { ok: true, engine: "TINA_EST_DOMAIN_CONFIG", version: DOMAIN_CONFIG_VERSION, domain: EST_DOMAIN.code, subIssueCount: Object.keys(SUB_ISSUE_REGISTRY).length, noOpenAICalls: true, noDirectRetrieval: true, noFinalAnswerGeneration: true, sourceGroundingRequired: true }; }

export default { DOMAIN_CONFIG_VERSION, EST_DOMAIN, SUB_ISSUE, SUB_ISSUE_REGISTRY, PRIORITY_FOLDERS, EXCLUDED_FOLDERS, AUTHORITY_HIERARCHY, REQUIRED_ANSWER_SECTIONS, getDomainConfig, getSubIssue, classifyESTSubIssue, buildESTClassificationObject, mergeESTIntoIssueClassification, estDomainHealthCheck };
