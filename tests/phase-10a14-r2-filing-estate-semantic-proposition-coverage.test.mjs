// PHASE-10A14-R2-FILING-OBLIGATION-DEADLINE-AND-ESTATE-TAX-SEMANTIC-PROPOSITION-COVERAGE
//
// A14-R1 detected filing_obligation / filing_deadline / tax_computation_basis (estate)
// with brittle phrase-oriented regexes. A reviewer could bypass them with paraphrases,
// statement forms, short follow-ups, answer-introduced conclusions, or bounded Taglish.
// R2 replaces the phrase matching with a deterministic SEMANTIC proposition layer
// (detectFilingAndEstatePropositions + normalizeTaxText) that recognizes the CONCEPT
// across surface forms while identifying the OBJECT of the action (return-filing vs
// payment vs protest vs registration vs assessment/prescription) so only return-filing
// invokes the gates.
//
// This suite proves CONCEPT coverage (A–E), OBJECT disambiguation / no over-fire (F),
// positive reachability (G), and gate-never-upgrades (H). It is class/concept based:
// no question IDs, exact prompts, income amounts, dates, or reviewer-phrase deny lists.

import assert from "node:assert/strict";
import {
  evaluatePropositionSourceSufficiency,
  detectFilingAndEstatePropositions
} from "../services/answer-support-validator.js";

let passed = 0, failed = 0, assertions = 0;
async function test(name, fn) { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); } }
function check(c, m) { assertions++; assert(c, m); }
const g = (question, answer, sources) => evaluatePropositionSourceSufficiency({ question, answer, sources });
const blocked = (r, cls) => r.applicable && !r.sufficient && r.propositionClass === cls;
const reachable = (r) => r.applicable === false || r.sufficient === true;

// Non-controlling authority: income-tax rate/residency provisions only.
const RATE = [{ label: "NIRC Sec. 24" }, { label: "NIRC Sec. 23" }, { label: "NIRC Sec. 27" }];
// Controlling authorities.
const FILING = [{ label: "NIRC Sec. 51" }];
const SUBFILING = [{ label: "RR No. 11-2018" }, { label: "NIRC Sec. 51" }];
const ESTATE_RETURN = [{ label: "NIRC Sec. 90" }, { label: "NIRC Sec. 91" }];
const ESTATE_RATE_DED = [{ label: "NIRC Sec. 84" }, { label: "NIRC Sec. 86" }];

// ── A. filing_obligation — paraphrase coverage on non-controlling authority ───
const A_OBLIGATION = [
  ["Do I still need an ITR?", "No, you do not need to file an ITR since your income is exempt."],
  ["Am I obliged to lodge an annual return?", "No, you are not obliged to file an annual return."],
  ["Does a minimum-wage earner have to submit a return?", "No, a minimum-wage earner is not required to file a return."],
  ["Kailangan ko pa bang mag-file ng ITR?", "Hindi na, you are not required to file a return."] // bounded Taglish
];
for (const [q, a] of A_OBLIGATION) {
  await test(`A: filing_obligation paraphrase fails closed on rate authority — "${q.slice(0, 34)}"`, () => {
    check(blocked(g(q, a, RATE), "filing_obligation"), "closed as filing_obligation");
  });
}

// ── B. filing_obligation — statement form & answer-introduced conclusion ─────
await test("B1: bare statement 'No return is required' fails closed even with an empty question", () => {
  check(blocked(g("", "No return is required for this taxpayer.", RATE), "filing_obligation"), "closed");
});
await test("B2: answer-introduced no-filing conclusion (question was about liability) fails closed", () => {
  check(blocked(g("My tax comes out to zero, right?", "Correct — and therefore no income tax return is required.", RATE), "filing_obligation"), "closed");
});
await test("B3: short follow-up 'How about filing?' with a no-filing answer fails closed", () => {
  check(blocked(g("How about filing?", "You are not required to file a return.", RATE), "filing_obligation"), "closed");
});
await test("B4: 'not required to submit an income tax return' (submit synonym) fails closed", () => {
  check(blocked(g("Do I submit anything?", "No, you are not required to submit an income tax return.", RATE), "filing_obligation"), "closed");
});

// ── C. filing_deadline — temporal-variant coverage on non-controlling auth ───
const C_DEADLINE = [
  ["What is the last day to submit?", "The last day to submit the annual return is April 15."],
  ["Must be filed by what date?", "It must be filed on or before April 15."],
  ["Is May 15 already late for the annual return?", "Yes, the annual return was due April 15, so May 15 is late."],
  ["How many days do I have to file the annual return?", "You must file by April 15."],
  ["Hanggang kailan ang filing ng annual return?", "On or before April 15."] // bounded Taglish
];
for (const [q, a] of C_DEADLINE) {
  await test(`C: filing_deadline temporal-variant fails closed on rate authority — "${q.slice(0, 34)}"`, () => {
    check(blocked(g(q, a, RATE), "filing_deadline"), "closed as filing_deadline");
  });
}

// ── D. estate tax_computation_basis — base-misstatement concept coverage ─────
const D_ESTATE = [
  ["What is the estate tax under TRAIN?", "Estate tax is 6% on the excess over 5,000,000."],
  ["What is the estate tax under TRAIN?", "The first 5,000,000 of the estate is tax-free; 6% applies above that."],
  ["What is the estate tax under TRAIN?", "There is a 5,000,000 estate-tax threshold; only amounts above it are taxed at 6%."],
  ["What is the estate tax under TRAIN?", "Estate tax is 6% of the gross estate less 5,000,000."],
  ["What is the estate tax under TRAIN?", "The rate is 6% on the value of the estate exceeding 5,000,000."]
];
for (const [q, a] of D_ESTATE) {
  await test(`D: estate base misstatement fails closed — "${a.slice(0, 40)}"`, () => {
    const r = g(q, a, ESTATE_RATE_DED);
    check(blocked(r, "tax_computation_basis"), "closed as tax_computation_basis");
    check(r.diagnostics.estateBaseMisstatement === true, "base misstatement flagged");
  });
}

