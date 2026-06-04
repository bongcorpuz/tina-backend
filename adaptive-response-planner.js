// FILE: adaptive-response-planner.js
"use strict";

/**
 * TINA Adaptive Response Planner
 * Version: 6.0.0
 *
 * Role:
 * - response architecture planner ONLY
 * - no OpenAI calls
 * - no prompt assembly
 * - no source injection
 * - no raw engine output injection
 */

const ENGINE_VERSION = "6.0.0";

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

const ORCHESTRATION_MODE = Object.freeze({
  FAST_DEFINITION: "FAST_DEFINITION",
  STANDARD_TAX: "STANDARD_TAX",
  LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
  COMPLEX_ADVISORY: "COMPLEX_ADVISORY",
  EMERGENCY_TRIM: "EMERGENCY_TRIM"
});

// ─── /ask Research Profiles ───────────────────────────────────────────────────
// Each profile maps to a distinct output structure for the /ask hook.
// Profile selection is driven by query signals and issueClassification only —
// no OpenAI calls, no retrieval, no prompt assembly here.

const ASK_PROFILE = Object.freeze({
  BASIC_RESEARCH:               "BASIC_RESEARCH",
  LEGAL_INTERPRETATION:         "LEGAL_INTERPRETATION",
  FACT_PATTERN_ANALYSIS:        "FACT_PATTERN_ANALYSIS",
  TRANSACTION_CHARACTERIZATION: "TRANSACTION_CHARACTERIZATION",
  JURISPRUDENCE_ANALYSIS:       "JURISPRUDENCE_ANALYSIS",
  AUTHORITY_COMPARISON:         "AUTHORITY_COMPARISON",
  ACCOUNTING_TAX_INTERACTION:   "ACCOUNTING_TAX_INTERACTION"
});

const ASK_PROFILE_SECTIONS = Object.freeze({
  // A. "What is X?" — statutory definition, brief interpretation, practical meaning.
  [ASK_PROFILE.BASIC_RESEARCH]: [
    "Short Answer",
    "Controlling Authorities",
    "Interpretation",
    "Practical Meaning"
  ],

  // B. "What constitutes X?" / "Is Y subject to Z?" — legal analysis of an issue.
  [ASK_PROFILE.LEGAL_INTERPRETATION]: [
    "Issue Presented",
    "Short Answer",
    "Controlling Authorities",
    "Legal Interpretation",
    "Practical Application"
  ],

  // C. "We paid X without Y. Is it deductible?" — specific factual scenario.
  [ASK_PROFILE.FACT_PATTERN_ANALYSIS]: [
    "Issue Presented",
    "Short Answer",
    "Relevant Facts / Assumptions",
    "Controlling Authorities",
    "Legal / Tax Analysis",
    "Alternative Interpretations",
    "Position Strength",
    "Practical Note"
  ],

  // D. "Is this reimbursement or revenue?" / "Dividend or loan?" — competing labels.
  [ASK_PROFILE.TRANSACTION_CHARACTERIZATION]: [
    "Characterization Issue",
    "Competing Characterizations",
    "Controlling Authorities",
    "Tax Consequences",
    "Evidence / Substance Factors",
    "Most Defensible Position"
  ],

  // E. "What did Medicard decide?" / "What cases discuss X?" — case / doctrine.
  [ASK_PROFILE.JURISPRUDENCE_ANALYSIS]: [
    "Case / Doctrine Asked",
    "Facts and Issue",
    "Ruling",
    "Doctrine",
    "Current Significance",
    "Related Authorities"
  ],

  // F. "Which prevails, RR or NIRC?" / "Can an RMC create a tax?" — hierarchy conflict.
  [ASK_PROFILE.AUTHORITY_COMPARISON]: [
    "Authority Question",
    "Short Answer",
    "Authority Hierarchy",
    "Conflict / Consistency Analysis",
    "Controlling Rule",
    "Practical Effect"
  ],

  // G. "How do book-tax differences affect deductibility?" — accounting ↔ tax.
  [ASK_PROFILE.ACCOUNTING_TAX_INTERACTION]: [
    "Issue Presented",
    "Short Answer",
    "Accounting Treatment",
    "Tax Treatment",
    "Differences and Reconciliation",
    "Practical Note"
  ]
});

/**
 * Selects the /ask response profile from the query text and classification.
 * Uses source-side signals only — no OpenAI calls.
 */
