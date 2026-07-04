// PATCH-08S-FINAL-CLOSURE-GATE-1 - Phase 8S final closure gate test.
// Static, JSON-based validation only. Performs NO HTTP, does NOT start the
// server, imports no server.js/runtime modules, requires no env vars, and prints
// no env values. It validates the final closure fixture and its integration with
// the prior Phase 8S fixtures.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const CLOSURE_PATH = "evaluation/fixtures/phase-8s-final-closure-gate-1.fixture.json";
const INVENTORY_PATH = "evaluation/fixtures/phase-8s-security-route-inventory-1.fixture.json";
const POLICY_PATH = "evaluation/fixtures/phase-8s-security-policy-fixture-1.fixture.json";
const TENANT_PATH = "evaluation/fixtures/phase-8s-tenant-isolation-gate-1.fixture.json";
const SECRETS_PATH = "evaluation/fixtures/phase-8s-secrets-env-logging-safety-gate-1.fixture.json";
const SCAFFOLD_PATH = "evaluation/fixtures/phase-8s-security-headers-cors-rate-limit-scaffold-1.fixture.json";
const SMOKE_PATH = "evaluation/fixtures/phase-8s-staging-security-smoke-1.fixture.json";

const REQUIRED_COMMITS = ["70d7684", "56fd16d", "08ba6c8", "2de69d3", "b81579f", "f5a9d4b", "a396f67", "b44b80e", "cc1eaee"];

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

let closure, inventory, policy, tenant, secrets, scaffold, smoke;

await test("final closure fixture exists and all referenced fixtures are valid JSON", () => {
  check(existsSync(resolve(CLOSURE_PATH)), `${CLOSURE_PATH} must exist`);
  closure = load(CLOSURE_PATH);
  inventory = load(INVENTORY_PATH);
  policy = load(POLICY_PATH);
  tenant = load(TENANT_PATH);
  secrets = load(SECRETS_PATH);
  scaffold = load(SCAFFOLD_PATH);
  smoke = load(SMOKE_PATH);
});

await test("required top-level sections exist", () => {
  const required = [
    "patch", "decision", "baseCommit", "closureVersion", "nonRuntimePatch", "phaseClosed",
    "phaseClosedAs", "sourceArtifacts", "completedPatchLedger", "routeInventoryIntegration",
    "securityPolicyIntegration", "tenantIsolationIntegration", "secretsEnvLoggingIntegration",
    "headersCorsRateLimitScaffoldIntegration", "corsRemediationIntegration", "stagingSmokeIntegration",
    "acceptedWarnings", "criticalFailures", "futureImplementationItems", "phase9EntryGuardrails",
    "phase9BlockersOrConstraints", "prohibitedPhase9Scope", "phase8MemoryPolicy",
    "phase8XDiagnosticSeparation", "phase10DeferredBoundary", "phase11DeferredBoundary",
    "phase7BDeferredBoundary", "validationMatrix", "prohibitedClaims", "nextPhase", "testCases"
  ];
  for (const key of required) check(Object.prototype.hasOwnProperty.call(closure, key), `missing section: ${key}`);
  check(closure.patch.id === "PATCH-08S-FINAL-CLOSURE-GATE-1", "patch id");
});

await test("decision is PHASE 8S FINAL CLOSURE PASS WITH STRICT RECOMMENDATIONS", () => {
  check(closure.decision === "PHASE 8S FINAL CLOSURE PASS WITH STRICT RECOMMENDATIONS", `unexpected decision: ${closure.decision}`);
});

await test("patch is marked non-runtime", () => {
  check(closure.nonRuntimePatch === true, "nonRuntimePatch must be true");
  const d = closure.nonRuntimeDeclaration;
  for (const f of ["noRuntimeChange", "noDeployment", "noPackageChange", "noMiddlewareWiring", "noEnvChange", "noDbSupabaseChange", "noMemoryEnablement", "noPhase9Implementation", "noPhase10Implementation", "noPhase11Implementation"]) {
    check(d[f] === true, `${f} must be true`);
  }
});

await test("phase closed is Phase 8S — Security & Hardening Gate", () => {
  check(closure.phaseClosed === "Phase 8S — Security & Hardening Gate", "phaseClosed value");
  check(typeof closure.phaseClosedAs === "string" && closure.phaseClosedAs.length > 0, "phaseClosedAs present");
});

