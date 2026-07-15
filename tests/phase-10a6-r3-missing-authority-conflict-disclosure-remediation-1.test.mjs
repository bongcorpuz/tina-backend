// PHASE-10A6-R3-MISSING-AUTHORITY-CONFLICT-DISCLOSURE-REMEDIATION-1
//
// Regression tests for the structured explanatory fallback that replaces a bare
// SOURCE-mode "Indexed sources found:" listing with a substantive body
// (missing-authority disclosure + conflict disclosure + authority hierarchy)
// while keeping the trust state safely at RELATED_AUTHORITY_ONLY (never
// VERIFIED_CONTROLLING). Confirmed PHASE-10A6-R2 P1: Q9 returned a bare source
// list that disclosed neither the missing requested ruling nor the conflict.

import assert from "node:assert/strict";
import { buildResponseTrust, answerIsBareSourceListing } from "../services/trust-contract.js";
import {
  querySeeksSpecificAuthority,
  queryFramesAuthorityConflict,
  buildStructuredSourceFallbackAnswer,
  buildSourceFallbackDisclosureMeta
} from "../services/source-fallback-disclosure.js";

let passed = 0, failed = 0, assertions = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}
function check(c, m) { assertions++; assert(c, m); }

// Mirror of the ask-handler.js PHASE-10A6-R3 enrichment block, so tests execute
// the real production behavior (bare listing -> structured body + structured
// flags -> trust) rather than asserting on source text.
function simulateAskHandler({ answer, question, visibleSources, sourceStatus = "ISSUE_MATCHED_CONTEXT_USED" }) {
  const result = { answer };
  const displayedSourceCount = visibleSources.length;
  let disclosure = null;
  if (answerIsBareSourceListing(result.answer) && visibleSources.length > 0) {
    const specificAuthorityRequested = querySeeksSpecificAuthority(question);
    const authorityConflictFramed = queryFramesAuthorityConflict(question);
    result.answer = buildStructuredSourceFallbackAnswer({
      sources: visibleSources,
      specificAuthorityRequested,
      conflictFramed: authorityConflictFramed
    });
    result.sourceOnlyFallback = true;
    result.specificAuthorityRequested = specificAuthorityRequested;
    result.requestedAuthorityMatched = false;
    result.authorityConflictFramed = authorityConflictFramed;
    disclosure = buildSourceFallbackDisclosureMeta({
      sourceOnlyFallback: true,
      specificAuthorityRequested,
      conflictFramed: authorityConflictFramed
    });
  }
  const trust = buildResponseTrust(result, displayedSourceCount, sourceStatus);
  return { result, trust, disclosure };
}

const BARE = "Indexed sources found:\n\nNIRC Sec. 2 – Primary Statute\nG.R. No. 226592 – Supreme Court Decision";
const SOURCES = [
  { label: "NIRC Sec. 2", authorityType: "Statute" },
  { label: "G.R. No. 226592", authorityType: "Supreme Court Decision" },
  { label: "RR No. 16-2005", authorityType: "Regulation" }
];

const Q9 = "A company cannot locate the exact BIR ruling requested by the client, but finds a Tax Code provision, a revenue regulation, a Supreme Court case, and a later circular pointing in different directions. Which authority controls, and how should the conflict be presented without overstating certainty?";

// T1 -- exact Q9: substantive body, missing ruling disclosed, conflict disclosed, not verified, not bare.
await test("T1: exact Q9 produces substantive disclosure body, RELATED_AUTHORITY_ONLY, not bare, not verified", () => {
  const { result, trust, disclosure } = simulateAskHandler({ answer: BARE, question: Q9, visibleSources: SOURCES, sourceStatus: "AUTHORITY_FOUND" });
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `expected RELATED_AUTHORITY_ONLY, got ${trust.authoritySupport}`);
  check(trust.authoritySupport !== "VERIFIED_CONTROLLING", "must not overclaim verified");
  check(answerIsBareSourceListing(result.answer) === false, "body must no longer be a bare listing");
  check(/not located or verified/i.test(result.answer), "missing requested authority disclosed");
  check(/conflict|different directions|competing|harmoniz/i.test(result.answer), "conflict/uncertainty disclosed");
  check(/statute .* prevails|prevails over an administrative/i.test(result.answer), "authority hierarchy explained");
  check(trust.specificAuthorityNotFound === true, "specificAuthorityNotFound flag set on trust");
  check(disclosure.sourceOnlyFallback === true, "sourceOnlyFallback disclosure flag set");
  check(disclosure.substantiveAnswerGenerated === false, "marked as fallback, not model-generated");
  check(/does not mean the issuance does not exist/i.test(result.answer), "must explicitly NOT claim the issuance does not exist");
});

