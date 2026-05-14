"use strict";

/**
 * adaptive-mode-engine.js
 * TINA Adaptive Mode Engine
 *
 * Purpose:
 * Detects and normalizes the proper TINA response mode based on:
 * user intent, tone, factual complexity, legal/audit risk,
 * evidentiary completeness, transaction structure, doctrine needs,
 * and legacy hook mode compatibility.
 */

const ENGINE_VERSION = "2.1.0";

const MODES = Object.freeze({
  QUICK: "QUICK_MODE",
  STANDARD_TAX: "STANDARD_TAX_MODE",
  TECHNICAL_TAX: "TECHNICAL_TAX_MODE",
  AUDIT: "AUDIT_MODE",
  LITIGATION: "LITIGATION_LEGAL_DEFENSE_MODE",
  TRANSACTION: "TRANSACTION_CHARACTERIZATION_MODE",
  CONTRACT: "CONTRACT_INTERPRETATION_MODE",
  EVIDENCE: "EVIDENCE_EVALUATION_MODE",
  FACT_PATTERN: "FACT_PATTERN_ANALYSIS_MODE",
  REVIEWER: "REVIEWER_LEARNING_MODE"
});

const LEGACY_MODE_ALIASES = Object.freeze({
  ASK: MODES.STANDARD_TAX,
  TAX_EXPERT: MODES.TECHNICAL_TAX,
  TAX_REVIEWER: MODES.REVIEWER,
  QUIZ_MASTER: MODES.REVIEWER,
  ADAPTIVE_QUIZ: MODES.REVIEWER,
  LEARNING_PROGRESS: MODES.REVIEWER,
  SOURCE_FINDER: MODES.STANDARD_TAX,
  FEEDBACK: MODES.STANDARD_TAX
});

const RESPONSE_MODE_MAP = Object.freeze({
  [MODES.QUICK]: "QUICK",
  [MODES.STANDARD_TAX]: "STANDARD",
  [MODES.TECHNICAL_TAX]: "TECHNICAL",
  [MODES.AUDIT]: "AUDIT",
  [MODES.LITIGATION]: "LITIGATION",
  [MODES.TRANSACTION]: "TRANSACTION",
  [MODES.CONTRACT]: "CONTRACT",
  [MODES.EVIDENCE]: "EVIDENCE_HEAVY",
  [MODES.FACT_PATTERN]: "TECHNICAL",
  [MODES.REVIEWER]: "REVIEWER"
});

const OUTPUT_DEPTH = Object.freeze({
  CONCISE: "CONCISE",
  STANDARD: "STANDARD",
  STRUCTURED: "STRUCTURED",
  COMPREHENSIVE: "COMPREHENSIVE",
  SIMPLE: "SIMPLE"
});

const RESPONSE_STRUCTURES = Object.freeze({
  QUICK: [
    "A. DIRECT ANSWER",
    "B. SHORT BASIS",
    "C. PRACTICAL NOTE"
  ],

  STANDARD: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. PRACTICAL APPLICATION",
    "D. TAX / COMPLIANCE RISK"
  ],

  TECHNICAL: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUPPORTING JURISPRUDENCE",
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "E. HIERARCHY ANALYSIS",
    "F. PRACTICAL APPLICATION"
  ],

  AUDIT: [
    "A. DIRECT ANSWER",
    "B. KNOWN FACTS AND ASSUMPTIONS",
    "C. AUDIT ISSUE",
    "D. ACCOUNTING / TAX TREATMENT",
    "E. AUDIT RISK / MISSTATEMENT RISK",
    "F. REQUIRED AUDIT EVIDENCE",
    "G. RECOMMENDED AUDIT POSITION"
  ],

  LITIGATION: [
    "A. DIRECT ANSWER",
    "B. ISSUE FOR RESOLUTION",
    "C. CONTROLLING LEGAL BASIS",
    "D. SUPPORTING JURISPRUDENCE",
    "E. BIR / OPPOSING POSITION",
    "F. TAXPAYER DEFENSE",
    "G. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "H. CONCLUSION"
  ],

  TRANSACTION: [
    "A. DIRECT ANSWER",
    "B. LEGAL FORM",
    "C. ECONOMIC SUBSTANCE",
    "D. TRANSACTION FLOW",
    "E. PRINCIPAL VS AGENT / CONTROL ANALYSIS",
    "F. TAX AND ACCOUNTING CHARACTERIZATION",
    "G. BIR / AUDIT RISK",
    "H. DOCUMENTATION REQUIRED"
  ],

  CONTRACT: [
    "A. DIRECT ANSWER",
    "B. CONTRACT PARTIES AND OBJECT",
    "C. RIGHTS AND OBLIGATIONS",
    "D. CONSIDERATION / BILLING / COLLECTION",
    "E. CONTROL AND RISK ALLOCATION",
    "F. TAX CLAUSES / LEGAL CONSEQUENCES",
    "G. DOCUMENTARY GAPS",
    "H. RECOMMENDED POSITION"
  ],

  EVIDENCE: [
    "A. DIRECT ANSWER",
    "B. ASSERTED FACTS",
    "C. DOCUMENTED FACTS",
    "D. UNSUPPORTED / CONTRADICTORY FACTS",
    "E. MISSING DOCUMENTS",
    "F. AUDIT-SENSITIVE ITEMS",
    "G. CONCLUSION SUBJECT TO VERIFICATION"
  ],

  REVIEWER: [
    "A. SIMPLE ANSWER",
    "B. WHY",
    "C. BASIC LEGAL BASIS",
    "D. EXAMPLE",
    "E. PRACTICAL / EXAM TIP"
  ]
});

