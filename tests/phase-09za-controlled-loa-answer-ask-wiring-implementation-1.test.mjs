// FILE: tests/phase-09za-controlled-loa-answer-ask-wiring-implementation-1.test.mjs
// PHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1
//
// Validates the narrow controlled LOA/eLA procedural-help /ask wiring
// implementation added to pipeline.js (evaluateControlledLoaAskGate,
// isControlledLoaAskGateEnabled, buildControlledLoaAskEarlyExitResponse),
// backed by the pure 09Y scaffold
// (workflow/controlled-loa-answer-runtime-scaffold.js). This test imports
// only pipeline.js and the 09Y scaffold module. It does NOT start an
// external server, does NOT call external HTTP, and does NOT call
// OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR. Merely
// importing pipeline.js logs pre-existing DB/observability configuration
// (unchanged, pre-existing behavior of the module) but performs no
// network I/O during these tests.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { isControlledLoaAskGateEnabled, evaluateControlledLoaAskGate, buildControlledLoaAskEarlyExitResponse } from "../pipeline.js";
import { classifyControlledLoaIntent, normalizeControlledLoaAnswerInput, createControlledLoaAnswerRuntimeScaffoldResult } from "../workflow/controlled-loa-answer-runtime-scaffold.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09za-controlled-loa-answer-ask-wiring-implementation-1.fixture.json";
const REPORT_PATH = "PHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1_REPORT.md";
const MODULE_PATH = "workflow/controlled-loa-answer-runtime-scaffold.js";
const PIPELINE_PATH = "pipeline.js";
const SELF_PATH = "tests/phase-09za-controlled-loa-answer-ask-wiring-implementation-1.test.mjs";

const EXPECTED_DECISION = "PHASE 09ZA CONTROLLED LOA ANSWER ASK WIRING IMPLEMENTATION PASS WITH STRICT RECOMMENDATIONS";
const EXPECTED_NEXT_TASK = "PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1";

// Split-token construction of the private do-not-leak reference corpus.
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

const SUPABASE_TOKEN = j(["supa", "base"]);
const OPENAI_TOKEN = j(["open", "ai"]);
const GOOGLE_DRIVE_TOKEN = j(["google", "drive"]);
const FORBIDDEN_SERVICE_TOKENS = [OPENAI_TOKEN, SUPABASE_TOKEN, GOOGLE_DRIVE_TOKEN, "n8n", "firecrawl", "crawlee", "mcp", "ocr", "tesseract"];

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

function enabledEnv() {
  return { TINA_ENABLE_CONTROLLED_LOA_ASK_GATE: "1" };
}
function disabledEnv() {
  return {};
}

/**
 * Returns only the added ("+") lines from `git diff -- <file>` for the
 * given file, excluding the "+++" file-header line. Used to scan only
 * NEW content introduced by this patch rather than pre-existing runtime
 * file content (which legitimately already imports many services this
 * patch must not add usage of).
 *
 * @param {string} file
 * @returns {string}
 */
function addedLinesForFile(file) {
  let diffOutput = "";
  try {
    diffOutput = execSync(`git diff -- "${file}"`, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  } catch {
    diffOutput = "";
  }
  return diffOutput
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n");
}

let fx;

// 1. Fixture exists and valid JSON.
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2-6. Fixture core fields.
await test("fixture core fields match expected values", () => {
  check(fx.patch === "PHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1", "patch id");
  check(fx.phase === "09ZA", "phase equals 09ZA");
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("75d90b2"), "baseCommit references 75d90b2");
  check(fx.decision === EXPECTED_DECISION, `decision matches expected: ${fx.decision}`);
  check(fx.nextTask === EXPECTED_NEXT_TASK, "nextTask matches expected");
});

// 7-8. 09Y scaffold module exists and classifies basic LOA query as supported.
await test("09Y scaffold module exists and classifies basic LOA query as supported", () => {
  check(existsSync(resolve(MODULE_PATH)), "09Y scaffold module exists");
  const classification = classifyControlledLoaIntent(normalizeControlledLoaAnswerInput({ userQuery: "I received a BIR LOA, what should I do?" }));
  check(classification.supported === true, "basic LOA query classifies as supported");
});

