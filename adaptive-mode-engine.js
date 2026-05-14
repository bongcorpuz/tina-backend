"use strict";

/**
 * adaptive-mode-engine.js
 * TINA Adaptive Mode Engine
 *
 * Purpose:
 * Detects the proper TINA response mode based on user intent, tone,
 * factual complexity, legal/audit risk, evidentiary completeness,
 * transaction structure, and doctrinal/legal requirements.
 */

const MODES = Object.freeze({
  QUICK: "QUICK_MODE",
  STANDARD_TAX: "STANDARD_TAX_MODE",
  TECHNICAL_TAX: "TECHNICAL_TAX_MODE",
  AUDIT: "AUDIT_MODE",
  LITIGATION: "LITIGATION_LEGAL_DEFENSE_MODE",
  TRANSACTION: "TRANSACTION_CHARACTERIZATION_MODE",
  CONTRACT: "CONTRACT_INTERPRETATION_MODE",
  DOCTRINE: "DOCTRINE_ANALYSIS_MODE",
  EVIDENCE: "EVIDENCE_EVALUATION_MODE",
  FACT_PATTERN: "FACT_PATTERN_ANALYSIS_MODE",
  REVIEWER: "REVIEWER_LEARNING_MODE"
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
    "D. COMPLIANCE / TAX RISK"
  ],
  FULL_TINA: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUPPORTING JURISPRUDENCE",
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "E. HIERARCHY ANALYSIS",
    "F. PRACTICAL APPLICATION"
  ],
  AUDIT: [
    "A. DIRECT ANSWER",
    "B. KNOWN FACTS / ASSUMPTIONS",
    "C. AUDIT ISSUE",
    "D. ACCOUNTING / TAX TREATMENT",
    "E. AUDIT RISK / MISSTATEMENT RISK",
    "F. REQUIRED AUDIT EVIDENCE",
    "G. RECOMMENDED POSITION"
  ],
  TRANSACTION: [
    "A. DIRECT ANSWER",
    "B. LEGAL FORM",
    "C. ECONOMIC SUBSTANCE",
    "D. PRINCIPAL VS AGENT / CONTROL ANALYSIS",
    "E. TAX AND ACCOUNTING CHARACTERIZATION",
    "F. BIR / AUDIT RISK",
    "G. DOCUMENTATION REQUIRED"
  ],
  CONTRACT: [
    "A. DIRECT ANSWER",
    "B. CONTRACT PARTIES AND OBJECT",
    "C. RIGHTS AND OBLIGATIONS",
    "D. CONSIDERATION / BILLING / COLLECTION",
    "E. RISK ALLOCATION AND CONTROL",
    "F. TAX CLAUSES AND LEGAL CONSEQUENCES",
    "G. PRACTICAL RECOMMENDATION"
  ],
  EVIDENCE: [
    "A. DIRECT ANSWER",
    "B. ASSERTED FACTS",
    "C. DOCUMENTED FACTS",
    "D. UNSUPPORTED OR CONTRADICTORY FACTS",
    "E. MISSING DOCUMENTS",
    "F. AUDIT-SENSITIVE ITEMS",
    "G. CONCLUSION SUBJECT TO VERIFICATION"
  ],
  REVIEWER: [
    "A. SIMPLE ANSWER",
    "B. WHY",
    "C. BASIC LEGAL BASIS",
    "D. EXAMPLE",
    "E. EXAM / PRACTICAL TIP"
  ]
});

