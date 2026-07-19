// PHASE-10A14-R5: Section 51 current-law amendment chain + imperative filing.
//
// Covers: (1) the governed Section 51 amendment-chain resolver + source-card
// amendment metadata; (2) the narrow temporal-sufficiency gate (CGT/transaction-
// specific 51(C)(2) timing requires RA 12214, while ordinary obligation / April-15
// deadline / substituted filing are UNCHANGED and must still verify); (3) the
// imperative tax-return filing proposition detector (P2-R4-003) with overfire guard.

import assert from "node:assert/strict";
import {
  resolveSection51AuthorityChain,
  buildSection51AmendmentChainMetadata,
  SECTION51_OFFICIAL_LAWS
} from "../section51-authority-chain.js";
import {
  detectFilingAndEstatePropositions,
  evaluatePropositionSourceSufficiency
} from "../services/answer-support-validator.js";

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}`); console.error(e?.stack || e); }
}
const src = (...labels) => labels.map((l) => ({ label: l }));

// ── A. amendment-chain resolver ───────────────────────────────────────────
await test("resolver: obligation -> chain reviewed, base unchanged", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_obligation" });
  assert.equal(r.chainStatus, "BASE_PROVISION_UNCHANGED_BUT_CHAIN_REVIEWED");
  assert.equal(r.sufficient, true);
  assert.ok(r.amendingAuthorities.includes("RA 11976"), "EOPT reviewed in chain");
});
await test("resolver: ordinary deadline -> current complete chain", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_deadline" });
  assert.equal(r.chainStatus, "CURRENT_COMPLETE_CHAIN");
  assert.equal(r.sufficient, true);
});
await test("resolver: substituted -> current complete chain", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "substituted_filing" });
  assert.equal(r.chainStatus, "CURRENT_COMPLETE_CHAIN");
  assert.equal(r.sufficient, true);
});
// R8 (P1-R7-IR-003/004): Section 51(C)(2) applicability requires a strict transactionDate;
// a bare year or missing date fails closed and never exposes RA 12214 as applicable.
await test("resolver: transaction timing with no material date -> fail closed (no RA 12214)", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction" });
  assert.equal(r.chainStatus, "LATER_AMENDMENT_REQUIRED");
  assert.equal(r.sufficient, false);
  assert.equal(r.reason, "section_51c2_transaction_date_required");
  assert.deepEqual(r.applicableAmendments, []);
  assert.ok(!r.currentAuthoritySet.includes("RA 12214"));
});
await test("resolver: transaction timing pre-effectivity date -> historical complete chain", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", transactionDate: "2024-06-01" });
  assert.equal(r.chainStatus, "HISTORICAL_COMPLETE_CHAIN");
  assert.equal(r.sufficient, true);
});
await test("resolver: transaction timing post-effectivity date -> later amendment required, applicable", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", transactionDate: "2026-01-15" });
  assert.equal(r.chainStatus, "LATER_AMENDMENT_REQUIRED");
  assert.equal(r.sufficient, true);
  assert.ok(r.currentAuthoritySet.includes("RA 12214"));
});
await test("official laws carry canonical URLs + effectivity", () => {
  assert.match(SECTION51_OFFICIAL_LAWS["RA 11976"].url, /lawphil\.net/);
  assert.equal(SECTION51_OFFICIAL_LAWS["RA 11976"].effectivity, "2024-01-22");
  assert.equal(SECTION51_OFFICIAL_LAWS["RA 12214"].title.includes("CMEPA"), true);
});

// ── B. source-card amendment metadata ─────────────────────────────────────
await test("card metadata: Sec 51 records reviewed chain incl RA 11976/12214, not RA10963-only", () => {
  const m = buildSection51AmendmentChainMetadata("NIRC Sec. 51");
  assert.equal(m.amendmentChainReviewed, true);
  const ids = m.officialAmendmentLaws.map((l) => l.id);
  assert.ok(ids.includes("RA 10963"), "records TRAIN");
  assert.ok(ids.includes("RA 11976"), "records EOPT so card is not RA10963-only");
  assert.match(m.amendmentChainId, /12214/);
});

// ── C. imperative filing proposition detection (P2-R4-003) ────────────────
const IMPERATIVES = [
  "File the annual income-tax return.",
  "Submit the ITR.",
  "Lodge the annual return.",
  "Accomplish and file BIR Form 1701.",
  "You must file the annual return.",
  "The taxpayer should file Form 1701."
];
for (const ans of IMPERATIVES) {
  await test(`imperative -> filing_obligation: ${ans}`, () => {
    const sem = detectFilingAndEstatePropositions("What should the taxpayer do?", ans);
    assert.equal(sem.filingObligation, true, `expected filing_obligation for: ${ans}`);
  });
}
const NON_RETURN = [
  "File a protest with the BIR.",
  "Lodge a refund claim.",
  "Submit the invoices and official receipts.",
  "Register the business with the BIR.",
  "This is a return of capital, not income.",
  "Compute the rate of return on the investment."
];
for (const ans of NON_RETURN) {
  await test(`overfire guard -> NO filing_obligation: ${ans}`, () => {
    const sem = detectFilingAndEstatePropositions("What should the taxpayer do?", ans);
    assert.equal(sem.filingObligation, false, `must NOT fire filing_obligation for: ${ans}`);
  });
}

// ── D. temporal sufficiency gate via evaluatePropositionSourceSufficiency ──
await test("ordinary annual deadline verifies on Sec 51 (chain unchanged) — no temporal fail", () => {
  const r = evaluatePropositionSourceSufficiency({
    question: "When is the annual individual income tax return deadline?",
    answer: "The annual individual income tax return must be filed on or before April 15 of the following year, under Section 51(C) of the NIRC.",
    sources: src("NIRC Sec. 51", "NIRC Sec. 51(C)")
  });
  assert.equal(r.sufficient, true, `expected sufficient; got ${r.reason}`);
});
await test("substituted filing verifies on Sec 51-A (chain unchanged)", () => {
  const r = evaluatePropositionSourceSufficiency({
    question: "Does an employee with one employer and correct withholding still file?",
    answer: "No. Under substituted filing per Section 51-A, an employee with purely compensation income from one employer whose tax was correctly withheld is not required to file an annual income tax return.",
    sources: src("NIRC Sec. 51-A", "NIRC Sec. 51")
  });
  assert.equal(r.sufficient, true, `expected sufficient; got ${r.reason}`);
});
await test("CGT transaction-specific timing WITHOUT RA 12214 -> fails closed (later amendment missing)", () => {
  const r = evaluatePropositionSourceSufficiency({
    question: "What is the deadline to file the return for the sale of shares of stock not traded on the exchange?",
    answer: "For capital gains from the sale or exchange of shares of stock not traded through the stock exchange, a return shall be filed within thirty (30) days after each transaction under Section 51(C)(2).",
    sources: src("NIRC Sec. 51", "NIRC Sec. 51(C)")
  });
  assert.equal(r.sufficient, false);
  assert.equal(r.reason, "section_51_later_amendment_missing");
});
// The temporal gate's guaranteed job is the fail-closed SAFETY direction (stale
// current). When the later law is present, or the period is explicitly historical,
// the temporal gate must NOT be the blocker (full verification of a CGT return also
// depends on return-type resolution, which is outside this narrow R5 control).
await test("CGT transaction-specific timing WITH RA 12214 -> temporal gate does NOT block", () => {
  const r = evaluatePropositionSourceSufficiency({
    question: "What is the deadline to file the return for the sale of shares of stock not traded on the exchange?",
    answer: "Under RA 12214 (CMEPA) amending Section 51(C)(2), the capital-gains return for the sale of shares of stock not traded through the stock exchange is filed within thirty (30) days after each transaction.",
    sources: src("NIRC Sec. 51(C)", "RA 12214")
  });
  assert.notEqual(r.reason, "section_51_later_amendment_missing", "later law present -> temporal gate must not block");
});
await test("CGT transaction-specific timing for an explicit pre-2025 period -> temporal gate does NOT block", () => {
  const r = evaluatePropositionSourceSufficiency({
    question: "For taxable year 2023, what was the deadline to file the return on the sale of shares of stock not traded on the exchange?",
    answer: "For 2023, capital gains from the sale of shares of stock not traded through the stock exchange required a return within thirty (30) days after each transaction under Section 51(C)(2).",
    sources: src("NIRC Sec. 51", "NIRC Sec. 51(C)")
  });
  assert.notEqual(r.reason, "section_51_later_amendment_missing", "explicit historical period -> temporal gate must not block");
});

console.log(`\nphase-10a14-r5: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
