// FILE: tax-engines/shared/authority-hierarchy.js
"use strict";

/**
 * TINA Shared Authority Hierarchy
 * Version: 1.0.0
 *
 * Purpose:
 * - Shared Philippine tax authority hierarchy for all tax-domain engines.
 * - Complements authority-engine.js, issue-classification-engine.js,
 *   main-tax-engine-classification.js, retrieval-engine.js, reranker-engine.js,
 *   source-visibility-engine.js, and answer-renderer.js.
 */

export const AUTHORITY_HIERARCHY_VERSION = "1.0.0";

export const AUTHORITY_TYPE = Object.freeze({
  CONSTITUTION: "CONSTITUTION",
  STATUTE: "STATUTE",
  NIRC: "NIRC",
  TAX_CODE: "TAX_CODE",
  REPUBLIC_ACT: "REPUBLIC_ACT",

  SUPREME_COURT: "SUPREME_COURT",

  RR: "RR",
  REVENUE_REGULATION: "REVENUE_REGULATION",

  TAX_TREATY: "TREATY",
  TREATY: "TREATY",

  RMC: "RMC",
  RMO: "RMO",
  RAMO: "RAMO",
  BIR_RULING: "BIR_RULING",

  CTA_EN_BANC: "CTA_EN_BANC",
  COURT_OF_APPEALS: "COURT_OF_APPEALS",
  CTA_DIVISION: "CTA_DIVISION",

  LGU: "LGU",
  LGU_ISSUANCE: "LGU_ISSUANCE",

  BOC_ISSUANCE: "BOC_ISSUANCE",
  CUSTOMS_ISSUANCE: "CUSTOMS_ISSUANCE",

  PFRS: "PFRS",
  PAS: "PAS",
  PSA: "PSA",

  OECD_GUIDANCE: "OECD_GUIDANCE",

  SECONDARY: "SECONDARY",
  SECONDARY_SOURCE: "SECONDARY_SOURCE",
  UNKNOWN: "UNKNOWN"
});

export const NORMALIZED_AUTHORITY_TYPE = Object.freeze({
  CONSTITUTION: "CONSTITUTION",

  STATUTE: "STATUTE",
  NIRC: "STATUTE",
  TAX_CODE: "STATUTE",
  REPUBLIC_ACT: "STATUTE",
  RA: "STATUTE",
  LAW: "STATUTE",

  SUPREME_COURT: "SUPREME_COURT",
  SC: "SUPREME_COURT",
  SUPREME_COURT_DECISION: "SUPREME_COURT",
  CASE_LAW: "SUPREME_COURT",
  JURISPRUDENCE: "SUPREME_COURT",

  RR: "RR",
  REVENUE_REGULATION: "RR",
  REVENUE_REGULATIONS: "RR",

  TAX_TREATY: "TREATY",
  TREATY: "TREATY",
  DOUBLE_TAXATION_AGREEMENT: "TREATY",
  DTA: "TREATY",

  RMC: "RMC",
  REVENUE_MEMORANDUM_CIRCULAR: "RMC",

  RMO: "RMO",
  REVENUE_MEMORANDUM_ORDER: "RMO",

  RAMO: "RAMO",
  REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",

  BIR_RULING: "BIR_RULING",
  BIR_RULINGS: "BIR_RULING",

  CTA_EN_BANC: "CTA_EN_BANC",
  CTA_EB: "CTA_EN_BANC",

  COURT_OF_APPEALS: "COURT_OF_APPEALS",
  CA: "COURT_OF_APPEALS",

  CTA_DIVISION: "CTA_DIVISION",
  CTA: "CTA_DIVISION",
  CTA_CASE: "CTA_DIVISION",

  LGU: "LGU",
  LGU_ISSUANCE: "LGU",
  LOCAL_TAX_ORDINANCE: "LGU",

  BOC: "BOC_ISSUANCE",
  BOC_ISSUANCE: "BOC_ISSUANCE",
  CUSTOMS: "BOC_ISSUANCE",
  CUSTOMS_ISSUANCE: "BOC_ISSUANCE",
  CMTA: "BOC_ISSUANCE",

  PFRS: "PFRS",
  IFRS: "PFRS",
  PFRS_FOR_SMES: "PFRS",

  PAS: "PAS",
  PSA: "PSA",

  OECD: "OECD_GUIDANCE",
  OECD_GUIDANCE: "OECD_GUIDANCE",

  SECONDARY: "SECONDARY",
  SECONDARY_SOURCE: "SECONDARY",
  UNKNOWN: "UNKNOWN"
});

