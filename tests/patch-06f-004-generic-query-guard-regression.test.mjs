/**
 * PATCH-06F-004 - Generic-query guard regression tests
 *
 * Run: node tests/patch-06f-004-generic-query-guard-regression.test.mjs
 *
 * Verifies the offline generic-query guard regression fixture without live API
 * calls, staging credentials, retrieval, reranking, source-card selection,
 * sourceAvailability, issue classification, ask/tax/audit runtime behavior, or
 * pipeline behavior changes.
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-6f-004-generic-query-guard-regression.fixture.json");

const EXPECTED_QUERIES = [
  "Explain EWT.",
  "What is withholding tax?",
  "What is expanded withholding tax?",
  "What is BIR?",
  "What is the CTA?",
  "What is a CTA case?",
  "What is TRAIN?",
  "What is a Republic Act?",
  "What is a tax law?",
  "What is a G.R. case?",
  "What is jurisprudence?",
  "Are there jurisprudence cases on withholding tax?",
  "Show me tax sources.",
  "Give me BIR issuances.",
  "What are tax cases?"
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

await test("generic-query guard fixture loads and validates", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-6f-004");
  assert.equal(validation.ok, true);
  assert.equal(validation.validCases.length, 15);
  assert.equal(validation.invalidCases.length, 0);
  assert.equal(validation.issues.length, 0);
});

await test("fixture contains the required PATCH-06F-004 generic regression queries", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const queries = fixture.cases.map((testCase) => testCase.query);

  assert.deepEqual(queries, EXPECTED_QUERIES);
});

await test("fixture reuses existing categories for generic guard coverage", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const groups = groupCasesByCategory(fixture.cases);

  assert(EVALUATION_CATEGORIES.includes("generic_guard"));
  assert(EVALUATION_CATEGORIES.includes("related_authority"));
  assert(EVALUATION_CATEGORIES.includes("source_limitation_wording"));

  assert.equal(groups.generic_guard.length, 11);
  assert.equal(groups.related_authority.length, 1);
  assert.equal(groups.source_limitation_wording.length, 3);
});

await test("future assertions mark each query as generic and forbid false exact promotion", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);

  for (const testCase of fixture.cases) {
    const check = futureCheck(testCase);

    assert.equal(check.status, "pending");
    assert.equal(check.queryShape, "generic");
    assert.equal(check.expectedBehavior, "generic_guard");
    assert.equal(check.forbiddenFalseExactPromotion, true);
    assert.equal(check.forbiddenExactCardOverclaim, true);
    assert(Array.isArray(check.forbiddenSubstitutedAuthorities));
    assert(check.forbiddenSubstitutedAuthorities.length > 0);
    assert.equal(typeof check.permittedRelatedSourceBehavior, "string");
    assert(Array.isArray(check.pendingRuntimeAssertions));
    assert(check.pendingRuntimeAssertions.length > 0);
  }
});

await test("fixture carries targeted forbidden substituted authority metadata", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const byId = Object.fromEntries(fixture.cases.map((testCase) => [testCase.id, testCase]));

  assert(futureCheck(byId["bir-agency-generic-query-guard"]).forbiddenSubstitutedAuthorities.includes("NIRC Sec. 2"));
  assert(futureCheck(byId["cta-case-generic-query-guard"]).forbiddenSubstitutedAuthorities.includes("CTA Case No. 9369"));
  assert(futureCheck(byId["train-law-generic-query-guard"]).forbiddenSubstitutedAuthorities.includes("RA 10963"));
  assert(futureCheck(byId["republic-act-generic-query-guard"]).forbiddenSubstitutedAuthorities.includes("RA 11534"));
  assert(futureCheck(byId["gr-case-generic-query-guard"]).forbiddenSubstitutedAuthorities.includes("G.R. No. 153866"));
  assert(futureCheck(byId["tax-cases-broad-lookup-guard"]).forbiddenSubstitutedAuthorities.includes("CTA Case No. 9369"));
});

await test("pending generic guard assertions do not fail the runner", () => {
  const report = runEvaluation({ fixturePath: FIXTURE_PATH });

  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, 15);
  assert.equal(report.summary.validCases, 15);
  assert.equal(report.summary.invalidCases, 0);
  assert.equal(report.summary.activeChecks, 15);
  assert.equal(report.summary.pendingChecks, 15);
  assert.equal(report.summary.invalidIssues, 0);
});

await test("unsupported future generic-guard metadata is counted as pending, not failed", () => {
  const fixture = {
    version: "phase-6f-004-unsupported-future",
    cases: [
      {
        id: "future-generic-guard",
        name: "Future generic guard check",
        category: "generic_guard",
        route: "/ask",
        query: "What is a tax law?",
        checks: [
          { type: "schema" },
          {
            type: "future_runtime_assertion",
            queryShape: "generic",
            expectedBehavior: "generic_guard",
            forbiddenFalseExactPromotion: true
          }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-06f-004-future-"));
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
    version: "phase-6f-004-invalid",
    cases: [
      {
        id: "bad-generic-query-case",
        name: "Bad generic query case",
        category: "generic_guard",
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

await test("CLI exits zero for the generic-query guard regression fixture", () => {
  const result = spawnSync(process.execPath, [
    "evaluation/runner/evaluation-runner.js",
    "--fixture",
    FIXTURE_PATH
  ], { encoding: "utf8" });

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, 15);
  assert.equal(report.summary.pendingChecks, 15);
});

console.log(`\nPATCH-06F-004 generic-query guard regression tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
