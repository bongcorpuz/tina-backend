// PHASE-10A14-R18 — focused campaign.
// A printed PASS with a nonzero process exit is a FAILURE. Exit code is authoritative.
// Usage: node run-focused-campaign.mjs <externalCaptureDir>
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { execSync } from "node:child_process";

const capture = process.argv[2];
if (!capture) { console.error("external capture directory is required"); process.exit(2); }
fs.mkdirSync(capture, { recursive: true });

const SUITES = [
  // R18 suites
  ["r18-identity-retry", "tests/phase-10a14-r18-runtime-identity-and-retry.test.mjs"],
  ["r18-domain-hardening", "tests/phase-10a14-r18-domain-hardening.test.mjs"],
  ["r18-all26-write-isolation", "tests/phase-10a14-r18-all26-write-isolation.test.mjs"],
  ["r18-09zf-scope-guard", "tests/phase-10a14-r18-09zf-scope-guard.test.mjs"],
  // regression gates
  ["phase-09zf", "tests/phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs"],
  ["r17-validators", "tests/phase-10a14-r17-provenance-recovery-retry.test.mjs"],
  ["r17-domain", "tests/phase-10a14-r17-customs-capital-gain-domain.test.mjs"],
  ["phase-10a8", "tests/phase-10a8-trust-calibration-and-answer-correctness-remediation-1.test.mjs"],
  ["patch-07b", "tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs"],
  ["phase-09r-staging", "tests/phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs"],
  ["r16-domain", "tests/phase-10a14-r16-non-tax-domain-boundary.test.mjs"],
  ["r16-tooling", "tests/phase-10a14-r16-evidence-tooling.test.mjs"],
  ["r15-journal-crash", "tests/phase-10a14-r15-crash-visible-attempt-journal.test.mjs"],
  ["r15-focused", "tests/phase-10a14-r15-semantic-composition-tax-adjacency-and-persistence-receipt.test.mjs"],
  ["r14-focused", "tests/phase-10a14-r14-negated-nonperformance-and-universal-persistence-status.test.mjs"],
  ["r13-focused", "tests/phase-10a14-r13-polarity-aware-directive-and-persistence-receipt.test.mjs"],
  ["r12-focused", "tests/phase-10a14-r12-semantic-filing-directive-and-not-applicable-persistence.test.mjs"],
  ["r11-focused", "tests/phase-10a14-r11-calendar-directive-completeness-and-contextual-safe-answer.test.mjs"],
  ["r10-focused", "tests/phase-10a14-r10-calendar-relative-public-answer-replacement.test.mjs"],
  ["r9-focused", "tests/phase-10a14-r9-calendar-relative-deadline-and-filing-rationale-alignment.test.mjs"]
];

const results = [];
for (const [id, script] of SUITES) {
  if (!fs.existsSync(script)) { results.push({ id, script, exitCode: null, status: "MISSING", passed: false }); continue; }
  const r = spawnSync("node", [script], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(capture, `${id}.stdout.txt`), r.stdout || "");
  fs.writeFileSync(path.join(capture, `${id}.stderr.txt`), r.stderr || "");
  const line = (r.stdout || "").split(/\r?\n/).filter((l) => /tests: /.test(l)).pop() || "";
  results.push({ id, script, exitCode: r.status, signal: r.signal ?? null, summaryLine: line.trim(), passed: r.status === 0 });
  console.log(`exit=${r.status} ${id}`);
}

// The isolated all-26 replay, from the NEW R18 path, into the external capture directory.
const all26Dest = path.join(capture, "all26-isolated-from-campaign.json");
const a = spawnSync("node", ["evaluation/results/phase-10a14-r18/all26-isolated.mjs", all26Dest],
                    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
fs.writeFileSync(path.join(capture, "all26-isolated.stdout.txt"), a.stdout || "");
results.push({ id: "r18-all26-isolated-replay", script: "evaluation/results/phase-10a14-r18/all26-isolated.mjs",
               exitCode: a.status, summaryLine: (a.stdout || "").trim().split(/\r?\n/)[0] || "", passed: a.status === 0 });
console.log(`exit=${a.status} r18-all26-isolated-replay`);

const out = {
  task: "PHASE-10A14-R18",
  generatedAt: new Date().toISOString(),
  evidenceHead: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
  rule: "A printed PASS with a nonzero process exit is a failure. Exit code is authoritative.",
  suites: results.length,
  allPassed: results.every((r) => r.passed),
  failed: results.filter((r) => !r.passed).map((r) => r.id),
  results
};
fs.writeFileSync("evaluation/results/phase-10a14-r18/FOCUSED_SUMMARY.json", JSON.stringify(out, null, 2) + "\n");
console.log(`\nsuites=${out.suites} allPassed=${out.allPassed} failed=${JSON.stringify(out.failed)}`);
if (!out.allPassed) process.exit(1);
