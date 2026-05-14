// FILE: adaptive-tina-master-prompt.js
"use strict";

/**
 * TINA Enterprise Adaptive Prompt Registry
 * TINA v3 Adaptive Orchestration Layer
 *
 * Central source of truth for:
 * - adaptive modes
 * - planner contracts
 * - renderer contracts
 * - routing metadata
 * - normalized enums
 * - orchestration compatibility
 * - conclusion gating contracts
 * - engine compatibility
 */

const TINA_VERSION = "3.0.0";

/* =========================================================
 * LEGACY MODE ALIASES
 * ========================================================= */

const LEGACY_MODE_ALIASES = Object.freeze({
  ASK: "STANDARD_TAX_MODE",
  TAX_EXPERT: "TECHNICAL_TAX_MODE",
  TAX_REVIEWER: "REVIEWER_LEARNING_MODE",
  QUIZ_MASTER: "REVIEWER_LEARNING_MODE",
  ADAPTIVE_QUIZ: "REVIEWER_LEARNING_MODE",
  SOURCE_FINDER: "STANDARD_TAX_MODE",
  FEEDBACK: "STANDARD_TAX_MODE",
  LEARNING_PROGRESS: "REVIEWER_LEARNING_MODE"
});

/* =========================================================
 * NORMALIZED MODES
 * ========================================================= */

const TINA_MODES = Object.freeze({
  QUICK_MODE: "QUICK_MODE",

  STANDARD_TAX_MODE: "STANDARD_TAX_MODE",

  TECHNICAL_TAX_MODE: "TECHNICAL_TAX_MODE",

  AUDIT_MODE: "AUDIT_MODE",

  LITIGATION_LEGAL_DEFENSE_MODE:
    "LITIGATION_LEGAL_DEFENSE_MODE",

  TRANSACTION_CHARACTERIZATION_MODE:
    "TRANSACTION_CHARACTERIZATION_MODE",

  CONTRACT_INTERPRETATION_MODE:
    "CONTRACT_INTERPRETATION_MODE",

  EVIDENCE_EVALUATION_MODE:
    "EVIDENCE_EVALUATION_MODE",

  FACT_PATTERN_ANALYSIS_MODE:
    "FACT_PATTERN_ANALYSIS_MODE",

  REVIEWER_LEARNING_MODE:
    "REVIEWER_LEARNING_MODE"
});

/* =========================================================
 * RESPONSE MODES
 * ========================================================= */

const RESPONSE_MODES = Object.freeze({
  QUICK: "QUICK",

  STANDARD: "STANDARD",

  TECHNICAL: "TECHNICAL",

  AUDIT: "AUDIT",

  LITIGATION: "LITIGATION",

  TRANSACTION: "TRANSACTION",

  CONTRACT: "CONTRACT",

  EVIDENCE_HEAVY: "EVIDENCE_HEAVY",

  REVIEWER: "REVIEWER"
});

/* =========================================================
 * OUTPUT DEPTH
 * ========================================================= */

const OUTPUT_DEPTH = Object.freeze({
  CONCISE: "CONCISE",

  STANDARD: "STANDARD",

  STRUCTURED: "STRUCTURED",

  COMPREHENSIVE: "COMPREHENSIVE",

  SIMPLE: "SIMPLE"
});

/* =========================================================
 * CONCLUSION GATING
 * ========================================================= */

const CONCLUSION_RESTRICTIONS = Object.freeze({
  DIRECT_CONCLUSION_ALLOWED:
    "DIRECT_CONCLUSION_ALLOWED",

  PRELIMINARY_CONCLUSION_ONLY:
    "PRELIMINARY_CONCLUSION_ONLY",

  DEFER_CONCLUSION:
    "DEFER_CONCLUSION",

  USE_QUALIFIED_CONCLUSION:
    "USE_QUALIFIED_CONCLUSION"
});

/* =========================================================
 * CORE IDENTITY
 * ========================================================= */

const TINA_IDENTITY = `
You are TINA — Tax Intelligence and Analysis.

You are:
- Philippine tax lawyer
- CPA
- audit partner
- legal researcher
- litigation strategist
- transaction analyst
- evidence evaluator

You are NOT merely a citation retriever.

You are an adaptive legal-tax reasoning system.

You must adapt:
- legal posture
- audit posture
- litigation posture
- evidence sensitivity
- transaction analysis
- response structure
- conclusion strength

based on:
- factual completeness
- evidence quality
- legal hierarchy
- doctrinal conflict
- tax exposure
- audit exposure
- litigation exposure
- transaction complexity
- user posture
`.trim();

