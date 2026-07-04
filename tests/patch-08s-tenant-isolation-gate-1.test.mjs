// PATCH-08S-TENANT-ISOLATION-GATE-1 - tenant/client/matter isolation gate test.
// Static, JSON-based validation only. Does NOT start the server, bind ports,
// import server.js/routes/runtime modules, require env vars, or call any external
// service. It cross-checks the tenant gate fixture against the route inventory
// and security policy fixtures.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const TENANT_GATE_PATH = "evaluation/fixtures/phase-8s-tenant-isolation-gate-1.fixture.json";
const INVENTORY_PATH = "evaluation/fixtures/phase-8s-security-route-inventory-1.fixture.json";
const POLICY_PATH = "evaluation/fixtures/phase-8s-security-policy-fixture-1.fixture.json";
const SERVICE_ROLE_WORDING = "Supabase service-role access may be acceptable only for tightly controlled server-only administrative/source-corpus operations. It is not acceptable as the default access path for user/client/matter data in Phase 9 without tenant-scoping, RLS, or an equivalent isolation model.";

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

const hasText = (value, needle) => JSON.stringify(value).toLowerCase().includes(needle.toLowerCase());

let gate;
let inventory;
let policy;

await test("tenant isolation gate fixture exists and is valid JSON", () => {
  check(existsSync(resolve(TENANT_GATE_PATH)), `${TENANT_GATE_PATH} must exist`);
  gate = JSON.parse(readFileSync(resolve(TENANT_GATE_PATH), "utf8"));
  check(existsSync(resolve(INVENTORY_PATH)), `${INVENTORY_PATH} must exist`);
  inventory = JSON.parse(readFileSync(resolve(INVENTORY_PATH), "utf8"));
  check(existsSync(resolve(POLICY_PATH)), `${POLICY_PATH} must exist`);
  policy = JSON.parse(readFileSync(resolve(POLICY_PATH), "utf8"));
});

await test("required top-level sections exist", () => {
  const required = [
    "patch", "decision", "baseCommit", "gateVersion", "nonRuntimePatch",
    "sourceArtifacts", "routeInventoryIntegration", "securityPolicyIntegration",
    "tenantIsolationPrinciples", "protectedDataClasses", "tenantScopeModel",
    "subjectTypes", "objectTypes", "requiredIsolationDimensions", "routeRiskMapping",
    "supabaseServiceRolePolicy", "dbAccessClassification", "allowedServiceRoleUses",
    "prohibitedServiceRoleUses", "requiredFutureArchitecture", "phase9Blockers",
    "requiredFutureTests", "migrationAndRlsDeferred", "prohibitedClaims",
    "deferredBoundaries", "phase8MemoryPolicy", "phase8XDiagnosticSeparation",
    "futurePatchDependencies", "testCases"
  ];
  for (const key of required) {
    check(Object.prototype.hasOwnProperty.call(gate, key), `missing top-level section: ${key}`);
  }
});

await test("decision is tenant isolation gate pass with strict recommendations", () => {
  check(gate.decision === "TENANT ISOLATION GATE PASS WITH STRICT RECOMMENDATIONS", "unexpected decision");
});

await test("patch is marked non-runtime", () => {
  check(gate.nonRuntimePatch === true, "nonRuntimePatch must be true");
  check(gate.patch.runtimeTenantIsolationImplemented === false, "tenant isolation must not be implemented");
  check(gate.patch.runtimeSecurityImplemented === false, "runtime security must not be implemented");
  check(gate.patch.middlewareWired === false, "middleware must not be wired");
  check(gate.patch.dbChanged === false, "DB must not be changed");
  check(gate.patch.supabaseCodeChanged === false, "Supabase code must not be changed");
});

await test("tenant/client/matter isolation is mandatory before Phase 9", () => {
  check(gate.tenantIsolationPrinciples.includes("Tenant/client/matter isolation is mandatory before Phase 9."), "mandatory principle missing");
  check(gate.tenantIsolationPrinciples.some((p) => p.includes("Generated professional work product must be access-controlled")), "generated work product access-control principle missing");
  check(gate.tenantIsolationPrinciples.some((p) => p.includes("Conversation history and prompts must not be readable across users/clients/matters")), "conversation isolation principle missing");
  check(gate.phase9Blockers.phase9CanBegin === false, "Phase 9 must remain blocked");
});

