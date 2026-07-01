/**
 * PATCH-07B-002 - Analytical reasoning issue-framing scaffold
 *
 * Run: node tests/patch-07b-002-analytical-reasoning-issue-framing-scaffold.test.mjs
 *
 * Verifies the offline Phase 7B-002 fixture without runtime reasoning,
 * retrieval, DB/vector store, OpenAI, staging, sourceAvailability execution,
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-002-analytical-reasoning-issue-framing.fixture.json");

const REQUIRED_ISSUE_CATEGORIES = [
  "withholding_ewt",
  "vat_zero_rating",
  "nolco",
  "deductibility_substantiation",
  "cwt_form_2307",
  "bir_audit_procedure",
  "invoice_mismatch_vat_input",
  "reimbursable_pass_through",
  "authority_state_reasoning_posture",
  "policy_first_non_engine_scaffold"
];

const MIN_ISSUE_COUNTS = {
  withholding_ewt: 3,
  vat_zero_rating: 3,
  nolco: 3,
  deductibility_substantiation: 3,
  cwt_form_2307: 3,
  bir_audit_procedure: 3,
  invoice_mismatch_vat_input: 3,
  reimbursable_pass_through: 3,
  authority_state_reasoning_posture: 4,
  policy_first_non_engine_scaffold: 3
};

const REQUIRED_MODES = ["/ask", "/tax", "/audit"];
const REQUIRED_AUTHORITY_STATES = ["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"];
const REQUIRED_CASE_FIELDS = [
  "expectedIssueFamily",
  "taxType",
  "expectedIssueFrame",
  "knownFacts",
  "missingUserFacts",
  "sourceCoverageNeeds",
  "expectedReasoningPosture",
  "prohibitedConclusion",
  "phase7aSafeguardsToPreserve",
  "factGapPolicy",
  "sourceCoverageGapPolicy",
  "authorityStatePolicy",
  "modeBoundaryPolicy",
  "riskLevelPolicy",
  "deferredItems",
  "notes"
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

function futureCheck(testCase) {
  return testCase.checks.find((check) => check.type === "future_runtime_assertion");
}

function asText(value) {
  return Array.isArray(value) ? value.join(" ") : String(value || "");
}

function combinedText(testCase) {
  return [
    testCase.expectedIssueFamily,
    testCase.taxType,
    testCase.expectedIssueFrame,
    ...testCase.knownFacts,
    ...testCase.missingUserFacts,
    ...testCase.sourceCoverageNeeds,
    testCase.expectedReasoningPosture,
    testCase.prohibitedConclusion,
    ...testCase.phase7aSafeguardsToPreserve,
    testCase.factGapPolicy,
    testCase.sourceCoverageGapPolicy,
    testCase.authorityStatePolicy,
    testCase.modeBoundaryPolicy,
    testCase.riskLevelPolicy,
    ...testCase.deferredItems,
    testCase.notes
  ].join(" ");
}

function casesByIssueCategory(fixture, category) {
  return fixture.cases.filter((testCase) => testCase.issueFramingCategory === category);
}

await test("Phase 7B-002 fixture loads and validates with the local evaluation runner", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-7b-002");
  assert.equal(fixture.fixtureId, "phase-7b-002-analytical-reasoning-issue-framing");
  assert.equal(fixture.patch, "PATCH-07B-002");
  assert.equal(fixture.phase, "Phase 7B");
  assert.equal(fixture.scaffoldType, "analytical_reasoning_issue_framing");
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
  assert.match(fixture.objective, /policy-level fixture coverage|issue framing/i);
});

await test("fixture uses only existing local evaluation categories", () => {
  const fixture = loadFixture();
  const groups = groupCasesByCategory(fixture.cases);

  for (const category of Object.keys(groups)) {
    assert(EVALUATION_CATEGORIES.includes(category), `unsupported category ${category}`);
  }

  assert(groups.generic_guard.length >= 8);
  assert(groups.mode_format.length >= 16);
  assert(groups.related_authority.length >= 1);
  assert(groups.unavailable_source.length >= 1);
  assert(groups.exact_authority.length >= 1);
});

await test("required issue-framing categories exist with minimum coverage", () => {
  const fixture = loadFixture();
  const categories = new Set(fixture.cases.map((testCase) => testCase.issueFramingCategory));

  assertIncludesAll([...categories], REQUIRED_ISSUE_CATEGORIES, "issue-framing category coverage");
  for (const category of REQUIRED_ISSUE_CATEGORIES) {
    assert(
      casesByIssueCategory(fixture, category).length >= MIN_ISSUE_COUNTS[category],
      `${category} coverage too low`
    );
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

await test("every case includes required issue-framing fields and pending checks", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.equal(typeof testCase.id, "string");
    assert.equal(typeof testCase.name, "string");
    assert.equal(typeof testCase.category, "string");
    assert.equal(typeof testCase.issueFramingCategory, "string");
    assert.equal(typeof testCase.query, "string");
    assert(REQUIRED_MODES.includes(testCase.mode));
    assert(REQUIRED_AUTHORITY_STATES.includes(testCase.authorityState));
    assert.equal(testCase.sourceAvailabilityState, testCase.authorityState);

    for (const field of REQUIRED_CASE_FIELDS) {
      assert(Object.hasOwn(testCase, field), `${testCase.id}.${field} missing`);
      if (Array.isArray(testCase[field])) {
        assert(testCase[field].length > 0, `${testCase.id}.${field} must not be empty`);
      } else {
        assert.equal(typeof testCase[field], "string", `${testCase.id}.${field} must be string`);
        if (field === "taxType") {
          assert(testCase[field].length >= 3, `${testCase.id}.${field} too short`);
        } else {
          assert(testCase[field].length > 10, `${testCase.id}.${field} too short`);
        }
      }
    }

    assert(futureCheck(testCase), `${testCase.id} missing future runtime assertion`);
    assert.equal(futureCheck(testCase).status, "pending");
  }
});

await test("missingUserFacts and sourceCoverageNeeds are separate and not conflated", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert(Array.isArray(testCase.missingUserFacts));
    assert(Array.isArray(testCase.sourceCoverageNeeds));
    assert.notEqual(testCase.missingUserFacts, testCase.sourceCoverageNeeds);
    assert.notDeepEqual(testCase.missingUserFacts, testCase.sourceCoverageNeeds, `${testCase.id} conflates fact and source gaps`);
    assert(!testCase.missingUserFacts.some((fact) => /source coverage|indexed source|Phase 10|metadata|live acquisition/i.test(fact)), `${testCase.id} puts source gap in missingUserFacts`);
    assert(testCase.sourceCoverageNeeds.some((need) => /authority|source|NIRC|RR|RMC|case|metadata|coverage|provision|regulation/i.test(need)), `${testCase.id} lacks authority/source needs`);
  }
});

await test("sourceCoverageNeeds never imply live source acquisition", () => {
  const fixture = loadFixture();
  const forbidden = /will acquire|will fetch|query Google Drive|crawl|download|ingest now|automatic ingestion|requires live source acquisition/i;

  for (const testCase of fixture.cases) {
    assert(!forbidden.test(asText(testCase.sourceCoverageNeeds)), `${testCase.id} implies live acquisition`);
    assert(!forbidden.test(testCase.sourceCoverageGapPolicy), `${testCase.id} source policy implies live acquisition`);
  }
});

await test("Phase 10 metadata/source governance is deferred where source metadata is relevant", () => {
  const fixture = loadFixture();
  const metadataCases = fixture.cases.filter((testCase) => /metadata|effective|supersession|current|hierarchy|source governance/i.test(combinedText(testCase)));

  assert(metadataCases.length >= 10);
  for (const testCase of metadataCases) {
    assert(testCase.deferredItems.some((item) => /Phase 10|metadata|source governance/i.test(item)), `${testCase.id} must defer metadata/source governance`);
  }
});

await test("authority conflict and hierarchy items remain placeholder or deferred", () => {
  const fixture = loadFixture();
  const hierarchyCases = fixture.cases.filter((testCase) => /hierarchy|conflict/i.test(combinedText(testCase)));

  assert(hierarchyCases.length >= 3);
  for (const testCase of hierarchyCases) {
    assert.match(combinedText(testCase), /placeholder|deferred|Phase 10/i, `${testCase.id} must not implement hierarchy/conflict resolution`);
  }
});

await test("supersession and effective-date items are deferred unless only user fact gaps are identified", () => {
  const fixture = loadFixture();
  const temporalCases = fixture.cases.filter((testCase) => /supersession|effective-date|effective period|currentness|current rules/i.test(combinedText(testCase)));

  assert(temporalCases.length >= 6);
  for (const testCase of temporalCases) {
    assert.match(combinedText(testCase), /deferred|Phase 10|metadata/i, `${testCase.id} must defer temporal source conclusions`);
  }
});

await test("numeric risk scoring is not required", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.match(testCase.riskLevelPolicy, /No numeric|no numeric|deferred|Qualitative|qualitative|unknown/i, `${testCase.id} must avoid numeric risk scoring`);
    assert(!/score\s*[:=]\s*\d|risk score\s+is\s+\d/i.test(combinedText(testCase)), `${testCase.id} appears to assign numeric risk score`);
  }
});

await test("policy-first non-engine cases prohibit final opinion, final defense, or full risk score", () => {
  const fixture = loadFixture();
  const cases = casesByIssueCategory(fixture, "policy_first_non_engine_scaffold");

  assert.equal(cases.length, 3);
  for (const testCase of cases) {
    assert.equal(loadFixture().implementationReady, false);
    assert.equal(loadFixture().runtimeImplementation, false);
    assert.match(combinedText(testCase), /implementationReady false|runtimeImplementation false|deferred|Policy-first|scaffold/i);
    assert.match(testCase.prohibitedConclusion, /complete legal opinion|final BIR defense|numeric risk score|full risk score|guarantee/i);
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
    assert.match(combinedText(testCase), /format|authority|source|caution|non_fabrication|non_promotion|caveats|guaranteed|documentary/i);
  }
});

await test("authority-state posture cases enforce required conservative behavior", () => {
  const fixture = loadFixture();
  const cases = casesByIssueCategory(fixture, "authority_state_reasoning_posture");

  assert(cases.some((testCase) => testCase.authorityState === "AUTHORITY_FOUND" && /not overclaim|not unlimited|within/i.test(combinedText(testCase))));
  assert(cases.some((testCase) => testCase.authorityState === "RELATED_AUTHORITY_ONLY" && /not controlling|supporting only|non-governing/i.test(combinedText(testCase))));
  assert(cases.some((testCase) => testCase.authorityState === "NO_INDEXED_SOURCE" && /fabricat|No indexed|NO_INDEXED_SOURCE/i.test(combinedText(testCase))));
  assert(cases.some((testCase) => testCase.authorityState === "GENERAL_TAX" && /generic|non-promotion|not promote/i.test(combinedText(testCase))));
});

await test("no case requires live retrieval, DB, vector, OpenAI, staging, network, or secrets", () => {
  const fixture = loadFixture();
  const forbidden = /\brequires\s+(?:live\s+)?(?:retrieval|db|database|vector|openai|staging|network|secret)|requiresSecrets\s*:\s*true/i;

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

await test("unsupported future issue-framing metadata remains pending, not failed", () => {
  const fixture = {
    version: "phase-7b-002-unsupported-future",
    cases: [
      {
        id: "future-issue-framing-check",
        name: "Future issue-framing check",
        category: "mode_format",
        route: "/tax",
        query: "/tax Future issue-framing assertion",
        checks: [
          { type: "schema" },
          { type: "future_runtime_assertion", status: "pending", issueFramingCategory: "future" }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-07b-002-future-"));
  const fixturePath = join(dir, "future.fixture.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

  const report = runEvaluation({ fixturePath });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, 1);
  assert.equal(report.summary.pendingChecks, 1);
});

await test("invalid issue-framing fixture shape still fails validation", () => {
  const validation = validateEvaluationFixture({
    version: "phase-7b-002-invalid",
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

await test("CLI exits zero for the Phase 7B-002 issue-framing fixture", () => {
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

console.log(`\nPATCH-07B-002 analytical reasoning issue-framing scaffold tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
