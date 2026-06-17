/**
 * PATCH-027N Regression Tests
 * WHT fast-path narrowing and jurisprudence SAE guard.
 *
 * Run: node tests/patch-027n-wht-jurisprudence-sae-guard.test.mjs
 */

import { classify } from "../issue-classification-engine.js";
import {
  classifySourceAvailability,
  patch027nHasSpecificWhtFastPathSignal,
  patch027nIsBroadWithholdingDefinitionQuery
} from "../pipeline.js";

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
  console.log(`\n-- ${name}`);
  fn();
}

function governingCandidate(overrides = {}) {
  return {
    authorityRole: "GOVERNING",
    directlyGovernsIssue: true,
    isIndexed: true,
    isParsed: true,
    higherAuthorityMissing: false,
    exactAuthorityMatch: true,
    targetAuthorityMatch: true,
    authorityType: "RR",
    citation: "RR 2-98",
    normalizedReference: "RR 2-98",
    parseStatus: "success",
    ...overrides
  };
}

function relatedCandidate(overrides = {}) {
  return {
    authorityRole: "RELATED",
    directlyGovernsIssue: false,
    isIndexed: true,
    isParsed: true,
    higherAuthorityMissing: false,
    exactAuthorityMatch: true,
    targetAuthorityMatch: false,
    authorityType: "CASE",
    citation: "CTA Case No. 9711",
    normalizedReference: "CTA Case No. 9711",
    parseStatus: "success",
    issueClassificationMatch: { issueOverlap: true },
    ...overrides
  };
}

group("Generic withholding: broad definitions do not activate WHT fast path", () => {
  const broadQueries = [
    "What is withholding tax?",
    "Define withholding tax.",
    "Explain withholding tax."
  ];

  for (const query of broadQueries) {
    const cls = classify(query);
    assert(
      patch027nIsBroadWithholdingDefinitionQuery(query, cls),
      `${query}: recognized as broad WHT definition`
    );
    assert(
      !patch027nHasSpecificWhtFastPathSignal(query, cls),
      `${query}: no specific WHT fast-path signal`
    );
  }

  const cls = classify("What is withholding tax?");
  const rrOnly = classifySourceAvailability({
    query: "What is withholding tax?",
    issueClassification: cls,
    annotatedCandidates: [
      governingCandidate({ authorityType: "RR", citation: "RR 2-98", normalizedReference: "RR 2-98" })
    ],
    outcomeCategory: "CANDIDATES_RETURNED"
  });
  assert(
    rrOnly.saeStatus !== "AUTHORITY_FOUND",
    "broad WHT definition: RR-only candidate cannot emit AUTHORITY_FOUND"
  );
  assert(
    rrOnly.saeStatus === "RELATED_AUTHORITY_ONLY",
    "broad WHT definition: RR-only candidate downgrades to RELATED_AUTHORITY_ONLY"
  );

  const withStatute = classifySourceAvailability({
    query: "What is withholding tax?",
    issueClassification: cls,
    annotatedCandidates: [
      governingCandidate({ authorityType: "STATUTE", citation: "NIRC Sec. 57", normalizedReference: "NIRC Sec. 57" }),
      governingCandidate({ authorityType: "RR", citation: "RR 2-98", normalizedReference: "RR 2-98" })
    ],
    outcomeCategory: "CANDIDATES_RETURNED"
  });
  assert(
    withStatute.saeStatus === "AUTHORITY_FOUND",
    "broad WHT definition: statutory governing candidate may emit AUTHORITY_FOUND"
  );
});

group("Specific WHT/EWT queries remain fast-path eligible", () => {
  const ewtSpecific = classify("Is advertising service subject to EWT?");
  assert(
    patch027nHasSpecificWhtFastPathSignal("Is advertising service subject to EWT?", ewtSpecific),
    "advertising EWT applicability remains fast-path eligible"
  );

  const rr298 = classify("What does RR 2-98 provide on expanded withholding tax?");
  assert(
    patch027nHasSpecificWhtFastPathSignal("What does RR 2-98 provide on expanded withholding tax?", rr298),
    "exact RR 2-98 lookup remains fast-path eligible"
  );
});

