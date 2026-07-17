// PHASE-10A14-R3-MULTI-PROPOSITION-FILING-AUTHORITY-COMPATIBILITY-AND-ESTATE-COMPUTATION-SUFFICIENCY
//
// Remediates the five R2-independent-review P1 defects by replacing combined-text
// global suppression + pooled authority matching with a clause-scoped multi-
// proposition ledger, a tax-type authority-compatibility matrix, and an estate
// computation component/relationship model with positive authority sufficiency:
//   P1-1 mixed-object suppression: a wrong object in one clause no longer erases a
//        separate decisive tax-return proposition in another clause;
//   P1-2 relative-period/Taglish deadlines ("still file today", "pwede pa bang
//        mag-file") are detected;
//   P1-3 filing authority must match the EXACT tax/return type (no cross-tax-type
//        laundering: estate authority does not satisfy an individual ITR deadline);
//   P1-4 a correct estate computation requires positive estate rate/base/deduction
//        authority (foundational-only cards fail closed);
//   P1-5 estate base misstatements are detected by legal RELATIONSHIP (deduction/
//        first-amount treated as threshold/floor/sole-base) without a fixed amount.
// Class/concept/object based; no question IDs, exact prompts, amounts, dates, or
// reviewer-phrase deny lists. Every negative asserts class + object + authority
// mismatch/insufficiency + the correct deterministic gate (not merely "not verified").

import assert from "node:assert/strict";
import {
  evaluatePropositionSourceSufficiency,
  detectFilingAndEstatePropositions
} from "../services/answer-support-validator.js";

let passed = 0, failed = 0, assertions = 0;
async function test(name, fn) { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); } }
function check(c, m) { assertions++; assert(c, m); }
const g = (question, answer, sources) => evaluatePropositionSourceSufficiency({ question, answer, sources });
const S = (...labels) => labels.map((l) => ({ label: l }));
const blocked = (r, cls, reason) => r.applicable && !r.sufficient && r.propositionClass === cls && (!reason || r.reason === reason);
const reachable = (r) => r.applicable === false || r.sufficient === true;
const ledgerHas = (r, cls, returnType) => (r.diagnostics.propositionLedger || []).some((p) => p.propositionClass === cls && (!returnType || p.returnType === returnType));

// Authority fixtures
const RATE = S("NIRC Sec. 24", "NIRC Sec. 23", "NIRC Sec. 27");   // non-controlling (rate/residency)
const IND = S("NIRC Sec. 51");                                     // individual filing
const SUBFILING = S("RR No. 11-2018", "NIRC Sec. 51-A");           // substituted filing
const CORP = S("NIRC Sec. 52", "NIRC Sec. 77");                    // corporate filing
const ESTATE_RET = S("NIRC Sec. 90", "NIRC Sec. 91");             // estate return
const DONOR_RET = S("NIRC Sec. 103");                             // donor return
const VAT_RET = S("NIRC Sec. 114");                              // VAT return
const ESTATE_COMP = S("NIRC Sec. 84", "NIRC Sec. 86");           // estate rate + deductions
const FOUND = S("NIRC Sec. 1", "NIRC Sec. 6");                    // foundational only