await test("completed patch ledger includes all required Phase 8S patches and commits", () => {
  const ledger = closure.completedPatchLedger;
  check(Array.isArray(ledger) && ledger.length >= 9, "ledger has >=9 entries");
  const commits = ledger.map((e) => e.commit);
  for (const c of REQUIRED_COMMITS) check(commits.includes(c), `ledger must include commit ${c}`);
  for (const e of ledger) {
    check(typeof e.patchId === "string" && typeof e.decision === "string" && typeof e.purpose === "string", `${e.commit} core fields`);
    check(["non_runtime_policy", "non_runtime_fixture", "narrow_runtime_cors_remediation", "staging_smoke_evidence"].includes(e.runtimeImpact), `${e.commit} valid runtimeImpact`);
  }
});

await test("ledger marks a396f67 as narrow_runtime_cors_remediation, not broad runtime hardening", () => {
  const cors = closure.completedPatchLedger.find((e) => e.commit === "a396f67");
  check(cors && cors.runtimeImpact === "narrow_runtime_cors_remediation", "a396f67 is narrow_runtime_cors_remediation");
  // No other ledger entry may claim broad runtime hardening.
  for (const e of closure.completedPatchLedger) {
    if (e.commit !== "a396f67") check(e.runtimeImpact !== "narrow_runtime_cors_remediation" || e.commit === "a396f67", `${e.commit} not mislabeled`);
  }
});

