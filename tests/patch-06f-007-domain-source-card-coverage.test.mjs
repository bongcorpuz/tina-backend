/**
 * PATCH-06F-007 - Domain source-card coverage tests
 *
 * Run: node tests/patch-06f-007-domain-source-card-coverage.test.mjs
 *
 * Verifies the offline EWT, VAT, PEZA, and LOA domain source-card coverage
 * fixture without live API calls, staging credentials, retrieval, reranking,
 * source-card selection, sourceAvailability, ask/tax/audit runtime behavior,
 * prompts/templates/routes/controllers, DB/indexing/vector/corpus/ingestion,
 * or pipeline behavior changes.
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-6f-007-domain-source-card-coverage.fixture.json");

const EXPECTED_QUERIES = [
  "What does RR 2-98 provide on expanded withholding tax?",
  "What does NIRC Section 57 provide?",
  "/tax What is the withholding tax treatment of interest payments?",
  "Explain EWT.",
  "/tax What is input VAT?",
  "/tax What is the VAT treatment of reimbursable expenses?",
  "/audit The examiner included reimbursable expenses in gross receipts for VAT. What is our defense?",
  "/audit The examiner disallowed input VAT due to invoice mismatch. What is our defense?",
  "/tax What is the tax treatment of PEZA purchases?",
  "/tax Expound CIR v. Seagate Technology G.R. No. 153866.",
  "/tax Explain the cross-border doctrine in PEZA VAT cases.",
  "/tax Are sales to PEZA entities VAT zero-rated or VAT-exempt?",
  "/audit Evaluate this LOA and possible defense.",
  "/audit We received a PAN after a stale LOA. What is our defense?",
  "/audit We received a subpoena and NTPR. What documents do we need?",
  "/audit The LOA names different examiners from those who conducted the audit. What is the issue?",
  "/ask What source cards do you have for EWT?",
  "/ask What source cards do you have for VAT?",
  "/ask What source cards do you have for PEZA VAT?",
  "/ask What source cards do you have for LOA procedural defenses?"
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

await test("domain source-card coverage fixture loads and validates", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-6f-007");
  assert.equal(validation.ok, true);
  assert.equal(validation.validCases.length, 20);
  assert.equal(validation.invalidCases.length, 0);
  assert.equal(validation.issues.length, 0);
});

await test("fixture contains the required PATCH-06F-007 regression queries", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const queries = fixture.cases.map((testCase) => testCase.query);

  assert.deepEqual(queries, EXPECTED_QUERIES);
});

await test("fixture reuses existing domain_source_card_coverage category", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const groups = groupCasesByCategory(fixture.cases);

  assert(EVALUATION_CATEGORIES.includes("domain_source_card_coverage"));
  assert.equal(groups.domain_source_card_coverage.length, 20);
  assert.deepEqual(Object.keys(groups), ["domain_source_card_coverage"]);
});

await test("future assertions define domain coverage metadata for every case", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);

  for (const testCase of fixture.cases) {
    const check = futureCheck(testCase);

    assert.equal(check.status, "pending");
    assert.equal(typeof check.domain, "string");
    assert.equal(typeof check.subdomain, "string");
    assert.equal(typeof check.expectedInternalMode, "string");
    assert.equal(typeof check.expectedSourceBehavior, "string");
    assert(Array.isArray(check.expectedAuthorityTypes));
    assert(check.expectedAuthorityTypes.length > 0);
    assert(Array.isArray(check.requiredSourceCardTerms));
    assert(Array.isArray(check.forbiddenAuthoritySubstitutions));
    assert(check.forbiddenAuthoritySubstitutions.length > 0);
    assert.equal(typeof check.sourceCoverageGapAwareness, "string");
    assert(Array.isArray(check.requiredFactPrompts));
    assert(Array.isArray(check.pendingRuntimeAssertions));
    assert(check.pendingRuntimeAssertions.length > 0);
  }
});

await test("fixture covers EWT, VAT, PEZA, and LOA domain groups", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const domainCounts = fixture.cases.reduce((counts, testCase) => {
    const domain = futureCheck(testCase).domain;
    counts[domain] = (counts[domain] || 0) + 1;
    return counts;
  }, {});

  assert.deepEqual(domainCounts, {
    EWT: 4,
    "withholding tax": 1,
    VAT: 5,
    PEZA: 5,
    LOA: 5
  });
});

await test("exact EWT and Seagate cases carry required source-card terms", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const byId = Object.fromEntries(fixture.cases.map((testCase) => [testCase.id, testCase]));

  const rr298 = futureCheck(byId["ewt-rr-2-98-exact-source-card-coverage"]);
  assert.equal(rr298.expectedSourceBehavior, "exact_authority_if_indexed");
  assert(rr298.requiredSourceCardTerms.includes("RR 2-98"));

  const nirc57 = futureCheck(byId["ewt-nirc-section-57-exact-source-card-coverage"]);
  assert(nirc57.requiredSourceCardTerms.includes("NIRC Sec. 57"));
  assert(nirc57.forbiddenAuthoritySubstitutions.includes("NIRC Sec. 58"));

  const seagate = futureCheck(byId["peza-seagate-case-source-card-coverage"]);
  assert(seagate.requiredSourceCardTerms.includes("G.R. No. 153866"));
  assert(seagate.requiredSourceCardTerms.includes("Seagate"));
  assert(Array.isArray(seagate.forbiddenLimitationPhrases));
});

await test("professional tax and audit cases carry required fact prompts", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const byId = Object.fromEntries(fixture.cases.map((testCase) => [testCase.id, testCase]));

  assert(futureCheck(byId["ewt-interest-payments-tax-source-card-coverage"]).requiredFactPrompts.includes("payer type"));
  assert(futureCheck(byId["vat-reimbursable-expenses-tax-source-card-coverage"]).requiredFactPrompts.includes("reimbursement arrangement"));
  assert(futureCheck(byId["vat-reimbursable-expenses-audit-defense-source-card-coverage"]).requiredFactPrompts.includes("pass-through proof"));
  assert(futureCheck(byId["peza-purchases-tax-source-card-coverage"]).requiredFactPrompts.includes("buyer PEZA status"));
  assert(futureCheck(byId["loa-evaluate-defense-source-card-coverage"]).requiredFactPrompts.includes("replacement LOA"));
  assert(futureCheck(byId["loa-different-examiners-procedural-defect-source-card-coverage"]).requiredFactPrompts.includes("mission order"));
});

await test("inventory gap cases distinguish runtime source-card inventory from broader source inventories", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const inventoryCases = fixture.cases
    .map((testCase) => ({ testCase, check: futureCheck(testCase) }))
    .filter(({ check }) => check.expectedSourceBehavior === "source_coverage_gap_awareness");

  assert.equal(inventoryCases.length, 4);

  for (const { check } of inventoryCases) {
    assert.equal(check.expectedInternalMode, "ask/source_lookup");
    assert(check.sourceCoverageGapAwareness.includes("source") || check.sourceCoverageGapAwareness.includes("Source"));
    assert(check.forbiddenAuthoritySubstitutions.some((term) => term.includes("invented") || term.includes("unindexed") || term.includes("Google Drive")));
  }
});

await test("pending domain source-card assertions do not fail the runner", () => {
  const report = runEvaluation({ fixturePath: FIXTURE_PATH });

  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, 20);
  assert.equal(report.summary.validCases, 20);
  assert.equal(report.summary.invalidCases, 0);
  assert.equal(report.summary.activeChecks, 20);
  assert.equal(report.summary.pendingChecks, 20);
  assert.equal(report.summary.invalidIssues, 0);
});

await test("unsupported future domain coverage metadata is counted as pending, not failed", () => {
  const fixture = {
    version: "phase-6f-007-unsupported-future",
    cases: [
      {
        id: "future-domain-coverage",
        name: "Future domain source-card coverage check",
        category: "domain_source_card_coverage",
        route: "/tax",
        query: "/tax What is input VAT?",
        checks: [
          { type: "schema" },
          {
            type: "future_runtime_assertion",
            domain: "VAT",
            expectedSourceBehavior: "exact_or_related_authority"
          }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-06f-007-future-"));
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
    version: "phase-6f-007-invalid",
    cases: [
      {
        id: "bad-domain-coverage-case",
        name: "Bad domain coverage case",
        category: "domain_source_card_coverage",
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

await test("CLI exits zero for the domain source-card coverage fixture", () => {
  const result = spawnSync(process.execPath, [
    "evaluation/runner/evaluation-runner.js",
    "--fixture",
    FIXTURE_PATH
  ], { encoding: "utf8" });

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, 20);
  assert.equal(report.summary.pendingChecks, 20);
});

console.log(`\nPATCH-06F-007 domain source-card coverage tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
