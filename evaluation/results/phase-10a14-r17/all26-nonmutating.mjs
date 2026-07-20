// PHASE-10A14-R17 — deterministic all-26 replay, GENUINELY non-mutating.
//
// The E1 runner (evaluation/results/phase-10a14-e1/ws8-deterministic-all26.mjs) WRITES its
// result into evaluation/results/phase-10a14-e1/WS8_DETERMINISTIC_ALL26.json, which is
// protected historical evidence. My first R17 attempt ran it and merely DETECTED the
// mutation afterwards — detection is not prevention, and the artifact had to be restored.
//
// This replays the identical logic and gate, reading the same payloads, and writes ONLY
// into the R17 evidence directory. It touches no E1 file.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { evaluateAnswerSupport } from "../../../services/answer-support-validator.js";

const REPO = "C:/Projects/tina-backend";
const PDIR = path.join(REPO, "evaluation/results/phase-10a14-full-factcheck-rerun-4/payloads");
const E1_ARTIFACT = path.join(REPO, "evaluation/results/phase-10a14-e1/WS8_DETERMINISTIC_ALL26.json");

// Identical slot list and expectations as the E1 runner.
const SLOTS = ["Q1-r3", "Q3-r1", "Q3-r3", "Q6-r2", "Q6-r3", "Q12-r1", "Q12-r2", "Q12-r3", "Q15-r1", "Q15-r2", "Q15-r3",
  "Q30-r1", "Q30-r2", "Q30-r3", "Q32-r1", "Q32-r2", "Q32-r3", "Q34-r1", "Q34-r2", "Q34-r3",
  "Q47-r1", "Q47-r2", "Q47-r3", "Q48-r1", "Q48-r2", "Q48-r3"];
const TARGET = new Set(["Q12-r1", "Q12-r2", "Q12-r3", "Q30-r1", "Q30-r2", "Q30-r3", "Q34-r1", "Q34-r2", "Q34-r3"]);
const DETERMINISTIC_BLOCK_STAGES = new Set([
  "treatment-contradiction", "material-exception-omission", "incentive-sufficiency",
  "proposition-source-sufficiency", "outcome-prediction", "structural", "citation-relevance"
]);

const hashOf = (f) => (fs.existsSync(f) ? crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex") : "ABSENT");
const before = hashOf(E1_ARTIFACT);

const results = [];
let blocked = 0, preserved = 0, mismatch = 0;
for (const slot of SLOTS) {
  const p = JSON.parse(fs.readFileSync(path.join(PDIR, `${slot}.json`), "utf8"));
  const e = await evaluateAnswerSupport({ question: p.prompt, answer: p.answer, sources: p.sources || [] });
  const isBlocked = e.verifiedEligible === false && DETERMINISTIC_BLOCK_STAGES.has(e.stage);
  const expectBlocked = TARGET.has(slot);
  const ok = isBlocked === expectBlocked;
  if (!ok) mismatch++;
  if (isBlocked) blocked++; else preserved++;
  results.push({ slot, expectBlocked, verifiedEligible: e.verifiedEligible, stage: e.stage || null, match: ok });
}

const after = hashOf(E1_ARTIFACT);
const e1Untouched = before === after;
const pass = blocked === 9 && preserved === 17 && mismatch === 0;

const out = {
  task: "PHASE-10A14-R17", mode: "NON_MUTATING_REPLAY",
  statement: "Replays the E1 all-26 gate logic and writes ONLY into R17 evidence. No E1 file is opened for writing.",
  totalSlots: SLOTS.length, blockedCount: blocked, preservedCount: preserved, mismatchCount: mismatch,
  expectedBlocked: 9, expectedPreserved: 17, pass,
  e1ArtifactHashBefore: before, e1ArtifactHashAfter: after, e1ArtifactUntouched: e1Untouched,
  results
};
fs.writeFileSync(path.join(REPO, "evaluation/results/phase-10a14-r17/R17_ALL26_NONMUTATING.json"), JSON.stringify(out, null, 2) + "\n");

console.log(`blocked=${blocked} preserved=${preserved} mismatch=${mismatch} pass=${pass} e1Untouched=${e1Untouched}`);
if (!pass || !e1Untouched) process.exit(1);
