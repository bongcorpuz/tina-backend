/**
 * PATCH-07A-002 - Human response mode-format fixtures and regression tests
 *
 * Run: node tests/patch-07a-002-human-response-mode-format-fixtures.test.mjs
 *
 * Verifies the offline Phase 7A human response mode-format fixture without
 * live API calls, staging credentials, retrieval, reranking, DB/vector store,
 * OpenAI, source-card selection, sourceAvailability, prompts, answer templates,
 * ask/tax/audit runtime behavior, route/controller behavior, or pipeline
 * behavior changes.
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7a-002-human-response-mode-format.fixture.json");

const ASK_SECTIONS = ["Direct answer", "Key explanation", "Practical note"];
const TAX_SECTIONS = [
  "A. Short Answer / Conclusion",
  "B. Governing Authority",
  "C. Analysis",
  "D. Compliance Effect",
  "E. Caveats / Missing Facts",
  "F. Sources / Source Cards"
];
const AUDIT_SECTIONS = [
  "Quick assessment",
  "BIR likely position",
  "Taxpayer position / defenses",
  "Documentary support",
  "Procedural issues",
  "Risk level",
  "Recommended action",
  "Sources / Source Cards"
];
const REQUIRED_AUTHORITY_STATES = [
  "AUTHORITY_FOUND",
  "RELATED_AUTHORITY_ONLY",
  "NO_INDEXED_SOURCE",
  "GENERAL_TAX"
];
const FORBIDDEN_RUNTIME_TERMS = [
  "requires live retrieval",
  "requires reranking",
  "requires db",
  "requires vector",
  "requires openai",
  "requires staging",
  "requires secret"
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

function loadFixture() {
  return loadFixtureFile(FIXTURE_PATH).fixture;
}

function casesByFamily(fixture, family) {
  return fixture.cases.filter((testCase) => testCase.expectedResponseFamily === family);
}

function assertIncludesAll(actual, expected, label) {
  for (const value of expected) {
    assert(actual.includes(value), `${label} missing ${value}`);
  }
}

await test("Phase 7A fixture loads and validates with the local evaluation runner", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-7a-002");
  assert.equal(fixture.fixtureId, "phase-7a-002-human-response-mode-format");
  assert.equal(fixture.patch, "PATCH-07A-002");
  assert.equal(fixture.phase, "Phase 7A");
  assert.equal(validation.ok, true);
  assert.equal(validation.validCases.length, fixture.cases.length);
  assert.equal(validation.invalidCases.length, 0);
  assert.equal(validation.issues.length, 0);
});

await test("top-level runtime safety fields forbid network, DB, and secrets", () => {
  const fixture = loadFixture();

  assert.equal(fixture.runtimeSafe, true);
  assert.equal(fixture.requiresNetwork, false);
  assert.equal(fixture.requiresDb, false);
  assert.equal(fixture.requiresSecrets, false);
  assert.equal(typeof fixture.objective, "string");
  assert(fixture.objective.includes("before runtime response formatting changes"));
});

await test("fixture uses only existing local evaluation categories", () => {
  const fixture = loadFixture();
  const groups = groupCasesByCategory(fixture.cases);

  for (const category of Object.keys(groups)) {
    assert(EVALUATION_CATEGORIES.includes(category), `unsupported category ${category}`);
  }

  assert(groups.mode_format.length >= 10);
  assert(groups.generic_guard.length >= 7);
  assert(groups.source_limitation_wording.length >= 3);
  assert(groups.exact_authority.length >= 2);
  assert(groups.related_authority.length >= 1);
  assert(groups.unavailable_source.length >= 1);
});

await test("all cases include required Phase 7A policy fields and pending runtime assertions", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.equal(typeof testCase.id, "string");
    assert.equal(typeof testCase.query, "string");
    assert(["ask", "tax", "audit"].includes(testCase.commandMode));
    assert(["/ask", "/tax", "/audit"].includes(testCase.routeMode));
    assert.equal(testCase.route, testCase.routeMode);
    assert.equal(typeof testCase.expectedInternalMode, "string");
    assert.equal(typeof testCase.expectedResponseFamily, "string");
    assert(REQUIRED_AUTHORITY_STATES.includes(testCase.authorityState));
    assert.equal(typeof testCase.sourceCardPolicy, "string");
    assert.equal(typeof testCase.sourceLimitationPolicy, "string");
    assert(Array.isArray(testCase.expectedSections));
    assert(testCase.expectedSections.length > 0);
    assert(Array.isArray(testCase.forbiddenSections));
    assert(testCase.forbiddenSections.length > 0);
    assert.equal(typeof testCase.tonePolicy, "string");
    assert.equal(typeof testCase.formattingPolicy, "string");
    assert.equal(typeof testCase.risk, "string");
    assert.equal(typeof testCase.notes, "string");

    const check = futureCheck(testCase);
    assert(check, `${testCase.id} missing future runtime assertion`);
    assert.equal(check.status, "pending");
  }
});

await test("mode group coverage includes /ask, /tax, and /audit", () => {
  const fixture = loadFixture();
  const routeModes = new Set(fixture.cases.map((testCase) => testCase.routeMode));
  const commandModes = new Set(fixture.cases.map((testCase) => testCase.commandMode));

  assertIncludesAll([...routeModes], ["/ask", "/tax", "/audit"], "route mode coverage");
  assertIncludesAll([...commandModes], ["ask", "tax", "audit"], "command mode coverage");
});

await test("authority-state coverage includes all required response states", () => {
  const fixture = loadFixture();
  const states = new Set(fixture.cases.map((testCase) => testCase.authorityState));

  assertIncludesAll([...states], REQUIRED_AUTHORITY_STATES, "authority state coverage");
});

await test("/ask cases require lighter conversational format and forbid senior memo by default", () => {
  const fixture = loadFixture();
  const askCases = casesByFamily(fixture, "ask_conversational_format");

  assert(askCases.length >= 5);
  for (const testCase of askCases) {
    assert.equal(testCase.commandMode, "ask");
    assert(testCase.expectedSections.includes("Direct answer"));
    assert(testCase.expectedSections.some((section) => ASK_SECTIONS.includes(section)));
    assert(
      testCase.forbiddenSections.some((section) => /A-F|senior memo|A\. Short Answer/i.test(section)),
      `${testCase.id} must forbid full senior memo structure`
    );
    assert(!testCase.expectedSections.includes("B. Governing Authority"));
  }
});

await test("/tax cases preserve senior memo A-F structure", () => {
  const fixture = loadFixture();
  const taxCases = casesByFamily(fixture, "tax_senior_memo_format");

  assert(taxCases.length >= 5);
  for (const testCase of taxCases) {
    assert.equal(testCase.commandMode, "tax");
    assertIncludesAll(testCase.expectedSections, TAX_SECTIONS, `${testCase.id} tax sections`);
    assert(
      testCase.forbiddenSections.some((section) => /ask|audit/i.test(section)),
      `${testCase.id} must forbid wrong mode structure`
    );
  }
});

await test("/audit cases preserve professional audit advisory structure", () => {
  const fixture = loadFixture();
  const auditCases = casesByFamily(fixture, "audit_advisory_format");

  assert(auditCases.length >= 5);
  for (const testCase of auditCases) {
    assert(["audit", "ask"].includes(testCase.commandMode));
    assertIncludesAll(testCase.expectedSections, AUDIT_SECTIONS, `${testCase.id} audit sections`);
    assert(/Risk level/i.test(testCase.formattingPolicy) || testCase.expectedSections.includes("Risk level"));
    assert(/Recommended action/i.test(testCase.formattingPolicy) || testCase.expectedSections.includes("Recommended action"));
  }
});

await test("RELATED_AUTHORITY_ONLY and NO_INDEXED_SOURCE cases carry source limitation policy", () => {
  const fixture = loadFixture();
  const limitedCases = fixture.cases.filter((testCase) =>
    ["RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE"].includes(testCase.authorityState)
  );

  assert(limitedCases.length >= 6);
  for (const testCase of limitedCases) {
    assert.match(testCase.sourceLimitationPolicy, /source limitation|not located|no indexed source|related/i);
    assert.match(testCase.sourceCardPolicy, /not|No|related|supporting|fabricated|governing/i);
  }
});

await test("generic guard controls are marked non-promotable", () => {
  const fixture = loadFixture();
  const genericCases = fixture.cases.filter((testCase) => testCase.category === "generic_guard");
  const requiredQueries = [
    "tax law",
    "BIR issuance",
    "court case",
    "VAT case",
    "withholding tax case",
    "explain EWT",
    "what is withholding tax"
  ];
  const queries = genericCases.map((testCase) => testCase.query);

  assertIncludesAll(queries, requiredQueries, "generic query coverage");
  for (const testCase of genericCases) {
    assert.equal(testCase.genericGuardPolicy?.nonPromotable, true);
    assert.equal(testCase.genericGuardPolicy?.forbidFabricatedNamedAuthority, true);
    assert.match(testCase.sourceCardPolicy, /Do not|do not/i);
  }
});

await test("no case requires runtime execution, retrieval, DB/vector, OpenAI, staging, or secrets", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    const serialized = JSON.stringify(testCase).toLowerCase();
    for (const term of FORBIDDEN_RUNTIME_TERMS) {
      assert(!serialized.includes(term), `${testCase.id} includes forbidden runtime term ${term}`);
    }
    assert.equal(futureCheck(testCase).status, "pending");
  }
});

await test("pending Phase 7A assertions do not fail the evaluation runner", () => {
  const report = runEvaluation({ fixturePath: FIXTURE_PATH });

  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, loadFixture().cases.length);
  assert.equal(report.summary.validCases, loadFixture().cases.length);
  assert.equal(report.summary.invalidCases, 0);
  assert.equal(report.summary.activeChecks, loadFixture().cases.length);
  assert.equal(report.summary.pendingChecks, loadFixture().cases.length);
  assert.equal(report.summary.invalidIssues, 0);
});

await test("unsupported future human-response metadata remains pending, not failed", () => {
  const fixture = {
    version: "phase-7a-002-unsupported-future",
    cases: [
      {
        id: "future-human-response-format",
        name: "Future human response format check",
        category: "mode_format",
        route: "/ask",
        query: "/ask What is withholding tax?",
        checks: [
          { type: "schema" },
          {
            type: "future_runtime_assertion",
            expectedResponseFamily: "ask_conversational_format",
            authorityState: "GENERAL_TAX"
          }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-07a-002-future-"));
  const fixturePath = join(dir, "future.fixture.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

  const report = runEvaluation({ fixturePath });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, 1);
  assert.equal(report.summary.pendingChecks, 1);
  assert.equal(report.checks.find((check) => check.type === "future_runtime_assertion").status, "pending");
});

await test("invalid fixture shape still fails validation", () => {
  const invalidFixture = {
    version: "phase-7a-002-invalid",
    cases: [
      {
        id: "bad-human-response-case",
        name: "Bad human response case",
        category: "mode_format",
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

await test("CLI exits zero for the Phase 7A human response fixture", () => {
  const result = spawnSync(process.execPath, [
    "evaluation/runner/evaluation-runner.js",
    "--fixture",
    FIXTURE_PATH
  ], { encoding: "utf8" });

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, loadFixture().cases.length);
  assert.equal(report.summary.pendingChecks, loadFixture().cases.length);
});

console.log(`\nPATCH-07A-002 human response mode-format fixture tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
