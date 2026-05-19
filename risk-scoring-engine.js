"use strict";

/**
 * risk-scoring-engine.js
 * TINA Risk Scoring Engine
 *
 * Purpose:
 * Scores BIR risk, audit risk, litigation risk, documentation risk,
 * accounting misstatement risk, and taxpayer defensibility.
 */

const RISK_LEVEL = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
});

const DEFENSIBILITY_LEVEL = Object.freeze({
  STRONG: "STRONG",
  MODERATE: "MODERATE",
  WEAK: "WEAK",
  UNDEFENSIBLE: "UNDEFENSIBLE"
});

const SCORE_BUCKET = Object.freeze({
  BIR_RISK: "BIR_RISK",
  AUDIT_RISK: "AUDIT_RISK",
  LITIGATION_RISK: "LITIGATION_RISK",
  DOCUMENTATION_RISK: "DOCUMENTATION_RISK",
  ACCOUNTING_MISSTATEMENT_RISK: "ACCOUNTING_MISSTATEMENT_RISK",
  TAXPAYER_DEFENSIBILITY: "TAXPAYER_DEFENSIBILITY"
});

function normalizeText(input) {
  if (!input) return "";

  if (typeof input === "string") return input.replace(/\s+/g, " ").trim();

  if (typeof input === "object") return JSON.stringify(input).replace(/\s+/g, " ").trim();

  return String(input).replace(/\s+/g, " ").trim();
}

function lower(input) {
  return normalizeText(input).toLowerCase();
}

function includesAny(text, keywords = []) {
  const source = lower(text);
  return keywords.some((keyword) => source.includes(keyword.toLowerCase()));
}

function countMatches(text, keywords = []) {
  const source = lower(text);
  const matched = [];

  for (const keyword of keywords) {
    if (source.includes(keyword.toLowerCase())) matched.push(keyword);
  }

  return {
    score: matched.length,
    matched
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Number(score) || 0));
}

function levelFromScore(score) {
  if (score >= 80) return RISK_LEVEL.CRITICAL;
  if (score >= 60) return RISK_LEVEL.HIGH;
  if (score >= 35) return RISK_LEVEL.MEDIUM;
  return RISK_LEVEL.LOW;
}

function defensibilityFromScore(score) {
  if (score >= 75) return DEFENSIBILITY_LEVEL.STRONG;
  if (score >= 50) return DEFENSIBILITY_LEVEL.MODERATE;
  if (score >= 25) return DEFENSIBILITY_LEVEL.WEAK;
  return DEFENSIBILITY_LEVEL.UNDEFENSIBLE;
}

function getInputText(input, options = {}) {
  const parts = [];

  if (typeof input === "string") parts.push(input);

  if (input && typeof input === "object") {
    parts.push(JSON.stringify(input));

    const knownPaths = [
      "knownFacts",
      "transactionFlow",
      "documents",
      "documentsRequired",
      "requiredDocuments",
      "requiredEvidence",
      "documentaryGaps",
      "unresolvedFacts",
      "findings",
      "auditSensitiveItems",
      "taxConsequences",
      "accountingConsequences",
      "birRisks",
      "auditRisks",
      "mandatoryDisclosure",
      "evidenceCoverage"
    ];

    for (const path of knownPaths) {
      if (Array.isArray(input[path])) {
        parts.push(JSON.stringify(input[path]));
      }
    }

    [
      "primaryCharacterization",
      "riskLevel",
      "evidenceStrength",
      "result",
      "preliminaryConclusion",
      "preliminaryInterpretation",
      "limitationStatement",
      "conclusionStrength"
    ].forEach((key) => {
      if (input[key]) parts.push(String(input[key]));
    });
  }

  if (options.text) parts.push(options.text);

  return normalizeText(parts.join(" "));
}

