// FILE: tests/phase-10a1-canonical-trust-contract-and-api-forwarding-remediation-1.test.mjs
// PHASE-10A1-CANONICAL-TRUST-CONTRACT-AND-API-FORWARDING-REMEDIATION-1
//
// Directly executes the real, pure buildTrustContract() helper against every
// fixture case (not merely a static string scan), then statically verifies
// the two ask-handler.js response-construction locations actually call it
// and forward the result, since ask-handler.js's route handler is not
// independently invokable outside a full Express+DB harness. Does not call
// any production or staging URL. Does not depend on HEAD being any
// particular commit beyond the PHASE-10A1 base.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildTrustContract,
  buildResponseTrust,
  TRUST_CONTRACT_VERSION,
  AUTHORITY_SUPPORT_VALUES,
  SOURCE_STATE_VALUES,
  LEGAL_CONCLUSION_VALUES,
  RESPONSE_KIND_VALUES
} from "../services/trust-contract.js";

const PATCH = "PHASE-10A1-CANONICAL-TRUST-CONTRACT-AND-API-FORWARDING-REMEDIATION-1";
const FIXTURE_PATH = "evaluation/fixtures/phase-10a1-canonical-trust-contract-and-api-forwarding-remediation-1.fixture.json";
const REPORT_PATH = "PHASE-10A1-CANONICAL-TRUST-CONTRACT-AND-API-FORWARDING-REMEDIATION-1_REPORT.md";
const CURRENT_STATE_PATH = "knowledge/CURRENT_STATE.md";
const ASK_HANDLER_PATH = "ask-handler.js";

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

await test("fixture exists and is valid JSON with both required sections", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture file exists");
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(Array.isArray(fx.materialResponsePaths) && fx.materialResponsePaths.length === 15, "exactly 15 material response paths recorded");
  check(Array.isArray(fx.invariantEdgeCases) && fx.invariantEdgeCases.length > 0, "invariant edge cases recorded");
});

await test("contract shape: version, categorical allow-lists, real booleans, serializable limitations", () => {
  const out = buildTrustContract({ responseType: "rag_answer", sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 1 });
  check(out.version === TRUST_CONTRACT_VERSION, "version is the canonical version string");
  check(AUTHORITY_SUPPORT_VALUES.includes(out.authoritySupport), "authoritySupport is in the categorical allow-list");
  check(SOURCE_STATE_VALUES.includes(out.sourceState), "sourceState is in the categorical allow-list");
  check(LEGAL_CONCLUSION_VALUES.includes(out.legalConclusion), "legalConclusion is in the categorical allow-list");
  check(RESPONSE_KIND_VALUES.includes(out.responseKind), "responseKind is in the categorical allow-list");
  check(typeof out.humanReviewRequired === "boolean", "humanReviewRequired is a real boolean");
  check(typeof out.filingReadyDocumentGenerated === "boolean", "filingReadyDocumentGenerated is a real boolean");
  check(typeof out.automaticSubmission === "boolean", "automaticSubmission is a real boolean");
  check(typeof out.hasConflict === "boolean", "hasConflict is a real boolean");
  check(Array.isArray(out.limitations), "limitations is an array");
  check(JSON.stringify(out) === JSON.stringify(JSON.parse(JSON.stringify(out))), "output is JSON-serializable without loss");
  check(!Object.values(out).some((v) => typeof v === "number"), "no numeric confidence value is present anywhere in the contract");
});

await test("all 15 material response paths produce the exact required contract", () => {
  for (const c of fx.materialResponsePaths) {
    const actual = buildTrustContract(c.input);
    check(
      JSON.stringify(actual) === JSON.stringify(c.expected),
      `${c.id}: expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(actual)}`
    );
  }
});

await test("invariant edge cases hold under the defensive enforcement pass", () => {
  for (const c of fx.invariantEdgeCases) {
    const actual = buildTrustContract(c.input);
    check(
      JSON.stringify(actual) === JSON.stringify(c.expected),
      `${c.id}: expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(actual)}`
    );
  }
});