function selectAskProfile(query = "", issueClassification = {}) {
  const q = String(query || "").toLowerCase().trim();
  const pi       = String(issueClassification?.primaryIssue || "").toUpperCase();
  const sub      = String(issueClassification?.subIssue    || "").toUpperCase();
  const factSens = String(issueClassification?.factSensitivity || "").toLowerCase();

  // JURISPRUDENCE_ANALYSIS — asks about a specific case, ruling, or doctrine.
  // "significance of" and named cases are strong enough signals regardless of
  // whether the query also starts with "what is".
  if (
    /\b(what did|significance of|what cases|cases.*discuss|case.*about|decided in|held in)\b/i.test(q) ||
    /\b(medicard|sony|aichi|san roque|seagate|toshiba|meralco|philippine hearts)\b/i.test(q) ||
    /g\.r\.\s*no\.?\s*\d|cta.*case\s*no/i.test(q)
  ) return ASK_PROFILE.JURISPRUDENCE_ANALYSIS;

  // AUTHORITY_COMPARISON — hierarchy, conflict, override, BIR ruling bindingness.
  // "bir.*binding" is tested separately because \b cannot straddle "binding" inside
  // a larger alternation group without missing the suffix.
  if (
    /\b(prevails?|override|overrides?|supersede|supersedes?|superseded|inconsistent with|which.*higher|which.*authority|hierarchy|rmc.*create.*tax|can.*bir.*impose|can.*rr.*impose|rr.*vs\.?\s*nirc|nirc.*vs\.?\s*rr|consistent.*nirc|nirc.*consistent|can an rmc|can a bir ruling)\b/i.test(q) ||
    /\bbir\b.*\bbinding\b/i.test(q)
  ) return ASK_PROFILE.AUTHORITY_COMPARISON;

  // TRANSACTION_CHARACTERIZATION — competing legal/tax labels.
  if (
    /\b(reimbursement.*or.*revenue|revenue.*or.*reimbursement|dividend.*or.*loan|loan.*or.*dividend|management fee.*or.*dividend|is this.*or.*that|is this.*characteriz|characteriz|pass[- ]through|gross.*or.*net)\b/i.test(q) ||
    pi === "TRANSACTION" || sub.includes("CHARACTERIZATION") || sub === "TRANSACTION"
  ) return ASK_PROFILE.TRANSACTION_CHARACTERIZATION;

  // ACCOUNTING_TAX_INTERACTION — book-tax differences, PFRS vs tax treatment.
  if (
    /\b(book[- ]tax|pfrs|financial statement|accounting.*deductib|deductib.*accounting|book.*income|tax.*income|reconcil|timing differ|accounting treatment|when.*recogni|recogni.*for.*tax)\b/i.test(q)
  ) return ASK_PROFILE.ACCOUNTING_TAX_INTERACTION;

  // FACT_PATTERN_ANALYSIS — specific factual scenario described by the user.
  if (
    /\b(we (paid|collected|received|incurred|failed|did not|have not|will|are|were)|our company|our client|our firm|the taxpayer|the company|client.*paid|paid.*without|collected.*without|incurred|failed to withhold|without.*withholding|can we deduct|is it deductible|is this taxable|is this subject|are we liable)\b/i.test(q) ||
    factSens === "high" ||
    issueClassification?.requiresFactPatternAnalysis === true
  ) return ASK_PROFILE.FACT_PATTERN_ANALYSIS;

  // LEGAL_INTERPRETATION — interpretive question (not a plain definition).
  if (
    /\b(what constitutes|what counts as|what qualifies|what falls under|is.*subject to|are.*subject to|is.*covered by|what is covered|how does.*apply|when does.*apply|applies to|does.*include|difference between.*and|distinguish.*between)\b/i.test(q) &&
    !/\bwhat is\b.*\??\s*$/i.test(q)
  ) return ASK_PROFILE.LEGAL_INTERPRETATION;

  // BASIC_RESEARCH — definition / overview, default for /ask.
  return ASK_PROFILE.BASIC_RESEARCH;
}

const RESPONSE_DEPTH = Object.freeze({
  CONCISE: "CONCISE",
  STANDARD: "STANDARD",
  STRUCTURED: "STRUCTURED",
  COMPREHENSIVE: "COMPREHENSIVE",
  SIMPLE: "SIMPLE"
});

const TECHNICAL_TEMPLATE = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
]);

