// FILE: services/conflict-trust-classifier.js
// PHASE-10A1-R1-CONFLICT-TRUST-CONTRACT-CORRECTION-1
//
// Pure, deterministic helper that classifies the existing pipeline conflict
// signal into a safe, categorical public conflict state. It does not
// duplicate the renderer/compliance completeness standard -- it imports and
// reuses answer-renderer.js's own conflictMetadataIsComplete() so the public
// trust object can never disagree with what the renderer/compliance path
// actually evaluated. It performs no retrieval, no model calls, no I/O, and
// does not mutate its input.
//
// Root cause this module fixes (proven by direct execution, see
// PHASE-10A1-R1 report): pipeline.js's Step 9 Four-Part Doctrine Test result
// (ctx.conflictAnalysis = { trueConflicts, count, hasConflict }) is the only
// conflict signal ever attached anywhere in the pipeline (nothing ever sets
// ctx.conflict, ctx.conflictReview, ctx.hierarchyConflict,
// ctx.jurisprudenceConflict, or ctx.jurisprudencePayload). That shape never
// satisfies conflictMetadataIsComplete() (which requires conflict===true,
// conflictType, exactIssue, oppositeHoldingGate, resolutionBasis, etc.), so
// the renderer/compliance path can never disclose a conflict today, even
// when the Four-Part Doctrine Test found a genuine trueConflict. The prior
// trust-contract.js forwarded the raw ctx.conflictAnalysis.hasConflict
// boolean directly as trust.hasConflict, which could therefore be true while
// the rendered answer never disclosed any conflict -- a public
// contract/answer contradiction. This module closes that gap by evaluating
// the same completeness standard the renderer actually applies.

import { conflictMetadataIsComplete } from "../answer-renderer.js";

export const CONFLICT_STATE_VALUES = Object.freeze([
  "VERIFIED_CONFLICT",
  "POTENTIAL_CONFLICT",
  "NO_CONFLICT",
  "UNKNOWN",
  "NOT_APPLICABLE"
]);

function safeBool(value) {
  return value === true;
}

function safeObject(value) {
  return value && typeof value === "object" ? value : null;
}

/**
 * Classifies the existing pipeline/response result's conflict signal.
 *
 * @param {object} result - the same pipeline/response object trust-contract.js
 *   already consumes (must expose `conflictAnalysis` and/or `conflict` and/or
 *   `domainBoundary` exactly as pipeline.js/ask-handler.js already do).
 * @returns {{hasConflict: boolean, conflictState: string}}
 */
export function classifyConflictState(result = {}) {
  const safeResult = result && typeof result === "object" ? result : {};

  if (safeBool(safeResult.domainBoundary)) {
    return { hasConflict: false, conflictState: "NOT_APPLICABLE" };
  }

  const conflictAnalysis = safeObject(safeResult.conflictAnalysis);
  const rawConflict = safeObject(safeResult.conflict);

  // Mirror pipeline.js's own renderTinaAnswer wiring exactly (Step 15):
  // `conflict: ctx.conflictAnalysis?.hasConflict ? ctx.conflictAnalysis : null`.
  // Evaluating completeness on the identical candidate the renderer actually
  // received guarantees trust.conflictState can never contradict what the
  // renderer/compliance path actually did with the same request (Invariant 6).
  const rendererCandidate = conflictAnalysis?.hasConflict === true ? conflictAnalysis : null;

  if (rendererCandidate && conflictMetadataIsComplete(rendererCandidate)) {
    return { hasConflict: true, conflictState: "VERIFIED_CONFLICT" };
  }
  // Defensively also honor an already-complete conflict object supplied
  // directly (e.g. a future upstream mechanism attaching richer metadata),
  // without requiring trust-contract.js to know about that mechanism.
  if (rawConflict && conflictMetadataIsComplete(rawConflict)) {
    return { hasConflict: true, conflictState: "VERIFIED_CONFLICT" };
  }

  const upstreamSignaledPossibleConflict =
    safeBool(conflictAnalysis?.hasConflict) ||
    (Array.isArray(conflictAnalysis?.trueConflicts) && conflictAnalysis.trueConflicts.length > 0) ||
    safeBool(rawConflict?.hasConflict);

  if (upstreamSignaledPossibleConflict) {
    // Genuine upstream conflict evidence exists but does not meet the
    // renderer/compliance completeness standard. The evidence is not
    // discarded -- it is surfaced as POTENTIAL_CONFLICT rather than silently
    // dropped or misrepresented as a verified, user-displayable conflict.
    return { hasConflict: false, conflictState: "POTENTIAL_CONFLICT" };
  }

  if (conflictAnalysis && conflictAnalysis.hasConflict === false) {
    return { hasConflict: false, conflictState: "NO_CONFLICT" };
  }
  if (rawConflict && rawConflict.hasConflict === false) {
    return { hasConflict: false, conflictState: "NO_CONFLICT" };
  }

  return { hasConflict: false, conflictState: "UNKNOWN" };
}
