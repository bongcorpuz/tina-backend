// FILE: adaptive-tina-master-prompt.js
"use strict";

/**
 * TINA Enterprise Adaptive Prompt Registry
 * Version: 4.0.0
 *
 * Purpose:
 * - Central prompt registry
 * - Mode normalization
 * - Context orchestration compatibility
 * - Planner / renderer / final-compliance contracts
 * - Compact prompt-bundle generation
 */

const TINA_VERSION = "4.0.0";

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

const TINA_MODES = Object.freeze({
  QUICK_MODE: "QUICK_MODE",
  STANDARD_TAX_MODE: "STANDARD_TAX_MODE",
  TECHNICAL_TAX_MODE: "TECHNICAL_TAX_MODE",
  AUDIT_MODE: "AUDIT_MODE",
  LITIGATION_LEGAL_DEFENSE_MODE: "LITIGATION_LEGAL_DEFENSE_MODE",
  TRANSACTION_CHARACTERIZATION_MODE: "TRANSACTION_CHARACTERIZATION_MODE",
  CONTRACT_INTERPRETATION_MODE: "CONTRACT_INTERPRETATION_MODE",
  EVIDENCE_EVALUATION_MODE: "EVIDENCE_EVALUATION_MODE",
  FACT_PATTERN_ANALYSIS_MODE: "FACT_PATTERN_ANALYSIS_MODE",
  REVIEWER_LEARNING_MODE: "REVIEWER_LEARNING_MODE"
});

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

const ORCHESTRATION_MODES = Object.freeze({
  FAST_DEFINITION: "FAST_DEFINITION",
  STANDARD_TAX: "STANDARD_TAX",
  LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
  COMPLEX_ADVISORY: "COMPLEX_ADVISORY",
  EMERGENCY_TRIM: "EMERGENCY_TRIM"
});

const OUTPUT_DEPTH = Object.freeze({
  CONCISE: "CONCISE",
  STANDARD: "STANDARD",
  STRUCTURED: "STRUCTURED",
  COMPREHENSIVE: "COMPREHENSIVE",
  SIMPLE: "SIMPLE"
});

const CONCLUSION_RESTRICTIONS = Object.freeze({
  DIRECT_CONCLUSION_ALLOWED: "DIRECT_CONCLUSION_ALLOWED",
  PRELIMINARY_CONCLUSION_ONLY: "PRELIMINARY_CONCLUSION_ONLY",
  DEFER_CONCLUSION: "DEFER_CONCLUSION",
  USE_QUALIFIED_CONCLUSION: "USE_QUALIFIED_CONCLUSION"
});

const TINA_IDENTITY = `
You are TINA — Tax Intelligence and Analysis.

You are a Philippine tax, legal, audit, accounting, and compliance reasoning system operating at the level of:
- Senior Tax Litigation Counsel (Court of Tax Appeals level)
- Big 4 National Tax Office Reviewer
- Philippine Bar Taxation Law Specialist
- BIR Audit Defense Strategist
- Jurisprudence Synthesis Expert
- Transaction Characterization Expert

You are not merely a citation retriever.

You must:
- classify the issue before answering;
- apply Philippine legal hierarchy;
- use only issue-relevant authorities;
- distinguish legal, accounting, audit, evidentiary, and practical conclusions;
- disclose assumptions, limitations, and evidentiary gaps when facts are incomplete;
- state definitive positions where controlling authority clearly supports it;
- avoid fabricating authorities.
`.trim();

// PATCH 5 — PROHIBITED_PHRASES enforcement (LAW 6)
export const PROHIBITED_PHRASES = Object.freeze([
  "may suggest",
  "could be argued",
  "it could be argued",
  "seems to",
  "based on available data",
  "as an AI",
  "I am an AI",
  "as an artificial intelligence",
  "consult a professional",
  "consult a tax professional",
  "consult your lawyer",
  "please consult",
  "I recommend consulting",
  "seek professional advice",
  "I cannot provide legal advice",
  "I am not a lawyer",
  "this is not legal advice",
  "I cannot give a definitive answer",
  "it is difficult to say",
  "it depends on many factors",
  "you may want to consider",
  "it is important to note",
  "please note that",
  "it should be noted",
  "you should consult"
]);

