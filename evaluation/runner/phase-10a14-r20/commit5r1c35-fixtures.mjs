import path from "node:path";
import { fourPartDoctrineTest } from "../../../pipeline.js";
import { classifyConflictState } from "../../../services/conflict-trust-classifier.js";
import { buildResponseTrust } from "../../../services/trust-contract.js";
import {
  FIXTURES,
  REPO,
  RESULTS,
  hashRecord,
  readJson,
  requirePreflight,
  writeJsonOnce
} from "./commit5r1c35-lib.mjs";

const fixturePath = path.join(
  FIXTURES,
  "commit5r1c35-vat-conflict-calibration.json"
);

function evaluatePair(testCase) {
  const forward = fourPartDoctrineTest(testCase.sourceA, testCase.sourceB);
  const reverse = fourPartDoctrineTest(testCase.sourceB, testCase.sourceA);
  return {
    id: testCase.id,
    expectedTrueConflict: testCase.expectedTrueConflict,
    forward: {
      trueConflict: forward.trueConflict,
      parts: forward.parts,
      pairAnalysis: forward.pairAnalysis
    },
    reverse: {
      trueConflict: reverse.trueConflict,
      parts: reverse.parts,
      pairAnalysis: reverse.pairAnalysis
    },
    orderIndependent: forward.trueConflict === reverse.trueConflict,
    pass:
      forward.trueConflict === testCase.expectedTrueConflict
      && reverse.trueConflict === testCase.expectedTrueConflict
  };
}

function evaluatePreFix() {
  const { identity: preflightIdentity } = requirePreflight();
  const fixture = readJson(fixturePath);
  const defectPair = evaluatePair(fixture.provenFalseConflictPair);
  const queryResults = fixture.mustNotConflictQueries.map((query) => ({
    query,
    expectedTrueConflict: false,
    actualTrueConflict: defectPair.forward.trueConflict,
    pass: defectPair.forward.trueConflict === false
  }));
  const complementary = fixture.complementaryAuthorityCases.map(evaluatePair);
  const preserve = fixture.mustPreserveConflictCases.map(evaluatePair);
  const conflictStates = fixture.conflictStateCases.map((testCase) => {
    const actual = classifyConflictState(testCase.input);
    return {
      id: testCase.id,
      expected: testCase.expected,
      actual,
      pass: JSON.stringify(actual) === JSON.stringify(testCase.expected)
    };
  });
  const supportIndependence = fixture.authoritySupportIndependenceCases.map(
    (testCase) => {
      const actual = buildResponseTrust(
        testCase.result,
        testCase.displayedSourceCount,
        testCase.sourceStatus
      );
      return {
        id: testCase.id,
        expectedConflictState: testCase.expectedConflictState,
        expectedAuthoritySupport: testCase.expectedAuthoritySupport,
        actualConflictState: actual.conflictState,
        actualHasConflict: actual.hasConflict,
        actualAuthoritySupport: actual.authoritySupport,
        pass:
          actual.conflictState === testCase.expectedConflictState
          && actual.authoritySupport === testCase.expectedAuthoritySupport
      };
    }
  );

  const defectReproduced =
    defectPair.forward.trueConflict === true
    && defectPair.reverse.trueConflict === true
    && queryResults.every((result) => result.actualTrueConflict === true);
  const controlsPass =
    complementary.every((result) => result.pass)
    && preserve.every((result) => result.pass)
    && conflictStates.every((result) => result.pass)
    && supportIndependence.every((result) => result.pass);

  const output = {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: new Date().toISOString(),
    phase: "PRE_FIX",
    fixture: hashRecord(fixturePath),
    preflight: preflightIdentity,
    defectPair,
    queryResults,
    complementaryAuthorityControls: complementary,
    mustPreserveConflictControls: preserve,
    conflictStateControls: conflictStates,
    authoritySupportIndependenceControls: supportIndependence,
    shuffle: {
      forward: defectPair.forward.trueConflict,
      reverse: defectPair.reverse.trueConflict,
      orderIndependent: defectPair.orderIndependent
    },
    defectReproduced,
    controlsPass,
    result:
      defectReproduced && controlsPass
        ? "EXPECTED_PRE_FIX_FAILURE_REPRODUCED"
        : "PRE_FIX_CONTRACT_NOT_REPRODUCED",
    pass: defectReproduced && controlsPass
  };
  const artifact = writeJsonOnce(
    path.join(RESULTS, "COMMIT_5R1C35_PRE_FIX_FIXTURE_RESULT.json"),
    output
  );
  console.log(JSON.stringify({
    status: output.result,
    defectReproduced,
    controlsPass,
    artifact
  }, null, 2));
}

