// PHASE-10A14-R1-FILING-OBLIGATION-DEADLINE-AND-TAX-BASE-SOURCE-SUFFICIENCY
//
// Remediates the A14-confirmed compound-proposition laundering P1s: Q12 (no-filing
// conclusion on income-tax rate/residency authority), Q34 (ITR filing deadline on
// rate/residency authority), Q30 (estate-tax computation misstating the base as
// "6% on the value of the estate exceeding P5M"). Adds three proposition classes to
// evaluatePropositionSourceSufficiency:
//   - filing_obligation: required/not-required to file / substituted filing / joint-
//     or-separate return propositions require filing authority (Sec 51/52/56/...,
//     substituted-filing RRs) -> fail closed on rate/residency/corporate authority;
//   - filing_deadline: return-deadline propositions require deadline/return authority
//     (Sec 51 individual, 52/77 corporate, 90/91 estate, 103 donor, 114 VAT) -> fail
//     closed on rate/residency authority;
//   - tax_computation_basis: an estate-tax computation that applies the rate to the
//     estate value "exceeding [amount]" (treating the standard deduction as a
//     threshold, misstating the NET-estate base) -> fail closed.
// Class-based; no question IDs, income amounts, dates, or answer deny lists. Valid
// filing/deadline/estate conclusions with controlling authority remain reachable.

import assert from "node:assert/strict";
import { evaluatePropositionSourceSufficiency, evaluateAnswerSupport } from "../services/answer-support-validator.js";

let passed = 0, failed = 0, assertions = 0;
async function test(name, fn) { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); } }
function check(c, m) { assertions++; assert(c, m); }
const g = (question, answer, sources) => evaluatePropositionSourceSufficiency({ question, answer, sources });
const blocked = (r, cls) => r.applicable && !r.sufficient && r.propositionClass === cls;
const reachable = (r) => r.applicable === false || r.sufficient === true;

const RATE = [{ label: "NIRC Sec. 24" }, { label: "NIRC Sec. 23" }, { label: "NIRC Sec. 27" }];
const FILING = [{ label: "NIRC Sec. 51" }];
const SUBFILING = [{ label: "RR No. 11-2018" }, { label: "NIRC Sec. 51" }];
const ESTATE_RATE_DED = [{ label: "NIRC Sec. 84" }, { label: "NIRC Sec. 86" }];
const ESTATE_RETURN = [{ label: "NIRC Sec. 90" }, { label: "NIRC Sec. 91" }];

// Exact A14 committed defect answers
const Q12_A = "### Short Answer\nAn individual with ₱250,000 gross compensation income in 2024 is not required to file an income tax return, as this amount is exempt from income tax under the current tax regulations.";
const Q12_Q = "Is an individual with ₱250,000 gross compensation income in 2024 required to file an income tax return?";
const Q30_A = "### Short Answer\nThe estate tax rate under the TRAIN law is a flat rate of 6% on the value of the estate exceeding Five Million Pesos (₱5,000,000).";
const Q30_Q = "What is the estate tax rate under TRAIN?";
const Q34_A = "### Short Answer\nThe deadline for filing the annual income tax return of an individual is on or before April 15 of the following year.";
const Q34_Q = "What is the deadline for the annual income tax return of an individual?";

// ── filing obligation (Q12 class) ────────────────────────────────────────────
await test("F1: Q12 exact — no-filing conclusion on rate/residency authority fails closed", async () => {
  const r = g(Q12_Q, Q12_A, RATE);
  check(blocked(r, "filing_obligation"), "fails closed");
  const e = await evaluateAnswerSupport({ question: Q12_Q, answer: Q12_A, sources: RATE });
  check(e.verifiedEligible === false && e.stage === "proposition-source-sufficiency", "eval fails closed at gate");
});
await test("F2: no-tax-due laundered into no-filing without filing authority fails closed", () => {
  check(blocked(g("Is a person with income below the taxable threshold required to file a return?", "No, not required to file because no tax is due.", RATE), "filing_obligation"), "closed");
});
await test("F3: substituted-filing claim without filing authority fails closed", () => {
  check(blocked(g("Must a purely compensation employee file an income tax return?", "No, the employee qualifies for substituted filing.", RATE), "filing_obligation"), "closed");
});
await test("F4: valid filing-required conclusion with Sec 51 is reachable", () => {
  check(reachable(g("Is a self-employed individual required to file an income tax return?", "Yes, a self-employed individual must file an annual return under Section 51.", FILING)), "reachable");
});
await test("F5: valid substituted-filing conclusion with filing authority is reachable", () => {
  check(reachable(g("Does a purely compensation employee with one employer file a return?", "No; the employee qualifies for substituted filing under RR 11-2018 and Section 51, provided the employer withheld correctly.", SUBFILING)), "reachable");
});
await test("F6: a refund / rate question that merely mentions filing is NOT a filing_obligation (no over-fire)", () => {
  check(g("Can a VAT-registered exporter obtain a refund or tax credit for input VAT?", "Yes; the exporter may file a claim for refund or tax credit.", [{ label: "NIRC Sec. 112" }]).propositionClass !== "filing_obligation", "not filing_obligation");
  check(g("What is the donor's tax rate under TRAIN and the exemption threshold?", "6% on gifts over ₱250,000; a donor files a donor's tax return per transaction.", [{ label: "NIRC Sec. 99" }]).propositionClass !== "filing_obligation", "not filing_obligation");
});

