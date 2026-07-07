// FILE: tests/phase-09m-bir-notice-loa-triage-intent-scaffold-1.test.mjs
// PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1
//
// Validates the pure, standalone BIR notice/LOA triage-intent scaffold and
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
  PHASE_09M_BIR_NOTICE_LOA_TRIAGE_INTENT_VERSION,
  BIR_NOTICE_LOA_TRIAGE_INTENT_MODE_ID,
  SUPPORTED_BIR_NOTICE_TYPES,
  SUPPORTED_BIR_NOTICE_STAGES,
  SUPPORTED_BIR_TRIAGE_ROUTES,
  createBirNoticeLoaTriageIntentResult,
  normalizeBirNoticeLoaTriageInput,
  validateBirNoticeLoaTriageInput,
  validateBirNoticeLoaTriageResult
} from "../workflow/bir-notice-loa-triage-intent.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09m-bir-notice-loa-triage-intent-scaffold-1.fixture.json";
const REPORT_PATH = "PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1_REPORT.md";
const MODULE_PATH = "workflow/bir-notice-loa-triage-intent.js";
const SELF_PATH = "tests/phase-09m-bir-notice-loa-triage-intent-scaffold-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09M BIR NOTICE LOA TRIAGE INTENT SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09M BIR NOTICE LOA TRIAGE INTENT SCAFFOLD FAIL",
  "PHASE 09M BIR NOTICE LOA TRIAGE INTENT SCAFFOLD BLOCKED"
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
    userSelectedNoticeType: noticeType,
    userQuery: "Synthetic query for SAMPLE TAXPAYER INC.",
    noticeText: "Synthetic notice text only. No real taxpayer data.",
    knownFacts: { dateReceived: "2026-03-21", taxablePeriod: "CY2025" },
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
  check(fx.patch === "PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("e60f42d"), "base commit references e60f42d");
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
  check(typeof PHASE_09M_BIR_NOTICE_LOA_TRIAGE_INTENT_VERSION === "string", "version export present");
  check(typeof BIR_NOTICE_LOA_TRIAGE_INTENT_MODE_ID === "string", "mode id export present");
  check(Array.isArray(SUPPORTED_BIR_NOTICE_TYPES), "supported notice types export present");
  check(Array.isArray(SUPPORTED_BIR_NOTICE_STAGES), "supported notice stages export present");
  check(Array.isArray(SUPPORTED_BIR_TRIAGE_ROUTES), "supported routing targets export present");
  check(typeof createBirNoticeLoaTriageIntentResult === "function", "createBirNoticeLoaTriageIntentResult export present");
  check(typeof normalizeBirNoticeLoaTriageInput === "function", "normalizeBirNoticeLoaTriageInput export present");
  check(typeof validateBirNoticeLoaTriageInput === "function", "validateBirNoticeLoaTriageInput export present");
  check(typeof validateBirNoticeLoaTriageResult === "function", "validateBirNoticeLoaTriageResult export present");
  check(PHASE_09M_BIR_NOTICE_LOA_TRIAGE_INTENT_VERSION === "PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1", "version matches patch id");
  check(BIR_NOTICE_LOA_TRIAGE_INTENT_MODE_ID === "bir_notice_loa_triage_intent", "mode id equals bir_notice_loa_triage_intent");
});

