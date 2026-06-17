/**
 * PATCH-027J-R1 Regression Tests
 * Exact administrative authority matches become GOVERNING only when the
 * planned controlling authority and retrieved document share the same
 * canonical RR/RMC/RMO/RAMO key.
 *
 * Run: node tests/patch-027j-r1-exact-admin-authority-governing.test.mjs
 */

import { classify } from "../issue-classification-engine.js";
import { buildAuthorityAnnotation } from "../authority-utils.js";

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

function issueMatchFor(cls, overrides = {}) {
  return {
    targetAuthorities: cls.targetAuthorities || [],
    controllingAuthorities: cls.controllingAuthorities || [],
    supportingAuthorities: cls.supportingAuthorities || [],
    supportingJurisprudence: cls.supportingJurisprudence || [],
    targetAuthorityGroups: cls.targetAuthorityGroups || null,
    authorityMatchTier: 3,
    exactAuthorityMatch: true,
    targetAuthorityMatch: true,
    retrievalLayer: "LAYER_1_EXACT_NORMALIZED_AUTHORITY",
    ...overrides
  };
}

function adminDoc({
  type,
  normalizedReference,
  citation,
  title,
  text,
  cls,
  tier = 3,
  layer = "LAYER_1_EXACT_NORMALIZED_AUTHORITY",
  exactAuthorityMatch = true,
  targetAuthorityMatch = true,
  isIndexed = true,
  parseStatus = "success"
}) {
  const match = issueMatchFor(cls, {
    authorityMatchTier: tier,
    exactAuthorityMatch,
    targetAuthorityMatch,
    retrievalLayer: layer
  });

  return {
    authorityType: type,
    normalizedReference,
    normalized_reference: normalizedReference,
    normalizedAliases: [citation, title],
    citation,
    title,
    document_title: title,
    source: `${citation}.pdf`,
    text: text || `${title} (${citation}) is the exact administrative authority requested in this query.`,
    isIndexed,
    parseStatus,
    issueClassificationMatch: match,
    authorityMatchTier: tier,
    retrievalLayer: layer,
    exactAuthorityMatch,
    targetAuthorityMatch
  };
}

function annotationFor(query, docOptions) {
  const cls = classify(query);
  const doc = adminDoc({ cls, ...docOptions });
  return {
    cls,
    doc,
    annotation: buildAuthorityAnnotation(doc, { issueClassification: cls })
  };
}

group("Exact RR/RMC/RMO lookup candidates become GOVERNING", () => {
  const cases = [
    {
      query: "Explain RR 2-98",
      type: "RR",
      normalizedReference: "RR_2_1998",
      citation: "RR 2-98",
      title: "Revenue Regulations No. 2-98",
      tier: 3
    },
    {
      query: "Explain RR 12-2018",
      type: "RR",
      normalizedReference: "RR_12_2018",
      citation: "RR 12-2018",
      title: "Revenue Regulations No. 12-2018",
      tier: 3
    },
    {
      query: "Explain RMC 65-2012",
      type: "RMC",
      normalizedReference: "RMC_65_2012",
      citation: "RMC 65-2012",
      title: "Revenue Memorandum Circular No. 65-2012",
      tier: 3
    },
    {
      query: "What is RMO 20-2013?",
      type: "RMO",
      normalizedReference: "RMO_20_2013",
      citation: "RMO 20-2013",
      title: "Revenue Memorandum Order No. 20-2013",
      tier: 4
    },
    {
      query: "Explain RMO 24-2013",
      type: "RMO",
      normalizedReference: "RMO_24_2013",
      citation: "RMO 24-2013",
      title: "Revenue Memorandum Order No. 24-2013",
      tier: 4
    }
  ];

  for (const tc of cases) {
    const { cls, annotation } = annotationFor(tc.query, tc);
    assert(cls.controllingAuthorities.includes(cls.exactAuthority.reference), `${tc.query}: exact authority is controlling`);
    assert(annotation.directlyGovernsIssue === true, `${tc.query}: directlyGovernsIssue=true`);
    assert(annotation.authorityRole === "GOVERNING", `${tc.query}: authorityRole=GOVERNING`);
    assert(annotation.isGoverning === true, `${tc.query}: isGoverning=true`);
    assert(annotation.higherAuthorityMissing === false, `${tc.query}: higherAuthorityMissing=false`);
  }
});

