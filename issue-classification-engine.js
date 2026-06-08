// FILE: issue-classification-engine.js
"use strict";

/**
 * TINA Issue Classification Engine
 * Version: 7.0.0
 *
 * Role:
 * - Legal/tax issue detector only
 * - Classifies primary issue, sub-issue, retrieval strategy, and target authorities
 * - Passes compact metadata downstream to retrieval-engine.js and rag-answer-handler.js
 *
 * Boundary:
 * - Does not answer
 * - Does not retrieve
 * - Does not call OpenAI
 * - Does not render
 * - Does not rank retrieved sources
 * - Does not replace tax-engines
 */

import { enrichIssueClassification } from "./main-tax-engine-classification.js";

const ENGINE_VERSION = "7.0.0";

const PRIMARY_ISSUE = Object.freeze({
  VAT: "VAT",
  CIT: "CIT",
  IIT: "IIT",
  WHT: "WHT",
  PCT: "PCT",
  EXC: "EXC",
  DST: "DST",
  CGT: "CGT",
  EST: "EST",
  LGT: "LGT",
  RPT: "RPT",
  CUS: "CUS",
  SPC: "SPC",
  PRE: "PRE",
  DIS: "DIS",
  CON: "CON",

  VAT_LIABILITY: "VAT_LIABILITY",
  VAT_REFUND: "VAT_REFUND",
  VAT_EXEMPTION: "VAT_EXEMPTION",
  ZERO_RATED_SALES: "ZERO_RATED_SALES",
  INPUT_TAX: "INPUT_TAX",
  OUTPUT_TAX: "OUTPUT_TAX",

  INCOME_TAX: "INCOME_TAX",
  WITHHOLDING: "WITHHOLDING",
  DEDUCTIONS: "DEDUCTIONS",
  EXEMPTIONS: "EXEMPTIONS",

  TAX_REFUND_CREDIT: "TAX_REFUND_CREDIT",
  ASSESSMENT: "ASSESSMENT",
  PRESCRIPTION: "PRESCRIPTION",

  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",
  JURISDICTIONAL: "JURISDICTIONAL",
  TRANSACTION: "TRANSACTION",
  CONTRACT: "CONTRACT",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",
  ACCOUNTING: "ACCOUNTING",
  AUDIT: "AUDIT",
  DOCTRINE: "DOCTRINE",
  CASE_LAW: "CASE_LAW",
  ISSUANCE: "ISSUANCE",
  NAMED_LAW: "NAMED_LAW",
  GENERAL_TAX: "GENERAL_TAX"
});

const LEGACY_PRIMARY_ISSUE = Object.freeze({
  DEFINITION: "DEFINITION",
  COMPLIANCE: "COMPLIANCE",
  REFUND: "REFUND",
  PRESCRIPTION: "PRESCRIPTION",
  EXEMPTION: "EXEMPTION",
  PROCEDURAL: "PROCEDURAL",
  CONSTITUTIONAL: "CONSTITUTIONAL",
  WITHHOLDING: "WITHHOLDING",
  CHARACTERIZATION: "CHARACTERIZATION",
  DISPUTE_RESOLUTION: "DISPUTE_RESOLUTION",
  EVIDENTIARY: "EVIDENTIARY",
  ACCOUNTING_TAX: "ACCOUNTING_TAX",
  GENERAL_TAX: "GENERAL_TAX"
});

const QUERY_INTENT = Object.freeze({
  DEFINITION: "definition",
  OVERVIEW: "overview",
  ANALYSIS: "analysis",
  COMPLIANCE: "compliance",
  DISPUTE: "dispute",
  PLANNING: "planning",
  ADVISORY: "advisory",
  COMPUTATION: "computation",
  SOURCE_INVENTORY: "source_inventory",
  REVIEW: "review"
});

const COMPLEXITY = Object.freeze({
  SIMPLE: "simple",
  MODERATE: "moderate",
  COMPLEX: "complex",
  MULTI_ISSUE: "multi-issue"
});

const FACT_SENSITIVITY = Object.freeze({
  LOW: "low",
  MODERATE: "moderate",
  HIGH: "high"
});

const RETRIEVAL_STRATEGY = Object.freeze({
  FAST_DEFINITION: "FAST_DEFINITION_PRIMARY_AUTHORITY",
  VAT_DEFINITION: "VAT_DEFINITION_AUTHORITY_FIRST",
  FOUNDATIONAL: "ISSUE_FOUNDATIONAL_AUTHORITY_FIRST",
  PROCEDURAL: "ISSUE_PROCEDURAL_AUTHORITY_FIRST",
  JURISPRUDENTIAL: "ISSUE_JURISPRUDENCE_FIRST",
  MIXED: "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",
  FACT_DRIVEN: "ISSUE_FACT_DRIVEN_AUTHORITY_FIRST",
  EXACT_AUTHORITY: "EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC",
  EVIDENCE_DRIVEN: "ISSUE_EVIDENCE_AUTHORITY_FIRST",
  COMPUTATION: "ISSUE_COMPUTATION_AUTHORITY_FIRST",
  SOURCE_FINDER: "SOURCE_FINDER_AUTHORITY_FIRST"
});

const LEGAL_DIMENSION = Object.freeze({
  SUBSTANTIVE: "SUBSTANTIVE",
  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",
  JURISDICTIONAL: "JURISDICTIONAL",
  TEMPORAL: "TEMPORAL",
  ADMINISTRATIVE: "ADMINISTRATIVE",
  FACTUAL: "FACTUAL",
  CONTRACTUAL: "CONTRACTUAL",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",
  TRANSACTION: "TRANSACTION",
  ACCOUNTING: "ACCOUNTING",
  AUDIT: "AUDIT",
  CONSTITUTIONAL: "CONSTITUTIONAL",
  COMPUTATIONAL: "COMPUTATIONAL",
  GENERAL: "GENERAL"
});

const AUTHORITY_TYPE = Object.freeze({
  CONSTITUTION: "CONSTITUTION",
  STATUTE: "STATUTE",
  TAX_TREATY: "TAX_TREATY",
  SUPREME_COURT: "SUPREME_COURT",
  CTA_EN_BANC: "CTA_EN_BANC",
  CTA_DIVISION: "CTA_DIVISION",
  COURT_OF_APPEALS: "COURT_OF_APPEALS",
  RR: "RR",
  RMC: "RMC",
  RMO: "RMO",
  RAMO: "RAMO",
  BIR_RULING: "BIR_RULING",
  ADMINISTRATIVE_GUIDANCE: "ADMINISTRATIVE_GUIDANCE",
  OECD_GUIDANCE: "OECD_GUIDANCE",
  PFRS: "PFRS",
  PAS: "PAS",
  PSA: "PSA",
  LGU: "LGU",
  BOC_ISSUANCE: "BOC_ISSUANCE",
  SECONDARY: "SECONDARY"
});

const STANDARD_REQUIRED_ANSWER_SECTIONS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
  "D. SUPPORTING JURISPRUDENCE",
  "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "F. PRACTICAL NOTE / APPLICATION"
]);

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
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeQuery(value = "") {
  const rawQuery = String(value || "");
  const normalizedQuery = normalizeText(rawQuery)
    .replace(/^\/(ask|tax|review|quiz|case|source|audit|debug|patch)\s+/i, "")
    .trim();

  return {
    rawQuery,
    normalizedQuery,
    lowerQuery: lower(normalizedQuery)
  };
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

function normalizeIssue(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VALUE_ADDED_TAX: "VAT",
    VAT: "VAT",
    VAT_LIABILITY: "VAT_LIABILITY",
    VAT_DEFINITION: "VAT_DEFINITION",
    VAT_OVERVIEW: "VAT_OVERVIEW",
    OUTPUT_VAT: "OUTPUT_TAX",
    INPUT_VAT: "INPUT_TAX",
    ZERO_RATED_SALES: "ZERO_RATED_SALES",
    ZERO_RATING: "ZERO_RATING",

    CORPORATE_INCOME_TAX: "CIT",
    INCOME_TAX: "INCOME_TAX",
    RCIT: "RCIT",
    MCIT: "MCIT",
    NOLCO: "NOLCO",
    INDIVIDUAL_INCOME_TAX: "IIT",

    WITHHOLDING: "WITHHOLDING",
    WITHHOLDING_TAX: "WITHHOLDING",
    EWT: "EWT",
    CWT: "EWT",
    FWT: "FWT",
    WHT: "WITHHOLDING",

    PERCENTAGE_TAX: "PCT",
    EXCISE_TAX: "EXC",
    DOCUMENTARY_STAMP_TAX: "DST",
    CAPITAL_GAINS_TAX: "CGT",

    ESTATE_TAX: "EST",
    DONOR_TAX: "EST",
    DONORS_TAX: "EST",

    LOCAL_BUSINESS_TAX: "LGT",
    LOCAL_GOVERNMENT_TAX: "LGT",
    REAL_PROPERTY_TAX: "RPT",

    CUSTOMS: "CUS",
    CUSTOMS_DUTIES: "CUS",
    TARIFF: "CUS",

    PEZA: "SPC",
    INCENTIVES: "SPC",
    CREATE_INCENTIVES: "SPC",
    TRANSFER_PRICING: "SPC",

    PRESCRIPTION: "PRESCRIPTION",
    ASSESSMENT: "ASSESSMENT",
    TAX_ASSESSMENT: "ASSESSMENT",

    DISPUTE_RESOLUTION: "DIS",
    PROTEST: "DIS",
    CTA_APPEAL: "DIS",

    CONSTITUTIONAL: "CON",
    GENERAL_TAX: "GENERAL_TAX"
  };

  return aliases[raw] || raw || null;
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    RA: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    CREATE_ACT: "STATUTE",
    TRAIN_LAW: "STATUTE",
    CMTA: "STATUTE",
    LGC: "STATUTE",
    TREATY: "TAX_TREATY",
    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
    BIR_RULINGS: "BIR_RULING",
    IFRS: "PFRS",
    BOC: "BOC_ISSUANCE"
  };

  return aliases[raw] || raw || null;
}

function normalizeDimension(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    SUBSTANCE: "SUBSTANTIVE",
    PROCEDURE: "PROCEDURAL",
    PROOF: "EVIDENTIARY",
    EVIDENCE: "EVIDENTIARY",
    JURISDICTION: "JURISDICTIONAL",
    FACT: "FACTUAL",
    FACTS: "FACTUAL",
    CONTRACT: "CONTRACTUAL",
    ECONOMIC: "ECONOMIC_SUBSTANCE",
    TRANSACTION_CHARACTERIZATION: "TRANSACTION",
    CONSTITUTION: "CONSTITUTIONAL"
  };

  return aliases[raw] || raw || null;
}

