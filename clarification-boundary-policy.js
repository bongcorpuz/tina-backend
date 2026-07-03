// FILE: clarification-boundary-policy.js
"use strict";

/**
 * PATCH-07B-CLARIFICATION-HELPER-1 narrow clarification boundary helper.
 *
 * Boundary:
 * - Aggregates existing Phase 7B helper outputs into a clarification decision.
 * - Does not create a new fact, document, authority, audit, or source detector.
 * - Does not build prompts, wire routes, orchestrate production flow, or change responses.
 */

import { frameTaxIssue } from "./issue-framing-engine.js";
import { applyReasoningSafetyPolicy } from "./reasoning-safety-policy.js";
import { identifyFactGaps } from "./fact-gap-helper.js";
import { buildClientFactChecklistOutput } from "./client-fact-checklist-output.js";
import { assessAuthorityApplicability } from "./authority-applicability-helper.js";
import {
  assertAdversarialSafety,
  sanitizeAdversarialText
} from "./adversarial-content-safety-policy.js";

export const CLARIFICATION_BOUNDARY_POLICY_VERSION = "07B-CLARIFICATION-HELPER-1";
export const CLARIFICATION_BOUNDARY_POLICY_IMPLEMENTATION_SCOPE = "CLARIFICATION_BOUNDARY_POLICY_ONLY";

export const CLARIFICATION_DECISIONS = Object.freeze([
  "ASK_BEFORE_ANSWERING",
  "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP",
  "REQUEST_DOCUMENTS",
  "DISCLOSE_SOURCE_LIMITATION",
  "DISCLOSE_PHASE10_DEFERRAL",
  "ANSWER_NOW_NO_CLARIFICATION_NEEDED"
]);

export const ALLOWED_ANSWER_POSTURES = Object.freeze([
  "GENERAL_ORIENTATION_ONLY",
  "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS",
  "NO_ANSWER_UNTIL_CLARIFIED"
]);

const MODES = new Set(["/ask", "/tax", "/audit"]);
const AUTHORITY_STATES = new Set(["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"]);
const QUESTION_CAPS = Object.freeze({ "/ask": 3, "/tax": 7, "/audit": 10 });
const SENSITIVE_IDENTIFIER_PATTERN = /\b(?:TIN|full address|bank account number|unnecessary personal identifiers?)\b/i;
const UNSAFE_REQUEST_PATTERN = /\b(?:prove this qualifies as zero-rated|confirm this is legally deductible|confirm the assessment is void)\b/i;

function safeString(value = "") {
  return sanitizeAdversarialText(String(value || "").trim());
}

function safeArray(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.map(safeString).filter(Boolean);
}

function unique(values = []) {
  return [...new Set(safeArray(values))];
}

function normalizeMode(mode) {
  return MODES.has(mode) ? mode : "/ask";
}

function normalizeAuthorityState(input = {}) {
  const direct = safeString(input.authorityState || input.sourceAvailabilityState);
  return AUTHORITY_STATES.has(direct) ? direct : "GENERAL_TAX";
}

function firstArray(...values) {
  for (const value of values) {
    const array = safeArray(value);
    if (array.length > 0) return array;
  }
  return [];
}

function ownArray(source, key) {
  if (!source || typeof source !== "object" || !Object.hasOwn(source, key)) return null;
  return safeArray(source[key]);
}

function pickArray(primary, key, ...fallbacks) {
  const owned = ownArray(primary, key);
  if (owned) return owned;
  return firstArray(...fallbacks);
}

function mergeArrays(...values) {
  return unique(values.flatMap((value) => safeArray(value)));
}

function useExistingOrFallback(input, key, fallback) {
  if (input[key] && typeof input[key] === "object") return input[key];
  return fallback;
}

