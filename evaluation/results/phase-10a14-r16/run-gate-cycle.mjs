// PHASE-10A14-R16 COMMIT 7 — single gate cycle under the frozen contract.
//
// Usage: node --env-file=.env evaluation/results/phase-10a14-r16/run-gate-cycle.mjs \
//          <deterministic|staging> <attemptId> [expectRuntimeCommit]
//
// ONE cycle per invocation, so each attempt can be committed and pushed before the next,
// as the mandatory sequence requires.
//
// Nothing is written inside the repository while the runner executes. Allocation, logs
// and events all live in the external capture root; the canonical import happens only
// after the process has terminated.

import fs from "node:fs";
import path from "node:path";
import { spawnSync, execSync } from "node:child_process";
import crypto from "node:crypto";
import {
  allocateExternal, markStartedExternal, markTerminalExternal, finalizeExternal,
  importCanonical, TERMINALS, REPO, headCommit, syncCounts, treeClean, treeState
} from "./evidence.mjs";

const TASK = "PHASE-10A14-R16";
const kind = process.argv[2];
const attemptId = process.argv[3];
const expectRuntime = process.argv[4] || null;
if (!kind || !attemptId) { console.error("usage: run-gate-cycle.mjs <deterministic|staging> <attemptId> [expectRuntimeCommit]"); process.exit(2); }

const RUNNER = kind === "staging" ? "scripts/run-staging-smokes.mjs" : "scripts/run-regressions.mjs";
const ATTEMPT_TYPE = kind === "staging" ? "STAGING_GATE" : "DETERMINISTIC_GATE";

// ── 1-2. Preconditions: HEAD, sync, clean tree ───────────────────────────────
const head = headCommit(), sync = syncCounts(), clean = treeClean();
console.log(`preconditions: head=${head.slice(0, 12)} sync="${sync}" treeClean=${clean}`);
if (!clean) {
  console.error("ABORT: tracked tree is not clean. A gate cycle must not run on a dirty tree.");
  console.error(treeState());
  process.exit(3);
}

// Runtime equivalence: evidence-only commits move HEAD without changing runtime files.
const RUNTIME_FILES = [
  "services/philippine-tax-domain-boundary.js", "services/philippine-tax-boundary-patterns.js",
  "tax-keywords.js", "tax-classifier.js", "services/answer-support-validator.js",
  "ask-handler.js", "pipeline.js", "answer-renderer.js", "server.js"
];
const hashAt = (commit, file) => {
  // NOTE: no `^{commit}` here — execSync goes through cmd.exe on Windows where `^` is the
  // escape character and would mangle the revision expression.
  try { return crypto.createHash("sha256").update(execSync(`git show ${commit}:${file}`, { cwd: REPO, encoding: "buffer", maxBuffer: 1 << 28 })).digest("hex"); }
  catch { return "ABSENT"; }
};
let runtimeEquivalence = null;
if (expectRuntime) {
  const diffs = RUNTIME_FILES.filter((f) => hashAt(head, f) !== hashAt(expectRuntime, f));
  runtimeEquivalence = { expectRuntime, headCommit: head, allRuntimeFilesIdentical: diffs.length === 0, differingFiles: diffs };
  console.log(`runtime equivalence to ${expectRuntime.slice(0, 12)}: ${diffs.length === 0 ? "IDENTICAL" : "DIFFERS: " + diffs.join(",")}`);
}

/** Server-reported staging identity via the authenticated diagnostics field. */
async function stagingIdentity(label) {
  const ASK = process.env.TINA_STAGING_ASK_URL;
  if (!ASK || !process.env.JWT_SECRET) return { label, runtimeCommit: null, error: "STAGING_CONFIG_ABSENT" };
  try {
    const { default: jwt } = await import("jsonwebtoken");
    const tok = jwt.sign({
      id: "00000000-0000-4000-8000-0000000e1001", username: "r16-eval-synthetic", role: "user",
      otpVerified: true, adaptiveEnabled: true, orchestrationCompatible: true,
      activeMode: "STANDARD_TAX_MODE", activeHook: "/ask"
    }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const r = await fetch(ASK, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}`, "x-tina-runtime-identity": "1" },
      body: JSON.stringify({ question: "What is the VAT rate in the Philippines?" })
    });
    const j = await r.json().catch(() => null);
    const id = j?.runtimeIdentity || null;
    return { label, httpStatus: r.status, runtimeCommit: id?.runtimeCommit ?? null, deploymentId: id?.deploymentId ?? null, at: new Date().toISOString() };
  } catch (e) { return { label, runtimeCommit: null, error: String(e.message).slice(0, 200), at: new Date().toISOString() }; }
}

const identityBefore = kind === "staging" ? await stagingIdentity("BEFORE") : null;

// ── 3. External allocation ───────────────────────────────────────────────────
const command = `node ${RUNNER}`;
const dir = allocateExternal({
  attemptId, task: TASK, attemptType: ATTEMPT_TYPE, campaignId: `R16-GATE-${kind.toUpperCase()}`,
  probeId: kind, command, runtimeCommit: head,
  notes: expectRuntime ? `runtime equivalence checked against ${expectRuntime}` : null
});
markStartedExternal(dir, { probeId: kind, identityBefore });

// ── 4-5. Run with external capture ───────────────────────────────────────────
const started = Date.now();
const r = spawnSync(process.execPath, [RUNNER], { cwd: REPO, encoding: "utf8", timeout: 3600000 });
const stdout = r.stdout || "", stderr = r.stderr || "";
const timedOut = Boolean(r.error && r.error.code === "ETIMEDOUT");

const identityAfter = kind === "staging" ? await stagingIdentity("AFTER") : null;

// ── 6. Terminal event ────────────────────────────────────────────────────────
const terminal = timedOut ? TERMINALS.TIMEOUT : (r.status === 0 ? TERMINALS.COMPLETED_PASS : TERMINALS.COMPLETED_FAIL);
const suiteLine = (stdout.match(/Test suites:\s+(\d+) run, (\d+) failed/) || []).slice(1, 3);
const stagingLine = (stdout.match(/Staging-smoke suites:\s+(\d+) run, (\d+) failed/) || []).slice(1, 3);
markTerminalExternal(dir, terminal, {
  exitCode: r.status ?? null, signal: r.signal ?? null, durationMs: Date.now() - started,
  suitesRun: (suiteLine[0] || stagingLine[0]) ? Number(suiteLine[0] || stagingLine[0]) : null,
  suitesFailed: (suiteLine[1] || stagingLine[1]) ? Number(suiteLine[1] || stagingLine[1]) : null,
  headAtEnd: headCommit(), treeCleanAfter: treeClean(),
  identityBefore, identityAfter,
  serverReportedRuntimeCommit: identityAfter?.runtimeCommit ?? identityBefore?.runtimeCommit ?? null,
  deploymentId: identityAfter?.deploymentId ?? identityBefore?.deploymentId ?? null,
  runtimeEquivalence,
  controlling: terminal === TERMINALS.COMPLETED_PASS
});

// ── 7-8. Finalize and canonical import with hash verification ────────────────
finalizeExternal(dir, { stdout, stderr });
const imported = importCanonical(attemptId);

console.log(`${attemptId}: exit=${r.status} ${terminal.replace(/^20-|\.json$/g, "")} suites=${suiteLine.join("/") || stagingLine.join("/") || "n/a"} importedFiles=${imported.verifiedFiles}`);
if (kind === "staging") console.log(`identity before=${identityBefore?.runtimeCommit} after=${identityAfter?.runtimeCommit}`);
process.exit(r.status === 0 ? 0 : 1);
