// FILE: query-intent-engine.js
"use strict";

/**
 * TINA Enterprise Query Intent Engine
 * Version: 4.0.0
 */

import {
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc
} from "./issue-classification-engine.js";

const ENGINE_VERSION = "4.0.0";

const ISSUE_TYPE = Object.freeze({
  VAT_REFUND: "VAT_REFUND",
  VAT_LIABILITY: "VAT_LIABILITY",
  VAT_SUBSTANTIATION: "VAT_SUBSTANTIATION",
  VAT_EXEMPTION: "VAT_EXEMPTION",
  ZERO_RATED_SALES: "ZERO_RATED_SALES",

  INCOME_TAX: "INCOME_TAX",
  RCIT: "RCIT",
  MCIT: "MCIT",
  NOLCO: "NOLCO",
  DEDUCTIBILITY: "DEDUCTIBILITY",

  WITHHOLDING: "WITHHOLDING",
  WITHHOLDING_TAX: "WITHHOLDING_TAX",
  EWT: "EWT",
  CWT: "CWT",
  FWT: "FWT",

  ASSESSMENT: "ASSESSMENT",
  LOA: "LOA",
  PAN_FAN: "PAN_FAN",
  TAX_REMEDIES: "TAX_REMEDIES",
  PRESCRIPTION: "PRESCRIPTION",

  JURISDICTIONAL: "JURISDICTIONAL",
  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",

  NAMED_LAW: "NAMED_LAW",
  ISSUANCE: "ISSUANCE",
  CASE_LAW: "CASE_LAW",
  DOCTRINE: "DOCTRINE",
  CONFLICT_ANALYSIS: "CONFLICT_ANALYSIS",

  CONTRACT: "CONTRACT",
  TRANSACTION: "TRANSACTION",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",
  PRINCIPAL_AGENT: "PRINCIPAL_AGENT",
  PASS_THROUGH: "PASS_THROUGH",
  REIMBURSEMENT: "REIMBURSEMENT",
  BUNDLED_TRANSACTION: "BUNDLED_TRANSACTION",

  AUDIT: "AUDIT",
  ACCOUNTING: "ACCOUNTING",
  PFRS: "PFRS",
  PAS: "PAS",
  PSA: "PSA",

  LOCAL_TAX: "LOCAL_TAX",
  DST: "DST",
  PERCENTAGE_TAX: "PERCENTAGE_TAX",
  EXCISE_TAX: "EXCISE_TAX",
  FINAL_TAX: "FINAL_TAX",
  CGT: "CGT",
  ESTATE_TAX: "ESTATE_TAX",
  DONOR_TAX: "DONOR_TAX",

  GENERAL_TAX: "GENERAL_TAX"
});

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

const LEGAL_DIMENSION = Object.freeze({
  SUBSTANTIVE: "SUBSTANTIVE",
  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",
  JURISDICTIONAL: "JURISDICTIONAL",
  TEMPORAL: "TEMPORAL",
  ADMINISTRATIVE: "ADMINISTRATIVE",
  FACTUAL: "FACTUAL",
  ACCOUNTING: "ACCOUNTING",
  CONTRACTUAL: "CONTRACTUAL",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",
  AUDIT: "AUDIT",
  TRANSACTION: "TRANSACTION",
  GENERAL: "GENERAL"
});

