/**
 * PHASE-10A14-R17 — provenance, recovery-disposition and retry-link self-test (COMMIT 2).
 *
 * Synthetic evidence only, in OS temp directories. Never reads, writes or alters any
 * historical R13/R14/R15/R16 evidence.
 *
 * Covers every case required by the authorization, including the exact fabricated SHA and
 * the exact corruption shape that R16 failed to detect.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  validateSha, validateAttemptProvenance,
  detectCorruption, scanAttemptCorruption, resolveDisposition, DISPOSITIONS,
  validateRetryLinks, computeRetryCeiling
} from "../evaluation/results/phase-10a14-r17/validators.mjs";

let passed = 0, failed = 0;
const failures = [];
const check = (c, m) => { if (!c) throw new Error(m); };
const equal = (a, b, m) => { if (a !== b) throw new Error(`${m} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`); };
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; failures.push(`${name}: ${e.message}`); console.log(`FAIL ${name}\n  ${e.message}`); }
}

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "r17-validators-"));
const mkdir = (id) => { const d = path.join(ROOT, id); fs.mkdirSync(d, { recursive: true }); return d; };
const REAL_COMMIT = execSync("git rev-parse HEAD", { cwd: "C:/Projects/tina-backend", encoding: "utf8" }).trim();
const FABRICATED = "a802064a1b32e8a68a0b8c4dd1f8a1b0c9a5e2f7";

// ── PROVENANCE ───────────────────────────────────────────────────────────────

test("a real commit validates", () => {
  const r = validateSha(REAL_COMMIT);
  equal(r.valid, true, `real commit must validate: ${r.errors.join(",")}`);
  equal(r.objectType, "commit", "object type");
});

test("THE EXACT R16 FABRICATED SHA is rejected as a nonexistent object", () => {
  const r = validateSha(FABRICATED);
  equal(r.valid, false, "fabricated SHA must be rejected");
  check(r.errors.includes("SHA_NOT_A_GIT_OBJECT"), `expected SHA_NOT_A_GIT_OBJECT, got ${r.errors.join(",")}`);
  equal(r.exists, false, "must not exist");
});

test("a malformed SHA string is rejected on format", () => {
  for (const bad of ["", "abc", "ZZZZ064a1b32e8a68a0b8c4dd1f8a1b0c9a5e2f7", REAL_COMMIT.slice(0, 39)]) {
    const r = validateSha(bad);
    equal(r.valid, false, `must reject ${JSON.stringify(bad)}`);
  }
});

test("a blob SHA is rejected because the object type is not commit", () => {
  const blob = execSync("git rev-parse HEAD:package.json", { cwd: "C:/Projects/tina-backend", encoding: "utf8" }).trim();
  const r = validateSha(blob);
  equal(r.exists, true, "blob exists");
  equal(r.objectType, "blob", "object type is blob");
  equal(r.valid, false, "a blob must not pass as a commit");
  check(r.errors.some((e) => e.startsWith("SHA_WRONG_OBJECT_TYPE")), `errors: ${r.errors.join(",")}`);
});

test("ancestry is validated, and an invalid ancestry is rejected", () => {
  const ok = validateSha(REAL_COMMIT, { expectedAncestorOf: REAL_COMMIT });
  equal(ok.valid, true, "a commit is its own ancestor for merge-base --is-ancestor");
  const root = execSync("git rev-list --max-parents=0 HEAD", { cwd: "C:/Projects/tina-backend", encoding: "utf8" }).trim().split(/\r?\n/)[0];
  const bad = validateSha(REAL_COMMIT, { expectedAncestorOf: root });
  equal(bad.valid, false, "HEAD must not be an ancestor of the root commit");
  check(bad.errors.includes("ANCESTRY_INVALID"), `errors: ${bad.errors.join(",")}`);
});

test("attempt provenance reports per-field verification", () => {
  const good = validateAttemptProvenance({ headAtStart: REAL_COMMIT, headAtEnd: REAL_COMMIT, runtimeCommit: REAL_COMMIT });
  equal(good.provenanceValid, true, `good: ${good.provenanceErrors.join(",")}`);
  const bad = validateAttemptProvenance({ headAtStart: REAL_COMMIT, headAtEnd: REAL_COMMIT, runtimeCommit: FABRICATED });
  equal(bad.provenanceValid, false, "fabricated runtimeCommit must invalidate");
  equal(bad.runtimeCommitVerified, false, "runtimeCommitVerified must be false");
});

// ── CORRUPTION AND RECOVERY DISPOSITION ─────────────────────────────────────

test("THE EXACT R16 CORRUPTION SHAPE is detected: 186 NUL bytes in a text file", () => {
  const d = mkdir("C-nul");
  fs.writeFileSync(path.join(d, "tree-before.txt"), Buffer.alloc(186, 0));
  const r = detectCorruption(path.join(d, "tree-before.txt"));
  equal(r.corrupt, true, "NUL-filled file must be corrupt");
  equal(r.reason, "CONTAINS_NUL_BYTES", "reason");
});

test("corruption detection covers zero-length, all-whitespace and malformed JSON", () => {
  const d = mkdir("C-shapes");
  fs.writeFileSync(path.join(d, "a.txt"), "");
  fs.writeFileSync(path.join(d, "b.txt"), "     \n\t  \n");
  fs.writeFileSync(path.join(d, "c.json"), "{not json");
  equal(detectCorruption(path.join(d, "a.txt")).reason, "ZERO_LENGTH", "zero length");
  equal(detectCorruption(path.join(d, "b.txt")).reason, "ALL_WHITESPACE", "all whitespace");
  equal(detectCorruption(path.join(d, "c.json")).reason, "MALFORMED_JSON", "malformed json");
  const scan = scanAttemptCorruption(d);
  equal(scan.corrupt, true, "directory scan must report corruption");
  equal(scan.findings.length, 3, "all three findings");
});

test("a healthy attempt directory scans clean", () => {
  const d = mkdir("C-clean");
  fs.writeFileSync(path.join(d, "00-allocated.json"), JSON.stringify({ ok: true }));
  fs.writeFileSync(path.join(d, "tree-before.txt"), "?? .vscode/\n");
  equal(scanAttemptCorruption(d).corrupt, false, "must be clean");
});

test("RECOVERY ADJUDICATION OVERRIDES a COMPLETED_PASS terminal — the R16 defect", () => {
  const d = mkdir("C-adj");
  fs.writeFileSync(path.join(d, "00-allocated.json"), JSON.stringify({ ok: true }));
  fs.writeFileSync(path.join(d, "20-completed-pass.json"), JSON.stringify({ exitCode: 0 }));
  fs.writeFileSync(path.join(d, "40-recovery-adjudication.json"), JSON.stringify({
    defect: "ABORTED_IMPORT_CORRUPTED_COPY", disposition: "INVALID_PARTIAL_IMPORT_NON_CONTROLLING"
  }));
  const r = resolveDisposition({ dir: d, rawStatus: "COMPLETED_PASS", provenanceValid: true });
  equal(r.controlling, false, "an adjudicated-invalid attempt must NOT be controlling");
  equal(r.disposition, DISPOSITIONS.INVALID_PARTIAL_IMPORT, "disposition");
});

test("corruption outranks even a clean adjudication", () => {
  const d = mkdir("C-corrupt-first");
  fs.writeFileSync(path.join(d, "20-completed-pass.json"), JSON.stringify({ exitCode: 0 }));
  fs.writeFileSync(path.join(d, "tree-before.txt"), Buffer.alloc(64, 0));
  const r = resolveDisposition({ dir: d, rawStatus: "COMPLETED_PASS", provenanceValid: true });
  equal(r.disposition, DISPOSITIONS.CORRUPTED_EVIDENCE, "corruption wins");
  equal(r.controlling, false, "must not be controlling");
});

test("invalid provenance makes an attempt non-controlling", () => {
  const d = mkdir("C-prov");
  fs.writeFileSync(path.join(d, "20-completed-pass.json"), JSON.stringify({ exitCode: 0 }));
  const r = resolveDisposition({ dir: d, rawStatus: "COMPLETED_PASS", provenanceValid: false });
  equal(r.disposition, DISPOSITIONS.INVALID_PROVENANCE, "disposition");
  equal(r.controlling, false, "must not be controlling");
});

test("a clean passing attempt is VALID_CONTROLLING", () => {
  const d = mkdir("C-good");
  fs.writeFileSync(path.join(d, "00-allocated.json"), JSON.stringify({ ok: true }));
  fs.writeFileSync(path.join(d, "20-completed-pass.json"), JSON.stringify({ exitCode: 0 }));
  const r = resolveDisposition({ dir: d, rawStatus: "COMPLETED_PASS", provenanceValid: true });
  equal(r.disposition, DISPOSITIONS.VALID_CONTROLLING, "disposition");
  equal(r.controlling, true, "must be controlling");
});

test("a malformed adjudication is treated as corrupt, not ignored", () => {
  const d = mkdir("C-adj-bad");
  fs.writeFileSync(path.join(d, "20-completed-pass.json"), JSON.stringify({ exitCode: 0 }));
  fs.writeFileSync(path.join(d, "40-recovery-adjudication.json"), "{broken");
  const r = resolveDisposition({ dir: d, rawStatus: "COMPLETED_PASS", provenanceValid: true });
  equal(r.controlling, false, "must not be controlling");
});

// ── RETRY LINKAGE ────────────────────────────────────────────────────────────

test("an unlinked rerun is NOT counted as a retry — the R16 defect", () => {
  const recs = [
    { attemptId: "A1", retryOf: null, runtimeCommit: "R" },
    { attemptId: "A2", retryOf: null, runtimeCommit: "R" },
    { attemptId: "A3", retryOf: null, runtimeCommit: "R" }
  ];
  const r = validateRetryLinks(recs);
  equal(r.validRetryCount, 0, "unlinked reruns must not count as retries");
  const groups = computeRetryCeiling(recs.map((x) => ({ ...x, cycleKey: "det" })));
  const g = Object.values(groups)[0];
  equal(g.linkedRetries, 0, "no linked retries");
  equal(g.ceilingReached, false, "a ceiling cannot be reached without links");
});

test("valid linked retries are counted and reach the ceiling", () => {
  const recs = [
    { attemptId: "A1", retryOf: null, runtimeCommit: "R", cycleKey: "det" },
    { attemptId: "A2", retryOf: "A1", retryReason: "TECHNICAL", runtimeCommit: "R", cycleKey: "det" },
    { attemptId: "A3", retryOf: "A2", retryReason: "TECHNICAL", runtimeCommit: "R", cycleKey: "det" }
  ];
  const r = validateRetryLinks(recs);
  equal(r.validRetryCount, 2, "two linked retries");
  equal(r.valid, true, `errors: ${JSON.stringify(r.errors)}`);
  const g = Object.values(computeRetryCeiling(recs))[0];
  equal(g.linkedRetries, 2, "linked retries");
  equal(g.ceilingReached, true, "ceiling reached at two linked retries");
});

test("a retry pointing at a missing target is rejected", () => {
  const r = validateRetryLinks([{ attemptId: "A2", retryOf: "NOPE", retryReason: "TECHNICAL", runtimeCommit: "R" }]);
  equal(r.valid, false, "must be invalid");
  check(r.errors.some((e) => e.error === "RETRY_TARGET_MISSING"), `errors: ${JSON.stringify(r.errors)}`);
});

test("a retry without a reason is rejected", () => {
  const r = validateRetryLinks([
    { attemptId: "A1", retryOf: null, runtimeCommit: "R" },
    { attemptId: "A2", retryOf: "A1", runtimeCommit: "R" }
  ]);
  check(r.errors.some((e) => e.error === "RETRY_REASON_ABSENT"), `errors: ${JSON.stringify(r.errors)}`);
});

test("a retry on a CHANGED runtime is rejected as a same-runtime retry", () => {
  const r = validateRetryLinks([
    { attemptId: "A1", retryOf: null, runtimeCommit: "R1" },
    { attemptId: "A2", retryOf: "A1", retryReason: "TECHNICAL", runtimeCommit: "R2" }
  ]);
  equal(r.validRetryCount, 0, "must not count");
  check(r.errors.some((e) => e.error === "RETRY_RUNTIME_CHANGED"), `errors: ${JSON.stringify(r.errors)}`);
});

test("cyclic retry links are detected and excluded", () => {
  const r = validateRetryLinks([
    { attemptId: "A1", retryOf: "A2", retryReason: "T", runtimeCommit: "R" },
    { attemptId: "A2", retryOf: "A1", retryReason: "T", runtimeCommit: "R" }
  ]);
  check(r.errors.some((e) => e.error === "RETRY_CYCLE"), `errors: ${JSON.stringify(r.errors)}`);
  equal(r.validRetryCount, 0, "cyclic retries must not count");
});

test("a self-link is rejected", () => {
  const r = validateRetryLinks([{ attemptId: "A1", retryOf: "A1", retryReason: "T", runtimeCommit: "R" }]);
  check(r.errors.some((e) => e.error === "RETRY_SELF_LINK"), `errors: ${JSON.stringify(r.errors)}`);
});

fs.rmSync(ROOT, { recursive: true, force: true });
console.log(`\nphase-10a14-r17-validators: ${passed} passed, ${failed} failed`);
if (failed) { console.error(failures.join("\n")); process.exit(1); }
console.log("PHASE-10A14-R17 VALIDATORS PASS — Git-truth provenance, adjudication precedence, retry linkage.");
