// PATCH-08S-SECURITY-ROUTE-INVENTORY-1 - route inventory drift test.
// Static, source-based validation only. Does NOT start the server, bind ports,
// import server.js/routes/runtime modules, require env vars, or call any external
// service (OpenAI/Supabase/Drive/Langfuse). It reads source files as text and
// validates the JSON inventory fixture against them.

import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = "evaluation/fixtures/phase-8s-security-route-inventory-1.fixture.json";

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

// ── Load fixture (also proves valid JSON) ──────────────────────────────────────
let fixture;
await test("inventory fixture exists and is valid JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fixture = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(Array.isArray(fixture.routes) && fixture.routes.length > 0, "fixture.routes must be a non-empty array");
});

const routes = fixture?.routes ?? [];
const REQUIRED_FIELDS = [
  "id", "method", "path", "sourceFile", "routeGroup", "classification", "guardType",
  "authRequired", "adminRequired", "debugOrDiagnostic", "publicExposure", "acceptsUserInput",
  "expensiveOperation", "modelCallPossible", "retrievalPossible", "dbReadPossible",
  "dbWritePossible", "indexingPossible", "thirdPartyEgressPossible", "logsUserContentPossible",
  "sensitivityClass", "phase9Risk", "requiredFuturePolicies", "notes"
];
const CLASSIFICATIONS = ["public", "authenticated", "admin", "debug", "internal", "unknown"];
const GUARD_TYPES = ["none", "authenticate", "allowAuthenticatedOrIndexSecret", "indexSecret", "future-required", "unknown"];

await test("each route entry has all required fields", () => {
  for (const r of routes) {
    for (const field of REQUIRED_FIELDS) {
      check(Object.prototype.hasOwnProperty.call(r, field), `${r.id ?? "<no id>"} missing field: ${field}`);
    }
  }
});

await test("route IDs are unique", () => {
  const ids = routes.map((r) => r.id);
  check(new Set(ids).size === ids.length, "duplicate route id detected");
});

await test("method + path pairs are unique", () => {
  const keys = routes.map((r) => `${r.method} ${r.path}`);
  check(new Set(keys).size === keys.length, "duplicate method+path detected");
});

await test("every route has a valid classification and guardType", () => {
  for (const r of routes) {
    check(CLASSIFICATIONS.includes(r.classification), `${r.id} invalid classification: ${r.classification}`);
    check(GUARD_TYPES.includes(r.guardType), `${r.id} invalid guardType: ${r.guardType}`);
  }
});

await test("public routes are explicitly marked publicExposure true", () => {
  for (const r of routes.filter((x) => x.classification === "public")) {
    check(r.publicExposure === true, `${r.id} public classification must have publicExposure true`);
  }
});

await test("authenticated/mode/admin routes are not marked publicExposure true", () => {
  for (const r of routes.filter((x) => ["authenticated", "admin"].includes(x.classification) || x.routeGroup === "mode")) {
    check(r.publicExposure === false, `${r.id} must not be publicExposure true`);
  }
});

await test("mode routes are marked expensiveOperation true and require rate_limit + log_redaction", () => {
  const mode = routes.filter((r) => r.routeGroup === "mode");
  check(mode.length === 12, `expected 12 mode routes, found ${mode.length}`);
  for (const r of mode) {
    check(r.expensiveOperation === true, `${r.id} mode route must be expensiveOperation true`);
    check(r.guardType === "authenticate", `${r.id} mode route must be guardType authenticate`);
    check(r.requiredFuturePolicies.includes("rate_limit"), `${r.id} must require rate_limit`);
    check(r.requiredFuturePolicies.includes("log_redaction"), `${r.id} must require log_redaction`);
  }
});

await test("model/retrieval routes require rate_limit and log_redaction future policies", () => {
  for (const r of routes.filter((x) => x.modelCallPossible === true || x.retrievalPossible === true)) {
    check(r.expensiveOperation === true, `${r.id} model/retrieval route must be expensiveOperation true`);
    check(r.requiredFuturePolicies.includes("rate_limit"), `${r.id} must require rate_limit`);
    check(r.requiredFuturePolicies.includes("log_redaction"), `${r.id} must require log_redaction`);
  }
});

