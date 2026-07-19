// PHASE-10A14-R10 — affected live differential + API/persistence/history consistency.
// For each probe: create a conversation, /ask with it (capture public API answer + trust),
// then read back /conversations/:id/messages (persisted + history answer). Verifies the
// unsafe generated text is absent from API, persistence and history. Checkpointed.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import jwt from "jsonwebtoken";
const ROOT = process.cwd();
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const ASK = process.env.TINA_STAGING_ASK_URL, BASE = ASK.replace(/(https?:\/\/[^/]+).*/, "$1"), USER = "00000000-0000-4000-8000-0000000e1001";
const RUNTIME = "05faa60dadc1b52214c162c51fae2c317d46f9af";
const tok = jwt.sign({ id: USER, username: "e1-eval-synthetic", role: "user", otpVerified: true, adaptiveEnabled: true, orchestrationCompatible: true, activeMode: "STANDARD_TAX_MODE", activeHook: "/ask" }, process.env.JWT_SECRET, { expiresIn: "3h" });
const H = { "Content-Type": "application/json", Authorization: `Bearer ${tok}` };
const sha = (s) => crypto.createHash("sha256").update(s || "").digest("hex");
const UNSAFE_RE = /today is (?:the )?last day|due today|file (?:it |your return |the return )?today|by the end of (?:the day|today)|today is april\s*15|already late|(?:you are|you're) still on time|submit (?:it |your return |the return )?today|huli (?:ka )?na|due ngayon|ngayon ang (?:huling|deadline)/i;
const jp = async (u, b) => { const r = await fetch(u, { method: "POST", headers: H, body: JSON.stringify(b) }); return { s: r.status, j: await r.json().catch(() => null) }; };
const jg = async (u) => { const r = await fetch(u, { headers: H }); return { s: r.status, j: await r.json().catch(() => null) }; };

const plan = JSON.parse(fs.readFileSync("evaluation/results/phase-10a14-r10/R10_LIVE_PLAN.json", "utf8"));
const outDir = "evaluation/results/phase-10a14-r10/raw"; fs.mkdirSync(path.join(outDir, "payloads"), { recursive: true });
const runlog = path.join(outDir, "runlog.jsonl");

for (const probe of plan.probes) {
  const outFile = path.join(outDir, "payloads", `${probe.probeId}.json`);
  if (fs.existsSync(outFile)) { console.log(`SKIP ${probe.probeId}`); continue; }
  const conv = await jp(`${BASE}/conversations`, { title: `r10-${probe.probeId}` });
  const cid = conv.j?.id || conv.j?.conversationId || conv.j?.conversation?.id;
  const ask = await jp(ASK, { question: probe.question, userId: USER, conversationId: cid, forcedHook: "/ask" });
  const apiAnswer = ask.j?.answer || "";
  const trust = ask.j?.trust?.authoritySupport ?? null;
  const stage = ask.j?.answerSupport?.stage ?? null;
  await new Promise((r) => setTimeout(r, 1500));
  const msgs = await jg(`${BASE}/conversations/${cid}/messages`);
  const arr = Array.isArray(msgs.j) ? msgs.j : (msgs.j?.messages || msgs.j?.data || []);
  const assistant = arr.filter((m) => (m.role || m.sender) !== "user");
  const last = assistant[assistant.length - 1] || {};
  const historyAnswer = last.content || last.answer || "";
  const persistedTrust = last.trust?.authoritySupport ?? null;
  const rec = {
    probeId: probe.probeId, runtimeCommit: RUNTIME, question: probe.question,
    apiAnswer, apiTrust: trust, validatorStage: stage,
    publicSourceCards: (ask.j?.sourceCards || []).map((c) => c.displayLabel || c.label || c.citation || c.title).filter(Boolean),
    historyAnswer, persistedTrust,
    rejectedModelAnswerExposed: ("rejectedModelAnswer" in (ask.j || {})) || ("calendarRelativeReplaced" in (ask.j || {})),
    apiUnsafe: UNSAFE_RE.test(apiAnswer), historyUnsafe: UNSAFE_RE.test(historyAnswer),
    apiEqualsHistory: sha(apiAnswer) === sha(historyAnswer),
    trustConsistent: trust === persistedTrust,
    apiAnswerHash: sha(apiAnswer), historyAnswerHash: sha(historyAnswer)
  };
  fs.writeFileSync(outFile, JSON.stringify(rec, null, 2));
  fs.appendFileSync(runlog, JSON.stringify({ ts: new Date().toISOString(), probeId: probe.probeId, trust, stage, apiUnsafe: rec.apiUnsafe, historyUnsafe: rec.historyUnsafe, apiEqualsHistory: rec.apiEqualsHistory }) + "\n");
  console.log(`${probe.probeId} :: trust=${trust} stage=${stage||"-"} apiUnsafe=${rec.apiUnsafe} histUnsafe=${rec.historyUnsafe} eq=${rec.apiEqualsHistory}`);
}
console.log("\nR10 live differential complete.");