export const AUTHORITY_LEVEL = Object.freeze({
  CONSTITUTION: 1,
  STATUTE: 2,
  TAX_TREATY: 3,
  TREATY: 3,
  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
  CTA_EN_BANC: 6,
  COURT_OF_APPEALS: 7,
  CTA_DIVISION: 7,
  RR: 8,
  RMC: 9,
  RMO: 9,
  RAMO: 9,
  BIR_RULING: 10,
  LGU: 11,
  BOC_ISSUANCE: 11,
  PFRS: 12,
  PAS: 12,
  PSA: 12,
  OECD_GUIDANCE: 13,
  SECONDARY: 14,
  UNKNOWN: 99
});

export const CONTROLLING_PRECEDENCE = Object.freeze({
  ...AUTHORITY_LEVEL
});

export const AUTHORITY_SCORE = Object.freeze({
  CONSTITUTION: 100,
  STATUTE: 98,
  TAX_TREATY: 94,
  TREATY: 94,
  SUPREME_COURT_EN_BANC: 92,
  SUPREME_COURT: 88,
  CTA_EN_BANC: 82,
  COURT_OF_APPEALS: 78,
  CTA_DIVISION: 78,
  RR: 72,
  RMC: 64,
  RMO: 62,
  RAMO: 62,
  BIR_RULING: 58,
  LGU: 52,
  BOC_ISSUANCE: 52,
  PFRS: 46,
  PAS: 46,
  PSA: 44,
  OECD_GUIDANCE: 30,
  SECONDARY: 10,
  UNKNOWN: 0
});

export const AUTHORITY_LABEL = Object.freeze({
  CONSTITUTION: "1987 Constitution",
  STATUTE: "Statute / NIRC / Republic Act",
  SUPREME_COURT: "Supreme Court Decision",
  RR: "Revenue Regulation",
  TAX_TREATY: "Tax Treaty",
  TREATY: "Tax Treaty",
  RMC: "Revenue Memorandum Circular",
  RMO: "Revenue Memorandum Order",
  RAMO: "Revenue Audit Memorandum Order",
  BIR_RULING: "BIR Ruling",
  CTA_EN_BANC: "CTA En Banc Decision",
  COURT_OF_APPEALS: "Court of Appeals Decision",
  CTA_DIVISION: "CTA Division Decision",
  LGU: "Local Tax Ordinance / LGU Issuance",
  BOC_ISSUANCE: "BOC / Customs Issuance",
  PFRS: "Philippine Financial Reporting Standards",
  PAS: "Philippine Accounting Standards",
  PSA: "Philippine Standards on Auditing",
  OECD_GUIDANCE: "OECD Guidance",
  SECONDARY: "Secondary Material",
  UNKNOWN: "Unknown Authority"
});

export const AUTHORITY_CATEGORY = Object.freeze({
  CONSTITUTIONAL: ["CONSTITUTION"],
  STATUTORY: ["STATUTE"],
  JUDICIAL_CONTROLLING: ["SUPREME_COURT"],
  ADMINISTRATIVE: ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"],
  JUDICIAL_PERSUASIVE: ["CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"],
  SPECIAL_DOMAIN: ["TREATY", "LGU", "BOC_ISSUANCE", "OECD_GUIDANCE"],
  ACCOUNTING_AUDIT: ["PFRS", "PAS", "PSA"],
  SECONDARY: ["SECONDARY", "UNKNOWN"]
});

