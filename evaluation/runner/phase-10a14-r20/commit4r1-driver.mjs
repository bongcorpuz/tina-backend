// PHASE-10A14-R20 COMMIT 4R1 — Stage 1-2: V1 lock + inherited adjudication + R1 draft.
// Builds R1 rows from V1 (inherited reason re-adjudicated from query+decision only;
// new rows byte-identical). NO analyzer/classifier import or execution.
// Writes the adjudication package and an R1 DRAFT; finalize/freeze is a later step
// after the independent oracle-map review.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { adjudicateReason, validateCompatibility } from './commit4r1-adjudicator.mjs';
import { REPO, gitObject, sha256File, captureRuntimeIdentity, captureHarnessIdentity } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const REV = `${REPO}/evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1`;
const V1_PATH = `${REPO}/evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_FROZEN.json`;
const V1_SHA = '0227a5b4b6c2eb552427e002b6a66d50b39a06635c84f74798de81ffa608b263';
const writeR = (n, o) => writeFileSync(join(R20, n), JSON.stringify(o, null, 2) + '\n');
const writeV = (n, o) => writeFileSync(join(REV, n), JSON.stringify(o, null, 2) + '\n');

async function main() {
  mkdirSync(REV, { recursive: true });
  const v1 = JSON.parse(readFileSync(V1_PATH, 'utf8'));
  const v1Sha = sha256File(V1_PATH);
  const inherited = v1.rows.filter((r) => r.sourceSet !== 'r20_new');
  const newRows = v1.rows.filter((r) => r.sourceSet === 'r20_new');

  writeR('COMMIT_4R1_PREFLIGHT.json', {
    phase: 'PHASE-10A14-R20', unit: 'COMMIT 4R1', startingHead: gitObject('HEAD'), parent: gitObject('HEAD~1'),
    v1Sha256: v1Sha, v1ShaMatches: v1Sha === V1_SHA, v1RowCount: v1.rows.length,
    inheritedRows: inherited.length, newRows: newRows.length,
    analyzerBlob: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
    runtime: captureRuntimeIdentity(), harness: captureHarnessIdentity(), capturedAt: new Date().toISOString(),
  });

  // Attempt N — V1 source lock.
  const nChecks = [
    ['v1_sha', v1Sha === V1_SHA], ['v1_rowcount_3720', v1.rows.length === 3720],
    ['inherited_1897', inherited.length === 1897], ['new_1823', newRows.length === 1823],
    ['runtime_unchanged', gitObject('HEAD:services/philippine-tax-intent-analyzer.js') === 'a23364bc6a31196d2fb5d9f1299ab069d84b5ca1'],
  ].map(([name, pass]) => ({ name, pass }));
  const nRes = { validator: 'r20-commit4r1-v1-source-lock', total: nChecks.length, passed: nChecks.filter((c) => c.pass).length, checks: nChecks, allPassed: nChecks.every((c) => c.pass) };
  const attemptN = await runGovernedAttempt(
    { category: 'synthetic_validator', gate: 'r20_commit4r1_v1_source_lock', cycle: 'commit4r1', ordinal: 1, controlling: true, disposition: 'controlling_v1_lock' },
    async () => ({ status: nRes.allPassed ? 'completed' : 'technical_failure', disposition: nRes.allPassed ? 'controlling_v1_lock' : 'technical_failure', exitCode: nRes.allPassed ? 0 : 1, stdout: JSON.stringify(nRes, null, 2), stderr: '', resultFiles: { 'V1_SOURCE_LOCK_RESULT.json': JSON.stringify(nRes, null, 2) + '\n' }, command: 'node', commandArgs: ['commit4r1-driver.mjs', '--v1-lock'] }));
  writeR('COMMIT_4R1_V1_SOURCE_LOCK.json', nRes);
  writeV('R20_REASON_FAMILY_R1_SOURCE_LOCK.json', { v1Sha256: v1Sha, expected: V1_SHA, matches: v1Sha === V1_SHA, rowCount: v1.rows.length, inherited: inherited.length, new: newRows.length });

  // Attempt O — adjudicate all 1,897 inherited rows.
  const adjudications = [], register = [], r1Rows = [];
  let changed = 0, unchanged = 0, incompat = 0;
  const distV1 = {}, distR1 = {};
  for (const r of v1.rows) {
    if (r.sourceSet === 'r20_new') { r1Rows.push(r); continue; }
    const { reason, ruleId, rationale } = adjudicateReason(r);
    const compatible = validateCompatibility(r.expectedDecision, reason);
    if (!compatible) incompat++;
    if (reason !== r.expectedReasonCodeFamily) changed++; else unchanged++;
    distV1[r.expectedReasonCodeFamily] = (distV1[r.expectedReasonCodeFamily] || 0) + 1;
    distR1[reason] = (distR1[reason] || 0) + 1;
    adjudications.push({ oracleId: r.oracleId, sourceSet: r.sourceSet, query: r.query, expectedDecision: r.expectedDecision, v1Reason: r.expectedReasonCodeFamily, r1Reason: reason, ruleId, rationale, compatible, changed: reason !== r.expectedReasonCodeFamily });
    register.push({ oracleId: r.oracleId, sourceSet: r.sourceSet, sourceFixtureId: r.sourceFixtureId, query: r.query, expectedDecision: r.expectedDecision, expectedRelations: r.expectedRelations, v1ExpectedReasonCodeFamily: r.expectedReasonCodeFamily, proposedReason: reason, ruleId });
    r1Rows.push({ ...r, expectedReasonCodeFamily: reason, reasonAdjudication: { v1ExpectedReasonCodeFamily: r.expectedReasonCodeFamily, r1ExpectedReasonCodeFamily: reason, ruleId, rationale, authority: 'frozen_relation_and_precedence_contract', primaryReviewer: 'Opus 4.8', independentReviewStatus: 'pending' } });
  }

  const attemptO = await runGovernedAttempt(
    { category: 'other', gate: 'r20_commit4r1_inherited_reason_adjudication', cycle: 'commit4r1', ordinal: 1, controlling: true, disposition: 'controlling_adjudication' },
    async () => ({ status: 'completed', disposition: 'controlling_adjudication', exitCode: 0, stdout: JSON.stringify({ inherited: register.length, changed, unchanged, incompat, distR1 }, null, 2), stderr: '', resultFiles: { 'ADJUDICATION_RESULT.json': JSON.stringify({ inherited: register.length, changed, unchanged, incompatibilities: incompat, distV1, distR1 }, null, 2) + '\n' }, command: 'node', commandArgs: ['commit4r1-adjudicator.mjs'] }));

  writeV('R20_REASON_FAMILY_R1_ADJUDICATION_RULES.json', { authority: 'frozen_relation_and_precedence_contract', rules: 'RF-01..RF-11 per COMMIT 4R1 prompt' });
  writeV('R20_REASON_FAMILY_R1_INHERITED_ROW_REGISTER.json', { count: register.length, rows: register });
  writeV('R20_REASON_FAMILY_R1_PRIMARY_ADJUDICATION.json', { count: adjudications.length, incompatibilities: incompat, changedFromV1: changed, unchangedFromV1: unchanged, distV1, distR1, adjudications });
  // R1 DRAFT (pre-independent-review); finalized after review sets independentReviewStatus.
  writeV('_R1_DRAFT.json', { version: 'reason-family-r1-draft', rowCount: r1Rows.length, rows: r1Rows });

  return { attemptN: attemptN.attemptId, attemptO: attemptO.attemptId, inherited: register.length, changed, unchanged, incompat, distV1, distR1 };
}

main().then((r) => { console.log(JSON.stringify(r, null, 2)); }).catch((e) => { console.error(e); process.exit(1); });
