// PHASE-10A12-R6-PROPOSITION-SOURCE-SUFFICIENCY
//
// Remediates the confirmed R5 P1 class-level laundering defect: a decisive legal
// proposition (penalty computation / EWT conclusion) received VERIFIED_CONTROLLING
// on topic-adjacent-but-non-controlling authority (M-Q36 penalty on general VAT
// sections; M-Q25 EWT on VAT registration/invoicing authority). The
// evaluatePropositionSourceSufficiency control fails closed when the decisive
// proposition lacks a controlling authority of its own class, while preserving
// valid VERIFIED_CONTROLLING reachability when the matching authority is cited.
//
// Deterministic (no network). Keys on proposition class + authority class, not
// question IDs / exact strings / answer-specific deny lists.

import assert from "node:assert/strict";
import {
  evaluatePropositionSourceSufficiency,
  evaluateAnswerSupport
} from "../services/answer-support-validator.js";

let passed = 0, failed = 0, assertions = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}
function check(c, m) { assertions++; assert(c, m); }

const g = (question, answer, sources) => evaluatePropositionSourceSufficiency({ question, answer, sources });

// Source-card fixtures
const GENERIC_VAT = [{ label: "NIRC Sec. 105" }, { label: "NIRC Sec. 106" }, { label: "NIRC Sec. 107" }, { label: "NIRC Sec. 108" }, { label: "RR 16-2005" }];
const GENERIC_INCOME = [{ label: "NIRC Sec. 24" }, { label: "NIRC Sec. 27" }];
const VAT_REG = [{ label: "NIRC Sec. 109" }, { label: "NIRC Sec. 236" }, { label: "RR No. 16-2005" }, { label: "RMC 75-2015" }];
const PENALTY_AUTH = [{ label: "NIRC Sec. 248" }, { label: "NIRC Sec. 249" }];
const EOPT_PENALTY = [{ label: "RA No. 11976 (EOPT)" }, { label: "RR No. 6-2024" }, { label: "NIRC Sec. 248" }];
const WHT_AUTH = [{ label: "RR No. 2-1998" }, { label: "RR No. 11-2018" }, { label: "RMC 50-2018" }];

// The exact committed R5 invalid-verified answers.
const Q36_ANSWER = `### Short Answer
Penalties for late filing of a VAT return include a fine of PHP 1,000 and an additional 25% of the tax due for each month of delay, not exceeding 50% of the total tax due.`;
const Q36_Q = "What penalties apply to late filing of a VAT return?";
const Q25_ANSWER = `### Short Answer
Yes, Expanded Withholding Tax (EWT) is required on payments to a VAT-registered law firm. When a business pays for these services, it must withhold EWT.`;
const Q25_Q = "Is EWT required on payments to a VAT-registered law firm?";

// ── A. Penalty / procedural ──────────────────────────────────────────────────
await test("A1: M-Q36 exact — penalty on generic VAT authority fails closed", async () => {
  const r = g(Q36_Q, Q36_ANSWER, GENERIC_VAT);
  check(r.applicable && !r.sufficient, "not sufficient");
  check(r.propositionClass === "penalty_procedural", "penalty class");
  check(r.reason === "penalty_proposition_without_penalty_authority", "reason");
  const e = await evaluateAnswerSupport({ question: Q36_Q, answer: Q36_ANSWER, sources: GENERIC_VAT });
  check(e.verifiedEligible === false && e.stage === "proposition-source-sufficiency", "eval fails closed at gate");
});
await test("A2: generic income-tax authority supporting a penalty claim fails closed", () => {
  const r = g("What is the penalty for late payment of income tax?", "A surcharge of 25% applies for late payment.", GENERIC_INCOME);
  check(!r.sufficient && r.propositionClass === "penalty_procedural", "fails closed");
});
await test("A3: missing penalty-specific authority (no sources) fails closed", () => {
  const r = g("What surcharge applies to a late filing?", "A 25% surcharge applies.", []);
  check(!r.sufficient, "fails closed");
});
await test("A4: correct penalty authority (Sec 248/249) is sufficient", () => {
  const r = g(Q36_Q, "A 25% surcharge (Sec 248) and 12% p.a. interest (Sec 249) apply.", PENALTY_AUTH);
  check(r.sufficient === true, "sufficient");
  check(r.diagnostics.hasPenaltyAuthority === true, "penalty authority present");
});
await test("A5: EOPT/RA 11976 penalty relief authority is sufficient", () => {
  const r = g("What penalties apply to late filing of a VAT return for a micro taxpayer?", "Reduced EOPT penalties apply: a 10% surcharge and reduced interest.", EOPT_PENALTY);
  check(r.sufficient === true, "sufficient");
});
await test("A6: surcharge-vs-interest one-time-vs-periodic — still requires penalty authority", () => {
  const r = g("Is the 25% surcharge for late filing a one-time or monthly charge?", "The 25% surcharge is one-time; interest accrues per annum.", GENERIC_VAT);
  check(!r.sufficient, "fails closed on generic VAT authority");
});
await test("A7: late filing vs late payment both classify as penalty propositions", () => {
  check(g("penalty for late payment of VAT", "25% surcharge.", GENERIC_VAT).applicable, "late payment applicable");
  check(g("penalty for late filing of VAT", "25% surcharge.", GENERIC_VAT).applicable, "late filing applicable");
});