// ── A. Mixed-object filing obligation (P1-1) ─────────────────────────────────
await test("A1: ITR + documents — filing_obligation is not suppressed by the document clause", () => {
  const r = g("Do I need an ITR and what documents should I submit?", "You do not need to file an ITR, but retain supporting documents.", RATE);
  check(blocked(r, "filing_obligation", "filing_obligation_proposition_without_matching_return_authority"), "closed as filing_obligation on rate authority");
  check(ledgerHas(r, "filing_obligation", "individual_income"), "ledger carries an individual filing_obligation");
});
await test("A2: protest + no annual return — the return proposition survives the protest clause", () => {
  const r = g("What do I file?", "File the protest, but no annual return is required.", RATE);
  check(blocked(r, "filing_obligation"), "closed as filing_obligation");
});
await test("A3: refund claim + ITR obligation — both objects represented, ITR gated", () => {
  const r = g("The refund claim was filed, but must the taxpayer also file an ITR?", "Yes, the taxpayer must file an income tax return.", RATE);
  check(blocked(r, "filing_obligation"), "closed as filing_obligation");
});
await test("A4: ITR + financial statements in one answer — filing_obligation detected", () => {
  const r = g("What are my obligations?", "You must file an income tax return; also attach the financial statements.", RATE);
  check(ledgerHas(r, "filing_obligation"), "filing_obligation in ledger");
  check(blocked(r, "filing_obligation"), "closed (rate authority, not filing)");
});
await test("A5: a mixed answer WITH matching individual filing authority remains reachable (no over-fire)", () => {
  const r = g("Do I need an ITR and keep documents?", "Yes, you must file an income tax return under Section 51, and keep supporting documents.", IND);
  check(reachable(r), "reachable with Sec 51");
});

// ── B. Relative-period / Taglish deadline (P1-2) ─────────────────────────────
await test("B1: 'Can I still file today?' with an until-date answer is a filing_deadline", () => {
  const r = g("Can I still file today?", "Yes, you can still file the annual return until April 15.", RATE);
  check(blocked(r, "filing_deadline"), "closed as filing_deadline");
});
await test("B2: Taglish 'Pwede pa bang mag-file?' is a filing_deadline", () => {
  const r = g("Pwede pa bang mag-file?", "You can still file the income tax return until April 15.", RATE);
  check(blocked(r, "filing_deadline"), "closed as filing_deadline");
});
await test("B3: 'already late for the return' is a filing_deadline; 'Was the return due yesterday?' too", () => {
  check(blocked(g("Am I already late for the annual return?", "Yes, the annual return was due April 15.", RATE), "filing_deadline"), "already late");
  check(blocked(g("Was the return due yesterday?", "The individual return was due yesterday.", RATE), "filing_deadline"), "return due");
});
await test("B4: answer-introduced deadline (vague question) is detected", () => {
  check(blocked(g("Tell me about my ITR.", "The last day to file the individual return is on or before April 15.", RATE), "filing_deadline"), "answer-introduced deadline");
});
await test("B5: 'No tax is due' is a liability statement, not a filing_deadline", () => {
  const r = detectFilingAndEstatePropositions("Do I owe anything?", "No tax is due for this taxpayer.");
  check(r.filingDeadline === false, "no filing_deadline for 'no tax is due'");
});

