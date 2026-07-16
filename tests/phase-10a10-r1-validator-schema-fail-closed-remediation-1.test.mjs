// PHASE-10A10-R1-VALIDATOR-SCHEMA-FAIL-CLOSED-REMEDIATION-1
//
// The answer-support validator must STRICTLY fail closed: VERIFIED_CONTROLLING
// is impossible unless every mandatory safety field is an OWN, boolean-typed
// property with the safe value. Absent / undefined / null / wrong-type /
// inherited / partial / risk-true verdicts must not yield verified eligibility.
// eligibleForVerifiedControlling===true is necessary but not sufficient.

import assert from "node:assert/strict";
import { buildResponseTrust } from "../services/trust-contract.js";
import {
  evaluateAnswerSupport,
  validateVerdictSchema,
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
const SUB = "### Short Answer\nThe standard corporate income tax rate for domestic corporations is 25% of taxable income under NIRC Section 27(A) as amended by the CREATE Act, with a 20% preferential rate for qualifying corporations meeting the net-taxable-income and total-asset conditions.";
const SRC = [{ label: "NIRC Sec. 27(A)" }];
const FULL = Object.freeze({ answerResponsive: true, primaryIssueAnswered: true, requiredIssueKeysCovered: true, materialExceptionsCovered: true, materialAlternativesCovered: true, citationRelevant: true, citationSupportsProposition: true, substantive: true, propositionSupported: true, materiallyComplete: true, treatmentDirectionMatches: true, thresholdDimensionMatches: true, sourcePropositionAligned: true, answerContradictsControllingSource: false, contradictsSources: false, unsupportedMaterialProposition: false, eligibleForVerifiedControlling: true, reason: "ok" });

async function evalVerdict(v) { return evaluateAnswerSupport({ question: "q", answer: SUB, sources: SRC, client: mock(v) }); }
async function trustFor(v) { const answerSupport = await evalVerdict(v); return buildResponseTrust({ answer: SUB, answerSupport }, 1, "AUTHORITY_FOUND"); }
function without(field) { const c = { ...FULL }; delete c[field]; return c; }

// S1 complete valid schema -> verified reachable
await test("S1: complete valid schema -> verifiedEligible & VERIFIED_CONTROLLING reachable", async () => {
  const r = await evalVerdict(FULL);
  check(r.verifiedEligible === true && r.schemaValid === true, "full schema eligible");
  const t = await trustFor(FULL);
  check(t.authoritySupport === "VERIFIED_CONTROLLING", `verified reachable, got ${t.authoritySupport}`);
});

// S2 missing one positive field -> schema invalid, not verified
await test("S2: missing one positive field -> schemaValid false, not verified", async () => {
  const r = await evalVerdict(without("citationRelevant"));
  check(r.schemaValid === false && r.verifiedEligible === false, "missing positive fails closed");
  check(r.missingFields.includes("citationRelevant"), "missingFields reports it");
});

// S3 missing every A10 field
await test("S3: only A8-era fields (missing all new A10 fields) -> not verified", async () => {
  const r = await evalVerdict({ substantive: true, propositionSupported: true, materiallyComplete: true, contradictsSources: false });
  check(r.verifiedEligible === false && r.schemaValid === false, "legacy partial fails closed");
  const t = await trustFor({ substantive: true, propositionSupported: true, materiallyComplete: true });
  check(t.authoritySupport === "RELATED_AUTHORITY_ONLY", "downgraded");
});

// S4 eligibleForVerifiedControlling missing
await test("S4: eligibleForVerifiedControlling missing -> not verified", async () => {
  const r = await evalVerdict(without("eligibleForVerifiedControlling"));
  check(r.verifiedEligible === false && r.missingFields.includes("eligibleForVerifiedControlling"), "missing eligibility field");
});

// S5 eligibleForVerifiedControlling false
await test("S5: eligibleForVerifiedControlling false -> not verified", async () => {
  const r = await evalVerdict({ ...FULL, eligibleForVerifiedControlling: false });
  check(r.verifiedEligible === false && r.invalidValueFields.includes("eligibleForVerifiedControlling"), "eligibility false");
});

// S6 eligibility true but a positive gate false
await test("S6: eligibility true but a positive gate false -> not verified", async () => {
  const r = await evalVerdict({ ...FULL, citationSupportsProposition: false });
  check(r.verifiedEligible === false && r.schemaValid === true, "value fails, shape valid");
});

// S7 eligibility true but risk field true
await test("S7: eligibility true but risk field true -> not verified", async () => {
  const r = await evalVerdict({ ...FULL, unsupportedMaterialProposition: true });
  check(r.verifiedEligible === false, "risk true fails closed");
});

// S8 eligibility true but risk field missing
await test("S8: eligibility true but risk field missing -> schema invalid, not verified", async () => {
  const r = await evalVerdict(without("unsupportedMaterialProposition"));
  check(r.schemaValid === false && r.verifiedEligible === false, "missing risk field fails closed");
});

// S9-S12 wrong types
for (const [id, field, bad] of [["S9 null", "materiallyComplete", null], ["S10 undefined", "citationRelevant", undefined], ["S11 string", "answerResponsive", "true"], ["S12 numeric", "primaryIssueAnswered", 1]]) {
  await test(`${id}: ${field}=${JSON.stringify(bad)} -> schema invalid, not verified`, async () => {
    const r = await evalVerdict({ ...FULL, [field]: bad });
    check(r.verifiedEligible === false, "wrong-type fails closed");
    // undefined own-property counts as missing OR invalid-type depending on JSON serialization; either way not eligible
    check(r.schemaValid === false, "schema invalid");
  });
}

// S13 empty object
await test("S13: empty object -> schema invalid, not verified", async () => {
  const r = await evalVerdict({});
  check(r.verifiedEligible === false && r.schemaValid === false, "empty fails closed");
  check(r.missingFields.length === REQUIRED_POSITIVE_BOOLEANS.length + REQUIRED_NEGATIVE_BOOLEANS.length, "all missing");
});

// S15 extra unknown fields tolerated, mandatory still required
await test("S15: extra unknown fields -> still verified when all mandatory present", async () => {
  const r = await evalVerdict({ ...FULL, someUnknownField: "x", anotherExtra: 42 });
  check(r.verifiedEligible === true, "extras tolerated");
});

// S16 prototype-inherited mandatory field rejected
await test("S16: inherited mandatory field -> rejected, not verified", async () => {
  const proto = { answerResponsive: true };
  const obj = Object.create(proto);
  Object.assign(obj, FULL);
  delete obj.answerResponsive; // now only on prototype
  const parsed = validateVerdictSchema(obj);
  check(parsed.verifiedEligible === false, "inherited fails closed");
  check(parsed.missingFields.includes("answerResponsive"), "treated as missing");
});

// S17 getter-based object handled safely (pure schema validation, no live call)
await test("S17: throwing getter on a mandatory field -> rejected safely", () => {
  const obj = { ...FULL };
  Object.defineProperty(obj, "citationRelevant", { get() { throw new Error("boom"); }, enumerable: true, configurable: true });
  const parsed = validateVerdictSchema(obj);
  check(parsed.verifiedEligible === false, "throwing getter fails closed");
  check(parsed.invalidTypeFields.includes("citationRelevant"), "recorded as invalid type");
});

// S18-S20 validator failure modes
await test("S18-S20: malformed / unavailable validator -> fail closed", async () => {
  const badClient = { chat: { completions: { create: async () => ({ choices: [{ message: { content: "not json" } }] }) } } };
  const r1 = await evaluateAnswerSupport({ question: "q", answer: SUB, sources: SRC, client: badClient });
  check(r1.verifiedEligible === false && r1.stage === "error", "malformed");
  const r2 = await evaluateAnswerSupport({ question: "q", answer: SUB, sources: SRC, client: null });
  check(r2.verifiedEligible === false, "unavailable");
});

// S21 legitimate verified control remains reachable (dup of S1 via trust)
await test("S21: legitimate verified control remains reachable", async () => {
  const t = await trustFor(FULL);
  check(t.authoritySupport === "VERIFIED_CONTROLLING", "verified reachable");
});

// S22-S24 cluster-shaped verdicts
await test("S22-S24: Q5 missing-exception / Q35 missing-alternative / Q41 non-responsive -> not verified", async () => {
  const q5 = await trustFor({ ...FULL, materialExceptionsCovered: false, materiallyComplete: false, eligibleForVerifiedControlling: false });
  check(q5.authoritySupport === "RELATED_AUTHORITY_ONLY", "Q5 shape");
  const q35 = await trustFor({ ...FULL, materialAlternativesCovered: false, eligibleForVerifiedControlling: false });
  check(q35.authoritySupport === "RELATED_AUTHORITY_ONLY", "Q35 shape");
  const q41 = await trustFor({ ...FULL, answerResponsive: false, citationRelevant: false, citationSupportsProposition: false, eligibleForVerifiedControlling: false });
  check(q41.authoritySupport === "RELATED_AUTHORITY_ONLY", "Q41 shape");
});

// S25 missing answerSupport entirely (internal caller absence)
await test("S25: missing answerSupport (undefined) -> verified not gated by validator, but no attestation to launder", () => {
  // The live ask path always sets answerSupport; internal deterministic callers
  // that omit it retain legacy retrieval-level behavior (documented). A partial
  // answerSupport object from the validator, however, can never be verified.
  const partial = buildResponseTrust({ answer: SUB, answerSupport: { verifiedEligible: false, schemaValid: false } }, 1, "AUTHORITY_FOUND");
  check(partial.authoritySupport === "RELATED_AUTHORITY_ONLY", "partial attestation not verified");
});

// S26 legacy validator shape cannot enter verified state in production
await test("S26: legacy (A8) validator shape -> not verified in production", async () => {
  const legacy = { responsive: true, substantive: true, propositionSupported: true, materiallyComplete: true, contradictsSources: false, hasUnsupportedProposition: false };
  const r = await evalVerdict(legacy);
  check(r.verifiedEligible === false && r.schemaValid === false, "legacy shape fails closed");
});

// canonical set integrity
await test("canonical required-field set integrity", () => {
  check(REQUIRED_POSITIVE_BOOLEANS.includes("eligibleForVerifiedControlling"), "eligibility in positive set");
  check(REQUIRED_NEGATIVE_BOOLEANS.includes("unsupportedMaterialProposition"), "risk field in negative set");
  check(REQUIRED_POSITIVE_BOOLEANS.length === 14 && REQUIRED_NEGATIVE_BOOLEANS.length === 3, "canonical counts");
});

console.log(`\nPHASE-10A10-R1 validator schema fail-closed tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
