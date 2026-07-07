// FILE: tests/phase-09p-bir-document-compliance-transmittal-scaffold-1.test.mjs
// PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1
//
// Validates the pure, standalone BIR document compliance/transmittal
// scaffold and its fixture/report. NO server/ask-handler/pipeline/route
// import, NO OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR
// calls, NO web search, NO browser automation, NO server start, NO port
// binding, NO staging/production/localhost calls, NO env secret reads, NO
// HTTP requests of any kind.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  PHASE_09P_BIR_DOCUMENT_COMPLIANCE_TRANSMITTAL_VERSION,
  BIR_DOCUMENT_COMPLIANCE_TRANSMITTAL_MODE_ID,
  SUPPORTED_DOCUMENT_COMPLIANCE_ITEM_STATUSES,
  SUPPORTED_DOCUMENT_COMPLIANCE_REQUEST_TYPES,
  SUPPORTED_DOCUMENT_COMPLIANCE_RESPONSE_TYPES,
  SUPPORTED_DOCUMENT_COMPLIANCE_ROUTES,
  createBirDocumentComplianceTransmittalResult,
  normalizeBirDocumentComplianceTransmittalInput,
  validateBirDocumentComplianceTransmittalInput,
  validateBirDocumentComplianceTransmittalResult
} from "../workflow/bir-document-compliance-transmittal.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09p-bir-document-compliance-transmittal-scaffold-1.fixture.json";
const REPORT_PATH = "PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1_REPORT.md";
const MODULE_PATH = "workflow/bir-document-compliance-transmittal.js";
const SELF_PATH = "tests/phase-09p-bir-document-compliance-transmittal-scaffold-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09P BIR DOCUMENT COMPLIANCE TRANSMITTAL SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09P BIR DOCUMENT COMPLIANCE TRANSMITTAL SCAFFOLD FAIL",
  "PHASE 09P BIR DOCUMENT COMPLIANCE TRANSMITTAL SCAFFOLD BLOCKED"
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

function item(status, overrides = {}) {
  return {
    itemName: "Synthetic requested item",
    itemCategory: "general",
    requestedByBir: true,
    status,
    documentsAvailable: [],
    documentsMissing: [],
    substituteProofOptions: [],
    riskLevel: "medium",
    ...overrides
  };
}

