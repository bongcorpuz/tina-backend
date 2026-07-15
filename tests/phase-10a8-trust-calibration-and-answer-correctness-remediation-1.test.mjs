// PHASE-10A8-TRUST-CALIBRATION-AND-ANSWER-CORRECTNESS-REMEDIATION-1
//
// VERIFIED_CONTROLLING must depend on answer correctness / proposition-level
// support, not retrieval or source presence. These tests exercise: the
// deterministic structural gate, the controlled answer-support validator (with
// an injected mock client so they are deterministic and not overfit to live
// LLM behavior), the trust-contract gate on result.answerSupport, and the
// domain-boundary false-refusal fix.

import assert from "node:assert/strict";
import fs from "node:fs";
import { buildResponseTrust } from "../services/trust-contract.js";
import {
  structuralSupportGate,
  extractSubstance,
  evaluateAnswerSupport
} from "../services/answer-support-validator.js";
import { detectPhilippineTaxBoundary } from "../services/philippine-tax-domain-boundary.js";

let passed = 0, failed = 0, assertions = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}
function check(c, m) { assertions++; assert(c, m); }

// Mock OpenAI-like client returning a controlled JSON verdict.
function mockClient(verdict) {
  return { chat: { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify(verdict) } }] }) } } };
}
// PHASE-10A10-R1: the validator now requires the complete canonical schema
// (strict fail-closed). A legitimate verified verdict must set every mandatory
// field explicitly -- the old partial shape now correctly fails closed.
const GOOD = { answerResponsive: true, primaryIssueAnswered: true, requiredIssueKeysCovered: true, materialExceptionsCovered: true, materialAlternativesCovered: true, citationRelevant: true, citationSupportsProposition: true, substantive: true, propositionSupported: true, materiallyComplete: true, contradictsSources: false, unsupportedMaterialProposition: false, eligibleForVerifiedControlling: true, reason: "ok" };
const WRONG = { responsive: true, substantive: true, propositionSupported: false, materiallyComplete: true, contradictsSources: true, hasUnsupportedProposition: false, reason: "wrong rate" };
const INCOMPLETE = { responsive: true, substantive: true, propositionSupported: true, materiallyComplete: false, contradictsSources: false, hasUnsupportedProposition: false, reason: "omits condition" };
const UNSUPPORTED = { responsive: true, substantive: true, propositionSupported: false, materiallyComplete: true, contradictsSources: false, hasUnsupportedProposition: true, reason: "invented exemption" };

const SOURCES = [{ label: "NIRC Sec. 106", authorityType: "Statute" }];
const SUBSTANTIVE = "### Short Answer\nThe standard corporate income tax rate for domestic corporations is 25% of taxable income under NIRC Sec. 27(A), effective under the CREATE Act. A 20% rate applies to qualifying corporations meeting the net-taxable-income and total-asset conditions.";

async function support(answer, verdict, sources = SOURCES) {
  return evaluateAnswerSupport({ question: "q", answer, sources, client: mockClient(verdict) });
}
async function trustFor(answer, verdict, sourceStatus = "AUTHORITY_FOUND", displayed = 1) {
  const answerSupport = await support(answer, verdict);
  return buildResponseTrust({ answer, answerSupport }, displayed, sourceStatus);
}

// Load a captured PHASE-10A7 answer if available (real evidence), else fallback text.
function captured(caseId, fallback) {
  const fp = `evaluation/results/phase-10a7-tax-factcheck-capability-evaluation-1/payloads/${caseId}-r1.json`;
  try { return JSON.parse(fs.readFileSync(fp, "utf8")).answer || fallback; } catch { return fallback; }
}

// ── F1-F9: the nine false-high-confidence cases must NOT be VERIFIED_CONTROLLING ──
const NINE = {
  Q2: WRONG, Q8: WRONG, Q9: WRONG, Q27: WRONG, Q29: UNSUPPORTED,
  Q31: INCOMPLETE, Q37: WRONG, Q41: INCOMPLETE, Q49: WRONG
};
for (const [id, verdict] of Object.entries(NINE)) {
  await test(`F(${id}): captured answer fails closed (not VERIFIED_CONTROLLING)`, async () => {
    const answer = captured(id, "### Short Answer\nSome wrong or incomplete tax statement here that is long enough to pass structural checks.");
    const structural = structuralSupportGate(answer);
    let trust;
    if (!structural.pass) {
      // structurally ineligible (e.g. Q37 empty) -> answerSupport not eligible
      trust = buildResponseTrust({ answer, answerSupport: { verifiedEligible: false, stage: "structural" } }, 1, "AUTHORITY_FOUND");
    } else {
      trust = await trustFor(answer, verdict);
    }
    check(trust.authoritySupport !== "VERIFIED_CONTROLLING", `${id} must not be verified, got ${trust.authoritySupport}`);
    check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `${id} should fail closed to RELATED_AUTHORITY_ONLY, got ${trust.authoritySupport}`);
  });
}

// ── F10: empty answer with controlling sources ──
await test("F10: empty answer with sources is not VERIFIED_CONTROLLING (structural)", () => {
  const g = structuralSupportGate("### Short Answer\n### Interpretation\n### Practical Meaning");
  check(g.pass === false, "headers-only answer fails structural gate");
  check(extractSubstance("### A\n### B") === "", "headers reduce to empty substance");
  const trust = buildResponseTrust({ answer: "### Short Answer\n### Interpretation", answerSupport: { verifiedEligible: false } }, 3, "AUTHORITY_FOUND");
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", "empty verified-candidate fails closed");
});

