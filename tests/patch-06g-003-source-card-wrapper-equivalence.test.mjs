/**
 * PATCH-06G-003 - Source-card wrapper equivalence test lock
 *
 * This test is intentionally offline and test-only. The pipeline.js source-card
 * wrappers are local functions, so the equivalence lock verifies their exact
 * one-line delegation to source-card-engine.js aliases, then exercises the real
 * engine implementations with representative fixtures.
 */

"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  finalSourceCardCanonicalKey,
  mergeFinalSourceCards,
  resolveIndexedSourceCardTarget,
  sanitizePublicSourceCard,
  sourceCardFromRetrievedTarget,
  sourceCardPublicUrlFromDoc
} from "../source-card-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPELINE_SRC = readFileSync(join(__dirname, "..", "pipeline.js"), "utf8");

const WRAPPER_MAPPINGS = [
  {
    wrapperName: "finalSourceCardCanonicalKey",
    engineAlias: "engineFinalSourceCardCanonicalKey",
    signature: "function finalSourceCardCanonicalKey(card = {})",
    delegation: "return engineFinalSourceCardCanonicalKey(card);"
  },
  {
    wrapperName: "mergeFinalSourceCards",
    engineAlias: "engineMergeFinalSourceCards",
    signature: "function mergeFinalSourceCards(existingCards = [], restoredCards = [], maxCards = 5)",
    delegation: "return engineMergeFinalSourceCards(existingCards, restoredCards, maxCards);"
  },
  {
    wrapperName: "sourceCardPublicUrlFromDoc",
    engineAlias: "engineSourceCardPublicUrlFromDoc",
    signature: "function sourceCardPublicUrlFromDoc(doc = {})",
    delegation: "return engineSourceCardPublicUrlFromDoc(doc);"
  },
  {
    wrapperName: "sanitizePublicSourceCard",
    engineAlias: "engineSanitizePublicSourceCard",
    signature: "function sanitizePublicSourceCard(card = {})",
    delegation: "return engineSanitizePublicSourceCard(card);"
  },
  {
    wrapperName: "sourceCardFromRetrievedTarget",
    engineAlias: "engineSourceCardFromRetrievedTarget",
    signature: "function sourceCardFromRetrievedTarget(doc = {}, target = \"\")",
    delegation: "return engineSourceCardFromRetrievedTarget(doc, target);"
  },
  {
    wrapperName: "resolveIndexedSourceCardTarget",
    engineAlias: "engineResolveIndexedSourceCardTarget",
    signature: "async function resolveIndexedSourceCardTarget(target = \"\")",
    delegation: "return engineResolveIndexedSourceCardTarget(target, { exactAuthoritySearch, logger: console });"
  }
];

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertUnchanged(actual, expected, label) {
  assert.deepEqual(actual, expected, `${label} input should not be mutated`);
}

