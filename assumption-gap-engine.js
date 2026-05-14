"use strict";

/**
 * assumption-gap-engine.js
 * TINA Assumption and Gap Engine
 *
 * Purpose:
 * Forces TINA to disclose factual assumptions, missing documents,
 * evidentiary gaps, ambiguities, and limitations before giving a strong conclusion.
 */

const GAP_TYPE = Object.freeze({
  FACTUAL_ASSUMPTION: "FACTUAL_ASSUMPTION",
  MISSING_DOCUMENT: "MISSING_DOCUMENT",
  EVIDENTIARY_GAP: "EVIDENTIARY_GAP",
  AMBIGUITY: "AMBIGUITY",
  CONTRADICTION: "CONTRADICTION",
  LEGAL_LIMITATION: "LEGAL_LIMITATION",
  TAX_LIMITATION: "TAX_LIMITATION",
  AUDIT_LIMITATION: "AUDIT_LIMITATION",
  ACCOUNTING_LIMITATION: "ACCOUNTING_LIMITATION",
  CONCLUSION_LIMITATION: "CONCLUSION_LIMITATION"
});

const CONCLUSION_STRENGTH = Object.freeze({
  STRONG_ALLOWED: "STRONG_CONCLUSION_ALLOWED",
  PRELIMINARY_ONLY: "PRELIMINARY_CONCLUSION_ONLY",
  DEFER_CONCLUSION: "DEFER_CONCLUSION"
});

const RISK_LEVEL = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
});

function normalizeText(input) {
  if (!input) return "";

  if (typeof input === "string") {
    return input.replace(/\s+/g, " ").trim();
  }

  if (typeof input === "object") {
    return JSON.stringify(input).replace(/\s+/g, " ").trim();
  }

  return String(input).replace(/\s+/g, " ").trim();
}

function lower(input) {
  return normalizeText(input).toLowerCase();
}

function includesAny(text, keywords = []) {
  const source = lower(text);
  return keywords.some((keyword) => source.includes(keyword.toLowerCase()));
}

function collectFromPriorEngines(input) {
  const collected = {
    assumptions: [],
    missingDocuments: [],
    evidentiaryGaps: [],
    ambiguities: [],
    contradictions: [],
    limitations: [],
    riskSignals: []
  };

  if (!input || typeof input !== "object") return collected;

  const add = (target, value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => add(target, item));
      return;
    }

    if (typeof value === "string") {
      collected[target].push(value);
      return;
    }

    if (typeof value === "object") {
      collected[target].push(
        value.fact ||
        value.document ||
        value.issue ||
        value.description ||
        value.clause ||
        value.text ||
        JSON.stringify(value)
      );
    }
  };

  add("missingDocuments", input.requiredDocuments);
  add("missingDocuments", input.documentsRequired);
  add("missingDocuments", input.requiredEvidence);
  add("missingDocuments", input.requiredFollowUpDocuments);
  add("missingDocuments", input.documentaryGaps);

  add("ambiguities", input.unresolvedFacts);
  add("ambiguities", input.alternativeCharacterizations);
  add("ambiguities", input.documentaryGaps);

  add("evidentiaryGaps", input.findings);
  add("evidentiaryGaps", input.auditSensitiveItems);
  add("evidentiaryGaps", input.evidenceCoverage);

  add("limitations", input.limitationStatement);
  add("limitations", input.preliminaryConclusion);
  add("limitations", input.preliminaryInterpretation);
  add("limitations", input.recommendedConclusionRule);
  add("limitations", input.conclusionRule);

  add("riskSignals", input.riskLevel);
  add("riskSignals", input.evidenceStrength);
  add("riskSignals", input.result);
  add("riskSignals", input.primaryCharacterization);

  return collected;
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean).map((x) => String(x).trim()))];
}

function detectAssumptions(text) {
  const assumptions = [];

  const signals = [
    "assuming", "assume", "based on", "if", "provided that",
    "subject to", "appears", "seems", "likely", "preliminary"
  ];

  if (includesAny(text, signals)) {
    assumptions.push("Certain facts appear to be assumed or conditional and must be verified before final conclusion.");
  }

  if (includesAny(text, ["no agreement", "without agreement", "verbal"])) {
    assumptions.push("The arrangement may be based on verbal or undocumented terms.");
  }

  if (includesAny(text, ["booked as", "recorded as", "classified as"])) {
    assumptions.push("Accounting classification is assumed from available entries and must be reconciled with legal form and actual conduct.");
  }

  return assumptions;
}

