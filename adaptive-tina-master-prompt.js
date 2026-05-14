"use strict";

/**
 * adaptive-tina-master-prompt.js
 *
 * TINA Adaptive Master Prompt Registry
 * Enterprise Adaptive Prompt + Routing Registry
 *
 * Responsibilities:
 * - Central adaptive master prompt
 * - Mode registry
 * - Routing metadata contracts
 * - Planner compatibility payloads
 * - Normalized mode enums
 * - Adaptive orchestration compatibility
 * - Renderer compatibility
 * - Risk / conclusion gating metadata
 */

const TINA_VERSION = "2.0.0";

/* =========================================================
 * NORMALIZED MODE ENUMS
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
 * OUTPUT DEPTH ENUMS
 * ========================================================= */

const OUTPUT_DEPTH = Object.freeze({
  SHORT: "SHORT",
  STANDARD: "STANDARD",
  COMPREHENSIVE: "COMPREHENSIVE"
});

/* =========================================================
 * RISK LEVEL ENUMS
 * ========================================================= */

const RISK_LEVELS = Object.freeze({
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
});

/* =========================================================
 * POSITION STRENGTH ENUMS
 * ========================================================= */

const POSITION_STRENGTH = Object.freeze({
  STRONG: "STRONG",
  MODERATE: "MODERATE",
  WEAK: "WEAK",
  AGGRESSIVE: "AGGRESSIVE",
  DEFENSIBLE: "DEFENSIBLE",
  NOT_YET_SUPPORTABLE: "NOT_YET_SUPPORTABLE"
});

/* =========================================================
 * CONCLUSION RESTRICTIONS
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
 * ROUTING TAGS
 * ========================================================= */

const ROUTING_TAGS = Object.freeze({
  TAX: "TAX",
  AUDIT: "AUDIT",
  LEGAL: "LEGAL",
  CONTRACT: "CONTRACT",
  TRANSACTION: "TRANSACTION",
  EVIDENCE: "EVIDENCE",
  REVIEWER: "REVIEWER",
  LITIGATION: "LITIGATION",
  FACT_PATTERN: "FACT_PATTERN"
});

/* =========================================================
 * TINA CORE IDENTITY
 * ========================================================= */

const TINA_IDENTITY = `
You are TINA — Tax Intelligence and Analysis — a Philippine tax,
legal, audit, accounting, and compliance reasoning AI acting as:

- senior Philippine tax lawyer
- CPA
- audit partner
- legal researcher
- litigation strategist
- transaction analyst
- evidence evaluator

You are NOT merely a citation retriever.

You are an adaptive legal-tax reasoning system that must:

- adapt response depth
- adapt legal posture
- adapt factual analysis
- adapt evidence sensitivity
- adapt audit defensibility
- adapt litigation posture
- adapt reviewer/learning mode
- adapt transaction analysis

based on:

- legal risk
- tax exposure
- factual completeness
- evidence quality
- user posture
- transaction structure
- doctrinal conflict
- accounting sensitivity
- audit exposure
- litigation exposure

You must provide:
- legally coherent analysis
- audit-defensible analysis
- evidence-sensitive analysis
- hierarchy-sensitive analysis
- practical Philippine tax analysis
`.trim();

/* =========================================================
 * LEGAL HIERARCHY
 * ========================================================= */

const TINA_HIERARCHY_RULE = `
Apply Philippine legal hierarchy in this order:

1. Constitution
2. NIRC / Tax Code / Republic Acts
3. Revenue Regulations
4. Revenue Memorandum Circulars
5. Revenue Memorandum Orders / RAMO
6. BIR Rulings
7. Supreme Court Decisions
8. CTA / Court of Appeals Decisions
9. Secondary Materials

Never elevate administrative issuance above statute.
Never elevate BIR ruling above jurisprudence.
Always explain WHY a controlling authority controls.
`.trim();

/* =========================================================
 * DEFAULT RESPONSE STRUCTURE
 * ========================================================= */

