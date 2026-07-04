// PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1 - safety gate test.
// Static, JSON/source-text validation only. Does NOT start the server, bind
// ports, import runtime modules, require env vars, print env values, or call
// OpenAI/Supabase/Google Drive/Langfuse/external services.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const GATE_PATH = "evaluation/fixtures/phase-8s-secrets-env-logging-safety-gate-1.fixture.json";
const INVENTORY_PATH = "evaluation/fixtures/phase-8s-security-route-inventory-1.fixture.json";
const POLICY_PATH = "evaluation/fixtures/phase-8s-security-policy-fixture-1.fixture.json";
const TENANT_PATH = "evaluation/fixtures/phase-8s-tenant-isolation-gate-1.fixture.json";

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

const textOf = (value) => JSON.stringify(value).toLowerCase();
const includesText = (value, needle) => textOf(value).includes(needle.toLowerCase());

let gate;
let inventory;
let policy;
let tenantGate;

await test("safety gate fixture exists and is valid JSON", () => {
  check(existsSync(resolve(GATE_PATH)), `${GATE_PATH} must exist`);
  gate = JSON.parse(readFileSync(resolve(GATE_PATH), "utf8"));
  check(existsSync(resolve(INVENTORY_PATH)), `${INVENTORY_PATH} must exist`);
  inventory = JSON.parse(readFileSync(resolve(INVENTORY_PATH), "utf8"));
  check(existsSync(resolve(POLICY_PATH)), `${POLICY_PATH} must exist`);
  policy = JSON.parse(readFileSync(resolve(POLICY_PATH), "utf8"));
  check(existsSync(resolve(TENANT_PATH)), `${TENANT_PATH} must exist`);
  tenantGate = JSON.parse(readFileSync(resolve(TENANT_PATH), "utf8"));
});

await test("required top-level sections exist", () => {
  const required = [
    "patch", "decision", "baseCommit", "gateVersion", "nonRuntimePatch",
    "sourceArtifacts", "routeInventoryIntegration", "securityPolicyIntegration",
    "tenantIsolationIntegration", "envClassificationPolicy", "secretHandlingPolicy",
    "querySecretPolicy", "loggingRedactionPolicy", "thirdPartyEgressPolicy",
    "langfusePolicy", "errorDisclosurePolicy", "diagnosticOutputPolicy",
    "productionFailClosedPolicy", "dataSensitivityClasses", "prohibitedLogContent",
    "requiredFutureRedactionClasses", "requiredFutureEnvValidation",
    "requiredFutureErrorSanitization", "requiredFutureEgressControls",
    "routeRiskMapping", "phase9Blockers", "requiredFutureTests",
    "prohibitedClaims", "deferredBoundaries", "phase8MemoryPolicy",
    "phase8XDiagnosticSeparation", "futurePatchDependencies", "testCases"
  ];
  for (const key of required) {
    check(Object.prototype.hasOwnProperty.call(gate, key), `missing top-level section: ${key}`);
  }
});

await test("decision is secrets env logging safety gate pass with strict recommendations", () => {
  check(gate.decision === "SECRETS ENV LOGGING SAFETY GATE PASS WITH STRICT RECOMMENDATIONS", "unexpected decision");
});

await test("patch is marked non-runtime", () => {
  check(gate.nonRuntimePatch === true, "nonRuntimePatch must be true");
  check(gate.patch.runtimeSecurityImplemented === false, "runtime security must not be implemented");
  check(gate.patch.runtimeLoggingRedactionImplemented === false, "logging redaction must not be implemented");
  check(gate.patch.runtimeEnvValidationImplemented === false, "env validation must not be implemented");
  check(gate.patch.runtimeLangfuseChanged === false, "Langfuse runtime must not be changed");
  check(gate.patch.runtimeErrorHandlingChanged === false, "error handling must not be changed");
  check(gate.patch.middlewareWired === false, "middleware must not be wired");
  check(gate.patch.dbChanged === false, "DB must not be changed");
  check(gate.patch.packageChanged === false, "package files must not be changed");
});

