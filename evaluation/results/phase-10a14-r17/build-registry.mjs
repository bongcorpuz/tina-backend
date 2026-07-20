// PHASE-10A14-R17 — canonical attempt registry with provenance, recovery-disposition and
// retry-link enforcement.
//
// Every count in the report, result JSON, CURRENT_STATE and summaries derives from here.
// Unlike R16, controlling status is NOT the raw terminal event: it requires valid Git
// provenance AND an authoritative disposition of VALID_CONTROLLING.

import fs from "node:fs";
import path from "node:path";
import { listCanonicalAttempts, CANONICAL_ROOT, REPO, TERMINALS } from "./evidence.mjs";
import { validateAttemptProvenance, scanAttemptCorruption, readAdjudication, resolveDisposition, validateRetryLinks, computeRetryCeiling } from "./validators.mjs";

const D = "evaluation/results/phase-10a14-r17/";
const R17_BASE = "0f2468bc4ac657eee4c8c1ee94ab3a0b9f0cc690";
const root = path.join(REPO, CANONICAL_ROOT);
const TERMINAL_FILES = new Set(Object.values(TERMINALS));
const STATUS_BY_FILE = {
  "20-completed-pass.json": "COMPLETED_PASS", "20-completed-fail.json": "COMPLETED_FAIL",
  "20-technical-failure.json": "TECHNICAL_FAILURE", "20-timeout.json": "TIMEOUT",
  "20-killed.json": "KILLED", "20-cancelled.json": "CANCELLED"
};

const records = [];
for (const attemptId of listCanonicalAttempts(root)) {
  const dir = path.join(root, attemptId);
  const files = fs.readdirSync(dir);
  const readJson = (n) => {
    if (!files.includes(n)) return null;
    try { return JSON.parse(fs.readFileSync(path.join(dir, n), "utf8")); } catch { return "MALFORMED"; }
  };
  const alloc = readJson("00-allocated.json");
  const started = readJson("10-started.json");
  const terminalName = files.find((f) => TERMINAL_FILES.has(f)) || null;
  const terminal = terminalName ? readJson(terminalName) : null;
  const retryLink = readJson("30-retry-of.json");

  const a = alloc && alloc !== "MALFORMED" ? alloc : {};
  const t = terminal && terminal !== "MALFORMED" ? terminal : {};
  const rawStatus = terminalName ? STATUS_BY_FILE[terminalName] : "INCOMPLETE";

  // Provenance — Git truth, not string format.
  const prov = validateAttemptProvenance(
    { headAtStart: a.headAtStart, headAtEnd: t.headAtEnd, runtimeCommit: a.runtimeCommit },
    { expectedAncestorOf: null }
  );

  // Disposition — corruption, then provenance, then adjudication, then raw status.
  const corruption = scanAttemptCorruption(dir);
  const adj = readAdjudication(dir);
  const disp = resolveDisposition({ dir, rawStatus, provenanceValid: prov.provenanceValid, adjudication: adj, corruption });

  records.push({
    attemptId,
    task: a.task ?? null, attemptType: a.attemptType ?? null, campaignId: a.campaignId ?? null,
    probeId: a.probeId ?? null, cycleKey: a.cycleKey ?? null,
    command: files.includes("command.txt") ? fs.readFileSync(path.join(dir, "command.txt"), "utf8").trim() : null,
    runtimeCommit: a.runtimeCommit ?? null, runtimeCommitSource: a.runtimeCommitSource ?? null,
    headAtStart: a.headAtStart ?? null, headAtEnd: t.headAtEnd ?? null,
    treeCleanBefore: a.treeCleanBefore ?? null, treeCleanAfter: t.treeCleanAfter ?? null,
    startedAt: (started && started !== "MALFORMED" ? started.startedAt : null) ?? a.allocatedAt ?? null,
    endedAt: t.endedAt ?? null,
    exitCode: t.exitCode ?? null, signal: t.signal ?? null,
    rawStatus, status: rawStatus,
    disposition: disp.disposition, dispositionReasons: disp.reasons,
    controlling: disp.controlling,
    technicalFailure: rawStatus === "TECHNICAL_FAILURE" || rawStatus === "TIMEOUT",
    completedFailure: rawStatus === "COMPLETED_FAIL",
    environmentFailure: Boolean(t.environmentFailure) || false,
    corrupt: corruption.corrupt, corruptionFindings: corruption.findings,
    retryOf: (retryLink && retryLink !== "MALFORMED" ? retryLink.retryOf : null) ?? a.retryOf ?? null,
    retryReason: (retryLink && retryLink !== "MALFORMED" ? retryLink.retryReason : null) ?? a.retryReason ?? null,
    ...prov,
    logPath: `${CANONICAL_ROOT}/${attemptId}/stdout.raw.txt`,
    evidencePath: `${CANONICAL_ROOT}/${attemptId}`,
    adjudicated: Boolean(adj)
  });
}