// T2 -- Q9 paraphrase.
await test("T2: Q9 paraphrase also produces substantive disclosure and stays RELATED_AUTHORITY_ONLY", () => {
  const q = "We could not find the specific BIR ruling the client asked for; the statute, a regulation, and a Supreme Court case appear inconsistent. Which controls?";
  const { result, trust, disclosure } = simulateAskHandler({ answer: BARE, question: q, visibleSources: SOURCES, sourceStatus: "AUTHORITY_FOUND" });
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `expected RELATED_AUTHORITY_ONLY, got ${trust.authoritySupport}`);
  check(/not located or verified/i.test(result.answer), "missing authority disclosed");
  check(trust.specificAuthorityNotFound === true, "specificAuthorityNotFound set");
  check(disclosure.conflictDetected === true, "conflict framed detected");
});

// T3 -- missing RMC with related law available.
await test("T3: missing RMC with related law -> specific authority not found + substantive body", () => {
  const q = "The taxpayer requested revenue memorandum circular on this exact point but we cannot find it. What do the Tax Code and regulations say?";
  const { result, trust, disclosure } = simulateAskHandler({ answer: BARE, question: q, visibleSources: SOURCES, sourceStatus: "AUTHORITY_FOUND" });
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `expected RELATED_AUTHORITY_ONLY, got ${trust.authoritySupport}`);
  check(disclosure.specificAuthorityRequested === true, "specificAuthorityRequested true");
  check(trust.specificAuthorityNotFound === true, "specificAuthorityNotFound true");
  check(/## Requested authority/.test(result.answer), "requested-authority section present");
});