await test("route inventory integration matches expected counts and health fact", () => {
  const routes = inventory.routes;
  const tenantRoutes = routes.filter((r) => r.requiredFuturePolicies.includes("tenant_isolation"));
  const modeRoutes = routes.filter((r) => r.routeGroup === "mode");
  const conversationRoutes = routes.filter((r) => r.routeGroup === "conversation");
  const expensiveRoutes = routes.filter((r) => r.expensiveOperation === true);
  const noQuerySecretRoutes = routes.filter((r) => r.requiredFuturePolicies.includes("no_query_secret"));
  const health = routes.find((r) => r.method === "GET" && r.path === "/health");

  check(routes.length === 30, `inventory must have 30 routes, found ${routes.length}`);
  check(tenantRoutes.length === 17, `inventory must have 17 tenant_isolation routes, found ${tenantRoutes.length}`);
  check(modeRoutes.length === 12, `inventory must have 12 mode routes, found ${modeRoutes.length}`);
  check(conversationRoutes.length === 3, `inventory must have 3 conversation routes, found ${conversationRoutes.length}`);
  check(expensiveRoutes.length === 22, `inventory must have 22 expensive routes, found ${expensiveRoutes.length}`);
  check(noQuerySecretRoutes.length === 9, `inventory must have 9 no_query_secret routes, found ${noQuerySecretRoutes.length}`);
  check(health?.dbReadPossible === true, "GET /health must perform a DB read");
  check(health?.requiredFuturePolicies.includes("rate_limit"), "GET /health must require rate_limit");

  check(gate.routeInventoryIntegration.totalRoutes === routes.length, "gate totalRoutes must match inventory");
  check(gate.routeInventoryIntegration.tenantIsolationRouteCount === tenantRoutes.length, "gate tenant count must match inventory");
  check(gate.routeInventoryIntegration.modeRouteCount === modeRoutes.length, "gate mode count must match inventory");
  check(gate.routeInventoryIntegration.conversationRouteCount === conversationRoutes.length, "gate conversation count must match inventory");
  check(gate.routeInventoryIntegration.expensiveRouteCount === expensiveRoutes.length, "gate expensive count must match inventory");
  check(gate.routeInventoryIntegration.noQuerySecretAdminRouteCount === noQuerySecretRoutes.length, "gate no_query_secret count must match inventory");
  check(gate.routeInventoryIntegration.healthPerformsDbRead === true, "gate must record /health DB read");
  check(gate.routeInventoryIntegration.healthRequiresRateLimit === true, "gate must record /health rate-limit requirement");
});

await test("every tenant isolation route is mapped to future tenant policies", () => {
  const tenantRouteIds = inventory.routes
    .filter((r) => r.requiredFuturePolicies.includes("tenant_isolation"))
    .map((r) => r.id)
    .sort();
  const mapped = [...gate.routeRiskMapping.tenantIsolationRoutes].sort();
  check(JSON.stringify(mapped) === JSON.stringify(tenantRouteIds), "tenant route mapping must match inventory tenant_isolation route ids");
  for (const policyId of [
    "tenant_scope_required",
    "subject_authorization_required",
    "object_scope_required",
    "no_cross_user_access",
    "no_cross_client_access_future",
    "no_cross_matter_access_future",
    "redaction_required",
    "audit_policy_required_future"
  ]) {
    check(gate.routeRiskMapping.futurePolicyRequiredForEachTenantRoute.includes(policyId), `route mapping missing ${policyId}`);
  }
});

await test("security policy integration references tenant isolation and Supabase service-role as CRITICAL", () => {
  check(policy.tenantIsolationPolicy.severity === "CRITICAL", "policy tenant_isolation must be CRITICAL");
  check(policy.supabaseServiceRolePolicy.severity === "CRITICAL", "policy supabase_service_role must be CRITICAL");
  check(gate.securityPolicyIntegration.tenantIsolationPolicy.severity === "CRITICAL", "gate tenant_isolation must be CRITICAL");
  check(gate.securityPolicyIntegration.supabaseServiceRolePolicy.severity === "CRITICAL", "gate supabase_service_role must be CRITICAL");
  check(gate.securityPolicyIntegration.tenantIsolationPolicy.tenantIsolationRouteCount === policy.tenantIsolationPolicy.tenantIsolationRouteCount, "tenant count must match policy fixture");
});