const TARGET_AUTHORITY_GROUPS = Object.freeze({
  constitution: ["CONSTITUTION"],
  nirc: ["STATUTE"],
  statute: ["STATUTE"],
  taxCode: ["STATUTE"],
  supremeCourt: ["SUPREME_COURT"],
  ctaEnBanc: ["CTA_EN_BANC"],
  ctaDivision: ["CTA_DIVISION"],
  courtOfAppeals: ["COURT_OF_APPEALS"],
  rr: ["RR"],
  rmc: ["RMC"],
  rmo: ["RMO"],
  ramo: ["RAMO"],
  birRulings: ["BIR_RULING"],
  birRuling: ["BIR_RULING"],
  pfrs: ["PFRS"],
  pas: ["PAS"],
  psa: ["PSA"],
  lgu: ["LGU"]
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
    VAT: "VAT_LIABILITY",
    OUTPUT_VAT: "VAT_LIABILITY",
    VAT_OUTPUT: "VAT_LIABILITY",
    VAT_DEFINITION: "VAT_LIABILITY",
    DEFINITION: "VAT_LIABILITY",
    INPUT_VAT: "VAT_REFUND",
    INPUT_VAT_REFUND: "VAT_REFUND",
    TAX_REFUND: "VAT_REFUND",
    REFUND: "VAT_REFUND",
    VAT_EXCESS_INPUT: "VAT_REFUND",

    EWT: "WITHHOLDING",
    CWT: "WITHHOLDING",
    FWT: "WITHHOLDING",
    WITHHOLDING_TAX: "WITHHOLDING",

    RCIT: "INCOME_TAX",
    MCIT: "INCOME_TAX",
    NOLCO: "INCOME_TAX",
    DEDUCTIBILITY: "INCOME_TAX",

    CHARACTERIZATION: "TRANSACTION",
    PRINCIPAL_AGENT: "TRANSACTION",
    PRINCIPAL_VS_AGENT: "TRANSACTION",
    GROSS_NET: "TRANSACTION",
    PASS_THROUGH: "TRANSACTION",
    REIMBURSEMENT: "TRANSACTION",
    BUNDLED_TRANSACTION: "TRANSACTION",
    ECONOMIC_SUBSTANCE_ANALYSIS: "ECONOMIC_SUBSTANCE",

    AGREEMENT: "CONTRACT",
    CONTRACTUAL: "CONTRACT",

    ACCOUNTING_TAX: "ACCOUNTING",
    FINANCIAL_REPORTING: "ACCOUNTING"
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

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    RA: "STATUTE",

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

function normalizeTargetAuthorities(targetAuthorities = null) {
  const output = [];

  if (Array.isArray(targetAuthorities)) {
    for (const item of targetAuthorities) {
      const normalized = normalizeAuthority(item);
      if (normalized) output.push(normalized);
    }
    return unique(output);
  }

  if (targetAuthorities && typeof targetAuthorities === "object") {
    for (const [group, values] of Object.entries(targetAuthorities)) {
      for (const type of TARGET_AUTHORITY_GROUPS[group] || []) {
        output.push(type);
      }

      for (const item of safeArray(values)) {
        const normalized = normalizeAuthority(item);
        if (normalized) output.push(normalized);

        if (typeof item === "string" && item.trim()) {
          output.push(...(TARGET_AUTHORITY_GROUPS[item] || []));
        }
      }
    }
  }

  return unique(output);
}

function normalizeTaxDomains(domains = [], primaryIssue = "") {
  const values = safeArray(domains).map((item) =>
    String(item || "").trim().toUpperCase().replace(/[\s-]+/g, "_")
  );

  if (primaryIssue === "VAT_LIABILITY" || primaryIssue === "VAT_REFUND") values.push("VAT");
  if (primaryIssue === "INCOME_TAX") values.push("INCOME_TAX");
  if (primaryIssue === "WITHHOLDING") values.push("WITHHOLDING_TAX");
  if (primaryIssue === "ACCOUNTING") values.push("ACCOUNTING");
  if (primaryIssue === "TRANSACTION") values.push("TRANSACTION");
  if (primaryIssue === "CONTRACT") values.push("CONTRACT");

  return unique(values);
}

function detectIssueSignals(text = "") {
  const q = lower(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(/\b(vat refund|input vat refund|tcc|tax credit certificate|120\+30|administrative claim|judicial claim|unutilized input vat|excess input vat|claim for refund)\b/i.test(q), "VAT_REFUND");
  push(/\b(vat liability|output vat|subject to vat|vatable|value-added tax|value added tax|gross receipts|gross selling price|sale of goods|sale of services|define vat|what is vat)\b/i.test(q), "VAT_LIABILITY");
  push(/\b(vat exempt|exempt from vat|section\s*109|zero-rated|zero rated)\b/i.test(q), "VAT_EXEMPTION");
  push(/\b(invoice|receipt|official receipt|substantiation|documentary|proof|evidence|records|burden of proof|supporting document)\b/i.test(q), "EVIDENTIARY");
  push(/\b(withholding|ewt|cwt|fwt|expanded withholding|final withholding|2307|1601)\b/i.test(q), "WITHHOLDING");
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|taxable income|gross income|deduction)\b/i.test(q), "INCOME_TAX");
  push(/\b(assessment|deficiency tax|loa|letter of authority|pan|fan|fld|protest|appeal|prescription|remedy)\b/i.test(q), "ASSESSMENT");
  push(/\b(jurisdiction|jurisdictional|cta|court of tax appeals)\b/i.test(q), "JURISDICTIONAL");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(q), "CONTRACT");
  push(/\b(principal|agent|principal vs agent|pass-through|pass through|reimbursement|bundled|package|gross vs net|gross or net|economic substance|substance over form|concessionaire)\b/i.test(q), "TRANSACTION");
  push(/\b(audit|afs|financial statements|pfrs|pas|psa|misstatement|working paper|qualified opinion)\b/i.test(q), "ACCOUNTING");
  push(/\b(doctrine|jurisprudence|case|g\.?\s*r\.?\s*no\.?|supreme court|conflict|prevails|override|hierarchy)\b/i.test(q), "DOCTRINE");

  return unique(issues.map(normalizeIssue).filter(Boolean));
}

function detectDimensionSignals(text = "") {
  const q = lower(text);
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  push(/\b(taxable|liable|subject to|exempt|zero-rated|gross income|deductible|non-deductible|tax base|tax rate|output vat|input vat|income tax|withholding tax|vatable|sales|revenue)\b/i.test(q), "SUBSTANTIVE");
  push(/\b(file|filing|deadline|due date|period|prescriptive|administrative claim|judicial claim|appeal|protest|assessment|loa|pan|fan|return|form|remedy|120\+30)\b/i.test(q), "PROCEDURAL");
  push(/\b(invoice|receipt|substantiation|documentary|support|proof|evidence|records|books|burden of proof)\b/i.test(q), "EVIDENTIARY");
  push(/\b(jurisdiction|jurisdictional|cta|condition precedent|120\+30)\b/i.test(q), "JURISDICTIONAL");
  push(/\b(effective|effectivity|retroactive|prospective|superseded|amended|repealed)\b/i.test(q), "TEMPORAL");
  push(/\b(rmc|rmo|ramo|revenue memorandum|bir ruling|administrative|interpretative|clarificatory|regulation)\b/i.test(q), "ADMINISTRATIVE");
  push(/\b(facts|factual|actual|circumstances|transaction structure|documentation)\b/i.test(q), "FACTUAL");
  push(/\b(contract|agreement|clause|lease|concession)\b/i.test(q), "CONTRACTUAL");
  push(/\b(economic substance|substance over form|sham|simulation|business purpose)\b/i.test(q), "ECONOMIC_SUBSTANCE");
  push(/\b(principal|agent|pass-through|reimbursement|bundled|gross vs net|gross or net)\b/i.test(q), "TRANSACTION");
  push(/\b(audit|working paper|afs|pfrs|pas|misstatement|qualified opinion)\b/i.test(q), "AUDIT");

  return unique(dimensions.map(normalizeDimension).filter(Boolean));
}

