// FILE: tests/phase-09y-controlled-loa-answer-runtime-wiring-scaffold-1.test.mjs
// PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1
//
// Validates the pure, standalone controlled LOA answer runtime scaffold
// and its fixture/report. NO server/ask-handler/pipeline/route import, NO
// OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR calls, NO web
// search, NO browser automation, NO server start, NO port binding, NO
// staging/production/localhost calls, NO env secret reads, NO HTTP
// requests of any kind, NO live authority retrieval/scraping/download/
// ingestion/embedding/database write of any kind. Live /ask behavior is
// not exercised, imported, or changed by this test.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  PHASE_09Y_CONTROLLED_LOA_ANSWER_RUNTIME_WIRING_SCAFFOLD_VERSION,
  CONTROLLED_LOA_ANSWER_RUNTIME_SCAFFOLD_MODE_ID,
  SUPPORTED_CONTROLLED_LOA_INTENTS,
  EXCLUDED_CONTROLLED_LOA_INTENTS,
  SUPPORTED_CONTROLLED_LOA_RESPONSE_MODES,
  SUPPORTED_CONTROLLED_LOA_SAFETY_GATES,
  createControlledLoaAnswerRuntimeScaffoldResult,
  normalizeControlledLoaAnswerInput,
  classifyControlledLoaIntent,
  validateControlledLoaAnswerInput,
  validateControlledLoaAnswerResult
} from "../workflow/controlled-loa-answer-runtime-scaffold.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09y-controlled-loa-answer-runtime-wiring-scaffold-1.fixture.json";
const REPORT_PATH = "PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1_REPORT.md";
const MODULE_PATH = "workflow/controlled-loa-answer-runtime-scaffold.js";
const SELF_PATH = "tests/phase-09y-controlled-loa-answer-runtime-wiring-scaffold-1.test.mjs";

const EXPECTED_DECISION = "PHASE 09Y CONTROLLED LOA ANSWER RUNTIME WIRING SCAFFOLD PASS WITH STRICT RECOMMENDATIONS";
const EXPECTED_NEXT_TASK = "PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1";

// Known-real reference-corpus fragments supplied only as a private
// do-not-leak list for this task; must never appear in fixtures/reports/
// generated output.
const REAL_TAXPAYER_NAME_FRAGMENTS = Object.freeze(["TRUE FREIGHT GLOBAL LOGISTICS INC", "ALL ECARS INC", "SOCIAL HOMES INCORPORATED"]);
const REAL_OFFICER_NAME_FRAGMENTS = Object.freeze([
  "SUSAN F. SANTIAGO",
  "RENATO N. MOLINA",
  "PATRICIA ANN H. GUTIERREZ",
  "MARIA RUBIE AGANAN",
  "BRENNA ROSE VENERAYAN",
  "CECILLE ASILO",
  "MYRABEL DELA CRUZ",
  "AL-HELMEY F. ABDULRASHID",
  "ETHEL C. EVANGELISTA"
]);
const REAL_ELA_NUMBER_FRAGMENTS = Object.freeze(["eLA202400099140", "eLA202300040925", "eLA20240018917", "eLA202400055996"]);
const REAL_AUDIT_CASE_NUMBER_FRAGMENTS = Object.freeze(["AUDM16-00.8A-2025-016972", "AUDM29-048-2024-027259", "AUDM29-041-2026-150797"]);
const REAL_TIN_FRAGMENTS = Object.freeze(["008-826-456-000", "010-841-602-000", "005-055-069-00000"]);
const REAL_ASSESSMENT_AMOUNT_FRAGMENTS = Object.freeze(["9,367,987.68", "2,841,029.91", "614,038.19", "737,273.97", "15,000.00", "13,106,907.66", "13,545,329.75"]);
const ALL_REAL_FRAGMENTS = [...REAL_TAXPAYER_NAME_FRAGMENTS, ...REAL_OFFICER_NAME_FRAGMENTS, ...REAL_ELA_NUMBER_FRAGMENTS, ...REAL_AUDIT_CASE_NUMBER_FRAGMENTS, ...REAL_TIN_FRAGMENTS, ...REAL_ASSESSMENT_AMOUNT_FRAGMENTS];

const PROHIBITED_CLAIM_PHRASES = [
  "this loa is valid",
  "this loa is invalid",
  "this ela is void",
  "this replacement ela is invalid",
  "this consolidated ela is invalid",
  "the bir cannot assess you",
  "you can ignore the loa",
  "the assessment is final.",
  "the assessment is not final.",
  "the deadline is definitely",
  "you will win",
  "the assessment is cancelled",
  "this is a final legal opinion",
  "this is official legal advice",
  "this protest will succeed",
  "cta appeal is definitely available",
  "this document is ready for filing",
  "i will submit this to the bir"
];

