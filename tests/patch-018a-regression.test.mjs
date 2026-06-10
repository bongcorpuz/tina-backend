/**
 * PATCH-018A Regression Tests
 * Retrieval Result Propagation and SAE Reconciliation
 *
 * Run: node tests/patch-018a-regression.test.mjs
 *
 * These tests verify the invariants introduced by PATCH-018A:
 *   1. VAT-credit queries do NOT activate the FAST_DEFINITION VAT definition bridge
 *   2. Zero-rated VAT queries do NOT activate the VAT definition bridge
 *   3. Retrieval success + timedOut=true  → NOT RETRIEVAL_TIMEOUT
 *   4. Retrieval success + timedOut=false → NOT NO_INDEXED_SOURCE
 *   5. No candidates + timedOut=true      → RETRIEVAL_TIMEOUT (valid)
 *   6. No candidates + timedOut=false     → NO_INDEXED_SOURCE (valid)
 *   7. AUTHORITY_FOUND requires AND-gate — not forced by mere candidate presence
 *   8. PATCH_018A_VAT_BRIDGE_SCOPE_PRESERVED — PATCH-018A does not alter step 6.7 gate
 *
 * Logic is inlined from production modules to allow running without server deps.
 * Each function is copied verbatim from its source file (noted per function).
 */

"use strict";

// ─── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
    failures.push(label);
  }
}

function group(name, fn) {
  console.log(`\n── ${name}`);
  fn();
}

// ─── Inlined from issue-classification-engine.js (verbatim) ──────────────────

function isVatDefinitionQuery(classification = {}) {
  const subIssue = String(classification?.subIssue || "");
  const strategy = String(classification?.retrievalStrategy || "");
  return subIssue === "VAT_DEFINITION" || strategy.includes("VAT_DEFINITION");
}

// ─── Inlined SAE helpers from pipeline.js (verbatim) ─────────────────────────

function _saeIsParsed(candidate = {}) {
  if (candidate.isParsed === true) return true;
  if (candidate.authorityAnnotation?.isParsed === true) return true;
  return String(candidate.parseStatus || candidate.parse_status || "").toLowerCase() === "success";
}

function _saeHasRelatedIssueSignal(candidate = {}) {
  const match = candidate.issueClassificationMatch || {};
  return Boolean(
    candidate.directlyGovernsIssue === true ||
    candidate.exactAuthorityMatch === true ||
    candidate.targetAuthorityMatch === true ||
    match.exactAuthorityMatch === true ||
    match.targetAuthorityMatch === true ||
    match.matched === true ||
    match.issueOverlap === true ||
    Number(candidate.citationMatchBonus || 0) > 0 ||
    Number(candidate.confidence || candidate.authorityAnnotation?.confidence || 0) >= 0.35
  );
}

function _saeHasConcreteAuthorityPlan(issueClassification = {}) {
  const authorityGroups = issueClassification.targetAuthorityGroups || {};
  const planned = [
    ...(Array.isArray(issueClassification.targetAuthorities) ? issueClassification.targetAuthorities : []),
    ...(Array.isArray(issueClassification.controllingAuthorities) ? issueClassification.controllingAuthorities : []),
    ...(Array.isArray(issueClassification.supportingAuthorities) ? issueClassification.supportingAuthorities : []),
    ...(Array.isArray(issueClassification.supportingJurisprudence) ? issueClassification.supportingJurisprudence : []),
    ...(Array.isArray(authorityGroups.controllingAuthorities) ? authorityGroups.controllingAuthorities : []),
    ...(Array.isArray(authorityGroups.supportingAuthorities) ? authorityGroups.supportingAuthorities : []),
    ...(Array.isArray(authorityGroups.supportingJurisprudence) ? authorityGroups.supportingJurisprudence : []),
  ];
  return planned.some((authority) => {
    const text = String(authority || "").trim();
    if (!text) return false;
    if (/^applicable\b/i.test(text)) return false;
    if (/\bprimary statute provisions?\b/i.test(text)) return false;
    if (/\brevenue regulations?\s*\/\s*bir issuances?\b/i.test(text)) return false;
    return true;
  });
}

