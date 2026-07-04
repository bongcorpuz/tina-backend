// PATCH-08S-STAGING-SECURITY-SMOKE-1 - staging security smoke evidence test.
// Static, JSON-based validation only. Performs NO HTTP, does NOT start the
// server, imports no server.js/runtime modules, requires no env vars, and prints
// no env values. It validates the smoke evidence fixture and its integration
// with the prior Phase 8S fixtures.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SMOKE_PATH = "evaluation/fixtures/phase-8s-staging-security-smoke-1.fixture.json";
const INVENTORY_PATH = "evaluation/fixtures/phase-8s-security-route-inventory-1.fixture.json";
const POLICY_PATH = "evaluation/fixtures/phase-8s-security-policy-fixture-1.fixture.json";
const TENANT_PATH = "evaluation/fixtures/phase-8s-tenant-isolation-gate-1.fixture.json";
const SECRETS_PATH = "evaluation/fixtures/phase-8s-secrets-env-logging-safety-gate-1.fixture.json";
const SCAFFOLD_PATH = "evaluation/fixtures/phase-8s-security-headers-cors-rate-limit-scaffold-1.fixture.json";

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
const load = (p) => JSON.parse(readFileSync(resolve(p), "utf8"));

const VALID_DECISIONS = [
  "STAGING SECURITY SMOKE PASS WITH STRICT RECOMMENDATIONS",
  "STAGING SECURITY SMOKE WARNING WITH STRICT RECOMMENDATIONS",
  "STAGING SECURITY SMOKE BLOCKED",
  "STAGING SECURITY SMOKE FAIL"
];
const VALID_RESULTS = ["PASS", "WARNING", "FAIL", "SKIPPED", "BLOCKED", "INCONCLUSIVE"];

let smoke, inventory, policy, tenant, secrets, scaffold;

await test("staging smoke fixture exists and all referenced fixtures are valid JSON", () => {
  check(existsSync(resolve(SMOKE_PATH)), `${SMOKE_PATH} must exist`);
  smoke = load(SMOKE_PATH);
  inventory = load(INVENTORY_PATH);
  policy = load(POLICY_PATH);
  tenant = load(TENANT_PATH);
  secrets = load(SECRETS_PATH);
  scaffold = load(SCAFFOLD_PATH);
});

await test("required top-level sections exist", () => {
  const required = [
    "patch", "decision", "baseCommit", "smokeVersion", "nonRuntimePatch", "remediationCommit",
    "remediationIntegration", "stagingTarget", "deploymentFreshness", "smokeExecution",
    "sourceArtifacts", "routeInventoryIntegration", "securityPolicyIntegration",
    "tenantIsolationIntegration", "secretsEnvLoggingIntegration", "headersCorsRateLimitScaffoldIntegration",
    "corsRemediationIntegration", "checks", "corsSmokeResults", "securityHeadersSmokeResults",
    "rateLimitSmokeResults", "publicReconSmokeResults", "diagnosticOutputSmokeResults",
    "authEndpointSmokeResults", "errorDisclosureSmokeResults", "skippedChecks", "blockedChecks",
    "observedRisks", "controlsNotImplemented", "policyOnlyControls", "phase9Blockers",
    "futureSmokeRequirements", "prohibitedClaims", "deferredBoundaries", "phase8MemoryPolicy",
    "phase8XDiagnosticSeparation", "futurePatchDependencies", "testCases"
  ];
  for (const key of required) check(Object.prototype.hasOwnProperty.call(smoke, key), `missing section: ${key}`);
  check(smoke.patch.id === "PATCH-08S-STAGING-SECURITY-SMOKE-1", "patch id");
});

await test("decision is one of the valid smoke decisions", () => {
  check(VALID_DECISIONS.includes(smoke.decision), `invalid decision: ${smoke.decision}`);
});

await test("patch is marked non-runtime", () => {
  check(smoke.nonRuntimePatch === true, "nonRuntimePatch must be true");
  const d = smoke.nonRuntimeDeclaration;
  check(d.noRuntimeChangeInThisPatch === true && d.noDeploymentInThisPatch === true && d.noPackageChange === true, "non-runtime declaration flags");
});

