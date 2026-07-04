// PATCH-08S-SECURITY-POLICY-FIXTURE-1 - security policy fixture test.
// Static, JSON-based validation only. Does NOT start the server, bind ports,
// import server.js/routes/runtime modules, require env vars, or call any external
// service. It loads the policy fixture and the route inventory fixture and
// validates policy content plus cross-fixture agreement.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const POLICY_PATH = "evaluation/fixtures/phase-8s-security-policy-fixture-1.fixture.json";
const INVENTORY_PATH = "evaluation/fixtures/phase-8s-security-route-inventory-1.fixture.json";

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
const hasReq = (obj, needle) =>
  Array.isArray(obj?.requirements) && obj.requirements.some((r) => r.toLowerCase().includes(needle.toLowerCase()));

let policy;
let inventory;

await test("security policy fixture exists and is valid JSON", () => {
  check(existsSync(resolve(POLICY_PATH)), `${POLICY_PATH} must exist`);
  policy = JSON.parse(readFileSync(resolve(POLICY_PATH), "utf8"));
  check(existsSync(resolve(INVENTORY_PATH)), `${INVENTORY_PATH} must exist`);
  inventory = JSON.parse(readFileSync(resolve(INVENTORY_PATH), "utf8"));
});

await test("required top-level sections exist", () => {
  const required = [
    "patch", "decision", "baseCommit", "policyVersion", "scope", "nonRuntimePatch",
    "sourceArtifacts", "routeInventoryIntegration", "policyCategories", "corsPolicy",
    "securityHeadersPolicy", "rateLimitPolicy", "routeGuardPolicy", "adminDebugPolicy",
    "querySecretPolicy", "secretsEnvPolicy", "loggingRedactionPolicy", "thirdPartyEgressPolicy",
    "errorDisclosurePolicy", "tenantIsolationPolicy", "supabaseServiceRolePolicy",
    "promptInjectionPolicy", "sourceAuthoritySpoofingPolicy", "requestSizePolicy",
    "reconnaissanceMinimizationPolicy", "phase8MemoryPolicy", "phase9ReadinessBlockers",
    "deferredBoundaries", "phase8XDiagnosticSeparation", "futurePatchDependencies",
    "prohibitedClaims", "testCases"
  ];
  for (const key of required) {
    check(Object.prototype.hasOwnProperty.call(policy, key), `missing top-level section: ${key}`);
  }
});

await test("decision is a PASS WITH STRICT RECOMMENDATIONS", () => {
  check(/PASS WITH STRICT RECOMMENDATIONS/i.test(policy.decision), "decision must be PASS WITH STRICT RECOMMENDATIONS");
});

await test("patch is marked non-runtime", () => {
  check(policy.nonRuntimePatch === true, "nonRuntimePatch must be true");
  check(policy.runtimeSecurityImplemented === false, "runtimeSecurityImplemented must be false");
  check(policy.middlewareWired === false, "middlewareWired must be false");
});

await test("CORS policy forbids wildcard origin with credentials:true", () => {
  check(policy.corsPolicy.prohibited.includes("wildcard_with_credentials"), "wildcard_with_credentials must be prohibited");
  check(hasReq(policy.corsPolicy, "wildcard origin") && hasReq(policy.corsPolicy, "credentials"), "requirement must mention wildcard + credentials");
});

await test("production CORS must fail closed without allowlist", () => {
  check(hasReq(policy.corsPolicy, "fail closed"), "must require fail-closed production CORS");
  check(hasReq(policy.corsPolicy, "explicit origin allowlist"), "must require explicit allowlist");
});

await test("security headers policy lists required future headers", () => {
  const required = ["X-Content-Type-Options", "Referrer-Policy", "Content-Security-Policy", "Permissions-Policy"];
  for (const h of required) {
    check(policy.securityHeadersPolicy.requiredFutureHeaders.includes(h), `security headers must list ${h}`);
  }
  check(
    policy.securityHeadersPolicy.requiredFutureHeaders.includes("X-Frame-Options") ||
    policy.securityHeadersPolicy.requiredFutureHeaders.includes("frame-ancestors"),
    "must list X-Frame-Options or frame-ancestors"
  );
});

await test("rate-limit policy covers public auth, mode, admin/index, health, and expensive routes", () => {
  const groups = policy.rateLimitPolicy.mustCoverRouteGroups;
  for (const g of ["auth", "mode", "admin-index", "admin-read", "debug", "health"]) {
    check(groups.includes(g), `rate-limit must cover route group ${g}`);
  }
  check(hasReq(policy.rateLimitPolicy, "/health"), "rate-limit must mention /health DB read");
});

await test("rate-limit policy references all 22 expensive routes and matches the route inventory", () => {
  check(policy.rateLimitPolicy.mustCoverExpensiveRouteCount === 22, "policy must state 22 expensive routes");
  const actualExpensive = inventory.routes.filter((r) => r.expensiveOperation === true).length;
  check(actualExpensive === 22, `route inventory must have 22 expensive routes, found ${actualExpensive}`);
  check(policy.routeInventoryIntegration.expensiveRouteCount === actualExpensive, "policy/inventory expensive count must agree");
});