const RESPONSE_TEMPLATES = Object.freeze({
  [RESPONSE_MODE.QUICK]: [
    "A. DIRECT ANSWER",
    "B. SHORT BASIS",
    "C. PRACTICAL NOTE"
  ],

  [RESPONSE_MODE.STANDARD]: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. PRACTICAL APPLICATION",
    "D. TAX / COMPLIANCE RISK"
  ],

  [RESPONSE_MODE.TECHNICAL]: TECHNICAL_TEMPLATE,

  [RESPONSE_MODE.AUDIT]: [
    "A. DIRECT ANSWER",
    "B. KNOWN FACTS AND ASSUMPTIONS",
    "C. AUDIT ISSUE",
    "D. ACCOUNTING / TAX TREATMENT",
    "E. AUDIT RISK / MISSTATEMENT RISK",
    "F. REQUIRED AUDIT EVIDENCE",
    "G. RECOMMENDED AUDIT POSITION"
  ],

  [RESPONSE_MODE.LITIGATION]: [
    "A. DIRECT ANSWER",
    "B. ISSUE FOR RESOLUTION",
    "C. CONTROLLING LEGAL BASIS",
    "D. SUPPORTING JURISPRUDENCE",
    "E. BIR / OPPOSING POSITION",
    "F. TAXPAYER DEFENSE",
    "G. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "H. CONCLUSION"
  ],

  [RESPONSE_MODE.CONTRACT]: [
    "A. DIRECT ANSWER",
    "B. CONTRACT PARTIES AND OBJECT",
    "C. RIGHTS AND OBLIGATIONS",
    "D. CONSIDERATION / BILLING / COLLECTION",
    "E. CONTROL AND RISK ALLOCATION",
    "F. TAX CLAUSES / LEGAL CONSEQUENCES",
    "G. DOCUMENTARY GAPS",
    "H. RECOMMENDED POSITION"
  ],

  [RESPONSE_MODE.TRANSACTION]: [
    "A. DIRECT ANSWER",
    "B. LEGAL FORM",
    "C. ECONOMIC SUBSTANCE",
    "D. TRANSACTION FLOW",
    "E. PRINCIPAL VS AGENT / CONTROL ANALYSIS",
    "F. TAX AND ACCOUNTING CHARACTERIZATION",
    "G. BIR / AUDIT RISK",
    "H. DOCUMENTATION REQUIRED"
  ],

  [RESPONSE_MODE.EVIDENCE_HEAVY]: [
    "A. DIRECT ANSWER",
    "B. ASSERTED FACTS",
    "C. DOCUMENTED FACTS",
    "D. UNSUPPORTED / CONTRADICTORY FACTS",
    "E. MISSING DOCUMENTS",
    "F. AUDIT-SENSITIVE ITEMS",
    "G. CONCLUSION SUBJECT TO VERIFICATION"
  ],

  [RESPONSE_MODE.REVIEWER]: [
    "A. SIMPLE ANSWER",
    "B. WHY",
    "C. BASIC LEGAL BASIS",
    "D. EXAMPLE",
    "E. PRACTICAL / EXAM TIP"
  ]
});

const ORCHESTRATION_TEMPLATES = Object.freeze({
  [ORCHESTRATION_MODE.FAST_DEFINITION]: [
    "Direct Answer",
    "Legal Basis"
  ],

  [ORCHESTRATION_MODE.STANDARD_TAX]: [
    "Direct Answer",
    "Legal Basis",
    "Supporting Rules",
    "Practical Note",
    "Jurisprudence"
  ],

  [ORCHESTRATION_MODE.LEGAL_ANALYSIS]: TECHNICAL_TEMPLATE,

  [ORCHESTRATION_MODE.COMPLEX_ADVISORY]: [
    "Executive Answer",
    "Controlling Basis",
    "Assumptions / Fact Sensitivity",
    "Risk / Practical Application",
    "Recommended Documentation"
  ],

  [ORCHESTRATION_MODE.EMERGENCY_TRIM]: [
    "Direct Answer",
    "Limited Basis"
  ]
});

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function unique(values = []) {
  return [...new Set(safeArray(values).filter(Boolean))];
}

function normalizeIssue(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VAT: "VAT_LIABILITY",
    OUTPUT_VAT: "VAT_LIABILITY",
    VAT_DEFINITION: "VAT_LIABILITY",
    DEFINITION: "VAT_LIABILITY",
    REFUND: "VAT_REFUND",
    INPUT_VAT: "VAT_REFUND",
    INPUT_VAT_REFUND: "VAT_REFUND",
    TAX_REFUND: "VAT_REFUND",
    EWT: "WITHHOLDING",
    CWT: "WITHHOLDING",
    FWT: "WITHHOLDING",
    WITHHOLDING_TAX: "WITHHOLDING",
    RCIT: "INCOME_TAX",
    MCIT: "INCOME_TAX",
    NOLCO: "INCOME_TAX",
    CHARACTERIZATION: "TRANSACTION",
    PRINCIPAL_AGENT: "TRANSACTION",
    PRINCIPAL_VS_AGENT: "TRANSACTION",
    PASS_THROUGH: "TRANSACTION",
    REIMBURSEMENT: "TRANSACTION",
    AGREEMENT: "CONTRACT",
    ACCOUNTING_TAX: "ACCOUNTING"
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
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
    BIR_RULING: "BIR_RULING",
    BIR_RULINGS: "BIR_RULING",
    IFRS: "PFRS"
  };

  return aliases[raw] || raw || null;
}

