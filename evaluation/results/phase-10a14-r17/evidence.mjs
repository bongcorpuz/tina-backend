// PHASE-10A14-R17 — immutable evidence capture with Git-derived provenance.
//
// Supersedes the R16 tooling prospectively under the R17 evidence directory. The R16
// structure is retained (one permanent directory per attempt, exclusive creation, fsync,
// byte read-back, external capture then verified canonical import, no destructive path),
// with one decisive change: THE CALLER CANNOT SUPPLY A CONTROLLING SHA.
//
// R16 accepted a caller-supplied runtimeCommit and never asked Git whether it was real,
// which is how a fabricated SHA reached 11 attempts. Here every SHA is read from Git at
// allocation time and independently validated.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { validateSha } from "./validators.mjs";

export const REPO = "C:/Projects/tina-backend";
export const CANONICAL_ROOT = "evaluation/results/phase-10a14-r17/attempts";
export const EXTERNAL_ROOT = path.join(os.tmpdir(), "tina-r17-capture");

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

export function writeImmutable(dir, name, payload) {
  const file = path.join(dir, name);
  const body = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2) + "\n";
  let fd;
  try { fd = fs.openSync(file, "wx"); }
  catch (e) {
    if (e && e.code === "EEXIST") throw new Error(`IMMUTABLE_FILE_EXISTS: ${file}`);
    throw e;
  }
  try { fs.writeFileSync(fd, body); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  try { const d = fs.openSync(dir, "r"); fs.fsyncSync(d); fs.closeSync(d); } catch { /* unsupported */ }
  const back = fs.readFileSync(file, "utf8");
  if (back !== body) throw new Error(`EVIDENCE_NOT_DURABLE: ${file}`);
  return file;
}

const gitOut = (cmd) => { try { return execSync(cmd, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28 }).trim(); } catch { return "UNAVAILABLE"; } };
export const headCommit = () => gitOut("git rev-parse HEAD");
export const syncCounts = () => gitOut("git rev-list --left-right --count @{u}...HEAD");
export const treeState = () => gitOut("git status --porcelain");
export const treeClean = () => treeState().split("\n").filter((l) => l && !l.startsWith("??")).length === 0;

/**
 * Allocate externally. runtimeCommit is READ FROM GIT, never accepted from the caller,
 * and is validated as a real commit object before the attempt is permitted to proceed.
 */
export function allocateExternal({ attemptId, task, attemptType, campaignId, probeId = null, command, cycleKey = null, retryOf = null, retryReason = null, expectedAncestorOf = null, notes = null }) {
  fs.mkdirSync(EXTERNAL_ROOT, { recursive: true });
  const dir = path.join(EXTERNAL_ROOT, attemptId);
  try { fs.mkdirSync(dir, { recursive: false }); }
  catch (e) {
    if (e && e.code === "EEXIST") throw new Error(`ATTEMPT_ID_COLLISION: ${attemptId}`);
    throw e;
  }

  const head = headCommit();
  const headCheck = validateSha(head, { expectedAncestorOf: null, cwd: REPO });
  if (!headCheck.valid) {
    throw new Error(`PROVENANCE_REFUSED_AT_ALLOCATION: HEAD ${head} failed validation (${headCheck.errors.join(",")})`);
  }
  if (expectedAncestorOf) {
    const anc = validateSha(expectedAncestorOf, { cwd: REPO });
    if (!anc.valid) throw new Error(`PROVENANCE_REFUSED_AT_ALLOCATION: expectedAncestorOf invalid (${anc.errors.join(",")})`);
  }

  writeImmutable(dir, "00-allocated.json", {
    event: "ALLOCATED", attemptId, task, attemptType, campaignId, probeId, cycleKey,
    runtimeCommit: head,                 // Git-derived, never caller-supplied
    runtimeCommitSource: "git rev-parse HEAD",
    headAtStart: head, syncAtStart: syncCounts(), treeCleanBefore: treeClean(),
    retryOf, retryReason, notes,
    allocatedAt: new Date().toISOString()
  });
  writeImmutable(dir, "command.txt", String(command) + "\n");
  writeImmutable(dir, "tree-before.txt", treeState() + "\n");
  writeImmutable(dir, "environment.json", {
    node: process.version, platform: process.platform, arch: process.arch,
    capturedAt: new Date().toISOString()   // no environment VALUES — never secrets
  });
  if (retryOf) {
    writeImmutable(dir, "30-retry-of.json", {
      event: "RETRY_OF", attemptId, retryOf, retryReason: retryReason ?? null,
      runtimeCommit: head, at: new Date().toISOString()
    });
  }
  return { dir, runtimeCommit: head };
}

