// PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-1
//
// A structurally valid attestation must not verify a materially reversed /
// threshold-substituted / source-contradicted tax treatment (the confirmed
// Q8-r2 defect). Covers: the deterministic treatment-contradiction guard
// (overrides LLM approval), the new mandatory source-contradiction schema
// fields, accessor/getter hardening of isVerifiedAnswerSupport, and preservation
// of Q5/Q35/Q41 + restricted/conflict/missing/source-failure behavior. The LLM
// stage uses an injected mock so tests are deterministic.

import assert from "node:assert/strict";
import { buildResponseTrust, isVerifiedAnswerSupport } from "../services/trust-contract.js";
import {
  evaluateAnswerSupport,
  detectTreatmentContradiction,
  detectImportVatExemptionOmission,
  REQUIRED_POSITIVE_BOOLEANS,
  REQUIRED_NEGATIVE_BOOLEANS
} from "../services/answer-support-validator.js";

let passed = 0, failed = 0, assertions = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}
function check(c, m) { assertions++; assert(c, m); }

const mock = (v) => ({ chat: { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify(v) } }] }) } } });
// Full canonical verdict (all 14 positive true, all 3 negative false).
const FULL = Object.freeze(Object.assign(
  Object.fromEntries(REQUIRED_POSITIVE_BOOLEANS.map((f) => [f, true])),
  Object.fromEntries(REQUIRED_NEGATIVE_BOOLEANS.map((f) => [f, false])),
  { reason: "ok" }
));
const SRC = [{ label: "NIRC Sec. 27(A)" }];
const GOODANS = "### Short Answer\nThe standard corporate income tax rate for domestic corporations is 25% of taxable income under NIRC Section 27(A), a complete and correct statement of the controlling rule.";
const Q8_WRONG = "### Issue Presented\nIs leasing a residential unit at ₱15,000 per month subject to VAT?\n### Short Answer\nYes, leasing a residential unit at ₱15,000 per month is subject to VAT if the lessor's total annual rental income exceeds ₱3,000,000.";
const Q8_CORRECT = "### Short Answer\nNo. A residential unit leased at ₱15,000 per month is VAT-exempt under Section 109 because the per-unit monthly rent does not exceed the ₱15,000 threshold, regardless of the lessor's total annual rental income.";

async function trustFor(question, answer, verdict, sources = SRC) {
  const answerSupport = await evaluateAnswerSupport({ question, answer, sources, client: mock(verdict) });
  return { trust: buildResponseTrust({ answer, answerSupport }, sources.length || 1, "AUTHORITY_FOUND"), answerSupport };
}

