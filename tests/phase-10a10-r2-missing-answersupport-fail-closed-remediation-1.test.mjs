// PHASE-10A10-R2-MISSING-ANSWERSUPPORT-FAIL-CLOSED-REMEDIATION-1
//
// answerSupport is MANDATORY for VERIFIED_CONTROLLING. It must be a present,
// non-null, non-array object with own boolean schemaValid===true AND own
// boolean verifiedEligible===true. Absent / null / false / string / array /
// empty / missing-field / wrong-type / inherited / schema-false / eligible-false
// all fail closed. eligibleForVerifiedControlling + schemaValid are necessary
// but not sufficient (higher-priority states still take precedence). Exercises
// the real trust-contract path, not just the parser.

import assert from "node:assert/strict";
import { buildResponseTrust, isVerifiedAnswerSupport } from "../services/trust-contract.js";
import { evaluateAnswerSupport } from "../services/answer-support-validator.js";

let passed = 0, failed = 0, assertions = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}
function check(c, m) { assertions++; assert(c, m); }

const SUB = "### Short Answer\nThe standard corporate income tax rate for domestic corporations is 25% of taxable income under NIRC Section 27(A), a complete and correct statement of the controlling rule.";
const VALID = { schemaValid: true, verifiedEligible: true };
const AS = (answerSupport) => buildResponseTrust({ answer: SUB, answerSupport }, 1, "AUTHORITY_FOUND").authoritySupport;