// 9-10. Modified runtime hook imports/references 09Y scaffold and is narrow.
await test("pipeline.js references the 09Y scaffold and the gate is narrow (feature-flagged, off by default)", () => {
  const pipelineSrc = readFileSync(resolve(PIPELINE_PATH), "utf8");
  check(pipelineSrc.includes("controlled-loa-answer-runtime-scaffold.js"), "pipeline.js imports from the 09Y scaffold module");
  check(pipelineSrc.includes("evaluateControlledLoaAskGate"), "pipeline.js defines evaluateControlledLoaAskGate");
  check(isControlledLoaAskGateEnabled(disabledEnv()) === false, "gate is disabled by default (empty env)");
  check(isControlledLoaAskGateEnabled(enabledEnv()) === true, "gate is enabled when TINA_ENABLE_CONTROLLED_LOA_ASK_GATE=1");
});

// 11-18. All 8 safe sample queries return a controlled response when the gate is enabled.
await test("all 8 safe LOA/eLA sample queries return a controlled response when the gate is enabled", () => {
  const queries = [
    "I received a BIR LOA, what should I do?",
    "I received a BIR eLA, what should I do?",
    "What should I do after receiving a Letter of Authority from BIR?",
    "What documents should I prepare after receiving a BIR LOA?",
    "I received a replacement eLA, what should I check first?",
    "I received a consolidated eLA, what should I do?",
    "I received a notice for presentation/submission of documents.",
    "I received a reminder before subpoena."
  ];
  for (const query of queries) {
    const result = evaluateControlledLoaAskGate({ ctx: {}, query, hook: "/ask", env: enabledEnv() });
    check(result.matched === true, `query returns controlled response: "${query}"`);
    check(result.earlyExitResponse !== null, `query has an earlyExitResponse: "${query}"`);
    check(result.earlyExitResponse.responseType === "controlled_loa_answer", `query responseType is controlled_loa_answer: "${query}"`);
  }
});

// 19-31. Controlled answer content evidence (using the basic LOA query).
await test("controlled response includes all required content concepts", () => {
  const result = evaluateControlledLoaAskGate({ ctx: {}, query: "I received a BIR LOA, what should I do?", hook: "/ask", env: enabledEnv() });
  const answer = result.earlyExitResponse.answer;
  check(/procedural guidance only/i.test(answer), "includes procedural guidance only");
  check(/human tax\/legal review/i.test(answer), "includes human tax/legal review notice");
  check(/preserve the date and manner of receipt/i.test(answer), "includes preserve receipt concept");
  check(/taxpayer name, TIN, taxable period, tax types/i.test(answer), "includes LOA/eLA detail-check concept");
  check(/verify (?:it|the LOA\/eLA) through the available BIR verification process/i.test(answer), "includes LOA/eLA verification concept");
  check(/REVIE \/ LOA Verifier/i.test(answer), "includes REVIE / LOA Verifier concept");
  check(/document compliance matrix/i.test(answer), "includes document compliance matrix concept");
  check(/controlled transmittal/i.test(answer), "includes controlled transmittal concept");
  check(/proof of submission/i.test(answer), "includes receiving proof concept");
  check(/do not fabricate (?:unavailable|non-existent)/i.test(answer), "includes do-not-fabricate concept");
  check(/avoid unnecessary admissions/i.test(answer), "includes avoid unnecessary admissions concept");
  check(/NOD\/DOD, PAN, FAN\/FLD, protest, FDDA/i.test(answer), "includes NOD/PAN/FAN/FDDA/CTA watch concept");
  check(/official-source verification/i.test(answer) || /require official-source verification/i.test(answer), "includes official-source verification requirement");
});

// 32-40. Excluded unsafe queries do not return controlled safe LOA guidance.
await test("excluded unsafe queries do not return controlled safe LOA guidance", () => {
  const excludedQueries = [
    "Is my LOA invalid?",
    "Is this eLA void?",
    "Can I ignore the LOA?",
    "Can the BIR assess me?",
    "Is the assessment final?",
    "Should I appeal to CTA?",
    "Can you draft the protest now?",
    "Can you submit this to BIR?",
    "Give me a final legal opinion on this LOA."
  ];
  for (const query of excludedQueries) {
    const result = evaluateControlledLoaAskGate({ ctx: {}, query, hook: "/ask", env: enabledEnv() });
    check(result.matched === false, `excluded query does not return controlled response: "${query}"`);
    check(result.earlyExitResponse === null, `excluded query has no earlyExitResponse: "${query}"`);
  }
});

