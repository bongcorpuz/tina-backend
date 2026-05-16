// FILE: query-intent-engine.js
"use strict";

/**
 * TINA Enterprise Query Intent Engine
 * Version: 4.1.0
 *
 * Purpose:
 * - Detect legal/tax intent
 * - Detect issue classifications
 * - Detect adaptive response mode
 * - Detect routing requirements
 * - Produce orchestration-safe intent flags
 * - Feed context-orchestration-engine.js
 *
 * IMPORTANT:
 * This file MUST ONLY return compact orchestration-safe metadata.
 * NEVER attach large source payloads, debug dumps, or full engine outputs.
 */

import {
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc
} from "./issue-classification-engine.js";

const ENGINE_VERSION = "4.1.0";

/* =========================================================
 * ENUMS
 * =======================================================*/

const ISSUE_TYPE = Object.freeze({
  VAT_REFUND: "VAT_REFUND",
  VAT_LIABILITY: "VAT_LIABILITY",
  VAT_SUBSTANTIATION: "VAT_SUBSTANTIATION",
  VAT_EXEMPTION: "VAT_EXEMPTION",
  ZERO_RATED_SALES: "ZERO_RATED_SALES",

  INCOME_TAX: "INCOME_TAX",
  RCIT: "RCIT",
  MCIT: "MCIT",
  NOLCO: "NOLCO",

  WITHHOLDING: "WITHHOLDING",

  ASSESSMENT: "ASSESSMENT",
  TAX_REMEDIES: "TAX_REMEDIES",

  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",
  DOCTRINE: "DOCTRINE",
  CONFLICT_ANALYSIS: "CONFLICT_ANALYSIS",

  CONTRACT: "CONTRACT",
  TRANSACTION: "TRANSACTION",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",

  AUDIT: "AUDIT",
  ACCOUNTING: "ACCOUNTING",
  PFRS: "PFRS",

  ISSUANCE: "ISSUANCE",
  CASE_LAW: "CASE_LAW",

  GENERAL_TAX: "GENERAL_TAX"
});

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

const LEGAL_DIMENSION = Object.freeze({
  SUBSTANTIVE: "SUBSTANTIVE",
  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",
  FACTUAL: "FACTUAL",
  CONTRACTUAL: "CONTRACTUAL",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",
  TRANSACTION: "TRANSACTION",
  AUDIT: "AUDIT",
  GENERAL: "GENERAL"
});

/* =========================================================
 * HELPERS
 * =======================================================*/

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function safeArray(value) {
  if (!value) return [];

  return Array.isArray(value)
    ? value.filter(Boolean)
    : [value].filter(Boolean);
}

function normalizeIssue(value = "") {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    VAT: "VAT_LIABILITY",
    OUTPUT_VAT: "VAT_LIABILITY",
    INPUT_VAT: "VAT_REFUND",
    REFUND: "VAT_REFUND",
    EWT: "WITHHOLDING",
    CWT: "WITHHOLDING",
    FWT: "WITHHOLDING",
    RCIT: "INCOME_TAX",
    MCIT: "INCOME_TAX",
    NOLCO: "INCOME_TAX",
    PRINCIPAL_AGENT: "TRANSACTION",
    GROSS_NET: "TRANSACTION",
    PASS_THROUGH: "TRANSACTION",
    REIMBURSEMENT: "TRANSACTION",
    AGREEMENT: "CONTRACT"
  };

  return aliases[raw] || raw || null;
}

/* =========================================================
 * SIGNAL DETECTION
 * =======================================================*/

