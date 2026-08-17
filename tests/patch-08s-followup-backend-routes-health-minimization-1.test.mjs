// PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1 - focused test.
//
// Static + pure-helper validation only. NO HTTP, NO OpenAI / Supabase / Google
// Drive, NO env vars, NO server import (server.js calls app.listen and reads env
// at load), NO ports. It imports only the pure helpers and inspects server.js as
// text, plus validates the fixture.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildPublicHealth,
  isPublicHealthMinimal,
  PUBLIC_HEALTH_FORBIDDEN_FIELDS
} from "../security/public-health.js";
import {
  buildRouteNotFound,
  isRouteResponseMinimal,
  ROUTE_NOT_FOUND_STATUS
} from "../security/route-disclosure.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-08s-followup-backend-routes-health-minimization-1.fixture.json";
const SERVER_PATH = "server.js";

const VALID_DECISIONS = [
  "BACKEND ROUTES HEALTH MINIMIZATION FOLLOWUP PASS WITH STRICT RECOMMENDATIONS",
  "BACKEND ROUTES HEALTH MINIMIZATION FOLLOWUP WARNING WITH STRICT RECOMMENDATIONS",
  "BACKEND ROUTES HEALTH MINIMIZATION FOLLOWUP BLOCKED"
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
let serverSrc;

await test("fixture exists and parses; server.js readable", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  serverSrc = readFileSync(resolve(SERVER_PATH), "utf8");
});

