// PHASE-10A14-R16 — immutable evidence capture and canonical import.
//
// Implements R16_IMMUTABLE_EVIDENCE_CONTRACT.md, frozen and pushed at COMMIT 1 before
// this file existed.
//
// Design constraints taken directly from the contract:
//   - one permanent directory per attempt;
//   - every event file written with EXCLUSIVE creation and fsynced;
//   - durability proven by reading the bytes back (stat metadata lags on Windows);
//   - clean-tree-sensitive work is captured OUTSIDE the repository and imported after;
//   - import verifies every hash after copy;
//   - THERE IS NO FUNCTION HERE THAT DELETES, ARCHIVES, CONVERTS, COMPACTS OR
//     OVERWRITES A CANONICAL ATTEMPT. That absence is deliberate and is the remediation
//     of P1-R15-IR-004.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

export const REPO = "C:/Projects/tina-backend";
export const CANONICAL_ROOT = "evaluation/results/phase-10a14-r16/attempts";
export const EXTERNAL_ROOT = path.join(os.tmpdir(), "tina-r16-capture");

export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const shaFile = (f) => sha256(fs.readFileSync(f));

export const TERMINALS = Object.freeze({
  COMPLETED_PASS: "20-completed-pass.json",
  COMPLETED_FAIL: "20-completed-fail.json",
  TECHNICAL_FAILURE: "20-technical-failure.json",
  TIMEOUT: "20-timeout.json",
  KILLED: "20-killed.json",
  CANCELLED: "20-cancelled.json"
});
const TERMINAL_FILES = new Set(Object.values(TERMINALS));

/** Exclusive-creation write + fsync + content read-back. Never overwrites. */
export function writeImmutable(dir, name, payload) {
  const file = path.join(dir, name);
  const body = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2) + "\n";
  let fd;
  try {
    fd = fs.openSync(file, "wx");
  } catch (e) {
    if (e && e.code === "EEXIST") throw new Error(`IMMUTABLE_FILE_EXISTS: ${file} — evidence files are never rewritten.`);
    throw e;
  }
  try { fs.writeFileSync(fd, body); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  try { const d = fs.openSync(dir, "r"); fs.fsyncSync(d); fs.closeSync(d); } catch { /* not supported on this platform */ }
  // Durability is verified by READING THE BYTES BACK. statSync can report size 0
  // immediately after close on Windows even when the data is fully written, so a size
  // check would be wrong. Emptiness is NOT a durability failure: the contract explicitly
  // permits stdout.raw.txt and stderr.raw.txt to be empty, and a process that produced no
  // stderr must still yield a valid, present evidence file.
  let back;
  try { back = fs.readFileSync(file, "utf8"); }
  catch (e) { throw new Error(`EVIDENCE_NOT_DURABLE: ${file} — unreadable after fsync (${e.code || e.message})`); }
  if (back !== body) throw new Error(`EVIDENCE_NOT_DURABLE: ${file} — read-back does not match written bytes`);
  if (name.endsWith(".json")) {
    try { JSON.parse(back); }
    catch { /* a deliberately malformed event may be written by a test; presence is what durability means */ }
  }
  return file;
}

const gitOut = (cmd) => { try { return execSync(cmd, { cwd: REPO, encoding: "utf8" }).trim(); } catch { return "UNAVAILABLE"; } };
export const headCommit = () => gitOut("git rev-parse HEAD");
export const syncCounts = () => gitOut("git rev-list --left-right --count @{u}...HEAD");
export const treeState = () => gitOut("git status --porcelain");
export const treeClean = () => treeState().split("\n").filter((l) => l && !l.startsWith("??")).length === 0;

/**
 * Allocate an attempt in the EXTERNAL capture root, before the governed action runs.
 * Returns the external directory; nothing is written inside the repository.
 */
