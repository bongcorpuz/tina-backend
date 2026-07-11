// FILE: tests/phase-10a2-restricted-legal-conclusion-timeout-gate-remediation-1.test.mjs
// PHASE-10A2-RESTRICTED-LEGAL-CONCLUSION-TIMEOUT-GATE-REMEDIATION-1
//
// Proven root cause: pipeline.js's Step 12.65/12.66 deterministic
// controlled-LOA gates run after Step 5 (retrieval) and Step 6 (reranker),
// inside the single runPipeline() call that ask-handler.js races against a
// 90000ms timeout (RAG_TIMEOUT_MS). For slow-retrieval query shapes (proven
// live: "Will I win my BIR case?" took ~93.5s in prior staging evidence),
// the race can reject before Step 12.65/12.66 ever execute, discarding the
// restricted classification and substituting a generic RETRIEVAL_TIMEOUT
// fallback (wrong taxonomy, lost requiresHumanReview/restricted metadata).
//
// This suite directly executes the real, corrected classifyControlledLoaIntent()
// (workflow/controlled-loa-answer-runtime-scaffold.js) and the new
// evaluateUpstreamRestrictedLegalConclusionGate() (services/controlled-loa-legal-conclusion-safety.js)
// against every required query category, proves early interception via
// dependency injection and I/O-reference absence (not elapsed time alone),
// confirms Step 12.66 remains functional defense in depth, and confirms
// ask-handler.js's actual control-flow structurally never calls
// runPipeline() on the matched branch. Local/static/pure by default. Does
// not call any production or staging URL.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  classifyControlledLoaIntent,
  normalizeControlledLoaAnswerInput,
  createControlledLoaAnswerRuntimeScaffoldResult
} from "../workflow/controlled-loa-answer-runtime-scaffold.js";
import {
  isControlledLoaLegalConclusionRestrictedIntent,
  evaluateUpstreamRestrictedLegalConclusionGate,
  buildControlledLoaLegalConclusionLimitationResponse
} from "../services/controlled-loa-legal-conclusion-safety.js";
import { evaluateControlledLoaLegalConclusionSafetyGate } from "../pipeline.js";
import { detectPhilippineTaxBoundary } from "../services/philippine-tax-domain-boundary.js";
import { buildResponseTrust } from "../services/trust-contract.js";

const PATCH = "PHASE-10A2-RESTRICTED-LEGAL-CONCLUSION-TIMEOUT-GATE-REMEDIATION-1";
const FIXTURE_PATH = "evaluation/fixtures/phase-10a2-restricted-legal-conclusion-timeout-gate-remediation-1.fixture.json";
const REPORT_PATH = "PHASE-10A2-RESTRICTED-LEGAL-CONCLUSION-TIMEOUT-GATE-REMEDIATION-1_REPORT.md";
const CURRENT_STATE_PATH = "knowledge/CURRENT_STATE.md";
const ASK_HANDLER_PATH = "ask-handler.js";
const PIPELINE_PATH = "pipeline.js";
const SAFETY_MODULE_PATH = "services/controlled-loa-legal-conclusion-safety.js";
const SCAFFOLD_PATH = "workflow/controlled-loa-answer-runtime-scaffold.js";

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

function classify(query) {
  return classifyControlledLoaIntent(normalizeControlledLoaAnswerInput({ userQuery: query }));
}

let fx;

await test("fixture exists and is valid JSON with all required categories", () => {
  check(existsSync(resolve(FIXTURE_PATH)), "fixture file exists");
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  for (const key of [
    "restrictedOutcomePrediction", "restrictedValidityVoidness", "restrictedLegalStrategy",
    "jurisprudenceFalsePositiveProtection", "controlledLoaProceduralPreservation",
    "generalTaxControls", "contextFreeOutcomeQueries", "nonTaxQueries", "trustContractForRestrictedPath"
  ]) {
    check(Object.prototype.hasOwnProperty.call(fx, key), `fixture contains ${key}`);
  }
});

await test("A. restricted outcome prediction queries are deterministically classified excluded", () => {
  for (const c of fx.restrictedOutcomePrediction) {
    const result = classify(c.query);
    check(result.excluded === true, `${c.query}: excluded === true`);
    check(result.intent === c.expectedIntent, `${c.query}: intent is ${c.expectedIntent}`);
    check(result.supported === false, `${c.query}: supported === false`);
  }
});