await test("route guard policy requires inventory drift failure and rejects unknown guards for Phase 9", () => {
  check(policy.routeGuardPolicy.driftMustFailTests === true, "drift must fail tests");
  check(hasReq(policy.routeGuardPolicy, "drift must fail"), "requirement must mention drift failing tests");
  check(policy.routeGuardPolicy.unknownGuardAcceptableForPhase9 === false, "unknown guard must be rejected for Phase 9");
});

await test("admin/debug policy requires admin_guard and debug_guard", () => {
  check(policy.adminDebugPolicy.requiredPolicies.includes("admin_guard"), "admin_guard required");
  check(policy.adminDebugPolicy.requiredPolicies.includes("debug_guard"), "debug_guard required");
});

await test("query secret policy prohibits INDEX_SECRET via URL query in future hardened state", () => {
  check(hasReq(policy.querySecretPolicy, "must not be accepted via url query"), "must prohibit query-string secret");
  check(policy.querySecretPolicy.futureAcceptedTransport === "header_only_or_stronger", "future transport must be header-only or stronger");
  check(policy.querySecretPolicy.currentQuerySecretAcceptedRisk === true, "current query-secret risk recorded");
});

await test("secrets/env policy prohibits logging P0 secrets and requires fail-fast env", () => {
  check(policy.secretsEnvPolicy.p0SecretsNeverLogged === true, "P0 secrets never logged");
  check(policy.secretsEnvPolicy.requiredEnvFailFast === true, "required env fail fast");
  check(policy.secretsEnvPolicy.noInsecureProductionFallback === true, "no insecure production fallback");
});

await test("logging/redaction policy covers P0/P1/P2, TINs, client names, figures, raw prompts/answers", () => {
  for (const c of ["P0_SECRET", "P1_CLIENT_CONFIDENTIAL", "P1_LEGAL_TAX_STRATEGY", "P2_USER_DATA", "P2_GENERATED_WORK_PRODUCT"]) {
    check(policy.loggingRedactionPolicy.mustRedactClasses.includes(c), `must redact class ${c}`);
  }
  for (const f of ["TIN", "client_name", "financial_audit_figures", "raw_model_prompts", "raw_model_answers"]) {
    check(policy.loggingRedactionPolicy.mustRedactFields.includes(f), `must redact field ${f}`);
  }
});

await test("third-party egress policy covers Langfuse and query/answer redaction", () => {
  check(policy.thirdPartyEgressPolicy.thirdParties.includes("langfuse"), "must cover langfuse");
  check(hasReq(policy.thirdPartyEgressPolicy, "query/answer"), "must require query/answer redaction before egress");
  check(policy.thirdPartyEgressPolicy.p1EgressDefault === "deny_without_approved_policy", "P1 egress must default deny");
});

await test("error disclosure policy prohibits raw error.message and stack in production", () => {
  check(policy.errorDisclosurePolicy.prohibitedInProduction.includes("raw_error_message"), "raw error.message prohibited");
  check(policy.errorDisclosurePolicy.prohibitedInProduction.includes("stack_trace"), "stack trace prohibited");
});

await test("tenant isolation policy marks isolation mandatory before Phase 9 and agrees with inventory count", () => {
  check(policy.tenantIsolationPolicy.mandatoryBeforePhase9 === true, "tenant isolation mandatory before Phase 9");
  check(policy.tenantIsolationPolicy.severity === "CRITICAL", "tenant isolation is CRITICAL");
  const actualTenant = inventory.routes.filter((r) => Array.isArray(r.requiredFuturePolicies) && r.requiredFuturePolicies.includes("tenant_isolation")).length;
  check(actualTenant === 17, `inventory must have 17 tenant_isolation routes, found ${actualTenant}`);
  check(policy.tenantIsolationPolicy.tenantIsolationRouteCount === actualTenant, "policy/inventory tenant_isolation count must agree");
});

await test("Supabase service-role policy includes calibrated wording", () => {
  const w = policy.supabaseServiceRolePolicy.calibratedWording || "";
  check(/tightly controlled server-only administrative\/source-corpus operations/i.test(w), "must include server-only calibration");
  check(/not acceptable as the default access path for user\/client\/matter data/i.test(w), "must prohibit default-path service-role for user data");
  check(policy.supabaseServiceRolePolicy.serviceRoleAsDefaultPathForUserDataRisk === "CRITICAL", "service-role default-path risk is CRITICAL");
});

await test("prompt injection policy treats user prompts as untrusted", () => {
  check(policy.promptInjectionPolicy.userPromptsUntrusted === true, "user prompts untrusted");
  check(hasReq(policy.promptInjectionPolicy, "cannot override system"), "user instructions cannot override system/governance");
});

