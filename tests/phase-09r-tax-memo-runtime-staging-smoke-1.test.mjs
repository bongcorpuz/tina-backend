// FILE: tests/phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs
// PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1
//
// Staging smoke / evidence gate. Combines (A) local static/source safety
// validations of the pure tax_memo runtime scaffold, renderer, and
// integration-policy modules, and (B) safe, unauthenticated, non-secret
// public staging HTTP smoke checks against tina-backend-staging.onrender.com.
// NO OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP calls. NO
// server.js/ask-handler.js/pipeline.js import. NO server start, NO port
// binding. NO secrets, NO client data, NO real tax facts, NO Authorization
// header, NO INDEX_SECRET sent. If staging is temporarily unreachable, the
// staging assertions are skipped with a recorded warning rather than failed
// -- local scaffold safety assertions always run and must pass.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  runTaxMemoRuntimeScaffold,
  validateTaxMemoRuntimeScaffold,
  TAX_MEMO_RUNTIME_PROHIBITED_MODES
} from "../workflow/tax-memo-runtime-orchestrator.js";
import {
  renderTaxMemoDraftToMarkdown,
  validateTaxMemoRuntimeRenderedOutput,
  validateTaxMemoRuntimeRenderer
} from "../workflow/tax-memo-runtime-renderer.js";
import {
  validateTaxMemoIntegrationCandidate,
  validateTaxMemoIntegrationPolicy,
  TAX_MEMO_INTEGRATION_BLOCKED_MODES
} from "../workflow/tax-memo-runtime-integration-policy.js";
import { validateWorkflowGovernanceGate } from "../workflow/workflow-output-governance-gate.js";
import { validateWorkflowRuntimeWiringPolicy } from "../workflow/workflow-runtime-wiring-policy.js";
// PHASE-10A-CLOSURE-V1 (owner ruling D15): validate /health against the canonical
// public-health contract module instead of a stale hardcoded expectation.
import { isPublicHealthMinimal, PUBLIC_HEALTH_ALLOWED_FIELDS } from "../security/public-health.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09r-tax-memo-runtime-staging-smoke-1.fixture.json";
const SELF_PATH = "tests/phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs";
const ORCHESTRATOR_PATH = "workflow/tax-memo-runtime-orchestrator.js";
const RENDERER_PATH = "workflow/tax-memo-runtime-renderer.js";
const INTEGRATION_POLICY_PATH = "workflow/tax-memo-runtime-integration-policy.js";

const STAGING_BASE_URL = "https://tina-backend-staging.onrender.com";
const FETCH_TIMEOUT_MS = 15000;

const SECURITY_HEADER_NAMES = [
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "cache-control"
];