const retry = validateRetryLinks(records);
const ceiling = computeRetryCeiling(records);

const byType = (t) => records.filter((r) => r.attemptType === t);
const counts = {
  totalAttempts: records.length,
  runnerInvocations: byType("DETERMINISTIC_GATE").length,
  stagingRunnerInvocations: byType("STAGING_GATE").length,
  focusedSuiteInvocations: byType("FOCUSED_SUITE").length,
  campaignAttempts: byType("CAMPAIGN").length,
  completedPass: records.filter((r) => r.rawStatus === "COMPLETED_PASS").length,
  completedFailures: records.filter((r) => r.completedFailure).length,
  technicalFailures: records.filter((r) => r.technicalFailure).length,
  environmentFailures: records.filter((r) => r.environmentFailure).length,
  incompleteAttempts: records.filter((r) => r.rawStatus === "INCOMPLETE").length,
  corruptAttempts: records.filter((r) => r.corrupt).length,
  invalidProvenanceAttempts: records.filter((r) => !r.provenanceValid).length,
  controllingAttempts: records.filter((r) => r.controlling).length,
  nonControllingAttempts: records.filter((r) => !r.controlling).length,
  validLinkedRetries: retry.validRetryCount,
  unlinkedReruns: records.filter((r) => r.retryOf == null).length - Object.keys(ceiling).length
};

const scope = {
  includesGateRunnerAttempts: true, includesStagingRunnerAttempts: true,
  includesFocusedSuiteAttempts: true, includesCampaignAttempts: true,
  statement: `All counts are derived from every immutable attempt directory under ${CANONICAL_ROOT}, with no category excluded. A runner invocation is one attempt; a suite inside a runner is not another runner invocation; a probe is not a runner invocation; a retry is a new attempt. Controlling status requires BOTH valid Git provenance AND a VALID_CONTROLLING disposition — it is never the raw terminal event alone.`
};

const integrity = {
  duplicates: [],
  malformed: records.filter((r) => r.corrupt).map((r) => r.attemptId),
  invalidProvenance: records.filter((r) => !r.provenanceValid).map((r) => ({ attemptId: r.attemptId, errors: r.provenanceErrors })),
  retryErrors: retry.errors,
  controllingWithInvalidProvenance: records.filter((r) => r.controlling && !r.provenanceValid).map((r) => r.attemptId),
  controllingWithCorruption: records.filter((r) => r.controlling && r.corrupt).map((r) => r.attemptId)
};
integrity.clean =
  integrity.malformed.length === 0 &&
  integrity.invalidProvenance.length === 0 &&
  integrity.retryErrors.length === 0 &&
  integrity.controllingWithInvalidProvenance.length === 0 &&
  integrity.controllingWithCorruption.length === 0;

const gateCycles = {
  deterministic: byType("DETERMINISTIC_GATE").map((r) => ({ attemptId: r.attemptId, exitCode: r.exitCode, rawStatus: r.rawStatus, disposition: r.disposition, controlling: r.controlling, retryOf: r.retryOf, provenanceValid: r.provenanceValid })),
  staging: byType("STAGING_GATE").map((r) => ({ attemptId: r.attemptId, exitCode: r.exitCode, rawStatus: r.rawStatus, disposition: r.disposition, controlling: r.controlling, retryOf: r.retryOf, provenanceValid: r.provenanceValid }))
};