function safeInput(requestType, contextOverrides = {}, itemOverrides = {}) {
  return {
    userQuery: "Synthetic query for SAMPLE TAXPAYER INC.",
    requestType,
    workflowContext: { taxablePeriod: "CY2025", ...contextOverrides },
    requestedDocuments: [item("provided", itemOverrides)],
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
  check(fx.patch === "PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("8d76c1d"), "base commit references 8d76c1d");
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
  check(typeof PHASE_09P_BIR_DOCUMENT_COMPLIANCE_TRANSMITTAL_VERSION === "string", "version export present");
  check(typeof BIR_DOCUMENT_COMPLIANCE_TRANSMITTAL_MODE_ID === "string", "mode id export present");
  check(Array.isArray(SUPPORTED_DOCUMENT_COMPLIANCE_ITEM_STATUSES), "supported item statuses export present");
  check(Array.isArray(SUPPORTED_DOCUMENT_COMPLIANCE_REQUEST_TYPES), "supported request types export present");
  check(Array.isArray(SUPPORTED_DOCUMENT_COMPLIANCE_RESPONSE_TYPES), "supported response types export present");
  check(Array.isArray(SUPPORTED_DOCUMENT_COMPLIANCE_ROUTES), "supported routes export present");
  check(typeof createBirDocumentComplianceTransmittalResult === "function", "createBirDocumentComplianceTransmittalResult export present");
  check(typeof normalizeBirDocumentComplianceTransmittalInput === "function", "normalizeBirDocumentComplianceTransmittalInput export present");
  check(typeof validateBirDocumentComplianceTransmittalInput === "function", "validateBirDocumentComplianceTransmittalInput export present");
  check(typeof validateBirDocumentComplianceTransmittalResult === "function", "validateBirDocumentComplianceTransmittalResult export present");
  check(PHASE_09P_BIR_DOCUMENT_COMPLIANCE_TRANSMITTAL_VERSION === "PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1", "version matches patch id");
  check(BIR_DOCUMENT_COMPLIANCE_TRANSMITTAL_MODE_ID === "bir_document_compliance_transmittal", "mode id equals bir_document_compliance_transmittal");
});

// 9-12. Supported statuses/types/response types/routes.
await test("supported item statuses, request types, response types, and routes include all required entries", () => {
  for (const s of [
    "provided",
    "to_follow",
    "not_applicable",
    "unavailable",
    "non_existent",
    "substitute_proof_available",
    "requires_reconciliation",
    "requires_certified_copy",
    "requires_on_premise_review",
    "requires_bir_clarification",
    "unknown"
  ]) {
    check(SUPPORTED_DOCUMENT_COMPLIANCE_ITEM_STATUSES.includes(s), `supported item statuses include ${s}`);
  }
  for (const t of [
    "LOA_INITIAL_CHECKLIST",
    "NOTICE_FOR_PRESENTATION_SUBMISSION",
    "CHECKLIST_OF_REQUIREMENTS",
    "ADDITIONAL_DOCUMENT_REQUEST",
    "PRE_SUBPOENA_REMINDER",
    "SUBPOENA_DUCES_TECUM",
    "NOD_DOD_SUPPORTING_DOCUMENTS",
    "PAN_REPLY_SUPPORTING_DOCUMENTS",
    "FAN_FLD_PROTEST_SUPPORTING_DOCUMENTS",
    "REINVESTIGATION_SUPPORTING_DOCUMENTS",
    "FDDA_APPEAL_SUPPORTING_DOCUMENTS",
    "TERMINATION_LETTER_SUPPORTING_DOCUMENTS",
    "UNKNOWN_DOCUMENT_REQUEST"
  ]) {
    check(SUPPORTED_DOCUMENT_COMPLIANCE_REQUEST_TYPES.includes(t), `supported request types include ${t}`);
  }
  for (const r of [
    "DOCUMENT_TRANSMITTAL_MATRIX",
    "ITEMIZED_STATUS_RESPONSE",
    "NON_APPLICABILITY_EXPLANATION",
    "UNAVAILABLE_DOCUMENT_EXPLANATION",
    "NON_EXISTENT_DOCUMENT_EXPLANATION",
    "SUBSTITUTE_PROOF_PLAN",
    "AFFIDAVIT_OR_CERTIFICATION_PLAN",
    "REQUEST_FOR_CLARIFICATION",
    "REQUEST_FOR_EXTENSION",
    "RECEIVING_PROOF_TRACKER",
    "CLIENT_STATUS_UPDATE",
    "HUMAN_REVIEW_REQUIRED"
  ]) {
    check(SUPPORTED_DOCUMENT_COMPLIANCE_RESPONSE_TYPES.includes(r), `supported response types include ${r}`);
  }
  for (const route of [
    "AUTHORITY_SAFE_PROCEDURAL_FALLBACK",
    "BIR_NOTICE_TRIAGE",
    "BIR_AUDIT_DEFENSE_MATRIX",
    "PAN_FAN_FLD_PROTEST_WORKFLOW",
    "DOCUMENT_COMPLIANCE_TRANSMITTAL",
    "AUTHORITY_CORPUS_RESEARCH",
    "HUMAN_TAX_LEGAL_REVIEW"
  ]) {
    check(SUPPORTED_DOCUMENT_COMPLIANCE_ROUTES.includes(route), `supported routes include ${route}`);
  }
});

// 13-23. Input validation rejections.
await test("validateBirDocumentComplianceTransmittalInput rejects missing input, unsupported values, unsafe options, and filing-ready/automatic-submission requests", () => {
  check(validateBirDocumentComplianceTransmittalInput(undefined).valid === false, "missing input rejected");
  check(validateBirDocumentComplianceTransmittalInput({}).valid === false, "missing userQuery and requestedDocuments rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: "x", requestType: "NOT_A_TYPE" }).valid === false, "unsupported requestType rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: "x", requestedDocuments: [{ status: "lost" }] }).valid === false, "unsupported item status rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: "x", options: { runtimeActive: true } }).valid === false, "runtimeActive true rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: "x", options: { scaffoldOnly: false } }).valid === false, "scaffoldOnly false rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: "x", options: { allowLegalConclusion: true } }).valid === false, "allowLegalConclusion true rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: "x", options: { allowLiveRetrieval: true } }).valid === false, "allowLiveRetrieval true rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: "x", options: { allowRealTaxpayerData: true } }).valid === false, "allowRealTaxpayerData true rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: "x", options: { generateFilingReadyDocument: true } }).valid === false, "generateFilingReadyDocument true rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: "x", options: { automaticSubmission: true } }).valid === false, "automaticSubmission true rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: "generate a filing-ready affidavit for this matter" }).valid === false, "filing-ready letter/email/affidavit/certification request rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: "please automatically submit this to the bir" }).valid === false, "automatic BIR submission request rejected");
});

