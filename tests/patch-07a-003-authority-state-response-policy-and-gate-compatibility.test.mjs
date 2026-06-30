/**
 * PATCH-07A-003 - Authority-state response policy and gate compatibility tests
 *
 * Run: node tests/patch-07a-003-authority-state-response-policy-and-gate-compatibility.test.mjs
 *
 * Verifies the offline Phase 7A authority-state response policy fixture and
 * representative applyVerifiedAuthorityGate compatibility behavior without
 * live API calls, staging credentials, retrieval, reranking, DB/vector store,
 * OpenAI, source-card selection, sourceAvailability execution, prompts,
 * answer templates, ask/tax/audit runtime behavior, route/controller behavior,
 * or pipeline behavior changes.
 */

"use strict";

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { applyVerifiedAuthorityGate } from "../answer-renderer.js";
import {
  EVALUATION_CATEGORIES,
  groupCasesByCategory,
  loadFixtureFile,
  runEvaluation,
  validateEvaluationFixture
} from "../evaluation/runner/evaluation-runner.js";

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7a-003-authority-state-response-policy.fixture.json");
const REQUIRED_AUTHORITY_STATES = ["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"];
const REQUIRED_MODES = ["/ask", "/tax", "/audit"];
const REQUIRED_GENERIC_QUERIES = [
  "tax law",
  "BIR issuance",
  "court case",
  "VAT case",
  "withholding tax case",
  "explain EWT",
  "what is withholding tax"
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

function runGateSilently(args) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = () => {};
  console.warn = () => {};
  try {
    return applyVerifiedAuthorityGate(args);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

await test("Phase 7A-003 fixture loads and validates with the local evaluation runner", () => {
  const { fixturePath, fixture } = loadFixtureFile(FIXTURE_PATH);
  const validation = validateEvaluationFixture(fixture);

  assert.equal(fixturePath, FIXTURE_PATH);
  assert.equal(fixture.version, "phase-7a-003");
  assert.equal(fixture.fixtureId, "phase-7a-003-authority-state-response-policy");
  assert.equal(fixture.patch, "PATCH-07A-003");
  assert.equal(fixture.phase, "Phase 7A");
  assert.equal(validation.ok, true);
  assert.equal(validation.validCases.length, fixture.cases.length);
  assert.equal(validation.invalidCases.length, 0);
  assert.equal(validation.issues.length, 0);
});

await test("top-level runtime safety fields forbid network, DB, and secrets", () => {
  const fixture = loadFixture();

  assert.equal(fixture.runtimeSafe, true);
  assert.equal(fixture.requiresNetwork, false);
  assert.equal(fixture.requiresDb, false);
  assert.equal(fixture.requiresSecrets, false);
  assert.equal(typeof fixture.objective, "string");
  assert(fixture.objective.includes("before /ask conversational runtime formatting changes"));
});

await test("fixture uses only existing local evaluation categories", () => {
  const fixture = loadFixture();
  const groups = groupCasesByCategory(fixture.cases);

  for (const category of Object.keys(groups)) {
    assert(EVALUATION_CATEGORIES.includes(category), `unsupported category ${category}`);
  }

  assert(groups.exact_authority.length >= 1);
  assert(groups.related_authority.length >= 3);
  assert(groups.unavailable_source.length >= 2);
  assert(groups.generic_guard.length >= 2);
  assert(groups.source_limitation_wording.length >= 1);
  assert(groups.mode_format.length >= 1);
});

await test("all cases include required authority-state policy fields", () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.equal(typeof testCase.id, "string");
    assert.equal(typeof testCase.query, "string");
    assert(REQUIRED_MODES.includes(testCase.mode));
    assert(REQUIRED_AUTHORITY_STATES.includes(testCase.authorityState));
    assert.equal(typeof testCase.simulatedAnswerShape, "string");
    assert.equal(typeof testCase.expectedGatePolicy, "string");
    assert(Array.isArray(testCase.requiredPhrases));
    assert(testCase.requiredPhrases.length > 0);
    assert(Array.isArray(testCase.forbiddenPhrases));
    assert(testCase.forbiddenPhrases.length > 0);
    assert.equal(typeof testCase.sourceLimitationPolicy, "string");
    assert.equal(typeof testCase.exactVsRelatedPolicy, "string");
    assert.equal(typeof testCase.noIndexedSourcePolicy, "string");
    assert.equal(typeof testCase.genericGuardPolicy, "string");
    assert.equal(typeof testCase.sourceCardPolicy, "string");
    assert.equal(typeof testCase.risk, "string");
    assert.equal(typeof testCase.notes, "string");
    assert(futureCheck(testCase), `${testCase.id} missing pending future assertion`);
    assert.equal(futureCheck(testCase).status, "pending");
  }
});

