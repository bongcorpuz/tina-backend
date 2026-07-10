// FILE: tests/phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs
// PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1
//
// Local static/unit validation plus optional live staging smoke. Live staging
// calls run only when RUN_TINA_STAGING_SMOKE=true and staging URL/auth env vars
// are explicitly provided. No secrets are hardcoded.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { evaluateControlledLoaAskGate } from "../pipeline.js";
import { classifyControlledLoaIntent, normalizeControlledLoaAnswerInput } from "../workflow/controlled-loa-answer-runtime-scaffold.js";

const LIVE_SMOKE_EXPLICITLY_REQUESTED =
  process.env.RUN_TINA_STAGING_SMOKE === "true" &&
  process.env.RUN_TINA_09ZB_LIVE_SMOKE === "true";

function loadLocalDotEnvIfPresent() {
  const envPath = resolve(".env");
  if (!existsSync(envPath)) return;

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalDotEnvIfPresent();

const FIXTURE_PATH = "evaluation/fixtures/phase-09zb-controlled-loa-answer-staging-smoke-1.fixture.json";
const REPORT_PATH = "PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1_REPORT.md";
const CURRENT_STATE_PATH = "knowledge/CURRENT_STATE.md";
const PIPELINE_PATH = "pipeline.js";
const SCAFFOLD_PATH = "workflow/controlled-loa-answer-runtime-scaffold.js";
const EXPECTED_PATCH = "PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1";
const PASS_DECISION = "PHASE 09ZB CONTROLLED LOA ANSWER STAGING SMOKE PASS WITH STRICT RECOMMENDATIONS";
const BLOCKED_DECISION = "PHASE 09ZB CONTROLLED LOA ANSWER STAGING SMOKE BLOCKED";
const FAIL_DECISION = "PHASE 09ZB CONTROLLED LOA ANSWER STAGING SMOKE FAIL";
const EXPECTED_PASS_NEXT_TASK = "PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1";
const EXPECTED_FAIL_NEXT_TASK = "PHASE-09ZG-CONTROLLED-LOA-LIVE-PATH-INSTRUMENTATION-DIAGNOSTIC-1";
const EXPECTED_BLOCKED_TASK = "PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1";
const STAGING_BLOCKED_ACCESS = "BLOCKED_PENDING_STAGING_ACCESS";
const FETCH_TIMEOUT_MS = 20000;
const EXPECTED_SAFE_QUERIES = [
  "I received a BIR LOA, what should I do?",
  "I received a BIR eLA, what should I do?",
  "What should I do after receiving a Letter of Authority from BIR?",
  "What documents should I prepare after receiving a BIR LOA?",
  "I received a replacement eLA, what should I check first?",
  "I received a consolidated eLA, what should I do?",
  "I received a notice for presentation/submission of documents.",
  "I received a reminder before subpoena."
];

let passed = 0;
let failed = 0;
let assertions = 0;
let fx;

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

function read(relPath) {
  return readFileSync(resolve(relPath), "utf8");
}

function classifyQuery(query) {
  return classifyControlledLoaIntent(normalizeControlledLoaAnswerInput({ userQuery: query }));
}

function localGate(query) {
  return evaluateControlledLoaAskGate({
    ctx: {},
    query,
    hook: "/ask",
    env: { TINA_ENABLE_CONTROLLED_LOA_ASK_GATE: "true" }
  });
}

function textFromResponse(json, rawText) {
  if (!json || typeof json !== "object") return rawText || "";
  return [
    json.answer,
    json.message,
    json.text,
    json.response,
    json.output,
    json.result,
    json.controlledLoaAnswer ? JSON.stringify(json.controlledLoaAnswer) : "",
    Array.isArray(json.sourceCards) ? JSON.stringify(json.sourceCards) : ""
  ].filter((part) => typeof part === "string").join("\n");
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const bodyText = await res.text();
    return { res, bodyText, json: parseJsonSafe(bodyText) };
  } finally {
    clearTimeout(timer);
  }
}

