// PATCH-08S-CORS-STAGING-REMEDIATION-1 - CORS fail-closed remediation test.
// Pure helper tests. Does NOT start the server, bind ports, perform HTTP, call
// Render/OpenAI/Supabase/Drive/Langfuse, require real env vars, or print env
// values. It imports only the pure security/cors-policy.js helper.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  parseAllowedOrigins,
  isLocalDevelopmentEnvironment,
  resolveCorsPolicy,
  corsOriginDecision,
  buildCorsOptionsDelegate,
  summarizeCorsPolicy
} from "../security/cors-policy.js";

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

// Helper: run the per-request delegate synchronously and return the cors options.
function runDelegate(env, origin) {
  const delegate = buildCorsOptionsDelegate(env);
  let captured;
  delegate({ headers: origin === undefined ? {} : { origin } }, (err, options) => {
    if (err) throw err;
    captured = options;
  });
  return captured;
}

const PROD = { NODE_ENV: "production" };
const STAGING_RENDER = { NODE_ENV: "development", RENDER_SERVICE_NAME: "tina-backend-staging" };
const LOCAL = { NODE_ENV: "development" };
const UNKNOWN = "https://phase8s-smoke.invalid";

await test("parseAllowedOrigins parses comma-separated origins, trims whitespace, ignores empties", () => {
  const r = parseAllowedOrigins(" https://a.com , https://b.com ,, https://c.com ");
  assert.deepEqual(r.origins, ["https://a.com", "https://b.com", "https://c.com"], "origins parsed/trimmed");
  check(r.wildcard === false, "no wildcard");
  const empty = parseAllowedOrigins("");
  assert.deepEqual(empty, { wildcard: false, origins: [] }, "empty -> no origins");
  const missing = parseAllowedOrigins(undefined);
  assert.deepEqual(missing, { wildcard: false, origins: [] }, "undefined -> no origins");
  const star = parseAllowedOrigins("*");
  check(star.wildcard === true && star.origins.length === 0, "'*' is a wildcard request, not an origin");
  const mixed = parseAllowedOrigins("https://a.com, *");
  check(mixed.wildcard === true && mixed.origins.includes("https://a.com") && !mixed.origins.includes("*"), "'*' filtered out of explicit origins");
});

await test("environment classification: Render markers force non-local; development is local", () => {
  check(isLocalDevelopmentEnvironment(LOCAL) === true, "NODE_ENV=development is local");
  check(isLocalDevelopmentEnvironment({}) === true, "empty env defaults local (bare checkout)");
  check(isLocalDevelopmentEnvironment(PROD) === false, "production is not local");
  check(isLocalDevelopmentEnvironment({ NODE_ENV: "staging" }) === false, "staging is not local");
  check(isLocalDevelopmentEnvironment(STAGING_RENDER) === false, "Render marker forces non-local even if NODE_ENV=development");
  check(isLocalDevelopmentEnvironment({ RENDER: "true" }) === false, "RENDER=true forces non-local");
});

await test("missing allowlist in production/staging fails closed for unknown origin", () => {
  const decision = corsOriginDecision(UNKNOWN, resolveCorsPolicy(PROD));
  check(decision.allow === false, "unknown origin denied in production");
  check(decision.credentials === false, "no credentials for denied origin");
  check(decision.reflect === false, "denied origin not reflected");
  const rendered = runDelegate(PROD, UNKNOWN);
  assert.deepEqual(rendered, { origin: false, credentials: false }, "delegate returns origin:false credentials:false");
});

await test("'*' allowlist in production/staging fails closed when credentials would apply", () => {
  const decision = corsOriginDecision(UNKNOWN, resolveCorsPolicy({ NODE_ENV: "production", CORS_ORIGIN: "*" }));
  check(decision.allow === false, "wildcard config denied in production");
  check(decision.credentials === false, "wildcard config grants no credentials in production");
  const rendered = runDelegate({ NODE_ENV: "production", CORS_ORIGIN: "*" }, UNKNOWN);
  assert.deepEqual(rendered, { origin: false, credentials: false }, "wildcard prod -> fail closed");
});

await test("staging (Render) fails closed with no allowlist — reproduces and fixes the live failure", () => {
  const rendered = runDelegate(STAGING_RENDER, UNKNOWN);
  assert.deepEqual(rendered, { origin: false, credentials: false }, "staging reflects nothing for unknown origin");
  check(rendered.origin !== UNKNOWN, "unknown origin is NOT reflected");
  check(rendered.credentials !== true, "unknown origin does NOT receive credentials");
});

