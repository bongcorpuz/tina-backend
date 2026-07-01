// FILE: bir-vs-taxpayer-position-helper.js
"use strict";

/**
 * PATCH-07B-014 narrow BIR vs taxpayer position helper.
 *
 * Boundary:
 * - Frames cautious, non-conclusive BIR-side and taxpayer-side positions from
 *   already-known inputs and existing Phase 7B helper outputs.
 * - Does not score risk, compute exposure, recommend settlement/protest/CTA
 *   strategy, resolve authority hierarchy/conflict/currentness, or wire routes.
 */

import { assessAuthorityApplicability } from "./authority-applicability-helper.js";
import { buildClientFactChecklistOutput } from "./client-fact-checklist-output.js";
import { identifyFactGaps } from "./fact-gap-helper.js";
import { frameTaxIssue } from "./issue-framing-engine.js";
import { applyReasoningSafetyPolicy } from "./reasoning-safety-policy.js";
import {
  applyAdversarialContentSafetyPolicy,
  assertAdversarialSafety,
  sanitizeAdversarialText
} from "./adversarial-content-safety-policy.js";

export const BIR_TAXPAYER_POSITION_HELPER_VERSION = "07B-014.1";
export const BIR_TAXPAYER_POSITION_IMPLEMENTATION_SCOPE = "BIR_TAXPAYER_POSITION_HELPER_ONLY";

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

function sanitized(value) {
  return sanitizeAdversarialText(value);
}

function sanitizedArray(values) {
  return unique(values).map(sanitized).filter(Boolean);
}

function inferIssueFrame(input = {}) {
  return input.issueFrameResult?.implementationScope === "ISSUE_FRAMING_ONLY"
    ? input.issueFrameResult
    : frameTaxIssue(input);
}

function inferSafetyPolicy(input = {}) {
  return input.safetyPolicyResult?.safetyPosture
    ? input.safetyPolicyResult
    : applyReasoningSafetyPolicy({
      mode: input.mode,
      authorityState: input.authorityState,
      sourceAvailabilityState: input.sourceAvailabilityState,
      missingUserFacts: input.missingUserFacts,
      authorityOrSourceCoverageNeeds: input.authorityOrSourceCoverageNeeds || input.sourceCoverageNeeds,
      requestedOutput: input.query
    });
}

function inferFactGaps(input = {}, issueFrameResult, safetyPolicyResult) {
  return input.factGapResult?.implementationScope === "FACT_GAP_HELPER_ONLY"
    ? input.factGapResult
    : identifyFactGaps({ ...input, issueFrameResult, safetyPolicyResult });
}

function inferClientChecklist(input = {}, issueFrameResult, safetyPolicyResult, factGapResult) {
  return input.clientFactChecklistResult?.implementationScope === "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY"
    ? input.clientFactChecklistResult
    : buildClientFactChecklistOutput({ ...input, issueFrameResult, safetyPolicyResult, factGapResult });
}

function inferAuthorityApplicability(input = {}, issueFrameResult, safetyPolicyResult, factGapResult) {
  return input.authorityApplicabilityResult?.implementationScope === "AUTHORITY_APPLICABILITY_HELPER_ONLY"
    ? input.authorityApplicabilityResult
    : assessAuthorityApplicability({ ...input, issueFrameResult, safetyPolicyResult, factGapResult });
}

function inferAdversarialSafety(input = {}) {
  return input.adversarialContentSafetyResult?.implementationScope === "ADVERSARIAL_CONTENT_SAFETY_POLICY_ONLY"
    ? input.adversarialContentSafetyResult
    : applyAdversarialContentSafetyPolicy(input);
}