function detectIssueSignals(text = "") {
  const q = lower(text);

  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(
    /\b(vat refund|unutilized input vat|excess input vat|120\+30)\b/i.test(q),
    ISSUE_TYPE.VAT_REFUND
  );

  push(
    /\b(vat liability|output vat|subject to vat|vatable|what is vat|define vat)\b/i.test(q),
    ISSUE_TYPE.VAT_LIABILITY
  );

  push(
    /\b(vat exempt|section\s*109|zero-rated|zero rated)\b/i.test(q),
    ISSUE_TYPE.VAT_EXEMPTION
  );

  push(
    /\b(withholding|ewt|cwt|fwt)\b/i.test(q),
    ISSUE_TYPE.WITHHOLDING
  );

  push(
    /\b(income tax|rcit|mcit|nolco)\b/i.test(q),
    ISSUE_TYPE.INCOME_TAX
  );

  push(
    /\b(assessment|deficiency tax|loa|pan|fan|fld|protest)\b/i.test(q),
    ISSUE_TYPE.ASSESSMENT
  );

  push(
    /\b(invoice|receipt|substantiation|proof|evidence)\b/i.test(q),
    ISSUE_TYPE.EVIDENTIARY
  );

  push(
    /\b(contract|agreement|lease|concession)\b/i.test(q),
    ISSUE_TYPE.CONTRACT
  );

  push(
    /\b(principal|agent|pass-through|reimbursement|gross or net|bundled|economic substance)\b/i.test(q),
    ISSUE_TYPE.TRANSACTION
  );

  push(
    /\b(economic substance|substance over form)\b/i.test(q),
    ISSUE_TYPE.ECONOMIC_SUBSTANCE
  );

  push(
    /\b(audit|afs|pfrs|pas|working paper)\b/i.test(q),
    ISSUE_TYPE.AUDIT
  );

  push(
    /\b(case|jurisprudence|g\.?\s*r\.?\s*no\.?|supreme court|cta)\b/i.test(q),
    ISSUE_TYPE.CASE_LAW
  );

  push(
    /\b(rr|rmc|rmo|ramo|revenue regulation)\b/i.test(q),
    ISSUE_TYPE.ISSUANCE
  );

  push(
    /\b(conflict|prevails|override|hierarchy)\b/i.test(q),
    ISSUE_TYPE.CONFLICT_ANALYSIS
  );

  return unique(issues.length ? issues : [ISSUE_TYPE.GENERAL_TAX]);
}

function detectLegalDimensions(question = "") {
  const q = lower(question);

  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  push(
    /\b(taxable|liable|subject to|deductible|vatable)\b/i.test(q),
    LEGAL_DIMENSION.SUBSTANTIVE
  );

  push(
    /\b(file|filing|deadline|prescriptive|appeal|protest)\b/i.test(q),
    LEGAL_DIMENSION.PROCEDURAL
  );

  push(
    /\b(invoice|receipt|substantiation|evidence|proof)\b/i.test(q),
    LEGAL_DIMENSION.EVIDENTIARY
  );

  push(
    /\b(facts|actual|circumstances|transaction structure)\b/i.test(q),
    LEGAL_DIMENSION.FACTUAL
  );

  push(
    /\b(contract|agreement|lease|clause)\b/i.test(q),
    LEGAL_DIMENSION.CONTRACTUAL
  );

  push(
    /\b(economic substance|substance over form)\b/i.test(q),
    LEGAL_DIMENSION.ECONOMIC_SUBSTANCE
  );

  push(
    /\b(principal|agent|pass-through|reimbursement)\b/i.test(q),
    LEGAL_DIMENSION.TRANSACTION
  );

  push(
    /\b(audit|afs|working paper|pfrs)\b/i.test(q),
    LEGAL_DIMENSION.AUDIT
  );

  return unique(
    dimensions.length
      ? dimensions
      : [LEGAL_DIMENSION.GENERAL]
  );
}

/* =========================================================
 * ISSUE CLASSIFICATION
 * =======================================================*/

