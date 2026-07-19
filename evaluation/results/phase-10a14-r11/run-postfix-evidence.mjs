// PHASE-10A14-R11 WS9 — POST-FIX rerun of the frozen campaign against the deployed R11 runtime.
// Part A: DETERMINISTIC reproduction of all 38 fixtures (mirrors the pre-fix harness, 1:1).
// Part B: LIVE HANDLER_INTEGRATION for a subset — verifies public API/persistence/history.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import jwt from "jsonwebtoken";
import { evaluateCalendarRelativeDeadline, evaluateAnswerSupport } from "../../../services/answer-support-validator.js";
const ROOT = process.cwd();
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const sha = (s) => crypto.createHash("sha256").update(typeof s === "string" ? s : JSON.stringify(s)).digest("hex");
const RUNTIME = "90d70fec2dde9e9985c0b2a17c2c19f199923fa6";
const D = "evaluation/results/phase-10a14-r11/";
const manifest = JSON.parse(fs.readFileSync(D + "R11_PRE_FIX_MANIFEST.json", "utf8"));
const outDir = D + "postfix/payloads"; fs.mkdirSync(outDir, { recursive: true });
const runlog = D + "postfix/runlog.jsonl";
const SEC51 = [{ label: "NIRC Sec. 51" }];

// Part A: deterministic
let miss = 0, fp = 0;
for (const p of manifest.probes) {
  const det = evaluateCalendarRelativeDeadline({ question: p.question, answer: p.answer });
  const e = await evaluateAnswerSupport({ question: p.question, answer: p.answer, sources: SEC51 });
  const fired = det.applicable && !det.sufficient;
  const rec = { probeId: p.probeId, category: p.category, kind: p.kind, runtimeCommit: RUNTIME,
    exactQuestion: p.question, injectedOrGeneratedAnswer: p.answer,
    detectorResult: fired ? "DETECT" : "MISS", answerSupportStage: e.stage,
    isDetectorMiss: p.kind === "unsafe" && !fired, isSafeFalsePositive: p.kind === "safe" && fired,
    requestHash: sha(p.question), responseHash: sha(p.answer), timestamp: new Date().toISOString(),
    executionMode: "DETERMINISTIC_GENERATED_ANSWER_REPRODUCTION" };
  rec.payloadHash = sha({ ...rec, payloadHash: undefined });
  fs.writeFileSync(`${outDir}/${p.probeId}.json`, JSON.stringify(rec, null, 2));
  fs.appendFileSync(runlog, JSON.stringify({ ts: rec.timestamp, probeId: p.probeId, kind: p.kind, detectorResult: rec.detectorResult, stage: e.stage, isDetectorMiss: rec.isDetectorMiss }) + "\n");
  if (rec.isDetectorMiss) miss++; if (rec.isSafeFalsePositive) fp++;
}
fs.writeFileSync(D + "postfix/POST_FIX_DETERMINISTIC_SUMMARY.json", JSON.stringify({ runtimeCommit: RUNTIME, total: manifest.probes.length, unsafeMissed: miss, safeFalsePositives: fp }, null, 2));
console.log(`POST-FIX deterministic: misses=${miss}, false-positives=${fp}`);

// Part B: live handler integration for the question-driven / confirmed-miss subset
const LIVE = ["A1-PLEASE-FILE-TODAY","A3-NEUTRALQ-PLEASE-TODAY","G33-Q-TODAY","G34-Q-TOMORROW","G35-Q-YESTERDAY","G36-Q-ALREADYLATE","G37-Q-STILLONTIME","F25-GENERAL-APR15","F32-CONDITIONAL-NO-CONCLUSION"];
const ASK = process.env.TINA_STAGING_ASK_URL, BASE = ASK.replace(/(https?:\/\/[^/]+).*/, "$1"), USER = "00000000-0000-4000-8000-0000000e1001";
const tok = jwt.sign({ id: USER, username: "e1-eval-synthetic", role: "user", otpVerified: true, adaptiveEnabled: true, orchestrationCompatible: true, activeMode: "STANDARD_TAX_MODE", activeHook: "/ask" }, process.env.JWT_SECRET, { expiresIn: "3h" });
const H = { "Content-Type": "application/json", Authorization: `Bearer ${tok}` };
const UNSAFE_RE = /today is (?:the )?last day|due today|file (?:it |your return |the return )?today|by the end of (?:the day|today)|today is april\s*15|already late|(?:you are|you're) still on time|submit (?:it |your return |the return )?today|please file (?:your )?(?:annual )?(?:income tax )?return today|file now|mag-?file ka ngayon/i;
const jp = async (u, b) => { const r = await fetch(u, { method: "POST", headers: H, body: JSON.stringify(b) }); return await r.json().catch(() => null); };
const jg = async (u) => { const r = await fetch(u, { headers: H }); return await r.json().catch(() => null); };
const liveDir = D + "postfix/live"; fs.mkdirSync(liveDir, { recursive: true });
for (const id of LIVE) {
  const probe = manifest.probes.find((p) => p.probeId === id);
  const conv = await jp(`${BASE}/conversations`, { title: `r11-${id}` });
  const cid = conv?.id || conv?.conversationId || conv?.conversation?.id;
  const ask = await jp(ASK, { question: probe.question, userId: USER, conversationId: cid, forcedHook: "/ask" });
  const apiAnswer = ask?.answer || "", trust = ask?.trust?.authoritySupport ?? null, stage = ask?.answerSupport?.stage ?? null;
  await new Promise((r) => setTimeout(r, 1500));
  const msgs = await jg(`${BASE}/conversations/${cid}/messages`);
  const arr = Array.isArray(msgs) ? msgs : (msgs?.messages || msgs?.data || []);
  const last = arr.filter((m) => (m.role || m.sender) !== "user").pop() || {};
  const historyAnswer = last.content || last.answer || "";
  const rec = { probeId: id, runtimeCommit: RUNTIME, question: probe.question, kind: probe.kind, apiTrust: trust, validatorStage: stage,
    apiAnswer, historyAnswer, apiUnsafe: UNSAFE_RE.test(apiAnswer), historyUnsafe: UNSAFE_RE.test(historyAnswer),
    apiEqualsHistory: sha(apiAnswer) === sha(historyAnswer), rejectedExposed: ("rejectedModelAnswer" in (ask || {})),
    apiAnswerHash: sha(apiAnswer), historyAnswerHash: sha(historyAnswer) };
  fs.writeFileSync(`${liveDir}/${id}.json`, JSON.stringify(rec, null, 2));
  console.log(`LIVE ${id.padEnd(26)} trust=${trust} stage=${stage||"-"} apiUnsafe=${rec.apiUnsafe} histUnsafe=${rec.historyUnsafe} eq=${rec.apiEqualsHistory}`);
}
console.log("\nPOST-FIX rerun complete.");