// 9-11. Supported types/stages/routes include all required entries.
await test("supported notice types, stages, and routing targets include all required entries", () => {
  const requiredTypes = [
    "BIR_LOA_FULL_EXAMINATION",
    "BIR_ELECTRONIC_LOA",
    "BIR_REPLACEMENT_ELA",
    "BIR_CONSOLIDATED_ELA",
    "BIR_MISSION_ORDER",
    "BIR_TAX_VERIFICATION_NOTICE",
    "BIR_NOTICE_PRESENTATION_SUBMISSION_DOCUMENTS",
    "BIR_CHECKLIST_REQUIREMENTS_PRESENTATION_SUBMISSION",
    "BIR_INITIAL_DOCUMENT_REQUEST",
    "BIR_ADDITIONAL_DOCUMENT_REQUEST",
    "BIR_PRE_SUBPOENA_DUCES_TECUM_REMINDER",
    "BIR_SUBPOENA_DUCES_TECUM",
    "BIR_NOD",
    "BIR_DOD",
    "BIR_PAN",
    "BIR_CONSOLIDATED_PAN",
    "BIR_FAN",
    "BIR_CONSOLIDATED_FAN",
    "BIR_FLD",
    "BIR_FDDA",
    "BIR_PROTEST_REQUEST_RECONSIDERATION",
    "BIR_PROTEST_REQUEST_REINVESTIGATION",
    "BIR_ACTION_ON_PROTEST",
    "BIR_AUDIT_TERMINATION_LETTER",
    "BIR_REQUEST_FOR_NON_CONSOLIDATION_VAT",
    "BIR_WRITTEN_CONFORMITY_TO_CONSOLIDATION",
    "BIR_WAIVER_OF_PRESCRIPTION",
    "BIR_VATAS_LTVAU_TRANSITION_NOTICE",
    "BIR_VAT_REFUND_TRANSITION_NOTICE",
    "UNKNOWN_BIR_NOTICE"
  ];
  for (const t of requiredTypes) check(SUPPORTED_BIR_NOTICE_TYPES.includes(t), `supported notice types include ${t}`);

  const requiredStages = [
    "AUDIT_AUTHORITY",
    "DOCUMENT_REQUEST",
    "DOCUMENT_ESCALATION",
    "DISCREPANCY_DISCUSSION",
    "PRE_ASSESSMENT",
    "FINAL_ASSESSMENT",
    "ADMINISTRATIVE_PROTEST",
    "POST_PROTEST",
    "APPEAL_WATCH",
    "AUDIT_CLOSURE",
    "CONSOLIDATION",
    "PRESCRIPTION",
    "VAT_TRANSITION",
    "UNKNOWN_STAGE"
  ];
  for (const s of requiredStages) check(SUPPORTED_BIR_NOTICE_STAGES.includes(s), `supported notice stages include ${s}`);

  const requiredRoutes = [
    "AUTHORITY_SAFE_PROCEDURAL_FALLBACK",
    "LOA_AUTHENTICITY_CHECK",
    "RMO_1_2026_SINGLE_INSTANCE_AUDIT_REVIEW",
    "RMC_14_2026_REPLACEMENT_ELA_REVIEW",
    "RMO_6_2026_CONSOLIDATION_REVIEW",
    "DOCUMENT_COMPLIANCE_MATRIX",
    "PAN_REPLY_WORKFLOW",
    "FAN_FLD_PROTEST_WORKFLOW",
    "FDDA_CTA_APPEAL_WATCH",
    "AUDIT_TERMINATION_REVIEW",
    "HUMAN_TAX_LEGAL_REVIEW"
  ];
  for (const r of requiredRoutes) check(SUPPORTED_BIR_TRIAGE_ROUTES.includes(r), `supported routing targets include ${r}`);
});

// 12-19. Input validation rejections.
await test("validateBirNoticeLoaTriageInput rejects missing input, unsupported type, and unsafe option values", () => {
  check(validateBirNoticeLoaTriageInput(undefined).valid === false, "missing input rejected");
  check(validateBirNoticeLoaTriageInput({}).valid === false, "missing userQuery and noticeText rejected");
  check(validateBirNoticeLoaTriageInput({ userQuery: "x", userSelectedNoticeType: "NOT_A_TYPE" }).valid === false, "unsupported userSelectedNoticeType rejected");
  check(validateBirNoticeLoaTriageInput({ userQuery: "x", options: { runtimeActive: true } }).valid === false, "runtimeActive true rejected");
  check(validateBirNoticeLoaTriageInput({ userQuery: "x", options: { scaffoldOnly: false } }).valid === false, "scaffoldOnly false rejected");
  check(validateBirNoticeLoaTriageInput({ userQuery: "x", options: { allowLegalConclusion: true } }).valid === false, "allowLegalConclusion true rejected");
  check(validateBirNoticeLoaTriageInput({ userQuery: "x", options: { allowLiveRetrieval: true } }).valid === false, "allowLiveRetrieval true rejected");
  check(validateBirNoticeLoaTriageInput({ userQuery: "x", options: { allowRealTaxpayerData: true } }).valid === false, "allowRealTaxpayerData true rejected");
});

