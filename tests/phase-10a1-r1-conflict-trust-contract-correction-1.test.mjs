// FILE: tests/phase-10a1-r1-conflict-trust-contract-correction-1.test.mjs
// PHASE-10A1-R1-CONFLICT-TRUST-CONTRACT-CORRECTION-1
//
// Corrects the independent-review P1 finding: trust.hasConflict previously
// forwarded pipeline.js's raw ctx.conflictAnalysis.hasConflict boolean
// directly, which could be true even when answer-renderer.js's own
// conflictMetadataIsComplete() (the actual renderer/compliance disclosure
// standard) would never disclose that conflict in the rendered answer --
// a public contract/answer contradiction. This suite directly executes the
// real, corrected buildTrustContract()/classifyConflictState() against
// representative synthetic states (not string scans), and behaviorally
// executes the real, extractable buildResponseTrust() builder that
// ask-handler.js's two response-construction locations actually call.
// Local/static/pure by default. Does not call any production or staging URL.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildTrustContract,
  buildResponseTrust,
  TRUST_CONTRACT_VERSION,
  AUTHORITY_SUPPORT_VALUES
} from "../services/trust-contract.js";
import { classifyConflictState, CONFLICT_STATE_VALUES } from "../services/conflict-trust-classifier.js";
import { conflictMetadataIsComplete } from "../answer-renderer.js";

const PATCH = "PHASE-10A1-R1-CONFLICT-TRUST-CONTRACT-CORRECTION-1";
const FIXTURE_PATH = "evaluation/fixtures/phase-10a1-r1-conflict-trust-contract-correction-1.fixture.json";
const REPORT_PATH = "PHASE-10A1-R1-CONFLICT-TRUST-CONTRACT-CORRECTION-1_REPORT.md";
const CURRENT_STATE_PATH = "knowledge/CURRENT_STATE.md";
const ASK_HANDLER_PATH = "ask-handler.js";
const TRUST_CONTRACT_PATH = "services/trust-contract.js";
const CLASSIFIER_PATH = "services/conflict-trust-classifier.js";

let passed = 0;
let failed = 0;
let assertions = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(`  ${error.message}`);
  }
}

function check(condition, message) {
  assertions += 1;
  assert(condition, message);
}

let fx;

await test("fixture exists and is valid JSON with conflict cases and the VERIFIED_SUPPORTING conclusion", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture file exists");
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(Array.isArray(fx.conflictCases) && fx.conflictCases.length >= 11, "at least 11 conflict cases recorded");
  check(fx.verifiedSupportingConclusion && fx.verifiedSupportingConclusion.status === "RESERVED_UNREACHABLE",
    "VERIFIED_SUPPORTING conclusion recorded as reserved/unreachable");
});

await test("root cause is proven directly: the real Step-9 conflict shape never satisfies the real conflictMetadataIsComplete()", () => {
  const step9Shape = { trueConflicts: [{ trueConflict: true }], count: 1, hasConflict: true };
  check(conflictMetadataIsComplete(step9Shape) === false,
    "pipeline.js's Step 9 Four-Part Doctrine Test output shape never satisfies the renderer's own completeness standard");

  const richShape = {
    conflict: true,
    conflictType: "DOCTRINAL_CONFLICT",
    exactIssue: "X",
    exactLegalDimension: "Y",
    sameIssueGate: { passed: true },
    oppositeHoldingGate: { passed: true },
    resolutionBasis: "Z"
  };
  check(conflictMetadataIsComplete(richShape) === true,
    "a genuinely complete conflict object does satisfy the renderer's completeness standard (sanity check on the imported function itself)");
});

await test("all conflict fixture cases produce the exact required contract via real execution", () => {
  for (const c of fx.conflictCases) {
    const actual = buildTrustContract(c.input);
    check(
      JSON.stringify(actual) === JSON.stringify(c.expected),
      `${c.id}: expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(actual)}`
    );
  }
});

await test("A. verified/displayable conflict", () => {
  const c = fx.conflictCases.find((x) => x.id === "A-verified-displayable-conflict");
  const out = buildTrustContract(c.input);
  check(out.hasConflict === true, "hasConflict is true");
  check(out.conflictState === "VERIFIED_CONFLICT", "conflictState is VERIFIED_CONFLICT");
  check(out.authoritySupport === "CONFLICTING_AUTHORITY", "authoritySupport reflects the verified conflict");
  check(out.sourceState === "AUTHORITY_FOUND" && out.legalConclusion === "ALLOWED", "other trust fields remain consistent");
});

