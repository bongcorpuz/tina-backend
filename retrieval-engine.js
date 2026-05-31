// FILE: retrieval-engine.js
"use strict";

/**
 * TINA Enterprise Retrieval Orchestration Engine
 * Version: 6.0.0
 *
 * Role:
 * - Retrieve issue-specific, authority-grounded sources
 * - Normalize authority citations and variants
 * - Apply layered retrieval before reranking
 * - Preserve issueClassificationMatch downstream
 * - Respect TINA Master/Sub-Master Prompt hierarchy
 *
 * Boundary:
 * - Does not answer
 * - Does not render
 * - Does not call OpenAI
 * - Does not fabricate authorities
 */

import {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import { applySupersessionFilter } from "./supersession-engine.js";
import { analyzeQueryIntent } from "./query-intent-engine.js";

import {
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc
} from "./issue-classification-engine.js";

import { rerankForTina } from "./reranker-engine.js";

const ENGINE_VERSION = "6.0.0";

const DEFAULT_TOP_K = 12;
const DEFAULT_POOL_K = 48;
const MAX_SOURCE_TEXT_CHARS = 3500;
const MAX_SOURCE_TITLE_CHARS = 240;
const MAX_SOURCE_CITATION_CHARS = 240;
const MAX_SOURCE_URL_CHARS = 500;
const MAX_DIAGNOSTIC_ITEMS = 24;

const RETRIEVAL_LAYER = Object.freeze({
  EXACT_NORMALIZED_AUTHORITY: "LAYER_1_EXACT_NORMALIZED_AUTHORITY",
  CITATION_VARIANT: "LAYER_2_CITATION_VARIANT",
  TITLE_PATH_METADATA: "LAYER_3_TITLE_PATH_METADATA",
  CONTENT_KEYWORD: "LAYER_4_CONTENT_KEYWORD",
  VECTOR_SEMANTIC: "LAYER_5_VECTOR_SEMANTIC",
  BROAD_TAX_DOMAIN_FALLBACK: "LAYER_6_BROAD_TAX_DOMAIN_FALLBACK",
  PROVIDED_DOCUMENTS: "PROVIDED_DOCUMENTS",
  SUPABASE_FALLBACK: "SUPABASE_FALLBACK"
});

const AUTHORITY_WEIGHT = Object.freeze({
  CONSTITUTION: 140,
  STATUTE: 135,
  NIRC: 135,
  TAX_CODE: 135,
  CMTA: 135,
  LGC: 135,
  REPUBLIC_ACT: 135,
  RA: 135,
  TAX_TREATY: 130,
  SUPREME_COURT_EN_BANC: 125,
  SUPREME_COURT: 120,
  CTA_EN_BANC: 112,
  CTA_DIVISION: 106,
  COURT_OF_APPEALS: 104,
  RR: 96,
  REVENUE_REGULATION: 96,
  RMC: 88,
  RMO: 86,
  RAMO: 86,
  BIR_RULING: 78,
  LGU: 70,
  BOC_ISSUANCE: 70,
  FIRB_ISSUANCE: 70,
  PEZA_MEMO: 70,
  PFRS: 62,
  PAS: 62,
  PSA: 58,
  OECD_GUIDANCE: 45,
  FOREIGN_AUTHORITY: 45,
  SECONDARY: 10,
  CPA_NOTES: 10,
  REVIEW_MATERIALS: 10,
  UNKNOWN: 0
});

// Authority types that represent genuine primary legal/administrative sources.
// A candidate pool containing at least one of these qualifies the
// uniqueAuthorityCount rule inside isAuthoritySufficient() — ensuring the gate
// only fires when real controlling authorities are present, not just secondary
// material (CPA notes, reviewer handouts, UNKNOWN-typed chunks).
// Domain-general: covers all tax/legal domains TINA handles.
const CONTROLLING_AUTHORITY_TYPES = Object.freeze(new Set([
  "CONSTITUTION",
  "STATUTE", "NIRC", "TAX_CODE", "CMTA", "LGC", "REPUBLIC_ACT", "RA",
  "TAX_TREATY",
  "SUPREME_COURT_EN_BANC", "SUPREME_COURT",
  "CTA_EN_BANC", "CTA_DIVISION", "COURT_OF_APPEALS",
  "RR", "REVENUE_REGULATION", "RMC", "RMO", "RAMO",
  "BIR_RULING",
  "BOC_ISSUANCE", "FIRB_ISSUANCE", "PEZA_MEMO",
  "LGU"
]));

// Subset of CONTROLLING_AUTHORITY_TYPES — court/tribunal types only.
// Used by the jurisprudence safety guard in isAuthoritySufficient() to check
// whether the candidate pool contains any case-law chunks.
const CASE_AUTHORITY_TYPES = Object.freeze(new Set([
  "SUPREME_COURT_EN_BANC", "SUPREME_COURT",
  "CTA_EN_BANC", "CTA_DIVISION",
  "COURT_OF_APPEALS"
]));

// Matches Philippine court citation formats found in TINA's indexed corpus:
//   G.R. No. / G.R. Nos. — Supreme Court docket numbers
//   C.T.A. / CTA Case / CTA EB / CTA Div — Court of Tax Appeals citations
// Used to detect jurisprudence-heavy queries from targetAuthorities strings.
const CASE_CITATION_PATTERN = /G\.R\.\s*Nos?\.|C\.T\.A\.|CTA\s*(Case|EB|Div)/i;

const AUTHORITY_LEVEL = Object.freeze({
  CONSTITUTION: 1,
  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  CMTA: 2,
  LGC: 2,
  REPUBLIC_ACT: 2,
  RA: 2,
  TAX_TREATY: 3,
  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
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
  BOC_ISSUANCE: 11,
  FIRB_ISSUANCE: 11,
  PEZA_MEMO: 11,
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

const GOOGLE_DRIVE_FOLDER_AUTHORITY = Object.freeze({
  "01_tax_code": "STATUTE",
  "02_revenue_regulations": "RR",
  "03_rmc": "RMC",
  "04_rmo": "RMO",
  "05_bir_rulings": "BIR_RULING",
  "06_court_cases": "SUPREME_COURT",
  "07_cpa_notes": "SECONDARY",
  "08_review_materials": "SECONDARY"
});

const HIDDEN_REVIEWER_PATTERNS = [
  "07_cpa_notes",
  "08_review_materials",
  "reviewer",
  "handout",
  "lecture notes",
  "cpa notes",
  "review materials"
];

const REVIEW_ALLOWED_MODES = new Set([
  "REVIEWER",
  "TAX_REVIEWER",
  "REVIEWER_LEARNING_MODE",
  "ASSESSMENT",
  "QUIZ"
]);

const MODE_ALIASES = Object.freeze({
  ASK: "STANDARD",
  TAX_EXPERT: "TECHNICAL",
  TAX_REVIEWER: "REVIEWER",
  SOURCE_FINDER: "SOURCE",
  CASE_ANALYSIS: "TECHNICAL",
  AUDIT_MODE: "AUDIT",
  LITIGATION_LEGAL_DEFENSE_MODE: "LITIGATION",
  TRANSACTION_CHARACTERIZATION_MODE: "TRANSACTION",
  CONTRACT_INTERPRETATION_MODE: "CONTRACT",
  EVIDENCE_EVALUATION_MODE: "EVIDENCE_HEAVY",
  FACT_PATTERN_ANALYSIS_MODE: "TECHNICAL",
  REVIEWER_LEARNING_MODE: "REVIEWER"
});

const AUTHORITY_GROUP_TO_TYPES = Object.freeze({
  constitution: ["CONSTITUTION"],
  nirc: ["STATUTE", "NIRC", "TAX_CODE"],
  statute: ["STATUTE", "NIRC", "TAX_CODE", "CMTA", "LGC", "REPUBLIC_ACT"],
  taxCode: ["STATUTE", "NIRC", "TAX_CODE"],
  republicAct: ["REPUBLIC_ACT", "STATUTE"],
  taxTreaty: ["TAX_TREATY"],
  treaty: ["TAX_TREATY"],
  supremeCourtEnBanc: ["SUPREME_COURT_EN_BANC"],
  supremeCourt: ["SUPREME_COURT"],
  jurisprudence: ["SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],
  cases: ["SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"],
  ctaEnBanc: ["CTA_EN_BANC"],
  ctaDivision: ["CTA_DIVISION"],
  rr: ["RR"],
  revenueRegulations: ["RR"],
  rmc: ["RMC"],
  rmo: ["RMO"],
  ramo: ["RAMO"],
  birRulings: ["BIR_RULING"],
  birRuling: ["BIR_RULING"],
  lgu: ["LGU"],
  boc: ["BOC_ISSUANCE"],
  pfrs: ["PFRS"],
  pas: ["PAS"],
  psa: ["PSA"],
  oecd: ["OECD_GUIDANCE"],
  cpaNotes: ["SECONDARY"],
  reviewMaterials: ["SECONDARY"]
});

const TAX_DOMAIN_SEARCH_HINTS = Object.freeze({
  VAT: {
    keywords: [
      "VAT",
      "value-added tax",
      "sale of goods",
      "sale of services",
      "course of trade or business",
      "output tax",
      "input tax",
      "gross selling price",
      "gross receipts"
    ],
    authorities: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005"]
  },

  VAT_DEFINITION: {
    keywords: [
      "VAT",
      "value-added tax",
      "sale of goods",
      "sale of services",
      "course of trade or business",
      "output tax",
      "input tax"
    ],
    authorities: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 108", "RR 16-2005"]
  },

  INCOME_TAX: {
    keywords: ["income tax", "taxable income", "gross income", "deductions", "RCIT", "MCIT", "NOLCO"],
    authorities: ["NIRC Sec. 23", "NIRC Sec. 24", "NIRC Sec. 27", "NIRC Sec. 31", "NIRC Sec. 32", "NIRC Sec. 34"]
  },

  CIT: {
    keywords: ["corporate income tax", "regular corporate income tax", "minimum corporate income tax", "deductions"],
    authorities: ["NIRC Sec. 27", "NIRC Sec. 28", "NIRC Sec. 34", "CREATE Act"]
  },

  WITHHOLDING: {
    keywords: ["withholding tax", "expanded withholding tax", "creditable withholding tax", "final withholding tax", "withholding agent"],
    authorities: ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"]
  },

  WHT: {
    keywords: ["withholding tax", "expanded withholding tax", "creditable withholding tax", "final withholding tax", "withholding agent"],
    authorities: ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"]
  },

  PCT: {
    keywords: ["percentage tax", "non-VAT taxpayer", "2551Q", "gross sales", "gross receipts"],
    authorities: ["NIRC Sec. 116", "NIRC Sec. 117", "NIRC Sec. 118", "NIRC Sec. 119", "NIRC Sec. 120", "NIRC Sec. 121", "NIRC Sec. 122"]
  },

  EXC: {
    keywords: ["excise tax", "excise", "sin tax", "specific tax", "ad valorem tax"],
    authorities: ["NIRC Title VI", "NIRC Secs. 129-172"]
  },

  DST: {
    keywords: ["documentary stamp tax", "DST", "document", "instrument", "loan agreement", "shares", "debt instrument"],
    authorities: ["NIRC Title VII", "NIRC Secs. 173-201"]
  },

  CGT: {
    keywords: ["capital gains tax", "CGT", "sale of shares", "sale of real property", "capital asset"],
    authorities: ["NIRC Sec. 24(C)", "NIRC Sec. 24(D)", "NIRC Sec. 27(D)(2)", "NIRC Sec. 28(A)(7)", "NIRC Sec. 28(B)(5)"]
  },

  ESTATE_TAX: {
    keywords: ["estate tax", "gross estate", "net estate", "decedent", "estate deduction"],
    authorities: ["NIRC Secs. 84-97"]
  },

  DONOR_TAX: {
    keywords: ["donor's tax", "donor tax", "donation", "gift tax", "net gift"],
    authorities: ["NIRC Secs. 98-104"]
  },

  LGT: {
    keywords: ["local business tax", "LBT", "local government taxation", "LGU", "mayor's permit"],
    authorities: ["Local Government Code Sec. 143", "Local Government Code Sec. 151"]
  },

  RPT: {
    keywords: ["real property tax", "RPT", "assessed value", "assessment level", "real property assessment"],
    authorities: ["Local Government Code Sec. 197", "Local Government Code Sec. 198", "Local Government Code Sec. 199", "Local Government Code Sec. 232"]
  },

  CUS: {
    keywords: ["customs duties", "customs", "tariff", "CMTA", "import duty", "customs valuation"],
    authorities: ["CMTA", "CMTA customs valuation provisions", "CMTA tariff classification provisions"]
  },

  SPC: {
    keywords: ["PEZA", "incentives", "CREATE incentives", "FIRB", "SCIT", "income tax holiday", "transfer pricing"],
    authorities: ["CREATE Act", "NIRC incentive provisions", "PEZA law", "FIRB issuances"]
  },

  TAX_REFUND_CREDIT: {
    keywords: ["tax refund", "tax credit", "claim for refund", "TCC", "erroneously paid tax", "excess input VAT"],
    authorities: ["NIRC Sec. 112", "NIRC Sec. 204", "NIRC Sec. 229"]
  },

  ASSESSMENT: {
    keywords: ["tax assessment", "deficiency tax", "LOA", "PAN", "FAN", "FDDA", "due process"],
    authorities: ["NIRC Sec. 203", "NIRC Sec. 222", "NIRC Sec. 228", "RR 18-2013"]
  },

  PRESCRIPTION: {
    keywords: ["prescription", "prescriptive period", "statute of limitations", "waiver", "three years", "ten years"],
    authorities: ["NIRC Sec. 203", "NIRC Sec. 222"]
  },

  DEDUCTIONS: {
    keywords: ["deductions", "deductible expense", "ordinary and necessary", "substantiation", "withholding requirement"],
    authorities: ["NIRC Sec. 34", "NIRC Sec. 34(A)", "NIRC Sec. 34(K)"]
  },

  EXEMPTIONS: {
    keywords: ["tax exemption", "exemption", "strictissimi juris", "exempt taxpayer"],
    authorities: ["NIRC exemption provisions", "1987 Constitution tax exemption principles", "Supreme Court tax exemption jurisprudence"]
  },

  INPUT_TAX: {
    keywords: ["input tax", "input VAT", "creditable input tax", "input tax credit", "excess input tax"],
    authorities: ["NIRC Sec. 110", "NIRC Sec. 112", "RR 16-2005"]
  },

  OUTPUT_TAX: {
    keywords: ["output tax", "output VAT", "VAT payable", "VAT liability", "gross selling price", "gross receipts"],
    authorities: ["NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005"]
  },

  ZERO_RATING: {
    keywords: ["zero-rating", "zero rated", "0% VAT", "export sales", "effectively zero-rated sales"],
    authorities: ["NIRC Sec. 106(A)(2)", "NIRC Sec. 108(B)", "RR 16-2005"]
  }
});

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\u00A0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function unique(values = []) {
  return [...new Set(safeArray(values).filter(Boolean))];
}

function trimString(value = "", max = 1000) {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()} ...[trimmed]`;
}

function normalizeYear(year = "") {
  const raw = String(year || "").trim();
  if (!raw) return "";
  if (/^\d{4}$/.test(raw)) return raw;

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);
    const currentYY = new Date().getFullYear() % 100;
    return yy <= currentYY + 1 ? `20${raw}` : `19${raw}`;
  }

  return raw;
}

function normalizeMode(mode = "STANDARD") {
  const value = String(mode || "STANDARD").trim().toUpperCase();

  if (MODE_ALIASES[value]) return MODE_ALIASES[value];

  if (
    [
      "QUICK",
      "STANDARD",
      "TECHNICAL",
      "AUDIT",
      "LITIGATION",
      "CONTRACT",
      "TRANSACTION",
      "EVIDENCE_HEAVY",
      "REVIEWER",
      "SOURCE"
    ].includes(value)
  ) {
    return value;
  }

  if (value.includes("AUDIT")) return "AUDIT";
  if (value.includes("LITIGATION") || value.includes("LEGAL")) return "LITIGATION";
  if (value.includes("CONTRACT")) return "CONTRACT";
  if (value.includes("TRANSACTION")) return "TRANSACTION";
  if (value.includes("EVIDENCE")) return "EVIDENCE_HEAVY";
  if (value.includes("REVIEWER") || value.includes("QUIZ")) return "REVIEWER";
  if (value.includes("SOURCE")) return "SOURCE";
  if (value.includes("TECHNICAL") || value.includes("DOCTRINE")) return "TECHNICAL";

  return "STANDARD";
}

function isReviewMode(mode = "STANDARD", adaptiveContext = {}) {
  const normalized = normalizeMode(mode);
  const hookCode = String(
    adaptiveContext?.hookCode ||
      adaptiveContext?.modeHook ||
      adaptiveContext?.activeHook ||
      ""
  ).toLowerCase();

  const responseMode = String(
    adaptiveContext?.responsePlan?.responseMode ||
      adaptiveContext?.responseMode ||
      ""
  ).toUpperCase();

  return (
    REVIEW_ALLOWED_MODES.has(normalized) ||
    REVIEW_ALLOWED_MODES.has(responseMode) ||
    hookCode === "/review" ||
    hookCode === "/quiz" ||
    hookCode.includes("review") ||
    hookCode.includes("quiz") ||
    adaptiveContext?.assessmentMode === true ||
    adaptiveContext?.adaptiveQuizMode === true
  );
}

function normalizeIssue(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VAT: "VAT",
    VAT_LIABILITY: "VAT",
    VALUE_ADDED_TAX: "VAT",
    VAT_DEFINITION: "VAT_DEFINITION",
    DEFINITION_OF_VAT: "VAT_DEFINITION",
    VALUE_ADDED_TAX_DEFINITION: "VAT_DEFINITION",
    INPUT_VAT: "INPUT_TAX",
    INPUT_TAX: "INPUT_TAX",
    OUTPUT_VAT: "OUTPUT_TAX",
    OUTPUT_TAX: "OUTPUT_TAX",
    TAX_REFUND: "TAX_REFUND_CREDIT",
    VAT_REFUND: "TAX_REFUND_CREDIT",
    REFUND: "TAX_REFUND_CREDIT",
    REFUND_CREDIT: "TAX_REFUND_CREDIT",
    ZERO_RATING: "ZERO_RATING",
    VAT_ZERO_RATING: "ZERO_RATING",
    EXEMPTION: "EXEMPTIONS",
    VAT_EXEMPTION: "EXEMPTIONS",
    REGISTRATION: "VAT_REGISTRATION",
    VAT_REGISTRATION: "VAT_REGISTRATION",
    WITHHOLDING_VAT: "WITHHOLDING_VAT",
    WVAT: "WITHHOLDING_VAT",
    EWT: "WITHHOLDING",
    CWT: "WITHHOLDING",
    FWT: "WITHHOLDING",
    WITHHOLDING_TAX: "WITHHOLDING",
    WHT: "WITHHOLDING",
    RCIT: "INCOME_TAX",
    MCIT: "INCOME_TAX",
    NOLCO: "INCOME_TAX",
    CIT: "INCOME_TAX",
    IIT: "INCOME_TAX",
    INCOME_TAX: "INCOME_TAX",
    PERCENTAGE_TAX: "PCT",
    EXCISE_TAX: "EXC",
    DOCUMENTARY_STAMP_TAX: "DST",
    CAPITAL_GAINS_TAX: "CGT",
    ESTATE_TAX: "ESTATE_TAX",
    DONOR_TAX: "DONOR_TAX",
    DONORS_TAX: "DONOR_TAX",
    LOCAL_BUSINESS_TAX: "LGT",
    REAL_PROPERTY_TAX: "RPT",
    CUSTOMS_DUTIES: "CUS",
    CUSTOMS: "CUS",
    TARIFF: "CUS",
    PEZA: "SPC",
    INCENTIVES: "SPC",
    CREATE_INCENTIVES: "SPC",
    ASSESSMENT: "ASSESSMENT",
    TAX_ASSESSMENT: "ASSESSMENT",
    PRESCRIPTION: "PRESCRIPTION",
    DEDUCTION: "DEDUCTIONS",
    DEDUCTIONS: "DEDUCTIONS",
    PRINCIPAL_AGENT: "TRANSACTION",
    PRINCIPAL_VS_AGENT: "TRANSACTION",
    GROSS_NET: "TRANSACTION",
    PASS_THROUGH: "TRANSACTION",
    REIMBURSEMENT: "TRANSACTION",
    AGREEMENT: "CONTRACT",
    CHARACTERIZATION: "TRANSACTION",
    DEFINITION: "VAT_DEFINITION"
  };

  return aliases[raw] || raw || null;
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    CONSTITUTION: "CONSTITUTION",
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    RA: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    STATUTE: "STATUTE",
    CMTA: "STATUTE",
    LGC: "STATUTE",
    TREATY: "TAX_TREATY",
    TAX_TREATY: "TAX_TREATY",
    SUPREME_COURT_EN_BANC: "SUPREME_COURT_EN_BANC",
    SUPREME_COURT: "SUPREME_COURT",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
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
    LGU: "LGU",
    LGU_ISSUANCE: "LGU",
    BOC: "BOC_ISSUANCE",
    BOC_ISSUANCE: "BOC_ISSUANCE",
    FIRB: "FIRB_ISSUANCE",
    FIRB_ISSUANCE: "FIRB_ISSUANCE",
    PEZA: "PEZA_MEMO",
    PEZA_MEMO: "PEZA_MEMO",
    OECD: "OECD_GUIDANCE",
    OECD_GUIDANCE: "OECD_GUIDANCE",
    FOREIGN_AUTHORITY: "FOREIGN_AUTHORITY",
    IFRS: "PFRS",
    PFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",
    SECONDARY: "SECONDARY",
    SECONDARY_SOURCE: "SECONDARY",
    CPA_NOTES: "SECONDARY",
    REVIEW_MATERIALS: "SECONDARY"
  };

  return aliases[raw] || raw || null;
}

function normalizeAuthorityCitation(value = "") {
  const raw = normalizeText(value);

  if (!raw) {
    return {
      raw: "",
      normalized: "",
      type: "UNKNOWN",
      key: "",
      number: null,
      year: null
    };
  }

  let match = raw.match(
    /\b(?:nirc|tax code)?\s*(?:sec\.?|section)\s*(\d+[a-z]?(?:\([a-z0-9]+\))*)\b/i
  );

  if (match) {
    const section = String(match[1]).toUpperCase();

    return {
      raw,
      normalized: `NIRC Sec. ${section}`,
      type: "NIRC_SECTION",
      key: `NIRC_SEC_${section.replace(/[^A-Z0-9]+/g, "_")}`,
      number: section,
      year: null
    };
  }

  match = raw.match(
    /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
  );

  if (match) {
    const number = String(Number(match[1]));
    const padded = number.padStart(3, "0");
    const year = normalizeYear(match[2]);

    return {
      raw,
      normalized: `RR ${number}-${year}`,
      type: "RR",
      key: `RR_${number}_${year}`,
      number,
      paddedNumber: padded,
      year
    };
  }

  match = raw.match(
    /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
  );

  if (match) {
    const number = String(Number(match[1]));
    const padded = number.padStart(3, "0");
    const year = normalizeYear(match[2]);

    return {
      raw,
      normalized: `RMC ${number}-${year}`,
      type: "RMC",
      key: `RMC_${number}_${year}`,
      number,
      paddedNumber: padded,
      year
    };
  }

  match = raw.match(
    /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
  );

  if (match) {
    const number = String(Number(match[1]));
    const padded = number.padStart(3, "0");
    const year = normalizeYear(match[2]);

    return {
      raw,
      normalized: `RMO ${number}-${year}`,
      type: "RMO",
      key: `RMO_${number}_${year}`,
      number,
      paddedNumber: padded,
      year
    };
  }

  match = raw.match(
    /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
  );

  if (match) {
    const number = String(Number(match[1]));
    const padded = number.padStart(3, "0");
    const year = normalizeYear(match[2]);

    return {
      raw,
      normalized: `RAMO ${number}-${year}`,
      type: "RAMO",
      key: `RAMO_${number}_${year}`,
      number,
      paddedNumber: padded,
      year
    };
  }

  match = raw.match(/\b(?:ra|r\.a\.|republic act)\s*(?:no\.?)?\s*(\d{4,6})\b/i);

  if (match) {
    return {
      raw,
      normalized: `RA ${match[1]}`,
      type: "RA",
      key: `RA_${match[1]}`,
      number: match[1],
      year: null
    };
  }

  match = raw.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);

  if (match) {
    return {
      raw,
      normalized: `G.R. No. ${match[1]}`,
      type: "SUPREME_COURT",
      key: `GR_${String(match[1]).toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
      number: match[1],
      year: null
    };
  }

  const generic = normalizeText(raw)
    .replace(/\bSections?\b/gi, "Sec.")
    .replace(/\bSection\b/gi, "Sec.")
    .replace(/\bRevenue Regulations?\b/gi, "RR")
    .replace(/\bNo\.\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    raw,
    normalized: generic,
    type: normalizeAuthority(generic) || "GENERIC",
    key: generic.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
    number: null,
    year: null
  };
}

function generateAuthorityVariants(authority = "") {
  const parsed = normalizeAuthorityCitation(authority);
  const variants = [];

  if (!parsed.raw) return variants;

  const push = (value) => {
    const text = normalizeText(value);
    if (text) variants.push(text);
  };

  push(parsed.raw);
  push(parsed.normalized);

  if (parsed.type === "NIRC_SECTION") {
    const sec = parsed.number;

    push(`NIRC Sec. ${sec}`);
    push(`NIRC Sec ${sec}`);
    push(`NIRC Section ${sec}`);
    push(`Tax Code Sec. ${sec}`);
    push(`Tax Code Section ${sec}`);
    push(`Section ${sec}`);
    push(`Sec. ${sec}`);
    push(`Sec ${sec}`);
    push(sec);
  } else if (["RR", "RMC", "RMO", "RAMO"].includes(parsed.type)) {
    const prefix = parsed.type;
    const n = parsed.number;
    const padded = parsed.paddedNumber || String(n).padStart(3, "0");
    const year = parsed.year;

    const longNameMap = {
      RR: ["Revenue Regulation", "Revenue Regulations"],
      RMC: ["Revenue Memorandum Circular", "Revenue Memorandum Circulars"],
      RMO: ["Revenue Memorandum Order", "Revenue Memorandum Orders"],
      RAMO: ["Revenue Audit Memorandum Order", "Revenue Audit Memorandum Orders"]
    };

    push(`${prefix} ${n}-${year}`);
    push(`${prefix} No. ${n}-${year}`);
    push(`${prefix} ${padded}-${year}`);
    push(`${prefix} No. ${padded}-${year}`);

    for (const longName of longNameMap[prefix] || []) {
      push(`${longName} No. ${n}-${year}`);
      push(`${longName} No. ${padded}-${year}`);
      push(`${longName} ${n}-${year}`);
      push(`${longName} ${padded}-${year}`);
    }
  } else if (parsed.type === "RA") {
    push(`RA ${parsed.number}`);
    push(`R.A. No. ${parsed.number}`);
    push(`Republic Act No. ${parsed.number}`);
    push(`Republic Act ${parsed.number}`);
    push(parsed.number);
  } else if (parsed.type === "SUPREME_COURT") {
    push(`G.R. No. ${parsed.number}`);
    push(`GR No. ${parsed.number}`);
    push(`G.R. ${parsed.number}`);
    push(parsed.number);
  }

  return unique(variants);
}

function normalizeTargetAuthorities(targetAuthorities = null) {
  const output = [];

  const pushType = (value) => {
    const normalized = normalizeAuthority(value);
    if (normalized) output.push(normalized);
  };

  if (Array.isArray(targetAuthorities)) {
    for (const item of targetAuthorities) {
      if (typeof item === "string") {
        const citation = normalizeAuthorityCitation(item);

        if (citation.type === "NIRC_SECTION") {
          output.push("STATUTE", "NIRC");
        } else if (citation.type && citation.type !== "GENERIC") {
          output.push(normalizeAuthority(citation.type) || citation.type);
        } else {
          pushType(item);
        }
      } else if (item && typeof item === "object") {
        pushType(item.type || item.authorityType || item.group);
      }
    }

    return unique(output);
  }

  if (targetAuthorities && typeof targetAuthorities === "object") {
    for (const [group, values] of Object.entries(targetAuthorities)) {
      output.push(...safeArray(AUTHORITY_GROUP_TO_TYPES[group]));

      for (const value of safeArray(values)) {
        if (typeof value === "string") {
          const citation = normalizeAuthorityCitation(value);

          if (citation.type === "NIRC_SECTION") {
            output.push("STATUTE", "NIRC");
          } else if (citation.type && citation.type !== "GENERIC") {
            output.push(normalizeAuthority(citation.type) || citation.type);
          } else {
            pushType(value);
          }
        } else if (value && typeof value === "object") {
          pushType(value.type || value.authorityType || value.group);
        }
      }
    }
  }

  return unique(output);
}

function extractAuthoritySearchTerms(targetAuthorities = null) {
  const output = [];

  const pushTerm = (value) => {
    const term = normalizeText(
      typeof value === "string"
        ? value
        : value?.title ||
          value?.name ||
          value?.citation ||
          value?.reference ||
          value?.normalizedReference ||
          value?.authority ||
          ""
    );

    if (!term) return;

    if (
      !normalizeAuthority(term) ||
      /\d|sec|section|rr|rmc|rmo|ramo|cir|v\.|versus|gr|g\.r\./i.test(term)
    ) {
      output.push(term);
    }
  };

  if (Array.isArray(targetAuthorities)) {
    targetAuthorities.forEach(pushTerm);
  } else if (targetAuthorities && typeof targetAuthorities === "object") {
    for (const values of Object.values(targetAuthorities)) {
      safeArray(values).forEach(pushTerm);
    }
  }

  return unique(output);
}

function detectIssueType(text = "") {
  const q = lower(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(/\b(define vat|definition of vat|what is vat|value-added tax|value added tax)\b/i.test(q), "VAT_DEFINITION");
  push(/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|unutilized input vat|excess input vat|claim for refund)\b/i.test(q), "TAX_REFUND_CREDIT");
  push(/\b(zero-rated|zero rating|zero-rate|effectively zero-rated|export sales)\b/i.test(q), "ZERO_RATING");
  push(/\b(vat exempt|exempt from vat|vat exemption|section 109|sec\.?\s*109)\b/i.test(q), "EXEMPTIONS");
  push(/\b(vat registration|register for vat|threshold|3 million|vat taxpayer)\b/i.test(q), "VAT_REGISTRATION");
  push(/\b(withholding vat|wvat|government money payment|5% final vat)\b/i.test(q), "WITHHOLDING_VAT");
  push(/\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|gross selling price|gross receipts)\b/i.test(q), "VAT");
  push(/\b(input tax|input vat|creditable input)\b/i.test(q), "INPUT_TAX");
  push(/\b(output tax|output vat|vat payable)\b/i.test(q), "OUTPUT_TAX");
  push(/\b(jurisdiction|jurisdictional|prescriptive|deadline|due date|filing|appeal|protest|assessment|loa|pan|fan|fld|fdda)\b/i.test(q), "ASSESSMENT");
  push(/\b(prescription|prescriptive|statute of limitations|waiver)\b/i.test(q), "PRESCRIPTION");
  push(/\b(withholding|ewt|expanded withholding|final withholding|fwt|cwt)\b/i.test(q), "WITHHOLDING");
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|deduction|taxable income|gross income)\b/i.test(q), "INCOME_TAX");
  push(/\b(percentage tax|2551q|non-vat)\b/i.test(q), "PCT");
  push(/\b(excise tax|excise)\b/i.test(q), "EXC");
  push(/\b(documentary stamp tax|dst)\b/i.test(q), "DST");
  push(/\b(capital gains tax|cgt)\b/i.test(q), "CGT");
  push(/\b(estate tax|gross estate|decedent)\b/i.test(q), "ESTATE_TAX");
  push(/\b(donor'?s tax|donor tax|donation|gift tax)\b/i.test(q), "DONOR_TAX");
  push(/\b(local business tax|lbt|mayor'?s permit)\b/i.test(q), "LGT");
  push(/\b(real property tax|rpt|assessed value)\b/i.test(q), "RPT");
  push(/\b(customs|tariff|import duty|cmta)\b/i.test(q), "CUS");
  push(/\b(peza|create incentives|firb|scit|tax holiday|transfer pricing)\b/i.test(q), "SPC");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(q), "CONTRACT");
  push(/\b(principal vs agent|principal|agent|pass-through|pass through|reimbursement|bundled|gross or net|economic substance|substance over form)\b/i.test(q), "TRANSACTION");
  push(/\b(audit|afs|working paper|pfrs|pas|misstatement|financial statements)\b/i.test(q), "AUDIT");
  push(/\b(g\.?\s*r\.?\s*no\.?|cta|supreme court|court of appeals|jurisprudence|case)\b/i.test(q), "CASE_LAW");
  push(/\b(rr|rmc|rmo|ramo|revenue regulation|revenue memorandum circular|revenue memorandum order)\s*(?:no\.?)?\s*\d+/i.test(q), "ISSUANCE");

  return unique(issues);
}

function buildTaxDomainSearchHints(issueClassification = {}, query = "") {
  const keys = unique([
    normalizeIssue(issueClassification.primaryIssue),
    normalizeIssue(issueClassification.domainCode),
    normalizeIssue(issueClassification.primaryDomain),
    normalizeIssue(issueClassification.subIssue),
    ...safeArray(issueClassification.subIssues).map(normalizeIssue),
    ...safeArray(issueClassification.taxDomains).map(normalizeIssue),
    ...detectIssueType(query).map(normalizeIssue)
  ]).filter(Boolean);

  const keywords = [];
  const authorities = [];

  for (const key of keys) {
    const hint = TAX_DOMAIN_SEARCH_HINTS[key];
    if (!hint) continue;

    keywords.push(...safeArray(hint.keywords));
    authorities.push(...safeArray(hint.authorities));
  }

  if (isVatDefinitionClassification(issueClassification, query)) {
    keywords.push(
      "VAT",
      "value-added tax",
      "sale of goods",
      "sale of services",
      "course of trade or business",
      "output tax",
      "input tax"
    );

    authorities.push(
      "NIRC Sec. 105",
      "NIRC Sec. 106",
      "NIRC Sec. 108",
      "RR 16-2005"
    );
  }

  return {
    domainKeys: keys,
    fallbackKeywords: unique(keywords),
    authorityHints: unique(authorities)
  };
}

function buildRetrievalQuerySet(query = "", classification = {}) {
  const targetAuthorities = unique([
    ...extractAuthoritySearchTerms(classification.targetAuthorities),
    ...extractAuthoritySearchTerms(classification.controllingAuthorities),
    ...extractAuthoritySearchTerms(classification.supportingAuthorities),
    ...safeArray(classification.authoritySearchTerms),
    ...safeArray(classification.targetAuthorityHints)
  ]);

  const domainHints = buildTaxDomainSearchHints(classification, query);

  const normalizedAuthorityCitations = unique([
    ...targetAuthorities,
    ...domainHints.authorityHints
  ])
    .map(normalizeAuthorityCitation)
    .filter((item) => item.normalized);

  const normalizedAuthorityKeys = unique(
    normalizedAuthorityCitations.map((item) => item.key)
  );

  const authorityVariants = unique(
    normalizedAuthorityCitations.flatMap((item) =>
      generateAuthorityVariants(item.normalized || item.raw)
    )
  );

  let issueQueries = [];

  try {
    issueQueries = buildIssueClassificationSearchQueries(classification, 8) || [];
  } catch {
    issueQueries = [];
  }

  const titlePathMetadataQueries = unique([
    ...targetAuthorities,
    ...authorityVariants,
    ...domainHints.authorityHints,
    classification.domainName,
    classification.primaryIssue,
    classification.subIssue,
    ...safeArray(classification.subIssues),
    ...safeArray(classification.keyTerms)
  ]).filter(Boolean);

  const contentKeywordQueries = unique([
    query,
    ...safeArray(classification.keyTerms),
    ...domainHints.fallbackKeywords,
    ...safeArray(classification.legalDimensions),
    ...safeArray(classification.taxDomains)
  ]).filter(Boolean);

  const semanticQueries = unique([
    query,
    classification.legalQuestionPresented,
    ...issueQueries,
    `${classification.primaryIssue || ""} ${classification.subIssue || ""}`.trim()
  ]).filter(Boolean);

  const broadFallbackQueries = unique([
    ...domainHints.fallbackKeywords,
    ...domainHints.authorityHints,
    classification.domainName,
    classification.primaryIssue,
    classification.subIssue
  ]).filter(Boolean);

  return {
    targetAuthoritiesReceived: unique([
      ...safeArray(classification.targetAuthorities),
      ...safeArray(classification.controllingAuthorities),
      ...safeArray(classification.supportingAuthorities)
    ]),
    normalizedAuthorityCitations,
    normalizedAuthorityKeys,
    generatedAuthorityVariants: authorityVariants,
    domainHints,
    layers: [
      {
        layer: RETRIEVAL_LAYER.EXACT_NORMALIZED_AUTHORITY,
        queries: unique(normalizedAuthorityCitations.map((item) => item.normalized))
      },
      {
        layer: RETRIEVAL_LAYER.CITATION_VARIANT,
        queries: authorityVariants
      },
      {
        layer: RETRIEVAL_LAYER.TITLE_PATH_METADATA,
        queries: titlePathMetadataQueries
      },
      {
        layer: RETRIEVAL_LAYER.CONTENT_KEYWORD,
        queries: contentKeywordQueries
      },
      {
        layer: RETRIEVAL_LAYER.VECTOR_SEMANTIC,
        queries: semanticQueries
      },
      {
        layer: RETRIEVAL_LAYER.BROAD_TAX_DOMAIN_FALLBACK,
        queries: broadFallbackQueries
      }
    ],
    allQueries: unique([
      ...normalizedAuthorityCitations.map((item) => item.normalized),
      ...authorityVariants,
      ...titlePathMetadataQueries,
      ...contentKeywordQueries,
      ...semanticQueries,
      ...broadFallbackQueries
    ]).slice(0, 80)
  };
}

function docText(doc = {}) {
  return normalizeText(
    [
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview,
      doc.source,
      doc.title,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.folder,
      doc.folderName,
      doc.folder_name,
      doc.metadata?.path,
      doc.metadata?.folder,
      doc.metadata?.folderName,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      doc.metadata?.authorityType,
      doc.authorityType,
      doc.authority_type,
      ...(Array.isArray(doc.normalizedAliases) ? doc.normalizedAliases : []),
      ...(Array.isArray(doc.normalized_aliases) ? doc.normalized_aliases : []),
      ...(Array.isArray(doc.metadata?.normalizedAliases) ? doc.metadata.normalizedAliases : [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function titlePathMetadataText(doc = {}) {
  return normalizeText(
    [
      doc.title,
      doc.documentTitle,
      doc.document_title,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.folder,
      doc.folderName,
      doc.folder_name,
      doc.metadata?.path,
      doc.metadata?.folder,
      doc.metadata?.folderName,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      doc.metadata?.authorityType,
      doc.authorityType,
      doc.authority_type
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function extractBestTitle(doc = {}) {
  return trimString(
    doc.title ||
      doc.documentTitle ||
      doc.document_title ||
      doc.metadata?.documentTitle ||
      doc.metadata?.document_title ||
      doc.metadata?.originalFileName ||
      doc.metadata?.original_file_name ||
      doc.originalSource ||
      doc.original_source ||
      doc.source ||
      doc.fileName ||
      doc.filename ||
      "Untitled Source",
    MAX_SOURCE_TITLE_CHARS
  );
}

function extractBestCitation(doc = {}) {
  return trimString(
    doc.citation ||
      doc.citationText ||
      doc.citation_text ||
      doc.reference ||
      doc.referenceText ||
      doc.reference_text ||
      doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.normalizedReference ||
      doc.metadata?.normalized_reference ||
      doc.metadata?.citation ||
      doc.metadata?.reference ||
      doc.grNumber ||
      doc.gr_number ||
      doc.caseNumber ||
      doc.case_number ||
      "",
    MAX_SOURCE_CITATION_CHARS
  );
}

function extractBestUrl(doc = {}) {
  return trimString(
    doc.url ||
      doc.link ||
      doc.href ||
      doc.sourceUrl ||
      doc.source_url ||
      doc.driveViewUrl ||
      doc.drive_view_url ||
      doc.metadata?.url ||
      doc.metadata?.sourceUrl ||
      doc.metadata?.source_url ||
      doc.metadata?.driveViewUrl ||
      "",
    MAX_SOURCE_URL_CHARS
  );
}

function extractBestContent(doc = {}) {
  return trimString(
    doc.text ||
      doc.content ||
      doc.excerpt ||
      doc.preview ||
      doc.chunkText ||
      doc.chunk_text ||
      doc.pageContent ||
      doc.page_content ||
      "",
    MAX_SOURCE_TEXT_CHARS
  );
}

function detectDocIssueType(doc = {}) {
  return detectIssueType(docText(doc));
}

function isSupersededDoc(doc = {}) {
  return Boolean(
    doc.superseded === true ||
      doc.isSuperseded === true ||
      doc.is_superseded === true ||
      doc.metadata?.superseded === true ||
      doc.metadata?.isSuperseded === true ||
      doc.metadata?.is_superseded === true
  );
}

function getGoogleDriveFolderAuthority(doc = {}) {
  const haystack = lower(docText(doc));

  for (const [folder, authorityType] of Object.entries(GOOGLE_DRIVE_FOLDER_AUTHORITY)) {
    if (haystack.includes(folder)) return authorityType;
  }

  return null;
}

function isHiddenReviewerOnlySource(doc = {}) {
  const haystack = lower(docText(doc));
  return HIDDEN_REVIEWER_PATTERNS.some((pattern) => haystack.includes(pattern));
}

function isGoogleDriveIndexedSource(doc = {}) {
  const haystack = lower(docText(doc));

  return (
    haystack.includes("01_tax_code") ||
    haystack.includes("02_revenue_regulations") ||
    haystack.includes("03_rmc") ||
    haystack.includes("04_rmo") ||
    haystack.includes("05_bir_rulings") ||
    haystack.includes("06_court_cases") ||
    haystack.includes("google drive") ||
    haystack.includes("drive.google") ||
    Boolean(doc.driveViewUrl || doc.drive_view_url || doc.metadata?.driveViewUrl)
  );
}

function getNormalizedDocAuthorityType(doc = {}) {
  const folderAuthority = getGoogleDriveFolderAuthority(doc);

  const explicitAuthority = normalizeAuthority(
    doc.authorityType ||
      doc.authority_type ||
      doc.metadata?.authorityType ||
      doc.metadata?.authority_type ||
      doc.metadata?.sourceType ||
      doc.metadata?.source_type ||
      ""
  );

  return explicitAuthority || folderAuthority || getAuthorityTypeForDoc(doc) || "UNKNOWN";
}

function safeAuthorityLevel(doc = {}) {
  const type = getNormalizedDocAuthorityType(doc);
  const directLevel = Number(getAuthorityLevelForDoc(doc));

  if (Number.isFinite(directLevel) && directLevel > 0) return directLevel;
  return AUTHORITY_LEVEL[type] || 99;
}

function safeControllingPrecedence(doc = {}) {
  const direct = Number(getControllingPrecedenceForDoc(doc));

  if (Number.isFinite(direct) && direct > 0) return direct;
  return AUTHORITY_LEVEL[getNormalizedDocAuthorityType(doc)] || 99;
}

function authorityWeight(doc = {}) {
  const type = getNormalizedDocAuthorityType(doc);
  return AUTHORITY_WEIGHT[type] ?? AUTHORITY_WEIGHT.UNKNOWN;
}

function extractExactReferenceSignals(text = "") {
  const value = normalizeText(text);
  const signals = [];

  for (const match of value.matchAll(/\b(?:ra|r\.a\.|republic act)\s*(?:no\.?)?\s*(\d{4,6})\b/gi)) {
    signals.push(`RA_${match[1]}`);
  }

  for (const match of value.matchAll(/\b(?:nirc|tax code)?\s*(?:sec\.?|section)\s*(\d{1,4}[a-z]?(?:\([a-z0-9]+\))*)\b/gi)) {
    signals.push(`NIRC_SEC_${String(match[1]).toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`);
  }

  const issuancePatterns = [
    ["RR", /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/gi],
    ["RMC", /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/gi],
    ["RMO", /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/gi],
    ["RAMO", /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/gi]
  ];

  for (const [prefix, regex] of issuancePatterns) {
    for (const match of value.matchAll(regex)) {
      signals.push(`${prefix}_${String(Number(match[1]))}_${normalizeYear(match[2])}`);
    }
  }

  for (const match of value.matchAll(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/gi)) {
    signals.push(`GR_${String(match[1]).toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`);
  }

  return unique(signals);
}

function haystackIncludesVariant(doc = {}, variant = "", searchArea = "ALL") {
  const haystack =
    searchArea === "TITLE_PATH_METADATA"
      ? titlePathMetadataText(doc)
      : docText(doc);

  return lower(haystack).includes(lower(variant));
}

function findMatchedAuthority({ doc = {}, classification = {}, querySet = {}, layer = null }) {
  const candidates = unique([
    ...safeArray(classification.targetAuthorities),
    ...safeArray(classification.controllingAuthorities),
    ...safeArray(classification.supportingAuthorities),
    ...safeArray(classification.supportingJurisprudence),
    ...safeArray(classification.authoritySearchTerms),
    ...safeArray(querySet?.domainHints?.authorityHints)
  ]);

  const searchArea =
    layer === RETRIEVAL_LAYER.TITLE_PATH_METADATA
      ? "TITLE_PATH_METADATA"
      : "ALL";

  for (const authority of candidates) {
    const variants = generateAuthorityVariants(authority);

    for (const variant of variants) {
      if (haystackIncludesVariant(doc, variant, searchArea)) {
        return {
          matchedAuthority: authority,
          matchedAuthorityVariant: variant
        };
      }
    }
  }

  for (const variant of safeArray(querySet.generatedAuthorityVariants)) {
    if (haystackIncludesVariant(doc, variant, searchArea)) {
      return {
        matchedAuthority: normalizeAuthorityCitation(variant).normalized || variant,
        matchedAuthorityVariant: variant
      };
    }
  }

  return {
    matchedAuthority: null,
    matchedAuthorityVariant: null
  };
}

function exactReferenceBonus(query = "", doc = {}, classification = null, querySet = {}) {
  const queryRefs = unique([
    ...extractExactReferenceSignals(query),
    ...safeArray(classification?.authoritySearchTerms).flatMap(extractExactReferenceSignals),
    ...safeArray(classification?.targetAuthorities).flatMap(extractExactReferenceSignals),
    ...safeArray(querySet?.generatedAuthorityVariants).flatMap(extractExactReferenceSignals)
  ]);

  const haystackRaw = docText(doc);
  const normalizedHaystack = lower(haystackRaw).replace(/[^a-z0-9]+/g, "_");

  let bonus = 0;

  for (const ref of queryRefs) {
    const normalizedRef = lower(ref).replace(/[^a-z0-9]+/g, "_");
    if (normalizedRef && normalizedHaystack.includes(normalizedRef)) bonus += 120;
  }

  const terms = unique([
    ...safeArray(classification?.authoritySearchTerms),
    ...safeArray(classification?.targetAuthorities),
    ...safeArray(querySet?.generatedAuthorityVariants)
  ]);

  for (const term of terms) {
    const variants = generateAuthorityVariants(term);

    for (const variant of variants) {
      if (variant && lower(haystackRaw).includes(lower(variant))) bonus += 95;
    }
  }

  return bonus;
}

function docTargetAuthorityMatch(classification = {}, doc = {}, querySet = {}) {
  const targets = normalizeTargetAuthorities(classification.targetAuthorities);

  if (!targets.length && !safeArray(querySet.generatedAuthorityVariants).length) return false;

  const docType = getNormalizedDocAuthorityType(doc);
  if (targets.includes(docType)) return true;

  return safeArray(querySet.generatedAuthorityVariants).some((variant) =>
    haystackIncludesVariant(doc, variant)
  );
}

function hasIssueMismatch(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return false;

  if (
    (queryIssues.includes("VAT") || queryIssues.includes("VAT_DEFINITION")) &&
    docIssues.includes("TAX_REFUND_CREDIT") &&
    !queryIssues.includes("TAX_REFUND_CREDIT")
  ) {
    return true;
  }

  if (
    queryIssues.includes("TAX_REFUND_CREDIT") &&
    (docIssues.includes("VAT") || docIssues.includes("VAT_DEFINITION")) &&
    !queryIssues.includes("VAT") &&
    !queryIssues.includes("VAT_DEFINITION")
  ) {
    return true;
  }

  return false;
}

function hasIssueOverlap(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return true;
  return queryIssues.some((issue) => docIssues.includes(issue));
}

function issueClassificationCompatible(classification = {}, doc = {}) {
  try {
    const result = isIssueClassificationCompatibleWithDoc(classification, doc);
    return result !== false;
  } catch {
    const docIssues = detectDocIssueType(doc).map(normalizeIssue).filter(Boolean);
    const queryIssues = safeArray(classification.subIssues).map(normalizeIssue).filter(Boolean);

    if (!queryIssues.length || !docIssues.length) return true;
    if (hasIssueMismatch(queryIssues, docIssues)) return false;

    return hasIssueOverlap(queryIssues, docIssues);
  }
}

function inferMatchedByFromLayer(layer = null) {
  const map = {
    [RETRIEVAL_LAYER.EXACT_NORMALIZED_AUTHORITY]: "exact_normalized_authority",
    [RETRIEVAL_LAYER.CITATION_VARIANT]: "citation_variant",
    [RETRIEVAL_LAYER.TITLE_PATH_METADATA]: "title_path_metadata",
    [RETRIEVAL_LAYER.CONTENT_KEYWORD]: "content_keyword",
    [RETRIEVAL_LAYER.VECTOR_SEMANTIC]: "vector_semantic",
    [RETRIEVAL_LAYER.BROAD_TAX_DOMAIN_FALLBACK]: "broad_tax_domain_fallback",
    [RETRIEVAL_LAYER.PROVIDED_DOCUMENTS]: "provided_documents",
    [RETRIEVAL_LAYER.SUPABASE_FALLBACK]: "supabase_fallback"
  };

  return map[layer] || "unknown";
}

function buildIssueClassificationMatch(query = "", classification = {}, doc = {}, querySet = {}, layer = null) {
  const docIssues = detectDocIssueType(doc).map(normalizeIssue).filter(Boolean);

  const queryIssues = unique([
    normalizeIssue(classification.primaryIssue),
    normalizeIssue(classification.primaryDomain),
    normalizeIssue(classification.domainCode),
    normalizeIssue(classification.subIssue),
    ...safeArray(classification.subIssues).map(normalizeIssue),
    ...safeArray(classification.taxDomainClassification?.subIssues).map(normalizeIssue),
    ...safeArray(classification.taxDomains).map(normalizeIssue)
  ]).filter(Boolean);

  const issueMismatch = hasIssueMismatch(queryIssues, docIssues);
  const issueOverlap = hasIssueOverlap(queryIssues, docIssues);
  const compatible = issueClassificationCompatible(classification, doc);
  const targetAuthorityMatch = docTargetAuthorityMatch(classification, doc, querySet);
  const exactAuthorityMatch = exactReferenceBonus(query, doc, classification, querySet) > 0;
  const authority = findMatchedAuthority({ doc, classification, querySet, layer });

  const confidenceBase =
    exactAuthorityMatch
      ? 0.94
      : targetAuthorityMatch
        ? 0.86
        : issueOverlap
          ? 0.68
          : compatible
            ? 0.52
            : 0.25;

  return {
    primaryIssue: classification.primaryIssue || null,
    subIssue: classification.subIssue || null,
    targetAuthorityMatch,
    matchedAuthority: authority.matchedAuthority,
    matchedAuthorityVariant: authority.matchedAuthorityVariant,
    matchedBy: inferMatchedByFromLayer(layer),
    confidence: Number(confidenceBase.toFixed(2)),
    issueMismatch,
    authorityLevel: safeAuthorityLevel(doc),
    retrievalLayer: layer || null,
    matched:
      compatible &&
      !issueMismatch &&
      (issueOverlap || targetAuthorityMatch || exactAuthorityMatch || !docIssues.length),
    compatible,
    issueOverlap,
    exactAuthorityMatch,
    subIssues: classification.subIssues || [],
    legalDimensions: classification.legalDimensions || [],
    retrievalStrategy: classification.retrievalStrategy || null,
    targetAuthorities: classification.targetAuthorities || [],
    authoritySearchTerms: classification.authoritySearchTerms || [],
    docIssues,
    docAuthorityType: getNormalizedDocAuthorityType(doc)
  };
}

function issueClassificationBonus(query = "", classification = {}, doc = {}, querySet = {}, layer = null) {
  if (!classification?.primaryIssue) return 0;

  const match = buildIssueClassificationMatch(query, classification, doc, querySet, layer);

  let bonus = 0;

  if (match.issueMismatch) bonus -= 90;
  if (match.compatible === false) bonus -= 60;
  if (match.issueOverlap) bonus += 60;
  if (match.targetAuthorityMatch) bonus += 95;
  if (match.exactAuthorityMatch) bonus += 125;

  const haystack = lower(docText(doc));

  if (classification.primaryDomain) {
    const domainTerm = lower(String(classification.primaryDomain).replace(/_/g, " "));
    if (domainTerm && haystack.includes(domainTerm)) bonus += 15;
  }

  if (classification.primaryIssue) {
    const issueTerm = lower(String(classification.primaryIssue).replace(/_/g, " "));
    if (issueTerm && haystack.includes(issueTerm)) bonus += 15;
  }

  if (classification.subIssue) {
    const subIssueTerm = lower(String(classification.subIssue).replace(/_/g, " "));
    if (subIssueTerm && haystack.includes(subIssueTerm)) bonus += 15;
  }

  for (const issue of safeArray(classification.subIssues)) {
    const term = lower(String(issue).replace(/_/g, " "));
    if (term.length >= 3 && haystack.includes(term)) bonus += 10;
  }

  for (const term of safeArray(classification.keyTerms)) {
    const normalized = lower(String(term).replace(/_/g, " "));
    if (normalized && haystack.includes(normalized)) bonus += 8;
  }

  if (isGoogleDriveIndexedSource(doc)) bonus += 20;

  return bonus;
}

function issueWeight(query = "", doc = {}, classification = null) {
  const queryIssues = classification?.subIssues?.length
    ? classification.subIssues.map(normalizeIssue).filter(Boolean)
    : detectIssueType(query).map(normalizeIssue).filter(Boolean);

  const docIssues = detectDocIssueType(doc).map(normalizeIssue).filter(Boolean);

  if (hasIssueMismatch(queryIssues, docIssues)) return -60;
  if (hasIssueOverlap(queryIssues, docIssues)) return 35;

  return 0;
}

function reviewerSourcePenalty(doc = {}, allowReviewMaterials = false) {
  if (allowReviewMaterials) return 0;
  return isHiddenReviewerOnlySource(doc) ? -100 : 0;
}

function adaptiveModeBonus({ mode = "STANDARD", doc = {}, classification = null }) {
  const normalizedMode = normalizeMode(mode);
  const authority = getNormalizedDocAuthorityType(doc);
  const text = lower(docText(doc));
  let bonus = 0;

  if (normalizedMode === "LITIGATION" && ["SUPREME_COURT", "SUPREME_COURT_EN_BANC", "CTA_EN_BANC"].includes(authority)) bonus += 55;
  if (normalizedMode === "TECHNICAL" && ["SUPREME_COURT", "SUPREME_COURT_EN_BANC", "CTA_EN_BANC"].includes(authority)) bonus += 42;

  if (normalizedMode === "AUDIT") {
    if (/\bpfrs\b|\bpas\b|\bfinancial statements\b|\bafs\b|\baudit\b/i.test(text)) bonus += 45;
    if (["STATUTE", "RR", "RMC", "SUPREME_COURT", "CTA_EN_BANC"].includes(authority)) bonus += 25;
  }

  if (normalizedMode === "TRANSACTION") {
    if (/\bprincipal\b|\bagent\b|\breimbursement\b|\bpass-through\b|\bgross\b|\bnet\b|\beconomic substance\b|\bbundled\b/i.test(text)) bonus += 50;
    if (["STATUTE", "RR", "SUPREME_COURT", "CTA_EN_BANC"].includes(authority)) bonus += 28;
  }

  if (classification?.retrievalStrategy) {
    const strategy = lower(classification.retrievalStrategy);

    if (strategy.includes("definition") || strategy.includes("fast_definition") || strategy.includes("foundational")) {
      if (["STATUTE", "NIRC", "TAX_CODE", "RR"].includes(authority)) bonus += 50;
      if (["SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "SECONDARY"].includes(authority)) bonus -= 15;
    }

    if (strategy.includes("procedural")) {
      if (["STATUTE", "RR", "RMC", "RMO", "SUPREME_COURT", "SUPREME_COURT_EN_BANC", "CTA_EN_BANC"].includes(authority)) bonus += 24;
    }

    if (strategy.includes("jurisprudential")) {
      if (["SUPREME_COURT", "SUPREME_COURT_EN_BANC", "CTA_EN_BANC", "CTA_DIVISION", "COURT_OF_APPEALS"].includes(authority)) bonus += 35;
    }
  }

  return bonus;
}

function layerBonus(layer = null) {
  const map = {
    [RETRIEVAL_LAYER.EXACT_NORMALIZED_AUTHORITY]: 95,
    [RETRIEVAL_LAYER.CITATION_VARIANT]: 80,
    [RETRIEVAL_LAYER.TITLE_PATH_METADATA]: 55,
    [RETRIEVAL_LAYER.CONTENT_KEYWORD]: 35,
    [RETRIEVAL_LAYER.VECTOR_SEMANTIC]: 20,
    [RETRIEVAL_LAYER.BROAD_TAX_DOMAIN_FALLBACK]: 8,
    [RETRIEVAL_LAYER.PROVIDED_DOCUMENTS]: 12,
    [RETRIEVAL_LAYER.SUPABASE_FALLBACK]: 18
  };

  return map[layer] || 0;
}

function computeRetrievalScore({
  query = "",
  doc = {},
  adaptiveMode = "STANDARD",
  issueClassification = null,
  allowReviewMaterials = false,
  querySet = {},
  layer = null
}) {
  const baseScore = Number(
    doc.rerankScore ??
      doc.retrievalScore ??
      doc.retrieval_score ??
      doc.finalScore ??
      doc.final_score ??
      doc.combined_score ??
      doc.score ??
      doc.similarity ??
      0
  );

  const hierarchyScore = authorityWeight(doc);
  const issueScore = issueWeight(query, doc, issueClassification);
  const classificationScore = issueClassificationBonus(query, issueClassification, doc, querySet, layer);
  const weakPenalty = reviewerSourcePenalty(doc, allowReviewMaterials);
  const citationBonus = exactReferenceBonus(query, doc, issueClassification, querySet);
  const level = safeAuthorityLevel(doc);
  const precedence = safeControllingPrecedence(doc);
  const levelBonus = level <= 3 ? 38 : level <= 7 ? 24 : level <= 12 ? 10 : 0;
  const precedenceBonus = precedence <= 7 ? 24 : precedence <= 12 ? 12 : 0;
  const driveBonus = isGoogleDriveIndexedSource(doc) ? 18 : 0;
  const modeBonus = adaptiveModeBonus({ mode: adaptiveMode, doc, classification: issueClassification });
  const supersessionPenalty = isSupersededDoc(doc) ? -150 : 0;

  return Number(
    (
      baseScore * 0.2 +
      hierarchyScore * 0.35 +
      citationBonus * 0.22 +
      classificationScore +
      issueScore +
      levelBonus +
      precedenceBonus +
      modeBonus +
      driveBonus +
      layerBonus(layer) +
      weakPenalty +
      supersessionPenalty
    ).toFixed(4)
  );
}

function sanitizeRetrievedSource(doc = {}) {
  const authorityType = getNormalizedDocAuthorityType(doc);
  const authorityLevel = safeAuthorityLevel(doc);
  const controllingPrecedence = safeControllingPrecedence(doc);
  const content = extractBestContent(doc);

  return {
    id:
      doc.id ||
      doc.fileId ||
      doc.file_id ||
      doc.metadata?.fileId ||
      doc.metadata?.file_id ||
      null,

    title: extractBestTitle(doc),
    authorityType,
    authorityLevel,
    controllingPrecedence,
    citation: extractBestCitation(doc),
    url: extractBestUrl(doc),
    text: content,
    content,

    // Preserve raw DB column names at top level so downstream consumers
    // (reranker, renderer, compliance) can reference them without camelCase mapping.
    source:               doc.source               || doc.original_source  || doc.originalSource || null,
    document_title:       doc.document_title        || doc.documentTitle    || null,
    authority_type:       doc.authority_type         || doc.authorityType   || null,
    normalized_reference: doc.normalized_reference   || doc.normalizedReference || null,
    chunk_index:          doc.chunk_index             ?? doc.chunkIndex         ?? null,

    score: Number(
      doc.finalScore ||
        doc.final_score ||
        doc.retrievalScore ||
        doc.retrieval_score ||
        doc.rerankScore ||
        doc.rerank_score ||
        doc.score ||
        doc.similarity ||
        0
    ),

    issueClassificationMatch: doc.issueClassificationMatch || null,

    targetAuthorityMatch:
      doc.targetAuthorityMatch === true ||
      doc.issueClassificationMatch?.targetAuthorityMatch === true,

    exactAuthorityMatch:
      doc.exactAuthorityMatch === true ||
      doc.issueClassificationMatch?.exactAuthorityMatch === true,

    retrievalLayer:
      doc.retrievalLayer ||
      doc.issueClassificationMatch?.retrievalLayer ||
      null,

    retrievalPhase:
      doc.retrievalPhase ||
      doc.retrievalLayer ||
      null,

    retrievalIssueType: safeArray(doc.retrievalIssueType || doc.retrieval_issue_type),
    superseded: isSupersededDoc(doc),

    metadata: {
      ...(doc.metadata || {}),
      sourceType: authorityType,
      authorityLevel,
      controllingPrecedence,
      retrievalEngineVersion: ENGINE_VERSION,
      issueMismatch:
        doc.issueMismatch === true ||
        doc.issueClassificationMatch?.issueMismatch === true,
      exactCitationMatched:
        doc.exactAuthorityMatch === true ||
        Number(doc.citationMatchBonus || 0) > 0,
      retrievalPhase: doc.retrievalPhase || doc.retrievalLayer || null,
      retrievalLayer: doc.retrievalLayer || null,
      googleDriveIndexed: isGoogleDriveIndexedSource(doc),
      googleDriveFolderAuthority: getGoogleDriveFolderAuthority(doc),
      rawFullDocumentInjectionPrevented: true
    }
  };
}

function isVatDefinitionClassification(classification = {}, query = "") {
  const issues = unique([
    normalizeIssue(classification.primaryIssue),
    normalizeIssue(classification.domainCode),
    normalizeIssue(classification.subIssue),
    ...safeArray(classification.subIssues).map(normalizeIssue),
    ...detectIssueType(query).map(normalizeIssue)
  ]).filter(Boolean);

  const strategy = lower(classification.retrievalStrategy || "");
  const q = lower(query);

  return (
    issues.includes("VAT_DEFINITION") ||
    (issues.includes("VAT") &&
      /\b(define|definition|what is)\b.*\b(vat|value-added tax|value added tax)\b/i.test(q)) ||
    strategy.includes("vat_definition") ||
    strategy.includes("fast_definition")
  );
}

function normalizeExternalIssueClassification({
  query = "",
  issueClassification = null,
  primaryDomain = null,
  primaryIssue = null,
  subIssue = null,
  subIssues = [],
  legalDimensions = [],
  retrievalStrategy = null,
  targetAuthorities = null,
  queryIntent = null
} = {}) {
  const detected = detectIssueType(query);
  let engineClassification = null;

  if (!issueClassification?.primaryIssue) {
    try {
      engineClassification = classifyTaxIssue(query, queryIntent || {});
    } catch (error) {
      engineClassification = {
        classificationError: error?.message || "Issue classification failed."
      };
    }
  }

  const source = issueClassification?.primaryIssue ? issueClassification : engineClassification || {};

  const normalizedPrimaryDomain =
    primaryDomain ||
    source.primaryDomain ||
    source.primary_domain ||
    source.domainCode ||
    safeArray(source.taxDomains)[0] ||
    null;

  const normalizedPrimaryIssue =
    normalizeIssue(primaryIssue) ||
    normalizeIssue(source.primaryIssue) ||
    normalizeIssue(source.primary_issue) ||
    normalizeIssue(source.domainCode) ||
    normalizeIssue(source.issueType) ||
    normalizeIssue(source.issue_type) ||
    normalizeIssue(queryIntent?.primaryIssue) ||
    detected.map(normalizeIssue).filter(Boolean)[0] ||
    "GENERAL_TAX";

  const normalizedSubIssues = unique([
    normalizedPrimaryIssue,
    normalizeIssue(subIssue),
    normalizeIssue(source.subIssue),
    normalizeIssue(source.sub_issue),
    ...safeArray(subIssues).map(normalizeIssue),
    ...safeArray(source.subIssues).map(normalizeIssue),
    ...safeArray(source.sub_issues).map(normalizeIssue),
    ...safeArray(queryIntent?.subIssues).map(normalizeIssue),
    ...detected.map(normalizeIssue)
  ]).filter(Boolean);

  const rawTargetAuthorities =
    targetAuthorities ||
    source.targetAuthorities ||
    source.target_authorities ||
    queryIntent?.targetAuthorities ||
    [];

  const authoritySearchTerms = unique([
    ...extractAuthoritySearchTerms(rawTargetAuthorities),
    ...extractAuthoritySearchTerms(source.controllingAuthorities),
    ...extractAuthoritySearchTerms(source.supportingAuthorities),
    ...safeArray(source.authoritySearchTerms),
    ...safeArray(source.authority_search_terms),
    ...safeArray(source.targetAuthorityHints),
    ...safeArray(source.target_authority_hints),
    ...safeArray(queryIntent?.targetAuthorityHints)
  ]).map(normalizeText).filter(Boolean);

  const provisional = {
    ...source,
    primaryDomain: normalizedPrimaryDomain,
    primaryIssue: normalizedPrimaryIssue,
    domainCode: source.domainCode || normalizedPrimaryDomain || normalizedPrimaryIssue,
    subIssue:
      source.subIssue ||
      source.sub_issue ||
      normalizedSubIssues[0] ||
      normalizedPrimaryIssue,
    subIssues: normalizedSubIssues,
    legalDimensions: unique([
      ...safeArray(legalDimensions),
      ...safeArray(source.legalDimensions),
      ...safeArray(source.legalDimension),
      ...safeArray(queryIntent?.legalDimensions)
    ].map((item) => String(item || "").toUpperCase())).filter(Boolean),
    retrievalStrategy:
      retrievalStrategy ||
      source.retrievalStrategy ||
      source.retrieval_strategy ||
      queryIntent?.retrievalStrategy ||
      "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",
    targetAuthorities: unique([
      ...safeArray(rawTargetAuthorities),
      ...safeArray(source.controllingAuthorities),
      ...safeArray(source.supportingAuthorities),
      ...authoritySearchTerms
    ]),
    targetAuthorityTypes: unique([
      ...normalizeTargetAuthorities(rawTargetAuthorities),
      ...normalizeTargetAuthorities(source.controllingAuthorities),
      ...normalizeTargetAuthorities(source.supportingAuthorities),
      ...normalizeTargetAuthorities(queryIntent?.targetAuthorities)
    ]),
    authoritySearchTerms,
    keyTerms: unique([
      ...safeArray(source.keyTerms),
      ...safeArray(source.key_terms),
      normalizedPrimaryDomain,
      normalizedPrimaryIssue,
      ...normalizedSubIssues
    ]),
    taxDomains: unique([
      ...safeArray(source.taxDomains),
      ...safeArray(source.tax_domains),
      normalizedPrimaryDomain,
      source.domainCode,
      normalizedPrimaryIssue
    ]),
    legalQuestionPresented:
      source.legalQuestionPresented ||
      source.legal_question_presented ||
      query,
    factSensitivity:
      source.factSensitivity ||
      source.fact_sensitivity ||
      "moderate",
    exactAuthority:
      source.exactAuthority || {
        detected: false,
        type: null,
        reference: null
      },
    retrievalControls: {
      issueFirst: true,
      suppressIssueMismatchedCases: false,
      suppressVatRefundCasesUnlessRefundIssue: normalizedPrimaryIssue !== "TAX_REFUND_CREDIT",
      requirePrimaryAuthorityForDefinitions:
        normalizedPrimaryIssue === "VAT_DEFINITION" ||
        normalizedPrimaryIssue === "VAT",
      useIssueClassificationMatch: true,
      useTargetAuthorityMatch: true,
      useControllingPrecedence: true,
      ...(source.retrievalControls || {})
    }
  };

  if (isVatDefinitionClassification(provisional, query)) {
    const VAT_DEF_EXCLUDED_PATTERNS = [
      "aichi", "san roque", "toshiba", "seagate", "mirant",
      "unutilized input", "excess input", "120+30", "120 day", "30 day",
      "claim for refund", "sec. 112", "section 112", "refund"
    ];
    const isExcludedForVatDef = (term) => {
      const t = lower(term);
      return VAT_DEF_EXCLUDED_PATTERNS.some((excluded) => t.includes(excluded));
    };

    provisional.primaryIssue = "VAT_DEFINITION";
    provisional.domainCode = "VAT";
    provisional.subIssue = "VAT_DEFINITION";
    provisional.subIssues = unique(["VAT_DEFINITION", "VAT", ...provisional.subIssues]);
    provisional.retrievalStrategy = "FAST_DEFINITION_PRIMARY_AUTHORITY";
    provisional.authoritySearchTerms = unique([
      "NIRC Sec. 105",
      "NIRC Sec. 106",
      "NIRC Sec. 108",
      "RR 16-2005",
      ...provisional.authoritySearchTerms
    ]).filter((term) => !isExcludedForVatDef(term));
    provisional.targetAuthorities = unique([
      "NIRC Sec. 105",
      "NIRC Sec. 106",
      "NIRC Sec. 108",
      "RR 16-2005",
      ...provisional.targetAuthorities
    ]).filter((term) => !isExcludedForVatDef(term));
    provisional.retrievalControls = {
      ...(provisional.retrievalControls || {}),
      suppressVatRefundCasesUnlessRefundIssue: true,
      suppressVatRefundJurisprudenceForDefinition: true,
      requirePrimaryAuthorityForDefinitions: true,
      useIssueClassificationMatch: true,
      useTargetAuthorityMatch: true,
      useControllingPrecedence: true
    };
  }

  return provisional;
}

function safeIssueClassification(query = "", existingClassification = null, extras = {}) {
  return normalizeExternalIssueClassification({
    query,
    issueClassification: existingClassification,
    ...extras
  });
}

function sourceDedupeKey(doc = {}) {
  // Prioritize the Supabase row-level PK — unique per chunk, prevents collapsing all
  // chunks of a multi-section document (e.g. NIRC Sec. 105, 106, 107, 108 from the
  // same PDF) into a single deduplicated entry.
  // The old waterfall started with fileId/file_id (Google Drive document-level ID),
  // which is identical for every chunk from the same PDF — causing 83/95 duplicates
  // to be dropped and only 1 source reaching the reranker.
  if (doc.id != null) return String(doc.id);

  // Chunk-aware composite: document identity + provision reference + chunk position.
  // Distinguishes NIRC Sec. 105 from Sec. 106 even when both share the same file_id.
  const docId    = doc.fileId    || doc.file_id    ||
                   doc.metadata?.fileId || doc.metadata?.file_id || null;
  const chunkRef = doc.normalized_reference || doc.normalizedReference ||
                   doc.metadata?.normalizedReference                    || null;
  const chunkIdx = doc.chunk_index != null ? String(doc.chunk_index)
                 : doc.chunkIndex   != null ? String(doc.chunkIndex) : null;

  if (docId && (chunkRef || chunkIdx !== null)) {
    return normalizeText(`${docId}|${chunkRef || ""}|${chunkIdx || ""}`).toLowerCase();
  }

  // Fallback for unchunked / non-Drive documents: citation → path → source → title.
  return normalizeText(
    doc.citation              ||
    doc.reference             ||
    doc.path                  ||
    doc.source_path           ||
    doc.metadata?.path        ||
    doc.originalSource        ||
    doc.original_source       ||
    doc.source                ||
    doc.title                 ||
    `${extractBestTitle(doc)}|${extractBestCitation(doc)}|${extractBestUrl(doc)}`
  ).toLowerCase();
}

function hasContent(doc = {}) {
  return Boolean(
    extractBestContent(doc) ||
      extractBestTitle(doc) ||
      extractBestCitation(doc) ||
      extractBestUrl(doc)
  );
}

function filterBeforeRerank(docs = [], { allowReviewMaterials = false } = {}) {
  const dropped = {
    emptySources: 0,
    duplicateExactSources: 0,
    hiddenReviewerOnlySources: 0,
    clearlySupersededSources: 0
  };

  const seen = new Set();
  const output = [];

  for (const doc of docs || []) {
    if (!hasContent(doc)) {
      dropped.emptySources += 1;
      continue;
    }

    const key = sourceDedupeKey(doc);

    if (key && seen.has(key)) {
      dropped.duplicateExactSources += 1;
      continue;
    }

    if (key) seen.add(key);

    if (!allowReviewMaterials && isHiddenReviewerOnlySource(doc)) {
      dropped.hiddenReviewerOnlySources += 1;
      continue;
    }

    output.push(doc);
  }

  let supersessionFiltered = output;

  try {
    const filtered = applySupersessionFilter(output);

    if (Array.isArray(filtered)) {
      // Legacy: direct-array return path (preserved for safety)
      const droppedCount = Math.max(0, output.length - filtered.length);
      dropped.clearlySupersededSources += droppedCount;
      supersessionFiltered = filtered;
      console.log("[SUPERSESSION FILTER APPLIED]", {
        returnShape:  "array",
        selectedField: "direct",
        inputCount:   output.length,
        outputCount:  filtered.length,
        droppedCount,
      });
    } else if (filtered && typeof filtered === "object") {
      // Object return — extract the best available array in priority order:
      //   activeDocs > effectiveDocs > sources > filtered > filteredSources
      const shapeCandidates = [
        ["activeDocs",      filtered.activeDocs],
        ["effectiveDocs",   filtered.effectiveDocs],
        ["sources",         filtered.sources],
        ["filtered",        filtered.filtered],
        ["filteredSources", filtered.filteredSources],
      ];
      const found = shapeCandidates.find(([, arr]) => Array.isArray(arr));

      if (found) {
        const [selectedField, resultArray] = found;
        const droppedCount = Math.max(0, output.length - resultArray.length);
        dropped.clearlySupersededSources += droppedCount;
        supersessionFiltered = resultArray;
        console.log("[SUPERSESSION FILTER APPLIED]", {
          returnShape:          "object",
          selectedField,
          inputCount:           output.length,
          outputCount:          resultArray.length,
          droppedCount,
          supersededCount:      filtered.supersededCount      ?? null,
          hasSupersededSources: filtered.hasSupersededSources ?? null,
        });
      } else {
        // Object returned but contains no valid array — preserve original sources
        console.log("[SUPERSESSION FILTER SHAPE WARNING]", {
          returnShape:  "object_no_valid_array",
          selectedField: null,
          inputCount:   output.length,
          outputCount:  output.length,
          droppedCount: 0,
          availableKeys: Object.keys(filtered),
          note: "No valid array found in applySupersessionFilter result; preserving original sources",
        });
      }
    } else {
      console.log("[SUPERSESSION FILTER SHAPE WARNING]", {
        returnShape:  filtered == null ? String(filtered) : typeof filtered,
        selectedField: null,
        inputCount:   output.length,
        outputCount:  output.length,
        droppedCount: 0,
        note: "Unexpected applySupersessionFilter result shape; preserving original sources",
      });
    }
  } catch (err) {
    supersessionFiltered = output;
    console.log("[SUPERSESSION FILTER SHAPE WARNING]", {
      returnShape:  "error",
      selectedField: null,
      inputCount:   output.length,
      outputCount:  output.length,
      droppedCount: 0,
      error:        err?.message || String(err),
      note:         "applySupersessionFilter threw; preserving original sources",
    });
  }

  return {
    docs: supersessionFiltered,
    droppedBeforeRerank: dropped
  };
}

// ── Precision filter: reject cross-domain-contaminated chunks from VAT queries ──
//
// DESIGN (Phase 4C.2):
//  Strong VAT signals — appear almost exclusively in VAT context.
//  "importation", "sale of goods/properties/services" intentionally EXCLUDED:
//  they also appear verbatim in excise-tax and customs sections.
//
//  Two rejection tiers (controlled by the singleHit flag per category):
//
//  singleHit: true  — when strongVatHits === 0, even ONE hit is enough to reject.
//    Used for ALL cross-domain categories including EXCISE.  A chunk with zero strong
//    VAT signals that mentions excise/tobacco/estate-tax/etc. is conclusively off-topic.
//
//  singleHit: false — needs ≥2 hits (currently unused; kept for future use).
//
//  When strongVatHits > 0: ALWAYS use dominance check (cross > strong) regardless
//    of singleHit flag.  This is where Sec. 106/107 incidental-excise protection lives:
//    "including excise taxes, if any" adds 1 excise hit vs N VAT hits → not dominant → PASS.

// Regex that matches genuine VAT signals regardless of surrounding punctuation.
// Replaces " vat " (space-padded) which missed "VAT.", "VAT)", "VAT-exempt".
const _PF_VAT_STRONG_RX = /\bv\.?a\.?t\.?\b|value[- ]added tax|output (?:vat|tax)|input (?:vat|tax)|zero[- ]rated|zero rating|vatable/gi;

// singleHit: when true, a single cross-domain occurrence (with no strong VAT hits)
// is sufficient for rejection.  When false, ≥2 hits are required.
const _PF_CROSS_DOMAIN = [
  // EXCISE: singleHit=true — Sec. 106/107 incidental-mention protection comes from the
  // strongVatHits > 0 dominance path, NOT from this threshold.  A chunk with
  // strongVatHits === 0 that mentions excise is conclusively non-VAT; reject on 1 hit.
  // "excise" (bare) is safe here because _pfCountHits uses non-overlapping matching:
  // "excise taxes" is consumed as "excise tax" first, preventing double-count on "excise".
  { key: "EXCISE",          singleHit: true,
    terms: ["excise tax", "excise duty", "excise", "specific tax", "ad valorem tax", "sin tax"],
    query: /\bexcise\b|\bsin tax\b|\bad valorem\b|\bspecific tax\b/i },
  // TOBACCO: singleHit=true — no legitimate reason for tobacco terms in a pure VAT chunk
  { key: "TOBACCO",         singleHit: true,
    terms: ["tobacco", "cigarette", "cigar", "heated tobacco", "heat-not-burn",
            "vaping product", "tobacco product", "nicotine salt"],
    query: /\btobacco|cigarette|cigar|heated tobacco|vaping\b/i },
  // FDA: singleHit=true — RA 11467 (heated tobacco/FDA regulation) is not VAT.
  // "fda" added as standalone term: DB text uses bare "FDA" in regulatory context.
  { key: "FDA",             singleHit: true,
    terms: ["fda", "food and drug administration", "fda clearance", "fda registration",
            "health warning label", "nicotine content"],
    query: /\bfda|food and drug\b/i },
  // PETROLEUM: singleHit=true
  { key: "PETROLEUM",       singleHit: true,
    terms: ["petroleum", "petroleum product", "petroleum products", "oil industry", "oil depot"],
    query: /\bpetroleum\b/i },
  // SWEETENED_BEV: singleHit=true
  { key: "SWEETENED_BEV",   singleHit: true,
    terms: ["sweetened beverage", "sweetened beverages", "sugar-sweetened"],
    query: /\bsweetened bev/i },
  // ESTATE_TAX: singleHit=true
  { key: "ESTATE_TAX",      singleHit: true,
    terms: ["estate tax"],
    query: /\bestate tax\b/i },
  // DONORS_TAX: singleHit=true — includes ASCII apostrophe, Unicode right-quote (U+2019),
  // and no-apostrophe variants.  NIRC text in Supabase uses U+2019 for possessives.
  { key: "DONORS_TAX",      singleHit: true,
    terms: ["donor’s tax", "donor's tax", "donor tax", "donors tax", "gift tax"],
    query: /\bdonor['‘’]?s? tax|gift tax\b/i },
  // PCT_TAX: singleHit=true
  { key: "PCT_TAX",         singleHit: true,
    terms: ["percentage tax", "other percentage tax", "section 116", "sec. 116"],
    query: /\bpercentage tax\b/i },
  // WITHHOLDING: singleHit=true — expanded/final/creditable withholding are clearly EWT/FWT
  { key: "WITHHOLDING",     singleHit: true,
    terms: ["withholding tax", "expanded withholding", "final withholding",
            "creditable withholding", "withholding agent on vat"],
    query: /\bwithholding\b/i },
  // CRIMINAL_PENALTY: singleHit=true — Sec. 254/255 criminal penalty chunks
  { key: "CRIMINAL_PENALTY", singleHit: true,
    terms: ["evade or defeat", "willfully attempt", "fine of not less than",
            "suffer imprisonment", "section 254", "sec. 254"],
    query: /\bcriminal|imprison|evad|evasion\b/i },
];

// Count non-overlapping occurrences of any term in the combined string.
// Terms are sorted longest-first so compound terms (e.g. "excise tax") consume
// their character positions before shorter sub-terms (e.g. bare "excise") can
// re-claim them.  This prevents double-counting "excise taxes" as both an
// "excise tax" hit AND an "excise" hit.
function _pfCountHits(combined, terms) {
  if (!terms.length) return 0;
  const sorted   = [...terms].sort((a, b) => b.length - a.length);
  const consumed = new Uint8Array(combined.length);
  let   total    = 0;
  for (const t of sorted) {
    let pos = 0;
    while ((pos = combined.indexOf(t, pos)) !== -1) {
      if (!consumed[pos]) {
        total++;
        for (let i = pos; i < pos + t.length; i++) consumed[i] = 1;
      }
      pos++;   // +1 so we find all starts, skipping consumed ones
    }
  }
  return total;
}

function _pfIsVatFocused(issueClassification = {}, query = "") {
  const q    = String(query || "").toLowerCase();
  const prim = String(issueClassification.primaryIssue || "").toUpperCase().replace(/[\s-]/g, "_");
  const dom  = String(issueClassification.domainCode || issueClassification.domain || "").toUpperCase().replace(/[\s-]/g, "_");
  const subs = (issueClassification.subIssues || []).map(s => String(s).toUpperCase().replace(/[\s-]/g, "_"));
  const vatSet = new Set(["VAT", "VAT_LIABILITY", "VAT_REFUND", "VAT_DEFINITION",
    "VAT_ZERO_RATING", "VAT_EXEMPTION", "VAT_REGISTRATION", "VALUE_ADDED_TAX"]);
  if (vatSet.has(prim) || vatSet.has(dom)) return true;
  if (subs.some(s => vatSet.has(s))) return true;
  if (/\b(?:vat|value[- ]added tax|output vat|input vat|vat refund|vat exempt)\b/i.test(q)) return true;
  return false;
}

function applyPrecisionFilter(docs = [], issueClassification = {}, query = "") {
  if (!docs.length) {
    return { docs: [], precisionDropped: 0, precisionPassed: 0, dominantCrossDomain: null };
  }

  const isVatQuery = _pfIsVatFocused(issueClassification, query);
  if (!isVatQuery) {
    console.log("[PRECISION FILTER]", { vatQuery: false, docsIn: docs.length, action: "PASS_ALL" });
    return { docs, precisionDropped: 0, precisionPassed: docs.length, dominantCrossDomain: null };
  }

  const q           = String(query || "").toLowerCase();
  const output      = [];
  let   dropped     = 0;
  const rejectFreq  = {};   // { key: count } for dominantCrossDomain

  for (const doc of docs) {
    const text     = String(doc.text || doc.content || "").toLowerCase();
    const titleRaw = String(doc.title || doc.document_title || doc.source || "").toLowerCase();
    const combined = `${text} ${titleRaw}`;

    // Count strong VAT signals (handles all punctuation variants via regex).
    const strongVatHits = (combined.match(_PF_VAT_STRONG_RX) || []).length;

    let rejectKey   = null;
    let rejectCross = 0;

    for (const { key, terms, query: qRx, singleHit } of _PF_CROSS_DOMAIN) {
      if (qRx.test(q)) continue;                   // query explicitly asks about this domain → skip

      const crossHits = _pfCountHits(combined, terms);
      if (crossHits === 0) continue;               // no contamination signal at all

      if (strongVatHits > 0) {
        // Strong VAT content present: reject only when contamination clearly dominates.
        // This protects Sec. 106/107 "including excise taxes, if any" (1 excise < N vat).
        if (crossHits > strongVatHits) { rejectKey = key; rejectCross = crossHits; break; }
      } else {
        // No strong VAT signals in this chunk.
        // singleHit categories: 1 hit is enough (estate tax, donor’s tax, tobacco, FDA, etc.)
        // non-singleHit (EXCISE): require ≥2 hits to avoid rejecting procedural chunks
        const threshold = singleHit ? 1 : 2;
        if (crossHits >= threshold) { rejectKey = key; rejectCross = crossHits; break; }
      }
    }

    if (rejectKey) {
      dropped += 1;
      rejectFreq[rejectKey] = (rejectFreq[rejectKey] || 0) + 1;
      console.log("[PRECISION FILTER REJECT]", {
        reason:    rejectKey,
        ref:       String(doc.normalized_reference || doc.normalizedReference || doc.id || "").slice(0, 60),
        strongVat: strongVatHits,
        crossHits: rejectCross,
        snippet:   combined.slice(0, 120)
      });
      continue;
    }

    output.push(doc);
  }

  // Most-frequently rejected cross-domain category for diagnostics
  const dominantCrossDomain = Object.keys(rejectFreq).sort(
    (a, b) => (rejectFreq[b] || 0) - (rejectFreq[a] || 0)
  )[0] || null;

  console.log("[PRECISION FILTER PASS]", {
    vatQuery: true, docsIn: docs.length, passed: output.length,
    dropped, dominantCrossDomain
  });
  return { docs: output, precisionDropped: dropped, precisionPassed: output.length, dominantCrossDomain };
}
// ── END precision filter ──────────────────────────────────────────────────────

function applySafeHierarchyRerank(docs = []) {
  try {
    const ranked = rerankByHierarchy(docs);
    return Array.isArray(ranked) ? ranked : docs;
  } catch {
    return docs;
  }
}

function applySafeTinaRerank({ docs = [], query = "", issueClassification = null, adaptiveMode = "STANDARD" }) {
  try {
    const ranked = rerankForTina({
      sources: docs,
      query,
      issueClassification,
      adaptiveMode
    });

    if (Array.isArray(ranked)) return ranked;
    if (Array.isArray(ranked?.sources)) return ranked.sources;
    if (Array.isArray(ranked?.retrievedSources)) return ranked.retrievedSources;

    return docs;
  } catch {
    return docs;
  }
}

async function callSearchCallable({ callable, query, layer, poolK, issueClassification, extra = {} }) {
  if (typeof callable !== "function") return [];

  try {
    const result = await callable(query, {
      topK: poolK,
      limit: poolK,
      maxResults: poolK,
      retrievalLayer: layer,
      issueClassification,
      retrievalStrategy: issueClassification?.retrievalStrategy,
      targetAuthorities: issueClassification?.targetAuthorities,
      ...extra
    });

    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.documents)) return result.documents;
    if (Array.isArray(result?.sources)) return result.sources;
    if (Array.isArray(result?.matches)) return result.matches;
    if (Array.isArray(result?.retrievedSources)) return result.retrievedSources;

    return [];
  } catch (err) {
    // Log explicitly so a real search failure is distinguishable from an intentional
    // semantic skip (which returns [] without throwing).  The pipeline wrapper logs
    // [SEMANTIC FALLBACK SKIPPED] for intentional skips and [SEMANTIC FALLBACK FAILED]
    // for exceptions; callSearchCallable failures surface here as a separate signal.
    console.warn("[RETRIEVAL] callSearchCallable exception", {
      layer,
      query: String(query || "").slice(0, 80),
      error: err?.message || String(err)
    });
    return [];
  }
}

// LAW E — Supabase match_documents RPC with mandatory authority_names filter.
// Never retrieve without the authority_names filter when authorityFilter is supplied.
async function supabaseAuthoritySearch({
  supabase,
  query,
  authorityFilter = [],
  embedding = null,
  poolK = DEFAULT_POOL_K,
  layer = RETRIEVAL_LAYER.EXACT_NORMALIZED_AUTHORITY
}) {
  if (!supabase || typeof supabase.rpc !== "function") return [];
  if (!Array.isArray(authorityFilter) || authorityFilter.length === 0) return [];

  // ── TEMP TRACE: [QUERY EMBEDDING] + [RPC PARAMS] ─────────────────────────
  // Remove after retrieval audit is complete.
  console.log("[QUERY EMBEDDING]", {
    embeddingProvided: Boolean(embedding),
    embeddingIsArray:  Array.isArray(embedding),
    embeddingLength:   Array.isArray(embedding) ? embedding.length : "n/a",
    first5dims:        Array.isArray(embedding) ? embedding.slice(0, 5) : null
  });
  console.log("[RPC PARAMS]", {
    rpcName:         "match_documents",
    noteExpected:    "match_tina_vectors",
    matchCount:      poolK,
    filter:          { authority_names: authorityFilter },
    embeddingIsNull: embedding === null
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  try {
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_count:     poolK,
      filter:          { authority_names: authorityFilter }
    });

    // ── TEMP TRACE: [RPC RESULTS] ─────────────────────────────────────────
    // Remove after retrieval audit is complete.
    console.log("[RPC RESULTS]", {
      error:    error ? { message: error.message, code: error.code, details: error.details } : null,
      rowCount: (data || []).length,
      sample:   (data || []).slice(0, 2).map(r => ({
        id:                   r.id,
        score:                r.similarity ?? r.score ?? null,
        authority_type:       r.authority_type ?? null,
        normalized_reference: String(r.normalized_reference || "").slice(0, 60)
      }))
    });
    // ── END TEMP TRACE ──────────────────────────────────────────────────────

    if (error) {
      console.warn(`[RETRIEVAL_ENGINE] supabaseAuthoritySearch RPC error: ${error.message}`);
      return [];
    }

    return (data || []).map((doc) => ({
      ...doc,
      retrievalLayer:       layer,
      retrievalPhase:       layer,
      matchedRetrievalQuery: query,
      authorityFilterApplied: true
    }));
  } catch (err) {
    console.warn(`[RETRIEVAL_ENGINE] supabaseAuthoritySearch exception: ${err.message}`);
    return [];
  }
}

async function supabaseFallbackSearch({
  supabase,
  query,
  authorityFilter = [],
  poolK = DEFAULT_POOL_K,
  layer = RETRIEVAL_LAYER.SUPABASE_FALLBACK
}) {
  if (!supabase || typeof supabase.from !== "function") return [];

  const search = normalizeText(query);
  if (!search) return [];

  const tables = ["documents", "source_documents", "tina_documents"];

  for (const table of tables) {
    try {
      let q = supabase
        .from(table)
        .select("*")
        .or(
          [
            `title.ilike.%${search}%`,
            `content.ilike.%${search}%`,
            `text.ilike.%${search}%`,
            `source.ilike.%${search}%`,
            `path.ilike.%${search}%`,
            `citation.ilike.%${search}%`,
            `normalized_reference.ilike.%${search}%`
          ].join(",")
        )
        .limit(poolK);

      // Apply authority_names metadata filter when provided (LAW E)
      if (Array.isArray(authorityFilter) && authorityFilter.length > 0) {
        q = q.filter("authority_name", "in", `(${authorityFilter.map(a => `"${a}"`).join(",")})`);
      }

      const { data, error } = await q;

      if (!error && Array.isArray(data) && data.length) {
        return data.map((doc) => ({
          ...doc,
          retrievalLayer:       layer,
          retrievalPhase:       layer,
          matchedRetrievalQuery: search
        }));
      }
    } catch {
      continue;
    }
  }

  return [];
}

function annotateDocLayer(doc = {}, layer = RETRIEVAL_LAYER.VECTOR_SEMANTIC, queryText = "") {
  return {
    ...doc,
    retrievalLayer: doc.retrievalLayer || layer,
    retrievalPhase: doc.retrievalPhase || layer,
    matchedRetrievalQuery: doc.matchedRetrievalQuery || queryText || null
  };
}

/**
 * isAuthoritySufficient — domain-general authority sufficiency gate
 *
 * Decides whether the candidates collected by Layers 1 and 2 are rich enough
 * to skip Layer 3 (TITLE_PATH_METADATA) and Layer 4 (CONTENT_KEYWORD).
 * Those layers call metadataSearch() with broad ILIKE queries — up to 60
 * OR-chained conditions per keyword call — that cause Supabase 57014
 * statement_timeout when no pg_trgm GIN indexes are present.
 *
 * Domain-general: no VAT/NIRC-specific logic.  Applies identically to:
 *   income tax, withholding tax, excise tax, percentage tax, DST, local tax,
 *   customs/CMTA, PEZA/incentives, refund, assessment/protest, jurisprudence,
 *   BIR issuances, and any future domain added to TINA's corpus.
 *
 * Rules (applied in order):
 *   Guard D — jurisprudence_required:      blocks all positive rules when case
 *             law is expected but no case-type candidates are present
 *   Rule  C — provision_specific_exact_match: narrow 1–2 provision query with
 *             full exact-authority coverage
 *   Rule  A — target_coverage:             named target authorities sufficiently
 *             covered (≥50% and ≥min(2,count) matched)
 *   Rule  B — unique_controlling_authorities: ≥3 distinct authority references
 *             with at least one controlling-type chunk
 *   Fallback— insufficient_authority:      none of the above met; run Layers 3/4
 *
 * Returns { sufficient: boolean, reason: string, ...diagnosticFields }
 */
function isAuthoritySufficient({
  candidates = [],
  layerDiagnostics = {},
  uniqueAuthorityCount = 0,
  issueClassification = null,
  topK = DEFAULT_TOP_K,  // eslint-disable-line no-unused-vars — kept for API compat
} = {}) {
  const { exactAuthorityMatches = 0, citationVariantMatches = 0 } = layerDiagnostics;

  const targetAuthorities =
    safeArray(issueClassification?.targetAuthorities).filter(Boolean);
  const targetAuthoritiesCount = targetAuthorities.length;

  const supportingJurisprudence =
    safeArray(issueClassification?.supportingJurisprudence).filter(Boolean);

  // ── Shared derived values ─────────────────────────────────────────────────

  // Distinct normalized_reference values in the candidate pool.
  // Used for Rule A target matching and Rule B distinct-ref counting.
  // candidateRefs.size counts distinct authority references, NOT individual
  // chunks — 3 chunks of the same section count as 1 ref.
  const candidateRefs = new Set(
    candidates
      .map(c => String(c.normalized_reference || c.normalizedReference || "").trim())
      .filter(Boolean)
  );

  // Distinct authority_type values in the candidate pool.
  const candidateAuthorityTypes = new Set(
    candidates
      .map(c =>
        String(c.authority_type || c.metadata?.authorityType || "").trim().toUpperCase()
      )
      .filter(Boolean)
  );

  // Does the pool include at least one recognized primary authority type?
  const hasControllingAuthority = [...candidateAuthorityTypes].some(t =>
    CONTROLLING_AUTHORITY_TYPES.has(t)
  );

  // Does the pool include at least one court/case-law authority type?
  const hasJurisprudenceCandidates = [...candidateAuthorityTypes].some(t =>
    CASE_AUTHORITY_TYPES.has(t)
  );

  // How many targetAuthorities from the issue classification appear in the
  // candidate pool?  Normalized string comparison handles both stored formats:
  // "NIRC Sec. 105" (detectNircSectionHeading) and "NIRC_SEC_105"
  // (normalizeLegalReference).
  let matchedTargetAuthorities = 0;
  if (targetAuthoritiesCount > 0) {
    for (const ta of targetAuthorities) {
      const taNorm = String(ta || "").trim().toUpperCase();
      if (!taNorm) continue;
      const matched =
        candidateRefs.has(ta) ||
        candidateRefs.has(taNorm) ||
        [...candidateRefs].some(r => {
          const rUp = r.toUpperCase();
          return rUp === taNorm || rUp.includes(taNorm) || taNorm.includes(rUp);
        });
      if (matched) matchedTargetAuthorities++;
    }
  }

  const targetCoverage =
    targetAuthoritiesCount > 0 ? matchedTargetAuthorities / targetAuthoritiesCount : 0;

  // ── Safety guard D: jurisprudence-heavy queries ───────────────────────────
  // If this query expects court-case authority (has supportingJurisprudence
  // references, has case citation patterns in targetAuthorities, or has a
  // jurisprudence-first retrievalStrategy) AND the candidate pool contains no
  // SC/CTA/CA-type chunks — block all positive rules.
  //
  // Rationale: refund, prescriptive period, assessment, protest, and other
  // jurisprudence-heavy issues require case law chunks to ground the answer.
  // Without them, skipping Layer 3/4 would produce an ungrounded response.
  // Layer 5 (semantic) is the correct path to surface case-law — not blocking it.
  const retrievalStrategy =
    String(issueClassification?.retrievalStrategy || "").toUpperCase();
  const isJurisprudenceHeavy =
    supportingJurisprudence.length > 0 ||
    targetAuthorities.some(ta => CASE_CITATION_PATTERN.test(String(ta))) ||
    retrievalStrategy.includes("JURISPRUDENCE") ||
    retrievalStrategy.includes("CASE_LAW");

  if (isJurisprudenceHeavy && !hasJurisprudenceCandidates) {
    return {
      sufficient:               false,
      reason:                   "insufficient_authority_jurisprudence_required",
      isJurisprudenceHeavy,
      hasJurisprudenceCandidates,
      matchedTargetAuthorities,
      targetAuthoritiesCount,
      uniqueAuthorityCount,
    };
  }

  // ── Rule C: provision_specific_exact_match ────────────────────────────────
  // For narrow provision-lookup queries (1–2 named target authorities), 1–3
  // exact chunks that directly cover all named provisions is sufficient.
  // All of the following must hold:
  //   • 1 or 2 target authorities specified (narrow, not a broad topic query)
  //   • Layer 1 returned at least 1 exact-authority chunk
  //   • All named target authorities are represented in the candidate refs
  //     (matchedTargetAuthorities >= targetAuthoritiesCount — 100% coverage)
  // This fires before Rule A so that single-provision queries get the most
  // specific reason label in logs.
  if (
    targetAuthoritiesCount >= 1 &&
    targetAuthoritiesCount <= 2 &&
    exactAuthorityMatches >= 1 &&
    matchedTargetAuthorities >= targetAuthoritiesCount
  ) {
    return {
      sufficient:              true,
      reason:                  "provision_specific_exact_match",
      exactAuthorityMatches,
      targetAuthoritiesCount,
      matchedTargetAuthorities,
      uniqueAuthorityCount,
    };
  }

  // ── Rule A: target_coverage ───────────────────────────────────────────────
  // Named target authorities must be substantially covered in the candidate pool.
  //
  // Two thresholds must both be met:
  //   1. matchedTargetAuthorities >= min(2, targetAuthoritiesCount)
  //      For a 1-authority query: needs 1 match (100%).
  //      For a 2-authority query: needs 2 matches (100%).
  //      For a 4-authority query: needs 2 matches (50%).
  //      The min(2,…) floor prevents triggering when only a single tangential
  //      authority is represented in a multi-authority query.
  //   2. targetCoverage >= 0.5  (≥50% of named authorities present)
  //      Combines with threshold 1 to require proportional coverage on
  //      longer authority lists (e.g. 3/6 = 50% for a 6-authority query).
  //
  // Does not fire when no target authorities are named (unclassified query).
  const minMatchRequired = Math.min(2, targetAuthoritiesCount);
  if (
    targetAuthoritiesCount > 0 &&
    matchedTargetAuthorities >= minMatchRequired &&
    targetCoverage >= 0.5
  ) {
    return {
      sufficient:              true,
      reason:                  "target_coverage",
      matchedTargetAuthorities,
      targetAuthoritiesCount,
      targetCoverage,
      minMatchRequired,
      uniqueAuthorityCount,
    };
  }

  // ── Rule B: unique_controlling_authorities ────────────────────────────────
  // ≥3 distinct normalized_reference values in the candidate pool, AND at least
  // one belongs to a primary authority type.
  //
  // Uses candidateRefs.size (distinct refs, not individual chunk count) so that
  // 3 duplicate chunks of the same section do NOT qualify — genuine breadth
  // across ≥3 different laws/sections is required.
  //
  // The hasControllingAuthority guard prevents triggering on 3 refs from
  // SECONDARY, CPA_NOTES, or REVIEW_MATERIALS chunks.
  if (candidateRefs.size >= 3 && hasControllingAuthority) {
    return {
      sufficient:              true,
      reason:                  "unique_controlling_authorities",
      distinctAuthorityRefs:   candidateRefs.size,
      hasControllingAuthority,
      uniqueAuthorityCount,
      matchedTargetAuthorities,
      targetAuthoritiesCount,
    };
  }

  // ── Insufficient — let Layers 3/4 run ────────────────────────────────────
  return {
    sufficient:              false,
    reason:                  "insufficient_authority",
    exactAuthorityMatches,
    citationVariantMatches,
    distinctAuthorityRefs:   candidateRefs.size,
    uniqueAuthorityCount,
    matchedTargetAuthorities,
    targetAuthoritiesCount,
    hasControllingAuthority,
  };
}

async function collectCandidateDocs({
  query = "",
  querySet = {},
  vectorSearch = null,
  searchFn = null,
  supabase = null,
  documents = [],
  topK = DEFAULT_TOP_K,
  poolK = DEFAULT_POOL_K,
  issueClassification = null,
  authorityFilter = [],
  embedding = null
} = {}) {
  const candidates = [];
  const diagnostics = {
    exactAuthorityMatches: 0,
    citationVariantMatches: 0,
    metadataMatches: 0,
    contentKeywordMatches: 0,
    semanticMatches: 0,
    fallbackMatches: 0,
    supabaseFallbackMatches: 0
  };

  // ── Authority sufficiency: early exit after Layer 1 / Layer 2 ────────────
  // After completing all queries for Layer 1 (EXACT_NORMALIZED_AUTHORITY) or
  // Layer 2 (CITATION_VARIANT), if unique usable authority candidates already
  // reach topK we break the layer loop immediately — no Layer 3-6 runs.
  // This prevents the slow metadataSearch / ILIKE Supabase timeout (error 57014)
  // when the fast .in("normalized_reference") path already found enough results.
  const _AUTH_EXIT_LAYERS = new Set([
    RETRIEVAL_LAYER.EXACT_NORMALIZED_AUTHORITY,
    RETRIEVAL_LAYER.CITATION_VARIANT
  ]);
  const _AUTH_SUFFICIENCY = Math.max(Number(topK) || DEFAULT_TOP_K, DEFAULT_TOP_K);
  const _authCandidateKeys = new Set();
  const _isUsableAuthorityDoc = (doc) =>
    Boolean(doc.text || doc.content) &&
    Boolean(doc.source || doc.document_title || doc.normalized_reference ||
            doc.normalizedReference || doc.authority_type);
  const _authDocKey = (doc) => {
    if (doc.id) return `id:${doc.id}`;
    const src = String(doc.source || doc.document_title || "");
    const ref = String(
      doc.normalized_reference || doc.normalizedReference ||
      (doc.chunk_index != null ? String(doc.chunk_index) : "")
    );
    return `${src}|${ref}`;
  };
  // ── End authority sufficiency ─────────────────────────────────────────────

  for (const doc of safeArray(documents)) {
    candidates.push(annotateDocLayer(doc, RETRIEVAL_LAYER.PROVIDED_DOCUMENTS, "provided"));
  }

  // LAW E — authority_names filter applied first when authorityFilter is supplied.
  // BYPASSED when vectorSearch/searchFn is provided: Layer 1 of the callable
  // (exactAuthoritySearch via the pipeline routing wrapper) handles exact authority
  // retrieval on the correct RPC path.  The old supabaseAuthoritySearch() uses the
  // stale match_documents RPC with a null embedding — skipping it prevents that
  // wrong-RPC path from running additively alongside the working callable.
  if (!(vectorSearch || searchFn) && Array.isArray(authorityFilter) && authorityFilter.length > 0) {
    const authorityResults = await supabaseAuthoritySearch({
      supabase,
      query,
      authorityFilter,
      embedding,
      poolK,
      layer: RETRIEVAL_LAYER.EXACT_NORMALIZED_AUTHORITY
    });
    candidates.push(...authorityResults);
    diagnostics.exactAuthorityMatches += authorityResults.length;
  }

  const callable = vectorSearch || searchFn;

  // ── TEMP TRACE: callable check ────────────────────────────────────────────
  // Remove after retrieval audit is complete.
  console.log("[RETRIEVAL INPUT] collectCandidateDocs", {
    callableIsNull:    callable === null,
    callableType:      typeof callable,
    hasVectorSearch:   Boolean(vectorSearch),
    hasSearchFn:       Boolean(searchFn),
    hasSupabase:       Boolean(supabase && typeof supabase.rpc === "function"),
    authorityFilterLen: authorityFilter.length,
    providedDocsLen:   safeArray(documents).length,
    layerCount:        safeArray(querySet.layers).length,
    poolK
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  layerLoop: for (const layerInfo of safeArray(querySet.layers)) {
    const layer = layerInfo.layer;
    const queries = safeArray(layerInfo.queries).slice(0, 16);

    // ── Domain-general authority sufficiency gate ──────────────────────────
    // Skip Layer 3 (TITLE_PATH_METADATA) and Layer 4 (CONTENT_KEYWORD) when
    // Layers 1+2 already produced sufficient authority-grounded results.
    // Both layers call metadataSearch() with broad ILIKE queries that trigger
    // Supabase 57014 statement timeouts under load.
    // Layer 5 (VECTOR_SEMANTIC) and Layer 6 (BROAD_TAX_DOMAIN_FALLBACK) are
    // never skipped — they supplement broad/explanatory queries where exact
    // authority retrieval alone is not enough.
    if (
      layer === RETRIEVAL_LAYER.TITLE_PATH_METADATA ||
      layer === RETRIEVAL_LAYER.CONTENT_KEYWORD
    ) {
      const suffCheck = isAuthoritySufficient({
        candidates,
        layerDiagnostics:    diagnostics,
        uniqueAuthorityCount: _authCandidateKeys.size,
        issueClassification,
        topK,
      });

      console.log("[AUTHORITY SUFFICIENCY CHECK]", {
        layer,
        exactAuthorityMatches:    diagnostics.exactAuthorityMatches,
        citationVariantMatches:   diagnostics.citationVariantMatches,
        uniqueAuthorityCount:     _authCandidateKeys.size,
        targetAuthoritiesCount:   safeArray(issueClassification?.targetAuthorities).length,
        matchedTargetAuthorities: suffCheck.matchedTargetAuthorities ?? null,
        decision: suffCheck.sufficient ? "SKIP" : "CONTINUE",
        reason:   suffCheck.reason,
      });

      if (suffCheck.sufficient) {
        console.log("[AUTHORITY SUFFICIENCY MET — SKIP METADATA KEYWORD LAYERS]", {
          skippedLayer:             layer,
          domain:                   issueClassification?.primaryDomain  ?? null,
          primaryIssue:             issueClassification?.primaryIssue   ?? null,
          exactAuthorityMatches:    diagnostics.exactAuthorityMatches,
          citationVariantMatches:   diagnostics.citationVariantMatches,
          uniqueAuthorityCount:     _authCandidateKeys.size,
          totalCandidates:          candidates.length,
        });
        continue layerLoop;
      }
    }
    // ── End authority sufficiency gate ─────────────────────────────────────

    for (const searchQuery of queries) {
      let results = await callSearchCallable({
        callable,
        query: searchQuery,
        layer,
        poolK,
        issueClassification,
        extra: { originalQuery: query }
      });

      if (!results.length) {
        // When a working callable is provided, semantic layers (VECTOR_SEMANTIC and
        // BROAD_TAX_DOMAIN_FALLBACK) intentionally return [] when authority layers
        // already accumulated enough results.  Do not treat that as a miss requiring
        // rescue — supabaseFallbackSearch queries wrong table names anyway (documents,
        // source_documents, tina_documents rather than tina_vector_store).
        const _isSemanticLayer =
          layer === RETRIEVAL_LAYER.VECTOR_SEMANTIC ||
          layer === RETRIEVAL_LAYER.BROAD_TAX_DOMAIN_FALLBACK;
        if (!callable || !_isSemanticLayer) {
          results = await supabaseFallbackSearch({
            supabase,
            query: searchQuery,
            poolK,
            layer
          });

          diagnostics.supabaseFallbackMatches += results.length;
        }
      }

      const annotated = results.map((doc) => annotateDocLayer(doc, layer, searchQuery));
      candidates.push(...annotated);

      if (layer === RETRIEVAL_LAYER.EXACT_NORMALIZED_AUTHORITY) diagnostics.exactAuthorityMatches += annotated.length;
      if (layer === RETRIEVAL_LAYER.CITATION_VARIANT) diagnostics.citationVariantMatches += annotated.length;
      if (layer === RETRIEVAL_LAYER.TITLE_PATH_METADATA) diagnostics.metadataMatches += annotated.length;
      if (layer === RETRIEVAL_LAYER.CONTENT_KEYWORD) diagnostics.contentKeywordMatches += annotated.length;
      if (layer === RETRIEVAL_LAYER.VECTOR_SEMANTIC) diagnostics.semanticMatches += annotated.length;
      if (layer === RETRIEVAL_LAYER.BROAD_TAX_DOMAIN_FALLBACK) diagnostics.fallbackMatches += annotated.length;

      // Accumulate unique usable authority candidates and check sufficiency
      // immediately after each query result — do not continue remaining queries
      // in this layer once topK unique usable authority docs are collected.
      // break layerLoop exits both the inner query loop and the outer layer loop.
      if (_AUTH_EXIT_LAYERS.has(layer)) {
        for (const doc of annotated) {
          if (_isUsableAuthorityDoc(doc)) _authCandidateKeys.add(_authDocKey(doc));
        }
        if (_authCandidateKeys.size >= _AUTH_SUFFICIENCY) {
          console.log("[AUTHORITY EARLY EXIT IMMEDIATE]", {
            layer,
            query:                String(searchQuery || "").slice(0, 80),
            usableAuthorityCount: _authCandidateKeys.size,
            returned:             candidates.length
          });
          break layerLoop;
        }
      }
    }
  }

  // ── TEMP TRACE: [DOMAIN FILTER] per-layer summary ────────────────────────
  // Remove after retrieval audit is complete.
  console.log("[DOMAIN FILTER] collectCandidateDocs result", {
    totalCandidates:         candidates.length,
    exactAuthorityMatches:   diagnostics.exactAuthorityMatches,
    citationVariantMatches:  diagnostics.citationVariantMatches,
    metadataMatches:         diagnostics.metadataMatches,
    contentKeywordMatches:   diagnostics.contentKeywordMatches,
    semanticMatches:         diagnostics.semanticMatches,
    fallbackMatches:         diagnostics.fallbackMatches,
    supabaseFallbackMatches: diagnostics.supabaseFallbackMatches
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  return { candidates, layerDiagnostics: diagnostics };
}

function scoreAndAnnotateSources({
  docs = [],
  query = "",
  issueClassification = {},
  querySet = {},
  adaptiveMode = "STANDARD",
  allowReviewMaterials = false
}) {
  return docs.map((doc) => {
    const layer = doc.retrievalLayer || RETRIEVAL_LAYER.VECTOR_SEMANTIC;

    const issueClassificationMatch = buildIssueClassificationMatch(
      query,
      issueClassification,
      doc,
      querySet,
      layer
    );

    const retrievalScore = computeRetrievalScore({
      query,
      doc,
      adaptiveMode,
      issueClassification,
      allowReviewMaterials,
      querySet,
      layer
    });

    return {
      ...doc,
      retrievalScore,
      finalScore: retrievalScore,
      issueClassificationMatch,
      issueMismatch: issueClassificationMatch.issueMismatch,
      targetAuthorityMatch: issueClassificationMatch.targetAuthorityMatch,
      exactAuthorityMatch: issueClassificationMatch.exactAuthorityMatch,
      citationMatchBonus: exactReferenceBonus(query, doc, issueClassification, querySet),
      retrievalIssueType: issueClassificationMatch.docIssues,
      retrievalEngineVersion: ENGINE_VERSION,
      googleDriveFolderAuthority: getGoogleDriveFolderAuthority(doc),
      authorityLevel: safeAuthorityLevel(doc),
      controllingPrecedence: safeControllingPrecedence(doc)
    };
  });
}

function finalDedupeAfterScoring(docs = []) {
  const grouped = new Map();

  for (const doc of docs || []) {
    const key = sourceDedupeKey(doc);
    if (!key) continue;

    const existing = grouped.get(key);

    if (!existing || Number(doc.finalScore || 0) > Number(existing.finalScore || 0)) {
      grouped.set(key, doc);
    }
  }

  return [...grouped.values()].sort((a, b) => Number(b.finalScore || 0) - Number(a.finalScore || 0));
}

function buildCompactDiagnostics({
  querySet = {},
  layerDiagnostics = {},
  droppedBeforeRerank = {},
  precisionDropped = 0,
  precisionPassed = 0,
  dominantCrossDomain = null,
  scored = [],
  finalSourceCount = 0
}) {
  return {
    targetAuthoritiesReceived: safeArray(querySet.targetAuthoritiesReceived).slice(0, MAX_DIAGNOSTIC_ITEMS),
    normalizedAuthorityKeys: safeArray(querySet.normalizedAuthorityKeys).slice(0, MAX_DIAGNOSTIC_ITEMS),
    generatedAuthorityVariants: safeArray(querySet.generatedAuthorityVariants).slice(0, MAX_DIAGNOSTIC_ITEMS),
    exactAuthorityMatches: Number(layerDiagnostics.exactAuthorityMatches || 0),
    citationVariantMatches: Number(layerDiagnostics.citationVariantMatches || 0),
    metadataMatches: Number(layerDiagnostics.metadataMatches || 0),
    contentKeywordMatches: Number(layerDiagnostics.contentKeywordMatches || 0),
    semanticMatches: Number(layerDiagnostics.semanticMatches || 0),
    fallbackMatches: Number(layerDiagnostics.fallbackMatches || 0),
    supabaseFallbackMatches: Number(layerDiagnostics.supabaseFallbackMatches || 0),
    droppedBeforeRerank: {
      emptySources: Number(droppedBeforeRerank.emptySources || 0),
      duplicateExactSources: Number(droppedBeforeRerank.duplicateExactSources || 0),
      hiddenReviewerOnlySources: Number(droppedBeforeRerank.hiddenReviewerOnlySources || 0),
      clearlySupersededSources: Number(droppedBeforeRerank.clearlySupersededSources || 0)
    },
    precisionFilter: {
      dropped:             Number(precisionDropped),
      passed:              Number(precisionPassed),
      dominantCrossDomain: dominantCrossDomain || null
    },
    scoredSourceCount: scored.length,
    finalSourceCount,
    rawFullSourceTextExcludedFromDiagnostics: true
  };
}

function buildSearchQueries(query = "", classification = {}) {
  const querySet = buildRetrievalQuerySet(query, classification);
  return querySet.allQueries.slice(0, 24);
}

async function retrieveRelevantSources(options = {}) {
  const query =
    options.query ||
    options.userQuery ||
    options.question ||
    options.prompt ||
    "";

  const adaptiveContext = options.adaptiveContext || options.context || {};

  const adaptiveMode = normalizeMode(
    options.adaptiveMode ||
      options.mode ||
      options.responseMode ||
      adaptiveContext?.mode ||
      adaptiveContext?.responseMode ||
      adaptiveContext?.responsePlan?.mode ||
      adaptiveContext?.responsePlan?.responseMode ||
      "STANDARD"
  );

  let queryIntent = options.queryIntent || null;

  if (!queryIntent) {
    try {
      queryIntent = analyzeQueryIntent(query);
    } catch {
      queryIntent = null;
    }
  }

  const issueClassification = safeIssueClassification(query, options.issueClassification, {
    primaryDomain: options.primaryDomain,
    primaryIssue: options.primaryIssue,
    subIssue: options.subIssue,
    subIssues: options.subIssues,
    legalDimensions: options.legalDimensions,
    retrievalStrategy: options.retrievalStrategy,
    targetAuthorities: options.targetAuthorities,
    queryIntent
  });

  const allowReviewMaterials =
    options.allowReviewMaterials === true ||
    queryIntent?.requiresReviewMode === true ||
    queryIntent?.requiresQuizMode === true ||
    isReviewMode(adaptiveMode, adaptiveContext);

  const topK = Number(options.topK || options.limit || DEFAULT_TOP_K);
  const poolK = Number(options.poolK || options.candidateLimit || DEFAULT_POOL_K);
  const querySet = buildRetrievalQuerySet(query, issueClassification);

  // PATCH 4 — authorityFilter passed from pipeline Step 5 (LAW E)
  const authorityFilter = safeArray(
    options.authorityFilter ||
    options.controllingAuthorities ||
    options.targetAuthorities ||
    issueClassification?.controllingAuthorities ||
    issueClassification?.targetAuthorities ||
    []
  ).filter(Boolean);

  // ── TEMP TRACE: [RETRIEVAL INPUT] ─────────────────────────────────────────
  // Remove after retrieval audit is complete.
  console.log("[RETRIEVAL INPUT]", {
    query,
    queryLength:          query.length,
    adaptiveMode,
    topK,
    poolK,
    authorityFilterLength: authorityFilter.length,
    authorityFilter:       authorityFilter.slice(0, 10),
    hasVectorSearch:       Boolean(options.vectorSearch),
    hasSearchFn:           Boolean(options.searchFn),
    hasSupabase:           Boolean(options.supabase && typeof options.supabase.rpc === "function"),
    issueClassification: {
      primaryIssue:      issueClassification?.primaryIssue     || null,
      primaryDomain:     issueClassification?.primaryDomain    || null,
      targetAuthorities: (issueClassification?.targetAuthorities || []).slice(0, 5)
    }
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  const { candidates, layerDiagnostics } = await collectCandidateDocs({
    query,
    querySet,
    vectorSearch:    options.vectorSearch,
    searchFn:        options.searchFn,
    supabase:        options.supabase,
    documents:       options.documents || options.sources || options.retrievedSources || [],
    topK,
    poolK,
    issueClassification,
    authorityFilter,
    embedding:       options.embedding || null
  });

  // LAW 3 — ISSUE-TARGETED RETRIEVAL
  // Semantic similarity alone is PROHIBITED as the sole retrieval criterion.
  // If authority-targeted layers (1-4) produced zero results and only Layer 5
  // (VECTOR_SEMANTIC) matched, flag those docs so they are not returned as the
  // sole basis for a legal answer.
  const authorityLayerCount =
    (layerDiagnostics.exactAuthorityMatches || 0) +
    (layerDiagnostics.citationVariantMatches || 0) +
    (layerDiagnostics.metadataMatches || 0) +
    (layerDiagnostics.contentKeywordMatches || 0);
  const semanticOnlyRun = authorityLayerCount === 0 && (layerDiagnostics.semanticMatches || 0) > 0;
  if (semanticOnlyRun) {
    for (const c of candidates) {
      if (c.retrievalLayer === RETRIEVAL_LAYER.VECTOR_SEMANTIC) {
        c.semanticOnlyWarning = true;
        c.law3Warning = "LAW_3_VIOLATION_RISK: No authority-targeted result found. Semantic match only — requires manual authority validation before citing.";
      }
    }
  }

  const prefiltered = filterBeforeRerank(candidates, { allowReviewMaterials });
  // ── TEMP TRACE: Stage 3-4 — domain filter + supersession ──────────────────
  // Remove after retrieval audit is complete.
  console.log("[DOMAIN FILTER]", {
    candidatesIn:  candidates.length,
    afterFilter:   prefiltered.docs.length,
    dropped:       prefiltered.droppedBeforeRerank
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  const precisionResult = applyPrecisionFilter(prefiltered.docs, issueClassification, query);

  const scored = scoreAndAnnotateSources({
    docs: precisionResult.docs,
    query,
    issueClassification,
    querySet,
    adaptiveMode,
    allowReviewMaterials
  });

  let ranked = scored.sort((a, b) => Number(b.finalScore || 0) - Number(a.finalScore || 0));

  ranked = applySafeHierarchyRerank(ranked);
  ranked = applySafeTinaRerank({
    docs: ranked,
    query,
    issueClassification,
    adaptiveMode
  });

  const dedupedAfterScoring = finalDedupeAfterScoring(ranked);
  const sanitized = dedupedAfterScoring.slice(0, topK).map(sanitizeRetrievedSource);

  // ── TEMP TRACE: [RETRIEVAL RETURN] ───────────────────────────────────────
  // Remove after retrieval audit is complete.
  console.log("[RETRIEVAL RETURN]", {
    candidatesTotal:   candidates.length,
    prefilteredDocs:   prefiltered.docs.length,
    precisionFiltered: precisionResult.docs.length,
    precisionDropped:  precisionResult.precisionDropped,
    scored:            scored.length,
    ranked:           ranked.length,
    dedupedAfterScoring: dedupedAfterScoring.length,
    sanitized:        sanitized.length,
    layerDiagnostics,
    sample: sanitized.slice(0, 2).map(s => ({
      id:            s.id,
      authorityType: s.authorityType,
      title:         String(s.title || "").slice(0, 60),
      score:         s.score
    }))
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  const retrievalDiagnostics = buildCompactDiagnostics({
    querySet,
    layerDiagnostics,
    droppedBeforeRerank:  prefiltered.droppedBeforeRerank,
    precisionDropped:     precisionResult.precisionDropped,
    precisionPassed:      precisionResult.precisionPassed,
    dominantCrossDomain:  precisionResult.dominantCrossDomain,
    scored,
    finalSourceCount: sanitized.length
  });

  return {
    query,
    retrievedSources: sanitized,
    sources: sanitized,
    issueClassification,
    queryIntent,
    searchQueries: querySet.allQueries.slice(0, 24),
    retrievalQuerySet: {
      targetAuthoritiesReceived: querySet.targetAuthoritiesReceived,
      normalizedAuthorityKeys: querySet.normalizedAuthorityKeys,
      generatedAuthorityVariants: querySet.generatedAuthorityVariants.slice(0, MAX_DIAGNOSTIC_ITEMS),
      domainHints: querySet.domainHints
    },
    retrievalDiagnostics,
    retrievalMeta: {
      retrievalEngineVersion: ENGINE_VERSION,
      adaptiveMode,
      allowReviewMaterials,
      topK,
      poolK,
      candidateCount: candidates.length,
      prefilteredCount: prefiltered.docs.length,
      scoredCount: scored.length,
      returnedCount: sanitized.length,
      layeredRetrievalApplied: true,
      retrievalLayers: Object.values(RETRIEVAL_LAYER),
      supabaseFallbackEnabled: true,
      indexedSourcePreferred: true,
      masterPromptAuthorityHierarchyApplied: true,
      courtAuthorityNotSubordinatedToBIRIssuances: true,
      reviewerSourcesExcludedUnlessReviewMode: !allowReviewMaterials,
      rawFullDocumentInjectionPrevented: true,
      noFabricatedAuthorities: true,
      broadBeforeRerank: true,
      issueClassificationMatchPreserved: true,
      weakMatchesPreservedUntilScoring: true
    },
    missingIndexedAuthority:
      sanitized.length === 0
        ? "Indexed source not found."
        : null
  };
}

async function retrieveSources(options = {}) {
  return retrieveRelevantSources(options);
}

async function runRetrieval(options = {}) {
  return retrieveRelevantSources(options);
}

async function retrieveForTina(options = {}) {
  return retrieveRelevantSources(options);
}

async function retrieveForQuestion(options = {}) {
  return retrieveRelevantSources(options);
}

async function runRetrievalEngine(options = {}) {
  return retrieveRelevantSources(options);
}

async function getRelevantSources(options = {}) {
  return retrieveRelevantSources(options);
}

async function searchRelevantSources(options = {}) {
  return retrieveRelevantSources(options);
}

async function retrievalEngine(options = {}) {
  return retrieveRelevantSources(options);
}

export {
  ENGINE_VERSION,
  DEFAULT_TOP_K,
  DEFAULT_POOL_K,
  RETRIEVAL_LAYER,

  normalizeMode,
  isReviewMode,
  normalizeIssue,
  normalizeAuthority,
  normalizeAuthorityCitation,
  generateAuthorityVariants,
  normalizeTargetAuthorities,

  buildTaxDomainSearchHints,
  buildRetrievalQuerySet,

  detectIssueType,
  detectDocIssueType,

  computeRetrievalScore,
  sanitizeRetrievedSource,
  buildSearchQueries,
  safeIssueClassification,

  retrieveRelevantSources,
  retrieveSources,
  runRetrieval,
  retrieveForTina,
  retrieveForQuestion,
  runRetrievalEngine,
  getRelevantSources,
  searchRelevantSources,
  retrievalEngine
};

export default {
  ENGINE_VERSION,
  DEFAULT_TOP_K,
  DEFAULT_POOL_K,
  RETRIEVAL_LAYER,

  normalizeMode,
  isReviewMode,
  normalizeIssue,
  normalizeAuthority,
  normalizeAuthorityCitation,
  generateAuthorityVariants,
  normalizeTargetAuthorities,

  buildTaxDomainSearchHints,
  buildRetrievalQuerySet,

  detectIssueType,
  detectDocIssueType,

  computeRetrievalScore,
  sanitizeRetrievedSource,
  buildSearchQueries,
  safeIssueClassification,

  retrieveRelevantSources,
  retrieveSources,
  runRetrieval,
  retrieveForTina,
  retrieveForQuestion,
  runRetrievalEngine,
  getRelevantSources,
  searchRelevantSources,
  retrievalEngine
};