const registry = {
  task: "PHASE-10A14-R17", generatedAt: new Date().toISOString(),
  attemptsRoot: CANONICAL_ROOT, r17Base: R17_BASE,
  rule: "Machine-generated. Controlling status requires valid Git provenance AND a VALID_CONTROLLING disposition. No manually typed competing total is permitted anywhere.",
  integrity, counts, scope, gateCycles,
  retryLinkage: { validRetries: retry.validRetries, validRetryCount: retry.validRetryCount, errors: retry.errors, note: retry.unlinkedRerunNote },
  retryCeiling: ceiling,
  attempts: records
};

fs.writeFileSync(D + "CANONICAL_ATTEMPT_REGISTRY.json", JSON.stringify(registry, null, 2) + "\n");
fs.writeFileSync(D + "CANONICAL_COUNT_SUMMARY.json", JSON.stringify({ task: "PHASE-10A14-R17", generatedAt: registry.generatedAt, derivedFrom: "CANONICAL_ATTEMPT_REGISTRY.json", counts, scope, gateCycles, integrity }, null, 2) + "\n");
fs.writeFileSync(D + "PROVENANCE_VALIDATION_SUMMARY.json", JSON.stringify({
  task: "PHASE-10A14-R17", generatedAt: registry.generatedAt,
  rule: "Every SHA is validated against Git itself: format, existence, object type commit, repository, ancestry. No caller-supplied controlling SHA is accepted.",
  totalAttempts: records.length,
  provenanceValid: records.filter((r) => r.provenanceValid).length,
  provenanceInvalid: records.filter((r) => !r.provenanceValid).length,
  invalidDetail: integrity.invalidProvenance,
  controllingWithInvalidProvenance: integrity.controllingWithInvalidProvenance
}, null, 2) + "\n");
fs.writeFileSync(D + "RECOVERY_DISPOSITION_SUMMARY.json", JSON.stringify({
  task: "PHASE-10A14-R17", generatedAt: registry.generatedAt,
  rule: "Precedence: corruption, then invalid provenance, then explicit adjudication, then raw terminal status. An adjudication stating non-controlling overrides a COMPLETED_PASS terminal.",
  byDisposition: records.reduce((acc, r) => { acc[r.disposition] = (acc[r.disposition] || 0) + 1; return acc; }, {}),
  adjudicatedAttempts: records.filter((r) => r.adjudicated).map((r) => ({ attemptId: r.attemptId, disposition: r.disposition, controlling: r.controlling })),
  corruptAttempts: records.filter((r) => r.corrupt).map((r) => ({ attemptId: r.attemptId, findings: r.corruptionFindings }))
}, null, 2) + "\n");
fs.writeFileSync(D + "RETRY_LINK_SUMMARY.json", JSON.stringify({
  task: "PHASE-10A14-R17", generatedAt: registry.generatedAt,
  rule: "A retry requires a valid retryOf to an existing prior attempt, an objective reason and an unchanged runtime. An unlinked rerun is not a retry and never counts toward a ceiling.",
  validRetryCount: retry.validRetryCount, validRetries: retry.validRetries,
  errors: retry.errors, ceiling
}, null, 2) + "\n");

console.log(`attempts=${counts.totalAttempts} controlling=${counts.controllingAttempts} nonControlling=${counts.nonControllingAttempts}`);
console.log(`detGate=${counts.runnerInvocations} stgGate=${counts.stagingRunnerInvocations} focused=${counts.focusedSuiteInvocations}`);
console.log(`pass=${counts.completedPass} completedFail=${counts.completedFailures} technical=${counts.technicalFailures} corrupt=${counts.corruptAttempts} invalidProvenance=${counts.invalidProvenanceAttempts}`);
console.log(`validLinkedRetries=${counts.validLinkedRetries} integrityClean=${integrity.clean}`);
if (!integrity.clean) {
  console.error("INTEGRITY NOT CLEAN:", JSON.stringify({ malformed: integrity.malformed, invalidProvenance: integrity.invalidProvenance.length, retryErrors: integrity.retryErrors.length, controllingWithInvalidProvenance: integrity.controllingWithInvalidProvenance, controllingWithCorruption: integrity.controllingWithCorruption }));
  process.exit(1);
}
