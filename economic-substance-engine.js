"use strict";

/**
 * economic-substance-engine.js
 * TINA Economic Substance Engine
 *
 * Purpose:
 * Tests legal form versus commercial substance, business purpose,
 * economic reality, sham/simulation risk, and tax avoidance/evasion indicators.
 */

const SUBSTANCE_RESULT = Object.freeze({
  SUBSTANCE_ALIGNED: "SUBSTANCE_ALIGNED_WITH_FORM",
  SUBSTANCE_PARTIALLY_ALIGNED: "SUBSTANCE_PARTIALLY_ALIGNED_WITH_FORM",
  SUBSTANCE_OVERRIDES_FORM: "SUBSTANCE_OVERRIDES_LEGAL_FORM",
  UNRESOLVED: "ECONOMIC_SUBSTANCE_UNRESOLVED"
});

const RISK_LEVEL = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
});

const CONFIDENCE = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW"
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

function countSignals(text, signals = []) {
  const source = lower(text);
  const matched = [];

  for (const signal of signals) {
    if (source.includes(signal.toLowerCase())) {
      matched.push(signal);
    }
  }

  return {
    score: matched.length,
    matched
  };
}

function getInputText(input, options = {}) {
  if (typeof input === "string") return normalizeText(input);

  const parts = [];

  if (input && typeof input === "object") {
    if (Array.isArray(input.knownFacts)) {
      parts.push(...input.knownFacts.map((x) => x.fact || x.description || ""));
    }

    if (Array.isArray(input.transactionFlow)) {
      parts.push(...input.transactionFlow.map((x) => x.description || ""));
    }

    if (input.consideration && Array.isArray(input.consideration.descriptions)) {
      parts.push(...input.consideration.descriptions.map((x) => x.description || ""));
    }

    if (Array.isArray(input.documents)) {
      parts.push(...input.documents.map((x) => x.document || ""));
    }

    if (Array.isArray(input.alternativeCharacterizations)) {
      parts.push(...input.alternativeCharacterizations.map((x) => x.characterization || ""));
    }

    if (input.primaryCharacterization) {
      parts.push(input.primaryCharacterization);
    }

    if (input.preliminaryConclusion) {
      parts.push(input.preliminaryConclusion);
    }
  }

  if (options.text) parts.push(options.text);

  return normalizeText(parts.join(" "));
}

const SIGNALS = Object.freeze({
  legalForm: [
    "contract", "agreement", "lease", "service agreement", "concession agreement",
    "supplier agreement", "moa", "invoice", "official receipt", "billing",
    "board approval", "resolution", "subscription agreement", "loan agreement"
  ],

  commercialSubstance: [
    "actual practice", "in substance", "commercial reality", "economic reality",
    "flow of money", "flow of services", "actual conduct", "customer pays",
    "supplier provides", "controls", "bears risk", "earns margin", "beneficial owner"
  ],

  businessPurpose: [
    "business purpose", "commercial reason", "operational reason", "cost efficiency",
    "customer convenience", "market practice", "business model", "expansion",
    "financing need", "working capital", "service integration", "bundled offering"
  ],

  formSubstanceMismatch: [
    "no agreement", "without agreement", "not covered by contract",
    "different from actual practice", "substance over form", "booked as",
    "classified as", "but actually", "however", "despite", "inconsistent",
    "mismatch", "not supported", "no documentation"
  ],

  shamSimulation: [
    "sham", "simulated", "simulation", "fictitious", "dummy", "nominee",
    "paper transaction", "no actual service", "no actual delivery",
    "no real obligation", "circular transaction", "back-to-back without purpose",
    "fabricated", "false invoice", "accommodation invoice"
  ],

  taxAvoidance: [
    "avoid tax", "tax avoidance", "minimize tax", "reduce vat", "avoid vat",
    "avoid withholding", "lower tax", "tax planning", "recharacterize",
    "split transaction", "tax benefit", "tax shield"
  ],

  taxEvasion: [
    "evade tax", "tax evasion", "hide income", "unrecorded sales",
    "underdeclared", "false receipt", "fake invoice", "no receipt",
    "off books", "suppressed sales", "fraudulent", "willful"
  ],

  auditSensitivity: [
    "audit", "afs", "financial statements", "misstatement", "qualified opinion",
    "working paper", "gl", "trial balance", "support", "evidence",
    "documentation", "management representation"
  ],

  birSensitivity: [
    "bir", "loa", "assessment", "pan", "fan", "tax mapping",
    "vat", "output vat", "input vat", "withholding", "ewt", "cwt",
    "income tax", "deductible", "deductibility"
  ]
});

