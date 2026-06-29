/**
 * PATCH-06F-002 - Authority/source-card regression suite
 *
 * Run: node tests/patch-06f-002-authority-source-card-regression-suite.test.mjs
 *
 * Verifies the offline authority/source-card regression fixture without live
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-6f-002-authority-source-card-regression.fixture.json");

const EXPECTED_QUERIES = [
  "What is BIR Ruling DA-489-03?",
  "BIR Ruling DA-489-03",
  "Explain BIR Ruling DA-489-03",
  "BIR Ruling DA 489 03",
  "What is NIRC Section 23?",
  "Show me the source for NIRC Section 23.",
  "What does NIRC Section 57 provide?",
  "What does NIRC Section 58 provide?",
  "What does RR 2-98 provide on expanded withholding tax?",
  "What is RMC 65-2012?",
  "What is RMO 20-2013?",
  "What is RMO 24-2013?",
  "What is RA 10963?",
  "What is the TRAIN Law?",
  "What is RA 11534?",
  "What is the CREATE Act?",
  "What is CTA Case No. 9369?",
  "EXPOUND CIR v. Seagate Technology (GR No. 153866)",
  "Explain EWT.",
  "What is withholding tax?",
  "What is BIR?",
  "What is TRAIN?",
  "What is a Republic Act?",
  "Are there jurisprudence cases on withholding tax?"
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

await test("authority/source-card fixture loads and validates", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-6f-002");
  assert.equal(validation.ok, true);
  assert.equal(validation.validCases.length, 24);
  assert.equal(validation.invalidCases.length, 0);
  assert.equal(validation.issues.length, 0);
});

await test("fixture contains the required PATCH-06F-002 regression queries", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const queries = fixture.cases.map((testCase) => testCase.query);

  assert.deepEqual(queries, EXPECTED_QUERIES);
});

await test("all cases have required fields and at least one pending future runtime assertion", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);

  for (const testCase of fixture.cases) {
    assert.equal(typeof testCase.id, "string");
    assert.equal(typeof testCase.name, "string");
    assert.equal(typeof testCase.category, "string");
    assert.equal(typeof testCase.route, "string");
    assert.equal(typeof testCase.query, "string");
    assert(Array.isArray(testCase.checks));
    assert(testCase.checks.some((check) => check.type === "schema"));
    assert(testCase.checks.some((check) => check.type === "future_runtime_assertion" && check.status === "pending"));
  }
});

await test("categories are recognized and grouped for authority/source-card coverage", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const groups = groupCasesByCategory(fixture.cases);

  assert(EVALUATION_CATEGORIES.includes("unavailable_source"));
  assert(EVALUATION_CATEGORIES.includes("exact_authority"));
  assert(EVALUATION_CATEGORIES.includes("generic_guard"));
  assert(EVALUATION_CATEGORIES.includes("related_authority"));
  assert(EVALUATION_CATEGORIES.includes("case_card_integrity"));
  assert(EVALUATION_CATEGORIES.includes("source_limitation_wording"));

  assert.equal(groups.unavailable_source.length, 4);
  assert.equal(groups.exact_authority.length, 10);
  assert.equal(groups.related_authority.length, 2);
  assert.equal(groups.case_card_integrity.length, 1);
  assert.equal(groups.source_limitation_wording.length, 1);
  assert.equal(groups.generic_guard.length, 6);
});

await test("pending future runtime assertions do not fail the runner", () => {
  const report = runEvaluation({ fixturePath: FIXTURE_PATH });

  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, 24);
  assert.equal(report.summary.validCases, 24);
  assert.equal(report.summary.invalidCases, 0);
  assert.equal(report.summary.activeChecks, 24);
  assert.equal(report.summary.pendingChecks, 24);
  assert.equal(report.summary.invalidIssues, 0);
  assert(report.checks.every((check) => check.type === "schema" || check.status === "pending"));
});

await test("unsupported future assertion types are counted as pending, not failed", () => {
  const fixture = {
    version: "unsupported-future-check-test",
    cases: [
      {
        id: "future-check",
        name: "Future unsupported assertion check",
        category: "exact_authority",
        route: "/ask",
        query: "What is NIRC Section 23?",
        checks: [
          { type: "schema" },
          { type: "future_runtime_assertion", expectedSourceCard: "NIRC Sec. 23" }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-unsupported-future-"));
  const fixturePath = join(dir, "unsupported.fixture.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

  const report = runEvaluation({ fixturePath });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, 1);
  assert.equal(report.summary.pendingChecks, 1);
  assert.equal(report.checks.find((check) => check.type === "future_runtime_assertion").status, "pending");
});

await test("invalid case shape still fails validation", () => {
  const invalidFixture = {
    version: "phase-6f-002-invalid",
    cases: [
      {
        id: "bad-06f-002-case",
        name: "Bad 06F-002 case",
        category: "case_card_integrity",
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

await test("CLI exits zero for the authority/source-card regression fixture", () => {
  const result = spawnSync(process.execPath, [
    "evaluation/runner/evaluation-runner.js",
    "--fixture",
    FIXTURE_PATH
  ], { encoding: "utf8" });

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, 24);
  assert.equal(report.summary.pendingChecks, 24);
});

console.log(`\nPATCH-06F-002 authority/source-card regression suite tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
