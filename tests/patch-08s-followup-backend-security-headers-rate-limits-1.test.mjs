// PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-1 - focused test.
//
// Static + pure-helper validation only. This test performs NO HTTP, calls NO
// OpenAI / Supabase / Google Drive, reads NO env vars, starts NO server, and
// binds NO ports. It never imports server.js (which calls app.listen and reads
// env at module load). It imports only the pure, side-effect-free helpers under
// security/ and inspects server.js as text.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  BACKEND_CSP,
  getSecurityHeaders,
  createSecurityHeadersMiddleware
} from "../security/security-headers.js";
import {
  RATE_LIMIT_TIERS,
  isExpensiveRoute,
  isAdminRoute,
  isHealthRoute,
  getRateLimitTier,
  getRateLimitKey,
  accountRequest,
  createRateLimitMiddleware
} from "../security/rate-limit.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-08s-followup-backend-security-headers-rate-limits-1.fixture.json";
const SERVER_PATH = "server.js";
const HEADERS_HELPER_PATH = "security/security-headers.js";
const RATE_HELPER_PATH = "security/rate-limit.js";

const VALID_DECISIONS = [
  "BACKEND SECURITY HEADERS RATE LIMITS FOLLOWUP PASS WITH STRICT RECOMMENDATIONS",
  "BACKEND SECURITY HEADERS RATE LIMITS FOLLOWUP WARNING WITH STRICT RECOMMENDATIONS",
  "BACKEND SECURITY HEADERS RATE LIMITS FOLLOWUP BLOCKED"
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

function mockRes() {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    _headers: headers,
    setHeader(k, v) { headers[k] = v; },
    removeHeader(k) { delete headers[k]; },
    getHeader(k) { return headers[k]; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; }
  };
}

let fx;
let serverSrc;
let headersSrc;
let rateSrc;

await test("fixture exists and parses; source files readable", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  serverSrc = readFileSync(resolve(SERVER_PATH), "utf8");
  headersSrc = readFileSync(resolve(HEADERS_HELPER_PATH), "utf8");
  rateSrc = readFileSync(resolve(RATE_HELPER_PATH), "utf8");
});