function analyzeLegalForm(text) {
  const formSignals = countSignals(text, SIGNALS.legalForm);

  return {
    hasLegalForm: formSignals.score > 0,
    signals: formSignals.matched,
    strength:
      formSignals.score >= 4 ? CONFIDENCE.HIGH :
      formSignals.score >= 2 ? CONFIDENCE.MEDIUM :
      CONFIDENCE.LOW
  };
}

function analyzeCommercialSubstance(text) {
  const substanceSignals = countSignals(text, SIGNALS.commercialSubstance);
  const businessPurposeSignals = countSignals(text, SIGNALS.businessPurpose);

  return {
    hasCommercialSubstance:
      substanceSignals.score > 0 || businessPurposeSignals.score > 0,
    substanceSignals: substanceSignals.matched,
    businessPurposeSignals: businessPurposeSignals.matched,
    strength:
      substanceSignals.score + businessPurposeSignals.score >= 5 ? CONFIDENCE.HIGH :
      substanceSignals.score + businessPurposeSignals.score >= 2 ? CONFIDENCE.MEDIUM :
      CONFIDENCE.LOW
  };
}

function analyzeMismatch(text) {
  const mismatchSignals = countSignals(text, SIGNALS.formSubstanceMismatch);

  return {
    hasMismatchIndicators: mismatchSignals.score > 0,
    signals: mismatchSignals.matched,
    severity:
      mismatchSignals.score >= 4 ? RISK_LEVEL.HIGH :
      mismatchSignals.score >= 2 ? RISK_LEVEL.MEDIUM :
      mismatchSignals.score === 1 ? RISK_LEVEL.LOW :
      RISK_LEVEL.LOW
  };
}

function analyzeShamSimulationRisk(text) {
  const shamSignals = countSignals(text, SIGNALS.shamSimulation);

  return {
    hasShamOrSimulationIndicators: shamSignals.score > 0,
    signals: shamSignals.matched,
    risk:
      shamSignals.score >= 3 ? RISK_LEVEL.CRITICAL :
      shamSignals.score >= 1 ? RISK_LEVEL.HIGH :
      RISK_LEVEL.LOW
  };
}

function analyzeTaxAvoidanceEvasion(text) {
  const avoidanceSignals = countSignals(text, SIGNALS.taxAvoidance);
  const evasionSignals = countSignals(text, SIGNALS.taxEvasion);

  return {
    avoidance: {
      hasIndicators: avoidanceSignals.score > 0,
      signals: avoidanceSignals.matched,
      risk:
        avoidanceSignals.score >= 3 ? RISK_LEVEL.HIGH :
        avoidanceSignals.score >= 1 ? RISK_LEVEL.MEDIUM :
        RISK_LEVEL.LOW
    },
    evasion: {
      hasIndicators: evasionSignals.score > 0,
      signals: evasionSignals.matched,
      risk:
        evasionSignals.score >= 2 ? RISK_LEVEL.CRITICAL :
        evasionSignals.score >= 1 ? RISK_LEVEL.HIGH :
        RISK_LEVEL.LOW
    }
  };
}

function analyzeControlRiskMargin(text) {
  return {
    control: {
      customerControl: includesAny(text, [
        "customer controls", "client controls", "customer decides", "customer directs"
      ]),
      taxpayerControl: includesAny(text, [
        "company controls", "taxpayer controls", "controls the service",
        "sets price", "controls price", "responsible to customer"
      ]),
      supplierControl: includesAny(text, [
        "supplier controls", "third party controls", "restaurant controls",
        "vendor controls", "service provider controls"
      ])
    },

    risk: {
      taxpayerBearsRisk: includesAny(text, [
        "company bears risk", "taxpayer bears risk", "liable to customer",
        "responsible for defects", "credit risk", "inventory risk", "service risk"
      ]),
      thirdPartyBearsRisk: includesAny(text, [
        "supplier bears risk", "vendor bears risk", "third party liable",
        "restaurant liable", "service provider liable"
      ])
    },

    margin: {
      earnsMargin: includesAny(text, [
        "margin", "markup", "spread", "commission", "profit", "earned"
      ]),
      noMargin: includesAny(text, [
        "no margin", "pure reimbursement", "actual cost", "pass-through",
        "collection only"
      ])
    }
  };
}