// C1: Q8 reversed answer with valid schema + LLM approval -> deterministic guard overrides.
await test("C1: Q8 reversed answer + valid schema + LLM-approved -> guard overrides, not verified", async () => {
  const { trust, answerSupport } = await trustFor("Is leasing a residential unit at ₱15,000 per month subject to VAT?", Q8_WRONG, FULL);
  check(answerSupport.stage === "treatment-contradiction", `expected guard stage, got ${answerSupport.stage}`);
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `must not verify, got ${trust.authoritySupport}`);
});
// C2: Q8 correct answer -> verified reachable.
await test("C2: Q8 correct exempt answer -> verified reachable", async () => {
  const { trust } = await trustFor("Is leasing a residential unit at ₱15,000 per month subject to VAT?", Q8_CORRECT, FULL);
  check(trust.authoritySupport === "VERIFIED_CONTROLLING", `expected verified, got ${trust.authoritySupport}`);
});
// C3/C4 threshold substitution / general rule -> guard (via detector).
await test("C3-C4: aggregate-threshold substitution / general-rule reversal detected", () => {
  check(detectTreatmentContradiction("Is a ₱15,000/month residential unit VATable?", Q8_WRONG).contradiction === true, "threshold substitution");
  check(detectTreatmentContradiction("residential lease per unit", "### Short Answer\nYes the residential unit is subject to VAT because the lessor exceeds ₱3,000,000 total rental income.").contradiction === true, "general/aggregate reversal");
});
// C5: generic excerpt / no operative treatment (foundational-only sources) -> not verified.
await test("C5: foundational-only sources -> not verified", async () => {
  const { trust } = await trustFor("What is the penalty for X?", "### Short Answer\nThe penalty applies under the NIRC.", FULL, [{ label: "NIRC Sec. 2" }, { label: "NIRC Sec. 3" }]);
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", "foundational citation fails closed");
});
// C6: controlling source contradicts answer (LLM sets the field) -> not verified.
await test("C6: answerContradictsControllingSource true -> not verified", async () => {
  const { trust } = await trustFor("q", GOODANS, { ...FULL, answerContradictsControllingSource: true });
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", "contradiction field fails closed");
});
// C7-C9: new mandatory positive fields false -> not verified.
for (const [id, field] of [["C7", "treatmentDirectionMatches"], ["C8", "thresholdDimensionMatches"], ["C9", "sourcePropositionAligned"]]) {
  await test(`${id}: ${field} false -> not verified`, async () => {
    const { trust } = await trustFor("q", GOODANS, { ...FULL, [field]: false });
    check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `${field} false must fail closed`);
  });
}
// C7b-C9b: missing new mandatory field -> schema invalid -> not verified.
await test("C7b-C9b: missing a new mandatory field -> schema invalid, not verified", async () => {
  for (const field of ["treatmentDirectionMatches", "thresholdDimensionMatches", "sourcePropositionAligned", "answerContradictsControllingSource"]) {
    const v = { ...FULL }; delete v[field];
    const { trust, answerSupport } = await trustFor("q", GOODANS, v);
    check(answerSupport.schemaValid === false, `${field} missing -> schemaValid false`);
    check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `${field} missing -> not verified`);
  }
});
// C10: accessor getter returns true -> rejected.
await test("C10: accessor getter on schemaValid returns true -> not verified", () => {
  const obj = { verifiedEligible: true };
  Object.defineProperty(obj, "schemaValid", { get() { return true; }, enumerable: true, configurable: true });
  const r = isVerifiedAnswerSupport(obj);
  check(r.eligible === false, "accessor getter rejected");
  check(r.accessorFieldsRejected.includes("schemaValid"), "recorded as accessor");
  const t = buildResponseTrust({ answer: GOODANS, answerSupport: obj }, 1, "AUTHORITY_FOUND");
  check(t.authoritySupport === "RELATED_AUTHORITY_ONLY", "not verified");
});
// C11: throwing getter -> safe, no propagation.
await test("C11: throwing getter -> safe downgrade, no exception", () => {
  const obj = { verifiedEligible: true };
  Object.defineProperty(obj, "schemaValid", { get() { throw new Error("boom"); }, enumerable: true, configurable: true });
  let threw = false, r;
  try { r = isVerifiedAnswerSupport(obj); } catch { threw = true; }
  check(threw === false, "must not propagate");
  check(r.eligible === false, "not eligible");
  check(r.accessorFieldsRejected.includes("schemaValid"), "accessor rejected before read");
});
// C12: plain data-property canonical attestation -> verified reachable.
await test("C12: plain data-property attestation -> verified reachable", () => {
  const t = buildResponseTrust({ answer: GOODANS, answerSupport: { schemaValid: true, verifiedEligible: true } }, 1, "AUTHORITY_FOUND");
  check(t.authoritySupport === "VERIFIED_CONTROLLING", "plain data props verify");
});
// C13-C14 validator failure modes.
await test("C13-C14: malformed / unavailable validator -> not verified", async () => {
  const bad = { chat: { completions: { create: async () => ({ choices: [{ message: { content: "not json" } }] }) } } };
  const r1 = await evaluateAnswerSupport({ question: "q", answer: GOODANS, sources: SRC, client: bad });
  check(buildResponseTrust({ answer: GOODANS, answerSupport: r1 }, 1, "AUTHORITY_FOUND").authoritySupport === "RELATED_AUTHORITY_ONLY", "malformed");
  const r2 = await evaluateAnswerSupport({ question: "q", answer: GOODANS, sources: SRC, client: null });
  check(r2.verifiedEligible === false, "unavailable");
});
// C15-C17 preservation (cluster shapes fail closed).
await test("C15-C17: Q5/Q35/Q41 shapes -> not verified", async () => {
  const q5 = await trustFor("import VAT?", GOODANS, { ...FULL, materialExceptionsCovered: false, eligibleForVerifiedControlling: false });
  check(q5.trust.authoritySupport === "RELATED_AUTHORITY_ONLY", "Q5");
  const q35 = await trustFor("which form?", GOODANS, { ...FULL, materialAlternativesCovered: false, eligibleForVerifiedControlling: false });
  check(q35.trust.authoritySupport === "RELATED_AUTHORITY_ONLY", "Q35");
  const q41 = await trustFor("penalty?", "### Short Answer\nThe penalty is under the NIRC.", FULL, [{ label: "NIRC Sec. 2" }, { label: "NIRC Sec. 3" }]);
  check(q41.trust.authoritySupport === "RELATED_AUTHORITY_ONLY", "Q41 foundational");
});
// C18-C21 canonical safety states preserved.
await test("C18-C21: restricted / conflict / missing-authority / source-failure preserved", () => {
  const restricted = buildResponseTrust({ responseType: "controlled_loa_legal_conclusion_restricted", answer: "A conclusive determination cannot be made.", controlledLoaAnswer: { requiresHumanReview: true } }, 0, "NOT_APPLICABLE");
  check(restricted.legalConclusion === "RESTRICTED", "restricted");
  const conflictAnalysis = { hasConflict: true, conflict: true, conflictType: "DOCTRINAL_CONFLICT", exactIssue: "x", exactLegalDimension: "y", sameIssueGate: { passed: true }, oppositeHoldingGate: { passed: true }, resolutionBasis: "unresolved" };
  const conflict = buildResponseTrust({ answer: GOODANS, conflictAnalysis, answerSupport: { schemaValid: true, verifiedEligible: true } }, 2, "AUTHORITY_FOUND");
  check(conflict.authoritySupport === "CONFLICTING_AUTHORITY", "conflict");
  const missing = buildResponseTrust({ answer: "## Summary\nRelated only.", sourceOnlyFallback: true, specificAuthorityRequested: true, requestedAuthorityMatched: false }, 2, "AUTHORITY_FOUND");
  check(missing.authoritySupport === "RELATED_AUTHORITY_ONLY" && missing.specificAuthorityNotFound === true, "missing-authority");
  const fail = buildResponseTrust({ answer: "TINA could not complete source retrieval in time." }, 0, "RETRIEVAL_TIMEOUT");
  check(fail.authoritySupport === "NO_VERIFIED_AUTHORITY", "source failure");
});
// Import-VAT CREATE MORE material-exception guard (Q5 class).
const Q5_WRONG = "### Short Answer\nThe VAT rate on the importation of goods used to manufacture export products is 12%. The VAT on importation is uniformly set at 12% for all goods, regardless of their business activities.";
const Q5_CORRECT = "### Short Answer\nThe general rule is 12% import VAT, but under CREATE MORE, importation by an export-oriented enterprise (≥70% export) directly attributable to export activity may be VAT-exempt.";
await test("Cimport-1: export-mfg import-VAT answer omitting CREATE MORE exemption -> guard overrides, not verified", async () => {
  const { trust, answerSupport } = await trustFor("What is the VAT rate on importation of goods used to manufacture export products?", Q5_WRONG, FULL);
  check(answerSupport.stage === "material-exception-omission", `expected guard stage, got ${answerSupport.stage}`);
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `must not verify, got ${trust.authoritySupport}`);
});
await test("Cimport-2: import-VAT answer covering CREATE MORE -> verified reachable", async () => {
  const { trust } = await trustFor("What is the VAT rate on importation of goods used to manufacture export products?", Q5_CORRECT, FULL);
  check(trust.authoritySupport === "VERIFIED_CONTROLLING", `expected verified, got ${trust.authoritySupport}`);
});
await test("Cimport-3: import-VAT guard no false-positive on unrelated import / correct answer", () => {
  check(detectImportVatExemptionOmission("What is the VAT on imported cars?", "Imported cars are subject to 12% VAT uniformly.").contradiction === false, "unrelated import");
  check(detectImportVatExemptionOmission("import goods to manufacture export products", Q5_CORRECT).contradiction === false, "correct with CREATE MORE");
});

// polarity detector non-firing on unrelated / commercial / correct.
await test("polarity detector: no false-positive on unrelated / commercial / correct-exempt", () => {
  check(detectTreatmentContradiction("What is the estate tax rate?", "The estate tax rate is 6%.").contradiction === false, "unrelated");
  check(detectTreatmentContradiction("Is a commercial lease subject to VAT?", "Yes, a commercial lease exceeding ₱3,000,000 is subject to VAT.").contradiction === false, "commercial (not residential)");
  check(detectTreatmentContradiction("Is a ₱15,000/month residential unit VATable?", Q8_CORRECT).contradiction === false, "correct exempt");
});

console.log(`\nPHASE-10A12 validator-competence tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