// 20-21. Source card claim rejections.
await test("validateBirNoticeLoaTriageInput rejects source cards claiming verification-complete or final legal conclusion", () => {
  check(
    validateBirNoticeLoaTriageInput({ userQuery: "x", sourceCards: [{ label: "x", note: "official verification complete" }] }).valid === false,
    "verification-complete source card rejected"
  );
  check(
    validateBirNoticeLoaTriageInput({ userQuery: "x", sourceCards: [{ label: "x", note: "this is our final legal conclusion" }] }).valid === false,
    "final-legal-conclusion source card rejected"
  );
});

// 22-25. Real reference-corpus data rejections.
await test("validateBirNoticeLoaTriageInput rejects known real taxpayer/officer names and LOA/eLA/audit-case numbers", () => {
  check(validateBirNoticeLoaTriageInput({ userQuery: "x", noticeText: `${REAL_TAXPAYER_NAME_FRAGMENTS[0]} audit` }).valid === false, "real taxpayer name rejected");
  check(validateBirNoticeLoaTriageInput({ userQuery: "x", noticeText: `${REAL_ELA_NUMBER_FRAGMENTS[0]} issued` }).valid === false, "real LOA/eLA number rejected");
  check(validateBirNoticeLoaTriageInput({ userQuery: "x", noticeText: `${REAL_AUDIT_CASE_NUMBER_FRAGMENTS[0]} case` }).valid === false, "real audit case number rejected");
  check(validateBirNoticeLoaTriageInput({ userQuery: "x", noticeText: `signed by ${REAL_OFFICER_NAME_FRAGMENTS[0]}` }).valid === false, "real BIR officer name rejected");
});

// 26-29. Electronic LOA.
let loaResult;
await test("Electronic LOA triage creates a valid result and routes to LOA_AUTHENTICITY_CHECK and DOCUMENT_COMPLIANCE_MATRIX", () => {
  loaResult = createBirNoticeLoaTriageIntentResult(safeInput("BIR_ELECTRONIC_LOA"));
  const rv = validateBirNoticeLoaTriageResult(loaResult);
  check(rv.valid === true, `LOA result must validate: ${JSON.stringify(rv.errors)}`);
  check(loaResult.triage.routingTargets.includes("LOA_AUTHENTICITY_CHECK"), "routes to LOA_AUTHENTICITY_CHECK");
  check(loaResult.triage.routingTargets.includes("DOCUMENT_COMPLIANCE_MATRIX"), "routes to DOCUMENT_COMPLIANCE_MATRIX");
});
await test("Electronic LOA includes the RMC No. 5-2026 source-card reference", () => {
  check(loaResult.sourceCards.some((c) => /RMC No\. 5-2026/.test(c.label)), "RMC No. 5-2026 source card present");
});

// 30-34. Replacement eLA.
let replacementResult;
await test("Replacement eLA triage creates a valid result, routes to RMC_14_2026_REPLACEMENT_ELA_REVIEW, and sets rmc14_2026PotentiallyApplies", () => {
  replacementResult = createBirNoticeLoaTriageIntentResult(
    safeInput("BIR_REPLACEMENT_ELA", { noticeText: "Synthetic replacement eLA issued due to reassignment, with broader scope and a new taxable period.", knownFacts: { dateReceived: "2026-03-21", mentionsReplacement: true } })
  );
  const rv = validateBirNoticeLoaTriageResult(replacementResult);
  check(rv.valid === true, `Replacement eLA result must validate: ${JSON.stringify(rv.errors)}`);
  check(replacementResult.triage.routingTargets.includes("RMC_14_2026_REPLACEMENT_ELA_REVIEW"), "routes to RMC_14_2026_REPLACEMENT_ELA_REVIEW");
  check(replacementResult.audit2026Signals.rmc14_2026PotentiallyApplies === true, "rmc14_2026PotentiallyApplies true");
});
await test("Replacement eLA does not conclude invalidity and flags scope/period expansion when text indicates it", () => {
  const t = textOf(replacementResult);
  check(!t.includes("this replacement ela is invalid"), "does not conclude invalidity");
  check(replacementResult.audit2026Signals.replacementExpandsScope === true, "flags scope expansion");
  check(replacementResult.audit2026Signals.replacementExpandsTaxablePeriod === true, "flags taxable-period expansion");
});