// ── filing deadline (Q34 class) ──────────────────────────────────────────────
await test("D1: Q34 exact — ITR deadline on rate/residency authority fails closed", async () => {
  const r = g(Q34_Q, Q34_A, RATE);
  check(blocked(r, "filing_deadline"), "fails closed");
  const e = await evaluateAnswerSupport({ question: Q34_Q, answer: Q34_A, sources: RATE });
  check(e.verifiedEligible === false && e.stage === "proposition-source-sufficiency", "eval fails closed at gate");
});
await test("D2: annual deadline supported only by rate provisions fails closed", () => {
  check(blocked(g("When is the annual income tax return of an individual due?", "It is due on or before April 15.", [{ label: "NIRC Sec. 24" }]), "filing_deadline"), "closed");
});
await test("D3: valid individual-ITR deadline with Sec 51 is reachable", () => {
  check(reachable(g("What is the deadline for the annual individual income tax return?", "On or before April 15 of the following year under Section 51(C).", FILING)), "reachable");
});
await test("D4: valid estate-return deadline with estate-return authority (Sec 90/91) is reachable (Q32 class)", () => {
  check(reachable(g("What is the deadline for filing an estate tax return, and can it be extended?", "Within one year from death under Section 90; a 30-day extension may be granted; payment under Section 91.", ESTATE_RETURN)), "reachable");
});

// ── estate tax computation basis (Q30 class) ─────────────────────────────────
await test("E1: Q30 exact — 6% on estate value exceeding an amount (base misstatement) fails closed", async () => {
  const r = g(Q30_Q, Q30_A, [{ label: "NIRC Sec. 91" }, { label: "NIRC Sec. 84" }, { label: "NIRC Sec. 86" }, { label: "NIRC Sec. 88" }, { label: "NIRC Sec. 89" }]);
  check(blocked(r, "tax_computation_basis"), "fails closed");
  check(r.diagnostics.estateBaseMisstatement === true, "base misstatement detected");
  const e = await evaluateAnswerSupport({ question: Q30_Q, answer: Q30_A, sources: ESTATE_RATE_DED });
  check(e.verifiedEligible === false && e.stage === "proposition-source-sufficiency", "eval fails closed at gate");
});
await test("E2: gross-estate base misstatement fails closed", () => {
  check(blocked(g(Q30_Q, "The estate tax is 6% on the gross estate exceeding ₱5,000,000.", ESTATE_RATE_DED), "tax_computation_basis"), "closed");
});
await test("E3: correctly-stated estate computation on the NET estate is reachable", () => {
  check(reachable(g(Q30_Q, "The estate tax is a flat 6% of the net estate; a ₱5,000,000 standard deduction is allowed under Section 86.", ESTATE_RATE_DED)), "reachable");
});
await test("E4: donor's tax 6% over ₱250,000 (a real threshold) is NOT an estate misstatement (no over-fire)", () => {
  const r = g("What is the donor's tax rate under TRAIN and the exemption threshold?", "6% on total gifts exceeding ₱250,000 per year under Section 99.", [{ label: "NIRC Sec. 99" }]);
  check(r.propositionClass !== "tax_computation_basis", "donor's tax not estate computation");
  check(reachable(r), "donor reachable");
});

// ── cross-class / no blanket suppression / gate never upgrades ───────────────
await test("X1: gate never upgrades trust — a sufficient filing/deadline/estate result does not force verification", () => {
  check(g(Q34_Q, "April 15 under Section 51(C).", FILING).sufficient === true, "sufficient (not blocked, not upgraded)");
});
await test("X2: no blanket suppression — valid filing, deadline, and estate computations all reachable", () => {
  check(reachable(g("Is a self-employed individual required to file a return?", "Yes, under Section 51.", FILING)), "filing reachable");
  check(reachable(g("What is the deadline for the individual ITR?", "April 15 under Section 51(C).", FILING)), "deadline reachable");
  check(reachable(g(Q30_Q, "6% of the net estate; standard deduction under Section 86.", ESTATE_RATE_DED)), "estate reachable");
});

console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
