/**
 * PATCH-07B-CLARIFICATION-GATE-2 - clarification helper composition and safety gate
 *
 * Run: node tests/patch-07b-clarification-gate-2-composition-safety-gate.test.mjs
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
import { assessQualitativeAuditRisk } from "../audit-risk-language-helper.js";
import * as clarificationPolicy from "../clarification-boundary-policy.js";

const REQUIRED_OUTPUT_FIELDS = [
  "clarificationDecision",
  "clarificationReason",
  "shouldAskBeforeAnswer",
  "questions",
  "documentRequests",
  "sourceCoverageLimitations",
  "phase10Deferrals",
  "answerAllowed",
  "allowedAnswerPosture",
  "prohibitedConclusions",
  "canReachFinalConclusion",
  "implementationScope"
];

const DECISIONS = [
  "ASK_BEFORE_ANSWERING",
  "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP",
  "REQUEST_DOCUMENTS",
  "DISCLOSE_SOURCE_LIMITATION",
  "DISCLOSE_PHASE10_DEFERRAL",
  "ANSWER_NOW_NO_CLARIFICATION_NEEDED"
];

const POSTURES = [
  "GENERAL_ORIENTATION_ONLY",
  "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS",
  "NO_ANSWER_UNTIL_CLARIFIED"
];

const PROHIBITED_PATTERNS = [
  /\bfinal legal conclusion\b/i,
  /\bfinal tax opinion\b/i,
  /\bfinal audit-defense conclusion\b/i,
  /\bassessment is void\b/i,
  /\bBIR has no case\b/i,
  /\btaxpayer will win\b/i,
  /\bBIR will win\b/i,
  /\bguaranteed\b/i,
  /\bsettle now\b/i,
  /\bsettlement recommendation\b/i,
  /\bprotest strategy\b/i,
  /\bCTA strategy\b/i,
  /\bcompromise amount\b/i,
  /\blitigation strategy\b/i,
  /\bwhat law applies\b/i,
  /\bplease find the regulation\b/i,
  /\bsearch the BIR website\b/i,
  /\bdetermine the governing authority\b/i,
  /\bis this still current\b/i,
  /\bhas this been superseded\b/i,
  /\bwhich authority controls\b/i,
  /\bfind the newer regulation\b/i,
  /\bcheck case status\b/i,
  /\bverify official source metadata\b/i,
  /\bplease prove this qualifies as zero-rated\b/i,
  /\bplease confirm this is legally deductible\b/i,
  /\bplease confirm the assessment is void\b/i,
  /\bTIN\b/i,
  /\bfull address\b/i,
  /\bbank account number\b/i,
  /\bunnecessary personal identifiers\b/i
];

const SCENARIOS = [
  {
    id: "ask-critical-fact-gap-composition",
    mode: "/ask",
    authorityState: "AUTHORITY_FOUND",
    query: "Is this taxpayer subject to withholding?",
    signals: {
      criticalMissingFacts: ["taxpayer type"],
      helpfulMissingFacts: [],
      documentGaps: [],
      sourceCoverageNeeds: [],
      missingApplicabilityFacts: [],
      phase10DependencyFlags: []
    },
    expected: {
      decision: "ASK_BEFORE_ANSWERING",
      shouldAskBeforeAnswer: true,
      answerAllowed: false,
      posture: "NO_ANSWER_UNTIL_CLARIFIED",
      maxQuestions: 3
    }
  },
  {
    id: "ask-helpful-only-gap-composition",
    mode: "/ask",
    authorityState: "AUTHORITY_FOUND",
    query: "Explain the general withholding implication.",
    signals: {
      criticalMissingFacts: [],
      helpfulMissingFacts: ["payment amount", "whether recurring"],
      documentGaps: [],
      sourceCoverageNeeds: [],
      missingApplicabilityFacts: [],
      phase10DependencyFlags: []
    },
    expected: {
      decision: "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP",
      answerAllowed: true,
      posture: "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS",
      maxQuestions: 3
    }
  },
  {
    id: "ask-no-indexed-source-composition",
    mode: "/ask",
    authorityState: "NO_INDEXED_SOURCE",
    query: "What does this unindexed ruling say?",
    signals: {
      criticalMissingFacts: [],
      helpfulMissingFacts: [],
      documentGaps: [],
      sourceCoverageNeeds: ["indexed source support unavailable"],
      missingApplicabilityFacts: [],
      phase10DependencyFlags: []
    },
    expected: {
      decision: "DISCLOSE_SOURCE_LIMITATION",
      shouldAskBeforeAnswer: false,
      sourceLimit: true,
      posture: "GENERAL_ORIENTATION_ONLY",
      maxQuestions: 3
    }
  },
  {
    id: "tax-vat-peza-export-customer-facts-composition",
    mode: "/tax",
    authorityState: "AUTHORITY_FOUND",
    query: "Can this PEZA export sale be zero-rated?",
    issueFamily: "VAT_ZERO_RATING",
    signals: {
      criticalMissingFacts: ["seller VAT registration", "PEZA/export status", "buyer/customer status", "transaction date"],
      helpfulMissingFacts: [],
      documentGaps: [],
      sourceCoverageNeeds: [],
      missingApplicabilityFacts: [],
      phase10DependencyFlags: []
    },
    expected: {
      decision: "ASK_BEFORE_ANSWERING",
      shouldAskBeforeAnswer: true,
      answerAllowed: false,
      posture: "NO_ANSWER_UNTIL_CLARIFIED",
      maxQuestions: 7
    }
  },
  {
    id: "tax-document-gap-composition",
    mode: "/tax",
    authorityState: "AUTHORITY_FOUND",
    query: "Can we support this withholding credit?",
    signals: {
      criticalMissingFacts: [],
      helpfulMissingFacts: [],
      documentGaps: ["Form 2307", "service invoice", "reconciliation schedule"],
      sourceCoverageNeeds: [],
      missingApplicabilityFacts: [],
      phase10DependencyFlags: []
    },
    expected: {
      decision: "REQUEST_DOCUMENTS",
      answerAllowed: true,
      posture: "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS",
      documents: true,
      maxQuestions: 7
    }
  },
  {
    id: "tax-related-authority-composition",
    mode: "/tax",
    authorityState: "RELATED_AUTHORITY_ONLY",
    query: "Apply a related BIR issuance to this transaction.",
    signals: {
      criticalMissingFacts: [],
      helpfulMissingFacts: [],
      documentGaps: [],
      sourceCoverageNeeds: ["direct authority support not available"],
      missingApplicabilityFacts: ["authority applicability fact"],
      phase10DependencyFlags: []
    },
    expected: {
      decisionOneOf: ["DISCLOSE_SOURCE_LIMITATION", "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP"],
      answerAllowed: true,
      sourceLimit: true,
      maxQuestions: 7
    }
  },
  {
    id: "tax-phase10-flags-composition",
    mode: "/tax",
    authorityState: "AUTHORITY_FOUND",
    query: "Can this authority be relied on today?",
    signals: {
      criticalMissingFacts: [],
      helpfulMissingFacts: [],
      documentGaps: [],
      sourceCoverageNeeds: [],
      missingApplicabilityFacts: [],
      phase10DependencyFlags: ["SOURCE_CURRENTNESS_REVIEW_NEEDED", "HIERARCHY_CONFLICT_REVIEW_NEEDED"]
    },
    expected: {
      decision: "DISCLOSE_PHASE10_DEFERRAL",
      phase10: true,
      answerAllowed: true,
      maxQuestions: 7
    }
  },
  {
    id: "tax-authority-found-sufficient-composition",
    mode: "/tax",
    authorityState: "AUTHORITY_FOUND",
    query: "Provide a cautious tax memo with complete facts and documents.",
    signals: {
      criticalMissingFacts: [],
      helpfulMissingFacts: [],
      documentGaps: [],
      sourceCoverageNeeds: [],
      missingApplicabilityFacts: [],
      phase10DependencyFlags: []
    },
    expected: {
      decision: "ANSWER_NOW_NO_CLARIFICATION_NEEDED",
      shouldAskBeforeAnswer: false,
      answerAllowed: true,
      maxQuestions: 7
    }
  },
  {
    id: "audit-missing-procedure-composition",
    mode: "/audit",
    authorityState: "AUTHORITY_FOUND",
    query: "Assess the BIR audit notice.",
    issueFamily: "BIR_AUDIT_PROCEDURE",
    signals: {
      criticalMissingFacts: [],
      helpfulMissingFacts: [],
      documentGaps: [],
      sourceCoverageNeeds: [],
      missingApplicabilityFacts: [],
      assessmentStageGaps: ["current stage", "LOA date", "PAN/FAN/FDDA status", "deadline facts"],
      phase10DependencyFlags: []
    },
    expected: {
      decision: "ASK_BEFORE_ANSWERING",
      shouldAskBeforeAnswer: true,
      answerAllowed: false,
      posture: "NO_ANSWER_UNTIL_CLARIFIED",
      proceduralFirst: true,
      maxQuestions: 10
    }
  },
  {
    id: "audit-known-stage-missing-documents-composition",
    mode: "/audit",
    authorityState: "AUTHORITY_FOUND",
    query: "Known audit stage, review support documents.",
    signals: {
      criticalMissingFacts: [],
      helpfulMissingFacts: [],
      documentGaps: ["LOA/PAN/FAN/FDDA", "support documents"],
      sourceCoverageNeeds: [],
      missingApplicabilityFacts: [],
      assessmentStageGaps: [],
      phase10DependencyFlags: []
    },
    expected: {
      decision: "REQUEST_DOCUMENTS",
      answerAllowed: true,
      posture: "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS",
      documents: true,
      maxQuestions: 10
    }
  },
  {
    id: "audit-no-indexed-source-composition",
    mode: "/audit",
    authorityState: "NO_INDEXED_SOURCE",
    query: "Audit issue with unavailable indexed authority.",
    signals: {
      criticalMissingFacts: [],
      helpfulMissingFacts: [],
      documentGaps: [],
      sourceCoverageNeeds: ["indexed audit authority unavailable"],
      missingApplicabilityFacts: [],
      assessmentStageGaps: ["current stage"],
      phase10DependencyFlags: []
    },
    expected: {
      decision: "DISCLOSE_SOURCE_LIMITATION",
      sourceLimit: true,
      shouldAskBeforeAnswer: false,
      maxQuestions: 10
    }
  },
  {
    id: "privacy-prohibited-behavior-composition",
    mode: "/tax",
    authorityState: "AUTHORITY_FOUND",
    query: "Clarify facts safely without sensitive identifiers.",
    signals: {
      criticalMissingFacts: ["TIN", "full address", "bank account number", "taxable year", "tax type", "transaction character", "document status", "procedural stage"],
      helpfulMissingFacts: [],
      documentGaps: [],
      sourceCoverageNeeds: [],
      missingApplicabilityFacts: [],
      phase10DependencyFlags: []
    },
    expected: {
      decision: "ASK_BEFORE_ANSWERING",
      shouldAskBeforeAnswer: true,
      maxQuestions: 7
    }
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

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function composedFactGapResult(realFactGapResult, signals, scenario) {
  return {
    ...realFactGapResult,
    issueFamily: scenario.issueFamily || realFactGapResult.issueFamily,
    criticalMissingFacts: unique(signals.criticalMissingFacts || []),
    helpfulMissingFacts: unique(signals.helpfulMissingFacts || []),
    documentGaps: unique(signals.documentGaps || []),
    timingOrPeriodGaps: unique(signals.timingOrPeriodGaps || []),
    taxpayerStatusGaps: unique(signals.taxpayerStatusGaps || []),
    transactionCharacterGaps: unique(signals.transactionCharacterGaps || []),
    assessmentStageGaps: unique(signals.assessmentStageGaps || []),
    sourceCoverageNeeds: unique(signals.sourceCoverageNeeds || []),
    checklistQuestions: [],
    implementationScope: "FACT_GAP_HELPER_ONLY",
    mode: scenario.mode
  };
}

function composedClientChecklistResult(realChecklist, signals, scenario) {
  return {
    ...realChecklist,
    criticalQuestions: unique(signals.criticalMissingFacts || []),
    helpfulQuestions: unique(signals.helpfulMissingFacts || []),
    documentRequests: unique(signals.documentGaps || []),
    timingAndPeriodQuestions: unique(signals.timingOrPeriodGaps || []),
    taxpayerStatusQuestions: unique(signals.taxpayerStatusGaps || []),
    transactionCharacterQuestions: unique(signals.transactionCharacterGaps || []),
    assessmentStageQuestions: unique(signals.assessmentStageGaps || []),
    sourceCoverageNeeds: unique(signals.sourceCoverageNeeds || []),
    implementationScope: "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY",
    mode: scenario.mode
  };
}

function composedAuthorityApplicabilityResult(realApplicability, signals, scenario) {
  return {
    ...realApplicability,
    authorityState: scenario.authorityState,
    sourceAvailabilityState: scenario.authorityState,
    missingApplicabilityFacts: unique(signals.missingApplicabilityFacts || []),
    requiredApplicabilityFacts: unique(signals.requiredApplicabilityFacts || []),
    sourceCoverageNeeds: unique(signals.sourceCoverageNeeds || []),
    phase10DependencyFlags: unique(signals.phase10DependencyFlags || []),
    canReachFinalConclusion: false,
    implementationScope: "AUTHORITY_APPLICABILITY_HELPER_ONLY"
  };
}

function composeScenario(scenario) {
  const base = {
    mode: scenario.mode,
    query: scenario.query,
    issueFamily: scenario.issueFamily,
    authorityState: scenario.authorityState,
    sourceAvailabilityState: scenario.authorityState,
    phase10DependencyFlags: scenario.signals.phase10DependencyFlags,
    missingUserFacts: unique([
      ...(scenario.signals.criticalMissingFacts || []),
      ...(scenario.signals.helpfulMissingFacts || []),
      ...(scenario.signals.assessmentStageGaps || [])
    ]),
    missingDocuments: scenario.signals.documentGaps,
    authorityOrSourceCoverageNeeds: scenario.signals.sourceCoverageNeeds
  };
  const issueFrameResult = frameTaxIssue(base);
  const safetyPolicyResult = {
    ...applyReasoningSafetyPolicy(base),
    implementationScope: "REASONING_SAFETY_POLICY_ONLY"
  };
  const realFactGapResult = identifyFactGaps({ ...base, issueFrameResult });
  const factGapResult = composedFactGapResult(realFactGapResult, scenario.signals, scenario);
  const realClientFactChecklistResult = buildClientFactChecklistOutput({ ...base, issueFrameResult, safetyPolicyResult, factGapResult });
  const clientFactChecklistResult = composedClientChecklistResult(realClientFactChecklistResult, scenario.signals, scenario);
  const realAuthorityApplicabilityResult = assessAuthorityApplicability({ ...base, issueFrameResult, safetyPolicyResult, factGapResult });
  const authorityApplicabilityResult = composedAuthorityApplicabilityResult(realAuthorityApplicabilityResult, scenario.signals, scenario);
  const adversarialContentSafetyResult = applyAdversarialContentSafetyPolicy({
    ...base,
    missingCriticalFacts: factGapResult.criticalMissingFacts,
    missingDocuments: factGapResult.documentGaps,
    sourceCoverageNeeds: factGapResult.sourceCoverageNeeds,
    phase10DependencyFlags: authorityApplicabilityResult.phase10DependencyFlags
  });
  const birTaxpayerPositionResult = assessBirTaxpayerPositions({
    ...base,
    issueFrameResult,
    safetyPolicyResult,
    factGapResult,
    clientFactChecklistResult,
    authorityApplicabilityResult,
    adversarialContentSafetyResult
  });
  const qualitativeAuditRiskResult = assessQualitativeAuditRisk({
    ...base,
    issueFrameResult,
    safetyPolicyResult,
    factGapResult,
    clientFactChecklistResult,
    authorityApplicabilityResult,
    adversarialContentSafetyResult,
    birTaxpayerPositionResult
  });
  const clarificationInput = {
    mode: scenario.mode,
    authorityState: scenario.authorityState,
    sourceAvailabilityState: scenario.authorityState,
    issueFrameResult,
    safetyPolicyResult,
    factGapResult,
    clientFactChecklistResult,
    authorityApplicabilityResult,
    adversarialContentSafetyResult,
    birTaxpayerPositionResult,
    qualitativeAuditRiskResult
  };

  return {
    upstream: clarificationInput,
    output: clarificationPolicy.assessClarificationNeed(clarificationInput),
    checklist: clarificationPolicy.buildClarificationChecklist(clarificationInput)
  };
}

function assertOutputShape(output) {
  for (const field of REQUIRED_OUTPUT_FIELDS) assert(Object.hasOwn(output, field), `missing ${field}`);
  assert(DECISIONS.includes(output.clarificationDecision), `unsupported decision ${output.clarificationDecision}`);
  assert(POSTURES.includes(output.allowedAnswerPosture), `unsupported posture ${output.allowedAnswerPosture}`);
  assert.equal(output.canReachFinalConclusion, false);
  assert.equal(output.implementationScope, "CLARIFICATION_BOUNDARY_POLICY_ONLY");
  assert(Array.isArray(output.questions), "questions must be array");
  assert(Array.isArray(output.documentRequests), "documentRequests must be array");
  assert(Array.isArray(output.sourceCoverageLimitations), "sourceCoverageLimitations must be array");
  assert(Array.isArray(output.phase10Deferrals), "phase10Deferrals must be array");
  assert(Array.isArray(output.prohibitedConclusions), "prohibitedConclusions must be array");
}

function serialized(value) {
  return JSON.stringify(value);
}

function proceduralIndex(question) {
  return /stage|notice|deadline|LOA|PAN|FAN|FDDA|date|period|year/i.test(question) ? 0 : 1;
}

function assertScenarioExpectation(scenario, output) {
  if (scenario.expected.decision) assert.equal(output.clarificationDecision, scenario.expected.decision, scenario.id);
  if (scenario.expected.decisionOneOf) assert(scenario.expected.decisionOneOf.includes(output.clarificationDecision), `${scenario.id} unexpected decision`);
  if (Object.hasOwn(scenario.expected, "shouldAskBeforeAnswer")) assert.equal(output.shouldAskBeforeAnswer, scenario.expected.shouldAskBeforeAnswer, `${scenario.id} shouldAskBeforeAnswer`);
  if (Object.hasOwn(scenario.expected, "answerAllowed")) assert.equal(output.answerAllowed, scenario.expected.answerAllowed, `${scenario.id} answerAllowed`);
  if (scenario.expected.posture) assert.equal(output.allowedAnswerPosture, scenario.expected.posture, `${scenario.id} posture`);
  if (scenario.expected.sourceLimit) assert(output.sourceCoverageLimitations.length > 0, `${scenario.id} should disclose source limitation`);
  if (scenario.expected.phase10) assert(output.phase10Deferrals.length > 0, `${scenario.id} should disclose Phase 10 deferral`);
  if (scenario.expected.documents) assert(output.documentRequests.length > 0, `${scenario.id} should request documents`);
  assert(output.questions.length <= scenario.expected.maxQuestions, `${scenario.id} exceeds question cap`);
  if (scenario.expected.proceduralFirst) {
    let seenSubstantive = false;
    for (const question of output.questions) {
      if (proceduralIndex(question) === 1) seenSubstantive = true;
      if (seenSubstantive) continue;
      assert.equal(proceduralIndex(question), 0, `${scenario.id} should put procedural questions first`);
    }
  }
}

await test("export boundaries are narrow", () => {
  assert.equal(typeof clarificationPolicy.assessClarificationNeed, "function");
  assert.equal(typeof clarificationPolicy.buildClarificationChecklist, "function");
  assert.equal(Object.hasOwn(clarificationPolicy, "buildClarificationPrompt"), false);
});

await test("composition scenarios satisfy expected decisions, shape, enums, caps, and safety", () => {
  for (const scenario of SCENARIOS) {
    const { output, checklist } = composeScenario(scenario);
    assertOutputShape(output);
    assertScenarioExpectation(scenario, output);
    assert.equal(assertAdversarialSafety(output, { mode: scenario.mode, authorityState: scenario.authorityState }).safe, true, `${scenario.id} assessment safety`);
    assert.equal(assertAdversarialSafety(checklist, { mode: scenario.mode, authorityState: scenario.authorityState }).safe, true, `${scenario.id} checklist safety`);
  }
});

await test("composition is deterministic for every scenario", () => {
  for (const scenario of SCENARIOS) {
    const first = composeScenario(scenario).output;
    const second = composeScenario(scenario).output;
    assert.deepEqual(second, first, `${scenario.id} output should be deterministic`);
  }
});

await test("source limitation and Phase 10 boundaries are not outsourced to users", () => {
  for (const scenario of SCENARIOS.filter((item) => item.authorityState === "NO_INDEXED_SOURCE" || item.signals.phase10DependencyFlags.length > 0)) {
    const text = serialized(composeScenario(scenario).output);
    assert(!/\bwhat law applies|please find the regulation|search the BIR website|determine the governing authority\b/i.test(text), `${scenario.id} outsourced source coverage`);
    assert(!/\bis this still current|has this been superseded|which authority controls|find the newer regulation|check case status|verify official source metadata\b/i.test(text), `${scenario.id} outsourced Phase 10`);
  }
});

await test("documents remain factual and do not crowd out critical facts", () => {
  const critical = composeScenario(SCENARIOS.find((item) => item.id === "ask-critical-fact-gap-composition")).output;
  assert.equal(critical.clarificationDecision, "ASK_BEFORE_ANSWERING");
  assert.equal(critical.documentRequests.length, 0);

  const document = composeScenario(SCENARIOS.find((item) => item.id === "tax-document-gap-composition")).output;
  assert.equal(document.clarificationDecision, "REQUEST_DOCUMENTS");
  assert(document.documentRequests.length > 0);
  assert(!/prove this qualifies as zero-rated|confirm this is legally deductible|confirm the assessment is void/i.test(serialized(document)));
});

await test("composed outputs contain no conclusions, strategy, unsafe source requests, or privacy overreach", () => {
  for (const scenario of SCENARIOS) {
    const text = serialized(composeScenario(scenario).output);
    for (const pattern of PROHIBITED_PATTERNS) {
      assert(!pattern.test(text), `${scenario.id} contains prohibited pattern ${pattern}`);
    }
  }
});

await test("nine-helper chain is covered through accepted upstream fields", () => {
  const { upstream } = composeScenario(SCENARIOS[0]);
  assert.equal(upstream.issueFrameResult.implementationScope, "ISSUE_FRAMING_ONLY");
  assert.equal(upstream.safetyPolicyResult.implementationScope, "REASONING_SAFETY_POLICY_ONLY");
  assert.equal(upstream.factGapResult.implementationScope, "FACT_GAP_HELPER_ONLY");
  assert.equal(upstream.clientFactChecklistResult.implementationScope, "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY");
  assert.equal(upstream.authorityApplicabilityResult.implementationScope, "AUTHORITY_APPLICABILITY_HELPER_ONLY");
  assert.equal(upstream.adversarialContentSafetyResult.implementationScope, "ADVERSARIAL_CONTENT_SAFETY_POLICY_ONLY");
  assert.equal(upstream.birTaxpayerPositionResult.implementationScope, "BIR_TAXPAYER_POSITION_HELPER_ONLY");
  assert.equal(upstream.qualitativeAuditRiskResult.implementationScope, "AUDIT_RISK_LANGUAGE_HELPER_ONLY");
  assert.equal(composeScenario(SCENARIOS[0]).output.implementationScope, "CLARIFICATION_BOUNDARY_POLICY_ONLY");
});

await test("composition gate remains test-only and imports no live route, prompt, or response module", () => {
  const source = readFileSync(resolve("tests", "patch-07b-clarification-gate-2-composition-safety-gate.test.mjs"), "utf8");
  const importLines = source.split(/\r?\n/).filter((line) => /^\s*import\b/.test(line)).join("\n");
  assert(!/from\s+["'][^"']*(?:routes|ask-handler|answer-renderer|prompts|pipeline|server)\b/i.test(importLines));
  assert(!/express\.Router|router\.|app\.|req\.|res\./i.test(importLines));
});

console.log(`\nPATCH-07B-CLARIFICATION-GATE-2 composition safety gate tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