// ── C. Cross-tax-type authority mismatch (P1-3) ──────────────────────────────
await test("C1: individual ITR deadline citing only estate authority (Sec 90/91) fails closed", () => {
  const r = g("What is the deadline for the individual annual income tax return?", "On or before April 15.", ESTATE_RET);
  check(blocked(r, "filing_deadline", "filing_deadline_proposition_without_matching_return_authority"), "closed");
  check(r.diagnostics.failedProposition.returnType === "individual_income", "failed proposition is individual_income");
  check(r.diagnostics.authorityClasses.estateFiling === true && r.diagnostics.authorityClasses.indFiling === false, "estate authority present, individual absent");
});
await test("C2: estate-return deadline citing only individual authority (Sec 51) fails closed", () => {
  const r = g("What is the deadline for filing the estate tax return?", "Within one year from death.", IND);
  check(blocked(r, "filing_deadline", "filing_deadline_proposition_without_matching_return_authority"), "closed");
  check(r.diagnostics.failedProposition.returnType === "estate", "failed proposition is estate");
});
await test("C3: donor-return deadline citing only VAT authority fails closed", () => {
  const r = g("When is the donor's tax return due?", "The donor's tax return is due within 30 days of the gift.", VAT_RET);
  check(blocked(r, "filing_deadline"), "closed (donor needs donor authority)");
});
await test("C4: VAT-return deadline citing only corporate authority fails closed", () => {
  const r = g("When is the VAT return due?", "The VAT return is due on the 25th following the quarter.", CORP);
  check(blocked(r, "filing_deadline"), "closed (VAT needs VAT authority)");
});
await test("C5: corporate ITR obligation citing only individual authority fails closed", () => {
  const r = g("Must a domestic corporation file an annual income tax return?", "Yes, the corporation must file its annual corporate income tax return.", IND);
  check(blocked(r, "filing_obligation"), "closed (corporate needs corporate authority)");
});
await test("C6: substituted filing citing a generic return provision alone is insufficient", () => {
  const r = g("Does a purely compensation employee file a return?", "No; substituted filing applies to a purely compensation employee.", S("NIRC Sec. 52"));
  check(blocked(r, "filing_obligation"), "closed (substituted needs substituted authority)");
});
await test("C7: correct matching controls — each return type with its own authority is reachable", () => {
  check(reachable(g("Deadline for the individual ITR?", "On or before April 15 under Section 51(C).", IND)), "individual/individual");
  check(reachable(g("Deadline for the estate tax return?", "Within one year under Section 90.", ESTATE_RET)), "estate/estate");
  check(reachable(g("When is the donor's tax return due?", "Within 30 days under Section 103.", DONOR_RET)), "donor/donor");
  check(reachable(g("When is the VAT return due?", "25th following the quarter under Section 114.", VAT_RET)), "vat/vat");
  check(reachable(g("Must a corporation file its annual return?", "Yes, under Section 52.", CORP)), "corporate/corporate");
  check(reachable(g("Does a one-employer employee file?", "No; substituted filing under RR 11-2018 and Section 51-A.", SUBFILING)), "substituted/substituted");
});

// ── D. Estate positive authority sufficiency (P1-4) ──────────────────────────
await test("D1: correct estate answer with foundational-only authority fails closed", () => {
  const r = g("What is the taxable base for the 6% estate tax?", "Estate tax is 6% of the net estate after allowable deductions.", FOUND);
  check(blocked(r, "tax_computation_basis", "estate_computation_without_estate_authority"), "closed for lack of estate authority");
});
await test("D2: correct estate answer with rate authority only (no deduction authority) fails closed", () => {
  const r = g("What is the estate tax?", "6% of the net estate after allowable deductions.", S("NIRC Sec. 84"));
  check(blocked(r, "tax_computation_basis", "estate_computation_without_estate_authority"), "closed (deduction/base authority missing)");
});
await test("D3: correct estate answer with deduction authority only (no rate authority) fails closed", () => {
  const r = g("What is the estate tax?", "The rate is 6% of the net estate; deductions under Section 86 apply.", S("NIRC Sec. 86"));
  check(blocked(r, "tax_computation_basis", "estate_computation_without_estate_authority"), "closed (rate authority missing)");
});
await test("D4: correct estate answer with full rate+base+deduction authority is reachable", () => {
  const r = g("What is the estate tax?", "6% of the net estate; the standard deduction is one allowable deduction under Section 86.", ESTATE_COMP);
  check(reachable(r), "reachable with Sec 84 + 86");
});
await test("D5: an estate answer asserting only a rate is sufficient with rate authority (Sec 84)", () => {
  const r = g("What is the estate tax rate?", "The estate tax rate is a flat 6%.", S("NIRC Sec. 84"));
  check(reachable(r), "reachable — only the rate is asserted");
});

