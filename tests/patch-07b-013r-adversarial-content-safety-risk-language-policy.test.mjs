/**
 * PATCH-07B-013R - Adversarial content-safety and risk-language policy tests
 *
 * Run: node tests/patch-07b-013r-adversarial-content-safety-risk-language-policy.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  applyAdversarialContentSafetyPolicy,
  assertAdversarialSafety,
  buildAdversarialProhibitedConclusions,
  getAdversarialProhibitedFields,
  getAdversarialProhibitedPatterns,
  sanitizeAdversarialObject,
  sanitizeAdversarialText
} from "../adversarial-content-safety-policy.js";

const SCOPE = "ADVERSARIAL_CONTENT_SAFETY_POLICY_ONLY";
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

function text(value) {
  return Array.isArray(value) ? value.join(" ") : JSON.stringify(value);
}

function assertIncludesPattern(values, pattern, label) {
  assert(values.some((item) => pattern.test(item)), `${label} missing ${pattern}`);
}

function assertUnsafe(value, expectedPattern, options = {}) {
  const result = assertAdversarialSafety(value, options);
  assert.equal(result.safe, false);
  assert.match(text(result.violations), expectedPattern);
}

await test("core exports exist and policy output has required scope and hard false capabilities", () => {
  assert.equal(typeof applyAdversarialContentSafetyPolicy, "function");
  assert.equal(typeof sanitizeAdversarialText, "function");
  assert.equal(typeof buildAdversarialProhibitedConclusions, "function");
  assert.equal(typeof assertAdversarialSafety, "function");
  assert.equal(typeof getAdversarialProhibitedFields, "function");
  assert.equal(typeof getAdversarialProhibitedPatterns, "function");
  assert.equal(typeof sanitizeAdversarialObject, "function");

  const result = applyAdversarialContentSafetyPolicy({ mode: "/audit", authorityState: "AUTHORITY_FOUND" });
  assert.equal(result.implementationScope, SCOPE);
  assert.equal(result.canScoreRisk, false);
  assert.equal(result.canRecommendSettlement, false);
  assert.equal(result.canReachFinalConclusion, false);
});

await test("sanitizeAdversarialText neutralizes BIR will win", () => {
  const result = sanitizeAdversarialText("BIR will win.");
  assert.doesNotMatch(result, /BIR will win/i);
  assert.match(result, /BIR-side argument cannot be stated/i);
});

await test("sanitizeAdversarialText neutralizes taxpayer will win", () => {
  const result = sanitizeAdversarialText("taxpayer will win.");
  assert.doesNotMatch(result, /taxpayer will win/i);
  assert.match(result, /taxpayer-side argument cannot be stated/i);
});

await test("sanitizeAdversarialText neutralizes numeric risk score and percentage chance language", () => {
  const result = sanitizeAdversarialText("risk score is 90% and 95% chance of winning.");
  assert.doesNotMatch(result, /90%|95% chance|risk score is/i);
  assert.match(result, /numeric risk scoring|numeric win probability/i);
});

await test("sanitizeAdversarialText neutralizes settlement, protest, and CTA instruction language", () => {
  assert.match(sanitizeAdversarialText("settle now"), /settlement recommendation is outside/i);
  assert.match(sanitizeAdversarialText("ignore BIR"), /unsafe/i);
  assert.match(sanitizeAdversarialText("file CTA case now"), /CTA strategy is outside/i);
});

await test("sanitizeAdversarialText neutralizes supersession and currentness conclusion language", () => {
  assert.match(sanitizeAdversarialText("this supersedes the old rule"), /Phase 10 review/i);
  assert.match(sanitizeAdversarialText("currently effective"), /source metadata review/i);
});

await test("sanitizeAdversarialText preserves safe cautious language", () => {
  const safe = "BIR-side and taxpayer-side arguments should be framed conditionally after facts and documents are reviewed.";
  assert.equal(sanitizeAdversarialText(safe), safe);
});

await test("sanitizeAdversarialObject sanitizes nested strings deterministically", () => {
  const result = sanitizeAdversarialObject({ nested: { text: "BIR will win and settle now" } });
  assert.doesNotMatch(result.nested.text, /BIR will win|settle now/i);
});

await test("NO_INDEXED_SOURCE prohibits BIR/taxpayer framing and direct legal support", () => {
  const prohibited = buildAdversarialProhibitedConclusions({ authorityState: "NO_INDEXED_SOURCE" });
  assertIncludesPattern(prohibited, /BIR position framing/i, "NO_INDEXED_SOURCE");
  assertIncludesPattern(prohibited, /taxpayer position framing/i, "NO_INDEXED_SOURCE");
  assertIncludesPattern(prohibited, /direct authority support/i, "NO_INDEXED_SOURCE");
  assertIncludesPattern(prohibited, /unavailable indexed sources/i, "NO_INDEXED_SOURCE");

  const policy = applyAdversarialContentSafetyPolicy({ authorityState: "NO_INDEXED_SOURCE" });
  assert.equal(policy.safetyPosture, "NO_INDEXED_SOURCE_NO_ADVERSARIAL_FRAMING");
  assert.equal(policy.canGenerateBirTaxpayerFraming, false);
});

await test("RELATED_AUTHORITY_ONLY prohibits controlling authority", () => {
  const prohibited = buildAdversarialProhibitedConclusions({ authorityState: "RELATED_AUTHORITY_ONLY" });
  assertIncludesPattern(prohibited, /related authority as controlling/i, "RELATED_AUTHORITY_ONLY");
  const policy = applyAdversarialContentSafetyPolicy({ authorityState: "RELATED_AUTHORITY_ONLY" });
  assert.equal(policy.safetyPosture, "RELATED_AUTHORITY_ONLY_LIMITED_ADVERSARIAL_FRAMING");
  assert.equal(policy.canGenerateBirTaxpayerFraming, true);
});

await test("GENERAL_TAX prohibits exact authority and specific BIR/taxpayer position", () => {
  const prohibited = buildAdversarialProhibitedConclusions({ authorityState: "GENERAL_TAX" });
  assertIncludesPattern(prohibited, /exact authority/i, "GENERAL_TAX");
  assertIncludesPattern(prohibited, /specific BIR\/taxpayer legal position/i, "GENERAL_TAX");
  const policy = applyAdversarialContentSafetyPolicy({ authorityState: "GENERAL_TAX" });
  assert.equal(policy.safetyPosture, "GENERAL_ORIENTATION_ONLY_NO_ADVERSARIAL_FRAMING");
  assert.equal(policy.canGenerateBirTaxpayerFraming, false);
});

await test("/audit prohibits risk level, settlement advice, protest strategy, CTA strategy, and unsafe void/win claims", () => {
  const prohibited = buildAdversarialProhibitedConclusions({ mode: "/audit", authorityState: "AUTHORITY_FOUND" });
  assertIncludesPattern(prohibited, /risk level/i, "/audit");
  assertIncludesPattern(prohibited, /settlement advice/i, "/audit");
  assertIncludesPattern(prohibited, /protest strategy/i, "/audit");
  assertIncludesPattern(prohibited, /CTA strategy/i, "/audit");
  assertIncludesPattern(prohibited, /BIR has no case/i, "/audit");
  assertIncludesPattern(prohibited, /taxpayer will win/i, "/audit");
  assertIncludesPattern(prohibited, /assessment is void/i, "/audit");
});

await test("AUTHORITY_FOUND does not override missing facts or required documents", () => {
  const policy = applyAdversarialContentSafetyPolicy({
    authorityState: "AUTHORITY_FOUND",
    missingCriticalFacts: ["tax period"],
    requiredDocuments: ["FAN"]
  });
  assert.equal(policy.safetyPosture, "FACTS_OR_DOCUMENTS_INSUFFICIENT_FOR_ADVERSARIAL_FRAMING");
  assert.equal(policy.canGenerateBirTaxpayerFraming, false);
  assertIncludesPattern(policy.prohibitedConclusions, /AUTHORITY_FOUND override missing facts/i, "AUTHORITY_FOUND");
});

await test("AUTHORITY_FOUND can allow cautious future framing only without missing blockers", () => {
  const policy = applyAdversarialContentSafetyPolicy({
    authorityState: "AUTHORITY_FOUND",
    documentsComplete: true
  });
  assert.equal(policy.safetyPosture, "ADVERSARIAL_FRAMING_ALLOWED_WITH_CAUTION");
  assert.equal(policy.canGenerateBirTaxpayerFraming, true);
});

await test("strongestSupport without weakestFactsOrDocuments triggers caution and violation", () => {
  const policy = applyAdversarialContentSafetyPolicy({ strongestSupport: ["direct authority"] });
  assert(policy.requiredCautions.some((item) => /weaknesses/i.test(item)));
  assertUnsafe({ strongestSupport: ["direct authority"] }, /strongest support/i);
});

await test("birPositionFraming without weaknessesInBirPosition triggers violation", () => {
  assertUnsafe({ birPositionFraming: "BIR may argue disallowance." }, /weaknessesInBirPosition/i, { authorityState: "AUTHORITY_FOUND" });
});

await test("taxpayerPositionFraming without weaknessesInTaxpayerPosition triggers violation", () => {
  assertUnsafe({ taxpayerPositionFraming: "Taxpayer may argue support." }, /weaknessesInTaxpayerPosition/i, { authorityState: "AUTHORITY_FOUND" });
});

await test("strongestSupport with weakestFactsOrDocuments passes hidden-weakness check", () => {
  const result = assertAdversarialSafety({
    strongestSupport: ["direct authority"],
    weakestFactsOrDocuments: ["missing invoice"]
  });
  assert.equal(result.safe, true);
});

await test("riskScore, winProbability, exposureComputation, and compromiseAmount fields are prohibited", () => {
  assertUnsafe({ riskScore: 90 }, /riskScore/);
  assertUnsafe({ winProbability: "80%" }, /winProbability/);
  assertUnsafe({ exposureComputation: "100000" }, /exposureComputation/);
  assertUnsafe({ compromiseAmount: "50000" }, /compromiseAmount/);
});

await test("percentage chance string is prohibited", () => {
  assertUnsafe("95% chance of winning", /percentage chance/i);
});

await test("qualitative policy labels are allowed when not framed as conclusion", () => {
  const result = assertAdversarialSafety({
    riskLevelPolicy: "HIGH",
    note: "Qualitative policy label from fixture only; not a risk conclusion."
  });
  assert.equal(result.safe, true);
});

await test("settlementRecommendation, protestStrategy, and ctaStrategy fields are prohibited", () => {
  assertUnsafe({ settlementRecommendation: "pay" }, /settlementRecommendation/);
  assertUnsafe({ protestStrategy: "file" }, /protestStrategy/);
  assertUnsafe({ ctaStrategy: "petition" }, /ctaStrategy/);
});

await test("settle now string is prohibited", () => {
  assertUnsafe("settle now", /settle now/i);
});

await test("procedural posture label is allowed if non-recommendatory", () => {
  const result = assertAdversarialSafety({
    proceduralPostureLabel: "PAN received; response deadline must be confirmed."
  });
  assert.equal(result.safe, true);
});

await test("letter drafting is prohibited through settlement/protest policy", () => {
  const policy = applyAdversarialContentSafetyPolicy({ mode: "/audit" });
  assert.match(policy.settlementProtestPolicy, /letter drafting.*outside/i);
});

const phase10Cases = [
  ["EFFECTIVE_DATE_REVIEW_NEEDED", "effective date is confirmed", /Phase 10 flag resolved/i],
  ["SUPERSESSION_OR_AMENDMENT_REVIEW_NEEDED", "this supersedes the prior rule", /this supersedes|Phase 10 flag resolved/i],
  ["HIERARCHY_CONFLICT_REVIEW_NEEDED", "hierarchy is resolved", /Phase 10 flag resolved/i],
  ["SOURCE_CURRENTNESS_REVIEW_NEEDED", "currently effective", /currently effective|Phase 10 flag resolved/i],
  ["RULING_OR_CASE_STATUS_REVIEW_NEEDED", "case is final", /Phase 10 flag resolved/i],
  ["OFFICIAL_SOURCE_METADATA_REVIEW_NEEDED", "official source metadata confirms", /Phase 10 flag resolved/i]
];

for (const [flag, unsafe, expected] of phase10Cases) {
  await test(`${flag} blocks Phase 10 conclusion`, () => {
    const policy = applyAdversarialContentSafetyPolicy({ authorityState: "AUTHORITY_FOUND", phase10DependencyFlags: [flag] });
    assert.equal(policy.safetyPosture, "PHASE10_REVIEW_REQUIRED_BEFORE_ADVERSARIAL_FRAMING");
    assert.match(policy.phase10DependencyPolicy, /flags are flags only|cannot be resolved/i);
    assertUnsafe(unsafe, expected, { phase10DependencyFlags: [flag] });
  });
}

await test("PATCH-07B-005 fixture activates no-guarantee, no-hidden-weakness, and no-fabricated-authority policy", () => {
  const fixture = loadFixture(FIXTURE_005);
  assert(fixture.cases.length >= 38);
  for (const testCase of fixture.cases) {
    const prohibited = buildAdversarialProhibitedConclusions(testCase);
    assertIncludesPattern(prohibited, /guarantee taxpayer outcome/i, testCase.id);
    assertIncludesPattern(prohibited, /hide weak facts/i, testCase.id);
    assertIncludesPattern(prohibited, /fabricate authority/i, testCase.id);
    const safety = assertAdversarialSafety({
      strongestTaxpayerSupport: testCase.strongestTaxpayerSupport,
      weakestTaxpayerFactsOrDocuments: testCase.weakestTaxpayerFactsOrDocuments
    });
    assert.equal(safety.safe, true, testCase.id);
  }
});

await test("PATCH-07B-006 fixture activates numeric risk and guaranteed outcome prohibitions", () => {
  const fixture = loadFixture(FIXTURE_006);
  assert(fixture.cases.length >= 40);
  for (const testCase of fixture.cases) {
    const prohibited = buildAdversarialProhibitedConclusions(testCase);
    assertIncludesPattern(prohibited, /numeric or percentage risk score/i, testCase.id);
    assertIncludesPattern(prohibited, /guarantee BIR outcome/i, testCase.id);
    assertIncludesPattern(prohibited, /guarantee taxpayer outcome/i, testCase.id);
    assert.equal(applyAdversarialContentSafetyPolicy(testCase).canScoreRisk, false);
  }
});

await test("PATCH-07B-007 fixture preserves source-state guard behavior", () => {
  const fixture = loadFixture(FIXTURE_007);
  const noIndexed = fixture.cases.filter((testCase) => testCase.authorityState === "NO_INDEXED_SOURCE");
  const related = fixture.cases.filter((testCase) => testCase.authorityState === "RELATED_AUTHORITY_ONLY");
  const general = fixture.cases.filter((testCase) => testCase.authorityState === "GENERAL_TAX");
  assert(noIndexed.length > 0);
  assert(related.length > 0);
  assert(general.length > 0);
  for (const testCase of noIndexed) {
    assert.equal(applyAdversarialContentSafetyPolicy(testCase).safetyPosture, "NO_INDEXED_SOURCE_NO_ADVERSARIAL_FRAMING");
  }
  for (const testCase of related) {
    assert.equal(applyAdversarialContentSafetyPolicy(testCase).safetyPosture, "RELATED_AUTHORITY_ONLY_LIMITED_ADVERSARIAL_FRAMING");
  }
  for (const testCase of general) {
    assert.equal(applyAdversarialContentSafetyPolicy(testCase).safetyPosture, "GENERAL_ORIENTATION_ONLY_NO_ADVERSARIAL_FRAMING");
  }
});

await test("assertAdversarialSafety flags prohibited fields and strings in nested objects", () => {
  assertUnsafe({ a: { b: { riskScore: 4 } } }, /riskScore/);
  assertUnsafe({ a: { b: "taxpayer will win" } }, /taxpayer will win/i);
});

await test("assertAdversarialSafety returns safe true for cautious conditional framing", () => {
  const result = assertAdversarialSafety({
    birPositionFraming: "BIR may argue disallowance if documents do not match.",
    weaknessesInBirPosition: ["facts and authority still need review"],
    taxpayerPositionFraming: "Taxpayer may respond if records reconcile.",
    weaknessesInTaxpayerPosition: ["missing documents remain material"]
  }, { authorityState: "AUTHORITY_FOUND" });
  assert.equal(result.safe, true);
});

await test("birPositionFraming and taxpayerPositionFraming are not globally prohibited when weaknesses are present", () => {
  const result = assertAdversarialSafety({
    birPositionFraming: "BIR may argue disallowance.",
    weaknessesInBirPosition: ["authority applicability is fact-dependent"],
    taxpayerPositionFraming: "Taxpayer may argue support.",
    weaknessesInTaxpayerPosition: ["document gaps remain"]
  }, { authorityState: "AUTHORITY_FOUND" });
  assert.equal(result.safe, true);
});

await test("birPositionFraming and taxpayerPositionFraming are prohibited under NO_INDEXED_SOURCE", () => {
  assertUnsafe({
    birPositionFraming: "BIR may argue disallowance.",
    weaknessesInBirPosition: ["no indexed authority"],
    taxpayerPositionFraming: "Taxpayer may argue support.",
    weaknessesInTaxpayerPosition: ["no indexed authority"]
  }, /birPositionFraming|taxpayerPositionFraming/i, { authorityState: "NO_INDEXED_SOURCE" });
});

await test("birPositionFraming and taxpayerPositionFraming are prohibited under GENERAL_TAX", () => {
  assertUnsafe({
    birPositionFraming: "BIR may argue disallowance.",
    weaknessesInBirPosition: ["general only"],
    taxpayerPositionFraming: "Taxpayer may argue support.",
    weaknessesInTaxpayerPosition: ["general only"]
  }, /birPositionFraming|taxpayerPositionFraming/i, { authorityState: "GENERAL_TAX" });
});

await test("strict safety mode throws on violation", () => {
  assert.throws(() => assertAdversarialSafety({ riskScore: 1 }, { throwOnViolation: true }), /Adversarial safety violation/i);
});

await test("centralized prohibited fields and patterns include required entries", () => {
  const fields = getAdversarialProhibitedFields();
  for (const field of ["riskScore", "riskLevel", "winProbability", "exposureComputation", "compromiseAmount", "litigationStrategy"]) {
    assert(fields.includes(field), `missing ${field}`);
  }
  const patterns = getAdversarialProhibitedPatterns();
  for (const pattern of ["will win", "risk score", "settle now", "currently effective", "BIR has no case"]) {
    assert(patterns.includes(pattern), `missing ${pattern}`);
  }
});

console.log(`\nPATCH-07B-013R adversarial content-safety and risk-language policy tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