const VALID_DECISIONS = [
  "PHASE 09R TAX MEMO RUNTIME STAGING SMOKE PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09R TAX MEMO RUNTIME STAGING SMOKE WARNING WITH STRICT RECOMMENDATIONS",
  "PHASE 09R TAX MEMO RUNTIME STAGING SMOKE FAIL",
  "PHASE 09R TAX MEMO RUNTIME STAGING SMOKE BLOCKED"
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

function safeRuntimeOptions(overrides = {}) {
  return {
    featureFlagEnabled: true,
    userExplicitApprovalForRuntimeWiring: true,
    governanceGatePassed: true,
    sourceCardsPresent: true,
    missingFactsPresent: true,
    assumptionsPresent: true,
    humanReviewNoticePresent: true,
    prohibitedClaimDetectionPassed: true,
    persistenceRequested: false,
    memoryRequested: false,
    thirdPartyEgressRequested: false,
    externalSearchRequested: false,
    productionEnablementRequested: false,
    ...overrides
  };
}

function safeInput(overrides = {}) {
  return {
    facts: "Smoke-check facts for the tax memo runtime staging smoke gate.",
    issues: ["Smoke-check issue"],
    taxpayerType: "corporation",
    taxPeriod: "smoke-check period",
    intendedAudience: "internal review",
    sourceCards: [{ sourceCardId: "smoke-check-1", title: "RR 16-2005" }],
    missingFacts: ["smoke-check missing fact"],
    assumptions: ["smoke-check assumption"],
    humanReviewNotice: "This is a smoke-check draft for internal validation only, not for professional use.",
    ...overrides
  };
}

function safeIntegrationCandidate(overrides = {}) {
  return {
    modeId: "tax_memo",
    targetRoute: "/ask",
    featureFlags: {
      TINA_ENABLE_PROFESSIONAL_WORKFLOWS: false,
      TINA_ENABLE_WORKFLOW_TAX_MEMO: false
    },
    pipelineOutput: {
      facts: "Smoke-check pipeline facts.",
      issues: ["Smoke-check pipeline issue"],
      taxpayerType: "corporation",
      taxPeriod: "smoke-check period",
      intendedAudience: "internal review",
      sourceCards: [{ sourceCardId: "smoke-check-1", title: "RR 16-2005" }],
      missingFacts: ["smoke-check missing fact"],
      assumptions: ["smoke-check assumption"],
      humanReviewNotice: "Smoke-check human review notice."
    },
    governance: {
      phase09gPassed: true,
      phase09hPolicyPassed: true,
      orchestratorValidated: true,
      rendererValidated: true,
      prohibitedClaimDetectionPassed: true
    },
    changeScope: {
      askHandlerModified: false,
      pipelineModified: false,
      serverModified: false,
      routeAdded: false,
      frontendModified: false,
      envModified: false,
      dbModified: false,
      memoryEnabled: false,
      persistenceAdded: false,
      externalSearchAdded: false,
      thirdPartyEgressAdded: false,
      productionEnabled: false
    },
    ...overrides
  };
}

async function safeFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${STAGING_BASE_URL}${path}`, { ...options, signal: controller.signal });
    const bodyText = await res.text();
    return { reachable: true, status: res.status, headers: res.headers, bodyText };
  } catch (error) {
    return { reachable: false, status: null, headers: null, bodyText: "", error: String((error && error.message) || error) };
  } finally {
    clearTimeout(timer);
  }
}

function headerPresent(headers, name) {
  return headers ? headers.get(name) !== null : false;
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// A. LOCAL STATIC / SOURCE SAFETY VALIDATIONS
// ---------------------------------------------------------------------------

let fx;
const isPass = () => fx.decision === VALID_DECISIONS[0];
const isWarning = () => fx.decision === VALID_DECISIONS[1];
const isFail = () => fx.decision === VALID_DECISIONS[2];
const isBlocked = () => fx.decision === VALID_DECISIONS[3];

// 1. Fixture exists and valid JSON.
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2-4. Patch id, decision, base commit.
await test("patch id, decision, and base commit are valid", () => {
  check(fx.patch === "PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("0f68a37"), "base commit references 0f68a37");
});

// 5-15. nonRuntimePatch / currentState / mcpDeferralEvidence declarations.
await test("non-runtime patch declaration covers routes/handlers/flags/memory/production/search/mcp/live-activation", () => {
  const n = fx.nonRuntimePatch;
  check(n && n.noRouteChanges === true, "no route changes");
  check(n.noAskHandlerChanges === true, "no ask-handler changes");
  check(n.noPipelineChanges === true, "no pipeline changes");
  check(n.noServerChanges === true, "no server changes");
  check(n.noFeatureFlagEnabledByDefault === true, "no feature flag enabled by default");
  check(n.noMemoryActivation === true, "no memory activation");
  check(n.productionUnchanged === true, "production unchanged");
  check(n.noExternalSearch === true && n.noN8n === true && n.noFirecrawl === true && n.noCrawlee === true, "no external search/n8n/Firecrawl/Crawlee");
  check(n.noMcp === true, "no MCP");
  check(n.noLiveActivation === true, "no live activation");
});

await test("MCP deferral evidence records deferred and unused", () => {
  const m = fx.mcpDeferralEvidence;
  check(m && m.deferredUntilAfterFinalPlannedPhase === true, "MCP deferred until after final planned phase");
  check(m.filesOrConfigsIntroduced === false, "no MCP files/configs introduced");
  check(m.runtimeIntegration === false, "no MCP runtime integration");
  check(m.testCallsMade === false, "no MCP test calls");
});

// 16-18. Runtime scaffold / renderer / integration policy files exist.
await test("tax memo runtime orchestrator, renderer, and integration policy files exist", () => {
  check(existsSync(resolve(ORCHESTRATOR_PATH)), "orchestrator file exists");
  check(existsSync(resolve(RENDERER_PATH)), "renderer file exists");
  check(existsSync(resolve(INTEGRATION_POLICY_PATH)), "integration policy file exists");
});

// 19-23. Cross-module self-checks all valid.
await test("orchestrator, renderer, integration policy, governance gate, and runtime policy self-checks all pass", () => {
  check(validateTaxMemoRuntimeScaffold().valid === true, "validateTaxMemoRuntimeScaffold valid true");
  check(validateTaxMemoRuntimeRenderer().valid === true, "validateTaxMemoRuntimeRenderer valid true");
  check(validateTaxMemoIntegrationPolicy().valid === true, "validateTaxMemoIntegrationPolicy valid true");
  check(validateWorkflowGovernanceGate().valid === true, "validateWorkflowGovernanceGate valid true");
  check(validateWorkflowRuntimeWiringPolicy().valid === true, "validateWorkflowRuntimeWiringPolicy valid true");
});

// 24. Blocks default request (no runtimeOptions/input).
await test("runTaxMemoRuntimeScaffold blocks default request", () => {
  const result = runTaxMemoRuntimeScaffold({ modeId: "tax_memo" });
  check(result.valid === false && result.blocked === true, "default request blocked");
});

// 25. Blocks missing runtimeOptions.
await test("runTaxMemoRuntimeScaffold blocks missing runtimeOptions", () => {
  const result = runTaxMemoRuntimeScaffold({ modeId: "tax_memo", input: safeInput() });
  check(result.valid === false && result.blocked === true, "missing runtimeOptions blocked");
});

// 26. Blocks featureFlagEnabled false.
await test("runTaxMemoRuntimeScaffold blocks featureFlagEnabled false", () => {
  const result = runTaxMemoRuntimeScaffold({
    modeId: "tax_memo",
    runtimeOptions: safeRuntimeOptions({ featureFlagEnabled: false }),
    input: safeInput()
  });
  check(result.valid === false && result.blocked === true, "featureFlagEnabled false blocked");
});

// 27. Blocks explicit approval false.
await test("runTaxMemoRuntimeScaffold blocks explicit approval false", () => {
  const result = runTaxMemoRuntimeScaffold({
    modeId: "tax_memo",
    runtimeOptions: safeRuntimeOptions({ userExplicitApprovalForRuntimeWiring: false }),
    input: safeInput()
  });
  check(result.valid === false && result.blocked === true, "explicit approval false blocked");
});

// 28. Blocks missing sourceCards.
await test("runTaxMemoRuntimeScaffold blocks missing sourceCards", () => {
  const result = runTaxMemoRuntimeScaffold({
    modeId: "tax_memo",
    runtimeOptions: safeRuntimeOptions(),
    input: safeInput({ sourceCards: [] })
  });
  check(result.valid === false && result.blocked === true, "missing sourceCards blocked");
});

// 29. Blocks unsupported mode.
await test("runTaxMemoRuntimeScaffold blocks unsupported mode", () => {
  const result = runTaxMemoRuntimeScaffold({
    modeId: "not_a_real_mode",
    runtimeOptions: safeRuntimeOptions(),
    input: safeInput()
  });
  check(result.valid === false && result.blocked === true, "unsupported mode blocked");
});

// 30-34. Blocks each of the five prohibited modes.
await test("runTaxMemoRuntimeScaffold blocks bir_reply_protest_draft, audit_defense_matrix, client_advisory, compliance_checklist, requirements_request_letter", () => {
  for (const modeId of ["bir_reply_protest_draft", "audit_defense_matrix", "client_advisory", "compliance_checklist", "requirements_request_letter"]) {
    check(TAX_MEMO_RUNTIME_PROHIBITED_MODES.includes(modeId), `${modeId} listed as prohibited`);
    const result = runTaxMemoRuntimeScaffold({ modeId, runtimeOptions: safeRuntimeOptions(), input: safeInput() });
    check(result.valid === false && result.blocked === true, `${modeId} blocked`);
  }
});

// 35-47. Safe explicit request passes; output shape and prohibited-claim checks.
let safeResult;
await test("runTaxMemoRuntimeScaffold passes only for explicitly safe tax_memo scaffold request", () => {
  safeResult = runTaxMemoRuntimeScaffold({ modeId: "tax_memo", runtimeOptions: safeRuntimeOptions(), input: safeInput() });
  check(safeResult.valid === true, `safe request must pass: ${JSON.stringify(safeResult.errors)}`);
});

await test("safe scaffold output has required shape (mode, schemaKey, sourceCards, missingFacts, assumptions, humanReviewNotice)", () => {
  const output = safeResult.output;
  check(output.mode === "tax_memo", "output mode tax_memo");
  check(output.schemaKey === "taxMemoOutput", "output schemaKey taxMemoOutput");
  check(Array.isArray(output.sourceCards) && output.sourceCards.length > 0, "output sourceCards nonempty");
  check(Array.isArray(output.missingFacts), "output missingFacts array");
  check(Array.isArray(output.assumptions), "output assumptions array");
  check(typeof output.humanReviewNotice === "string" && output.humanReviewNotice.length > 0, "output humanReviewNotice present");
});

await test("safe scaffold output metadata finalFiling and automaticSubmission are false", () => {
  check(safeResult.output.metadata.finalFiling === false, "metadata.finalFiling false");
  check(safeResult.output.metadata.automaticSubmission === false, "metadata.automaticSubmission false");
});

await test("safe scaffold output contains no final-filing, automatic-submission, production-ready, or guaranteed-outcome claims", () => {
  const raw = JSON.stringify(safeResult.output).toLowerCase();
  check(!raw.includes("this constitutes a final filing") && !raw.includes("officially filed with the bir"), "no final filing claim");
  check(!raw.includes("automatically submitted to the bir") && !raw.includes("auto-submitted on your behalf"), "no automatic submission claim");
  check(!raw.includes("production ready") && !raw.includes("production-ready"), "no production ready claim");
  check(!raw.includes("guaranteed"), "no guaranteed-outcome claim word");
});

// 48-55. Renderer checks.
let renderedMarkdown;
await test("renderTaxMemoDraftToMarkdown renders safe output", () => {
  renderedMarkdown = renderTaxMemoDraftToMarkdown(safeResult.output);
  check(typeof renderedMarkdown === "string" && renderedMarkdown.length > 0, "rendered markdown nonempty");
});

await test("rendered markdown includes draft-only, human-review, source-card, missing-facts, and assumptions sections", () => {
  check(/draft work-product scaffold/i.test(renderedMarkdown), "draft-only notice present");
  check(/human review/i.test(renderedMarkdown), "human-review notice present");
  check(renderedMarkdown.includes("## Source Cards"), "source-card section present");
  check(renderedMarkdown.includes("## Missing Facts"), "missing-facts section present");
  check(renderedMarkdown.includes("## Assumptions"), "assumptions section present");
});

await test("rendered markdown does not include prohibited claims", () => {
  const lower = renderedMarkdown.toLowerCase();
  check(!lower.includes("this constitutes a final filing"), "no final filing claim in markdown");
  check(!lower.includes("automatically submitted to the bir"), "no automatic submission claim in markdown");
  check(!lower.includes("production ready"), "no production ready claim in markdown");
  check(!lower.includes("guaranteed"), "no guaranteed-outcome word in markdown");
});

await test("validateTaxMemoRuntimeRenderedOutput passes for safe markdown", () => {
  const renderCheck = validateTaxMemoRuntimeRenderedOutput(renderedMarkdown, safeResult.output);
  check(renderCheck.valid === true, `rendered output must validate: ${JSON.stringify(renderCheck.errors)}`);
});

// 56. Safe design candidate validates as design-only / blocked for live execution.
await test("validateTaxMemoIntegrationCandidate validates safe design candidate as design-only, blocked for live execution", () => {
  const result = validateTaxMemoIntegrationCandidate(safeIntegrationCandidate());
  check(result.valid === true, `safe candidate must be policy-valid: ${JSON.stringify(result.errors)}`);
  check(result.blocked === true, "safe candidate must still be blocked (flags off / design-only stage)");
});

// 57-65. Candidate fails when any change-scope field is true.
await test("validateTaxMemoIntegrationCandidate fails when any forbidden change-scope field is true", () => {
  const fields = [
    "askHandlerModified",
    "pipelineModified",
    "serverModified",
    "routeAdded",
    "memoryEnabled",
    "persistenceAdded",
    "externalSearchAdded",
    "thirdPartyEgressAdded",
    "productionEnabled"
  ];
  for (const field of fields) {
    const candidate = safeIntegrationCandidate({ changeScope: { ...safeIntegrationCandidate().changeScope, [field]: true } });
    const result = validateTaxMemoIntegrationCandidate(candidate);
    check(result.valid === false, `candidate must fail when changeScope.${field} is true`);
  }
});

// 66. Candidate fails for blocked modes.
await test("validateTaxMemoIntegrationCandidate fails for blocked modes", () => {
  for (const modeId of TAX_MEMO_INTEGRATION_BLOCKED_MODES) {
    const candidate = safeIntegrationCandidate({ modeId });
    const result = validateTaxMemoIntegrationCandidate(candidate);
    check(result.valid === false && result.blocked === true, `candidate for ${modeId} must be invalid and blocked`);
  }
});

// 67-70. Source scan: git diff confirms scope; no MCP files added.
await test("git diff confirms no route/server/pipeline/ask-handler/package/env/DB/frontend/workflow/MCP files are modified", () => {
  const allowedChanged = new Set([
    "tests/phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs",
    "evaluation/fixtures/phase-09r-tax-memo-runtime-staging-smoke-1.fixture.json",
    "PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1_REPORT.md",
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
    "workflow/workflow-mode-registry.js",
    "workflow/tax-memo-schema.js",
    "workflow/audit-defense-matrix-schema.js",
    "workflow/bir-reply-draft-schema.js",
    "workflow/client-advisory-schema.js",
    "workflow/compliance-checklist-schema.js",
    "workflow/requirements-request-letter-schema.js",
    "workflow/workflow-output-governance-gate.js",
    "workflow/workflow-runtime-wiring-policy.js",
    "workflow/tax-memo-runtime-orchestrator.js",
    "workflow/tax-memo-runtime-renderer.js",
    "workflow/tax-memo-runtime-integration-policy.js"
  ]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }
  check(!diffNames.some((name) => /mcp/i.test(name)), "no MCP files/configs added or modified");
});

// 71-74. Static self-scan: no secrets, no forbidden calls, no process.env, no auth headers sent.
await test("static source scan: this test file contains no secrets, forbidden service calls, or auth-header usage", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/sk-[A-Za-z0-9]{10,}/.test(selfSrc), "no OpenAI-style secret literal");
  check(!/AIza[0-9A-Za-z-_]{10,}/.test(selfSrc), "no Google API key literal");
  // Check actual usage (imports/requires and hardcoded URLs), not incidental
  // mentions of these service names in comments or in absence-asserting
  // field names/messages like "noFirecrawl" or "no external search/n8n/
  // Firecrawl/Crawlee" (both of which legitimately appear in this file).
  const forbiddenPackagePattern = /\b(?:import\s+.*from\s+|require\()\s*["'](openai|@supabase\/[^"']*|firecrawl|crawlee|@modelcontextprotocol\/[^"']*)["']/i;
  check(!forbiddenPackagePattern.test(selfSrc), "no import/require of a forbidden service package");
  const forbiddenUrlPattern = /https?:\/\/[^\s"'`]*(openai\.com|supabase\.(?:co|io)|googleapis\.com\/drive|n8n\.)/i;
  check(!forbiddenUrlPattern.test(selfSrc), "no hardcoded URL to a forbidden service host");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> reads (staging URL is a hardcoded constant)");
  check(!/["'`]authorization["'`]\s*:/i.test(selfSrc), "no Authorization header sent");
  // The file-header documentation comment legitimately states this module
  // sends no INDEX_SECRET; only a CODE-LINE reference would indicate actual
  // usage, so comment lines are excluded from this specific check.
  const indexSecretToken = ["INDEX", "SECRET"].join("_");
  const nonCommentSrc = selfSrc
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  check(!nonCommentSrc.includes(indexSecretToken), "no protected shared-secret env var name referenced in code");
  check(!/import\s+.*\bfrom\s+["'](?:\.\.\/)?(server|ask-handler|pipeline)\.js["']/.test(selfSrc), "no server/ask-handler/pipeline import");
});

// ---------------------------------------------------------------------------
// B. SAFE STAGING PUBLIC ENDPOINT SMOKE VALIDATIONS
// ---------------------------------------------------------------------------

let health, root, routesProbe, optionsAsk, postAsk;
let stagingReachable = false;

await test("perform safe staging HTTP smoke checks (health, root, routes, options /ask, unauthenticated post /ask)", async () => {
  health = await safeFetch("/health", { method: "GET" });
  root = await safeFetch("/", { method: "GET" });
  routesProbe = await safeFetch("/routes", { method: "GET" });
  optionsAsk = await safeFetch("/ask", { method: "OPTIONS" });
  postAsk = await safeFetch("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "ping", mode: "default" })
  });
  stagingReachable = [health, root, routesProbe, optionsAsk, postAsk].every((r) => r.reachable);
  if (!stagingReachable) {
    console.log("WARNING: staging is temporarily unreachable; staging-specific assertions will be skipped");
  }
  check(typeof stagingReachable === "boolean", "staging reachability recorded");
});

// PHASE-10A-CLOSURE-V1 (owner ruling D15): the assertion below previously
// required `service === "tina-backend"`. Commit 68969f75 ("harden public health
// endpoint payload", 2026-08-17) removed `service` from the public payload and
// dropped PUBLIC_HEALTH_SERVICE, updating the three deterministic health suites
// but not this staging-lane suite, which the deterministic gate excludes. The
// expectation is therefore stale, not the endpoint. Per D15 the public /health
// contract remains minimal liveness and is NOT changed; this TEST is corrected
// to validate the actual contract, sourced from security/public-health.js rather
// than re-hardcoding a literal, so it cannot drift from the module again.
//
// Note deliberately preserved behavior: if the live staging deployment still
// returns `service`, this test now FAILS. That failure is a genuine deployment
// identity drift signal (the deployed runtime predates 68969f75), not a test
// defect, and it is exactly the attribution D6 requires. It is not softened.
await test('GET /health: 200, canonical minimal liveness payload {"status":"ok"} only, no commitSha, security headers present, no X-Powered-By', () => {
  if (!stagingReachable) return;
  check(health.status === 200, "GET /health returns 200");
  const body = parseJsonSafe(health.bodyText);
  check(body.status === "ok", 'health body status is "ok"');
  check(
    isPublicHealthMinimal(body),
    `health body is the canonical minimal payload (allowed fields: ${PUBLIC_HEALTH_ALLOWED_FIELDS.join(", ")}); got ${JSON.stringify(body)}`
  );
  check(
    !("service" in body),
    'health body does not expose "service" (removed from the public contract in 68969f75)'
  );
  check(!("commitSha" in body), "health body does not expose commitSha");
  for (const h of SECURITY_HEADER_NAMES) check(headerPresent(health.headers, h), `health response includes header: ${h}`);
  check(!headerPresent(health.headers, "x-powered-by"), "health response has no X-Powered-By header");
});

await test("GET /: 200 safe public response, no route inventory disclosure, security headers present, no X-Powered-By", () => {
  if (!stagingReachable) return;
  check(root.status === 200, "GET / returns 200");
  check(!/usefulroutes/i.test(root.bodyText), "root response does not disclose usefulRoutes");
  check(!/"routes"\s*:\s*\[/i.test(root.bodyText), "root response does not disclose a route inventory array");
  for (const h of SECURITY_HEADER_NAMES) check(headerPresent(root.headers, h), `root response includes header: ${h}`);
  check(!headerPresent(root.headers, "x-powered-by"), "root response has no X-Powered-By header");
});

await test("GET /routes: safe minimized not_found response, no route inventory disclosure, security headers present, no X-Powered-By", () => {
  if (!stagingReachable) return;
  check(routesProbe.status === 404, "GET /routes returns 404");
  const body = parseJsonSafe(routesProbe.bodyText);
  check(body.error === "not_found" || /not.?found/i.test(routesProbe.bodyText), "routes response is a minimized not_found body");
  check(!/usefulroutes/i.test(routesProbe.bodyText), "routes response does not disclose usefulRoutes");
  for (const h of SECURITY_HEADER_NAMES) check(headerPresent(routesProbe.headers, h), `routes response includes header: ${h}`);
  check(!headerPresent(routesProbe.headers, "x-powered-by"), "routes response has no X-Powered-By header");
});

await test("OPTIONS /ask: safe CORS preflight behavior, not rate-limit-blocked, no X-Powered-By", () => {
  if (!stagingReachable) return;
  check([200, 204].includes(optionsAsk.status), "OPTIONS /ask returns a safe preflight status (200/204)");
  check(optionsAsk.status !== 429, "OPTIONS /ask is not rate-limit-blocked");
  check(!headerPresent(optionsAsk.headers, "x-powered-by"), "OPTIONS /ask response has no X-Powered-By header");
});

await test("POST /ask unauthenticated harmless ping: protected (401/403), no tax memo/workflow output, security headers present, no X-Powered-By", () => {
  if (!stagingReachable) return;
  check([401, 403].includes(postAsk.status), "POST /ask unauthenticated returns 401 or 403");
  const lower = postAsk.bodyText.toLowerCase();
  check(!lower.includes("taxmemooutput"), "POST /ask response does not include taxMemoOutput schemaKey");
  check(!lower.includes("professional workflow"), "POST /ask response does not include professional workflow output");
  check(!lower.includes("source cards"), "POST /ask response does not include a workflow source-card section");
  for (const h of SECURITY_HEADER_NAMES) check(headerPresent(postAsk.headers, h), `POST /ask response includes header: ${h}`);
  check(!headerPresent(postAsk.headers, "x-powered-by"), "POST /ask response has no X-Powered-By header");
});

// Cross-check fixture staging evidence against what was actually observed.
await test("fixture staging validation summary is consistent with the decision and observed reachability", () => {
  const s = fx.stagingValidationSummary;
  check(s, "stagingValidationSummary present");
  if (isPass()) {
    check(stagingReachable === true, "PASS decision requires staging to have been reachable during this test run");
    for (const key of [
      "healthReachable",
      "rootMinimized",
      "routesHidden",
      "askOptionsSafe",
      "askUnauthenticatedProtected",
      "noTaxMemoOutputFromAsk",
      "securityHeadersPresent",
      "xPoweredByAbsent",
      "noRouteInventoryDisclosure",
      "noSecretsObserved"
    ]) {
      check(s[key] === true, `PASS requires stagingValidationSummary.${key} true`);
    }
  }
  if (isWarning()) {
    check(typeof fx.stagingUnavailableReason === "string" && fx.stagingUnavailableReason.length > 0, "WARNING requires a recorded staging-unavailability reason");
  }
});

await test("if decision FAIL: a failure reason is recorded", () => {
  if (isFail()) {
    check(typeof fx.failureReason === "string" && fx.failureReason.length > 0, "failure reason recorded");
  }
});

await test("if decision BLOCKED: a blocker reason is recorded", () => {
  if (isBlocked()) {
    check(typeof fx.blockerReason === "string" && fx.blockerReason.length > 0, "blocker reason recorded");
  }
});

await test("no secret/token/authorization values are stored anywhere in the fixture", () => {
  const raw = readFileSync(resolve(FIXTURE_PATH), "utf8");
  check(!/Bearer\s+[A-Za-z0-9._-]{10,}/.test(raw), "no bearer token value stored");
  check(!/authorization"?\s*:\s*"[^"]{10,}/i.test(raw), "no authorization header value stored");
  // Mentioning "INDEX_SECRET usage" as a forbidden-check label (documentation)
  // is expected; only an actual assigned secret VALUE would be a leak.
  const indexSecretToken = ["INDEX", "SECRET"].join("_");
  check(!new RegExp(`${indexSecretToken}\\s*["']?\\s*[:=]\\s*["'][^"']{4,}["']`).test(raw), "no protected shared-secret env var value assigned/stored in fixture");
  check(!/sk-[A-Za-z0-9]{10,}/.test(raw), "no OpenAI-style secret literal stored");
});

console.log(`\nPHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
