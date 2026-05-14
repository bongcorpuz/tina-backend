"use strict";

/**
 * user-behavior-engine.js
 * TINA User Behavior Engine
 *
 * Purpose:
 * Learns from user question style whether the user is asking as auditor,
 * tax adviser, litigator, reviewer, business strategist, or mixed role.
 */

const USER_ROLE = Object.freeze({
  AUDITOR: "AUDITOR",
  TAX_ADVISER: "TAX_ADVISER",
  LITIGATOR: "LITIGATOR",
  REVIEWER: "REVIEWER",
  BUSINESS_STRATEGIST: "BUSINESS_STRATEGIST",
  ACCOUNTANT: "ACCOUNTANT",
  COMPLIANCE_OFFICER: "COMPLIANCE_OFFICER",
  MIXED: "MIXED_ROLE",
  UNKNOWN: "UNKNOWN"
});

const RESPONSE_POSTURE = Object.freeze({
  AUDIT_DEFENSIBLE: "AUDIT_DEFENSIBLE",
  TAX_TECHNICAL: "TAX_TECHNICAL",
  LEGAL_DEFENSE: "LEGAL_DEFENSE",
  LEARNING_OR_REVIEWER: "LEARNING_OR_REVIEWER",
  BUSINESS_PRACTICAL: "BUSINESS_PRACTICAL",
  COMPLIANCE_FIRST: "COMPLIANCE_FIRST",
  MIXED: "MIXED_POSTURE"
});

const CONFIDENCE = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW"
});

function normalizeText(input) {
  if (!input) return "";
  return String(input).replace(/\s+/g, " ").trim();
}

function lower(input) {
  return normalizeText(input).toLowerCase();
}

function countSignals(text, signals = []) {
  const source = lower(text);
  const matched = [];

  for (const signal of signals) {
    if (source.includes(signal.toLowerCase())) matched.push(signal);
  }

  return {
    score: matched.length,
    matched
  };
}

const ROLE_SIGNALS = Object.freeze({
  [USER_ROLE.AUDITOR]: [
    "act as auditor",
    "act as senior partner",
    "audit",
    "afs",
    "pfrs",
    "pas",
    "working paper",
    "trial balance",
    "general ledger",
    "gl",
    "misstatement",
    "qualified opinion",
    "audit risk",
    "evidence",
    "substantive",
    "supporting documents",
    "financial statements"
  ],

  [USER_ROLE.TAX_ADVISER]: [
    "tax treatment",
    "bir",
    "vat",
    "withholding",
    "ewt",
    "cwt",
    "income tax",
    "mcit",
    "rcit",
    "nolco",
    "deductible",
    "tax payable",
    "tax expense",
    "legal basis",
    "nirc",
    "rr",
    "rmc",
    "rmo",
    "tax risk"
  ],

  [USER_ROLE.LITIGATOR]: [
    "act as lawyer",
    "litigation",
    "legal defense",
    "taxpayer defense",
    "assessment",
    "loa",
    "pan",
    "fan",
    "protest",
    "cta",
    "supreme court",
    "jurisprudence",
    "doctrine",
    "conflict",
    "controlling authority",
    "legal consequence"
  ],

  [USER_ROLE.REVIEWER]: [
    "cpale",
    "reviewer",
    "explain simply",
    "simple english",
    "layman's term",
    "taglish",
    "example",
    "quiz",
    "study",
    "why",
    "what is",
    "define"
  ],

  [USER_ROLE.BUSINESS_STRATEGIST]: [
    "business",
    "strategy",
    "strategist",
    "benchmark",
    "pricing",
    "costing",
    "subscription",
    "arr",
    "operations",
    "o&m",
    "support cost",
    "proposal",
    "pitch",
    "investor",
    "commercial",
    "practical"
  ],

  [USER_ROLE.ACCOUNTANT]: [
    "accounting treatment",
    "journal entry",
    "take up",
    "booked as",
    "recorded as",
    "classification",
    "cost of sales",
    "opex",
    "revenue recognition",
    "principal vs agent",
    "pfrs 15",
    "lease liability",
    "rou"
  ],

  [USER_ROLE.COMPLIANCE_OFFICER]: [
    "filing",
    "deadline",
    "return",
    "form",
    "compliance",
    "sec",
    "bir filing",
    "efast",
    "eafs",
    "attachments",
    "requirements",
    "submission",
    "penalty"
  ]
});

