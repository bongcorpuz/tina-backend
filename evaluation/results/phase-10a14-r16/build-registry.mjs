// PHASE-10A14-R16 — canonical attempt registry and count summary.
//
// Remediates P1-R15-IR-005, where an R15 narrative reported five deterministic gate
// attempts while the formal result JSON reported four. Here EVERY count is derived from
// the immutable attempt directories. No count is ever typed by hand.
//
// Usage: node evaluation/results/phase-10a14-r16/build-registry.mjs [attemptsRoot]

import fs from "node:fs";
import path from "node:path";
import { listCanonicalAttempts, readCanonicalAttempt, CANONICAL_ROOT, REPO } from "./evidence.mjs";

const root = process.argv[2] || path.join(REPO, CANONICAL_ROOT);
const D = "evaluation/results/phase-10a14-r16/";

const ids = listCanonicalAttempts(root);
const records = ids.map((id) => readCanonicalAttempt(id, root));

// ── Integrity checks ─────────────────────────────────────────────────────────
const seen = new Set();
const duplicates = [];
for (const r of records) { if (seen.has(r.attemptId)) duplicates.push(r.attemptId); seen.add(r.attemptId); }

// A retry must reference an attempt that actually exists.
const missingRetryTargets = records
  .filter((r) => r.retryOf && !seen.has(r.retryOf))
  .map((r) => ({ attemptId: r.attemptId, missingRetryOf: r.retryOf }));

const malformed = records.filter((r) => r.malformed).map((r) => r.attemptId);

// ── Counts, strictly by the frozen WS9 definitions ───────────────────────────
const byType = (t) => records.filter((r) => r.attemptType === t);
const counts = {
  totalAttempts: records.length,
  runnerInvocations: byType("DETERMINISTIC_GATE").length,
  stagingRunnerInvocations: byType("STAGING_GATE").length,
  focusedSuiteInvocations: byType("FOCUSED_SUITE").length,
  campaignAttempts: byType("CAMPAIGN").length,
  otherAttempts: records.filter((r) => !["DETERMINISTIC_GATE", "STAGING_GATE", "FOCUSED_SUITE", "CAMPAIGN"].includes(r.attemptType)).length,
  completedPass: records.filter((r) => r.status === "COMPLETED_PASS").length,
  completedFailures: records.filter((r) => r.status === "COMPLETED_FAIL").length,
  technicalFailures: records.filter((r) => r.technicalFailure).length,
  environmentFailures: records.filter((r) => r.environmentFailure).length,
  killedAttempts: records.filter((r) => r.status === "KILLED").length,
  incompleteAttempts: records.filter((r) => r.status === "INCOMPLETE").length,
  cancelledAttempts: records.filter((r) => r.status === "CANCELLED").length,
  retries: records.filter((r) => r.retryOf).length,
  controllingAttempts: records.filter((r) => r.controlling).length
};

// Scope statement is mandatory: R15 reported technicalFailures: 0 without saying whether
// gate-runner attempts were included, which is exactly what made its accounting unclear.
const scope = {
  includesGateRunnerAttempts: true,
  includesStagingRunnerAttempts: true,
  includesFocusedSuiteAttempts: true,
  includesCampaignAttempts: true,
  statement: "All counts above are derived from every immutable attempt directory under " +
    CANONICAL_ROOT + ", with no category excluded. A runner invocation is one attempt; a suite " +
    "inside a runner is not another runner invocation; a probe is not a runner invocation; a retry is a new attempt."
};

const gateCycles = {
  deterministic: byType("DETERMINISTIC_GATE").map((r) => ({ attemptId: r.attemptId, exitCode: r.exitCode, status: r.status, controlling: r.controlling, retryOf: r.retryOf })),
  staging: byType("STAGING_GATE").map((r) => ({ attemptId: r.attemptId, exitCode: r.exitCode, status: r.status, controlling: r.controlling, serverReportedRuntimeCommit: r.serverReportedRuntimeCommit, retryOf: r.retryOf }))
};

const registry = {
  task: "PHASE-10A14-R16",
  generatedAt: new Date().toISOString(),
  attemptsRoot: CANONICAL_ROOT,
  rule: "Machine-generated from immutable attempt directories. Every count in the report, result JSON, CURRENT_STATE, gate summary and attempt reconciliation derives from this file. No manually typed competing total is permitted.",
  integrity: {
    duplicates, missingRetryTargets, malformed,
    duplicateCount: duplicates.length,
    missingRetryTargetCount: missingRetryTargets.length,
    malformedCount: malformed.length,
    clean: duplicates.length === 0 && missingRetryTargets.length === 0 && malformed.length === 0
  },
  counts, scope, gateCycles,
  attempts: records
};

fs.writeFileSync(D + "CANONICAL_ATTEMPT_REGISTRY.json", JSON.stringify(registry, null, 2) + "\n");
fs.writeFileSync(D + "CANONICAL_COUNT_SUMMARY.json", JSON.stringify({
  task: "PHASE-10A14-R16", generatedAt: registry.generatedAt,
  derivedFrom: "CANONICAL_ATTEMPT_REGISTRY.json", counts, scope, gateCycles,
  integrity: registry.integrity
}, null, 2) + "\n");

console.log(`attempts=${counts.totalAttempts} deterministicGate=${counts.runnerInvocations} stagingGate=${counts.stagingRunnerInvocations} focused=${counts.focusedSuiteInvocations} campaign=${counts.campaignAttempts}`);
console.log(`pass=${counts.completedPass} completedFail=${counts.completedFailures} technical=${counts.technicalFailures} killed=${counts.killedAttempts} incomplete=${counts.incompleteAttempts} retries=${counts.retries}`);
console.log(`integrity clean=${registry.integrity.clean} duplicates=${duplicates.length} missingRetryTargets=${missingRetryTargets.length} malformed=${malformed.length}`);
if (!registry.integrity.clean) process.exit(1);
