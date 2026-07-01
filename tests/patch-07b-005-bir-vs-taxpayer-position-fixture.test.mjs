/**
 * PATCH-07B-005 - BIR vs taxpayer position fixture and tests
 *
 * Run: node tests/patch-07b-005-bir-vs-taxpayer-position-fixture.test.mjs
 *
 * Verifies the offline Phase 7B-005 fixture without runtime BIR-position,
 * taxpayer-position, audit-defense, settlement, exposure scoring, document
 * sufficiency, procedural defect, retrieval, DB/vector store, OpenAI, staging,
 * prompt, source-card, or sourceAvailability implementation changes.
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-005-bir-vs-taxpayer-position.fixture.json");

const REQUIRED_POSITION_CATEGORIES = [
  "ewt_withholding_deficiency",
  "cwt_form_2307_disallowance",
  "vat_zero_rating_disallowance",
  "input_vat_invoice_mismatch",
  "deductibility_substantiation",
  "reimbursable_pass_through_billing",
  "loa_pan_fan_fdda_procedural",
  "prescription_assessment_timing",
  "nolco_disallowance",
  "authority_state_bir_vs_taxpayer_behavior",
  "settlement_protest_posture_scaffold",
  "policy_first_non_engine_scaffold"
];

const REQUIRED_MODES = ["/ask", "/tax", "/audit"];
const REQUIRED_AUTHORITY_STATES = ["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"];
const ALLOWED_AUTHORITY_SUPPORT_LEVELS = [
  "DIRECT_AUTHORITY_SUPPORT",
  "RELATED_AUTHORITY_SUPPORT_ONLY",
  "GENERAL_OR_BACKGROUND_SUPPORT_ONLY",
  "NO_INDEXED_AUTHORITY_SUPPORT",
  "INSUFFICIENT_AUTHORITY_OR_FACTS",
  "DEFERRED_PENDING_METADATA_OR_EFFECTIVE_DATE_REVIEW"
];
const ALLOWED_RISK_LEVEL_POLICIES = ["LOW", "MODERATE", "HIGH", "CRITICAL", "UNKNOWN_INSUFFICIENT_FACTS"];
const ALLOWED_SETTLEMENT_OR_PROTEST_POSTURES = [
  "PROTEST_OR_DEFENSE_POSSIBLE_IF_DOCUMENTS_SUPPORT",
  "SETTLEMENT_SHOULD_BE_EVALUATED",
  "DOCUMENTS_FIRST_BEFORE_POSITION",
  "PROCEDURAL_REVIEW_FIRST",
  "AUTHORITY_REVIEW_FIRST",
  "INSUFFICIENT_FACTS_TO_RECOMMEND",
  "NOT_APPLICABLE_TO_THIS_MODE"
];
const REQUIRED_CASE_FIELDS = [
  "expectedIssueFamily",
  "taxType",
  "assessmentContext",
  "authorityState",
  "sourceAvailabilityState",
  "knownFacts",
  "missingUserFacts",
  "authorityOrSourceCoverageNeeds",
  "birLikelyPosition",
  "taxpayerPosition",
  "strongestTaxpayerSupport",
  "weakestTaxpayerFactsOrDocuments",
  "requiredDocuments",
  "proceduralIssues",
  "authoritySupportLevel",
  "exposureIndicators",
  "riskLevelPolicy",
  "settlementOrProtestPosture",
  "recommendedNextStep",
  "prohibitedConclusion",
  "prohibitedBIRClaim",
  "prohibitedTaxpayerClaim",
  "noGuaranteedOutcomePolicy",
  "authorityStatePolicy",
  "sourceCoverageGapPolicy",
  "factGapPolicy",
  "applicabilityPolicy",
  "phase7aSafeguardsToPreserve",
  "modeBoundaryPolicy"
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
    testCase.id,
    testCase.name,
    testCase.positionCategory,
    testCase.expectedIssueFamily,
    testCase.taxType,
    testCase.assessmentContext,
    testCase.authorityState,
    testCase.sourceAvailabilityState,
    ...asArray(testCase.knownFacts),
    ...asArray(testCase.missingUserFacts),
    ...asArray(testCase.authorityOrSourceCoverageNeeds),
    testCase.birLikelyPosition,
    testCase.taxpayerPosition,
    ...asArray(testCase.strongestTaxpayerSupport),
    ...asArray(testCase.weakestTaxpayerFactsOrDocuments),
    ...asArray(testCase.requiredDocuments),
    ...asArray(testCase.proceduralIssues),
    testCase.authoritySupportLevel,
    ...asArray(testCase.exposureIndicators),
    testCase.riskLevelPolicy,
    testCase.settlementOrProtestPosture,
    testCase.recommendedNextStep,
    testCase.prohibitedConclusion,
    testCase.prohibitedBIRClaim,
    testCase.prohibitedTaxpayerClaim,
    testCase.noGuaranteedOutcomePolicy,
    testCase.authorityStatePolicy,
    testCase.sourceCoverageGapPolicy,
    testCase.factGapPolicy,
    testCase.applicabilityPolicy,
    testCase.phase10DependencyPolicy,
    ...asArray(testCase.phase7aSafeguardsToPreserve),
    testCase.modeBoundaryPolicy,
    ...asArray(testCase.deferredItems),
    testCase.notes
  ].join(" ");
}

function casesByPositionCategory(fixture, category) {
  return fixture.cases.filter((testCase) => testCase.positionCategory === category);
}

function futureCheck(testCase) {
  return testCase.checks.find((check) => check.type === "future_runtime_assertion");
}

await test("Phase 7B-005 fixture loads and validates with the local evaluation runner", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.fixtureId, "phase-7b-005-bir-vs-taxpayer-position");
  assert.equal(fixture.patch, "PATCH-07B-005");
  assert.equal(fixture.phase, "Phase 7B");
  assert.equal(fixture.scaffoldType, "bir_vs_taxpayer_position_policy");
  assert.match(fixture.objective, /offline fixture coverage|BIR versus taxpayer position/i);
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
  assert(fixture.buildsOn.includes("PATCH-07B-004"), "buildsOn must include PATCH-07B-004");
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

await test("required BIR vs taxpayer position categories exist with minimum coverage", () => {
  const fixture = loadFixture();
  const categories = new Set(fixture.cases.map((testCase) => testCase.positionCategory));

  assert(fixture.cases.length >= 38, "fixture must include at least 38 cases");
  assertIncludesAll([...categories], REQUIRED_POSITION_CATEGORIES, "BIR vs taxpayer position category coverage");
  for (const category of REQUIRED_POSITION_CATEGORIES) {
    assert(casesByPositionCategory(fixture, category).length >= 1, `${category} coverage too low`);
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

await test("authority support, risk level, and settlement/protest values are enumerated", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert(ALLOWED_AUTHORITY_SUPPORT_LEVELS.includes(testCase.authoritySupportLevel), `${testCase.id} unsupported authoritySupportLevel`);
    assert(ALLOWED_RISK_LEVEL_POLICIES.includes(testCase.riskLevelPolicy), `${testCase.id} unsupported riskLevelPolicy`);
    assert(ALLOWED_SETTLEMENT_OR_PROTEST_POSTURES.includes(testCase.settlementOrProtestPosture), `${testCase.id} unsupported settlementOrProtestPosture`);
  }
});

await test("every case includes required BIR vs taxpayer position fields and pending checks", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.equal(typeof testCase.id, "string");
    assert.equal(typeof testCase.name, "string");
    assert.equal(typeof testCase.category, "string");
    assert.equal(typeof testCase.positionCategory, "string");
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

await test("missing user facts remain separate from authority/source coverage needs", () => {
  const fixture = loadFixture();
  const sourceNeedPattern = /authority|source|NIRC|RR|RMC|RMO|case|ruling|metadata|coverage|provision|regulation|registry|indexed|currentness/i;

  for (const testCase of fixture.cases) {
    assert(Array.isArray(testCase.missingUserFacts));
    assert(Array.isArray(testCase.authorityOrSourceCoverageNeeds));
    assert.notEqual(testCase.missingUserFacts, testCase.authorityOrSourceCoverageNeeds);
    assert.notDeepEqual(testCase.missingUserFacts, testCase.authorityOrSourceCoverageNeeds, `${testCase.id} conflates user facts and source needs`);
    assert(testCase.authorityOrSourceCoverageNeeds.some((need) => sourceNeedPattern.test(need)), `${testCase.id} lacks authority/source coverage need`);
    assert(!testCase.missingUserFacts.some((fact) => /source coverage|indexed source|Phase 10|metadata|live acquisition/i.test(fact)), `${testCase.id} puts source gap in missingUserFacts`);
  }
});

await test("BIR likely position and taxpayer position are both present and distinct", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.equal(typeof testCase.birLikelyPosition, "string");
    assert.equal(typeof testCase.taxpayerPosition, "string");
    assert.notEqual(testCase.birLikelyPosition.trim(), testCase.taxpayerPosition.trim(), `${testCase.id} has identical BIR and taxpayer positions`);
    assert.match(testCase.birLikelyPosition, /BIR|assess|argue|disallow|defend|position|likely/i);
    assert.match(testCase.taxpayerPosition, /Taxpayer|defend|argue|position|may|should|can/i);
  }
});

await test("strongest support, weakest facts/documents, and required documents are present where needed", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert(Array.isArray(testCase.strongestTaxpayerSupport));
    assert(Array.isArray(testCase.weakestTaxpayerFactsOrDocuments));
    assert(testCase.strongestTaxpayerSupport.length > 0, `${testCase.id} missing strongest support`);
    assert(testCase.weakestTaxpayerFactsOrDocuments.length > 0, `${testCase.id} missing weakest facts/documents`);
    if (testCase.mode === "/tax" || testCase.mode === "/audit") {
      assert(Array.isArray(testCase.requiredDocuments));
      assert(testCase.requiredDocuments.length > 0, `${testCase.id} missing required documents`);
    }
  }
});

await test("exposure indicators remain qualitative and do not require numeric scoring", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert(Array.isArray(testCase.exposureIndicators));
    assert(!/score\s*[:=]\s*\d|risk score\s+is\s+\d|exposure score\s+is\s+\d|mandatory numeric|required numeric|exact exposure score required/i.test(combinedText(testCase)), `${testCase.id} appears to require numeric exposure scoring`);
    assert.match(asText(testCase.exposureIndicators), /no numeric exposure score required|numeric exposure score deferred|qualitative/i, `${testCase.id} must keep exposure qualitative`);
  }
});

await test("settlement/protest posture never recommends ignoring BIR", () => {
  const fixture = loadFixture();
  const affirmativeIgnorePattern = /\b(?:ignore BIR|do not respond to BIR|skip BIR notice|disregard BIR)\b/i;
  const protectiveDoNotIgnorePattern = /\b(?:do not|don't|never)\s+(?:ignore|disregard|skip)/i;

  for (const testCase of fixture.cases) {
    const postureText = testCase.settlementOrProtestPosture;
    const nextStepText = testCase.recommendedNextStep;
    assert(!affirmativeIgnorePattern.test(postureText) || protectiveDoNotIgnorePattern.test(postureText), `${testCase.id} posture recommends ignoring BIR`);
    assert(!affirmativeIgnorePattern.test(nextStepText) || protectiveDoNotIgnorePattern.test(nextStepText), `${testCase.id} next step recommends ignoring BIR`);
  }
});

await test("no case guarantees taxpayer win or BIR win", () => {
  const fixture = loadFixture();
  const guaranteePattern = /\b(?:will|must|shall|guaranteed to)\s+(?:win|prevail|succeed|be cancelled|be sustained)\b/i;

  for (const testCase of fixture.cases) {
    assert(!guaranteePattern.test(testCase.birLikelyPosition), `${testCase.id} guarantees BIR win`);
    assert(!guaranteePattern.test(testCase.taxpayerPosition), `${testCase.id} guarantees taxpayer win`);
    assert.match(testCase.noGuaranteedOutcomePolicy, /No guaranteed|Guaranteed outcome.*prohibited|No .*guaranteed/i, `${testCase.id} lacks no-guarantee policy`);
  }
});

await test("RELATED_AUTHORITY_ONLY cases do not use direct authority support", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.authorityState === "RELATED_AUTHORITY_ONLY");

  assert(cases.length >= 6);
  for (const testCase of cases) {
    assert.notEqual(testCase.authoritySupportLevel, "DIRECT_AUTHORITY_SUPPORT");
    assert.match(combinedText(testCase), /related|supporting|not controlling|cannot be treated as controlling|direct authority gap/i);
  }
});

await test("NO_INDEXED_SOURCE cases do not fabricate legal support", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.authorityState === "NO_INDEXED_SOURCE");

  assert(cases.length >= 2);
  for (const testCase of cases) {
    assert.equal(testCase.authoritySupportLevel, "NO_INDEXED_AUTHORITY_SUPPORT");
    assert.match(combinedText(testCase), /no indexed|not fabricate|without indexed|source gap|cannot supply legal support/i);
  }
});

await test("GENERAL_TAX cases remain general orientation only", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.authorityState === "GENERAL_TAX");

  assert(cases.length >= 5);
  for (const testCase of cases) {
    assert.notEqual(testCase.authoritySupportLevel, "DIRECT_AUTHORITY_SUPPORT");
    assert.match(combinedText(testCase), /orientation|general|not exact|GENERAL_TAX remains orientation only|general tax/i);
  }
});

await test("effective-date, supersession, and metadata issues keep Phase 10 dependency policy", () => {
  const fixture = loadFixture();
  const metadataCases = fixture.cases.filter((testCase) => /effective-date|effective date|supersession|currentness|metadata|historical authority|source governance/i.test(combinedText(testCase)));

  assert(metadataCases.length >= 4);
  for (const testCase of metadataCases) {
    assert(Object.hasOwn(testCase, "phase10DependencyPolicy"), `${testCase.id}.phase10DependencyPolicy missing`);
    assert.match(testCase.phase10DependencyPolicy, /Phase 10/i, `${testCase.id} must defer metadata/source-governance work to Phase 10`);
  }
});

await test("policy-first non-engine cases prohibit final opinions, hidden weakness, assumptions, exact scoring, and related-authority overclaim", () => {
  const fixture = loadFixture();
  const cases = casesByPositionCategory(fixture, "policy_first_non_engine_scaffold");

  assert(cases.length >= 4);
  assert.equal(fixture.implementationReady, false);
  assert.equal(fixture.runtimeImplementation, false);
  assert(cases.some((testCase) => /final legal opinion|guaranteed win/i.test(combinedText(testCase))));
  assert(cases.some((testCase) => /hide weak documents|hidden weakness|hiding weaknesses/i.test(combinedText(testCase))));
  assert(cases.some((testCase) => /assume missing facts|assumed facts|missing facts/i.test(combinedText(testCase))));
  assert(cases.some((testCase) => /exact exposure score|numeric exposure scoring|numeric exposure score/i.test(combinedText(testCase))));
  assert(cases.some((testCase) => /related authority.*controlling|controlling taxpayer defense/i.test(combinedText(testCase))));

  for (const testCase of cases) {
    assert.match(combinedText(testCase), /implementationReady false|runtimeImplementation false|deferred|policy-first|scaffold/i);
    assert.match(testCase.prohibitedConclusion, /Do not|final|legal opinion|guaranteed|hide|assume|exact exposure|controlling/i);
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

await test("unsupported future BIR/taxpayer position metadata remains pending, not failed", () => {
  const fixture = {
    version: "phase-7b-005-unsupported-future",
    cases: [
      {
        id: "future-bir-taxpayer-position-check",
        name: "Future BIR/taxpayer position check",
        category: "mode_format",
        route: "/audit",
        query: "/audit Future BIR/taxpayer position assertion",
        checks: [
          { type: "schema" },
          { type: "future_runtime_assertion", status: "pending", positionCategory: "future" }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-07b-005-future-"));
  const fixturePath = join(dir, "future.fixture.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

  const report = runEvaluation({ fixturePath });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, 1);
  assert.equal(report.summary.pendingChecks, 1);
});

await test("invalid BIR/taxpayer position fixture shape still fails validation", () => {
  const validation = validateEvaluationFixture({
    version: "phase-7b-005-invalid",
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

await test("CLI exits zero for the Phase 7B-005 BIR vs taxpayer position fixture", () => {
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

console.log(`\nPATCH-07B-005 BIR vs taxpayer position fixture tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
