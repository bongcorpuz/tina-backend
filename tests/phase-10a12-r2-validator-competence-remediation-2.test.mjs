// PHASE-10A12-R2-VALIDATOR-COMPETENCE-REMEDIATION-2
//
// Hardens the DIRECT schema validator against accessor descriptors (a getter
// must never execute during safety validation, including via a proxy that
// throws in getOwnPropertyDescriptor), and confirms the Q8 paraphrase
// false-refusal fix. Complements the trust-contract accessor hardening.

import assert from "node:assert/strict";
import {
  validateVerdictSchema,
  REQUIRED_POSITIVE_BOOLEANS,
  REQUIRED_NEGATIVE_BOOLEANS
} from "../services/answer-support-validator.js";
import { isVerifiedAnswerSupport } from "../services/trust-contract.js";
import { detectPhilippineTaxBoundary } from "../services/philippine-tax-domain-boundary.js";

let passed = 0, failed = 0, assertions = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}
function check(c, m) { assertions++; assert(c, m); }

const FULL = () => Object.assign(
  Object.fromEntries(REQUIRED_POSITIVE_BOOLEANS.map((f) => [f, true])),
  Object.fromEntries(REQUIRED_NEGATIVE_BOOLEANS.map((f) => [f, false]))
);

// R1: direct schema validator must NOT execute an own getter on a mandatory field.
await test("R2-1: direct validateVerdictSchema does not execute a getter, and fails closed", () => {
  let executed = false;
  const o = FULL();
  Object.defineProperty(o, "eligibleForVerifiedControlling", { get() { executed = true; return true; }, enumerable: true, configurable: true });
  const r = validateVerdictSchema(o);
  check(executed === false, "getter must NOT execute");
  check(r.verifiedEligible === false, "accessor -> not verified");
  check(r.invalidTypeFields.includes("eligibleForVerifiedControlling"), "recorded as invalid type");
});
// R2: getter returning false also rejected (never read).
await test("R2-2: getter returning false is rejected without execution", () => {
  let executed = false;
  const o = FULL();
  Object.defineProperty(o, "contradictsSources", { get() { executed = true; return false; }, enumerable: true, configurable: true });
  const r = validateVerdictSchema(o);
  check(executed === false, "getter not executed");
  check(r.verifiedEligible === false, "not verified");
});
// R3: throwing getter -> safe, no propagation.
await test("R2-3: throwing getter -> no exception propagates, not verified", () => {
  const o = FULL();
  Object.defineProperty(o, "schemaValid" in o ? "propositionSupported" : "propositionSupported", { get() { throw new Error("boom"); }, enumerable: true, configurable: true });
  let threw = false, r;
  try { r = validateVerdictSchema(o); } catch { threw = true; }
  check(threw === false, "must not propagate");
  check(r.verifiedEligible === false, "not verified");
});
// R4: proxy that throws in getOwnPropertyDescriptor -> safe.
await test("R2-4: proxy throwing in getOwnPropertyDescriptor -> safe, not verified", () => {
  const target = FULL();
  const p = new Proxy(target, { getOwnPropertyDescriptor() { throw new Error("descriptor boom"); } });
  let threw = false, r;
  try { r = validateVerdictSchema(p); } catch { threw = true; }
  check(threw === false, "must not propagate");
  check(r.verifiedEligible === false, "not verified");
});
// R5: proxy returning a malformed (accessor) descriptor -> rejected.
await test("R2-5: proxy returning accessor descriptor -> rejected", () => {
  const target = FULL();
  const p = new Proxy(target, {
    getOwnPropertyDescriptor(t, k) {
      if (k === "eligibleForVerifiedControlling") return { get() { return true; }, enumerable: true, configurable: true };
      return Object.getOwnPropertyDescriptor(t, k);
    }
  });
  const r = validateVerdictSchema(p);
  check(r.verifiedEligible === false, "accessor descriptor -> not verified");
});
// R6: plain JSON-parsed object still accepted.
await test("R2-6: plain JSON-parsed full verdict -> verified eligible", () => {
  const r = validateVerdictSchema(JSON.parse(JSON.stringify(FULL())));
  check(r.verifiedEligible === true && r.schemaValid === true, "plain object verifies");
});
// R7: frozen / null-proto / exotic objects.
await test("R2-7: frozen ok; null-proto ok (data props); Date/array/class rejected", () => {
  check(validateVerdictSchema(Object.freeze(FULL())).verifiedEligible === true, "frozen data verifies");
  const np = Object.assign(Object.create(null), FULL());
  check(validateVerdictSchema(np).verifiedEligible === true, "null-proto data verifies");
  check(validateVerdictSchema(new Date()).verifiedEligible === false, "Date rejected");
  check(validateVerdictSchema([]).verifiedEligible === false, "array rejected");
  class C {} const inst = Object.assign(new C(), FULL());
  check(validateVerdictSchema(inst).verifiedEligible === true, "own data props on instance ok (no accessors)");
});
// R8: trust-contract isVerifiedAnswerSupport getter rejection (companion path).
await test("R2-8: isVerifiedAnswerSupport rejects accessor without execution", () => {
  let executed = false;
  const as = { verifiedEligible: true };
  Object.defineProperty(as, "schemaValid", { get() { executed = true; return true; }, enumerable: true, configurable: true });
  const r = isVerifiedAnswerSupport(as);
  check(executed === false, "trust-contract getter not executed");
  check(r.eligible === false && r.accessorFieldsRejected.includes("schemaValid"), "rejected");
});
// R9: Q8 paraphrase false-refusal fix.
await test("R2-9: Q8 residential-lease paraphrases now ALLOW (not domain-boundary)", () => {
  for (const q of [
    "Which controls: the per-unit residential exemption or the lessor's total annual rental income?",
    "What if the lessor owns many residential units but each is rented below the statutory monthly threshold?",
    "Is residential rent of ₱15,000 per month VAT-exempt?"
  ]) {
    const r = detectPhilippineTaxBoundary(q, "/ask");
    check(r.decision === "ALLOW" && r.isPhilippineTax === true, `expected ALLOW for: ${q}`);
  }
  check(detectPhilippineTaxBoundary("How do I bake bread?", "/ask").decision === "REJECT", "non-tax still rejected");
});

console.log(`\nPHASE-10A12-R2 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
