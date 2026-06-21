/**
 * TINA forbidden-files guard.
 *
 * Run: npm run guard:files  (alias: node scripts/forbidden-files-guard.mjs)
 *
 * Developer safety check ONLY: inspects `git status --porcelain` and fails
 * (exit 1) if any authority-critical or secret-bearing file appears as
 * modified, staged, renamed, deleted, or newly added in the working tree.
 *
 * Read-only enforcement — this script never modifies files, never runs in
 * production, and contains no pipeline / authority / retrieval / generation
 * logic. It only reads git status output.
 */

"use strict";

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ─── Protected file rules ─────────────────────────────────────────────────────
// Matched against the path's basename. Exact names or prefix wildcards only.

const PROTECTED_EXACT = new Set([
  "authority-utils.js",
  "authority-engine.js",
  "retrieval-engine.js",
  "answer-renderer.js",
  "source-card-engine.js",
  ".env"
]);

// PATCH-034A approval: Phase 6B intentionally introduces source-card-engine.js
// as an extraction target for pure source-card finalization helpers.
// Keep this exception narrow to the exact file; all other protected files remain blocked.
const APPROVED_EXACT = new Set([
  "source-card-engine.js"
]);

const PROTECTED_PREFIXES = [
  ".env.",               // .env.*
  "supabase-service-key", // supabase-service-key*
  "openai-api-key"        // openai-api-key*
];

// Suffix-style env files (e.g. tina-backend.env) — .env.example stays allowed
// because that name ends in ".example", not ".env".
const PROTECTED_SUFFIXES = [
  ".env"                 // *.env
];

function isProtected(path) {
  const name = basename(path).toLowerCase();
  if (PROTECTED_EXACT.has(name)) return true;
  if (PROTECTED_PREFIXES.some((p) => name.startsWith(p))) return true;
  return PROTECTED_SUFFIXES.some((s) => name.endsWith(s));
}

// ─── Inspect git status ───────────────────────────────────────────────────────

const git = spawnSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
if (git.status !== 0) {
  console.error("FORBIDDEN FILES GUARD: unable to run git status");
  console.error((git.stderr || "").trim());
  process.exit(1);
}

const entries = git.stdout
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const status = line.slice(0, 2);
    let path = line.slice(3).trim().replace(/^"|"$/g, "");
    // Renames are reported as "old -> new": both sides count.
    const arrow = path.indexOf(" -> ");
    const paths = arrow > -1 ? [path.slice(0, arrow), path.slice(arrow + 4)] : [path];
    return { status, paths };
  });

const violations = [];
for (const { status, paths } of entries) {
  for (const p of paths) {
    const name = basename(p).toLowerCase();
    if (isProtected(p) && !APPROVED_EXACT.has(name)) violations.push({ status, path: p });
  }
}

// ─── Report ───────────────────────────────────────────────────────────────────

console.log("══ FORBIDDEN FILES GUARD ════════════════════════════════════");
console.log("Protected: authority-utils.js, authority-engine.js, retrieval-engine.js,");
console.log("           answer-renderer.js, source-card-engine.js, .env, .env.*, *.env,");
console.log("           supabase-service-key*, openai-api-key*");

if (violations.length === 0) {
  console.log("\nPASS: No protected files modified");
  process.exit(0);
}

console.error("\nFAIL: protected files modified:");
for (const v of violations) {
  console.error(`  [${v.status.trim() || "??"}] ${v.path}`);
}
console.error("\nRevert these changes or obtain explicit authorization before committing.");
process.exit(1);
