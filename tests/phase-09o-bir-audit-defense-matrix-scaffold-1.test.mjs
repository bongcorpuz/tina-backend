// FILE: tests/phase-09o-bir-audit-defense-matrix-scaffold-1.test.mjs
// PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1
//
// Validates the pure, standalone BIR audit defense matrix scaffold and its
// fixture/report. NO server/ask-handler/pipeline/route import, NO OpenAI/
// Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR calls, NO web search,
// NO browser automation, NO server start, NO port binding, NO staging/
// production/localhost calls, NO env secret reads, NO HTTP requests of any
// kind.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  PHASE_09O_BIR_AUDIT_DEFENSE_MATRIX_VERSION,
  BIR_AUDIT_DEFENSE_MATRIX_MODE_ID,
  SUPPORTED_DEFENSE_MATRIX_ISSUE_TYPES,
  SUPPORTED_DEFENSE_MATRIX_RISK_LEVELS,
  SUPPORTED_DEFENSE_MATRIX_ROUTES,
  SUPPORTED_DEFENSE_MATRIX_EVIDENCE_STATUSES,
  createBirAuditDefenseMatrixResult,
  normalizeBirAuditDefenseMatrixInput,
  validateBirAuditDefenseMatrixInput,
  validateBirAuditDefenseMatrixResult
} from "../workflow/bir-audit-defense-matrix.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09o-bir-audit-defense-matrix-scaffold-1.fixture.json";
const REPORT_PATH = "PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1_REPORT.md";
const MODULE_PATH = "workflow/bir-audit-defense-matrix.js";
const SELF_PATH = "tests/phase-09o-bir-audit-defense-matrix-scaffold-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09O BIR AUDIT DEFENSE MATRIX SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09O BIR AUDIT DEFENSE MATRIX SCAFFOLD FAIL",
  "PHASE 09O BIR AUDIT DEFENSE MATRIX SCAFFOLD BLOCKED"
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

function findingInput(issueType, overrides = {}) {
  return {
    issueType,
    birFinding: "Synthetic finding only.",
    taxpayerPosition: "Synthetic position only.",
    amountPresent: false,
    documentsAvailable: ["Synthetic supporting document"],
    documentsMissing: ["Synthetic missing document"],
    evidenceStatus: "partial",
    authorityNeeded: [],
    riskLevel: "medium",
    ...overrides
  };
}

