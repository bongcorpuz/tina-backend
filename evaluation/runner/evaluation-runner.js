// FILE: evaluation/runner/evaluation-runner.js

"use strict";

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

export const DEFAULT_FIXTURE_PATH = resolve(ROOT, "evaluation", "fixtures", "phase-6f-001-sample.fixture.json");

export const EVALUATION_CATEGORIES = Object.freeze([
  "exact_authority",
  "unavailable_source",
  "related_authority",
  "generic_guard",
  "source_limitation_wording",
  "click_target_integrity",
  "mode_format",
  "domain_source_card_coverage"
]);

const CATEGORY_SET = new Set(EVALUATION_CATEGORIES);
const ACTIVE_CHECK_TYPES = new Set(["schema"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function makeIssue(caseId, field, message) {
  return { caseId: caseId || null, field, message };
}

export function loadFixtureFile(fixturePath = DEFAULT_FIXTURE_PATH) {
  const resolvedPath = resolve(fixturePath);
  const raw = readFileSync(resolvedPath, "utf8").replace(/^\uFEFF/, "");
  return { fixturePath: resolvedPath, fixture: JSON.parse(raw) };
}

export function validateEvaluationFixture(fixture) {
  const issues = [];
  const validCases = [];
  const invalidCases = [];

  if (!isPlainObject(fixture)) {
    return {
      ok: false,
      issues: [makeIssue(null, "fixture", "Fixture must be an object.")],
      validCases,
      invalidCases
    };
  }

  if (!normalizeString(fixture.version)) {
    issues.push(makeIssue(null, "version", "Fixture version is required."));
  }

  if (!Array.isArray(fixture.cases)) {
    issues.push(makeIssue(null, "cases", "Fixture cases must be an array."));
    return { ok: false, issues, validCases, invalidCases };
  }

  fixture.cases.forEach((testCase, index) => {
    const caseIssues = [];
    const caseId = normalizeString(testCase?.id) || `case[${index}]`;

    if (!isPlainObject(testCase)) {
      caseIssues.push(makeIssue(caseId, "case", "Case must be an object."));
    } else {
      for (const field of ["id", "name", "category", "query", "route"]) {
        if (!normalizeString(testCase[field])) {
          caseIssues.push(makeIssue(caseId, field, `${field} is required.`));
        }
      }

      if (normalizeString(testCase.category) && !CATEGORY_SET.has(testCase.category)) {
        caseIssues.push(makeIssue(caseId, "category", `Unsupported category: ${testCase.category}`));
      }

      if (normalizeString(testCase.route) && !/^\/(ask|tax|audit|source)$/.test(testCase.route)) {
        caseIssues.push(makeIssue(caseId, "route", `Unsupported route: ${testCase.route}`));
      }

      if (!Array.isArray(testCase.checks) || testCase.checks.length === 0) {
        caseIssues.push(makeIssue(caseId, "checks", "At least one check is required."));
      } else {
        testCase.checks.forEach((check, checkIndex) => {
          if (!isPlainObject(check)) {
            caseIssues.push(makeIssue(caseId, `checks[${checkIndex}]`, "Check must be an object."));
            return;
          }
          if (!normalizeString(check.type)) {
            caseIssues.push(makeIssue(caseId, `checks[${checkIndex}].type`, "Check type is required."));
          }
        });
      }
    }

    if (caseIssues.length > 0) {
      invalidCases.push({ index, id: caseId, issues: caseIssues });
      issues.push(...caseIssues);
      return;
    }

    validCases.push(testCase);
  });

  return {
    ok: issues.length === 0,
    issues,
    validCases,
    invalidCases
  };
}

export function groupCasesByCategory(cases = []) {
  return cases.reduce((groups, testCase) => {
    const category = testCase.category;
    groups[category] ||= [];
    groups[category].push(testCase);
    return groups;
  }, {});
}

function summarizeChecks(validCases) {
  const checks = [];
  for (const testCase of validCases) {
    for (const check of testCase.checks) {
      const type = normalizeString(check.type);
      const explicitlyPending = check.status === "pending" || check.pending === true;
      const active = ACTIVE_CHECK_TYPES.has(type) && !explicitlyPending;
      checks.push({
        caseId: testCase.id,
        type,
        active,
        pending: !active,
        status: active ? "pass" : "pending",
        note: normalizeString(check.note)
      });
    }
  }
  return checks;
}

export function buildEvaluationReport({ fixturePath, fixture, validation }) {
  const validCases = validation.validCases;
  const categoryGroups = groupCasesByCategory(validCases);
  const checks = summarizeChecks(validCases);
  const activeChecks = checks.filter((check) => check.active);
  const pendingChecks = checks.filter((check) => check.pending);

  return {
    runner: "TINA_EVALUATION_RUNNER",
    version: "0.1.0",
    mode: "local_offline_skeleton",
    fixturePath,
    fixtureVersion: fixture?.version || null,
    ok: validation.ok,
    summary: {
      totalCases: Array.isArray(fixture?.cases) ? fixture.cases.length : 0,
      validCases: validCases.length,
      invalidCases: validation.invalidCases.length,
      categories: Object.fromEntries(
        Object.entries(categoryGroups).map(([category, cases]) => [category, cases.length])
      ),
      activeChecks: activeChecks.length,
      pendingChecks: pendingChecks.length,
      invalidIssues: validation.issues.length
    },
    checks,
    invalidCases: validation.invalidCases,
    issues: validation.issues
  };
}

export function runEvaluation(options = {}) {
  const { fixturePath = DEFAULT_FIXTURE_PATH, outputPath = "" } = options;
  const loaded = loadFixtureFile(fixturePath);
  const validation = validateEvaluationFixture(loaded.fixture);
  const report = buildEvaluationReport({
    fixturePath: loaded.fixturePath,
    fixture: loaded.fixture,
    validation
  });

  if (outputPath) {
    const resolvedOutput = resolve(outputPath);
    mkdirSync(dirname(resolvedOutput), { recursive: true });
    writeFileSync(resolvedOutput, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    report.outputPath = resolvedOutput;
  }

  return report;
}

function parseCliArgs(argv) {
  const args = { fixturePath: DEFAULT_FIXTURE_PATH, outputPath: "", pretty: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--fixture") args.fixturePath = argv[++index];
    else if (arg === "--output") args.outputPath = argv[++index];
    else if (arg === "--pretty") args.pretty = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log([
    "TINA local evaluation runner skeleton",
    "",
    "Usage:",
    "  node evaluation/runner/evaluation-runner.js [--fixture path] [--output path] [--pretty]",
    "",
    "PATCH-06F-001 runs offline and validates fixture shape only. Future behavioral checks remain pending."
  ].join("\n"));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseCliArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    const report = runEvaluation(args);
    const output = args.pretty ? JSON.stringify(report, null, 2) : JSON.stringify(report);
    console.log(output);
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.error(error?.stack || error?.message || error);
    process.exit(1);
  }
}



