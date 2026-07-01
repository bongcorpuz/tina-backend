// FILE: reasoning-safety-policy.js
"use strict";

/**
 * PATCH-07B-008 narrow reasoning-safety policy helper.
 *
 * Boundary:
 * - Applies deterministic source-state and mode-boundary cautions.
 * - Does not perform legal reasoning, retrieval, source acquisition, hierarchy,
 *   supersession, BIR/taxpayer position generation, or risk scoring.
 */

export const REASONING_SAFETY_POLICY_VERSION = "07B-008.1";

const AUTHORITY_STATES = new Set(["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"]);
const MODES = new Set(["/ask", "/tax", "/audit"]);

const NO_INDEXED_SOURCE_CAUTION = "Indexed authority is not available, so a legal position cannot be formed from indexed sources. General issue orientation may be provided, but legal support must be verified from authority.";

function safeString(value = "") {
  return String(value || "").trim();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean).map(safeString).filter(Boolean) : [safeString(value)].filter(Boolean);
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

function includesUnsafeInstruction(requestedOutput) {
  const text = safeString(requestedOutput).toLowerCase();
  return {
    removeCaveats: /\b(remove|ignore|skip|drop|without)\b.*\b(caveats?|limitations?|qualifications?|warnings?)\b/.test(text),
    assumeFacts: /\b(assume|pretend|treat)\b.*\b(fact|complete|provided|true)\b/.test(text),
    guaranteeOutcome: /\b(guarantee|certain|sure\s+win|will\s+win|bir\s+will\s+lose|taxpayer\s+will\s+win|no\s+risk)\b/.test(text),
    numericScore: /\b(numeric|exact|percentage|percent|probability|odds|score)\b.*\b(risk|win|exposure|chance|litigation)\b/.test(text),
    relatedAsControlling: /\b(related|supporting)\b.*\b(controlling|governing|direct)\b|\btreat\b.*\brelated\b.*\bcontrolling\b/.test(text)
  };
}

function modeBoundaryFor(mode) {
  if (mode === "/tax") return "Preserve /tax senior-memo boundaries; issue framing cannot become final legal opinion.";
  if (mode === "/audit") return "Preserve /audit advisory boundaries; issue framing cannot become BIR/taxpayer legal positions, audit-defense conclusion, settlement advice, or risk score.";
  return "Preserve /ask conversational boundaries; issue framing cannot become /tax memo or /audit advisory output.";
}

function addIfMissing(target, value) {
  if (!target.includes(value)) target.push(value);
}

