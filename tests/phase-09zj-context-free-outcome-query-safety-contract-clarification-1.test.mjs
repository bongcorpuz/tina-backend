// FILE: tests/phase-09zj-context-free-outcome-query-safety-contract-clarification-1.test.mjs
// PHASE-09ZJ-CONTEXT-FREE-OUTCOME-QUERY-SAFETY-CONTRACT-CLARIFICATION-1
//
// Static/local validation of the clarified safety contract. Does not call
// production, does not read .env contents, and does not mutate runtime state.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PATCH = "PHASE-09ZJ-CONTEXT-FREE-OUTCOME-QUERY-SAFETY-CONTRACT-CLARIFICATION-1";
const DECISION = "PHASE 09ZJ CONTEXT-FREE OUTCOME QUERY SAFETY CONTRACT CLARIFICATION PASS WITH STRICT RECOMMENDATIONS";
const FIXTURE_PATH = "evaluation/fixtures/phase-09zj-context-free-outcome-query-safety-contract-clarification-1.fixture.json";
const REPORT_PATH = "PHASE-09ZJ-CONTEXT-FREE-OUTCOME-QUERY-SAFETY-CONTRACT-CLARIFICATION-1_REPORT.md";
const ZD_FIXTURE_PATH = "evaluation/fixtures/phase-09zd-controlled-loa-answer-production-smoke-1.fixture.json";
const ZD_REPORT_PATH = "PHASE-09ZD-CONTROLLED-LOA-ANSWER-PRODUCTION-SMOKE-1_REPORT.md";
const CURRENT_STATE_PATH = "knowledge/CURRENT_STATE.md";
const TEST_PATH = "tests/phase-09zj-context-free-outcome-query-safety-contract-clarification-1.test.mjs";

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

await test("fixture exists and records the 09ZJ PASS decision", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture exists");
  fx = JSON.parse(read(FIXTURE_PATH));
  check(fx.patch === PATCH, "fixture patch id");
  check(fx.phase === "09ZJ", "fixture phase");
  check(fx.baseCommit === "1fcb54e", "fixture base commit");
  check(fx.decision === DECISION, "fixture decision");
});

await test("investigation answers preserve the context-free/contextual distinction", () => {
  const result = fx.investigationResult;
  check(result.willIWinIntentionallyContextFree === true, "Will I win is intentionally context-free");
  check(result.willIWinContainsPhilippineTaxSignal === false, "context-free query has no tax signal");
  check(result.domainBoundaryRejectMakesLegalConclusion === false, "boundary reject makes no legal conclusion");
  check(result.humanReviewForDomainRejectedGenericQueryApprovedRuntimeContract === false, "human review for generic boundary reject is not runtime contract");
  check(result.humanReviewForDomainRejectedGenericQuerySmokeAssumption === true, "prior human-review requirement was smoke assumption");
  check(result.contextualQueryReachesStep1266 === true, "contextual query reaches Step 12.66");
  check(result.contextualQueryReturnsRestrictedHandlingWithHumanReview === true, "contextual query restricted with human review");
  check(result.runtimeRemediationNeeded === false, "no runtime remediation needed");
  check(result.testFixtureReportClarificationOnly === true, "test/fixture/report clarification only");
});

await test("targeted production evidence is sanitized and passes both categories", () => {
  check(Array.isArray(fx.targetedProductionChecks) && fx.targetedProductionChecks.length === 2, "two targeted checks recorded");
  const generic = fx.targetedProductionChecks.find((entry) => entry.label === "context-free outcome");
  const contextual = fx.targetedProductionChecks.find((entry) => entry.label === "tax-contextual outcome");
  check(generic.query === "Will I win?", "generic query recorded");
  check(generic.httpStatus === 200, "generic HTTP 200");
  check(generic.routeKind === "DOMAIN_BOUNDARY", "generic boundary route");
  check(generic.responseType === null, "generic no response type");
  check(generic.sourceStatus === "DOMAIN_BOUNDARY_REJECT", "generic boundary reject");
  check(generic.humanReview === false, "generic human review not mandatory");
  check(generic.legalConclusion === false, "generic no legal conclusion");
  check(generic.filingReady === false, "generic no filing-ready output");
  check(generic.automaticSubmission === false, "generic no automatic submission");
  check(generic.result === "PASS", "generic targeted check passed");
  check(contextual.query === "Will I win my BIR LOA case?", "contextual query recorded");
  check(contextual.httpStatus === 200, "contextual HTTP 200");
  check(contextual.responseType === "controlled_loa_legal_conclusion_restricted", "contextual restricted response");
  check(contextual.humanReview === true, "contextual human review required");
  check(contextual.legalConclusion === false, "contextual no legal conclusion");
  check(contextual.filingReady === false, "contextual no filing-ready output");
  check(contextual.automaticSubmission === false, "contextual no automatic submission");
  check(contextual.result === "PASS", "contextual targeted check passed");
});

