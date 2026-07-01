/**
 * PATCH-07B-009 - Narrow fact-gap runtime helper tests
 *
 * Run: node tests/patch-07b-009-narrow-fact-gap-runtime-helper.test.mjs
 */

"use strict";

import assert from "node:assert/strict";

import { frameTaxIssue } from "../issue-framing-engine.js";
import { applyReasoningSafetyPolicy } from "../reasoning-safety-policy.js";
import { buildFactChecklist, identifyFactGaps } from "../fact-gap-helper.js";

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

function text(result) {
  return JSON.stringify(result);
}

await test("identifyFactGaps returns FACT_GAP_HELPER_ONLY scope", () => {
  const result = identifyFactGaps({ query: "/tax Can the client claim NOLCO?", mode: "/tax" });
  assert.equal(result.implementationScope, "FACT_GAP_HELPER_ONLY");
});

await test("buildFactChecklist returns checklistQuestions and mustAnswerBeforeFinalAdvice", () => {
  const checklist = buildFactChecklist({ query: "/tax Can the client claim NOLCO?", mode: "/tax" });
  assert(Array.isArray(checklist.checklistQuestions));
  assert(Array.isArray(checklist.mustAnswerBeforeFinalAdvice));
  assert(checklist.checklistQuestions.length > 0);
  assert(checklist.mustAnswerBeforeFinalAdvice.length > 0);
});

await test("knownFacts are preserved separately", () => {
  const result = identifyFactGaps({
    query: "/tax Can the client claim NOLCO?",
    mode: "/tax",
    knownFacts: ["Client has prior-year losses."]
  });
  assert.deepEqual(result.knownFacts, ["Client has prior-year losses."]);
  assert(!result.criticalMissingFacts.includes("Client has prior-year losses."));
});

await test("missingUserFacts are categorized but not treated as known", () => {
  const result = identifyFactGaps({
    query: "/tax Can the client claim NOLCO?",
    mode: "/tax",
    missingUserFacts: ["loss year", "ownership continuity"]
  });
  assert(result.helpfulMissingFacts.includes("loss year") || result.timingOrPeriodGaps.includes("loss year"));
  assert(!result.knownFacts.includes("loss year"));
});

await test("authorityOrSourceCoverageNeeds are preserved separately", () => {
  const result = identifyFactGaps({
    query: "/tax Can the client claim NOLCO?",
    mode: "/tax",
    authorityOrSourceCoverageNeeds: ["indexed NOLCO authority"]
  });
  assert.deepEqual(result.sourceCoverageNeeds, ["indexed NOLCO authority"]);
});

await test("sourceCoverageNeeds are not merged into missing fact buckets", () => {
  const result = identifyFactGaps({
    query: "/tax Can the client claim NOLCO?",
    mode: "/tax",
    authorityOrSourceCoverageNeeds: ["indexed NOLCO authority"]
  });
  const missingText = [
    ...result.criticalMissingFacts,
    ...result.helpfulMissingFacts,
    ...result.documentGaps,
    ...result.timingOrPeriodGaps,
    ...result.taxpayerStatusGaps,
    ...result.transactionCharacterGaps,
    ...result.assessmentStageGaps
  ].join(" ");
  assert(!missingText.includes("indexed NOLCO authority"));
});

await test("providedDocuments control document-gap reduction", () => {
  const withoutDocs = identifyFactGaps({ query: "/audit We have Form 2307 support for CWT credits.", mode: "/audit" });
  const withDocs = identifyFactGaps({
    query: "/audit We have Form 2307 support for CWT credits.",
    mode: "/audit",
    providedDocuments: ["Form 2307", "sales SLSP reconciliation"]
  });

  assert(withoutDocs.documentGaps.some((gap) => /Form 2307/i.test(gap)));
  assert(!withDocs.documentGaps.some((gap) => /Form 2307/i.test(gap)));
});

await test("WITHHOLDING_EWT produces withholding-specific facts", () => {
  const result = identifyFactGaps({ query: "/tax Is advertising service subject to EWT?", mode: "/tax" });
  assert.equal(result.issueFamily, "WITHHOLDING_EWT");
  assert.match(text(result), /payor\/payee|withholding|payment/i);
});

await test("VAT_ZERO_RATING produces VAT/zero-rating facts", () => {
  const result = identifyFactGaps({ query: "/tax Is this PEZA sale VAT zero-rated?", mode: "/tax" });
  assert.equal(result.issueFamily, "VAT_ZERO_RATING");
  assert.match(text(result), /VAT registration|PEZA|zero-rating|sales invoice/i);
});