const KEYWORDS = Object.freeze({
  quick: [
    "what is", "define", "meaning", "why", "when", "rate", "deadline",
    "short answer", "simple", "quick", "brief", "explain briefly"
  ],

  standardTax: [
    "vat", "withholding", "ewt", "cwt", "income tax", "mcit", "rcit",
    "nolco", "deductible", "deductibility", "bir", "tax payable",
    "tax expense", "itr", "2550q", "1702", "filing", "return",
    "input vat", "output vat", "percentage tax", "final tax",
    "tax treatment", "tax consequence", "tax compliance"
  ],

  technicalTax: [
    "nirc", "tax code", "revenue regulation", "revenue regulations",
    "rr ", "rmc", "rmo", "ramo", "bir ruling", "section",
    "train", "create", "legal basis", "controlling basis",
    "controlling legal basis", "authority", "hierarchy"
  ],

  audit: [
    "audit", "auditor", "afs", "pfrs", "pas", "pfrs for smes",
    "working paper", "gl", "general ledger", "trial balance",
    "misstatement", "qualified opinion", "audit risk", "materiality",
    "substantive", "confirmation", "supporting documents",
    "financial statements", "disclosure", "presentation"
  ],

  litigation: [
    "protest", "assessment", "loa", "fan", "fld", "fl d", "pan",
    "cta", "supreme court", "court", "warrant", "case", "jurisprudence",
    "defense", "legal defense", "legal position", "doctrine", "conflict",
    "taxpayer defense", "bir position", "due process", "legal consequence",
    "appeal", "litigation", "crime", "liability"
  ],

  transaction: [
    "sale vs service", "lease vs concession", "principal vs agent",
    "reimbursement", "pass-through", "pass through", "bundled", "bundle",
    "bundling", "commission", "concession", "margin", "gross or net",
    "net revenue", "gross revenue", "agent", "principal",
    "substance over form", "economic substance", "flow of money",
    "who should recognize", "booked as sales", "cost of sales",
    "mixed transaction", "financing", "equity", "dfs"
  ],

  contract: [
    "contract", "agreement", "lease agreement", "concession agreement",
    "service agreement", "supplier agreement", "moa", "loa", "terms",
    "clause", "termination", "consideration", "obligation",
    "rights and obligations", "tax clause", "legal effect"
  ],

  doctrine: [
    "doctrine", "doctrinal", "conflict", "conflicting", "prevails",
    "hierarchy", "controlling authority", "legal hierarchy",
    "case doctrine", "jurisprudence", "distinguish", "overruled",
    "superseded", "binding", "persuasive", "controlling doctrine"
  ],

  evidence: [
    "invoice", "official receipt", "or", "si", "billing", "contract",
    "bank statement", "board approval", "confirmation", "tax filing",
    "return", "receipt", "document", "documents", "proof",
    "substantiation", "support", "evidence", "schedule",
    "third-party", "third party", "bank records"
  ],

  factPattern: [
    "facts", "scenario", "situation", "what happened", "if", "assuming",
    "given", "based on", "reconstruct", "evaluate", "analyze",
    "review and recheck", "risk", "issue", "treatment",
    "actual practice", "unresolved", "ambiguous"
  ],

  reviewer: [
    "cpale", "reviewer", "learning", "explain simply", "simple english",
    "layman's", "layman", "taglish", "example", "quiz", "study",
    "for exam", "memory aid", "explain in layman's term"
  ]
});

