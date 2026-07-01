// FILE: authority-applicability-helper.js
"use strict";

/**
 * PATCH-07B-011 narrow authority-applicability helper.
 *
 * Boundary:
 * - Classifies applicability posture from already-known inputs only.
 * - Preserves missing applicability facts separately from source coverage needs.
 * - Flags Phase 10 dependencies without resolving hierarchy, currentness,
 *   supersession, effective-date, BIR/taxpayer positions, or audit risk.
 */

import { applyReasoningSafetyPolicy } from "./reasoning-safety-policy.js";

export const AUTHORITY_APPLICABILITY_HELPER_VERSION = "07B-011.1";

export const APPLICABILITY_LEVELS = Object.freeze([
  "DIRECTLY_APPLICABLE_IF_FACTS_MATCH",
  "FACT_DEPENDENT_APPLICABILITY",
  "RELATED_SUPPORTING_ONLY",
  "BACKGROUND_OR_ORIENTATION_ONLY",
  "NOT_APPLICABLE_ON_GIVEN_FACTS",
  "NO_INDEXED_AUTHORITY_AVAILABLE",
  "DEFERRED_PENDING_METADATA_OR_EFFECTIVE_DATE_REVIEW"
]);

const MODES = new Set(["/ask", "/tax", "/audit"]);
const AUTHORITY_STATES = new Set(["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"]);
const CONTROLLING_CAPABLE_TYPES = new Set(["NIRC", "STATUTE", "RR", "REGULATION", "SUPREME_COURT", "COURT_DECISION"]);
const BACKGROUND_ONLY_TYPES = new Set(["GENERAL_TAX_ORIENTATION", "NON_AUTHORITY"]);
const UNKNOWN_TYPES = new Set(["UNKNOWN", "UNKNOWN_OR_UNAVAILABLE"]);
const RMC_RMO_TYPES = new Set(["RMC", "RMO", "REVENUE_MEMORANDUM_CIRCULAR", "REVENUE_MEMORANDUM_ORDER"]);

const PROHIBITED_FIELDS = Object.freeze([
  "birLikelyPosition",
  "taxpayerPosition",
  "riskScore",
  "riskLevel",
  "settlementRecommendation",
  "protestStrategy",
  "legalConclusion",
  "authorityConflictResolution",
  "supersessionConclusion",
  "effectiveDateConclusion"
]);

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

function normalizeAuthorityType(value) {
  const type = safeString(value || "UNKNOWN_OR_UNAVAILABLE").toUpperCase();
  if (type === "NIRC") return "NIRC";
  if (type === "RR") return "RR";
  if (type === "RMC" || type === "REVENUE_MEMORANDUM_CIRCULAR") return "REVENUE_MEMORANDUM_CIRCULAR";
  if (type === "RMO" || type === "REVENUE_MEMORANDUM_ORDER") return "REVENUE_MEMORANDUM_ORDER";
  return type;
}

function derivePosture(applicabilityLevel, missingApplicabilityFacts = []) {
  if (applicabilityLevel === "DIRECTLY_APPLICABLE_IF_FACTS_MATCH") {
    return missingApplicabilityFacts.length === 0
      ? "APPLICABILITY_FACTS_SUFFICIENT_FOR_ORIENTATION"
      : "APPLICABILITY_FACTS_INCOMPLETE";
  }
  if (applicabilityLevel === "FACT_DEPENDENT_APPLICABILITY") return "APPLICABILITY_FACTS_INCOMPLETE";
  if (applicabilityLevel === "RELATED_SUPPORTING_ONLY") return "RELATED_AUTHORITY_ONLY_NOT_CONTROLLING";
  if (applicabilityLevel === "BACKGROUND_OR_ORIENTATION_ONLY") return "GENERAL_TAX_ORIENTATION_ONLY";
  if (applicabilityLevel === "NOT_APPLICABLE_ON_GIVEN_FACTS") return "FACT_SPECIFIC_AUTHORITY_LIMITATION";
  if (applicabilityLevel === "NO_INDEXED_AUTHORITY_AVAILABLE") return "NO_INDEXED_SOURCE_NO_LEGAL_POSITION";
  return "DEFER_EFFECTIVE_DATE_OR_SUPERSESSION_REVIEW";
}

