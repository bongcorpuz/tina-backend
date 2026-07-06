// PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-1 - focused test.
//
// Static + pure-helper validation only. This test performs NO HTTP, calls NO
// OpenAI / Supabase / Google Drive, reads NO real env vars, starts NO server,
// and binds NO ports. It never imports server.js as an executable module
// (server.js calls app.listen and reads env at load time); it only inspects
// server.js as text. It imports the pure, side-effect-free helper under
// security/index-secret-auth.js and exercises it with mock req/res objects
// and synthetic secret values.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  QUERY_SECRET_ALIASES,
  PREFERRED_HEADER,
  hasQueryStringSecret,
  getIndexSecretFromHeaders,
  timingSafeEqualStrings,
  validateIndexSecretRequest,
  sanitizeIndexAuthFailure,
  requireIndexSecret
} from "../security/index-secret-auth.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-08s-followup-index-secret-query-removal-1.fixture.json";
const SERVER_PATH = "server.js";
const HELPER_PATH = "security/index-secret-auth.js";

const VALID_DECISIONS = [
  "INDEX SECRET QUERY REMOVAL FOLLOWUP PASS WITH STRICT RECOMMENDATIONS",
  "INDEX SECRET QUERY REMOVAL FOLLOWUP WARNING WITH STRICT RECOMMENDATIONS",
  "INDEX SECRET QUERY REMOVAL FOLLOWUP BLOCKED"
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

function mockReq({ query = {}, headers = {} } = {}) {
  return { query, headers };
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; }
  };
}

let fx;
let serverSrc;
let helperSrc;

await test("fixture exists and parses; source files readable", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  serverSrc = readFileSync(resolve(SERVER_PATH), "utf8");
  helperSrc = readFileSync(resolve(HELPER_PATH), "utf8");
});

