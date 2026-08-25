// PHASE-10A4B-PRE1-STAGING-CORS-AUTHORIZATION-FOR-PROTECTED-VERCEL-PREVIEW-ORIGIN-1
//
// Pure helper tests for the staging-only, owner-team-anchored authorization of the
// protected tina-ai Vercel Preview origin. Does NOT start the server, bind ports,
// perform HTTP, read process.env.<NAME>, or print env/secret values. Origins used
// are SYNTHETIC pattern-matching values, never the real ephemeral Preview hostname.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  resolveCorsPolicy,
  corsOriginDecision,
  buildCorsOptionsDelegate,
  summarizeCorsPolicy,
  isStagingBackendRuntime
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
function runDelegate(env, origin) {
  const delegate = buildCorsOptionsDelegate(env);
  let captured;
  delegate({ headers: origin === undefined ? {} : { origin } }, (err, options) => {
    if (err) throw err;
    captured = options;
  });
  return captured;
}

// Staging backend runtime (server-injected Render markers, not client-controlled).
const STAGING_BY_SERVICE = { NODE_ENV: "development", RENDER_SERVICE_NAME: "tina-backend-staging" };
const STAGING_BY_EXTURL = { NODE_ENV: "production", RENDER_EXTERNAL_URL: "https://tina-backend-staging.onrender.com" };
// Production runtime with the production frontend origin explicitly allowlisted.
const PROD = {
  NODE_ENV: "production",
  RENDER_SERVICE_NAME: "tina-backend-prod",
  RENDER_EXTERNAL_URL: "https://tina-backend-y11x.onrender.com",
  CORS_ORIGIN: "https://tina-ai.vercel.app"
};
const LOCAL = { NODE_ENV: "development" };
const RENDER_PR = {
  NODE_ENV: "production",
  RENDER_SERVICE_NAME: "tina-backend-pr-9",
  IS_PULL_REQUEST: "true"
};
const RENDER_NON_PR = { ...RENDER_PR, IS_PULL_REQUEST: "false" };

// SYNTHETIC approved Preview origins (pattern-matching; NOT the real private host).
const APPROVED_PREVIEW_ALIAS = "https://tina-ai-git-example-bongcorpuzs-projects.vercel.app";
const APPROVED_PREVIEW_DEPLOY = "https://tina-9wexamplehash-bongcorpuzs-projects.vercel.app";
const PROD_ORIGIN = "https://tina-ai.vercel.app";

await test("isStagingBackendRuntime: true only for staging Render markers", () => {
  check(isStagingBackendRuntime(STAGING_BY_SERVICE) === true, "RENDER_SERVICE_NAME contains 'staging' -> staging");
  check(isStagingBackendRuntime(STAGING_BY_EXTURL) === true, "RENDER_EXTERNAL_URL staging host -> staging");
  check(isStagingBackendRuntime(PROD) === false, "production runtime is not staging");
  check(isStagingBackendRuntime(LOCAL) === false, "local is not staging");
  check(isStagingBackendRuntime({ RENDER_EXTERNAL_URL: "not a url" }) === false, "malformed RENDER_EXTERNAL_URL fails closed");
});

await test("APPROVED protected Preview origin: allowed on staging with credentials and exact reflection", () => {
  for (const env of [STAGING_BY_SERVICE, STAGING_BY_EXTURL]) {
    const d = corsOriginDecision(APPROVED_PREVIEW_ALIAS, resolveCorsPolicy(env));
    check(d.allow === true, "approved preview allowed on staging");
    check(d.credentials === true, "approved preview receives credentials");
    check(d.reflect === true, "approved preview reflected");
    check(d.reason === "STAGING_TINA_PREVIEW_MATCH", "reason is the staging preview branch");
    assert.deepEqual(runDelegate(env, APPROVED_PREVIEW_ALIAS), { origin: APPROVED_PREVIEW_ALIAS, credentials: true }, "delegate reflects exact approved origin with credentials");
    assert.deepEqual(runDelegate(env, APPROVED_PREVIEW_DEPLOY), { origin: APPROVED_PREVIEW_DEPLOY, credentials: true }, "immutable deploy form also authorized");
  }
});

await test("PRODUCTION origin behavior preserved (allowlist still governs; unchanged)", () => {
  assert.deepEqual(runDelegate(PROD, PROD_ORIGIN), { origin: PROD_ORIGIN, credentials: true }, "production origin allowed via allowlist");
  // Unknown origin still denied on production.
  assert.deepEqual(runDelegate(PROD, "https://unknown.example"), { origin: false, credentials: false }, "unknown origin denied on production");
});

await test("PRODUCTION never authorizes the Preview origin (staging gate off on production)", () => {
  const d = corsOriginDecision(APPROVED_PREVIEW_ALIAS, resolveCorsPolicy(PROD));
  check(d.allow === false, "preview origin NOT allowed on production");
  check(d.credentials === false, "no credentials for preview origin on production");
  assert.deepEqual(runDelegate(PROD, APPROVED_PREVIEW_ALIAS), { origin: false, credentials: false }, "production denies the preview origin");
});

