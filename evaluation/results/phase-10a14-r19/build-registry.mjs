// PHASE-10A14-R18 — canonical attempt registry.
// Every count derives from attemptCategory, never from command-name inference.
import fs from "node:fs";
import path from "node:path";
import { validateRetryLinks } from "./retry-validator.mjs";
import { validateGitCommit, FROZEN_ATTEMPT_CATEGORIES } from "./identity.mjs";

const R18 = "evaluation/results/phase-10a14-r19";
const ATT = path.join(R18, "attempts");

const attempts = [];
const malformed = [];
const corrupt = [];

for (const id of (fs.existsSync(ATT) ? fs.readdirSync(ATT).sort() : [])) {
  const dir = path.join(ATT, id);
  if (!fs.statSync(dir).isDirectory()) continue;
  const files = fs.readdirSync(dir);

  // Corruption detection. NUL bytes are NEVER exempt anywhere. Zero-length and
  // whitespace-only are exempt only for raw capture streams and tree listings, which are
  // legitimately empty for a passing suite or a clean tree.
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    if (buf.includes(0x00)) corrupt.push({ attemptId: id, file: f, kind: "NUL_BYTES" });
    const exempt = /\.raw\.txt$/.test(f) || /^tree-/.test(f);
    if (!exempt && buf.length === 0) corrupt.push({ attemptId: id, file: f, kind: "ZERO_LENGTH" });
    if (!exempt && buf.length > 0 && buf.toString("utf8").trim() === "") corrupt.push({ attemptId: id, file: f, kind: "ALL_WHITESPACE" });
  }

  const alloc = files.find((f) => f === "00-allocated.json");
  if (!alloc) { malformed.push({ attemptId: id, reason: "no allocation record" }); continue; }
  const base = JSON.parse(fs.readFileSync(path.join(dir, alloc), "utf8"));

  const terminalFile = files.find((f) => /^20-completed-(pass|fail)\.json$/.test(f));
  const terminal = terminalFile ? JSON.parse(fs.readFileSync(path.join(dir, terminalFile), "utf8")) : null;

  const adjFile = files.find((f) => /^90-recovery-adjudication\.json$/.test(f));
  const adj = adjFile ? JSON.parse(fs.readFileSync(path.join(dir, adjFile), "utf8")) : null;

  const rec = { ...base, ...(terminal || {}) };

  // Precedence: corruption, then invalid provenance, then explicit adjudication, then raw
  // terminal status. An adjudication stating non-controlling overrides a COMPLETED_PASS.
  const isCorrupt = corrupt.some((c) => c.attemptId === id);
  const prov = validateGitCommit(rec.runtimeBaselineCommit);
  rec.provenanceValid = prov.valid;
  rec.provenanceError = prov.valid ? null : prov.error;

  if (isCorrupt) { rec.disposition = "CORRUPT_NON_CONTROLLING"; rec.controlling = false; }
  else if (!prov.valid) { rec.disposition = "INVALID_PROVENANCE_NON_CONTROLLING"; rec.controlling = false; }
  else if (adj) { rec.disposition = adj.disposition; rec.controlling = adj.controlling === true; rec.adjudication = adj.adjudication; }
  else if (!terminal) { rec.disposition = "INCOMPLETE_NON_CONTROLLING"; rec.controlling = false; rec.status = rec.status || "ALLOCATED"; }
  else { rec.disposition = terminal.disposition; rec.controlling = terminal.controlling === true; }

  if (!FROZEN_ATTEMPT_CATEGORIES.has(rec.attemptCategory)) {
    malformed.push({ attemptId: id, reason: `unknown attemptCategory: ${rec.attemptCategory}` });
  }
  attempts.push(rec);
}

const retry = validateRetryLinks(attempts, { verifyEvidenceDelta: true });

const byCategory = {};
for (const c of FROZEN_ATTEMPT_CATEGORIES) byCategory[c] = 0;
for (const a of attempts) byCategory[a.attemptCategory] = (byCategory[a.attemptCategory] || 0) + 1;