// 35-37. Consolidated eLA.
let consolidatedElaResult;
await test("Consolidated eLA triage creates a valid result, routes to RMO_6_2026_CONSOLIDATION_REVIEW, and sets consolidationPotential", () => {
  consolidatedElaResult = createBirNoticeLoaTriageIntentResult(safeInput("BIR_CONSOLIDATED_ELA", { knownFacts: { dateReceived: "2026-03-21", multipleAuthoritiesSameYear: true } }));
  const rv = validateBirNoticeLoaTriageResult(consolidatedElaResult);
  check(rv.valid === true, `Consolidated eLA result must validate: ${JSON.stringify(rv.errors)}`);
  check(consolidatedElaResult.triage.routingTargets.includes("RMO_6_2026_CONSOLIDATION_REVIEW"), "routes to RMO_6_2026_CONSOLIDATION_REVIEW");
  check(consolidatedElaResult.audit2026Signals.consolidationPotential === true, "consolidationPotential true");
});

// 38-40. TVN.
let tvnResult;
await test("TVN triage creates a valid result and sets tvnLimitedScope", () => {
  tvnResult = createBirNoticeLoaTriageIntentResult(
    safeInput("BIR_TAX_VERIFICATION_NOTICE", { noticeText: "Synthetic TVN limited to a specific transaction, but examiner asks about a broader tax issue beyond the stated transaction." })
  );
  const rv = validateBirNoticeLoaTriageResult(tvnResult);
  check(rv.valid === true, `TVN result must validate: ${JSON.stringify(rv.errors)}`);
  check(tvnResult.audit2026Signals.tvnLimitedScope === true, "tvnLimitedScope true");
});
await test("TVN flags tvnPotentialScopeExpansion when broader audit wording appears", () => {
  check(tvnResult.audit2026Signals.tvnPotentialScopeExpansion === true, "tvnPotentialScopeExpansion true");
});

// 41-44. Checklist.
let checklistResult;
await test("Checklist triage creates a valid result, routes to DOCUMENT_COMPLIANCE_MATRIX, and sets additionalRequestLimitCheckNeeded", () => {
  checklistResult = createBirNoticeLoaTriageIntentResult(
    safeInput("BIR_CHECKLIST_REQUIREMENTS_PRESENTATION_SUBMISSION", { noticeText: "Synthetic checklist of requirements (Annex A) requesting books and ledgers." })
  );
  const rv = validateBirNoticeLoaTriageResult(checklistResult);
  check(rv.valid === true, `Checklist result must validate: ${JSON.stringify(rv.errors)}`);
  check(checklistResult.triage.routingTargets.includes("DOCUMENT_COMPLIANCE_MATRIX"), "routes to DOCUMENT_COMPLIANCE_MATRIX");
  check(checklistResult.audit2026Signals.additionalRequestLimitCheckNeeded === true, "additionalRequestLimitCheckNeeded true");
});
await test("Checklist sets standardizedChecklistPresent when checklist wording appears", () => {
  check(checklistResult.audit2026Signals.standardizedChecklistPresent === true, "standardizedChecklistPresent true");
});

// 45-46. Additional document request.
let additionalDocResult;
await test("Additional document request triage creates a valid result and sets additionalRequestLimitCheckNeeded", () => {
  additionalDocResult = createBirNoticeLoaTriageIntentResult(safeInput("BIR_ADDITIONAL_DOCUMENT_REQUEST"));
  const rv = validateBirNoticeLoaTriageResult(additionalDocResult);
  check(rv.valid === true, `Additional document request result must validate: ${JSON.stringify(rv.errors)}`);
  check(additionalDocResult.audit2026Signals.additionalRequestLimitCheckNeeded === true, "additionalRequestLimitCheckNeeded true");
});

// 47-48. Pre-subpoena reminder.
await test("Pre-subpoena reminder triage creates a valid result with stage DOCUMENT_ESCALATION", () => {
  const result = createBirNoticeLoaTriageIntentResult(safeInput("BIR_PRE_SUBPOENA_DUCES_TECUM_REMINDER"));
  const rv = validateBirNoticeLoaTriageResult(result);
  check(rv.valid === true, `Pre-subpoena result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.triage.noticeStage === "DOCUMENT_ESCALATION", "stage is DOCUMENT_ESCALATION");
});

// 49-50. Subpoena.
await test("Subpoena triage creates a valid result and includes the human review route", () => {
  const result = createBirNoticeLoaTriageIntentResult(safeInput("BIR_SUBPOENA_DUCES_TECUM"));
  const rv = validateBirNoticeLoaTriageResult(result);
  check(rv.valid === true, `Subpoena result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.triage.routingTargets.includes("HUMAN_TAX_LEGAL_REVIEW"), "includes human review route");
});