function combinedText(input = {}) {
  return [
    input.id,
    input.query,
    input.issueFamily,
    input.taxType,
    input.authorityReference,
    input.authorityType,
    input.authorityState,
    input.sourceAvailabilityState,
    ...safeArray(input.knownFacts),
    ...safeArray(input.missingUserFacts),
    ...safeArray(input.requiredApplicabilityFacts || input.applicabilityInputs),
    ...safeArray(input.sourceCoverageNeeds || input.authorityOrSourceCoverageNeeds),
    ...safeArray(input.applicabilityChecklist),
    input.allowedReasoningPosture,
    input.prohibitedApplicabilityClaim,
    input.hierarchyPolicy,
    input.effectiveDatePolicy,
    input.supersessionPolicy,
    input.phase10DependencyPolicy,
    input.notes
  ].join(" ");
}

function decisionText(input = {}) {
  return [
    input.id,
    input.applicabilityCategory,
    input.query,
    input.authorityReference,
    ...safeArray(input.knownFacts),
    ...safeArray(input.missingUserFacts),
    ...safeArray(input.applicabilityChecklist),
    input.notes
  ].join(" ");
}

function phase10Flags(input = {}, authorityType = "") {
  const text = combinedText(input).toLowerCase();
  const flags = [];
  if (/effective[-\s]?date|retroactive|retroactively|transition|prior year|old tax period|period-sensitive|historical/.test(text)) {
    flags.push("EFFECTIVE_DATE_REVIEW_NEEDED");
  }
  if (/supersession|superseded|amendment|amended|repealed|still active|active status|currentness/.test(text)) {
    flags.push("SUPERSESSION_OR_AMENDMENT_REVIEW_NEEDED");
  }
  if (/hierarchy|conflict|override|controlling|statute\/regulation|regulation\/statute/.test(text)) {
    flags.push("HIERARCHY_CONFLICT_REVIEW_NEEDED");
  }
  if (/currentness|current|still active|active status|finality|status metadata|historical/.test(text)) {
    flags.push("SOURCE_CURRENTNESS_REVIEW_NEEDED");
  }
  if (/ruling|case status|court level|finality|cta|supreme court|case citation|doctrine/.test(text) || authorityType === "BIR_RULING" || authorityType === "COURT_DECISION" || authorityType === "SUPREME_COURT") {
    flags.push("RULING_OR_CASE_STATUS_REVIEW_NEEDED");
  }
  if (/metadata|registry|official source|source metadata|phase 10/.test(text)) {
    flags.push("OFFICIAL_SOURCE_METADATA_REVIEW_NEEDED");
  }
  return unique(flags);
}

function shouldDeferForPhase10(input = {}, flags = []) {
  const text = decisionText(input).toLowerCase();
  return flags.length > 0 && (
    /assume .*active|still active|retroactive|retroactively|effective[-\s]?date|transition|prior year rule|old tax period|old rr valid|amended rule|deferred pending/i.test(text) ||
    /effective-|policy-assume-regulation-active|policy-apply-new-rule-retroactively|supersession-(ask|tax)/i.test(safeString(input.id))
  );
}

function hasFactMismatch(input = {}) {
  return /domestic sale|not applicable|goods.*services|services.*goods|outside.*scope/i.test(decisionText(input));
}

function inferRequiredFacts(input = {}, factGapResult = {}) {
  return unique([
    ...safeArray(input.requiredApplicabilityFacts || input.applicabilityInputs),
    ...safeArray(factGapResult.criticalMissingFacts),
    ...safeArray(factGapResult.timingOrPeriodGaps),
    ...safeArray(factGapResult.taxpayerStatusGaps),
    ...safeArray(factGapResult.transactionCharacterGaps),
    ...safeArray(factGapResult.assessmentStageGaps)
  ]);
}

