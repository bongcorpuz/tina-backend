// PHASE-10A14-R15 WS15 — final gate runner with full attempt preservation.
//
// Usage: node --env-file=.env evaluation/results/phase-10a14-r15/run-gates.mjs <finalRuntimeCommit>
//
// Remediates P1-R14-IR-006. Every runner invocation is a journaled attempt, INCLUDING
// failures, timeouts and environmental faults. No gate log is ever deleted.
//
// Clean-tree-sensitive runners: several patch-scope guards shell out to git and observe
// a dirty tree, so a log written into the repository while a runner executes makes the
// runner fail on its own output. Logs are therefore captured OUTSIDE the repository and
// COPIED into governed evidence after each runner ends — copied, never discarded.
//
// Staging identity is validated before and after every staging cycle (WS10/WS15).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import jwt from "jsonwebtoken";
import { AttemptJournal, reviewCampaign } from "./journal.mjs";

const TASK = "PHASE-10A14-R15";
const finalRuntime = process.argv[2];
if (!finalRuntime) { console.error("usage: run-gates.mjs <finalRuntimeCommit>"); process.exit(2); }

const D = "evaluation/results/phase-10a14-r15/";
// CRITICAL: nothing may be written INSIDE the repository while a runner executes.
// Several patch-scope guards shell out to git and fail on a dirty tree, so a journal
// event or log file created mid-run makes the runner fail on the evidence of its own
// execution — the exact trap R14 fell into. Both the gate journal and the gate logs are
// therefore written to an external directory and copied into governed evidence only
// after ALL runners have finished. Copied, never discarded.
const EXTERNAL = fs.mkdtempSync(path.join(os.tmpdir(), "r15-gates-"));
const EXTERNAL_JOURNAL = path.join(EXTERNAL, "journal");
const EXTERNAL_LOGS = path.join(EXTERNAL, "logs");
fs.mkdirSync(EXTERNAL_JOURNAL, { recursive: true });
fs.mkdirSync(EXTERNAL_LOGS, { recursive: true });
const GATE_LOG_DIR = D + "gate-logs";

const campaignId = `R15-GATE-${finalRuntime.slice(0, 12)}`;
const journal = new AttemptJournal({ task: TASK, campaignId, runtimeCommit: finalRuntime, executionMode: "GATE", root: EXTERNAL_JOURNAL });

