import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AttemptJournal, reviewCampaign } from "../phase-10a14-r15/journal.mjs";

const repoRoot = process.cwd();
const victim = path.join(repoRoot, "evaluation", "results", "phase-10a14-r15", "journal-crash-victim.mjs");

async function waitFor(predicate, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
}

async function runKillPoint(killPoint) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `r15-ir1-${killPoint}-`));
  const campaignId = `IR1-${killPoint.toUpperCase()}`;
  const marker = path.join(root, `${campaignId}.ready`);
  const child = spawn(process.execPath, [
    victim,
    root,
    campaignId,
    "P1",
    killPoint,
  ], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(String(chunk)));
  child.stderr.on("data", (chunk) => stderr.push(String(chunk)));

  const ready = await waitFor(() => fs.existsSync(marker), 5000);
  let killReturned = false;
  if (ready) {
    killReturned = child.kill("SIGKILL");
  }

  const exit = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 1000);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });

  const journal = new AttemptJournal({
    task: "R15-JOURNAL-CRASH-TEST",
    campaignId,
    runtimeCommit: "CRASHTEST",
    executionMode: "SIMULATION",
    root,
  });

  return {
    killPoint,
    ready,
    killReturned,
    exit,
    review: reviewCampaign(path.join(root, campaignId)),
    stdout: stdout.join(""),
    stderr: stderr.join(""),
  };
}

const results = [];
for (const killPoint of ["after-allocated", "after-started", "during-call"]) {
  results.push(await runKillPoint(killPoint));
}

console.log(JSON.stringify({ results }, null, 2));

const duringCall = results.find((entry) => entry.killPoint === "during-call");
if (duringCall?.exit?.signal !== "SIGKILL") {
  process.exitCode = 1;
}
