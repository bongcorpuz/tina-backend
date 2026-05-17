// FILE: query-intent-engine.js
"use strict";

/**
 * TINA Enterprise Query Intent Engine
 * Version: 5.0.0
 *
 * Purpose:
 * - Detect user intent before issue classification, tax-engine routing, retrieval, reasoning, and answer generation
 * - Detect orchestration mode, response mode, complexity, TPM profile, and source-grounding flags
 * - Return compact orchestration-safe metadata
 *
 * Boundary:
 * - Does not retrieve sources
 * - Does not call OpenAI
 * - Does not generate final answers
 * - Does not replace issue-classification-engine.js
 * - Does not hard-code VAT-only logic
 */

import {
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc
} from "./issue-classification-engine.js";

const ENGINE_VERSION = "5.0.0";

const ISSUE_TYPE = Object.freeze({
  VAT: "VAT",
  CIT: "CIT",
  IIT: "IIT",
  WHT: "WHT",
  EST: "EST",
  PCT: "PCT",
  EXC: "EXC",
  PRE: "PRE",
  DIS: "DIS",
  LGT: "LGT",
  CUS: "CUS",
  SPC: "SPC",
  CON: "CON",

  VAT_REFUND: "VAT_REFUND",
  VAT_LIABILITY: "VAT_LIABILITY",
  VAT_SUBSTANTIATION: "VAT_SUBSTANTIATION",
  VAT_EXEMPTION: "VAT_EXEMPTION",
  ZERO_RATED_SALES: "ZERO_RATED_SALES",

  INCOME_TAX: "INCOME_TAX",
  RCIT: "RCIT",
  MCIT: "MCIT",
  NOLCO: "NOLCO",

  WITHHOLDING: "WITHHOLDING",

  ASSESSMENT: "ASSESSMENT",
  TAX_REMEDIES: "TAX_REMEDIES",

  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",
  DOCTRINE: "DOCTRINE",
  CONFLICT_ANALYSIS: "CONFLICT_ANALYSIS",

  CONTRACT: "CONTRACT",
  TRANSACTION: "TRANSACTION",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",

  AUDIT: "AUDIT",
  ACCOUNTING: "ACCOUNTING",
  PFRS: "PFRS",

  ISSUANCE: "ISSUANCE",
  CASE_LAW: "CASE_LAW",

  REVIEW: "REVIEW",
  QUIZ: "QUIZ",
  LEARNING: "LEARNING",

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
  REVIEWER: "REVIEWER",
  QUIZ: "QUIZ",
  LEARNING: "LEARNING",
  COMPUTATION: "COMPUTATION",
  SOURCE: "SOURCE"
});

const LEGAL_DIMENSION = Object.freeze({
  SUBSTANTIVE: "SUBSTANTIVE",
  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",
  FACTUAL: "FACTUAL",
  CONTRACTUAL: "CONTRACTUAL",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",
  TRANSACTION: "TRANSACTION",
  AUDIT: "AUDIT",
  CONSTITUTIONAL: "CONSTITUTIONAL",
  COMPUTATIONAL: "COMPUTATIONAL",
  LITIGATION: "LITIGATION",
  GENERAL: "GENERAL"
});

const INTENT = Object.freeze({
  SIMPLE_DEFINITION: "SIMPLE_DEFINITION",
  LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
  SOURCE_LOOKUP: "SOURCE_LOOKUP",
  TAX_COMPUTATION: "TAX_COMPUTATION",
  FACT_PATTERN_ANALYSIS: "FACT_PATTERN_ANALYSIS",
  AUDIT_RISK_ANALYSIS: "AUDIT_RISK_ANALYSIS",
  CONTRACT_INTERPRETATION: "CONTRACT_INTERPRETATION",
  TRANSACTION_CHARACTERIZATION: "TRANSACTION_CHARACTERIZATION",
  ECONOMIC_SUBSTANCE_ANALYSIS: "ECONOMIC_SUBSTANCE_ANALYSIS",
  DOCTRINAL_ANALYSIS: "DOCTRINAL_ANALYSIS",
  CONFLICT_ANALYSIS: "CONFLICT_ANALYSIS",
  PROCEDURAL_ANALYSIS: "PROCEDURAL_ANALYSIS",
  COMPLIANCE_ANALYSIS: "COMPLIANCE_ANALYSIS",
  FILING_ANALYSIS: "FILING_ANALYSIS",
  TAX_PLANNING: "TAX_PLANNING",
  TAX_RESEARCH: "TAX_RESEARCH",
  TAX_LITIGATION: "TAX_LITIGATION",
  REFUND_ANALYSIS: "REFUND_ANALYSIS",
  PRESCRIPTION_ANALYSIS: "PRESCRIPTION_ANALYSIS",
  CTA_CASE_ANALYSIS: "CTA_CASE_ANALYSIS",
  QUIZ_MODE: "QUIZ_MODE",
  REVIEW_MODE: "REVIEW_MODE",
  ADAPTIVE_QUIZ_MODE: "ADAPTIVE_QUIZ_MODE",
  LEARNING_MODE: "LEARNING_MODE",
  COMPARATIVE_ANALYSIS: "COMPARATIVE_ANALYSIS",
  TIMELINE_ANALYSIS: "TIMELINE_ANALYSIS",
  STEP_BY_STEP_ANALYSIS: "STEP_BY_STEP_ANALYSIS",
  GENERAL_TAX_QUERY: "GENERAL_TAX_QUERY"
});

const COMPLEXITY = Object.freeze({
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH"
});

const TPM_PROFILE = Object.freeze({
  LIGHT: "LIGHT",
  STANDARD: "STANDARD",
  HEAVY: "HEAVY"
});

const ORCHESTRATION_MODE = Object.freeze({
  FAST_DEFINITION: "FAST_DEFINITION",
  STANDARD_TAX: "STANDARD_TAX",
  LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
  COMPLEX_ADVISORY: "COMPLEX_ADVISORY",
  EMERGENCY_TRIM: "EMERGENCY_TRIM"
});

