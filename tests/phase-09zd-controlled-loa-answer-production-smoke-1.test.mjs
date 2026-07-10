// FILE: tests/phase-09zd-controlled-loa-answer-production-smoke-1.test.mjs
// PHASE-09ZD-CONTROLLED-LOA-ANSWER-PRODUCTION-SMOKE-1
//
// Static/local only. Does not call any production URL, does not read .env
// contents, and does not mutate production/runtime configuration.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PATCH = "PHASE-09ZD-CONTROLLED-LOA-ANSWER-PRODUCTION-SMOKE-1";
const PHASE = "09ZD";
const BASE_COMMIT = "db03406";
const DECISION = "PHASE 09ZD CONTROLLED LOA ANSWER PRODUCTION SMOKE BLOCKED";
const BLOCKER = "BLOCKED_WORKSPACE_ACCESS";
const NEXT_TASK = "PHASE-09-GATE-CLOSURE-2";
const FIXTURE_PATH = "evaluation/fixtures/phase-09zd-controlled-loa-answer-production-smoke-1.fixture.json";
const REPORT_PATH = "PHASE-09ZD-CONTROLLED-LOA-ANSWER-PRODUCTION-SMOKE-1_REPORT.md";
const CURRENT_STATE_PATH = "knowledge/CURRENT_STATE.md";
const TEST_PATH = "tests/phase-09zd-controlled-loa-answer-production-smoke-1.test.mjs";

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

await test("fixture exists, is valid JSON, and records blocked metadata", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture exists");
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(fx.patch === PATCH, "fixture patch id");
  check(fx.phase === PHASE, "fixture phase is 09ZD");
  check(fx.baseCommit === BASE_COMMIT, "fixture baseCommit is db03406");
  check(fx.decision === DECISION, "fixture records blocked decision");
  check(fx.blocker === BLOCKER, "fixture records workspace access blocker");
});

await test("production target metadata is recorded without claiming deploy verification", () => {
  check(fx.productionService === "tina-backend", "productionService is tina-backend");
  check(fx.productionUrl === "https://tina-backend-y11x.onrender.com", "productionUrl is correct");
  check(fx.productionFrontend === "https://app.tina.bentoph.com", "productionFrontend is correct");
  check(fx.productionBranch === "feature/source-availability-engine-v1", "production branch recorded");
  check(fx.productionDeployCommit === null, "deploy commit remains unverified");
  check(fx.productionDeployStatus === "NOT_VERIFIED_PRODUCTION_AUTH_KEYS_MISSING", "deploy status records blocker");
});

await test("production access was not attempted without required local auth keys", () => {
  check(fx.productionAccessAttempted === false, "production access was not attempted");
  check(fx.productionJwtPresent === false, "production JWT was not present");
  check(fx.productionAuthHeaderNamePresent === false, "production auth header name was absent");
  check(fx.productionAuthHeaderValuePresent === false, "production auth header value was absent");
  check(fx.envExists === true, ".env exists");
  check(fx.envTracked === false, ".env is not tracked");
  check(fx.envStaged === false, ".env is not staged");
});

await test("all production smoke matrices remain unrun while blocked", () => {
  const countFields = [
    "safeControlledLoaQueriesRun",
    "safeControlledLoaQueriesPassed",
    "unsafeQueriesRun",
    "unsafeQueriesPassed",
    "restrictedLegalConclusionQueriesRun",
    "restrictedLegalConclusionQueriesPassed",
    "unrelatedTaxQueriesRun",
    "unrelatedTaxQueriesPassed",
    "nonTaxQueriesRun",
    "nonTaxQueriesPassed"
  ];
  for (const field of countFields) check(fx[field] === 0, `${field} remains zero`);
});

await test("runtime/security/frontend/source-card statuses are blocked and non-mutating", () => {
  check(fx.runtimeSecurityStatus === "NOT_RUN_PRODUCTION_AUTH_KEYS_MISSING", "runtime/security status blocked");
  check(fx.frontendCompatibilityStatus === "NOT_RUN_PRODUCTION_AUTH_KEYS_MISSING", "frontend status blocked");
  check(fx.sourceCardDisciplineStatus === "NOT_RUN_PRODUCTION_AUTH_KEYS_MISSING", "source-card status blocked");
  check(fx.productionMutation === false, "production mutation is false");
  check(fx.rollbackExecuted === false, "rollback was not executed");
});

await test("rollback and next-task references are retained", () => {
  check(fx.rollbackTarget === "52e133f", "rollback target retained");
  check(fx.rollbackDeployId === "dep-d98creuq1p3s739lle50", "rollback deploy id retained");
  check(fx.nextTaskIfPass === NEXT_TASK, "next task if pass is closure");
  check(fx.blockedTaskIfFail === NEXT_TASK, "blocked task if fail is closure gate");
});

await test("report exists and contains required impact statements", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  const required = [
    "Runtime implementation impact: None.",
    "Production configuration impact: None.",
    "Production deployment impact: None during this smoke.",
    "Feature flag impact: None.",
    "Diagnostic flag impact: None.",
    "Database impact: None.",
    "Migration impact: None.",
    "Embedding impact: None.",
    "Ingestion impact: None.",
    "External search impact: None added.",
    "OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None added.",
    "Frontend implementation impact: None.",
    "Auth implementation impact: None.",
    "Source-card impact: None.",
    "Legal-citation impact: None.",
    "Filing-ready document impact: None.",
    "Automatic submission impact: None.",
    "Production mutation: None.",
    "Rollback executed: No.",
    "Phase 9 closure requires a separate closure task after 09ZD PASS."
  ];
  for (const phrase of required) check(report.includes(phrase), `report contains: ${phrase}`);
});

await test("report and current state record the blocker and no production execution", () => {
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  const current = readFileSync(resolve(CURRENT_STATE_PATH), "utf8");
  for (const text of [report, current]) {
    check(text.includes(PATCH), "artifact contains patch id");
    check(text.includes(DECISION), "artifact contains blocked decision");
    check(text.includes(BLOCKER), "artifact contains blocker code");
    check(text.includes("production smoke auth keys"), "artifact explains missing production smoke auth keys");
  }
});

await test("no production URL is called and no production mutation command is embedded", () => {
  const selfSrc = readFileSync(resolve(TEST_PATH), "utf8");
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
  const allowed = new Set([FIXTURE_PATH, TEST_PATH, REPORT_PATH, CURRENT_STATE_PATH]);
  for (const name of changed) check(allowed.has(name), `changed file is allowed for 09ZD: ${name}`);
});

await test("fixture and report do not contain secrets or unrestricted response material", () => {
  const combined = `${JSON.stringify(fx)}\n${readFileSync(resolve(REPORT_PATH), "utf8")}`;
  check(!/Bearer\s+[A-Za-z0-9._-]+/i.test(combined), "no bearer token is present");
  check(!/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(combined), "no JWT-shaped token is present");
  check(!/"answer"\s*:/i.test(combined), "no answer body field is recorded");
  check(!/"headers"\s*:/i.test(combined), "no raw headers object is recorded");
  check(!/"cookies?"\s*:/i.test(combined), "no cookie object is recorded");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
