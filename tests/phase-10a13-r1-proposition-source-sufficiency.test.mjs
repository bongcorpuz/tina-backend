// PHASE-10A13-R1-PROPOSITION-SOURCE-SUFFICIENCY
//
// Remediates the A13-confirmed source-card-laundering defects Q38 (registration /
// form-selection proposition verified on withholding + foundational authority) and
// Q46 (transaction-specific VAT exception verified on general VAT-imposition
// authority). Adds two proposition classes to evaluatePropositionSourceSufficiency:
//   - registration_procedural: registration / form / procedure claims require
//     registration authority (NIRC Sec 236/237/238, registration RRs/RMCs) -> fail
//     closed on foundational (Sec 1-6), withholding, general, or adjacent authority;
//   - vat_exception: exempt / zero-rated / not-subject-to-VAT / outside-scope claims
//     require exemption/zero-rating/exception authority (Sec 109, the zero-rating
//     subsections, specific exception/incentive laws) -> fail closed on general
//     VAT-imposition authority alone.
// Class-based; no question IDs, exact prompts, or answer-string deny lists. Valid
// VERIFIED_CONTROLLING reachability preserved when the matching authority is cited.

import assert from "node:assert/strict";
import { evaluatePropositionSourceSufficiency, evaluateAnswerSupport } from "../services/answer-support-validator.js";

let passed = 0, failed = 0, assertions = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}
function check(c, m) { assertions++; assert(c, m); }
const g = (question, answer, sources) => evaluatePropositionSourceSufficiency({ question, answer, sources });
const blocked = (r, cls) => r.applicable && !r.sufficient && r.propositionClass === cls;
const reachable = (r) => r.applicable === false || r.sufficient === true;

// Authority fixtures
const FOUNDATIONAL = [{ label: "NIRC Sec. 2" }, { label: "NIRC Sec. 3" }];
const WITHHOLDING = [{ label: "RR No. 2-1998" }, { label: "RR No. 11-2018" }];
const REG_AUTH = [{ label: "NIRC Sec. 236" }, { label: "RR No. 7-2012" }];
const GENERIC_VAT = [{ label: "NIRC Sec. 105" }, { label: "NIRC Sec. 106" }, { label: "NIRC Sec. 107" }, { label: "NIRC Sec. 108" }, { label: "RR 16-2005" }];
const SEC109 = [{ label: "NIRC Sec. 109" }];
const RA11256 = [{ label: "R.A. No. 11256" }, { label: "NIRC Sec. 109" }];
const INCENTIVE = [{ label: "RA No. 12066 (CREATE MORE)" }, { label: "NIRC Sec. 295" }];

// Exact committed A13 defects
const Q38_A = "### Short Answer\nYes, a new business is required to register with the BIR before commencing operations. The form used for registration is BIR Form No. 1901 for self-employed individuals or BIR Form No. 1902 for employees earning compensation income.";
const Q38_Q = "Is a new business required to register with the BIR, and what form is used?";
const Q46_A = "### Short Answer\nThe sale of gold by a small-scale miner to the Bangko Sentral ng Pilipinas is not subject to VAT.";
const Q46_Q = "Is the sale of gold by a small-scale miner to the Bangko Sentral ng Pilipinas subject to VAT?";

// ── Registration / procedural ────────────────────────────────────────────────
await test("R1: Q38 exact — registration answer on withholding + foundational authority fails closed", async () => {
  const r = g(Q38_Q, Q38_A, [{ label: "RR No. 11-2018" }, { label: "RR No. 2-1998" }, { label: "NIRC Sec. 2" }, { label: "NIRC Sec. 3" }]);
  check(blocked(r, "registration_procedural"), "fails closed as registration");
  const e = await evaluateAnswerSupport({ question: Q38_Q, answer: Q38_A, sources: [{ label: "RR No. 11-2018" }, { label: "NIRC Sec. 2" }] });
  check(e.verifiedEligible === false && e.stage === "proposition-source-sufficiency", "eval fails closed at gate");
});
await test("R2: employee form used for a business, foundational authority only, fails closed", () => {
  check(blocked(g("Is a new business required to register, and what form?", "Yes, register using BIR Form 1902.", FOUNDATIONAL), "registration_procedural"), "closed");
});
await test("R3: business registration supported only by withholding authority fails closed", () => {
  check(blocked(g("Does a new corporation need to register with the BIR?", "Yes, it must register.", WITHHOLDING), "registration_procedural"), "closed");
});
await test("R4: correct form + correct registration authority (Sec 236) is reachable", () => {
  check(reachable(g(Q38_Q, "Yes, register under Section 236; a sole proprietor uses BIR Form 1901, a corporation/partnership uses 1903.", REG_AUTH)), "reachable");
});
await test("R5: registration amendment/closure proposition on generic authority fails closed", () => {
  check(blocked(g("How do I cancel my BIR registration when closing a business?", "File to cancel the registration.", GENERIC_VAT), "registration_procedural"), "closed");
});
await test("R6: a tax-RETURN-form question is NOT a registration proposition (no over-fire)", () => {
  const r = g("What BIR form is used for the annual income tax return of a self-employed individual?", "BIR Form 1701 is used for the annual ITR.", [{ label: "NIRC Sec. 51" }]);
  check(r.propositionClass !== "registration_procedural", "not registration");
});