group("Canonical key intersection handles common metadata shapes", () => {
  const cls = classify("Explain RR 12-2018");
  const variants = [
    { normalizedReference: "RR_12_2018", citation: "Revenue Regulations No. 12-2018" },
    { normalizedReference: "", citation: "RR No. 12-2018" },
    { normalizedReference: "", citation: "Administrative source", title: "Revenue Regulations No. 12-2018", displayLabel: "RR No. 12-2018" }
  ];

  for (const [index, variant] of variants.entries()) {
    const doc = adminDoc({
      cls,
      type: "RR",
      normalizedReference: variant.normalizedReference,
      citation: variant.citation,
      title: variant.title || "Revenue Regulations No. 12-2018",
      tier: 3
    });
    if (variant.displayLabel) doc.displayLabel = variant.displayLabel;
    const annotation = buildAuthorityAnnotation(doc, { issueClassification: cls });
    assert(annotation.authorityRole === "GOVERNING", `RR 12-2018 metadata variant ${index + 1}: GOVERNING`);
  }
});

group("RAMO exact administrative authority branch is covered", () => {
  const ramoCls = {
    targetAuthorities: ["RAMO No. 1-2020"],
    controllingAuthorities: ["RAMO No. 1-2020"],
    supportingAuthorities: [],
    supportingJurisprudence: [],
    targetAuthorityGroups: {
      controllingAuthorities: ["RAMO No. 1-2020"],
      supportingAuthorities: [],
      supportingJurisprudence: []
    }
  };

  const matchingRamo = adminDoc({
    cls: ramoCls,
    type: "RAMO",
    normalizedReference: "RAMO_1_2020",
    citation: "RAMO 1-2020",
    title: "Revenue Audit Memorandum Order No. 1-2020",
    tier: 4
  });
  const matchingAnnotation = buildAuthorityAnnotation(matchingRamo, { issueClassification: ramoCls });
  assert(matchingAnnotation.authorityRole === "GOVERNING", "matching exact RAMO is GOVERNING");

  const mismatchedRamo = adminDoc({
    cls: ramoCls,
    type: "RAMO",
    normalizedReference: "RAMO_2_2020",
    citation: "RAMO 2-2020",
    title: "Revenue Audit Memorandum Order No. 2-2020",
    tier: 4
  });
  const mismatchedAnnotation = buildAuthorityAnnotation(mismatchedRamo, { issueClassification: ramoCls });
  assert(mismatchedAnnotation.authorityRole !== "GOVERNING", "mismatched RAMO is not GOVERNING");
});

group("Wrong or non-controlling administrative documents do not become GOVERNING", () => {
  const cls = classify("Explain RR 12-2018");
  const wrongDoc = adminDoc({
    cls,
    type: "RR",
    normalizedReference: "RR_11_2018",
    citation: "RR 11-2018",
    title: "Revenue Regulations No. 11-2018",
    tier: 3
  });
  const wrongAnnotation = buildAuthorityAnnotation(wrongDoc, { issueClassification: cls });
  assert(wrongAnnotation.authorityRole !== "GOVERNING", "wrong RR number is not GOVERNING");
  assert(wrongAnnotation.directlyGovernsIssue === false, "wrong RR number directlyGovernsIssue=false");

  const nonLookupCls = classify("How does RMO 20-2013 affect an LOA audit?");
  const nonLookupDoc = adminDoc({
    cls: nonLookupCls,
    type: "RMO",
    normalizedReference: "RMO_20_2013",
    citation: "RMO 20-2013",
    title: "Revenue Memorandum Order No. 20-2013",
    tier: 4
  });
  const nonLookupAnnotation = buildAuthorityAnnotation(nonLookupDoc, { issueClassification: nonLookupCls });
  assert(!nonLookupCls.controllingAuthorities.includes("RMO No. 20-2013"), "non-lookup RMO is not in controllingAuthorities");
  assert(nonLookupAnnotation.authorityRole !== "GOVERNING", "non-lookup RMO reference is not GOVERNING through 027J");

  const genericCls = {
    targetAuthorities: ["Applicable Revenue Regulations / BIR issuances"],
    controllingAuthorities: ["Applicable NIRC / primary statute provisions"],
    supportingAuthorities: ["Applicable Revenue Regulations / BIR issuances"],
    supportingJurisprudence: []
  };
  const genericDoc = adminDoc({
    cls: genericCls,
    type: "RR",
    normalizedReference: "RR_12_2018",
    citation: "RR 12-2018",
    title: "Revenue Regulations No. 12-2018",
    tier: 3
  });
  const genericAnnotation = buildAuthorityAnnotation(genericDoc, { issueClassification: genericCls });
  assert(genericAnnotation.authorityRole !== "GOVERNING", "generic BIR issuance plan does not promote RR");
});