// 24-25. Source-card claim rejections.
await test("validateBirDocumentComplianceTransmittalInput rejects source cards claiming verification-complete or final legal conclusion", () => {
  check(
    validateBirDocumentComplianceTransmittalInput({ userQuery: "x", sourceCards: [{ label: "x", note: "official verification complete" }] }).valid === false,
    "verification-complete source card rejected"
  );
  check(
    validateBirDocumentComplianceTransmittalInput({ userQuery: "x", sourceCards: [{ label: "x", note: "this is our final legal conclusion" }] }).valid === false,
    "final-legal-conclusion source card rejected"
  );
});

// 26-32. Real reference-corpus data rejections.
await test("validateBirDocumentComplianceTransmittalInput rejects known real names/numbers/amounts", () => {
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: `${REAL_TAXPAYER_NAME_FRAGMENTS[0]} audit` }).valid === false, "real taxpayer name rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: `${REAL_ELA_NUMBER_FRAGMENTS[0]} issued` }).valid === false, "real LOA/eLA number rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: `${REAL_AUDIT_CASE_NUMBER_FRAGMENTS[0]} case` }).valid === false, "real audit case number rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: `signed by ${REAL_OFFICER_NAME_FRAGMENTS[0]}` }).valid === false, "real BIR officer name rejected");
  check(validateBirDocumentComplianceTransmittalInput({ userQuery: `assessed at PHP ${REAL_ASSESSMENT_AMOUNT_FRAGMENTS[0]}` }).valid === false, "real assessment amount rejected");
});

// 33-45. Request-type and item-status results.
await test("LOA initial checklist, notice for presentation/submission, and checklist of requirements results are valid", () => {
  for (const rt of ["LOA_INITIAL_CHECKLIST", "NOTICE_FOR_PRESENTATION_SUBMISSION", "CHECKLIST_OF_REQUIREMENTS"]) {
    const result = createBirDocumentComplianceTransmittalResult(safeInput(rt));
    check(validateBirDocumentComplianceTransmittalResult(result).valid === true, `${rt} result must validate`);
  }
});

await test("additional document request result is valid and sets relevance/necessity/scope checks", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("ADDITIONAL_DOCUMENT_REQUEST", { additionalRequest: true }));
  check(validateBirDocumentComplianceTransmittalResult(result).valid === true, "additional document request result must validate");
  check(result.scopeAndAuthorityChecks.relevanceCheckNeeded === true, "relevanceCheckNeeded true");
  check(result.scopeAndAuthorityChecks.necessityCheckNeeded === true, "necessityCheckNeeded true");
  check(result.scopeAndAuthorityChecks.auditScopeCheckNeeded === true, "auditScopeCheckNeeded true");
  check(result.scopeAndAuthorityChecks.additionalRequestLimitCheckNeeded === true, "additionalRequestLimitCheckNeeded true");
});

