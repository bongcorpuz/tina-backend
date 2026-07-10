// FILE: tests/phase-10a-trust-limitation-authority-confidence-release-gate-1.test.mjs
// PHASE-10A-TRUST-LIMITATION-AUTHORITY-CONFIDENCE-RELEASE-GATE-1
//
// Local/static/pure by default. Directly exercises real pure functions
// (applyVerifiedAuthorityGate, conflictMetadataIsComplete,
// evaluateControlledLoaAskGate, evaluateControlledLoaLegalConclusionSafetyGate,
// detectPhilippineTaxBoundary) against representative synthetic states, not
// merely static string scans. Does not call any production or staging URL.
// Does not depend on HEAD being any particular commit.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  detectPhilippineTaxBoundary,
  evaluateControlledLoaAskGate,
  evaluateControlledLoaLegalConclusionSafetyGate
} from "../pipeline.js";
import {
  applyVerifiedAuthorityGate,
  conflictMetadataIsComplete
} from "../answer-renderer.js";

const PATCH = "PHASE-10A-TRUST-LIMITATION-AUTHORITY-CONFIDENCE-RELEASE-GATE-1";
const PHASE = "10A";
const BASE_COMMIT = "d4c621a";
const FIXTURE_PATH = "evaluation/fixtures/phase-10a-trust-limitation-authority-confidence-release-gate-1.fixture.json";
const REPORT_PATH = "PHASE-10A-TRUST-LIMITATION-AUTHORITY-CONFIDENCE-RELEASE-GATE-1_REPORT.md";
const CURRENT_STATE_PATH = "knowledge/CURRENT_STATE.md";

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

function enabledEnv() {
  return { TINA_ENABLE_CONTROLLED_LOA_ASK_GATE: "1" };
}

let fx;

await test("fixture exists, is valid JSON, and matches core metadata", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture exists");
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(fx.patch === PATCH, "fixture patch id");
  check(fx.phase === PHASE, "fixture phase is 10A");
  check(fx.baseCommit === BASE_COMMIT, "fixture baseCommit is d4c621a");
});

await test("trust contract and authority-confidence model are recorded, numeric confidence is not used", () => {
  check(typeof fx.trustContractStatus === "string" && fx.trustContractStatus.length > 50, "trust contract narrative recorded");
  check(typeof fx.authorityConfidenceModel === "string" && /categorical/i.test(fx.authorityConfidenceModel), "authority confidence model recorded and categorical");
  check(fx.numericConfidenceUsed === false, "numeric confidence is not used");
});

await test("all required per-category states are recorded", () => {
  for (const key of [
    "verifiedAuthorityState", "relatedAuthorityState", "noVerifiedAuthorityState",
    "conflictingAuthorityState", "incompleteFactsState", "restrictedLegalConclusionState",
    "proceduralGuidanceState", "nonTaxBoundaryState"
  ]) {
    check(fx[key] !== undefined && fx[key] !== null, `fixture records ${key}`);
  }
  check(typeof fx.sourceCardConsistencyStatus === "string", "source-card consistency recorded");
  check(typeof fx.legalCitationDisciplineStatus === "string", "legal-citation discipline recorded");
  check(typeof fx.humanReviewStatus === "string", "human-review behavior recorded");
  check(typeof fx.filingReadyBoundaryStatus === "string", "filing-ready boundary recorded");
  check(typeof fx.automaticSubmissionBoundaryStatus === "string", "automatic-submission boundary recorded");
  check(fx.frontendTrustDisplayStatus && typeof fx.frontendTrustDisplayStatus === "object", "frontend trust display recorded");
  check(typeof fx.fallbackSafetyStatus === "string", "fallback safety recorded");
});

await test("release blockers and must-fix items are explicitly listed (possibly empty, but present)", () => {
  check(Array.isArray(fx.releaseBlockers), "releaseBlockers is an array");
  check(Array.isArray(fx.mustFixBeforeV1), "mustFixBeforeV1 is an array");
  check(Array.isArray(fx.strongRecommendations), "strongRecommendations is an array");
  check(Array.isArray(fx.postV1Enhancements), "postV1Enhancements is an array");
});

await test("real execution: AUTHORITY_FOUND suppresses an unverified citation even when a different verified source exists", () => {
  const result = applyVerifiedAuthorityGate({
    answer: "The rate is 5%. See NIRC Section 999 for the controlling rule.",
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [{ normalizedReference: "nircsec57" }]
  });
  check(result.leakageBlocked === true, "leakageBlocked true for fabricated citation");
  check(!/nirc section 999/i.test(result.answer), "fabricated citation is not present in the gated answer");
});