function _saeHasConcreteRelatedIssueSignal(candidate = {}, issueClassification = {}) {
  const match = candidate.issueClassificationMatch || {};
  const hasConcreteAuthorityPlan = _saeHasConcreteAuthorityPlan(issueClassification);
  const exactOrTargetAuthorityMatch = Boolean(
    candidate.exactAuthorityMatch === true ||
    candidate.targetAuthorityMatch === true ||
    match.exactAuthorityMatch === true ||
    match.targetAuthorityMatch === true ||
    Number(candidate.citationMatchBonus || 0) > 0
  );
  const issueFamilyMatch = Boolean(match.matched === true || match.issueOverlap === true);
  if (candidate.directlyGovernsIssue === true) return true;
  if (exactOrTargetAuthorityMatch && hasConcreteAuthorityPlan) return true;
  if (issueFamilyMatch && hasConcreteAuthorityPlan) return true;
  return false;
}

function _saeAuthorityType(candidate = {}) {
  return String(
    candidate.authorityType ||
    candidate.authority_type ||
    candidate.authorityAnnotation?.authorityType ||
    candidate.metadata?.authorityType ||
    "UNKNOWN"
  ).toUpperCase();
}

function _saeIsRelatedAuthorityCandidate(candidate = {}, issueClassification = {}) {
  const role = String(candidate.authorityRole || candidate.authorityAnnotation?.authorityRole || "UNKNOWN").toUpperCase();
  const type = _saeAuthorityType(candidate);
  if (role === "GOVERNING" || role === "UNKNOWN" || role === "SECONDARY") return false;
  if (["UNKNOWN", "SECONDARY", "REVIEWER", "CPA_NOTES", "REVIEW_MATERIALS"].includes(type)) return false;
  return (
    candidate.isIndexed === true &&
    _saeIsParsed(candidate) === true &&
    _saeHasRelatedIssueSignal(candidate) &&
    _saeHasConcreteRelatedIssueSignal(candidate, issueClassification)
  );
}

/**
 * Inlined from pipeline.js: classifySourceAvailability()
 * Includes PATCH-018A reconciliation guards (verbatim logic).
 *
 * NOTE: semanticNoMatchGuard branch omitted here — tests below do not
 * activate it (no guard active on the input classifications used).
 */