group("Exact administrative branch rejects unsafe edge paths", () => {
  const cls = classify("Explain RR 12-2018");

  const targetOnlyDoc = adminDoc({
    cls,
    type: "RR",
    normalizedReference: "RR_12_2018",
    citation: "RR 12-2018",
    title: "Revenue Regulations No. 12-2018",
    tier: 3,
    layer: "SEMANTIC_VECTOR_SEARCH",
    exactAuthorityMatch: false,
    targetAuthorityMatch: true
  });
  const targetOnlyAnnotation = buildAuthorityAnnotation(targetOnlyDoc, { issueClassification: cls });
  assert(targetOnlyAnnotation.authorityRole !== "GOVERNING", "targetAuthorityMatch-only candidate is not GOVERNING");

  const contaminatedDoc = adminDoc({
    cls,
    type: "RR",
    normalizedReference: "RR_11_2018",
    citation: "RR 11-2018",
    title: "Revenue Regulations No. 11-2018",
    tier: 3
  });
  contaminatedDoc.normalizedAliases = ["RR 11-2018"];
  contaminatedDoc.displayLabel = "RR No. 11-2018";
  contaminatedDoc.source = "02_revenue_regulations/RR No. 12-2018.pdf";
  contaminatedDoc.path = "indexed/contaminated/RR No. 12-2018.pdf";
  contaminatedDoc.metadata = { path: "metadata/RR No. 12-2018.pdf" };
  const contaminatedAnnotation = buildAuthorityAnnotation(contaminatedDoc, { issueClassification: cls });
  assert(contaminatedAnnotation.authorityRole !== "GOVERNING", "path/title/source-only contamination is not GOVERNING");

  const unindexedDoc = adminDoc({
    cls,
    type: "RR",
    normalizedReference: "RR_12_2018",
    citation: "RR 12-2018",
    title: "Revenue Regulations No. 12-2018",
    tier: 3,
    isIndexed: false
  });
  const unindexedAnnotation = buildAuthorityAnnotation(unindexedDoc, { issueClassification: cls });
  assert(unindexedAnnotation.authorityRole !== "GOVERNING", "unindexed exact candidate is not GOVERNING");
  assert(unindexedAnnotation.isGoverning === false, "unindexed exact candidate isGoverning=false");

  const parseFailedDoc = adminDoc({
    cls,
    type: "RR",
    normalizedReference: "RR_12_2018",
    citation: "RR 12-2018",
    title: "Revenue Regulations No. 12-2018",
    tier: 3,
    parseStatus: "failed"
  });
  const parseFailedAnnotation = buildAuthorityAnnotation(parseFailedDoc, { issueClassification: cls });
  assert(parseFailedAnnotation.authorityRole !== "GOVERNING", "parse-failed exact candidate is not GOVERNING");
  assert(parseFailedAnnotation.isGoverning === false, "parse-failed exact candidate isGoverning=false");

  const supportingOnlyCls = {
    targetAuthorities: ["RR No. 12-2018"],
    controllingAuthorities: ["Applicable NIRC / primary statute provisions"],
    supportingAuthorities: ["RR No. 12-2018"],
    supportingJurisprudence: [],
    targetAuthorityGroups: {
      controllingAuthorities: ["Applicable NIRC / primary statute provisions"],
      supportingAuthorities: ["RR No. 12-2018"],
      supportingJurisprudence: []
    }
  };
  const supportingOnlyDoc = adminDoc({
    cls: supportingOnlyCls,
    type: "RR",
    normalizedReference: "RR_12_2018",
    citation: "RR 12-2018",
    title: "Revenue Regulations No. 12-2018",
    tier: 3
  });
  const supportingOnlyAnnotation = buildAuthorityAnnotation(supportingOnlyDoc, { issueClassification: supportingOnlyCls });
  assert(supportingOnlyAnnotation.authorityRole !== "GOVERNING", "supportingAuthorities-only exact authority is not GOVERNING");

  const rulingCls = {
    targetAuthorities: ["BIR Ruling No. 123-2020", "RR No. 12-2018"],
    controllingAuthorities: ["BIR Ruling No. 123-2020"],
    supportingAuthorities: ["RR No. 12-2018"],
    supportingJurisprudence: [],
    targetAuthorityGroups: {
      controllingAuthorities: ["BIR Ruling No. 123-2020"],
      supportingAuthorities: ["RR No. 12-2018"],
      supportingJurisprudence: []
    }
  };
  const rulingDoc = adminDoc({
    cls: rulingCls,
    type: "BIR_RULING",
    normalizedReference: "BIR_RULING_123_2020",
    citation: "BIR Ruling No. 123-2020",
    title: "BIR Ruling No. 123-2020",
    tier: 4,
    layer: "LAYER_1_EXACT_NORMALIZED_AUTHORITY"
  });
  const rulingAnnotation = buildAuthorityAnnotation(rulingDoc, { issueClassification: rulingCls });
  assert(rulingAnnotation.authorityRole !== "GOVERNING", "BIR Ruling remains outside RR/RMC/RMO/RAMO promotion branch");
});