function safeIssueClassification(question = "") {
  try {
    const raw = classifyTaxIssue(question);

    return {
      ...raw,

      primaryIssue:
        normalizeIssue(
          raw.primaryIssue ||
          raw.primary_issue ||
          "GENERAL_TAX"
        ) || "GENERAL_TAX",

      subIssues: unique([
        normalizeIssue(raw.primaryIssue),
        ...safeArray(raw.subIssues).map(normalizeIssue)
      ]),

      legalQuestionPresented:
        raw.legalQuestionPresented ||
        question,

      retrievalStrategy:
        raw.retrievalStrategy ||
        "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",

      targetAuthorities:
        safeArray(raw.targetAuthorities),

      factSensitivity:
        raw.factSensitivity || "moderate"
    };
  } catch (error) {
    return {
      primaryIssue: "GENERAL_TAX",
      subIssues: ["GENERAL_TAX"],
      legalQuestionPresented: question,
      retrievalStrategy:
        "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",
      targetAuthorities: [],
      factSensitivity: "moderate",
      classificationError:
        error?.message || "classification failed"
    };
  }
}

/* =========================================================
 * ADAPTIVE MODE
 * =======================================================*/

function detectAdaptiveMode(
  question = "",
  issueTypes = [],
  issueClassification = {}
) {
  const q = lower(question);

  if (
    issueTypes.includes(ISSUE_TYPE.AUDIT) ||
    issueTypes.includes(ISSUE_TYPE.PFRS)
  ) {
    return RESPONSE_MODE.AUDIT;
  }

  if (
    issueTypes.includes(ISSUE_TYPE.CASE_LAW) ||
    issueTypes.includes(ISSUE_TYPE.CONFLICT_ANALYSIS)
  ) {
    return RESPONSE_MODE.TECHNICAL;
  }

  if (
    issueTypes.includes(ISSUE_TYPE.TRANSACTION) ||
    issueTypes.includes(ISSUE_TYPE.ECONOMIC_SUBSTANCE)
  ) {
    return RESPONSE_MODE.TRANSACTION;
  }

  if (
    issueTypes.includes(ISSUE_TYPE.CONTRACT)
  ) {
    return RESPONSE_MODE.CONTRACT;
  }

  if (
    issueTypes.includes(ISSUE_TYPE.EVIDENTIARY)
  ) {
    return RESPONSE_MODE.EVIDENCE_HEAVY;
  }

  if (
    issueTypes.includes(ISSUE_TYPE.ASSESSMENT)
  ) {
    return RESPONSE_MODE.LITIGATION;
  }

  if (
    /\b(quick|brief|short answer)\b/i.test(q)
  ) {
    return RESPONSE_MODE.QUICK;
  }

  if (
    /\b(reviewer|cpale|quiz|layman|taglish)\b/i.test(q)
  ) {
    return RESPONSE_MODE.REVIEWER;
  }

  return RESPONSE_MODE.STANDARD;
}

/* =========================================================
 * ENGINE ROUTING
 * =======================================================*/

function buildEngineRouting({
  issueTypes = [],
  legalDimensions = []
}) {
  return {
    needsProvisionCitationEngine: true,

    needsJurisprudenceEngine:
      issueTypes.includes(ISSUE_TYPE.CASE_LAW) ||
      issueTypes.includes(ISSUE_TYPE.DOCTRINE) ||
      issueTypes.includes(ISSUE_TYPE.CONFLICT_ANALYSIS),

    needsSupersessionEngine:
      issueTypes.includes(ISSUE_TYPE.ISSUANCE),

    needsTransactionCharacterization:
      issueTypes.includes(ISSUE_TYPE.TRANSACTION),

    needsEconomicSubstance:
      issueTypes.includes(ISSUE_TYPE.ECONOMIC_SUBSTANCE),

    needsContractInterpretation:
      issueTypes.includes(ISSUE_TYPE.CONTRACT),

    needsEvidenceEvaluation:
      legalDimensions.includes(LEGAL_DIMENSION.EVIDENTIARY),

    needsRiskScoring: true,
    needsPositionStrength: true,
    needsAdaptivePlanner: true,
    needsAnswerRenderer: true,

    issueFirstRetrievalRequired: true,
    targetAuthorityOrderingRequired: true,
    strictConflictGateRequired: true
  };
}

