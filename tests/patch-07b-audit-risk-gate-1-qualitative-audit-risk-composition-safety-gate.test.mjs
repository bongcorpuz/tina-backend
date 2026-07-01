/**
 * PATCH-07B-AUDIT-RISK-GATE-1 - qualitative audit-risk composition and safety gate
 *
 * Run: node tests/patch-07b-audit-risk-gate-1-qualitative-audit-risk-composition-safety-gate.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { frameTaxIssue } from "../issue-framing-engine.js";
import { applyReasoningSafetyPolicy } from "../reasoning-safety-policy.js";
import { identifyFactGaps } from "../fact-gap-helper.js";
import { buildClientFactChecklistOutput } from "../client-fact-checklist-output.js";
import { assessAuthorityApplicability } from "../authority-applicability-helper.js";
import {
  applyAdversarialContentSafetyPolicy,
  assertAdversarialSafety
} from "../adversarial-content-safety-policy.js";
import { assessBirTaxpayerPositions } from "../bir-vs-taxpayer-position-helper.js";
import {
  assessQualitativeAuditRisk,
  buildAuditRiskLanguageChecklist
} from "../audit-risk-language-helper.js";

const FIXTURE_006 = resolve("evaluation", "fixtures", "phase-7b-006-audit-defense-risk-language.fixture.json");

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

const PROHIBITED_PATTERNS = [
  /\brisk\s+level\b/i,
  /\brisk\s+score\b/i,
  /\bwill\s+win\b/i,
  /\bguaranteed\b/i,
  /%\s*chance/i,
  /\bsettle\s+now\b/i,
  /\bignore\s+BIR\b/i,
  /\bassessment\s+is\s+void\b/i,
  /\bBIR\s+has\s+no\s+case\b/i,
  /\btaxpayer\s+will\s+win\b/i,
  /\bBIR\s+will\s+win\b/i,
  /\bfinal\s+legal\s+conclusion\b/i,
  /\bfinal\s+tax\s+opinion\b/i,
  /\bthis\s+supersedes\b/i,
  /\bcurrently\s+effective\b/i,
  /\bcontrolling\s+authority\s+conclusion\b/i
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

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean) : [String(value).trim()].filter(Boolean);
}

function unique(values = []) {
  return [...new Set(safeArray(values))];
}

function loadFixture(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function collectEntries(value, path = "$") {
  if (typeof value === "string") return [{ path, value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => collectEntries(item, `${path}[${index}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => collectEntries(child, `${path}.${key}`));
  }
  return [];
}

function collectFieldNames(value) {
  if (Array.isArray(value)) return value.flatMap(collectFieldNames);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...collectFieldNames(child)]);
}

function allFactGapItems(factGaps) {
  return [
    ...safeArray(factGaps.criticalMissingFacts),
    ...safeArray(factGaps.helpfulMissingFacts),
    ...safeArray(factGaps.documentGaps),
    ...safeArray(factGaps.timingOrPeriodGaps),
    ...safeArray(factGaps.taxpayerStatusGaps),
    ...safeArray(factGaps.transactionCharacterGaps),
    ...safeArray(factGaps.assessmentStageGaps)
  ];
}

function assertDisjoint(left, right, label) {
  const rightSet = new Set(safeArray(right).map((item) => item.toLowerCase()));
  for (const item of safeArray(left)) {
    assert(!rightSet.has(item.toLowerCase()), `${label} conflates ${item}`);
  }
}

function policyTextPath(path, value) {
  return /^\s*Do not\b/i.test(value) ||
    /\.prohibited/.test(path) ||
    /\.requiredCautions?/.test(path) ||
    /\.modeBoundary/.test(path) ||
    /\.modeBoundaryCaution/.test(path) ||
    /\.sourceStateCaution/.test(path) ||
    /\.authorityCautions?/.test(path) ||
    /\.applicabilityCaution/.test(path) ||
    /\.factCautions?/.test(path) ||
    /\.numericRiskPolicy/.test(path) ||
    /\.guaranteedOutcomePolicy/.test(path) ||
    /\.settlementProtestPolicy/.test(path) ||
    /\.hiddenWeaknessPolicy/.test(path) ||
    /\.phase10DependencyPolicy/.test(path);
}

function assertNoProhibitedFields(value) {
  const fields = collectFieldNames(value);
  for (const field of PROHIBITED_FIELDS) {
    assert(!fields.includes(field), `prohibited field leaked: ${field}`);
  }
}

function assertNoUnsafeGeneratedText(value) {
  for (const { path, value: text } of collectEntries(value)) {
    if (policyTextPath(path, text)) continue;
    for (const pattern of PROHIBITED_PATTERNS) {
      assert(!pattern.test(text), `unsafe generated text leaked at ${path}: ${text}`);
    }
    if (/\bcontrolling\s+authority\b/i.test(text)) {
      assert(/not treat|cannot|prohibit|caution|related/i.test(text), `controlling authority text leaked at ${path}: ${text}`);
    }
  }
}

function safetyProjectionForPositions(positionResult) {
  const clone = { ...positionResult };
  if (clone.birPositionFraming && Array.isArray(clone.birPositionFraming.weaknessesInBirPosition)) {
    clone.weaknessesInBirPosition = clone.birPositionFraming.weaknessesInBirPosition;
  }
  if (clone.taxpayerPositionFraming && Array.isArray(clone.taxpayerPositionFraming.weaknessesInTaxpayerPosition)) {
    clone.weaknessesInTaxpayerPosition = clone.taxpayerPositionFraming.weaknessesInTaxpayerPosition;
  }
  if (clone.birPositionFraming === null) delete clone.birPositionFraming;
  if (clone.taxpayerPositionFraming === null) delete clone.taxpayerPositionFraming;
  return clone;
}

function composePhase7BAuditRiskChain(input) {
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
    factGapResult: factGaps,
    clientFactChecklistResult: clientFactChecklist
  });
  const adversarialContentSafety = applyAdversarialContentSafetyPolicy({
    ...input,
    issueFrameResult: issueFrame,
    safetyPolicyResult: safetyPolicy,
    factGapResult: factGaps,
    clientFactChecklistResult: clientFactChecklist,
    authorityApplicabilityResult: authorityApplicability,
    missingCriticalFacts: [
      ...safeArray(input.missingUserFacts),
      ...safeArray(factGaps.criticalMissingFacts),
      ...safeArray(factGaps.assessmentStageGaps)
    ],
    requiredDocuments: [
      ...safeArray(input.requiredDocuments),
      ...safeArray(factGaps.documentGaps)
    ],
    phase10DependencyFlags: [
      ...safeArray(input.phase10DependencyFlags),
      ...safeArray(authorityApplicability.phase10DependencyFlags)
    ]
  });
  const birTaxpayerPositions = assessBirTaxpayerPositions({
    ...input,
    issueFrameResult: issueFrame,
    safetyPolicyResult: safetyPolicy,
    factGapResult: factGaps,
    clientFactChecklistResult: clientFactChecklist,
    authorityApplicabilityResult: authorityApplicability,
    adversarialContentSafetyResult: adversarialContentSafety
  });
  const qualitativeAuditRisk = assessQualitativeAuditRisk({
    ...input,
    issueFrameResult: issueFrame,
    safetyPolicyResult: safetyPolicy,
    factGapResult: factGaps,
    clientFactChecklistResult: clientFactChecklist,
    authorityApplicabilityResult: authorityApplicability,
    adversarialContentSafetyResult: adversarialContentSafety,
    birTaxpayerPositionResult: birTaxpayerPositions
  });
  const auditRiskChecklist = typeof buildAuditRiskLanguageChecklist === "function"
    ? buildAuditRiskLanguageChecklist({
      ...input,
      issueFrameResult: issueFrame,
      safetyPolicyResult: safetyPolicy,
      factGapResult: factGaps,
      clientFactChecklistResult: clientFactChecklist,
      authorityApplicabilityResult: authorityApplicability,
      adversarialContentSafetyResult: adversarialContentSafety,
      birTaxpayerPositionResult: birTaxpayerPositions,
      qualitativeAuditRiskResult: qualitativeAuditRisk
    })
    : null;

  return {
    issueFrame,
    safetyPolicy,
    factGaps,
    clientFactChecklist,
    authorityApplicability,
    adversarialContentSafety,
    birTaxpayerPositions,
    qualitativeAuditRisk,
    auditRiskChecklist
  };
}

function baseInput(overrides = {}) {
  return {
    mode: "/tax",
    query: "/tax Can the client defend a CWT/Form 2307 mismatch?",
    authorityState: "AUTHORITY_FOUND",
    sourceAvailabilityState: "AUTHORITY_FOUND",
    authorityType: "REGULATION",
    knownFacts: [
      "taxpayer type corporate",
      "taxable period 2024",
      "transaction type CWT/Form 2307 mismatch",
      "amount material",
      "income type service",
      "customer/payor identified",
      "amount of income identified",
      "amount of CWT identified",
      "claimed in ITR identified"
    ],
    providedDocuments: [
      "Form 2307 provided and matched to sales schedule",
      "ITR schedule reconciliation provided"
    ],
    missingUserFacts: [],
    requiredDocuments: [],
    sourceCoverageNeeds: [],
    documentsComplete: true,
    requiredDocumentsSatisfied: true,
    strongestSupport: ["document package appears complete for limited qualitative label"],
    weakestFactsOrDocuments: ["documents remain not independently verified"],
    ...overrides
  };
}

function assertCommonGate(composed) {
  assert.equal(composed.issueFrame.implementationScope, "ISSUE_FRAMING_ONLY");
  assert.equal(composed.factGaps.implementationScope, "FACT_GAP_HELPER_ONLY");
  assert.equal(composed.clientFactChecklist.implementationScope, "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY");
  assert.equal(composed.authorityApplicability.implementationScope, "AUTHORITY_APPLICABILITY_HELPER_ONLY");
  assert.equal(composed.adversarialContentSafety.implementationScope, "ADVERSARIAL_CONTENT_SAFETY_POLICY_ONLY");
  assert.equal(composed.birTaxpayerPositions.implementationScope, "BIR_TAXPAYER_POSITION_HELPER_ONLY");
  assert.equal(composed.qualitativeAuditRisk.implementationScope, "AUDIT_RISK_LANGUAGE_HELPER_ONLY");
  assert.equal(composed.qualitativeAuditRisk.canScoreRisk, false);
  assert.equal(composed.qualitativeAuditRisk.canRecommendSettlement, false);
  assert.equal(composed.qualitativeAuditRisk.canReachFinalConclusion, false);
  assert(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel);
  assert(!Object.hasOwn(composed.qualitativeAuditRisk, "riskLevel"));
  assert(!Object.hasOwn(composed.qualitativeAuditRisk, "riskScore"));
  assertNoProhibitedFields(composed);
  assertNoUnsafeGeneratedText(composed);
  assertDisjoint(composed.factGaps.sourceCoverageNeeds, allFactGapItems(composed.factGaps), "source coverage/user fact gaps");
  assertDisjoint(composed.factGaps.documentGaps, composed.factGaps.sourceCoverageNeeds, "document/source gaps");
  assertDisjoint(composed.authorityApplicability.sourceCoverageNeeds, composed.authorityApplicability.missingApplicabilityFacts, "authority source/applicability gaps");
  assert.equal(composed.qualitativeAuditRisk.adversarialSafety.finalAssertion.safe, true, composed.qualitativeAuditRisk.adversarialSafety.finalAssertion.violations?.join("; "));
  assert.equal(assertAdversarialSafety(composed.qualitativeAuditRisk, {
    authorityState: composed.authorityApplicability.authorityState,
    phase10DependencyFlags: composed.qualitativeAuditRisk.phase10DependencyFlags
  }).safe, true);
  assert.equal(assertAdversarialSafety(safetyProjectionForPositions(composed.birTaxpayerPositions), {
    authorityState: composed.authorityApplicability.authorityState,
    phase10DependencyFlags: composed.birTaxpayerPositions.phase10DependencyFlags
  }).safe, true);
  if (composed.auditRiskChecklist) {
    assert.equal(composed.auditRiskChecklist.implementationScope, "AUDIT_RISK_LANGUAGE_HELPER_ONLY");
    assert.equal(composed.auditRiskChecklist.canScoreRisk, false);
    assert.equal(composed.auditRiskChecklist.canRecommendSettlement, false);
    assert.equal(composed.auditRiskChecklist.canReachFinalConclusion, false);
    assert.equal(composed.auditRiskChecklist.adversarialSafety.finalAssertion.safe, true, composed.auditRiskChecklist.adversarialSafety.finalAssertion.violations?.join("; "));
    assert.equal(assertAdversarialSafety(composed.auditRiskChecklist, {
      authorityState: composed.authorityApplicability.authorityState,
      phase10DependencyFlags: composed.auditRiskChecklist.phase10DependencyFlags
    }).safe, true);
  }
}

const SCENARIOS = [
  {
    id: "ask-general-tax",
    input: baseInput({
      mode: "/ask",
      query: "/ask Explain CWT in general.",
      authorityState: "GENERAL_TAX",
      sourceAvailabilityState: "GENERAL_TAX",
      authorityType: "GENERAL_TAX_ORIENTATION",
      knownFacts: ["general CWT orientation requested"],
      missingUserFacts: ["taxpayer type", "transaction type", "taxable period"],
      sourceCoverageNeeds: ["specific indexed authority after issue is narrowed"]
    }),
    assertSpecific(composed) {
      assert.equal(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel, "INDETERMINATE_DUE_TO_GENERAL_TAX_ONLY");
      assert.notEqual(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
      assert.equal(composed.birTaxpayerPositions.canFramePositions, false);
    }
  },
  {
    id: "ask-no-indexed-source",
    input: baseInput({
      mode: "/ask",
      query: "/ask Can we rely on an unavailable BIR ruling?",
      authorityState: "NO_INDEXED_SOURCE",
      sourceAvailabilityState: "NO_INDEXED_SOURCE",
      authorityType: "UNKNOWN_OR_UNAVAILABLE",
      knownFacts: ["no indexed source is available"],
      sourceCoverageNeeds: ["indexed authority before legal support can be claimed"]
    }),
    assertSpecific(composed) {
      assert.equal(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel, "INDETERMINATE_DUE_TO_NO_INDEXED_SOURCE");
      assert(composed.qualitativeAuditRisk.sourceCoverageNeeds.some((item) => /indexed authority/i.test(item)));
    }
  },
  {
    id: "tax-related-authority-only",
    input: baseInput({
      authorityState: "RELATED_AUTHORITY_ONLY",
      sourceAvailabilityState: "RELATED_AUTHORITY_ONLY",
      authorityType: "BIR_RULING",
      sourceCoverageNeeds: ["direct authority needed before stronger support can be claimed"]
    }),
    assertSpecific(composed) {
      assert([
        "MODERATE_DUE_TO_RELATED_AUTHORITY_ONLY",
        "INDETERMINATE_DUE_TO_RELATED_AUTHORITY_ONLY",
        "INDETERMINATE_DUE_TO_PHASE10_REVIEW_NEEDED",
        "INDETERMINATE_DUE_TO_MISSING_CRITICAL_FACTS",
        "INDETERMINATE_DUE_TO_SOURCE_COVERAGE_NEEDED"
      ].includes(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel));
      assert.notEqual(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
      assert.doesNotMatch(JSON.stringify(composed.qualitativeAuditRisk), /\bexact authority claim\b/i);
    }
  },
  {
    id: "tax-authority-found-missing-critical-facts",
    input: baseInput({
      missingUserFacts: ["specific withholding agent facts", "taxable period coverage"]
    }),
    assertSpecific(composed) {
      assert(["HIGH_DUE_TO_MISSING_CRITICAL_FACTS", "INDETERMINATE_DUE_TO_MISSING_CRITICAL_FACTS"].includes(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel));
      assert(composed.qualitativeAuditRisk.missingCriticalFacts.length > 0);
    }
  },
  {
    id: "tax-authority-found-missing-documents",
    input: baseInput({
      requiredDocuments: ["Form 2307 reconciliation schedule", "withholding agent confirmation"],
      providedDocuments: []
    }),
    assertSpecific(composed) {
      assert([
        "HIGH_DUE_TO_MISSING_DOCUMENTS",
        "INDETERMINATE_DUE_TO_MISSING_DOCUMENTS",
        "INDETERMINATE_DUE_TO_MISSING_CRITICAL_FACTS"
      ].includes(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel));
      assert.notEqual(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
      assert(composed.qualitativeAuditRisk.missingDocuments.length > 0);
    }
  },
  {
    id: "tax-authority-found-strong-facts-documents",
    input: baseInput(),
    assertSpecific(composed) {
      assert([
        "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS",
        "MODERATE_DUE_TO_FACT_MISMATCH",
        "INDETERMINATE_DUE_TO_MISSING_CRITICAL_FACTS",
        "INDETERMINATE_DUE_TO_SOURCE_COVERAGE_NEEDED"
      ].includes(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel));
      assert.equal(composed.qualitativeAuditRisk.canReachFinalConclusion, false);
    }
  },
  {
    id: "tax-authority-found-phase10-flags",
    input: baseInput({
      query: "/tax Apply this historical regulation and confirm whether the old rule is still active.",
      phase10DependencyFlags: ["SOURCE_CURRENTNESS_REVIEW_NEEDED", "HIERARCHY_CONFLICT_REVIEW_NEEDED"],
      sourceCoverageNeeds: []
    }),
    assertSpecific(composed) {
      assert.equal(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel, "INDETERMINATE_DUE_TO_PHASE10_REVIEW_NEEDED");
      assert(composed.qualitativeAuditRisk.phase10DependencyFlags.includes("SOURCE_CURRENTNESS_REVIEW_NEEDED"));
      assert.doesNotMatch(JSON.stringify(composed.qualitativeAuditRisk), /\bcurrently effective\b|\bthis supersedes\b|\bhierarchy is resolved\b/i);
    }
  },
  {
    id: "audit-missing-procedural-facts",
    input: baseInput({
      mode: "/audit",
      query: "/audit BIR assessed CWT disallowance but LOA, PAN, FAN, FDDA, assessment stage, and period facts are incomplete.",
      authorityType: "PROCEDURAL_NOTICE",
      knownFacts: ["taxpayer received assessment notices"],
      missingUserFacts: ["LOA date", "PAN/FAN/FDDA status", "assessment stage", "taxable period"],
      requiredDocuments: ["assessment notices"]
    }),
    assertSpecific(composed) {
      assert(["INDETERMINATE_DUE_TO_PROCEDURAL_FACTS_NEEDED", "HIGH_DUE_TO_PROCEDURAL_FACT_GAPS"].includes(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel));
      assert.equal(composed.birTaxpayerPositions.canFramePositions, false);
    }
  },
  {
    id: "vat-zero-rating-missing-support",
    input: baseInput({
      query: "/tax Is this PEZA export sale VAT zero-rated?",
      authorityType: "REGULATION",
      knownFacts: ["seller says transaction is export sale"],
      missingUserFacts: ["PEZA registration", "export sale support", "customer foreign-currency payment facts"],
      sourceCoverageNeeds: ["indexed VAT zero-rating authority and effective-period support"]
    }),
    assertSpecific(composed) {
      assert.notEqual(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
      assert(composed.qualitativeAuditRisk.missingCriticalFacts.some((item) => /PEZA|export|customer/i.test(item)));
    }
  },
  {
    id: "cwt-form-2307-missing-reconciliation",
    input: baseInput({
      query: "/tax Can the client claim CWT based on Form 2307?",
      knownFacts: ["client has some Form 2307 certificates"],
      missingUserFacts: ["amount of income", "amount of CWT", "matching to sales/SLSP/GL"],
      requiredDocuments: ["Form 2307-to-ITR reconciliation", "corrected withholding certificates"]
    }),
    assertSpecific(composed) {
      assert.notEqual(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
      assert(composed.qualitativeAuditRisk.missingDocuments.some((item) => /2307|reconciliation|certificate/i.test(item)));
    }
  },
  {
    id: "bir-taxpayer-weakness-integration",
    input: baseInput({
      providedDocuments: ["Form 2307 batch is unreconciled and incomplete"],
      weakestFactsOrDocuments: ["Form 2307 schedule mismatch remains unresolved"]
    }),
    assertSpecific(composed) {
      assert(composed.birTaxpayerPositions.weakestFactsOrDocuments.length > 0);
      assert(
        composed.qualitativeAuditRisk.conditionsThatMayIncreaseLabel.some((item) => /mismatch|incomplete|unreconciled|weak/i.test(item)) ||
        composed.qualitativeAuditRisk.conditionsThatMakeLabelIndeterminate.some((item) => /mismatch|incomplete|unreconciled|weak/i.test(item))
      );
    }
  },
  {
    id: "checklist-safety",
    input: baseInput({
      missingUserFacts: ["income inclusion fact"],
      requiredDocuments: ["withholding certificate"]
    }),
    assertSpecific(composed) {
      assert(composed.auditRiskChecklist);
      assert.equal(composed.auditRiskChecklist.checklistType, "QUALITATIVE_AUDIT_RISK_LANGUAGE_CHECKLIST");
      assertNoUnsafeGeneratedText(composed.auditRiskChecklist);
    }
  },
  {
    id: "full-composed-output-safety",
    input: baseInput({
      query: "/audit Give audit label language without settlement, protest, CTA, or final conclusion.",
      mode: "/audit",
      authorityType: "PROCEDURAL_NOTICE",
      knownFacts: [
        "taxpayer type corporate",
        "taxable period 2024",
        "LOA dated 2025-01-10",
        "PAN received",
        "FAN received",
        "FDDA received",
        "assessment stage FAN response",
        "transaction type CWT/Form 2307 mismatch",
        "amount material",
        "income type service",
        "customer/payor identified",
        "amount of income identified",
        "amount of CWT identified"
      ]
    }),
    assertSpecific(composed) {
      assertNoProhibitedFields(composed);
      assertNoUnsafeGeneratedText(composed);
      assert.equal(composed.qualitativeAuditRisk.adversarialSafety.finalAssertion.safe, true);
    }
  }
];

for (const scenario of SCENARIOS) {
  await test(`composes Phase 7B audit-risk chain safely: ${scenario.id}`, () => {
    const composed = composePhase7BAuditRiskChain(scenario.input);
    assertCommonGate(composed);
    scenario.assertSpecific(composed);
  });
}

await test("fixture 006 representative audit-risk cases activate through full composition", () => {
  const fixture = loadFixture(FIXTURE_006);
  const cases = fixture.cases.slice(0, 8);
  assert(cases.length >= 8);

  for (const testCase of cases) {
    const composed = composePhase7BAuditRiskChain(baseInput({
      mode: testCase.mode,
      query: testCase.query,
      authorityState: testCase.authorityState,
      sourceAvailabilityState: testCase.sourceAvailabilityState,
      knownFacts: testCase.knownFacts,
      missingUserFacts: testCase.missingUserFacts,
      sourceCoverageNeeds: testCase.authorityOrSourceCoverageNeeds,
      providedDocuments: testCase.documentStrength === "WEAK_DOCUMENT_SUPPORT" ? ["weak document support"] : ["documents provided for review"],
      documentsComplete: testCase.documentStrength !== "WEAK_DOCUMENT_SUPPORT",
      requiredDocumentsSatisfied: testCase.documentStrength !== "WEAK_DOCUMENT_SUPPORT"
    }));
    assertCommonGate(composed);
    assert(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel);
    if (testCase.documentStrength === "WEAK_DOCUMENT_SUPPORT" || safeArray(testCase.missingUserFacts).length > 0) {
      assert.notEqual(composed.qualitativeAuditRisk.qualitativeAuditRiskLabel, "LOWER_CONCERN_DUE_TO_STRONG_AUTHORITY_AND_DOCUMENTS");
    }
  }
});

await test("gate test remains test-only and does not export a production orchestrator", () => {
  const source = readFileSync(resolve("tests", "patch-07b-audit-risk-gate-1-qualitative-audit-risk-composition-safety-gate.test.mjs"), "utf8");
  assert.match(source, /function composePhase7BAuditRiskChain/);
  assert.doesNotMatch(source, /^export\s+function\s+composePhase7BAuditRiskChain/m);
});

console.log(`\nPATCH-07B-AUDIT-RISK-GATE-1 composition and safety gate tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
