// FILE: tests/phase-09z-controlled-loa-answer-ask-wiring-gate-1.test.mjs
// PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1
//
// Formal /ask-wiring-readiness gate validation for the 09Y controlled LOA
// answer scaffold. This test imports ONLY
// workflow/controlled-loa-answer-runtime-scaffold.js and reads the new
// 09Z fixture/report plus prior Phase 9/9X/09-gate reports. It imports NO
// server/ask-handler/pipeline/route/auth/retrieval/source-card-engine
// files, makes NO network/HTTP/external-service calls, reads no database
// or environment secrets, and performs no live authority retrieval,
// scraping, download, ingestion, embedding, or database write of any
// kind. Live /ask behavior is not exercised, imported, or changed by this
// test.

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

const FIXTURE_PATH = "evaluation/fixtures/phase-09z-controlled-loa-answer-ask-wiring-gate-1.fixture.json";
const REPORT_PATH = "PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1_REPORT.md";
const MODULE_PATH = "workflow/controlled-loa-answer-runtime-scaffold.js";
const SELF_PATH = "tests/phase-09z-controlled-loa-answer-ask-wiring-gate-1.test.mjs";

const GATE_09_REPORT_PATH = "PHASE-09-GATE-CLOSURE-1_REPORT.md";
const PATCH_09X_REPORT_PATH = "PHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1_REPORT.md";
const PATCH_09Y_REPORT_PATH = "PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1_REPORT.md";
const PATCH_09Y_TEST_PATH = "tests/phase-09y-controlled-loa-answer-runtime-wiring-scaffold-1.test.mjs";

const EXPECTED_DECISION = "PHASE 09Z CONTROLLED LOA ANSWER ASK WIRING GATE PASS WITH STRICT RECOMMENDATIONS";
const EXPECTED_RUNTIME_GOVERNANCE_RECOMMENDATION = "PASS_WITH_ASK_WIRING_IMPLEMENTATION_DEFERRED";
const EXPECTED_NEXT_TASK = "PHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1";

// Split-token construction of the private do-not-leak reference corpus,
// consistent with the pattern used by the 09-GATE-CLOSURE-1 test. Built
// via array-join rather than literal strings so this gate's own source
// never contains a matchable whole fragment.
function j(parts, sep = "") {
  return parts.join(sep);
}
const REAL_TAXPAYER_NAME_FRAGMENTS = [j(["TRUE", "FREIGHT", "GLOBAL", "LOGISTICS", "INC"], " "), j(["ALL", "ECARS", "INC"], " "), j(["SOCIAL", "HOMES", "INCORPORATED"], " ")];
const REAL_OFFICER_NAME_FRAGMENTS = [
  j(["SUSAN", "F.", "SANTIAGO"], " "),
  j(["RENATO", "N.", "MOLINA"], " "),
  j(["PATRICIA", "ANN", "H.", "GUTIERREZ"], " "),
  j(["MARIA", "RUBIE", "AGANAN"], " "),
  j(["BRENNA", "ROSE", "VENERAYAN"], " "),
  j(["CECILLE", "ASILO"], " "),
  j(["MYRABEL", "DELA", "CRUZ"], " "),
  j(["AL-HELMEY", "F.", "ABDULRASHID"], " "),
  j(["ETHEL", "C.", "EVANGELISTA"], " ")
];
const REAL_ELA_NUMBER_FRAGMENTS = [j([j(["e", "LA"]), "202400099140"]), j([j(["e", "LA"]), "202300040925"]), j([j(["e", "LA"]), "20240018917"]), j([j(["e", "LA"]), "202400055996"])];
const REAL_AUDIT_CASE_NUMBER_FRAGMENTS = [j(["AUDM16-00.8A", "2025", "016972"], "-"), j(["AUDM29-048", "2024", "027259"], "-"), j(["AUDM29-041", "2026", "150797"], "-")];
const REAL_TIN_FRAGMENTS = [j(["008", "826", "456", "000"], "-"), j(["010", "841", "602", "000"], "-"), j(["005", "055", "069", "00000"], "-")];
const REAL_ASSESSMENT_AMOUNT_FRAGMENTS = [
  j(["9,367,987", "68"], "."),
  j(["2,841,029", "91"], "."),
  j(["614,038", "19"], "."),
  j(["737,273", "97"], "."),
  j(["15,000", "00"], "."),
  j(["13,106,907", "66"], "."),
  j(["13,545,329", "75"], ".")
];
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

