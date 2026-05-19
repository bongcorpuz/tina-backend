// FILE: tax-engines/WHT/domain-config.js
"use strict";

/**
 * TINA WHT Domain Config — Withholding Tax
 * Version: 3.0.0
 */

import { buildTargetAuthorityProfile, sortAuthorityTypes } from "../shared/authority-hierarchy.js";

export const DOMAIN_CONFIG_VERSION = "3.0.0";
export const PRIORITY_FOLDERS = Object.freeze(["01_TAX_CODE","02_REVENUE_REGULATIONS","03_RMC","04_RMO","05_BIR_RULINGS","06_COURT_CASES"]);
export const EXCLUDED_FOLDERS = Object.freeze(["07_CPA_NOTES","08_REVIEW_MATERIALS"]);
export const AUTHORITY_HIERARCHY = Object.freeze(["CONSTITUTION","STATUTE","TAX_TREATY","SUPREME_COURT_EN_BANC","SUPREME_COURT","CTA_EN_BANC","CTA_DIVISION","RR","RMC","RMO","RAMO","BIR_RULING","ADMINISTRATIVE_GUIDANCE","OECD_GUIDANCE","FOREIGN_AUTHORITY","SECONDARY"]);
export const REQUIRED_ANSWER_SECTIONS = Object.freeze(["A. DIRECT ANSWER","B. CONTROLLING LEGAL BASIS","C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES","D. SUPPORTING JURISPRUDENCE","E. DOCTRINAL STATUS / CONFLICT ANALYSIS","F. PRACTICAL NOTE / APPLICATION"]);

export const WHT_DOMAIN = Object.freeze({
  code: "WHT", domainCode: "WHT", name: "Withholding Tax", domainName: "Withholding Tax",
  domainLabel: "WHT — Withholding Tax", title: "Withholding Tax",
  domainDescription: "WHT covers creditable withholding tax, final withholding tax, withholding tax on compensation, withholding agent obligations, government withholding, treaty-reduced rates, return filing and remittance, and WHT certificates.",
  primaryStatutes: ["NIRC Secs. 57–58","NIRC Secs. 78–83"],
  primaryRegulations: ["RR 2-1998","RR 11-2018 (TRAIN)"],
  primaryAuthorities: ["NIRC Secs. 57–58","RR 2-1998","RR 11-2018"],
  defaultAuthorities: ["STATUTE","RR","RMC","RMO","BIR_RULING","SUPREME_COURT","CTA_EN_BANC","CTA_DIVISION"],
  defaultRetrievalStrategy: "WHT_GENERAL_AUTHORITY_FIRST",
  baseRetrievalStrategy: "WHT_DOMAIN_ISSUE_SPECIFIC_RETRIEVAL",
  priorityFolders: PRIORITY_FOLDERS, excludedFolders: EXCLUDED_FOLDERS,
  authorityHierarchy: AUTHORITY_HIERARCHY,
  defaultAnswerSections: REQUIRED_ANSWER_SECTIONS, requiredAnswerSections: REQUIRED_ANSWER_SECTIONS,
  sourceGroundingRequired: true, compactSourcesOnly: true
});

export const SUB_ISSUE = Object.freeze({
  CREDITABLE_WHT: "CREDITABLE_WHT", FINAL_WHT: "FINAL_WHT",
  COMPENSATION_WHT: "COMPENSATION_WHT", WHT_AGENT: "WHT_AGENT",
  GOVERNMENT_WHT: "GOVERNMENT_WHT", TREATY_WHT: "TREATY_WHT",
  RETURN_REMITTANCE: "RETURN_REMITTANCE", CERTIFICATE: "CERTIFICATE"
});

function buildSubIssueConfig({ subIssue, label, description, keywords = [], aliases = [], retrievalStrategy, targetAuthorities = [], controllingAuthorities = [], supportingAuthorities = [], supportingJurisprudence = [], tpmProfile = "STANDARD", legalDimensions = [], conflictSensitive = false, computationSensitive = false, complianceSensitive = false, auditRiskSensitive = false }) {
  return Object.freeze({ code: subIssue, subIssue, label, description, keywords, aliases, retrievalStrategy, targetAuthorities, controllingAuthorities, supportingAuthorities, supportingJurisprudence, priorityFolders: PRIORITY_FOLDERS, excludedFolders: EXCLUDED_FOLDERS, requiredAnswerSections: REQUIRED_ANSWER_SECTIONS, tpmProfile, sourceGroundingRequired: true, authorityHierarchy: AUTHORITY_HIERARCHY, legalDimensions, conflictSensitive, computationSensitive, complianceSensitive, auditRiskSensitive, enginePath: `./engines/${subIssue.toLowerCase().replace(/_/g, "-")}-engine.js` });
}