function safeInput(issueType, contextOverrides = {}, findingOverrides = {}) {
  return {
    userQuery: "Synthetic query for SAMPLE TAXPAYER INC.",
    workflowContext: { noticeType: "BIR_FAN_FLD", noticeStage: "FINAL_ASSESSMENT", taxablePeriod: "CY2025", receiptDateKnown: true, ...contextOverrides },
    findings: [findingInput(issueType, findingOverrides)],
    sourceCards: []
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
  check(fx.patch === "PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("c27a1e3"), "base commit references c27a1e3");
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
  check(typeof PHASE_09O_BIR_AUDIT_DEFENSE_MATRIX_VERSION === "string", "version export present");
  check(typeof BIR_AUDIT_DEFENSE_MATRIX_MODE_ID === "string", "mode id export present");
  check(Array.isArray(SUPPORTED_DEFENSE_MATRIX_ISSUE_TYPES), "supported issue types export present");
  check(Array.isArray(SUPPORTED_DEFENSE_MATRIX_RISK_LEVELS), "supported risk levels export present");
  check(Array.isArray(SUPPORTED_DEFENSE_MATRIX_ROUTES), "supported routes export present");
  check(Array.isArray(SUPPORTED_DEFENSE_MATRIX_EVIDENCE_STATUSES), "supported evidence statuses export present");
  check(typeof createBirAuditDefenseMatrixResult === "function", "createBirAuditDefenseMatrixResult export present");
  check(typeof normalizeBirAuditDefenseMatrixInput === "function", "normalizeBirAuditDefenseMatrixInput export present");
  check(typeof validateBirAuditDefenseMatrixInput === "function", "validateBirAuditDefenseMatrixInput export present");
  check(typeof validateBirAuditDefenseMatrixResult === "function", "validateBirAuditDefenseMatrixResult export present");
  check(PHASE_09O_BIR_AUDIT_DEFENSE_MATRIX_VERSION === "PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1", "version matches patch id");
  check(BIR_AUDIT_DEFENSE_MATRIX_MODE_ID === "bir_audit_defense_matrix", "mode id equals bir_audit_defense_matrix");
});

// 9-12. Supported issue/risk/evidence/route entries.
await test("supported issue types, risk levels, evidence statuses, and routes include all required entries", () => {
  for (const t of [
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
    "DOCUMENT_REQUEST_SCOPE",
    "SUBPOENA_OR_PRE_SUBPOENA",
    "NOD_DOD_PROCESS",
    "PAN_REPLY",
    "FAN_FLD_PROTEST",
    "FDDA_APPEAL_WATCH",
    "TERMINATION_LETTER_SCOPE",
    "UNKNOWN_ISSUE"
  ]) {
    check(SUPPORTED_DEFENSE_MATRIX_ISSUE_TYPES.includes(t), `supported issue types include ${t}`);
  }
  for (const r of ["low", "medium", "high", "critical", "unknown"]) check(SUPPORTED_DEFENSE_MATRIX_RISK_LEVELS.includes(r), `supported risk levels include ${r}`);
  for (const e of ["available", "partial", "missing", "not_applicable", "non_existent", "substitute_available", "requires_reconciliation", "unknown"]) {
    check(SUPPORTED_DEFENSE_MATRIX_EVIDENCE_STATUSES.includes(e), `supported evidence statuses include ${e}`);
  }
  for (const r of [
    "AUTHORITY_SAFE_PROCEDURAL_FALLBACK",
    "BIR_NOTICE_TRIAGE",
    "PAN_FAN_FLD_PROTEST_WORKFLOW",
    "DOCUMENT_COMPLIANCE_TRANSMITTAL",
    "AUTHORITY_CORPUS_RESEARCH",
    "HUMAN_TAX_LEGAL_REVIEW"
  ]) {
    check(SUPPORTED_DEFENSE_MATRIX_ROUTES.includes(r), `supported routes include ${r}`);
  }
});

// 13-19. Input validation rejections.
await test("validateBirAuditDefenseMatrixInput rejects missing input, unsupported values, and unsafe options", () => {
  check(validateBirAuditDefenseMatrixInput(undefined).valid === false, "missing input rejected");
  check(validateBirAuditDefenseMatrixInput({}).valid === false, "missing userQuery and findings rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: "x", findings: [{ issueType: "NOT_A_TYPE" }] }).valid === false, "unsupported issueType rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: "x", findings: [{ issueType: "UNKNOWN_ISSUE", riskLevel: "extreme" }] }).valid === false, "unsupported riskLevel rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: "x", findings: [{ issueType: "UNKNOWN_ISSUE", evidenceStatus: "lost" }] }).valid === false, "unsupported evidenceStatus rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: "x", options: { runtimeActive: true } }).valid === false, "runtimeActive true rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: "x", options: { scaffoldOnly: false } }).valid === false, "scaffoldOnly false rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: "x", options: { allowLegalConclusion: true } }).valid === false, "allowLegalConclusion true rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: "x", options: { allowLiveRetrieval: true } }).valid === false, "allowLiveRetrieval true rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: "x", options: { allowRealTaxpayerData: true } }).valid === false, "allowRealTaxpayerData true rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: "x", options: { generateFilingReadyDocument: true } }).valid === false, "generateFilingReadyDocument true rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: "x", options: { automaticSubmission: true } }).valid === false, "automaticSubmission true rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: "generate a filing-ready protest for this matrix" }).valid === false, "filing-ready request rejected");
});

