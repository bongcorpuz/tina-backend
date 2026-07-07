// FILE: tests/phase-09l-authority-safe-procedural-fallback-scaffold-1.test.mjs
// PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1
//
// Validates the pure, standalone authority-safe procedural fallback scaffold
// and its fixture/report. NO server/ask-handler/pipeline/route import, NO
// OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP calls, NO web
// search, NO browser automation, NO server start, NO port binding, NO
// staging/production/localhost calls, NO env secret reads, NO HTTP requests
// of any kind.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  PHASE_09L_AUTHORITY_SAFE_PROCEDURAL_FALLBACK_VERSION,
  AUTHORITY_SAFE_PROCEDURAL_FALLBACK_MODE_ID,
  SUPPORTED_PROCEDURAL_FALLBACK_TYPES,
  createAuthoritySafeProceduralFallbackResult,
  normalizeAuthoritySafeProceduralFallbackInput,
  validateAuthoritySafeProceduralFallbackInput,
  validateAuthoritySafeProceduralFallbackResult,
  detectProhibitedProceduralFallbackClaims
} from "../workflow/authority-safe-procedural-fallback.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09l-authority-safe-procedural-fallback-scaffold-1.fixture.json";
const REPORT_PATH = "PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1_REPORT.md";
const MODULE_PATH = "workflow/authority-safe-procedural-fallback.js";
const SELF_PATH = "tests/phase-09l-authority-safe-procedural-fallback-scaffold-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09L AUTHORITY SAFE PROCEDURAL FALLBACK SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09L AUTHORITY SAFE PROCEDURAL FALLBACK SCAFFOLD FAIL",
  "PHASE 09L AUTHORITY SAFE PROCEDURAL FALLBACK SCAFFOLD BLOCKED"
];

// Known-real reference-corpus labels supplied only as private context for
// this task; must never appear in fixtures/tests/reports.
const REAL_CORPUS_LABEL_FRAGMENTS = Object.freeze(["TGLI", "Social Homes", "eCARS"]);

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

