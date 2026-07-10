// FILE: tests/phase-09zh-controlled-loa-live-path-remediation-1.test.mjs
// PHASE-09ZH-CONTROLLED-LOA-LIVE-PATH-REMEDIATION-1
//
// Local/static/pure by default. Directly unit-tests the shared audit-
// procedure boundary helper (pure, no side effects) and statically scans
// ask-handler.js/pipeline.js for correct wiring. Does not import ask-handler.js
// (which constructs Supabase/OpenAI clients at module scope) or call staging.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  detectPhilippineTaxBoundary,
  evaluateControlledLoaAskGate
} from "../pipeline.js";
import {
  CONTROLLED_LOA_AUDIT_PROCEDURE_BOUNDARY_PATTERNS,
  isControlledLoaAuditProcedureBoundaryCandidate,
  applyControlledLoaAuditProcedureBoundaryOverlay
} from "../services/controlled-loa-audit-procedure-boundary.js";

const PATCH = "PHASE-09ZH-CONTROLLED-LOA-LIVE-PATH-REMEDIATION-1";
const PHASE = "09ZH";
const BASE_COMMIT = "42bfcab";
const DECISION = "PHASE 09ZH CONTROLLED LOA LIVE PATH REMEDIATION PASS WITH STRICT RECOMMENDATIONS";
const NEXT_TASK = "PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1-RERUN-AFTER-09ZH";
const FIXTURE_PATH = "evaluation/fixtures/phase-09zh-controlled-loa-live-path-remediation-1.fixture.json";
const REPORT_PATH = "PHASE-09ZH-CONTROLLED-LOA-LIVE-PATH-REMEDIATION-1_REPORT.md";
const PIPELINE_PATH = "pipeline.js";
const ASK_HANDLER_PATH = "ask-handler.js";
const SHARED_MODULE_PATH = "services/controlled-loa-audit-procedure-boundary.js";
const CURRENT_STATE_PATH = "knowledge/CURRENT_STATE.md";

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

function controlledGate(query) {
  return evaluateControlledLoaAskGate({ ctx: {}, query, hook: "/ask", env: enabledEnv() });
}

