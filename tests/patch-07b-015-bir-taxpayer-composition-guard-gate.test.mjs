/**
 * PATCH-07B-015 - BIR vs taxpayer position runtime composition guard and gate
 *
 * Run: node tests/patch-07b-015-bir-taxpayer-composition-guard-gate.test.mjs
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
import {
  assessBirTaxpayerPositions,
  buildPositionFramingChecklist
} from "../bir-vs-taxpayer-position-helper.js";

const FIXTURE_005 = resolve("evaluation", "fixtures", "phase-7b-005-bir-vs-taxpayer-position.fixture.json");
const FIXTURE_006 = resolve("evaluation", "fixtures", "phase-7b-006-audit-defense-risk-language.fixture.json");
const FIXTURE_007 = resolve("evaluation", "fixtures", "phase-7b-007-reasoning-safety-source-state-guards.fixture.json");

const PROHIBITED_FIELDS = [
  "riskScore",
  "riskLevel",
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

const UNSAFE_PATTERNS = [
  /\bBIR will win\b/i,
  /\btaxpayer will win\b/i,
  /\bwill win\b/i,
  /\bguaranteed\b/i,
  /%\s*chance/i,
  /\brisk score\b/i,
  /\brisk level\b/i,
  /\bsettle now\b/i,
  /\bignore BIR\b/i,
  /\bassessment is void\b/i,
  /\bBIR has no case\b/i,
  /\bfinal legal conclusion\b/i,
  /\bfinal tax opinion\b/i,
  /\bthis supersedes\b/i,
  /\bcurrently effective\b/i
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

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean) : [String(value).trim()].filter(Boolean);
}

function unique(values = []) {
  return [...new Set(safeArray(values))];
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

function assertNoProhibitedFields(value) {
  const fields = collectFieldNames(value);
  for (const field of PROHIBITED_FIELDS) {
    assert(!fields.includes(field), `prohibited field leaked: ${field}`);
  }
}

function allowedPolicyPath(path, value) {
  return /^\s*Do not\b/i.test(value) ||
    /\.prohibited/.test(path) ||
    /\.requiredCautions/.test(path) ||
    /\.requiredCaution/.test(path) ||
    /\.modeBoundary/.test(path) ||
    /\.modeBoundaryCaution/.test(path) ||
    /\.sourceStateCaution/.test(path) ||
    /\.authorityCautions/.test(path) ||
    /\.factCautions/.test(path) ||
    /\.numericRiskPolicy/.test(path) ||
    /\.guaranteedOutcomePolicy/.test(path) ||
    /\.settlementProtestPolicy/.test(path) ||
    /\.hiddenWeaknessPolicy/.test(path);
}

function assertNoUnsafeGeneratedText(value) {
  for (const entry of collectEntries(value)) {
    if (allowedPolicyPath(entry.path, entry.value)) continue;
    if (/\bcontrolling authority\b/i.test(entry.value)) {
      assert(/not treat|cannot|Do not|prohibit|caution|authorityCautions/i.test(entry.value), `controlling authority conclusion leaked at ${entry.path}: ${entry.value}`);
    }
    for (const pattern of UNSAFE_PATTERNS) {
      assert(!pattern.test(entry.value), `unsafe string leaked at ${entry.path}: ${entry.value}`);
    }
  }
}

function assertDisjoint(left, right, label) {
  const rightSet = new Set(safeArray(right).map((item) => item.toLowerCase()));
  for (const item of safeArray(left)) {
    assert(!rightSet.has(item.toLowerCase()), `${label} conflates ${item}`);
  }
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

function composePhase7BAdversarialChain(input) {
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
  const positionChecklist = buildPositionFramingChecklist(birTaxpayerPositions);

  return {
    issueFrame,
    safetyPolicy,
    factGaps,
    clientFactChecklist,
    authorityApplicability,
    adversarialContentSafety,
    birTaxpayerPositions,
    positionChecklist
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
      "Form 2307 provided but not yet verified",
      "matching to sales/SLSP/GL provided but not yet verified"
    ],
    missingUserFacts: [],
    requiredDocuments: [],
    sourceCoverageNeeds: [],
    documentsComplete: true,
    requiredDocumentsSatisfied: true,
    strongestSupport: [],
    weakestFactsOrDocuments: [],
    ...overrides
  };
}

const SCENARIOS = [
  {
    id: "ask-general-tax-general-orientation",
    input: baseInput({
      mode: "/ask",
      query: "/ask Explain the general tax treatment of service payments.",
      authorityState: "GENERAL_TAX",
      sourceAvailabilityState: "GENERAL_TAX",
      authorityType: "GENERAL_TAX_ORIENTATION",
      knownFacts: ["general orientation requested"],
      missingUserFacts: ["taxpayer type", "taxable period", "transaction type"],
      sourceCoverageNeeds: ["specific indexed authority after issue is narrowed"]
    })
  },
  {
    id: "ask-no-indexed-source-no-framing",
    input: baseInput({
      mode: "/ask",
      query: "/ask Can this be taxed without indexed source support?",
      authorityState: "NO_INDEXED_SOURCE",
      sourceAvailabilityState: "NO_INDEXED_SOURCE",
      authorityType: "UNKNOWN_OR_UNAVAILABLE",
      knownFacts: ["no indexed source is available"],
      missingUserFacts: ["taxpayer type", "transaction type", "taxable period"],
      sourceCoverageNeeds: ["indexed authority before legal support can be claimed"]
    })
  },
  {
    id: "tax-authority-found-sufficient-framing",
    input: baseInput()
  },
  {
    id: "tax-authority-found-missing-facts-documents",
    input: baseInput({
      query: "/tax Can the client defend expense substantiation?",
      missingUserFacts: ["tax period", "business connection", "official receipts"],
      requiredDocuments: ["official receipts needed to support position"],
      providedDocuments: []
    })
  },
  {
    id: "tax-related-authority-limited-framing",
    input: baseInput({
      authorityState: "RELATED_AUTHORITY_ONLY",
      sourceAvailabilityState: "RELATED_AUTHORITY_ONLY",
      authorityType: "BIR_RULING",
      sourceCoverageNeeds: ["direct authority needed before stronger support can be claimed"]
    })
  },
  {
    id: "audit-no-indexed-source-no-position-framing",
    input: baseInput({
      mode: "/audit",
      query: "/audit Analyze NOLCO disallowance with no indexed source.",
      authorityState: "NO_INDEXED_SOURCE",
      sourceAvailabilityState: "NO_INDEXED_SOURCE",
      authorityType: "UNKNOWN_OR_UNAVAILABLE",
      missingUserFacts: ["LOA date", "PAN/FAN/FDDA status", "taxable year of loss"],
      sourceCoverageNeeds: ["indexed NOLCO authority before position framing"]
    })
  },
  {
    id: "audit-authority-found-missing-procedure",
    input: baseInput({
      mode: "/audit",
      query: "/audit BIR disallowed expenses but LOA and notices are incomplete.",
      authorityType: "PROCEDURAL_NOTICE",
      missingUserFacts: ["LOA date", "tax types covered", "PAN/FAN/FDDA status", "assessment stage"],
      requiredDocuments: ["assessment notices needed to support position"]
    })
  },
  {
    id: "audit-authority-found-sufficient-procedure",
    input: baseInput({
      mode: "/audit",
      query: "/audit BIR assessed EWT on service payments; frame positions cautiously.",
      authorityType: "REGULATION",
      knownFacts: [
        "taxpayer type corporate",
        "taxable period 2024",
        "transaction type EWT service payments",
        "amount material",
        "LOA dated 2025-01-10",
        "tax type covered EWT",
        "PAN received",
        "FAN received",
        "assessment stage FAN response",
        "service type identified",
        "covered periods identified",
        "amounts identified",
        "withholding remittance proof identified"
      ],
      providedDocuments: ["LOA provided but not yet verified", "PAN/FAN schedules provided but not yet verified"],
      documentsComplete: true,
      requiredDocumentsSatisfied: true
    })
  },
  {
    id: "vat-zero-rating-missing-peza-export-customer-facts",
    input: baseInput({
      query: "/tax Is this PEZA export sale VAT zero-rated?",
      authorityType: "REGULATION",
      knownFacts: ["seller says transaction is export sale"],
      missingUserFacts: ["taxpayer VAT registration", "buyer/customer status", "PEZA/export status if relevant"],
      sourceCoverageNeeds: ["indexed VAT zero-rating authority and effective-period support"]
    })
  },
  {
    id: "cwt-2307-missing-reconciliation-documents",
    input: baseInput({
      query: "/tax Can the client claim CWT based on Form 2307?",
      knownFacts: ["client has some Form 2307 certificates"],
      missingUserFacts: ["amount of income", "amount of CWT", "matching to sales/SLSP/GL"],
      requiredDocuments: ["Form 2307 needed to support position", "reconciliation schedule needed to support position"],
      sourceCoverageNeeds: ["indexed CWT/Form 2307 authority for credit support"]
    })
  },
  {
    id: "bir-audit-procedure-missing-assessment-stage",
    input: baseInput({
      mode: "/audit",
      query: "/audit LOA, PAN, FAN, FDDA, and protest-stage facts are incomplete.",
      authorityType: "PROCEDURAL_NOTICE",
      knownFacts: ["taxpayer received assessment notices"],
      missingUserFacts: ["LOA date", "PAN/FAN/FDDA status", "protest deadline", "documents received"],
      sourceCoverageNeeds: ["indexed procedural authority for the exact assessment stage"]
    })
  },
  {
    id: "nolco-missing-period-ownership-itr-afs",
    input: baseInput({
      query: "/tax Can the client claim NOLCO this year?",
      authorityType: "STATUTE",
      knownFacts: ["client has a claimed prior loss"],
      missingUserFacts: ["taxable year of loss", "whether substantial change in ownership occurred", "ITR/AFS support"],
      requiredDocuments: ["ITR/AFS support needed to evaluate position"],
      sourceCoverageNeeds: ["indexed NOLCO authority and currentness metadata if period-sensitive"]
    })
  }
];

function assertScopes(composed) {
  assert.equal(composed.issueFrame.implementationScope, "ISSUE_FRAMING_ONLY");
  assert.equal(composed.factGaps.implementationScope, "FACT_GAP_HELPER_ONLY");
  assert.equal(composed.clientFactChecklist.implementationScope, "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY");
  assert.equal(composed.authorityApplicability.implementationScope, "AUTHORITY_APPLICABILITY_HELPER_ONLY");
  assert.equal(composed.adversarialContentSafety.implementationScope, "ADVERSARIAL_CONTENT_SAFETY_POLICY_ONLY");
  assert.equal(composed.birTaxpayerPositions.implementationScope, "BIR_TAXPAYER_POSITION_HELPER_ONLY");
}

function assertHardFalse(composed) {
  assert.equal(composed.birTaxpayerPositions.canReachFinalConclusion, false);
  assert.equal(composed.birTaxpayerPositions.canScoreRisk, false);
  assert.equal(composed.birTaxpayerPositions.canRecommendSettlement, false);
  assert.equal(composed.positionChecklist.canReachFinalConclusion, false);
  assert.equal(composed.positionChecklist.canScoreRisk, false);
  assert.equal(composed.positionChecklist.canRecommendSettlement, false);
}

function assertSeparation(composed) {
  assertDisjoint(composed.factGaps.sourceCoverageNeeds, allFactGapItems(composed.factGaps), "source/fact gaps");
  assertDisjoint(composed.factGaps.documentGaps, composed.factGaps.sourceCoverageNeeds, "document/source gaps");
  assertDisjoint(composed.authorityApplicability.sourceCoverageNeeds, composed.authorityApplicability.missingApplicabilityFacts, "authority applicability/source gaps");
}

function assertPhase10FlagsOnly(composed) {
  const flags = unique([
    ...safeArray(composed.authorityApplicability.phase10DependencyFlags),
    ...safeArray(composed.birTaxpayerPositions.phase10DependencyFlags)
  ]);
  if (flags.length > 0) {
    assert(composed.birTaxpayerPositions.authorityCautions.some((item) => /Phase 10|dependency flags|unresolved/i.test(item)));
  }
  assertNoUnsafeGeneratedText({
    authorityApplicability: composed.authorityApplicability,
    birTaxpayerPositions: composed.birTaxpayerPositions,
    positionChecklist: composed.positionChecklist
  });
}

function assertPositionSafety(composed) {
  const result = composed.birTaxpayerPositions;
  assert.equal(result.adversarialSafety.finalAssertion.safe, true, result.adversarialSafety.finalAssertion.violations?.join("; "));
  const safety = assertAdversarialSafety(safetyProjectionForPositions(result), {
    authorityState: result.sourceStateCaution?.includes("Indexed authority is not available") ? "NO_INDEXED_SOURCE" : "AUTHORITY_FOUND",
    phase10DependencyFlags: result.phase10DependencyFlags
  });
  assert.equal(safety.safe, true, safety.violations.join("; "));

  if (result.birPositionFraming) {
    assert(result.birPositionFraming.possibleBirTheory);
    assert(result.birPositionFraming.weaknessesInBirPosition.length > 0);
    assert.match(result.birPositionFraming.possibleBirTheory, /may|possible|limited illustrative/i);
    assertNoUnsafeGeneratedText(result.birPositionFraming);
  }
  if (result.taxpayerPositionFraming) {
    assert(result.taxpayerPositionFraming.possibleTaxpayerDefense);
    assert(result.taxpayerPositionFraming.weaknessesInTaxpayerPosition.length > 0);
    assert.match(result.taxpayerPositionFraming.possibleTaxpayerDefense, /may|possible|limited illustrative/i);
    assertNoUnsafeGeneratedText(result.taxpayerPositionFraming);
  }
  if (result.strongestSupport.length > 0 || result.weakestFactsOrDocuments.length > 0) {
    assert(result.strongestSupport.length > 0);
    assert(result.weakestFactsOrDocuments.length > 0);
  }
}

function assertAuthorityStateGate(input, composed) {
  const positions = composed.birTaxpayerPositions;
  if (input.authorityState === "NO_INDEXED_SOURCE") {
    assert.equal(positions.birPositionFraming, null);
    assert.equal(positions.taxpayerPositionFraming, null);
    assert.equal(positions.canFramePositions, false);
    assert.equal(composed.adversarialContentSafety.canGenerateBirTaxpayerFraming, false);
    assert(positions.prohibitedConclusions.some((item) => /direct authority support|unavailable indexed sources/i.test(item)));
  }
  if (input.authorityState === "GENERAL_TAX") {
    assert.equal(positions.birPositionFraming, null);
    assert.equal(positions.taxpayerPositionFraming, null);
    assert.equal(positions.canFramePositions, false);
    assert(positions.prohibitedConclusions.some((item) => /exact authority|specific BIR\/taxpayer legal position/i.test(item)));
  }
  if (input.authorityState === "RELATED_AUTHORITY_ONLY") {
    assert.doesNotMatch(JSON.stringify(positions), /\bcontrolling authority conclusion\b/i);
    if (positions.birPositionFraming || positions.taxpayerPositionFraming) {
      assert.equal(positions.controversyPosture, "RELATED_AUTHORITY_ONLY_LIMITED_POSITION_FRAMING");
      assert.match(JSON.stringify(positions), /limited|illustrative|cautious|supporting only/i);
    }
  }
  if (input.authorityState === "AUTHORITY_FOUND") {
    for (const fact of safeArray(input.missingUserFacts)) {
      assert(JSON.stringify(positions).includes(fact), `missing fact hidden: ${fact}`);
    }
    if (positions.birPositionFraming) assert(positions.birPositionFraming.weaknessesInBirPosition.length > 0);
    if (positions.taxpayerPositionFraming) assert(positions.taxpayerPositionFraming.weaknessesInTaxpayerPosition.length > 0);
    if (positions.phase10DependencyFlags.length > 0) {
      assert.notEqual(positions.controversyPosture, "POSITION_FRAMING_ALLOWED_WITH_CAUTION");
    }
  }
}

function assertAuditGate(input, composed) {
  if (input.mode !== "/audit") return;
  const positions = composed.birTaxpayerPositions;
  assert(positions.proceduralPosture);
  if (/\bLOA|PAN|FAN|FDDA|assessment stage|protest deadline/i.test(safeArray(input.missingUserFacts).join(" "))) {
    assert.equal(positions.canFramePositions, false);
    assert.match(positions.controversyPosture, /PROCEDURAL_STAGE|NO_INDEXED_SOURCE|FACTS_OR_DOCUMENTS/i);
  }
  assertNoProhibitedFields(positions);
  assertNoUnsafeGeneratedText(positions);
}

function assertCommonScenario(input, composed) {
  assertScopes(composed);
  assertHardFalse(composed);
  assertSeparation(composed);
  assertNoProhibitedFields(composed);
  assertNoUnsafeGeneratedText(composed);
  assertPhase10FlagsOnly(composed);
  assertPositionSafety(composed);
  assertAuthorityStateGate(input, composed);
  assertAuditGate(input, composed);
  assertNoUnsafeGeneratedText(composed.positionChecklist);
}

for (const scenario of SCENARIOS) {
  await test(`composes full Phase 7B adversarial chain safely: ${scenario.id}`, () => {
    const composed = composePhase7BAdversarialChain(scenario.input);
    assertCommonScenario(scenario.input, composed);
  });
}

await test("PATCH-07B-005 fixture representative cases preserve BIR/taxpayer source-state boundaries", () => {
  const fixture = loadFixture(FIXTURE_005);
  const cases = [
    fixture.cases.find((item) => item.authorityState === "AUTHORITY_FOUND"),
    fixture.cases.find((item) => item.authorityState === "RELATED_AUTHORITY_ONLY"),
    fixture.cases.find((item) => item.authorityState === "NO_INDEXED_SOURCE"),
    fixture.cases.find((item) => item.authorityState === "GENERAL_TAX")
  ].filter(Boolean);
  assert(cases.length >= 4);

  for (const testCase of cases) {
    const input = baseInput({
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
    });
    const composed = composePhase7BAdversarialChain(input);
    assertCommonScenario(input, composed);
  }
});

await test("PATCH-07B-006 fixture representative cases do not produce risk, exposure, settlement, or protest output", () => {
  const fixture = loadFixture(FIXTURE_006);
  const cases = fixture.cases.slice(0, 6);
  assert(cases.length >= 6);
  for (const testCase of cases) {
    const input = baseInput({
      mode: testCase.mode,
      query: testCase.query,
      authorityState: testCase.authorityState,
      sourceAvailabilityState: testCase.sourceAvailabilityState,
      knownFacts: testCase.knownFacts,
      missingUserFacts: testCase.missingUserFacts,
      sourceCoverageNeeds: testCase.authorityOrSourceCoverageNeeds
    });
    const composed = composePhase7BAdversarialChain(input);
    assertNoProhibitedFields(composed);
    assertNoUnsafeGeneratedText(composed);
    assert.equal(composed.birTaxpayerPositions.canScoreRisk, false);
    assert.equal(composed.birTaxpayerPositions.canRecommendSettlement, false);
  }
});

await test("PATCH-07B-007 fixture representative source-state boundaries are preserved", () => {
  const fixture = loadFixture(FIXTURE_007);
  const cases = [
    fixture.cases.find((item) => item.authorityState === "NO_INDEXED_SOURCE"),
    fixture.cases.find((item) => item.authorityState === "GENERAL_TAX"),
    fixture.cases.find((item) => item.authorityState === "RELATED_AUTHORITY_ONLY"),
    fixture.cases.find((item) => item.authorityState === "AUTHORITY_FOUND")
  ].filter(Boolean);
  assert(cases.length >= 4);
  for (const testCase of cases) {
    const input = baseInput({
      mode: testCase.mode,
      query: testCase.query,
      authorityState: testCase.authorityState,
      sourceAvailabilityState: testCase.sourceAvailabilityState,
      knownFacts: testCase.knownFacts,
      missingUserFacts: testCase.missingUserFacts,
      sourceCoverageNeeds: testCase.authorityOrSourceCoverageNeeds
    });
    const composed = composePhase7BAdversarialChain(input);
    assertAuthorityStateGate(input, composed);
    assertNoProhibitedFields(composed);
    assertNoUnsafeGeneratedText(composed);
  }
});

await test("composition gate file does not create a production orchestrator or modify live integration", () => {
  const source = readFileSync(resolve("tests", "patch-07b-015-bir-taxpayer-composition-guard-gate.test.mjs"), "utf8");
  assert.match(source, /function composePhase7BAdversarialChain/);
  assert.doesNotMatch(source, /^export\s+function\s+composePhase7BAdversarialChain/m);
});

console.log(`\nPATCH-07B-015 BIR taxpayer composition guard and gate tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
