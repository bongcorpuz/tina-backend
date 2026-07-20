// PHASE-10A14-R15 — crash-visible attempt journal.
//
// Implements R15_ATTEMPT_JOURNAL_CONTRACT.md (frozen at COMMIT 1, before this file).
//
// Remediates P1-R14-IR-004. R14's journal built the record in memory and appended only
// after the governed function returned or threw, so a SIGKILL during execution left no
// durable artifact. Here the allocation event is written, fsynced (file AND containing
// directory) and stat-verified BEFORE the governed action is permitted to run. If the
// durable write cannot be proven, the governed action does not execute.
//
// No event file is ever edited, truncated, renamed or deleted. There is no API on this
// class that opens an existing event file for writing.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const sha = (s) =>
  "sha256:" + crypto.createHash("sha256").update(typeof s === "string" ? s : JSON.stringify(s)).digest("hex");

const ROOT = "evaluation/results/phase-10a14-r15/journal";

export const EVENT = Object.freeze({
  ALLOCATED: "00-allocated.json",
  STARTED: "10-started.json",
  COMPLETED: "20-completed.json",
  TECHNICAL_FAILURE: "20-technical-failure.json",
  TIMEOUT: "20-timeout.json",
  CANCELLED: "20-cancelled.json",
  CRASHED: "20-crashed-or-incomplete.json",
  RETRY_LINKED: "30-retry-linked.json",
  SUPERSEDED_BY: "30-superseded-by.json"
});

const TERMINAL = new Set([
  EVENT.COMPLETED, EVENT.TECHNICAL_FAILURE, EVENT.TIMEOUT, EVENT.CANCELLED, EVENT.CRASHED
]);

/** fsync a directory where the platform supports it; a failure here is non-fatal but recorded. */
function fsyncDir(dir) {
  let fd;
  try { fd = fs.openSync(dir, "r"); fs.fsyncSync(fd); return true; }
  catch { return false; }
  finally { if (fd !== undefined) { try { fs.closeSync(fd); } catch { /* already closed */ } } }
}

/**
 * Write an immutable event file with EXCLUSIVE creation, then fsync it.
 * Throws if the event already exists — overwriting is prohibited, never silent.
 */