function stagingHeaders(auth = true) {
  const headers = { "content-type": "application/json" };
  if (auth) {
    headers[process.env.TINA_STAGING_AUTH_HEADER_NAME] = process.env.TINA_STAGING_AUTH_HEADER_VALUE;
  }
  return headers;
}

function askBody(query) {
  return JSON.stringify({
    question: query,
    query,
    mode: "ask",
    smokePhase: EXPECTED_PATCH,
    synthetic: true
  });
}

async function postAsk(query, auth = true) {
  const url = process.env.TINA_STAGING_ASK_URL;
  return fetchWithTimeout(url, {
    method: "POST",
    headers: stagingHeaders(auth),
    body: askBody(query)
  });
}

function hasControlledMetadata(json) {
  const meta = json?.controlledLoaAnswer || json?.metadata?.controlledLoaAnswer || json?.data?.controlledLoaAnswer;
  if (meta && typeof meta === "object") return meta.controlledLoaAnswer === true || meta.phase === "09ZA";
  return false;
}

function assertSafeControlledResponse(json, rawText) {
  const text = textFromResponse(json, rawText);
  check(/procedural guidance only/i.test(text), "safe response includes procedural guidance only");
  check(/human tax\/legal review/i.test(text), "safe response includes human tax/legal review notice");
  check(/preserve .*date and manner of receipt/i.test(text), "safe response includes preserve receipt concept");
  check(/taxpayer name|taxable period|tax types|LOA\/eLA details/i.test(text), "safe response includes details-to-check concept");
  check(/verify .*LOA\/eLA|BIR verification process/i.test(text), "safe response includes LOA/eLA verification concept");
  check(/REVIE \/ LOA Verifier|LOA Verifier|REVIE/i.test(text), "safe response includes REVIE / LOA Verifier concept");
  check(/document compliance matrix/i.test(text), "safe response includes document compliance matrix concept");
  check(/controlled transmittal/i.test(text), "safe response includes controlled transmittal concept");
  check(/proof of submission|receiving proof/i.test(text), "safe response includes receiving proof concept");
  check(/do not fabricate|non-existent|not-applicable/i.test(text), "safe response includes do-not-fabricate concept");
  check(/avoid unnecessary admissions/i.test(text), "safe response includes avoid unnecessary admissions concept");
  check(/NOD\/DOD|PAN|FAN\/FLD|FDDA|CTA/i.test(text), "safe response includes NOD/PAN/FAN/FDDA/CTA watch concept");
  check(/official-source verification/i.test(text), "safe response includes official-source verification requirement");
  check(!/filing-ready|ready for filing/i.test(text), "safe response avoids filing-ready output");
  check(!/automatic submission|submit this to BIR for you|I will submit/i.test(text), "safe response avoids automatic submission");
  // Negation-aware: the safe scaffold phrasing is "no source has been
  // live-verified by this scaffold" -- a disclaimer, not a positive claim.
  // Only flag an actual positive verification claim (no preceding "no"/"not").
  check(!/verified legal citation/i.test(text), "safe response avoids verified legal citation claim");
  check(!/(?<!no )(?<!not )\bsource(?:s)? (?:has|have) been live-verified\b/i.test(text), "safe response avoids positive live-verification claim");
}

function assertNotControlledSafeAnswer(json, rawText, label) {
  const text = textFromResponse(json, rawText);
  check(!hasControlledMetadata(json), `${label} lacks controlled metadata`);
  check(!(/procedural guidance only/i.test(text) && /document compliance matrix/i.test(text) && /controlled transmittal/i.test(text)), `${label} does not return full controlled safe LOA answer`);
  check(!/filing-ready|ready for filing/i.test(text), `${label} avoids filing-ready output`);
  check(!/automatic submission|submit this to BIR for you|I will submit/i.test(text), `${label} avoids automatic submission`);
}

