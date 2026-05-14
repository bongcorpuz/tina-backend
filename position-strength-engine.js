"use strict";

/**
 * position-strength-engine.js
 * TINA Position Strength Engine
 *
 * Purpose:
 * Classifies the conclusion as strong, moderate, weak, aggressive,
 * defensible, or not yet supportable based on law + facts + evidence.
 */

const POSITION_STRENGTH = Object.freeze({
  STRONG: "STRONG_POSITION",
  MODERATE: "MODERATE_POSITION",
  WEAK: "WEAK_POSITION",
  AGGRESSIVE: "AGGRESSIVE_POSITION",
  DEFENSIBLE: "DEFENSIBLE_POSITION",
  NOT_YET_SUPPORTABLE: "NOT_YET_SUPPORTABLE"
});

const SUPPORT_LEVEL = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  NONE: "NONE"
});

const CONCLUSION_ACTION = Object.freeze({
  ALLOW_STRONG_CONCLUSION: "ALLOW_STRONG_CONCLUSION",
  USE_QUALIFIED_CONCLUSION: "USE_QUALIFIED_CONCLUSION",
  DISCLOSE_AGGRESSIVE_POSITION: "DISCLOSE_AGGRESSIVE_POSITION",
  DEFER_CONCLUSION: "DEFER_CONCLUSION"
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

  return { score: matched.length, matched };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Number(score) || 0));
}

function getInputText(input, options = {}) {
  const parts = [];

  if (typeof input === "string") parts.push(input);

  if (input && typeof input === "object") {
    parts.push(JSON.stringify(input));

    [
      "legalBasis",
      "controllingAuthority",
      "jurisprudence",
      "knownFacts",
      "documents",
      "evidenceCoverage",
      "requiredDocuments",
      "requiredEvidence",
      "mandatoryDisclosure",
      "findings",
      "taxConsequences",
      "accountingConsequences",
      "birRisks",
      "auditRisks",
      "recommendedResponseControls"
    ].forEach((key) => {
      if (input[key]) parts.push(JSON.stringify(input[key]));
    });
  }

  if (options.text) parts.push(options.text);
  if (options.proposedConclusion) parts.push(options.proposedConclusion);

  return normalizeText(parts.join(" "));
}

const SIGNALS = Object.freeze({
  legalSupportStrong: [
    "nirc", "tax code", "republic act", "revenue regulation",
    "supreme court", "jurisprudence", "controlling authority",
    "clear legal basis", "express provision"
  ],

  legalSupportWeak: [
    "no legal basis", "unclear legal basis", "unsupported legal basis",
    "no controlling authority", "conflict", "uncertain doctrine",
    "no jurisprudence", "apparent conflict"
  ],

  evidenceStrong: [
    "documented", "contract", "agreement", "invoice", "official receipt",
    "sales invoice", "general ledger", "gl", "tax return",
    "board approval", "confirmation", "bank statement",
    "third-party document", "supported"
  ],

  evidenceWeak: [
    "unsupported", "missing", "no agreement", "without agreement",
    "verbal", "no invoice", "no receipt", "no confirmation",
    "not documented", "management representation only",
    "evidentiary gap"
  ],

  factualStrong: [
    "known facts", "documented facts", "verified", "actual practice",
    "flow of funds", "flow of services", "business purpose",
    "economic substance"
  ],

  factualWeak: [
    "assumption", "assuming", "unresolved", "ambiguous",
    "unknown", "incomplete facts", "contradictory", "inconsistent"
  ],

  aggressive: [
    "aggressive", "tax avoidance", "avoid tax", "reduce vat",
    "recharacterize", "substance over form", "no business purpose",
    "sham", "simulated", "tax evasion", "underdeclared"
  ],

  defensibilityPositive: [
    "taxpayer defense", "defensible", "business purpose",
    "economic substance", "documented", "supported",
    "consistent treatment", "reconciled", "legal basis"
  ],

  defensibilityNegative: [
    "bir risk", "audit risk", "litigation risk", "documentation risk",
    "weak", "undefensible", "not supportable", "high risk",
    "critical risk", "contradictory"
  ]
});

function scoreLegalSupport(text) {
  const strong = countMatches(text, SIGNALS.legalSupportStrong);
  const weak = countMatches(text, SIGNALS.legalSupportWeak);

  let score = 40;
  score += strong.score * 10;
  score -= weak.score * 12;

  if (includesAny(text, ["nirc", "tax code", "revenue regulation"])) score += 12;
  if (includesAny(text, ["supreme court", "jurisprudence", "controlling authority"])) score += 10;
  if (includesAny(text, ["no legal basis", "unsupported legal basis"])) score -= 25;

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    level: levelFromSupportScore(finalScore),
    positiveSignals: strong.matched,
    negativeSignals: weak.matched
  };
}

