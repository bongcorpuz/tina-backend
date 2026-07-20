// PHASE-10A14-R16 COMMIT 6 — final focused and regression campaign.
//
// Every suite invocation is captured as an R16 attempt under the frozen contract:
// external allocation -> started -> run -> terminal -> finalize -> canonical import with
// post-copy hash verification.
//
// Usage: node evaluation/results/phase-10a14-r16/run-focused-campaign.mjs <finalRuntimeCommit>

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  allocateExternal, markStartedExternal, markTerminalExternal, finalizeExternal,
  importCanonical, TERMINALS, REPO
} from "./evidence.mjs";

const TASK = "PHASE-10A14-R16";
const RUNTIME = process.argv[2];
if (!RUNTIME) { console.error("usage: run-focused-campaign.mjs <finalRuntimeCommit>"); process.exit(2); }

const SUITES = [
  ["r16-domain", "tests/phase-10a14-r16-non-tax-domain-boundary.test.mjs"],
  ["r16-tooling", "tests/phase-10a14-r16-evidence-tooling.test.mjs"],
  ["r15-journal-crash", "tests/phase-10a14-r15-crash-visible-attempt-journal.test.mjs"],
  ["r15-focused", "tests/phase-10a14-r15-semantic-composition-tax-adjacency-and-persistence-receipt.test.mjs"],
  ["r14-focused", "tests/phase-10a14-r14-negated-nonperformance-and-universal-persistence-status.test.mjs"],
  ["r13-focused", "tests/phase-10a14-r13-polarity-aware-directive-and-persistence-receipt.test.mjs"],
  ["r12-focused", "tests/phase-10a14-r12-semantic-filing-directive-and-not-applicable-persistence.test.mjs"],
  ["r11-focused", "tests/phase-10a14-r11-calendar-directive-completeness-and-contextual-safe-answer.test.mjs"],
  ["r10-focused", "tests/phase-10a14-r10-calendar-relative-public-answer-replacement.test.mjs"],
  ["r9-focused", "tests/phase-10a14-r9-calendar-relative-deadline-and-filing-rationale-alignment.test.mjs"],
  ["all26-replay", "evaluation/results/phase-10a14-e1/ws8-deterministic-all26.mjs"]
];

const results = [];
for (const [probeId, script] of SUITES) {
  const gen = process.argv[3] || "A1";
  const attemptId = `R16-FOCUSED-${probeId}-${gen}`;
  const command = `node ${script}`;
  const dir = allocateExternal({
    attemptId, task: TASK, attemptType: "FOCUSED_SUITE", campaignId: "R16-FINAL-FOCUSED",
    probeId, command, runtimeCommit: RUNTIME
  });
  markStartedExternal(dir, { probeId });
  const r = spawnSync(process.execPath, [script], { cwd: REPO, encoding: "utf8", timeout: 1800000 });
  const stdout = r.stdout || "", stderr = r.stderr || "";
  const timedOut = Boolean(r.error && r.error.code === "ETIMEDOUT");
  const terminal = timedOut ? TERMINALS.TIMEOUT : (r.status === 0 ? TERMINALS.COMPLETED_PASS : TERMINALS.COMPLETED_FAIL);
  const counts = (stdout.match(/(\d+) passed, (\d+) failed/) || []).slice(1, 3);
  markTerminalExternal(dir, terminal, {
    exitCode: r.status ?? null, signal: r.signal ?? null,
    suitePassed: counts[0] ? Number(counts[0]) : null,
    suiteFailed: counts[1] ? Number(counts[1]) : null,
    controlling: terminal === TERMINALS.COMPLETED_PASS,
    headAtEnd: RUNTIME, treeCleanAfter: null
  });
  finalizeExternal(dir, { stdout, stderr });
  const imp = importCanonical(attemptId);
  results.push({ probeId, exitCode: r.status, terminal, counts: counts.join("/") || "n/a" });
  console.log(`${probeId.padEnd(20)} exit=${String(r.status).padEnd(4)} ${terminal.replace(/^20-|\.json$/g, "").padEnd(15)} ${counts.join(" passed / ")} files=${imp.verifiedFiles}`);
}

const failed = results.filter((r) => r.exitCode !== 0);
fs.writeFileSync(path.join(REPO, "evaluation/results/phase-10a14-r16/R16_FOCUSED_SUMMARY.json"), JSON.stringify({
  task: TASK, runtimeCommit: RUNTIME, suites: results.length,
  allPassed: failed.length === 0, failed: failed.map((f) => f.probeId), results
}, null, 2) + "\n");
console.log(`\nfocused suites: ${results.length}, failed: ${failed.length}`);
if (failed.length) process.exit(1);