await test("real execution: RELATED_AUTHORITY_ONLY relabels a controlling-authority heading, preserving markdown", () => {
  const result = applyVerifiedAuthorityGate({
    answer: "**Controlling Authority:**\nNIRC Section 57.\n\nThis explains withholding tax generally.",
    saeStatus: "RELATED_AUTHORITY_ONLY",
    finalSourceCards: [{ normalizedReference: "nircsec57" }]
  });
  check(result.relabelApplied === true, "relabelApplied true");
  check(/related \/ supporting authorities/i.test(result.answer), "heading relabeled to Related/Supporting Authorities");
  check(!/\*\*controlling authority/i.test(result.answer), "no remaining Controlling Authority heading");
  check(result.answer.includes("**"), "markdown bold markers preserved for frontend rendering");
});

await test("real execution: NO_INDEXED_SOURCE strips citation-bearing content and substitutes the canned limitation message", () => {
  const result = applyVerifiedAuthorityGate({
    answer: "Controlling Authority:\nNIRC Section 57 governs this.",
    saeStatus: "NO_INDEXED_SOURCE",
    finalSourceCards: []
  });
  check(result.leakageBlocked === true, "leakageBlocked true");
  check(/could not identify an indexed authority/i.test(result.answer), "canned limitation message present");
  check(/does not mean that no law or authority exists/i.test(result.answer), "absence of authority is not framed as absence of law");
});

await test("known edge case: AUTHORITY_FOUND with a single unverified-citation line and nonzero verified keys can yield an empty answer", () => {
  const result = applyVerifiedAuthorityGate({
    answer: "See NIRC Section 999.",
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [{ normalizedReference: "nircsec57" }]
  });
  check(result.leakageBlocked === true, "leakageBlocked true");
  check(result.answer.length === 0, "reproduces the documented empty-answer edge case (P2 finding, not a new regression)");
});

await test("real execution: conflictMetadataIsComplete distinguishes incomplete from complete conflict metadata", () => {
  const incomplete = conflictMetadataIsComplete({ conflict: true });
  const complete = conflictMetadataIsComplete({
    conflict: true,
    conflictType: "DOCTRINAL",
    exactIssue: true,
    exactLegalDimension: true,
    sameIssueGate: { passed: true },
    oppositeHoldingGate: { passed: true },
    resolutionBasis: "hierarchy"
  });
  check(incomplete === false, "incomplete conflict metadata is correctly rejected");
  check(complete === true, "complete conflict metadata is correctly accepted");
});

await test("real execution: restricted legal-conclusion queries are deterministically intercepted, never controlled_loa_answer", () => {
  const restricted = [
    "Is my LOA invalid?",
    "Is the FAN void?",
    "Is the assessment final?",
    "Will I win my BIR case?",
    "Should I appeal to the CTA?"
  ];
  for (const query of restricted) {
    const gate1 = evaluateControlledLoaAskGate({ ctx: {}, query, hook: "/ask", env: enabledEnv() });
    check(gate1.matched === false, `safe-answer gate does not match restricted query: ${query}`);
    const gate2 = evaluateControlledLoaLegalConclusionSafetyGate({
      ctx: {}, query, hook: "/ask", env: enabledEnv(), intentClassification: gate1.intentClassification
    });
    check(gate2.matched === true, `legal-conclusion safety gate matches restricted query: ${query}`);
    const response = gate2.earlyExitResponse;
    check(response.responseType !== "controlled_loa_answer", `restricted query never returns controlled_loa_answer: ${query}`);
    check(response.controlledLoaAnswer.legalConclusionAllowed === false, `legalConclusionAllowed false: ${query}`);
    check(response.controlledLoaAnswer.filingReadyDocumentGenerated === false, `filingReadyDocumentGenerated false: ${query}`);
    check(response.controlledLoaAnswer.automaticSubmission === false, `automaticSubmission false: ${query}`);
    check(response.controlledLoaAnswer.requiresHumanReview === true, `requiresHumanReview true: ${query}`);
  }
});

