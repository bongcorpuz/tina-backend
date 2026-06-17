/**
 * PATCH-027O Regression Tests
 * Generic EWT acronym guard and fast-prompt rate-seeking discrimination.
 *
 * Validates:
 *   1. EWT acronym broad-definition forms are caught by the broad-guard (no fast-path).
 *   2. patch027oIsEwtRateSeeking correctly classifies rate-seeking vs. definitional.
 *   3. All PATCH-027N regressions remain stable.
 *   4. Specific EWT/WHT queries remain fast-path eligible.
 *
 * Run: node tests/patch-027o-generic-ewt-acronym-guard.test.mjs
 */

import { classify } from "../issue-classification-engine.js";
import {
  classifySourceAvailability,
  patch027nHasSpecificWhtFastPathSignal,
  patch027nIsBroadWithholdingDefinitionQuery,
  patch027oIsEwtRateSeeking
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

// ---------------------------------------------------------------------------
// Group 1: EWT acronym broad-definition forms are blocked from fast-path
// ---------------------------------------------------------------------------
group("EWT acronym broad-definition queries: blocked from WHT fast path", () => {
  const broadEwtForms = [
    "explain EWT",
    "Explain EWT",
    "explain EWT.",
    "what is EWT",
    "what is EWT?",
    "What is EWT?",
    "What is EWT",
    "what is the EWT",
    "what is the EWT?",
    "What is the EWT?",
    "define EWT",
    "Define EWT",
    "define EWT.",
    "explain the EWT",
    "Explain the EWT",
    "explain expanded withholding tax",
    "Explain expanded withholding tax.",
    "what is expanded withholding tax",
    "what is expanded withholding tax?",
    "define expanded withholding tax"
  ];

  for (const query of broadEwtForms) {
    const cls = classify(query);
    assert(
      patch027nIsBroadWithholdingDefinitionQuery(query, cls),
      `"${query}": recognized as broad EWT/WHT definition`
    );
    assert(
      !patch027nHasSpecificWhtFastPathSignal(query, cls),
      `"${query}": no specific WHT fast-path signal`
    );
  }
});

// ---------------------------------------------------------------------------
// Group 2: patch027oIsEwtRateSeeking
// ---------------------------------------------------------------------------
group("patch027oIsEwtRateSeeking: rate-seeking vs. generic discrimination", () => {
  // Not rate-seeking — generic definitional (no rate/payor/service/category signal)
  const notRateSeeking = [
    "explain EWT",
    "what is EWT?",
    "what is the EWT?",
    "define EWT",
    "What is EWT",
    "explain the EWT",
    "explain expanded withholding tax",
    "what is expanded withholding tax?",
    // Authority-lookup without rate/category signal — not rate-seeking
    "What does RR 2-98 provide on expanded withholding tax?"
  ];
  for (const q of notRateSeeking) {
    assert(
      !patch027oIsEwtRateSeeking(q),
      `"${q}": NOT rate-seeking`
    );
  }

  // Rate-seeking — contain rate/category/payor signals
  const rateSeeking = [
    "Is advertising service subject to EWT?",
    "What is the EWT rate for contractors?",
    "Is professional fee subject to EWT?",
    "What percentage of EWT applies to management fees?",
    "Who are the payors subject to EWT under RR 2-98?",
    "What are the applicable EWT rates?",
    "EWT classification of income payments to contractors",
    "Is the payee subject to EWT?",
    "What services are subject to EWT?",
    "Withholding agent obligations under EWT"
  ];
  for (const q of rateSeeking) {
    assert(
      patch027oIsEwtRateSeeking(q),
      `"${q}": IS rate-seeking`
    );
  }
});

// ---------------------------------------------------------------------------
// Group 3: PATCH-027N regressions — original broad WHT forms still blocked
// ---------------------------------------------------------------------------
group("PATCH-027N regression: original broad WHT forms still blocked", () => {
  const broadWhtForms = [
    "What is withholding tax?",
    "Define withholding tax.",
    "Explain withholding tax"
  ];

  for (const query of broadWhtForms) {
    const cls = classify(query);
    assert(
      patch027nIsBroadWithholdingDefinitionQuery(query, cls),
      `"${query}": still recognized as broad WHT definition`
    );
    assert(
      !patch027nHasSpecificWhtFastPathSignal(query, cls),
      `"${query}": still no specific WHT fast-path signal`
    );
  }
});

// ---------------------------------------------------------------------------
// Group 4: Specific EWT/WHT queries remain fast-path eligible
// ---------------------------------------------------------------------------
group("Specific EWT/WHT queries remain fast-path eligible", () => {
  const specificCases = [
    ["Is advertising service subject to EWT?",                 "advertising EWT applicability"],
    ["What does RR 2-98 provide on expanded withholding tax?", "exact RR 2-98 lookup"],
    ["What is the EWT rate for contractors?",                  "contractor EWT rate"],
    ["Is professional fee subject to EWT?",                    "professional fee EWT"]
  ];

  for (const [query, label] of specificCases) {
    const cls = classify(query);
    assert(
      !patch027nIsBroadWithholdingDefinitionQuery(query, cls),
      `${label}: NOT broad definition`
    );
    assert(
      patch027nHasSpecificWhtFastPathSignal(query, cls),
      `${label}: has specific WHT fast-path signal`
    );
  }
});

// ---------------------------------------------------------------------------
// Group 5: Compound EWT phrases that extend beyond the acronym-guard shape
// ---------------------------------------------------------------------------
group("Compound EWT phrases outside guard shape remain specific", () => {
  // These are longer queries that add context beyond "what is / explain / define <ewt>"
  // and should NOT be blocked by the broad guard.
  const compoundCases = [
    "what is EWT and how does it apply",
    "what is EWT in the Philippines and who is covered"
  ];

  for (const query of compoundCases) {
    const cls = classify(query);
    assert(
      !patch027nIsBroadWithholdingDefinitionQuery(query, cls),
      `"${query}": NOT caught by broad guard (compound query)`
    );
  }
});

// ---------------------------------------------------------------------------
// Group 6: SAE behavior for broad EWT definition — RR-only candidate
//          must not emit AUTHORITY_FOUND
// ---------------------------------------------------------------------------
group("SAE: RR-only candidate cannot emit AUTHORITY_FOUND for broad EWT definition", () => {
  const query = "explain EWT";
  const cls = classify(query);

  const rrOnly = classifySourceAvailability({
    query,
    issueClassification: cls,
    annotatedCandidates: [
      governingCandidate({ authorityType: "RR", citation: "RR 2-98", normalizedReference: "RR 2-98" })
    ],
    outcomeCategory: "CANDIDATES_RETURNED"
  });

  assert(
    rrOnly.saeStatus !== "AUTHORITY_FOUND",
    '"explain EWT" + RR-only: saeStatus is not AUTHORITY_FOUND'
  );

  const withStatute = classifySourceAvailability({
    query,
    issueClassification: cls,
    annotatedCandidates: [
      governingCandidate({ authorityType: "STATUTE", citation: "NIRC Sec. 57", normalizedReference: "NIRC Sec. 57" }),
      governingCandidate({ authorityType: "RR",      citation: "RR 2-98",      normalizedReference: "RR 2-98" })
    ],
    outcomeCategory: "CANDIDATES_RETURNED"
  });

  assert(
    withStatute.saeStatus === "AUTHORITY_FOUND",
    '"explain EWT" + statutory candidate: may emit AUTHORITY_FOUND'
  );
});

// ---------------------------------------------------------------------------
// Group 7: Context contamination control — "explain EWT" after an advertising
//          query. Classification-level guard prevents fast-path regardless
//          of prior conversation turn.
// ---------------------------------------------------------------------------
group("Context contamination control: broad EWT guard fires independently of history", () => {
  // Simulate worst-case: the immediately prior query was specific advertising EWT.
  // The guard operates on the current query only and must still block fast-path.
  const priorQuery = "Is advertising service subject to EWT?";
  const currentQuery = "explain EWT";

  const priorCls   = classify(priorQuery);
  const currentCls = classify(currentQuery);

  // Prior query activates fast-path (this is expected)
  assert(
    patch027nHasSpecificWhtFastPathSignal(priorQuery, priorCls),
    `Prior "${priorQuery}": fast-path eligible`
  );

  // Current query must NOT activate fast-path despite having "EWT" in it
  assert(
    patch027nIsBroadWithholdingDefinitionQuery(currentQuery, currentCls),
    `Current "${currentQuery}": recognized as broad EWT definition`
  );
  assert(
    !patch027nHasSpecificWhtFastPathSignal(currentQuery, currentCls),
    `Current "${currentQuery}": no fast-path signal — contamination guard holds`
  );

  // Also confirm rate-seeking is false (compact prompt stays in safe mode)
  assert(
    !patch027oIsEwtRateSeeking(currentQuery),
    `Current "${currentQuery}": NOT rate-seeking — prompt stays general`
  );
});

// ---------------------------------------------------------------------------
// Group 8: "what is EWT?" after "what is EWT?" — repeated definition query
//          guard must be stable (no drift from repetition)
// ---------------------------------------------------------------------------
group("Repeated definition query stability", () => {
  for (let i = 0; i < 3; i++) {
    const query = "what is EWT?";
    const cls = classify(query);
    assert(
      patch027nIsBroadWithholdingDefinitionQuery(query, cls),
      `Pass ${i + 1} — "what is EWT?": broad guard stable`
    );
    assert(
      !patch027nHasSpecificWhtFastPathSignal(query, cls),
      `Pass ${i + 1} — "what is EWT?": no fast-path signal`
    );
  }
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-027O  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const f of failures) console.log(`  - ${f}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