const KEYWORDS = Object.freeze({
  quick: [
    "what is", "define", "meaning", "why", "when", "rate", "deadline",
    "short answer", "simple", "quick", "explain briefly"
  ],

  standardTax: [
    "vat", "withholding", "ewt", "cwt", "income tax", "mcit", "rcit",
    "nolco", "deductible", "deductibility", "bir", "tax payable",
    "tax expense", "itr", "2550q", "1702", "filing", "return",
    "input vat", "output vat", "percentage tax", "final tax"
  ],

  technicalTax: [
    "nirc", "tax code", "revenue regulation", "rr ", "rmc", "rmo",
    "ramo", "bir ruling", "section", "train", "create", "legal basis",
    "controlling basis", "tax treatment", "tax consequence"
  ],

  audit: [
    "audit", "auditor", "afs", "pfrs", "pas", "pfrs for smes",
    "working paper", "gl", "trial balance", "misstatement", "qualified opinion",
    "audit risk", "materiality", "substantive", "evidence", "confirmation",
    "support", "supporting documents", "financial statements"
  ],

  litigation: [
    "protest", "assessment", "loa", "fan", "fl d", "fl d/fan", "pan",
    "cta", "supreme court", "court", "warrant", "case", "jurisprudence",
    "defense", "legal defense", "legal position", "doctrine", "conflict",
    "taxpayer defense", "bir position", "due process"
  ],

  transaction: [
    "sale vs service", "lease vs concession", "principal vs agent",
    "reimbursement", "pass-through", "pass through", "bundled", "bundle",
    "bundling", "commission", "concession", "lease", "margin",
    "gross or net", "net revenue", "gross revenue", "agent", "principal",
    "substance over form", "economic substance", "flow of money",
    "who should recognize", "booked as sales", "cost of sales"
  ],

  contract: [
    "contract", "agreement", "lease agreement", "concession agreement",
    "service agreement", "supplier agreement", "moa", "loa", "terms",
    "clause", "termination", "consideration", "obligation",
    "rights and obligations", "legal consequence"
  ],

  doctrine: [
    "doctrine", "doctrinal", "conflict", "conflicting", "prevails",
    "hierarchy", "controlling authority", "legal hierarchy",
    "case doctrine", "jurisprudence", "distinguish", "overruled",
    "superseded", "binding", "persuasive"
  ],

  evidence: [
    "invoice", "official receipt", "or", "si", "billing", "contract",
    "bank statement", "board approval", "confirmation", "tax filing",
    "return", "receipt", "document", "documents", "proof",
    "substantiation", "support", "evidence", "schedule"
  ],

  factPattern: [
    "facts", "scenario", "situation", "what happened", "if", "assuming",
    "given", "based on", "reconstruct", "evaluate", "analyze",
    "review and recheck", "risk", "issue", "treatment"
  ],

  reviewer: [
    "cpale", "reviewer", "learning", "explain simply", "simple english",
    "layman's", "layman", "taglish", "example", "quiz", "study",
    "for exam", "memory aid"
  ]
});

function normalizeText(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(text, terms) {
  let score = 0;
  const matched = [];

  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");

    if (text.includes(term) || pattern.test(text)) {
      score += term.length > 8 ? 2 : 1;
      matched.push(term);
    }
  }

  return { score, matched };
}

function detectTone(text) {
  const urgentTerms = [
    "asap", "urgent", "immediately", "deadline", "need now",
    "critical", "risk", "legal case", "qualified opinion"
  ];

  const skepticalTerms = [
    "are you sure", "recheck", "review", "evaluate", "challenge",
    "risk", "conflict", "why", "basis"
  ];

  const simpleTerms = [
    "simple", "brief", "short", "layman's", "taglish", "easy"
  ];

  return {
    urgent: countMatches(text, urgentTerms).score > 0,
    skeptical: countMatches(text, skepticalTerms).score > 0,
    simple: countMatches(text, simpleTerms).score > 0
  };
}

function scoreModes(text) {
  return {
    [MODES.QUICK]: countMatches(text, KEYWORDS.quick),
    [MODES.STANDARD_TAX]: countMatches(text, KEYWORDS.standardTax),
    [MODES.TECHNICAL_TAX]: countMatches(text, KEYWORDS.technicalTax),
    [MODES.AUDIT]: countMatches(text, KEYWORDS.audit),
    [MODES.LITIGATION]: countMatches(text, KEYWORDS.litigation),
    [MODES.TRANSACTION]: countMatches(text, KEYWORDS.transaction),
    [MODES.CONTRACT]: countMatches(text, KEYWORDS.contract),
    [MODES.DOCTRINE]: countMatches(text, KEYWORDS.doctrine),
    [MODES.EVIDENCE]: countMatches(text, KEYWORDS.evidence),
    [MODES.FACT_PATTERN]: countMatches(text, KEYWORDS.factPattern),
    [MODES.REVIEWER]: countMatches(text, KEYWORDS.reviewer)
  };
}