function buildUpstream(input = {}, mode, authorityState) {
  const base = { ...input, mode, authorityState, sourceAvailabilityState: input.sourceAvailabilityState || authorityState };
  const issueFrameResult = useExistingOrFallback(base, "issueFrameResult", frameTaxIssue(base));
  const safetyPolicyResult = useExistingOrFallback(base, "safetyPolicyResult", applyReasoningSafetyPolicy(base));
  const factGapResult = useExistingOrFallback(base, "factGapResult", identifyFactGaps({ ...base, issueFrameResult }));
  const clientFactChecklistResult = useExistingOrFallback(
    base,
    "clientFactChecklistResult",
    buildClientFactChecklistOutput({ ...base, issueFrameResult, factGapResult, safetyPolicyResult })
  );
  const authorityApplicabilityResult = useExistingOrFallback(
    base,
    "authorityApplicabilityResult",
    assessAuthorityApplicability({ ...base, issueFrameResult, factGapResult, safetyPolicyResult })
  );

  return {
    issueFrameResult,
    safetyPolicyResult,
    factGapResult,
    clientFactChecklistResult,
    authorityApplicabilityResult,
    adversarialContentSafetyResult: base.adversarialContentSafetyResult || {},
    birTaxpayerPositionResult: base.birTaxpayerPositionResult || {},
    qualitativeAuditRiskResult: base.qualitativeAuditRiskResult || {}
  };
}

function aggregateSignals(input = {}, upstream = {}) {
  const fact = upstream.factGapResult || {};
  const checklist = upstream.clientFactChecklistResult || {};
  const applicability = upstream.authorityApplicabilityResult || {};
  const safety = upstream.safetyPolicyResult || {};
  const issue = upstream.issueFrameResult || {};
  const auditRisk = upstream.qualitativeAuditRiskResult || {};
  const directGapKeys = [
    "criticalMissingFacts",
    "helpfulMissingFacts",
    "documentGaps",
    "missingDocuments",
    "missingApplicabilityFacts",
    "requiredApplicabilityFacts",
    "timingOrPeriodGaps",
    "taxpayerStatusGaps",
    "transactionCharacterGaps",
    "assessmentStageGaps",
    "auditProceduralFactsMissing"
  ];
  const directSignalsProvided = directGapKeys.some((key) => Object.hasOwn(input, key));
  const directPick = (key, ...fallbacks) => {
    const owned = ownArray(input, key);
    if (owned) return owned;
    return directSignalsProvided ? [] : firstArray(...fallbacks);
  };

  return {
    criticalMissingFacts: directPick("criticalMissingFacts", fact.criticalMissingFacts, checklist.criticalQuestions),
    helpfulMissingFacts: directPick("helpfulMissingFacts", fact.helpfulMissingFacts, checklist.helpfulQuestions),
    documentGaps: directPick("documentGaps", input.missingDocuments, fact.documentGaps, checklist.documentRequests),
    sourceCoverageNeeds: mergeArrays(input.sourceCoverageNeeds, input.authorityOrSourceCoverageNeeds, fact.sourceCoverageNeeds, checklist.sourceCoverageNeeds, applicability.sourceCoverageNeeds, issue.sourceCoverageNeeds),
    missingApplicabilityFacts: directPick("missingApplicabilityFacts", applicability.missingApplicabilityFacts),
    requiredApplicabilityFacts: directPick("requiredApplicabilityFacts", applicability.requiredApplicabilityFacts),
    phase10DependencyFlags: mergeArrays(input.phase10DependencyFlags, applicability.phase10DependencyFlags, safety.phase10DependencyFlags, auditRisk.phase10DependencyFlags),
    timingOrPeriodGaps: directPick("timingOrPeriodGaps", fact.timingOrPeriodGaps, checklist.timingAndPeriodQuestions),
    taxpayerStatusGaps: directPick("taxpayerStatusGaps", fact.taxpayerStatusGaps, checklist.taxpayerStatusQuestions),
    transactionCharacterGaps: directPick("transactionCharacterGaps", fact.transactionCharacterGaps, checklist.transactionCharacterQuestions),
    assessmentStageGaps: directPick("assessmentStageGaps", input.auditProceduralFactsMissing === true ? ["current stage"] : [], fact.assessmentStageGaps, checklist.assessmentStageQuestions),
    groupedChecklist: input.groupedChecklist === true || checklist.groupedChecklist === true,
    userOfferedSource: input.userOfferedSource === true
  };
}

