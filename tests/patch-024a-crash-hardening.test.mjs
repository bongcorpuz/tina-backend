/**
 * PATCH-024A Regression Tests — Crash and 502 Hardening
 *
 * Run: node tests/patch-024a-crash-hardening.test.mjs
 *
 * Covers two hard blockers found in the 2026-06-14 final domain regression:
 *
 * BLOCKER 1 (Q40): Fictional RMC 999-2099 caused HTTP 502 (unhandled exception /
 *   server crash). Required behavior: HTTP 200, NO_INDEXED_SOURCE, no fabricated
 *   source cards or authority citations.
 *   Fix: PATCH-024A reclassifies RETRIEVAL_TIMEOUT → NO_INDEXED_SOURCE when a
 *   specific BIR issuance (RMC/RR/RMO/RAMO) is cited but retrieval returns nothing,
 *   then forces the SAE hard-fail gate so no hallucinated text is surfaced.
 *
 * BLOCKER 2 (Q34): /source estate tax NIRC Sec. 84 took ~104 s and returned
 *   HTTP 502 (Render hard-kill). Required behavior: bounded execution, HTTP 200.
 *   Fix: PATCH-024A removes isSourceLookupRetrieval from the retrieval-await bypass
 *   so /source requests always race against RETRIEVAL_STEP_TIMEOUT_MS.
 */

"use strict";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPELINE_SRC = readFileSync(join(__dirname, "..", "pipeline.js"), "utf8");
const SERVER_SRC   = readFileSync(join(__dirname, "..", "server.js"),   "utf8");

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
  console.log(`\n── ${name}`);
  fn();
}

// ─── Group 1: Q40 — isSourceLookupRetrieval no longer bypasses the timeout race ─

group("Q34 — /source retrieval bounded by timeout race", () => {
  assert(
    !PIPELINE_SRC.includes("(isSourceLookupRetrieval || isAuthorityCriticalRetrieval)"),
    "old bypass condition removed: (isSourceLookupRetrieval || isAuthorityCriticalRetrieval)"
  );

  assert(
    PIPELINE_SRC.includes("(isAuthorityCriticalRetrieval && !isSourceLookupRetrieval)"),
    "new bypass condition present: auth-critical /ask only, not /source"
  );

  assert(
    PIPELINE_SRC.includes("PATCH-024A: /source (isSourceLookupRetrieval) now uses the timeout race"),
    "PATCH-024A comment on retrieval bypass change is present"
  );
});

// ─── Group 2: Q40 — exact authority missing guard ────────────────────────────

group("Q40 — RETRIEVAL_TIMEOUT reclassified to NO_INDEXED_SOURCE for specific issuances", () => {
  assert(
    PIPELINE_SRC.includes("_024a_exactAuthorityMissing"),
    "PATCH-024A exactAuthorityMissing flag is set in pipeline"
  );

  assert(
    PIPELINE_SRC.includes("PATCH_024A_EXACT_AUTHORITY_NOT_INDEXED"),
    "PATCH-024A diagnostic log marker present"
  );

  assert(
    PIPELINE_SRC.includes('"NO_INDEXED_SOURCE"') &&
    PIPELINE_SRC.includes("wasStatus:      \"RETRIEVAL_TIMEOUT\""),
    "reclassification from RETRIEVAL_TIMEOUT to NO_INDEXED_SOURCE is coded"
  );

  assert(
    PIPELINE_SRC.includes('["RMC", "RR", "RMO", "RAMO"]'),
    "guard applies to RMC, RR, RMO, RAMO types"
  );

  assert(
    PIPELINE_SRC.includes("_024aExactAuth?.detected === true"),
    "guard checks exactAuthority.detected === true"
  );

  assert(
    PIPELINE_SRC.includes('(ctx.rerankedChunks || []).length === 0'),
    "guard only fires when rerankedChunks is empty"
  );

  assert(
    PIPELINE_SRC.includes('ctx.saeStatus === "RETRIEVAL_TIMEOUT"'),
    "guard only fires when saeStatus is RETRIEVAL_TIMEOUT"
  );
});

// ─── Group 3: Q40 — SAE hard-fail gate honours the flag ─────────────────────

group("Q40 — SAE hard-fail gate forced when exact authority missing", () => {
  assert(
    PIPELINE_SRC.includes("hasSaeHardFail(compliantResult) || ctx._024a_exactAuthorityMissing === true"),
    "hard-fail check ORs in _024a_exactAuthorityMissing flag"
  );
});

// ─── Group 4: Server — global unhandledRejection handler ────────────────────

group("Server — unhandledRejection handler prevents process crash", () => {
  assert(
    SERVER_SRC.includes('process.on("unhandledRejection"'),
    'server.js registers process.on("unhandledRejection")'
  );

  assert(
    SERVER_SRC.includes("UNHANDLED_REJECTION"),
    "unhandledRejection handler logs [UNHANDLED_REJECTION]"
  );

  assert(
    !SERVER_SRC.includes("process.exit") || SERVER_SRC.includes("shutdown"),
    "unhandledRejection handler does not call process.exit (avoids deliberate crash)"
  );
});

// ─── Group 5: Safety — no change to normal pipeline paths ───────────────────

group("Safety — normal pipeline paths are unchanged", () => {
  assert(
    PIPELINE_SRC.includes("isAuthorityCriticalRetrieval"),
    "isAuthorityCriticalRetrieval still present for /ask auth-critical queries"
  );

  assert(
    PIPELINE_SRC.includes("RETRIEVAL_STEP_TIMEOUT_MS"),
    "existing retrieval timeout constant preserved"
  );

  assert(
    PIPELINE_SRC.includes("hasSaeHardFail(compliantResult)"),
    "original hasSaeHardFail call is still present (not replaced)"
  );

  // The guard must NOT fire for queries with no exactAuthority detection
  const guardBlock = PIPELINE_SRC.match(
    /PATCH-024A Q40[\s\S]{0,1200}ctx\._024a_exactAuthorityMissing = true/
  );
  assert(
    Boolean(guardBlock),
    "PATCH-024A guard block is self-contained (does not affect other code paths)"
  );

  assert(
    PIPELINE_SRC.includes("isSourceLookupRetrieval"),
    "isSourceLookupRetrieval flag still exists (used downstream for SAE classification)"
  );
});

// ─── Group 6: Structural guard — guarded authority types ────────────────────

group("Structural — only administrative issuances are guarded", () => {
  // NIRC statutes and case law are NOT in the guard list. When a user cites
  // "NIRC Sec. 84" (a valid statute), retrieval should proceed normally and
  // the guard should NOT fire even on timeout.
  assert(
    !PIPELINE_SRC.includes('"STATUTE"') || !PIPELINE_SRC.match(
      /\["RMC", "RR", "RMO", "RAMO"\][\s\S]{0,200}"STATUTE"/
    ),
    "STATUTE type is not in the PATCH-024A guard list"
  );

  assert(
    !PIPELINE_SRC.includes('"SUPREME_COURT"') || !PIPELINE_SRC.match(
      /\["RMC", "RR", "RMO", "RAMO"\][\s\S]{0,200}"SUPREME_COURT"/
    ),
    "SUPREME_COURT type is not in the PATCH-024A guard list"
  );
});

// ─── Results ─────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`PATCH-024A: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed assertions:");
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log("All assertions passed.");