function collectMissingCriticalFacts(input = {}, factGapResult = {}, authorityApplicabilityResult = {}) {
  return sanitizedArray([
    ...safeArray(input.missingCriticalFacts || input.missingUserFacts),
    ...safeArray(factGapResult.criticalMissingFacts),
    ...safeArray(factGapResult.timingOrPeriodGaps),
    ...safeArray(factGapResult.taxpayerStatusGaps),
    ...safeArray(factGapResult.transactionCharacterGaps),
    ...safeArray(factGapResult.assessmentStageGaps),
    ...safeArray(authorityApplicabilityResult.missingApplicabilityFacts)
  ]);
}

function collectRequiredDocuments(input = {}, factGapResult = {}, clientFactChecklistResult = {}) {
  return sanitizedArray([
    ...safeArray(input.requiredDocuments),
    ...safeArray(factGapResult.documentGaps),
    ...safeArray(clientFactChecklistResult.documentRequests)
  ]).map((item) => /provided/i.test(item) ? `${item} provided but not yet verified` : item);
}

function collectSourceCoverageNeeds(input = {}, issueFrameResult = {}, factGapResult = {}, authorityApplicabilityResult = {}) {
  return sanitizedArray([
    ...safeArray(input.sourceCoverageNeeds || input.authorityOrSourceCoverageNeeds),
    ...safeArray(issueFrameResult.sourceCoverageNeeds),
    ...safeArray(factGapResult.sourceCoverageNeeds),
    ...safeArray(authorityApplicabilityResult.sourceCoverageNeeds)
  ]);
}

function collectPhase10Flags(input = {}, authorityApplicabilityResult = {}) {
  return unique([
    ...safeArray(authorityApplicabilityResult.phase10DependencyFlags),
    ...safeArray(input.phase10DependencyFlags)
  ]).filter((flag) => PHASE10_FLAGS.has(flag) || flag.length > 0);
}

function auditProceduralFactsMissing(input = {}, missingCriticalFacts = []) {
  if (normalizeMode(input.mode) !== "/audit") return false;
  const haystack = [
    safeString(input.proceduralStage),
    safeString(input.assessmentStage),
    safeString(input.taxablePeriod),
    safeString(input.taxType),
    ...safeArray(input.knownFacts),
    ...safeArray(input.providedDocuments)
  ].join(" ").toLowerCase();
  const missingText = missingCriticalFacts.join(" ").toLowerCase();
  const needsLoa = !/\bloa\b|letter of authority/.test(haystack);
  const needsStage = !/\bpan\b|\bfan\b|\bfdda\b|assessment stage|protest|final assessment|preliminary assessment/.test(haystack);
  const needsPeriod = !safeString(input.taxablePeriod) && !/\btaxable (?:year|period)\b|\bperiod\b|\b20\d{2}\b/.test(haystack);
  const flaggedMissing = /\bloa\b|letter of authority|\bpan\b|\bfan\b|\bfdda\b|assessment stage|notice|taxable year|taxable period/i.test(missingText);
  return needsLoa || needsStage || needsPeriod || flaggedMissing;
}

function issueLabel(input = {}, issueFrameResult = {}) {
  return sanitized(input.issueFamily || issueFrameResult.issueFamily || input.taxType || issueFrameResult.taxType || "the tax issue");
}

function basisTypeFor(authorityState) {
  if (authorityState === "RELATED_AUTHORITY_ONLY") return "RELATED_AUTHORITY_ONLY_ILLUSTRATIVE";
  return "AUTHORITY_AND_FACT_DEPENDENT";
}