function questionForFact(item, mode) {
  const clean = safeString(item).replace(/\.$/, "");
  if (!clean || SENSITIVE_IDENTIFIER_PATTERN.test(clean)) return "";
  if (/seller VAT registration/i.test(clean)) return "Is the seller VAT-registered?";
  if (/PEZA|export/i.test(clean)) return "What is the PEZA/export status?";
  if (/buyer|customer/i.test(clean)) return "What is the buyer/customer status?";
  if (/transaction date|taxable period|taxable year|period|year/i.test(clean)) return "What taxable year or period is involved?";
  if (/taxpayer type|taxpayer status/i.test(clean)) return "What taxpayer type is involved?";
  if (/tax type/i.test(clean)) return "What tax type is involved?";
  if (/transaction character/i.test(clean)) return "What is the transaction character?";
  if (/document status/i.test(clean)) return "What is the document status?";
  if (/procedural stage|current stage|assessment stage/i.test(clean)) return "What procedural stage applies?";
  if (/notice date|receipt date|date/i.test(clean) && mode === "/audit") return "What notice date or receipt date is involved?";
  if (/deadline/i.test(clean)) return "What deadline facts are known?";
  if (/LOA/i.test(clean)) return "Was an LOA received and what is its date?";
  if (/PAN|FAN|FDDA/i.test(clean)) return "Were PAN, FAN, or FDDA notices received?";
  if (/applicability/i.test(clean)) return "What authority applicability fact is missing?";
  if (/specific transaction|tax issue/i.test(clean)) return "What transaction or tax issue do you want to narrow?";
  if (/amount/i.test(clean)) return "What amount is involved?";
  if (/recurring/i.test(clean)) return "Is the transaction recurring?";
  return `What ${clean} is involved?`;
}

function documentRequestFor(item) {
  const clean = safeString(item).replace(/\.$/, "");
  if (!clean || SENSITIVE_IDENTIFIER_PATTERN.test(clean) || UNSAFE_REQUEST_PATTERN.test(clean)) return "";
  if (/^please provide\b/i.test(clean)) return clean.endsWith(".") ? clean : `${clean}.`;
  if (/LOA|PAN|FAN|FDDA/i.test(clean)) return "Please provide the LOA/PAN/FAN/FDDA.";
  if (/support/i.test(clean)) return "Please provide the support documents.";
  return `Please provide the ${clean}.`;
}

function capQuestions(questions, mode, groupedChecklist) {
  if (groupedChecklist === true && mode === "/tax") return unique(questions);
  return unique(questions).slice(0, QUESTION_CAPS[mode] || 3);
}

function buildQuestions(signals, mode, decision) {
  if (decision === "DISCLOSE_PHASE10_DEFERRAL") return [];
  const legalFacts = mergeArrays(signals.criticalMissingFacts, signals.taxpayerStatusGaps, signals.transactionCharacterGaps, signals.timingOrPeriodGaps);
  const auditFacts = signals.assessmentStageGaps;
  const applicabilityFacts = signals.missingApplicabilityFacts;
  const helpfulFacts = signals.helpfulMissingFacts;
  const ordered = mode === "/audit"
    ? [...auditFacts, ...legalFacts, ...applicabilityFacts, ...helpfulFacts]
    : [...legalFacts, ...auditFacts, ...applicabilityFacts, ...helpfulFacts];
  return capQuestions(ordered.map((item) => questionForFact(item, mode)).filter(Boolean), mode, signals.groupedChecklist);
}

function buildDocumentRequests(signals, decision) {
  if (decision === "DISCLOSE_PHASE10_DEFERRAL") return [];
  return unique(signals.documentGaps.map(documentRequestFor).filter(Boolean));
}

function buildSourceCoverageLimitations(signals, authorityState) {
  if (authorityState === "NO_INDEXED_SOURCE") {
    return ["Indexed source support is unavailable for this request."];
  }
  if (authorityState === "GENERAL_TAX") {
    return ["Only general orientation is supported until the issue is narrowed."];
  }
  if (authorityState === "RELATED_AUTHORITY_ONLY") {
    return ["Only related authority support is available."];
  }
  return unique(signals.sourceCoverageNeeds.map((need) => safeString(need))).filter(Boolean);
}

