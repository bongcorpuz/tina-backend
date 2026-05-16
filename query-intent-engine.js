// FILE: query-intent-engine.js
"use strict";

/**
 * query-intent-engine.js
 * TINA Enterprise Query Intent Engine
 * Version: 3.2.0
 *
 * Integrated with:
 * - issue-classification-engine.js
 */

import {
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc
} from "./issue-classification-engine.js";

const ENGINE_VERSION = "3.2.0";

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
  SUBSTANTIVE: "substantive",
  PROCEDURAL: "procedural",
  EVIDENTIARY: "evidentiary",
  JURISDICTIONAL: "jurisdictional",
  TEMPORAL: "temporal",
  ADMINISTRATIVE: "administrative",
  FACTUAL: "factual",
  ACCOUNTING: "accounting",
  CONTRACTUAL: "contractual",
  ECONOMIC_SUBSTANCE: "economic_substance",
  AUDIT: "audit",
  GENERAL: "general"
});

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
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

function safeIssueClassification(question = "") {
  try {
    return classifyTaxIssue(question);
  } catch (error) {
    return {
      engine: "TINA_ISSUE_CLASSIFICATION_ENGINE",
      version: "fallback",
      originalQuery: question,
      normalizedQuery: normalizeText(question),
      primaryIssue: "GENERAL_TAX",
      subIssue: "GENERAL_TAX/GENERAL",
      queryIntent: "advisory",
      legalQuestionPresented: "What Philippine tax rule governs the user's issue?",
      taxDomains: ["GENERAL_TAX"],
      targetAuthorities: {
        constitution: [],
        nirc: [],
        supremeCourt: [],
        ctaEnBanc: [],
        rr: [],
        rmc: [],
        birRulings: []
      },
      keyTerms: ["GENERAL_TAX"],
      complexityFlag: "moderate",
      factSensitivity: "moderate",
      retrievalStrategy: "mixed",
      transactionCharacterizationRequired: false,
      factPatternRequired: false,
      doctrinalAnalysisRequired: false,
      potentialConflictCheck: false,
      caseRoleFilters: [],
      excludedAuthorities: [],
      mischaracterizationRisk: "low",
      exactAuthority: {
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
        suppressVatRefundCasesUnlessRefundIssue: false,
        requirePrimaryAuthorityForDefinitions: false,
        requireFactDisclosureBeforeConclusion: false,
        allowConflictLabelOnlyIfSameIssueAndOppositeHolding: true
      },
      downstreamRouting: {
        useRetrievalEngine: true,
        useRerankerEngine: true,
        useJurisprudenceEngine: false,
        useConflictEngine: false,
        useTransactionCharacterizationEngine: false,
        useFactPatternEngine: false,
        useEvidenceEvaluationEngine: false,
        useAnswerRenderer: true
      },
      classificationError: error?.message || "Issue classification failed."
    };
  }
}