await test("NOLCO produces NOLCO facts", () => {
  const result = identifyFactGaps({ query: "/tax Can the client claim NOLCO this year?", mode: "/tax" });
  assert.equal(result.issueFamily, "NOLCO");
  assert.match(text(result), /taxable year of loss|ownership|ITR\/AFS/i);
});

await test("DEDUCTIBILITY_SUBSTANTIATION produces substantiation facts", () => {
  const result = identifyFactGaps({ query: "/tax Can this expense be deducted?", mode: "/tax" });
  assert.equal(result.issueFamily, "DEDUCTIBILITY_SUBSTANTIATION");
  assert.match(text(result), /nature of expense|business connection|official receipts/i);
});

await test("CWT_FORM_2307 produces 2307/reconciliation facts", () => {
  const result = identifyFactGaps({ query: "/audit We have CWT Form 2307 credits.", mode: "/audit" });
  assert.equal(result.issueFamily, "CWT_FORM_2307");
  assert.match(text(result), /Form 2307|SLSP|amount of CWT/i);
});

await test("BIR_AUDIT_PROCEDURE produces LOA/PAN/FAN/FDDA/protest facts", () => {
  const result = identifyFactGaps({ query: "/audit LOA, PAN, FAN, FDDA and protest deadline issue.", mode: "/audit" });
  assert.equal(result.issueFamily, "BIR_AUDIT_PROCEDURE");
  assert.match(text(result), /LOA date|PAN\/FAN\/FDDA|protest deadline/i);
});

await test("INPUT_VAT_INVOICE_MISMATCH produces invoice mismatch facts", () => {
  const result = identifyFactGaps({ query: "/audit Input VAT disallowed because invoice name mismatch.", mode: "/audit" });
  assert.equal(result.issueFamily, "INPUT_VAT_INVOICE_MISMATCH");
  assert.match(text(result), /invoice date|supplier name\/TIN|buyer\/customer name\/TIN/i);
});

await test("REIMBURSABLE_PASS_THROUGH produces pass-through facts", () => {
  const result = identifyFactGaps({ query: "/tax Should pass-through billing be included in gross receipts?", mode: "/tax" });
  assert.equal(result.issueFamily, "REIMBURSABLE_PASS_THROUGH");
  assert.match(text(result), /principal\/client|third-party vendor|markup|agency/i);
});

await test("GENERAL_TAX_ORIENTATION produces general facts", () => {
  const result = identifyFactGaps({ query: "/ask Explain tax authority generally.", mode: "/ask" });
  assert.equal(result.issueFamily, "GENERAL_TAX_ORIENTATION");
  assert.match(text(result), /taxpayer type|transaction type|taxable period/i);
});

await test("UNKNOWN_NEEDS_MORE_FACTS produces broad minimum facts", () => {
  const result = identifyFactGaps({ query: "What should I do?", mode: "/ask" });
  assert.equal(result.issueFamily, "UNKNOWN_NEEDS_MORE_FACTS");
  assert.match(text(result), /tax type involved|current procedural stage|documents available/i);
});

await test("/ask checklist is concise and user-readable", () => {
  const result = identifyFactGaps({ query: "/ask What should I do?", mode: "/ask" });
  assert(result.checklistQuestions.length <= 6);
  assert(result.checklistQuestions.every((question) => /^Please provide .+\.$/.test(question)));
});

await test("/tax checklist includes taxpayer/period/transaction facts", () => {
  const result = identifyFactGaps({ query: "/tax Can the client claim NOLCO?", mode: "/tax" });
  assert.match(text(result), /taxpayer type|taxable period|transaction type|year of intended deduction/i);
});

await test("/audit checklist includes assessment-stage/document/procedural facts", () => {
  const result = identifyFactGaps({ query: "/audit BIR issued PAN and FAN.", mode: "/audit" });
  assert.match(text(result), /assessment\/procedural stage|assessment notices|protest deadline/i);
});

await test("/audit does not create BIR/taxpayer position", () => {
  const result = identifyFactGaps({ query: "/audit Give positions for the FAN.", mode: "/audit" });
  assertNoProhibitedFields(result);
});

await test("/audit does not create risk level or settlement advice", () => {
  const result = identifyFactGaps({ query: "/audit Give risk and settlement advice.", mode: "/audit" });
  assertNoProhibitedFields(result);
});

await test("AUTHORITY_FOUND does not remove missing facts", () => {
  const result = identifyFactGaps({
    query: "/tax Can this expense be deducted?",
    mode: "/tax",
    authorityState: "AUTHORITY_FOUND",
    missingUserFacts: ["tax period"]
  });
  assert.match(text(result), /tax period/i);
});

