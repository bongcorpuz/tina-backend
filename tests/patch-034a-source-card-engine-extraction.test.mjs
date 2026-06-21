import assert from "node:assert/strict";

import {
  finalSourceCardCanonicalKey,
  mergeFinalSourceCards,
  sourceCardFromRetrievedTarget,
  sourceCardPublicUrlFromDoc
} from "../source-card-engine.js";

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
    console.error(error);
  }
}

test("RR 16-2005 card preserves direct publicUrl", () => {
  const card = sourceCardFromRetrievedTarget({
    normalizedReference: "RR 16-2005",
    authorityType: "RR",
    publicUrl: "https://drive.google.com/file/d/rr16/view"
  }, "RR 16-2005");

  assert.equal(card.citation, "RR 16-2005");
  assert.equal(card.normalizedReference, "RR 16-2005");
  assert.equal(card.publicUrl, "https://drive.google.com/file/d/rr16/view");
});

test("RR 16-2005 card hydrates URL from metadata variants", () => {
  const doc = {
    normalizedReference: "RR 16-2005",
    authorityType: "RR",
    metadata: {
      web_view_link: "https://drive.google.com/file/d/rr16-meta/view"
    }
  };
  const card = sourceCardFromRetrievedTarget(doc, "RR 16-2005");

  assert.equal(sourceCardPublicUrlFromDoc(doc), "https://drive.google.com/file/d/rr16-meta/view");
  assert.equal(card.publicUrl, "https://drive.google.com/file/d/rr16-meta/view");
});

test("RR 2-98 duplicate aliases dedupe to one final card", () => {
  const { finalCards, diagnostics } = mergeFinalSourceCards([
    { citation: "RR 2-98", publicUrl: "https://drive.google.com/file/d/rr2/view" },
    { citation: "RR No. 2-1998" },
    { citation: "Revenue Regulations No. 2-1998" }
  ], [], 5);

  assert.equal(finalCards.length, 1);
  assert.equal(finalCards[0].citation, "RR 2-98");
  assert.deepEqual(diagnostics.afterCanonicalKeys, ["rr:2-1998"]);
  assert.equal(diagnostics.droppedDuplicateLabels.length, 2);
});

test("CTA Case No. 9369 clickable card is preserved", () => {
  const card = sourceCardFromRetrievedTarget({
    normalizedReference: "CTA Case No. 9369",
    authorityType: "CTA_DIVISION",
    metadata: {
      driveViewUrl: "https://drive.google.com/file/d/cta9369/view",
      documentTitle: "CTA Case No. 9369 - Taganito Mining Corporation v. CIR.pdf"
    }
  }, "CTA Case No. 9369");

  assert.equal(card.citation, "CTA Case No. 9369");
  assert.equal(card.authorityType, "CTA_DIVISION");
  assert.equal(card.publicUrl, "https://drive.google.com/file/d/cta9369/view");
});

test("label-only fallback card still works", () => {
  const card = sourceCardFromRetrievedTarget({ authorityType: "RR" }, "RR 16-2005");

  assert.equal(card.citation, "RR 16-2005");
  assert.equal(card.normalizedReference, "RR 16-2005");
  assert.equal(card.authorityType, "RR");
  assert.equal(card.publicUrl, undefined);
});

test("cards without URL remain allowed when no URL exists", () => {
  const card = sourceCardFromRetrievedTarget({
    normalizedReference: "NIRC Sec. 22",
    authorityType: "STATUTE"
  }, "NIRC Sec. 22");

  assert.equal(card.citation, "NIRC Sec. 22");
  assert.equal(card.publicUrl, undefined);
});

test("canonical key treats duplicate RR cards consistently", () => {
  const keys = [
    finalSourceCardCanonicalKey({ citation: "RR 2-98" }),
    finalSourceCardCanonicalKey({ citation: "RR No. 2-1998" }),
    finalSourceCardCanonicalKey({ citation: "Revenue Regulations No. 2-1998" })
  ];

  assert.deepEqual(keys, ["rr:2-1998", "rr:2-1998", "rr:2-1998"]);
});

console.log(`\nPATCH-034A source-card engine extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
