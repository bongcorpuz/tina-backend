/**
 * PATCH-06G-003 - Source-card wrapper equivalence test lock
 *
 * This test is intentionally offline. PATCH-06G-004 collapsed the pipeline.js
 * source-card wrappers, so this lock now verifies that pipeline.js uses direct
 * source-card-engine.js imports without restoring local wrapper bodies, then
 * exercises the real engine implementations with representative fixtures.
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
    engineName: "finalSourceCardCanonicalKey",
    signature: "function finalSourceCardCanonicalKey(card = {})",
    importedByPipeline: true
  },
  {
    wrapperName: "mergeFinalSourceCards",
    engineName: "mergeFinalSourceCards",
    signature: "function mergeFinalSourceCards(existingCards = [], restoredCards = [], maxCards = 5)",
    importedByPipeline: true
  },
  {
    wrapperName: "sourceCardPublicUrlFromDoc",
    engineName: "sourceCardPublicUrlFromDoc",
    signature: "function sourceCardPublicUrlFromDoc(doc = {})",
    importedByPipeline: false
  },
  {
    wrapperName: "sanitizePublicSourceCard",
    engineName: "sanitizePublicSourceCard",
    signature: "function sanitizePublicSourceCard(card = {})",
    importedByPipeline: true
  },
  {
    wrapperName: "sourceCardFromRetrievedTarget",
    engineName: "sourceCardFromRetrievedTarget",
    signature: "function sourceCardFromRetrievedTarget(doc = {}, target = \"\")",
    importedByPipeline: true
  },
  {
    wrapperName: "resolveIndexedSourceCardTarget",
    engineName: "resolveIndexedSourceCardTarget",
    signature: "async function resolveIndexedSourceCardTarget(target = \"\")",
    importedByPipeline: true
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

function assertCollapsedWrapper({ wrapperName, engineName, signature, importedByPipeline }) {
  assert(
    !PIPELINE_SRC.includes(signature),
    `${wrapperName} wrapper signature should not be restored in pipeline.js`
  );
  assert(
    !PIPELINE_SRC.includes(` as engine${engineName[0].toUpperCase()}${engineName.slice(1)}`),
    `${wrapperName} should not be imported through a pipeline engine* alias`
  );
  if (importedByPipeline) {
    assert(
      PIPELINE_SRC.includes(`  ${engineName}`),
      `${wrapperName} should be imported directly from source-card-engine.js`
    );
  }
}

await test("pipeline.js has collapsed the six source-card wrappers", () => {
  for (const mapping of WRAPPER_MAPPINGS) {
    assertCollapsedWrapper(mapping);
  }
});

await test("pipeline.js injects indexed lookup dependencies at the direct engine call site", () => {
  assert(
    PIPELINE_SRC.includes("await resolveIndexedSourceCardTarget(target, { exactAuthoritySearch, logger: console })"),
    "resolveIndexedSourceCardTarget should receive the same exactAuthoritySearch/logger dependencies after collapse"
  );
});

await test("pipeline.js no longer imports source-card engine* aliases", () => {
  for (const { engineName } of WRAPPER_MAPPINGS) {
    assert(
      !PIPELINE_SRC.includes(`engine${engineName[0].toUpperCase()}${engineName.slice(1)}`),
      `pipeline.js should not keep engine alias for ${engineName}`
    );
  }
});

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
