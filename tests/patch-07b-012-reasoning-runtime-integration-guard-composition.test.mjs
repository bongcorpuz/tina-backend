/**
 * PATCH-07B-012 - Reasoning runtime integration guard and composition tests
 *
 * Run: node tests/patch-07b-012-reasoning-runtime-integration-guard-composition.test.mjs
 */

"use strict";

import assert from "node:assert/strict";

import { assessAuthorityApplicability, buildAuthorityApplicabilityChecklist } from "../authority-applicability-helper.js";
import { buildClientFactChecklistOutput } from "../client-fact-checklist-output.js";
import { identifyFactGaps } from "../fact-gap-helper.js";
import { frameTaxIssue } from "../issue-framing-engine.js";
import { applyReasoningSafetyPolicy } from "../reasoning-safety-policy.js";

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

const PROHIBITED_OVERCLAIM_PATTERNS = [
  /\bwill win\b/i,
  /\bguaranteed\b/i,
  /%\s*chance/i,
  /\bsettle now\b/i,
  /\bignore BIR\b/i,
  /\bthis supersedes\b/i,
  /\bcurrently effective\b/i,
  /\bfinal legal conclusion\b/i,
  /\bfinal tax opinion\b/i
];

const SCENARIOS = [
  {
    id: "ask-general-tax-general-orientation",
    mode: "/ask",
    query: "/ask Explain the general tax treatment of a service payment.",
    authorityState: "GENERAL_TAX",
    authorityType: "GENERAL_TAX_ORIENTATION",
    knownFacts: ["The query asks for general orientation only."],
    missingUserFacts: ["taxpayer type", "taxable period", "transaction type"],
    authorityOrSourceCoverageNeeds: ["specific indexed authority after issue is narrowed"],
    expectedIssueFamily: "GENERAL_TAX_ORIENTATION"
  },
  {
    id: "ask-no-indexed-source-missing-facts",
    mode: "/ask",
    query: "/ask Can this transaction be taxed if no indexed source is available?",
    authorityState: "NO_INDEXED_SOURCE",
    authorityType: "UNKNOWN_OR_UNAVAILABLE",
    knownFacts: ["The indexed source is not available."],
    missingUserFacts: ["taxpayer type", "transaction type", "taxable period"],
    authorityOrSourceCoverageNeeds: ["indexed authority before legal support can be claimed"]
  },
  {
    id: "tax-authority-found-missing-facts",
    mode: "/tax",
    query: "/tax Can the client deduct this business expense?",
    authorityState: "AUTHORITY_FOUND",
    authorityType: "STATUTE",
    knownFacts: ["The client incurred an expense."],
    missingUserFacts: ["tax period", "business connection", "official receipts"],
    authorityOrSourceCoverageNeeds: ["NIRC deductibility source text for the relevant period"]
  },
  {
    id: "tax-related-authority-only-caution",
    mode: "/tax",
    query: "/tax Does this related ruling support deductibility?",
    authorityState: "RELATED_AUTHORITY_ONLY",
    authorityType: "BIR_RULING",
    knownFacts: ["A related ruling was found."],
    missingUserFacts: ["addressee facts", "materially identical facts", "tax period"],
    authorityOrSourceCoverageNeeds: ["direct governing authority before controlling support can be claimed"]
  },
  {
    id: "tax-no-indexed-source-source-coverage-need",
    mode: "/tax",
    query: "/tax Can the client claim NOLCO without indexed source support?",
    authorityState: "NO_INDEXED_SOURCE",
    authorityType: "UNKNOWN_OR_UNAVAILABLE",
    knownFacts: ["The client reports prior losses."],
    missingUserFacts: ["taxable year of loss", "year of intended deduction", "ITR/AFS support"],
    authorityOrSourceCoverageNeeds: ["indexed NOLCO authority and currentness metadata"]
  },
  {
    id: "audit-authority-found-missing-documents",
    mode: "/audit",
    query: "/audit BIR disallowed expense deductions during audit.",
    authorityState: "AUTHORITY_FOUND",
    authorityType: "REGULATION",
    knownFacts: ["The assessment involves expense deductions."],
    missingUserFacts: ["PAN/FAN/FDDA status", "assessment amount", "official receipts"],
    authorityOrSourceCoverageNeeds: ["indexed substantiation regulation for the period"]
  },
  {
    id: "audit-related-authority-no-controlling-authority",
    mode: "/audit",
    query: "/audit A related CTA case discusses a similar VAT issue.",
    authorityState: "RELATED_AUTHORITY_ONLY",
    authorityType: "COURT_DECISION",
    knownFacts: ["A related court decision exists."],
    missingUserFacts: ["procedural posture", "factual similarity", "case finality metadata"],
    authorityOrSourceCoverageNeeds: ["direct governing authority for the audit issue"]
  },
  {
    id: "audit-no-indexed-source-no-positions",
    mode: "/audit",
    query: "/audit Analyze the NOLCO disallowance where no indexed source is available.",
    authorityState: "NO_INDEXED_SOURCE",
    authorityType: "UNKNOWN_OR_UNAVAILABLE",
    knownFacts: ["The audit concerns NOLCO."],
    missingUserFacts: ["taxable year of loss", "ownership continuity", "FAN date"],
    authorityOrSourceCoverageNeeds: ["indexed NOLCO authority before legal support can be claimed"]
  },
  {
    id: "vat-zero-rating-missing-peza-export-customer-facts",
    mode: "/tax",
    query: "/tax Is this PEZA export sale VAT zero-rated?",
    authorityState: "AUTHORITY_FOUND",
    authorityType: "REGULATION",
    knownFacts: ["The seller says the transaction is an export sale."],
    missingUserFacts: ["taxpayer VAT registration", "buyer/customer status", "PEZA/export status if relevant"],
    authorityOrSourceCoverageNeeds: ["indexed VAT zero-rating authority and effective-period support"]
  },
  {
    id: "cwt-form-2307-missing-reconciliation-documents",
    mode: "/tax",
    query: "/tax Can the client claim CWT based on Form 2307?",
    authorityState: "AUTHORITY_FOUND",
    authorityType: "REGULATION",
    knownFacts: ["The client has some Form 2307 certificates."],
    missingUserFacts: ["amount of income", "amount of CWT", "matching to sales/SLSP/GL"],
    authorityOrSourceCoverageNeeds: ["indexed CWT/Form 2307 authority for credit support"]
  },
  {
    id: "bir-audit-procedure-missing-loa-pan-fan-fdda-protest-stage",
    mode: "/audit",
    query: "/audit LOA, PAN, FAN, FDDA and protest-stage facts are incomplete.",
    authorityState: "AUTHORITY_FOUND",
    authorityType: "PROCEDURAL_NOTICE",
    knownFacts: ["The taxpayer received assessment notices."],
    missingUserFacts: ["LOA date", "PAN/FAN/FDDA status", "protest deadline", "documents received"],
    authorityOrSourceCoverageNeeds: ["indexed procedural authority for the exact assessment stage"]
  },
  {
    id: "nolco-missing-year-ownership-itr-afs-facts",
    mode: "/tax",
    query: "/tax Can the client claim NOLCO this year?",
    authorityState: "AUTHORITY_FOUND",
    authorityType: "STATUTE",
    knownFacts: ["The client has a claimed prior loss."],
    missingUserFacts: ["taxable year of loss", "whether substantial change in ownership occurred", "ITR/AFS support"],
    authorityOrSourceCoverageNeeds: ["indexed NOLCO authority and currentness metadata if period-sensitive"]
  }
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

function composeReasoningHelpers(input) {
  const issueFrame = frameTaxIssue(input);
  const safetyPolicy = applyReasoningSafetyPolicy({
    ...input,
    issueFrameResult: issueFrame
  });
  const factGaps = identifyFactGaps({
    ...input,
    issueFrameResult: issueFrame,
    safetyPolicyResult: safetyPolicy
  });
  const clientFactChecklist = buildClientFactChecklistOutput({
    ...input,
    issueFrameResult: issueFrame,
    safetyPolicyResult: safetyPolicy,
    factGapResult: factGaps
  });
  const authorityApplicability = assessAuthorityApplicability({
    ...input,
    issueFrameResult: issueFrame,
    safetyPolicyResult: safetyPolicy,
    factGapResult: factGaps
  });
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

function serialize(value) {
  return JSON.stringify(value);
}

function flattenStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(flattenStrings);
  return [];
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

function assertNoUnsafeOverclaimStrings(composed) {
  const strings = flattenStrings(composed);
  for (const phrase of strings) {
    if (/^\s*Do not\b/i.test(phrase)) continue;
    for (const pattern of PROHIBITED_OVERCLAIM_PATTERNS) {
      assert(!pattern.test(phrase), `unexpected unsafe overclaim phrase: ${phrase}`);
    }
  }

  const output = serialize(composed);
  assert(!/"riskScore"\s*:/.test(output), "riskScore field leaked into serialized output");
  assert(!/"riskLevel"\s*:/.test(output), "riskLevel field leaked into serialized output");
}

function assertDisjoint(left, right, label) {
  for (const item of left) {
    assert(!right.includes(item), `${label} conflates ${item}`);
  }
}

function missingFactBuckets(factGaps) {
  return [
    ...factGaps.criticalMissingFacts,
    ...factGaps.helpfulMissingFacts,
    ...factGaps.documentGaps,
    ...factGaps.timingOrPeriodGaps,
    ...factGaps.taxpayerStatusGaps,
    ...factGaps.transactionCharacterGaps,
    ...factGaps.assessmentStageGaps
  ];
}

function checklistQuestionBuckets(clientFactChecklist) {
  return [
    ...clientFactChecklist.criticalQuestions,
    ...clientFactChecklist.helpfulQuestions,
    ...clientFactChecklist.documentRequests,
    ...clientFactChecklist.timingAndPeriodQuestions,
    ...clientFactChecklist.taxpayerStatusQuestions,
    ...clientFactChecklist.transactionCharacterQuestions,
    ...clientFactChecklist.assessmentStageQuestions
  ];
}

function assertCommonCompositionGuards(input, composed) {
  assert.equal(composed.issueFrame.implementationScope, "ISSUE_FRAMING_ONLY");
  assert.equal(composed.factGaps.implementationScope, "FACT_GAP_HELPER_ONLY");
  assert.equal(composed.clientFactChecklist.implementationScope, "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY");
  assert.equal(composed.authorityApplicability.implementationScope, "AUTHORITY_APPLICABILITY_HELPER_ONLY");
  assert.equal(composed.authorityApplicabilityChecklist.implementationScope, "AUTHORITY_APPLICABILITY_HELPER_ONLY");

  assert.deepEqual(composed.factGaps.sourceCoverageNeeds, input.authorityOrSourceCoverageNeeds);
  assert.deepEqual(composed.clientFactChecklist.sourceCoverageNeeds, input.authorityOrSourceCoverageNeeds);
  assert.deepEqual(composed.authorityApplicability.sourceCoverageNeeds, input.authorityOrSourceCoverageNeeds);
  assert.deepEqual(composed.authorityApplicabilityChecklist.sourceCoverageNeeds, input.authorityOrSourceCoverageNeeds);

  assertDisjoint(composed.factGaps.sourceCoverageNeeds, missingFactBuckets(composed.factGaps), "source/missing fact");
  assertDisjoint(composed.clientFactChecklist.sourceCoverageNeeds, checklistQuestionBuckets(composed.clientFactChecklist), "source/checklist");

  for (const knownFact of input.knownFacts) {
    assert(composed.issueFrame.knownFacts.includes(knownFact), `known fact not preserved: ${knownFact}`);
    assert(composed.factGaps.knownFacts.includes(knownFact), `known fact not preserved in fact gaps: ${knownFact}`);
    assert(!missingFactBuckets(composed.factGaps).includes(knownFact), `known fact treated as missing: ${knownFact}`);
  }

  for (const missingFact of input.missingUserFacts) {
    assert(!composed.factGaps.knownFacts.includes(missingFact), `missing fact treated as known: ${missingFact}`);
    assert(composed.authorityApplicability.missingApplicabilityFacts.includes(missingFact), `missing fact not preserved: ${missingFact}`);
  }

  assert.match(composed.safetyPolicy.modeBoundary, new RegExp(input.mode.replace("/", "\\/")));
  assert.match(composed.clientFactChecklist.modeBoundaryCaution, /checklist only/i);
  assert.equal(composed.authorityApplicability.canReachFinalConclusion, false);
  assertNoProhibitedFields(composed);
  assertNoUnsafeOverclaimStrings(composed);

  if (composed.authorityApplicability.phase10DependencyFlags.length > 0) {
    assert(composed.authorityApplicability.applicabilityCaution.some((item) => /flags are preserved/i.test(item)));
    assert(!Object.hasOwn(composed.authorityApplicability, "effectiveDateConclusion"));
    assert(!Object.hasOwn(composed.authorityApplicability, "supersessionConclusion"));
    assert(!Object.hasOwn(composed.authorityApplicability, "authorityConflictResolution"));
  }
}

function assertAuthorityStateGuards(input, composed) {
  if (input.authorityState === "NO_INDEXED_SOURCE") {
    assert(composed.safetyPolicy.sourceStateCaution);
    assert(composed.issueFrame.sourceStateCaution);
    assert(composed.factGaps.sourceStateCaution);
    assert(composed.clientFactChecklist.sourceStateCaution);
    assert(composed.authorityApplicability.sourceStateCaution);
    assert.equal(composed.authorityApplicability.applicabilityLevel, "NO_INDEXED_AUTHORITY_AVAILABLE");
    assert.equal(composed.authorityApplicability.canUseAsControllingAuthority, false);
    assert.equal(composed.authorityApplicability.canReachFinalConclusion, false);
  }

  if (input.authorityState === "RELATED_AUTHORITY_ONLY") {
    assert(composed.safetyPolicy.sourceStateCaution === null || /Indexed authority|Related authority/i.test(serialize(composed)));
    assert.equal(composed.authorityApplicability.canUseAsControllingAuthority, false);
    assert.notEqual(composed.authorityApplicability.applicabilityLevel, "DIRECTLY_APPLICABLE_IF_FACTS_MATCH");
    assert(composed.authorityApplicability.prohibitedConclusions.some((item) => /related authority|related.*controlling|controlling support/i.test(item)));
  }

  if (input.authorityState === "GENERAL_TAX") {
    assert.equal(composed.safetyPolicy.safetyPosture, "GENERAL_TAX_ORIENTATION_ONLY");
    assert.equal(composed.authorityApplicability.canUseAsControllingAuthority, false);
    assert(composed.authorityApplicability.prohibitedConclusions.some((item) => /exact authority/i.test(item)));
  }

  if (input.authorityState === "AUTHORITY_FOUND") {
    assert(composed.authorityApplicability.missingApplicabilityFacts.length > 0);
    assert.equal(composed.authorityApplicability.canReachFinalConclusion, false);
  }
}

function assertModeGuards(input, composed) {
  if (input.mode === "/ask") {
    assert.match(composed.clientFactChecklist.modeBoundaryCaution, /\/ask fact-gathering checklist only/i);
    assert.doesNotMatch(serialize(composed), /memo conclusion|audit defense language/i);
  }

  if (input.mode === "/tax") {
    assert.match(composed.clientFactChecklist.modeBoundaryCaution, /\/tax memo-preparation checklist only/i);
    assert.equal(composed.authorityApplicability.canReachFinalConclusion, false);
    assert(!Object.hasOwn(composed.authorityApplicability, "legalConclusion"));
    assert(!Object.hasOwn(composed, "finalTaxOpinion"));
  }

  if (input.mode === "/audit") {
    assert.match(composed.clientFactChecklist.modeBoundaryCaution, /\/audit fact and document checklist only/i);
    assert.doesNotMatch(serialize(composed), /ctaStrategy|settlementRecommendation|protestStrategy|riskLevel|riskScore/i);
  }
}

for (const scenario of SCENARIOS) {
  await test(`composes safely: ${scenario.id}`, () => {
    const composed = composeReasoningHelpers(scenario);
    assertCommonCompositionGuards(scenario, composed);
    assertAuthorityStateGuards(scenario, composed);
    assertModeGuards(scenario, composed);
    if (scenario.expectedIssueFamily) {
      assert.equal(composed.issueFrame.issueFamily, scenario.expectedIssueFamily);
    }
  });
}

await test("NO_INDEXED_SOURCE never produces direct authority support", () => {
  const composed = composeReasoningHelpers(SCENARIOS.find((scenario) => scenario.id === "ask-no-indexed-source-missing-facts"));
  assert.equal(composed.authorityApplicability.applicabilityLevel, "NO_INDEXED_AUTHORITY_AVAILABLE");
  assert.equal(composed.authorityApplicability.canUseAsControllingAuthority, false);
  assert(composed.authorityApplicability.prohibitedConclusions.some((item) => /direct authority|direct legal support/i.test(item)));
});

await test("RELATED_AUTHORITY_ONLY never produces controlling authority", () => {
  const composed = composeReasoningHelpers(SCENARIOS.find((scenario) => scenario.id === "tax-related-authority-only-caution"));
  assert.equal(composed.authorityApplicability.applicabilityLevel, "RELATED_SUPPORTING_ONLY");
  assert.equal(composed.authorityApplicability.canUseAsControllingAuthority, false);
});

await test("GENERAL_TAX never produces exact authority claim", () => {
  const composed = composeReasoningHelpers(SCENARIOS.find((scenario) => scenario.id === "ask-general-tax-general-orientation"));
  assert.equal(composed.authorityApplicability.applicabilityLevel, "BACKGROUND_OR_ORIENTATION_ONLY");
  assert.equal(composed.authorityApplicability.canUseAsControllingAuthority, false);
});

await test("AUTHORITY_FOUND preserves missing facts and phase 10 flags remain flags only", () => {
  const composed = composeReasoningHelpers({
    ...SCENARIOS.find((scenario) => scenario.id === "nolco-missing-year-ownership-itr-afs-facts"),
    query: "/tax Can the client claim old-period NOLCO; preserve currentness and effective-date review flags.",
    authorityOrSourceCoverageNeeds: ["official source metadata and currentness review for NOLCO authority"]
  });
  assert(composed.authorityApplicability.missingApplicabilityFacts.includes("taxable year of loss"));
  assert(composed.authorityApplicability.phase10DependencyFlags.length > 0);
  assert.equal(composed.authorityApplicability.canReachFinalConclusion, false);
  assertNoProhibitedFields(composed);
});

console.log(`\nPATCH-07B-012 reasoning runtime integration guard composition tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