const SIGNALS = Object.freeze({
  birRisk: [
    "bir", "vat", "output vat", "input vat", "withholding", "ewt", "cwt",
    "income tax", "mcit", "rcit", "nolco", "tax return", "assessment",
    "loa", "pan", "fan", "underdeclared", "unrecorded sales",
    "non-deductible", "disallowance", "tax deficiency", "tax mapping"
  ],

  auditRisk: [
    "audit", "afs", "financial statements", "pfrs", "pas", "working paper",
    "misstatement", "material", "qualified opinion", "management representation",
    "unsupported", "incomplete evidence", "confirmation", "cut-off",
    "classification", "presentation", "disclosure"
  ],

  litigationRisk: [
    "protest", "cta", "court", "supreme court", "jurisprudence", "case",
    "doctrine", "legal defense", "taxpayer defense", "due process",
    "conflict", "controlling authority", "assessment", "warrant",
    "legal consequence", "liability"
  ],

  documentationRisk: [
    "no agreement", "without agreement", "verbal", "missing", "not provided",
    "unsupported", "no invoice", "no receipt", "no or", "no si",
    "no contract", "no board approval", "no confirmation", "no bank record",
    "incomplete", "undocumented", "not documented"
  ],

  accountingMisstatementRisk: [
    "booked as", "recorded as", "classified as", "gross revenue",
    "net revenue", "principal", "agent", "reimbursement", "pass-through",
    "lease", "rou", "lease liability", "cost of sales", "opex",
    "deferred tax", "dta", "dtl", "prior period", "caje", "paje"
  ],

  defensibilityPositive: [
    "contract", "agreement", "invoice", "official receipt", "sales invoice",
    "general ledger", "gl", "tax return", "board approval", "confirmation",
    "bank statement", "third-party", "legal basis", "nirc", "revenue regulation",
    "jurisprudence", "documented", "supported", "business purpose",
    "economic substance"
  ],

  defensibilityNegative: [
    "unsupported", "missing", "no agreement", "without agreement", "verbal",
    "contradictory", "inconsistent", "no invoice", "no receipt",
    "sham", "simulated", "false invoice", "underdeclared", "off books",
    "tax evasion", "avoid tax", "no business purpose"
  ]
});

function scoreBIRRisk(text) {
  let score = 0;
  const signals = [];

  const bir = countMatches(text, SIGNALS.birRisk);
  score += bir.score * 8;
  signals.push(...bir.matched);

  if (includesAny(text, ["vat", "output vat", "input vat"])) score += 10;
  if (includesAny(text, ["withholding", "ewt", "cwt"])) score += 8;
  if (includesAny(text, ["assessment", "loa", "pan", "fan"])) score += 15;
  if (includesAny(text, ["underdeclared", "unrecorded sales", "off books"])) score += 20;
  if (includesAny(text, ["reimbursement", "pass-through", "gross revenue", "net revenue"])) score += 10;
  if (includesAny(text, ["no invoice", "no receipt", "unsupported", "missing"])) score += 12;

  return buildScore(SCORE_BUCKET.BIR_RISK, score, signals);
}

function scoreAuditRisk(text) {
  let score = 0;
  const signals = [];

  const audit = countMatches(text, SIGNALS.auditRisk);
  score += audit.score * 7;
  signals.push(...audit.matched);

  if (includesAny(text, ["material", "misstatement", "qualified opinion"])) score += 15;
  if (includesAny(text, ["management representation", "unsupported"])) score += 10;
  if (includesAny(text, ["gross revenue", "net revenue", "principal", "agent"])) score += 10;
  if (includesAny(text, ["missing", "no confirmation", "no support"])) score += 12;
  if (includesAny(text, ["afs", "financial statements", "pfrs"])) score += 8;

  return buildScore(SCORE_BUCKET.AUDIT_RISK, score, signals);
}