function determineSubstanceResult(legalForm, commercialSubstance, mismatch, shamRisk, taxRisk) {
  if (
    shamRisk.hasShamOrSimulationIndicators ||
    taxRisk.evasion.hasIndicators
  ) {
    return {
      result: SUBSTANCE_RESULT.SUBSTANCE_OVERRIDES_FORM,
      confidence: CONFIDENCE.HIGH
    };
  }

  if (mismatch.hasMismatchIndicators && commercialSubstance.hasCommercialSubstance) {
    return {
      result: SUBSTANCE_RESULT.SUBSTANCE_OVERRIDES_FORM,
      confidence: mismatch.severity === RISK_LEVEL.HIGH ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM
    };
  }

  if (legalForm.hasLegalForm && commercialSubstance.hasCommercialSubstance && !mismatch.hasMismatchIndicators) {
    return {
      result: SUBSTANCE_RESULT.SUBSTANCE_ALIGNED,
      confidence:
        legalForm.strength === CONFIDENCE.HIGH && commercialSubstance.strength === CONFIDENCE.HIGH
          ? CONFIDENCE.HIGH
          : CONFIDENCE.MEDIUM
    };
  }

  if (legalForm.hasLegalForm && !commercialSubstance.hasCommercialSubstance) {
    return {
      result: SUBSTANCE_RESULT.UNRESOLVED,
      confidence: CONFIDENCE.LOW
    };
  }

  if (!legalForm.hasLegalForm && commercialSubstance.hasCommercialSubstance) {
    return {
      result: SUBSTANCE_RESULT.SUBSTANCE_PARTIALLY_ALIGNED,
      confidence: CONFIDENCE.MEDIUM
    };
  }

  return {
    result: SUBSTANCE_RESULT.UNRESOLVED,
    confidence: CONFIDENCE.LOW
  };
}

function computeOverallRisk(text, mismatch, shamRisk, taxRisk) {
  let score = 0;

  if (mismatch.hasMismatchIndicators) score += 2;
  if (mismatch.severity === RISK_LEVEL.HIGH) score += 2;

  if (shamRisk.hasShamOrSimulationIndicators) score += 4;
  if (taxRisk.avoidance.hasIndicators) score += 2;
  if (taxRisk.evasion.hasIndicators) score += 5;

  if (includesAny(text, SIGNALS.auditSensitivity)) score += 1;
  if (includesAny(text, SIGNALS.birSensitivity)) score += 2;

  if (includesAny(text, ["no agreement", "without agreement", "no invoice", "no receipt"])) {
    score += 2;
  }

  if (score >= 8) return RISK_LEVEL.CRITICAL;
  if (score >= 5) return RISK_LEVEL.HIGH;
  if (score >= 3) return RISK_LEVEL.MEDIUM;
  return RISK_LEVEL.LOW;
}

function buildRequiredEvidence(text, substanceResult) {
  const evidence = new Set();

  evidence.add("Executed contracts, agreements, amendments, and relevant clauses");
  evidence.add("Invoices, official receipts, billing statements, and collection receipts");
  evidence.add("General ledger entries and subsidiary schedules");
  evidence.add("Actual flow of funds schedule");
  evidence.add("Management explanation of business purpose");

  if (includesAny(text, ["service", "supplier", "vendor", "restaurant", "third party"])) {
    evidence.add("Proof of actual service delivery or goods delivery");
    evidence.add("Third-party supplier billings and settlement records");
  }

  if (includesAny(text, ["principal", "agent", "gross", "net", "commission", "margin"])) {
    evidence.add("Principal-agent control analysis");
    evidence.add("Evidence of who controls price, customer relationship, fulfillment risk, and credit risk");
  }

  if (includesAny(text, ["lease", "concession", "space", "rent", "percentage of sales"])) {
    evidence.add("Evidence of right to use space, operating control, rent/revenue share computation");
  }

  if (includesAny(text, ["reimbursement", "pass-through", "advance", "collection only"])) {
    evidence.add("Liquidation reports and proof that amounts were collected for and remitted to another party");
    evidence.add("Evidence whether margin or beneficial ownership exists");
  }

  if (includesAny(text, ["tax avoidance", "avoid tax", "reduce vat", "withholding", "bir"])) {
    evidence.add("Tax position memo explaining non-tax business purpose and legal basis");
  }

  if (substanceResult.result !== SUBSTANCE_RESULT.SUBSTANCE_ALIGNED) {
    evidence.add("Reconciliation of legal form, accounting entries, tax treatment, and actual conduct");
  }

  return [...evidence];
}