// 20-21. Source-card claim rejections.
await test("validateBirAuditDefenseMatrixInput rejects source cards claiming verification-complete or final legal conclusion", () => {
  check(
    validateBirAuditDefenseMatrixInput({ userQuery: "x", sourceCards: [{ label: "x", note: "official verification complete" }] }).valid === false,
    "verification-complete source card rejected"
  );
  check(
    validateBirAuditDefenseMatrixInput({ userQuery: "x", sourceCards: [{ label: "x", note: "this is our final legal conclusion" }] }).valid === false,
    "final-legal-conclusion source card rejected"
  );
});

// 22-24. Finding-level prohibited-claim rejections.
await test("validateBirAuditDefenseMatrixInput rejects findings claiming guaranteed cancellation or a final void/invalid/cancelled conclusion", () => {
  check(
    validateBirAuditDefenseMatrixInput({ userQuery: "x", findings: [{ issueType: "UNKNOWN_ISSUE", birFinding: "guaranteed cancellation" }] }).valid === false,
    "guaranteed cancellation rejected"
  );
  check(
    validateBirAuditDefenseMatrixInput({ userQuery: "x", findings: [{ issueType: "UNKNOWN_ISSUE", taxpayerPosition: "the assessment is void" }] }).valid === false,
    "void final conclusion rejected"
  );
});

// 25-29. Real reference-corpus data rejections.
await test("validateBirAuditDefenseMatrixInput rejects known real names/numbers/amounts", () => {
  check(validateBirAuditDefenseMatrixInput({ userQuery: `${REAL_TAXPAYER_NAME_FRAGMENTS[0]} audit` }).valid === false, "real taxpayer name rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: `${REAL_ELA_NUMBER_FRAGMENTS[0]} issued` }).valid === false, "real LOA/eLA number rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: `${REAL_AUDIT_CASE_NUMBER_FRAGMENTS[0]} case` }).valid === false, "real audit case number rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: `signed by ${REAL_OFFICER_NAME_FRAGMENTS[0]}` }).valid === false, "real BIR officer name rejected");
  check(validateBirAuditDefenseMatrixInput({ userQuery: `assessed at PHP ${REAL_ASSESSMENT_AMOUNT_FRAGMENTS[0]}` }).valid === false, "real assessment amount rejected");
});

// 30-31. UNKNOWN_ISSUE default placeholder + populated evidence/procedural/substantive/authority plans.
await test("empty findings default to a single UNKNOWN_ISSUE placeholder without fabricating facts", () => {
  const result = createBirAuditDefenseMatrixResult({ userQuery: "x", findings: [] });
  check(result.defenseMatrix.length === 1 && result.defenseMatrix[0].issueType === "UNKNOWN_ISSUE", "single UNKNOWN_ISSUE placeholder created");
  check(result.defenseMatrix[0].birFinding === null && result.defenseMatrix[0].taxpayerPosition === null, "no fabricated facts on placeholder");
});

await test("evidence plan, procedural defense plan, substantive defense plan, and authority needs are populated", () => {
  const result = createBirAuditDefenseMatrixResult(safeInput("VAT_EXEMPT_VS_ZERO_RATED", { loaAuthorityIssue: false }));
  const rv = validateBirAuditDefenseMatrixResult(result);
  check(rv.valid === true, `result must validate: ${JSON.stringify(rv.errors)}`);
  check(isPlainObjectLocal(result.evidencePlan) && Array.isArray(result.evidencePlan.receivingProofNeeded) && result.evidencePlan.receivingProofNeeded.length > 0, "evidencePlan populated");
  check(isPlainObjectLocal(result.proceduralDefensePlan) && result.proceduralDefensePlan.dueProcessCheckNeeded === true, "proceduralDefensePlan populated");
  check(isPlainObjectLocal(result.substantiveDefensePlan) && result.substantiveDefensePlan.vatClassificationReviewNeeded === true, "substantiveDefensePlan populated");
  check(isPlainObjectLocal(result.authorityNeeds) && result.authorityNeeds.authorityStatus === "authority_required", "authorityNeeds populated");
});