await test("admin/index routes require admin_guard and rate_limit future policies", () => {
  const admin = routes.filter((r) => r.classification === "admin");
  check(admin.length > 0, "expected at least one admin route");
  for (const r of admin) {
    check(r.adminRequired === true, `${r.id} admin route must have adminRequired true`);
    check(r.guardType === "allowAuthenticatedOrIndexSecret" || r.guardType === "indexSecret", `${r.id} admin route must be secret/auth-guarded`);
    check(r.requiredFuturePolicies.includes("admin_guard"), `${r.id} must require admin_guard`);
    check(r.requiredFuturePolicies.includes("rate_limit"), `${r.id} must require rate_limit`);
    check(r.requiredFuturePolicies.includes("no_query_secret"), `${r.id} admin route must require no_query_secret (INDEX_SECRET accepted via query today)`);
  }
});

await test("debug/diagnostic routes require debug_guard and error_sanitization future policies", () => {
  const debug = routes.filter((r) => r.classification === "debug" || r.routeGroup === "debug");
  check(debug.length > 0, "expected at least one debug route");
  for (const r of debug) {
    check(r.debugOrDiagnostic === true, `${r.id} debug route must be debugOrDiagnostic true`);
    check(r.requiredFuturePolicies.includes("debug_guard"), `${r.id} must require debug_guard`);
    check(r.requiredFuturePolicies.includes("error_sanitization"), `${r.id} must require error_sanitization`);
  }
});

await test("routes that may touch user/client/matter data require tenant_isolation policy", () => {
  const userDataGroups = ["conversation", "mode", "auth"];
  for (const r of routes.filter((x) => userDataGroups.includes(x.routeGroup))) {
    check(r.requiredFuturePolicies.includes("tenant_isolation"), `${r.id} (${r.routeGroup}) must require tenant_isolation`);
  }
});

await test("no route entry claims security hardening is already implemented", () => {
  check(fixture.patch.runtimeSecurityImplemented === false, "runtimeSecurityImplemented must be false");
  check(fixture.patch.middlewareWired === false, "middlewareWired must be false");
  const raw = readFileSync(resolve(FIXTURE_PATH), "utf8");
  check(!/"hardened"\s*:\s*true/i.test(raw), "no entry may claim hardened:true");
  check(!/"implemented"\s*:\s*true/i.test(raw), "no entry may claim implemented:true");
});

await test("Phase 8 memory remains inactive and no memory runtime routes are inventoried", () => {
  check(fixture.patch.memoryActive === false, "memoryActive must be false");
  for (const r of routes) {
    check(!/memory/i.test(r.path), `${r.id} must not inventory a memory runtime route: ${r.path}`);
  }
});

await test("Phase 9 routes are not present and Phase 10/11 are not introduced", () => {
  check(fixture.patch.phase9RoutesPresent === false, "phase9RoutesPresent must be false");
  check(fixture.patch.phase10Implemented === false, "phase10Implemented must be false");
  check(fixture.patch.phase11Implemented === false, "phase11Implemented must be false");
  const phase9Paths = ["/memo", "/protest", "/audit-defense-matrix", "/compliance-calendar", "/checklist", "/advisory", "/engagement", "/working-paper"];
  for (const r of routes) {
    check(!phase9Paths.includes(r.path), `${r.id} must not inventory a Phase 9 route: ${r.path}`);
  }
});

await test("PATCH-08X chat-context diagnostic is not included as a Phase 8S route/security item", () => {
  check(fixture.patch.chatContextDiagnosticIncluded === false, "chatContextDiagnosticIncluded must be false");
  check(typeof fixture.patch.chatContextDiagnosticReference === "string" && fixture.patch.chatContextDiagnosticReference.includes("PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1"), "08X must be referenced as separate");
  for (const r of routes) {
    check(!/chat.?context|carryover/i.test(r.id + r.path + r.notes), `${r.id} must not encode the 08X chat-context item as a route`);
  }
});

// ── Static route extraction from source (no imports) ───────────────────────────
const serverSrc = readFileSync(resolve("server.js"), "utf8");