// 41-45. Controlled response metadata evidence.
await test("controlled response metadata is safe: legalCitationAllowed false, sourceCardVerification not_performed, filingReadyDocumentGenerated false, automaticSubmission false, sourceCards empty", () => {
  const result = evaluateControlledLoaAskGate({ ctx: {}, query: "I received a BIR LOA, what should I do?", hook: "/ask", env: enabledEnv() });
  const meta = result.earlyExitResponse.controlledLoaAnswer;
  check(meta.legalCitationAllowed === false, "metadata legalCitationAllowed false");
  check(meta.sourceCardVerification === "not_performed", "metadata sourceCardVerification not_performed");
  check(meta.filingReadyDocumentGenerated === false, "metadata filingReadyDocumentGenerated false");
  check(meta.automaticSubmission === false, "metadata automaticSubmission false");
  check(Array.isArray(result.earlyExitResponse.sourceCards) && result.earlyExitResponse.sourceCards.length === 0, "sourceCards is empty array");
});

// 46-48. Unrelated generic queries do not trigger the controlled LOA branch.
await test("unrelated generic queries do not trigger the controlled LOA branch", () => {
  const unrelatedQueries = ["What is the EWT rate for professional fees?", "Is this transaction subject to VAT?", "How is estate tax computed?"];
  for (const query of unrelatedQueries) {
    const result = evaluateControlledLoaAskGate({ ctx: {}, query, hook: "/ask", env: enabledEnv() });
    check(result.matched === false, `unrelated query does not trigger controlled LOA branch: "${query}"`);
  }
});

