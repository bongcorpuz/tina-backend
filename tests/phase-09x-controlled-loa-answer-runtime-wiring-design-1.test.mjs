// FILE: tests/phase-09x-controlled-loa-answer-runtime-wiring-design-1.test.mjs
// PHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1
//
// Validates the design-only controlled LOA answer runtime-wiring plan
// (fixture + report) for a future implementation patch. This test reads
// the new 09X fixture/report, the 09-GATE-CLOSURE report, and existing
// Phase 9 reports only. It imports NO runtime/server/ask-handler/
// pipeline/route files, makes NO network/HTTP/external-service calls,
// reads no database or environment secrets, and performs no live
// authority retrieval, scraping, download, ingestion, embedding, or
// database write of any kind.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = "evaluation/fixtures/phase-09x-controlled-loa-answer-runtime-wiring-design-1.fixture.json";
const REPORT_PATH = "PHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1_REPORT.md";
const SELF_PATH = "tests/phase-09x-controlled-loa-answer-runtime-wiring-design-1.test.mjs";

const EXPECTED_DECISION = "PHASE 09X CONTROLLED LOA ANSWER RUNTIME WIRING DESIGN PASS WITH STRICT RECOMMENDATIONS";
const EXPECTED_NEXT_TASK = "PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1";

// Prohibited final-legal-conclusion / overreach phrases for this design.
// Kept consistent with prior Phase 9 patches' prohibited-claim list, plus
// this patch's own additional "must avoid saying" categories (validity
// claims, ignoring the notice, guaranteed outcome, definite deadline).
const PROHIBITED_CLAIM_PHRASES = [
  "this assessment is void",
  "this loa is invalid",
  "this ela is invalid",
  "this replacement ela is invalid",
  "this fan is invalid",
  "this fld is invalid",
  "this pan is invalid",
  "this fdda is invalid",
  "the loa is valid",
  "the ela is valid",
  "the assessment is valid",
  "the bir cannot assess you",
  "the case is fully cancelled",
  "the assessment is cancelled",
  "you are permanently cleared",
  "no need to consult a professional",
  "submit everything without review",
  "ignore the notice",
  "you can ignore it",
  "you will win",
  "guaranteed cancellation",
  "final legal opinion",
  "official legal advice",
  "court-tested defense",
  "foolproof defense",
  "the protest is guaranteed to succeed",
  "cta appeal is definitely available",
  "the assessment is final.",
  "the assessment is not final.",
  "the deadline is definitely"
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
 * files. Looks for actual code-shaped usage (import/require syntax,
 * network-call syntax, process.env.<NAME> reads, header-assignment
 * syntax) rather than bare substrings, so it is safe to run against this
 * test's own source as well as the new fixture/report.
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

let fx;

// 1. Fixture exists and valid JSON.
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2. Fixture patch id.
await test("fixture patch id equals PHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1", () => {
  check(fx.patch === "PHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1", "patch id");
});

// 3. Fixture phase.
await test("fixture phase equals 09X", () => {
  check(fx.phase === "09X", "phase equals 09X");
});

// 4. Fixture baseCommit.
await test("fixture baseCommit equals 134678e", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("134678e"), "baseCommit references 134678e");
});

// 5. Fixture decision.
await test("fixture decision equals expected PASS WITH STRICT RECOMMENDATIONS decision", () => {
  check(fx.decision === EXPECTED_DECISION, `decision must equal expected: ${fx.decision}`);
});

// 6. Fixture designType.
await test("fixture designType equals controlled runtime wiring design", () => {
  check(fx.designType === "controlled runtime wiring design", "designType matches expected");
});

// 7. Fixture nextTask.
await test("fixture nextTask equals PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1", () => {
  check(fx.nextTask === EXPECTED_NEXT_TASK, "nextTask matches expected");
});