group("Existing controls remain outside the exact administrative branch", () => {
  const controls = [
    ["What is withholding tax?", /NIRC Sec\. 57|NIRC Sec\. 58/i],
    ["Explain NIRC Section 57", /NIRC Sec\. 57/i],
    ["Explain VAT", /NIRC Sec\. 105|NIRC Sec\. 106|NIRC Sec\. 107|NIRC Sec\. 108/i],
    ["Explain TRAIN Law", /RA\s*10963/i],
    ["Explain CREATE Act", /RA\s*11534/i]
  ];

  for (const [query, expected] of controls) {
    const cls = classify(query);
    const controlling = (cls.controllingAuthorities || []).join(" | ");
    assert(expected.test(controlling), `${query}: expected controlling authority preserved`);
  }
});

group("False-positive controls stay non-governing", () => {
  const falseControls = [
    {
      query: "Explain RR 2-98 in relation to VAT refund jurisprudence",
      type: "RR",
      normalizedReference: "RR_2_1998",
      citation: "RR 2-98",
      title: "Revenue Regulations No. 2-98",
      text: "Revenue Regulations No. 2-98 concerns withholding tax rules and not VAT refund jurisprudence."
    },
    {
      query: "Is RMO 20-2013 a Supreme Court decision?",
      type: "RMO",
      normalizedReference: "RMO_20_2013",
      citation: "RMO 20-2013",
      title: "Revenue Memorandum Order No. 20-2013",
      text: "Revenue Memorandum Order No. 20-2013 is a BIR issuance, not a Supreme Court decision."
    },
    {
      query: "Explain RMC 65-2012 and cite only the NIRC",
      type: "RMC",
      normalizedReference: "RMC_65_2012",
      citation: "RMC 65-2012",
      title: "Revenue Memorandum Circular No. 65-2012",
      text: "Revenue Memorandum Circular No. 65-2012 is a BIR issuance, while the query asks to cite only the NIRC."
    }
  ];

  for (const tc of falseControls) {
    const { annotation } = annotationFor(tc.query, { ...tc, tier: 4 });
    assert(annotation.authorityRole !== "GOVERNING", `${tc.query}: not GOVERNING`);
  }

  const penaltyCls = classify("What is the penalty under NIRC Section 248?");
  assert(
    (penaltyCls.controllingAuthorities || []).every((a) => !/\b(?:RR|RMC|RMO|RAMO)\s+No\./i.test(a)),
    "NIRC Section 248 penalty query has no numbered administrative controlling authority"
  );
});

console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-027J-R1  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const f of failures) console.log(`  - ${f}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