export function allocateExternal({ attemptId, task, attemptType, campaignId, generationId = null, probeId = null, command, runtimeCommit, notes = null, retryOf = null }) {
  fs.mkdirSync(EXTERNAL_ROOT, { recursive: true });
  const dir = path.join(EXTERNAL_ROOT, attemptId);
  try {
    fs.mkdirSync(dir, { recursive: false });
  } catch (e) {
    if (e && e.code === "EEXIST") throw new Error(`ATTEMPT_ID_COLLISION: ${attemptId}`);
    throw e;
  }
  writeImmutable(dir, "00-allocated.json", {
    event: "ALLOCATED", attemptId, task, attemptType, campaignId, generationId, probeId,
    runtimeCommit, retryOf, notes,
    headAtStart: headCommit(), syncAtStart: syncCounts(), treeCleanBefore: treeClean(),
    allocatedAt: new Date().toISOString()
  });
  writeImmutable(dir, "command.txt", String(command) + "\n");
  writeImmutable(dir, "tree-before.txt", treeState() + "\n");
  writeImmutable(dir, "environment.json", {
    node: process.version, platform: process.platform, arch: process.arch,
    cwd: REPO, capturedAt: new Date().toISOString()
    // No environment VALUES are recorded — never secrets.
  });
  if (retryOf) writeImmutable(dir, "30-retry-of.json", { event: "RETRY_OF", attemptId, retryOf, at: new Date().toISOString() });
  return dir;
}

export function markStartedExternal(dir, info = {}) {
  return writeImmutable(dir, "10-started.json", { event: "STARTED", startedAt: new Date().toISOString(), ...info });
}

/** Write the single terminal event. A second terminal is a hard error. */
export function markTerminalExternal(dir, terminalFile, payload = {}) {
  if (!TERMINAL_FILES.has(terminalFile)) throw new Error(`NOT_A_TERMINAL_FILE: ${terminalFile}`);
  const existing = fs.readdirSync(dir).filter((f) => TERMINAL_FILES.has(f));
  if (existing.length) throw new Error(`TERMINAL_ALREADY_PRESENT: ${existing.join(", ")}`);
  return writeImmutable(dir, terminalFile, { event: terminalFile.replace(/^20-|\.json$/g, "").toUpperCase().replace(/-/g, "_"), endedAt: new Date().toISOString(), ...payload });
}

/** Finalize: raw streams, post-state, and the hash file covering every other file. */
export function finalizeExternal(dir, { stdout = "", stderr = "" } = {}) {
  if (!fs.existsSync(path.join(dir, "stdout.raw.txt"))) writeImmutable(dir, "stdout.raw.txt", String(stdout));
  if (!fs.existsSync(path.join(dir, "stderr.raw.txt"))) writeImmutable(dir, "stderr.raw.txt", String(stderr));
  if (!fs.existsSync(path.join(dir, "tree-after.txt"))) writeImmutable(dir, "tree-after.txt", treeState() + "\n");
  const files = fs.readdirSync(dir).filter((f) => f !== "hashes.sha256").sort();
  const lines = files.map((f) => `${shaFile(path.join(dir, f))}  ${f}`);
  writeImmutable(dir, "hashes.sha256", lines.join("\n") + "\n");
  return files.length;
}

/**
 * Copy the complete external attempt into the canonical repository path and verify every
 * hash after copy. Never overwrites an existing canonical attempt. A mismatch aborts and
 * deletes nothing.
 */
export function importCanonical(attemptId) {
  const src = path.join(EXTERNAL_ROOT, attemptId);
  const dest = path.join(REPO, CANONICAL_ROOT, attemptId);
  if (!fs.existsSync(src)) throw new Error(`NO_EXTERNAL_ATTEMPT: ${src}`);
  if (fs.existsSync(dest)) throw new Error(`CANONICAL_ATTEMPT_EXISTS: ${attemptId} — canonical evidence is never overwritten.`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, errorOnExist: true, force: false });

  // Post-copy verification against the pre-import hash file.
  const hashFile = path.join(dest, "hashes.sha256");
  if (!fs.existsSync(hashFile)) throw new Error(`IMPORT_MISSING_HASHES: ${attemptId}`);
  const expected = fs.readFileSync(hashFile, "utf8").split("\n").filter(Boolean);
  const mismatches = [], missing = [];
  for (const line of expected) {
    const [h, name] = line.split(/\s{2}/);
    const f = path.join(dest, name);
    if (!fs.existsSync(f)) { missing.push(name); continue; }
    if (shaFile(f) !== h) mismatches.push(name);
  }
  if (mismatches.length || missing.length) {
    throw new Error(`IMPORT_VERIFICATION_FAILED: ${attemptId} mismatched=${mismatches.join(",")} missing=${missing.join(",")}`);
  }
  return { attemptId, dest, verifiedFiles: expected.length };
}

