// PHASE-10A14-E1 — evidence-only checkpointed live harness.
//
// Reads ONLY the frozen manifest (probe list). Calls the unchanged governed R8
// staging runtime (/ask) with gpt-4o-mini. Writes one immutable payload per
// attempt, an append-only runlog, and checkpoints after every probe so an
// interrupted run resumes without duplicating completed calls.
//
// It NEVER alters the prompt/answer, injects authorities, selects a preferred
// answer, or retries for a better trust state. Retries are permitted ONLY for
// objective technical failures (transport/timeout/empty/5xx/429), max 2.
//
// Usage: node e1-live-harness.mjs <manifestPath> <outDir> [--limit N] [--only PREFIX]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

// ---- env ----
const ROOT = process.cwd();
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const ASK_URL = process.env.TINA_STAGING_ASK_URL;
const JWT_SECRET = process.env.JWT_SECRET;
if (!ASK_URL || !JWT_SECRET) { console.error("Missing TINA_STAGING_ASK_URL or JWT_SECRET"); process.exit(2); }

const sha256 = (s) => crypto.createHash("sha256").update(typeof s === "string" ? s : JSON.stringify(s)).digest("hex");
const SYNTH_USER = "00000000-0000-4000-8000-0000000e1001";
function mintToken() {
  return jwt.sign(
    { id: SYNTH_USER, username: "e1-eval-synthetic", role: "user", otpVerified: true,
      adaptiveEnabled: true, orchestrationCompatible: true, activeMode: "STANDARD_TAX_MODE", activeHook: "/ask" },
    JWT_SECRET, { expiresIn: "3h" }
  );
}

const args = process.argv.slice(2);
const manifestPath = args[0];
const outDir = args[1];
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const onlyIdx = args.indexOf("--only");
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
let probes = manifest.probes || manifest;
if (ONLY) probes = probes.filter((p) => p.probeId.startsWith(ONLY));

const payloadDir = path.join(outDir, "payloads");
fs.mkdirSync(payloadDir, { recursive: true });
const runlogPath = path.join(outDir, "runlog.jsonl");

async function callAsk(question, token, conversationId) {
  const body = { question, userId: SYNTH_USER, forcedHook: "/ask" };
  if (conversationId) body.conversationId = conversationId;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 180000);
  const startedAt = Date.now();
  try {
    const res = await fetch(ASK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body), signal: ctrl.signal
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, ms: Date.now() - startedAt };
  } catch (e) {
    return { ok: false, status: null, text: "", ms: Date.now() - startedAt, error: String(e?.message || e) };
  } finally { clearTimeout(to); }
}

function classifyFailure(r) {
  if (r.error && /abort|timeout/i.test(r.error)) return "timeout";
  if (r.error) return "transport";
  if (r.status === 429) return "rate_limit";
  if (r.status >= 500) return "server_5xx";
  if (!r.text || r.text.trim() === "") return "empty";
  try { JSON.parse(r.text); } catch { return "degenerate_json"; }
  return null;
}

async function runProbe(probe, token) {
  const outFile = path.join(payloadDir, `${probe.probeId}.json`);
  if (fs.existsSync(outFile)) return { probeId: probe.probeId, skipped: true };

  const attempts = [];
  let final = null;
  for (let attempt = 1; attempt <= 3; attempt++) { // 1 + up to 2 technical retries
    const r = await callAsk(probe.question, token, probe.conversationId);
    const failType = r.ok ? classifyFailure(r) : (classifyFailure(r) || "transport");
    let parsed = null; try { parsed = JSON.parse(r.text); } catch {}
    attempts.push({ attempt, status: r.status, ms: r.ms, failType: failType || null, error: r.error || null });
    if (r.ok && !failType && parsed) { final = { r, parsed, attempt }; break; }
    if (attempt >= 3) break;
    await new Promise((res) => setTimeout(res, 1500 * attempt));
  }

  const nowIso = new Date().toISOString();
  const p = final?.parsed || null;
  const requestBody = { question: probe.question, userId: SYNTH_USER, forcedHook: "/ask" };
  const payload = {
    probeId: probe.probeId,
    mappedOriginalProbeIds: probe.mappedOriginalProbeIds || [],
    matrixClass: probe.matrixClass,
    expected: probe.expected || null,
    runtimeCommit: "0c80b121451678e8a1565d59bbfe06f36900328c",
    stagingDeploymentId: "tina-backend-staging",
    model: "gpt-4o-mini",
    exactQuestion: probe.question,
    materialFacts: probe.materialFacts || null,
    taxpayerType: probe.taxpayerType || null,
    returnType: probe.returnType || null,
    taxType: probe.taxType || null,
    taxablePeriod: probe.taxablePeriod || null,
    transactionDate: probe.transactionDate || null,
    dispositionDate: probe.dispositionDate || null,
    legalAsOfDate: probe.legalAsOfDate || null,
    requestTimestamp: nowIso,
    answer: p?.answer ?? null,
    responseType: p?.responseType ?? null,
    sourceStatus: p?.sourceStatus ?? null,
    sourceAvailability: p?.sourceAvailability ?? null,
    displayedSourceCount: p?.displayedSourceCount ?? null,
    retrievedSourceCount: p?.retrievedSourceCount ?? null,
    sourceCards: p?.sourceCards ?? [],
    trust: p?.trust ?? null,
    finalTrustState: p?.trust?.authoritySupport ?? null,
    legalConclusion: p?.trust?.legalConclusion ?? null,
    limitations: p?.trust?.limitations ?? [],
    openaiCalls: p?.openaiCalls ?? null,
    metadata: p?.metadata ?? null,
    httpStatus: final?.r?.status ?? attempts[attempts.length - 1]?.status ?? null,
    attempts,
    attemptNumber: final?.attempt ?? attempts.length,
    retryReason: attempts.length > 1 ? attempts.slice(0, -1).map((a) => a.failType).filter(Boolean) : [],
    technicalFailureOnly: !final,
    requestHash: sha256(requestBody),
    responseHash: final ? sha256(final.r.text) : null,
    adjudicationStatus: "PENDING"
  };
  payload.payloadHash = sha256({ ...payload, payloadHash: undefined });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
  fs.appendFileSync(runlogPath, JSON.stringify({
    ts: nowIso, probeId: probe.probeId, matrixClass: probe.matrixClass,
    httpStatus: payload.httpStatus, finalTrustState: payload.finalTrustState,
    sourceStatus: payload.sourceStatus, attempts: attempts.length,
    technicalFailureOnly: payload.technicalFailureOnly, responseHash: payload.responseHash
  }) + "\n");
  return { probeId: probe.probeId, trust: payload.finalTrustState, status: payload.httpStatus, tech: payload.technicalFailureOnly };
}

// bounded sequential execution (concurrency 1 to avoid rate-limit distortion on Render)
const token = mintToken();
let tokenIssuedAt = Date.now();
let done = 0, executed = 0;
for (const probe of probes) {
  if (executed >= LIMIT) break;
  // refresh token hourly
  let tk = token;
  if (Date.now() - tokenIssuedAt > 2.5 * 3600 * 1000) { tk = mintToken(); tokenIssuedAt = Date.now(); }
  const res = await runProbe(probe, tk);
  done++;
  if (!res.skipped) executed++;
  const tag = res.skipped ? "SKIP(done)" : `${res.status} ${res.trust || (res.tech ? "TECH_FAIL" : "-")}`;
  console.log(`[${done}/${probes.length}] ${probe.probeId} :: ${tag}`);
}
console.log(`\nE1 harness batch complete: ${done} processed, ${executed} newly executed.`);
