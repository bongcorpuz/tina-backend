"use strict";

/**
 * adaptive-tina-master-prompt.js
 *
 * Enterprise Adaptive Prompt Registry
 * TINA v2 Adaptive Orchestration Layer
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

/* =========================================================
 * VERSION
 * ========================================================= */

const TINA_VERSION = "2.1.0";

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
  SHORT: "SHORT",

  STANDARD: "STANDARD",

  COMPREHENSIVE: "COMPREHENSIVE"
});

/* =========================================================
 * CONCLUSION GATING
 * ========================================================= */

const CONCLUSION_RESTRICTIONS = Object.freeze({
  DIRECT_CONCLUSION_ALLOWED:
    "DIRECT_CONCLUSION_ALLOWED",

  PRELIMINARY_CONCLUSION_ONLY:
    "PRELIMINARY_CONCLUSION_ONLY",

  DEFER_STRONG_CONCLUSION:
    "DEFER_STRONG_CONCLUSION"
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
4. RMC
5. RMO / RAMO
6. BIR Rulings
7. Supreme Court
8. CTA / CA
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
 * MASTER PROMPT
 * ========================================================= */

const ADAPTIVE_MASTER_PROMPT = `
${TINA_IDENTITY}

${TINA_HIERARCHY_RULE}

${TINA_FACTUAL_REASONING_RULE}

${TINA_CONFLICT_RULE}

OUTPUT RULES:
- concise for simple questions
- structured for audit/legal issues
- doctrine-heavy for litigation
- evidence-sensitive for factual disputes
- practical for business strategy
- never overstate certainty
- never fabricate authorities
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
`.trim(),

  AUDIT_MODE: `
Use audit-defensible analysis.
Focus on:
- evidence
- accounting
- PFRS
- misstatement risk
`.trim(),

  LITIGATION_LEGAL_DEFENSE_MODE: `
Use litigation-grade legal analysis.
Focus on:
- doctrine
- hierarchy
- taxpayer defense
- BIR position
`.trim(),

  TRANSACTION_CHARACTERIZATION_MODE: `
Focus on:
- legal form
- economic substance
- control
- principal-agent
- bundled analysis
`.trim(),

  CONTRACT_INTERPRETATION_MODE: `
Focus on:
- contractual rights
- obligations
- consideration
- risk allocation
- tax clauses
`.trim(),

  EVIDENCE_EVALUATION_MODE: `
Focus on:
- documentary support
- unsupported facts
- contradictions
- audit-sensitive items
`.trim(),

  FACT_PATTERN_ANALYSIS_MODE: `
Focus on:
- reconstruction
- ambiguity
- assumptions
- missing facts
`.trim(),

  REVIEWER_LEARNING_MODE: `
Use simple reviewer-style explanation.
Use examples and layman's terms.
`.trim()
});

/* =========================================================
 * RESPONSE STRUCTURES
 * ========================================================= */

const RESPONSE_STRUCTURES = Object.freeze({
  STANDARD: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. PRACTICAL APPLICATION"
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
  ]
});

/* =========================================================
 * ROUTING METADATA
 * ========================================================= */

const MODE_ROUTING_METADATA = Object.freeze({
  QUICK_MODE: {
    responseMode: RESPONSE_MODES.QUICK,
    outputDepth: OUTPUT_DEPTH.SHORT,
    structure: RESPONSE_STRUCTURES.STANDARD,
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
      metadata.requiresConclusionGating
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

  getAdaptiveMasterPrompt() {
    return ADAPTIVE_MASTER_PROMPT;
  }
};
