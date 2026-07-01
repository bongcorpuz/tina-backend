/**
 * PATCH-07B-007 - Reasoning safety and source-state guard fixture tests
 *
 * Run: node tests/patch-07b-007-reasoning-safety-source-state-guards-fixture.test.mjs
 *
 * Verifies the offline Phase 7B-007 fixture without runtime reasoning,
 * source-state guard, retrieval, DB/vector store, OpenAI, staging, prompt,
 * source-card, sourceAvailability, dependency, memory, workflow, or Phase 10
 * source-governance implementation changes.
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-007-reasoning-safety-source-state-guards.fixture.json");

const REQUIRED_GUARD_CATEGORIES = [
  "authority_state_guard",
  "source_card_guard",
  "fact_gap_guard",
  "source_coverage_gap_guard",
  "authority_applicability_guard",
  "bir_vs_taxpayer_reasoning_guard",
  "audit_risk_language_guard",
  "settlement_protest_guard",
  "mode_boundary_guard",
  "phase10_boundary_guard",
  "policy_first_non_engine_guard"
];

const REQUIRED_MODES = ["/ask", "/tax", "/audit"];
const REQUIRED_AUTHORITY_STATES = ["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"];
const ALLOWED_EXPECTED_SAFETY_POSTURES = [
  "ALLOW_WITH_CAUTION",
  "ASK_FOR_MISSING_FACTS",
  "GENERAL_ORIENTATION_ONLY",
  "RELATED_AUTHORITY_ONLY_CAUTION",
  "NO_INDEXED_SOURCE_CAUTION",
  "REFUSE_UNSAFE_REASONING_REQUEST",
  "DEFER_PENDING_METADATA_OR_SOURCE_REVIEW",
  "PRESERVE_MODE_BOUNDARY"
];
const ALLOWED_SOURCE_CARD_STATES = [
  "DIRECT_SOURCE_CARD_PRESENT",
  "RELATED_SOURCE_CARD_PRESENT",
  "NO_SOURCE_CARD_PRESENT",
  "SOURCE_CARD_STATUS_UNCLEAR",
  "NOT_APPLICABLE"
];
const REQUIRED_CASE_FIELDS = [
  "expectedIssueFamily",
  "taxType",
  "authorityState",
  "sourceAvailabilityState",
  "sourceCardState",
  "knownFacts",
  "missingUserFacts",
  "authorityOrSourceCoverageNeeds",
  "attemptedUnsafeInstruction",
  "expectedSafetyPosture",
  "requiredCaution",
  "prohibitedReasoningBehavior",
  "prohibitedAuthorityClaim",
  "prohibitedSourceClaim",
  "prohibitedOutcomeClaim",
  "prohibitedRiskLanguage",
  "prohibitedNumericScoring",
  "factGapPolicy",
  "sourceCoverageGapPolicy",
  "authorityStatePolicy",
  "sourceCardPolicy",
  "applicabilityPolicy",
  "birVsTaxpayerPolicy",
  "auditRiskLanguagePolicy",
  "phase7aSafeguardsToPreserve",
  "modeBoundaryPolicy",
  "phase10DependencyPolicy"
];
const PHASE_7A_SAFEGUARDS = [
  "authority_state_discipline",
  "source_limitation_wording",
  "related_authority_caution",
  "no_indexed_source_non_fabrication",
  "generic_query_non_promotion",
  "no_guaranteed_outcome",
  "caveats_missing_facts",
  "documentary_support_needed",
  "source_card_scope_limits"
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

function loadFixture() {
  return loadFixtureFile(FIXTURE_PATH).fixture;
}

function assertIncludesAll(actual, expected, label) {
  for (const value of expected) {
    assert(actual.includes(value), `${label} missing ${value}`);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function textOf(testCase) {
  return JSON.stringify(testCase);
}

function casesByGuardCategory(fixture, category) {
  return fixture.cases.filter((testCase) => testCase.guardCategory === category);
}

function futureCheck(testCase) {
  return testCase.checks.find((check) => check.type === "future_runtime_assertion");
}

await test("Phase 7B-007 fixture loads and validates with the local evaluation runner", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.fixtureId, "phase-7b-007-reasoning-safety-source-state-guards");
  assert.equal(fixture.patch, "PATCH-07B-007");
  assert.equal(fixture.phase, "Phase 7B");
  assert.equal(fixture.scaffoldType, "reasoning_safety_source_state_guards");
  assert.match(fixture.objective, /reasoning safety|source-state guard|runtime reasoning logic/i);
  assert.equal(validation.ok, true);
  assert.equal(validation.validCases.length, fixture.cases.length);
  assert.equal(validation.invalidCases.length, 0);
});

await test("top-level runtime-safety fields keep this fixture policy-first", () => {
  const fixture = loadFixture();

  assert.equal(fixture.runtimeSafe, true);
  assert.equal(fixture.requiresNetwork, false);
  assert.equal(fixture.requiresDb, false);
  assert.equal(fixture.requiresSecrets, false);
  assert.equal(fixture.implementationReady, false);
  assert.equal(fixture.runtimeImplementation, false);
  assertIncludesAll(fixture.buildsOn, ["PATCH-07B-002", "PATCH-07B-003", "PATCH-07B-004", "PATCH-07B-005", "PATCH-07B-006"], "buildsOn");
});

await test("fixture uses only existing local evaluation categories", () => {
  const fixture = loadFixture();
  const groups = groupCasesByCategory(fixture.cases);

  for (const category of Object.keys(groups)) {
    assert(EVALUATION_CATEGORIES.includes(category), `unsupported evaluation category ${category}`);
  }
});

await test("required reasoning-safety guard categories exist with minimum coverage", () => {
  const fixture = loadFixture();
  const categories = new Set(fixture.cases.map((testCase) => testCase.guardCategory));

  assert(fixture.cases.length >= 44, "fixture must include at least 44 cases");
  assertIncludesAll([...categories], REQUIRED_GUARD_CATEGORIES, "reasoning-safety category coverage");
  for (const category of REQUIRED_GUARD_CATEGORIES) {
    assert(casesByGuardCategory(fixture, category).length >= 4, `${category} must have at least 4 cases`);
  }
});

await test("mode and authority-state coverage are complete", () => {
  const fixture = loadFixture();
  assertIncludesAll([...new Set(fixture.cases.map((testCase) => testCase.mode))], REQUIRED_MODES, "mode coverage");
  assertIncludesAll([...new Set(fixture.cases.map((testCase) => testCase.route))], REQUIRED_MODES, "route coverage");
  assertIncludesAll([...new Set(fixture.cases.map((testCase) => testCase.authorityState))], REQUIRED_AUTHORITY_STATES, "authority-state coverage");
});

await test("expectedSafetyPosture and sourceCardState use only allowed values", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert(ALLOWED_EXPECTED_SAFETY_POSTURES.includes(testCase.expectedSafetyPosture), `${testCase.id} unsupported expectedSafetyPosture`);
    assert(ALLOWED_SOURCE_CARD_STATES.includes(testCase.sourceCardState), `${testCase.id} unsupported sourceCardState`);
  }
});

await test("every case includes required reasoning-safety fields and pending checks", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.equal(typeof testCase.id, "string");
    assert.equal(typeof testCase.name, "string");
    assert.equal(typeof testCase.category, "string");
    assert.equal(typeof testCase.guardCategory, "string");
    assert.equal(typeof testCase.query, "string");
    assert(REQUIRED_MODES.includes(testCase.mode), `${testCase.id} unsupported mode`);
    assert(REQUIRED_AUTHORITY_STATES.includes(testCase.authorityState), `${testCase.id} unsupported authority state`);

    for (const field of REQUIRED_CASE_FIELDS) {
      assert(Object.hasOwn(testCase, field), `${testCase.id}.${field} missing`);
      if (Array.isArray(testCase[field])) {
        assert(testCase[field].length > 0, `${testCase.id}.${field} must not be empty`);
      } else {
        assert.equal(typeof testCase[field], "string", `${testCase.id}.${field} must be string`);
        assert(testCase[field].length > 0, `${testCase.id}.${field} must not be empty`);
      }
    }

    assert(futureCheck(testCase), `${testCase.id} missing future runtime assertion`);
    assert.equal(futureCheck(testCase).status, "pending");
  }
});

await test("missing user facts remain separate from authority/source coverage needs", () => {
  const fixture = loadFixture();
  const sourceNeedPattern = /authority|source|indexed|coverage|applicability|citation|metadata|currentness|supersession/i;

  for (const testCase of fixture.cases) {
    assert(Array.isArray(testCase.missingUserFacts));
    assert(Array.isArray(testCase.authorityOrSourceCoverageNeeds));
    assert.notDeepEqual(testCase.missingUserFacts, testCase.authorityOrSourceCoverageNeeds, `${testCase.id} conflates user fact gaps and source coverage gaps`);
    assert(testCase.authorityOrSourceCoverageNeeds.some((need) => sourceNeedPattern.test(need)), `${testCase.id} lacks authority/source coverage need`);
    assert(!testCase.missingUserFacts.some((fact) => /source coverage|indexed source|Phase 10|metadata|live acquisition/i.test(fact)), `${testCase.id} puts source gap in missingUserFacts`);
  }
});

await test("authority-state guardrails prevent overclaims", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases.filter((item) => item.authorityState === "RELATED_AUTHORITY_ONLY")) {
    assert.match(textOf(testCase), /related|supporting|not controlling|cannot be treated as controlling/i, `${testCase.id} allows related authority overclaim`);
    assert.match(testCase.prohibitedAuthorityClaim, /Do not claim controlling|related authority remains not controlling/i);
  }
  for (const testCase of fixture.cases.filter((item) => item.authorityState === "NO_INDEXED_SOURCE")) {
    assert.match(textOf(testCase), /NO_INDEXED_SOURCE|no indexed|cannot fabricate|no fabricated/i, `${testCase.id} lacks no-indexed-source caution`);
    assert.match(testCase.prohibitedSourceClaim, /Do not claim|indexed source|source acquisition|BIR website/i);
  }
  for (const testCase of fixture.cases.filter((item) => item.authorityState === "GENERAL_TAX")) {
    assert.match(textOf(testCase), /GENERAL_TAX|orientation only|general/i, `${testCase.id} promotes general tax to exact authority`);
  }
  for (const testCase of fixture.cases.filter((item) => item.authorityState === "AUTHORITY_FOUND")) {
    assert.match(textOf(testCase), /does not override weak facts\/documents|missing facts|weak documents|does not override/i, `${testCase.id} lets AUTHORITY_FOUND override weak facts/documents`);
  }
});

await test("source-card cases do not allow cards to override sourceAvailability", () => {
  const fixture = loadFixture();

  for (const testCase of casesByGuardCategory(fixture, "source_card_guard")) {
    assert.match(testCase.sourceCardPolicy, /cannot override sourceAvailabilityState/i);
    assert.match(textOf(testCase), /direct|related|absent|unclear|actual scope|sourceAvailability/i);
  }
});

await test("fact-gap cases do not allow assumptions to be treated as facts", () => {
  const fixture = loadFixture();

  for (const testCase of casesByGuardCategory(fixture, "fact_gap_guard")) {
    assert.match(textOf(testCase), /missing facts|cannot be silently assumed|assumptions cannot be treated as facts|block final conclusions/i);
  }
});

await test("source-coverage gap cases do not imply live source acquisition", () => {
  const fixture = loadFixture();

  for (const testCase of casesByGuardCategory(fixture, "source_coverage_gap_guard")) {
    assert.match(textOf(testCase), /no fabricated source|no live acquisition|source acquisition|no live retrieval|ingestion claim/i);
    assert(!/source acquisition occurred and may be cited|live acquisition completed|ingested now/i.test(textOf(testCase)));
  }
});

await test("authority applicability guard cases preserve Phase 10 metadata dependency", () => {
  const fixture = loadFixture();

  for (const testCase of casesByGuardCategory(fixture, "authority_applicability_guard")) {
    assert.match(textOf(testCase), /effective-date|supersession|hierarchy|metadata|Phase 10|BIR ruling|CTA|Supreme Court/i);
    assert.match(testCase.phase10DependencyPolicy, /Phase 10/i);
  }
});

await test("BIR-vs-taxpayer guard cases prohibit hidden weakness and guaranteed outcomes", () => {
  const fixture = loadFixture();

  for (const testCase of casesByGuardCategory(fixture, "bir_vs_taxpayer_reasoning_guard")) {
    assert.match(testCase.birVsTaxpayerPolicy, /balanced|weakest facts\/documents|no hidden weakness|guaranteed outcome/i);
    assert.match(testCase.prohibitedOutcomeClaim, /Do not guarantee/i);
  }
});

await test("audit risk-language cases prohibit numeric scoring and low-risk overclaim", () => {
  const fixture = loadFixture();

  for (const testCase of casesByGuardCategory(fixture, "audit_risk_language_guard")) {
    assert.match(testCase.prohibitedNumericScoring, /numeric risk score|exact exposure score|win percentage|probability/i);
    assert.match(testCase.auditRiskLanguagePolicy, /non-numeric|related authority|weak documents|low-risk overclaim/i);
  }
});

await test("settlement/protest guard cases prohibit ignoring BIR", () => {
  const fixture = loadFixture();

  for (const testCase of casesByGuardCategory(fixture, "settlement_protest_guard")) {
    assert.match(textOf(testCase), /settlement|protest|CTA|ignore BIR|documents|stage|amount/i);
    assert.match(testCase.prohibitedOutcomeClaim, /settlement result|protest result|CTA result/i);
    assert.match(testCase.prohibitedReasoningBehavior, /Do not comply|unsafe instruction/i);
  }
});

await test("mode-boundary guard cases preserve /ask, /tax, and /audit boundaries", () => {
  const fixture = loadFixture();
  const modeCases = casesByGuardCategory(fixture, "mode_boundary_guard");

  assertIncludesAll([...new Set(modeCases.map((testCase) => testCase.mode))], REQUIRED_MODES, "mode-boundary category coverage");
  for (const testCase of modeCases) {
    assert.equal(testCase.expectedSafetyPosture, "PRESERVE_MODE_BOUNDARY");
    assert.match(testCase.modeBoundaryPolicy, /\/ask, \/tax, and \/audit boundaries|prompt injection cannot suppress safeguards/i);
  }
});

await test("Phase 10 boundary guard cases do not use deferred Phase 10 QA/source files in Phase 7B", () => {
  const fixture = loadFixture();

  for (const testCase of casesByGuardCategory(fixture, "phase10_boundary_guard")) {
    assert.match(textOf(testCase), /Phase 10|deferred QA|source governance|live source acquisition|ingestion|metadata/i);
    assert.match(testCase.phase10DependencyPolicy, /Phase 10 dependencies|no live acquisition or ingestion is implied/i);
  }
});

await test("policy-first non-engine cases preserve implementationReady false and runtimeImplementation false", () => {
  const fixture = loadFixture();

  assert.equal(fixture.implementationReady, false);
  assert.equal(fixture.runtimeImplementation, false);
  for (const testCase of casesByGuardCategory(fixture, "policy_first_non_engine_guard")) {
    assert.match(textOf(testCase), /implementationReady false|runtimeImplementation false|no runtime engine|dependency|Phase 8 memory|Phase 9 workflow/i);
  }
});

await test("Phase 7A safeguards are preserved in every case", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert(Array.isArray(testCase.phase7aSafeguardsToPreserve));
    assert(testCase.phase7aSafeguardsToPreserve.length >= PHASE_7A_SAFEGUARDS.length);
    assertIncludesAll(testCase.phase7aSafeguardsToPreserve, PHASE_7A_SAFEGUARDS, `${testCase.id} Phase 7A safeguards`);
    assert.match(textOf(testCase), /Phase 7A safeguards|source limitation|authority|caution|guaranteed|documentary|missing/i);
  }
});

await test("no case requires live retrieval, DB, vector, OpenAI, staging, network, or secrets", () => {
  const fixture = loadFixture();
  const forbidden = /\brequires\s+(?:live\s+)?(?:retrieval|db|database|vector|openai|staging|network|secret)|requiresSecrets\s*:\s*true|run OpenAI|call OpenAI|staging validation required/i;

  assert.equal(fixture.runtimeSafe, true);
  assert.equal(fixture.requiresNetwork, false);
  assert.equal(fixture.requiresDb, false);
  assert.equal(fixture.requiresSecrets, false);
  for (const testCase of fixture.cases) {
    assert(!forbidden.test(textOf(testCase)), `${testCase.id} appears to require live services`);
  }
});

await test("pending scaffold assertions do not fail the evaluation runner", () => {
  const fixture = loadFixture();
  const report = runEvaluation({ fixturePath: FIXTURE_PATH });

  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, fixture.cases.length);
  assert.equal(report.summary.validCases, fixture.cases.length);
  assert.equal(report.summary.invalidCases, 0);
  assert.equal(report.summary.activeChecks, fixture.cases.length);
  assert.equal(report.summary.pendingChecks, fixture.cases.length);
  assert.equal(report.summary.invalidIssues, 0);
});

await test("unsupported future reasoning-safety metadata remains pending, not failed", () => {
  const fixture = {
    version: "phase-7b-007-unsupported-future",
    cases: [
      {
        id: "future-reasoning-safety-check",
        name: "Future reasoning safety check",
        category: "mode_format",
        route: "/audit",
        query: "/audit Future reasoning safety assertion",
        checks: [
          { type: "schema" },
          { type: "future_runtime_assertion", status: "pending", guardCategory: "future" }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-07b-007-future-"));
  const fixturePath = join(dir, "future.fixture.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

  const report = runEvaluation({ fixturePath });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, 1);
  assert.equal(report.summary.pendingChecks, 1);
});

await test("invalid reasoning-safety fixture shape still fails validation", () => {
  const validation = validateEvaluationFixture({
    version: "phase-7b-007-invalid",
    cases: [
      {
        id: "missing-required-fields",
        name: "Missing required fields",
        category: "mode_format",
        route: "/audit",
        checks: [{ type: "schema" }]
      }
    ]
  });

  assert.equal(validation.ok, false);
  assert(validation.issues.some((issue) => issue.field === "query"));
});

await test("CLI exits zero for the Phase 7B-007 reasoning-safety source-state guard fixture", () => {
  const result = spawnSync(process.execPath, [
    "evaluation/runner/evaluation-runner.js",
    "--fixture",
    FIXTURE_PATH
  ], {
    cwd: resolve("."),
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, loadFixture().cases.length);
});

console.log(`\nPATCH-07B-007 reasoning-safety source-state guard fixture tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