await test("remediation integration references PATCH-08S-CORS-STAGING-REMEDIATION-1 and commit a396f67", () => {
  check(smoke.remediationCommit === "a396f67", "remediationCommit a396f67");
  check(smoke.remediationIntegration.remediationPatchId === "PATCH-08S-CORS-STAGING-REMEDIATION-1", "remediation patch id");
  check(smoke.remediationIntegration.remediationCommit === "a396f67", "remediation integration commit");
  check(smoke.corsRemediationIntegration.remediationCommit === "a396f67", "cors remediation integration commit");
});

await test("staging target source is recorded and contains no secrets", () => {
  check(typeof smoke.stagingTarget.baseUrlSource === "string" && smoke.stagingTarget.baseUrlSource.length > 0, "baseUrlSource recorded");
  check(smoke.stagingTarget.baseUrlSecretBearing === false, "base URL not secret-bearing");
  const raw = readFileSync(resolve(SMOKE_PATH), "utf8");
  check(!/sk-[A-Za-z0-9]{10,}|service_role|SUPABASE_SERVICE|eyJ[A-Za-z0-9]/.test(raw), "fixture contains no obvious secret markers");
});

await test("smoke execution timestamp and deployment freshness are recorded", () => {
  check(typeof smoke.smokeExecution.timestamp === "string" && smoke.smokeExecution.timestamp.length > 0, "timestamp recorded");
  check(typeof smoke.deploymentFreshness.freshnessStatus === "string", "freshnessStatus recorded");
  check(["confirmed", "behavior_confirmed", "inconclusive", "stale"].includes(smoke.deploymentFreshness.freshnessStatus), "valid freshnessStatus");
});

await test("route inventory integration matches recomputed counts", () => {
  const ri = smoke.routeInventoryIntegration;
  const r = inventory.routes;
  const has = (x, p) => Array.isArray(x.requiredFuturePolicies) && x.requiredFuturePolicies.includes(p);
  check(ri.totalRoutes === r.length && r.length === 30, "30 total routes");
  check(ri.expensiveRouteCount === r.filter((x) => x.expensiveOperation).length && ri.expensiveRouteCount === 22, "22 expensive");
  check(ri.tenantIsolationRouteCount === r.filter((x) => has(x, "tenant_isolation")).length && ri.tenantIsolationRouteCount === 17, "17 tenant_isolation");
  check(ri.noQuerySecretAdminRouteCount === r.filter((x) => has(x, "no_query_secret")).length && ri.noQuerySecretAdminRouteCount === 9, "9 no_query_secret");
  check(ri.modeRouteCount === r.filter((x) => x.routeGroup === "mode").length && ri.modeRouteCount === 12, "12 mode");
  check(ri.conversationRouteCount === r.filter((x) => x.routeGroup === "conversation").length && ri.conversationRouteCount === 3, "3 conversation");
  check(ri.debugRouteCount === r.filter((x) => x.classification === "debug").length && ri.debugRouteCount === 1, "1 debug");
  check(ri.publicRouteCount === r.filter((x) => x.classification === "public").length && ri.publicRouteCount === 6, "6 public");
  const health = r.find((x) => x.path === "/health");
  check(ri.healthPerformsDbRead === true && health.dbReadPossible === true, "/health DB read");
  check(ri.healthRequiresRateLimit === true && health.requiredFuturePolicies.includes("rate_limit"), "/health rate_limit");
});

await test("policy/gate/scaffold integrations reference the correct patch ids", () => {
  check(smoke.securityPolicyIntegration.securityPolicyPatchId === policy.patch.id, "security policy patch id");
  check(smoke.tenantIsolationIntegration.tenantIsolationGatePatchId === tenant.patch.id, "tenant gate patch id");
  check(smoke.secretsEnvLoggingIntegration.secretsEnvLoggingGatePatchId === secrets.patch.id, "secrets gate patch id");
  check(smoke.headersCorsRateLimitScaffoldIntegration.scaffoldPatchId === scaffold.patch.id, "scaffold patch id");
});

