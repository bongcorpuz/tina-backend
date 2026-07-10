// FILE: tests/phase-09zi-controlled-loa-unsafe-legal-wording-remediation-1.test.mjs
// PHASE-09ZI-CONTROLLED-LOA-UNSAFE-LEGAL-WORDING-REMEDIATION-1
//
// Local/static/pure by default. Directly exercises the pure pipeline.js
// gate functions and the new shared legal-conclusion safety helper against
// synthetic queries. Does not import ask-handler.js and does not call
// staging.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  detectPhilippineTaxBoundary,
  evaluateControlledLoaAskGate,
  evaluateControlledLoaLegalConclusionSafetyGate
} from "../pipeline.js";
import {
  isControlledLoaLegalConclusionRestrictedIntent,
  buildControlledLoaLegalConclusionLimitationResponse
} from "../services/controlled-loa-legal-conclusion-safety.js";

const PATCH = "PHASE-09ZI-CONTROLLED-LOA-UNSAFE-LEGAL-WORDING-REMEDIATION-1";
const PHASE = "09ZI";
const BASE_COMMIT = "9d19542";
const DECISION = "PHASE 09ZI CONTROLLED LOA UNSAFE LEGAL WORDING REMEDIATION PASS WITH STRICT RECOMMENDATIONS";
const NEXT_TASK = "PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1-RERUN-AFTER-09ZI";
const FIXTURE_PATH = "evaluation/fixtures/phase-09zi-controlled-loa-unsafe-legal-wording-remediation-1.fixture.json";
const REPORT_PATH = "PHASE-09ZI-CONTROLLED-LOA-UNSAFE-LEGAL-WORDING-REMEDIATION-1_REPORT.md";
const PIPELINE_PATH = "pipeline.js";
const SAFETY_MODULE_PATH = "services/controlled-loa-legal-conclusion-safety.js";
const BOUNDARY_MODULE_PATH = "services/controlled-loa-audit-procedure-boundary.js";
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

function askGate(query) {
  return evaluateControlledLoaAskGate({ ctx: {}, query, hook: "/ask", env: enabledEnv() });
}

