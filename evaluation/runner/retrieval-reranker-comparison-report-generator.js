// FILE: evaluation/runner/retrieval-reranker-comparison-report-generator.js

"use strict";

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadFixtureFile, validateEvaluationFixture } from "./evaluation-runner.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

export const DEFAULT_RETRIEVAL_RERANKER_COMPARISON_FIXTURE_PATH = resolve(
  ROOT,
  "evaluation",
  "fixtures",
  "phase-6h-006-retrieval-reranker-comparison.fixture.json"
);

const REQUIRED_GROUPS = Object.freeze([
  "exact_administrative_authority",
  "exact_statutory_authority",
  "exact_case_authority",
  "topic_based_tax",
  "audit_procedural",
  "generic_guard_control",
  "near_match_wrong_authority_control"
]);

const REQUIRED_METRICS = Object.freeze([
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
]);

function sorted(values = []) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function increment(map, key, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
}

function countMapToObject(map) {
  return Object.fromEntries(sorted(map.keys()).map((key) => [key, map.get(key)]));
}

function normalizeFixtureInput(input = {}) {
  if (input.fixture) {
    return { fixture: input.fixture, fixturePath: input.fixturePath || null };
  }
  const fixturePath = input.fixturePath || DEFAULT_RETRIEVAL_RERANKER_COMPARISON_FIXTURE_PATH;
  return loadFixtureFile(fixturePath);
}

function groupCases(cases = []) {
  return cases.reduce((groups, testCase) => {
    groups[testCase.group] ||= [];
    groups[testCase.group].push(testCase);
    return groups;
  }, {});
}

function queryList(cases = []) {
  return cases.map((testCase) => testCase.query);
}

function coverageForGroup(groups, groupName) {
  const cases = groups[groupName] || [];
  return {
    count: cases.length,
    queries: queryList(cases)
  };
}

function collectMetricUsage(cases = []) {
  const usage = new Map();
  for (const testCase of cases) {
    for (const metric of testCase.expectedComparisonMetrics || []) {
      increment(usage, metric);
    }
  }
  return usage;
}

function collectCoverageGaps({ fixture, validation, groupCounts, metricCoverage }) {
  const gaps = [];

  if (!validation.ok) gaps.push("fixture_validation_failed");
  if (fixture.runtimeSafe !== true) gaps.push("runtime_safe_flag_not_true");
  if (fixture.requiresNetwork !== false) gaps.push("requires_network_not_false");
  if (fixture.requiresDb !== false) gaps.push("requires_db_not_false");
  if (fixture.requiresSecrets !== false) gaps.push("requires_secrets_not_false");

  for (const group of REQUIRED_GROUPS) {
    if (!groupCounts[group]) gaps.push(`missing_group:${group}`);
  }

  for (const metric of REQUIRED_METRICS) {
    if (!fixture.metrics?.includes(metric)) gaps.push(`missing_fixture_metric:${metric}`);
  }

  return sorted(gaps);
}

function summarizePassFailPolicy(policy = {}) {
  return {
    noRegressionAllowed: sorted(policy.noRegressionAllowed || []),
    candidateMustMaintainOrImprove: sorted(policy.candidateMustMaintainOrImprove || []),
    latencyPolicy: policy.latencyPolicy || "",
    externalRerankerPolicy: policy.externalRerankerPolicy || "",
    dependencyPolicy: policy.dependencyPolicy || ""
  };
}