function scoreLitigationRisk(text) {
  let score = 0;
  const signals = [];

  const litigation = countMatches(text, SIGNALS.litigationRisk);
  score += litigation.score * 7;
  signals.push(...litigation.matched);

  if (includesAny(text, ["assessment", "loa", "pan", "fan", "protest"])) score += 15;
  if (includesAny(text, ["cta", "court", "supreme court"])) score += 15;
  if (includesAny(text, ["conflict", "doctrine", "controlling authority"])) score += 10;
  if (includesAny(text, ["tax evasion", "fraud", "false invoice"])) score += 20;

  return buildScore(SCORE_BUCKET.LITIGATION_RISK, score, signals);
}

function scoreDocumentationRisk(text) {
  let score = 0;
  const signals = [];

  const doc = countMatches(text, SIGNALS.documentationRisk);
  score += doc.score * 10;
  signals.push(...doc.matched);

  if (includesAny(text, ["no agreement", "without agreement", "verbal"])) score += 20;
  if (includesAny(text, ["no invoice", "no receipt", "no or", "no si"])) score += 18;
  if (includesAny(text, ["no board approval", "no confirmation", "no bank record"])) score += 12;
  if (includesAny(text, ["missing", "not provided", "unsupported"])) score += 12;

  return buildScore(SCORE_BUCKET.DOCUMENTATION_RISK, score, signals);
}

function scoreAccountingMisstatementRisk(text) {
  let score = 0;
  const signals = [];

  const accounting = countMatches(text, SIGNALS.accountingMisstatementRisk);
  score += accounting.score * 8;
  signals.push(...accounting.matched);

  if (includesAny(text, ["gross revenue", "net revenue", "principal", "agent"])) score += 15;
  if (includesAny(text, ["booked as", "recorded as", "classified as"])) score += 12;
  if (includesAny(text, ["reimbursement", "pass-through", "concession", "lease"])) score += 10;
  if (includesAny(text, ["deferred tax", "dta", "dtl", "mcit", "nolco"])) score += 8;
  if (includesAny(text, ["prior period", "caje", "paje"])) score += 10;

  return buildScore(SCORE_BUCKET.ACCOUNTING_MISSTATEMENT_RISK, score, signals);
}

function scoreTaxpayerDefensibility(text) {
  const positive = countMatches(text, SIGNALS.defensibilityPositive);
  const negative = countMatches(text, SIGNALS.defensibilityNegative);

  let score = 50;

  score += positive.score * 6;
  score -= negative.score * 10;

  if (includesAny(text, ["legal basis", "nirc", "revenue regulation", "jurisprudence"])) score += 12;
  if (includesAny(text, ["contract", "invoice", "official receipt", "gl", "tax return"])) score += 12;
  if (includesAny(text, ["business purpose", "economic substance", "documented"])) score += 10;

  if (includesAny(text, ["no agreement", "without agreement", "unsupported"])) score -= 18;
  if (includesAny(text, ["sham", "simulated", "false invoice", "tax evasion"])) score -= 35;
  if (includesAny(text, ["contradictory", "inconsistent"])) score -= 15;

  const finalScore = clampScore(score);

  return {
    bucket: SCORE_BUCKET.TAXPAYER_DEFENSIBILITY,
    score: finalScore,
    level: defensibilityFromScore(finalScore),
    positiveSignals: positive.matched,
    negativeSignals: negative.matched,
    interpretation:
      finalScore >= 75
        ? "Taxpayer position appears strongly defensible, subject to source verification."
        : finalScore >= 50
          ? "Taxpayer position is moderately defensible but requires stronger documentation or legal support."
          : finalScore >= 25
            ? "Taxpayer position is weak and should not be finalized without additional support."
            : "Taxpayer position is currently not defensible based on available signals."
  };
}

function buildScore(bucket, rawScore, signals) {
  const score = clampScore(rawScore);

  return {
    bucket,
    score,
    level: levelFromScore(score),
    signals: [...new Set(signals)],
    interpretation: interpretRisk(bucket, score)
  };
}