await test("UNKNOWN Vercel origin denied on staging", () => {
  assert.deepEqual(runDelegate(STAGING_BY_SERVICE, "https://random-app.vercel.app"), { origin: false, credentials: false }, "arbitrary *.vercel.app denied");
  assert.deepEqual(runDelegate(STAGING_BY_SERVICE, "https://tina-ai.vercel.app"), { origin: false, credentials: false }, "bare project vercel host (no team suffix) denied on staging unless allowlisted");
});

await test("MALFORMED lookalike origins denied on staging", () => {
  const bad = [
    "https://tina-x-bongcorpuzs-projects.vercel.app.evil.com",   // suffix injection
    "https://tina-x-bongcorpuzs-projects.vercel.app.",           // trailing dot
    "https://evil.com/tina-x-bongcorpuzs-projects.vercel.app",   // path, not origin
    "https://tina-x-bongcorpuzs-projects.vercel.app%00.evil.com" // null-byte lookalike
  ];
  for (const o of bad) {
    assert.deepEqual(runDelegate(STAGING_BY_SERVICE, o), { origin: false, credentials: false }, `denied: ${o}`);
  }
});

await test("HTTP (not HTTPS) preview origin denied on staging", () => {
  assert.deepEqual(runDelegate(STAGING_BY_SERVICE, "http://tina-9wexamplehash-bongcorpuzs-projects.vercel.app"), { origin: false, credentials: false }, "http scheme denied");
});

await test("NON-Vercel origin denied on staging (unless already allowlisted)", () => {
  assert.deepEqual(runDelegate(STAGING_BY_SERVICE, "https://tina-x-bongcorpuzs-projects.example.com"), { origin: false, credentials: false }, "non-vercel host denied");
});

await test("WRONG-team Vercel origin denied on staging (not arbitrary team)", () => {
  assert.deepEqual(runDelegate(STAGING_BY_SERVICE, "https://tina-x-someone-else-projects.vercel.app"), { origin: false, credentials: false }, "different team suffix denied");
  assert.deepEqual(runDelegate(STAGING_BY_SERVICE, "https://not-tina-bongcorpuzs-projects.vercel.app"), { origin: false, credentials: false }, "non tina- prefix denied");
});

await test("localhost/development behavior preserved and bounded", () => {
  assert.deepEqual(runDelegate(LOCAL, "http://localhost:5173"), { origin: "http://localhost:5173", credentials: true }, "localhost allowed in local dev");
  assert.deepEqual(runDelegate(STAGING_BY_SERVICE, "http://localhost:5173"), { origin: false, credentials: false }, "localhost NOT auto-allowed on staging");
});

await test("no wildcard-with-credentials and no arbitrary reflection introduced", () => {
  const src = readFileSync(resolve("security/cors-policy.js"), "utf8");
  check(!/console\.(log|error|warn|info)/.test(src), "helper still does not log");
  // The staging preview branch reflects only a regex-validated origin, never '*'.
  check(/TINA_STAGING_PREVIEW_ORIGIN_RE\.test\(origin\)/.test(src), "preview branch is regex-validated");
  check(/\^https:\\\/\\\/tina-/.test(src) || /\^https:\/\//.test(src), "preview regex is https- and prefix-anchored");
  // summary exposes only a boolean, no origin/secret values.
  const summary = summarizeCorsPolicy(STAGING_BY_SERVICE);
  check(summary.stagingPreviewAuthorization === true, "staging summary reports preview-authorization boolean");
  check(summarizeCorsPolicy(PROD).stagingPreviewAuthorization === false, "production summary reports no preview authorization");
  check(!Object.keys(summary).some((k) => /origin|secret|key|url|host/i.test(k)), "summary keys expose no origin/host/secret values");
});

await test("Render PR Preview authorization requires the exact platform marker", () => {
  check(isStagingBackendRuntime(RENDER_PR) === true, "Render PR runtime is Preview-eligible");
  check(isStagingBackendRuntime(RENDER_NON_PR) === false, "non-PR Render runtime remains fail-closed");
  const allowed = corsOriginDecision(APPROVED_PREVIEW_ALIAS, resolveCorsPolicy(RENDER_PR));
  check(allowed.allow === true && allowed.credentials === true && allowed.reflect === true, "approved owner-team Preview origin is credentialed on the Render PR only");
  assert.deepEqual(runDelegate(RENDER_PR, APPROVED_PREVIEW_ALIAS), { origin: APPROVED_PREVIEW_ALIAS, credentials: true }, "Render PR reflects the exact approved origin");
  assert.deepEqual(runDelegate(RENDER_NON_PR, APPROVED_PREVIEW_ALIAS), { origin: false, credentials: false }, "non-PR Render runtime remains fail-closed");
});

console.log(`\nPHASE-10A4B-PRE1 staging CORS preview-origin tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