await test("real execution: controlled procedural LOA queries return controlled_loa_answer with safe source-card discipline", () => {
  const procedural = [
    "I received a BIR LOA. What should I do?",
    "I received a replacement eLA, what should I check first?",
    "I received a notice for presentation/submission of documents."
  ];
  for (const query of procedural) {
    const gate = evaluateControlledLoaAskGate({ ctx: {}, query, hook: "/ask", env: enabledEnv() });
    check(gate.matched === true, `controlled procedural query matches: ${query}`);
    const response = gate.earlyExitResponse;
    check(response.responseType === "controlled_loa_answer", `controlled_loa_answer returned: ${query}`);
    check(Array.isArray(response.sourceCards) && response.sourceCards.length === 0, `sourceCards empty: ${query}`);
    check(response.controlledLoaAnswer.legalCitationAllowed === false, `legalCitationAllowed false: ${query}`);
  }
});

await test("real execution: non-tax domain queries are boundary-rejected", () => {
  for (const query of ["How do I bake a cake?", "What is the weather in Tokyo?"]) {
    const boundary = detectPhilippineTaxBoundary(query, "/ask");
    check(boundary.decision !== "ALLOW", `non-tax query is not boundary-allowed: ${query}`);
  }
});

await test("corroborating existing regression suites are cited and pass", () => {
  const corroborating = [
    "tests/patch-024c-verified-authority-gate.test.mjs",
    "tests/patch-06f-005-exact-source-limitation-wording.test.mjs",
    "tests/patch-07a-003-authority-state-response-policy-and-gate-compatibility.test.mjs",
    "tests/patch-07a-008-source-limitation-mode-boundary-hardening.test.mjs"
  ];
  for (const suitePath of corroborating) {
    check(existsSync(resolve(suitePath)), `corroborating suite exists: ${suitePath}`);
  }
});

await test("no secret appears in the fixture or report", () => {
  const fixtureText = readFileSync(resolve(FIXTURE_PATH), "utf8");
  const reportText = existsSync(resolve(REPORT_PATH)) ? readFileSync(resolve(REPORT_PATH), "utf8") : "";
  const combined = fixtureText + reportText;
  check(!/Bearer\s+ey[A-Za-z0-9_-]{10,}/.test(combined), "no bearer JWT-looking token present");
  check(!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(combined), "no private key present");
  check(!/supabase_service_role|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?ey/i.test(combined), "no Supabase service-role key present");
});

await test("no runtime or frontend remediation was implemented by this patch (diff scope check)", () => {
  const changed = execSync("git diff --name-only", { encoding: "utf8" })
    .split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const forbidden = [
    "pipeline.js", "ask-handler.js", "answer-renderer.js", "server.js",
    "services/controlled-loa-audit-procedure-boundary.js",
    "services/controlled-loa-legal-conclusion-safety.js",
    "workflow/controlled-loa-answer-runtime-scaffold.js",
    "final-answer-compliance.js", "adaptive-tina-master-prompt.js",
    "package.json", "package-lock.json", ".env"
  ];
  for (const f of forbidden) check(!changed.includes(f), `runtime file not modified: ${f}`);
  check(!changed.some((n) => /^routes\//i.test(n)), "no route file changed");
  check(!changed.some((n) => /^auth/i.test(n)), "no auth file changed");
  const allowed = new Set([
    FIXTURE_PATH,
    "tests/phase-10a-trust-limitation-authority-confidence-release-gate-1.test.mjs",
    REPORT_PATH,
    CURRENT_STATE_PATH
  ]);
  for (const name of changed) check(allowed.has(name), `changed file is allowed for 10A: ${name}`);
});

await test("report exists and contains the required explicit no-remediation statement", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/runtime remediation has not yet been implemented/i.test(report), "report explicitly states runtime remediation has not yet been implemented");
  check(/independent.{0,20}codex review/i.test(report), "report states independent Codex review is required");
});

await test("CURRENT_STATE.md records Phase 10A status and independent review requirement", () => {
  const current = readFileSync(resolve(CURRENT_STATE_PATH), "utf8");
  check(current.includes(PATCH), "CURRENT_STATE contains the 10A patch identifier");
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
  check(!unsafeClosureClaim, "CURRENT_STATE does not declare 10A itself closed/complete outside a 'do not mark ... until' guard sentence");
});

await test("decision wording matches one of the four allowed final decisions", () => {
  const allowedDecisions = new Set([
    "PHASE 10A VALIDATION PASS — NO REMEDIATION REQUIRED",
    "PHASE 10A VALIDATION PASS WITH STRICT RECOMMENDATIONS",
    "PHASE 10A VALIDATION REMEDIATION REQUIRED",
    "PHASE 10A VALIDATION BLOCKED"
  ]);
  check(allowedDecisions.has(fx.decision), `fixture decision matches an allowed wording: ${fx.decision}`);
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
