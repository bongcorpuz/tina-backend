// FILE: query-intent-engine.js
"use strict";

/**
 * TINA Enterprise Query Intent Engine
 * Version: 6.0.0
 *
 * Purpose:
 * - Detect user intent before retrieval, reasoning, rendering, and answer generation
 * - Detect command mode, response mode, orchestration mode, tone, posture, context dependency, and TPM routing
 * - Propagate Master Prompt hierarchy, anti-hallucination, source-grounding, and authority-sensitivity flags
 * - Return compact orchestration-safe metadata
 *
 * Boundary:
 * - Does not retrieve sources
 * - Does not call OpenAI
 * - Does not generate final answers
 * - Does not render final output
 * - Does not replace issue-classification-engine.js
 * - Does not hard-code VAT-only logic
 */

import {
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc
} from "./issue-classification-engine.js";

const ENGINE_VERSION = "6.0.0";

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

  CODE: "CODE",
  DEBUGGING: "DEBUGGING",
  ARCHITECTURE: "ARCHITECTURE",

  GENERAL_TAX: "GENERAL_TAX",
  GENERAL_CONVERSATION: "GENERAL_CONVERSATION"
});

const RESPONSE_MODE = Object.freeze({
  NATURAL_CONVERSATION: "NATURAL_CONVERSATION",
  QUICK: "QUICK",
  SIMPLE_DEFINITION: "SIMPLE_DEFINITION",
  STANDARD: "STANDARD",
  EXPLANATION: "EXPLANATION",
  DISCUSSION: "DISCUSSION",
  TECHNICAL: "TECHNICAL",
  AUDIT: "AUDIT",
  LITIGATION: "LITIGATION",
  CONTRACT: "CONTRACT",
  TRANSACTION: "TRANSACTION",
  EVIDENCE_HEAVY: "EVIDENCE_HEAVY",
  REVIEWER: "REVIEWER",
  QUIZ: "QUIZ",
  CASE_ANALYSIS: "CASE_ANALYSIS",
  SOURCE: "SOURCE",
  CODE: "CODE",
  DEBUGGING: "DEBUGGING",
  ARCHITECTURE: "ARCHITECTURE",
  COMPUTATION: "COMPUTATION",
  LEARNING: "LEARNING"
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
  SOURCE_RESEARCH: "SOURCE_RESEARCH",
  GENERAL: "GENERAL"
});

const INTENT = Object.freeze({
  NATURAL_CONVERSATION: "NATURAL_CONVERSATION",
  FOLLOW_UP: "FOLLOW_UP",
  SIMPLE_DEFINITION: "SIMPLE_DEFINITION",
  EXPLANATION: "EXPLANATION",
  DISCUSSION: "DISCUSSION",
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
  CASE_MODE: "CASE_MODE",
  SOURCE_MODE: "SOURCE_MODE",
  ADAPTIVE_QUIZ_MODE: "ADAPTIVE_QUIZ_MODE",
  LEARNING_MODE: "LEARNING_MODE",
  COMPARATIVE_ANALYSIS: "COMPARATIVE_ANALYSIS",
  TIMELINE_ANALYSIS: "TIMELINE_ANALYSIS",
  STEP_BY_STEP_ANALYSIS: "STEP_BY_STEP_ANALYSIS",
  DRAFTING_REQUEST: "DRAFTING_REQUEST",
  CODE_PATCH_REQUEST: "CODE_PATCH_REQUEST",
  DEBUGGING_REQUEST: "DEBUGGING_REQUEST",
  ARCHITECTURE_REQUEST: "ARCHITECTURE_REQUEST",
  GENERAL_TAX_QUERY: "GENERAL_TAX_QUERY"
});

const COMMAND_MODE = Object.freeze({
  ASK: "ASK",
  QUIZ: "QUIZ",
  REVIEW: "REVIEW",
  CASE: "CASE",
  SOURCE: "SOURCE",
  NONE: "NONE"
});

const USER_TONE = Object.freeze({
  NEUTRAL: "NEUTRAL",
  URGENT: "URGENT",
  DIRECTIVE: "DIRECTIVE",
  FRUSTRATED: "FRUSTRATED",
  CONFUSED: "CONFUSED",
  CURIOUS: "CURIOUS",
  ADVERSARIAL: "ADVERSARIAL",
  PROFESSIONAL: "PROFESSIONAL",
  CASUAL: "CASUAL"
});

const USER_POSTURE = Object.freeze({
  ASKING: "ASKING",
  DIRECTING: "DIRECTING",
  CHALLENGING: "CHALLENGING",
  VERIFYING: "VERIFYING",
  LEARNING: "LEARNING",
  REVIEWING: "REVIEWING",
  DEBUGGING: "DEBUGGING",
  PATCHING: "PATCHING",
  DRAFTING: "DRAFTING",
  CONTINUING: "CONTINUING"
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
  NATURAL_CONVERSATION: "NATURAL_CONVERSATION",
  FAST_DEFINITION: "FAST_DEFINITION",
  STANDARD_TAX: "STANDARD_TAX",
  SOURCE_LOOKUP: "SOURCE_LOOKUP",
  REVIEWER: "REVIEWER",
  QUIZ: "QUIZ",
  CASE_ANALYSIS: "CASE_ANALYSIS",
  LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
  COMPLEX_ADVISORY: "COMPLEX_ADVISORY",
  CODE_PATCH: "CODE_PATCH",
  DEBUGGING: "DEBUGGING",
  ARCHITECTURE: "ARCHITECTURE",
  EMERGENCY_TRIM: "EMERGENCY_TRIM"
});

const RETRIEVAL_NEED = Object.freeze({
  NONE: "NONE",
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  MANDATORY: "MANDATORY"
});

const RETRIEVAL_STRICTNESS = Object.freeze({
  NONE: "NONE",
  FLEXIBLE: "FLEXIBLE",
  STANDARD: "STANDARD",
  STRICT: "STRICT",
  PROVISION_LEVEL: "PROVISION_LEVEL",
  AUTHORITY_FIRST: "AUTHORITY_FIRST"
});

const AUTHORITY_SENSITIVITY = Object.freeze({
  NONE: "NONE",
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
});

const SOURCE_SENSITIVITY = Object.freeze({
  NONE: "NONE",
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH"
});

const CONTEXT_DEPENDENCY_LEVEL = Object.freeze({
  NONE: "NONE",
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH"
});