export const DOMAIN_AUTHORITY_PROFILE = Object.freeze({
  VAT: ["STATUTE", "RR", "SUPREME_COURT", "RMC", "CTA_EN_BANC", "CTA_DIVISION"],
  CIT: ["STATUTE", "RR", "SUPREME_COURT", "RMC", "BIR_RULING"],
  IIT: ["STATUTE", "RR", "RMC", "BIR_RULING"],
  WHT: ["STATUTE", "RR", "RMC", "BIR_RULING", "SUPREME_COURT"],

  EST: ["STATUTE", "RR", "RMC"],
  PCT: ["STATUTE", "RR", "RMC"],
  EXC: ["STATUTE", "RR", "RMC"],

  PRE: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR", "RMC"],
  DIS: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR", "RMC"],

  LGT: ["STATUTE", "SUPREME_COURT", "LGU"],
  CUS: ["STATUTE", "BOC_ISSUANCE", "SUPREME_COURT", "CTA_EN_BANC"],
  SPC: ["RR", "STATUTE", "RMC", "TREATY", "OECD_GUIDANCE", "BIR_RULING"],
  CON: ["CONSTITUTION", "SUPREME_COURT"]
});

export const ISSUE_AUTHORITY_PROFILE = Object.freeze({
  VAT_LIABILITY: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
  VAT_EXEMPTION: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
  VAT_REFUND: ["STATUTE", "RR", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],
  ZERO_RATED_SALES: ["STATUTE", "RR", "SUPREME_COURT", "RMC", "CTA_EN_BANC"],

  INCOME_TAX: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
  WITHHOLDING: ["STATUTE", "RR", "RMC", "BIR_RULING", "SUPREME_COURT"],

  ASSESSMENT: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR", "RMC"],
  PROCEDURAL: ["STATUTE", "RR", "RMC", "RMO", "SUPREME_COURT"],
  EVIDENTIARY: ["STATUTE", "RR", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],
  JURISDICTIONAL: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],

  TRANSACTION: ["STATUTE", "RR", "RMC", "SUPREME_COURT", "PFRS"],
  CONTRACT: ["STATUTE", "SUPREME_COURT", "RR", "RMC"],
  ECONOMIC_SUBSTANCE: ["STATUTE", "SUPREME_COURT", "RR", "RMC"],
  ACCOUNTING: ["PFRS", "PAS", "STATUTE", "RR"],
  AUDIT: ["PSA", "PFRS", "PAS", "STATUTE"],

  CASE_LAW: ["SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"],
  DOCTRINE: ["SUPREME_COURT", "STATUTE", "RR"],
  ISSUANCE: ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"],

  CUSTOMS: ["STATUTE", "BOC_ISSUANCE", "SUPREME_COURT", "CTA_EN_BANC"],
  TRANSFER_PRICING: ["RR", "STATUTE", "RMC", "TREATY", "OECD_GUIDANCE"],
  LOCAL_TAX: ["STATUTE", "LGU", "SUPREME_COURT"],
  CONSTITUTIONAL: ["CONSTITUTION", "SUPREME_COURT"],

  GENERAL_TAX: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
  GENERAL: ["STATUTE", "RR", "SUPREME_COURT", "RMC"]
});

// ---------------------------------------------------------------------------
// PHASE 1 ADAPTER SKELETON — private, not exported, not called at runtime.
// Phase 2 will route the public lookup functions through these stubs rather
// than accessing the canonical maps directly, enabling zero-downtime map swap.
// ---------------------------------------------------------------------------

const _ADAPTER_ENABLED = false; // gate stays closed until Phase 2

/* Frozen snapshots of the canonical maps as they exist at Phase 1 cutover. */
const _LEGACY_NORMALIZED_AUTHORITY_TYPE = Object.freeze({ ...NORMALIZED_AUTHORITY_TYPE });
const _LEGACY_AUTHORITY_LEVEL           = Object.freeze({ ...AUTHORITY_LEVEL });
const _LEGACY_AUTHORITY_SCORE           = Object.freeze({ ...AUTHORITY_SCORE });
const _LEGACY_AUTHORITY_LABEL           = Object.freeze({ ...AUTHORITY_LABEL });