function buildBirFraming(input = {}, context = {}) {
  const { authorityState, issueFrameResult, missingCriticalFacts, requiredDocuments, sourceCoverageNeeds } = context;
  const issue = issueLabel(input, issueFrameResult);
  const prefix = authorityState === "RELATED_AUTHORITY_ONLY"
    ? "A possible BIR-side theory, stated only as limited illustrative framing, is"
    : "The BIR may frame the issue as";
  const documents = requiredDocuments.length > 0
    ? requiredDocuments.map((item) => `${item} needed to evaluate position`)
    : ["issue documents needed to evaluate position"];

  return {
    possibleBirTheory: sanitized(`${prefix} a fact- and document-dependent challenge involving ${issue}.`),
    basisType: basisTypeFor(authorityState),
    requiredFactsForBirTheory: sanitizedArray(missingCriticalFacts.length > 0 ? missingCriticalFacts : ["confirmed taxpayer, period, transaction, amount, and authority-applicability facts"]),
    documentsBirWouldLikelyRequest: sanitizedArray(documents),
    weaknessesInBirPosition: sanitizedArray([
      ...(missingCriticalFacts.length > 0 ? ["material facts remain unresolved"] : []),
      ...(requiredDocuments.length > 0 ? ["documents are needed to support position and are not assumed verified"] : []),
      ...(authorityState === "RELATED_AUTHORITY_ONLY" ? ["direct authority support is not established by related authority alone"] : []),
      ...(sourceCoverageNeeds.length > 0 ? ["source coverage needs remain open"] : []),
      "authority applicability remains fact-dependent"
    ]),
    caution: sanitizedArray([
      "This is non-conclusive BIR-side framing only.",
      "Do not treat this as an assessment validity conclusion."
    ])
  };
}

function buildTaxpayerFraming(input = {}, context = {}) {
  const { authorityState, issueFrameResult, missingCriticalFacts, requiredDocuments, sourceCoverageNeeds } = context;
  const issue = issueLabel(input, issueFrameResult);
  const prefix = authorityState === "RELATED_AUTHORITY_ONLY"
    ? "A possible taxpayer-side defense, stated only as limited illustrative framing, is"
    : "The taxpayer may argue";
  const documents = requiredDocuments.length > 0
    ? requiredDocuments.map((item) => `${item} needed to support position`)
    : ["issue documents needed to support position"];

  return {
    possibleTaxpayerDefense: sanitized(`${prefix} that the ${issue} position depends on verified facts, documents, and applicable authority.`),
    basisType: basisTypeFor(authorityState),
    requiredFactsForDefense: sanitizedArray(missingCriticalFacts.length > 0 ? missingCriticalFacts : ["confirmed taxpayer, period, transaction, amount, and supporting-document facts"]),
    documentsNeededToSupportDefense: sanitizedArray(documents),
    weaknessesInTaxpayerPosition: sanitizedArray([
      ...(missingCriticalFacts.length > 0 ? ["material facts remain unresolved"] : []),
      ...(requiredDocuments.length > 0 ? ["documents are needed to support position and are not assumed verified"] : []),
      ...(authorityState === "RELATED_AUTHORITY_ONLY" ? ["related authority is supporting only and may be distinguishable"] : []),
      ...(sourceCoverageNeeds.length > 0 ? ["source coverage needs remain open"] : []),
      "authority applicability remains fact-dependent"
    ]),
    caution: sanitizedArray([
      "This is non-conclusive taxpayer-side framing only.",
      "Do not treat this as a taxpayer outcome conclusion."
    ])
  };
}

function derivePosture({
  authorityState,
  adversarialPolicy,
  missingCriticalFacts,
  requiredDocuments,
  phase10DependencyFlags,
  auditMissingProcedure
}) {
  if (authorityState === "NO_INDEXED_SOURCE") return "NO_INDEXED_SOURCE_NO_POSITION_FRAMING";
  if (authorityState === "GENERAL_TAX") return "GENERAL_ORIENTATION_ONLY";
  if (auditMissingProcedure) return "PROCEDURAL_STAGE_NEEDED_BEFORE_POSITION_FRAMING";
  if (phase10DependencyFlags.length > 0) return "PHASE10_REVIEW_NEEDED_BEFORE_POSITION_FRAMING";
  if (authorityState === "RELATED_AUTHORITY_ONLY") return "RELATED_AUTHORITY_ONLY_LIMITED_POSITION_FRAMING";
  if (!adversarialPolicy.canGenerateBirTaxpayerFraming) return "FACTS_OR_DOCUMENTS_INSUFFICIENT_FOR_POSITION_FRAMING";
  if (missingCriticalFacts.length > 0 || requiredDocuments.length > 0) return "FACTS_OR_DOCUMENTS_INSUFFICIENT_FOR_POSITION_FRAMING";
  return "POSITION_FRAMING_ALLOWED_WITH_CAUTION";
}