/* =========================================================
 * ORCHESTRATION FLAGS
 * =======================================================*/

function buildOrchestrationIntent({
  question = "",
  issueTypes = [],
  legalDimensions = [],
  adaptiveMode = RESPONSE_MODE.STANDARD,
  issueClassification = {},
  engineRouting = {},
  riskFlags = [],
  detectedIntent = "GENERAL_TAX_QUERY"
}) {
  const q = lower(question);

  const requiresLegalAnalysis =
    issueTypes.includes(ISSUE_TYPE.CASE_LAW) ||
    issueTypes.includes(ISSUE_TYPE.DOCTRINE) ||
    issueTypes.includes(ISSUE_TYPE.CONFLICT_ANALYSIS) ||
    Boolean(engineRouting.needsJurisprudenceEngine);

  const requiresRiskAnalysis =
    Boolean(engineRouting.needsRiskScoring);

  const requiresFactPatternAnalysis =
    legalDimensions.includes(LEGAL_DIMENSION.FACTUAL) ||
    issueTypes.includes(ISSUE_TYPE.TRANSACTION);

  const requiresEvidenceEvaluation =
    Boolean(engineRouting.needsEvidenceEvaluation);

  const requiresContractInterpretation =
    Boolean(engineRouting.needsContractInterpretation);

  const requiresTransactionCharacterization =
    Boolean(engineRouting.needsTransactionCharacterization);

  const requiresEconomicSubstance =
    Boolean(engineRouting.needsEconomicSubstance);

  const requiresSourceOnly =
    /\b(source only|citation only|show source|legal basis only)\b/i.test(q);

  const requiresSimpleDefinition =
    issueClassification.primaryIssue === "VAT_LIABILITY" &&
    /\b(what is|define|meaning of)\b/i.test(q);

  return {
    intent: detectedIntent,

    adaptiveMode,
    responseMode: adaptiveMode,

    requiresLegalAnalysis,
    requiresRiskAnalysis,
    requiresFactPatternAnalysis,
    requiresEvidenceEvaluation,
    requiresContractInterpretation,
    requiresTransactionCharacterization,
    requiresEconomicSubstance,
    requiresSourceOnly,
    requiresSimpleDefinition,

    requiresProvisionCitation:
      Boolean(engineRouting.needsProvisionCitationEngine),

    requiresJurisprudence:
      Boolean(engineRouting.needsJurisprudenceEngine),

    requiresSupersessionCheck:
      Boolean(engineRouting.needsSupersessionEngine),

    requiresStrictConflictGate: true,

    complexity:
      requiresFactPatternAnalysis ||
      requiresTransactionCharacterization ||
      requiresEconomicSubstance
        ? "complex"
        : requiresLegalAnalysis ||
          requiresRiskAnalysis
          ? "moderate"
          : "simple",

    contextPolicy: {
      useContextOrchestrationEngine: true,
      compressSourcesBeforeOpenAI: true,
      finalTrimBeforeOpenAI: true,
      preventRawFullDocumentInjection: true,
      preventFullDebugObjectInjection: true,
      preventFullEngineOutputInjection: true
    }
  };
}

/* =========================================================
 * MAIN ANALYZER
 * =======================================================*/

