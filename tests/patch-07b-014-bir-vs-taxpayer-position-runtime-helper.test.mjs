/**
 * PATCH-07B-014 - BIR vs taxpayer position runtime helper tests
 *
 * Run: node tests/patch-07b-014-bir-vs-taxpayer-position-runtime-helper.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assessBirTaxpayerPositions,
  buildPositionFramingChecklist
} from "../bir-vs-taxpayer-position-helper.js";
import { assertAdversarialSafety } from "../adversarial-content-safety-policy.js";

const SCOPE = "BIR_TAXPAYER_POSITION_HELPER_ONLY";
const FIXTURE_005 = resolve("evaluation", "fixtures", "phase-7b-005-bir-vs-taxpayer-position.fixture.json");
const FIXTURE_006 = resolve("evaluation", "fixtures", "phase-7b-006-audit-defense-risk-language.fixture.json");
const FIXTURE_007 = resolve("evaluation", "fixtures", "phase-7b-007-reasoning-safety-source-state-guards.fixture.json");

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

function loadFixture(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function flattenStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(flattenStrings);
  return [];
}

function serialize(value) {
  return JSON.stringify(value);
}

function commonPrecomputed(input = {}) {
  const authorityState = input.authorityState || "AUTHORITY_FOUND";
  return {
    issueFrameResult: {
      issueFamily: input.issueFamily || "CWT_FORM_2307",
      taxType: input.taxType || "CWT",
      knownFacts: input.knownFacts || ["taxpayer type", "taxable period", "transaction type", "amount"],
      missingFacts: input.missingUserFacts || [],
      sourceCoverageNeeds: input.sourceCoverageNeeds || input.authorityOrSourceCoverageNeeds || [],
      sourceStateCaution: null,
      implementationScope: "ISSUE_FRAMING_ONLY"
    },
    safetyPolicyResult: {
      safetyPosture: authorityState === "GENERAL_TAX" ? "GENERAL_TAX_ORIENTATION_ONLY" : "ALLOW_ISSUE_FRAMING_WITH_CAUTION",
      requiredCaution: [],
      prohibitedBehaviors: [],
      modeBoundary: "Preserve mode boundary.",
      sourceStateCaution: null
    },
    factGapResult: {
      issueFamily: input.issueFamily || "CWT_FORM_2307",
      taxType: input.taxType || "CWT",
      knownFacts: input.knownFacts || ["taxpayer type", "taxable period", "transaction type", "amount"],
      criticalMissingFacts: input.missingUserFacts || [],
      helpfulMissingFacts: [],
      documentGaps: input.requiredDocuments || [],
      timingOrPeriodGaps: [],
      taxpayerStatusGaps: [],
      transactionCharacterGaps: [],
      assessmentStageGaps: input.assessmentStage ? [] : [],
      sourceCoverageNeeds: input.sourceCoverageNeeds || input.authorityOrSourceCoverageNeeds || [],
      sourceStateCaution: null,
      implementationScope: "FACT_GAP_HELPER_ONLY",
      mode: input.mode || "/tax"
    },
    clientFactChecklistResult: {
      checklistType: "CLIENT_FACT_PATTERN_CHECKLIST",
      documentRequests: input.requiredDocuments || [],
      sourceCoverageNeeds: input.sourceCoverageNeeds || input.authorityOrSourceCoverageNeeds || [],
      sourceStateCaution: null,
      implementationScope: "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY"
    },
    authorityApplicabilityResult: {
      implementationScope: "AUTHORITY_APPLICABILITY_HELPER_ONLY",
      authorityState,
      sourceAvailabilityState: authorityState,
      applicabilityCaution: [],
      missingApplicabilityFacts: input.missingUserFacts || [],
      sourceCoverageNeeds: input.sourceCoverageNeeds || input.authorityOrSourceCoverageNeeds || [],
      sourceStateCaution: null,
      phase10DependencyFlags: input.phase10DependencyFlags || [],
      canReachFinalConclusion: false
    }
  };
}

function helperInput(overrides = {}) {
  const input = {
    mode: "/tax",
    query: "/tax Can the client defend a CWT mismatch?",
    authorityState: "AUTHORITY_FOUND",
    sourceAvailabilityState: "AUTHORITY_FOUND",
    authorityType: "REGULATION",
    issueFamily: "CWT_FORM_2307",
    taxType: "CWT",
    knownFacts: ["taxpayer type corporate", "taxable period 2024", "transaction type CWT mismatch", "amount material"],
    providedDocuments: ["Form 2307 provided but not yet verified"],
    missingUserFacts: [],
    requiredDocuments: [],
    sourceCoverageNeeds: [],
    documentsComplete: true,
    requiredDocumentsSatisfied: true,
    ...overrides
  };
  return { ...input, ...commonPrecomputed(input) };
}

function assertHardFalse(output) {
  assert.equal(output.implementationScope, SCOPE);
  assert.equal(output.canReachFinalConclusion, false);
  assert.equal(output.canScoreRisk, false);
  assert.equal(output.canRecommendSettlement, false);
}

function assertNoProhibitedRuntimeFields(output) {
  const text = serialize(output);
  for (const field of [
    "riskScore",
    "riskLevel",
    "winProbability",
    "exposureComputation",
    "settlementRecommendation",
    "protestStrategy",
    "ctaStrategy",
    "compromiseAmount",
    "legalConclusion"
  ]) {
    assert(!new RegExp(`"${field}"\\s*:`).test(text), `unexpected field ${field}`);
  }
}

function assertNoUnsafeText(output) {
  for (const phrase of flattenStrings(output)) {
    if (/^\s*Do not\b/i.test(phrase)) continue;
    assert.doesNotMatch(phrase, /\bBIR will win\b|\btaxpayer will win\b|\bassessment is void\b|\bBIR has no case\b/i);
    assert.doesNotMatch(phrase, /\b\d+(?:\.\d+)?\s*%\s*(?:chance|probability|odds|likelihood)?\b/i);
    assert.doesNotMatch(phrase, /\bsettle now\b|\bignore BIR\b/i);
  }
}

function assertSafeOutput(output, authorityState = "AUTHORITY_FOUND") {
  assert.equal(output.adversarialSafety.finalAssertion.safe, true, output.adversarialSafety.finalAssertion.violations?.join("; "));
  assert.equal(assertAdversarialSafety(output.birPositionFraming || {}, { authorityState }).safe, true);
  assert.equal(assertAdversarialSafety(output.taxpayerPositionFraming || {}, { authorityState }).safe, true);
}

await test("core exports, implementation scope, and hard false capabilities are present", () => {
  assert.equal(typeof assessBirTaxpayerPositions, "function");
  assert.equal(typeof buildPositionFramingChecklist, "function");
  for (const authorityState of ["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"]) {
    const output = assessBirTaxpayerPositions(helperInput({ authorityState, sourceAvailabilityState: authorityState }));
    assertHardFalse(output);
  }
});

await test("source imports mandatory adversarial safety functions directly", () => {
  const source = readFileSync(resolve("bir-vs-taxpayer-position-helper.js"), "utf8");
  assert.match(source, /applyAdversarialContentSafetyPolicy/);
  assert.match(source, /sanitizeAdversarialText/);
  assert.match(source, /assertAdversarialSafety/);
});

await test("safety policy integration sanitizes unsafe generated/input strings and asserts output", () => {
  const output = assessBirTaxpayerPositions(helperInput({
    strongestSupport: ["BIR will win"],
    weakestFactsOrDocuments: ["taxpayer will win"],
    providedDocuments: ["assessment is void document"]
  }));
  assert(output.adversarialSafety);
  assert.equal(output.adversarialSafety.sanitizedGeneratedStrings, true);
  assertSafeOutput(output);
  assertNoUnsafeText(output);
});

await test("NO_INDEXED_SOURCE blocks all BIR and taxpayer position text", () => {
  const output = assessBirTaxpayerPositions(helperInput({
    authorityState: "NO_INDEXED_SOURCE",
    sourceAvailabilityState: "NO_INDEXED_SOURCE"
  }));
  assert.equal(output.controversyPosture, "NO_INDEXED_SOURCE_NO_POSITION_FRAMING");
  assert.equal(output.birPositionFraming, null);
  assert.equal(output.taxpayerPositionFraming, null);
  assert.equal(output.canFramePositions, false);
  assert.match(output.sourceStateCaution, /blocked|not available/i);
  assert(output.prohibitedConclusions.some((item) => /direct authority support|unavailable indexed sources/i.test(item)));
  assertSafeOutput(output, "NO_INDEXED_SOURCE");
});

await test("GENERAL_TAX remains orientation only without exact authority or specific positions", () => {
  const output = assessBirTaxpayerPositions(helperInput({
    authorityState: "GENERAL_TAX",
    sourceAvailabilityState: "GENERAL_TAX"
  }));
  assert.equal(output.controversyPosture, "GENERAL_ORIENTATION_ONLY");
  assert.equal(output.birPositionFraming, null);
  assert.equal(output.taxpayerPositionFraming, null);
  assert.equal(output.canFramePositions, false);
  assert.match(output.sourceStateCaution, /General tax orientation/i);
  assertSafeOutput(output, "GENERAL_TAX");
});

await test("RELATED_AUTHORITY_ONLY allows only limited illustrative conditional framing", () => {
  const output = assessBirTaxpayerPositions(helperInput({
    authorityState: "RELATED_AUTHORITY_ONLY",
    sourceAvailabilityState: "RELATED_AUTHORITY_ONLY",
    authorityOrSourceCoverageNeeds: ["direct authority needed before stronger support can be claimed"]
  }));
  assert.equal(output.controversyPosture, "RELATED_AUTHORITY_ONLY_LIMITED_POSITION_FRAMING");
  assert.equal(output.canFramePositions, true);
  assert.match(output.birPositionFraming.possibleBirTheory, /possible BIR-side theory|may frame/i);
  assert.match(output.taxpayerPositionFraming.possibleTaxpayerDefense, /possible taxpayer-side defense|may argue/i);
  assert.doesNotMatch(serialize(output), /\bcontrolling authority\b/i);
  assertSafeOutput(output, "RELATED_AUTHORITY_ONLY");
});

await test("AUTHORITY_FOUND with sufficient inputs allows cautious framing only", () => {
  const output = assessBirTaxpayerPositions(helperInput());
  assert.equal(output.controversyPosture, "POSITION_FRAMING_ALLOWED_WITH_CAUTION");
  assert.equal(output.canFramePositions, true);
  assert(output.birPositionFraming);
  assert(output.taxpayerPositionFraming);
  assert.match(output.birPositionFraming.possibleBirTheory, /\bmay\b|possible/i);
  assert.match(output.taxpayerPositionFraming.possibleTaxpayerDefense, /\bmay\b|possible/i);
  assert(output.birPositionFraming.weaknessesInBirPosition.length > 0);
  assert(output.taxpayerPositionFraming.weaknessesInTaxpayerPosition.length > 0);
  assertNoProhibitedRuntimeFields(output);
  assertSafeOutput(output);
});

await test("AUTHORITY_FOUND does not override missing facts or documents", () => {
  const output = assessBirTaxpayerPositions(helperInput({
    missingUserFacts: ["tax period", "specific mismatch"],
    requiredDocuments: ["Form 2307 needed to support position"]
  }));
  assert.equal(output.controversyPosture, "FACTS_OR_DOCUMENTS_INSUFFICIENT_FOR_POSITION_FRAMING");
  assert.equal(output.canFramePositions, false);
  assert.equal(output.birPositionFraming, null);
  assert.equal(output.taxpayerPositionFraming, null);
  assert(output.missingCriticalFacts.includes("tax period"));
  assert(output.requiredDocuments.some((item) => /Form 2307/i.test(item)));
});

await test("/audit with missing LOA/PAN/FAN/FDDA stage blocks framing and avoids strategy/conclusion language", () => {
  const output = assessBirTaxpayerPositions(helperInput({
    mode: "/audit",
    query: "/audit Analyze assessment but LOA PAN FAN FDDA details are missing.",
    missingUserFacts: ["LOA date", "PAN/FAN/FDDA status", "assessment stage"],
    requiredDocuments: ["assessment notices needed to support position"]
  }));
  assert.equal(output.controversyPosture, "PROCEDURAL_STAGE_NEEDED_BEFORE_POSITION_FRAMING");
  assert.equal(output.canFramePositions, false);
  assert.match(output.proceduralPosture, /LOA|PAN\/FAN\/FDDA|assessment stage/i);
  assertNoUnsafeText(output);
  assertNoProhibitedRuntimeFields(output);
});

await test("BIR framing shape is conditional and document cautious", () => {
  const { birPositionFraming } = assessBirTaxpayerPositions(helperInput());
  assert(birPositionFraming.possibleBirTheory);
  assert.equal(Array.isArray(birPositionFraming.requiredFactsForBirTheory), true);
  assert.equal(Array.isArray(birPositionFraming.documentsBirWouldLikelyRequest), true);
  assert(birPositionFraming.weaknessesInBirPosition.length > 0);
  assert.match(birPositionFraming.possibleBirTheory, /BIR may|possible BIR-side/i);
  assert.doesNotMatch(birPositionFraming.possibleBirTheory, /BIR will win|BIR is correct|valid assessment/i);
  assert(serialize(birPositionFraming).includes("needed") || serialize(birPositionFraming).includes("not assumed verified"));
});

await test("taxpayer framing shape is conditional and document cautious", () => {
  const { taxpayerPositionFraming } = assessBirTaxpayerPositions(helperInput());
  assert(taxpayerPositionFraming.possibleTaxpayerDefense);
  assert.equal(Array.isArray(taxpayerPositionFraming.requiredFactsForDefense), true);
  assert.equal(Array.isArray(taxpayerPositionFraming.documentsNeededToSupportDefense), true);
  assert(taxpayerPositionFraming.weaknessesInTaxpayerPosition.length > 0);
  assert.match(taxpayerPositionFraming.possibleTaxpayerDefense, /Taxpayer may|possible taxpayer-side/i);
  assert.doesNotMatch(taxpayerPositionFraming.possibleTaxpayerDefense, /taxpayer will win|assessment is void|BIR has no case/i);
});

await test("strongest support and weakest facts are paired or corrected", () => {
  const output = assessBirTaxpayerPositions(helperInput({
    strongestSupport: ["reconciled Form 2307 package"],
    weakestFactsOrDocuments: []
  }));
  assert(output.strongestSupport.length > 0);
  assert(output.weakestFactsOrDocuments.length > 0);
  assert.match(output.weakestFactsOrDocuments.join(" "), /weaknesses must be identified/i);
});

await test("Phase 10 flags pass through and do not become conclusions", () => {
  const flags = [
    "EFFECTIVE_DATE_REVIEW_NEEDED",
    "SUPERSESSION_OR_AMENDMENT_REVIEW_NEEDED",
    "HIERARCHY_CONFLICT_REVIEW_NEEDED",
    "SOURCE_CURRENTNESS_REVIEW_NEEDED"
  ];
  const output = assessBirTaxpayerPositions(helperInput({ phase10DependencyFlags: flags }));
  assert.equal(output.controversyPosture, "PHASE10_REVIEW_NEEDED_BEFORE_POSITION_FRAMING");
  assert.deepEqual(output.phase10DependencyFlags, flags);
  assert.doesNotMatch(serialize(output), /effective date is|this supersedes|hierarchy is resolved|currently effective/i);
  assertSafeOutput(output);
});

await test("PATCH-07B-005 fixture activation respects authority, source, facts, documents, and no outcomes", () => {
  const fixture = loadFixture(FIXTURE_005);
  assert(fixture.cases.length >= 38);
  for (const testCase of fixture.cases) {
    const output = assessBirTaxpayerPositions(helperInput({
      mode: testCase.mode,
      query: testCase.query,
      authorityState: testCase.authorityState,
      sourceAvailabilityState: testCase.sourceAvailabilityState,
      knownFacts: testCase.knownFacts,
      missingUserFacts: testCase.missingUserFacts,
      requiredDocuments: testCase.requiredDocuments,
      sourceCoverageNeeds: testCase.authorityOrSourceCoverageNeeds,
      strongestSupport: testCase.strongestTaxpayerSupport,
      weakestFactsOrDocuments: testCase.weakestTaxpayerFactsOrDocuments
    }));
    assertHardFalse(output);
    assertNoUnsafeText(output);
    if (testCase.authorityState === "NO_INDEXED_SOURCE") assert.equal(output.canFramePositions, false);
    if (testCase.authorityState === "GENERAL_TAX") assert.equal(output.controversyPosture, "GENERAL_ORIENTATION_ONLY");
    if (output.canFramePositions) {
      assert(output.birPositionFraming.weaknessesInBirPosition.length > 0);
      assert(output.taxpayerPositionFraming.weaknessesInTaxpayerPosition.length > 0);
    }
  }
});

await test("PATCH-07B-006 fixture activation keeps numeric risk, win probability, settlement, and protest out", () => {
  const fixture = loadFixture(FIXTURE_006);
  assert(fixture.cases.length >= 40);
  for (const testCase of fixture.cases) {
    const output = assessBirTaxpayerPositions(helperInput({
      mode: testCase.mode,
      query: testCase.query,
      authorityState: testCase.authorityState,
      sourceAvailabilityState: testCase.sourceAvailabilityState,
      knownFacts: testCase.knownFacts,
      missingUserFacts: testCase.missingUserFacts,
      sourceCoverageNeeds: testCase.authorityOrSourceCoverageNeeds
    }));
    assertNoProhibitedRuntimeFields(output);
    assertNoUnsafeText(output);
  }
});

await test("PATCH-07B-007 source-state fixture boundaries are preserved", () => {
  const fixture = loadFixture(FIXTURE_007);
  const states = new Set();
  for (const testCase of fixture.cases) {
    states.add(testCase.authorityState);
    const output = assessBirTaxpayerPositions(helperInput({
      mode: testCase.mode,
      query: testCase.query,
      authorityState: testCase.authorityState,
      sourceAvailabilityState: testCase.sourceAvailabilityState,
      missingUserFacts: testCase.missingUserFacts,
      sourceCoverageNeeds: testCase.authorityOrSourceCoverageNeeds
    }));
    if (testCase.authorityState === "NO_INDEXED_SOURCE") assert.equal(output.controversyPosture, "NO_INDEXED_SOURCE_NO_POSITION_FRAMING");
    if (testCase.authorityState === "GENERAL_TAX") assert.equal(output.controversyPosture, "GENERAL_ORIENTATION_ONLY");
    if (testCase.authorityState === "RELATED_AUTHORITY_ONLY") assert.notEqual(output.controversyPosture, "NO_INDEXED_SOURCE_NO_POSITION_FRAMING");
    assert.equal(output.adversarialSafety.finalAssertion.safe, true);
  }
  for (const required of ["NO_INDEXED_SOURCE", "GENERAL_TAX", "RELATED_AUTHORITY_ONLY", "AUTHORITY_FOUND"]) {
    assert(states.has(required), `missing fixture authority state ${required}`);
  }
});

await test("checklist builder returns checklist output without conclusions, scoring, or strategy", () => {
  const checklist = buildPositionFramingChecklist(helperInput({
    missingUserFacts: ["tax period"],
    requiredDocuments: ["Form 2307 needed to support position"],
    sourceCoverageNeeds: ["direct CWT authority needed"]
  }));
  assert.equal(checklist.checklistType, "BIR_TAXPAYER_POSITION_FRAMING_CHECKLIST");
  assert.equal(checklist.implementationScope, SCOPE);
  assert(checklist.factsNeeded.includes("tax period"));
  assert(checklist.documentsNeeded.some((item) => /Form 2307/i.test(item)));
  assert(checklist.authorityCautions.length > 0);
  assert(checklist.sourceCoverageNeeds.some((item) => /direct CWT authority/i.test(item)));
  assertHardFalse(checklist);
  assertNoProhibitedRuntimeFields(checklist);
  assert.equal(checklist.adversarialSafety.finalAssertion.safe, true);
});

console.log(`\nPATCH-07B-014 BIR vs taxpayer position runtime helper tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