function buildFindings(substanceResult, legalForm, commercialSubstance, mismatch, shamRisk, taxRisk) {
  const findings = [];

  if (legalForm.hasLegalForm) {
    findings.push("Legal form indicators are present.");
  } else {
    findings.push("Legal form is not sufficiently established from the available facts.");
  }

  if (commercialSubstance.hasCommercialSubstance) {
    findings.push("Commercial substance indicators are present.");
  } else {
    findings.push("Commercial substance is not sufficiently demonstrated from the available facts.");
  }

  if (mismatch.hasMismatchIndicators) {
    findings.push("There are indicators that legal form may not fully match actual commercial conduct.");
  }

  if (shamRisk.hasShamOrSimulationIndicators) {
    findings.push("There are sham or simulation risk indicators requiring heightened verification.");
  }

  if (taxRisk.avoidance.hasIndicators) {
    findings.push("There are tax avoidance indicators requiring business-purpose analysis.");
  }

  if (taxRisk.evasion.hasIndicators) {
    findings.push("There are possible tax evasion or fraud indicators requiring legal and evidentiary review.");
  }

  if (substanceResult.result === SUBSTANCE_RESULT.SUBSTANCE_ALIGNED) {
    findings.push("Based on available facts, legal form and commercial substance appear aligned.");
  }

  if (substanceResult.result === SUBSTANCE_RESULT.SUBSTANCE_OVERRIDES_FORM) {
    findings.push("Based on available facts, commercial substance may override the stated legal form.");
  }

  return findings;
}

function analyzeEconomicSubstance(input, options = {}) {
  const text = getInputText(input, options);

  const legalForm = analyzeLegalForm(text);
  const commercialSubstance = analyzeCommercialSubstance(text);
  const mismatch = analyzeMismatch(text);
  const shamSimulationRisk = analyzeShamSimulationRisk(text);
  const taxAvoidanceEvasion = analyzeTaxAvoidanceEvasion(text);
  const controlRiskMargin = analyzeControlRiskMargin(text);

  const substanceConclusion = determineSubstanceResult(
    legalForm,
    commercialSubstance,
    mismatch,
    shamSimulationRisk,
    taxAvoidanceEvasion
  );

  const overallRisk = computeOverallRisk(
    text,
    mismatch,
    shamSimulationRisk,
    taxAvoidanceEvasion
  );

  const requiredEvidence = buildRequiredEvidence(text, substanceConclusion);

  return {
    engine: "TINA_ECONOMIC_SUBSTANCE_ENGINE",
    version: "1.0.0",

    result: substanceConclusion.result,
    confidence: substanceConclusion.confidence,
    riskLevel: overallRisk,

    legalFormAnalysis: legalForm,
    commercialSubstanceAnalysis: commercialSubstance,
    formSubstanceMismatchAnalysis: mismatch,
    shamSimulationRiskAnalysis: shamSimulationRisk,
    taxAvoidanceEvasionAnalysis: taxAvoidanceEvasion,
    controlRiskMarginAnalysis: controlRiskMargin,

    findings: buildFindings(
      substanceConclusion,
      legalForm,
      commercialSubstance,
      mismatch,
      shamSimulationRisk,
      taxAvoidanceEvasion
    ),

    requiredEvidence,

    recommendedConclusionRule:
      substanceConclusion.result === SUBSTANCE_RESULT.SUBSTANCE_ALIGNED
        ? "Legal form may be respected, subject to supporting documents and consistency with actual conduct."
        : substanceConclusion.result === SUBSTANCE_RESULT.SUBSTANCE_OVERRIDES_FORM
          ? "Do not rely solely on the legal label. Analyze and present the transaction based on actual commercial substance."
          : "Do not issue a final conclusion until legal form, business purpose, actual conduct, and supporting evidence are verified.",

    limitationStatement:
      "Based on the available facts, the position is preliminary and subject to verification."
  };
}

function buildEconomicSubstanceInstruction(result) {
  if (!result || result.engine !== "TINA_ECONOMIC_SUBSTANCE_ENGINE") {
    throw new Error("Invalid economic substance result supplied.");
  }

  return {
    instruction: [
      "Use the economic substance result before final tax, accounting, or legal characterization.",
      "Do not rely solely on labels used by the parties or accounting entries.",
      "Compare legal form with actual conduct, control, risk, margin, business purpose, and flow of funds.",
      "If substance overrides form, explain the tax risk, BIR likely position, taxpayer defense, and required documentation.",
      "If sham, simulation, or evasion indicators exist, avoid definitive conclusions without legal and evidentiary review.",
      `Economic substance result: ${result.result}.`,
      `Risk level: ${result.riskLevel}.`,
      `Required limitation: ${result.limitationStatement}`
    ],
    result
  };
}

module.exports = {
  SUBSTANCE_RESULT,
  RISK_LEVEL,
  CONFIDENCE,
  analyzeEconomicSubstance,
  buildEconomicSubstanceInstruction
};