const SUPPORTED_TAX_DOMAINS = Object.freeze([
  "VAT",
  "CIT",
  "IIT",
  "WHT",
  "EST",
  "PCT",
  "EXC",
  "PRE",
  "DIS",
  "LGT",
  "CUS",
  "SPC",
  "CON"
]);

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function normalizeIssue(value = "") {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    VALUE_ADDED_TAX: "VAT",
    VAT_LIABILITY: "VAT",
    VAT_REFUND: "VAT",
    VAT_EXEMPTION: "VAT",
    OUTPUT_VAT: "VAT",
    INPUT_VAT: "VAT",

    CORPORATE_INCOME_TAX: "CIT",
    INCOME_TAX: "CIT",
    RCIT: "CIT",
    MCIT: "CIT",
    NOLCO: "CIT",

    INDIVIDUAL_INCOME_TAX: "IIT",

    WITHHOLDING: "WHT",
    WITHHOLDING_TAX: "WHT",
    EWT: "WHT",
    CWT: "WHT",
    FWT: "WHT",

    ESTATE_TAX: "EST",
    DONOR_TAX: "EST",
    DONORS_TAX: "EST",

    PERCENTAGE_TAX: "PCT",
    EXCISE_TAX: "EXC",

    PRESCRIPTION: "PRE",
    ASSESSMENT: "PRE",
    DUE_PROCESS: "PRE",
    LOA: "PRE",
    PAN: "PRE",
    FAN: "PRE",
    FDDA: "PRE",

    DISPUTE_RESOLUTION: "DIS",
    PROTEST: "DIS",
    CTA_APPEAL: "DIS",

    LOCAL_TAX: "LGT",
    LOCAL_GOVERNMENT_TAX: "LGT",
    REAL_PROPERTY_TAX: "LGT",

    CUSTOMS: "CUS",
    TARIFF: "CUS",

    TRANSFER_PRICING: "SPC",
    PEZA: "SPC",
    SPECIAL_REGIME: "SPC",

    CONSTITUTIONAL: "CON",

    PRINCIPAL_AGENT: "TRANSACTION",
    GROSS_NET: "TRANSACTION",
    PASS_THROUGH: "TRANSACTION",
    REIMBURSEMENT: "TRANSACTION",
    AGREEMENT: "CONTRACT",

    GENERAL_TAX: "GENERAL_TAX"
  };

  return aliases[raw] || raw || null;
}

function hasAny(text = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
}

function countMatches(text = "", patterns = []) {
  return patterns.reduce((sum, pattern) => sum + (pattern.test(text) ? 1 : 0), 0);
}

