/**
 * PATCH-06H-007 - Retrieval / reranker comparison report generator tests
 *
 * Run: node tests/patch-06h-007-retrieval-reranker-comparison-report-generator.test.mjs
 *
 * Verifies the local/static Phase 6H comparison report generator without live
 * retrieval, reranking, staging credentials, DB/vector store, OpenAI, Cohere,
 * source-card selection, sourceAvailability, ask/tax/audit runtime behavior,
 * package/dependency changes, or pipeline behavior changes.
 */

"use strict";

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { loadFixtureFile } from "../evaluation/runner/evaluation-runner.js";
import {
  DEFAULT_RETRIEVAL_RERANKER_COMPARISON_FIXTURE_PATH,
  buildRetrievalRerankerComparisonReport,
  generateRetrievalRerankerComparisonReport,
  renderRetrievalRerankerComparisonMarkdownReport
} from "../evaluation/runner/retrieval-reranker-comparison-report-generator.js";

const REQUIRED_GROUPS = [
  "exact_administrative_authority",
  "exact_statutory_authority",
  "exact_case_authority",
  "topic_based_tax",
  "audit_procedural",
  "generic_guard_control",
  "near_match_wrong_authority_control"
];

const REQUIRED_METRICS = [
  "exact_authority_hit_rate",
  "top_1_authority_precision",
  "top_3_authority_recall",
  "source_card_label_integrity",
  "source_card_click_target_integrity",
  "authority_state_accuracy",
  "governing_vs_related_distinction_accuracy",
  "near_match_rejection_rate",
  "generic_query_false_promotion_rate",
  "no_indexed_source_accuracy",
  "source_limitation_accuracy",
  "latency_ms",
  "token_cost_impact",
  "fallback_success_rate",
  "deterministic_repeatability"
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

await test("default fixture path points to PATCH-06H-006 comparison fixture", () => {
  assert.equal(
    DEFAULT_RETRIEVAL_RERANKER_COMPARISON_FIXTURE_PATH,
    resolve("evaluation", "fixtures", "phase-6h-006-retrieval-reranker-comparison.fixture.json")
  );
});

await test("report object summarizes the complete comparison fixture", () => {
  const { fixture } = loadFixtureFile(DEFAULT_RETRIEVAL_RERANKER_COMPARISON_FIXTURE_PATH);
  const report = buildRetrievalRerankerComparisonReport();

  assert.equal(report.ok, true);
  assert.equal(report.fixtureId, "phase-6h-006-retrieval-reranker-comparison");
  assert.equal(report.phase, "PHASE 6H");
  assert.equal(report.patch, "PATCH-06H-006");
  assert.equal(report.totalCases, fixture.cases.length);
  assert.equal(report.totalCases, 35);
  assert.equal(report.generatedContext, "local_static_deterministic");
  assert.equal(report.generatedAtPolicy, "no_live_timestamp_for_deterministic_tests");
});

await test("report counts required groups and metric coverage", () => {
  const report = buildRetrievalRerankerComparisonReport();

  for (const group of REQUIRED_GROUPS) {
    assert(report.groupCounts[group] > 0, `missing group ${group}`);
  }

  assert.equal(report.groupCounts.exact_administrative_authority, 4);
  assert.equal(report.groupCounts.exact_statutory_authority, 5);
  assert.equal(report.groupCounts.exact_case_authority, 3);
  assert.equal(report.groupCounts.topic_based_tax, 7);
  assert.equal(report.groupCounts.audit_procedural, 5);
  assert.equal(report.groupCounts.generic_guard_control, 7);
  assert.equal(report.groupCounts.near_match_wrong_authority_control, 4);

  for (const metric of REQUIRED_METRICS) {
    assert(report.metricCoverage.fixtureMetrics.includes(metric), `missing fixture metric ${metric}`);
  }

  assert.deepEqual(report.metricCoverage.missingFromFixture, []);
  assert.equal(report.coverageGaps.length, 0);
});

await test("report confirms local runtime safety", () => {
  const report = buildRetrievalRerankerComparisonReport();

  assert.equal(report.runtimeSafety.localStaticOnly, true);
  assert.equal(report.runtimeSafety.runtimeSafe, true);
  assert.equal(report.runtimeSafety.requiresNetwork, false);
  assert.equal(report.runtimeSafety.requiresDb, false);
  assert.equal(report.runtimeSafety.requiresSecrets, false);
});

await test("report summarizes exact authority, generic guard, and near-match coverage", () => {
  const report = buildRetrievalRerankerComparisonReport();

  assert.equal(report.exactAuthorityCoverage.totalCases, 12);
  assert(report.exactAuthorityCoverage.administrative.queries.includes("RR 2-98"));
  assert(report.exactAuthorityCoverage.statutory.queries.includes("NIRC Sec. 57"));
  assert(report.exactAuthorityCoverage.caseAuthority.queries.includes("CIR v. Seagate"));

  assert.equal(report.genericGuardCoverage.count, 7);
  assert.equal(report.genericGuardCoverage.nonPromotableCount, 7);
  assert(report.genericGuardCoverage.queries.includes("tax law"));

  assert.equal(report.nearMatchCoverage.count, 4);
  assert.equal(report.nearMatchCoverage.rejectionMarkedCount, 4);
  assert(report.nearMatchCoverage.queries.includes("BIR Ruling DA-489-03"));
});

await test("report summarizes topic-based and audit/procedural coverage", () => {
  const report = buildRetrievalRerankerComparisonReport();

  assert.equal(report.topicBasedCoverage.count, 7);
  assert(report.topicBasedCoverage.queries.includes("VAT zero-rating"));
  assert(report.topicBasedCoverage.queries.includes("input VAT substantiation"));

  assert.equal(report.auditProceduralCoverage.count, 5);
  assert(report.auditProceduralCoverage.queries.includes("LOA validity"));
  assert(report.auditProceduralCoverage.queries.includes("invoice mismatch"));
});

await test("recommended next task is a stabilization gate, not Cohere implementation", () => {
  const report = buildRetrievalRerankerComparisonReport();

  assert.equal(report.recommendedNextTask, "PATCH-06H-GATE-1 - Phase 6H Stabilization Gate");
  assert(!/cohere/i.test(report.recommendedNextTask));
  assert(!/runtime reranker/i.test(report.recommendedNextTask));
});

await test("markdown output includes deterministic required sections", () => {
  const report = buildRetrievalRerankerComparisonReport();
  const markdown = renderRetrievalRerankerComparisonMarkdownReport(report);

  for (const heading of [
    "## Objective",
    "## Fixture Identity",
    "## Runtime Safety",
    "## Case Coverage Summary",
    "## Metric Coverage Summary",
    "## Pass / Fail Policy Summary",
    "## Exact Authority Coverage",
    "## Topic-Based Query Coverage",
    "## Audit / Procedural Query Coverage",
    "## Generic Guard Controls",
    "## Near-Match Controls",
    "## Coverage Gaps",
    "## Recommended Next Task"
  ]) {
    assert(markdown.includes(heading), `missing ${heading}`);
  }

  assert(markdown.includes("PATCH-06H-GATE-1 - Phase 6H Stabilization Gate"));
  assert(!/\d{4}-\d{2}-\d{2}T/.test(markdown));
});

await test("generation is deterministic across repeated calls", () => {
  const first = generateRetrievalRerankerComparisonReport();
  const second = generateRetrievalRerankerComparisonReport();

  assert.deepEqual(first.report, second.report);
  assert.equal(first.markdown, second.markdown);
});

await test("generator can write deterministic markdown when explicitly requested", () => {
  const dir = mkdtempSync(join(tmpdir(), "tina-06h-007-report-"));
  const outputPath = join(dir, "retrieval-reranker-comparison.md");
  const { report, markdown } = generateRetrievalRerankerComparisonReport({ outputPath });
  const persisted = readFileSync(outputPath, "utf8");

  assert.equal(report.outputPath, outputPath);
  assert.equal(persisted, `${markdown}\n`);
  assert(persisted.includes("totalCases: 35"));
});

await test("CLI emits markdown and deterministic JSON", () => {
  const markdownResult = spawnSync(process.execPath, [
    "evaluation/runner/retrieval-reranker-comparison-report-generator.js"
  ], { encoding: "utf8" });

  assert.equal(markdownResult.status, 0);
  assert(markdownResult.stdout.includes("# TINA Phase 6H Retrieval / Reranker Comparison Readiness Report"));
  assert(markdownResult.stdout.includes("PATCH-06H-GATE-1 - Phase 6H Stabilization Gate"));

  const jsonResult = spawnSync(process.execPath, [
    "evaluation/runner/retrieval-reranker-comparison-report-generator.js",
    "--json"
  ], { encoding: "utf8" });

  assert.equal(jsonResult.status, 0);
  const report = JSON.parse(jsonResult.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.totalCases, 35);
  assert.equal(report.generatedContext, "local_static_deterministic");
});

console.log(`\nPATCH-06H-007 retrieval/reranker comparison report generator tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