let passed = 0;
let failed = 0;
let assertions = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(`  ${error.message}`);
  }
}
function check(condition, message) {
  assertions += 1;
  assert(condition, message);
}
function isPlainObjectLocal(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Usage-based forbidden-pattern scan, reused from prior Phase 9 test
 * files. Looks for actual code-shaped usage (import/require syntax,
 * network-call syntax, process.env.<NAME> reads, header-assignment
 * syntax) rather than bare substrings, so it is safe to run against this
 * test's own source as well as the module/fixture/report.
 *
 * @param {string} source
 * @returns {string[]}
 */
function scanForbiddenUsage(source) {
  const violations = [];

  const forbiddenPackagePattern =
    /\b(?:import\s+.*from\s+|require\()\s*["'](openai|@supabase\/[^"']*|firecrawl|crawlee|@modelcontextprotocol\/[^"']*|n8n|tesseract\.js|node-tesseract)["']/i;
  if (forbiddenPackagePattern.test(source)) violations.push("import/require of a forbidden service package");

  const forbiddenRuntimeImportPattern = /\bfrom\s+["'](?:\.\.?\/)*(?:server|ask-handler|pipeline)(?:\.js)?["']/i;
  if (forbiddenRuntimeImportPattern.test(source)) violations.push("import of server/ask-handler/pipeline");

  const routeImportPattern = /\bfrom\s+["'](?:\.\.?\/)*routes\/[^"']*["']/i;
  if (routeImportPattern.test(source)) violations.push("import of a route file");

  const networkCallPattern = /\bfetch\s*\(|\baxios\s*\(|\bhttp\.request\s*\(|\bhttps\.request\s*\(|\bXMLHttpRequest\s*\(/;
  if (networkCallPattern.test(source)) violations.push("network call syntax (fetch/axios/http.request/https.request/XMLHttpRequest)");

  if (/process\.env\.\w/.test(source)) violations.push("process.env.<NAME> read");

  if (/["'`]authorization["'`]\s*:/i.test(source)) violations.push("Authorization header assignment syntax");

  const indexSecretToken = ["INDEX", "SECRET"].join("_");
  const indexSecretUsagePattern = new RegExp(`\\b${indexSecretToken}\\b\\s*[:=]`);
  if (indexSecretUsagePattern.test(source)) violations.push("shared-secret env var assignment syntax");

  if (/\bapp\.post\s*\(|\brouter\.post\s*\(/.test(source)) violations.push("app.post/router.post route registration syntax");

  const expressImportPattern = /\b(?:import\s+.*from\s+|require\()\s*["']express["']/i;
  if (expressImportPattern.test(source)) violations.push("import/require of express");

  const embeddingCallPattern = /\bembeddings?\.create\s*\(|\bcreateEmbedding\s*\(|vectorSearch\s*\(/i;
  if (embeddingCallPattern.test(source)) violations.push("embedding/vector-search call syntax");

  const ocrCallPattern = /\bocr\s*\(|\brecognize\s*\(\s*[^)]*image|Tesseract\.(recognize|create)\s*\(/i;
  if (ocrCallPattern.test(source)) violations.push("OCR call syntax");

  const scrapeDownloadCallPattern = /\bscrape\s*\(|\bcheerio\.load\s*\(|\bpuppeteer\.|\bplaywright\./i;
  if (scrapeDownloadCallPattern.test(source)) violations.push("scraping/browser-automation call syntax");

  const modelCallPattern = /\bopenai\.chat|\bmodel\s*\.\s*call\s*\(|\bcompletions\.create\s*\(/i;
  if (modelCallPattern.test(source)) violations.push("model call syntax");

  const databaseWritePattern = /\.insert\s*\(|\.upsert\s*\(|\bINSERT\s+INTO\b/i;
  if (databaseWritePattern.test(source)) violations.push("database write call syntax");

  return violations;
}

function safeInput(userQuery, overrides = {}) {
  return { userQuery, sourceCards: [], ...overrides };
}

let fx;

// 1. Fixture exists and valid JSON.
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2. Fixture patch id.
await test("fixture patch id equals PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1", () => {
  check(fx.patch === "PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1", "patch id");
});

// 3. Fixture phase.
await test("fixture phase equals 09Y", () => {
  check(fx.phase === "09Y", "phase equals 09Y");
});

// 4. Fixture baseCommit.
await test("fixture baseCommit equals 1324061", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("1324061"), "baseCommit references 1324061");
});

// 5. Fixture decision.
await test("fixture decision equals expected PASS WITH STRICT RECOMMENDATIONS decision", () => {
  check(fx.decision === EXPECTED_DECISION, `decision must equal expected: ${fx.decision}`);
});

// 6. Fixture nextTask.
await test("fixture nextTask equals PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1", () => {
  check(fx.nextTask === EXPECTED_NEXT_TASK, "nextTask matches expected");
});

// 7-9. Module exports, version constant, mode id.
await test("module exports expected constants/functions; version and mode id are correct", () => {
  check(typeof PHASE_09Y_CONTROLLED_LOA_ANSWER_RUNTIME_WIRING_SCAFFOLD_VERSION === "string", "version export present");
  check(typeof CONTROLLED_LOA_ANSWER_RUNTIME_SCAFFOLD_MODE_ID === "string", "mode id export present");
  check(Array.isArray(SUPPORTED_CONTROLLED_LOA_INTENTS), "supported intents export present");
  check(Array.isArray(EXCLUDED_CONTROLLED_LOA_INTENTS), "excluded intents export present");
  check(Array.isArray(SUPPORTED_CONTROLLED_LOA_RESPONSE_MODES), "supported response modes export present");
  check(Array.isArray(SUPPORTED_CONTROLLED_LOA_SAFETY_GATES), "supported safety gates export present");
  check(typeof createControlledLoaAnswerRuntimeScaffoldResult === "function", "createControlledLoaAnswerRuntimeScaffoldResult export present");
  check(typeof normalizeControlledLoaAnswerInput === "function", "normalizeControlledLoaAnswerInput export present");
  check(typeof classifyControlledLoaIntent === "function", "classifyControlledLoaIntent export present");
  check(typeof validateControlledLoaAnswerInput === "function", "validateControlledLoaAnswerInput export present");
  check(typeof validateControlledLoaAnswerResult === "function", "validateControlledLoaAnswerResult export present");
  check(PHASE_09Y_CONTROLLED_LOA_ANSWER_RUNTIME_WIRING_SCAFFOLD_VERSION === "PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1", "version matches patch id");
  check(CONTROLLED_LOA_ANSWER_RUNTIME_SCAFFOLD_MODE_ID === "controlled_loa_answer_runtime_scaffold", "mode id equals controlled_loa_answer_runtime_scaffold");
});

// 10-16. Supported LOA intents include all required entries.
await test("supported LOA intents include all required entries", () => {
  for (const intent of [
    "BIR_LOA_RECEIVED_WHAT_TO_DO",
    "BIR_ELA_RECEIVED_WHAT_TO_DO",
    "REPLACEMENT_ELA_RECEIVED_PROCEDURAL_REVIEW",
    "CONSOLIDATED_ELA_RECEIVED_PROCEDURAL_REVIEW",
    "LOA_CHECKLIST_RECEIVED",
    "NOTICE_FOR_PRESENTATION_SUBMISSION_RECEIVED",
    "PRE_SUBPOENA_REMINDER_RECEIVED"
  ]) {
    check(SUPPORTED_CONTROLLED_LOA_INTENTS.includes(intent), `supported LOA intents include ${intent}`);
  }
});

// 17-22. Excluded intents include all required entries.
await test("excluded intents include all required entries", () => {
  for (const intent of ["LOA_VALIDITY_CONCLUSION_REQUEST", "ELA_VOIDNESS_CONCLUSION_REQUEST", "IGNORE_LOA_REQUEST", "CTA_STRATEGY_REQUEST", "FILING_READY_PROTEST_REQUEST", "AUTOMATIC_BIR_SUBMISSION_REQUEST"]) {
    check(EXCLUDED_CONTROLLED_LOA_INTENTS.includes(intent), `excluded intents include ${intent}`);
  }
});

// 23-29. Response modes include all required entries.
await test("response modes include all required entries", () => {
  for (const mode of [
    "SAFE_BASIC_LOA_GUIDANCE",
    "REPLACEMENT_ELA_REVIEW_GUIDANCE",
    "CONSOLIDATED_ELA_REVIEW_GUIDANCE",
    "DOCUMENT_CHECKLIST_GUIDANCE",
    "PRE_SUBPOENA_ESCALATION_GUIDANCE",
    "HUMAN_REVIEW_REQUIRED",
    "AUTHORITY_FALLBACK_REQUIRED"
  ]) {
    check(SUPPORTED_CONTROLLED_LOA_RESPONSE_MODES.includes(mode), `response modes include ${mode}`);
  }
});

// 30-35. Safety gates include all required entries.
await test("safety gates include all required entries", () => {
  for (const gate of ["NARROW_LOA_INTENT_GUARD", "NO_VALIDITY_CONCLUSION_GATE", "NO_FILING_READY_OUTPUT_GATE", "NO_AUTOMATIC_SUBMISSION_GATE", "HUMAN_REVIEW_NOTICE_GATE", "RUNTIME_NOT_WIRED_GATE"]) {
    check(SUPPORTED_CONTROLLED_LOA_SAFETY_GATES.includes(gate), `safety gates include ${gate}`);
  }
});

// 36-37. Missing input / missing userQuery rejected.
await test("missing input and missing userQuery are rejected", () => {
  check(validateControlledLoaAnswerInput(undefined).valid === false, "missing input rejected");
  check(validateControlledLoaAnswerInput(null).valid === false, "null input rejected");
  check(validateControlledLoaAnswerInput({}).valid === false, "missing userQuery rejected");
  check(validateControlledLoaAnswerInput({ userQuery: "   " }).valid === false, "empty/whitespace userQuery rejected");
});

// 38-45. Unsafe option flags rejected.
await test("unsafe option flags are rejected", () => {
  check(validateControlledLoaAnswerInput(safeInput("x", { options: { runtimeActive: true } })).valid === false, "runtimeActive true rejected");
  check(validateControlledLoaAnswerInput(safeInput("x", { options: { liveAskWired: true } })).valid === false, "liveAskWired true rejected");
  check(validateControlledLoaAnswerInput(safeInput("x", { options: { scaffoldOnly: false } })).valid === false, "scaffoldOnly false rejected");
  check(validateControlledLoaAnswerInput(safeInput("x", { options: { allowLegalConclusion: true } })).valid === false, "allowLegalConclusion true rejected");
  check(validateControlledLoaAnswerInput(safeInput("x", { options: { allowLiveRetrieval: true } })).valid === false, "allowLiveRetrieval true rejected");
  check(validateControlledLoaAnswerInput(safeInput("x", { options: { allowRealTaxpayerData: true } })).valid === false, "allowRealTaxpayerData true rejected");
  check(validateControlledLoaAnswerInput(safeInput("x", { options: { generateFilingReadyDocument: true } })).valid === false, "generateFilingReadyDocument true rejected");
  check(validateControlledLoaAnswerInput(safeInput("x", { options: { automaticSubmission: true } })).valid === false, "automaticSubmission true rejected");
});

// 46-47. Source card claim rejections.
await test("source card claiming final verification or final legal conclusion is rejected", () => {
  check(validateControlledLoaAnswerInput(safeInput("x", { sourceCards: [{ label: "x", note: "official verification complete" }] })).valid === false, "verification-complete source card rejected");
  check(validateControlledLoaAnswerInput(safeInput("x", { sourceCards: [{ label: "x", note: "this is our final legal conclusion" }] })).valid === false, "final-legal-conclusion source card rejected");
});

// 48-52. Real reference-corpus data rejections.
await test("real taxpayer/officer/ela/audit-case/amount fragments are rejected", () => {
  check(validateControlledLoaAnswerInput(safeInput(`${REAL_TAXPAYER_NAME_FRAGMENTS[0]} received a LOA`)).valid === false, "real taxpayer name rejected");
  check(validateControlledLoaAnswerInput(safeInput(`${REAL_ELA_NUMBER_FRAGMENTS[0]} issued`)).valid === false, "real LOA/eLA number rejected");
  check(validateControlledLoaAnswerInput(safeInput(`${REAL_AUDIT_CASE_NUMBER_FRAGMENTS[0]} case`)).valid === false, "real audit case number rejected");
  check(validateControlledLoaAnswerInput(safeInput(`signed by ${REAL_OFFICER_NAME_FRAGMENTS[0]}`)).valid === false, "real BIR officer name rejected");
  check(validateControlledLoaAnswerInput(safeInput(`assessed at PHP ${REAL_ASSESSMENT_AMOUNT_FRAGMENTS[0]}`)).valid === false, "real assessment amount rejected");
  check(validateControlledLoaAnswerInput(safeInput("I received a BIR LOA, what should I do?")).valid === true, "sanity: safe input is valid");
});

// 53-63. Intent classification correctness across all 12 fixture sample queries.
await test("intent classification is correct for all supported and excluded sample queries", () => {
  const expected = {
    BASIC_LOA_RECEIVED: { intent: "BIR_LOA_RECEIVED_WHAT_TO_DO", mode: "SAFE_BASIC_LOA_GUIDANCE", supported: true },
    BASIC_ELA_RECEIVED: { mode: "SAFE_BASIC_LOA_GUIDANCE", supported: true },
    LOA_DOCUMENTS_TO_PREPARE: { intent: "BIR_LOA_DOCUMENTS_TO_PREPARE", mode: "SAFE_BASIC_LOA_GUIDANCE", supported: true },
    REPLACEMENT_ELA_RECEIVED: { intent: "REPLACEMENT_ELA_RECEIVED_PROCEDURAL_REVIEW", mode: "REPLACEMENT_ELA_REVIEW_GUIDANCE", supported: true },
    CONSOLIDATED_ELA_RECEIVED: { intent: "CONSOLIDATED_ELA_RECEIVED_PROCEDURAL_REVIEW", mode: "CONSOLIDATED_ELA_REVIEW_GUIDANCE", supported: true },
    LOA_CHECKLIST_RECEIVED: { intent: "LOA_CHECKLIST_RECEIVED", mode: "DOCUMENT_CHECKLIST_GUIDANCE", supported: true },
    NOTICE_FOR_PRESENTATION_RECEIVED: { intent: "NOTICE_FOR_PRESENTATION_SUBMISSION_RECEIVED", mode: "DOCUMENT_CHECKLIST_GUIDANCE", supported: true },
    PRE_SUBPOENA_REMINDER_RECEIVED: { intent: "PRE_SUBPOENA_REMINDER_RECEIVED", mode: "PRE_SUBPOENA_ESCALATION_GUIDANCE", supported: true },
    LOA_VALIDITY_QUESTION_EXCLUDED: { excludedModes: ["HUMAN_REVIEW_REQUIRED", "AUTHORITY_FALLBACK_REQUIRED"], excluded: true },
    IGNORE_LOA_QUESTION_EXCLUDED: { mode: "HUMAN_REVIEW_REQUIRED", excluded: true },
    FILING_READY_PROTEST_REQUEST_EXCLUDED: { mode: "HUMAN_REVIEW_REQUIRED", excluded: true },
    AUTOMATIC_SUBMISSION_REQUEST_EXCLUDED: { mode: "HUMAN_REVIEW_REQUIRED", excluded: true }
  };
  for (const [key, exp] of Object.entries(expected)) {
    const input = fx.sampleInputs[key];
    check(isPlainObjectLocal(input), `sample input present: ${key}`);
    const normalized = normalizeControlledLoaAnswerInput(input);
    const classification = classifyControlledLoaIntent(normalized);
    if (exp.supported) {
      check(classification.supported === true, `${key} classified as supported`);
      if (exp.intent) check(classification.intent === exp.intent, `${key} intent is ${exp.intent}, got ${classification.intent}`);
      check(classification.responseMode === exp.mode, `${key} responseMode is ${exp.mode}, got ${classification.responseMode}`);
    }
    if (exp.excluded) {
      check(classification.excluded === true, `${key} classified as excluded`);
      if (exp.mode) check(classification.responseMode === exp.mode, `${key} responseMode is ${exp.mode}, got ${classification.responseMode}`);
      if (exp.excludedModes) check(exp.excludedModes.includes(classification.responseMode), `${key} responseMode is one of ${exp.excludedModes}, got ${classification.responseMode}`);
    }
  }
});

// 64-76. Supported LOA result shape/content evidence.
await test("supported LOA result is valid and includes all required controlled-answer content", () => {
  const result = createControlledLoaAnswerRuntimeScaffoldResult(safeInput("I received a BIR LOA, what should I do?"));
  const validation = validateControlledLoaAnswerResult(result);
  check(validation.valid === true, `supported LOA result must validate: ${validation.errors.join("; ")}`);
  check(result.runtimeActive === false, "runtimeActive false");
  check(result.liveAskWired === false, "liveAskWired false");

  const guidanceText = result.controlledAnswer.proceduralGuidance.join(" | ");
  check(/preserve the date and manner of receipt/i.test(guidanceText), "includes preserve date and manner of receipt");
  check(/verify the LOA\/eLA/i.test(guidanceText), "includes LOA/eLA verification");

  check(result.controlledAnswer.detailsToCheck.length > 0, "includes details to check");
  const detailsText = result.controlledAnswer.detailsToCheck.join(" | ");
  check(/taxpayer name/i.test(detailsText) && /TIN/.test(detailsText), "details to check include taxpayer name and TIN");

  const complianceText = result.controlledAnswer.documentComplianceSteps.join(" | ");
  check(/document compliance matrix/i.test(complianceText), "includes document compliance matrix");
  check(/controlled transmittal/i.test(complianceText), "includes controlled transmittal");

  const proofText = result.controlledAnswer.receivingProofSteps.join(" | ");
  check(/receiving stamp|acknowledgement/i.test(proofText), "includes receiving proof");

  const substituteText = result.controlledAnswer.substituteProofWarnings.join(" | ");
  check(/do not fabricate/i.test(substituteText), "includes substitute proof warning");

  const auditWatchText = result.controlledAnswer.auditStageWatch.join(" | ");
  check(/NOD\/DOD.*PAN.*FAN/i.test(auditWatchText), "includes audit stage watch");

  check(isPlainObjectLocal(result.controlledAnswer) && typeof result.controlledAnswer.authorityVerificationNotice === "string" && result.controlledAnswer.authorityVerificationNotice.length > 0, "includes authority verification notice");
  check(typeof result.controlledAnswer.humanReviewNotice === "string" && /human tax\/legal review/i.test(result.controlledAnswer.humanReviewNotice), "includes human review notice");
});

// 77-83. Phase 9 scaffold use plan evidence.
await test("phase9ScaffoldUsePlan flags all Phase 9 components true and runtimeWiredNow false", () => {
  const result = createControlledLoaAnswerRuntimeScaffoldResult(safeInput("I received a BIR LOA, what should I do?"));
  check(result.phase9ScaffoldUsePlan.use09LProceduralFallback === true, "09L flag true");
  check(result.phase9ScaffoldUsePlan.use09MNoticeTriage === true, "09M flag true");
  check(result.phase9ScaffoldUsePlan.use09S2026BaselineSignals === true, "09S flag true");
  check(result.phase9ScaffoldUsePlan.use09PDocumentCompliance === true, "09P flag true");
  check(result.phase9ScaffoldUsePlan.use09OAuditDefenseMatrix === true, "09O flag true");
  check(result.phase9ScaffoldUsePlan.use09QAuthorityCorpusRequirement === true, "09Q flag true");
  check(result.phase9ScaffoldUsePlan.runtimeWiredNow === false, "runtimeWiredNow false");
});

// 84. Safety gate results: all final-conclusion gates true.
await test("safetyGateResults has all final-conclusion and safety gates true", () => {
  const result = createControlledLoaAnswerRuntimeScaffoldResult(safeInput("I received a BIR LOA, what should I do?"));
  for (const key of [
    "narrowLoaIntentGuard",
    "scopeGuard",
    "noValidityConclusion",
    "noFinalityConclusion",
    "noPrescriptionConclusion",
    "noCtaStrategyConclusion",
    "noFilingReadyOutput",
    "noAutomaticSubmission",
    "noRealTaxpayerData",
    "sourceCardDiscipline",
    "humanReviewNoticePresent",
    "runtimeNotWired"
  ]) {
    check(result.safetyGateResults[key] === true, `safetyGateResults.${key} is true`);
  }
});

// 85-92. Source card policy evidence.
await test("sourceCardPolicy is unverified/no-citation and includes all required authority categories", () => {
  const result = createControlledLoaAnswerRuntimeScaffoldResult(safeInput("I received a BIR LOA, what should I do?"));
  check(result.sourceCardPolicy.verifiedSourceCardsAvailable === false, "verifiedSourceCardsAvailable false");
  check(result.sourceCardPolicy.legalCitationAllowed === false, "legalCitationAllowed false");
  const categories = result.sourceCardPolicy.requiredFutureAuthorityCategories.join(" | ");
  for (const authority of ["RMC No. 5-2026", "RMO No. 1-2026", "RMO No. 6-2026", "RMC No. 14-2026", "RR No. 18-2013", "NIRC Sec. 228"]) {
    check(categories.includes(authority), `sourceCardPolicy includes authority category: ${authority}`);
  }
});

// 93-95. Safe response preview evidence.
await test("safeResponsePreview includes procedural-guidance-only and human review disclaimers and no final validity conclusion", () => {
  const result = createControlledLoaAnswerRuntimeScaffoldResult(safeInput("I received a BIR LOA, what should I do?"));
  check(/procedural guidance only/i.test(result.safeResponsePreview), "includes procedural guidance only");
  check(/human tax\/legal review/i.test(result.safeResponsePreview), "includes human tax/legal review");
  const lower = result.safeResponsePreview.toLowerCase();
  for (const phrase of PROHIBITED_CLAIM_PHRASES) {
    check(!lower.includes(phrase), `safeResponsePreview must not contain prohibited phrase: ${phrase}`);
  }
});

// 96-109. Result validator rejects missing sections and unsafe metadata/policy flags.
await test("result validator rejects missing sections and unsafe metadata/policy flags", () => {
  const base = createControlledLoaAnswerRuntimeScaffoldResult(safeInput("I received a BIR LOA, what should I do?"));
  check(validateControlledLoaAnswerResult(base).valid === true, "sanity: base result is valid");

  for (const key of ["intentClassification", "controlledAnswer", "phase9ScaffoldUsePlan", "safetyGateResults", "sourceCardPolicy"]) {
    const mutated = { ...base };
    delete mutated[key];
    check(validateControlledLoaAnswerResult(mutated).valid === false, `rejects missing ${key}`);
  }

  const runtimeActiveTrue = { ...base, runtimeActive: true };
  check(validateControlledLoaAnswerResult(runtimeActiveTrue).valid === false, "rejects runtimeActive true");
  const liveAskWiredTrue = { ...base, liveAskWired: true };
  check(validateControlledLoaAnswerResult(liveAskWiredTrue).valid === false, "rejects liveAskWired true");

  for (const key of [
    "legalConclusionProvided",
    "liveRetrievalPerformed",
    "externalSearchPerformed",
    "scrapingPerformed",
    "downloadPerformed",
    "ingestionPerformed",
    "embeddingPerformed",
    "databaseWritePerformed",
    "realTaxpayerDataUsed",
    "filingReadyDocumentGenerated",
    "automaticSubmission",
    "finalOutcomeGuaranteed"
  ]) {
    const mutated = { ...base, metadata: { ...base.metadata, [key]: true } };
    check(validateControlledLoaAnswerResult(mutated).valid === false, `rejects metadata.${key} true`);
  }

  const verifiedCardsTrue = { ...base, sourceCardPolicy: { ...base.sourceCardPolicy, verifiedSourceCardsAvailable: true } };
  check(validateControlledLoaAnswerResult(verifiedCardsTrue).valid === false, "rejects sourceCardPolicy.verifiedSourceCardsAvailable true");
  const legalCitationTrue = { ...base, sourceCardPolicy: { ...base.sourceCardPolicy, legalCitationAllowed: true } };
  check(validateControlledLoaAnswerResult(legalCitationTrue).valid === false, "rejects sourceCardPolicy.legalCitationAllowed true");
});

// 110-112. Result validator rejects prohibited claims / filing-ready output / automatic submission language.
await test("result validator rejects prohibited legal conclusion phrases, filing-ready output, and automatic submission language", () => {
  const base = createControlledLoaAnswerRuntimeScaffoldResult(safeInput("I received a BIR LOA, what should I do?"));
  const withValidityClaim = { ...base, safeResponsePreview: `${base.safeResponsePreview} This LOA is valid.` };
  check(validateControlledLoaAnswerResult(withValidityClaim).valid === false, "rejects prohibited legal conclusion phrase");
  const withFilingReadyClaim = { ...base, safeResponsePreview: `${base.safeResponsePreview} This document is ready for filing.` };
  check(validateControlledLoaAnswerResult(withFilingReadyClaim).valid === false, "rejects filing-ready output claim");
  const withAutoSubmitClaim = { ...base, safeResponsePreview: `${base.safeResponsePreview} I will submit this to the BIR.` };
  check(validateControlledLoaAnswerResult(withAutoSubmitClaim).valid === false, "rejects automatic submission language");
});

// 113-117. Report exists and states required exact statements.
await test("report exists and states required exact impact statements", () => {
  check(existsSync(resolve(REPORT_PATH)), `${REPORT_PATH} must exist`);
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/Runtime impact:\s*None\./.test(report), "states Runtime impact: None.");
  check(/\/ask impact:\s*None\./.test(report), "states /ask impact: None.");
  check(/Live LOA \/ask behavior changed:\s*No\./.test(report), "states Live LOA /ask behavior changed: No.");
  check(/Runtime implementation impact:\s*Scaffold only\./.test(report), "states Runtime implementation impact: Scaffold only.");
});

// 118-123. Static scans of module/test for forbidden usage.
await test("module source has no forbidden usage patterns and is standalone", () => {
  const moduleSrc = readFileSync(resolve(MODULE_PATH), "utf8");
  const violations = scanForbiddenUsage(moduleSrc);
  check(violations.length === 0, `module must have no forbidden usage: ${violations.join("; ")}`);
  check(!/process\.env\.\w/.test(moduleSrc), "no process.env.<NAME> read in module");
  check(!/["'`]authorization["'`]\s*:/i.test(moduleSrc), "no Authorization header assignment in module");
});

await test("this test file itself has no forbidden usage patterns", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  const violations = scanForbiddenUsage(selfSrc);
  check(violations.length === 0, `test file must have no forbidden usage: ${violations.join("; ")}`);
});

// 124-126. Static scan confirms no runtime activation / filing-ready / automatic submission implementation.
await test("static scan confirms no runtime activation, filing-ready document generation, or automatic submission implementation", () => {
  const moduleSrc = readFileSync(resolve(MODULE_PATH), "utf8");
  check(!/runtimeActive\s*=\s*true/.test(moduleSrc), "module never sets runtimeActive true");
  check(!/liveAskWired\s*=\s*true/.test(moduleSrc), "module never sets liveAskWired true");
  check(!/generateFilingReadyDocument:\s*true/.test(moduleSrc.replace(/generateFilingReadyDocument:\s*false/g, "")), "module never sets generateFilingReadyDocument true");
  check(!/automaticSubmission:\s*true/.test(moduleSrc.replace(/automaticSubmission:\s*false/g, "")), "module never sets automaticSubmission true");
});

// 127. Static scan confirms no real taxpayer data in fixture/report/output.
await test("no private real-reference fragments appear in fixture, report, or generated sample output", () => {
  const fixtureRaw = readFileSync(resolve(FIXTURE_PATH), "utf8");
  const reportRaw = existsSync(resolve(REPORT_PATH)) ? readFileSync(resolve(REPORT_PATH), "utf8") : "";
  for (const fragment of ALL_REAL_FRAGMENTS) {
    check(!fixtureRaw.toUpperCase().includes(fragment.toUpperCase()), `fixture must not contain real fragment: ${fragment}`);
    check(!reportRaw.toUpperCase().includes(fragment.toUpperCase()), `report must not contain real fragment: ${fragment}`);
  }
  for (const key of Object.keys(fx.sampleOutputs || {})) {
    const outputRaw = JSON.stringify(fx.sampleOutputs[key]).toUpperCase();
    for (const fragment of ALL_REAL_FRAGMENTS) {
      check(!outputRaw.includes(fragment.toUpperCase()), `sample output ${key} must not contain real fragment: ${fragment}`);
    }
  }
});

// 128. Git diff scope confirms only allowed files changed.
await test("git diff confirms only this patch's allowed files changed, with no runtime/package/env/DB/frontend/MCP changes", () => {
  const allowedChanged = new Set([
    "workflow/controlled-loa-answer-runtime-scaffold.js",
    "evaluation/fixtures/phase-09y-controlled-loa-answer-runtime-wiring-scaffold-1.fixture.json",
    "tests/phase-09y-controlled-loa-answer-runtime-wiring-scaffold-1.test.mjs",
    "PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1_REPORT.md",
    "knowledge/CURRENT_STATE.md"
  ]);
  let diffNames = [];
  try {
    diffNames = execSync("git diff --name-only", { encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    diffNames = [];
  }
  for (const name of diffNames) {
    check(allowedChanged.has(name), `changed file is allowed by this patch's scope: ${name}`);
  }
  for (const forbidden of [
    "server.js",
    "ask-handler.js",
    "pipeline.js",
    "package.json",
    "package-lock.json",
    "workflow/authority-safe-procedural-fallback.js",
    "workflow/bir-notice-loa-triage-intent.js",
    "workflow/pan-fan-fld-protest-workflow.js",
    "workflow/bir-audit-defense-matrix.js",
    "workflow/bir-document-compliance-transmittal.js",
    "workflow/bir-authority-corpus-research-design.js",
    "workflow/bir-2026-audit-baseline-integration.js"
  ]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }
  check(!diffNames.some((name) => /mcp/i.test(name)), "no MCP files/configs added or modified");
});

// 129-130. CURRENT_STATE.md contains 09Y scaffold entry and states 09Z as next task.
await test("CURRENT_STATE.md contains 09Y scaffold entry and states 09Z as next task", () => {
  const currentState = readFileSync(resolve("knowledge/CURRENT_STATE.md"), "utf8");
  check(/PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1/.test(currentState), "CURRENT_STATE.md references PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1");
  check(new RegExp(EXPECTED_NEXT_TASK.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).test(currentState), "CURRENT_STATE.md references PHASE-09Z as the next task");
});

console.log(`\nPHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