function assertWrapperDelegates({ wrapperName, signature, delegation }) {
  assert(
    PIPELINE_SRC.includes(signature),
    `${wrapperName} wrapper signature should remain present in pipeline.js`
  );
  const wrapperFirstStatementPattern = new RegExp(
    `${signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{\\s*${delegation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
  );
  assert(
    wrapperFirstStatementPattern.test(PIPELINE_SRC),
    `${wrapperName} should delegate to its source-card-engine alias as the first statement`
  );
}

await test("pipeline.js imports the six source-card engine aliases", () => {
  for (const { engineAlias } of WRAPPER_MAPPINGS) {
    assert(
      PIPELINE_SRC.includes(` as ${engineAlias}`),
      `pipeline.js should import source-card-engine function as ${engineAlias}`
    );
  }
});

for (const mapping of WRAPPER_MAPPINGS) {
  await test(`${mapping.wrapperName} delegates to ${mapping.engineAlias}`, () => {
    assertWrapperDelegates(mapping);
  });
}

await test("finalSourceCardCanonicalKey engine fixture is stable and non-mutating", () => {
  const input = { citation: "RR No. 2-1998", title: "Revenue Regulations No. 2-1998.pdf" };
  const before = clone(input);

  const output = finalSourceCardCanonicalKey(input);

  assert.equal(output, "rr:2-1998");
  assertUnchanged(input, before, "finalSourceCardCanonicalKey");
});

await test("mergeFinalSourceCards engine fixture dedupes and leaves input cards unchanged", () => {
  const existingCards = [
    { citation: "RR 2-98", publicUrl: "https://drive.google.com/file/d/rr2/view" },
    { citation: "RR No. 2-1998" }
  ];
  const restoredCards = [
    { citation: "NIRC Sec. 57", authorityType: "STATUTE" }
  ];
  const beforeExisting = clone(existingCards);
  const beforeRestored = clone(restoredCards);

  const output = mergeFinalSourceCards(existingCards, restoredCards, 5);

  assert.deepEqual(output.finalCards.map((card) => card.citation), ["RR 2-98", "NIRC Sec. 57"]);
  assert.deepEqual(output.diagnostics.afterCanonicalKeys, ["rr:2-1998", "nircsec57"]);
  assert.deepEqual(output.diagnostics.droppedDuplicateLabels, ["RR No. 2-1998"]);
  assertUnchanged(existingCards, beforeExisting, "mergeFinalSourceCards existingCards");
  assertUnchanged(restoredCards, beforeRestored, "mergeFinalSourceCards restoredCards");
});

await test("sourceCardPublicUrlFromDoc engine fixture resolves metadata URL without mutation", () => {
  const input = {
    normalizedReference: "CTA Case No. 9369",
    metadata: {
      web_view_link: "https://drive.google.com/file/d/cta9369/view"
    }
  };
  const before = clone(input);

  const output = sourceCardPublicUrlFromDoc(input);

  assert.equal(output, "https://drive.google.com/file/d/cta9369/view");
  assertUnchanged(input, before, "sourceCardPublicUrlFromDoc");
});

await test("sanitizePublicSourceCard engine fixture strips private-looking fields without mutation", () => {
  const input = {
    title: "RR 16-2005.pdf",
    citation: "RR 16-2005",
    displayLabel: "Revenue Regulations No. 16-2005",
    authorityType: "RR",
    authorityMatchTier: 2,
    authorityRole: "primary",
    driveViewUrl: "https://drive.google.com/file/d/rr16/view",
    sourcePath: "C:\\private\\rr16.pdf"
  };
  const before = clone(input);

  const output = sanitizePublicSourceCard(input);

  assert.deepEqual(output, {
    title: "Revenue Regulations No. 16-2005",
    label: "Revenue Regulations No. 16-2005",
    displayLabel: "Revenue Regulations No. 16-2005",
    citation: "RR 16-2005",
    authorityType: "RR",
    limitationRequired: false,
    authorityMatchTier: 2,
    authorityRole: "primary",
    publicUrl: "https://drive.google.com/file/d/rr16/view"
  });
  assertUnchanged(input, before, "sanitizePublicSourceCard");
});

await test("sourceCardFromRetrievedTarget engine fixture creates public card without mutation", () => {
  const input = {
    title: "CTA Case No. 9369 - Taganito Mining Corporation v. CIR.pdf",
    authorityType: "CTA_DIVISION",
    metadata: {
      normalizedReference: "CTA Case No. 9369",
      driveViewUrl: "https://drive.google.com/file/d/cta9369/view"
    }
  };
  const before = clone(input);

  const output = sourceCardFromRetrievedTarget(input, "CTA Case No. 9369");

  assert.equal(output.citation, "CTA Case No. 9369");
  assert.equal(output.normalizedReference, "CTA Case No. 9369");
  assert.equal(output.authorityType, "CTA_DIVISION");
  assert.equal(output.publicUrl, "https://drive.google.com/file/d/cta9369/view");
  assertUnchanged(input, before, "sourceCardFromRetrievedTarget");
});

await test("resolveIndexedSourceCardTarget engine fixture returns first match through injected search", async () => {
  const calls = [];
  const first = { normalizedReference: "RR 16-2005", authorityType: "RR" };

  const output = await resolveIndexedSourceCardTarget(" RR 16-2005 ", {
    exactAuthoritySearch: async (payload) => {
      calls.push(payload);
      return [first, { normalizedReference: "RR 2-98" }];
    },
    logger: { warn() {} }
  });

  assert.equal(output, first);
  assert.deepEqual(calls, [{
    query: "RR 16-2005",
    keyword: "RR 16-2005",
    targetAuthorities: ["RR 16-2005"],
    topK: 1
  }]);
});

console.log(`\nPATCH-06G-003 source-card wrapper equivalence tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