function classifySourceAvailability(input = {}) {
  const annotatedCandidates = Array.isArray(input.annotatedCandidates) ? input.annotatedCandidates : [];
  const issueClassification = input.issueClassification || {};
  const query = String(input.query || "");

  const outcomeCategory = String(
    input.outcomeCategory ||
    input.retrievalMeta?.outcomeCategory ||
    input.retrievalMeta?.retrievalMeta?.outcomeCategory ||
    ""
  ).toUpperCase();

  const retrievalTimedOut =
    outcomeCategory === "RETRIEVAL_TIMEOUT" ||
    String(input.fallbackStatus?.saeStatus || input.fallbackStatus || "").toUpperCase() === "RETRIEVAL_TIMEOUT" ||
    input.retrievalDiagnostics?.timedOut === true ||
    input.retrievalMeta?.retrievalDiagnostics?.timedOut === true;

  const eligibleCandidates = annotatedCandidates.filter((candidate) =>
    candidate.authorityRole === "GOVERNING" &&
    candidate.directlyGovernsIssue === true &&
    candidate.isIndexed === true &&
    _saeIsParsed(candidate) === true &&
    candidate.higherAuthorityMissing === false
  );

  const suppressedCandidates = annotatedCandidates
    .filter((c) => !eligibleCandidates.includes(c))
    .map((c) => ({ ...c, _suppressed: true }));

  const base = {
    eligibleCandidates,
    suppressedCandidates,
    limitationRequired: true,
    disclosureType: "LIMITATION",
    statusReason: "",
  };

  // PATCH-018A: Reconciliation guard — if timedOut but candidates exist, block RETRIEVAL_TIMEOUT
  // override and fall through to normal classification with those candidates.
  // True timeout (zero candidates) still returns RETRIEVAL_TIMEOUT.
  if (retrievalTimedOut) {
    if (annotatedCandidates.length > 0) {
      // Fall through to normal classification below
    } else {
      return {
        ...base,
        saeStatus: "RETRIEVAL_TIMEOUT",
        disclosureType: "RETRIEVAL_TIMEOUT",
        statusReason: "Retrieval timed out; source availability could not be verified within the retrieval window.",
      };
    }
  }

  if (outcomeCategory === "NO_CANDIDATES" && annotatedCandidates.length === 0) {
    return {
      ...base,
      saeStatus: "SOURCE_LOOKUP_EMPTY",
      disclosureType: "SOURCE_LOOKUP_EMPTY",
      statusReason: "Retrieval completed successfully and returned zero candidates.",
    };
  }

  if (
    annotatedCandidates.length > 0 &&
    annotatedCandidates.every((candidate) => !_saeIsParsed(candidate))
  ) {
    return {
      ...base,
      saeStatus: "SOURCE_PARSE_ERROR",
      disclosureType: "SOURCE_PARSE_ERROR",
      statusReason: "Candidates were retrieved, but all relevant candidates failed source parsing.",
    };
  }

  if (eligibleCandidates.length > 0) {
    return {
      ...base,
      saeStatus: "AUTHORITY_FOUND",
      limitationRequired: false,
      disclosureType: null,
      statusReason: `${eligibleCandidates.length} governing indexed parsed candidate(s) directly govern the issue.`,
    };
  }

  const hasRelatedAuthority = annotatedCandidates.some((candidate) =>
    _saeIsRelatedAuthorityCandidate(candidate, issueClassification)
  );
  if (hasRelatedAuthority) {
    return {
      ...base,
      saeStatus: "RELATED_AUTHORITY_ONLY",
      disclosureType: "RELATED_AUTHORITY_ONLY",
      statusReason: "Indexed candidates exist, but none satisfy governing direct-authority requirements.",
    };
  }

  // PATCH-018A: For case/jurisprudence queries, if only statute/RR authority is found,
  // return RELATED_AUTHORITY_ONLY instead of NO_INDEXED_SOURCE.
  const _018aCaseQuery = /\b(cases?|jurisprudence|ruling[s]?|supreme\s+court|cta\b)/i.test(query);
  if (_018aCaseQuery && annotatedCandidates.length > 0) {
    const _018aHasStatuteOrRr = annotatedCandidates.some((c) => {
      const t = String(c.authorityType || c.authority_type || c.authorityAnnotation?.authorityType || "")
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
      return ["NIRC", "STATUTE", "TAX_CODE", "RR", "REVENUE_REGULATION", "REPUBLIC_ACT", "RA"].includes(t);
    });
    if (_018aHasStatuteOrRr) {
      return {
        ...base,
        saeStatus: "RELATED_AUTHORITY_ONLY",
        disclosureType: "RELATED_AUTHORITY_ONLY",
        statusReason: "[PATCH-018A] Case/jurisprudence query: related statute/RR authority found but no case authority satisfied direct-govern requirements.",
      };
    }
  }

  return {
    ...base,
    saeStatus: "NO_INDEXED_SOURCE",
    disclosureType: "NO_INDEXED_SOURCE",
    statusReason: "No indexed source candidate satisfied source availability classification.",
  };
}

// ─── VAT bridge gate (mirrors pipeline.js step 6.7) ──────────────────────────

/**
 * Returns true if the VAT definition bridge (PATCH-017H, step 6.7) would
 * evaluate its candidate-search block for this context.
 * PATCH-018A does NOT alter this gate.
 */
