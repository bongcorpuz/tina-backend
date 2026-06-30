/**
 * PATCH-06H-006 - Retrieval / reranker comparison scaffold tests
 *
 * Run: node tests/patch-06h-006-retrieval-reranker-comparison-scaffold.test.mjs
 *
 * Validates the offline comparison fixture only. This test does not call live
 * retrieval, reranking, DB/vector store, OpenAI, external APIs, source-card
 * selection, sourceAvailability, or ask/tax/audit runtime behavior.
 */

"use strict";

import assert from "node:assert/strict";
import { resolve } from "node:path";

import {
  loadFixtureFile,
  runEvaluation,
  validateEvaluationFixture
} from "../evaluation/runner/evaluation-runner.js";

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-6h-006-retrieval-reranker-comparison.fixture.json");

const REQUIRED_TOP_LEVEL_FIELDS = [
  "fixtureId",
  "patch",
  "phase",
  "objective",
  "mode",
  "runtimeSafe",
  "requiresNetwork",
  "requiresDb",
  "requiresSecrets",
  "comparisonPurpose",
  "metrics",
  "passFailPolicy",
  "cases"
];

const REQUIRED_CASE_FIELDS = [
  "id",
  "query",
  "group",
  "category",
  "domain",
  "expectedIntent",
  "expectedAuthorityFamily",
  "expectedAuthorityStatePolicy",
  "expectedSourceCardPolicy",
  "expectedGenericGuardPolicy",
  "expectedNearMatchPolicy",
  "expectedRerankerPolicy",
  "expectedComparisonMetrics",
  "risk",
  "notes"
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

const REQUIRED_GROUP_QUERIES = new Map([
  ["exact_administrative_authority", ["RR 2-98", "RMC 65-2012", "RMO 20-2013", "RMO 24-2013"]],
  ["exact_statutory_authority", ["NIRC Sec. 57", "NIRC Sec. 58", "NIRC Section 23", "RA 10963", "RA 11534"]],
  ["exact_case_authority", ["CTA Case No. 9369", "G.R. No. 153866", "CIR v. Seagate"]],
  ["topic_based_tax", ["NOLCO", "VAT zero-rating", "expanded withholding tax", "PEZA VAT treatment", "MCIT", "improperly accumulated earnings tax", "input VAT substantiation"]],
  ["audit_procedural", ["LOA validity", "PAN/FAN mismatch", "subpoena/NTPR", "CWT reconciliation", "invoice mismatch"]],
  ["generic_guard_control", ["tax law", "BIR issuance", "court case", "VAT case", "withholding tax case", "explain EWT", "what is withholding tax"]],
  ["near_match_wrong_authority_control", ["RR 12-2019", "RMC 20-2013", "CTA Case No. 9360", "BIR Ruling DA-489-03"]]
]);

const EXACT_GROUPS = new Set([
  "exact_administrative_authority",
  "exact_statutory_authority",
  "exact_case_authority"
]);

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

function loadFixture() {
  return loadFixtureFile(FIXTURE_PATH).fixture;
}

function casesByGroup(fixture) {
  return fixture.cases.reduce((groups, testCase) => {
    groups[testCase.group] ||= [];
    groups[testCase.group].push(testCase);
    return groups;
  }, {});
}

await test("comparison fixture loads and remains compatible with the evaluation runner", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);
  const report = runEvaluation({ fixturePath: FIXTURE_PATH });

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-6h-006");
  assert.equal(validation.ok, true);
  assert.equal(validation.invalidCases.length, 0);
  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, fixture.cases.length);
});

await test("fixture has required top-level fields and is runtime safe", () => {
  const fixture = loadFixture();

  for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
    assert.notEqual(fixture[field], undefined, `missing top-level field ${field}`);
  }

  assert.equal(fixture.patch, "PATCH-06H-006");
  assert.equal(fixture.runtimeSafe, true);
  assert.equal(fixture.requiresNetwork, false);
  assert.equal(fixture.requiresDb, false);
  assert.equal(fixture.requiresSecrets, false);
  assert(Array.isArray(fixture.cases));
  assert(fixture.cases.length >= 35);
});

await test("fixture defines all required comparison metrics", () => {
  const fixture = loadFixture();

  for (const metric of REQUIRED_METRICS) {
    assert(fixture.metrics.includes(metric), `missing metric ${metric}`);
  }
});

await test("fixture encodes conservative pass/fail policies", () => {
  const { passFailPolicy } = loadFixture();

  assert(passFailPolicy.noRegressionAllowed.includes("exact_authority_hit_rate"));
  assert(passFailPolicy.noRegressionAllowed.includes("source_card_click_target_integrity"));
  assert(passFailPolicy.noRegressionAllowed.includes("generic_query_guard_controls"));
  assert(passFailPolicy.noRegressionAllowed.includes("no_indexed_source_discipline"));
  assert(passFailPolicy.noRegressionAllowed.includes("authority_state_accuracy"));
  assert(passFailPolicy.candidateMustMaintainOrImprove.includes("top_1_authority_precision"));
  assert(passFailPolicy.candidateMustMaintainOrImprove.includes("top_3_authority_recall"));
  assert.match(passFailPolicy.latencyPolicy, /must_not_materially_increase_latency/);
  assert.match(passFailPolicy.externalRerankerPolicy, /fallback/);
  assert.match(passFailPolicy.dependencyPolicy, /cost_latency_privacy_reliability/);
});