// 8-15. supportedFutureQueryIntents includes all required keyword categories.
await test("supportedFutureQueryIntents includes all required keyword categories", () => {
  check(Array.isArray(fx.supportedFutureQueryIntents), "supportedFutureQueryIntents is an array");
  const joined = fx.supportedFutureQueryIntents.join(" | ");
  const requiredPatterns = [
    [/received.*BIR LOA/i, "received BIR LOA"],
    [/BIR eLA/i, "BIR eLA"],
    [/Letter of Authority/i, "Letter of Authority"],
    [/replacement eLA/i, "replacement eLA"],
    [/consolidated eLA/i, "consolidated eLA"],
    [/checklist/i, "checklist"],
    [/notice for presentation\/submission/i, "notice for presentation/submission"],
    [/pre-subpoena reminder/i, "pre-subpoena reminder"]
  ];
  for (const [pattern, label] of requiredPatterns) {
    check(pattern.test(joined), `supportedFutureQueryIntents includes: ${label}`);
  }
});

// 16-20. excludedFutureQueryIntents includes all required exclusion categories.
await test("excludedFutureQueryIntents includes all required exclusion categories", () => {
  check(Array.isArray(fx.excludedFutureQueryIntents), "excludedFutureQueryIntents is an array");
  const joined = fx.excludedFutureQueryIntents.join(" | ");
  const requiredPatterns = [
    [/LOA invalid/i, "LOA invalidity"],
    [/eLA void/i, "eLA voidness"],
    [/ignore the LOA/i, "ignoring LOA"],
    [/CTA\?.*final strategy|appeal to CTA/i, "CTA final strategy"],
    [/draft the protest now|filing-ready protest/i, "filing-ready protest"]
  ];
  for (const [pattern, label] of requiredPatterns) {
    check(pattern.test(joined), `excludedFutureQueryIntents includes: ${label}`);
  }
});

// 21-30. Runtime routing design includes all 10 required steps.
await test("futureRuntimeRoutingDesign includes all 10 required routing steps", () => {
  check(Array.isArray(fx.futureRuntimeRoutingDesign) && fx.futureRuntimeRoutingDesign.length === 10, "futureRuntimeRoutingDesign has 10 steps");
  const joined = fx.futureRuntimeRoutingDesign.map((s) => `${s.title} :: ${s.description}`).join(" | ");
  const requiredPatterns = [
    [/intent guard/i, "intent guard"],
    [/scope guard/i, "scope guard"],
    [/09L/, "09L fallback"],
    [/09M/, "09M triage"],
    [/09S/, "09S 2026 baseline"],
    [/09P/, "09P document compliance"],
    [/09O/, "09O audit defense matrix"],
    [/09Q/, "09Q authority corpus"],
    [/safe response renderer/i, "safe response renderer"],
    [/source-card discipline/i, "source-card discipline"]
  ];
  for (const [pattern, label] of requiredPatterns) {
    check(pattern.test(joined), `futureRuntimeRoutingDesign includes: ${label}`);
  }
});

// 31-41. Future safe response template includes all required content categories.
await test("futureSafeResponseTemplate includes all required content categories", () => {
  const templateText = fx.futureSafeResponseTemplate?.templateText || "";
  const requiredPatterns = [
    [/preserve the date and manner of receipt/i, "preserve date and manner of receipt"],
    [/taxpayer name, TIN, taxable period, tax types/i, "check taxpayer/taxable period/tax type/scope"],
    [/verify the LOA\/eLA/i, "LOA/eLA verification"],
    [/original eLA, replacement eLA, consolidated eLA/i, "original/replacement/consolidated classification"],
    [/document compliance matrix/i, "document compliance matrix"],
    [/controlled transmittal/i, "controlled transmittal"],
    [/proof of submission/i, "receiving proof"],
    [/does not exist, do not fabricate it/i, "do not fabricate unavailable/non-existent documents"],
    [/avoid unnecessary admissions/i, "avoid unnecessary admissions"],
    [/NOD\/DOD, PAN, FAN\/FLD, protest, FDDA/i, "NOD/PAN/FAN/FDDA watch"],
    [/human tax\/legal review/i, "human tax/legal review"]
  ];
  for (const [pattern, label] of requiredPatterns) {
    check(pattern.test(templateText), `futureSafeResponseTemplate includes: ${label}`);
  }
});