await test("checks contain safe metadata only and store no tokens/cookies/secrets/full bodies", () => {
  check(Array.isArray(smoke.checks) && smoke.checks.length > 0, "checks present");
  for (const c of smoke.checks) {
    check(typeof c.checkId === "string" && typeof c.method === "string" && typeof c.path === "string", `${c.checkId} core metadata`);
    check(VALID_RESULTS.includes(c.result), `${c.checkId} valid result`);
    check(!("token" in c) && !("cookie" in c) && !("setCookie" in c) && !("authorization" in c), `${c.checkId} no token/cookie fields`);
    check(!("responseBody" in c) && !("body" in c), `${c.checkId} no full body`);
    if (c.bodySnippet !== undefined) {
      check(typeof c.bodySnippet === "string" && c.bodySnippet.length <= 200, `${c.checkId} snippet <=200`);
      check(!/sk-[A-Za-z0-9]{10,}|service_role|SUPABASE_SERVICE|eyJ[A-Za-z0-9]|BEGIN (RSA|PRIVATE)/.test(c.bodySnippet), `${c.checkId} snippet no secret markers`);
    }
  }
});

await test("CORS smoke results classify wildcard+credentials and unknown-origin-with-credentials as FAIL if observed", () => {
  const cr = smoke.corsSmokeResults;
  // If either dangerous condition were observed, the decision must be FAIL.
  if (cr.wildcardWithCredentialsObserved === true || cr.unknownOriginAllowedWithCredentials === true) {
    check(smoke.decision === "STAGING SECURITY SMOKE FAIL", "dangerous CORS must force FAIL decision");
  }
  // Consistency: reflected-with-credentials implies unknownOriginAllowedWithCredentials.
  if (cr.accessControlAllowOriginReflectedForUnknownOrigin === true && cr.accessControlAllowCredentialsTrueForUnknownOrigin === true) {
    check(cr.unknownOriginAllowedWithCredentials === true, "reflection+credentials implies allowed-with-credentials");
  }
});

await test("PASS/WARNING decision requires prior critical CORS failure resolved and no critical exposure", () => {
  if (smoke.decision.includes("PASS") || smoke.decision.includes("WARNING")) {
    check(smoke.corsSmokeResults.priorCriticalCorsFailureResolved === true, "prior CORS failure must be resolved");
    check(smoke.corsSmokeResults.unknownOriginAllowedWithCredentials === false, "unknown origin must not be allowed with credentials");
    check(smoke.corsSmokeResults.wildcardWithCredentialsObserved === false, "no wildcard+credentials");
    check(Array.isArray(smoke.criticalExposuresObserved) && smoke.criticalExposuresObserved.length === 0, "no critical exposures for PASS/WARNING");
    check(smoke.remediationIntegration.priorFailureResolvedLive === true, "remediation resolved live");
  }
});

await test("security headers smoke records required future headers", () => {
  const h = smoke.securityHeadersSmokeResults.headersObserved;
  for (const key of ["x-content-type-options", "referrer-policy", "content-security-policy", "permissions-policy", "strict-transport-security"]) {
    check(Object.prototype.hasOwnProperty.call(h, key), `headers result records ${key}`);
  }
});

await test("rate-limit smoke does not claim implemented without live evidence", () => {
  const rl = smoke.rateLimitSmokeResults;
  if (rl.rateLimitHeadersObserved !== true && rl.retryAfterObserved !== true) {
    check(rl.implementationStatus === "policy_scaffold_only", "no live evidence -> policy/scaffold only");
  }
  check(rl.loadTestingPerformed === false, "no load testing");
});

await test("public reconnaissance covers /, /health, /routes, and 404 path", () => {
  const paths = smoke.checks.map((c) => `${c.method} ${c.path}`);
  for (const key of ["GET /", "GET /health", "GET /routes", "GET /nonexistent-phase-8s-smoke-path"]) {
    check(paths.includes(key), `public recon covers ${key}`);
  }
});