function normalizeMode(mode = "") {
  const value = String(mode || "").toUpperCase();

  if (Object.values(RESPONSE_MODE).includes(value)) return value;
  if (value.includes("FAST") || value.includes("QUICK")) return RESPONSE_MODE.QUICK;
  if (value.includes("AUDIT")) return RESPONSE_MODE.AUDIT;
  if (value.includes("LITIGATION") || value.includes("LEGAL_DEFENSE") || value.includes("LEGAL")) return RESPONSE_MODE.LITIGATION;
  if (value.includes("CONTRACT")) return RESPONSE_MODE.CONTRACT;
  if (value.includes("TRANSACTION")) return RESPONSE_MODE.TRANSACTION;
  if (value.includes("EVIDENCE")) return RESPONSE_MODE.EVIDENCE_HEAVY;
  if (value.includes("TECHNICAL") || value.includes("DOCTRINE")) return RESPONSE_MODE.TECHNICAL;
  if (value.includes("REVIEWER") || value.includes("LEARNING") || value.includes("QUIZ")) return RESPONSE_MODE.REVIEWER;
  if (value.includes("STANDARD")) return RESPONSE_MODE.STANDARD;

  return RESPONSE_MODE.STANDARD;
}

function normalizeOrchestrationMode(mode = "") {
  const value = String(mode || "").toUpperCase();

  if (Object.values(ORCHESTRATION_MODE).includes(value)) return value;
  if (value.includes("EMERGENCY")) return ORCHESTRATION_MODE.EMERGENCY_TRIM;
  if (value.includes("FAST") || value.includes("QUICK") || value.includes("DEFINITION")) return ORCHESTRATION_MODE.FAST_DEFINITION;
  if (
    value.includes("COMPLEX") ||
    value.includes("ADVISORY") ||
    value.includes("AUDIT") ||
    value.includes("CONTRACT") ||
    value.includes("TRANSACTION") ||
    value.includes("EVIDENCE") ||
    value.includes("RISK")
  ) return ORCHESTRATION_MODE.COMPLEX_ADVISORY;
  if (
    value.includes("LEGAL") ||
    value.includes("DOCTRINE") ||
    value.includes("JURISPRUDENCE") ||
    value.includes("LITIGATION")
  ) return ORCHESTRATION_MODE.LEGAL_ANALYSIS;
  if (value.includes("STANDARD") || value.includes("TAX")) return ORCHESTRATION_MODE.STANDARD_TAX;

  return null;
}

function getIssueClassification(input = {}) {
  const source =
    input.issueClassification?.orchestrationClassification ||
    input.issueClassification ||
    input.queryIntent?.issueClassification?.orchestrationClassification ||
    input.queryIntent?.issueClassification ||
    input.modeAnalysis?.issueClassification ||
    input.responsePlan?.issueClassification ||
    input.adaptiveContext?.issueClassification?.orchestrationClassification ||
    input.adaptiveContext?.issueClassification ||
    {};

  const primaryIssue =
    normalizeIssue(source.primaryIssue) ||
    normalizeIssue(source.primary_issue) ||
    normalizeIssue(source.issueType) ||
    normalizeIssue(source.issue_type) ||
    "GENERAL_TAX";

  const subIssues = unique([
    primaryIssue,
    ...safeArray(source.subIssues).map(normalizeIssue),
    ...safeArray(source.subIssue).map(normalizeIssue),
    ...safeArray(source.sub_issues).map(normalizeIssue),
    ...safeArray(source.sub_issue).map(normalizeIssue)
  ]).filter(Boolean);

  return {
    ...source,
    primaryIssue,
    subIssue: source.subIssue || source.sub_issue || subIssues[0] || primaryIssue,
    subIssues,
    legalDimensions: unique([
      ...safeArray(source.legalDimensions),
      ...safeArray(source.legalDimension),
      ...safeArray(source.legal_dimensions),
      ...safeArray(source.legal_dimension)
    ]),
    retrievalStrategy:
      source.retrievalStrategy ||
      source.retrieval_strategy ||
      "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",
    targetAuthorities: unique([
      ...safeArray(source.targetAuthorities).map(normalizeAuthority),
      ...safeArray(source.target_authorities).map(normalizeAuthority)
    ]).filter(Boolean),
    legalQuestionPresented:
      source.legalQuestionPresented ||
      source.legal_question_presented ||
      null,
    factSensitivity:
      source.factSensitivity ||
      source.fact_sensitivity ||
      "moderate",
    complexity:
      source.complexity ||
      source.complexityFlag ||
      "standard"
  };
}

function getOrchestrationIntent(input = {}) {
  return (
    input.orchestrationIntent ||
    input.intentFlags ||
    input.queryIntent?.orchestrationIntent ||
    input.queryIntent?.intentFlags ||
    input.adaptiveContext?.orchestrationIntent ||
    {}
  );
}