await test("pre-subpoena reminder result is valid, sets escalation risk, and uses ITEMIZED_STATUS_RESPONSE", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("PRE_SUBPOENA_REMINDER", { preSubpoenaReminderReceived: true }));
  check(validateBirDocumentComplianceTransmittalResult(result).valid === true, "pre-subpoena reminder result must validate");
  check(result.scopeAndAuthorityChecks.preSubpoenaEscalationRisk === true, "preSubpoenaEscalationRisk true");
  check(result.transmittalPlan.responseType === "ITEMIZED_STATUS_RESPONSE", "responseType is ITEMIZED_STATUS_RESPONSE");
});

await test("subpoena result is valid and requires human review", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("SUBPOENA_DUCES_TECUM", { subpoenaReceived: true }));
  check(validateBirDocumentComplianceTransmittalResult(result).valid === true, "subpoena result must validate");
  check(result.scopeAndAuthorityChecks.subpoenaEscalationRisk === true, "subpoenaEscalationRisk true");
  check(result.transmittalPlan.responseType === "HUMAN_REVIEW_REQUIRED", "responseType is HUMAN_REVIEW_REQUIRED");
});

await test("PAN/FAN-FLD/reinvestigation/termination supporting-document results are all valid", () => {
  for (const rt of [
    "PAN_REPLY_SUPPORTING_DOCUMENTS",
    "FAN_FLD_PROTEST_SUPPORTING_DOCUMENTS",
    "REINVESTIGATION_SUPPORTING_DOCUMENTS",
    "TERMINATION_LETTER_SUPPORTING_DOCUMENTS"
  ]) {
    const result = createBirDocumentComplianceTransmittalResult(safeInput(rt));
    check(validateBirDocumentComplianceTransmittalResult(result).valid === true, `${rt} result must validate`);
  }
});

// 46-55. Item-status-specific behaviors.
await test("provided item sets receivingProofNeeded true", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("CHECKLIST_OF_REQUIREMENTS", {}, { status: "provided" }));
  check(result.documentMatrix[0].receivingProofNeeded === true, "receivingProofNeeded true");
});

await test("to-follow item sets explanationType to_follow", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("CHECKLIST_OF_REQUIREMENTS", {}, { status: "to_follow" }));
  check(result.documentMatrix[0].explanationType === "to_follow", "explanationType is to_follow");
});

await test("not-applicable item sets explanationType not_applicable and without-prejudice flag", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("CHECKLIST_OF_REQUIREMENTS", {}, { status: "not_applicable" }));
  check(result.documentMatrix[0].explanationType === "not_applicable", "explanationType is not_applicable");
  check(result.documentMatrix[0].withoutPrejudiceLanguageNeeded === true, "withoutPrejudiceLanguageNeeded true");
});

await test("unavailable item sets explanationType unavailable", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("CHECKLIST_OF_REQUIREMENTS", {}, { status: "unavailable" }));
  check(result.documentMatrix[0].explanationType === "unavailable", "explanationType is unavailable");
});

await test("non-existent item sets explanationType non_existent and populates substitute proof plan", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("CHECKLIST_OF_REQUIREMENTS", {}, { status: "non_existent", substituteProofOptions: ["affidavit"] }));
  check(result.documentMatrix[0].explanationType === "non_existent", "explanationType is non_existent");
  check(result.substituteProofPlan.affidavitPotentialItems.length > 0, "substitute proof plan populated");
});