await test("explicit allowed origin in staging/production is allowed with credentials and exact reflection", () => {
  const env = { NODE_ENV: "production", CORS_ORIGIN: "https://app.tina.example, https://staging.tina.example" };
  const d1 = corsOriginDecision("https://app.tina.example", resolveCorsPolicy(env));
  check(d1.allow === true && d1.credentials === true && d1.reflect === true, "allowlisted origin allowed with credentials");
  const rendered = runDelegate(env, "https://app.tina.example");
  assert.deepEqual(rendered, { origin: "https://app.tina.example", credentials: true }, "exact origin reflected with credentials");
  // A second allowlisted origin also works; an unlisted one is still denied.
  assert.deepEqual(runDelegate(env, "https://staging.tina.example"), { origin: "https://staging.tina.example", credentials: true }, "second allowlisted origin allowed");
  assert.deepEqual(runDelegate(env, UNKNOWN), { origin: false, credentials: false }, "unlisted origin denied even with allowlist present");
});

await test("no-Origin requests are allowed without a credentialed browser grant", () => {
  const d = corsOriginDecision(undefined, resolveCorsPolicy(PROD));
  check(d.allow === true, "no-origin allowed (server-to-server)");
  check(d.credentials === false, "no-origin gets no credentials grant");
  check(d.reflect === false, "no-origin nothing to reflect");
  const rendered = runDelegate(PROD, undefined);
  check(rendered.origin === true && rendered.credentials === false, "delegate allows no-origin without credentials");
});

await test("local development is explicitly bounded and does not apply to staging/production", () => {
  // Local loopback allowed with credentials.
  const loop = runDelegate(LOCAL, "http://localhost:5173");
  assert.deepEqual(loop, { origin: "http://localhost:5173", credentials: true }, "localhost allowed in local dev");
  check(corsOriginDecision("http://127.0.0.1:3000", resolveCorsPolicy(LOCAL)).allow === true, "127.0.0.1 allowed in local dev");
  // Local wildcard (default) may reflect in local dev only.
  check(corsOriginDecision(UNKNOWN, resolveCorsPolicy(LOCAL)).allow === true, "local dev default wildcard permissive");
  // The SAME wildcard default is NOT permissive once on Render/staging.
  check(corsOriginDecision(UNKNOWN, resolveCorsPolicy(STAGING_RENDER)).allow === false, "staging is not permissive");
  check(corsOriginDecision("http://localhost:5173", resolveCorsPolicy(PROD)).allow === false, "localhost not auto-allowed in production");
});

await test("summarizeCorsPolicy exposes no env values and reports fail-closed status", () => {
  const summary = summarizeCorsPolicy(STAGING_RENDER);
  check(summary.failClosed === true, "staging with no allowlist is fail-closed");
  check(summary.environmentClass === "production_staging", "environment classified");
  const keys = Object.keys(summary);
  check(!keys.some((k) => /origin|secret|key|url/i.test(k)), "summary keys expose no origin/secret/url values");
  check(typeof summary.allowlistCount === "number", "allowlist reported as count only");
});

await test("cors-policy source contains no env value printing and no unsafe reflection pattern", () => {
  const src = readFileSync(resolve("security/cors-policy.js"), "utf8");
  check(!/console\.(log|error|warn|info)/.test(src), "helper does not log");
  // Must not contain the unsafe live-failure pattern: unconditional allow-all.
  check(!/allowedOrigins\s*===\s*"\*"\s*\)\s*return\s+callback\(null,\s*true\)/.test(src), "no wildcard->callback(null,true) pattern");
});

await test("server.js wires the fail-closed delegate and drops the unsafe inline pattern", () => {
  const src = readFileSync(resolve("server.js"), "utf8");
  check(src.includes("buildCorsOptionsDelegate"), "server.js uses buildCorsOptionsDelegate");
  check(src.includes('from "./security/cors-policy.js"'), "server.js imports the CORS policy helper");
  check(!/allowedOrigins\s*===\s*"\*"\s*\)\s*return\s+callback\(null,\s*true\)/.test(src), "server.js no longer reflects arbitrary origins");
  check(!/function\s+buildAllowedOrigins\s*\(/.test(src), "inline buildAllowedOrigins removed");
});

await test("remediation is scoped to CORS only (no memory/Phase 9/10/11 coupling in the helper)", () => {
  const src = readFileSync(resolve("security/cors-policy.js"), "utf8");
  for (const token of ["TINA_ENABLE_MEMORY", "supabase", "openai", "langfuse", "rateLimit", "tenant"]) {
    check(!src.toLowerCase().includes(token.toLowerCase()), `helper must not reference ${token}`);
  }
  check(!/process\.env\.\w/.test(readFileSync(resolve("tests/patch-08s-cors-staging-remediation-1.test.mjs"), "utf8")), "test does not read process.env.<NAME>");
});

console.log(`\nPATCH-08S-CORS-STAGING-REMEDIATION-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