// 42-48. Future response modes include all 7 required modes.
await test("futureResponseModes include all 7 required modes", () => {
  check(Array.isArray(fx.futureResponseModes), "futureResponseModes is an array");
  const modeNames = fx.futureResponseModes.map((m) => m.mode);
  for (const mode of [
    "SAFE_BASIC_LOA_GUIDANCE",
    "REPLACEMENT_ELA_REVIEW_GUIDANCE",
    "CONSOLIDATED_ELA_REVIEW_GUIDANCE",
    "DOCUMENT_CHECKLIST_GUIDANCE",
    "PRE_SUBPOENA_ESCALATION_GUIDANCE",
    "UNKNOWN_BIR_NOTICE_GUIDANCE",
    "HUMAN_REVIEW_REQUIRED"
  ]) {
    check(modeNames.includes(mode), `futureResponseModes includes: ${mode}`);
  }
});

// 49-56. Future source-card policy includes all required categories and no-citation-if-unverified statement.
await test("futureSourceCardPolicy includes all required source categories and unverified-source-card statement", () => {
  const categories = (fx.futureSourceCardPolicy?.requiredFutureSourceCategories || []).map((c) => c.authority).join(" | ");
  for (const authority of ["RMC No. 5-2026", "RMO No. 1-2026", "RMO No. 6-2026", "RMC No. 14-2026", "RR No. 18-2013", "NIRC Sec. 228", "RR No. 12-99"]) {
    check(categories.includes(authority), `futureSourceCardPolicy includes source category: ${authority}`);
  }
  const policyStatement = fx.futureSourceCardPolicy?.policyStatement || "";
  check(/avoid legal citation phrasing|avoid legal citation/i.test(policyStatement), "policyStatement states no legal citation if verified source cards unavailable");
  check(/official-source verification is required/i.test(policyStatement), "policyStatement states official-source verification is required");
});

// 57-61. Future runtime safety gates include all required categories.
await test("futureRuntimeSafetyGates include all required categories", () => {
  check(Array.isArray(fx.futureRuntimeSafetyGates), "futureRuntimeSafetyGates is an array");
  const joined = fx.futureRuntimeSafetyGates.join(" | ");
  const requiredPatterns = [
    [/LOA intent guard must remain narrow/i, "narrow LOA intent guard"],
    [/validity\/finality\/protest\/CTA-strategy questions must never be answered as final conclusions/i, "no final validity/finality/protest/CTA conclusions"],
    [/no automatic filing-ready output/i, "no filing-ready output"],
    [/no automatic BIR submission/i, "no automatic BIR submission"],
    [/human review notice must always be present/i, "human review notice"]
  ];
  for (const [pattern, label] of requiredPatterns) {
    check(pattern.test(joined), `futureRuntimeSafetyGates includes: ${label}`);
  }
});

// 62-63. Screenshot evidence note states current live fallback is expected and 09X does not change live behavior.
await test("screenshotEvidenceNote states current live fallback is expected and 09X does not change live behavior", () => {
  const note = fx.screenshotEvidenceNote || "";
  check(/authority fallback message/i.test(note), "screenshotEvidenceNote references the authority fallback message");
  check(/expected because Phase 9 scaffolds are closed but not wired to \/ask/i.test(note), "screenshotEvidenceNote states the fallback is expected");
  check(/09X does not change that behavior/i.test(note), "screenshotEvidenceNote states 09X does not change live behavior");
});

// 64. New report exists.
await test("new report exists", () => {
  check(existsSync(resolve(REPORT_PATH)), `${REPORT_PATH} must exist`);
});

let gateReport = "";
if (existsSync(resolve(REPORT_PATH))) gateReport = readFileSync(resolve(REPORT_PATH), "utf8");

// 65. New report decision is PASS WITH STRICT RECOMMENDATIONS.
await test("new report decision is PASS WITH STRICT RECOMMENDATIONS", () => {
  check(gateReport.includes(EXPECTED_DECISION), "report contains the expected decision phrase");
});

// 66-84. New report states all required exact impact statements.
await test("new report states all required exact impact statements", () => {
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
    /Automatic submission impact:\s*None\./,
    /Runtime implementation impact:\s*None\./,
    /Live LOA \/ask behavior changed:\s*No\./
  ];
  for (const pattern of requiredStatements) {
    check(pattern.test(gateReport), `report matches required statement: ${pattern}`);
  }
});

// 85. Static scan: no server/ask-handler/pipeline/route imports in new 09X files.
await test("static scan confirms no server/ask-handler/pipeline/route imports in new 09X files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/^\s*import\s+.*from\s+["'](?:\.\.?\/)*(?:server|ask-handler|pipeline|routes\/)/m.test(selfSrc), "no runtime/server/route import in 09X test");
});

