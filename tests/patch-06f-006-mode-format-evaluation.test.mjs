/**
 * PATCH-06F-006 - Mode-format evaluation: /ask, /tax, /audit
 *
 * Run: node tests/patch-06f-006-mode-format-evaluation.test.mjs
 *
 * Verifies the offline mode-format evaluation fixture without live API calls,
 * staging credentials, retrieval, reranking, source-card selection,
 * sourceAvailability, prompts, answer templates, response generation,
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-6f-006-mode-format-evaluation.fixture.json");

const EXPECTED_QUERIES = [
  "What is withholding tax?",
  "/ask What is BIR?",
  "/ask What is the tax treatment of PEZA purchases?",
  "/ask We received a PAN for EWT deficiency. What should we do?",
  "/tax What is the tax treatment of PEZA purchases?",
  "/tax What does NIRC Section 57 provide?",
  "/tax Expound CIR v. Seagate Technology G.R. No. 153866.",
  "/tax Compare RA 10963 and RA 11534.",
  "/audit We received a PAN for EWT deficiency. What should we do?",
  "/audit Evaluate this LOA and possible defense.",
  "/audit The examiner disallowed input VAT due to invoice mismatch. What is our defense?",
  "/audit There is an EWT deficiency due to CWT reconciliation. What documents do we need?",
  "/ask Evaluate this LOA and possible defense.",
  "/ask Expound CIR v. Seagate Technology G.R. No. 153866.",
  "/tax We received a PAN for EWT deficiency. What should we do?"
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

await test("mode-format fixture loads and validates", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-6f-006");
  assert.equal(validation.ok, true);
  assert.equal(validation.validCases.length, 15);
  assert.equal(validation.invalidCases.length, 0);
  assert.equal(validation.issues.length, 0);
});

await test("fixture contains the required PATCH-06F-006 regression queries", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const queries = fixture.cases.map((testCase) => testCase.query);

  assert.deepEqual(queries, EXPECTED_QUERIES);
});

await test("fixture reuses existing mode_format category", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const groups = groupCasesByCategory(fixture.cases);

  assert(EVALUATION_CATEGORIES.includes("mode_format"));
  assert.equal(groups.mode_format.length, 15);
  assert.deepEqual(Object.keys(groups), ["mode_format"]);
});

await test("future assertions define typed mode, internal mode, response format, sections, and source expectation", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);

  for (const testCase of fixture.cases) {
    const check = futureCheck(testCase);

    assert.equal(check.status, "pending");
    assert(["ask", "tax", "audit"].includes(check.typedCommandMode));
    assert.equal(typeof check.expectedInternalMode, "string");
    assert.equal(typeof check.expectedResponseFormat, "string");
    assert(Array.isArray(check.requiredSections));
    assert(check.requiredSections.length > 0);
    assert.equal(typeof check.shouldEscalateToTaxMode, "boolean");
    assert.equal(typeof check.shouldEscalateToAuditMode, "boolean");
    assert(Array.isArray(check.forbiddenMisrouting));
    assert(check.forbiddenMisrouting.length > 0);
    assert.equal(typeof check.sourceCardExpectation, "string");
    assert(Array.isArray(check.pendingRuntimeAssertions));
    assert(check.pendingRuntimeAssertions.length > 0);
  }
});

await test("ask entry cases distinguish general answers from tax and audit escalation", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const byId = Object.fromEntries(fixture.cases.map((testCase) => [testCase.id, testCase]));

  const generalTax = futureCheck(byId["ask-withholding-tax-general-explanation-format"]);
  assert.equal(generalTax.expectedInternalMode, "ask/general_tax_explanation");
  assert.equal(generalTax.shouldEscalateToTaxMode, false);
  assert.equal(generalTax.shouldEscalateToAuditMode, false);

  const pezaAsk = futureCheck(byId["ask-peza-purchases-tax-mode-escalation"]);
  assert.equal(pezaAsk.expectedInternalMode, "tax");
  assert.equal(pezaAsk.shouldEscalateToTaxMode, true);
  assert.equal(pezaAsk.shouldEscalateToAuditMode, false);
  assert(pezaAsk.requiredSections.includes("Applicable Law / Authorities"));

  const panAsk = futureCheck(byId["ask-pan-ewt-audit-mode-escalation"]);
  assert.equal(panAsk.expectedInternalMode, "audit");
  assert.equal(panAsk.shouldEscalateToAuditMode, true);
  assert(panAsk.requiredSections.includes("Taxpayer Defense"));
});

await test("tax mode cases carry senior memo and case/comparison format expectations", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const taxCases = fixture.cases
    .map((testCase) => ({ testCase, check: futureCheck(testCase) }))
    .filter(({ check }) => check.typedCommandMode === "tax" && check.expectedInternalMode === "tax");

  assert.equal(taxCases.length, 4);

  for (const { check } of taxCases) {
    assert.equal(check.shouldEscalateToAuditMode, false);
    assert(check.requiredSections.some((section) => section.includes("Issue")));
    assert(check.requiredSections.includes("Source Cards") || check.requiredSections.includes("Source Cards / Authorities"));
  }

  const seagate = taxCases.find(({ testCase }) => testCase.id === "tax-seagate-case-exposition-format").check;
  assert.equal(seagate.expectedResponseFormat, "case_exposition_senior_tax_memo_hybrid");
  assert(seagate.requiredSections.includes("Ruling / Holding"));
  assert(Array.isArray(seagate.forbiddenLimitationPhrases));
});

await test("audit mode cases carry complex advisory section expectations", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const auditCases = fixture.cases
    .map((testCase) => ({ testCase, check: futureCheck(testCase) }))
    .filter(({ check }) => check.expectedInternalMode === "audit");

  assert.equal(auditCases.length, 7);

  for (const { check } of auditCases) {
    assert.equal(check.expectedResponseFormat, "audit_defense_complex_advisory");
    assert(check.requiredSections.includes("Issue / Audit Concern"));
    assert(check.requiredSections.includes("Relevant Facts Needed"));
    assert(check.requiredSections.includes("Taxpayer Defense"));
    assert(check.requiredSections.includes("Documents / Evidence Needed"));
    assert(check.requiredSections.includes("Risk Level"));
    assert(check.requiredSections.includes("Recommended Action"));
  }
});

await test("mode misrouting guard cases require escalation despite typed command", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const byId = Object.fromEntries(fixture.cases.map((testCase) => [testCase.id, testCase]));

  const loaAsk = futureCheck(byId["ask-loa-defense-audit-misrouting-guard"]);
  assert.equal(loaAsk.typedCommandMode, "ask");
  assert.equal(loaAsk.expectedInternalMode, "audit");
  assert.equal(loaAsk.shouldEscalateToAuditMode, true);
  assert(loaAsk.forbiddenMisrouting.includes("generic_ask_format"));

  const seagateAsk = futureCheck(byId["ask-seagate-tax-case-misrouting-guard"]);
  assert.equal(seagateAsk.typedCommandMode, "ask");
  assert.equal(seagateAsk.expectedInternalMode, "tax");
  assert.equal(seagateAsk.shouldEscalateToTaxMode, true);

  const panTax = futureCheck(byId["tax-pan-ewt-audit-treatment-misrouting-guard"]);
  assert.equal(panTax.typedCommandMode, "tax");
  assert.equal(panTax.expectedInternalMode, "audit");
  assert.equal(panTax.shouldEscalateToAuditMode, true);
});

await test("pending mode-format assertions do not fail the runner", () => {
  const report = runEvaluation({ fixturePath: FIXTURE_PATH });

  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, 15);
  assert.equal(report.summary.validCases, 15);
  assert.equal(report.summary.invalidCases, 0);
  assert.equal(report.summary.activeChecks, 15);
  assert.equal(report.summary.pendingChecks, 15);
  assert.equal(report.summary.invalidIssues, 0);
});

await test("unsupported future mode-format metadata is counted as pending, not failed", () => {
  const fixture = {
    version: "phase-6f-006-unsupported-future",
    cases: [
      {
        id: "future-mode-format",
        name: "Future mode format check",
        category: "mode_format",
        route: "/ask",
        query: "/ask What is the tax treatment of PEZA purchases?",
        checks: [
          { type: "schema" },
          {
            type: "future_runtime_assertion",
            typedCommandMode: "ask",
            expectedInternalMode: "tax",
            expectedResponseFormat: "tax_advisory_senior_memo"
          }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-06f-006-future-"));
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
    version: "phase-6f-006-invalid",
    cases: [
      {
        id: "bad-mode-format-case",
        name: "Bad mode format case",
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

await test("CLI exits zero for the mode-format evaluation fixture", () => {
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

console.log(`\nPATCH-06F-006 mode-format evaluation tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
