// PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-STAGING-SMOKE-1
//
// Fixture-only validation. NO live HTTP, NO OpenAI / Supabase / Google Drive, NO
// env vars, NO server import, NO server start, NO port binding. It validates the
// recorded staging-smoke evidence fixture. The live probes were performed
// manually during the patch and are recorded in the fixture and report.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = "evaluation/fixtures/phase-08s-followup-index-secret-query-removal-staging-smoke-1.fixture.json";
const SELF_PATH = "tests/patch-08s-followup-index-secret-query-removal-staging-smoke-1.test.mjs";

const VALID_DECISIONS = [
  "INDEX SECRET QUERY REMOVAL STAGING SMOKE PASS WITH STRICT RECOMMENDATIONS",
  "INDEX SECRET QUERY REMOVAL STAGING SMOKE WARNING WITH STRICT RECOMMENDATIONS",
  "INDEX SECRET QUERY REMOVAL STAGING SMOKE FAIL",
  "INDEX SECRET QUERY REMOVAL STAGING SMOKE BLOCKED"
];

const REQUIRED_HEADERS = [
  "Content-Security-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Cross-Origin-Opener-Policy",
  "Cross-Origin-Resource-Policy",
  "Cache-Control"
];

const QUERY_ALIASES = ["secret", "indexSecret", "INDEX_SECRET", "token", "key"];

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

let fx;
const isPass = () => fx.decision === VALID_DECISIONS[0];
const isPassOrWarning = () => fx.decision === VALID_DECISIONS[0] || fx.decision === VALID_DECISIONS[1];
const probe = (method, path) => fx.probes.find((p) => p.method === method && p.path === path);

await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

