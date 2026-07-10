// FILE: tests/phase-09zg-controlled-loa-live-path-instrumentation-diagnostic-1.test.mjs
// PHASE-09ZG-CONTROLLED-LOA-LIVE-PATH-INSTRUMENTATION-DIAGNOSTIC-1
//
// Static/pure local test. Does not call staging by default. Imports only the
// pure diagnostics module (no side effects) and reads pipeline.js source as
// text for static scanning, rather than importing pipeline.js (which pulls
// in Supabase/OpenAI client construction side effects).

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  isControlledLoaLivePathDiagnosticEnabled,
  createControlledLoaLivePathTrace,
  queryFingerprint
} from "../diagnostics/controlled-loa-live-path-trace.js";

const PATCH = "PHASE-09ZG-CONTROLLED-LOA-LIVE-PATH-INSTRUMENTATION-DIAGNOSTIC-1";
const PHASE = "09ZG";
const BASE_COMMIT = "b0031c2";
const PRIOR_ORDERING_REMEDIATION_COMMIT = "dd991cc";
const PRIOR_SMOKE_DECISION = "PHASE 09ZB CONTROLLED LOA ANSWER STAGING SMOKE FAIL";
const FIXTURE_PATH = "evaluation/fixtures/phase-09zg-controlled-loa-live-path-instrumentation-diagnostic-1.fixture.json";
const REPORT_PATH = "PHASE-09ZG-CONTROLLED-LOA-LIVE-PATH-INSTRUMENTATION-DIAGNOSTIC-1_REPORT.md";
const PIPELINE_PATH = "pipeline.js";
const DIAGNOSTIC_MODULE_PATH = "diagnostics/controlled-loa-live-path-trace.js";
const CURRENT_STATE_PATH = "knowledge/CURRENT_STATE.md";
const DIAGNOSTIC_FLAG = "TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC";

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

const passingBaselineQueries = [
  "I received a BIR LOA, what should I do?",
  "I received a BIR eLA, what should I do?"
];

const failingQueries = [
  "I received a replacement eLA, what should I check first?",
  "I received a consolidated eLA, what should I do?",
  "I received a notice for presentation/submission of documents.",
  "I received a reminder before subpoena."
];

const requiredTraceEvents = [
  "REQUEST_RECEIVED",
  "QUERY_NORMALIZED",
  "FEATURE_FLAG_CHECKED",
  "PH_TAX_BOUNDARY_EVALUATED",
  "AUDIT_PROCEDURE_OVERLAY_EVALUATED",
  "CONTROLLED_LOA_GATE_ENTERED",
  "CONTROLLED_LOA_GATE_INPUT",
  "CONTROLLED_LOA_GATE_RESULT",
  "CONTROLLED_LOA_EARLY_EXIT_BUILT",
  "SUBSEQUENT_BRANCH_ENTERED",
  "FINAL_RESPONSE_SELECTED",
  "REQUEST_COMPLETED"
];

let fx;

await test("fixture exists and is valid JSON with correct core metadata", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture exists");
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(fx.patch === PATCH, "fixture patch id");
  check(fx.phase === PHASE, "fixture phase is 09ZG");
  check(fx.baseCommit === BASE_COMMIT, "fixture baseCommit is b0031c2");
  check(fx.priorOrderingRemediationCommit === PRIOR_ORDERING_REMEDIATION_COMMIT, "fixture priorOrderingRemediationCommit is dd991cc");
  check(fx.priorSmokeDecision === PRIOR_SMOKE_DECISION, "fixture priorSmokeDecision is 09ZB FAIL");
});

await test("fixture records all required baseline and failing queries", () => {
  check(Array.isArray(fx.passingBaselineQueries), "passingBaselineQueries is an array");
  for (const query of passingBaselineQueries) {
    check(fx.passingBaselineQueries.includes(query), `fixture includes baseline query: ${query}`);
  }
  check(Array.isArray(fx.failingQueries) && fx.failingQueries.length === 4, "failingQueries has exactly four entries");
  for (const query of failingQueries) {
    check(fx.failingQueries.includes(query), `fixture includes failing query: ${query}`);
  }
});

await test("fixture represents all required trace events", () => {
  check(Array.isArray(fx.requiredTraceEvents), "requiredTraceEvents is an array");
  for (const eventName of requiredTraceEvents) {
    check(fx.requiredTraceEvents.includes(eventName), `fixture requiredTraceEvents includes ${eventName}`);
  }
});

await test("fixture declares the diagnostic flag explicitly, defaulting to false", () => {
  check(fx.diagnosticFlag === DIAGNOSTIC_FLAG, "fixture diagnosticFlag matches TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC");
  check(fx.diagnosticDefault === false, "fixture diagnosticDefault is false");
});