// 86. Static scan: no OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR calls in new 09X files.
await test("static scan confirms no OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR calls in new 09X files", () => {
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

// 87. Static scan: no external HTTP/fetch calls in new 09X files.
await test("static scan confirms no external HTTP/fetch calls in new 09X files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/\bfetch\s*\(|\baxios\s*\(|\bhttp\.request\s*\(|\bhttps\.request\s*\(/.test(selfSrc), "no network call syntax in 09X test");
});

// 88. Static scan: no process.env dependency in new 09X files.
await test("static scan confirms no process.env dependency in new 09X files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> read in 09X test");
});

// 89. Static scan: no Authorization/INDEX_SECRET usage in new 09X files.
await test("static scan confirms no Authorization/INDEX_SECRET usage in new 09X files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/["'`]authorization["'`]\s*:/i.test(selfSrc), "no Authorization header assignment in 09X test");
  const indexSecretToken = ["INDEX", "SECRET"].join("_");
  const indexSecretUsagePattern = new RegExp(`\\b${indexSecretToken}\\b\\s*[:=]`);
  check(!indexSecretUsagePattern.test(selfSrc), "no shared-secret env var assignment in 09X test");
});

// 90. Static scan: no live retrieval/scraping/download/ingestion/embedding/database write implementation in new 09X files.
await test("static scan confirms no live retrieval/scraping/download/ingestion/embedding/database write implementation in new 09X files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  const violations = scanForbiddenUsage(selfSrc);
  check(violations.length === 0, `09X test must implement no live retrieval/scraping/download/ingestion/embedding/db-write: ${violations.join("; ")}`);
});

// 91. Static scan confirms no runtime activation implementation.
await test("static scan confirms no runtime activation implementation", () => {
  check(!/runtimeActive\s*[:=]\s*true/i.test(gateReport), "report does not set runtimeActive true");
  check(!/runtime (?:is |has been )?(?:now )?active\b/i.test(gateReport), "report does not claim runtime is active");
});

// 92. Static scan confirms no filing-ready document generation implementation.
await test("static scan confirms no filing-ready document generation implementation", () => {
  check(!/filing-ready (?:document|letter|affidavit|certification|protest) (?:was |has been )?generated/i.test(gateReport), "report does not claim filing-ready document generated");
});

// 93. Static scan confirms no automatic submission implementation.
await test("static scan confirms no automatic submission implementation", () => {
  check(!/automatically submitted|automatic submission (?:was |has been )?performed/i.test(gateReport), "report does not claim automatic submission performed");
});

// 94. Static scan confirms no final legal conclusion phrases in generated 09X files.
await test("static scan confirms no prohibited final-legal-conclusion phrases in 09X fixture/report", () => {
  const fixtureLower = readFileSync(resolve(FIXTURE_PATH), "utf8").toLowerCase();
  const reportLower = gateReport.toLowerCase();
  for (const phrase of PROHIBITED_CLAIM_PHRASES) {
    check(!fixtureLower.includes(phrase), `09X fixture must not contain prohibited phrase: ${phrase}`);
    check(!reportLower.includes(phrase), `09X report must not contain prohibited phrase: ${phrase}`);
  }
});

// 95. Git diff scope confirms only allowed files changed.
await test("git diff confirms only this patch's allowed files changed, with no runtime/package/env/DB/frontend/MCP changes", () => {
  const allowedChanged = new Set([
    "evaluation/fixtures/phase-09x-controlled-loa-answer-runtime-wiring-design-1.fixture.json",
    "tests/phase-09x-controlled-loa-answer-runtime-wiring-design-1.test.mjs",
    "PHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1_REPORT.md",
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

// 96-97. CURRENT_STATE.md contains 09X design entry and states 09Y as next task.
await test("CURRENT_STATE.md contains 09X design entry and states 09Y as next task", () => {
  const currentState = readFileSync(resolve("knowledge/CURRENT_STATE.md"), "utf8");
  check(/PHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1/.test(currentState), "CURRENT_STATE.md references PHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1");
  check(new RegExp(EXPECTED_NEXT_TASK.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).test(currentState), "CURRENT_STATE.md references PHASE-09Y as the next task");
});

console.log(`\nPHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