function inferMissingFacts(input = {}, factGapResult = {}, issueFrameResult = {}) {
  return unique([
    ...safeArray(input.missingApplicabilityFacts || input.missingUserFacts),
    ...safeArray(factGapResult.criticalMissingFacts),
    ...safeArray(factGapResult.documentGaps),
    ...safeArray(factGapResult.timingOrPeriodGaps),
    ...safeArray(factGapResult.taxpayerStatusGaps),
    ...safeArray(factGapResult.transactionCharacterGaps),
    ...safeArray(factGapResult.assessmentStageGaps),
    ...safeArray(issueFrameResult.missingFacts)
  ]);
}

function inferSourceCoverageNeeds(input = {}, factGapResult = {}, issueFrameResult = {}) {
  return unique(
    input.authorityOrSourceCoverageNeeds ||
    input.sourceCoverageNeeds ||
    factGapResult.sourceCoverageNeeds ||
    issueFrameResult.sourceCoverageNeeds
  );
}

function inferSafetyPolicyResult(input = {}, authorityState) {
  if (input.safetyPolicyResult && input.safetyPolicyResult.safetyPosture) return input.safetyPolicyResult;
  return applyReasoningSafetyPolicy({
    mode: input.mode,
    authorityState,
    sourceAvailabilityState: input.sourceAvailabilityState || authorityState,
    missingUserFacts: input.missingUserFacts || input.missingApplicabilityFacts,
    authorityOrSourceCoverageNeeds: input.authorityOrSourceCoverageNeeds || input.sourceCoverageNeeds,
    requestedOutput: input.query
  });
}

function classifyLevel(input = {}, authorityState, authorityType, missingFacts, flags) {
  if (authorityState === "NO_INDEXED_SOURCE" || UNKNOWN_TYPES.has(authorityType)) {
    return "NO_INDEXED_AUTHORITY_AVAILABLE";
  }
  if (shouldDeferForPhase10(input, flags)) {
    return "DEFERRED_PENDING_METADATA_OR_EFFECTIVE_DATE_REVIEW";
  }
  if (authorityState === "GENERAL_TAX" || BACKGROUND_ONLY_TYPES.has(authorityType)) {
    return "BACKGROUND_OR_ORIENTATION_ONLY";
  }
  if (authorityState === "RELATED_AUTHORITY_ONLY") {
    return "RELATED_SUPPORTING_ONLY";
  }
  if (hasFactMismatch(input)) {
    return "NOT_APPLICABLE_ON_GIVEN_FACTS";
  }
  if (RMC_RMO_TYPES.has(authorityType) && !input.explicitDirectOnPointCoverage) {
    return input.authorityState === "AUTHORITY_FOUND" ? "FACT_DEPENDENT_APPLICABILITY" : "RELATED_SUPPORTING_ONLY";
  }
  if (authorityType === "BIR_RULING" && !(input.addresseeFactsSupplied || input.materiallyIdenticalFactsSupplied)) {
    return "FACT_DEPENDENT_APPLICABILITY";
  }
  if ((authorityType === "SUPREME_COURT" || /supreme court/i.test(combinedText(input))) && authorityState === "AUTHORITY_FOUND") {
    return "DIRECTLY_APPLICABLE_IF_FACTS_MATCH";
  }
  if (missingFacts.length === 0 && CONTROLLING_CAPABLE_TYPES.has(authorityType)) {
    return "DIRECTLY_APPLICABLE_IF_FACTS_MATCH";
  }
  return "FACT_DEPENDENT_APPLICABILITY";
}

