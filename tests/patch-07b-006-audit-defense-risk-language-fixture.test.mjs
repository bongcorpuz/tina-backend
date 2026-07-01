/**
 * PATCH-07B-006 - Audit-defense risk-language fixture and tests
 *
 * Run: node tests/patch-07b-006-audit-defense-risk-language-fixture.test.mjs
 *
 * Verifies the offline Phase 7B-006 fixture without runtime audit-defense,
 * risk-language, settlement, exposure scoring, document sufficiency, procedural
 * defect, BIR-position, taxpayer-position, retrieval, DB/vector store, OpenAI,
 * staging, prompt, source-card, or sourceAvailability implementation changes.
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

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-006-audit-defense-risk-language.fixture.json");

const REQUIRED_RISK_LANGUAGE_CATEGORIES = [
  "ewt_withholding_deficiency_risk_language",
  "cwt_form_2307_disallowance_risk_language",
  "vat_zero_rating_risk_language",
  "input_vat_invoice_mismatch_risk_language",
  "deductibility_substantiation_risk_language",
  "reimbursable_pass_through_billing_risk_language",
  "loa_pan_fan_fdda_procedural_risk_language",
  "prescription_assessment_timing_risk_language",
  "nolco_disallowance_risk_language",
  "authority_state_risk_language_behavior",
  "settlement_protest_posture_risk_language",
  "policy_first_non_engine_risk_language"
];

const REQUIRED_MODES = ["/ask", "/tax", "/audit"];
const REQUIRED_AUTHORITY_STATES = ["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"];
const ALLOWED_AUTHORITY_STRENGTHS = [
  "STRONG_DIRECT_AUTHORITY",
  "MODERATE_DIRECT_AUTHORITY",
  "RELATED_OR_SUPPORTING_ONLY",
  "GENERAL_BACKGROUND_ONLY",
  "NO_INDEXED_AUTHORITY",
  "UNKNOWN_PENDING_SOURCE_REVIEW"
];
const ALLOWED_FACT_STRENGTHS = [
  "STRONG_FACT_SUPPORT",
  "PARTIAL_FACT_SUPPORT",
  "WEAK_FACT_SUPPORT",
  "UNKNOWN_FACT_SUPPORT"
];
const ALLOWED_DOCUMENT_STRENGTHS = [
  "STRONG_DOCUMENT_SUPPORT",
  "PARTIAL_DOCUMENT_SUPPORT",
  "WEAK_DOCUMENT_SUPPORT",
  "NO_DOCUMENT_SUPPORT",
  "UNKNOWN_DOCUMENT_SUPPORT"
];
const ALLOWED_PROCEDURAL_STRENGTHS = [
  "STRONG_PROCEDURAL_DEFENSE",
  "POSSIBLE_PROCEDURAL_DEFENSE",
  "WEAK_PROCEDURAL_DEFENSE",
  "NO_PROCEDURAL_DEFENSE_IDENTIFIED",
  "UNKNOWN_PROCEDURAL_POSTURE"
];
const ALLOWED_RISK_LEVEL_POLICIES = ["LOW", "MODERATE", "HIGH", "CRITICAL", "UNKNOWN_INSUFFICIENT_FACTS"];
const ALLOWED_UNCERTAINTY_LEVEL_POLICIES = [
  "LOW_UNCERTAINTY",
  "MODERATE_UNCERTAINTY",
  "HIGH_UNCERTAINTY",
  "UNKNOWN_DUE_TO_MISSING_FACTS_OR_SOURCES"
];
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
  "authorityStrength",
  "factStrength",
  "documentStrength",
  "proceduralStrength",
  "riskLevelPolicy",
  "uncertaintyLevelPolicy",
  "exposureIndicators",
  "conditionsThatMayLowerRisk",
  "conditionsThatMayIncreaseRisk",
  "conditionsThatMakeRiskUnknown",
  "settlementOrProtestPosture",
  "recommendedImmediateNextStep",
  "prohibitedRiskLanguage",
  "prohibitedOutcomeClaim",
  "prohibitedNumericScoring",
  "noGuaranteedOutcomePolicy",
  "noHiddenWeaknessPolicy",
  "authorityStatePolicy",
  "sourceCoverageGapPolicy",
  "factGapPolicy",
  "applicabilityPolicy",
  "phase7aSafeguardsToPreserve",
  "modeBoundaryPolicy",
  "phase10DependencyPolicy",
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
    testCase.id,
    testCase.name,
    testCase.riskLanguageCategory,
    testCase.expectedIssueFamily,
    testCase.taxType,
    testCase.assessmentContext,
    testCase.authorityState,
    testCase.sourceAvailabilityState,
    ...asArray(testCase.knownFacts),
    ...asArray(testCase.missingUserFacts),
    ...asArray(testCase.authorityOrSourceCoverageNeeds),
    testCase.authorityStrength,
    testCase.factStrength,
    testCase.documentStrength,
    testCase.proceduralStrength,
    testCase.riskLevelPolicy,
    testCase.uncertaintyLevelPolicy,
    ...asArray(testCase.exposureIndicators),
    ...asArray(testCase.conditionsThatMayLowerRisk),
    ...asArray(testCase.conditionsThatMayIncreaseRisk),
    ...asArray(testCase.conditionsThatMakeRiskUnknown),
    testCase.settlementOrProtestPosture,
    testCase.recommendedImmediateNextStep,
    testCase.prohibitedRiskLanguage,
    testCase.prohibitedOutcomeClaim,
    testCase.prohibitedNumericScoring,
    testCase.noGuaranteedOutcomePolicy,
    testCase.noHiddenWeaknessPolicy,
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

function casesByRiskLanguageCategory(fixture, category) {
  return fixture.cases.filter((testCase) => testCase.riskLanguageCategory === category);
}

function futureCheck(testCase) {
  return testCase.checks.find((check) => check.type === "future_runtime_assertion");
}

await test("Phase 7B-006 fixture loads and validates with the local evaluation runner", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.fixtureId, "phase-7b-006-audit-defense-risk-language");
  assert.equal(fixture.patch, "PATCH-07B-006");
  assert.equal(fixture.phase, "Phase 7B");
  assert.equal(fixture.scaffoldType, "audit_defense_risk_language_policy");
  assert.match(fixture.objective, /offline fixture coverage|risk-language policy|risk computation/i);
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
  assert(fixture.buildsOn.includes("PATCH-07B-005"), "buildsOn must include PATCH-07B-005");
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
  assert(groups.related_authority.length >= 1);
  assert(groups.unavailable_source.length >= 1);
});

await test("required audit-defense risk-language categories exist with minimum coverage", () => {
  const fixture = loadFixture();
  const categories = new Set(fixture.cases.map((testCase) => testCase.riskLanguageCategory));

  assert(fixture.cases.length >= 40, "fixture must include at least 40 cases");
  assertIncludesAll([...categories], REQUIRED_RISK_LANGUAGE_CATEGORIES, "audit-defense risk-language category coverage");

  for (const category of REQUIRED_RISK_LANGUAGE_CATEGORIES) {
    assert(casesByRiskLanguageCategory(fixture, category).length >= 1, `${category} coverage too low`);
  }

  for (const category of REQUIRED_RISK_LANGUAGE_CATEGORIES.slice(0, 9)) {
    assert(casesByRiskLanguageCategory(fixture, category).length >= 3, `${category} must have at least 3 cases`);
  }
  assert(casesByRiskLanguageCategory(fixture, "authority_state_risk_language_behavior").length >= 4);
  assert(casesByRiskLanguageCategory(fixture, "settlement_protest_posture_risk_language").length >= 4);
  assert(casesByRiskLanguageCategory(fixture, "policy_first_non_engine_risk_language").length >= 6);
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

await test("risk-language policy enum fields use only allowed values", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert(ALLOWED_AUTHORITY_STRENGTHS.includes(testCase.authorityStrength), `${testCase.id} unsupported authorityStrength`);
    assert(ALLOWED_FACT_STRENGTHS.includes(testCase.factStrength), `${testCase.id} unsupported factStrength`);
    assert(ALLOWED_DOCUMENT_STRENGTHS.includes(testCase.documentStrength), `${testCase.id} unsupported documentStrength`);
    assert(ALLOWED_PROCEDURAL_STRENGTHS.includes(testCase.proceduralStrength), `${testCase.id} unsupported proceduralStrength`);
    assert(ALLOWED_RISK_LEVEL_POLICIES.includes(testCase.riskLevelPolicy), `${testCase.id} unsupported riskLevelPolicy`);
    assert(ALLOWED_UNCERTAINTY_LEVEL_POLICIES.includes(testCase.uncertaintyLevelPolicy), `${testCase.id} unsupported uncertaintyLevelPolicy`);
    assert(ALLOWED_SETTLEMENT_OR_PROTEST_POSTURES.includes(testCase.settlementOrProtestPosture), `${testCase.id} unsupported settlementOrProtestPosture`);
  }
});

await test("every case includes required audit-defense risk-language fields and pending checks", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.equal(typeof testCase.id, "string");
    assert.equal(typeof testCase.name, "string");
    assert.equal(typeof testCase.category, "string");
    assert.equal(typeof testCase.riskLanguageCategory, "string");
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
  const sourceNeedPattern = /authority|source|NIRC|RR|RMC|RMO|case|ruling|metadata|coverage|provision|regulation|registry|indexed|currentness|official/i;

  for (const testCase of fixture.cases) {
    assert(Array.isArray(testCase.missingUserFacts));
    assert(Array.isArray(testCase.authorityOrSourceCoverageNeeds));
    assert.notEqual(testCase.missingUserFacts, testCase.authorityOrSourceCoverageNeeds);
    assert.notDeepEqual(testCase.missingUserFacts, testCase.authorityOrSourceCoverageNeeds, `${testCase.id} conflates user facts and source needs`);
    assert(testCase.authorityOrSourceCoverageNeeds.some((need) => sourceNeedPattern.test(need)), `${testCase.id} lacks authority/source coverage need`);
    assert(!testCase.missingUserFacts.some((fact) => /source coverage|indexed source|Phase 10|metadata|live acquisition/i.test(fact)), `${testCase.id} puts source gap in missingUserFacts`);
  }
});

await test("exposure indicators remain qualitative and do not require numeric scoring", () => {
  const fixture = loadFixture();
  const numericRequiredPattern = /score\s*[:=]\s*\d|risk score\s+is\s+\d|exposure score\s+is\s+\d|mandatory numeric|required numeric|exact exposure score required/i;

  for (const testCase of fixture.cases) {
    assert(Array.isArray(testCase.exposureIndicators));
    assert(!numericRequiredPattern.test(asText(testCase.exposureIndicators)), `${testCase.id} appears to require numeric exposure scoring`);
    assert.match(asText(testCase.exposureIndicators), /no numeric exposure score required|numeric exposure score deferred|qualitative/i, `${testCase.id} must keep exposure qualitative`);
    assert.match(testCase.prohibitedNumericScoring, /Do not|prohibited|numeric|score|percentage|probability|odds/i, `${testCase.id} must populate prohibitedNumericScoring`);
  }
});

await test("no case guarantees taxpayer win or BIR win", () => {
  const fixture = loadFixture();
  const guaranteePattern = /\b(?:will|must|shall|guaranteed to)\s+(?:win|prevail|succeed|be cancelled|be sustained|lose)\b/i;

  for (const testCase of fixture.cases) {
    assert(!guaranteePattern.test(testCase.prohibitedRiskLanguage), `${testCase.id} prohibitedRiskLanguage accidentally guarantees outcome`);
    assert.match(testCase.noGuaranteedOutcomePolicy, /No guaranteed|does not guarantee|not guarantee|Guaranteed outcome.*prohibited|No .*guaranteed/i, `${testCase.id} lacks no-guarantee policy`);
    assert.match(testCase.prohibitedOutcomeClaim, /Do not|guarantee|prohibited|Do not say/i, `${testCase.id} lacks prohibited outcome claim`);
  }
});

await test("no case hides weak documents or weak facts", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.match(testCase.noHiddenWeaknessPolicy, /disclos|surface|visible|stated|identified|prohibited|must be/i, `${testCase.id} lacks no-hidden-weakness policy`);
    assert(!/hide weak|omit weak|suppress weak/i.test(testCase.recommendedImmediateNextStep), `${testCase.id} recommends hiding weakness`);
  }
});

await test("settlement/protest posture never recommends ignoring BIR", () => {
  const fixture = loadFixture();
  const affirmativeIgnorePattern = /\b(?:ignore BIR|do not respond to BIR|skip BIR notice|disregard BIR)\b/i;
  const protectiveDoNotIgnorePattern = /\b(?:do not|don't|never)\s+(?:ignore|disregard|skip)/i;

  for (const testCase of fixture.cases) {
    const postureText = testCase.settlementOrProtestPosture;
    const nextStepText = testCase.recommendedImmediateNextStep;
    assert(!affirmativeIgnorePattern.test(postureText) || protectiveDoNotIgnorePattern.test(postureText), `${testCase.id} posture recommends ignoring BIR`);
    assert(!affirmativeIgnorePattern.test(nextStepText) || protectiveDoNotIgnorePattern.test(nextStepText), `${testCase.id} next step recommends ignoring BIR`);
  }
});

await test("RELATED_AUTHORITY_ONLY cases do not use direct authority strength or low-risk language", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.authorityState === "RELATED_AUTHORITY_ONLY");

  assert(cases.length >= 6);
  for (const testCase of cases) {
    assert.notEqual(testCase.authorityStrength, "STRONG_DIRECT_AUTHORITY");
    assert.notEqual(testCase.riskLevelPolicy, "LOW");
    assert.match(combinedText(testCase), /related|supporting|not controlling|direct authority gap|cannot support direct|cannot be treated as controlling/i);
  }
});

await test("NO_INDEXED_SOURCE cases do not use direct authority strength or fabricated low-risk support", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.authorityState === "NO_INDEXED_SOURCE");

  assert(cases.length >= 2);
  for (const testCase of cases) {
    assert.equal(testCase.authorityStrength, "NO_INDEXED_AUTHORITY");
    assert.notEqual(testCase.riskLevelPolicy, "LOW");
    assert.match(combinedText(testCase), /no indexed|NO_INDEXED_SOURCE|not fabricate|without indexed|source gap|cannot claim legal strength/i);
  }
});

await test("GENERAL_TAX cases remain general orientation only", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.authorityState === "GENERAL_TAX");

  assert(cases.length >= 5);
  for (const testCase of cases) {
    assert.notEqual(testCase.authorityStrength, "STRONG_DIRECT_AUTHORITY");
    assert.notEqual(testCase.riskLevelPolicy, "LOW");
    assert.match(combinedText(testCase), /orientation|general|not exact|GENERAL_TAX remains|general tax/i);
  }
});

await test("AUTHORITY_FOUND cases do not automatically create LOW risk if facts or documents are weak", () => {
  const fixture = loadFixture();
  const weakCases = fixture.cases.filter((testCase) => (
    testCase.authorityState === "AUTHORITY_FOUND" &&
    ["WEAK_FACT_SUPPORT", "UNKNOWN_FACT_SUPPORT"].includes(testCase.factStrength) ||
    testCase.authorityState === "AUTHORITY_FOUND" &&
    ["WEAK_DOCUMENT_SUPPORT", "NO_DOCUMENT_SUPPORT", "UNKNOWN_DOCUMENT_SUPPORT"].includes(testCase.documentStrength)
  ));

  assert(weakCases.length >= 4);
  for (const testCase of weakCases) {
    assert.notEqual(testCase.riskLevelPolicy, "LOW", `${testCase.id} incorrectly makes weak facts/documents low risk`);
    assert.match(combinedText(testCase), /does not override|does not overcome|weak|missing|documents|facts/i);
  }
});

await test("effective-date, supersession, and metadata issues keep Phase 10 dependency policy", () => {
  const fixture = loadFixture();
  const metadataCases = fixture.cases.filter((testCase) => /effective-date|effective date|supersession|currentness|metadata|source governance|period rules|hierarchy/i.test(combinedText(testCase)));

  assert(metadataCases.length >= 4);
  for (const testCase of metadataCases) {
    assert(Object.hasOwn(testCase, "phase10DependencyPolicy"), `${testCase.id}.phase10DependencyPolicy missing`);
    assert.match(testCase.phase10DependencyPolicy, /Phase 10/i, `${testCase.id} must defer metadata/source-governance work to Phase 10`);
  }
});

await test("policy-first non-engine cases prohibit numeric scoring, bias, hidden weakness, related overclaim, and guaranteed outcome", () => {
  const fixture = loadFixture();
  const cases = casesByRiskLanguageCategory(fixture, "policy_first_non_engine_risk_language");

  assert(cases.length >= 6);
  assert.equal(fixture.implementationReady, false);
  assert.equal(fixture.runtimeImplementation, false);
  assert(cases.some((testCase) => /numeric chance|chance of winning|win probability|95%/i.test(testCase.query) || /numeric chance/i.test(combinedText(testCase))));
  assert(cases.some((testCase) => /exact exposure score|Score the exposure/i.test(testCase.query) || /exact exposure/i.test(combinedText(testCase))));
  assert(cases.some((testCase) => /client wants|Client-preferred|client preference/i.test(combinedText(testCase))));
  assert(cases.some((testCase) => /weak documents|hidden weakness|Hidden weakness/i.test(combinedText(testCase))));
  assert(cases.some((testCase) => /related case|related authority.*low|related authority cannot lower risk/i.test(combinedText(testCase))));
  assert(cases.some((testCase) => /BIR has no chance|Guaranteed outcome/i.test(combinedText(testCase))));

  for (const testCase of cases) {
    assert.match(combinedText(testCase), /implementationReady false|runtimeImplementation false|deferred|policy-first|scaffold/i);
    assert.match(testCase.prohibitedRiskLanguage, /Do not|prohibited/i);
    assert.match(testCase.prohibitedNumericScoring, /prohibited|Do not|numeric|score|percentage|probability|odds/i);
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

await test("unsupported future risk-language metadata remains pending, not failed", () => {
  const fixture = {
    version: "phase-7b-006-unsupported-future",
    cases: [
      {
        id: "future-risk-language-check",
        name: "Future risk-language check",
        category: "mode_format",
        route: "/audit",
        query: "/audit Future risk-language assertion",
        checks: [
          { type: "schema" },
          { type: "future_runtime_assertion", status: "pending", riskLanguageCategory: "future" }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-07b-006-future-"));
  const fixturePath = join(dir, "future.fixture.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

  const report = runEvaluation({ fixturePath });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, 1);
  assert.equal(report.summary.pendingChecks, 1);
});

await test("invalid audit-defense risk-language fixture shape still fails validation", () => {
  const validation = validateEvaluationFixture({
    version: "phase-7b-006-invalid",
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

await test("CLI exits zero for the Phase 7B-006 audit-defense risk-language fixture", () => {
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

console.log(`\nPATCH-07B-006 audit-defense risk-language fixture tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