function scoreFactSupport(text) {
  const strong = countMatches(text, SIGNALS.factualStrong);
  const weak = countMatches(text, SIGNALS.factualWeak);

  let score = 40;
  score += strong.score * 8;
  score -= weak.score * 10;

  if (includesAny(text, ["known facts", "documented facts", "verified"])) score += 12;
  if (includesAny(text, ["unresolved", "ambiguous", "contradictory"])) score -= 18;

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    level: levelFromSupportScore(finalScore),
    positiveSignals: strong.matched,
    negativeSignals: weak.matched
  };
}

function scoreEvidenceSupport(text) {
  const strong = countMatches(text, SIGNALS.evidenceStrong);
  const weak = countMatches(text, SIGNALS.evidenceWeak);

  let score = 35;
  score += strong.score * 7;
  score -= weak.score * 11;

  if (includesAny(text, ["contract", "invoice", "official receipt", "gl", "tax return"])) score += 12;
  if (includesAny(text, ["no agreement", "without agreement", "no invoice", "no receipt"])) score -= 22;
  if (includesAny(text, ["management representation only"])) score -= 18;

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    level: levelFromSupportScore(finalScore),
    positiveSignals: strong.matched,
    negativeSignals: weak.matched
  };
}

function scoreAggressiveness(text) {
  const aggressive = countMatches(text, SIGNALS.aggressive);

  let score = aggressive.score * 12;

  if (includesAny(text, ["tax evasion", "sham", "simulated", "false invoice"])) score += 35;
  if (includesAny(text, ["tax avoidance", "avoid tax", "no business purpose"])) score += 20;
  if (includesAny(text, ["recharacterize", "substance over form"])) score += 10;

  return {
    score: clampScore(score),
    level:
      score >= 70 ? "VERY_AGGRESSIVE" :
      score >= 45 ? "AGGRESSIVE" :
      score >= 25 ? "MODERATELY_AGGRESSIVE" :
      "LOW_AGGRESSIVENESS",
    signals: aggressive.matched
  };
}

function scoreDefensibility(text, legalSupport, factSupport, evidenceSupport, aggressiveness) {
  const positive = countMatches(text, SIGNALS.defensibilityPositive);
  const negative = countMatches(text, SIGNALS.defensibilityNegative);

  let score =
    legalSupport.score * 0.35 +
    factSupport.score * 0.25 +
    evidenceSupport.score * 0.30 +
    10;

  score += positive.score * 4;
  score -= negative.score * 6;
  score -= aggressiveness.score * 0.25;

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    level:
      finalScore >= 75 ? "STRONGLY_DEFENSIBLE" :
      finalScore >= 55 ? "DEFENSIBLE" :
      finalScore >= 35 ? "WEAKLY_DEFENSIBLE" :
      "NOT_DEFENSIBLE",
    positiveSignals: positive.matched,
    negativeSignals: negative.matched
  };
}

function levelFromSupportScore(score) {
  if (score >= 75) return SUPPORT_LEVEL.HIGH;
  if (score >= 50) return SUPPORT_LEVEL.MEDIUM;
  if (score >= 25) return SUPPORT_LEVEL.LOW;
  return SUPPORT_LEVEL.NONE;
}

function classifyPosition(legalSupport, factSupport, evidenceSupport, aggressiveness, defensibility) {
  if (
    legalSupport.level === SUPPORT_LEVEL.NONE ||
    factSupport.level === SUPPORT_LEVEL.NONE ||
    evidenceSupport.level === SUPPORT_LEVEL.NONE ||
    defensibility.level === "NOT_DEFENSIBLE"
  ) {
    return POSITION_STRENGTH.NOT_YET_SUPPORTABLE;
  }

  if (
    aggressiveness.score >= 45 &&
    defensibility.score < 70
  ) {
    return POSITION_STRENGTH.AGGRESSIVE;
  }

  if (
    legalSupport.level === SUPPORT_LEVEL.HIGH &&
    factSupport.level === SUPPORT_LEVEL.HIGH &&
    evidenceSupport.level === SUPPORT_LEVEL.HIGH &&
    defensibility.score >= 75
  ) {
    return POSITION_STRENGTH.STRONG;
  }

  if (
    defensibility.score >= 55 &&
    legalSupport.score >= 50 &&
    evidenceSupport.score >= 50
  ) {
    return POSITION_STRENGTH.DEFENSIBLE;
  }

  if (
    legalSupport.score >= 45 &&
    factSupport.score >= 45 &&
    evidenceSupport.score >= 35
  ) {
    return POSITION_STRENGTH.MODERATE;
  }

  return POSITION_STRENGTH.WEAK;
}

