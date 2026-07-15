// PHASE-10A4C-TRUST-CALIBRATION-CONFLICT-STATE-ACCESSIBILITY-KEYBOARD-AND-DETERMINISTIC-FIXTURE-REMEDIATION-1
//
// Tests: Case C trust-calibration detector/downgrade + qualifier; Case F
// deterministic conflict fixture reaching VERIFIED_CONFLICT; the full A-G
// staging fixture registry produces exactly its intended canonical state;
// the fixture registry fails closed on production and on unknown IDs; the
// ask-handler.js fixture route is wired after authentication with no
// bypass; existing (unrelated) trust states are unchanged by the Case C
// detector.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildTrustContract,
  buildResponseTrust,
  answerDisclaimsSpecificAuthority
} from "../services/trust-contract.js";
import { STAGING_TRUST_FIXTURES, resolveStagingFixture } from "../services/staging-trust-fixtures.js";

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

const STAGING_ENV = { NODE_ENV: "development", RENDER_SERVICE_NAME: "tina-backend-staging" };
const PROD_ENV = { NODE_ENV: "production", RENDER_SERVICE_NAME: "tina-backend-prod", RENDER_EXTERNAL_URL: "https://tina-backend-y11x.onrender.com" };
const LOCAL_ENV = { NODE_ENV: "development" };

await test("answerDisclaimsSpecificAuthority: detects the generalizable disclaimer pattern, not one hardcoded query", () => {
  check(answerDisclaimsSpecificAuthority("There is no specific BIR issuance that addresses drone delivery.") === true, "no specific ... issuance");
  check(answerDisclaimsSpecificAuthority("There is no specific ruling on this exact scenario.") === true, "no specific ... ruling");
  check(answerDisclaimsSpecificAuthority("No specific regulation covers cryptocurrency mining income directly.") === true, "no specific ... regulation, different subject matter");
  check(answerDisclaimsSpecificAuthority("Such a circular does not exist in the indexed corpus.") === true, "circular ... does not exist");
  check(answerDisclaimsSpecificAuthority("The standard corporate income tax rate is 25%.") === false, "ordinary answer, no disclaimer");
  check(answerDisclaimsSpecificAuthority("") === false, "empty string");
  check(answerDisclaimsSpecificAuthority(undefined) === false, "undefined");
  check(answerDisclaimsSpecificAuthority(null) === false, "null");
});

await test("Case C: AUTHORITY_FOUND + displayed sources + disclaiming prose downgrades to RELATED_AUTHORITY_ONLY with specificAuthorityNotFound=true", () => {
  const result = {
    answer: "There is no specific BIR issuance that addresses drone delivery services. The general tax principles under the NIRC would apply.",
    sourceStatus: "AUTHORITY_FOUND",
    displayedSourceCount: 4
  };
  const trust = buildResponseTrust(result, 4, "AUTHORITY_FOUND");
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", "downgraded from VERIFIED_CONTROLLING");
  check(trust.specificAuthorityNotFound === true, "qualifier flag set");
  check(trust.limitations.includes("SPECIFIC_AUTHORITY_NOT_FOUND"), "limitation recorded");
  check(trust.sourceState === "AUTHORITY_FOUND", "underlying sourceState remains AUTHORITY_FOUND -- general authority genuinely was retrieved; only authoritySupport is recalibrated, so no redundant RELATED_AUTHORITY_ONLY sourceState-derived limitation is added");
});

await test("Case C: ordinary AUTHORITY_FOUND answer (no disclaimer) is unaffected -- remains VERIFIED_CONTROLLING", () => {
  const result = { answer: "The standard corporate income tax rate is 25% under NIRC Sec. 27(A).", sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 1, answerSupport: { schemaValid: true, verifiedEligible: true } };
  const trust = buildResponseTrust(result, 1, "AUTHORITY_FOUND");
  check(trust.authoritySupport === "VERIFIED_CONTROLLING", "unchanged: no regression for ordinary verified answers");
  check(trust.specificAuthorityNotFound === false, "qualifier false");
});