function interpretRisk(bucket, score) {
  const level = levelFromScore(score);

  if (bucket === SCORE_BUCKET.BIR_RISK) {
    if (level === RISK_LEVEL.CRITICAL) return "Critical BIR exposure. Strong legal and documentary support is required before taking a position.";
    if (level === RISK_LEVEL.HIGH) return "High BIR challenge risk. Position should be supported by law, filings, invoices, and reconciliation.";
    if (level === RISK_LEVEL.MEDIUM) return "Moderate BIR risk. Verify tax treatment and supporting documents.";
    return "Low apparent BIR risk based on available signals.";
  }

  if (bucket === SCORE_BUCKET.AUDIT_RISK) {
    if (level === RISK_LEVEL.CRITICAL) return "Critical audit risk. Do not conclude without sufficient appropriate audit evidence.";
    if (level === RISK_LEVEL.HIGH) return "High audit risk. Misstatement, classification, or disclosure risk may exist.";
    if (level === RISK_LEVEL.MEDIUM) return "Moderate audit risk. Additional audit evidence is advisable.";
    return "Low apparent audit risk based on available signals.";
  }

  if (bucket === SCORE_BUCKET.LITIGATION_RISK) {
    if (level === RISK_LEVEL.CRITICAL) return "Critical litigation exposure. Requires doctrine, hierarchy, and legal defense analysis.";
    if (level === RISK_LEVEL.HIGH) return "High litigation risk. Analyze BIR position, taxpayer defense, and controlling authorities.";
    if (level === RISK_LEVEL.MEDIUM) return "Moderate litigation risk. Legal basis should be clearly framed.";
    return "Low apparent litigation risk based on available signals.";
  }

  if (bucket === SCORE_BUCKET.DOCUMENTATION_RISK) {
    if (level === RISK_LEVEL.CRITICAL) return "Critical documentation gap. Strong conclusion should be deferred.";
    if (level === RISK_LEVEL.HIGH) return "High documentation risk. Missing documents may weaken tax/audit position.";
    if (level === RISK_LEVEL.MEDIUM) return "Moderate documentation risk. Additional support should be obtained.";
    return "Low apparent documentation risk.";
  }

  if (bucket === SCORE_BUCKET.ACCOUNTING_MISSTATEMENT_RISK) {
    if (level === RISK_LEVEL.CRITICAL) return "Critical accounting misstatement risk. Financial statement treatment requires detailed review.";
    if (level === RISK_LEVEL.HIGH) return "High accounting misstatement risk. Classification, recognition, or disclosure may be wrong.";
    if (level === RISK_LEVEL.MEDIUM) return "Moderate accounting risk. Review presentation and recognition.";
    return "Low apparent accounting misstatement risk.";
  }

  return "Risk interpretation unavailable.";
}

function computeOverallRisk(scores) {
  const riskScores = [
    scores.birRisk.score,
    scores.auditRisk.score,
    scores.litigationRisk.score,
    scores.documentationRisk.score,
    scores.accountingMisstatementRisk.score
  ];

  const weighted =
    scores.birRisk.score * 0.25 +
    scores.auditRisk.score * 0.20 +
    scores.litigationRisk.score * 0.20 +
    scores.documentationRisk.score * 0.20 +
    scores.accountingMisstatementRisk.score * 0.15;

  const maxScore = Math.max(...riskScores);
  const overallScore = clampScore(Math.max(weighted, maxScore >= 85 ? maxScore : weighted));

  return {
    score: overallScore,
    level: levelFromScore(overallScore),
    interpretation:
      overallScore >= 80
        ? "Overall risk is critical. TINA should avoid a definitive conclusion unless controlling authority and evidence are strong."
        : overallScore >= 60
          ? "Overall risk is high. TINA should use structured analysis with assumptions, gaps, and limitations."
          : overallScore >= 35
            ? "Overall risk is medium. TINA should provide a preliminary conclusion with verification requirements."
            : "Overall risk is low. TINA may provide a direct conclusion if legal basis is adequate."
  };
}

