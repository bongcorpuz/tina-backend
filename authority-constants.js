// FILE: authority-constants.js
"use strict";

export const ENGINE_VERSION = "3.1.0";

export const AUTHORITY_LEVEL = Object.freeze({
  CONSTITUTION: 1,
  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  SUPREME_COURT: 3,
  RR: 4,
  TAX_TREATY: 5,
  TREATY: 5,
  RMC: 6,
  RMO: 7,
  RAMO: 8,
  BIR_RULING: 9,
  CTA_EN_BANC: 10,
  COURT_OF_APPEALS: 11,
  CTA_DIVISION: 12,
  LGU: 13,
  BOC_ISSUANCE: 13,
  PFRS: 14,
  PAS: 15,
  PSA: 16,
  OECD_GUIDANCE: 30,
  SECONDARY: 98,
  UNKNOWN: 99
});

export const CONTROLLING_PRECEDENCE = Object.freeze({ ...AUTHORITY_LEVEL });

export const AUTHORITY_SCORE = Object.freeze({
  CONSTITUTION: 100,
  STATUTE: 98,
  NIRC: 98,
  TAX_CODE: 98,
  SUPREME_COURT: 96,
  RR: 92,
  TAX_TREATY: 88,
  TREATY: 88,
  RMC: 80,
  RMO: 76,
  RAMO: 74,
  BIR_RULING: 68,
  CTA_EN_BANC: 66,
  COURT_OF_APPEALS: 62,
  CTA_DIVISION: 58,
  LGU: 54,
  BOC_ISSUANCE: 54,
  PFRS: 52,
  PAS: 52,
  PSA: 50,
  OECD_GUIDANCE: 20,
  SECONDARY: 10,
  UNKNOWN: 0
});

export const AUTHORITY_LABEL = Object.freeze({
  CONSTITUTION: "1987 Constitution",
  STATUTE: "Statute / NIRC / Republic Act",
  NIRC: "NIRC / Tax Code",
  TAX_CODE: "Tax Code",
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
  LGU: "Local Tax Ordinance",
  BOC_ISSUANCE: "BOC / Customs Issuance",
  PFRS: "Philippine Financial Reporting Standards",
  PAS: "Philippine Accounting Standards",
  PSA: "Philippine Standards on Auditing",
  OECD_GUIDANCE: "OECD Guidance",
  SECONDARY: "Secondary Material",
  UNKNOWN: "Unknown Authority"
});

export const COURT_TYPES = new Set([
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "COURT_OF_APPEALS",
  "CTA_DIVISION"
]);

export const BIR_TYPES = new Set([
  "RR",
  "RMC",
  "RMO",
  "RAMO",
  "BIR_RULING",
  "TAX_TREATY",
  "BOC_ISSUANCE",
  "OECD_GUIDANCE"
]);
