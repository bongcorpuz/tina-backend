// PHASE-10A14-R17 COMMIT 3 — pre-fix reproduction against unchanged R16 runtime.
//
// Reproduces all seven required items and applies the new validators to the historical
// R16 evidence read-only. No remediation happens here.

import fs from "node:fs";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import {
  validateSha, validateAttemptProvenance, scanAttemptCorruption,
  readAdjudication, resolveDisposition, validateRetryLinks
} from "./validators.mjs";

const REPO = "C:/Projects/tina-backend";
const D = "evaluation/results/phase-10a14-r17/";
const R16 = "evaluation/results/phase-10a14-r16";
const out = { task: "PHASE-10A14-R17", phase: "PRE_FIX", generatedAt: new Date().toISOString(),
  statement: "Reproduction against unchanged R16 runtime, before any repair. Historical R16 evidence read READ-ONLY and never modified." };

// ── 1. Customs + capital-gain domain false refusals ─────────────────────────
const { detectPhilippineTaxBoundary } = await import("file:///" + path.join(REPO, "services/philippine-tax-domain-boundary.js").replace(/\\/g, "/"));
const inv = JSON.parse(fs.readFileSync(path.join(REPO, D, "R17_DOMAIN_PROBE_INVENTORY.json"), "utf8"));
let falseAllow = 0, falseRefusal = 0;
const byClass = {};
for (const p of inv.probes) {
  const d = detectPhilippineTaxBoundary(p.text, "/ask");
  const got = d.decision === "ALLOW" ? "ALLOW" : "NOT_ALLOW";
  const ok = p.expected === "CLARIFY_OR_NOT_ALLOW" ? got === "NOT_ALLOW" : got === p.expected;
  const c = (byClass[p.coverageClass] ||= { total: 0, pass: 0, falseAllow: 0, falseRefusal: 0, failing: [] });
  c.total++;
  if (ok) c.pass++;
  else {
    if (p.expected === "ALLOW") { falseRefusal++; c.falseRefusal++; } else { falseAllow++; c.falseAllow++; }
    if (c.failing.length < 5) c.failing.push({ probeId: p.probeId, expected: p.expected, got, reason: d.reason });
  }
}
out.domain = { totalProbes: inv.probes.length, falseAllow, falseRefusal, byClass };

// ── 2-3. The two deterministic failures ─────────────────────────────────────
const runSuite = (script) => {
  const r = spawnSync(process.execPath, [script], { cwd: REPO, encoding: "utf8", timeout: 900000 });
  return { exitCode: r.status, stdout: (r.stdout || "").slice(-4000), stderr: (r.stderr || "").slice(-2000) };
};
const a8 = runSuite("tests/phase-10a8-trust-calibration-and-answer-correctness-remediation-1.test.mjs");
out.phase10a8 = { exitCode: a8.exitCode, reproduced: a8.exitCode !== 0, f14Failing: /F14/.test(a8.stdout) };
const b07 = runSuite("tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs");
out.patch07b = {
  exitCode: b07.exitCode, reproduced: b07.exitCode !== 0,
  rootCause: "spawnSync ENOBUFS in the test's git() helper: git ls-files output exceeds Node's 1 MiB default maxBuffer, so status is null and assert.equal(status,0) fails with 'null !== 0'. The guard dies while ENUMERATING files and never evaluates a marker.",
  nullStatusObserved: /null !== 0/.test(b07.stdout + b07.stderr),
  gitLsFilesBytes: Number(execSync("git ls-files | wc -c", { cwd: REPO, encoding: "utf8" }).trim()),
  gitLsFilesCount: Number(execSync("git ls-files | wc -l", { cwd: REPO, encoding: "utf8" }).trim()),
  nodeDefaultMaxBuffer: 1048576
};

// ── 4. Staging phase-09r ────────────────────────────────────────────────────
const stg = spawnSync(process.execPath, ["tests/phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs"], { cwd: REPO, encoding: "utf8", timeout: 900000, env: process.env });
out.phase09r = {
  exitCode: stg.status,
  currentlyPasses: stg.status === 0,
  note: "Independent review observed this failing with staging temporarily unreachable. Current local execution result recorded truthfully; classification is made in COMMIT 6."
};