await test("verified-authority mapping: controlling vs related-only vs missing-cards-cannot-be-controlling", () => {
  const controlling = buildTrustContract({ sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 2 });
  check(controlling.authoritySupport === "VERIFIED_CONTROLLING", "AUTHORITY_FOUND with displayed cards is VERIFIED_CONTROLLING");

  const relatedOnly = buildTrustContract({ sourceStatus: "RELATED_AUTHORITY_ONLY", displayedSourceCount: 0 });
  check(relatedOnly.authoritySupport === "RELATED_AUTHORITY_ONLY", "RELATED_AUTHORITY_ONLY never claims controlling authority");

  const missingCards = buildTrustContract({ sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 0 });
  check(missingCards.authoritySupport !== "VERIFIED_CONTROLLING", "AUTHORITY_FOUND with zero displayed cards cannot be VERIFIED_CONTROLLING");
});

await test("unsafe source states never yield a false verified-authority claim", () => {
  for (const state of ["RETRIEVAL_TIMEOUT", "SOURCE_LOOKUP_EMPTY", "SOURCE_PARSE_ERROR", "NO_INDEXED_SOURCE"]) {
    const out = buildTrustContract({ sourceStatus: state, displayedSourceCount: 0 });
    check(out.authoritySupport !== "VERIFIED_CONTROLLING" && out.authoritySupport !== "VERIFIED_SUPPORTING",
      `${state} never yields a verified-authority claim`);
    check(out.sourceState === state, `${state} is surfaced verbatim as sourceState`);
  }
});

await test("restricted legal conclusions always force human review and forbid filing-ready/auto-submission output", () => {
  const out = buildTrustContract({
    responseType: "controlled_loa_legal_conclusion_restricted",
    controlledLoaAnswer: { requiresHumanReview: true }
  });
  check(out.legalConclusion === "RESTRICTED", "responseType maps to RESTRICTED");
  check(out.humanReviewRequired === true, "humanReviewRequired forced true");
  check(out.filingReadyDocumentGenerated === false, "filingReadyDocumentGenerated forced false");
  check(out.automaticSubmission === false, "automaticSubmission forced false");
});

await test("controlled procedural responses never claim a restricted legal conclusion and forbid filing-ready/auto-submission output", () => {
  const out = buildTrustContract({
    responseType: "controlled_loa_answer",
    controlledLoaAnswer: { controlledLoaAnswer: true, filingReadyDocumentGenerated: true, automaticSubmission: true }
  });
  check(out.responseKind === "CONTROLLED_PROCEDURAL", "responseKind correctly identified");
  check(out.legalConclusion !== "RESTRICTED", "no false restricted-conclusion claim");
  check(out.filingReadyDocumentGenerated === false, "filingReadyDocumentGenerated forced false even if upstream said true");
  check(out.automaticSubmission === false, "automaticSubmission forced false even if upstream said true");
});

