// PHASE-10A14-E1 WS12 — persistence & history consistency (synthetic namespace).
// For representative classes: create a conversation, /ask with it, read back
// /conversations/:id/messages, compare immediate vs persisted trust/source state.
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";

const ROOT = process.cwd();
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const ASK_URL = process.env.TINA_STAGING_ASK_URL;
const BASE = ASK_URL.replace(/(https?:\/\/[^/]+).*/, "$1");
const USER = "00000000-0000-4000-8000-0000000e1001";
const token = jwt.sign({ id: USER, username: "e1-eval-synthetic", role: "user", otpVerified: true,
  adaptiveEnabled: true, orchestrationCompatible: true, activeMode: "STANDARD_TAX_MODE", activeHook: "/ask" },
  process.env.JWT_SECRET, { expiresIn: "3h" });
const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

const CASES = [
  ["individual_filing_obligation", "Is an individual with purely compensation income from a single employer required to file an annual ITR under substituted filing?"],
  ["filing_deadline", "What is the deadline for the annual income tax return of an individual?"],
  ["substituted_filing", "What are the conditions for substituted filing of the income tax return?"],
  ["historical_ordinary_filing", "For taxable year 2023, what was the individual annual ITR filing requirement?"],
  ["section51c2_post", "A taxpayer sold unlisted shares of a domestic corporation on August 5, 2025. Which CGT return and rate apply?"],
  ["section51c2_pre", "A taxpayer sold unlisted shares of a domestic corporation on January 15, 2025. Which CGT return and rate apply?"],
  ["section51c2_malformed", "A taxpayer sold unlisted shares of a domestic corporation on 2025-13-45. Which CGT return and rate apply?"],
  ["estate_safeguard", "What is the estate tax rate under the TRAIN law?"],
  ["vat_safeguard", "Is leasing a residential unit at PHP 15,000 per month subject to VAT?"],
  ["canonical_unsafe", "Will I win my BIR tax case if I go to the Court of Tax Appeals?"]
];

async function jpost(url, body) { const r = await fetch(url, { method: "POST", headers: H, body: JSON.stringify(body) }); return { status: r.status, json: await r.json().catch(() => null) }; }
async function jget(url) { const r = await fetch(url, { headers: H }); return { status: r.status, json: await r.json().catch(() => null) }; }

const rows = [];
for (const [cls, q] of CASES) {
  const conv = await jpost(`${BASE}/conversations`, { title: `e1-ws12-${cls}` });
  const cid = conv.json?.id || conv.json?.conversationId || conv.json?.conversation?.id;
  const ask = await jpost(ASK_URL, { question: q, userId: USER, conversationId: cid, forcedHook: "/ask" });
  const immTrust = ask.json?.trust?.authoritySupport ?? null;
  const immSource = ask.json?.trust?.sourceState ?? ask.json?.sourceStatus ?? null;
  const immCards = (ask.json?.sourceCards || []).length;
  await new Promise(r => setTimeout(r, 1500));
  const msgs = await jget(`${BASE}/conversations/${cid}/messages`);
  const arr = Array.isArray(msgs.json) ? msgs.json : (msgs.json?.messages || msgs.json?.data || []);
  const assistant = arr.filter(m => (m.role || m.sender) !== "user");
  const last = assistant[assistant.length - 1] || arr[arr.length - 1] || {};
  const perTrust = last.trust?.authoritySupport ?? null;
  const perSource = last.trust?.sourceState ?? null;
  const perCards = (last.sources_used || last.sourcesUsed || last.sources || []).length;
  const consistent = immTrust === perTrust && (immSource === perSource || (immSource && perSource));
  rows.push({ cls, conversationId: cid, immTrust, perTrust, immSource, perSource, immCards, perCards, persistedMessages: arr.length, consistent });
  console.log(`${cls}: imm=${immTrust}/${immSource} per=${perTrust}/${perSource} cards ${immCards}->${perCards} consistent=${consistent}`);
}
const mismatches = rows.filter(r => !r.consistent);
const out = { task: "PHASE-10A14-E1 WS12 persistence & history consistency", cases: rows.length, mismatches: mismatches.length, rows };
fs.writeFileSync("evaluation/results/phase-10a14-e1/WS12_PERSISTENCE.json", JSON.stringify(out, null, 2));
console.log(`\nWS12 cases=${rows.length} mismatches=${mismatches.length}`);