export function buildRetrievalRerankerComparisonReport(input = {}) {
  const { fixture, fixturePath } = normalizeFixtureInput(input);
  const validation = validateEvaluationFixture(fixture);
  const cases = Array.isArray(fixture?.cases) ? fixture.cases : [];
  const groups = groupCases(cases);
  const groupCounts = Object.fromEntries(REQUIRED_GROUPS.map((group) => [group, groups[group]?.length || 0]));
  const metricUsage = collectMetricUsage(cases);
  const metricCoverage = {
    required: [...REQUIRED_METRICS],
    fixtureMetrics: sorted(fixture.metrics || []),
    missingFromFixture: REQUIRED_METRICS.filter((metric) => !fixture.metrics?.includes(metric)),
    byCaseUsage: countMapToObject(metricUsage)
  };

  const exactAuthorityCoverage = {
    totalCases:
      (groups.exact_administrative_authority?.length || 0) +
      (groups.exact_statutory_authority?.length || 0) +
      (groups.exact_case_authority?.length || 0),
    administrative: coverageForGroup(groups, "exact_administrative_authority"),
    statutory: coverageForGroup(groups, "exact_statutory_authority"),
    caseAuthority: coverageForGroup(groups, "exact_case_authority")
  };

  const topicBasedCoverage = coverageForGroup(groups, "topic_based_tax");
  const auditProceduralCoverage = coverageForGroup(groups, "audit_procedural");
  const genericGuardCoverage = {
    ...coverageForGroup(groups, "generic_guard_control"),
    nonPromotableCount: (groups.generic_guard_control || []).filter((testCase) =>
      /non_promotable/.test(testCase.expectedGenericGuardPolicy || "")
    ).length
  };
  const nearMatchCoverage = {
    ...coverageForGroup(groups, "near_match_wrong_authority_control"),
    rejectionMarkedCount: (groups.near_match_wrong_authority_control || []).filter((testCase) =>
      /reject/.test(testCase.expectedNearMatchPolicy || "")
    ).length
  };

  const runtimeSafety = {
    runtimeSafe: fixture.runtimeSafe === true,
    requiresNetwork: fixture.requiresNetwork === true,
    requiresDb: fixture.requiresDb === true,
    requiresSecrets: fixture.requiresSecrets === true,
    localStaticOnly:
      fixture.runtimeSafe === true &&
      fixture.requiresNetwork === false &&
      fixture.requiresDb === false &&
      fixture.requiresSecrets === false
  };

  const coverageGaps = collectCoverageGaps({
    fixture,
    validation,
    groupCounts,
    metricCoverage
  });

  return {
    title: "TINA Phase 6H Retrieval / Reranker Comparison Readiness Report",
    generatedContext: "local_static_deterministic",
    generatedAtPolicy: "no_live_timestamp_for_deterministic_tests",
    ok: validation.ok && runtimeSafety.localStaticOnly && coverageGaps.length === 0,
    fixtureId: fixture.fixtureId || null,
    fixturePath: fixturePath || null,
    phase: fixture.phase || null,
    patch: fixture.patch || null,
    totalCases: cases.length,
    groupCounts,
    metricCoverage,
    passFailPolicySummary: summarizePassFailPolicy(fixture.passFailPolicy),
    exactAuthorityCoverage,
    topicBasedCoverage,
    auditProceduralCoverage,
    genericGuardCoverage,
    nearMatchCoverage,
    runtimeSafety,
    coverageGaps,
    validation: {
      ok: validation.ok,
      invalidCases: validation.invalidCases.length,
      issues: validation.issues
    },
    recommendedNextTask: "PATCH-06H-GATE-1 - Phase 6H Stabilization Gate"
  };
}

function formatList(values = []) {
  if (!values.length) return "- none";
  return values.map((value) => `- ${value}`).join("\n");
}

function formatCountObject(object = {}) {
  const entries = Object.entries(object);
  if (!entries.length) return "- none";
  return entries.map(([key, value]) => `- ${key}: ${value}`).join("\n");
}

