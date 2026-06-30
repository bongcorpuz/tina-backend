/**
 * PATCH-06H-002 - Bare citation normalization regression tests
 *
 * Run: node tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
 *
 * Verifies the offline bare citation normalization fixture without live API
 * calls, staging credentials, DB/vector queries, retrieval, reranking,
 * source-card selection, sourceAvailability, issue-classification, ask/tax/audit
 * runtime behavior, or pipeline behavior changes.
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-6h-002-bare-citation-normalization-regression.fixture.json");

const EXPECTED_QUERIES = [
  "RR 2-98",
  "RR No. 2-98",
  "Revenue Regulations No. 2-98",
  "RMC 65-2012",
  "RMC No. 65-2012",
  "Revenue Memorandum Circular No. 65-2012",
  "RMO 20-2013",
  "RMO No. 20-2013",
  "Revenue Memorandum Order No. 20-2013",
  "RMO 24-2013",
  "NIRC Sec. 57",
  "NIRC Section 57",
  "Section 57 of the NIRC",
  "NIRC Sec. 58",
  "NIRC Section 23",
  "RA 10963",
  "Republic Act No. 10963",
  "TRAIN Law",
  "RA 11534",
  "CREATE Act",
  "CTA Case No. 9369",
  "CTA Case 9369",
  "G.R. No. 153866",
  "CIR v. Seagate",
  "Seagate case",
  "tax law",
  "BIR issuance",
  "court case",
  "VAT case",
  "withholding tax case",
  "explain EWT",
  "what is withholding tax"
];

const REQUIRED_POLICY_FIELDS = [
  "expectedAuthorityLookupType",
  "expectedAuthorityFamily",
  "expectedNamedAuthorityRecognition",
  "expectedPromotionPolicy",
  "expectedSourceCardPolicy",
  "expectedGuardBehavior",
  "notes"
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

await test("bare citation normalization fixture loads and validates", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-6h-002");
  assert.equal(validation.ok, true);
  assert.equal(validation.validCases.length, 32);
  assert.equal(validation.invalidCases.length, 0);
  assert.equal(validation.issues.length, 0);
});

await test("fixture contains the required PATCH-06H-002 query set in order", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const queries = fixture.cases.map((testCase) => testCase.query);

  assert.deepEqual(queries, EXPECTED_QUERIES);
});

await test("fixture reuses recognized categories and groups Phase 6H coverage", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const groups = groupCasesByCategory(fixture.cases);

  assert(EVALUATION_CATEGORIES.includes("exact_authority"));
  assert(EVALUATION_CATEGORIES.includes("case_card_integrity"));
  assert(EVALUATION_CATEGORIES.includes("generic_guard"));

  assert.equal(groups.exact_authority.length, 20);
  assert.equal(groups.case_card_integrity.length, 5);
  assert.equal(groups.generic_guard.length, 7);
});

await test("pending query-shape metadata preserves the required bare citation families", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const shapes = fixture.cases.reduce((counts, testCase) => {
    const check = futureCheck(testCase);
    counts[check.queryShape] = (counts[check.queryShape] || 0) + 1;
    return counts;
  }, {});

  assert.equal(shapes.bare_admin_citation, 7);
  assert.equal(shapes.bare_statutory_citation, 7);
  assert.equal(shapes.bare_case_citation, 3);
  assert.equal(shapes.named_authority_lookup, 8);
  assert.equal(shapes.generic, 7);
});

await test("each case carries required policy metadata and pending runtime expectations", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);

  for (const testCase of fixture.cases) {
    for (const field of REQUIRED_POLICY_FIELDS) {
      assert.notEqual(testCase[field], undefined, `${testCase.id} missing ${field}`);
    }
    assert.equal(typeof testCase.notes, "string");
    assert(testCase.notes.length > 0);
    assert(testCase.checks.some((check) => check.type === "schema"));

    const check = futureCheck(testCase);
    assert(check, `${testCase.id} missing future_runtime_assertion`);
    assert.equal(check.status, "pending");
    assert.equal(check.expectedAuthorityLookupType, testCase.expectedAuthorityLookupType);
    assert.equal(check.expectedNamedAuthorityRecognition, testCase.expectedNamedAuthorityRecognition);
  }
});

await test("bare authority cases are exact or named authority targets, not generic guards", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const bareCases = fixture.cases.filter((testCase) => testCase.category !== "generic_guard");

  for (const testCase of bareCases) {
    const check = futureCheck(testCase);

    assert.equal(testCase.expectedNamedAuthorityRecognition, true);
    assert(["exact_named_authority", "named_authority_alias"].includes(testCase.expectedAuthorityLookupType));
    assert.notEqual(testCase.expectedAuthorityFamily, "none");
    assert.notEqual(testCase.expectedPromotionPolicy, "do_not_promote_exact_authority");
    assert.notEqual(testCase.expectedSourceCardPolicy, "do_not_fabricate_exact_source_card");
    assert.notEqual(testCase.expectedGuardBehavior, "generic_query_guard");
    assert.equal(check.forbiddenUnrelatedAuthorities, true);
  }
});

await test("generic guard cases forbid false exact promotion and substituted exact cards", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const genericCases = fixture.cases.filter((testCase) => testCase.category === "generic_guard");

  assert.equal(genericCases.length, 7);
  for (const testCase of genericCases) {
    const check = futureCheck(testCase);

    assert.equal(testCase.expectedAuthorityLookupType, "generic_query");
    assert.equal(testCase.expectedAuthorityFamily, "none");
    assert.equal(testCase.expectedNamedAuthorityRecognition, false);
    assert.equal(testCase.expectedPromotionPolicy, "do_not_promote_exact_authority");
    assert.equal(testCase.expectedSourceCardPolicy, "do_not_fabricate_exact_source_card");
    assert.equal(testCase.expectedGuardBehavior, "generic_query_guard");
    assert.equal(check.expectedBehavior, "generic_guard");
    assert.equal(check.forbiddenFalseExactPromotion, true);
    assert.equal(check.forbiddenExactCardOverclaim, true);
    assert(Array.isArray(check.forbiddenSubstitutedAuthorities));
    assert(check.forbiddenSubstitutedAuthorities.length > 0);
  }
});

await test("parked RR 2-98 finding is represented as a future normalization target", () => {
  const { fixture } = loadFixtureFile(FIXTURE_PATH);
  const rrCase = fixture.cases.find((testCase) => testCase.id === "rr-2-98-bare-admin-citation");
  const check = futureCheck(rrCase);

  assert.equal(rrCase.query, "RR 2-98");
  assert.equal(rrCase.expectedAuthorityFamily, "revenue_regulation");
  assert.equal(rrCase.expectedGuardBehavior, "not_generic_general_tax");
  assert.match(rrCase.notes, /FINDING-028A-F1/);
  assert.equal(check.forbiddenIssueClassification, "GENERAL_TAX");
  assert.equal(check.expectedSourceCard, "RR 2-98");
});

await test("pending bare citation expectations do not fail the evaluation runner", () => {
  const report = runEvaluation({ fixturePath: FIXTURE_PATH });

  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, 32);
  assert.equal(report.summary.validCases, 32);
  assert.equal(report.summary.invalidCases, 0);
  assert.equal(report.summary.activeChecks, 32);
  assert.equal(report.summary.pendingChecks, 32);
  assert.equal(report.summary.invalidIssues, 0);
  assert.equal(report.summary.categories.exact_authority, 20);
  assert.equal(report.summary.categories.case_card_integrity, 5);
  assert.equal(report.summary.categories.generic_guard, 7);
});

await test("unsupported future bare-citation metadata remains pending, not failed", () => {
  const fixture = {
    version: "phase-6h-002-unsupported-future",
    cases: [
      {
        id: "future-bare-admin-citation",
        name: "Future bare admin citation check",
        category: "exact_authority",
        route: "/ask",
        query: "RR 2-98",
        checks: [
          { type: "schema" },
          {
            type: "future_runtime_assertion",
            expectedAuthorityLookupType: "exact_named_authority",
            expectedAuthorityFamily: "revenue_regulation",
            expectedNamedAuthorityRecognition: true
          }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-06h-002-future-"));
  const fixturePath = join(dir, "future.fixture.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

  const report = runEvaluation({ fixturePath });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, 1);
  assert.equal(report.summary.pendingChecks, 1);
  assert.equal(report.checks.find((check) => check.type === "future_runtime_assertion").status, "pending");
});

await test("invalid bare citation fixture shape still fails validation", () => {
  const invalidFixture = {
    version: "phase-6h-002-invalid",
    cases: [
      {
        id: "bad-06h-002-case",
        name: "Bad 06H-002 case",
        category: "bare_admin_citation",
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

await test("CLI exits zero for the bare citation normalization fixture", () => {
  const result = spawnSync(process.execPath, [
    "evaluation/runner/evaluation-runner.js",
    "--fixture",
    FIXTURE_PATH
  ], { encoding: "utf8" });

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, 32);
  assert.equal(report.summary.pendingChecks, 32);
});

console.log(`\nPATCH-06H-002 bare citation normalization regression tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
