// FILE: tests/phase-09ze-controlled-loa-domain-boundary-remediation-1.test.mjs
// PHASE-09ZE-CONTROLLED-LOA-DOMAIN-BOUNDARY-REMEDIATION-1

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  detectPhilippineTaxBoundary,
  evaluateControlledLoaAskGate
} from "../pipeline.js";

const PATCH = "PHASE-09ZE-CONTROLLED-LOA-DOMAIN-BOUNDARY-REMEDIATION-1";
const PHASE = "09ZE";
const BASE_COMMIT = "30c1cbb";
const DECISION = "PHASE 09ZE CONTROLLED LOA DOMAIN BOUNDARY REMEDIATION PASS WITH STRICT RECOMMENDATIONS";
const NEXT_TASK = "PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1-RERUN";
const FIXTURE_PATH = "evaluation/fixtures/phase-09ze-controlled-loa-domain-boundary-remediation-1.fixture.json";
const REPORT_PATH = "PHASE-09ZE-CONTROLLED-LOA-DOMAIN-BOUNDARY-REMEDIATION-1_REPORT.md";
const PIPELINE_PATH = "pipeline.js";
const CURRENT_STATE_PATH = "knowledge/CURRENT_STATE.md";
// PHASE-09ZH-CONTROLLED-LOA-LIVE-PATH-REMEDIATION-1 moved the narrow
// audit-procedure pattern list out of pipeline.js into this shared module so
// ask-handler.js's upstream boundary check and pipeline.js's boundary check
// use one rule. The patterns still exist and are still reachable -- just
// from a shared file instead of duplicated inline.
const AUDIT_PROCEDURE_BOUNDARY_MODULE_PATH = "services/controlled-loa-audit-procedure-boundary.js";

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
  const browserAutomationPattern = /\bpuppeteer\.|\bplaywright\./i;
  const embeddingPattern = /\bembeddings?\.create\s*\(|\bcreateEmbedding\s*\(|\bvectorSearch\s*\(/i;
  const dbWritePattern = /\.insert\s*\(|\.upsert\s*\(|\binsert\s+into\b/i;
  const modelCallPattern = /\bopenai\.chat|\bcompletions\.create\s*\(|\bmodel\s*\.\s*call\s*\(/i;
  return !forbiddenPackagePattern.test(source) &&
    !networkCallPattern.test(source) &&
    !browserAutomationPattern.test(source) &&
    !embeddingPattern.test(source) &&
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

const previouslyFailed = safeQueries.slice(4);

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

await test("fixture exists and core metadata is correct", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture exists");
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(fx.patch === PATCH, "fixture patch id");
  check(fx.phase === PHASE, "fixture phase");
  check(fx.baseCommit === BASE_COMMIT, "fixture baseCommit");
  check(fx.decision === DECISION, "fixture decision");
  check(fx.nextTask === NEXT_TASK, "fixture nextTask");
  check(/detectPhilippineTaxBoundary\(\).*before Step 12\.65/.test(fx.rootCause), "fixture rootCause mentions detectPhilippineTaxBoundary before Step 12.65");
});

await test("fixture lists all four previously failing safe queries", () => {
  check(Array.isArray(fx.safeQueriesPreviouslyFailed), "safeQueriesPreviouslyFailed is an array");
  check(fx.safeQueriesPreviouslyFailed.length === 4, "safeQueriesPreviouslyFailed has exactly four entries");
  for (const query of previouslyFailed) {
    check(fx.safeQueriesPreviouslyFailed.includes(query), `fixture includes ${query}`);
  }
});

await test("pipeline keeps Step 12.65 controlled LOA gate and feature flag markers", () => {
  const src = readFileSync(resolve(PIPELINE_PATH), "utf8");
  check(existsSync(resolve(PIPELINE_PATH)), "pipeline.js exists");
  check(/Step 12\.65/.test(src), "pipeline contains Step 12.65 marker");
  check(/evaluateControlledLoaAskGate/.test(src), "pipeline contains evaluateControlledLoaAskGate");
  check(/TINA_ENABLE_CONTROLLED_LOA_ASK_GATE/.test(src), "pipeline contains TINA_ENABLE_CONTROLLED_LOA_ASK_GATE");
});

await test("pipeline (or the shared audit-procedure boundary module) contains the chosen narrow signals", () => {
  const pipelineSrc = readFileSync(resolve(PIPELINE_PATH), "utf8");
  const sharedModulePath = resolve(AUDIT_PROCEDURE_BOUNDARY_MODULE_PATH);
  const sharedSrc = existsSync(sharedModulePath) ? readFileSync(sharedModulePath, "utf8") : "";
  const src = pipelineSrc + "\n" + sharedSrc;
  check(/CONTROLLED_LOA_AUDIT_PROCEDURE_BOUNDARY_PATTERNS/.test(src), "narrow boundary signal list is reachable from pipeline.js or the shared module");
  check(/replacement\\s\+e-\?la/.test(src), "boundary includes replacement eLA");
  check(/consolidated\\s\+e-\?la/.test(src), "boundary includes consolidated eLA");
  check(/notice\\s\+for\\s\+presentation/.test(src), "boundary includes notice for presentation");
  check(/presentation\\\/submission\\s\+of\\s\+documents/.test(src), "boundary includes presentation/submission of documents");
  check(/reminder\\s\+before\\s\+subpoena/.test(src), "boundary includes reminder before subpoena");
  check(/pre-subpoena/.test(src), "boundary includes pre-subpoena");
  check(/subpoena\\s\+duces\\s\+tecum/.test(src), "boundary includes subpoena duces tecum");
  check(/\\bTVN\\b|tax\\s\+verification\\s\+notice/i.test(src), "boundary includes TVN or tax verification notice");
  check(/mission\\s\+order/.test(src), "boundary includes mission order");
});

await test("all safe queries are boundary-eligible and controlled-gate eligible", () => {
  for (const query of safeQueries) {
    const boundary = detectPhilippineTaxBoundary(query, "/ask");
    const gate = controlledGate(query);
    check(boundary.decision === "ALLOW" && boundary.isPhilippineTax === true, `boundary allows ${query}`);
    check(gate.matched === true, `controlled gate matches ${query}`);
    check(gate.earlyExitResponse?.responseType === "controlled_loa_answer", `controlled response type for ${query}`);
  }
});

await test("previously failing safe queries now pass boundary and controlled gate", () => {
  for (const query of previouslyFailed) {
    const boundary = detectPhilippineTaxBoundary(query, "/ask");
    const gate = controlledGate(query);
    check(boundary.decision === "ALLOW", `previously failing boundary now allows ${query}`);
    check(gate.matched === true, `previously failing controlled gate now matches ${query}`);
  }
});

await test("excluded unsafe queries do not receive the controlled safe LOA answer", () => {
  for (const query of excludedQueries) {
    const gate = controlledGate(query);
    check(gate.matched === false, `excluded query is not controlled safe answer: ${query}`);
    check(gate.earlyExitResponse === null, `excluded query has no early exit: ${query}`);
  }
});

await test("unrelated tax queries do not trigger the controlled LOA branch", () => {
  for (const query of unrelatedQueries) {
    const gate = controlledGate(query);
    check(gate.matched === false, `unrelated query does not trigger controlled LOA branch: ${query}`);
  }
});

await test("source-card and legal-safety metadata remain locked down", () => {
  const response = controlledGate("I received a replacement eLA, what should I check first?").earlyExitResponse;
  check(Array.isArray(response.sourceCards) && response.sourceCards.length === 0, "sourceCards empty");
  check(response.controlledLoaAnswer.legalCitationAllowed === false, "legalCitationAllowed false");
  check(response.controlledLoaAnswer.sourceCardVerification === "not_performed", "sourceCardVerification not_performed");
  check(response.controlledLoaAnswer.filingReadyDocumentGenerated === false, "filingReadyDocumentGenerated false");
  check(response.controlledLoaAnswer.automaticSubmission === false, "automaticSubmission false");
});

await test("static scan confirms no external operation implementation was added", () => {
  const addedPipeline = addedLinesFor(PIPELINE_PATH);
  check(hasNoForbiddenRuntimeUsage(addedPipeline), "pipeline added lines contain no forbidden runtime usage");
  check(!/filingReadyDocumentGenerated:\s*true/.test(addedPipeline), "no filing-ready generation introduced");
  check(!/automaticSubmission:\s*true/.test(addedPipeline), "no automatic submission introduced");
  check(!/\bscrape\s*\(|\bdownload\s*\(|\bingest\s*\(/i.test(addedPipeline), "no scraping/download/ingestion call introduced");
});

await test("no disallowed runtime, package, env, database, frontend, or production files changed", () => {
  const changed = diffNames();
  const allowed = new Set([
    "pipeline.js",
    FIXTURE_PATH,
    "tests/phase-09ze-controlled-loa-domain-boundary-remediation-1.test.mjs",
    REPORT_PATH,
    CURRENT_STATE_PATH
  ]);
  for (const name of changed) check(allowed.has(name), `changed file is allowed: ${name}`);
  for (const forbidden of ["server.js", "ask-handler.js", "package.json", "package-lock.json", ".env"]) {
    check(!changed.includes(forbidden), `${forbidden} unchanged`);
  }
  check(!changed.some((name) => /^routes\//i.test(name)), "no route file changed");
  check(!changed.some((name) => /auth/i.test(name)), "no auth file changed");
  check(!changed.some((name) => /supabase|migration|database|embedding/i.test(name)), "no DB/embedding file changed");
  check(!changed.some((name) => /frontend|public|production|deploy/i.test(name)), "no frontend/production file changed");
});

await test("report exists and contains required impact statements", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  const required = [
    DECISION,
    "Runtime impact: Controlled domain-boundary remediation only.",
    "Ask-handler impact: None.",
    "Pipeline impact: Controlled domain-boundary remediation only.",
    "Route impact: None.",
    "Server impact: None.",
    "Feature flag impact: None.",
    "Memory impact: None.",
    "Persistence impact: None.",
    "External search impact: None.",
    "Live retrieval impact: None.",
    "Scraping/download/ingestion impact: None.",
    "Database/embedding impact: None.",
    "OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.",
    "Production impact: None.",
    "Filing-ready document impact: None.",
    "Automatic submission impact: None.",
    "09ZB remains required after 09ZE.",
    "09ZC remains blocked until 09ZB passes."
  ];
  for (const phrase of required) check(report.includes(phrase), `report contains: ${phrase}`);
});

await test("CURRENT_STATE.md contains 09ZE completion and 09ZB rerun next task", () => {
  const current = readFileSync(resolve(CURRENT_STATE_PATH), "utf8");
  check(current.includes(`${PATCH} completed.`), "CURRENT_STATE contains 09ZE entry");
  check(current.includes(NEXT_TASK) || current.includes("Rerun PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1."), "CURRENT_STATE states 09ZB rerun next");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