// ── F11: wrong answer with real controlling source retrieved ──
await test("F11: wrong answer with real source retrieved is not VERIFIED_CONTROLLING", async () => {
  const trust = await trustFor(SUBSTANTIVE, WRONG);
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `got ${trust.authoritySupport}`);
});

// ── F12: unsupported proposition with a valid source card ──
await test("F12: unsupported proposition with valid source card is not VERIFIED_CONTROLLING", async () => {
  const trust = await trustFor(SUBSTANTIVE, UNSUPPORTED);
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `got ${trust.authoritySupport}`);
});

// ── F13: bare source list ──
await test("F13: bare source list is not VERIFIED_CONTROLLING (structural)", () => {
  const g = structuralSupportGate("Indexed sources found:\nNIRC Sec. 2\nRR 16-2005");
  check(g.pass === false && g.reason === "bare_source_listing", "bare listing rejected");
});

// ── F14: valid question falsely refused -> now ALLOWed by boundary ──
await test("F14: previously false-refused valid tax questions now ALLOW (not RESTRICTED/boundary)", () => {
  for (const q of [
    "What is the holding-period rule for an individual's capital gain on personal property?",
    "What is Oplan Kandado and when can it be applied?"
  ]) {
    const r = detectPhilippineTaxBoundary(q, "/ask");
    check(r.decision === "ALLOW" && r.isPhilippineTax === true, `expected ALLOW for: ${q}`);
  }
});

// ── F15: genuine restricted outcome prediction stays RESTRICTED ──
await test("F15: restricted outcome prediction stays RESTRICTED + human review", () => {
  const trust = buildResponseTrust({ responseType: "controlled_loa_legal_conclusion_restricted", answer: "A conclusive determination cannot be made.", controlledLoaAnswer: { requiresHumanReview: true } }, 0, "NOT_APPLICABLE");
  check(trust.legalConclusion === "RESTRICTED" && trust.humanReviewRequired === true, "restricted preserved");
});

// ── F16: legitimate verified controlling answer remains available ──
await test("F16: correct, supported, complete answer remains VERIFIED_CONTROLLING", async () => {
  const trust = await trustFor(SUBSTANTIVE, GOOD);
  check(trust.authoritySupport === "VERIFIED_CONTROLLING", `expected VERIFIED_CONTROLLING, got ${trust.authoritySupport}`);
});

// ── F17: material omission ──
await test("F17: materially incomplete answer is not VERIFIED_CONTROLLING", async () => {
  const trust = await trustFor(SUBSTANTIVE, INCOMPLETE);
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `got ${trust.authoritySupport}`);
});

// ── F18: conflicting authorities ──
await test("F18: complete conflict metadata yields CONFLICTING_AUTHORITY (precedence)", () => {
  const conflictAnalysis = { hasConflict: true, conflict: true, conflictType: "DOCTRINAL_CONFLICT", exactIssue: "timing", exactLegalDimension: "period", sameIssueGate: { passed: true }, oppositeHoldingGate: { passed: true }, resolutionBasis: "unresolved" };
  const trust = buildResponseTrust({ answer: SUBSTANTIVE, conflictAnalysis, answerSupport: { verifiedEligible: true } }, 2, "AUTHORITY_FOUND");
  check(trust.authoritySupport === "CONFLICTING_AUTHORITY", `expected CONFLICTING_AUTHORITY, got ${trust.authoritySupport}`);
});

// ── F19: missing specific authority (source-only fallback path) ──
await test("F19: source-only fallback stays RELATED_AUTHORITY_ONLY with specificAuthorityNotFound", () => {
  const trust = buildResponseTrust({ answer: "## Summary\nRelated authorities only.", sourceOnlyFallback: true, specificAuthorityRequested: true, requestedAuthorityMatched: false }, 2, "AUTHORITY_FOUND");
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `got ${trust.authoritySupport}`);
  check(trust.specificAuthorityNotFound === true, "specificAuthorityNotFound set");
});

// ── F20: citation exists but does not support proposition ──
await test("F20: real citation not supporting the proposition is not VERIFIED_CONTROLLING", async () => {
  const trust = await trustFor(SUBSTANTIVE, { ...GOOD, propositionSupported: false });
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `got ${trust.authoritySupport}`);
});

// ── Validator unit behavior ──
await test("validator: structural failure short-circuits before the LLM stage", async () => {
  const r = await evaluateAnswerSupport({ question: "q", answer: "", sources: SOURCES, client: mockClient(GOOD) });
  check(r.verifiedEligible === false && r.stage === "structural", "empty fails at structural stage");
});
await test("validator: unavailable client fails closed", async () => {
  const r = await evaluateAnswerSupport({ question: "q", answer: SUBSTANTIVE, sources: SOURCES, client: null });
  // no OPENAI_API_KEY in test env -> unavailable
  check(r.verifiedEligible === false, "no client -> fail closed");
});
await test("validator: malformed LLM output fails closed", async () => {
  const bad = { chat: { completions: { create: async () => ({ choices: [{ message: { content: "not json" } }] }) } } };
  const r = await evaluateAnswerSupport({ question: "q", answer: SUBSTANTIVE, sources: SOURCES, client: bad });
  check(r.verifiedEligible === false && r.stage === "error", "malformed -> fail closed");
});

// ── legacy seam: absent answerSupport preserves retrieval-level verified (unit callers) ──
// PHASE-10A10-R2: absent answerSupport now FAILS CLOSED (no attestation -> no verified).
await test("absent answerSupport fails closed to RELATED_AUTHORITY_ONLY (no legacy verified)", () => {
  const trust = buildResponseTrust({ answer: SUBSTANTIVE }, 1, "AUTHORITY_FOUND");
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", "no answerSupport -> fail closed");
});

console.log(`\nPHASE-10A8 trust-calibration tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