/** Read one canonical attempt into a registry record. Never mutates it. */
export function readCanonicalAttempt(attemptId, root = path.join(REPO, CANONICAL_ROOT)) {
  const dir = path.join(root, attemptId);
  const files = fs.readdirSync(dir);
  const readJson = (n) => {
    if (!files.includes(n)) return null;
    try { return JSON.parse(fs.readFileSync(path.join(dir, n), "utf8")); } catch { return "MALFORMED"; }
  };
  const alloc = readJson("00-allocated.json");
  const started = readJson("10-started.json");
  const terminalName = files.find((f) => TERMINAL_FILES.has(f)) || null;
  const terminal = terminalName ? readJson(terminalName) : null;
  const retryOf = readJson("30-retry-of.json");
  const supersedes = readJson("30-supersedes.json");

  let status;
  if (!terminalName) status = alloc && alloc !== "MALFORMED" ? "INCOMPLETE" : "INCOMPLETE";
  else status = {
    "20-completed-pass.json": "COMPLETED_PASS", "20-completed-fail.json": "COMPLETED_FAIL",
    "20-technical-failure.json": "TECHNICAL_FAILURE", "20-timeout.json": "TIMEOUT",
    "20-killed.json": "KILLED", "20-cancelled.json": "CANCELLED"
  }[terminalName];

  const a = alloc && alloc !== "MALFORMED" ? alloc : {};
  const t = terminal && terminal !== "MALFORMED" ? terminal : {};
  return {
    attemptId, task: a.task ?? null, attemptType: a.attemptType ?? null,
    campaignId: a.campaignId ?? null, generationId: a.generationId ?? null, probeId: a.probeId ?? null,
    command: files.includes("command.txt") ? fs.readFileSync(path.join(dir, "command.txt"), "utf8").trim() : null,
    runtimeCommit: a.runtimeCommit ?? null,
    headAtStart: a.headAtStart ?? null, headAtEnd: t.headAtEnd ?? null,
    treeCleanBefore: a.treeCleanBefore ?? null, treeCleanAfter: t.treeCleanAfter ?? null,
    startedAt: (started && started !== "MALFORMED" ? started.startedAt : null) ?? a.allocatedAt ?? null,
    endedAt: t.endedAt ?? null,
    exitCode: t.exitCode ?? null, signal: t.signal ?? null,
    status,
    technicalFailure: status === "TECHNICAL_FAILURE" || status === "TIMEOUT",
    legalMismatch: status === "COMPLETED_FAIL",
    environmentFailure: Boolean(t.environmentFailure) || false,
    retryOf: (retryOf && retryOf !== "MALFORMED" ? retryOf.retryOf : null) ?? a.retryOf ?? null,
    supersededBy: (supersedes && supersedes !== "MALFORMED" ? supersedes.supersededBy : null) ?? null,
    controlling: Boolean(t.controlling) || false,
    logPath: `${CANONICAL_ROOT}/${attemptId}/stdout.raw.txt`,
    evidencePath: `${CANONICAL_ROOT}/${attemptId}`,
    evidenceHash: files.includes("hashes.sha256") ? sha256(fs.readFileSync(path.join(dir, "hashes.sha256"))) : null,
    serverReportedRuntimeCommit: t.serverReportedRuntimeCommit ?? null,
    deploymentId: t.deploymentId ?? null,
    malformed: alloc === "MALFORMED" || started === "MALFORMED" || terminal === "MALFORMED",
    notes: a.notes ?? null
  };
}

export function listCanonicalAttempts(root = path.join(REPO, CANONICAL_ROOT)) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory()).sort();
}

export default {
  allocateExternal, markStartedExternal, markTerminalExternal, finalizeExternal,
  importCanonical, readCanonicalAttempt, listCanonicalAttempts, writeImmutable,
  TERMINALS, CANONICAL_ROOT, EXTERNAL_ROOT, sha256, headCommit, syncCounts, treeState, treeClean
};