// ── 5. Corrupted partial import counted controlling ─────────────────────────
const A3 = "R16-FOCUSED-r15-journal-crash-A3";
const a3dir = path.join(REPO, R16, "attempts", A3);
const r16reg = JSON.parse(fs.readFileSync(path.join(REPO, R16, "CANONICAL_ATTEMPT_REGISTRY.json"), "utf8"));
const a3rec = r16reg.attempts.find((x) => x.attemptId === A3);
const corruption = scanAttemptCorruption(a3dir);
const adj = readAdjudication(a3dir);
const r17disp = resolveDisposition({ dir: a3dir, rawStatus: a3rec.status, provenanceValid: true, adjudication: adj, corruption });
out.corruptedPartialImport = {
  attemptId: A3,
  r16Registry: { status: a3rec.status, controlling: a3rec.controlling, malformed: a3rec.malformed },
  adjudicationDisposition: adj ? adj.disposition : null,
  corruptionFindings: corruption.findings,
  r17Disposition: r17disp.disposition,
  r17Controlling: r17disp.controlling,
  defectConfirmed: a3rec.controlling === true && r17disp.controlling === false
};

// ── 6. Retry accounting ─────────────────────────────────────────────────────
const detAttempts = r16reg.attempts.filter((x) => x.attemptType === "DETERMINISTIC_GATE");
const retryCheck = validateRetryLinks(r16reg.attempts.map((x) => ({ attemptId: x.attemptId, retryOf: x.retryOf, retryReason: null, runtimeCommit: x.runtimeCommit })));
out.retryAccounting = {
  r16ReportedRetries: r16reg.counts.retries,
  deterministicAttempts: detAttempts.map((x) => ({ attemptId: x.attemptId, status: x.status, retryOf: x.retryOf })),
  validLinkedRetries: retryCheck.validRetryCount,
  defectConfirmed: r16reg.counts.retries === 0 && detAttempts.length > 1,
  note: "R16 described attempts A3 and A4 as technical retries and claimed a ceiling was reached, but no retry link exists. Under the R17 contract these are unlinked reruns."
};

// ── 7. Fabricated SHA vs old integrity ──────────────────────────────────────
const FAB = "a802064a1b32e8a68a0b8c4dd1f8a1b0c9a5e2f7";
const fabCheck = validateSha(FAB);
const carrying = r16reg.attempts.filter((x) => x.runtimeCommit === FAB).map((x) => x.attemptId);
const provScan = r16reg.attempts.map((x) => ({ attemptId: x.attemptId, ...validateAttemptProvenance({ headAtStart: x.headAtStart, headAtEnd: x.headAtEnd, runtimeCommit: x.runtimeCommit }) }));
out.fabricatedSha = {
  sha: FAB,
  gitObjectExists: fabCheck.exists,
  validationErrors: fabCheck.errors,
  attemptsCarryingIt: carrying.length,
  attemptIds: carrying,
  r16IntegrityClean: r16reg.integrity.clean,
  r17InvalidProvenanceAttempts: provScan.filter((x) => !x.provenanceValid).length,
  defectConfirmed: r16reg.integrity.clean === true && carrying.length > 0 && fabCheck.exists === false
};

fs.mkdirSync(path.join(REPO, D), { recursive: true });
fs.writeFileSync(path.join(REPO, D, "R17_PREFIX_REPRODUCTION.json"), JSON.stringify(out, null, 2) + "\n");

console.log(`domain: probes=${out.domain.totalProbes} falseAllow=${falseAllow} falseRefusal=${falseRefusal}`);
for (const [k, v] of Object.entries(byClass)) if (v.falseAllow || v.falseRefusal) console.log(`  ${k.padEnd(26)} pass=${v.pass}/${v.total} falseAllow=${v.falseAllow} falseRefusal=${v.falseRefusal}`);
console.log(`phase-10a8 exit=${out.phase10a8.exitCode} reproduced=${out.phase10a8.reproduced}`);
console.log(`patch-07b  exit=${out.patch07b.exitCode} reproduced=${out.patch07b.reproduced} lsFilesBytes=${out.patch07b.gitLsFilesBytes} > ${out.patch07b.nodeDefaultMaxBuffer}`);
console.log(`phase-09r  exit=${out.phase09r.exitCode} currentlyPasses=${out.phase09r.currentlyPasses}`);
console.log(`corrupt import: r16Controlling=${out.corruptedPartialImport.r16Registry.controlling} r17Controlling=${out.corruptedPartialImport.r17Controlling} confirmed=${out.corruptedPartialImport.defectConfirmed}`);
console.log(`retries: r16=${out.retryAccounting.r16ReportedRetries} validLinked=${out.retryAccounting.validLinkedRetries} confirmed=${out.retryAccounting.defectConfirmed}`);
console.log(`fabricated SHA: exists=${out.fabricatedSha.gitObjectExists} carriedBy=${out.fabricatedSha.attemptsCarryingIt} r16Clean=${out.fabricatedSha.r16IntegrityClean} confirmed=${out.fabricatedSha.defectConfirmed}`);