await test("B. potential/incomplete conflict", () => {
  for (const id of ["B-potential-incomplete-conflict-raw-boolean", "B2-potential-incomplete-conflict-nonempty-trueConflicts-only"]) {
    const c = fx.conflictCases.find((x) => x.id === id);
    const out = buildTrustContract(c.input);
    check(out.hasConflict === false, `${id}: hasConflict is false`);
    check(out.conflictState === "POTENTIAL_CONFLICT", `${id}: conflictState is POTENTIAL_CONFLICT`);
    check(out.limitations.includes("POTENTIAL_CONFLICT"), `${id}: incomplete evidence is not discarded, it is surfaced as a limitation`);
  }
});

await test("C. no conflict", () => {
  const c = fx.conflictCases.find((x) => x.id === "C-no-conflict");
  const out = buildTrustContract(c.input);
  check(out.hasConflict === false, "hasConflict is false");
  check(out.conflictState === "NO_CONFLICT", "conflictState is NO_CONFLICT");
});

await test("D. unknown conflict (missing or malformed input, never throws)", () => {
  for (const id of ["D-unknown-missing-conflict-fields", "D2-unknown-malformed-conflictAnalysis"]) {
    const c = fx.conflictCases.find((x) => x.id === id);
    let out;
    assert.doesNotThrow(() => { out = buildTrustContract(c.input); }, `${id}: does not throw`);
    check(out.hasConflict === false, `${id}: hasConflict is false`);
    check(out.conflictState === "UNKNOWN", `${id}: conflictState is UNKNOWN`);
  }
  assert.doesNotThrow(() => classifyConflictState(), "classifyConflictState() with no argument does not throw");
  assert.doesNotThrow(() => classifyConflictState(null), "classifyConflictState(null) does not throw");
  assert.doesNotThrow(() => classifyConflictState("not-an-object"), "classifyConflictState(non-object) does not throw");
});

await test("E. domain boundary", () => {
  const c = fx.conflictCases.find((x) => x.id === "E-domain-boundary");
  const out = buildTrustContract(c.input);
  check(out.hasConflict === false, "hasConflict is false");
  check(out.conflictState === "NOT_APPLICABLE", "conflictState is NOT_APPLICABLE");
  check(out.authoritySupport === "NOT_APPLICABLE" && out.sourceState === "NOT_APPLICABLE", "no invented tax-authority confidence");
});

await test("F. contradictory inputs produce a safe categorical state, never a silent NO_CONFLICT or an overstated VERIFIED_CONFLICT", () => {
  for (const id of ["F-contradictory-hasConflict-false-but-trueConflicts-nonempty", "F2-contradictory-conflict-and-conflictAnalysis-disagree"]) {
    const c = fx.conflictCases.find((x) => x.id === id);
    const out = buildTrustContract(c.input);
    check(out.conflictState === "POTENTIAL_CONFLICT", `${id}: contradictory input maps to the safe POTENTIAL_CONFLICT state`);
    check(out.hasConflict === false, `${id}: contradictory input never claims a verified conflict`);
  }
});

await test("G. VERIFIED_SUPPORTING cannot be produced without a distinct authoritative supporting signal", () => {
  // No combination of sourceStatus/displayedSourceCount alone can produce
  // VERIFIED_SUPPORTING today -- only VERIFIED_CONTROLLING, NO_VERIFIED_AUTHORITY,
  // RELATED_AUTHORITY_ONLY, or CONFLICTING_AUTHORITY are reachable from AUTHORITY_FOUND.
  const attempts = [
    { sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 1 },
    { sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 2, authorityRole: "SUPPORTING" },
    { sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 5, sourceCardVerification: "supporting_only" },
    { sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 1, relatedAuthorities: [{ id: 1 }] }
  ];
  for (const input of attempts) {
    const out = buildTrustContract(input);
    check(out.authoritySupport !== "VERIFIED_SUPPORTING",
      `weak/indirect signals never accidentally produce VERIFIED_SUPPORTING: ${JSON.stringify(input)}`);
  }
  check(AUTHORITY_SUPPORT_VALUES.includes("VERIFIED_SUPPORTING"), "VERIFIED_SUPPORTING remains a defined, reserved enum value");
});

await test("H. mutation safety: input is not mutated, output is deterministic and serializable", () => {
  const input = Object.freeze({
    sourceStatus: "AUTHORITY_FOUND",
    displayedSourceCount: 2,
    conflictAnalysis: Object.freeze({ hasConflict: true, trueConflicts: Object.freeze([Object.freeze({ trueConflict: true })]), count: 1 })
  });
  const before = JSON.stringify(input);
  const out1 = buildTrustContract(input);
  const out2 = buildTrustContract(input);
  const after = JSON.stringify(input);
  check(before === after, "input object is not mutated by buildTrustContract");
  check(JSON.stringify(out1) === JSON.stringify(out2), "output is deterministic across repeated calls");
  check(JSON.stringify(out1) === JSON.stringify(JSON.parse(JSON.stringify(out1))), "output is serializable without loss");
  check(CONFLICT_STATE_VALUES.includes(out1.conflictState), "conflictState is in the categorical allow-list");
});

