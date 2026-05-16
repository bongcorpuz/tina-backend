// FILE: adaptive-response-planner.js
"use strict";

/**
 * TINA Enterprise Adaptive Response Planner
 * Version: 5.0.0
 *
 * Purpose:
 * - Select final response mode and section contract
 * - Support context-orchestration-engine.js
 * - Pass compact orchestration metadata downstream
 * - Prevent raw source/debug/full engine output instructions
 */

const ENGINE_VERSION = "5.0.0";

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

const RESPONSE_TEMPLATES = Object.freeze({
  [RESPONSE_MODE.QUICK]: [
    "A. DIRECT ANSWER",
    "B. SHORT BASIS",
    "C. PRACTICAL NOTE"
  ],

  [RESPONSE_MODE.STANDARD]: TECHNICAL_TEMPLATE,
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

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeMode(mode) {
  const value = String(mode || "").toUpperCase();

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
  if (value.includes("COMPLEX") || value.includes("ADVISORY") || value.includes("AUDIT") || value.includes("CONTRACT") || value.includes("TRANSACTION") || value.includes("EVIDENCE") || value.includes("RISK")) return ORCHESTRATION_MODE.COMPLEX_ADVISORY;
  if (value.includes("LEGAL") || value.includes("DOCTRINE") || value.includes("JURISPRUDENCE") || value.includes("LITIGATION")) return ORCHESTRATION_MODE.LEGAL_ANALYSIS;
  if (value.includes("STANDARD") || value.includes("TAX")) return ORCHESTRATION_MODE.STANDARD_TAX;

  return null;
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
    BIR_RULINGS: "BIR_RULING",
    IFRS: "PFRS"
  };

  return aliases[raw] || raw || null;
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
  const dimensions = safeArray(issueClassification.legalDimensions).map((item) => String(item).toUpperCase());

  if (primary === "AUDIT" || primary === "ACCOUNTING") return RESPONSE_MODE.AUDIT;
  if (primary === "CONTRACT") return RESPONSE_MODE.CONTRACT;
  if (["TRANSACTION", "ECONOMIC_SUBSTANCE"].includes(primary)) return RESPONSE_MODE.TRANSACTION;
  if (["ASSESSMENT", "CASE_LAW", "DOCTRINE"].includes(primary)) return RESPONSE_MODE.LITIGATION;
  if (dimensions.includes("EVIDENTIARY") || issueClassification.factSensitivity === "high") return RESPONSE_MODE.EVIDENCE_HEAVY;
  if (["VAT_LIABILITY", "VAT_REFUND", "INCOME_TAX", "WITHHOLDING"].includes(primary)) return RESPONSE_MODE.TECHNICAL;

  return fallbackMode;
}

function determineOrchestrationMode({
  input = {},
  responseMode = RESPONSE_MODE.STANDARD,
  issueClassification = {},
  intent = {}
}) {
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
  const risk = String(context.riskLevel || context.risk_level || context.riskScore?.overallRisk?.level || "").toUpperCase();
  const complexity = String(context.complexityLevel || context.complexity_level || issueClassification.complexityFlag || issueClassification.complexity || "").toUpperCase();

  if (orchestrationMode === ORCHESTRATION_MODE.EMERGENCY_TRIM) return RESPONSE_DEPTH.CONCISE;
  if (orchestrationMode === ORCHESTRATION_MODE.FAST_DEFINITION) return RESPONSE_DEPTH.CONCISE;
  if (orchestrationMode === ORCHESTRATION_MODE.COMPLEX_ADVISORY) return RESPONSE_DEPTH.COMPREHENSIVE;

  if (mode === RESPONSE_MODE.REVIEWER) return RESPONSE_DEPTH.SIMPLE;
  if (mode === RESPONSE_MODE.QUICK) return RESPONSE_DEPTH.CONCISE;
  if (risk === "CRITICAL" || risk === "HIGH") return RESPONSE_DEPTH.COMPREHENSIVE;
  if (complexity === "HIGH" || complexity === "COMPLEX" || complexity === "MULTI_ISSUE") return RESPONSE_DEPTH.COMPREHENSIVE;

  if ([
    RESPONSE_MODE.AUDIT,
    RESPONSE_MODE.LITIGATION,
    RESPONSE_MODE.CONTRACT,
    RESPONSE_MODE.TRANSACTION,
    RESPONSE_MODE.EVIDENCE_HEAVY,
    RESPONSE_MODE.TECHNICAL
  ].includes(mode)) {
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
      ["HIGH", "CRITICAL"].includes(String(context.riskLevel || context.riskScore?.overallRisk?.level || "").toUpperCase())
  );
}

function buildPreConclusionBlocks(context = {}) {
  const blocks = [];

  const addBlock = (heading, source, items) => {
    const normalizedItems = safeArray(items).filter(Boolean).slice(0, 8);
    if (!normalizedItems.length) return;
    blocks.push({ heading, source, items: normalizedItems });
  };

  addBlock("PRELIMINARY DISCLOSURES BEFORE CONCLUSION", "assumption-gap-engine", context.mandatoryDisclosure || context.assumptionGap?.mandatoryDisclosure);
  addBlock("KNOWN FACTS", "fact-pattern-engine", context.knownFacts || context.factPattern?.knownFacts || context.factPattern?.facts);
  addBlock("UNRESOLVED FACTS", "fact-pattern-engine", context.unresolvedFacts || context.factPattern?.unresolvedFacts);
  addBlock("DOCUMENTARY GAPS", "contract-interpretation-engine", context.documentaryGaps || context.contractInterpretation?.documentaryGaps);
  addBlock("EVIDENCE STATUS", "evidence-evaluation-engine", context.evidenceCoverage || context.evidenceEvaluation?.evidenceCoverage);
  addBlock("RISK FLAGS", "risk-scoring-engine", context.riskFlags || context.riskScore?.riskFlags);

  return blocks;
}

function buildAuthorityInstruction(mode, issueClassification = {}) {
  const base = [
    "Apply Philippine legal hierarchy.",
    "Use Constitution, NIRC / Tax Code, Republic Acts, and controlling Supreme Court doctrine before administrative issuances.",
    "Use Revenue Regulations before RMCs, RMOs, RAMOs, and BIR rulings.",
    "Use jurisprudence only when it is directly issue-relevant.",
    "Prefer authorities matching issueClassificationMatch and targetAuthorityMatch."
  ];

  if ([RESPONSE_MODE.TECHNICAL, RESPONSE_MODE.LITIGATION].includes(mode)) {
    base.push("Do not merely say conflict exists; explain exact issue, opposite holding, controlling authority, and why it controls.");
  }

  if (issueClassification.primaryIssue) {
    base.push(`Classified issue controls authority selection: ${issueClassification.primaryIssue}.`);
  }

  if (issueClassification.targetAuthorities?.length) {
    base.push(`Preferred target authorities: ${issueClassification.targetAuthorities.join(", ")}.`);
  }

  return base;
}

function buildModeSpecificRules(mode) {
  const commonIssueRules = [
    "Do not cite provisions, cases, or doctrines that are issue-mismatched.",
    "Do not attach doctrines merely because they mention the same broad tax type.",
    "Do not display issue-mismatched sources.",
    "Do not inject raw retrieval objects, raw source text, debug JSON, or full engine outputs."
  ];

  switch (mode) {
    case RESPONSE_MODE.AUDIT:
      return [
        ...commonIssueRules,
        "Identify possible misstatement risk.",
        "Separate accounting treatment from tax treatment.",
        "State required audit evidence before final audit conclusion.",
        "Do not rely only on management representation."
      ];

    case RESPONSE_MODE.LITIGATION:
      return [
        ...commonIssueRules,
        "Frame the legal issue precisely.",
        "Present BIR or opposing position fairly.",
        "Present taxpayer defense separately.",
        "Explain doctrinal conflict only if complete conflict metadata exists."
      ];

    case RESPONSE_MODE.CONTRACT:
      return [
        ...commonIssueRules,
        "Identify parties, object, consideration, rights, obligations, control, risk, billing, tax clauses, and termination.",
        "Compare contract label against actual conduct.",
        "Flag missing or ambiguous clauses."
      ];

    case RESPONSE_MODE.TRANSACTION:
      return [
        ...commonIssueRules,
        "Analyze legal form versus economic substance.",
        "Trace money flow, service/goods flow, control, risk, margin, and invoicing.",
        "Resolve sale, service, lease, agency, reimbursement, concession, pass-through, financing, equity, or mixed characterization."
      ];

    case RESPONSE_MODE.EVIDENCE_HEAVY:
      return [
        ...commonIssueRules,
        "Separate asserted facts, documented facts, unsupported facts, and contradictory evidence.",
        "Identify missing documents and audit-sensitive items.",
        "Use preliminary conclusion language if evidence is incomplete."
      ];

    case RESPONSE_MODE.TECHNICAL:
      return [
        ...commonIssueRules,
        "Synthesize law, regulations, rulings, and jurisprudence.",
        "Explain hierarchy and doctrinal status.",
        "Avoid unsupported broad legal conclusions."
      ];

    case RESPONSE_MODE.REVIEWER:
      return [
        "Use simple explanation.",
        "Give example when useful.",
        "Avoid excessive legal drafting unless requested.",
        "Do not inject raw source text or debug objects."
      ];

    default:
      return [
        ...commonIssueRules,
        "Answer directly.",
        "Use practical, risk-based explanation.",
        "Do not overstate certainty."
      ];
  }
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
      requiredLanguage: "Use preliminary language: Based on the available facts, the position is preliminary and subject to verification."
    };
  }

  return {
    allowStrongConclusion: true,
    restriction: "DIRECT_CONCLUSION_ALLOWED",
    requiredLanguage: "A direct conclusion may be given if supported by issue-matched legal basis and evidence."
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

function buildContextBudgetPolicy(orchestrationMode) {
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

  const depth = determineDepth(mode, context, issueClassification, orchestrationMode);

  const template =
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

    responseMode: mode,
    orchestrationMode,
    contextMode: orchestrationMode,
    responseDepth: depth,
    responseTemplate: template,

    issueClassification,
    orchestrationIntent: intent,

    preConclusionBlocks: buildPreConclusionBlocks(context),
    authorityInstructions: buildAuthorityInstruction(mode, issueClassification),
    modeSpecificRules: buildModeSpecificRules(mode),
    conclusionRule,

    sourceOrderingPolicy: buildSourceOrderingPolicy(issueClassification),
    conflictDisplayPolicy: buildConflictDisplayPolicy(),
    contextBudgetPolicy,

    mustIncludeLimitation: limitationRequired,
    limitationStatement: limitationRequired
      ? "Based on the available facts, the position is preliminary and subject to verification."
      : null,

    rendererContract,

    formattingRules: [
      "Use clear section headings.",
      "Give the direct answer first unless evidence gaps require preliminary disclosure first.",
      "Do not mix legal conclusion, accounting treatment, and audit risk without labels.",
      "Do not say 'Conflict detected: YES' without complete conflict metadata.",
      "For high-risk answers, include assumptions, missing documents, evidentiary gaps, and limitations.",
      "Cite issue-matched and target-authority-matched sources first.",
      "Do not include raw source dumps, debug JSON, full engine objects, or retrieval payloads."
    ],

    plannerInstruction: [
      `Use ${orchestrationMode} orchestration mode.`,
      `Use ${mode} response format.`,
      `Use ${depth} response depth.`,
      `Classified issue: ${issueClassification.primaryIssue}.`,
      ...template.map((section) => `Required section: ${section}`),
      ...buildAuthorityInstruction(mode, issueClassification),
      ...buildModeSpecificRules(mode),
      conclusionRule.requiredLanguage,
      "Use only compact source summaries prepared by the context orchestration engine."
    ],

    orchestrationMetadata: {
      plannerCompatible: true,
      rendererCompatible: true,
      finalAnswerComplianceCompatible: true,
      contextOrchestrationCompatible: true,
      contextMode: orchestrationMode,
      responseMode: mode,
      conclusionGatingCompatible: true,
      adaptivePipelineCompatible: true,
      issueClassificationCompatible: true,
      issueClassificationMatchAware: true,
      targetAuthorityAware: true,
      sourceVisibilityCompatible: true,
      conflictMetadataGateCompatible: true,
      rawFullDocumentInjectionPrevented: true,
      fullDebugObjectInjectionPrevented: true,
      fullEngineOutputInjectionPrevented: true,
      tinaAdaptiveResponsePlannerVersion: ENGINE_VERSION
    }
  };
}