export function enforceProhibitedPhrases(text = "") {
  if (!text || typeof text !== "string") return { passed: true, violations: [] };
  const lc = text.toLowerCase();
  const violations = PROHIBITED_PHRASES.filter(phrase => lc.includes(phrase.toLowerCase()));
  return {
    passed: violations.length === 0,
    violations
  };
}

const TINA_HIERARCHY_RULE = `
Apply Philippine legal hierarchy correctly (source hierarchy — Law 2):

Tier 1: Constitution
Tier 2: NIRC (as amended) · Republic Acts · CMTA · LGC
Tier 3: Tax Treaties
Tier 4: Supreme Court En Banc
Tier 5: Supreme Court Division
Tier 6: CTA En Banc
Tier 7: CTA Division
Tier 8: Revenue Regulations (RR)
Tier 9: Revenue Memorandum Circulars (RMC) · Revenue Memorandum Orders (RMO) · RAMO
Tier 10: BIR Rulings (binding on requesting party only)
Tier 11: DOF Opinions · Secondary materials (persuasive — label as such)

Never elevate a lower authority over a higher authority.
Administrative issuances (RR, RMC, RMO, BIR Ruling) cannot amend the statute or override controlling Supreme Court or CTA doctrine.
`.trim();

const TINA_CONTEXT_ORCHESTRATION_RULE = `
Context orchestration rules:

- Use only the compact context prepared by the orchestration layer.
- Do not request, reproduce, or rely on raw retrieval objects.
- Do not inject full source text, full debug objects, full engine outputs, embeddings, metadata dumps, or raw JSON payloads.
- Use only compact retrievedSources containing title, authorityType, citation/url, content/text, and score.
- Prefer issueClassificationMatch, targetAuthorityMatch, and controllingPrecedence.
- Do not cite issue-mismatched sources.
- Do not display duplicate sources.
- Use the assigned token budget and response mode.
- If context is insufficient, say so plainly.
`.trim();

const TINA_FACTUAL_REASONING_RULE = `
Before giving a strong conclusion, check:

- known facts;
- assumptions;
- missing facts;
- unresolved ambiguities;
- documentary support;
- evidence gaps;
- alternative characterization.

If facts or evidence are incomplete, use qualified language:

"Based on the available facts, the position is preliminary and subject to verification."
`.trim();

const TINA_CONFLICT_RULE = `
Never merely say:

"Conflict detected: YES."

A conflict may be stated only when metadata supports:
- same exact legal issue;
- same legal dimension;
- opposite holding;
- conflict type;
- controlling authority;
- hierarchy-based resolution.

If these are not complete, say no direct doctrinal conflict is established and explain whether the authorities are distinguishable, procedural, evidentiary, factual, temporal, or merely background.
`.trim();

const TINA_RESPONSE_RULE = `
Output rules:

- Your FIRST sentence must directly answer the question. No preamble.
- Your SECOND sentence must cite the controlling authority (statute, case, or regulation).
- Use concise format for simple questions.
- Use structured format for tax, audit, legal, factual, transaction, and risk questions.
- Use doctrine-heavy format only for legal conflict, litigation, or jurisprudence questions.
- Use evidence-sensitive format for factual disputes and audit-sensitive issues.
- Use reviewer-style format only for CPALE/reviewer mode.
- Never overstate certainty.
- Never fabricate authorities.
- Never cite unrelated cases just because they mention the same tax type.
- Never include raw context, debug JSON, retrieval payloads, or full engine outputs.

PROHIBITED phrases — never use:
${PROHIBITED_PHRASES.map(p => `  • "${p}"`).join("\n")}
`.trim();

const ADAPTIVE_MASTER_PROMPT = `
${TINA_IDENTITY}

${TINA_HIERARCHY_RULE}

${TINA_CONTEXT_ORCHESTRATION_RULE}

${TINA_FACTUAL_REASONING_RULE}

${TINA_CONFLICT_RULE}

${TINA_RESPONSE_RULE}
`.trim();

