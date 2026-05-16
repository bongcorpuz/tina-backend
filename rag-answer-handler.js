// FILE: rag-answer-handler.js
"use strict";

/**
 * TINA Adaptive RAG Answer Handler
 * Version: 4.1.0
 */

import { detectTopic } from "./topic-detector.js";
import { saveModeState } from "./mode-state.js";

import {
  getLastTopicState,
  extractMemoryHooks,
  saveMemoryHooks,
  saveTopicState
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

import { maybeGenerateProvisionCitationAnswer } from "./provision-citation-engine.js";
import { maybeGenerateCaseAnalysisAnswer } from "./case-analysis-engine.js";
import { maybeGenerateDoctrineAnswer } from "./doctrine-tagging-engine.js";

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

import { detectHierarchyConflict } from "./conflict-engine.js";
import { applySupersessionFilter } from "./supersession-engine.js";
import { hybridRetrieve } from "./retrieval-engine.js";
import { rerankForTina } from "./reranker-engine.js";

import {
  selectIssueRelevantJurisprudence,
  buildJurisprudencePromptBlock,
  buildJurisprudencePayload,
  buildNoJurisprudenceText
} from "./jurisprudence-engine.js";

import { analyzeQueryIntent } from "./query-intent-engine.js";
import * as IssueClassificationEngine from "./issue-classification-engine.js";
import answerRenderer from "./answer-renderer.js";

const ENGINE_VERSION = "4.1.0";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

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

Default substantive structure:
A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING JURISPRUDENCE
D. DOCTRINAL STATUS / CONFLICT ANALYSIS
E. HIERARCHY ANALYSIS
F. PRACTICAL APPLICATION

Strict rules:
- Do not fabricate laws, cases, GR numbers, rates, deadlines, dates, or issuances.
- Do not cite unrelated cases or unrelated provisions.
- Do not say "Conflict detected: YES" unless complete conflict metadata exists.
- Explain exact conflict, controlling authority, and why it controls only if same-issue and opposite-holding gates passed.
- If facts or documents are incomplete, state that the position is preliminary and subject to verification.
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
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
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
    doc.final_score ??
    doc.combined_score ??
    doc.score ??
    doc.similarity ??
    0;

  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function isIssueMatched(doc = {}) {
  if (doc.issueMismatch === true || doc.issueClassificationMatch?.issueMismatch === true) return false;
  if (doc.issueClassificationMatch?.matched === true) return true;
  if (doc.issueClassificationMatch?.issueOverlap === true) return true;
  if (doc.issueClassificationMatch?.targetAuthorityMatch === true) return true;
  return null;
}

function isTargetAuthorityMatched(doc = {}) {
  return doc.targetAuthorityMatch === true || doc.issueClassificationMatch?.targetAuthorityMatch === true;
}

function sortByAuthorityAndScore(docs = []) {
  return [...docs].sort((a, b) => {
    const targetDiff = Number(isTargetAuthorityMatched(b)) - Number(isTargetAuthorityMatched(a));
    if (targetDiff !== 0) return targetDiff;

    const aIssue = isIssueMatched(a);
    const bIssue = isIssueMatched(b);
    if (aIssue !== bIssue) return Number(bIssue === true) - Number(aIssue === true);

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
        `TARGET AUTHORITY MATCH: ${isTargetAuthorityMatched(doc) ? "YES" : "NO"}`,
        `ISSUE CLASSIFICATION MATCH: ${JSON.stringify(doc.issueClassificationMatch || null)}`,
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
    issueClassificationMatch: doc.issueClassificationMatch || null,
    targetAuthorityMatch: doc.targetAuthorityMatch === true,
    issueMismatch: doc.issueMismatch === true,
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
    isSuperseded: Boolean(
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

function normalizeIssueClassification(raw = {}, fallbackQueryIntent = null) {
  const queryIntent = fallbackQueryIntent || {};

  const primaryIssue =
    raw.primaryIssue ||
    raw.primary_issue ||
    raw.issueType ||
    raw.issue_type ||
    queryIntent.primaryIssue ||
    safeArray(queryIntent.issueTypes)[0] ||
    "GENERAL";

  const subIssues = unique([
    primaryIssue,
    ...safeArray(raw.subIssues),
    ...safeArray(raw.subIssue),
    ...safeArray(raw.sub_issues),
    ...safeArray(raw.sub_issue),
    ...safeArray(queryIntent.subIssues),
    ...safeArray(queryIntent.issueTypes)
  ]);

  const targetAuthorities = unique([
    ...safeArray(raw.targetAuthorities),
    ...safeArray(raw.target_authorities),
    ...safeArray(queryIntent.targetAuthorities)
  ]);

  const legalDimensions = unique([
    ...safeArray(raw.legalDimensions),
    ...safeArray(raw.legalDimension),
    ...safeArray(raw.legal_dimensions),
    ...safeArray(raw.legal_dimension),
    ...safeArray(queryIntent.legalDimensions)
  ]);

  return {
    primaryIssue,
    subIssue: raw.subIssue || raw.sub_issue || subIssues[0] || primaryIssue,
    subIssues,
    legalDimensions,
    retrievalStrategy:
      raw.retrievalStrategy ||
      raw.retrieval_strategy ||
      queryIntent.retrievalStrategy ||
      "ISSUE_CLASSIFIED_RETRIEVAL",
    targetAuthorities,
    issueConfidence:
      raw.issueConfidence ||
      raw.confidence ||
      queryIntent.confidence ||
      null,
    issueRationale:
      raw.issueRationale ||
      raw.rationale ||
      raw.reason ||
      null,
    raw
  };
}

function callPossibleIssueClassifier({ question = "", queryIntent = {}, adaptiveContext = {} } = {}) {
  const candidates = [
    IssueClassificationEngine.classifyIssue,
    IssueClassificationEngine.classifyTaxIssue,
    IssueClassificationEngine.classifyQueryIssue,
    IssueClassificationEngine.classifyIssueForRetrieval,
    IssueClassificationEngine.analyzeIssueClassification,
    IssueClassificationEngine.default?.classifyIssue,
    IssueClassificationEngine.default?.classifyTaxIssue,
    IssueClassificationEngine.default?.classifyQueryIssue,
    IssueClassificationEngine.default?.classifyIssueForRetrieval,
    IssueClassificationEngine.default?.analyzeIssueClassification
  ].filter((fn) => typeof fn === "function");

  for (const fn of candidates) {
    try {
      const result = fn({
        query: question,
        question,
        cleanQuestion: question,
        queryIntent,
        adaptiveContext
      });
      if (result && typeof result === "object") return result;
    } catch (error) {
      console.warn("issue-classification-engine candidate failed:", error?.message || error);
    }

    try {
      const result = fn(question);
      if (result && typeof result === "object") return result;
    } catch {
      // ignore
    }
  }

  return null;
}

function fallbackIssueClassification(question = "", queryIntent = {}) {
  const q = String(question || "").toLowerCase();

  let primaryIssue = "GENERAL";
  const subIssues = [];
  const legalDimensions = [];
  const targetAuthorities = [];

  const add = (arr, value) => {
    if (value && !arr.includes(value)) arr.push(value);
  };

  if (/\b(vat refund|input vat refund|tcc|unutilized input vat|excess input vat|administrative claim|judicial claim|120\+30)\b/i.test(q)) {
    primaryIssue = "VAT_REFUND";
    add(subIssues, "VAT_REFUND");
    add(legalDimensions, "PROCEDURAL");
    add(legalDimensions, "EVIDENTIARY");
    targetAuthorities.push("STATUTE", "RR", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION");
  } else if (/\b(vat|output vat|vatable|subject to vat|value-added tax|gross receipts)\b/i.test(q)) {
    primaryIssue = "VAT_LIABILITY";
    add(subIssues, "VAT_LIABILITY");
    add(legalDimensions, "SUBSTANTIVE");
    targetAuthorities.push("STATUTE", "RR", "SUPREME_COURT", "RMC");
  } else if (/\b(withholding|ewt|cwt|fwt|2307|1601)\b/i.test(q)) {
    primaryIssue = "WITHHOLDING";
    add(subIssues, "WITHHOLDING");
    add(legalDimensions, "SUBSTANTIVE");
    targetAuthorities.push("STATUTE", "RR", "RMC", "BIR_RULING");
  } else if (/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|taxable income)\b/i.test(q)) {
    primaryIssue = "INCOME_TAX";
    add(subIssues, "INCOME_TAX");
    add(legalDimensions, "SUBSTANTIVE");
    targetAuthorities.push("STATUTE", "RR", "SUPREME_COURT", "RMC");
  } else if (/\b(contract|agreement|lease|concession|clause)\b/i.test(q)) {
    primaryIssue = "CONTRACT";
    add(subIssues, "CONTRACT");
    add(legalDimensions, "CONTRACTUAL");
    targetAuthorities.push("STATUTE", "SUPREME_COURT", "RR");
  } else if (/\b(principal|agent|pass-through|reimbursement|bundled|package|economic substance|substance over form)\b/i.test(q)) {
    primaryIssue = "TRANSACTION";
    add(subIssues, "TRANSACTION");
    add(legalDimensions, "FACTUAL");
    add(legalDimensions, "ECONOMIC_SUBSTANCE");
    targetAuthorities.push("STATUTE", "RR", "SUPREME_COURT", "PFRS");
  } else if (/\b(pfrs|pas|afs|financial statements|accounting treatment|recognition|presentation)\b/i.test(q)) {
    primaryIssue = "ACCOUNTING";
    add(subIssues, "ACCOUNTING");
    add(legalDimensions, "SUBSTANTIVE");
    targetAuthorities.push("PFRS", "PAS", "PSA");
  }

  return normalizeIssueClassification({
    primaryIssue,
    subIssues,
    legalDimensions,
    retrievalStrategy: "FALLBACK_ISSUE_CLASSIFIED_RETRIEVAL",
    targetAuthorities,
    issueConfidence: "FALLBACK_RULE_BASED"
  }, queryIntent);
}

function classifyIssueBeforeRetrieval({ question = "", adaptiveContext = {} } = {}) {
  const queryIntent = adaptiveContext?.queryIntent || analyzeQueryIntent(question) || {};

  const engineResult = callPossibleIssueClassifier({
    question,
    queryIntent,
    adaptiveContext
  });

  if (engineResult) return normalizeIssueClassification(engineResult, queryIntent);
  return fallbackIssueClassification(question, queryIntent);
}

function enrichAdaptiveStateWithIssueClassification(adaptiveState = {}, issueClassification = {}) {
  return {
    ...adaptiveState,
    issueClassification,
    queryIntent: {
      ...(adaptiveState.queryIntent || {}),
      issueClassification,
      primaryIssue: issueClassification.primaryIssue,
      subIssue: issueClassification.subIssue,
      subIssues: issueClassification.subIssues,
      legalDimensions: issueClassification.legalDimensions,
      retrievalStrategy:
        issueClassification.retrievalStrategy ||
        adaptiveState.queryIntent?.retrievalStrategy,
      targetAuthorities: issueClassification.targetAuthorities
    },
    responsePlan: {
      ...(adaptiveState.responsePlan || {}),
      issueClassification,
      sourceOrderingPolicy: {
        ...(adaptiveState.responsePlan?.sourceOrderingPolicy || {}),
        useIssueClassificationMatch: true,
        useTargetAuthorityMatch: true,
        useControllingPrecedence: true,
        hideIssueMismatchedSources: true
      },
      conflictDisplayPolicy: {
        ...(adaptiveState.responsePlan?.conflictDisplayPolicy || {}),
        displayConflictYesOnlyWhenConflictTrue: true,
        requireCompleteConflictMetadata: true,
        requireSameIssueGate: true,
        requireOppositeHoldingGate: true
      }
    }
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
    issueClassification: context.issueClassification || null,
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

  return "CONCLUSION GATING:\nA direct conclusion is allowed only if supported by retrieved authority and evidence.";
}

function buildAdaptiveContextForPrompt(adaptiveState = {}) {
  return JSON.stringify({
    issueClassification: adaptiveState.issueClassification || null,
    adaptiveMode: adaptiveState.adaptiveMode || null,
    queryIntent: adaptiveState.queryIntent || null,
    factPattern: adaptiveState.factPattern || null,
    contractInterpretation: adaptiveState.contractInterpretation || null,
    transactionCharacterization: adaptiveState.transactionCharacterization || null,
    economicSubstance: adaptiveState.economicSubstance || null,
    evidenceEvaluation: adaptiveState.evidenceEvaluation || null,
    assumptionGap: adaptiveState.assumptionGap || null,
    riskScore: adaptiveState.riskScore || null,
    positionStrength: adaptiveState.positionStrength || null,
    responsePlan: adaptiveState.responsePlan || null
  }, null, 2);
}

function buildAdaptivePlannerInstructions(adaptiveState = {}) {
  const instructions = [];

  instructions.push(adaptiveState.adaptivePromptBundle || FALLBACK_TINA_STRUCTURE);

  if (adaptiveState.issueClassification) {
    instructions.push([
      "ISSUE CLASSIFICATION CONTROL:",
      JSON.stringify(adaptiveState.issueClassification, null, 2),
      "",
      "Use the classified issue to control retrieval interpretation, legal basis selection, jurisprudence relevance, doctrine selection, source visibility, and conflict analysis.",
      "Do not cite a case, provision, or doctrine merely because it mentions the same tax type."
    ].join("\n"));
  }

  if (safeArray(adaptiveState?.responsePlan?.plannerInstruction).length) {
    instructions.push([
      "ADAPTIVE RESPONSE PLAN:",
      ...adaptiveState.responsePlan.plannerInstruction.map((item) => `- ${item}`)
    ].join("\n"));
  }

  instructions.push(buildConclusionRestrictionInstruction(adaptiveState));

  return instructions.filter(Boolean).join("\n\n---\n\n");
}

function conflictMetadataIsComplete(conflict = null) {
  if (!conflict || typeof conflict !== "object") return false;

  const hasTrueConflict = conflict.conflict === true;
  const hasConflictType = Boolean(conflict.conflictType || conflict.type);
  const hasExactIssue = Boolean(conflict.exactIssue || conflict.exact_issue || conflict.sameIssueGate?.sameIssues?.length);
  const hasExactDimension = Boolean(conflict.exactLegalDimension || conflict.exact_legal_dimension || conflict.sameIssueGate?.sameDimensions?.length || conflict.legalDimension);
  const sameIssuePassed = conflict.sameIssueGate?.passed === true || Boolean(conflict.exactIssue || conflict.exact_issue);
  const oppositeHoldingPassed = conflict.oppositeHoldingGate?.passed === true || Boolean(conflict.oppositeHolding || conflict.oppositeHoldings);
  const hasResolution = Boolean(conflict.resolutionBasis || conflict.resolution_basis || conflict.reason || conflict.winningAuthority || conflict.controllingAuthority || conflict.controllingSource);

  return hasTrueConflict && hasConflictType && hasExactIssue && hasExactDimension && sameIssuePassed && oppositeHoldingPassed && hasResolution;
}

function buildConflictContextForPrompt({
  hierarchyConflict = null,
  jurisprudenceBlock = "",
  conflicts = [],
  issueClassification = null
}) {
  const completeConflicts = safeArray(conflicts).filter(conflictMetadataIsComplete);

  return [
    issueClassification
      ? `ISSUE CLASSIFICATION USED:\n${JSON.stringify(issueClassification, null, 2)}`
      : "ISSUE CLASSIFICATION USED: None.",
    hierarchyConflict
      ? [
          "HIERARCHY / CONFLICT REVIEW:",
          JSON.stringify({
            conflict: Boolean(hierarchyConflict.conflict),
            conflictType: hierarchyConflict.conflictType || null,
            doctrinalConflict: Boolean(hierarchyConflict.doctrinalConflict),
            hierarchyConflict: Boolean(hierarchyConflict.hierarchyConflict),
            apparentConflict: Boolean(hierarchyConflict.apparentConflict),
            exactIssue: hierarchyConflict.exactIssue || null,
            exactLegalDimension: hierarchyConflict.exactLegalDimension || null,
            distinctionType: hierarchyConflict.distinctionType || null,
            sameIssueGate: hierarchyConflict.sameIssueGate || null,
            oppositeHoldingGate: hierarchyConflict.oppositeHoldingGate || null,
            controllingAuthority: hierarchyConflict.controllingAuthority || null,
            controllingSource: hierarchyConflict.controllingSource || null,
            overriddenAuthority: hierarchyConflict.overriddenAuthority || null,
            reason: hierarchyConflict.reason || null,
            resolutionBasis: hierarchyConflict.resolutionBasis || null
          }, null, 2)
        ].join("\n")
      : "HIERARCHY / CONFLICT REVIEW: No conflict metadata.",
    jurisprudenceBlock || buildNoJurisprudenceText(),
    completeConflicts.length
      ? `COMPLETE EVIDENCE CONFLICTS:\n${JSON.stringify(completeConflicts.slice(0, 5), null, 2)}`
      : "COMPLETE EVIDENCE CONFLICTS: None detected."
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

  if (adaptiveState?.issueClassification?.primaryIssue) {
    notes.push(`Classified issue: ${adaptiveState.issueClassification.primaryIssue}.`);
  }

  if (adaptiveState?.riskScore?.overallRisk?.level) {
    notes.push(`Adaptive risk level: ${adaptiveState.riskScore.overallRisk.level}.`);
  }

  if (adaptiveState?.positionStrength?.positionStrength) {
    notes.push(`Position strength: ${adaptiveState.positionStrength.positionStrength}.`);
  }

  if (adaptiveState?.assumptionGap?.mustDiscloseBeforeConclusion) {
    notes.push("Assumptions, evidentiary gaps, ambiguities, and limitations must be disclosed before any strong conclusion.");
  }

  if (hierarchyConflict?.conflict && conflictMetadataIsComplete(hierarchyConflict)) {
    notes.push("A complete same-issue opposite-holding conflict was detected; explain controlling authority and why it controls.");
  } else if (hierarchyConflict?.apparentConflict) {
    notes.push("An apparent conflict was detected; treat it as distinguishable unless same-issue and opposite-holding gates are complete.");
  }

  if (issuance || questionType === "issuance") {
    notes.unshift("Verify latest amended or superseding BIR issuance before operational reliance.");
  }

  if (namedLawDetection?.matched) {
    notes.unshift("For named-law questions, rely first on the exact statute and its IRR before secondary materials.");
  }

  return notes.length ? notes.join(" ") : "Apply the higher-authority rule first and use lower-authority material only as support.";
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
      conflict: Boolean(hierarchyConflict.conflict),
      conflictType: hierarchyConflict.conflictType || null,
      doctrinalConflict: Boolean(hierarchyConflict.doctrinalConflict),
      hierarchyConflict: Boolean(hierarchyConflict.hierarchyConflict),
      apparentConflict: Boolean(hierarchyConflict.apparentConflict),
      exactIssue: hierarchyConflict.exactIssue || null,
      exactLegalDimension: hierarchyConflict.exactLegalDimension || null,
      distinctionType: hierarchyConflict.distinctionType || null,
      sameIssueGate: hierarchyConflict.sameIssueGate || null,
      oppositeHoldingGate: hierarchyConflict.oppositeHoldingGate || null,
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
  hierarchyConflict = null,
  query = "",
  issueClassification = null
}) {
  return buildFinalRoutePayload({
    answer: answerText,
    legalBasisDocs,
    sourcesUsed,
    hierarchyConflict,
    query,
    issueClassification
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
  if (adaptiveState?.issueClassification?.primaryIssue) {
    const mode = adaptiveState?.responsePlan?.responseMode
      ? `adaptive_${String(adaptiveState.responsePlan.responseMode).toLowerCase()}`
      : String(hookConfig.mode || "ask").toLowerCase();

    return `${mode}_${String(adaptiveState.issueClassification.primaryIssue).toLowerCase()}_reasoned_answer`;
  }

  if (provisionModeResult?.handled) return "provision_citation_reasoned_answer";
  if (caseModeResult?.handled) return "case_analysis_reasoned_answer";
  if (doctrineModeResult?.handled) return "doctrine_analysis_reasoned_answer";
  if (namedLawDetection?.matched) return "named_law_reasoned_answer";
  if (issuance) return `exact_issuance_${String(hookConfig.mode || "ask").toLowerCase()}_reasoned`;

  return `${String(hookConfig.mode || "ask").toLowerCase()}_reasoned_answer`;
}

function getSpecializedDocs({ provisionModeResult, caseModeResult, doctrineModeResult }) {
  if (provisionModeResult?.handled && Array.isArray(provisionModeResult.topDocs)) {
    return provisionModeResult.topDocs;
  }

  if (caseModeResult?.handled) {
    return mergeUniqueDocs([...(caseModeResult.caseDocs || []), ...(caseModeResult.birDocs || [])]);
  }

  if (doctrineModeResult?.handled && Array.isArray(doctrineModeResult.topAuthorities)) {
    return doctrineModeResult.topAuthorities.map((item) => ({
      source: item.title || item.source,
      path: item.source,
      text: item.excerpt,
      authorityType: item.authorityType,
      authorityLevel: item.authorityLevel,
      controllingPrecedence: item.controllingPrecedence,
      issueClassificationMatch: item.issueClassificationMatch || null,
      targetAuthorityMatch: item.targetAuthorityMatch === true,
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
  jurisprudencePayload = null,
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
    "Rewrite or refine the draft so it follows the adaptive response plan, issue classification, authority hierarchy, evidence limits, and conclusion gating.",
    "Use only the provided indexed source context, adaptive context, conflict metadata, and draft.",
    "Do not invent laws, cases, dates, rates, issuances, section numbers, GR numbers, or citations.",
    "Do not append a raw source list; the API route payload handles sources.",
    "Do not say 'Conflict detected: YES' unless complete conflict metadata confirms same issue, same dimension, opposite holding, conflict type, and resolution basis."
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
      conflicts,
      issueClassification: adaptiveState.issueClassification
    }),
    "",
    "JURISPRUDENCE PAYLOAD:",
    JSON.stringify(jurisprudencePayload || null, null, 2),
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
  limitationStatement = null,
  hierarchyConflict = null,
  conflictReview = null,
  jurisprudencePayload = null
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
        engineVersion: ENGINE_VERSION,
        issueClassification: adaptiveState?.issueClassification || null,
        adaptiveMode: adaptiveState?.adaptiveMode || null,
        queryIntent: adaptiveState?.queryIntent || null,
        responsePlan: adaptiveState?.responsePlan || null,
        riskScore: adaptiveState?.riskScore || null,
        positionStrength: adaptiveState?.positionStrength || null,
        assumptionGap: adaptiveState?.assumptionGap || null,
        hierarchyConflict: hierarchyConflict || null,
        conflictReview: conflictReview || null,
        jurisprudencePayload: jurisprudencePayload || null,
        sourceOrderingPolicy: adaptiveState?.responsePlan?.sourceOrderingPolicy || null,
        conflictDisplayPolicy: adaptiveState?.responsePlan?.conflictDisplayPolicy || null
      }
    });

    if (error) console.warn("tina_answer_renderings insert skipped:", error.message);
  } catch (error) {
    console.warn("tina_answer_renderings insert failed:", error?.message || error);
  }
}

function buildFallbackComplianceAnswer({ fallbackText, professionalInsight, adaptiveState }) {
  const limitation =
    adaptiveState?.assumptionGap?.limitationStatement ||
    adaptiveState?.responsePlan?.limitationStatement ||
    "Based on the available facts, the position is preliminary and subject to verification.";

  const adaptiveNote =
    adaptiveState?.responsePlan?.mustIncludeLimitation ||
    adaptiveState?.assumptionGap?.mustDiscloseBeforeConclusion
      ? `\n\nLimitation: ${limitation}`
      : "";

  const issueNote = adaptiveState?.issueClassification?.primaryIssue
    ? `\n\nClassified Issue: ${adaptiveState.issueClassification.primaryIssue}`
    : "";

  return buildFinalCompliantAnswer({
    draftAnswer: `${fallbackText}${issueNote}${adaptiveNote}`,
    fallbackAnswer: fallbackText,
    legalBasisDocs: [],
    sourcesUsed: [],
    conflicts: [],
    hierarchyConflict: null,
    conflict: null,
    conflictReview: null,
    jurisprudencePayload: null,
    professionalInsight,
    query: adaptiveState?.queryIntent?.legalQuestionPresented || "",
    issueClassification: adaptiveState?.issueClassification || null
  });
}

function buildNamedLawFallbackText(bestMatch) {
  if (!bestMatch) return "No exact indexed legal source was found for the named law or act asked.";

  const title =
    bestMatch.shortTitle ||
    bestMatch.canonicalTitle ||
    `RA ${bestMatch.republicActNumber || ""}`.trim();

  const raText = bestMatch.republicActNumber ? ` (RA ${bestMatch.republicActNumber})` : "";

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
    .filter((doc) => doc.issueMismatch !== true && doc.issueClassificationMatch?.issueMismatch !== true)
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
  jurisprudencePayload,
  professionalInsight,
  routePayload
}) {
  try {
    const rendered =
      typeof answerRenderer?.renderTinaAnswer === "function"
        ? answerRenderer.renderTinaAnswer({
            answer: preliminaryAnswer,
            sources: finalVisibleSources || [],
            includeSources: false,
            adaptiveContext: adaptiveState,
            responsePlan: adaptiveState?.responsePlan || null,
            assumptionGap: adaptiveState?.assumptionGap || null,
            riskScore: adaptiveState?.riskScore || null,
            positionStrength: adaptiveState?.positionStrength || null,
            legalBasisDocs: topLegalBases,
            sourcesUsed: finalVisibleSources,
            conflicts: mergedConflictSignals,
            hierarchyConflict,
            conflict: hierarchyConflict,
            conflictReview: hierarchyConflict,
            jurisprudencePayload,
            issueClassification: adaptiveState?.issueClassification || null,
            professionalInsight,
            routePayload
          })
        : "";

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
    conflict: hierarchyConflict,
    conflictReview: hierarchyConflict,
    jurisprudencePayload,
    professionalInsight,
    query: adaptiveState?.queryIntent?.legalQuestionPresented || "",
    issueClassification: adaptiveState?.issueClassification || null
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
      "6. Follow the adaptive response plan and issue classification if available.",
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

        let adaptiveState = buildAdaptiveState({
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
            const lastState = await getLastTopicState(supabase, userId, conversationId);
            if (lastState?.last_question) finalQuestion = lastState.last_question;
          } catch (error) {
            console.warn("Topic fallback error:", error.message);
          }
        }

        const issueClassification = classifyIssueBeforeRetrieval({
          question: finalQuestion,
          adaptiveContext: adaptiveState
        });

        adaptiveState = enrichAdaptiveStateWithIssueClassification(adaptiveState, issueClassification);

        const issuance = detectIssuanceQuery(finalQuestion);
        const questionType = classifyQuestion(finalQuestion);
        const namedLawDetection = detectNamedLaw(finalQuestion);
        const responseMode = getResponseMode(adaptiveState, hookConfig);

        const issueQueries = unique([
          finalQuestion,
          issueClassification.primaryIssue ? `${finalQuestion} ${issueClassification.primaryIssue}` : null,
          ...safeArray(issueClassification.subIssues).map((issue) => `${finalQuestion} ${issue}`)
        ]).filter(Boolean);

        const retrievalQueries = namedLawDetection.matched
          ? buildNamedLawSearchQueries(finalQuestion, {
              includeOriginalQuestion: true,
              maxQueries: 6
            })
          : issueQueries.length
            ? issueQueries.slice(0, 4)
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
            topK: adaptiveState?.responsePlan?.responseDepth === "COMPREHENSIVE" ? 16 : 12,
            adaptiveMode: responseMode,
            adaptiveContext: adaptiveState,
            issueClassification,
            primaryIssue: issueClassification.primaryIssue,
            subIssue: issueClassification.subIssue,
            subIssues: issueClassification.subIssues,
            legalDimensions: issueClassification.legalDimensions,
            retrievalStrategy: issueClassification.retrievalStrategy,
            targetAuthorities: issueClassification.targetAuthorities
          });

          retrievals.push(retrieval);
        }

        const mergedDocs = mergeUniqueDocs(retrievals.flatMap((retrieval) => retrieval.results || []));

        const reranked = rerankForTina({
          query: finalQuestion,
          docs: mergedDocs,
          limit: 16,
          responseMode,
          adaptiveContext: adaptiveState,
          issueClassification,
          suppressIssueMismatch: true,
          suppressWeakSecondary: true,
          suppressSuperseded: true
        });

        const hierarchyRankedDocs = rerankByHierarchy(reranked.results || mergedDocs, finalQuestion);
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

        const displayableRankedDocs = internalRankedDocs
          .filter((doc) => !shouldHideSourceFromUser(doc))
          .filter((doc) => doc.issueMismatch !== true && doc.issueClassificationMatch?.issueMismatch !== true);

        const hierarchyConflict = detectHierarchyConflict(displayableRankedDocs.slice(0, 6), {
          issueClassification
        });

        const jurisprudenceCases = selectIssueRelevantJurisprudence({
          query: finalQuestion,
          docs: internalRankedDocs,
          limit: 4,
          responseMode,
          adaptiveContext: adaptiveState,
          issueClassification
        });

        const jurisprudencePayload = buildJurisprudencePayload({
          query: finalQuestion,
          cases: jurisprudenceCases,
          supportingAuthorities: displayableRankedDocs.slice(0, 6),
          issueClassification
        });

        const jurisprudenceBlock = buildJurisprudencePromptBlock({
          query: finalQuestion,
          cases: jurisprudenceCases,
          supportingAuthorities: displayableRankedDocs.slice(0, 6),
          issueClassification
        });

        let evidence = normalizeRetrievedEvidence(
          internalRankedDocs.map((doc) => ({
            ...doc,
            authority_tier:
              doc.authorityLevel ??
              doc.authority_level ??
              doc.metadata?.authorityLevel ??
              null,
            issueClassificationMatch: doc.issueClassificationMatch || null,
            targetAuthorityMatch: doc.targetAuthorityMatch === true,
            issueMismatch: doc.issueMismatch === true,
            metadata: {
              ...buildEvidenceMetadata(doc),
              issueClassification
            }
          })),
          {
            issueClassification,
            adaptiveContext: adaptiveState
          }
        );

        evidence = rankEvidenceByAuthority(evidence);

        const rawConflicts = detectEvidenceConflicts(evidence, {
          issueClassification,
          adaptiveContext: adaptiveState
        });

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
          model: DEFAULT_MODEL,
          responseMode,
          adaptiveContext: adaptiveState,
          issueClassification
        });

        const caseModeResult =
          !provisionModeResult.handled
            ? await maybeGenerateCaseAnalysisAnswer({
                openai,
                question: finalQuestion,
                retrievedResults: internalRankedDocs,
                model: DEFAULT_MODEL,
                responseMode,
                adaptiveContext: adaptiveState,
                issueClassification,
                jurisprudenceCases
              })
            : { handled: false };

        const doctrineModeResult =
          !provisionModeResult.handled && !caseModeResult.handled
            ? await maybeGenerateDoctrineAnswer({
                openai,
                question: finalQuestion,
                retrievedResults: internalRankedDocs,
                model: DEFAULT_MODEL,
                responseMode,
                adaptiveContext: adaptiveState,
                issueClassification
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
              conflict: hierarchyConflict,
              issueClassification
            }),
            buildAdaptivePlannerInstructions(adaptiveState)
          ].filter(Boolean).join("\n\n---\n\n");

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
                  "Issue Classification:",
                  JSON.stringify(issueClassification, null, 2),
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
              memoryContext,
              responseMode,
              adaptiveContext: adaptiveState,
              issueClassification
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
            jurisprudencePayload,
            conflicts: mergedConflictSignals,
            memoryContext,
            adaptiveState
          });
        }

        preliminaryAnswer = sanitizeDraftAnswer(stripTrailingSourceSection(preliminaryAnswer || ""), hierarchyConflict);

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
          supersessionResult,
          query: finalQuestion,
          issueClassification
        });

        const topDisplayableEvidence = rankEvidenceByAuthority(
          normalizeRetrievedEvidence(finalDisplayableDocs, {
            issueClassification,
            adaptiveContext: adaptiveState
          })
        ).slice(0, 10);

        const claimSupportMap = buildClaimSupportMap(preliminaryAnswer, topDisplayableEvidence, {
          issueClassification,
          adaptiveContext: adaptiveState
        });

        const validation = validateEvidenceSufficiency({
          evidence: finalDisplayableDocs,
          claimSupportMap,
          minEvidenceCount: 1,
          minSupportedClaims: 1,
          minTopScore: 0.25,
          query: finalQuestion,
          requirePrimaryAuthority: Boolean(namedLawDetection?.matched),
          answerText: preliminaryAnswer,
          issueClassification,
          conflict: hierarchyConflict,
          conflictReview: hierarchyConflict,
          hierarchyConflict,
          jurisprudencePayload
        });

        const shouldFallback =
          (namedLawDetection.matched && !namedLawFiltered.primaryAuthorityFound) ||
          (namedLawDetection.matched && finalDisplayableDocs.length === 0) ||
          (issuance && finalDisplayableDocs.length === 0) ||
          topEvidence.length === 0 ||
          shouldRejectForWeakLegalBasis({
            validation,
            hasExactCitation: Boolean(retrievals.some((retrieval) => retrieval?.exactCitation?.matched))
          });

        const safeTopConfidenceRaw =
          internalRankedDocs.length > 0
            ? Math.max(0, ...internalRankedDocs.map((item) => getScore(item)))
            : 0;

        const safeTopConfidence = toSafeDbNumeric(safeTopConfidenceRaw, 999999.9999, 4);

        let reasoningRun = null;

        try {
          reasoningRun = await saveReasoningRun(supabase, {
            userId,
            sessionId: conversationId || null,
            question: originalQuestion,
            normalizedQuestion: finalQuestion,
            questionType,
            mode: hookConfig.mode,
            adaptiveMode: responseMode,
            retrievalStatus: topEvidence.length ? "evidence_found" : "no_evidence",
            reasoningStatus: shouldFallback ? "fallback" : "grounded_answer",
            fallbackUsed: shouldFallback,
            topConfidence: safeTopConfidence,
            answerSummary: String(preliminaryAnswer || "").slice(0, 1000),
            adaptiveContext: adaptiveState,
            issueClassification,
            retrievalMetadata: {
              retrievalQueries,
              retrievals: retrievals.map((item) => item.retrievalMetadata || item.audit || null)
            }
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
          const sourcesUsed = filterVisibleSources(finalDisplayableDocs, {
            maxItems: MAX_VISIBLE_SOURCES,
            supersessionResult,
            query: finalQuestion,
            issueClassification
          });

          const answerText = sourcesUsed.length
            ? [
                "Source Finder Results",
                "",
                `Classified Issue: ${issueClassification.primaryIssue}`,
                "",
                ...sourcesUsed.map((source, index) =>
                  [
                    `${index + 1}. ${source.issuanceNumber ? `${source.issuanceNumber} – ` : ""}${source.title}`,
                    `Authority: Level ${source.authorityLevel || 99} - ${source.authorityLabel || source.authorityType || "Unknown"}`,
                    `Target Authority Match: ${source.targetAuthorityMatch ? "YES" : "NO"}`,
                    `Issue Match: ${source.issueClassificationMatch?.matched ? "YES" : "NO"}`
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
            hierarchyConflict: null,
            query: finalQuestion,
            issueClassification
          });

          await persistAnswerRendering({
            supabase,
            userId,
            conversationId,
            adaptiveState,
            answerText,
            routePayload,
            finalVisibleSources: sourcesUsed,
            hierarchyConflict: null,
            conflictReview: null,
            jurisprudencePayload
          });

          return res.json({
            success: true,
            engine: "TINA Adaptive Reasoning Engine",
            handlerVersion: ENGINE_VERSION,
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            hookTitle: hookConfig.title,
            answer: answerText,
            answerMode: sourcesUsed.length ? "source_finder_results" : "source_finder_no_match",
            confidence: sourcesUsed.length ? "SOURCE_LIST" : "LOW",
            sourceStatus: sourcesUsed.length ? "INDEXED_SOURCE_LISTED" : "NO_INDEXED_SOURCE",
            originalQuestion,
            resolvedQuestion: finalQuestion,
            issueClassification,
            sourcesUsed: routePayload.sources,
            sources: routePayload.sources,
            authorityUsed: routePayload.authority_used,
            supersessionAudit: routePayload.supersession_audit,
            vectorMatches: routePayload.sources.length
          });
        }

        if (shouldFallback) {
          const fallbackReason =
            namedLawDetection.matched && namedLawDetection.bestMatch
              ? `No exact indexed primary source matched ${namedLawDetection.bestMatch.shortTitle || namedLawDetection.bestMatch.canonicalTitle}.`
              : issuance || questionType === "issuance"
                ? "No indexed document found or insufficient verified evidence for the requested issuance."
                : "Indexed sources were absent or insufficient.";

          const fallbackText =
            namedLawDetection.matched && namedLawDetection.bestMatch
              ? buildNamedLawFallbackText(namedLawDetection.bestMatch)
              : issuance || questionType === "issuance"
                ? "No indexed document found or insufficient verified evidence for the requested issuance. TINA will not generate a speculative answer."
                : await generateGeneralFallbackAnswer(finalQuestion, memoryContext, adaptiveState, fallbackReason);

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
            hierarchyConflict: null,
            query: finalQuestion,
            issueClassification
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
              null,
            hierarchyConflict: null,
            conflictReview: null,
            jurisprudencePayload
          });

          return res.json({
            success: true,
            engine: "TINA Adaptive Reasoning Engine",
            handlerVersion: ENGINE_VERSION,
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
            issueClassification,
            validation,
            sourcesUsed: routePayload.sources,
            sources: routePayload.sources,
            authorityUsed: routePayload.authority_used,
            supersessionAudit: routePayload.supersession_audit,
            vectorMatches: topDisplayableEvidence.length,
            detectedIssuance: issuance || null,
            detectedNamedLaw: namedLawDetection.bestMatch || null,
            reasoningRunId: reasoningRun?.id || null
          });
        }

        const topLegalBases = selectTopLegalBases(finalDisplayableDocs, 4);

        const preliminaryRoutePayload = buildRouteResponsePayload({
          answerText: preliminaryAnswer,
          legalBasisDocs: topLegalBases,
          sourcesUsed: finalVisibleSources,
          hierarchyConflict,
          query: finalQuestion,
          issueClassification
        });

        const answerText = renderFinalAnswer({
          preliminaryAnswer,
          fallbackAnswer: buildNoSourceReply(),
          adaptiveState,
          topLegalBases,
          finalVisibleSources,
          mergedConflictSignals,
          hierarchyConflict,
          jurisprudencePayload,
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
          hierarchyConflict,
          query: finalQuestion,
          issueClassification
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
            null,
          hierarchyConflict,
          conflictReview: hierarchyConflict,
          jurisprudencePayload
        });

        return res.json({
          success: true,
          engine: "TINA Adaptive Reasoning Engine",
          handlerVersion: ENGINE_VERSION,
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
          issueClassification,
          validation,
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
          conflictMetadataComplete: conflictMetadataIsComplete(hierarchyConflict),
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
          error: error.message || "RAG answer failed",
          handlerVersion: ENGINE_VERSION
        });
      }
    }
  };
}

export function ragAnswerHandlerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_RAG_ANSWER_HANDLER",
    version: ENGINE_VERSION,
    issueClassificationBeforeRetrieval: true,
    issueClassificationMatchAware: true,
    targetAuthorityAware: true,
    conflictMetadataGated: true,
    sourceVisibilityCompatible: true,
    finalComplianceCompatible: true,
    answerRendererCompatible: true
  };
}

export default {
  createRagAnswerHandler,
  ragAnswerHandlerHealthCheck
};