await test("env classification policy includes P0/P1/P2/P3/P4 classes", () => {
  for (const c of [
    "P0_SECRET",
    "P0_SERVICE_ROLE_SECRET",
    "P0_ADMIN_SECRET",
    "P0_MODEL_PROVIDER_SECRET",
    "P0_THIRD_PARTY_SECRET",
    "P1_CLIENT_CONFIDENTIAL",
    "P1_LEGAL_TAX_STRATEGY",
    "P2_USER_PROMPT_OR_CONVERSATION",
    "P2_GENERATED_WORK_PRODUCT",
    "P3_DIAGNOSTIC_INTERNAL",
    "P4_PUBLIC_SOURCE"
  ]) {
    check(gate.envClassificationPolicy.classes.includes(c), `env class missing: ${c}`);
    check(gate.dataSensitivityClasses.includes(c), `data sensitivity class missing: ${c}`);
  }
  check(gate.envClassificationPolicy.envValuesNeverPrinted === true, "env values must never be printed");
  check(gate.envClassificationPolicy.requiredEnvMustFailFastFuture === true, "required env must fail fast in future");
});

await test("secret handling policy prohibits logging and returning P0 secrets", () => {
  check(gate.secretHandlingPolicy.p0SecretsNeverLogged === true, "P0 secrets must never be logged");
  check(gate.secretHandlingPolicy.p0SecretsNeverReturned === true, "P0 secrets must never be returned");
  check(gate.secretHandlingPolicy.p0SecretsNeverQueryStringFuture === true, "P0 secrets must never be accepted through URL query in future hardened state");
  check(gate.secretHandlingPolicy.presenceOnlyBooleanOrMetadata === true, "secret presence must be boolean/metadata only");
});

await test("query secret policy prohibits URL query secret in future hardened state and covers 9 routes", () => {
  const noQuerySecret = inventory.routes.filter((r) => r.requiredFuturePolicies.includes("no_query_secret"));
  check(noQuerySecret.length === 9, `inventory must have 9 no_query_secret routes, found ${noQuerySecret.length}`);
  check(gate.querySecretPolicy.currentQuerySecretAcceptedRisk === true, "current query-secret risk must be recorded");
  check(gate.querySecretPolicy.futureAcceptedTransport === "header_only_or_stronger", "future transport must be header-only or stronger");
  check(gate.querySecretPolicy.adminRoutesFlaggedNoQuerySecret === noQuerySecret.length, "gate no_query_secret count must match inventory");
  check(gate.routeRiskMapping.no_query_secret.length === noQuerySecret.length, "route risk mapping must cover all no_query_secret routes");
});

await test("logging/redaction policy covers P0, P1, P2, TINs, client names, figures, request bodies, prompts, answers, and excerpts", () => {
  for (const needle of [
    "P0 secrets",
    "P1 client confidential data",
    "P1 legal/tax strategy",
    "P2 user prompts and conversation history",
    "P2 generated work product",
    "TINs",
    "client names",
    "financial/audit figures",
    "document excerpts",
    "raw request bodies",
    "raw model prompts",
    "raw model answers"
  ]) {
    check(gate.loggingRedactionPolicy.requiredFutureRedactionClasses.includes(needle), `redaction class missing: ${needle}`);
  }
  check(includesText(gate.loggingRedactionPolicy, "Production logs must not contain raw user queries"), "production log raw query prohibition missing");
  check(includesText(gate.loggingRedactionPolicy, "Platform log aggregation is treated as third-party/internal egress risk"), "platform log aggregation risk missing");
});

await test("third-party egress policy covers Langfuse/query-answer redaction and P1 fail-safe", () => {
  check(gate.thirdPartyEgressPolicy.thirdParties.includes("langfuse"), "Langfuse must be covered");
  check(includesText(gate.thirdPartyEgressPolicy, "Query/answer content must be classified/redacted before egress"), "query/answer redaction missing");
  check(includesText(gate.thirdPartyEgressPolicy, "P1 data must not be sent"), "P1 block missing");
  check(gate.thirdPartyEgressPolicy.p1EgressDefault === "deny_or_fail_safe_until_approved", "P1 egress must deny/fail-safe until approved");
});

