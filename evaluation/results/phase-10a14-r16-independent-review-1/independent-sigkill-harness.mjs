import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { reviewCampaign } from "file:///C:/Projects/tina-backend/evaluation/results/phase-10a14-r15/journal.mjs";

const repo = "C:/Projects/tina-backend";
const victim = path.join(repo, "evaluation/results/phase-10a14-r16/journal-crash-victim.mjs");

async function waitFor(fn, ms) {
  const stop = Date.now() + ms;
  while (Date.now() < stop) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 10));
  }
  return false;
}

async function runStage(stage, mode = "kill") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `r16-ir-sigkill-${stage}-`));
  const campaignId = `IR-${stage.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`;
  const marker = path.join(root, `${campaignId}.ready`);
  const child = spawn(process.execPath, [victim, root, campaignId, "P1", stage], { cwd: repo, stdio: ["ignore", "pipe", "pipe"] });
  let exitInfo = null;
  const exitPromise = new Promise((resolve) => child.once("exit", (code, signal) => { exitInfo = { code, signal }; resolve(); }));
  const ready = await waitFor(() => fs.existsSync(marker) || exitInfo, stage === "negative-marker-timeout" ? 1500 : 60000);
  const markerData = fs.existsSync(marker) ? JSON.parse(fs.readFileSync(marker, "utf8")) : null;
  let aliveBeforeKill = exitInfo === null;
  let killReturned = false;
  if (mode === "kill" && aliveBeforeKill) killReturned = child.kill("SIGKILL");
  if (stage === "negative-marker-timeout" && aliveBeforeKill) killReturned = child.kill("SIGKILL");
  await Promise.race([exitPromise, new Promise((resolve) => setTimeout(resolve, 10000))]);
  const review = reviewCampaign(path.join(root, campaignId));
  return { stage, mode, ready, markerData, aliveBeforeKill, killReturned, exit: exitInfo, review };
}

const results = [];
results.push(await runStage("after-allocated"));
results.push(await runStage("after-started"));
results.push(await runStage("during-call"));
results.push(await runStage("negative-early-exit", "observe-normal-exit"));
results.push(await runStage("negative-marker-timeout"));

const checks = [];
function check(name, ok, detail = null) { checks.push({ name, ok, detail }); }
const during = results.find((r) => r.stage === "during-call");
check("during one attempt", during.review.allocated === 1 && during.review.started === 1, during.review);
check("during no terminal", during.review.completed === 0 && during.review.technicalFailures === 0 && during.review.incompleteOrCrashed === 1, during.review);
check("during real kill", during.aliveBeforeKill === true && during.killReturned === true && during.exit?.code === null && during.exit?.signal === "SIGKILL", during);
const normal = results.find((r) => r.stage === "negative-early-exit");
check("normal exit negative control", normal.exit?.code === 0 && normal.exit?.signal === null && normal.killReturned === false, normal);
const timeout = results.find((r) => r.stage === "negative-marker-timeout");
check("marker timeout negative control", timeout.markerData === null && timeout.review.allocated === 0, timeout);

console.log(JSON.stringify({ results, checks, failed: checks.filter((c) => !c.ok) }, null, 2));
process.exitCode = checks.some((c) => !c.ok) ? 1 : 0;