function phase10DeferralFor(flag) {
  const clean = safeString(flag);
  if (/CURRENTNESS|SOURCE_CURRENTNESS/i.test(clean)) return "Source currentness review remains deferred.";
  if (/SUPERSESSION|AMENDMENT/i.test(clean)) return "Amendment or source status review remains deferred.";
  if (/HIERARCHY|CONFLICT/i.test(clean)) return "Authority hierarchy review remains deferred.";
  if (/OFFICIAL_SOURCE|METADATA/i.test(clean)) return "Official source metadata review remains deferred.";
  if (/RULING|CASE_STATUS|CASE/i.test(clean)) return "Ruling or case status review remains deferred.";
  if (/EFFECTIVE_DATE/i.test(clean)) return "Effective-date review remains deferred.";
  return `${clean.replace(/_/g, " ").toLowerCase()} remains deferred.`;
}

function buildPhase10Deferrals(signals) {
  return unique(signals.phase10DependencyFlags.map(phase10DeferralFor).filter(Boolean));
}

function hasBlockingFacts(signals) {
  return mergeArrays(
    signals.criticalMissingFacts,
    signals.taxpayerStatusGaps,
    signals.transactionCharacterGaps,
    signals.timingOrPeriodGaps,
    signals.assessmentStageGaps,
    signals.missingApplicabilityFacts
  ).length > 0;
}

function decide(input, mode, authorityState, signals) {
  const blockingFacts = hasBlockingFacts(signals);
  const hasPhase10 = signals.phase10DependencyFlags.length > 0;
  const hasDocuments = signals.documentGaps.length > 0;
  const hasHelpful = signals.helpfulMissingFacts.length > 0;

  if (hasPhase10) {
    return {
      clarificationDecision: "DISCLOSE_PHASE10_DEFERRAL",
      clarificationReason: "Phase 10 source-status review remains deferred.",
      shouldAskBeforeAnswer: false,
      answerAllowed: true,
      allowedAnswerPosture: "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS"
    };
  }
  if (authorityState === "NO_INDEXED_SOURCE") {
    return {
      clarificationDecision: "DISCLOSE_SOURCE_LIMITATION",
      clarificationReason: "Indexed source support is unavailable.",
      shouldAskBeforeAnswer: false,
      answerAllowed: true,
      allowedAnswerPosture: "GENERAL_ORIENTATION_ONLY"
    };
  }
  if (authorityState === "GENERAL_TAX") {
    return {
      clarificationDecision: signals.criticalMissingFacts.length > 0 || hasHelpful ? "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP" : "ANSWER_NOW_NO_CLARIFICATION_NEEDED",
      clarificationReason: "General orientation is allowed while any narrowing facts remain open.",
      shouldAskBeforeAnswer: false,
      answerAllowed: true,
      allowedAnswerPosture: "GENERAL_ORIENTATION_ONLY"
    };
  }
  if (authorityState === "RELATED_AUTHORITY_ONLY") {
    return {
      clarificationDecision: "DISCLOSE_SOURCE_LIMITATION",
      clarificationReason: "Related authority can support only limited orientation.",
      shouldAskBeforeAnswer: false,
      answerAllowed: true,
      allowedAnswerPosture: "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS"
    };
  }
  if (blockingFacts) {
    return {
      clarificationDecision: "ASK_BEFORE_ANSWERING",
      clarificationReason: mode === "/audit" ? "Procedural or gating facts are needed before audit analysis." : "Gating facts are needed before a specific answer.",
      shouldAskBeforeAnswer: true,
      answerAllowed: false,
      allowedAnswerPosture: "NO_ANSWER_UNTIL_CLARIFIED"
    };
  }
  if (hasDocuments) {
    return {
      clarificationDecision: "REQUEST_DOCUMENTS",
      clarificationReason: "Documents are needed for substantiation, while a cautious answer can proceed.",
      shouldAskBeforeAnswer: false,
      answerAllowed: true,
      allowedAnswerPosture: "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS"
    };
  }
  if (hasHelpful) {
    return {
      clarificationDecision: "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP",
      clarificationReason: "Only helpful context is missing.",
      shouldAskBeforeAnswer: false,
      answerAllowed: true,
      allowedAnswerPosture: "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS"
    };
  }
  return {
    clarificationDecision: "ANSWER_NOW_NO_CLARIFICATION_NEEDED",
    clarificationReason: "No blocking clarification signal is present.",
    shouldAskBeforeAnswer: false,
    answerAllowed: true,
    allowedAnswerPosture: "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS"
  };
}