await test("Case C: ordinary RELATED_AUTHORITY_ONLY (broad query, no specific document requested) does not set the qualifier", () => {
  const result = { answer: "EWT generally requires the payor to withhold a portion of certain income payments.", sourceStatus: "RELATED_AUTHORITY_ONLY", displayedSourceCount: 1 };
  const trust = buildResponseTrust(result, 1, "RELATED_AUTHORITY_ONLY");
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", "still related-authority-only");
  check(trust.specificAuthorityNotFound === false, "qualifier is only set via the AUTHORITY_FOUND+disclaimer downgrade path, not ordinary RELATED_AUTHORITY_ONLY");
});

await test("Case C: invariant -- specificAuthorityNotFound can never be true unless authoritySupport is RELATED_AUTHORITY_ONLY", () => {
  // Domain boundary forces authoritySupport to NOT_APPLICABLE regardless of any answer text.
  const result = { domainBoundary: true, answer: "There is no specific issuance that addresses this." };
  const trust = buildTrustContract(result);
  check(trust.authoritySupport === "NOT_APPLICABLE", "domain boundary wins");
  check(trust.specificAuthorityNotFound === false, "invariant enforced even with disclaiming prose present");
});

await test("Case F: root cause confirmed -- the real pipeline Step 9 Four-Part Doctrine Test shape never satisfies the renderer completeness gate", () => {
  const step9Shape = { conflictAnalysis: { trueConflicts: [{ trueConflict: true }], count: 1, hasConflict: true }, sourceStatus: "AUTHORITY_FOUND", displayedSourceCount: 1 };
  const trust = buildResponseTrust(step9Shape, 1, "AUTHORITY_FOUND");
  check(trust.hasConflict === false, "incomplete Step 9 shape never yields a verified conflict (pre-existing, documented limitation)");
  check(trust.conflictState === "POTENTIAL_CONFLICT", "surfaced as potential, not silently dropped or overstated");
});

await test("Case F fixture: complete conflict metadata reaches VERIFIED_CONFLICT / CONFLICTING_AUTHORITY end to end", () => {
  const fx = STAGING_TRUST_FIXTURES["F-CONFLICTING-AUTHORITY"];
  const trust = buildResponseTrust(fx, fx.displayedSourceCount, fx.sourceStatus);
  check(trust.hasConflict === true, "hasConflict true");
  check(trust.conflictState === "VERIFIED_CONFLICT", "conflictState VERIFIED_CONFLICT");
  check(trust.authoritySupport === "CONFLICTING_AUTHORITY", "authoritySupport reflects the conflict, never collapsed to verified-controlling");
  check(trust.limitations.includes("CONFLICTING_AUTHORITY"), "limitation recorded");
});

await test("all A-G staging fixtures produce exactly their intended canonical trust state", () => {
  const expected = {
    "A-VERIFIED-CONTROLLING": { authoritySupport: "VERIFIED_CONTROLLING" },
    "B-RELATED-AUTHORITY-ONLY": { authoritySupport: "RELATED_AUTHORITY_ONLY", specificAuthorityNotFound: false },
    "C-SPECIFIC-AUTHORITY-NOT-FOUND": { authoritySupport: "RELATED_AUTHORITY_ONLY", specificAuthorityNotFound: true },
    "D-RETRIEVAL-TIMEOUT": { authoritySupport: "NO_VERIFIED_AUTHORITY", sourceState: "RETRIEVAL_TIMEOUT" },
    "E-RESTRICTED-OUTCOME-PREDICTION": { legalConclusion: "RESTRICTED", humanReviewRequired: true },
    "F-CONFLICTING-AUTHORITY": { authoritySupport: "CONFLICTING_AUTHORITY", hasConflict: true, conflictState: "VERIFIED_CONFLICT" },
    "G-GENERAL-NON-RESTRICTED": { authoritySupport: "VERIFIED_CONTROLLING" }
  };
  for (const [id, fx] of Object.entries(STAGING_TRUST_FIXTURES)) {
    const trust = buildResponseTrust(fx, fx.displayedSourceCount, fx.sourceStatus);
    const exp = expected[id];
    check(exp, `${id}: has an expected-state entry in this test`);
    for (const [key, value] of Object.entries(exp)) {
      check(trust[key] === value, `${id}: trust.${key} === ${value} (got ${trust[key]})`);
    }
  }
  check(Object.keys(STAGING_TRUST_FIXTURES).length === 7, "exactly 7 canonical-state fixtures (A-G)");
});