await test("RELATED_AUTHORITY_ONLY adds related-authority caution", () => {
  const result = identifyFactGaps({ query: "/tax Can this expense be deducted?", mode: "/tax", authorityState: "RELATED_AUTHORITY_ONLY" });
  assert.equal(result.reasoningPosture, "RELATED_AUTHORITY_ONLY_CAUTION");
});

await test("NO_INDEXED_SOURCE adds source-state caution", () => {
  const result = identifyFactGaps({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", authorityState: "NO_INDEXED_SOURCE" });
  assert.match(result.sourceStateCaution, /Indexed authority is not available/i);
});

await test("GENERAL_TAX stays general orientation", () => {
  const result = identifyFactGaps({ query: "/ask Explain tax generally.", mode: "/ask", authorityState: "GENERAL_TAX" });
  assert.equal(result.reasoningPosture, "GENERAL_TAX_ORIENTATION_ONLY");
});

await test("NO_INDEXED_SOURCE /audit does not generate BIR/taxpayer position", () => {
  const result = identifyFactGaps({ query: "/audit Give BIR and taxpayer positions.", mode: "/audit", authorityState: "NO_INDEXED_SOURCE" });
  assertNoProhibitedFields(result);
  assert.match(result.sourceStateCaution, /legal position cannot be formed/i);
});

await test("sourceCoverageNeeds remain separate from user fact gaps", () => {
  const result = identifyFactGaps({
    query: "/tax Is this PEZA sale VAT zero-rated?",
    mode: "/tax",
    missingUserFacts: ["buyer PEZA status"],
    authorityOrSourceCoverageNeeds: ["indexed VAT zero-rating authority"]
  });
  assert.deepEqual(result.sourceCoverageNeeds, ["indexed VAT zero-rating authority"]);
  assert(!result.criticalMissingFacts.includes("indexed VAT zero-rating authority"));
});

await test("fact-gap helper works with issue-framing-engine output", () => {
  const framed = frameTaxIssue({ query: "/tax Is this PEZA sale VAT zero-rated?", mode: "/tax" });
  const result = identifyFactGaps({ query: "/tax Is this PEZA sale VAT zero-rated?", mode: "/tax", ...framed });
  assert.equal(result.issueFamily, framed.issueFamily);
  assert.equal(result.taxType, framed.taxType);
});

await test("fact-gap helper respects reasoning-safety-policy output", () => {
  const safety = applyReasoningSafetyPolicy({ mode: "/audit", authorityState: "NO_INDEXED_SOURCE" });
  const result = identifyFactGaps({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", authorityState: "NO_INDEXED_SOURCE" });
  assert.equal(result.reasoningPosture, safety.safetyPosture);
  assert.equal(result.sourceStateCaution, safety.sourceStateCaution);
});

await test("issue-framing output plus fact-gap output avoids final legal conclusion", () => {
  const framed = frameTaxIssue({ query: "/tax Can this expense be deducted?", mode: "/tax" });
  const result = identifyFactGaps({ query: "/tax Can this expense be deducted?", mode: "/tax", ...framed });
  assertNoProhibitedFields(framed);
  assertNoProhibitedFields(result);
});

await test("missing facts remain separate from source coverage needs after integration", () => {
  const framed = frameTaxIssue({
    query: "/tax Can the client claim NOLCO?",
    mode: "/tax",
    missingUserFacts: ["loss year"],
    authorityOrSourceCoverageNeeds: ["indexed NOLCO authority"]
  });
  const result = identifyFactGaps({ query: "/tax Can the client claim NOLCO?", mode: "/tax", ...framed });
  assert.deepEqual(result.sourceCoverageNeeds, ["indexed NOLCO authority"]);
  assert(!text(result.criticalMissingFacts).includes("indexed NOLCO authority"));
});

await test("/audit NO_INDEXED_SOURCE remains cautious after integration", () => {
  const framed = frameTaxIssue({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", authorityState: "NO_INDEXED_SOURCE" });
  const result = identifyFactGaps({ query: "/audit BIR disallowed NOLCO.", mode: "/audit", ...framed, authorityState: "NO_INDEXED_SOURCE" });
  assert.equal(result.reasoningPosture, "NO_INDEXED_SOURCE_GENERAL_ORIENTATION_ONLY");
  assert.match(result.sourceStateCaution, /Indexed authority is not available/i);
  assertNoProhibitedFields(result);
});

await test("fact-gap output contains no prohibited broad runtime fields", () => {
  const result = identifyFactGaps({ query: "/audit Give full protest strategy and risk score.", mode: "/audit" });
  assertNoProhibitedFields(result);
});

console.log(`\nPATCH-07B-009 narrow fact-gap runtime helper tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
