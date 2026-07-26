// PHASE-10A14-R20 COMMIT 5R1-C12 — clean decision-lock verification.
// No runtime or test change. Separate governed R3 + full counterfactual + all gates.
import fs from 'node:fs';
import * as L from './commit5r1c12-lib.mjs';
import { loadR3Rows, loadRuntime, scoreRows } from './commit5r1c2-oracle-runner.mjs';

const identityBefore = L.runtimeIdentity();
const att = await L.allocateAttempt({
  category: 'domain_campaign',
  gate: 'r20_commit5r1c12_decision_layer_lock_verification',
  cycle: 'commit5r1c12-lock',
  command: 'commit5r1c12-verify.mjs',
});

const rows = loadR3Rows();
const rt = await loadRuntime('standalone');
const { counts, failures } = scoreRows(rows, rt.classify);
const ctl = L.closedControls(rows, rt.classify);
const guard = L.richContextGuard(rt.classify);
const cf = L.runCounterfactuals(rt.classify);
const am = L.antiMemorization('services/philippine-tax-intent-analyzer.js', rows);
const decisionPassed = 3720 - counts.decisionMismatches;

// focused decision regression
const buckets = {
  all_three_decisions: rows,
  closed_decision_controls: rows.filter((r) => L.CONTROLS.includes(r.primaryCategory)),
  target_completeness: rows.filter((r) => /\b(context|situation|item|matter|reference|group|batch)\s+\w{0,3}-?\d+/i.test(r.query)),
  contextual_acronyms: rows.filter((r) => /\b[A-Z]{2,6}\b/.test(r.query)),
  label_binding: rows.filter((r) => /\b(name|label|tag|code|filename|column|folder|display|title)\b/i.test(r.query)),
  quoted_term_scope: rows.filter((r) => /["“”']/.test(r.query) || /\b(spell|reverse|count the|format the|repeat the|alphabeti)/i.test(r.query)),
  non_tax_actions: rows.filter((r) => /non_tax/.test(r.primaryCategory || '')),
  concrete_tax_relations: rows.filter((r) => /\b(deductib|vat|withhold|taxab|customs|capital gains)\w*/i.test(r.query)),
  resolved_referents: rows.filter((r) => /\b(bought|purchased|paid|received|leased|imported)\b/i.test(r.query)),
  compliance_vs_treatment: rows.filter((r) => /\b(file|filing|form|deadline|return|remit|registration)\b/i.test(r.query)),
  ordinary_homographs: rows.filter((r) => /\b(library|student|css|font|function|console|goods|insurance|court|labor)\b/i.test(r.query)),
  multi_clause: rows.filter((r) => /[;]|\band\b|\bif\b/i.test(r.query)),
  filipino_taglish: rows.filter((r) => /\b(ano|paano|kailan|ba|ng|mga|buwis|lang)\b/i.test(r.query)),
  numeric_scenario_invariance: rows.filter((r) => /\b\d+\b/.test(r.query)),
};
const focused = {};
for (const [name, set] of Object.entries(buckets)) {
  let pass = 0;
  for (const r of set) if (rt.classify(r.query).decision === r.expectedDecision) pass++;
  focused[name] = { total: set.length, passed: pass, failed: set.length - pass };
}
const focusedAllPass = Object.values(focused).every((b) => b.failed === 0);

// determinism
const sample = [];
const step = Math.floor(rows.length / 150);
for (let i = 0; i < rows.length && sample.length < 150; i += step) sample.push(rows[i]);
let drift = 0, byteDrift = 0;
for (const r of sample) {
  const first = rt.classify(r.query);
  const firstJson = JSON.stringify(first);
  for (let k = 0; k < 100; k++) {
    const again = rt.classify(r.query);
    if (again.decision !== first.decision) drift++;
    if (JSON.stringify(again) !== firstJson) byteDrift++;
  }
}
const determinismPass = drift === 0 && byteDrift === 0;

const identityAfter = L.runtimeIdentity();
const identityStable = identityBefore.servicesTreeDigest === identityAfter.servicesTreeDigest;

const lockConditions = {
  r3DecisionEquals3720: decisionPassed === 3720,
  falseAllowsZero: counts.materialFalseAllows === 0,
  falseRefusalsZero: counts.materialFalseRefusals === 0,
  clarifyMismatchesZero: counts.clarifyMismatches === 0,
  counterfactualSuiteFullyPasses: cf.failed === 0,
  closedControlsAllClosed: ctl.allClosed,
  richContextGuardPass: guard.allPass,
  focusedRegressionPass: focusedAllPass,
  antiOverfitAndAntiMemorizationPass: am.pass,
  determinismPass,
  runtimeIdentityUnchanged: identityStable,
};
const lockAchieved = Object.values(lockConditions).every(Boolean);

L.writeJson(att.dir + 'FULL_R3_RESULT.json', { attemptId: att.attemptId, oracleVersion: 'R3', counts, decisionPassed });
L.writeJson(att.dir + 'DECISION_LANE.json', { attemptId: att.attemptId, decisionPassed, decisionMismatches: counts.decisionMismatches, materialFalseAllows: counts.materialFalseAllows, materialFalseRefusals: counts.materialFalseRefusals, clarifyMismatches: counts.clarifyMismatches });
L.writeJson(att.dir + 'CLOSED_CONTROLS.json', ctl);
L.writeJson(att.dir + 'RICH_CONTEXT_GUARD.json', guard);
L.writeJson(att.dir + 'COUNTERFACTUAL_RESULT.json', cf);
L.writeJson(att.dir + 'ANTI_MEMORIZATION.json', am);
L.writeJson(att.dir + 'FOCUSED_REGRESSION.json', { buckets: focused, allBucketsPass: focusedAllPass });
L.writeJson(att.dir + 'DETERMINISM.json', { queries: sample.length, repetitionsPerQuery: 100, totalEvaluations: sample.length * 100, decisionDrift: drift, byteDrift, result: determinismPass ? 'PASS' : 'FAIL' });
L.writeJson(att.dir + 'DECISION_FAILURES.json', failures.filter((f) => !f.decisionPass));
L.snapshotRuntime(att.dir + 'runtime-snapshot');

const stdout = [
  'clean decision-lock verification',
  `R3 decision=${decisionPassed}/3720 fa=${counts.materialFalseAllows} fr=${counts.materialFalseRefusals} clarify=${counts.clarifyMismatches}`,
  `counterfactual=${cf.passed}/${cf.total} failed=${cf.failed}`,
  `closedControls=${ctl.allClosed ? 'ALL CLOSED' : 'REGRESSED'} richContextGuard=${guard.passed}/${guard.total}`,
  `focusedRegression=${focusedAllPass ? 'PASS' : 'FAIL'} antiMemorization=${am.pass ? 'PASS' : 'FAIL'} determinism=${determinismPass ? 'PASS' : 'FAIL'}`,
  `runtimeIdentityUnchanged=${identityStable}`,
  `LOCK_CONDITIONS=${JSON.stringify(lockConditions)}`,
  `LOCK_ACHIEVED=${lockAchieved}`,
].join('\n');
console.log(stdout);

L.writeJson(L.RES + 'COMMIT_5R1C12_LOCK_VERIFICATION_RESULT.json', {
  unit: 'COMMIT 5R1-C12', verificationAttemptId: att.attemptId,
  noRuntimeOrTestChangeDuringVerification: true,
  runtimeIdentityBefore: identityBefore, runtimeIdentityAfter: identityAfter, identityStable,
  decisionPassed, decisionMismatches: counts.decisionMismatches,
  falseAllows: counts.materialFalseAllows, falseRefusals: counts.materialFalseRefusals,
  clarifyMismatches: counts.clarifyMismatches,
  closedControls: ctl, richContextGuard: guard,
  counterfactual: { total: cf.total, passed: cf.passed, failed: cf.failed, bySuite: cf.bySuite },
  focusedRegression: { allBucketsPass: focusedAllPass },
  antiMemorization: am,
  determinism: { decisionDrift: drift, byteDrift, pass: determinismPass },
  lockConditions, lockAchieved,
});

await L.finalizeAttempt(att.dir, {
  disposition: lockAchieved ? 'controlling_lock_verification_pass' : 'controlling_lock_verification_failed',
  stdout: stdout + '\n',
  resultPaths: [att.dir + 'FULL_R3_RESULT.json', att.dir + 'COUNTERFACTUAL_RESULT.json', att.dir + 'CLOSED_CONTROLS.json', att.dir + 'RICH_CONTEXT_GUARD.json', att.dir + 'ANTI_MEMORIZATION.json', att.dir + 'FOCUSED_REGRESSION.json', att.dir + 'DETERMINISM.json'],
});
console.log('ATTEMPT_ID=' + att.attemptId);