function detectDomainSignals(text = "") {
  const q = lower(text);
  const domains = [];

  const push = (condition, domain) => {
    if (condition) domains.push(domain);
  };

  push(/\bvat\b|\bvalue[- ]added tax\b|\binput tax\b|\boutput tax\b|\bzero[- ]rated\b|\bsection 112\b/i.test(q), "VAT");
  push(/\bcit\b|\brcit\b|\bmcit\b|\bnolco\b|\bcorporate income tax\b|\bregular corporate\b|\bdeduction\b/i.test(q), "CIT");
  push(/\biit\b|\bindividual income tax\b|\bcompensation income\b|\bself[- ]employed\b|\bmixed income\b|\bfringe benefit\b/i.test(q), "IIT");
  push(/\bwht\b|\bwithholding\b|\bewt\b|\bcwt\b|\bfwt\b|\bexpanded withholding\b|\bfinal withholding\b|\b2307\b/i.test(q), "WHT");
  push(/\bestate tax\b|\bdonor'?s tax\b|\bdonor tax\b|\bgift tax\b/i.test(q), "EST");
  push(/\bpercentage tax\b|\b2551q\b|\bnon[- ]vat\b/i.test(q), "PCT");
  push(/\bexcise tax\b|\bexcise\b|\bsin tax\b/i.test(q), "EXC");
  push(/\bprescription\b|\bprescriptive\b|\bloa\b|\bpan\b|\bfan\b|\bfdda\b|\bwaiver\b|\bdue process\b|\bassessment\b/i.test(q), "PRE");
  push(/\bprotest\b|\bcta appeal\b|\bappeal to cta\b|\bcompromise\b|\brefund claim\b|\bcriminal tax\b/i.test(q), "DIS");
  push(/\blocal business tax\b|\blbt\b|\breal property tax\b|\brpt\b|\blocal franchise tax\b|\blgu\b/i.test(q), "LGT");
  push(/\bcustoms\b|\btariff\b|\bimport duty\b|\bcustoms valuation\b|\bpost[- ]clearance audit\b/i.test(q), "CUS");
  push(/\btransfer pricing\b|\bpeza\b|\bcreate incentives\b|\bfirb\b|\bjoint venture\b|\barm'?s length\b/i.test(q), "SPC");
  push(/\bconstitutional\b|\bequal protection\b|\buniformity\b|\bretroactive\b|\bdue process clause\b/i.test(q), "CON");

  return unique(domains);
}

function detectIssueSignals(text = "") {
  const q = lower(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  for (const domain of detectDomainSignals(q)) push(true, domain);

  push(/\b(vat refund|unutilized input vat|excess input vat|120\+30|section 112)\b/i.test(q), ISSUE_TYPE.VAT_REFUND);
  push(/\b(vat liability|output vat|subject to vat|vatable|what is vat|define vat)\b/i.test(q), ISSUE_TYPE.VAT_LIABILITY);
  push(/\b(vat exempt|section\s*109|zero-rated|zero rated)\b/i.test(q), ISSUE_TYPE.VAT_EXEMPTION);
  push(/\b(withholding|ewt|cwt|fwt)\b/i.test(q), ISSUE_TYPE.WITHHOLDING);
  push(/\b(income tax|rcit|mcit|nolco)\b/i.test(q), ISSUE_TYPE.INCOME_TAX);
  push(/\b(assessment|deficiency tax|loa|pan|fan|fld|fdda|protest)\b/i.test(q), ISSUE_TYPE.ASSESSMENT);
  push(/\b(invoice|receipt|substantiation|proof|evidence|documentary support)\b/i.test(q), ISSUE_TYPE.EVIDENTIARY);
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(q), ISSUE_TYPE.CONTRACT);
  push(/\b(principal|agent|pass-through|reimbursement|gross or net|bundled|package|transaction characterization)\b/i.test(q), ISSUE_TYPE.TRANSACTION);
  push(/\b(economic substance|substance over form|business purpose|sham|simulation)\b/i.test(q), ISSUE_TYPE.ECONOMIC_SUBSTANCE);
  push(/\b(audit|afs|pfrs|pas|working paper|misstatement|audit risk)\b/i.test(q), ISSUE_TYPE.AUDIT);
  push(/\b(case|jurisprudence|g\.?\s*r\.?\s*no\.?|supreme court|cta)\b/i.test(q), ISSUE_TYPE.CASE_LAW);
  push(/\b(rr|rmc|rmo|ramo|revenue regulation|revenue memorandum|bir ruling)\b/i.test(q), ISSUE_TYPE.ISSUANCE);
  push(/\b(conflict|prevails|override|hierarchy|contradict|versus|vs\.?)\b/i.test(q), ISSUE_TYPE.CONFLICT_ANALYSIS);
  push(/\b(reviewer|review mode|cpale|quiz|question bank)\b/i.test(q), ISSUE_TYPE.REVIEW);
  push(/\b(quiz|practice questions|multiple choice|mcq)\b/i.test(q), ISSUE_TYPE.QUIZ);
  push(/\b(learn|teach me|explain step by step|adaptive learning)\b/i.test(q), ISSUE_TYPE.LEARNING);

  return unique(issues.length ? issues : [ISSUE_TYPE.GENERAL_TAX]);
}

function detectLegalDimensions(question = "") {
  const q = lower(question);
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  push(/\b(taxable|liable|subject to|deductible|vatable|exempt)\b/i.test(q), LEGAL_DIMENSION.SUBSTANTIVE);
  push(/\b(file|filing|deadline|prescriptive|appeal|protest|assessment|loa|pan|fan|fdda|return|registration)\b/i.test(q), LEGAL_DIMENSION.PROCEDURAL);
  push(/\b(invoice|receipt|substantiation|evidence|proof|documentary|burden of proof)\b/i.test(q), LEGAL_DIMENSION.EVIDENTIARY);
  push(/\b(facts|actual|circumstances|scenario|transaction structure|given that)\b/i.test(q), LEGAL_DIMENSION.FACTUAL);
  push(/\b(contract|agreement|lease|clause|concession)\b/i.test(q), LEGAL_DIMENSION.CONTRACTUAL);
  push(/\b(economic substance|substance over form|business purpose|sham|simulation)\b/i.test(q), LEGAL_DIMENSION.ECONOMIC_SUBSTANCE);
  push(/\b(principal|agent|pass-through|reimbursement|gross or net|bundled)\b/i.test(q), LEGAL_DIMENSION.TRANSACTION);
  push(/\b(audit|afs|working paper|pfrs|misstatement|audit risk)\b/i.test(q), LEGAL_DIMENSION.AUDIT);
  push(/\b(due process|equal protection|uniformity|constitutional|retroactive)\b/i.test(q), LEGAL_DIMENSION.CONSTITUTIONAL);
  push(/\b(compute|calculate|computation|how much|tax due|tax payable|tax liability)\b/i.test(q), LEGAL_DIMENSION.COMPUTATIONAL);
  push(/\b(litigation|case|cta|supreme court|appeal|protest)\b/i.test(q), LEGAL_DIMENSION.LITIGATION);

  return unique(dimensions.length ? dimensions : [LEGAL_DIMENSION.GENERAL]);
}

function safeIssueClassification(question = "", queryIntent = null) {
  try {
    const raw = classifyTaxIssue(question, queryIntent || {});

    return {
      ...raw,

      primaryIssue:
        normalizeIssue(
          raw.primaryIssue ||
          raw.primary_issue ||
          raw.domainCode ||
          raw.domain_code ||
          "GENERAL_TAX"
        ) || "GENERAL_TAX",

      domainCode:
        raw.domainCode ||
        raw.domain_code ||
        normalizeIssue(raw.primaryIssue) ||
        null,

      domainName:
        raw.domainName ||
        raw.domain_name ||
        null,

      subIssue:
        raw.subIssue ||
        raw.sub_issue ||
        null,

      subIssues: unique([
        raw.subIssue,
        raw.sub_issue,
        normalizeIssue(raw.primaryIssue),
        ...safeArray(raw.subIssues).map(normalizeIssue)
      ]).filter(Boolean),

      legalQuestionPresented:
        raw.legalQuestionPresented ||
        raw.legal_question_presented ||
        question,

      retrievalStrategy:
        raw.retrievalStrategy ||
        raw.retrieval_strategy ||
        "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",

      targetAuthorities:
        safeArray(raw.targetAuthorities),

      controllingAuthorities:
        safeArray(raw.controllingAuthorities),

      supportingAuthorities:
        safeArray(raw.supportingAuthorities),

      supportingJurisprudence:
        safeArray(raw.supportingJurisprudence),

      factSensitivity:
        raw.factSensitivity || "moderate"
    };
  } catch (error) {
    return {
      primaryIssue: "GENERAL_TAX",
      domainCode: null,
      domainName: "General Philippine Tax",
      subIssue: "GENERAL",
      subIssues: ["GENERAL_TAX"],
      legalQuestionPresented: question,
      retrievalStrategy: "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",
      targetAuthorities: [],
      controllingAuthorities: [],
      supportingAuthorities: [],
      supportingJurisprudence: [],
      factSensitivity: "moderate",
      classificationError: error?.message || "classification failed"
    };
  }
}

function detectSourceLookup(question = "") {
  const q = lower(question);

  return /\b(source|sources|citation|citations|legal basis|authority|authorities|show me|where in|what section|what rr|what rmc|what case|basis only|source only)\b/i.test(q);
}

function detectSimpleDefinition(question = "") {
  const q = lower(question);

  return (
    q.length <= 180 &&
    /\b(what is|define|meaning of|ano ang|nature of|scope of)\b/i.test(q) &&
    !/\b(analyze|risk|audit|contract|jurisprudence|doctrine|conflict|legal consequence|assessment|substance|evidence|compare|reconcile|compute|calculate)\b/i.test(q)
  );
}

function detectReviewMode(question = "", options = {}) {
  const q = lower(question);

  return Boolean(
    options.reviewMode ||
      options.requiresReviewMode ||
      /\b(review mode|reviewer|cpale|board exam|bar review|tax reviewer|review questions|study guide)\b/i.test(q)
  );
}

function detectQuizMode(question = "", options = {}) {
  const q = lower(question);

  return Boolean(
    options.quizMode ||
      options.requiresQuizMode ||
      /\b(quiz|practice questions|multiple choice|mcq|true or false|flashcards|question bank|test me)\b/i.test(q)
  );
}

function detectAdaptiveLearningMode(question = "", options = {}) {
  const q = lower(question);

  return Boolean(
    options.learningMode ||
      options.requiresLearningMode ||
      options.adaptiveQuizMode ||
      options.requiresAdaptiveQuiz ||
      /\b(adaptive quiz|adaptive learning|teach me|learn|explain to me|lesson|tutorial|weak areas)\b/i.test(q)
  );
}

function detectExplicitReviewMaterialsRequest(question = "") {
  const q = lower(question);

  return /\b(cpa notes|review materials|reviewer materials|lecture notes|handout|cpale reviewer)\b/i.test(q);
}

function detectPrimaryIntent(question = "", issueTypes = [], dimensions = [], options = {}) {
  const q = lower(question);

  if (detectQuizMode(question, options) && detectAdaptiveLearningMode(question, options)) {
    return INTENT.ADAPTIVE_QUIZ_MODE;
  }

  if (detectQuizMode(question, options)) return INTENT.QUIZ_MODE;
  if (detectReviewMode(question, options)) return INTENT.REVIEW_MODE;
  if (detectAdaptiveLearningMode(question, options)) return INTENT.LEARNING_MODE;

  if (detectSimpleDefinition(question)) return INTENT.SIMPLE_DEFINITION;

  if (/\b(source inventory|list.*sources|list.*authorities|show.*sources|citations only|source only|legal basis only)\b/i.test(q)) {
    return INTENT.SOURCE_LOOKUP;
  }

  if (/\b(compute|calculate|computation|tax due|tax payable|how much|prepare.*schedule|create.*computation)\b/i.test(q)) {
    return INTENT.TAX_COMPUTATION;
  }

  if (/\b(conflict|contradict|prevails|override|hierarchy|which.*prevails|conflicting)\b/i.test(q)) {
    return INTENT.CONFLICT_ANALYSIS;
  }

  if (/\b(doctrine|doctrinal|jurisprudence|case law|supreme court|cta|g\.?\s*r\.?\s*no)\b/i.test(q)) {
    return INTENT.DOCTRINAL_ANALYSIS;
  }

  if (/\b(cta appeal|appeal to cta|tax litigation|litigation|case strategy|legal defense|petition for review)\b/i.test(q)) {
    return INTENT.TAX_LITIGATION;
  }

  if (/\b(prescription|prescriptive period|waiver|loa|pan|fan|fdda|assessment due process|validity of assessment)\b/i.test(q)) {
    return INTENT.PROCEDURAL_ANALYSIS;
  }

  if (/\b(refund|tax credit|claim for refund|tcc|unutilized input|excess input)\b/i.test(q)) {
    return INTENT.REFUND_ANALYSIS;
  }

  if (/\b(fact pattern|analyze facts|given these facts|scenario|actual transaction|evaluate this transaction|legal consequence)\b/i.test(q)) {
    return INTENT.FACT_PATTERN_ANALYSIS;
  }

  if (/\b(audit risk|misstatement|working paper|audit finding|afs impact|audit evidence|audit procedure)\b/i.test(q)) {
    return INTENT.AUDIT_RISK_ANALYSIS;
  }

  if (/\b(contract|agreement|clause|lease|concession|rights and obligations)\b/i.test(q)) {
    return INTENT.CONTRACT_INTERPRETATION;
  }

  if (/\b(principal|agent|pass[- ]through|reimbursement|gross or net|bundled|package|classification|characterization)\b/i.test(q)) {
    return INTENT.TRANSACTION_CHARACTERIZATION;
  }

  if (/\b(economic substance|substance over form|business purpose|sham|simulation)\b/i.test(q)) {
    return INTENT.ECONOMIC_SUBSTANCE_ANALYSIS;
  }

  if (/\b(filing|file|deadline|due date|return|registration|submit|compliance|form)\b/i.test(q)) {
    return /\bfiling|file|deadline|due date|return|form\b/i.test(q)
      ? INTENT.FILING_ANALYSIS
      : INTENT.COMPLIANCE_ANALYSIS;
  }

  if (/\b(compare|comparison|versus|vs\.?|difference between|distinguish)\b/i.test(q)) {
    return INTENT.COMPARATIVE_ANALYSIS;
  }

  if (/\b(timeline|chronology|sequence|step by step date|period)\b/i.test(q)) {
    return INTENT.TIMELINE_ANALYSIS;
  }

  if (/\b(step by step|procedure|process|how to)\b/i.test(q)) {
    return INTENT.STEP_BY_STEP_ANALYSIS;
  }

  if (/\b(plan|planning|structure|tax efficient|better structure|recommend)\b/i.test(q)) {
    return INTENT.TAX_PLANNING;
  }

  if (detectSourceLookup(question)) {
    return INTENT.TAX_RESEARCH;
  }

  if (
    dimensions.includes(LEGAL_DIMENSION.FACTUAL) ||
    issueTypes.includes(ISSUE_TYPE.TRANSACTION) ||
    issueTypes.includes(ISSUE_TYPE.ECONOMIC_SUBSTANCE)
  ) {
    return INTENT.FACT_PATTERN_ANALYSIS;
  }

  if (
    dimensions.includes(LEGAL_DIMENSION.PROCEDURAL) ||
    issueTypes.includes(ISSUE_TYPE.ASSESSMENT)
  ) {
    return INTENT.PROCEDURAL_ANALYSIS;
  }

  return INTENT.GENERAL_TAX_QUERY;
}

function buildIntentFlags(question = "", intent = INTENT.GENERAL_TAX_QUERY, issueTypes = [], dimensions = [], options = {}) {
  const q = lower(question);

  const requiresReviewMode =
    intent === INTENT.REVIEW_MODE ||
    intent === INTENT.QUIZ_MODE ||
    intent === INTENT.ADAPTIVE_QUIZ_MODE ||
    detectReviewMode(question, options);

  const requiresQuizMode =
    intent === INTENT.QUIZ_MODE ||
    intent === INTENT.ADAPTIVE_QUIZ_MODE ||
    detectQuizMode(question, options);

  const requiresAdaptiveQuiz =
    intent === INTENT.ADAPTIVE_QUIZ_MODE ||
    (requiresQuizMode && detectAdaptiveLearningMode(question, options));

  const requiresLearningMode =
    intent === INTENT.LEARNING_MODE ||
    intent === INTENT.ADAPTIVE_QUIZ_MODE ||
    detectAdaptiveLearningMode(question, options);

  const requiresSimpleDefinition =
    intent === INTENT.SIMPLE_DEFINITION ||
    detectSimpleDefinition(question);

  const requiresComputation =
    intent === INTENT.TAX_COMPUTATION ||
    dimensions.includes(LEGAL_DIMENSION.COMPUTATIONAL) ||
    /\b(compute|calculate|computation|how much|tax due|tax payable|amount)\b/i.test(q);

  const requiresConflictAnalysis =
    intent === INTENT.CONFLICT_ANALYSIS ||
    issueTypes.includes(ISSUE_TYPE.CONFLICT_ANALYSIS) ||
    /\b(conflict|contradict|prevails|override|hierarchy|which.*prevails)\b/i.test(q);

  const requiresDoctrineAnalysis =
    intent === INTENT.DOCTRINAL_ANALYSIS ||
    requiresConflictAnalysis ||
    issueTypes.includes(ISSUE_TYPE.CASE_LAW) ||
    /\b(doctrine|doctrinal|jurisprudence|case law|supreme court|cta|g\.?\s*r\.?\s*no)\b/i.test(q);

  const requiresJurisprudence =
    requiresDoctrineAnalysis ||
    /\b(jurisprudence|case|supreme court|cta|g\.?\s*r\.?\s*no)\b/i.test(q);

  const requiresProceduralAnalysis =
    intent === INTENT.PROCEDURAL_ANALYSIS ||
    intent === INTENT.PRESCRIPTION_ANALYSIS ||
    intent === INTENT.CTA_CASE_ANALYSIS ||
    dimensions.includes(LEGAL_DIMENSION.PROCEDURAL) ||
    issueTypes.includes(ISSUE_TYPE.ASSESSMENT);

  const requiresLitigationAnalysis =
    intent === INTENT.TAX_LITIGATION ||
    intent === INTENT.CTA_CASE_ANALYSIS ||
    dimensions.includes(LEGAL_DIMENSION.LITIGATION);

  const requiresFactPatternAnalysis =
    intent === INTENT.FACT_PATTERN_ANALYSIS ||
    dimensions.includes(LEGAL_DIMENSION.FACTUAL) ||
    /\b(fact pattern|scenario|actual transaction|evaluate|analyze this transaction|given these facts)\b/i.test(q);

  const requiresAuditRiskAnalysis =
    intent === INTENT.AUDIT_RISK_ANALYSIS ||
    dimensions.includes(LEGAL_DIMENSION.AUDIT) ||
    issueTypes.includes(ISSUE_TYPE.AUDIT);

  const requiresContractInterpretation =
    intent === INTENT.CONTRACT_INTERPRETATION ||
    dimensions.includes(LEGAL_DIMENSION.CONTRACTUAL) ||
    issueTypes.includes(ISSUE_TYPE.CONTRACT);

  const requiresTransactionCharacterization =
    intent === INTENT.TRANSACTION_CHARACTERIZATION ||
    issueTypes.includes(ISSUE_TYPE.TRANSACTION) ||
    dimensions.includes(LEGAL_DIMENSION.TRANSACTION);

  const requiresEconomicSubstanceAnalysis =
    intent === INTENT.ECONOMIC_SUBSTANCE_ANALYSIS ||
    issueTypes.includes(ISSUE_TYPE.ECONOMIC_SUBSTANCE) ||
    dimensions.includes(LEGAL_DIMENSION.ECONOMIC_SUBSTANCE);

  const requiresEvidenceEvaluation =
    dimensions.includes(LEGAL_DIMENSION.EVIDENTIARY) ||
    issueTypes.includes(ISSUE_TYPE.EVIDENTIARY) ||
    /\b(evidence|proof|substantiation|invoice|receipt|documentary support|burden of proof)\b/i.test(q);

  const requiresSourceInventory =
    intent === INTENT.SOURCE_LOOKUP ||
    /\b(source inventory|list.*sources|list.*authorities|what authorities|citations only|source only)\b/i.test(q);

  const requiresLegalBasis =
    requiresSimpleDefinition ||
    requiresSourceInventory ||
    requiresDoctrineAnalysis ||
    requiresProceduralAnalysis ||
    requiresLitigationAnalysis ||
    detectSourceLookup(question) ||
    /\b(legal basis|basis|authority|rule|law|section|rr|rmc|rmo|case)\b/i.test(q);

  const requiresComplianceAnalysis =
    intent === INTENT.COMPLIANCE_ANALYSIS ||
    intent === INTENT.FILING_ANALYSIS ||
    /\b(compliance|comply|registration|return|filing|file|deadline|due date|submit|form)\b/i.test(q);

  const requiresFilingAnalysis =
    intent === INTENT.FILING_ANALYSIS ||
    /\b(filing|file|deadline|due date|return|form|submit)\b/i.test(q);

  const requiresPracticalApplication =
    !requiresReviewMode ||
    /\b(apply|practical|risk|treatment|proper|should|can we|how to)\b/i.test(q);

  const requiresComparativeAnalysis =
    intent === INTENT.COMPARATIVE_ANALYSIS ||
    /\b(compare|comparison|versus|vs\.?|difference between|distinguish)\b/i.test(q);

  const requiresTimelineAnalysis =
    intent === INTENT.TIMELINE_ANALYSIS ||
    /\b(timeline|chronology|sequence|period|date|when)\b/i.test(q);

  const requiresStepByStepAnalysis =
    intent === INTENT.STEP_BY_STEP_ANALYSIS ||
    /\b(step by step|process|procedure|walk me through|how to)\b/i.test(q);

  const requiresRiskScoring =
    requiresAuditRiskAnalysis ||
    requiresFactPatternAnalysis ||
    requiresTransactionCharacterization ||
    /\b(risk|exposure|position strength|weakness|likelihood)\b/i.test(q);

  const requiresPositionStrengthAnalysis =
    requiresRiskScoring ||
    /\b(position strength|strong position|weak position|defensible|supportable)\b/i.test(q);

  const requiresSourceGrounding =
    options.requiresSourceGrounding !== false &&
    (
      requiresLegalBasis ||
      requiresJurisprudence ||
      requiresComplianceAnalysis ||
      requiresProceduralAnalysis ||
      requiresComputation ||
      requiresFactPatternAnalysis ||
      requiresAuditRiskAnalysis ||
      requiresContractInterpretation ||
      requiresTransactionCharacterization ||
      requiresEconomicSubstanceAnalysis ||
      requiresReviewMode ||
      requiresQuizMode ||
      SUPPORTED_TAX_DOMAINS.some((domain) => issueTypes.includes(domain))
    );

  return {
    requiresSimpleDefinition,
    requiresLegalBasis,
    requiresJurisprudence,
    requiresSourceInventory,
    requiresComputation,
    requiresAuditRiskAnalysis,
    requiresFactPatternAnalysis,
    requiresContractInterpretation,
    requiresTransactionCharacterization,
    requiresEconomicSubstanceAnalysis,
    requiresConflictAnalysis,
    requiresProceduralAnalysis,
    requiresReviewMode,
    requiresQuizMode,
    requiresAdaptiveQuiz,
    requiresLearningMode,
    requiresEvidenceEvaluation,
    requiresPositionStrengthAnalysis,
    requiresRiskScoring,
    requiresPracticalApplication,
    requiresComparativeAnalysis,
    requiresTimelineAnalysis,
    requiresStepByStepAnalysis,
    requiresComplianceAnalysis,
    requiresFilingAnalysis,
    requiresLitigationAnalysis,
    requiresDoctrineAnalysis,
    requiresSourceGrounding,
    allowReviewMaterials:
      requiresReviewMode ||
      requiresQuizMode ||
      requiresAdaptiveQuiz ||
      detectExplicitReviewMaterialsRequest(question)
  };
}

function detectComplexity(question = "", flags = {}, issueTypes = []) {
  const q = lower(question);
  let score = 0;

  if (question.length > 220) score += 1;
  if (issueTypes.length >= 3) score += 1;

  if (flags.requiresFactPatternAnalysis) score += 2;
  if (flags.requiresAuditRiskAnalysis) score += 2;
  if (flags.requiresContractInterpretation) score += 1;
  if (flags.requiresTransactionCharacterization) score += 2;
  if (flags.requiresEconomicSubstanceAnalysis) score += 2;
  if (flags.requiresConflictAnalysis) score += 2;
  if (flags.requiresLitigationAnalysis) score += 2;
  if (flags.requiresComputation) score += 1;
  if (flags.requiresReviewMode || flags.requiresQuizMode) score += 1;

  if (/\b(complex|comprehensive|deep|full analysis|analyze and recheck|evaluate|risk|legal consequence)\b/i.test(q)) {
    score += 2;
  }

  if (flags.requiresSimpleDefinition && score <= 1) return COMPLEXITY.LOW;
  if (score >= 4) return COMPLEXITY.HIGH;
  if (score >= 2) return COMPLEXITY.MODERATE;
  return COMPLEXITY.LOW;
}

function assignTpmProfile(complexity = COMPLEXITY.MODERATE, flags = {}) {
  if (
    complexity === COMPLEXITY.HIGH ||
    flags.requiresFactPatternAnalysis ||
    flags.requiresAuditRiskAnalysis ||
    flags.requiresConflictAnalysis ||
    flags.requiresLitigationAnalysis ||
    flags.requiresSourceInventory
  ) {
    return TPM_PROFILE.HEAVY;
  }

  if (
    complexity === COMPLEXITY.LOW &&
    flags.requiresSimpleDefinition &&
    !flags.requiresJurisprudence &&
    !flags.requiresComputation
  ) {
    return TPM_PROFILE.LIGHT;
  }

  return TPM_PROFILE.STANDARD;
}

function detectResponseMode(intent = INTENT.GENERAL_TAX_QUERY, flags = {}) {
  if (flags.requiresReviewMode) return RESPONSE_MODE.REVIEWER;
  if (flags.requiresQuizMode) return RESPONSE_MODE.QUIZ;
  if (flags.requiresLearningMode) return RESPONSE_MODE.LEARNING;
  if (flags.requiresComputation) return RESPONSE_MODE.COMPUTATION;
  if (flags.requiresSourceInventory) return RESPONSE_MODE.SOURCE;
  if (flags.requiresAuditRiskAnalysis) return RESPONSE_MODE.AUDIT;
  if (flags.requiresLitigationAnalysis || flags.requiresProceduralAnalysis) return RESPONSE_MODE.LITIGATION;
  if (flags.requiresContractInterpretation) return RESPONSE_MODE.CONTRACT;
  if (flags.requiresTransactionCharacterization || flags.requiresEconomicSubstanceAnalysis) return RESPONSE_MODE.TRANSACTION;
  if (flags.requiresEvidenceEvaluation) return RESPONSE_MODE.EVIDENCE_HEAVY;
  if (flags.requiresJurisprudence || flags.requiresDoctrineAnalysis || flags.requiresConflictAnalysis) return RESPONSE_MODE.TECHNICAL;
  if (flags.requiresSimpleDefinition) return RESPONSE_MODE.QUICK;

  return RESPONSE_MODE.STANDARD;
}

function detectOrchestrationMode(intent = INTENT.GENERAL_TAX_QUERY, complexity = COMPLEXITY.MODERATE, flags = {}) {
  if (flags.requiresSimpleDefinition && complexity === COMPLEXITY.LOW) {
    return ORCHESTRATION_MODE.FAST_DEFINITION;
  }

  if (
    flags.requiresFactPatternAnalysis ||
    flags.requiresAuditRiskAnalysis ||
    flags.requiresContractInterpretation ||
    flags.requiresTransactionCharacterization ||
    flags.requiresEconomicSubstanceAnalysis ||
    complexity === COMPLEXITY.HIGH
  ) {
    return ORCHESTRATION_MODE.COMPLEX_ADVISORY;
  }

  if (
    flags.requiresJurisprudence ||
    flags.requiresDoctrineAnalysis ||
    flags.requiresConflictAnalysis ||
    flags.requiresLitigationAnalysis ||
    flags.requiresProceduralAnalysis
  ) {
    return ORCHESTRATION_MODE.LEGAL_ANALYSIS;
  }

  return ORCHESTRATION_MODE.STANDARD_TAX;
}

function computeIntentConfidence(question = "", intent = INTENT.GENERAL_TAX_QUERY, flags = {}, issueTypes = [], dimensions = []) {
  let confidence = 0.45;

  if (intent !== INTENT.GENERAL_TAX_QUERY) confidence += 0.2;
  if (issueTypes.length > 1 && !issueTypes.includes(ISSUE_TYPE.GENERAL_TAX)) confidence += 0.1;
  if (dimensions.length > 1 && !dimensions.includes(LEGAL_DIMENSION.GENERAL)) confidence += 0.08;

  const explicitSignals = [
    flags.requiresSimpleDefinition,
    flags.requiresLegalBasis,
    flags.requiresJurisprudence,
    flags.requiresSourceInventory,
    flags.requiresComputation,
    flags.requiresAuditRiskAnalysis,
    flags.requiresFactPatternAnalysis,
    flags.requiresContractInterpretation,
    flags.requiresTransactionCharacterization,
    flags.requiresEconomicSubstanceAnalysis,
    flags.requiresConflictAnalysis,
    flags.requiresProceduralAnalysis,
    flags.requiresReviewMode,
    flags.requiresQuizMode
  ].filter(Boolean).length;

  confidence += Math.min(0.2, explicitSignals * 0.025);

  if (normalizeText(question).length < 8) confidence -= 0.15;

  return Math.max(0.1, Math.min(0.98, Number(confidence.toFixed(2))));
}

function buildEngineRouting({ flags = {}, issueTypes = [], legalDimensions = [] }) {
  return {
    needsProvisionCitationEngine: true,

    needsJurisprudenceEngine:
      flags.requiresJurisprudence ||
      flags.requiresDoctrineAnalysis ||
      flags.requiresConflictAnalysis,

    needsSupersessionEngine:
      issueTypes.includes(ISSUE_TYPE.ISSUANCE) ||
      flags.requiresSourceGrounding,

    needsTransactionCharacterization:
      flags.requiresTransactionCharacterization,

    needsEconomicSubstance:
      flags.requiresEconomicSubstanceAnalysis,

    needsContractInterpretation:
      flags.requiresContractInterpretation,

    needsEvidenceEvaluation:
      flags.requiresEvidenceEvaluation,

    needsRiskScoring:
      flags.requiresRiskScoring,

    needsPositionStrength:
      flags.requiresPositionStrengthAnalysis,

    needsAdaptivePlanner: true,
    needsAnswerRenderer: true,

    needsReviewEngine:
      flags.requiresReviewMode,

    needsQuizEngine:
      flags.requiresQuizMode,

    needsLearningEngine:
      flags.requiresLearningMode,

    issueFirstRetrievalRequired: true,
    targetAuthorityOrderingRequired: true,
    strictConflictGateRequired: true,
    sourceGroundingRequired:
      flags.requiresSourceGrounding
  };
}

function buildSourcePolicy(flags = {}) {
  return {
    requiresSourceGrounding:
      flags.requiresSourceGrounding === true,

    useGoogleDriveIndexedSourcesFirst:
      true,

    excludeCpaNotesAndReviewMaterials:
      !flags.allowReviewMaterials,

    allowCpaNotesAndReviewMaterials:
      flags.allowReviewMaterials === true,

    excludedFolders:
      flags.allowReviewMaterials
        ? []
        : ["07_CPA_NOTES", "08_REVIEW_MATERIALS"],

    allowedReviewFolders:
      flags.allowReviewMaterials
        ? ["07_CPA_NOTES", "08_REVIEW_MATERIALS"]
        : [],

    preserveControllingAuthorities:
      true,

    preserveTargetAuthorityMatches:
      true,

    preserveIssueClassificationMatches:
      true,

    compactSourcesOnly:
      true,

    preventRawFullDocumentInjection:
      true
  };
}

function buildContextPolicy(tpmProfile = TPM_PROFILE.STANDARD) {
  return {
    useContextOrchestrationEngine: true,
    compressSourcesBeforeOpenAI: true,
    finalTrimBeforeOpenAI: true,
    preventRawFullDocumentInjection: true,
    preventFullDebugObjectInjection: true,
    preventFullEngineOutputInjection: true,
    compactIntentOnly: true,
    tpmProfile
  };
}

function buildOrchestrationIntent({
  intent = INTENT.GENERAL_TAX_QUERY,
  responseMode = RESPONSE_MODE.STANDARD,
  orchestrationMode = ORCHESTRATION_MODE.STANDARD_TAX,
  complexity = COMPLEXITY.MODERATE,
  tpmProfile = TPM_PROFILE.STANDARD,
  flags = {},
  confidence = 0,
  fallbackIntentUsed = false
} = {}) {
  return {
    intent,
    responseMode,
    adaptiveMode: responseMode,
    orchestrationMode,
    complexity,
    tpmProfile,

    requiresSimpleDefinition: Boolean(flags.requiresSimpleDefinition),
    requiresLegalBasis: Boolean(flags.requiresLegalBasis),
    requiresJurisprudence: Boolean(flags.requiresJurisprudence),
    requiresSourceInventory: Boolean(flags.requiresSourceInventory),
    requiresComputation: Boolean(flags.requiresComputation),
    requiresAuditRiskAnalysis: Boolean(flags.requiresAuditRiskAnalysis),
    requiresAuditRisk: Boolean(flags.requiresAuditRiskAnalysis),
    requiresFactPatternAnalysis: Boolean(flags.requiresFactPatternAnalysis),
    requiresContractInterpretation: Boolean(flags.requiresContractInterpretation),
    requiresTransactionCharacterization: Boolean(flags.requiresTransactionCharacterization),
    requiresEconomicSubstanceAnalysis: Boolean(flags.requiresEconomicSubstanceAnalysis),
    requiresEconomicSubstance: Boolean(flags.requiresEconomicSubstanceAnalysis),
    requiresConflictAnalysis: Boolean(flags.requiresConflictAnalysis),
    requiresProceduralAnalysis: Boolean(flags.requiresProceduralAnalysis),
    requiresReviewMode: Boolean(flags.requiresReviewMode),
    requiresQuizMode: Boolean(flags.requiresQuizMode),
    requiresAdaptiveQuiz: Boolean(flags.requiresAdaptiveQuiz),
    requiresLearningMode: Boolean(flags.requiresLearningMode),
    requiresEvidenceEvaluation: Boolean(flags.requiresEvidenceEvaluation),
    requiresPositionStrengthAnalysis: Boolean(flags.requiresPositionStrengthAnalysis),
    requiresRiskScoring: Boolean(flags.requiresRiskScoring),
    requiresPracticalApplication: Boolean(flags.requiresPracticalApplication),
    requiresComparativeAnalysis: Boolean(flags.requiresComparativeAnalysis),
    requiresTimelineAnalysis: Boolean(flags.requiresTimelineAnalysis),
    requiresStepByStepAnalysis: Boolean(flags.requiresStepByStepAnalysis),
    requiresComplianceAnalysis: Boolean(flags.requiresComplianceAnalysis),
    requiresFilingAnalysis: Boolean(flags.requiresFilingAnalysis),
    requiresLitigationAnalysis: Boolean(flags.requiresLitigationAnalysis),
    requiresDoctrineAnalysis: Boolean(flags.requiresDoctrineAnalysis),
    requiresSourceGrounding: Boolean(flags.requiresSourceGrounding),

    allowReviewMaterials: Boolean(flags.allowReviewMaterials),

    confidence,
    fallbackIntentUsed,

    contextPolicy: buildContextPolicy(tpmProfile),
    sourcePolicy: buildSourcePolicy(flags)
  };
}

function analyzeQueryIntent(question = "", options = {}) {
  const cleanQuestion = normalizeText(question);
  const issueTypes = detectIssueSignals(cleanQuestion);
  const legalDimensions = detectLegalDimensions(cleanQuestion);

  const detectedIntent = detectPrimaryIntent(
    cleanQuestion,
    issueTypes,
    legalDimensions,
    options
  );

  const flags = buildIntentFlags(
    cleanQuestion,
    detectedIntent,
    issueTypes,
    legalDimensions,
    options
  );

  const complexity = detectComplexity(cleanQuestion, flags, issueTypes);
  const tpmProfile = assignTpmProfile(complexity, flags);
  const responseMode = detectResponseMode(detectedIntent, flags);
  const orchestrationMode = detectOrchestrationMode(detectedIntent, complexity, flags);

  const confidence = computeIntentConfidence(
    cleanQuestion,
    detectedIntent,
    flags,
    issueTypes,
    legalDimensions
  );

  const fallbackIntentUsed =
    confidence < 0.55 ||
    detectedIntent === INTENT.GENERAL_TAX_QUERY;

  const orchestrationIntent = buildOrchestrationIntent({
    intent: detectedIntent,
    responseMode,
    orchestrationMode,
    complexity,
    tpmProfile,
    flags,
    confidence,
    fallbackIntentUsed
  });

  const engineRouting = buildEngineRouting({
    flags,
    issueTypes,
    legalDimensions
  });

  const issueClassification =
    options.issueClassification ||
    (
      options.skipIssueClassification === true
        ? null
        : safeIssueClassification(cleanQuestion, orchestrationIntent)
    );

  const payload = {
    engine: "TINA_QUERY_INTENT_ENGINE",
    version: ENGINE_VERSION,

    originalQuestion: question,
    normalizedQuestion: cleanQuestion,

    intent: detectedIntent,
    detectedIntent,
    responseMode,
    adaptiveMode: responseMode,
    detectedMode: responseMode,
    orchestrationMode,
    complexity,
    tpmProfile,

    confidence,
    fallbackIntentUsed,

    issueTypes,
    legalDimensions,

    supportedTaxDomains: SUPPORTED_TAX_DOMAINS,
    domainSignals: detectDomainSignals(cleanQuestion),

    issueClassification,

    retrievalStrategy:
      issueClassification?.retrievalStrategy ||
      null,

    targetAuthorities:
      issueClassification?.targetAuthorities ||
      [],

    engineRouting,

    orchestrationIntent,
    intentFlags: orchestrationIntent,

    sourcePolicy: buildSourcePolicy(flags),
    contextPolicy: buildContextPolicy(tpmProfile),

    requiresSimpleDefinition:
      orchestrationIntent.requiresSimpleDefinition,

    requiresLegalBasis:
      orchestrationIntent.requiresLegalBasis,

    requiresJurisprudence:
      orchestrationIntent.requiresJurisprudence,

    requiresSourceInventory:
      orchestrationIntent.requiresSourceInventory,

    requiresComputation:
      orchestrationIntent.requiresComputation,

    requiresAuditRiskAnalysis:
      orchestrationIntent.requiresAuditRiskAnalysis,

    requiresAuditRisk:
      orchestrationIntent.requiresAuditRisk,

    requiresFactPatternAnalysis:
      orchestrationIntent.requiresFactPatternAnalysis,

    requiresContractInterpretation:
      orchestrationIntent.requiresContractInterpretation,

    requiresTransactionCharacterization:
      orchestrationIntent.requiresTransactionCharacterization,

    requiresEconomicSubstanceAnalysis:
      orchestrationIntent.requiresEconomicSubstanceAnalysis,

    requiresEconomicSubstance:
      orchestrationIntent.requiresEconomicSubstance,

    requiresConflictAnalysis:
      orchestrationIntent.requiresConflictAnalysis,

    requiresProceduralAnalysis:
      orchestrationIntent.requiresProceduralAnalysis,

    requiresReviewMode:
      orchestrationIntent.requiresReviewMode,

    requiresQuizMode:
      orchestrationIntent.requiresQuizMode,

    requiresAdaptiveQuiz:
      orchestrationIntent.requiresAdaptiveQuiz,

    requiresLearningMode:
      orchestrationIntent.requiresLearningMode,

    requiresEvidenceEvaluation:
      orchestrationIntent.requiresEvidenceEvaluation,

    requiresPositionStrengthAnalysis:
      orchestrationIntent.requiresPositionStrengthAnalysis,

    requiresRiskScoring:
      orchestrationIntent.requiresRiskScoring,

    requiresPracticalApplication:
      orchestrationIntent.requiresPracticalApplication,

    requiresComparativeAnalysis:
      orchestrationIntent.requiresComparativeAnalysis,

    requiresTimelineAnalysis:
      orchestrationIntent.requiresTimelineAnalysis,

    requiresStepByStepAnalysis:
      orchestrationIntent.requiresStepByStepAnalysis,

    requiresComplianceAnalysis:
      orchestrationIntent.requiresComplianceAnalysis,

    requiresFilingAnalysis:
      orchestrationIntent.requiresFilingAnalysis,

    requiresLitigationAnalysis:
      orchestrationIntent.requiresLitigationAnalysis,

    requiresDoctrineAnalysis:
      orchestrationIntent.requiresDoctrineAnalysis,

    requiresSourceGrounding:
      orchestrationIntent.requiresSourceGrounding,

    allowReviewMaterials:
      orchestrationIntent.allowReviewMaterials,

    orchestrationMetadata: {
      contextOrchestrationCompatible: true,
      plannerCompatible: true,
      rendererCompatible: true,
      adaptivePipelineCompatible: true,
      issueClassificationCompatible: true,
      taxEngineCompatible: true,
      targetAuthorityCompatible: true,
      strictConflictGateCompatible: true,
      tpmProfileCompatible: true,
      sourceGroundingCompatible: true
    },

    tinaInstruction:
      "Detect intent first, then classify issue, retrieve source-grounded authorities, enforce hierarchy, preserve TPM profile, suppress unrelated jurisprudence, and do not declare conflict without same-issue opposite-holding analysis."
  };

  if (!options.skipSearchBuild && issueClassification) {
    try {
      payload.searchTerms =
        buildIssueClassificationSearchQueries(
          issueClassification,
          8
        );
    } catch {
      payload.searchTerms = [
        cleanQuestion,
        issueClassification.primaryIssue,
        issueClassification.subIssue
      ].filter(Boolean);
    }
  }

  return payload;
}

function queryIntentEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_QUERY_INTENT_ENGINE",
    version: ENGINE_VERSION,

    noRetrieval: true,
    noOpenAICalls: true,
    noAnswerGeneration: true,
    doesNotReplaceIssueClassification: true,

    contextOrchestrationCompatible: true,
    orchestrationIntentCompatible: true,
    cleanIntentFlagsReady: true,

    plannerCompatible: true,
    rendererCompatible: true,
    retrievalCompatible: true,
    issueClassificationCompatible: true,
    taxEngineCompatible: true,
    allTaxDomainsSupported: true,
    supportedTaxDomains: SUPPORTED_TAX_DOMAINS,

    issueFirstRetrievalReady: true,
    sourceOrderingPolicyReady: true,
    conflictDisplayPolicyReady: true,
    tpmProfileReady: true,
    sourceGroundingPolicyReady: true,
    reviewQuizLearningModesReady: true
  };
}

export {
  ENGINE_VERSION,

  ISSUE_TYPE,
  RESPONSE_MODE,
  LEGAL_DIMENSION,

  normalizeIssue,

  analyzeQueryIntent,

  queryIntentEngineHealthCheck
};

export default {
  ENGINE_VERSION,

  ISSUE_TYPE,
  RESPONSE_MODE,
  LEGAL_DIMENSION,

  normalizeIssue,

  analyzeQueryIntent,

  queryIntentEngineHealthCheck
};