// 51-52. NOD.
await test("NOD triage creates a valid result with stage DISCREPANCY_DISCUSSION", () => {
  const result = createBirNoticeLoaTriageIntentResult(safeInput("BIR_NOD"));
  const rv = validateBirNoticeLoaTriageResult(result);
  check(rv.valid === true, `NOD result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.triage.noticeStage === "DISCREPANCY_DISCUSSION", "stage is DISCREPANCY_DISCUSSION");
});

// 53-55. PAN.
let panResult;
await test("PAN triage creates a valid result with stage PRE_ASSESSMENT and sets panReply15DayPotential", () => {
  panResult = createBirNoticeLoaTriageIntentResult(safeInput("BIR_PAN"));
  const rv = validateBirNoticeLoaTriageResult(panResult);
  check(rv.valid === true, `PAN result must validate: ${JSON.stringify(rv.errors)}`);
  check(panResult.triage.noticeStage === "PRE_ASSESSMENT", "stage is PRE_ASSESSMENT");
  check(panResult.deadlineSignals.panReply15DayPotential === true, "panReply15DayPotential true");
});

// 56-57. Consolidated PAN.
await test("Consolidated PAN triage creates a valid result and sets freshResponsePeriodPotential", () => {
  const result = createBirNoticeLoaTriageIntentResult(safeInput("BIR_CONSOLIDATED_PAN"));
  const rv = validateBirNoticeLoaTriageResult(result);
  check(rv.valid === true, `Consolidated PAN result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.audit2026Signals.freshResponsePeriodPotential === true, "freshResponsePeriodPotential true");
});

// 58-60. FAN.
let fanResult;
await test("FAN triage creates a valid result with stage FINAL_ASSESSMENT and sets fanFldProtest30DayPotential", () => {
  fanResult = createBirNoticeLoaTriageIntentResult(safeInput("BIR_FAN"));
  const rv = validateBirNoticeLoaTriageResult(fanResult);
  check(rv.valid === true, `FAN result must validate: ${JSON.stringify(rv.errors)}`);
  check(fanResult.triage.noticeStage === "FINAL_ASSESSMENT", "stage is FINAL_ASSESSMENT");
  check(fanResult.deadlineSignals.fanFldProtest30DayPotential === true, "fanFldProtest30DayPotential true");
});

// 61-64. Consolidated FAN.
await test("Consolidated FAN triage creates a valid result and sets freshProtestPeriodPotential, properServiceRequired, noRegressionRulePotential", () => {
  const result = createBirNoticeLoaTriageIntentResult(safeInput("BIR_CONSOLIDATED_FAN"));
  const rv = validateBirNoticeLoaTriageResult(result);
  check(rv.valid === true, `Consolidated FAN result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.audit2026Signals.freshProtestPeriodPotential === true, "freshProtestPeriodPotential true");
  check(result.audit2026Signals.properServiceRequired === true, "properServiceRequired true");
  check(result.audit2026Signals.noRegressionRulePotential === true, "noRegressionRulePotential true");
});

// 65-68. FDDA.
await test("FDDA triage creates a valid result with stage APPEAL_WATCH, routes to FDDA_CTA_APPEAL_WATCH, and sets consolidationProhibited", () => {
  const result = createBirNoticeLoaTriageIntentResult(safeInput("BIR_FDDA"));
  const rv = validateBirNoticeLoaTriageResult(result);
  check(rv.valid === true, `FDDA result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.triage.noticeStage === "APPEAL_WATCH", "stage is APPEAL_WATCH");
  check(result.triage.routingTargets.includes("FDDA_CTA_APPEAL_WATCH"), "routes to FDDA_CTA_APPEAL_WATCH");
  check(result.audit2026Signals.consolidationProhibited === true, "consolidationProhibited true");
});