await test("patch id and decision are valid", () => {
  check(fx.patch.id === "PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

await test("phase status: 8S closed and not reopened, 08X closed, Phase 9 not started, memory inactive", () => {
  const p = fx.phaseStatus;
  check(p.phase8SClosed === true && p.phase8SReopened === false, "8S closed and not reopened");
  check(p.phase08XClosed === true, "08X closed");
  check(p.phase9NotStarted === true, "Phase 9 not started");
  check(p.memoryInactive === true, "memory inactive");
});

await test("previous hardening references include all prior commits", () => {
  const refs = fx.previousHardeningReferences;
  const commits = [
    refs.frontendSecurityHeaders.commit,
    refs.backendSecurityHeadersRateLimits.commit,
    refs.backendSecurityHeadersRateLimitsStagingSmoke.commit,
    refs.backendRoutesHealthMinimization.commit,
    refs.backendRoutesHealthMinimizationStagingSmoke.commit
  ];
  for (const needle of ["23503ba", "ee65dc6", "99326e9", "0b5b336", "7738dbf"]) {
    check(commits.includes(needle), `previous hardening references must include ${needle}`);
  }
});

await test("index secret policy states no env files changed and no public disclosure", () => {
  const p = fx.indexSecretPolicy;
  check(p.serverSideOnly === true, "server-side only");
  check(p.envFilesChanged === false, "no env files changed");
  check(p.publiclyDisclosed === false, "no public disclosure");
  check(p.secretLogged === false, "no secret logged");
  check(p.fullUrlLoggingAdded === false, "no full URL logging added");
});

await test("query secret policy: rejected, aliases recorded, no echo", () => {
  const p = fx.querySecretPolicy;
  check(p.queryStringSecretRejected === true, "query secret rejected");
  check(p.correctQuerySecretDoesNotAuthorize === true, "correct query secret does not authorize");
  check(p.rejectionEchoesSubmittedValue === false, "rejection does not echo");
  for (const alias of ["secret", "indexSecret", "INDEX_SECRET", "token", "key"]) {
    check(p.recognizedAliases.includes(alias), `alias ${alias} recorded`);
  }
});

await test("header auth policy supports X-TINA-INDEX-SECRET; bearer recorded if implemented", () => {
  check(fx.headerAuthPolicy.preferredHeader === "X-TINA-INDEX-SECRET", "preferred header recorded");
  check(fx.headerAuthPolicy.supported === true, "header auth supported");
  check(fx.headerAuthPolicy.missingHeaderRejected === true, "missing header rejected");
  check(fx.headerAuthPolicy.wrongHeaderRejected === true, "wrong header rejected");
  check(fx.headerAuthPolicy.correctHeaderAuthorizes === true, "correct header authorizes");
  if (fx.bearerAuthPolicy && fx.bearerAuthPolicy.supported) {
    check(typeof fx.bearerAuthPolicy.form === "string" && /Bearer/.test(fx.bearerAuthPolicy.form), "bearer form recorded");
  }
});

await test("protected routes list exists and is non-empty", () => {
  check(Array.isArray(fx.protectedRoutes) && fx.protectedRoutes.length > 0, "protected routes recorded");
});

await test("rejection behavior is safe and does not echo secret", () => {
  const r = fx.rejectionBehavior;
  check(r.statusCode === 401, "401 status");
  check(r.echoesSecret === false, "no secret echo");
  check(r.operationPerformed === false, "no operation performed");
  check(r.body && r.body.error === "unauthorized", "safe error code");
});

await test("preserved hardening includes /health minimal and /routes not_found", () => {
  const p = fx.preservedHardening;
  check(p.healthMinimal === true, "/health minimal preserved");
  check(p.routesNotFound === true, "/routes not_found preserved");
  check(p.securityHeadersPreserved === true, "security headers preserved");
  check(p.rateLimitsPreserved === true, "rate limits preserved");
  check(p.askAuthUnchanged === true, "/ask auth unchanged");
});

await test("limitations include live staging smoke and internal caller migration", () => {
  const lim = fx.limitations.join(" | ").toLowerCase();
  check(lim.includes("staging smoke"), "staging smoke limitation");
  check(lim.includes("migrate"), "internal caller migration limitation");
});

await test("prohibited claims include production fully hardened and Phase 9 started", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["production fully hardened", "phase 9 started", "production deployed", "tenant isolation implemented", "logging redaction completed"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("source inspection: no authorization accept path from req.query.secret/indexSecret/token/key", () => {
  // Strip line comments before scanning so a historical/audit-trail comment
  // mentioning the removed req.query.secret pattern does not false-positive
  // as a live accept path. Only non-comment code lines are checked.
  const codeOnly = serverSrc
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
  check(!/req\.query\.secret/.test(codeOnly), "server.js must not read req.query.secret in code");
  check(!/req\.query\.indexSecret/.test(codeOnly), "server.js must not read req.query.indexSecret in code");
  check(!/req\.query\.token/.test(codeOnly), "server.js must not read req.query.token in code");
  check(!/req\.query\.key\b/.test(codeOnly), "server.js must not read req.query.key in code");
});

await test("source inspection: query secret used only for rejection detection", () => {
  check(/hasQueryStringSecret/.test(serverSrc), "server.js references hasQueryStringSecret");
  check(/hasQueryStringSecret/.test(helperSrc), "helper defines hasQueryStringSecret");
});

await test("source inspection: X-TINA-INDEX-SECRET (or equivalent) header used", () => {
  check(/x-tina-index-secret/i.test(helperSrc), "helper references X-TINA-INDEX-SECRET header");
});

await test("source inspection: no TINA_ENABLE_MEMORY_* introduced", () => {
  check(!/TINA_ENABLE_MEMORY_/.test(helperSrc), "helper introduces no memory flags");
});

await test("source inspection: /health minimal helper still referenced", () => {
  check(/buildPublicHealth/.test(serverSrc), "server.js still references buildPublicHealth");
});

await test("source inspection: /routes minimization still referenced", () => {
  check(/buildRouteNotFound/.test(serverSrc), "server.js still references buildRouteNotFound");
});

await test("source inspection: security headers / rate-limit helpers still referenced", () => {
  check(/createSecurityHeadersMiddleware/.test(serverSrc), "security headers middleware still referenced");
  check(/createRateLimitMiddleware/.test(serverSrc), "rate limiter middleware still referenced");
});

await test("QUERY_SECRET_ALIASES and PREFERRED_HEADER exported with expected values", () => {
  check(PREFERRED_HEADER === "x-tina-index-secret", "preferred header constant");
  for (const alias of ["secret", "indexSecret", "INDEX_SECRET", "token", "key"]) {
    check(QUERY_SECRET_ALIASES.includes(alias), `QUERY_SECRET_ALIASES includes ${alias}`);
  }
});

await test("hasQueryStringSecret detects any recognized alias", () => {
  check(hasQueryStringSecret(mockReq({ query: { secret: "s3cr3t-value" } })) === true, "secret alias detected");
  check(hasQueryStringSecret(mockReq({ query: { indexSecret: "x" } })) === true, "indexSecret alias detected");
  check(hasQueryStringSecret(mockReq({ query: { INDEX_SECRET: "x" } })) === true, "INDEX_SECRET alias detected");
  check(hasQueryStringSecret(mockReq({ query: { token: "x" } })) === true, "token alias detected");
  check(hasQueryStringSecret(mockReq({ query: { key: "x" } })) === true, "key alias detected");
  check(hasQueryStringSecret(mockReq({ query: {} })) === false, "no alias present -> false");
  check(hasQueryStringSecret(mockReq({ query: { other: "x" } })) === false, "unrelated query param -> false");
});

await test("getIndexSecretFromHeaders reads X-TINA-INDEX-SECRET, then Authorization: Bearer", () => {
  check(getIndexSecretFromHeaders(mockReq({ headers: { "x-tina-index-secret": "abc123" } })) === "abc123", "preferred header read");
  check(getIndexSecretFromHeaders(mockReq({ headers: { authorization: "Bearer abc123" } })) === "abc123", "bearer header read");
  check(getIndexSecretFromHeaders(mockReq({ headers: {} })) === null, "missing headers -> null");
  check(getIndexSecretFromHeaders(mockReq({ headers: { authorization: "Basic abc123" } })) === null, "non-bearer authorization -> null");
});

await test("timingSafeEqualStrings handles equal, mismatched, and empty inputs safely", () => {
  check(timingSafeEqualStrings("synthetic-secret-1", "synthetic-secret-1") === true, "equal strings match");
  check(timingSafeEqualStrings("synthetic-secret-1", "synthetic-secret-2") === false, "mismatched strings");
  check(timingSafeEqualStrings("short", "much-longer-value") === false, "different lengths");
  check(timingSafeEqualStrings("", "") === false, "empty/empty safe false");
  check(timingSafeEqualStrings(null, "x") === false, "null input safe false");
  check(timingSafeEqualStrings(undefined, undefined) === false, "undefined input safe false");
});

await test("validateIndexSecretRequest: correct X-TINA-INDEX-SECRET authorizes", () => {
  const req = mockReq({ headers: { "x-tina-index-secret": "synthetic-secret-value" } });
  const result = validateIndexSecretRequest(req, { configuredSecret: "synthetic-secret-value" });
  check(result.authorized === true, "header secret authorizes");
});

await test("validateIndexSecretRequest: correct Authorization Bearer authorizes", () => {
  const req = mockReq({ headers: { authorization: "Bearer synthetic-secret-value" } });
  const result = validateIndexSecretRequest(req, { configuredSecret: "synthetic-secret-value" });
  check(result.authorized === true, "bearer secret authorizes");
});

await test("validateIndexSecretRequest: correct query-string secret is rejected", () => {
  const req = mockReq({ query: { secret: "synthetic-secret-value" }, headers: {} });
  const result = validateIndexSecretRequest(req, { configuredSecret: "synthetic-secret-value" });
  check(result.authorized === false, "query secret never authorizes, even if correct");
  check(result.reason === "query_string_secret_rejected", "reason identifies query rejection");
});

await test("validateIndexSecretRequest: missing secret rejected", () => {
  const req = mockReq({ headers: {} });
  const result = validateIndexSecretRequest(req, { configuredSecret: "synthetic-secret-value" });
  check(result.authorized === false, "missing header rejected");
});

await test("validateIndexSecretRequest: wrong header rejected", () => {
  const req = mockReq({ headers: { "x-tina-index-secret": "wrong-value" } });
  const result = validateIndexSecretRequest(req, { configuredSecret: "synthetic-secret-value" });
  check(result.authorized === false, "wrong header rejected");
});

await test("validateIndexSecretRequest: alias query params rejected regardless of header", () => {
  for (const alias of ["secret", "indexSecret", "INDEX_SECRET", "token", "key"]) {
    const req = mockReq({
      query: { [alias]: "synthetic-secret-value" },
      headers: { "x-tina-index-secret": "synthetic-secret-value" }
    });
    const result = validateIndexSecretRequest(req, { configuredSecret: "synthetic-secret-value" });
    check(result.authorized === false, `alias ${alias} present forces rejection even with correct header`);
  }
});

await test("sanitizeIndexAuthFailure never echoes a submitted secret", () => {
  const body = sanitizeIndexAuthFailure("query_string_secret_rejected");
  const serialized = JSON.stringify(body);
  check(!/synthetic-secret-value/.test(serialized), "no secret echoed");
  check(body.error === "unauthorized", "safe error code");
  check(/header/i.test(body.message), "message references header requirement");
});

await test("requireIndexSecret middleware: authorizes on correct header, rejects otherwise via mock res", () => {
  const okReq = mockReq({ headers: { "x-tina-index-secret": "synthetic-secret-value" } });
  const okRes = mockRes();
  let nextCalled = false;
  requireIndexSecret(okReq, okRes, () => { nextCalled = true; }, { configuredSecret: "synthetic-secret-value" });
  check(nextCalled === true, "next called on correct header");

  const badReq = mockReq({ query: { secret: "synthetic-secret-value" } });
  const badRes = mockRes();
  let badNextCalled = false;
  requireIndexSecret(badReq, badRes, () => { badNextCalled = true; }, { configuredSecret: "synthetic-secret-value" });
  check(badNextCalled === false, "next not called on query-string secret");
  check(badRes.statusCode === 401, "401 on rejection");
  check(badRes.body && badRes.body.error === "unauthorized", "safe rejection body");
  check(!JSON.stringify(badRes.body).includes("synthetic-secret-value"), "rejection body does not echo secret");
});

await test("test file performs no HTTP, no live env reads, no server start", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08s-followup-index-secret-query-removal-1.test.mjs"), "utf8");
  check(!/[^"'`.\w]fetch\s*\(/.test(selfSrc), "test performs no fetch");
  check(!/\bapp\.listen\s*\(/.test(selfSrc), "test does not start server");
  check(!/from\s+["']\.\.\/server\.js["']/.test(selfSrc), "test does not import server.js as executable module");
});

console.log(`\nPATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