function canFrameFor(posture, adversarialPolicy) {
  if (!adversarialPolicy.canGenerateBirTaxpayerFraming) return false;
  return posture === "POSITION_FRAMING_ALLOWED_WITH_CAUTION" ||
    posture === "RELATED_AUTHORITY_ONLY_LIMITED_POSITION_FRAMING";
}

function sourceStateCautionFor(authorityState, sourceStateCaution, sourceCoverageNeeds) {
  if (sourceStateCaution) return sanitized(sourceStateCaution);
  if (authorityState === "NO_INDEXED_SOURCE") {
    return "Indexed authority is not available, so BIR/taxpayer position framing is blocked.";
  }
  if (authorityState === "GENERAL_TAX") {
    return "General tax orientation cannot become exact authority or specific BIR/taxpayer legal position.";
  }
  if (authorityState === "RELATED_AUTHORITY_ONLY") {
    return "Related authority supports only limited illustrative framing and cannot be treated as direct support.";
  }
  if (sourceCoverageNeeds.length > 0) {
    return "Source coverage needs remain open and separate from user fact gaps.";
  }
  return null;
}

function removeNullFramingPlaceholders(output) {
  const clone = { ...output };
  if (clone.birPositionFraming && Array.isArray(clone.birPositionFraming.weaknessesInBirPosition)) {
    clone.weaknessesInBirPosition = clone.birPositionFraming.weaknessesInBirPosition;
  }
  if (clone.taxpayerPositionFraming && Array.isArray(clone.taxpayerPositionFraming.weaknessesInTaxpayerPosition)) {
    clone.weaknessesInTaxpayerPosition = clone.taxpayerPositionFraming.weaknessesInTaxpayerPosition;
  }
  if (clone.birPositionFraming === null) delete clone.birPositionFraming;
  if (clone.taxpayerPositionFraming === null) delete clone.taxpayerPositionFraming;
  return clone;
}

function finalizeOutput(output, safetyOptions) {
  const assertion = assertAdversarialSafety(removeNullFramingPlaceholders(output), safetyOptions);
  if (assertion.safe) {
    return {
      ...output,
      adversarialSafety: {
        ...output.adversarialSafety,
        finalAssertion: assertion
      }
    };
  }

  const fallback = {
    ...output,
    birPositionFraming: null,
    taxpayerPositionFraming: null,
    canFramePositions: false,
    factCautions: unique([...output.factCautions, "Adversarial safety assertion blocked position text."]),
    adversarialSafety: {
      ...output.adversarialSafety,
      finalAssertion: assertion
    }
  };
  const fallbackAssertion = assertAdversarialSafety(removeNullFramingPlaceholders(fallback), safetyOptions);
  return {
    ...fallback,
    adversarialSafety: {
      ...fallback.adversarialSafety,
      fallbackAssertion
    }
  };
}