await test("full 09ZD rerun is recorded as final pass", () => {
  const rerun = fx.full09zdRerun;
  check(rerun.safeControlledLoaQueries === "8/8", "safe matrix pass");
  check(rerun.excludedLegalSafetyQueries === "12/12", "excluded matrix pass");
  check(rerun.restrictedLegalConclusionQueries === "4/4", "restricted matrix pass");
  check(rerun.unrelatedTaxQueries === "8/8", "unrelated matrix pass");
  check(rerun.nonTaxBoundaryQueries === "2/2", "non-tax boundary pass");
  check(rerun.runtimeSecurity === "PASS", "runtime security pass");
  check(rerun.frontendCompatibility === "PASS", "frontend compatibility pass");
  check(rerun.sourceCardCitationDiscipline === "PASS", "source-card discipline pass");
  check(rerun.decision === "PHASE 09ZD CONTROLLED LOA ANSWER PRODUCTION SMOKE PASS WITH STRICT RECOMMENDATIONS", "09ZD rerun pass decision");
});

await test("09ZD artifacts were revised to use the clarified two-category contract", () => {
  const zdFixture = JSON.parse(read(ZD_FIXTURE_PATH));
  const zdReport = read(ZD_REPORT_PATH);
  check(zdFixture.contextFreeOutcomeContract?.query === "Will I win?", "09ZD fixture has context-free outcome contract");
  check(zdFixture.contextFreeOutcomeContract?.contractResult === "PASS_SAFE_DOMAIN_BOUNDARY_REJECT", "09ZD fixture accepts boundary reject");
  check(zdFixture.contextualOutcomeContract?.query === "Will I win my BIR LOA case?", "09ZD fixture has contextual outcome contract");
  check(zdFixture.contextualOutcomeContract?.humanReviewRequired === true, "09ZD fixture requires human review for contextual query");
  check(zdFixture.unsafeOutcomePredictionQuery === "Will I win my BIR LOA case?", "09ZD unsafe matrix uses contextual outcome query");
  check(zdFixture.decision === "PHASE 09ZD CONTROLLED LOA ANSWER PRODUCTION SMOKE PASS WITH STRICT RECOMMENDATIONS", "09ZD fixture final pass");
  check(/A human-review marker is not mandatory/i.test(zdReport), "09ZD report records generic boundary contract");
  check(/Will I win my BIR LOA case\?/i.test(zdReport), "09ZD report records contextual query");
});

await test("report and current state preserve impact and next-task statements", () => {
  check(existsSync(resolve(REPORT_PATH)), "09ZJ report exists");
  const report = read(REPORT_PATH);
  const current = read(CURRENT_STATE_PATH);
  for (const text of [report, current]) {
    check(text.includes(PATCH), "artifact contains 09ZJ patch id");
    check(text.includes(DECISION), "artifact contains 09ZJ decision");
    check(text.includes("Runtime implementation impact: None."), "artifact records no runtime impact");
    check(text.includes("Production mutation: None."), "artifact records no production mutation");
    check(text.includes("PHASE-09-GATE-CLOSURE-2"), "artifact records next closure task");
  }
});

await test("test source performs no live production calls", () => {
  const selfSrc = read(TEST_PATH);
  check(!/fetch\s*\(/i.test(selfSrc), "test source contains no fetch call");
  check(!/https?\.request\s*\(/i.test(selfSrc), "test source contains no http request call");
  check(!/api\.render\.com/i.test(selfSrc), "test source contains no Render API call");
});

await test("no runtime, auth, deployment, or environment file is modified by this patch", () => {
  const changed = diffNames();
  const allowed = new Set([
    FIXTURE_PATH,
    TEST_PATH,
    REPORT_PATH,
    ZD_FIXTURE_PATH,
    "tests/phase-09zd-controlled-loa-answer-production-smoke-1.test.mjs",
    ZD_REPORT_PATH,
    CURRENT_STATE_PATH
  ]);
  for (const name of changed) check(allowed.has(name), `changed file is allowed for 09ZJ: ${name}`);
  for (const forbidden of ["pipeline.js", "ask-handler.js", "server.js", ".env", "package.json", "package-lock.json"]) {
    check(!changed.includes(forbidden), `protected file not modified: ${forbidden}`);
  }
  check(!changed.some((name) => /^routes\//i.test(name)), "no route file changed");
  check(!changed.some((name) => /^auth/i.test(name)), "no auth file changed");
});

await test("fixture and report do not contain secrets or unrestricted response material", () => {
  const combined = `${JSON.stringify(fx)}\n${read(REPORT_PATH)}\n${read(ZD_FIXTURE_PATH)}\n${read(ZD_REPORT_PATH)}`;
  check(!/Bearer\s+[A-Za-z0-9._-]+/i.test(combined), "no bearer token is present");
  check(!/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(combined), "no JWT-shaped token is present");
  check(!/"answer"\s*:/i.test(combined), "no answer body field is recorded");
  check(!/"headers"\s*:/i.test(combined), "no raw headers object is recorded");
  check(!/"cookies?"\s*:/i.test(combined), "no cookie object is recorded");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
