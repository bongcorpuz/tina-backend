// FILE: adaptive-response-planner.js
"use strict";

/**
 * TINA Enterprise Adaptive Response Planner
 */

const ENGINE_VERSION = "3.0.0";

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

const RESPONSE_DEPTH = Object.freeze({
  CONCISE: "CONCISE",
  STANDARD: "STANDARD",
  STRUCTURED: "STRUCTURED",
  COMPREHENSIVE: "COMPREHENSIVE",
  SIMPLE: "SIMPLE"
});

function normalizeMode(mode) {
  const value = String(mode || "").toUpperCase();

  if (value.includes("QUICK")) return RESPONSE_MODE.QUICK;
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

  [RESPONSE_MODE.TECHNICAL]: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUPPORTING JURISPRUDENCE",
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "E. HIERARCHY ANALYSIS",
    "F. PRACTICAL APPLICATION"
  ],

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

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function determineDepth(mode, context = {}) {
  const risk = String(context.riskLevel || context.risk_level || "").toUpperCase();
  const complexity = String(context.complexityLevel || context.complexity_level || "").toUpperCase();

  if (mode === RESPONSE_MODE.REVIEWER) return RESPONSE_DEPTH.SIMPLE;
  if (mode === RESPONSE_MODE.QUICK) return RESPONSE_DEPTH.CONCISE;
  if (risk === "CRITICAL" || risk === "HIGH") return RESPONSE_DEPTH.COMPREHENSIVE;
  if (complexity === "HIGH") return RESPONSE_DEPTH.COMPREHENSIVE;

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

function mustIncludeLimitations(context = {}) {
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
      conclusionStrength === "PRELIMINARY_CONCLUSION_ONLY" ||
      conclusionStrength === "DEFER_CONCLUSION" ||
      conclusionStrength === "USE_QUALIFIED_CONCLUSION" ||
      ["HIGH", "CRITICAL"].includes(String(context.riskLevel || "").toUpperCase())
  );
}

function buildPreConclusionBlocks(context = {}) {
  const blocks = [];

  const addBlock = (heading, source, items) => {
    const normalizedItems = normalizeArray(items).filter(Boolean);
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

function buildAuthorityInstruction(mode) {
  if ([RESPONSE_MODE.TECHNICAL, RESPONSE_MODE.LITIGATION].includes(mode)) {
    return [
      "Apply Philippine legal hierarchy.",
      "Use Constitution, NIRC / Tax Code and Republic Acts before administrative issuances.",
      "Use Revenue Regulations before RMCs/RMOs/RAMOs.",
      "Use jurisprudence only when it is issue-relevant.",
      "Do not merely say conflict exists; explain exact conflict, controlling authority, and why it controls."
    ];
  }

  if ([RESPONSE_MODE.STANDARD, RESPONSE_MODE.AUDIT, RESPONSE_MODE.TRANSACTION, RESPONSE_MODE.CONTRACT].includes(mode)) {
    return [
      "State controlling legal basis where available.",
      "Distinguish tax rule, accounting treatment, and practical risk.",
      "Use jurisprudence only when necessary to support doctrine or legal conflict."
    ];
  }

  return [
    "Use only the necessary legal basis for the level of answer required."
  ];
}

function buildModeSpecificRules(mode) {
  switch (mode) {
    case RESPONSE_MODE.AUDIT:
      return [
        "Identify possible misstatement risk.",
        "Separate accounting treatment from tax treatment.",
        "State required audit evidence before final audit conclusion.",
        "Do not rely only on management representation."
      ];

    case RESPONSE_MODE.LITIGATION:
      return [
        "Frame the legal issue precisely.",
        "Present BIR or opposing position fairly.",
        "Present taxpayer defense separately.",
        "Explain doctrinal conflict, if any."
      ];

    case RESPONSE_MODE.CONTRACT:
      return [
        "Identify parties, object, consideration, rights, obligations, control, risk, billing, tax clauses, and termination.",
        "Compare contract label against actual conduct.",
        "Flag missing or ambiguous clauses."
      ];

    case RESPONSE_MODE.TRANSACTION:
      return [
        "Analyze legal form versus economic substance.",
        "Trace money flow, service/goods flow, control, risk, margin, and invoicing.",
        "Resolve sale, service, lease, agency, reimbursement, concession, pass-through, financing, equity, or mixed characterization."
      ];

    case RESPONSE_MODE.EVIDENCE_HEAVY:
      return [
        "Separate asserted facts, documented facts, unsupported facts, and contradictory evidence.",
        "Identify missing documents and audit-sensitive items.",
        "Use preliminary conclusion language if evidence is incomplete."
      ];

    case RESPONSE_MODE.TECHNICAL:
      return [
        "Synthesize law, regulations, rulings, and jurisprudence.",
        "Explain hierarchy and doctrinal status.",
        "Avoid unsupported broad legal conclusions."
      ];

    case RESPONSE_MODE.REVIEWER:
      return [
        "Use simple explanation.",
        "Give example when useful.",
        "Avoid excessive legal drafting unless requested."
      ];

    default:
      return [
        "Answer directly.",
        "Use practical, risk-based explanation.",
        "Do not overstate certainty."
      ];
  }
}

function buildConclusionRule(context = {}) {
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
      requiredLanguage:
        "Do not give a definitive conclusion. State what must be verified first."
    };
  }

  if (
    strength === "PRELIMINARY_CONCLUSION_ONLY" ||
    strength === "USE_QUALIFIED_CONCLUSION" ||
    mustIncludeLimitations(context)
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
      "A direct conclusion may be given if supported by legal basis and evidence."
  };
}