await test("Langfuse policy treats Langfuse as third-party observability boundary", () => {
  check(gate.langfusePolicy.langfuseThirdPartyBoundary === true, "Langfuse third-party boundary must be true");
  check(includesText(gate.langfusePolicy, "LANGFUSE_* env vars"), "LANGFUSE_* configured still requires redaction policy");
  check(includesText(gate.langfusePolicy, "Sanitized comments are insufficient"), "testable redaction contract requirement missing");
});

await test("error disclosure policy prohibits raw error.message and stack in production responses", () => {
  check(gate.errorDisclosurePolicy.prohibitedInProductionResponses.includes("raw_error_message"), "raw error.message prohibited");
  check(gate.errorDisclosurePolicy.prohibitedInProductionResponses.includes("stack_trace"), "stack trace prohibited");
  check(includesText(gate.errorDisclosurePolicy, "Production route catch blocks must eventually use sanitizing helper/policy"), "route catch sanitizing helper requirement missing");
});

await test("diagnostic output policy covers /health, /routes, and /debug/db-identity", () => {
  for (const route of ["/health", "/routes", "/debug/db-identity"]) {
    check(gate.diagnosticOutputPolicy.routesRequiringOutputMinimizationPolicy.includes(route), `diagnostic minimization missing ${route}`);
  }
  check(includesText(gate.diagnosticOutputPolicy, "/health currently performs DB read"), "/health DB-read diagnostic fact missing");
  check(includesText(gate.diagnosticOutputPolicy, "/routes currently aids reconnaissance"), "/routes reconnaissance fact missing");
});

await test("production fail-closed policy covers CORS allowlist, required env, and optional observability egress", () => {
  check(gate.productionFailClosedPolicy.corsAllowlistRequiredFuture === true, "CORS allowlist fail-closed missing");
  check(gate.productionFailClosedPolicy.requiredSecurityEnvFailClosedFuture === true, "required security env fail-closed missing");
  check(gate.productionFailClosedPolicy.optionalObservabilityNoInsecureEgress === true, "optional observability egress fail-safe missing");
  check(includesText(gate.productionFailClosedPolicy, "Security controls must default deny/fail closed"), "default deny/fail closed missing");
});

await test("route inventory integration matches expected counts and health fact", () => {
  const routes = inventory.routes;
  const expensive = routes.filter((r) => r.expensiveOperation === true);
  const tenant = routes.filter((r) => r.requiredFuturePolicies.includes("tenant_isolation"));
  const noQuery = routes.filter((r) => r.requiredFuturePolicies.includes("no_query_secret"));
  const mode = routes.filter((r) => r.routeGroup === "mode");
  const conversations = routes.filter((r) => r.routeGroup === "conversation");
  const debug = routes.filter((r) => r.routeGroup === "debug");
  const health = routes.find((r) => r.method === "GET" && r.path === "/health");

  check(routes.length === 30, `expected 30 routes, found ${routes.length}`);
  check(expensive.length === 22, `expected 22 expensive routes, found ${expensive.length}`);
  check(tenant.length === 17, `expected 17 tenant routes, found ${tenant.length}`);
  check(noQuery.length === 9, `expected 9 no_query_secret routes, found ${noQuery.length}`);
  check(mode.length === 12, `expected 12 mode routes, found ${mode.length}`);
  check(conversations.length === 3, `expected 3 conversation routes, found ${conversations.length}`);
  check(debug.length === 1, `expected 1 debug route, found ${debug.length}`);
  check(health?.dbReadPossible === true, "/health must perform DB read");
  check(health?.requiredFuturePolicies.includes("rate_limit"), "/health must require rate_limit");

  check(gate.routeInventoryIntegration.totalRoutes === routes.length, "gate total route count mismatch");
  check(gate.routeInventoryIntegration.expensiveRouteCount === expensive.length, "gate expensive route count mismatch");
  check(gate.routeInventoryIntegration.tenantIsolationRouteCount === tenant.length, "gate tenant route count mismatch");
  check(gate.routeInventoryIntegration.noQuerySecretAdminRouteCount === noQuery.length, "gate no_query_secret route count mismatch");
  check(gate.routeInventoryIntegration.modeRouteCount === mode.length, "gate mode route count mismatch");
  check(gate.routeInventoryIntegration.conversationRouteCount === conversations.length, "gate conversation route count mismatch");
  check(gate.routeInventoryIntegration.debugRouteCount === debug.length, "gate debug route count mismatch");
  check(gate.routeInventoryIntegration.healthPerformsDbRead === true, "gate health DB-read fact missing");
  check(gate.routeInventoryIntegration.healthRequiresRateLimit === true, "gate health rate-limit fact missing");
});