function computeComplexity(text, scores) {
  let complexity = 0;

  if (text.length > 250) complexity += 2;
  if (text.length > 600) complexity += 2;
  if ((text.match(/\?/g) || []).length >= 2) complexity += 1;
  if (/\b(if|assuming|given|however|but|except|unless|provided)\b/i.test(text)) complexity += 2;

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
  if (scores[MODES.DOCTRINE].score > 0) risk += 2;
  if (scores[MODES.EVIDENCE].score > 0) risk += 1;
  if (tone.urgent) risk += 1;
  if (tone.skeptical) risk += 1;

  return Math.min(risk, 10);
}

function selectPrimaryMode(scores, complexity, risk, tone) {
  const weighted = Object.entries(scores).map(([mode, data]) => {
    let score = data.score;

    if (mode === MODES.TRANSACTION) score *= 1.35;
    if (mode === MODES.CONTRACT) score *= 1.3;
    if (mode === MODES.LITIGATION) score *= 1.35;
    if (mode === MODES.AUDIT) score *= 1.25;
    if (mode === MODES.DOCTRINE) score *= 1.25;
    if (mode === MODES.EVIDENCE) score *= 1.15;

    if (risk >= 6 && mode === MODES.QUICK) score -= 3;
    if (complexity >= 5 && mode === MODES.QUICK) score -= 3;
    if (tone.simple && mode === MODES.REVIEWER) score += 2;

    return { mode, weightedScore: score, rawScore: data.score };
  });

  weighted.sort((a, b) => b.weightedScore - a.weightedScore);

  const top = weighted[0];

  if (!top || top.weightedScore <= 0) {
    return MODES.STANDARD_TAX;
  }

  if (
    top.mode === MODES.QUICK &&
    (risk >= 4 || complexity >= 4)
  ) {
    return MODES.STANDARD_TAX;
  }

  return top.mode;
}

function selectSecondaryModes(scores, primaryMode) {
  return Object.entries(scores)
    .filter(([mode, data]) => mode !== primaryMode && data.score > 0)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 4)
    .map(([mode]) => mode);
}

