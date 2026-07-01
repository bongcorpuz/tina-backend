/**
 * PATCH-07A-008 - Source limitation wording and mode-boundary hardening
 *
 * Run: node tests/patch-07a-008-source-limitation-mode-boundary-hardening.test.mjs
 *
 * Verifies the offline Phase 7A-008 hardening fixture and pure renderer
 * heading behavior without live retrieval, DB/vector store, OpenAI, staging,
 * external services, sourceAvailability execution, or source-card selection.
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

import { renderTinaAnswer } from "../answer-renderer.js";

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7a-008-source-limitation-mode-boundary-hardening.fixture.json");

const REQUIRED_HARDENING_CATEGORIES = [
  "related_authority_only_wording_preservation",
  "no_indexed_source_wording_preservation",
  "source_card_authority_status_preservation",
  "ask_mode_boundary_preservation",
  "tax_mode_boundary_preservation",
  "audit_mode_boundary_preservation",
  "safeguard_suppression_wording",
  "cross_mode_contamination"
];

const MIN_HARDENING_COUNTS = {
  related_authority_only_wording_preservation: 3,
  no_indexed_source_wording_preservation: 3,
  source_card_authority_status_preservation: 3,
  ask_mode_boundary_preservation: 3,
  tax_mode_boundary_preservation: 3,
  audit_mode_boundary_preservation: 4,
  safeguard_suppression_wording: 3,
  cross_mode_contamination: 5
};

const REQUIRED_MODES = ["/ask", "/tax", "/audit"];
const REQUIRED_AUTHORITY_STATES = ["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"];
const REQUIRED_CASE_FIELDS = [
  "sourceLimitationRisk",
  "modeBoundaryRisk",
  "expectedSafeBehavior",
  "sourceCardPolicy",
  "applyVerifiedAuthorityGatePolicy",
  "riskLevel",
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

function loadFixture() {
  return loadFixtureFile(FIXTURE_PATH).fixture;
}

function futureCheck(testCase) {
  return testCase.checks.find((check) => check.type === "future_runtime_assertion");
}

function assertIncludesAll(actual, expected, label) {
  for (const value of expected) {
    assert(actual.includes(value), `${label} missing ${value}`);
  }
}

function casesByHardeningCategory(fixture, category) {
  return fixture.cases.filter((testCase) => testCase.hardeningCategory === category);
}

function combinedText(testCase) {
  return [
    testCase.sourceLimitationRisk,
    testCase.modeBoundaryRisk,
    testCase.expectedSafeBehavior,
    ...(testCase.requiredWordingPolicies || []),
    ...(testCase.forbiddenWording || []),
    ...(testCase.requiredModeStructure || []),
    ...(testCase.forbiddenModeStructure || []),
    testCase.sourceCardPolicy,
    testCase.applyVerifiedAuthorityGatePolicy,
    testCase.notes
  ].join(" ");
}

function renderQuietly(args) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = () => {};
  console.warn = () => {};
  try {
    return renderTinaAnswer(args);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

await test("Phase 7A-008 fixture loads and validates with the local evaluation runner", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-7a-008");
  assert.equal(fixture.fixtureId, "phase-7a-008-source-limitation-mode-boundary-hardening");
  assert.equal(fixture.patch, "PATCH-07A-008");
  assert.equal(fixture.phase, "Phase 7A");
  assert.equal(validation.ok, true);
  assert.equal(validation.validCases.length, fixture.cases.length);
  assert.equal(validation.invalidCases.length, 0);
  assert.equal(validation.issues.length, 0);
});

await test("top-level fields classify this as local runtime-safe hardening", () => {
  const fixture = loadFixture();

  assert.equal(fixture.runtimeSafe, true);
  assert.equal(fixture.requiresNetwork, false);
  assert.equal(fixture.requiresDb, false);
  assert.equal(fixture.requiresSecrets, false);
  assert.equal(typeof fixture.objective, "string");
  assert.match(fixture.objective, /source limitation wording|mode-boundary|mode boundary/i);
});

await test("fixture uses only existing local evaluation categories", () => {
  const fixture = loadFixture();
  const groups = groupCasesByCategory(fixture.cases);

  for (const category of Object.keys(groups)) {
    assert(EVALUATION_CATEGORIES.includes(category), `unsupported category ${category}`);
  }

  assert(groups.related_authority.length >= 4);
  assert(groups.unavailable_source.length >= 4);
  assert(groups.source_limitation_wording.length >= 4);
  assert(groups.mode_format.length >= 12);
});

await test("required hardening categories exist with minimum coverage", () => {
  const fixture = loadFixture();
  const categories = new Set(fixture.cases.map((testCase) => testCase.hardeningCategory));

  assertIncludesAll([...categories], REQUIRED_HARDENING_CATEGORIES, "hardening category coverage");
  for (const category of REQUIRED_HARDENING_CATEGORIES) {
    assert(casesByHardeningCategory(fixture, category).length >= MIN_HARDENING_COUNTS[category], `${category} coverage too low`);
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

await test("every case has required hardening fields and pending checks", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.equal(typeof testCase.id, "string");
    assert.equal(typeof testCase.name, "string");
    assert.equal(typeof testCase.category, "string");
    assert.equal(typeof testCase.hardeningCategory, "string");
    assert.equal(typeof testCase.query, "string");
    assert(REQUIRED_MODES.includes(testCase.mode));
    assert(REQUIRED_AUTHORITY_STATES.includes(testCase.authorityState));
    assert.equal(testCase.sourceAvailabilityState, testCase.authorityState);

    for (const field of REQUIRED_CASE_FIELDS) {
      assert.equal(typeof testCase[field], "string", `${testCase.id}.${field} must be string`);
      if (field === "riskLevel") {
        assert(["medium", "high", "critical"].includes(testCase[field]), `${testCase.id}.${field} must be a known risk level`);
      } else {
        assert(testCase[field].length > 10, `${testCase.id}.${field} too short`);
      }
    }

    assert(Array.isArray(testCase.requiredWordingPolicies));
    assert(testCase.requiredWordingPolicies.length > 0);
    assert(Array.isArray(testCase.forbiddenWording));
    assert(testCase.forbiddenWording.length > 0);
    assert(Array.isArray(testCase.requiredModeStructure));
    assert(testCase.requiredModeStructure.length > 0);
    assert(Array.isArray(testCase.forbiddenModeStructure));
    assert(testCase.forbiddenModeStructure.length > 0);
    assert(futureCheck(testCase), `${testCase.id} missing future runtime assertion`);
    assert.equal(futureCheck(testCase).status, "pending");
  }
});

await test("RELATED_AUTHORITY_ONLY cases require exact-vs-related distinction", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.authorityState === "RELATED_AUTHORITY_ONLY");

  assert(cases.length >= 10);
  for (const testCase of cases) {
    assert.match(combinedText(testCase), /exact-vs-related|related\/supporting|related authority|related-only/i);
    assert.match(combinedText(testCase), /source limitation|caution|not.*governing|not.*controlling|supporting only/i);
    assert(testCase.forbiddenWording.some((wording) => /governing|controlling|taxpayer will win|guaranteed|controls/i.test(wording)));
  }
});

await test("NO_INDEXED_SOURCE cases require no-fabrication and source-unavailable policy", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.authorityState === "NO_INDEXED_SOURCE");

  assert(cases.length >= 4);
  for (const testCase of cases) {
    assert.match(combinedText(testCase), /No indexed source|source unavailable|no fabricated authority|no source card|fabricated|invented/i);
    assert(testCase.requiredWordingPolicies.some((policy) => /No indexed source|source unavailable|no fabricated authority/i.test(policy)));
    assert.match(testCase.applyVerifiedAuthorityGatePolicy, /suppress|block|NO_INDEXED_SOURCE|citation/i);
  }
});

await test("source-card authority status cases preserve sourceAvailability status", () => {
  const fixture = loadFixture();
  const cases = casesByHardeningCategory(fixture, "source_card_authority_status_preservation");

  assert(cases.length >= 3);
  assert(cases.some((testCase) => testCase.authorityState === "AUTHORITY_FOUND"));
  assert(cases.some((testCase) => testCase.authorityState === "RELATED_AUTHORITY_ONLY"));
  assert(cases.some((testCase) => testCase.authorityState === "NO_INDEXED_SOURCE"));
  for (const testCase of cases) {
    assert.match(testCase.sourceCardPolicy, /source card|card/i);
    assert.match(combinedText(testCase), /sourceAvailability|AUTHORITY_FOUND|RELATED_AUTHORITY_ONLY|NO_INDEXED_SOURCE|exact|related|No indexed source/i);
    assert(testCase.forbiddenWording.some((wording) => /every source card|all cards|displayed card is governing|invented source card|fabricated/i.test(wording)));
  }
});

await test("/ask boundary cases forbid /tax A-F memo and audit matrix as primary structure", () => {
  const fixture = loadFixture();
  const cases = casesByHardeningCategory(fixture, "ask_mode_boundary_preservation");

  assert(cases.length >= 3);
  assert(cases.every((testCase) => testCase.mode === "/ask"));
  for (const testCase of cases) {
    assert.match(combinedText(testCase), /Direct answer|conversational|\/ask/i);
    assert(testCase.forbiddenModeStructure.some((section) => /A\. Short Answer|B\. Governing Authority|BIR Likely Position|Taxpayer Position|audit advisory matrix/i.test(section)));
  }
});

await test("/tax boundary cases require senior memo and forbid casual /ask as primary structure", () => {
  const fixture = loadFixture();
  const cases = casesByHardeningCategory(fixture, "tax_mode_boundary_preservation");

  assert(cases.length >= 3);
  assert(cases.every((testCase) => testCase.mode === "/tax"));
  for (const testCase of cases) {
    assert(testCase.requiredModeStructure.includes("A. Short Answer / Conclusion"));
    assert(testCase.requiredModeStructure.some((section) => /B\. Governing Authority|E\. Caveats|F\. Sources/.test(section)));
    assert(testCase.forbiddenModeStructure.some((section) => /### Direct answer|### Key explanation|BIR Likely Position|Risk Level/i.test(section)));
  }
});

await test("/audit boundary cases require audit advisory structure and forbid guaranteed outcome", () => {
  const fixture = loadFixture();
  const cases = casesByHardeningCategory(fixture, "audit_mode_boundary_preservation");

  assert(cases.length >= 4);
  assert(cases.every((testCase) => testCase.mode === "/audit"));
  for (const testCase of cases) {
    assert(testCase.requiredModeStructure.some((section) => /Quick Assessment/i.test(section)));
    assert(testCase.requiredModeStructure.some((section) => /Risk Level/i.test(section)));
    assert(testCase.requiredModeStructure.some((section) => /Recommended Action/i.test(section)));
    assert.match(combinedText(testCase), /no guaranteed outcome|guarantee|taxpayer will win|risk/i);
  }
});

await test("safeguard suppression cases require limitation and caveat preservation", () => {
  const fixture = loadFixture();
  const cases = casesByHardeningCategory(fixture, "safeguard_suppression_wording");

  assert(cases.length >= 3);
  assertIncludesAll([...new Set(cases.map((testCase) => testCase.mode))], REQUIRED_MODES, "safeguard modes");
  for (const testCase of cases) {
    assert.match(combinedText(testCase), /source limitation|caveats|authority weakness|preserved|Do not obey|Do not hide/i);
    assert(testCase.forbiddenWording.some((wording) => /removed|no caveats|certain|hidden|governing/i.test(wording)));
  }
});

await test("cross-mode contamination cases require active mode preservation", () => {
  const fixture = loadFixture();
  const cases = casesByHardeningCategory(fixture, "cross_mode_contamination");

  assert(cases.length >= 5);
  assertIncludesAll([...new Set(cases.map((testCase) => testCase.mode))], REQUIRED_MODES, "cross-mode modes");
  for (const testCase of cases) {
    assert.match(combinedText(testCase), /active mode preserved|Active .* mode remains primary|mode/i);
    assert(testCase.forbiddenModeStructure.length > 0);
  }
});

await test("no case requires live retrieval, DB, vector, OpenAI, staging, network, or secrets", () => {
  const fixture = loadFixture();
  const forbidden = /\brequires\s+(?:live\s+)?(?:retrieval|db|database|vector|openai|staging|network|secret)|requiresSecrets\s*:\s*true/i;

  assert.equal(fixture.runtimeSafe, true);
  for (const testCase of fixture.cases) {
    assert(!forbidden.test(JSON.stringify(testCase)), `${testCase.id} appears to require live services`);
  }
});

await test("pure renderer checks keep /ask out of /tax and /audit primary headings", () => {
  const rendered = renderQuietly({
    answer: [
      "A. DIRECT ANSWER",
      "Withholding tax is a general concept.",
      "",
      "B. CONTROLLING LEGAL BASIS",
      "Ask for a narrower fact pattern for exact authority."
    ].join("\n"),
    orchestrationMode: "FAST_DEFINITION",
    metadata: { modeFlags: { hook: "/ask", orchestrationMode: "FAST_DEFINITION" } }
  });

  assert(rendered.includes("### Direct answer"));
  assert(rendered.includes("### Key explanation"));
  assert(!rendered.includes("A. Short Answer / Conclusion"));
  assert(!rendered.includes("B. Governing Authority"));
  assert(!rendered.includes("1. Quick Assessment"));
  assert(!rendered.includes("6. Risk Level"));
});

await test("pure renderer checks keep /tax senior memo headings", () => {
  const rendered = renderQuietly({
    answer: "### Direct Answer\nNIRC Sec. 57 applies only when verified.",
    orchestrationMode: "FAST_DEFINITION",
    metadata: { modeFlags: { hook: "/tax", orchestrationMode: "FAST_DEFINITION" } }
  });

  assert(rendered.includes("A. Short Answer / Conclusion"));
  assert(rendered.includes("B. Governing Authority"));
  assert(rendered.includes("E. Caveats / Missing Facts"));
  assert(rendered.includes("F. Sources / Source Cards"));
  assert(!rendered.includes("### Direct answer"));
  assert(!rendered.includes("1. Quick Assessment"));
});

await test("pure renderer checks keep /audit advisory headings and no guarantee", () => {
  const rendered = renderQuietly({
    answer: "A. DIRECT ANSWER\nThe LOA issue may be relevant, but outcome depends on documents and authority.",
    orchestrationMode: "AUDIT",
    metadata: { modeFlags: { hook: "/audit", orchestrationMode: "AUDIT" } }
  });

  assert(rendered.includes("1. Quick Assessment"));
  assert(rendered.includes("4. Documentary Support Needed"));
  assert(rendered.includes("6. Risk Level"));
  assert(rendered.includes("7. Recommended Action"));
  assert(!rendered.includes("A. Short Answer / Conclusion"));
  assert(!rendered.includes("B. Governing Authority"));
  assert(!rendered.includes("### Direct answer"));
});

await test("pending hardening assertions do not fail the evaluation runner", () => {
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

await test("unsupported future hardening metadata remains pending, not failed", () => {
  const fixture = {
    version: "phase-7a-008-unsupported-future",
    cases: [
      {
        id: "future-hardening-check",
        name: "Future hardening check",
        category: "mode_format",
        route: "/ask",
        query: "/ask Remove limitations",
        checks: [
          { type: "schema" },
          { type: "future_runtime_assertion", status: "pending", hardeningCategory: "safeguard_suppression_wording" }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-07a-008-future-"));
  const fixturePath = join(dir, "future.fixture.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

  const report = runEvaluation({ fixturePath });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, 1);
  assert.equal(report.summary.pendingChecks, 1);
});

await test("invalid hardening fixture shape still fails validation", () => {
  const validation = validateEvaluationFixture({
    version: "phase-7a-008-invalid",
    cases: [
      {
        id: "missing-required-fields",
        name: "Missing required fields",
        category: "mode_format",
        route: "/ask",
        checks: [{ type: "schema" }]
      }
    ]
  });

  assert.equal(validation.ok, false);
  assert(validation.issues.some((issue) => issue.field === "query"));
});

await test("CLI exits zero for the Phase 7A-008 hardening fixture", () => {
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

console.log(`\nPATCH-07A-008 source limitation and mode-boundary hardening tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
