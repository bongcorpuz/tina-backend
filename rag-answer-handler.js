// FILE: rag-answer-handler.js
"use strict";

/**
 * rag-answer-handler.js
 * TINA Adaptive RAG Answer Handler
 * Version: 3.2.0
 * Fully ESM Compatible
 */

import { detectTopic } from "./topic-detector.js";
import { saveModeState } from "./mode-state.js";

import {
  getLastTopicState,
  saveTopicState,
  extractMemoryHooks,
  saveMemoryHooks
} from "./memory-hooks.js";

import {
  getConversationMessages,
  saveMessage
} from "./conversation-memory.js";

import {
  searchSimilar,
  smartSearch
} from "./vector-store.js";

import {
  normalizeRetrievedEvidence,
  detectEvidenceConflicts,
  rankEvidenceByAuthority,
  synthesizeGroundedAnswer,
  saveReasoningRun,
  saveReasoningEvidence,
  saveReasoningConflicts
} from "./reasoning-engine.js";

import {
  buildClaimSupportMap,
  validateEvidenceSufficiency,
  shouldRejectForWeakLegalBasis,
  buildNoSourceReply
} from "./legal-validation-engine.js";

import {
  maybeGenerateProvisionCitationAnswer
} from "./provision-citation-engine.js";

import {
  maybeGenerateCaseAnalysisAnswer
} from "./case-analysis-engine.js";

import {
  maybeGenerateDoctrineAnswer
} from "./doctrine-tagging-engine.js";

import {
  detectNamedLaw,
  buildNamedLawSearchQueries,
  filterDocsForNamedLaw
} from "./named-law-engine.js";

import {
  buildFinalCompliantAnswer,
  sanitizeDraftAnswer
} from "./final-answer-compliance.js";

import {
  buildFinalRoutePayload,
  filterVisibleSources
} from "./source-visibility-engine.js";

import {
  MAX_VISIBLE_SOURCES,
  toSafeDbNumeric,
  buildMemoryContext,
  classifyQuestion,
  detectIssuanceQuery,
  shouldHideSourceFromUser,
  stripTrailingSourceSection
} from "./ask-helpers.js";

import {
  rerankByHierarchy,
  selectTopLegalBases,
  buildStrictAnswerPrompt,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc
} from "./authority-engine.js";

import {
  detectHierarchyConflict
} from "./conflict-engine.js";

import {
  applySupersessionFilter
} from "./supersession-engine.js";

import {
  hybridRetrieve
} from "./retrieval-engine.js";

import {
  rerankForTina
} from "./reranker-engine.js";

import {
  selectIssueRelevantJurisprudence,
  buildJurisprudencePromptBlock,
  buildNoJurisprudenceText
} from "./jurisprudence-engine.js";

import {
  renderAdaptiveAnswer
} from "./answer-renderer.js";

const TINA_AF_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
]);