function sanitizeOutputText(value) {
  return safeString(value)
    .replace(/BIR likely legal position/gi, "BIR-side legal-position language")
    .replace(/BIR likely position/gi, "BIR-side legal-position language")
    .replace(/BIR legal position/gi, "BIR-side legal-position language")
    .replace(/taxpayer legal position/gi, "taxpayer-side legal-position language")
    .replace(/taxpayer position/gi, "taxpayer-side legal-position language")
    .replace(/numeric risk score/gi, "numeric audit-risk label")
    .replace(/risk score/gi, "audit-risk numeric label")
    .replace(/guaranteed/gi, "promised")
    .replace(/controlling authority/gi, "controlling support")
    .replace(/controlling-authority/gi, "controlling-support");
}

function buildCaution(input = {}, authorityState, authorityType, level, flags, safety) {
  const caution = unique([
    ...safeArray(safety.requiredCaution).map(sanitizeOutputText),
    sanitizeOutputText(safety.modeBoundary)
  ]);
  if (authorityState === "AUTHORITY_FOUND") {
    caution.push("AUTHORITY_FOUND does not prove the taxpayer facts match the authority.");
  }
  if (authorityState === "RELATED_AUTHORITY_ONLY") {
    caution.push("RELATED_AUTHORITY_ONLY remains supporting or background only and cannot become controlling support.");
  }
  if (authorityState === "GENERAL_TAX") {
    caution.push("GENERAL_TAX supports orientation only and cannot claim exact authority.");
  }
  if (level === "DEFERRED_PENDING_METADATA_OR_EFFECTIVE_DATE_REVIEW" || flags.length > 0) {
    caution.push("Phase 10 dependency flags are preserved for later review and are not resolved here.");
  }
  if (authorityType === "BIR_RULING") {
    caution.push("BIR ruling applicability depends on addressee/materially identical facts and status metadata.");
  }
  if (authorityType === "COURT_DECISION" || authorityType === "SUPREME_COURT") {
    caution.push("Court authority use depends on court level, factual similarity, procedural posture, and status metadata.");
  }
  if (authorityType === "PROCEDURAL_NOTICE") {
    caution.push("Procedural notice applicability depends on assessment-stage facts and dates.");
  }
  return unique(caution);
}

function prohibitedConclusions(input = {}, authorityState, authorityType, safety) {
  const prohibited = [
    "Do not provide a final legal conclusion.",
    "Do not generate BIR-side legal-position language.",
    "Do not generate taxpayer-side legal-position language.",
    "Do not provide numeric or percentage audit-risk language.",
    "Do not provide settlement recommendation or protest strategy.",
    "Do not resolve authority hierarchy or conflict.",
    "Do not resolve effective date, supersession, amendment, currentness, ruling status, or case finality.",
    "Do not guarantee outcome."
  ];
  if (authorityState === "NO_INDEXED_SOURCE") {
    prohibited.push("Do not form a legal position from unavailable indexed authority.");
    prohibited.push("Do not claim direct authority or controlling support.");
  }
  if (authorityState === "RELATED_AUTHORITY_ONLY") prohibited.push("Do not describe related authority as controlling support.");
  if (authorityState === "GENERAL_TAX") prohibited.push("Do not claim exact authority for general tax orientation.");
  if (authorityType === "BIR_RULING") prohibited.push("Do not say a BIR ruling is binding on a non-addressee.");
  if (authorityType === "COURT_DECISION") prohibited.push("Do not treat CTA authority as Supreme Court doctrine.");
  return unique([...prohibited, ...safeArray(safety.prohibitedBehaviors).map(sanitizeOutputText)]);
}