function buildRecommendedResponseControls(overallRisk, defensibility) {
  const controls = [];

  if ([RISK_LEVEL.HIGH, RISK_LEVEL.CRITICAL].includes(overallRisk.level)) {
    controls.push("Use structured response format.");
    controls.push("Disclose assumptions, missing documents, evidentiary gaps, ambiguities, and limitations.");
    controls.push("Do not give a strong conclusion without legal basis and documentary support.");
  }

  if ([DEFENSIBILITY_LEVEL.WEAK, DEFENSIBILITY_LEVEL.UNDEFENSIBLE].includes(defensibility.level)) {
    controls.push("Frame the answer as preliminary or not defensible based on available facts.");
    controls.push("Identify documents and legal authorities required to improve taxpayer position.");
  }

  if (overallRisk.level === RISK_LEVEL.CRITICAL) {
    controls.push("Escalate to litigation/legal-defense mode if assessment, fraud, sham, or evasion indicators are present.");
  }

  if (!controls.length) {
    controls.push("Direct answer is allowed, subject to normal citation and verification rules.");
  }

  return controls;
}

function scoreRisk(input, options = {}) {
  const text = getInputText(input, options);

  const birRisk = scoreBIRRisk(text);
  const auditRisk = scoreAuditRisk(text);
  const litigationRisk = scoreLitigationRisk(text);
  const documentationRisk = scoreDocumentationRisk(text);
  const accountingMisstatementRisk = scoreAccountingMisstatementRisk(text);
  const taxpayerDefensibility = scoreTaxpayerDefensibility(text);

  const scores = {
    birRisk,
    auditRisk,
    litigationRisk,
    documentationRisk,
    accountingMisstatementRisk,
    taxpayerDefensibility
  };

  const overallRisk = computeOverallRisk(scores);

  return {
    engine: "TINA_RISK_SCORING_ENGINE",
    version: "1.0.0",

    scores,
    overallRisk,
    taxpayerDefensibility,

    recommendedResponseControls: buildRecommendedResponseControls(
      overallRisk,
      taxpayerDefensibility
    ),

    conclusionRestriction:
      overallRisk.level === RISK_LEVEL.CRITICAL ||
      taxpayerDefensibility.level === DEFENSIBILITY_LEVEL.UNDEFENSIBLE
        ? "DEFER_STRONG_CONCLUSION"
        : overallRisk.level === RISK_LEVEL.HIGH ||
            taxpayerDefensibility.level === DEFENSIBILITY_LEVEL.WEAK
          ? "PRELIMINARY_CONCLUSION_ONLY"
          : "DIRECT_CONCLUSION_ALLOWED",

    limitationStatement:
      "Based on the available facts, the risk score is preliminary and subject to verification of legal basis and supporting evidence."
  };
}

function buildRiskScoringInstruction(result) {
  if (!result || result.engine !== "TINA_RISK_SCORING_ENGINE") {
    throw new Error("Invalid risk scoring result supplied.");
  }

  return {
    instruction: [
      "Use the risk scoring result before drafting the final response.",
      "If BIR, audit, litigation, documentation, or misstatement risk is high, use structured analysis.",
      "If taxpayer defensibility is weak or undefensible, do not overstate the taxpayer position.",
      "If conclusionRestriction is DEFER_STRONG_CONCLUSION, state what must be verified first.",
      `Overall risk level: ${result.overallRisk.level}.`,
      `Taxpayer defensibility: ${result.taxpayerDefensibility.level}.`,
      `Conclusion restriction: ${result.conclusionRestriction}.`,
      `Required limitation: ${result.limitationStatement}`
    ],
    result
  };
}

export {
  RISK_LEVEL,
  DEFENSIBILITY_LEVEL,
  SCORE_BUCKET,
  scoreRisk,
  buildRiskScoringInstruction
};