const CONVERSATION_ACTION = Object.freeze({
  ANSWER_DIRECTLY: "ANSWER_DIRECTLY",
  CONTINUE_PRIOR_CONTEXT: "CONTINUE_PRIOR_CONTEXT",
  ASK_FOR_CLARIFICATION_IF_CONTEXT_MISSING: "ASK_FOR_CLARIFICATION_IF_CONTEXT_MISSING",
  USE_MEMORY_AND_HISTORY: "USE_MEMORY_AND_HISTORY",
  ACKNOWLEDGE_ONLY: "ACKNOWLEDGE_ONLY"
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

const COMMAND_PATTERNS = Object.freeze({
  ask: /^\/ask(?:\s+|$)/i,
  quiz: /^\/quiz(?:\s+|$)/i,
  review: /^\/review(?:\s+|$)/i,
  case: /^\/case(?:\s+|$)/i,
  source: /^\/source(?:\s+|$)/i
});

const SOURCE_FOLDER_POLICY = Object.freeze({
  indexedFolders: [
    "01_TAX_CODE",
    "02_REVENUE_REGULATIONS",
    "03_RMC",
    "04_RMO",
    "05_BIR_RULINGS",
    "06_COURT_CASES",
    "07_CPA_NOTES",
    "08_REVIEW_MATERIALS"
  ],
  normalModeExcludedFolders: [
    "07_CPA_NOTES",
    "08_REVIEW_MATERIALS"
  ],
  reviewerModeAllowedFolders: [
    "07_CPA_NOTES",
    "08_REVIEW_MATERIALS"
  ]
});

const MASTER_AUTHORITY_HIERARCHY = Object.freeze([
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
]);

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\u00A0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuery(value = "") {
  const rawQuery = String(value || "");
  const cleaned = normalizeText(rawQuery);
  const normalizedQuery = cleaned
    .replace(/\s+([?.!,;:])/g, "$1")
    .replace(/([?.!,;:])(?=\S)/g, "$1 ")
    .trim();

  return {
    rawQuery,
    normalizedQuery,
    lowerQuery: normalizedQuery.toLowerCase()
  };
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

function hasAny(text = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
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

function stripCommandFromQuery(query = "", detectedCommands = []) {
  let text = normalizeText(query);

  for (const command of detectedCommands) {
    text = text.replace(new RegExp(`^\\/${command}\\s*`, "i"), "").trim();
  }

  return text;
}

function detectCommands(query = "", options = {}) {
  const q = normalizeText(query);
  const detectedCommands = [];

  for (const [command, pattern] of Object.entries(COMMAND_PATTERNS)) {
    if (pattern.test(q)) detectedCommands.push(command);
  }

  if (options.command) {
    detectedCommands.unshift(String(options.command).replace(/^\//, "").toLowerCase());
  }

  const uniqueCommands = unique(detectedCommands);
  const primaryCommand = uniqueCommands[0] || null;

  const commandModeMap = {
    ask: COMMAND_MODE.ASK,
    quiz: COMMAND_MODE.QUIZ,
    review: COMMAND_MODE.REVIEW,
    case: COMMAND_MODE.CASE,
    source: COMMAND_MODE.SOURCE
  };

  return {
    detectedCommands: uniqueCommands,
    primaryCommand,
    commandMode: commandModeMap[primaryCommand] || COMMAND_MODE.NONE,
    queryWithoutCommand: stripCommandFromQuery(q, uniqueCommands)
  };
}

function detectDomainSignals(text = "") {
  const q = lower(text);
  const domains = [];

  const push = (condition, domain) => {
    if (condition) domains.push(domain);
  };

  push(/\bvat\b|\bvalue[- ]added tax\b|\binput tax\b|\boutput tax\b|\bzero[- ]rated\b|\bsection 112\b|\bsec\.?\s*112\b/i.test(q), "VAT");
  push(/\bcit\b|\brcit\b|\bmcit\b|\bnolco\b|\bcorporate income tax\b|\bregular corporate\b|\bdeduction\b/i.test(q), "CIT");
  push(/\biit\b|\bindividual income tax\b|\bcompensation income\b|\bself[- ]employed\b|\bmixed income\b|\bfringe benefit\b/i.test(q), "IIT");
  push(/\bwht\b|\bwithholding\b|\bewt\b|\bcwt\b|\bfwt\b|\bexpanded withholding\b|\bfinal withholding\b|\b2307\b/i.test(q), "WHT");
  push(/\bestate tax\b|\bdonor'?s tax\b|\bdonor tax\b|\bgift tax\b/i.test(q), "EST");
  push(/\bpercentage tax\b|\b2551q\b|\bnon[- ]vat\b/i.test(q), "PCT");
  push(/\bexcise tax\b|\bexcise\b|\bsin tax\b/i.test(q), "EXC");
  push(/\bprescription\b|\bprescriptive\b|\bloa\b|\bpan\b|\bfan\b|\bfdda\b|\bwaiver\b|\bdue process\b|\bassessment\b/i.test(q), "PRE");
  push(/\bprotest\b|\bcta appeal\b|\bappeal to cta\b|\bcompromise\b|\brefund claim\b|\bpetition for review\b/i.test(q), "DIS");
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

  push(/\b(vat refund|unutilized input vat|excess input vat|120\+30|section 112|sec\.?\s*112)\b/i.test(q), ISSUE_TYPE.VAT_REFUND);
  push(/\b(vat liability|output vat|subject to vat|vatable|what is vat|define vat)\b/i.test(q), ISSUE_TYPE.VAT_LIABILITY);
  push(/\b(vat exempt|section\s*109|sec\.?\s*109|zero-rated|zero rated)\b/i.test(q), ISSUE_TYPE.VAT_EXEMPTION);
  push(/\b(withholding|ewt|cwt|fwt|expanded withholding|final withholding)\b/i.test(q), ISSUE_TYPE.WITHHOLDING);
  push(/\b(income tax|rcit|mcit|nolco|deductible|deduction)\b/i.test(q), ISSUE_TYPE.INCOME_TAX);
  push(/\b(assessment|deficiency tax|loa|pan|fan|fld|fdda|protest)\b/i.test(q), ISSUE_TYPE.ASSESSMENT);
  push(/\b(invoice|receipt|substantiation|proof|evidence|documentary support|burden of proof)\b/i.test(q), ISSUE_TYPE.EVIDENTIARY);
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(q), ISSUE_TYPE.CONTRACT);
  push(/\b(principal|agent|pass-through|reimbursement|gross or net|bundled|package|transaction characterization)\b/i.test(q), ISSUE_TYPE.TRANSACTION);
  push(/\b(economic substance|substance over form|business purpose|sham|simulation)\b/i.test(q), ISSUE_TYPE.ECONOMIC_SUBSTANCE);
  push(/\b(audit|afs|pfrs|pas|psa|working paper|misstatement|audit risk|audit finding)\b/i.test(q), ISSUE_TYPE.AUDIT);
  push(/\b(accounting|journal entry|caje|reclassification|recognition|measurement|presentation|disclosure)\b/i.test(q), ISSUE_TYPE.ACCOUNTING);
  push(/\b(case|jurisprudence|g\.?\s*r\.?\s*no\.?|supreme court|cta)\b/i.test(q), ISSUE_TYPE.CASE_LAW);
  push(/\b(rr|rmc|rmo|ramo|revenue regulation|revenue memorandum|bir ruling)\b/i.test(q), ISSUE_TYPE.ISSUANCE);
  push(/\b(conflict|prevails|override|hierarchy|contradict|versus|vs\.?)\b/i.test(q), ISSUE_TYPE.CONFLICT_ANALYSIS);
  push(/\b(reviewer|review mode|cpale|quiz|question bank)\b/i.test(q), ISSUE_TYPE.REVIEW);
  push(/\b(quiz|practice questions|multiple choice|mcq|test me)\b/i.test(q), ISSUE_TYPE.QUIZ);
  push(/\b(learn|teach me|explain step by step|adaptive learning)\b/i.test(q), ISSUE_TYPE.LEARNING);
  push(/\b(js|javascript|node|node\.js|code|script|function|export|import|syntaxerror|patch)\b/i.test(q), ISSUE_TYPE.CODE);
  push(/\b(error|bug|syntaxerror|unexpected|debug|fix this error|stack trace)\b/i.test(q), ISSUE_TYPE.DEBUGGING);
  push(/\b(architecture|orchestration|engine|module|pipeline|routing|rag)\b/i.test(q), ISSUE_TYPE.ARCHITECTURE);

  return unique(issues.length ? issues : [ISSUE_TYPE.GENERAL_TAX]);
}

function detectLegalDimensions(question = "") {
  const q = lower(question);
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  push(/\b(taxable|liable|subject to|deductible|vatable|exempt|imposition)\b/i.test(q), LEGAL_DIMENSION.SUBSTANTIVE);
  push(/\b(file|filing|deadline|prescriptive|appeal|protest|assessment|loa|pan|fan|fdda|return|registration)\b/i.test(q), LEGAL_DIMENSION.PROCEDURAL);
  push(/\b(invoice|receipt|substantiation|evidence|proof|documentary|burden of proof)\b/i.test(q), LEGAL_DIMENSION.EVIDENTIARY);
  push(/\b(facts|actual|circumstances|scenario|transaction structure|given that|based on this)\b/i.test(q), LEGAL_DIMENSION.FACTUAL);
  push(/\b(contract|agreement|lease|clause|concession)\b/i.test(q), LEGAL_DIMENSION.CONTRACTUAL);
  push(/\b(economic substance|substance over form|business purpose|sham|simulation)\b/i.test(q), LEGAL_DIMENSION.ECONOMIC_SUBSTANCE);
  push(/\b(principal|agent|pass-through|reimbursement|gross or net|bundled)\b/i.test(q), LEGAL_DIMENSION.TRANSACTION);
  push(/\b(audit|afs|working paper|pfrs|pas|psa|misstatement|audit risk)\b/i.test(q), LEGAL_DIMENSION.AUDIT);
  push(/\b(due process|equal protection|uniformity|constitutional|retroactive)\b/i.test(q), LEGAL_DIMENSION.CONSTITUTIONAL);
  push(/\b(compute|calculate|computation|how much|tax due|tax payable|tax liability)\b/i.test(q), LEGAL_DIMENSION.COMPUTATIONAL);
  push(/\b(litigation|case|cta|supreme court|appeal|protest|petition)\b/i.test(q), LEGAL_DIMENSION.LITIGATION);
  push(/\b(source|sources|citation|citations|legal basis|authority|authorities|section|rr|rmc|rmo|case)\b/i.test(q), LEGAL_DIMENSION.SOURCE_RESEARCH);

  return unique(dimensions.length ? dimensions : [LEGAL_DIMENSION.GENERAL]);
}

function detectTaxLegalAuditAccountingReviewerCodeFlags(question = "", issueTypes = [], legalDimensions = []) {
  const q = lower(question);

  const isTaxQuestion =
    detectDomainSignals(q).length > 0 ||
    /\b(tax|bir|nirc|revenue regulation|revenue memorandum|vat|withholding|income tax|assessment|refund|deduction|taxable)\b/i.test(q);

  const isLegalQuestion =
    isTaxQuestion ||
    legalDimensions.some((d) => [
      LEGAL_DIMENSION.SUBSTANTIVE,
      LEGAL_DIMENSION.PROCEDURAL,
      LEGAL_DIMENSION.LITIGATION,
      LEGAL_DIMENSION.CONSTITUTIONAL,
      LEGAL_DIMENSION.SOURCE_RESEARCH
    ].includes(d)) ||
    /\b(law|legal|jurisprudence|case|doctrine|court|statute|section|authority)\b/i.test(q);

  const isAuditQuestion =
    issueTypes.includes(ISSUE_TYPE.AUDIT) ||
    legalDimensions.includes(LEGAL_DIMENSION.AUDIT);

  const isAccountingQuestion =
    issueTypes.includes(ISSUE_TYPE.ACCOUNTING) ||
    /\b(accounting|pfrs|pas|psa|journal entry|financial statements|afs|disclosure|recognition|measurement|presentation)\b/i.test(q);

  const isReviewerQuestion =
    issueTypes.includes(ISSUE_TYPE.REVIEW) ||
    issueTypes.includes(ISSUE_TYPE.QUIZ) ||
    /\b(review|reviewer|cpale|board exam|quiz|mcq|test me|flashcard)\b/i.test(q);

  const isDraftingRequest =
    /\b(draft|rewrite|write|prepare|create a letter|create an email|compose|wording|template)\b/i.test(q) &&
    !/\b(script|js|javascript|code)\b/i.test(q);

  const isCodeRequest =
    issueTypes.includes(ISSUE_TYPE.CODE) ||
    /\b(js|javascript|node|node\.js|code|script|function|export|import|module)\b/i.test(q);

  const isDebuggingRequest =
    issueTypes.includes(ISSUE_TYPE.DEBUGGING) ||
    /\b(error|bug|syntaxerror|unexpected|debug|fix this error|stack trace|not working)\b/i.test(q);

  const isArchitectureRequest =
    issueTypes.includes(ISSUE_TYPE.ARCHITECTURE) ||
    /\b(architecture|orchestration|engine|module|pipeline|routing|rag|integration|compatibility)\b/i.test(q);

  const isFactPatternRequest =
    legalDimensions.includes(LEGAL_DIMENSION.FACTUAL) ||
    /\b(fact pattern|scenario|given these facts|based on facts|actual transaction|evaluate this transaction)\b/i.test(q);

  return {
    isTaxQuestion,
    isLegalQuestion,
    isAuditQuestion,
    isAccountingQuestion,
    isReviewerQuestion,
    isDraftingRequest,
    isCodeRequest,
    isDebuggingRequest,
    isArchitectureRequest,
    isFactPatternRequest
  };
}

function detectNaturalConversation(question = "", options = {}) {
  const q = lower(question);
  const raw = normalizeText(question);

  const shortAck =
    /^(ok|okay|noted|thanks|thank you|done|yes|no|correct|exactly|agree|go|proceed|continue|next|last part|next part)$/i.test(raw);

  const conversational =
    shortAck ||
    /\b(yes please|go ahead|continue|next part|last part|what do you think|is this correct|am i doing it correctly|how about|what about|why|can you explain)\b/i.test(q);

  const followUp =
    shortAck ||
    /\b(this|that|these|those|it|same|above|earlier|previous|prior|continue|next part|last part|given all|based on|how about)\b/i.test(q);

  const contextDependent =
    followUp ||
    /\b(attached|uploaded|provided|screenshot|image|file|script|this file|this error|the above|the same)\b/i.test(q);

  const needsPriorContext =
    contextDependent ||
    Boolean(options.forceContext || options.needsPriorContext);

  const shouldUsePreviousContext =
    followUp ||
    contextDependent ||
    Boolean(options.usePreviousContext);

  const shouldUseConversationHistory =
    shouldUsePreviousContext ||
    Boolean(options.useConversationHistory);

  const shouldUsePersistentMemory =
    /\b(remember|from now on|always|as usual|based on tina master prompt|master prompt|sub-master prompt|my tina)\b/i.test(q) ||
    Boolean(options.usePersistentMemory);

  let contextDependencyLevel = CONTEXT_DEPENDENCY_LEVEL.NONE;
  if (contextDependent && /^(next|continue|last part|next part|yes|go|proceed)$/i.test(raw)) {
    contextDependencyLevel = CONTEXT_DEPENDENCY_LEVEL.HIGH;
  } else if (contextDependent || shouldUsePreviousContext) {
    contextDependencyLevel = CONTEXT_DEPENDENCY_LEVEL.MODERATE;
  } else if (followUp || conversational) {
    contextDependencyLevel = CONTEXT_DEPENDENCY_LEVEL.LOW;
  }

  let conversationAction = CONVERSATION_ACTION.ANSWER_DIRECTLY;
  if (shortAck && /^(ok|okay|noted|thanks|thank you|done)$/i.test(raw)) {
    conversationAction = CONVERSATION_ACTION.ACKNOWLEDGE_ONLY;
  } else if (contextDependencyLevel === CONTEXT_DEPENDENCY_LEVEL.HIGH) {
    conversationAction = CONVERSATION_ACTION.CONTINUE_PRIOR_CONTEXT;
  } else if (needsPriorContext) {
    conversationAction = CONVERSATION_ACTION.USE_MEMORY_AND_HISTORY;
  }

  return {
    isNaturalConversation: conversational && !/\b(vat|tax|bir|nirc|rr|rmc|rmo|case|audit|pfrs|javascript|js|patch)\b/i.test(q),
    isFollowUp: followUp,
    isContextDependent: contextDependent,
    needsPriorContext,
    shouldUsePreviousContext,
    shouldUseConversationHistory,
    shouldUsePersistentMemory,
    contextDependencyLevel,
    conversationAction
  };
}

function detectToneAndPosture(question = "", commandInfo = {}) {
  const q = lower(question);
  const raw = normalizeText(question);

  let userTone = USER_TONE.NEUTRAL;
  if (/\b(urgent|asap|immediately|now|deadline|critical|must)\b/i.test(q) || /!{2,}/.test(raw)) {
    userTone = USER_TONE.URGENT;
  } else if (/\b(fix|patch|provide|create|rewrite|analyze|evaluate|check|make it|must)\b/i.test(q)) {
    userTone = USER_TONE.DIRECTIVE;
  } else if (/\b(error|not working|wrong|why is this|confused|i don't understand|??)\b/i.test(q)) {
    userTone = USER_TONE.CONFUSED;
  } else if (/\b(are you sure|cannot be|contest|challenge|prove|rebut|attack)\b/i.test(q)) {
    userTone = USER_TONE.ADVERSARIAL;
  } else if (/\b(thanks|please|kindly|may i|could you)\b/i.test(q)) {
    userTone = USER_TONE.PROFESSIONAL;
  } else if (/\b(what is|why|how|explain|enlighten)\b/i.test(q)) {
    userTone = USER_TONE.CURIOUS;
  }

  let userPosture = USER_POSTURE.ASKING;
  if (/\b(check|verify|evaluate|is this correct|review this)\b/i.test(q)) {
    userPosture = USER_POSTURE.VERIFYING;
  }
  if (/\b(fix|patch|complete updated script|copy and paste|provide the script)\b/i.test(q)) {
    userPosture = USER_POSTURE.PATCHING;
  }
  if (/\b(error|debug|syntaxerror|not working)\b/i.test(q)) {
    userPosture = USER_POSTURE.DEBUGGING;
  }
  if (/\b(review|reviewer|quiz|test me|study)\b/i.test(q) || commandInfo.commandMode === COMMAND_MODE.REVIEW || commandInfo.commandMode === COMMAND_MODE.QUIZ) {
    userPosture = USER_POSTURE.LEARNING;
  }
  if (/\b(rewrite|draft|letter|email|post|message)\b/i.test(q)) {
    userPosture = USER_POSTURE.DRAFTING;
  }
  if (/\b(next part|last part|continue|proceed)\b/i.test(q)) {
    userPosture = USER_POSTURE.CONTINUING;
  }
  if (/\b(must|make it|do not|preserve|deliver)\b/i.test(q)) {
    userPosture = USER_POSTURE.DIRECTING;
  }
  if (/\b(are you sure|challenge|contest|rebut|counter)\b/i.test(q)) {
    userPosture = USER_POSTURE.CHALLENGING;
  }

  return {
    userTone,
    userPosture
  };
}

function detectModeSignals(question = "", commandInfo = {}, options = {}) {
  const q = lower(question);

  const requiresQuizMode =
    commandInfo.commandMode === COMMAND_MODE.QUIZ ||
    Boolean(options.quizMode || options.requiresQuizMode) ||
    /\b(quiz|practice questions|multiple choice|mcq|true or false|flashcards|question bank|test me)\b/i.test(q);

  const requiresReviewMode =
    commandInfo.commandMode === COMMAND_MODE.REVIEW ||
    requiresQuizMode ||
    Boolean(options.reviewMode || options.requiresReviewMode) ||
    /\b(review mode|reviewer|cpale|board exam|bar review|tax reviewer|review questions|study guide)\b/i.test(q);

  const requiresSourceVisibility =
    commandInfo.commandMode === COMMAND_MODE.SOURCE ||
    /\b(source|sources|citation|citations|legal basis|authority|authorities|show sources|source only|basis only|where in|what section|what rr|what rmc|what case)\b/i.test(q);

  const requiresCaseMode =
    commandInfo.commandMode === COMMAND_MODE.CASE ||
    /\b(case|jurisprudence|supreme court|cta|g\.?\s*r\.?\s*no\.?|doctrine|holding)\b/i.test(q);

  const requiresSimpleDefinition =
    /\b(what is|define|meaning of|ano ang|nature of)\b/i.test(q) &&
    !/\b(explain|discuss|analyze|review|quiz|sources|case|risk|audit|doctrine|conflict|compute)\b/i.test(q) &&
    normalizeText(question).length <= 180;

  const asksExplanation =
    /\b(explain|explain to me|why|how does|walk me through)\b/i.test(q) &&
    !requiresReviewMode &&
    !requiresQuizMode;

  const asksDiscussion =
    /\b(discuss|analyze|evaluate|comprehensive|deep dive|full analysis)\b/i.test(q);

  let requestedMode = "ASK";
  if (requiresQuizMode) requestedMode = "QUIZ";
  else if (requiresReviewMode) requestedMode = "REVIEW";
  else if (requiresCaseMode) requestedMode = "CASE";
  else if (requiresSourceVisibility) requestedMode = "SOURCE";
  else if (requiresSimpleDefinition) requestedMode = "SIMPLE_DEFINITION";
  else if (asksExplanation) requestedMode = "EXPLANATION";
  else if (asksDiscussion) requestedMode = "DISCUSSION";

  const suggestedMode = requestedMode;

  return {
    requestedMode,
    suggestedMode,
    requiresQuizMode,
    requiresReviewMode,
    requiresSimpleDefinition,
    requiresSourceVisibility,
    requiresCaseMode,
    asksExplanation,
    asksDiscussion
  };
}

function detectSourceLookup(question = "") {
  const q = lower(question);

  return /\b(source|sources|citation|citations|legal basis|authority|authorities|show me|where in|what section|what rr|what rmc|what rmo|what case|basis only|source only)\b/i.test(q);
}

function detectExplicitReviewMaterialsRequest(question = "") {
  const q = lower(question);

  return /\b(cpa notes|review materials|reviewer materials|lecture notes|handout|cpale reviewer)\b/i.test(q);
}

function detectIntentTypes(question = "", modeSignals = {}, domainFlags = {}, commandInfo = {}, issueTypes = [], dimensions = []) {
  const q = lower(question);
  const intentTypes = [];

  const push = (condition, intent) => {
    if (condition) intentTypes.push(intent);
  };

  push(commandInfo.commandMode === COMMAND_MODE.QUIZ || modeSignals.requiresQuizMode, INTENT.QUIZ_MODE);
  push(commandInfo.commandMode === COMMAND_MODE.REVIEW || modeSignals.requiresReviewMode, INTENT.REVIEW_MODE);
  push(commandInfo.commandMode === COMMAND_MODE.CASE || modeSignals.requiresCaseMode, INTENT.CASE_MODE);
  push(commandInfo.commandMode === COMMAND_MODE.SOURCE || modeSignals.requiresSourceVisibility, INTENT.SOURCE_MODE);
  push(modeSignals.requiresSimpleDefinition, INTENT.SIMPLE_DEFINITION);
  push(modeSignals.asksExplanation, INTENT.EXPLANATION);
  push(modeSignals.asksDiscussion, INTENT.DISCUSSION);

  push(/\b(compute|calculate|computation|tax due|tax payable|how much|prepare.*schedule|create.*computation)\b/i.test(q), INTENT.TAX_COMPUTATION);
  push(/\b(conflict|contradict|prevails|override|hierarchy|which.*prevails|conflicting)\b/i.test(q), INTENT.CONFLICT_ANALYSIS);
  push(/\b(doctrine|doctrinal|jurisprudence|case law|supreme court|cta|g\.?\s*r\.?\s*no)\b/i.test(q), INTENT.DOCTRINAL_ANALYSIS);
  push(/\b(cta appeal|appeal to cta|tax litigation|litigation|case strategy|legal defense|petition for review)\b/i.test(q), INTENT.TAX_LITIGATION);
  push(/\b(prescription|prescriptive period|waiver|loa|pan|fan|fdda|assessment due process|validity of assessment)\b/i.test(q), INTENT.PROCEDURAL_ANALYSIS);
  push(/\b(refund|tax credit|claim for refund|tcc|unutilized input|excess input)\b/i.test(q), INTENT.REFUND_ANALYSIS);
  push(/\b(fact pattern|analyze facts|given these facts|scenario|actual transaction|evaluate this transaction|legal consequence)\b/i.test(q), INTENT.FACT_PATTERN_ANALYSIS);
  push(/\b(audit risk|misstatement|working paper|audit finding|afs impact|audit evidence|audit procedure)\b/i.test(q), INTENT.AUDIT_RISK_ANALYSIS);
  push(/\b(contract|agreement|clause|lease|concession|rights and obligations)\b/i.test(q), INTENT.CONTRACT_INTERPRETATION);
  push(/\b(principal|agent|pass[- ]through|reimbursement|gross or net|bundled|package|classification|characterization)\b/i.test(q), INTENT.TRANSACTION_CHARACTERIZATION);
  push(/\b(economic substance|substance over form|business purpose|sham|simulation)\b/i.test(q), INTENT.ECONOMIC_SUBSTANCE_ANALYSIS);
  push(/\b(filing|file|deadline|due date|return|registration|submit|compliance|form)\b/i.test(q), INTENT.COMPLIANCE_ANALYSIS);
  push(/\b(compare|comparison|versus|vs\.?|difference between|distinguish)\b/i.test(q), INTENT.COMPARATIVE_ANALYSIS);
  push(/\b(timeline|chronology|sequence|step by step date|period)\b/i.test(q), INTENT.TIMELINE_ANALYSIS);
  push(/\b(step by step|procedure|process|how to)\b/i.test(q), INTENT.STEP_BY_STEP_ANALYSIS);
  push(/\b(plan|planning|structure|tax efficient|better structure|recommend)\b/i.test(q), INTENT.TAX_PLANNING);
  push(detectSourceLookup(question), INTENT.TAX_RESEARCH);
  push(domainFlags.isDraftingRequest, INTENT.DRAFTING_REQUEST);
  push(domainFlags.isCodeRequest && !domainFlags.isDebuggingRequest, INTENT.CODE_PATCH_REQUEST);
  push(domainFlags.isDebuggingRequest, INTENT.DEBUGGING_REQUEST);
  push(domainFlags.isArchitectureRequest, INTENT.ARCHITECTURE_REQUEST);

  if (
    dimensions.includes(LEGAL_DIMENSION.FACTUAL) ||
    issueTypes.includes(ISSUE_TYPE.TRANSACTION) ||
    issueTypes.includes(ISSUE_TYPE.ECONOMIC_SUBSTANCE)
  ) {
    push(true, INTENT.FACT_PATTERN_ANALYSIS);
  }

  const finalIntentTypes = unique(intentTypes.length ? intentTypes : [INTENT.GENERAL_TAX_QUERY]);

  let intentType = finalIntentTypes[0];

  const priority = [
    INTENT.DEBUGGING_REQUEST,
    INTENT.CODE_PATCH_REQUEST,
    INTENT.ARCHITECTURE_REQUEST,
    INTENT.QUIZ_MODE,
    INTENT.REVIEW_MODE,
    INTENT.CASE_MODE,
    INTENT.SOURCE_MODE,
    INTENT.SIMPLE_DEFINITION,
    INTENT.EXPLANATION,
    INTENT.DISCUSSION,
    INTENT.CONFLICT_ANALYSIS,
    INTENT.DOCTRINAL_ANALYSIS,
    INTENT.TAX_LITIGATION,
    INTENT.PROCEDURAL_ANALYSIS,
    INTENT.FACT_PATTERN_ANALYSIS,
    INTENT.AUDIT_RISK_ANALYSIS,
    INTENT.TAX_COMPUTATION,
    INTENT.GENERAL_TAX_QUERY
  ];

  for (const candidate of priority) {
    if (finalIntentTypes.includes(candidate)) {
      intentType = candidate;
      break;
    }
  }

  const userGoal = deriveUserGoal(intentType, question, modeSignals, domainFlags);

  return {
    intentType,
    intentTypes: finalIntentTypes,
    userGoal
  };
}

function deriveUserGoal(intentType, question = "", modeSignals = {}, domainFlags = {}) {
  if (intentType === INTENT.SIMPLE_DEFINITION) return "Get a concise definition with controlling authority preserved.";
  if (intentType === INTENT.EXPLANATION) return "Understand the concept with clear explanation and legal grounding.";
  if (intentType === INTENT.DISCUSSION) return "Receive a fuller discussion with legal basis, practical application, and caveats.";
  if (intentType === INTENT.REVIEW_MODE) return "Study the topic in reviewer mode with educational treatment.";
  if (intentType === INTENT.QUIZ_MODE) return "Generate or conduct quiz-style assessment.";
  if (intentType === INTENT.SOURCE_MODE || modeSignals.requiresSourceVisibility) return "Show authority/source basis without unnecessary narrative.";
  if (intentType === INTENT.CASE_MODE) return "Analyze jurisprudence or case doctrine.";
  if (domainFlags.isCodeRequest) return "Patch or evaluate code without changing architecture.";
  if (domainFlags.isDebuggingRequest) return "Identify and fix code or runtime error.";
  if (domainFlags.isArchitectureRequest) return "Evaluate modular architecture compatibility and routing.";
  return "Classify user request and route to proper TINA pipeline.";
}

function detectReasoningNeeds(question = "", intentData = {}, modeSignals = {}, domainFlags = {}, issueTypes = [], dimensions = []) {
  const q = lower(question);

  const needsAuthorityGrounding =
    domainFlags.isTaxQuestion ||
    domainFlags.isLegalQuestion ||
    modeSignals.requiresSourceVisibility ||
    modeSignals.requiresCaseMode ||
    /\b(legal basis|authority|section|rr|rmc|rmo|case|law|jurisprudence|doctrine|taxable|exempt|deductible)\b/i.test(q);

  const needsProvisionLevelGrounding =
    needsAuthorityGrounding &&
    /\b(section|sec\.?|nirc|tax code|rr|rmc|rmo|ramo|bir ruling|provision|legal basis|what section)\b/i.test(q);

  const needsJurisprudence =
    modeSignals.requiresCaseMode ||
    /\b(case|jurisprudence|supreme court|cta|g\.?\s*r\.?\s*no\.?|doctrine|holding)\b/i.test(q);

  const needsConflictAnalysis =
    /\b(conflict|conflicting|contradict|prevails|override|hierarchy|which.*prevails|versus|vs\.?)\b/i.test(q);

  const needsRiskAnalysis =
    domainFlags.isAuditQuestion ||
    /\b(risk|exposure|audit risk|tax risk|deficiency|penalty|assessment|disallowance|weakness|position strength)\b/i.test(q);

  const needsFactPatternAnalysis =
    domainFlags.isFactPatternRequest ||
    /\b(facts|fact pattern|scenario|actual transaction|given that|based on these facts|evaluate this transaction)\b/i.test(q);

  const needsEvidenceEvaluation =
    dimensions.includes(LEGAL_DIMENSION.EVIDENTIARY) ||
    /\b(evidence|proof|substantiation|invoice|receipt|documentary support|burden of proof|supporting documents)\b/i.test(q);

  const needsAssumptionDisclosure =
    needsFactPatternAnalysis ||
    needsRiskAnalysis ||
    needsEvidenceEvaluation ||
    /\b(assumption|assuming|if|provided that|subject to|based on)\b/i.test(q);

  const needsReviewerTreatment =
    modeSignals.requiresReviewMode ||
    modeSignals.requiresQuizMode ||
    domainFlags.isReviewerQuestion;

  const needsCodePatch =
    domainFlags.isCodeRequest ||
    domainFlags.isDebuggingRequest ||
    /\b(patch|fix|updated script|complete script|copy and paste)\b/i.test(q);

  return {
    needsAuthorityGrounding,
    needsProvisionLevelGrounding,
    needsJurisprudence,
    needsConflictAnalysis,
    needsRiskAnalysis,
    needsFactPatternAnalysis,
    needsEvidenceEvaluation,
    needsAssumptionDisclosure,
    needsReviewerTreatment,
    needsCodePatch
  };
}

function detectRetrievalNeeds(question = "", modeSignals = {}, domainFlags = {}, reasoningNeeds = {}, issueTypes = []) {
  if (
    domainFlags.isCodeRequest ||
    domainFlags.isDebuggingRequest ||
    domainFlags.isArchitectureRequest
  ) {
    return {
      retrievalNeed: RETRIEVAL_NEED.NONE,
      retrievalStrictness: RETRIEVAL_STRICTNESS.NONE,
      sourceSensitivity: SOURCE_SENSITIVITY.LOW,
      preferredSourceTypes: [],
      sourceVisibilityRequired: false
    };
  }

  let retrievalNeed = RETRIEVAL_NEED.NONE;
  let retrievalStrictness = RETRIEVAL_STRICTNESS.NONE;
  let sourceSensitivity = SOURCE_SENSITIVITY.NONE;

  if (reasoningNeeds.needsAuthorityGrounding || domainFlags.isTaxQuestion || domainFlags.isLegalQuestion) {
    retrievalNeed = RETRIEVAL_NEED.HIGH;
    retrievalStrictness = RETRIEVAL_STRICTNESS.AUTHORITY_FIRST;
    sourceSensitivity = SOURCE_SENSITIVITY.HIGH;
  }

  if (modeSignals.requiresSimpleDefinition) {
    retrievalNeed = RETRIEVAL_NEED.MODERATE;
    retrievalStrictness = RETRIEVAL_STRICTNESS.STANDARD;
    sourceSensitivity = SOURCE_SENSITIVITY.MODERATE;
  }

  if (
    modeSignals.requiresSourceVisibility ||
    reasoningNeeds.needsProvisionLevelGrounding ||
    reasoningNeeds.needsJurisprudence ||
    reasoningNeeds.needsConflictAnalysis
  ) {
    retrievalNeed = RETRIEVAL_NEED.MANDATORY;
    retrievalStrictness = reasoningNeeds.needsProvisionLevelGrounding
      ? RETRIEVAL_STRICTNESS.PROVISION_LEVEL
      : RETRIEVAL_STRICTNESS.STRICT;
    sourceSensitivity = SOURCE_SENSITIVITY.HIGH;
  }

  if (modeSignals.requiresReviewMode || modeSignals.requiresQuizMode) {
    retrievalNeed = RETRIEVAL_NEED.HIGH;
    retrievalStrictness = RETRIEVAL_STRICTNESS.AUTHORITY_FIRST;
    sourceSensitivity = SOURCE_SENSITIVITY.MODERATE;
  }

  if (!domainFlags.isTaxQuestion && !domainFlags.isLegalQuestion && !modeSignals.requiresSourceVisibility) {
    retrievalNeed = RETRIEVAL_NEED.NONE;
    retrievalStrictness = RETRIEVAL_STRICTNESS.NONE;
    sourceSensitivity = SOURCE_SENSITIVITY.LOW;
  }

  const preferredSourceTypes = [];
  if (domainFlags.isTaxQuestion || domainFlags.isLegalQuestion) {
    preferredSourceTypes.push(
      "01_TAX_CODE",
      "02_REVENUE_REGULATIONS",
      "03_RMC",
      "04_RMO",
      "05_BIR_RULINGS"
    );
  }

  if (reasoningNeeds.needsJurisprudence || reasoningNeeds.needsConflictAnalysis || modeSignals.requiresCaseMode) {
    preferredSourceTypes.push("06_COURT_CASES");
  }

  if (modeSignals.requiresReviewMode || modeSignals.requiresQuizMode || detectExplicitReviewMaterialsRequest(question)) {
    preferredSourceTypes.push("07_CPA_NOTES", "08_REVIEW_MATERIALS");
  }

  return {
    retrievalNeed,
    retrievalStrictness,
    sourceSensitivity,
    preferredSourceTypes: unique(preferredSourceTypes),
    sourceVisibilityRequired: modeSignals.requiresSourceVisibility
  };
}

function detectAuthorityHints(question = "", domainSignals = [], issueClassification = null) {
  const q = lower(question);
  const hints = [];

  const push = (condition, hint) => {
    if (condition) hints.push(hint);
  };

  push(domainSignals.includes("VAT"), "NIRC_SECS_105_TO_115");
  push(/\bwhat is vat|define vat|meaning of vat|explain vat|discuss vat\b/i.test(q), "VAT_DEFINITION_AUTHORITY_FIRST");
  push(/\binput tax|excess input|unutilized input|refund|section 112|sec\.?\s*112\b/i.test(q), "VAT_REFUND_INPUT_TAX_AUTHORITY_FIRST");
  push(/\bzero[- ]rated|zero rated\b/i.test(q), "VAT_ZERO_RATING_AUTHORITY_FIRST");
  push(/\bvat exempt|section 109|sec\.?\s*109\b/i.test(q), "VAT_EXEMPTION_AUTHORITY_FIRST");

  push(domainSignals.includes("CIT"), "NIRC_CORPORATE_INCOME_TAX");
  push(/\brcit\b/i.test(q), "RCIT_AUTHORITY_HINT");
  push(/\bmcit\b/i.test(q), "MCIT_AUTHORITY_HINT");
  push(/\bnolco\b/i.test(q), "NOLCO_AUTHORITY_HINT");

  push(domainSignals.includes("WHT"), "WITHHOLDING_TAX_AUTHORITY_FIRST");
  push(/\bewt|expanded withholding\b/i.test(q), "EWT_AUTHORITY_HINT");
  push(/\bfwt|final withholding\b/i.test(q), "FWT_AUTHORITY_HINT");
  push(/\bcwt|2307\b/i.test(q), "CWT_AUTHORITY_HINT");

  push(domainSignals.includes("PRE"), "ASSESSMENT_PRESCRIPTION_DUE_PROCESS_AUTHORITY_FIRST");
  push(/\bloa\b/i.test(q), "LOA_AUTHORITY_HINT");
  push(/\bpan\b|\bfan\b|\bfdda\b/i.test(q), "ASSESSMENT_NOTICE_AUTHORITY_HINT");
  push(/\bwaiver\b/i.test(q), "WAIVER_PRESCRIPTION_AUTHORITY_HINT");

  push(domainSignals.includes("DIS"), "TAX_REMEDIES_DISPUTE_AUTHORITY_FIRST");
  push(domainSignals.includes("LGT"), "LOCAL_GOVERNMENT_TAX_AUTHORITY_FIRST");
  push(domainSignals.includes("CUS"), "CUSTOMS_TARIFF_AUTHORITY_FIRST");
  push(domainSignals.includes("SPC"), "SPECIAL_REGIME_TRANSFER_PRICING_AUTHORITY_FIRST");
  push(domainSignals.includes("CON"), "CONSTITUTIONAL_TAX_AUTHORITY_FIRST");

  const targetAuthorityHints = unique([
    ...hints,
    ...safeArray(issueClassification?.targetAuthorities),
    ...safeArray(issueClassification?.controllingAuthorities)
  ]);

  return {
    targetAuthorityHints,
    authoritySensitivity: targetAuthorityHints.length > 0 ? AUTHORITY_SENSITIVITY.HIGH : AUTHORITY_SENSITIVITY.MODERATE
  };
}

function buildSectionRequirements(modeSignals = {}, domainFlags = {}, reasoningNeeds = {}, responseMode = RESPONSE_MODE.STANDARD) {
  if (domainFlags.isCodeRequest || domainFlags.isDebuggingRequest || domainFlags.isArchitectureRequest) {
    return {
      answerFormatHint: domainFlags.isDebuggingRequest ? "DEBUGGING_OR_PATCH_FORMAT" : "CODE_OR_ARCHITECTURE_FORMAT",
      sectionRequirements: [
        "DIAGNOSIS",
        "WHAT_TO_FIX",
        "COMPATIBILITY_NOTES",
        "COMPLETE_UPDATED_CODE"
      ]
    };
  }

  if (modeSignals.requiresQuizMode) {
    return {
      answerFormatHint: "QUIZ_MODE_FORMAT",
      sectionRequirements: [
        "QUESTIONS",
        "CHOICES",
        "ANSWER_KEY",
        "EXPLANATION",
        "AUTHORITY_NOTE"
      ]
    };
  }

  if (modeSignals.requiresReviewMode) {
    return {
      answerFormatHint: "REVIEWER_MODE_FORMAT",
      sectionRequirements: [
        "CORE_RULE",
        "LEGAL_BASIS",
        "REVIEWER_NOTES",
        "COMMON_TRAPS",
        "PRACTICE_POINTS"
      ]
    };
  }

  if (modeSignals.requiresSourceVisibility) {
    return {
      answerFormatHint: "SOURCE_LIST_FORMAT",
      sectionRequirements: [
        "CONTROLLING_AUTHORITIES",
        "SUPPORTING_ISSUANCES",
        "SUPPORTING_JURISPRUDENCE",
        "VALIDATION_NOTES"
      ]
    };
  }

  if (modeSignals.requiresSimpleDefinition) {
    return {
      answerFormatHint: "SIMPLE_DEFINITION_WITH_AUTHORITY",
      sectionRequirements: [
        "DIRECT_DEFINITION",
        "CONTROLLING_LEGAL_BASIS",
        "SHORT_APPLICATION_NOTE"
      ]
    };
  }

  return {
    answerFormatHint: "STANDARD_TINA_LEGAL_FORMAT",
    sectionRequirements: [
      "A_DIRECT_ANSWER",
      "B_CONTROLLING_LEGAL_BASIS",
      "C_SUPPORTING_RULES_ADMINISTRATIVE_ISSUANCES",
      "D_SUPPORTING_JURISPRUDENCE",
      "E_DOCTRINAL_STATUS_CONFLICT_ANALYSIS",
      "F_PRACTICAL_NOTE_APPLICATION"
    ].filter((section) => {
      if (section === "D_SUPPORTING_JURISPRUDENCE") return reasoningNeeds.needsJurisprudence || reasoningNeeds.needsConflictAnalysis;
      if (section === "E_DOCTRINAL_STATUS_CONFLICT_ANALYSIS") return reasoningNeeds.needsConflictAnalysis || reasoningNeeds.needsJurisprudence;
      return true;
    })
  };
}

function buildHierarchyAndAntiHallucinationFlags(reasoningNeeds = {}, retrieval = {}, domainFlags = {}) {
  const preserveAuthorityHierarchy =
    domainFlags.isTaxQuestion ||
    domainFlags.isLegalQuestion ||
    reasoningNeeds.needsAuthorityGrounding;

  const requiresHierarchyValidation = preserveAuthorityHierarchy;
  const requiresSupersessionCheck = preserveAuthorityHierarchy && retrieval.retrievalNeed !== RETRIEVAL_NEED.NONE;
  const requiresConflictValidation =
    reasoningNeeds.needsConflictAnalysis ||
    reasoningNeeds.needsJurisprudence ||
    preserveAuthorityHierarchy;

  let authoritySensitivity = AUTHORITY_SENSITIVITY.NONE;
  if (reasoningNeeds.needsConflictAnalysis || reasoningNeeds.needsProvisionLevelGrounding) {
    authoritySensitivity = AUTHORITY_SENSITIVITY.CRITICAL;
  } else if (preserveAuthorityHierarchy) {
    authoritySensitivity = AUTHORITY_SENSITIVITY.HIGH;
  } else if (domainFlags.isAccountingQuestion || domainFlags.isAuditQuestion) {
    authoritySensitivity = AUTHORITY_SENSITIVITY.MODERATE;
  }

  const antiHallucinationLevel =
    authoritySensitivity === AUTHORITY_SENSITIVITY.CRITICAL
      ? "STRICT_MAX"
      : preserveAuthorityHierarchy
        ? "STRICT"
        : "STANDARD";

  return {
    preserveAuthorityHierarchy,
    requiresHierarchyValidation,
    requiresSupersessionCheck,
    requiresConflictValidation,
    authoritySensitivity,

    antiHallucinationLevel,
    mustNotInventAuthorities: true,
    mustSayIndexedSourceNotFound: preserveAuthorityHierarchy,
    mustPreserveUncertainty: true,

    masterPromptHierarchyFlags: {
      authorityHierarchy: MASTER_AUTHORITY_HIERARCHY,
      retrieveBeforeAnswering: preserveAuthorityHierarchy,
      validateBeforeCiting: preserveAuthorityHierarchy,
      groundBeforeConcluding: preserveAuthorityHierarchy,
      neverFabricateAuthorities: true,
      discloseMissingIndexedAuthority: preserveAuthorityHierarchy,
      normalModeHideReviewerMaterials: true,
      reviewerModeMayUseReviewerMaterials: true,
      compactTpmOrchestrationRequired: true,
      courtDecisionConflictOverrideRequired: true,
      strictConflictGateRequired: true
    }
  };
}

function detectResponseMode(intentData = {}, modeSignals = {}, domainFlags = {}, reasoningNeeds = {}) {
  if (domainFlags.isDebuggingRequest) return RESPONSE_MODE.DEBUGGING;
  if (domainFlags.isCodeRequest) return RESPONSE_MODE.CODE;
  if (domainFlags.isArchitectureRequest) return RESPONSE_MODE.ARCHITECTURE;
  if (modeSignals.requiresQuizMode) return RESPONSE_MODE.QUIZ;
  if (modeSignals.requiresReviewMode) return RESPONSE_MODE.REVIEWER;
  if (modeSignals.requiresCaseMode) return RESPONSE_MODE.CASE_ANALYSIS;
  if (modeSignals.requiresSourceVisibility) return RESPONSE_MODE.SOURCE;
  if (modeSignals.requiresSimpleDefinition) return RESPONSE_MODE.SIMPLE_DEFINITION;
  if (reasoningNeeds.needsRiskAnalysis && domainFlags.isAuditQuestion) return RESPONSE_MODE.AUDIT;
  if (reasoningNeeds.needsFactPatternAnalysis || reasoningNeeds.needsRiskAnalysis) return RESPONSE_MODE.TRANSACTION;
  if (reasoningNeeds.needsJurisprudence || reasoningNeeds.needsConflictAnalysis) return RESPONSE_MODE.TECHNICAL;
  if (intentData.intentType === INTENT.EXPLANATION) return RESPONSE_MODE.EXPLANATION;
  if (intentData.intentType === INTENT.DISCUSSION) return RESPONSE_MODE.DISCUSSION;
  return RESPONSE_MODE.STANDARD;
}

function detectOrchestrationMode(intentData = {}, modeSignals = {}, domainFlags = {}, reasoningNeeds = {}, complexity = COMPLEXITY.MODERATE) {
  if (domainFlags.isDebuggingRequest) return ORCHESTRATION_MODE.DEBUGGING;
  if (domainFlags.isCodeRequest) return ORCHESTRATION_MODE.CODE_PATCH;
  if (domainFlags.isArchitectureRequest) return ORCHESTRATION_MODE.ARCHITECTURE;
  if (modeSignals.requiresQuizMode) return ORCHESTRATION_MODE.QUIZ;
  if (modeSignals.requiresReviewMode) return ORCHESTRATION_MODE.REVIEWER;
  if (modeSignals.requiresCaseMode) return ORCHESTRATION_MODE.CASE_ANALYSIS;
  if (modeSignals.requiresSourceVisibility) return ORCHESTRATION_MODE.SOURCE_LOOKUP;
  if (modeSignals.requiresSimpleDefinition) return ORCHESTRATION_MODE.FAST_DEFINITION;

  if (
    reasoningNeeds.needsFactPatternAnalysis ||
    reasoningNeeds.needsRiskAnalysis ||
    reasoningNeeds.needsEvidenceEvaluation ||
    complexity === COMPLEXITY.HIGH
  ) {
    return ORCHESTRATION_MODE.COMPLEX_ADVISORY;
  }

  if (
    reasoningNeeds.needsJurisprudence ||
    reasoningNeeds.needsConflictAnalysis ||
    reasoningNeeds.needsProvisionLevelGrounding
  ) {
    return ORCHESTRATION_MODE.LEGAL_ANALYSIS;
  }

  return ORCHESTRATION_MODE.STANDARD_TAX;
}

function detectComplexity(question = "", modeSignals = {}, domainFlags = {}, reasoningNeeds = {}, issueTypes = []) {
  const q = lower(question);
  let score = 0;

  if (normalizeText(question).length > 220) score += 1;
  if (issueTypes.length >= 3) score += 1;

  if (modeSignals.requiresSourceVisibility) score += 1;
  if (modeSignals.requiresReviewMode || modeSignals.requiresQuizMode) score += 1;
  if (reasoningNeeds.needsFactPatternAnalysis) score += 2;
  if (reasoningNeeds.needsRiskAnalysis) score += 2;
  if (reasoningNeeds.needsEvidenceEvaluation) score += 2;
  if (reasoningNeeds.needsConflictAnalysis) score += 2;
  if (reasoningNeeds.needsJurisprudence) score += 1;
  if (domainFlags.isCodeRequest || domainFlags.isDebuggingRequest) score += 1;
  if (domainFlags.isArchitectureRequest) score += 2;

  if (/\b(complex|comprehensive|deep|full analysis|analyze and recheck|evaluate|risk|legal consequence)\b/i.test(q)) {
    score += 2;
  }

  if (modeSignals.requiresSimpleDefinition && score <= 1) return COMPLEXITY.LOW;
  if (score >= 4) return COMPLEXITY.HIGH;
  if (score >= 2) return COMPLEXITY.MODERATE;
  return COMPLEXITY.LOW;
}

function assignTpmProfile(complexity = COMPLEXITY.MODERATE, modeSignals = {}, domainFlags = {}, reasoningNeeds = {}) {
  if (
    complexity === COMPLEXITY.HIGH ||
    reasoningNeeds.needsFactPatternAnalysis ||
    reasoningNeeds.needsRiskAnalysis ||
    reasoningNeeds.needsConflictAnalysis ||
    domainFlags.isArchitectureRequest
  ) {
    return TPM_PROFILE.HEAVY;
  }

  if (
    complexity === COMPLEXITY.LOW &&
    modeSignals.requiresSimpleDefinition &&
    !reasoningNeeds.needsJurisprudence
  ) {
    return TPM_PROFILE.LIGHT;
  }

  return TPM_PROFILE.STANDARD;
}

function safeIssueClassification(question = "", queryIntent = null, options = {}) {
  if (options.skipIssueClassification === true) {
    return null;
  }

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

function computeIntentConfidence({
  normalizedQuery = "",
  intentData = {},
  modeSignals = {},
  domainFlags = {},
  reasoningNeeds = {},
  retrieval = {}
} = {}) {
  let confidence = 0.45;

  if (intentData.intentType && intentData.intentType !== INTENT.GENERAL_TAX_QUERY) confidence += 0.18;
  if (intentData.intentTypes?.length > 1) confidence += 0.08;
  if (modeSignals.requestedMode && modeSignals.requestedMode !== "ASK") confidence += 0.08;

  const explicitSignals = [
    domainFlags.isTaxQuestion,
    domainFlags.isLegalQuestion,
    domainFlags.isAuditQuestion,
    domainFlags.isAccountingQuestion,
    domainFlags.isReviewerQuestion,
    domainFlags.isCodeRequest,
    domainFlags.isDebuggingRequest,
    domainFlags.isArchitectureRequest,
    reasoningNeeds.needsAuthorityGrounding,
    reasoningNeeds.needsProvisionLevelGrounding,
    reasoningNeeds.needsJurisprudence,
    reasoningNeeds.needsConflictAnalysis,
    reasoningNeeds.needsRiskAnalysis,
    reasoningNeeds.needsFactPatternAnalysis,
    reasoningNeeds.needsEvidenceEvaluation,
    retrieval.retrievalNeed !== RETRIEVAL_NEED.NONE
  ].filter(Boolean).length;

  confidence += Math.min(0.22, explicitSignals * 0.018);

  if (normalizeText(normalizedQuery).length < 8) confidence -= 0.15;

  return Math.max(0.1, Math.min(0.98, Number(confidence.toFixed(2))));
}

function buildContextPolicy(tpmProfile = TPM_PROFILE.STANDARD, naturalConversation = {}) {
  return {
    useContextOrchestrationEngine: true,
    compressSourcesBeforeOpenAI: true,
    finalTrimBeforeOpenAI: true,
    preventRawFullDocumentInjection: true,
    preventFullDebugObjectInjection: true,
    preventFullEngineOutputInjection: true,
    compactIntentOnly: true,
    tpmProfile,

    shouldUsePreviousContext: Boolean(naturalConversation.shouldUsePreviousContext),
    shouldUseConversationHistory: Boolean(naturalConversation.shouldUseConversationHistory),
    shouldUsePersistentMemory: Boolean(naturalConversation.shouldUsePersistentMemory),
    contextDependencyLevel: naturalConversation.contextDependencyLevel || CONTEXT_DEPENDENCY_LEVEL.NONE
  };
}

function buildSourcePolicy(modeSignals = {}, retrieval = {}) {
  const allowReviewMaterials =
    modeSignals.requiresReviewMode ||
    modeSignals.requiresQuizMode ||
    retrieval.preferredSourceTypes?.includes("07_CPA_NOTES") ||
    retrieval.preferredSourceTypes?.includes("08_REVIEW_MATERIALS");

  return {
    requiresSourceGrounding:
      retrieval.retrievalNeed !== RETRIEVAL_NEED.NONE,

    useGoogleDriveIndexedSourcesFirst:
      true,

    excludeCpaNotesAndReviewMaterials:
      !allowReviewMaterials,

    allowCpaNotesAndReviewMaterials:
      allowReviewMaterials,

    indexedFolders:
      SOURCE_FOLDER_POLICY.indexedFolders,

    excludedFolders:
      allowReviewMaterials
        ? []
        : SOURCE_FOLDER_POLICY.normalModeExcludedFolders,

    allowedReviewFolders:
      allowReviewMaterials
        ? SOURCE_FOLDER_POLICY.reviewerModeAllowedFolders
        : [],

    preferredSourceTypes:
      retrieval.preferredSourceTypes || [],

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

function buildEngineRouting({ modeSignals = {}, domainFlags = {}, reasoningNeeds = {}, retrieval = {} }) {
  return {
    needsProvisionCitationEngine:
      reasoningNeeds.needsAuthorityGrounding ||
      reasoningNeeds.needsProvisionLevelGrounding,

    needsJurisprudenceEngine:
      reasoningNeeds.needsJurisprudence ||
      reasoningNeeds.needsConflictAnalysis ||
      modeSignals.requiresCaseMode,

    needsSupersessionEngine:
      retrieval.retrievalNeed !== RETRIEVAL_NEED.NONE,

    needsTransactionCharacterization:
      reasoningNeeds.needsFactPatternAnalysis,

    needsEconomicSubstance:
      /\b(economic substance|substance over form|business purpose|sham)\b/i.test(""),

    needsContractInterpretation:
      domainFlags.isFactPatternRequest,

    needsEvidenceEvaluation:
      reasoningNeeds.needsEvidenceEvaluation,

    needsRiskScoring:
      reasoningNeeds.needsRiskAnalysis,

    needsPositionStrength:
      reasoningNeeds.needsRiskAnalysis,

    needsAdaptivePlanner:
      true,

    needsAnswerRenderer:
      true,

    needsReviewEngine:
      modeSignals.requiresReviewMode,

    needsQuizEngine:
      modeSignals.requiresQuizMode,

    needsLearningEngine:
      modeSignals.requiresReviewMode || modeSignals.requiresQuizMode,

    needsCodePatch:
      reasoningNeeds.needsCodePatch,

    issueFirstRetrievalRequired:
      retrieval.retrievalNeed !== RETRIEVAL_NEED.NONE,

    targetAuthorityOrderingRequired:
      retrieval.retrievalNeed !== RETRIEVAL_NEED.NONE,

    strictConflictGateRequired:
      true,

    sourceGroundingRequired:
      retrieval.retrievalNeed !== RETRIEVAL_NEED.NONE
  };
}

function buildOrchestrationIntent({
  intentData = {},
  responseMode = RESPONSE_MODE.STANDARD,
  orchestrationMode = ORCHESTRATION_MODE.STANDARD_TAX,
  complexity = COMPLEXITY.MODERATE,
  tpmProfile = TPM_PROFILE.STANDARD,
  modeSignals = {},
  domainFlags = {},
  reasoningNeeds = {},
  retrieval = {},
  hierarchyFlags = {},
  confidence = 0,
  fallbackIntentUsed = false,
  naturalConversation = {}
} = {}) {
  return {
    intent: intentData.intentType || INTENT.GENERAL_TAX_QUERY,
    intentType: intentData.intentType || INTENT.GENERAL_TAX_QUERY,
    intentTypes: intentData.intentTypes || [],
    userGoal: intentData.userGoal || null,

    responseMode,
    adaptiveMode: responseMode,
    orchestrationMode,
    complexity,
    tpmProfile,

    requiresSimpleDefinition: Boolean(modeSignals.requiresSimpleDefinition),
    requiresLegalBasis: Boolean(reasoningNeeds.needsAuthorityGrounding),
    requiresJurisprudence: Boolean(reasoningNeeds.needsJurisprudence),
    requiresSourceInventory: Boolean(modeSignals.requiresSourceVisibility),
    requiresComputation: /\b(compute|calculate|computation|tax due|tax payable)\b/i.test(""),
    requiresAuditRiskAnalysis: Boolean(reasoningNeeds.needsRiskAnalysis && domainFlags.isAuditQuestion),
    requiresAuditRisk: Boolean(reasoningNeeds.needsRiskAnalysis),
    requiresFactPatternAnalysis: Boolean(reasoningNeeds.needsFactPatternAnalysis),
    requiresContractInterpretation: Boolean(domainFlags.isFactPatternRequest),
    requiresTransactionCharacterization: Boolean(reasoningNeeds.needsFactPatternAnalysis),
    requiresEconomicSubstanceAnalysis: /\b(economic substance|substance over form)\b/i.test(""),
    requiresEconomicSubstance: /\b(economic substance|substance over form)\b/i.test(""),
    requiresConflictAnalysis: Boolean(reasoningNeeds.needsConflictAnalysis),
    requiresProceduralAnalysis: Boolean(intentData.intentTypes?.includes(INTENT.PROCEDURAL_ANALYSIS)),
    requiresReviewMode: Boolean(modeSignals.requiresReviewMode),
    requiresQuizMode: Boolean(modeSignals.requiresQuizMode),
    requiresAdaptiveQuiz: Boolean(modeSignals.requiresQuizMode && modeSignals.requiresReviewMode),
    requiresLearningMode: Boolean(modeSignals.requiresReviewMode || modeSignals.requiresQuizMode),
    requiresEvidenceEvaluation: Boolean(reasoningNeeds.needsEvidenceEvaluation),
    requiresPositionStrengthAnalysis: Boolean(reasoningNeeds.needsRiskAnalysis),
    requiresRiskScoring: Boolean(reasoningNeeds.needsRiskAnalysis),
    requiresPracticalApplication: true,
    requiresComparativeAnalysis: Boolean(intentData.intentTypes?.includes(INTENT.COMPARATIVE_ANALYSIS)),
    requiresTimelineAnalysis: Boolean(intentData.intentTypes?.includes(INTENT.TIMELINE_ANALYSIS)),
    requiresStepByStepAnalysis: Boolean(intentData.intentTypes?.includes(INTENT.STEP_BY_STEP_ANALYSIS)),
    requiresComplianceAnalysis: Boolean(intentData.intentTypes?.includes(INTENT.COMPLIANCE_ANALYSIS)),
    requiresFilingAnalysis: Boolean(intentData.intentTypes?.includes(INTENT.FILING_ANALYSIS)),
    requiresLitigationAnalysis: Boolean(intentData.intentTypes?.includes(INTENT.TAX_LITIGATION)),
    requiresDoctrineAnalysis: Boolean(intentData.intentTypes?.includes(INTENT.DOCTRINAL_ANALYSIS)),
    requiresSourceGrounding: retrieval.retrievalNeed !== RETRIEVAL_NEED.NONE,

    allowReviewMaterials:
      modeSignals.requiresReviewMode || modeSignals.requiresQuizMode,

    isNaturalConversation: Boolean(naturalConversation.isNaturalConversation),
    isFollowUp: Boolean(naturalConversation.isFollowUp),
    isContextDependent: Boolean(naturalConversation.isContextDependent),

    confidence,
    fallbackIntentUsed,

    contextPolicy: buildContextPolicy(tpmProfile, naturalConversation),
    sourcePolicy: buildSourcePolicy(modeSignals, retrieval),
    hierarchyPolicy: hierarchyFlags
  };
}

function analyzeQueryIntent(question = "", options = {}) {
  const { rawQuery, normalizedQuery, lowerQuery } = normalizeQuery(question);

  const commandInfo = detectCommands(normalizedQuery, options);
  const commandCleanQuery = commandInfo.queryWithoutCommand || normalizedQuery;

  const issueTypes = detectIssueSignals(commandCleanQuery);
  const legalDimensions = detectLegalDimensions(commandCleanQuery);
  const domainSignals = detectDomainSignals(commandCleanQuery);

  const naturalConversation = detectNaturalConversation(commandCleanQuery, options);
  const tonePosture = detectToneAndPosture(commandCleanQuery, commandInfo);
  const modeSignals = detectModeSignals(commandCleanQuery, commandInfo, options);

  const domainFlags = detectTaxLegalAuditAccountingReviewerCodeFlags(
    commandCleanQuery,
    issueTypes,
    legalDimensions
  );

  const intentData = detectIntentTypes(
    commandCleanQuery,
    modeSignals,
    domainFlags,
    commandInfo,
    issueTypes,
    legalDimensions
  );

  const reasoningNeeds = detectReasoningNeeds(
    commandCleanQuery,
    intentData,
    modeSignals,
    domainFlags,
    issueTypes,
    legalDimensions
  );

  const retrieval = detectRetrievalNeeds(
    commandCleanQuery,
    modeSignals,
    domainFlags,
    reasoningNeeds,
    issueTypes
  );

  const complexity = detectComplexity(
    commandCleanQuery,
    modeSignals,
    domainFlags,
    reasoningNeeds,
    issueTypes
  );

  const tpmProfile = assignTpmProfile(
    complexity,
    modeSignals,
    domainFlags,
    reasoningNeeds
  );

  const responseMode = detectResponseMode(
    intentData,
    modeSignals,
    domainFlags,
    reasoningNeeds
  );

  const orchestrationMode = detectOrchestrationMode(
    intentData,
    modeSignals,
    domainFlags,
    reasoningNeeds,
    complexity
  );

  const sectionData = buildSectionRequirements(
    modeSignals,
    domainFlags,
    reasoningNeeds,
    responseMode
  );

  const hierarchyFlags = buildHierarchyAndAntiHallucinationFlags(
    reasoningNeeds,
    retrieval,
    domainFlags
  );

  const provisionalIntent = {
    intent: intentData.intentType,
    responseMode,
    orchestrationMode,
    complexity,
    tpmProfile,
    ...modeSignals,
    ...domainFlags,
    ...reasoningNeeds,
    ...retrieval,
    ...hierarchyFlags
  };

  const issueClassification =
    options.issueClassification ||
    safeIssueClassification(commandCleanQuery, provisionalIntent, options);

  const authorityHints = detectAuthorityHints(
    commandCleanQuery,
    domainSignals,
    issueClassification
  );

  const confidence = computeIntentConfidence({
    normalizedQuery,
    intentData,
    modeSignals,
    domainFlags,
    reasoningNeeds,
    retrieval
  });

  const fallbackIntentUsed =
    confidence < 0.55 ||
    intentData.intentType === INTENT.GENERAL_TAX_QUERY;

  const orchestrationIntent = buildOrchestrationIntent({
    intentData,
    responseMode,
    orchestrationMode,
    complexity,
    tpmProfile,
    modeSignals,
    domainFlags,
    reasoningNeeds,
    retrieval,
    hierarchyFlags,
    confidence,
    fallbackIntentUsed,
    naturalConversation
  });

  const engineRouting = buildEngineRouting({
    modeSignals,
    domainFlags,
    reasoningNeeds,
    retrieval
  });

  const payload = {
    engine: "TINA_QUERY_INTENT_ENGINE",
    version: ENGINE_VERSION,

    rawQuery,
    normalizedQuery,

    originalQuestion: rawQuery,
    normalizedQuestion: normalizedQuery,

    detectedCommands: commandInfo.detectedCommands,
    primaryCommand: commandInfo.primaryCommand,
    commandMode: commandInfo.commandMode,

    intentType: intentData.intentType,
    intentTypes: intentData.intentTypes,
    intent: intentData.intentType,
    detectedIntent: intentData.intentType,
    userGoal: intentData.userGoal,
    userTone: tonePosture.userTone,
    userPosture: tonePosture.userPosture,

    requestedMode: modeSignals.requestedMode,
    suggestedMode: modeSignals.suggestedMode,
    responseMode,
    adaptiveMode: responseMode,
    detectedMode: responseMode,
    orchestrationMode,

    requiresQuizMode: modeSignals.requiresQuizMode,
    requiresReviewMode: modeSignals.requiresReviewMode,
    requiresSimpleDefinition: modeSignals.requiresSimpleDefinition,
    requiresSourceVisibility: modeSignals.requiresSourceVisibility,

    isNaturalConversation: naturalConversation.isNaturalConversation,
    isFollowUp: naturalConversation.isFollowUp,
    isContextDependent: naturalConversation.isContextDependent,
    needsPriorContext: naturalConversation.needsPriorContext,
    shouldUsePreviousContext: naturalConversation.shouldUsePreviousContext,
    shouldUseConversationHistory: naturalConversation.shouldUseConversationHistory,
    shouldUsePersistentMemory: naturalConversation.shouldUsePersistentMemory,
    contextDependencyLevel: naturalConversation.contextDependencyLevel,
    conversationAction: naturalConversation.conversationAction,

    isTaxQuestion: domainFlags.isTaxQuestion,
    isLegalQuestion: domainFlags.isLegalQuestion,
    isAuditQuestion: domainFlags.isAuditQuestion,
    isAccountingQuestion: domainFlags.isAccountingQuestion,
    isReviewerQuestion: domainFlags.isReviewerQuestion,
    isDraftingRequest: domainFlags.isDraftingRequest,
    isCodeRequest: domainFlags.isCodeRequest,
    isDebuggingRequest: domainFlags.isDebuggingRequest,
    isArchitectureRequest: domainFlags.isArchitectureRequest,
    isFactPatternRequest: domainFlags.isFactPatternRequest,

    needsAuthorityGrounding: reasoningNeeds.needsAuthorityGrounding,
    needsProvisionLevelGrounding: reasoningNeeds.needsProvisionLevelGrounding,
    needsJurisprudence: reasoningNeeds.needsJurisprudence,
    needsConflictAnalysis: reasoningNeeds.needsConflictAnalysis,
    needsRiskAnalysis: reasoningNeeds.needsRiskAnalysis,
    needsFactPatternAnalysis: reasoningNeeds.needsFactPatternAnalysis,
    needsEvidenceEvaluation: reasoningNeeds.needsEvidenceEvaluation,
    needsAssumptionDisclosure: reasoningNeeds.needsAssumptionDisclosure,
    needsReviewerTreatment: reasoningNeeds.needsReviewerTreatment,
    needsCodePatch: reasoningNeeds.needsCodePatch,

    retrievalNeed: retrieval.retrievalNeed,
    retrievalStrictness: retrieval.retrievalStrictness,
    sourceSensitivity: retrieval.sourceSensitivity,
    preferredSourceTypes: retrieval.preferredSourceTypes,
    targetAuthorityHints: authorityHints.targetAuthorityHints,

    preserveAuthorityHierarchy: hierarchyFlags.preserveAuthorityHierarchy,
    requiresHierarchyValidation: hierarchyFlags.requiresHierarchyValidation,
    requiresSupersessionCheck: hierarchyFlags.requiresSupersessionCheck,
    requiresConflictValidation: hierarchyFlags.requiresConflictValidation,
    authoritySensitivity: hierarchyFlags.authoritySensitivity,

    answerFormatHint: sectionData.answerFormatHint,
    sectionRequirements: sectionData.sectionRequirements,

    antiHallucinationLevel: hierarchyFlags.antiHallucinationLevel,
    mustNotInventAuthorities: hierarchyFlags.mustNotInventAuthorities,
    mustSayIndexedSourceNotFound: hierarchyFlags.mustSayIndexedSourceNotFound,
    mustPreserveUncertainty: hierarchyFlags.mustPreserveUncertainty,

    confidence,

    complexity,
    tpmProfile,

    issueTypes,
    legalDimensions,
    supportedTaxDomains: SUPPORTED_TAX_DOMAINS,
    domainSignals,

    issueClassification,
    retrievalStrategy:
      issueClassification?.retrievalStrategy ||
      (retrieval.retrievalStrictness === RETRIEVAL_STRICTNESS.PROVISION_LEVEL
        ? "PROVISION_LEVEL_AUTHORITY_FIRST"
        : "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC"),

    targetAuthorities:
      unique([
        ...safeArray(issueClassification?.targetAuthorities),
        ...authorityHints.targetAuthorityHints
      ]),

    controllingAuthorities:
      safeArray(issueClassification?.controllingAuthorities),

    supportingAuthorities:
      safeArray(issueClassification?.supportingAuthorities),

    supportingJurisprudence:
      safeArray(issueClassification?.supportingJurisprudence),

    engineRouting,

    orchestrationIntent,
    intentFlags: orchestrationIntent,

    sourcePolicy: buildSourcePolicy(modeSignals, retrieval),
    contextPolicy: buildContextPolicy(tpmProfile, naturalConversation),

    masterPromptHierarchyFlags: hierarchyFlags.masterPromptHierarchyFlags,

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
      sourceGroundingCompatible: true,
      naturalConversationCompatible: true,
      contextMemoryAware: true,
      commandModeCompatible: true,
      noRetrievalPerformed: true,
      noOpenAICallPerformed: true,
      noAnswerGenerated: true
    },

    tinaInstruction:
      "Detect intent and routing only. Do not answer, retrieve, render, or call OpenAI. Preserve authority hierarchy, source grounding, uncertainty, strict conflict gate, reviewer-source visibility limits, and TPM-safe orchestration metadata."
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
        commandCleanQuery,
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
    noRendering: true,
    doesNotReplaceIssueClassification: true,

    commandDetectionReady: true,
    naturalConversationReady: true,
    contextMemoryAwarenessReady: true,
    toneAndPostureDetectionReady: true,
    responseModeReady: true,
    orchestrationModeReady: true,

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
    reviewQuizLearningModesReady: true,

    masterPromptHierarchyFlagsReady: true,
    antiHallucinationFlagsReady: true,
    retrievalStrictnessReady: true
  };
}

/**
 * Lightweight examples:
 *
 * analyzeQueryIntent("What is VAT?")
 * -> SIMPLE_DEFINITION, FAST_DEFINITION, requiresSimpleDefinition=true
 *
 * analyzeQueryIntent("Explain VAT")
 * -> EXPLANATION, STANDARD_TAX, requiresSimpleDefinition=false
 *
 * analyzeQueryIntent("Discuss VAT")
 * -> DISCUSSION, STANDARD_TAX or LEGAL_ANALYSIS depending on source signals
 *
 * analyzeQueryIntent("/review VAT")
 * -> REVIEW_MODE, REVIEWER
 *
 * analyzeQueryIntent("/quiz VAT")
 * -> QUIZ_MODE, QUIZ
 *
 * analyzeQueryIntent("/source VAT")
 * -> SOURCE_MODE, SOURCE_LOOKUP, requiresSourceVisibility=true
 */

export {
  ENGINE_VERSION,

  ISSUE_TYPE,
  RESPONSE_MODE,
  LEGAL_DIMENSION,
  INTENT,
  COMMAND_MODE,
  USER_TONE,
  USER_POSTURE,
  ORCHESTRATION_MODE,
  RETRIEVAL_NEED,
  RETRIEVAL_STRICTNESS,
  AUTHORITY_SENSITIVITY,

  normalizeIssue,
  normalizeQuery,
  detectCommands,

  analyzeQueryIntent,

  queryIntentEngineHealthCheck
};

export default {
  ENGINE_VERSION,

  ISSUE_TYPE,
  RESPONSE_MODE,
  LEGAL_DIMENSION,
  INTENT,
  COMMAND_MODE,
  USER_TONE,
  USER_POSTURE,
  ORCHESTRATION_MODE,
  RETRIEVAL_NEED,
  RETRIEVAL_STRICTNESS,
  AUTHORITY_SENSITIVITY,

  normalizeIssue,
  normalizeQuery,
  detectCommands,

  analyzeQueryIntent,

  queryIntentEngineHealthCheck
};