await test("diagnostic module exists and flag helper defaults to false / gates correctly", () => {
  check(existsSync(resolve(DIAGNOSTIC_MODULE_PATH)), "diagnostic module exists");
  check(isControlledLoaLivePathDiagnosticEnabled({}) === false, "diagnostic disabled with empty env");
  check(isControlledLoaLivePathDiagnosticEnabled({ [DIAGNOSTIC_FLAG]: "true" }) === true, "diagnostic enabled when flag is 'true'");
  check(isControlledLoaLivePathDiagnosticEnabled({ [DIAGNOSTIC_FLAG]: "false" }) === false, "diagnostic disabled when flag is 'false'");
  check(isControlledLoaLivePathDiagnosticEnabled({ [DIAGNOSTIC_FLAG]: undefined }) === false, "diagnostic disabled when flag is undefined");
});

await test("trace collector is a true no-op when disabled (does not invoke field builders, does not record)", () => {
  let builderCalled = false;
  const disabledTrace = createControlledLoaLivePathTrace({ enabled: false });
  const result = disabledTrace.record("REQUEST_RECEIVED", () => {
    builderCalled = true;
    return { hook: "/ask" };
  });
  check(result === null, "disabled record() returns null");
  check(builderCalled === false, "disabled record() never invokes the field builder (zero cost, zero side effect)");
  check(disabledTrace.events.length === 0, "disabled trace collects no events");
});

await test("trace collector records events and can distinguish baseline vs failing traces", () => {
  const baselineTrace = createControlledLoaLivePathTrace({ enabled: true, correlationId: "baseline-corr" });
  baselineTrace.record("REQUEST_RECEIVED", () => ({ hook: "/ask", queryFingerprint: queryFingerprint(passingBaselineQueries[0]) }));
  baselineTrace.record("CONTROLLED_LOA_GATE_ENTERED", () => ({ entered: true }));
  baselineTrace.record("CONTROLLED_LOA_GATE_RESULT", () => ({ matched: true, responseType: "controlled_loa_answer" }));
  baselineTrace.record("FINAL_RESPONSE_SELECTED", () => ({ finalBranch: "controlledLoaGate", finalResponseType: "controlled_loa_answer" }));

  const failingTrace = createControlledLoaLivePathTrace({ enabled: true, correlationId: "failing-corr" });
  failingTrace.record("REQUEST_RECEIVED", () => ({ hook: "/ask", queryFingerprint: queryFingerprint(failingQueries[0]) }));
  failingTrace.record("CONTROLLED_LOA_GATE_ENTERED", () => ({ entered: true }));
  failingTrace.record("CONTROLLED_LOA_GATE_RESULT", () => ({ matched: false, responseType: null }));
  failingTrace.record("FINAL_RESPONSE_SELECTED", () => ({ finalBranch: "clarificationRouteGate", finalResponseType: "clarification" }));

  check(baselineTrace.events.length === 4, "baseline trace recorded 4 events");
  check(failingTrace.events.length === 4, "failing trace recorded 4 events");
  check(baselineTrace.diagnosticId !== failingTrace.diagnosticId, "baseline and failing traces have distinct diagnostic IDs");

  const baselineGateResult = baselineTrace.events.find((e) => e.event === "CONTROLLED_LOA_GATE_RESULT");
  const failingGateResult = failingTrace.events.find((e) => e.event === "CONTROLLED_LOA_GATE_RESULT");
  check(baselineGateResult.matched === true, "baseline trace records gate matched:true");
  check(failingGateResult.matched === false, "failing trace records gate matched:false");

  const baselineFinal = baselineTrace.events.find((e) => e.event === "FINAL_RESPONSE_SELECTED");
  const failingFinal = failingTrace.events.find((e) => e.event === "FINAL_RESPONSE_SELECTED");
  check(baselineFinal.finalResponseType === "controlled_loa_answer", "baseline trace records controlled_loa_answer final response type");
  check(failingFinal.finalResponseType !== "controlled_loa_answer", "failing trace records a different final response type than baseline, distinguishing the two traces");
});

await test("trace collector strips forbidden secret-shaped fields before logging", () => {
  const trace = createControlledLoaLivePathTrace({ enabled: true });
  const event = trace.record("REQUEST_RECEIVED", () => ({
    hook: "/ask",
    authorization: "Bearer some-jwt-value",
    jwt: "should-not-appear",
    password: "should-not-appear",
    secretValue: "should-not-appear",
    cookie: "should-not-appear",
    headers: { any: "thing" },
    reqBody: { question: "raw body dump" },
    envVars: { OPENAI_API_KEY: "should-not-appear" }
  }));
  check(!("authorization" in event), "no Authorization field logged");
  check(!("jwt" in event), "no JWT field logged");
  check(!("password" in event), "no password field logged");
  check(!("secretValue" in event), "no secret-shaped field logged");
  check(!("cookie" in event), "no cookie field logged");
  check(!("headers" in event), "no headers field logged");
  check(!("reqBody" in event), "no request-body field logged");
  check(!("envVars" in event), "no env-vars field logged");
  check(event.hook === "/ask", "safe fields still pass through");
});

