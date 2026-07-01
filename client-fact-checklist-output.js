// FILE: client-fact-checklist-output.js
"use strict";

/**
 * PATCH-07B-010 narrow client fact-pattern checklist output helper.
 *
 * Boundary:
 * - Formats fact-gap helper output into client-facing checklist buckets only.
 * - Preserves source coverage needs separately from user fact/document gaps.
 * - Does not produce legal conclusions, BIR/taxpayer positions, risk scoring,
 *   settlement/protest strategy, authority hierarchy, supersession, or effective-date logic.
 */

import { identifyFactGaps } from "./fact-gap-helper.js";
import { frameTaxIssue } from "./issue-framing-engine.js";
import { applyReasoningSafetyPolicy } from "./reasoning-safety-policy.js";

export const CLIENT_FACT_CHECKLIST_OUTPUT_VERSION = "07B-010.1";

const MODES = new Set(["/ask", "/tax", "/audit"]);
const AUTHORITY_STATES = new Set(["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"]);

function safeString(value = "") {
  return String(value || "").trim();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean).map(safeString).filter(Boolean) : [safeString(value)].filter(Boolean);
}

function unique(values = []) {
  return [...new Set(safeArray(values))];
}

function normalizeMode(mode) {
  return MODES.has(mode) ? mode : "/ask";
}

function normalizeAuthorityState(input = {}) {
  const sourceState = safeString(input.sourceAvailabilityState);
  const authorityState = safeString(input.authorityState);
  if (AUTHORITY_STATES.has(sourceState)) return sourceState;
  if (AUTHORITY_STATES.has(authorityState)) return authorityState;
  return "GENERAL_TAX";
}

function titleForMode(mode) {
  if (mode === "/tax") return "Fact checklist needed before tax conclusion";
  if (mode === "/audit") return "Audit-defense fact and document checklist";
  return "Missing facts to answer this safely";
}

function purposeForMode(mode) {
  if (mode === "/tax") {
    return "Collect the taxpayer, period, transaction, amount, and document facts needed before any senior tax conclusion.";
  }
  if (mode === "/audit") {
    return "Collect the audit documents, notice dates, procedural stage, deadlines, and transaction facts needed before audit-defense analysis.";
  }
  return "Collect the missing facts and documents needed before giving anything beyond safe general orientation.";
}

function questionPrefix(mode) {
  if (mode === "/tax") return "Confirm for memo preparation:";
  if (mode === "/audit") return "Confirm for audit review:";
  return "Please provide";
}

function asQuestion(item, mode) {
  const clean = safeString(item).replace(/\.$/, "");
  if (!clean) return "";
  if (mode === "/ask") return `${questionPrefix(mode)} ${clean}.`;
  return `${questionPrefix(mode)} ${clean}.`;
}

function formatItems(items, mode, limit = null) {
  const formatted = unique(items).map((item) => asQuestion(item, mode)).filter(Boolean);
  return typeof limit === "number" ? formatted.slice(0, limit) : formatted;
}

function inferIssueFrame(input = {}) {
  if (input.issueFrameResult && input.issueFrameResult.implementationScope === "ISSUE_FRAMING_ONLY") {
    return input.issueFrameResult;
  }
  return frameTaxIssue(input);
}

function inferFactGapResult(input = {}, issueFrameResult) {
  if (input.factGapResult && input.factGapResult.implementationScope === "FACT_GAP_HELPER_ONLY") {
    return input.factGapResult;
  }
  return identifyFactGaps({ ...input, ...issueFrameResult });
}

function inferSafetyPolicyResult(input = {}) {
  if (input.safetyPolicyResult && input.safetyPolicyResult.safetyPosture) {
    return input.safetyPolicyResult;
  }
  return applyReasoningSafetyPolicy({
    mode: input.mode,
    authorityState: input.authorityState,
    sourceAvailabilityState: input.sourceAvailabilityState,
    missingUserFacts: input.missingUserFacts,
    authorityOrSourceCoverageNeeds: input.authorityOrSourceCoverageNeeds || input.sourceCoverageNeeds,
    requestedOutput: input.query
  });
}

export function buildModeBoundaryCaution(mode) {
  const normalizedMode = normalizeMode(mode);
  if (normalizedMode === "/tax") {
    return "This is a /tax memo-preparation checklist only; it must not become a final legal or tax conclusion.";
  }
  if (normalizedMode === "/audit") {
    return "This is a /audit fact and document checklist only; it must not become BIR/taxpayer positions, audit-defense conclusion, risk level, settlement advice, or protest strategy.";
  }
  return "This is a /ask fact-gathering checklist only; it must not become a /tax memo or /audit advisory.";
}