function buildRendererContract({
  mode,
  depth,
  template,
  conclusionRule,
  limitationRequired
}) {
  return {
    responseMode: mode,
    responseDepth: depth,
    sections: template,
    conclusionRule,
    mustIncludeLimitation: limitationRequired,
    preserveHeadings: true,
    requireStructuredOutput: true,
    sanitizeVagueConflictFlags: true
  };
}

function planAdaptiveResponse(input = {}) {
  const detectedMode =
    input.primaryMode ||
    input.normalizedMode ||
    input.modeAnalysis?.primaryMode ||
    input.modeAnalysis?.normalizedMode ||
    input.modeAnalysis?.responseMode ||
    input.mode ||
    RESPONSE_MODE.STANDARD;

  const mode = normalizeMode(detectedMode);

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
    ...safeObject(input.positionStrength)
  };

  const depth = determineDepth(mode, context);
  const template = RESPONSE_TEMPLATES[mode] || RESPONSE_TEMPLATES[RESPONSE_MODE.STANDARD];
  const conclusionRule = buildConclusionRule(context);
  const limitationRequired = mustIncludeLimitations(context);

  const rendererContract = buildRendererContract({
    mode,
    depth,
    template,
    conclusionRule,
    limitationRequired
  });

  return {
    engine: "TINA_ADAPTIVE_RESPONSE_PLANNER",
    version: ENGINE_VERSION,

    responseMode: mode,
    responseDepth: depth,
    responseTemplate: template,

    preConclusionBlocks: buildPreConclusionBlocks(context),
    authorityInstructions: buildAuthorityInstruction(mode),
    modeSpecificRules: buildModeSpecificRules(mode),
    conclusionRule,

    mustIncludeLimitation: limitationRequired,
    limitationStatement: limitationRequired
      ? "Based on the available facts, the position is preliminary and subject to verification."
      : null,

    rendererContract,

    formattingRules: [
      "Use clear section headings.",
      "Give the direct answer first unless evidence gaps require preliminary disclosure first.",
      "Do not mix legal conclusion, accounting treatment, and audit risk without labels.",
      "Do not say 'Conflict detected: YES' without explaining the exact conflict and controlling authority.",
      "For high-risk answers, include assumptions, missing documents, evidentiary gaps, and limitations."
    ],

    plannerInstruction: [
      `Use ${mode} response format.`,
      `Use ${depth} response depth.`,
      ...template.map((section) => `Required section: ${section}`),
      ...buildAuthorityInstruction(mode),
      ...buildModeSpecificRules(mode),
      conclusionRule.requiredLanguage
    ],

    orchestrationMetadata: {
      plannerCompatible: true,
      rendererCompatible: true,
      conclusionGatingCompatible: true,
      adaptivePipelineCompatible: true,
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
      `Response mode: ${plan.responseMode}.`,
      `Response depth: ${plan.responseDepth}.`
    ],
    plan
  };
}

function adaptiveResponsePlannerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ADAPTIVE_RESPONSE_PLANNER",
    version: ENGINE_VERSION,
    commonJsCompatible: true,
    rendererCompatible: true,
    conclusionGatingCompatible: true
  };
}

module.exports = {
  ENGINE_VERSION,
  RESPONSE_MODE,
  RESPONSE_DEPTH,
  RESPONSE_TEMPLATES,

  normalizeMode,
  planAdaptiveResponse,
  buildResponsePlannerInstruction,

  adaptiveResponsePlannerHealthCheck
};
