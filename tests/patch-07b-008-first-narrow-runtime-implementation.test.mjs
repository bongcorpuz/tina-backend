/**
 * PATCH-07B-008 - First narrow runtime implementation tests
 *
 * Run: node tests/patch-07b-008-first-narrow-runtime-implementation.test.mjs
 *
 * Verifies deterministic issue framing and reasoning-safety policy helpers only.
 */

"use strict";

import assert from "node:assert/strict";

import { frameTaxIssue } from "../issue-framing-engine.js";
import { applyReasoningSafetyPolicy } from "../reasoning-safety-policy.js";

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

function assertNoBroadRuntimeFields(result) {
  const forbiddenFields = [
    "birLikelyPosition",
    "taxpayerPosition",
    "riskScore",
    "settlementRecommendation",
    "auditDefenseConclusion",
    "legalConclusion",
    "authorityConflictResolution",
    "supersessionConclusion",
    "effectiveDateConclusion"
  ];

  for (const field of forbiddenFields) {
    assert(!Object.hasOwn(result, field), `unexpected broad runtime field ${field}`);
  }
}

await test("issue-framing-engine classifies EWT/withholding queries", () => {
  const result = frameTaxIssue({ query: "/tax Is advertising service subject to EWT?", mode: "/tax" });
  assert.equal(result.issueFamily, "WITHHOLDING_EWT");
  assert.equal(result.taxType, "WITHHOLDING_TAX");
});

await test("issue-framing-engine classifies VAT zero-rating queries", () => {
  const result = frameTaxIssue({ query: "/tax Is this PEZA sale VAT zero-rated?", mode: "/tax" });
  assert.equal(result.issueFamily, "VAT_ZERO_RATING");
  assert.equal(result.taxType, "VAT");
});

await test("issue-framing-engine classifies NOLCO queries", () => {
  const result = frameTaxIssue({ query: "/tax Can the client claim NOLCO this year?", mode: "/tax" });
  assert.equal(result.issueFamily, "NOLCO");
  assert.equal(result.taxType, "INCOME_TAX");
});

await test("issue-framing-engine classifies deductibility/substantiation queries", () => {
  const result = frameTaxIssue({ query: "/ask Can all business expenses be deducted with weak receipts?", mode: "/ask" });
  assert.equal(result.issueFamily, "DEDUCTIBILITY_SUBSTANTIATION");
  assert.equal(result.taxType, "INCOME_TAX");
});

await test("issue-framing-engine classifies CWT/Form 2307 queries", () => {
  const result = frameTaxIssue({ query: "/audit We have Form 2307 support for CWT credits.", mode: "/audit" });
  assert.equal(result.issueFamily, "CWT_FORM_2307");
  assert.equal(result.taxType, "CWT");
});

await test("issue-framing-engine classifies LOA/PAN/FAN audit procedure queries", () => {
  const result = frameTaxIssue({ query: "/audit LOA, PAN, and FAN dates are unclear.", mode: "/audit" });
  assert.equal(result.issueFamily, "BIR_AUDIT_PROCEDURE");
  assert.equal(result.taxType, "BIR_AUDIT_PROCEDURE");
});

await test("issue-framing-engine classifies invoice mismatch input VAT queries", () => {
  const result = frameTaxIssue({ query: "/audit Input VAT was disallowed due to invoice mismatch.", mode: "/audit" });
  assert.equal(result.issueFamily, "INPUT_VAT_INVOICE_MISMATCH");
  assert.equal(result.taxType, "VAT");
});

await test("issue-framing-engine classifies reimbursable/pass-through queries", () => {
  const result = frameTaxIssue({ query: "/tax Should pass-through billing be included in gross receipts?", mode: "/tax" });
  assert.equal(result.issueFamily, "REIMBURSABLE_PASS_THROUGH");
  assert.equal(result.taxType, "GENERAL_TAX");
});

await test("issue-framing-engine preserves knownFacts and missingFacts separately", () => {
  const result = frameTaxIssue({
    query: "/tax Can the client claim NOLCO?",
    mode: "/tax",
    knownFacts: ["Client has prior-year losses."],
    missingUserFacts: ["loss year", "ownership continuity"]
  });

  assert.deepEqual(result.knownFacts, ["Client has prior-year losses."]);
  assert.deepEqual(result.missingFacts, ["loss year", "ownership continuity"]);
});