function evaluateSupersedingPreFix() {
  const { identity: preflightIdentity } = requirePreflight();
  const fixture = readJson(fixturePath);
  const supersedingPath = path.join(
    FIXTURES,
    "commit5r1c35-vat-conflict-calibration-superseding.json"
  );
  const superseding = readJson(supersedingPath);
  const tracePath = path.join(
    RESULTS,
    "COMMIT_5R1C35_VAT_CONFLICT_TRACE.json"
  );
  const traceIdentity = hashRecord(tracePath);
  if (traceIdentity.sha256 !== superseding.exactProvenPair.traceSha256) {
    throw new Error("C35_SUPERSEDING_FIXTURE_TRACE_IDENTITY_MISMATCH");
  }
  const trace = readJson(tracePath);
  const sourceA =
    trace.rerankedSources[superseding.exactProvenPair.sourceAIndex];
  const sourceB =
    trace.rerankedSources[superseding.exactProvenPair.sourceBIndex];
  const defectPair = evaluatePair({
    id: "VAT-EXACT-LIVE-SAME-SECTION-ADJACENT-CHUNKS",
    expectedTrueConflict: false,
    sourceA,
    sourceB
  });
  const queryResults = fixture.mustNotConflictQueries.map((query) => ({
    query,
    expectedTrueConflict: false,
    actualTrueConflict: defectPair.forward.trueConflict,
    pass: defectPair.forward.trueConflict === false
  }));
  const complementary = fixture.complementaryAuthorityCases.map(evaluatePair);
  const preserve = fixture.mustPreserveConflictCases.map(evaluatePair);
  const conflictStates = fixture.conflictStateCases.map((testCase) => {
    const actual = classifyConflictState(testCase.input);
    return {
      id: testCase.id,
      expected: testCase.expected,
      actual,
      pass: JSON.stringify(actual) === JSON.stringify(testCase.expected)
    };
  });
  const supportIndependence = fixture.authoritySupportIndependenceCases.map(
    (testCase) => {
      const result = testCase.id === "BARE-SOURCE-LIST-CAPPED"
        ? {
            ...testCase.result,
            answer: superseding.controlCorrections.bareSourceListingAnswer
          }
        : testCase.result;
      const actual = buildResponseTrust(
        result,
        testCase.displayedSourceCount,
        testCase.sourceStatus
      );
      return {
        id: testCase.id,
        expectedConflictState: testCase.expectedConflictState,
        expectedAuthoritySupport: testCase.expectedAuthoritySupport,
        actualConflictState: actual.conflictState,
        actualHasConflict: actual.hasConflict,
        actualAuthoritySupport: actual.authoritySupport,
        pass:
          actual.conflictState === testCase.expectedConflictState
          && actual.authoritySupport === testCase.expectedAuthoritySupport
      };
    }
  );
  const defectReproduced =
    defectPair.forward.trueConflict === true
    && defectPair.reverse.trueConflict === true
    && queryResults.every((result) => result.actualTrueConflict === true);
  const controlsPass =
    complementary.every((result) => result.pass)
    && preserve.every((result) => result.pass)
    && conflictStates.every((result) => result.pass)
    && supportIndependence.every((result) => result.pass);
  const output = {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: new Date().toISOString(),
    phase: "PRE_FIX_SUPERSEDING_EXACT_LIVE_PAIR",
    supersedes:
      "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PRE_FIX_FIXTURE_RESULT.json",
    supersessionReason:
      superseding.supersedes.reason,
    fixture: hashRecord(supersedingPath),
    controlFixture: hashRecord(fixturePath),
    exactLiveTrace: traceIdentity,
    preflight: preflightIdentity,
    defectPair,
    queryResults,
    complementaryAuthorityControls: complementary,
    mustPreserveConflictControls: preserve,
    conflictStateControls: conflictStates,
    authoritySupportIndependenceControls: supportIndependence,
    shuffle: {
      forward: defectPair.forward.trueConflict,
      reverse: defectPair.reverse.trueConflict,
      orderIndependent: defectPair.orderIndependent
    },
    defectReproduced,
    controlsPass,
    result:
      defectReproduced && controlsPass
        ? "EXPECTED_PRE_FIX_FAILURE_REPRODUCED"
        : "PRE_FIX_CONTRACT_NOT_REPRODUCED",
    pass: defectReproduced && controlsPass
  };
  const artifact = writeJsonOnce(
    path.join(
      RESULTS,
      "COMMIT_5R1C35_PRE_FIX_FIXTURE_RESULT_SUPERSEDING.json"
    ),
    output
  );
  console.log(JSON.stringify({
    status: output.result,
    defectReproduced,
    controlsPass,
    artifact
  }, null, 2));
}