await test("route risk mapping covers inventory policies", () => {
  for (const policyId of [
    "log_redaction",
    "error_sanitization",
    "third_party_egress_redaction",
    "no_query_secret",
    "route_recon_minimization",
    "rate_limit",
    "tenant_isolation"
  ]) {
    const expected = inventory.routes.filter((r) => r.requiredFuturePolicies.includes(policyId)).map((r) => r.id).sort();
    const actual = [...gate.routeRiskMapping[policyId]].sort();
    check(JSON.stringify(actual) === JSON.stringify(expected), `route mapping mismatch for ${policyId}`);
  }
});

await test("security policy integration references required categories", () => {
  for (const id of [
    "secrets_env",
    "log_redaction",
    "third_party_egress_redaction",
    "error_sanitization",
    "no_query_secret",
    "route_recon_minimization",
    "rate_limit",
    "cors",
    "tenant_isolation",
    "supabase_service_role"
  ]) {
    check(gate.securityPolicyIntegration.requiredCategories.includes(id), `gate missing security policy category ${id}`);
  }
  check(policy.secretsEnvPolicy.id === "secrets_env", "policy fixture secrets_env missing");
  check(policy.loggingRedactionPolicy.id === "log_redaction", "policy fixture log_redaction missing");
  check(policy.thirdPartyEgressPolicy.id === "third_party_egress_redaction", "policy fixture third_party_egress_redaction missing");
  check(policy.errorDisclosurePolicy.id === "error_sanitization", "policy fixture error_sanitization missing");
  check(policy.querySecretPolicy.id === "no_query_secret", "policy fixture no_query_secret missing");
  check(policy.tenantIsolationPolicy.id === "tenant_isolation", "policy fixture tenant_isolation missing");
  check(policy.supabaseServiceRolePolicy.id === "supabase_service_role", "policy fixture supabase_service_role missing");
});

await test("tenant isolation integration states safety gate does not replace tenant isolation", () => {
  check(gate.tenantIsolationIntegration.safetyGateDoesNotReplaceTenantIsolation === true, "safety gate must not replace tenant isolation");
  check(gate.tenantIsolationIntegration.tenantClientMatterIsolationMandatoryBeforePhase9 === true, "tenant isolation remains mandatory");
  check(tenantGate.decision === "TENANT ISOLATION GATE PASS WITH STRICT RECOMMENDATIONS", "tenant gate must remain complete/pass");
  check(tenantGate.phase9Blockers.phase9CanBegin === false, "tenant gate must keep Phase 9 blocked");
});

await test("Phase 9 blockers include tenant isolation, secrets/env/logging/egress, headers/CORS/rate-limit, staging smoke, and final closure", () => {
  const blockers = gate.phase9Blockers.requiredCompleteBeforePhase9.join("\n");
  for (const needle of [
    "PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1 complete",
    "secrets/env/logging/egress policy approved",
    "PATCH-08S-TENANT-ISOLATION-GATE-1 complete",
    "PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1 complete",
    "PATCH-08S-STAGING-SECURITY-SMOKE-1 complete",
    "PATCH-08S-FINAL-CLOSURE-GATE-1 complete"
  ]) {
    check(blockers.includes(needle), `Phase 9 blocker missing: ${needle}`);
  }
});

await test("required future tests cover secrets, P1/P2 logs, errors, query secret, Langfuse, diagnostics, and env fail-closed", () => {
  const future = gate.requiredFutureTests.join("\n");
  for (const needle of [
    "no raw P0 secret logging",
    "no raw P1/P2 prompt/answer logging",
    "production errors do not expose raw error.message/stack",
    "query secret no longer accepted via URL in hardened state",
    "Langfuse egress redacts or blocks P1/P2 content",
    "/health and /routes output minimized or gated",
    "env validation fails closed for production insecure defaults"
  ]) {
    check(future.includes(needle), `future test missing: ${needle}`);
  }
});

