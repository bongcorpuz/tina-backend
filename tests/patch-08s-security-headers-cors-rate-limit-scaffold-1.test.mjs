// PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1 - scaffold policy test.
// Static, JSON-based validation only. Does NOT start the server, bind ports,
// import server.js/routes/runtime modules, require env vars, print env values, or
// call any external service. It loads the scaffold fixture plus the route
// inventory, security policy, tenant isolation, and secrets/env/logging fixtures
// and validates scaffold content plus cross-fixture agreement.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SCAFFOLD_PATH = "evaluation/fixtures/phase-8s-security-headers-cors-rate-limit-scaffold-1.fixture.json";
const INVENTORY_PATH = "evaluation/fixtures/phase-8s-security-route-inventory-1.fixture.json";
const POLICY_PATH = "evaluation/fixtures/phase-8s-security-policy-fixture-1.fixture.json";
const TENANT_PATH = "evaluation/fixtures/phase-8s-tenant-isolation-gate-1.fixture.json";
const SECRETS_PATH = "evaluation/fixtures/phase-8s-secrets-env-logging-safety-gate-1.fixture.json";

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
const load = (p) => JSON.parse(readFileSync(resolve(p), "utf8"));

let scaffold, inventory, policy, tenant, secrets;

await test("scaffold fixture exists and all referenced fixtures are valid JSON", () => {
  check(existsSync(resolve(SCAFFOLD_PATH)), `${SCAFFOLD_PATH} must exist`);
  scaffold = load(SCAFFOLD_PATH);
  inventory = load(INVENTORY_PATH);
  policy = load(POLICY_PATH);
  tenant = load(TENANT_PATH);
  secrets = load(SECRETS_PATH);
});

await test("required top-level sections exist", () => {
  const required = [
    "patch", "decision", "baseCommit", "scaffoldVersion", "nonRuntimePatch", "sourceArtifacts",
    "routeInventoryIntegration", "securityPolicyIntegration", "tenantIsolationIntegration",
    "secretsEnvLoggingIntegration", "corsScaffoldPolicy", "securityHeadersScaffoldPolicy",
    "rateLimitScaffoldPolicy", "requestSizeScaffoldPolicy", "routeGroupPolicyMapping",
    "expensiveRoutePolicyMapping", "authRoutePolicyMapping", "adminDebugPolicyMapping",
    "healthRoutesPolicyMapping", "publicReconPolicyMapping", "futureImplementationConstraints",
    "futureSmokeRequirements", "phase9Blockers", "requiredFutureTests", "prohibitedClaims",
    "deferredBoundaries", "phase8MemoryPolicy", "phase8XDiagnosticSeparation",
    "futurePatchDependencies", "testCases"
  ];
  for (const key of required) {
    check(Object.prototype.hasOwnProperty.call(scaffold, key), `missing top-level section: ${key}`);
  }
});

await test("decision is SECURITY HEADERS CORS RATE LIMIT SCAFFOLD PASS WITH STRICT RECOMMENDATIONS", () => {
  check(/SCAFFOLD PASS WITH STRICT RECOMMENDATIONS/i.test(scaffold.decision), "decision must be scaffold PASS WITH STRICT RECOMMENDATIONS");
});

await test("patch is marked non-runtime with all implementation flags false", () => {
  check(scaffold.nonRuntimePatch === true, "nonRuntimePatch must be true");
  for (const f of ["corsImplemented", "securityHeadersImplemented", "rateLimitImplemented", "requestSizeChanged", "middlewareWired", "dependenciesInstalled", "productionHardened", "phase9Unblocked", "runtimeSecurityImplemented"]) {
    check(scaffold[f] === false, `${f} must be false`);
  }
});

await test("CORS scaffold forbids wildcard origin with credentials:true", () => {
  check(scaffold.corsScaffoldPolicy.prohibited.includes("wildcard_with_credentials"), "wildcard_with_credentials prohibited");
  check(hasReq(scaffold.corsScaffoldPolicy, "wildcard origin") && hasReq(scaffold.corsScaffoldPolicy, "credentials"), "requirement mentions wildcard + credentials");
});

await test("CORS scaffold requires production allowlist and fails closed when missing", () => {
  check(hasReq(scaffold.corsScaffoldPolicy, "explicit origin allowlist"), "explicit allowlist required");
  check(hasReq(scaffold.corsScaffoldPolicy, "fail closed"), "must fail closed when allowlist missing");
  check(scaffold.corsScaffoldPolicy.failClosedInProduction === true, "failClosedInProduction must be true");
});

