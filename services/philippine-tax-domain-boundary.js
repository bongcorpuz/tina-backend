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
  NON_TAX_REJECT_PATTERNS,
  PH_TAX_ALLOW_PATTERNS
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

  // ── 3. Philippine-tax allowlist (ALLOW path) ─────────────────────────────
  // Check allow patterns first — any match → ALLOW immediately.
  for (const pattern of PH_TAX_ALLOW_PATTERNS) {
    if (pattern.test(q)) {
      return { isPhilippineTax: true, decision: "ALLOW", detectedDomain: "PHILIPPINE_TAX", reason: "ph_tax_pattern_match", confidence: 0.98 };
    }
  }

  // ── 4. isTaxRelated keyword check (broader catch-all) ────────────────────
  if (isTaxRelated(q)) {
    return { isPhilippineTax: true, decision: "ALLOW", detectedDomain: "TAX_KEYWORD", reason: "tax_keyword_match", confidence: 0.85 };
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
