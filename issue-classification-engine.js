// FILE: issue-classification-engine.js
"use strict";

/**
 * TINA Issue Classification Engine
 * Version: 4.0.0
 */

import { enrichIssueClassification } from "./main-tax-engine-classification.js";

const ENGINE_VERSION = "4.0.0";

const PRIMARY_ISSUE = Object.freeze({
  VAT_LIABILITY: "VAT_LIABILITY",
  VAT_REFUND: "VAT_REFUND",
  VAT_EXEMPTION: "VAT_EXEMPTION",
  ZERO_RATED_SALES: "ZERO_RATED_SALES",

  INCOME_TAX: "INCOME_TAX",
  WITHHOLDING: "WITHHOLDING",
  ASSESSMENT: "ASSESSMENT",
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
  COMPLIANCE: "compliance",
  DISPUTE: "dispute",
  PLANNING: "planning",
  ADVISORY: "advisory"
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
  FOUNDATIONAL: "ISSUE_FOUNDATIONAL_AUTHORITY_FIRST",
  PROCEDURAL: "ISSUE_PROCEDURAL_AUTHORITY_FIRST",
  JURISPRUDENTIAL: "ISSUE_JURISPRUDENCE_FIRST",
  MIXED: "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",
  FACT_DRIVEN: "ISSUE_FACT_DRIVEN_AUTHORITY_FIRST",
  EXACT_AUTHORITY: "EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC",
  EVIDENCE_DRIVEN: "ISSUE_EVIDENCE_AUTHORITY_FIRST"
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
  GENERAL: "GENERAL"
});

const AUTHORITY_TYPE = Object.freeze({
  CONSTITUTION: "CONSTITUTION",
  STATUTE: "STATUTE",
  SUPREME_COURT: "SUPREME_COURT",
  CTA_EN_BANC: "CTA_EN_BANC",
  CTA_DIVISION: "CTA_DIVISION",
  COURT_OF_APPEALS: "COURT_OF_APPEALS",
  RR: "RR",
  RMC: "RMC",
  RMO: "RMO",
  RAMO: "RAMO",
  BIR_RULING: "BIR_RULING",
  PFRS: "PFRS",
  PAS: "PAS",
  PSA: "PSA",
  LGU: "LGU"
});

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
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

function hasAny(text = "", patterns = []) {
  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(text);
    return text.includes(String(pattern).toLowerCase());
  });
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
    VAT: PRIMARY_ISSUE.VAT_LIABILITY,
    OUTPUT_VAT: PRIMARY_ISSUE.VAT_LIABILITY,
    VAT_OUTPUT: PRIMARY_ISSUE.VAT_LIABILITY,
    DEFINITION: PRIMARY_ISSUE.VAT_LIABILITY,
    VAT_DEFINITION: PRIMARY_ISSUE.VAT_LIABILITY,

    REFUND: PRIMARY_ISSUE.VAT_REFUND,
    INPUT_VAT: PRIMARY_ISSUE.VAT_REFUND,
    INPUT_VAT_REFUND: PRIMARY_ISSUE.VAT_REFUND,
    TAX_REFUND: PRIMARY_ISSUE.VAT_REFUND,

    EXEMPTION: PRIMARY_ISSUE.VAT_EXEMPTION,

    EWT: PRIMARY_ISSUE.WITHHOLDING,
    CWT: PRIMARY_ISSUE.WITHHOLDING,
    FWT: PRIMARY_ISSUE.WITHHOLDING,
    WITHHOLDING_TAX: PRIMARY_ISSUE.WITHHOLDING,

    CHARACTERIZATION: PRIMARY_ISSUE.TRANSACTION,
    PRINCIPAL_AGENT: PRIMARY_ISSUE.TRANSACTION,
    PRINCIPAL_VS_AGENT: PRIMARY_ISSUE.TRANSACTION,
    PASS_THROUGH: PRIMARY_ISSUE.TRANSACTION,
    REIMBURSEMENT: PRIMARY_ISSUE.TRANSACTION,
    GROSS_NET: PRIMARY_ISSUE.TRANSACTION,

    AGREEMENT: PRIMARY_ISSUE.CONTRACT,
    CONTRACTUAL: PRIMARY_ISSUE.CONTRACT,

    ACCOUNTING_TAX: PRIMARY_ISSUE.ACCOUNTING,
    PFRS: PRIMARY_ISSUE.ACCOUNTING,

    DISPUTE_RESOLUTION: PRIMARY_ISSUE.ASSESSMENT,
    PRESCRIPTION: PRIMARY_ISSUE.PROCEDURAL,
    COMPLIANCE: PRIMARY_ISSUE.PROCEDURAL
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
    IFRS: "PFRS"
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
    TRANSACTION_CHARACTERIZATION: "TRANSACTION"
  };

  return aliases[raw] || raw || null;
}

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

