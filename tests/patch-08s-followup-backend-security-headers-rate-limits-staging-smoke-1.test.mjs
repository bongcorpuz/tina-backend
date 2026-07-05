// PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-STAGING-SMOKE-1
//
// Fixture-only validation. This test performs NO live HTTP, calls NO OpenAI /
// Supabase / Google Drive, reads NO env vars, imports NO runtime modules, starts
// NO server, and binds NO ports. It only validates the recorded staging-smoke
// evidence fixture. The live probes themselves were performed manually during
// the patch and are recorded in the fixture and report.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = "evaluation/fixtures/phase-08s-followup-backend-security-headers-rate-limits-staging-smoke-1.fixture.json";

const VALID_DECISIONS = [
  "BACKEND SECURITY HEADERS RATE LIMITS STAGING SMOKE PASS WITH STRICT RECOMMENDATIONS",
  "BACKEND SECURITY HEADERS RATE LIMITS STAGING SMOKE WARNING WITH STRICT RECOMMENDATIONS",
  "BACKEND SECURITY HEADERS RATE LIMITS STAGING SMOKE FAIL",
  "BACKEND SECURITY HEADERS RATE LIMITS STAGING SMOKE BLOCKED"
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

await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

await test("patch id and decision are valid", () => {
  check(fx.patch.id === "PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-STAGING-SMOKE-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

await test("non-runtime declaration exists", () => {
  const n = fx.nonRuntimePatch;
  check(n && n.noRuntimeFilesChanged === true, "noRuntimeFilesChanged");
  check(n.noServerJsChange === true && n.noSecurityHelperChange === true, "no server/helper change");
  check(n.noEnvFilesChanged === true && n.noDeploymentPerformed === true, "no env / no deployment");
  check(n.noMemoryEnablement === true && n.noPhase9Implementation === true, "no memory / no phase 9");
});

await test("staging target is the staging onrender URL", () => {
  check(fx.stagingTarget === "https://tina-backend-staging.onrender.com", "staging target");
});

await test("deployment freshness confirmed_commit_ee65dc6 when PASS/WARNING", () => {
  const valid = ["confirmed_commit_ee65dc6", "stale", "inconclusive"];
  check(valid.includes(fx.deploymentFreshness), `invalid freshness: ${fx.deploymentFreshness}`);
  if (isPassOrWarning()) {
    check(fx.deploymentFreshness === "confirmed_commit_ee65dc6", "PASS/WARNING requires confirmed_commit_ee65dc6");
  }
});

await test("phase status: 8S closed and not reopened, 08X closed, Phase 9 not started", () => {
  const p = fx.phaseStatus;
  check(p.phase8SClosed === true && p.phase8SReopened === false, "8S closed and not reopened");
  check(p.phase08XClosed === true, "08X closed");
  check(p.phase9NotStarted === true, "Phase 9 not started");
  check(p.memoryInactive === true, "memory inactive");
});

await test("probes include health, OPTIONS /ask, unauthenticated /ask, and rate-limit observation", () => {
  const ids = fx.probes.map((p) => p.probeId);
  check(fx.probes.some((p) => p.method === "GET" && p.path === "/health"), "GET /health probe");
  check(fx.probes.some((p) => p.method === "OPTIONS" && p.path === "/ask"), "OPTIONS /ask probe");
  check(fx.probes.some((p) => p.method === "POST" && p.path === "/ask"), "POST /ask probe");
  check(fx.probes.some((p) => p.method === "OBSERVATION" || /rate/i.test(p.probeId)), "rate-limit observation/skip probe");
  check(ids.length >= 4, "at least four probes");
});

await test("header findings include all required headers", () => {
  for (const h of REQUIRED_HEADERS) {
    check(Object.prototype.hasOwnProperty.call(fx.headerFindings, h), `header finding present: ${h}`);
  }
  if (isPass()) {
    for (const h of REQUIRED_HEADERS) {
      check(fx.headerFindings[h] === "present", `PASS requires ${h} present on API responses`);
    }
  }
});

await test("X-Powered-By finding exists and is absent when PASS", () => {
  check(typeof fx.xPoweredByFinding === "string", "xPoweredByFinding exists");
  const valid = ["absent", "present", "inconclusive"];
  check(valid.includes(fx.xPoweredByFinding), "valid xPoweredBy value");
  if (isPass()) check(fx.xPoweredByFinding === "absent", "PASS requires X-Powered-By absent");
});

await test("CSP finding exists and includes default-src 'none'", () => {
  check(fx.cspFinding && fx.cspFinding.present === true, "CSP present");
  check(fx.cspFinding.value.includes("default-src 'none'"), "CSP includes default-src 'none'");
  check(fx.cspFinding.containsUnsafe === false, "CSP has no unsafe directives");
});

await test("Cache-Control finding exists", () => {
  check(fx.cacheControlFinding && fx.cacheControlFinding.present === true, "cache-control present");
  check(fx.cacheControlFinding.value === "no-store", "cache-control no-store");
});

await test("OPTIONS finding exists and is not 429 when PASS", () => {
  check(fx.optionsProbe && typeof fx.optionsProbe.blockedBy429 === "boolean", "options finding exists");
  if (isPass()) check(fx.optionsProbe.blockedBy429 === false, "PASS requires OPTIONS not 429-blocked");
});

await test("auth protection finding exists and shows unauthenticated /ask protected when PASS/WARNING", () => {
  check(fx.authProtectionFinding && typeof fx.authProtectionFinding.unauthenticatedAskProtected === "boolean", "auth finding exists");
  if (isPassOrWarning()) {
    check(fx.authProtectionFinding.unauthenticatedAskProtected === true, "unauthenticated /ask must be protected");
    check(fx.authProtectionFinding.statusCode === 401, "expected 401");
  }
});

await test("rate-limit finding is one of the allowed states", () => {
  const valid = ["observed_429", "headers_present", "warning_not_exercised_to_avoid_load", "missing", "inconclusive"];
  check(valid.includes(fx.rateLimitFinding), `invalid rate-limit finding: ${fx.rateLimitFinding}`);
  if (isPass()) {
    check(["observed_429", "headers_present", "warning_not_exercised_to_avoid_load"].includes(fx.rateLimitFinding), "PASS rate-limit finding must be observed_429, headers_present, or warning_not_exercised_to_avoid_load");
  }
});

await test("limitations include in-memory per-instance and production tuning", () => {
  const lim = fx.limitations.join(" | ").toLowerCase();
  check(lim.includes("per-instance"), "per-instance limitation");
  check(lim.includes("production tuning required"), "production tuning limitation");
  check(lim.includes("429") || lim.includes("threshold"), "rate-limit threshold limitation");
});

await test("prohibited claims include production fully hardened and Phase 9 started", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["production fully hardened", "production deployed", "distributed rate limiting proven", "tenant isolation implemented", "index_secret fixed", "/routes minimized", "/health minimized", "phase 9 started"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("security/privacy: no tokens/cookies/authorization stored in fixture", () => {
  const raw = readFileSync(resolve(FIXTURE_PATH), "utf8");
  // Guard: the evidence file must not carry a bearer token or cookie/auth header.
  check(!/Bearer\s+[A-Za-z0-9._-]{10,}/.test(raw), "no bearer token stored");
  check(!/authorization:\s*\S+/i.test(raw), "no authorization header value stored");
  check(!/set-cookie|\bcookie:\s*\S+/i.test(raw), "no cookie stored");
  const obs = fx.securityPrivacyObservations.join(" | ").toLowerCase();
  check(obs.includes("no tokens stored"), "records no tokens stored");
});

await test("this test performs no HTTP and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08s-followup-backend-security-headers-rate-limits-staging-smoke-1.test.mjs"), "utf8");
  check(!/[^"'`.\w]fetch\s*\(|https?\.(request|get)\s*\(/.test(selfSrc), "no HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> reads");
});

console.log(`\nPATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-STAGING-SMOKE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
