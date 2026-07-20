// PHASE-10A14-R16 COMMIT 3 — pre-fix reproduction against UNCHANGED starting code.
//
// Captures each reproduction as a formal R16 attempt under the frozen contract:
// external allocation -> started -> run -> terminal -> finalize -> canonical import
// with post-copy hash verification.
//
// No runtime or test repair happens here. These attempts are chronology.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import {
  allocateExternal, markStartedExternal, markTerminalExternal, finalizeExternal,
  importCanonical, TERMINALS, REPO
} from "./evidence.mjs";

const TASK = "PHASE-10A14-R16";
const RUNTIME = "c38a073b814559d9e02139fcb7c61e310e46bc21";
const results = [];

async function attempt({ attemptId, attemptType, probeId, command, notes }, fn) {
  const dir = allocateExternal({ attemptId, task: TASK, attemptType, campaignId: "R16-PREFIX", probeId, command, runtimeCommit: RUNTIME, notes });
  markStartedExternal(dir, { probeId });
  let out = {};
  try { out = (await fn()) || {}; }
  catch (e) { out = { terminal: TERMINALS.TECHNICAL_FAILURE, failureReason: String(e.message).slice(0, 300) }; }
  const terminal = out.terminal || TERMINALS.COMPLETED_PASS;
  markTerminalExternal(dir, terminal, { ...out.payload, exitCode: out.exitCode ?? null, signal: out.signal ?? null, controlling: false });
  finalizeExternal(dir, { stdout: out.stdout ?? "", stderr: out.stderr ?? "" });
  const imported = importCanonical(attemptId);
  results.push({ attemptId, terminal, verifiedFiles: imported.verifiedFiles });
  console.log(`${attemptId.padEnd(46)} ${terminal.replace(/^20-|\.json$/g, "").padEnd(16)} files=${imported.verifiedFiles}`);
  return out;
}

// ── 1. Standalone R15 journal suite failure (P1-R15-IR-001) ─────────────────
await attempt({
  attemptId: "R16-PREFIX-journal-suite-standalone-A1", attemptType: "FOCUSED_SUITE",
  probeId: "R15-JOURNAL-SUITE-STANDALONE",
  command: "node tests/phase-10a14-r15-crash-visible-attempt-journal.test.mjs",
  notes: "Reproduce the standalone failure of the R15 crash-visible journal suite."
}, async () => {
  const r = spawnSync(process.execPath, ["tests/phase-10a14-r15-crash-visible-attempt-journal.test.mjs"], { cwd: REPO, encoding: "utf8", timeout: 600000 });
  const output = `${r.stdout || ""}${r.stderr || ""}`;
  const unsettled = /unsettled top-level await/i.test(output);
  return {
    terminal: r.status === 0 ? TERMINALS.COMPLETED_PASS : TERMINALS.COMPLETED_FAIL,
    exitCode: r.status, stdout: r.stdout || "", stderr: r.stderr || "",
    payload: { reproducedUnsettledTopLevelAwait: unsettled, expectation: "exit 13 with unsettled top-level await" }
  };
});