/* =========================================================
 * HIERARCHY RULE
 * ========================================================= */

const TINA_HIERARCHY_RULE = `
Apply Philippine hierarchy:

1. Constitution
2. NIRC / Republic Act
3. Revenue Regulations
4. Revenue Memorandum Circulars
5. Revenue Memorandum Orders / RAMO
6. BIR Rulings
7. Supreme Court
8. CTA / Court of Appeals
9. Secondary materials

Never elevate lower authority above higher authority.
`.trim();

/* =========================================================
 * FACTUAL RULE
 * ========================================================= */

const TINA_FACTUAL_REASONING_RULE = `
Before strong conclusion disclose:
- known facts
- assumptions
- missing facts
- evidentiary gaps
- unresolved ambiguities
- alternative characterization

If incomplete:
"Based on the available facts, the position is preliminary and subject to verification."
`.trim();

/* =========================================================
 * CONFLICT RULE
 * ========================================================= */

const TINA_CONFLICT_RULE = `
Never merely say:
"Conflict detected: YES."

Explain:
- exact issue
- direct vs partial vs apparent conflict
- controlling authority
- why it controls
- doctrinal distinction
- evidentiary distinction
- factual distinction
`.trim();

/* =========================================================
 * RESPONSE RULE
 * ========================================================= */

const TINA_RESPONSE_RULE = `
OUTPUT RULES:
- concise for simple questions
- structured for audit/legal issues
- doctrine-heavy for litigation
- evidence-sensitive for factual disputes
- practical for business strategy
- never overstate certainty
- never fabricate authorities
- never provide strong conclusion when evidence is incomplete
- distinguish legal conclusion, accounting treatment, audit risk, and evidentiary status
`.trim();

/* =========================================================
 * MASTER PROMPT
 * ========================================================= */

const ADAPTIVE_MASTER_PROMPT = `
${TINA_IDENTITY}

${TINA_HIERARCHY_RULE}

${TINA_FACTUAL_REASONING_RULE}

${TINA_CONFLICT_RULE}

${TINA_RESPONSE_RULE}
`.trim();

/* =========================================================
 * MODE PROMPTS
 * ========================================================= */

const MODE_PROMPTS = Object.freeze({
  QUICK_MODE: `
Direct concise answer.
Minimal explanation.
`.trim(),

  STANDARD_TAX_MODE: `
Use standard Philippine tax analysis.
`.trim(),

  TECHNICAL_TAX_MODE: `
Use technical doctrinal tax analysis.
Apply hierarchy analysis.
`.trim(),

  AUDIT_MODE: `
Use audit-defensible analysis.

Focus on:
- evidence
- accounting
- PFRS
- misstatement risk
- audit defensibility
`.trim(),

  LITIGATION_LEGAL_DEFENSE_MODE: `
Use litigation-grade legal analysis.

Focus on:
- doctrine
- hierarchy
- taxpayer defense
- BIR position
- conflict analysis
`.trim(),

  TRANSACTION_CHARACTERIZATION_MODE: `
Focus on:
- legal form
- economic substance
- control
- principal-agent
- bundled analysis
- reimbursement/pass-through analysis
`.trim(),

  CONTRACT_INTERPRETATION_MODE: `
Focus on:
- contractual rights
- obligations
- consideration
- risk allocation
- tax clauses
- actual practice versus written terms
`.trim(),

  EVIDENCE_EVALUATION_MODE: `
Focus on:
- documentary support
- unsupported facts
- contradictions
- audit-sensitive items
- evidentiary gaps
`.trim(),

  FACT_PATTERN_ANALYSIS_MODE: `
Focus on:
- reconstruction
- ambiguity
- assumptions
- missing facts
- unresolved issues
`.trim(),

  REVIEWER_LEARNING_MODE: `
Use simple reviewer-style explanation.
Use examples and layman's terms.
Avoid excessive legal drafting.
`.trim()
});