// 1-6. Fixture exists and core fields are valid.
await test("fixture exists, parses, and core fields match the phase contract", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture exists");
  fx = JSON.parse(read(FIXTURE_PATH));
  check(fx.patch === EXPECTED_PATCH, "fixture patch id matches");
  check(fx.phase === "09ZB", "fixture phase equals 09ZB");
  check(fx.baseCommit === "23eb7dd", "fixture baseCommit equals 23eb7dd");
  check(fx.decision === FAIL_DECISION, "fixture decision is final 09ZB FAIL");
  check(fx.liveStagingSmokeStatus === "FAIL", "fixture live staging smoke status is FAIL");
  check(fx.jwtRefreshRerun === true, "fixture records JWT refresh rerun");
  check(fx.jwtAccepted === true, "fixture records JWT accepted");
  check(fx.stagingAccessStatus === "PASS", "fixture records staging access PASS");
  check(fx.featureFlagVerified === true, "fixture records feature flag verified");
  check(fx.deploymentVerified === true, "fixture records deployment verified");
  check(fx.rerunAfter09ZH === true, "fixture records post-09ZH rerun");
  check(fx["09zhCommit"] === "571ca05", "fixture records 09ZH commit");
  check(fx["09zhPrimaryRemediationCommit"] === "cd6280f", "fixture records 09ZH primary remediation commit");
  check(fx.freshJwtAccepted === true, "fixture records fresh JWT accepted");
  check(fx.controlledLoaFlagVerified === true, "fixture records controlled LOA flag verified");
  check(fx.diagnosticFlagVerifiedDisabled === true, "fixture records 09ZG diagnostic flag disabled");
  check(fx.safeQueryPassCount === 8, "fixture records eight passing safe queries");
  check(fx.safeQueryFailCount === 0, "fixture records zero failing safe queries");
  check(fx.previouslyFailingQueryPassCount === 4, "fixture records four previously failing queries now pass");
  check(fx.excludedControlledBranchExclusionCount === 12, "fixture records all unsafe queries excluded from controlled branch");
  check(fx.excludedLegalSafetyFailCount === 3, "fixture records three unsafe legal-safety failures");
  check(fx.unrelatedTaxQueryPassCount === 8, "fixture records eight unrelated tax non-triggers");
  check(fx.nonTaxBoundaryPreserved === true, "fixture records non-tax boundary preserved");
  check(JSON.stringify(fx.passingSafeQueries) === JSON.stringify(EXPECTED_SAFE_QUERIES), "fixture records exact passing safe queries");
  check(Array.isArray(fx.failingSafeQueries) && fx.failingSafeQueries.length === 0, "fixture records no failing safe queries");
  check(fx.runtimeSecurityStatus === "PASS", "fixture records runtime/security PASS");
  check(fx.productionBoundary === "Production unchanged.", "fixture records production unchanged");
  check(fx.blockedTask === EXPECTED_BLOCKED_TASK, "fixture records 09ZC blocked");
  check(/^Resolve post-09ZH unsafe-query legal-safety wording and rerun PHASE-09ZB/.test(fx.nextTask), "fixture next task is post-09ZH legal-safety remediation rerun");
});

// 7-14. Prior artifacts and local scaffold/gate behavior.
await test("prior 09ZA artifacts and controlled LOA local gate behavior are intact", () => {
  check(existsSync(resolve("PHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1_REPORT.md")), "09ZA report exists");
  check(/PASS WITH STRICT RECOMMENDATIONS/.test(read("PHASE-09ZA-CONTROLLED-LOA-ANSWER-ASK-WIRING-IMPLEMENTATION-1_REPORT.md")), "09ZA report contains PASS decision");
  const pipeline = read(PIPELINE_PATH);
  check(/evaluateControlledLoaAskGate/.test(pipeline), "pipeline.js contains controlled LOA gate helper names");
  check(/TINA_ENABLE_CONTROLLED_LOA_ASK_GATE/.test(pipeline), "pipeline.js contains TINA_ENABLE_CONTROLLED_LOA_ASK_GATE");
  check(existsSync(resolve(SCAFFOLD_PATH)), "09Y scaffold module exists");
  check(classifyQuery("I received a BIR LOA, what should I do?").supported === true, "09Y scaffold classifies basic LOA query as supported");
  check(classifyQuery("Is my LOA invalid?").excluded === true, "09Y scaffold classifies excluded validity query as excluded");
  check(localGate("Explain EWT.").matched === false, "unrelated generic EWT query does not trigger runtime LOA gate");
});