await test("staging fixture registry fails closed on production runtime", () => {
  for (const id of Object.keys(STAGING_TRUST_FIXTURES)) {
    check(resolveStagingFixture(id, PROD_ENV) === null, `${id}: denied on production`);
  }
});

await test("staging fixture registry fails closed locally (not staging)", () => {
  check(resolveStagingFixture("A-VERIFIED-CONTROLLING", LOCAL_ENV) === null, "denied locally");
});

await test("staging fixture registry denies unknown fixture IDs even on staging", () => {
  check(resolveStagingFixture("UNKNOWN-ID", STAGING_ENV) === null, "unknown id denied");
  check(resolveStagingFixture("", STAGING_ENV) === null, "empty id denied");
  check(resolveStagingFixture(undefined, STAGING_ENV) === null, "undefined id denied");
  check(resolveStagingFixture({ malicious: "object" }, STAGING_ENV) === null, "non-string id denied (no free-form object injection)");
});

// PHASE-10A4C-FIXTURE-REGISTRY-OWN-PROPERTY-HARDENING-1
await test("staging fixture registry rejects inherited Object.prototype keys (own-property hardening)", () => {
  const prototypeKeys = ["__proto__", "constructor", "toString", "hasOwnProperty", "valueOf", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString"];
  for (const key of prototypeKeys) {
    check(resolveStagingFixture(key, STAGING_ENV) === null, `${key}: inherited Object.prototype member denied, not resolved to an inherited value`);
  }
  // Also confirm denial holds on production (defense in depth -- the staging
  // gate alone already fails closed here, but this proves the own-property
  // check does not weaken that).
  for (const key of prototypeKeys) {
    check(resolveStagingFixture(key, PROD_ENV) === null, `${key}: also denied on production`);
  }
});

await test("staging fixture registry resolves every known ID on staging with no client-controlled content beyond the ID", () => {
  for (const id of Object.keys(STAGING_TRUST_FIXTURES)) {
    const resolved = resolveStagingFixture(id, STAGING_ENV);
    check(resolved !== null, `${id}: resolves on staging`);
    check(resolved.fixtureId === id, `${id}: fixtureId echoed back matches the lookup key only`);
  }
});

await test("fixture registry contains no secrets, tokens, or private identifiers", () => {
  const src = readFileSync("services/staging-trust-fixtures.js", "utf8");
  check(!/eyJ[A-Za-z0-9_-]{10}/.test(src), "no JWT-shaped value");
  check(!/dpl_[A-Za-z0-9]{16}|prj_[A-Za-z0-9]{16}|team_[A-Za-z0-9]{12}/.test(src), "no Vercel identifiers");
  check(!/password|secret\s*[:=]\s*["'][^"']+["']/i.test(src), "no credential literal");
});

await test("ask-handler.js wires the fixture route after authentication, with no new auth bypass", () => {
  const src = readFileSync("ask-handler.js", "utf8");
  check(/resolveStagingFixture\(req\.body\?\.fixtureId\)/.test(src), "fixture resolution reads only req.body.fixtureId");
  const userIdCheckIdx = src.indexOf('error: "User ID not found in token. Cannot proceed."');
  const fixtureIdx = src.indexOf("resolveStagingFixture(req.body?.fixtureId)");
  check(userIdCheckIdx !== -1 && fixtureIdx !== -1 && fixtureIdx > userIdCheckIdx, "fixture short-circuit occurs strictly after the userId/auth check, not before");
});

console.log(`\nPHASE-10A4C trust calibration / conflict-state / fixture tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