await test("authority-state and mode coverage are complete", () => {
  const fixture = loadFixture();
  const states = new Set(fixture.cases.map((testCase) => testCase.authorityState));
  const modes = new Set(fixture.cases.map((testCase) => testCase.mode));

  assertIncludesAll([...states], REQUIRED_AUTHORITY_STATES, "authority-state coverage");
  assertIncludesAll([...modes], REQUIRED_MODES, "mode coverage");
});

await test("RELATED_AUTHORITY_ONLY cases require caution and source limitation policy", () => {
  const fixture = loadFixture();
  const relatedCases = fixture.cases.filter((testCase) => testCase.authorityState === "RELATED_AUTHORITY_ONLY");

  assert(relatedCases.length >= 3);
  for (const testCase of relatedCases) {
    assert.match(testCase.sourceLimitationPolicy, /limitation|not directly located|related/i);
    assert.match(testCase.exactVsRelatedPolicy, /not|cannot|supporting|related/i);
    assert(
      testCase.forbiddenPhrases.some((phrase) => /governing authority is|Controlling Authorities|Primary Authorities/i.test(phrase)),
      `${testCase.id} must forbid governing/controlling phrasing`
    );
  }
});

await test("NO_INDEXED_SOURCE cases require non-fabrication and source unavailable policy", () => {
  const fixture = loadFixture();
  const noSourceCases = fixture.cases.filter((testCase) => testCase.authorityState === "NO_INDEXED_SOURCE");

  assert(noSourceCases.length >= 2);
  for (const testCase of noSourceCases) {
    assert.match(testCase.noIndexedSourcePolicy, /No fabrication|no invented|No source|No indexed/i);
    assert.match(testCase.sourceLimitationPolicy, /No indexed source|source unavailability|not indexed/i);
    assert.match(testCase.sourceCardPolicy, /No source card|No.*fabricated|not.*fabricated/i);
  }
});

await test("GENERAL_TAX and generic guard cases forbid exact authority promotion", () => {
  const fixture = loadFixture();
  const generalCases = fixture.cases.filter((testCase) => testCase.authorityState === "GENERAL_TAX");
  const genericControl = fixture.cases.find((testCase) => testCase.id === "generic-query-tax-law-non-promotion");

  assert(generalCases.length >= 2);
  assert(genericControl);
  assertIncludesAll(genericControl.genericGuardPolicy, REQUIRED_GENERIC_QUERIES, "generic guard family");

  for (const testCase of generalCases) {
    assert.match(testCase.genericGuardPolicy, /non-promotable|No exact|no exact|Generic|generic/i);
    assert(
      testCase.forbiddenPhrases.some((phrase) => /exact|NIRC|RR |RMC|G\.R\.|CTA/i.test(phrase)),
      `${testCase.id} must forbid exact authority promotion`
    );
  }
});

await test("short /ask cases include safety policies", () => {
  const fixture = loadFixture();
  const askCases = fixture.cases.filter((testCase) => testCase.mode === "/ask");

  assert(askCases.length >= 5);
  for (const testCase of askCases) {
    assert.match(testCase.simulatedAnswerShape, /short|generic|exact|related|no_indexed|conversational/i);
    assert.equal(typeof testCase.expectedGatePolicy, "string");
    assert(testCase.expectedGatePolicy.length > 20);
    assert.equal(typeof testCase.sourceLimitationPolicy, "string");
    assert.equal(typeof testCase.sourceCardPolicy, "string");
  }
});

await test("/tax and /audit cases preserve professional structure expectations", () => {
  const fixture = loadFixture();
  const taxCases = fixture.cases.filter((testCase) => testCase.mode === "/tax");
  const auditCases = fixture.cases.filter((testCase) => testCase.mode === "/audit");

  assert(taxCases.length >= 2);
  assert(auditCases.length >= 2);
  assert(taxCases.some((testCase) => testCase.requiredPhrases.some((phrase) => /A\. Short Answer|B\. Governing Authority/i.test(phrase))));
  assert(auditCases.every((testCase) =>
    testCase.requiredPhrases.some((phrase) => /Risk level/i.test(phrase)) ||
    testCase.simulatedAnswerShape.includes("audit_advisory")
  ));
});