function analyzeQueryIntent(question = "", options = {}) {
  const cleanQuestion = normalizeText(question);

  const issueClassification =
    options.issueClassification ||
    safeIssueClassification(cleanQuestion);

  const issueTypes =
    detectIssueSignals(cleanQuestion);

  const legalDimensions =
    detectLegalDimensions(cleanQuestion);

  const adaptiveMode =
    detectAdaptiveMode(
      cleanQuestion,
      issueTypes,
      issueClassification
    );

  const detectedIntent =
    issueClassification.primaryIssue ||
    "GENERAL_TAX_QUERY";

  const riskFlags = [];

  const engineRouting =
    buildEngineRouting({
      issueTypes,
      legalDimensions
    });

  const orchestrationIntent =
    buildOrchestrationIntent({
      question: cleanQuestion,
      issueTypes,
      legalDimensions,
      adaptiveMode,
      issueClassification,
      engineRouting,
      riskFlags,
      detectedIntent
    });

  const payload = {
    engine: "TINA_QUERY_INTENT_ENGINE",
    version: ENGINE_VERSION,

    originalQuestion: question,
    normalizedQuestion: cleanQuestion,

    issueClassification,

    detectedIntent,

    adaptiveMode,
    detectedMode: adaptiveMode,

    issueTypes,
    legalDimensions,

    retrievalStrategy:
      issueClassification.retrievalStrategy,

    targetAuthorities:
      issueClassification.targetAuthorities,

    engineRouting,

    orchestrationIntent,

    intentFlags: orchestrationIntent,

    requiresLegalAnalysis:
      orchestrationIntent.requiresLegalAnalysis,

    requiresRiskAnalysis:
      orchestrationIntent.requiresRiskAnalysis,

    requiresFactPatternAnalysis:
      orchestrationIntent.requiresFactPatternAnalysis,

    requiresEvidenceEvaluation:
      orchestrationIntent.requiresEvidenceEvaluation,

    requiresContractInterpretation:
      orchestrationIntent.requiresContractInterpretation,

    requiresTransactionCharacterization:
      orchestrationIntent.requiresTransactionCharacterization,

    requiresEconomicSubstance:
      orchestrationIntent.requiresEconomicSubstance,

    requiresSourceOnly:
      orchestrationIntent.requiresSourceOnly,

    requiresSimpleDefinition:
      orchestrationIntent.requiresSimpleDefinition,

    orchestrationMetadata: {
      contextOrchestrationCompatible: true,
      plannerCompatible: true,
      rendererCompatible: true,
      adaptivePipelineCompatible: true,
      issueClassificationCompatible: true,
      targetAuthorityCompatible: true,
      strictConflictGateCompatible: true
    },

    tinaInstruction:
      "Classify issue first, retrieve issue-specific authorities only, enforce hierarchy, suppress unrelated jurisprudence, do not declare conflict without same-issue opposite-holding analysis, disclose evidentiary limits, and avoid citation dumping."
  };

  if (!options.skipSearchBuild) {
    try {
      payload.searchTerms =
        buildIssueClassificationSearchQueries(
          issueClassification,
          8
        );
    } catch {
      payload.searchTerms = [
        cleanQuestion,
        issueClassification.primaryIssue
      ].filter(Boolean);
    }
  }

  return payload;
}

/* =========================================================
 * HEALTH CHECK
 * =======================================================*/

function queryIntentEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_QUERY_INTENT_ENGINE",
    version: ENGINE_VERSION,

    contextOrchestrationCompatible: true,
    orchestrationIntentCompatible: true,
    cleanIntentFlagsReady: true,

    plannerCompatible: true,
    rendererCompatible: true,
    retrievalCompatible: true,
    issueClassificationCompatible: true,
    issueFirstRetrievalReady: true,
    sourceOrderingPolicyReady: true,
    conflictDisplayPolicyReady: true
  };
}

/* =========================================================
 * EXPORTS
 * =======================================================*/

export {
  ENGINE_VERSION,

  ISSUE_TYPE,
  RESPONSE_MODE,
  LEGAL_DIMENSION,

  normalizeIssue,

  analyzeQueryIntent,

  queryIntentEngineHealthCheck
};

export default {
  ENGINE_VERSION,

  ISSUE_TYPE,
  RESPONSE_MODE,
  LEGAL_DIMENSION,

  normalizeIssue,

  analyzeQueryIntent,

  queryIntentEngineHealthCheck
};
