// PHASE-10A14-R16 WS4 — corrected crash victim.
//
// Replaces the R15 victim for test purposes. The R15 victim at
// evaluation/results/phase-10a14-r15/journal-crash-victim.mjs is HISTORICAL EVIDENCE and
// is deliberately left untouched; this is a new file.
//
// Three defects in the R15 victim are corrected here:
//
//   1. NOT AWAITED. R15 called journal.run(...) without `await`, so nothing held the
//      top level. Here the call is awaited at the top level.
//   2. NO LIVE HANDLE. R15's callback awaited `new Promise(() => {})`, which registers no
//      event-loop handle — a pending promise alone does not keep Node alive, so the loop
//      drained and the process exited code 0 BEFORE the parent could kill it, making
//      kill() return false. Here an unref'd-free `setInterval` keeps a real handle alive
//      for as long as the callback is suspended.
//   3. EXTRA OUTER ATTEMPT. R15 marked an outer attempt started and then ran a separate
//      "-inner" probe, producing two attempts. Here there is exactly ONE governed attempt.
//
// The readiness marker is written from INSIDE the governed callback and carries the child
// PID, the attempt ID and the stage, so the parent can prove what it is killing.
//
// argv: <root> <campaignId> <probeId> <stage>
//   stage: after-allocated | after-started | during-call
//        | negative-early-exit | negative-marker-timeout   (negative controls)

import fs from "node:fs";
import path from "node:path";
import { AttemptJournal } from "../phase-10a14-r15/journal.mjs";

const [, , root, campaignId, probeId, stage] = process.argv;

const journal = new AttemptJournal({
  task: "R16-JOURNAL-CRASH-TEST", campaignId,
  runtimeCommit: "CRASHTEST", executionMode: "SIMULATION", root
});

const markerPath = path.join(root, `${campaignId}.ready`);
const writeReadyMarker = (attemptId) => {
  fs.writeFileSync(markerPath, JSON.stringify({
    pid: process.pid, attemptId, stage, at: new Date().toISOString()
  }));
};

/** Suspend forever while holding a REAL event-loop handle. Never resolves. */
function suspendWithLiveHandle() {
  return new Promise(() => {
    const keepAlive = setInterval(() => {}, 60_000);
    // Deliberately not unref'd: the handle must keep the process alive.
    process.once("beforeExit", () => clearInterval(keepAlive));
  });
}

if (stage === "negative-marker-timeout") {
  // NEGATIVE CONTROL: never signals readiness. The parent must time out and fail visibly.
  await new Promise(() => { setInterval(() => {}, 60_000); });
} else if (stage === "negative-early-exit") {
  // NEGATIVE CONTROL: signals readiness then exits normally BEFORE the kill. The parent
  // must detect the normal exit and fail visibly — this is the exact R15 defect shape.
  const { attemptId } = journal.allocate(probeId, { exactQuestion: "negative early exit", expectedClassification: "SAFE" });
  journal.markStarted(attemptId, { probeId });
  writeReadyMarker(attemptId);
  process.exit(0);
} else if (stage === "after-allocated") {
  const { attemptId } = journal.allocate(probeId, { exactQuestion: "crash test", expectedClassification: "SAFE" });
  writeReadyMarker(attemptId);
  await suspendWithLiveHandle();
} else if (stage === "after-started") {
  const { attemptId } = journal.allocate(probeId, { exactQuestion: "crash test", expectedClassification: "SAFE" });
  journal.markStarted(attemptId, { probeId });
  writeReadyMarker(attemptId);
  await suspendWithLiveHandle();
} else {
  // during-call: exactly ONE governed attempt, AWAITED at the top level, with the marker
  // written from inside the governed callback while a live handle keeps the process alive.
  await journal.run(probeId, { exactQuestion: "crash test", expectedClassification: "SAFE" }, async ({ attemptId }) => {
    writeReadyMarker(attemptId);
    await suspendWithLiveHandle();
    return { actualClassification: "SAFE" }; // unreachable: the parent kills us first
  });
}
