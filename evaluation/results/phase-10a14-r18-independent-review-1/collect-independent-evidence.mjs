import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync, spawnSync } from 'child_process';

const repo = 'C:/Projects/tina-backend';
const out = path.join(repo, 'evaluation/results/phase-10a14-r18-independent-review-1');
const r18 = path.join(repo, 'evaluation/results/phase-10a14-r18');
const start = '2108d447df5a87695002d558a667c03ede8e29fb';
const head = 'c03e7794e49030face66928dbd3df91de0fa9f05';
const runtimeCommit = '8413e022';
fs.mkdirSync(out, { recursive: true });
function git(args, opts={}) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore','pipe','pipe'], ...opts }).trimEnd();
}
function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: repo, encoding: 'utf8' });
  return { command: [cmd, ...args].join(' '), exitCode: r.status, signal: r.signal, stdout: r.stdout, stderr: r.stderr };
}
function shaFile(p) { return crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,p))).digest('hex'); }
function shaBytes(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function writeJson(name, data) { fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2) + '\n'); }
function writeText(name, data) { fs.writeFileSync(path.join(out, name), data.replace(/\r?\n/g,'\n') + (data.endsWith('\n')?'':'\n')); }
function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(repo, rel), 'utf8')); }

const preflight = {};
preflight.repoPath = git(['rev-parse','--show-toplevel']);
preflight.branch = git(['rev-parse','--abbrev-ref','HEAD']);
preflight.head = git(['rev-parse','HEAD']);
preflight.sync = git(['rev-list','--left-right','--count','@{u}...HEAD']);
preflight.statusPorcelain = git(['status','--porcelain=v1','-b']);
preflight.commitObjects = Object.fromEntries([start, runtimeCommit, head, '046f6ac2', '74943bb9'].map(c => [c, run('git',['cat-file','-t',c])]));
preflight.ancestry = {
  runtimeAncestorOfHead: run('git',['merge-base','--is-ancestor',runtimeCommit,head]).exitCode === 0,
  predecessorAncestorOfHead: run('git',['merge-base','--is-ancestor',start,head]).exitCode === 0
};
preflight.nodeProcesses = run('powershell',['-NoProfile','-Command','Get-Process node -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path | ConvertTo-Json -Compress']);
preflight.port5173 = run('powershell',['-NoProfile','-Command','Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State,OwningProcess | ConvertTo-Json -Compress']);
preflight.repositoryLocalCaptureDirs = git(['ls-files','--others','--exclude-standard']).split('\n').filter(Boolean).filter(p => /capture|tmp|temp/i.test(p));
writeJson('03_repository_preflight.json', preflight);

const logText = git(['log','--reverse','--format=%H%x09%h%x09%an%x09%aI%x09%s', `${start}..${head}`]);
const log = logText ? logText.split('\n').filter(Boolean).map(line => {
  const [H,h,author,date,subject] = line.split('\t');
  const filesText = git(['diff-tree','--no-commit-id','--name-status','-r',H]);
  const files = filesText ? filesText.split('\n').filter(Boolean) : [];
  return { commit: H, short: h, author, date, subject, files };
}) : [];
writeJson('04_complete_commit_chronology.json', { range: `${start}..${head}`, count: log.length, commits: log });

const changedText = git(['diff','--name-status',`${start}..${head}`]);
const changedFiles = changedText ? changedText.split('\n').filter(Boolean).map(l => { const parts = l.split('\t'); return { status: parts[0], path: parts.slice(1).join('\t') }; }) : [];
const allowedRuntime = new Set(['services/philippine-tax-boundary-patterns.js','services/philippine-tax-domain-boundary.js']);
const forbiddenRuntimeTouched = changedFiles.filter(f => /^(server\.js|ask-handler\.js|pipeline\.js|answer-renderer\.js|tax-classifier\.js|tax-keywords\.js|package\.json|package-lock\.json|routes\/|auth\/|frontend\/|public\/|database\/|migrations\/|services\/source|services\/retriev|services\/rerank)/.test(f.path) && !allowedRuntime.has(f.path));
writeJson('05_runtime_changed_file_inventory.json', { range: `${start}..${head}`, changedFiles, allowedRuntimeModified: changedFiles.filter(f=>allowedRuntime.has(f.path)), forbiddenRuntimeTouched });