await test("patch id and decision are valid", () => {
  check(fx.patch.id === "PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-STAGING-SMOKE-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

await test("non-runtime declaration exists", () => {
  const n = fx.nonRuntimePatch;
  check(n && n.noRuntimeFilesChanged === true, "noRuntimeFilesChanged");
  check(n.noServerJsChange === true && n.noSecurityHelperChange === true, "no server/helper change");
  check(n.noEnvFilesChanged === true && n.noDeploymentPerformed === true, "no env / no deployment");
  check(n.noProductionAccessOrChange === true, "no production access/change");
  check(n.noSecretStored === true, "no secret stored");
});

await test("staging target is the staging onrender URL", () => {
  check(fx.stagingTarget === "https://tina-backend-staging.onrender.com", "staging target");
});

await test("deployment freshness valid; confirmed/behavioral for PASS", () => {
  const valid = ["confirmed_commit_77f8160", "behavioral_match_77f8160_query_secret_rejected", "stale", "inconclusive"];
  check(valid.includes(fx.deploymentFreshness), `invalid freshness: ${fx.deploymentFreshness}`);
  if (isPass()) {
    check(valid.slice(0, 2).includes(fx.deploymentFreshness), "PASS requires confirmed or behavioral match");
  }
});

await test("phase status: 8S closed and not reopened, 08X closed, Phase 9 not started", () => {
  const p = fx.phaseStatus;
  check(p.phase8SClosed === true && p.phase8SReopened === false, "8S closed and not reopened");
  check(p.phase08XClosed === true, "08X closed");
  check(p.phase9NotStarted === true, "Phase 9 not started");
  check(p.memoryInactive === true, "memory inactive");
});

await test("prerequisites include 77f8160, 7738dbf, 0b5b336, 99326e9, ee65dc6, 23503ba", () => {
  const raw = JSON.stringify(fx.prerequisiteStatus);
  for (const commit of ["77f8160", "7738dbf", "0b5b336", "99326e9", "ee65dc6", "23503ba"]) {
    check(raw.includes(commit), `references ${commit}`);
  }
});

await test("probes include health, routes, root, OPTIONS /ask, unauth /ask, query-secret, aliases, header, bearer, missing/wrong", () => {
  check(probe("GET", "/health"), "GET /health probe");
  check(probe("GET", "/routes"), "GET /routes probe");
  check(probe("GET", "/"), "GET / probe");
  check(probe("OPTIONS", "/ask"), "OPTIONS /ask probe");
  check(probe("POST", "/ask"), "POST /ask probe");
  check(fx.querySecretRejectionProbes, "query secret rejection probes present");
  check(fx.headerAuthProbe, "header auth probe present");
  check(fx.bearerAuthProbe, "bearer auth probe present");
  check(fx.missingWrongSecretProbe, "missing/wrong secret probe present");
  check(fx.staleHintFinding, "stale hint finding present");
});

await test("query aliases include secret, indexSecret, INDEX_SECRET, token, key", () => {
  const tested = fx.querySecretRejectionProbes.aliasesTested;
  for (const alias of QUERY_ALIASES) {
    check(tested.includes(alias), `alias tested: ${alias}`);
  }
});

await test("if PASS, at least three aliases rejected", () => {
  if (isPass()) {
    check(fx.querySecretRejectionProbes.aliasesRejectedCount >= 3, "PASS requires >=3 aliases rejected");
  }
});

await test("if PASS, queryStringSecretAuthorizes is false", () => {
  if (isPass()) {
    check(fx.querySecretFinding.queryStringSecretAuthorizes === false, "PASS requires queryStringSecretAuthorizes false");
  }
});

await test("if PASS, querySecretRejected is true", () => {
  if (isPass()) {
    check(fx.querySecretFinding.querySecretRejected === true, "PASS requires querySecretRejected true");
  }
});

await test("if PASS, secretEchoObserved is false", () => {
  if (isPass()) {
    check(fx.querySecretFinding.secretEchoObserved === false, "PASS requires secretEchoObserved false");
    check(fx.querySecretRejectionProbes.secretEchoObserved === false, "PASS requires no echo in rejection probes");
  }
});

await test("header auth probe records tested/skipped and never stores header value", () => {
  const h = fx.headerAuthProbe;
  check(typeof h.tested === "boolean", "header auth tested recorded");
  check(h.headerValueStored === false, "header value never stored");
  if (!h.tested) check(typeof h.skippedReason === "string" && h.skippedReason.length > 0, "skipped reason recorded");
});

await test("bearer auth probe records tested/skipped and never stores Authorization header", () => {
  const b = fx.bearerAuthProbe;
  check(typeof b.tested === "boolean", "bearer auth tested recorded");
  check(b.authorizationHeaderStored === false, "authorization header never stored");
  if (!b.tested) check(typeof b.skippedReason === "string" && b.skippedReason.length > 0, "skipped reason recorded");
});

await test("missing/wrong secret probe exists and records no operation executed", () => {
  const m = fx.missingWrongSecretProbe;
  check(m, "missing/wrong secret probe present");
  check(m.operationExecuted === false, "no operation executed");
  check(m.secretEchoObserved === false, "no secret echo");
});

await test("stale hint finding exists", () => {
  const s = fx.staleHintFinding;
  check(s && typeof s.hintObserved === "boolean", "stale hint finding present");
  check(typeof s.sourceConfirmedRemoved === "boolean", "source-confirmed field present");
});

await test("header findings include all required headers; present on API responses if PASS", () => {
  for (const h of REQUIRED_HEADERS) {
    check(Object.prototype.hasOwnProperty.call(fx.headerFindings, h), `header finding present: ${h}`);
  }
  if (isPass()) {
    for (const h of REQUIRED_HEADERS) {
      check(fx.headerFindings[h] === "present", `PASS requires ${h} present`);
    }
  }
});

await test("X-Powered-By finding exists and is absent when PASS", () => {
  const valid = ["absent", "present", "inconclusive"];
  check(valid.includes(fx.xPoweredByFinding), "valid xPoweredBy value");
  if (isPass()) check(fx.xPoweredByFinding === "absent", "PASS requires X-Powered-By absent");
});

await test("auth protection finding exists; unauthenticated /ask protected when PASS/WARNING", () => {
  check(fx.authProtectionFinding && typeof fx.authProtectionFinding.unauthenticatedAskProtected === "boolean", "auth finding exists");
  if (isPassOrWarning()) {
    check(fx.authProtectionFinding.unauthenticatedAskProtected === true, "unauthenticated /ask protected");
    check(fx.authProtectionFinding.statusCode === 401, "expected 401");
  }
});

await test("security/privacy observations state no secret/token/cookie/authorization stored", () => {
  const obs = fx.securityPrivacyObservations.join(" | ").toLowerCase();
  check(obs.includes("no secret stored"), "records no secret stored");
  check(obs.includes("no tokens") || obs.includes("no tokens, cookies"), "records no tokens stored");
  check(obs.includes("no production access"), "records no production access");
});

await test("limitations include internal caller migration not verified and no secret rotation", () => {
  const lim = fx.limitations.join(" | ").toLowerCase();
  check(lim.includes("internal caller migration"), "internal caller migration not verified limitation");
  check(lim.includes("no secret rotation"), "no secret rotation limitation");
});

await test("prohibited claims include production fully hardened, all internal callers migrated, secret rotation completed, Phase 9 started", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["production fully hardened", "all internal callers migrated", "secret rotation completed", "phase 9 started"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("no secret/token/cookie/authorization values stored anywhere in fixture", () => {
  const raw = readFileSync(resolve(FIXTURE_PATH), "utf8");
  check(!/Bearer\s+[A-Za-z0-9._-]{10,}/.test(raw), "no bearer token stored");
  check(!/authorization:\s*\S{10,}/i.test(raw), "no authorization header value stored");
  check(!/set-cookie|\bcookie:\s*\S+/i.test(raw), "no cookie stored");
  check(!/SYNTHETIC_REDACTED_VALUE=\S/.test(raw), "no live query value stored");
});

await test("this test performs no HTTP and reads no env vars", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/[^"'`.\w]fetch\s*\(|https?\.(request|get)\s*\(/.test(selfSrc), "no HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> reads");
});

console.log(`\nPATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-STAGING-SMOKE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