/* =========================================================
 * RESPONSE STRUCTURES
 * ========================================================= */

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
    "E. AUDIT RISK",
    "F. REQUIRED AUDIT EVIDENCE",
    "G. RECOMMENDED AUDIT POSITION"
  ],

  LITIGATION: [
    "A. DIRECT ANSWER",
    "B. ISSUE FOR RESOLUTION",
    "C. CONTROLLING LEGAL BASIS",
    "D. SUPPORTING JURISPRUDENCE",
    "E. BIR POSITION",
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

  EVIDENCE_HEAVY: [
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

/* =========================================================
 * ROUTING METADATA
 * ========================================================= */

const MODE_ROUTING_METADATA = Object.freeze({
  QUICK_MODE: {
    responseMode: RESPONSE_MODES.QUICK,
    outputDepth: OUTPUT_DEPTH.CONCISE,
    structure: RESPONSE_STRUCTURES.QUICK,
    requiresEvidenceDisclosure: false,
    requiresConflictAnalysis: false,
    requiresRiskScoring: false,
    requiresConclusionGating: false
  },

  STANDARD_TAX_MODE: {
    responseMode: RESPONSE_MODES.STANDARD,
    outputDepth: OUTPUT_DEPTH.STANDARD,
    structure: RESPONSE_STRUCTURES.STANDARD,
    requiresEvidenceDisclosure: false,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  TECHNICAL_TAX_MODE: {
    responseMode: RESPONSE_MODES.TECHNICAL,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    structure: RESPONSE_STRUCTURES.TECHNICAL,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  AUDIT_MODE: {
    responseMode: RESPONSE_MODES.AUDIT,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    structure: RESPONSE_STRUCTURES.AUDIT,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  LITIGATION_LEGAL_DEFENSE_MODE: {
    responseMode: RESPONSE_MODES.LITIGATION,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    structure: RESPONSE_STRUCTURES.LITIGATION,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  TRANSACTION_CHARACTERIZATION_MODE: {
    responseMode: RESPONSE_MODES.TRANSACTION,
    outputDepth: OUTPUT_DEPTH.STRUCTURED,
    structure: RESPONSE_STRUCTURES.TRANSACTION,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  CONTRACT_INTERPRETATION_MODE: {
    responseMode: RESPONSE_MODES.CONTRACT,
    outputDepth: OUTPUT_DEPTH.STRUCTURED,
    structure: RESPONSE_STRUCTURES.CONTRACT,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  EVIDENCE_EVALUATION_MODE: {
    responseMode: RESPONSE_MODES.EVIDENCE_HEAVY,
    outputDepth: OUTPUT_DEPTH.STRUCTURED,
    structure: RESPONSE_STRUCTURES.EVIDENCE_HEAVY,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: false,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  FACT_PATTERN_ANALYSIS_MODE: {
    responseMode: RESPONSE_MODES.TECHNICAL,
    outputDepth: OUTPUT_DEPTH.STRUCTURED,
    structure: RESPONSE_STRUCTURES.TECHNICAL,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  REVIEWER_LEARNING_MODE: {
    responseMode: RESPONSE_MODES.REVIEWER,
    outputDepth: OUTPUT_DEPTH.SIMPLE,
    structure: RESPONSE_STRUCTURES.REVIEWER,
    requiresEvidenceDisclosure: false,
    requiresConflictAnalysis: false,
    requiresRiskScoring: false,
    requiresConclusionGating: false
  }
});

/* =========================================================
 * NORMALIZER
 * ========================================================= */

function normalizeMode(mode = "") {
  const clean = String(mode || "")
    .trim()
    .toUpperCase();

  if (LEGACY_MODE_ALIASES[clean]) {
    return LEGACY_MODE_ALIASES[clean];
  }

  if (TINA_MODES[clean]) {
    return clean;
  }

  if (clean.includes("AUDIT")) return TINA_MODES.AUDIT_MODE;
  if (clean.includes("LITIGATION") || clean.includes("LEGAL")) {
    return TINA_MODES.LITIGATION_LEGAL_DEFENSE_MODE;
  }
  if (clean.includes("TRANSACTION")) {
    return TINA_MODES.TRANSACTION_CHARACTERIZATION_MODE;
  }
  if (clean.includes("CONTRACT")) {
    return TINA_MODES.CONTRACT_INTERPRETATION_MODE;
  }
  if (clean.includes("EVIDENCE")) {
    return TINA_MODES.EVIDENCE_EVALUATION_MODE;
  }
  if (clean.includes("FACT")) {
    return TINA_MODES.FACT_PATTERN_ANALYSIS_MODE;
  }
  if (clean.includes("REVIEW") || clean.includes("QUIZ")) {
    return TINA_MODES.REVIEWER_LEARNING_MODE;
  }
  if (clean.includes("TECHNICAL") || clean.includes("DOCTRINE")) {
    return TINA_MODES.TECHNICAL_TAX_MODE;
  }
  if (clean.includes("QUICK")) {
    return TINA_MODES.QUICK_MODE;
  }

  return TINA_MODES.STANDARD_TAX_MODE;
}

/* =========================================================
 * MODE PROMPT
 * ========================================================= */

function getModePrompt(mode = "") {
  const normalized = normalizeMode(mode);

  return (
    MODE_PROMPTS[normalized] ||
    MODE_PROMPTS.STANDARD_TAX_MODE
  );
}

/* =========================================================
 * ROUTING METADATA
 * ========================================================= */

function getModeRoutingMetadata(mode = "") {
  const normalized = normalizeMode(mode);

  return (
    MODE_ROUTING_METADATA[normalized] ||
    MODE_ROUTING_METADATA.STANDARD_TAX_MODE
  );
}

/* =========================================================
 * PROMPT BUNDLE
 * ========================================================= */

function buildPromptBundle(
  mode = "STANDARD_TAX_MODE",
  extraInstructions = []
) {
  const normalized = normalizeMode(mode);

  const metadata =
    getModeRoutingMetadata(normalized);

  return [
    ADAPTIVE_MASTER_PROMPT,

    `ACTIVE MODE: ${normalized}`,

    `RESPONSE MODE: ${metadata.responseMode}`,

    `OUTPUT DEPTH: ${metadata.outputDepth}`,

    metadata.requiresEvidenceDisclosure
      ? "MANDATORY: disclose evidentiary gaps."
      : null,

    metadata.requiresConflictAnalysis
      ? "MANDATORY: explain doctrinal conflicts."
      : null,

    metadata.requiresConclusionGating
      ? "MANDATORY: apply conclusion gating."
      : null,

    getModePrompt(normalized),

    ...(Array.isArray(extraInstructions)
      ? extraInstructions
      : [extraInstructions])
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
}

/* =========================================================
 * PLANNER PAYLOAD
 * ========================================================= */

function buildPlannerPayload(mode = "") {
  const normalized = normalizeMode(mode);

  const metadata =
    getModeRoutingMetadata(normalized);

  return {
    tinaVersion: TINA_VERSION,

    normalizedMode: normalized,

    responseMode: metadata.responseMode,

    outputDepth: metadata.outputDepth,

    structure: metadata.structure,

    requiresEvidenceDisclosure:
      metadata.requiresEvidenceDisclosure,

    requiresConflictAnalysis:
      metadata.requiresConflictAnalysis,

    requiresRiskScoring:
      metadata.requiresRiskScoring,

    requiresConclusionGating:
      metadata.requiresConclusionGating,

    conclusionRule: metadata.requiresConclusionGating
      ? {
          allowStrongConclusion: false,
          restriction:
            CONCLUSION_RESTRICTIONS.PRELIMINARY_CONCLUSION_ONLY,
          requiredLanguage:
            "Based on the available facts, the position is preliminary and subject to verification."
        }
      : {
          allowStrongConclusion: true,
          restriction:
            CONCLUSION_RESTRICTIONS.DIRECT_CONCLUSION_ALLOWED,
          requiredLanguage:
            "A direct conclusion may be given if supported by legal basis and evidence."
        }
  };
}

/* =========================================================
 * ROUTING CONTRACT
 * ========================================================= */

function buildAdaptiveRoutingContract(mode = "") {
  const planner =
    buildPlannerPayload(mode);

  return {
    ...planner,

    plannerCompatible: true,

    rendererCompatible: true,

    riskCompatible: true,

    evidenceCompatible: true,

    conclusionGatingCompatible: true,

    orchestrationCompatible: true,

    adaptivePipelineCompatible: true
  };
}

/* =========================================================
 * HEALTH CHECK
 * ========================================================= */

function adaptiveMasterPromptHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ADAPTIVE_MASTER_PROMPT_REGISTRY",
    version: TINA_VERSION,
    plannerCompatible: true,
    rendererCompatible: true,
    orchestrationCompatible: true
  };
}

/* =========================================================
 * EXPORTS
 * ========================================================= */

module.exports = {
  TINA_VERSION,

  LEGACY_MODE_ALIASES,

  TINA_MODES,

  RESPONSE_MODES,

  OUTPUT_DEPTH,

  CONCLUSION_RESTRICTIONS,

  TINA_IDENTITY,

  TINA_HIERARCHY_RULE,

  TINA_FACTUAL_REASONING_RULE,

  TINA_CONFLICT_RULE,

  TINA_RESPONSE_RULE,

  ADAPTIVE_MASTER_PROMPT,

  MODE_PROMPTS,

  RESPONSE_STRUCTURES,

  MODE_ROUTING_METADATA,

  normalizeMode,

  getModePrompt,

  getModeRoutingMetadata,

  buildPromptBundle,

  buildPlannerPayload,

  buildAdaptiveRoutingContract,

  adaptiveMasterPromptHealthCheck,

  getAdaptiveMasterPrompt() {
    return ADAPTIVE_MASTER_PROMPT;
  }
};
