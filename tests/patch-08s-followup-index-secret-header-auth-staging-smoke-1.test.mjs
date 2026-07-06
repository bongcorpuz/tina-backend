// PATCH-08S-FOLLOWUP-INDEX-SECRET-HEADER-AUTH-STAGING-SMOKE-1
//
// Fixture-only validation. NO live HTTP, NO OpenAI / Supabase / Google Drive, NO
// env vars, NO server import, NO server start, NO port binding. It validates the
// recorded staging-smoke evidence fixture. The live probes were performed
// manually during the patch and are recorded in the fixture and report.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = "evaluation/fixtures/phase-08s-followup-index-secret-header-auth-staging-smoke-1.fixture.json";
const SELF_PATH = "tests/patch-08s-followup-index-secret-header-auth-staging-smoke-1.test.mjs";

const VALID_DECISIONS = [
  "INDEX SECRET HEADER AUTH STAGING SMOKE PASS WITH STRICT RECOMMENDATIONS",
  "INDEX SECRET HEADER AUTH STAGING SMOKE WARNING WITH STRICT RECOMMENDATIONS",
  "INDEX SECRET HEADER AUTH STAGING SMOKE FAIL",
  "INDEX SECRET HEADER AUTH STAGING SMOKE BLOCKED"
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
const isWarning = () => fx.decision === VALID_DECISIONS[1];
const isFail = () => fx.decision === VALID_DECISIONS[2];
const isBlocked = () => fx.decision === VALID_DECISIONS[3];
const probe = (method, path) => fx.probes.find((p) => p.method === method && p.path === path);

await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

await test("patch id and decision are valid", () => {
  check(fx.patch.id === "PATCH-08S-FOLLOWUP-INDEX-SECRET-HEADER-AUTH-STAGING-SMOKE-1", "patch id");
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

await test("Gemini review verdict is APPROVE WITH STRICT CHANGES and required changes applied", () => {
  const g = fx.geminiReview;
  check(g && g.verdict === "APPROVE WITH STRICT CHANGES", "gemini verdict");
  check(g.requiredChangesApplied === true, "required changes applied");
  check(typeof g.requiredChangesSummary === "string" && g.requiredChangesSummary.length > 0, "required changes summary present");
});

await test("phase status: 8S closed and not reopened, 08X closed, Phase 9 not started", () => {
  const p = fx.phaseStatus;
  check(p.phase8SClosed === true && p.phase8SReopened === false, "8S closed and not reopened");
  check(p.phase08XClosed === true, "08X closed");
  check(p.phase9NotStarted === true, "Phase 9 not started");
  check(p.memoryInactive === true, "memory inactive");
});

await test("prerequisites include cd4dbdb, 77f8160, 7738dbf, 0b5b336, 99326e9, ee65dc6, 23503ba", () => {
  const raw = JSON.stringify(fx.prerequisiteStatus);
  for (const commit of ["cd4dbdb", "77f8160", "7738dbf", "0b5b336", "99326e9", "ee65dc6", "23503ba"]) {
    check(raw.includes(commit), `references ${commit}`);
  }
});

await test("probes include health, routes, root, query-secret, header, bearer, missing/wrong, ask, options", () => {
  check(probe("GET", "/health"), "GET /health probe");
  check(probe("GET", "/routes"), "GET /routes probe");
  check(probe("GET", "/"), "GET / probe");
  check(probe("POST", "/ask"), "POST /ask probe");
  check(probe("OPTIONS", "/ask"), "OPTIONS /ask probe");
  check(fx.querySecretProbe, "query secret probe present");
  check(fx.headerAuthProbe, "header auth probe present");
  check(fx.bearerAuthProbe, "bearer auth probe present");
  check(fx.missingWrongSecretProbe, "missing/wrong secret probe present");
});

await test("header auth probe records tested true (unless BLOCKED) and never stores header value", () => {
  const h = fx.headerAuthProbe;
  check(typeof h.tested === "boolean", "header auth tested recorded");
  check(h.headerValueStored === false, "header value never stored");
  if (!isBlocked()) check(h.tested === true, "header auth must be tested unless BLOCKED");
});

await test("bearer auth probe records tested true (unless BLOCKED) and never stores Authorization header", () => {
  const b = fx.bearerAuthProbe;
  check(typeof b.tested === "boolean", "bearer auth tested recorded");
  check(b.authorizationHeaderStored === false, "authorization header never stored");
  if (!isBlocked()) check(b.tested === true, "bearer auth must be tested unless BLOCKED");
});

await test("query secret probe uses synthetic value and never stores real secret/URL", () => {
  const q = fx.querySecretProbe;
  check(q.querySecretWasSynthetic === true, "synthetic query value used");
  check(q.realSecretUsedInUrl === false, "real secret not used in URL");
  check(q.queryUrlStored === false, "query URL not stored");
});

await test("if decision PASS: header/bearer authorized true, query rejected true, no protected payload via query, no secret echo", () => {
  if (isPass()) {
    check(fx.headerAuthProbe.authorized === true, "PASS requires headerAuthProbe.authorized true");
    const bearerWaived = fx.bearerAuthProbe.bearerUnimplementedConfirmed === true;
    if (!bearerWaived) {
      check(fx.bearerAuthProbe.authorized === true, "PASS requires bearerAuthProbe.authorized true unless bearer confirmed unimplemented");
    }
    check(fx.querySecretProbe.rejected === true, "PASS requires querySecretProbe.rejected true");
    check(fx.querySecretProbe.protectedPayloadReturned === false, "PASS requires no protected payload via query secret");
    const raw = JSON.stringify(fx);
    check(!/"secretEchoObserved"\s*:\s*true/.test(raw), "PASS requires secretEchoObserved false across probes");
  }
});

await test("if decision WARNING: at least one of header/bearer authorized, the other inconclusive, query rejected", () => {
  if (isWarning()) {
    const headerOk = fx.headerAuthProbe.authorized === true;
    const bearerOk = fx.bearerAuthProbe.authorized === true;
    check(headerOk || bearerOk, "WARNING requires at least one of header/bearer authorized true");
    const otherInconclusive =
      (headerOk && fx.bearerAuthProbe.authorized === "inconclusive") ||
      (bearerOk && fx.headerAuthProbe.authorized === "inconclusive");
    check(otherInconclusive, "WARNING requires the other method inconclusive for a non-server-failure reason");
    check(fx.querySecretProbe.rejected === true, "WARNING requires querySecretProbe.rejected true");
  }
});

await test("if decision FAIL: a failure reason exists", () => {
  if (isFail()) {
    check(typeof fx.failureReason === "string" && fx.failureReason.length > 0, "failure reason recorded");
  }
});

await test("if decision BLOCKED: a blocker reason exists", () => {
  if (isBlocked()) {
    check(typeof fx.blockerReason === "string" && fx.blockerReason.length > 0, "blocker reason recorded");
  }
});

await test("wrong/missing secret probe exists and records no operation executed", () => {
  const m = fx.missingWrongSecretProbe;
  check(m, "missing/wrong secret probe present");
  check(m.operationExecuted === false, "no operation executed");
  check(m.secretEchoObserved === false, "no secret echo");
  check(typeof m.wrongBearerTested === "boolean", "wrongBearerTested recorded");
});

await test("WWW-Authenticate Bearer finding exists", () => {
  check(fx.wrongBearerFinding && "wwwAuthenticateBearerObserved" in fx.wrongBearerFinding, "wrongBearerFinding.wwwAuthenticateBearerObserved present");
  check("wwwAuthenticateBearerObserved" in fx.missingWrongSecretProbe, "missingWrongSecretProbe.wwwAuthenticateBearerObserved present");
});

await test("preserved hardening exists and is true when PASS/WARNING", () => {
  const ph = fx.preservedHardening;
  check(ph, "preservedHardening present");
  if (isPass() || isWarning()) {
    check(ph.healthMinimal === true, "health minimal");
    check(ph.routesNotFound === true, "routes 404");
    check(ph.rootMinimized === true, "root minimized");
    check(ph.securityHeadersPresent === true, "security headers present");
    check(ph.xPoweredByAbsent === true, "X-Powered-By absent");
    check(ph.askProtected === true, "ask protected");
    check(ph.optionsNotBlocked === true, "options not blocked");
  }
});

await test("header findings include all required headers; present when PASS", () => {
  for (const h of REQUIRED_HEADERS) {
    check(Object.prototype.hasOwnProperty.call(fx.headerFindings, h), `header finding present: ${h}`);
  }
  if (isPass()) {
    for (const h of REQUIRED_HEADERS) {
      check(fx.headerFindings[h] === "present", `PASS requires ${h} present`);
    }
  }
});

await test("security/privacy observations say no secret/header/authorization/URL stored", () => {
  const obs = fx.securityPrivacyObservations.join(" | ").toLowerCase();
  check(obs.includes("no secret stored"), "records no secret stored");
  check(obs.includes("no header values stored"), "records no header values stored");
  check(obs.includes("no authorization header value stored"), "records no authorization header value stored");
  check(obs.includes("no url with a real secret"), "records no URL with real secret stored");
  check(obs.includes("no tokens"), "records no tokens stored");
  check(obs.includes("no production access"), "records no production access");
});

await test("prohibited claims include production fully hardened, all internal callers migrated, secret rotation completed, Phase 9 started", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["production fully hardened", "all internal callers migrated", "secret rotation completed", "phase 9 started"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("no secret/token/cookie/authorization values stored anywhere in fixture", () => {
  const raw = readFileSync(resolve(FIXTURE_PATH), "utf8");
  check(!/Bearer\s+[A-Za-z0-9._-]{10,}/.test(raw), "no bearer token value stored");
  check(!/authorization"?\s*:\s*"[^"]{10,}/i.test(raw), "no authorization header value stored");
  check(!/set-cookie|\bcookie:\s*\S+/i.test(raw), "no cookie stored");
  check(!/secret=(?!SYNTHETIC)\S/i.test(raw), "no live query secret value stored");
});

await test("this test performs no HTTP and reads no env vars", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/[^"'`.\w]fetch\s*\(|https?\.(request|get)\s*\(/.test(selfSrc), "no HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> reads");
});

console.log(`\nPATCH-08S-FOLLOWUP-INDEX-SECRET-HEADER-AUTH-STAGING-SMOKE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
