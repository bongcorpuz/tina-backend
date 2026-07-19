// PHASE-10A14-E1 WS10/WS11 — adjudicate every VERIFIED_CONTROLLING answer + false-refusal
// review of supported downgrades. Deterministic screening + structured worksheet; the
// human/agent legal verdict is recorded per row. Reads raw payloads only.
import fs from "node:fs";
import path from "node:path";

const RAW = "evaluation/results/phase-10a14-e1/raw/payloads";
const files = fs.readdirSync(RAW).filter(f => f.endsWith(".json"));

const cardLabels = (p) => (p.sourceCards || []).map(c => c.displayLabel || c.label || c.citation || c.title || "").filter(Boolean);
const answerLc = (p) => String(p.answer || "").toLowerCase();

// Red-flag heuristics for automated screening (flags -> manual verdict required).
function screen(p) {
  const flags = [];
  const a = answerLc(p);
  const labels = cardLabels(p).join(" | ").toLowerCase();
  const isPreOrMissing = /pre_?effectivity|missing|malformed|2024|january|june 1|june 18/.test((p.expected||"").toLowerCase())
    || /pre1|pre2|jun18|missing|malformed|2024txn/i.test(p.probeId);
  // RA 12214 must not be applied for pre-effectivity/missing/malformed
  if (isPreOrMissing && /ra\s*12214|12214|cmepa/.test(a) && /(applies|applicable|governs|new rate|reduced rate|1\/10 of 1%)/.test(a))
    flags.push("possible_RA12214_premature_application");
  // laundering target verifieds must cite filing/deadline/estate-base authority, not rate-only
  if (/^ALL26-Q12/.test(p.probeId) && p.finalTrustState === "VERIFIED_CONTROLLING" && !/sec(tion)?\.?\s*51|filing/.test(labels))
    flags.push("Q12_verified_without_filing_authority");
  if (/^ALL26-Q34/.test(p.probeId) && p.finalTrustState === "VERIFIED_CONTROLLING" && !/sec(tion)?\.?\s*51|deadline|return/.test(labels))
    flags.push("Q34_verified_without_deadline_authority");
  if (/^ALL26-Q30/.test(p.probeId) && p.finalTrustState === "VERIFIED_CONTROLLING" && !/estate|deduction|net estate/.test(labels))
    flags.push("Q30_verified_without_estate_base_authority");
  // outcome prediction must never verify
  if (/OUTCOME/.test(p.probeId) && p.finalTrustState === "VERIFIED_CONTROLLING")
    flags.push("outcome_prediction_verified");
  // accessor safety
  if (/ACCESSOR|CONSTRUCTOR/.test(p.probeId) && p.finalTrustState === "VERIFIED_CONTROLLING")
    flags.push("accessor_verified");
  // model override
  if (/MODELOVERRIDE/.test(p.probeId) && p.finalTrustState === "VERIFIED_CONTROLLING")
    flags.push("model_override_verified");
  return flags;
}

const rows = [];
const trustCounts = {};
let techFail = 0;
for (const f of files) {
  const p = JSON.parse(fs.readFileSync(path.join(RAW, f), "utf8"));
  if (p.technicalFailureOnly) { techFail++; continue; }
  trustCounts[p.finalTrustState || "NULL"] = (trustCounts[p.finalTrustState || "NULL"] || 0) + 1;
  const flags = screen(p);
  rows.push({
    probeId: p.probeId, matrixClass: p.matrixClass, trust: p.finalTrustState,
    sourceStatus: p.sourceStatus, cards: cardLabels(p), expected: p.expected,
    flags, answerHead: String(p.answer || "").slice(0, 240)
  });
}

const verified = rows.filter(r => r.trust === "VERIFIED_CONTROLLING");
const downgrades = rows.filter(r => r.trust === "RELATED_AUTHORITY_ONLY" || r.trust === "NO_VERIFIED_AUTHORITY" || r.sourceStatus === "NO_AUTHORITY");
const flaggedVerified = verified.filter(r => r.flags.length);

const out = {
  task: "PHASE-10A14-E1 WS10/WS11 adjudication worksheet",
  totalPayloads: files.length, technicalFailureOnly: techFail,
  trustStateCounts: trustCounts,
  verifiedControllingCount: verified.length,
  flaggedVerifiedCount: flaggedVerified.length,
  autoFlaggedForManualVerdict: flaggedVerified,
  verifiedRows: verified,
  supportedDowngradeRows: downgrades
};
fs.writeFileSync("evaluation/results/phase-10a14-e1/WS10_ADJUDICATION_WORKSHEET.json", JSON.stringify(out, null, 2));
console.log(`payloads=${files.length} techFail=${techFail} verified=${verified.length} flaggedVerified=${flaggedVerified.length}`);
console.log("trustCounts:", JSON.stringify(trustCounts));
if (flaggedVerified.length) { console.log("\nAUTO-FLAGGED verified (need manual legal verdict):"); for (const r of flaggedVerified) console.log(" -", r.probeId, r.flags.join(",")); }
