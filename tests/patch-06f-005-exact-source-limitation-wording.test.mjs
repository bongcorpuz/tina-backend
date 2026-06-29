/**
 * PATCH-06F-005 - Exact-source limitation wording regression tests
 *
 * Run: node tests/patch-06f-005-exact-source-limitation-wording.test.mjs
 *
 * Verifies the offline exact-source limitation wording fixture without live API
 * calls, staging credentials, retrieval, reranking, source-card selection,
 * sourceAvailability, answer-text inspection, issue classification,
 * ask/tax/audit runtime behavior, or pipeline behavior changes.
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-6f-005-exact-source-limitation-wording.fixture.json");

const EXPECTED_QUERIES = [
  "EXPOUND CIR v. Seagate Technology (GR No. 153866)",
  "Show me the source for CIR v. Seagate Technology G.R. No. 153866.",
  "What is NIRC Section 23?",
  "Show me the source for NIRC Section 23.",
  "What does NIRC Section 57 provide?",
  "What does NIRC Section 58 provide?",
  "What does RR 2-98 provide on expanded withholding tax?",
  "What is RMC 65-2012?",
  "What is RMO 20-2013?",
  "What is RMO 24-2013?",
  "What is RA 10963?",
  "What is RA 11534?",
  "What is BIR Ruling DA-489-03?",
  "BIR Ruling DA-489-03",
  "Are there jurisprudence cases on withholding tax?"
];

const FORBIDDEN_LIMITATION_PHRASE = "A governing authority was not directly located.";

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

await test("exact-source limitation wording fixture loads and validates", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-6f-005");
  assert.equal(validation.ok, true);
  assert.equal(validation.validCases.length, 15);
  assert.equal(validation.invalidCases.length, 0);
  assert.equal(validation.issues.length, 0);
});

await test("fixture contains the required PATCH-06F-005 regression queries", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const queries = fixture.cases.map((testCase) => testCase.query);

  assert.deepEqual(queries, EXPECTED_QUERIES);
});

await test("fixture reuses existing categories for exact-source limitation coverage", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const groups = groupCasesByCategory(fixture.cases);

  assert(EVALUATION_CATEGORIES.includes("source_limitation_wording"));
  assert(EVALUATION_CATEGORIES.includes("exact_authority"));
  assert(EVALUATION_CATEGORIES.includes("click_target_integrity"));
  assert(EVALUATION_CATEGORIES.includes("unavailable_source"));
  assert(EVALUATION_CATEGORIES.includes("related_authority"));

  assert.equal(groups.source_limitation_wording.length, 1);
  assert.equal(groups.click_target_integrity.length, 1);
  assert.equal(groups.exact_authority.length, 10);
  assert.equal(groups.unavailable_source.length, 2);
  assert.equal(groups.related_authority.length, 1);
});

await test("exact-source cases require exact source/card and forbid misleading limitation wording", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const exactCases = fixture.cases
    .map((testCase) => ({ testCase, check: futureCheck(testCase) }))
    .filter(({ check }) => check.expectedSourceState === "exact_source_present");

  assert.equal(exactCases.length, 12);

  for (const { check } of exactCases) {
    assert.equal(check.status, "pending");
    assert.equal(check.exactSourceRequired, true);
    assert.equal(check.sourceCardRequired, true);
    assert.equal(typeof check.expectedAuthorityType, "string");
    assert.equal(typeof check.expectedAuthorityNumber, "string");
    assert.equal(typeof check.expectedCitation, "string");
    assert(Array.isArray(check.forbiddenLimitationPhrases));
    assert(check.forbiddenLimitationPhrases.includes(FORBIDDEN_LIMITATION_PHRASE));
    assert(check.forbiddenLimitationPhrases.includes("governing authority was not directly located"));
    assert(check.forbiddenLimitationPhrases.includes("directly located"));
    assert.equal(typeof check.allowedLimitationContext, "string");
    assert(Array.isArray(check.pendingRuntimeAssertions));
    assert(check.pendingRuntimeAssertions.length > 0);
  }
});

await test("fixture carries targeted exact authority identifiers", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const byId = Object.fromEntries(fixture.cases.map((testCase) => [testCase.id, testCase]));

  assert.equal(futureCheck(byId["seagate-gr-153866-exact-source-limitation-suppression"]).expectedAuthorityNumber, "G.R. No. 153866");
  assert.equal(futureCheck(byId["nirc-section-23-exact-source-limitation-suppression"]).expectedAuthorityNumber, "NIRC Sec. 23");
  assert.equal(futureCheck(byId["nirc-section-57-exact-source-limitation-suppression"]).expectedAuthorityNumber, "NIRC Sec. 57");
  assert.equal(futureCheck(byId["rr-2-98-exact-source-limitation-suppression"]).expectedAuthorityNumber, "RR 2-98");
  assert.equal(futureCheck(byId["rmc-65-2012-exact-source-limitation-suppression"]).expectedAuthorityNumber, "RMC 65-2012");
  assert.equal(futureCheck(byId["rmo-20-2013-exact-source-limitation-suppression"]).expectedAuthorityNumber, "RMO 20-2013");
  assert.equal(futureCheck(byId["ra-10963-exact-source-limitation-suppression"]).expectedAuthorityNumber, "RA 10963");
});

await test("unavailable and related-only cases allow limitation wording only in accurate context", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const unavailable = fixture.cases
    .map((testCase) => ({ testCase, check: futureCheck(testCase) }))
    .filter(({ check }) => check.expectedSourceState === "unavailable_source");
  const relatedOnly = fixture.cases
    .map((testCase) => ({ testCase, check: futureCheck(testCase) }))
    .filter(({ check }) => check.expectedSourceState === "related_authority_only");

  assert.equal(unavailable.length, 2);
  assert.equal(relatedOnly.length, 1);

  for (const { check } of unavailable) {
    assert.equal(check.exactSourceRequired, false);
    assert.equal(check.sourceCardRequired, false);
    assert(Array.isArray(check.forbiddenSourceCards));
    assert(check.forbiddenSourceCards.includes("BIR Ruling DA-489-03"));
    assert(check.allowedLimitationContext.includes("unavailable") || check.allowedLimitationContext.includes("missing"));
  }

  assert.equal(relatedOnly[0].check.forbiddenFalseExactPromotion, true);
  assert(relatedOnly[0].check.allowedLimitationContext.includes("related"));
});

await test("pending exact-source limitation assertions do not fail the runner", () => {
  const report = runEvaluation({ fixturePath: FIXTURE_PATH });

  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, 15);
  assert.equal(report.summary.validCases, 15);
  assert.equal(report.summary.invalidCases, 0);
  assert.equal(report.summary.activeChecks, 15);
  assert.equal(report.summary.pendingChecks, 15);
  assert.equal(report.summary.invalidIssues, 0);
});

await test("unsupported future limitation metadata is counted as pending, not failed", () => {
  const fixture = {
    version: "phase-6f-005-unsupported-future",
    cases: [
      {
        id: "future-limitation-wording",
        name: "Future limitation wording check",
        category: "source_limitation_wording",
        route: "/ask",
        query: "What is NIRC Section 23?",
        checks: [
          { type: "schema" },
          {
            type: "future_runtime_assertion",
            expectedSourceState: "exact_source_present",
            forbiddenLimitationPhrases: [FORBIDDEN_LIMITATION_PHRASE]
          }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-06f-005-future-"));
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
    version: "phase-6f-005-invalid",
    cases: [
      {
        id: "bad-limitation-wording-case",
        name: "Bad limitation wording case",
        category: "source_limitation_wording",
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

await test("CLI exits zero for the exact-source limitation wording fixture", () => {
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

console.log(`\nPATCH-06F-005 exact-source limitation wording tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