export const SUB_ISSUE_REGISTRY = Object.freeze({
  CREDITABLE_WHT: buildSubIssueConfig({
    subIssue: "CREDITABLE_WHT", label: "Creditable Withholding Tax — NIRC Sec. 57(B)",
    description: "Expanded withholding tax; creditable withholding tax; applicable rates, transactions, and credit against income tax.",
    keywords: ["creditable withholding tax","cwt","ewt","expanded withholding tax","sec. 57(b)","section 57b","rr 2-1998","rr 11-2018","withholding rate","atc"],
    aliases: ["EWT","EXPANDED_WITHHOLDING_TAX","CWT"],
    retrievalStrategy: "WHT_CREDITABLE_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 57(B)","RR 2-1998","RR 11-2018","CIR v. Smart Communications"],
    controllingAuthorities: ["NIRC Sec. 57(B)","RR 2-1998","RR 11-2018"],
    supportingJurisprudence: ["CIR v. Smart Communications"],
    legalDimensions: ["SUBSTANTIVE","COMPLIANCE","COMPUTATION"], computationSensitive: true
  }),
  FINAL_WHT: buildSubIssueConfig({
    subIssue: "FINAL_WHT", label: "Final Withholding Tax — NIRC Sec. 57(A)",
    description: "Final withholding tax on passive income, non-resident income, and other final tax subjects.",
    keywords: ["final withholding tax","fwt","final tax","sec. 57(a)","section 57a","rr 12-2001","rr 11-2018","final income tax"],
    aliases: ["FWT","FINAL_WITHHOLDING"],
    retrievalStrategy: "WHT_FINAL_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 57(A)","RR 12-2001","RR 11-2018"],
    controllingAuthorities: ["NIRC Sec. 57(A)","RR 12-2001","RR 11-2018"],
    legalDimensions: ["SUBSTANTIVE","COMPLIANCE"], computationSensitive: true
  }),
  COMPENSATION_WHT: buildSubIssueConfig({
    subIssue: "COMPENSATION_WHT", label: "Withholding Tax on Compensation — NIRC Secs. 78–83",
    description: "Withholding tax on compensation of employees; payroll withholding; BIR Form 1601C.",
    keywords: ["withholding on compensation","compensation withholding","payroll withholding","sec. 78","sec. 79","1601c","bir form 1601c"],
    aliases: ["COMPENSATION_WITHHOLDING","PAYROLL_WHT"],
    retrievalStrategy: "WHT_COMPENSATION_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Secs. 78–83","RR 2-1998","RR 11-2018"],
    controllingAuthorities: ["NIRC Secs. 78–83","RR 2-1998","RR 11-2018"],
    legalDimensions: ["SUBSTANTIVE","COMPLIANCE"], complianceSensitive: true
  }),
  WHT_AGENT: buildSubIssueConfig({
    subIssue: "WHT_AGENT", label: "Withholding Agent Obligations — NIRC Sec. 57",
    description: "Obligations of withholding agents; duty to withhold, remit, and file returns.",
    keywords: ["withholding agent","obligation to withhold","duty to withhold","sec. 57","section 57","rr 2-1998 sec. 2.58","payor","employer obligation"],
    aliases: ["WITHHOLDING_AGENT","WHT_OBLIGATIONS"],
    retrievalStrategy: "WHT_AGENT_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 57","RR 2-1998 Sec. 2.58"],
    controllingAuthorities: ["NIRC Sec. 57","RR 2-1998 Sec. 2.58"],
    legalDimensions: ["SUBSTANTIVE","COMPLIANCE","PROCEDURAL"], complianceSensitive: true
  }),
  GOVERNMENT_WHT: buildSubIssueConfig({
    subIssue: "GOVERNMENT_WHT", label: "Government Withholding — NIRC Sec. 2.57.3",
    description: "Government withholding obligations; withholding by government agencies and instrumentalities.",
    keywords: ["government withholding","government agency withholding","sec. 57.3","rr 2-1998 sec. 2.57.3","rmc 40-2012","government payor"],
    aliases: ["GOVERNMENT_WITHHOLDING","GOV_WHT"],
    retrievalStrategy: "WHT_GOVERNMENT_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 57.3","RR 2-1998 Sec. 2.57.3","RMC 40-2012"],
    controllingAuthorities: ["NIRC Sec. 57.3","RR 2-1998 Sec. 2.57.3","RMC 40-2012"],
    legalDimensions: ["SUBSTANTIVE","COMPLIANCE"], complianceSensitive: true
  }),
  TREATY_WHT: buildSubIssueConfig({
    subIssue: "TREATY_WHT", label: "Treaty-Reduced WHT Rates — Applicable DTAs",
    description: "Reduced withholding tax rates under applicable double tax agreements.",
    keywords: ["treaty withholding","treaty-reduced rate","dta withholding","tax treaty relief","rmc 46-2020","treaty rate","non-resident withholding treaty"],
    aliases: ["TREATY_REDUCED_WHT","DTA_WHT"],
    retrievalStrategy: "WHT_TREATY_AUTHORITY_FIRST",
    targetAuthorities: ["Applicable Double Tax Agreement","NIRC Sec. 57","RMC 46-2020"],
    controllingAuthorities: ["Applicable Double Tax Agreement","NIRC Sec. 57","RMC 46-2020"],
    legalDimensions: ["SUBSTANTIVE","PROCEDURAL"], conflictSensitive: true
  }),
  RETURN_REMITTANCE: buildSubIssueConfig({
    subIssue: "RETURN_REMITTANCE", label: "WHT Return Filing and Remittance — NIRC Sec. 58",
    description: "WHT return filing deadlines and remittance obligations; BIR Forms 1601C/1601E/1601F/1601-FQ.",
    keywords: ["1601c","1601e","1601f","1601-fq","wht return","withholding tax return","remittance","sec. 58","section 58","filing deadline withholding"],
    aliases: ["WHT_RETURN","REMITTANCE_RETURN"],
    retrievalStrategy: "WHT_RETURN_REMITTANCE_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 58","RR 2-1998 Sec. 2.58"],
    controllingAuthorities: ["NIRC Sec. 58","RR 2-1998 Sec. 2.58"],
    legalDimensions: ["COMPLIANCE","PROCEDURAL"], complianceSensitive: true
  }),
  CERTIFICATE: buildSubIssueConfig({
    subIssue: "CERTIFICATE", label: "Certificate of WHT (BIR Form 2307/2316) — NIRC Sec. 58(C)",
    description: "Issuance and use of withholding tax certificates; BIR Forms 2307 and 2316.",
    keywords: ["2307","2316","bir form 2307","bir form 2316","certificate of withholding","sec. 58(c)","section 58c","withholding certificate"],
    aliases: ["WHT_CERTIFICATE","BIR_FORM_2307","BIR_FORM_2316"],
    retrievalStrategy: "WHT_CERTIFICATE_AUTHORITY_FIRST",
    targetAuthorities: ["NIRC Sec. 58(C)","RR 2-1998"],
    controllingAuthorities: ["NIRC Sec. 58(C)","RR 2-1998"],
    legalDimensions: ["COMPLIANCE","EVIDENTIARY"], complianceSensitive: true
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

export function getDomainConfig() { return { engine: "tax-engines/WHT/domain-config.js", version: DOMAIN_CONFIG_VERSION, domain: WHT_DOMAIN, subIssues: SUB_ISSUE_REGISTRY, priorityFolders: PRIORITY_FOLDERS, excludedFolders: EXCLUDED_FOLDERS, authorityHierarchy: AUTHORITY_HIERARCHY, answerSections: { default: REQUIRED_ANSWER_SECTIONS } }; }
export function getSubIssue(code = "") { return SUB_ISSUE_REGISTRY[normalizeCode(code)] || null; }

export function classifyWHTSubIssue(query = "", options = {}) {
  const nq = normalizeText(query); const priorSubIssue = normalizeCode(options.priorSubIssue || ""); const candidates = [];
  for (const si of Object.values(SUB_ISSUE_REGISTRY)) {
    const ks = scoreKeywords(nq, [si.code, si.subIssue, si.label, si.description, ...(si.keywords || []), ...(si.aliases || []), ...(si.controllingAuthorities || [])]);
    let score = ks.score; if (priorSubIssue && priorSubIssue === si.code) score += 8;
    if (score > 0) candidates.push({ ...si, score, matchedTerms: ks.matchedTerms });
  }
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0] || { ...SUB_ISSUE_REGISTRY.CREDITABLE_WHT, score: 0, matchedTerms: [] };
  const second = candidates[1] || null;
  const confidence = top.score <= 0 ? 0.35 : Number(Math.min(0.55 + top.score / 30 + Math.max(top.score - (second?.score || 0), 0) / 25, 0.99).toFixed(2));
  return { domain: WHT_DOMAIN.code, domainCode: WHT_DOMAIN.code, domainName: WHT_DOMAIN.name, primarySubIssue: top.code, subIssue: top.code, primarySubIssueLabel: top.label, targetAuthorities: top.targetAuthorities, controllingAuthorities: top.controllingAuthorities, supportingAuthorities: top.supportingAuthorities, supportingJurisprudence: top.supportingJurisprudence, priorityFolders: PRIORITY_FOLDERS, excludedFolders: EXCLUDED_FOLDERS, requiredAnswerSections: REQUIRED_ANSWER_SECTIONS, tpmProfile: top.tpmProfile, sourceGroundingRequired: true, legalDimensions: top.legalDimensions || [], matchedTerms: top.matchedTerms, confidence, fallbackClassificationUsed: top.score <= 0, distinctionRequired: !!second && top.code !== second.code && top.score - second.score <= 2, candidates };
}

export function buildWHTClassificationObject({ query = "", primaryIssue = "WHT", priorSubIssue = "", targetAuthorities = [], legalDimensions = [], reviewMode = false } = {}) {
  const classified = classifyWHTSubIssue(query, { priorSubIssue });
  const authorityTypes = sortAuthorityTypes(buildTargetAuthorityProfile({ primaryDomain: WHT_DOMAIN.code, primaryIssue, subIssues: [classified.primarySubIssue], targetAuthorities: unique([...WHT_DOMAIN.defaultAuthorities, ...targetAuthorities]) }));
  return { engine: "tax-engines/WHT/domain-config.js", version: DOMAIN_CONFIG_VERSION, status: classified.confidence >= 0.7 ? "WHT_SUB_ISSUE_CLASSIFIED" : "LOW_CONFIDENCE_WHT_SUB_ISSUE_CLASSIFIED", primaryDomain: WHT_DOMAIN.code, domainCode: WHT_DOMAIN.code, domainName: WHT_DOMAIN.name, primaryIssue, primarySubIssue: classified.primarySubIssue, subIssue: classified.primarySubIssue, primaryStatutes: WHT_DOMAIN.primaryStatutes, primaryRegulations: WHT_DOMAIN.primaryRegulations, targetAuthorities: unique([...(classified.targetAuthorities || []), ...targetAuthorities]), targetAuthorityTypes: authorityTypes, controllingAuthorities: classified.controllingAuthorities, supportingAuthorities: classified.supportingAuthorities, supportingJurisprudence: classified.supportingJurisprudence, priorityFolders: PRIORITY_FOLDERS, excludedFolders: reviewMode ? [] : EXCLUDED_FOLDERS, requiredAnswerSections: REQUIRED_ANSWER_SECTIONS, tpmProfile: classified.tpmProfile, sourceGroundingRequired: true, authorityHierarchy: AUTHORITY_HIERARCHY, legalDimensions: unique([...(classified.legalDimensions || []), ...legalDimensions]), confidence: classified.confidence, fallbackClassificationUsed: classified.fallbackClassificationUsed };
}

export function mergeWHTIntoIssueClassification(issueClassification = {}, query = "") {
  const whtClassification = buildWHTClassificationObject({ query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "", primaryIssue: issueClassification.primaryIssue || "WHT", priorSubIssue: issueClassification.primarySubIssue || issueClassification.subIssue || "", targetAuthorities: issueClassification.targetAuthorities || [], legalDimensions: issueClassification.legalDimensions || [], reviewMode: issueClassification.reviewMode === true });
  return { ...issueClassification, primaryDomain: "WHT", domainCode: "WHT", domainName: WHT_DOMAIN.name, taxDomainClassification: { ...(issueClassification.taxDomainClassification || {}), ...whtClassification }, primarySubIssue: whtClassification.primarySubIssue, subIssue: whtClassification.primarySubIssue, targetAuthorities: whtClassification.targetAuthorities, controllingAuthorities: whtClassification.controllingAuthorities, sourceGroundingRequired: true, legalDimensions: whtClassification.legalDimensions, whtClassification };
}

export function whtDomainHealthCheck() { return { ok: true, engine: "TINA_WHT_DOMAIN_CONFIG", version: DOMAIN_CONFIG_VERSION, domain: WHT_DOMAIN.code, subIssueCount: Object.keys(SUB_ISSUE_REGISTRY).length, noOpenAICalls: true, noDirectRetrieval: true, noFinalAnswerGeneration: true, sourceGroundingRequired: true }; }

export default { DOMAIN_CONFIG_VERSION, WHT_DOMAIN, SUB_ISSUE, SUB_ISSUE_REGISTRY, PRIORITY_FOLDERS, EXCLUDED_FOLDERS, AUTHORITY_HIERARCHY, REQUIRED_ANSWER_SECTIONS, getDomainConfig, getSubIssue, classifyWHTSubIssue, buildWHTClassificationObject, mergeWHTIntoIssueClassification, whtDomainHealthCheck };