await test("I. response-construction behavior: buildResponseTrust (the real, extractable builder ask-handler.js calls) produces corrected trust for verified, potential, no-conflict, controlled LOA, restricted, and domain-boundary shapes", () => {
  const verified = buildResponseTrust(
    { conflictAnalysis: { hasConflict: true, trueConflicts: [1], count: 1, conflict: true, conflictType: "DOCTRINAL_CONFLICT", exactIssue: "X", exactLegalDimension: "Y", sameIssueGate: { passed: true }, oppositeHoldingGate: { passed: true }, resolutionBasis: "Z" } },
    2,
    "AUTHORITY_FOUND"
  );
  check(verified.conflictState === "VERIFIED_CONFLICT" && verified.hasConflict === true, "buildResponseTrust: verified conflict shape");

  const potential = buildResponseTrust({ conflictAnalysis: { hasConflict: true, trueConflicts: [1], count: 1 } }, 2, "AUTHORITY_FOUND");
  check(potential.conflictState === "POTENTIAL_CONFLICT" && potential.hasConflict === false, "buildResponseTrust: potential/incomplete conflict shape");

  const noConflict = buildResponseTrust({ conflictAnalysis: { hasConflict: false, trueConflicts: [], count: 0 } }, 2, "AUTHORITY_FOUND");
  check(noConflict.conflictState === "NO_CONFLICT", "buildResponseTrust: no-conflict shape");

  const controlledLoa = buildResponseTrust({ responseType: "controlled_loa_answer", controlledLoaAnswer: { controlledLoaAnswer: true } }, 0, "AUTHORITY_FOUND");
  check(controlledLoa.responseKind === "CONTROLLED_PROCEDURAL" && controlledLoa.conflictState === "NOT_APPLICABLE", "buildResponseTrust: controlled LOA shape");

  const restricted = buildResponseTrust({ responseType: "controlled_loa_legal_conclusion_restricted", controlledLoaAnswer: { requiresHumanReview: true } }, 0, "RELATED_AUTHORITY_ONLY");
  check(restricted.responseKind === "RESTRICTED_LEGAL_CONCLUSION" && restricted.legalConclusion === "RESTRICTED", "buildResponseTrust: restricted legal-conclusion shape");

  const domainBoundary = buildResponseTrust({ domainBoundary: true }, 0, "DOMAIN_BOUNDARY_REJECT");
  check(domainBoundary.responseKind === "DOMAIN_BOUNDARY" && domainBoundary.conflictState === "NOT_APPLICABLE", "buildResponseTrust: domain-boundary shape");
});

await test("J. backward compatibility: trust.hasConflict remains present, trust.conflictState is additive, no existing top-level response field removed", () => {
  const out = buildTrustContract({ sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 2 });
  check(Object.prototype.hasOwnProperty.call(out, "hasConflict"), "trust.hasConflict remains present");
  check(Object.prototype.hasOwnProperty.call(out, "conflictState"), "trust.conflictState is present (additive)");
  check(typeof out.hasConflict === "boolean", "trust.hasConflict is still a real boolean (a client ignoring conflictState still works)");

  const askSrc = readFileSync(resolve(ASK_HANDLER_PATH), "utf8");
  for (const field of ["responseType", "sourceStatus", "sourceAvailability", "sourceCards", "domainBoundary"]) {
    check(askSrc.includes(field), `ask-handler.js still references pre-existing field: ${field}`);
  }
});

await test("classifyConflictState mirrors pipeline.js's exact renderTinaAnswer wiring (conflict: ctx.conflictAnalysis?.hasConflict ? ctx.conflictAnalysis : null)", () => {
  const pipelineSrc = readFileSync(resolve("pipeline.js"), "utf8");
  check(pipelineSrc.includes("conflict:            ctx.conflictAnalysis?.hasConflict ? ctx.conflictAnalysis : null"),
    "pipeline.js's renderTinaAnswer call site still passes ctx.conflictAnalysis as the render-time conflict candidate (unchanged by this task)");

  // Behaviorally confirm the classifier evaluates completeness on exactly
  // that same candidate shape, not a different one.
  const analysisNotComplete = { hasConflict: true, trueConflicts: [1], count: 1 };
  const result1 = classifyConflictState({ conflictAnalysis: analysisNotComplete });
  check(result1.conflictState === "POTENTIAL_CONFLICT", "classifier evaluates completeness on the same object pipeline.js would pass to the renderer");
});

await test("conflict-trust-classifier.js does not modify conflict-engine.js, pipeline.js conflict generation, answer-renderer.js, or final-answer-compliance.js", () => {
  const changed = execSync("git diff --name-only HEAD", { encoding: "utf8" })
    .split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const f of ["conflict-engine.js", "pipeline.js", "answer-renderer.js", "final-answer-compliance.js"]) {
    check(!changed.includes(f), `runtime file not modified: ${f}`);
  }
});