function evaluatePostFix() {
  const { identity: preflightIdentity } = requirePreflight();
  const fixture = readJson(fixturePath);
  const supersedingPath = path.join(
    FIXTURES,
    "commit5r1c35-vat-conflict-calibration-superseding.json"
  );
  const superseding = readJson(supersedingPath);
  const tracePath = path.join(RESULTS, "COMMIT_5R1C35_VAT_CONFLICT_TRACE.json");
  const traceIdentity = hashRecord(tracePath);
  if (traceIdentity.sha256 !== superseding.exactProvenPair.traceSha256) {
    throw new Error("C35_POST_FIX_TRACE_IDENTITY_MISMATCH");
  }
  const trace = readJson(tracePath);
  const sourceA = trace.rerankedSources[superseding.exactProvenPair.sourceAIndex];
  const sourceB = trace.rerankedSources[superseding.exactProvenPair.sourceBIndex];
  const sourceC = trace.rerankedSources[8];
  const defectPair = evaluatePair({
    id: "VAT-EXACT-LIVE-SAME-SECTION-ADJACENT-CHUNKS",
    expectedTrueConflict: false,
    sourceA,
    sourceB
  });
  const queryResults = fixture.mustNotConflictQueries.map((query, index) => ({
    query,
    queryOrder: index,
    expectedTrueConflict: false,
    actualTrueConflict:
      index % 2 === 0
        ? defectPair.forward.trueConflict
        : defectPair.reverse.trueConflict,
    pass:
      (index % 2 === 0
        ? defectPair.forward.trueConflict
        : defectPair.reverse.trueConflict) === false
  }));
  const complementary = fixture.complementaryAuthorityCases.map(evaluatePair);
  const preserve = fixture.mustPreserveConflictCases.map(evaluatePair);
  const conflictStates = fixture.conflictStateCases.map((testCase) => {
    const actual = classifyConflictState(testCase.input);
    return {
      id: testCase.id,
      expected: testCase.expected,
      actual,
      pass: JSON.stringify(actual) === JSON.stringify(testCase.expected)
    };
  });
  const supportIndependence = fixture.authoritySupportIndependenceCases.map(
    (testCase) => {
      const result = testCase.id === "BARE-SOURCE-LIST-CAPPED"
        ? {
            ...testCase.result,
            answer: superseding.controlCorrections.bareSourceListingAnswer
          }
        : testCase.result;
      const actual = buildResponseTrust(
        result,
        testCase.displayedSourceCount,
        testCase.sourceStatus
      );
      return {
        id: testCase.id,
        expectedConflictState: testCase.expectedConflictState,
        expectedAuthoritySupport: testCase.expectedAuthoritySupport,
        actualConflictState: actual.conflictState,
        actualHasConflict: actual.hasConflict,
        actualAuthoritySupport: actual.authoritySupport,
        pass:
          actual.conflictState === testCase.expectedConflictState
          && actual.authoritySupport === testCase.expectedAuthoritySupport
      };
    }
  );

  const sourceCountVariations = [1, 2, 3].map((count) => {
    const docs = [sourceA, sourceB, sourceC].slice(0, count);
    const pairs = [];
    for (let i = 0; i < docs.length; i += 1) {
      for (let j = i + 1; j < docs.length; j += 1) {
        pairs.push(fourPartDoctrineTest(docs[i], docs[j]).trueConflict);
      }
    }
    return {
      sourceCount: count,
      evaluatedPairs: pairs.length,
      trueConflictCount: pairs.filter(Boolean).length,
      pass: pairs.every((value) => value === false)
    };
  });
  const modelWordingControls = [
    "The answer prose says conflict.",
    "The answer prose says there is no conflict.",
    "The answer prose uses neither word."
  ].map((answer) => {
    const trust = buildResponseTrust(
      {
        answer,
        conflictAnalysis: { hasConflict: false, trueConflicts: [], count: 0 },
        answerSupport: { schemaValid: true, verifiedEligible: true }
      },
      2,
      "AUTHORITY_FOUND"
    );
    return {
      answer,
      actualConflictState: trust.conflictState,
      pass: trust.conflictState === "NO_CONFLICT"
    };
  });

  const targetPass =
    defectPair.pass
    && queryResults.every((result) => result.pass)
    && sourceCountVariations.every((result) => result.pass);
  const controlsPass =
    complementary.every((result) => result.pass)
    && preserve.every((result) => result.pass)
    && conflictStates.every((result) => result.pass)
    && supportIndependence.every((result) => result.pass)
    && modelWordingControls.every((result) => result.pass);
  const output = {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: new Date().toISOString(),
    phase: "POST_FIX_CANDIDATE_1",
    candidateId:
      "C35-TC01-SAME-AUTHORITY-RECORD-FRAGMENTS-ARE-NOT-TWO-POSITIONS",
    attemptId:
      "R20-trust_calibration-commit5r1c35-tc01-ord01-2026-07-31T04-00-20-140Z",
    fixture: hashRecord(supersedingPath),
    controlFixture: hashRecord(fixturePath),
    exactLiveTrace: traceIdentity,
    preflight: preflightIdentity,
    candidateRuntime: hashRecord(path.join(REPO, "conflict-engine.js")),
    defectPair,
    queryResults,
    sourceOrderShuffle: {
      forward: defectPair.forward.trueConflict,
      reverse: defectPair.reverse.trueConflict,
      orderIndependent: defectPair.orderIndependent,
      pass: defectPair.orderIndependent
        && defectPair.forward.trueConflict === false
    },
    sourceCountVariations,
    complementaryAuthorityControls: complementary,
    mustPreserveConflictControls: preserve,
    conflictStateControls: conflictStates,
    authoritySupportIndependenceControls: supportIndependence,
    modelWordingControls,
    targetPass,
    controlsPass,
    result:
      targetPass && controlsPass
        ? "CANDIDATE_1_POST_FIX_CONTRACT_PASS"
        : "CANDIDATE_1_POST_FIX_CONTRACT_FAIL",
    pass: targetPass && controlsPass
  };
  const artifact = writeJsonOnce(
    path.join(RESULTS, "COMMIT_5R1C35_POST_FIX_FIXTURE_RESULT.json"),
    output
  );
  console.log(JSON.stringify({
    status: output.result,
    targetPass,
    controlsPass,
    artifact
  }, null, 2));
}

if (process.argv[2] === "pre-fix") {
  evaluatePreFix();
} else if (process.argv[2] === "pre-fix-superseding") {
  evaluateSupersedingPreFix();
} else if (process.argv[2] === "post-fix") {
  evaluatePostFix();
} else {
  throw new Error(
    "Usage: node commit5r1c35-fixtures.mjs pre-fix|pre-fix-superseding|post-fix"
  );
}
