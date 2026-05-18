// FILE: authority-constants.js
"use strict";

/**
 * TINA Authority Constants
 * Version: 3.2.0
 *
 * Master Prompt hierarchy:
 * 1. Constitution
 * 2. NIRC / CMTA / LGC / primary statutes
 * 3. Tax Treaties
 * 4. Supreme Court En Banc
 * 5. Supreme Court Division
 * 6. CTA En Banc
 * 7. CTA Division
 * 8. Revenue Regulations
 * 9. RMC / RMO / RAMO
 * 10. BIR Rulings
 * 11. LGU / BOC issuances
 * 12. PFRS / PAS / PSA, when accounting applies
 * 13. OECD / foreign persuasive authorities
 * 14. CPA reviewer notes / secondary materials
 */

export const ENGINE_VERSION = "3.2.0";

export const AUTHORITY_LEVEL = Object.freeze({
  CONSTITUTION: 1,

  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  CMTA: 2,
  LGC: 2,
  REPUBLIC_ACT: 2,
  RA: 2,

  TAX_TREATY: 3,
  TREATY: 3,

  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
  SC: 5,

  CTA_EN_BANC: 6,

  CTA_DIVISION: 7,
  COURT_OF_APPEALS: 7,

  RR: 8,
  REVENUE_REGULATION: 8,

  RMC: 9,
  RMO: 9,
  RAMO: 9,

  BIR_RULING: 10,

  LGU: 11,
  LGU_ISSUANCE: 11,
  BOC_ISSUANCE: 11,
  FIRB_ISSUANCE: 11,
  PEZA_MEMO: 11,
  SEC_GUIDANCE: 11,

  PFRS: 12,
  PAS: 12,
  PSA: 12,

  OECD_GUIDANCE: 13,
  FOREIGN_AUTHORITY: 13,

  SECONDARY: 14,
  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,

  UNKNOWN: 99
});

export const CONTROLLING_PRECEDENCE = Object.freeze({
  ...AUTHORITY_LEVEL
});

export const AUTHORITY_SCORE = Object.freeze({
  CONSTITUTION: 150,

  STATUTE: 145,
  NIRC: 145,
  TAX_CODE: 145,
  CMTA: 145,
  LGC: 145,
  REPUBLIC_ACT: 145,
  RA: 145,

  TAX_TREATY: 138,
  TREATY: 138,

  SUPREME_COURT_EN_BANC: 132,
  SUPREME_COURT: 126,
  SC: 126,

  CTA_EN_BANC: 118,

  CTA_DIVISION: 112,
  COURT_OF_APPEALS: 112,

  RR: 104,
  REVENUE_REGULATION: 104,

  RMC: 96,
  RMO: 94,
  RAMO: 94,

  BIR_RULING: 86,

  LGU: 78,
  LGU_ISSUANCE: 78,
  BOC_ISSUANCE: 78,
  FIRB_ISSUANCE: 78,
  PEZA_MEMO: 78,
  SEC_GUIDANCE: 76,

  PFRS: 70,
  PAS: 70,
  PSA: 66,

  OECD_GUIDANCE: 45,
  FOREIGN_AUTHORITY: 45,

  SECONDARY: 8,
  CPA_NOTES: 8,
  REVIEW_MATERIALS: 8,

  UNKNOWN: 0
});

export const AUTHORITY_LABEL = Object.freeze({
  CONSTITUTION: "1987 Constitution",

  STATUTE: "Primary Statute",
  NIRC: "NIRC / Tax Code",
  TAX_CODE: "Tax Code",
  CMTA: "Customs Modernization and Tariff Act",
  LGC: "Local Government Code",
  REPUBLIC_ACT: "Republic Act",
  RA: "Republic Act",

  TAX_TREATY: "Tax Treaty",
  TREATY: "Tax Treaty",

  SUPREME_COURT_EN_BANC: "Supreme Court En Banc Decision",
  SUPREME_COURT: "Supreme Court Decision",
  SC: "Supreme Court Decision",

  CTA_EN_BANC: "CTA En Banc Decision",

  CTA_DIVISION: "CTA Division Decision",
  COURT_OF_APPEALS: "Court of Appeals Decision",

  RR: "Revenue Regulations",
  REVENUE_REGULATION: "Revenue Regulations",

  RMC: "Revenue Memorandum Circular",
  RMO: "Revenue Memorandum Order",
  RAMO: "Revenue Audit Memorandum Order",

  BIR_RULING: "BIR Ruling",

  LGU: "LGU Issuance",
  LGU_ISSUANCE: "LGU Issuance",
  BOC_ISSUANCE: "BOC / Customs Issuance",
  FIRB_ISSUANCE: "FIRB Issuance",
  PEZA_MEMO: "PEZA Issuance",
  SEC_GUIDANCE: "SEC Guidance",

  PFRS: "Philippine Financial Reporting Standards",
  PAS: "Philippine Accounting Standards",
  PSA: "Philippine Standards on Auditing",

  OECD_GUIDANCE: "OECD Guidance",
  FOREIGN_AUTHORITY: "Foreign Persuasive Authority",

  SECONDARY: "Secondary Material",
  CPA_NOTES: "CPA Reviewer Notes",
  REVIEW_MATERIALS: "Reviewer Materials",

  UNKNOWN: "Unknown Authority"
});

export const COURT_TYPES = new Set([
  "SUPREME_COURT_EN_BANC",
  "SUPREME_COURT",
  "SC",
  "CTA_EN_BANC",
  "COURT_OF_APPEALS",
  "CTA_DIVISION"
]);

export const BIR_TYPES = new Set([
  "RR",
  "REVENUE_REGULATION",
  "RMC",
  "RMO",
  "RAMO",
  "BIR_RULING"
]);

export const PRIMARY_STATUTE_TYPES = new Set([
  "STATUTE",
  "NIRC",
  "TAX_CODE",
  "CMTA",
  "LGC",
  "REPUBLIC_ACT",
  "RA"
]);

export const ACCOUNTING_TYPES = new Set([
  "PFRS",
  "PAS",
  "PSA"
]);

export const PERSUASIVE_TYPES = new Set([
  "OECD_GUIDANCE",
  "FOREIGN_AUTHORITY"
]);

export const SECONDARY_TYPES = new Set([
  "SECONDARY",
  "CPA_NOTES",
  "REVIEW_MATERIALS"
]);

export const MASTER_AUTHORITY_RULES = Object.freeze({
  masterPromptAuthorityHierarchyApplied: true,
  courtAuthorityNotSubordinatedToBIRIssuances: true,
  birIssuanceCannotOverrideCourtDoctrine: true,
  reviewerSourcesNeverControlling: true,
  indexedSourceNotFoundFallback: "Indexed source not found."
});
