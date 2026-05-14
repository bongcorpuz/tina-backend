"use strict";

/**
 * adaptive-response-planner.js
 * TINA Adaptive Response Planner
 *
 * Purpose:
 * Builds the response format depending on detected mode:
 * quick, standard, technical, audit, litigation, contract,
 * transaction, or evidence-heavy.
 */

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
  COMPREHENSIVE: "COMPREHENSIVE"
});

function normalizeMode(mode) {
  const value = String(mode || "").toUpperCase();

  if (value.includes("QUICK")) return RESPONSE_MODE.QUICK;
  if (value.includes("AUDIT")) return RESPONSE_MODE.AUDIT;
  if (value.includes("LITIGATION") || value.includes("LEGAL_DEFENSE")) return RESPONSE_MODE.LITIGATION;
  if (value.includes("CONTRACT")) return RESPONSE_MODE.CONTRACT;
  if (value.includes("TRANSACTION")) return RESPONSE_MODE.TRANSACTION;
  if (value.includes("EVIDENCE")) return RESPONSE_MODE.EVIDENCE_HEAVY;
  if (value.includes("TECHNICAL") || value.includes("DOCTRINE")) return RESPONSE_MODE.TECHNICAL;
  if (value.includes("REVIEWER") || value.includes("LEARNING")) return RESPONSE_MODE.REVIEWER;

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

function determineDepth(mode, context = {}) {
  const risk = String(context.riskLevel || "").toUpperCase();
  const complexity = String(context.complexityLevel || "").toUpperCase();

  if (mode === RESPONSE_MODE.QUICK) return RESPONSE_DEPTH.CONCISE;
  if (risk === "CRITICAL" || risk === "HIGH") return RESPONSE_DEPTH.COMPREHENSIVE;
  if (complexity === "HIGH") return RESPONSE_DEPTH.COMPREHENSIVE;

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

function mustIncludeLimitations(context = {}) {
  return Boolean(
    context.limitationStatementRequired ||
    context.mustDiscloseBeforeConclusion ||
    context.requiresVerification ||
    context.conclusionStrength === "PRELIMINARY_CONCLUSION_ONLY" ||
    context.conclusionStrength === "DEFER_CONCLUSION" ||
    ["HIGH", "CRITICAL"].includes(String(context.riskLevel || "").toUpperCase())
  );
}

function buildPreConclusionBlocks(context = {}) {
  const blocks = [];

  if (context.mandatoryDisclosure?.length) {
    blocks.push({
      heading: "PRELIMINARY DISCLOSURES BEFORE CONCLUSION",
      source: "assumption-gap-engine",
      items: context.mandatoryDisclosure
    });
  }

  if (context.knownFacts?.length) {
    blocks.push({
      heading: "KNOWN FACTS",
      source: "fact-pattern-engine",
      items: context.knownFacts
    });
  }

  if (context.unresolvedFacts?.length) {
    blocks.push({
      heading: "UNRESOLVED FACTS",
      source: "fact-pattern-engine",
      items: context.unresolvedFacts
    });
  }

  if (context.documentaryGaps?.length) {
    blocks.push({
      heading: "DOCUMENTARY GAPS",
      source: "contract-interpretation-engine",
      items: context.documentaryGaps
    });
  }

  if (context.evidenceCoverage?.length) {
    blocks.push({
      heading: "EVIDENCE STATUS",
      source: "evidence-evaluation-engine",
      items: context.evidenceCoverage
    });
  }

  return blocks;
}

function buildAuthorityInstruction(mode) {
  if ([RESPONSE_MODE.TECHNICAL, RESPONSE_MODE.LITIGATION].includes(mode)) {
    return [
      "Apply Philippine legal hierarchy.",
      "Use NIRC / Tax Code and Republic Acts before administrative issuances.",
      "Use Revenue Regulations before RMCs/RMOs.",
      "Use jurisprudence for doctrine and legal interpretation.",
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
  const strength = context.conclusionStrength;

  if (strength === "DEFER_CONCLUSION") {
    return {
      allowStrongConclusion: false,
      requiredLanguage:
        "Do not give a definitive conclusion. State what must be verified first."
    };
  }

  if (
    strength === "PRELIMINARY_CONCLUSION_ONLY" ||
    mustIncludeLimitations(context)
  ) {
    return {
      allowStrongConclusion: false,
      requiredLanguage:
        "Use preliminary language: Based on the available facts, the position is preliminary and subject to verification."
    };
  }

  return {
    allowStrongConclusion: true,
    requiredLanguage:
      "A direct conclusion may be given if supported by legal basis and evidence."
  };
}

function planAdaptiveResponse(input = {}) {
  const detectedMode =
    input.primaryMode ||
    input.modeAnalysis?.primaryMode ||
    input.mode ||
    RESPONSE_MODE.STANDARD;

  const mode = normalizeMode(detectedMode);

  const context = {
    ...input,
    ...(input.modeAnalysis || {}),
    ...(input.factPattern || {}),
    ...(input.evidenceEvaluation || {}),
    ...(input.contractInterpretation || {}),
    ...(input.transactionCharacterization || {}),
    ...(input.economicSubstance || {}),
    ...(input.assumptionGap || {})
  };

  const depth = determineDepth(mode, context);
  const template = RESPONSE_TEMPLATES[mode] || RESPONSE_TEMPLATES[RESPONSE_MODE.STANDARD];

  const conclusionRule = buildConclusionRule(context);

  return {
    engine: "TINA_ADAPTIVE_RESPONSE_PLANNER",
    version: "1.0.0",

    responseMode: mode,
    responseDepth: depth,
    responseTemplate: template,

    preConclusionBlocks: buildPreConclusionBlocks(context),
    authorityInstructions: buildAuthorityInstruction(mode),
    modeSpecificRules: buildModeSpecificRules(mode),
    conclusionRule,

    mustIncludeLimitation: mustIncludeLimitations(context),
    limitationStatement:
      mustIncludeLimitations(context)
        ? "Based on the available facts, the position is preliminary and subject to verification."
        : null,

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
    ]
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

module.exports = {
  RESPONSE_MODE,
  RESPONSE_DEPTH,
  RESPONSE_TEMPLATES,
  planAdaptiveResponse,
  buildResponsePlannerInstruction
};
