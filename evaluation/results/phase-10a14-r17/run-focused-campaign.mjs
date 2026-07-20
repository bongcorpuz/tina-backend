// PHASE-10A14-R17 COMMIT 7 — final focused evidence against one final runtime.
//
// Every suite invocation is a captured attempt. The runtime commit is read from Git at
// allocation and validated; it is never supplied on the command line.
//
// all-26 is run in NON-MUTATING mode: the E1 replay writes into protected historical E1
// evidence, so it is executed via a wrapper that verifies the E1 artifact is byte-identical
// afterwards, and the result is recorded without committing any E1 change.
//
// Usage: node evaluation/results/phase-10a14-r17/run-focused-campaign.mjs [generation]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { allocateExternal, markStartedExternal, markTerminalExternal, finalizeExternal, importCanonical, TERMINALS, REPO } from "./evidence.mjs";

const TASK = "PHASE-10A14-R17";
const GEN = process.argv[2] || "A1";

const SUITES = [
  ["r17-validators", "tests/phase-10a14-r17-provenance-recovery-retry.test.mjs"],
  ["r17-domain", "tests/phase-10a14-r17-customs-capital-gain-domain.test.mjs"],
  ["phase-10a8", "tests/phase-10a8-trust-calibration-and-answer-correctness-remediation-1.test.mjs"],
  ["patch-07b", "tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs"],
  ["phase-09r-staging", "tests/phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs"],
  ["r16-domain", "tests/phase-10a14-r16-non-tax-domain-boundary.test.mjs"],
  ["r16-tooling", "tests/phase-10a14-r16-evidence-tooling.test.mjs"],
  ["r15-journal-crash", "tests/phase-10a14-r15-crash-visible-attempt-journal.test.mjs"],
  ["r15-focused", "tests/phase-10a14-r15-semantic-composition-tax-adjacency-and-persistence-receipt.test.mjs"],
  ["r14-focused", "tests/phase-10a14-r14-negated-nonperformance-and-universal-persistence-status.test.mjs"],
  ["r13-focused", "tests/phase-10a14-r13-polarity-aware-directive-and-persistence-receipt.test.mjs"],
  ["r12-focused", "tests/phase-10a14-r12-semantic-filing-directive-and-not-applicable-persistence.test.mjs"],
  ["r11-focused", "tests/phase-10a14-r11-calendar-directive-completeness-and-contextual-safe-answer.test.mjs"],
  ["r10-focused", "tests/phase-10a14-r10-calendar-relative-public-answer-replacement.test.mjs"],
  ["r9-focused", "tests/phase-10a14-r9-calendar-relative-deadline-and-filing-rationale-alignment.test.mjs"]
];