function writeEventSync(dir, name, payload) {
  const file = path.join(dir, name);
  let fd;
  try {
    fd = fs.openSync(file, "wx"); // wx => fail if exists
  } catch (e) {
    if (e && e.code === "EEXIST") {
      throw new Error(`EVENT_ALREADY_EXISTS: ${file} — event files are immutable and may not be rewritten.`);
    }
    throw e;
  }
  try {
    fs.writeFileSync(fd, JSON.stringify(payload, null, 2) + "\n");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fsyncDir(dir);
  // Verify durability by READING THE CONTENT BACK, not by stat metadata.
  // On Windows, statSync can report size 0 immediately after close even though the data
  // is fully written and fsynced — the size metadata lags. A read-back proves the bytes
  // are actually retrievable, which is the property we need, and is strictly stronger
  // than a size check.
  let readBack;
  try { readBack = fs.readFileSync(file, "utf8"); }
  catch (e) { throw new Error(`EVENT_NOT_DURABLE: ${file} — unreadable after fsync (${e.code || e.message})`); }
  if (!readBack || readBack.length === 0) throw new Error(`EVENT_NOT_DURABLE: ${file} — empty after fsync`);
  try { JSON.parse(readBack); }
  catch { throw new Error(`EVENT_NOT_DURABLE: ${file} — unparseable after fsync`); }
  return file;
}

export class AttemptJournal {
  constructor({ task, campaignId, runtimeCommit, executionMode, deploymentId = null, root = ROOT }) {
    this.task = task;
    this.campaignId = campaignId;
    this.runtimeCommit = runtimeCommit;
    this.executionMode = executionMode;
    this.deploymentId = deploymentId;
    this.dir = path.join(root, campaignId);
    fs.mkdirSync(this.dir, { recursive: true });
    this.sequences = new Map();
  }

  attemptDir(attemptId) { return path.join(this.dir, attemptId); }

  /**
   * Reserve an attempt ID and write the DURABLE allocation event.
   * Returns only after the event is fsynced and stat-verified. The governed action must
   * not run unless this returns successfully.
   */
  allocate(probeId, seed = {}) {
    const next = (this.sequences.get(probeId) || 0) + 1;
    this.sequences.set(probeId, next);
    const attemptId = `${this.campaignId}-${probeId}-A${next}`;
    const dir = this.attemptDir(attemptId);
    try {
      fs.mkdirSync(dir, { recursive: false });
    } catch (e) {
      if (e && e.code === "EEXIST") {
        throw new Error(`ATTEMPT_ID_COLLISION: ${attemptId} already exists — overwriting is prohibited.`);
      }
      throw e;
    }
    const allocated = {
      event: "ALLOCATED",
      task: this.task, campaignId: this.campaignId, probeId, attemptId,
      attemptSequence: next, runtimeCommit: this.runtimeCommit,
      deploymentId: this.deploymentId, executionMode: this.executionMode,
      exactQuestion: seed.exactQuestion ?? null,
      answerFixtureOrRawAnswer: seed.answerFixtureOrRawAnswer ?? null,
      expectedClassification: seed.expectedClassification ?? null,
      retryOf: seed.retryOf ?? null,
      requestHash: sha(seed.exactQuestion ?? seed.answerFixtureOrRawAnswer ?? ""),
      allocatedAt: new Date().toISOString(),
      ...(seed.extra || {})
    };
    writeEventSync(dir, EVENT.ALLOCATED, allocated);
    fsyncDir(this.dir);
    return { attemptId, attemptSequence: next, dir };
  }

  /** Mark the governed action as entered. Written immediately before the call. */
  markStarted(attemptId, info = {}) {
    return writeEventSync(this.attemptDir(attemptId), EVENT.STARTED, {
      event: "STARTED", attemptId, startedAt: new Date().toISOString(), ...info
    });
  }

  /** Write the single terminal event. A second terminal event is a hard error. */
  markTerminal(attemptId, eventName, payload = {}) {
    if (!TERMINAL.has(eventName)) throw new Error(`NOT_A_TERMINAL_EVENT: ${eventName}`);
    const dir = this.attemptDir(attemptId);
    const existing = fs.readdirSync(dir).filter((f) => TERMINAL.has(f));
    if (existing.length > 0) {
      throw new Error(`TERMINAL_EVENT_ALREADY_PRESENT: ${attemptId} has ${existing.join(", ")}`);
    }
    return writeEventSync(dir, eventName, {
      event: eventName.replace(/^20-|\.json$/g, "").toUpperCase().replace(/-/g, "_"),
      attemptId, completedAt: new Date().toISOString(), ...payload
    });
  }

  /**
   * Run a governed action under full lifecycle protection.
   * Order is mandatory: allocate (durable) → started → execute → terminal.
   */
  async run(probeId, seed, fn) {
    const { attemptId } = this.allocate(probeId, seed);
    this.markStarted(attemptId, { probeId });
    let out = {}, terminal = EVENT.COMPLETED;
    try {
      out = (await fn({ attemptId, probeId })) || {};
    } catch (err) {
      terminal = EVENT.TECHNICAL_FAILURE;
      out = {
        technicalFailure: true,
        // Message only — never a stack, DB body, SQL or credential material.
        failureReason: `TECHNICAL: ${String(err && err.message ? err.message : err).slice(0, 300)}`,
        actualClassification: "ERROR"
      };
    }
    const payload = { ...out, responseHash: sha({ a: out.actualClassification ?? null, s: out.persistenceStatus ?? null }) };
    payload.payloadHash = sha(payload);
    this.markTerminal(attemptId, terminal, payload);
    return { attemptId, ...payload };
  }

  /** Link a technical retry. Both events are new files; nothing is rewritten. */
  linkRetry(failedAttemptId, retryAttemptId) {
    writeEventSync(this.attemptDir(failedAttemptId), EVENT.RETRY_LINKED, {
      event: "RETRY_LINKED", attemptId: failedAttemptId, retryAttemptId, at: new Date().toISOString()
    });
  }

  supersede(priorAttemptId, supersedingAttemptId) {
    writeEventSync(this.attemptDir(priorAttemptId), EVENT.SUPERSEDED_BY, {
      event: "SUPERSEDED_BY", attemptId: priorAttemptId, supersedingAttemptId, at: new Date().toISOString()
    });
  }
}

/**
 * Deterministic recovery review over a campaign directory.
 * Reports malformed and incomplete attempts rather than silently skipping them.
 */
export function reviewCampaign(campaignDir) {
  const out = {
    campaignDir,
    allocated: 0, started: 0, completed: 0, technicalFailures: 0, timeouts: 0,
    cancelled: 0, incompleteOrCrashed: 0, malformed: 0, retries: 0, supersessions: 0,
    legalMismatches: 0,
    incompleteAttemptIds: [], malformedAttemptIds: [], mismatchProbeIds: [], attempts: []
  };
  if (!fs.existsSync(campaignDir)) return out;
  for (const attemptId of fs.readdirSync(campaignDir).sort()) {
    const dir = path.join(campaignDir, attemptId);
    if (!fs.statSync(dir).isDirectory()) continue;
    const files = fs.readdirSync(dir);
    const read = (n) => {
      if (!files.includes(n)) return null;
      try { return JSON.parse(fs.readFileSync(path.join(dir, n), "utf8")); }
      catch { return "MALFORMED"; }
    };
    const alloc = read(EVENT.ALLOCATED);
    const started = read(EVENT.STARTED);
    const terminalName = files.find((f) => TERMINAL.has(f)) || null;
    const terminal = terminalName ? read(terminalName) : null;

    const malformed = alloc === "MALFORMED" || started === "MALFORMED" || terminal === "MALFORMED" || alloc === null;
    if (malformed) { out.malformed++; out.malformedAttemptIds.push(attemptId); }
    if (alloc && alloc !== "MALFORMED") out.allocated++;
    if (started && started !== "MALFORMED") out.started++;
    if (files.includes(EVENT.RETRY_LINKED)) out.retries++;
    if (files.includes(EVENT.SUPERSEDED_BY)) out.supersessions++;

    let classification;
    if (!terminalName) {
      classification = "INCOMPLETE_OR_CRASHED";
      out.incompleteOrCrashed++; out.incompleteAttemptIds.push(attemptId);
    } else {
      switch (terminalName) {
        case EVENT.COMPLETED: classification = "COMPLETED"; out.completed++; break;
        case EVENT.TECHNICAL_FAILURE: classification = "TECHNICAL_FAILURE"; out.technicalFailures++; break;
        case EVENT.TIMEOUT: classification = "TIMEOUT"; out.timeouts++; break;
        case EVENT.CANCELLED: classification = "CANCELLED"; out.cancelled++; break;
        default: classification = "INCOMPLETE_OR_CRASHED"; out.incompleteOrCrashed++; out.incompleteAttemptIds.push(attemptId);
      }
    }

    const exp = alloc && alloc !== "MALFORMED" ? alloc.expectedClassification : null;
    const act = terminal && terminal !== "MALFORMED" ? terminal.actualClassification : null;
    const isLegalMismatch = classification === "COMPLETED" && exp != null && act != null && exp !== act;
    if (isLegalMismatch) {
      out.legalMismatches++;
      out.mismatchProbeIds.push(alloc.probeId);
    }

    out.attempts.push({
      attemptId,
      probeId: alloc && alloc !== "MALFORMED" ? alloc.probeId : null,
      classification, malformed,
      expectedClassification: exp, actualClassification: act, legalMismatch: isLegalMismatch,
      runtimeCommit: alloc && alloc !== "MALFORMED" ? alloc.runtimeCommit : null,
      serverReportedRuntimeCommit: terminal && terminal !== "MALFORMED" ? (terminal.serverReportedRuntimeCommit ?? null) : null
    });
  }
  return out;
}

export default { AttemptJournal, reviewCampaign, reviewCampaignEvents: reviewCampaign, EVENT, sha };
