// FILE: reranker-normalizers.js
"use strict";

const RESPONSE_MODE = Object.freeze({
  QUICK: "QUICK",
  STANDARD: "STANDARD",
  TECHNICAL: "TECHNICAL",
  AUDIT: "AUDIT",
  LITIGATION: "LITIGATION",
  CONTRACT: "CONTRACT",
  TRANSACTION: "TRANSACTION",
  EVIDENCE_HEAVY: "EVIDENCE_HEAVY",
  REVIEWER: "REVIEWER"
});

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function arrayify(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function normalizeMode(mode = RESPONSE_MODE.STANDARD) {
  const value = String(mode || RESPONSE_MODE.STANDARD).trim().toUpperCase();

  const aliases = {
    QUICK_MODE: RESPONSE_MODE.QUICK,
    STANDARD_TAX_MODE: RESPONSE_MODE.STANDARD,
    TECHNICAL_TAX_MODE: RESPONSE_MODE.TECHNICAL,
    AUDIT_MODE: RESPONSE_MODE.AUDIT,
    LITIGATION_LEGAL_DEFENSE_MODE: RESPONSE_MODE.LITIGATION,
    TRANSACTION_CHARACTERIZATION_MODE: RESPONSE_MODE.TRANSACTION,
    CONTRACT_INTERPRETATION_MODE: RESPONSE_MODE.CONTRACT,
    EVIDENCE_EVALUATION_MODE: RESPONSE_MODE.EVIDENCE_HEAVY,
    REVIEWER_LEARNING_MODE: RESPONSE_MODE.REVIEWER,
    ASK: RESPONSE_MODE.STANDARD,
    TAX_EXPERT: RESPONSE_MODE.TECHNICAL,
    TAX_REVIEWER: RESPONSE_MODE.REVIEWER,
    QUIZ_MASTER: RESPONSE_MODE.REVIEWER,
    SOURCE_FINDER: RESPONSE_MODE.STANDARD
  };

  if (aliases[value]) return aliases[value];
  if (Object.values(RESPONSE_MODE).includes(value)) return value;

  if (value.includes("AUDIT")) return RESPONSE_MODE.AUDIT;
  if (value.includes("LITIGATION") || value.includes("LEGAL")) return RESPONSE_MODE.LITIGATION;
  if (value.includes("CONTRACT")) return RESPONSE_MODE.CONTRACT;
  if (value.includes("TRANSACTION")) return RESPONSE_MODE.TRANSACTION;
  if (value.includes("EVIDENCE")) return RESPONSE_MODE.EVIDENCE_HEAVY;
  if (value.includes("REVIEW") || value.includes("QUIZ")) return RESPONSE_MODE.REVIEWER;
  if (value.includes("TECHNICAL") || value.includes("DOCTRINE")) return RESPONSE_MODE.TECHNICAL;
  if (value.includes("QUICK")) return RESPONSE_MODE.QUICK;

  return RESPONSE_MODE.STANDARD;
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!raw) return null;

  const aliases = {
    CONSTITUTION: "CONSTITUTION",

    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    STATUTORY: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    RA: "STATUTE",
    CMTA: "STATUTE",
    LGC: "STATUTE",

    TAX_TREATY: "TREATY",
    TREATY: "TREATY",

    SUPREME_COURT_EN_BANC: "SUPREME_COURT_EN_BANC",
    SUPREME_COURT_DECISION: "SUPREME_COURT",
    SUPREME_COURT: "SUPREME_COURT",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",

    CTA: "CTA_DIVISION",
    CTA_CASE: "CTA_DIVISION",
    CTA_EN_BANC_DECISION: "CTA_EN_BANC",
    CTA_EN_BANC: "CTA_EN_BANC",
    CTA_DIVISION: "CTA_DIVISION",
    COURT_OF_APPEALS: "COURT_OF_APPEALS",

    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    RR: "RR",

    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    RMC: "RMC",

    REVENUE_MEMORANDUM_ORDER: "RMO",
    RMO: "RMO",

    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    RAMO: "RAMO",

    BIR_RULING: "BIR_RULING",
    BIR_RULINGS: "BIR_RULING",

    LGU_ISSUANCE: "LGU",
    LGU: "LGU",
    BOC_ISSUANCE: "BOC_ISSUANCE",
    BOC: "BOC_ISSUANCE",

    OECD_GUIDANCE: "OECD_GUIDANCE",
    FOREIGN_AUTHORITY: "FOREIGN_AUTHORITY",

    PFRS_FOR_SMES: "PFRS",
    IFRS: "PFRS",
    PFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",

    SECONDARY_SOURCE: "SECONDARY",
    CPA_NOTES: "SECONDARY",
    REVIEW_MATERIALS: "SECONDARY"
  };

  return aliases[raw] || raw;
}

export {
  RESPONSE_MODE,
  normalizeText,
  lower,
  unique,
  arrayify,
  normalizeMode,
  normalizeAuthority
};

export default {
  RESPONSE_MODE,
  normalizeText,
  lower,
  unique,
  arrayify,
  normalizeMode,
  normalizeAuthority
};