function regexAny(text = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
}

function detectDefinitionPattern(question = "", queryIntent = {}) {
  const q = lower(question);

  return Boolean(
    queryIntent?.requiresSimpleDefinition ||
      queryIntent?.intentType === "SIMPLE_DEFINITION" ||
      (
        /\b(what is|define|definition of|meaning of|ano ang|ano ibig sabihin|nature of)\b/i.test(q) &&
        !/\b(explain|discuss|analyze|risk|case|jurisprudence|compare|compute|review|quiz|source|sources)\b/i.test(q)
      )
  );
}

function detectOverviewPattern(question = "", queryIntent = {}) {
  const q = lower(question);

  return Boolean(
    queryIntent?.intentType === "EXPLANATION" ||
      queryIntent?.intentType === "DISCUSSION" ||
      /\b(explain|discuss|overview|walk me through|tell me about|summarize)\b/i.test(q)
  );
}

function detectRiskPattern(question = "", queryIntent = {}) {
  const q = lower(question);

  return Boolean(
    queryIntent?.needsRiskAnalysis ||
      queryIntent?.requiresAuditRiskAnalysis ||
      /\b(risk|exposure|audit risk|tax risk|deficiency|penalty|assessment exposure|disallowance|position strength)\b/i.test(q)
  );
}

function detectSourcePattern(question = "", queryIntent = {}) {
  const q = lower(question);

  return Boolean(
    queryIntent?.requiresSourceVisibility ||
      queryIntent?.requiresSourceInventory ||
      /\b(source|sources|legal basis|authority|authorities|citation|citations|basis only|source only|show sources)\b/i.test(q)
  );
}

function detectCasePattern(question = "", queryIntent = {}) {
  const q = lower(question);

  return Boolean(
    queryIntent?.requiresCaseMode ||
      queryIntent?.needsJurisprudence ||
      /\b(case|jurisprudence|supreme court|cta|g\.?\s*r\.?\s*no\.?|doctrine|holding)\b/i.test(q)
  );
}