// 32-44. Issue-specific matrix rules (one representative test per rule group).
await test("VAT_EXEMPT_VS_ZERO_RATED / PEZA_ZERO_RATING rule creates valid output with required authority/document/warning guidance", () => {
  for (const issueType of ["VAT_EXEMPT_VS_ZERO_RATED", "PEZA_ZERO_RATING"]) {
    const result = createBirAuditDefenseMatrixResult(safeInput(issueType));
    check(validateBirAuditDefenseMatrixResult(result).valid === true, `${issueType} result must validate`);
    const t = textOf(result);
    check(t.includes("vat") && (t.includes("peza") || t.includes("export")), `${issueType} includes VAT/PEZA/export authority needs`);
    check(t.includes("accounting-system tagging alone as conclusive"), `${issueType} warns accounting tagging is not conclusive`);
  }
});

await test("CWT_SUBSTANTIATION rule includes BIR Form 2307/SAWT documentary guidance", () => {
  const result = createBirAuditDefenseMatrixResult(safeInput("CWT_SUBSTANTIATION"));
  check(validateBirAuditDefenseMatrixResult(result).valid === true, "CWT_SUBSTANTIATION result must validate");
  const t = textOf(result);
  check(t.includes("2307") && t.includes("sawt"), "includes BIR Form 2307/SAWT support");
});

await test("WITHHOLDING_TAX_DEDUCTIBILITY / EXPANDED_WITHHOLDING_TAX rule includes withholding/deductibility authority needs", () => {
  for (const issueType of ["WITHHOLDING_TAX_DEDUCTIBILITY", "EXPANDED_WITHHOLDING_TAX"]) {
    const result = createBirAuditDefenseMatrixResult(safeInput(issueType));
    check(validateBirAuditDefenseMatrixResult(result).valid === true, `${issueType} result must validate`);
    const t = textOf(result);
    check(t.includes("withholding") && t.includes("34(k)"), `${issueType} includes withholding/deductibility authority needs`);
  }
});

await test("INPUT_VAT_SUBSTANTIATION rule includes VAT invoice/input VAT support", () => {
  const result = createBirAuditDefenseMatrixResult(safeInput("INPUT_VAT_SUBSTANTIATION"));
  check(validateBirAuditDefenseMatrixResult(result).valid === true, "INPUT_VAT_SUBSTANTIATION result must validate");
  const t = textOf(result);
  check(t.includes("supplier invoices") && t.includes("input vat"), "includes VAT invoice/input VAT support");
});

await test("DIVIDEND_FWT rule includes dividend/FWT documents", () => {
  const result = createBirAuditDefenseMatrixResult(safeInput("DIVIDEND_FWT"));
  check(validateBirAuditDefenseMatrixResult(result).valid === true, "DIVIDEND_FWT result must validate");
  const t = textOf(result);
  check(t.includes("dividend") && t.includes("board resolution"), "includes dividend/FWT documents");
});

await test("LOA_OR_ELA_AUTHORITY / REPLACEMENT_ELA rule includes RMC/RMO authority needs and never concludes invalidity", () => {
  for (const issueType of ["LOA_OR_ELA_AUTHORITY", "REPLACEMENT_ELA"]) {
    const result = createBirAuditDefenseMatrixResult(safeInput(issueType));
    check(validateBirAuditDefenseMatrixResult(result).valid === true, `${issueType} result must validate`);
    const t = textOf(result);
    check((t.includes("rmc") || t.includes("rmo")) && t.includes("ela"), `${issueType} includes RMC/RMO authority needs`);
    check(!t.includes("this ela is invalid") && !t.includes("this replacement ela is invalid"), `${issueType} never concludes invalidity`);
  }
});

