// FILE: legal-date-utils.js
// PHASE-10A14-R7: deterministic date-only legal comparison utility.
//
// Compares complete YYYY-MM-DD values WITHOUT any timezone/UTC/local shifting or
// locale parsing. `new Date("YYYY-MM-DD")` is deliberately NOT used for comparison
// (it parses as UTC midnight and can shift the calendar day in local contexts).
// Year-only comparison is deliberately NOT provided — the whole point (P1-R6-IR-001)
// is that year granularity collapses pre- and post-effectivity events in the same year.

"use strict";

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Parse a strict ISO calendar date to {y,m,d} or null (rejects invalid calendar dates). */
export function parseLegalDate(value) {
  const s = typeof value === "string" ? value.trim() : "";
  const m = ISO_DATE_RE.exec(s);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12) return null;
  const maxD = mo === 2 && isLeap(y) ? 29 : DAYS_IN_MONTH[mo - 1];
  if (d < 1 || d > maxD) return null;
  return { y, m: mo, d };
}

export function isValidLegalDate(value) { return parseLegalDate(value) !== null; }

/** Canonical YYYY-MM-DD from a strictly valid ISO calendar date, else null. */
export function toCanonicalLegalDate(value) {
  const p = parseLegalDate(value);
  return p ? `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}` : null;
}

/**
 * PHASE-10A14-R8 (P1-R7-IR-002): strict material-date gate for legal adjudication.
 * Returns a canonical YYYY-MM-DD ONLY for a strictly valid, whole-string ISO calendar
 * date. Everything else — `new Date()`-parsable strings, slash-separated dates, free
 * text ("June 20, 2025"), impossible calendar dates (2026-02-30), blank/null/undefined,
 * non-strings — returns null and must fail closed. NO fallback parsing of any kind.
 */
export function strictMaterialDate(value) {
  if (typeof value !== "string") return null;
  return toCanonicalLegalDate(value);
}

/** compareLegalDates(a,b): -1 if a<b, 0 if equal, 1 if a>b, null if either invalid. */
export function compareLegalDates(a, b) {
  const pa = parseLegalDate(a), pb = parseLegalDate(b);
  if (!pa || !pb) return null;
  if (pa.y !== pb.y) return pa.y < pb.y ? -1 : 1;
  if (pa.m !== pb.m) return pa.m < pb.m ? -1 : 1;
  if (pa.d !== pb.d) return pa.d < pb.d ? -1 : 1;
  return 0;
}

/** event strictly before effectivity (exclusive). Returns null if either invalid. */
export function isBeforeEffectivity(eventDate, effectivityDate) {
  const c = compareLegalDates(eventDate, effectivityDate);
  return c === null ? null : c < 0;
}

/** event on or after effectivity (inclusive effectivity). Returns null if either invalid. */
export function isOnOrAfterEffectivity(eventDate, effectivityDate) {
  const c = compareLegalDates(eventDate, effectivityDate);
  return c === null ? null : c >= 0;
}

/** Add N calendar days to an ISO date (pure arithmetic; no Date object). */
export function addLegalCalendarDays(value, days) {
  const p = parseLegalDate(value);
  if (!p || !Number.isInteger(days)) return null;
  let { y, m, d } = p;
  d += days;
  while (true) {
    const dim = m === 2 && isLeap(y) ? 29 : DAYS_IN_MONTH[m - 1];
    if (d > dim) { d -= dim; m += 1; if (m > 12) { m = 1; y += 1; } }
    else if (d < 1) { m -= 1; if (m < 1) { m = 12; y -= 1; } const pdim = m === 2 && isLeap(y) ? 29 : DAYS_IN_MONTH[m - 1]; d += pdim; }
    else break;
  }
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Extract a YYYY-MM-DD substring from free text (for probe/event-date resolution). */
export function extractIsoDate(text = "") {
  const m = String(text || "").match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (!m) return null;
  return isValidLegalDate(m[0]) ? m[0] : null;
}

export default {
  parseLegalDate, isValidLegalDate, toCanonicalLegalDate, strictMaterialDate, compareLegalDates,
  isBeforeEffectivity, isOnOrAfterEffectivity, addLegalCalendarDays, extractIsoDate
};