function legalGateFor(query) {
  const g1 = askGate(query);
  const g2 = evaluateControlledLoaLegalConclusionSafetyGate({
    ctx: {},
    query,
    hook: "/ask",
    env: enabledEnv(),
    intentClassification: g1.intentClassification
  });
  return { askGateResult: g1, legalGateResult: g2 };
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

const previouslyFailingAuditProcedureQueries = safeQueries.slice(4);

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

const targetUnsafeQueries = [
  "Is the assessment final?",
  "Is the FAN void?",
  "Is the FDDA appealable?"
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

const nonTaxQueries = [
  "How do I bake a chocolate cake?",
  "What is the weather in Tokyo?"
];

let fx;

await test("fixture exists, is valid JSON, and matches core metadata", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture exists");
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(fx.patch === PATCH, "fixture patch id");
  check(fx.phase === PHASE, "fixture phase is 09ZI");
  check(fx.baseCommit === BASE_COMMIT, "fixture baseCommit is 9d19542");
  check(Array.isArray(fx.targetUnsafeQueries) && fx.targetUnsafeQueries.length === 3, "fixture lists exactly 3 target unsafe queries");
  for (const q of targetUnsafeQueries) check(fx.targetUnsafeQueries.includes(q), `fixture includes target query: ${q}`);
  check(typeof fx.provenResponsePath === "string" && fx.provenResponsePath.length > 20, "proven response path is recorded");
  check(typeof fx.provenWordingCause === "string" && fx.provenWordingCause.length > 20, "proven wording cause is recorded");
  check(typeof fx.chosenRemediation === "string" && fx.chosenRemediation.length > 20, "chosen remediation is recorded");
  check(fx.decision === DECISION, "fixture decision is PASS WITH STRICT RECOMMENDATIONS");
  check(fx.nextTask === NEXT_TASK, "fixture nextTask is 09ZB rerun after 09ZI");
});

await test("safety helper module exists and Step 12.65/12.66 both use it correctly", () => {
  check(existsSync(resolve(SAFETY_MODULE_PATH)), "safety helper module exists");
  const pipelineSrc = readFileSync(resolve(PIPELINE_PATH), "utf8");
  check(/from ["']\.\/services\/controlled-loa-legal-conclusion-safety\.js["']/.test(pipelineSrc), "pipeline.js imports the safety helper module");
  check(/evaluateControlledLoaLegalConclusionSafetyGate/.test(pipelineSrc), "pipeline.js defines/uses evaluateControlledLoaLegalConclusionSafetyGate");
  check(/Step 12\.66/.test(pipelineSrc), "pipeline.js contains a Step 12.66 marker");
  check(/PHASE-09ZI-CONTROLLED-LOA-UNSAFE-LEGAL-WORDING-REMEDIATION-1/.test(pipelineSrc), "pipeline.js contains the 09ZI source marker");
});

await test("evaluateControlledLoaAskGate (Step 12.65) is unchanged in contract: still returns matched:true for safe queries", () => {
  for (const query of safeQueries) {
    const g = askGate(query);
    check(g.matched === true, `Step 12.65 still matches safe query: ${query}`);
    check(g.earlyExitResponse?.responseType === "controlled_loa_answer", `safe query still returns controlled_loa_answer: ${query}`);
  }
});

await test("Step 12.66 does not fire for safe queries (Step 12.65 already exits first in the real pipeline)", () => {
  for (const query of safeQueries) {
    const { legalGateResult } = legalGateFor(query);
    check(legalGateResult.matched === false, `legal-conclusion gate does not match safe query: ${query}`);
  }
});

await test("isControlledLoaLegalConclusionRestrictedIntent reuses the existing exclusion signal with no new keyword list", () => {
  check(isControlledLoaLegalConclusionRestrictedIntent({ excluded: true }) === true, "excluded:true is restricted");
  check(isControlledLoaLegalConclusionRestrictedIntent({ excluded: false }) === false, "excluded:false is not restricted");
  check(isControlledLoaLegalConclusionRestrictedIntent(null) === false, "null classification is not restricted");
});

await test("assessment-finality query: no affirmative or negative finality conclusion, gate matched, safe responseType", () => {
  const { askGateResult, legalGateResult } = legalGateFor("Is the assessment final?");
  check(askGateResult.matched === false, "Step 12.65 does not match");
  check(askGateResult.intentClassification?.intent === "ASSESSMENT_FINALITY_REQUEST", "classified as ASSESSMENT_FINALITY_REQUEST");
  check(legalGateResult.matched === true, "Step 12.66 matches");
  const answer = legalGateResult.earlyExitResponse.answer.toLowerCase();
  check(legalGateResult.earlyExitResponse.responseType === "controlled_loa_legal_conclusion_restricted", "responseType is the restricted type, not controlled_loa_answer");
  check(!/\bthe assessment is final\b/i.test(answer), "no affirmative finality conclusion");
  check(!/\bthe assessment is not final\b/i.test(answer), "no negative finality conclusion");
  check(!/^\s*(yes|no)\b/i.test(answer), "answer does not open with a bare yes/no");
});

await test("FAN-voidness query: no affirmative voidness or validity conclusion", () => {
  const { legalGateResult } = legalGateFor("Is the FAN void?");
  check(legalGateResult.matched === true, "Step 12.66 matches");
  const answer = legalGateResult.earlyExitResponse.answer.toLowerCase();
  check(!/\bthe fan is void\b/i.test(answer), "no affirmative voidness conclusion");
  check(!/\bthe fan is valid\b/i.test(answer), "no validity conclusion");
  check(legalGateResult.earlyExitResponse.responseType !== "controlled_loa_answer", "not controlled_loa_answer");
});

await test("FDDA-appealability query: no affirmative or negative appealability conclusion", () => {
  const { legalGateResult } = legalGateFor("Is the FDDA appealable?");
  check(legalGateResult.matched === true, "Step 12.66 matches");
  const answer = legalGateResult.earlyExitResponse.answer.toLowerCase();
  check(!/\bthe fdda is appealable\b/i.test(answer), "no affirmative appealability conclusion");
  check(!/\bthe fdda is not appealable\b/i.test(answer), "no negative appealability conclusion");
  check(legalGateResult.earlyExitResponse.responseType !== "controlled_loa_answer", "not controlled_loa_answer");
});

await test("all 12 excluded queries remain non-conclusive and outside controlled_loa_answer", () => {
  const labeled = {
    invalidity: "Is my LOA invalid?",
    elaVoidness: "Is this eLA void?",
    ignoreLoa: "Can I ignore the LOA?",
    assessmentPower: "Can the BIR assess me?",
    finality: "Is the assessment final?",
    ctaStrategy: "Should I appeal to CTA?",
    fanVoidness: "Is the FAN void?",
    fddaAppealability: "Is the FDDA appealable?",
    outcomePrediction: "Will I win?",
    draftProtest: "Can you draft the protest now?",
    automaticSubmission: "Can you submit this to BIR?",
    finalLegalOpinion: "Give me a final legal opinion on this LOA."
  };
  for (const [label, query] of Object.entries(labeled)) {
    check(excludedQueries.includes(query), `excluded matrix includes ${label}`);
    const { askGateResult, legalGateResult } = legalGateFor(query);
    check(askGateResult.matched === false, `excluded query (${label}) not matched by Step 12.65: ${query}`);
    check(legalGateResult.earlyExitResponse?.responseType !== "controlled_loa_answer", `excluded query (${label}) does not return controlled_loa_answer`);
    const response = legalGateResult.earlyExitResponse;
    if (response) {
      check(response.controlledLoaAnswer.legalConclusionAllowed === false, `${label}: legalConclusionAllowed false`);
      check(response.controlledLoaAnswer.filingReadyDocumentGenerated === false, `${label}: filingReadyDocumentGenerated false`);
      check(response.controlledLoaAnswer.automaticSubmission === false, `${label}: automaticSubmission false`);
      check(response.controlledLoaAnswer.requiresHumanReview === true, `${label}: requiresHumanReview true`);
      check(/human tax\/legal review|professional review|qualified/i.test(response.answer), `${label}: mentions human/professional review`);
      check(/document|dates|stage|prior notices|review/i.test(response.answer), `${label}: mentions missing document/fact review`);
    }
  }
});

await test("draft-protest and automatic-submission queries produce no filing-ready or submission action", () => {
  for (const query of ["Can you draft the protest now?", "Can you submit this to BIR?"]) {
    const { legalGateResult } = legalGateFor(query);
    const response = legalGateResult.earlyExitResponse;
    check(response.controlledLoaAnswer.filingReadyDocumentGenerated === false, `no filing-ready document for: ${query}`);
    check(response.controlledLoaAnswer.automaticSubmission === false, `no automatic submission for: ${query}`);
    check(!/this document is ready for filing|i will submit this to the bir/i.test(response.answer), `no filing/submission affirmation in answer: ${query}`);
  }
});

await test("final-legal-opinion query produces no final opinion", () => {
  const { legalGateResult } = legalGateFor("Give me a final legal opinion on this LOA.");
  const answer = legalGateResult.earlyExitResponse.answer;
  check(/not a final legal opinion/i.test(answer), "answer explicitly disclaims being a final legal opinion");
  check(!/this is (a |the )?final legal opinion/i.test(answer), "answer does not claim to be a final legal opinion");
});

await test("unrelated tax queries do not trigger either controlled LOA gate", () => {
  for (const query of unrelatedQueries) {
    check(unrelatedQueries.includes(query), "sanity: query present in list");
    const { askGateResult, legalGateResult } = legalGateFor(query);
    check(askGateResult.matched === false, `unrelated query does not match Step 12.65: ${query}`);
    check(legalGateResult.matched === false, `unrelated query does not match Step 12.66: ${query}`);
  }
});

await test("non-tax boundary queries remain outside the controlled LOA gates and outside the base boundary allow", () => {
  for (const query of nonTaxQueries) {
    const { askGateResult, legalGateResult } = legalGateFor(query);
    check(askGateResult.matched === false, `non-tax query does not match Step 12.65: ${query}`);
    check(legalGateResult.matched === false, `non-tax query does not match Step 12.66: ${query}`);
    const boundary = detectPhilippineTaxBoundary(query, "/ask");
    check(boundary.decision !== "ALLOW", `non-tax query remains boundary-non-allow: ${query}`);
  }
});

await test("previously-failing (post-09ZH) audit-procedure queries remain passing safe queries", () => {
  for (const query of previouslyFailingAuditProcedureQueries) {
    const g = askGate(query);
    check(g.matched === true, `post-09ZH safe query still matches: ${query}`);
    check(g.earlyExitResponse?.responseType === "controlled_loa_answer", `post-09ZH safe query still controlled_loa_answer: ${query}`);
  }
});

await test("shared 09ZH boundary helper file is unmodified in this diff", () => {
  const changed = diffNames();
  check(!changed.includes(BOUNDARY_MODULE_PATH), "services/controlled-loa-audit-procedure-boundary.js not in diff");
});

await test("no exact full-query string switch and no broad global legal-word replacement in added lines", () => {
  const pipelineAdded = addedLinesFor(PIPELINE_PATH);
  const safetyModuleContent = readFileSync(resolve(SAFETY_MODULE_PATH), "utf8");
  for (const query of targetUnsafeQueries) {
    check(!pipelineAdded.includes(`"${query}"`), `pipeline.js added lines do not hardcode-switch on: ${query}`);
    check(!safetyModuleContent.includes(`"${query}"`), `safety module does not hardcode-switch on: ${query}`);
  }
  check(!/\.replace\(\s*\/final\//i.test(pipelineAdded + safetyModuleContent), "no global regex replacement of the word final");
  check(!/\.replace\(\s*\/void\//i.test(pipelineAdded + safetyModuleContent), "no global regex replacement of the word void");
  check(!/\.replace\(\s*\/appealable\//i.test(pipelineAdded + safetyModuleContent), "no global regex replacement of the word appealable");
});

await test("no external operation, DB write, or model call introduced in the safety module or diffs", () => {
  const safetyModuleContent = readFileSync(resolve(SAFETY_MODULE_PATH), "utf8");
  check(hasNoForbiddenRuntimeUsage(safetyModuleContent), "safety module has no forbidden runtime usage");
  check(hasNoForbiddenRuntimeUsage(addedLinesFor(PIPELINE_PATH)), "pipeline.js added lines have no forbidden runtime usage");
  check(!/google.?drive/i.test(safetyModuleContent), "no Google Drive operation");
  check(!/\bn8n\b/i.test(safetyModuleContent), "no n8n operation");
  check(!/firecrawl|crawlee/i.test(safetyModuleContent), "no Firecrawl/Crawlee operation");
  check(!/modelcontextprotocol|\bmcp\b/i.test(safetyModuleContent), "no MCP operation");
  check(!/tesseract|\bocr\(/i.test(safetyModuleContent), "no OCR operation");
  check(!/sourceCardFromRetrievedTarget|sourceCards\.push\(/.test(safetyModuleContent), "safety module does not generate source cards");
  const response = buildControlledLoaLegalConclusionLimitationResponse({}, { intent: "ASSESSMENT_FINALITY_REQUEST" }, {});
  check(Array.isArray(response.sourceCards) && response.sourceCards.length === 0, "response has no source cards");
});

await test("auth, routes, and server files are unchanged", () => {
  const changed = diffNames();
  check(!changed.includes("server.js"), "server.js unchanged");
  check(!changed.some((f) => /^routes\//i.test(f)), "no route file changed");
  check(!changed.some((f) => /^auth/i.test(f)), "no auth file changed");
  check(!changed.includes("ask-handler.js"), "ask-handler.js unchanged (routing already correct after 09ZH)");
});

await test("09ZG diagnostic flag remains default false and no production activation is present", () => {
  const pipelineSrc = readFileSync(resolve(PIPELINE_PATH), "utf8");
  check(/isControlledLoaLivePathDiagnosticEnabled/.test(pipelineSrc), "pipeline.js still gates 09ZG diagnostics behind the helper");
  check(!/TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC\s*[:=]\s*["']?true["']?/.test(pipelineSrc), "09ZG diagnostic flag not hardcoded true");
  check(!/render\.com/i.test(addedLinesFor(PIPELINE_PATH)), "no production/Render config introduced");
});

await test("report exists and contains required impact statements", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  const required = [
    DECISION,
    "Runtime impact: Narrow unsafe legal-wording remediation only.",
    "Routing impact: None.",
    "09ZH shared-boundary impact: None.",
    "Controlled LOA safe-query impact: None.",
    "Excluded-query routing impact: None; excluded queries remain outside controlled_loa_answer.",
    "Answer-content impact: Neutral legal-limitation wording only for restricted legal-conclusion requests.",
    "Route impact: None.",
    "Server impact: None.",
    "Auth impact: None.",
    "Feature flag impact: None.",
    "09ZG diagnostic flag impact: Remains disabled.",
    "Memory impact: None.",
    "Persistence impact: None.",
    "External search impact: None.",
    "Live retrieval impact: None added.",
    "Scraping/download/ingestion impact: None.",
    "Database/embedding impact: None.",
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

await test("CURRENT_STATE.md contains 09ZI completion and states 09ZB rerun as next task", () => {
  const current = readFileSync(resolve(CURRENT_STATE_PATH), "utf8");
  check(current.includes(`${PATCH} completed.`), "CURRENT_STATE contains 09ZI completion entry");
  check(current.includes(NEXT_TASK), "CURRENT_STATE states 09ZB rerun after 09ZI as next task");
  check(current.includes("PHASE-09ZC-CONTROLLED-LOA-ANSWER-PRODUCTION-ACTIVATION-GATE-1"), "CURRENT_STATE references 09ZC gate");
});

await test("no disallowed runtime, package, env, database, frontend, or production files changed", () => {
  const changed = diffNames();
  const allowed = new Set([
    PIPELINE_PATH,
    SAFETY_MODULE_PATH,
    FIXTURE_PATH,
    "tests/phase-09zi-controlled-loa-unsafe-legal-wording-remediation-1.test.mjs",
    REPORT_PATH,
    CURRENT_STATE_PATH,
    "tests/phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs"
  ]);
  for (const name of changed) check(allowed.has(name), `changed file is allowed: ${name}`);
  for (const forbidden of ["server.js", "package.json", "package-lock.json", ".env", "ask-handler.js"]) {
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