await test("CONSOLIDATED_NOTICE rule includes RMO No. 1-2026/6-2026 and requires proper-service/stage/prior-notice/no-regression checks", () => {
  const result = createBirAuditDefenseMatrixResult(safeInput("CONSOLIDATED_NOTICE", { consolidatedNotice: true }));
  check(validateBirAuditDefenseMatrixResult(result).valid === true, "CONSOLIDATED_NOTICE result must validate");
  check(textOf(result).includes("rmo no. 1-2026") && textOf(result).includes("rmo no. 6-2026"), "includes RMO No. 1-2026/6-2026 authority needs");
  check(result.proceduralDefensePlan.consolidatedNoticeCheckNeeded === true, "consolidatedNoticeCheckNeeded true");
  check(result.proceduralDefensePlan.properServiceCheckNeeded === true, "properServiceCheckNeeded true");
  check(result.proceduralDefensePlan.noRegressionRuleCheckNeeded === true, "noRegressionRuleCheckNeeded true");
  check(result.proceduralDefensePlan.priorNoticeConsistencyCheckNeeded === true, "priorNoticeConsistencyCheckNeeded true");
});

await test("DOCUMENT_REQUEST_SCOPE rule includes standardized-checklist/request-limit review and sets documentRequestScopeCheckNeeded", () => {
  const result = createBirAuditDefenseMatrixResult(safeInput("DOCUMENT_REQUEST_SCOPE"));
  check(validateBirAuditDefenseMatrixResult(result).valid === true, "DOCUMENT_REQUEST_SCOPE result must validate");
  check(textOf(result).includes("standardized checklist"), "includes standardized checklist/request-limit guidance");
  check(result.proceduralDefensePlan.documentRequestScopeCheckNeeded === true, "documentRequestScopeCheckNeeded true");
});

await test("PAN_REPLY rule includes 15-day reply period and prior NOD/DOD consistency review", () => {
  const result = createBirAuditDefenseMatrixResult(safeInput("PAN_REPLY"));
  check(validateBirAuditDefenseMatrixResult(result).valid === true, "PAN_REPLY result must validate");
  check(textOf(result).includes("15-day reply period"), "includes 15-day reply period review");
  check(textOf(result).includes("nod/dod consistency"), "includes prior NOD/DOD consistency review");
});

await test("FAN_FLD_PROTEST rule includes 30-day protest, reconsideration/reinvestigation, 60/180-day, and FDDA/CTA watch guidance", () => {
  const result = createBirAuditDefenseMatrixResult(safeInput("FAN_FLD_PROTEST"));
  check(validateBirAuditDefenseMatrixResult(result).valid === true, "FAN_FLD_PROTEST result must validate");
  const t = textOf(result);
  check(t.includes("30-day protest"), "includes 30-day protest period review");
  check(t.includes("reconsideration") && t.includes("reinvestigation"), "includes reconsideration/reinvestigation path");
  check(t.includes("60-day reinvestigation") && t.includes("180-day inaction"), "includes 60/180-day watch");
  check(t.includes("fdda/cta watch"), "includes FDDA/CTA watch");
});

await test("FDDA_APPEAL_WATCH rule includes CTA appeal-watch, proper service, and jurisdictional deadline review", () => {
  const result = createBirAuditDefenseMatrixResult(safeInput("FDDA_APPEAL_WATCH"));
  check(validateBirAuditDefenseMatrixResult(result).valid === true, "FDDA_APPEAL_WATCH result must validate");
  const t = textOf(result);
  check(t.includes("cta appeal-watch"), "includes CTA appeal-watch");
  check(t.includes("proper service"), "includes proper-service review");
  check(t.includes("jurisdictional deadline"), "includes jurisdictional deadline review");
});

await test("TERMINATION_LETTER_SCOPE rule matches closure to LOA/eLA/period/tax-types and never claims blanket clearance", () => {
  const result = createBirAuditDefenseMatrixResult(safeInput("TERMINATION_LETTER_SCOPE"));
  check(validateBirAuditDefenseMatrixResult(result).valid === true, "TERMINATION_LETTER_SCOPE result must validate");
  const t = textOf(result);
  check(t.includes("matching closure to loa/ela"), "matches closure to LOA/eLA/period/tax-types");
  check(!t.includes("blanket clearance") || t.includes("do not treat"), "never affirmatively claims blanket clearance");
});