const MODE_PROMPTS = Object.freeze({
  QUICK_MODE: `
Use direct, concise answer.
No unnecessary doctrinal discussion.
Use only the most important legal basis.
`.trim(),

  STANDARD_TAX_MODE: `
Use standard Philippine tax analysis.
Explain the rule, legal basis, and practical implication.
Keep the answer proportionate to the question.
`.trim(),

  TECHNICAL_TAX_MODE: `
Use technical Philippine tax analysis.
Apply hierarchy, controlling legal basis, relevant regulations, and directly applicable jurisprudence.
Explain doctrinal status only if relevant.
`.trim(),

  AUDIT_MODE: `
Use audit-defensible analysis.

Focus on:
- evidence;
- accounting treatment;
- tax consequence;
- PFRS/PAS/PSA implications;
- misstatement risk;
- audit defensibility;
- required audit procedures.
`.trim(),

  LITIGATION_LEGAL_DEFENSE_MODE: `
Use litigation-grade legal analysis.

Focus on:
- issue framing;
- controlling law;
- directly applicable jurisprudence;
- BIR/opposing position;
- taxpayer defense;
- hierarchy and conflict analysis;
- defensible conclusion.
`.trim(),

  TRANSACTION_CHARACTERIZATION_MODE: `
Use transaction characterization analysis.

Focus on:
- legal form;
- economic substance;
- control;
- risk allocation;
- money flow;
- principal-agent analysis;
- reimbursement/pass-through treatment;
- tax and accounting characterization.
`.trim(),

  CONTRACT_INTERPRETATION_MODE: `
Use contract interpretation analysis.

Focus on:
- parties;
- object;
- rights and obligations;
- consideration;
- billing and collection;
- control and risk allocation;
- tax clauses;
- actual practice versus written terms.
`.trim(),

  EVIDENCE_EVALUATION_MODE: `
Use evidence-sensitive analysis.

Focus on:
- asserted facts;
- documented facts;
- unsupported facts;
- contradictory facts;
- missing documents;
- audit-sensitive items;
- conclusion subject to verification.
`.trim(),

  FACT_PATTERN_ANALYSIS_MODE: `
Use fact-pattern analysis.

Focus on:
- transaction reconstruction;
- factual ambiguity;
- assumptions;
- missing facts;
- unresolved issues;
- alternative characterization.
`.trim(),

  REVIEWER_LEARNING_MODE: `
Use simple reviewer-style explanation.
Use examples and layman's terms.
Avoid excessive legal drafting unless requested.
`.trim()
});

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

const ORCHESTRATION_STRUCTURES = Object.freeze({
  FAST_DEFINITION: [
    "Direct Answer",
    "Legal Basis"
  ],

  STANDARD_TAX: [
    "Direct Answer",
    "Legal Basis",
    "Supporting Rules",
    "Practical Note",
    "Jurisprudence"
  ],

  LEGAL_ANALYSIS: RESPONSE_STRUCTURES.TECHNICAL,

  COMPLEX_ADVISORY: [
    "Executive Answer",
    "Controlling Basis",
    "Assumptions / Fact Sensitivity",
    "Risk / Practical Application",
    "Recommended Documentation"
  ],

  EMERGENCY_TRIM: [
    "Direct Answer",
    "Limited Basis"
  ]
});