export function buildProhibitedNextSteps(inputOrChecklistResult = {}) {
  const mode = normalizeMode(inputOrChecklistResult.mode);
  const authorityState = normalizeAuthorityState(inputOrChecklistResult);
  const prohibited = [
    "Do not give a final legal or tax conclusion from this checklist alone.",
    "Do not treat missing facts as assumed facts.",
    "Do not merge source coverage gaps with user fact gaps."
  ];

  if (mode === "/audit") {
    prohibited.push("Do not generate BIR likely position or taxpayer defense until authority, facts, documents, and procedural stage are reviewed.");
    prohibited.push("Do not give risk level, settlement advice, or protest strategy from this checklist alone.");
  }
  if (authorityState === "NO_INDEXED_SOURCE") {
    prohibited.push("Do not claim indexed authority exists.");
    prohibited.push("Do not form a legal position from unavailable indexed sources.");
  }
  if (authorityState === "RELATED_AUTHORITY_ONLY") {
    prohibited.push("Do not treat related authority as controlling authority.");
  }

  return unique(prohibited);
}

export function formatChecklistForMode(checklistResult, mode) {
  const normalizedMode = normalizeMode(mode);
  return {
    ...checklistResult,
    mode: normalizedMode,
    title: titleForMode(normalizedMode),
    purpose: purposeForMode(normalizedMode)
  };
}

export function buildClientFactChecklistOutput(input = {}) {
  const mode = normalizeMode(input.mode);
  const authorityState = normalizeAuthorityState(input);
  const issueFrameResult = inferIssueFrame({ ...input, mode, authorityState });
  const factGapResult = inferFactGapResult({ ...input, mode, authorityState }, issueFrameResult);
  const safetyPolicyResult = inferSafetyPolicyResult({ ...input, mode, authorityState });
  const sourceStateCaution = safeString(
    input.sourceStateCaution || factGapResult.sourceStateCaution || issueFrameResult.sourceStateCaution || safetyPolicyResult.sourceStateCaution
  ) || null;
  const sourceCoverageNeeds = unique(
    input.authorityOrSourceCoverageNeeds ||
    input.sourceCoverageNeeds ||
    factGapResult.sourceCoverageNeeds ||
    issueFrameResult.sourceCoverageNeeds
  );
  const criticalQuestions = formatItems(factGapResult.criticalMissingFacts, mode, mode === "/ask" ? 8 : null);
  const helpfulQuestions = formatItems(factGapResult.helpfulMissingFacts, mode, mode === "/ask" ? 6 : null);
  const documentRequests = formatItems(factGapResult.documentGaps, mode);
  const timingAndPeriodQuestions = formatItems(factGapResult.timingOrPeriodGaps, mode);
  const taxpayerStatusQuestions = formatItems(factGapResult.taxpayerStatusGaps, mode);
  const transactionCharacterQuestions = formatItems(factGapResult.transactionCharacterGaps, mode);
  const assessmentStageQuestions = formatItems(factGapResult.assessmentStageGaps, mode);
  const mustAnswerBeforeFinalAdvice = unique([
    ...criticalQuestions,
    ...documentRequests,
    ...timingAndPeriodQuestions,
    ...taxpayerStatusQuestions,
    ...transactionCharacterQuestions,
    ...assessmentStageQuestions
  ]);
  const canProceedWithGeneralOrientation = mode === "/ask" || authorityState === "GENERAL_TAX" || Boolean(sourceStateCaution);

  const checklist = {
    checklistType: "CLIENT_FACT_PATTERN_CHECKLIST",
    mode,
    issueFamily: safeString(input.issueFamily || factGapResult.issueFamily || issueFrameResult.issueFamily || "UNKNOWN_NEEDS_MORE_FACTS"),
    taxType: safeString(input.taxType || factGapResult.taxType || issueFrameResult.taxType || "UNKNOWN"),
    title: titleForMode(mode),
    purpose: purposeForMode(mode),
    knownFactsSummary: unique(input.knownFacts || factGapResult.knownFacts || issueFrameResult.knownFacts),
    criticalQuestions,
    helpfulQuestions,
    documentRequests,
    timingAndPeriodQuestions,
    taxpayerStatusQuestions,
    transactionCharacterQuestions,
    assessmentStageQuestions,
    sourceCoverageNeeds,
    sourceStateCaution,
    modeBoundaryCaution: buildModeBoundaryCaution(mode),
    canProceedWithGeneralOrientation,
    mustAnswerBeforeFinalAdvice,
    prohibitedNextSteps: buildProhibitedNextSteps({ ...input, mode, authorityState, sourceAvailabilityState: authorityState }),
    implementationScope: "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY"
  };

  return formatChecklistForMode(checklist, mode);
}

export default {
  buildClientFactChecklistOutput,
  formatChecklistForMode,
  buildModeBoundaryCaution,
  buildProhibitedNextSteps
};