function detectTaxDomain(question = "") {
  const q = lower(question);
  const domains = [];

  const push = (condition, domain) => {
    if (condition) domains.push(domain);
  };

  push(/\bvat\b|\bvalue[- ]added tax\b|\boutput vat\b|\binput vat\b|\bzero[- ]rated\b/i.test(q), "VAT");
  push(/\bincome tax\b|\brcit\b|\bmcit\b|\bnolco\b|\bdeductible\b|\btaxable income\b/i.test(q), "INCOME_TAX");
  push(/\bwithholding\b|\bewt\b|\bcwt\b|\bfwt\b|\bfinal tax\b|\bexpanded withholding\b/i.test(q), "WITHHOLDING_TAX");
  push(/\bdst\b|\bdocumentary stamp\b/i.test(q), "DST");
  push(/\bpercentage tax\b/i.test(q), "PERCENTAGE_TAX");
  push(/\bexcise\b/i.test(q), "EXCISE_TAX");
  push(/\bcapital gains\b|\bcgt\b/i.test(q), "CAPITAL_GAINS_TAX");
  push(/\bestate tax\b/i.test(q), "ESTATE_TAX");
  push(/\bdonor'?s tax\b|\bdonor tax\b/i.test(q), "DONOR_TAX");
  push(/\blocal business tax\b|\blbt\b|\breal property tax\b|\brpt\b|\blgu\b/i.test(q), "LOCAL_TAX");
  push(/\bpfrs\b|\bpas\b|\bafs\b|\bfinancial statements\b|\baudit\b/i.test(q), "ACCOUNTING_AUDIT");
  push(/\bcontract\b|\bagreement\b|\blease\b|\bconcession\b/i.test(q), "CONTRACT_TRANSACTION");
  push(/\bprincipal\b|\bagent\b|\breimbursement\b|\bpass[- ]through\b|\bbundled\b|\beconomic substance\b/i.test(q), "TRANSACTION");

  return unique(domains.length ? domains : ["GENERAL_TAX"]);
}

function detectPrimaryIssue(question = "") {
  const q = lower(question);

  if (/\b(vat refund|input vat refund|tax credit certificate|tcc|excess input vat|unutilized input vat|section 112|120[-+ ]?30|administrative claim|judicial claim)\b/i.test(q)) {
    return PRIMARY_ISSUE.VAT_REFUND;
  }

  if (/\b(vat exempt|exempt from vat|section 109|zero[- ]rated|zero rated)\b/i.test(q)) {
    return /\bzero[- ]rated|zero rated\b/i.test(q)
      ? PRIMARY_ISSUE.ZERO_RATED_SALES
      : PRIMARY_ISSUE.VAT_EXEMPTION;
  }

  if (/\b(vat|output vat|vatable|value[- ]added tax|gross receipts|gross selling price|sale of goods|sale of services|define vat|what is vat|nature of vat)\b/i.test(q)) {
    return PRIMARY_ISSUE.VAT_LIABILITY;
  }

  if (/\b(withholding|ewt|cwt|fwt|final withholding|expanded withholding|2307|1601)\b/i.test(q)) {
    return PRIMARY_ISSUE.WITHHOLDING;
  }

  if (/\b(income tax|rcit|mcit|nolco|deductible|non[- ]deductible|taxable income|gross income|deduction)\b/i.test(q)) {
    return PRIMARY_ISSUE.INCOME_TAX;
  }

  if (/\b(loa|letter of authority|pan|fan|fld|assessment|deficiency tax|protest|appeal|prescription|prescriptive|collection period|waiver)\b/i.test(q)) {
    return PRIMARY_ISSUE.ASSESSMENT;
  }

  if (/\b(invoice|receipt|official receipt|substantiation|evidence|proof|documentary|supporting document|burden of proof)\b/i.test(q)) {
    return PRIMARY_ISSUE.EVIDENTIARY;
  }

  if (/\b(jurisdiction|jurisdictional|cta|court of tax appeals|condition precedent)\b/i.test(q)) {
    return PRIMARY_ISSUE.JURISDICTIONAL;
  }

  if (/\b(contract|agreement|lease agreement|concession agreement|clause|rights and obligations)\b/i.test(q)) {
    return PRIMARY_ISSUE.CONTRACT;
  }

  if (/\b(principal|agent|pass[- ]through|reimbursement|reimbursable|concession|service vs sale|sale vs service|classification|characterization|economic substance|substance over form|bundled|package|gross or net|gross vs net|dfs|deposit for future subscription|liability vs equity)\b/i.test(q)) {
    return PRIMARY_ISSUE.TRANSACTION;
  }

  if (/\b(economic substance|substance over form|business purpose|sham|simulation|tax avoidance|tax evasion)\b/i.test(q)) {
    return PRIMARY_ISSUE.ECONOMIC_SUBSTANCE;
  }

  if (/\bpfrs\b|\bpas\b|\bafs\b|\baccounting treatment\b|\bbook\b|\bjournal entry\b|\baudit\b|\bmisstatement\b|\bworking paper\b/i.test(q)) {
    return /\baudit\b|\bworking paper\b|\bmisstatement\b/i.test(q)
      ? PRIMARY_ISSUE.AUDIT
      : PRIMARY_ISSUE.ACCOUNTING;
  }

  if (/\b(rr|rmc|rmo|ramo|revenue regulation|revenue memorandum|bir ruling)\s*(?:no\.?)?\s*\d+/i.test(q)) {
    return PRIMARY_ISSUE.ISSUANCE;
  }

  if (/\bg\.?\s*r\.?\s*no\.?|\bcta\b|\bsupreme court\b|\bjurisprudence\b|\bcase law\b/i.test(q)) {
    return PRIMARY_ISSUE.CASE_LAW;
  }

  if (/\bdoctrine\b|\bconflict\b|\bprevails\b|\boverride\b|\bhierarchy\b/i.test(q)) {
    return PRIMARY_ISSUE.DOCTRINE;
  }

  if (/\bfile\b|\bfiling\b|\bpayment\b|\bregistration\b|\bdeadline\b|\bdue date\b|\bform\b|\breturn\b|\bsubmit\b|\bcompliance\b/i.test(q)) {
    return PRIMARY_ISSUE.PROCEDURAL;
  }

  return PRIMARY_ISSUE.GENERAL_TAX;
}

function detectSubIssue(question = "", primaryIssue = PRIMARY_ISSUE.GENERAL_TAX, domains = []) {
  const q = lower(question);

  if (primaryIssue === PRIMARY_ISSUE.VAT_REFUND) return "VAT_REFUND/SECTION_112";
  if (primaryIssue === PRIMARY_ISSUE.VAT_LIABILITY) {
    if (/\bdefine vat|what is vat|nature of vat\b/i.test(q)) return "VAT_LIABILITY/NATURE_SCOPE";
    if (/\boutput vat\b/i.test(q)) return "VAT_LIABILITY/OUTPUT_VAT";
    if (/\bgross receipts|gross selling price\b/i.test(q)) return "VAT_LIABILITY/TAX_BASE";
    return "VAT_LIABILITY/GENERAL";
  }

  if (primaryIssue === PRIMARY_ISSUE.VAT_EXEMPTION) return "VAT_EXEMPTION/SECTION_109";
  if (primaryIssue === PRIMARY_ISSUE.ZERO_RATED_SALES) return "VAT_LIABILITY/ZERO_RATED_SALES";

  if (primaryIssue === PRIMARY_ISSUE.INCOME_TAX) {
    if (/\bmcit\b/i.test(q)) return "INCOME_TAX/MCIT";
    if (/\brcit\b/i.test(q)) return "INCOME_TAX/RCIT";
    if (/\bnolco\b/i.test(q)) return "INCOME_TAX/NOLCO";
    if (/\bdeductible|non[- ]deductible|deduction\b/i.test(q)) return "INCOME_TAX/DEDUCTIBILITY";
    return "INCOME_TAX/GENERAL";
  }

  if (primaryIssue === PRIMARY_ISSUE.WITHHOLDING) {
    if (/\bewt|expanded\b/i.test(q)) return "WITHHOLDING/EWT";
    if (/\bcwt|creditable\b/i.test(q)) return "WITHHOLDING/CWT";
    if (/\bfwt|final withholding\b/i.test(q)) return "WITHHOLDING/FWT";
    return "WITHHOLDING/GENERAL";
  }

  if (primaryIssue === PRIMARY_ISSUE.TRANSACTION) {
    if (/\bprincipal\b|\bagent\b/i.test(q)) return "TRANSACTION/PRINCIPAL_AGENT";
    if (/\breimbursement\b|\breimbursable\b|\bpass[- ]through\b/i.test(q)) return "TRANSACTION/REIMBURSEMENT_PASS_THROUGH";
    if (/\blease\b|\bconcession\b/i.test(q)) return "TRANSACTION/LEASE_VS_CONCESSION";
    if (/\bservice\b|\bsale\b/i.test(q)) return "TRANSACTION/SERVICE_VS_SALE";
    if (/\beconomic substance\b|\bsubstance over form\b/i.test(q)) return "TRANSACTION/ECONOMIC_SUBSTANCE";
    if (/\bdfs\b|\bdeposit for future subscription\b|\bequity\b|\bliability\b/i.test(q)) return "TRANSACTION/LIABILITY_VS_EQUITY";
    return "TRANSACTION/GENERAL";
  }

  if (primaryIssue === PRIMARY_ISSUE.CONTRACT) {
    if (/\blease\b|\bconcession\b/i.test(q)) return "CONTRACT/LEASE_CONCESSION";
    return "CONTRACT/INTERPRETATION";
  }

  if (primaryIssue === PRIMARY_ISSUE.ASSESSMENT) {
    if (/\bloa\b/i.test(q)) return "ASSESSMENT/LOA";
    if (/\bpan\b|\bfan\b|\bfld\b/i.test(q)) return "ASSESSMENT/PAN_FAN_FLD";
    if (/\bprescription\b|\bprescriptive\b/i.test(q)) return "ASSESSMENT/PRESCRIPTION";
    if (/\bprotest\b|\bappeal\b|\bcta\b/i.test(q)) return "ASSESSMENT/REMEDIES";
    return "ASSESSMENT/GENERAL";
  }

  if (primaryIssue === PRIMARY_ISSUE.ACCOUNTING) return "ACCOUNTING/PFRS_TAX";
  if (primaryIssue === PRIMARY_ISSUE.AUDIT) return "AUDIT/EVIDENCE_RISK";
  if (primaryIssue === PRIMARY_ISSUE.EVIDENTIARY) return "EVIDENTIARY/SUBSTANTIATION";
  if (primaryIssue === PRIMARY_ISSUE.CASE_LAW) return "CASE_LAW/JURISPRUDENCE";
  if (primaryIssue === PRIMARY_ISSUE.ISSUANCE) return "ISSUANCE/EXACT_AUTHORITY";

  return `${primaryIssue}/GENERAL`;
}

function detectLegalDimensions(question = "", primaryIssue = PRIMARY_ISSUE.GENERAL_TAX) {
  const q = lower(question);
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  if ([
    PRIMARY_ISSUE.VAT_LIABILITY,
    PRIMARY_ISSUE.VAT_EXEMPTION,
    PRIMARY_ISSUE.ZERO_RATED_SALES,
    PRIMARY_ISSUE.INCOME_TAX,
    PRIMARY_ISSUE.WITHHOLDING
  ].includes(primaryIssue)) {
    dimensions.push(LEGAL_DIMENSION.SUBSTANTIVE);
  }

  if ([PRIMARY_ISSUE.VAT_REFUND, PRIMARY_ISSUE.PROCEDURAL, PRIMARY_ISSUE.ASSESSMENT].includes(primaryIssue)) {
    dimensions.push(LEGAL_DIMENSION.PROCEDURAL);
  }

  if ([PRIMARY_ISSUE.EVIDENTIARY, PRIMARY_ISSUE.VAT_REFUND].includes(primaryIssue)) {
    dimensions.push(LEGAL_DIMENSION.EVIDENTIARY);
  }

  if (primaryIssue === PRIMARY_ISSUE.JURISDICTIONAL) {
    dimensions.push(LEGAL_DIMENSION.JURISDICTIONAL);
  }

  if (primaryIssue === PRIMARY_ISSUE.CONTRACT) {
    dimensions.push(LEGAL_DIMENSION.CONTRACTUAL);
  }

  if (primaryIssue === PRIMARY_ISSUE.TRANSACTION) {
    dimensions.push(LEGAL_DIMENSION.TRANSACTION, LEGAL_DIMENSION.FACTUAL);
  }

  if (primaryIssue === PRIMARY_ISSUE.ECONOMIC_SUBSTANCE) {
    dimensions.push(LEGAL_DIMENSION.ECONOMIC_SUBSTANCE, LEGAL_DIMENSION.FACTUAL);
  }

  if (primaryIssue === PRIMARY_ISSUE.ACCOUNTING) dimensions.push(LEGAL_DIMENSION.ACCOUNTING);
  if (primaryIssue === PRIMARY_ISSUE.AUDIT) dimensions.push(LEGAL_DIMENSION.AUDIT);

  push(/\bdeadline|due date|filing|appeal|protest|prescription|assessment|return|form\b/i.test(q), LEGAL_DIMENSION.PROCEDURAL);
  push(/\binvoice|receipt|proof|evidence|substantiation|documentary\b/i.test(q), LEGAL_DIMENSION.EVIDENTIARY);
  push(/\bjurisdiction|jurisdictional|cta|condition precedent\b/i.test(q), LEGAL_DIMENSION.JURISDICTIONAL);
  push(/\beffective|retroactive|prospective|superseded|amended|repealed\b/i.test(q), LEGAL_DIMENSION.TEMPORAL);
  push(/\brmc|rmo|ramo|bir ruling|administrative|interpretative|clarificatory\b/i.test(q), LEGAL_DIMENSION.ADMINISTRATIVE);
  push(/\bfacts|actual|scenario|transaction|documentation\b/i.test(q), LEGAL_DIMENSION.FACTUAL);
  push(/\bcontract|agreement|clause|lease|concession\b/i.test(q), LEGAL_DIMENSION.CONTRACTUAL);
  push(/\beconomic substance|substance over form|sham|simulation\b/i.test(q), LEGAL_DIMENSION.ECONOMIC_SUBSTANCE);

  return unique(dimensions.length ? dimensions : [LEGAL_DIMENSION.GENERAL]);
}

function detectQueryIntent(question = "", primaryIssue = PRIMARY_ISSUE.GENERAL_TAX) {
  const q = lower(question);

  if (/\bwhat is\b|\bdefine\b|\bmeaning\b|\bnature of\b|\bscope of\b/i.test(q)) return QUERY_INTENT.DEFINITION;
  if ([PRIMARY_ISSUE.PROCEDURAL, PRIMARY_ISSUE.WITHHOLDING].includes(primaryIssue)) return QUERY_INTENT.COMPLIANCE;
  if ([PRIMARY_ISSUE.ASSESSMENT, PRIMARY_ISSUE.JURISDICTIONAL, PRIMARY_ISSUE.CASE_LAW].includes(primaryIssue)) return QUERY_INTENT.DISPUTE;
  if (/\bcan we\b|\bshould we\b|\bis it better\b|\bstructure\b|\bplanning\b|\btax efficient\b/i.test(q)) return QUERY_INTENT.PLANNING;

  return QUERY_INTENT.ADVISORY;
}

function buildLegalQuestionPresented({ question = "", primaryIssue, subIssue, domains = [] }) {
  const templates = {
    [PRIMARY_ISSUE.VAT_LIABILITY]: "Whether the transaction, person, sale, service, or receipt is subject to VAT and what VAT rule controls.",
    [PRIMARY_ISSUE.VAT_REFUND]: "Whether the taxpayer may claim input VAT refund or tax credit and what procedural, jurisdictional, and substantiation requirements apply.",
    [PRIMARY_ISSUE.VAT_EXEMPTION]: "Whether the transaction or entity is VAT-exempt under Philippine tax law.",
    [PRIMARY_ISSUE.ZERO_RATED_SALES]: "Whether the sale qualifies as zero-rated and what documentation is required.",
    [PRIMARY_ISSUE.INCOME_TAX]: "What income tax rule applies, including taxability, deductibility, RCIT, MCIT, NOLCO, or income recognition.",
    [PRIMARY_ISSUE.WITHHOLDING]: "Whether withholding tax applies, what type applies, when withholding arises, and who is the withholding agent.",
    [PRIMARY_ISSUE.ASSESSMENT]: "What assessment, protest, appeal, prescription, or due process rule applies.",
    [PRIMARY_ISSUE.PROCEDURAL]: "What filing, payment, registration, reporting, or BIR administrative procedure applies.",
    [PRIMARY_ISSUE.EVIDENTIARY]: "What documentary evidence is required to support the tax position.",
    [PRIMARY_ISSUE.JURISDICTIONAL]: "What jurisdictional rule or condition precedent applies.",
    [PRIMARY_ISSUE.TRANSACTION]: "How the transaction should be legally characterized for Philippine tax, accounting, audit, and compliance purposes.",
    [PRIMARY_ISSUE.CONTRACT]: "How the contract, agreement, lease, concession, clause, rights, obligations, and tax consequences should be interpreted.",
    [PRIMARY_ISSUE.ECONOMIC_SUBSTANCE]: "Whether the transaction has economic substance and whether substance-over-form doctrine affects the tax treatment.",
    [PRIMARY_ISSUE.ACCOUNTING]: "What accounting treatment and related Philippine tax consequences apply.",
    [PRIMARY_ISSUE.AUDIT]: "What audit risk, evidence requirement, and reporting consequence applies.",
    [PRIMARY_ISSUE.CASE_LAW]: "What jurisprudence is directly applicable to the classified legal issue.",
    [PRIMARY_ISSUE.ISSUANCE]: "What exact BIR issuance or authority governs the issue."
  };

  return templates[primaryIssue] || normalizeText(question) || "What Philippine tax rule governs the user's issue?";
}

function buildTargetAuthorities({ primaryIssue, subIssue, domains = [], exactAuthority }) {
  const groups = {
    constitution: [],
    nirc: [],
    supremeCourt: [],
    ctaEnBanc: [],
    ctaDivision: [],
    rr: [],
    rmc: [],
    rmo: [],
    ramo: [],
    birRulings: [],
    pfrs: [],
    pas: [],
    psa: []
  };

  const add = (key, value) => {
    if (groups[key] && value) groups[key].push(value);
  };

  if (exactAuthority?.detected) {
    if (exactAuthority.type === "STATUTE") add("nirc", exactAuthority.reference);
    else if (exactAuthority.type === "SUPREME_COURT") add("supremeCourt", exactAuthority.reference);
    else if (exactAuthority.type === "CTA_DIVISION") add("ctaDivision", exactAuthority.reference);
    else if (exactAuthority.type === "RR") add("rr", exactAuthority.reference);
    else if (exactAuthority.type === "RMC") add("rmc", exactAuthority.reference);
    else if (exactAuthority.type === "RMO") add("rmo", exactAuthority.reference);
    else if (exactAuthority.type === "RAMO") add("ramo", exactAuthority.reference);
    else add("birRulings", exactAuthority.reference);
  }

  if ([PRIMARY_ISSUE.VAT_LIABILITY, PRIMARY_ISSUE.VAT_EXEMPTION, PRIMARY_ISSUE.ZERO_RATED_SALES].includes(primaryIssue)) {
    add("nirc", "NIRC Sections 105 to 115");
    add("rr", "RR No. 16-2005");

    if (primaryIssue === PRIMARY_ISSUE.VAT_LIABILITY) {
      add("nirc", "NIRC Sections 105, 106, 107, 108");
      add("supremeCourt", "VAT nature and scope cases");
    }

    if (primaryIssue === PRIMARY_ISSUE.VAT_EXEMPTION) {
      add("nirc", "NIRC Section 109");
      add("supremeCourt", "VAT exemption jurisprudence");
    }
  }

  if (primaryIssue === PRIMARY_ISSUE.VAT_REFUND) {
    add("nirc", "NIRC Section 112");
    add("rr", "RR No. 16-2005 VAT refund provisions");
    add("supremeCourt", "Aichi");
    add("supremeCourt", "San Roque");
    add("supremeCourt", "CIR v. Mirant");
    add("supremeCourt", "CIR v. Team Energy");
    add("ctaEnBanc", "CTA En Banc VAT refund cases");
  }

  if (primaryIssue === PRIMARY_ISSUE.INCOME_TAX) {
    add("nirc", "NIRC Sections 24 to 32");
    add("nirc", "NIRC Section 34");
    if (subIssue.includes("MCIT")) add("nirc", "NIRC Section 27(E)");
    if (subIssue.includes("NOLCO")) add("nirc", "NIRC Section 34(D)(3)");
    add("rr", "Applicable income tax regulations");
  }

  if (primaryIssue === PRIMARY_ISSUE.WITHHOLDING) {
    add("nirc", "NIRC withholding tax provisions");
    add("rr", "RR No. 2-98");
    add("rmc", "Applicable BIR withholding tax circulars");
  }

  if (primaryIssue === PRIMARY_ISSUE.TRANSACTION) {
    add("nirc", "Relevant gross income, VAT, withholding, and deduction provisions");
    add("rr", "Relevant VAT and withholding regulations");
    add("rmc", "BIR guidance on reimbursements, pass-through charges, and invoicing");
    add("supremeCourt", "Substance over form jurisprudence");
    add("pfrs", "PFRS 15 principal-agent guidance");
  }

  if (primaryIssue === PRIMARY_ISSUE.CONTRACT) {
    add("nirc", "Relevant NIRC provisions affected by contract characterization");
    add("supremeCourt", "Contract interpretation and tax substance cases");
    add("rr", "Applicable implementing regulations");
  }

  if (primaryIssue === PRIMARY_ISSUE.ASSESSMENT) {
    add("nirc", "NIRC Sections 203, 222, 228");
    add("supremeCourt", "Assessment, protest, due process, and prescription jurisprudence");
    add("ctaEnBanc", "CTA En Banc procedural decisions");
  }

  if (primaryIssue === PRIMARY_ISSUE.ACCOUNTING) {
    add("pfrs", "PFRS");
    add("pas", "PAS");
    add("nirc", "Related NIRC tax consequence provisions");
  }

  if (primaryIssue === PRIMARY_ISSUE.AUDIT) {
    add("psa", "Philippine Standards on Auditing");
    add("pfrs", "PFRS/PAS financial reporting standards");
  }

  for (const key of Object.keys(groups)) groups[key] = unique(groups[key]);

  const flat = unique([
    ...groups.constitution.length ? [AUTHORITY_TYPE.CONSTITUTION] : [],
    ...groups.nirc.length ? [AUTHORITY_TYPE.STATUTE] : [],
    ...groups.supremeCourt.length ? [AUTHORITY_TYPE.SUPREME_COURT] : [],
    ...groups.ctaEnBanc.length ? [AUTHORITY_TYPE.CTA_EN_BANC] : [],
    ...groups.ctaDivision.length ? [AUTHORITY_TYPE.CTA_DIVISION] : [],
    ...groups.rr.length ? [AUTHORITY_TYPE.RR] : [],
    ...groups.rmc.length ? [AUTHORITY_TYPE.RMC] : [],
    ...groups.rmo.length ? [AUTHORITY_TYPE.RMO] : [],
    ...groups.ramo.length ? [AUTHORITY_TYPE.RAMO] : [],
    ...groups.birRulings.length ? [AUTHORITY_TYPE.BIR_RULING] : [],
    ...groups.pfrs.length ? [AUTHORITY_TYPE.PFRS] : [],
    ...groups.pas.length ? [AUTHORITY_TYPE.PAS] : [],
    ...groups.psa.length ? [AUTHORITY_TYPE.PSA] : []
  ]);

  return {
    groups,
    flat
  };
}

function buildKeyTerms({ question = "", primaryIssue, subIssue, domains = [], exactAuthority }) {
  const q = lower(question);
  const terms = [primaryIssue, subIssue, ...domains];

  if (exactAuthority?.reference) terms.push(exactAuthority.reference);

  const patterns = [
    ["VAT", /\bvat\b|\bvalue[- ]added tax\b/i],
    ["output VAT", /\boutput vat\b/i],
    ["input VAT", /\binput vat\b/i],
    ["zero-rated sales", /\bzero[- ]rated\b/i],
    ["VAT-exempt", /\bvat[- ]exempt\b|\bexempt\b/i],
    ["refund", /\brefund\b|\btax credit\b|\btcc\b/i],
    ["withholding tax", /\bwithholding\b|\bewt\b|\bcwt\b|\bfwt\b/i],
    ["MCIT", /\bmcit\b/i],
    ["RCIT", /\brcit\b/i],
    ["NOLCO", /\bnolco\b/i],
    ["principal-agent", /\bprincipal\b|\bagent\b/i],
    ["reimbursement", /\breimbursement\b|\breimbursable\b/i],
    ["pass-through", /\bpass[- ]through\b/i],
    ["lease", /\blease\b/i],
    ["concession", /\bconcession\b/i],
    ["economic substance", /\beconomic substance\b|\bsubstance over form\b/i],
    ["assessment", /\bassessment\b|\bloa\b|\bpan\b|\bfan\b|\bfld\b/i],
    ["prescription", /\bprescription\b|\bprescriptive\b/i],
    ["evidence", /\bevidence\b|\bsubstantiation\b|\binvoice\b|\breceipt\b/i]
  ];

  for (const [term, regex] of patterns) {
    if (regex.test(q)) terms.push(term);
  }

  return unique(terms);
}

function detectComplexity({ question = "", primaryIssue, domains = [], keyTerms = [] }) {
  let score = 0;
  const q = lower(question);

  if (domains.length > 1) score += 2;
  if (keyTerms.length >= 6) score += 1;
  if (question.length > 220) score += 1;

  if ([PRIMARY_ISSUE.TRANSACTION, PRIMARY_ISSUE.CONTRACT, PRIMARY_ISSUE.ASSESSMENT, PRIMARY_ISSUE.ECONOMIC_SUBSTANCE].includes(primaryIssue)) {
    score += 2;
  }

  if (/\bconflict|prevails|hierarchy|doctrine|jurisprudence|contract|agreement|actual facts|audit risk|legal consequence\b/i.test(q)) {
    score += 2;
  }

  if (score >= 4) return COMPLEXITY.MULTI_ISSUE;
  if (score === 3) return COMPLEXITY.COMPLEX;
  if (score >= 1) return COMPLEXITY.MODERATE;
  return COMPLEXITY.SIMPLE;
}

function detectFactSensitivity(primaryIssue, subIssue, question = "") {
  const q = lower(question);

  if (primaryIssue === PRIMARY_ISSUE.VAT_LIABILITY && /\bwhat is|define|meaning|nature\b/i.test(q)) {
    return FACT_SENSITIVITY.LOW;
  }

  if ([PRIMARY_ISSUE.TRANSACTION, PRIMARY_ISSUE.CONTRACT, PRIMARY_ISSUE.EVIDENTIARY, PRIMARY_ISSUE.ACCOUNTING, PRIMARY_ISSUE.AUDIT, PRIMARY_ISSUE.ASSESSMENT, PRIMARY_ISSUE.ECONOMIC_SUBSTANCE].includes(primaryIssue)) {
    return FACT_SENSITIVITY.HIGH;
  }

  if (/\bcontract|agreement|invoice|receipt|actual|facts|scenario|transaction|booked|audit|supporting document\b/i.test(q)) {
    return FACT_SENSITIVITY.HIGH;
  }

  return FACT_SENSITIVITY.MODERATE;
}

function detectRetrievalStrategy({ primaryIssue, exactAuthority, factSensitivity }) {
  if (exactAuthority?.detected) return RETRIEVAL_STRATEGY.EXACT_AUTHORITY;
  if (primaryIssue === PRIMARY_ISSUE.VAT_LIABILITY) return RETRIEVAL_STRATEGY.FOUNDATIONAL;
  if ([PRIMARY_ISSUE.PROCEDURAL, PRIMARY_ISSUE.ASSESSMENT, PRIMARY_ISSUE.VAT_REFUND, PRIMARY_ISSUE.JURISDICTIONAL].includes(primaryIssue)) return RETRIEVAL_STRATEGY.PROCEDURAL;
  if ([PRIMARY_ISSUE.CASE_LAW, PRIMARY_ISSUE.DOCTRINE].includes(primaryIssue)) return RETRIEVAL_STRATEGY.JURISPRUDENTIAL;
  if ([PRIMARY_ISSUE.TRANSACTION, PRIMARY_ISSUE.CONTRACT, PRIMARY_ISSUE.ACCOUNTING, PRIMARY_ISSUE.AUDIT, PRIMARY_ISSUE.ECONOMIC_SUBSTANCE].includes(primaryIssue)) return RETRIEVAL_STRATEGY.FACT_DRIVEN;
  if (primaryIssue === PRIMARY_ISSUE.EVIDENTIARY) return RETRIEVAL_STRATEGY.EVIDENCE_DRIVEN;
  if (factSensitivity === FACT_SENSITIVITY.HIGH) return RETRIEVAL_STRATEGY.FACT_DRIVEN;
  return RETRIEVAL_STRATEGY.MIXED;
}

function detectCaseRoleFilters(primaryIssue, subIssue, domains = []) {
  const filters = [];

  if (primaryIssue === PRIMARY_ISSUE.VAT_LIABILITY) filters.push("foundational", "definition", "scope", "VAT liability");
  if (primaryIssue === PRIMARY_ISSUE.VAT_REFUND) filters.push("refund", "procedural", "substantiation", "Section 112");
  if (primaryIssue === PRIMARY_ISSUE.ASSESSMENT) filters.push("assessment", "prescription", "protest", "appeal", "due process");
  if (primaryIssue === PRIMARY_ISSUE.WITHHOLDING) filters.push("withholding", "withholding agent", "timing");
  if (primaryIssue === PRIMARY_ISSUE.TRANSACTION) filters.push("substance over form", "transaction characterization", "principal-agent", "economic substance");
  if (primaryIssue === PRIMARY_ISSUE.CONTRACT) filters.push("contract interpretation", "lease", "concession");
  if (domains.includes("VAT")) filters.push("VAT");
  if (domains.includes("INCOME_TAX")) filters.push("income tax");
  if (domains.includes("WITHHOLDING_TAX")) filters.push("withholding tax");

  return unique(filters);
}

function buildExcludedAuthorities(primaryIssue, subIssue, domains = []) {
  const exclusions = [];

  if (primaryIssue === PRIMARY_ISSUE.VAT_LIABILITY) {
    exclusions.push(
      "VAT refund cases unless they define the nature of VAT",
      "Section 112 procedural cases unless the issue is VAT refund"
    );
  }

  if (domains.includes("VAT") && primaryIssue !== PRIMARY_ISSUE.VAT_REFUND) {
    exclusions.push("VAT refund cases unless the query involves Section 112 or input VAT refund");
  }

  if (primaryIssue !== PRIMARY_ISSUE.ASSESSMENT) {
    exclusions.push("procedural protest or CTA jurisdiction cases unless directly relevant");
  }

  if (![PRIMARY_ISSUE.TRANSACTION, PRIMARY_ISSUE.CONTRACT, PRIMARY_ISSUE.ECONOMIC_SUBSTANCE].includes(primaryIssue)) {
    exclusions.push("transaction characterization cases unless directly relevant");
  }

  return unique(exclusions);
}

function detectMischaracterizationRisk(primaryIssue, subIssue, question = "") {
  const q = lower(question);

  if ([PRIMARY_ISSUE.TRANSACTION, PRIMARY_ISSUE.CONTRACT, PRIMARY_ISSUE.ECONOMIC_SUBSTANCE].includes(primaryIssue)) return "high";

  if (/\breimbursement|pass[- ]through|principal|agent|concession|lease|bundled|package|economic substance|substance over form|dfs\b/i.test(q)) {
    return "high";
  }

  if ([PRIMARY_ISSUE.VAT_EXEMPTION, PRIMARY_ISSUE.WITHHOLDING, PRIMARY_ISSUE.ACCOUNTING].includes(primaryIssue)) {
    return "moderate";
  }

  return "low";
}

function shouldRequireTransactionCharacterization(primaryIssue, question = "") {
  return (
    [PRIMARY_ISSUE.TRANSACTION, PRIMARY_ISSUE.CONTRACT, PRIMARY_ISSUE.ECONOMIC_SUBSTANCE].includes(primaryIssue) ||
    detectMischaracterizationRisk(primaryIssue, "", question) === "high"
  );
}

function shouldRequireFactPattern(primaryIssue, factSensitivity) {
  return (
    factSensitivity === FACT_SENSITIVITY.HIGH ||
    [PRIMARY_ISSUE.TRANSACTION, PRIMARY_ISSUE.CONTRACT, PRIMARY_ISSUE.EVIDENTIARY, PRIMARY_ISSUE.ACCOUNTING, PRIMARY_ISSUE.AUDIT, PRIMARY_ISSUE.ASSESSMENT].includes(primaryIssue)
  );
}

function shouldRequireDoctrinalAnalysis(primaryIssue, question = "") {
  const q = lower(question);

  return (
    [PRIMARY_ISSUE.DOCTRINE, PRIMARY_ISSUE.CASE_LAW, PRIMARY_ISSUE.ASSESSMENT, PRIMARY_ISSUE.VAT_EXEMPTION, PRIMARY_ISSUE.TRANSACTION, PRIMARY_ISSUE.ECONOMIC_SUBSTANCE].includes(primaryIssue) ||
    /\bdoctrine|jurisprudence|case|conflict|prevails|hierarchy\b/i.test(q)
  );
}

function shouldRunConflictCheck(primaryIssue, question = "") {
  const q = lower(question);

  return (
    /\bconflict|contradict|prevails|override|hierarchy|versus|vs\.?\b/i.test(q) ||
    [PRIMARY_ISSUE.CASE_LAW, PRIMARY_ISSUE.DOCTRINE, PRIMARY_ISSUE.ASSESSMENT].includes(primaryIssue)
  );
}

function classifyTaxIssue(question = "") {
  const normalizedQuestion = normalizeText(question);
  const exactAuthority = detectExactAuthority(normalizedQuestion);
  const domains = detectTaxDomain(normalizedQuestion);
  const primaryIssue = exactAuthority.detected
    ? normalizeAuthority(exactAuthority.type) === "SUPREME_COURT" || normalizeAuthority(exactAuthority.type) === "CTA_DIVISION"
      ? PRIMARY_ISSUE.CASE_LAW
      : PRIMARY_ISSUE.ISSUANCE
    : detectPrimaryIssue(normalizedQuestion);

  const subIssue = detectSubIssue(normalizedQuestion, primaryIssue, domains);
  const legalDimensions = detectLegalDimensions(normalizedQuestion, primaryIssue);
  const queryIntent = detectQueryIntent(normalizedQuestion, primaryIssue);

  const keyTerms = buildKeyTerms({
    question: normalizedQuestion,
    primaryIssue,
    subIssue,
    domains,
    exactAuthority
  });

  const complexityFlag = detectComplexity({
    question: normalizedQuestion,
    primaryIssue,
    domains,
    keyTerms
  });

  const factSensitivity = detectFactSensitivity(primaryIssue, subIssue, normalizedQuestion);

  const retrievalStrategy = detectRetrievalStrategy({
    primaryIssue,
    exactAuthority,
    factSensitivity
  });

  const authorityTargets = buildTargetAuthorities({
    primaryIssue,
    subIssue,
    domains,
    exactAuthority
  });

  const legalQuestionPresented = buildLegalQuestionPresented({
    question: normalizedQuestion,
    primaryIssue,
    subIssue,
    domains
  });

  const transactionCharacterizationRequired =
    shouldRequireTransactionCharacterization(primaryIssue, normalizedQuestion);

  const factPatternRequired = shouldRequireFactPattern(primaryIssue, factSensitivity);
  const doctrinalAnalysisRequired = shouldRequireDoctrinalAnalysis(primaryIssue, normalizedQuestion);
  const potentialConflictCheck = shouldRunConflictCheck(primaryIssue, normalizedQuestion);

  return {
    engine: "TINA_ISSUE_CLASSIFICATION_ENGINE",
    version: ENGINE_VERSION,
    originalQuery: question,
    normalizedQuery: normalizedQuestion,

    primaryIssue,
    subIssue,
    subIssues: unique([primaryIssue, subIssue]),

    queryIntent,
    legalQuestionPresented,
    legalDimensions,

    taxDomains: domains,
    targetAuthorities: authorityTargets.flat,
    targetAuthorityGroups: authorityTargets.groups,

    keyTerms,
    complexityFlag,
    factSensitivity,
    retrievalStrategy,

    transactionCharacterizationRequired,
    factPatternRequired,
    doctrinalAnalysisRequired,
    potentialConflictCheck,

    caseRoleFilters: detectCaseRoleFilters(primaryIssue, subIssue, domains),
    excludedAuthorities: buildExcludedAuthorities(primaryIssue, subIssue, domains),
    mischaracterizationRisk: detectMischaracterizationRisk(primaryIssue, subIssue, normalizedQuestion),

    exactAuthority,

    retrievalControls: {
      issueFirst: true,
      suppressIssueMismatchedCases: true,
      suppressUnrelatedProceduralCases: primaryIssue !== PRIMARY_ISSUE.PROCEDURAL,
      suppressVatRefundCasesUnlessRefundIssue:
        domains.includes("VAT") && primaryIssue !== PRIMARY_ISSUE.VAT_REFUND,
      requirePrimaryAuthorityForDefinitions: primaryIssue === PRIMARY_ISSUE.VAT_LIABILITY,
      requireFactDisclosureBeforeConclusion: factPatternRequired,
      allowConflictLabelOnlyIfSameIssueAndOppositeHolding: true,
      useIssueClassificationMatch: true,
      useTargetAuthorityMatch: true,
      useControllingPrecedence: true
    },

    downstreamRouting: {
      useRetrievalEngine: true,
      useRerankerEngine: true,
      useJurisprudenceEngine: doctrinalAnalysisRequired,
      useConflictEngine: potentialConflictCheck,
      useTransactionCharacterizationEngine: transactionCharacterizationRequired,
      useFactPatternEngine: factPatternRequired,
      useEvidenceEvaluationEngine: factPatternRequired || primaryIssue === PRIMARY_ISSUE.EVIDENTIARY,
      useAnswerRenderer: true
    },

    sourceOrderingPolicy: {
      useIssueClassificationMatch: true,
      useTargetAuthorityMatch: true,
      useControllingPrecedence: true,
      hideIssueMismatchedSources: true
    },

    conflictDisplayPolicy: {
      displayConflictYesOnlyWhenConflictTrue: true,
      requireCompleteConflictMetadata: true,
      requireSameIssueGate: true,
      requireOppositeHoldingGate: true
    }
  };
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
  }

  const groups = classification.targetAuthorityGroups || {};
  for (const authorityGroup of Object.values(groups)) {
    for (const authority of safeArray(authorityGroup)) {
      queries.push(`${classification.legalQuestionPresented} ${authority}`);
    }
  }

  for (const term of classification.keyTerms || []) {
    queries.push(`${classification.primaryIssue} ${classification.subIssue} ${term}`);
  }

  return unique(queries.map(normalizeText)).slice(0, maxQueries);
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

  if (/\bvat refund|section 112|120\+30|input vat refund|unutilized input vat|excess input vat\b/i.test(haystack)) issues.push(PRIMARY_ISSUE.VAT_REFUND);
  if (/\bvat liability|output vat|vatable|sale of goods|sale of services|gross receipts|value-added tax\b/i.test(haystack)) issues.push(PRIMARY_ISSUE.VAT_LIABILITY);
  if (/\bwithholding|ewt|cwt|fwt\b/i.test(haystack)) issues.push(PRIMARY_ISSUE.WITHHOLDING);
  if (/\bincome tax|rcit|mcit|nolco|deductible|taxable income\b/i.test(haystack)) issues.push(PRIMARY_ISSUE.INCOME_TAX);
  if (/\bprincipal|agent|pass-through|reimbursement|economic substance|substance over form|concession\b/i.test(haystack)) issues.push(PRIMARY_ISSUE.TRANSACTION);
  if (/\bcontract|agreement|lease|clause\b/i.test(haystack)) issues.push(PRIMARY_ISSUE.CONTRACT);
  if (/\binvoice|receipt|substantiation|evidence|proof\b/i.test(haystack)) issues.push(PRIMARY_ISSUE.EVIDENTIARY);
  if (/\bpfrs|pas|financial statements|afs\b/i.test(haystack)) issues.push(PRIMARY_ISSUE.ACCOUNTING);

  return unique(issues);
}

