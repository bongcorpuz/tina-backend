// FILE: services/philippine-tax-domain-boundary.js
"use strict";

/**
 * Philippine Tax Domain Boundary
 * Version: 2.0.0 — FAIL-CLOSED
 *
 * Synchronous, pre-retrieval classifier. Determines whether a query is within
 * TINA's domain (Philippine taxation) BEFORE any retrieval, pipeline, or
 * OpenAI call.
 *
 * Exported API:
 *   detectPhilippineTaxBoundary(query, routeMode, context?)
 *   → { isPhilippineTax, decision, detectedDomain, reason, confidence }
 *   decision: "ALLOW" | "REJECT" | "CLARIFY"
 *
 * DESIGN: FAIL-CLOSED
 *   Default is REJECT.
 *   ALLOW is granted only when a Philippine-tax indicator is present.
 *   Ambiguous queries return CLARIFY (treated as REJECT at enforcement points).
 *
 *   Previous version (v1) used conservative-default ALLOW — that allowed
 *   "what is biology?" to reach retrieval and OpenAI. This version fixes that.
 */

import { isTaxRelated } from "../tax-keywords.js";
import {
  AUDIT_TAX_SIGNALS,
  BYPASS_HOOKS,
  CLARIFY_PATTERNS,
  NON_TAX_CONTEXT_PATTERNS,
  DOMINANT_NON_TAX_ROLE_VETO_PATTERNS,
  NON_TAX_FILE_OBJECT_PATTERNS,
  NON_TAX_OBJECT_VETO_PATTERNS,
  NON_TAX_REJECT_PATTERNS,
  PH_TAX_ALLOW_PATTERNS,
  STRONG_TAX_SIGNAL_PATTERNS,
  TAX_ADJACENCY_COSIGNAL_PATTERNS,
  TAX_COSIGNAL_PATTERNS,
  TAX_FILING_ADJACENT_PATTERNS
} from "./philippine-tax-boundary-patterns.js";

// ─── Rejection / Clarification Messages ──────────────────────────────────────

export const BOUNDARY_REJECTION_MESSAGE =
  "TINA is designed to answer questions about Philippine taxation. " +
  "Please ask a Philippine tax-related question, such as VAT, income tax, " +
  "withholding tax, BIR compliance, local tax, customs duties, or tax remedies.";

export const BOUNDARY_CLARIFY_MESSAGE =
  "TINA is designed to answer questions about Philippine taxation. " +
  "Could you clarify how your question relates to Philippine tax? " +
  "For example: VAT, income tax, withholding tax, BIR compliance, " +
  "local tax, customs duties, or tax remedies.";


// ─── Main classifier ──────────────────────────────────────────────────────────

/**
 * detectPhilippineTaxBoundary
 *
 * Synchronous, no-I/O domain classifier. FAIL-CLOSED by design:
 * queries without a Philippine-tax indicator are REJECTED by default.
 *
 * @param {string} query       — user query text (cleanQuestion preferred)
 * @param {string} routeMode   — resolved hook/route (e.g. "/ask", "/audit")
 * @param {object} [context]   — optional extra context (reserved for future use)
 * @returns {{
 *   isPhilippineTax: boolean,
 *   decision: "ALLOW"|"REJECT"|"CLARIFY",
 *   detectedDomain: string,
 *   reason: string,
 *   confidence: number
 * }}
 */