// ── B. M-Q25 EWT legal-form class ────────────────────────────────────────────
await test("B1: M-Q25 exact — EWT on VAT registration/invoicing authority fails closed", async () => {
  const r = g(Q25_Q, Q25_ANSWER, VAT_REG);
  check(r.applicable && !r.sufficient, "not sufficient");
  check(r.propositionClass === "withholding_ewt", "ewt class");
  check(r.reason === "ewt_proposition_without_withholding_authority", "reason");
  const e = await evaluateAnswerSupport({ question: Q25_Q, answer: Q25_ANSWER, sources: VAT_REG });
  check(e.verifiedEligible === false && e.stage === "proposition-source-sufficiency", "eval fails closed at gate");
});
await test("B2: EWT paraphrases on VAT authority fail closed", () => {
  check(!g("Do we withhold expanded withholding tax on fees paid to a law firm?", "Yes, withhold EWT.", VAT_REG).sufficient, "para1");
  check(!g("Is creditable withholding tax required on professional fees to a VAT-registered accounting firm?", "Yes, creditable withholding applies.", VAT_REG).sufficient, "para2");
});
await test("B3: valid EWT answer with withholding authority is sufficient (reachable)", () => {
  const r = g(Q25_Q, "Creditable EWT applies to professional fees; a qualifying GPP's receipts are not subject to creditable EWT, per RR 2-1998 as amended by RR 11-2018.", WHT_AUTH);
  check(r.sufficient === true, "sufficient");
  check(r.diagnostics.hasWithholdingAuthority === true, "withholding authority present");
});
await test("B4: near-miss — EWT answer citing only VAT + income sections fails closed", () => {
  check(!g(Q25_Q, "Yes, withhold EWT on the law firm's fees.", [...GENERIC_VAT, ...GENERIC_INCOME]).sufficient, "fails closed");
});
await test("B5: FINAL withholding tax on passive income is NOT the EWT class (no false refusal)", () => {
  const r = g("Is interest on a Philippine peso savings account subject to final withholding tax?", "Yes, interest income is subject to 20% final withholding tax.", GENERIC_INCOME);
  check(r.applicable === false, "final WHT is not the EWT proposition class");
});

// ── C. Cross-domain non-applicability / no over-fire ─────────────────────────
await test("C1: substantive VAT/income/estate/registration/invoicing questions are not applicable", () => {
  const cases = [
    ["What is the VAT rate on importation?", "12%.", GENERIC_VAT],
    ["What is the estate tax rate under TRAIN?", "6%.", [{ label: "NIRC Sec. 84" }]],
    ["Is a new business required to register with the BIR?", "Yes, register using BIR Form 1901.", [{ label: "NIRC Sec. 236" }]],
    ["Can a non-VAT seller issue a VAT invoice?", "No.", [{ label: "NIRC Sec. 236" }]],
    ["What is the deadline for filing an estate tax return?", "Within one year of death; 30-day extension possible.", [{ label: "NIRC Sec. 90" }]]
  ];
  for (const [q, a, s] of cases) check(g(q, a, s).applicable === false, `not applicable: ${q}`);
});
await test("C2: penalty mentioned incidentally in a non-penalty answer does NOT trip the gate (question-led)", () => {
  // A registration answer that mentions penalties in passing must not be gated as a penalty proposition.
  const r = g("Is a new business required to register with the BIR, and what form is used?",
    "Yes, register using BIR Form 1901. Failure to register may result in penalties and interest.", [{ label: "NIRC Sec. 236" }]);
  check(r.applicable === false, "question-led: not a penalty proposition");
});
await test("C3: withholding-tax assessment procedure question without EWT answer claim not over-blocked", () => {
  const r = g("What is the BIR assessment period when a taxpayer filed a return?", "Three years from filing under Sec 203.", [{ label: "NIRC Sec. 203" }]);
  check(r.applicable === false, "assessment-period question is not penalty/EWT");
});

// ── Non-regression: the gate never UPGRADES trust ────────────────────────────
await test("D1: gate only withholds — a sufficient result does not force verification", () => {
  const r = g(Q36_Q, "A 25% surcharge (Sec 248) and 12% interest (Sec 249) apply.", PENALTY_AUTH);
  check(r.sufficient === true, "sufficient (gate does not block)");
  // evaluateAnswerSupport still requires the downstream LLM/schema stage; without a client it fails closed at 'unavailable', NOT at the proposition gate.
});

console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