function wouldVatBridgeActivate(issueClassification, saeStatus) {
  return (
    isVatDefinitionQuery(issueClassification) &&
    (saeStatus === "NO_INDEXED_SOURCE" || saeStatus === "RELATED_AUTHORITY_ONLY")
  );
}

// ─── Candidate builders ───────────────────────────────────────────────────────

function governingCandidate(overrides = {}) {
  return {
    authorityRole:        "GOVERNING",
    directlyGovernsIssue: true,
    isIndexed:            true,
    isParsed:             true,
    higherAuthorityMissing: false,
    authorityType:        "NIRC",
    citation:             "NIRC Sec. 110",
    ...overrides,
  };
}

function relatedCandidate(overrides = {}) {
  return {
    authorityRole:  "SUPPORTING",
    isIndexed:      true,
    isParsed:       true,
    authorityType:  "RR",
    exactAuthorityMatch: true,
    issueClassificationMatch: { exactAuthorityMatch: true },
    ...overrides,
  };
}

function statuteCandidate(overrides = {}) {
  return {
    authorityRole:  "RELATED",
    isIndexed:      true,
    isParsed:       true,
    authorityType:  "NIRC",
    citation:       "NIRC Sec. 110",
    ...overrides,
  };
}

// ─── Test groups ──────────────────────────────────────────────────────────────

group("TEST 1 — VAT credits query: isVatDefinitionQuery returns false (bridge NOT activated)", () => {
  // Query: "can you tell me cases about VAT credits"
  // Classification would resolve VAT_CREDIT or INPUT_TAX — never VAT_DEFINITION.
  const vatCreditClassifications = [
    { subIssue: "VAT_CREDIT",              retrievalStrategy: "VAT_AUTHORITY_RETRIEVAL" },
    { subIssue: "INPUT_TAX_CREDIT",        retrievalStrategy: "VAT_CREDIT_RETRIEVAL" },
    { subIssue: "VAT_INPUT_TAX",           retrievalStrategy: "VAT_AUTHORITY_RETRIEVAL" },
    { subIssue: "VAT_REFUND",              retrievalStrategy: "VAT_REFUND_RETRIEVAL" },
    { subIssue: "CASE_JURISPRUDENCE",      retrievalStrategy: "CASE_RETRIEVAL" },
    { subIssue: "VAT_CREDITS_CASES",       retrievalStrategy: "JURISPRUDENCE_RETRIEVAL" },
  ];

  for (const clf of vatCreditClassifications) {
    assert(
      isVatDefinitionQuery(clf) === false,
      `isVatDefinitionQuery(${JSON.stringify(clf)}) === false`
    );
  }

  // Confirm VAT definition bridge does NOT activate for VAT credit SAE statuses
  const bridgeResult1 = wouldVatBridgeActivate({ subIssue: "VAT_CREDIT" }, "NO_INDEXED_SOURCE");
  assert(bridgeResult1 === false, "VAT bridge does NOT activate for subIssue=VAT_CREDIT + NO_INDEXED_SOURCE");

  const bridgeResult2 = wouldVatBridgeActivate({ subIssue: "INPUT_TAX_CREDIT" }, "RELATED_AUTHORITY_ONLY");
  assert(bridgeResult2 === false, "VAT bridge does NOT activate for subIssue=INPUT_TAX_CREDIT + RELATED_AUTHORITY_ONLY");

  // Confirm SAE for VAT credits stays on legal analysis / case path
  const result = classifySourceAvailability({
    query: "can you tell me cases about VAT credits",
    annotatedCandidates: [statuteCandidate({ authorityType: "NIRC" })],
    issueClassification: { subIssue: "VAT_CREDIT", primaryIssue: "VAT" },
  });
  assert(result.saeStatus !== "FAST_DEFINITION", "VAT credits query: saeStatus is not FAST_DEFINITION");
  assert(
    result.saeStatus === "RELATED_AUTHORITY_ONLY",
    `VAT credits query with statute candidate → RELATED_AUTHORITY_ONLY (got ${result.saeStatus})`
  );
});