await test("conflict (corrected by PHASE-10A1-R1): raw upstream conflict signals alone never yield hasConflict:true; only renderer-complete metadata does; conflict never implies fully settled controlling authority", () => {
  // A raw conflict.hasConflict:true boolean, with no conflictType/exactIssue/
  // oppositeHoldingGate/resolutionBasis, is exactly the shape pipeline.js's
  // Step 9 Four-Part Doctrine Test actually produces today. It is real
  // upstream evidence, but it is NOT complete under the renderer/compliance
  // standard (answer-renderer.js's conflictMetadataIsComplete), so it must
  // not be exposed as a verified, user-displayable conflict.
  const incompleteConflict = buildTrustContract({ sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 2, conflict: { hasConflict: true } });
  check(incompleteConflict.hasConflict === false, "incomplete upstream conflict evidence does not set hasConflict true");
  check(incompleteConflict.conflictState === "POTENTIAL_CONFLICT", "incomplete upstream conflict evidence maps to POTENTIAL_CONFLICT");
  check(incompleteConflict.limitations.includes("POTENTIAL_CONFLICT"), "incomplete conflict evidence is not discarded, it is surfaced as a limitation");
  check(incompleteConflict.authoritySupport !== "CONFLICTING_AUTHORITY", "an unverified conflict is never presented as CONFLICTING_AUTHORITY");

  // Only a conflict object satisfying the real renderer/compliance
  // completeness standard (imported, not reimplemented) yields a verified,
  // user-displayable conflict.
  const completeConflict = buildTrustContract({
    sourceStatus: "AUTHORITY_FOUND",
    displayedSourceCount: 2,
    conflictAnalysis: {
      hasConflict: true,
      trueConflicts: [1],
      count: 1,
      conflict: true,
      conflictType: "DOCTRINAL_CONFLICT",
      exactIssue: "whether the rule applies",
      exactLegalDimension: "timing of assessment",
      sameIssueGate: { passed: true },
      oppositeHoldingGate: { passed: true },
      resolutionBasis: "later ruling controls"
    }
  });
  check(completeConflict.hasConflict === true, "complete renderer-grade conflict metadata sets hasConflict true");
  check(completeConflict.conflictState === "VERIFIED_CONFLICT", "complete renderer-grade conflict metadata maps to VERIFIED_CONFLICT");
  check(completeConflict.authoritySupport === "CONFLICTING_AUTHORITY", "a verified conflict is never presented as a fully settled controlling position");

  const manySourcesNoConflict = buildTrustContract({ sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 5 });
  check(manySourcesNoConflict.hasConflict === false, "multiple displayed sources alone do not imply a conflict");
  check(manySourcesNoConflict.conflictState === "UNKNOWN", "no conflict signal at all is UNKNOWN, not silently NO_CONFLICT");

  const explicitNonConflict = buildTrustContract({ sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 5, conflict: { hasConflict: false } });
  check(explicitNonConflict.hasConflict === false, "an explicit non-conflict result is respected, not overridden by source count");
  check(explicitNonConflict.conflictState === "NO_CONFLICT", "an explicit non-conflict result maps to NO_CONFLICT");
});

await test("domain boundary: NOT_APPLICABLE everywhere, no invented tax authority confidence", () => {
  const out = buildTrustContract({ domainBoundary: true, sourceStatus: "DOMAIN_BOUNDARY_REJECT", conflict: { hasConflict: true } });
  check(out.authoritySupport === "NOT_APPLICABLE", "authoritySupport is NOT_APPLICABLE");
  check(out.sourceState === "NOT_APPLICABLE", "sourceState is NOT_APPLICABLE");
  check(out.legalConclusion === "NOT_APPLICABLE", "legalConclusion is NOT_APPLICABLE");
  check(out.hasConflict === false, "no invented conflict state for a non-tax domain rejection");
});

await test("legacy/missing fields: safe UNKNOWN/NOT_APPLICABLE defaults, never throws, never mutates input", () => {
  assert.doesNotThrow(() => buildTrustContract(), "calling with no argument does not throw");
  assert.doesNotThrow(() => buildTrustContract(null), "calling with null does not throw");
  assert.doesNotThrow(() => buildTrustContract(undefined), "calling with undefined does not throw");
  assert.doesNotThrow(() => buildTrustContract("not-an-object"), "calling with a non-object does not throw");

  const out = buildTrustContract({});
  check(out.authoritySupport === "UNKNOWN", "empty input yields UNKNOWN authoritySupport");
  check(out.sourceState === "UNKNOWN", "empty input yields UNKNOWN sourceState");
  check(out.responseKind === "UNKNOWN", "empty input yields UNKNOWN responseKind");

  const input = Object.freeze({ sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 2, conflict: Object.freeze({ hasConflict: false }) });
  const before = JSON.stringify(input);
  buildTrustContract(input);
  const after = JSON.stringify(input);
  check(before === after, "input object is not mutated by buildTrustContract");
});

