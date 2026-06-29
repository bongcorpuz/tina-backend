/**
 * PATCH-06F-008 - Staging evaluation report generator
 *
 * Run: node tests/patch-06f-008-staging-evaluation-report-generator.test.mjs
 *
 * Verifies the local/static Phase 6F evaluation report generator without live
 * API calls, staging credentials, retrieval, reranking, source-card selection,
 * sourceAvailability, ask/tax/audit runtime behavior, prompts/templates,
 * routes/controllers, DB/indexing/vector/corpus/ingestion, or pipeline behavior
 * changes.
 */

"use strict";

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { runEvaluation } from "../evaluation/runner/evaluation-runner.js";
import {
  DEFAULT_PHASE_6F_FIXTURE_PATHS,
  buildPhase6FEvaluationReport,
  generatePhase6FEvaluationReport,
  renderPhase6FMarkdownReport
} from "../evaluation/runner/evaluation-report-generator.js";

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

await test("default Phase 6F fixture set includes regression fixtures 002 through 007", () => {
  const names = DEFAULT_PHASE_6F_FIXTURE_PATHS.map((fixturePath) => fixturePath.split(/[\\/]/).pop());

  assert.deepEqual(names, [
    "phase-6f-002-authority-source-card-regression.fixture.json",
    "phase-6f-003-case-click-target-integrity.fixture.json",
    "phase-6f-004-generic-query-guard-regression.fixture.json",
    "phase-6f-005-exact-source-limitation-wording.fixture.json",
    "phase-6f-006-mode-format-evaluation.fixture.json",
    "phase-6f-007-domain-source-card-coverage.fixture.json"
  ]);
});

await test("report object summarizes all current Phase 6F regression fixtures deterministically", () => {
  const report = buildPhase6FEvaluationReport();

  assert.equal(report.title, "TINA Phase 6F Evaluation Report");
  assert.equal(report.generatedContext, "local_static_deterministic");
  assert.equal(report.mode, "local_offline_static_report");
  assert.equal(report.ok, true);
  assert.equal(report.summary.totalFixtures, 6);
  assert.equal(report.summary.totalCases, 95);
  assert.equal(report.summary.totalActiveChecks, 95);
  assert.equal(report.summary.totalPendingChecks, 95);
  assert.equal(report.summary.totalInvalidCases, 0);
  assert.equal(report.summary.totalInvalidIssues, 0);
  assert.equal(report.summary.totalUnsupportedAssertions, 95);
  assert.deepEqual(report.summary.fixtureNames, [
    "phase-6f-002",
    "phase-6f-003",
    "phase-6f-004",
    "phase-6f-005",
    "phase-6f-006",
    "phase-6f-007"
  ]);
});

await test("report metrics include category, domain, mode, and source behavior coverage", () => {
  const report = buildPhase6FEvaluationReport();

  assert.equal(report.summary.casesByFixture["phase-6f-002"], 24);
  assert.equal(report.summary.casesByFixture["phase-6f-003"], 6);
  assert.equal(report.summary.casesByFixture["phase-6f-004"], 15);
  assert.equal(report.summary.casesByFixture["phase-6f-005"], 15);
  assert.equal(report.summary.casesByFixture["phase-6f-006"], 15);
  assert.equal(report.summary.casesByFixture["phase-6f-007"], 20);

  assert(report.summary.categories.includes("domain_source_card_coverage"));
  assert(report.summary.categories.includes("mode_format"));
  assert.equal(report.summary.casesByCategory.domain_source_card_coverage, 20);
  assert.equal(report.summary.casesByCategory.mode_format, 15);
  assert(report.summary.domainsCovered.includes("EWT"));
  assert(report.summary.domainsCovered.includes("VAT"));
  assert(report.summary.domainsCovered.includes("PEZA"));
  assert(report.summary.domainsCovered.includes("LOA"));
  assert(report.summary.modesCovered.includes("ask"));
  assert(report.summary.modesCovered.includes("tax"));
  assert(report.summary.modesCovered.includes("audit"));
  assert(report.summary.sourceBehaviorTypesCovered.includes("exact_source_present"));
  assert(report.summary.sourceBehaviorTypesCovered.includes("source_coverage_gap_awareness"));
});

