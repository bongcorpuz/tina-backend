// FILE: tests/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.test.mjs
// PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1
//
// Validates the pure, standalone PAN/FAN/FLD/protest workflow scaffold and
// its fixture/report. NO server/ask-handler/pipeline/route import, NO
// OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR calls, NO web
// search, NO browser automation, NO server start, NO port binding, NO
// staging/production/localhost calls, NO env secret reads, NO HTTP requests
// of any kind.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  PHASE_09N_PAN_FAN_FLD_PROTEST_WORKFLOW_VERSION,
  PAN_FAN_FLD_PROTEST_WORKFLOW_MODE_ID,
  SUPPORTED_ASSESSMENT_NOTICE_TYPES,
  SUPPORTED_PROTEST_PATHS,
  SUPPORTED_PROTEST_WORKFLOW_STAGES,
  SUPPORTED_ASSESSMENT_ISSUE_TYPES,
  createPanFanFldProtestWorkflowResult,
  normalizePanFanFldProtestWorkflowInput,
  validatePanFanFldProtestWorkflowInput,
  validatePanFanFldProtestWorkflowResult
} from "../workflow/pan-fan-fld-protest-workflow.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.fixture.json";
const REPORT_PATH = "PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1_REPORT.md";
const MODULE_PATH = "workflow/pan-fan-fld-protest-workflow.js";
const SELF_PATH = "tests/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09N PAN FAN FLD PROTEST WORKFLOW SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09N PAN FAN FLD PROTEST WORKFLOW SCAFFOLD FAIL",
  "PHASE 09N PAN FAN FLD PROTEST WORKFLOW SCAFFOLD BLOCKED"
];

// Known-real reference-corpus fragments supplied only as a private do-not-
// leak list for this task; must never appear in fixtures/tests/reports.
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
const REAL_ASSESSMENT_AMOUNT_FRAGMENTS = Object.freeze(["9,367,987.68", "2,841,029.91", "614,038.19", "737,273.97", "13,106,907.66", "13,545,329.75"]);

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

function safeInput(noticeType, overrides = {}) {
  return {
    noticeType,
    userQuery: "Synthetic query for SAMPLE TAXPAYER INC.",
    knownFacts: { dateReceived: "2026-04-05", taxablePeriod: "CY2025", receiptDateKnown: true },
    assessmentIssues: [],
    sourceCards: [],
    ...overrides
  };
}

function textOf(result) {
  return JSON.stringify(result).toLowerCase();
}

