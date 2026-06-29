// FILE: evaluation/runner/evaluation-report-generator.js

"use strict";

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadFixtureFile, runEvaluation } from "./evaluation-runner.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

export const DEFAULT_PHASE_6F_FIXTURE_PATHS = Object.freeze([
  resolve(ROOT, "evaluation", "fixtures", "phase-6f-002-authority-source-card-regression.fixture.json"),
  resolve(ROOT, "evaluation", "fixtures", "phase-6f-003-case-click-target-integrity.fixture.json"),
  resolve(ROOT, "evaluation", "fixtures", "phase-6f-004-generic-query-guard-regression.fixture.json"),
  resolve(ROOT, "evaluation", "fixtures", "phase-6f-005-exact-source-limitation-wording.fixture.json"),
  resolve(ROOT, "evaluation", "fixtures", "phase-6f-006-mode-format-evaluation.fixture.json"),
  resolve(ROOT, "evaluation", "fixtures", "phase-6f-007-domain-source-card-coverage.fixture.json")
]);

const FIXTURE_PURPOSES = Object.freeze({
  "phase-6f-002": "authority/source-card behavior",
  "phase-6f-003": "CTA/G.R. click-target integrity",
  "phase-6f-004": "generic-query guards",
  "phase-6f-005": "exact-source limitation wording",
  "phase-6f-006": "/ask, /tax, /audit mode-format expectations",
  "phase-6f-007": "EWT, VAT, PEZA, LOA domain source-card coverage"
});

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function countMapToObject(map) {
  return Object.fromEntries(sorted(map.keys()).map((key) => [key, map.get(key)]));
}

function increment(map, key, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
}

function collectFutureChecks(fixture) {
  const checks = [];
  for (const testCase of fixture?.cases || []) {
    for (const check of testCase.checks || []) {
      if (check?.type && check.type !== "schema") {
        checks.push({ caseId: testCase.id, category: testCase.category, check });
      }
    }
  }
  return checks;
}

function buildFixtureEntry(fixturePath) {
  const report = runEvaluation({ fixturePath });
  const { fixture } = loadFixtureFile(fixturePath);
  const futureChecks = collectFutureChecks(fixture);
  const fixtureName = fixture.version || fixturePath;

  return {
    fixtureName,
    fixturePath: report.fixturePath,
    purpose: FIXTURE_PURPOSES[fixtureName] || "local evaluation fixture",
    ok: report.ok,
    summary: report.summary,
    categories: report.summary.categories,
    invalidCases: report.invalidCases,
    issues: report.issues,
    futureChecks
  };
}

export function buildPhase6FEvaluationReport(options = {}) {
  const fixturePaths = options.fixturePaths || DEFAULT_PHASE_6F_FIXTURE_PATHS;
  const fixtures = fixturePaths.map((fixturePath) => buildFixtureEntry(fixturePath));

  const categories = new Map();
  const casesByFixture = new Map();
  const activeByFixture = new Map();
  const pendingByFixture = new Map();
  const casesByCategory = new Map();
  const unsupportedAssertionTypes = new Map();
  const domainsCovered = new Set();
  const modesCovered = new Set();
  const sourceBehaviorTypesCovered = new Set();

  let totalCases = 0;
  let totalActiveChecks = 0;
  let totalPendingChecks = 0;
  let totalInvalidCases = 0;
  let totalInvalidIssues = 0;

  for (const fixtureEntry of fixtures) {
    const summary = fixtureEntry.summary;
    totalCases += summary.totalCases;
    totalActiveChecks += summary.activeChecks;
    totalPendingChecks += summary.pendingChecks;
    totalInvalidCases += summary.invalidCases;
    totalInvalidIssues += summary.invalidIssues;
    casesByFixture.set(fixtureEntry.fixtureName, summary.totalCases);
    activeByFixture.set(fixtureEntry.fixtureName, summary.activeChecks);
    pendingByFixture.set(fixtureEntry.fixtureName, summary.pendingChecks);

    for (const [category, count] of Object.entries(summary.categories)) {
      increment(categories, category, count);
      increment(casesByCategory, category, count);
    }

    for (const { check } of fixtureEntry.futureChecks) {
      increment(unsupportedAssertionTypes, check.type);
      if (check.domain) domainsCovered.add(check.domain);
      if (check.typedCommandMode) modesCovered.add(check.typedCommandMode);
      if (check.expectedInternalMode) modesCovered.add(check.expectedInternalMode);
      if (check.expectedSourceBehavior) sourceBehaviorTypesCovered.add(check.expectedSourceBehavior);
      if (check.expectedSourceState) sourceBehaviorTypesCovered.add(check.expectedSourceState);
    }
  }

  const summary = {
    totalFixtures: fixtures.length,
    totalCases,
    totalCategories: categories.size,
    totalActiveChecks,
    totalPendingChecks,
    totalInvalidCases,
    totalInvalidIssues,
    totalUnsupportedAssertions: [...unsupportedAssertionTypes.values()].reduce((sum, count) => sum + count, 0),
    fixtureNames: fixtures.map((fixture) => fixture.fixtureName),
    categories: sorted(categories.keys()),
    casesByCategory: countMapToObject(casesByCategory),
    casesByFixture: countMapToObject(casesByFixture),
    pendingByFixture: countMapToObject(pendingByFixture),
    activeByFixture: countMapToObject(activeByFixture),
    unsupportedAssertionTypes: countMapToObject(unsupportedAssertionTypes),
    domainsCovered: sorted(domainsCovered),
    modesCovered: sorted(modesCovered),
    sourceBehaviorTypesCovered: sorted(sourceBehaviorTypesCovered)
  };

  return {
    title: "TINA Phase 6F Evaluation Report",
    generatedContext: "local_static_deterministic",
    phase: "PHASE 6F - Automated Evaluation & Regression Harness",
    mode: "local_offline_static_report",
    ok: fixtures.every((fixture) => fixture.ok),
    summary,
    fixtures,
    limitations: [
      "This report summarizes local/static fixture evaluation only.",
      "Runtime, source-card, answer-text, staging, and live API assertions remain pending/future.",
      "No DB, indexing, vector store, corpus, ingestion, retrieval, reranker, or runtime behavior is exercised."
    ],
    recommendedNextAction: "PATCH-06F-GATE-1 - Phase 6F Evaluation Harness Stabilization Gate"
  };
}

