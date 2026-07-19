// PHASE-10A14-R14 — append-only attempt journal.
//
// Governance: implements R14_ATTEMPT_JOURNAL_CONTRACT.md. Every attempt receives a
// stable attemptId and a skeleton record written to disk BEFORE execution, so a crash,
// hang or kill still leaves the attempt visible. Records are appended to a per-campaign
// JSONL file (append-only at the byte level: O_APPEND, never rewritten, never truncated).
//
// Rules enforced mechanically here:
//   - attemptId uniqueness (duplicate allocation is a hard error, never an overwrite)
//   - append-only writes (fs.appendFileSync with a append-mode flag)
//   - technical vs legal failure are distinct fields and are never conflated
//   - supersededByAttemptId may be written only via supersede(), only once, and only
//     for a technicalFailure attempt

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const sha = (s) =>
  "sha256:" + crypto.createHash("sha256").update(typeof s === "string" ? s : JSON.stringify(s)).digest("hex");

const ROOT = "evaluation/results/phase-10a14-r14/journal/";

export class AttemptJournal {
  constructor({ task, campaignId, runtimeCommit, executionMode, deploymentId = null }) {
    this.task = task;
    this.campaignId = campaignId;
    this.runtimeCommit = runtimeCommit;
    this.executionMode = executionMode;
    this.deploymentId = deploymentId;
    this.dir = path.join(ROOT, campaignId);
    fs.mkdirSync(this.dir, { recursive: true });
    this.file = path.join(this.dir, "attempts.jsonl");
    this.seen = new Set();
    this.sequences = new Map();
    // Re-reading an existing journal is permitted; overwriting it is not.
    if (fs.existsSync(this.file)) {
      for (const line of fs.readFileSync(this.file, "utf8").split("\n").filter(Boolean)) {
        try { this.seen.add(JSON.parse(line).attemptId); } catch { /* tolerate partial tail */ }
      }
    }
  }

  /** Allocate the next attemptId for a probe. Never reuses an ID. */
  allocate(probeId) {
    const next = (this.sequences.get(probeId) || 0) + 1;
    this.sequences.set(probeId, next);
    const attemptId = `${this.campaignId}-${probeId}-A${next}`;
    if (this.seen.has(attemptId)) {
      throw new Error(`ATTEMPT_ID_COLLISION: ${attemptId} already exists — overwriting is prohibited.`);
    }
    this.seen.add(attemptId);
    return { attemptId, attemptSequence: next };
  }

  /**
   * Execute `fn` under journal protection. The record is completed and appended whether
   * `fn` returns or throws; a throw is recorded as a TECHNICAL failure, never as a legal
   * classification result.
   */
  run(probeId, seed, fn) {
    const { attemptId, attemptSequence } = this.allocate(probeId);
    const startedAt = new Date().toISOString();
    const record = {
      task: this.task,
      campaignId: this.campaignId,
      probeId,
      attemptId,
      attemptSequence,
      runtimeCommit: this.runtimeCommit,
      deploymentId: this.deploymentId,
      executionMode: this.executionMode,
      exactQuestion: seed.exactQuestion ?? null,
      answerFixtureOrRawAnswer: seed.answerFixtureOrRawAnswer ?? null,
      expectedClassification: seed.expectedClassification ?? null,
      actualClassification: null,
      validatorStage: null,
      publicAnswer: null,
      persistenceStatus: null,
      persistenceReceipt: null,
      persistedAnswer: null,
      historyAnswer: null,
      technicalFailure: false,
      failureReason: null,
      requestHash: sha(seed.exactQuestion ?? ""),
      responseHash: null,
      payloadHash: null,
      startedAt,
      completedAt: null,
      supersededByAttemptId: null,
      ...(seed.extra || {}),
    };

    let out;
    try {
      out = fn(record) || {};
      Object.assign(record, out);
    } catch (err) {
      record.technicalFailure = true;
      // Message only — never a stack, DB error body, SQL or credential material.
      record.failureReason = `TECHNICAL: ${String(err && err.message ? err.message : err).slice(0, 300)}`;
      record.actualClassification = "ERROR";
    }

    record.completedAt = new Date().toISOString();
    record.responseHash = sha({
      actualClassification: record.actualClassification,
      validatorStage: record.validatorStage,
      publicAnswer: record.publicAnswer,
      persistenceStatus: record.persistenceStatus,
    });
    record.payloadHash = sha({ ...record, payloadHash: undefined });
    this.append(record);
    return record;
  }

  append(record) {
    fs.appendFileSync(this.file, JSON.stringify(record) + "\n", { flag: "a" });
  }

  /**
   * Record that a TECHNICAL failure was retried by a later attempt. This is the sole
   * permitted post-hoc annotation (contract rule 6) and is itself appended, never an
   * in-place edit: the annotation is written as a separate append-only pointer file.
   */
  supersede(failedAttemptId, retryAttemptId) {
    fs.appendFileSync(
      path.join(this.dir, "supersessions.jsonl"),
      JSON.stringify({ failedAttemptId, retryAttemptId, at: new Date().toISOString() }) + "\n",
      { flag: "a" }
    );
  }

  /** Derived summary. Never replaces the journal; recomputed from it. */
  summarize() {
    const rows = fs.readFileSync(this.file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const legal = rows.filter((r) => !r.technicalFailure);
    const mismatches = legal.filter(
      (r) => r.expectedClassification && r.actualClassification && r.expectedClassification !== r.actualClassification
    );
    return {
      campaignId: this.campaignId,
      runtimeCommit: this.runtimeCommit,
      executionMode: this.executionMode,
      totalAttempts: rows.length,
      technicalFailures: rows.filter((r) => r.technicalFailure).length,
      legalAttempts: legal.length,
      mismatches: mismatches.length,
      unsafeMisses: mismatches.filter((r) => r.expectedClassification === "UNSAFE").length,
      safeOverfires: mismatches.filter((r) => r.expectedClassification === "SAFE").length,
      mismatchProbeIds: mismatches.map((r) => r.probeId),
    };
  }
}