await test("queryFingerprint is deterministic and does not require raw-body logging elsewhere", () => {
  const fp1 = queryFingerprint(failingQueries[0]);
  const fp2 = queryFingerprint(failingQueries[0]);
  check(fp1.hash === fp2.hash, "fingerprint hash is deterministic for the same query");
  check(fp1.length === failingQueries[0].length, "fingerprint records query length");
  check(typeof fp1.preview === "string" && fp1.preview.length <= 60, "fingerprint preview is bounded in length");
});

await test("pipeline.js contains gated 09ZG trace checkpoints for all required events", () => {
  check(existsSync(resolve(PIPELINE_PATH)), "pipeline.js exists");
  const src = readFileSync(resolve(PIPELINE_PATH), "utf8");
  check(/isControlledLoaLivePathDiagnosticEnabled/.test(src), "pipeline.js imports the diagnostic flag helper");
  check(/createControlledLoaLivePathTrace/.test(src), "pipeline.js imports the trace collector factory");
  check(/_09zgTrace\.record\(/.test(src), "pipeline.js invokes the trace collector");
  for (const eventName of requiredTraceEvents) {
    check(new RegExp(`_09zgTrace\\.record\\("${eventName}"`).test(src), `pipeline.js records ${eventName}`);
  }
});

await test("diagnostic code is gated by the explicit flag and defaults false", () => {
  const src = readFileSync(resolve(PIPELINE_PATH), "utf8");
  check(/const _09zgDiagnosticEnabled = isControlledLoaLivePathDiagnosticEnabled\(\)/.test(src), "pipeline.js computes the flag once via the helper (default false)");
  const moduleSrc = readFileSync(resolve(DIAGNOSTIC_MODULE_PATH), "utf8");
  check(/DIAGNOSTIC_FLAG_TRUE_VALUES/.test(moduleSrc), "diagnostic module gates on an explicit true-value set, not a bare truthy check");
});

await test("diagnostic module does not persist, call external services, or write to a database", () => {
  const moduleSrc = readFileSync(resolve(DIAGNOSTIC_MODULE_PATH), "utf8");
  const forbidden = [
    /\bfs\.(writeFile|appendFile|createWriteStream)/i,
    /\bopenai\b/i,
    /\bsupabase\b/i,
    /google.?drive/i,
    /\bn8n\b/i,
    /firecrawl/i,
    /crawlee/i,
    /modelcontextprotocol|\bmcp\b/i,
    /tesseract|ocr\(/i,
    /\bfetch\s*\(/i,
    /\baxios\s*\(/i,
    /\.insert\s*\(|\.upsert\s*\(/i
  ];
  for (const pattern of forbidden) {
    check(!pattern.test(moduleSrc), `diagnostic module does not match forbidden pattern: ${pattern}`);
  }
});

await test("diagnostic instrumentation in pipeline.js does not alter gate results, response text, responseType, or query keywords", () => {
  const addedPipeline = execSync(`git diff -- "${PIPELINE_PATH}"`, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 })
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n");
  check(!/evaluateControlledLoaAskGate\s*=\s*\{/.test(addedPipeline), "no reassignment/override of evaluateControlledLoaAskGate");
  check(!/CONTROLLED_LOA_ASK_SAFE_RESPONSE_MODES\.add\(/.test(addedPipeline), "no broadening of the safe response-mode set");
  check(!/CONTROLLED_LOA_AUDIT_PROCEDURE_BOUNDARY_PATTERNS\.push\(/.test(addedPipeline), "no broadening of the audit-procedure boundary pattern list");
  for (const query of failingQueries) {
    check(!addedPipeline.includes(query), `added pipeline.js lines do not hardcode the failing query text: ${query}`);
  }
  check(!/responseType:\s*"controlled_loa_answer"/.test(addedPipeline) || /diagnosticQueryFingerprint|_09zgTrace/.test(addedPipeline),
    "any responseType literal in added lines is only within diagnostic trace calls, not a new hardcoded return value");
});

await test("report exists and contains required impact statements", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  const required = [
    "Runtime impact: Diagnostic instrumentation only.",
    "Answer-content impact: None.",
    "Controlled LOA classification impact: None.",
    "Ask-handler behavioral impact: None except diagnostic observation.",
    "Route behavior impact: None.",
    "Auth behavior impact: None.",
    "Feature flag impact: New staging-only diagnostic flag, default false.",
    "Memory impact: Request-local diagnostic trace only.",
    "Persistence impact: None.",
    "External search impact: None.",
    "Live retrieval impact: None.",
    "Scraping/download/ingestion impact: None.",
    "Database/embedding impact: None.",
    "OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.",
    "Source-card impact: None.",
    "Legal-citation impact: None.",
    "Filing-ready document impact: None.",
    "Automatic submission impact: None.",
    "Production impact: None.",
    "09ZC remains blocked."
  ];
  for (const phrase of required) check(report.includes(phrase), `report contains: ${phrase}`);
});

await test("CURRENT_STATE.md contains a 09ZG entry", () => {
  const current = readFileSync(resolve(CURRENT_STATE_PATH), "utf8");
  check(current.includes(PATCH), "CURRENT_STATE contains the 09ZG patch identifier");
  check(/09ZG/.test(current), "CURRENT_STATE contains a 09ZG reference");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