function determineModeFromIssue(issueClassification = {}, fallbackMode = RESPONSE_MODE.STANDARD) {
  const primary = issueClassification.primaryIssue;
  const dimensions = safeArray(issueClassification.legalDimensions).map((item) =>
    String(item).toUpperCase()
  );

  if (primary === "AUDIT" || primary === "ACCOUNTING") return RESPONSE_MODE.AUDIT;
  if (primary === "CONTRACT") return RESPONSE_MODE.CONTRACT;
  if (["TRANSACTION", "ECONOMIC_SUBSTANCE"].includes(primary)) return RESPONSE_MODE.TRANSACTION;
  if (["ASSESSMENT", "CASE_LAW", "DOCTRINE"].includes(primary)) return RESPONSE_MODE.LITIGATION;
  if (dimensions.includes("EVIDENTIARY") || issueClassification.factSensitivity === "high") {
    return RESPONSE_MODE.EVIDENCE_HEAVY;
  }
  if (["VAT_LIABILITY", "VAT_REFUND", "INCOME_TAX", "WITHHOLDING"].includes(primary)) {
    return RESPONSE_MODE.TECHNICAL;
  }

  return fallbackMode;
}

function determineOrchestrationMode({
  input = {},
  responseMode = RESPONSE_MODE.STANDARD,
  issueClassification = {},
  intent = {}
} = {}) {
  const explicit =
    normalizeOrchestrationMode(input.orchestrationMode) ||
    normalizeOrchestrationMode(input.contextMode) ||
    normalizeOrchestrationMode(input.contextOrchestration?.mode) ||
    normalizeOrchestrationMode(input.adaptiveContext?.orchestration?.mode) ||
    normalizeOrchestrationMode(input.responsePlan?.contextMode);

  if (explicit) return explicit;

  if (intent.requiresSourceOnly || intent.requiresSimpleDefinition) {
    return ORCHESTRATION_MODE.FAST_DEFINITION;
  }

  if (
    intent.complexity === "complex" ||
    intent.requiresFactPatternAnalysis ||
    intent.requiresEvidenceEvaluation ||
    intent.requiresContractInterpretation ||
    intent.requiresTransactionCharacterization ||
    intent.requiresEconomicSubstance ||
    ["AUDIT", "CONTRACT", "TRANSACTION", "EVIDENCE_HEAVY"].includes(responseMode) ||
    issueClassification.factSensitivity === "high"
  ) {
    return ORCHESTRATION_MODE.COMPLEX_ADVISORY;
  }

  if (
    intent.requiresLegalAnalysis ||
    intent.requiresJurisprudence ||
    ["LITIGATION", "TECHNICAL"].includes(responseMode)
  ) {
    return ORCHESTRATION_MODE.LEGAL_ANALYSIS;
  }

  return ORCHESTRATION_MODE.STANDARD_TAX;
}

function determineDepth(mode, context = {}, issueClassification = {}, orchestrationMode = null) {
  const risk = String(
    context.riskLevel ||
      context.risk_level ||
      context.riskScore?.overallRisk?.level ||
      ""
  ).toUpperCase();

  const complexity = String(
    context.complexityLevel ||
      context.complexity_level ||
      issueClassification.complexityFlag ||
      issueClassification.complexity ||
      ""
  ).toUpperCase();

  if (orchestrationMode === ORCHESTRATION_MODE.EMERGENCY_TRIM) return RESPONSE_DEPTH.CONCISE;
  if (orchestrationMode === ORCHESTRATION_MODE.FAST_DEFINITION) return RESPONSE_DEPTH.CONCISE;
  if (orchestrationMode === ORCHESTRATION_MODE.COMPLEX_ADVISORY) return RESPONSE_DEPTH.COMPREHENSIVE;

  if (mode === RESPONSE_MODE.REVIEWER) return RESPONSE_DEPTH.SIMPLE;
  if (mode === RESPONSE_MODE.QUICK) return RESPONSE_DEPTH.CONCISE;
  if (risk === "CRITICAL" || risk === "HIGH") return RESPONSE_DEPTH.COMPREHENSIVE;
  if (complexity === "HIGH" || complexity === "COMPLEX" || complexity === "MULTI_ISSUE") {
    return RESPONSE_DEPTH.COMPREHENSIVE;
  }

  if (
    [
      RESPONSE_MODE.AUDIT,
      RESPONSE_MODE.LITIGATION,
      RESPONSE_MODE.CONTRACT,
      RESPONSE_MODE.TRANSACTION,
      RESPONSE_MODE.EVIDENCE_HEAVY,
      RESPONSE_MODE.TECHNICAL
    ].includes(mode)
  ) {
    return RESPONSE_DEPTH.STRUCTURED;
  }

  return RESPONSE_DEPTH.STANDARD;
}

function mustIncludeLimitations(context = {}, issueClassification = {}) {
  const conclusionStrength = String(
    context.conclusionStrength ||
      context.conclusionRestriction ||
      context.conclusionAction ||
      context.positionStrength?.conclusionAction ||
      context.riskScore?.conclusionRestriction ||
      ""
  ).toUpperCase();

  return Boolean(
    context.limitationStatementRequired ||
      context.mustIncludeLimitation ||
      context.mustDiscloseBeforeConclusion ||
      context.requiresVerification ||
      context.assumptionGap?.mustDiscloseBeforeConclusion ||
      issueClassification.factSensitivity === "high" ||
      issueClassification.factPatternRequired ||
      issueClassification.transactionCharacterizationRequired ||
      conclusionStrength === "PRELIMINARY_CONCLUSION_ONLY" ||
      conclusionStrength === "DEFER_CONCLUSION" ||
      conclusionStrength === "USE_QUALIFIED_CONCLUSION" ||
      ["HIGH", "CRITICAL"].includes(
        String(context.riskLevel || context.riskScore?.overallRisk?.level || "").toUpperCase()
      )
  );
}