function detectIssuanceReference(text = "") {
  const value = normalizeText(text);

  const patterns = [
    {
      type: "RR",
      regex: /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
    },
    {
      type: "RMC",
      regex: /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
    },
    {
      type: "RMO",
      regex: /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
    },
    {
      type: "RAMO",
      regex: /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
    }
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

  const rulingMatch = value.match(
    /\b(?:bir\s*)?ruling\s*(?:no\.?)?\s*([a-z0-9()/. -]+)\b/i
  );

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

  const ca = value.match(
    /\bca-?g\.?\s*r\.?\s*(?:sp|cv|cr)?\s*no\.?\s*([a-z0-9.-]+)\b/i
  );

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

  const primary = classification.primaryIssue || "";
  const sub = classification.subIssue || "";
  const domains = classification.taxDomains || [];

  if (domains.includes("VAT")) {
    if (primary === "REFUND") issues.push(ISSUE_TYPE.VAT_REFUND);
    else if (primary === "EXEMPTION") issues.push(ISSUE_TYPE.VAT_EXEMPTION);
    else if (sub.includes("ZERO_RATED")) issues.push(ISSUE_TYPE.ZERO_RATED_SALES);
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

  if (primary === "WITHHOLDING") issues.push(ISSUE_TYPE.WITHHOLDING_TAX);
  if (primary === "REFUND") issues.push(ISSUE_TYPE.TAX_REMEDIES);
  if (primary === "PRESCRIPTION") issues.push(ISSUE_TYPE.PRESCRIPTION);
  if (primary === "PROCEDURAL") issues.push(ISSUE_TYPE.PROCEDURAL);
  if (primary === "DISPUTE_RESOLUTION") issues.push(ISSUE_TYPE.TAX_REMEDIES);
  if (primary === "EVIDENTIARY") issues.push(ISSUE_TYPE.EVIDENTIARY);
  if (primary === "ACCOUNTING_TAX") {
    issues.push(ISSUE_TYPE.ACCOUNTING);
    issues.push(ISSUE_TYPE.PFRS);
  }

  if (primary === "CHARACTERIZATION") {
    issues.push(ISSUE_TYPE.TRANSACTION);
    issues.push(ISSUE_TYPE.ECONOMIC_SUBSTANCE);

    if (sub.includes("PRINCIPAL_AGENT")) issues.push(ISSUE_TYPE.PRINCIPAL_AGENT);
    if (sub.includes("REIMBURSEMENT")) issues.push(ISSUE_TYPE.REIMBURSEMENT);
    if (sub.includes("PASS_THROUGH")) issues.push(ISSUE_TYPE.PASS_THROUGH);
    if (sub.includes("SERVICE_VS_SALE") || sub.includes("LEASE_VS_CONCESSION")) {
      issues.push(ISSUE_TYPE.CONTRACT);
    }
  }

  if (classification.doctrinalAnalysisRequired) issues.push(ISSUE_TYPE.DOCTRINE);
  if (classification.potentialConflictCheck) issues.push(ISSUE_TYPE.CONFLICT_ANALYSIS);
  if (classification.exactAuthority?.detected) {
    if (classification.exactAuthority.type === "SUPREME_COURT" || classification.exactAuthority.type === "CTA") {
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
  push(/\bwithholding\b|\bewt\b|\bcwt\b|\bfwt\b/i.test(q), ISSUE_TYPE.WITHHOLDING_TAX);
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
  const q = lower(question);
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  const primary = issueClassification?.primaryIssue || "";
  const factSensitivity = issueClassification?.factSensitivity || "";

  if (["DEFINITION", "EXEMPTION", "WITHHOLDING", "REFUND"].includes(primary)) {
    dimensions.push(LEGAL_DIMENSION.SUBSTANTIVE);
  }

  if (["COMPLIANCE", "PROCEDURAL", "PRESCRIPTION", "DISPUTE_RESOLUTION"].includes(primary)) {
    dimensions.push(LEGAL_DIMENSION.PROCEDURAL);
  }

  if (issueClassification?.factPatternRequired || factSensitivity === "high") {
    dimensions.push(LEGAL_DIMENSION.FACTUAL);
  }

  if (issueClassification?.transactionCharacterizationRequired) {
    dimensions.push(LEGAL_DIMENSION.ECONOMIC_SUBSTANCE);
    dimensions.push(LEGAL_DIMENSION.CONTRACTUAL);
  }

  push(/\btaxable\b|\bliable\b|\bsubject to\b|\bdeductible\b|\bexempt\b/i.test(q), LEGAL_DIMENSION.SUBSTANTIVE);
  push(/\bfiling\b|\bdeadline\b|\breturn\b|\bprotest\b|\bappeal\b/i.test(q), LEGAL_DIMENSION.PROCEDURAL);
  push(/\binvoice\b|\breceipt\b|\bsubstantiation\b|\bevidence\b|\bproof\b/i.test(q), LEGAL_DIMENSION.EVIDENTIARY);
  push(/\beffective\b|\bretroactive\b|\bprospective\b|\bsuperseded\b|\bamended\b|\brepealed\b/i.test(q), LEGAL_DIMENSION.TEMPORAL);
  push(/\bcontract\b|\bagreement\b|\bclause\b|\blease\b/i.test(q), LEGAL_DIMENSION.CONTRACTUAL);
  push(/\beconomic substance\b|\bsubstance over form\b/i.test(q), LEGAL_DIMENSION.ECONOMIC_SUBSTANCE);
  push(/\baudit\b|\bmisstatement\b|\bworking paper\b/i.test(q), LEGAL_DIMENSION.AUDIT);

  return unique(dimensions.length ? dimensions : [LEGAL_DIMENSION.GENERAL]);
}

function detectAdaptiveMode(question = "", issueTypes = [], issueClassification = null) {
  const q = lower(question);
  const primary = issueClassification?.primaryIssue || "";
  const strategy = issueClassification?.retrievalStrategy || "";

  if (issueTypes.includes(ISSUE_TYPE.AUDIT) || issueTypes.includes(ISSUE_TYPE.PFRS)) {
    return RESPONSE_MODE.AUDIT;
  }

  if (primary === "DISPUTE_RESOLUTION" || strategy === "jurisprudential") {
    return RESPONSE_MODE.LITIGATION;
  }

  if (issueClassification?.factSensitivity === "high" || issueClassification?.factPatternRequired) {
    if (issueClassification?.transactionCharacterizationRequired) return RESPONSE_MODE.TRANSACTION;
    return RESPONSE_MODE.EVIDENCE_HEAVY;
  }

  if (issueTypes.includes(ISSUE_TYPE.CONTRACT)) {
    return RESPONSE_MODE.CONTRACT;
  }

  if (
    issueTypes.includes(ISSUE_TYPE.TRANSACTION) ||
    issueTypes.includes(ISSUE_TYPE.PRINCIPAL_AGENT) ||
    issueTypes.includes(ISSUE_TYPE.PASS_THROUGH) ||
    issueTypes.includes(ISSUE_TYPE.REIMBURSEMENT)
  ) {
    return RESPONSE_MODE.TRANSACTION;
  }

  if (issueTypes.includes(ISSUE_TYPE.EVIDENTIARY)) {
    return RESPONSE_MODE.EVIDENCE_HEAVY;
  }

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

  if (/\bbrief\b|\bquick\b|\bshort answer\b/i.test(q)) {
    return RESPONSE_MODE.QUICK;
  }

  if (/\bcpale\b|\breviewer\b|\bquiz\b|\blayman\b|\btaglish\b/i.test(q)) {
    return RESPONSE_MODE.REVIEWER;
  }

  return RESPONSE_MODE.STANDARD;
}

function detectRiskFlags(question = "", issueTypes = [], issueClassification = null) {
  const flags = [];

  const push = (code, message, severity = "MEDIUM") => {
    flags.push({ code, message, severity });
  };

  if (issueClassification?.potentialConflictCheck || issueTypes.includes(ISSUE_TYPE.CONFLICT_ANALYSIS)) {
    push(
      "REQUIRES_STRICT_CONFLICT_GATE",
      "Do not declare doctrinal conflict unless same legal issue and opposite holding are established.",
      "HIGH"
    );
  }

  if (issueClassification?.doctrinalAnalysisRequired || issueTypes.includes(ISSUE_TYPE.CASE_LAW)) {
    push(
      "ISSUE_MATCHED_JURISPRUDENCE_ONLY",
      "Only issue-relevant jurisprudence should be cited.",
      "HIGH"
    );
  }

  if (issueClassification?.factPatternRequired || issueTypes.includes(ISSUE_TYPE.EVIDENTIARY)) {
    push(
      "EVIDENCE_DEPENDENT_CONCLUSION",
      "Strong conclusions should be deferred if evidence is incomplete.",
      "HIGH"
    );
  }

  if (issueClassification?.transactionCharacterizationRequired || issueTypes.includes(ISSUE_TYPE.TRANSACTION)) {
    push(
      "TRANSACTION_CHARACTERIZATION_REQUIRED",
      "Transaction characterization and economic substance analysis required.",
      "HIGH"
    );
  }

  if (issueClassification?.retrievalControls?.suppressVatRefundCasesUnlessRefundIssue) {
    push(
      "SUPPRESS_UNRELATED_VAT_REFUND_CASES",
      "VAT refund cases should not support non-refund VAT questions unless they state a foundational VAT doctrine.",
      "HIGH"
    );
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

  if (issueClassification?.targetAuthorities) {
    for (const authority of issueClassification.targetAuthorities.constitution || []) {
      includeAuthorityTypes.push("CONSTITUTION");
      priorityTerms.push(authority);
    }

    for (const authority of issueClassification.targetAuthorities.nirc || []) {
      includeAuthorityTypes.push("STATUTE");
      priorityTerms.push(authority);
    }

    for (const authority of issueClassification.targetAuthorities.supremeCourt || []) {
      includeAuthorityTypes.push("SUPREME_COURT");
      priorityTerms.push(authority);
    }

    for (const authority of issueClassification.targetAuthorities.ctaEnBanc || []) {
      includeAuthorityTypes.push("CTA_EN_BANC");
      priorityTerms.push(authority);
    }

    for (const authority of issueClassification.targetAuthorities.rr || []) {
      includeAuthorityTypes.push("RR");
      priorityTerms.push(authority);
    }

    for (const authority of issueClassification.targetAuthorities.rmc || []) {
      includeAuthorityTypes.push("RMC");
      priorityTerms.push(authority);
    }

    for (const authority of issueClassification.targetAuthorities.birRulings || []) {
      includeAuthorityTypes.push("BIR_RULING");
      priorityTerms.push(authority);
    }

    retrievalInstructions.push(`Issue-first retrieval strategy: ${issueClassification.retrievalStrategy}.`);
    retrievalInstructions.push(`Legal question presented: ${issueClassification.legalQuestionPresented}.`);

    for (const exclusion of issueClassification.excludedAuthorities || []) {
      retrievalInstructions.push(`Exclude or penalize: ${exclusion}.`);
    }
  }

  if (namedLaw?.detected) {
    includeAuthorityTypes.push("STATUTE", "RR", "RMC", "RMO");

    for (const law of namedLaw.laws) {
      priorityTerms.push(law.title);

      if (law.raNumber) {
        priorityTerms.push(`RA ${law.raNumber}`);
      }
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
    retrievalInstructions.push(
      "Prioritize principal-agent, reimbursement, pass-through, concession, bundled transaction, economic substance, and substance-over-form authorities."
    );
  }

  if (issueTypes.includes(ISSUE_TYPE.EVIDENTIARY)) {
    retrievalInstructions.push("Prioritize documentary substantiation and evidentiary burden authorities.");
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
      Boolean(issueClassification?.transactionCharacterizationRequired) ||
      issueTypes.includes(ISSUE_TYPE.TRANSACTION),
    needsEconomicSubstance:
      Boolean(issueClassification?.transactionCharacterizationRequired) ||
      issueTypes.includes(ISSUE_TYPE.ECONOMIC_SUBSTANCE) ||
      issueTypes.includes(ISSUE_TYPE.TRANSACTION),
    needsContractInterpretation:
      issueTypes.includes(ISSUE_TYPE.CONTRACT) ||
      issueClassification?.subIssue?.includes("LEASE_VS_CONCESSION"),
    needsEvidenceEvaluation:
      Boolean(issueClassification?.factPatternRequired) ||
      issueTypes.includes(ISSUE_TYPE.EVIDENTIARY),
    needsRiskScoring: adaptiveMode !== RESPONSE_MODE.QUICK,
    needsPositionStrength: adaptiveMode !== RESPONSE_MODE.QUICK,
    needsAdaptivePlanner: true,
    needsAnswerRenderer: true,
    issueFirstRetrievalRequired: true
  };
}

function buildConclusionControls(issueTypes = [], adaptiveMode = RESPONSE_MODE.STANDARD, issueClassification = null) {
  const evidenceDependent =
    Boolean(issueClassification?.factPatternRequired) ||
    Boolean(issueClassification?.transactionCharacterizationRequired) ||
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
    factPatternRequired: Boolean(issueClassification?.factPatternRequired),
    transactionCharacterizationRequired: Boolean(issueClassification?.transactionCharacterizationRequired),
    factSensitivity: issueClassification?.factSensitivity || "moderate"
  };
}

function normalizeDetectedIntent(issueTypes = [], issueClassification = null) {
  if (issueClassification?.exactAuthority?.detected) {
    return "EXACT_AUTHORITY_RETRIEVAL";
  }

  if (issueClassification?.primaryIssue === "DEFINITION") {
    return "FOUNDATIONAL_DEFINITION_RETRIEVAL";
  }

  if (issueClassification?.primaryIssue === "CHARACTERIZATION") {
    return "TRANSACTION_CHARACTERIZATION";
  }

  if (issueClassification?.primaryIssue === "DISPUTE_RESOLUTION") {
    return "DISPUTE_RESOLUTION_ANALYSIS";
  }

  if (issueClassification?.primaryIssue === "REFUND") {
    return "REFUND_ANALYSIS";
  }

  if (issueTypes.includes(ISSUE_TYPE.ISSUANCE)) {
    return "EXACT_ISSUANCE_RETRIEVAL";
  }

  if (issueTypes.includes(ISSUE_TYPE.CASE_LAW)) {
    return "JURISPRUDENCE_RETRIEVAL";
  }

  if (issueTypes.includes(ISSUE_TYPE.CONTRACT)) {
    return "CONTRACT_INTERPRETATION";
  }

  if (issueTypes.includes(ISSUE_TYPE.TRANSACTION)) {
    return "TRANSACTION_CHARACTERIZATION";
  }

  if (issueTypes.includes(ISSUE_TYPE.EVIDENTIARY)) {
    return "EVIDENCE_EVALUATION";
  }

  if (issueTypes.includes(ISSUE_TYPE.AUDIT)) {
    return "AUDIT_ANALYSIS";
  }

  return "GENERAL_TAX_QUERY";
}

function normalizeRetrievalStrategyForTina(issueClassification = {}, issuance = {}, caseReference = {}) {
  if (issuance?.detected || caseReference?.detected || issueClassification?.exactAuthority?.detected) {
    return "EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC";
  }

  const strategy = issueClassification?.retrievalStrategy;

  if (strategy === "foundational") return "ISSUE_FOUNDATIONAL_AUTHORITY_FIRST";
  if (strategy === "procedural") return "ISSUE_PROCEDURAL_AUTHORITY_FIRST";
  if (strategy === "jurisprudential") return "ISSUE_JURISPRUDENCE_FIRST";
  if (strategy === "fact-driven") return "ISSUE_FACT_DRIVEN_AUTHORITY_FIRST";
  if (strategy === "evidence-driven") return "ISSUE_EVIDENCE_AUTHORITY_FIRST";

  return "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC";
}

function buildIntentSearchQueries(question = "", intentData = null, maxQueries = 8) {
  const intent =
    intentData ||
    analyzeQueryIntent(question, {
      skipSearchBuild: true
    });

  const classification = intent.issueClassification || safeIssueClassification(question);
  const issueQueries = buildIssueClassificationSearchQueries(classification, maxQueries);

  const queries = [
    ...issueQueries,
    intent.normalizedQuestion,
    classification.legalQuestionPresented
  ];

  for (const term of intent.retrievalHints?.priorityTerms || []) {
    queries.push(`${classification.legalQuestionPresented || intent.normalizedQuestion} ${term}`);
  }

  if (intent.issuance?.detected) {
    queries.push(intent.issuance.reference);
  }

  if (intent.caseReference?.detected) {
    queries.push(intent.caseReference.reference);
  }

  return unique(queries).slice(0, maxQueries);
}

function analyzeQueryIntent(question = "", options = {}) {
  const cleanQuestion = normalizeText(question);
  const issueClassification = options.issueClassification || safeIssueClassification(cleanQuestion);

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
    taxDomains: issueClassification.taxDomains,
    factSensitivity: issueClassification.factSensitivity,
    retrievalStrategy: normalizeRetrievalStrategyForTina(issueClassification, issuance, caseReference),

    targetAuthorities: issueClassification.targetAuthorities,
    caseRoleFilters: issueClassification.caseRoleFilters,
    excludedAuthorities: issueClassification.excludedAuthorities,

    intentConfidence: Number(confidence.toFixed(2)),
    requiresAFStructure: true,

    retrievalControls: {
      ...(issueClassification.retrievalControls || {}),
      issueFirst: true,
      legalQuestionPresented: issueClassification.legalQuestionPresented,
      suppressIssueMismatchedCases: true,
      conflictLabelGate:
        "Do not label doctrinal conflict unless same legal issue and opposite holding are established."
    },

    orchestrationMetadata: {
      plannerCompatible: true,
      rendererCompatible: true,
      adaptivePipelineCompatible: true,
      issueClassificationCompatible: true,
      suggestedExecutionOrder: [
        "issue-classification-engine",
        "query-intent-engine",
        "retrieval-engine",
        "reranker-engine",
        "supersession-engine",
        "jurisprudence-engine",
        "conflict-engine",
        "adaptive-response-planner",
        "answer-renderer"
      ]
    },

    tinaInstruction:
      "Apply TINA master prompt: classify issue first, retrieve issue-specific authorities only, enforce hierarchy, suppress unrelated jurisprudence, do not declare conflict without same-issue opposite-holding analysis, disclose evidentiary limits, and avoid citation dumping."
  };

  if (!options.skipSearchBuild) {
    payload.searchTerms = buildIntentSearchQueries(cleanQuestion, payload, 10);
  }

  return payload;
}

function isIssueMismatch(queryIntent = {}, docIssueTypes = [], doc = null) {
  const queryIssues = queryIntent.issueTypes || [];
  const docIssues = docIssueTypes || [];
  const classification = queryIntent.issueClassification || null;

  if (classification && doc) {
    const compatible = isIssueClassificationCompatibleWithDoc(classification, doc);
    if (!compatible) return true;
  }

  if (
    queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY) &&
    docIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_REFUND)
  ) {
    return true;
  }

  if (
    queryIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    docIssues.includes(ISSUE_TYPE.VAT_LIABILITY) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY)
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
    issueFirstRetrievalReady: true
  };
}

export {
  ENGINE_VERSION,
  ISSUE_TYPE,
  RESPONSE_MODE,
  LEGAL_DIMENSION,
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