group("Jurisprudence SAE guard blocks RR-only AUTHORITY_FOUND", () => {
  const cls = classify("Are there jurisprudence cases on withholding tax?");
  assert(cls.isJurisprudenceQuery === true, "case-law guard classification is active");
  assert(cls.requiresJurisprudence === true, "requiresJurisprudence is active");
  assert(
    cls.downstreamRouting?.useJurisprudenceEngine === true,
    "jurisprudence engine routing remains active"
  );

  const rrOnly = classifySourceAvailability({
    query: "Are there jurisprudence cases on withholding tax?",
    issueClassification: cls,
    annotatedCandidates: [
      governingCandidate({ authorityType: "RR", citation: "RR 2-98", normalizedReference: "RR 2-98" })
    ],
    outcomeCategory: "CANDIDATES_RETURNED"
  });
  assert(
    rrOnly.saeStatus !== "AUTHORITY_FOUND",
    "jurisprudence query: RR-only governing candidate cannot emit AUTHORITY_FOUND"
  );
  assert(
    rrOnly.saeStatus === "RELATED_AUTHORITY_ONLY",
    "jurisprudence query: RR-only governing evidence downgrades to RELATED_AUTHORITY_ONLY"
  );

  const withCourtEligible = classifySourceAvailability({
    query: "Are there jurisprudence cases on withholding tax?",
    issueClassification: cls,
    annotatedCandidates: [
      governingCandidate({ authorityType: "CASE", citation: "CTA Case No. 9711", normalizedReference: "CTA Case No. 9711" }),
      governingCandidate({ authorityType: "RR", citation: "RR 2-98", normalizedReference: "RR 2-98" })
    ],
    outcomeCategory: "CANDIDATES_RETURNED"
  });
  assert(
    withCourtEligible.saeStatus === "AUTHORITY_FOUND",
    "jurisprudence query: court governing candidate may emit AUTHORITY_FOUND"
  );

  const withRecoveredRelatedCase = classifySourceAvailability({
    query: "Are there jurisprudence cases on withholding tax?",
    issueClassification: cls,
    annotatedCandidates: [
      relatedCandidate(),
      governingCandidate({ authorityType: "RR", citation: "RR 2-98", normalizedReference: "RR 2-98" })
    ],
    outcomeCategory: "CANDIDATES_RETURNED"
  });
  assert(
    withRecoveredRelatedCase.saeStatus === "RELATED_AUTHORITY_ONLY",
    "jurisprudence query: recovered related CTA case prevents RR-only AUTHORITY_FOUND"
  );
});

group("Exact administrative authority positives remain in controlling plan", () => {
  const positives = [
    ["What does RR 12-2018 provide on estate tax?", "RR No. 12-2018"],
    ["What is RMC 65-2012?", "RMC No. 65-2012"],
    ["What is RMO 20-2013?", "RMO No. 20-2013"],
    ["What is RMO 24-2013?", "RMO No. 24-2013"]
  ];

  for (const [query, expected] of positives) {
    const cls = classify(query);
    assert(
      cls.controllingAuthorities.includes(expected),
      `${query}: ${expected} remains controlling`
    );
  }
});

group("Domain regression classifications remain stable", () => {
  const controls = [
    ["What is VAT?", "VAT_LIABILITY"],
    ["What is estate tax?", "EST"],
    ["What is donor's tax?", "EST"],
    ["What is excise tax?", "EXC"]
  ];

  for (const [query, expectedPrimary] of controls) {
    const cls = classify(query);
    assert(
      cls.primaryIssue === expectedPrimary || cls.primaryDomain === expectedPrimary || cls.domainCode === expectedPrimary,
      `${query}: classified as ${expectedPrimary}`
    );
  }
});

console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-027N  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const f of failures) console.log(`  - ${f}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