function detectMissingDocuments(text) {
  const required = [];

  if (includesAny(text, ["contract", "agreement", "lease", "concession", "service agreement"])) {
    required.push("Complete executed contract/agreement, including amendments and relevant schedules.");
  }

  if (includesAny(text, ["sales", "revenue", "vat", "billing", "invoice", "collection"])) {
    required.push("Invoices, OR/SI, billing statements, and collection records.");
  }

  if (includesAny(text, ["gl", "afs", "audit", "pfrs", "financial statements", "booked"])) {
    required.push("General ledger, trial balance, working papers, and AFS schedules.");
  }

  if (includesAny(text, ["bir", "withholding", "ewt", "cwt", "tax return", "2550q", "1702"])) {
    required.push("Relevant BIR returns, withholding tax filings, VAT schedules, and tax reconciliation.");
  }

  if (includesAny(text, ["board", "approval", "subscription", "equity", "loan", "financing"])) {
    required.push("Board approvals, resolutions, subscription/loan documents, and fund transfer records.");
  }

  if (includesAny(text, ["supplier", "third party", "restaurant", "vendor", "reimbursement", "pass-through"])) {
    required.push("Third-party billings, confirmations, liquidation reports, and proof of remittance.");
  }

  return required;
}

function detectAmbiguities(text) {
  const ambiguities = [];

  if (includesAny(text, ["sale", "service", "lease", "concession", "commission", "reimbursement", "agent", "principal"])) {
    ambiguities.push("Transaction characterization may be ambiguous and requires legal form versus economic substance analysis.");
  }

  if (includesAny(text, ["gross", "net", "principal", "agent", "pass-through", "margin"])) {
    ambiguities.push("Gross-versus-net presentation is unresolved without control, risk, invoicing, and margin analysis.");
  }

  if (includesAny(text, ["inclusive", "package", "bundle", "free", "combined"])) {
    ambiguities.push("Bundled consideration may require allocation among separate components or performance obligations.");
  }

  if (includesAny(text, ["however", "but", "despite", "inconsistent", "different from actual practice"])) {
    ambiguities.push("There may be inconsistency between stated form, accounting treatment, and actual practice.");
  }

  return ambiguities;
}

function detectLimitations(text) {
  const limitations = [];

  if (includesAny(text, ["legal basis", "case", "jurisprudence", "doctrine", "conflict"])) {
    limitations.push("Legal conclusion must be tested against controlling law, revenue regulations, and applicable jurisprudence.");
  }

  if (includesAny(text, ["tax risk", "bir", "assessment", "loa", "protest"])) {
    limitations.push("Tax position must consider possible BIR challenge and taxpayer defense.");
  }

  if (includesAny(text, ["audit", "afs", "misstatement", "qualified opinion"])) {
    limitations.push("Audit conclusion must be supported by sufficient appropriate audit evidence.");
  }

  if (includesAny(text, ["contract", "agreement", "clause"])) {
    limitations.push("Contract interpretation must be validated against the complete contract and actual conduct of the parties.");
  }

  return limitations;
}

function computeRiskLevel(gaps) {
  let score = 0;

  score += gaps.factualAssumptions.length;
  score += gaps.missingDocuments.length * 2;
  score += gaps.evidentiaryGaps.length * 2;
  score += gaps.ambiguities.length;
  score += gaps.contradictions.length * 3;
  score += gaps.limitations.length;

  if (score >= 16) return RISK_LEVEL.CRITICAL;
  if (score >= 10) return RISK_LEVEL.HIGH;
  if (score >= 5) return RISK_LEVEL.MEDIUM;
  return RISK_LEVEL.LOW;
}

function determineConclusionStrength(riskLevel, gaps) {
  if (
    riskLevel === RISK_LEVEL.CRITICAL ||
    gaps.contradictions.length > 0 ||
    gaps.missingDocuments.length >= 5
  ) {
    return CONCLUSION_STRENGTH.DEFER_CONCLUSION;
  }

  if (
    riskLevel === RISK_LEVEL.HIGH ||
    riskLevel === RISK_LEVEL.MEDIUM ||
    gaps.factualAssumptions.length > 0 ||
    gaps.ambiguities.length > 0 ||
    gaps.evidentiaryGaps.length > 0
  ) {
    return CONCLUSION_STRENGTH.PRELIMINARY_ONLY;
  }

  return CONCLUSION_STRENGTH.STRONG_ALLOWED;
}