await test("patch id and decision are valid", () => {
  check(fx.patch.id === "PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

await test("phase status: 8S closed and not reopened, 08X closed, Phase 9 not started, memory inactive", () => {
  const p = fx.phaseStatus;
  check(p.phase8SClosed === true && p.phase8SReopened === false, "8S closed and not reopened");
  check(p.phase08XClosed === true, "08X closed");
  check(p.phase9NotStarted === true, "Phase 9 not started");
  check(p.memoryInactive === true, "memory inactive");
});

await test("frontend security header reference includes commit 23503ba", () => {
  check(fx.frontendSecurityHeadersReference.commit === "23503ba", "frontend commit 23503ba");
  check(fx.frontendSecurityHeadersReference.status === "complete", "frontend complete");
});

await test("required security headers recorded in fixture with exact values", () => {
  const h = fx.securityHeaders;
  check(h["X-Content-Type-Options"] === "nosniff", "nosniff");
  check(h["X-Frame-Options"] === "DENY", "DENY");
  check(h["Referrer-Policy"] === "strict-origin-when-cross-origin", "referrer");
  check(h["Permissions-Policy"] === "camera=(), microphone=(), geolocation=()", "permissions-policy");
  check(h["Cross-Origin-Opener-Policy"] === "same-origin", "coop");
  check(h["Cross-Origin-Resource-Policy"] === "same-site", "corp");
  check(h["Cache-Control"] === "no-store", "cache-control");
});

await test("backend CSP recorded with all required directives", () => {
  const csp = fx.cspPolicy.value;
  for (const directive of ["default-src 'none'", "frame-ancestors 'none'", "base-uri 'none'", "form-action 'none'"]) {
    check(csp.includes(directive), `backend CSP must include: ${directive}`);
  }
  check(!/unsafe-inline|unsafe-eval/.test(csp), "backend CSP must not include unsafe-inline/unsafe-eval");
});

await test("server.js disables x-powered-by", () => {
  check(/app\.disable\(\s*["']x-powered-by["']\s*\)/.test(serverSrc), "app.disable(x-powered-by) present");
});

await test("server.js wires security headers and rate limiter before routes", () => {
  check(/createSecurityHeadersMiddleware\s*\(/.test(serverSrc), "security headers middleware used");
  check(/createRateLimitMiddleware\s*\(/.test(serverSrc), "rate limiter middleware used");
  const disableIdx = serverSrc.search(/app\.disable\(\s*["']x-powered-by["']/);
  // Match the app.use(...) usage sites, not the top-of-file import lines.
  const headersUseIdx = serverSrc.search(/app\.use\(\s*createSecurityHeadersMiddleware/);
  const rateUseIdx = serverSrc.search(/app\.use\(\s*createRateLimitMiddleware/);
  const routesIdx = serverSrc.search(/registerTinaRoutes\s*\(\s*app/);
  check(disableIdx >= 0 && headersUseIdx >= 0 && rateUseIdx >= 0 && routesIdx >= 0, "all wiring points present");
  check(disableIdx < headersUseIdx, "disable before security headers use");
  check(headersUseIdx < rateUseIdx, "security headers before rate limiter");
  check(rateUseIdx < routesIdx, "rate limiter before routes");
});

await test("security-headers helper defines all required headers and API-only CSP", () => {
  const h = getSecurityHeaders();
  for (const key of ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy", "Cross-Origin-Opener-Policy", "Cross-Origin-Resource-Policy", "Content-Security-Policy", "Cache-Control"]) {
    check(Object.prototype.hasOwnProperty.call(h, key), `helper defines ${key}`);
  }
  check(BACKEND_CSP === "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'", "BACKEND_CSP value");
});

await test("security-headers middleware sets required headers and removes X-Powered-By on mock res", () => {
  const res = mockRes();
  res.setHeader("X-Powered-By", "Express");
  let nextCalled = false;
  createSecurityHeadersMiddleware()({}, res, () => { nextCalled = true; });
  check(nextCalled === true, "next called");
  check(res.getHeader("X-Powered-By") === undefined, "X-Powered-By removed");
  check(res.getHeader("X-Content-Type-Options") === "nosniff", "nosniff set");
  check(res.getHeader("X-Frame-Options") === "DENY", "DENY set");
  check(res.getHeader("Referrer-Policy") === "strict-origin-when-cross-origin", "referrer set");
  check(res.getHeader("Content-Security-Policy") === BACKEND_CSP, "CSP set");
  check(res.getHeader("Cache-Control") === "no-store", "no-store set");
});

await test("rate-limit helper source emits 429 and rate-limit headers", () => {
  check(/\.status\(\s*429\s*\)/.test(rateSrc), "429 present");
  check(/Retry-After/.test(rateSrc), "Retry-After present");
  check(/X-RateLimit-Limit/.test(rateSrc), "X-RateLimit-Limit present");
  check(/X-RateLimit-Remaining/.test(rateSrc), "X-RateLimit-Remaining present");
  check(/X-RateLimit-Reset/.test(rateSrc), "X-RateLimit-Reset present");
  check(/rate_limited/.test(rateSrc), "rate_limited error code present");
});

await test("rate-limit tiers: general, expensive, admin with expected windows/max", () => {
  check(RATE_LIMIT_TIERS.general.windowMs === 60000 && RATE_LIMIT_TIERS.general.max === 120, "general 120/min");
  check(RATE_LIMIT_TIERS.expensive.windowMs === 60000 && RATE_LIMIT_TIERS.expensive.max === 20, "expensive 20/min");
  check(RATE_LIMIT_TIERS.admin.windowMs === 60000 && RATE_LIMIT_TIERS.admin.max === 10, "admin 10/min");
  const t = fx.rateLimitPolicy.tiers;
  check(t.general && t.expensive && t.admin, "fixture records all tiers");
});

await test("route tiering: /ask expensive, admin matched before expensive, /health is health", () => {
  check(isExpensiveRoute("/ask") === true, "/ask expensive");
  check(isExpensiveRoute("/tax") === true, "/tax expensive");
  check(isAdminRoute("/index-drive") === true, "/index-drive admin");
  check(isAdminRoute("/debug/db-identity") === true, "/debug/db-identity admin");
  // /debug/db-identity is admin, not expensive-only.
  check(getRateLimitTier({ path: "/debug/db-identity" }) === "admin", "db-identity tier admin");
  check(getRateLimitTier({ path: "/ask" }) === "expensive", "/ask tier expensive");
  check(getRateLimitTier({ path: "/routes" }) === "general", "/routes tier general");
  check(isHealthRoute("/health") === true, "/health is health");
});

await test("keying prefers user id then ip; ip fallback works", () => {
  check(getRateLimitKey({ user: { id: "abc" }, ip: "1.2.3.4" }) === "u:abc", "user id preferred");
  check(getRateLimitKey({ ip: "1.2.3.4" }) === "ip:1.2.3.4", "ip fallback");
});

await test("accountRequest allows within limit and blocks over limit within window", () => {
  let entry;
  let last;
  for (let i = 0; i < 20; i += 1) {
    last = accountRequest(entry, 1000, 60000, 20);
    entry = last.entry;
    check(last.allowed === true, `request ${i + 1} allowed`);
  }
  const over = accountRequest(entry, 1000, 60000, 20);
  check(over.allowed === false, "21st blocked");
  check(over.retryAfterMs > 0, "retryAfterMs positive when blocked");
});

await test("createRateLimitMiddleware allows within limit then returns 429 above limit", () => {
  const store = new Map();
  const mw = createRateLimitMiddleware({ store, now: () => 5000 });
  const req = { method: "POST", path: "/ask", ip: "9.9.9.9" };
  for (let i = 0; i < 20; i += 1) {
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    check(nextCalled === true, `ask request ${i + 1} allowed`);
    check(res.getHeader("X-RateLimit-Limit") === "20", "limit header 20");
  }
  const res = mockRes();
  let nextCalled = false;
  mw(req, res, () => { nextCalled = true; });
  check(nextCalled === false, "21st not passed through");
  check(res.statusCode === 429, "21st returns 429");
  check(res.body && res.body.error === "rate_limited", "429 body error code");
  check(typeof res.body.retryAfterSeconds === "number", "retryAfterSeconds is number");
  check(res.getHeader("Retry-After") !== undefined, "Retry-After header set");
});

await test("OPTIONS preflight bypasses limiter and consumes no quota", () => {
  const store = new Map();
  const mw = createRateLimitMiddleware({ store, now: () => 5000 });
  // Hammer with OPTIONS far beyond any tier max.
  for (let i = 0; i < 200; i += 1) {
    const res = mockRes();
    let nextCalled = false;
    mw({ method: "OPTIONS", path: "/ask", ip: "8.8.8.8" }, res, () => { nextCalled = true; });
    check(nextCalled === true, "OPTIONS passes");
    check(res.statusCode !== 429, "OPTIONS never 429");
  }
  // A real request afterwards is still allowed (quota untouched by OPTIONS).
  const res = mockRes();
  let nextCalled = false;
  mw({ method: "POST", path: "/ask", ip: "8.8.8.8" }, res, () => { nextCalled = true; });
  check(nextCalled === true, "real request still allowed after OPTIONS flood");
});

await test("/health bypasses limiter regardless of volume", () => {
  const store = new Map();
  const mw = createRateLimitMiddleware({ store, now: () => 5000 });
  for (let i = 0; i < 500; i += 1) {
    const res = mockRes();
    let nextCalled = false;
    mw({ method: "GET", path: "/health", ip: "7.7.7.7" }, res, () => { nextCalled = true; });
    check(nextCalled === true, "health passes");
  }
});

await test("fixture exclusions document /health and OPTIONS handling", () => {
  const ex = fx.exclusions;
  check(/health/i.test(ex.health), "health exclusion documented");
  check(/OPTIONS/i.test(ex.optionsPreflight), "OPTIONS exclusion documented");
});

await test("fixture limitations include in-memory per-instance and no distributed store", () => {
  const lim = fx.limitations.join(" | ").toLowerCase();
  check(lim.includes("per-instance"), "per-instance limitation");
  check(lim.includes("not a distributed limiter"), "not distributed");
  check(lim.includes("no redis"), "no redis/shared store");
  check(lim.includes("production tuning required"), "production tuning");
  check(lim.includes("post-deploy validation required"), "post-deploy validation");
});

await test("out-of-scope items include tenant isolation, INDEX_SECRET, /routes and /health minimization", () => {
  const oos = fx.outOfScopeItems.join(" | ").toLowerCase();
  check(oos.includes("tenant"), "tenant isolation out of scope");
  check(oos.includes("index_secret"), "INDEX_SECRET out of scope");
  check(oos.includes("/routes minimization"), "/routes minimization out of scope");
  check(oos.includes("/health minimization"), "/health minimization out of scope");
});

await test("prohibited claims include production fully hardened and Phase 9 started", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["phase 8s reopened", "production fully hardened", "distributed rate limiting implemented", "tenant isolation implemented", "logging redaction completed", "index_secret fixed", "phase 9 started", "production deployed"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("no TINA_ENABLE_MEMORY_* introduced and no live IO in helpers/test", () => {
  const combined = serverSrc + headersSrc + rateSrc;
  // This patch introduces no memory flags. server.js may legitimately reference
  // other things, but the two new helpers must not touch memory flags at all.
  check(!/TINA_ENABLE_MEMORY_/.test(headersSrc + rateSrc), "helpers introduce no memory flags");
  // Helpers must be free of live IO / network calls.
  check(!/[^"'`.\w]fetch\s*\(|require\(\s*["']https?["']\s*\)|createClient\s*\(/.test(headersSrc + rateSrc), "no live IO in helpers");
  const selfSrc = readFileSync(resolve("tests/patch-08s-followup-backend-security-headers-rate-limits-1.test.mjs"), "utf8");
  check(!/[^"'`.\w]fetch\s*\(/.test(selfSrc), "test performs no fetch");
  check(!/process\.env\.\w/.test(selfSrc), "test reads no env vars");
  void combined;
});

console.log(`\nPATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
