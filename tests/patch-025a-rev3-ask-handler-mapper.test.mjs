/**
 * PATCH-025A-REV3 — Ask-Handler Payload Mapper
 *
 * Run: node tests/patch-025a-rev3-ask-handler-mapper.test.mjs
 *
 * Verifies that ask-handler.js propagates patch024cPostSourcecard from the
 * pipeline result into the /ask response payload.
 *
 * All checks are static source analysis — no server, no pipeline, no OpenAI.
 *
 * Safety contract: only counts, flags, enum strings, and a correlation ID are
 * forwarded.  No text, keys, chunks, or internal paths are introduced here.
 */

"use strict";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ─── Test harness ─────────────────────────────────────────────────────────────

let passed  = 0;
let failed  = 0;
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
  console.log(`\n── ${name}`);
  fn();
}

// ─── Source loads ─────────────────────────────────────────────────────────────

const ASK_SRC      = readFileSync(join(ROOT, "ask-handler.js"),  "utf8");
const PIPELINE_SRC = readFileSync(join(ROOT, "pipeline.js"),     "utf8");

// ─── Group 1: ask-handler.js payload mapping ──────────────────────────────────

group("PATCH-025A-REV3 — ask-handler.js payload mapping", () => {
  const _fnStart  = ASK_SRC.indexOf("async function handleControlledRagRoute(");
  const _saeIdx   = ASK_SRC.indexOf("saeStatus:                result.saeStatus");
  const _mapIdx   = ASK_SRC.indexOf("patch024cPostSourcecard:  result.patch024cPostSourcecard");

  // 1. Field is present in the handleControlledRagRoute payload
  assert(
    /patch024cPostSourcecard:\s+result\.patch024cPostSourcecard/.test(ASK_SRC),
    "ask-handler maps patch024cPostSourcecard from pipeline result"
  );

  // 2. Null-fallback guard is used (|| null), not raw passthrough
  assert(
    /patch024cPostSourcecard:\s+result\.patch024cPostSourcecard\s*\|\|\s*null/.test(ASK_SRC),
    "ask-handler uses || null fallback for patch024cPostSourcecard"
  );

  // 3. Field appears after handleControlledRagRoute declaration
  assert(
    _fnStart >= 0 && _mapIdx > _fnStart,
    "patch024cPostSourcecard mapping is inside handleControlledRagRoute"
  );

  // 4. Placement is near saeStatus (source-availability diagnostic cluster)
  assert(
    _saeIdx >= 0 && _mapIdx >= 0 && Math.abs(_mapIdx - _saeIdx) < 200,
    "patch024cPostSourcecard is placed within 200 chars of saeStatus in ask-handler"
  );
});

// ─── Group 2: pipeline.js origin field unchanged ──────────────────────────────

group("PATCH-025A-REV3 — pipeline.js origin field unchanged", () => {
  // 5. pipeline.js still sets ctx._patch024cPostSourcecard (executed=true path)
  assert(
    /ctx\._patch024cPostSourcecard\s*=\s*\{/.test(PIPELINE_SRC) &&
    /executed:\s+true,/.test(PIPELINE_SRC),
    "pipeline.js ctx._patch024cPostSourcecard = { executed: true } unchanged"
  );

  // 6. pipeline.js return still includes patch024cPostSourcecard
  assert(
    /patch024cPostSourcecard:\s+ctx\._patch024cPostSourcecard/.test(PIPELINE_SRC),
    "pipeline.js return payload exposes patch024cPostSourcecard unchanged"
  );

  // 7. _024cSkipReason logic unchanged in pipeline.js
  assert(
    /const\s+_024cSkipReason\s*=/.test(PIPELINE_SRC) &&
    PIPELINE_SRC.includes('"NO_FINAL_SOURCE_CARDS"') &&
    PIPELINE_SRC.includes('"LEARNING_MODE"')         &&
    PIPELINE_SRC.includes('"SOURCE_LOOKUP_EMPTY"'),
    "pipeline.js _024cSkipReason computation unchanged"
  );
});

// ─── Group 3: no unsafe fields introduced by ask-handler ──────────────────────

group("PATCH-025A-REV3 — ask-handler adds no unsafe content", () => {
  // 8–15. The mapping line itself introduces no forbidden identifiers.
  //       Extract the one line containing patch024cPostSourcecard in ask-handler.
  const _lineStart = ASK_SRC.indexOf("patch024cPostSourcecard:");
  const _lineSnip  = _lineStart >= 0 ? ASK_SRC.slice(_lineStart, _lineStart + 120) : "";

  for (const forbidden of [
    "rerankedChunks",
    "finalAnswer",
    "prompt",
    "openaiKey",
    "SUPABASE",
    "apiKey",
    "__dirname",
    "__filename"
  ]) {
    assert(
      !_lineSnip.includes(forbidden),
      `ask-handler mapping line does not reference '${forbidden}'`
    );
  }

  // 16. The mapped value is exactly result.patch024cPostSourcecard — no additional
  //     fields are merged or constructed inline in ask-handler.
  assert(
    !/patch024cPostSourcecard:\s*\{/.test(ASK_SRC),
    "ask-handler does not construct a new patch024cPostSourcecard object (passthrough only)"
  );
});

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(56)}`);
console.log(`PATCH-025A-REV3: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed assertions:");
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
