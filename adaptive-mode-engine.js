// FILE: adaptive-mode-engine.js
"use strict";

/**
 * TINA Enterprise Adaptive Mode Engine
 * Version: 4.0.0
 */

const ENGINE_VERSION = "4.0.0";

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
  [MODES.STANDARD_TAX]: "TECHNICAL",
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

const TECHNICAL_STRUCTURE = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
]);

const RESPONSE_STRUCTURES = Object.freeze({
  QUICK: [
    "A. DIRECT ANSWER",
    "B. SHORT BASIS",
    "C. PRACTICAL NOTE"
  ],
  STANDARD: TECHNICAL_STRUCTURE,
  TECHNICAL: TECHNICAL_STRUCTURE,
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
    "protest", "assessment", "loa", "fan", "fld", "pan",
    "cta", "supreme court", "court", "warrant", "case", "jurisprudence",
    "defense", "legal defense", "legal position", "doctrine", "conflict",
    "taxpayer defense", "bir position", "due process", "legal consequence",
    "appeal", "litigation", "liability"
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
    "service agreement", "supplier agreement", "moa", "terms",
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

function normalizeText(input = "") {
  return String(input || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeMode(mode = "") {
  const clean = String(mode || "").trim().toUpperCase();

  if (LEGACY_MODE_ALIASES[clean]) return LEGACY_MODE_ALIASES[clean];

  const valid = Object.values(MODES);
  if (valid.includes(clean)) return clean;

  if (clean.includes("AUDIT")) return MODES.AUDIT;
  if (clean.includes("LITIGATION") || clean.includes("LEGAL_DEFENSE") || clean.includes("LEGAL")) return MODES.LITIGATION;
  if (clean.includes("TRANSACTION")) return MODES.TRANSACTION;
  if (clean.includes("CONTRACT")) return MODES.CONTRACT;
  if (clean.includes("EVIDENCE")) return MODES.EVIDENCE;
  if (clean.includes("FACT_PATTERN") || clean.includes("FACT")) return MODES.FACT_PATTERN;
  if (clean.includes("REVIEWER") || clean.includes("LEARNING") || clean.includes("QUIZ")) return MODES.REVIEWER;
  if (clean.includes("TECHNICAL") || clean.includes("DOCTRINE")) return MODES.TECHNICAL_TAX;
  if (clean.includes("QUICK")) return MODES.QUICK;

  return MODES.STANDARD_TAX;
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

function getIssueClassification(options = {}) {
  const source =
    options.issueClassification ||
    options.queryIntent?.issueClassification ||
    options.adaptiveContext?.issueClassification ||
    options.modeAnalysis?.issueClassification ||
    {};

  const primaryIssue =
    normalizeIssue(source.primaryIssue) ||
    normalizeIssue(source.primary_issue) ||
    normalizeIssue(source.issueType) ||
    normalizeIssue(source.issue_type) ||
    null;

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
      null,
    targetAuthorities: unique([
      ...safeArray(source.targetAuthorities).map(normalizeAuthority),
      ...safeArray(source.target_authorities).map(normalizeAuthority)
    ]).filter(Boolean),
    factSensitivity:
      source.factSensitivity ||
      source.fact_sensitivity ||
      null,
    factPatternRequired:
      source.factPatternRequired ||
      source.fact_pattern_required ||
      false,
    transactionCharacterizationRequired:
      source.transactionCharacterizationRequired ||
      source.transaction_characterization_required ||
      false
  };
}

function modeFromIssueClassification(issueClassification = {}) {
  const primary = issueClassification.primaryIssue;
  const dimensions = safeArray(issueClassification.legalDimensions).map((item) =>
    String(item).toUpperCase()
  );

  if (!primary) return null;

  if (primary === "AUDIT" || primary === "ACCOUNTING") return MODES.AUDIT;
  if (primary === "CONTRACT") return MODES.CONTRACT;
  if (["TRANSACTION", "ECONOMIC_SUBSTANCE"].includes(primary)) return MODES.TRANSACTION;
  if (["ASSESSMENT", "CASE_LAW", "DOCTRINE"].includes(primary)) return MODES.LITIGATION;
  if (dimensions.includes("EVIDENTIARY") || issueClassification.factSensitivity === "high") return MODES.EVIDENCE;
  if (["VAT_LIABILITY", "VAT_REFUND", "INCOME_TAX", "WITHHOLDING"].includes(primary)) return MODES.TECHNICAL_TAX;

  return null;
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
  return {
    urgent: countMatches(text, [
      "asap", "urgent", "immediately", "deadline", "need now",
      "critical", "risk", "legal case", "qualified opinion", "must"
    ]).score > 0,

    skeptical: countMatches(text, [
      "are you sure", "recheck", "review", "evaluate", "challenge",
      "risk", "conflict", "why", "basis", "check", "is it correct"
    ]).score > 0,

    simple: countMatches(text, [
      "simple", "brief", "short", "layman's", "taglish", "easy",
      "plain english", "laymans"
    ]).score > 0
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

function applyIssueClassificationBias(scores, issueClassification = {}) {
  const issueMode = modeFromIssueClassification(issueClassification);
  if (!issueMode || !scores[issueMode]) return scores;

  const patched = { ...scores };

  patched[issueMode] = {
    ...patched[issueMode],
    score: patched[issueMode].score + 5,
    matched: [...patched[issueMode].matched, `issue:${issueClassification.primaryIssue}`]
  };

  if (issueClassification.transactionCharacterizationRequired && scores[MODES.TRANSACTION]) {
    patched[MODES.TRANSACTION] = {
      ...patched[MODES.TRANSACTION],
      score: patched[MODES.TRANSACTION].score + 3,
      matched: [...patched[MODES.TRANSACTION].matched, "issue:transactionCharacterizationRequired"]
    };
  }

  if (issueClassification.factPatternRequired && scores[MODES.FACT_PATTERN]) {
    patched[MODES.FACT_PATTERN] = {
      ...patched[MODES.FACT_PATTERN],
      score: patched[MODES.FACT_PATTERN].score + 2,
      matched: [...patched[MODES.FACT_PATTERN].matched, "issue:factPatternRequired"]
    };
  }

  return patched;
}

function computeComplexity(text, scores, issueClassification = {}) {
  let complexity = 0;

  if (text.length > 250) complexity += 2;
  if (text.length > 600) complexity += 2;
  if ((text.match(/\?/g) || []).length >= 2) complexity += 1;
  if (/\b(if|assuming|given|however|but|except|unless|provided|notwithstanding)\b/i.test(text)) complexity += 2;

  const activeModes = Object.values(scores).filter((x) => x.score > 0).length;
  if (activeModes >= 3) complexity += 2;
  if (activeModes >= 5) complexity += 2;

  if (issueClassification.complexityFlag === "complex") complexity += 2;
  if (issueClassification.complexityFlag === "multi-issue") complexity += 3;
  if (issueClassification.factSensitivity === "high") complexity += 2;
  if (issueClassification.factPatternRequired) complexity += 2;

  return Math.min(complexity, 10);
}

function computeRisk(text, scores, tone, issueClassification = {}) {
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

  if (/\b(no agreement|without agreement|unsupported|no invoice|no receipt|assessment|loa|fan|protest|qualified opinion|tax evasion|sham|simulated|unresolved|ambiguous)\b/i.test(text)) {
    risk += 3;
  }

  if (issueClassification.factSensitivity === "high") risk += 2;
  if (issueClassification.transactionCharacterizationRequired) risk += 2;
  if (issueClassification.primaryIssue === "ASSESSMENT") risk += 2;
  if (issueClassification.primaryIssue === "VAT_REFUND") risk += 1;

  return Math.min(risk, 10);
}

function selectPrimaryMode(scores, complexity, risk, tone, issueClassification = {}) {
  const issueMode = modeFromIssueClassification(issueClassification);

  if (issueMode && issueMode !== MODES.QUICK) {
    if (risk >= 4 || complexity >= 4 || issueClassification.primaryIssue !== "GENERAL_TAX") {
      return issueMode;
    }
  }

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
  if (primaryMode === MODES.QUICK && risk <= 2 && complexity <= 3) return RESPONSE_STRUCTURES.QUICK;
  if (primaryMode === MODES.REVIEWER) return RESPONSE_STRUCTURES.REVIEWER;
  if (primaryMode === MODES.AUDIT) return RESPONSE_STRUCTURES.AUDIT;
  if (primaryMode === MODES.TRANSACTION) return RESPONSE_STRUCTURES.TRANSACTION;
  if (primaryMode === MODES.CONTRACT) return RESPONSE_STRUCTURES.CONTRACT;
  if (primaryMode === MODES.EVIDENCE) return RESPONSE_STRUCTURES.EVIDENCE;
  if (primaryMode === MODES.LITIGATION) return RESPONSE_STRUCTURES.LITIGATION;

  return RESPONSE_STRUCTURES.TECHNICAL;
}

function buildReasoningRequirements(primaryMode, secondaryModes, risk, complexity, issueClassification = {}) {
  const requirements = new Set();

  requirements.add("Identify known facts");
  requirements.add("Identify assumed facts when necessary");
  requirements.add("State limitations if facts are incomplete");
  requirements.add("Use issueClassification to control legal basis, jurisprudence, doctrine, and sources");
  requirements.add("Do not cite issue-mismatched authorities");

  if (risk >= 4 || complexity >= 4 || primaryMode === MODES.EVIDENCE || secondaryModes.includes(MODES.EVIDENCE)) {
    requirements.add("Identify missing facts and evidentiary gaps");
    requirements.add("Separate asserted facts from documented facts");
  }

  if (primaryMode === MODES.TRANSACTION || secondaryModes.includes(MODES.TRANSACTION)) {
    requirements.add("Analyze legal form versus economic substance");
    requirements.add("Analyze flow of money, goods, services, control, risks, and margin");
    requirements.add("Determine principal versus agent where applicable");
    requirements.add("Identify possible alternative characterizations");
  }

  if (primaryMode === MODES.CONTRACT || secondaryModes.includes(MODES.CONTRACT)) {
    requirements.add("Identify parties, object, consideration, obligations, risk allocation, billing, tax clauses, and actual practice");
  }

  if (
    primaryMode === MODES.LITIGATION ||
    primaryMode === MODES.TECHNICAL_TAX ||
    secondaryModes.includes(MODES.TECHNICAL_TAX)
  ) {
    requirements.add("Apply Philippine legal hierarchy");
    requirements.add("Explain direct, partial, apparent, or no conflict only after strict conflict gates");
    requirements.add("Explain why the controlling authority prevails");
  }

  if (primaryMode === MODES.AUDIT || secondaryModes.includes(MODES.AUDIT)) {
    requirements.add("Identify audit risk and possible misstatement");
    requirements.add("List audit evidence required before final conclusion");
  }

  if (issueClassification.primaryIssue) {
    requirements.add(`Classified issue controls answer: ${issueClassification.primaryIssue}`);
  }

  return Array.from(requirements);
}

function buildAuthorityHierarchyRequired(primaryMode, risk, issueClassification = {}) {
  const targetAuthorities = safeArray(issueClassification.targetAuthorities);

  const base = [
    "Constitution",
    "NIRC / Tax Code / Republic Act",
    "Supreme Court decisions",
    "Revenue Regulations",
    "Revenue Memorandum Circulars",
    "Revenue Memorandum Orders / RAMO",
    "BIR Rulings",
    "CTA / Court of Appeals decisions",
    "Secondary materials"
  ];

  if (targetAuthorities.length) {
    return unique([...targetAuthorities, ...base]);
  }

  if (primaryMode === MODES.LITIGATION || primaryMode === MODES.TECHNICAL_TAX || risk >= 6) return base;

  return [
    "NIRC / Tax Code / Republic Act",
    "Revenue Regulations",
    "RMC / RMO when applicable",
    "Relevant jurisprudence when necessary"
  ];
}

function detectOutputDepth(primaryMode, risk, complexity, tone) {
  if (tone.simple || primaryMode === MODES.REVIEWER) return OUTPUT_DEPTH.SIMPLE;
  if (primaryMode === MODES.QUICK && risk <= 2 && complexity <= 3) return OUTPUT_DEPTH.CONCISE;
  if (risk >= 7 || complexity >= 7) return OUTPUT_DEPTH.COMPREHENSIVE;

  if ([
    MODES.LITIGATION,
    MODES.TECHNICAL_TAX,
    MODES.TRANSACTION,
    MODES.CONTRACT,
    MODES.AUDIT,
    MODES.EVIDENCE,
    MODES.FACT_PATTERN
  ].includes(primaryMode)) {
    return OUTPUT_DEPTH.STRUCTURED;
  }

  return OUTPUT_DEPTH.STANDARD;
}

function detectPreliminaryConclusionRequired(risk, complexity, primaryMode, issueClassification = {}) {
  return (
    risk >= 4 ||
    complexity >= 5 ||
    issueClassification.factSensitivity === "high" ||
    issueClassification.factPatternRequired ||
    issueClassification.transactionCharacterizationRequired ||
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

function buildRoutingHints(primaryMode, secondaryModes, risk, issueClassification = {}) {
  return {
    needsDoctrineEngine:
      issueClassification.doctrinalAnalysisRequired === true ||
      primaryMode === MODES.TECHNICAL_TAX ||
      primaryMode === MODES.LITIGATION ||
      secondaryModes.includes(MODES.TECHNICAL_TAX),

    needsJurisprudenceEngine:
      issueClassification.doctrinalAnalysisRequired === true ||
      primaryMode === MODES.TECHNICAL_TAX ||
      primaryMode === MODES.LITIGATION,

    needsProvisionCitationEngine: primaryMode !== MODES.QUICK,

    needsEvidenceReview:
      issueClassification.factPatternRequired === true ||
      primaryMode === MODES.EVIDENCE ||
      primaryMode === MODES.AUDIT ||
      secondaryModes.includes(MODES.EVIDENCE) ||
      risk >= 4,

    needsContractInterpreter:
      primaryMode === MODES.CONTRACT ||
      secondaryModes.includes(MODES.CONTRACT),

    needsTransactionCharacterization:
      issueClassification.transactionCharacterizationRequired === true ||
      primaryMode === MODES.TRANSACTION ||
      secondaryModes.includes(MODES.TRANSACTION),

    needsEconomicSubstance:
      primaryMode === MODES.TRANSACTION ||
      secondaryModes.includes(MODES.TRANSACTION) ||
      issueClassification.primaryIssue === "ECONOMIC_SUBSTANCE",

    needsAssumptionGap: risk >= 4 || primaryMode !== MODES.QUICK,

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

    needsAnswerRenderer: true,
    issueClassificationAware: true,
    targetAuthorityAware: true,
    strictConflictGateRequired: true
  };
}

function buildSourceOrderingPolicy(issueClassification = {}) {
  return {
    useIssueClassificationMatch: true,
    useTargetAuthorityMatch: true,
    useControllingPrecedence: true,
    hideIssueMismatchedSources: true,
    primaryIssue: issueClassification.primaryIssue || null,
    subIssues: issueClassification.subIssues || [],
    targetAuthorities: issueClassification.targetAuthorities || []
  };
}

function buildConflictDisplayPolicy() {
  return {
    displayConflictYesOnlyWhenConflictTrue: true,
    requireCompleteConflictMetadata: true,
    requireSameIssueGate: true,
    requireOppositeHoldingGate: true,
    blockVagueConflictLanguage: true
  };
}

function buildPlannerCompatibilityPayload({
  primaryMode,
  secondaryModes,
  risk,
  complexity,
  outputDepth,
  responseStructure,
  preliminaryConclusionRequired,
  issueClassification
}) {
  return {
    normalizedMode: primaryMode,
    responseMode: RESPONSE_MODE_MAP[primaryMode] || "TECHNICAL",
    responseDepth: outputDepth,
    responseTemplate: responseStructure,
    secondaryModes,
    riskLevel: riskLabel(risk),
    complexityLevel: complexityLabel(complexity),
    mustIncludeLimitation: preliminaryConclusionRequired,
    issueClassification,
    sourceOrderingPolicy: buildSourceOrderingPolicy(issueClassification),
    conflictDisplayPolicy: buildConflictDisplayPolicy(),
    conclusionRule: preliminaryConclusionRequired
      ? {
          allowStrongConclusion: false,
          restriction: "PRELIMINARY_CONCLUSION_ONLY",
          requiredLanguage:
            "Based on the available facts, the position is preliminary and subject to verification."
        }
      : {
          allowStrongConclusion: true,
          restriction: "DIRECT_CONCLUSION_ALLOWED",
          requiredLanguage:
            "A direct conclusion may be given if supported by issue-matched legal basis and evidence."
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
  const issueClassification = getIssueClassification(options);

  let scores = scoreModes(text);
  scores = applyHookBias(scores, options.hookConfig || {});
  scores = applyIssueClassificationBias(scores, issueClassification);

  const complexity = computeComplexity(text, scores, issueClassification);
  const risk = computeRisk(text, scores, tone, issueClassification);

  let primaryMode = selectPrimaryMode(scores, complexity, risk, tone, issueClassification);

  if (options.userBehavior?.recommendedMode) {
    const behaviorMode = normalizeMode(options.userBehavior.recommendedMode);
    if (scores[behaviorMode]?.score > 0 || risk < 4) primaryMode = behaviorMode;
  }

  primaryMode = normalizeMode(primaryMode);

  const secondaryModes = selectSecondaryModes(scores, primaryMode).map(normalizeMode);
  const responseStructure = determineResponseStructure(primaryMode, risk, complexity);

  const reasoningRequirements = buildReasoningRequirements(
    primaryMode,
    secondaryModes,
    risk,
    complexity,
    issueClassification
  );

  const authorityHierarchy = buildAuthorityHierarchyRequired(
    primaryMode,
    risk,
    issueClassification
  );

  const outputDepth = detectOutputDepth(primaryMode, risk, complexity, tone);

  const preliminaryConclusionRequired = detectPreliminaryConclusionRequired(
    risk,
    complexity,
    primaryMode,
    issueClassification
  );

  const confidenceBase = Math.max(...Object.values(scores).map((x) => x.score), 0);
  const confidence = Math.min(
    0.95,
    Math.max(0.45, confidenceBase / 10 + (complexity > 0 ? 0.1 : 0))
  );

  const routingHints = buildRoutingHints(primaryMode, secondaryModes, risk, issueClassification);

  const plannerCompatibility = buildPlannerCompatibilityPayload({
    primaryMode,
    secondaryModes,
    risk,
    complexity,
    outputDepth,
    responseStructure,
    preliminaryConclusionRequired,
    issueClassification
  });

  return {
    engine: "TINA_ADAPTIVE_MODE_ENGINE",
    version: ENGINE_VERSION,

    primaryMode,
    secondaryModes,
    normalizedMode: primaryMode,

    issueClassification,

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

    sourceOrderingPolicy: buildSourceOrderingPolicy(issueClassification),
    conflictDisplayPolicy: buildConflictDisplayPolicy(),

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
      issueClassificationCompatible: true,
      issueClassificationMatchAware: true,
      targetAuthorityAware: true,
      sourceOrderingPolicyReady: true,
      conflictDisplayPolicyReady: true,
      suggestedExecutionOrder: [
        "user-behavior-engine",
        "issue-classification-engine",
        "query-intent-engine",
        "adaptive-mode-engine",
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
      `Response mode: ${modeAnalysis.responseMode || "TECHNICAL"}.`,
      `Output depth: ${modeAnalysis.outputDepth}.`,
      `Risk level: ${modeAnalysis.riskLevel}.`,
      `Complexity level: ${modeAnalysis.complexityLevel}.`,
      modeAnalysis.issueClassification?.primaryIssue
        ? `Classified issue: ${modeAnalysis.issueClassification.primaryIssue}.`
        : null,
      "Follow the response structure exactly unless the user requests a different format.",
      ...(modeAnalysis.responseStructure || []).map((x) => `Section required: ${x}`),
      ...(modeAnalysis.reasoningRequirements || []).map((x) => `Reasoning requirement: ${x}`),
      "Apply legal hierarchy where relevant.",
      "Use issueClassificationMatch and targetAuthorityMatch to control source priority.",
      "Do not cite or display issue-mismatched sources.",
      "Do not say Conflict Detected: YES unless complete conflict metadata exists.",
      modeAnalysis.limitationStatementRequired
        ? `Include limitation statement: ${modeAnalysis.limitationStatement}`
        : "Do not overstate certainty."
    ].filter(Boolean),

    structure: modeAnalysis.responseStructure || [],
    routingHints: modeAnalysis.routingHints || {},
    plannerCompatibility: modeAnalysis.plannerCompatibility || null,
    sourceOrderingPolicy: modeAnalysis.sourceOrderingPolicy || null,
    conflictDisplayPolicy: modeAnalysis.conflictDisplayPolicy || null,
    issueClassification: modeAnalysis.issueClassification || null,
    orchestrationMetadata: modeAnalysis.orchestrationMetadata || null
  };
}

function adaptiveModeHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ADAPTIVE_MODE_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    commonJsCompatible: false,
    plannerCompatible: true,
    rendererCompatible: true,
    conclusionGatingCompatible: true,
    issueClassificationCompatible: true,
    issueClassificationMatchAware: true,
    targetAuthorityAware: true,
    sourceOrderingPolicyReady: true,
    conflictDisplayPolicyReady: true
  };
}

export {
  ENGINE_VERSION,
  MODES,
  LEGACY_MODE_ALIASES,
  RESPONSE_MODE_MAP,
  OUTPUT_DEPTH,
  RESPONSE_STRUCTURES,
  KEYWORDS,
  normalizeMode,
  getIssueClassification,
  analyzeAdaptiveMode,
  buildAdaptiveInstruction,
  adaptiveModeHealthCheck
};

export default {
  ENGINE_VERSION,
  MODES,
  LEGACY_MODE_ALIASES,
  RESPONSE_MODE_MAP,
  OUTPUT_DEPTH,
  RESPONSE_STRUCTURES,
  KEYWORDS,
  normalizeMode,
  getIssueClassification,
  analyzeAdaptiveMode,
  buildAdaptiveInstruction,
  adaptiveModeHealthCheck
};