await test("API forwarding: ask-handler.js imports and calls the real, extractable buildResponseTrust builder at both response-construction locations", () => {
  const src = readFileSync(resolve(ASK_HANDLER_PATH), "utf8");
  check(/import\s*\{\s*buildResponseTrust\s*\}\s*from\s*"\.\/services\/trust-contract\.js"/.test(src),
    "ask-handler.js imports buildResponseTrust from services/trust-contract.js");

  const payloadStart = src.indexOf("const payload = {");
  const saveTurnStart = src.indexOf("await saveConversationTurn({", payloadStart);
  const mainPayloadBlock = src.slice(payloadStart, saveTurnStart);
  check(mainPayloadBlock.includes("trust: buildResponseTrust("), "main payload object forwards trust: buildResponseTrust(...)");
  check(mainPayloadBlock.includes("responseType: result.responseType"), "responseType field preserved in main payload (backward compatibility)");
  check(mainPayloadBlock.includes("sourceCards:"), "sourceCards field preserved in main payload (backward compatibility)");
  check(mainPayloadBlock.includes("sourceStatus:"), "sourceStatus field preserved in main payload (backward compatibility)");

  const domainBoundaryBlockStart = src.indexOf('routeKind:              "DOMAIN_BOUNDARY"');
  check(domainBoundaryBlockStart !== -1, "domain-boundary response block located");
  const domainBoundaryBlock = src.slice(domainBoundaryBlockStart, domainBoundaryBlockStart + 900);
  check(domainBoundaryBlock.includes("trust:                  buildResponseTrust("), "domain-boundary response forwards trust: buildResponseTrust(...)");
  check(domainBoundaryBlock.includes("domainBoundary:         true"), "domainBoundary field preserved in domain-boundary response (backward compatibility)");
  check(domainBoundaryBlock.includes("sourceStatus:           _boundaryStatus"), "sourceStatus field preserved in domain-boundary response (backward compatibility)");

  // Real behavioral execution (PHASE-10A1-R1 P2 correction): actually invoke
  // the exact extractable builder ask-handler.js calls, with the same
  // argument shapes it uses, rather than relying on source-text inspection
  // alone for the forwarding claim itself.
  const mainPayloadTrust = buildResponseTrust({ sourceStatus: "AUTHORITY_FOUND" }, 2, "AUTHORITY_FOUND");
  check(mainPayloadTrust.version === TRUST_CONTRACT_VERSION, "buildResponseTrust (main payload shape) really executes and returns a valid trust object");
  const domainBoundaryTrust = buildResponseTrust({ domainBoundary: true }, 0, "DOMAIN_BOUNDARY_REJECT");
  check(domainBoundaryTrust.responseKind === "DOMAIN_BOUNDARY", "buildResponseTrust (domain-boundary shape) really executes and returns DOMAIN_BOUNDARY");
});

await test("API forwarding: trust appears for controlled LOA procedural, restricted legal-conclusion, verified-authority, related-authority, no-authority, domain-boundary, and safe fallback response shapes", () => {
  const shapes = [
    { responseType: "controlled_loa_answer", controlledLoaAnswer: { controlledLoaAnswer: true } },
    { responseType: "controlled_loa_legal_conclusion_restricted", controlledLoaAnswer: { requiresHumanReview: true } },
    { sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 3 },
    { sourceStatus: "RELATED_AUTHORITY_ONLY", displayedSourceCount: 0 },
    { sourceStatus: "NO_INDEXED_SOURCE", displayedSourceCount: 0 },
    { domainBoundary: true, sourceStatus: "DOMAIN_BOUNDARY_REJECT" },
    { internalError: true, sourceStatus: "PIPELINE_ERROR" }
  ];
  for (const shape of shapes) {
    const out = buildTrustContract(shape);
    check(out && typeof out === "object" && out.version === TRUST_CONTRACT_VERSION, `trust object produced for shape ${JSON.stringify(shape)}`);
  }
});