function determineConclusionAction(positionStrength) {
  switch (positionStrength) {
    case POSITION_STRENGTH.STRONG:
      return CONCLUSION_ACTION.ALLOW_STRONG_CONCLUSION;

    case POSITION_STRENGTH.DEFENSIBLE:
    case POSITION_STRENGTH.MODERATE:
      return CONCLUSION_ACTION.USE_QUALIFIED_CONCLUSION;

    case POSITION_STRENGTH.AGGRESSIVE:
      return CONCLUSION_ACTION.DISCLOSE_AGGRESSIVE_POSITION;

    case POSITION_STRENGTH.WEAK:
    case POSITION_STRENGTH.NOT_YET_SUPPORTABLE:
    default:
      return CONCLUSION_ACTION.DEFER_CONCLUSION;
  }
}

function buildRequiredImprovements(positionStrength, legalSupport, factSupport, evidenceSupport) {
  const improvements = [];

  if (legalSupport.level === SUPPORT_LEVEL.LOW || legalSupport.level === SUPPORT_LEVEL.NONE) {
    improvements.push("Strengthen legal basis using controlling law, regulations, and applicable jurisprudence.");
  }

  if (factSupport.level === SUPPORT_LEVEL.LOW || factSupport.level === SUPPORT_LEVEL.NONE) {
    improvements.push("Resolve missing, ambiguous, or contradictory facts before final conclusion.");
  }

  if (evidenceSupport.level === SUPPORT_LEVEL.LOW || evidenceSupport.level === SUPPORT_LEVEL.NONE) {
    improvements.push("Obtain contracts, invoices, OR/SI, GL, tax returns, confirmations, bank records, or third-party documents.");
  }

  if (positionStrength === POSITION_STRENGTH.AGGRESSIVE) {
    improvements.push("Prepare business-purpose and economic-substance defense before taking the position.");
    improvements.push("Disclose BIR challenge risk and possible alternative safer treatment.");
  }

  if (positionStrength === POSITION_STRENGTH.NOT_YET_SUPPORTABLE) {
    improvements.push("Do not present the conclusion as final until law, facts, and evidence are sufficiently established.");
  }

  return improvements;
}

function buildConclusionLanguage(positionStrength, action) {
  if (action === CONCLUSION_ACTION.ALLOW_STRONG_CONCLUSION) {
    return "The conclusion may be stated strongly, provided the cited legal basis and evidence are shown.";
  }

  if (action === CONCLUSION_ACTION.USE_QUALIFIED_CONCLUSION) {
    return "Use qualified language: the position is defensible or reasonable based on available facts, subject to verification.";
  }

  if (action === CONCLUSION_ACTION.DISCLOSE_AGGRESSIVE_POSITION) {
    return "State that the position is aggressive and may be challenged by the BIR, courts, or auditor unless supported by strong business purpose, law, and evidence.";
  }

  return "Do not give a definitive conclusion. State that the position is not yet supportable based on available law, facts, and evidence.";
}

function assessPositionStrength(input, options = {}) {
  const text = getInputText(input, options);

  const legalSupport = scoreLegalSupport(text);
  const factSupport = scoreFactSupport(text);
  const evidenceSupport = scoreEvidenceSupport(text);
  const aggressiveness = scoreAggressiveness(text);
  const defensibility = scoreDefensibility(
    text,
    legalSupport,
    factSupport,
    evidenceSupport,
    aggressiveness
  );

  const positionStrength = classifyPosition(
    legalSupport,
    factSupport,
    evidenceSupport,
    aggressiveness,
    defensibility
  );

  const conclusionAction = determineConclusionAction(positionStrength);

  return {
    engine: "TINA_POSITION_STRENGTH_ENGINE",
    version: "1.0.0",

    positionStrength,
    conclusionAction,

    legalSupport,
    factSupport,
    evidenceSupport,
    aggressiveness,
    taxpayerDefensibility: defensibility,

    requiredImprovements: buildRequiredImprovements(
      positionStrength,
      legalSupport,
      factSupport,
      evidenceSupport
    ),

    conclusionLanguage: buildConclusionLanguage(positionStrength, conclusionAction),

    limitationStatement:
      "Based on the available law, facts, and evidence, the position-strength classification is preliminary and subject to verification."
  };
}

function buildPositionStrengthInstruction(result) {
  if (!result || result.engine !== "TINA_POSITION_STRENGTH_ENGINE") {
    throw new Error("Invalid position strength result supplied.");
  }

  return {
    instruction: [
      "Use the position-strength result before drafting the final conclusion.",
      "Do not describe a weak, aggressive, or unsupported position as final or certain.",
      "If the conclusionAction is DEFER_CONCLUSION, state what must be verified first.",
      "If the position is aggressive, disclose BIR/audit/litigation challenge risk.",
      "If the position is strong, still cite law, facts, and evidence.",
      `Position strength: ${result.positionStrength}.`,
      `Conclusion action: ${result.conclusionAction}.`,
      `Required conclusion language: ${result.conclusionLanguage}`
    ],
    result
  };
}

module.exports = {
  POSITION_STRENGTH,
  SUPPORT_LEVEL,
  CONCLUSION_ACTION,
  assessPositionStrength,
  buildPositionStrengthInstruction
};
