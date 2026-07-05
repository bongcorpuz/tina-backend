// FILE: helpers/chat-context-carryover.js
// PATCH-08X-CHAT-CONTEXT-CARRYOVER-SCAFFOLD-1
//
// Pure, deterministic short-term chat/session context carryover helper.
//
// This module builds a bounded standaloneQuery for elliptical tax follow-ups
// (e.g. "How about fresh frozen seafood?" after "Is tobacco subject to VAT?")
// so a LATER patch can feed it to issue classification and retrieval. It is a
// PURE helper only: it performs no I/O, no network, no env reads, no logging of
// recent turns, no persistence, and no runtime wiring. It NEVER mutates inputs.
//
// It is NOT persistent memory: it operates only on bounded recent turns of the
// current active conversation/session supplied by the caller.
//
// Authority discipline: this helper only rewrites the query and returns decision
// metadata. It returns NO citations, NO legal conclusions, and NO tax answer,
// and it never claims source availability. The final answer still requires
// retrieval/source-backed authority downstream.

const DEFAULT_MAX_REWRITE_TURNS = 6;
const HARD_MAX_TURNS = 20;
const CONFIDENCE_THRESHOLD = 0.70;
const DEFAULT_JURISDICTION = "Philippines";

// ── Text normalization ─────────────────────────────────────────────────────────

export function normalizeText(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function stripTrailingPunctuation(text) {
  return String(text || "").replace(/[?.!]+\s*$/g, "").trim();
}

// ── Recent-turn normalization (tolerant, non-mutating) ──────────────────────────

function normalizeTurn(turn) {
  if (!turn || typeof turn !== "object") return null;
  const role = turn.role ?? turn.sender ?? turn.type ?? null;
  const content = turn.content ?? turn.message ?? turn.text ?? null;
  if (typeof content !== "string") return null;
  const text = normalizeText(content);
  if (!text) return null;
  return { role: role == null ? null : String(role), text };
}

/**
 * Returns a bounded, normalized copy of recentTurns (never mutates input).
 * Keeps the most recent turns up to min(maxRewriteTurns, HARD_MAX_TURNS),
 * preserving each turn's original index for traceability.
 */
export function boundRecentTurns(recentTurns, maxRewriteTurns = DEFAULT_MAX_REWRITE_TURNS) {
  if (!Array.isArray(recentTurns)) return [];
  const cap = Math.max(1, Math.min(Math.floor(Number(maxRewriteTurns) || DEFAULT_MAX_REWRITE_TURNS), HARD_MAX_TURNS));
  const normalized = [];
  for (let i = 0; i < recentTurns.length; i += 1) {
    const t = normalizeTurn(recentTurns[i]);
    if (t) normalized.push({ ...t, originalIndex: i });
  }
  // Keep the last `cap` normalized turns.
  return normalized.slice(Math.max(0, normalized.length - cap));
}

// ── Follow-up detection ─────────────────────────────────────────────────────────

const FOLLOWUP_PREFIXES = [
  /^how about\s+/i,
  /^what about\s+/i,
  /^same with\s+/i,
  /^and\s+/i,
  /^does that apply to\s+/i,
  /^what if it is\s+/i,
  /^what if it's\s+/i,
  /^what if its\s+/i,
  /^what if\s+/i
];

const RESET_PATTERNS = [
  /\bnew question\b/i,
  /\bdifferent topic\b/i,
  /\bseparate issue\b/i,
  /\bforget\b/i,
  /\bignore previous\b/i,
  /\bstart over\b/i
];

const JURISDICTION_SWITCH_PATTERNS = [
  /\bin the us\b/i,
  /\bin the u\.s\.?\b/i,
  /\bin the united states\b/i,
  /\bunder us tax\b/i,
  /\bin singapore\b/i,
  /\bin the uk\b/i
];

export function detectReset(currentQuery) {
  const q = normalizeText(currentQuery);
  return RESET_PATTERNS.some((re) => re.test(q));
}

export function detectJurisdictionSwitch(currentQuery) {
  const q = normalizeText(currentQuery);
  return JURISDICTION_SWITCH_PATTERNS.some((re) => re.test(q));
}

/**
 * Detects an elliptical follow-up and extracts its subject.
 * Returns { isFollowUp, subject }.
 */
export function detectFollowUp(currentQuery) {
  const q = normalizeText(currentQuery);
  for (const re of FOLLOWUP_PREFIXES) {
    if (re.test(q)) {
      const subject = stripTrailingPunctuation(q.replace(re, "")).trim();
      return { isFollowUp: subject.length > 0, subject };
    }
  }
  return { isFollowUp: false, subject: "" };
}

// ── Prior tax context extraction ────────────────────────────────────────────────

// Ordered most-specific-first so PEZA/NOLCO/MCIT win before generic VAT.
const TAX_FAMILIES = [
  { key: "NOLCO", label: "NOLCO", family: "NOLCO", signals: [/\bnolco\b/i, /net operating loss carry\s*-?over/i] },
  { key: "MCIT", label: "MCIT", family: "MCIT", signals: [/\bmcit\b/i, /minimum corporate income tax/i] },
  { key: "PEZA_ZERO_RATING", label: "PEZA zero-rating", family: "VAT", signals: [/\bpeza\b/i, /zero-?rated/i, /export sales/i] },
  { key: "EWT", label: "EWT", family: "WITHHOLDING", signals: [/\bewt\b/i, /expanded withholding/i, /\bcwt\b/i, /creditable withholding/i] },
  { key: "WITHHOLDING_TAX", label: "withholding tax", family: "WITHHOLDING", signals: [/withholding tax/i, /withholding on rent/i] },
  { key: "PERCENTAGE_TAX", label: "percentage tax", family: "PERCENTAGE", signals: [/percentage tax/i, /\b2551q\b/i] },
  { key: "INCOME_TAX", label: "income tax", family: "INCOME", signals: [/income tax/i, /\brcit\b/i, /regular corporate income tax/i] },
  { key: "VAT", label: "VAT", family: "VAT", signals: [/\bvat\b/i, /value-?added tax/i, /input vat/i, /output vat/i] }
];

const JURISDICTION_SIGNAL = /\bphilippines?\b|\bbir\b|\bnirc\b/i;

function matchTaxFamily(text) {
  for (const fam of TAX_FAMILIES) {
    if (fam.signals.some((re) => re.test(text))) return fam;
  }
  return null;
}

function distinctFamilies(text) {
  const families = new Set();
  for (const fam of TAX_FAMILIES) {
    if (fam.signals.some((re) => re.test(text))) families.add(fam.family);
  }
  return families;
}

/**
 * Scans bounded turns newest-first and returns the first recognized prior tax
 * issue. Returns { taxType, issueKey, jurisdiction, jurisdictionInferred,
 * ambiguous, sourceTurnIndexes } or null when no prior tax issue is found.
 */
export function extractPriorTaxContext(boundedTurns) {
  const turns = Array.isArray(boundedTurns) ? boundedTurns : [];
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const text = turns[i].text;
    const fam = matchTaxFamily(text);
    if (!fam) continue;
    const families = distinctFamilies(text);
    const ambiguous = families.size >= 2;
    const explicitJurisdiction = turns.some((t) => JURISDICTION_SIGNAL.test(t.text));
    return {
      taxType: fam.label,
      issueKey: fam.key,
      jurisdiction: DEFAULT_JURISDICTION,
      jurisdictionInferred: !explicitJurisdiction,
      ambiguous,
      sourceTurnIndexes: [turns[i].originalIndex]
    };
  }
  return null;
}