await test("prohibited claims block runtime implementation claims", () => {
  for (const claim of [
    "logging redaction is implemented",
    "env validation is implemented",
    "query secret risk is fixed",
    "Langfuse egress is fixed",
    "production error sanitization is implemented",
    "diagnostic minimization is implemented",
    "Phase 9 is unblocked",
    "runtime security hardening is implemented",
    "tenant isolation is implemented",
    "persistent memory exists",
    "Phase 8 memory is active"
  ]) {
    check(gate.prohibitedClaims.includes(claim), `prohibited claim missing: ${claim}`);
  }
  check(gate.phase9Blockers.phase9CanBegin === false, "Phase 9 must not be unblocked");
});

await test("deferred boundaries preserve Phase 9/10/11/12/14 and Phase 8X separation", () => {
  check(gate.deferredBoundaries.phase9ProfessionalWorkflowCoPilot === "blocked_not_started", "Phase 9 must be blocked/not started");
  check(gate.deferredBoundaries.phase10SourceGovernance === "deferred", "Phase 10 source governance deferred");
  check(gate.deferredBoundaries.phase11Observability === "deferred", "Phase 11 observability deferred");
  check(gate.deferredBoundaries.phase12DocumentAdvisory === "deferred", "Phase 12 deferred");
  check(gate.deferredBoundaries.phase14MobileAfterPhase13 === "deferred", "Phase 14 deferred");
  check(gate.phase8XDiagnosticSeparation.isSeparate === true, "Phase 8X must be separate");
  check(gate.phase8XDiagnosticSeparation.implementedInThisPatch === false, "Phase 8X not implemented here");
});

await test("Phase 8 memory remains inactive", () => {
  check(gate.phase8MemoryPolicy.memoryActive === false, "memory inactive");
  check(gate.phase8MemoryPolicy.persistentMemoryExists === false, "no persistent memory");
  check(gate.patch.memoryActive === false, "patch memory inactive");
  check(gate.patch.persistentMemoryExists === false, "patch no persistent memory");
});

await test("source text pattern scan is read-only and records known categories", () => {
  const serverSrc = readFileSync(resolve("server.js"), "utf8");
  const askSrc = readFileSync(resolve("ask-handler.js"), "utf8");
  const pipelineSrc = readFileSync(resolve("pipeline.js"), "utf8");
  const orchestrationSrc = readFileSync(resolve("context-orchestration-engine.js"), "utf8");
  check(/process\.env/.test(serverSrc), "server.js env references should be visible as source text");
  check(/req\.query\.secret/.test(serverSrc), "server.js query-secret pattern should be visible as source text");
  check(/app\.get\("\/health"/.test(serverSrc), "/health route should be visible as source text");
  check(/app\.get\("\/routes"/.test(serverSrc), "/routes route should be visible as source text");
  check(/app\.get\("\/debug\/db-identity"/.test(serverSrc), "/debug/db-identity route should be visible as source text");
  check(/error\.message/.test(serverSrc + askSrc), "error.message patterns should be visible as source text");
  check(/stack/.test(serverSrc + orchestrationSrc), "stack diagnostic patterns should be visible as source text");
  check(/Langfuse/i.test(pipelineSrc + orchestrationSrc), "Langfuse reference should be visible as source text");
  check(gate.sourceTextFindings.inspectedAsTextOnly === true, "source inspection must be text-only");
});

await test("this test imports no runtime/server modules, reads no env vars, and prints no env values", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08s-secrets-env-logging-safety-gate-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((line) => /^\s*import\s/.test(line));
  const forbidden = ["../server.js", "../routes", "../pipeline", "../ask-handler", "../auth.js", "supabase", "openai", "langfuse"];
  for (const line of importLines) {
    for (const token of forbidden) {
      check(!line.includes(token), `test must not import ${token}`);
    }
  }
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
  const logLines = selfSrc.split(/\r?\n/).filter((line) => /console\.log\(/.test(line));
  check(!logLines.some((line) => /process\.env/.test(line)), "test must not print env values");
});

console.log(`\nPATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