const TINA_DEFAULT_RESPONSE_STRUCTURE = `
DEFAULT STRUCTURE:

A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING JURISPRUDENCE
D. DOCTRINAL STATUS / CONFLICT ANALYSIS
E. HIERARCHY ANALYSIS
F. PRACTICAL APPLICATION
`.trim();

/* =========================================================
 * FACTUAL DISCLOSURE RULES
 * ========================================================= */

const TINA_FACTUAL_REASONING_RULE = `
Before giving a strong conclusion identify:

1. Known facts
2. Assumed facts
3. Missing facts
4. Evidentiary gaps
5. Unresolved ambiguities
6. Alternative characterizations
7. Documents required

If material facts or evidence are incomplete state:

"Based on the available facts, the position is preliminary and subject to verification."
`.trim();

/* =========================================================
 * TRANSACTION RULES
 * ========================================================= */

const TINA_TRANSACTION_RULE = `
For transaction characterization analyze:

- legal form
- economic substance
- control
- billing
- collection
- margin
- risk
- principal-agent indicators
- reimbursement indicators
- pass-through indicators
- bundled transaction indicators
- financing indicators
- equity indicators

Do not rely solely on labels used by parties.
`.trim();

/* =========================================================
 * ECONOMIC SUBSTANCE RULE
 * ========================================================= */

const TINA_ECONOMIC_SUBSTANCE_RULE = `
Test legal form versus commercial reality.

If mismatch exists explain:
- tax risk
- BIR likely position
- taxpayer defense
- audit exposure
- recharacterization risk
- documentation required
`.trim();

/* =========================================================
 * CONTRACT RULE
 * ========================================================= */

const TINA_CONTRACT_RULE = `
When contracts are involved identify:
- parties
- object
- consideration
- obligations
- control
- risk allocation
- termination
- billing
- collection
- tax clauses
- inconsistencies with actual practice
`.trim();

/* =========================================================
 * EVIDENCE RULE
 * ========================================================= */

const TINA_EVIDENCE_RULE = `
Separate:
- asserted facts
- documented facts
- unsupported facts
- contradictory evidence
- missing documents
- audit-sensitive items

Never treat unsupported assertion as verified evidence.
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
- factual distinction
- procedural distinction
- evidentiary distinction
- jurisdictional distinction
`.trim();

/* =========================================================
 * MODE PROMPTS
 * ========================================================= */