function scoreRoles(text) {
  const scores = {};

  for (const [role, signals] of Object.entries(ROLE_SIGNALS)) {
    scores[role] = countSignals(text, signals);
  }

  return scores;
}

function selectPrimaryRole(scores) {
  const ranked = Object.entries(scores)
    .map(([role, data]) => ({
      role,
      score: data.score,
      matched: data.matched
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    return {
      role: USER_ROLE.UNKNOWN,
      confidence: CONFIDENCE.LOW,
      basis: []
    };
  }

  const top = ranked[0];
  const second = ranked[1];

  if (second && second.score >= Math.max(2, top.score - 1)) {
    return {
      role: USER_ROLE.MIXED,
      confidence: CONFIDENCE.MEDIUM,
      basis: ranked.slice(0, 4)
    };
  }

  return {
    role: top.role,
    confidence: top.score >= 4 ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM,
    basis: ranked.slice(0, 4)
  };
}

function mapRoleToPosture(role) {
  switch (role) {
    case USER_ROLE.AUDITOR:
      return RESPONSE_POSTURE.AUDIT_DEFENSIBLE;

    case USER_ROLE.TAX_ADVISER:
      return RESPONSE_POSTURE.TAX_TECHNICAL;

    case USER_ROLE.LITIGATOR:
      return RESPONSE_POSTURE.LEGAL_DEFENSE;

    case USER_ROLE.REVIEWER:
      return RESPONSE_POSTURE.LEARNING_OR_REVIEWER;

    case USER_ROLE.BUSINESS_STRATEGIST:
      return RESPONSE_POSTURE.BUSINESS_PRACTICAL;

    case USER_ROLE.COMPLIANCE_OFFICER:
      return RESPONSE_POSTURE.COMPLIANCE_FIRST;

    case USER_ROLE.ACCOUNTANT:
      return RESPONSE_POSTURE.AUDIT_DEFENSIBLE;

    case USER_ROLE.MIXED:
      return RESPONSE_POSTURE.MIXED;

    default:
      return RESPONSE_POSTURE.COMPLIANCE_FIRST;
  }
}

function detectQuestionStyle(text) {
  const source = lower(text);

  return {
    directAnswerSeeking: /\bwhat is\b|\bwhy\b|\bdefine\b|\bmeaning\b|\bis it\b/.test(source),
    riskFocused: /risk|exposure|issue|problem|qualified opinion|bir risk|audit risk|legal consequence/.test(source),
    basisFocused: /basis|legal basis|why|authority|jurisprudence|doctrine|section|rr|rmc|nirc/.test(source),
    evidenceFocused: /document|support|evidence|invoice|receipt|contract|gl|return|confirmation|bank/.test(source),
    strategyFocused: /better|best|strategy|recommend|option|practical|benchmark|pricing|proposal/.test(source),
    skepticalOrReviewing: /review|recheck|evaluate|are you sure|check|analyze|what are the risk/.test(source),
    simpleExplanation: /simple|layman's|taglish|easy|short|brief/.test(source)
  };
}

function buildUserPreferenceHints(primaryRole, posture, style) {
  const hints = [];

  if (primaryRole === USER_ROLE.AUDITOR || primaryRole === USER_ROLE.ACCOUNTANT) {
    hints.push("Prioritize audit-defensible reasoning.");
    hints.push("Separate accounting treatment, tax treatment, audit risk, and required evidence.");
  }

  if (primaryRole === USER_ROLE.TAX_ADVISER) {
    hints.push("Prioritize controlling tax basis and practical BIR compliance impact.");
  }

  if (primaryRole === USER_ROLE.LITIGATOR) {
    hints.push("Prioritize issue framing, hierarchy of authority, conflict analysis, BIR position, and taxpayer defense.");
  }

  if (primaryRole === USER_ROLE.REVIEWER || style.simpleExplanation) {
    hints.push("Use simple explanation, examples, and reviewer-style structure.");
  }

  if (primaryRole === USER_ROLE.BUSINESS_STRATEGIST) {
    hints.push("Prioritize commercial practicality, risk trade-offs, and decision-ready recommendations.");
  }

  if (style.evidenceFocused) {
    hints.push("Identify asserted facts, documented facts, missing documents, and evidentiary gaps.");
  }

  if (style.riskFocused) {
    hints.push("Include risk rating and mitigation steps.");
  }

  if (style.basisFocused) {
    hints.push("Cite or request controlling legal basis before giving a strong conclusion.");
  }

  if (!hints.length) {
    hints.push("Use standard TINA compliance-first response posture.");
  }

  return hints;
}

function recommendMode(primaryRole, style) {
  if (primaryRole === USER_ROLE.AUDITOR || primaryRole === USER_ROLE.ACCOUNTANT) return "AUDIT_MODE";
  if (primaryRole === USER_ROLE.LITIGATOR) return "LITIGATION_LEGAL_DEFENSE_MODE";
  if (primaryRole === USER_ROLE.REVIEWER) return "REVIEWER_LEARNING_MODE";
  if (primaryRole === USER_ROLE.BUSINESS_STRATEGIST) return "STANDARD_TAX_MODE";
  if (style.evidenceFocused) return "EVIDENCE_EVALUATION_MODE";
  if (style.basisFocused) return "TECHNICAL_TAX_MODE";
  if (primaryRole === USER_ROLE.TAX_ADVISER) return "STANDARD_TAX_MODE";
  if (primaryRole === USER_ROLE.COMPLIANCE_OFFICER) return "STANDARD_TAX_MODE";

  return "STANDARD_TAX_MODE";
}

function analyzeUserBehavior(userInput, options = {}) {
  const text = normalizeText(userInput || options.text);
  const roleScores = scoreRoles(text);
  const selected = selectPrimaryRole(roleScores);
  const style = detectQuestionStyle(text);
  const posture = mapRoleToPosture(selected.role);
  const recommendedMode = recommendMode(selected.role, style);

  return {
    engine: "TINA_USER_BEHAVIOR_ENGINE",
    version: "1.0.0",

    inferredRole: selected.role,
    confidence: selected.confidence,
    responsePosture: posture,
    recommendedMode,

    roleBasis: selected.basis,
    roleScores,
    questionStyle: style,

    userPreferenceHints: buildUserPreferenceHints(
      selected.role,
      posture,
      style
    ),

    safeguards: [
      "Do not let user role inference override controlling law, evidence, or risk analysis.",
      "Do not assume the user's actual profession; infer only the posture of the current question.",
      "Use role inference only to adapt response format, depth, and emphasis.",
      "If facts are incomplete, disclose assumptions, gaps, ambiguities, and limitations."
    ],

    limitationStatement:
      "User behavior classification is based only on the current question style and should be used for response adaptation, not as a factual conclusion about the user."
  };
}

function buildUserBehaviorInstruction(result) {
  if (!result || result.engine !== "TINA_USER_BEHAVIOR_ENGINE") {
    throw new Error("Invalid user behavior result supplied.");
  }

  return {
    instruction: [
      "Use the user behavior result only to adapt response posture, depth, and emphasis.",
      "Do not treat inferred role as a verified personal fact.",
      "Do not override legal hierarchy, evidence evaluation, or risk scoring.",
      `Inferred current-question role: ${result.inferredRole}.`,
      `Recommended response posture: ${result.responsePosture}.`,
      `Recommended mode: ${result.recommendedMode}.`,
      ...result.userPreferenceHints
    ],
    result
  };
}

module.exports = {
  USER_ROLE,
  RESPONSE_POSTURE,
  CONFIDENCE,
  analyzeUserBehavior,
  buildUserBehaviorInstruction
};