function normalizeText(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMode(mode = "") {
  const clean = String(mode || "").trim().toUpperCase();

  if (LEGACY_MODE_ALIASES[clean]) return LEGACY_MODE_ALIASES[clean];

  const valid = Object.values(MODES);
  if (valid.includes(clean)) return clean;

  if (clean.includes("AUDIT")) return MODES.AUDIT;
  if (clean.includes("LITIGATION") || clean.includes("LEGAL_DEFENSE")) return MODES.LITIGATION;
  if (clean.includes("TRANSACTION")) return MODES.TRANSACTION;
  if (clean.includes("CONTRACT")) return MODES.CONTRACT;
  if (clean.includes("EVIDENCE")) return MODES.EVIDENCE;
  if (clean.includes("FACT_PATTERN")) return MODES.FACT_PATTERN;
  if (clean.includes("REVIEWER") || clean.includes("LEARNING") || clean.includes("QUIZ")) return MODES.REVIEWER;
  if (clean.includes("TECHNICAL") || clean.includes("DOCTRINE")) return MODES.TECHNICAL_TAX;
  if (clean.includes("QUICK")) return MODES.QUICK;

  return MODES.STANDARD_TAX;
}

function countMatches(text, terms) {
  let score = 0;
  const matched = [];

  for (const term of terms) {
    const normalizedTerm = normalizeText(term);
    const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|\\b)${escaped}(\\b|$)`, "i");

    if (text.includes(normalizedTerm) || pattern.test(text)) {
      score += normalizedTerm.length > 8 ? 2 : 1;
      matched.push(term);
    }
  }

  return { score, matched };
}

function detectTone(text) {
  const urgentTerms = [
    "asap", "urgent", "immediately", "deadline", "need now",
    "critical", "risk", "legal case", "qualified opinion", "must"
  ];

  const skepticalTerms = [
    "are you sure", "recheck", "review", "evaluate", "challenge",
    "risk", "conflict", "why", "basis", "check", "is it correct"
  ];

  const simpleTerms = [
    "simple", "brief", "short", "layman's", "taglish", "easy",
    "plain english", "laymans"
  ];

  return {
    urgent: countMatches(text, urgentTerms).score > 0,
    skeptical: countMatches(text, skepticalTerms).score > 0,
    simple: countMatches(text, simpleTerms).score > 0
  };
}

function scoreModes(text) {
  const doctrineScore = countMatches(text, KEYWORDS.doctrine);

  const technicalTax = countMatches(text, KEYWORDS.technicalTax);
  technicalTax.score += doctrineScore.score;
  technicalTax.matched.push(...doctrineScore.matched);

  return {
    [MODES.QUICK]: countMatches(text, KEYWORDS.quick),
    [MODES.STANDARD_TAX]: countMatches(text, KEYWORDS.standardTax),
    [MODES.TECHNICAL_TAX]: technicalTax,
    [MODES.AUDIT]: countMatches(text, KEYWORDS.audit),
    [MODES.LITIGATION]: countMatches(text, KEYWORDS.litigation),
    [MODES.TRANSACTION]: countMatches(text, KEYWORDS.transaction),
    [MODES.CONTRACT]: countMatches(text, KEYWORDS.contract),
    [MODES.EVIDENCE]: countMatches(text, KEYWORDS.evidence),
    [MODES.FACT_PATTERN]: countMatches(text, KEYWORDS.factPattern),
    [MODES.REVIEWER]: countMatches(text, KEYWORDS.reviewer)
  };
}

function applyHookBias(scores, hookConfig = {}) {
  const hookMode = normalizeMode(hookConfig.mode || hookConfig.hook_code || "");

  if (!scores[hookMode]) return scores;

  const patched = { ...scores };

  patched[hookMode] = {
    ...patched[hookMode],
    score: patched[hookMode].score + 3,
    matched: [...patched[hookMode].matched, `hook:${hookConfig.mode || hookConfig.hook_code}`]
  };

  return patched;
}

function computeComplexity(text, scores) {
  let complexity = 0;

  if (text.length > 250) complexity += 2;
  if (text.length > 600) complexity += 2;
  if ((text.match(/\?/g) || []).length >= 2) complexity += 1;
  if (/\b(if|assuming|given|however|but|except|unless|provided|notwithstanding)\b/i.test(text)) complexity += 2;

  const activeModes = Object.values(scores).filter((x) => x.score > 0).length;
  if (activeModes >= 3) complexity += 2;
  if (activeModes >= 5) complexity += 2;

  return Math.min(complexity, 10);
}

function computeRisk(text, scores, tone) {
  let risk = 0;

  if (scores[MODES.LITIGATION].score > 0) risk += 3;
  if (scores[MODES.AUDIT].score > 0) risk += 2;
  if (scores[MODES.CONTRACT].score > 0) risk += 2;
  if (scores[MODES.TRANSACTION].score > 0) risk += 2;
  if (scores[MODES.TECHNICAL_TAX].score > 0) risk += 1;
  if (scores[MODES.EVIDENCE].score > 0) risk += 1;
  if (scores[MODES.FACT_PATTERN].score > 0) risk += 1;

  if (tone.urgent) risk += 1;
  if (tone.skeptical) risk += 1;

  if (/\b(no agreement|without agreement|unsupported|no invoice|no receipt|assessment|loa|fan|protest|qualified opinion|tax evasion|sham|simulated)\b/i.test(text)) {
    risk += 3;
  }

  return Math.min(risk, 10);
}

function selectPrimaryMode(scores, complexity, risk, tone) {
  const weighted = Object.entries(scores).map(([mode, data]) => {
    let score = data.score;

    if (mode === MODES.TRANSACTION) score *= 1.4;
    if (mode === MODES.CONTRACT) score *= 1.35;
    if (mode === MODES.LITIGATION) score *= 1.4;
    if (mode === MODES.AUDIT) score *= 1.3;
    if (mode === MODES.TECHNICAL_TAX) score *= 1.2;
    if (mode === MODES.EVIDENCE) score *= 1.2;
    if (mode === MODES.FACT_PATTERN) score *= 1.15;

    if (risk >= 6 && mode === MODES.QUICK) score -= 4;
    if (complexity >= 5 && mode === MODES.QUICK) score -= 4;
    if (tone.simple && mode === MODES.REVIEWER) score += 2;

    return { mode, weightedScore: score, rawScore: data.score };
  });

  weighted.sort((a, b) => b.weightedScore - a.weightedScore);

  const top = weighted[0];

  if (!top || top.weightedScore <= 0) return MODES.STANDARD_TAX;

  if (top.mode === MODES.QUICK && (risk >= 4 || complexity >= 4)) {
    return MODES.STANDARD_TAX;
  }

  return top.mode;
}

function selectSecondaryModes(scores, primaryMode) {
  return Object.entries(scores)
    .filter(([mode, data]) => mode !== primaryMode && data.score > 0)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5)
    .map(([mode]) => mode);
}

function determineResponseStructure(primaryMode, risk, complexity) {
  if (primaryMode === MODES.QUICK && risk <= 2 && complexity <= 3) {
    return RESPONSE_STRUCTURES.QUICK;
  }

  if (primaryMode === MODES.REVIEWER) return RESPONSE_STRUCTURES.REVIEWER;
  if (primaryMode === MODES.AUDIT) return RESPONSE_STRUCTURES.AUDIT;
  if (primaryMode === MODES.TRANSACTION) return RESPONSE_STRUCTURES.TRANSACTION;
  if (primaryMode === MODES.CONTRACT) return RESPONSE_STRUCTURES.CONTRACT;
  if (primaryMode === MODES.EVIDENCE) return RESPONSE_STRUCTURES.EVIDENCE;
  if (primaryMode === MODES.LITIGATION) return RESPONSE_STRUCTURES.LITIGATION;

  if (
    primaryMode === MODES.TECHNICAL_TAX ||
    primaryMode === MODES.FACT_PATTERN ||
    risk >= 6
  ) {
    return RESPONSE_STRUCTURES.TECHNICAL;
  }

  return RESPONSE_STRUCTURES.STANDARD;
}

function buildReasoningRequirements(primaryMode, secondaryModes, risk, complexity) {
  const requirements = new Set();

  requirements.add("Identify known facts");
  requirements.add("Identify assumed facts when necessary");
  requirements.add("State limitations if facts are incomplete");

  if (
    risk >= 4 ||
    complexity >= 4 ||
    primaryMode === MODES.EVIDENCE ||
    secondaryModes.includes(MODES.EVIDENCE)
  ) {
    requirements.add("Identify missing facts and evidentiary gaps");
    requirements.add("Separate asserted facts from documented facts");
  }

  if (
    primaryMode === MODES.TRANSACTION ||
    secondaryModes.includes(MODES.TRANSACTION)
  ) {
    requirements.add("Analyze legal form versus economic substance");
    requirements.add("Analyze flow of money, goods, services, control, risks, and margin");
    requirements.add("Determine principal versus agent where applicable");
    requirements.add("Identify possible alternative characterizations");
  }

  if (
    primaryMode === MODES.CONTRACT ||
    secondaryModes.includes(MODES.CONTRACT)
  ) {
    requirements.add("Identify parties, object, consideration, obligations, risk allocation, billing, tax clauses, and actual practice");
  }

  if (
    primaryMode === MODES.LITIGATION ||
    primaryMode === MODES.TECHNICAL_TAX ||
    secondaryModes.includes(MODES.TECHNICAL_TAX)
  ) {
    requirements.add("Apply Philippine legal hierarchy");
    requirements.add("Explain direct, partial, apparent, or no conflict");
    requirements.add("Explain why the controlling authority prevails");
  }

  if (primaryMode === MODES.AUDIT || secondaryModes.includes(MODES.AUDIT)) {
    requirements.add("Identify audit risk and possible misstatement");
    requirements.add("List audit evidence required before final conclusion");
  }

  return Array.from(requirements);
}

function buildAuthorityHierarchyRequired(primaryMode, risk) {
  const doctrineHeavy =
    primaryMode === MODES.LITIGATION ||
    primaryMode === MODES.TECHNICAL_TAX ||
    risk >= 6;

  if (!doctrineHeavy) {
    return [
      "NIRC / Tax Code / Republic Act",
      "Revenue Regulations",
      "RMC / RMO when applicable",
      "Relevant jurisprudence when necessary"
    ];
  }

  return [
    "Constitution",
    "NIRC / Tax Code / Republic Act",
    "Revenue Regulations",
    "Revenue Memorandum Circulars",
    "Revenue Memorandum Orders / RAMO",
    "BIR Rulings",
    "Supreme Court decisions",
    "CTA / Court of Appeals decisions",
    "Secondary materials"
  ];
}

function detectOutputDepth(primaryMode, risk, complexity, tone) {
  if (tone.simple || primaryMode === MODES.REVIEWER) return OUTPUT_DEPTH.SIMPLE;
  if (primaryMode === MODES.QUICK && risk <= 2 && complexity <= 3) return OUTPUT_DEPTH.CONCISE;
  if (risk >= 7 || complexity >= 7) return OUTPUT_DEPTH.COMPREHENSIVE;

  if (
    primaryMode === MODES.LITIGATION ||
    primaryMode === MODES.TECHNICAL_TAX ||
    primaryMode === MODES.TRANSACTION ||
    primaryMode === MODES.CONTRACT ||
    primaryMode === MODES.AUDIT ||
    primaryMode === MODES.EVIDENCE
  ) {
    return OUTPUT_DEPTH.STRUCTURED;
  }

  return OUTPUT_DEPTH.STANDARD;
}

function detectPreliminaryConclusionRequired(risk, complexity, primaryMode) {
  return (
    risk >= 4 ||
    complexity >= 5 ||
    primaryMode === MODES.TRANSACTION ||
    primaryMode === MODES.CONTRACT ||
    primaryMode === MODES.EVIDENCE ||
    primaryMode === MODES.AUDIT ||
    primaryMode === MODES.LITIGATION ||
    primaryMode === MODES.FACT_PATTERN
  );
}

function riskLabel(risk) {
  if (risk >= 8) return "CRITICAL";
  if (risk >= 6) return "HIGH";
  if (risk >= 4) return "MEDIUM";
  return "LOW";
}

function complexityLabel(complexity) {
  if (complexity >= 7) return "HIGH";
  if (complexity >= 4) return "MEDIUM";
  return "LOW";
}

function buildRoutingHints(primaryMode, secondaryModes, risk) {
  return {
    needsDoctrineEngine:
      primaryMode === MODES.TECHNICAL_TAX ||
      primaryMode === MODES.LITIGATION ||
      secondaryModes.includes(MODES.TECHNICAL_TAX),

    needsJurisprudenceEngine:
      primaryMode === MODES.TECHNICAL_TAX ||
      primaryMode === MODES.LITIGATION,

    needsProvisionCitationEngine:
      primaryMode !== MODES.QUICK,

    needsEvidenceReview:
      primaryMode === MODES.EVIDENCE ||
      primaryMode === MODES.AUDIT ||
      secondaryModes.includes(MODES.EVIDENCE) ||
      risk >= 4,

    needsContractInterpreter:
      primaryMode === MODES.CONTRACT ||
      secondaryModes.includes(MODES.CONTRACT),

    needsTransactionCharacterization:
      primaryMode === MODES.TRANSACTION ||
      secondaryModes.includes(MODES.TRANSACTION),

    needsEconomicSubstance:
      primaryMode === MODES.TRANSACTION ||
      secondaryModes.includes(MODES.TRANSACTION),

    needsAssumptionGap:
      risk >= 4 ||
      primaryMode !== MODES.QUICK,

    needsRiskScoring:
      risk >= 4 ||
      [
        MODES.AUDIT,
        MODES.LITIGATION,
        MODES.TRANSACTION,
        MODES.CONTRACT,
        MODES.EVIDENCE,
        MODES.TECHNICAL_TAX
      ].includes(primaryMode),

    needsPositionStrength:
      risk >= 4 ||
      primaryMode === MODES.LITIGATION ||
      primaryMode === MODES.TECHNICAL_TAX,

    needsSupersessionCheck:
      primaryMode === MODES.TECHNICAL_TAX ||
      primaryMode === MODES.LITIGATION ||
      risk >= 4,

    needsAnswerRenderer:
      true
  };
}

function buildPlannerCompatibilityPayload({
  primaryMode,
  secondaryModes,
  risk,
  complexity,
  outputDepth,
  responseStructure,
  preliminaryConclusionRequired
}) {
  return {
    normalizedMode: primaryMode,
    responseMode: RESPONSE_MODE_MAP[primaryMode] || "STANDARD",
    responseDepth: outputDepth,
    responseTemplate: responseStructure,
    secondaryModes,
    riskLevel: riskLabel(risk),
    complexityLevel: complexityLabel(complexity),
    mustIncludeLimitation: preliminaryConclusionRequired,
    conclusionRule: preliminaryConclusionRequired
      ? {
          allowStrongConclusion: false,
          requiredLanguage:
            "Based on the available facts, the position is preliminary and subject to verification."
        }
      : {
          allowStrongConclusion: true,
          requiredLanguage:
            "A direct conclusion may be given if supported by legal basis and evidence."
        }
  };
}

function buildMatchedSignals(scores) {
  return Object.fromEntries(
    Object.entries(scores)
      .filter(([, data]) => data.matched.length > 0)
      .map(([mode, data]) => [mode, data.matched])
  );
}

function analyzeAdaptiveMode(userInput, options = {}) {
  const text = normalizeText(userInput);
  const tone = detectTone(text);

  let scores = scoreModes(text);
  scores = applyHookBias(scores, options.hookConfig || {});

  const complexity = computeComplexity(text, scores);
  const risk = computeRisk(text, scores, tone);

  let primaryMode = selectPrimaryMode(scores, complexity, risk, tone);

  if (options.userBehavior?.recommendedMode) {
    const behaviorMode = normalizeMode(options.userBehavior.recommendedMode);
    if (scores[behaviorMode]?.score > 0 || risk < 4) {
      primaryMode = behaviorMode;
    }
  }

  primaryMode = normalizeMode(primaryMode);

  const secondaryModes = selectSecondaryModes(scores, primaryMode).map(normalizeMode);
  const responseStructure = determineResponseStructure(primaryMode, risk, complexity);

  const reasoningRequirements = buildReasoningRequirements(
    primaryMode,
    secondaryModes,
    risk,
    complexity
  );

  const authorityHierarchy = buildAuthorityHierarchyRequired(primaryMode, risk);
  const outputDepth = detectOutputDepth(primaryMode, risk, complexity, tone);

  const preliminaryConclusionRequired = detectPreliminaryConclusionRequired(
    risk,
    complexity,
    primaryMode
  );

  const confidenceBase = Math.max(...Object.values(scores).map((x) => x.score), 0);
  const confidence = Math.min(
    0.95,
    Math.max(0.45, confidenceBase / 10 + (complexity > 0 ? 0.1 : 0))
  );

  const routingHints = buildRoutingHints(primaryMode, secondaryModes, risk);

  const plannerCompatibility = buildPlannerCompatibilityPayload({
    primaryMode,
    secondaryModes,
    risk,
    complexity,
    outputDepth,
    responseStructure,
    preliminaryConclusionRequired
  });

  return {
    engine: "TINA_ADAPTIVE_MODE_ENGINE",
    version: ENGINE_VERSION,

    primaryMode,
    secondaryModes,
    normalizedMode: primaryMode,

    confidence: Number(confidence.toFixed(2)),

    riskScore: risk,
    riskLevel: riskLabel(risk),

    complexityScore: complexity,
    complexityLevel: complexityLabel(complexity),

    tone,
    outputDepth,

    responseMode: plannerCompatibility.responseMode,
    responseStructure,

    reasoningRequirements,
    authorityHierarchy,

    preliminaryConclusionRequired,
    limitationStatementRequired: preliminaryConclusionRequired,
    limitationStatement: preliminaryConclusionRequired
      ? "Based on the available facts, the position is preliminary and subject to verification."
      : null,

    matchedSignals: buildMatchedSignals(scores),

    routingHints,

    plannerCompatibility,

    orchestrationMetadata: {
      plannerCompatible: true,
      rendererCompatible: true,
      riskCompatible: true,
      evidenceCompatible: true,
      conclusionGatingCompatible: true,
      adaptivePipelineCompatible: true,
      suggestedExecutionOrder: [
        "user-behavior-engine",
        "adaptive-mode-engine",
        "query-intent-engine",
        "fact-pattern-engine",
        "contract-interpretation-engine",
        "transaction-characterization-engine",
        "economic-substance-engine",
        "evidence-evaluation-engine",
        "assumption-gap-engine",
        "risk-scoring-engine",
        "position-strength-engine",
        "adaptive-response-planner",
        "answer-renderer"
      ]
    }
  };
}

function buildAdaptiveInstruction(modeAnalysis) {
  if (!modeAnalysis || !modeAnalysis.primaryMode) {
    throw new Error("Invalid modeAnalysis supplied to buildAdaptiveInstruction().");
  }

  return {
    systemInstruction: [
      `Use ${modeAnalysis.primaryMode}.`,
      `Response mode: ${modeAnalysis.responseMode || "STANDARD"}.`,
      `Output depth: ${modeAnalysis.outputDepth}.`,
      `Risk level: ${modeAnalysis.riskLevel}.`,
      `Complexity level: ${modeAnalysis.complexityLevel}.`,
      "Follow the response structure exactly unless the user requests a different format.",
      ...(modeAnalysis.responseStructure || []).map((x) => `Section required: ${x}`),
      ...(modeAnalysis.reasoningRequirements || []).map((x) => `Reasoning requirement: ${x}`),
      "Apply legal hierarchy where relevant.",
      modeAnalysis.limitationStatementRequired
        ? `Include limitation statement: ${modeAnalysis.limitationStatement}`
        : "Do not overstate certainty."
    ].filter(Boolean),

    structure: modeAnalysis.responseStructure || [],
    routingHints: modeAnalysis.routingHints || {},
    plannerCompatibility: modeAnalysis.plannerCompatibility || null,
    orchestrationMetadata: modeAnalysis.orchestrationMetadata || null
  };
}

module.exports = {
  ENGINE_VERSION,
  MODES,
  LEGACY_MODE_ALIASES,
  RESPONSE_MODE_MAP,
  OUTPUT_DEPTH,
  RESPONSE_STRUCTURES,
  KEYWORDS,
  normalizeMode,
  analyzeAdaptiveMode,
  buildAdaptiveInstruction
};