await test("source-authority spoofing policy prevents user text from creating citations/source cards/authority", () => {
  check(policy.sourceAuthoritySpoofingPolicy.userTextCannotCreateAuthority === true, "user text cannot create authority");
  check(hasReq(policy.sourceAuthoritySpoofingPolicy, "cannot create citations"), "must prevent user citations");
  check(hasReq(policy.sourceAuthoritySpoofingPolicy, "cannot create source cards"), "must prevent user source cards");
  check(hasReq(policy.sourceAuthoritySpoofingPolicy, "sourceavailability"), "must prevent sourceAvailability/Authority Lock upgrade");
});

await test("request-size policy exists and is policy-controlled", () => {
  check(hasReq(policy.requestSizePolicy, "request-size limits must be policy-controlled"), "request-size must be policy-controlled");
});

await test("reconnaissance minimization policy covers /health and /routes", () => {
  check(policy.reconnaissanceMinimizationPolicy.appliesToRoutes.includes("/health"), "must cover /health");
  check(policy.reconnaissanceMinimizationPolicy.appliesToRoutes.includes("/routes"), "must cover /routes");
});

await test("Phase 8 memory policy keeps memory inactive and all flags disabled", () => {
  check(policy.phase8MemoryPolicy.memoryActive === false, "memory inactive");
  const flags = policy.phase8MemoryPolicy.memoryFlagsMustRemainDisabled;
  for (const f of ["TINA_ENABLE_MEMORY_READS", "TINA_ENABLE_MEMORY_WRITES", "TINA_ENABLE_MATTER_MEMORY", "TINA_ENABLE_MEMORY_SUGGESTIONS", "TINA_ENABLE_MEMORY_DEBUG_TRACE"]) {
    check(flags.includes(f), `flag ${f} must be listed as disabled`);
  }
});

await test("Phase 9 readiness blockers include required future Phase 8S gates", () => {
  check(policy.phase9ReadinessBlockers.phase9CanBegin === false, "Phase 9 cannot begin");
  for (const p of [
    "PATCH-08S-TENANT-ISOLATION-GATE-1",
    "PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1",
    "PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1",
    "PATCH-08S-STAGING-SECURITY-SMOKE-1",
    "PATCH-08S-FINAL-CLOSURE-GATE-1"
  ]) {
    check(policy.phase9ReadinessBlockers.requiredCompleteBeforePhase9.includes(p), `blocker must include ${p}`);
  }
});

await test("deferred boundaries preserve Phase 10 and Phase 11", () => {
  check(policy.deferredBoundaries.phase10SourceGovernance === "deferred", "Phase 10 deferred");
  check(policy.deferredBoundaries.phase11Observability === "deferred", "Phase 11 deferred");
  check(policy.deferredBoundaries.phase9ImplementedInThisPatch === false, "Phase 9 not implemented");
});

await test("Phase 8X diagnostic is separate and not implemented here", () => {
  const x = policy.phase8XDiagnosticSeparation;
  check(x.id === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1", "08X id recorded");
  check(x.isSeparate === true, "08X separate");
  check(x.isPersistentMemory === false, "08X not persistent memory");
  check(x.isPhase8SSecurity === false, "08X not Phase 8S security");
  check(x.implementedInThisPatch === false, "08X not implemented here");
});

await test("no policy claims runtime hardening/Phase 9/persistent memory", () => {
  check(policy.phase9Started === false, "Phase 9 not started");
  check(policy.persistentMemoryExists === false, "no persistent memory");
  const raw = readFileSync(resolve(POLICY_PATH), "utf8");
  check(!/"runtimeSecurityImplemented"\s*:\s*true/i.test(raw), "must not claim runtime hardening implemented");
  check(Array.isArray(policy.prohibitedClaims) && policy.prohibitedClaims.length > 0, "prohibitedClaims enumerated");
});

await test("route inventory and policy fixture agree on no_query_secret admin count and /health rate_limit", () => {
  const noQuerySecret = inventory.routes.filter((r) => Array.isArray(r.requiredFuturePolicies) && r.requiredFuturePolicies.includes("no_query_secret")).length;
  check(noQuerySecret === 9, `inventory must have 9 no_query_secret routes, found ${noQuerySecret}`);
  check(policy.routeInventoryIntegration.noQuerySecretAdminRouteCount === noQuerySecret, "policy/inventory no_query_secret count must agree");
  check(policy.querySecretPolicy.adminRoutesFlaggedNoQuerySecret === noQuerySecret, "querySecretPolicy count must agree with inventory");
  const health = inventory.routes.find((r) => r.path === "/health");
  check(health && health.dbReadPossible === true, "/health must be a DB-read route in inventory");
  check(health.requiredFuturePolicies.includes("rate_limit"), "/health must require rate_limit in inventory");
  check(policy.routeInventoryIntegration.healthPerformsDbRead === true && policy.routeInventoryIntegration.healthRequiresRateLimit === true, "policy must record /health DB read + rate_limit");
});

await test("this test imports no runtime/server modules and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08s-security-policy-fixture-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l));
  const forbidden = ["../server.js", "../routes", "../pipeline", "../ask-handler", "../auth.js", "supabase", "openai", "langfuse"];
  for (const line of importLines) {
    for (const token of forbidden) {
      check(!line.includes(token), `test must not import ${token}`);
    }
  }
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08S-SECURITY-POLICY-FIXTURE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
