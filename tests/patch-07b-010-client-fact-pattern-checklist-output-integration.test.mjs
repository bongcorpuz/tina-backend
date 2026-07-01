/**
 * PATCH-07B-010 - Client fact-pattern checklist output integration tests
 *
 * Run: node tests/patch-07b-010-client-fact-pattern-checklist-output-integration.test.mjs
 */

"use strict";

import assert from "node:assert/strict";

import { buildClientFactChecklistOutput } from "../client-fact-checklist-output.js";
import { identifyFactGaps } from "../fact-gap-helper.js";
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

function text(result) {
  return JSON.stringify(result);
}

function assertNoProhibitedFields(result) {
  const forbidden = [
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

  for (const field of forbidden) {
    assert(!Object.hasOwn(result, field), `unexpected prohibited field ${field}`);
  }
}

const baseInput = {
  query: "/audit BIR disallowed NOLCO and issued a FAN.",
  mode: "/audit",
  issueFamily: "NOLCO",
  taxType: "INCOME_TAX",
  authorityState: "NO_INDEXED_SOURCE",
  knownFacts: ["The taxpayer is a domestic corporation."],
  missingUserFacts: ["taxable year of loss", "year of intended deduction", "protest deadline"],
  providedDocuments: ["FAN"],
  authorityOrSourceCoverageNeeds: ["indexed NOLCO authority for the relevant period"]
};

await test("buildClientFactChecklistOutput returns CLIENT_FACT_CHECKLIST_OUTPUT_ONLY scope", () => {
  const result = buildClientFactChecklistOutput(baseInput);
  assert.equal(result.implementationScope, "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY");
});

await test("buildClientFactChecklistOutput returns CLIENT_FACT_PATTERN_CHECKLIST type", () => {
  const result = buildClientFactChecklistOutput(baseInput);
  assert.equal(result.checklistType, "CLIENT_FACT_PATTERN_CHECKLIST");
});

await test("knownFactsSummary preserves known facts", () => {
  const result = buildClientFactChecklistOutput(baseInput);
  assert.deepEqual(result.knownFactsSummary, ["The taxpayer is a domestic corporation."]);
});

await test("criticalQuestions preserve critical missing facts", () => {
  const result = buildClientFactChecklistOutput(baseInput);
  assert(result.criticalQuestions.some((item) => /taxable year of loss/i.test(item)));
});

await test("helpfulQuestions preserve helpful missing facts", () => {
  const result = buildClientFactChecklistOutput({
    ...baseInput,
    missingUserFacts: ["optional internal billing note"]
  });
  assert(result.helpfulQuestions.some((item) => /optional internal billing note/i.test(item)));
});

await test("documentRequests preserve document gaps", () => {
  const result = buildClientFactChecklistOutput({ query: "/tax Can this expense be deducted?", mode: "/tax" });
  assert(result.documentRequests.some((item) => /receipt|invoice|support/i.test(item)));
});

await test("timingAndPeriodQuestions preserve timing or period gaps", () => {
  const result = buildClientFactChecklistOutput(baseInput);
  assert(result.timingAndPeriodQuestions.some((item) => /taxable year of loss|protest deadline/i.test(item)));
});

await test("taxpayerStatusQuestions preserve taxpayer-status gaps", () => {
  const result = buildClientFactChecklistOutput({ query: "/tax Can the client claim NOLCO?", mode: "/tax" });
  assert(result.taxpayerStatusQuestions.some((item) => /taxpayer type|regular corporate income tax/i.test(item)));
});

await test("transactionCharacterQuestions preserve transaction-character gaps", () => {
  const result = buildClientFactChecklistOutput({ query: "/tax Should pass-through billing be included in gross receipts?", mode: "/tax" });
  assert(result.transactionCharacterQuestions.some((item) => /markup|contract|billing|revenue/i.test(item)));
});

await test("assessmentStageQuestions preserve assessment-stage gaps", () => {
  const result = buildClientFactChecklistOutput({ query: "/audit LOA, PAN, FAN, FDDA and protest deadline issue.", mode: "/audit" });
  assert(result.assessmentStageQuestions.some((item) => /PAN\/FAN\/FDDA|protest deadline|procedural stage/i.test(item)));
});

await test("sourceCoverageNeeds remain separate", () => {
  const result = buildClientFactChecklistOutput(baseInput);
  assert.deepEqual(result.sourceCoverageNeeds, ["indexed NOLCO authority for the relevant period"]);
  assert(!text([
    result.criticalQuestions,
    result.helpfulQuestions,
    result.documentRequests,
    result.timingAndPeriodQuestions,
    result.taxpayerStatusQuestions,
    result.transactionCharacterQuestions,
    result.assessmentStageQuestions
  ]).includes("indexed NOLCO authority for the relevant period"));
});

await test("sourceStateCaution is preserved", () => {
  const result = buildClientFactChecklistOutput(baseInput);
  assert.match(result.sourceStateCaution, /Indexed authority is not available/i);
});

await test("modeBoundaryCaution is present", () => {
  const result = buildClientFactChecklistOutput(baseInput);
  assert.match(result.modeBoundaryCaution, /checklist only/i);
});

await test("mustAnswerBeforeFinalAdvice is present", () => {
  const result = buildClientFactChecklistOutput(baseInput);
  assert(Array.isArray(result.mustAnswerBeforeFinalAdvice));
  assert(result.mustAnswerBeforeFinalAdvice.length > 0);
});

await test("prohibitedNextSteps is present", () => {
  const result = buildClientFactChecklistOutput(baseInput);
  assert(result.prohibitedNextSteps.some((item) => /final legal or tax conclusion/i.test(item)));
});

await test("/ask output is concise and plain-language", () => {
  const result = buildClientFactChecklistOutput({ query: "/ask What should I do?", mode: "/ask" });
  assert.equal(result.title, "Missing facts to answer this safely");
  assert(result.criticalQuestions.length <= 8);
  assert(result.helpfulQuestions.length <= 6);
  assert(result.criticalQuestions.every((item) => /^Please provide/i.test(item)));
});

await test("/tax output is professional and memo-preparation oriented", () => {
  const result = buildClientFactChecklistOutput({ query: "/tax Can the client claim NOLCO?", mode: "/tax" });
  assert.equal(result.title, "Fact checklist needed before tax conclusion");
  assert.match(result.purpose, /senior tax conclusion/i);
  assert.match(text(result), /memo preparation|taxpayer type|taxable period|transaction type|amount/i);
});

await test("/audit output is audit-document and procedural-stage oriented", () => {
  const result = buildClientFactChecklistOutput({ query: "/audit LOA, PAN, FAN, FDDA and protest deadline issue.", mode: "/audit" });
  assert.equal(result.title, "Audit-defense fact and document checklist");
  assert.match(text(result), /audit review|LOA|PAN\/FAN\/FDDA|protest deadline|documents/i);
});

await test("/ask does not produce /tax memo conclusion", () => {
  const result = buildClientFactChecklistOutput({ query: "/ask Can this be deducted?", mode: "/ask" });
  assertNoProhibitedFields(result);
  assert.doesNotMatch(text(result), /final tax memo conclusion/i);
});

await test("/tax does not produce final legal conclusion", () => {
  const result = buildClientFactChecklistOutput({ query: "/tax Can this be deducted?", mode: "/tax" });
  assertNoProhibitedFields(result);
  assert.doesNotMatch(text(result), /legalConclusion|final legal conclusion/i);
});

await test("/audit does not produce BIR or taxpayer position", () => {
  const result = buildClientFactChecklistOutput({ query: "/audit Give BIR and taxpayer positions.", mode: "/audit" });
  assertNoProhibitedFields(result);
  assert.doesNotMatch(text(result), /birLikelyPosition|taxpayerPosition/i);
});

await test("/audit does not produce risk, settlement, or protest advice", () => {
  const result = buildClientFactChecklistOutput({ query: "/audit Give risk and settlement advice.", mode: "/audit" });
  assertNoProhibitedFields(result);
  assert.doesNotMatch(text(result), /riskScore|riskLevel|settlementRecommendation|protestStrategy/i);
});

await test("AUTHORITY_FOUND does not remove critical questions", () => {
  const result = buildClientFactChecklistOutput({
    query: "/tax Can this expense be deducted?",
    mode: "/tax",
    authorityState: "AUTHORITY_FOUND",
    missingUserFacts: ["tax period"]
  });
  assert.match(text(result.criticalQuestions), /tax period/i);
});

await test("RELATED_AUTHORITY_ONLY adds prohibited step against controlling authority", () => {
  const result = buildClientFactChecklistOutput({ query: "/tax Can this expense be deducted?", mode: "/tax", authorityState: "RELATED_AUTHORITY_ONLY" });
  assert(result.prohibitedNextSteps.some((item) => /related authority as controlling authority/i.test(item)));
});

await test("NO_INDEXED_SOURCE adds prohibited step against claiming indexed authority", () => {
  const result = buildClientFactChecklistOutput({ query: "/tax Can this expense be deducted?", mode: "/tax", authorityState: "NO_INDEXED_SOURCE" });
  assert(result.prohibitedNextSteps.some((item) => /indexed authority exists/i.test(item)));
});

await test("GENERAL_TAX remains general orientation", () => {
  const result = buildClientFactChecklistOutput({ query: "/ask Explain tax generally.", mode: "/ask", authorityState: "GENERAL_TAX" });
  assert.equal(result.canProceedWithGeneralOrientation, true);
  assert(result.prohibitedNextSteps.every((item) => !/indexed authority exists/i.test(item)));
});

await test("NO_INDEXED_SOURCE /audit prohibits BIR/taxpayer legal position formation", () => {
  const result = buildClientFactChecklistOutput(baseInput);
  assert(result.prohibitedNextSteps.some((item) => /BIR likely position or taxpayer defense/i.test(item)));
  assert(result.prohibitedNextSteps.some((item) => /unavailable indexed sources/i.test(item)));
});

await test("source coverage needs remain separate from missing user facts", () => {
  const result = buildClientFactChecklistOutput({
    query: "/tax Is this PEZA sale VAT zero-rated?",
    mode: "/tax",
    missingUserFacts: ["buyer PEZA status"],
    authorityOrSourceCoverageNeeds: ["indexed VAT zero-rating authority"]
  });
  assert.deepEqual(result.sourceCoverageNeeds, ["indexed VAT zero-rating authority"]);
  assert(!text(result.criticalQuestions).includes("indexed VAT zero-rating authority"));
});

await test("checklist output can be built from identifyFactGaps result", () => {
  const factGapResult = identifyFactGaps({ query: "/tax Can the client claim NOLCO?", mode: "/tax" });
  const result = buildClientFactChecklistOutput({ query: "/tax Can the client claim NOLCO?", mode: "/tax", factGapResult });
  assert.equal(result.issueFamily, factGapResult.issueFamily);
  assert.equal(result.implementationScope, "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY");
});

await test("checklist output can preserve issue-framing result", () => {
  const issueFrameResult = frameTaxIssue({ query: "/tax Is this PEZA sale VAT zero-rated?", mode: "/tax" });
  const result = buildClientFactChecklistOutput({ query: "/tax Is this PEZA sale VAT zero-rated?", mode: "/tax", issueFrameResult });
  assert.equal(result.issueFamily, issueFrameResult.issueFamily);
  assert.equal(result.taxType, issueFrameResult.taxType);
});

await test("checklist output can preserve reasoning-safety source-state caution", () => {
  const safetyPolicyResult = applyReasoningSafetyPolicy({ mode: "/audit", authorityState: "NO_INDEXED_SOURCE" });
  const result = buildClientFactChecklistOutput({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", authorityState: "NO_INDEXED_SOURCE", safetyPolicyResult });
  assert.equal(result.sourceStateCaution, safetyPolicyResult.sourceStateCaution);
});

await test("integrated output remains checklist-only", () => {
  const issueFrameResult = frameTaxIssue({ query: "/audit BIR disallowed NOLCO.", mode: "/audit" });
  const factGapResult = identifyFactGaps({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", ...issueFrameResult });
  const result = buildClientFactChecklistOutput({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", issueFrameResult, factGapResult });
  assert.equal(result.implementationScope, "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY");
  assertNoProhibitedFields(result);
});

await test("integrated output under /audit NO_INDEXED_SOURCE remains cautious", () => {
  const issueFrameResult = frameTaxIssue({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", authorityState: "NO_INDEXED_SOURCE" });
  const factGapResult = identifyFactGaps({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", authorityState: "NO_INDEXED_SOURCE", ...issueFrameResult });
  const result = buildClientFactChecklistOutput({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", authorityState: "NO_INDEXED_SOURCE", issueFrameResult, factGapResult });
  assert.match(result.sourceStateCaution, /Indexed authority is not available/i);
  assert(result.prohibitedNextSteps.some((item) => /unavailable indexed sources/i.test(item)));
  assertNoProhibitedFields(result);
});

await test("output must not include prohibited broad-runtime fields", () => {
  const result = buildClientFactChecklistOutput({ query: "/audit Give full protest strategy and risk score.", mode: "/audit" });
  assertNoProhibitedFields(result);
});

console.log(`\nPATCH-07B-010 client fact-pattern checklist output integration tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