await test("no secret appears in the fixture or report", () => {
  // Intentionally excludes this test file itself: the secret-scan regex
  // below contains the literal substrings it searches for, so scanning the
  // test file against its own pattern is a guaranteed self-referential false
  // positive, not a real finding.
  const combined = [FIXTURE_PATH, REPORT_PATH]
    .filter((p) => existsSync(resolve(p)))
    .map((p) => readFileSync(resolve(p), "utf8"))
    .join("\n");
  check(!/Bearer\s+ey[A-Za-z0-9_-]{10,}/.test(combined), "no bearer JWT-looking token present");
  check(!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(combined), "no private key present");
  check(!/supabase_service_role|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?ey/i.test(combined), "no Supabase service-role key present");
});

await test("diff scope: no frontend/timeout/route-ordering/conflict-engine/feature-flag/production runtime file was touched, and this task's own files are exactly the PHASE-10A1 set", () => {
  // git diff --name-only HEAD covers tracked-file modifications only (it
  // deliberately ignores pre-existing unrelated untracked scratch files
  // already sitting in the working tree, such as .vscode/ or unrelated
  // eval/tests scratch docs, which this task did not create and must not
  // assert about).
  const modifiedTracked = execSync("git diff --name-only HEAD", { encoding: "utf8" })
    .split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const forbidden = [
    "pipeline.js", "answer-renderer.js", "server.js", "conflict-engine.js",
    "final-answer-compliance.js", "adaptive-tina-master-prompt.js",
    "services/controlled-loa-audit-procedure-boundary.js",
    "services/controlled-loa-legal-conclusion-safety.js",
    "workflow/controlled-loa-answer-runtime-scaffold.js",
    "package.json", "package-lock.json", ".env"
  ];
  for (const f of forbidden) check(!modifiedTracked.includes(f), `runtime file not modified: ${f}`);
  check(!modifiedTracked.some((n) => /^routes\//i.test(n)), "no route file changed");
  check(!modifiedTracked.some((n) => /^(src|client|public|frontend)\//i.test(n)), "no frontend directory file changed");

  const allowedModified = new Set([ASK_HANDLER_PATH, CURRENT_STATE_PATH, "README.md", "knowledge/CURRENT_STATE.md"]);
  const unexpectedModified = modifiedTracked.filter((name) => !allowedModified.has(name));
  check(unexpectedModified.length === 0, `no unexpected tracked file modified: ${JSON.stringify(unexpectedModified)}`);

  const phase10a1Files = [
    ASK_HANDLER_PATH,
    "services/trust-contract.js",
    FIXTURE_PATH,
    "tests/phase-10a1-canonical-trust-contract-and-api-forwarding-remediation-1.test.mjs",
    REPORT_PATH
  ];
  for (const f of phase10a1Files) check(existsSync(resolve(f)), `expected PHASE-10A1 file exists: ${f}`);
});

await test("corroborating existing regression suites are cited and exist", () => {
  const corroborating = [
    "tests/phase-10a-trust-limitation-authority-confidence-release-gate-1.test.mjs",
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

await test("report exists and Phase 10A is not marked complete", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/PHASE-10A2/i.test(report), "report names PHASE-10A2 as the next task");
  check(/independent.{0,20}codex review/i.test(report), "report states independent Codex review is required before PHASE-10A2");
});

await test("CURRENT_STATE.md records PHASE-10A1 without marking Phase 10A itself closed/complete", () => {
  const current = readFileSync(resolve(CURRENT_STATE_PATH), "utf8");
  check(current.includes(PATCH), "CURRENT_STATE contains the 10A1 patch identifier");
  check(/codex/i.test(current), "CURRENT_STATE references the required Codex review");
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