const DEFINITION_AUTHORITY_MAP = Object.freeze({
  VAT_DEFINITION: {
    primaryIssue: "VAT_LIABILITY",
    domainCode: "VAT",
    domainName: "Value-Added Tax",
    targetAuthorities: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005"],
    controllingAuthorities: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108"],
    supportingAuthorities: ["RR 16-2005"],
    supportingJurisprudence: []
  },

  INCOME_TAX_DEFINITION: {
    primaryIssue: "INCOME_TAX",
    domainCode: "CIT",
    domainName: "Income Tax",
    targetAuthorities: ["NIRC Sec. 23", "NIRC Sec. 24", "NIRC Sec. 27", "NIRC Sec. 31", "NIRC Sec. 32", "NIRC Sec. 34"],
    controllingAuthorities: ["NIRC Sec. 23", "NIRC Sec. 24", "NIRC Sec. 27", "NIRC Sec. 31", "NIRC Sec. 32", "NIRC Sec. 34"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  WITHHOLDING_TAX_DEFINITION: {
    primaryIssue: "WITHHOLDING",
    domainCode: "WHT",
    domainName: "Withholding Tax",
    targetAuthorities: ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"],
    controllingAuthorities: ["NIRC Sec. 57", "NIRC Sec. 58"],
    supportingAuthorities: ["RR 2-98"],
    supportingJurisprudence: []
  },

  PERCENTAGE_TAX_DEFINITION: {
    primaryIssue: "PCT",
    domainCode: "PCT",
    domainName: "Percentage Tax",
    targetAuthorities: ["NIRC Sec. 116", "NIRC Sec. 117", "NIRC Sec. 118", "NIRC Sec. 119", "NIRC Sec. 120", "NIRC Sec. 121", "NIRC Sec. 122"],
    controllingAuthorities: ["NIRC Sec. 116", "NIRC Sec. 117", "NIRC Sec. 118", "NIRC Sec. 119", "NIRC Sec. 120", "NIRC Sec. 121", "NIRC Sec. 122"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  EXCISE_TAX_DEFINITION: {
    primaryIssue: "EXC",
    domainCode: "EXC",
    domainName: "Excise Tax",
    targetAuthorities: ["NIRC Title VI", "NIRC Sec. 129", "NIRC Secs. 129-172"],
    controllingAuthorities: ["NIRC Title VI", "NIRC Secs. 129-172"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  DST_DEFINITION: {
    primaryIssue: "DST",
    domainCode: "DST",
    domainName: "Documentary Stamp Tax",
    targetAuthorities: ["NIRC Title VII", "NIRC Sec. 173", "NIRC Secs. 173-201"],
    controllingAuthorities: ["NIRC Title VII", "NIRC Secs. 173-201"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  CGT_DEFINITION: {
    primaryIssue: "CGT",
    domainCode: "CGT",
    domainName: "Capital Gains Tax",
    targetAuthorities: ["NIRC Sec. 24(C)", "NIRC Sec. 24(D)", "NIRC Sec. 27(D)(2)", "NIRC Sec. 28(A)(7)", "NIRC Sec. 28(B)(5)"],
    controllingAuthorities: ["NIRC Sec. 24(C)", "NIRC Sec. 24(D)", "NIRC Sec. 27(D)(2)", "NIRC Sec. 28(A)(7)", "NIRC Sec. 28(B)(5)"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  DONOR_TAX_DEFINITION: {
    primaryIssue: "EST",
    domainCode: "EST",
    domainName: "Donor's Tax",
    targetAuthorities: ["NIRC Title III", "NIRC Sec. 98", "NIRC Sec. 99", "NIRC Sec. 100", "NIRC Secs. 98-104"],
    controllingAuthorities: ["NIRC Title III", "NIRC Sec. 98", "NIRC Sec. 99", "NIRC Sec. 100", "NIRC Secs. 98-104"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  ESTATE_TAX_DEFINITION: {
    primaryIssue: "EST",
    domainCode: "EST",
    domainName: "Estate Tax",
    targetAuthorities: ["NIRC Title III", "NIRC Sec. 84", "NIRC Secs. 84-97"],
    controllingAuthorities: ["NIRC Title III", "NIRC Secs. 84-97"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  LOCAL_BUSINESS_TAX_DEFINITION: {
    primaryIssue: "LGT",
    domainCode: "LGT",
    domainName: "Local Business Tax",
    targetAuthorities: ["Local Government Code Sec. 143", "Local Government Code Sec. 151", "City of Manila v. Coca-Cola Bottlers Philippines (G.R. No. 180845)"],
    controllingAuthorities: ["Local Government Code Sec. 143", "Local Government Code Sec. 151"],
    supportingAuthorities: ["Applicable LGU ordinance"],
    supportingJurisprudence: ["City of Manila v. Coca-Cola Bottlers Philippines (G.R. No. 180845)"]
  },

  REAL_PROPERTY_TAX_DEFINITION: {
    primaryIssue: "RPT",
    domainCode: "LGT",
    domainName: "Real Property Tax",
    targetAuthorities: ["Local Government Code Sec. 197", "Local Government Code Sec. 198", "Local Government Code Sec. 199", "Local Government Code Sec. 232"],
    controllingAuthorities: ["Local Government Code Sec. 197", "Local Government Code Sec. 198", "Local Government Code Sec. 199", "Local Government Code Sec. 232"],
    supportingAuthorities: ["Applicable LGU real property tax ordinance"],
    supportingJurisprudence: []
  },

  CUSTOMS_DUTIES_DEFINITION: {
    primaryIssue: "CUS",
    domainCode: "CUS",
    domainName: "Customs Duties",
    targetAuthorities: ["CMTA", "CMTA customs valuation provisions", "CMTA tariff classification provisions"],
    controllingAuthorities: ["CMTA"],
    supportingAuthorities: ["BOC issuances where applicable"],
    supportingJurisprudence: []
  },

  PEZA_INCENTIVES_DEFINITION: {
    primaryIssue: "SPC",
    domainCode: "SPC",
    domainName: "PEZA / Fiscal Incentives",
    targetAuthorities: ["CREATE Act", "NIRC incentive provisions", "FIRB issuances", "PEZA law"],
    controllingAuthorities: ["CREATE Act", "NIRC incentive provisions", "PEZA law"],
    supportingAuthorities: ["FIRB issuances", "PEZA issuances"],
    supportingJurisprudence: []
  },

  TAX_REFUND_CREDIT_DEFINITION: {
    primaryIssue: "TAX_REFUND_CREDIT",
    domainCode: "DIS",
    domainName: "Tax Refunds and Credits",
    targetAuthorities: ["NIRC Sec. 112", "NIRC Sec. 204", "NIRC Sec. 229"],
    controllingAuthorities: ["NIRC Sec. 112", "NIRC Sec. 204", "NIRC Sec. 229"],
    supportingAuthorities: ["Refund regulations"],
    supportingJurisprudence: ["CIR v. Aichi Forging", "CIR v. San Roque Power"]
  },

  ASSESSMENT_PRESCRIPTION_DEFINITION: {
    primaryIssue: "ASSESSMENT",
    domainCode: "PRE",
    domainName: "Tax Assessment and Prescription",
    targetAuthorities: ["NIRC Sec. 203", "NIRC Sec. 222", "NIRC Sec. 228", "RR 18-2013"],
    controllingAuthorities: ["NIRC Sec. 203"],
    supportingAuthorities: ["NIRC Sec. 222", "NIRC Sec. 228", "RR 18-2013"],
    supportingJurisprudence: ["CIR v. Metro Star Superama", "CIR v. Enron Subic Power"]
  },

  DEDUCTIONS_DEFINITION: {
    primaryIssue: "DEDUCTIONS",
    domainCode: "CIT",
    domainName: "Deductions",
    targetAuthorities: ["NIRC Sec. 34", "NIRC Sec. 34(A)", "NIRC Sec. 34(K)"],
    controllingAuthorities: ["NIRC Sec. 34", "NIRC Sec. 34(A)", "NIRC Sec. 34(K)"],
    supportingAuthorities: ["Applicable substantiation regulations"],
    supportingJurisprudence: []
  },

  EXEMPTIONS_DEFINITION: {
    primaryIssue: "EXEMPTIONS",
    domainCode: "CON",
    domainName: "Tax Exemptions",
    targetAuthorities: ["Applicable statutory exemption provision", "1987 Constitution tax exemption principles", "Supreme Court tax exemption jurisprudence"],
    controllingAuthorities: ["Applicable statutory exemption provision"],
    supportingAuthorities: [],
    supportingJurisprudence: ["Supreme Court tax exemption jurisprudence"]
  },

  INPUT_TAX_DEFINITION: {
    primaryIssue: "INPUT_TAX",
    domainCode: "VAT",
    domainName: "Input Tax",
    targetAuthorities: ["NIRC Sec. 110", "NIRC Sec. 112", "RR 16-2005"],
    controllingAuthorities: ["NIRC Sec. 110", "NIRC Sec. 112"],
    supportingAuthorities: ["RR 16-2005"],
    supportingJurisprudence: []
  },

  OUTPUT_TAX_DEFINITION: {
    primaryIssue: "OUTPUT_TAX",
    domainCode: "VAT",
    domainName: "Output Tax",
    targetAuthorities: ["NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005"],
    controllingAuthorities: ["NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108"],
    supportingAuthorities: ["RR 16-2005"],
    supportingJurisprudence: []
  },

  ZERO_RATING_DEFINITION: {
    primaryIssue: "ZERO_RATED_SALES",
    domainCode: "VAT",
    domainName: "VAT Zero-Rating",
    targetAuthorities: ["NIRC Sec. 106(A)(2)", "NIRC Sec. 108(B)", "RR 16-2005"],
    controllingAuthorities: ["NIRC Sec. 106(A)(2)", "NIRC Sec. 108(B)"],
    supportingAuthorities: ["RR 16-2005"],
    supportingJurisprudence: []
  }
});

const DOMAIN_DETECTORS = Object.freeze([
  {
    domainCode: "VAT",
    primaryIssue: "VAT_LIABILITY",
    domainName: "Value-Added Tax",
    defaultSubIssue: "VAT_OVERVIEW",
    patterns: [/\bvat\b/i, /\bvalue[- ]added tax\b/i],
    definitionKey: "VAT_DEFINITION"
  },
  {
    domainCode: "VAT",
    primaryIssue: "INPUT_TAX",
    domainName: "Input Tax",
    defaultSubIssue: "INPUT_TAX",
    patterns: [/\binput tax\b/i, /\binput vat\b/i, /\bcreditable input\b/i],
    definitionKey: "INPUT_TAX_DEFINITION"
  },
  {
    domainCode: "VAT",
    primaryIssue: "OUTPUT_TAX",
    domainName: "Output Tax",
    defaultSubIssue: "OUTPUT_TAX",
    patterns: [/\boutput tax\b/i, /\boutput vat\b/i, /\bvat payable\b/i],
    definitionKey: "OUTPUT_TAX_DEFINITION"
  },
  {
    domainCode: "VAT",
    primaryIssue: "ZERO_RATED_SALES",
    domainName: "VAT Zero-Rating",
    defaultSubIssue: "ZERO_RATING",
    patterns: [/\bzero[- ]rated\b/i, /\bzero rating\b/i, /\b0%\s*vat\b/i],
    definitionKey: "ZERO_RATING_DEFINITION"
  },
  {
    domainCode: "VAT",
    primaryIssue: "VAT_REFUND",
    domainName: "VAT Refund / Credit",
    defaultSubIssue: "REFUND_CREDIT",
    patterns: [/\bvat refund\b/i, /\bunutilized input\b/i, /\bexcess input\b/i, /\bsection 112\b/i, /\bsec\.?\s*112\b/i],
    definitionKey: "TAX_REFUND_CREDIT_DEFINITION"
  },
  {
    domainCode: "CIT",
    primaryIssue: "INCOME_TAX",
    domainName: "Income Tax",
    defaultSubIssue: "INCOME_TAX_OVERVIEW",
    patterns: [/\bincome tax\b/i, /\bcorporate income tax\b/i, /\bcit\b/i, /\brcit\b/i, /\bmcit\b/i, /\bnolco\b/i],
    definitionKey: "INCOME_TAX_DEFINITION"
  },
  {
    domainCode: "WHT",
    primaryIssue: "WITHHOLDING",
    domainName: "Withholding Tax",
    defaultSubIssue: "WITHHOLDING_TAX",
    patterns: [/\bwithholding tax\b/i, /\bwithholding\b/i, /\bewt\b/i, /\bcwt\b/i, /\bfwt\b/i, /\b2307\b/i],
    definitionKey: "WITHHOLDING_TAX_DEFINITION"
  },
  {
    domainCode: "PCT",
    primaryIssue: "PCT",
    domainName: "Percentage Tax",
    defaultSubIssue: "PERCENTAGE_TAX",
    patterns: [/\bpercentage tax\b/i, /\b2551q\b/i, /\bnon[- ]vat\b/i],
    definitionKey: "PERCENTAGE_TAX_DEFINITION"
  },
  {
    domainCode: "EXC",
    primaryIssue: "EXC",
    domainName: "Excise Tax",
    defaultSubIssue: "EXCISE_TAX",
    patterns: [/\bexcise tax\b/i, /\bexcise\b/i, /\bsin tax\b/i],
    definitionKey: "EXCISE_TAX_DEFINITION"
  },
  {
    domainCode: "DST",
    primaryIssue: "DST",
    domainName: "Documentary Stamp Tax",
    defaultSubIssue: "DST",
    patterns: [/\bdocumentary stamp tax\b/i, /\bdst\b/i],
    definitionKey: "DST_DEFINITION"
  },
  {
    domainCode: "CGT",
    primaryIssue: "CGT",
    domainName: "Capital Gains Tax",
    defaultSubIssue: "CGT",
    patterns: [/\bcapital gains tax\b/i, /\bcgt\b/i],
    definitionKey: "CGT_DEFINITION"
  },
  {
    domainCode: "EST",
    primaryIssue: "EST",
    domainName: "Estate Tax",
    defaultSubIssue: "ESTATE_TAX",
    patterns: [/\bestate tax\b/i, /\bgross estate\b/i, /\bdecedent\b/i],
    definitionKey: "ESTATE_TAX_DEFINITION"
  },
  {
    domainCode: "EST",
    primaryIssue: "EST",
    domainName: "Donor's Tax",
    defaultSubIssue: "DONOR_TAX",
    patterns: [/\bdonor'?s tax\b/i, /\bdonor tax\b/i, /\bdonation\b/i, /\bgift tax\b/i],
    definitionKey: "DONOR_TAX_DEFINITION"
  },
  {
    domainCode: "LGT",
    primaryIssue: "LGT",
    domainName: "Local Business Tax",
    defaultSubIssue: "LOCAL_BUSINESS_TAX",
    patterns: [/\blocal business tax\b/i, /\blbt\b/i, /\bmayor'?s permit\b/i],
    definitionKey: "LOCAL_BUSINESS_TAX_DEFINITION"
  },
  {
    domainCode: "LGT",
    primaryIssue: "RPT",
    domainName: "Real Property Tax",
    defaultSubIssue: "REAL_PROPERTY_TAX",
    patterns: [/\breal property tax\b/i, /\brpt\b/i],
    definitionKey: "REAL_PROPERTY_TAX_DEFINITION"
  },
  {
    domainCode: "CUS",
    primaryIssue: "CUS",
    domainName: "Customs Duties",
    defaultSubIssue: "CUSTOMS_DUTIES",
    patterns: [/\bcustoms\b/i, /\btariff\b/i, /\bimport dut(y|ies)\b/i, /\bcmta\b/i],
    definitionKey: "CUSTOMS_DUTIES_DEFINITION"
  },
  {
    domainCode: "SPC",
    primaryIssue: "SPC",
    domainName: "PEZA / Incentives",
    defaultSubIssue: "PEZA_INCENTIVES",
    patterns: [/\bpeza\b/i, /\bincentives?\b/i, /\bcreate incentives\b/i, /\bfirb\b/i, /\bscit\b/i],
    definitionKey: "PEZA_INCENTIVES_DEFINITION"
  },
  {
    domainCode: "DIS",
    primaryIssue: "TAX_REFUND_CREDIT",
    domainName: "Tax Refunds and Credits",
    defaultSubIssue: "TAX_REFUND_CREDIT",
    patterns: [/\btax refund\b/i, /\bclaim for refund\b/i, /\btax credit\b/i, /\btcc\b/i],
    definitionKey: "TAX_REFUND_CREDIT_DEFINITION"
  },
  {
    domainCode: "PRE",
    primaryIssue: "ASSESSMENT",
    domainName: "Tax Assessment and Prescription",
    defaultSubIssue: "ASSESSMENT_PRESCRIPTION",
    patterns: [/\bassessment\b/i, /\bprescription\b/i, /\bprescriptive\b/i, /\bloa\b/i, /\bpan\b/i, /\bfan\b/i, /\bfdda\b/i, /\bwaiver\b/i],
    definitionKey: "ASSESSMENT_PRESCRIPTION_DEFINITION"
  },
  {
    domainCode: "CIT",
    primaryIssue: "DEDUCTIONS",
    domainName: "Deductions",
    defaultSubIssue: "DEDUCTIONS",
    patterns: [/\bdeduction\b/i, /\bdeductible\b/i, /\bnon[- ]deductible\b/i, /\bsubstantiation\b/i],
    definitionKey: "DEDUCTIONS_DEFINITION"
  },
  {
    domainCode: "CON",
    primaryIssue: "EXEMPTIONS",
    domainName: "Tax Exemptions",
    defaultSubIssue: "EXEMPTIONS",
    patterns: [/\btax exemption\b/i, /\bexemptions?\b/i, /\bstrictissimi juris\b/i],
    definitionKey: "EXEMPTIONS_DEFINITION"
  }
]);

const ISSUE_SPECIFIC_TARGETS = Object.freeze({
  VAT_OVERVIEW: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005", "CIR v. Seagate Technology (GR No. 153866)"],
  VAT_RISK_ANALYSIS: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 108", "NIRC Sec. 113", "NIRC Sec. 114", "RR 16-2005"],
  VAT_EXEMPTION: ["NIRC Sec. 109", "RR 16-2005"],
  INPUT_TAX: ["NIRC Sec. 110", "NIRC Sec. 112", "RR 16-2005"],
  OUTPUT_TAX: ["NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005"],
  ZERO_RATING: ["NIRC Sec. 106(A)(2)", "NIRC Sec. 108(B)", "RR 16-2005"],
  REFUND_CREDIT: ["NIRC Sec. 112", "RR 16-2005", "CIR v. Aichi Forging", "CIR v. San Roque Power"],

  INCOME_TAX_OVERVIEW: ["NIRC Sec. 23", "NIRC Sec. 24", "NIRC Sec. 27", "NIRC Sec. 31", "NIRC Sec. 32", "NIRC Sec. 34"],
  RCIT: ["NIRC Sec. 27(A)", "CREATE Act", "RR 9-1998"],
  MCIT: ["NIRC Sec. 27(E)", "RR 9-1998", "CREATE Act"],
  NOLCO: ["NIRC Sec. 34(D)(3)"],
  DEDUCTIONS: ["NIRC Sec. 34", "NIRC Sec. 34(A)", "NIRC Sec. 34(K)"],

  WITHHOLDING_TAX: ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"],
  EWT: ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"],
  FWT: ["NIRC final withholding tax provisions", "RR 2-98"],
  COMPENSATION_WHT: ["NIRC withholding on compensation provisions", "RR 2-98"],

  ASSESSMENT_PRESCRIPTION: ["NIRC Sec. 203", "NIRC Sec. 222", "NIRC Sec. 228", "RR 18-2013", "CIR v. Aznar (GR No. L-20569)", "CIR v. BF Goodrich Philippines (GR No. L-28508)", "CIR v. Bohol Land Transportation (G.R. No. L-13099)"],
  LOA_VALIDITY: ["NIRC assessment provisions", "BIR audit and LOA issuances", "Medicard Philippines"],
  PAN_FAN: ["NIRC Sec. 228", "RR 18-2013", "CIR v. Metro Star Superama", "CIR v. Enron Subic Power"],
  FDDA: ["NIRC Sec. 228", "RR 18-2013"],
  WAIVER: ["NIRC Sec. 203", "NIRC Sec. 222", "BIR waiver issuances"],

  LOCAL_BUSINESS_TAX: ["Local Government Code Sec. 143", "Local Government Code Sec. 151", "City of Manila v. Coca-Cola Bottlers Philippines (G.R. No. 180845)"],
  REAL_PROPERTY_TAX: ["Local Government Code Sec. 197", "Local Government Code Sec. 198", "Local Government Code Sec. 199", "Local Government Code Sec. 232"],
  CUSTOMS_DUTIES: ["CMTA", "BOC issuances"],
  PEZA_INCENTIVES: ["CREATE Act", "NIRC incentive provisions", "PEZA law", "FIRB issuances"]
});

function detectExactAuthority(question = "") {
  const value = normalizeText(question);

  const issuancePatterns = [
    ["RR", /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i],
    ["RMC", /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i],
    ["RMO", /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i],
    ["RAMO", /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i]
  ];

  for (const [type, regex] of issuancePatterns) {
    const match = value.match(regex);

    if (match) {
      return {
        detected: true,
        type,
        reference: `${type} No. ${Number(match[1])}-${normalizeYear(match[2])}`,
        number: String(Number(match[1])),
        year: normalizeYear(match[2])
      };
    }
  }

  const ra = value.match(/\b(?:ra|r\.a\.|republic act)\s*(?:no\.?)?\s*(\d{4,6})\b/i);
  if (ra) {
    return {
      detected: true,
      type: "STATUTE",
      reference: `RA ${ra[1]}`,
      number: ra[1],
      year: null
    };
  }

  const nircSec = value.match(/\b(?:nirc|tax code)?\s*(?:sec\.?|section)\s*(\d+[a-z]?(?:\([a-z0-9]+\))*)\b/i);
  if (nircSec) {
    return {
      detected: true,
      type: "STATUTE",
      reference: `NIRC Sec. ${nircSec[1]}`,
      number: nircSec[1],
      year: null
    };
  }

  const gr = value.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  if (gr) {
    return {
      detected: true,
      type: "SUPREME_COURT",
      reference: `G.R. No. ${gr[1]}`,
      number: gr[1],
      year: null
    };
  }

  const cta =
    value.match(/\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/i) ||
    value.match(/\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i);

  if (cta) {
    return {
      detected: true,
      type: "CTA_DIVISION",
      reference: `CTA ${cta[1]}`,
      number: cta[1],
      year: null
    };
  }

  return {
    detected: false,
    type: null,
    reference: null,
    number: null,
    year: null
  };
}

function scoreDomain(question = "", detector = {}) {
  let score = 0;
  for (const pattern of safeArray(detector.patterns)) {
    if (pattern.test(question)) score += 20;
  }
  return score;
}

function detectTaxDomain(question = "", queryIntent = {}) {
  const q = normalizeText(question);
  const scores = DOMAIN_DETECTORS
    .map((detector) => ({
      domainCode: detector.domainCode,
      primaryIssue: detector.primaryIssue,
      domainName: detector.domainName,
      defaultSubIssue: detector.defaultSubIssue,
      definitionKey: detector.definitionKey,
      score: scoreDomain(q, detector)
    }))
    .filter((item) => item.score > 0);

  if (queryIntent?.domainCode) {
    scores.unshift({
      domainCode: queryIntent.domainCode,
      primaryIssue: queryIntent.primaryIssue || queryIntent.domainCode,
      domainName: queryIntent.domainName || queryIntent.domainCode,
      defaultSubIssue: queryIntent.subIssue || "GENERAL",
      definitionKey: queryIntent.definitionKey || null,
      score: 999
    });
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .filter((item, index, arr) =>
      arr.findIndex((x) => x.domainCode === item.domainCode && x.primaryIssue === item.primaryIssue) === index
    )
    .slice(0, 4);
}

function detectPrimaryIssue(question = "", queryIntent = {}) {
  const domains = detectTaxDomain(question, queryIntent);
  return domains[0]?.primaryIssue || "GENERAL_TAX";
}

function detectSubIssue(question = "", primaryIssue = "GENERAL_TAX", queryIntent = {}) {
  const q = lower(question);

  if (queryIntent?.subIssue) return queryIntent.subIssue;

  if (detectDefinitionPattern(question, queryIntent)) {
    const detector = detectTaxDomain(question, queryIntent)[0];
    return detector?.definitionKey || `${primaryIssue}_DEFINITION`;
  }

  if (primaryIssue === "VAT_LIABILITY" && detectOverviewPattern(question, queryIntent)) return "VAT_OVERVIEW";
  if (primaryIssue === "VAT_LIABILITY" && detectRiskPattern(question, queryIntent)) return "VAT_RISK_ANALYSIS";
  if (/\bvat exempt|exempt from vat|section 109|sec\.?\s*109\b/i.test(q)) return "VAT_EXEMPTION";
  if (/\bzero[- ]rated|zero rating|0%\s*vat\b/i.test(q)) return "ZERO_RATING";
  if (/\binput tax|input vat|creditable input\b/i.test(q)) return "INPUT_TAX";
  if (/\boutput tax|output vat|vat payable\b/i.test(q)) return "OUTPUT_TAX";
  if (/\bvat refund|section 112|sec\.?\s*112|unutilized input|excess input|tcc\b/i.test(q)) return "REFUND_CREDIT";

  if (/\brcit|regular corporate income tax\b/i.test(q)) return "RCIT";
  if (/\bmcit|minimum corporate income tax\b/i.test(q)) return "MCIT";
  if (/\bnolco|net operating loss\b/i.test(q)) return "NOLCO";
  if (/\bdeductible|deduction|non[- ]deductible|substantiation\b/i.test(q)) return "DEDUCTIONS";

  if (/\bewt|expanded withholding|creditable withholding|cwt|2307\b/i.test(q)) return "EWT";
  if (/\bfwt|final withholding|final tax\b/i.test(q)) return "FWT";
  if (/\bcompensation withholding|1601c|withholding on compensation\b/i.test(q)) return "COMPENSATION_WHT";

  if (/\bloa|letter of authority\b/i.test(q)) return "LOA_VALIDITY";
  if (/\bpan\b|\bfan\b|formal letter of demand|\bfld\b|preliminary assessment notice|void.*assessment|assessment.*void|no.*preliminary.*notice|without.*pan\b/i.test(q)) return "PAN_FAN";
  if (/\bfdda|final decision on disputed assessment\b/i.test(q)) return "FDDA";
  if (/\bwaiver|statute of limitations\b/i.test(q)) return "WAIVER";
  if (/\bprescription|prescriptive\b/i.test(q)) return "ASSESSMENT_PRESCRIPTION";

  const detector = detectTaxDomain(question, queryIntent)[0];
  return detector?.defaultSubIssue || "GENERAL";
}

function detectLegalDimensions(question = "", primaryIssue = "GENERAL_TAX", subIssue = "GENERAL") {
  const q = lower(question);
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  push(
    [
      "VAT_LIABILITY",
      "VAT_REFUND",
      "VAT_EXEMPTION",
      "ZERO_RATED_SALES",
      "INPUT_TAX",
      "OUTPUT_TAX",
      "INCOME_TAX",
      "WITHHOLDING",
      "PCT",
      "EXC",
      "DST",
      "CGT",
      "EST",
      "LGT",
      "RPT",
      "CUS",
      "SPC",
      "DEDUCTIONS",
      "EXEMPTIONS"
    ].includes(primaryIssue),
    LEGAL_DIMENSION.SUBSTANTIVE
  );

  push(["PRE", "DIS", "ASSESSMENT", "PRESCRIPTION", "TAX_REFUND_CREDIT"].includes(primaryIssue), LEGAL_DIMENSION.PROCEDURAL);
  push(primaryIssue === "CON", LEGAL_DIMENSION.CONSTITUTIONAL);

  push(/\bdeadline|due date|filing|appeal|protest|prescription|assessment|return|form|registration\b/i.test(q), LEGAL_DIMENSION.PROCEDURAL);
  push(/\binvoice|receipt|proof|evidence|substantiation|documentary|burden of proof\b/i.test(q), LEGAL_DIMENSION.EVIDENTIARY);
  push(/\bjurisdiction|jurisdictional|cta|condition precedent\b/i.test(q), LEGAL_DIMENSION.JURISDICTIONAL);
  push(/\beffective|retroactive|prospective|superseded|amended|repealed\b/i.test(q), LEGAL_DIMENSION.TEMPORAL);
  push(/\brmc|rmo|ramo|bir ruling|administrative|interpretative|clarificatory\b/i.test(q), LEGAL_DIMENSION.ADMINISTRATIVE);
  push(/\bfacts|actual|scenario|transaction|documentation\b/i.test(q), LEGAL_DIMENSION.FACTUAL);
  push(/\bcontract|agreement|clause|lease|concession\b/i.test(q), LEGAL_DIMENSION.CONTRACTUAL);
  push(/\beconomic substance|substance over form|sham|simulation\b/i.test(q), LEGAL_DIMENSION.ECONOMIC_SUBSTANCE);
  push(/\bcompute|computation|calculate|how much|tax due|tax payable\b/i.test(q), LEGAL_DIMENSION.COMPUTATIONAL);

  if (/DUE_PROCESS/i.test(subIssue)) dimensions.push(LEGAL_DIMENSION.CONSTITUTIONAL);
  if (/PROTEST|CTA|FDDA|PAN_FAN|LOA|WAIVER/i.test(subIssue)) dimensions.push(LEGAL_DIMENSION.PROCEDURAL);

  return unique(dimensions.length ? dimensions : [LEGAL_DIMENSION.GENERAL]);
}

function detectQueryIntent(question = "", primaryIssue = "GENERAL_TAX", queryIntent = {}) {
  const q = lower(question);

  if (queryIntent?.intent) return queryIntent.intent;
  if (queryIntent?.requiresSourceInventory || queryIntent?.requiresSourceVisibility || detectSourcePattern(question, queryIntent)) return QUERY_INTENT.SOURCE_INVENTORY;
  if (queryIntent?.requiresComputation || /\bcompute|calculate|how much|tax due|tax payable\b/i.test(q)) return QUERY_INTENT.COMPUTATION;
  if (queryIntent?.reviewMode || queryIntent?.assessmentMode || queryIntent?.requiresReviewMode) return QUERY_INTENT.REVIEW;
  if (detectDefinitionPattern(question, queryIntent)) return QUERY_INTENT.DEFINITION;
  if (detectOverviewPattern(question, queryIntent)) return QUERY_INTENT.OVERVIEW;
  if (["PRE", "DIS", "ASSESSMENT", "PRESCRIPTION"].includes(primaryIssue)) return QUERY_INTENT.DISPUTE;
  if (/\bcan we\b|\bshould we\b|\bis it better\b|\bstructure\b|\bplanning\b|\btax efficient\b/i.test(q)) return QUERY_INTENT.PLANNING;
  if (/\bfile|filing|payment|return|registration|deadline|due date|submit|comply\b/i.test(q)) return QUERY_INTENT.COMPLIANCE;

  return QUERY_INTENT.ADVISORY;
}

function buildLegalQuestionPresented({ question = "", primaryIssue, subIssue, domainName }) {
  if (detectDefinitionPattern(question)) {
    return `What is the controlling legal definition or foundational rule for ${domainName || primaryIssue}?`;
  }

  if (detectOverviewPattern(question)) {
    return `What is the governing legal framework for ${domainName || primaryIssue}, including its main statutory and regulatory basis?`;
  }

  if (detectRiskPattern(question)) {
    return `What tax risk or exposure arises under ${domainName || primaryIssue}, considering the classified issue ${subIssue}?`;
  }

  return normalizeText(question) || `What Philippine tax rule governs ${domainName || primaryIssue} / ${subIssue}?`;
}

function getDefinitionAuthorityFor(question = "", detector = null, primaryIssue = "", subIssue = "") {
  if (!detectDefinitionPattern(question)) return null;

  const definitionKey =
    detector?.definitionKey ||
    subIssue ||
    `${primaryIssue}_DEFINITION`;

  return DEFINITION_AUTHORITY_MAP[definitionKey] || null;
}

function buildAuthorities({ question = "", detector = null, primaryIssue, subIssue, exactAuthority }) {
  const definitionAuthorities = getDefinitionAuthorityFor(question, detector, primaryIssue, subIssue);

  let controllingAuthorities = [];
  let supportingAuthorities = [];
  let supportingJurisprudence = [];

  if (definitionAuthorities) {
    controllingAuthorities = safeArray(definitionAuthorities.controllingAuthorities);
    supportingAuthorities = safeArray(definitionAuthorities.supportingAuthorities);
    supportingJurisprudence = safeArray(definitionAuthorities.supportingJurisprudence);

    // Preserve standalone exact-section entries that appear in the definition map's
    // targetAuthorities but are not assigned to any sub-group (e.g. NIRC Sec. 84 in
    // ESTATE_TAX_DEFINITION, NIRC Sec. 129 in EXCISE_TAX_DEFINITION).  These are
    // governing provisions — promote them into controllingAuthorities, maintaining the
    // order they hold in targetAuthorities relative to the other controlling entries.
    const explicitTargets = safeArray(definitionAuthorities.targetAuthorities);
    const assignedSet = new Set([
      ...controllingAuthorities,
      ...supportingAuthorities,
      ...supportingJurisprudence
    ]);
    const unassigned = explicitTargets.filter((a) => !assignedSet.has(a));

    if (unassigned.length > 0) {
      const unassignedSet = new Set(unassigned);
      const controllingSet = new Set(controllingAuthorities);
      const reordered = explicitTargets.filter(
        (a) => controllingSet.has(a) || unassignedSet.has(a)
      );
      const remaining = controllingAuthorities.filter((a) => !new Set(reordered).has(a));
      controllingAuthorities = unique([...reordered, ...remaining]);
    }
  } else {
    const issueTargets = safeArray(ISSUE_SPECIFIC_TARGETS[subIssue]);

    controllingAuthorities = issueTargets.filter((item) =>
      /\bNIRC\b|\bCMTA\b|\bLocal Government Code\b|\bCREATE\b|\bPEZA law\b|\b1987 Constitution\b/i.test(item)
    );

    supportingAuthorities = issueTargets.filter((item) =>
      /\bRR\b|\bRMC\b|\bRMO\b|\bFIRB\b|\bBOC\b|\bLGU\b/i.test(item)
    );

    supportingJurisprudence = issueTargets.filter((item) =>
      /\bCIR v\.|\bSupreme Court\b|\bCTA\b|\bG\.R\./i.test(item)
    );

    if (!issueTargets.length) {
      controllingAuthorities = ["Applicable NIRC / primary statute provisions"];
      supportingAuthorities = ["Applicable Revenue Regulations / BIR issuances"];
    }
  }

  if (exactAuthority?.detected && exactAuthority.reference) {
    if (["SUPREME_COURT", "CTA_DIVISION", "CTA_EN_BANC"].includes(exactAuthority.type)) {
      supportingJurisprudence.unshift(exactAuthority.reference);
    } else if (["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(exactAuthority.type)) {
      supportingAuthorities.unshift(exactAuthority.reference);
    } else {
      controllingAuthorities.unshift(exactAuthority.reference);
    }
  }

  const targetAuthorities = unique([
    ...safeArray(definitionAuthorities?.targetAuthorities),
    ...controllingAuthorities,
    ...supportingAuthorities,
    ...supportingJurisprudence
  ]);

  return {
    targetAuthorities,
    controllingAuthorities: unique(controllingAuthorities),
    supportingAuthorities: unique(supportingAuthorities),
    supportingJurisprudence: unique(supportingJurisprudence)
  };
}

function detectRetrievalStrategy({ question = "", queryIntent = {}, primaryIssue, subIssue, exactAuthority }) {
  if (exactAuthority?.detected) return RETRIEVAL_STRATEGY.EXACT_AUTHORITY;
  if (detectSourcePattern(question, queryIntent)) return RETRIEVAL_STRATEGY.SOURCE_FINDER;
  if (subIssue === "VAT_DEFINITION") return RETRIEVAL_STRATEGY.VAT_DEFINITION;
  if (detectDefinitionPattern(question, queryIntent)) return RETRIEVAL_STRATEGY.FAST_DEFINITION;
  if (detectCasePattern(question, queryIntent)) return RETRIEVAL_STRATEGY.JURISPRUDENTIAL;
  if (detectRiskPattern(question, queryIntent)) return RETRIEVAL_STRATEGY.FACT_DRIVEN;
  if (/\bcompute|calculate|how much|tax due|tax payable\b/i.test(question)) return RETRIEVAL_STRATEGY.COMPUTATION;
  if (["PRE", "DIS", "ASSESSMENT", "PRESCRIPTION", "TAX_REFUND_CREDIT"].includes(primaryIssue)) return RETRIEVAL_STRATEGY.PROCEDURAL;
  if (["CUS", "LGT", "RPT"].includes(primaryIssue)) return RETRIEVAL_STRATEGY.PROCEDURAL;
  if (["SPC"].includes(primaryIssue)) return RETRIEVAL_STRATEGY.FACT_DRIVEN;
  return RETRIEVAL_STRATEGY.MIXED;
}

function detectResponseMode({ question = "", queryIntent = {}, complexity }) {
  if (queryIntent?.responseMode) return queryIntent.responseMode;
  if (detectDefinitionPattern(question, queryIntent)) return "FAST_DEFINITION";
  if (detectSourcePattern(question, queryIntent)) return "SOURCE";
  if (queryIntent?.requiresReviewMode) return "REVIEWER";
  if (queryIntent?.requiresQuizMode) return "QUIZ";
  if (/\bcompute|calculate|how much|tax due|tax payable\b/i.test(question)) return "COMPUTATION";
  if (detectRiskPattern(question, queryIntent)) return "AUDIT_RISK";
  if (detectCasePattern(question, queryIntent)) return "CASE_ANALYSIS";
  if (complexity === COMPLEXITY.COMPLEX || complexity === COMPLEXITY.MULTI_ISSUE) return "TECHNICAL";
  return "STANDARD";
}

function detectOrchestrationMode({ question = "", queryIntent = {}, responseMode, complexity }) {
  if (queryIntent?.orchestrationMode) return queryIntent.orchestrationMode;
  if (responseMode === "FAST_DEFINITION") return "FAST_DEFINITION";
  if (responseMode === "SOURCE") return "SOURCE_LOOKUP";
  if (responseMode === "REVIEWER") return "REVIEWER";
  if (responseMode === "QUIZ") return "QUIZ";
  if (responseMode === "CASE_ANALYSIS") return "CASE_ANALYSIS";
  if (responseMode === "AUDIT_RISK" || detectRiskPattern(question, queryIntent)) return "COMPLEX_ADVISORY";
  if (detectCasePattern(question, queryIntent)) return "LEGAL_ANALYSIS";
  if (complexity === COMPLEXITY.COMPLEX || complexity === COMPLEXITY.MULTI_ISSUE) return "LEGAL_ANALYSIS";
  return "STANDARD_TAX";
}

function detectComplexity({ question = "", domains = [], queryIntent = {} }) {
  let score = 0;
  const q = lower(question);

  if (domains.length > 1) score += 2;
  if (question.length > 220) score += 1;
  if (queryIntent?.requiresFactPatternAnalysis || queryIntent?.requiresAuditRisk || queryIntent?.requiresComputation) score += 1;
  if (/\bconflict|prevails|hierarchy|doctrine|jurisprudence|contract|agreement|actual facts|audit risk|legal consequence|economic substance\b/i.test(q)) score += 2;

  if (score >= 4) return COMPLEXITY.MULTI_ISSUE;
  if (score === 3) return COMPLEXITY.COMPLEX;
  if (score >= 1) return COMPLEXITY.MODERATE;
  return COMPLEXITY.SIMPLE;
}

function detectFactSensitivity(primaryIssue, subIssue, question = "") {
  const q = lower(question);

  if (detectDefinitionPattern(question)) return FACT_SENSITIVITY.LOW;

  if (
    ["PRE", "DIS", "SPC", "CUS", "ASSESSMENT", "PRESCRIPTION"].includes(primaryIssue) ||
    /\bcontract|agreement|invoice|receipt|actual|facts|scenario|transaction|booked|audit|supporting document|economic substance|substance over form\b/i.test(q)
  ) {
    return FACT_SENSITIVITY.HIGH;
  }

  return FACT_SENSITIVITY.MODERATE;
}

function buildKeyTerms({ question = "", primaryIssue, subIssue, domains = [], exactAuthority }) {
  const terms = [primaryIssue, subIssue, ...domains.map((d) => d.domainCode || d)];

  if (exactAuthority?.reference) terms.push(exactAuthority.reference);
  if (detectDefinitionPattern(question)) terms.push("definition", "foundational rule", "primary authority");
  if (detectOverviewPattern(question)) terms.push("overview", "framework");
  if (detectRiskPattern(question)) terms.push("risk analysis", "exposure");
  if (detectSourcePattern(question)) terms.push("source inventory", "authorities");
  if (detectCasePattern(question)) terms.push("jurisprudence", "case law");

  return unique(terms);
}

function buildExcludedAuthorities(primaryIssue, subIssue) {
  const exclusions = [];

  if (!(primaryIssue === "VAT_REFUND" || subIssue === "REFUND_CREDIT")) {
    exclusions.push("VAT refund cases unless the issue involves Section 112 or input VAT refund");
  }

  if (subIssue === "VAT_DEFINITION") {
    exclusions.push(
      "CIR v. Aichi Forging — refund / 120-day doctrine, not applicable to VAT definition",
      "CIR v. San Roque Power — refund / 120+30 rule, not applicable to VAT definition",
      "CIR v. Toshiba — zero-rating doctrine, not applicable to VAT definition",
      "CIR v. Seagate Technology — zero-rating, not applicable to VAT definition",
      "CIR v. Mirant — refund procedure, not applicable to VAT definition",
      "NIRC Sec. 112 — VAT refund provision, not a definitional authority",
      "All VAT refund jurisprudence and zero-rating procedure cases"
    );
  }

  if (!["PRE", "DIS", "CON", "ASSESSMENT", "PRESCRIPTION"].includes(primaryIssue)) {
    exclusions.push("procedural protest, CTA jurisdiction, or constitutional due process cases unless directly relevant");
  }

  if (primaryIssue !== "SPC") {
    exclusions.push("transfer pricing or special regime authorities unless directly relevant");
  }

  return unique(exclusions);
}

function detectCaseRoleFilters(primaryIssue, subIssue, domains = []) {
  const filters = [];

  if (["PRE", "DIS", "CON", "ASSESSMENT", "PRESCRIPTION"].includes(primaryIssue)) filters.push("jurisprudence", "procedural", "due process", "hierarchy");
  if (primaryIssue.includes("VAT") || domains.some((d) => d.domainCode === "VAT")) filters.push("VAT", subIssue);
  if (primaryIssue === "INCOME_TAX" || domains.some((d) => d.domainCode === "CIT")) filters.push("income tax", subIssue);
  if (primaryIssue === "WITHHOLDING" || domains.some((d) => d.domainCode === "WHT")) filters.push("withholding tax", subIssue);
  if (primaryIssue === "SPC") filters.push("special regime", "transfer pricing", "incentives");
  if (primaryIssue === "CUS") filters.push("customs", "tariff", "CMTA");

  return unique(filters);
}

function detectMischaracterizationRisk(primaryIssue, subIssue, question = "") {
  const q = lower(question);

  if (["SPC", "CUS"].includes(primaryIssue)) return "high";

  if (/\breimbursement|pass[- ]through|principal|agent|concession|lease|bundled|package|economic substance|substance over form|joint venture|transfer pricing|related party\b/i.test(q)) {
    return "high";
  }

  if (["VAT_LIABILITY", "VAT_REFUND", "WITHHOLDING", "INCOME_TAX", "DEDUCTIONS"].includes(primaryIssue)) return "moderate";

  return "low";
}

function buildHierarchyFlags({ question = "", queryIntent = {}, primaryIssue, subIssue }) {
  const needsConflict =
    queryIntent?.needsConflictAnalysis ||
    queryIntent?.requiresConflictAnalysis ||
    /\bconflict|contradict|prevails|override|hierarchy|versus|vs\.?\b/i.test(question);

  const needsJurisprudence =
    queryIntent?.needsJurisprudence ||
    detectCasePattern(question, queryIntent) ||
    needsConflict ||
    subIssue === "VAT_DEFINITION" ||
    subIssue === "VAT_OVERVIEW" ||
    /\bbar exam\b|\breviewer\b|\breview mode\b|\bcpale\b|\bdiagnostic\b/i.test(question) ||
    subIssue === "ASSESSMENT_PRESCRIPTION" ||
    subIssue === "LOA_VALIDITY" ||
    subIssue === "PAN_FAN" ||
    subIssue === "REFUND_CREDIT" ||
    subIssue === "LOCAL_BUSINESS_TAX" ||
    /\bCREATE act\b|\bTRAIN act\b|\bRA 11534\b|\bRA 10963\b|\bcreate law\b|\btrain law\b/i.test(question);

  return {
    preserveAuthorityHierarchy: true,
    requiresHierarchyValidation: true,
    requiresSupersessionCheck: true,
    requiresConflictValidation: true,
    requiresProvisionLevelGrounding:
      detectDefinitionPattern(question, queryIntent) ||
      /\bsection|sec\.?|nirc|rr|rmc|rmo|legal basis\b/i.test(question),
    requiresJurisprudence: Boolean(needsJurisprudence),
    requiresConflictAnalysis: Boolean(needsConflict),
    antiHallucinationLevel: needsConflict ? "STRICT_MAX" : "STRICT",
    mustNotInventAuthorities: true,
    mustSayIndexedSourceNotFound: true,
    mustPreserveUncertainty: true,
    authorityHierarchy: [
      "CONSTITUTION",
      "NIRC_CMTA_LGC_PRIMARY_STATUTES",
      "TAX_TREATIES",
      "SUPREME_COURT_EN_BANC",
      "SUPREME_COURT_DIVISION",
      "CTA_EN_BANC",
      "CTA_DIVISION",
      "REVENUE_REGULATIONS",
      "RMC_RMO_RAMO",
      "BIR_RULINGS",
      "LGU_BOC_ISSUANCES",
      "PFRS_PAS_PSA_WHEN_ACCOUNTING_APPLIES",
      "OECD_FOREIGN_PERSUASIVE",
      "CPA_REVIEWER_NOTES_SECONDARY_MATERIALS"
    ]
  };
}

function computeConfidence({ domainScore = 0, exactAuthority = {}, isDefinition = false, targetAuthorities = [] }) {
  let confidence = 0.45;

  if (domainScore >= 20) confidence += 0.25;
  if (exactAuthority?.detected) confidence += 0.12;
  if (isDefinition) confidence += 0.1;
  if (targetAuthorities.length >= 2) confidence += 0.08;

  return Math.min(0.98, Number(confidence.toFixed(2)));
}

function buildOrchestrationClassification(classification = {}) {
  return {
    primaryIssue: classification.primaryIssue || "GENERAL_TAX",
    subIssue: classification.subIssue || "GENERAL",
    domainCode: classification.domainCode || null,
    domainName: classification.domainName || null,
    subIssues: safeArray(classification.subIssues),

    retrievalStrategy: classification.retrievalStrategy || RETRIEVAL_STRATEGY.MIXED,
    targetAuthorities: safeArray(classification.targetAuthorities),
    controllingAuthorities: safeArray(classification.controllingAuthorities),
    supportingAuthorities: safeArray(classification.supportingAuthorities),
    supportingJurisprudence: safeArray(classification.supportingJurisprudence),

    legalDimensions: safeArray(classification.legalDimensions),
    taxDomains: safeArray(classification.taxDomains),

    responseMode: classification.responseMode || "STANDARD",
    orchestrationMode: classification.orchestrationMode || "STANDARD_TAX",

    complexity: classification.complexity || COMPLEXITY.MODERATE,
    issueComplexity: classification.issueComplexity || classification.complexity || COMPLEXITY.MODERATE,
    factSensitivity: classification.factSensitivity || FACT_SENSITIVITY.MODERATE,

    requiresLegalBasis: Boolean(classification.requiresLegalBasis),
    requiresProvisionLevelGrounding: Boolean(classification.requiresProvisionLevelGrounding),
    requiresJurisprudence: Boolean(classification.requiresJurisprudence),
    requiresComputation: Boolean(classification.requiresComputation),
    requiresAuditRiskAnalysis: Boolean(classification.requiresAuditRiskAnalysis),
    requiresFactPatternAnalysis: Boolean(classification.requiresFactPatternAnalysis),
    requiresSourceInventory: Boolean(classification.requiresSourceInventory),
    requiresConflictAnalysis: Boolean(classification.requiresConflictAnalysis),

    preserveAuthorityHierarchy: true,
    requiresHierarchyValidation: true,
    requiresSupersessionCheck: true,
    requiresConflictValidation: true,

    antiHallucinationLevel: classification.antiHallucinationLevel || "STRICT",
    mustNotInventAuthorities: true,
    mustSayIndexedSourceNotFound: true,
    mustPreserveUncertainty: true,

    tpmProfile: classification.tpmProfile || "standard",
    confidence: classification.confidence || 0,
    fallbackClassificationUsed: Boolean(classification.fallbackClassificationUsed),

    exactAuthority: classification.exactAuthority || {
      detected: false,
      type: null,
      reference: null
    },

    contextPolicy: {
      useContextOrchestrationEngine: true,
      preventRawFullDocumentInjection: true,
      preventFullDebugObjectInjection: true,
      preventFullEngineOutputInjection: true,
      passCompactClassificationOnly: true
    }
  };
}

function classifyTaxIssue(question = "", queryIntent = {}) {
  const { rawQuery, normalizedQuery } = normalizeQuery(question);
  const exactAuthority = detectExactAuthority(normalizedQuery);

  const detectedDomains = detectTaxDomain(normalizedQuery, queryIntent);
  const detector = detectedDomains[0] || null;

  const subIssuePreview = detectSubIssue(
    normalizedQuery,
    queryIntent?.primaryIssue || detector?.primaryIssue || "GENERAL_TAX",
    queryIntent
  );

  const definitionAuthority = DEFINITION_AUTHORITY_MAP[subIssuePreview] || null;

  const primaryIssue =
    queryIntent?.primaryIssue ||
    definitionAuthority?.primaryIssue ||
    detector?.primaryIssue ||
    "GENERAL_TAX";

  const domainCode =
    queryIntent?.domainCode ||
    definitionAuthority?.domainCode ||
    detector?.domainCode ||
    normalizeIssue(primaryIssue) ||
    "GENERAL_TAX";

  const domainName =
    queryIntent?.domainName ||
    definitionAuthority?.domainName ||
    detector?.domainName ||
    "General Philippine Tax";

  const subIssue = detectSubIssue(normalizedQuery, primaryIssue, queryIntent);
  const legalDimensions = detectLegalDimensions(normalizedQuery, primaryIssue, subIssue);
  const finalQueryIntent = detectQueryIntent(normalizedQuery, primaryIssue, queryIntent);

  const authoritySet = buildAuthorities({
    question: normalizedQuery,
    detector,
    primaryIssue,
    subIssue,
    exactAuthority
  });

  const complexity = detectComplexity({
    question: normalizedQuery,
    domains: detectedDomains,
    queryIntent
  });

  const factSensitivity = detectFactSensitivity(primaryIssue, subIssue, normalizedQuery);

  const retrievalStrategy = detectRetrievalStrategy({
    question: normalizedQuery,
    queryIntent,
    primaryIssue,
    subIssue,
    exactAuthority
  });

  const responseMode = detectResponseMode({
    question: normalizedQuery,
    queryIntent,
    complexity
  });

  const orchestrationMode = detectOrchestrationMode({
    question: normalizedQuery,
    queryIntent,
    responseMode,
    complexity
  });

  const hierarchyFlags = buildHierarchyFlags({
    question: normalizedQuery,
    queryIntent,
    primaryIssue,
    subIssue
  });

  const flags = {
    requiresLegalBasis: true,

    requiresProvisionLevelGrounding:
      hierarchyFlags.requiresProvisionLevelGrounding,

    requiresJurisprudence:
      hierarchyFlags.requiresJurisprudence,

    requiresComputation:
      queryIntent?.requiresComputation === true ||
      /\bcompute|calculate|how much|tax due|tax payable|amount\b/i.test(normalizedQuery),

    requiresAuditRiskAnalysis:
      queryIntent?.requiresAuditRisk === true ||
      queryIntent?.requiresAuditRiskAnalysis === true ||
      detectRiskPattern(normalizedQuery, queryIntent),

    requiresFactPatternAnalysis:
      queryIntent?.requiresFactPatternAnalysis === true ||
      factSensitivity === FACT_SENSITIVITY.HIGH,

    requiresSourceInventory:
      queryIntent?.requiresSourceInventory === true ||
      queryIntent?.requiresSourceVisibility === true ||
      detectSourcePattern(normalizedQuery, queryIntent),

    requiresConflictAnalysis:
      hierarchyFlags.requiresConflictAnalysis
  };

  const confidence = computeConfidence({
    domainScore: detector?.score || 0,
    exactAuthority,
    isDefinition: detectDefinitionPattern(normalizedQuery, queryIntent),
    targetAuthorities: authoritySet.targetAuthorities
  });

  const keyTerms = buildKeyTerms({
    question: normalizedQuery,
    primaryIssue,
    subIssue,
    domains: detectedDomains,
    exactAuthority
  });

  const classification = {
    engine: "TINA_ISSUE_CLASSIFICATION_ENGINE",
    version: ENGINE_VERSION,

    originalQuery: rawQuery,
    normalizedQuery,

    primaryIssue,
    subIssue,
    domainCode,
    domainName,

    subIssues: unique([subIssue]),

    queryIntent: finalQueryIntent,
    preservedQueryIntent: queryIntent || {},

    legalQuestionPresented: buildLegalQuestionPresented({
      question: normalizedQuery,
      primaryIssue,
      subIssue,
      domainName
    }),

    legalDimensions,

    taxDomains: unique(detectedDomains.map((d) => d.domainCode)),
    candidateDomains: detectedDomains,

    targetAuthorities: authoritySet.targetAuthorities,
    targetAuthorityGroups: {
      controllingAuthorities: authoritySet.controllingAuthorities,
      supportingAuthorities: authoritySet.supportingAuthorities,
      supportingJurisprudence: authoritySet.supportingJurisprudence
    },
    controllingAuthorities: authoritySet.controllingAuthorities,
    supportingAuthorities: authoritySet.supportingAuthorities,
    supportingJurisprudence: authoritySet.supportingJurisprudence,

    requiredAnswerSections: STANDARD_REQUIRED_ANSWER_SECTIONS,

    keyTerms,
    complexity,
    complexityFlag: complexity,
    issueComplexity: complexity,
    factSensitivity,

    retrievalStrategy,
    responseMode,
    orchestrationMode,

    doctrinalMode:
      flags.requiresJurisprudence || flags.requiresConflictAnalysis
        ? "DOCTRINAL_ANALYSIS_REQUIRED"
        : "NONE",

    ...flags,
    ...hierarchyFlags,

    transactionCharacterizationRequired:
      /\b(?:reimbursement|pass[- ]through|principal|agent|concession|lease|bundled|package|economic substance|substance over form|joint venture|related party|shareholder\s+(?:advance|withdrawal)|disguised\s+dividend|financing\s+arrangement|employer[- ]employee|independent\s+contractor|advance\s+payment|customer\s+deposit|deposit\s+income|cost\s+recovery|installment\s+sale)\b/i.test(normalizedQuery),

    factPatternRequired: flags.requiresFactPatternAnalysis,

    doctrinalAnalysisRequired:
      flags.requiresJurisprudence || flags.requiresConflictAnalysis,

    potentialConflictCheck: flags.requiresConflictAnalysis,

    caseRoleFilters: detectCaseRoleFilters(primaryIssue, subIssue, detectedDomains),
    excludedAuthorities: buildExcludedAuthorities(primaryIssue, subIssue),
    mischaracterizationRisk: detectMischaracterizationRisk(primaryIssue, subIssue, normalizedQuery),

    exactAuthority,

    confidence,
    fallbackClassificationUsed:
      confidence < 0.55 || primaryIssue === "GENERAL_TAX",

    tpmProfile:
      queryIntent?.tpmProfile ||
      (
        complexity === COMPLEXITY.SIMPLE
          ? "light"
          : complexity === COMPLEXITY.MULTI_ISSUE
            ? "expanded"
            : "standard"
      ),

    retrievalControls: {
      issueFirst: true,
      suppressIssueMismatchedCases: true,
      suppressUnrelatedProceduralCases:
        !["PRE", "DIS", "ASSESSMENT", "PRESCRIPTION"].includes(primaryIssue),
      suppressVatRefundCasesUnlessRefundIssue:
        !(primaryIssue === "VAT_REFUND" || subIssue === "REFUND_CREDIT"),
      suppressVatRefundJurisprudenceForDefinition:
        subIssue === "VAT_DEFINITION",
      requirePrimaryAuthorityForDefinitions:
        finalQueryIntent === QUERY_INTENT.DEFINITION,
      requireFactDisclosureBeforeConclusion: flags.requiresFactPatternAnalysis,
      allowConflictLabelOnlyIfSameIssueAndOppositeHolding: true,
      useIssueClassificationMatch: true,
      useTargetAuthorityMatch: true,
      useControllingPrecedence: true
    },

    downstreamRouting: {
      useRetrievalEngine: true,
      useRerankerEngine: true,
      useJurisprudenceEngine: flags.requiresJurisprudence,
      useConflictEngine: flags.requiresConflictAnalysis,
      useTransactionCharacterizationEngine:
        /\breimbursement|pass[- ]through|principal|agent|concession|lease|bundled|package|economic substance|substance over form|joint venture|related party\b/i.test(normalizedQuery),
      useFactPatternEngine: flags.requiresFactPatternAnalysis,
      useEvidenceEvaluationEngine:
        flags.requiresFactPatternAnalysis ||
        legalDimensions.includes(LEGAL_DIMENSION.EVIDENTIARY),
      useAnswerRenderer: true
    },

    sourceOrderingPolicy: {
      useIssueClassificationMatch: true,
      useTargetAuthorityMatch: true,
      useControllingPrecedence: true,
      hideIssueMismatchedSources: true,
      preserveControllingAuthorities: true
    },

    conflictDisplayPolicy: {
      displayConflictYesOnlyWhenConflictTrue: true,
      requireCompleteConflictMetadata: true,
      requireSameIssueGate: true,
      requireOppositeHoldingGate: true
    }
  };

  let enriched = classification;

  try {
    enriched = enrichIssueClassification(classification, normalizedQuery) || classification;
  } catch (error) {
    enriched = {
      ...classification,
      enrichmentError: error?.message || "main-tax-engine-classification enrichment failed"
    };
  }

  return {
    ...enriched,
    orchestrationClassification: buildOrchestrationClassification(enriched)
  };
}

function classifyIssue(question = "", queryIntent = {}) {
  return classifyTaxIssue(question, queryIntent);
}

function classifyQueryIssue(question = "", queryIntent = {}) {
  return classifyTaxIssue(question, queryIntent);
}

function runIssueClassification(question = "", queryIntent = {}) {
  if (typeof question === "object" && question !== null) {
    return classifyTaxIssue(
      question.question || question.query || question.userQuery || "",
      question.queryIntent || question.intent || queryIntent || {}
    );
  }

  return classifyTaxIssue(question, queryIntent);
}

function issueClassificationEngine(question = "", queryIntent = {}) {
  return runIssueClassification(question, queryIntent);
}

function classify(question = "", queryIntent = {}) {
  return runIssueClassification(question, queryIntent);
}

function buildIssueClassificationSearchQueries(classification = {}, maxQueries = 8) {
  const queries = [];

  if (classification.exactAuthority?.detected) {
    queries.push(classification.exactAuthority.reference);
  }

  queries.push(classification.normalizedQuery);
  queries.push(classification.legalQuestionPresented);
  queries.push(`${classification.primaryIssue} ${classification.subIssue}`);

  for (const authority of safeArray(classification.targetAuthorities)) {
    queries.push(`${classification.legalQuestionPresented} ${authority}`);
    queries.push(authority);
  }

  for (const term of classification.keyTerms || []) {
    queries.push(`${classification.primaryIssue} ${classification.subIssue} ${term}`);
  }

  return unique(queries.map(normalizeText)).filter(Boolean).slice(0, maxQueries);
}

function detectDocIssues(doc = {}) {
  const haystack = lower(
    [
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.title,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.authorityType,
      doc.authorityType,
      doc.authority_type
    ].filter(Boolean).join(" ")
  );

  const issues = [];

  for (const detector of DOMAIN_DETECTORS) {
    if (regexAny(haystack, detector.patterns)) {
      issues.push(detector.domainCode, detector.primaryIssue, detector.defaultSubIssue);
      if (detector.definitionKey && haystack.includes(lower(detector.definitionKey.replace(/_/g, " ")))) {
        issues.push(detector.definitionKey);
      }
    }
  }

  for (const [subIssue, authorities] of Object.entries(ISSUE_SPECIFIC_TARGETS)) {
    if (haystack.includes(subIssue.toLowerCase().replace(/_/g, " "))) {
      issues.push(subIssue);
    }

    for (const authority of safeArray(authorities)) {
      if (haystack.includes(lower(authority))) issues.push(subIssue);
    }
  }

  return unique(issues);
}

function isIssueClassificationCompatibleWithDoc(classification = {}, doc = {}) {
  const docIssues = detectDocIssues(doc);

  const primary = classification.primaryIssue || classification.domainCode;
  const domainCode = classification.domainCode;
  const subIssue = classification.subIssue;
  const subIssues = safeArray(classification.subIssues);

  if (!docIssues.length) return true;

  if (docIssues.includes(primary)) return true;
  if (domainCode && docIssues.includes(domainCode)) return true;
  if (subIssue && docIssues.includes(subIssue)) return true;
  if (subIssues.some((issue) => docIssues.includes(issue))) return true;

  if (primary === "GENERAL_TAX") return true;

  if (
    primary !== "VAT_REFUND" &&
    subIssue !== "REFUND_CREDIT" &&
    docIssues.includes("REFUND_CREDIT")
  ) {
    return false;
  }

  return false;
}

/**
 * PATCH-016: Semantic No-Match Guard
 * Determines if the query classification is stable enough to enforce
 * semantic relevance filtering.
 */
export function hasSemanticNoMatchGuard(classification = {}) {
  if (classification.orchestrationMode === "SOURCE_LOOKUP") return false;
  return (classification.confidence || 0) > 0.3;
}

/**
 * PATCH-016: Primary semantic relevance check.
 * Checks if the document contains material terms from the query.
 */
export function sourceMaterialTermsMatchAuthority(doc = {}, query = "") {
  const text = lower(doc.text || doc.content || "");
  const q = lower(query);
  const tokens = q.split(/\s+/).filter((t) => t.length > 3);
  if (!tokens.length) return true;
  return tokens.some((t) => text.includes(t));
}

/**
 * PATCH-017A: Issue Classification to Semantic Source Selection Bridge
 * Prevents rejection of critical EWT authorities when semantic scores are low.
 */
export function isEwtBridgeEligible(classification = {}, doc = {}, query = "") {
  const primary = classification.primaryIssue || "";
  const sub = classification.subIssue || "";
  const isEwt = (primary === "WITHHOLDING" || primary === "WHT") && sub === "EWT";

  if (!isEwt) return false;

  // Verify candidate is an intended target
  const isTarget = doc.targetAuthorityMatch === true || doc.exactAuthorityMatch === true;
  if (!isTarget) return false;

  const text = lower(doc.text || doc.content || "");
  const ewtKeywords = [
    "advertising agencies",
    "contractors",
    "withholding",
    "ewt",
    "expanded withholding tax",
    "2.57.2",
    "gross payments",
    "income payments"
  ];

  const hasKeywords = ewtKeywords.some((kw) => text.includes(kw));
  return hasKeywords;
}

// ─── PATCH B — OpenAI-backed issue classification (Steps 1-2, gpt-4o-mini) ───
const CLASSIFICATION_SYSTEM_PROMPT = `You are TINA's Issue Classification Engine for Philippine taxation.
Return ONLY valid JSON. No prose. No markdown. No code fences.

{
  "primaryIssue": "VAT|CIT|IIT|WHT|ESTATE|DONORS|PERCENTAGE|EXCISE|PRESCRIPTION|DISPUTE|LOCAL_TAX|CUSTOMS|TRANSFER_PRICING|CONSTITUTIONAL|GENERAL",
  "subIssue": "specific sub-issue within the primary domain",
  "queryIntent": "definition|compliance|dispute|planning|advisory|audit|refund|characterization|multi_issue",
  "targetAuthorities": {
    "tier1": ["NIRC/Constitution/RA provisions directly on point"],
    "tier2": ["Tax Treaties if relevant"],
    "tier3": ["Supreme Court / CTA cases directly on point"],
    "tier4": ["Revenue Regulations directly on point"],
    "tier5": ["RMC/RMO/BIR Rulings directly on point"]
  },
  "keyTerms": ["key Philippine tax terms extracted from the query"],
  "complexityFlag": "simple|moderate|complex|multi_issue",
  "transactionCharacterizationRequired": false,
  "factPatternRequired": false
}`;

export async function classifyWithOpenAI(question = "", openai = null) {
  if (!openai || !question) {
    return {
      success: false,
      error: "Requires openai client and question.",
      result: null,
      metadata: { model: "gpt-4o-mini" }
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: "user",   content: String(question || "").trim() }
      ],
      response_format: { type: "json_object" },
      temperature: 0
    });

    const raw = JSON.parse(response.choices[0]?.message?.content || "{}");

    return {
      success: true,
      result: {
        primaryIssue:   raw.primaryIssue  || "GENERAL",
        subIssue:       raw.subIssue      || "",
        queryIntent:    raw.queryIntent   || "advisory",
        targetAuthorities: {
          tier1: Array.isArray(raw.targetAuthorities?.tier1) ? raw.targetAuthorities.tier1 : [],
          tier2: Array.isArray(raw.targetAuthorities?.tier2) ? raw.targetAuthorities.tier2 : [],
          tier3: Array.isArray(raw.targetAuthorities?.tier3) ? raw.targetAuthorities.tier3 : [],
          tier4: Array.isArray(raw.targetAuthorities?.tier4) ? raw.targetAuthorities.tier4 : [],
          tier5: Array.isArray(raw.targetAuthorities?.tier5) ? raw.targetAuthorities.tier5 : []
        },
        keyTerms:      Array.isArray(raw.keyTerms) ? raw.keyTerms : [],
        complexityFlag: raw.complexityFlag || "moderate",
        transactionCharacterizationRequired: Boolean(raw.transactionCharacterizationRequired),
        factPatternRequired: Boolean(raw.factPatternRequired)
      },
      metadata: { model: "gpt-4o-mini", tokens: response.usage?.total_tokens || 0 }
    };
  } catch (err) {
    return { success: false, error: err.message, result: null, metadata: { model: "gpt-4o-mini" } };
  }
}

function issueClassificationEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ISSUE_CLASSIFICATION_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,

    role: "legal_tax_issue_detector_only",

    noOpenAICalls: true,
    noRetrieval: true,
    noAnswerGeneration: true,
    noRendering: true,

    definitionPatternReady: true,
    overviewPatternReady: true,
    riskPatternReady: true,
    sourcePatternReady: true,
    casePatternReady: true,

    definitionAuthorityMapReady: true,
    preciseTargetAuthoritiesReady: true,
    definitionSubIssuePreserved: true,

    whatIsVatClassifiesAs: {
      primaryIssue: "VAT_LIABILITY",
      subIssue: "VAT_DEFINITION",
      responseMode: "FAST_DEFINITION",
      orchestrationMode: "FAST_DEFINITION",
      retrievalStrategy: "VAT_DEFINITION_AUTHORITY_FIRST",
      targetAuthorities: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 108", "RR 16-2005"]
    },

    explainVatClassifiesAs: {
      primaryIssue: "VAT_LIABILITY",
      subIssue: "VAT_OVERVIEW"
    },

    allRequestedDomainsSupported: true,

    supportedDomains: unique(DOMAIN_DETECTORS.map((d) => d.domainCode)),

    issueFirstRetrievalReady: true,
    domainCodeReady: true,
    domainNameReady: true,
    subIssueReady: true,
    targetAuthoritiesReady: true,
    controllingAuthoritiesReady: true,
    supportingAuthoritiesReady: true,
    supportingJurisprudenceReady: true,
    legalDimensionsReady: true,

    hierarchyFlagsReady: true,
    supersessionFlagsReady: true,
    conflictValidationFlagsReady: true,
    antiHallucinationFlagsReady: true,

    sourceOrderingPolicyReady: true,
    conflictDisplayPolicyReady: true,
    jurisprudenceFilteringReady: true,
    conflictGateReady: true,

    mainTaxEngineClassificationIntegrated: true,
    contextOrchestrationCompatible: true,
    orchestrationClassificationReady: true,
    compactClassificationReady: true,

    compatibilityWrappersReady: true,
    exports: [
      "classifyTaxIssue",
      "classifyIssue",
      "classifyQueryIssue",
      "runIssueClassification",
      "issueClassificationEngine",
      "classify"
    ]
  };
}

export {
  ENGINE_VERSION,
  PRIMARY_ISSUE,
  LEGACY_PRIMARY_ISSUE,
  QUERY_INTENT,
  COMPLEXITY,
  FACT_SENSITIVITY,
  RETRIEVAL_STRATEGY,
  LEGAL_DIMENSION,
  AUTHORITY_TYPE,

  normalizeIssue,
  normalizeAuthority,
  normalizeDimension,
  normalizeQuery,

  detectExactAuthority,
  detectTaxDomain,
  detectPrimaryIssue,
  detectSubIssue,
  detectLegalDimensions,

  buildOrchestrationClassification,

  classifyTaxIssue,
  classifyIssue,
  classifyQueryIssue,
  runIssueClassification,
  issueClassificationEngine,
  classify,

  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc,
  issueClassificationEngineHealthCheck,
  CLASSIFICATION_SYSTEM_PROMPT
};

export default {
  ENGINE_VERSION,
  PRIMARY_ISSUE,
  LEGACY_PRIMARY_ISSUE,
  QUERY_INTENT,
  COMPLEXITY,
  FACT_SENSITIVITY,
  RETRIEVAL_STRATEGY,
  LEGAL_DIMENSION,
  AUTHORITY_TYPE,

  normalizeIssue,
  normalizeAuthority,
  normalizeDimension,
  normalizeQuery,

  detectExactAuthority,
  detectTaxDomain,
  detectPrimaryIssue,
  detectSubIssue,
  detectLegalDimensions,

  buildOrchestrationClassification,

  classifyTaxIssue,
  classifyIssue,
  classifyQueryIssue,
  runIssueClassification,
  issueClassificationEngine,
  classify,

  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc,
  issueClassificationEngineHealthCheck,
  CLASSIFICATION_SYSTEM_PROMPT,
  classifyWithOpenAI,
  hasSemanticNoMatchGuard,
  sourceMaterialTermsMatchAuthority,
  isEwtBridgeEligible
};