const FALLBACK_TINA_STRUCTURE = `
You are TINA — Tax Intelligence and Analysis — a Philippine tax, legal, audit,
accounting, and compliance reasoning AI.

You are not a citation retriever. You must synthesize law, facts, evidence,
legal hierarchy, doctrine, risk, assumptions, and practical application.

Default substantive structure:
A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING JURISPRUDENCE
D. DOCTRINAL STATUS / CONFLICT ANALYSIS
E. HIERARCHY ANALYSIS
F. PRACTICAL APPLICATION

Strict rules:
- Do not fabricate laws, cases, GR numbers, rates, deadlines, dates, or issuances.
- Do not cite unrelated cases.
- Do not merely say "Conflict detected: YES."
- Explain exact conflict, controlling authority, and why it controls.
- If facts or documents are incomplete, state that the position is preliminary and subject to verification.
- Separate tax treatment, accounting treatment, audit risk, litigation exposure, and documentation requirements.
`.trim();

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncateForPrompt(value = "", maxChars = 3500) {
  const text = String(value || "");
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n...[truncated]` : text;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildDocKey(doc = {}) {
  return (
    doc.fileId ||
    doc.file_id ||
    doc.id ||
    doc.metadata?.fileId ||
    doc.metadata?.file_id ||
    doc.normalizedReference ||
    doc.normalized_reference ||
    doc.metadata?.normalizedReference ||
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.originalSource ||
    doc.original_source ||
    doc.source ||
    doc.title ||
    JSON.stringify(doc)
  );
}

function mergeUniqueDocs(docs = []) {
  const seen = new Set();
  const output = [];

  for (const doc of docs || []) {
    if (!doc) continue;

    const key = buildDocKey(doc);

    if (seen.has(key)) continue;

    seen.add(key);
    output.push(doc);
  }

  return output;
}

function docTitle(doc = {}) {
  return (
    doc.title ||
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.path ||
    doc.source_path ||
    "Untitled Source"
  );
}

function docPath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    "Unknown path"
  );
}

function getScore(doc = {}) {
  const value =
    doc.rerankScore ??
    doc.finalScore ??
    doc.combined_score ??
    doc.score ??
    doc.similarity ??
    0;

  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function sortByAuthorityAndScore(docs = []) {
  return [...docs].sort((a, b) => {
    const levelA = getAuthorityLevelForDoc(a);
    const levelB = getAuthorityLevelForDoc(b);

    if (levelA !== levelB) return levelA - levelB;

    return getScore(b) - getScore(a);
  });
}

function formatDocsForPrompt(docs = [], maxDocs = 8) {
  return safeArray(docs)
    .slice(0, maxDocs)
    .map((doc, index) => {
      return [
        `SOURCE ${index + 1}: ${docTitle(doc)}`,
        `PATH: ${docPath(doc)}`,
        `AUTHORITY TYPE: ${getAuthorityTypeForDoc(doc) || "UNKNOWN"}`,
        `AUTHORITY LEVEL: ${getAuthorityLevelForDoc(doc) || 99}`,
        `SCORE: ${getScore(doc)}`,
        "TEXT:",
        truncateForPrompt(doc.text || doc.content || doc.excerpt || doc.preview || "", 3500)
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function buildEvidenceMetadata(doc = {}) {
  return {
    ...(doc.metadata || {}),
    authorityType:
      doc.authorityType ||
      doc.authority_type ||
      doc.metadata?.authorityType ||
      getAuthorityTypeForDoc(doc),
    authorityLevel:
      doc.authorityLevel ||
      doc.authority_level ||
      doc.metadata?.authorityLevel ||
      getAuthorityLevelForDoc(doc),
    normalizedReference:
      doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.normalizedReference ||
      null,
    effectiveFrom:
      doc.effectiveFrom ||
      doc.effective_from ||
      doc.metadata?.effectiveFrom ||
      null,
    effectiveTo:
      doc.effectiveTo ||
      doc.effective_to ||
      doc.metadata?.effectiveTo ||
      null,
    isSuperseded:
      Boolean(
        doc.isSuperseded ||
          doc.is_superseded ||
          doc.superseded ||
          doc.metadata?.isSuperseded ||
          doc.metadata?.superseded
      ),
    supersededByReference:
      doc.supersededByReference ||
      doc.superseded_by_reference ||
      doc.metadata?.supersededByReference ||
      null
  };
}

function buildAdaptiveState({ adaptiveContext = null, adaptivePromptBundle = null }) {
  const context = adaptiveContext || {};

  return {
    enabled: Boolean(adaptiveContext),
    adaptivePromptBundle: adaptivePromptBundle || context.adaptivePromptBundle || null,
    userBehavior: context.userBehavior || null,
    adaptiveMode: context.adaptiveMode || null,
    queryIntent: context.queryIntent || null,
    factPattern: context.factPattern || null,
    contractInterpretation: context.contractInterpretation || null,
    transactionCharacterization: context.transactionCharacterization || null,
    economicSubstance: context.economicSubstance || null,
    evidenceEvaluation: context.evidenceEvaluation || null,
    assumptionGap: context.assumptionGap || null,
    riskScore: context.riskScore || null,
    positionStrength: context.positionStrength || null,
    responsePlan: context.responsePlan || null,
    failures: context.failures || []
  };
}

function getResponseMode(adaptiveState = {}, hookConfig = {}) {
  return (
    adaptiveState?.responsePlan?.responseMode ||
    adaptiveState?.adaptiveMode?.responseMode ||
    adaptiveState?.queryIntent?.adaptiveMode ||
    hookConfig?.adaptiveResponseMode ||
    "STANDARD"
  );
}

function getConclusionRestriction(adaptiveState = {}) {
  const riskRestriction = adaptiveState?.riskScore?.conclusionRestriction || null;
  const positionAction = adaptiveState?.positionStrength?.conclusionAction || null;
  const gapStrength = adaptiveState?.assumptionGap?.conclusionStrength || null;
  const plannerRestriction = adaptiveState?.responsePlan?.conclusionRule?.restriction || null;

  if (
    riskRestriction === "DEFER_STRONG_CONCLUSION" ||
    plannerRestriction === "DEFER_STRONG_CONCLUSION" ||
    positionAction === "DEFER_CONCLUSION" ||
    gapStrength === "DEFER_CONCLUSION"
  ) {
    return "DEFER_STRONG_CONCLUSION";
  }

  if (
    riskRestriction === "PRELIMINARY_CONCLUSION_ONLY" ||
    plannerRestriction === "PRELIMINARY_CONCLUSION_ONLY" ||
    positionAction === "USE_QUALIFIED_CONCLUSION" ||
    positionAction === "DISCLOSE_AGGRESSIVE_POSITION" ||
    gapStrength === "PRELIMINARY_CONCLUSION_ONLY"
  ) {
    return "PRELIMINARY_CONCLUSION_ONLY";
  }

  return "DIRECT_CONCLUSION_ALLOWED";
}

function buildConclusionRestrictionInstruction(adaptiveState = {}) {
  const restriction = getConclusionRestriction(adaptiveState);

  if (restriction === "DEFER_STRONG_CONCLUSION") {
    return [
      "CONCLUSION GATING:",
      "Do not give a definitive or strong conclusion.",
      "State what facts, documents, legal bases, or evidence must be verified first.",
      "Use preliminary and conditional language."
    ].join("\n");
  }

  if (restriction === "PRELIMINARY_CONCLUSION_ONLY") {
    return [
      "CONCLUSION GATING:",
      "Use qualified conclusion language only.",
      "State that the position is preliminary and subject to verification.",
      "Disclose assumptions, gaps, ambiguities, and evidence limits where applicable."
    ].join("\n");
  }

  return [
    "CONCLUSION GATING:",
    "A direct conclusion is allowed only if supported by retrieved authority and evidence."
  ].join("\n");
}

function buildAdaptiveContextForPrompt(adaptiveState = {}) {
  return JSON.stringify(
    {
      adaptiveMode: adaptiveState.adaptiveMode
        ? {
            primaryMode: adaptiveState.adaptiveMode.primaryMode,
            secondaryModes: adaptiveState.adaptiveMode.secondaryModes,
            riskLevel: adaptiveState.adaptiveMode.riskLevel,
            complexityLevel: adaptiveState.adaptiveMode.complexityLevel,
            responseStructure: adaptiveState.adaptiveMode.responseStructure
          }
        : null,
      queryIntent: adaptiveState.queryIntent
        ? {
            detectedIntent: adaptiveState.queryIntent.detectedIntent,
            adaptiveMode: adaptiveState.queryIntent.adaptiveMode,
            issueTypes: adaptiveState.queryIntent.issueTypes,
            legalDimensions: adaptiveState.queryIntent.legalDimensions,
            retrievalStrategy: adaptiveState.queryIntent.retrievalStrategy,
            needsSupersessionCheck: adaptiveState.queryIntent.needsSupersessionCheck,
            needsJurisprudence: adaptiveState.queryIntent.needsJurisprudence
          }
        : null,
      factPattern: adaptiveState.factPattern
        ? {
            knownFacts: adaptiveState.factPattern.knownFacts,
            unresolvedFacts: adaptiveState.factPattern.unresolvedFacts,
            documentsRequired: adaptiveState.factPattern.documentsRequired,
            factCompleteness: adaptiveState.factPattern.factCompleteness
          }
        : null,
      contractInterpretation: adaptiveState.contractInterpretation
        ? {
            riskLevel: adaptiveState.contractInterpretation.riskLevel,
            documentaryGaps: adaptiveState.contractInterpretation.documentaryGaps,
            preliminaryInterpretation: adaptiveState.contractInterpretation.preliminaryInterpretation
          }
        : null,
      transactionCharacterization: adaptiveState.transactionCharacterization
        ? {
            primaryCharacterization: adaptiveState.transactionCharacterization.primaryCharacterization,
            riskLevel: adaptiveState.transactionCharacterization.riskLevel,
            preliminaryConclusion: adaptiveState.transactionCharacterization.preliminaryConclusion
          }
        : null,
      economicSubstance: adaptiveState.economicSubstance
        ? {
            result: adaptiveState.economicSubstance.result,
            riskLevel: adaptiveState.economicSubstance.riskLevel,
            findings: adaptiveState.economicSubstance.findings
          }
        : null,
      evidenceEvaluation: adaptiveState.evidenceEvaluation
        ? {
            evidenceStrength: adaptiveState.evidenceEvaluation.evidenceStrength,
            riskLevel: adaptiveState.evidenceEvaluation.riskLevel,
            findings: adaptiveState.evidenceEvaluation.findings,
            auditSensitiveItems: adaptiveState.evidenceEvaluation.auditSensitiveItems
          }
        : null,
      assumptionGap: adaptiveState.assumptionGap
        ? {
            riskLevel: adaptiveState.assumptionGap.riskLevel,
            conclusionStrength: adaptiveState.assumptionGap.conclusionStrength,
            mandatoryDisclosure: adaptiveState.assumptionGap.mandatoryDisclosure,
            mustDiscloseBeforeConclusion: adaptiveState.assumptionGap.mustDiscloseBeforeConclusion
          }
        : null,
      riskScore: adaptiveState.riskScore
        ? {
            overallRisk: adaptiveState.riskScore.overallRisk,
            taxpayerDefensibility: adaptiveState.riskScore.taxpayerDefensibility,
            conclusionRestriction: adaptiveState.riskScore.conclusionRestriction
          }
        : null,
      positionStrength: adaptiveState.positionStrength
        ? {
            positionStrength: adaptiveState.positionStrength.positionStrength,
            conclusionAction: adaptiveState.positionStrength.conclusionAction,
            conclusionLanguage: adaptiveState.positionStrength.conclusionLanguage
          }
        : null,
      responsePlan: adaptiveState.responsePlan
        ? {
            responseMode: adaptiveState.responsePlan.responseMode,
            responseDepth: adaptiveState.responsePlan.responseDepth,
            responseTemplate: adaptiveState.responsePlan.responseTemplate,
            conclusionRule: adaptiveState.responsePlan.conclusionRule,
            mustIncludeLimitation: adaptiveState.responsePlan.mustIncludeLimitation
          }
        : null
    },
    null,
    2
  );
}

function buildAdaptivePlannerInstructions(adaptiveState = {}) {
  const instructions = [];

  instructions.push(adaptiveState.adaptivePromptBundle || FALLBACK_TINA_STRUCTURE);

  if (safeArray(adaptiveState?.responsePlan?.plannerInstruction).length) {
    instructions.push(
      [
        "ADAPTIVE RESPONSE PLAN:",
        ...adaptiveState.responsePlan.plannerInstruction.map((item) => `- ${item}`)
      ].join("\n")
    );
  }

  if (safeArray(adaptiveState?.assumptionGap?.mandatoryDisclosure).length) {
    instructions.push(
      [
        "MANDATORY DISCLOSURES:",
        JSON.stringify(adaptiveState.assumptionGap.mandatoryDisclosure, null, 2)
      ].join("\n")
    );
  }

  if (safeArray(adaptiveState?.riskScore?.recommendedResponseControls).length) {
    instructions.push(
      [
        "RISK-BASED CONTROLS:",
        ...adaptiveState.riskScore.recommendedResponseControls.map((item) => `- ${item}`)
      ].join("\n")
    );
  }

  if (adaptiveState?.positionStrength?.conclusionLanguage) {
    instructions.push(
      `POSITION-STRENGTH CONTROL:\n${adaptiveState.positionStrength.conclusionLanguage}`
    );
  }

  instructions.push(buildConclusionRestrictionInstruction(adaptiveState));

  return instructions.filter(Boolean).join("\n\n---\n\n");
}

function buildConflictContextForPrompt({
  hierarchyConflict = null,
  jurisprudenceBlock = "",
  conflicts = []
}) {
  return [
    hierarchyConflict
      ? [
          "HIERARCHY / CONFLICT REVIEW:",
          JSON.stringify(
            {
              conflict: Boolean(hierarchyConflict.conflict),
              conflictType: hierarchyConflict.conflictType || null,
              doctrinalConflict: Boolean(hierarchyConflict.doctrinalConflict),
              hierarchyConflict: Boolean(hierarchyConflict.hierarchyConflict),
              apparentConflict: Boolean(hierarchyConflict.apparentConflict),
              exactIssue: hierarchyConflict.exactIssue || null,
              distinctionType: hierarchyConflict.distinctionType || null,
              controllingAuthority: hierarchyConflict.controllingAuthority || null,
              controllingSource: hierarchyConflict.controllingSource || null,
              overriddenAuthority: hierarchyConflict.overriddenAuthority || null,
              reason: hierarchyConflict.reason || null,
              resolutionBasis: hierarchyConflict.resolutionBasis || null
            },
            null,
            2
          )
        ].join("\n")
      : "HIERARCHY / CONFLICT REVIEW: No conflict metadata.",
    jurisprudenceBlock || buildNoJurisprudenceText(),
    safeArray(conflicts).length
      ? `EVIDENCE CONFLICT SIGNALS:\n${JSON.stringify(conflicts.slice(0, 5), null, 2)}`
      : "EVIDENCE CONFLICT SIGNALS: None detected."
  ].join("\n\n");
}

function buildComplianceInsight({
  issuance = null,
  questionType = "",
  namedLawDetection = null,
  hierarchyConflict = null,
  adaptiveState = null
}) {
  const notes = [];

  if (adaptiveState?.riskScore?.overallRisk?.level) {
    notes.push(`Adaptive risk level: ${adaptiveState.riskScore.overallRisk.level}.`);
  }

  if (adaptiveState?.positionStrength?.positionStrength) {
    notes.push(`Position strength: ${adaptiveState.positionStrength.positionStrength}.`);
  }

  if (adaptiveState?.assumptionGap?.mustDiscloseBeforeConclusion) {
    notes.push("Assumptions, evidentiary gaps, ambiguities, and limitations must be disclosed before any strong conclusion.");
  }

  if (hierarchyConflict?.conflict) {
    notes.push("A hierarchy or doctrinal conflict signal was detected; explain controlling authority and why it controls.");
  } else if (hierarchyConflict?.apparentConflict) {
    notes.push("An apparent conflict was detected; verify whether the authorities are distinguishable by issue or facts.");
  }

  if (issuance || questionType === "issuance") {
    notes.unshift("Verify latest amended or superseding BIR issuance before operational reliance.");
  }

  if (namedLawDetection?.matched) {
    notes.unshift("For named-law questions, rely first on the exact statute and its IRR before secondary materials.");
  }

  return notes.length
    ? notes.join(" ")
    : "Apply the higher-authority rule first and use lower-authority material only as support.";
}

function mergeConflictSignals({
  rawConflicts = [],
  displayableConflicts = [],
  hierarchyConflict = null
}) {
  const merged = [];

  for (const item of displayableConflicts || []) merged.push(item);

  for (const item of rawConflicts || []) {
    if (!displayableConflicts.includes(item)) merged.push(item);
  }

  if (hierarchyConflict?.conflict || hierarchyConflict?.apparentConflict) {
    merged.push({
      source: "conflict-engine",
      conflictType: hierarchyConflict.conflictType || null,
      doctrinalConflict: Boolean(hierarchyConflict.doctrinalConflict),
      hierarchyConflict: Boolean(hierarchyConflict.hierarchyConflict),
      apparentConflict: Boolean(hierarchyConflict.apparentConflict),
      exactIssue: hierarchyConflict.exactIssue || null,
      distinctionType: hierarchyConflict.distinctionType || null,
      controllingAuthority: hierarchyConflict.controllingAuthority || null,
      controllingSource: hierarchyConflict.controllingSource || null,
      reason: hierarchyConflict.reason || null,
      resolutionBasis: hierarchyConflict.resolutionBasis || null
    });
  }

  const seen = new Set();

  return merged.filter((item) => {
    const key = JSON.stringify({
      source: item.source || null,
      type: item.conflictType || item.conflictStatus || null,
      a: item.sourceA || item.source_a_path || item.controllingSource || null,
      b: item.sourceB || item.source_b_path || item.overriddenSource || null,
      issue: item.exactIssue || item.reason || null
    });

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function buildRouteResponsePayload({
  answerText,
  legalBasisDocs = [],
  sourcesUsed = [],
  hierarchyConflict = null
}) {
  return buildFinalRoutePayload({
    answer: answerText,
    legalBasisDocs,
    sourcesUsed,
    hierarchyConflict
  });
}

function buildAnswerMode({
  hookConfig,
  provisionModeResult,
  caseModeResult,
  doctrineModeResult,
  namedLawDetection,
  issuance,
  adaptiveState
}) {
  if (adaptiveState?.responsePlan?.responseMode) {
    return `adaptive_${String(adaptiveState.responsePlan.responseMode).toLowerCase()}_reasoned_answer`;
  }

  if (provisionModeResult?.handled) return "provision_citation_reasoned_answer";
  if (caseModeResult?.handled) return "case_analysis_reasoned_answer";
  if (doctrineModeResult?.handled) return "doctrine_analysis_reasoned_answer";
  if (namedLawDetection?.matched) return "named_law_reasoned_answer";
  if (issuance) return `exact_issuance_${String(hookConfig.mode || "ask").toLowerCase()}_reasoned`;

  return `${String(hookConfig.mode || "ask").toLowerCase()}_reasoned_answer`;
}

function getSpecializedDocs({
  provisionModeResult,
  caseModeResult,
  doctrineModeResult
}) {
  if (provisionModeResult?.handled && Array.isArray(provisionModeResult.topDocs)) {
    return provisionModeResult.topDocs;
  }

  if (caseModeResult?.handled) {
    return mergeUniqueDocs([
      ...(caseModeResult.caseDocs || []),
      ...(caseModeResult.birDocs || [])
    ]);
  }

  if (doctrineModeResult?.handled && Array.isArray(doctrineModeResult.topAuthorities)) {
    return doctrineModeResult.topAuthorities.map((item) => ({
      source: item.title || item.source,
      path: item.source,
      text: item.excerpt,
      authorityType: item.authorityType,
      authorityLevel: item.authorityLevel,
      doctrineLabel: item.doctrineLabel,
      doctrineApplicability: item.doctrineApplicability,
      doctrineApplicabilityExplanation: item.doctrineApplicabilityExplanation
    }));
  }

  return [];
}

async function enforceAdaptiveFinalAnalysis({
  openai,
  model = DEFAULT_MODEL,
  question,
  draftAnswer = "",
  docs = [],
  hierarchyConflict = null,
  jurisprudenceBlock = "",
  conflicts = [],
  memoryContext = "",
  adaptiveState = {}
}) {
  const cleanDraft = normalizeText(draftAnswer);

  if (!cleanDraft) return cleanDraft;

  const sourceContext = formatDocsForPrompt(docs, 8);

  if (!sourceContext.trim()) return cleanDraft;

  const systemPrompt = [
    buildAdaptivePlannerInstructions(adaptiveState),
    "",
    "You are the final adaptive TINA technical reviewer.",
    "Rewrite or refine the draft so it follows the adaptive response plan, authority hierarchy, evidence limits, and conclusion gating.",
    "Use only the provided indexed source context, adaptive context, conflict metadata, and draft.",
    "Do not invent laws, cases, dates, rates, issuances, section numbers, GR numbers, or citations.",
    "If a required authority is not provided, state that no indexed support was retrieved.",
    "Do not append a raw source list; the API route payload handles sources."
  ].join("\n");

  const userPrompt = [
    "QUESTION:",
    question,
    "",
    "CONVERSATION MEMORY:",
    memoryContext || "No prior conversation.",
    "",
    "ADAPTIVE CONTEXT:",
    buildAdaptiveContextForPrompt(adaptiveState),
    "",
    "DRAFT ANSWER:",
    cleanDraft,
    "",
    "INDEXED SOURCE CONTEXT:",
    sourceContext,
    "",
    "CONFLICT / JURISPRUDENCE CONTEXT:",
    buildConflictContextForPrompt({
      hierarchyConflict,
      jurisprudenceBlock,
      conflicts
    }),
    "",
    "OUTPUT REQUIREMENT:",
    adaptiveState?.responsePlan?.responseTemplate?.length
      ? adaptiveState.responsePlan.responseTemplate.join("\n")
      : TINA_AF_HEADINGS.join("\n")
  ].join("\n");

  const response = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  return response.choices?.[0]?.message?.content?.trim() || cleanDraft;
}

async function persistAnswerRendering({
  supabase,
  userId,
  conversationId,
  messageId = null,
  adaptiveState,
  answerText,
  routePayload,
  finalVisibleSources,
  limitationStatement = null
}) {
  try {
    const { error } = await supabase.from("tina_answer_renderings").insert({
      user_id: userId || null,
      conversation_id: conversationId || null,
      message_id: messageId || null,
      response_mode:
        adaptiveState?.responsePlan?.responseMode ||
        adaptiveState?.adaptiveMode?.primaryMode ||
        null,
      response_depth:
        adaptiveState?.responsePlan?.responseDepth ||
        adaptiveState?.adaptiveMode?.outputDepth ||
        null,
      answer_markdown: answerText || "",
      answer_sections: adaptiveState?.responsePlan?.responseTemplate || [],
      citations_used: routePayload?.sources || [],
      sources_used: finalVisibleSources || [],
      limitation_statement: limitationStatement,
      confidence_statement: routePayload?.confidence_level || null,
      renderer_payload: {
        adaptiveMode: adaptiveState?.adaptiveMode || null,
        queryIntent: adaptiveState?.queryIntent || null,
        responsePlan: adaptiveState?.responsePlan || null,
        riskScore: adaptiveState?.riskScore || null,
        positionStrength: adaptiveState?.positionStrength || null,
        assumptionGap: adaptiveState?.assumptionGap || null
      }
    });

    if (error) {
      console.warn("tina_answer_renderings insert skipped:", error.message);
    }
  } catch (error) {
    console.warn("tina_answer_renderings insert failed:", error?.message || error);
  }
}

function buildFallbackComplianceAnswer({
  fallbackText,
  professionalInsight,
  adaptiveState
}) {
  const limitation =
    adaptiveState?.assumptionGap?.limitationStatement ||
    adaptiveState?.responsePlan?.limitationStatement ||
    "Based on the available facts, the position is preliminary and subject to verification.";

  const adaptiveNote =
    adaptiveState?.responsePlan?.mustIncludeLimitation ||
    adaptiveState?.assumptionGap?.mustDiscloseBeforeConclusion
      ? `\n\nLimitation: ${limitation}`
      : "";

  return buildFinalCompliantAnswer({
    draftAnswer: `${fallbackText}${adaptiveNote}`,
    fallbackAnswer: fallbackText,
    directAnswer: "",
    legalBasisDocs: [],
    sourcesUsed: [],
    conflicts: [],
    hierarchyConflict: null,
    professionalInsight
  });
}

function buildNamedLawFallbackText(bestMatch) {
  if (!bestMatch) {
    return "No exact indexed legal source was found for the named law or act asked.";
  }

  const title =
    bestMatch.shortTitle ||
    bestMatch.canonicalTitle ||
    `RA ${bestMatch.republicActNumber || ""}`.trim();

  const raText = bestMatch.republicActNumber
    ? ` (RA ${bestMatch.republicActNumber})`
    : "";

  return [
    `TINA recognized the question as referring to ${title}${raText}.`,
    "",
    "However, no exact indexed primary legal source for that law was found in the current tax library.",
    "TINA will not present unrelated documents as support.",
    "",
    "Please upload or index the exact law text and, if available, its implementing rules and regulations."
  ].join("\n");
}

function selectGroundedDisplayableDocs(docs = [], maxItems = MAX_VISIBLE_SOURCES) {
  return sortByAuthorityAndScore(docs)
    .filter((doc) => !shouldHideSourceFromUser(doc))
    .slice(0, maxItems);
}

function normalizeRendererResult(rendered) {
  if (typeof rendered === "string") return rendered;
  if (rendered?.answer) return rendered.answer;
  if (rendered?.answerText) return rendered.answerText;
  if (rendered?.markdown) return rendered.markdown;
  return "";
}

function renderFinalAnswer({
  preliminaryAnswer,
  fallbackAnswer,
  adaptiveState,
  topLegalBases,
  finalVisibleSources,
  mergedConflictSignals,
  hierarchyConflict,
  professionalInsight,
  routePayload
}) {
  try {
    const rendered = renderAdaptiveAnswer({
      draftAnswer: preliminaryAnswer,
      fallbackAnswer,
      adaptiveContext: adaptiveState,
      responsePlan: adaptiveState?.responsePlan || null,
      assumptionGap: adaptiveState?.assumptionGap || null,
      riskScore: adaptiveState?.riskScore || null,
      positionStrength: adaptiveState?.positionStrength || null,
      legalBasisDocs: topLegalBases,
      sourcesUsed: finalVisibleSources,
      conflicts: mergedConflictSignals,
      hierarchyConflict,
      professionalInsight,
      routePayload
    });

    const normalized = normalizeRendererResult(rendered);

    if (normalized) return normalized;
  } catch (error) {
    console.warn("answer-renderer.js failed; fallback compliance renderer used:", error?.message || error);
  }

  return buildFinalCompliantAnswer({
    draftAnswer: preliminaryAnswer,
    fallbackAnswer,
    legalBasisDocs: topLegalBases,
    sourcesUsed: finalVisibleSources,
    conflicts: mergedConflictSignals,
    hierarchyConflict,
    professionalInsight
  });
}

export function createRagAnswerHandler({ supabase, openai }) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("createRagAnswerHandler requires a valid Supabase client.");
  }

  if (!openai) {
    throw new Error("createRagAnswerHandler requires OpenAI client.");
  }

  async function saveConversationTurn({
    conversationId,
    userId,
    question,
    answerText,
    sourcesUsed = [],
    fallbackReferences = []
  }) {
    if (!conversationId || !userId) return;

    await saveMessage(supabase, {
      conversationId,
      userId,
      role: "user",
      content: question
    });

    await saveMessage(supabase, {
      conversationId,
      userId,
      role: "assistant",
      content: answerText,
      sourcesUsed,
      fallbackReferences
    });

    const hooks = extractMemoryHooks(question);
    await saveMemoryHooks(supabase, userId, hooks);
  }

  async function saveAllMemory({
    conversationId,
    userId,
    hookConfig,
    topicData,
    originalQuestion,
    answerText,
    sourcesUsed = [],
    fallbackReferences = []
  }) {
    if (hookConfig.requires_memory === false) return;

    await saveConversationTurn({
      conversationId,
      userId,
      question: originalQuestion,
      answerText,
      sourcesUsed,
      fallbackReferences
    });

    await saveTopicState(supabase, {
      userId,
      sessionId: conversationId || null,
      topic: topicData.topic,
      subject: topicData.subject,
      taxType: topicData.taxType,
      question: originalQuestion,
      answer: answerText
    });

    await saveModeState(supabase, {
      userId,
      sessionId: conversationId || null,
      activeHook: hookConfig.hook_code,
      activeMode: hookConfig.mode,
      modeTitle: hookConfig.title,
      lastQuestion: originalQuestion,
      lastAnswer: answerText
    });
  }

  async function generateGeneralFallbackAnswer(
    cleanQuestion,
    memoryContext,
    adaptiveState,
    reason = "No sufficient indexed source was found."
  ) {
    const fallbackSystemPrompt = [
      adaptiveState?.adaptivePromptBundle || FALLBACK_TINA_STRUCTURE,
      "",
      "You may answer using general Philippine tax knowledge only when indexed sources are absent or weak.",
      "Rules:",
      "1. Clearly state that this is a general fallback answer.",
      "2. Do not pretend the answer came from indexed Google Drive or Supabase sources.",
      "3. Do not invent specific RR, RMC, RMO, RAMO, BIR rulings, dates, forms, deadlines, rates, case names, GR numbers, or case citations.",
      "4. For exact issuance questions, do not provide speculative content.",
      "5. Recommend verification against official NIRC/BIR/CTA/Supreme Court sources.",
      "6. Follow the adaptive response plan if available.",
      buildConclusionRestrictionInstruction(adaptiveState)
    ].join("\n");

    const fallbackUserPrompt = [
      "Reason for fallback:",
      reason,
      "",
      "Conversation Memory:",
      memoryContext,
      "",
      "Adaptive Context:",
      buildAdaptiveContextForPrompt(adaptiveState),
      "",
      "Question:",
      cleanQuestion
    ].join("\n");

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: fallbackSystemPrompt },
        { role: "user", content: fallbackUserPrompt }
      ]
    });

    const text = response.choices?.[0]?.message?.content?.trim();

    return [
      "General TINA Fallback Answer",
      "",
      `Source Status: ${reason}`,
      "",
      "Important Note: This answer is not based on an indexed Google Drive/Supabase source and should be verified against official BIR/NIRC/court sources.",
      "",
      text || "No fallback answer generated."
    ].join("\n");
  }

  return {
    async handleRagAnswer({
      res,
      userId,
      conversationId,
      hookConfig,
      cleanQuestion,
      originalQuestion,
      adaptiveContext = null,
      adaptivePromptBundle = null
    }) {
      try {
        if (!cleanQuestion || !String(cleanQuestion).trim()) {
          return res.status(400).json({
            success: false,
            error: "Question required after hook"
          });
        }

        const adaptiveState = buildAdaptiveState({
          adaptiveContext,
          adaptivePromptBundle
        });

        const topicData = await detectTopic({
          supabase,
          question: cleanQuestion,
          userId,
          sessionId: conversationId || null
        });

        let finalQuestion = topicData.resolvedQuestion || cleanQuestion;

        if ((!finalQuestion || finalQuestion.length < 5) && conversationId && userId) {
          try {
            const lastState = await getLastTopicState(
              supabase,
              userId,
              conversationId
            );

            if (lastState?.last_question) {
              finalQuestion = lastState.last_question;
            }
          } catch (error) {
            console.warn("Topic fallback error:", error.message);
          }
        }

        const issuance = detectIssuanceQuery(finalQuestion);
        const questionType = classifyQuestion(finalQuestion);
        const namedLawDetection = detectNamedLaw(finalQuestion);
        const responseMode = getResponseMode(adaptiveState, hookConfig);

        const retrievalQueries = namedLawDetection.matched
          ? buildNamedLawSearchQueries(finalQuestion, {
              includeOriginalQuestion: true,
              maxQueries: 6
            })
          : [finalQuestion];

        let conversationHistory = [];

        if (conversationId && userId) {
          conversationHistory = await getConversationMessages(supabase, {
            conversationId,
            userId
          });
        }

        const memoryContext = buildMemoryContext(conversationHistory);

        const retrievals = [];

        for (const query of retrievalQueries) {
          const retrieval = await hybridRetrieve({
            supabase,
            vectorStore: { smartSearch, searchSimilar },
            query,
            questionType,
            taxType: topicData.taxType || "",
            topK:
              adaptiveState?.responsePlan?.responseDepth === "COMPREHENSIVE"
                ? 16
                : 12,
            adaptiveMode: responseMode
          });

          retrievals.push(retrieval);
        }

        const mergedDocs = mergeUniqueDocs(
          retrievals.flatMap((retrieval) => retrieval.results || [])
        );

        const reranked = rerankForTina({
          query: finalQuestion,
          docs: mergedDocs,
          limit: 16,
          responseMode,
          suppressIssueMismatch: true,
          suppressWeakSecondary: true,
          suppressSuperseded: true
        });

        const hierarchyRankedDocs = rerankByHierarchy(
          reranked.results || mergedDocs,
          finalQuestion
        );

        const supersessionResult = applySupersessionFilter(hierarchyRankedDocs, new Date());

        const activeRankedDocs =
          supersessionResult.activeDocs?.length > 0
            ? supersessionResult.activeDocs
            : hierarchyRankedDocs;

        const namedLawFiltered = namedLawDetection.matched
          ? filterDocsForNamedLaw(activeRankedDocs, namedLawDetection, {
              minScore: 40,
              hardFilter: true,
              maxDocs: 12,
              requirePrimaryAuthority: true
            })
          : {
              lawMatched: false,
              bestMatch: null,
              matchedDocs: activeRankedDocs,
              discardedDocs: [],
              scoredDocs: [],
              primaryAuthorityFound: false
            };

        const internalRankedDocs =
          namedLawDetection.matched && namedLawFiltered.matchedDocs.length > 0
            ? namedLawFiltered.matchedDocs
            : activeRankedDocs;

        const displayableRankedDocs = internalRankedDocs.filter(
          (doc) => !shouldHideSourceFromUser(doc)
        );

        const hierarchyConflict = detectHierarchyConflict(displayableRankedDocs.slice(0, 6));

        const jurisprudenceCases = selectIssueRelevantJurisprudence({
          query: finalQuestion,
          docs: internalRankedDocs,
          limit: 4,
          responseMode
        });

        const jurisprudenceBlock = buildJurisprudencePromptBlock({
          query: finalQuestion,
          cases: jurisprudenceCases,
          supportingAuthorities: displayableRankedDocs.slice(0, 6)
        });

        let evidence = normalizeRetrievedEvidence(
          internalRankedDocs.map((doc) => ({
            ...doc,
            authority_tier:
              doc.authorityLevel ??
              doc.authority_level ??
              doc.metadata?.authorityLevel ??
              null,
            metadata: buildEvidenceMetadata(doc)
          }))
        );

        evidence = rankEvidenceByAuthority(evidence);

        const rawConflicts = detectEvidenceConflicts(evidence);

        const displayableConflicts = rawConflicts.filter((conflict) => {
          const a = conflict.source_a_path || "";
          const b = conflict.source_b_path || "";

          return (
            !shouldHideSourceFromUser({ path: a }) &&
            !shouldHideSourceFromUser({ path: b })
          );
        });

        const topEvidence = evidence.slice(0, 10);

        let preliminaryAnswer = "";

        const provisionModeResult = await maybeGenerateProvisionCitationAnswer({
          openai,
          question: finalQuestion,
          retrievedResults: internalRankedDocs,
          model: DEFAULT_MODEL
        });

        const caseModeResult =
          !provisionModeResult.handled
            ? await maybeGenerateCaseAnalysisAnswer({
                openai,
                question: finalQuestion,
                retrievedResults: internalRankedDocs,
                model: DEFAULT_MODEL
              })
            : { handled: false };

        const doctrineModeResult =
          !provisionModeResult.handled && !caseModeResult.handled
            ? await maybeGenerateDoctrineAnswer({
                openai,
                question: finalQuestion,
                retrievedResults: internalRankedDocs,
                model: DEFAULT_MODEL
              })
            : { handled: false };

        const specializedDocs = getSpecializedDocs({
          provisionModeResult,
          caseModeResult,
          doctrineModeResult
        });

        const strictDocsForContext = mergeUniqueDocs([
          ...specializedDocs,
          ...jurisprudenceCases,
          ...internalRankedDocs
        ]);

        const strictContext = formatDocsForPrompt(strictDocsForContext, 8);

        if (provisionModeResult.handled) {
          preliminaryAnswer = provisionModeResult.answer || "";
        } else if (caseModeResult.handled) {
          preliminaryAnswer = caseModeResult.answer || "";
        } else if (doctrineModeResult.handled) {
          preliminaryAnswer = doctrineModeResult.answer || "";
        } else if (topEvidence.length > 0) {
          const topLegalBasesForPrompt = selectTopLegalBases(displayableRankedDocs, 4);

          const strictPrompt = [
            adaptiveState?.adaptivePromptBundle || "",
            buildStrictAnswerPrompt({
              hookMode: hookConfig?.mode || "ASK",
              originalQuestion,
              cleanQuestion,
              context: strictContext,
              topLegalBases: topLegalBasesForPrompt,
              conflict: hierarchyConflict
            }),
            buildAdaptivePlannerInstructions(adaptiveState)
          ]
            .filter(Boolean)
            .join("\n\n---\n\n");

          const strictResponse = await openai.chat.completions.create({
            model: DEFAULT_MODEL,
            temperature: 0,
            messages: [
              { role: "system", content: strictPrompt },
              {
                role: "user",
                content: [
                  "Conversation Memory:",
                  memoryContext || "No prior conversation.",
                  "",
                  "Topic Data:",
                  JSON.stringify(topicData || {}),
                  "",
                  `Question Type: ${questionType}`,
                  `Resolved Question: ${finalQuestion}`,
                  "",
                  "Adaptive Context:",
                  buildAdaptiveContextForPrompt(adaptiveState),
                  "",
                  "Jurisprudence Review:",
                  jurisprudenceBlock,
                  "",
                  "Hierarchy Conflict Review:",
                  JSON.stringify(hierarchyConflict || {}, null, 2)
                ].join("\n")
              }
            ]
          });

          preliminaryAnswer =
            strictResponse.choices?.[0]?.message?.content?.trim() ||
            (await synthesizeGroundedAnswer({
              openai,
              hookConfig,
              originalQuestion,
              cleanQuestion,
              topicData,
              questionType,
              evidence: topEvidence,
              conflicts: rawConflicts,
              memoryContext
            }));
        }

        const mergedConflictSignals = mergeConflictSignals({
          rawConflicts,
          displayableConflicts,
          hierarchyConflict
        });

        if (preliminaryAnswer && topEvidence.length > 0) {
          preliminaryAnswer = await enforceAdaptiveFinalAnalysis({
            openai,
            model: DEFAULT_MODEL,
            question: finalQuestion,
            draftAnswer: preliminaryAnswer,
            docs: strictDocsForContext,
            hierarchyConflict,
            jurisprudenceBlock,
            conflicts: mergedConflictSignals,
            memoryContext,
            adaptiveState
          });
        }

        preliminaryAnswer = sanitizeDraftAnswer(
          stripTrailingSourceSection(preliminaryAnswer || "")
        );

        const finalDisplayableDocs = selectGroundedDisplayableDocs(
          mergeUniqueDocs([
            ...specializedDocs,
            ...jurisprudenceCases,
            ...displayableRankedDocs
          ]),
          Math.max(MAX_VISIBLE_SOURCES, 8)
        );

        const finalVisibleSources = filterVisibleSources(finalDisplayableDocs, {
          maxItems: MAX_VISIBLE_SOURCES,
          supersessionResult
        });

        const topDisplayableEvidence = rankEvidenceByAuthority(
          normalizeRetrievedEvidence(finalDisplayableDocs)
        ).slice(0, 10);

        const claimSupportMap = buildClaimSupportMap(
          preliminaryAnswer,
          topDisplayableEvidence
        );

        const validation = validateEvidenceSufficiency({
          evidence: finalDisplayableDocs,
          claimSupportMap,
          minEvidenceCount: 1,
          minSupportedClaims: 1,
          minTopScore: 0.25,
          query: finalQuestion,
          requirePrimaryAuthority: Boolean(namedLawDetection?.matched)
        });

        const shouldFallback =
          (namedLawDetection.matched && !namedLawFiltered.primaryAuthorityFound) ||
          (namedLawDetection.matched && finalDisplayableDocs.length === 0) ||
          (issuance && finalDisplayableDocs.length === 0) ||
          topEvidence.length === 0 ||
          shouldRejectForWeakLegalBasis({
            validation,
            hasExactCitation: Boolean(
              retrievals.some((retrieval) => retrieval?.exactCitation?.matched)
            )
          });

        const safeTopConfidenceRaw =
          internalRankedDocs.length > 0
            ? Math.max(0, ...internalRankedDocs.map((item) => getScore(item)))
            : 0;

        const safeTopConfidence = toSafeDbNumeric(
          safeTopConfidenceRaw,
          999999.9999,
          4
        );

        let reasoningRun = null;

        try {
          reasoningRun = await saveReasoningRun(supabase, {
            userId,
            sessionId: conversationId || null,
            question: originalQuestion,
            normalizedQuestion: finalQuestion,
            questionType,
            mode: hookConfig.mode,
            retrievalStatus: topEvidence.length ? "evidence_found" : "no_evidence",
            reasoningStatus: shouldFallback ? "fallback" : "grounded_answer",
            fallbackUsed: shouldFallback,
            topConfidence: safeTopConfidence,
            answerSummary: String(preliminaryAnswer || "").slice(0, 1000)
          });

          if (reasoningRun?.id) {
            await saveReasoningEvidence(supabase, {
              reasoningRunId: reasoningRun.id,
              evidence: claimSupportMap
            });

            if (mergedConflictSignals.length) {
              await saveReasoningConflicts(supabase, {
                reasoningRunId: reasoningRun.id,
                conflicts: mergedConflictSignals
              });
            }
          }
        } catch (reasoningError) {
          console.warn("Reasoning persistence error:", reasoningError.message);
        }

        const complianceInsight = buildComplianceInsight({
          issuance,
          questionType,
          namedLawDetection,
          hierarchyConflict,
          adaptiveState
        });

        if (hookConfig.mode === "SOURCE_FINDER") {
          const sourcesUsed = filterVisibleSources(
            finalDisplayableDocs,
            {
              maxItems: MAX_VISIBLE_SOURCES,
              supersessionResult
            }
          );

          const answerText = sourcesUsed.length
            ? [
                "Source Finder Results",
                "",
                ...sourcesUsed.map((source, index) =>
                  [
                    `${index + 1}. ${source.issuanceNumber ? `${source.issuanceNumber} – ` : ""}${source.title}`,
                    `Authority: Level ${source.authorityLevel || 99} - ${
                      source.authorityLabel || source.authorityType || "Unknown"
                    }`
                  ].join("\n")
                )
              ].join("\n\n")
            : namedLawDetection.matched
              ? buildNamedLawFallbackText(namedLawDetection.bestMatch)
              : "No indexed source found for the requested query.";

          await saveAllMemory({
            conversationId,
            userId,
            hookConfig,
            topicData,
            originalQuestion,
            answerText,
            sourcesUsed
          });

          const routePayload = buildRouteResponsePayload({
            answerText,
            legalBasisDocs: sourcesUsed,
            sourcesUsed,
            hierarchyConflict: null
          });

          await persistAnswerRendering({
            supabase,
            userId,
            conversationId,
            adaptiveState,
            answerText,
            routePayload,
            finalVisibleSources: sourcesUsed
          });

          return res.json({
            success: true,
            engine: "TINA Adaptive Reasoning Engine",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            hookTitle: hookConfig.title,
            answer: answerText,
            answerMode: sourcesUsed.length ? "source_finder_results" : "source_finder_no_match",
            confidence: sourcesUsed.length ? "SOURCE_LIST" : "LOW",
            sourceStatus: sourcesUsed.length ? "INDEXED_SOURCE_LISTED" : "NO_INDEXED_SOURCE",
            originalQuestion,
            resolvedQuestion: finalQuestion,
            sourcesUsed: routePayload.sources,
            sources: routePayload.sources,
            authorityUsed: routePayload.authority_used,
            supersessionAudit: routePayload.supersession_audit,
            vectorMatches: routePayload.sources.length,
            adaptive: {
              enabled: adaptiveState.enabled,
              responseMode: adaptiveState?.responsePlan?.responseMode || null,
              riskLevel: adaptiveState?.riskScore?.overallRisk?.level || null,
              positionStrength: adaptiveState?.positionStrength?.positionStrength || null
            }
          });
        }

        if (shouldFallback) {
          const fallbackReason =
            namedLawDetection.matched && namedLawDetection.bestMatch
              ? `No exact indexed primary source matched ${
                  namedLawDetection.bestMatch.shortTitle ||
                  namedLawDetection.bestMatch.canonicalTitle
                }.`
              : issuance || questionType === "issuance"
                ? "No indexed document found or insufficient verified evidence for the requested issuance."
                : "Indexed sources were absent or insufficient.";

          const fallbackText =
            namedLawDetection.matched && namedLawDetection.bestMatch
              ? buildNamedLawFallbackText(namedLawDetection.bestMatch)
              : issuance || questionType === "issuance"
                ? "No indexed document found or insufficient verified evidence for the requested issuance. TINA will not generate a speculative answer."
                : await generateGeneralFallbackAnswer(
                    finalQuestion,
                    memoryContext,
                    adaptiveState,
                    fallbackReason
                  );

          const answerText = buildFallbackComplianceAnswer({
            fallbackText,
            professionalInsight: complianceInsight,
            adaptiveState
          });

          await saveAllMemory({
            conversationId,
            userId,
            hookConfig,
            topicData,
            originalQuestion,
            answerText,
            sourcesUsed: []
          });

          const routePayload = buildRouteResponsePayload({
            answerText,
            legalBasisDocs: [],
            sourcesUsed: [],
            hierarchyConflict: null
          });

          await persistAnswerRendering({
            supabase,
            userId,
            conversationId,
            adaptiveState,
            answerText,
            routePayload,
            finalVisibleSources: [],
            limitationStatement:
              adaptiveState?.assumptionGap?.limitationStatement ||
              adaptiveState?.responsePlan?.limitationStatement ||
              null
          });

          return res.json({
            success: true,
            engine: "TINA Adaptive Reasoning Engine",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            hookTitle: hookConfig.title,
            answer: answerText,
            answerMode:
              namedLawDetection.matched && namedLawDetection.bestMatch
                ? "named_law_exact_source_not_found"
                : issuance
                  ? "no_exact_issuance_match"
                  : "adaptive_general_fallback",
            confidence: issuance || namedLawDetection.matched ? "LOW" : "GENERAL",
            sourceStatus: "FALLBACK_USED",
            questionType,
            topicData,
            originalQuestion,
            resolvedQuestion: finalQuestion,
            sourcesUsed: routePayload.sources,
            sources: routePayload.sources,
            authorityUsed: routePayload.authority_used,
            supersessionAudit: routePayload.supersession_audit,
            vectorMatches: topDisplayableEvidence.length,
            detectedIssuance: issuance || null,
            detectedNamedLaw: namedLawDetection.bestMatch || null,
            reasoningRunId: reasoningRun?.id || null,
            conflictType: hierarchyConflict?.conflictType || null,
            doctrinalConflict: Boolean(hierarchyConflict?.doctrinalConflict),
            hierarchyConflict: Boolean(hierarchyConflict?.hierarchyConflict),
            apparentConflict: Boolean(hierarchyConflict?.apparentConflict),
            adaptive: {
              enabled: adaptiveState.enabled,
              responseMode: adaptiveState?.responsePlan?.responseMode || null,
              responseDepth: adaptiveState?.responsePlan?.responseDepth || null,
              riskLevel: adaptiveState?.riskScore?.overallRisk?.level || null,
              positionStrength: adaptiveState?.positionStrength?.positionStrength || null,
              conclusionRestriction: getConclusionRestriction(adaptiveState),
              mustDiscloseBeforeConclusion:
                adaptiveState?.assumptionGap?.mustDiscloseBeforeConclusion || false
            }
          });
        }

        const topLegalBases = selectTopLegalBases(finalDisplayableDocs, 4);

        const preliminaryRoutePayload = buildRouteResponsePayload({
          answerText: preliminaryAnswer,
          legalBasisDocs: topLegalBases,
          sourcesUsed: finalVisibleSources,
          hierarchyConflict
        });

        const answerText = renderFinalAnswer({
          preliminaryAnswer,
          fallbackAnswer: buildNoSourceReply(),
          adaptiveState,
          topLegalBases,
          finalVisibleSources,
          mergedConflictSignals,
          hierarchyConflict,
          professionalInsight: complianceInsight,
          routePayload: preliminaryRoutePayload
        });

        await saveAllMemory({
          conversationId,
          userId,
          hookConfig,
          topicData,
          originalQuestion,
          answerText,
          sourcesUsed: finalVisibleSources
        });

        const routePayload = buildRouteResponsePayload({
          answerText,
          legalBasisDocs: topLegalBases,
          sourcesUsed: finalVisibleSources,
          hierarchyConflict
        });

        await persistAnswerRendering({
          supabase,
          userId,
          conversationId,
          adaptiveState,
          answerText,
          routePayload,
          finalVisibleSources,
          limitationStatement:
            adaptiveState?.assumptionGap?.limitationStatement ||
            adaptiveState?.responsePlan?.limitationStatement ||
            null
        });

        return res.json({
          success: true,
          engine: "TINA Adaptive Reasoning Engine",
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          answer: answerText,
          answerMode: buildAnswerMode({
            hookConfig,
            provisionModeResult,
            caseModeResult,
            doctrineModeResult,
            namedLawDetection,
            issuance,
            adaptiveState
          }),
          confidence: routePayload.confidence_level || "MEDIUM",
          sourceStatus: routePayload.sources.length
            ? "INDEXED_ADAPTIVE_REASONED_SOURCE_USED"
            : "INDEXED_ADAPTIVE_ANSWER_WITH_NO_DISPLAYABLE_SOURCE",
          questionType,
          topicData,
          originalQuestion,
          resolvedQuestion: finalQuestion,
          sourcesUsed: routePayload.sources,
          sources: routePayload.sources,
          authorityUsed: routePayload.authority_used,
          supersessionAudit: routePayload.supersession_audit,
          vectorMatches: finalDisplayableDocs.length,
          detectedIssuance: issuance || null,
          detectedNamedLaw: namedLawDetection.bestMatch || null,
          reasoningRunId: reasoningRun?.id || null,
          conflictCount: mergedConflictSignals.length,
          conflictType: hierarchyConflict?.conflictType || null,
          doctrinalConflict: Boolean(hierarchyConflict?.doctrinalConflict),
          hierarchyConflict: Boolean(hierarchyConflict?.hierarchyConflict),
          apparentConflict: Boolean(hierarchyConflict?.apparentConflict),
          supersededFilteredCount: supersessionResult?.superseded?.length || 0,
          adaptive: {
            enabled: adaptiveState.enabled,
            responseMode: adaptiveState?.responsePlan?.responseMode || null,
            responseDepth: adaptiveState?.responsePlan?.responseDepth || null,
            adaptivePrimaryMode: adaptiveState?.adaptiveMode?.primaryMode || null,
            riskLevel: adaptiveState?.riskScore?.overallRisk?.level || null,
            positionStrength: adaptiveState?.positionStrength?.positionStrength || null,
            conclusionRestriction: getConclusionRestriction(adaptiveState),
            mustDiscloseBeforeConclusion:
              adaptiveState?.assumptionGap?.mustDiscloseBeforeConclusion || false,
            taxpayerDefensibility:
              adaptiveState?.riskScore?.taxpayerDefensibility?.level ||
              adaptiveState?.positionStrength?.taxpayerDefensibility?.level ||
              null
          }
        });
      } catch (error) {
        console.error("RAG answer error:", error);

        return res.status(500).json({
          success: false,
          error: error.message || "RAG answer failed"
        });
      }
    }
  };
}
