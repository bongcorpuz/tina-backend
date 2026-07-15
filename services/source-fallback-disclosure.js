// FILE: services/source-fallback-disclosure.js
// PHASE-10A6-R3-MISSING-AUTHORITY-CONFLICT-DISCLOSURE-REMEDIATION-1
//
// Pure, deterministic composition of a STRUCTURED EXPLANATORY answer body for
// the "source-only fallback" case: the SOURCE-mode deterministic renderer in
// answer-renderer.js discarded the model's analytical answer and emitted a
// canned "Indexed sources found:" list (see trust-contract.js
// answerIsBareSourceListing). PHASE-10A6-R1 correctly stopped that bare listing
// from being classified VERIFIED_CONTROLLING; PHASE-10A6-R2 confirmed the
// remaining P1: the answer BODY was still a bare source list that did not
// disclose that a requested authority was not located and did not present the
// stated conflict among authorities. This module builds a substantive,
// practitioner-safe body from already-available signals (retrieved source
// cards + the user's own question text). It performs no I/O, calls no model,
// and invents no facts or legal conclusions -- it only frames what the runtime
// already established: which authorities were retrieved, that a specifically
// requested authority (if any) was not matched, and that competing authorities
// must be weighed by hierarchy rather than treated as settled.

"use strict";

// A specifically-requested authority: the question asks about / for a named
// class of issuance (BIR ruling, revenue memorandum circular/order, revenue
// regulation, a specific issuance) rather than a general "explain X" question.
const SPECIFIC_AUTHORITY_REQUEST_RE =
  /\b(bir\s+ruling|specific\s+(?:bir\s+)?ruling|exact\s+(?:bir\s+)?ruling|requested\s+(?:bir\s+)?ruling|revenue\s+memorandum\s+(?:circular|order)|\brmc\b|\brmo\b|revenue\s+regulation|\brr\s*no\.?\b|specific\s+(?:issuance|circular|regulation|ruling)|particular\s+(?:issuance|circular|ruling))\b/i;

// The question frames competing / conflicting / differing authorities, or a
// missing/unlocatable requested authority.
const AUTHORITY_CONFLICT_FRAME_RE =
  /\b(conflict|conflicting|different\s+directions?|competing|inconsistent|contradict\w*|which\s+authority\s+controls|cannot\s+(?:be\s+)?(?:locate|located|find|found)|could\s+not\s+(?:locate|find)|not\s+(?:be\s+)?(?:locate|located|found)|without\s+(?:overstating|overstate)|harmoniz\w*)\b/i;

function normalizeQuery(value) {
  return typeof value === "string" ? value : "";
}

/**
 * True when the user's question seeks a specific/named class of authority
 * (a ruling, circular, regulation, etc.) rather than a general explanation.
 * Pure string match -- no I/O.
 * @param {unknown} queryText
 * @returns {boolean}
 */
export function querySeeksSpecificAuthority(queryText) {
  const q = normalizeQuery(queryText);
  return q.length > 0 && SPECIFIC_AUTHORITY_REQUEST_RE.test(q);
}

/**
 * True when the user's question frames competing/conflicting authorities or a
 * requested authority that could not be located. Pure string match -- no I/O.
 * @param {unknown} queryText
 * @returns {boolean}
 */
export function queryFramesAuthorityConflict(queryText) {
  const q = normalizeQuery(queryText);
  return q.length > 0 && AUTHORITY_CONFLICT_FRAME_RE.test(q);
}

function sourceLabel(card, index) {
  const label =
    (card && (card.label || card.displayLabel || card.citation || card.title)) || "";
  const type = (card && card.authorityType) || "";
  const text = String(label).trim() || `Source ${index + 1}`;
  return type ? `${text} — ${type}` : text;
}

const AUTHORITY_HIERARCHY_LINES = [
  "A statute (e.g., the National Internal Revenue Code) prevails over an administrative issuance.",
  "Controlling Supreme Court jurisprudence prevails over an inconsistent administrative interpretation.",
  "Regulations implement, but cannot amend, the statute.",
  "Revenue memorandum circulars, revenue memorandum orders, and BIR rulings are interpretive and cannot override higher authority.",
  "Applicability still depends on the specific facts, the taxable period, and the exact issue."
];