function safeInput(fallbackType, overrides = {}) {
  return {
    fallbackType,
    userQuery: "SAMPLE TAXPAYER INC. test query.",
    noticeFacts: { noticeType: "", taxablePeriodKnown: true, receiptDateKnown: true, authorityDocumentKnown: true },
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

  const forbiddenPackagePattern = /\b(?:import\s+.*from\s+|require\()\s*["'](openai|@supabase\/[^"']*|firecrawl|crawlee|@modelcontextprotocol\/[^"']*|n8n)["']/i;
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
  check(fx.patch === "PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("0f35b61"), "base commit references 0f35b61");
});

// 5. nonRuntimePatch is true.
await test("nonRuntimePatch declares every safety field true", () => {
  const n = fx.nonRuntimePatch;
  check(isPlainObjectLocal(n), "nonRuntimePatch present");
  for (const key of Object.keys(n)) {
    check(n[key] === true, `nonRuntimePatch.${key} must be true`);
  }
});
function isPlainObjectLocal(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// 6-8. Module exports, version constant, mode id.
await test("module exports expected constants/functions; version and mode id are correct", () => {
  check(typeof PHASE_09L_AUTHORITY_SAFE_PROCEDURAL_FALLBACK_VERSION === "string", "version export present");
  check(typeof AUTHORITY_SAFE_PROCEDURAL_FALLBACK_MODE_ID === "string", "mode id export present");
  check(Array.isArray(SUPPORTED_PROCEDURAL_FALLBACK_TYPES), "supported types export present");
  check(typeof createAuthoritySafeProceduralFallbackResult === "function", "createAuthoritySafeProceduralFallbackResult export present");
  check(typeof normalizeAuthoritySafeProceduralFallbackInput === "function", "normalizeAuthoritySafeProceduralFallbackInput export present");
  check(typeof validateAuthoritySafeProceduralFallbackInput === "function", "validateAuthoritySafeProceduralFallbackInput export present");
  check(typeof validateAuthoritySafeProceduralFallbackResult === "function", "validateAuthoritySafeProceduralFallbackResult export present");
  check(PHASE_09L_AUTHORITY_SAFE_PROCEDURAL_FALLBACK_VERSION === "PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1", "version matches patch id");
  check(AUTHORITY_SAFE_PROCEDURAL_FALLBACK_MODE_ID === "authority_safe_procedural_fallback", "mode id equals authority_safe_procedural_fallback");
});

// 9-16. Supported fallback types include all eight required types.
await test("supported fallback types include all eight required types", () => {
  for (const t of [
    "LOA_RECEIVED_WHAT_TO_DO",
    "BIR_DOCUMENT_CHECKLIST_RECEIVED",
    "BIR_DOCUMENTS_UNAVAILABLE_OR_NOT_APPLICABLE",
    "PRE_SUBPOENA_REMINDER_RECEIVED",
    "PAN_RECEIVED_WHAT_TO_DO",
    "FAN_FLD_RECEIVED_WHAT_TO_DO",
    "ACTION_ON_PROTEST_RECEIVED",
    "TERMINATION_LETTER_RECEIVED"
  ]) {
    check(SUPPORTED_PROCEDURAL_FALLBACK_TYPES.includes(t), `supported types include ${t}`);
  }
});

// 17-25. Input validation rejections.
await test("validateAuthoritySafeProceduralFallbackInput rejects missing input, missing/unsupported fallbackType, missing/empty userQuery, and unsafe option values", () => {
  check(validateAuthoritySafeProceduralFallbackInput(undefined).valid === false, "missing input rejected");
  check(validateAuthoritySafeProceduralFallbackInput({}).valid === false, "missing fallbackType rejected");
  check(validateAuthoritySafeProceduralFallbackInput({ fallbackType: "NOT_A_TYPE", userQuery: "x" }).valid === false, "unsupported fallbackType rejected");
  check(validateAuthoritySafeProceduralFallbackInput({ fallbackType: "LOA_RECEIVED_WHAT_TO_DO" }).valid === false, "missing userQuery rejected");
  check(validateAuthoritySafeProceduralFallbackInput({ fallbackType: "LOA_RECEIVED_WHAT_TO_DO", userQuery: "   " }).valid === false, "empty userQuery rejected");
  check(
    validateAuthoritySafeProceduralFallbackInput({ fallbackType: "LOA_RECEIVED_WHAT_TO_DO", userQuery: "x", options: { runtimeActive: true } }).valid === false,
    "runtimeActive true rejected"
  );
  check(
    validateAuthoritySafeProceduralFallbackInput({ fallbackType: "LOA_RECEIVED_WHAT_TO_DO", userQuery: "x", options: { scaffoldOnly: false } }).valid === false,
    "scaffoldOnly false rejected"
  );
  check(
    validateAuthoritySafeProceduralFallbackInput({ fallbackType: "LOA_RECEIVED_WHAT_TO_DO", userQuery: "x", options: { allowLegalConclusion: true } }).valid === false,
    "allowLegalConclusion true rejected"
  );
  check(
    validateAuthoritySafeProceduralFallbackInput({ fallbackType: "LOA_RECEIVED_WHAT_TO_DO", userQuery: "x", options: { allowLiveRetrieval: true } }).valid === false,
    "allowLiveRetrieval true rejected"
  );
});

// 26-40. LOA fallback.
let loaResult;
await test("LOA fallback creates a valid, runtimeActive-false result with all required sections", () => {
  loaResult = createAuthoritySafeProceduralFallbackResult(safeInput("LOA_RECEIVED_WHAT_TO_DO"));
  const rv = validateAuthoritySafeProceduralFallbackResult(loaResult);
  check(rv.valid === true, `LOA result must validate: ${JSON.stringify(rv.errors)}`);
  check(loaResult.runtimeActive === false, "runtimeActive false");
  check(isPlainObjectLocal(loaResult.authorityStatus), "authorityStatus present");
  check(Array.isArray(loaResult.immediateSafeSteps) && loaResult.immediateSafeSteps.length > 0, "immediateSafeSteps present");
  check(Array.isArray(loaResult.missingFacts), "missingFacts present");
  check(Array.isArray(loaResult.documentsNeeded), "documentsNeeded present");
  check(Array.isArray(loaResult.riskWarnings), "riskWarnings present");
  check(isPlainObjectLocal(loaResult.workflowRecommendation), "workflowRecommendation present");
  check(typeof loaResult.humanReviewNotice === "string" && loaResult.humanReviewNotice.length > 0, "humanReviewNotice present");
  check(Array.isArray(loaResult.sourceCards) && loaResult.sourceCards.length > 0, "sourceCards present");
});

await test("LOA fallback includes authenticity, date-of-receipt, scope, compliance-matrix steps, and no-unnecessary-admissions warning", () => {
  const t = textOf(loaResult);
  check(t.includes("verify loa authenticity"), "authenticity verification step");
  check(t.includes("record date of receipt"), "date-of-receipt step");
  check(t.includes("confirm scope of audit"), "scope-check step");
  check(t.includes("document compliance matrix"), "document compliance matrix step");
  check(t.includes("avoid unnecessary admissions"), "no-unnecessary-admissions warning");
});

// 41-45. Checklist fallback.
let checklistResult;
await test("checklist fallback creates a valid result", () => {
  checklistResult = createAuthoritySafeProceduralFallbackResult(safeInput("BIR_DOCUMENT_CHECKLIST_RECEIVED"));
  const rv = validateAuthoritySafeProceduralFallbackResult(checklistResult);
  check(rv.valid === true, `checklist result must validate: ${JSON.stringify(rv.errors)}`);
});

await test("checklist fallback includes controlled-submission, transmittal, proof-of-receipt, and additional-document limitation guidance", () => {
  const t = textOf(checklistResult);
  check(t.includes("do not blindly submit everything informally"), "controlled submission guidance");
  check(t.includes("written transmittal"), "transmittal guidance");
  check(t.includes("preserve proof of receipt"), "proof-of-receipt guidance");
  check(t.includes("outside scope") || t.includes("within audit scope"), "additional-document limitation guidance");
});

// 46-50. Unavailable/non-applicable document fallback.
let unavailableResult;
await test("unavailable document fallback creates a valid result", () => {
  unavailableResult = createAuthoritySafeProceduralFallbackResult(safeInput("BIR_DOCUMENTS_UNAVAILABLE_OR_NOT_APPLICABLE"));
  const rv = validateAuthoritySafeProceduralFallbackResult(unavailableResult);
  check(rv.valid === true, `unavailable-document result must validate: ${JSON.stringify(rv.errors)}`);
});

await test("unavailable document fallback includes no-fabrication, substitute-proof, affidavit/certification/AFS-note, and without-prejudice guidance", () => {
  const t = textOf(unavailableResult);
  check(t.includes("do not fabricate documents"), "no-fabrication warning");
  check(t.includes("submit substitute proof"), "substitute-proof guidance");
  check(t.includes("affidavit") && t.includes("certification") && t.includes("afs"), "affidavit/certification/AFS note support");
  check(t.includes("without prejudice"), "without-prejudice guidance");
});

// 51-54. Pre-subpoena fallback.
let preSubpoenaResult;
await test("pre-subpoena fallback creates a valid result", () => {
  preSubpoenaResult = createAuthoritySafeProceduralFallbackResult(safeInput("PRE_SUBPOENA_REMINDER_RECEIVED"));
  const rv = validateAuthoritySafeProceduralFallbackResult(preSubpoenaResult);
  check(rv.valid === true, `pre-subpoena result must validate: ${JSON.stringify(rv.errors)}`);
});

await test("pre-subpoena fallback identifies escalation risk and recommends itemized response with proof of prior submission", () => {
  const t = textOf(preSubpoenaResult);
  check(t.includes("escalation warning") || t.includes("subpoena duces tecum"), "escalation risk identified");
  check(t.includes("itemized status response"), "itemized response recommendation");
  check(t.includes("proof of prior submission"), "proof-of-prior-submission recommendation");
});

// 55-58. PAN fallback.
let panResult;
await test("PAN fallback creates a valid result", () => {
  panResult = createAuthoritySafeProceduralFallbackResult(safeInput("PAN_RECEIVED_WHAT_TO_DO"));
  const rv = validateAuthoritySafeProceduralFallbackResult(panResult);
  check(rv.valid === true, `PAN result must validate: ${JSON.stringify(rv.errors)}`);
});

await test("PAN fallback includes 15-day reply period, issue-by-issue defense matrix, and do-not-ignore-PAN warning", () => {
  const t = textOf(panResult);
  check(t.includes("15-day"), "15-day reply period");
  check(t.includes("issue-by-issue defense matrix"), "issue-by-issue defense matrix recommendation");
  check(t.includes("do not ignore the pan"), "do-not-ignore-PAN warning");
});

// 59-62. FAN/FLD fallback.
let fanFldResult;
await test("FAN/FLD fallback creates a valid result", () => {
  fanFldResult = createAuthoritySafeProceduralFallbackResult(safeInput("FAN_FLD_RECEIVED_WHAT_TO_DO"));
  const rv = validateAuthoritySafeProceduralFallbackResult(fanFldResult);
  check(rv.valid === true, `FAN/FLD result must validate: ${JSON.stringify(rv.errors)}`);
});

await test("FAN/FLD fallback includes 30-day protest period, distinguishes reconsideration/reinvestigation, and warns of finality risk", () => {
  const t = textOf(fanFldResult);
  check(t.includes("30-day"), "30-day protest period");
  check(t.includes("reconsideration") && t.includes("reinvestigation"), "distinguishes reconsideration and reinvestigation");
  check(t.includes("final, executory, and demandable"), "finality/executory/demandable risk warning");
});

// 63-65. Action-on-protest fallback.
let actionOnProtestResult;
await test("action-on-protest fallback creates a valid result", () => {
  actionOnProtestResult = createAuthoritySafeProceduralFallbackResult(safeInput("ACTION_ON_PROTEST_RECEIVED"));
  const rv = validateAuthoritySafeProceduralFallbackResult(actionOnProtestResult);
  check(rv.valid === true, `action-on-protest result must validate: ${JSON.stringify(rv.errors)}`);
});

await test("action-on-protest fallback states acceptance does not automatically mean cancellation and never claims the assessment is cancelled", () => {
  const t = textOf(actionOnProtestResult);
  check(t.includes("does not automatically mean the assessment was cancelled"), "states acceptance is not automatic cancellation");
  check(!t.includes("the assessment is cancelled"), "never claims the assessment is cancelled");
  check(!t.includes("the case is won"), "never claims the case is won");
  check(!t.includes("no further action is needed"), "never claims no further action is needed");
});

// 66-69. Termination-letter fallback.
let terminationResult;
await test("termination-letter fallback creates a valid result", () => {
  terminationResult = createAuthoritySafeProceduralFallbackResult(safeInput("TERMINATION_LETTER_RECEIVED"));
  const rv = validateAuthoritySafeProceduralFallbackResult(terminationResult);
  check(rv.valid === true, `termination-letter result must validate: ${JSON.stringify(rv.errors)}`);
});

await test("termination-letter fallback scopes closure to covered LOA/period/tax types, warns without prejudice, and never claims permanent immunity", () => {
  const t = textOf(terminationResult);
  check(t.includes("closed for the covered loa, tax period, and tax types"), "scopes closure to covered LOA/period/tax types");
  check(t.includes("without prejudice to future action"), "without-prejudice warning");
  check(!t.includes("permanent immunity") && !t.includes("full immunity"), "never claims permanent/full immunity");
  check(!t.includes("you are permanently cleared"), "never claims the taxpayer is permanently cleared");
});

// 70-80. Result validation rejections.
await test("validateAuthoritySafeProceduralFallbackResult rejects missing/invalid required fields and metadata violations", () => {
  const base = createAuthoritySafeProceduralFallbackResult(safeInput("LOA_RECEIVED_WHAT_TO_DO"));
  check(validateAuthoritySafeProceduralFallbackResult(base).valid === true, "sanity: base result is valid");

  const missingAuthorityStatus = { ...base };
  delete missingAuthorityStatus.authorityStatus;
  check(validateAuthoritySafeProceduralFallbackResult(missingAuthorityStatus).valid === false, "rejects missing authorityStatus");

  const missingProceduralContext = { ...base };
  delete missingProceduralContext.proceduralContext;
  check(validateAuthoritySafeProceduralFallbackResult(missingProceduralContext).valid === false, "rejects missing proceduralContext");

  const missingHumanReviewNotice = { ...base };
  delete missingHumanReviewNotice.humanReviewNotice;
  check(validateAuthoritySafeProceduralFallbackResult(missingHumanReviewNotice).valid === false, "rejects missing humanReviewNotice");

  const missingSourceCards = { ...base };
  delete missingSourceCards.sourceCards;
  check(validateAuthoritySafeProceduralFallbackResult(missingSourceCards).valid === false, "rejects missing sourceCards");

  const emptySourceCards = { ...base, sourceCards: [] };
  check(validateAuthoritySafeProceduralFallbackResult(emptySourceCards).valid === false, "rejects empty sourceCards");

  const runtimeActiveTrue = { ...base, runtimeActive: true };
  check(validateAuthoritySafeProceduralFallbackResult(runtimeActiveTrue).valid === false, "rejects runtimeActive true");

  const legalConclusionTrue = { ...base, metadata: { ...base.metadata, legalConclusionProvided: true } };
  check(validateAuthoritySafeProceduralFallbackResult(legalConclusionTrue).valid === false, "rejects metadata.legalConclusionProvided true");

  const liveRetrievalTrue = { ...base, metadata: { ...base.metadata, liveRetrievalPerformed: true } };
  check(validateAuthoritySafeProceduralFallbackResult(liveRetrievalTrue).valid === false, "rejects metadata.liveRetrievalPerformed true");

  const externalSearchTrue = { ...base, metadata: { ...base.metadata, externalSearchPerformed: true } };
  check(validateAuthoritySafeProceduralFallbackResult(externalSearchTrue).valid === false, "rejects metadata.externalSearchPerformed true");

  const automaticSubmissionTrue = { ...base, metadata: { ...base.metadata, automaticSubmission: true } };
  check(validateAuthoritySafeProceduralFallbackResult(automaticSubmissionTrue).valid === false, "rejects metadata.automaticSubmission true");

  const finalOutcomeGuaranteedTrue = { ...base, metadata: { ...base.metadata, finalOutcomeGuaranteed: true } };
  check(validateAuthoritySafeProceduralFallbackResult(finalOutcomeGuaranteedTrue).valid === false, "rejects metadata.finalOutcomeGuaranteed true");

  const withProhibitedPhrase = { ...base, humanReviewNotice: `${base.humanReviewNotice} ${["guaranteed", "cancellation"].join(" ")}` };
  const prohibitedCheck = validateAuthoritySafeProceduralFallbackResult(withProhibitedPhrase);
  check(prohibitedCheck.valid === false, "rejects prohibited phrases");
});

// 81. Source cards do not claim final authority verification.
await test("source cards never claim final authority verification is complete", () => {
  const allResults = SUPPORTED_PROCEDURAL_FALLBACK_TYPES.map((t) => createAuthoritySafeProceduralFallbackResult(safeInput(t)));
  const verificationClaimPattern = /verification (?:is |has been )?complete|officially verified|final authority verification/i;
  for (const result of allResults) {
    for (const card of result.sourceCards) {
      check(!verificationClaimPattern.test(`${card.label} ${card.note}`), `source card must not claim verification complete: ${card.label}`);
    }
  }
});

// 82-83. Fixture sample inputs use only synthetic names, no real corpus labels.
await test("fixture sample inputs use only synthetic taxpayer names and no known real reference-corpus labels", () => {
  const inputsText = JSON.stringify(fx.sampleInputs);
  check(/SAMPLE TAXPAYER INC\.|DEMO LOGISTICS CORP\.|SYNTHETIC HOLDINGS INC\.|I received an LOA/.test(inputsText), "sample inputs use recognized synthetic identifiers");
  for (const fragment of REAL_CORPUS_LABEL_FRAGMENTS) {
    check(!inputsText.includes(fragment), `sample inputs must not include real corpus label fragment: ${fragment}`);
  }
});

// 84. No real LOA numbers from uploaded materials.
await test("fixture does not include real (non-placeholder) LOA numbers", () => {
  const raw = JSON.stringify(fx);
  const realLoaNumberPattern = /\beLA\d{11}\b|\bAUDM\d{2}-\d{3}-\d{4}-\d{6}\b/;
  check(!realLoaNumberPattern.test(raw), "no fully-numeric (real-looking) LOA number pattern present");
});

// 85-86. Sample outputs contain no real taxpayer names or BIR officer names.
await test("fixture sample outputs contain no real taxpayer names or BIR officer names", () => {
  const outputsText = JSON.stringify(fx.sampleOutputs);
  for (const fragment of REAL_CORPUS_LABEL_FRAGMENTS) {
    check(!outputsText.includes(fragment), `sample outputs must not include real corpus label fragment: ${fragment}`);
  }
  const officerNamePattern = /\b(?:Mr\.|Ms\.|Atty\.|Engr\.|Dr\.)\s+[A-Z][a-z]+/;
  check(!officerNamePattern.test(outputsText), "sample outputs must not include a named-officer-style pattern");
});

// 87-91. Static scans of module, fixture, and report for forbidden usage.
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

// 92-98. Git diff scope.
await test("git diff confirms only this patch's allowed files changed, with no runtime/package/env/DB/frontend/MCP changes", () => {
  const allowedChanged = new Set([
    "workflow/authority-safe-procedural-fallback.js",
    "evaluation/fixtures/phase-09l-authority-safe-procedural-fallback-scaffold-1.fixture.json",
    "tests/phase-09l-authority-safe-procedural-fallback-scaffold-1.test.mjs",
    "PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1_REPORT.md",
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
    "workflow/tax-memo-runtime-integration-policy.js"
  ]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }
  check(!diffNames.some((name) => /mcp/i.test(name)), "no MCP files/configs added or modified");
});

// 99-100. Report exists and states runtime/ask impact none.
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

console.log(`\nPHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