await test("route inventory integration matches recomputed counts", () => {
  const ri = closure.routeInventoryIntegration;
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

await test("prior fixture integrations reference the correct patch ids", () => {
  check(closure.securityPolicyIntegration.securityPolicyPatchId === policy.patch.id, "security policy patch id");
  check(closure.tenantIsolationIntegration.tenantIsolationGatePatchId === tenant.patch.id, "tenant gate patch id");
  check(closure.secretsEnvLoggingIntegration.secretsEnvLoggingGatePatchId === secrets.patch.id, "secrets gate patch id");
  check(closure.headersCorsRateLimitScaffoldIntegration.scaffoldPatchId === scaffold.patch.id, "scaffold patch id");
});

await test("CORS remediation integration confirms resolution both ways with no wildcard+credentials", () => {
  const c = closure.corsRemediationIntegration;
  check(c.remediationCommit === "a396f67", "remediation commit");
  check(c.priorCriticalFailure === "unknown_origin_reflected_with_credentials", "prior failure recorded");
  check(c.negativeOriginDenied === true, "negative origin denied");
  check(c.positiveOriginAllowed === true, "positive frontend origin allowed");
  check(c.wildcardWithCredentialsObserved === false, "no wildcard+credentials");
  check(c.status === "resolved", "status resolved");
  // Consistency with the staging smoke fixture.
  check(smoke.negativeCorsSmokeResults.unknownOriginAllowedWithCredentials === false, "smoke: unknown not allowed with credentials");
  check(smoke.positiveCorsSmokeResults.frontendOriginAllowed === true, "smoke: frontend allowed");
});

await test("staging smoke integration references cc1eaee and WARNING decision", () => {
  const s = closure.stagingSmokeIntegration;
  check(s.finalStagingSmokeCommit === "cc1eaee", "final smoke commit cc1eaee");
  check(/WARNING WITH STRICT RECOMMENDATIONS/.test(s.finalStagingSmokeDecision), "final smoke WARNING");
  check(s.noCriticalExposureRemains === true, "no critical exposure remains");
  check(s.warningStateAcceptedToCloseNotProofOfProductionHardening === true, "warning accepted, not proof of hardening");
});

await test("accepted warnings list includes all required policy-only items", () => {
  const w = closure.acceptedWarnings;
  for (const key of ["security_headers_absent", "rate_limit_headers_absent", "routes_public_route_enumeration", "health_metadata_exposure", "x_powered_by_express_exposure", "index_secret_query_string_removal_future", "tenant_client_matter_isolation_policy_gate_only", "logging_redaction_policy_gate_only"]) {
    check(w.includes(key), `accepted warnings must include ${key}`);
  }
});

await test("critical failures section states no unresolved critical staging FAIL remains", () => {
  check(closure.criticalFailures.unresolvedCriticalStagingFailRemains === false, "no unresolved critical FAIL");
});

await test("future implementation items include all required tracked items", () => {
  const f = closure.futureImplementationItems;
  for (const key of ["implement_security_headers", "implement_rate_limits_auth_mode_admin_expensive_health", "minimize_or_gate_routes", "minimize_health_metadata", "suppress_x_powered_by", "remove_or_replace_index_secret_query_string_with_header_only_or_stronger", "implement_tenant_client_matter_isolation_before_persistence_or_workproduct_storage", "implement_logging_redaction", "implement_third_party_langfuse_egress_redaction_or_blocking", "implement_request_size_policy_for_phase9_generated_document_routes"]) {
    check(f.includes(key), `future implementation items must include ${key}`);
  }
});

await test("Phase 9 entry guardrails prohibit production launch and unsafe persistence, and preserve source authority", () => {
  const g = closure.phase9EntryGuardrails;
  check(g.noProductionLaunch === true, "no production launch");
  check(g.noBroadClientMatterPersistenceUntilTenantIsolationImplemented === true, "no persistence without tenant isolation");
  check(g.noGeneratedWorkProductStorageUntilAccessControlsImplemented === true, "no work-product storage without access control");
  check(g.preserveSourceAuthorityDiscipline === true, "preserve source authority discipline");
  check(g.noUnredactedP1P2LogsOrThirdPartyEgress === true, "no unredacted P1/P2 logs/egress");
});

await test("prohibited Phase 9 scope preserves Phase 10 and Phase 11 boundaries", () => {
  const p = closure.prohibitedPhase9Scope;
  check(p.includes("implement_court_metadata_currentness_supersession_in_phase9"), "no Phase 10 in Phase 9");
  check(p.includes("implement_observability_performance_optimization_in_phase9"), "no Phase 11 in Phase 9");
  check(p.includes("implement_tenant_risky_client_matter_persistence_without_isolation"), "no tenant-risky persistence");
});

await test("Phase 8 memory policy keeps memory inactive and all flags disabled", () => {
  const m = closure.phase8MemoryPolicy;
  check(m.memoryActive === false, "memory inactive");
  check(m.memoryRemainsContextOnlyFutureDesignNeverAuthority === true, "memory context-only, never authority");
  for (const flag of ["TINA_ENABLE_MEMORY_READS", "TINA_ENABLE_MEMORY_WRITES", "TINA_ENABLE_MATTER_MEMORY", "TINA_ENABLE_MEMORY_SUGGESTIONS", "TINA_ENABLE_MEMORY_DEBUG_TRACE"]) {
    check(m.memoryFlagsMustRemainDisabled.includes(flag), `flag ${flag} must be listed disabled`);
  }
});

await test("Phase 8X diagnostic remains separate and does not block closure", () => {
  const x = closure.phase8XDiagnosticSeparation;
  check(x.id === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1", "08X id");
  check(x.isSeparate === true && x.isPersistentMemory === false && x.isPhase8SSecurity === false, "08X separate and non-security");
  check(x.implementedInThisPatch === false, "08X not implemented here");
  check(x.blocksPhase8SClosure === false, "08X does not block closure");
});

await test("deferred boundaries preserve Phase 7B, 10, 11, 12, and 14", () => {
  check(closure.phase7BDeferredBoundary === "separate", "Phase 7B separate");
  check(closure.phase10DeferredBoundary === "deferred", "Phase 10 deferred");
  check(closure.phase11DeferredBoundary === "deferred", "Phase 11 deferred");
  check(closure.phase12DeferredBoundary === "deferred", "Phase 12 deferred");
  check(/after Phase 13/i.test(closure.phase14MobileBoundary), "Phase 14 after Phase 13");
});

await test("prohibited claims block hardened/implemented/production-ready/memory claims", () => {
  const pc = closure.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["production is fully hardened", "security headers are implemented", "rate limits are implemented", "tenant isolation is implemented", "logging redaction is implemented", "phase 9 is production-ready", "phase 10 has started", "phase 11 has started", "persistent memory exists", "phase 8 memory is active"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("next phase records 08X recommended and Phase 9 as next major phase", () => {
  check(closure.nextPhase.nextRecommendedTask === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1", "08X recommended next");
  check(/Phase 9/.test(closure.nextPhase.nextMajorPhase), "Phase 9 next major phase");
});

await test("this test performs no HTTP, imports no runtime modules, and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08s-final-closure-gate-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l));
  const forbidden = ["../server.js", "../routes", "../pipeline", "../ask-handler", "../auth.js", "supabase", "openai", "langfuse", "node:http", "node:https", "undici", "node-fetch"];
  for (const line of importLines) {
    for (const token of forbidden) check(!line.includes(token), `test must not import ${token}`);
  }
  check(!/\bfetch\s*\(|https?\.request\s*\(|https?\.get\s*\(/.test(selfSrc), "test must not perform HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08S-FINAL-CLOSURE-GATE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