export function applyReasoningSafetyPolicy(input = {}) {
  const mode = normalizeMode(input.mode);
  const authorityState = normalizeAuthorityState(input);
  const missingFacts = safeArray(input.missingUserFacts);
  const sourceNeeds = safeArray(input.authorityOrSourceCoverageNeeds || input.sourceCoverageNeeds);
  const unsafe = includesUnsafeInstruction(input.requestedOutput);
  const requiredCaution = [];
  const prohibitedBehaviors = [
    "Do not provide BIR likely legal position.",
    "Do not provide taxpayer legal position.",
    "Do not provide risk score or numeric exposure estimate.",
    "Do not provide settlement recommendation.",
    "Do not provide audit defense conclusion.",
    "Do not provide final tax opinion or legal conclusion.",
    "Do not resolve authority hierarchy, conflict, supersession, effective date, or currentness."
  ];
  let allowReasoning = true;
  let safetyPosture = "ALLOW_ISSUE_FRAMING_WITH_CAUTION";
  let sourceStateCaution = null;

  if (missingFacts.length > 0) {
    requiredCaution.push("Material missing facts remain unresolved; do not treat assumptions as facts.");
  }
  if (sourceNeeds.length > 0) {
    requiredCaution.push("Authority/source coverage needs remain separate from user fact gaps.");
  }

  if (authorityState === "AUTHORITY_FOUND") {
    requiredCaution.push("AUTHORITY_FOUND allows issue framing only within source scope and does not override weak or missing facts/documents.");
  }

  if (authorityState === "RELATED_AUTHORITY_ONLY") {
    safetyPosture = "RELATED_AUTHORITY_ONLY_CAUTION";
    requiredCaution.push("Related authority may support orientation only and must not be treated as controlling or direct authority.");
    addIfMissing(prohibitedBehaviors, "Do not use controlling-authority language for related authority.");
    addIfMissing(prohibitedBehaviors, "Do not describe related authority as direct legal support.");
  }

  if (authorityState === "NO_INDEXED_SOURCE") {
    safetyPosture = "NO_INDEXED_SOURCE_GENERAL_ORIENTATION_ONLY";
    sourceStateCaution = NO_INDEXED_SOURCE_CAUTION;
    requiredCaution.push(NO_INDEXED_SOURCE_CAUTION);
    addIfMissing(prohibitedBehaviors, "Do not fabricate authority or cite unsupported legal basis.");
    addIfMissing(prohibitedBehaviors, "Do not claim direct legal support from indexed sources.");
    addIfMissing(prohibitedBehaviors, "Do not form a legal conclusion from unavailable indexed authority.");
    if (mode === "/audit") {
      addIfMissing(prohibitedBehaviors, "Do not generate BIR legal position under NO_INDEXED_SOURCE.");
      addIfMissing(prohibitedBehaviors, "Do not generate taxpayer legal position under NO_INDEXED_SOURCE.");
    }
  }

  if (authorityState === "GENERAL_TAX") {
    safetyPosture = "GENERAL_TAX_ORIENTATION_ONLY";
    requiredCaution.push("GENERAL_TAX supports general orientation only; exact authority and specific facts are required for legal support.");
    addIfMissing(prohibitedBehaviors, "Do not claim exact authority for a general tax orientation.");
  }

  if (input.hasDirectSourceCard) {
    requiredCaution.push("Direct source cards do not override fact mismatch, weak documents, or sourceAvailability limits.");
  }
  if (input.hasRelatedSourceCard) {
    requiredCaution.push("Related source cards remain related/supporting and do not become direct authority.");
    addIfMissing(prohibitedBehaviors, "Do not convert a related source card into direct authority.");
  }
  if (!input.hasDirectSourceCard && !input.hasRelatedSourceCard) {
    requiredCaution.push("No source card means no cited legal basis can be claimed.");
    addIfMissing(prohibitedBehaviors, "Do not claim cited legal basis without a source card or indexed authority.");
  }

  if (unsafe.removeCaveats) {
    requiredCaution.push("Unsafe instruction rejected: caveats and limitations must remain.");
    addIfMissing(prohibitedBehaviors, "Do not remove caveats or limitations on request.");
  }
  if (unsafe.assumeFacts) {
    requiredCaution.push("Unsafe instruction rejected: missing facts cannot be assumed.");
    addIfMissing(prohibitedBehaviors, "Do not assume missing facts on request.");
  }
  if (unsafe.guaranteeOutcome) {
    requiredCaution.push("Unsafe instruction rejected: outcomes cannot be guaranteed.");
    addIfMissing(prohibitedBehaviors, "Do not guarantee taxpayer win, BIR loss, cancellation, allowance, settlement result, protest result, or CTA result.");
  }
  if (unsafe.numericScore) {
    requiredCaution.push("Unsafe instruction rejected: numeric risk scoring is outside this policy scope.");
    addIfMissing(prohibitedBehaviors, "Do not provide numeric risk score, exact exposure score, win percentage, odds, or probability.");
  }
  if (unsafe.relatedAsControlling) {
    requiredCaution.push("Unsafe instruction rejected: related authority cannot be treated as controlling.");
    addIfMissing(prohibitedBehaviors, "Do not treat related authority as controlling.");
  }

  return {
    allowReasoning,
    safetyPosture,
    requiredCaution,
    prohibitedBehaviors,
    modeBoundary: modeBoundaryFor(mode),
    sourceStateCaution
  };
}

export default {
  applyReasoningSafetyPolicy
};