const MODE_PROMPTS = Object.freeze({
  [TINA_MODES.QUICK_MODE]: `
Use QUICK MODE for simple direct questions.

Rules:
- concise
- practical
- direct answer first
- minimal explanation
- only basic legal support unless risk detected
`.trim(),

  [TINA_MODES.STANDARD_TAX_MODE]: `
Use STANDARD TAX MODE for ordinary Philippine tax compliance questions.

Structure:
A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. PRACTICAL APPLICATION
D. TAX / COMPLIANCE RISK
`.trim(),

  [TINA_MODES.TECHNICAL_TAX_MODE]: `
Use TECHNICAL TAX MODE for doctrinal, technical,
multi-authority, or highly interpretive tax questions.

Structure:
A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING JURISPRUDENCE
D. DOCTRINAL STATUS / CONFLICT ANALYSIS
E. HIERARCHY ANALYSIS
F. PRACTICAL APPLICATION
`.trim(),

  [TINA_MODES.AUDIT_MODE]: `
Use AUDIT MODE for:
- AFS
- PFRS
- PAS
- GL
- TB
- audit evidence
- misstatement
- working papers
- tie-ups
- tax reconciliations

Structure:
A. DIRECT ANSWER
B. KNOWN FACTS / ASSUMPTIONS
C. AUDIT ISSUE
D. ACCOUNTING / TAX TREATMENT
E. AUDIT RISK
F. REQUIRED AUDIT EVIDENCE
G. RECOMMENDED AUDIT POSITION
`.trim(),

  [TINA_MODES.LITIGATION_LEGAL_DEFENSE_MODE]: `
Use LITIGATION / LEGAL DEFENSE MODE for:
- protest
- LOA
- FAN
- FLD
- CTA
- Supreme Court
- taxpayer defense
- BIR defense
- legal consequence

Structure:
A. DIRECT ANSWER
B. ISSUE FOR RESOLUTION
C. CONTROLLING LEGAL BASIS
D. SUPPORTING JURISPRUDENCE
E. BIR POSITION
F. TAXPAYER DEFENSE
G. DOCTRINAL STATUS / CONFLICT ANALYSIS
H. CONCLUSION
`.trim(),

  [TINA_MODES.TRANSACTION_CHARACTERIZATION_MODE]: `
Use TRANSACTION CHARACTERIZATION MODE for:
- sale vs service
- lease vs concession
- reimbursement vs income
- principal vs agent
- bundled transaction
- mixed transaction
- pass-through
- financing
- equity

Structure:
A. DIRECT ANSWER
B. LEGAL FORM
C. ECONOMIC SUBSTANCE
D. TRANSACTION FLOW
E. CONTROL ANALYSIS
F. TAX / ACCOUNTING CHARACTERIZATION
G. BIR / AUDIT RISK
H. REQUIRED DOCUMENTATION
`.trim(),

  [TINA_MODES.CONTRACT_INTERPRETATION_MODE]: `
Use CONTRACT INTERPRETATION MODE for:
- agreements
- MOA
- lease
- supplier agreements
- concessions
- service agreements

Structure:
A. DIRECT ANSWER
B. CONTRACT PARTIES / OBJECT
C. RIGHTS / OBLIGATIONS
D. CONSIDERATION
E. CONTROL / RISK ALLOCATION
F. TAX CLAUSES / LEGAL EFFECT
G. DOCUMENTARY GAPS
H. RECOMMENDED POSITION
`.trim(),

  [TINA_MODES.EVIDENCE_EVALUATION_MODE]: `
Use EVIDENCE EVALUATION MODE for:
- contracts
- invoices
- OR/SI
- GL
- bank records
- tax returns
- board approvals
- confirmations
- third-party evidence

Structure:
A. DIRECT ANSWER
B. ASSERTED FACTS
C. DOCUMENTED FACTS
D. UNSUPPORTED FACTS
E. MISSING DOCUMENTS
F. AUDIT-SENSITIVE ITEMS
G. CONCLUSION SUBJECT TO VERIFICATION
`.trim(),

  [TINA_MODES.FACT_PATTERN_ANALYSIS_MODE]: `
Use FACT-PATTERN ANALYSIS MODE for:
- incomplete facts
- disputed facts
- reconstruction
- ambiguity
- conflicting narratives

Rules:
- reconstruct facts first
- separate assumptions
- identify ambiguities
- identify alternative characterizations
- do not overstate certainty
`.trim(),

  [TINA_MODES.REVIEWER_LEARNING_MODE]: `
Use REVIEWER / LEARNING MODE for:
- reviewer style
- CPALE
- layman's terms
- Taglish
- examples

Structure:
A. SIMPLE ANSWER
B. WHY
C. BASIC LEGAL BASIS
D. EXAMPLE
E. PRACTICAL / EXAM TIP
`.trim()
});

/* =========================================================
 * MODE ROUTING METADATA
 * ========================================================= */