function baseProhibitedConclusions(authorityState, mode) {
  const prohibited = [
    "Do not provide conclusive outcome language.",
    "Do not provide outcome guarantees.",
    "Do not treat missing facts or documents as supplied.",
    "Do not ask users to supply legal research.",
    "Do not ask users to resolve deferred source-status issues."
  ];
  if (authorityState === "NO_INDEXED_SOURCE") prohibited.push("Do not claim indexed authority support.");
  if (authorityState === "RELATED_AUTHORITY_ONLY") prohibited.push("Do not convert related support into exact authority support.");
  if (mode === "/audit") prohibited.push("Do not provide forum, settlement, or filing strategy.");
  return prohibited;
}

function sanitizeOutput(output) {
  return {
    ...output,
    clarificationReason: safeString(output.clarificationReason),
    questions: unique(output.questions).filter((item) => !SENSITIVE_IDENTIFIER_PATTERN.test(item) && !UNSAFE_REQUEST_PATTERN.test(item)),
    documentRequests: unique(output.documentRequests).filter((item) => !SENSITIVE_IDENTIFIER_PATTERN.test(item) && !UNSAFE_REQUEST_PATTERN.test(item)),
    sourceCoverageLimitations: unique(output.sourceCoverageLimitations),
    phase10Deferrals: unique(output.phase10Deferrals),
    prohibitedConclusions: unique(output.prohibitedConclusions),
    canReachFinalConclusion: false,
    implementationScope: CLARIFICATION_BOUNDARY_POLICY_IMPLEMENTATION_SCOPE
  };
}

function finalizeOutput(output, safetyOptions = {}) {
  const sanitized = sanitizeOutput(output);
  const safety = assertAdversarialSafety(sanitized, {
    ...safetyOptions,
    allowControllingAuthority: false,
    allowBindingBir: false
  });
  if (!safety.safe) {
    throw new Error(`Clarification boundary safety violation: ${safety.violations.join("; ")}`);
  }
  return sanitized;
}

export function assessClarificationNeed(input = {}) {
  const normalizedInput = { ...(input.inputSignals || {}), ...input };
  delete normalizedInput.inputSignals;
  const mode = normalizeMode(normalizedInput.mode);
  const authorityState = normalizeAuthorityState(normalizedInput);
  const upstream = buildUpstream(normalizedInput, mode, authorityState);
  const signals = aggregateSignals(normalizedInput, upstream);
  const decision = decide(normalizedInput, mode, authorityState, signals);
  const questions = buildQuestions(signals, mode, decision.clarificationDecision);
  const documentRequests = buildDocumentRequests(signals, decision.clarificationDecision);
  const output = {
    clarificationDecision: decision.clarificationDecision,
    clarificationReason: decision.clarificationReason,
    shouldAskBeforeAnswer: decision.shouldAskBeforeAnswer,
    questions,
    documentRequests,
    sourceCoverageLimitations: buildSourceCoverageLimitations(signals, authorityState),
    phase10Deferrals: buildPhase10Deferrals(signals),
    answerAllowed: decision.answerAllowed,
    allowedAnswerPosture: decision.allowedAnswerPosture,
    prohibitedConclusions: baseProhibitedConclusions(authorityState, mode),
    canReachFinalConclusion: false,
    implementationScope: CLARIFICATION_BOUNDARY_POLICY_IMPLEMENTATION_SCOPE
  };

  if (decision.clarificationDecision === "DISCLOSE_PHASE10_DEFERRAL") {
    output.sourceCoverageLimitations = [];
  }
  if (signals.userOfferedSource && authorityState === "NO_INDEXED_SOURCE") {
    output.documentRequests = ["If you already have a cited document, you may share or upload it for review."];
  }

  return finalizeOutput(output, { ...normalizedInput, mode, authorityState, sourceAvailabilityState: authorityState });
}

export function buildClarificationChecklist(input = {}) {
  const assessment = input.implementationScope === CLARIFICATION_BOUNDARY_POLICY_IMPLEMENTATION_SCOPE
    ? input
    : assessClarificationNeed(input);
  return finalizeOutput({
    ...assessment,
    checklistType: "CLARIFICATION_BOUNDARY_CHECKLIST"
  }, input);
}

export default {
  assessClarificationNeed,
  buildClarificationChecklist
};
