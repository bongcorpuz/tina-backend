/**
 * PATCH-06E-005 Tests
 * Reranker issue-signal helper extraction.
 *
 * Run: node tests/patch-06e-005-reranker-issue-signals-extraction.test.mjs
 */

import assert from "node:assert/strict";

import {
  ISSUE_TYPE,
  detectIssueTypes,
  issueMismatch,
  issueOverlap,
  normalizeDomain,
  normalizeIssue
} from "../reranker-issue-signals.js";
import {
  ISSUE_TYPE as RERANKER_ISSUE_TYPE,
  computeTinaRerankScore,
  detectIssueTypes as rerankerDetectIssueTypes,
  extractIssueClassification,
  rerankForTina
} from "../reranker-engine.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
  }
}

function doc(overrides = {}) {
  return {
    id: overrides.id || "doc-1",
    text: overrides.text || "NIRC Sec. 57 withholding tax and expanded withholding tax rules",
    title: overrides.title || "NIRC Sec. 57",
    normalized_reference: overrides.normalized_reference || "NIRC Sec. 57",
    authorityType: overrides.authorityType || "STATUTE",
    similarity: overrides.similarity ?? 0.8,
    metadata: {
      authorityType: overrides.authorityType || "STATUTE",
      normalizedReference: overrides.normalized_reference || "NIRC Sec. 57",
      ...(overrides.metadata || {})
    }
  };
}

test("issue constants and detector remain available through reranker exports", () => {
  assert.equal(RERANKER_ISSUE_TYPE, ISSUE_TYPE);
  assert.deepEqual(rerankerDetectIssueTypes("What does RR 2-98 provide on expanded withholding tax?"), [
    ISSUE_TYPE.WITHHOLDING,
    ISSUE_TYPE.ISSUANCE
  ]);
  assert.deepEqual(detectIssueTypes("What is CTA Case No. 9369?"), [
    ISSUE_TYPE.JURISDICTIONAL,
    ISSUE_TYPE.CASE_LAW
  ]);
  assert.deepEqual(detectIssueTypes("Plain background context"), [ISSUE_TYPE.GENERAL]);
});

test("issue and domain normalizers preserve aliases", () => {
  assert.equal(normalizeIssue("VAT"), ISSUE_TYPE.VAT_LIABILITY);
  assert.equal(normalizeIssue("EWT"), ISSUE_TYPE.WITHHOLDING);
  assert.equal(normalizeIssue("principal vs agent"), ISSUE_TYPE.PRINCIPAL_AGENT);
  assert.equal(normalizeIssue("custom issue"), "CUSTOM_ISSUE");
  assert.equal(normalizeIssue(""), null);

  assert.equal(normalizeDomain("value added tax"), "VAT");
  assert.equal(normalizeDomain("withholding tax"), "WHT");
  assert.equal(normalizeDomain("local tax"), "LGT");
  assert.equal(normalizeDomain("custom domain"), "CUSTOM_DOMAIN");
  assert.equal(normalizeDomain(""), null);
});

test("overlap and mismatch helpers preserve reranker issue semantics", () => {
  assert.equal(issueOverlap([ISSUE_TYPE.GENERAL], [ISSUE_TYPE.VAT_REFUND]), true);
  assert.equal(issueOverlap([ISSUE_TYPE.WITHHOLDING], [ISSUE_TYPE.WITHHOLDING, ISSUE_TYPE.ISSUANCE]), true);
  assert.equal(issueOverlap([ISSUE_TYPE.WITHHOLDING], [ISSUE_TYPE.VAT_REFUND]), false);

  assert.equal(issueMismatch([ISSUE_TYPE.WITHHOLDING], [ISSUE_TYPE.VAT_REFUND]), true);
  assert.equal(issueMismatch([ISSUE_TYPE.VAT_REFUND], [ISSUE_TYPE.VAT_LIABILITY]), true);
  assert.equal(issueMismatch([ISSUE_TYPE.WITHHOLDING], [ISSUE_TYPE.WITHHOLDING]), false);
});

test("extractIssueClassification continues using extracted signals", () => {
  const classification = extractIssueClassification({
    query: "What does RR 2-98 provide on expanded withholding tax?",
    issueClassification: {
      primaryDomain: "WITHHOLDING_TAX",
      primaryIssue: "EWT",
      targetAuthorities: ["RR 2-98"]
    }
  });

  assert.equal(classification.primaryDomain, "WHT");
  assert.equal(classification.primaryIssue, ISSUE_TYPE.WITHHOLDING);
  assert(classification.subIssues.includes(ISSUE_TYPE.WITHHOLDING));
  assert(classification.targetAuthorities.includes("RR_2_98"));
  assert(classification.targetAuthorities.includes("STATUTE"));
  assert(classification.targetAuthorities.includes("RR"));
});

test("reranker score and ordering remain issue-signal aware", () => {
  const query = "What is withholding tax?";
  const withholdingDoc = doc({
    id: "withholding",
    text: "NIRC Sec. 57 withholding tax and expanded withholding tax statutory rules",
    normalized_reference: "NIRC Sec. 57"
  });
  const vatRefundDoc = doc({
    id: "vat-refund",
    text: "VAT refund input VAT tax credit certificate judicial claim",
    normalized_reference: "NIRC Sec. 112"
  });

  const withholdingScore = computeTinaRerankScore({ query, doc: withholdingDoc });
  const vatRefundScore = computeTinaRerankScore({ query, doc: vatRefundDoc });
  assert(withholdingScore > vatRefundScore);

  const reranked = rerankForTina({
    query,
    docs: [vatRefundDoc, withholdingDoc],
    limit: 2,
    suppressIssueMismatch: false
  }).results;

  assert.equal(reranked[0].id, "withholding");
  assert.equal(reranked.find((item) => item.id === "vat-refund")?.issueMismatch, true);
});

console.log(`\nPATCH-06E-005 reranker issue-signal extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
