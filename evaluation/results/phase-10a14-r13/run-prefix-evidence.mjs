// PHASE-10A14-R13 WS2 — immutable PRE-FIX evidence against the UNCHANGED R12 runtime (d91b697).
// Run with the R12 runtime checked out (R13 runtime changes stashed). Detector reproduction for
// explicit + grammar + metamorphic; persistence simulations demonstrate the R12 FALSE-PERSISTED bug
// (persistenceStatus = Boolean(conversationId && userId), ignoring the actual save outcome).
import fs from "node:fs"; import crypto from "node:crypto";
import { evaluateCalendarRelativeDeadline } from "../../../services/answer-support-validator.js";
const sha = (s) => crypto.createHash("sha256").update(typeof s === "string" ? s : JSON.stringify(s)).digest("hex");
const RUNTIME = "d91b6978cda1ed3e31740566de8ef5f2061868ce";
const D = "evaluation/results/phase-10a14-r13/";
const m = JSON.parse(fs.readFileSync(D + "R13_PRE_FIX_MANIFEST.json", "utf8"));
const detDir = D + "prefix/detector"; fs.mkdirSync(detDir, { recursive: true });
const perDir = D + "prefix/persistence"; fs.mkdirSync(perDir, { recursive: true });
const fired = (q, a) => { const r = evaluateCalendarRelativeDeadline({ question: q, answer: a }); return r.applicable && !r.sufficient; };

// explicit
let miss = 0, over = 0;
for (const p of m.explicit) {
  const f = fired(p.question, p.answer);
  const rec = { probeId: p.probeId, kind: p.kind, runtimeCommit: RUNTIME, exactQuestion: p.question, answerFixture: p.answer,
    detectorResult: f ? "DETECT" : "MISS", isDetectorMiss: p.kind === "unsafe" && !f, isSafeOverfire: p.kind === "safe" && f,
    requestHash: sha(p.question), responseHash: sha(p.answer), payloadHash: sha(p.probeId + p.answer) };
  fs.writeFileSync(`${detDir}/${p.probeId}.json`, JSON.stringify(rec, null, 2));
  if (rec.isDetectorMiss) miss++; if (rec.isSafeOverfire) over++;
}
// grammar
let gMiss = 0, gFp = 0;
for (const g of m.grammar) {
  const f = fired("", g.text);
  if (g.expectedUnsafe && !f) gMiss++;
  if (!g.expectedUnsafe && f) gFp++;
}
// metamorphic
let invFail = 0; const invResults = [];
for (const inv of m.metamorphic) {
  const vs = inv.variants.map((v) => Array.isArray(v) ? { text: v[0], expected: v[1] } : { text: v, expected: inv.expectedUnsafe });
  const results = vs.map((v) => ({ text: v.text, expected: v.expected, actual: fired("", v.text) }));
  const ok = results.every((r) => r.actual === r.expected);
  if (!ok) invFail++;
  invResults.push({ id: inv.id, ok, results });
}
fs.writeFileSync(D + "prefix/PRE_FIX_DETECTOR_SUMMARY.json", JSON.stringify({ runtimeCommit: RUNTIME, explicitMisses: miss, explicitOverfires: over, grammarMisses: gMiss, grammarFalsePositives: gFp, metamorphicFailures: invFail, invResults }, null, 2));

// persistence — R12 buggy logic (false PERSISTED)
const r12Status = (o) => (o.conversationId && o.userId) ? "PERSISTED" : (!o.conversationId ? "NOT_PERSISTED_NO_CONVERSATION" : "NOT_PERSISTED_NO_USER");
let falsePersisted = 0;
for (const s of m.persistenceSims) {
  const status = r12Status(s);
  const falseClaim = status === "PERSISTED" && s.expectedStatus !== "PERSISTED";
  const rec = { probeId: s.simId, runtimeCommit: RUNTIME, saveSimulation: s, conversationIdPresent: Boolean(s.conversationId), userIdPresent: Boolean(s.userId),
    r12PersistenceStatus: status, expectedStatus: s.expectedStatus, falsePersistedClaim: falseClaim,
    mismatchReason: falseClaim ? "R12 reports PERSISTED despite failed/partial/timeout save" : "", payloadHash: sha(s.simId + status) };
  fs.writeFileSync(`${perDir}/${s.simId}.json`, JSON.stringify(rec, null, 2));
  if (falseClaim) falsePersisted++;
}
fs.writeFileSync(D + "prefix/PRE_FIX_PERSISTENCE_SUMMARY.json", JSON.stringify({ runtimeCommit: RUNTIME, falsePersistedClaims: falsePersisted }, null, 2));
console.log(`PRE-FIX detector: explicitMisses=${miss}, overfires=${over}, grammarMisses=${gMiss}, grammarFP=${gFp}, metamorphicFailures=${invFail}`);
console.log(`PRE-FIX persistence: falsePersistedClaims=${falsePersisted}`);