await test("patch id and decision are valid", () => {
  check(fx.patch.id === "PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

await test("phase status: 8S closed and not reopened, 08X closed, Phase 9 not started", () => {
  const p = fx.phaseStatus;
  check(p.phase8SClosed === true && p.phase8SReopened === false, "8S closed and not reopened");
  check(p.phase08XClosed === true, "08X closed");
  check(p.phase9NotStarted === true, "Phase 9 not started");
  check(p.memoryInactive === true, "memory inactive");
});

await test("previous hardening reference includes ee65dc6 and 99326e9", () => {
  const raw = JSON.stringify(fx.previousHardeningReference);
  check(raw.includes("ee65dc6"), "references ee65dc6");
  check(raw.includes("99326e9"), "references 99326e9");
});

await test("public health policy exists and marks /health liveness only", () => {
  const ph = fx.publicHealthPolicy;
  check(ph && ph.livenessOnly === true, "liveness only");
  check(ph.renderCompatible200 === true, "render compatible 200");
  check(ph.publicResponse && ph.publicResponse.status === "ok", "public response status ok");
});

await test("public health policy prohibits commitSha/model/chunk/source/db details", () => {
  const ph = fx.publicHealthPolicy;
  check(ph.noCommitShaInPublicResponse === true, "no commitSha public");
  check(ph.noModelEmbeddingSourceChunkDbDetails === true, "no model/source/chunk/db details");
  check(ph.noSecretOrConfigDisclosure === true, "no secret/config disclosure");
});

await test("detailed health policy exists (deferred, not publicly re-exposed)", () => {
  const dh = fx.detailedHealthPolicy;
  check(dh && typeof dh.status === "string", "detailed health policy exists");
  check(dh.publiclyReExposed === false, "detailed health not publicly re-exposed");
  check(/defer|not exposed|follow-up|future/i.test(dh.status + " " + (dh.note || "")), "deferred/not exposed");
});

await test("route disclosure policy: public /routes does not disclose inventory", () => {
  const rd = fx.routeDisclosurePolicy;
  check(rd && rd.publicRoutesDisclosesInventory === false, "no public inventory");
  check(rd.publicResponseStatus === 404, "public response 404");
  check(rd.routeRegistrationUnchanged === true, "route registration unchanged");
});

await test("preserved hardening includes headers, x-powered-by, rate limits, OPTIONS bypass, /ask auth", () => {
  const p = fx.preservedHardening;
  check(p.securityHeadersPreserved === true, "security headers preserved");
  check(p.xPoweredBySuppressionPreserved === true, "x-powered-by preserved");
  check(p.rateLimitMiddlewarePreserved === true, "rate limits preserved");
  check(p.optionsBypassPreserved === true, "OPTIONS bypass preserved");
  check(p.askAuthBehaviorUnchanged === true, "/ask auth unchanged");
});

await test("limitations include not deployed and live staging smoke required", () => {
  const lim = fx.limitations.join(" | ").toLowerCase();
  check(lim.includes("not deployed"), "not deployed");
  check(lim.includes("live staging smoke required"), "live staging smoke required");
});

await test("out-of-scope includes INDEX_SECRET, tenant isolation, logging redaction, egress, Phase 9 request-size", () => {
  const oos = fx.outOfScopeItems.join(" | ").toLowerCase();
  check(oos.includes("index_secret"), "INDEX_SECRET out of scope");
  check(oos.includes("tenant"), "tenant isolation out of scope");
  check(oos.includes("logging redaction"), "logging redaction out of scope");
  check(oos.includes("egress"), "egress controls out of scope");
  check(oos.includes("request-size"), "Phase 9 request-size out of scope");
});

await test("prohibited claims include production fully hardened and Phase 9 started", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["phase 8s reopened", "production fully hardened", "index_secret fixed", "tenant isolation implemented", "logging redaction completed", "production deployed", "phase 9 started"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("helper: buildPublicHealth is minimal and excludes all forbidden fields", () => {
  const ph = buildPublicHealth();
  check(JSON.stringify(ph) === '{"status":"ok"}', "exact public health payload");
  check(isPublicHealthMinimal(ph) === true, "isPublicHealthMinimal true");
  for (const f of PUBLIC_HEALTH_FORBIDDEN_FIELDS) {
    check(!Object.prototype.hasOwnProperty.call(ph, f), `public health excludes ${f}`);
  }
  // A payload carrying commitSha is NOT minimal.
  check(isPublicHealthMinimal({ status: "ok", commitSha: "abc" }) === false, "commitSha makes it non-minimal");
});

await test("helper: buildRouteNotFound is minimal and discloses no inventory", () => {
  const body = buildRouteNotFound();
  check(body.error === "not_found", "error not_found");
  check(ROUTE_NOT_FOUND_STATUS === 404, "status 404");
  check(isRouteResponseMinimal(body) === true, "minimal route response");
  check(isRouteResponseMinimal({ routes: ["GET /ask"] }) === false, "inventory response not minimal");
});

await test("source: server.js public /health returns the exact minimal payload", () => {
  check(/healthHandler/.test(serverSrc), "health handler used");
  check(/app\.get\(\s*["']\/health["']\s*,\s*healthHandler\s*\)/.test(serverSrc), "public /health route registered");
  // The old disclosure fields must be gone from the /health handler region.
  const healthRegion = serverSrc.slice(serverSrc.indexOf('app.get("/health"'), serverSrc.indexOf('app.get("/health"') + 300);
  check(!/adaptiveStack|routeModes|openaiModel|indexSecretEnabled|commitSha/.test(healthRegion), "no disclosure fields in /health handler");
  check(/return res\.status\(200\)\.json\(buildPublicHealth\(\)\)/.test(readFileSync(resolve("security/public-health.js"), "utf8")), "public /health returns the minimal health payload");
  // No separate /health/details route is introduced (avoids route-inventory drift).
  check(!/app\.get\(\s*["']\/health\/details["']/.test(serverSrc), "no /health/details route added");
});

await test("source: server.js /routes returns minimal 404 and no inventory", () => {
  check(/app\.get\(\s*["']\/routes["'][\s\S]{0,200}buildRouteNotFound/.test(serverSrc), "/routes returns buildRouteNotFound");
  // The old public inventory arrays must be gone from the /routes handler / root.
  check(!/usefulRoutes\s*:/.test(serverSrc), "root no longer enumerates usefulRoutes");
  check(!/adaptiveModules\s*:\s*\[/.test(serverSrc), "no public adaptiveModules inventory");
  check(!/"GET \/index-drive\?secret=YOUR_SECRET"/.test(serverSrc), "no public admin route+secret hint");
});

await test("source: security headers and rate-limit helpers remain wired in server.js", () => {
  check(/app\.use\(\s*createSecurityHeadersMiddleware/.test(serverSrc), "security headers still wired");
  check(/app\.use\(\s*createRateLimitMiddleware/.test(serverSrc), "rate limiter still wired");
  check(/app\.disable\(\s*["']x-powered-by["']\s*\)/.test(serverSrc), "x-powered-by still disabled");
});

await test("source: no TINA_ENABLE_MEMORY_* introduced; new helpers do no live IO", () => {
  const phSrc = readFileSync(resolve("security/public-health.js"), "utf8");
  const rdSrc = readFileSync(resolve("security/route-disclosure.js"), "utf8");
  check(!/TINA_ENABLE_MEMORY_/.test(phSrc + rdSrc), "helpers introduce no memory flags");
  check(!/[^"'`.\w]fetch\s*\(|createClient\s*\(|process\.env\.\w/.test(phSrc + rdSrc), "helpers do no live IO / env reads");
});

await test("this test performs no HTTP and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08s-followup-backend-routes-health-minimization-1.test.mjs"), "utf8");
  check(!/[^"'`.\w]fetch\s*\(|https?\.(request|get)\s*\(/.test(selfSrc), "no HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> reads");
});

console.log(`\nPATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