const gateCycles = { deterministic: [], staging: [] };
for (const a of attempts) {
  if (gateCycles[a.gateName]) {
    gateCycles[a.gateName].push({
      attemptId: a.attemptId, cycle: a.cycle, attemptOrdinal: a.attemptOrdinal,
      exitCode: a.exitCode ?? null, rawStatus: a.status, disposition: a.disposition,
      controlling: a.controlling, retryOf: a.retryOf ?? null, retryReason: a.retryReason ?? null,
      provenanceValid: a.provenanceValid,
      runtimeTreeDigest: a.runtimeTreeDigest, harnessTreeDigest: a.harnessTreeDigest,
      evidenceHeadAtAllocation: a.evidenceHeadAtAllocation, evidenceHeadAtEnd: a.evidenceHeadAtEnd ?? null
    });
  }
}
const successfulCycles = (g) => new Set(gateCycles[g].filter((a) => a.controlling && a.exitCode === 0).map((a) => a.cycle)).size;

const integrity = {
  duplicates: [], malformed, corrupt,
  invalidProvenance: attempts.filter((a) => !a.provenanceValid).map((a) => a.attemptId),
  retryErrors: retry.errors,
  controllingWithInvalidProvenance: attempts.filter((a) => a.controlling && !a.provenanceValid).map((a) => a.attemptId),
  controllingWithCorruption: attempts.filter((a) => a.controlling && corrupt.some((c) => c.attemptId === a.attemptId)).map((a) => a.attemptId),
  clean: false
};
integrity.clean =
  integrity.malformed.length === 0 && integrity.corrupt.length === 0 &&
  integrity.invalidProvenance.length === 0 && integrity.retryErrors.length === 0 &&
  integrity.controllingWithInvalidProvenance.length === 0 && integrity.controllingWithCorruption.length === 0;

const registry = {
  task: "PHASE-10A14-R18",
  generatedAt: new Date().toISOString(),
  countingRule:
    "A runner invocation is one attempt; a suite inside a runner is not another runner invocation; a probe is not a runner invocation; a retry is a new attempt. Controlling status requires BOTH valid Git provenance AND a VALID_CONTROLLING disposition. Counts derive from attemptCategory, never from command-name inference.",
  counts: {
    totalAttempts: attempts.length,
    byCategory,
    controlling: attempts.filter((a) => a.controlling).length,
    nonControlling: attempts.filter((a) => !a.controlling).length,
    incomplete: attempts.filter((a) => a.disposition === "INCOMPLETE_NON_CONTROLLING" || a.adjudication === "INCOMPLETE_EXTERNALLY_TERMINATED").length,
    corruptAttempts: new Set(corrupt.map((c) => c.attemptId)).size,
    invalidProvenanceAttempts: integrity.invalidProvenance.length,
    validLinkedRetries: retry.validRetryCount
  },
  gateCycles,
  gateOutcome: {
    deterministic: { requiredCycles: 2, successfulCycles: successfulCycles("deterministic") },
    staging: { requiredCycles: 2, successfulCycles: successfulCycles("staging") }
  },
  retryLinkage: { validRetryCount: retry.validRetryCount, validRetries: retry.validRetries, errors: retry.errors, ceiling: retry.ceiling },
  integrity,
  attempts
};

fs.writeFileSync(path.join(R18, "CANONICAL_ATTEMPT_REGISTRY.json"), JSON.stringify(registry, null, 2) + "\n");
fs.writeFileSync(path.join(R18, "CANONICAL_COUNT_SUMMARY.json"), JSON.stringify({
  task: "PHASE-10A14-R18", generatedAt: registry.generatedAt,
  derivedFrom: "CANONICAL_ATTEMPT_REGISTRY.json",
  countingRule: registry.countingRule, counts: registry.counts,
  gateOutcome: registry.gateOutcome, integrity
}, null, 2) + "\n");
fs.writeFileSync(path.join(R18, "RETRY_LINK_SUMMARY.json"), JSON.stringify({
  task: "PHASE-10A14-R18", generatedAt: registry.generatedAt,
  rule: "A retry is valid only if runtime, harness, dependency, environment and command identity are unchanged, the structural link is sound, and the evidence-HEAD delta contains only authorized evidence paths. Evidence HEAD may move; that is the R17 fix.",
  ...registry.retryLinkage
}, null, 2) + "\n");

console.log(`attempts=${attempts.length} controlling=${registry.counts.controlling} validRetries=${retry.validRetryCount}`);
console.log(`deterministic ${registry.gateOutcome.deterministic.successfulCycles}/2 | staging ${registry.gateOutcome.staging.successfulCycles}/2`);
console.log(`integrity.clean=${integrity.clean} retryErrors=${retry.errors.length}`);