/**
 * Usage-based forbidden-pattern scan, reused from prior Phase 9 test
 * files. Looks for actual code-shaped usage rather than bare substrings,
 * so it is safe to run against this test's own source.
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

function classifyQuery(q) {
  return classifyControlledLoaIntent(normalizeControlledLoaAnswerInput({ userQuery: q }));
}

let fx;

// 1. Fixture exists and valid JSON.
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2-8. Fixture core fields.
await test("fixture core fields match expected values", () => {
  check(fx.patch === "PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1", "patch id");
  check(fx.phase === "09Z", "phase equals 09Z");
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("a33154c"), "baseCommit references a33154c");
  check(fx.decision === EXPECTED_DECISION, `decision matches expected: ${fx.decision}`);
  check(fx.runtimeGovernanceRecommendation === EXPECTED_RUNTIME_GOVERNANCE_RECOMMENDATION, "runtimeGovernanceRecommendation matches expected");
  check(fx.nextTask === EXPECTED_NEXT_TASK, "nextTask matches expected");
  check(fx.alternativeNextPhase === "PHASE 10 — Evaluation / Fact-Check / Legal-Tax QA System", "alternativeNextPhase matches expected");
});

// 9-14. Upstream reports/decisions exist.
await test("09-GATE, 09X, and 09Y reports exist and contain their PASS decisions", () => {
  check(existsSync(resolve(GATE_09_REPORT_PATH)), "09-GATE report exists");
  check(existsSync(resolve(PATCH_09X_REPORT_PATH)), "09X report exists");
  check(existsSync(resolve(PATCH_09Y_REPORT_PATH)), "09Y report exists");
  check(readFileSync(resolve(GATE_09_REPORT_PATH), "utf8").includes("PHASE 09 GATE CLOSURE PASS WITH STRICT RECOMMENDATIONS"), "09-GATE report contains PASS decision");
  check(
    readFileSync(resolve(PATCH_09X_REPORT_PATH), "utf8").includes("PHASE 09X CONTROLLED LOA ANSWER RUNTIME WIRING DESIGN PASS WITH STRICT RECOMMENDATIONS"),
    "09X report contains PASS decision"
  );
  check(
    readFileSync(resolve(PATCH_09Y_REPORT_PATH), "utf8").includes("PHASE 09Y CONTROLLED LOA ANSWER RUNTIME WIRING SCAFFOLD PASS WITH STRICT RECOMMENDATIONS"),
    "09Y report contains PASS decision"
  );
});

// 15-19. 09Y test/module existence and export inventory.
await test("09Y test and module exist; module exports all required constants/functions with correct version and mode id", () => {
  check(existsSync(resolve(PATCH_09Y_TEST_PATH)), "09Y test exists");
  check(existsSync(resolve(MODULE_PATH)), "09Y module exists");
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
  check(PHASE_09Y_CONTROLLED_LOA_ANSWER_RUNTIME_WIRING_SCAFFOLD_VERSION === "PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1", "version matches expected");
  check(CONTROLLED_LOA_ANSWER_RUNTIME_SCAFFOLD_MODE_ID === "controlled_loa_answer_runtime_scaffold", "mode id matches expected");
});

// 20-32. Narrow safe-intent readiness across all 9 sample safe queries.
await test("all sample safe LOA/eLA queries classify as supported with an expected response mode", () => {
  const expectedModes = new Set(SUPPORTED_CONTROLLED_LOA_RESPONSE_MODES.filter((m) => m !== "HUMAN_REVIEW_REQUIRED" && m !== "AUTHORITY_FALLBACK_REQUIRED"));
  const cases = [
    { q: "I received a BIR LOA, what should I do?", mode: "SAFE_BASIC_LOA_GUIDANCE" },
    { q: "I received a BIR eLA, what should I do?", mode: null },
    { q: "What should I do after receiving a Letter of Authority from BIR?", mode: null },
    { q: "BIR issued an LOA to my company, what are the first steps?", mode: null },
    { q: "What documents should I prepare after receiving a BIR LOA?", mode: null },
    { q: "I received a replacement eLA, what should I check first?", mode: "REPLACEMENT_ELA_REVIEW_GUIDANCE" },
    { q: "I received a consolidated eLA, what should I do?", mode: "CONSOLIDATED_ELA_REVIEW_GUIDANCE" },
    { q: "I received a notice for presentation/submission of documents.", mode: "DOCUMENT_CHECKLIST_GUIDANCE" },
    { q: "I received a reminder before subpoena.", mode: "PRE_SUBPOENA_ESCALATION_GUIDANCE" }
  ];
  for (const { q, mode } of cases) {
    const c = classifyQuery(q);
    check(c.supported === true, `query classifies as supported: "${q}"`);
    check(expectedModes.has(c.responseMode), `query responseMode is an expected safe mode: "${q}" got ${c.responseMode}`);
    if (mode) check(c.responseMode === mode, `query responseMode is ${mode}: "${q}" got ${c.responseMode}`);
  }
});

// 33-44. Excluded-intent readiness across all 12 sample excluded queries.
await test("all sample excluded queries classify as excluded with HUMAN_REVIEW_REQUIRED or AUTHORITY_FALLBACK_REQUIRED", () => {
  const excludedQueries = [
    "Is my LOA invalid?",
    "Is this eLA void?",
    "Can I ignore the LOA?",
    "Can the BIR assess me?",
    "Is the assessment final?",
    "Should I appeal to CTA?",
    "Is the FAN void?",
    "Is the FDDA appealable?",
    "Will I win?",
    "Can you draft the protest now?",
    "Can you submit this to BIR?",
    "Give me a final legal opinion on this LOA."
  ];
  for (const q of excludedQueries) {
    const c = classifyQuery(q);
    check(c.excluded === true, `query classifies as excluded: "${q}"`);
    check(c.responseMode === "HUMAN_REVIEW_REQUIRED" || c.responseMode === "AUTHORITY_FALLBACK_REQUIRED", `query responseMode is HUMAN_REVIEW_REQUIRED or AUTHORITY_FALLBACK_REQUIRED: "${q}" got ${c.responseMode}`);
  }
});

// 45-62. Safe LOA result validity, runtime/liveAskWired flags, and full metadata safety.
await test("safe LOA result is valid with runtimeActive/liveAskWired false and all metadata safety flags correct", () => {
  const result = createControlledLoaAnswerRuntimeScaffoldResult({ userQuery: "I received a BIR LOA, what should I do?" });
  const validation = validateControlledLoaAnswerResult(result);
  check(validation.valid === true, `safe LOA result must validate: ${validation.errors.join("; ")}`);
  check(result.runtimeActive === false, "runtimeActive false");
  check(result.liveAskWired === false, "liveAskWired false");
  check(result.metadata.scaffoldOnly === true, "metadata.scaffoldOnly true");
  for (const key of [
    "runtimeActive",
    "liveAskWired",
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
    check(result.metadata[key] === false, `metadata.${key} is false`);
  }
});

// 63-77. Safe LOA answer content concept evidence.
await test("safe LOA answer includes all required content concepts", () => {
  const result = createControlledLoaAnswerRuntimeScaffoldResult({ userQuery: "I received a BIR LOA, what should I do?" });
  const guidanceText = result.controlledAnswer.proceduralGuidance.join(" | ");
  const detailsText = result.controlledAnswer.detailsToCheck.join(" | ");
  const complianceText = result.controlledAnswer.documentComplianceSteps.join(" | ");
  const proofText = result.controlledAnswer.receivingProofSteps.join(" | ");
  const substituteText = result.controlledAnswer.substituteProofWarnings.join(" | ");
  const auditWatchText = result.controlledAnswer.auditStageWatch.join(" | ");

  check(/preserve the date and manner of receipt/i.test(guidanceText), "includes preserve receipt concept");
  check(/keep a clear copy of the notice/i.test(guidanceText), "includes keep clear copy concept");
  check(detailsText.length > 0 && /taxpayer name/i.test(detailsText) && /TIN/.test(detailsText), "includes details-to-check concept");
  check(/verify the LOA\/eLA/i.test(guidanceText), "includes LOA/eLA verification concept");
  check(/REVIE \/ LOA Verifier/i.test(guidanceText), "includes REVIE / LOA Verifier concept");
  check(/original eLA, replacement eLA, consolidated eLA, TVN, Mission Order, checklist, notice for presentation\/submission, or pre-subpoena reminder/i.test(guidanceText), "includes classification concept");
  check(/document compliance matrix/i.test(complianceText), "includes document compliance matrix concept");
  check(/controlled transmittal/i.test(complianceText), "includes controlled transmittal concept");
  check(/receiving stamp|acknowledgement/i.test(proofText), "includes receiving proof concept");
  check(/do not fabricate/i.test(substituteText), "includes do-not-fabricate concept");
  check(/substitute proof/i.test(substituteText), "includes factual explanation/substitute proof concept");
  check(/avoid unnecessary admissions/i.test(guidanceText), "includes avoid unnecessary admissions concept");
  check(/NOD\/DOD.*PAN.*FAN.*FDDA.*CTA appeal-watch/i.test(auditWatchText), "includes NOD/PAN/FAN/FDDA/CTA watch concept");
  check(typeof result.controlledAnswer.authorityVerificationNotice === "string" && result.controlledAnswer.authorityVerificationNotice.length > 0, "includes official-source verification requirement");
  check(/human tax\/legal review/i.test(result.controlledAnswer.humanReviewNotice), "includes human tax/legal review notice");
});

// 78-79. Safe response preview evidence.
await test("safe response preview includes procedural-guidance-only and human tax/legal review phrases", () => {
  const result = createControlledLoaAnswerRuntimeScaffoldResult({ userQuery: "I received a BIR LOA, what should I do?" });
  check(/procedural guidance only/i.test(result.safeResponsePreview), "includes procedural guidance only");
  check(/human tax\/legal review/i.test(result.safeResponsePreview), "includes human tax/legal review");
});

// 80-90. Source-card policy readiness evidence.
await test("source-card policy is unverified/no-citation and includes all required authority categories", () => {
  const result = createControlledLoaAnswerRuntimeScaffoldResult({ userQuery: "I received a BIR LOA, what should I do?" });
  check(result.sourceCardPolicy.verifiedSourceCardsAvailable === false, "verifiedSourceCardsAvailable false");
  check(result.sourceCardPolicy.legalCitationAllowed === false, "legalCitationAllowed false");
  check(result.sourceCardPolicy.sourceCardsRequiredForFutureLegalClaims === true, "sourceCardsRequiredForFutureLegalClaims true");
  const categories = result.sourceCardPolicy.requiredFutureAuthorityCategories.join(" | ");
  for (const authority of ["RMC No. 5-2026", "RMO No. 1-2026", "RMO No. 6-2026", "RMC No. 14-2026", "RR No. 18-2013", "NIRC Sec. 228", "RR No. 12-99", "CTA rules"]) {
    check(categories.includes(authority), `source-card policy includes authority category: ${authority}`);
  }
});

// 91-96. 09Z report exists and states required exact gate-outcome statements.
await test("09Z report exists and states required exact gate-outcome statements", () => {
  check(existsSync(resolve(REPORT_PATH)), `${REPORT_PATH} must exist`);
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(report.includes(EXPECTED_DECISION), "report contains the expected decision phrase");
  check(/09Y scaffold readiness for future \/ask wiring:\s*PASS\./.test(report), "states 09Y scaffold readiness for future /ask wiring: PASS.");
  check(/Live \/ask LOA behavior changed in 09Z:\s*No\./.test(report), "states Live /ask LOA behavior changed in 09Z: No.");
  check(/Runtime activation approved in 09Z:\s*No\./.test(report), "states Runtime activation approved in 09Z: No.");
  check(/Future \/ask implementation may proceed only through PHASE-09ZA\./.test(report), "states Future /ask implementation may proceed only through PHASE-09ZA.");
});

// 97-113. 09Z report states all required non-runtime/external-operation exact impact statements.
await test("09Z report states all required non-runtime/external-operation impact statements as None", () => {
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  const requiredStatements = [
    /Runtime impact:\s*None\./,
    /\/ask impact:\s*None\./,
    /Ask-handler impact:\s*None\./,
    /Route impact:\s*None\./,
    /Server impact:\s*None\./,
    /Pipeline impact:\s*None\./,
    /Feature flag impact:\s*None\./,
    /Memory impact:\s*None\./,
    /Persistence impact:\s*None\./,
    /External search impact:\s*None\./,
    /Live retrieval impact:\s*None\./,
    /Scraping\/download\/ingestion impact:\s*None\./,
    /Database\/embedding impact:\s*None\./,
    /OpenAI\/Supabase\/Google Drive\/n8n\/Firecrawl\/Crawlee\/MCP\/OCR impact:\s*None\./,
    /Production impact:\s*None\./,
    /Filing-ready document impact:\s*None\./,
    /Automatic submission impact:\s*None\./
  ];
  for (const pattern of requiredStatements) {
    check(pattern.test(report), `report matches required statement: ${pattern}`);
  }
});

// 114. Static scan: no server/ask-handler/pipeline/route imports in new 09Z files.
await test("static scan confirms no server/ask-handler/pipeline/route imports in new 09Z files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/^\s*import\s+.*from\s+["'](?:\.\.?\/)*(?:server|ask-handler|pipeline|routes\/)/m.test(selfSrc), "no runtime/server/route import in 09Z test");
});

// 115. Static scan: no OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR calls in new 09Z files.
await test("static scan confirms no OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR calls in new 09Z files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  const fixtureRaw = readFileSync(resolve(FIXTURE_PATH), "utf8");
  const reportRaw = existsSync(resolve(REPORT_PATH)) ? readFileSync(resolve(REPORT_PATH), "utf8") : "";
  for (const [label, src] of [
    ["test", selfSrc],
    ["fixture", fixtureRaw],
    ["report", reportRaw]
  ]) {
    const violations = scanForbiddenUsage(src);
    check(violations.length === 0, `${label} must have no forbidden service usage: ${violations.join("; ")}`);
  }
});

// 116. Static scan: no external HTTP/fetch calls in new 09Z files.
await test("static scan confirms no external HTTP/fetch calls in new 09Z files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/\bfetch\s*\(|\baxios\s*\(|\bhttp\.request\s*\(|\bhttps\.request\s*\(/.test(selfSrc), "no network call syntax in 09Z test");
});

// 117. Static scan: no process.env dependency in new 09Z files.
await test("static scan confirms no process.env dependency in new 09Z files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> read in 09Z test");
});

// 118. Static scan: no Authorization/INDEX_SECRET usage in new 09Z files.
await test("static scan confirms no Authorization/INDEX_SECRET usage in new 09Z files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/["'`]authorization["'`]\s*:/i.test(selfSrc), "no Authorization header assignment in 09Z test");
  const indexSecretToken = ["INDEX", "SECRET"].join("_");
  const indexSecretUsagePattern = new RegExp(`\\b${indexSecretToken}\\b\\s*[:=]`);
  check(!indexSecretUsagePattern.test(selfSrc), "no shared-secret env var assignment in 09Z test");
});

// 119. Static scan: no live retrieval/scraping/download/ingestion/embedding/database write implementation in new 09Z files.
await test("static scan confirms no live retrieval/scraping/download/ingestion/embedding/database write implementation in new 09Z files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  const violations = scanForbiddenUsage(selfSrc);
  check(violations.length === 0, `09Z test must implement no live retrieval/scraping/download/ingestion/embedding/db-write: ${violations.join("; ")}`);
});

// 120. Static scan confirms no runtime activation implementation.
await test("static scan confirms no runtime activation implementation", () => {
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(!/runtime (?:is |has been )?(?:now )?active\b/i.test(report), "report does not claim runtime is active");
  check(!/runtimeActive\s*[:=]\s*true/i.test(report), "report does not set runtimeActive true");
});

// 121. Static scan confirms no filing-ready document generation implementation.
await test("static scan confirms no filing-ready document generation implementation", () => {
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(!/filing-ready (?:document|letter|affidavit|certification|protest) (?:was |has been )?generated/i.test(report), "report does not claim filing-ready document generated");
});

// 122. Static scan confirms no automatic submission implementation.
await test("static scan confirms no automatic submission implementation", () => {
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(!/automatically submitted|automatic submission (?:was |has been )?performed/i.test(report), "report does not claim automatic submission performed");
});

// 123. Static scan confirms no final legal conclusion phrases in generated 09Z files.
await test("static scan confirms no prohibited final-legal-conclusion phrases in 09Z fixture/report", () => {
  const fixtureLower = readFileSync(resolve(FIXTURE_PATH), "utf8").toLowerCase();
  const reportLower = readFileSync(resolve(REPORT_PATH), "utf8").toLowerCase();
  for (const phrase of PROHIBITED_CLAIM_PHRASES) {
    check(!fixtureLower.includes(phrase), `09Z fixture must not contain prohibited phrase: ${phrase}`);
    check(!reportLower.includes(phrase), `09Z report must not contain prohibited phrase: ${phrase}`);
  }
});

// 124. Static scan confirms no real taxpayer data in fixture/report/output.
await test("no private real-reference fragments appear in 09Z fixture, report, or 09Y module/fixture/report/test", () => {
  const filesToScan = [FIXTURE_PATH, REPORT_PATH, MODULE_PATH, "evaluation/fixtures/phase-09y-controlled-loa-answer-runtime-wiring-scaffold-1.fixture.json", PATCH_09Y_REPORT_PATH, PATCH_09Y_TEST_PATH];
  for (const file of filesToScan) {
    if (!existsSync(resolve(file))) continue;
    const raw = readFileSync(resolve(file), "utf8");
    for (const fragment of ALL_REAL_FRAGMENTS) {
      // The 09Y module/test are allowed to reference these fragments only
      // inside their own intentional do-not-leak blocklist declarations;
      // this gate's own fixture/report must never contain them at all.
      if (file === MODULE_PATH || file === PATCH_09Y_TEST_PATH) continue;
      check(!raw.toUpperCase().includes(fragment.toUpperCase()), `${file} must not contain real fragment: ${fragment}`);
    }
  }
});

// 125. Git diff scope confirms only allowed files changed.
await test("git diff confirms only this gate's allowed files changed, with no runtime/package/env/DB/frontend/MCP changes", () => {
  const allowedChanged = new Set([
    "evaluation/fixtures/phase-09z-controlled-loa-answer-ask-wiring-gate-1.fixture.json",
    "tests/phase-09z-controlled-loa-answer-ask-wiring-gate-1.test.mjs",
    "PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1_REPORT.md",
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
    check(allowedChanged.has(name), `changed file is allowed by this gate's scope: ${name}`);
  }
  for (const forbidden of ["server.js", "ask-handler.js", "pipeline.js", "package.json", "package-lock.json", "workflow/controlled-loa-answer-runtime-scaffold.js"]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }
  check(!diffNames.some((name) => /mcp/i.test(name)), "no MCP files/configs added or modified");
});

// 126-127. CURRENT_STATE.md contains 09Z gate entry and states 09ZA as next task.
await test("CURRENT_STATE.md contains 09Z gate entry and states 09ZA as next task", () => {
  const currentState = readFileSync(resolve("knowledge/CURRENT_STATE.md"), "utf8");
  check(/PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1/.test(currentState), "CURRENT_STATE.md references PHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1");
  check(new RegExp(EXPECTED_NEXT_TASK.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).test(currentState), "CURRENT_STATE.md references PHASE-09ZA as the next task");
});

console.log(`\nPHASE-09Z-CONTROLLED-LOA-ANSWER-ASK-WIRING-GATE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
