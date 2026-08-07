// PHASE-10A14-R20 COMMIT 5R1-C37 checkpoint-72 context-gate safe pause.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RESULTS = path.join(REPO, 'evaluation/results/phase-10a14-r20');
const R = (name) => path.join(RESULTS, name);
const HEAD = 'ee664eab4529c636f34cb6d37d23a6a497886a17';
const PARENT = 'd5b25e676f623fbc1888608ff250824fcd34af99';
const BRANCH = 'feature/source-availability-engine-v1';
const STARTED_UTC = '2026-08-03T13:07:15.253Z';
const CLASSIFICATION = 'C37_CHECKPOINT_72_PRE_INVOCATION_SAFE_PAUSE_AUTHORIZATION_UNUSED';
const NEXT = 'Start a fresh owner-governed Codex continuation from checkpoint 72 with at least 120000 current-session tokens remaining. Preserve checkpoint 71, its compatible wrapper, the checkpoint-71 failed final preflight, the exact 57-file package, capsule, bootstrap, read rules, protected evidence, and the still-unused one-use authorization. Authorize and validate a checkpoint-72 noncolliding final-preflight/output binding before any marker or provider contact; do not begin C38 or later work.';

const F = Object.freeze({
  driver: fileURLToPath(import.meta.url),
  prompt: 'C:/Projects/tina-execution-prompts/PHASE-10A14-R20-COMMIT-5R1-C37-FOUR-HOUR-CODEX-ONLY-OPUS-REVIEW-AND-FINALIZATION-FROM-CHECKPOINT-71.md',
  pointer: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT.json'),
  cp71: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_71_prepared_transport_mismatch_pre_invocation.json'),
  log: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_LOG.ndjson'),
  cp71Manifest: R('COMMIT_5R1C37_CHECKPOINT_71_PREPARED_TRANSPORT_MISMATCH_EVIDENCE.sha256'),
  cp71Replay: R('COMMIT_5R1C37_CHECKPOINT_71_IDEMPOTENCE_REPLAY.json'),
  fresh: R('COMMIT_5R1C37_CHECKPOINT_71_FRESH_CONTINUATION_PREFLIGHT.json'),
  inventory: R('COMMIT_5R1C37_CHECKPOINT_71_PRE_EXECUTION_UNTRACKED_INVENTORY.sha256'),
  regressionReconciliation: R('COMMIT_5R1C37_CHECKPOINT_71_OUT_OF_SCOPE_REGRESSION_RECONCILIATION.json'),
  hermesReconciliation: R('COMMIT_5R1C37_CHECKPOINT_71_HERMES_SKILL_RECONCILIATION.json'),
  finalPreflight: R('COMMIT_5R1C37_CHECKPOINT_71_MANIFEST_INDEXED_OPUS_FINAL_PREFLIGHT.json'),
  marker: R('COMMIT_5R1C37_CHECKPOINT_71_MANIFEST_INDEXED_OPUS_INVOCATION_MARKER.json'),
  capture: R('COMMIT_5R1C37_CHECKPOINT_71_MANIFEST_INDEXED_OPUS_CLI_CAPTURE.json'),
  stdout: R('COMMIT_5R1C37_CHECKPOINT_71_MANIFEST_INDEXED_OPUS_STDOUT.txt'),
  stderr: R('COMMIT_5R1C37_CHECKPOINT_71_MANIFEST_INDEXED_OPUS_STDERR.txt'),
  reviewJson: R('COMMIT_5R1C37_CHECKPOINT_71_MANIFEST_INDEXED_OPUS_REVIEW.json'),
  reviewMd: R('COMMIT_5R1C37_CHECKPOINT_71_MANIFEST_INDEXED_OPUS_REVIEW.md'),
  receipt: R('COMMIT_5R1C37_CHECKPOINT_71_MANIFEST_INDEXED_OPUS_TRANSMISSION_RECEIPT.json'),
  reviewCoverage: R('COMMIT_5R1C37_CHECKPOINT_71_MANIFEST_INDEXED_OPUS_REVIEW_COVERAGE.json'),
  finalAdjudication: R('COMMIT_5R1C37_CHECKPOINT_71_MANIFEST_INDEXED_OPUS_FINAL_ADJUDICATION.json'),
  ledger: R('COMMIT_5R1C37_TOKEN_CONTEXT_BUDGET_LEDGER.ndjson'),
  authorization: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_EXTERNAL_AUTHORIZATION.json'),
  packageManifest: R('COMMIT_5R1C37_OPUS_REVIEW_EVIDENCE.sha256'),
  detailedManifest: R('COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_PACKAGE_MANIFEST.json'),
  capsule: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_CAPSULE.json'),
  wrapper: path.join(REPO, 'evaluation/runner/phase-10a14-r20/commit5r1c37-checkpoint71-opus-compatible.mjs'),
  originalRunner: path.join(REPO, 'evaluation/runner/phase-10a14-r20/commit5r1c37-checkpoint69-opus.mjs'),
  protectedPreflight69: R('COMMIT_5R1C37_CHECKPOINT_69_MANIFEST_INDEXED_OPUS_FINAL_PREFLIGHT.json'),
  compatibilityManifest: R('COMMIT_5R1C37_CHECKPOINT_71_COMPATIBLE_BOUNDARY_EVIDENCE.sha256'),
  protectedBaseline: R('COMMIT_5R1C37_PROTECTED_RESIDUE_BASELINE.json'),
  priorProtected: R('COMMIT_5R1C37_CHECKPOINT_69_PROTECTED_RESIDUE_VERIFICATION.json'),
  registry: R('CANONICAL_ATTEMPT_REGISTRY.json'),
  attempts: R('attempts'),
  c34Wal: R('COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c35Wal: R('COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson'),
  regression: R('COMMIT_5R1C37_FINAL_FULL_REGRESSION_ADJUDICATION.json'),
  preservationSource: R('COMMIT_5R1C37_FINAL_PRESERVATION_RESULT.json'),
  reasonDecision: R('COMMIT_5R1C37_RUNTIME_CANDIDATE_NECESSITY_DECISION.json'),
  rowAdjudication: R('COMMIT_5R1C37_145_ROW_CONTRACT_ADJUDICATION.json'),
  roadmap: path.join(REPO, 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md'),
  currentState: path.join(REPO, 'knowledge/CURRENT_STATE.md'),
  reconciliation72: R('COMMIT_5R1C37_CHECKPOINT_72_CONTEXT_GATE_SAFE_PAUSE_RECONCILIATION.json'),
  preservation72: R('COMMIT_5R1C37_CHECKPOINT_72_POST_GATE_PRESERVATION_VERIFICATION.json'),
  docs72: R('COMMIT_5R1C37_CHECKPOINT_72_DOCUMENTATION_CONSISTENCY_VALIDATION.json'),
  proposedStage72: R('COMMIT_5R1C37_CHECKPOINT_72_PROPOSED_STAGED_PATHS.json'),
  actualStage72: R('COMMIT_5R1C37_CHECKPOINT_72_ACTUAL_STAGED_PATHS.json'),
  localGit72: R('COMMIT_5R1C37_CHECKPOINT_72_LOCAL_GIT_VERIFICATION.json'),
  live72: R('COMMIT_5R1C37_CHECKPOINT_72_LIVE_GITHUB_BASELINE_VERIFICATION.json'),
  terminal72: R('COMMIT_5R1C37_CHECKPOINT_72_PRE_INVOCATION_SAFE_PAUSE_TERMINAL_STATE.json'),
  handoff72: R('COMMIT_5R1C37_FOUR_HOUR_RESUME_HANDOFF_FROM_CHECKPOINT_72.md'),
  evidence72: R('COMMIT_5R1C37_CHECKPOINT_72_PRE_INVOCATION_SAFE_PAUSE_EVIDENCE.sha256'),
  numbered72: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_72_pre_invocation_context_gate_safe_pause.json'),
  finalManifest72: R('COMMIT_5R1C37_CHECKPOINT_72_FINAL_EVIDENCE.sha256'),
  replay72: R('COMMIT_5R1C37_CHECKPOINT_72_IDEMPOTENCE_REPLAY.json'),
});

const INVOCATION_AFTER_PREFLIGHT = [F.marker,F.capture,F.stdout,F.stderr,F.reviewJson,F.reviewMd,F.receipt,F.reviewCoverage,F.finalAdjudication];
const NEW_FILES = [F.reconciliation72,F.preservation72,F.docs72,F.proposedStage72,F.actualStage72,F.localGit72,F.live72,F.terminal72,F.handoff72,F.evidence72,F.numbered72,F.finalManifest72,F.replay72];

const assert = (condition, code) => { if (!condition) throw new Error(code); };
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const shaFile = (file) => sha(fs.readFileSync(file));
const stable = (value) => JSON.stringify(value, null, 2) + '\n';
const compact = (value) => JSON.stringify(value) + '\n';
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rel = (file) => path.relative(REPO, file).replaceAll('\\', '/');
const record = (file) => ({ path: rel(file), bytes: fs.statSync(file).size, sha256: shaFile(file) });
const lines = (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
const git = (...args) => execFileSync('git.exe', args, { cwd: REPO, encoding: 'utf8', windowsHide: true,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_GLOBAL: 'NUL' } }).trim();
function writeNew(file, value) {
  const data = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  const fd = fs.openSync(file, 'wx');
  try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  return record(file);
}
function overwritePointerFrom(file) {
  const data = fs.readFileSync(file);
  const fd = fs.openSync(F.pointer, 'w');
  try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function verifyShaManifest(file, expectedRows = null) {
  const rows = lines(file).map((line) => {
    const m = line.match(/^([0-9a-f]{64})  (.+)$/);
    assert(m, 'BAD_MANIFEST_LINE:' + rel(file));
    const target = path.join(REPO, ...m[2].split('/'));
    const actual = fs.existsSync(target) ? shaFile(target) : 'MISSING';
    return { path: m[2], expected: m[1], actual, match: m[1] === actual };
  });
  if (expectedRows !== null) assert(rows.length === expectedRows, 'MANIFEST_ROW_COUNT:' + rel(file));
  return { rows: rows.length, matching: rows.filter((x) => x.match).length, bad: rows.filter((x) => !x.match), pass: rows.every((x) => x.match) };
}
function gitState() {
  const [ahead,behind] = git('rev-list','--left-right','--count','HEAD...@{upstream}').split(/\s+/).map(Number);
  return { head: git('rev-parse','HEAD'), parent: git('rev-parse','HEAD^'), branch: git('branch','--show-current'),
    upstream: git('rev-parse','@{upstream}'), fetchHead: git('rev-parse','FETCH_HEAD'), ahead, behind,
    tracked: git('status','--porcelain=v1','--untracked-files=no'), staged: git('diff','--cached','--name-only') };
}
function protectedState() {
  const base = readJson(F.protectedBaseline);
  const all = [...base.records,...base.protectedTrackedControls].map((x) => {
    const target = path.join(REPO,...x.path.replaceAll('\\','/').split('/'));
    const actual = record(target);
    return { ...actual, expectedBytes:x.bytes, expectedSha256:x.sha256, pass:actual.bytes===x.bytes&&actual.sha256===x.sha256 };
  });
  const untracked = all.slice(0,base.records.length);
  const aggregate = sha(Buffer.from(untracked.map((x) => `${x.path}\0${x.bytes}\0${x.sha256}\n`).join('')));
  const components = ['ask-handler.js','conflict-engine.js','services/answer-support-evidence.js','services/answer-support-validator.js']
    .sort().map((p) => record(path.join(REPO,p)));
  const c35 = sha(Buffer.from(components.map((x) => `${x.path}\0${x.bytes}\0${x.sha256}\n`).join('')));
  const prior = readJson(F.priorProtected);
  return { baseline:record(F.protectedBaseline),recordsChecked:all.length,recordsMatching:all.filter((x)=>x.pass).length,
    mismatches:all.filter((x)=>!x.pass),aggregateSha256:aggregate,c35:{components,compositeSha256:c35},
    c34ReasonRuntimeSha256:prior.selectedC34ReasonRuntimeSha256,pass:all.every((x)=>x.pass)&&aggregate==='980cd3b5f2a5b75104bc91c9e6f4391e80bf5f0d772f48b61c79497e3d2ebd0a'&&c35==='5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c'&&prior.selectedC34ReasonRuntimeSha256==='73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775' };
}
function registryState() {
  const reg = readJson(F.registry);
  const ids = reg.attempts.map((x)=>x.attemptId);
  const dirs = fs.readdirSync(F.attempts,{withFileTypes:true}).filter((x)=>x.isDirectory()).map((x)=>x.name);
  const idSet = new Set(ids), dirSet = new Set(dirs);
  const c34 = lines(F.c34Wal), c35 = lines(F.c35Wal);
  return { registry:record(F.registry),registryAttempts:ids.length,uniqueAttemptIds:idSet.size,attemptDirectories:dirs.length,
    orphanDirectories:dirs.filter((x)=>!idSet.has(x)),danglingRegistryRows:ids.filter((x)=>!dirSet.has(x)),
    controllingAttempts:reg.attempts.filter((x)=>x.controlling===true).length,nonControllingAttempts:reg.attempts.filter((x)=>x.controlling!==true).length,
    runningAttempts:reg.attempts.filter((x)=>['running','allocated','started'].includes(x.status)).map((x)=>x.attemptId),
    c34Wal:{...record(F.c34Wal),rows:c34.length},c35Wal:{...record(F.c35Wal),rows:c35.length},
    c36WalAbsent:!fs.existsSync(R('COMMIT_5R1C36_ATTEMPT_ALLOCATION_WAL.ndjson')),
    c37WalAbsent:!fs.existsSync(R('COMMIT_5R1C37_ATTEMPT_ALLOCATION_WAL.ndjson')) };
}
function processState() {
  const ps = `$all=@(Get-CimInstance Win32_Process -ErrorAction Stop);$nodes=@($all|Where-Object{$_.Name -eq 'node.exe'}|ForEach-Object{[pscustomobject]@{pid=$_.ProcessId;parentPid=$_.ParentProcessId;taskOwned=([bool]($_.CommandLine -match 'commit5r1c37|c37-manifest-indexed-checkpoint71|checkpoint72-context-safe-pause'))}});$claudes=@($all|Where-Object{$_.Name -eq 'claude.exe'}|ForEach-Object{$p=$all|Where-Object ProcessId -eq $_.ParentProcessId|Select-Object -First 1;[pscustomobject]@{pid=$_.ProcessId;parentPid=$_.ParentProcessId;parentName=$p.Name;taskOwned=([bool]($_.CommandLine -match 'commit5r1c37|c37-manifest-indexed-checkpoint71|claude-opus-4-8'));vscodeOwned=($p.Name -eq 'Code.exe' -or $_.CommandLine -match 'vscode')}});[pscustomobject]@{nodes=$nodes;claudes=$claudes}|ConvertTo-Json -Compress -Depth 5`;
  const result = spawnSync('powershell.exe',['-NoProfile','-Command',ps],{encoding:'utf8',windowsHide:true});
  assert(result.status===0,'PROCESS_INSPECTION:'+result.stderr);
  const parsed = JSON.parse(result.stdout);
  const nodes = parsed.nodes ?? [], claudes = parsed.claudes ?? [];
  const listeners = execFileSync('netstat.exe',['-ano','-p','TCP'],{encoding:'utf8',windowsHide:true}).split(/\r?\n/)
    .filter((line)=>{const f=line.trim().split(/\s+/);return f[0]==='TCP'&&/:5173$/.test(f[1]??'')&&f[3]==='LISTENING';});
  return { taskOwnedNodePids:nodes.filter((x)=>x.taskOwned&&x.pid!==process.pid).map((x)=>x.pid),
    unrelatedNodePids:nodes.filter((x)=>!x.taskOwned).map((x)=>x.pid),
    taskOwnedClaudePids:claudes.filter((x)=>x.taskOwned).map((x)=>x.pid),
    userOwnedVscodeClaudePids:claudes.filter((x)=>x.vscodeOwned&&!x.taskOwned).map((x)=>x.pid),
    port5173Listeners:listeners,validationTempExists:fs.existsSync('C:/tmp/c37-manifest-indexed-checkpoint71-validation'),
    invocationTempExists:fs.existsSync('C:/tmp/c37-manifest-indexed-checkpoint71-invocation'),
    allocationLockExists:fs.existsSync(R('.attempt-allocation.lock')),gitIndexLockExists:fs.existsSync(path.join(REPO,'.git/index.lock')) };
}
function liveTip() {
  const raw = execFileSync('git.exe',['ls-remote','--heads','https://github.com/bongcorpuz/tina-backend.git','refs/heads/feature/source-availability-engine-v1'],
    {cwd:REPO,encoding:'utf8',windowsHide:true,env:{...process.env,GIT_CONFIG_GLOBAL:'NUL'}}).trim();
  return { command:'git ls-remote --heads https://github.com/bongcorpuz/tina-backend.git refs/heads/feature/source-availability-engine-v1',
    raw,tip:raw.split(/\s+/)[0]??null };
}
function baseChecks() {
  const cp71 = readJson(F.cp71), fresh = readJson(F.fresh), final = readJson(F.finalPreflight), auth = readJson(F.authorization);
  assert(shaFile(F.prompt)==='08faa77e27a067d22cbb0f57d89f837774d599acff99df7f7c74d489de5b8cdf','PROMPT_HASH');
  assert(shaFile(F.cp71)==='9e7537d5e93399f2e721ce60478cf12f1dd52f289ea3dead0b4e7f643115cf50','CP71_HASH');
  assert(cp71.ordinal===71&&cp71.safeToResume===true&&cp71.activeAttemptId===null,'CP71_FIELDS');
  assert(fresh.pass===true&&readJson(F.regressionReconciliation).pass===true&&readJson(F.hermesReconciliation).pass===true,'CONTINUATION_EVIDENCE');
  assert(shaFile(F.wrapper)==='6c85d355d46fe5808e7c21996e8ca44255d6b8933021eaf84fcdab7dd61e90bc','WRAPPER_HASH');
  assert(shaFile(F.originalRunner)==='87643d1079ff622617f4ede77d9497287f98e6df90a85f4b4dd0ddbd4db0c795','ORIGINAL_RUNNER_HASH');
  assert(shaFile(F.protectedPreflight69)==='6cd7062020d06ba7acdd71b52e8058e110b407ed7a22246b0f52c2856bb6cd1f','PREFLIGHT69_HASH');
  assert(shaFile(F.authorization)==='5261030505f27dbd9a1450b16d75876aa2141cf741bd83957ed50e8746bf5d44','AUTH_HASH');
  assert(auth.newAuthorization.status==='AUTHORIZED_UNUSED'&&!auth.authorizationConsumed&&!auth.invocationMarkerExists&&!auth.substantiveRequestSubmitted,'AUTH_UNUSED');
  assert(final.pass===false&&final.classification==='C37_CHECKPOINT_71_MANIFEST_INDEXED_OPUS_FINAL_PREFLIGHT_FAIL','FINAL_PREFLIGHT_CLASS');
  const falseGates=Object.entries(final.gates).filter(([,v])=>v!==true).map(([k])=>k);
  assert(falseGates.join(',')==='remainingCodexContextAtLeast120000','ONLY_CONTEXT_GATE');
  assert(final.token.calculatedEffectiveRemainingTokens===83242&&final.token.requiredPreSubmissionRemainingTokens===120000&&final.token.headroomAboveReserveTokens===28842,'TOKEN_FACTS');
  assert(INVOCATION_AFTER_PREFLIGHT.every((x)=>!fs.existsSync(x)),'POST_PREFLIGHT_OUTPUT_EXISTS');
  const compat=verifyShaManifest(F.compatibilityManifest,8); assert(compat.pass,'COMPAT_MANIFEST');
  const pkg=verifyShaManifest(F.packageManifest,57); assert(pkg.pass,'PACKAGE_MANIFEST');
  assert(shaFile(F.capsule)==='7f223fe8386fcb23d1f2ecec4254ca44ee753fb2479fefb9c1d897ee767cf30f','CAPSULE_HASH');
  const ledger=lines(F.ledger).map(JSON.parse); assert(ledger.length===16&&ledger.every((x,i)=>x.sequence===i+1),'LEDGER_CONTINUITY');
  assert(shaFile(F.ledger)==='e95c8dbc0f2b90b54e69dd50711004abcd71a250a72370410354fd25be13111f','LEDGER_HASH');
  const cp71Manifest=verifyShaManifest(F.cp71Manifest,33);
  assert(cp71Manifest.matching===32&&cp71Manifest.bad.length===1&&cp71Manifest.bad[0].path===rel(F.ledger)
    &&cp71Manifest.bad[0].expected==='9767b4562511008115ea4c2671304669cb610c1cf38f9a52cf14a45ac2c9cce3'
    &&cp71Manifest.bad[0].actual==='e95c8dbc0f2b90b54e69dd50711004abcd71a250a72370410354fd25be13111f','CP71_APPEND_ONLY_LEDGER');
  const priorBytes=fs.readFileSync(F.ledger).subarray(0,28463); assert(sha(priorBytes)==='9767b4562511008115ea4c2671304669cb610c1cf38f9a52cf14a45ac2c9cce3','LEDGER_PREFIX');
  const gitNow=gitState(); assert(gitNow.head===HEAD&&gitNow.parent===PARENT&&gitNow.branch===BRANCH&&gitNow.upstream===HEAD&&gitNow.fetchHead===HEAD&&gitNow.ahead===0&&gitNow.behind===0&&!gitNow.tracked&&!gitNow.staged,'GIT_STATE');
  const protectedNow=protectedState(); assert(protectedNow.pass,'PROTECTED');
  const registryNow=registryState(); assert(registryNow.registry.sha256==='a0261acfcc4cc69615794fe6f26117c00789d42862a75fae3e978b2e17a1e073'
    &&registryNow.registryAttempts===230&&registryNow.uniqueAttemptIds===230&&registryNow.attemptDirectories===230
    &&registryNow.orphanDirectories.length===0&&registryNow.danglingRegistryRows.length===0&&registryNow.runningAttempts.length===0
    &&registryNow.c34Wal.rows===32&&registryNow.c34Wal.sha256==='2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2'
    &&registryNow.c35Wal.rows===6&&registryNow.c35Wal.sha256==='d86f6fb331fa6010365debc13b7417704e4c71402af8803775744f00eef9260f'
    &&registryNow.c36WalAbsent&&registryNow.c37WalAbsent,'REGISTRY_WAL');
  const processNow=processState(); assert(processNow.taskOwnedNodePids.length===0&&processNow.taskOwnedClaudePids.length===0&&processNow.port5173Listeners.length===0
    &&!processNow.validationTempExists&&!processNow.invocationTempExists&&!processNow.allocationLockExists&&!processNow.gitIndexLockExists,'HYGIENE');
  const live=liveTip(); assert(live.tip===HEAD,'LIVE_TIP');
  return {cp71,fresh,final,auth,compat,pkg,ledger,cp71Manifest,gitNow,protectedNow,registryNow,processNow,live};
}
function taskSnapshot() {
  const files = [...fs.readdirSync(RESULTS).map((n)=>path.join(RESULTS,n)).filter((p)=>fs.statSync(p).isFile()),
    ...fs.readdirSync(path.dirname(F.driver)).map((n)=>path.join(path.dirname(F.driver),n)).filter((p)=>fs.statSync(p).isFile()),
    F.roadmap,F.currentState].sort();
  const rows=files.map(record); return {files:rows.length,aggregateSha256:sha(Buffer.from(rows.map((x)=>`${x.path}\0${x.bytes}\0${x.sha256}\n`).join('')))};
}
function create() {
  for (const file of NEW_FILES) assert(!fs.existsSync(file),'NEW_OUTPUT_COLLISION:'+rel(file));
  assert(shaFile(F.pointer)==='9e7537d5e93399f2e721ce60478cf12f1dd52f289ea3dead0b4e7f643115cf50','POINTER_NOT_CP71');
  const s=baseChecks(), generatedUtc=new Date().toISOString();
  const elapsedMilliseconds=Date.parse(generatedUtc)-Date.parse(STARTED_UTC);
  const docs={roadmap:{...record(F.roadmap),expectedSha256:'3a829e69216addfdcad0f45e975475c3b4b006bfc2481e6745157585bfeeec54'},
    currentState:{...record(F.currentState),expectedSha256:'f53cf577c7b4a979b563f6a22b96b9f30164608a79de5054ead05c63016d6aa0'}};
  assert(docs.roadmap.sha256===docs.roadmap.expectedSha256&&docs.currentState.sha256===docs.currentState.expectedSha256,'DOC_HASH');
  const preservation={schemaVersion:1,unit:'PHASE-10A14-R20 COMMIT 5R1-C37',classification:'C37_CHECKPOINT_72_POST_GATE_PRESERVATION_PASS',generatedUtc,
    c35Runtime:s.protectedNow.c35,c35CompositeExpected:'5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c',
    c34ReasonRuntimeSha256:s.protectedNow.c34ReasonRuntimeSha256,protectedResidue:{recordsChecked:s.protectedNow.recordsChecked,recordsMatching:s.protectedNow.recordsMatching,
      aggregateSha256:s.protectedNow.aggregateSha256,mismatches:s.protectedNow.mismatches},registryWal:s.registryNow,
    oracleAndFixturesChanged:false,runtimeChanged:false,registryOrWalChanged:false,packageEntries:s.pkg.rows,packageMatching:s.pkg.matching,
    authorizationSha256:shaFile(F.authorization),pass:true};
  writeNew(F.preservation72,stable(preservation));
  writeNew(F.docs72,stable({schemaVersion:1,unit:'PHASE-10A14-R20 COMMIT 5R1-C37',classification:'C37_CHECKPOINT_72_DOCUMENTATION_CUTOVER_NOT_AUTHORIZED_FILES_UNCHANGED',generatedUtc,
    reviewApproved:false,cutoverAuthorized:false,roadmapV9Updated:false,currentStateUpdated:false,documents:docs,
    consistentStatus:{c37:'SAFE_PAUSED_PRE_INVOCATION',phase10A:'OPEN',r20:'IN_PROGRESS',metrics:{decision:'3720/3720',relation:'3720/3720',reason:'3575/3720',reasonOnlyRows:145},
      nextOperation:NEXT},unrelatedHistoricalRepairPerformed:false,pass:true}));
  writeNew(F.proposedStage72,stable({schemaVersion:1,unit:'PHASE-10A14-R20 COMMIT 5R1-C37',classification:'C37_CHECKPOINT_72_PROPOSED_STAGED_PATHS_EMPTY_SAFE_PAUSE',generatedUtc,
    approvalGatePassed:false,stagingAuthorized:false,proposedPaths:[],protectedUntrackedPathsStaged:[],reason:'Pre-invocation context gate failed; Step 7 is not authorized.',pass:true}));
  writeNew(F.actualStage72,stable({schemaVersion:1,unit:'PHASE-10A14-R20 COMMIT 5R1-C37',classification:'C37_CHECKPOINT_72_ACTUAL_STAGED_PATHS_EMPTY_SAFE_PAUSE',generatedUtc,
    stagedPaths:[],stagingEmpty:true,commitCreated:false,pushPerformed:false,pass:true}));
  writeNew(F.localGit72,stable({schemaVersion:1,unit:'PHASE-10A14-R20 COMMIT 5R1-C37',classification:'C37_CHECKPOINT_72_LOCAL_GIT_BASELINE_VERIFIED_NO_COMMIT',generatedUtc,
    ...s.gitNow,requiredC37Parent:HEAD,c37Commit:null,trackedTreeClean:true,stagingEmpty:true,pass:true}));
  writeNew(F.live72,stable({schemaVersion:1,unit:'PHASE-10A14-R20 COMMIT 5R1-C37',classification:'C37_CHECKPOINT_72_LIVE_GITHUB_BASELINE_VERIFIED_NO_PUSH',generatedUtc,
    repository:'bongcorpuz/tina-backend',branch:BRANCH,...s.live,expectedTip:HEAD,pushPerformed:false,pass:true}));
  const reconciliation={schemaVersion:1,unit:'PHASE-10A14-R20 COMMIT 5R1-C37',classification:CLASSIFICATION,generatedUtc,startedUtc:STARTED_UTC,elapsedMilliseconds,
    startingCheckpoint:{ordinal:71,...record(F.cp71),eventSha256:s.cp71.eventSha256},freshPreflight:record(F.fresh),
    anomalyReconciliations:{outOfScopeRegression:record(F.regressionReconciliation),hermesSkill:record(F.hermesReconciliation),
      hermesClassification:readJson(F.hermesReconciliation).classification},
    finalContextGate:{...record(F.finalPreflight),onlyFailedGate:'remainingCodexContextAtLeast120000',...s.final.token},
    authorizationBefore:{status:'AUTHORIZED_UNUSED',consumed:false,invocationCount:0,remainingInvocationCount:1,retryAuthorized:false},
    authorizationAfter:{status:'AUTHORIZED_UNUSED',consumed:false,invocationCount:0,remainingInvocationCount:1,retryAuthorized:false},
    markerCreated:false,providerSpawned:false,providerContacted:false,substantiveRequestSubmitted:false,retryStatus:'NOT_A_RETRY_AUTHORIZATION_REMAINS_UNUSED',
    reviewer:{executed:false,decision:null,substantivePathToken:null,coverage:{claims:'0/222',rows:'0/145',spotChecks:'0/9',evidenceClasses:'0/8'},observations:[]},
    cp71EvidenceAfterAuthorizedLedgerAppend:{rows:s.cp71Manifest.rows,matching:s.cp71Manifest.matching,onlyMismatch:s.cp71Manifest.bad[0],
      priorLedgerPrefixBytes:28463,priorLedgerPrefixSha256:'9767b4562511008115ea4c2671304669cb610c1cf38f9a52cf14a45ac2c9cce3',
      appendedSequence:16,currentLedger:record(F.ledger),appendOnly:true},
    preservation:record(F.preservation72),documentation:{updated:false,validation:record(F.docs72)},staging:{performed:false,proposed:record(F.proposedStage72),actual:record(F.actualStage72)},
    git:{local:record(F.localGit72),live:record(F.live72),commit:null,push:false},hygiene:s.processNow,
    metrics:{decision:'3720/3720',relation:'3720/3720',reason:'3575/3720',reasonOnlyRows:145},phase10A:'OPEN',r20:'IN_PROGRESS',
    prohibitedOperations:{c38:false,e2:false,a15:false,phase10B:false,deployment:false,reindexing:false,migration:false,modelMigration:false},
    safeToResume:true,activeAttemptId:null,nextExactOperation:NEXT,pass:true};
  writeNew(F.reconciliation72,stable(reconciliation));
  writeNew(F.terminal72,stable({schemaVersion:1,unit:'PHASE-10A14-R20 COMMIT 5R1-C37',classification:CLASSIFICATION,generatedUtc,
    blocker:'CURRENT_CODEX_SESSION_REMAINING_CONTEXT_BELOW_120000',remainingTokens:83242,authorizationStatus:'AUTHORIZED_UNUSED',
    invocationCount:0,marker:false,providerContacted:false,reviewerExecuted:false,documentationUpdated:false,stagingPerformed:false,
    commitCreated:false,pushPerformed:false,phase10A:'OPEN',r20:'IN_PROGRESS',safeToResume:true,activeAttemptId:null,nextExactOperation:NEXT,pass:true}));
  writeNew(F.handoff72,`# C37 resume handoff from checkpoint 72\n\nClassification: \`${CLASSIFICATION}\`.\n\nThe preserved checkpoint-71 compatible wrapper ran its final gates once. Every gate passed except the current Codex-session minimum: 83,242 tokens remained, 36,758 below the required 120,000. The wrapper stopped before the marker. No Claude process was spawned, no provider contact or substantive submission occurred, and the one-use manifest-indexed authorization remains AUTHORIZED_UNUSED with invocation count 0 and remaining count 1. Do not rerun the checkpoint-71 wrapper because its immutable checkpoint-71 final-preflight output now exists.\n\nCheckpoint 71 and all compatibility evidence remain preserved. The 57-file package is 57/57 over 4,109,852 bytes with aggregate 7fbc288baf7738e1c9c8d57b56aafe05b66c6dbabcbfe6074d4eb38568f41a08. The capsule remains 7f223fe8386fcb23d1f2ecec4254ca44ee753fb2479fefb9c1d897ee767cf30f. C35 runtime 5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c, C34 reason runtime 73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775, registry, WALs, oracle, fixtures, and protected residue remain unchanged. Decision/relation/reason remain 3720/3720, 3720/3720, and 3575/3720 with 145 reason-only rows. Phase 10A remains OPEN and R20 IN PROGRESS. Roadmap v9 and CURRENT_STATE.md were not updated; nothing was staged, committed, pushed, deployed, reindexed, or migrated.\n\nExact next operation: ${NEXT}\n`);
  const evidenceFiles=[F.driver,F.prompt,F.cp71,F.cp71Replay,F.fresh,F.inventory,F.regressionReconciliation,F.hermesReconciliation,F.finalPreflight,F.ledger,
    F.authorization,F.packageManifest,F.detailedManifest,F.capsule,F.wrapper,F.originalRunner,F.protectedPreflight69,F.compatibilityManifest,F.protectedBaseline,
    F.regression,F.preservationSource,F.reasonDecision,F.rowAdjudication,F.roadmap,F.currentState,F.reconciliation72,F.preservation72,F.docs72,F.proposedStage72,
    F.actualStage72,F.localGit72,F.live72,F.terminal72,F.handoff72];
  const evidenceText=evidenceFiles.map((x)=>`${shaFile(x)}  ${rel(x)}`).join('\n')+'\n';
  writeNew(F.evidence72,evidenceText); const evidenceCheck=verifyShaManifest(F.evidence72,evidenceFiles.length); assert(evidenceCheck.pass,'EVIDENCE72');
  const logBefore=fs.readFileSync(F.log), logShaBefore=sha(logBefore);
  const checkpointBase={schemaVersion:2,ordinal:72,commitUnit:'PHASE-10A14-R20 COMMIT 5R1-C37',updatedAtUtc:generatedUtc,
    stage:'checkpoint-71 compatible final pre-invocation context-gate safe pause',status:CLASSIFICATION,
    head:HEAD,upstream:HEAD,remoteTip:HEAD,parent:PARENT,branch:BRANCH,activeReasonBaseHash:'73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775',
    c35RuntimeHash:'5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c',activeAttemptId:null,
    decision:'3720/3720',relation:'3720/3720',reason:'3575/3720',reasonOnlyRowsRemaining:145,
    frozenDecision:'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED',generalizedRuntimeDefects:0,phase10A:'OPEN',r20:'IN_PROGRESS',
    c37:'SAFE_PAUSED_PRE_INVOCATION_CURRENT_CODEX_CONTEXT_GATE',priorAuthorizationsConsumed:2,
    manifestIndexedAuthorizationStatus:'AUTHORIZED_UNUSED',manifestIndexedAuthorizationConsumed:false,manifestIndexedInvocationCount:0,
    manifestIndexedRemainingInvocationCount:1,manifestIndexedRetryAuthorized:false,compatibleWrapperExecuted:true,
    finalPreflight:record(F.finalPreflight),onlyFailedGate:'remainingCodexContextAtLeast120000',token:{ledgerSequence:16,...s.final.token},
    invocationMarkerExists:false,providerSpawned:false,providerRequestObserved:false,modelReviewReached:false,reviewerObjectReceived:false,
    decisionToken:null,substantivePathToken:null,reviewCoverage:{claims:'0/222',rows:'0/145',spotChecks:'0/9',evidenceClasses:'0/8'},
    package:{entries:57,rawEvidenceBytes:4109852,aggregateSha256:'7fbc288baf7738e1c9c8d57b56aafe05b66c6dbabcbfe6074d4eb38568f41a08',pass:true},
    capsule:{...record(F.capsule),claims:222,rows:145,unsupportedClaims:0,omittedUnfavorableEvidence:0},
    originalRunner:record(F.originalRunner),compatibleWrapper:record(F.wrapper),protectedFinalPreflight69:record(F.protectedPreflight69),
    protectedResidueAggregate:'980cd3b5f2a5b75104bc91c9e6f4391e80bf5f0d772f48b61c79497e3d2ebd0a',
    registryWal:s.registryNow,hygiene:s.processNow,roadmapV9Updated:false,currentStateUpdated:false,documentationConsistency:record(F.docs72),
    stagingPerformed:false,proposedStagedPaths:record(F.proposedStage72),actualStagedPaths:record(F.actualStage72),commitCreated:false,pushPerformed:false,
    localGitVerification:record(F.localGit72),liveGithubVerification:record(F.live72),deploymentPerformed:false,reindexPerformed:false,migrationPerformed:false,
    modelMigrationPerformed:false,e2Begun:false,a15Begun:false,c38Begun:false,phase10BImplementationBegun:false,
    anomalies:{outOfScopeRegression:record(F.regressionReconciliation),hermesSkill:record(F.hermesReconciliation),
      hermesClassification:'EXTERNAL_NONREPOSITORY_ARTIFACT_NOT_LOADED'},
    reconciliation:record(F.reconciliation72),terminalState:record(F.terminal72),handoff:record(F.handoff72),evidenceManifest:record(F.evidence72),
    plannedFinalManifestPath:rel(F.finalManifest72),plannedReplayPath:rel(F.replay72),
    previousCheckpoint:{ordinal:71,...record(F.cp71),eventSha256:s.cp71.eventSha256,logSha256BeforeAppend:logShaBefore},
    elapsedMilliseconds,blocker:'CURRENT_CODEX_SESSION_REMAINING_CONTEXT_BELOW_120000',safePauseReason:CLASSIFICATION,
    nextExactOperation:NEXT,safeToResume:true};
  const eventSha256=sha(Buffer.from(stable(checkpointBase)));
  const checkpoint={...checkpointBase,eventSha256};
  writeNew(F.numbered72,stable(checkpoint)); overwritePointerFrom(F.numbered72);
  assert(fs.readFileSync(F.pointer).equals(fs.readFileSync(F.numbered72)),'POINTER72');
  const beforeRows=lines(F.log).map(JSON.parse); assert(beforeRows.map((x)=>x.ordinal).join(',')==='64,65,66,67,68,69,70,71','LOG_BEFORE72');
  const logFd=fs.openSync(F.log,'a'); try{fs.writeFileSync(logFd,compact(checkpoint));fs.fsyncSync(logFd);}finally{fs.closeSync(logFd);}
  const afterRows=lines(F.log).map(JSON.parse); assert(afterRows.map((x)=>x.ordinal).join(',')==='64,65,66,67,68,69,70,71,72','LOG_AFTER72');
  const finalManifestFiles=[...evidenceFiles,F.evidence72,F.numbered72,F.pointer,F.log];
  writeNew(F.finalManifest72,finalManifestFiles.map((x)=>`${shaFile(x)}  ${rel(x)}`).join('\n')+'\n');
  const finalManifestCheck=verifyShaManifest(F.finalManifest72,finalManifestFiles.length); assert(finalManifestCheck.pass,'FINAL_MANIFEST72');
  const replay={schemaVersion:1,unit:'PHASE-10A14-R20 COMMIT 5R1-C37',classification:'C37_CHECKPOINT_72_IDEMPOTENCE_REPLAY_PASS',generatedUtc,
    checkpoint:record(F.pointer),numberedCheckpoint:record(F.numbered72),checkpointLog:record(F.log),eventSha256,
    checkpointOrdinals:afterRows.map((x)=>x.ordinal),pointerEqualsNumberedCheckpoint:fs.readFileSync(F.pointer).equals(fs.readFileSync(F.numbered72)),
    previousCheckpoint71Preserved:shaFile(F.cp71)==='9e7537d5e93399f2e721ce60478cf12f1dd52f289ea3dead0b4e7f643115cf50',
    uniqueRecoveryOrdinals:afterRows.length===9&&new Set(afterRows.map((x)=>x.ordinal)).size===9,
    continuousTokenLedger:s.ledger.every((x,i)=>x.sequence===i+1),tokenLedgerPrefixPreserved:true,
    evidenceManifest:{...record(F.evidence72),...evidenceCheck},finalEvidenceManifest:{...record(F.finalManifest72),...finalManifestCheck},
    authorizationUnused:true,invocationCount:0,markerAbsent:!fs.existsSync(F.marker),providerContacted:false,
    safeToResume:true,activeAttemptId:null,noTaskOwnedProcessOrTempOrLock:true,userOwnedVscodeClaudePids:s.processNow.userOwnedVscodeClaudePids,
    userOwnedVscodeClaudeProcessTouched:false,noMutationOnReplay:true,pass:true};
  writeNew(F.replay72,stable(replay));
  process.stdout.write(JSON.stringify({classification:CLASSIFICATION,checkpoint:record(F.numbered72),eventSha256,replay:record(F.replay72),
    evidence:record(F.evidence72),finalEvidence:record(F.finalManifest72),authorization:'AUTHORIZED_UNUSED',invocationCount:0,providerContacted:false,pass:true})+'\n');
}
function replay() {
  const before=taskSnapshot(), pointerBefore=fs.readFileSync(F.pointer), logBefore=fs.readFileSync(F.log), replayBefore=fs.readFileSync(F.replay72);
  const cp=readJson(F.pointer), numbered=readJson(F.numbered72), replayRecord=readJson(F.replay72);
  assert(cp.ordinal===72&&cp.eventSha256===numbered.eventSha256&&cp.safeToResume===true&&cp.activeAttemptId===null,'REPLAY_CHECKPOINT');
  assert(pointerBefore.equals(fs.readFileSync(F.numbered72)),'REPLAY_POINTER');
  const ordinals=lines(F.log).map((x)=>JSON.parse(x).ordinal); assert(ordinals.join(',')==='64,65,66,67,68,69,70,71,72','REPLAY_ORDINALS');
  assert(verifyShaManifest(F.evidence72).pass&&verifyShaManifest(F.finalManifest72).pass,'REPLAY_MANIFESTS');
  assert(lines(F.ledger).map(JSON.parse).every((x,i)=>x.sequence===i+1),'REPLAY_LEDGER');
  assert(!fs.existsSync(F.marker)&&INVOCATION_AFTER_PREFLIGHT.every((x)=>!fs.existsSync(x)),'REPLAY_INVOCATION');
  const g=gitState(); assert(g.head===HEAD&&g.upstream===HEAD&&g.ahead===0&&g.behind===0&&!g.tracked&&!g.staged,'REPLAY_GIT');
  const p=processState(); assert(p.taskOwnedNodePids.length===0&&p.taskOwnedClaudePids.length===0&&p.port5173Listeners.length===0
    &&!p.validationTempExists&&!p.invocationTempExists&&!p.allocationLockExists&&!p.gitIndexLockExists,'REPLAY_HYGIENE');
  assert(replayRecord.pass&&replayRecord.safeToResume&&replayRecord.activeAttemptId===null,'REPLAY_RECORD');
  const after=taskSnapshot();
  assert(before.aggregateSha256===after.aggregateSha256&&pointerBefore.equals(fs.readFileSync(F.pointer))&&logBefore.equals(fs.readFileSync(F.log))
    &&replayBefore.equals(fs.readFileSync(F.replay72)),'REPLAY_MUTATION');
  process.stdout.write(JSON.stringify({classification:'C37_CHECKPOINT_72_IDEMPOTENCE_REPLAY_PASS',checkpointSha256:shaFile(F.pointer),
    eventSha256:cp.eventSha256,evidenceManifestPass:true,finalEvidenceManifestPass:true,noMutation:true,safeToResume:true,activeAttemptId:null,pass:true})+'\n');
}
const mode=process.argv[2];
if(mode==='--create')create();
else if(mode==='--replay')replay();
else throw new Error('USAGE: --create | --replay');
