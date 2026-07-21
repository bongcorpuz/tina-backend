import fs from 'fs';
import path from 'path';
import { spawnSync, execFileSync } from 'child_process';
const outDir = 'evaluation/results/phase-10a14-r18-independent-review-1';
const logDir = path.join(outDir, 'gate-and-focused-logs');
fs.mkdirSync(logDir, { recursive: true });
const suites = [
 ['r18-identity-retry','tests/phase-10a14-r18-runtime-identity-and-retry.test.mjs'],
 ['r18-domain-hardening','tests/phase-10a14-r18-domain-hardening.test.mjs'],
 ['r18-all26-write-isolation','tests/phase-10a14-r18-all26-write-isolation.test.mjs'],
 ['r18-09zf-scope-guard','tests/phase-10a14-r18-09zf-scope-guard.test.mjs'],
 ['phase-09zf','tests/phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs'],
 ['r17-validators','tests/phase-10a14-r17-provenance-recovery-retry.test.mjs'],
 ['r17-domain','tests/phase-10a14-r17-customs-capital-gain-domain.test.mjs'],
 ['phase-10a8','tests/phase-10a8-trust-calibration-and-answer-correctness-remediation-1.test.mjs'],
 ['patch-07b','tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs'],
 ['phase-09r-staging','tests/phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs'],
 ['r16-domain','tests/phase-10a14-r16-non-tax-domain-boundary.test.mjs'],
 ['r16-tooling','tests/phase-10a14-r16-evidence-tooling.test.mjs'],
 ['r15-journal-crash','tests/phase-10a14-r15-crash-visible-attempt-journal.test.mjs'],
 ['r15-focused','tests/phase-10a14-r15-semantic-composition-tax-adjacency-and-persistence-receipt.test.mjs'],
 ['r14-focused','tests/phase-10a14-r14-negated-nonperformance-and-universal-persistence-status.test.mjs'],
 ['r13-focused','tests/phase-10a14-r13-polarity-aware-directive-and-persistence-receipt.test.mjs'],
 ['r12-focused','tests/phase-10a14-r12-semantic-filing-directive-and-not-applicable-persistence.test.mjs'],
 ['r11-focused','tests/phase-10a14-r11-calendar-directive-completeness-and-contextual-safe-answer.test.mjs'],
 ['r10-focused','tests/phase-10a14-r10-calendar-relative-public-answer-replacement.test.mjs'],
 ['r9-focused','tests/phase-10a14-r9-calendar-relative-deadline-and-filing-rationale-alignment.test.mjs']
];
const results = [];
for (const [id, script] of suites) {
  const r = spawnSync('node', [script], { encoding:'utf8', maxBuffer: 128*1024*1024 });
  fs.writeFileSync(path.join(logDir, `25_${id}.stdout.txt`), r.stdout || '');
  fs.writeFileSync(path.join(logDir, `25_${id}.stderr.txt`), r.stderr || '');
  const line = (r.stdout || '').split(/\r?\n/).filter(l => /tests: /.test(l)).pop() || '';
  results.push({ id, script, exitCode: r.status, signal: r.signal ?? null, summaryLine: line.trim(), passed: r.status === 0 });
  console.log(`exit=${r.status} ${id}`);
}
const dest = path.join(outDir, '25_all26_isolated_from_focused.json');
const a = spawnSync('node', ['evaluation/results/phase-10a14-r18/all26-isolated.mjs', dest], { encoding:'utf8', maxBuffer: 32*1024*1024 });
fs.writeFileSync(path.join(logDir, '25_all26-isolated.stdout.txt'), a.stdout || '');
fs.writeFileSync(path.join(logDir, '25_all26-isolated.stderr.txt'), a.stderr || '');
results.push({ id:'r18-all26-isolated-replay', script:'evaluation/results/phase-10a14-r18/all26-isolated.mjs', exitCode:a.status, signal:a.signal ?? null, summaryLine:(a.stdout||'').trim().split(/\r?\n/)[0] || '', passed:a.status === 0 });
const out = { generatedAt: new Date().toISOString(), head: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), suites: results.length, allPassed: results.every(r=>r.passed), failed: results.filter(r=>!r.passed).map(r=>r.id), results };
fs.writeFileSync(path.join(outDir, '25_independent_focused_suite_logs.json'), JSON.stringify(out,null,2)+'\n');
console.log(`suites=${out.suites} allPassed=${out.allPassed} failed=${JSON.stringify(out.failed)}`);
if (!out.allPassed) process.exit(1);
