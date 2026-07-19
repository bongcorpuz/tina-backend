// PHASE-10A14-R12 WS2 — immutable PRE-FIX evidence against the UNCHANGED R11 runtime.
// Part A: deterministic detector reproduction for every fixture (answer != null).
// Part B: live handler for the P-category (F32 / domain-boundary / verified / calendar) to
//         capture the API/persistence/history mismatch (P1-R11-IR-002).
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import jwt from "jsonwebtoken";
import { evaluateCalendarRelativeDeadline, evaluateAnswerSupport } from "../../../services/answer-support-validator.js";
const ROOT = process.cwd();
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const sha = (s) => crypto.createHash("sha256").update(s || "").digest("hex");
const RUNTIME = "90d70fec2dde9e9985c0b2a17c2c19f199923fa6";
const D = "evaluation/results/phase-10a14-r12/";
const manifest = JSON.parse(fs.readFileSync(D + "R12_PRE_FIX_MANIFEST.json", "utf8"));
const detDir = D + "prefix/detector"; fs.mkdirSync(detDir, { recursive: true });
const perDir = D + "prefix/persistence"; fs.mkdirSync(perDir, { recursive: true });
const runlog = D + "prefix/runlog.jsonl";
const SEC51 = [{ label: "NIRC Sec. 51" }];

// Part A: deterministic
let miss = 0, fp = 0;
for (const p of manifest.probes) {
  if (p.answer == null) continue;
  const det = evaluateCalendarRelativeDeadline({ question: p.question, answer: p.answer });
  const e = await evaluateAnswerSupport({ question: p.question, answer: p.answer, sources: SEC51 });
  const fired = det.applicable && !det.sufficient;
  const rec = { probeId: p.probeId, category: p.category, kind: p.kind, runtimeCommit: RUNTIME,
    exactQuestion: p.question, generatedAnswerFixture: p.answer, clauseAnalysis: det.diagnostics || null,
    detectorResult: fired ? "DETECT" : "MISS", answerSupportStage: e.stage,
    isDetectorMiss: p.kind === "unsafe" && !fired, isSafeFalsePositive: p.kind === "safe" && fired,
    requestHash: sha(p.question), responseHash: sha(p.answer), timestamp: new Date().toISOString() };
  rec.payloadHash = sha(JSON.stringify({ ...rec, payloadHash: undefined }));
  fs.writeFileSync(`${detDir}/${p.probeId}.json`, JSON.stringify(rec, null, 2));
  fs.appendFileSync(runlog, JSON.stringify({ ts: rec.timestamp, probeId: p.probeId, kind: p.kind, detectorResult: rec.detectorResult, isDetectorMiss: rec.isDetectorMiss }) + "\n");
  if (rec.isDetectorMiss) miss++; if (rec.isSafeFalsePositive) fp++;
}
fs.writeFileSync(D + "prefix/PRE_FIX_DETECTOR_SUMMARY.json", JSON.stringify({ runtimeCommit: RUNTIME, unsafeMissed: miss, safeFalsePositives: fp }, null, 2));
console.log(`PRE-FIX deterministic: misses=${miss}, false-positives=${fp}`);

// Part B: live persistence (P-category)
const ASK = process.env.TINA_STAGING_ASK_URL, BASE = ASK.replace(/(https?:\/\/[^/]+).*/, "$1"), USER = "00000000-0000-4000-8000-0000000e1001";
const tok = jwt.sign({ id: USER, username: "e1-eval-synthetic", role: "user", otpVerified: true, adaptiveEnabled: true, orchestrationCompatible: true, activeMode: "STANDARD_TAX_MODE", activeHook: "/ask" }, process.env.JWT_SECRET, { expiresIn: "3h" });
const H = { "Content-Type": "application/json", Authorization: `Bearer ${tok}` };
const jp = async (u, b) => { const r = await fetch(u, { method: "POST", headers: H, body: JSON.stringify(b) }); return await r.json().catch(() => null); };
const jg = async (u) => { const r = await fetch(u, { headers: H }); return await r.json().catch(() => null); };
for (const p of manifest.probes.filter((x) => x.category === "P")) {
  const conv = await jp(`${BASE}/conversations`, { title: `r12pre-${p.probeId}` });
  const cid = conv?.id || conv?.conversationId || conv?.conversation?.id;
  const ask = await jp(ASK, { question: p.question, userId: USER, conversationId: cid, forcedHook: "/ask" });
  const api = ask?.answer || "";
  await new Promise((r) => setTimeout(r, 1500));
  const msgs = await jg(`${BASE}/conversations/${cid}/messages`);
  const arr = Array.isArray(msgs) ? msgs : (msgs?.messages || msgs?.data || []);
  const last = arr.filter((m) => (m.role || m.sender) !== "user").pop() || {};
  const hist = last.content || last.answer || "";
  const rec = { probeId: p.probeId, runtimeCommit: RUNTIME, exactQuestion: p.question,
    publicApiAnswer: api, publicApiAnswerHash: sha(api), persistedAnswer: hist, persistedAnswerHash: sha(hist),
    historyReadbackAnswer: hist, historyReadbackAnswerHash: sha(hist),
    apiTrust: ask?.trust?.authoritySupport ?? null, persistedTrust: last.trust?.authoritySupport ?? null,
    responseType: ask?.responseType || ask?.routeKind || null, persistenceStatus: ask?.persistenceStatus || null,
    apiEqualsHistory: sha(api) === sha(hist), mismatchClassification: sha(api) === sha(hist) ? "OK" : (hist === "" ? "EMPTY_HISTORY" : "DIFFERENT") };
  fs.writeFileSync(`${perDir}/${p.probeId}.json`, JSON.stringify(rec, null, 2));
  console.log(`LIVE ${p.probeId.padEnd(22)} type=${rec.responseType} apiEqHist=${rec.apiEqualsHistory} class=${rec.mismatchClassification}`);
}
console.log("\nPRE-FIX complete.");