// 45-53. Result validation rejections.
await test("validateBirAuditDefenseMatrixResult rejects missing sections, unsupported values, empty source cards, and unsafe metadata", () => {
  const base = createBirAuditDefenseMatrixResult(safeInput("VAT_EXEMPT_VS_ZERO_RATED"));
  check(validateBirAuditDefenseMatrixResult(base).valid === true, "sanity: base result is valid");

  const missingSummary = { ...base };
  delete missingSummary.matrixSummary;
  check(validateBirAuditDefenseMatrixResult(missingSummary).valid === false, "rejects missing matrixSummary");

  const missingMatrix = { ...base };
  delete missingMatrix.defenseMatrix;
  check(validateBirAuditDefenseMatrixResult(missingMatrix).valid === false, "rejects missing defenseMatrix");

  const unsupportedRow = { ...base, defenseMatrix: [{ ...base.defenseMatrix[0], issueType: "NOT_A_TYPE" }] };
  check(validateBirAuditDefenseMatrixResult(unsupportedRow).valid === false, "rejects unsupported issueType in defenseMatrix row");

  const unsupportedRisk = { ...base, defenseMatrix: [{ ...base.defenseMatrix[0], riskLevel: "extreme" }] };
  check(validateBirAuditDefenseMatrixResult(unsupportedRisk).valid === false, "rejects unsupported riskLevel in defenseMatrix row");

  const unsupportedEvidence = { ...base, defenseMatrix: [{ ...base.defenseMatrix[0], evidenceStatus: "lost" }] };
  check(validateBirAuditDefenseMatrixResult(unsupportedEvidence).valid === false, "rejects unsupported evidenceStatus in defenseMatrix row");

  const missingEvidencePlan = { ...base };
  delete missingEvidencePlan.evidencePlan;
  check(validateBirAuditDefenseMatrixResult(missingEvidencePlan).valid === false, "rejects missing evidencePlan");

  const missingProceduralPlan = { ...base };
  delete missingProceduralPlan.proceduralDefensePlan;
  check(validateBirAuditDefenseMatrixResult(missingProceduralPlan).valid === false, "rejects missing proceduralDefensePlan");

  const missingSubstantivePlan = { ...base };
  delete missingSubstantivePlan.substantiveDefensePlan;
  check(validateBirAuditDefenseMatrixResult(missingSubstantivePlan).valid === false, "rejects missing substantiveDefensePlan");

  const missingAuthorityNeeds = { ...base };
  delete missingAuthorityNeeds.authorityNeeds;
  check(validateBirAuditDefenseMatrixResult(missingAuthorityNeeds).valid === false, "rejects missing authorityNeeds");

  const emptySourceCards = { ...base, sourceCards: [] };
  check(validateBirAuditDefenseMatrixResult(emptySourceCards).valid === false, "rejects empty sourceCards");

  const runtimeActiveTrue = { ...base, runtimeActive: true };
  check(validateBirAuditDefenseMatrixResult(runtimeActiveTrue).valid === false, "rejects runtimeActive true");

  const legalConclusionTrue = { ...base, metadata: { ...base.metadata, legalConclusionProvided: true } };
  check(validateBirAuditDefenseMatrixResult(legalConclusionTrue).valid === false, "rejects legalConclusionProvided true");

  const filingReadyTrue = { ...base, metadata: { ...base.metadata, filingReadyDocumentGenerated: true } };
  check(validateBirAuditDefenseMatrixResult(filingReadyTrue).valid === false, "rejects filingReadyDocumentGenerated true");

  const automaticSubmissionTrue = { ...base, metadata: { ...base.metadata, automaticSubmission: true } };
  check(validateBirAuditDefenseMatrixResult(automaticSubmissionTrue).valid === false, "rejects automaticSubmission true");

  const finalOutcomeGuaranteedTrue = { ...base, metadata: { ...base.metadata, finalOutcomeGuaranteed: true } };
  check(validateBirAuditDefenseMatrixResult(finalOutcomeGuaranteedTrue).valid === false, "rejects finalOutcomeGuaranteed true");

  const withProhibitedPhrase = { ...base, humanReviewNotice: `${base.humanReviewNotice} ${["guaranteed", "cancellation"].join(" ")}` };
  check(validateBirAuditDefenseMatrixResult(withProhibitedPhrase).valid === false, "rejects prohibited phrases");
});