function isIssueClassificationCompatibleWithDoc(classification = {}, doc = {}) {
  const docIssues = detectDocIssues(doc);
  const primary = classification.primaryIssue;
  const subIssues = safeArray(classification.subIssues);

  if (!docIssues.length) return true;

  if (
    primary === PRIMARY_ISSUE.VAT_LIABILITY &&
    docIssues.includes(PRIMARY_ISSUE.VAT_REFUND) &&
    !subIssues.includes(PRIMARY_ISSUE.VAT_REFUND)
  ) {
    return false;
  }

  if (
    primary === PRIMARY_ISSUE.VAT_REFUND &&
    docIssues.includes(PRIMARY_ISSUE.VAT_LIABILITY) &&
    !subIssues.includes(PRIMARY_ISSUE.VAT_LIABILITY)
  ) {
    return false;
  }

  if (
    primary === PRIMARY_ISSUE.WITHHOLDING &&
    (docIssues.includes(PRIMARY_ISSUE.VAT_REFUND) || docIssues.includes(PRIMARY_ISSUE.VAT_LIABILITY))
  ) {
    return false;
  }

  return (
    docIssues.includes(primary) ||
    subIssues.some((issue) => docIssues.includes(issue)) ||
    primary === PRIMARY_ISSUE.GENERAL_TAX
  );
}

function issueClassificationEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ISSUE_CLASSIFICATION_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    issueFirstRetrievalReady: true,
    canonicalPrimaryIssueReady: true,
    legalDimensionsReady: true,
    targetAuthorityArrayReady: true,
    sourceOrderingPolicyReady: true,
    conflictDisplayPolicyReady: true,
    jurisprudenceFilteringReady: true,
    conflictGateReady: true,
    transactionCharacterizationReady: true,
    factPatternReady: true
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
  detectExactAuthority,
  detectTaxDomain,
  detectPrimaryIssue,
  detectSubIssue,
  detectLegalDimensions,
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc,
  issueClassificationEngineHealthCheck
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
  detectExactAuthority,
  detectTaxDomain,
  detectPrimaryIssue,
  detectSubIssue,
  detectLegalDimensions,
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc,
  issueClassificationEngineHealthCheck
};