await test("markdown report includes required deterministic sections", () => {
  const report = buildPhase6FEvaluationReport();
  const markdown = renderPhase6FMarkdownReport(report);

  assert(markdown.includes("# TINA Phase 6F Evaluation Report"));
  assert(markdown.includes("## Generated Context"));
  assert(markdown.includes("local_static_deterministic"));
  assert(markdown.includes("## Fixture Summary"));
  assert(markdown.includes("## Case Summary"));
  assert(markdown.includes("## Category Coverage"));
  assert(markdown.includes("## Active Checks"));
  assert(markdown.includes("## Pending / Future Runtime Checks"));
  assert(markdown.includes("## Invalid Case Summary"));
  assert(markdown.includes("## Unsupported Assertion Summary"));
  assert(markdown.includes("## Domain Coverage Summary"));
  assert(markdown.includes("## Mode Coverage Summary"));
  assert(markdown.includes("## Source-Card Coverage Summary"));
  assert(markdown.includes("## Risk / Limitations"));
  assert(markdown.includes("PATCH-06F-GATE-1 - Phase 6F Evaluation Harness Stabilization Gate"));
  assert(!/\d{4}-\d{2}-\d{2}T/.test(markdown));
});

await test("generator can write deterministic local markdown when explicitly requested", () => {
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-report-"));
  const outputPath = join(dir, "phase-6f-report.md");
  const { report, markdown } = generatePhase6FEvaluationReport({ outputPath });
  const persisted = readFileSync(outputPath, "utf8");

  assert.equal(report.outputPath, outputPath);
  assert.equal(persisted, `${markdown}\n`);
  assert(persisted.includes("totalFixtures: 6"));
  assert(persisted.includes("totalCases: 95"));
});

await test("report generator reflects invalid fixture summaries without masking runner validation", () => {
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-report-invalid-"));
  const invalidPath = join(dir, "invalid.fixture.json");
  writeFileSync(invalidPath, JSON.stringify({
    version: "phase-6f-invalid-report-test",
    cases: [
      {
        id: "bad-report-case",
        name: "Bad report case",
        category: "mode_format",
        route: "ask",
        query: "",
        checks: []
      }
    ]
  }), "utf8");

  const runnerReport = runEvaluation({ fixturePath: invalidPath });
  const report = buildPhase6FEvaluationReport({ fixturePaths: [invalidPath] });

  assert.equal(runnerReport.ok, false);
  assert.equal(report.ok, false);
  assert.equal(report.summary.totalFixtures, 1);
  assert.equal(report.summary.totalCases, 1);
  assert.equal(report.summary.totalInvalidCases, 1);
  assert(report.fixtures[0].issues.some((issue) => issue.field === "route"));
  assert(report.fixtures[0].issues.some((issue) => issue.field === "query"));
  assert(report.fixtures[0].issues.some((issue) => issue.field === "checks"));
});

await test("CLI emits markdown and exits zero for default local fixtures", () => {
  const result = spawnSync(process.execPath, [
    "evaluation/runner/evaluation-report-generator.js"
  ], { encoding: "utf8" });

  assert.equal(result.status, 0);
  assert(result.stdout.includes("# TINA Phase 6F Evaluation Report"));
  assert(result.stdout.includes("totalFixtures: 6"));
  assert(result.stdout.includes("totalCases: 95"));
});

await test("CLI emits deterministic JSON when requested", () => {
  const result = spawnSync(process.execPath, [
    "evaluation/runner/evaluation-report-generator.js",
    "--json"
  ], { encoding: "utf8" });

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.generatedContext, "local_static_deterministic");
  assert.equal(report.summary.totalFixtures, 6);
  assert.equal(report.summary.totalCases, 95);
});

console.log(`\nPATCH-06F-008 staging evaluation report generator tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