export function assessBirTaxpayerPositions(input = {}) {
  const mode = normalizeMode(input.mode);
  const authorityState = normalizeAuthorityState(input);
  const sourceAvailabilityState = safeString(input.sourceAvailabilityState || authorityState) || authorityState;
  const baseInput = { ...input, mode, authorityState, sourceAvailabilityState };
  const issueFrameResult = inferIssueFrame(baseInput);
  const safetyPolicyResult = inferSafetyPolicy(baseInput);
  const factGapResult = inferFactGaps(baseInput, issueFrameResult, safetyPolicyResult);
  const clientFactChecklistResult = inferClientChecklist(baseInput, issueFrameResult, safetyPolicyResult, factGapResult);
  const authorityApplicabilityResult = inferAuthorityApplicability(baseInput, issueFrameResult, safetyPolicyResult, factGapResult);
  const missingCriticalFacts = collectMissingCriticalFacts(baseInput, factGapResult, authorityApplicabilityResult);
  const requiredDocuments = collectRequiredDocuments(baseInput, factGapResult, clientFactChecklistResult);
  const sourceCoverageNeeds = collectSourceCoverageNeeds(baseInput, issueFrameResult, factGapResult, authorityApplicabilityResult);
  const phase10DependencyFlags = collectPhase10Flags(baseInput, authorityApplicabilityResult);
  const adversarialPolicyInput = {
    ...baseInput,
    missingCriticalFacts,
    requiredDocuments,
    sourceCoverageNeeds,
    phase10DependencyFlags
  };
  const adversarialPolicy = inferAdversarialSafety(adversarialPolicyInput);
  const auditMissingProcedure = auditProceduralFactsMissing(baseInput, missingCriticalFacts);
  const controversyPosture = derivePosture({
    authorityState,
    adversarialPolicy,
    missingCriticalFacts,
    requiredDocuments,
    phase10DependencyFlags,
    auditMissingProcedure
  });
  const canFramePositions = canFrameFor(controversyPosture, adversarialPolicy);
  const strongestSupport = sanitizedArray(input.strongestSupport || input.strongestTaxpayerSupport);
  let weakestFactsOrDocuments = sanitizedArray(input.weakestFactsOrDocuments || input.weakestTaxpayerFactsOrDocuments);
  if (strongestSupport.length > 0 && weakestFactsOrDocuments.length === 0) {
    weakestFactsOrDocuments = ["weaknesses must be identified before support is relied on"];
  }
  const proceduralPosture = auditMissingProcedure
    ? "Procedural facts such as LOA, tax type covered, taxable period, PAN/FAN/FDDA status, and assessment stage are required before position framing."
    : sanitized(input.proceduralStage || input.assessmentStage || "Procedural posture is not resolved by this helper.");
  const authorityCautions = sanitizedArray([
    ...safeArray(authorityApplicabilityResult.applicabilityCaution),
    ...(authorityState === "AUTHORITY_FOUND" ? ["AUTHORITY_FOUND does not override missing facts, weak documents, or applicability gaps."] : []),
    ...(authorityState === "RELATED_AUTHORITY_ONLY" ? ["RELATED_AUTHORITY_ONLY allows only limited illustrative framing."] : []),
    ...(authorityState === "NO_INDEXED_SOURCE" ? ["NO_INDEXED_SOURCE blocks BIR/taxpayer position framing."] : []),
    ...(authorityState === "GENERAL_TAX" ? ["GENERAL_TAX supports orientation only."] : []),
    ...(phase10DependencyFlags.length > 0 ? ["Phase 10 dependency flags remain unresolved flags only."] : [])
  ]);
  const factCautions = sanitizedArray([
    ...safeArray(adversarialPolicy.requiredCautions),
    ...(missingCriticalFacts.length > 0 ? ["Missing critical facts must remain visible and cannot be assumed."] : [])
  ]);
  const documentCautions = sanitizedArray([
    ...(requiredDocuments.length > 0 ? ["Required documents are needed to evaluate position and are not assumed verified."] : []),
    ...safeArray(input.providedDocuments).map((item) => `${item} provided but not yet verified`)
  ]);
  const context = { authorityState, issueFrameResult, missingCriticalFacts, requiredDocuments, sourceCoverageNeeds };
  const birPositionFraming = canFramePositions ? buildBirFraming(baseInput, context) : null;
  const taxpayerPositionFraming = canFramePositions ? buildTaxpayerFraming(baseInput, context) : null;
  const sourceStateCaution = sourceStateCautionFor(
    authorityState,
    baseInput.sourceStateCaution || safetyPolicyResult.sourceStateCaution || factGapResult.sourceStateCaution || authorityApplicabilityResult.sourceStateCaution,
    sourceCoverageNeeds
  );

  const output = {
    controversyPosture,
    birPositionFraming,
    taxpayerPositionFraming,
    strongestSupport: weakestFactsOrDocuments.length > 0 ? strongestSupport : [],
    weakestFactsOrDocuments: strongestSupport.length > 0 ? weakestFactsOrDocuments : [],
    requiredDocuments,
    missingCriticalFacts,
    sourceCoverageNeeds,
    proceduralPosture: sanitized(proceduralPosture),
    authorityCautions,
    factCautions,
    documentCautions,
    sourceStateCaution,
    phase10DependencyFlags,
    prohibitedConclusions: sanitizedArray(adversarialPolicy.prohibitedConclusions),
    deferredItems: sanitizedArray([
      "final merits determination",
      "numeric risk scoring",
      "exposure computation",
      "settlement posture recommendation",
      "protest remedy planning",
      "court forum planning",
      "authority hierarchy/conflict resolution",
      "supersession/effective-date/currentness review",
      "live route or prompt integration"
    ]),
    adversarialSafety: {
      safetyPosture: adversarialPolicy.safetyPosture,
      requiredCautions: sanitizedArray(adversarialPolicy.requiredCautions),
      prohibitedConclusions: sanitizedArray(adversarialPolicy.prohibitedConclusions),
      hiddenWeaknessPolicy: sanitized(adversarialPolicy.hiddenWeaknessPolicy),
      phase10DependencyPolicy: sanitized(adversarialPolicy.phase10DependencyPolicy),
      canGenerateBirTaxpayerFraming: adversarialPolicy.canGenerateBirTaxpayerFraming,
      canReachFinalConclusion: false,
      canScoreRisk: false,
      canRecommendSettlement: false,
      sanitizedGeneratedStrings: true
    },
    canFramePositions,
    canReachFinalConclusion: false,
    canScoreRisk: false,
    canRecommendSettlement: false,
    implementationScope: BIR_TAXPAYER_POSITION_IMPLEMENTATION_SCOPE
  };

  return finalizeOutput(output, { ...adversarialPolicyInput, authorityState });
}

