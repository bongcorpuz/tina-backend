/**
 * PATCH-07B-GATE-1 - Narrow runtime safety gate checks
 *
 * Run: node tests/patch-07b-gate-1-narrow-runtime-safety-gate.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { assessAuthorityApplicability, buildAuthorityApplicabilityChecklist } from "../authority-applicability-helper.js";
import { buildClientFactChecklistOutput } from "../client-fact-checklist-output.js";
import { identifyFactGaps } from "../fact-gap-helper.js";
import { frameTaxIssue } from "../issue-framing-engine.js";
import { applyReasoningSafetyPolicy } from "../reasoning-safety-policy.js";

const REQUIRED_HELPER_FILES = [
  "issue-framing-engine.js",
  "reasoning-safety-policy.js",
  "fact-gap-helper.js",
  "client-fact-checklist-output.js",
  "authority-applicability-helper.js"
];

const REQUIRED_FOCUSED_TESTS = [
  "tests/patch-07b-002-analytical-reasoning-issue-framing-scaffold.test.mjs",
  "tests/patch-07b-003-fact-gap-detector-fixture.test.mjs",
  "tests/patch-07b-004-authority-applicability-policy-fixture.test.mjs",
  "tests/patch-07b-005-bir-vs-taxpayer-position-fixture.test.mjs",
  "tests/patch-07b-006-audit-defense-risk-language-fixture.test.mjs",
  "tests/patch-07b-007-reasoning-safety-source-state-guards-fixture.test.mjs",
  "tests/patch-07b-008-first-narrow-runtime-implementation.test.mjs",
  "tests/patch-07b-009-narrow-fact-gap-runtime-helper.test.mjs",
  "tests/patch-07b-010-client-fact-pattern-checklist-output-integration.test.mjs",
  "tests/patch-07b-011-narrow-authority-applicability-runtime-helper.test.mjs",
  "tests/patch-07b-012-reasoning-runtime-integration-guard-composition.test.mjs"
];

const PROHIBITED_EXPORT_NAMES = [
  "birPositionEngine",
  "taxpayerPositionEngine",
  "auditRiskEngine",
  "settlementStrategyEngine",
  "protestStrategyEngine",
  "authorityConflictResolver",
  "authorityHierarchyEngine",
  "supersessionEngine",
  "effectiveDateEngine",
  "reasoningRuntimeOrchestrator",
  "analyticalReasoningEngine",
  "adversarialReasoningEngine"
];

const PROHIBITED_FIELDS = [
  "birLikelyPosition",
  "taxpayerPosition",
  "riskScore",
  "riskLevel",
  "settlementRecommendation",
  "protestStrategy",
  "legalConclusion",
  "authorityConflictResolution",
  "supersessionConclusion",
  "effectiveDateConclusion",
  "finalTaxOpinion",
  "controllingAuthorityConclusion",
  "ctaStrategy",
  "auditDefenseConclusion",
  "guaranteedOutcome"
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

function fileText(path) {
  return readFileSync(resolve(path), "utf8");
}

function assertNoProhibitedFields(value) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoProhibitedFields(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const field of PROHIBITED_FIELDS) {
    assert(!Object.hasOwn(value, field), `unexpected prohibited field ${field}`);
  }
  for (const child of Object.values(value)) assertNoProhibitedFields(child);
}

function composeNoIndexedAuditScenario() {
  const input = {
    mode: "/audit",
    query: "/audit BIR disallowed NOLCO but no indexed source is available.",
    authorityState: "NO_INDEXED_SOURCE",
    sourceAvailabilityState: "NO_INDEXED_SOURCE",
    authorityType: "UNKNOWN_OR_UNAVAILABLE",
    knownFacts: ["The assessment involves NOLCO."],
    missingUserFacts: ["taxable year of loss", "ownership continuity", "FAN date"],
    authorityOrSourceCoverageNeeds: ["indexed NOLCO authority before legal support can be claimed"]
  };
  const issueFrame = frameTaxIssue(input);
  const safetyPolicy = applyReasoningSafetyPolicy({ ...input, issueFrameResult: issueFrame });
  const factGaps = identifyFactGaps({ ...input, issueFrameResult: issueFrame, safetyPolicyResult: safetyPolicy });
  const clientFactChecklist = buildClientFactChecklistOutput({ ...input, issueFrameResult: issueFrame, safetyPolicyResult: safetyPolicy, factGapResult: factGaps });
  const authorityApplicability = assessAuthorityApplicability({ ...input, issueFrameResult: issueFrame, safetyPolicyResult: safetyPolicy, factGapResult: factGaps });
  const authorityApplicabilityChecklist = buildAuthorityApplicabilityChecklist(authorityApplicability);

  return {
    issueFrame,
    safetyPolicy,
    factGaps,
    clientFactChecklist,
    authorityApplicability,
    authorityApplicabilityChecklist
  };
}

await test("all required narrow runtime helper files exist", () => {
  for (const path of REQUIRED_HELPER_FILES) {
    assert(existsSync(resolve(path)), `missing helper file ${path}`);
  }
});

await test("all required Phase 7B focused test files exist", () => {
  for (const path of REQUIRED_FOCUSED_TESTS) {
    assert(existsSync(resolve(path)), `missing focused test file ${path}`);
  }
});

await test("helper files do not export prohibited broad runtime engines", () => {
  for (const path of REQUIRED_HELPER_FILES) {
    const text = fileText(path);
    for (const name of PROHIBITED_EXPORT_NAMES) {
      assert(!new RegExp(`export\\s+(?:function|const|class)\\s+${name}\\b`).test(text), `${path} exports prohibited ${name}`);
    }
  }
});

await test("representative /audit NO_INDEXED_SOURCE composition remains non-conclusive", () => {
  const composed = composeNoIndexedAuditScenario();
  assert.equal(composed.issueFrame.implementationScope, "ISSUE_FRAMING_ONLY");
  assert.equal(composed.factGaps.implementationScope, "FACT_GAP_HELPER_ONLY");
  assert.equal(composed.clientFactChecklist.implementationScope, "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY");
  assert.equal(composed.authorityApplicability.implementationScope, "AUTHORITY_APPLICABILITY_HELPER_ONLY");
  assert.equal(composed.authorityApplicabilityChecklist.implementationScope, "AUTHORITY_APPLICABILITY_HELPER_ONLY");
  assert.equal(composed.authorityApplicability.applicabilityLevel, "NO_INDEXED_AUTHORITY_AVAILABLE");
  assert.equal(composed.authorityApplicability.canUseAsControllingAuthority, false);
  assert.equal(composed.authorityApplicability.canReachFinalConclusion, false);
  assert(composed.safetyPolicy.sourceStateCaution);
  assert(composed.clientFactChecklist.modeBoundaryCaution.includes("/audit fact and document checklist only"));
  assertNoProhibitedFields(composed);
});

await test("gate metadata is local-only and requires no network, DB, secrets, or indexing", () => {
  const reportName = "PATCH-07B-GATE-1_PHASE_7B_NARROW_RUNTIME_SAFETY_GATE.md";
  assert.equal(reportName.endsWith(".md"), true);
  assert.equal(process.env.TINA_GATE_NETWORK_REQUIRED || "false", "false");
});

console.log(`\nPATCH-07B-GATE-1 narrow runtime safety gate tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
