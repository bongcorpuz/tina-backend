// PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-STAGING-SMOKE-1
//
// Fixture-only validation. NO live HTTP, NO OpenAI / Supabase / Google Drive, NO
// env vars, NO server import, NO server start, NO port binding. It validates the
// recorded staging-smoke evidence fixture. The live probes were performed
// manually during the patch and are recorded in the fixture and report.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = "evaluation/fixtures/phase-08s-followup-backend-routes-health-minimization-staging-smoke-1.fixture.json";

const VALID_DECISIONS = [
  "BACKEND ROUTES HEALTH MINIMIZATION STAGING SMOKE PASS WITH STRICT RECOMMENDATIONS",
  "BACKEND ROUTES HEALTH MINIMIZATION STAGING SMOKE WARNING WITH STRICT RECOMMENDATIONS",
  "BACKEND ROUTES HEALTH MINIMIZATION STAGING SMOKE FAIL",
  "BACKEND ROUTES HEALTH MINIMIZATION STAGING SMOKE BLOCKED"
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
const probe = (method, path) => fx.probes.find((p) => p.method === method && p.path === path);

await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

await test("patch id and decision are valid", () => {
  check(fx.patch.id === "PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-STAGING-SMOKE-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

await test("non-runtime declaration exists", () => {
  const n = fx.nonRuntimePatch;
  check(n && n.noRuntimeFilesChanged === true, "noRuntimeFilesChanged");
  check(n.noServerJsChange === true && n.noSecurityHelperChange === true, "no server/helper change");
  check(n.noEnvFilesChanged === true && n.noDeploymentPerformed === true, "no env / no deployment");
  check(n.noIndexSecretBehaviorChange === true, "no INDEX_SECRET behavior change");
});

await test("staging target is the staging onrender URL", () => {
  check(fx.stagingTarget === "https://tina-backend-staging.onrender.com", "staging target");
});

await test("deployment freshness valid; confirmed/behavioral for PASS", () => {
  const valid = ["confirmed_commit_0b5b336", "behavioral_match_0b5b336_public_health_minimized", "stale", "inconclusive"];
  check(valid.includes(fx.deploymentFreshness), `invalid freshness: ${fx.deploymentFreshness}`);
  if (isPass()) {
    check(["confirmed_commit_0b5b336", "behavioral_match_0b5b336_public_health_minimized"].includes(fx.deploymentFreshness), "PASS requires confirmed or behavioral match");
  }
});

await test("phase status: 8S closed and not reopened, 08X closed, Phase 9 not started", () => {
  const p = fx.phaseStatus;
  check(p.phase8SClosed === true && p.phase8SReopened === false, "8S closed and not reopened");
  check(p.phase08XClosed === true, "08X closed");
  check(p.phase9NotStarted === true, "Phase 9 not started");
  check(p.memoryInactive === true, "memory inactive");
});

await test("prerequisites include 0b5b336, 99326e9, and ee65dc6", () => {
  const raw = JSON.stringify(fx.prerequisiteStatus);
  check(raw.includes("0b5b336"), "references 0b5b336");
  check(raw.includes("99326e9"), "references 99326e9");
  check(raw.includes("ee65dc6"), "references ee65dc6");
});

await test("probes include health, routes, root, OPTIONS /ask, unauth /ask", () => {
  check(probe("GET", "/health"), "GET /health probe");
  check(probe("GET", "/routes"), "GET /routes probe");
  check(probe("GET", "/"), "GET / probe");
  check(probe("OPTIONS", "/ask"), "OPTIONS /ask probe");
  check(probe("POST", "/ask"), "POST /ask probe");
});

await test("health probe records status 200 and minimal body if PASS", () => {
  const h = fx.healthProbe;
  check(typeof h.bodyMinimal === "boolean", "health bodyMinimal recorded");
  check(Array.isArray(h.forbiddenFieldsObserved), "forbiddenFieldsObserved list present");
  check(Array.isArray(h.forbiddenHealthFields) && h.forbiddenHealthFields.includes("commitSha"), "forbidden health fields list includes commitSha");
  if (isPass()) {
    check(h.statusCode === 200, "PASS health 200");
    check(h.bodyMinimal === true, "PASS health minimal");
    check(h.forbiddenFieldsObserved.length === 0, "PASS health forbidden fields observed empty");
  }
});

await test("routes probe records no inventory if PASS", () => {
  const r = fx.routesProbe;
  check(typeof r.routeInventoryObserved === "boolean", "routes inventory recorded");
  if (isPass()) {
    check(r.routeInventoryObserved === false, "PASS routes no inventory");
    check(r.moduleFilenamesObserved === false, "PASS routes no module filenames");
    check(r.secretHintsObserved === false, "PASS routes no secret hints");
  }
});

await test("root probe records no usefulRoutes if PASS", () => {
  const r = fx.rootProbe;
  check(typeof r.usefulRoutesObserved === "boolean", "root usefulRoutes recorded");
  if (isPass()) {
    check(r.usefulRoutesObserved === false, "PASS root no usefulRoutes");
    check(r.routeInventoryObserved === false, "PASS root no inventory");
  }
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

await test("CSP finding exists and includes default-src 'none'", () => {
  check(fx.cspFinding && fx.cspFinding.present === true, "CSP present");
  check(fx.cspFinding.value.includes("default-src 'none'"), "CSP includes default-src 'none'");
  check(fx.cspFinding.containsUnsafe === false, "CSP has no unsafe directives");
});

await test("OPTIONS finding exists and is not 429 when PASS", () => {
  check(fx.optionsProbe && typeof fx.optionsProbe.blockedBy429 === "boolean", "options finding exists");
  if (isPass()) check(fx.optionsProbe.blockedBy429 === false, "PASS requires OPTIONS not 429-blocked");
});

await test("auth protection finding exists; unauthenticated /ask protected when PASS/WARNING", () => {
  check(fx.authProtectionFinding && typeof fx.authProtectionFinding.unauthenticatedAskProtected === "boolean", "auth finding exists");
  if (isPassOrWarning()) {
    check(fx.authProtectionFinding.unauthenticatedAskProtected === true, "unauthenticated /ask protected");
    check(fx.authProtectionFinding.statusCode === 401, "expected 401");
  }
});

await test("rate-limit finding exists (ask expensive headers; health exempt)", () => {
  const rl = fx.rateLimitFinding;
  check(rl && typeof rl.askExpensiveHeadersPresent === "boolean", "rate-limit finding exists");
  check(rl.healthExemptConfirmed === true, "health exempt confirmed");
});

await test("limitations include commitSha-not-public and INDEX_SECRET not addressed", () => {
  const lim = fx.limitations.join(" | ").toLowerCase();
  check(lim.includes("commitsha"), "commitSha-not-public limitation");
  check(lim.includes("index_secret"), "INDEX_SECRET not addressed");
});

await test("prohibited claims include production fully hardened, INDEX_SECRET fixed, Phase 9 started", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["production fully hardened", "production deployed", "index_secret fixed", "tenant isolation implemented", "logging redaction completed", "diagnostic health implemented", "phase 9 started"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("security/privacy: no tokens/cookies/authorization stored in fixture", () => {
  const raw = readFileSync(resolve(FIXTURE_PATH), "utf8");
  check(!/Bearer\s+[A-Za-z0-9._-]{10,}/.test(raw), "no bearer token stored");
  check(!/authorization:\s*\S+/i.test(raw), "no authorization header value stored");
  check(!/set-cookie|\bcookie:\s*\S+/i.test(raw), "no cookie stored");
  const obs = fx.securityPrivacyObservations.join(" | ").toLowerCase();
  check(obs.includes("no tokens stored"), "records no tokens stored");
});

await test("this test performs no HTTP and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08s-followup-backend-routes-health-minimization-staging-smoke-1.test.mjs"), "utf8");
  check(!/[^"'`.\w]fetch\s*\(|https?\.(request|get)\s*\(/.test(selfSrc), "no HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> reads");
});

console.log(`\nPATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-STAGING-SMOKE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