export function assessAuthorityApplicability(input = {}) {
  const mode = normalizeMode(input.mode);
  const authorityState = normalizeAuthorityState(input);
  const sourceAvailabilityState = safeString(input.sourceAvailabilityState || authorityState) || authorityState;
  const authorityType = normalizeAuthorityType(input.authorityType);
  const factGapResult = input.factGapResult?.implementationScope === "FACT_GAP_HELPER_ONLY" ? input.factGapResult : {};
  const issueFrameResult = input.issueFrameResult?.implementationScope === "ISSUE_FRAMING_ONLY" ? input.issueFrameResult : {};
  const safety = inferSafetyPolicyResult({ ...input, mode }, authorityState);
  const requiredApplicabilityFacts = inferRequiredFacts(input, factGapResult);
  const missingApplicabilityFacts = inferMissingFacts(input, factGapResult, issueFrameResult);
  const sourceCoverageNeeds = inferSourceCoverageNeeds(input, factGapResult, issueFrameResult);
  const phase10DependencyFlags = phase10Flags(input, authorityType);
  const applicabilityLevel = classifyLevel(input, authorityState, authorityType, missingApplicabilityFacts, phase10DependencyFlags);
  const applicabilityPosture = derivePosture(applicabilityLevel, missingApplicabilityFacts);
  const canUseAsControllingAuthority = authorityState === "AUTHORITY_FOUND" &&
    missingApplicabilityFacts.length === 0 &&
    phase10DependencyFlags.length === 0 &&
    CONTROLLING_CAPABLE_TYPES.has(authorityType) &&
    applicabilityLevel === "DIRECTLY_APPLICABLE_IF_FACTS_MATCH";
  const canReachFinalConclusion = false;

  const result = {
    applicabilityLevel,
    applicabilityPosture,
    authorityType,
    authorityState,
    sourceAvailabilityState,
    requiredApplicabilityFacts,
    missingApplicabilityFacts,
    sourceCoverageNeeds,
    applicabilityCaution: buildCaution(input, authorityState, authorityType, applicabilityLevel, phase10DependencyFlags, safety),
    sourceStateCaution: safeString(input.sourceStateCaution || safety.sourceStateCaution || factGapResult.sourceStateCaution || issueFrameResult.sourceStateCaution) || null,
    prohibitedConclusions: prohibitedConclusions(input, authorityState, authorityType, safety),
    phase10DependencyFlags,
    canUseForGeneralOrientation: true,
    canUseAsControllingAuthority,
    canReachFinalConclusion,
    implementationScope: "AUTHORITY_APPLICABILITY_HELPER_ONLY"
  };

  for (const field of PROHIBITED_FIELDS) delete result[field];
  return result;
}

function questionFor(item) {
  const clean = safeString(item).replace(/\.$/, "");
  return clean ? `Confirm ${clean}.` : "";
}

export function buildAuthorityApplicabilityChecklist(inputOrAssessment = {}) {
  const assessment = inputOrAssessment.implementationScope === "AUTHORITY_APPLICABILITY_HELPER_ONLY"
    ? inputOrAssessment
    : assessAuthorityApplicability(inputOrAssessment);
  const questions = unique([
    ...assessment.missingApplicabilityFacts.map(questionFor),
    ...assessment.sourceCoverageNeeds.map((need) => `Verify source coverage: ${safeString(need).replace(/\.$/, "")}.`)
  ]).filter(Boolean);

  return {
    checklistType: "AUTHORITY_APPLICABILITY_CHECKLIST",
    authorityType: assessment.authorityType,
    authorityState: assessment.authorityState,
    applicabilityLevel: assessment.applicabilityLevel,
    applicabilityPosture: assessment.applicabilityPosture,
    questions,
    requiredApplicabilityFacts: assessment.requiredApplicabilityFacts,
    missingApplicabilityFacts: assessment.missingApplicabilityFacts,
    sourceCoverageNeeds: assessment.sourceCoverageNeeds,
    phase10DependencyFlags: assessment.phase10DependencyFlags,
    caution: assessment.applicabilityCaution,
    prohibitedConclusions: assessment.prohibitedConclusions,
    implementationScope: "AUTHORITY_APPLICABILITY_HELPER_ONLY"
  };
}

export default {
  assessAuthorityApplicability,
  buildAuthorityApplicabilityChecklist
};
