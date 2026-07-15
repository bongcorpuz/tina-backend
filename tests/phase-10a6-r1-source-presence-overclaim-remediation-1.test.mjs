// PHASE-10A6-R1-SOURCE-PRESENCE-OVERCLAIM-REMEDIATION-1
//
// Regression tests for the bare-source-listing guard that prevents source
// presence alone from producing a VERIFIED_CONTROLLING overclaim. The
// confirmed PHASE-10A6 Q9 P1 incident: a SOURCE-mode "Indexed sources found:"
// listing (which discards analysis) was classified VERIFIED_CONTROLLING.

import assert from "node:assert/strict";
import { buildResponseTrust, answerIsBareSourceListing } from "../services/trust-contract.js";

let passed = 0, failed = 0, assertions = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}
function check(c, m) { assertions++; assert(c, m); }

// The exact Q9 rendered answer shape (SOURCE-mode deterministic listing).
const Q9_ANSWER = "Indexed sources found:\n\nNIRC Sec. 2 – Primary Statute — 01-tax-code/nirc-1997-ra-10963-(bir).pdf\nG.R. No. 226592 – Supreme Court Decision — 06-court-cases/g.r.-no.-226592.-july-27-2021.pdf";

await test("detector: recognizes the canned 'Indexed sources found:' bare-listing marker (incl. leading disclosure)", () => {
  check(answerIsBareSourceListing(Q9_ANSWER) === true, "Q9 bare listing detected");
  check(answerIsBareSourceListing("Please verify applicability.\n\nIndexed sources found:\nNIRC Sec. 2") === true, "detected with a leading disclosure line before the marker");
  check(answerIsBareSourceListing("The standard corporate income tax rate is 25% under NIRC Sec. 27(A).") === false, "ordinary analytical answer is not a bare listing");
  check(answerIsBareSourceListing("Short Answer\nRR No. 2-98 governs withholding tax and requires agents to remit.") === false, "analytical answer mentioning sources is not a bare listing");
  check(answerIsBareSourceListing("") === false, "empty");
  check(answerIsBareSourceListing(undefined) === false, "undefined");
});

// R1 -- exact Q9: bare source-listing + AUTHORITY_FOUND must NOT be VERIFIED_CONTROLLING.
await test("R1: exact Q9 bare-listing response fails closed to RELATED_AUTHORITY_ONLY (not VERIFIED_CONTROLLING)", () => {
  const trust = buildResponseTrust({ answer: Q9_ANSWER }, 2, "AUTHORITY_FOUND");
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `expected RELATED_AUTHORITY_ONLY, got ${trust.authoritySupport}`);
  check(trust.authoritySupport !== "VERIFIED_CONTROLLING", "must not overclaim VERIFIED_CONTROLLING");
});

// R2 -- Q9 paraphrase with a differently-worded bare listing (same structural marker).
await test("R2: paraphrased bare-listing response also fails closed", () => {
  const answer = "Indexed sources found:\n1. RR No. 16-2005 — Regulation\n2. CTA Case No. 9711 — Court of Tax Appeals";
  const trust = buildResponseTrust({ answer }, 2, "AUTHORITY_FOUND");
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `expected RELATED_AUTHORITY_ONLY, got ${trust.authoritySupport}`);
});

// R3 -- specific circular missing (prose disclaimer path), general law available.
await test("R3: prose disclaiming a specific issuance stays RELATED_AUTHORITY_ONLY + specificAuthorityNotFound", () => {
  const answer = "There is no specific BIR issuance on this exact matter. The general NIRC provisions would apply.";
  const trust = buildResponseTrust({ answer }, 2, "AUTHORITY_FOUND");
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `expected RELATED_AUTHORITY_ONLY, got ${trust.authoritySupport}`);
  check(trust.specificAuthorityNotFound === true, "specificAuthorityNotFound qualifier set");
});

// R4 -- genuine controlling authority: an analytical answer must REMAIN VERIFIED_CONTROLLING.
await test("R4: genuine analytical answer with controlling authority remains VERIFIED_CONTROLLING (no blanket downgrade)", () => {
  const answer = "Short Answer\nThe standard corporate income tax rate for domestic corporations is 25% on taxable income, as provided in NIRC Sec. 27(A).";
  // PHASE-10A10-R2: VERIFIED_CONTROLLING requires a present, valid attestation.
  const trust = buildResponseTrust({ answer, answerSupport: { schemaValid: true, verifiedEligible: true } }, 1, "AUTHORITY_FOUND");
  check(trust.authoritySupport === "VERIFIED_CONTROLLING", `expected VERIFIED_CONTROLLING, got ${trust.authoritySupport}`);
});

// R5 -- bare source listing (generic) must not be VERIFIED_CONTROLLING.
await test("R5: a bare source-listing with many displayed sources still fails closed", () => {
  const answer = "Indexed sources found:\nNIRC Sec. 106\nNIRC Sec. 108\nRR 16-2005\nRMC 75-2015";
  const trust = buildResponseTrust({ answer }, 4, "AUTHORITY_FOUND");
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `expected RELATED_AUTHORITY_ONLY, got ${trust.authoritySupport}`);
});

// R6 -- explicit unresolved conflict (complete conflict metadata) must be CONFLICTING_AUTHORITY,
// and must take precedence even over an analytical answer.
await test("R6: complete conflict metadata yields CONFLICTING_AUTHORITY (precedence over verified)", () => {
  const answer = "Short Answer\nThere is a genuine conflict between two issuances on timing.";
  const conflictAnalysis = { hasConflict: true, conflict: true, conflictType: "DOCTRINAL_CONFLICT", exactIssue: "timing", exactLegalDimension: "period", sameIssueGate: { passed: true }, oppositeHoldingGate: { passed: true }, resolutionBasis: "unresolved" };
  const trust = buildResponseTrust({ answer, conflictAnalysis }, 2, "AUTHORITY_FOUND");
  check(trust.hasConflict === true && trust.conflictState === "VERIFIED_CONFLICT", "verified conflict");
  check(trust.authoritySupport === "CONFLICTING_AUTHORITY", `expected CONFLICTING_AUTHORITY, got ${trust.authoritySupport}`);
});

// R9 -- source failure remains a failure state.
await test("R9: retrieval timeout stays a source-failure state (NO_VERIFIED_AUTHORITY)", () => {
  const trust = buildResponseTrust({ answer: "TINA could not complete source retrieval in time." }, 0, "RETRIEVAL_TIMEOUT");
  check(trust.authoritySupport === "NO_VERIFIED_AUTHORITY", `expected NO_VERIFIED_AUTHORITY, got ${trust.authoritySupport}`);
});

// R10 -- restricted outcome prediction stays restricted.
await test("R10: restricted legal conclusion stays RESTRICTED + human review", () => {
  const trust = buildResponseTrust({ responseType: "controlled_loa_legal_conclusion_restricted", answer: "A conclusive determination cannot be made.", controlledLoaAnswer: { requiresHumanReview: true } }, 0, "NOT_APPLICABLE");
  check(trust.legalConclusion === "RESTRICTED", "restricted");
  check(trust.humanReviewRequired === true, "human review required");
});

console.log(`\nPHASE-10A6-R1 source-presence overclaim remediation tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