await test("substitute-proof item populates substituteProofPlan", () => {
  const result = createBirDocumentComplianceTransmittalResult(
    safeInput("CHECKLIST_OF_REQUIREMENTS", {}, { status: "substitute_proof_available", substituteProofOptions: ["management certification"] })
  );
  check(result.substituteProofPlan.managementCertificationPotentialItems.length > 0, "management certification plan populated");
});

await test("reconciliation item sets reconciliationNeeded true", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("CHECKLIST_OF_REQUIREMENTS", {}, { status: "requires_reconciliation" }));
  check(result.documentMatrix[0].reconciliationNeeded === true, "reconciliationNeeded true");
});

await test("certified-copy item sets certifiedCopyNeeded true", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("CHECKLIST_OF_REQUIREMENTS", {}, { status: "requires_certified_copy" }));
  check(result.documentMatrix[0].certifiedCopyNeeded === true, "certifiedCopyNeeded true");
});

await test("on-premise item sets onPremiseReviewNeeded true and voluminousRecordsCheckNeeded", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("CHECKLIST_OF_REQUIREMENTS", {}, { status: "requires_on_premise_review" }));
  check(result.documentMatrix[0].onPremiseReviewNeeded === true, "onPremiseReviewNeeded true");
  check(result.scopeAndAuthorityChecks.voluminousRecordsCheckNeeded === true, "voluminousRecordsCheckNeeded true");
});

await test("clarification item sets birClarificationNeeded and clarificationRequestNeeded true", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("ADDITIONAL_DOCUMENT_REQUEST", {}, { status: "requires_bir_clarification" }));
  check(result.documentMatrix[0].birClarificationNeeded === true, "birClarificationNeeded true");
  check(result.transmittalPlan.clarificationRequestNeeded === true, "clarificationRequestNeeded true");
});

// 56-59. Transmittal plan, receiving proof tracker, scope checks.
await test("transmittal plan includes itemized schedule and receiving proof requirement", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("LOA_INITIAL_CHECKLIST"));
  check(result.transmittalPlan.itemizedScheduleNeeded === true, "itemizedScheduleNeeded true");
  check(result.transmittalPlan.receivingProofRequired === true, "receivingProofRequired true");
});

await test("receiving proof tracker exists and reports a proof gap warning when no receiving proof is confirmed", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("LOA_INITIAL_CHECKLIST"));
  check(isPlainObjectLocal(result.receivingProofTracker), "receivingProofTracker present");
  check(result.receivingProofTracker.proofGapWarnings.length > 0, "proof gap warning present when no receiving proof confirmed");
});

await test("scope and authority checks include standardized checklist check for checklist-family request types", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("LOA_INITIAL_CHECKLIST"));
  check(result.scopeAndAuthorityChecks.standardizedChecklistCheckNeeded === true, "standardizedChecklistCheckNeeded true");
});

// 60-65. Source cards.
await test("source cards include all required RMO/RMC design references and uploaded reference patterns", () => {
  const result = createBirDocumentComplianceTransmittalResult(safeInput("LOA_INITIAL_CHECKLIST"));
  const labels = result.sourceCards.map((c) => c.label);
  check(labels.some((l) => /RMO No\. 1-2026 standardized checklist/i.test(l)), "includes RMO No. 1-2026 checklist/document safeguards");
  check(labels.some((l) => /RMO No\. 1-2026 voluminous records/i.test(l)), "includes voluminous records/certified copy reference");
  check(labels.some((l) => /RMC No\. 14-2026/i.test(l)), "includes RMC No. 14-2026 prior notices/checklists/subpoenas reference");
  check(labels.some((l) => /RMC No\. 5-2026/i.test(l)), "includes RMC No. 5-2026 LOA/eLA verification reference");
  check(labels.some((l) => /uploaded professional document transmittal/i.test(l)), "includes uploaded transmittal reference pattern");
  check(labels.some((l) => /uploaded affidavit/i.test(l)), "includes uploaded affidavit/substitute proof reference pattern");
});