export function markStartedExternal(dir, info = {}) {
  return writeImmutable(dir, "10-started.json", { event: "STARTED", startedAt: new Date().toISOString(), ...info });
}

export function markTerminalExternal(dir, terminalFile, payload = {}) {
  if (!TERMINAL_FILES.has(terminalFile)) throw new Error(`NOT_A_TERMINAL_FILE: ${terminalFile}`);
  const existing = fs.readdirSync(dir).filter((f) => TERMINAL_FILES.has(f));
  if (existing.length) throw new Error(`TERMINAL_ALREADY_PRESENT: ${existing.join(", ")}`);
  return writeImmutable(dir, terminalFile, {
    event: terminalFile.replace(/^20-|\.json$/g, "").toUpperCase().replace(/-/g, "_"),
    headAtEnd: headCommit(), treeCleanAfter: treeClean(),
    endedAt: new Date().toISOString(), ...payload
  });
}

export function finalizeExternal(dir, { stdout = "", stderr = "" } = {}) {
  if (!fs.existsSync(path.join(dir, "stdout.raw.txt"))) writeImmutable(dir, "stdout.raw.txt", String(stdout));
  if (!fs.existsSync(path.join(dir, "stderr.raw.txt"))) writeImmutable(dir, "stderr.raw.txt", String(stderr));
  if (!fs.existsSync(path.join(dir, "tree-after.txt"))) writeImmutable(dir, "tree-after.txt", treeState() + "\n");
  const files = fs.readdirSync(dir).filter((f) => f !== "hashes.sha256").sort();
  writeImmutable(dir, "hashes.sha256", files.map((f) => `${shaFile(path.join(dir, f))}  ${f}`).join("\n") + "\n");
  return files.length;
}

/** Copy file-by-file with explicit read/write/fsync/compare — never fs.cpSync. */
export function importCanonical(attemptId) {
  const src = path.join(EXTERNAL_ROOT, attemptId);
  const dest = path.join(REPO, CANONICAL_ROOT, attemptId);
  if (!fs.existsSync(src)) throw new Error(`NO_EXTERNAL_ATTEMPT: ${src}`);
  if (fs.existsSync(dest)) throw new Error(`CANONICAL_ATTEMPT_EXISTS: ${attemptId}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.mkdirSync(dest, { recursive: false });
  for (const name of fs.readdirSync(src).sort()) {
    const bytes = fs.readFileSync(path.join(src, name));
    const fd = fs.openSync(path.join(dest, name), "wx");
    try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    if (!fs.readFileSync(path.join(dest, name)).equals(bytes)) {
      throw new Error(`IMPORT_COPY_CORRUPTED: ${name}`);
    }
  }
  const hashFile = path.join(dest, "hashes.sha256");
  if (!fs.existsSync(hashFile)) throw new Error(`IMPORT_MISSING_HASHES: ${attemptId}`);
  const mismatches = [], missing = [];
  for (const line of fs.readFileSync(hashFile, "utf8").split("\n").filter(Boolean)) {
    const [h, name] = line.split(/\s{2}/);
    const f = path.join(dest, name);
    if (!fs.existsSync(f)) { missing.push(name); continue; }
    if (shaFile(f) !== h) mismatches.push(name);
  }
  if (mismatches.length || missing.length) {
    throw new Error(`IMPORT_VERIFICATION_FAILED: ${attemptId} mismatched=${mismatches.join(",")} missing=${missing.join(",")}`);
  }
  return { attemptId, dest, verifiedFiles: fs.readdirSync(dest).length };
}

export function listCanonicalAttempts(root = path.join(REPO, CANONICAL_ROOT)) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory()).sort();
}

export default {
  allocateExternal, markStartedExternal, markTerminalExternal, finalizeExternal,
  importCanonical, listCanonicalAttempts, writeImmutable,
  TERMINALS, CANONICAL_ROOT, EXTERNAL_ROOT, sha256, headCommit, syncCounts, treeState, treeClean
};
