// PHASE-10A14-R18 — genuinely write-isolated all-26 replay (P1-R17-IR1-003).
//
// R17's "all26-nonmutating.mjs" wrote unconditionally to a HARDCODED historical path
// (line 58, evaluation/results/phase-10a14-r17/R17_ALL26_NONMUTATING.json) while printing
// e1Untouched=true. It verified it had spared the E1 artifact and silently overwrote its
// own R17 artifact in the same run. "Non-mutating" named one avoided path, not a property.
//
// This module is structurally unable to write to a historical path:
//   Option 2 — computeAll26() is PURE. It opens no output file and returns an object.
//   Option 1 — the destination is an explicit REQUIRED argument. There is no default,
//              because a default is exactly how R17 acquired a hardcoded historical target.
//   Guard   — assertWritableDestination() rejects BEFORE any file handle is opened.
//             Nothing is written and then removed; nothing is restored.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { evaluateAnswerSupport } from "../../../services/answer-support-validator.js";

const REPO = process.cwd();
const PDIR = path.join(REPO, "evaluation/results/phase-10a14-full-factcheck-rerun-4/payloads");

const SLOTS = ["Q1-r3", "Q3-r1", "Q3-r3", "Q6-r2", "Q6-r3", "Q12-r1", "Q12-r2", "Q12-r3", "Q15-r1", "Q15-r2", "Q15-r3",
  "Q30-r1", "Q30-r2", "Q30-r3", "Q32-r1", "Q32-r2", "Q32-r3", "Q34-r1", "Q34-r2", "Q34-r3",
  "Q47-r1", "Q47-r2", "Q47-r3", "Q48-r1", "Q48-r2", "Q48-r3"];
const TARGET = new Set(["Q12-r1", "Q12-r2", "Q12-r3", "Q30-r1", "Q30-r2", "Q30-r3", "Q34-r1", "Q34-r2", "Q34-r3"]);
const DETERMINISTIC_BLOCK_STAGES = new Set([
  "treatment-contradiction", "material-exception-omission", "incentive-sufficiency",
  "proposition-source-sufficiency", "outcome-prediction", "structural", "citation-relevance"
]);

/**
 * Historical evidence directories. A destination resolving inside any of these is refused.
 * R18's own directory is the only evaluation/results path that may be written.
 */
export const HISTORICAL_EVIDENCE_DIRS = [
  "evaluation/results/phase-10a14-e1",
  "evaluation/results/phase-10a14-r13", "evaluation/results/phase-10a14-r14",
  "evaluation/results/phase-10a14-r15", "evaluation/results/phase-10a14-r16",
  "evaluation/results/phase-10a14-r17",
  "evaluation/results/phase-10a14-full-factcheck-rerun-4"
];

const norm = (p) => path.resolve(p).replace(/\\/g, "/");

/**
 * Reject a forbidden destination BEFORE opening anything.
 * Throws — it never opens, creates, truncates or removes a file.
 */
export function assertWritableDestination(destination) {
  if (typeof destination !== "string" || destination.trim() === "") {
    throw new Error("all26 replay: an explicit output destination is required; there is no default");
  }
  const abs = norm(destination);
  for (const dir of HISTORICAL_EVIDENCE_DIRS) {
    const forbidden = norm(path.join(REPO, dir));
    if (abs === forbidden || abs.startsWith(forbidden + "/")) {
      throw new Error(`all26 replay: refusing to write into historical evidence: ${dir}`);
    }
  }
  const r18 = norm(path.join(REPO, "evaluation/results/phase-10a14-r18"));
  const insideRepo = abs.startsWith(norm(REPO) + "/");
  if (insideRepo && !(abs === r18 || abs.startsWith(r18 + "/"))) {
    throw new Error(`all26 replay: in-repository output is allowed only under the R18 evidence directory: ${destination}`);
  }
  return abs;
}

/**
 * PURE. Reads payloads, evaluates the gate, returns the result object.
 * Opens no output file and has no knowledge of any destination.
 */
export async function computeAll26() {
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
  return {
    task: "PHASE-10A14-R18", mode: "WRITE_ISOLATED_REPLAY",
    statement:
      "computeAll26 is pure: it opens no output file. The destination is an explicit required " +
      "argument validated before any handle is opened. No historical path is writable, no " +
      "default destination exists, and no restore is ever required.",
    totalSlots: SLOTS.length, blockedCount: blocked, preservedCount: preserved,
    mismatchCount: mismatch, expectedBlocked: 9, expectedPreserved: 17,
    pass: blocked === 9 && preserved === 17 && mismatch === 0,
    results
  };
}

/** Compute, then write ONLY to the validated explicit destination. */
export async function replayAll26To(destination) {
  const abs = assertWritableDestination(destination); // guard first — before any open
  const out = await computeAll26();
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(out, null, 2) + "\n");
  return { destination: abs, result: out };
}

// CLI: destination is required.
// pathToFileURL is required on Windows: a hand-built `file://${path}` yields file://C:/...
// while import.meta.url is file:///C:/..., so the comparison silently failed and the CLI
// became a no-op that exited 0 without writing anything. A silent success is worse than a
// crash, so entrypoint detection uses the platform-correct URL.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dest = process.argv[2];
  if (!dest) {
    console.error("usage: node all26-isolated.mjs <outputPath>   (no default destination by design)");
    process.exit(2);
  }
  const { destination, result } = await replayAll26To(dest);
  console.log(`blocked=${result.blockedCount} preserved=${result.preservedCount} mismatch=${result.mismatchCount} pass=${result.pass}`);
  console.log(`wrote: ${destination}`);
  if (!result.pass) process.exit(1);
}
