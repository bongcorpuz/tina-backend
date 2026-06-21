import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveIndexedSourceCardTarget } from "../source-card-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPELINE_SRC = readFileSync(join(__dirname, "..", "pipeline.js"), "utf8");

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
    console.error(error);
  }
}

await test("empty target returns null and does not call injected search", async () => {
  let called = false;
  const result = await resolveIndexedSourceCardTarget("   ", {
    exactAuthoritySearch: async () => {
      called = true;
      return [];
    }
  });

  assert.equal(result, null);
  assert.equal(called, false);
});

await test("missing exactAuthoritySearch returns null without crashing", async () => {
  const result = await resolveIndexedSourceCardTarget("RR 16-2005");
  assert.equal(result, null);
});

await test("exact authority search receives unchanged payload", async () => {
  let payload = null;
  await resolveIndexedSourceCardTarget("RR 16-2005", {
    exactAuthoritySearch: async (arg) => {
      payload = arg;
      return [];
    }
  });

  assert.deepEqual(payload, {
    query: "RR 16-2005",
    keyword: "RR 16-2005",
    targetAuthorities: ["RR 16-2005"],
    topK: 1
  });
});

await test("first match is returned", async () => {
  const first = { normalizedReference: "RR 16-2005", id: 1 };
  const result = await resolveIndexedSourceCardTarget("RR 16-2005", {
    exactAuthoritySearch: async () => [first, { id: 2 }]
  });

  assert.equal(result, first);
});

await test("no matches returns null", async () => {
  const result = await resolveIndexedSourceCardTarget("RR 16-2005", {
    exactAuthoritySearch: async () => []
  });

  assert.equal(result, null);
});

await test("search error returns null", async () => {
  const logger = { warn() {} };
  const result = await resolveIndexedSourceCardTarget("RR 16-2005", {
    exactAuthoritySearch: async () => {
      throw new Error("lookup failed");
    },
    logger
  });

  assert.equal(result, null);
});

await test("search error logs PATCH_033D_R1_INDEXED_SOURCE_CARD_LOOKUP_FAILED", async () => {
  const warnings = [];
  const logger = {
    warn(marker, payload) {
      warnings.push({ marker, payload });
    }
  };
  const result = await resolveIndexedSourceCardTarget("RR 16-2005", {
    exactAuthoritySearch: async () => {
      throw new Error("lookup failed");
    },
    logger
  });

  assert.equal(result, null);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].marker, "[PATCH_033D_R1_INDEXED_SOURCE_CARD_LOOKUP_FAILED]");
  assert.equal(warnings[0].payload.target, "RR 16-2005");
  assert.equal(warnings[0].payload.error, "lookup failed");
});

await test("pipeline.js keeps resolveIndexedSourceCardTarget compatibility wrapper", async () => {
  assert.match(PIPELINE_SRC, /async function resolveIndexedSourceCardTarget\(target = ""\)/);
  assert.match(PIPELINE_SRC, /engineResolveIndexedSourceCardTarget\(target, \{ exactAuthoritySearch, logger: console \}\)/);
});

console.log(`\nPATCH-034B indexed source-card target extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
