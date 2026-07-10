// FILE: tests/phase-09zc-controlled-loa-answer-production-activation-gate-1.test.mjs
// PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1
//
// Static/local only. Does not call any production or staging URL. Does not
// depend on HEAD being any particular commit (readiness documentation may be
// read at any point after this patch is committed).

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PATCH = "PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1";
const PHASE = "09ZC";
const BASE_COMMIT = "7b892ed";
const STAGING_DECISION = "PHASE 09ZB CONTROLLED LOA ANSWER STAGING SMOKE PASS WITH STRICT RECOMMENDATIONS";
const NEXT_TASK = "PHASE-09ZD-CONTROLLED-LOA-ANSWER-PRODUCTION-SMOKE-1";
const FIXTURE_PATH = "evaluation/fixtures/phase-09zc-controlled-loa-answer-production-activation-gate-1.fixture.json";
const REPORT_PATH = "PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1_REPORT.md";
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

function diffNames() {
  return execSync("git diff --name-only", { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

let fx;

await test("fixture exists, is valid JSON, and matches core metadata", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture exists");
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(fx.patch === PATCH, "fixture patch id");
  check(fx.phase === PHASE, "fixture phase is 09ZC");
  check(fx.baseCommit === BASE_COMMIT, "fixture baseCommit is 7b892ed");
  check(fx.stagingDecision === STAGING_DECISION, "fixture records the staging PASS decision");
});

await test("production identity fields are recorded", () => {
  check(fx.productionService === "tina-backend", "productionService is tina-backend");
  check(fx.productionUrl === "https://tina-backend-y11x.onrender.com", "productionUrl is correct");
  check(fx.productionFrontend === "https://app.tina.bentoph.com", "productionFrontend is correct");
});

await test("controlled LOA and diagnostic flags are recorded with required diagnostic default", () => {
  check(fx.controlledLoaFlag === "TINA_ENABLE_CONTROLLED_LOA_ASK_GATE", "controlled LOA flag name recorded");
  check(fx.diagnosticFlag === "TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC", "diagnostic flag name recorded");
  check(fx.requiredDiagnosticFlagState === false, "required diagnostic flag state is false");
});

await test("branch comparison, release strategy, and commit inventories are present", () => {
  check(fx.branchComparison && typeof fx.branchComparison === "object", "branch comparison object present");
  check(typeof fx.releaseStrategy === "string" && fx.releaseStrategy.length > 20, "release strategy narrative present");
  check(Array.isArray(fx.candidateRuntimeCommits) && fx.candidateRuntimeCommits.length >= 5, "candidate runtime commit list present");
  check(Array.isArray(fx.excludedOrDocumentationOnlyCommits) && fx.excludedOrDocumentationOnlyCommits.length >= 5, "documentation-only commit list present");
});

await test("production readiness checks and rollback plan are present", () => {
  check(fx.productionReadinessChecks && typeof fx.productionReadinessChecks === "object", "productionReadinessChecks present");
  check(Object.keys(fx.productionReadinessChecks).length >= 15, "at least 15 readiness checks recorded");
  check(fx.rollbackPlan && typeof fx.rollbackPlan === "object", "rollbackPlan present");
  check(Array.isArray(fx.rollbackPlan.immediateRollbackTriggers), "immediateRollbackTriggers is an array");
  const requiredTriggers = [
    "authentication failure",
    "/ask route regression",
    "production 5xx increase",
    "safe queries not returning controlled_loa_answer",
    "unsafe queries receiving controlled_loa_answer",
    "conclusive finality/voidness/appealability wording",
    "unrelated queries triggering LOA behavior",
    "source-card/legal-citation regression",
    "filing-ready output",
    "automatic submission",
    "production diagnostics enabled",
    "frontend cannot connect",
    "CORS regression",
    "response-schema incompatibility",
    "severe latency regression"
  ];
  for (const trigger of requiredTriggers) {
    check(fx.rollbackPlan.immediateRollbackTriggers.includes(trigger), `rollback triggers include: ${trigger}`);
  }
  // auth, routing, safety, and frontend/CORS categories are all represented
  check(fx.rollbackPlan.immediateRollbackTriggers.some((t) => /authentication/i.test(t)), "rollback triggers include an auth-category trigger");
  check(fx.rollbackPlan.immediateRollbackTriggers.some((t) => /ask route|routing/i.test(t)), "rollback triggers include a routing-category trigger");
  check(fx.rollbackPlan.immediateRollbackTriggers.some((t) => /finality|voidness|appealability|controlled_loa_answer/i.test(t)), "rollback triggers include a safety-category trigger");
  check(fx.rollbackPlan.immediateRollbackTriggers.some((t) => /frontend|cors/i.test(t)), "rollback triggers include a frontend/CORS-category trigger");
});

await test("activation/smoke execution flags are false during the plan stage", () => {
  check(fx.productionActivationApproved === false, "productionActivationApproved is false");
  check(fx.productionActivationExecuted === false, "productionActivationExecuted is false");
  check(fx.productionSmokeExecuted === false, "productionSmokeExecuted is false");
});

await test("09ZD is recorded as the separate next task", () => {
  check(fx.nextTaskIfApproved === NEXT_TASK, "nextTaskIfApproved is the 09ZD smoke task");
  check(fx.blockedTaskIfNotApproved === NEXT_TASK, "blockedTaskIfNotApproved also references 09ZD (nothing beyond it is implied)");
});

await test("no production URL is called, no Render mutation, no main push, no env mutation by this test", () => {
  // This test file itself performs no network calls, no Render API writes,
  // no branch-publishing git command, and no environment-variable writes.
  // Verified by static scan of its own source for forbidden patterns.
  const selfSrc = readFileSync(new URL(import.meta.url), "utf8");
  check(!/fetch\s*\(\s*["'`]https:\/\/tina-backend/i.test(selfSrc), "no direct call to a tina-backend URL in this test");
  check(!/api\.render\.com/i.test(selfSrc), "no Render API call in this test");
  check(!/execSync\(\s*["'`]git\s+push/i.test(selfSrc), "no branch-publishing git command invoked by this test");
  check(!/execSync\(\s*["'`]git\s+(?:add|commit)\s+.*main\b/i.test(selfSrc), "no main-branch git mutation invoked by this test");
});

await test("no runtime code is modified by this patch (diff scope check)", () => {
  const changed = diffNames();
  const forbiddenRuntimeFiles = [
    "pipeline.js",
    "ask-handler.js",
    "services/controlled-loa-audit-procedure-boundary.js",
    "services/controlled-loa-legal-conclusion-safety.js",
    "diagnostics/controlled-loa-live-path-trace.js",
    "server.js",
    "package.json",
    "package-lock.json",
    ".env"
  ];
  for (const f of forbiddenRuntimeFiles) {
    check(!changed.includes(f), `runtime/protected file not modified: ${f}`);
  }
  check(!changed.some((name) => /^routes\//i.test(name)), "no route file changed");
  check(!changed.some((name) => /^auth/i.test(name)), "no auth file changed");
  check(!changed.some((name) => /supabase|migration|database|embedding/i.test(name)), "no DB/embedding/migration file changed");
  check(!changed.some((name) => /frontend|public|deploy/i.test(name)), "no frontend/deploy config file changed");
  const allowed = new Set([
    FIXTURE_PATH,
    "tests/phase-09zc-controlled-loa-answer-production-activation-gate-1.test.mjs",
    REPORT_PATH,
    CURRENT_STATE_PATH
  ]);
  for (const name of changed) check(allowed.has(name), `changed file is allowed for 09ZC: ${name}`);
});

await test("report exists and contains required impact statements", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  const required = [
    "Runtime implementation impact: None during the readiness gate.",
    "Production deployment impact: None until separately approved.",
    "Main branch impact: None until separately approved.",
    "Feature flag impact: None until separately approved.",
    "Diagnostic flag requirement: TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC=false.",
    "Database impact: None.",
    "Migration impact: None.",
    "Embedding impact: None.",
    "Ingestion impact: None.",
    "External search impact: None.",
    "Frontend impact: None expected.",
    "Auth impact: None expected.",
    "CORS impact: Must be verified before activation.",
    "Source-card impact: None.",
    "Legal-citation impact: None.",
    "Filing-ready document impact: None.",
    "Automatic submission impact: None.",
    "Production smoke impact: Not part of 09ZC readiness planning.",
    "09ZD remains a separate task.",
    "Production activation requires explicit user approval."
  ];
  for (const phrase of required) check(report.includes(phrase), `report contains: ${phrase}`);
});

await test("CURRENT_STATE.md contains 09ZC entry referencing 09ZD and the diagnostic flag requirement", () => {
  const current = readFileSync(resolve(CURRENT_STATE_PATH), "utf8");
  check(current.includes(PATCH), "CURRENT_STATE contains the 09ZC patch identifier");
  check(current.includes(NEXT_TASK), "CURRENT_STATE references 09ZD as next task");
  check(/TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC/.test(current), "CURRENT_STATE references the 09ZG diagnostic flag");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