// T4 -- conflict framed without a specifically requested authority.
await test("T4: conflict without missing specific authority -> conflict disclosed, hierarchy explained, no overclaim", () => {
  const q = "Two BIR issuances seem to conflict on the timing of withholding. How should the competing authorities be reconciled?";
  const { result, trust, disclosure } = simulateAskHandler({ answer: BARE, question: q, visibleSources: SOURCES, sourceStatus: "AUTHORITY_FOUND" });
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", `expected RELATED_AUTHORITY_ONLY, got ${trust.authoritySupport}`);
  check(disclosure.conflictDetected === true, "conflict detected");
  check(/## Competing or conflicting authorities/.test(result.answer), "conflict section present");
  check(/prevails/.test(result.answer), "hierarchy explained");
});

// T5 -- bare source-list fallback is always enriched (never left bare).
await test("T5: generic bare source-list fallback is replaced by a structured body", () => {
  const q = "What are the relevant authorities on input VAT?";
  const { result, trust } = simulateAskHandler({ answer: "Indexed sources found:\nNIRC Sec. 110\nRR 16-2005", question: q, visibleSources: SOURCES, sourceStatus: "AUTHORITY_FOUND" });
  check(answerIsBareSourceListing(result.answer) === false, "no longer bare");
  check(/## Summary/.test(result.answer), "structured summary present");
  check(/## Related authorities/.test(result.answer), "related authorities listed");
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", "fails closed to related-only");
});

// T6 -- legitimate verified control: a genuine analytical answer must remain VERIFIED_CONTROLLING.
await test("T6: genuine analytical answer remains VERIFIED_CONTROLLING (no downgrade, no fallback)", () => {
  const answer = "Short Answer\nThe standard corporate income tax rate for domestic corporations is 25% on taxable income under NIRC Sec. 27(A).";
  const { result, trust, disclosure } = simulateAskHandler({ answer, question: "What is the corporate income tax rate?", visibleSources: [{ label: "NIRC Sec. 27(A)", authorityType: "Statute" }], sourceStatus: "AUTHORITY_FOUND" });
  check(trust.authoritySupport === "VERIFIED_CONTROLLING", `expected VERIFIED_CONTROLLING, got ${trust.authoritySupport}`);
  check(disclosure === null, "no fallback disclosure emitted");
  check(result.answer === answer, "genuine answer left untouched");
});

// T7 -- restricted outcome question stays restricted.
await test("T7: restricted outcome prediction stays RESTRICTED + human review", () => {
  const trust = buildResponseTrust({ responseType: "controlled_loa_legal_conclusion_restricted", answer: "A conclusive determination cannot be made.", controlledLoaAnswer: { requiresHumanReview: true } }, 0, "NOT_APPLICABLE");
  check(trust.legalConclusion === "RESTRICTED", "restricted");
  check(trust.humanReviewRequired === true, "human review required");
});

// T8 -- source failure stays a failure state (no false "not found" legal conclusion).
await test("T8: retrieval timeout stays NO_VERIFIED_AUTHORITY and no fallback enrichment", () => {
  const { result, trust, disclosure } = simulateAskHandler({ answer: "TINA could not complete source retrieval in time.", question: "Any question", visibleSources: [], sourceStatus: "RETRIEVAL_TIMEOUT" });
  check(trust.authoritySupport === "NO_VERIFIED_AUTHORITY", `expected NO_VERIFIED_AUTHORITY, got ${trust.authoritySupport}`);
  check(disclosure === null, "no fallback when no sources");
  check(result.answer.indexOf("Indexed sources found") === -1, "unchanged failure message");
});

// T9 -- general answer with related-only source state gets proportional treatment (no fallback, no missing-authority claim).
await test("T9: general related-authority-only answer is not turned into a missing-authority disclosure", () => {
  const { trust, disclosure } = simulateAskHandler({ answer: "In general, EWT applies to specified income payments.", question: "Explain EWT in general.", visibleSources: SOURCES, sourceStatus: "RELATED_AUTHORITY_ONLY" });
  check(trust.authoritySupport === "RELATED_AUTHORITY_ONLY", "related-only preserved");
  check(disclosure === null, "no fallback for a genuine prose answer");
  check(trust.specificAuthorityNotFound === false, "no false specific-authority-not-found");
});

// T10 -- persistence payload integrity: structured fields are present and stable on the trust object.
await test("T10: structured disclosure fields are present for persistence/reopen", () => {
  const { trust, disclosure } = simulateAskHandler({ answer: BARE, question: Q9, visibleSources: SOURCES, sourceStatus: "AUTHORITY_FOUND" });
  // Canonical trust contract carries specificAuthorityNotFound (frozen shape).
  check(trust.specificAuthorityNotFound === true, "trust carries specificAuthorityNotFound");
  // Additive payload-level disclosure metadata (kept off the frozen trust shape).
  for (const f of ["sourceOnlyFallback", "specificAuthorityRequested", "requestedAuthorityMatched", "specificAuthorityNotFound", "conflictDetected", "substantiveAnswerGenerated", "authorityHierarchyQualified", "humanReviewRecommended"]) {
    check(Object.prototype.hasOwnProperty.call(disclosure, f), `disclosure exposes ${f}`);
  }
  check(disclosure.requestedAuthorityMatched === false, "requestedAuthorityMatched false for Q9");
  check(disclosure.authorityHierarchyQualified === true, "hierarchy qualified true for fallback");
});

// Detector unit checks.
await test("detectors: query intent matchers are structural, not overfit", () => {
  check(querySeeksSpecificAuthority("cannot locate the exact BIR ruling requested") === true, "Q9 specific-authority request");
  check(querySeeksSpecificAuthority("requested revenue memorandum circular") === true, "RMC request");
  check(querySeeksSpecificAuthority("what is the VAT rate?") === false, "general question is not a specific request");
  check(queryFramesAuthorityConflict("authorities pointing in different directions") === true, "conflict framing");
  check(queryFramesAuthorityConflict("without overstating certainty") === true, "uncertainty framing");
  check(queryFramesAuthorityConflict("what is the corporate income tax rate") === false, "no conflict framing");
});

console.log(`\nPHASE-10A6-R3 missing-authority/conflict disclosure tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