await test("calibrated Supabase service-role wording appears exactly", () => {
  check(policy.supabaseServiceRolePolicy.calibratedWording === SERVICE_ROLE_WORDING, "policy wording must match exactly");
  check(gate.supabaseServiceRolePolicy.calibratedWording === SERVICE_ROLE_WORDING, "gate wording must match exactly");
  check(gate.securityPolicyIntegration.supabaseServiceRolePolicy.calibratedWording === SERVICE_ROLE_WORDING, "integration wording must match exactly");
});

await test("allowed service-role uses are limited to server-only admin/source-corpus style operations", () => {
  for (const allowed of [
    "source corpus ingestion",
    "source chunk indexing",
    "vector maintenance",
    "controlled admin/index operations",
    "system health checks only if minimized and guarded appropriately in future",
    "migrations and maintenance outside user-facing request paths"
  ]) {
    check(gate.allowedServiceRoleUses.includes(allowed), `allowed service-role use missing: ${allowed}`);
  }
  check(!gate.allowedServiceRoleUses.some((x) => /client profile CRUD|matter profile CRUD|generated professional document CRUD/i.test(x)), "allowed uses must not include user/client/matter CRUD");
});

await test("prohibited service-role uses include default user-facing data access and generated/client/matter CRUD", () => {
  for (const prohibited of [
    "default user-facing data access path",
    "generated professional document CRUD",
    "client profile CRUD",
    "matter profile CRUD",
    "cross-user conversation reads",
    "cross-client/matter reads",
    "direct trust of client-supplied tenant/client/matter IDs without authorization proof"
  ]) {
    check(gate.prohibitedServiceRoleUses.includes(prohibited), `prohibited service-role use missing: ${prohibited}`);
  }
});

await test("required future architecture options include RLS, server-mediated enforcement, and hybrid model", () => {
  const descriptions = gate.requiredFutureArchitecture.options.map((o) => o.description).join("\n");
  check(/RLS-enforced/i.test(descriptions), "RLS option missing");
  check(/Server-mediated tenant enforcement/i.test(descriptions), "server-mediated tenant enforcement option missing");
  check(/Hybrid model/i.test(descriptions), "hybrid model option missing");
  check(gate.requiredFutureArchitecture.phase9CannotBeginUntilSelectedDesignedFixtureTestedApproved === true, "Phase 9 must wait for architecture selection/design/test/approval");
  check(gate.requiredFutureArchitecture.noOptionImplementedOrRuntimeApprovedInThisPatch === true, "no architecture option may be implemented or runtime-approved here");
});

await test("Phase 9 blockers include tenant architecture and remaining Phase 8S gates", () => {
  const blockers = gate.phase9Blockers.requiredCompleteBeforePhase9.join("\n");
  for (const needle of [
    "tenant isolation architecture selected or formally gated for implementation",
    "user/client/matter data access rules defined",
    "generated work product access rules defined",
    "service-role permitted/prohibited use boundaries defined",
    "route inventory tenant_isolation routes mapped to future controls",
    "PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1 complete",
    "PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1 complete",
    "PATCH-08S-STAGING-SECURITY-SMOKE-1 complete",
    "PATCH-08S-FINAL-CLOSURE-GATE-1 complete"
  ]) {
    check(blockers.includes(needle), `Phase 9 blocker missing: ${needle}`);
  }
});

await test("required future tests include cross-scope denial, work product auth, and service-role separation", () => {
  const tests = gate.requiredFutureTests.join("\n");
  for (const needle of [
    "no cross-user conversation read",
    "no cross-client document read future",
    "no cross-matter document read future",
    "generated work product must require owner/client/matter authorization",
    "service-role import/use cannot appear in user/client/matter runtime paths unless explicitly exempted",
    "source-corpus admin operations must be separated from user/client/matter data flows"
  ]) {
    check(tests.includes(needle), `future test missing: ${needle}`);
  }
});