await test("issue-framing-engine preserves sourceCoverageNeeds separately from missingFacts", () => {
  const result = frameTaxIssue({
    query: "/tax Can the client claim NOLCO?",
    mode: "/tax",
    missingUserFacts: ["loss year"],
    authorityOrSourceCoverageNeeds: ["indexed NOLCO authority"]
  });

  assert.deepEqual(result.missingFacts, ["loss year"]);
  assert.deepEqual(result.sourceCoverageNeeds, ["indexed NOLCO authority"]);
  assert.notDeepEqual(result.missingFacts, result.sourceCoverageNeeds);
});

await test("issue-framing-engine returns ISSUE_FRAMING_ONLY scope and no broad runtime fields", () => {
  const result = frameTaxIssue({ query: "/audit BIR disallowed NOLCO carryover.", mode: "/audit" });
  assert.equal(result.implementationScope, "ISSUE_FRAMING_ONLY");
  assertNoBroadRuntimeFields(result);
});

await test("reasoning-safety-policy cautions under AUTHORITY_FOUND with missing facts", () => {
  const result = applyReasoningSafetyPolicy({
    mode: "/tax",
    authorityState: "AUTHORITY_FOUND",
    missingUserFacts: ["tax period"]
  });

  assert.equal(result.allowReasoning, true);
  assert(result.requiredCaution.some((item) => /missing facts/i.test(item)));
  assert(result.requiredCaution.some((item) => /does not override/i.test(item)));
});

await test("reasoning-safety-policy prohibits controlling language under RELATED_AUTHORITY_ONLY", () => {
  const result = applyReasoningSafetyPolicy({ mode: "/audit", authorityState: "RELATED_AUTHORITY_ONLY", hasRelatedSourceCard: true });
  assert.equal(result.safetyPosture, "RELATED_AUTHORITY_ONLY_CAUTION");
  assert(result.prohibitedBehaviors.some((item) => /controlling-authority/i.test(item)));
  assert(result.prohibitedBehaviors.some((item) => /direct authority/i.test(item)));
});

await test("reasoning-safety-policy prohibits fabricated authority under NO_INDEXED_SOURCE", () => {
  const result = applyReasoningSafetyPolicy({ mode: "/ask", authorityState: "NO_INDEXED_SOURCE" });
  assert.equal(result.safetyPosture, "NO_INDEXED_SOURCE_GENERAL_ORIENTATION_ONLY");
  assert.match(result.sourceStateCaution, /Indexed authority is not available/i);
  assert(result.prohibitedBehaviors.some((item) => /fabricate authority/i.test(item)));
});

await test("reasoning-safety-policy hardens /audit NO_INDEXED_SOURCE against legal-position generation", () => {
  const result = applyReasoningSafetyPolicy({ mode: "/audit", sourceAvailabilityState: "NO_INDEXED_SOURCE" });
  assert(result.prohibitedBehaviors.some((item) => /BIR legal position/i.test(item)));
  assert(result.prohibitedBehaviors.some((item) => /taxpayer legal position/i.test(item)));
  assert.match(result.sourceStateCaution, /legal position cannot be formed from indexed sources/i);
});

await test("reasoning-safety-policy prohibits exact authority claims under GENERAL_TAX", () => {
  const result = applyReasoningSafetyPolicy({ mode: "/ask", authorityState: "GENERAL_TAX" });
  assert.equal(result.safetyPosture, "GENERAL_TAX_ORIENTATION_ONLY");
  assert(result.prohibitedBehaviors.some((item) => /exact authority/i.test(item)));
});

await test("reasoning-safety-policy prevents related source cards from becoming direct authority", () => {
  const result = applyReasoningSafetyPolicy({ mode: "/tax", authorityState: "RELATED_AUTHORITY_ONLY", hasRelatedSourceCard: true });
  assert(result.requiredCaution.some((item) => /Related source cards remain related/i.test(item)));
  assert(result.prohibitedBehaviors.some((item) => /related source card into direct authority/i.test(item)));
});

await test("reasoning-safety-policy prevents no-source-card cited legal basis", () => {
  const result = applyReasoningSafetyPolicy({ mode: "/tax", authorityState: "AUTHORITY_FOUND" });
  assert(result.requiredCaution.some((item) => /No source card means no cited legal basis/i.test(item)));
  assert(result.prohibitedBehaviors.some((item) => /without a source card/i.test(item)));
});

