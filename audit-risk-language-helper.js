// FILE: audit-risk-language-helper.js
"use strict";

/**
 * PATCH-07B-AUDIT-RISK-HELPER-1 narrow qualitative audit-risk language helper.
 *
 * Boundary:
 * - Produces deterministic, evidence-tied qualitative audit labels only.
 * - Reuses upstream helper outputs when supplied.
 * - Does not integrate with routes, prompts, retrieval, source cards, settlement,
 *   protest, CTA/forum strategy, exposure computation, or final conclusions.
 */

import { identifyFactGaps } from "./fact-gap-helper.js";
import { buildClientFactChecklistOutput } from "./client-fact-checklist-output.js";
import { assessAuthorityApplicability } from "./authority-applicability-helper.js";
import {
  applyAdversarialContentSafetyPolicy,
  assertAdversarialSafety,
  sanitizeAdversarialText
} from "./adversarial-content-safety-policy.js";

export const AUDIT_RISK_LANGUAGE_HELPER_VERSION = "07B-AUDIT-RISK-HELPER-1.1";
export const AUDIT_RISK_LANGUAGE_IMPLEMENTATION_SCOPE = "AUDIT_RISK_LANGUAGE_HELPER_ONLY";

const MODES = new Set(["/ask", "/tax", "/audit"]);
const AUTHORITY_STATES = new Set(["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"]);
const PHASE10_FLAGS = new Set([
  "EFFECTIVE_DATE_REVIEW_NEEDED",
  "SUPERSESSION_OR_AMENDMENT_REVIEW_NEEDED",
  "HIERARCHY_CONFLICT_REVIEW_NEEDED",
  "SOURCE_CURRENTNESS_REVIEW_NEEDED",
  "RULING_OR_CASE_STATUS_REVIEW_NEEDED",
  "OFFICIAL_SOURCE_METADATA_REVIEW_NEEDED"
]);

const REQUIRED_CAUTION =
  "Do not treat qualitativeAuditRiskLabel as a numeric score, percentage, probability, exposure computation, or final audit conclusion.";

function safeString(value = "") {
  return String(value || "").trim();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean).map(safeString).filter(Boolean) : [safeString(value)].filter(Boolean);
}

function unique(values = []) {
  return [...new Set(safeArray(values).map(sanitizeSafeText).filter(Boolean))];
}