function diffNames() {
  return execSync("git diff --name-only", { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function addedLinesFor(file) {
  return execSync(`git diff -- "${file}"`, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 })
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n");
}

function hasNoForbiddenRuntimeUsage(source) {
  const forbiddenPackagePattern =
    /\b(?:import\s+.*from\s+|require\()\s*["'](?:openai|@supabase\/[^"']*|firecrawl|crawlee|@modelcontextprotocol\/[^"']*|n8n|tesseract\.js|node-tesseract)["']/i;
  const networkCallPattern = /\bfetch\s*\(|\baxios\s*\(|\bhttp\.request\s*\(|\bhttps\.request\s*\(|\bXMLHttpRequest\s*\(/i;
  const dbWritePattern = /\.insert\s*\(|\.upsert\s*\(|\binsert\s+into\b/i;
  const modelCallPattern = /\bopenai\.chat|\bcompletions\.create\s*\(|\bmodel\s*\.\s*call\s*\(/i;
  return !forbiddenPackagePattern.test(source) &&
    !networkCallPattern.test(source) &&
    !dbWritePattern.test(source) &&
    !modelCallPattern.test(source);
}

const safeQueries = [
  "I received a BIR LOA, what should I do?",
  "I received a BIR eLA, what should I do?",
  "What should I do after receiving a Letter of Authority from BIR?",
  "What documents should I prepare after receiving a BIR LOA?",
  "I received a replacement eLA, what should I check first?",
  "I received a consolidated eLA, what should I do?",
  "I received a notice for presentation/submission of documents.",
  "I received a reminder before subpoena."
];

const previouslyRejected = safeQueries.slice(4);

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

const unrelatedQueries = [
  "Explain EWT.",
  "Is lease subject to withholding tax in the Philippines?",
  "What is percentage tax?",
  "What is VAT-exempt sale?",
  "What is estate tax?",
  "What are the rules on withholding tax on professional fees?",
  "How to compute percentage tax?",
  "Is sale of fresh frozen seafood VAT exempt?"
];

let fx;

await test("fixture exists, is valid JSON, and matches core metadata", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture exists");
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(fx.patch === PATCH, "fixture patch id");
  check(fx.phase === PHASE, "fixture phase is 09ZH");
  check(fx.baseCommit === BASE_COMMIT, "fixture baseCommit is 42bfcab");
  check(/upstream Philippine-tax domain-boundary check uses the base detector/i.test(fx.provenRootCause), "fixture provenRootCause matches 09ZG evidence");
  check(fx.decision === DECISION, "fixture decision is PASS WITH STRICT RECOMMENDATIONS");
  check(fx.nextTask === NEXT_TASK, "fixture nextTask is 09ZB rerun after 09ZH");
});

await test("shared audit-procedure boundary module exists and is used by both ask-handler.js and pipeline.js", () => {
  check(existsSync(resolve(SHARED_MODULE_PATH)), "shared module exists");
  const pipelineSrc = readFileSync(resolve(PIPELINE_PATH), "utf8");
  const askHandlerSrc = readFileSync(resolve(ASK_HANDLER_PATH), "utf8");
  check(/from ["']\.\/services\/controlled-loa-audit-procedure-boundary\.js["']/.test(pipelineSrc), "pipeline.js imports the shared module");
  check(/from ["']\.\/services\/controlled-loa-audit-procedure-boundary\.js["']/.test(askHandlerSrc), "ask-handler.js imports the shared module");
  check(/applyControlledLoaAuditProcedureBoundaryOverlay/.test(pipelineSrc), "pipeline.js uses applyControlledLoaAuditProcedureBoundaryOverlay");
  check(/applyControlledLoaAuditProcedureBoundaryOverlay/.test(askHandlerSrc), "ask-handler.js uses applyControlledLoaAuditProcedureBoundaryOverlay");
});

await test("no separate duplicate audit-procedure keyword list remains in either file", () => {
  const pipelineSrc = readFileSync(resolve(PIPELINE_PATH), "utf8");
  const askHandlerSrc = readFileSync(resolve(ASK_HANDLER_PATH), "utf8");
  check(!/const\s+CONTROLLED_LOA_AUDIT_PROCEDURE_BOUNDARY_PATTERNS\s*=/.test(pipelineSrc), "pipeline.js does not declare its own copy of the pattern list");
  check(!/const\s+CONTROLLED_LOA_AUDIT_PROCEDURE_BOUNDARY_PATTERNS\s*=/.test(askHandlerSrc), "ask-handler.js does not declare its own copy of the pattern list");
  check(!/replacement\\s\+e-\?la/.test(askHandlerSrc), "ask-handler.js has no independently duplicated replacement-eLA regex literal");
});

await test("ask-handler.js preserves the base domain-boundary rejection path and does not build a controlled answer", () => {
  const askHandlerSrc = readFileSync(resolve(ASK_HANDLER_PATH), "utf8");
  check(/detectPhilippineTaxBoundary\(/.test(askHandlerSrc), "ask-handler.js still calls detectPhilippineTaxBoundary");
  check(/routeKind:\s*["']DOMAIN_BOUNDARY["']/.test(askHandlerSrc), "ask-handler.js still returns routeKind DOMAIN_BOUNDARY on true rejection");
  check(!/buildControlledLoaAskEarlyExitResponse/.test(askHandlerSrc), "ask-handler.js does not call buildControlledLoaAskEarlyExitResponse");
  check(!/responseType:\s*["']controlled_loa_answer["']/.test(askHandlerSrc), "ask-handler.js does not hardcode responseType controlled_loa_answer");
  check(!/evaluateControlledLoaAskGate\s*\(/.test(askHandlerSrc), "ask-handler.js does not call evaluateControlledLoaAskGate directly");
});

await test("pipeline.js retains evaluateControlledLoaAskGate and Step 12.65 as the final gate", () => {
  const pipelineSrc = readFileSync(resolve(PIPELINE_PATH), "utf8");
  check(/evaluateControlledLoaAskGate/.test(pipelineSrc), "pipeline.js contains evaluateControlledLoaAskGate");
  check(/Step 12\.65/.test(pipelineSrc), "pipeline.js contains Step 12.65 marker");
  check(/PHASE-09ZH-CONTROLLED-LOA-LIVE-PATH-REMEDIATION-1/.test(pipelineSrc), "pipeline.js contains the 09ZH source marker");
});

await test("shared module: candidate detector recognizes the four previously-rejected phrasings upstream", () => {
  check(isControlledLoaAuditProcedureBoundaryCandidate("I received a replacement eLA, what should I check first?"), "replacement eLA is a candidate");
  check(isControlledLoaAuditProcedureBoundaryCandidate("I received a consolidated eLA, what should I do?"), "consolidated eLA is a candidate");
  check(isControlledLoaAuditProcedureBoundaryCandidate("I received a notice for presentation/submission of documents."), "notice for presentation/submission is a candidate");
  check(isControlledLoaAuditProcedureBoundaryCandidate("I received a reminder before subpoena."), "reminder before subpoena is a candidate");
});

await test("shared module: baseline BIR-worded queries do not need the overlay to pass the base detector", () => {
  check(detectPhilippineTaxBoundary(safeQueries[0], "/ask").decision === "ALLOW", "baseline BIR LOA query allowed");
  check(detectPhilippineTaxBoundary(safeQueries[1], "/ask").decision === "ALLOW", "baseline BIR eLA query allowed");
});

await test("shared module: overlay converts a rejecting base decision to ALLOW only for candidates, on /ask", () => {
  const rejected = { decision: "REJECT" };
  const allowedResult = applyControlledLoaAuditProcedureBoundaryOverlay(rejected, "I received a reminder before subpoena.", "/ask");
  check(allowedResult.decision === "ALLOW", "overlay allows a matching candidate");
  check(allowedResult.detectedDomain === "PHILIPPINE_TAX_AUDIT_PROCEDURE", "overlay sets detectedDomain");
  const stillRejected = applyControlledLoaAuditProcedureBoundaryOverlay(rejected, "Explain EWT.", "/ask");
  check(stillRejected.decision === "REJECT", "overlay does not allow a non-candidate");
  const nonAskRoute = applyControlledLoaAuditProcedureBoundaryOverlay(rejected, "I received a reminder before subpoena.", "/audit");
  check(nonAskRoute.decision === "REJECT", "overlay only applies on /ask route");
  const alreadyAllowed = { decision: "ALLOW", reason: "already_ok" };
  check(applyControlledLoaAuditProcedureBoundaryOverlay(alreadyAllowed, "anything", "/ask") === alreadyAllowed, "overlay is a no-op when base decision already ALLOW");
});

await test("all eight safe queries pass the boundary and match the controlled LOA gate", () => {
  for (const query of safeQueries) {
    const boundary = detectPhilippineTaxBoundary(query, "/ask");
    const gate = controlledGate(query);
    check(boundary.decision === "ALLOW" && boundary.isPhilippineTax === true, `boundary allows ${query}`);
    check(gate.matched === true, `controlled gate matches ${query}`);
    check(gate.earlyExitResponse?.responseType === "controlled_loa_answer", `controlled_loa_answer response type for ${query}`);
  }
});

await test("previously rejected queries are now boundary-eligible", () => {
  for (const query of previouslyRejected) {
    check(detectPhilippineTaxBoundary(query, "/ask").decision === "ALLOW", `previously rejected query now allowed at boundary: ${query}`);
  }
});

await test("each of the 12 excluded queries individually remains excluded from the safe controlled answer", () => {
  const labeled = {
    invalidity: "Is my LOA invalid?",
    voidness: "Is this eLA void?",
    ignore: "Can I ignore the LOA?",
    assessmentPower: "Can the BIR assess me?",
    finality: "Is the assessment final?",
    cta: "Should I appeal to CTA?",
    fan: "Is the FAN void?",
    fdda: "Is the FDDA appealable?",
    outcomePrediction: "Will I win?",
    draftProtest: "Can you draft the protest now?",
    birSubmission: "Can you submit this to BIR?",
    finalLegalOpinion: "Give me a final legal opinion on this LOA."
  };
  for (const [label, query] of Object.entries(labeled)) {
    check(excludedQueries.includes(query), `excluded matrix includes ${label}`);
    const gate = controlledGate(query);
    check(gate.matched === false, `excluded query (${label}) not converted to safe controlled help: ${query}`);
    check(gate.earlyExitResponse === null, `excluded query (${label}) has no early exit: ${query}`);
  }
});

await test("unrelated tax queries do not become LOA candidates and do not trigger the controlled branch", () => {
  const labeled = {
    ewt: "Explain EWT.",
    leaseWithholding: "Is lease subject to withholding tax in the Philippines?",
    percentageTax: "What is percentage tax?",
    vatExempt: "What is VAT-exempt sale?",
    estateTax: "What is estate tax?",
    professionalFeesWithholding: "What are the rules on withholding tax on professional fees?",
    computePercentageTax: "How to compute percentage tax?",
    frozenSeafoodVat: "Is sale of fresh frozen seafood VAT exempt?"
  };
  for (const [label, query] of Object.entries(labeled)) {
    check(unrelatedQueries.includes(query), `unrelated matrix includes ${label}`);
    check(isControlledLoaAuditProcedureBoundaryCandidate(query) === false, `unrelated query (${label}) is not an LOA candidate: ${query}`);
    check(controlledGate(query).matched === false, `unrelated query (${label}) does not trigger controlled LOA branch: ${query}`);
  }
});

await test("truly unrelated non-tax query remains boundary-rejectable", () => {
  const nonTax = "What is the capital of France?";
  check(isControlledLoaAuditProcedureBoundaryCandidate(nonTax) === false, "non-tax query is not an LOA candidate");
  const boundary = detectPhilippineTaxBoundary(nonTax, "/ask");
  check(boundary.decision !== "ALLOW", "non-tax query is not allowed by the boundary");
});

await test("no hardcoded answer text or exact full-query string switching for the four previously failing queries", () => {
  const askHandlerAdded = addedLinesFor(ASK_HANDLER_PATH);
  const pipelineAdded = addedLinesFor(PIPELINE_PATH);
  const sharedModuleContent = readFileSync(resolve(SHARED_MODULE_PATH), "utf8");
  for (const query of previouslyRejected) {
    check(!askHandlerAdded.includes(query), `ask-handler.js added lines do not hardcode: ${query}`);
    check(!pipelineAdded.includes(query), `pipeline.js added lines do not hardcode: ${query}`);
    check(!sharedModuleContent.includes(query), `shared module does not hardcode: ${query}`);
  }
});

await test("no external operation, DB write, or model call introduced in the shared module or diffs", () => {
  const sharedModuleContent = readFileSync(resolve(SHARED_MODULE_PATH), "utf8");
  check(hasNoForbiddenRuntimeUsage(sharedModuleContent), "shared module has no forbidden runtime usage");
  check(hasNoForbiddenRuntimeUsage(addedLinesFor(ASK_HANDLER_PATH)), "ask-handler.js added lines have no forbidden runtime usage");
  check(hasNoForbiddenRuntimeUsage(addedLinesFor(PIPELINE_PATH)), "pipeline.js added lines have no forbidden runtime usage");
  check(!/google.?drive/i.test(sharedModuleContent), "no Google Drive operation in shared module");
  check(!/\bn8n\b/i.test(sharedModuleContent), "no n8n operation in shared module");
  check(!/firecrawl|crawlee/i.test(sharedModuleContent), "no Firecrawl/Crawlee operation in shared module");
  check(!/modelcontextprotocol|\bmcp\b/i.test(sharedModuleContent), "no MCP operation in shared module");
  check(!/tesseract|\bocr\(/i.test(sharedModuleContent), "no OCR operation in shared module");
  check(!/sourceCardFromRetrievedTarget|sourceCards\.push/.test(sharedModuleContent), "shared module does not generate source cards");
});

await test("source-card and legal-safety metadata remain locked down on the controlled branch", () => {
  const response = controlledGate("I received a replacement eLA, what should I check first?").earlyExitResponse;
  check(Array.isArray(response.sourceCards) && response.sourceCards.length === 0, "sourceCards empty");
  check(response.controlledLoaAnswer.legalCitationAllowed === false, "legalCitationAllowed false");
  check(response.controlledLoaAnswer.sourceCardVerification === "not_performed", "sourceCardVerification not_performed");
  check(response.controlledLoaAnswer.filingReadyDocumentGenerated === false, "filingReadyDocumentGenerated false");
  check(response.controlledLoaAnswer.automaticSubmission === false, "automaticSubmission false");
});

await test("09ZG diagnostic flag remains default false and production activation is absent", () => {
  const pipelineSrc = readFileSync(resolve(PIPELINE_PATH), "utf8");
  check(/isControlledLoaLivePathDiagnosticEnabled/.test(pipelineSrc), "pipeline.js still gates 09ZG diagnostics behind the helper");
  check(!/TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC\s*[:=]\s*["']?true["']?/.test(pipelineSrc), "09ZG diagnostic flag is not hardcoded true anywhere");
  check(!/RENDER_|render\.com/i.test(addedLinesFor(PIPELINE_PATH) + addedLinesFor(ASK_HANDLER_PATH)), "no production/Render config introduced");
});

await test("report exists and contains required impact statements", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  const required = [
    DECISION,
    "Runtime impact: Narrow upstream domain-boundary remediation only.",
    "Answer-content impact: None.",
    "Controlled LOA final-gate impact: None; evaluateControlledLoaAskGate remains authoritative.",
    "Ask-handler impact: Safe audit-procedure candidates may continue to the existing pipeline instead of being prematurely rejected.",
    "Pipeline impact: Uses the same shared audit-procedure boundary rule.",
    "Route impact: None.",
    "Server impact: None.",
    "Auth impact: None.",
    "Feature flag impact: Existing controlled LOA staging flag only.",
    "09ZG diagnostic flag impact: Remains disabled.",
    "Memory impact: None.",
    "Persistence impact: None.",
    "External search impact: None.",
    "Live retrieval impact: None added.",
    "Scraping/download/ingestion impact: None.",
    "Database/embedding impact: None.",
    "OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.",
    "Source-card impact: None.",
    "Legal-citation impact: None.",
    "Filing-ready document impact: None.",
    "Automatic submission impact: None.",
    "Production impact: None.",
    "09ZB live staging rerun remains required.",
    "09ZC remains blocked until the 09ZB rerun passes."
  ];
  for (const phrase of required) check(report.includes(phrase), `report contains: ${phrase}`);
});

await test("CURRENT_STATE.md contains 09ZH completion and states 09ZB rerun as next task", () => {
  const current = readFileSync(resolve(CURRENT_STATE_PATH), "utf8");
  check(current.includes(`${PATCH} completed.`), "CURRENT_STATE contains 09ZH completion entry");
  check(current.includes(NEXT_TASK), "CURRENT_STATE states 09ZB rerun after 09ZH as next task");
  check(current.includes("PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1"), "CURRENT_STATE references 09ZC gate");
});

await test("no disallowed runtime, package, env, database, frontend, or production files changed", () => {
  const changed = diffNames();
  const allowed = new Set([
    ASK_HANDLER_PATH,
    PIPELINE_PATH,
    SHARED_MODULE_PATH,
    FIXTURE_PATH,
    "tests/phase-09zh-controlled-loa-live-path-remediation-1.test.mjs",
    REPORT_PATH,
    CURRENT_STATE_PATH,
    "tests/phase-09ze-controlled-loa-domain-boundary-remediation-1.test.mjs"
  ]);
  for (const name of changed) check(allowed.has(name), `changed file is allowed: ${name}`);
  for (const forbidden of ["server.js", "package.json", "package-lock.json", ".env"]) {
    check(!changed.includes(forbidden), `${forbidden} unchanged`);
  }
  check(!changed.some((name) => /^routes\//i.test(name)), "no route file changed");
  check(!changed.some((name) => /^auth/i.test(name)), "no auth file changed");
  check(!changed.some((name) => /supabase|migration|database|embedding/i.test(name)), "no DB/embedding file changed");
  check(!changed.some((name) => /frontend|public|production|deploy/i.test(name)), "no frontend/production file changed");
  check(!changed.includes("diagnostics/controlled-loa-live-path-trace.js"), "09ZG diagnostics module unchanged");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
