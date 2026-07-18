// PHASE-10A14-R7: exact-date Section 51(C)(2) effectivity + date-only legal utility.
//
// P1-R6-IR-001: RA 12214 (CMEPA) must be applied by EXACT legal date, not by year, so
// pre-effectivity 2025 transactions (2025-01-15, 2025-06-01) do NOT apply RA 12214.
// Official (lawphil ra_12214_2025): approved 2025-05-29; Section 29 general effectivity
// = 15 days after publication (exact day officially unresolved); Section 28 July 1 2025
// is a financial-instrument RATE transitory (not 51(C)(2)'s cutover).

import assert from "node:assert/strict";
import {
  parseLegalDate, isValidLegalDate, compareLegalDates,
  isBeforeEffectivity, isOnOrAfterEffectivity, addLegalCalendarDays
} from "../legal-date-utils.js";
import { resolveSection51AuthorityChain } from "../section51-authority-chain.js";

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}`); console.error(e?.stack || e); }
}
const txn = (d) => resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", transactionDate: d });

// ── B. date utility ───────────────────────────────────────────────────────
await test("parse rejects invalid calendar dates", () => {
  assert.equal(parseLegalDate("2025-02-30"), null);
  assert.equal(parseLegalDate("2025-13-01"), null);
  assert.equal(parseLegalDate("2025-00-10"), null);
  assert.equal(parseLegalDate("2025-6-1"), null);      // not zero-padded ISO
  assert.equal(isValidLegalDate("2024-02-29"), true);  // leap
  assert.equal(isValidLegalDate("2025-02-29"), false); // non-leap
});
await test("compareLegalDates full year-month-day, no year-only collapse", () => {
  assert.equal(compareLegalDates("2025-01-15", "2025-08-05"), -1);
  assert.equal(compareLegalDates("2025-08-05", "2025-01-15"), 1);
  assert.equal(compareLegalDates("2025-06-13", "2025-06-13"), 0);
});
await test("before/on-or-after effectivity boundary (exclusive/inclusive)", () => {
  assert.equal(isBeforeEffectivity("2025-06-12", "2025-06-13"), true);
  assert.equal(isBeforeEffectivity("2025-06-13", "2025-06-13"), false);
  assert.equal(isOnOrAfterEffectivity("2025-06-13", "2025-06-13"), true);
  assert.equal(isOnOrAfterEffectivity("2025-06-12", "2025-06-13"), false);
});
await test("addLegalCalendarDays crosses month/year/leap boundaries", () => {
  assert.equal(addLegalCalendarDays("2025-05-29", 15), "2025-06-13");
  assert.equal(addLegalCalendarDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addLegalCalendarDays("2025-12-31", 1), "2026-01-01");
});

// ── C. Section 51(C)(2) exact-date applicability (P1-R6-IR-001 core) ───────
await test("2025-01-15 transaction -> PRE_EFFECTIVITY, RA 12214 NOT applicable", () => {
  const r = txn("2025-01-15");
  assert.equal(r.temporalStatus, "PRE_EFFECTIVITY");
  assert.deepEqual(r.applicableAmendments, []);
  assert.ok(!r.currentAuthoritySet.includes("RA 12214"));
});
await test("2025-06-01 transaction -> PRE_EFFECTIVITY, RA 12214 NOT applicable (was the defect)", () => {
  const r = txn("2025-06-01");
  assert.equal(r.temporalStatus, "PRE_EFFECTIVITY");
  assert.deepEqual(r.applicableAmendments, []);
});
await test("effectivity-earliest minus one day -> PRE_EFFECTIVITY", () => {
  assert.equal(txn("2025-06-12").temporalStatus, "PRE_EFFECTIVITY");
});
await test("ambiguous window [earliest, established) -> fail closed (unresolved)", () => {
  for (const d of ["2025-06-13", "2025-07-01", "2025-07-15", "2025-08-04"]) {
    const r = txn(d);
    assert.equal(r.sufficient, false, `${d} must fail closed`);
    assert.equal(r.reason, "section_51c2_effectivity_date_unresolved");
    assert.deepEqual(r.applicableAmendments, [], `${d} must not apply RA 12214`);
  }
});
await test("post-established -> RA 12214 applicable", () => {
  const r = txn("2025-08-05");
  assert.equal(r.temporalStatus, "POST_EFFECTIVITY");
  assert.ok(r.applicableAmendments.includes("RA 12214"));
  assert.ok(r.currentAuthoritySet.includes("RA 12214"));
});
await test("2024 transaction -> PRE_EFFECTIVITY; 2026 -> POST_EFFECTIVITY applicable", () => {
  assert.equal(resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", taxableYear: 2024 }).temporalStatus, "PRE_EFFECTIVITY");
  assert.ok(resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", taxableYear: 2026 }).applicableAmendments.includes("RA 12214"));
});
await test("2025 with no exact date -> transaction date required (fail closed)", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", taxableYear: 2025 });
  assert.equal(r.sufficient, false);
  assert.equal(r.reason, "section_51c2_transaction_date_required");
});
await test("July 1 is a financial-instrument transitory, NOT auto-applied as 51(C)(2) effectivity", () => {
  // 2025-07-01 must NOT verify RA 12214 as applicable (it is in the ambiguous window).
  const r = txn("2025-07-01");
  assert.deepEqual(r.applicableAmendments, []);
  assert.equal(r.effectivity.transitoryFinancialInstruments, "2025-07-01");
});

// ── F. prior closures preserved ───────────────────────────────────────────
await test("Section 51-A originatingLaw remains RA 10963 (R6 closure)", () => {
  assert.equal(resolveSection51AuthorityChain({ propositionClass: "substituted_filing" }).originatingLaw, "RA 10963");
});
await test("2023 ordinary obligation stays HISTORICAL, RA 11976/12214 not applied (R6 closure)", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_obligation", taxableYear: 2023 });
  assert.equal(r.chainStatus, "HISTORICAL_COMPLETE_CHAIN");
  assert.ok(!r.amendingAuthorities.includes("RA 11976"));
});

console.log(`\nphase-10a14-r7: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
