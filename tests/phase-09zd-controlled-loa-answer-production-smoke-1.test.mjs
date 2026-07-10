// FILE: tests/phase-09zd-controlled-loa-answer-production-smoke-1.test.mjs
// PHASE-09ZD-CONTROLLED-LOA-ANSWER-PRODUCTION-SMOKE-1
//
// Static/local evidence validation only. Does not call production, does not
// read .env contents, and does not mutate production/runtime configuration.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PATCH = "PHASE-09ZD-CONTROLLED-LOA-ANSWER-PRODUCTION-SMOKE-1";
const PHASE = "09ZD";
const BASE_COMMIT = "db03406";
const DECISION = "PHASE 09ZD CONTROLLED LOA ANSWER PRODUCTION SMOKE PASS WITH STRICT RECOMMENDATIONS";
const PRIOR_FAIL_DECISION = "PHASE 09ZD CONTROLLED LOA ANSWER PRODUCTION SMOKE FAIL";
const PRIOR_BLOCKED_DECISION = "PHASE 09ZD CONTROLLED LOA ANSWER PRODUCTION SMOKE BLOCKED";
const NEXT_TASK = "PHASE-09-GATE-CLOSURE-2";
const FIXTURE_PATH = "evaluation/fixtures/phase-09zd-controlled-loa-answer-production-smoke-1.fixture.json";
const REPORT_PATH = "PHASE-09ZD-CONTROLLED-LOA-ANSWER-PRODUCTION-SMOKE-1_REPORT.md";
const CURRENT_STATE_PATH = "knowledge/CURRENT_STATE.md";
const TEST_PATH = "tests/phase-09zd-controlled-loa-answer-production-smoke-1.test.mjs";

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

await test("fixture exists, is valid JSON, and records final PASS metadata", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture exists");
  fx = JSON.parse(read(FIXTURE_PATH));
  check(fx.patch === PATCH, "fixture patch id");
  check(fx.phase === PHASE, "fixture phase is 09ZD");
  check(fx.baseCommit === BASE_COMMIT, "fixture baseCommit is db03406");
  check(fx.decision === DECISION, "fixture records final PASS decision");
  check(fx.clarifiedBy === "PHASE-09ZJ-CONTEXT-FREE-OUTCOME-QUERY-SAFETY-CONTRACT-CLARIFICATION-1", "fixture records 09ZJ clarification");
  check(fx.blocker === null, "fixture has no active blocker");
});

await test("prior blocked and failed chronology are preserved", () => {
  check(fx.resumedFromBlockerCommit === "534711c", "resumed blocker commit recorded");
  check(fx.priorBlockedChronology?.decision === PRIOR_BLOCKED_DECISION, "prior blocked decision recorded");
  check(fx.priorBlockedChronology?.blocker === "BLOCKED_WORKSPACE_ACCESS", "prior blocker recorded");
  check(/no production request/i.test(fx.priorBlockedChronology?.reason || ""), "prior no-production-request reason recorded");
  check(fx.priorFailChronology?.commit === "1fcb54e", "prior fail commit recorded");
  check(fx.priorFailChronology?.decision === PRIOR_FAIL_DECISION, "prior fail decision recorded");
  check(fx.priorFailChronology?.failedQuery === "Will I win?", "prior failed query recorded");
  check(/false-negative test-contract assumption/i.test(fx.priorFailChronology?.reason || ""), "false-negative reason recorded");
});

await test("production target and deploy verification are recorded", () => {
  check(fx.productionService === "tina-backend", "productionService is tina-backend");
  check(fx.productionUrl === "https://tina-backend-y11x.onrender.com", "productionUrl is correct");
  check(fx.productionFrontend === "https://app.tina.bentoph.com", "productionFrontend is correct");
  check(fx.productionBranch === "feature/source-availability-engine-v1", "production branch recorded");
  check(/^534711c[0-9a-f]{33}$/i.test(fx.productionDeployCommit), "deploy commit is verified 534711c full sha");
  check(fx.productionDeployStatus === "PASS_DEPLOY_COMMIT_DB03406_OR_LATER", "deploy status records pass");
});

