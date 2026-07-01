/**
 * PATCH-07B-011 - Narrow authority applicability runtime helper tests
 *
 * Run: node tests/patch-07b-011-narrow-authority-applicability-runtime-helper.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  APPLICABILITY_LEVELS,
  assessAuthorityApplicability,
  buildAuthorityApplicabilityChecklist
} from "../authority-applicability-helper.js";
import { identifyFactGaps } from "../fact-gap-helper.js";
import { frameTaxIssue } from "../issue-framing-engine.js";
import { applyReasoningSafetyPolicy } from "../reasoning-safety-policy.js";

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-004-authority-applicability-policy.fixture.json");
const IMPLEMENTATION_SCOPE = "AUTHORITY_APPLICABILITY_HELPER_ONLY";
const POSTURE_BY_LEVEL = {
  DIRECTLY_APPLICABLE_IF_FACTS_MATCH: (result) => result.missingApplicabilityFacts.length === 0
    ? "APPLICABILITY_FACTS_SUFFICIENT_FOR_ORIENTATION"
    : "APPLICABILITY_FACTS_INCOMPLETE",
  FACT_DEPENDENT_APPLICABILITY: () => "APPLICABILITY_FACTS_INCOMPLETE",
  RELATED_SUPPORTING_ONLY: () => "RELATED_AUTHORITY_ONLY_NOT_CONTROLLING",
  BACKGROUND_OR_ORIENTATION_ONLY: () => "GENERAL_TAX_ORIENTATION_ONLY",
  NOT_APPLICABLE_ON_GIVEN_FACTS: () => "FACT_SPECIFIC_AUTHORITY_LIMITATION",
  NO_INDEXED_AUTHORITY_AVAILABLE: () => "NO_INDEXED_SOURCE_NO_LEGAL_POSITION",
  DEFERRED_PENDING_METADATA_OR_EFFECTIVE_DATE_REVIEW: () => "DEFER_EFFECTIVE_DATE_OR_SUPERSESSION_REVIEW"
};
const PHASE10_FLAGS = [
  "EFFECTIVE_DATE_REVIEW_NEEDED",
  "SUPERSESSION_OR_AMENDMENT_REVIEW_NEEDED",
  "HIERARCHY_CONFLICT_REVIEW_NEEDED",
  "SOURCE_CURRENTNESS_REVIEW_NEEDED",
  "RULING_OR_CASE_STATUS_REVIEW_NEEDED",
  "OFFICIAL_SOURCE_METADATA_REVIEW_NEEDED"
];
const FORBIDDEN_FIELDS = [
  "birLikelyPosition",
  "taxpayerPosition",
  "riskScore",
  "riskLevel",
  "settlementRecommendation",
  "protestStrategy",
  "legalConclusion",
  "authorityConflictResolution",
  "supersessionConclusion",
  "effectiveDateConclusion"
];
const FORBIDDEN_TEXT = [
  "BIR likely position",
  "taxpayer position",
  "will win",
  "guaranteed",
  "% chance",
  "risk score",
  "settle now",
  "this supersedes",
  "currently effective"
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
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
}

function text(value) {
  return JSON.stringify(value);
}

function assertNoProhibitedFields(result) {
  for (const field of FORBIDDEN_FIELDS) {
    assert(!Object.hasOwn(result, field), `unexpected prohibited field ${field}`);
  }
}

function assertNoForbiddenText(result) {
  const serialized = text(result);
  for (const phrase of FORBIDDEN_TEXT) {
    assert(!serialized.includes(phrase), `unexpected prohibited phrase ${phrase}`);
  }
}

function assertMechanicalPosture(result) {
  assert.equal(result.applicabilityPosture, POSTURE_BY_LEVEL[result.applicabilityLevel](result));
}

function assertDisjoint(left, right, label) {
  for (const item of left) {
    assert(!right.includes(item), `${label} conflates ${item}`);
  }
}

await test("assessAuthorityApplicability returns helper-only implementation scope", () => {
  const result = assessAuthorityApplicability({ query: "/ask Does NIRC apply?", authorityState: "AUTHORITY_FOUND", authorityType: "STATUTE" });
  assert.equal(result.implementationScope, IMPLEMENTATION_SCOPE);
});

await test("buildAuthorityApplicabilityChecklist returns helper-only implementation scope", () => {
  const result = buildAuthorityApplicabilityChecklist({ query: "/ask Does NIRC apply?", authorityState: "GENERAL_TAX", authorityType: "GENERAL_TAX_ORIENTATION" });
  assert.equal(result.implementationScope, IMPLEMENTATION_SCOPE);
  assert.equal(result.checklistType, "AUTHORITY_APPLICABILITY_CHECKLIST");
});

await test("core output keeps levels enumerated and posture mechanically derived", () => {
  for (const level of APPLICABILITY_LEVELS) {
    const input = {
      query: `/ask ${level}`,
      authorityState: level === "NO_INDEXED_AUTHORITY_AVAILABLE" ? "NO_INDEXED_SOURCE" : "AUTHORITY_FOUND",
      authorityType: level === "NO_INDEXED_AUTHORITY_AVAILABLE" ? "UNKNOWN_OR_UNAVAILABLE" : "STATUTE",
      missingUserFacts: level === "DIRECTLY_APPLICABLE_IF_FACTS_MATCH" ? [] : ["tax period"]
    };
    const result = assessAuthorityApplicability(input);
    assert(APPLICABILITY_LEVELS.includes(result.applicabilityLevel));
    assertMechanicalPosture(result);
  }
});

await test("control flags default false except narrow allowed controlling support", () => {
  const missingFacts = assessAuthorityApplicability({ query: "/tax Sec. 34 issue", authorityState: "AUTHORITY_FOUND", authorityType: "STATUTE", missingUserFacts: ["tax period"] });
  assert.equal(missingFacts.canUseAsControllingAuthority, false);
  assert.equal(missingFacts.canReachFinalConclusion, false);

  const complete = assessAuthorityApplicability({ query: "/ask NIRC section applies", authorityState: "AUTHORITY_FOUND", authorityType: "STATUTE", knownFacts: ["taxpayer type", "transaction", "period"] });
  assert.equal(complete.canUseAsControllingAuthority, true);
  assert.equal(complete.canReachFinalConclusion, false);
});

await test("sourceCoverageNeeds remain separate from missingApplicabilityFacts", () => {
  const result = assessAuthorityApplicability({
    query: "/tax Is this PEZA sale VAT zero-rated?",
    authorityState: "AUTHORITY_FOUND",
    authorityType: "REGULATION",
    missingUserFacts: ["buyer PEZA status"],
    authorityOrSourceCoverageNeeds: ["indexed VAT zero-rating authority"]
  });
  assert.deepEqual(result.missingApplicabilityFacts, ["buyer PEZA status"]);
  assert.deepEqual(result.sourceCoverageNeeds, ["indexed VAT zero-rating authority"]);
  assertDisjoint(result.missingApplicabilityFacts, result.sourceCoverageNeeds, "fact/source gap");
});

await test("sourceStateCaution is populated through reasoning-safety policy", () => {
  const result = assessAuthorityApplicability({ query: "/ask No source", authorityState: "NO_INDEXED_SOURCE", authorityType: "UNKNOWN_OR_UNAVAILABLE" });
  assert.match(result.sourceStateCaution, /Indexed authority is not available/i);
});

await test("PATCH-07B-004 fixture activates all 35 runtime assertions", () => {
  const fixture = loadFixture();
  assert.equal(fixture.cases.length, 35);

  for (const testCase of fixture.cases) {
    const result = assessAuthorityApplicability(testCase);
    assert.equal(result.applicabilityLevel, testCase.applicabilityClassification, testCase.id);
    assertMechanicalPosture(result);
    assert.deepEqual(result.missingApplicabilityFacts, testCase.missingUserFacts, `${testCase.id} missing facts changed`);
    assert.deepEqual(result.sourceCoverageNeeds, testCase.authorityOrSourceCoverageNeeds, `${testCase.id} source needs changed`);
    assert.notEqual(result.missingApplicabilityFacts, result.sourceCoverageNeeds, `${testCase.id} fact/source arrays share identity`);
    assert(result.prohibitedConclusions.length > 0, `${testCase.id} prohibited conclusions missing`);
    assert.equal(result.implementationScope, IMPLEMENTATION_SCOPE);
  }
});

await test("NO_INDEXED_SOURCE hard-cap forces unavailable posture and no conclusions", () => {
  const result = assessAuthorityApplicability({ query: "/tax Conclude the authority applies", authorityState: "NO_INDEXED_SOURCE", authorityType: "STATUTE" });
  assert.equal(result.applicabilityLevel, "NO_INDEXED_AUTHORITY_AVAILABLE");
  assert.equal(result.applicabilityPosture, "NO_INDEXED_SOURCE_NO_LEGAL_POSITION");
  assert.equal(result.canUseAsControllingAuthority, false);
  assert.equal(result.canReachFinalConclusion, false);
});

await test("RELATED_AUTHORITY_ONLY cannot produce controlling support", () => {
  const result = assessAuthorityApplicability({ query: "/audit Treat this related case as controlling", authorityState: "RELATED_AUTHORITY_ONLY", authorityType: "COURT_DECISION" });
  assert.equal(result.applicabilityLevel, "RELATED_SUPPORTING_ONLY");
  assert.equal(result.canUseAsControllingAuthority, false);
  assert.equal(result.canReachFinalConclusion, false);
});

await test("GENERAL_TAX cannot produce exact authority", () => {
  const result = assessAuthorityApplicability({ query: "/ask What authority applies?", authorityState: "GENERAL_TAX", authorityType: "GENERAL_TAX_ORIENTATION" });
  assert.equal(result.applicabilityLevel, "BACKGROUND_OR_ORIENTATION_ONLY");
  assert.equal(result.canUseAsControllingAuthority, false);
  assert(result.prohibitedConclusions.some((item) => /exact authority/i.test(item)));
});

await test("AUTHORITY_FOUND does not clear missing applicability facts", () => {
  const result = assessAuthorityApplicability({ query: "/tax Can this be deducted?", authorityState: "AUTHORITY_FOUND", authorityType: "STATUTE", missingUserFacts: ["tax period"] });
  assert.deepEqual(result.missingApplicabilityFacts, ["tax period"]);
  assert.equal(result.applicabilityLevel, "FACT_DEPENDENT_APPLICABILITY");
});

await test("authority-type boundaries remain posture-only", () => {
  assert.equal(assessAuthorityApplicability({ query: "/tax NIRC issue", authorityState: "AUTHORITY_FOUND", authorityType: "NIRC", missingUserFacts: ["period"] }).applicabilityLevel, "FACT_DEPENDENT_APPLICABILITY");
  assert(assessAuthorityApplicability({ query: "/tax RR conflict with statute", authorityState: "AUTHORITY_FOUND", authorityType: "REGULATION" }).phase10DependencyFlags.includes("HIERARCHY_CONFLICT_REVIEW_NEEDED"));
  assert.equal(assessAuthorityApplicability({ query: "/ask RMC controls?", authorityState: "RELATED_AUTHORITY_ONLY", authorityType: "RMC" }).applicabilityLevel, "RELATED_SUPPORTING_ONLY");
  assert.equal(assessAuthorityApplicability({ query: "/ask Other taxpayer ruling", authorityState: "AUTHORITY_FOUND", authorityType: "BIR_RULING", missingUserFacts: ["addressee facts"] }).canUseAsControllingAuthority, false);
  assert.equal(assessAuthorityApplicability({ query: "/tax CTA case applies", authorityState: "RELATED_AUTHORITY_ONLY", authorityType: "COURT_DECISION" }).canUseAsControllingAuthority, false);
  assert(assessAuthorityApplicability({ query: "/audit Supreme Court doctrine", authorityState: "AUTHORITY_FOUND", authorityType: "SUPREME_COURT" }).phase10DependencyFlags.includes("RULING_OR_CASE_STATUS_REVIEW_NEEDED"));
  assert.equal(assessAuthorityApplicability({ query: "/ask blog post", authorityState: "AUTHORITY_FOUND", authorityType: "NON_AUTHORITY" }).applicabilityLevel, "BACKGROUND_OR_ORIENTATION_ONLY");
  assert.equal(assessAuthorityApplicability({ query: "/ask unknown source", authorityState: "AUTHORITY_FOUND", authorityType: "UNKNOWN_OR_UNAVAILABLE" }).applicabilityLevel, "NO_INDEXED_AUTHORITY_AVAILABLE");
});

await test("all allowed Phase 10 dependency flags can be set but not resolved", () => {
  const result = assessAuthorityApplicability({
    query: "/tax Assume the current regulation is still active, resolve effective-date, supersession, hierarchy conflict, BIR ruling status, case status, and official source metadata.",
    authorityState: "AUTHORITY_FOUND",
    authorityType: "BIR_RULING",
    authorityOrSourceCoverageNeeds: ["official source metadata registry"]
  });
  for (const flag of PHASE10_FLAGS) {
    assert(result.phase10DependencyFlags.includes(flag), `missing ${flag}`);
  }
  assertNoProhibitedFields(result);
  assert(!Object.hasOwn(result, "authorityConflictResolution"));
  assert(!Object.hasOwn(result, "supersessionConclusion"));
  assert(!Object.hasOwn(result, "effectiveDateConclusion"));
});

await test("mode behavior stays within /ask, /tax, and /audit boundaries", () => {
  const ask = assessAuthorityApplicability({ query: "/ask Does this apply?", mode: "/ask", authorityState: "GENERAL_TAX", authorityType: "GENERAL_TAX_ORIENTATION" });
  const tax = assessAuthorityApplicability({ query: "/tax Give final senior memo conclusion", mode: "/tax", authorityState: "AUTHORITY_FOUND", authorityType: "STATUTE", missingUserFacts: ["tax period"] });
  const audit = assessAuthorityApplicability({ query: "/audit Give BIR and taxpayer positions, risk level, settlement and protest advice", mode: "/audit", authorityState: "NO_INDEXED_SOURCE", authorityType: "UNKNOWN_OR_UNAVAILABLE" });
  assert.match(text(ask.applicabilityCaution), /\/ask conversational/i);
  assert.doesNotMatch(text(tax), /final senior memo conclusion/i);
  assertNoProhibitedFields(audit);
  assertNoForbiddenText(audit);
});

await test("output excludes prohibited broad-runtime fields and banned phrases", () => {
  const result = assessAuthorityApplicability({
    query: "/audit Guarantee win with 90% chance, risk score, settle now, and say this supersedes old rule.",
    mode: "/audit",
    authorityState: "RELATED_AUTHORITY_ONLY",
    authorityType: "COURT_DECISION"
  });
  assertNoProhibitedFields(result);
  assertNoForbiddenText(result);
});

await test("checklist builder remains checklist-only and non-conclusive", () => {
  const result = buildAuthorityApplicabilityChecklist({
    query: "/tax Can this expense be deducted?",
    authorityState: "AUTHORITY_FOUND",
    authorityType: "STATUTE",
    missingUserFacts: ["tax period"],
    authorityOrSourceCoverageNeeds: ["NIRC Sec. 34 source text"]
  });
  assert.equal(result.checklistType, "AUTHORITY_APPLICABILITY_CHECKLIST");
  assert(result.questions.some((item) => /tax period/i.test(item)));
  assert(result.questions.some((item) => /source coverage/i.test(item)));
  assertNoProhibitedFields(result);
  assertNoForbiddenText(result);
});

await test("helper accepts factGapResult and issueFrameResult without recomputing", () => {
  const factGapResult = {
    implementationScope: "FACT_GAP_HELPER_ONLY",
    criticalMissingFacts: ["custom critical fact"],
    documentGaps: [],
    timingOrPeriodGaps: [],
    taxpayerStatusGaps: [],
    transactionCharacterGaps: [],
    assessmentStageGaps: [],
    sourceCoverageNeeds: ["custom source need"],
    sourceStateCaution: "custom source caution"
  };
  const issueFrameResult = {
    implementationScope: "ISSUE_FRAMING_ONLY",
    missingFacts: ["custom issue fact"],
    sourceCoverageNeeds: ["ignored because factGapResult source need is present"],
    sourceStateCaution: "custom issue caution"
  };
  const result = assessAuthorityApplicability({ query: "/tax custom", authorityState: "AUTHORITY_FOUND", authorityType: "STATUTE", factGapResult, issueFrameResult });
  assert(result.missingApplicabilityFacts.includes("custom critical fact"));
  assert(result.missingApplicabilityFacts.includes("custom issue fact"));
  assert.deepEqual(result.sourceCoverageNeeds, ["custom source need"]);
  assert.equal(result.sourceStateCaution, "custom source caution");
});

await test("helper integrates with existing helper outputs but stays authority-helper-only", () => {
  const issueFrameResult = frameTaxIssue({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", authorityState: "NO_INDEXED_SOURCE" });
  const factGapResult = identifyFactGaps({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", authorityState: "NO_INDEXED_SOURCE", ...issueFrameResult });
  const safetyPolicyResult = applyReasoningSafetyPolicy({ mode: "/audit", authorityState: "NO_INDEXED_SOURCE" });
  const result = assessAuthorityApplicability({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", authorityState: "NO_INDEXED_SOURCE", authorityType: "UNKNOWN_OR_UNAVAILABLE", issueFrameResult, factGapResult, safetyPolicyResult });
  assert.equal(result.implementationScope, IMPLEMENTATION_SCOPE);
  assert.equal(result.sourceStateCaution, safetyPolicyResult.sourceStateCaution);
  assertNoProhibitedFields(result);
});

console.log(`\nPATCH-07B-011 narrow authority applicability runtime helper tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