function determineResponseStructure(primaryMode, risk, complexity) {
  if (primaryMode === MODES.QUICK && risk <= 2 && complexity <= 3) {
    return RESPONSE_STRUCTURES.QUICK;
  }

  if (primaryMode === MODES.REVIEWER) {
    return RESPONSE_STRUCTURES.REVIEWER;
  }

  if (primaryMode === MODES.AUDIT) {
    return RESPONSE_STRUCTURES.AUDIT;
  }

  if (primaryMode === MODES.TRANSACTION) {
    return RESPONSE_STRUCTURES.TRANSACTION;
  }

  if (primaryMode === MODES.CONTRACT) {
    return RESPONSE_STRUCTURES.CONTRACT;
  }

  if (primaryMode === MODES.EVIDENCE) {
    return RESPONSE_STRUCTURES.EVIDENCE;
  }

  if (
    primaryMode === MODES.LITIGATION ||
    primaryMode === MODES.DOCTRINE ||
    primaryMode === MODES.TECHNICAL_TAX ||
    risk >= 6
  ) {
    return RESPONSE_STRUCTURES.FULL_TINA;
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
    secondaryModes.includes(MODES.EVIDENCE) ||
    primaryMode === MODES.EVIDENCE
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
    primaryMode === MODES.DOCTRINE ||
    secondaryModes.includes(MODES.DOCTRINE)
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
    primaryMode === MODES.DOCTRINE ||
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
  if (tone.simple || primaryMode === MODES.REVIEWER) return "simple";
  if (primaryMode === MODES.QUICK && risk <= 2 && complexity <= 3) return "concise";
  if (risk >= 7 || complexity >= 7) return "comprehensive";
  if (
    primaryMode === MODES.LITIGATION ||
    primaryMode === MODES.DOCTRINE ||
    primaryMode === MODES.TRANSACTION ||
    primaryMode === MODES.CONTRACT ||
    primaryMode === MODES.AUDIT
  ) {
    return "structured";
  }
  return "standard";
}

function detectPreliminaryConclusionRequired(risk, complexity, primaryMode) {
  return (
    risk >= 4 ||
    complexity >= 5 ||
    primaryMode === MODES.TRANSACTION ||
    primaryMode === MODES.CONTRACT ||
    primaryMode === MODES.EVIDENCE ||
    primaryMode === MODES.AUDIT ||
    primaryMode === MODES.LITIGATION
  );
}

function analyzeAdaptiveMode(userInput, options = {}) {
  const text = normalizeText(userInput);
  const tone = detectTone(text);
  const scores = scoreModes(text);
  const complexity = computeComplexity(text, scores);
  const risk = computeRisk(text, scores, tone);

  const primaryMode = selectPrimaryMode(scores, complexity, risk, tone);
  const secondaryModes = selectSecondaryModes(scores, primaryMode);

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

  return {
    engine: "TINA_ADAPTIVE_MODE_ENGINE",
    version: "1.0.0",
    primaryMode,
    secondaryModes,
    confidence: Number(confidence.toFixed(2)),
    riskLevel: risk >= 7 ? "HIGH" : risk >= 4 ? "MEDIUM" : "LOW",
    complexityLevel: complexity >= 7 ? "HIGH" : complexity >= 4 ? "MEDIUM" : "LOW",
    tone,
    outputDepth,
    responseStructure,
    reasoningRequirements,
    authorityHierarchy,
    preliminaryConclusionRequired,
    limitationStatementRequired: preliminaryConclusionRequired,
    limitationStatement: preliminaryConclusionRequired
      ? "Based on the available facts, the position is preliminary and subject to verification."
      : null,
    matchedSignals: Object.fromEntries(
      Object.entries(scores)
        .filter(([, data]) => data.matched.length > 0)
        .map(([mode, data]) => [mode, data.matched])
    ),
    routingHints: {
      needsDoctrineEngine:
        primaryMode === MODES.DOCTRINE ||
        primaryMode === MODES.LITIGATION ||
        secondaryModes.includes(MODES.DOCTRINE),
      needsJurisprudenceEngine:
        primaryMode === MODES.DOCTRINE ||
        primaryMode === MODES.LITIGATION ||
        primaryMode === MODES.TECHNICAL_TAX,
      needsProvisionCitationEngine:
        primaryMode !== MODES.QUICK,
      needsEvidenceReview:
        primaryMode === MODES.EVIDENCE ||
        primaryMode === MODES.AUDIT ||
        secondaryModes.includes(MODES.EVIDENCE),
      needsContractInterpreter:
        primaryMode === MODES.CONTRACT ||
        secondaryModes.includes(MODES.CONTRACT),
      needsTransactionCharacterization:
        primaryMode === MODES.TRANSACTION ||
        secondaryModes.includes(MODES.TRANSACTION)
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
      `Output depth: ${modeAnalysis.outputDepth}.`,
      `Risk level: ${modeAnalysis.riskLevel}.`,
      `Complexity level: ${modeAnalysis.complexityLevel}.`,
      "Follow the response structure exactly unless the user requests a different format.",
      ...modeAnalysis.responseStructure.map((x) => `Section required: ${x}`),
      ...modeAnalysis.reasoningRequirements.map((x) => `Reasoning requirement: ${x}`),
      "Apply legal hierarchy where relevant.",
      modeAnalysis.limitationStatementRequired
        ? `Include limitation statement: ${modeAnalysis.limitationStatement}`
        : "Do not overstate certainty."
    ].filter(Boolean),
    structure: modeAnalysis.responseStructure,
    routingHints: modeAnalysis.routingHints
  };
}

module.exports = {
  MODES,
  RESPONSE_STRUCTURES,
  analyzeAdaptiveMode,
  buildAdaptiveInstruction
};