await test("B. validity and voidness queries are deterministically classified excluded", () => {
  for (const c of fx.restrictedValidityVoidness) {
    const result = classify(c.query);
    check(result.excluded === true, `${c.query}: excluded === true`);
    check(result.intent === c.expectedIntent, `${c.query}: intent is ${c.expectedIntent}`);
  }
});

await test("C. legal strategy / final opinion / definitive conclusion queries are excluded, never filing-ready", () => {
  for (const c of fx.restrictedLegalStrategy) {
    const result = classify(c.query);
    check(result.excluded === true, `${c.query}: excluded === true`);
    check(result.intent === c.expectedIntent, `${c.query}: intent is ${c.expectedIntent}`);
    const gate = evaluateUpstreamRestrictedLegalConclusionGate({ query: c.query, isPhilippineTax: true, ctx: {} });
    check(gate.matched === true, `${c.query}: upstream gate matches`);
    check(gate.earlyExitResponse.controlledLoaAnswer.filingReadyDocumentGenerated === false, `${c.query}: filingReadyDocumentGenerated is false`);
    check(gate.earlyExitResponse.controlledLoaAnswer.automaticSubmission === false, `${c.query}: automaticSubmission is false`);
    check(gate.earlyExitResponse.controlledLoaAnswer.requiresHumanReview === true, `${c.query}: requiresHumanReview is true`);
  }
});