await test("CORS scaffold separates local/staging/production origin policy", () => {
  for (const c of ["local_development", "staging", "production"]) {
    check(scaffold.corsScaffoldPolicy.originClasses.includes(c), `origin class ${c} must be classified`);
  }
});

await test("security headers scaffold lists required headers with classification", () => {
  const names = scaffold.securityHeadersScaffoldPolicy.headers.map((h) => h.name);
  for (const h of ["X-Content-Type-Options", "Referrer-Policy", "Content-Security-Policy", "Permissions-Policy"]) {
    check(names.includes(h), `security headers must list ${h}`);
  }
  check(names.includes("X-Frame-Options") || names.includes("frame-ancestors"), "must list X-Frame-Options or frame-ancestors");
  for (const h of scaffold.securityHeadersScaffoldPolicy.headers) {
    check(typeof h.classification === "string" && h.classification.length > 0, `${h.name} must have a classification`);
  }
});

await test("HSTS is marked platform/proxy review", () => {
  const hsts = scaffold.securityHeadersScaffoldPolicy.headers.find((h) => h.name === "Strict-Transport-Security");
  check(hsts && hsts.classification === "required_platform_or_proxy_review", "HSTS must be platform/proxy review");
});

await test("rate-limit scaffold covers public auth endpoints", () => {
  check(scaffold.rateLimitScaffoldPolicy.mustCoverAuthRoutes.includes("POST /register"), "must cover /register");
  check(scaffold.rateLimitScaffoldPolicy.mustCoverAuthRoutes.includes("POST /login"), "must cover /login");
  check(scaffold.rateLimitScaffoldPolicy.mustCoverRouteGroups.includes("auth"), "must cover auth group");
});

await test("rate-limit scaffold covers all 12 mode routes and matches the route inventory", () => {
  check(scaffold.rateLimitScaffoldPolicy.mustCoverModeRouteCount === 12, "policy must state 12 mode routes");
  const actualMode = inventory.routes.filter((r) => r.routeGroup === "mode").length;
  check(actualMode === 12, `inventory must have 12 mode routes, found ${actualMode}`);
  check(scaffold.routeInventoryIntegration.modeRouteCount === actualMode, "scaffold/inventory mode count must agree");
});

await test("rate-limit scaffold covers all 22 expensive routes and matches the route inventory", () => {
  check(scaffold.rateLimitScaffoldPolicy.mustCoverExpensiveRouteCount === 22, "policy must state 22 expensive routes");
  const actualExpensive = inventory.routes.filter((r) => r.expensiveOperation === true).length;
  check(actualExpensive === 22, `inventory must have 22 expensive routes, found ${actualExpensive}`);
  check(scaffold.routeInventoryIntegration.expensiveRouteCount === actualExpensive, "scaffold/inventory expensive count must agree");
  check(scaffold.expensiveRoutePolicyMapping.count === actualExpensive, "expensive route mapping count must agree");
  // Every inventory expensive route must be listed in the expensive route mapping keys.
  const keys = new Set(scaffold.expensiveRoutePolicyMapping.expensiveRouteKeys);
  for (const r of inventory.routes.filter((x) => x.expensiveOperation === true)) {
    check(keys.has(`${r.method} ${r.path}`), `expensive mapping missing ${r.method} ${r.path}`);
  }
});

await test("rate-limit scaffold covers all 9 no_query_secret admin routes and matches the route inventory", () => {
  check(scaffold.rateLimitScaffoldPolicy.mustCoverNoQuerySecretAdminRouteCount === 9, "policy must state 9 no_query_secret admin routes");
  const actualNQS = inventory.routes.filter((r) => Array.isArray(r.requiredFuturePolicies) && r.requiredFuturePolicies.includes("no_query_secret")).length;
  check(actualNQS === 9, `inventory must have 9 no_query_secret routes, found ${actualNQS}`);
  check(scaffold.routeInventoryIntegration.noQuerySecretAdminRouteCount === actualNQS, "scaffold/inventory no_query_secret count must agree");
  check(scaffold.adminDebugPolicyMapping.count === actualNQS, "admin/debug mapping count must agree");
});