// ── 2. During-call no-kill (P1-R15-IR-002) ──────────────────────────────────
const VICTIM = path.join(REPO, "evaluation/results/phase-10a14-r15/journal-crash-victim.mjs");
async function killProbe(stage) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "r16-prefix-kill-"));
  const camp = `C-${stage}`;
  const marker = path.join(root, `${camp}.ready`);
  const child = spawn(process.execPath, [VICTIM, root, camp, "P1", stage], { stdio: "ignore" });
  let exited = false, exitInfo = null;
  child.on("exit", (code, signal) => { exited = true; exitInfo = { code, signal }; });
  const dl = Date.now() + 20000;
  while (!fs.existsSync(marker) && !exited && Date.now() < dl) await new Promise((r) => setTimeout(r, 20));
  const ready = fs.existsSync(marker), aliveBeforeKill = !exited;
  const killReturned = child.kill("SIGKILL");
  await new Promise((r) => { if (exited) return r(); child.on("exit", r); setTimeout(r, 8000); });
  fs.rmSync(root, { recursive: true, force: true });
  return { stage, ready, aliveBeforeKill, killReturned, exitInfo };
}
for (const stage of ["after-allocated", "after-started", "during-call"]) {
  await attempt({
    attemptId: `R16-PREFIX-kill-${stage}-A1`, attemptType: "CRASH", probeId: `KILL-${stage.toUpperCase()}`,
    command: `node evaluation/results/phase-10a14-r15/journal-crash-victim.mjs <root> <campaign> P1 ${stage}`,
    notes: "Reproduce R15 victim kill behaviour against unchanged code."
  }, async () => {
    const r = await killProbe(stage);
    const realKill = r.killReturned === true && r.exitInfo && r.exitInfo.signal === "SIGKILL" && r.exitInfo.code === null;
    return {
      terminal: realKill ? TERMINALS.COMPLETED_PASS : TERMINALS.COMPLETED_FAIL,
      signal: r.exitInfo?.signal ?? null, exitCode: r.exitInfo?.code ?? null,
      stdout: JSON.stringify(r, null, 2),
      payload: { ...r, realKillObserved: realKill, expectation: stage === "during-call" ? "R15 defect: kill returns false and the process exits code 0" : "real SIGKILL" }
    };
  });
}

// ── 3. Domain false allows (P1-R15-IR-003) ──────────────────────────────────
await attempt({
  attemptId: "R16-PREFIX-domain-false-allows-A1", attemptType: "CAMPAIGN", probeId: "DOMAIN-PREFIX",
  command: "node -e '<domain boundary probe over frozen inventory>'",
  notes: "Reproduce non-tax false allows against the unchanged boundary."
}, async () => {
  const { detectPhilippineTaxBoundary } = await import("file:///" + path.join(REPO, "services/philippine-tax-domain-boundary.js").replace(/\\/g, "/"));
  const inv = JSON.parse(fs.readFileSync(path.join(REPO, "evaluation/results/phase-10a14-r16/R16_DOMAIN_PROBE_INVENTORY.json"), "utf8"));
  const rows = [];
  let falseAllow = 0, falseRefusal = 0;
  for (const p of [...inv.manual, ...inv.generated]) {
    const d = detectPhilippineTaxBoundary(p.text, "/ask");
    const got = d.decision === "ALLOW" ? "ALLOW" : "NOT_ALLOW";
    const ok = p.expected === "CLARIFY_OR_NOT_ALLOW" ? got === "NOT_ALLOW" : got === p.expected;
    if (!ok) { if (p.expected === "ALLOW") falseRefusal++; else falseAllow++; }
    rows.push({ probeId: p.probeId, text: p.text, expected: p.expected, got, reason: d.reason, ok });
  }
  const out = { totalProbes: rows.length, falseAllow, falseRefusal, mismatches: rows.filter((r) => !r.ok).map((r) => ({ probeId: r.probeId, expected: r.expected, got: r.got, reason: r.reason })) };
  return {
    terminal: falseAllow === 0 && falseRefusal === 0 ? TERMINALS.COMPLETED_PASS : TERMINALS.COMPLETED_FAIL,
    exitCode: falseAllow === 0 && falseRefusal === 0 ? 0 : 1,
    stdout: JSON.stringify(out, null, 2),
    payload: { ...out, expectation: "pre-fix: at least the two independent false allows reproduce" }
  };
});

fs.writeFileSync(path.join(REPO, "evaluation/results/phase-10a14-r16/R16_PREFIX_SUMMARY.json"), JSON.stringify({
  task: TASK, phase: "PRE_FIX", runtimeCommit: RUNTIME,
  statement: "Reproductions against UNCHANGED starting code, before any repair. Chronology only; these attempts do not control PASS.",
  attempts: results
}, null, 2) + "\n");
console.log(`\npre-fix attempts captured: ${results.length}`);