// 15-26. Fixture matrices and boundaries.
await test("fixture matrices and safety policies cover required staging smoke scope", () => {
  check(Array.isArray(fx.safeQuerySmokeMatrix) && fx.safeQuerySmokeMatrix.length >= 8, "safe query matrix has at least 8 safe queries");
  check(Array.isArray(fx.excludedQuerySmokeMatrix) && fx.excludedQuerySmokeMatrix.length >= 12, "excluded query matrix has at least 12 excluded queries");
  check(Array.isArray(fx.unrelatedQuerySmokeMatrix) && fx.unrelatedQuerySmokeMatrix.length >= 5, "unrelated query matrix has at least 5 unrelated queries");
  const runtimeTargets = JSON.stringify(fx.runtimeSecuritySmokeMatrix);
  check(/\/health/.test(runtimeTargets), "runtime security matrix includes /health");
  check(/OPTIONS \/ask/.test(runtimeTargets), "runtime security matrix includes OPTIONS /ask");
  check(/unauthenticated POST \/ask/.test(runtimeTargets), "runtime security matrix includes unauthenticated POST /ask");
  check(fx.sourceCardPolicy.legalCitationAllowed === false, "source-card policy states legalCitationAllowed false");
  check(fx.sourceCardPolicy.sourceCardVerification === "not_performed", "source-card policy states sourceCardVerification not_performed");
  check(/production unchanged/i.test(JSON.stringify(fx.runtimeBoundary)), "runtime boundary states production unchanged");
  check(/no live authority retrieval/i.test(JSON.stringify(fx.externalOperationBoundary)), "external boundary states no live authority retrieval");
  check(/no real taxpayer data/i.test(JSON.stringify(fx.privacyBoundary)), "privacy boundary states no real taxpayer data");
  check(/no final legal conclusions/i.test(JSON.stringify(fx.legalSafetyBoundary)), "legal safety boundary states no final legal conclusions");
});

// 27-37. Report statements.
await test("report exists and contains required impact/status statements", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = read(REPORT_PATH);
  for (const statement of [
    "PHASE 09ZB CONTROLLED LOA ANSWER STAGING SMOKE FAIL",
    "All 8 safe queries returned",
    "Previously failing family now passed",
    "legal-safety scan found finality/voidness/appealability wording",
    "The non-tax boundary was preserved",
    "09ZC remains blocked.",
    "Runtime impact: Live staging smoke only.",
    "Production impact: None.",
    "Ask-handler implementation impact: None in this rerun.",
    "Pipeline implementation impact: None in this rerun.",
    "Shared boundary helper impact: None in this rerun.",
    "Feature flag impact: Existing staging controlled LOA flag only.",
    "09ZG diagnostic flag impact: Disabled.",
    "External search impact: None.",
    "Live retrieval impact: Existing normal staging behavior only.",
    "Filing-ready document impact: None.",
    "Automatic submission impact: None."
  ]) {
    check(report.includes(statement), `report states ${statement}`);
  }
  check(/Live staging LOA \/ask behavior verified: (PASS|FAIL|BLOCKED_PENDING_STAGING_ACCESS|BLOCKED_PENDING_STAGING_FLAG|BLOCKED_PENDING_STAGING_DEPLOY)/.test(report), "report has live staging status");
});