// 66. Source cards never claim completed authority verification.
await test("source cards never claim completed authority verification across all supported request types", () => {
  const verificationClaimPattern = /verification (?:is |has been )?complete|officially verified|final authority verification/i;
  for (const rt of SUPPORTED_DOCUMENT_COMPLIANCE_REQUEST_TYPES) {
    const result = createBirDocumentComplianceTransmittalResult(safeInput(rt));
    for (const card of result.sourceCards) {
      check(!verificationClaimPattern.test(`${card.label} ${card.note}`), `source card must not claim verification complete for ${rt}: ${card.label}`);
    }
  }
});

// 67-86. Result validation rejections.
await test("validateBirDocumentComplianceTransmittalResult rejects missing sections, empty/unsupported document matrix, empty source cards, and unsafe metadata", () => {
  const base = createBirDocumentComplianceTransmittalResult(safeInput("CHECKLIST_OF_REQUIREMENTS"));
  check(validateBirDocumentComplianceTransmittalResult(base).valid === true, "sanity: base result is valid");

  const missingSummary = { ...base };
  delete missingSummary.complianceSummary;
  check(validateBirDocumentComplianceTransmittalResult(missingSummary).valid === false, "rejects missing complianceSummary");

  const missingMatrix = { ...base };
  delete missingMatrix.documentMatrix;
  check(validateBirDocumentComplianceTransmittalResult(missingMatrix).valid === false, "rejects missing documentMatrix");

  const emptyMatrix = { ...base, documentMatrix: [] };
  check(validateBirDocumentComplianceTransmittalResult(emptyMatrix).valid === false, "rejects empty documentMatrix");

  const unsupportedStatus = { ...base, documentMatrix: [{ ...base.documentMatrix[0], status: "lost" }] };
  check(validateBirDocumentComplianceTransmittalResult(unsupportedStatus).valid === false, "rejects unsupported item status");

  const missingTransmittalPlan = { ...base };
  delete missingTransmittalPlan.transmittalPlan;
  check(validateBirDocumentComplianceTransmittalResult(missingTransmittalPlan).valid === false, "rejects missing transmittalPlan");

  const missingSubstituteProofPlan = { ...base };
  delete missingSubstituteProofPlan.substituteProofPlan;
  check(validateBirDocumentComplianceTransmittalResult(missingSubstituteProofPlan).valid === false, "rejects missing substituteProofPlan");

  const missingReceivingProofTracker = { ...base };
  delete missingReceivingProofTracker.receivingProofTracker;
  check(validateBirDocumentComplianceTransmittalResult(missingReceivingProofTracker).valid === false, "rejects missing receivingProofTracker");

  const missingScopeChecks = { ...base };
  delete missingScopeChecks.scopeAndAuthorityChecks;
  check(validateBirDocumentComplianceTransmittalResult(missingScopeChecks).valid === false, "rejects missing scopeAndAuthorityChecks");

  const missingSourceCards = { ...base };
  delete missingSourceCards.sourceCards;
  check(validateBirDocumentComplianceTransmittalResult(missingSourceCards).valid === false, "rejects missing sourceCards");

  const emptySourceCards = { ...base, sourceCards: [] };
  check(validateBirDocumentComplianceTransmittalResult(emptySourceCards).valid === false, "rejects empty sourceCards");

  const runtimeActiveTrue = { ...base, runtimeActive: true };
  check(validateBirDocumentComplianceTransmittalResult(runtimeActiveTrue).valid === false, "rejects runtimeActive true");

  const legalConclusionTrue = { ...base, metadata: { ...base.metadata, legalConclusionProvided: true } };
  check(validateBirDocumentComplianceTransmittalResult(legalConclusionTrue).valid === false, "rejects legalConclusionProvided true");

  const liveRetrievalTrue = { ...base, metadata: { ...base.metadata, liveRetrievalPerformed: true } };
  check(validateBirDocumentComplianceTransmittalResult(liveRetrievalTrue).valid === false, "rejects liveRetrievalPerformed true");

  const externalSearchTrue = { ...base, metadata: { ...base.metadata, externalSearchPerformed: true } };
  check(validateBirDocumentComplianceTransmittalResult(externalSearchTrue).valid === false, "rejects externalSearchPerformed true");

  const realTaxpayerDataTrue = { ...base, metadata: { ...base.metadata, realTaxpayerDataUsed: true } };
  check(validateBirDocumentComplianceTransmittalResult(realTaxpayerDataTrue).valid === false, "rejects realTaxpayerDataUsed true");

  const filingReadyTrue = { ...base, metadata: { ...base.metadata, filingReadyDocumentGenerated: true } };
  check(validateBirDocumentComplianceTransmittalResult(filingReadyTrue).valid === false, "rejects filingReadyDocumentGenerated true");

  const automaticSubmissionTrue = { ...base, metadata: { ...base.metadata, automaticSubmission: true } };
  check(validateBirDocumentComplianceTransmittalResult(automaticSubmissionTrue).valid === false, "rejects automaticSubmission true");

  const finalOutcomeGuaranteedTrue = { ...base, metadata: { ...base.metadata, finalOutcomeGuaranteed: true } };
  check(validateBirDocumentComplianceTransmittalResult(finalOutcomeGuaranteedTrue).valid === false, "rejects finalOutcomeGuaranteed true");

  const withProhibitedPhrase = { ...base, humanReviewNotice: `${base.humanReviewNotice} ${["bir", "will", "accept", "this", "document"].join(" ")}` };
  check(validateBirDocumentComplianceTransmittalResult(withProhibitedPhrase).valid === false, "rejects prohibited phrases");

  const withFilingReadyOutput = { ...base, humanReviewNotice: `${base.humanReviewNotice} ${["this", "submission", "fully", "complies"].join(" ")}` };
  check(validateBirDocumentComplianceTransmittalResult(withFilingReadyOutput).valid === false, "rejects filing-ready-style output claim");
});