/* Stub resolvers — Phase 2 wires replacement maps in here before opening gate. */
function _adapterNormalize(key) {
  return _LEGACY_NORMALIZED_AUTHORITY_TYPE[key];
}
function _adapterLevel(normalizedType) {
  return _LEGACY_AUTHORITY_LEVEL[normalizedType];
}
function _adapterScore(normalizedType) {
  return _LEGACY_AUTHORITY_SCORE[normalizedType];
}
function _adapterLabel(normalizedType) {
  return _LEGACY_AUTHORITY_LABEL[normalizedType];
}

/* Invariant checker: asserts adapter output matches legacy before gate opens. */
function _adapterMatchesLegacy(rawType) {
  const norm = _adapterNormalize(rawType);
  return (
    norm                 === _LEGACY_NORMALIZED_AUTHORITY_TYPE[rawType] &&
    _adapterLevel(norm)  === _LEGACY_AUTHORITY_LEVEL[norm]              &&
    _adapterScore(norm)  === _LEGACY_AUTHORITY_SCORE[norm]              &&
    _adapterLabel(norm)  === _LEGACY_AUTHORITY_LABEL[norm]
  );
}

// Suppress "declared but never used" lint noise during Phase 1.
void (_ADAPTER_ENABLED, _adapterNormalize, _adapterLevel, _adapterScore,
      _adapterLabel, _adapterMatchesLegacy);

// ---------------------------------------------------------------------------

export function normalizeAuthorityType(value = "") {
  const key = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return NORMALIZED_AUTHORITY_TYPE[key] || key || "UNKNOWN";
}

export function getAuthorityLevel(type = "") {
  const normalized = normalizeAuthorityType(type);
  return AUTHORITY_LEVEL[normalized] || 99;
}

export function getControllingPrecedence(type = "") {
  const normalized = normalizeAuthorityType(type);
  return CONTROLLING_PRECEDENCE[normalized] || 99;
}

export function getAuthorityScore(type = "") {
  const normalized = normalizeAuthorityType(type);
  return AUTHORITY_SCORE[normalized] || 0;
}

export function getAuthorityLabel(type = "") {
  const normalized = normalizeAuthorityType(type);
  return AUTHORITY_LABEL[normalized] || "Unknown Authority";
}

export function isControllingAuthority(type = "") {
  return getControllingPrecedence(type) <= 9;
}

export function isStatutoryAuthority(type = "") {
  return ["CONSTITUTION", "STATUTE"].includes(normalizeAuthorityType(type));
}

export function isCourtAuthority(type = "") {
  return ["SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(
    normalizeAuthorityType(type)
  );
}

export function isAdministrativeAuthority(type = "") {
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(normalizeAuthorityType(type));
}

export function isAccountingAuditAuthority(type = "") {
  return ["PFRS", "PAS", "PSA"].includes(normalizeAuthorityType(type));
}

export function isSpecialDomainAuthority(type = "") {
  return ["TREATY", "LGU", "BOC_ISSUANCE", "OECD_GUIDANCE"].includes(
    normalizeAuthorityType(type)
  );
}

export function getDomainAuthorityProfile(domainCode = "") {
  const code = String(domainCode || "").trim().toUpperCase();
  return DOMAIN_AUTHORITY_PROFILE[code] || [];
}