await test("no secret appears in the fixture or report", () => {
  const combined = [FIXTURE_PATH, REPORT_PATH]
    .filter((p) => existsSync(resolve(p)))
    .map((p) => readFileSync(resolve(p), "utf8"))
    .join("\n");
  check(!/Bearer\s+ey[A-Za-z0-9_-]{10,}/.test(combined), "no bearer JWT-looking token present");
  check(!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(combined), "no private key present");
  check(!/supabase_service_role|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?ey/i.test(combined), "no Supabase service-role key present");
});

await test("diff scope: only PHASE-10A1-R1's own files and the two already-authorized PHASE-10A1 files were touched", () => {
  const modifiedTracked = execSync("git diff --name-only HEAD", { encoding: "utf8" })
    .split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const forbidden = [
    "pipeline.js", "conflict-engine.js", "answer-renderer.js", "final-answer-compliance.js",
    "server.js", "services/controlled-loa-audit-procedure-boundary.js",
    "services/controlled-loa-legal-conclusion-safety.js",
    "workflow/controlled-loa-answer-runtime-scaffold.js",
    "package.json", "package-lock.json", ".env"
  ];
  for (const f of forbidden) check(!modifiedTracked.includes(f), `runtime file not modified: ${f}`);
  check(!modifiedTracked.some((n) => /^routes\//i.test(n)), "no route file changed");
  check(!modifiedTracked.some((n) => /^(src|client|public|frontend)\//i.test(n)), "no frontend directory file changed");

  const expectedFiles = [
    TRUST_CONTRACT_PATH,
    CLASSIFIER_PATH,
    ASK_HANDLER_PATH,
    FIXTURE_PATH,
    "tests/phase-10a1-r1-conflict-trust-contract-correction-1.test.mjs",
    REPORT_PATH,
    "evaluation/fixtures/phase-10a1-canonical-trust-contract-and-api-forwarding-remediation-1.fixture.json",
    "tests/phase-10a1-canonical-trust-contract-and-api-forwarding-remediation-1.test.mjs"
  ];
  for (const f of expectedFiles) check(existsSync(resolve(f)), `expected PHASE-10A1-R1 file exists: ${f}`);
});

await test("corroborating existing regression suites are cited and exist", () => {
  const corroborating = [
    "tests/phase-10a-trust-limitation-authority-confidence-release-gate-1.test.mjs",
    "tests/phase-10a1-canonical-trust-contract-and-api-forwarding-remediation-1.test.mjs",
    "tests/patch-024c-verified-authority-gate.test.mjs",
    "tests/patch-06f-005-exact-source-limitation-wording.test.mjs",
    "tests/patch-07a-003-authority-state-response-policy-and-gate-compatibility.test.mjs",
    "tests/patch-07a-008-source-limitation-mode-boundary-hardening.test.mjs",
    "tests/phase-09z-controlled-loa-answer-ask-wiring-gate-1.test.mjs",
    "tests/phase-09zh-controlled-loa-live-path-remediation-1.test.mjs",
    "tests/phase-09zi-controlled-loa-unsafe-legal-wording-remediation-1.test.mjs",
    "tests/phase-09-gate-closure-2.test.mjs",
    "tests/patch-025a-rev3-ask-handler-mapper.test.mjs"
  ];
  for (const suitePath of corroborating) {
    check(existsSync(resolve(suitePath)), `corroborating suite exists: ${suitePath}`);
  }
});

await test("report exists and Phase 10A / PHASE-10A2 status is correctly recorded", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/PHASE-10A2/i.test(report), "report references PHASE-10A2 status");
  check(/independent.{0,20}(gpt-5\.5|codex)/i.test(report), "report states mandatory independent review");
});

await test("CURRENT_STATE.md records PHASE-10A1-R1 without marking Phase 10A itself closed/complete", () => {
  const current = readFileSync(resolve(CURRENT_STATE_PATH), "utf8");
  check(current.includes(PATCH), "CURRENT_STATE contains the 10A1-R1 patch identifier");
  const closureClaimRe = /phase 10a (is |remains |now )?(formally )?(closed|complete)\b/gi;
  let unsafeClosureClaim = false;
  let closureMatch;
  while ((closureMatch = closureClaimRe.exec(current)) !== null) {
    const precedingText = current.slice(Math.max(0, closureMatch.index - 20), closureMatch.index).toLowerCase();
    if (!/do not mark|not mark|before .*(is )?closed/.test(precedingText)) {
      unsafeClosureClaim = true;
      break;
    }
  }
  check(!unsafeClosureClaim, "CURRENT_STATE does not declare Phase 10A itself closed/complete outside a 'do not mark ... until' guard sentence");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