await test("rate-limit scaffold covers /health because it performs a DB read", () => {
  check(scaffold.rateLimitScaffoldPolicy.mustCoverHealthDbRead === true, "policy must cover /health DB read");
  const health = inventory.routes.find((r) => r.path === "/health");
  check(health && health.dbReadPossible === true, "/health must be DB-read route in inventory");
  check(health.requiredFuturePolicies.includes("rate_limit"), "/health must require rate_limit in inventory");
  check(scaffold.healthRoutesPolicyMapping.performsDbRead === true, "health mapping records DB read");
  check(scaffold.healthRoutesPolicyMapping.requiredFuturePolicies.includes("rate_limit"), "health mapping requires rate_limit");
});

await test("request-size scaffold covers auth, expensive, and future Phase 9 document routes", () => {
  check(scaffold.requestSizeScaffoldPolicy.coversAuthRoutes === true, "covers auth routes");
  check(scaffold.requestSizeScaffoldPolicy.coversExpensiveRoutes === true, "covers expensive routes");
  check(scaffold.requestSizeScaffoldPolicy.coversFuturePhase9DocumentRoutes === true, "covers future Phase 9 document routes");
});

await test("route group policy mapping includes all required groups", () => {
  const groups = scaffold.routeGroupPolicyMapping.map((m) => m.routeGroup);
  for (const g of ["root", "health", "auth", "conversation", "mode", "admin-index", "admin-read", "debug"]) {
    check(groups.includes(g), `route group mapping must include ${g}`);
  }
});

await test("public reconnaissance mapping covers /, /routes, /health, fallback-404", () => {
  const rp = scaffold.publicReconPolicyMapping.routes;
  for (const r of ["GET /", "GET /routes", "GET /health", "fallback-404"]) {
    check(rp.includes(r), `public recon mapping must cover ${r}`);
  }
  check(scaffold.publicReconPolicyMapping.requiredFuturePolicies.includes("route_recon_minimization"), "must require route_recon_minimization");
});

await test("admin/debug mapping requires no_query_secret, guards, rate_limit, and sanitization", () => {
  const req = scaffold.adminDebugPolicyMapping.requiredFuturePolicies;
  for (const p of ["no_query_secret", "admin_guard", "rate_limit", "error_sanitization", "log_redaction"]) {
    check(req.includes(p), `admin/debug mapping must require ${p}`);
  }
  check(scaffold.adminDebugPolicyMapping.debugRoutesAlsoRequire.includes("debug_guard"), "debug routes require debug_guard");
});

await test("integration references security policy fixture CORS/headers/rate_limit/request_size/recon", () => {
  const cats = scaffold.securityPolicyIntegration.crossCheckedCategories;
  for (const c of ["corsPolicy", "securityHeadersPolicy", "rateLimitPolicy", "requestSizePolicy", "reconnaissanceMinimizationPolicy"]) {
    check(cats.includes(c), `must cross-check ${c}`);
  }
  // Those categories must actually exist in the security policy fixture.
  for (const c of ["corsPolicy", "securityHeadersPolicy", "rateLimitPolicy", "requestSizePolicy", "reconnaissanceMinimizationPolicy"]) {
    check(Object.prototype.hasOwnProperty.call(policy, c), `security policy fixture must contain ${c}`);
  }
});

await test("integration references tenant isolation gate and secrets/env/logging safety gate", () => {
  check(scaffold.tenantIsolationIntegration.tenantIsolationGatePatchId === "PATCH-08S-TENANT-ISOLATION-GATE-1", "tenant gate patch id referenced");
  check(scaffold.tenantIsolationIntegration.scaffoldReplacesTenantIsolation === false, "scaffold does not replace tenant isolation");
  check(scaffold.tenantIsolationIntegration.tenantIsolationRemainsMandatoryBeforePhase9 === true, "tenant isolation mandatory before Phase 9");
  check(scaffold.secretsEnvLoggingIntegration.secretsEnvLoggingGatePatchId === "PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1", "secrets gate patch id referenced");
  check(scaffold.secretsEnvLoggingIntegration.secretsEnvLoggingRemainsMandatoryBeforePhase9 === true, "secrets/env/logging mandatory before Phase 9");
  // The referenced gate fixtures must actually be the expected patches.
  check(tenant.patch.id === "PATCH-08S-TENANT-ISOLATION-GATE-1", "tenant fixture patch id must match");
  check(secrets.patch.id === "PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1", "secrets fixture patch id must match");
});