await test("applyVerifiedAuthorityGate preserves verified short /ask AUTHORITY_FOUND citations", () => {
  const answer = "RR 2-98 explains expanded withholding tax. In simple terms, it tells withholding agents when to withhold.";
  const result = runGateSilently({
    answer,
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [{ normalizedReference: "RR 2-98", citation: "RR 2-98" }],
    mode: "FAST_DEFINITION",
    route: "/ask"
  });

  assert.equal(result.answer, answer);
  assert.equal(result.leakageBlocked, false);
  assert(result.verifiedAuthorityCount >= 1);
});

await test("applyVerifiedAuthorityGate relabels related-only controlling headings without removing related citations", () => {
  const answer = [
    "Only related authority was located.",
    "",
    "Controlling Authorities:",
    "- RR 16-2005",
    "",
    "Use this only as related guidance."
  ].join("\n");
  const result = runGateSilently({
    answer,
    saeStatus: "RELATED_AUTHORITY_ONLY",
    finalSourceCards: [{ normalizedReference: "RR 16-2005", citation: "RR 16-2005" }],
    route: "/ask"
  });

  assert.equal(result.relabelApplied, true);
  assert(result.answer.includes("Related / Supporting Authorities"));
  assert(!result.answer.includes("Controlling Authorities:"));
  assert(result.answer.includes("RR 16-2005"));
});

await test("applyVerifiedAuthorityGate blocks citation leakage under NO_INDEXED_SOURCE", () => {
  const answer = "No indexed source was located for direct verification.\n\nUnder NIRC Sec. 109, the transaction may be exempt.";
  const result = runGateSilently({
    answer,
    saeStatus: "NO_INDEXED_SOURCE",
    finalSourceCards: [],
    route: "/ask"
  });

  assert.equal(result.leakageBlocked, true);
  assert(!/NIRC Sec\.\s*109/i.test(result.answer));
  assert(result.suppressedCitations.some((citation) => /109/.test(citation)));
});

await test("applyVerifiedAuthorityGate blocks unverified citations even under AUTHORITY_FOUND", () => {
  const answer = "Under NIRC Sec. 57 and RR 2-98, EWT applies.";
  const result = runGateSilently({
    answer,
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [],
    route: "/ask"
  });

  assert.equal(result.leakageBlocked, true);
  assert(!/NIRC Sec\.\s*57|RR 2-98/i.test(result.answer));
  assert(result.suppressedCitations.length >= 2);
});

await test("pending Phase 7A-003 assertions do not fail the evaluation runner", () => {
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

await test("unsupported future compatibility metadata remains pending, not failed", () => {
  const fixture = {
    version: "phase-7a-003-unsupported-future",
    cases: [
      {
        id: "future-gate-compatibility",
        name: "Future gate compatibility check",
        category: "mode_format",
        route: "/ask",
        query: "/ask What is RR 2-98?",
        checks: [
          { type: "schema" },
          {
            type: "future_runtime_assertion",
            authorityState: "AUTHORITY_FOUND",
            simulatedAnswerShape: "short_ask_conversational"
          }
        ]
      }
    ]
  };
  const dir = mkdtempSync(join(tmpdir(), "tina-eval-07a-003-future-"));
  const fixturePath = join(dir, "future.fixture.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

  const report = runEvaluation({ fixturePath });

  assert.equal(report.ok, true);
  assert.equal(report.summary.activeChecks, 1);
  assert.equal(report.summary.pendingChecks, 1);
  assert.equal(report.checks.find((check) => check.type === "future_runtime_assertion").status, "pending");
});

await test("invalid fixture shape still fails validation", () => {
  const invalidFixture = {
    version: "phase-7a-003-invalid",
    cases: [
      {
        id: "bad-authority-state-policy",
        name: "Bad authority state policy",
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

await test("CLI exits zero for the Phase 7A-003 authority-state fixture", () => {
  const result = spawnSync(process.execPath, [
    "evaluation/runner/evaluation-runner.js",
    "--fixture",
    FIXTURE_PATH
  ], { encoding: "utf8" });

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.summary.totalCases, loadFixture().cases.length);
  assert.equal(report.summary.pendingChecks, loadFixture().cases.length);
});

console.log(`\nPATCH-07A-003 authority-state response policy and gate compatibility tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