function buildPreConclusionBlocks(context = {}) {
  const blocks = [];

  const addBlock = (heading, source, items) => {
    const normalizedItems = safeArray(items)
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.description) return item.description;
        if (item?.label) return item.label;
        return null;
      })
      .filter(Boolean)
      .slice(0, 8);

    if (!normalizedItems.length) return;

    blocks.push({
      heading,
      source,
      items: normalizedItems
    });
  };

  addBlock(
    "PRELIMINARY DISCLOSURES BEFORE CONCLUSION",
    "assumption-gap-engine",
    context.mandatoryDisclosure || context.assumptionGap?.mandatoryDisclosure
  );

  addBlock(
    "KNOWN FACTS",
    "fact-pattern-engine",
    context.knownFacts || context.factPattern?.knownFacts || context.factPattern?.facts
  );

  addBlock(
    "UNRESOLVED FACTS",
    "fact-pattern-engine",
    context.unresolvedFacts || context.factPattern?.unresolvedFacts
  );

  addBlock(
    "DOCUMENTARY GAPS",
    "contract-interpretation-engine",
    context.documentaryGaps || context.contractInterpretation?.documentaryGaps
  );

  addBlock(
    "EVIDENCE STATUS",
    "evidence-evaluation-engine",
    context.evidenceCoverage || context.evidenceEvaluation?.evidenceCoverage
  );

  addBlock(
    "RISK FLAGS",
    "risk-scoring-engine",
    context.riskFlags || context.riskScore?.riskFlags
  );

  return blocks;
}

function buildConclusionRule(context = {}, issueClassification = {}) {
  const strength = String(
    context.conclusionStrength ||
      context.conclusionRestriction ||
      context.conclusionAction ||
      context.positionStrength?.conclusionAction ||
      context.riskScore?.conclusionRestriction ||
      ""
  ).toUpperCase();

  if (strength === "DEFER_CONCLUSION") {
    return {
      allowStrongConclusion: false,
      restriction: "DEFER_CONCLUSION",
      requiredLanguage: "Do not give a definitive conclusion. State what must be verified first."
    };
  }

  if (
    strength === "PRELIMINARY_CONCLUSION_ONLY" ||
    strength === "USE_QUALIFIED_CONCLUSION" ||
    mustIncludeLimitations(context, issueClassification)
  ) {
    return {
      allowStrongConclusion: false,
      restriction: "PRELIMINARY_CONCLUSION_ONLY",
      requiredLanguage:
        "Use preliminary language: Based on the available facts, the position is preliminary and subject to verification."
    };
  }

  return {
    allowStrongConclusion: true,
    restriction: "DIRECT_CONCLUSION_ALLOWED",
    requiredLanguage:
      "A direct conclusion may be given if supported by issue-matched legal basis and evidence."
  };
}

function buildSourceOrderingPolicy(issueClassification = {}) {
  return {
    useIssueClassificationMatch: true,
    useTargetAuthorityMatch: true,
    useControllingPrecedence: true,
    hideIssueMismatchedSources: true,
    preferTargetAuthorities: safeArray(issueClassification.targetAuthorities),
    primaryIssue: issueClassification.primaryIssue || null,
    subIssues: issueClassification.subIssues || []
  };
}

function buildConflictDisplayPolicy() {
  return {
    displayConflictYesOnlyWhenConflictTrue: true,
    requireCompleteConflictMetadata: true,
    requireSameIssueGate: true,
    requireOppositeHoldingGate: true,
    blockVagueConflictLanguage: true,
    defaultNoConflictLanguage:
      "No direct doctrinal conflict is established unless complete metadata shows the same exact issue, same legal dimension, opposite holding, conflict type, and hierarchy-based resolution."
  };
}