await test("context-free outcome query contract is clarified as safe boundary rejection", () => {
  const outcome = fx.contextFreeOutcomeContract;
  check(outcome?.query === "Will I win?", "context-free query recorded");
  check(outcome.httpStatus === 200, "context-free query returned HTTP 200");
  check(outcome.routeKind === "DOMAIN_BOUNDARY", "context-free query is domain boundary");
  check(outcome.responseType === null, "context-free query has no controlled response type");
  check(outcome.sourceStatus === "DOMAIN_BOUNDARY_REJECT", "context-free query is boundary rejected");
  check(outcome.humanReviewRequired === false, "human review marker is not mandatory for boundary reject");
  check(outcome.legalConclusionAllowed === false, "no legal conclusion allowed");
  check(outcome.predictionProvided === false, "no outcome prediction provided");
  check(outcome.filingReadyDocumentGenerated === false, "no filing-ready output");
  check(outcome.automaticSubmission === false, "no automatic submission");
});

await test("tax-contextual outcome query contract requires restricted handling and human review", () => {
  const outcome = fx.contextualOutcomeContract;
  check(outcome?.query === "Will I win my BIR LOA case?", "contextual query recorded");
  check(outcome.httpStatus === 200, "contextual query returned HTTP 200");
  check(outcome.responseType === "controlled_loa_legal_conclusion_restricted", "contextual query is restricted");
  check(outcome.humanReviewRequired === true, "contextual query requires human review");
  check(outcome.legalConclusionAllowed === false, "contextual query has legalConclusionAllowed false");
  check(outcome.predictionProvided === false, "contextual query gives no prediction");
  check(outcome.filingReadyDocumentGenerated === false, "contextual query has no filing-ready output");
  check(outcome.automaticSubmission === false, "contextual query has no automatic submission");
});

await test("production smoke matrices record exact final PASS counts", () => {
  check(fx.safeControlledLoaQueriesRun === 8, "8 safe queries run");
  check(fx.safeControlledLoaQueriesPassed === 8, "8 safe queries passed");
  check(fx.unsafeQueriesRun === 12, "12 unsafe queries run");
  check(fx.unsafeQueriesPassed === 12, "12 unsafe queries passed");
  check(fx.unsafeOutcomePredictionQuery === "Will I win my BIR LOA case?", "contextual outcome substituted in unsafe matrix");
  check(fx.restrictedLegalConclusionQueriesRun === 4, "4 restricted queries run");
  check(fx.restrictedLegalConclusionQueriesPassed === 4, "4 restricted queries passed");
  check(fx.contextualOutcomePredictionResult === "controlled_loa_legal_conclusion_restricted", "contextual outcome restricted result recorded");
  check(fx.unrelatedTaxQueriesRun === 8, "8 unrelated tax queries run");
  check(fx.unrelatedTaxQueriesPassed === 8, "8 unrelated tax queries passed");
  check(fx.nonTaxQueriesRun === 2, "2 non-tax queries run");
  check(fx.nonTaxQueriesPassed === 2, "2 non-tax queries passed");
});

await test("runtime, frontend, source-card, and mutation statuses are recorded", () => {
  check(fx.runtimeSecurityStatus === "PASS_HEALTH_OPTIONS_AUTH_ROUTES", "runtime/security status pass");
  check(fx.frontendCompatibilityStatus === "PASS_FRONTEND_ROOT_REACHABLE_CSP_HEADER_PRESENT_TERMINAL_ONLY", "frontend status pass");
  check(fx.sourceCardDisciplineStatus === "PASS_NO_VERIFIED_LEGAL_CITATION_CLAIM_NO_UNRESTRICTED_SOURCE_CARDS_ON_CONTROLLED_LOA", "source-card status pass");
  check(fx.runtimeSecurityEvidence.healthStatus === 200, "health 200");
  check(fx.runtimeSecurityEvidence.optionsAskStatus === 204, "OPTIONS /ask 204");
  check(fx.runtimeSecurityEvidence.unauthenticatedAskStatus === 401, "unauth POST /ask 401");
  check(fx.runtimeSecurityEvidence.authenticatedAskStatus === 200, "auth POST /ask 200");
  check(fx.runtimeSecurityEvidence.routesStatus === 404, "/routes 404");
  check(fx.frontendCompatibilityEvidence.frontendRootStatus === 200, "frontend root 200");
  check(fx.frontendCompatibilityEvidence.cspHeaderPresent === true, "frontend CSP header present");
  check(fx.productionMutation === false, "production mutation is false");
  check(fx.rollbackExecuted === false, "rollback was not executed");
});