function buildResponsePlannerInstruction(plan) {
  if (!plan || plan.engine !== "TINA_ADAPTIVE_RESPONSE_PLANNER") {
    throw new Error("Invalid adaptive response plan supplied.");
  }

  return {
    instruction: [
      "Use the adaptive response plan as the final answer format controller.",
      "Follow the required sections unless the user specifically requested a shorter format.",
      "Apply mode-specific rules before drafting.",
      "Respect conclusion restrictions.",
      "Include limitation language where required.",
      "Use issueClassification to control legal basis, jurisprudence, doctrine, source ordering, and conflict analysis.",
      "Do not display issue-mismatched sources.",
      "Do not say Conflict Detected: YES unless conflict metadata is complete.",
      "Do not inject raw source text, raw retrieval payloads, debug JSON, or full engine outputs.",
      `Orchestration mode: ${plan.orchestrationMode}.`,
      `Response mode: ${plan.responseMode}.`,
      `Response depth: ${plan.responseDepth}.`,
      `Classified issue: ${plan.issueClassification?.primaryIssue || "GENERAL_TAX"}.`
    ],
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
    }
  };
}

function adaptiveResponsePlannerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ADAPTIVE_RESPONSE_PLANNER",
    version: ENGINE_VERSION,
    esmCompatible: true,
    commonJsCompatible: false,
    rendererCompatible: true,
    finalAnswerComplianceCompatible: true,
    contextOrchestrationCompatible: true,
    orchestrationModeAware: true,
    supportedOrchestrationModes: Object.values(ORCHESTRATION_MODE),
    conclusionGatingCompatible: true,
    issueClassificationCompatible: true,
    issueClassificationMatchAware: true,
    targetAuthorityAware: true,
    sourceOrderingPolicyReady: true,
    conflictDisplayPolicyReady: true,
    contextBudgetPolicyReady: true,
    rawFullDocumentInjectionPrevented: true,
    fullDebugObjectInjectionPrevented: true,
    fullEngineOutputInjectionPrevented: true
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
  normalizeMode,
  normalizeOrchestrationMode,
  getIssueClassification,
  getOrchestrationIntent,
  planAdaptiveResponse,
  buildResponsePlannerInstruction,
  adaptiveResponsePlannerHealthCheck
};