// A1 complete canonical answerSupport -> verified reachable
await test("A1: complete canonical answerSupport -> VERIFIED_CONTROLLING", () => {
  check(AS(VALID) === "VERIFIED_CONTROLLING", "valid attestation verifies");
});
// A2 omitted
await test("A2: answerSupport omitted -> not verified", () => {
  check(buildResponseTrust({ answer: SUB }, 1, "AUTHORITY_FOUND").authoritySupport === "RELATED_AUTHORITY_ONLY", "omitted fails closed");
});
// A3-A15 invalid shapes
const invalidShapes = [
  ["A3 undefined", undefined],
  ["A4 null", null],
  ["A5 false", false],
  ["A6 string", "verifiedEligible"],
  ["A7 array", [{ schemaValid: true, verifiedEligible: true }]],
  ["A8 empty object", {}],
  ["A9 schemaValid missing", { verifiedEligible: true }],
  ["A10 verifiedEligible missing", { schemaValid: true }],
  ["A11 schemaValid false", { schemaValid: false, verifiedEligible: true }],
  ["A12 verifiedEligible false", { schemaValid: true, verifiedEligible: false }],
  ["A13 schemaValid string", { schemaValid: "true", verifiedEligible: true }],
  ["A14 verifiedEligible numeric", { schemaValid: true, verifiedEligible: 1 }]
];
for (const [name, shape] of invalidShapes) {
  await test(`${name} -> not verified`, () => {
    check(AS(shape) === "RELATED_AUTHORITY_ONLY", `${name} must fail closed, got ${AS(shape)}`);
  });
}
// A15 inherited
await test("A15: inherited schemaValid/verifiedEligible -> not verified", () => {
  const proto = { schemaValid: true, verifiedEligible: true };
  const obj = Object.create(proto);
  check(AS(obj) === "RELATED_AUTHORITY_ONLY", "inherited fails closed");
  check(isVerifiedAnswerSupport(obj).failureReasons.includes("missing_schemaValid"), "own-property enforced");
});
// A16 AUTHORITY_FOUND + displayed sources + no answerSupport
await test("A16: AUTHORITY_FOUND + displayed sources + no answerSupport -> RELATED_AUTHORITY_ONLY", () => {
  const t = buildResponseTrust({ answer: SUB, displayedSourceCount: 3 }, 3, "AUTHORITY_FOUND");
  check(t.authoritySupport === "RELATED_AUTHORITY_ONLY", "sources cannot bypass attestation");
});
// A17 controllingAuthorityFound-style + no answerSupport
await test("A17: controlling-authority-shaped input + no answerSupport -> not verified", () => {
  const t = buildResponseTrust({ answer: SUB, controllingAuthorityFound: true, displayedSourceCount: 2 }, 2, "AUTHORITY_FOUND");
  check(t.authoritySupport !== "VERIFIED_CONTROLLING", "controlling flag cannot bypass attestation");
});
// A18 source-only answer + no answerSupport
await test("A18: bare source-listing + no answerSupport -> not verified", () => {
  const t = buildResponseTrust({ answer: "Indexed sources found:\nNIRC Sec. 2\nRR 16-2005" }, 2, "AUTHORITY_FOUND");
  check(t.authoritySupport === "RELATED_AUTHORITY_ONLY", "source-only fails closed");
});
// A19-A21 async validator failures fail closed (real evaluateAnswerSupport)
await test("A19-A21: validator timeout-shape / unavailable / malformed -> not verified", async () => {
  const malformed = { chat: { completions: { create: async () => ({ choices: [{ message: { content: "not json" } }] }) } } };
  const r1 = await evaluateAnswerSupport({ question: "q", answer: SUB, sources: [{ label: "NIRC Sec. 27(A)" }], client: malformed });
  check(AS(r1) === "RELATED_AUTHORITY_ONLY", "malformed validator result -> not verified");
  const r2 = await evaluateAnswerSupport({ question: "q", answer: SUB, sources: [{ label: "NIRC Sec. 27(A)" }], client: null });
  check(AS(r2) === "RELATED_AUTHORITY_ONLY", "unavailable validator -> not verified");
});
// A22-A25 precedence preserved even with no answerSupport
await test("A22: restricted + no answerSupport -> RESTRICTED", () => {
  const t = buildResponseTrust({ responseType: "controlled_loa_legal_conclusion_restricted", answer: "A conclusive determination cannot be made.", controlledLoaAnswer: { requiresHumanReview: true } }, 0, "NOT_APPLICABLE");
  check(t.legalConclusion === "RESTRICTED" && t.humanReviewRequired === true, "restricted precedence");
});
await test("A23: verified conflict + no answerSupport -> CONFLICTING_AUTHORITY", () => {
  const conflictAnalysis = { hasConflict: true, conflict: true, conflictType: "DOCTRINAL_CONFLICT", exactIssue: "x", exactLegalDimension: "y", sameIssueGate: { passed: true }, oppositeHoldingGate: { passed: true }, resolutionBasis: "unresolved" };
  const t = buildResponseTrust({ answer: SUB, conflictAnalysis }, 2, "AUTHORITY_FOUND");
  check(t.authoritySupport === "CONFLICTING_AUTHORITY", "conflict precedence over missing attestation");
});
await test("A24: missing-specific-authority (source-only fallback) + no answerSupport -> RELATED + flag", () => {
  const t = buildResponseTrust({ answer: "## Summary\nRelated authorities only.", sourceOnlyFallback: true, specificAuthorityRequested: true, requestedAuthorityMatched: false }, 2, "AUTHORITY_FOUND");
  check(t.authoritySupport === "RELATED_AUTHORITY_ONLY" && t.specificAuthorityNotFound === true, "missing-authority precedence");
});
await test("A25: source failure + no answerSupport -> NO_VERIFIED_AUTHORITY", () => {
  const t = buildResponseTrust({ answer: "TINA could not complete source retrieval in time." }, 0, "RETRIEVAL_TIMEOUT");
  check(t.authoritySupport === "NO_VERIFIED_AUTHORITY", "source-failure precedence");
});
// A26 legitimate verified control reachable
await test("A26: legitimate verified control remains reachable", () => {
  check(AS(VALID) === "VERIFIED_CONTROLLING", "verified reachable with valid attestation");
});
// A27-A29 cluster shapes (validator returned not eligible)
await test("A27-A29: Q5 incomplete / Q35 missing-alt / Q41 non-responsive attestations -> not verified", () => {
  check(AS({ schemaValid: true, verifiedEligible: false }) === "RELATED_AUTHORITY_ONLY", "not-eligible attestation fails closed");
});
// A30 legacy trust input without answerSupport
await test("A30: legacy AUTHORITY_FOUND-only trust input -> not verified", () => {
  check(buildResponseTrust({ sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 2 }, 2, "AUTHORITY_FOUND").authoritySupport === "RELATED_AUTHORITY_ONLY", "legacy input fails closed");
});
// helper diagnostics
await test("isVerifiedAnswerSupport diagnostics", () => {
  check(isVerifiedAnswerSupport(VALID).eligible === true, "valid eligible");
  check(isVerifiedAnswerSupport(undefined).failureReasons.includes("answerSupport_absent"), "absent reason");
  check(isVerifiedAnswerSupport([]).failureReasons.includes("answerSupport_not_object"), "array reason");
  check(isVerifiedAnswerSupport({ schemaValid: true }).failureReasons.includes("missing_verifiedEligible"), "missing eligible reason");
  check(isVerifiedAnswerSupport({ schemaValid: true, verifiedEligible: false }).failureReasons.includes("verifiedEligible_not_true"), "eligible-false reason");
});

console.log(`\nPHASE-10A10-R2 missing-answerSupport fail-closed tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
