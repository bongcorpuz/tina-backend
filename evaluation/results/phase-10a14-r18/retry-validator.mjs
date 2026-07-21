// PHASE-10A14-R18 — retry-link validator (P1-R17-IR1-001).
//
// A retry link is valid only if runtime, harness, dependency, environment and command
// identity are all unchanged, the structural link is sound, and the evidence-HEAD delta
// contains ONLY authorized evidence/report paths.
//
// Evidence HEAD is permitted to move; that is the R17 fix. It is permitted to move only
// because committed evidence moved it, and that is verified rather than assumed.
import {
  changedFilesBetween, isAuthorizedEvidencePath,
  FROZEN_RETRY_REASONS, treeDigest, validateGitCommit
} from "./identity.mjs";

/**
 * @param {object[]} attempts  registry attempt records
 * @param {object}   opts      { verifyEvidenceDelta } — off for synthetic controls whose
 *                             evidence SHAs are not real commits in this repository
 */
export function validateRetryLinks(attempts, opts = {}) {
  const { verifyEvidenceDelta = true } = opts;
  const byId = new Map(attempts.map((a) => [a.attemptId, a]));
  const validRetries = [];
  const errors = [];

  // `detail` is spread BEFORE `error` so a detail key can never overwrite the error code.
  // Spreading it after silently masked RETRY_FORGED_BASELINE as its own inner cause.
  const fail = (attemptId, error, detail) => errors.push({ ...detail, attemptId, error });

  for (const b of attempts) {
    if (b.retryOf === null || b.retryOf === undefined) continue;

    if (b.retryOf === b.attemptId) { fail(b.attemptId, "RETRY_SELF_LINK", {}); continue; }

    const a = byId.get(b.retryOf);
    if (!a) { fail(b.attemptId, "RETRY_TARGET_MISSING", { target: b.retryOf }); continue; }

    // Cycle detection across the whole chain.
    const seen = new Set([b.attemptId]);
    let cur = a, cyclic = false;
    while (cur) {
      if (seen.has(cur.attemptId)) { cyclic = true; break; }
      seen.add(cur.attemptId);
      cur = cur.retryOf ? byId.get(cur.retryOf) : null;
    }
    if (cyclic) { fail(b.attemptId, "RETRY_CYCLE", { target: b.retryOf }); continue; }

    if (a.gateName !== b.gateName) { fail(b.attemptId, "RETRY_CROSS_GATE", { from: a.gateName, to: b.gateName }); continue; }
    if (a.cycle !== b.cycle) { fail(b.attemptId, "RETRY_CROSS_CYCLE", { from: a.cycle, to: b.cycle }); continue; }
    if (b.attemptOrdinal !== a.attemptOrdinal + 1) {
      fail(b.attemptId, "RETRY_ORDINAL_INVALID", { from: a.attemptOrdinal, to: b.attemptOrdinal }); continue;
    }
    if (a.exitCode === 0 || a.status === "COMPLETED_PASS") { fail(b.attemptId, "RETRY_AFTER_PASS", { target: a.attemptId }); continue; }
    if (!FROZEN_RETRY_REASONS.has(b.retryReason)) { fail(b.attemptId, "RETRY_REASON_INVALID", { retryReason: b.retryReason ?? null }); continue; }
    if (a.command !== b.command) { fail(b.attemptId, "RETRY_COMMAND_CHANGED", { from: a.command, to: b.command }); continue; }
    if (a.runtimeTreeDigest !== b.runtimeTreeDigest) {
      fail(b.attemptId, "RETRY_RUNTIME_CHANGED", { from: a.runtimeTreeDigest, to: b.runtimeTreeDigest }); continue;
    }
    if (a.harnessTreeDigest !== b.harnessTreeDigest) {
      fail(b.attemptId, "RETRY_HARNESS_CHANGED", { from: a.harnessTreeDigest, to: b.harnessTreeDigest }); continue;
    }
    if (a.dependencyLockDigest !== b.dependencyLockDigest) {
      fail(b.attemptId, "RETRY_DEPENDENCY_CHANGED", { from: a.dependencyLockDigest, to: b.dependencyLockDigest }); continue;
    }
    if (a.environmentFingerprint !== b.environmentFingerprint) {
      fail(b.attemptId, "RETRY_ENVIRONMENT_CHANGED", { from: a.environmentFingerprint, to: b.environmentFingerprint }); continue;
    }

    // Anti-forgery: recompute the digest from the recorded manifest rather than trusting
    // the record. A record whose digest does not match its own manifest is forged.
    if (verifyEvidenceDelta) {
      try {
        const rt = treeDigest(b.runtimeScopeManifestPath);
        if (rt.manifestSha256 !== b.runtimeScopeManifestSha256) {
          fail(b.attemptId, "RETRY_FORGED_DIGEST", { reason: "runtime scope manifest changed since allocation" }); continue;
        }
      } catch (e) {
        fail(b.attemptId, "RETRY_FORGED_DIGEST", { reason: String(e.message) }); continue;
      }
      const baseline = validateGitCommit(b.runtimeBaselineCommit);
      if (!baseline.valid) { fail(b.attemptId, "RETRY_FORGED_BASELINE", { error: baseline.error }); continue; }

      // Evidence HEAD may move ONLY via authorized evidence/report paths.
      const from = a.evidenceHeadAtEnd || a.evidenceHeadAtAllocation;
      const to = b.evidenceHeadAtAllocation;
      const fromOk = validateGitCommit(from), toOk = validateGitCommit(to);
      if (!fromOk.valid || !toOk.valid) {
        fail(b.attemptId, "RETRY_FORGED_BASELINE", { error: fromOk.error || toOk.error }); continue;
      }
      const changed = changedFilesBetween(from, to);
      const impure = changed.filter((f) => !isAuthorizedEvidencePath(f));
      if (impure.length > 0) {
        fail(b.attemptId, "RETRY_EVIDENCE_DELTA_IMPURE", { impurePaths: impure.slice(0, 20) }); continue;
      }
    }

    validRetries.push({
      attemptId: b.attemptId, retryOf: a.attemptId, gateName: b.gateName, cycle: b.cycle,
      retryReason: b.retryReason, runtimeTreeDigest: b.runtimeTreeDigest,
      harnessTreeDigest: b.harnessTreeDigest,
      evidenceHeadMoved: (a.evidenceHeadAtEnd || a.evidenceHeadAtAllocation) !== b.evidenceHeadAtAllocation
    });
  }

  // Ceiling per gate+cycle: one initial attempt plus at most two VALID technical retries.
  const ceiling = {};
  for (const a of attempts) {
    if (!a.gateName) continue;
    const key = `${a.gateName}|cycle${a.cycle}`;
    const c = (ceiling[key] ||= { key, attempts: 0, validLinkedRetries: 0, maxRetries: 2, ceilingValidlyReached: false });
    c.attempts++;
  }
  for (const r of validRetries) {
    const c = ceiling[`${r.gateName}|cycle${r.cycle}`];
    if (c) c.validLinkedRetries++;
  }
  for (const c of Object.values(ceiling)) {
    // The ceiling is reached ONLY when the links supporting it are valid. R17's
    // contradiction — acting on a ceiling the validator rejects — cannot recur here.
    c.ceilingValidlyReached = c.validLinkedRetries >= c.maxRetries;
  }

  return { validRetryCount: validRetries.length, validRetries, errors, ceiling };
}