function extractServerRoutes(src) {
  const found = [];
  const re = /app\.(get|post|put|delete)\(\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    found.push(`${m[1].toUpperCase()} ${m[2]}`);
  }
  return found;
}

function extractModeRoutes() {
  const routeDir = resolve("routes");
  const files = readdirSync(routeDir).filter((f) => f.endsWith("-route.js"));
  const found = [];
  for (const f of files) {
    const src = readFileSync(resolve("routes", f), "utf8");
    const m = src.match(/attachForcedHook\(\s*"([^"]+)"\s*\)/);
    if (m) found.push({ hook: `POST ${m[1]}`, file: f, src });
  }
  return found;
}

await test("static extraction: every server.js route has a matching inventory entry", () => {
  const extracted = extractServerRoutes(serverSrc);
  check(extracted.length >= 17, `expected >=17 server.js routes, extracted ${extracted.length}`);
  const inventoryKeys = new Set(routes.map((r) => `${r.method} ${r.path}`));
  for (const key of extracted) {
    check(inventoryKeys.has(key), `server.js route not in inventory: ${key}`);
  }
});

await test("static extraction: every mode route has an authenticate-guarded inventory entry", () => {
  const mode = extractModeRoutes();
  check(mode.length === 12, `expected 12 mode route files, found ${mode.length}`);
  const inventoryKeys = new Set(routes.map((r) => `${r.method} ${r.path}`));
  for (const { hook, file, src } of mode) {
    check(inventoryKeys.has(hook), `mode route not in inventory: ${hook} (${file})`);
    check(/authenticate\s*,\s*attachForcedHook/.test(src), `${file} must mount authenticate before attachForcedHook`);
  }
});

await test("no unexpected extra actual routes exist without an inventory entry", () => {
  const extracted = new Set([
    ...extractServerRoutes(serverSrc),
    ...extractModeRoutes().map((x) => x.hook)
  ]);
  // Every non-fallback inventory entry must correspond to an actually-declared route.
  for (const r of routes) {
    if (r.routeGroup === "fallback") continue;
    check(extracted.has(`${r.method} ${r.path}`), `inventory entry has no matching source route: ${r.method} ${r.path}`);
  }
  // And every actually-declared route must be inventoried (drift both directions).
  const inventoryKeys = new Set(routes.map((r) => `${r.method} ${r.path}`));
  for (const key of extracted) {
    check(inventoryKeys.has(key), `actual route missing from inventory: ${key}`);
  }
});

await test("static guard checks: public routes have no route-level guard; admin routes use allowAuthenticatedOrIndexSecret", () => {
  check(/app\.get\("\/",\s*\(req, res\)/.test(serverSrc) || /app\.get\("\/", \(req/.test(serverSrc), "GET / is unguarded (public)");
  check(
    /app\.get\(\s*["']\/health["']\s*,\s*healthHandler\s*\)/.test(serverSrc),
    "GET /health is unguarded (public)"
  );
  check(/app\.post\("\/register",\s*async \(req/.test(serverSrc), "POST /register is unguarded (public)");
  check(/app\.post\("\/login",\s*async \(req/.test(serverSrc), "POST /login is unguarded (public)");
  check(/app\.post\("\/conversations",\s*authenticate/.test(serverSrc), "POST /conversations is authenticate-guarded");
  check(/app\.get\("\/index-drive",\s*allowAuthenticatedOrIndexSecret/.test(serverSrc), "GET /index-drive is admin-guarded");
  check(/app\.get\("\/debug\/db-identity",\s*allowAuthenticatedOrIndexSecret/.test(serverSrc), "GET /debug/db-identity is admin-guarded");
});

await test("this test imports no runtime/server modules and requires no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08s-security-route-inventory-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l));
  const forbidden = ["../server.js", "../routes", "../pipeline", "../ask-handler", "../auth.js", "supabase", "openai", "langfuse"];
  for (const line of importLines) {
    for (const token of forbidden) {
      check(!line.includes(token), `test must not import ${token}`);
    }
  }
  // Detect actual env access (process.env.<NAME>), not the literal token in this assertion.
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08S-SECURITY-ROUTE-INVENTORY-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