group("TEST 2 — Zero-rated VAT query: VAT definition bridge NOT activated", () => {
  // Query: "What are zero-rated VAT transactions?"
  const zeroRatedClassifications = [
    { subIssue: "VAT_ZERO_RATED",          retrievalStrategy: "VAT_AUTHORITY_RETRIEVAL" },
    { subIssue: "ZERO_RATED_SALES",        retrievalStrategy: "VAT_AUTHORITY_RETRIEVAL" },
    { subIssue: "VAT_EXEMPT",              retrievalStrategy: "VAT_AUTHORITY_RETRIEVAL" },
    { subIssue: "VAT_ZERO_RATING",         retrievalStrategy: "ZERO_RATED_VAT_RETRIEVAL" },
  ];

  for (const clf of zeroRatedClassifications) {
    assert(
      isVatDefinitionQuery(clf) === false,
      `isVatDefinitionQuery(${JSON.stringify(clf)}) === false`
    );
  }

  // Standard VAT path preserved — NOT overridden by VAT_DEFINITION path
  const result = classifySourceAvailability({
    query: "What are zero-rated VAT transactions?",
    annotatedCandidates: [governingCandidate({ citation: "NIRC Sec. 106" })],
    issueClassification: { subIssue: "VAT_ZERO_RATED", primaryIssue: "VAT" },
  });
  assert(result.saeStatus === "AUTHORITY_FOUND", `Zero-rated VAT with GOVERNING candidate → AUTHORITY_FOUND (got ${result.saeStatus})`);
  assert(result.saeStatus !== "FAST_DEFINITION", "Zero-rated VAT: saeStatus is not FAST_DEFINITION");

  const bridgeResult = wouldVatBridgeActivate({ subIssue: "VAT_ZERO_RATED" }, "NO_INDEXED_SOURCE");
  assert(bridgeResult === false, "VAT bridge does NOT activate for subIssue=VAT_ZERO_RATED");
});

