// PHASE-10A14-R11 WS3 — immutable PRE-FIX evidence against the UNCHANGED R10 runtime.
// DETERMINISTIC_GENERATED_ANSWER_REPRODUCTION: each frozen probe's generated-answer fixture
// is run through the current calendar-relative detector + evaluateAnswerSupport. Captures the
// detector miss/detect result and hashes. Executed BEFORE any R11 runtime change.
import fs from "node:fs"; import crypto from "node:crypto";
import { evaluateCalendarRelativeDeadline, evaluateAnswerSupport } from "../../../services/answer-support-validator.js";
const sha = (s) => crypto.createHash("sha256").update(typeof s === "string" ? s : JSON.stringify(s)).digest("hex");
const RUNTIME = "05faa60dadc1b52214c162c51fae2c317d46f9af";
const D = "evaluation/results/phase-10a14-r11/";
const manifest = JSON.parse(fs.readFileSync(D + "R11_PRE_FIX_MANIFEST.json", "utf8"));
const outDir = D + "prefix/payloads"; fs.mkdirSync(outDir, { recursive: true });
const runlog = D + "prefix/runlog.jsonl";
const SEC51 = [{ label: "NIRC Sec. 51" }];
let miss = 0, detect = 0, safeFired = 0;
for (const p of manifest.probes) {
  const det = evaluateCalendarRelativeDeadline({ question: p.question, answer: p.answer });
  const e = await evaluateAnswerSupport({ question: p.question, answer: p.answer, sources: SEC51 });
  const detectorFired = det.applicable && !det.sufficient;
  const rec = {
    probeId: p.probeId, category: p.category, kind: p.kind, runtimeCommit: RUNTIME,
    exactQuestion: p.question, injectedOrGeneratedAnswer: p.answer,
    detectorResult: detectorFired ? "DETECT" : "MISS",
    answerSupportStage: e.stage, verifiedEligible: e.verifiedEligible,
    isDetectorMiss: p.kind === "unsafe" && !detectorFired,
    isSafeFalsePositive: p.kind === "safe" && detectorFired,
    requestHash: sha(p.question), responseHash: sha(p.answer),
    timestamp: new Date().toISOString(), executionMode: "DETERMINISTIC_GENERATED_ANSWER_REPRODUCTION"
  };
  rec.payloadHash = sha({ ...rec, payloadHash: undefined });
  fs.writeFileSync(`${outDir}/${p.probeId}.json`, JSON.stringify(rec, null, 2));
  fs.appendFileSync(runlog, JSON.stringify({ ts: rec.timestamp, probeId: p.probeId, kind: p.kind, detectorResult: rec.detectorResult, stage: e.stage, isDetectorMiss: rec.isDetectorMiss }) + "\n");
  if (rec.isDetectorMiss) miss++;
  if (detectorFired && p.kind === "unsafe") detect++;
  if (rec.isSafeFalsePositive) safeFired++;
  console.log(`${p.probeId.padEnd(28)} kind=${p.kind.padEnd(6)} ${rec.detectorResult}${rec.isDetectorMiss ? "  <-- PRE-FIX MISS" : ""}${rec.isSafeFalsePositive ? "  <-- SAFE FALSE-POSITIVE" : ""}`);
}
const summary = { runtimeCommit: RUNTIME, totalProbes: manifest.probes.length, unsafeDetected: detect, unsafeMissed: miss, safeFalsePositives: safeFired };
fs.writeFileSync(D + "prefix/PRE_FIX_SUMMARY.json", JSON.stringify(summary, null, 2));
console.log(`\nPRE-FIX: unsafe detected=${detect}, unsafe MISSED=${miss}, safe false-positives=${safeFired}`);
