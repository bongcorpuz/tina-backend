// PHASE-10A14-R15 WS3 — crash victim process.
// Launched by the journal test harness and killed with SIGKILL at a controlled point,
// to prove crash visibility with a REAL process death (not a simulated one).
//
// argv: <root> <campaignId> <probeId> <killPoint>
//   killPoint: after-allocated | after-started | during-call
// The process signals readiness by writing a marker file, then blocks forever so the
// parent can kill it deterministically.

import fs from "node:fs";
import path from "node:path";
import { AttemptJournal } from "./journal.mjs";

const [, , root, campaignId, probeId, killPoint] = process.argv;

const journal = new AttemptJournal({
  task: "R15-JOURNAL-CRASH-TEST", campaignId,
  runtimeCommit: "CRASHTEST", executionMode: "SIMULATION", root
});

const marker = path.join(root, `${campaignId}.ready`);
const block = () => { setInterval(() => {}, 1 << 30); };

const { attemptId } = journal.allocate(probeId, { exactQuestion: "crash test", expectedClassification: "SAFE" });

if (killPoint === "after-allocated") {
  fs.writeFileSync(marker, attemptId);
  block();
} else {
  journal.markStarted(attemptId, { probeId });
  if (killPoint === "after-started") {
    fs.writeFileSync(marker, attemptId);
    block();
  } else {
    // during-call: signal readiness from inside the governed action itself
    journal.run(probeId + "-inner", { exactQuestion: "inner" }, async () => {
      fs.writeFileSync(marker, attemptId);
      await new Promise(() => {}); // never resolves; parent kills us here
    });
  }
}