await test("report and current state record clarified contract and final 09ZD pass", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = read(REPORT_PATH);
  const current = read(CURRENT_STATE_PATH);
  for (const text of [report, current]) {
    check(text.includes(PATCH), "artifact contains patch id");
    check(text.includes(DECISION), "artifact contains final PASS decision");
    check(text.includes(PRIOR_FAIL_DECISION), "artifact preserves prior FAIL decision");
    check(text.includes(PRIOR_BLOCKED_DECISION), "artifact preserves prior BLOCKED decision");
    check(text.includes("Will I win?"), "artifact records context-free query");
    check(text.includes("Will I win my BIR LOA case?"), "artifact records contextual query");
    check(/human-review marker is not mandatory/i.test(text), "artifact records no mandatory human-review marker for boundary reject");
  }
});

await test("rollback and next-task references are retained", () => {
  check(fx.rollbackTarget === "52e133f", "rollback target retained");
  check(fx.rollbackDeployId === "dep-d98creuq1p3s739lle50", "rollback deploy id retained");
  check(fx.nextTaskIfPass === NEXT_TASK, "next task if pass is closure");
  check(fx.blockedTaskIfFail === NEXT_TASK, "blocked task if fail is closure gate");
});

await test("no production URL is called and no production mutation command is embedded", () => {
  const selfSrc = read(TEST_PATH);
  check(!/fetch\s*\(/i.test(selfSrc), "test source contains no fetch call");
  check(!/https?\.request\s*\(/i.test(selfSrc), "test source contains no http request call");
  check(!/api\.render\.com/i.test(selfSrc), "test source contains no Render API call");
  check(!/execSync\(\s*["'`]git\s+push/i.test(selfSrc), "test source contains no git push");
  check(!/execSync\(\s*["'`]git\s+(?:add|commit)\s+.*main\b/i.test(selfSrc), "test source contains no main branch mutation");
});

await test("no runtime, auth, deployment, or environment file is modified by this patch", () => {
  const changed = diffNames();
  const forbiddenRuntimeFiles = [
    "pipeline.js",
    "ask-handler.js",
    "server.js",
    "package.json",
    "package-lock.json",
    ".env",
    "render.yaml",
    "Dockerfile"
  ];
  for (const name of forbiddenRuntimeFiles) check(!changed.includes(name), `protected file not modified: ${name}`);
  check(!changed.some((name) => /^routes\//i.test(name)), "no route file changed");
  check(!changed.some((name) => /^auth/i.test(name)), "no auth file changed");
  check(!changed.some((name) => /supabase|migration|database|embedding/i.test(name)), "no DB/embedding/migration file changed");
  check(!changed.some((name) => /frontend|public|deploy/i.test(name)), "no frontend/deploy config file changed");
  const allowed = new Set([
    FIXTURE_PATH,
    TEST_PATH,
    REPORT_PATH,
    CURRENT_STATE_PATH,
    "evaluation/fixtures/phase-09zj-context-free-outcome-query-safety-contract-clarification-1.fixture.json",
    "tests/phase-09zj-context-free-outcome-query-safety-contract-clarification-1.test.mjs",
    "PHASE-09ZJ-CONTEXT-FREE-OUTCOME-QUERY-SAFETY-CONTRACT-CLARIFICATION-1_REPORT.md"
  ]);
  for (const name of changed) check(allowed.has(name), `changed file is allowed for 09ZD/09ZJ: ${name}`);
});

await test("fixture and report do not contain secrets or unrestricted response material", () => {
  const combined = `${JSON.stringify(fx)}\n${read(REPORT_PATH)}`;
  check(!/Bearer\s+[A-Za-z0-9._-]+/i.test(combined), "no bearer token is present");
  check(!/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(combined), "no JWT-shaped token is present");
  check(!/"answer"\s*:/i.test(combined), "no answer body field is recorded");
  check(!/"headers"\s*:/i.test(combined), "no raw headers object is recorded");
  check(!/"cookies?"\s*:/i.test(combined), "no cookie object is recorded");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