function normalizeClassificationShape(raw = {}, question = "") {
  const detectedIssues = detectIssueSignals(question);
  const detectedDimensions = detectDimensionSignals(question);

  const rawPrimary =
    raw.primaryIssue ||
    raw.primary_issue ||
    raw.issueType ||
    raw.issue_type ||
    raw.taxIssue ||
    raw.tax_issue ||
    detectedIssues[0] ||
    "GENERAL_TAX";

  const primaryIssue = normalizeIssue(rawPrimary) || "GENERAL_TAX";

  const subIssues = unique([
    primaryIssue,
    ...safeArray(raw.subIssues).map(normalizeIssue),
    ...safeArray(raw.subIssue).map(normalizeIssue),
    ...safeArray(raw.sub_issues).map(normalizeIssue),
    ...safeArray(raw.sub_issue).map(normalizeIssue),
    ...safeArray(raw.issueTypes).map(normalizeIssue),
    ...detectedIssues
  ]).filter(Boolean);

  const legalDimensions = unique([
    ...safeArray(raw.legalDimensions).map(normalizeDimension),
    ...safeArray(raw.legalDimension).map(normalizeDimension),
    ...safeArray(raw.legal_dimensions).map(normalizeDimension),
    ...safeArray(raw.legal_dimension).map(normalizeDimension),
    ...detectedDimensions
  ]).filter(Boolean);

  const targetAuthorities = unique([
    ...normalizeTargetAuthorities(raw.targetAuthorities),
    ...normalizeTargetAuthorities(raw.target_authorities)
  ]);

  const taxDomains = normalizeTaxDomains(raw.taxDomains || raw.tax_domains || [], primaryIssue);

  return {
    ...raw,
    engine: raw.engine || "TINA_ISSUE_CLASSIFICATION_ENGINE",
    originalQuery: raw.originalQuery || question,
    normalizedQuery: raw.normalizedQuery || normalizeText(question),

    primaryIssue,
    subIssue: raw.subIssue || raw.sub_issue || subIssues[0] || primaryIssue,
    subIssues,
    legalDimensions: legalDimensions.length ? legalDimensions : ["GENERAL"],
    taxDomains,

    targetAuthorities,
    targetAuthorityGroups: raw.targetAuthorities || raw.target_authorities || {},

    legalQuestionPresented:
      raw.legalQuestionPresented ||
      raw.legal_question_presented ||
      normalizeText(question),

    keyTerms: unique([
      ...safeArray(raw.keyTerms),
      ...safeArray(raw.key_terms),
      primaryIssue,
      ...subIssues
    ]),

    factSensitivity: raw.factSensitivity || raw.fact_sensitivity || "moderate",
    complexityFlag: raw.complexityFlag || raw.complexity_flag || "moderate",

    retrievalStrategy:
      raw.retrievalStrategy ||
      raw.retrieval_strategy ||
      "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",

    exactAuthority: raw.exactAuthority || raw.exact_authority || {
      detected: false,
      type: null,
      reference: null,
      number: null,
      year: null
    },

    retrievalControls: {
      issueFirst: true,
      suppressIssueMismatchedCases: true,
      suppressUnrelatedProceduralCases: true,
      suppressVatRefundCasesUnlessRefundIssue: primaryIssue !== "VAT_REFUND",
      requirePrimaryAuthorityForDefinitions: primaryIssue === "VAT_LIABILITY",
      requireFactDisclosureBeforeConclusion:
        Boolean(raw.factPatternRequired || raw.fact_pattern_required) ||
        Boolean(raw.transactionCharacterizationRequired || raw.transaction_characterization_required),
      allowConflictLabelOnlyIfSameIssueAndOppositeHolding: true,
      ...(raw.retrievalControls || raw.retrieval_controls || {})
    },

    downstreamRouting: {
      useRetrievalEngine: true,
      useRerankerEngine: true,
      useJurisprudenceEngine:
        Boolean(raw.doctrinalAnalysisRequired || raw.doctrinal_analysis_required) ||
        Boolean(raw.potentialConflictCheck || raw.potential_conflict_check),
      useConflictEngine: Boolean(raw.potentialConflictCheck || raw.potential_conflict_check),
      useTransactionCharacterizationEngine:
        Boolean(raw.transactionCharacterizationRequired || raw.transaction_characterization_required) ||
        primaryIssue === "TRANSACTION",
      useFactPatternEngine:
        Boolean(raw.factPatternRequired || raw.fact_pattern_required) ||
        ["TRANSACTION", "CONTRACT", "ECONOMIC_SUBSTANCE"].includes(primaryIssue),
      useEvidenceEvaluationEngine:
        Boolean(raw.factPatternRequired || raw.fact_pattern_required) ||
        legalDimensions.includes("EVIDENTIARY"),
      useAnswerRenderer: true,
      ...(raw.downstreamRouting || raw.downstream_routing || {})
    }
  };
}

function safeIssueClassification(question = "") {
  try {
    return normalizeClassificationShape(classifyTaxIssue(question), question);
  } catch (error) {
    return normalizeClassificationShape({
      engine: "TINA_ISSUE_CLASSIFICATION_ENGINE",
      version: "fallback",
      primaryIssue: "GENERAL_TAX",
      subIssue: "GENERAL_TAX",
      subIssues: ["GENERAL_TAX"],
      legalQuestionPresented: "What Philippine tax rule governs the user's issue?",
      taxDomains: ["GENERAL_TAX"],
      targetAuthorities: [],
      keyTerms: ["GENERAL_TAX"],
      complexityFlag: "moderate",
      factSensitivity: "moderate",
      retrievalStrategy: "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",
      transactionCharacterizationRequired: false,
      factPatternRequired: false,
      doctrinalAnalysisRequired: false,
      potentialConflictCheck: false,
      caseRoleFilters: [],
      excludedAuthorities: [],
      mischaracterizationRisk: "low",
      classificationError: error?.message || "Issue classification failed."
    }, question);
  }
}

function detectIssuanceReference(text = "") {
  const value = normalizeText(text);

  const patterns = [
    { type: "RR", regex: /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i },
    { type: "RMC", regex: /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i },
    { type: "RMO", regex: /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i },
    { type: "RAMO", regex: /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i }
  ];

  for (const item of patterns) {
    const match = value.match(item.regex);

    if (match) {
      return {
        detected: true,
        type: item.type,
        number: String(Number(match[1])),
        year: normalizeYear(match[2]),
        reference: `${item.type} No. ${Number(match[1])}-${normalizeYear(match[2])}`
      };
    }
  }

  const rulingMatch = value.match(/\b(?:bir\s*)?ruling\s*(?:no\.?)?\s*([a-z0-9()/. -]+)\b/i);

  if (rulingMatch) {
    return {
      detected: true,
      type: "BIR_RULING",
      number: normalizeText(rulingMatch[1]),
      year: null,
      reference: `BIR Ruling ${normalizeText(rulingMatch[1])}`
    };
  }

  return {
    detected: false,
    type: null,
    number: null,
    year: null,
    reference: null
  };
}

