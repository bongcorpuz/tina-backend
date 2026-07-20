// PHASE-10A14-R17 COMMIT 8+ — one gate cycle per invocation.
//
// Usage: node --env-file=.env evaluation/results/phase-10a14-r17/run-gate-cycle.mjs \
//          <deterministic|staging> <attemptId> [retryOf] [retryReason]
//
// Nothing is written inside the repository while the runner executes: allocation, logs and
// events live in the external capture root and the canonical import happens only after the
// process terminates. The runtime commit is read from Git, never supplied by the caller.
//
// For staging, reachability is probed independently BEFORE the runner so an outage is
// classified truthfully rather than surfacing as an opaque suite failure.

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  allocateExternal, markStartedExternal, markTerminalExternal, finalizeExternal,
  importCanonical, TERMINALS, REPO, headCommit, syncCounts, treeClean, treeState
} from "./evidence.mjs";

const TASK = "PHASE-10A14-R17";
const kind = process.argv[2];
const attemptId = process.argv[3];
const retryOf = process.argv[4] || null;
const retryReason = process.argv[5] || null;
if (!kind || !attemptId) { console.error("usage: run-gate-cycle.mjs <deterministic|staging> <attemptId> [retryOf] [retryReason]"); process.exit(2); }

const RUNNER = kind === "staging" ? "scripts/run-staging-smokes.mjs" : "scripts/run-regressions.mjs";
const ATTEMPT_TYPE = kind === "staging" ? "STAGING_GATE" : "DETERMINISTIC_GATE";

const head = headCommit(), sync = syncCounts(), clean = treeClean();
console.log(`preconditions: head=${head.slice(0, 12)} sync="${sync}" treeClean=${clean}`);
if (!clean) {
  console.error("ABORT: tracked tree is not clean. A gate cycle must not run on a dirty tree.");
  console.error(treeState());
  process.exit(3);
}
if (retryOf && !retryReason) { console.error("ABORT: a retry requires an objective reason."); process.exit(4); }

/** Independent staging reachability probe (WS8), before the runner. */
async function stagingReachability(label) {
  const ASK = process.env.TINA_STAGING_ASK_URL;
  if (!ASK) return { label, configPresent: false, reachable: false, note: "STAGING_CONFIG_ABSENT" };
  const BASE = ASK.replace(/(https?:\/\/[^/]+).*/, "$1");
  try {
    const t0 = Date.now();
    const r = await fetch(`${BASE}/health`);
    const body = (await r.text()).slice(0, 200);
    return { label, configPresent: true, reachable: true, httpStatus: r.status, latencyMs: Date.now() - t0, body, at: new Date().toISOString() };
  } catch (e) {
    const msg = String(e.message);
    return {
      label, configPresent: true, reachable: false,
      transportError: msg.slice(0, 160),
      classification: /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT/.test(msg) ? "DNS_OR_TRANSPORT" : "OTHER",
      at: new Date().toISOString()
    };
  }
}

const reachBefore = kind === "staging" ? await stagingReachability("BEFORE") : null;
if (kind === "staging") console.log(`staging reachability BEFORE: reachable=${reachBefore.reachable} status=${reachBefore.httpStatus ?? "-"} ${reachBefore.latencyMs ?? ""}ms`);

const { dir, runtimeCommit } = allocateExternal({
  attemptId, task: TASK, attemptType: ATTEMPT_TYPE, campaignId: `R17-GATE-${kind.toUpperCase()}`,
  probeId: kind, cycleKey: attemptId.replace(/-A\d+$/, ""), command: `node ${RUNNER}`,
  retryOf, retryReason
});
markStartedExternal(dir, { probeId: kind, reachabilityBefore: reachBefore });

const started = Date.now();
const r = spawnSync(process.execPath, [RUNNER], { cwd: REPO, encoding: "utf8", timeout: 3600000, env: process.env });
const stdout = r.stdout || "", stderr = r.stderr || "";
const timedOut = Boolean(r.error && r.error.code === "ETIMEDOUT");

const reachAfter = kind === "staging" ? await stagingReachability("AFTER") : null;

const detLine = (stdout.match(/Test suites:\s+(\d+) run, (\d+) failed/) || []).slice(1, 3);
const stgLine = (stdout.match(/Staging-smoke suites:\s+(\d+) run, (\d+) failed/) || []).slice(1, 3);
const syntaxLine = (stdout.match(/Syntax checks:\s+(\d+) run, (\d+) failed/) || []).slice(1, 3);

// Truthful classification: an outage is never reported as a pass.
let environmentFailure = false, environmentClassification = null;
if (kind === "staging" && r.status !== 0) {
  if (reachBefore && !reachBefore.reachable) { environmentFailure = true; environmentClassification = "STAGING_UNREACHABLE"; }
  else if (reachAfter && !reachAfter.reachable) { environmentFailure = true; environmentClassification = "STAGING_UNREACHABLE_MID_CYCLE"; }
}

const terminal = timedOut ? TERMINALS.TIMEOUT : (r.status === 0 ? TERMINALS.COMPLETED_PASS : TERMINALS.COMPLETED_FAIL);
markTerminalExternal(dir, terminal, {
  exitCode: r.status ?? null, signal: r.signal ?? null, durationMs: Date.now() - started,
  runtimeCommit,
  syntaxRun: syntaxLine[0] ? Number(syntaxLine[0]) : null, syntaxFailed: syntaxLine[1] ? Number(syntaxLine[1]) : null,
  suitesRun: (detLine[0] || stgLine[0]) ? Number(detLine[0] || stgLine[0]) : null,
  suitesFailed: (detLine[1] || stgLine[1]) ? Number(detLine[1] || stgLine[1]) : null,
  reachabilityBefore: reachBefore, reachabilityAfter: reachAfter,
  environmentFailure, environmentClassification
});
finalizeExternal(dir, { stdout, stderr });
const imported = importCanonical(attemptId);

console.log(`${attemptId}: exit=${r.status} ${terminal.replace(/^20-|\.json$/g, "")} syntax=${syntaxLine.join("/") || "-"} suites=${(detLine[0] || stgLine[0]) ? `${detLine[0] || stgLine[0]}/${detLine[1] || stgLine[1]}` : "-"} importedFiles=${imported.verifiedFiles}`);
if (environmentFailure) console.log(`environment classification: ${environmentClassification} — NOT reported as a pass`);
if (r.status !== 0) {
  const fails = stdout.split(/\r?\n/).filter((l) => /^\s+FAIL\s/.test(l)).slice(0, 10);
  if (fails.length) console.log("failing suites:\n" + fails.join("\n"));
}
process.exit(r.status === 0 ? 0 : 1);
