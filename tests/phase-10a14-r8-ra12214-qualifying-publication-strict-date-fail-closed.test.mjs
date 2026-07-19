// PHASE-10A14-R8: RA 12214 qualifying-publication effectivity + strict Section 51(C)(2)
// transaction-date contract + fail-closed temporal metadata.
//
// Closes the four P1 findings from the R7 independent review:
//   P1-R7-IR-001  qualifying publication (Manila Bulletin 2025-06-04) establishes
//                 effectivity 2025-06-19 (publication + 15 days, Section 29 disjunctive).
//   P1-R7-IR-002  malformed transaction dates must fail closed (no new Date()/slash/free-text).
//   P1-R7-IR-003  taxableYear / legalAsOfDate / filingEventDate must NOT substitute for a
//                 required transactionDate on a Section 51(C)(2) proposition.
//   P1-R7-IR-004  failed / pre-effectivity adjudication must never expose RA 12214 as
//                 applicable or controlling (clean fail-closed metadata).
//
// Legal basis (independently verified — primary sources):
//   RA 12214 approved 2025-05-29 (lawphil ra_12214_2025 / signed copy bir-cdn).
//   Section 29 (verbatim, lawphil): "This Act shall take effect after fifteen (15) days
//   following the completion of its publication in the Official Gazette or in at least one
//   (1) newspaper of general circulation." Disjunctive -> a single newspaper of general
//   circulation suffices. Qualifying publication: Manila Bulletin 2025-06-04 (OG 2025-06-09).
//   Effectivity = 2025-06-04 + 15 = 2025-06-19 (inclusive). Section 28 "July 1, 2025" is a
//   financial-instrument RATE transitory only, NOT the general effectivity / 51(C)(2) cutover.

