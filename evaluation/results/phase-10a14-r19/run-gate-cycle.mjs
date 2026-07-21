// PHASE-10A14-R18 — governed gate-cycle runner.
//
// Capture discipline (Lane A, P1-R17-IR1-004): the gate's stdout/stderr are written to an
// EXTERNAL directory while the process runs. Nothing is imported into the repository until
// the gate process has terminated. The tree is verified clean before the gate starts, so
// the 09ZF scope guard sees exactly the state it is meant to see.
//
// Usage: node run-gate-cycle.mjs <gateName> <cycle> <ordinal> <externalCaptureDir> [retryOf] [retryReason]
import fs from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { allocateAttempt, writeOnce, git } from "./identity.mjs";

const [gateName, cycleRaw, ordinalRaw, capture, retryOf = null, retryReason = null] = process.argv.slice(2);
if (!gateName || !cycleRaw || !ordinalRaw || !capture) {
  console.error("usage: run-gate-cycle.mjs <gateName> <cycle> <ordinal> <externalCaptureDir> [retryOf] [retryReason]");
  process.exit(2);
}
const cycle = Number(cycleRaw), attemptOrdinal = Number(ordinalRaw);

const GATES = {
  deterministic: { command: "node scripts/run-regressions.mjs", category: "deterministic_runner" },
  staging: { command: "node scripts/run-staging-smokes.mjs", category: "staging_runner" }
};
const gate = GATES[gateName];
if (!gate) { console.error(`unknown gate: ${gateName}`); process.exit(2); }

// ── Pre-gate preconditions ──────────────────────────────────────────────────
const status = git(["status", "--porcelain=v1"]).split(/\r?\n/).filter(Boolean);
const tracked = status.filter((l) => !l.startsWith("??"));
const untracked = status.filter((l) => l.startsWith("??")).map((l) => l.slice(3).trim());
const PROTECTED = [/^\.claude\//, /^\.vscode\//, /^evaluation\/factcheck\//];
const unexpected = untracked.filter((u) => !PROTECTED.some((p) => p.test(u)));
if (tracked.length > 0) { console.error(`tracked tree not clean:\n${tracked.join("\n")}`); process.exit(3); }
if (unexpected.length > 0) { console.error(`unexpected untracked paths:\n${unexpected.join("\n")}`); process.exit(3); }

fs.mkdirSync(capture, { recursive: true });
const attemptId = `R19-GATE-${gateName}-cycle${cycle}-A${attemptOrdinal}`;

const { dir, record } = allocateAttempt({
  attemptId, attemptType: "gate", attemptCategory: gate.category,
  gateName, cycle, attemptOrdinal,
  retryOf: retryOf || null, retryReason: retryReason || null,
  command: gate.command
});

// ── Run, capturing OUTSIDE the repository ───────────────────────────────────
const startedAt = new Date().toISOString();
const evidenceHeadAtStart = git(["rev-parse", "HEAD"]);
const [bin, ...args] = gate.command.split(" ");
const r = spawnSync(bin, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const endedAt = new Date().toISOString();

const outFile = path.join(capture, `${attemptId}.stdout.txt`);
const errFile = path.join(capture, `${attemptId}.stderr.txt`);
fs.writeFileSync(outFile, r.stdout || "");
fs.writeFileSync(errFile, r.stderr || "");

// ── Gate process has TERMINATED. Only now import evidence into the repository ──
const evidenceHeadAtEnd = git(["rev-parse", "HEAD"]);
const copyIn = (src, name) => {
  const bytes = fs.readFileSync(src);
  const dest = path.join(dir, name);
  writeOnce(dest, bytes.toString("utf8"));
  const back = fs.readFileSync(dest);
  if (Buffer.compare(bytes, back) !== 0) throw new Error(`byte comparison failed after import: ${name}`);
  return true;
};
copyIn(outFile, "stdout.raw.txt");
copyIn(errFile, "stderr.raw.txt");

const status_ = r.status === 0 ? "COMPLETED_PASS" : "COMPLETED_FAIL";
const terminal = {
  ...record,
  evidenceHeadAtStart, evidenceHeadAtEnd,
  startedAt, endedAt,
  exitCode: r.status, signal: r.signal ?? null,
  status: status_,
  disposition: r.status === 0 ? "VALID_CONTROLLING" : "VALID_NON_CONTROLLING",
  controlling: r.status === 0
};
writeOnce(path.join(dir, r.status === 0 ? "20-completed-pass.json" : "20-completed-fail.json"),
          JSON.stringify(terminal, null, 2) + "\n");
writeOnce(path.join(dir, "command.txt"), gate.command + "\n");

console.log(`${attemptId} exit=${r.status} status=${status_}`);
console.log(`evidence head start=${evidenceHeadAtStart.slice(0, 8)} end=${evidenceHeadAtEnd.slice(0, 8)}`);
console.log(`runtime digest=${record.runtimeTreeDigest.slice(0, 16)} harness digest=${record.harnessTreeDigest.slice(0, 16)}`);
process.exit(r.status === 0 ? 0 : 1);