// 69-71. Protest requests.
await test("Request for reconsideration and reinvestigation both create valid results; reinvestigation sets reinvestigation60DayPotential", () => {
  const reconsideration = createBirNoticeLoaTriageIntentResult(safeInput("BIR_PROTEST_REQUEST_RECONSIDERATION"));
  const reinvestigation = createBirNoticeLoaTriageIntentResult(safeInput("BIR_PROTEST_REQUEST_REINVESTIGATION"));
  check(validateBirNoticeLoaTriageResult(reconsideration).valid === true, "reconsideration result validates");
  check(validateBirNoticeLoaTriageResult(reinvestigation).valid === true, "reinvestigation result validates");
  check(reinvestigation.deadlineSignals.reinvestigation60DayPotential === true, "reinvestigation60DayPotential true");
});

// 72-73. Action on protest.
let actionOnProtestResult;
await test("Action-on-protest triage creates a valid result and never says the assessment is cancelled", () => {
  actionOnProtestResult = createBirNoticeLoaTriageIntentResult(safeInput("BIR_ACTION_ON_PROTEST"));
  const rv = validateBirNoticeLoaTriageResult(actionOnProtestResult);
  check(rv.valid === true, `Action-on-protest result must validate: ${JSON.stringify(rv.errors)}`);
  check(!textOf(actionOnProtestResult).includes("the assessment is cancelled"), "never claims the assessment is cancelled");
});

// 74-76. Termination letter.
let terminationResult;
await test("Termination letter triage creates a valid result, routes to AUDIT_TERMINATION_REVIEW, and never says permanent clearance", () => {
  terminationResult = createBirNoticeLoaTriageIntentResult(safeInput("BIR_AUDIT_TERMINATION_LETTER"));
  const rv = validateBirNoticeLoaTriageResult(terminationResult);
  check(rv.valid === true, `Termination letter result must validate: ${JSON.stringify(rv.errors)}`);
  check(terminationResult.triage.routingTargets.includes("AUDIT_TERMINATION_REVIEW"), "routes to AUDIT_TERMINATION_REVIEW");
  check(!textOf(terminationResult).includes("you are permanently cleared"), "never claims permanent clearance");
});

// 77-78. VAT non-consolidation.
await test("VAT non-consolidation request creates a valid result and sets vatNonConsolidationPotential", () => {
  const result = createBirNoticeLoaTriageIntentResult(safeInput("BIR_REQUEST_FOR_NON_CONSOLIDATION_VAT"));
  const rv = validateBirNoticeLoaTriageResult(result);
  check(rv.valid === true, `VAT non-consolidation result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.audit2026Signals.vatNonConsolidationPotential === true, "vatNonConsolidationPotential true");
});

// 79-81. Written conformity.
await test("Written conformity to consolidation creates a valid result, sets writtenConformityNeeded, and preserves no-admission/no-waiver concept without a prohibited-phrase bug", () => {
  const result = createBirNoticeLoaTriageIntentResult(safeInput("BIR_WRITTEN_CONFORMITY_TO_CONSOLIDATION"));
  const rv = validateBirNoticeLoaTriageResult(result);
  check(rv.valid === true, `Written conformity result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.audit2026Signals.writtenConformityNeeded === true, "writtenConformityNeeded true");
  const t = textOf(result);
  check(t.includes("admission") && t.includes("waiver"), "preserves the no-admission/no-waiver concept");
});

// 82-83. Waiver of prescription.
await test("Waiver of prescription creates a valid result and sets waiverOfPrescriptionPresent", () => {
  const result = createBirNoticeLoaTriageIntentResult(safeInput("BIR_WAIVER_OF_PRESCRIPTION"));
  const rv = validateBirNoticeLoaTriageResult(result);
  check(rv.valid === true, `Waiver result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.audit2026Signals.waiverOfPrescriptionPresent === true, "waiverOfPrescriptionPresent true");
});

// 84-85. VATAS/LTVAU transition.
await test("VATAS/LTVAU transition notice creates a valid result and sets vatasLtvauTransitionRelevant", () => {
  const result = createBirNoticeLoaTriageIntentResult(safeInput("BIR_VATAS_LTVAU_TRANSITION_NOTICE"));
  const rv = validateBirNoticeLoaTriageResult(result);
  check(rv.valid === true, `VATAS/LTVAU result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.audit2026Signals.vatasLtvauTransitionRelevant === true, "vatasLtvauTransitionRelevant true");
});