await test("auth endpoint result covers invalid login or records a skipped/blocked reason", () => {
  const login = smoke.checks.find((c) => c.checkId === "post-login-invalid");
  check(login && [401, 400].includes(login.statusCode), "invalid login recorded with 4xx");
  check(smoke.authEndpointSmokeResults.userEnumerationObserved === false, "no user enumeration");
});

await test("skipped checks explicitly include authenticated/model/admin/rate-limit/INDEX_SECRET and legitimate-origin", () => {
  const s = smoke.skippedChecks.map((x) => x.check);
  for (const key of ["authenticated_route_checks", "model_route_checks", "admin_route_checks", "rate_limit_trigger_checks", "index_secret_checks", "legitimate_frontend_origin_cors_checks"]) {
    check(s.includes(key), `skipped must include ${key}`);
  }
});

await test("observed risks are classified", () => {
  check(Array.isArray(smoke.observedRisks) && smoke.observedRisks.length > 0, "observed risks present");
  for (const r of smoke.observedRisks) {
    check(typeof r.severity === "string" && r.severity.length > 0, `${r.risk} classified`);
  }
});

await test("controls not implemented list is complete", () => {
  const c = smoke.controlsNotImplemented;
  for (const key of ["security_headers", "rate_limiting", "request_size_changes", "tenant_isolation", "logging_redaction", "langfuse_redaction", "error_sanitization", "query_secret_removal", "route_minimization", "memory", "additional_cors_code_changes"]) {
    check(c.includes(key), `controls-not-implemented must include ${key}`);
  }
});

await test("Phase 9 blockers include staging smoke, final closure, and the gates/scaffold", () => {
  const b = smoke.phase9Blockers;
  check(b.phase9CanBegin === false, "Phase 9 cannot begin");
  check(b.requiredCompleteBeforePhase9.includes("PATCH-08S-FINAL-CLOSURE-GATE-1"), "final closure blocker");
  check(b.tenantIsolationGateMustRemainSatisfied === true, "tenant gate");
  check(b.secretsEnvLoggingGateMustRemainSatisfied === true, "secrets gate");
  check(b.headersCorsRateLimitScaffoldMustRemainSatisfied === true, "scaffold gate");
});

await test("prohibited claims block hardened/implemented/unblocked/memory claims", () => {
  const pc = smoke.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["staging is production-hardened", "security headers are implemented", "rate limiting is implemented", "tenant isolation is implemented", "logging redaction is implemented", "phase 9 is unblocked", "persistent memory exists", "phase 8 memory is active"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("deferred boundaries preserve Phase 9/10/11/12/14 and Phase 8X separation; memory inactive", () => {
  check(smoke.deferredBoundaries.phase9ImplementedInThisPatch === false, "Phase 9 not implemented");
  check(smoke.deferredBoundaries.phase10SourceGovernance === "deferred", "Phase 10 deferred");
  check(smoke.deferredBoundaries.phase11Observability === "deferred", "Phase 11 deferred");
  check(smoke.phase8MemoryPolicy.memoryActive === false, "memory inactive");
  const x = smoke.phase8XDiagnosticSeparation;
  check(x.id === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1" && x.isSeparate === true && x.implementedInThisPatch === false, "08X separate");
});

await test("this test performs no HTTP, imports no runtime modules, and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08s-staging-security-smoke-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l));
  const forbidden = ["../server.js", "../routes", "../pipeline", "../ask-handler", "../auth.js", "supabase", "openai", "langfuse", "node:http", "node:https", "undici", "node-fetch"];
  for (const line of importLines) {
    for (const token of forbidden) check(!line.includes(token), `test must not import ${token}`);
  }
  check(!/\bfetch\s*\(|https?\.request\s*\(|https?\.get\s*\(/.test(selfSrc), "test must not perform HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08S-STAGING-SECURITY-SMOKE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