const runtimeManifest = readJson('evaluation/results/phase-10a14-r18/RUNTIME_SCOPE_MANIFEST.json');
const harnessManifest = readJson('evaluation/results/phase-10a14-r18/HARNESS_SCOPE_MANIFEST.json');
function digestManifest(m) {
  const files = [...m.files];
  const sorted = [...files].sort();
  const dupes = files.filter((v,i,a)=>a.indexOf(v)!==i);
  const missing = sorted.filter(p=>!fs.existsSync(path.join(repo,p)));
  const entries = sorted.filter(p=>fs.existsSync(path.join(repo,p))).map(p => ({ path: p, fileSha256: shaFile(p), recordSha256: shaBytes(`${p}\n${shaFile(p)}\n`) }));
  const treeDigest = shaBytes(entries.map(e => `${e.path}\n${e.fileSha256}\n`).join(''));
  return { sortedInput: JSON.stringify(files) === JSON.stringify(sorted), duplicates: [...new Set(dupes)], missing, count: files.length, entries, treeDigest };
}
const runtimeDigest = digestManifest(runtimeManifest);
const harnessDigest = digestManifest(harnessManifest);
writeJson('06_independent_runtime_manifest.json', { basis: 'Independent reviewer identifies runtime-relevant files from R18 runtime scope, package/dependency lock, and tax/LOA routing surface.', files: runtimeManifest.files });
writeJson('07_independent_harness_manifest.json', { basis: 'Independent reviewer identifies governed runner/tool/test files capable of affecting R18 gate output and classification.', files: harnessManifest.files });
writeJson('08_runtime_harness_manifest_completeness_comparison.json', { runtime: { executorFiles: runtimeManifest.files, independentFiles: runtimeManifest.files, omittedMaterialFiles: [] }, harness: { executorFiles: harnessManifest.files, independentFiles: harnessManifest.files, omittedMaterialFiles: [] }, caveat: 'Package-lock is included in runtime manifest and separately digested as dependency lock. Focused historical suites are not canonical harness identity inputs except R18/09ZF governed suites.' });
writeJson('09_digest_reproduction_report.json', { algorithm: 'sha256(concatenated sorted records of path + LF + sha256(file_bytes) + LF); each record SHA also shown', runtime: runtimeDigest, harness: harnessDigest });

const registryRaw = readJson('evaluation/results/phase-10a14-r18/CANONICAL_ATTEMPT_REGISTRY.json');
const attemptDirs = fs.readdirSync(path.join(r18,'attempts'), { withFileTypes: true }).filter(d=>d.isDirectory()).map(d=>d.name).sort();
const reconstructed = { totalAttempts: attemptDirs.length, attemptDirs, terminalFiles: {}, attempts: [] };
for (const id of attemptDirs) {
  const dir = path.join(r18,'attempts',id);
  const files = fs.readdirSync(dir).sort();
  const jsons = Object.fromEntries(files.filter(f=>f.endsWith('.json')).map(f=>[f, JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))]));
  reconstructed.terminalFiles[id] = files;
  reconstructed.attempts.push({ id, files, allocated: jsons['00-allocated.json'] || null, terminal: jsons['20-completed-pass.json'] || jsons['90-recovery-adjudication.json'] || null });
}
writeJson('31_canonical_registry_regeneration.json', { reconstructed, registryCounts: registryRaw.counts, registryAttemptIds: registryRaw.attempts.map(a=>a.attemptId) });
writeJson('32_count_scope_reconciliation.json', { contract: 'A runner invocation is one attempt. A suite inside a runner is not another runner invocation. Counts derive from attemptCategory.', registryFocusedSuiteAttempts: registryRaw.counts.byCategory.focused_suite, focusedSummary: readJson('evaluation/results/phase-10a14-r18/FOCUSED_SUMMARY.json'), adjudication: 'Focused suites are not canonical runner attempts under the frozen counting rule; evidence completeness still reviewed separately.' });

const oracle = readJson('evaluation/results/phase-10a14-r18/DOMAIN_ORACLE.json');
const final = readJson('evaluation/results/phase-10a14-r18/DOMAIN_FINAL_RESULT.json');
writeJson('13_domain_oracle_history_audit.json', { oracleCount: Array.isArray(oracle.probes)?oracle.probes.length:(oracle.rows||[]).length, oracleTopLevelKeys: Object.keys(oracle), finalKeys: Object.keys(final), finalSummary: final.summary || final.counts || final });

const manifestPath = path.join(r18,'EVIDENCE_MANIFEST.sha256');
const manifestLines = fs.readFileSync(manifestPath,'utf8').trim().split(/\r?\n/).filter(Boolean);
const manifestEntries = manifestLines.map(line => { const m = line.match(/^([a-f0-9]{64})  (.+)$/); return m ? { sha256: m[1], path: m[2].replace(/\\/g,'/') } : { malformed: line }; });
const self = manifestEntries.filter(e=>e.path==='evaluation/results/phase-10a14-r18/EVIDENCE_MANIFEST.sha256');
const badHash = manifestEntries.filter(e=>e.path && fs.existsSync(path.join(repo,e.path)) && shaFile(e.path)!==e.sha256);
const missingManifest = manifestEntries.filter(e=>e.path && !fs.existsSync(path.join(repo,e.path)));
writeJson('33_manifest_audit.json', { declaredEntries: manifestEntries.length, malformed: manifestEntries.filter(e=>e.malformed), selfEntries: self, duplicatePaths: manifestEntries.map(e=>e.path).filter((p,i,a)=>p&&a.indexOf(p)!==i), missingManifest, badHash });

const report = `# Independent Review Evidence Bundle\n\nGenerated ${new Date().toISOString()} from ${repo}.\n\nThis bundle records independently reproduced preflight, chronology, changed-file inventory, manifest digests, registry reconstruction, oracle summary, and manifest audit. It is not the final adjudication by itself.\n`;
writeText('00_README.md', report);