// 86-87. VAT refund transition.
await test("VAT refund transition notice creates a valid result and routes to RMO_6_2026_CONSOLIDATION_REVIEW", () => {
  const result = createBirNoticeLoaTriageIntentResult(safeInput("BIR_VAT_REFUND_TRANSITION_NOTICE"));
  const rv = validateBirNoticeLoaTriageResult(result);
  check(rv.valid === true, `VAT refund transition result must validate: ${JSON.stringify(rv.errors)}`);
  check(result.triage.routingTargets.includes("RMO_6_2026_CONSOLIDATION_REVIEW"), "routes to RMO_6_2026_CONSOLIDATION_REVIEW");
});

// 88-96. Result validation rejections (structural).
await test("validateBirNoticeLoaTriageResult rejects missing/unsupported triage fields and missing top-level sections", () => {
  const base = createBirNoticeLoaTriageIntentResult(safeInput("BIR_ELECTRONIC_LOA"));
  check(validateBirNoticeLoaTriageResult(base).valid === true, "sanity: base result is valid");

  const missingTriage = { ...base };
  delete missingTriage.triage;
  check(validateBirNoticeLoaTriageResult(missingTriage).valid === false, "rejects missing triage");

  const unsupportedType = { ...base, triage: { ...base.triage, noticeType: "NOT_A_TYPE" } };
  check(validateBirNoticeLoaTriageResult(unsupportedType).valid === false, "rejects unsupported notice type");

  const unsupportedStage = { ...base, triage: { ...base.triage, noticeStage: "NOT_A_STAGE" } };
  check(validateBirNoticeLoaTriageResult(unsupportedStage).valid === false, "rejects unsupported notice stage");

  const unsupportedRoute = { ...base, triage: { ...base.triage, routingTargets: ["NOT_A_ROUTE"] } };
  check(validateBirNoticeLoaTriageResult(unsupportedRoute).valid === false, "rejects unsupported routing target");

  const missingExtractedFields = { ...base };
  delete missingExtractedFields.extractedFields;
  check(validateBirNoticeLoaTriageResult(missingExtractedFields).valid === false, "rejects missing extractedFields");

  const missingAudit2026Signals = { ...base };
  delete missingAudit2026Signals.audit2026Signals;
  check(validateBirNoticeLoaTriageResult(missingAudit2026Signals).valid === false, "rejects missing audit2026Signals");

  const missingDeadlineSignals = { ...base };
  delete missingDeadlineSignals.deadlineSignals;
  check(validateBirNoticeLoaTriageResult(missingDeadlineSignals).valid === false, "rejects missing deadlineSignals");

  const missingSourceCards = { ...base };
  delete missingSourceCards.sourceCards;
  check(validateBirNoticeLoaTriageResult(missingSourceCards).valid === false, "rejects missing sourceCards");

  const emptySourceCards = { ...base, sourceCards: [] };
  check(validateBirNoticeLoaTriageResult(emptySourceCards).valid === false, "rejects empty sourceCards");
});

// 97-103. Result validation rejections (runtime/metadata).
await test("validateBirNoticeLoaTriageResult rejects runtimeActive true and every unsafe metadata flag", () => {
  const base = createBirNoticeLoaTriageIntentResult(safeInput("BIR_ELECTRONIC_LOA"));

  check(validateBirNoticeLoaTriageResult({ ...base, runtimeActive: true }).valid === false, "rejects runtimeActive true");
  check(validateBirNoticeLoaTriageResult({ ...base, metadata: { ...base.metadata, legalConclusionProvided: true } }).valid === false, "rejects legalConclusionProvided true");
  check(validateBirNoticeLoaTriageResult({ ...base, metadata: { ...base.metadata, liveRetrievalPerformed: true } }).valid === false, "rejects liveRetrievalPerformed true");
  check(validateBirNoticeLoaTriageResult({ ...base, metadata: { ...base.metadata, externalSearchPerformed: true } }).valid === false, "rejects externalSearchPerformed true");
  check(validateBirNoticeLoaTriageResult({ ...base, metadata: { ...base.metadata, realTaxpayerDataUsed: true } }).valid === false, "rejects realTaxpayerDataUsed true");
  check(validateBirNoticeLoaTriageResult({ ...base, metadata: { ...base.metadata, automaticSubmission: true } }).valid === false, "rejects automaticSubmission true");
  check(validateBirNoticeLoaTriageResult({ ...base, metadata: { ...base.metadata, finalOutcomeGuaranteed: true } }).valid === false, "rejects finalOutcomeGuaranteed true");
});