function formatCountObject(object) {
  const entries = Object.entries(object);
  if (entries.length === 0) return "- none";
  return entries.map(([key, value]) => `- ${key}: ${value}`).join("\n");
}

function formatList(values) {
  if (!values || values.length === 0) return "- none";
  return values.map((value) => `- ${value}`).join("\n");
}

export function renderPhase6FMarkdownReport(report) {
  return [
    `# ${report.title}`,
    "",
    "## Generated Context",
    "",
    report.generatedContext,
    "",
    "## Phase",
    "",
    report.phase,
    "",
    "## Fixture Summary",
    "",
    `- totalFixtures: ${report.summary.totalFixtures}`,
    `- ok: ${report.ok}`,
    "",
    formatList(report.summary.fixtureNames),
    "",
    "## Case Summary",
    "",
    `- totalCases: ${report.summary.totalCases}`,
    `- totalInvalidCases: ${report.summary.totalInvalidCases}`,
    `- totalInvalidIssues: ${report.summary.totalInvalidIssues}`,
    "",
    "## Category Coverage",
    "",
    formatCountObject(report.summary.casesByCategory),
    "",
    "## Active Checks",
    "",
    `- totalActiveChecks: ${report.summary.totalActiveChecks}`,
    "",
    formatCountObject(report.summary.activeByFixture),
    "",
    "## Pending / Future Runtime Checks",
    "",
    `- totalPendingChecks: ${report.summary.totalPendingChecks}`,
    "",
    formatCountObject(report.summary.pendingByFixture),
    "",
    "## Invalid Case Summary",
    "",
    report.summary.totalInvalidCases === 0 ? "- none" : formatList(report.fixtures.flatMap((fixture) => fixture.invalidCases.map((invalidCase) => `${fixture.fixtureName}: ${invalidCase.id}`))),
    "",
    "## Unsupported Assertion Summary",
    "",
    formatCountObject(report.summary.unsupportedAssertionTypes),
    "",
    "## Domain Coverage Summary",
    "",
    formatList(report.summary.domainsCovered),
    "",
    "## Mode Coverage Summary",
    "",
    formatList(report.summary.modesCovered),
    "",
    "## Source-Card Coverage Summary",
    "",
    formatList(report.summary.sourceBehaviorTypesCovered),
    "",
    "## Risk / Limitations",
    "",
    formatList(report.limitations),
    "",
    "## Recommended Next Action",
    "",
    report.recommendedNextAction,
    ""
  ].join("\n");
}

export function generatePhase6FEvaluationReport(options = {}) {
  const report = buildPhase6FEvaluationReport(options);
  const markdown = renderPhase6FMarkdownReport(report);

  if (options.outputPath) {
    const resolvedOutputPath = resolve(options.outputPath);
    mkdirSync(dirname(resolvedOutputPath), { recursive: true });
    writeFileSync(resolvedOutputPath, `${markdown}\n`, "utf8");
    report.outputPath = resolvedOutputPath;
  }

  return { report, markdown };
}

function parseCliArgs(argv) {
  const args = { outputPath: "", json: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--output") args.outputPath = argv[++index];
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log([
    "TINA Phase 6F local/static evaluation report generator",
    "",
    "Usage:",
    "  node evaluation/runner/evaluation-report-generator.js [--output path] [--json]",
    "",
    "PATCH-06F-008 reports local fixture summaries only. Runtime/live/staging checks remain pending."
  ].join("\n"));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseCliArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    const { report, markdown } = generatePhase6FEvaluationReport({ outputPath: args.outputPath });
    console.log(args.json ? JSON.stringify(report, null, 2) : markdown);
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.error(error?.stack || error?.message || error);
    process.exit(1);
  }
}