await test("future implementation constraints prohibit package install, middleware wiring, and runtime changes", () => {
  check(scaffold.futureImplementationConstraints.packageInstallAllowedInThisPatch === false, "no package install");
  check(scaffold.futureImplementationConstraints.middlewareWiringAllowedInThisPatch === false, "no middleware wiring");
  check(scaffold.futureImplementationConstraints.runtimeChangeAllowedInThisPatch === false, "no runtime change");
});

await test("future smoke requirements include CORS rejection, headers, rate limits, /health, /routes, sanitized errors", () => {
  const s = scaffold.futureSmokeRequirements.join(" ").toLowerCase();
  check(s.includes("cors rejects"), "smoke: CORS rejects unapproved origins");
  check(s.includes("wildcard") && s.includes("credentials"), "smoke: wildcard+credentials cannot pass");
  check(s.includes("security headers present"), "smoke: headers present");
  check(s.includes("rate-limit triggers"), "smoke: rate-limit triggers");
  check(s.includes("/health"), "smoke: /health does not leak");
  check(s.includes("/routes"), "smoke: /routes minimized/gated");
  check(s.includes("errors are sanitized"), "smoke: production errors sanitized");
});

await test("Phase 9 blockers include scaffold, staging smoke, final closure, and both gates", () => {
  check(scaffold.phase9Blockers.phase9CanBegin === false, "Phase 9 cannot begin");
  for (const p of ["PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1", "PATCH-08S-STAGING-SECURITY-SMOKE-1", "PATCH-08S-FINAL-CLOSURE-GATE-1"]) {
    check(scaffold.phase9Blockers.requiredCompleteBeforePhase9.includes(p), `blocker must include ${p}`);
  }
  check(scaffold.phase9Blockers.tenantIsolationGateMustRemainSatisfied === true, "tenant gate must remain satisfied");
  check(scaffold.phase9Blockers.secretsEnvLoggingGateMustRemainSatisfied === true, "secrets gate must remain satisfied");
});

await test("prohibited claims block implemented/hardened/unblocked/memory claims", () => {
  const pc = scaffold.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["cors hardening is implemented", "security headers are implemented", "rate limiting is implemented", "runtime middleware is wired", "package dependencies are installed", "production is hardened", "phase 9 is unblocked", "persistent memory exists", "phase 8 memory is active"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("deferred boundaries preserve Phase 9/10/11/12/14 and Phase 8X separation", () => {
  check(scaffold.deferredBoundaries.phase9ImplementedInThisPatch === false, "Phase 9 not implemented");
  check(scaffold.deferredBoundaries.phase10SourceGovernance === "deferred", "Phase 10 deferred");
  check(scaffold.deferredBoundaries.phase11Observability === "deferred", "Phase 11 deferred");
  check(scaffold.deferredBoundaries.phase12DocumentAdvisory === "deferred", "Phase 12 deferred");
  check(scaffold.deferredBoundaries.phase14MobileAfterPhase13 === "deferred", "Phase 14 deferred");
  const x = scaffold.phase8XDiagnosticSeparation;
  check(x.id === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1" && x.isSeparate === true && x.implementedInThisPatch === false, "08X separate and not implemented");
});

await test("Phase 8 memory remains inactive and all flags disabled", () => {
  check(scaffold.phase8MemoryPolicy.memoryActive === false, "memory inactive");
  check(scaffold.memoryActive === false && scaffold.persistentMemoryExists === false, "no active/persistent memory");
  for (const f of ["TINA_ENABLE_MEMORY_READS", "TINA_ENABLE_MEMORY_WRITES", "TINA_ENABLE_MATTER_MEMORY", "TINA_ENABLE_MEMORY_SUGGESTIONS", "TINA_ENABLE_MEMORY_DEBUG_TRACE"]) {
    check(scaffold.phase8MemoryPolicy.memoryFlagsMustRemainDisabled.includes(f), `flag ${f} must be listed disabled`);
  }
});

await test("this test imports no runtime/server modules, reads no env vars, prints no env values", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08s-security-headers-cors-rate-limit-scaffold-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l));
  const forbidden = ["../server.js", "../routes", "../pipeline", "../ask-handler", "../auth.js", "supabase", "openai", "langfuse"];
  for (const line of importLines) {
    for (const token of forbidden) {
      check(!line.includes(token), `test must not import ${token}`);
    }
  }
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
