/**
 * PATCH-07B-004 - Authority applicability policy fixture
 *
 * Run: node tests/patch-07b-004-authority-applicability-policy-fixture.test.mjs
 *
 * Verifies the offline Phase 7B-004 fixture without runtime authority
 * applicability logic, hierarchy resolution, effective-date/supersession
 * computation, retrieval, DB/vector store, OpenAI, staging, prompts, or engines.
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-004-authority-applicability-policy.fixture.json");

const REQUIRED_APPLICABILITY_CATEGORIES = [
  "statutory_applicability_nirc_sections",
  "regulation_applicability_revenue_regulations",
  "rmc_rmo_applicability",
  "bir_ruling_applicability",
  "court_decision_applicability",
  "effective_date_transition_placeholder",
  "supersession_amendment_placeholder",
  "taxpayer_transaction_type_applicability",
  "procedural_posture_applicability",
  "authority_state_applicability_behavior",
  "policy_first_non_engine_scaffold"
];

const REQUIRED_MODES = ["/ask", "/tax", "/audit"];
const REQUIRED_AUTHORITY_STATES = ["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"];
const ALLOWED_AUTHORITY_TYPES = [
  "STATUTE",
  "REGULATION",
  "REVENUE_MEMORANDUM_CIRCULAR",
  "REVENUE_MEMORANDUM_ORDER",
  "BIR_RULING",
  "COURT_DECISION",
  "PROCEDURAL_NOTICE",
  "GENERAL_TAX_ORIENTATION",
  "UNKNOWN_OR_UNAVAILABLE"
];
const ALLOWED_APPLICABILITY_CLASSIFICATIONS = [
  "DIRECTLY_APPLICABLE_IF_FACTS_MATCH",
  "FACT_DEPENDENT_APPLICABILITY",
  "RELATED_SUPPORTING_ONLY",
  "BACKGROUND_OR_ORIENTATION_ONLY",
  "NOT_APPLICABLE_ON_GIVEN_FACTS",
  "NO_INDEXED_AUTHORITY_AVAILABLE",
  "DEFERRED_PENDING_METADATA_OR_EFFECTIVE_DATE_REVIEW"
];
const REQUIRED_CASE_FIELDS = [
  "expectedIssueFamily",
  "taxType",
  "authorityReference",
  "authorityType",
  "authorityState",
  "sourceAvailabilityState",
  "knownFacts",
  "missingUserFacts",
  "authorityOrSourceCoverageNeeds",
  "applicabilityInputs",
  "applicabilityChecklist",
  "applicabilityClassification",
  "allowedReasoningPosture",
  "prohibitedApplicabilityClaim",
  "controllingAuthorityPolicy",
  "relatedAuthorityPolicy",
  "noIndexedSourcePolicy",
  "generalTaxPolicy",
  "hierarchyPolicy",
  "effectiveDatePolicy",
  "supersessionPolicy",
  "factualSimilarityPolicy",
  "proceduralPosturePolicy",
  "phase10DependencyPolicy",
  "phase7aSafeguardsToPreserve",
  "modeBoundaryPolicy",
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
    testCase.authorityReference,
    testCase.authorityType,
    testCase.authorityState,
    testCase.sourceAvailabilityState,
    ...asArray(testCase.knownFacts),
    ...asArray(testCase.missingUserFacts),
    ...asArray(testCase.authorityOrSourceCoverageNeeds),
    ...asArray(testCase.applicabilityInputs),
    ...asArray(testCase.applicabilityChecklist),
    testCase.applicabilityClassification,
    testCase.allowedReasoningPosture,
    testCase.prohibitedApplicabilityClaim,
    testCase.controllingAuthorityPolicy,
    testCase.relatedAuthorityPolicy,
    testCase.noIndexedSourcePolicy,
    testCase.generalTaxPolicy,
    testCase.hierarchyPolicy,
    testCase.effectiveDatePolicy,
    testCase.supersessionPolicy,
    testCase.factualSimilarityPolicy,
    testCase.proceduralPosturePolicy,
    testCase.phase10DependencyPolicy,
    ...asArray(testCase.phase7aSafeguardsToPreserve),
    testCase.modeBoundaryPolicy,
    ...asArray(testCase.deferredItems),
    testCase.notes
  ].join(" ");
}

function casesByApplicabilityCategory(fixture, category) {
  return fixture.cases.filter((testCase) => testCase.applicabilityCategory === category);
}

function futureCheck(testCase) {
  return testCase.checks.find((check) => check.type === "future_runtime_assertion");
}

await test("Phase 7B-004 fixture loads and validates with the local evaluation runner", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-7b-004");
  assert.equal(fixture.fixtureId, "phase-7b-004-authority-applicability-policy");
  assert.equal(fixture.patch, "PATCH-07B-004");
  assert.equal(fixture.phase, "Phase 7B");
  assert.equal(fixture.scaffoldType, "authority_applicability_policy");
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
  assert(fixture.buildsOn.includes("PATCH-07B-002"), "buildsOn must include PATCH-07B-002");
  assert(fixture.buildsOn.includes("PATCH-07B-003"), "buildsOn must include PATCH-07B-003");
});

await test("fixture uses only existing local evaluation categories", () => {
  const fixture = loadFixture();
  const groups = groupCasesByCategory(fixture.cases);

  for (const category of Object.keys(groups)) {
    assert(EVALUATION_CATEGORIES.includes(category), `unsupported evaluation category ${category}`);
  }

  assert(groups.generic_guard.length >= 1);
  assert(groups.mode_format.length >= 1);
  assert(groups.related_authority.length >= 1);
  assert(groups.unavailable_source.length >= 1);
});

await test("required authority applicability categories exist with minimum coverage", () => {
  const fixture = loadFixture();
  const categories = new Set(fixture.cases.map((testCase) => testCase.applicabilityCategory));

  assert(fixture.cases.length >= 34, "fixture must include at least 34 cases");
  assertIncludesAll([...categories], REQUIRED_APPLICABILITY_CATEGORIES, "authority applicability category coverage");

  for (const category of REQUIRED_APPLICABILITY_CATEGORIES) {
    assert(casesByApplicabilityCategory(fixture, category).length >= 1, `${category} coverage too low`);
  }

  for (const category of REQUIRED_APPLICABILITY_CATEGORIES.slice(0, 9)) {
    assert(casesByApplicabilityCategory(fixture, category).length >= 3, `${category} must have at least 3 cases`);
  }
  assert(casesByApplicabilityCategory(fixture, "authority_state_applicability_behavior").length >= 4);
  assert(casesByApplicabilityCategory(fixture, "policy_first_non_engine_scaffold").length >= 4);
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

await test("authorityType and applicabilityClassification values are enumerated", () => {
  const fixture = loadFixture();
  const authorityTypes = new Set(fixture.cases.map((testCase) => testCase.authorityType));
  const classifications = new Set(fixture.cases.map((testCase) => testCase.applicabilityClassification));

  assertIncludesAll([...authorityTypes], ALLOWED_AUTHORITY_TYPES, "authorityType coverage");
  assertIncludesAll([...classifications], ALLOWED_APPLICABILITY_CLASSIFICATIONS, "applicabilityClassification coverage");

  for (const testCase of fixture.cases) {
    assert(ALLOWED_AUTHORITY_TYPES.includes(testCase.authorityType), `${testCase.id} unsupported authorityType`);
    assert(ALLOWED_APPLICABILITY_CLASSIFICATIONS.includes(testCase.applicabilityClassification), `${testCase.id} unsupported applicabilityClassification`);
  }
});

await test("every case includes required authority applicability fields and pending checks", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.equal(typeof testCase.id, "string");
    assert.equal(typeof testCase.name, "string");
    assert.equal(typeof testCase.category, "string");
    assert.equal(typeof testCase.applicabilityCategory, "string");
    assert.equal(typeof testCase.query, "string");
    assert(REQUIRED_MODES.includes(testCase.mode), `${testCase.id} unsupported mode ${testCase.mode}`);
    assert(REQUIRED_AUTHORITY_STATES.includes(testCase.authorityState), `${testCase.id} unsupported authority state`);
    assert.equal(testCase.sourceAvailabilityState, testCase.authorityState);

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

await test("missingUserFacts remain separate from authorityOrSourceCoverageNeeds", () => {
  const fixture = loadFixture();
  const sourceNeedPattern = /authority|source|NIRC|RR|RMC|RMO|case|ruling|metadata|coverage|provision|regulation|registry|indexed/i;

  for (const testCase of fixture.cases) {
    assert(Array.isArray(testCase.missingUserFacts));
    assert(Array.isArray(testCase.authorityOrSourceCoverageNeeds));
    assert.notEqual(testCase.missingUserFacts, testCase.authorityOrSourceCoverageNeeds);
    assert.notDeepEqual(testCase.missingUserFacts, testCase.authorityOrSourceCoverageNeeds, `${testCase.id} conflates user facts and source needs`);
    assert(testCase.authorityOrSourceCoverageNeeds.some((need) => sourceNeedPattern.test(need)), `${testCase.id} lacks authority/source coverage need`);
    assert(!testCase.missingUserFacts.some((fact) => /source coverage|indexed source|Phase 10|metadata|live acquisition/i.test(fact)), `${testCase.id} puts source gap in missingUserFacts`);
  }
});

await test("applicabilityChecklist includes taxpayer/type/transaction/period or explains why not applicable", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    const text = asText(testCase.applicabilityChecklist);
    assert.match(text, /taxpayer|transaction|period|stage|date|source|authority|not applicable|GENERAL_TAX|NO_INDEXED_SOURCE/i, `${testCase.id} checklist lacks required applicability inputs`);
  }
});

await test("hierarchy, effective-date, and supersession policies remain cautious placeholders", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.match(testCase.hierarchyPolicy, /cautious|deferred|placeholder|not assumed|not resolved|not reached|not evaluated|Phase 10/i, `${testCase.id} hierarchyPolicy overclaims`);
    assert.match(testCase.effectiveDatePolicy, /deferred|placeholder|Phase 10|period|metadata|not available|requires|cannot occur/i, `${testCase.id} effectiveDatePolicy overclaims`);
    assert.match(testCase.supersessionPolicy, /No |not asserted|deferred|placeholder|without .*metadata|indexed source status supports/i, `${testCase.id} supersessionPolicy overclaims`);
  }
});

await test("RELATED_AUTHORITY_ONLY cases remain supporting/background only", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.authorityState === "RELATED_AUTHORITY_ONLY");

  assert(cases.length >= 6);
  for (const testCase of cases) {
    assert(["RELATED_SUPPORTING_ONLY", "BACKGROUND_OR_ORIENTATION_ONLY", "DEFERRED_PENDING_METADATA_OR_EFFECTIVE_DATE_REVIEW"].includes(testCase.applicabilityClassification), `${testCase.id} related authority overclaims applicability`);
    assert.notEqual(testCase.applicabilityClassification, "DIRECTLY_APPLICABLE_IF_FACTS_MATCH");
    assert.match(combinedText(testCase), /related|supporting|not controlling|not directly|not confirmed|no controlling/i);
  }
});

await test("NO_INDEXED_SOURCE cases use unavailable classification and do not fabricate applicability", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.authorityState === "NO_INDEXED_SOURCE");

  assert(cases.length >= 2);
  for (const testCase of cases) {
    assert.equal(testCase.applicabilityClassification, "NO_INDEXED_AUTHORITY_AVAILABLE");
    assert.match(combinedText(testCase), /no indexed|not fabricate|without indexed|No controlling|no authority/i);
  }
});

await test("GENERAL_TAX cases do not claim exact authority", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.authorityState === "GENERAL_TAX");

  assert(cases.length >= 5);
  for (const testCase of cases) {
    assert.notEqual(testCase.applicabilityClassification, "DIRECTLY_APPLICABLE_IF_FACTS_MATCH");
    assert.match(combinedText(testCase), /orientation|general|not exact|without exact|does not become exact|BACKGROUND_OR_ORIENTATION_ONLY|DEFERRED/i);
  }
});

await test("BIR ruling cases do not assume binding applicability to non-addressee taxpayers", () => {
  const fixture = loadFixture();
  const cases = casesByApplicabilityCategory(fixture, "bir_ruling_applicability");

  assert.equal(cases.length, 3);
  for (const testCase of cases) {
    assert.equal(testCase.authorityType, "BIR_RULING");
    assert.match(combinedText(testCase), /addressee|non-addressee|different taxpayer|taxpayer-specific|not assume binding|not automatically controlling/i);
  }
});

await test("court decision cases preserve factual/procedural posture and no guaranteed win", () => {
  const fixture = loadFixture();
  const cases = casesByApplicabilityCategory(fixture, "court_decision_applicability");

  assert.equal(cases.length, 3);
  for (const testCase of cases) {
    assert.equal(testCase.authorityType, "COURT_DECISION");
    assert.match(combinedText(testCase), /court level|facts|factual|procedural|posture|doctrine|finality/i);
    assert(!/guarantee taxpayer success|guarantee invalidation|guaranteed victory/i.test(testCase.allowedReasoningPosture));
    assert.match(testCase.prohibitedApplicabilityClaim, /Do not|guarantee|governs|controlling|applies/i);
  }
});

await test("effective-date and supersession cases include Phase 10 dependency policy", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => /effective_date|supersession/.test(testCase.applicabilityCategory));

  assert(cases.length >= 6);
  for (const testCase of cases) {
    assert.match(combinedText(testCase), /Phase 10|metadata|registry|effective-date|supersession|amendment/i);
    assert.match(testCase.phase10DependencyPolicy, /Phase 10/i);
  }
});

await test("policy-first non-engine cases prohibit final applicability conclusions", () => {
  const fixture = loadFixture();
  const cases = casesByApplicabilityCategory(fixture, "policy_first_non_engine_scaffold");

  assert.equal(cases.length, 4);
  assert.equal(fixture.implementationReady, false);
  assert.equal(fixture.runtimeImplementation, false);

  for (const testCase of cases) {
    assert.match(combinedText(testCase), /implementationReady false|runtimeImplementation false|deferred|placeholder|Phase 10/i);
    assert.match(testCase.prohibitedApplicabilityClaim, /Do not|final applicability conclusion|controlling|active|retroactively|missing/i);
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
    assert.match(combinedText(testCase), /format|authority|source|caution|non_fabrication|non_promotion|caveats|guaranteed|documentary|missing/i);
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

await test("unsupported future authority-applicability metadata remains pending, not failed", () => {
  const fixture = {
    version: "phase-7b-004-unsupported-future",
    cases: [
      {
        id: "future-authority-applicability-check",
        name: "Future authority applicability check",
        category: "mode_format",
        route: "/tax",
        query: "/tax Future authority applicability assertion",
        checks: [
          { type: "schema" },
          { type: "future_runtime_assertion", status: "pending", applicabilityCategory: "future" }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-07b-004-future-"));
  const fixturePath = join(dir, "future.fixture.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

  const report = runEvaluation({ fixturePath });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, 1);
  assert.equal(report.summary.pendingChecks, 1);
});

await test("invalid authority-applicability fixture shape still fails validation", () => {
  const validation = validateEvaluationFixture({
    version: "phase-7b-004-invalid",
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

await test("CLI exits zero for the Phase 7B-004 authority applicability fixture", () => {
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

console.log(`\nPATCH-07B-004 authority applicability policy fixture tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