// 38-42. Static scans for changed files, external operations, taxpayer data, and final-conclusion prose.
await test("static scan confirms allowed file scope and no new external-operation implementation", () => {
  const diffNames = execSync("git diff --name-only", { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const allowed = new Set([FIXTURE_PATH, REPORT_PATH, "tests/phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs", CURRENT_STATE_PATH]);
  for (const file of diffNames) {
    check(allowed.has(file), `changed file is allowed for 09ZB: ${file}`);
  }

  const added = execSync("git diff -- " + [...allowed].map((file) => `"${file}"`).join(" "), { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  check(!/\b(openai|supabase|google drive|n8n|firecrawl|crawlee|mcp|ocr|tesseract)\s*\(/i.test(added), "no new third-party service calls added");
  check(!/\b(scrape|download|ingest|embed|insert into|upsert|database write)\s*\(/i.test(added), "no external authority retrieval/scraping/download/ingestion/embedding/database write implementation");
  const evidenceText = [read(FIXTURE_PATH), read(REPORT_PATH)].join("\n");
  check(!/TRUE FREIGHT|ALL ECARS|SOCIAL HOMES|AUDM\d|008-826-456|010-841-602|005-055-069/i.test(evidenceText), "no real taxpayer data in fixture/report");
  check(!/this loa is invalid|this ela is void|you can ignore the loa|you will win|this protest will succeed|ready for filing/i.test(evidenceText), "no prohibited final legal conclusion phrases in report/fixture");
});

// 43-44. CURRENT_STATE.
await test("CURRENT_STATE contains 09ZB entry and next/rerun state", () => {
  const currentState = read(CURRENT_STATE_PATH);
  check(/PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1/.test(currentState), "CURRENT_STATE.md contains 09ZB staging smoke entry");
  check(/PHASE 09ZB CONTROLLED LOA ANSWER STAGING SMOKE FAIL/.test(currentState), "CURRENT_STATE.md contains final 09ZB FAIL decision");
  check(/post-09ZH live staging rerun completed/i.test(currentState), "CURRENT_STATE.md contains post-09ZH rerun entry");
  check(/legal-safety wording/i.test(currentState), "CURRENT_STATE.md records legal-safety wording failure");
  check(/09ZC:\s*\nBlocked\./.test(currentState), "CURRENT_STATE.md states 09ZC blocked");
});

// Optional live staging smoke, assertions 45-75 when enabled.
await test("optional live staging smoke is skipped unless explicitly enabled", async () => {
  if (!LIVE_SMOKE_EXPLICITLY_REQUESTED) {
    console.log("SKIP live staging smoke: set RUN_TINA_STAGING_SMOKE=true and RUN_TINA_09ZB_LIVE_SMOKE=true in the process environment with TINA_STAGING_ASK_URL and auth header env vars to run.");
    check(true, "live staging smoke skipped by default");
    return;
  }

  if (!process.env.TINA_STAGING_ASK_URL || !process.env.TINA_STAGING_AUTH_HEADER_NAME || !process.env.TINA_STAGING_AUTH_HEADER_VALUE) {
    throw new Error(STAGING_BLOCKED_ACCESS);
  }
  if (/production|prod/i.test(process.env.TINA_STAGING_ASK_URL)) {
    throw new Error("Refusing to run 09ZB smoke against a URL that appears to be production.");
  }

  const safeMain = await postAsk("I received a BIR LOA, what should I do?");
  check(safeMain.res.status >= 200 && safeMain.res.status < 300, "staging safe LOA query returns 2xx");
  check(safeMain.json && safeMain.json.responseType === "controlled_loa_answer", "primary safe query triggers controlled LOA branch");
  assertSafeControlledResponse(safeMain.json, safeMain.bodyText);

  // Full mandated 8-query safe LOA/eLA smoke matrix. Some of these are
  // expected to fail to trigger the controlled branch on live staging
  // because of a pre-existing, out-of-scope domain-boundary check in
  // pipeline.js that runs before the Step 12.65 gate and rejects queries
  // that lack a recognizable Philippine-tax/BIR keyword. Each query is
  // checked independently so the real pass/fail split is visible in the
  // test log rather than masked by a single aggregate assertion.
  const safeMatrixResults = [];
  for (const query of [
    "I received a BIR eLA, what should I do?",
    "What should I do after receiving a Letter of Authority from BIR?",
    "What documents should I prepare after receiving a BIR LOA?",
    "I received a replacement eLA, what should I check first?",
    "I received a consolidated eLA, what should I do?",
    "I received a notice for presentation/submission of documents.",
    "I received a reminder before subpoena."
  ]) {
    const response = await postAsk(query);
    const triggered = response.json && response.json.responseType === "controlled_loa_answer";
    safeMatrixResults.push({ query, status: response.res.status, triggered });
    check(response.res.status >= 200 && response.res.status < 300, `safe variant returns 2xx: ${query}`);
    check(triggered, `safe variant triggers controlled LOA branch: ${query}`);
    if (triggered) {
      assertSafeControlledResponse(response.json, response.bodyText);
    }
  }
  console.log("SAFE_MATRIX_RESULTS", JSON.stringify(safeMatrixResults));

  // Full mandated 12-query excluded/unsafe matrix.
  for (const [query, label] of [
    ["Is my LOA invalid?", "invalidity query"],
    ["Is this eLA void?", "eLA voidness query"],
    ["Can I ignore the LOA?", "ignore-LOA query"],
    ["Can the BIR assess me?", "assessment-outcome query"],
    ["Is the assessment final?", "assessment-finality query"],
    ["Should I appeal to CTA?", "CTA appeal strategy query"],
    ["Is the FAN void?", "FAN voidness query"],
    ["Is the FDDA appealable?", "FDDA appealability query"],
    ["Will I win?", "case-outcome query"],
    ["Can you draft the protest now?", "filing-ready protest query"],
    ["Can you submit this to BIR?", "automatic submission query"],
    ["Give me a final legal opinion on this LOA.", "final legal opinion query"]
  ]) {
    const response = await postAsk(query);
    check(response.res.status < 500, `${label} returns non-5xx`);
    assertNotControlledSafeAnswer(response.json, response.bodyText, label);
  }

  // Full mandated 8-query unrelated matrix.
  for (const [query, label] of [
    ["Explain EWT.", "unrelated EWT query"],
    ["Is lease subject to withholding tax in the Philippines?", "unrelated lease withholding query"],
    ["What is percentage tax?", "unrelated percentage tax query"],
    ["What is VAT-exempt sale?", "unrelated VAT query"],
    ["What is estate tax?", "unrelated estate tax query"],
    ["What are the rules on withholding tax on professional fees?", "unrelated professional-fee withholding query"],
    ["How to compute percentage tax?", "unrelated percentage-tax computation query"],
    ["Is sale of fresh frozen seafood VAT exempt?", "unrelated frozen-seafood VAT query"]
  ]) {
    const response = await postAsk(query);
    check(response.res.status < 500, `${label} returns non-5xx`);
    assertNotControlledSafeAnswer(response.json, response.bodyText, label);
  }

  const askUrl = new URL(process.env.TINA_STAGING_ASK_URL);
  const health = await fetchWithTimeout(`${askUrl.origin}/health`, { method: "GET" });
  check(health.res.status >= 200 && health.res.status < 500, "staging /health returns expected response");

  const optionsAsk = await fetchWithTimeout(process.env.TINA_STAGING_ASK_URL, { method: "OPTIONS" });
  check(optionsAsk.res.status < 500, "staging OPTIONS /ask remains normal");

  const unauth = await postAsk("I received a BIR LOA, what should I do?", false);
  check([401, 403].includes(unauth.res.status) || unauth.res.status >= 400, "staging unauthenticated POST /ask preserves auth behavior");

  const routesInventory = await fetchWithTimeout(`${askUrl.origin}/routes`, { method: "GET" });
  check(routesInventory.res.status === 404 || routesInventory.res.status === 401 || routesInventory.res.status === 403, "staging route inventory remains protected or not exposed");
});

console.log(`\n${EXPECTED_PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