function detectCaseReference(text = "") {
  const value = normalizeText(text);

  const gr = value.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  if (gr) {
    return {
      detected: true,
      court: "SUPREME_COURT",
      reference: `G.R. No. ${gr[1]}`
    };
  }

  const cta =
    value.match(/\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i) ||
    value.match(/\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/i);

  if (cta) {
    return {
      detected: true,
      court: "CTA",
      reference: `CTA ${cta[1]}`
    };
  }

  const ca = value.match(/\bca-?g\.?\s*r\.?\s*(?:sp|cv|cr)?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  if (ca) {
    return {
      detected: true,
      court: "COURT_OF_APPEALS",
      reference: `CA-G.R. ${ca[1]}`
    };
  }

  return {
    detected: false,
    court: null,
    reference: null
  };
}

function detectNamedLaw(text = "") {
  const value = lower(text);
  const laws = [];

  if (/\b(create law|create act|ra\s*11534)\b/i.test(value)) {
    laws.push({
      code: "CREATE",
      title: "Corporate Recovery and Tax Incentives for Enterprises Act",
      raNumber: "11534"
    });
  }

  if (/\b(train law|train act|ra\s*10963)\b/i.test(value)) {
    laws.push({
      code: "TRAIN",
      title: "Tax Reform for Acceleration and Inclusion Act",
      raNumber: "10963"
    });
  }

  if (/\b(eopt|ease of paying taxes|ra\s*11976)\b/i.test(value)) {
    laws.push({
      code: "EOPT",
      title: "Ease of Paying Taxes Act",
      raNumber: "11976"
    });
  }

  if (/\b(create more|ra\s*12066)\b/i.test(value)) {
    laws.push({
      code: "CREATE_MORE",
      title: "CREATE MORE Act",
      raNumber: "12066"
    });
  }

  const raMatch = value.match(/\b(?:ra|r\.a\.|republic act)\s*(?:no\.?)?\s*(\d{4,6})\b/i);

  if (raMatch && !laws.some((law) => law.raNumber === raMatch[1])) {
    laws.push({
      code: `RA_${raMatch[1]}`,
      title: `Republic Act No. ${raMatch[1]}`,
      raNumber: raMatch[1]
    });
  }

  return {
    detected: laws.length > 0,
    laws
  };
}

function mapIssueClassificationToIssueTypes(classification = {}) {
  const issues = [];
  const primary = normalizeIssue(classification.primaryIssue);
  const subIssues = safeArray(classification.subIssues).map(normalizeIssue);
  const domains = normalizeTaxDomains(classification.taxDomains, primary);

  if (primary) issues.push(primary);

  if (domains.includes("VAT")) {
    if (primary === "VAT_REFUND") issues.push(ISSUE_TYPE.VAT_REFUND);
    else if (primary === "VAT_EXEMPTION") issues.push(ISSUE_TYPE.VAT_EXEMPTION);
    else issues.push(ISSUE_TYPE.VAT_LIABILITY);
  }

  if (domains.includes("INCOME_TAX")) issues.push(ISSUE_TYPE.INCOME_TAX);
  if (domains.includes("WITHHOLDING_TAX")) issues.push(ISSUE_TYPE.WITHHOLDING_TAX);
  if (domains.includes("DST")) issues.push(ISSUE_TYPE.DST);
  if (domains.includes("PERCENTAGE_TAX")) issues.push(ISSUE_TYPE.PERCENTAGE_TAX);
  if (domains.includes("EXCISE_TAX")) issues.push(ISSUE_TYPE.EXCISE_TAX);
  if (domains.includes("CAPITAL_GAINS_TAX")) issues.push(ISSUE_TYPE.CGT);
  if (domains.includes("ESTATE_TAX")) issues.push(ISSUE_TYPE.ESTATE_TAX);
  if (domains.includes("DONOR_TAX")) issues.push(ISSUE_TYPE.DONOR_TAX);
  if (domains.includes("LOCAL_TAX")) issues.push(ISSUE_TYPE.LOCAL_TAX);

  if (subIssues.includes("TRANSACTION")) issues.push(ISSUE_TYPE.TRANSACTION);
  if (subIssues.includes("CONTRACT")) issues.push(ISSUE_TYPE.CONTRACT);
  if (subIssues.includes("ECONOMIC_SUBSTANCE")) issues.push(ISSUE_TYPE.ECONOMIC_SUBSTANCE);
  if (subIssues.includes("ACCOUNTING")) issues.push(ISSUE_TYPE.ACCOUNTING, ISSUE_TYPE.PFRS);

  if (classification.doctrinalAnalysisRequired || classification.doctrinal_analysis_required) {
    issues.push(ISSUE_TYPE.DOCTRINE);
  }

  if (classification.potentialConflictCheck || classification.potential_conflict_check) {
    issues.push(ISSUE_TYPE.CONFLICT_ANALYSIS);
  }

  if (classification.exactAuthority?.detected) {
    if (["SUPREME_COURT", "CTA", "CTA_EN_BANC", "CTA_DIVISION"].includes(classification.exactAuthority.type)) {
      issues.push(ISSUE_TYPE.CASE_LAW);
    } else {
      issues.push(ISSUE_TYPE.ISSUANCE);
    }
  }

  return unique(issues.length ? issues : [ISSUE_TYPE.GENERAL_TAX]);
}

function detectIssueTypes(question = "", issueClassification = null) {
  const q = lower(question);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  if (issueClassification) {
    issues.push(...mapIssueClassificationToIssueTypes(issueClassification));
  }

  push(/\bvat refund\b|\bunutilized input vat\b|\bexcess input vat\b/i.test(q), ISSUE_TYPE.VAT_REFUND);
  push(/\boutput vat\b|\bsubject to vat\b|\bvatable\b|\bdefine vat\b|\bwhat is vat\b/i.test(q), ISSUE_TYPE.VAT_LIABILITY);
  push(/\bvat exempt\b|\bexempt from vat\b|\bsection\s*109\b/i.test(q), ISSUE_TYPE.VAT_EXEMPTION);
  push(/\binvoice\b|\breceipt\b|\bsubstantiation\b|\bdocumentary\b|\bevidence\b|\bproof\b|\bsupport\b/i.test(q), ISSUE_TYPE.EVIDENTIARY);
  push(/\bincome tax\b|\brcit\b|\bmcit\b|\bnolco\b/i.test(q), ISSUE_TYPE.INCOME_TAX);
  push(/\bwithholding\b|\bewt\b|\bcwt\b|\bfwt\b/i.test(q), ISSUE_TYPE.WITHHOLDING);
  push(/\bassessment\b|\bdeficiency tax\b|\bloa\b|\bpan\b|\bfan\b|\bfld\b/i.test(q), ISSUE_TYPE.ASSESSMENT);
  push(/\bloa\b|letter of authority/i.test(q), ISSUE_TYPE.LOA);
  push(/\brefund\b|\bprotest\b|\bappeal\b|\bcta\b/i.test(q), ISSUE_TYPE.TAX_REMEDIES);
  push(/\bdoctrine\b|\bsubstance over form\b|\beconomic substance\b/i.test(q), ISSUE_TYPE.DOCTRINE);
  push(/\bconflict\b|\bprevails\b|\boverride\b|\bhierarchy\b/i.test(q), ISSUE_TYPE.CONFLICT_ANALYSIS);
  push(/\bcontract\b|\bagreement\b|\blease agreement\b|\bconcession agreement\b|\bclause\b/i.test(q), ISSUE_TYPE.CONTRACT);
  push(/\bprincipal vs agent\b|\bpass-through\b|\breimbursement\b|\bbundled\b|\bgross or net\b|\bcommission\b|\bconcession\b/i.test(q), ISSUE_TYPE.TRANSACTION);
  push(/\beconomic substance\b|\bsubstance over form\b|\bsham\b|\bsimulation\b/i.test(q), ISSUE_TYPE.ECONOMIC_SUBSTANCE);
  push(/\baudit\b|\bqualified opinion\b|\bmisstatement\b|\bworking paper\b/i.test(q), ISSUE_TYPE.AUDIT);
  push(/\bpfrs\b|\bpas\b|\bfinancial statements\b|\bafs\b/i.test(q), ISSUE_TYPE.PFRS);

  if (detectIssuanceReference(q).detected) issues.push(ISSUE_TYPE.ISSUANCE);
  if (detectCaseReference(question).detected) issues.push(ISSUE_TYPE.CASE_LAW);
  if (detectNamedLaw(question).detected) issues.push(ISSUE_TYPE.NAMED_LAW);

  return unique(issues.length ? issues : [ISSUE_TYPE.GENERAL_TAX]);
}

function detectLegalDimensions(question = "", issueClassification = null) {
  const dimensions = [];

  const primary = normalizeIssue(issueClassification?.primaryIssue);
  const factSensitivity = issueClassification?.factSensitivity || issueClassification?.fact_sensitivity || "";

  if (["VAT_LIABILITY", "VAT_REFUND", "INCOME_TAX", "WITHHOLDING"].includes(primary)) {
    dimensions.push(LEGAL_DIMENSION.SUBSTANTIVE);
  }

  if (issueClassification?.factPatternRequired || issueClassification?.fact_pattern_required || factSensitivity === "high") {
    dimensions.push(LEGAL_DIMENSION.FACTUAL);
  }

  if (issueClassification?.transactionCharacterizationRequired || issueClassification?.transaction_characterization_required) {
    dimensions.push(LEGAL_DIMENSION.ECONOMIC_SUBSTANCE);
    dimensions.push(LEGAL_DIMENSION.CONTRACTUAL);
    dimensions.push(LEGAL_DIMENSION.TRANSACTION);
  }

  dimensions.push(...detectDimensionSignals(question));

  for (const item of safeArray(issueClassification?.legalDimensions)) {
    const normalized = normalizeDimension(item);
    if (normalized) dimensions.push(normalized);
  }

  return unique(dimensions.length ? dimensions : [LEGAL_DIMENSION.GENERAL]);
}

function detectAdaptiveMode(question = "", issueTypes = [], issueClassification = null) {
  const q = lower(question);
  const primary = normalizeIssue(issueClassification?.primaryIssue);
  const strategy = issueClassification?.retrievalStrategy || "";

  if (issueTypes.includes(ISSUE_TYPE.AUDIT) || issueTypes.includes(ISSUE_TYPE.PFRS)) {
    return RESPONSE_MODE.AUDIT;
  }

  if (primary === "ASSESSMENT" || strategy === "jurisprudential") {
    return RESPONSE_MODE.LITIGATION;
  }

  if (issueClassification?.factSensitivity === "high" || issueClassification?.factPatternRequired) {
    if (issueClassification?.transactionCharacterizationRequired) return RESPONSE_MODE.TRANSACTION;
    return RESPONSE_MODE.EVIDENCE_HEAVY;
  }

  if (issueTypes.includes(ISSUE_TYPE.CONTRACT)) return RESPONSE_MODE.CONTRACT;

  if (
    issueTypes.includes(ISSUE_TYPE.TRANSACTION) ||
    issueTypes.includes(ISSUE_TYPE.PRINCIPAL_AGENT) ||
    issueTypes.includes(ISSUE_TYPE.PASS_THROUGH) ||
    issueTypes.includes(ISSUE_TYPE.REIMBURSEMENT)
  ) {
    return RESPONSE_MODE.TRANSACTION;
  }

  if (issueTypes.includes(ISSUE_TYPE.EVIDENTIARY)) return RESPONSE_MODE.EVIDENCE_HEAVY;

  if (
    issueTypes.includes(ISSUE_TYPE.ASSESSMENT) ||
    issueTypes.includes(ISSUE_TYPE.TAX_REMEDIES) ||
    issueTypes.includes(ISSUE_TYPE.LOA) ||
    issueTypes.includes(ISSUE_TYPE.PAN_FAN)
  ) {
    return RESPONSE_MODE.LITIGATION;
  }

  if (
    issueTypes.includes(ISSUE_TYPE.CONFLICT_ANALYSIS) ||
    issueTypes.includes(ISSUE_TYPE.DOCTRINE) ||
    issueTypes.includes(ISSUE_TYPE.CASE_LAW)
  ) {
    return RESPONSE_MODE.TECHNICAL;
  }

  if (/\bbrief\b|\bquick\b|\bshort answer\b/i.test(q)) return RESPONSE_MODE.QUICK;
  if (/\bcpale\b|\breviewer\b|\bquiz\b|\blayman\b|\btaglish\b/i.test(q)) return RESPONSE_MODE.REVIEWER;

  return RESPONSE_MODE.STANDARD;
}

function detectRiskFlags(question = "", issueTypes = [], issueClassification = null) {
  const flags = [];

  const push = (code, message, severity = "MEDIUM") => {
    flags.push({ code, message, severity });
  };

  if (issueClassification?.potentialConflictCheck || issueTypes.includes(ISSUE_TYPE.CONFLICT_ANALYSIS)) {
    push("REQUIRES_STRICT_CONFLICT_GATE", "Do not declare doctrinal conflict unless same legal issue and opposite holding are established.", "HIGH");
  }

  if (issueClassification?.doctrinalAnalysisRequired || issueTypes.includes(ISSUE_TYPE.CASE_LAW)) {
    push("ISSUE_MATCHED_JURISPRUDENCE_ONLY", "Only issue-relevant jurisprudence should be cited.", "HIGH");
  }

  if (issueClassification?.factPatternRequired || issueTypes.includes(ISSUE_TYPE.EVIDENTIARY)) {
    push("EVIDENCE_DEPENDENT_CONCLUSION", "Strong conclusions should be deferred if evidence is incomplete.", "HIGH");
  }

  if (issueClassification?.transactionCharacterizationRequired || issueTypes.includes(ISSUE_TYPE.TRANSACTION)) {
    push("TRANSACTION_CHARACTERIZATION_REQUIRED", "Transaction characterization and economic substance analysis required.", "HIGH");
  }

  if (issueClassification?.retrievalControls?.suppressVatRefundCasesUnlessRefundIssue) {
    push("SUPPRESS_UNRELATED_VAT_REFUND_CASES", "VAT refund cases should not support non-refund VAT questions unless they state a foundational VAT doctrine.", "HIGH");
  }

  return flags;
}

function buildRetrievalHints({
  issueTypes = [],
  dimensions = [],
  issuance = null,
  caseReference = null,
  namedLaw = null,
  adaptiveMode = RESPONSE_MODE.STANDARD,
  issueClassification = null
}) {
  const includeAuthorityTypes = [];
  const priorityTerms = [];
  const retrievalInstructions = [];

  for (const authority of normalizeTargetAuthorities(issueClassification?.targetAuthorities)) {
    includeAuthorityTypes.push(authority);
  }

  for (const term of safeArray(issueClassification?.keyTerms)) {
    priorityTerms.push(term);
  }

  if (issueClassification?.legalQuestionPresented) {
    priorityTerms.push(issueClassification.legalQuestionPresented);
  }

  if (namedLaw?.detected) {
    includeAuthorityTypes.push("STATUTE", "RR", "RMC", "RMO");

    for (const law of namedLaw.laws) {
      priorityTerms.push(law.title);
      if (law.raNumber) priorityTerms.push(`RA ${law.raNumber}`);
    }

    retrievalInstructions.push("Retrieve exact statute before implementing issuances.");
  }

  if (issuance?.detected) {
    includeAuthorityTypes.push(issuance.type);
    priorityTerms.push(issuance.reference);
    retrievalInstructions.push("Retrieve exact issuance before semantic fallback.");
  }

  if (caseReference?.detected) {
    includeAuthorityTypes.push("SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION");
    priorityTerms.push(caseReference.reference);
    retrievalInstructions.push("Retrieve exact jurisprudence before semantic fallback.");
  }

  if (issueTypes.includes(ISSUE_TYPE.TRANSACTION)) {
    retrievalInstructions.push("Prioritize principal-agent, reimbursement, pass-through, concession, bundled transaction, economic substance, and substance-over-form authorities.");
  }

  if (issueTypes.includes(ISSUE_TYPE.EVIDENTIARY)) {
    retrievalInstructions.push("Prioritize documentary substantiation and evidentiary burden authorities.");
  }

  retrievalInstructions.push(`Issue-first retrieval strategy: ${issueClassification?.retrievalStrategy || "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC"}.`);

  if (issueClassification?.legalQuestionPresented) {
    retrievalInstructions.push(`Legal question presented: ${issueClassification.legalQuestionPresented}.`);
  }

  for (const exclusion of issueClassification?.excludedAuthorities || []) {
    retrievalInstructions.push(`Exclude or penalize: ${exclusion}.`);
  }

  return {
    includeAuthorityTypes: unique(includeAuthorityTypes),
    priorityTerms: unique(priorityTerms.filter(Boolean)),
    retrievalInstructions: unique(retrievalInstructions),
    adaptiveMode,
    dimensions,
    issueClassification
  };
}

function buildEngineRouting({
  issueTypes = [],
  dimensions = [],
  adaptiveMode = RESPONSE_MODE.STANDARD,
  issueClassification = null
}) {
  return {
    needsProvisionCitationEngine: adaptiveMode !== RESPONSE_MODE.QUICK,
    needsJurisprudenceEngine:
      Boolean(issueClassification?.downstreamRouting?.useJurisprudenceEngine) ||
      issueTypes.includes(ISSUE_TYPE.CASE_LAW) ||
      issueTypes.includes(ISSUE_TYPE.DOCTRINE) ||
      issueTypes.includes(ISSUE_TYPE.CONFLICT_ANALYSIS),
    needsSupersessionEngine:
      Boolean(issueClassification?.exactAuthority?.detected) ||
      issueTypes.includes(ISSUE_TYPE.ISSUANCE) ||
      dimensions.includes(LEGAL_DIMENSION.TEMPORAL),
    needsTransactionCharacterization:
      Boolean(issueClassification?.downstreamRouting?.useTransactionCharacterizationEngine) ||
      issueTypes.includes(ISSUE_TYPE.TRANSACTION),
    needsEconomicSubstance:
      issueTypes.includes(ISSUE_TYPE.ECONOMIC_SUBSTANCE) ||
      issueTypes.includes(ISSUE_TYPE.TRANSACTION),
    needsContractInterpretation:
      issueTypes.includes(ISSUE_TYPE.CONTRACT) ||
      String(issueClassification?.subIssue || "").includes("LEASE_VS_CONCESSION"),
    needsEvidenceEvaluation:
      Boolean(issueClassification?.downstreamRouting?.useEvidenceEvaluationEngine) ||
      issueTypes.includes(ISSUE_TYPE.EVIDENTIARY),
    needsRiskScoring: adaptiveMode !== RESPONSE_MODE.QUICK,
    needsPositionStrength: adaptiveMode !== RESPONSE_MODE.QUICK,
    needsAdaptivePlanner: true,
    needsAnswerRenderer: true,
    issueFirstRetrievalRequired: true,
    targetAuthorityOrderingRequired: true,
    strictConflictGateRequired: true
  };
}

function buildConclusionControls(issueTypes = [], adaptiveMode = RESPONSE_MODE.STANDARD, issueClassification = null) {
  const evidenceDependent =
    Boolean(issueClassification?.factPatternRequired || issueClassification?.fact_pattern_required) ||
    Boolean(issueClassification?.transactionCharacterizationRequired || issueClassification?.transaction_characterization_required) ||
    issueTypes.includes(ISSUE_TYPE.EVIDENTIARY) ||
    issueTypes.includes(ISSUE_TYPE.TRANSACTION) ||
    issueTypes.includes(ISSUE_TYPE.CONTRACT) ||
    issueTypes.includes(ISSUE_TYPE.ECONOMIC_SUBSTANCE);

  return {
    allowStrongConclusion: !evidenceDependent,
    requireLimitation: evidenceDependent,
    conclusionRestriction: evidenceDependent
      ? "PRELIMINARY_CONCLUSION_ONLY"
      : "DIRECT_CONCLUSION_ALLOWED",
    requiredLanguage: evidenceDependent
      ? "Based on the available facts, the position is preliminary and subject to verification."
      : "A direct conclusion may be rendered if supported by law and evidence.",
    factPatternRequired: Boolean(issueClassification?.factPatternRequired || issueClassification?.fact_pattern_required),
    transactionCharacterizationRequired: Boolean(issueClassification?.transactionCharacterizationRequired || issueClassification?.transaction_characterization_required),
    factSensitivity: issueClassification?.factSensitivity || "moderate"
  };
}

function normalizeDetectedIntent(issueTypes = [], issueClassification = null) {
  const primary = normalizeIssue(issueClassification?.primaryIssue);

  if (issueClassification?.exactAuthority?.detected) return "EXACT_AUTHORITY_RETRIEVAL";
  if (primary === "VAT_LIABILITY") return "FOUNDATIONAL_OR_SUBSTANTIVE_TAX_ANALYSIS";
  if (primary === "TRANSACTION") return "TRANSACTION_CHARACTERIZATION";
  if (primary === "ASSESSMENT") return "DISPUTE_RESOLUTION_ANALYSIS";
  if (primary === "VAT_REFUND") return "REFUND_ANALYSIS";
  if (issueTypes.includes(ISSUE_TYPE.ISSUANCE)) return "EXACT_ISSUANCE_RETRIEVAL";
  if (issueTypes.includes(ISSUE_TYPE.CASE_LAW)) return "JURISPRUDENCE_RETRIEVAL";
  if (issueTypes.includes(ISSUE_TYPE.CONTRACT)) return "CONTRACT_INTERPRETATION";
  if (issueTypes.includes(ISSUE_TYPE.TRANSACTION)) return "TRANSACTION_CHARACTERIZATION";
  if (issueTypes.includes(ISSUE_TYPE.EVIDENTIARY)) return "EVIDENCE_EVALUATION";
  if (issueTypes.includes(ISSUE_TYPE.AUDIT)) return "AUDIT_ANALYSIS";

  return "GENERAL_TAX_QUERY";
}

function normalizeRetrievalStrategyForTina(issueClassification = {}, issuance = {}, caseReference = {}) {
  if (issuance?.detected || caseReference?.detected || issueClassification?.exactAuthority?.detected) {
    return "EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC";
  }

  const strategy = String(issueClassification?.retrievalStrategy || "").toLowerCase();

  if (strategy.includes("foundational") || strategy === "foundational") return "ISSUE_FOUNDATIONAL_AUTHORITY_FIRST";
  if (strategy.includes("procedural") || strategy === "procedural") return "ISSUE_PROCEDURAL_AUTHORITY_FIRST";
  if (strategy.includes("jurisprudential") || strategy === "jurisprudential") return "ISSUE_JURISPRUDENCE_FIRST";
  if (strategy.includes("fact") || strategy === "fact-driven") return "ISSUE_FACT_DRIVEN_AUTHORITY_FIRST";
  if (strategy.includes("evidence") || strategy === "evidence-driven") return "ISSUE_EVIDENCE_AUTHORITY_FIRST";

  return "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC";
}

function buildIntentSearchQueries(question = "", intentData = null, maxQueries = 8) {
  const intent = intentData || analyzeQueryIntent(question, { skipSearchBuild: true });
  const classification = intent.issueClassification || safeIssueClassification(question);

  let issueQueries = [];

  try {
    issueQueries = buildIssueClassificationSearchQueries(classification, maxQueries);
  } catch {
    issueQueries = [];
  }

  const queries = [
    ...issueQueries,
    intent.normalizedQuestion,
    classification.legalQuestionPresented,
    classification.primaryIssue ? `${intent.normalizedQuestion} ${classification.primaryIssue}` : null,
    ...safeArray(classification.subIssues).map((issue) => `${intent.normalizedQuestion} ${issue}`)
  ];

  for (const term of intent.retrievalHints?.priorityTerms || []) {
    queries.push(`${classification.legalQuestionPresented || intent.normalizedQuestion} ${term}`);
  }

  if (intent.issuance?.detected) queries.push(intent.issuance.reference);
  if (intent.caseReference?.detected) queries.push(intent.caseReference.reference);

  return unique(queries.map(normalizeText)).slice(0, maxQueries);
}

function analyzeQueryIntent(question = "", options = {}) {
  const cleanQuestion = normalizeText(question);
  const issueClassification = normalizeClassificationShape(
    options.issueClassification || safeIssueClassification(cleanQuestion),
    cleanQuestion
  );

  const issueTypes = detectIssueTypes(cleanQuestion, issueClassification);
  const legalDimensions = detectLegalDimensions(cleanQuestion, issueClassification);
  const issuance = detectIssuanceReference(cleanQuestion);
  const caseReference = detectCaseReference(cleanQuestion);
  const namedLaw = detectNamedLaw(cleanQuestion);
  const adaptiveMode = detectAdaptiveMode(cleanQuestion, issueTypes, issueClassification);
  const detectedIntent = normalizeDetectedIntent(issueTypes, issueClassification);
  const riskFlags = detectRiskFlags(cleanQuestion, issueTypes, issueClassification);

  const retrievalHints = buildRetrievalHints({
    issueTypes,
    dimensions: legalDimensions,
    issuance,
    caseReference,
    namedLaw,
    adaptiveMode,
    issueClassification
  });

  const engineRouting = buildEngineRouting({
    issueTypes,
    dimensions: legalDimensions,
    adaptiveMode,
    issueClassification
  });

  const conclusionControls = buildConclusionControls(issueTypes, adaptiveMode, issueClassification);

  const confidence = Math.min(
    0.98,
    Math.max(
      0.58,
      0.58 +
        (issueTypes.length > 1 ? 0.08 : 0) +
        (issuance.detected ? 0.12 : 0) +
        (caseReference.detected ? 0.12 : 0) +
        (namedLaw.detected ? 0.1 : 0) +
        (riskFlags.length ? 0.08 : 0) +
        (issueClassification?.primaryIssue && issueClassification.primaryIssue !== "GENERAL_TAX" ? 0.1 : 0)
    )
  );

  const retrievalStrategy = normalizeRetrievalStrategyForTina(issueClassification, issuance, caseReference);

  const payload = {
    engine: "TINA_QUERY_INTENT_ENGINE",
    version: ENGINE_VERSION,
    originalQuestion: question,
    normalizedQuestion: cleanQuestion,

    issueClassification,

    detectedIntent,
    adaptiveMode,
    detectedMode: adaptiveMode,
    issueTypes,
    legalDimensions,
    issuance,
    caseReference,
    namedLaw,
    riskFlags,
    retrievalHints,
    engineRouting,
    conclusionControls,

    legalQuestionPresented: issueClassification.legalQuestionPresented,
    primaryIssue: issueClassification.primaryIssue,
    subIssue: issueClassification.subIssue,
    subIssues: issueClassification.subIssues,
    taxDomains: issueClassification.taxDomains,
    factSensitivity: issueClassification.factSensitivity,
    retrievalStrategy,

    targetAuthorities: issueClassification.targetAuthorities,
    targetAuthorityGroups: issueClassification.targetAuthorityGroups || {},
    caseRoleFilters: issueClassification.caseRoleFilters || [],
    excludedAuthorities: issueClassification.excludedAuthorities || [],

    intentConfidence: Number(confidence.toFixed(2)),
    requiresAFStructure: true,

    retrievalControls: {
      ...(issueClassification.retrievalControls || {}),
      issueFirst: true,
      legalQuestionPresented: issueClassification.legalQuestionPresented,
      suppressIssueMismatchedCases: true,
      useIssueClassificationMatch: true,
      useTargetAuthorityMatch: true,
      useControllingPrecedence: true,
      conflictLabelGate:
        "Do not label doctrinal conflict unless same legal issue and opposite holding are established."
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
    },

    orchestrationMetadata: {
      plannerCompatible: true,
      rendererCompatible: true,
      adaptivePipelineCompatible: true,
      issueClassificationCompatible: true,
      targetAuthorityCompatible: true,
      strictConflictGateCompatible: true,
      suggestedExecutionOrder: [
        "issue-classification-engine",
        "query-intent-engine",
        "retrieval-engine",
        "reranker-engine",
        "supersession-engine",
        "provision-citation-engine",
        "jurisprudence-engine",
        "doctrine-tagging-engine",
        "conflict-engine",
        "legal-validation-engine",
        "final-answer-compliance",
        "answer-renderer"
      ]
    },

    tinaInstruction:
      "Classify issue first, retrieve issue-specific authorities only, enforce hierarchy, suppress unrelated jurisprudence, do not declare conflict without same-issue opposite-holding analysis, disclose evidentiary limits, and avoid citation dumping."
  };

  if (!options.skipSearchBuild) {
    payload.searchTerms = buildIntentSearchQueries(cleanQuestion, payload, 10);
  }

  return payload;
}

function isIssueMismatch(queryIntent = {}, docIssueTypes = [], doc = null) {
  const queryIssues = safeArray(queryIntent.issueTypes).map(normalizeIssue).filter(Boolean);
  const docIssues = safeArray(docIssueTypes).map(normalizeIssue).filter(Boolean);
  const classification = queryIntent.issueClassification || null;

  if (classification && doc) {
    try {
      const compatible = isIssueClassificationCompatibleWithDoc(classification, doc);
      if (!compatible) return true;
    } catch {
      // Continue with fallback issue checks.
    }
  }

  if (
    queryIssues.includes("VAT_LIABILITY") &&
    docIssues.includes("VAT_REFUND") &&
    !queryIssues.includes("VAT_REFUND")
  ) {
    return true;
  }

  if (
    queryIssues.includes("VAT_REFUND") &&
    docIssues.includes("VAT_LIABILITY") &&
    !queryIssues.includes("VAT_LIABILITY")
  ) {
    return true;
  }

  if (
    queryIssues.includes("WITHHOLDING") &&
    (docIssues.includes("VAT_REFUND") || docIssues.includes("VAT_LIABILITY"))
  ) {
    return true;
  }

  return false;
}

function queryIntentEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_QUERY_INTENT_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    adaptiveCompatible: true,
    plannerCompatible: true,
    rendererCompatible: true,
    retrievalCompatible: true,
    jurisprudenceEngineCompatible: true,
    issueClassificationCompatible: true,
    issueFirstRetrievalReady: true,
    targetAuthorityArrayCompatible: true,
    sourceOrderingPolicyReady: true,
    conflictDisplayPolicyReady: true
  };
}

export {
  ENGINE_VERSION,
  ISSUE_TYPE,
  RESPONSE_MODE,
  LEGAL_DIMENSION,
  normalizeIssue,
  normalizeDimension,
  normalizeAuthority,
  normalizeTargetAuthorities,
  normalizeClassificationShape,
  detectIssuanceReference,
  detectCaseReference,
  detectNamedLaw,
  detectIssueTypes,
  detectLegalDimensions,
  analyzeQueryIntent,
  buildIntentSearchQueries,
  isIssueMismatch,
  queryIntentEngineHealthCheck
};

export default {
  ENGINE_VERSION,
  ISSUE_TYPE,
  RESPONSE_MODE,
  LEGAL_DIMENSION,
  normalizeIssue,
  normalizeDimension,
  normalizeAuthority,
  normalizeTargetAuthorities,
  normalizeClassificationShape,
  detectIssuanceReference,
  detectCaseReference,
  detectNamedLaw,
  detectIssueTypes,
  detectLegalDimensions,
  analyzeQueryIntent,
  buildIntentSearchQueries,
  isIssueMismatch,
  queryIntentEngineHealthCheck
};
