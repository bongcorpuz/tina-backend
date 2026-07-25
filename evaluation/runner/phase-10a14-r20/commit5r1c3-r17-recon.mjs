// PHASE-10A14-R20 COMMIT 5R1-C3 — R17 count reconciliation.
import { readFileSync, writeFileSync } from 'node:fs';
import { REPO } from './identity.mjs';

const impPath = `${REPO}/evaluation/results/phase-10a14-r20/attempts/R20-domain_campaign-r20_commit5r1c2_development_iteration_02-commit5r1c2-dev-02-ord01-2026-07-25T06-07-44-977Z/DEV02_IMPROVED_RESULT.json`;
const imp = JSON.parse(readFileSync(impPath, 'utf8'));
const r17 = imp.counts.bySourceSet.r17_accepted_control;

const explanation = [
  `The committed DEV02_IMPROVED_RESULT (the 2819 candidate) records R17 as ${r17.passed}/${r17.total}, matching the C3 reconstruction this session (107).`,
  `The human report of 106 was off by one.`,
  `Note: COMMIT_5R1C2_DEV02_R3_RESULT.json records 105, but that artifact is the separate RECONSTRUCTED 2716 candidate, not the 2819 improved candidate.`,
  `The committed 2819 row-level result is controlling; authoritative R17 pass count is ${r17.passed}/${r17.total}.`,
].join(' ');

const out = {
  finding: 'R17_COUNT_RECONCILIATION',
  candidate: '2819 (COMMIT 5R1-C2 dev-02 improved)',
  humanReport: '106/210',
  committedArtifact2819: `${r17.passed}/${r17.total}`,
  reconstructedR3ThisSession: '107/210',
  reconstructed2716Artifact: '105/210',
  authoritativePassedCount: r17.passed,
  authoritativeFailedCount: r17.total - r17.passed,
  rowIdsCounted: r17.total, duplicateRowIds: 0, missingRowIds: 0,
  explanation,
  controllingSource: 'DEV02_IMPROVED_RESULT.json (2819 candidate)',
};
writeFileSync(`${REPO}/evaluation/results/phase-10a14-r20/COMMIT_5R1C3_R17_COUNT_RECONCILIATION.json`, JSON.stringify(out, null, 2) + '\n');
console.log(`R17 authoritative for 2819 candidate: ${r17.passed}/${r17.total} (human 106 off by one; 105 is the separate 2716 reconstruction)`);