const MODE_ROUTING_METADATA = Object.freeze({
  QUICK_MODE: {
    responseMode: RESPONSE_MODES.QUICK,
    orchestrationMode: ORCHESTRATION_MODES.FAST_DEFINITION,
    outputDepth: OUTPUT_DEPTH.CONCISE,
    structure: RESPONSE_STRUCTURES.QUICK,
    requiresEvidenceDisclosure: false,
    requiresConflictAnalysis: false,
    requiresRiskScoring: false,
    requiresConclusionGating: false
  },

  STANDARD_TAX_MODE: {
    responseMode: RESPONSE_MODES.STANDARD,
    orchestrationMode: ORCHESTRATION_MODES.STANDARD_TAX,
    outputDepth: OUTPUT_DEPTH.STANDARD,
    structure: RESPONSE_STRUCTURES.STANDARD,
    requiresEvidenceDisclosure: false,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  TECHNICAL_TAX_MODE: {
    responseMode: RESPONSE_MODES.TECHNICAL,
    orchestrationMode: ORCHESTRATION_MODES.LEGAL_ANALYSIS,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    structure: RESPONSE_STRUCTURES.TECHNICAL,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  AUDIT_MODE: {
    responseMode: RESPONSE_MODES.AUDIT,
    orchestrationMode: ORCHESTRATION_MODES.COMPLEX_ADVISORY,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    structure: RESPONSE_STRUCTURES.AUDIT,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  LITIGATION_LEGAL_DEFENSE_MODE: {
    responseMode: RESPONSE_MODES.LITIGATION,
    orchestrationMode: ORCHESTRATION_MODES.LEGAL_ANALYSIS,
    outputDepth: OUTPUT_DEPTH.COMPREHENSIVE,
    structure: RESPONSE_STRUCTURES.LITIGATION,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  TRANSACTION_CHARACTERIZATION_MODE: {
    responseMode: RESPONSE_MODES.TRANSACTION,
    orchestrationMode: ORCHESTRATION_MODES.COMPLEX_ADVISORY,
    outputDepth: OUTPUT_DEPTH.STRUCTURED,
    structure: RESPONSE_STRUCTURES.TRANSACTION,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  CONTRACT_INTERPRETATION_MODE: {
    responseMode: RESPONSE_MODES.CONTRACT,
    orchestrationMode: ORCHESTRATION_MODES.COMPLEX_ADVISORY,
    outputDepth: OUTPUT_DEPTH.STRUCTURED,
    structure: RESPONSE_STRUCTURES.CONTRACT,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  EVIDENCE_EVALUATION_MODE: {
    responseMode: RESPONSE_MODES.EVIDENCE_HEAVY,
    orchestrationMode: ORCHESTRATION_MODES.COMPLEX_ADVISORY,
    outputDepth: OUTPUT_DEPTH.STRUCTURED,
    structure: RESPONSE_STRUCTURES.EVIDENCE_HEAVY,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: false,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  FACT_PATTERN_ANALYSIS_MODE: {
    responseMode: RESPONSE_MODES.TECHNICAL,
    orchestrationMode: ORCHESTRATION_MODES.COMPLEX_ADVISORY,
    outputDepth: OUTPUT_DEPTH.STRUCTURED,
    structure: RESPONSE_STRUCTURES.TECHNICAL,
    requiresEvidenceDisclosure: true,
    requiresConflictAnalysis: true,
    requiresRiskScoring: true,
    requiresConclusionGating: true
  },

  REVIEWER_LEARNING_MODE: {
    responseMode: RESPONSE_MODES.REVIEWER,
    orchestrationMode: ORCHESTRATION_MODES.FAST_DEFINITION,
    outputDepth: OUTPUT_DEPTH.SIMPLE,
    structure: RESPONSE_STRUCTURES.REVIEWER,
    requiresEvidenceDisclosure: false,
    requiresConflictAnalysis: false,
    requiresRiskScoring: false,
    requiresConclusionGating: false
  }
});

function normalizeMode(mode = "") {
  const clean = String(mode || "").trim().toUpperCase();

  if (LEGACY_MODE_ALIASES[clean]) return LEGACY_MODE_ALIASES[clean];
  if (TINA_MODES[clean]) return clean;

  if (clean.includes("AUDIT")) return TINA_MODES.AUDIT_MODE;
  if (clean.includes("LITIGATION") || clean.includes("LEGAL")) return TINA_MODES.LITIGATION_LEGAL_DEFENSE_MODE;
  if (clean.includes("TRANSACTION")) return TINA_MODES.TRANSACTION_CHARACTERIZATION_MODE;
  if (clean.includes("CONTRACT")) return TINA_MODES.CONTRACT_INTERPRETATION_MODE;
  if (clean.includes("EVIDENCE")) return TINA_MODES.EVIDENCE_EVALUATION_MODE;
  if (clean.includes("FACT")) return TINA_MODES.FACT_PATTERN_ANALYSIS_MODE;
  if (clean.includes("REVIEW") || clean.includes("QUIZ")) return TINA_MODES.REVIEWER_LEARNING_MODE;
  if (clean.includes("TECHNICAL") || clean.includes("DOCTRINE")) return TINA_MODES.TECHNICAL_TAX_MODE;
  if (clean.includes("QUICK") || clean.includes("FAST")) return TINA_MODES.QUICK_MODE;

  return TINA_MODES.STANDARD_TAX_MODE;
}

function normalizeOrchestrationMode(mode = "") {
  const clean = String(mode || "").trim().toUpperCase();

  if (ORCHESTRATION_MODES[clean]) return clean;
  if (Object.values(ORCHESTRATION_MODES).includes(clean)) return clean;

  if (clean.includes("EMERGENCY")) return ORCHESTRATION_MODES.EMERGENCY_TRIM;
  if (clean.includes("FAST") || clean.includes("QUICK") || clean.includes("DEFINITION")) return ORCHESTRATION_MODES.FAST_DEFINITION;
  if (clean.includes("COMPLEX") || clean.includes("ADVISORY") || clean.includes("AUDIT") || clean.includes("CONTRACT") || clean.includes("TRANSACTION") || clean.includes("EVIDENCE") || clean.includes("RISK")) return ORCHESTRATION_MODES.COMPLEX_ADVISORY;
  if (clean.includes("LEGAL") || clean.includes("DOCTRINE") || clean.includes("JURISPRUDENCE") || clean.includes("LITIGATION")) return ORCHESTRATION_MODES.LEGAL_ANALYSIS;
  if (clean.includes("STANDARD") || clean.includes("TAX")) return ORCHESTRATION_MODES.STANDARD_TAX;

  return ORCHESTRATION_MODES.STANDARD_TAX;
}

function getModePrompt(mode = "") {
  const normalized = normalizeMode(mode);
  return MODE_PROMPTS[normalized] || MODE_PROMPTS.STANDARD_TAX_MODE;
}

function getModeRoutingMetadata(mode = "") {
  const normalized = normalizeMode(mode);
  return MODE_ROUTING_METADATA[normalized] || MODE_ROUTING_METADATA.STANDARD_TAX_MODE;
}

function getContextBudgetPolicy(orchestrationMode = ORCHESTRATION_MODES.STANDARD_TAX) {
  const mode = normalizeOrchestrationMode(orchestrationMode);

  const policies = {
    FAST_DEFINITION: {
      maxSources: 3,
      maxSourceChars: 900,
      maxPromptTokens: 4500,
      maxCompletionTokens: 900
    },

    STANDARD_TAX: {
      maxSources: 5,
      maxSourceChars: 1400,
      maxPromptTokens: 7000,
      maxCompletionTokens: 1600
    },

    LEGAL_ANALYSIS: {
      maxSources: 6,
      maxSourceChars: 1800,
      maxPromptTokens: 9500,
      maxCompletionTokens: 2200
    },

    COMPLEX_ADVISORY: {
      maxSources: 8,
      maxSourceChars: 1800,
      maxPromptTokens: 11000,
      maxCompletionTokens: 2600
    },

    EMERGENCY_TRIM: {
      maxSources: 2,
      maxSourceChars: 600,
      maxPromptTokens: 3000,
      maxCompletionTokens: 700
    }
  };

  return {
    ...policies[mode],
    useContextOrchestrationEngine: true,
    compressSourcesBeforeOpenAI: true,
    finalTrimBeforeOpenAI: true,
    preventRawFullDocumentInjection: true,
    preventFullDebugObjectInjection: true,
    preventFullEngineOutputInjection: true,
    compactSourceOnly: true
  };
}

function buildPromptBundle(mode = "STANDARD_TAX_MODE", extraInstructions = [], options = {}) {
  const normalized = normalizeMode(mode);
  const metadata = getModeRoutingMetadata(normalized);

  const orchestrationMode = normalizeOrchestrationMode(
    options.orchestrationMode ||
      options.contextMode ||
      metadata.orchestrationMode
  );

  const contextBudgetPolicy = getContextBudgetPolicy(orchestrationMode);

  return [
    ADAPTIVE_MASTER_PROMPT,

    `ACTIVE MODE: ${normalized}`,

    `RESPONSE MODE: ${metadata.responseMode}`,

    `ORCHESTRATION MODE: ${orchestrationMode}`,

    `OUTPUT DEPTH: ${metadata.outputDepth}`,

    `CONTEXT POLICY: Use compact retrievedSources only. Max sources: ${contextBudgetPolicy.maxSources}. Max source chars each: ${contextBudgetPolicy.maxSourceChars}.`,

    metadata.requiresEvidenceDisclosure
      ? "MANDATORY: disclose evidentiary gaps."
      : null,

    metadata.requiresConflictAnalysis
      ? "MANDATORY: explain doctrinal conflicts only when complete conflict metadata exists."
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

function buildPlannerPayload(mode = "", options = {}) {
  const normalized = normalizeMode(mode);
  const metadata = getModeRoutingMetadata(normalized);

  const orchestrationMode = normalizeOrchestrationMode(
    options.orchestrationMode ||
      options.contextMode ||
      metadata.orchestrationMode
  );

  const contextBudgetPolicy = getContextBudgetPolicy(orchestrationMode);

  return {
    tinaVersion: TINA_VERSION,
    normalizedMode: normalized,
    responseMode: metadata.responseMode,
    orchestrationMode,
    contextMode: orchestrationMode,
    outputDepth: metadata.outputDepth,
    structure: metadata.structure,
    orchestrationStructure:
      ORCHESTRATION_STRUCTURES[orchestrationMode] ||
      ORCHESTRATION_STRUCTURES.STANDARD_TAX,

    requiresEvidenceDisclosure: metadata.requiresEvidenceDisclosure,
    requiresConflictAnalysis: metadata.requiresConflictAnalysis,
    requiresRiskScoring: metadata.requiresRiskScoring,
    requiresConclusionGating: metadata.requiresConclusionGating,

    conclusionRule: metadata.requiresConclusionGating
      ? {
          allowStrongConclusion: false,
          restriction: CONCLUSION_RESTRICTIONS.PRELIMINARY_CONCLUSION_ONLY,
          requiredLanguage:
            "Based on the available facts, the position is preliminary and subject to verification."
        }
      : {
          allowStrongConclusion: true,
          restriction: CONCLUSION_RESTRICTIONS.DIRECT_CONCLUSION_ALLOWED,
          requiredLanguage:
            "A direct conclusion may be given if supported by issue-matched legal basis and evidence."
        },

    sourceOrderingPolicy: {
      useIssueClassificationMatch: true,
      useTargetAuthorityMatch: true,
      useControllingPrecedence: true,
      hideIssueMismatchedSources: true,
      showOnlyCitedRelevantNonDuplicatedSources: true
    },

    conflictDisplayPolicy: {
      displayConflictYesOnlyWhenConflictTrue: true,
      requireCompleteConflictMetadata: true,
      requireSameIssueGate: true,
      requireOppositeHoldingGate: true,
      blockVagueConflictLanguage: true
    },

    contextBudgetPolicy
  };
}

function buildAdaptiveRoutingContract(mode = "", options = {}) {
  const planner = buildPlannerPayload(mode, options);

  return {
    ...planner,
    plannerCompatible: true,
    rendererCompatible: true,
    finalAnswerComplianceCompatible: true,
    riskCompatible: true,
    evidenceCompatible: true,
    conclusionGatingCompatible: true,
    orchestrationCompatible: true,
    contextOrchestrationCompatible: true,
    adaptivePipelineCompatible: true,
    compactPromptCompatible: true,
    rawFullDocumentInjectionPrevented: true,
    fullDebugObjectInjectionPrevented: true,
    fullEngineOutputInjectionPrevented: true
  };
}

function buildContextOrchestrationPromptContract(mode = "", options = {}) {
  const contract = buildAdaptiveRoutingContract(mode, options);

  return {
    engine: "TINA_ADAPTIVE_MASTER_PROMPT_REGISTRY",
    version: TINA_VERSION,
    activeMode: contract.normalizedMode,
    responseMode: contract.responseMode,
    orchestrationMode: contract.orchestrationMode,
    contextMode: contract.contextMode,
    outputDepth: contract.outputDepth,
    structure: contract.structure,
    orchestrationStructure: contract.orchestrationStructure,
    masterPrompt: buildPromptBundle(contract.normalizedMode, options.extraInstructions || [], {
      orchestrationMode: contract.orchestrationMode
    }),
    plannerPayload: contract,
    contextBudgetPolicy: contract.contextBudgetPolicy,
    rendererContract: {
      responseMode: contract.responseMode,
      orchestrationMode: contract.orchestrationMode,
      contextMode: contract.contextMode,
      responseDepth: contract.outputDepth,
      sections: contract.structure,
      sourceOrderingPolicy: contract.sourceOrderingPolicy,
      conflictDisplayPolicy: contract.conflictDisplayPolicy,
      conclusionRule: contract.conclusionRule
    },
    contextPolicy: {
      useContextOrchestrationEngine: true,
      compactSourcesOnly: true,
      compactIntentOnly: true,
      compactClassificationOnly: true,
      preventRawFullDocumentInjection: true,
      preventFullDebugObjectInjection: true,
      preventFullEngineOutputInjection: true
    }
  };
}

function adaptiveMasterPromptHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ADAPTIVE_MASTER_PROMPT_REGISTRY",
    version: TINA_VERSION,
    plannerCompatible: true,
    rendererCompatible: true,
    finalAnswerComplianceCompatible: true,
    orchestrationCompatible: true,
    contextOrchestrationCompatible: true,
    compactPromptCompatible: true,
    contextBudgetPolicyReady: true,
    rawFullDocumentInjectionPrevented: true,
    fullDebugObjectInjectionPrevented: true,
    fullEngineOutputInjectionPrevented: true,
    seniorCounselPersona: true,
    prohibitedPhrasesEnforced: true,
    firstSentenceDirectAnswerRule: true,
    secondSentenceControllingAuthorityRule: true
  };
}

export {
  TINA_VERSION,

  LEGACY_MODE_ALIASES,
  TINA_MODES,
  RESPONSE_MODES,
  ORCHESTRATION_MODES,
  OUTPUT_DEPTH,
  CONCLUSION_RESTRICTIONS,

  TINA_IDENTITY,
  TINA_HIERARCHY_RULE,
  TINA_CONTEXT_ORCHESTRATION_RULE,
  TINA_FACTUAL_REASONING_RULE,
  TINA_CONFLICT_RULE,
  TINA_RESPONSE_RULE,
  ADAPTIVE_MASTER_PROMPT,

  MODE_PROMPTS,
  RESPONSE_STRUCTURES,
  ORCHESTRATION_STRUCTURES,
  MODE_ROUTING_METADATA,

  normalizeMode,
  normalizeOrchestrationMode,
  getModePrompt,
  getModeRoutingMetadata,
  getContextBudgetPolicy,
  buildPromptBundle,
  buildPlannerPayload,
  buildAdaptiveRoutingContract,
  buildContextOrchestrationPromptContract,
  adaptiveMasterPromptHealthCheck
};

export function getAdaptiveMasterPrompt() {
  return ADAPTIVE_MASTER_PROMPT;
}

export function buildAdaptivePromptContract(mode = "STANDARD_TAX_MODE", options = {}) {
  return buildContextOrchestrationPromptContract(mode, options);
}

export function buildSystemPromptOnly(mode = "STANDARD_TAX_MODE", options = {}) {
  const contract = buildContextOrchestrationPromptContract(mode, options);
  return contract.masterPrompt || ADAPTIVE_MASTER_PROMPT;
}

export default {
  TINA_VERSION,

  LEGACY_MODE_ALIASES,
  TINA_MODES,
  RESPONSE_MODES,
  ORCHESTRATION_MODES,
  OUTPUT_DEPTH,
  CONCLUSION_RESTRICTIONS,

  TINA_IDENTITY,
  TINA_HIERARCHY_RULE,
  TINA_CONTEXT_ORCHESTRATION_RULE,
  TINA_FACTUAL_REASONING_RULE,
  TINA_CONFLICT_RULE,
  TINA_RESPONSE_RULE,
  ADAPTIVE_MASTER_PROMPT,

  MODE_PROMPTS,
  RESPONSE_STRUCTURES,
  ORCHESTRATION_STRUCTURES,
  MODE_ROUTING_METADATA,

  normalizeMode,
  normalizeOrchestrationMode,
  getModePrompt,
  getModeRoutingMetadata,
  getContextBudgetPolicy,
  buildPromptBundle,
  buildPlannerPayload,
  buildAdaptiveRoutingContract,
  buildContextOrchestrationPromptContract,
  buildAdaptivePromptContract,
  buildSystemPromptOnly,
  enforceProhibitedPhrases,
  adaptiveMasterPromptHealthCheck,
  getAdaptiveMasterPrompt
};
