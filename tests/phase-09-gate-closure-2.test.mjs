// FILE: tests/phase-09-gate-closure-2.test.mjs
// PHASE-09-GATE-CLOSURE-2
//
// Static/local closure validation only. This test does not call production,
// does not read .env, does not mutate environment variables, and does not
// depend on current HEAD being the closure commit.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PATCH = "PHASE-09-GATE-CLOSURE-2";
const DECISION = "PHASE 09 GATE CLOSURE 2 PASS WITH STRICT RECOMMENDATIONS";
const NEXT_PHASE = "PHASE 10 — V1 User-Readiness Release Gates";
const NEXT_TASK = "PHASE-10A-TRUST-LIMITATION-AUTHORITY-CONFIDENCE-RELEASE-GATE-1";
const FIXTURE_PATH = "evaluation/fixtures/phase-09-gate-closure-2.fixture.json";
const REPORT_PATH = "PHASE-09-GATE-CLOSURE-2_REPORT.md";
const CURRENT_STATE_PATH = "knowledge/CURRENT_STATE.md";
const TEST_PATH = "tests/phase-09-gate-closure-2.test.mjs";

let passed = 0;
let failed = 0;
let assertions = 0;
let fx;

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

function read(relPath) {
  return readFileSync(resolve(relPath), "utf8");
}