export function buildPositionFramingChecklist(input = {}) {
  const assessment = input.implementationScope === BIR_TAXPAYER_POSITION_IMPLEMENTATION_SCOPE
    ? input
    : assessBirTaxpayerPositions(input);
  const checklist = {
    checklistType: "BIR_TAXPAYER_POSITION_FRAMING_CHECKLIST",
    controversyPosture: assessment.controversyPosture,
    factsNeeded: sanitizedArray(assessment.missingCriticalFacts),
    documentsNeeded: sanitizedArray(assessment.requiredDocuments),
    authorityCautions: sanitizedArray(assessment.authorityCautions),
    sourceCoverageNeeds: sanitizedArray(assessment.sourceCoverageNeeds),
    proceduralPosture: sanitized(assessment.proceduralPosture),
    prohibitedConclusions: sanitizedArray(assessment.prohibitedConclusions),
    deferredItems: sanitizedArray(assessment.deferredItems),
    canFramePositions: assessment.canFramePositions,
    canReachFinalConclusion: false,
    canScoreRisk: false,
    canRecommendSettlement: false,
    implementationScope: BIR_TAXPAYER_POSITION_IMPLEMENTATION_SCOPE
  };
  const assertion = assertAdversarialSafety(checklist, {
    authorityState: "AUTHORITY_FOUND",
    phase10DependencyFlags: assessment.phase10DependencyFlags
  });
  return {
    ...checklist,
    adversarialSafety: {
      finalAssertion: assertion
    }
  };
}

export default {
  assessBirTaxpayerPositions,
  buildPositionFramingChecklist
};