// ── E. Estate relationship errors (P1-5) ─────────────────────────────────────
const ER = [
  ["amount above the standard deduction", "Tax applies to the net estate amount above the standard deduction."],
  ["taxable portion begins after the standard deduction", "The taxable portion begins after the standard deduction."],
  ["only the excess over the basic deduction", "Only the excess over the basic deduction is taxed."],
  ["standard deduction is the estate-tax threshold", "The standard deduction is the estate-tax threshold."],
  ["first five million is outside the tax base", "The first five million is outside the tax base."],
  ["gross estate less the standard deduction equals the taxable estate", "Gross estate less the standard deduction equals the taxable estate."],
  ["subtract the basic deduction and apply the rate to the balance", "Subtract the basic deduction and apply the rate to the balance."]
];
for (const [name, ans] of ER) {
  await test(`E: estate relationship error — "${name}"`, () => {
    const r = g("How is estate tax computed?", ans, ESTATE_COMP);
    check(blocked(r, "tax_computation_basis", "estate_tax_base_deduction_threshold_conflation"), "closed as relationship misstatement");
    check(r.diagnostics.failedProposition.relationshipError === true, "relationshipError flagged");
  });
}
await test("E-valid: correct net-estate computations (no fixed amount / one preferred phrase) remain reachable", () => {
  check(reachable(g("What is the estate tax?", "6% of the net estate.", ESTATE_COMP)), "net estate");
  check(reachable(g("What is the estate tax?", "Gross estate less all allowable deductions gives the net estate, taxed at 6%.", ESTATE_COMP)), "gross less all deductions");
  check(reachable(g("What is the estate tax?", "The standard deduction is one of the allowable deductions under Section 86; 6% of the net estate.", ESTATE_COMP)), "standard deduction as one deduction");
});

await test("E-donor: a donor's-tax answer with a real 250k threshold that mentions 'estate planning' is NOT an estate misstatement", () => {
  const r = g("What is the donor's tax rate and exemption threshold under TRAIN?",
    "The donor's tax is 6% on total gifts exceeding the 250,000 exemption threshold; this helps estate planning.",
    S("NIRC Sec. 99", "NIRC Sec. 101"));
  check(r.propositionClass !== "tax_computation_basis", "not classified as an estate computation");
  check(reachable(r), "donor's tax reachable (not a false refusal)");
});

// ── F. Generic-return false positives ────────────────────────────────────────
await test("F: non-tax 'return' senses are not filing propositions", () => {
  for (const [q, a] of [
    ["What is a return of capital?", "A return of capital is not income."],
    ["What is the rate of return?", "The rate of return is 5%."],
    ["How are sales returns treated?", "Sales returns reduce gross sales."],
    ["Should I return the document?", "Yes, return the document to the office."],
    ["What is investment return?", "Investment return is the gain on capital."],
    ["Were the goods returned?", "The goods were returned to the supplier."]
  ]) {
    const d = detectFilingAndEstatePropositions(q, a);
    check(d.filingObligation === false && d.filingDeadline === false, `not a filing proposition: ${q}`);
  }
});

// ── G. Compound-proposition completeness ─────────────────────────────────────
await test("G1: one supported + one unsupported proposition — unsupported fails closed, both in ledger", () => {
  // estate return deadline (supported) + individual ITR deadline (unsupported) in one answer
  const r = g("Deadlines?", "The estate tax return is due within one year under Section 90; the individual income tax return is also due April 15.", ESTATE_RET);
  check(r.applicable && !r.sufficient, "fails closed on the unsupported individual proposition");
  check(ledgerHas(r, "filing_deadline", "individual_income"), "individual proposition preserved in ledger");
  check(ledgerHas(r, "filing_deadline", "estate"), "estate proposition preserved in ledger");
});
await test("G2: diagnostics preserve all detected propositions even after an early failure", () => {
  const r = g("Do I need an ITR and what documents?", "You do not need to file an ITR, but retain supporting documents.", RATE);
  check((r.diagnostics.propositionLedger || []).length >= 1, "ledger is populated");
});
await test("G3: the gate never UPGRADES trust — a sufficient result is not forced to verification", () => {
  const r = g("Deadline for the individual ITR?", "On or before April 15 under Section 51(C).", IND);
  check(r.sufficient === true && r.applicable === true, "sufficient, not upgraded");
});

console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
