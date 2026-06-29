/**
 * PATCH-06F-001 - Evaluation Runner Skeleton
 *
 * Run: node tests/patch-06f-001-evaluation-runner-skeleton.test.mjs
 *
 * Verifies the offline evaluation harness skeleton without live API calls,
 * staging credentials, retrieval, reranking, source-card selection, or pipeline
 * behavior changes.
 */

"use strict";

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import {
  DEFAULT_FIXTURE_PATH,
  EVALUATION_CATEGORIES,
  groupCasesByCategory,
  runEvaluation,
  validateEvaluationFixture
} from "../evaluation/runner/evaluation-runner.js";

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

await test("default sample fixture validates offline and reports pending future checks", () => {
  const report = runEvaluation();

  assert.equal(report.runner, "TINA_EVALUATION_RUNNER");
  assert.equal(report.mode, "local_offline_skeleton");
  assert.equal(report.ok, true);
  assert.equal(report.fixturePath, DEFAULT_FIXTURE_PATH);
  assert.equal(report.summary.totalCases, 18);
  assert.equal(report.summary.validCases, 18);
  assert.equal(report.summary.invalidCases, 0);
  assert.equal(report.summary.activeChecks, 18);
  assert.equal(report.summary.pendingChecks, 19);
  assert.equal(report.summary.invalidIssues, 0);
  assert.equal(report.summary.categories.exact_authority, 9);
  assert.equal(report.summary.categories.unavailable_source, 1);
  assert.equal(report.summary.categories.generic_guard, 2);
  assert.equal(report.summary.categories.mode_format, 3);
  assert.equal(report.summary.categories.click_target_integrity, 1);
  assert.equal(report.summary.categories.source_limitation_wording, 1);
  assert.equal(report.summary.categories.domain_source_card_coverage, 1);
});

await test("category registry exposes the planned Phase 6F evaluation categories", () => {
  assert.deepEqual(EVALUATION_CATEGORIES, [
    "exact_authority",
    "unavailable_source",
    "related_authority",
    "generic_guard",
    "case_card_integrity",
    "source_limitation_wording",
    "click_target_integrity",
    "mode_format",
    "domain_source_card_coverage"
  ]);
});

await test("invalid fixtures produce validation issues and non-ok reports", () => {
  const invalidFixture = {
    version: "invalid-test",
    cases: [
      {
        id: "bad-case",
        name: "Bad case",
        category: "not_a_category",
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
  assert(validation.issues.some((issue) => issue.field === "category"));
  assert(validation.issues.some((issue) => issue.field === "route"));
  assert(validation.issues.some((issue) => issue.field === "query"));
  assert(validation.issues.some((issue) => issue.field === "checks"));
});

await test("groupCasesByCategory groups valid cases without mutating them", () => {
  const cases = [
    { id: "a", category: "exact_authority" },
    { id: "b", category: "exact_authority" },
    { id: "c", category: "generic_guard" }
  ];

  const groups = groupCasesByCategory(cases);
  assert.deepEqual(Object.keys(groups).sort(), ["exact_authority", "generic_guard"]);
  assert.equal(groups.exact_authority.length, 2);
  assert.equal(groups.generic_guard[0], cases[2]);
});

await test("runner can write a local JSON report when explicitly requested", () => {
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-runner-"));
  const outputPath = join(dir, "report.json");
  const report = runEvaluation({ outputPath });
  const persisted = JSON.parse(readFileSync(outputPath, "utf8"));

  assert.equal(report.outputPath, outputPath);
  assert.equal(persisted.runner, "TINA_EVALUATION_RUNNER");
  assert.equal(persisted.summary.totalCases, 18);
});

await test("CLI exits zero for valid fixtures and non-zero for invalid fixtures", () => {
  const valid = spawnSync(process.execPath, [
    "evaluation/runner/evaluation-runner.js",
    "--fixture",
    DEFAULT_FIXTURE_PATH
  ], { encoding: "utf8" });

  assert.equal(valid.status, 0);
  const validReport = JSON.parse(valid.stdout);
  assert.equal(validReport.ok, true);

  const dir = mkdtempSync(join(tmpdir(), "tina-eval-invalid-"));
  const invalidPath = join(dir, "invalid.fixture.json");
  writeFileSync(invalidPath, JSON.stringify({ version: "x", cases: [{ id: "bad" }] }), "utf8");

  const invalid = spawnSync(process.execPath, [
    "evaluation/runner/evaluation-runner.js",
    "--fixture",
    invalidPath
  ], { encoding: "utf8" });

  assert.equal(invalid.status, 1);
  const invalidReport = JSON.parse(invalid.stdout);
  assert.equal(invalidReport.ok, false);
  assert.equal(invalidReport.summary.invalidCases, 1);
});

console.log(`\nPATCH-06F-001 evaluation runner skeleton tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