export function renderRetrievalRerankerComparisonMarkdownReport(report) {
  return [
    `# ${report.title}`,
    "",
    "## Objective",
    "",
    "Summarize the local/static PATCH-06H-006 comparison fixture and confirm structural readiness for future no-dependency retrieval/reranker comparison work.",
    "",
    "## Fixture Identity",
    "",
    `- fixtureId: ${report.fixtureId}`,
    `- phase: ${report.phase}`,
    `- patch: ${report.patch}`,
    `- totalCases: ${report.totalCases}`,
    "",
    "## Runtime Safety",
    "",
    `- localStaticOnly: ${report.runtimeSafety.localStaticOnly}`,
    `- requiresNetwork: ${report.runtimeSafety.requiresNetwork}`,
    `- requiresDb: ${report.runtimeSafety.requiresDb}`,
    `- requiresSecrets: ${report.runtimeSafety.requiresSecrets}`,
    "",
    "## Case Coverage Summary",
    "",
    formatCountObject(report.groupCounts),
    "",
    "## Metric Coverage Summary",
    "",
    formatList(report.metricCoverage.fixtureMetrics),
    "",
    "## Pass / Fail Policy Summary",
    "",
    "- noRegressionAllowed:",
    formatList(report.passFailPolicySummary.noRegressionAllowed),
    "",
    "- candidateMustMaintainOrImprove:",
    formatList(report.passFailPolicySummary.candidateMustMaintainOrImprove),
    "",
    `- latencyPolicy: ${report.passFailPolicySummary.latencyPolicy}`,
    `- externalRerankerPolicy: ${report.passFailPolicySummary.externalRerankerPolicy}`,
    `- dependencyPolicy: ${report.passFailPolicySummary.dependencyPolicy}`,
    "",
    "## Exact Authority Coverage",
    "",
    `- totalCases: ${report.exactAuthorityCoverage.totalCases}`,
    "- administrative:",
    formatList(report.exactAuthorityCoverage.administrative.queries),
    "",
    "- statutory:",
    formatList(report.exactAuthorityCoverage.statutory.queries),
    "",
    "- caseAuthority:",
    formatList(report.exactAuthorityCoverage.caseAuthority.queries),
    "",
    "## Topic-Based Query Coverage",
    "",
    formatList(report.topicBasedCoverage.queries),
    "",
    "## Audit / Procedural Query Coverage",
    "",
    formatList(report.auditProceduralCoverage.queries),
    "",
    "## Generic Guard Controls",
    "",
    `- count: ${report.genericGuardCoverage.count}`,
    `- nonPromotableCount: ${report.genericGuardCoverage.nonPromotableCount}`,
    "",
    formatList(report.genericGuardCoverage.queries),
    "",
    "## Near-Match Controls",
    "",
    `- count: ${report.nearMatchCoverage.count}`,
    `- rejectionMarkedCount: ${report.nearMatchCoverage.rejectionMarkedCount}`,
    "",
    formatList(report.nearMatchCoverage.queries),
    "",
    "## Coverage Gaps",
    "",
    formatList(report.coverageGaps),
    "",
    "## Recommended Next Task",
    "",
    report.recommendedNextTask,
    ""
  ].join("\n");
}

export function generateRetrievalRerankerComparisonReport(options = {}) {
  const report = buildRetrievalRerankerComparisonReport(options);
  const markdown = renderRetrievalRerankerComparisonMarkdownReport(report);

  if (options.outputPath) {
    const resolvedOutputPath = resolve(options.outputPath);
    mkdirSync(dirname(resolvedOutputPath), { recursive: true });
    writeFileSync(resolvedOutputPath, `${markdown}\n`, "utf8");
    report.outputPath = resolvedOutputPath;
  }

  return { report, markdown };
}

function parseCliArgs(argv) {
  const args = { fixturePath: DEFAULT_RETRIEVAL_RERANKER_COMPARISON_FIXTURE_PATH, outputPath: "", json: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--fixture") args.fixturePath = argv[++index];
    else if (arg === "--output") args.outputPath = argv[++index];
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log([
    "TINA Phase 6H retrieval/reranker comparison report generator",
    "",
    "Usage:",
    "  node evaluation/runner/retrieval-reranker-comparison-report-generator.js [--fixture path] [--output path] [--json]",
    "",
    "PATCH-06H-007 reports local/static comparison fixture readiness only. Runtime/live/staging checks remain pending."
  ].join("\n"));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseCliArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    const { report, markdown } = generateRetrievalRerankerComparisonReport({
      fixturePath: args.fixturePath,
      outputPath: args.outputPath
    });
    console.log(args.json ? JSON.stringify(report, null, 2) : markdown);
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.error(error?.stack || error?.message || error);
    process.exit(1);
  }
}
