/**
 * PHASE-10A14-R15 WS3 — journal test harness (18 required cases).
 *
 * Proves the properties R14 claimed but did not implement (P1-R14-IR-004):
 * a durable allocation event exists BEFORE the governed action runs, and a real
 * process kill leaves the attempt visible with no terminal event.
 *
 * Synthetic data only. Runs entirely in an OS temp directory and never touches
 * committed historical evidence.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { AttemptJournal, reviewCampaign, EVENT } from "../evaluation/results/phase-10a14-r15/journal.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VICTIM = path.join(HERE, "..", "evaluation", "results", "phase-10a14-r15", "journal-crash-victim.mjs");

let passed = 0, failed = 0;
const failures = [];
const check = (c, m) => { if (!c) throw new Error(m); };
const equal = (a, b, m) => { if (a !== b) throw new Error(`${m} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`); };
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; failures.push(`${name}: ${e.message}`); console.log(`FAIL ${name}\n  ${e.message}`); }
}

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "r15-journal-"));
const mk = (id) => new AttemptJournal({
  task: "R15-JOURNAL-TEST", campaignId: id, runtimeCommit: "TESTCOMMIT",
  executionMode: "SIMULATION", root: ROOT
});
const campDir = (id) => path.join(ROOT, id);

// 1
await test("normal completion writes allocated, started and exactly one terminal event", async () => {
  const j = mk("C1");
  const r = await j.run("P1", { exactQuestion: "q", expectedClassification: "SAFE" }, async () => ({ actualClassification: "SAFE" }));
  const files = fs.readdirSync(j.attemptDir(r.attemptId));
  check(files.includes(EVENT.ALLOCATED), "missing allocated");
  check(files.includes(EVENT.STARTED), "missing started");
  check(files.includes(EVENT.COMPLETED), "missing completed");
  equal(files.filter((f) => f.startsWith("20-")).length, 1, "terminal event count");
});

// 2
await test("a thrown function is recorded as a technical failure, not a legal result", async () => {
  const j = mk("C2");
  const r = await j.run("P1", { expectedClassification: "SAFE" }, async () => { throw new Error("boom"); });
  const files = fs.readdirSync(j.attemptDir(r.attemptId));
  check(files.includes(EVENT.TECHNICAL_FAILURE), "missing technical-failure event");
  check(!files.includes(EVENT.COMPLETED), "must not also be completed");
  equal(r.technicalFailure, true, "technicalFailure flag");
});

// 3
await test("a timeout is recorded as its own terminal event", async () => {
  const j = mk("C3");
  const { attemptId } = j.allocate("P1", {});
  j.markStarted(attemptId);
  j.markTerminal(attemptId, EVENT.TIMEOUT, { failureReason: "deadline exceeded" });
  const rev = reviewCampaign(campDir("C3"));
  equal(rev.timeouts, 1, "timeout count");
});

// 4, 5, 6 — REAL process kills.
// Run concurrently with a generous readiness deadline: this suite also executes inside
// the full regression gate alongside 200+ other suites, where child-process startup can
// be much slower than when run alone. A short sequential deadline made the suite
// load-dependent (it passed standalone and failed under the gate).
async function crashCase(campaignId, killPoint) {
  const marker = path.join(ROOT, `${campaignId}.ready`);
  const child = spawn(process.execPath, [VICTIM, ROOT, campaignId, "P1", killPoint], { stdio: "ignore" });
  const deadline = Date.now() + 60000;
  while (!fs.existsSync(marker) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 10));
  const ready = fs.existsSync(marker);
  child.kill("SIGKILL");
  await new Promise((r) => child.on("exit", r));
  return { ready, review: reviewCampaign(campDir(campaignId)) };
}

const [crash4, crash5, crash6] = await Promise.all([
  crashCase("C4", "after-allocated"),
  crashCase("C5", "after-started"),
  crashCase("C6", "during-call")
]);

await test("process kill AFTER allocation leaves the allocation durably visible", async () => {
  const { ready, review } = crash4;
  check(ready, "victim never signalled readiness");
  equal(review.allocated, 1, "allocation must survive the kill");
  equal(review.completed, 0, "must have no terminal event");
  equal(review.incompleteOrCrashed, 1, "must classify as INCOMPLETE_OR_CRASHED");
});

await test("process kill AFTER started leaves allocation and started visible, no terminal", async () => {
  const { ready, review } = crash5;
  check(ready, "victim never signalled readiness");
  equal(review.allocated, 1, "allocation must survive");
  equal(review.started, 1, "started must survive");
  equal(review.incompleteOrCrashed, 1, "must classify as INCOMPLETE_OR_CRASHED");
});

await test("process kill DURING the governed call leaves the attempt visible with no terminal event", async () => {
  const { ready, review } = crash6;
  check(ready, "victim never signalled readiness");
  check(review.allocated >= 1, "allocation must survive a kill mid-call");
  check(review.incompleteOrCrashed >= 1, "an interrupted attempt must be visible as incomplete");
  equal(review.completed, 0, "nothing may be reported completed");
});

// 7
await test("duplicate attempt ID allocation is rejected, never an overwrite", async () => {
  const j = mk("C7");
  const { attemptId } = j.allocate("P1", {});
  const j2 = mk("C7");
  let threw = null;
  try { j2.allocate("P1", {}); } catch (e) { threw = e; }
  check(threw && /ATTEMPT_ID_COLLISION/.test(threw.message), `expected collision error, got ${threw && threw.message}`);
  check(fs.existsSync(path.join(j.attemptDir(attemptId), EVENT.ALLOCATED)), "original must be intact");
});

// 8
await test("concurrent allocation produces unique attempt directories", async () => {
  const j = mk("C8");
  const ids = await Promise.all([...Array(20)].map((_, i) => Promise.resolve(j.allocate(`P${i}`, {}).attemptId)));
  equal(new Set(ids).size, 20, "all attempt IDs must be unique");
});

// 9
await test("concurrent event creation across attempts does not interleave or collide", async () => {
  const j = mk("C9");
  await Promise.all([...Array(12)].map((_, i) =>
    j.run(`P${i}`, { expectedClassification: "SAFE" }, async () => {
      await new Promise((r) => setTimeout(r, Math.random() * 20));
      return { actualClassification: "SAFE" };
    })));
  const rev = reviewCampaign(campDir("C9"));
  equal(rev.completed, 12, "all must complete");
  equal(rev.malformed, 0, "none may be malformed");
});

// 10
await test("a partial (truncated) event file is reported as malformed, not skipped", () => {
  const j = mk("C10");
  const { attemptId } = j.allocate("P1", {});
  j.markStarted(attemptId);
  j.markTerminal(attemptId, EVENT.COMPLETED, { actualClassification: "SAFE" });
  fs.writeFileSync(path.join(j.attemptDir(attemptId), EVENT.COMPLETED), '{"event":"COMP');
  const rev = reviewCampaign(campDir("C10"));
  equal(rev.malformed, 1, "truncated event must be reported malformed");
});

// 11
await test("malformed JSON in the allocation event is reported", () => {
  const j = mk("C11");
  const { attemptId } = j.allocate("P1", {});
  fs.writeFileSync(path.join(j.attemptDir(attemptId), EVENT.ALLOCATED), "{not json");
  const rev = reviewCampaign(campDir("C11"));
  equal(rev.malformed, 1, "malformed allocation must be reported");
});

// 12
await test("a missing terminal event is counted, never silently dropped", () => {
  const j = mk("C12");
  const a = j.allocate("P1", {}); j.markStarted(a.attemptId);
  const b = j.allocate("P2", {}); j.markStarted(b.attemptId);
  j.markTerminal(b.attemptId, EVENT.COMPLETED, { actualClassification: "SAFE" });
  const rev = reviewCampaign(campDir("C12"));
  equal(rev.incompleteOrCrashed, 1, "incomplete count");
  equal(rev.completed, 1, "completed count");
  equal(rev.allocated, 2, "allocated count must include the incomplete attempt");
});

// 13
await test("rewriting an existing event file through the API is impossible", () => {
  const j = mk("C13");
  const { attemptId } = j.allocate("P1", {});
  j.markStarted(attemptId);
  let threw = null;
  try { j.markStarted(attemptId); } catch (e) { threw = e; }
  check(threw && /EVENT_ALREADY_EXISTS/.test(threw.message), "re-writing an event must throw");
});

// 14
await test("a second terminal event is rejected", () => {
  const j = mk("C14");
  const { attemptId } = j.allocate("P1", {});
  j.markStarted(attemptId);
  j.markTerminal(attemptId, EVENT.COMPLETED, { actualClassification: "SAFE" });
  let threw = null;
  try { j.markTerminal(attemptId, EVENT.TIMEOUT, {}); } catch (e) { threw = e; }
  check(threw && /TERMINAL_EVENT_ALREADY_PRESENT/.test(threw.message), "second terminal must throw");
});

// 15
await test("unauthorized deletion is detectable by reconciliation", () => {
  const j = mk("C15");
  const a = j.allocate("P1", {}); j.markStarted(a.attemptId);
  j.markTerminal(a.attemptId, EVENT.COMPLETED, { actualClassification: "SAFE" });
  const before = reviewCampaign(campDir("C15")).allocated;
  fs.rmSync(j.attemptDir(a.attemptId), { recursive: true, force: true });
  const after = reviewCampaign(campDir("C15")).allocated;
  equal(before, 1, "baseline");
  equal(after, 0, "deletion changes the count, so a manifest comparison detects it");
});

// 16
await test("retry linking preserves the failed attempt and links forward", () => {
  const j = mk("C16");
  const a = j.allocate("P1", {}); j.markStarted(a.attemptId);
  j.markTerminal(a.attemptId, EVENT.TECHNICAL_FAILURE, { technicalFailure: true, failureReason: "TECHNICAL: socket" });
  const b = j.allocate("P1", { retryOf: a.attemptId }); j.markStarted(b.attemptId);
  j.markTerminal(b.attemptId, EVENT.COMPLETED, { actualClassification: "SAFE" });
  j.linkRetry(a.attemptId, b.attemptId);
  const rev = reviewCampaign(campDir("C16"));
  equal(rev.technicalFailures, 1, "failed attempt must remain");
  equal(rev.completed, 1, "retry must be recorded");
  equal(rev.retries, 1, "retry link must be present");
  const alloc = JSON.parse(fs.readFileSync(path.join(j.attemptDir(b.attemptId), EVENT.ALLOCATED), "utf8"));
  equal(alloc.retryOf, a.attemptId, "retry must reference the prior attempt");
});

// 17
await test("summary reconciliation reports every category including legal mismatches", async () => {
  const j = mk("C17");
  await j.run("OK", { expectedClassification: "SAFE" }, async () => ({ actualClassification: "SAFE" }));
  await j.run("MISMATCH", { expectedClassification: "UNSAFE" }, async () => ({ actualClassification: "SAFE" }));
  await j.run("THROWS", { expectedClassification: "SAFE" }, async () => { throw new Error("x"); });
  const rev = reviewCampaign(campDir("C17"));
  equal(rev.completed, 2, "completed");
  equal(rev.technicalFailures, 1, "technical failure");
  equal(rev.legalMismatches, 1, "legal mismatch must be counted");
  check(rev.mismatchProbeIds.includes("MISMATCH"), "mismatch probe id must be reported");
});

// 18
await test("restart and sequence recovery: a new journal instance cannot reuse an ID", () => {
  const j1 = mk("C18");
  j1.allocate("P1", {});
  const j2 = mk("C18"); // simulates a process restart
  let threw = null;
  try { j2.allocate("P1", {}); } catch (e) { threw = e; }
  check(threw && /ATTEMPT_ID_COLLISION/.test(threw.message), "restart must not silently reuse an attempt ID");
});

// Manifest inclusion property
await test("every attempt directory is enumerable for manifest inclusion", () => {
  const rev = reviewCampaign(campDir("C1"));
  check(rev.attempts.length >= 1, "attempts must be enumerable");
  check(rev.attempts[0].attemptId && rev.attempts[0].classification, "attempt records must carry id and classification");
});

fs.rmSync(ROOT, { recursive: true, force: true });
console.log(`\nphase-10a14-r15-journal: ${passed} passed, ${failed} failed`);
if (failed) { console.error(failures.join("\n")); process.exit(1); }
console.log("PHASE-10A14-R15 JOURNAL PASS — crash-visible lifecycle proven with real process kills.");