export function getIssueAuthorityProfile(issueCode = "") {
  const code = String(issueCode || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return ISSUE_AUTHORITY_PROFILE[code] || [];
}

export function mergeAuthorityProfiles(...profiles) {
  return [...new Set(profiles.flat().map(normalizeAuthorityType).filter(Boolean))];
}

export function buildTargetAuthorityProfile({
  primaryDomain = "",
  primaryIssue = "",
  subIssues = [],
  targetAuthorities = []
} = {}) {
  return mergeAuthorityProfiles(
    getDomainAuthorityProfile(primaryDomain),
    getIssueAuthorityProfile(primaryIssue),
    ...subIssues.map(getIssueAuthorityProfile),
    targetAuthorities
  );
}

export function compareAuthorityTypes(a = "", b = "") {
  return getControllingPrecedence(a) - getControllingPrecedence(b);
}

export function sortAuthorityTypes(types = []) {
  return [...new Set(types.map(normalizeAuthorityType).filter(Boolean))].sort(compareAuthorityTypes);
}

export function buildAuthorityHierarchyText() {
  return [
    "1. Constitution",
    "2. NIRC / Republic Acts / Statutes",
    "3. Tax Treaties",
    "4. Supreme Court En Banc Decisions",
    "5. Supreme Court Division Decisions",
    "6. CTA En Banc Decisions",
    "7. CTA Division / Court of Appeals Decisions",
    "8. Revenue Regulations",
    "9. RMC / RMO / RAMO",
    "10. BIR Rulings",
    "11. LGU / BOC Issuances",
    "12. PFRS / PAS / PSA, when accounting applies",
    "13. OECD / foreign persuasive authorities",
    "14. Secondary materials"
  ].join("\n");
}

export function buildControllingPrecedenceText() {
  return [
    "Constitution controls all.",
    "Statutes control administrative issuances.",
    "Supreme Court doctrine controls conflicting administrative interpretations.",
    "Revenue Regulations implement statutes but cannot amend statutes.",
    "Administrative issuances cannot override statutes or Supreme Court doctrine.",
    "Tax treaties may control treaty-based cross-border tax issues, subject to statutory and constitutional limits.",
    "CTA and Court of Appeals decisions may be persuasive but are not controlling over Supreme Court doctrine.",
    "LGU and BOC issuances apply only within their statutory domain and cannot override statutes or Supreme Court doctrine.",
    "PFRS/PAS/PSA govern accounting and auditing standards but cannot override tax statutes.",
    "OECD materials are persuasive only unless adopted by Philippine law or regulation.",
    "Secondary materials are never controlling authority."
  ].join("\n");
}

export function authorityHierarchyHealthCheck() {
  return {
    ok: true,
    engine: "TINA_SHARED_AUTHORITY_HIERARCHY",
    version: AUTHORITY_HIERARCHY_VERSION,
    supportsTaxDomainClassification: true,
    supportsIssueClassificationEngine: true,
    supportsRetrievalEngine: true,
    supportsRerankerEngine: true,
    supportsAuthorityEngine: true,
    supportsSourceVisibilityEngine: true,
    supportsVatCitWhtProfiles: true,
    supportsCustomsTreatyOecdProfiles: true
  };
}

export default {
  AUTHORITY_HIERARCHY_VERSION,
  AUTHORITY_TYPE,
  NORMALIZED_AUTHORITY_TYPE,
  AUTHORITY_LEVEL,
  CONTROLLING_PRECEDENCE,
  AUTHORITY_SCORE,
  AUTHORITY_LABEL,
  AUTHORITY_CATEGORY,
  DOMAIN_AUTHORITY_PROFILE,
  ISSUE_AUTHORITY_PROFILE,
  normalizeAuthorityType,
  getAuthorityLevel,
  getControllingPrecedence,
  getAuthorityScore,
  getAuthorityLabel,
  isControllingAuthority,
  isStatutoryAuthority,
  isCourtAuthority,
  isAdministrativeAuthority,
  isAccountingAuditAuthority,
  isSpecialDomainAuthority,
  getDomainAuthorityProfile,
  getIssueAuthorityProfile,
  mergeAuthorityProfiles,
  buildTargetAuthorityProfile,
  compareAuthorityTypes,
  sortAuthorityTypes,
  buildAuthorityHierarchyText,
  buildControllingPrecedenceText,
  authorityHierarchyHealthCheck
};