/**
 * Composes the structured explanatory fallback answer body. Pure -- no I/O,
 * no model call, no fabricated facts.
 *
 * @param {object} params
 * @param {Array}  params.sources - sanitized public source cards (may be empty)
 * @param {boolean} params.specificAuthorityRequested - a specific issuance was asked for but not matched
 * @param {boolean} params.conflictFramed - the question frames competing/uncertain authorities
 * @param {boolean} [params.hasVerifiedConflict] - runtime verified a displayable conflict
 * @returns {string} markdown answer body (never a bare "Indexed sources found:" list)
 */
export function buildStructuredSourceFallbackAnswer({
  sources = [],
  specificAuthorityRequested = false,
  conflictFramed = false,
  hasVerifiedConflict = false
} = {}) {
  const cards = Array.isArray(sources) ? sources.filter(Boolean) : [];
  const parts = [];

  parts.push("## Summary");
  parts.push(
    "TINA retrieved related authorities for this question but did not establish a single verified controlling authority for the exact issue raised. The authorities below are relevant, but they are not, on their own, a settled controlling conclusion for this specific question."
  );

  if (specificAuthorityRequested) {
    parts.push("## Requested authority");
    parts.push(
      "The specific issuance requested was not located or verified in TINA's indexed sources. This does not mean the issuance does not exist — only that it could not be retrieved and verified here. The authorities listed below are related and may inform the issue, but they are not a substitute for the requested authority."
    );
  }

  if (conflictFramed || hasVerifiedConflict) {
    parts.push("## Competing or conflicting authorities");
    parts.push(
      "The available authorities may point in different directions or require harmonization. The retrieved source set does not establish a fully settled, controlling conclusion for this exact issue, and any apparent conflict should be treated as unresolved until reconciled against the governing hierarchy and the specific facts."
    );
  }

  parts.push("## How to weigh these authorities");
  parts.push(AUTHORITY_HIERARCHY_LINES.map((l) => `- ${l}`).join("\n"));

  if (cards.length > 0) {
    parts.push("## Related authorities");
    parts.push(cards.map((c, i) => `${i + 1}. ${sourceLabel(c, i)}`).join("\n"));
  }

  parts.push("## Limitation");
  parts.push(
    "This is a related-authority result, not verified controlling authority. Professional review is recommended before relying on it for a specific position, filing, or transaction."
  );

  return parts.join("\n\n").trim();
}

/**
 * Builds the additive, payload-level structured disclosure metadata for a
 * source-only fallback response. Kept OFF the canonical trust contract (whose
 * top-level shape is frozen and exact-equality-guarded across phases) and
 * surfaced on the response payload instead, so persistence/reopen and the
 * frontend can read it without altering the trust contract shape. Pure.
 *
 * @param {object} params
 * @param {boolean} params.sourceOnlyFallback
 * @param {boolean} params.specificAuthorityRequested
 * @param {boolean} params.conflictFramed
 * @param {boolean} [params.hasVerifiedConflict]
 * @returns {object}
 */
export function buildSourceFallbackDisclosureMeta({
  sourceOnlyFallback = false,
  specificAuthorityRequested = false,
  conflictFramed = false,
  hasVerifiedConflict = false
} = {}) {
  return {
    sourceOnlyFallback: sourceOnlyFallback === true,
    specificAuthorityRequested: specificAuthorityRequested === true,
    requestedAuthorityMatched: false,
    specificAuthorityNotFound: sourceOnlyFallback === true && specificAuthorityRequested === true,
    conflictDetected: conflictFramed === true || hasVerifiedConflict === true,
    substantiveAnswerGenerated: sourceOnlyFallback !== true,
    authorityHierarchyQualified: sourceOnlyFallback === true,
    humanReviewRecommended: sourceOnlyFallback === true
  };
}

export default {
  querySeeksSpecificAuthority,
  queryFramesAuthorityConflict,
  buildStructuredSourceFallbackAnswer,
  buildSourceFallbackDisclosureMeta
};