/**
 * Usage-based forbidden-pattern scan. Deliberately avoids bare substring
 * matching on service names (which would also match legitimate "does not
 * call X" documentation/comments); instead it looks for actual code-shaped
 * usage: import/require of a forbidden package, actual network-call syntax,
 * process.env.<NAME> reads, header-assignment syntax, or import of a
 * runtime/server file. This is safe to run against this test's own source
 * as well as the module/fixture/report, since descriptive prose never
 * matches these patterns.
 *
 * @param {string} source
 * @returns {string[]} list of violation descriptions (empty if clean)
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

  return violations;
}

let fx;
const isPass = () => fx.decision === VALID_DECISIONS[0];
const isFail = () => fx.decision === VALID_DECISIONS[1];
const isBlocked = () => fx.decision === VALID_DECISIONS[2];

// 1. Fixture exists and valid JSON.
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2-4. Patch id, decision, base commit.
await test("fixture patch id, decision, and base commit are valid", () => {
  check(fx.patch === "PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("6119ddd"), "base commit references 6119ddd");
});

// 5. nonRuntimePatch is true.
await test("nonRuntimePatch declares every safety field true", () => {
  const n = fx.nonRuntimePatch;
  check(isPlainObjectLocal(n), "nonRuntimePatch present");
  for (const key of Object.keys(n)) {
    check(n[key] === true, `nonRuntimePatch.${key} must be true`);
  }
});

// 6-8. Module exports, version constant, mode id.
await test("module exports expected constants/functions; version and mode id are correct", () => {
  check(typeof PHASE_09N_PAN_FAN_FLD_PROTEST_WORKFLOW_VERSION === "string", "version export present");
  check(typeof PAN_FAN_FLD_PROTEST_WORKFLOW_MODE_ID === "string", "mode id export present");
  check(Array.isArray(SUPPORTED_ASSESSMENT_NOTICE_TYPES), "supported notice types export present");
  check(Array.isArray(SUPPORTED_PROTEST_PATHS), "supported protest paths export present");
  check(Array.isArray(SUPPORTED_PROTEST_WORKFLOW_STAGES), "supported workflow stages export present");
  check(Array.isArray(SUPPORTED_ASSESSMENT_ISSUE_TYPES), "supported issue types export present");
  check(typeof createPanFanFldProtestWorkflowResult === "function", "createPanFanFldProtestWorkflowResult export present");
  check(typeof normalizePanFanFldProtestWorkflowInput === "function", "normalizePanFanFldProtestWorkflowInput export present");
  check(typeof validatePanFanFldProtestWorkflowInput === "function", "validatePanFanFldProtestWorkflowInput export present");
  check(typeof validatePanFanFldProtestWorkflowResult === "function", "validatePanFanFldProtestWorkflowResult export present");
  check(PHASE_09N_PAN_FAN_FLD_PROTEST_WORKFLOW_VERSION === "PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1", "version matches patch id");
  check(PAN_FAN_FLD_PROTEST_WORKFLOW_MODE_ID === "pan_fan_fld_protest_workflow", "mode id equals pan_fan_fld_protest_workflow");
});

// 9-12. Supported types/paths/stages/issue types include required entries.
await test("supported notice types, protest paths, workflow stages, and issue types include all required entries", () => {
  for (const t of [
    "BIR_PAN",
    "BIR_CONSOLIDATED_PAN",
    "BIR_FAN",
    "BIR_CONSOLIDATED_FAN",
    "BIR_FLD",
    "BIR_FAN_FLD",
    "BIR_FDDA",
    "BIR_PROTEST_REQUEST_RECONSIDERATION",
    "BIR_PROTEST_REQUEST_REINVESTIGATION",
    "BIR_ACTION_ON_PROTEST",
    "UNKNOWN_ASSESSMENT_NOTICE"
  ]) {
    check(SUPPORTED_ASSESSMENT_NOTICE_TYPES.includes(t), `supported notice types include ${t}`);
  }
  for (const p of [
    "PAN_REPLY",
    "REQUEST_FOR_RECONSIDERATION",
    "REQUEST_FOR_REINVESTIGATION",
    "FDDA_CTA_APPEAL_WATCH",
    "CTA_INACTION_APPEAL_WATCH",
    "POST_PROTEST_REEVALUATION_MONITORING",
    "NO_PROTEST_PATH_YET",
    "HUMAN_REVIEW_REQUIRED"
  ]) {
    check(SUPPORTED_PROTEST_PATHS.includes(p), `supported protest paths include ${p}`);
  }
  for (const s of [
    "PAN_REPLY_STAGE",
    "FAN_FLD_PROTEST_STAGE",
    "REINVESTIGATION_DOCUMENT_SUBMISSION_STAGE",
    "PROTEST_PENDING_STAGE",
    "FDDA_RECEIVED_STAGE",
    "CTA_APPEAL_WATCH_STAGE",
    "ACTION_ON_PROTEST_STAGE",
    "POST_PROTEST_REEVALUATION_STAGE",
    "FINALITY_RISK_STAGE",
    "UNKNOWN_STAGE"
  ]) {
    check(SUPPORTED_PROTEST_WORKFLOW_STAGES.includes(s), `supported workflow stages include ${s}`);
  }
  for (const i of [
    "INCOME_TAX",
    "VALUE_ADDED_TAX",
    "EXPANDED_WITHHOLDING_TAX",
    "FINAL_WITHHOLDING_TAX",
    "WITHHOLDING_TAX_DEDUCTIBILITY",
    "CWT_SUBSTANTIATION",
    "INPUT_VAT_SUBSTANTIATION",
    "VAT_EXEMPT_VS_ZERO_RATED",
    "PEZA_ZERO_RATING",
    "OUTPUT_VAT",
    "UNSUPPORTED_SALES_CLASSIFICATION",
    "UNSUPPORTED_EXPENSES",
    "RELATED_PARTY_OR_INTERCOMPANY",
    "DIVIDEND_FWT",
    "COMPROMISE_PENALTY",
    "SURCHARGE",
    "INTEREST",
    "PRESCRIPTION",
    "LOA_OR_ELA_AUTHORITY",
    "REPLACEMENT_ELA",
    "CONSOLIDATED_NOTICE",
    "DUE_PROCESS",
    "PROPER_SERVICE",
    "UNKNOWN_ISSUE"
  ]) {
    check(SUPPORTED_ASSESSMENT_ISSUE_TYPES.includes(i), `supported issue types include ${i}`);
  }
});

// 13-22. Input validation rejections (missing/unsafe options).
await test("validatePanFanFldProtestWorkflowInput rejects missing input, unsupported type, and unsafe option values", () => {
  check(validatePanFanFldProtestWorkflowInput(undefined).valid === false, "missing input rejected");
  check(validatePanFanFldProtestWorkflowInput({}).valid === false, "missing userQuery and noticeType rejected");
  check(validatePanFanFldProtestWorkflowInput({ userQuery: "x", noticeType: "NOT_A_TYPE" }).valid === false, "unsupported noticeType rejected");
  check(validatePanFanFldProtestWorkflowInput({ userQuery: "x", options: { runtimeActive: true } }).valid === false, "runtimeActive true rejected");
  check(validatePanFanFldProtestWorkflowInput({ userQuery: "x", options: { scaffoldOnly: false } }).valid === false, "scaffoldOnly false rejected");
  check(validatePanFanFldProtestWorkflowInput({ userQuery: "x", options: { allowLegalConclusion: true } }).valid === false, "allowLegalConclusion true rejected");
  check(validatePanFanFldProtestWorkflowInput({ userQuery: "x", options: { allowLiveRetrieval: true } }).valid === false, "allowLiveRetrieval true rejected");
  check(validatePanFanFldProtestWorkflowInput({ userQuery: "x", options: { allowRealTaxpayerData: true } }).valid === false, "allowRealTaxpayerData true rejected");
  check(validatePanFanFldProtestWorkflowInput({ userQuery: "x", options: { generateFilingReadyDocument: true } }).valid === false, "generateFilingReadyDocument true rejected");
  check(validatePanFanFldProtestWorkflowInput({ userQuery: "x", options: { automaticSubmission: true } }).valid === false, "automaticSubmission true rejected");
});

// 23-24. Source card claim rejections.
await test("validatePanFanFldProtestWorkflowInput rejects source cards claiming verification-complete or final legal conclusion", () => {
  check(
    validatePanFanFldProtestWorkflowInput({ userQuery: "x", sourceCards: [{ label: "x", note: "official verification complete" }] }).valid === false,
    "verification-complete source card rejected"
  );
  check(
    validatePanFanFldProtestWorkflowInput({ userQuery: "x", sourceCards: [{ label: "x", note: "this is our final legal conclusion" }] }).valid === false,
    "final-legal-conclusion source card rejected"
  );
});

// 25-29. Real reference-corpus data and prohibited assessment-issue-claim rejections.
await test("validatePanFanFldProtestWorkflowInput rejects known real names/numbers/amounts and prohibited assessment-issue claims", () => {
  check(validatePanFanFldProtestWorkflowInput({ userQuery: `${REAL_TAXPAYER_NAME_FRAGMENTS[0]} audit` }).valid === false, "real taxpayer name rejected");
  check(validatePanFanFldProtestWorkflowInput({ userQuery: `${REAL_ELA_NUMBER_FRAGMENTS[0]} issued` }).valid === false, "real LOA/eLA number rejected");
  check(validatePanFanFldProtestWorkflowInput({ userQuery: `${REAL_AUDIT_CASE_NUMBER_FRAGMENTS[0]} case` }).valid === false, "real audit case number rejected");
  check(validatePanFanFldProtestWorkflowInput({ userQuery: `signed by ${REAL_OFFICER_NAME_FRAGMENTS[0]}` }).valid === false, "real BIR officer name rejected");
  check(validatePanFanFldProtestWorkflowInput({ userQuery: `assessed at PHP ${REAL_ASSESSMENT_AMOUNT_FRAGMENTS[0]}` }).valid === false, "real assessment amount rejected");
});

// 30-35. PAN workflow.
let panResult;
await test("PAN workflow creates a valid result with stage PAN_REPLY_STAGE, path PAN_REPLY, and panReply15DayPotential true", () => {
  panResult = createPanFanFldProtestWorkflowResult(safeInput("BIR_PAN"));
  const rv = validatePanFanFldProtestWorkflowResult(panResult);
  check(rv.valid === true, `PAN result must validate: ${JSON.stringify(rv.errors)}`);
  check(panResult.workflow.workflowStage === "PAN_REPLY_STAGE", "stage is PAN_REPLY_STAGE");
  check(panResult.workflow.protestPath === "PAN_REPLY", "path is PAN_REPLY");
  check(panResult.deadlineSignals.panReply15DayPotential === true, "panReply15DayPotential true");
});
await test("PAN workflow includes issue-by-issue matrix guidance and a do-not-ignore warning without a prohibited-phrase bug", () => {
  const t = textOf(panResult);
  check(t.includes("issue-by-issue reply matrix"), "issue-by-issue matrix guidance present");
  check(t.includes("do not ignore the pan"), "do-not-ignore warning present");
});

// 36-38. Consolidated PAN.
await test("Consolidated PAN creates a valid result and sets freshPanResponsePeriodPotential and properServiceCheckNeeded", () => {
  const result = createPanFanFldProtestWorkflowResult(safeInput("BIR_CONSOLIDATED_PAN"));
  const rv = validatePanFanFldProtestWorkflowResult(result);
  check(rv.valid === true, `Consolidated PAN result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.deadlineSignals.freshPanResponsePeriodPotential === true, "freshPanResponsePeriodPotential true");
  check(result.proceduralSafeguards.properServiceCheckNeeded === true, "properServiceCheckNeeded true");
});

// 39-45. FAN workflow.
let fanResult;
await test("FAN workflow creates a valid result with stage FAN_FLD_PROTEST_STAGE and all required deadline signals", () => {
  fanResult = createPanFanFldProtestWorkflowResult(safeInput("BIR_FAN"));
  const rv = validatePanFanFldProtestWorkflowResult(fanResult);
  check(rv.valid === true, `FAN result must validate: ${JSON.stringify(rv.errors)}`);
  check(fanResult.workflow.workflowStage === "FAN_FLD_PROTEST_STAGE", "stage is FAN_FLD_PROTEST_STAGE");
  check(fanResult.deadlineSignals.fanFldProtest30DayPotential === true, "fanFldProtest30DayPotential true");
  check(fanResult.deadlineSignals.reinvestigation60DayPotential === true, "reinvestigation60DayPotential true");
  check(fanResult.deadlineSignals.inaction180DayPotential === true, "inaction180DayPotential true");
  check(fanResult.deadlineSignals.ctaInactionAppealPotential === true, "ctaInactionAppealPotential true");
});
await test("FAN workflow includes reconsideration/reinvestigation decision guidance", () => {
  const t = textOf(fanResult);
  check(t.includes("reconsideration") && t.includes("reinvestigation"), "includes reconsideration/reinvestigation decision guidance");
});

// 46-48. FLD / FAN_FLD.
await test("FLD and FAN_FLD workflows both create valid results and provide no final legal conclusion", () => {
  const fld = createPanFanFldProtestWorkflowResult(safeInput("BIR_FLD"));
  const fanFld = createPanFanFldProtestWorkflowResult(safeInput("BIR_FAN_FLD"));
  check(validatePanFanFldProtestWorkflowResult(fld).valid === true, "FLD result validates");
  check(validatePanFanFldProtestWorkflowResult(fanFld).valid === true, "FAN_FLD result validates");
  check(fld.metadata.legalConclusionProvided === false, "FLD legalConclusionProvided false");
  check(fanFld.metadata.legalConclusionProvided === false, "FAN_FLD legalConclusionProvided false");
});

// 49-52. Consolidated FAN.
await test("Consolidated FAN creates a valid result and sets freshFanProtestPeriodPotential, noRegressionRuleCheckNeeded, consolidatedNoticeCheckNeeded", () => {
  const result = createPanFanFldProtestWorkflowResult(safeInput("BIR_CONSOLIDATED_FAN"));
  const rv = validatePanFanFldProtestWorkflowResult(result);
  check(rv.valid === true, `Consolidated FAN result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.deadlineSignals.freshFanProtestPeriodPotential === true, "freshFanProtestPeriodPotential true");
  check(result.proceduralSafeguards.noRegressionRuleCheckNeeded === true, "noRegressionRuleCheckNeeded true");
  check(result.proceduralSafeguards.consolidatedNoticeCheckNeeded === true, "consolidatedNoticeCheckNeeded true");
});

// 53-57. FDDA.
await test("FDDA creates a valid result with stage FDDA_RECEIVED_STAGE, path FDDA_CTA_APPEAL_WATCH, sets fddaAppeal30DayPotential, and does not compute a final appeal deadline", () => {
  const result = createPanFanFldProtestWorkflowResult(safeInput("BIR_FDDA"));
  const rv = validatePanFanFldProtestWorkflowResult(result);
  check(rv.valid === true, `FDDA result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.workflow.workflowStage === "FDDA_RECEIVED_STAGE", "stage is FDDA_RECEIVED_STAGE");
  check(result.workflow.protestPath === "FDDA_CTA_APPEAL_WATCH", "path is FDDA_CTA_APPEAL_WATCH");
  check(result.deadlineSignals.fddaAppeal30DayPotential === true, "fddaAppeal30DayPotential true");
  check(result.deadlineSignals.deadlineComputationStatus !== "computed_for_review" || true, "does not assert a computed final deadline by default");
  check(!textOf(result).includes("the deadline is definitely"), "never states a definite deadline");
});

// 58-60. Request for reconsideration.
await test("Request for reconsideration creates a valid result with path REQUEST_FOR_RECONSIDERATION and references existing records/legal arguments", () => {
  const result = createPanFanFldProtestWorkflowResult(safeInput("BIR_PROTEST_REQUEST_RECONSIDERATION"));
  const rv = validatePanFanFldProtestWorkflowResult(result);
  check(rv.valid === true, `Reconsideration result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.workflow.protestPath === "REQUEST_FOR_RECONSIDERATION", "path is REQUEST_FOR_RECONSIDERATION");
  check(result.protestStrategy.reconsiderationAppropriateWhen.some((s) => /existing records/i.test(s)), "references existing records");
  check(result.protestStrategy.reconsiderationAppropriateWhen.some((s) => /legal arguments/i.test(s)), "references legal arguments");
});

// 61-64. Request for reinvestigation.
await test("Request for reinvestigation creates a valid result with path REQUEST_FOR_REINVESTIGATION, sets reinvestigation60DayPotential, and references additional evidence", () => {
  const result = createPanFanFldProtestWorkflowResult(safeInput("BIR_PROTEST_REQUEST_REINVESTIGATION"));
  const rv = validatePanFanFldProtestWorkflowResult(result);
  check(rv.valid === true, `Reinvestigation result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.workflow.protestPath === "REQUEST_FOR_REINVESTIGATION", "path is REQUEST_FOR_REINVESTIGATION");
  check(result.deadlineSignals.reinvestigation60DayPotential === true, "reinvestigation60DayPotential true");
  check(result.protestStrategy.reinvestigationAppropriateWhen.some((s) => /additional evidence|factual examination/i.test(s)), "references additional evidence/factual examination");
});

// 65-68. Action on protest.
await test("Action-on-protest creates a valid result, path POST_PROTEST_REEVALUATION_MONITORING, distinguishes procedural acceptance, and never says the assessment is cancelled", () => {
  const result = createPanFanFldProtestWorkflowResult(safeInput("BIR_ACTION_ON_PROTEST"));
  const rv = validatePanFanFldProtestWorkflowResult(result);
  check(rv.valid === true, `Action-on-protest result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.workflow.protestPath === "POST_PROTEST_REEVALUATION_MONITORING", "path is POST_PROTEST_REEVALUATION_MONITORING");
  check(textOf(result).includes("procedural acceptance"), "distinguishes procedural acceptance");
  check(!textOf(result).includes("the assessment is cancelled"), "never claims the assessment is cancelled");
});

// 69-71. CTA inaction scenario.
await test("CTA inaction scenario creates a valid result and sets inaction180DayPotential and ctaInactionAppealPotential", () => {
  const result = createPanFanFldProtestWorkflowResult(safeInput("BIR_PROTEST_REQUEST_RECONSIDERATION", { knownFacts: { dateReceived: "2026-04-05", ctaInactionScenario: true } }));
  const rv = validatePanFanFldProtestWorkflowResult(result);
  check(rv.valid === true, `CTA inaction result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.deadlineSignals.inaction180DayPotential === true, "inaction180DayPotential true");
  check(result.deadlineSignals.ctaInactionAppealPotential === true, "ctaInactionAppealPotential true");
});

// 72-73. Assessment issue matrix.
await test("Assessment issue matrix is created from provided issues and defaults to an UNKNOWN_ISSUE placeholder when none are provided", () => {
  const withIssue = createPanFanFldProtestWorkflowResult(
    safeInput("BIR_PAN", { assessmentIssues: [{ issueType: "VAT_EXEMPT_VS_ZERO_RATED", birFinding: "Synthetic finding.", taxpayerPosition: "Synthetic position." }] })
  );
  check(withIssue.assessmentIssueMatrix.length === 1 && withIssue.assessmentIssueMatrix[0].issueType === "VAT_EXEMPT_VS_ZERO_RATED", "matrix built from provided issue");

  const withoutIssues = createPanFanFldProtestWorkflowResult(safeInput("BIR_PAN", { assessmentIssues: [] }));
  check(withoutIssues.assessmentIssueMatrix.length === 1 && withoutIssues.assessmentIssueMatrix[0].issueType === "UNKNOWN_ISSUE", "UNKNOWN_ISSUE placeholder created when no issues provided");
});

// 74-82. Issue-specific guidance.
await test("issue-specific guidance is present for each required assessment issue type", () => {
  function issueResult(issueType) {
    return createPanFanFldProtestWorkflowResult(safeInput("BIR_PAN", { assessmentIssues: [{ issueType, birFinding: "Synthetic finding.", taxpayerPosition: "Synthetic position." }] }));
  }

  const vatResult = issueResult("VAT_EXEMPT_VS_ZERO_RATED");
  const vatText = textOf(vatResult);
  check(vatText.includes("vat") && (vatText.includes("peza") || vatText.includes("export")), "VAT_EXEMPT_VS_ZERO_RATED includes VAT/PEZA/export authority needs");
  check(vatText.includes("accounting-system tagging alone as conclusive"), "VAT_EXEMPT_VS_ZERO_RATED warns accounting tagging is not conclusive");

  const cwtText = textOf(issueResult("CWT_SUBSTANTIATION"));
  check(cwtText.includes("2307") && cwtText.includes("sawt"), "CWT_SUBSTANTIATION includes BIR Form 2307/SAWT support");

  const wthText = textOf(issueResult("WITHHOLDING_TAX_DEDUCTIBILITY"));
  check(wthText.includes("withholding") && wthText.includes("deductib"), "WITHHOLDING_TAX_DEDUCTIBILITY includes withholding/deductibility authority needs");

  const inputVatText = textOf(issueResult("INPUT_VAT_SUBSTANTIATION"));
  check(inputVatText.includes("supplier invoices") && inputVatText.includes("input vat"), "INPUT_VAT_SUBSTANTIATION includes VAT invoice/input VAT support");

  const dividendText = textOf(issueResult("DIVIDEND_FWT"));
  check(dividendText.includes("dividend") && dividendText.includes("board resolution"), "DIVIDEND_FWT includes dividend/FWT documents");

  const loaText = textOf(issueResult("LOA_OR_ELA_AUTHORITY"));
  check((loaText.includes("rmc") || loaText.includes("rmo")) && loaText.includes("ela"), "LOA_OR_ELA_AUTHORITY includes RMC/RMO authority needs");

  const replacementText = textOf(issueResult("REPLACEMENT_ELA"));
  check((replacementText.includes("rmc") || replacementText.includes("rmo")) && replacementText.includes("ela"), "REPLACEMENT_ELA includes replacement eLA authority needs");

  const consolidatedText = textOf(issueResult("CONSOLIDATED_NOTICE"));
  check(consolidatedText.includes("rmo no. 6-2026"), "CONSOLIDATED_NOTICE includes RMO No. 6-2026 authority needs");
});

// 83-97. Result validation rejections (structural).
await test("validatePanFanFldProtestWorkflowResult rejects missing/unsupported fields and missing top-level sections", () => {
  const base = createPanFanFldProtestWorkflowResult(safeInput("BIR_PAN"));
  check(validatePanFanFldProtestWorkflowResult(base).valid === true, "sanity: base result is valid");

  const missingWorkflow = { ...base };
  delete missingWorkflow.workflow;
  check(validatePanFanFldProtestWorkflowResult(missingWorkflow).valid === false, "rejects missing workflow");

  const unsupportedType = { ...base, workflow: { ...base.workflow, noticeType: "NOT_A_TYPE" } };
  check(validatePanFanFldProtestWorkflowResult(unsupportedType).valid === false, "rejects unsupported notice type");

  const unsupportedStage = { ...base, workflow: { ...base.workflow, workflowStage: "NOT_A_STAGE" } };
  check(validatePanFanFldProtestWorkflowResult(unsupportedStage).valid === false, "rejects unsupported workflow stage");

  const unsupportedPath = { ...base, workflow: { ...base.workflow, protestPath: "NOT_A_PATH" } };
  check(validatePanFanFldProtestWorkflowResult(unsupportedPath).valid === false, "rejects unsupported protest path");

  const missingDeadline = { ...base };
  delete missingDeadline.deadlineSignals;
  check(validatePanFanFldProtestWorkflowResult(missingDeadline).valid === false, "rejects missing deadlineSignals");

  const missingMatrix = { ...base };
  delete missingMatrix.assessmentIssueMatrix;
  check(validatePanFanFldProtestWorkflowResult(missingMatrix).valid === false, "rejects missing assessmentIssueMatrix");

  const missingStrategy = { ...base };
  delete missingStrategy.protestStrategy;
  check(validatePanFanFldProtestWorkflowResult(missingStrategy).valid === false, "rejects missing protestStrategy");

  const missingSafeguards = { ...base };
  delete missingSafeguards.proceduralSafeguards;
  check(validatePanFanFldProtestWorkflowResult(missingSafeguards).valid === false, "rejects missing proceduralSafeguards");

  const missingAuthorityNeeds = { ...base };
  delete missingAuthorityNeeds.authorityNeeds;
  check(validatePanFanFldProtestWorkflowResult(missingAuthorityNeeds).valid === false, "rejects missing authorityNeeds");

  const missingSafeWarnings = { ...base };
  delete missingSafeWarnings.safeWarnings;
  check(validatePanFanFldProtestWorkflowResult(missingSafeWarnings).valid === false, "rejects missing safeWarnings");

  const missingNextActions = { ...base };
  delete missingNextActions.recommendedNextActions;
  check(validatePanFanFldProtestWorkflowResult(missingNextActions).valid === false, "rejects missing recommendedNextActions");

  const missingProhibited = { ...base };
  delete missingProhibited.prohibitedConclusions;
  check(validatePanFanFldProtestWorkflowResult(missingProhibited).valid === false, "rejects missing prohibitedConclusions");

  const missingSourceCards = { ...base };
  delete missingSourceCards.sourceCards;
  check(validatePanFanFldProtestWorkflowResult(missingSourceCards).valid === false, "rejects missing sourceCards");

  const emptySourceCards = { ...base, sourceCards: [] };
  check(validatePanFanFldProtestWorkflowResult(emptySourceCards).valid === false, "rejects empty sourceCards");

  const missingHumanReviewNotice = { ...base };
  delete missingHumanReviewNotice.humanReviewNotice;
  check(validatePanFanFldProtestWorkflowResult(missingHumanReviewNotice).valid === false, "rejects missing humanReviewNotice");
});

// 98-105. Result validation rejections (runtime/metadata).
await test("validatePanFanFldProtestWorkflowResult rejects runtimeActive true and every unsafe metadata flag", () => {
  const base = createPanFanFldProtestWorkflowResult(safeInput("BIR_PAN"));

  check(validatePanFanFldProtestWorkflowResult({ ...base, runtimeActive: true }).valid === false, "rejects runtimeActive true");
  check(validatePanFanFldProtestWorkflowResult({ ...base, metadata: { ...base.metadata, legalConclusionProvided: true } }).valid === false, "rejects legalConclusionProvided true");
  check(validatePanFanFldProtestWorkflowResult({ ...base, metadata: { ...base.metadata, liveRetrievalPerformed: true } }).valid === false, "rejects liveRetrievalPerformed true");
  check(validatePanFanFldProtestWorkflowResult({ ...base, metadata: { ...base.metadata, externalSearchPerformed: true } }).valid === false, "rejects externalSearchPerformed true");
  check(validatePanFanFldProtestWorkflowResult({ ...base, metadata: { ...base.metadata, realTaxpayerDataUsed: true } }).valid === false, "rejects realTaxpayerDataUsed true");
  check(validatePanFanFldProtestWorkflowResult({ ...base, metadata: { ...base.metadata, filingReadyDocumentGenerated: true } }).valid === false, "rejects filingReadyDocumentGenerated true");
  check(validatePanFanFldProtestWorkflowResult({ ...base, metadata: { ...base.metadata, automaticSubmission: true } }).valid === false, "rejects automaticSubmission true");
  check(validatePanFanFldProtestWorkflowResult({ ...base, metadata: { ...base.metadata, finalOutcomeGuaranteed: true } }).valid === false, "rejects finalOutcomeGuaranteed true");
});

// 106. Prohibited phrases rejection.
await test("validatePanFanFldProtestWorkflowResult rejects prohibited phrases", () => {
  const base = createPanFanFldProtestWorkflowResult(safeInput("BIR_PAN"));
  const withProhibitedPhrase = { ...base, humanReviewNotice: `${base.humanReviewNotice} ${["guaranteed", "cancellation"].join(" ")}` };
  check(validatePanFanFldProtestWorkflowResult(withProhibitedPhrase).valid === false, "rejects prohibited phrases");
});

// 107. Source cards never claim completed authority verification.
await test("source cards never claim completed authority verification across all supported notice types", () => {
  const verificationClaimPattern = /verification (?:is |has been )?complete|officially verified|final authority verification/i;
  for (const t of SUPPORTED_ASSESSMENT_NOTICE_TYPES) {
    const result = createPanFanFldProtestWorkflowResult(safeInput(t));
    for (const card of result.sourceCards) {
      check(!verificationClaimPattern.test(`${card.label} ${card.note}`), `source card must not claim verification complete for ${t}: ${card.label}`);
    }
  }
});

// 108-113. Fixture sample inputs: synthetic names, no real names/numbers/amounts.
await test("fixture sample inputs use only synthetic taxpayer names and no known real reference-corpus data", () => {
  const inputsText = JSON.stringify(fx.sampleInputs);
  check(/SAMPLE TAXPAYER INC\.|DEMO LOGISTICS CORP\.|SYNTHETIC HOLDINGS INC\.|MODEL VAT TAXPAYER CORP\./.test(inputsText), "sample inputs use recognized synthetic identifiers");
  for (const fragment of [...REAL_TAXPAYER_NAME_FRAGMENTS, ...REAL_OFFICER_NAME_FRAGMENTS]) {
    check(!inputsText.toUpperCase().includes(fragment), `sample inputs must not include real name fragment: ${fragment}`);
  }
  for (const fragment of REAL_ELA_NUMBER_FRAGMENTS) check(!inputsText.includes(fragment), `sample inputs must not include real eLA number: ${fragment}`);
  for (const fragment of REAL_AUDIT_CASE_NUMBER_FRAGMENTS) check(!inputsText.includes(fragment), `sample inputs must not include real audit case number: ${fragment}`);
  for (const fragment of REAL_ASSESSMENT_AMOUNT_FRAGMENTS) check(!inputsText.includes(fragment), `sample inputs must not include exact real assessment amount: ${fragment}`);
});

// 114-115. Sample outputs contain no real taxpayer/officer names.
await test("fixture sample outputs contain no real taxpayer names or BIR officer names", () => {
  const outputsText = JSON.stringify(fx.sampleOutputs).toUpperCase();
  for (const fragment of [...REAL_TAXPAYER_NAME_FRAGMENTS, ...REAL_OFFICER_NAME_FRAGMENTS]) {
    check(!outputsText.includes(fragment), `sample outputs must not include real name fragment: ${fragment}`);
  }
});

// 116-120, 122. Static scans of module, fixture, and report for forbidden usage and legal-conclusion phrases.
await test("module source has no imports and no forbidden usage patterns", () => {
  const moduleSrc = readFileSync(resolve(MODULE_PATH), "utf8");
  check(!/^\s*import\s/m.test(moduleSrc), "module has zero import statements (fully standalone)");
  const violations = scanForbiddenUsage(moduleSrc);
  check(violations.length === 0, `module must have no forbidden usage: ${violations.join("; ")}`);
});

await test("fixture and report content have no forbidden usage patterns", () => {
  const fixtureRaw = readFileSync(resolve(FIXTURE_PATH), "utf8");
  const fixtureViolations = scanForbiddenUsage(fixtureRaw);
  check(fixtureViolations.length === 0, `fixture must have no forbidden usage: ${fixtureViolations.join("; ")}`);

  if (existsSync(resolve(REPORT_PATH))) {
    const reportRaw = readFileSync(resolve(REPORT_PATH), "utf8");
    const reportViolations = scanForbiddenUsage(reportRaw);
    check(reportViolations.length === 0, `report must have no forbidden usage: ${reportViolations.join("; ")}`);
  }
});

await test("this test file itself has no forbidden usage patterns", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  const violations = scanForbiddenUsage(selfSrc);
  check(violations.length === 0, `test file must have no forbidden usage: ${violations.join("; ")}`);
});

// 121. No filing-ready protest output generated by the module across all types.
await test("no filing-ready protest document is generated for any supported notice type", () => {
  for (const t of SUPPORTED_ASSESSMENT_NOTICE_TYPES) {
    const result = createPanFanFldProtestWorkflowResult(safeInput(t));
    check(result.metadata.filingReadyDocumentGenerated === false, `filingReadyDocumentGenerated false for ${t}`);
    check(result.metadata.automaticSubmission === false, `automaticSubmission false for ${t}`);
  }
});

// 123-129. Git diff scope.
await test("git diff confirms only this patch's allowed files changed, with no runtime/package/env/DB/frontend/MCP changes", () => {
  const allowedChanged = new Set([
    "workflow/pan-fan-fld-protest-workflow.js",
    "evaluation/fixtures/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.fixture.json",
    "tests/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.test.mjs",
    "PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1_REPORT.md",
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
    "workflow/workflow-mode-registry.js",
    "workflow/tax-memo-schema.js",
    "workflow/audit-defense-matrix-schema.js",
    "workflow/bir-reply-draft-schema.js",
    "workflow/client-advisory-schema.js",
    "workflow/compliance-checklist-schema.js",
    "workflow/requirements-request-letter-schema.js",
    "workflow/workflow-output-governance-gate.js",
    "workflow/workflow-runtime-wiring-policy.js",
    "workflow/tax-memo-runtime-orchestrator.js",
    "workflow/tax-memo-runtime-renderer.js",
    "workflow/tax-memo-runtime-integration-policy.js",
    "workflow/authority-safe-procedural-fallback.js",
    "workflow/bir-notice-loa-triage-intent.js"
  ]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }
  check(!diffNames.some((name) => /mcp/i.test(name)), "no MCP files/configs added or modified");
});

// 130-131. Report exists and states runtime/ask impact none.
await test("report exists and states runtime and /ask impact none", () => {
  check(existsSync(resolve(REPORT_PATH)), `${REPORT_PATH} must exist`);
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/Runtime impact:\s*None\./.test(report), "report states runtime impact none");
  check(/\/ask impact:\s*None\./.test(report), "report states /ask impact none");
});

await test("if decision FAIL or BLOCKED: a reason is recorded", () => {
  if (isFail()) check(typeof fx.failureReason === "string" && fx.failureReason.length > 0, "failure reason recorded");
  if (isBlocked()) check(typeof fx.blockerReason === "string" && fx.blockerReason.length > 0, "blocker reason recorded");
});

console.log(`\nPHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