function buildContextBudgetPolicy(orchestrationMode = ORCHESTRATION_MODE.STANDARD_TAX) {
  const policies = {
    [ORCHESTRATION_MODE.FAST_DEFINITION]: {
      maxSources: 3,
      maxSourceChars: 900,
      maxPromptTokens: 4500,
      maxCompletionTokens: 900
    },

    [ORCHESTRATION_MODE.STANDARD_TAX]: {
      maxSources: 5,
      maxSourceChars: 1400,
      maxPromptTokens: 7000,
      maxCompletionTokens: 1600
    },

    [ORCHESTRATION_MODE.LEGAL_ANALYSIS]: {
      maxSources: 6,
      maxSourceChars: 1800,
      maxPromptTokens: 9500,
      maxCompletionTokens: 2200
    },

    [ORCHESTRATION_MODE.COMPLEX_ADVISORY]: {
      maxSources: 8,
      maxSourceChars: 1800,
      maxPromptTokens: 11000,
      maxCompletionTokens: 2600
    },

    [ORCHESTRATION_MODE.EMERGENCY_TRIM]: {
      maxSources: 2,
      maxSourceChars: 600,
      maxPromptTokens: 3000,
      maxCompletionTokens: 700
    }
  };

  return {
    ...(policies[orchestrationMode] || policies[ORCHESTRATION_MODE.STANDARD_TAX]),
    useContextOrchestrationEngine: true,
    compressSourcesBeforeOpenAI: true,
    finalTrimBeforeOpenAI: true,
    preventRawFullDocumentInjection: true,
    preventFullDebugObjectInjection: true,
    preventFullEngineOutputInjection: true,
    passCompactClassificationOnly: true,
    passCompactIntentOnly: true
  };
}

function buildRendererContract({
  mode,
  orchestrationMode,
  depth,
  template,
  conclusionRule,
  limitationRequired,
  issueClassification
}) {
  return {
    responseMode: mode,
    orchestrationMode,
    contextMode: orchestrationMode,
    responseDepth: depth,
    sections: template,
    conclusionRule,
    mustIncludeLimitation: limitationRequired,
    preserveHeadings: true,
    requireStructuredOutput: true,
    sanitizeVagueConflictFlags: true,
    issueClassification,
    issueClassificationAware: true,
    issueClassificationMatchAware: true,
    targetAuthorityAware: true,
    sourceOrderingPolicy: buildSourceOrderingPolicy(issueClassification),
    conflictDisplayPolicy: buildConflictDisplayPolicy(),
    contextBudgetPolicy: buildContextBudgetPolicy(orchestrationMode)
  };
}

function planAdaptiveResponse(input = {}) {
  const issueClassification = getIssueClassification(input);
  const intent = getOrchestrationIntent(input);

  const detectedMode =
    input.primaryMode ||
    input.normalizedMode ||
    input.modeAnalysis?.primaryMode ||
    input.modeAnalysis?.normalizedMode ||
    input.modeAnalysis?.responseMode ||
    input.mode ||
    RESPONSE_MODE.STANDARD;

  const fallbackMode = normalizeMode(detectedMode);
  const mode = determineModeFromIssue(issueClassification, fallbackMode);

  const orchestrationMode = determineOrchestrationMode({
    input,
    responseMode: mode,
    issueClassification,
    intent
  });

  const context = {
    ...safeObject(input),
    ...safeObject(input.modeAnalysis),
    ...safeObject(input.factPattern),
    ...safeObject(input.evidenceEvaluation),
    ...safeObject(input.contractInterpretation),
    ...safeObject(input.transactionCharacterization),
    ...safeObject(input.economicSubstance),
    ...safeObject(input.assumptionGap),
    ...safeObject(input.riskScore),
    ...safeObject(input.positionStrength),
    issueClassification,
    orchestrationIntent: intent
  };

  const depth = determineDepth(
    mode,
    context,
    issueClassification,
    orchestrationMode
  );

  // ── /ask profile selection ─────────────────────────────────────────────────
  // Only applies to the /ask hook (or when no explicit hook is set).
  // Reviewer, quiz, and other pinned hooks use their own section templates.
  const hook     = input.hook || null;
  const isAskHook = !hook || hook === "/ask";
  const isPinnedHook =
    hook === "/review" || hook === "/quiz" || hook === "/audit" ||
    hook === "/tax"    || hook === "/case" || hook === "/source";

  const askProfile = (isAskHook && !isPinnedHook)
    ? selectAskProfile(
        input.query || input.userQuery || input.question || "",
        issueClassification
      )
    : null;

  const askProfileSections = askProfile ? ASK_PROFILE_SECTIONS[askProfile] : null;

  // Profile sections override the orchestration template for /ask.
  const template = askProfileSections ||
    ORCHESTRATION_TEMPLATES[orchestrationMode] ||
    RESPONSE_TEMPLATES[mode] ||
    RESPONSE_TEMPLATES[RESPONSE_MODE.TECHNICAL];

  const conclusionRule = buildConclusionRule(context, issueClassification);
  const limitationRequired = mustIncludeLimitations(context, issueClassification);
  const contextBudgetPolicy = buildContextBudgetPolicy(orchestrationMode);

  const rendererContract = buildRendererContract({
    mode,
    orchestrationMode,
    depth,
    template,
    conclusionRule,
    limitationRequired,
    issueClassification
  });

  return {
    engine: "TINA_ADAPTIVE_RESPONSE_PLANNER",
    version: ENGINE_VERSION,

    // /ask profile fields (null for all other hooks)
    askProfile,
    askProfileSections,

    responseMode: mode,
    orchestrationMode,
    contextMode: orchestrationMode,
    responseDepth: depth,
    responseTemplate: template,

    issueClassification,
    orchestrationIntent: intent,

    preConclusionBlocks: buildPreConclusionBlocks(context),
    conclusionRule,
    mustIncludeLimitation: limitationRequired,
    limitationStatement: limitationRequired
      ? "Based on the available facts, the position is preliminary and subject to verification."
      : null,

    sourceOrderingPolicy: buildSourceOrderingPolicy(issueClassification),
    conflictDisplayPolicy: buildConflictDisplayPolicy(),
    contextBudgetPolicy,
    rendererContract,

    plannerContract: {
      responseMode: mode,
      orchestrationMode,
      contextMode: orchestrationMode,
      responseDepth: depth,
      requiredSections: template,
      askProfile,
      askProfileSections,
      conclusionRule,
      mustIncludeLimitation: limitationRequired,
      sourceOrderingPolicy: buildSourceOrderingPolicy(issueClassification),
      conflictDisplayPolicy: buildConflictDisplayPolicy(),
      contextBudgetPolicy,
      issueClassification
    },

    orchestrationMetadata: {
      plannerOnly: true,
      noPromptAssembly: true,
      noOpenAICalls: true,
      noSourceInjection: true,
      noRawEngineOutputInjection: true,
      rendererCompatible: true,
      finalAnswerComplianceCompatible: true,
      contextOrchestrationCompatible: true,
      contextMode: orchestrationMode,
      responseMode: mode,
      responseDepth: depth,
      askProfileAware: askProfile !== null,
      tinaAdaptiveResponsePlannerVersion: ENGINE_VERSION
    }
  };
}