const E1_ARTIFACT = path.join(REPO, "evaluation/results/phase-10a14-e1/WS8_DETERMINISTIC_ALL26.json");
const hashOf = (f) => (fs.existsSync(f) ? crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex") : "ABSENT");

const results = [];

for (const [probeId, script] of SUITES) {
  const attemptId = `R17-FOCUSED-${probeId}-${GEN}`;
  const { dir, runtimeCommit } = allocateExternal({
    attemptId, task: TASK, attemptType: "FOCUSED_SUITE", campaignId: "R17-FINAL-FOCUSED",
    probeId, cycleKey: probeId, command: `node ${script}`
  });
  markStartedExternal(dir, { probeId });
  const r = spawnSync(process.execPath, [script], { cwd: REPO, encoding: "utf8", timeout: 1800000, env: process.env });
  const stdout = r.stdout || "", stderr = r.stderr || "";
  const timedOut = Boolean(r.error && r.error.code === "ETIMEDOUT");
  const terminal = timedOut ? TERMINALS.TIMEOUT : (r.status === 0 ? TERMINALS.COMPLETED_PASS : TERMINALS.COMPLETED_FAIL);
  const m = stdout.match(/(\d+) passed, (\d+) failed/);
  markTerminalExternal(dir, terminal, {
    exitCode: r.status ?? null, signal: r.signal ?? null,
    suitePassed: m ? Number(m[1]) : null, suiteFailed: m ? Number(m[2]) : null,
    runtimeCommit
  });
  finalizeExternal(dir, { stdout, stderr });
  const imp = importCanonical(attemptId);
  results.push({ probeId, exitCode: r.status, terminal });
  console.log(`${probeId.padEnd(20)} exit=${String(r.status).padEnd(4)} ${terminal.replace(/^20-|\.json$/g, "").padEnd(15)} ${m ? m[1] + "/" + m[2] : ""} files=${imp.verifiedFiles}`);
}

// ── all-26 in GENUINELY NON-MUTATING mode ───────────────────────────────────
// The E1 runner writes into protected historical E1 evidence. An earlier R17 attempt ran
// it and merely DETECTED the mutation afterwards, which required restoring the artifact.
// Detection is not prevention, so a dedicated R17 replay is used that writes only into
// R17 evidence.
{
  const attemptId = `R17-FOCUSED-all26-nonmutating-${GEN}`;
  const before = hashOf(E1_ARTIFACT);
  const { dir, runtimeCommit } = allocateExternal({
    attemptId, task: TASK, attemptType: "FOCUSED_SUITE", campaignId: "R17-FINAL-FOCUSED",
    probeId: "all26-nonmutating", cycleKey: "all26",
    command: "node evaluation/results/phase-10a14-r17/all26-nonmutating.mjs",
    notes: "Non-mutating replay of the E1 all-26 gate. Writes only into R17 evidence; no E1 file is opened for writing."
  });
  markStartedExternal(dir, { probeId: "all26-nonmutating", e1ArtifactHashBefore: before });
  const r = spawnSync(process.execPath, ["evaluation/results/phase-10a14-r17/all26-nonmutating.mjs"], { cwd: REPO, encoding: "utf8", timeout: 1800000 });
  const stdout = r.stdout || "", stderr = r.stderr || "";
  const after = hashOf(E1_ARTIFACT);
  const unchanged = before === after;
  const m = stdout.match(/blocked=(\d+) preserved=(\d+) mismatch=(\d+)/);
  const expected = m && m[1] === "9" && m[2] === "17" && m[3] === "0";
  const terminal = (r.status === 0 && expected && unchanged) ? TERMINALS.COMPLETED_PASS : TERMINALS.COMPLETED_FAIL;
  markTerminalExternal(dir, terminal, {
    exitCode: r.status ?? null, runtimeCommit,
    blocked: m ? Number(m[1]) : null, preserved: m ? Number(m[2]) : null, mismatch: m ? Number(m[3]) : null,
    expected9_17_0: expected,
    e1ArtifactHashBefore: before, e1ArtifactHashAfter: after, e1ArtifactUntouched: unchanged
  });
  finalizeExternal(dir, { stdout, stderr });
  const imp = importCanonical(attemptId);
  results.push({ probeId: "all26-nonmutating", exitCode: r.status, terminal });
  console.log(`${"all26-nonmutating".padEnd(20)} exit=${String(r.status).padEnd(4)} ${terminal.replace(/^20-|\.json$/g, "").padEnd(15)} ${m ? m[0] : ""} e1Untouched=${unchanged} files=${imp.verifiedFiles}`);
}

const failed = results.filter((x) => x.terminal !== TERMINALS.COMPLETED_PASS);
fs.writeFileSync(path.join(REPO, "evaluation/results/phase-10a14-r17/R17_FOCUSED_SUMMARY.json"), JSON.stringify({
  task: TASK, generation: GEN, suites: results.length,
  allPassed: failed.length === 0, failed: failed.map((f) => f.probeId), results
}, null, 2) + "\n");
console.log(`\nfocused suites: ${results.length}, failed: ${failed.length}`);
if (failed.length) process.exit(1);