function sanitizeSafeText(value = "") {
  return sanitizeAdversarialText(value)
    .replace(/\brisk\s+level\b/gi, "qualitative audit label")
    .replace(/\brisk\s+score\b/gi, "numeric scoring")
    .replace(/\bcontrolling\s+authority\s+conclusion\b/gi, "authority-status conclusion")
    .replace(/\bcontrolling\s+authority\b/gi, "authority support")
    .trim();
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

function inferFactGapResult(input = {}) {
  return input.factGapResult?.implementationScope === "FACT_GAP_HELPER_ONLY"
    ? input.factGapResult
    : identifyFactGaps(input);
}

function inferClientFactChecklistResult(input = {}, factGapResult = {}) {
  return input.clientFactChecklistResult?.implementationScope === "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY"
    ? input.clientFactChecklistResult
    : buildClientFactChecklistOutput({ ...input, factGapResult });
}

function inferAuthorityApplicabilityResult(input = {}, factGapResult = {}) {
  return input.authorityApplicabilityResult?.implementationScope === "AUTHORITY_APPLICABILITY_HELPER_ONLY"
    ? input.authorityApplicabilityResult
    : assessAuthorityApplicability({ ...input, factGapResult });
}

function inferAdversarialContentSafetyResult(input = {}) {
  return input.adversarialContentSafetyResult?.implementationScope === "ADVERSARIAL_CONTENT_SAFETY_POLICY_ONLY"
    ? input.adversarialContentSafetyResult
    : applyAdversarialContentSafetyPolicy(input);
}

function collectMissingCriticalFacts(input = {}, factGapResult = {}, authorityApplicabilityResult = {}) {
  return unique([
    ...safeArray(input.missingCriticalFacts || input.missingUserFacts),
    ...safeArray(factGapResult.criticalMissingFacts),
    ...safeArray(factGapResult.timingOrPeriodGaps),
    ...safeArray(factGapResult.taxpayerStatusGaps),
    ...safeArray(factGapResult.transactionCharacterGaps),
    ...safeArray(factGapResult.assessmentStageGaps),
    ...safeArray(authorityApplicabilityResult.missingApplicabilityFacts)
  ]);
}

function collectMissingDocuments(input = {}, factGapResult = {}, clientFactChecklistResult = {}, birTaxpayerPositionResult = {}) {
  return unique([
    ...safeArray(input.missingDocuments || input.requiredDocuments),
    ...safeArray(factGapResult.documentGaps),
    ...safeArray(clientFactChecklistResult.documentRequests),
    ...safeArray(birTaxpayerPositionResult.requiredDocuments)
  ]);
}

function collectSourceCoverageNeeds(input = {}, issueFrameResult = {}, factGapResult = {}, authorityApplicabilityResult = {}) {
  return unique([
    ...safeArray(input.sourceCoverageNeeds || input.authorityOrSourceCoverageNeeds),
    ...safeArray(issueFrameResult.sourceCoverageNeeds),
    ...safeArray(factGapResult.sourceCoverageNeeds),
    ...safeArray(authorityApplicabilityResult.sourceCoverageNeeds)
  ]);
}

function collectPhase10DependencyFlags(input = {}, authorityApplicabilityResult = {}) {
  return unique([
    ...safeArray(input.phase10DependencyFlags),
    ...safeArray(authorityApplicabilityResult.phase10DependencyFlags)
  ]).filter((flag) => PHASE10_FLAGS.has(flag));
}

function collectPositionWeaknesses(birTaxpayerPositionResult = {}) {
  return unique([
    ...safeArray(birTaxpayerPositionResult.weakestFactsOrDocuments),
    ...safeArray(birTaxpayerPositionResult.weakestTaxpayerFactsOrDocuments),
    ...safeArray(birTaxpayerPositionResult.birPositionFraming?.weaknessesInBirPosition),
    ...safeArray(birTaxpayerPositionResult.taxpayerPositionFraming?.weaknessesInTaxpayerPosition)
  ]);
}

function textIncludes(values = [], pattern) {
  return safeArray(values).some((item) => pattern.test(item));
}

function hasDocumentWeakness(input = {}, missingDocuments = [], positionWeaknesses = []) {
  if (missingDocuments.length > 0) return false;
  if (input.documentsComplete === false || input.requiredDocumentsSatisfied === false) return true;
  return textIncludes([
    ...safeArray(input.providedDocuments),
    ...safeArray(input.documentWeaknesses || input.weakDocuments),
    ...positionWeaknesses
  ], /\bweak|incomplete|unreconciled|unsupported|unverified|not\s+verified|mismatch|missing\b/i);
}

function hasFactMismatch(input = {}, positionWeaknesses = []) {
  return textIncludes([
    ...safeArray(input.knownFacts),
    ...safeArray(input.factWeaknesses || input.factMismatches),
    ...positionWeaknesses
  ], /\bmismatch|inconsistent|unreconciled|does\s+not\s+match|different|conflict\b/i);
}

function auditProceduralFactsMissing(input = {}, missingCriticalFacts = []) {
  if (normalizeMode(input.mode) !== "/audit") return false;
  const known = [
    input.query,
    input.proceduralStage,
    input.assessmentStage,
    input.taxablePeriod,
    ...safeArray(input.knownFacts),
    ...safeArray(input.providedDocuments)
  ].join(" ").toLowerCase();
  const missing = missingCriticalFacts.join(" ").toLowerCase();
  const needsLoa = !/\bloa\b|letter of authority/.test(known);
  const needsStage = !/\bpan\b|\bfan\b|\bfdda\b|assessment stage|notice stage|final assessment|preliminary assessment/.test(known);
  const needsPeriod = !/taxable period|taxable year|period\s+\d{4}|year\s+\d{4}|\b20\d{2}\b/.test(known);
  const flaggedMissing = /\bloa\b|letter of authority|\bpan\b|\bfan\b|\bfdda\b|assessment stage|notice stage|taxable year|taxable period/i.test(missing);
  return needsLoa || needsStage || needsPeriod || flaggedMissing;
}

function deriveAuthorityStrength(authorityState, sourceCoverageNeeds = []) {
  if (authorityState === "NO_INDEXED_SOURCE") return "NO_INDEXED_AUTHORITY";
  if (authorityState === "GENERAL_TAX") return "GENERAL_ORIENTATION_ONLY";
  if (authorityState === "RELATED_AUTHORITY_ONLY") return "RELATED_AUTHORITY_ONLY";
  if (sourceCoverageNeeds.length > 0) return "AUTHORITY_FOUND_WITH_SOURCE_COVERAGE_NEEDS";
  return "AUTHORITY_FOUND_WITH_NO_VISIBLE_SOURCE_GAPS";
}

function deriveFactStrength(missingCriticalFacts = [], factMismatch = false) {
  if (missingCriticalFacts.length > 0) return "MISSING_CRITICAL_FACTS";
  if (factMismatch) return "FACT_MISMATCH_PRESENT";
  return "FACTS_PRESENT_FOR_LIMITED_LABEL";
}

function deriveDocumentStrength(missingDocuments = [], documentWeakness = false) {
  if (missingDocuments.length > 0) return "MISSING_DOCUMENTS";
  if (documentWeakness) return "WEAK_DOCUMENT_SUPPORT";
  return "DOCUMENTS_PRESENT_BUT_NOT_INDEPENDENTLY_VERIFIED";
}

function deriveProceduralStrength(mode, proceduralGap) {
  if (mode !== "/audit") return "NOT_AUDIT_MODE";
  if (proceduralGap) return "PROCEDURAL_FACTS_NEEDED";
  return "PROCEDURAL_FACTS_PRESENT_FOR_LIMITED_LABEL";
}

function deriveLabel({
  authorityState,
  phase10DependencyFlags,
  proceduralGap,
  missingCriticalFacts,
  missingDocuments,
  documentWeakness,
  factMismatch,
  sourceCoverageNeeds
}) {
  if (authorityState === "NO_INDEXED_SOURCE") return "INDETERMINATE_DUE_TO_NO_INDEXED_SOURCE";
  if (authorityState === "GENERAL_TAX") return "INDETERMINATE_DUE_TO_GENERAL_TAX_ONLY";
  if (phase10DependencyFlags.length > 0) return "INDETERMINATE_DUE_TO_PHASE10_REVIEW_NEEDED";
  if (proceduralGap) return "INDETERMINATE_DUE_TO_PROCEDURAL_FACTS_NEEDED";
  if (missingCriticalFacts.length > 0) return "INDETERMINATE_DUE_TO_MISSING_CRITICAL_FACTS";
  if (missingDocuments.length > 0) return "HIGH_DUE_TO_MISSING_DOCUMENTS";
  if (documentWeakness) return "HIGH_DUE_TO_WEAK_DOCUMENT_SUPPORT";
  if (factMismatch) return "MODERATE_DUE_TO_FACT_MISMATCH";
  if (authorityState === "RELATED_AUTHORITY_ONLY") return sourceCoverageNeeds.length > 0
    ? "INDETERMINATE_DUE_TO_RELATED_AUTHORITY_ONLY"
    : "MODERATE_DUE_TO_RELATED_AUTHORITY_ONLY";
  if (sourceCoverageNeeds.length > 0) return "INDETERMINATE_DUE_TO_SOURCE_COVERAGE_NEEDED";
  return "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS";
}

function deriveUncertaintyLevel(label) {
  if (label.startsWith("INDETERMINATE")) return "INDETERMINATE";
  if (label.startsWith("HIGH_DUE")) return "ELEVATED_UNCERTAINTY";
  if (label.startsWith("MODERATE_DUE")) return "MODERATE_UNCERTAINTY";
  return "REDUCED_UNCERTAINTY_BUT_NON_CONCLUSIVE";
}

function buildConditionsThatMayLowerLabel(input = {}) {
  return unique([
    ...safeArray(input.conditionsThatMayLowerLabel),
    ...safeArray(input.conditionsThatMayLowerRisk),
    "complete document reconciliation",
    "confirmed taxpayer, transaction, amount, and period facts",
    "authority support matched to the taxpayer facts"
  ]);
}

function buildConditionsThatMayIncreaseLabel(input = {}, positionWeaknesses = [], documentWeakness = false, factMismatch = false) {
  return unique([
    ...safeArray(input.conditionsThatMayIncreaseLabel),
    ...safeArray(input.conditionsThatMayIncreaseRisk),
    ...positionWeaknesses,
    ...(documentWeakness ? ["weak or incomplete document support"] : []),
    ...(factMismatch ? ["material fact mismatch or unreconciled records"] : [])
  ]);
}

function buildConditionsThatMakeLabelIndeterminate(input = {}, context = {}) {
  const {
    authorityState,
    missingCriticalFacts,
    missingDocuments,
    sourceCoverageNeeds,
    phase10DependencyFlags,
    proceduralGap
  } = context;
  return unique([
    ...safeArray(input.conditionsThatMakeLabelIndeterminate),
    ...safeArray(input.conditionsThatMakeRiskUnknown),
    ...(authorityState === "NO_INDEXED_SOURCE" ? ["indexed source support unavailable"] : []),
    ...(authorityState === "GENERAL_TAX" ? ["only general tax orientation is available"] : []),
    ...(proceduralGap ? ["audit procedural facts still needed"] : []),
    ...missingCriticalFacts,
    ...missingDocuments,
    ...sourceCoverageNeeds,
    ...phase10DependencyFlags
  ]);
}

function buildCautions(authorityState, phase10DependencyFlags = []) {
  return unique([
    REQUIRED_CAUTION,
    "The label is a bounded drafting aid only and must remain tied to visible facts, documents, and source coverage.",
    "Do not provide settlement, protest, CTA, or litigation strategy from this helper.",
    "Do not resolve hierarchy, effectivity, supersession, source-status, or metadata questions here.",
    ...(authorityState === "NO_INDEXED_SOURCE" ? ["NO_INDEXED_SOURCE blocks stronger audit label language."] : []),
    ...(authorityState === "GENERAL_TAX" ? ["GENERAL_TAX supports orientation only."] : []),
    ...(authorityState === "RELATED_AUTHORITY_ONLY" ? ["RELATED_AUTHORITY_ONLY cannot support a lower-concern label by itself."] : []),
    ...(phase10DependencyFlags.length > 0 ? ["Phase 10 dependency flags remain unresolved flags only."] : [])
  ]);
}

function buildProhibitedConclusions() {
  return unique([
    "Do not provide numeric or percentage scoring.",
    "Do not provide probability, odds, or exposure computation.",
    "Do not provide settlement, protest, CTA, or litigation strategy.",
    "Do not provide final audit conclusions.",
    "Do not resolve hierarchy, effectivity, supersession, source status, or metadata status.",
    "Do not treat missing facts or missing documents as satisfied."
  ]);
}

function finalizeOutput(output, safetyOptions) {
  const sanitized = {
    ...output,
    qualitativeAuditRiskLabel: sanitizeSafeText(output.qualitativeAuditRiskLabel),
    authorityStrength: sanitizeSafeText(output.authorityStrength),
    factStrength: sanitizeSafeText(output.factStrength),
    documentStrength: sanitizeSafeText(output.documentStrength),
    proceduralStrength: sanitizeSafeText(output.proceduralStrength),
    uncertaintyLevel: sanitizeSafeText(output.uncertaintyLevel),
    conditionsThatMayLowerLabel: unique(output.conditionsThatMayLowerLabel),
    conditionsThatMayIncreaseLabel: unique(output.conditionsThatMayIncreaseLabel),
    conditionsThatMakeLabelIndeterminate: unique(output.conditionsThatMakeLabelIndeterminate),
    sourceCoverageNeeds: unique(output.sourceCoverageNeeds),
    missingCriticalFacts: unique(output.missingCriticalFacts),
    missingDocuments: unique(output.missingDocuments),
    phase10DependencyFlags: unique(output.phase10DependencyFlags),
    cautions: unique(output.cautions),
    prohibitedConclusions: unique(output.prohibitedConclusions),
    canScoreRisk: false,
    canRecommendSettlement: false,
    canReachFinalConclusion: false,
    implementationScope: AUDIT_RISK_LANGUAGE_IMPLEMENTATION_SCOPE
  };
  const finalAssertion = assertAdversarialSafety(sanitized, safetyOptions);
  return {
    ...sanitized,
    adversarialSafety: {
      finalAssertion,
      sanitizedGeneratedStrings: true,
      implementationScope: "ADVERSARIAL_CONTENT_SAFETY_POLICY_ONLY"
    }
  };
}

export function assessQualitativeAuditRisk(input = {}) {
  const mode = normalizeMode(input.mode);
  const authorityState = normalizeAuthorityState(input);
  const sourceAvailabilityState = safeString(input.sourceAvailabilityState || authorityState) || authorityState;
  const baseInput = { ...input, mode, authorityState, sourceAvailabilityState };
  const factGapResult = inferFactGapResult(baseInput);
  const clientFactChecklistResult = inferClientFactChecklistResult(baseInput, factGapResult);
  const authorityApplicabilityResult = inferAuthorityApplicabilityResult(baseInput, factGapResult);
  const adversarialContentSafetyResult = inferAdversarialContentSafetyResult(baseInput);
  const birTaxpayerPositionResult = baseInput.birTaxpayerPositionResult || {};

  const missingCriticalFacts = collectMissingCriticalFacts(baseInput, factGapResult, authorityApplicabilityResult);
  const missingDocuments = collectMissingDocuments(baseInput, factGapResult, clientFactChecklistResult, birTaxpayerPositionResult);
  const sourceCoverageNeeds = collectSourceCoverageNeeds(baseInput, baseInput.issueFrameResult, factGapResult, authorityApplicabilityResult);
  const phase10DependencyFlags = collectPhase10DependencyFlags(baseInput, authorityApplicabilityResult);
  const positionWeaknesses = collectPositionWeaknesses(birTaxpayerPositionResult);
  const documentWeakness = hasDocumentWeakness(baseInput, missingDocuments, positionWeaknesses);
  const factMismatch = hasFactMismatch(baseInput, positionWeaknesses);
  const proceduralGap = auditProceduralFactsMissing(baseInput, missingCriticalFacts);

  const qualitativeAuditRiskLabel = deriveLabel({
    authorityState,
    phase10DependencyFlags,
    proceduralGap,
    missingCriticalFacts,
    missingDocuments,
    documentWeakness,
    factMismatch,
    sourceCoverageNeeds
  });

  const output = {
    qualitativeAuditRiskLabel,
    authorityStrength: deriveAuthorityStrength(authorityState, sourceCoverageNeeds),
    factStrength: deriveFactStrength(missingCriticalFacts, factMismatch),
    documentStrength: deriveDocumentStrength(missingDocuments, documentWeakness),
    proceduralStrength: deriveProceduralStrength(mode, proceduralGap),
    uncertaintyLevel: deriveUncertaintyLevel(qualitativeAuditRiskLabel),
    conditionsThatMayLowerLabel: buildConditionsThatMayLowerLabel(baseInput),
    conditionsThatMayIncreaseLabel: buildConditionsThatMayIncreaseLabel(baseInput, positionWeaknesses, documentWeakness, factMismatch),
    conditionsThatMakeLabelIndeterminate: buildConditionsThatMakeLabelIndeterminate(baseInput, {
      authorityState,
      missingCriticalFacts,
      missingDocuments,
      sourceCoverageNeeds,
      phase10DependencyFlags,
      proceduralGap
    }),
    sourceCoverageNeeds,
    missingCriticalFacts,
    missingDocuments,
    phase10DependencyFlags,
    cautions: buildCautions(authorityState, phase10DependencyFlags),
    prohibitedConclusions: buildProhibitedConclusions(),
    canScoreRisk: false,
    canRecommendSettlement: false,
    canReachFinalConclusion: false,
    implementationScope: AUDIT_RISK_LANGUAGE_IMPLEMENTATION_SCOPE
  };

  return finalizeOutput(output, {
    authorityState,
    phase10DependencyFlags,
    adversarialContentSafetyResult
  });
}

export function buildAuditRiskLanguageChecklist(input = {}) {
  const assessment = input.implementationScope === AUDIT_RISK_LANGUAGE_IMPLEMENTATION_SCOPE
    ? input
    : assessQualitativeAuditRisk(input);
  const checklist = {
    checklistType: "QUALITATIVE_AUDIT_RISK_LANGUAGE_CHECKLIST",
    qualitativeAuditRiskLabel: assessment.qualitativeAuditRiskLabel,
    factsNeeded: unique(assessment.missingCriticalFacts),
    documentsNeeded: unique(assessment.missingDocuments),
    sourceCoverageNeeds: unique(assessment.sourceCoverageNeeds),
    phase10DependencyFlags: unique(assessment.phase10DependencyFlags),
    conditionsThatMayLowerLabel: unique(assessment.conditionsThatMayLowerLabel),
    conditionsThatMayIncreaseLabel: unique(assessment.conditionsThatMayIncreaseLabel),
    conditionsThatMakeLabelIndeterminate: unique(assessment.conditionsThatMakeLabelIndeterminate),
    cautions: unique(assessment.cautions),
    prohibitedConclusions: buildProhibitedConclusions(),
    canScoreRisk: false,
    canRecommendSettlement: false,
    canReachFinalConclusion: false,
    implementationScope: AUDIT_RISK_LANGUAGE_IMPLEMENTATION_SCOPE
  };
  const finalAssertion = assertAdversarialSafety(checklist, {
    authorityState: "AUTHORITY_FOUND",
    phase10DependencyFlags: checklist.phase10DependencyFlags
  });
  return {
    ...checklist,
    adversarialSafety: {
      finalAssertion,
      sanitizedGeneratedStrings: true,
      implementationScope: "ADVERSARIAL_CONTENT_SAFETY_POLICY_ONLY"
    }
  };
}

export default {
  assessQualitativeAuditRisk,
  buildAuditRiskLanguageChecklist
};