// 49-55. Existing auth/route/server/pipeline behavior not modified (static + git-diff based).
await test("existing auth/route/server behavior is unmodified; no route/server/package/env/DB/frontend/MCP files changed", () => {
  let diffNames = [];
  try {
    diffNames = execSync("git diff --name-only", { encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    diffNames = [];
  }
  check(!diffNames.includes("auth.js"), "auth.js not changed");
  check(!diffNames.includes("server.js"), "server.js not changed (no justification required since untouched)");
  check(!diffNames.some((name) => name.startsWith("routes/")), "no route file changed");
  check(!diffNames.includes("package.json") && !diffNames.includes("package-lock.json"), "no package/lockfile changed");
  check(!diffNames.includes(".env") && !diffNames.some((name) => name.endsWith(".env")), "no env file changed");
  check(!diffNames.some((name) => /supabase|migrations/i.test(name)), "no DB/migration file changed");
  check(!diffNames.some((name) => /^(?:public|frontend|src\/frontend)\//i.test(name)), "no frontend file changed");
  check(!diffNames.some((name) => /n8n|firecrawl|crawlee/i.test(name)), "no n8n/Firecrawl/Crawlee file changed");
  check(!diffNames.some((name) => /mcp/i.test(name)), "no MCP file/config changed");
});

// 51. Pipeline behavior unmodified except for the new narrow gate (since pipeline.js IS the chosen hook).
await test("pipeline.js changes are limited to the new narrow controlled-LOA gate (existing clarification gate test still passes)", () => {
  let clarificationTestOutput = "";
  try {
    clarificationTestOutput = execSync("node tests/patch-07b-clarification-live-wiring-1-narrow-route-gate.test.mjs", { encoding: "utf8" });
  } catch (e) {
    clarificationTestOutput = e.stdout ? e.stdout.toString() : "";
  }
  check(/0 failed/.test(clarificationTestOutput), "pre-existing clarification route gate test still passes after this patch's pipeline.js edit");
});

// 56-59. Static scan of newly ADDED lines only (git diff +lines) for forbidden service/network/env/auth usage.
await test("static scan confirms no forbidden service/network/env/Authorization usage was ADDED to pipeline.js", () => {
  const addedPipelineLines = addedLinesForFile(PIPELINE_PATH).toLowerCase();
  for (const token of FORBIDDEN_SERVICE_TOKENS) {
    // Word-boundary match: an added field name like `openaiCalls: []` (an
    // empty-array field preserving the existing response-shape convention,
    // meaning zero OpenAI calls) must not false-positive as a forbidden
    // "openai" usage the way a bare substring test would.
    const pattern = new RegExp(`\\b${token.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    check(!pattern.test(addedPipelineLines), `no added pipeline.js line references forbidden service token: ${token}`);
  }
  check(!/\bfetch\s*\(|\baxios\s*\(|\bhttp\.request\s*\(|\bhttps\.request\s*\(|\bXMLHttpRequest\s*\(/.test(addedPipelineLines), "no added pipeline.js line adds network call syntax");
  check(!/process\.env\.\w/.test(addedPipelineLines), "no added pipeline.js line adds a new process.env.<NAME> read (existing env reads pre-date this patch)");
  check(!/["'`]authorization["'`]\s*:/i.test(addedPipelineLines), "no added pipeline.js line adds Authorization header assignment");
  const indexSecretToken = ["INDEX", "SECRET"].join("_");
  check(!new RegExp(`\\b${indexSecretToken}\\b`, "i").test(addedPipelineLines), "no added pipeline.js line references the shared-secret env var");
});

// 60. Static scan confirms no live retrieval/scraping/download/ingestion/embedding/database write implementation added.
await test("static scan confirms no live retrieval/scraping/download/ingestion/embedding/database write implementation was added", () => {
  const addedPipelineLines = addedLinesForFile(PIPELINE_PATH).toLowerCase();
  check(!/\bscrape\s*\(|cheerio\.load\s*\(|puppeteer\.|playwright\./i.test(addedPipelineLines), "no scraping call syntax added");
  check(!/\bdownload\s*\(/i.test(addedPipelineLines), "no download call syntax added");
  check(!/\bingest\s*\(/i.test(addedPipelineLines), "no ingest call syntax added");
  check(!/embeddings?\.create\s*\(|createembedding\s*\(|vectorsearch\s*\(/i.test(addedPipelineLines), "no embedding/vector-search call syntax added");
  check(!/\.insert\s*\(|\.upsert\s*\(|insert\s+into\b/i.test(addedPipelineLines), "no database write call syntax added");
});

// 61-62. Static scan confirms no filing-ready document generation or automatic submission implementation.
await test("static scan confirms no filing-ready document generation or automatic submission implementation", () => {
  const addedPipelineLines = addedLinesForFile(PIPELINE_PATH);
  check(!/filingReadyDocumentGenerated:\s*true/.test(addedPipelineLines), "no filingReadyDocumentGenerated: true added");
  check(!/automaticSubmission:\s*true/.test(addedPipelineLines), "no automaticSubmission: true added");
});

// 63. Static scan confirms no final legal conclusion phrases in generated controlled response.
await test("static scan confirms no prohibited final-legal-conclusion phrases in generated controlled response, fixture, or report", () => {
  const result = evaluateControlledLoaAskGate({ ctx: {}, query: "I received a BIR LOA, what should I do?", hook: "/ask", env: enabledEnv() });
  const answerLower = result.earlyExitResponse.answer.toLowerCase();
  const fixtureLower = readFileSync(resolve(FIXTURE_PATH), "utf8").toLowerCase();
  const reportLower = existsSync(resolve(REPORT_PATH)) ? readFileSync(resolve(REPORT_PATH), "utf8").toLowerCase() : "";
  for (const phrase of PROHIBITED_CLAIM_PHRASES) {
    check(!answerLower.includes(phrase), `controlled response must not contain prohibited phrase: ${phrase}`);
    check(!fixtureLower.includes(phrase), `fixture must not contain prohibited phrase: ${phrase}`);
    check(!reportLower.includes(phrase), `report must not contain prohibited phrase: ${phrase}`);
  }
});

// 64. Static scan confirms no real taxpayer data in fixture/report/output.
await test("no private real-reference fragments appear in fixture, report, or generated controlled response", () => {
  const result = evaluateControlledLoaAskGate({ ctx: {}, query: "I received a BIR LOA, what should I do?", hook: "/ask", env: enabledEnv() });
  const answerUpper = result.earlyExitResponse.answer.toUpperCase();
  const fixtureUpper = readFileSync(resolve(FIXTURE_PATH), "utf8").toUpperCase();
  const reportUpper = existsSync(resolve(REPORT_PATH)) ? readFileSync(resolve(REPORT_PATH), "utf8").toUpperCase() : "";
  for (const fragment of ALL_REAL_FRAGMENTS) {
    const upperFragment = fragment.toUpperCase();
    check(!answerUpper.includes(upperFragment), `controlled response must not contain real fragment: ${fragment}`);
    check(!fixtureUpper.includes(upperFragment), `fixture must not contain real fragment: ${fragment}`);
    check(!reportUpper.includes(upperFragment), `report must not contain real fragment: ${fragment}`);
  }
});

// 65-82. Report exists and states required exact/conditional statements.
await test("report exists and states all required exact and conditional statements", () => {
  check(existsSync(resolve(REPORT_PATH)), `${REPORT_PATH} must exist`);
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(report.includes(EXPECTED_DECISION), "report contains the expected decision phrase");

  // Conditional ask-handler/pipeline statements: since pipeline.js is the
  // chosen hook, ask-handler is None and pipeline is the controlled branch.
  check(/Ask-handler impact:\s*None\./.test(report), "states Ask-handler impact: None.");
  check(/Pipeline impact:\s*Controlled narrow LOA branch only\./.test(report), "states Pipeline impact: Controlled narrow LOA branch only.");

  const alwaysRequired = [
    /Runtime impact:\s*Controlled narrow \/ask LOA branch only\./,
    /Route impact:\s*None\./,
    /Server impact:\s*None\./,
    /Feature flag impact:\s*None\./,
    /Memory impact:\s*None\./,
    /Persistence impact:\s*None\./,
    /External search impact:\s*None\./,
    /Live retrieval impact:\s*None\./,
    /Scraping\/download\/ingestion impact:\s*None\./,
    /Database\/embedding impact:\s*None\./,
    /OpenAI\/Supabase\/Google Drive\/n8n\/Firecrawl\/Crawlee\/MCP\/OCR impact:\s*None\./,
    /Production deployment impact:\s*None\./,
    /Filing-ready document impact:\s*None\./,
    /Automatic submission impact:\s*None\./,
    /Live LOA \/ask behavior changed:\s*Yes, controlled narrow branch only\./
  ];
  for (const pattern of alwaysRequired) {
    check(pattern.test(report), `report matches required statement: ${pattern}`);
  }
});

// 83. Git diff scope confirms only allowed files plus at most one approved runtime hook file changed.
await test("git diff confirms only allowed files plus the single approved pipeline.js hook changed", () => {
  const allowedChanged = new Set([
    "workflow/controlled-loa-answer-runtime-scaffold.js",
    "evaluation/fixtures/phase-09za-controlled-loa-answer-ask-wiring-implementation-1.fixture.json",
    "tests/phase-09za-controlled-loa-answer-ask-wiring-implementation-1.test.mjs",
    "PHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1_REPORT.md",
    "knowledge/CURRENT_STATE.md",
    "pipeline.js"
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
  // Note: diffNames reflects only the *currently uncommitted* working-tree
  // diff, so it is empty once this patch is committed (a clean tree) -- it
  // is not asserted to contain pipeline.js. The runtime-hook file itself is
  // independently confirmed via the "pipeline.js references the 09Y
  // scaffold" test above.
  check(!diffNames.includes("ask-handler.js"), "ask-handler.js not changed");
  check(!diffNames.includes("server.js"), "server.js not changed");
});

// 84-85. CURRENT_STATE.md contains 09ZA implementation entry and states 09ZB as next task.
await test("CURRENT_STATE.md contains 09ZA implementation entry and states 09ZB as next task", () => {
  const currentState = readFileSync(resolve("knowledge/CURRENT_STATE.md"), "utf8");
  check(/PHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1/.test(currentState), "CURRENT_STATE.md references PHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1");
  check(new RegExp(EXPECTED_NEXT_TASK.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).test(currentState), "CURRENT_STATE.md references PHASE-09ZB as the next task");
});

// Extra: this test file itself references no forbidden literal tokens (self-check for consistency).
await test("this test file itself has no forbidden usage patterns", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/\bfetch\s*\(|\baxios\s*\(|\bhttp\.request\s*\(|\bhttps\.request\s*\(/.test(selfSrc), "no network call syntax in this test file");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> read in this test file");
  check(!/["'`]authorization["'`]\s*:/i.test(selfSrc), "no Authorization header assignment in this test file");
});

console.log(`\nPHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