group("TEST 3 — Retrieval success / timeout contradiction: timedOut=true + candidates>0 → NOT RETRIEVAL_TIMEOUT", () => {
  const result = classifySourceAvailability({
    query: "can you tell me cases about VAT credits",
    annotatedCandidates: [governingCandidate()],
    issueClassification: { subIssue: "VAT_CREDIT" },
    retrievalDiagnostics: { timedOut: true },
  });
  assert(
    result.saeStatus !== "RETRIEVAL_TIMEOUT",
    `timedOut=true + candidates>0 → saeStatus is NOT RETRIEVAL_TIMEOUT (got ${result.saeStatus})`
  );
  assert(
    ["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "SOURCE_PARSE_ERROR"].includes(result.saeStatus),
    `timedOut=true + candidates>0 → saeStatus is a valid classification (got ${result.saeStatus})`
  );
});

group("TEST 4 — Retrieval success / no-source contradiction: candidates>0 + timedOut=false → NOT NO_INDEXED_SOURCE", () => {
  // With a properly annotated GOVERNING candidate, must be AUTHORITY_FOUND
  const result = classifySourceAvailability({
    query: "can you tell me cases about VAT credits",
    annotatedCandidates: [governingCandidate()],
    issueClassification: { subIssue: "VAT_CREDIT" },
  });
  assert(
    result.saeStatus !== "NO_INDEXED_SOURCE",
    `GOVERNING candidate + timedOut=false → saeStatus is NOT NO_INDEXED_SOURCE (got ${result.saeStatus})`
  );
  assert(
    result.saeStatus === "AUTHORITY_FOUND",
    `GOVERNING candidate → AUTHORITY_FOUND (got ${result.saeStatus})`
  );
  assert(
    result.eligibleCandidates.length > 0,
    `GOVERNING candidate → eligibleCandidates.length > 0 (got ${result.eligibleCandidates.length})`
  );
});

group("TEST 5 — True timeout: timedOut=true + candidates=0 → RETRIEVAL_TIMEOUT (valid)", () => {
  const result = classifySourceAvailability({
    query: "can you tell me cases about VAT credits",
    annotatedCandidates: [],
    retrievalDiagnostics: { timedOut: true },
  });
  assert(
    result.saeStatus === "RETRIEVAL_TIMEOUT",
    `timedOut=true + zero candidates → RETRIEVAL_TIMEOUT (got ${result.saeStatus})`
  );
});

group("TEST 6 — True no-source: timedOut=false + candidates=0 → NO_INDEXED_SOURCE (valid)", () => {
  const result = classifySourceAvailability({
    query: "can you tell me cases about VAT credits",
    annotatedCandidates: [],
  });
  assert(
    result.saeStatus === "NO_INDEXED_SOURCE",
    `timedOut=false + zero candidates → NO_INDEXED_SOURCE (got ${result.saeStatus})`
  );
});

group("TEST 7 — AUTHORITY_FOUND requires AND-gate; not forced by candidate presence alone", () => {
  // Candidate present but NOT GOVERNING (role=RELATED, not direct-govern) → must NOT be AUTHORITY_FOUND
  const nonGoverningResult = classifySourceAvailability({
    query: "What is the tax on imports?",
    annotatedCandidates: [{ authorityRole: "RELATED", isIndexed: true, isParsed: true }],
    issueClassification: {},
  });
  assert(
    nonGoverningResult.saeStatus !== "AUTHORITY_FOUND",
    `Non-GOVERNING candidate → saeStatus is NOT AUTHORITY_FOUND (got ${nonGoverningResult.saeStatus})`
  );
  assert(
    nonGoverningResult.eligibleCandidates.length === 0,
    `Non-GOVERNING candidate → eligibleCandidates.length === 0`
  );

  // Candidate present but missing directlyGovernsIssue → must NOT be AUTHORITY_FOUND
  const missingDirectGovern = classifySourceAvailability({
    query: "What is the tax on imports?",
    annotatedCandidates: [{
      authorityRole: "GOVERNING",
      directlyGovernsIssue: false,  // fails AND gate
      isIndexed: true,
      isParsed: true,
      higherAuthorityMissing: false,
    }],
    issueClassification: {},
  });
  assert(
    missingDirectGovern.saeStatus !== "AUTHORITY_FOUND",
    `directlyGovernsIssue=false → saeStatus is NOT AUTHORITY_FOUND (got ${missingDirectGovern.saeStatus})`
  );

  // Candidate present but higherAuthorityMissing=true → must NOT be AUTHORITY_FOUND
  const higherMissing = classifySourceAvailability({
    query: "What is the tax on imports?",
    annotatedCandidates: [{
      authorityRole: "GOVERNING",
      directlyGovernsIssue: true,
      isIndexed: true,
      isParsed: true,
      higherAuthorityMissing: true,  // fails AND gate
    }],
    issueClassification: {},
  });
  assert(
    higherMissing.saeStatus !== "AUTHORITY_FOUND",
    `higherAuthorityMissing=true → saeStatus is NOT AUTHORITY_FOUND (got ${higherMissing.saeStatus})`
  );

  // All five AND-gate conditions satisfied → AUTHORITY_FOUND
  const allFivePass = classifySourceAvailability({
    query: "What is VAT?",
    annotatedCandidates: [governingCandidate()],
    issueClassification: { subIssue: "VAT_DEFINITION" },
  });
  assert(
    allFivePass.saeStatus === "AUTHORITY_FOUND",
    `All five AND-gate conditions → AUTHORITY_FOUND (got ${allFivePass.saeStatus})`
  );
});

group("TEST 8 — PATCH_018A_VAT_BRIDGE_SCOPE_PRESERVED: PATCH-018A does not alter step 6.7 gate", () => {
  // The VAT definition bridge in step 6.7 is gated by:
  //   isVatDefinitionQuery(issueClassification) &&
  //   (saeStatus === "NO_INDEXED_SOURCE" || saeStatus === "RELATED_AUTHORITY_ONLY")
  //
  // PATCH-018A did not modify this gate. The following tests verify the gate
  // behaves identically whether PATCH-018A guards are in effect or not.

  // Gate fires for VAT_DEFINITION subIssue + NO_INDEXED_SOURCE
  assert(
    wouldVatBridgeActivate({ subIssue: "VAT_DEFINITION" }, "NO_INDEXED_SOURCE") === true,
    "Bridge gate fires: subIssue=VAT_DEFINITION + NO_INDEXED_SOURCE"
  );
  // Gate fires for VAT_DEFINITION strategy + RELATED_AUTHORITY_ONLY
  assert(
    wouldVatBridgeActivate({ retrievalStrategy: "VAT_DEFINITION_AUTHORITY" }, "RELATED_AUTHORITY_ONLY") === true,
    "Bridge gate fires: retrievalStrategy includes VAT_DEFINITION + RELATED_AUTHORITY_ONLY"
  );
  // Gate does NOT fire for AUTHORITY_FOUND (already resolved)
  assert(
    wouldVatBridgeActivate({ subIssue: "VAT_DEFINITION" }, "AUTHORITY_FOUND") === false,
    "Bridge gate does NOT fire when saeStatus=AUTHORITY_FOUND"
  );
  // Gate does NOT fire for non-VAT_DEFINITION sub-issues
  assert(
    wouldVatBridgeActivate({ subIssue: "EWT" }, "NO_INDEXED_SOURCE") === false,
    "Bridge gate does NOT fire for subIssue=EWT"
  );
  assert(
    wouldVatBridgeActivate({ subIssue: "VAT_CREDIT" }, "NO_INDEXED_SOURCE") === false,
    "Bridge gate does NOT fire for subIssue=VAT_CREDIT (PATCH_018A_VAT_BRIDGE_SCOPE_PRESERVED)"
  );
  assert(
    wouldVatBridgeActivate({ subIssue: "VAT_ZERO_RATED" }, "NO_INDEXED_SOURCE") === false,
    "Bridge gate does NOT fire for subIssue=VAT_ZERO_RATED (PATCH_018A_VAT_BRIDGE_SCOPE_PRESERVED)"
  );
  assert(
    wouldVatBridgeActivate({ subIssue: "CASE_JURISPRUDENCE" }, "RELATED_AUTHORITY_ONLY") === false,
    "Bridge gate does NOT fire for subIssue=CASE_JURISPRUDENCE (PATCH_018A_VAT_BRIDGE_SCOPE_PRESERVED)"
  );

  // PATCH-018A RELATED_AUTHORITY_ONLY downgrade for case queries is a separate path
  // from the VAT definition bridge. The following confirms no cross-activation.
  const vatCreditCaseResult = classifySourceAvailability({
    query: "can you tell me cases about VAT credits",
    annotatedCandidates: [statuteCandidate({ authorityType: "NIRC" })],
    issueClassification: { subIssue: "VAT_CREDIT", primaryIssue: "VAT" },
  });
  assert(
    vatCreditCaseResult.saeStatus === "RELATED_AUTHORITY_ONLY",
    `VAT credits case query → RELATED_AUTHORITY_ONLY via PATCH-018A case path (got ${vatCreditCaseResult.saeStatus})`
  );
  // Critically: the VAT definition bridge (step 6.7) would NOT have applied here
  // because isVatDefinitionQuery({ subIssue: "VAT_CREDIT" }) === false
  assert(
    wouldVatBridgeActivate({ subIssue: "VAT_CREDIT" }, vatCreditCaseResult.saeStatus) === false,
    "After PATCH-018A SAE classification, VAT bridge does NOT activate for VAT credits result"
  );
});

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log(`PATCH-018A Regression: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed tests:");
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log("All tests passed.");
  process.exit(0);
}
