/**
 * PATCH-07B-AUDIT-RISK-HELPER-1 - narrow qualitative audit-risk language helper tests
 *
 * Run: node tests/patch-07b-audit-risk-helper-1-narrow-qualitative-audit-risk-language-helper.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assessQualitativeAuditRisk,
  buildAuditRiskLanguageChecklist
} from "../audit-risk-language-helper.js";
import { assertAdversarialSafety } from "../adversarial-content-safety-policy.js";

const SCOPE = "AUDIT_RISK_LANGUAGE_HELPER_ONLY";
const FIXTURE_006 = resolve("evaluation", "fixtures", "phase-7b-006-audit-defense-risk-language.fixture.json");
const SAFE_CAUTION =
  "Do not treat qualitativeAuditRiskLabel as a numeric score, percentage, probability, exposure computation, or final audit conclusion.";

const PROHIBITED_FIELDS = [
  "riskLevel",
  "riskScore",
  "winProbability",
  "exposureComputation",
  "settlementRecommendation",
  "protestStrategy",
  "ctaStrategy",
  "compromiseAmount",
  "finalLegalConclusion",
  "legalConclusion",
  "finalTaxOpinion",
  "auditDefenseConclusion",
  "litigationStrategy",
  "authorityConflictResolution",
  "hierarchyResolution",
  "supersessionConclusion",
  "effectiveDateConclusion",
  "currentnessConclusion",
  "controllingAuthorityConclusion",
  "guaranteedOutcome"
];

const PROHIBITED_STRINGS = [
  "risk level",
  "risk score",
  "will win",
  "guaranteed",
  "% chance",
  "settle now",
  "ignore BIR",
  "assessment is void",
  "BIR has no case",
  "taxpayer will win",
  "BIR will win",
  "final legal conclusion",
  "final tax opinion",
  "this supersedes",
  "currently effective",
  "controlling authority conclusion"
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

function loadFixture(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function serialize(value) {
  return JSON.stringify(value);
}

function flattenStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(flattenStrings);
  return [];
}

function commonPrecomputed(input = {}) {
  const authorityState = input.authorityState || "AUTHORITY_FOUND";
  const sourceCoverageNeeds = input.sourceCoverageNeeds || input.authorityOrSourceCoverageNeeds || [];
  return {
    issueFrameResult: {
      issueFamily: input.issueFamily || "CWT_FORM_2307",
      taxType: input.taxType || "CWT",
      knownFacts: input.knownFacts || [],
      missingFacts: input.missingUserFacts || [],
      sourceCoverageNeeds,
      sourceStateCaution: null,
      implementationScope: "ISSUE_FRAMING_ONLY"
    },
    safetyPolicyResult: {
      safetyPosture: "ALLOW_ISSUE_FRAMING_WITH_CAUTION",
      requiredCaution: [],
      sourceStateCaution: null
    },
    factGapResult: {
      issueFamily: input.issueFamily || "CWT_FORM_2307",
      taxType: input.taxType || "CWT",
      knownFacts: input.knownFacts || [],
      criticalMissingFacts: input.missingUserFacts || input.missingCriticalFacts || [],
      helpfulMissingFacts: [],
      documentGaps: input.requiredDocuments || input.missingDocuments || [],
      timingOrPeriodGaps: [],
      taxpayerStatusGaps: [],
      transactionCharacterGaps: [],
      assessmentStageGaps: [],
      sourceCoverageNeeds,
      sourceStateCaution: null,
      implementationScope: "FACT_GAP_HELPER_ONLY",
      mode: input.mode || "/tax"
    },
    clientFactChecklistResult: {
      checklistType: "CLIENT_FACT_PATTERN_CHECKLIST",
      documentRequests: input.requiredDocuments || input.missingDocuments || [],
      sourceCoverageNeeds,
      sourceStateCaution: null,
      implementationScope: "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY"
    },
    authorityApplicabilityResult: {
      implementationScope: "AUTHORITY_APPLICABILITY_HELPER_ONLY",
      authorityState,
      sourceAvailabilityState: authorityState,
      missingApplicabilityFacts: input.missingApplicabilityFacts || [],
      sourceCoverageNeeds,
      phase10DependencyFlags: input.phase10DependencyFlags || [],
      canReachFinalConclusion: false
    },
    adversarialContentSafetyResult: {
      safetyPosture: "ADVERSARIAL_FRAMING_ALLOWED_WITH_CAUTION",
      requiredCautions: [],
      prohibitedConclusions: [],
      canScoreRisk: false,
      canRecommendSettlement: false,
      canReachFinalConclusion: false,
      implementationScope: "ADVERSARIAL_CONTENT_SAFETY_POLICY_ONLY"
    }
  };
}

function helperInput(overrides = {}) {
  const input = {
    mode: "/tax",
    query: "/tax Draft bounded audit label language for a CWT certificate mismatch.",
    authorityState: "AUTHORITY_FOUND",
    sourceAvailabilityState: "AUTHORITY_FOUND",
    issueFamily: "CWT_FORM_2307",
    taxType: "CWT",
    knownFacts: [
      "corporate taxpayer",
      "taxable period 2024",
      "Form 2307 CWT claim",
      "amount and transaction type confirmed"
    ],
    providedDocuments: ["Form 2307 and ITR schedule reconciliation package provided"],
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
  assert.equal(output.canScoreRisk, false);
  assert.equal(output.canRecommendSettlement, false);
  assert.equal(output.canReachFinalConclusion, false);
}

function assertNoProhibitedFields(output) {
  const text = serialize(output);
  for (const field of PROHIBITED_FIELDS) {
    assert(!new RegExp(`"${field}"\\s*:`).test(text), `unexpected field ${field}`);
  }
}

function assertNoProhibitedStrings(output) {
  const text = serialize(output);
  for (const phrase of PROHIBITED_STRINGS) {
    assert(!text.toLowerCase().includes(phrase.toLowerCase()), `unexpected string ${phrase}`);
  }
}

function assertSafeOutput(output, authorityState = "AUTHORITY_FOUND") {
  assertHardFalse(output);
  assertNoProhibitedFields(output);
  assertNoProhibitedStrings(output);
  assert.equal(output.adversarialSafety.finalAssertion.safe, true, output.adversarialSafety.finalAssertion.violations?.join("; "));
  assert.equal(assertAdversarialSafety(output, { authorityState, phase10DependencyFlags: output.phase10DependencyFlags }).safe, true);
  for (const phrase of flattenStrings(output)) {
    if (/^\s*Do not\b/i.test(phrase)) continue;
    assert.doesNotMatch(phrase, /\bwill win\b|\bguaranteed\b|\bsettle now\b|\bignore BIR\b/i);
    assert.doesNotMatch(phrase, /\b\d+(?:\.\d+)?\s*%\s*(?:chance|probability|odds|likelihood)?\b/i);
  }
}

await test("core exports, implementation scope, and hard false capabilities are present", () => {
  assert.equal(typeof assessQualitativeAuditRisk, "function");
  assert.equal(typeof buildAuditRiskLanguageChecklist, "function");
  const output = assessQualitativeAuditRisk(helperInput());
  assert.equal(output.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
  assertSafeOutput(output);
});

await test("source imports the shared adversarial safety utilities directly", () => {
  const source = readFileSync(resolve("audit-risk-language-helper.js"), "utf8");
  assert.match(source, /applyAdversarialContentSafetyPolicy/);
  assert.match(source, /sanitizeAdversarialText/);
  assert.match(source, /assertAdversarialSafety/);
});

await test("required caution phrasing passes the shared safety assertion", () => {
  const assertion = assertAdversarialSafety({ caution: SAFE_CAUTION }, { authorityState: "AUTHORITY_FOUND" });
  assert.equal(assertion.safe, true, assertion.violations.join("; "));
});

await test("NO_INDEXED_SOURCE remains indeterminate and preserves source needs", () => {
  const output = assessQualitativeAuditRisk(helperInput({
    authorityState: "NO_INDEXED_SOURCE",
    sourceAvailabilityState: "NO_INDEXED_SOURCE",
    sourceCoverageNeeds: ["indexed authority needed before stronger label language"]
  }));
  assert.equal(output.qualitativeAuditRiskLabel, "INDETERMINATE_DUE_TO_NO_INDEXED_SOURCE");
  assert.notEqual(output.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
  assert(output.sourceCoverageNeeds.some((item) => /indexed authority/i.test(item)));
  assertSafeOutput(output, "NO_INDEXED_SOURCE");
});

await test("GENERAL_TAX remains indeterminate and does not claim exact support", () => {
  const output = assessQualitativeAuditRisk(helperInput({
    authorityState: "GENERAL_TAX",
    sourceAvailabilityState: "GENERAL_TAX"
  }));
  assert.equal(output.qualitativeAuditRiskLabel, "INDETERMINATE_DUE_TO_GENERAL_TAX_ONLY");
  assert.notEqual(output.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
  assert.doesNotMatch(serialize(output), /\bexact authority claim\b/i);
  assertSafeOutput(output, "GENERAL_TAX");
});

await test("RELATED_AUTHORITY_ONLY never produces lower-concern label", () => {
  const output = assessQualitativeAuditRisk(helperInput({
    authorityState: "RELATED_AUTHORITY_ONLY",
    sourceAvailabilityState: "RELATED_AUTHORITY_ONLY"
  }));
  assert(["MODERATE_DUE_TO_RELATED_AUTHORITY_ONLY", "INDETERMINATE_DUE_TO_RELATED_AUTHORITY_ONLY"].includes(output.qualitativeAuditRiskLabel));
  assert.notEqual(output.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
  assertSafeOutput(output, "RELATED_AUTHORITY_ONLY");
});

await test("AUTHORITY_FOUND with missing critical facts prevents lower-concern label", () => {
  const output = assessQualitativeAuditRisk(helperInput({
    missingUserFacts: ["specific withholding agent facts", "taxable period coverage"]
  }));
  assert(["HIGH_DUE_TO_MISSING_CRITICAL_FACTS", "INDETERMINATE_DUE_TO_MISSING_CRITICAL_FACTS"].includes(output.qualitativeAuditRiskLabel));
  assert.notEqual(output.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
  assert(output.missingCriticalFacts.length > 0);
  assertSafeOutput(output);
});

await test("AUTHORITY_FOUND with missing documents prevents lower-concern label", () => {
  const output = assessQualitativeAuditRisk(helperInput({
    requiredDocuments: ["Form 2307 reconciliation schedule", "withholding agent confirmation"]
  }));
  assert(["HIGH_DUE_TO_MISSING_DOCUMENTS", "INDETERMINATE_DUE_TO_MISSING_DOCUMENTS"].includes(output.qualitativeAuditRiskLabel));
  assert.notEqual(output.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
  assert(output.missingDocuments.length > 0);
  assertSafeOutput(output);
});

await test("AUTHORITY_FOUND with strong facts and documents may produce lower-concern label without conclusions", () => {
  const output = assessQualitativeAuditRisk(helperInput());
  assert.equal(output.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
  assert.equal(output.canReachFinalConclusion, false);
  assert.equal(output.canScoreRisk, false);
  assert.equal(output.canRecommendSettlement, false);
  assertSafeOutput(output);
});

await test("Phase 10 flags force indeterminate label and remain unresolved", () => {
  const output = assessQualitativeAuditRisk(helperInput({
    phase10DependencyFlags: ["SOURCE_CURRENTNESS_REVIEW_NEEDED", "HIERARCHY_CONFLICT_REVIEW_NEEDED"]
  }));
  assert.equal(output.qualitativeAuditRiskLabel, "INDETERMINATE_DUE_TO_PHASE10_REVIEW_NEEDED");
  assert.deepEqual(output.phase10DependencyFlags, ["SOURCE_CURRENTNESS_REVIEW_NEEDED", "HIERARCHY_CONFLICT_REVIEW_NEEDED"]);
  assert.doesNotMatch(serialize(output), /\bcurrently effective\b|\bthis supersedes\b|\bhierarchy is resolved\b/i);
  assertSafeOutput(output);
});

await test("/audit missing procedural facts forces procedural indeterminacy", () => {
  const output = assessQualitativeAuditRisk(helperInput({
    mode: "/audit",
    query: "/audit BIR assessed CWT disallowance but procedural facts are incomplete.",
    knownFacts: ["BIR assessed CWT disallowance"],
    missingUserFacts: ["LOA", "PAN/FAN/FDDA status", "taxable period"]
  }));
  assert(["INDETERMINATE_DUE_TO_PROCEDURAL_FACTS_NEEDED", "HIGH_DUE_TO_PROCEDURAL_FACT_GAPS"].includes(output.qualitativeAuditRiskLabel));
  assert.doesNotMatch(serialize(output), /\bassessment is void\b|\bBIR has no case\b|\bprotest strategy\b/i);
  assertSafeOutput(output);
});

await test("VAT zero-rating missing PEZA/export/customer support prevents lower-concern label", () => {
  const output = assessQualitativeAuditRisk(helperInput({
    issueFamily: "VAT_ZERO_RATING",
    taxType: "VAT",
    query: "/tax VAT zero-rating support is incomplete.",
    missingUserFacts: ["PEZA registration", "export sale support", "customer foreign-currency payment facts"]
  }));
  assert.notEqual(output.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
  assert(output.missingCriticalFacts.some((item) => /PEZA|export|customer/i.test(item)));
  assertSafeOutput(output);
});

await test("CWT/Form 2307 missing reconciliation and documents prevents lower-concern label", () => {
  const output = assessQualitativeAuditRisk(helperInput({
    requiredDocuments: ["Form 2307-to-ITR reconciliation", "corrected withholding certificates"],
    providedDocuments: ["unreconciled Form 2307 batch"]
  }));
  assert.notEqual(output.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
  assert(output.missingDocuments.some((item) => /2307|reconciliation|certificates/i.test(item)));
  assertSafeOutput(output);
});

await test("BIR/taxpayer position weaknesses are surfaced without recomputing positions", () => {
  const output = assessQualitativeAuditRisk(helperInput({
    birTaxpayerPositionResult: {
      implementationScope: "BIR_TAXPAYER_POSITION_HELPER_ONLY",
      requiredDocuments: [],
      weakestFactsOrDocuments: ["documents are incomplete and not assumed verified"],
      birPositionFraming: {
        weaknessesInBirPosition: ["authority applicability remains fact-dependent"]
      },
      taxpayerPositionFraming: {
        weaknessesInTaxpayerPosition: ["Form 2307 schedule mismatch remains unresolved"]
      }
    }
  }));
  assert(output.conditionsThatMayIncreaseLabel.some((item) => /incomplete|fact-dependent|mismatch/i.test(item)));
  assert.notEqual(output.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
  assertSafeOutput(output);
});

await test("fixture 006 cases activate through the helper without unsafe output", () => {
  const fixture = loadFixture(FIXTURE_006);
  for (const item of fixture.cases.slice(0, 8)) {
    const output = assessQualitativeAuditRisk({
      mode: item.mode,
      query: item.query,
      authorityState: item.authorityState,
      sourceAvailabilityState: item.sourceAvailabilityState,
      knownFacts: item.knownFacts,
      missingUserFacts: item.missingUserFacts,
      requiredDocuments: [],
      sourceCoverageNeeds: item.authorityOrSourceCoverageNeeds,
      providedDocuments: item.documentStrength === "WEAK_DOCUMENT_SUPPORT" ? ["weak document support"] : [],
      documentsComplete: item.documentStrength !== "WEAK_DOCUMENT_SUPPORT",
      requiredDocumentsSatisfied: item.documentStrength !== "WEAK_DOCUMENT_SUPPORT"
    });
    assert.equal(output.implementationScope, SCOPE);
    assert(output.qualitativeAuditRiskLabel);
    assert.notEqual(output.qualitativeAuditRiskLabel, "HIGH");
    assert.notEqual(output.qualitativeAuditRiskLabel, "MEDIUM");
    assert.notEqual(output.qualitativeAuditRiskLabel, "LOW");
    assertSafeOutput(output, item.authorityState);
  }
});

await test("checklist export is client-facing, safe, and free from prohibited fields", () => {
  const checklist = buildAuditRiskLanguageChecklist(helperInput({
    missingUserFacts: ["income inclusion fact"],
    requiredDocuments: ["withholding certificate"]
  }));
  assert.equal(checklist.checklistType, "QUALITATIVE_AUDIT_RISK_LANGUAGE_CHECKLIST");
  assert.equal(checklist.implementationScope, SCOPE);
  assert(checklist.factsNeeded.length > 0);
  assert(checklist.documentsNeeded.length > 0);
  assertSafeOutput(checklist);
});

if (failed > 0) {
  console.error(`${failed} test(s) failed; ${passed} passed`);
  process.exit(1);
}

console.log(`${passed} test(s) passed`);