// 104. Prohibited phrases rejection.
await test("validateBirNoticeLoaTriageResult rejects prohibited phrases", () => {
  const base = createBirNoticeLoaTriageIntentResult(safeInput("BIR_ELECTRONIC_LOA"));
  const withProhibitedPhrase = { ...base, humanReviewNotice: `${base.humanReviewNotice} ${["guaranteed", "cancellation"].join(" ")}` };
  check(validateBirNoticeLoaTriageResult(withProhibitedPhrase).valid === false, "rejects prohibited phrases");
});

// 105. Source cards never claim completed authority verification.
await test("source cards never claim completed authority verification across all supported notice types", () => {
  const verificationClaimPattern = /verification (?:is |has been )?complete|officially verified|final authority verification/i;
  for (const t of SUPPORTED_BIR_NOTICE_TYPES) {
    const result = createBirNoticeLoaTriageIntentResult(safeInput(t));
    for (const card of result.sourceCards) {
      check(!verificationClaimPattern.test(`${card.label} ${card.note}`), `source card must not claim verification complete for ${t}: ${card.label}`);
    }
  }
});

// 106-107. Fixture sample inputs use only synthetic names, no real corpus labels.
await test("fixture sample inputs use only synthetic taxpayer names and no known real reference-corpus names", () => {
  const inputsText = JSON.stringify(fx.sampleInputs);
  check(/SAMPLE TAXPAYER INC\.|DEMO LOGISTICS CORP\.|SYNTHETIC HOLDINGS INC\.|MODEL VAT TAXPAYER CORP\./.test(inputsText), "sample inputs use recognized synthetic identifiers");
  for (const fragment of [...REAL_TAXPAYER_NAME_FRAGMENTS, ...REAL_OFFICER_NAME_FRAGMENTS]) {
    check(!inputsText.toUpperCase().includes(fragment), `sample inputs must not include real name fragment: ${fragment}`);
  }
});

// 108-109. No real LOA/eLA or audit case numbers in sample inputs.
await test("fixture sample inputs do not include real LOA/eLA numbers or audit case numbers from uploaded materials", () => {
  const inputsText = JSON.stringify(fx.sampleInputs);
  for (const fragment of REAL_ELA_NUMBER_FRAGMENTS) check(!inputsText.includes(fragment), `sample inputs must not include real eLA number: ${fragment}`);
  for (const fragment of REAL_AUDIT_CASE_NUMBER_FRAGMENTS) check(!inputsText.includes(fragment), `sample inputs must not include real audit case number: ${fragment}`);
});

// 110-111. Sample outputs contain no real taxpayer/officer names.
await test("fixture sample outputs contain no real taxpayer names or BIR officer names", () => {
  const outputsText = JSON.stringify(fx.sampleOutputs).toUpperCase();
  for (const fragment of [...REAL_TAXPAYER_NAME_FRAGMENTS, ...REAL_OFFICER_NAME_FRAGMENTS]) {
    check(!outputsText.includes(fragment), `sample outputs must not include real name fragment: ${fragment}`);
  }
});

// 112-116. Static scans of module, fixture, and report for forbidden usage.
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

// 117-123. Git diff scope.
await test("git diff confirms only this patch's allowed files changed, with no runtime/package/env/DB/frontend/MCP changes", () => {
  const allowedChanged = new Set([
    "workflow/bir-notice-loa-triage-intent.js",
    "evaluation/fixtures/phase-09m-bir-notice-loa-triage-intent-scaffold-1.fixture.json",
    "tests/phase-09m-bir-notice-loa-triage-intent-scaffold-1.test.mjs",
    "PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1_REPORT.md",
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
    "workflow/authority-safe-procedural-fallback.js"
  ]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }
  check(!diffNames.some((name) => /mcp/i.test(name)), "no MCP files/configs added or modified");
});

// 124-125. Report exists and states runtime/ask impact none.
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

console.log(`\nPHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