// ── E. normalizer robustness (ITR expansion, contraction, Taglish mapping) ───
await test("E1: detector expands ITR and maps 'mag-file' to a filing concept", () => {
  const d = detectFilingAndEstatePropositions("Kailangan ko bang mag-file ng ITR?", "Hindi, not required to file a return.");
  check(d.filingObligation === true, "filing obligation concept recognized under Taglish + ITR");
});
await test("E2: detector recognizes an estate base misstatement paraphrase without any exact phrase", () => {
  const d = detectFilingAndEstatePropositions("estate tax under TRAIN", "6% applies only to the portion of the estate above 5,000,000.");
  check(d.estateBaseMisstatement === true, "estate base misstatement recognized");
});

// ── F. OBJECT disambiguation — non-return objects must NOT invoke the gates ──
await test("F1: refund-claim filing is not a filing_obligation (no over-fire)", () => {
  const r = g("Can a VAT-registered exporter obtain a refund or tax credit?", "Yes; the exporter may file a claim for refund or tax credit.", [{ label: "NIRC Sec. 112" }]);
  check(r.propositionClass !== "filing_obligation" && reachable(r), "refund reachable, not filing_obligation");
});
await test("F2: protest deadline is not a filing_deadline (different object)", () => {
  const r = g("What is the deadline to file a protest against an assessment?", "File the protest within 30 days of the FAN.", [{ label: "NIRC Sec. 228" }]);
  check(r.propositionClass !== "filing_deadline", "protest is not the return-filing deadline class");
});
await test("F3: assessment/prescriptive period is not a filing_deadline (past-tense 'filed')", () => {
  const r = g("What is the BIR assessment period when a taxpayer filed a return?", "Three years from filing under Section 203.", [{ label: "NIRC Sec. 203" }]);
  check(r.applicable === false || r.propositionClass !== "filing_deadline", "assessment period not filing_deadline");
});
await test("F4: estate-tax PAYMENT deadline is not the return filing_deadline (payment object)", () => {
  const r = g("When is the estate tax payment due?", "The estate tax must be paid within one year of death.", [{ label: "NIRC Sec. 91" }]);
  check(r.propositionClass !== "filing_deadline" || reachable(r), "payment object not over-blocked as return deadline");
});
await test("F5: 'no tax is due' liability answer is filing_obligation, not filing_deadline (bare 'due' not temporal)", () => {
  const r = g("Is a person below the taxable threshold required to file a return?", "No, not required to file because no tax is due.", RATE);
  check(blocked(r, "filing_obligation"), "classified filing_obligation not filing_deadline");
});
await test("F6: a penalty question mentioning 'late filing' is not a filing_deadline (penalty object)", () => {
  const r = g("What penalties apply to late filing of a VAT return?", "A 25% surcharge (Sec 248) and 12% interest (Sec 249) apply.", [{ label: "NIRC Sec. 248" }, { label: "NIRC Sec. 249" }]);
  check(r.propositionClass !== "filing_deadline", "late-filing penalty is not the deadline class");
});
await test("F7: donor's-tax 6% over a real threshold is not an estate base misstatement", () => {
  const r = g("What is the donor's tax rate and exemption threshold under TRAIN?", "6% on total gifts exceeding 250,000 per year under Section 99.", [{ label: "NIRC Sec. 99" }]);
  check(r.propositionClass !== "tax_computation_basis" && reachable(r), "donor's tax reachable, not estate misstatement");
});

// ── G. positive reachability — controlling authority stays VERIFIED-eligible ─
await test("G1: filing-required conclusion with Sec 51 remains reachable", () => {
  check(reachable(g("Is a self-employed individual required to file a return?", "Yes, a self-employed individual must file an annual return under Section 51.", FILING)), "reachable");
});
await test("G2: substituted-filing conclusion with filing authority remains reachable", () => {
  check(reachable(g("Does a purely compensation employee with one employer file a return?", "No; substituted filing applies under RR 11-2018 and Section 51.", SUBFILING)), "reachable");
});
await test("G3: individual-ITR deadline with Sec 51 remains reachable", () => {
  check(reachable(g("What is the deadline for the annual individual income tax return?", "On or before April 15 under Section 51(C).", FILING)), "reachable");
});
await test("G4: estate-return deadline with Sec 90/91 remains reachable (Q32 class preserved)", () => {
  check(reachable(g("What is the deadline for filing an estate tax return?", "Within one year from death under Section 90; payment under Section 91.", ESTATE_RETURN)), "reachable");
});
await test("G5: correctly-stated net-estate computation remains reachable", () => {
  check(reachable(g("What is the estate tax under TRAIN?", "6% of the net estate; a 5,000,000 standard deduction is allowed under Section 86.", ESTATE_RATE_DED)), "reachable");
});

// ── H. the gate only withholds; it never UPGRADES trust ──────────────────────
await test("H1: a sufficient filing/deadline/estate result is not forced to verification", () => {
  check(g("What is the deadline for the individual ITR?", "April 15 under Section 51(C).", FILING).sufficient === true, "sufficient, not upgraded");
});

console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