// ── Standalone query construction ───────────────────────────────────────────────

export function buildStandaloneQuery(subject, taxType) {
  const s = normalizeText(subject);
  switch (taxType) {
    case "VAT":
      return `Is ${s} subject to VAT in the Philippines?`;
    case "EWT":
      return `Is ${s} subject to expanded withholding tax (EWT) in the Philippines?`;
    case "withholding tax":
      return `Is ${s} subject to withholding tax in the Philippines?`;
    case "NOLCO":
      return `Can ${s} claim NOLCO in the Philippines?`;
    case "PEZA zero-rating":
      return `Are ${s} involving PEZA zero-rated for VAT in the Philippines?`;
    case "MCIT":
      return `Is MCIT applicable to ${s} in the Philippines?`;
    case "percentage tax":
      return `Is ${s} subject to percentage tax in the Philippines?`;
    case "income tax":
      return `Is ${s} subject to income tax in the Philippines?`;
    default:
      return `Is ${s} subject to ${taxType} in the Philippines?`;
  }
}

function clampConfidence(value) {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function buildFallbackClarification(subject) {
  const s = normalizeText(subject);
  if (!s) return "Could you clarify your Philippine tax question and the specific tax type (for example VAT)?";
  return `Could you clarify your question about ${s}? For example, are you asking whether ${s} is subject to VAT in the Philippines?`;
}

// ── Top-level carryover builder ─────────────────────────────────────────────────

function baseDecision(originalQuery, riskFlags, extra = {}) {
  return Object.freeze({
    applied: false,
    reason: "no_carryover",
    confidence: 0,
    originalQuery,
    standaloneQuery: originalQuery,
    inheritedIssueType: null,
    inheritedTaxType: null,
    inheritedJurisdiction: null,
    sourceTurnIndexes: [],
    riskFlags: Object.freeze(riskFlags.slice()),
    fallbackClarification: null,
    boundedTurnCount: 0,
    memoryBoundary: Object.freeze({ persistentMemoryUsed: false, durableWriteRequired: false }),
    ...extra
  });
}

/**
 * buildContextCarryoverDecision — see buildShortTermContextCarryover.
 * Kept as a named export for direct testing of the decision object shape.
 */
export function buildContextCarryoverDecision(input = {}) {
  return buildShortTermContextCarryover(input);
}

/**
 * Pure top-level helper. Returns a frozen contextCarryoverDecision object.
 * Never mutates inputs; performs no I/O.
 */
export function buildShortTermContextCarryover({
  currentQuery,
  recentTurns,
  activeConversationId = null, // eslint-disable-line no-unused-vars -- reserved for future wiring
  maxRewriteTurns = DEFAULT_MAX_REWRITE_TURNS,
  jurisdictionDefault = DEFAULT_JURISDICTION
} = {}) {
  const originalQuery = String(currentQuery == null ? "" : currentQuery);
  const riskFlags = ["memory_not_used"];

  const bounded = boundRecentTurns(recentTurns, maxRewriteTurns);
  if (bounded.length > 0) riskFlags.push("bounded_history_applied");
  else riskFlags.push("no_recent_turns");

  // 1. Explicit reset / new-question phrases block carryover.
  if (detectReset(originalQuery)) {
    riskFlags.push("explicit_reset_detected");
    return baseDecision(originalQuery, riskFlags, { reason: "explicit_reset_detected", boundedTurnCount: bounded.length });
  }

  // 2. Jurisdiction switch blocks carryover.
  if (detectJurisdictionSwitch(originalQuery)) {
    riskFlags.push("jurisdiction_switch_detected");
    return baseDecision(originalQuery, riskFlags, { reason: "jurisdiction_switch_detected", boundedTurnCount: bounded.length });
  }

  // 3. Must be an elliptical follow-up.
  const followUp = detectFollowUp(originalQuery);
  if (!followUp.isFollowUp) {
    const hasTaxSignal = matchTaxFamily(normalizeText(originalQuery)) !== null;
    riskFlags.push(hasTaxSignal ? "standalone_query_detected" : "non_tax_query_detected");
    return baseDecision(originalQuery, riskFlags, {
      reason: hasTaxSignal ? "standalone_query_detected" : "non_tax_query_detected",
      boundedTurnCount: bounded.length
    });
  }

  // 4. Need a prior tax issue from bounded recent turns.
  const prior = extractPriorTaxContext(bounded);
  if (!prior) {
    riskFlags.push("no_prior_tax_issue");
    return baseDecision(originalQuery, riskFlags, {
      reason: "no_prior_tax_issue",
      fallbackClarification: buildFallbackClarification(followUp.subject),
      boundedTurnCount: bounded.length
    });
  }

  if (prior.ambiguous) {
    riskFlags.push("ambiguous_prior_issue");
    return baseDecision(originalQuery, riskFlags, {
      reason: "ambiguous_prior_issue",
      inheritedTaxType: prior.taxType,
      inheritedIssueType: prior.issueKey,
      inheritedJurisdiction: prior.jurisdiction,
      sourceTurnIndexes: prior.sourceTurnIndexes,
      fallbackClarification: buildFallbackClarification(followUp.subject),
      boundedTurnCount: bounded.length
    });
  }

  const jurisdiction = prior.jurisdiction || jurisdictionDefault || DEFAULT_JURISDICTION;
  if (prior.jurisdictionInferred) riskFlags.push("jurisdiction_inferred");

  // 5. Deterministic confidence scoring.
  let confidence = 0;
  confidence += 0.35; // follow-up detected
  confidence += 0.35; // prior tax issue detected
  confidence += 0.10; // jurisdiction detected/defaulted
  confidence += followUp.subject ? 0.15 : 0; // current subject extracted
  if (prior.jurisdictionInferred) confidence -= 0.05;
  confidence = clampConfidence(confidence);

  if (confidence < CONFIDENCE_THRESHOLD) {
    riskFlags.push("low_confidence");
    return baseDecision(originalQuery, riskFlags, {
      reason: "low_confidence",
      confidence,
      inheritedTaxType: prior.taxType,
      inheritedIssueType: prior.issueKey,
      inheritedJurisdiction: jurisdiction,
      sourceTurnIndexes: prior.sourceTurnIndexes,
      fallbackClarification: buildFallbackClarification(followUp.subject),
      boundedTurnCount: bounded.length
    });
  }

  // 6. Apply rewrite.
  const standaloneQuery = buildStandaloneQuery(followUp.subject, prior.taxType);
  return Object.freeze({
    applied: true,
    reason: "context_carryover_applied",
    confidence,
    originalQuery,
    standaloneQuery,
    inheritedIssueType: prior.issueKey,
    inheritedTaxType: prior.taxType,
    inheritedJurisdiction: jurisdiction,
    sourceTurnIndexes: Object.freeze(prior.sourceTurnIndexes.slice()),
    riskFlags: Object.freeze(riskFlags.slice()),
    fallbackClarification: null,
    boundedTurnCount: bounded.length,
    memoryBoundary: Object.freeze({ persistentMemoryUsed: false, durableWriteRequired: false })
  });
}