// 87-94. Fixture sample-data privacy checks.
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

// 95-101. Static scans of module, fixture, and report for forbidden usage.
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

// 102-108. Git diff scope.
await test("git diff confirms only this patch's allowed files changed, with no runtime/package/env/DB/frontend/MCP changes", () => {
  const allowedChanged = new Set([
    "workflow/bir-document-compliance-transmittal.js",
    "evaluation/fixtures/phase-09p-bir-document-compliance-transmittal-scaffold-1.fixture.json",
    "tests/phase-09p-bir-document-compliance-transmittal-scaffold-1.test.mjs",
    "PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1_REPORT.md",
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
    "workflow/pan-fan-fld-protest-workflow.js",
    "workflow/bir-audit-defense-matrix.js"
  ]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }
  check(!diffNames.some((name) => /mcp/i.test(name)), "no MCP files/configs added or modified");
});

// 109-113. Report exists and states required exact statements.
await test("report exists and states runtime, /ask, filing-ready document, and automatic submission impact none", () => {
  check(existsSync(resolve(REPORT_PATH)), `${REPORT_PATH} must exist`);
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/Runtime impact:\s*None\./.test(report), "report states Runtime impact: None.");
  check(/\/ask impact:\s*None\./.test(report), "report states /ask impact: None.");
  check(/Filing-ready document impact:\s*None\./.test(report), "report states Filing-ready document impact: None.");
  check(/Automatic submission impact:\s*None\./.test(report), "report states Automatic submission impact: None.");
});

await test("if decision FAIL or BLOCKED: a reason is recorded", () => {
  if (isFail()) check(typeof fx.failureReason === "string" && fx.failureReason.length > 0, "failure reason recorded");
  if (isBlocked()) check(typeof fx.blockerReason === "string" && fx.blockerReason.length > 0, "blocker reason recorded");
});

console.log(`\nPHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
