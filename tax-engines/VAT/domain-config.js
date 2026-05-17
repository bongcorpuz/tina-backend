// FILE: tax-engines/VAT/domain-config.js
"use strict";

/**
 * TINA VAT Domain Config
 * Version: 2.0.0
 *
 * Purpose:
 * - Controlling VAT domain map
 * - VAT sub-issue classification
 * - Target authorities and retrieval hints
 * - Authority hierarchy and Google Drive folder priority
 * - Downstream compatibility with:
 *   issue-classification-engine.js
 *   retrieval-engine.js
 *   context-orchestration-engine.js
 *   rag-answer-handler.js
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "../shared/authority-hierarchy.js";

export const VAT_DOMAIN_CONFIG_VERSION = "2.0.0";

export const VAT_PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS",
  "06_COURT_CASES"
]);

export const VAT_EXCLUDED_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

export const VAT_AUTHORITY_HIERARCHY = Object.freeze([
  "CONSTITUTION",
  "STATUTE",
  "TAX_TREATY",
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

export const VAT_REQUIRED_ANSWER_SECTIONS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
  "D. SUPPORTING JURISPRUDENCE",
  "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "F. PRACTICAL NOTE / APPLICATION"
]);

export const VAT_DOMAIN = Object.freeze({
  code: "VAT",
  domainCode: "VAT",
  name: "Value-Added Tax",
  domainName: "Value-Added Tax",
  title: "Value-Added Tax",
  primaryStatutes: [
    "NIRC Title IV",
    "NIRC Secs. 105–115",
    "RR 16-2005"
  ],
  defaultAuthorities: [
    "STATUTE",
    "RR",
    "RMC",
    "RMO",
    "BIR_RULING",
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "CTA_DIVISION"
  ],
  baseRetrievalStrategy: "VAT_DOMAIN_ISSUE_SPECIFIC_RETRIEVAL",
  priorityFolders: VAT_PRIORITY_FOLDERS,
  excludedFolders: VAT_EXCLUDED_FOLDERS,
  requiredAnswerSections: VAT_REQUIRED_ANSWER_SECTIONS,
  sourceGroundingRequired: true
});

export const VAT_SUB_ISSUE = Object.freeze({
  DEFINITION: "DEFINITION",
  REFUND_CREDIT: "REFUND_CREDIT",
  ZERO_RATING: "ZERO_RATING",
  INPUT_TAX: "INPUT_TAX",
  EXEMPTION: "EXEMPTION",
  OUTPUT_TAX: "OUTPUT_TAX",
  REGISTRATION: "REGISTRATION",
  COMPLIANCE: "COMPLIANCE",
  WITHHOLDING_VAT: "WITHHOLDING_VAT",
  TRANSITIONAL_INPUT_TAX: "TRANSITIONAL_INPUT_TAX",
  DEEMED_SALE: "DEEMED_SALE",

  // Backward compatibility
  TRANSITIONAL: "TRANSITIONAL_INPUT_TAX"
});

export const VAT_IDENTITY_ENGINES = Object.freeze({
  DEFINITION: "./engines/definition-engine.js",
  REFUND_CREDIT: "./engines/refund-credit-engine.js",
  ZERO_RATING: "./engines/zero-rating-engine.js",
  INPUT_TAX: "./engines/input-tax-engine.js",
  EXEMPTION: "./engines/exemption-engine.js",
  OUTPUT_TAX: "./engines/output-tax-engine.js",
  REGISTRATION: "./engines/registration-engine.js",
  COMPLIANCE: "./engines/compliance-engine.js",
  WITHHOLDING_VAT: "./engines/withholding-vat-engine.js",
  TRANSITIONAL_INPUT_TAX: "./engines/transitional-input-tax-engine.js",
  DEEMED_SALE: "./engines/deemed-sale-engine.js",

  // Backward compatibility
  TRANSITIONAL: "./engines/transitional-input-tax-engine.js"
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
  priorityFolders = VAT_PRIORITY_FOLDERS,
  excludedFolders = VAT_EXCLUDED_FOLDERS,
  requiredAnswerSections = VAT_REQUIRED_ANSWER_SECTIONS,
  tpmProfile = "STANDARD",
  sourceGroundingRequired = true,
  legalDimensions = [],
  enginePath = null
}) {
  return Object.freeze({
    code: subIssue,
    subIssue,
    label,
    description,
    keywords,
    aliases,

    retrievalStrategy,

    targetAuthorities,
    controllingAuthorities,
    supportingAuthorities,
    supportingJurisprudence,

    priorityFolders,
    excludedFolders,
    requiredAnswerSections,
    tpmProfile,
    sourceGroundingRequired,

    authorityHierarchy: VAT_AUTHORITY_HIERARCHY,
    legalDimensions,
    enginePath,

    retrievalHints: {
      domainCode: VAT_DOMAIN.code,
      domainName: VAT_DOMAIN.name,
      subIssue,
      retrievalStrategy,
      targetAuthorities,
      controllingAuthorities,
      supportingAuthorities,
      supportingJurisprudence,
      priorityFolders,
      excludedFolders,
      preserveTargetAuthorityMatches: true,
      preserveIssueClassificationMatches: true,
      preserveControllingAuthorities: true,
      sourceGroundingRequired,
      compactSourcesOnly: true
    }
  });
}

export const VAT_SUB_ISSUE_REGISTRY = Object.freeze({
  DEFINITION: buildSubIssueConfig({
    subIssue: "DEFINITION",
    label: "Definition — Nature and scope of VAT",
    description:
      "Classifies queries asking what VAT is, what transactions are subject to VAT, and the foundational nature of VAT.",
    keywords: [
      "what is vat",
      "define vat",
      "definition of vat",
      "meaning of vat",
      "nature of vat",
      "scope of vat",
      "value-added tax",
      "transactions subject to vat",
      "vat liability",
      "sale of goods",
      "sale of services",
      "importation"
    ],
    aliases: [
      "VAT_DEFINITION",
      "NATURE_SCOPE",
      "FOUNDATIONAL_VAT"
    ],
    retrievalStrategy: "VAT_DEFINITION_AUTHORITY_FIRST",
    targetAuthorities: [
      "NIRC Secs. 105–108",
      "RR 16-2005",
      "CIR v. Seagate Technology",
      "CIR v. Aichi Forging",
      "CIR v. Toshiba"
    ],
    controllingAuthorities: [
      "NIRC Sec. 105",
      "NIRC Sec. 106",
      "NIRC Sec. 107",
      "NIRC Sec. 108"
    ],
    supportingAuthorities: [
      "RR 16-2005"
    ],
    supportingJurisprudence: [
      "CIR v. Seagate Technology",
      "CIR v. Aichi Forging",
      "CIR v. Toshiba"
    ],
    tpmProfile: "LIGHT",
    legalDimensions: ["SUBSTANTIVE"],
    enginePath: VAT_IDENTITY_ENGINES.DEFINITION
  }),

  REFUND_CREDIT: buildSubIssueConfig({
    subIssue: "REFUND_CREDIT",
    label: "Refund / Credit — VAT refund, tax credit, and Section 112 claims",
    description:
      "Classifies VAT refund, input VAT credit, TCC, administrative claim, judicial claim, and Section 112 timing issues.",
    keywords: [
      "vat refund",
      "refund",
      "tax credit",
      "tax credit certificate",
      "tcc",
      "input vat refund",
      "section 112",
      "sec. 112",
      "120-day",
      "30-day",
      "120+30",
      "administrative claim",
      "judicial claim",
      "unutilized input vat",
      "excess input vat",
      "claim for refund"
    ],
    aliases: [
      "VAT_REFUND",
      "INPUT_VAT_REFUND",
      "SECTION_112",
      "TAX_CREDIT"
    ],
    retrievalStrategy: "VAT_REFUND_CREDIT_PROCEDURAL_JURISPRUDENCE_FIRST",
    targetAuthorities: [
      "NIRC Sec. 112",
      "RR 16-2005",
      "CIR v. San Roque Power",
      "CIR v. Aichi Forging",
      "CIR v. Mirant Pagbilao",
      "CIR v. Pilipinas Total Gas"
    ],
    controllingAuthorities: [
      "NIRC Sec. 112"
    ],
    supportingAuthorities: [
      "RR 16-2005 VAT refund provisions",
      "BIR VAT refund administrative issuances"
    ],
    supportingJurisprudence: [
      "CIR v. San Roque Power",
      "CIR v. Aichi Forging",
      "CIR v. Mirant Pagbilao",
      "CIR v. Pilipinas Total Gas"
    ],
    tpmProfile: "HEAVY",
    legalDimensions: ["PROCEDURAL", "EVIDENTIARY", "JURISDICTIONAL"],
    enginePath: VAT_IDENTITY_ENGINES.REFUND_CREDIT
  }),

  ZERO_RATING: buildSubIssueConfig({
    subIssue: "ZERO_RATING",
    label: "Zero-Rating — Export sales, services to nonresidents, PEZA, and cross-border doctrine",
    description:
      "Classifies VAT zero-rating issues, export sales, effectively zero-rated transactions, PEZA transactions, and cross-border doctrine.",
    keywords: [
      "zero-rated",
      "zero rating",
      "zero-rated sales",
      "effectively zero-rated",
      "export sales",
      "foreign currency",
      "cross-border",
      "destination principle",
      "nonresident foreign corporation",
      "services to nonresident",
      "peza",
      "economic zone",
      "rr 16-2005 zero-rated"
    ],
    aliases: [
      "ZERO_RATED_SALES",
      "EFFECTIVELY_ZERO_RATED",
      "EXPORT_SALES",
      "CROSS_BORDER"
    ],
    retrievalStrategy: "VAT_ZERO_RATING_AUTHORITY_FIRST",
    targetAuthorities: [
      "NIRC Sec. 106(A)(2)",
      "NIRC Sec. 108(B)",
      "RR 16-2005",
      "RMC 50-2007",
      "PEZA Law R.A. 7916",
      "CIR v. Toshiba",
      "CIR v. Seagate"
    ],
    controllingAuthorities: [
      "NIRC Sec. 106(A)(2)",
      "NIRC Sec. 108(B)",
      "PEZA Law R.A. 7916"
    ],
    supportingAuthorities: [
      "RR 16-2005",
      "RMC 50-2007"
    ],
    supportingJurisprudence: [
      "CIR v. Toshiba",
      "CIR v. Seagate"
    ],
    tpmProfile: "HEAVY",
    legalDimensions: ["SUBSTANTIVE", "EVIDENTIARY"],
    enginePath: VAT_IDENTITY_ENGINES.ZERO_RATING
  }),

  INPUT_TAX: buildSubIssueConfig({
    subIssue: "INPUT_TAX",
    label: "Input Tax — Creditable input VAT, allocation, substantiation, and disallowance",
    description:
      "Classifies input VAT issues, creditability, substantiation, allocation, capital goods, invoice support, and input tax disallowance.",
    keywords: [
      "input vat",
      "input tax",
      "creditable input tax",
      "input tax credit",
      "input tax allocation",
      "substantiation",
      "capital goods",
      "invoice support",
      "official receipt support",
      "input vat disallowance",
      "input tax disallowance",
      "medicard"
    ],
    aliases: [
      "CREDITABLE_INPUT_TAX",
      "INPUT_TAX_CREDIT",
      "INPUT_TAX_SUBSTANTIATION"
    ],
    retrievalStrategy: "VAT_INPUT_TAX_AUTHORITY_FIRST",
    targetAuthorities: [
      "NIRC Sec. 110",
      "RR 16-2005 Sec. 4.110",
      "CIR v. Medicard Philippines",
      "RMC 42-2003"
    ],
    controllingAuthorities: [
      "NIRC Sec. 110"
    ],
    supportingAuthorities: [
      "RR 16-2005 Sec. 4.110",
      "RMC 42-2003"
    ],
    supportingJurisprudence: [
      "CIR v. Medicard Philippines"
    ],
    tpmProfile: "STANDARD",
    legalDimensions: ["SUBSTANTIVE", "EVIDENTIARY", "COMPLIANCE"],
    enginePath: VAT_IDENTITY_ENGINES.INPUT_TAX
  })
});

const VAT_SUB_ISSUE_REGISTRY_PART_2 = Object.freeze({
  EXEMPTION: buildSubIssueConfig({
    subIssue: "EXEMPTION",
    label: "Exemption — Section 109 VAT-exempt transactions and special law exemptions",
    description:
      "Classifies VAT exemption issues under Section 109, special law exemptions, VAT-exempt sales, and non-VAT treatment.",
    keywords: [
      "vat exempt",
      "vat-exempt",
      "exempt from vat",
      "section 109",
      "sec. 109",
      "exempt transaction",
      "non-vat",
      "non vat",
      "special law exemption",
      "vat exemption",
      "exempt sale",
      "rmc 30-2008"
    ],
    aliases: [
      "VAT_EXEMPTION",
      "SECTION_109",
      "EXEMPT_TRANSACTION",
      "NON_VAT"
    ],
    retrievalStrategy: "VAT_EXEMPTION_AUTHORITY_FIRST",
    targetAuthorities: [
      "NIRC Sec. 109",
      "Applicable special laws",
      "BIR rulings",
      "RMC 30-2008"
    ],
    controllingAuthorities: [
      "NIRC Sec. 109",
      "Applicable special laws"
    ],
    supportingAuthorities: [
      "RR 16-2005 VAT exemption provisions",
      "BIR rulings",
      "RMC 30-2008"
    ],
    supportingJurisprudence: [
      "Supreme Court VAT exemption jurisprudence"
    ],
    tpmProfile: "STANDARD",
    legalDimensions: ["SUBSTANTIVE"],
    enginePath: VAT_IDENTITY_ENGINES.EXEMPTION
  }),

  OUTPUT_TAX: buildSubIssueConfig({
    subIssue: "OUTPUT_TAX",
    label: "Output Tax — VAT on sales, gross selling price, gross receipts, and invoicing",
    description:
      "Classifies output VAT, VAT on sales, tax base, gross selling price, gross receipts, invoicing, and billing issues.",
    keywords: [
      "output vat",
      "output tax",
      "vat on sales",
      "vatable sales",
      "vat computation",
      "vat billing",
      "invoice requirements",
      "gross selling price",
      "gross receipts",
      "rr 18-2011",
      "rmc 55-2019"
    ],
    aliases: [
      "VAT_OUTPUT",
      "OUTPUT_VAT",
      "VATABLE_SALES",
      "TAX_BASE"
    ],
    retrievalStrategy: "VAT_OUTPUT_TAX_AUTHORITY_FIRST",
    targetAuthorities: [
      "NIRC Sec. 106",
      "NIRC Sec. 108",
      "RR 16-2005",
      "RR 18-2011",
      "RMC 55-2019"
    ],
    controllingAuthorities: [
      "NIRC Sec. 106",
      "NIRC Sec. 108"
    ],
    supportingAuthorities: [
      "RR 16-2005",
      "RR 18-2011",
      "RMC 55-2019"
    ],
    supportingJurisprudence: [
      "Supreme Court VAT output tax jurisprudence"
    ],
    tpmProfile: "STANDARD",
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE", "ACCOUNTING"],
    enginePath: VAT_IDENTITY_ENGINES.OUTPUT_TAX
  }),

  REGISTRATION: buildSubIssueConfig({
    subIssue: "REGISTRATION",
    label: "Registration — VAT registration threshold, optional registration, and cancellation",
    description:
      "Classifies VAT registration, non-VAT to VAT conversion, threshold, optional registration, and cancellation of VAT registration.",
    keywords: [
      "vat registration",
      "register as vat",
      "registration threshold",
      "optional vat registration",
      "cancellation",
      "vat taxpayer",
      "non-vat to vat",
      "non vat to vat",
      "3 million threshold",
      "bir registration",
      "rmc 75-2015"
    ],
    aliases: [
      "VAT_REGISTRATION",
      "REGISTRATION_THRESHOLD",
      "OPTIONAL_REGISTRATION",
      "CANCELLATION"
    ],
    retrievalStrategy: "VAT_REGISTRATION_COMPLIANCE_FIRST",
    targetAuthorities: [
      "NIRC Sec. 109(BB)",
      "NIRC Sec. 236",
      "RR 16-2005 Secs. 4.100–4.103",
      "RMC 75-2015"
    ],
    controllingAuthorities: [
      "NIRC Sec. 109(BB)",
      "NIRC Sec. 236"
    ],
    supportingAuthorities: [
      "RR 16-2005 Secs. 4.100–4.103",
      "RMC 75-2015"
    ],
    supportingJurisprudence: [],
    tpmProfile: "LIGHT",
    legalDimensions: ["COMPLIANCE", "PROCEDURAL"],
    enginePath: VAT_IDENTITY_ENGINES.REGISTRATION
  }),

  COMPLIANCE: buildSubIssueConfig({
    subIssue: "COMPLIANCE",
    label: "Compliance — VAT returns, BIR Form 2550M/Q, SLSP, filing, and payment",
    description:
      "Classifies VAT filing, VAT return, BIR Form 2550M/Q, SLSP, eFPS/eBIRForms, deadlines, payment, and reporting issues.",
    keywords: [
      "2550m",
      "2550q",
      "bir form 2550m",
      "bir form 2550q",
      "vat return",
      "vat filing",
      "deadline",
      "due date",
      "efps",
      "ebirforms",
      "filing",
      "payment",
      "slsp",
      "summary list",
      "summary list of sales",
      "summary list of purchases"
    ],
    aliases: [
      "VAT_COMPLIANCE",
      "VAT_RETURN",
      "2550Q",
      "2550M",
      "SLSP"
    ],
    retrievalStrategy: "VAT_COMPLIANCE_ADMIN_FIRST",
    targetAuthorities: [
      "NIRC Sec. 114",
      "RR 16-2005",
      "BIR Form 2550M/Q rules",
      "eFPS/eBIR filing issuances"
    ],
    controllingAuthorities: [
      "NIRC Sec. 114"
    ],
    supportingAuthorities: [
      "RR 16-2005",
      "BIR Form 2550M/Q rules",
      "eFPS/eBIR filing issuances"
    ],
    supportingJurisprudence: [],
    tpmProfile: "LIGHT",
    legalDimensions: ["COMPLIANCE", "PROCEDURAL"],
    enginePath: VAT_IDENTITY_ENGINES.COMPLIANCE
  }),

  WITHHOLDING_VAT: buildSubIssueConfig({
    subIssue: "WITHHOLDING_VAT",
    label: "Withholding VAT — Government money payments and final withholding VAT",
    description:
      "Classifies VAT withholding on government transactions, final withholding VAT, VAT withheld, and government money payments.",
    keywords: [
      "withholding vat",
      "withheld vat",
      "vat withheld",
      "5% final withholding vat",
      "government transaction",
      "government money payment",
      "final vat",
      "rr 1-2012",
      "rr 13-2018",
      "rmc 40-2012"
    ],
    aliases: [
      "VAT_WITHHOLDING",
      "FINAL_WITHHOLDING_VAT",
      "GOVERNMENT_MONEY_PAYMENT"
    ],
    retrievalStrategy: "VAT_WITHHOLDING_AUTHORITY_FIRST",
    targetAuthorities: [
      "NIRC Sec. 114(C)",
      "RR 1-2012",
      "RR 13-2018",
      "RMC 40-2012"
    ],
    controllingAuthorities: [
      "NIRC Sec. 114(C)"
    ],
    supportingAuthorities: [
      "RR 1-2012",
      "RR 13-2018",
      "RMC 40-2012"
    ],
    supportingJurisprudence: [],
    tpmProfile: "STANDARD",
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE"],
    enginePath: VAT_IDENTITY_ENGINES.WITHHOLDING_VAT
  }),

  TRANSITIONAL_INPUT_TAX: buildSubIssueConfig({
    subIssue: "TRANSITIONAL_INPUT_TAX",
    label: "Transitional Input Tax — Beginning inventory and change of VAT status",
    description:
      "Classifies transitional input tax on beginning inventory, new VAT registration, and change of taxpayer status.",
    keywords: [
      "transitional input tax",
      "transitional input vat",
      "beginning inventory",
      "change of status",
      "inventory input tax",
      "new vat taxpayer",
      "newly registered vat",
      "section 111",
      "sec. 111"
    ],
    aliases: [
      "TRANSITIONAL",
      "TRANSITIONAL_INPUT_VAT",
      "BEGINNING_INVENTORY_INPUT_TAX"
    ],
    retrievalStrategy: "VAT_TRANSITIONAL_INPUT_TAX_AUTHORITY_FIRST",
    targetAuthorities: [
      "NIRC Sec. 111",
      "RR 16-2005",
      "Relevant BIR rulings/issuances"
    ],
    controllingAuthorities: [
      "NIRC Sec. 111"
    ],
    supportingAuthorities: [
      "RR 16-2005",
      "Relevant BIR rulings/issuances"
    ],
    supportingJurisprudence: [],
    tpmProfile: "STANDARD",
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE", "ACCOUNTING"],
    enginePath: VAT_IDENTITY_ENGINES.TRANSITIONAL_INPUT_TAX
  }),

  DEEMED_SALE: buildSubIssueConfig({
    subIssue: "DEEMED_SALE",
    label: "Deemed Sale — Transactions deemed sale for VAT purposes",
    description:
      "Classifies deemed sale transactions, distribution or transfer of goods, consignment, retirement from business, and other transactions treated as sale for VAT.",
    keywords: [
      "deemed sale",
      "transactions deemed sale",
      "transaction deemed sale",
      "sec. 106(b)",
      "section 106(b)",
      "distribution to shareholders",
      "transfer of goods",
      "consignment",
      "retirement from business",
      "change in business activity",
      "deemed sale rules"
    ],
    aliases: [
      "TRANSACTIONS_DEEMED_SALE",
      "SECTION_106B",
      "DEEMED_OUTPUT_VAT"
    ],
    retrievalStrategy: "VAT_DEEMED_SALE_AUTHORITY_FIRST",
    targetAuthorities: [
      "NIRC Sec. 106(B)",
      "RR 16-2005 deemed sale rules"
    ],
    controllingAuthorities: [
      "NIRC Sec. 106(B)"
    ],
    supportingAuthorities: [
      "RR 16-2005 deemed sale rules"
    ],
    supportingJurisprudence: [],
    tpmProfile: "STANDARD",
    legalDimensions: ["SUBSTANTIVE", "COMPLIANCE", "ACCOUNTING"],
    enginePath: VAT_IDENTITY_ENGINES.DEEMED_SALE
  })
});

export const VAT_COMPLETE_SUB_ISSUE_REGISTRY = Object.freeze({
  ...VAT_SUB_ISSUE_REGISTRY,
  ...VAT_SUB_ISSUE_REGISTRY_PART_2
});

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s%+./()–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value = "") {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s/-]+/g, "_");

  const aliases = {
    TRANSITIONAL: "TRANSITIONAL_INPUT_TAX",
    TRANSITIONAL_INPUT: "TRANSITIONAL_INPUT_TAX",
    TRANSITIONAL_INPUT_VAT: "TRANSITIONAL_INPUT_TAX",
    INPUT_VAT_REFUND: "REFUND_CREDIT",
    VAT_REFUND: "REFUND_CREDIT",
    TAX_CREDIT: "REFUND_CREDIT",
    ZERO_RATED: "ZERO_RATING",
    ZERO_RATED_SALES: "ZERO_RATING",
    VAT_EXEMPTION: "EXEMPTION",
    VAT_OUTPUT: "OUTPUT_TAX",
    OUTPUT_VAT: "OUTPUT_TAX",
    VAT_INPUT: "INPUT_TAX",
    INPUT_VAT: "INPUT_TAX",
    VAT_WITHHOLDING: "WITHHOLDING_VAT",
    WITHHOLDING: "WITHHOLDING_VAT",
    REGISTRATION_THRESHOLD: "REGISTRATION",
    VAT_RETURN: "COMPLIANCE",
    FILING: "COMPLIANCE",
    SECTION_106B: "DEEMED_SALE"
  };

  return aliases[raw] || raw;
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function scoreKeywords(text = "", terms = []) {
  let score = 0;
  const matchedTerms = [];

  for (const term of terms || []) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;

    if (text.includes(normalizedTerm)) {
      matchedTerms.push(term);
      score += normalizedTerm.length >= 14 ? 3 : normalizedTerm.length >= 8 ? 2 : 1;
    }
  }

  return { score, matchedTerms };
}

export function getVatSubIssue(code = "") {
  const normalized = normalizeCode(code);
  return VAT_COMPLETE_SUB_ISSUE_REGISTRY[normalized] || null;
}

export function listVatSubIssues() {
  return Object.values(VAT_COMPLETE_SUB_ISSUE_REGISTRY).map((item) => ({
    code: item.code,
    subIssue: item.subIssue,
    label: item.label,
    description: item.description,
    targetAuthorities: item.targetAuthorities,
    controllingAuthorities: item.controllingAuthorities,
    supportingAuthorities: item.supportingAuthorities,
    supportingJurisprudence: item.supportingJurisprudence,
    priorityFolders: item.priorityFolders,
    excludedFolders: item.excludedFolders,
    requiredAnswerSections: item.requiredAnswerSections,
    tpmProfile: item.tpmProfile,
    sourceGroundingRequired: item.sourceGroundingRequired,
    enginePath: item.enginePath,
    retrievalStrategy: item.retrievalStrategy,
    legalDimensions: item.legalDimensions
  }));
}

export function classifyVatSubIssue(query = "", options = {}) {
  const normalizedQuery = normalizeText(query);
  const priorSubIssue = normalizeCode(options.priorSubIssue || "");

  const candidates = [];

  for (const subIssue of Object.values(VAT_COMPLETE_SUB_ISSUE_REGISTRY)) {
    const keywordScore = scoreKeywords(normalizedQuery, [
      subIssue.code,
      subIssue.subIssue,
      subIssue.label,
      subIssue.description,
      ...(subIssue.keywords || []),
      ...(subIssue.aliases || []),
      ...(subIssue.targetAuthorities || []),
      ...(subIssue.controllingAuthorities || []),
      ...(subIssue.supportingAuthorities || []),
      ...(subIssue.supportingJurisprudence || [])
    ]);

    let score = keywordScore.score;

    if (priorSubIssue && priorSubIssue === subIssue.code) score += 8;

    if (score > 0) {
      candidates.push({
        code: subIssue.code,
        subIssue: subIssue.subIssue,
        label: subIssue.label,
        description: subIssue.description,
        score,
        matchedTerms: keywordScore.matchedTerms,
        enginePath: subIssue.enginePath,
        retrievalStrategy: subIssue.retrievalStrategy,
        targetAuthorities: subIssue.targetAuthorities,
        controllingAuthorities: subIssue.controllingAuthorities,
        supportingAuthorities: subIssue.supportingAuthorities,
        supportingJurisprudence: subIssue.supportingJurisprudence,
        priorityFolders: subIssue.priorityFolders,
        excludedFolders: subIssue.excludedFolders,
        requiredAnswerSections: subIssue.requiredAnswerSections,
        tpmProfile: subIssue.tpmProfile,
        sourceGroundingRequired: subIssue.sourceGroundingRequired,
        legalDimensions: subIssue.legalDimensions
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const fallback = VAT_COMPLETE_SUB_ISSUE_REGISTRY.DEFINITION;

  const top = candidates[0] || {
    code: fallback.code,
    subIssue: fallback.subIssue,
    label: fallback.label,
    description: fallback.description,
    score: 0,
    matchedTerms: [],
    enginePath: fallback.enginePath,
    retrievalStrategy: fallback.retrievalStrategy,
    targetAuthorities: fallback.targetAuthorities,
    controllingAuthorities: fallback.controllingAuthorities,
    supportingAuthorities: fallback.supportingAuthorities,
    supportingJurisprudence: fallback.supportingJurisprudence,
    priorityFolders: fallback.priorityFolders,
    excludedFolders: fallback.excludedFolders,
    requiredAnswerSections: fallback.requiredAnswerSections,
    tpmProfile: fallback.tpmProfile,
    sourceGroundingRequired: fallback.sourceGroundingRequired,
    legalDimensions: fallback.legalDimensions
  };

  const second = candidates[1] || null;

  const confidence =
    top.score <= 0
      ? 0.35
      : Number(
          Math.min(
            0.55 + top.score / 30 + Math.max(top.score - (second?.score || 0), 0) / 25,
            0.99
          ).toFixed(2)
        );

  return {
    domain: VAT_DOMAIN.code,
    domainCode: VAT_DOMAIN.code,
    domainName: VAT_DOMAIN.name,

    primarySubIssue: top.code,
    primarySubIssueLabel: top.label,
    subIssue: top.code,
    subIssueDescription: top.description,

    enginePath: top.enginePath,
    retrievalStrategy: top.retrievalStrategy,

    targetAuthorities: top.targetAuthorities,
    controllingAuthorities: top.controllingAuthorities,
    supportingAuthorities: top.supportingAuthorities,
    supportingJurisprudence: top.supportingJurisprudence,

    priorityFolders: top.priorityFolders,
    excludedFolders: top.excludedFolders,
    requiredAnswerSections: top.requiredAnswerSections,
    tpmProfile: top.tpmProfile,
    sourceGroundingRequired: top.sourceGroundingRequired,

    governingStatutes: unique([
      ...VAT_DOMAIN.primaryStatutes,
      ...top.controllingAuthorities
    ]),

    legalDimensions: top.legalDimensions,
    matchedTerms: top.matchedTerms,
    confidence,
    fallbackClassificationUsed: top.score <= 0,
    candidates
  };
}

export function buildVatClassificationObject({
  query = "",
  primaryIssue = "VAT",
  priorSubIssue = "",
  targetAuthorities = [],
  legalDimensions = [],
  reviewMode = false
} = {}) {
  const classified = classifyVatSubIssue(query, { priorSubIssue });
  const subIssueConfig = getVatSubIssue(classified.primarySubIssue);

  const authorityTypes = sortAuthorityTypes(
    buildTargetAuthorityProfile({
      primaryDomain: VAT_DOMAIN.code,
      primaryIssue,
      subIssues: [classified.primarySubIssue],
      targetAuthorities: unique([
        ...VAT_DOMAIN.defaultAuthorities,
        ...targetAuthorities
      ])
    })
  );

  const mergedTargetAuthorities = unique([
    ...(classified.targetAuthorities || []),
    ...targetAuthorities
  ]);

  return {
    engine: "tax-engines/VAT/domain-config.js",
    version: VAT_DOMAIN_CONFIG_VERSION,
    status:
      classified.confidence >= 0.7
        ? "VAT_SUB_ISSUE_CLASSIFIED"
        : "LOW_CONFIDENCE_VAT_SUB_ISSUE_CLASSIFIED",

    primaryDomain: VAT_DOMAIN.code,
    primaryDomainName: VAT_DOMAIN.name,
    domainCode: VAT_DOMAIN.code,
    domainName: VAT_DOMAIN.name,

    primaryIssue,
    primarySubIssue: classified.primarySubIssue,
    primarySubIssueLabel: classified.primarySubIssueLabel,
    subIssue: classified.primarySubIssue,
    subIssueDescription: classified.subIssueDescription,
    subIssues: [classified.primarySubIssue],

    governingStatutes: classified.governingStatutes,
    primaryStatutes: VAT_DOMAIN.primaryStatutes,

    targetAuthorities: mergedTargetAuthorities,
    targetAuthorityTypes: authorityTypes,
    controllingAuthorities: classified.controllingAuthorities,
    supportingAuthorities: classified.supportingAuthorities,
    supportingJurisprudence: classified.supportingJurisprudence,

    priorityFolders: classified.priorityFolders,
    excludedFolders: reviewMode ? [] : classified.excludedFolders,
    requiredAnswerSections: classified.requiredAnswerSections,
    tpmProfile: classified.tpmProfile,
    sourceGroundingRequired: classified.sourceGroundingRequired,

    authorityHierarchy: VAT_AUTHORITY_HIERARCHY,
    legalDimensions: unique([...classified.legalDimensions, ...legalDimensions]),

    retrievalStrategy: classified.retrievalStrategy,
    retrievalHints: {
      domainCode: VAT_DOMAIN.code,
      domainName: VAT_DOMAIN.name,
      primarySubIssue: classified.primarySubIssue,
      subIssue: classified.primarySubIssue,
      retrievalStrategy: classified.retrievalStrategy,
      boostTerms: unique([
        VAT_DOMAIN.code,
        VAT_DOMAIN.name,
        ...VAT_DOMAIN.primaryStatutes,
        ...(subIssueConfig?.keywords || []),
        ...(subIssueConfig?.aliases || []),
        ...(subIssueConfig?.targetAuthorities || []),
        ...(subIssueConfig?.controllingAuthorities || []),
        ...(subIssueConfig?.supportingAuthorities || []),
        ...(subIssueConfig?.supportingJurisprudence || [])
      ]),
      targetAuthorities: mergedTargetAuthorities,
      controllingAuthorities: classified.controllingAuthorities,
      supportingAuthorities: classified.supportingAuthorities,
      supportingJurisprudence: classified.supportingJurisprudence,
      preferredAuthorities: authorityTypes,
      priorityFolders: classified.priorityFolders,
      excludedFolders: reviewMode ? [] : classified.excludedFolders,
      sourceGroundingRequired: classified.sourceGroundingRequired,
      compactSourcesOnly: true,
      preserveControllingAuthorities: true,
      preserveTargetAuthorityMatches: true,
      preserveIssueClassificationMatches: true
    },

    engineRouting: {
      useDomainEngine: true,
      domainEnginePath: "./tax-engines/VAT/domain-config.js",
      useIdentityEngine: true,
      identityEnginePath: classified.enginePath,
      identityEngineCode: classified.primarySubIssue,
      requiresIssueSpecificRetrieval: true,
      requiresAuthorityHierarchy: true,
      requiresSupersessionCheck: true,
      requiresConflictCheck: [
        "REFUND_CREDIT",
        "ZERO_RATING",
        "EXEMPTION"
      ].includes(classified.primarySubIssue),
      requiresJurisprudence:
        classified.supportingJurisprudence.length > 0,
      requiresEvidenceEvaluation: [
        "REFUND_CREDIT",
        "INPUT_TAX",
        "ZERO_RATING",
        "COMPLIANCE",
        "OUTPUT_TAX"
      ].includes(classified.primarySubIssue)
    },

    confidence: classified.confidence,
    fallbackClassificationUsed: classified.fallbackClassificationUsed,

    classificationSignals: {
      matchedTerms: classified.matchedTerms,
      candidates: classified.candidates
    }
  };
}

export function mergeVatIntoIssueClassification(issueClassification = {}, query = "") {
  const reviewMode =
    issueClassification.reviewMode === true ||
    issueClassification.requiresReviewMode === true ||
    issueClassification.queryIntent?.requiresReviewMode === true ||
    issueClassification.intentFlags?.requiresReviewMode === true;

  const vatClassification = buildVatClassificationObject({
    query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
    primaryIssue: issueClassification.primaryIssue || "VAT",
    priorSubIssue:
      issueClassification.primarySubIssue ||
      issueClassification.subIssue ||
      issueClassification.taxDomainClassification?.primarySubIssue ||
      "",
    targetAuthorities: issueClassification.targetAuthorities || [],
    legalDimensions: issueClassification.legalDimensions || [],
    reviewMode
  });

  return {
    ...issueClassification,

    primaryIssue: issueClassification.primaryIssue || "VAT",
    primaryDomain: "VAT",
    primaryDomainName: VAT_DOMAIN.name,
    domainCode: "VAT",
    domainName: VAT_DOMAIN.name,

    taxDomainClassification: {
      ...(issueClassification.taxDomainClassification || {}),
      ...vatClassification
    },

    primarySubIssue: vatClassification.primarySubIssue,
    subIssue: vatClassification.primarySubIssue,
    subIssues: unique([
      ...(issueClassification.subIssues || []),
      vatClassification.primarySubIssue
    ]),

    targetAuthorities: vatClassification.targetAuthorities,
    controllingAuthorities: vatClassification.controllingAuthorities,
    supportingAuthorities: vatClassification.supportingAuthorities,
    supportingJurisprudence: vatClassification.supportingJurisprudence,

    priorityFolders: vatClassification.priorityFolders,
    excludedFolders: vatClassification.excludedFolders,
    requiredAnswerSections: vatClassification.requiredAnswerSections,
    tpmProfile: vatClassification.tpmProfile,
    sourceGroundingRequired: vatClassification.sourceGroundingRequired,

    legalDimensions: vatClassification.legalDimensions,
    retrievalStrategy: vatClassification.retrievalStrategy,
    retrievalHints: vatClassification.retrievalHints,
    engineRouting: {
      ...(issueClassification.engineRouting || {}),
      ...vatClassification.engineRouting
    },

    vatClassification
  };
}

export function vatDomainHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VAT_DOMAIN_CONFIG",
    version: VAT_DOMAIN_CONFIG_VERSION,
    domain: VAT_DOMAIN.code,
    subIssueCount: Object.keys(VAT_COMPLETE_SUB_ISSUE_REGISTRY).length,

    supportsDefinition: true,
    supportsRefundCredit: true,
    supportsZeroRating: true,
    supportsInputTax: true,
    supportsExemption: true,
    supportsOutputTax: true,
    supportsRegistration: true,
    supportsCompliance: true,
    supportsWithholdingVat: true,
    supportsTransitionalInputTax: true,
    supportsDeemedSale: true,

    hasSeparateIdentityEngines: true,
    identityEngines: VAT_IDENTITY_ENGINES,

    authorityHierarchyAware: true,
    googleDriveFolderPriorityAware: true,
    excludesReviewMaterialsUnlessReviewMode: true,
    sourceGroundingRequired: true,
    tpmProfileAware: true,

    supportsIssueClassificationEngine: true,
    supportsMainTaxEngineClassification: true,
    supportsRetrievalEngine: true,
    supportsContextOrchestrationEngine: true,
    supportsRagAnswerHandler: true
  };
}

export default {
  VAT_DOMAIN_CONFIG_VERSION,
  VAT_DOMAIN,
  VAT_SUB_ISSUE,
  VAT_IDENTITY_ENGINES,
  VAT_SUB_ISSUE_REGISTRY: VAT_COMPLETE_SUB_ISSUE_REGISTRY,
  VAT_COMPLETE_SUB_ISSUE_REGISTRY,
  VAT_PRIORITY_FOLDERS,
  VAT_EXCLUDED_FOLDERS,
  VAT_AUTHORITY_HIERARCHY,
  VAT_REQUIRED_ANSWER_SECTIONS,
  getVatSubIssue,
  listVatSubIssues,
  classifyVatSubIssue,
  buildVatClassificationObject,
  mergeVatIntoIssueClassification,
  vatDomainHealthCheck
};
