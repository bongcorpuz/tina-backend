// FILE: services/tax-computation-clarification.js
// PHASE-10A14-R15 (P2-R14-IR-008) — focused professional clarification.
//
// LC5 ("How much tax do I owe?") received a no-indexed-authority fallback. That answer is
// wrong for this question class: the obstacle is not missing authority, it is missing
// FACTS. No authority can compute a liability without the taxpayer's own figures, so
// retrieval can never resolve it and rejecting on authority grounds misdescribes why.
//
// This helper detects a liability-computation request that lacks the decisive facts and
// returns a bounded clarification (WS7): acknowledge the objective, state what cannot yet
// be determined, ask only the minimum decisive questions, invent nothing, and never
// present a number.
"use strict";

/** Liability-computation intent: "how much tax do I owe / need to pay / is due". */
const COMPUTE_INTENT_RE = /\b(?:how much|magkano|how many pesos|what(?:'s| is) my)\b[^.\n]{0,60}\b(?:tax|taxes|vat|withholding|percentage tax|donor'?s tax|estate tax|capital gains|duty|duties|penalt\w*|surcharge|liability|payable)\b/i;
const OWE_RE = /\b(?:owe|owed|owing|pay|payable|due|liable|remit|settle|babayaran|utang)\b/i;

/** Decisive facts that, if present, mean the question is no longer under-specified. */
const HAS_AMOUNT_RE = /\b(?:php|p|₱)\s?[\d,]{3,}|\b\d[\d,]{2,}(?:\.\d+)?\b|\b\d+\s?(?:k|m|million|thousand)\b/i;
const HAS_PERIOD_RE = /\b(?:19|20)\d{2}\b|\b(?:q[1-4]|first|second|third|fourth)\s+quarter\b|\btaxable year\b|\bfiscal year\b/i;
const HAS_TAXPAYER_TYPE_RE = /\b(?:self-?employed|freelanc\w+|sole proprietor|professional|corporation|corporate|partnership|employee|compensation earner|mixed[- ]income|estate|donor|non-?resident|resident citizen|ofw|vat-?registered|non-?vat)\b/i;

/**
 * @returns {{applies:boolean, reason:string, missing:string[]}}
 */
export function detectTaxComputationClarification(query = "") {
  const q = String(query || "").trim();
  if (!q) return { applies: false, reason: "empty_query", missing: [] };
  if (!COMPUTE_INTENT_RE.test(q) || !OWE_RE.test(q)) {
    return { applies: false, reason: "not_a_liability_computation_request", missing: [] };
  }
  const missing = [];
  if (!HAS_TAXPAYER_TYPE_RE.test(q)) missing.push("taxpayer type");
  if (!HAS_PERIOD_RE.test(q)) missing.push("taxable period");
  if (!HAS_AMOUNT_RE.test(q)) missing.push("amounts");
  // If the user already supplied the decisive facts, do NOT intercept — the ordinary
  // pipeline should attempt the analysis.
  if (missing.length < 2) {
    return { applies: false, reason: "sufficient_facts_present", missing };
  }
  return { applies: true, reason: "liability_computation_missing_decisive_facts", missing };
}

/**
 * Bounded clarification body. At most four questions, no invented facts, no computed
 * figure, and no claim that authority is missing.
 */
export function buildTaxComputationClarification(query = "") {
  const answer = [
    "### Short Answer",
    "TINA cannot compute your tax liability yet, because the amount depends on facts that are specific to you rather than on any single provision of law.",
    "",
    "### What TINA needs to answer this accurately",
    "1. **Taxpayer type** — are you an employee, self-employed or a professional, a sole proprietor, a partnership, or a corporation?",
    "2. **Tax type or transaction** — is this income tax, VAT or percentage tax, withholding tax, or a specific transaction such as a sale, donation or estate?",
    "3. **Taxable period** — which taxable year or quarter does this cover?",
    "4. **Amounts** — the gross income or transaction amount, together with any deductions, exemptions, and taxes already withheld or paid.",
    "",
    "### Why TINA is asking",
    "A tax liability is computed from your own figures and circumstances. Providing a number without these facts would be a guess, and TINA does not guess about a legal obligation. Once you supply the details above, TINA can identify the governing authority and set out how the amount is determined."
  ].join("\n");

  return {
    handled: true,
    responseKind: "FOCUSED_CLARIFICATION",
    clarificationReason: "liability_computation_missing_decisive_facts",
    answer
  };
}

export default { detectTaxComputationClarification, buildTaxComputationClarification };