await test("D. early-interception proof: the upstream gate module has zero I/O references and executes synchronously with no retrieval/model/DB call", () => {
  const src = readFileSync(resolve(SAFETY_MODULE_PATH), "utf8");
  check(!/\bsupabase\b/i.test(src), "safety module never references supabase");
  check(!/\bopenai\.[a-zA-Z]/i.test(src), "safety module never calls an openai client method");
  check(!/\bfetch\s*\(/.test(src), "safety module never calls fetch()");
  check(!/\bawait\s+/.test(src), "safety module contains no await -- fully synchronous, cannot perform I/O");

  // Dependency-injection proof: inject counting spies in place of the real
  // classifier/scaffold-result builder and confirm each is called exactly
  // once per evaluation, with only the raw query string -- no retrieval
  // client, no model client, no database handle is ever passed to them.
  let classifierCalls = 0;
  let resultBuilderCalls = 0;
  const spiedClassifier = (normalized) => {
    classifierCalls += 1;
    check(typeof normalized.userQuery === "string", "classifier spy receives only a normalized query object");
    return classifyControlledLoaIntent(normalized);
  };
  const spiedResultBuilder = (input) => {
    resultBuilderCalls += 1;
    check(typeof input.userQuery === "string", "result builder spy receives only { userQuery }");
    return createControlledLoaAnswerRuntimeScaffoldResult(input);
  };
  const gate = evaluateUpstreamRestrictedLegalConclusionGate({
    query: "Will I win my BIR case?",
    isPhilippineTax: true,
    ctx: {},
    intentClassifier: spiedClassifier,
    resultBuilder: spiedResultBuilder
  });
  check(gate.matched === true, "spied gate still matches the restricted query");
  check(classifierCalls === 1, "classifier invoked exactly once");
  check(resultBuilderCalls === 1, "result builder invoked exactly once");

  // Corroborating (not sole) timing evidence: 500 evaluations of a
  // restricted query complete in a trivially small amount of wall-clock
  // time, consistent with zero I/O.
  const iterations = 500;
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    evaluateUpstreamRestrictedLegalConclusionGate({ query: "Will I win my BIR case?", isPhilippineTax: true, ctx: {} });
  }
  const elapsedMs = Date.now() - start;
  check(elapsedMs < 2000, `${iterations} synchronous evaluations complete in under 2000ms (actual: ${elapsedMs}ms), consistent with no network/DB/model latency`);

  // Structural proof: ask-handler.js's matched branch is mutually exclusive
  // with the runPipeline() call -- confirmed by reading the exact
  // if/else fork around the timeout race.
  const askSrc = readFileSync(resolve(ASK_HANDLER_PATH), "utf8");
  const gateCallIndex = askSrc.indexOf("const upstreamRestrictedGate =");
  check(gateCallIndex !== -1, "ask-handler.js computes upstreamRestrictedGate");
  const forkPattern = /if\s*\(upstreamRestrictedGate\.matched\)\s*\{\s*result\s*=\s*upstreamRestrictedGate\.earlyExitResponse;\s*\}\s*else\s*\{/;
  const afterGateCall = askSrc.slice(gateCallIndex);
  const forkMatch = forkPattern.exec(afterGateCall);
  check(forkMatch !== null, "ask-handler.js forks on upstreamRestrictedGate.matched before the runPipeline() call");
  const forkStart = forkMatch ? gateCallIndex + forkMatch.index : -1;
  const runPipelineCallIndex = askSrc.indexOf("runPipeline({", forkStart === -1 ? gateCallIndex : forkStart);
  check(runPipelineCallIndex > forkStart, "runPipeline( is only reachable inside the else branch, after the matched fork");
});

await test("E. defense in depth: Step 12.66 inside pipeline.js still restricts a query if the upstream gate is bypassed", () => {
  const intentClassification = classify("Will I win my BIR case?");
  check(intentClassification.excluded === true, "sanity: classifier still marks this excluded");
  const downstreamGate = evaluateControlledLoaLegalConclusionSafetyGate({
    ctx: {},
    query: "Will I win my BIR case?",
    hook: "/ask",
    env: { TINA_ENABLE_CONTROLLED_LOA_ASK_GATE: "1" },
    intentClassification
  });
  check(downstreamGate.enabled === true, "Step 12.66 gate is enabled under the existing flag");
  check(downstreamGate.matched === true, "Step 12.66 still matches and restricts the query independently of the upstream gate");
  check(downstreamGate.earlyExitResponse.responseType === "controlled_loa_legal_conclusion_restricted", "Step 12.66 produces the restricted response type");
});

await test("F. jurisprudence questions are not falsely restricted (fixes the prior asksCta bare-mention false positive)", () => {
  for (const c of fx.jurisprudenceFalsePositiveProtection) {
    const result = classify(c.query);
    check(result.excluded === false, `${c.query}: excluded === false (${JSON.stringify(result)})`);
    const gate = evaluateUpstreamRestrictedLegalConclusionGate({ query: c.query, isPhilippineTax: true, ctx: {} });
    check(gate.matched === false, `${c.query}: upstream gate does not intercept a legitimate jurisprudence question`);
  }
});

await test("G. controlled LOA procedural preservation: safe procedural questions are never excluded", () => {
  for (const c of fx.controlledLoaProceduralPreservation) {
    const result = classify(c.query);
    check(result.excluded === false, `${c.query}: excluded === false`);
    if (c.expectedIntent) check(result.intent === c.expectedIntent, `${c.query}: intent is ${c.expectedIntent}`);
  }
});

await test("general tax control queries are never excluded", () => {
  for (const c of fx.generalTaxControls) {
    const result = classify(c.query);
    check(result.excluded === false, `${c.query}: excluded === false`);
  }
});

await test("H. context-free outcome wording never triggers automatic Philippine-tax restricted classification (Invariant 8)", () => {
  for (const c of fx.contextFreeOutcomeQueries) {
    const boundary = detectPhilippineTaxBoundary(c.query, "/ask");
    check(boundary.isPhilippineTax === false, `${c.query}: detectPhilippineTaxBoundary reports isPhilippineTax:false (no tax context)`);
    const gate = evaluateUpstreamRestrictedLegalConclusionGate({ query: c.query, isPhilippineTax: boundary.isPhilippineTax, ctx: {} });
    check(gate.matched === false, `${c.query}: upstream gate never reaches the classifier without established tax context`);
  }
  for (const c of fx.nonTaxQueries) {
    const boundary = detectPhilippineTaxBoundary(c.query, "/ask");
    check(boundary.isPhilippineTax === false, `${c.query}: non-tax query has isPhilippineTax:false`);
  }
});

await test("I. trust contract for the restricted path is fully consistent", () => {
  const gate = evaluateUpstreamRestrictedLegalConclusionGate({ query: "Will I win my BIR case?", isPhilippineTax: true, ctx: {} });
  check(gate.matched === true, "gate matches");
  const trust = buildResponseTrust(gate.earlyExitResponse, 0, gate.earlyExitResponse.sourceStatus);
  check(JSON.stringify(trust) === JSON.stringify(fx.trustContractForRestrictedPath.expected),
    `trust mismatch: expected ${JSON.stringify(fx.trustContractForRestrictedPath.expected)}, got ${JSON.stringify(trust)}`);
  check(gate.earlyExitResponse.responseType === "controlled_loa_legal_conclusion_restricted", "responseType is the canonical restricted type");
});

await test("J. timeout preservation: the gate's response never depends on route timeout machinery and is not a generic RETRIEVAL_TIMEOUT fallback", () => {
  const gate = evaluateUpstreamRestrictedLegalConclusionGate({ query: "Will I win my BIR case?", isPhilippineTax: true, ctx: {} });
  check(gate.earlyExitResponse.sourceStatus !== "RETRIEVAL_TIMEOUT", "restricted response is not the generic timeout fallback status");
  check(gate.earlyExitResponse.retrievalTimedOut !== true, "restricted response does not claim a retrieval timeout occurred");
  check(gate.earlyExitResponse.responseType === "controlled_loa_legal_conclusion_restricted", "correct deterministic response type, not a fallback");
});

await test("K. no prohibited language in the restricted answer text", () => {
  const gate = evaluateUpstreamRestrictedLegalConclusionGate({ query: "Will I win my BIR case?", isPhilippineTax: true, ctx: {} });
  const answer = gate.earlyExitResponse.answer.toLowerCase();
  check(!/\byou will win\b|\byou will lose\b|\bguaranteed to (?:win|succeed)\b/.test(answer), "no outcome guarantee language");
  check(!/\bthe assessment is (?:void|invalid|valid|final)\b/.test(answer), "no conclusive validity/finality determination");
  check(!/\bfiling-ready\b.{0,20}\battached\b|\bhere is your (?:protest|appeal)\b/.test(answer), "no filing-ready content generated");
  check(!/\bhas been (?:submitted|filed) (?:to|with) the bir\b/.test(answer), "no automatic submission language");
  check(gate.earlyExitResponse.controlledLoaAnswer.legalConclusionAllowed === false, "legalConclusionAllowed is false");
});

await test("mutation safety and determinism", () => {
  const input = Object.freeze({ query: "Will I win my BIR case?", isPhilippineTax: true, ctx: Object.freeze({ mode: "STANDARD_TAX" }) });
  assert.doesNotThrow(() => evaluateUpstreamRestrictedLegalConclusionGate(input), "does not throw on frozen input");
  const g1 = evaluateUpstreamRestrictedLegalConclusionGate({ query: "Will I win my BIR case?", isPhilippineTax: true, ctx: {} });
  const g2 = evaluateUpstreamRestrictedLegalConclusionGate({ query: "Will I win my BIR case?", isPhilippineTax: true, ctx: {} });
  check(JSON.stringify(g1.earlyExitResponse) === JSON.stringify(g2.earlyExitResponse), "deterministic output across repeated calls");
  assert.doesNotThrow(() => evaluateUpstreamRestrictedLegalConclusionGate(), "does not throw with no arguments");
  assert.doesNotThrow(() => evaluateUpstreamRestrictedLegalConclusionGate({ query: null, isPhilippineTax: true }), "does not throw with a null query");
});

await test("hook and feature-flag scope: ask-handler.js restricts the upstream gate to /ask and the existing TINA_ENABLE_CONTROLLED_LOA_ASK_GATE flag", () => {
  const src = readFileSync(resolve(ASK_HANDLER_PATH), "utf8");
  check(src.includes('hookConfig.hook_code === "/ask" && isControlledLoaAskGateEnabled()'),
    "ask-handler.js gates the upstream check on hook === /ask and the existing feature flag, not a new one");
  check(!/TINA_ENABLE_[A-Z0-9_]*RESTRICTED[A-Z0-9_]*\s*=/.test(src), "no new restricted-gate-specific feature flag was introduced");
});

await test("no secret appears in the fixture or report", () => {
  const combined = [FIXTURE_PATH, REPORT_PATH]
    .filter((p) => existsSync(resolve(p)))
    .map((p) => readFileSync(resolve(p), "utf8"))
    .join("\n");
  check(!/Bearer\s+ey[A-Za-z0-9_-]{10,}/.test(combined), "no bearer JWT-looking token present");
  check(!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(combined), "no private key present");
  check(!/supabase_service_role|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?ey/i.test(combined), "no Supabase service-role key present");
});

await test("diff scope: only PHASE-10A2's minimal runtime files and its own artifacts were touched", () => {
  const modifiedTracked = execSync("git diff --name-only HEAD", { encoding: "utf8" })
    .split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const forbidden = [
    "conflict-engine.js", "answer-renderer.js", "final-answer-compliance.js", "server.js",
    "package.json", "package-lock.json", ".env"
  ];
  for (const f of forbidden) check(!modifiedTracked.includes(f), `runtime file not modified: ${f}`);
  check(!modifiedTracked.some((n) => /^routes\//i.test(n)), "no route file changed");
  check(!modifiedTracked.some((n) => /^(src|client|public|frontend)\//i.test(n)), "no frontend directory file changed");

  const expectedFiles = [
    ASK_HANDLER_PATH, PIPELINE_PATH, SAFETY_MODULE_PATH, SCAFFOLD_PATH,
    FIXTURE_PATH, "tests/phase-10a2-restricted-legal-conclusion-timeout-gate-remediation-1.test.mjs", REPORT_PATH
  ];
  for (const f of expectedFiles) check(existsSync(resolve(f)), `expected PHASE-10A2 file exists: ${f}`);
});

await test("pipeline.js Step 12.65/12.66 ordering and RAG_TIMEOUT_MS value are unchanged", () => {
  const pipelineSrc = readFileSync(resolve(PIPELINE_PATH), "utf8");
  check(pipelineSrc.includes('// ── Step 12.65: Controlled LOA/eLA procedural-help /ask gate (flagged). ──'), "Step 12.65 marker unchanged");
  check(pipelineSrc.includes('// ── Step 12.66: Controlled LOA/eLA legal-conclusion safety gate ──────────'), "Step 12.66 marker unchanged");
  const askSrc = readFileSync(resolve(ASK_HANDLER_PATH), "utf8");
  check(askSrc.includes("const RAG_TIMEOUT_MS = 90000;"), "RAG_TIMEOUT_MS is unchanged at 90000ms");
});

await test("corroborating existing regression suites are cited and exist", () => {
  const corroborating = [
    "tests/phase-10a-trust-limitation-authority-confidence-release-gate-1.test.mjs",
    "tests/phase-10a1-canonical-trust-contract-and-api-forwarding-remediation-1.test.mjs",
    "tests/phase-10a1-r1-conflict-trust-contract-correction-1.test.mjs",
    "tests/patch-024c-verified-authority-gate.test.mjs",
    "tests/patch-06f-005-exact-source-limitation-wording.test.mjs",
    "tests/patch-07a-003-authority-state-response-policy-and-gate-compatibility.test.mjs",
    "tests/patch-07a-008-source-limitation-mode-boundary-hardening.test.mjs",
    "tests/phase-09z-controlled-loa-answer-ask-wiring-gate-1.test.mjs",
    "tests/phase-09zh-controlled-loa-live-path-remediation-1.test.mjs",
    "tests/phase-09zi-controlled-loa-unsafe-legal-wording-remediation-1.test.mjs",
    "tests/phase-09zj-context-free-outcome-query-safety-contract-clarification-1.test.mjs",
    "tests/phase-09-gate-closure-2.test.mjs",
    "tests/patch-025a-rev3-ask-handler-mapper.test.mjs"
  ];
  for (const suitePath of corroborating) {
    check(existsSync(resolve(suitePath)), `corroborating suite exists: ${suitePath}`);
  }
});

await test("report exists and PHASE-10A3/Phase 10B status is correctly recorded", () => {
  check(existsSync(resolve(REPORT_PATH)), "report exists");
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/PHASE-10A3/i.test(report), "report references PHASE-10A3 as the (blocked) next task");
  check(/independent.{0,20}(gpt-5\.5|codex)/i.test(report), "report states mandatory independent review");
});

await test("CURRENT_STATE.md records PHASE-10A2 without marking Phase 10A itself closed/complete", () => {
  const current = readFileSync(resolve(CURRENT_STATE_PATH), "utf8");
  check(current.includes(PATCH), "CURRENT_STATE contains the 10A2 patch identifier");
  const closureClaimRe = /phase 10a (is |remains |now )?(formally )?(closed|complete)\b/gi;
  let unsafeClosureClaim = false;
  let closureMatch;
  while ((closureMatch = closureClaimRe.exec(current)) !== null) {
    const precedingText = current.slice(Math.max(0, closureMatch.index - 20), closureMatch.index).toLowerCase();
    if (!/do not mark|not mark|before .*(is )?closed/.test(precedingText)) {
      unsafeClosureClaim = true;
      break;
    }
  }
  check(!unsafeClosureClaim, "CURRENT_STATE does not declare Phase 10A itself closed/complete outside a 'do not mark ... until' guard sentence");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