/** Server-reported staging identity via the authenticated diagnostics field. */
async function stagingIdentity(label) {
  const ASK = process.env.TINA_STAGING_ASK_URL;
  if (!ASK || !process.env.JWT_SECRET) return { label, runtimeCommit: null, error: "STAGING_CONFIG_ABSENT" };
  try {
    const tok = jwt.sign({
      id: "00000000-0000-4000-8000-0000000e1001", username: "r15-eval-synthetic", role: "user",
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
  } catch (e) {
    return { label, runtimeCommit: null, error: String(e.message).slice(0, 200), at: new Date().toISOString() };
  }
}

const chronology = [];

async function runGate(probeId, runner, { checkIdentity = false } = {}) {
  const identityBefore = checkIdentity ? await stagingIdentity("BEFORE") : null;
  const logName = `${probeId}.txt`;
  const externalLog = path.join(EXTERNAL_LOGS, logName);

  const rec = await journal.run(probeId, {
    exactQuestion: `node ${runner}`,
    expectedClassification: "PASS",
    extra: { suite: "gate", runner, identityBefore }
  }, async () => {
    const started = Date.now();
    const r = spawnSync(process.execPath, [runner], { cwd: process.cwd(), encoding: "utf8", timeout: 1800000 });
    const output = `${r.stdout || ""}${r.stderr || ""}`;
    fs.writeFileSync(externalLog, output);
    const timedOut = r.error && r.error.code === "ETIMEDOUT";
    return {
      actualClassification: r.status === 0 ? "PASS" : "FAIL",
      exitCode: r.status, timedOut: Boolean(timedOut),
      durationMs: Date.now() - started,
      technicalFailure: Boolean(timedOut),
      failureReason: timedOut ? "TECHNICAL: runner timeout" : null
    };
  });

  const identityAfter = checkIdentity ? await stagingIdentity("AFTER") : null;
  // The log stays external until every runner has finished; it is copied in below.
  const governedLog = path.join(GATE_LOG_DIR, logName);

  const entry = {
    attemptId: rec.attemptId, probeId, runner,
    exitCode: rec.exitCode ?? null, outcome: rec.actualClassification,
    timedOut: Boolean(rec.timedOut), durationMs: rec.durationMs ?? null,
    logInEvidence: governedLog.replace(/\\/g, "/"),
    identityBefore, identityAfter,
    identityStable: checkIdentity ? (identityBefore?.runtimeCommit === identityAfter?.runtimeCommit) : null,
    identityMatchesFinalRuntime: checkIdentity
      ? (identityBefore?.runtimeCommit === finalRuntime && identityAfter?.runtimeCommit === finalRuntime)
      : null,
    controlling: rec.actualClassification === "PASS"
  };
  chronology.push(entry);
  const idNote = checkIdentity ? ` identity=${entry.identityMatchesFinalRuntime ? "MATCHES" : "MISMATCH"}` : "";
  console.log(`${probeId.padEnd(28)} exit=${String(entry.exitCode).padEnd(4)} ${entry.outcome}${idNote}`);
  return entry;
}

await runGate("deterministic-cycle1", "scripts/run-regressions.mjs");
await runGate("deterministic-cycle2", "scripts/run-regressions.mjs");
await runGate("staging-cycle1", "scripts/run-staging-smokes.mjs", { checkIdentity: true });
await runGate("staging-cycle2", "scripts/run-staging-smokes.mjs", { checkIdentity: true });

// All runners are done. NOW copy every log and the whole gate journal into governed
// evidence — successes and failures alike. Nothing is discarded.
fs.mkdirSync(GATE_LOG_DIR, { recursive: true });
for (const f of fs.readdirSync(EXTERNAL_LOGS)) fs.copyFileSync(path.join(EXTERNAL_LOGS, f), path.join(GATE_LOG_DIR, f));
const governedJournalRoot = D + "journal";
fs.cpSync(path.join(EXTERNAL_JOURNAL, campaignId), path.join(governedJournalRoot, campaignId), { recursive: true });

const review = reviewCampaign(path.join(governedJournalRoot, campaignId));
const out = {
  task: TASK, campaignId, finalRuntime,
  rule: "Every runner invocation is a journaled attempt, including failures. No gate log is ever deleted. Logs are captured outside the repository and copied into evidence after each runner ends.",
  runnerInvocations: chronology.length,
  preservedLogs: fs.readdirSync(GATE_LOG_DIR).length,
  allPassed: chronology.every((c) => c.outcome === "PASS"),
  stagingIdentityAlwaysMatched: chronology.filter((c) => c.identityMatchesFinalRuntime !== null).every((c) => c.identityMatchesFinalRuntime === true),
  chronology,
  review: { ...review, attempts: undefined }
};
fs.writeFileSync(D + "R15_GATE_CHRONOLOGY.json", JSON.stringify(out, null, 2) + "\n");

console.log(`\nrunnerInvocations=${out.runnerInvocations} preservedLogs=${out.preservedLogs} allPassed=${out.allPassed} stagingIdentityAlwaysMatched=${out.stagingIdentityAlwaysMatched}`);
console.log(`journal: allocated=${review.allocated} completed=${review.completed} incomplete=${review.incompleteOrCrashed} technicalFailures=${review.technicalFailures}`);
if (out.runnerInvocations !== out.preservedLogs) { console.error("GATE LOG COUNT MISMATCH — a log is missing"); process.exit(1); }