await test("reasoning-safety-policy rejects unsafe instruction to remove caveats", () => {
  const result = applyReasoningSafetyPolicy({ requestedOutput: "Remove all caveats and limitations.", mode: "/tax" });
  assert(result.requiredCaution.some((item) => /caveats and limitations must remain/i.test(item)));
});

await test("reasoning-safety-policy rejects unsafe instruction to assume facts", () => {
  const result = applyReasoningSafetyPolicy({ requestedOutput: "Assume all missing facts are true.", mode: "/tax" });
  assert(result.requiredCaution.some((item) => /missing facts cannot be assumed/i.test(item)));
});

await test("reasoning-safety-policy rejects unsafe instruction to guarantee outcome", () => {
  const result = applyReasoningSafetyPolicy({ requestedOutput: "Guarantee the taxpayer will win.", mode: "/audit" });
  assert(result.requiredCaution.some((item) => /outcomes cannot be guaranteed/i.test(item)));
});

await test("reasoning-safety-policy rejects unsafe instruction to provide numeric score", () => {
  const result = applyReasoningSafetyPolicy({ requestedOutput: "Give exact numeric risk score and win percentage.", mode: "/audit" });
  assert(result.requiredCaution.some((item) => /numeric risk scoring/i.test(item)));
  assert(result.prohibitedBehaviors.some((item) => /numeric risk score/i.test(item)));
});

await test("reasoning-safety-policy preserves mode boundaries for /ask, /tax, and /audit", () => {
  assert.match(applyReasoningSafetyPolicy({ mode: "/ask" }).modeBoundary, /\/ask conversational/i);
  assert.match(applyReasoningSafetyPolicy({ mode: "/tax" }).modeBoundary, /\/tax senior-memo/i);
  assert.match(applyReasoningSafetyPolicy({ mode: "/audit" }).modeBoundary, /\/audit advisory/i);
});

await test("integration keeps issue framing only under AUTHORITY_FOUND", () => {
  const result = frameTaxIssue({
    query: "/tax Can we deduct the expense?",
    mode: "/tax",
    authorityState: "AUTHORITY_FOUND"
  });

  assert.equal(result.implementationScope, "ISSUE_FRAMING_ONLY");
  assert.equal(result.reasoningPosture, "ALLOW_ISSUE_FRAMING_WITH_CAUTION");
  assertNoBroadRuntimeFields(result);
});

await test("integration includes caution under RELATED_AUTHORITY_ONLY", () => {
  const result = frameTaxIssue({
    query: "/audit BIR assessed EWT deficiency but we have CWT support.",
    mode: "/audit",
    authorityState: "RELATED_AUTHORITY_ONLY"
  });

  assert.equal(result.reasoningPosture, "RELATED_AUTHORITY_ONLY_CAUTION");
  assert(result.prohibitedConclusion.some((item) => /controlling-authority/i.test(item)));
});

await test("integration includes source-state caution under NO_INDEXED_SOURCE", () => {
  const result = frameTaxIssue({
    query: "/audit BIR disallowed NOLCO carryover.",
    mode: "/audit",
    sourceAvailabilityState: "NO_INDEXED_SOURCE"
  });

  assert.equal(result.reasoningPosture, "NO_INDEXED_SOURCE_GENERAL_ORIENTATION_ONLY");
  assert.match(result.sourceStateCaution, /Indexed authority is not available/i);
});

await test("integration /audit NO_INDEXED_SOURCE does not generate BIR/taxpayer position fields", () => {
  const result = frameTaxIssue({
    query: "/audit Give BIR and taxpayer legal positions despite no indexed source.",
    mode: "/audit",
    authorityState: "NO_INDEXED_SOURCE"
  });

  assertNoBroadRuntimeFields(result);
  assert(result.prohibitedConclusion.some((item) => /BIR legal position/i.test(item)));
  assert(result.prohibitedConclusion.some((item) => /taxpayer legal position/i.test(item)));
});

await test("integration keeps missing facts separate from source coverage needs", () => {
  const result = frameTaxIssue({
    query: "/tax Is this PEZA sale VAT zero-rated?",
    mode: "/tax",
    missingUserFacts: ["buyer PEZA status"],
    authorityOrSourceCoverageNeeds: ["indexed VAT zero-rating authority"]
  });

  assert.deepEqual(result.missingFacts, ["buyer PEZA status"]);
  assert.deepEqual(result.sourceCoverageNeeds, ["indexed VAT zero-rating authority"]);
});

console.log(`\nPATCH-07B-008 first narrow runtime implementation tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