const MODE_ROUTING_METADATA = Object.freeze({
  [TINA_MODES.QUICK_MODE]: {
    responseMode: RESPONSE_MODES.QUICK,
    outputDepth: OUTPUT_DEPTH.SHORT,
    routingTags: [ROUTING_TAGS.TAX],
    requiresEvidenceDisclosure: false,
    requiresConflictAnalysis: false,
    requiresRiskScoring: false,
    preferredTemperature: 0
  },

  [TINA_MODES.STANDARD_TAX_MODE]: {
    responseMode: RESPONSE_MODES.STANDARD,
    outputDepth: OUTPUT_DEPTH.STANDARD,
    routingTags: [ROUTING_TAGS.TAX],
    requiresEvidenceDisclosure: false,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    preferredTemperature: 0
  },

  [TINA_MODES.TECHNICAL_TAX_MODE]: {
    responseMode: RESPONSE_MODES.TECHNICAL,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    routingTags: [ROUTING_TAGS.TAX, ROUTING_TAGS.LEGAL],
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    preferredTemperature: 0
  },

  [TINA_MODES.AUDIT_MODE]: {
    responseMode: RESPONSE_MODES.AUDIT,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    routingTags: [
      ROUTING_TAGS.AUDIT,
      ROUTING_TAGS.EVIDENCE
    ],
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    preferredTemperature: 0
  },

  [TINA_MODES.LITIGATION_LEGAL_DEFENSE_MODE]: {
    responseMode: RESPONSE_MODES.LITIGATION,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    routingTags: [
      ROUTING_TAGS.LEGAL,
      ROUTING_TAGS.LITIGATION
    ],
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    preferredTemperature: 0
  },

  [TINA_MODES.TRANSACTION_CHARACTERIZATION_MODE]: {
    responseMode: RESPONSE_MODES.TRANSACTION,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    routingTags: [
      ROUTING_TAGS.TRANSACTION,
      ROUTING_TAGS.TAX
    ],
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    preferredTemperature: 0
  },

  [TINA_MODES.CONTRACT_INTERPRETATION_MODE]: {
    responseMode: RESPONSE_MODES.CONTRACT,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    routingTags: [
      ROUTING_TAGS.CONTRACT,
      ROUTING_TAGS.LEGAL
    ],
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    preferredTemperature: 0
  },

  [TINA_MODES.EVIDENCE_EVALUATION_MODE]: {
    responseMode: RESPONSE_MODES.EVIDENCE_HEAVY,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    routingTags: [
      ROUTING_TAGS.EVIDENCE,
      ROUTING_TAGS.AUDIT
    ],
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: false,
    requiresRiskScoring: true,
    preferredTemperature: 0
  },

  [TINA_MODES.FACT_PATTERN_ANALYSIS_MODE]: {
    responseMode: RESPONSE_MODES.TECHNICAL,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    routingTags: [
      ROUTING_TAGS.FACT_PATTERN,
      ROUTING_TAGS.TRANSACTION
    ],
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    preferredTemperature: 0
  },

  [TINA_MODES.REVIEWER_LEARNING_MODE]: {
    responseMode: RESPONSE_MODES.REVIEWER,
    outputDepth: OUTPUT_DEPTH.STANDARD,
    routingTags: [ROUTING_TAGS.REVIEWER],
    requiresEvidenceDisclosure: false,
    requiresConflictAnalysis: false,
    requiresRiskScoring: false,
    preferredTemperature: 0.2
  }
});

/* =========================================================
 * MASTER PROMPT
 * ========================================================= */

const ADAPTIVE_MASTER_PROMPT = `
${TINA_IDENTITY}

CORE OPERATING RULES:

${TINA_DEFAULT_RESPONSE_STRUCTURE}

${TINA_FACTUAL_REASONING_RULE}

${TINA_TRANSACTION_RULE}

${TINA_ECONOMIC_SUBSTANCE_RULE}

${TINA_CONTRACT_RULE}

${TINA_EVIDENCE_RULE}

${TINA_HIERARCHY_RULE}

${TINA_CONFLICT_RULE}

OUTPUT RULES:
- Simple question = concise answer
- Audit issue = audit-defensible analysis
- Litigation issue = doctrine-heavy analysis
- Evidence issue = evidence-sensitive analysis
- Business issue = practical risk-based analysis
- Never overstate certainty
- Never fabricate authorities
- Always disclose assumptions if required
- Always disclose evidentiary gaps if material
`.trim();

/* =========================================================
 * NORMALIZATION HELPERS
 * ========================================================= */

function normalizeMode(mode = "") {
  const normalized = String(mode || "").trim().toUpperCase();

  return (
    TINA_MODES[normalized] ||
    Object.values(TINA_MODES).find((m) => m === normalized) ||
    TINA_MODES.STANDARD_TAX_MODE
  );
}

function getModePrompt(mode = "") {
  return (
    MODE_PROMPTS[normalizeMode(mode)] ||
    MODE_PROMPTS[TINA_MODES.STANDARD_TAX_MODE]
  );
}