/**
 * Compatibility wrapper.
 * Returns a compact planner instruction object, but does not assemble prompts.
 */
function buildResponsePlannerInstruction(plan = {}) {
  if (!plan || plan.engine !== "TINA_ADAPTIVE_RESPONSE_PLANNER") {
    throw new Error("Invalid adaptive response plan supplied.");
  }

  return {
    instruction: [],
    plan: {
      responseMode: plan.responseMode,
      orchestrationMode: plan.orchestrationMode,
      contextMode: plan.contextMode,
      responseDepth: plan.responseDepth,
      responseTemplate: plan.responseTemplate,
      conclusionRule: plan.conclusionRule,
      mustIncludeLimitation: plan.mustIncludeLimitation,
      sourceOrderingPolicy: plan.sourceOrderingPolicy,
      conflictDisplayPolicy: plan.conflictDisplayPolicy,
      contextBudgetPolicy: plan.contextBudgetPolicy,
      issueClassification: plan.issueClassification,
      orchestrationMetadata: plan.orchestrationMetadata
    },
    plannerOnly: true,
    noPromptAssembly: true
  };
}

function adaptiveResponsePlannerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ADAPTIVE_RESPONSE_PLANNER",
    version: ENGINE_VERSION,
    responseArchitecturePlannerOnly: true,
    noOpenAICalls: true,
    noPromptAssembly: true,
    noSourceInjection: true,
    noRawEngineObjectInjection: true,
    esmCompatible: true,
    rendererCompatible: true,
    finalAnswerComplianceCompatible: true,
    contextOrchestrationCompatible: true,
    orchestrationModeAware: true,
    supportedOrchestrationModes: Object.values(ORCHESTRATION_MODE),
    conclusionGatingCompatible: true,
    issueClassificationCompatible: true,
    sourceOrderingPolicyReady: true,
    conflictDisplayPolicyReady: true,
    contextBudgetPolicyReady: true
  };
}

export {
  ENGINE_VERSION,
  RESPONSE_MODE,
  ORCHESTRATION_MODE,
  RESPONSE_DEPTH,
  RESPONSE_TEMPLATES,
  ORCHESTRATION_TEMPLATES,
  TECHNICAL_TEMPLATE,
  ASK_PROFILE,
  ASK_PROFILE_SECTIONS,
  selectAskProfile,
  normalizeMode,
  normalizeOrchestrationMode,
  getIssueClassification,
  getOrchestrationIntent,
  planAdaptiveResponse,
  buildResponsePlannerInstruction,
  adaptiveResponsePlannerHealthCheck
};

export default {
  ENGINE_VERSION,
  RESPONSE_MODE,
  ORCHESTRATION_MODE,
  RESPONSE_DEPTH,
  RESPONSE_TEMPLATES,
  ORCHESTRATION_TEMPLATES,
  TECHNICAL_TEMPLATE,
  ASK_PROFILE,
  ASK_PROFILE_SECTIONS,
  selectAskProfile,
  normalizeMode,
  normalizeOrchestrationMode,
  getIssueClassification,
  getOrchestrationIntent,
  planAdaptiveResponse,
  buildResponsePlannerInstruction,
  adaptiveResponsePlannerHealthCheck
};