await test("all required query groups and minimum query coverage are present", () => {
  const groups = casesByGroup(loadFixture());

  for (const [group, queries] of REQUIRED_GROUP_QUERIES) {
    assert(groups[group], `missing group ${group}`);
    const groupQueries = groups[group].map((testCase) => testCase.query);
    for (const query of queries) {
      assert(groupQueries.includes(query), `${group} missing query ${query}`);
    }
  }
});

await test("each comparison case carries required fields and comparison metadata", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    for (const field of REQUIRED_CASE_FIELDS) {
      assert.notEqual(testCase[field], undefined, `${testCase.id} missing ${field}`);
    }
    assert.equal(typeof testCase.notes, "string", `${testCase.id} notes`);
    assert(testCase.notes.length > 0, `${testCase.id} notes empty`);
    assert(Array.isArray(testCase.expectedComparisonMetrics), `${testCase.id} expectedComparisonMetrics`);
    assert(testCase.expectedComparisonMetrics.length > 0, `${testCase.id} expectedComparisonMetrics empty`);
    assert(Array.isArray(testCase.checks), `${testCase.id} checks`);
    assert(testCase.checks.some((check) => check.type === "schema"), `${testCase.id} schema check`);
    assert(testCase.checks.some((check) => check.type === "future_comparison_assertion" && check.status === "pending"), `${testCase.id} pending comparison check`);
  }
});

await test("generic guard controls are clearly marked as non-promotable", () => {
  const genericCases = casesByGroup(loadFixture()).generic_guard_control;

  assert.equal(genericCases.length, 7);
  for (const testCase of genericCases) {
    assert.equal(testCase.expectedIntent.includes("generic"), true, `${testCase.id} expectedIntent`);
    assert.equal(testCase.expectedAuthorityFamily, "none", `${testCase.id} family`);
    assert.equal(testCase.expectedAuthorityReference, null, `${testCase.id} reference`);
    assert.match(testCase.expectedGenericGuardPolicy, /non_promotable/);
    assert.match(testCase.expectedSourceCardPolicy, /do_not_fabricate/);
    assert(testCase.expectedComparisonMetrics.includes("generic_query_false_promotion_rate"));
    assert(testCase.checks.some((check) => check.forbiddenFalseExactPromotion === true));
  }
});

await test("near-match controls are clearly marked for rejection", () => {
  const nearMatchCases = casesByGroup(loadFixture()).near_match_wrong_authority_control;

  assert(nearMatchCases.length >= 4);
  for (const testCase of nearMatchCases) {
    assert.equal(testCase.expectedIntent.includes("near_match") || testCase.expectedIntent.includes("unavailable"), true, `${testCase.id} expectedIntent`);
    assert.match(testCase.expectedNearMatchPolicy, /reject/);
    assert.match(testCase.expectedRerankerPolicy, /(wrong|unavailable|must_not)/);
    assert(testCase.expectedComparisonMetrics.includes("near_match_rejection_rate") || testCase.expectedComparisonMetrics.includes("no_indexed_source_accuracy"));
    assert(testCase.checks.some((check) => check.rejectNearMatch === true));
  }
});

await test("exact authority cases contain expected authority family and reference", () => {
  const fixture = loadFixture();
  const exactCases = fixture.cases.filter((testCase) => EXACT_GROUPS.has(testCase.group));

  assert(exactCases.length >= 12);
  for (const testCase of exactCases) {
    assert.notEqual(testCase.expectedAuthorityFamily, "none", `${testCase.id} family`);
    assert.equal(typeof testCase.expectedAuthorityReference, "string", `${testCase.id} reference`);
    assert(testCase.expectedAuthorityReference.length > 0, `${testCase.id} reference empty`);
    assert(testCase.expectedComparisonMetrics.some((metric) =>
      ["exact_authority_hit_rate", "source_card_click_target_integrity", "top_1_authority_precision"].includes(metric)
    ), `${testCase.id} exact metrics`);
  }
});

await test("ordinary comparison fixture assertions remain pending, not behavioral", () => {
  const report = runEvaluation({ fixturePath: FIXTURE_PATH });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, loadFixture().cases.length);
  assert.equal(report.summary.pendingChecks, loadFixture().cases.length);
  assert.equal(report.checks.every((check) => check.type === "schema" || check.status === "pending"), true);
});

console.log(`\nPATCH-06H-006 retrieval/reranker comparison scaffold tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
