/**
 * PATCH-07B-003 - Fact-gap detector fixture and tests
 *
 * Run: node tests/patch-07b-003-fact-gap-detector-fixture.test.mjs
 *
 * Verifies the offline Phase 7B-003 fixture without runtime fact-gap
 * detection, retrieval, DB/vector store, OpenAI, staging, source acquisition,
 * source-card selection, prompt changes, or engine implementation.
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-003-fact-gap-detector.fixture.json");

const REQUIRED_FACT_GAP_CATEGORIES = [
  "withholding_ewt",
  "vat_zero_rating",
  "nolco",
  "deductibility_substantiation",
  "cwt_form_2307",
  "bir_audit_procedure",
  "invoice_mismatch_vat_input",
  "reimbursable_pass_through",
  "authority_state_fact_gap_behavior",
  "client_fact_pattern_checklist_scaffold",
  "policy_first_non_engine_scaffold"
];

const REQUIRED_MODES = ["/ask", "/tax", "/audit"];
const REQUIRED_AUTHORITY_STATES = ["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"];
const REQUIRED_FACT_GAP_SEVERITIES = ["LOW", "MODERATE", "HIGH", "BLOCKING"];
const REQUIRED_RISK_LEVEL_POLICIES = ["LOW", "MODERATE", "HIGH", "CRITICAL", "UNKNOWN_INSUFFICIENT_FACTS"];
const REQUIRED_CASE_FIELDS = [
  "id",
  "category",
  "query",
  "mode",
  "expectedIssueFamily",
  "taxType",
  "knownFacts",
  "criticalMissingUserFacts",
  "helpfulMissingUserFacts",
  "assumptionsNotAllowed",
  "documentGaps",
  "timingOrPeriodGaps",
  "taxpayerStatusGaps",
  "transactionCharacterGaps",
  "assessmentStageGaps",
  "authorityOrSourceCoverageNeeds",
  "sourceAvailabilityState",
  "authorityState",
  "expectedClarifyingQuestions",
  "allowedGeneralOrientation",
  "prohibitedConclusion",
  "riskLevelPolicy",
  "factGapSeverity",
  "phase7aSafeguardsToPreserve",
  "modeBoundaryPolicy",
  "sourceCoverageGapPolicy",
  "deferredItems",
  "notes"
];

const USER_FACT_GAP_FIELDS = [
  "criticalMissingUserFacts",
  "helpfulMissingUserFacts",
  "documentGaps",
  "timingOrPeriodGaps",
  "taxpayerStatusGaps",
  "transactionCharacterGaps",
  "assessmentStageGaps"
];

const PHASE_7A_SAFEGUARDS = [
  "ask_conversational_format",
  "tax_senior_memo_format",
  "audit_advisory_format",
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

function asText(value) {
  return Array.isArray(value) ? value.join(" ") : String(value || "");
}

function combinedText(testCase) {
  return [
    testCase.expectedIssueFamily,
    testCase.taxType,
    ...asArray(testCase.knownFacts),
    ...asArray(testCase.criticalMissingUserFacts),
    ...asArray(testCase.helpfulMissingUserFacts),
    ...asArray(testCase.assumptionsNotAllowed),
    ...asArray(testCase.documentGaps),
    ...asArray(testCase.timingOrPeriodGaps),
    ...asArray(testCase.taxpayerStatusGaps),
    ...asArray(testCase.transactionCharacterGaps),
    ...asArray(testCase.assessmentStageGaps),
    ...asArray(testCase.authorityOrSourceCoverageNeeds),
    ...asArray(testCase.expectedClarifyingQuestions),
    testCase.allowedGeneralOrientation,
    testCase.prohibitedConclusion,
    testCase.riskLevelPolicy,
    testCase.factGapSeverity,
    ...asArray(testCase.phase7aSafeguardsToPreserve),
    testCase.modeBoundaryPolicy,
    testCase.sourceCoverageGapPolicy,
    ...asArray(testCase.deferredItems),
    testCase.notes
  ].join(" ");
}

function casesByFactGapCategory(fixture, category) {
  return fixture.cases.filter((testCase) => testCase.factGapCategory === category);
}

function futureCheck(testCase) {
  return testCase.checks.find((check) => check.type === "future_runtime_assertion");
}

await test("Phase 7B-003 fixture loads and validates with the local evaluation runner", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-7b-003");
  assert.equal(fixture.fixtureId, "phase-7b-003-fact-gap-detector");
  assert.equal(fixture.patch, "PATCH-07B-003");
  assert.equal(fixture.phase, "Phase 7B");
  assert.equal(fixture.scaffoldType, "fact_gap_detector");
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
  assert.match(fixture.objective, /offline fixture coverage|fact-gap detection/i);
  assert(fixture.buildsOn.includes("PATCH-07B-002"), "buildsOn must include PATCH-07B-002");
});

await test("fixture uses only existing local evaluation categories", () => {
  const fixture = loadFixture();
  const groups = groupCasesByCategory(fixture.cases);

  for (const category of Object.keys(groups)) {
    assert(EVALUATION_CATEGORIES.includes(category), `unsupported evaluation category ${category}`);
  }

  assert(groups.generic_guard.length >= 1);
  assert(groups.mode_format.length >= 1);
  assert(groups.source_limitation_wording.length >= 1);
});

await test("required fact-gap categories exist with minimum case coverage", () => {
  const fixture = loadFixture();
  const categories = new Set(fixture.cases.map((testCase) => testCase.factGapCategory));

  assert(fixture.cases.length >= 34, "fixture must include at least 34 cases");
  assertIncludesAll([...categories], REQUIRED_FACT_GAP_CATEGORIES, "fact-gap category coverage");
  for (const category of REQUIRED_FACT_GAP_CATEGORIES) {
    assert(casesByFactGapCategory(fixture, category).length >= 1, `${category} coverage too low`);
  }
});

await test("mode coverage includes /ask, /tax, and /audit", () => {
  const fixture = loadFixture();
  const modes = new Set(fixture.cases.map((testCase) => testCase.mode));
  const routes = new Set(fixture.cases.map((testCase) => testCase.route));

  assertIncludesAll([...modes], REQUIRED_MODES, "mode coverage");
  assertIncludesAll([...routes], REQUIRED_MODES, "route coverage");
});

await test("authority-state coverage includes AUTHORITY_FOUND, RELATED_AUTHORITY_ONLY, NO_INDEXED_SOURCE, and GENERAL_TAX", () => {
  const fixture = loadFixture();
  const states = new Set(fixture.cases.map((testCase) => testCase.authorityState));

  assertIncludesAll([...states], REQUIRED_AUTHORITY_STATES, "authority-state coverage");
});

await test("every case includes required fact-gap fields and pending checks", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    for (const field of REQUIRED_CASE_FIELDS) {
      assert(Object.hasOwn(testCase, field), `${testCase.id}.${field} missing`);
      if (Array.isArray(testCase[field])) {
        assert(testCase[field].length > 0, `${testCase.id}.${field} must not be empty`);
      } else {
        assert.equal(typeof testCase[field], "string", `${testCase.id}.${field} must be string`);
        assert(testCase[field].length > 0, `${testCase.id}.${field} must not be empty`);
      }
    }

    assert(REQUIRED_MODES.includes(testCase.mode), `${testCase.id} unsupported mode ${testCase.mode}`);
    assert(REQUIRED_AUTHORITY_STATES.includes(testCase.authorityState), `${testCase.id} unsupported authority state`);
    assert.equal(testCase.sourceAvailabilityState, testCase.authorityState);
    assert(futureCheck(testCase), `${testCase.id} missing future runtime assertion`);
    assert.equal(futureCheck(testCase).status, "pending");
  }
});

await test("fact-gap severity and risk policy values remain enumerated", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert(REQUIRED_FACT_GAP_SEVERITIES.includes(testCase.factGapSeverity), `${testCase.id} unsupported factGapSeverity`);
    assert(REQUIRED_RISK_LEVEL_POLICIES.includes(testCase.riskLevelPolicy), `${testCase.id} unsupported riskLevelPolicy`);
  }
});

await test("authorityOrSourceCoverageNeeds remains separate from user-provided fact gaps", () => {
  const fixture = loadFixture();
  const sourceNeedPattern = /authority|source|NIRC|RR|RMC|RMO|case|metadata|coverage|provision|regulation|effective-date|currentness/i;

  for (const testCase of fixture.cases) {
    assert(Array.isArray(testCase.authorityOrSourceCoverageNeeds));
    assert(testCase.authorityOrSourceCoverageNeeds.some((need) => sourceNeedPattern.test(need)), `${testCase.id} lacks source coverage need`);

    for (const field of USER_FACT_GAP_FIELDS) {
      assert.notEqual(testCase.authorityOrSourceCoverageNeeds, testCase[field], `${testCase.id} shares ${field} array reference`);
      assert.notDeepEqual(testCase.authorityOrSourceCoverageNeeds, testCase[field], `${testCase.id} conflates source needs with ${field}`);
    }

    assert(!testCase.criticalMissingUserFacts.some((fact) => /source coverage|indexed source|Phase 10|metadata|live acquisition/i.test(fact)), `${testCase.id} puts source gap in criticalMissingUserFacts`);
    assert(!testCase.helpfulMissingUserFacts.some((fact) => /source coverage|indexed source|Phase 10|metadata|live acquisition/i.test(fact)), `${testCase.id} puts source gap in helpfulMissingUserFacts`);
  }
});

await test("source coverage policies do not imply live source acquisition", () => {
  const fixture = loadFixture();
  const forbidden = /will acquire|will fetch|query Google Drive|crawl|download|ingest now|automatic ingestion|requires live source acquisition|live retrieval|requires network/i;

  for (const testCase of fixture.cases) {
    assert(!forbidden.test(asText(testCase.authorityOrSourceCoverageNeeds)), `${testCase.id} authority/source needs imply live acquisition`);
    assert(!forbidden.test(testCase.sourceCoverageGapPolicy), `${testCase.id} source policy implies live acquisition`);
  }
});

await test("Phase 10 metadata and source-governance work is deferred where relevant", () => {
  const fixture = loadFixture();
  const metadataCases = fixture.cases.filter((testCase) => /metadata|effective-date|effective period|currentness|current rules|hierarchy|source governance|supersession/i.test(combinedText(testCase)));

  assert(metadataCases.length >= 6);
  for (const testCase of metadataCases) {
    assert(testCase.deferredItems.some((item) => /Phase 10|metadata|source governance/i.test(item)), `${testCase.id} must defer metadata/source governance`);
  }
});

await test("authority conflict and hierarchy items remain placeholder or deferred", () => {
  const fixture = loadFixture();
  const hierarchyCases = fixture.cases.filter((testCase) => /hierarchy|conflict/i.test(combinedText(testCase)));

  assert(hierarchyCases.length >= 2);
  for (const testCase of hierarchyCases) {
    assert.match(combinedText(testCase), /placeholder|deferred|Phase 10|metadata/i, `${testCase.id} must not implement hierarchy/conflict resolution`);
  }
});

await test("supersession and effective-date items are deferred unless only a user fact gap is identified", () => {
  const fixture = loadFixture();
  const temporalCases = fixture.cases.filter((testCase) => /supersession|effective-date|effective period|currentness|current rules/i.test(combinedText(testCase)));

  assert(temporalCases.length >= 4);
  for (const testCase of temporalCases) {
    assert.match(combinedText(testCase), /deferred|Phase 10|metadata|missingUserFacts|tax period/i, `${testCase.id} must defer temporal source conclusions`);
  }
});

await test("numeric risk scoring is not required or used as mandatory output", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert(!/score\s*[:=]\s*\d|risk score\s+is\s+\d|mandatory numeric risk score/i.test(combinedText(testCase)), `${testCase.id} appears to assign numeric risk score`);
  }
});

await test("policy-first non-engine cases prohibit final opinions, guaranteed wins, and full numeric scoring", () => {
  const fixture = loadFixture();
  const cases = casesByFactGapCategory(fixture, "policy_first_non_engine_scaffold");

  assert(cases.length >= 3);
  for (const testCase of cases) {
    assert.equal(fixture.implementationReady, false);
    assert.equal(fixture.runtimeImplementation, false);
    assert.match(combinedText(testCase), /implementationReady false|runtimeImplementation false|deferred|Policy-first|scaffold|no runtime/i);
    assert.match(testCase.prohibitedConclusion, /final|legal opinion|win|guarantee|numeric risk score|full risk score|favorable conclusion/i);
  }
});

await test("client fact-pattern checklist cases are fact-gathering only", () => {
  const fixture = loadFixture();
  const cases = casesByFactGapCategory(fixture, "client_fact_pattern_checklist_scaffold");

  assert(cases.length >= 3);
  for (const testCase of cases) {
    assert.match(combinedText(testCase), /checklist|fact-gathering|facts are gathered|no runtime checklist engine|no .*conclusion/i);
    assert.match(testCase.prohibitedConclusion, /final|conclusion|advice|defense|allowance|rate|claim|zero-rated|outcome/i);
  }
});

await test("Phase 7A safeguards are preserved in every case", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert(Array.isArray(testCase.phase7aSafeguardsToPreserve));
    assert(testCase.phase7aSafeguardsToPreserve.length >= 3);
    for (const safeguard of testCase.phase7aSafeguardsToPreserve) {
      assert(PHASE_7A_SAFEGUARDS.includes(safeguard), `${testCase.id} unknown safeguard ${safeguard}`);
    }
    assert.match(combinedText(testCase), /format|authority|source|caution|non_fabrication|non_promotion|caveats|guaranteed|documentary|missing facts/i);
  }
});

await test("no case requires live retrieval, DB, vector, OpenAI, staging, network, or secrets", () => {
  const fixture = loadFixture();
  const forbidden = /\brequires\s+(?:live\s+)?(?:retrieval|db|database|vector|openai|staging|network|secret)|requiresSecrets\s*:\s*true|run OpenAI|call OpenAI|staging validation required/i;

  assert.equal(fixture.runtimeSafe, true);
  for (const testCase of fixture.cases) {
    assert(!forbidden.test(JSON.stringify(testCase)), `${testCase.id} appears to require live services`);
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

await test("unsupported future fact-gap metadata remains pending, not failed", () => {
  const fixture = {
    version: "phase-7b-003-unsupported-future",
    cases: [
      {
        id: "future-fact-gap-check",
        name: "Future fact-gap check",
        category: "mode_format",
        route: "/tax",
        query: "/tax Future fact-gap assertion",
        checks: [
          { type: "schema" },
          { type: "future_runtime_assertion", status: "pending", factGapCategory: "future" }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-07b-003-future-"));
  const fixturePath = join(dir, "future.fixture.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

  const report = runEvaluation({ fixturePath });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, 1);
  assert.equal(report.summary.pendingChecks, 1);
});

await test("invalid fact-gap fixture shape still fails validation", () => {
  const validation = validateEvaluationFixture({
    version: "phase-7b-003-invalid",
    cases: [
      {
        id: "missing-required-fields",
        name: "Missing required fields",
        category: "mode_format",
        route: "/tax",
        checks: [{ type: "schema" }]
      }
    ]
  });

  assert.equal(validation.ok, false);
  assert(validation.issues.some((issue) => issue.field === "query"));
});

await test("CLI exits zero for the Phase 7B-003 fact-gap detector fixture", () => {
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

console.log(`\nPATCH-07B-003 fact-gap detector fixture tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