// 54. No filing-ready document / final legal conclusion across all issue types.
await test("no filing-ready document or final legal conclusion is generated for any supported issue type", () => {
  for (const issueType of SUPPORTED_DEFENSE_MATRIX_ISSUE_TYPES) {
    const result = createBirAuditDefenseMatrixResult(safeInput(issueType));
    check(result.metadata.filingReadyDocumentGenerated === false, `filingReadyDocumentGenerated false for ${issueType}`);
    check(result.metadata.legalConclusionProvided === false, `legalConclusionProvided false for ${issueType}`);
    check(result.metadata.automaticSubmission === false, `automaticSubmission false for ${issueType}`);
  }
});

// 55. Source cards never claim completed authority verification.
await test("source cards never claim completed authority verification and are never empty across all supported issue types", () => {
  const verificationClaimPattern = /verification (?:is |has been )?complete|officially verified|final authority verification/i;
  for (const issueType of SUPPORTED_DEFENSE_MATRIX_ISSUE_TYPES) {
    const result = createBirAuditDefenseMatrixResult(safeInput(issueType));
    check(result.sourceCards.length > 0, `sourceCards nonempty for ${issueType}`);
    for (const card of result.sourceCards) {
      check(!verificationClaimPattern.test(`${card.label} ${card.note}`), `source card must not claim verification complete for ${issueType}: ${card.label}`);
    }
  }
});

// 56-58. Fixture sample data privacy checks.
await test("fixture sample inputs/outputs use only synthetic taxpayer names and no known real reference-corpus data", () => {
  const inputsText = JSON.stringify(fx.sampleInputs);
  const outputsText = JSON.stringify(fx.sampleOutputs);
  check(/SAMPLE TAXPAYER INC\.|DEMO LOGISTICS CORP\.|SYNTHETIC HOLDINGS INC\.|MODEL VAT TAXPAYER CORP\./.test(inputsText), "sample inputs use recognized synthetic identifiers");
  for (const fragment of [...REAL_TAXPAYER_NAME_FRAGMENTS, ...REAL_OFFICER_NAME_FRAGMENTS]) {
    check(!inputsText.toUpperCase().includes(fragment), `sample inputs must not include real name fragment: ${fragment}`);
    check(!outputsText.toUpperCase().includes(fragment), `sample outputs must not include real name fragment: ${fragment}`);
  }
  for (const fragment of [...REAL_ELA_NUMBER_FRAGMENTS, ...REAL_AUDIT_CASE_NUMBER_FRAGMENTS, ...REAL_ASSESSMENT_AMOUNT_FRAGMENTS]) {
    check(!inputsText.includes(fragment), `sample inputs must not include real reference fragment: ${fragment}`);
    check(!outputsText.includes(fragment), `sample outputs must not include real reference fragment: ${fragment}`);
  }
});

// 59-61. Static scans of module, fixture, and report for forbidden usage.
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

// 62-68. Git diff scope.
await test("git diff confirms only this patch's allowed files changed, with no runtime/package/env/DB/frontend/MCP changes", () => {
  const allowedChanged = new Set([
    "workflow/bir-audit-defense-matrix.js",
    "evaluation/fixtures/phase-09o-bir-audit-defense-matrix-scaffold-1.fixture.json",
    "tests/phase-09o-bir-audit-defense-matrix-scaffold-1.test.mjs",
    "PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1_REPORT.md",
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
    "workflow/bir-notice-loa-triage-intent.js",
    "workflow/pan-fan-fld-protest-workflow.js"
  ]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }
  check(!diffNames.some((name) => /mcp/i.test(name)), "no MCP files/configs added or modified");
});

// 69-70. Report exists and states runtime/ask impact none.
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

console.log(`\nPHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