function diffNames() {
  return execSync("git diff --name-only", { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

await test("fixture exists and records closure identity", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture exists");
  fx = JSON.parse(read(FIXTURE_PATH));
  check(fx.patch === PATCH, "patch is PHASE-09-GATE-CLOSURE-2");
  check(fx.phase === "09", "phase is 09");
  check(fx.closureIteration === 2, "closure iteration is 2");
  check(fx.baseCommit === "cd3e18b", "base commit is cd3e18b");
});

await test("controlling final evidence is present", () => {
  check(fx.stagingSmokeDecision === "PHASE 09ZB CONTROLLED LOA ANSWER STAGING SMOKE PASS WITH STRICT RECOMMENDATIONS", "final 09ZB decision is PASS");
  check(fx.stagingSmokeCommit === "7b892ed", "09ZB commit is recorded");
  check(fx.productionActivationDecision === "PHASE 09ZC CONTROLLED LOA ANSWER PRODUCTION ACTIVATION GATE PASS WITH STRICT RECOMMENDATIONS", "09ZC decision is PASS");
  check(fx.productionActivationCommit === "db03406", "09ZC commit is recorded");
  check(fx.productionSmokeDecision === "PHASE 09ZD CONTROLLED LOA ANSWER PRODUCTION SMOKE PASS WITH STRICT RECOMMENDATIONS", "09ZD decision is PASS");
  check(fx.outcomeContractDecision === "PHASE 09ZJ CONTEXT-FREE OUTCOME QUERY SAFETY CONTRACT CLARIFICATION PASS WITH STRICT RECOMMENDATIONS", "09ZJ decision is PASS");
  check(fx.finalEvidenceCommit === "cd3e18b", "final evidence commit is cd3e18b");
});

await test("final matrix counts and statuses match closure contract", () => {
  check(fx.safeQueryPassCount === 8, "safe-query count is 8");
  check(fx.excludedUnsafePassCount === 12, "excluded unsafe count is 12");
  check(fx.restrictedLegalConclusionPassCount === 4, "restricted legal-conclusion count is 4");
  check(fx.unrelatedTaxPassCount === 8, "unrelated tax count is 8");
  check(fx.nonTaxBoundaryPassCount === 2, "non-tax boundary count is 2");
  check(fx.runtimeSecurityStatus === "PASS", "runtime/security is PASS");
  check(fx.frontendCompatibilityStatus === "PASS", "frontend compatibility is PASS");
  check(fx.sourceCardDisciplineStatus === "PASS", "source-card discipline is PASS");
});

await test("flags, blockers, pending mutation, rollback, and migration states are correct", () => {
  check(fx.controlledLoaFlagState === true, "controlled LOA flag state is true");
  check(fx.diagnosticFlagRequiredState === false, "diagnostic flag required state is false");
  check(fx.productionMutationPending === false, "no production mutation is pending");
  check(fx.rollbackPending === false, "no rollback is pending");
  check(fx.databaseMigrationPending === false, "no database migration is pending");
  check(Array.isArray(fx.runtimeBlockers) && fx.runtimeBlockers.length === 0, "runtime blockers array is empty");
});

await test("known non-blocking debt is present and explicit", () => {
  const debt = JSON.stringify(fx.knownNonBlockingDebt);
  check(/09ZF_SELF_REFERENTIAL_TEST_SCOPE/.test(debt), "09ZF self-referential test debt is present");
  check(/OLDER_DIRTY_DIFF_ALLOWLISTS/.test(debt), "older dirty-diff allowlists debt is present");
  check(/09R_STAGING_REACHABILITY_FIXTURE_ISSUE/.test(debt), "09R staging reachability/fixture issue is present");
  check(/NODE_ENV_STAGING_ERROR_DISCLOSURE_HARDENING/.test(debt), "NODE_ENV hardening item is present");
  check(/SAME_BRANCH_DUAL_SERVICE_AUTODEPLOY_GOVERNANCE/.test(debt), "same-branch deployment governance risk is present");
  check(/non-blocking|not a runtime regression|not resolved in Phase 9|release-governance risk/i.test(debt), "historical debt is classified as non-blocking, not hidden");
});

await test("decision, phase status, next phase, and next task are final", () => {
  check(fx.decision === DECISION, "decision is Phase 9 closure PASS");
  check(fx.phaseStatus === "COMPLETE", "phase status is COMPLETE");
  check(fx.nextPhase === NEXT_PHASE, "next phase is Phase 10");
  check(fx.nextTask === NEXT_TASK, "next task is 10A");
});

await test("report exists and documents final safety contract", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = read(REPORT_PATH);
  for (const required of [
    "PHASE-09-GATE-CLOSURE-2",
    DECISION,
    "Phase 9 status: COMPLETE.",
    "PHASE 09ZD CONTROLLED LOA ANSWER PRODUCTION SMOKE PASS WITH STRICT RECOMMENDATIONS",
    "Will I win?",
    "Will I win my BIR LOA case?",
    "controlled_loa_answer",
    "controlled_loa_legal_conclusion_restricted",
    "TINA_ENABLE_CONTROLLED_LOA_ASK_GATE=true",
    "TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC=false",
    NEXT_PHASE,
    NEXT_TASK
  ]) {
    check(report.includes(required), `report contains ${required}`);
  }
});

await test("CURRENT_STATE records Phase 9 completion and Phase 10 handoff", () => {
  const current = read(CURRENT_STATE_PATH);
  check(current.includes("PHASE-09-GATE-CLOSURE-2 completed."), "CURRENT_STATE records closure completion");
  check(current.includes(DECISION), "CURRENT_STATE records closure PASS decision");
  check(current.includes("Phase 9 status:\nCOMPLETE."), "CURRENT_STATE records Phase 9 COMPLETE");
  check(current.includes("PHASE 09ZD CONTROLLED LOA ANSWER PRODUCTION SMOKE PASS WITH STRICT RECOMMENDATIONS"), "CURRENT_STATE records production smoke completed");
  check(current.includes(NEXT_PHASE), "CURRENT_STATE records Phase 10 as next");
  check(current.includes(NEXT_TASK), "CURRENT_STATE records 10A as next");
});

await test("no runtime, production, environment, or package file is modified", () => {
  const changed = diffNames();
  const allowed = new Set([FIXTURE_PATH, TEST_PATH, REPORT_PATH, CURRENT_STATE_PATH]);
  for (const name of changed) check(allowed.has(name), `changed file is approved closure file: ${name}`);
  for (const forbidden of [
    "pipeline.js",
    "ask-handler.js",
    "services/controlled-loa-audit-procedure-boundary.js",
    "services/controlled-loa-legal-conclusion-safety.js",
    "workflow/controlled-loa-answer-runtime-scaffold.js",
    "diagnostics/controlled-loa-live-path-trace.js",
    "server.js",
    "package.json",
    "package-lock.json",
    ".env"
  ]) {
    check(!changed.includes(forbidden), `protected file not modified: ${forbidden}`);
  }
  check(!changed.some((name) => /^routes\//i.test(name)), "no route file changed");
  check(!changed.some((name) => /^auth/i.test(name)), "no auth file changed");
  check(!changed.some((name) => /frontend|public|deploy|render|docker/i.test(name)), "no frontend/deployment file changed");
  check(!changed.some((name) => /supabase|migration|database|retrieval|ingestion|embedding/i.test(name)), "no database/retrieval/ingestion file changed");
});

await test("test source performs no production calls and mutates no environment", () => {
  const selfSrc = read(TEST_PATH);
  check(!/fetch\s*\(/i.test(selfSrc), "no fetch call");
  check(!/https?\.request\s*\(/i.test(selfSrc), "no http request call");
  check(!/api\.render\.com/i.test(selfSrc), "no Render API call");
  check(!/process\.env\.[A-Z0-9_]+\s*=/i.test(selfSrc), "no environment variable assignment");
  check(!/execSync\(\s*["'`]git\s+(?:push|commit|add|reset|checkout)/i.test(selfSrc), "no production mutation or git mutation command encoded");
});

await test("fixture and report contain no secrets or unrestricted response material", () => {
  const combined = `${JSON.stringify(fx)}\n${read(REPORT_PATH)}`;
  check(!/Bearer\s+[A-Za-z0-9._-]+/i.test(combined), "no bearer token is present");
  check(!/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(combined), "no JWT-shaped token is present");
  check(!/"answer"\s*:/i.test(combined), "no answer body field is recorded");
  check(!/"headers"\s*:/i.test(combined), "no raw headers object is recorded");
  check(!/"cookies?"\s*:/i.test(combined), "no cookie object is recorded");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