function buildMandatoryDisclosure(gaps, conclusionStrength) {
  const disclosure = [];

  if (gaps.factualAssumptions.length) {
    disclosure.push({
      heading: "Factual assumptions",
      items: gaps.factualAssumptions
    });
  }

  if (gaps.missingDocuments.length) {
    disclosure.push({
      heading: "Missing documents",
      items: gaps.missingDocuments
    });
  }

  if (gaps.evidentiaryGaps.length) {
    disclosure.push({
      heading: "Evidentiary gaps",
      items: gaps.evidentiaryGaps
    });
  }

  if (gaps.ambiguities.length) {
    disclosure.push({
      heading: "Unresolved ambiguities",
      items: gaps.ambiguities
    });
  }

  if (gaps.contradictions.length) {
    disclosure.push({
      heading: "Contradictions",
      items: gaps.contradictions
    });
  }

  if (gaps.limitations.length) {
    disclosure.push({
      heading: "Limitations",
      items: gaps.limitations
    });
  }

  if (conclusionStrength !== CONCLUSION_STRENGTH.STRONG_ALLOWED) {
    disclosure.push({
      heading: "Conclusion limitation",
      items: [
        "Based on the available facts, the position is preliminary and subject to verification."
      ]
    });
  }

  return disclosure;
}

function analyzeAssumptionsAndGaps(input, options = {}) {
  const text = normalizeText(input || options.text);
  const prior = collectFromPriorEngines(input);

  const gaps = {
    factualAssumptions: unique([
      ...detectAssumptions(text),
      ...prior.assumptions
    ]),
    missingDocuments: unique([
      ...detectMissingDocuments(text),
      ...prior.missingDocuments
    ]),
    evidentiaryGaps: unique(prior.evidentiaryGaps),
    ambiguities: unique([
      ...detectAmbiguities(text),
      ...prior.ambiguities
    ]),
    contradictions: unique(prior.contradictions),
    limitations: unique([
      ...detectLimitations(text),
      ...prior.limitations
    ])
  };

  const riskLevel = computeRiskLevel(gaps);
  const conclusionStrength = determineConclusionStrength(riskLevel, gaps);

  return {
    engine: "TINA_ASSUMPTION_GAP_ENGINE",
    version: "1.0.0",
    gaps,
    riskLevel,
    conclusionStrength,
    mustDiscloseBeforeConclusion:
      conclusionStrength !== CONCLUSION_STRENGTH.STRONG_ALLOWED,
    mandatoryDisclosure: buildMandatoryDisclosure(gaps, conclusionStrength),
    canGiveStrongConclusion:
      conclusionStrength === CONCLUSION_STRENGTH.STRONG_ALLOWED,
    requiredConclusionLanguage:
      conclusionStrength === CONCLUSION_STRENGTH.STRONG_ALLOWED
        ? "The conclusion may be stated directly, provided the cited basis supports it."
        : conclusionStrength === CONCLUSION_STRENGTH.PRELIMINARY_ONLY
          ? "Use preliminary language and expressly state assumptions, missing documents, ambiguities, and evidentiary gaps."
          : "Do not give a definitive conclusion. State what must be verified first.",
    limitationStatement:
      "Based on the available facts, the position is preliminary and subject to verification."
  };
}

function buildAssumptionGapInstruction(result) {
  if (!result || result.engine !== "TINA_ASSUMPTION_GAP_ENGINE") {
    throw new Error("Invalid assumption-gap result supplied.");
  }

  return {
    instruction: [
      "Before giving a strong conclusion, disclose assumptions, missing documents, evidentiary gaps, ambiguities, and limitations.",
      "Do not overstate certainty.",
      "If conclusionStrength is PRELIMINARY_ONLY, use qualified language.",
      "If conclusionStrength is DEFER_CONCLUSION, state what must be verified before conclusion.",
      `Risk level: ${result.riskLevel}.`,
      `Conclusion strength: ${result.conclusionStrength}.`,
      `Required conclusion language: ${result.requiredConclusionLanguage}`
    ],
    result
  };
}

module.exports = {
  GAP_TYPE,
  CONCLUSION_STRENGTH,
  RISK_LEVEL,
  analyzeAssumptionsAndGaps,
  buildAssumptionGapInstruction
};
