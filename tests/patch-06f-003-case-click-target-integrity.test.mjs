/**
 * PATCH-06F-003 - CTA / G.R. click-target integrity tests
 *
 * Run: node tests/patch-06f-003-case-click-target-integrity.test.mjs
 *
 * Verifies the offline case-card/click-target integrity fixture without live
 * API calls, staging credentials, retrieval, reranking, source-card selection,
 * sourceAvailability, or pipeline behavior changes.
 */

"use strict";

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  EVALUATION_CATEGORIES,
  groupCasesByCategory,
  loadFixtureFile,
  runEvaluation,
  validateEvaluationFixture
} from "../evaluation/runner/evaluation-runner.js";

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-6f-003-case-click-target-integrity.fixture.json");

const EXPECTED_QUERIES = [
  "What is CTA Case No. 9369?",
  "Show me the source for CTA Case No. 9369.",
  "EXPOUND CIR v. Seagate Technology (GR No. 153866)",
  "Show me the source for CIR v. Seagate Technology G.R. No. 153866.",
  "What is a G.R. case?",
  "What is a CTA case?"
];

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
    failed++;
  }
}

function futureCheck(testCase) {
  return testCase.checks.find((check) => check.type === "future_runtime_assertion");
}

await test("case click-target fixture loads and validates", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-6f-003");
  assert.equal(validation.ok, true);
  assert.equal(validation.validCases.length, 6);
  assert.equal(validation.invalidCases.length, 0);
  assert.equal(validation.issues.length, 0);
});

await test("fixture contains the required PATCH-06F-003 regression queries", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const queries = fixture.cases.map((testCase) => testCase.query);

  assert.deepEqual(queries, EXPECTED_QUERIES);
});

await test("fixture reuses existing categories for case-card and click-target coverage", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const groups = groupCasesByCategory(fixture.cases);

  assert(EVALUATION_CATEGORIES.includes("case_card_integrity"));
  assert(EVALUATION_CATEGORIES.includes("click_target_integrity"));
  assert(EVALUATION_CATEGORIES.includes("source_limitation_wording"));
  assert(EVALUATION_CATEGORIES.includes("generic_guard"));

  assert.equal(groups.case_card_integrity.length, 1);
  assert.equal(groups.click_target_integrity.length, 2);
  assert.equal(groups.source_limitation_wording.length, 1);
  assert.equal(groups.generic_guard.length, 2);
});

await test("future assertions include exact CTA/G.R. identity and click-target metadata", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const byId = Object.fromEntries(fixture.cases.map((testCase) => [testCase.id, testCase]));

  const ctaExact = futureCheck(byId["cta-case-9369-exact-card-target"]);
  assert.equal(ctaExact.status, "pending");
  assert.equal(ctaExact.expectedAuthorityType, "CTA_CASE");
  assert.equal(ctaExact.expectedCaseNumber, "CTA Case No. 9369");
  assert(ctaExact.expectedSourceCardTerms.includes("CTA Case No. 9369"));
  assert(ctaExact.expectedClickTargetTerms.includes("CTA Case No. 9369"));
  assert(ctaExact.forbiddenAuthorityNumbers.includes("CTA Case No. 9368"));

  const seagateExact = futureCheck(byId["seagate-gr-153866-exact-source"]);
  assert.equal(seagateExact.status, "pending");
  assert.equal(seagateExact.expectedAuthorityType, "SUPREME_COURT_GR");
  assert.equal(seagateExact.expectedCaseNumber, "G.R. No. 153866");
  assert(seagateExact.expectedTitleTerms.includes("Seagate"));
  assert(seagateExact.forbiddenLimitationPhrases.includes("A governing authority was not directly located."));
});

await test("generic guards include false-promotion metadata", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const genericCases = fixture.cases.filter((testCase) => testCase.category === "generic_guard");

  assert.equal(genericCases.length, 2);
  for (const testCase of genericCases) {
    const check = futureCheck(testCase);
    assert.equal(check.status, "pending");
    assert.equal(check.forbiddenFalseExactPromotion, true);
    assert(Array.isArray(check.forbiddenAuthorityNumbers));
    assert(check.forbiddenAuthorityNumbers.length > 0);
  }
});

await test("pending click-target assertions do not fail the runner", () => {
  const report = runEvaluation({ fixturePath: FIXTURE_PATH });

  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, 6);
  assert.equal(report.summary.validCases, 6);
  assert.equal(report.summary.invalidCases, 0);
  assert.equal(report.summary.activeChecks, 6);
  assert.equal(report.summary.pendingChecks, 6);
  assert.equal(report.summary.invalidIssues, 0);
});

await test("unsupported future assertion metadata is counted as pending, not failed", () => {
  const fixture = {
    version: "phase-6f-003-unsupported-future",
    cases: [
      {
        id: "future-click-target",
        name: "Future click-target check",
        category: "click_target_integrity",
        route: "/ask",
        query: "Show me the source for CTA Case No. 9369.",
        checks: [
          { type: "schema" },
          {
            type: "future_runtime_assertion",
            expectedAuthorityType: "CTA_CASE",
            expectedClickTargetTerms: ["CTA Case No. 9369"]
          }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-06f-003-future-"));
  const fixturePath = join(dir, "future.fixture.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

  const report = runEvaluation({ fixturePath });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, 1);
  assert.equal(report.summary.pendingChecks, 1);
  assert.equal(report.checks.find((check) => check.type === "future_runtime_assertion").status, "pending");
});

await test("invalid case shape still fails validation", () => {
  const invalidFixture = {
    version: "phase-6f-003-invalid",
    cases: [
      {
        id: "bad-click-target-case",
        name: "Bad click-target case",
        category: "click_target_integrity",
        route: "ask",
        query: "",
        checks: []
      }
    ]
  };

  const validation = validateEvaluationFixture(invalidFixture);

  assert.equal(validation.ok, false);
  assert.equal(validation.validCases.length, 0);
  assert.equal(validation.invalidCases.length, 1);
  assert(validation.issues.some((issue) => issue.field === "route"));
  assert(validation.issues.some((issue) => issue.field === "query"));
  assert(validation.issues.some((issue) => issue.field === "checks"));
});

await test("CLI exits zero for the case click-target fixture", () => {
  const result = spawnSync(process.execPath, [
    "evaluation/runner/evaluation-runner.js",
    "--fixture",
    FIXTURE_PATH
  ], { encoding: "utf8" });

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, 6);
  assert.equal(report.summary.pendingChecks, 6);
});

console.log(`\nPATCH-06F-003 CTA/G.R. click-target integrity tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
