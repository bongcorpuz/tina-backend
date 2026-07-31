import assert from "node:assert/strict";
import test from "node:test";
import { fourPartDoctrineTest } from "../pipeline.js";
import { classifyConflictState } from "../services/conflict-trust-classifier.js";
import { buildResponseTrust } from "../services/trust-contract.js";

const sameRecordA = {
  source: "authority.pdf",
  path: "authority.pdf",
  normalizedReference: "Section 10",
  authorityType: "STATUTE",
  text: "The same domestic sale is subject to VAT and taxable."
};
const sameRecordB = {
  source: "authority.pdf",
  path: "authority.pdf",
  normalizedReference: "Section 10",
  authorityType: "STATUTE",
  text: "A stated exception treats the same domestic sale as not subject to VAT and VAT-exempt."
};

test("same authority record fragments cannot create two conflict positions", () => {
  assert.equal(fourPartDoctrineTest(sameRecordA, sameRecordB).trueConflict, false);
  assert.equal(fourPartDoctrineTest(sameRecordB, sameRecordA).trueConflict, false);
});

test("distinct authority records preserve same-issue opposite-position conflict", () => {
  const result = fourPartDoctrineTest(
    { ...sameRecordA, source: "position-a.pdf", path: "position-a.pdf" },
    { ...sameRecordB, source: "position-b.pdf", path: "position-b.pdf" }
  );
  assert.equal(result.trueConflict, true);
});

test("same record with structured effectivity positions remains eligible", () => {
  const result = fourPartDoctrineTest(
    {
      ...sameRecordA,
      authorityPositionId: "PRE_AMENDMENT",
      effectiveTo: "2025-06-30"
    },
    {
      ...sameRecordB,
      authorityPositionId: "POST_AMENDMENT",
      effectiveFrom: "2025-07-01"
    }
  );
  assert.equal(result.trueConflict, true);
});

test("same record with structured supersession positions remains eligible", () => {
  const result = fourPartDoctrineTest(
    {
      ...sameRecordA,
      versionId: "VERSION_1",
      supersededBy: "VERSION_2"
    },
    {
      ...sameRecordB,
      versionId: "VERSION_2",
      supersedes: "VERSION_1"
    }
  );
  assert.equal(result.trueConflict, true);
});

test("incomplete genuine conflict remains potential and complete conflict remains verified", () => {
  assert.deepEqual(
    classifyConflictState({
      conflictAnalysis: {
        hasConflict: true,
        trueConflicts: [{ incomplete: true }],
        count: 1
      }
    }),
    { hasConflict: false, conflictState: "POTENTIAL_CONFLICT" }
  );
  assert.deepEqual(
    classifyConflictState({
      conflictAnalysis: {
        hasConflict: true,
        trueConflicts: [{ complete: true }],
        count: 1,
        conflict: true,
        conflictType: "DOCTRINAL_CONFLICT",
        exactIssue: "same transaction",
        exactLegalDimension: "SUBSTANTIVE",
        sameIssueGate: { passed: true },
        oppositeHoldingGate: { passed: true },
        resolutionBasis: "Unresolved positions."
      }
    }),
    { hasConflict: true, conflictState: "VERIFIED_CONFLICT" }
  );
});

test("authority support remains independent and fail-closed", () => {
  const related = buildResponseTrust(
    {
      answer: "An answer without an attestation.",
      conflictAnalysis: { hasConflict: false, trueConflicts: [], count: 0 }
    },
    2,
    "AUTHORITY_FOUND"
  );
  assert.equal(related.conflictState, "NO_CONFLICT");
  assert.equal(related.authoritySupport, "RELATED_AUTHORITY_ONLY");

  const verifiedPotential = buildResponseTrust(
    {
      answer: "A supported proposition.",
      conflictAnalysis: {
        hasConflict: true,
        trueConflicts: [{ incomplete: true }],
        count: 1
      },
      answerSupport: { schemaValid: true, verifiedEligible: true }
    },
    2,
    "AUTHORITY_FOUND"
  );
  assert.equal(verifiedPotential.conflictState, "POTENTIAL_CONFLICT");
  assert.equal(verifiedPotential.authoritySupport, "VERIFIED_CONTROLLING");
});