// ── Transaction-specific VAT treatment ───────────────────────────────────────
await test("V1: Q46 exact — 'not subject to VAT' on general VAT authority fails closed", async () => {
  const r = g(Q46_Q, Q46_A, GENERIC_VAT);
  check(blocked(r, "vat_exception"), "fails closed as vat_exception");
  const e = await evaluateAnswerSupport({ question: Q46_Q, answer: Q46_A, sources: GENERIC_VAT });
  check(e.verifiedEligible === false && e.stage === "proposition-source-sufficiency", "eval fails closed at gate");
});
await test("V2: VAT-exempt claim on general VAT authority fails closed", () => {
  check(blocked(g("Is the sale VAT-exempt?", "Yes, the transaction is VAT-exempt.", GENERIC_VAT), "vat_exception"), "closed");
});
await test("V3: zero-rated claim on general VAT authority fails closed", () => {
  check(blocked(g("Is this export sale zero-rated?", "Yes, it is zero-rated.", GENERIC_VAT), "vat_exception"), "closed");
});
await test("V4: exemption with Sec 109 / specific exception authority is reachable", () => {
  check(reachable(g(Q46_Q, "The sale of gold to the BSP is VAT-exempt under RA No. 11256.", RA11256)), "reachable");
  check(reachable(g("Is residential lease at 15,000/month VAT-exempt?", "Yes, VAT-exempt under Section 109.", SEC109)), "reachable");
});
await test("V5: valid Q5-style zero-rating/exemption with incentive authority (RA 12066) is reachable", () => {
  check(reachable(g("How is import VAT treated for a registered export enterprise under CREATE MORE?", "Directly attributable imports are VAT-exempt under RA No. 12066, subject to conditions.", INCENTIVE)), "reachable");
});
await test("V6: general 12% VAT rule (not an exception) is not applicable (no over-fire)", () => {
  check(g("What is the VAT rate on the sale of goods?", "The sale of goods is subject to 12% VAT under Section 106.", [{ label: "NIRC Sec. 106" }]).applicable === false, "not applicable");
});
await test("V7: income-tax exemption is not misclassified as a VAT exception", () => {
  check(g("Is 250k compensation exempt?", "Yes, 250,000 is exempt from income tax.", [{ label: "NIRC Sec. 24" }]).applicable === false, "not vat_exception");
});

// ── Cross-class / laundering ─────────────────────────────────────────────────
await test("X1: foundational-authority laundering (registration) fails closed", () => {
  check(blocked(g("Must a new business register with the BIR?", "Yes, it must register.", [{ label: "NIRC Sec. 1" }, { label: "NIRC Sec. 4" }]), "registration_procedural"), "closed");
});
await test("X2: same-tax-type but wrong-proposition authority (VAT imposition for a VAT exception) fails closed", () => {
  check(blocked(g("Is this specific sale exempt from VAT?", "Yes, it is exempt from VAT.", GENERIC_VAT), "vat_exception"), "closed");
});
await test("X3: no blanket suppression — a valid registration and a valid VAT-exception both verify-reachable", () => {
  check(reachable(g("Does a new corporation register with the BIR?", "Yes, under Section 236 using BIR Form 1903.", REG_AUTH)), "registration reachable");
  check(reachable(g("Is this transaction VAT-exempt?", "Yes, VAT-exempt under Section 109.", SEC109)), "vat-exception reachable");
});
await test("X4: gate never upgrades trust — a sufficient result does not force verification", () => {
  const r = g(Q38_Q, "Yes, register under Section 236 using BIR Form 1901/1903.", REG_AUTH);
  check(r.sufficient === true, "sufficient (gate does not block, does not upgrade)");
});

console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
