// FILE: tests/phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs
// PHASE-09ZF-CONTROLLED-LOA-GATE-ORDERING-REMEDIATION-1

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  detectPhilippineTaxBoundary,
  evaluateControlledLoaAskGate
} from "../pipeline.js";

const PATCH = "PHASE-09ZF-CONTROLLED-LOA-GATE-ORDERING-REMEDIATION-1";
const PHASE = "09ZF";
const PRIOR_FAIL_COMMIT = "30c1cbb";
const PRIOR_REMEDIATION_COMMIT = "339c448";
const CURRENT_FAILURE_COMMIT = "dc8e882";
const DECISION = "PHASE 09ZF CONTROLLED LOA GATE ORDERING REMEDIATION PASS WITH STRICT RECOMMENDATIONS";
const NEXT_TASK = "PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1-RERUN";
const FIXTURE_PATH = "evaluation/fixtures/phase-09zf-controlled-loa-gate-ordering-remediation-1.fixture.json";
const REPORT_PATH = "PHASE-09ZF-CONTROLLED-LOA-GATE-ORDERING-REMEDIATION-1_REPORT.md";
const PIPELINE_PATH = "pipeline.js";
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
  const modified = execSync("git diff --name-only", { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const untracked = execSync("git ls-files --others --exclude-standard", { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((name) => !/^\.vscode\//.test(name))
    .filter((name) => !/^evaluation\/factcheck\//.test(name))
    .filter((name) => name !== ".env")
    .filter((name) => !/^tests\/TINA_Adversarial_Test_Set_PH_Tax\.md$/.test(name))
    .filter((name) => !/^tests\/TINA_Tax_FactCheck_Answer_Key_v2\.md$/.test(name));
  return [...new Set([...modified, ...untracked])];
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

const previouslyFailingSafeQueries = safeQueries.slice(4);

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
  check(fx.priorFailCommit === PRIOR_FAIL_COMMIT, "fixture priorFailCommit");
  check(fx.priorRemediationCommit === PRIOR_REMEDIATION_COMMIT, "fixture priorRemediationCommit");
  check(fx.currentFailureCommit === CURRENT_FAILURE_COMMIT, "fixture currentFailureCommit");
  check(fx.decision === DECISION, "fixture decision is PASS WITH STRICT RECOMMENDATIONS");
  check(fx.nextTask === NEXT_TASK, "fixture nextTask is 09ZB rerun");
});

await test("fixture lists all four previously failing safe queries", () => {
  check(Array.isArray(fx.previouslyFailingSafeQueries), "previouslyFailingSafeQueries is an array");
  check(fx.previouslyFailingSafeQueries.length === 4, "previouslyFailingSafeQueries has exactly four entries");
  for (const query of previouslyFailingSafeQueries) {
    check(fx.previouslyFailingSafeQueries.includes(query), `fixture includes previously-failing query: ${query}`);
  }
});

await test("fixture safe/excluded/unrelated matrices are complete", () => {
  check(Array.isArray(fx.safeQueryMatrix) && fx.safeQueryMatrix.length === 8, "safeQueryMatrix has 8 entries");
  for (const query of safeQueries) check(fx.safeQueryMatrix.includes(query), `safeQueryMatrix includes ${query}`);
  check(Array.isArray(fx.excludedQueryMatrix) && fx.excludedQueryMatrix.length === 12, "excludedQueryMatrix has 12 entries");
  for (const query of excludedQueries) check(fx.excludedQueryMatrix.includes(query), `excludedQueryMatrix includes ${query}`);
  check(Array.isArray(fx.unrelatedQueryMatrix) && fx.unrelatedQueryMatrix.length === 8, "unrelatedQueryMatrix has 8 entries");
  for (const query of unrelatedQueries) check(fx.unrelatedQueryMatrix.includes(query), `unrelatedQueryMatrix includes ${query}`);
});

await test("pipeline.js retains required controlled LOA gate markers", () => {
  check(existsSync(resolve(PIPELINE_PATH)), "pipeline.js exists");
  const src = readFileSync(resolve(PIPELINE_PATH), "utf8");
  check(/TINA_ENABLE_CONTROLLED_LOA_ASK_GATE/.test(src), "pipeline contains TINA_ENABLE_CONTROLLED_LOA_ASK_GATE");
  check(/evaluateControlledLoaAskGate/.test(src), "pipeline contains evaluateControlledLoaAskGate");
  check(/buildControlledLoaAskEarlyExitResponse/.test(src), "pipeline contains buildControlledLoaAskEarlyExitResponse");
  check(/Step 12\.65/.test(src), "pipeline contains Step 12.65 marker");
  check(/PHASE-09ZF-CONTROLLED-LOA-GATE-ORDERING-REMEDIATION-1/.test(src), "pipeline contains PHASE-09ZF remediation marker");
  check(/pre-generic-fallback ordering fix only/.test(src), "remediation marker indicates pre-generic-fallback ordering");
});

await test("static scan confirms Step 12.65 controlled LOA gate now runs before Step 12.6 clarification gate", () => {
  const src = readFileSync(resolve(PIPELINE_PATH), "utf8");
  const controlledLoaGateIndex = src.indexOf("Step 12.65: Controlled LOA/eLA procedural-help /ask gate (flagged)");
  const clarificationGateIndex = src.indexOf("Step 12.6: Live clarification route gate (flagged)");
  check(controlledLoaGateIndex !== -1, "controlled LOA gate marker found");
  check(clarificationGateIndex !== -1, "clarification gate marker found");
  check(controlledLoaGateIndex < clarificationGateIndex, "controlled LOA gate block appears before clarification gate block");
});

await test("all safe queries -- including previously failing ones -- match the controlled LOA gate", () => {
  for (const query of safeQueries) {
    const boundary = detectPhilippineTaxBoundary(query, "/ask");
    const gate = controlledGate(query);
    check(boundary.decision === "ALLOW" && boundary.isPhilippineTax === true, `boundary allows ${query}`);
    check(gate.matched === true, `controlled gate matches ${query}`);
    check(gate.earlyExitResponse?.responseType === "controlled_loa_answer", `controlled_loa_answer response type for ${query}`);
  }
});

await test("previously failing replacement eLA query is covered and matches", () => {
  const query = "I received a replacement eLA, what should I check first?";
  check(safeQueries.includes(query), "query present in safe matrix");
  check(controlledGate(query).matched === true, "replacement eLA query matches controlled gate");
});

await test("previously failing consolidated eLA query is covered and matches", () => {
  const query = "I received a consolidated eLA, what should I do?";
  check(safeQueries.includes(query), "query present in safe matrix");
  check(controlledGate(query).matched === true, "consolidated eLA query matches controlled gate");
});

await test("previously failing notice for presentation/submission query is covered and matches", () => {
  const query = "I received a notice for presentation/submission of documents.";
  check(safeQueries.includes(query), "query present in safe matrix");
  check(controlledGate(query).matched === true, "notice for presentation/submission query matches controlled gate");
});

await test("previously failing reminder before subpoena query is covered and matches", () => {
  const query = "I received a reminder before subpoena.";
  check(safeQueries.includes(query), "query present in safe matrix");
  check(controlledGate(query).matched === true, "reminder before subpoena query matches controlled gate");
});

await test("each excluded unsafe query individually remains excluded from the controlled safe LOA answer", () => {
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
    check(gate.matched === false, `excluded query (${label}) does not match controlled gate: ${query}`);
    check(gate.earlyExitResponse === null, `excluded query (${label}) has no early exit: ${query}`);
  }
});

await test("unrelated tax queries do not trigger the controlled LOA branch", () => {
  const labeled = {
    ewt: "Explain EWT.",
    vat: "What is VAT-exempt sale?",
    percentageTax: "What is percentage tax?",
    estateTax: "What is estate tax?"
  };
  for (const [label, query] of Object.entries(labeled)) {
    check(unrelatedQueries.includes(query), `unrelated matrix includes ${label}`);
    const gate = controlledGate(query);
    check(gate.matched === false, `unrelated query (${label}) does not trigger controlled LOA branch: ${query}`);
  }
  for (const query of unrelatedQueries) {
    check(controlledGate(query).matched === false, `unrelated query does not trigger controlled LOA branch: ${query}`);
  }
});

await test("source-card and legal-safety metadata remain locked down on the controlled branch", () => {
  const response = controlledGate("I received a replacement eLA, what should I check first?").earlyExitResponse;
  check(Array.isArray(response.sourceCards) && response.sourceCards.length === 0, "sourceCards empty");
  check(response.controlledLoaAnswer.legalCitationAllowed === false, "legalCitationAllowed false");
  check(response.controlledLoaAnswer.sourceCardVerification === "not_performed", "sourceCardVerification not_performed");
  check(response.controlledLoaAnswer.filingReadyDocumentGenerated === false, "filingReadyDocumentGenerated false");
  check(response.controlledLoaAnswer.automaticSubmission === false, "automaticSubmission false");
  check(fx.sourceCardPolicy.legalCitationAllowed === false, "fixture sourceCardPolicy.legalCitationAllowed false");
  check(fx.sourceCardPolicy.sourceCardVerification === "not_performed", "fixture sourceCardPolicy.sourceCardVerification not_performed");
});

await test("static scan confirms no external operation, filing-ready, or automatic-submission implementation was added", () => {
  const addedPipeline = addedLinesFor(PIPELINE_PATH);
  check(hasNoForbiddenRuntimeUsage(addedPipeline), "pipeline added lines contain no forbidden runtime usage");
  check(!/filingReadyDocumentGenerated:\s*true/.test(addedPipeline), "no filing-ready generation introduced");
  check(!/automaticSubmission:\s*true/.test(addedPipeline), "no automatic submission introduced");
  check(!/\bscrape\s*\(|\bdownload\s*\(|\bingest\s*\(/i.test(addedPipeline), "no scraping/download/ingestion call introduced");
  check(!/legalCitationAllowed:\s*true/.test(addedPipeline), "no legal citation enablement introduced");
});

await test("no disallowed runtime, package, env, database, frontend, or production files changed", () => {
  const changed = diffNames();
  const allowed = new Set([
    "pipeline.js",
    FIXTURE_PATH,
    "tests/phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs",
    REPORT_PATH,
    CURRENT_STATE_PATH,
    "tests/phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs",
    "evaluation/fixtures/phase-09zb-controlled-loa-answer-staging-smoke-1.fixture.json"
  ]);
  for (const name of changed) check(allowed.has(name), `changed file is allowed: ${name}`);
  for (const forbidden of ["server.js", "ask-handler.js", "package.json", "package-lock.json", ".env"]) {
    check(!changed.includes(forbidden), `${forbidden} unchanged`);
  }
  check(!changed.some((name) => /^routes\//i.test(name)), "no route file changed");
  check(!changed.some((name) => /auth/i.test(name)), "no auth file changed");
  check(!changed.some((name) => /supabase|migration|database|embedding/i.test(name)), "no DB/embedding file changed");
  check(!changed.some((name) => /frontend|public|production|deploy/i.test(name)), "no frontend/production file changed");
  check(!changed.some((name) => /workflow[\\/]controlled-loa-answer-runtime-scaffold\.js/i.test(name)), "controlled LOA runtime scaffold unchanged");
});

await test("report exists and contains required impact statements", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  const required = [
    DECISION,
    "Runtime impact: Controlled LOA gate-ordering remediation only.",
    "Ask-handler impact: None.",
    "Route impact: None.",
    "Server impact: None.",
    "Auth impact: None.",
    "Feature flag impact: Existing staging flag only.",
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
    "09ZB rerun remains required after 09ZF.",
    "09ZC remains blocked until 09ZB passes."
  ];
  for (const phrase of required) check(report.includes(phrase), `report contains: ${phrase}`);
});

await test("CURRENT_STATE.md contains 09ZF completion, 09ZB rerun next, and 09ZC blocked statements", () => {
  const current = readFileSync(resolve(CURRENT_STATE_PATH), "utf8");
  check(current.includes(`${PATCH} completed.`), "CURRENT_STATE contains 09ZF completion entry");
  check(current.includes(NEXT_TASK), "CURRENT_STATE states 09ZB rerun next task");
  check(current.includes("PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1"), "CURRENT_STATE references 09ZC gate");
  check(/09ZC[\s\S]{0,80}blocked|blocked[\s\S]{0,80}09ZC/i.test(current), "CURRENT_STATE states 09ZC remains blocked");
});

await test("git diff scope is reported (encoded via allowed-file check above)", () => {
  const workingTreeChanges = diffNames();
  const lastCommitFiles = execSync("git show --name-only --format=", { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const scope = new Set([...workingTreeChanges, ...lastCommitFiles]);
  check(scope.has("pipeline.js"), "pipeline.js is part of the reported diff scope (working tree or last commit)");
  check(scope.has(FIXTURE_PATH), "09ZF fixture is part of the reported diff scope (working tree or last commit)");
  check(scope.size > 0, "diff scope is non-empty and was inspected");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
