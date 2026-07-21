import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync, execFileSync } from 'child_process';

const outDir = 'evaluation/results/phase-10a14-r18-independent-review-1';
const logDir = path.join(outDir, 'gate-and-focused-logs');
fs.mkdirSync(logDir, { recursive: true });
function git(args){ return execFileSync('git', args, { encoding:'utf8' }).trim(); }
function shaFile(p){ return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function treeDigest(manifestPath){
  const m = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const records = [...m.files].sort().map(p => `${p}\n${shaFile(p)}\n`).join('');
  return crypto.createHash('sha256').update(records).digest('hex');
}
function status(){ return git(['status','--porcelain=v1','-b']); }
function runOne(id, cmd, args, timeoutMs=0){
  const before = { head: git(['rev-parse','HEAD']), status: status(), runtimeDigest: treeDigest('evaluation/results/phase-10a14-r18/RUNTIME_SCOPE_MANIFEST.json'), harnessDigest: treeDigest('evaluation/results/phase-10a14-r18/HARNESS_SCOPE_MANIFEST.json'), packageLockDigest: shaFile('package-lock.json'), startedAt: new Date().toISOString() };
  const r = spawnSync(cmd, args, { encoding:'utf8', maxBuffer: 128*1024*1024, timeout: timeoutMs || undefined });
  const after = { head: git(['rev-parse','HEAD']), status: status(), runtimeDigest: treeDigest('evaluation/results/phase-10a14-r18/RUNTIME_SCOPE_MANIFEST.json'), harnessDigest: treeDigest('evaluation/results/phase-10a14-r18/HARNESS_SCOPE_MANIFEST.json'), packageLockDigest: shaFile('package-lock.json'), endedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(logDir, `${id}.stdout.txt`), r.stdout || '');
  fs.writeFileSync(path.join(logDir, `${id}.stderr.txt`), r.stderr || '');
  const combined = `${r.stdout||''}\n${r.stderr||''}`;
  const syntax = combined.match(/Syntax checks:\s+(\d+) run,\s+(\d+) failed/);
  const tests = combined.match(/Test suites:\s+(\d+) run,\s+(\d+) failed/);
  const staging = combined.match(/Staging-smoke suites:\s+(\d+) run,\s+(\d+) failed/);
  return { id, command: [cmd, ...args].join(' '), exitCode: r.status, signal: r.signal ?? null, error: r.error ? String(r.error) : null, before, after, parsed: { syntax: syntax ? { run:+syntax[1], failed:+syntax[2] } : null, tests: tests ? { run:+tests[1], failed:+tests[2] } : null, staging: staging ? { run:+staging[1], failed:+staging[2] } : null }, stdoutPath: path.join(logDir, `${id}.stdout.txt`).replace(/\\/g,'/'), stderrPath: path.join(logDir, `${id}.stderr.txt`).replace(/\\/g,'/') };
}
const results = [];
for (let i=1;i<=2;i++) {
  console.log(`running deterministic ${i}`);
  results.push(runOne(`23_deterministic_cycle_${i}`, 'node', ['scripts/run-regressions.mjs']));
}
for (let i=1;i<=2;i++) {
  console.log(`running staging ${i}`);
  results.push(runOne(`24_staging_cycle_${i}`, 'node', ['scripts/run-staging-smokes.mjs']));
}
fs.writeFileSync(path.join(outDir, '23_24_independent_gate_runs.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2) + '\n');
console.log('done');