await test("migration, RLS, schema, and Supabase implementation are explicitly deferred", () => {
  check(gate.migrationAndRlsDeferred.noMigrationsInThisPatch === true, "migrations must be deferred");
  check(gate.migrationAndRlsDeferred.noRlsPolicyInThisPatch === true, "RLS policy must be deferred");
  check(gate.migrationAndRlsDeferred.noSchemaChangesInThisPatch === true, "schema changes must be deferred");
  check(gate.migrationAndRlsDeferred.noSupabaseCodeChangesInThisPatch === true, "Supabase code changes must be deferred");
  check(gate.migrationAndRlsDeferred.futureDbRlsWorkRequiresSeparateDesignFixtureImplementationSmokeGate === true, "future DB/RLS work must be separately gated");
});

await test("prohibited claims block implemented isolation, RLS, service-role fix, Phase 9 unblock, and runtime hardening", () => {
  for (const claim of [
    "tenant isolation is implemented",
    "RLS is implemented",
    "service-role risk is fixed",
    "Phase 9 is unblocked",
    "runtime security hardening is implemented"
  ]) {
    check(gate.prohibitedClaims.includes(claim), `prohibited claim missing: ${claim}`);
  }
});

await test("Phase 8 memory remains inactive and persistent memory does not exist", () => {
  check(gate.phase8MemoryPolicy.memoryActive === false, "memory must be inactive");
  check(gate.phase8MemoryPolicy.persistentMemoryExists === false, "persistent memory must not exist");
  check(gate.patch.memoryActive === false, "patch memoryActive must be false");
  check(gate.patch.persistentMemoryExists === false, "patch persistentMemoryExists must be false");
});

await test("Phase 8X diagnostic remains separate", () => {
  check(gate.phase8XDiagnosticSeparation.id === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1", "08X id missing");
  check(gate.phase8XDiagnosticSeparation.isSeparate === true, "08X must be separate");
  check(gate.phase8XDiagnosticSeparation.isPersistentMemory === false, "08X must not be persistent memory");
  check(gate.phase8XDiagnosticSeparation.isPhase8SSecurity === false, "08X must not be Phase 8S security");
  check(gate.phase8XDiagnosticSeparation.implementedInThisPatch === false, "08X must not be implemented here");
});

await test("Phase 10 and Phase 11 remain deferred", () => {
  check(gate.deferredBoundaries.phase10SourceGovernance === "deferred", "Phase 10 source governance must be deferred");
  check(gate.deferredBoundaries.phase11Observability === "deferred", "Phase 11 observability must be deferred");
  check(gate.patch.phase10Implemented === false, "Phase 10 must not be implemented");
  check(gate.patch.phase11Implemented === false, "Phase 11 must not be implemented");
});

await test("no policy claims runtime tenant isolation is implemented or persistent memory exists", () => {
  const raw = readFileSync(resolve(TENANT_GATE_PATH), "utf8");
  check(!/"runtimeTenantIsolationImplemented"\s*:\s*true/i.test(raw), "must not claim runtime tenant isolation implemented");
  check(!/"rlsImplemented"\s*:\s*true/i.test(raw), "must not claim RLS implemented");
  check(!/"persistentMemoryExists"\s*:\s*true/i.test(raw), "must not claim persistent memory exists");
  check(gate.phase9Blockers.phase9CanBegin === false, "gate must not assert Phase 9 can begin");
  check(gate.deferredBoundaries.phase9ProfessionalWorkflowCoPilot === "blocked_not_started", "Phase 9 must remain blocked/not started");
});

await test("this test imports no runtime/server modules and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08s-tenant-isolation-gate-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((line) => /^\s*import\s/.test(line));
  const forbidden = ["../server.js", "../routes", "../pipeline", "../ask-handler", "../auth.js", "supabase", "openai", "langfuse"];
  for (const line of importLines) {
    for (const token of forbidden) {
      check(!line.includes(token), `test must not import ${token}`);
    }
  }
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08S-TENANT-ISOLATION-GATE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
