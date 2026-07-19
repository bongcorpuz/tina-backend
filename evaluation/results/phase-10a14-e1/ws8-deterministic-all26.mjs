// PHASE-10A14-E1 WS8 — deterministic replay of the 26 original A14 VERIFIED_CONTROLLING
// payloads through the FROZEN R8 gate (evaluateAnswerSupport). Expected: 9 blocked
// (Q12/Q30/Q34 x3), 17 preserved. Pure/offline; no live calls.
import fs from "node:fs";
import path from "node:path";
import { evaluateAnswerSupport } from "../../../services/answer-support-validator.js";

const PDIR = "evaluation/results/phase-10a14-full-factcheck-rerun-4/payloads";
const SLOTS = ["Q1-r3","Q3-r1","Q3-r3","Q6-r2","Q6-r3","Q12-r1","Q12-r2","Q12-r3","Q15-r1","Q15-r2","Q15-r3",
  "Q30-r1","Q30-r2","Q30-r3","Q32-r1","Q32-r2","Q32-r3","Q34-r1","Q34-r2","Q34-r3",
  "Q47-r1","Q47-r2","Q47-r3","Q48-r1","Q48-r2","Q48-r3"];
const TARGET = new Set(["Q12-r1","Q12-r2","Q12-r3","Q30-r1","Q30-r2","Q30-r3","Q34-r1","Q34-r2","Q34-r3"]);

// Deterministic (pre-LLM) block stages. "unavailable" = LLM stage with no client
// in this offline process => the deterministic gates did NOT block (preserved).
const DETERMINISTIC_BLOCK_STAGES = new Set([
  "treatment-contradiction", "material-exception-omission", "incentive-sufficiency",
  "proposition-source-sufficiency", "outcome-prediction", "structural", "citation-relevance"
]);

const results = [];
let blocked = 0, preserved = 0, mismatch = 0;
for (const slot of SLOTS) {
  const f = path.join(PDIR, `${slot}.json`);
  const p = JSON.parse(fs.readFileSync(f, "utf8"));
  const e = await evaluateAnswerSupport({ question: p.prompt, answer: p.answer, sources: p.sources || [] });
  // Deterministically blocked iff a pre-LLM block stage fired.
  const isBlocked = e.verifiedEligible === false && DETERMINISTIC_BLOCK_STAGES.has(e.stage);
  const expectBlocked = TARGET.has(slot);
  const ok = isBlocked === expectBlocked;
  if (!ok) mismatch++;
  if (isBlocked) blocked++; else preserved++;
  results.push({ slot, expectBlocked, verifiedEligible: e.verifiedEligible, stage: e.stage || null,
    propositionClass: e.propositionClass || null, match: ok });
}
const summary = {
  task: "PHASE-10A14-E1 WS8 deterministic all-26 replay",
  gate: "evaluateAnswerSupport (frozen R8 runtime, commit 893820600)",
  totalSlots: SLOTS.length, blockedCount: blocked, preservedCount: preserved, mismatchCount: mismatch,
  expectedBlocked: 9, expectedPreserved: 17,
  q3q47_overfire_check: results.filter(r => /^Q3-|^Q47-/.test(r.slot)).every(r => r.verifiedEligible !== false || r.stage === "unavailable"),
  q32_reachable_check: results.filter(r => /^Q32-/.test(r.slot)).every(r => r.stage === "unavailable"),
  pass: blocked === 9 && preserved === 17 && mismatch === 0,
  results
};
fs.writeFileSync("evaluation/results/phase-10a14-e1/WS8_DETERMINISTIC_ALL26.json", JSON.stringify(summary, null, 2));
console.log(`blocked=${blocked} preserved=${preserved} mismatch=${mismatch} pass=${summary.pass}`);
for (const r of results) if (!r.match) console.log("MISMATCH", r.slot, r);