import assert from "node:assert/strict";
import {
  parseLegalDate, isValidLegalDate, strictMaterialDate, toCanonicalLegalDate,
  compareLegalDates, addLegalCalendarDays
} from "../legal-date-utils.js";
import {
  resolveSection51AuthorityChain, buildSection51AmendmentChainMetadata,
  SECTION51_OFFICIAL_LAWS
} from "../section51-authority-chain.js";

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}`); console.error(e?.stack || e); }
}
const EFF = "2025-06-19";
const txn = (d) => resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", transactionDate: d });
const disp = (d) => resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", dispositionDate: d });

// ── A. official publication & effectivity metadata (P1-R7-IR-001) ──────────
await test("A1: RA 12214 official effectivity is 2025-06-19 (publication + 15 days)", () => {
  assert.equal(SECTION51_OFFICIAL_LAWS["RA 12214"].effectivity, EFF);
  assert.equal(SECTION51_OFFICIAL_LAWS["RA 12214"].approved, "2025-05-29");
});
await test("A2: resolver surfaces qualifying-publication + transitory metadata", () => {
  const m = txn("2025-07-01").effectivity;
  assert.equal(m.approval, "2025-05-29");
  assert.equal(m.qualifyingPublication, "2025-06-04");
  assert.equal(m.officialGazettePublication, "2025-06-09");
  assert.equal(m.effectivity, EFF);
  assert.equal(m.transitoryFinancialInstruments, "2025-07-01"); // Section 28 (distinct)
});

// ── B. exact fifteen-day counting (P1-R7-IR-001) ───────────────────────────
await test("B1: publication 2025-06-04 + 15 days = 2025-06-19", () => {
  assert.equal(addLegalCalendarDays("2025-06-04", 15), EFF);
});
await test("B2: firm-lower-bound approval + 15 days = 2025-06-13 (< effectivity)", () => {
  assert.equal(addLegalCalendarDays("2025-05-29", 15), "2025-06-13");
  assert.equal(compareLegalDates("2025-06-13", EFF), -1);
});

// ── C. strict date-only parsing (P1-R7-IR-002) ─────────────────────────────
await test("C1: strictMaterialDate accepts only strict ISO calendar dates", () => {
  assert.equal(strictMaterialDate("2025-06-19"), "2025-06-19");
  assert.equal(toCanonicalLegalDate("2024-02-29"), "2024-02-29"); // leap ok
  assert.equal(isValidLegalDate("2024-02-29"), true);
});
await test("C2: strictMaterialDate rejects slash / free-text / non-string", () => {
  for (const v of ["2025/06/20", "June 20, 2025", "20-06-2025", "2025-6-1", 20250619, new Date("2025-06-19"), {}]) {
    assert.equal(strictMaterialDate(v), null, `${String(v)} must be rejected`);
  }
});

// ── D. malformed-date rejection -> fail closed (P1-R7-IR-002) ──────────────
await test("D1: every malformed/impossible material date fails closed (INVALID_DATE)", () => {
  for (const d of ["2025-02-29", "2026-02-30", "2025-13-01", "2025-00-10", "2025/06/20", "June 20, 2025", "not-a-date"]) {
    const r = txn(d);
    assert.equal(r.sufficient, false, `${d} must fail closed`);
    assert.equal(r.temporalStatus, "INVALID_DATE", `${d} -> INVALID_DATE`);
    assert.equal(r.reason, "section_51c2_transaction_date_invalid");
    assert.deepEqual(r.applicableAmendments, [], `${d} must not apply RA 12214`);
    assert.ok(!r.currentAuthoritySet.includes("RA 12214"), `${d} must not control via RA 12214`);
  }
});
await test("D2: blank / null / undefined -> PERIOD_UNRESOLVED fail closed", () => {
  for (const d of ["", null, undefined]) {
    const r = txn(d);
    assert.equal(r.sufficient, false);
    assert.equal(r.temporalStatus, "PERIOD_UNRESOLVED");
    assert.equal(r.reason, "section_51c2_transaction_date_required");
    assert.deepEqual(r.applicableAmendments, []);
  }
});
await test("D3 (P1-R7-IR-002 core): malformed date can no longer reach POST_EFFECTIVITY", () => {
  // These exact inputs produced POST_EFFECTIVITY + applicable RA 12214 before R8.
  for (const d of ["2026-02-30", "2026/01/15"]) {
    assert.notEqual(txn(d).temporalStatus, "POST_EFFECTIVITY", `${d} must not be POST_EFFECTIVITY`);
  }
});

// ── E. required transaction-date enforcement (P1-R7-IR-003) ────────────────
await test("E1: missing required date -> PERIOD_UNRESOLVED even with other fields present", () => {
  const r = resolveSection51AuthorityChain({
    propositionClass: "filing_deadline_transaction",
    taxableYear: 2026, legalAsOfDate: "2026-12-31", filingEventDate: "2026-01-01"
  });
  assert.equal(r.sufficient, false);
  assert.equal(r.reason, "section_51c2_transaction_date_required");
  assert.deepEqual(r.applicableAmendments, []);
});
await test("E2: dispositionDate is an accepted material date where the rule uses disposition", () => {
  assert.equal(disp("2025-06-19").temporalStatus, "POST_EFFECTIVITY");
  assert.equal(disp("2025-06-18").temporalStatus, "PRE_EFFECTIVITY");
});

// ── F. no taxableYear substitution (P1-R7-IR-003) ──────────────────────────
await test("F1: taxableYear alone never resolves 51(C)(2) applicability", () => {
  for (const y of [2024, 2025, 2026]) {
    const r = resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", taxableYear: y });
    assert.equal(r.sufficient, false, `taxableYear ${y} fails closed`);
    assert.deepEqual(r.applicableAmendments, []);
    assert.ok(!r.currentAuthoritySet.includes("RA 12214"));
  }
});

// ── G. no legalAsOfDate / filingEventDate substitution (P1-R7-IR-003) ──────
await test("G1: legalAsOfDate and filingEventDate never substitute for transactionDate", () => {
  for (const field of ["legalAsOfDate", "filingEventDate"]) {
    const r = resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", [field]: "2026-01-01" });
    assert.equal(r.sufficient, false, `${field} must not resolve applicability`);
    assert.deepEqual(r.applicableAmendments, []);
  }
});

// ── H. exact boundary behavior (P1-R7-IR-001) ──────────────────────────────
await test("H1: effectivity minus one day -> PRE_EFFECTIVITY (RA 12214 not applicable)", () => {
  const r = txn("2025-06-18");
  assert.equal(r.temporalStatus, "PRE_EFFECTIVITY");
  assert.deepEqual(r.applicableAmendments, []);
  assert.ok(!r.currentAuthoritySet.includes("RA 12214"));
});
await test("H2: exact effectivity date -> POST_EFFECTIVITY (inclusive, applicable)", () => {
  const r = txn(EFF);
  assert.equal(r.temporalStatus, "POST_EFFECTIVITY");
  assert.ok(r.applicableAmendments.includes("RA 12214"));
  assert.ok(r.currentAuthoritySet.includes("RA 12214"));
});
await test("H3: effectivity plus one day -> POST_EFFECTIVITY applicable", () => {
  assert.ok(txn("2025-06-20").applicableAmendments.includes("RA 12214"));
});
await test("H4: sampled boundary dates classify correctly", () => {
  const expect = {
    "2025-01-15": "PRE_EFFECTIVITY", "2025-06-01": "PRE_EFFECTIVITY",
    "2025-06-04": "PRE_EFFECTIVITY", // qualifying-publication day is still pre-effectivity
    "2025-07-01": "POST_EFFECTIVITY", "2025-08-05": "POST_EFFECTIVITY",
    "2024-05-01": "PRE_EFFECTIVITY", "2026-03-03": "POST_EFFECTIVITY"
  };
  for (const [d, s] of Object.entries(expect)) assert.equal(txn(d).temporalStatus, s, `${d} -> ${s}`);
});
await test("H5: July 1 (Section 28 transitory) does not sweep in pre-effectivity June dates", () => {
  assert.equal(txn("2025-06-18").temporalStatus, "PRE_EFFECTIVITY");
});

// ── I. clean fail-closed metadata (P1-R7-IR-004) ───────────────────────────
function assertNoRA12214Exposure(r, label) {
  assert.deepEqual(r.applicableAmendments, [], `${label}: applicableAmendments empty`);
  assert.ok(!r.currentAuthoritySet.includes("RA 12214"), `${label}: currentAuthoritySet clean`);
  assert.ok(!(r.amendingAuthorities || []).includes("RA 12214"), `${label}: amendingAuthorities clean`);
  assert.notEqual(r.temporalStatus, "POST_EFFECTIVITY", `${label}: not post-effectivity`);
}
await test("I1: unresolved / invalid / pre-effectivity never expose RA 12214 as applicable/current", () => {
  assertNoRA12214Exposure(txn(undefined), "missing");
  assertNoRA12214Exposure(txn("not-a-date"), "invalid");
  assertNoRA12214Exposure(txn("2025-06-18"), "pre-effectivity");
  assertNoRA12214Exposure(resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", taxableYear: 2026 }), "year-only");
});
await test("I2: fail-closed result buckets are internally consistent", () => {
  const r = txn(undefined);
  assert.equal(r.sufficient, false);
  assert.deepEqual(r.reviewedButNotApplicable, []);
  assert.deepEqual(r.notYetEffective, []);
  assert.deepEqual(r.historicalAuthoritySet, []);
  assert.deepEqual(r.currentAuthoritySet, ["NIRC Sec. 51(C)"]);
});

// ── J. source-card / validator / history consistency (P1-R7-IR-004) ────────
await test("J1: 51(C)(2) public card with no date is fail-closed clean", () => {
  const m = buildSection51AmendmentChainMetadata("NIRC Sec. 51(C)(2)");
  assert.equal(m.temporalSufficient, false);
  assert.equal(m.temporalStatus, "PERIOD_UNRESOLVED");
  assert.deepEqual(m.applicableAmendments, []);
  assert.ok(!m.currentAuthoritySet.includes("RA 12214"));
});
await test("J2: 51(C)(2) card with post-effectivity txn date carries applicable RA 12214", () => {
  const m = buildSection51AmendmentChainMetadata("NIRC Sec. 51(C)(2)", { transactionDate: "2025-07-01" });
  assert.equal(m.temporalStatus, "POST_EFFECTIVITY");
  assert.ok(m.applicableAmendments.includes("RA 12214"));
  assert.ok(m.currentAuthoritySet.includes("RA 12214"));
});

// ── K. preservation of prior R5/R6/R7 closures ─────────────────────────────
await test("K1: Section 51-A originatingLaw remains RA 10963; base RA 8424 (R5/R6)", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "substituted_filing" });
  assert.equal(r.originatingLaw, "RA 10963");
  assert.equal(r.baseCode, "RA 8424");
  assert.equal(r.sufficient, true);
});
await test("K2: 2023 ordinary obligation stays HISTORICAL; RA 11976/12214 not applied (R6)", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_obligation", taxableYear: 2023 });
  assert.equal(r.chainStatus, "HISTORICAL_COMPLETE_CHAIN");
  assert.ok(!r.amendingAuthorities.includes("RA 11976"));
  assert.ok(!r.amendingAuthorities.includes("RA 12214"));
});
await test("K3: ordinary filing_deadline unchanged through chain (no RA 12214 leak)", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_deadline" });
  assert.ok(!r.currentAuthoritySet.includes("RA 12214"));
});
await test("K4: no year-only comparison path — 2025 ordinary filing_obligation resolves by year, 51(C)(2) does not", () => {
  // ordinary still uses year; 51(C)(2) requires exact date
  assert.equal(resolveSection51AuthorityChain({ propositionClass: "filing_obligation", taxableYear: 2025 }).sufficient, true);
  assert.equal(resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", taxableYear: 2025 }).sufficient, false);
});

console.log(`\nphase-10a14-r8: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