export function detectPhilippineTaxBoundary(query = "", routeMode = "/ask", context = {}) {
  const q = String(query || "").trim();
  const h = String(routeMode || "/ask").toLowerCase();

  // ── 1. Bypass hooks — meta/utility routes never blocked ──────────────────
  if (BYPASS_HOOKS.has(h)) {
    return { isPhilippineTax: true, decision: "ALLOW", detectedDomain: "UTILITY", reason: "bypass_hook", confidence: 1.0 };
  }

  // ── 2. Empty query — let downstream handle validation ────────────────────
  if (!q) {
    return { isPhilippineTax: false, decision: "ALLOW", detectedDomain: "UNKNOWN", reason: "empty_query", confidence: 0.0 };
  }

  // ── PHASE-10A14-R16 (P1-R15-IR-003) — SIGNAL STRENGTH ────────────────────
  // A bare allow-pattern or keyword hit is no longer sufficient proof of tax domain.
  // Independent probes allowed "private lease payment ... deadline" (the keyword "vat"
  // matched inside "pri-vat-e") and "court filing deadline ... holiday" (only the generic
  // words "filing" and "deadline"). A frozen 193-probe reproduction found 88 false allows.
  const hasStrongTaxSignal = STRONG_TAX_SIGNAL_PATTERNS.some((p) => p.test(q));
  const hasNonTaxContext = NON_TAX_CONTEXT_PATTERNS.some((p) => p.test(q));

  // ── PHASE-10A14-R19 (P1-R18-IR1-001/002) — DOMINANT NON-TAX ROLE VETO ────
  // Runs FIRST, before any cosignal-defeatable step. Never overridden by any tax
  // co-signal — the sentence's true subject (a variable, a device, a hobby, a body of
  // knowledge) is orthogonal to whichever tax-shaped token happens to be nearby. See
  // CONTEXT_QUALIFIED_DECISION_SPEC.md for the full family taxonomy.
  const hasDominantNonTaxRole = DOMINANT_NON_TAX_ROLE_VETO_PATTERNS.some((p) => p.test(q));
  if (hasDominantNonTaxRole) {
    return { isPhilippineTax: false, decision: "REJECT", detectedDomain: "NON_TAX", reason: "non_tax_object_role_veto", confidence: 0.95 };
  }

  // ── PHASE-10A14-R18 (P1-R17-IR1-002) — NON-TAX OBJECT VETO ───────────────
  // The R17 rule was that a strong signal is NEVER vetoed by a non-tax object. That is
  // correct for an unambiguous anchor ("withholding tax on the private lease payment"),
  // but wrong for a tax HOMOGRAPH. The independent campaign allowed "What is the taxable
  // font in a CSS file?", "Is the BOC a band of chords?" and "How do I close a VAT color
  // palette?" — all reason strong_tax_signal.
  //
  // A query that names an explicitly non-tax OBJECT (a font, a colour, a chord, a cooling
  // fan) is out of domain unless a tax CO-SIGNAL confirms the tax reading. Co-signals are
  // phrases and unambiguous anchors, never bare homographs, so "VAT" cannot rescue "VAT
  // color palette" while "subject to VAT" still rescues "Is software subject to VAT?".
  //
  // This is category-based, not exact-question. No tax term is removed or made to fail
  // generally: "Is the gain taxable?" names no non-tax object and still allows.
  const hasNonTaxObject = NON_TAX_OBJECT_VETO_PATTERNS.some((p) => p.test(q));
  const hasTaxCoSignal = TAX_COSIGNAL_PATTERNS.some((p) => p.test(q));
  if (hasNonTaxObject && !hasTaxCoSignal) {
    return { isPhilippineTax: false, decision: "REJECT", detectedDomain: "NON_TAX", reason: "non_tax_object_veto", confidence: 0.93 };
  }

  // ── 3. STRONG Philippine-tax signal → ALLOW ──────────────────────────────
  // An explicit tax anchor controls. It is not vetoed by a non-tax object that merely
  // co-occurs with a confirmed tax reading — only by the homograph case handled above.
  if (hasStrongTaxSignal) {
    return { isPhilippineTax: true, decision: "ALLOW", detectedDomain: "PHILIPPINE_TAX", reason: "strong_tax_signal", confidence: 0.98 };
  }

  // ── 3b. TAX-FILING ADJACENCY (R15 closure, preserved) ────────────────────
  // Filing/return/authority/notice questions with no explicit tax keyword remain in
  // domain — this is the accepted P1-R14-IR-002 closure. It is vetoed by an explicit
  // non-tax file object or non-tax context, so "court filing deadline" cannot enter here.
  const hasNonTaxFileObject = NON_TAX_FILE_OBJECT_PATTERNS.some((p) => p.test(q));
  // A co-signal is required: adjacency alone would admit bare ambiguous frames such as
  // "What is the filing deadline?" or "When is the return due?", which must clarify.
  const hasAdjacencyCoSignal = TAX_ADJACENCY_COSIGNAL_PATTERNS.some((p) => p.test(q));
  if (!hasNonTaxFileObject && !hasNonTaxContext && hasAdjacencyCoSignal) {
    for (const pattern of TAX_FILING_ADJACENT_PATTERNS) {
      if (pattern.test(q)) {
        return { isPhilippineTax: true, decision: "ALLOW", detectedDomain: "PHILIPPINE_TAX_FILING_ADJACENT", reason: "tax_filing_adjacency", confidence: 0.80 };
      }
    }
  }

  // ── 4. WEAK-ONLY signal → never an automatic ALLOW ───────────────────────
  // The query matched a tax allowlist pattern or the keyword catch-all, but carries no
  // strong anchor. Explicit non-tax evidence rejects; otherwise invite clarification.
  const weakSignalMatched = PH_TAX_ALLOW_PATTERNS.some((p) => p.test(q)) || isTaxRelated(q);
  if (weakSignalMatched) {
    if (hasNonTaxContext || hasNonTaxFileObject) {
      return { isPhilippineTax: false, decision: "REJECT", detectedDomain: "NON_TAX", reason: "weak_signal_with_non_tax_context", confidence: 0.90 };
    }
    return { isPhilippineTax: false, decision: "CLARIFY", detectedDomain: "AMBIGUOUS_TAX_ADJACENT", reason: "weak_tax_signal_needs_context", confidence: 0.55 };
  }


  // ───────────────────────────────────────────────────────────────────────────
  // Below this line: no Philippine-tax signal was detected.
  // All paths lead to REJECT or CLARIFY — NEVER ALLOW.
  // ───────────────────────────────────────────────────────────────────────────

  // ── 5. Hook-specific strict rejection ────────────────────────────────────

  // /quiz and /review are Philippine-tax-practice-only modes.
  if (h === "/quiz" || h === "/review") {
    return { isPhilippineTax: false, decision: "REJECT", detectedDomain: "NON_TAX", reason: "quiz_review_requires_tax_topic", confidence: 0.95 };
  }

  // /audit is BIR-tax-controversy only.
  if (h === "/audit") {
    const hasAuditTaxSignal = AUDIT_TAX_SIGNALS.some(p => p.test(q));
    if (!hasAuditTaxSignal) {
      return { isPhilippineTax: false, decision: "REJECT", detectedDomain: "NON_TAX", reason: "audit_mode_no_tax_signal", confidence: 0.92 };
    }
  }

  // ── 6. Clearly non-tax domain patterns ───────────────────────────────────
  // Explicit domain detection — REJECT with reason "clearly_non_tax_domain".
  for (const { pattern, domain } of NON_TAX_REJECT_PATTERNS) {
    if (pattern.test(q)) {
      return { isPhilippineTax: false, decision: "REJECT", detectedDomain: domain, reason: "clearly_non_tax_domain", confidence: 0.95 };
    }
  }

  // ── 7. Ambiguous but possibly tax-adjacent queries ────────────────────────
  // These lack a confirmed PH-tax signal but are common enough in tax practice
  // that CLARIFY (invite rephrasing) is preferable to a hard REJECT.
  // Examples: gross receipts, professional fees, penalties, leases, registration.
  for (const { pattern, domain } of CLARIFY_PATTERNS) {
    if (pattern.test(q)) {
      return { isPhilippineTax: false, decision: "CLARIFY", detectedDomain: domain, reason: "tax_adjacent_needs_context", confidence: 0.55 };
    }
  }

  // ── 8. FAIL-CLOSED DEFAULT ────────────────────────────────────────────────
  // No Philippine-tax signal, no known non-tax domain, no tax-adjacent hint.
  // REJECT — not CLARIFY. Gibberish and truly unrelated queries must not be
  // invited to rephrase; they are simply outside TINA's domain.
  return {
    isPhilippineTax: false,
    decision:        "REJECT",
    detectedDomain:  "UNCLASSIFIED",
    reason:          "fail_closed_no_tax_signal",
    confidence:      0.60,
  };
}

// ─── Backward-compat alias (v1 callers) ──────────────────────────────────────
// Remove once all callers use detectPhilippineTaxBoundary.
export const checkPhilippineTaxBoundary = detectPhilippineTaxBoundary;