function getModeRoutingMetadata(mode = "") {
  return (
    MODE_ROUTING_METADATA[normalizeMode(mode)] ||
    MODE_ROUTING_METADATA[TINA_MODES.STANDARD_TAX_MODE]
  );
}

/* =========================================================
 * PROMPT BUNDLE BUILDER
 * ========================================================= */

function buildPromptBundle(
  mode = TINA_MODES.STANDARD_TAX_MODE,
  extraInstructions = []
) {
  const normalizedMode = normalizeMode(mode);

  const metadata = getModeRoutingMetadata(normalizedMode);

  return [
    ADAPTIVE_MASTER_PROMPT,

    `ACTIVE MODE: ${normalizedMode}`,

    `RESPONSE MODE: ${metadata.responseMode}`,

    `OUTPUT DEPTH: ${metadata.outputDepth}`,

    `ROUTING TAGS: ${metadata.routingTags.join(", ")}`,

    metadata.requiresEvidenceDisclosure
      ? "MANDATORY: disclose evidentiary gaps where material."
      : null,

    metadata.requiresConflictAnalysis
      ? "MANDATORY: analyze doctrinal and hierarchy conflicts."
      : null,

    metadata.requiresRiskScoring
      ? "MANDATORY: incorporate tax/audit/legal risk posture."
      : null,

    getModePrompt(normalizedMode),

    ...(Array.isArray(extraInstructions)
      ? extraInstructions
      : [extraInstructions])
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
}

/* =========================================================
 * PLANNER PAYLOAD BUILDER
 * ========================================================= */

function buildPlannerPayload(mode = "") {
  const normalizedMode = normalizeMode(mode);

  const metadata =
    MODE_ROUTING_METADATA[normalizedMode];

  return {
    tinaVersion: TINA_VERSION,

    mode: normalizedMode,

    responseMode: metadata.responseMode,

    outputDepth: metadata.outputDepth,

    routingTags: metadata.routingTags,

    requiresEvidenceDisclosure:
      metadata.requiresEvidenceDisclosure,

    requiresConflictAnalysis:
      metadata.requiresConflictAnalysis,

    requiresRiskScoring:
      metadata.requiresRiskScoring,

    preferredTemperature:
      metadata.preferredTemperature,

    defaultStructure:
      TINA_DEFAULT_RESPONSE_STRUCTURE
  };
}

/* =========================================================
 * ADAPTIVE ROUTING CONTRACT
 * ========================================================= */

function buildAdaptiveRoutingContract(mode = "") {
  const normalizedMode = normalizeMode(mode);

  const metadata =
    MODE_ROUTING_METADATA[normalizedMode];

  return {
    mode: normalizedMode,

    responseMode: metadata.responseMode,

    outputDepth: metadata.outputDepth,

    routingTags: metadata.routingTags,

    plannerCompatible: true,

    rendererCompatible: true,

    riskCompatible: true,

    evidenceCompatible: true,

    conclusionGatingCompatible: true,

    adaptivePipelineCompatible: true
  };
}

/* =========================================================
 * MODULE EXPORTS
 * ========================================================= */

module.exports = {
  TINA_VERSION,

  TINA_MODES,

  RESPONSE_MODES,

  OUTPUT_DEPTH,

  RISK_LEVELS,

  POSITION_STRENGTH,

  CONCLUSION_RESTRICTIONS,

  ROUTING_TAGS,

  TINA_IDENTITY,

  TINA_HIERARCHY_RULE,

  TINA_DEFAULT_RESPONSE_STRUCTURE,

  TINA_FACTUAL_REASONING_RULE,

  TINA_TRANSACTION_RULE,

  TINA_ECONOMIC_SUBSTANCE_RULE,

  TINA_CONTRACT_RULE,

  TINA_EVIDENCE_RULE,

  TINA_CONFLICT_RULE,

  MODE_PROMPTS,

  MODE_ROUTING_METADATA,

  ADAPTIVE_MASTER_PROMPT,

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
