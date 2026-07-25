// PHASE-10A14-R20 COMMIT 5R1-C4 — reconcile the 850-row failure partition against the
// actual reconstructed-2870 governed R3 failures. Partition is non-overlapping and
// primary-cause ordered: decision > relation > reason.
import { readFileSync, writeFileSync } from 'node:fs';
import { REPO } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const fails = JSON.parse(readFileSync(`${R20}/COMMIT_5R1C4_RECONSTRUCTED_2870_FAILURES.json`, 'utf8'));

const byCluster = { DECISION_PRECEDENCE: 0, RELATION_MISSING: 0, REASON_SPECIFICITY: 0 };
const seen = new Set(); let dup = 0;
const rows = fails.map((f) => {
  let cluster;
  if (!f.decisionPass) cluster = 'DECISION_PRECEDENCE';
  else if (!f.relationPass) cluster = 'RELATION_MISSING';
  else cluster = 'REASON_SPECIFICITY';
  byCluster[cluster]++;
  if (seen.has(f.oracleId)) dup++; else seen.add(f.oracleId);
  return { oracleId: f.oracleId, sourceSet: f.sourceSet, primaryCluster: cluster };
});

const c3 = JSON.parse(readFileSync(`${R20}/COMMIT_5R1C3_FAILURE_PARTITION.json`, 'utf8'));
const out = {
  reconstructedAttempt: 'commit5r1c4-dev-01',
  failedRows: fails.length,
  partitionedRows: rows.length,
  missingRows: 0,
  duplicatePrimaryAssignments: dup,
  byCluster,
  matchesC3Partition: byCluster.DECISION_PRECEDENCE === c3.byCluster.DECISION_PRECEDENCE && byCluster.RELATION_MISSING === c3.byCluster.RELATION_MISSING && byCluster.REASON_SPECIFICITY === c3.byCluster.REASON_SPECIFICITY,
  c3Partition: c3.byCluster,
  rows,
};
writeFileSync(`${R20}/COMMIT_5R1C4_FAILURE_PARTITION_RECONCILIATION.json`, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ failed: fails.length, byCluster, dup, matchesC3: out.matchesC3Partition }, null, 2));
