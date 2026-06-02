// FILE: legal-citation-range-utils.js
"use strict";

/**
 * TINA Legal Citation Range Utilities
 * Version: 1.0.0
 *
 * Bounded expansion of NIRC / Tax Code citation ranges and lists.
 * Returns individual section references compatible with TINA source matching.
 *
 * Scope:
 * - NIRC / Tax Code section ranges and comma/and lists ONLY
 * - Requires explicit NIRC / Tax Code context in every pattern
 * - RR / RMC / RMO numbers are never treated as NIRC section ranges
 * - Subsection letter ranges (Sec. 34(A)-34(K)) are deferred / not supported
 * - Ranges exceeding maxRange are silently skipped
 */

const MAX_RANGE = 30;     // maximum section span for range expansion
const MAX_EXPANDED = 50;  // hard cap on total sections returned per call

// ── Section number expression (EXPR) ─────────────────────────────────────────
// Matches a sequence of section numbers in any of these forms:
//   "105"                          single
//   "105 to 108" / "84-97"        range
//   "57 and 58"                    pair
//   "105, 106, 107 and 108"        comma+and list
//
// Does NOT include subsection letter suffixes like (A), (B) — those are deferred.
const _EXPR = String.raw`\d+(?:\s*[-–]\s*\d+|\s+to\s+\d+|\s*,\s*(?:and\s+)?\d+|\s+and\s+\d+)*`;

// NIRC / Tax Code qualifier — handles raw text and normalizeLooseText output
const _CODE = String.raw`(?:nirc|tax\s+code|national\s+internal\s+revenue\s+code)`;

// ── Compiled pattern objects ──────────────────────────────────────────────────
// Each pattern has capturing group 1 = the section expression.
// All patterns require explicit NIRC/Tax Code context — no bare section numbers.
const _PATTERNS = Object.freeze([
  // A: Code-prefixed with "secs." — "NIRC Secs. 105 to 108", "NIRC Secs. 84-97"
  new RegExp(String.raw`\b${_CODE}\s+secs?\.?\s+(${_EXPR})`, "gi"),

  // B: Code-prefixed with "sections" — "NIRC Sections 105 to 108"
  new RegExp(String.raw`\b${_CODE}\s+sections?\s+(${_EXPR})`, "gi"),

  // C: Suffix — "Sections 105 to 108 of the NIRC", "Section 105 of the Tax Code"
  new RegExp(String.raw`\bsections?\s+(${_EXPR})\s+of\s+(?:the\s+)?${_CODE}\b`, "gi"),

  // D: Inverted — "Secs. 84-97, NIRC", "Secs. 57 and 58, Tax Code"
  new RegExp(String.raw`\bsecs?\.?\s+(${_EXPR})\s*,\s*${_CODE}\b`, "gi")
]);

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Parse a captured section expression into individual section numbers.
 * Input is already extracted by a _PATTERNS match and contains only
 * digits, spaces, commas, hyphens, "to", "and".
 */
function _parseSectionExpr(expr, maxRange) {
  const text = String(expr || "").trim();
  if (!text || !/^\d/.test(text)) return [];

  // Pure two-number range: "105 to 108" or "84-97" or "84 – 97"
  const rangeM = text.match(/^(\d+)\s*(?:[-–]|to)\s*(\d+)$/i);
  if (rangeM) {
    const lo = parseInt(rangeM[1], 10);
    const hi = parseInt(rangeM[2], 10);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi || (hi - lo + 1) > maxRange) return [];
    const arr = [];
    for (let i = lo; i <= hi; i++) arr.push(i);
    return arr;
  }

  // List/single: split on commas and "and"
  // Handles "105, 106, 107 and 108", "57 and 58", and bare "57"
  const parts = text.split(/\s*,\s*(?:and\s+)?|\s+and\s+/i);
  const nums = [];
  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;
    // Sub-range inside a list element (defensive; unusual after EXPR capture)
    const subRange = p.match(/^(\d+)\s*(?:[-–]|to)\s*(\d+)$/i);
    if (subRange) {
      const lo = parseInt(subRange[1], 10);
      const hi = parseInt(subRange[2], 10);
      if (Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi && (hi - lo) <= maxRange) {
        for (let i = lo; i <= hi; i++) nums.push(i);
      }
    } else {
      const n = parseInt(p, 10);
      if (!isNaN(n) && n > 0) nums.push(n);
    }
    if (nums.length >= MAX_EXPANDED) break;
  }
  return nums.slice(0, MAX_EXPANDED);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * expandLegalCitationMentions
 *
 * Extracts all individual NIRC section references from a text that contains
 * citation ranges or lists.  Every match requires an explicit NIRC / Tax Code
 * context word — bare section numbers are never expanded.
 *
 * @param {string} text - Answer text or source reference (raw or normalizeLooseText)
 * @param {{ maxRange?: number }} [options]
 * @returns {string[]}  Normalized refs, e.g. ["NIRC Sec. 105", "NIRC Sec. 106"]
 *
 * Examples:
 *   "Sections 105 to 108 of the NIRC"     → ["NIRC Sec. 105", ..., "NIRC Sec. 108"]
 *   "NIRC Secs. 84-97"                    → ["NIRC Sec. 84", ..., "NIRC Sec. 97"]
 *   "Secs. 84-97, NIRC"                   → ["NIRC Sec. 84", ..., "NIRC Sec. 97"]
 *   "NIRC Secs. 57 and 58"               → ["NIRC Sec. 57", "NIRC Sec. 58"]
 *   "NIRC Secs. 105, 106, 107 and 108"   → ["NIRC Sec. 105", ..., "NIRC Sec. 108"]
 *   "Sections 1 to 300 of the NIRC"      → [] (range > maxRange, not expanded)
 *   "RR 11-2018"                          → [] (no NIRC context + Secs. prefix)
 */
export function expandLegalCitationMentions(text = "", options = {}) {
  const { maxRange = MAX_RANGE } = options;
  const t = String(text || "");
  if (!t) return [];

  const result = new Set();

  for (const pattern of _PATTERNS) {
    pattern.lastIndex = 0;
    for (const m of t.matchAll(pattern)) {
      const expr = (m[1] || "").trim();
      if (!expr) continue;
      const nums = _parseSectionExpr(expr, maxRange);
      for (const n of nums) result.add(`NIRC Sec. ${n}`);
    }
  }

  return [...result];
}

/**
 * expandLegalCitationMentionsToKeys
 *
 * Same as expandLegalCitationMentions but returns canonical source keys
 * (format: "nircscNNN") for O(1) set lookups in source-visibility-engine.
 *
 * @param {string} text
 * @param {{ maxRange?: number }} [options]
 * @returns {string[]}  e.g. ["nircsc105", "nircsc106", "nircsc107", "nircsc108"]
 */
export function expandLegalCitationMentionsToKeys(text = "", options = {}) {
  return expandLegalCitationMentions(text, options).map(ref => {
    const m = ref.match(/\bsec\.?\s+(\d+)\b/i);
    return m ? `nircsc${m[1]}` : null;
  }).filter(Boolean);
}

export default { expandLegalCitationMentions, expandLegalCitationMentionsToKeys };
