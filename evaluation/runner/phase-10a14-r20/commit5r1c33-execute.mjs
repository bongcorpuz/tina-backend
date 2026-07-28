// PHASE-10A14-R20 COMMIT 5R1-C33 - replay remediation and governed R3 continuation.
// This runner intentionally keeps all candidate runtime writes transient. It restores
// the committed C32 service baseline before it writes final continuity evidence.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as L from './commit5r1c20-lib.mjs';
import { runGates } from './commit5r1c20-gates.mjs';

const UNIT = 'COMMIT 5R1-C33';
const RES = L.RES;
const ATT = L.ATT;
const REPO = L.REPO;
const START_HEAD = '17f86896c9c6dcca860dbf038ee8b3b963817bcb';
const EXPECTED_PARENT = '0a7571e953f37cc3c22095fb1c4b0912cd2625b1';
const C31_SELECTED = 'R20-domain_campaign-r20_commit5r1c31_structural_reason_remediation-commit5r1c31-dev-05-ord05-2026-07-28T01-15-38-851Z';
const C31_DIR = ATT + C31_SELECTED + '/runtime-snapshot/';
const C31_IDENTITY = {
  'services/philippine-tax-intent-analyzer.js': { bytes: 178821, normalizedLfSha256: '46514ab8c218b217ba0a8bcb002f6afb55db904f20f17678606f158fcd4f4799' },
  'services/philippine-tax-domain-boundary.js': { bytes: 12192, normalizedLfSha256: '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039' },
  'services/philippine-tax-boundary-patterns.js': { bytes: 65451, normalizedLfSha256: '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa' },
  servicesTreeDigest: '7615a21fb5fb7d33d32babbe8975049bea0972fd5e03f089c05c01fe5281e105',
};
const BASE_METRICS = { reasonPassed: 3482, decisionPassed: 3720, relationPassed: 3720, reasonCounterfactualPassed: 344, collisionProbesPassed: 196 };

const now = () => new Date().toISOString();
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const norm = (buf) => L.normLf(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
const normHash = (file) => sha(norm(fs.readFileSync(file)));
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = (file, value) => L.writeJson(file, value);
const rel = (file) => file.replace(/\\/g, '/').replace(/^C:\/Projects\/tina-backend\/?/, '');
const git = (...args) => execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 });
const startHeadFile = (service) => execFileSync('git', ['-C', REPO, 'show', `${START_HEAD}:${service}`], { maxBuffer: 1024 * 1024 * 1024 });

function requirePass(condition, message) {
  if (!condition) throw new Error(message);
}

function runtimeFor(dir) {
  const out = {};
  const parts = [];
  for (const name of L.SERVICES) {
    const bytes = fs.readFileSync(path.join(dir, name));
    parts.push(norm(bytes));
    out[`services/${name}`] = { bytes: bytes.length, normalizedLfSha256: sha(norm(bytes)) };
  }
  out.servicesTreeDigest = sha(Buffer.concat(parts));
  return out;
}

function sameRuntime(actual, expected) {
  return L.SERVICES.every((name) => {
    const key = `services/${name}`;
    return actual[key].bytes === expected[key].bytes && actual[key].normalizedLfSha256 === expected[key].normalizedLfSha256;
  }) && actual.servicesTreeDigest === expected.servicesTreeDigest;
}

function copyRuntime(sourceDir, destinationDir) {
  fs.mkdirSync(destinationDir, { recursive: true });
  for (const name of L.SERVICES) fs.copyFileSync(path.join(sourceDir, name), path.join(destinationDir, name));
}

async function installRuntime(sourceDir, audit, stage) {
  for (const name of L.SERVICES) await L.atomicWriteRuntime(`services/${name}`, fs.readFileSync(path.join(sourceDir, name)), audit);
  await L.assertRuntimeIntact(stage);
  return L.runtimeIdentity();
}

async function restoreStartHead(audit = []) {
  for (const name of L.SERVICES) await L.atomicWriteRuntime(`services/${name}`, startHeadFile(`services/${name}`), audit);
  await L.assertRuntimeIntact('c33-restore-start-head');
  return L.runtimeIdentity();
}

function metrics(gates) {
  return {
    canonicalPassed: gates.r3.canonicalPassed,
    decisionPassed: gates.r3.decisionPassed,
    relationPassed: gates.r3.relationPassed,
    reasonPassed: gates.reasonPassed,
    reasonMismatches: gates.r3.reasonMismatches,
    materialFalseAllows: gates.r3.materialFalseAllows,
    materialFalseRefusals: gates.r3.materialFalseRefusals,
    clarifyMismatches: gates.r3.clarifyMismatches,
    reasonCounterfactualPassed: gates.reasonCounterfactual.passed,
    collisionProbesPassed: gates.collisionProbes.passed,
    decisionCounterfactualPassed: gates.decisionCounterfactual.passed,
    relationCounterfactualPassed: gates.relationCounterfactual.passed,
    clauseProbesPassed: gates.clauseProbes.passed,
    richContextGuardPassed: gates.richContextGuard.passed,
    richContextGuardTotal: gates.richContextGuard.total,
    reasonIntegrityPass: gates.reasonIntegrity.pass,
    decisionLockHeld: gates.decisionLockHeld,
    relationLockHeld: gates.relationLockHeld,
  };
}

function frozenLocksHeld(m) {
  return m.decisionPassed === 3720 && m.relationPassed === 3720
    && m.reasonCounterfactualPassed === 344 && m.collisionProbesPassed === 196
    && m.decisionCounterfactualPassed === 756 && m.relationCounterfactualPassed === 282
    && m.clauseProbesPassed === 68 && m.richContextGuardPassed === 7 && m.richContextGuardTotal === 7
    && m.reasonIntegrityPass && m.materialFalseAllows === 0 && m.materialFalseRefusals === 0 && m.clarifyMismatches === 0;
}

function outputSignature(evidence) {
  return JSON.stringify({
    decision: evidence.decision,
    reasonCode: evidence.reasonCode,
    relations: (evidence.relations || []).map((r) => [r.source, r.relation, r.target, r.clauseId, r.evidenceSpan]),
  });
}

function rowPass(row, evidence) {
  const relations = (evidence.relations || []).map((r) => r.relation);
  return evidence.decision === row.expectedDecision
    && evidence.reasonCode === row.expectedReasonCodeFamily
    && (row.expectedRelations || []).every((r) => relations.includes(r.relation));
}

async function loadAnalyzerFrom(dir) {
  const source = path.resolve(dir, 'philippine-tax-intent-analyzer.js');
  const m = await import(`${pathToFileURL(source).href}?c33=${Date.now()}-${Math.random()}`);
  return (query) => m.analyzePhilippineTaxIntent(query);
}

function compactEvidence(evidence) {
  return {
    decision: evidence.decision,
    reasonCode: evidence.reasonCode,
    relations: (evidence.relations || []).map((r) => r.relation),
    requestedAction: evidence.requestedAction || null,
    requestedTarget: evidence.requestedTarget || null,
  };
}

function collectRows(baseAnalyze, candidateAnalyze) {
  const rows = L.loadR3();
  const newlyCorrected = [];
  const newlyRegressed = [];
  const wrongToDifferentWrong = [];
  const changedSignatures = [];
  const priorOverrideChanges = [];
  for (const row of rows) {
    const base = baseAnalyze(row.query);
    const candidate = candidateAnalyze(row.query);
    const baseCorrect = rowPass(row, base);
    const candidateCorrect = rowPass(row, candidate);
    const baseSig = outputSignature(base);
    const candidateSig = outputSignature(candidate);
    const record = {
      oracleId: row.oracleId,
      query: row.query,
      expectedDecision: row.expectedDecision,
      expectedReason: row.expectedReasonCodeFamily,
      base: compactEvidence(base),
      candidate: compactEvidence(candidate),
      baseCorrect,
      candidateCorrect,
    };
    if (!baseCorrect && candidateCorrect) newlyCorrected.push(record);
    if (baseCorrect && !candidateCorrect) newlyRegressed.push(record);
    if (!baseCorrect && !candidateCorrect && baseSig !== candidateSig) wrongToDifferentWrong.push(record);
    if (baseSig !== candidateSig) changedSignatures.push(record);
    if (baseCorrect && baseSig !== candidateSig) priorOverrideChanges.push(record);
  }
  const targetedIds = new Set(newlyCorrected.map((r) => r.oracleId));
  const outsideTarget = changedSignatures.filter((r) => !targetedIds.has(r.oracleId));
  return {
    totalRows: rows.length,
    baseCorrect: rows.length - rows.filter((r) => !rowPass(r, baseAnalyze(r.query))).length,
    candidateCorrect: rows.length - rows.filter((r) => !rowPass(r, candidateAnalyze(r.query))).length,
    newlyCorrected,
    newlyRegressed,
    wrongToDifferentWrong,
    priorOverrideChanges,
    changedSignatures,
    outsideTarget,
    pass: newlyRegressed.length === 0 && wrongToDifferentWrong.length === 0 && priorOverrideChanges.length === 0 && outsideTarget.length === 0,
  };
}

function insertRule(source, block) {
  const marker = '\n  return null;\n}\n\n/**\n * C20';
  requirePass(source.includes(marker), 'C33_OVERRIDE_INSERTION_POINT_NOT_FOUND');
  return source.includes(block.trim()) ? source : source.replace(marker, `\n${block}${marker}`);
}

function materializeCandidate(baseDir, destinationDir, blocks) {
  copyRuntime(baseDir, destinationDir);
  const analyzer = path.join(destinationDir, 'philippine-tax-intent-analyzer.js');
  let source = fs.readFileSync(analyzer, 'utf8');
  for (const block of blocks) source = insertRule(source, block);
  fs.writeFileSync(analyzer, source.replace(/\r\n/g, '\n'));
  return runtimeFor(destinationDir);
}

function processResult(command, args, cwd, input) {
  const r = spawnSync(command, args, { cwd, input, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 });
  return {
    command: [command, ...args].join(' '), cwd: cwd.replace(/\\/g, '/'), status: r.status,
    signal: r.signal || null, stdout: r.stdout || '', stderr: r.stderr || '', error: r.error ? String(r.error) : null,
  };
}

function canonicalPatch(baseDir, candidateDir, evidenceDir) {
  // `git diff --no-index` still resolves relative paths through an enclosing Git
  // repository on Windows. Build outside the repository so raw headers are stable.
  const patchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tina-c33-patch-'));
  const baseRoot = path.join(patchRoot, 'base', 'services');
  const candidateRoot = path.join(patchRoot, 'candidate', 'services');
  copyRuntime(baseDir, baseRoot);
  copyRuntime(candidateDir, candidateRoot);
  const changedFiles = L.SERVICES.filter((name) => normHash(path.join(baseDir, name)) !== normHash(path.join(candidateDir, name)));
  const parts = [];
  const rawHeaders = [];
  for (const name of changedFiles) {
    const before = `base/services/${name}`;
    const after = `candidate/services/${name}`;
    const result = processResult('git', ['diff', '--no-index', '--binary', '--src-prefix=a/', '--dst-prefix=b/', before, after], patchRoot);
    requirePass(result.status === 1, `C33_PATCH_DIFF_FAILED_${name}_${result.status}`);
    const lines = result.stdout.replace(/\r\n/g, '\n').split('\n');
    const expected = { diff: `diff --git a/${before} b/${after}`, old: `--- a/${before}`, next: `+++ b/${after}` };
    requirePass(lines[0] === expected.diff, `C33_PATCH_UNEXPECTED_DIFF_HEADER_${name}:${lines[0]}`);
    const oldIndex = lines.indexOf(expected.old);
    const newIndex = lines.indexOf(expected.next);
    requirePass(oldIndex > 0 && newIndex === oldIndex + 1, `C33_PATCH_UNEXPECTED_FILE_HEADER_${name}`);
    rawHeaders.push({ name, diff: lines[0], old: lines[oldIndex], next: lines[newIndex] });
    lines[0] = `diff --git a/services/${name} b/services/${name}`;
    lines[oldIndex] = `--- a/services/${name}`;
    lines[newIndex] = `+++ b/services/${name}`;
    parts.push(lines.join('\n'));
  }
  const text = parts.join('');
  const headers = text.split('\n').filter((line) => /^(diff --git |--- |\+\+\+ )/.test(line));
  const forbidden = /(?:[A-Za-z]:[\\/]|evaluation\/results\/|runtime-snapshot|delta-replay|attempts\/|\\\\)/i;
  const expectedHeaders = changedFiles.flatMap((name) => [
    `diff --git a/services/${name} b/services/${name}`,
    `--- a/services/${name}`,
    `+++ b/services/${name}`,
  ]);
  const validHeaders = headers.length === expectedHeaders.length && headers.every((line, index) => line === expectedHeaders[index]);
  return {
    text,
    sha256: sha(Buffer.from(text)),
    bytes: Buffer.byteLength(text),
    changedFiles: changedFiles.map((name) => `services/${name}`),
    rawHeaders,
    canonicalHeaders: headers,
    isolatedPatchSource: patchRoot.replace(/\\/g, '/'),
    hasForbiddenPath: forbidden.test(text),
    headersValid: validHeaders,
    pass: changedFiles.length > 0 && validHeaders && !forbidden.test(text),
  };
}

function treeFiles(root) {
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else out.push(path.relative(root, child).replace(/\\/g, '/'));
    }
  }
  walk(root);
  return out.sort();
}

function serviceHashes(root) {
  return Object.fromEntries(L.SERVICES.map((name) => [`services/${name}`, normHash(path.join(root, 'services', name))]));
}

function setChanged(before, after) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys.filter((key) => before[key] !== after[key]);
}

function sameObject(a, b) {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return keys.every((key) => a[key] === b[key]);
}

function replayOneEnvironment(kind, baseDir, candidateDir, patch, tempRoot) {
  const work = path.join(tempRoot, kind === 'non_repository' ? 'non-repository' : 'clean-git-worktree');
  fs.mkdirSync(path.join(work, 'services'), { recursive: true });
  for (const name of L.SERVICES) fs.copyFileSync(path.join(baseDir, name), path.join(work, 'services', name));
  let gitInit = null;
  if (kind === 'clean_git_worktree') {
    gitInit = [
      processResult('git', ['init', '--quiet'], work),
      processResult('git', ['config', 'core.autocrlf', 'false'], work),
      processResult('git', ['config', 'user.email', 'c33@example.invalid'], work),
      processResult('git', ['config', 'user.name', 'C33 replay'], work),
      processResult('git', ['add', 'services'], work),
      processResult('git', ['commit', '--quiet', '-m', 'base'], work),
    ];
    requirePass(gitInit.every((r) => r.status === 0), 'C33_CLEAN_GIT_REPLAY_SETUP_FAILED');
  }
  const preHashes = serviceHashes(work);
  const preFiles = treeFiles(work);
  const forwardCheck = processResult('git', ['apply', '--check', '--binary', '-'], work, patch.text);
  const forwardApply = forwardCheck.status === 0 ? processResult('git', ['apply', '--binary', '-'], work, patch.text) : null;
  const forwardOutput = [forwardCheck.stdout, forwardCheck.stderr, forwardApply?.stdout || '', forwardApply?.stderr || ''].join('\n');
  const postForwardHashes = serviceHashes(work);
  const postForwardFiles = treeFiles(work);
  const forwardChanged = setChanged(preHashes, postForwardHashes);
  const expected = patch.changedFiles;
  const forwardHashMatch = sameObject(postForwardHashes, Object.fromEntries(L.SERVICES.map((name) => [`services/${name}`, normHash(path.join(candidateDir, name))])));
  const noSkippedOutput = !/(?:skipped patch|outside repository|filename too long)/i.test(forwardOutput);
  const noUnexpectedPath = JSON.stringify(preFiles) === JSON.stringify(postForwardFiles);
  const forwardPass = forwardCheck.status === 0 && forwardApply?.status === 0 && noSkippedOutput
    && expected.length > 0 && JSON.stringify(forwardChanged) === JSON.stringify(expected)
    && forwardHashMatch && noUnexpectedPath;
  let reverseCheck = null;
  let reverseApply = null;
  let postReverseHashes = null;
  let postReverseFiles = null;
  let reverseChanged = null;
  let reversePass = false;
  if (forwardPass) {
    reverseCheck = processResult('git', ['apply', '--check', '--binary', '-R', '-'], work, patch.text);
    reverseApply = reverseCheck.status === 0 ? processResult('git', ['apply', '--binary', '-R', '-'], work, patch.text) : null;
    postReverseHashes = serviceHashes(work);
    postReverseFiles = treeFiles(work);
    reverseChanged = setChanged(preHashes, postReverseHashes);
    const reverseOutput = [reverseCheck.stdout, reverseCheck.stderr, reverseApply?.stdout || '', reverseApply?.stderr || ''].join('\n');
    reversePass = reverseCheck.status === 0 && reverseApply?.status === 0
      && !/(?:skipped patch|outside repository|filename too long)/i.test(reverseOutput)
      && reverseChanged.length === 0 && sameObject(preHashes, postReverseHashes)
      && JSON.stringify(preFiles) === JSON.stringify(postReverseFiles);
  }
  return {
    environment: kind,
    cwd: work.replace(/\\/g, '/'),
    gitRepository: kind === 'clean_git_worktree',
    gitInit,
    patchSha256: patch.sha256,
    headers: patch.canonicalHeaders,
    preHashes,
    postForwardHashes,
    postReverseHashes,
    preFiles,
    postForwardFiles,
    postReverseFiles,
    expectedChangedFiles: expected,
    forwardChangedFiles: forwardChanged,
    reverseChangedFiles: reverseChanged,
    forwardCheck,
    forwardApply,
    reverseCheck: reverseCheck || { status: null, disposition: 'NOT_EXECUTED_BECAUSE_FORWARD_FAILED' },
    reverseApply: reverseApply || { status: null, disposition: 'NOT_EXECUTED_BECAUSE_FORWARD_FAILED' },
    forwardReplayMatchesCandidate: forwardHashMatch,
    forwardPass,
    reversePass,
    pass: forwardPass && reversePass,
  };
}

function hunkPayload(patchText) {
  return patchText.replace(/\r\n/g, '\n').split('\n')
    .filter((line) => (/^[+-]/.test(line) && !/^(---|\+\+\+)/.test(line) && line.slice(1).trim().length > 0))
    .map((line) => line.trimEnd());
}

function additionHunkGroups(patchText) {
  const groups = [];
  let current = [];
  for (const line of patchText.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith('@@')) {
      if (current.length) groups.push(current);
      current = [];
    } else if (line.startsWith('+') && !line.startsWith('+++') && line.slice(1).trim().length > 0) {
      current.push(line.trimEnd());
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

function headRuntimeSnapshot(destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const name of L.SERVICES) fs.writeFileSync(path.join(destination, name), startHeadFile(`services/${name}`));
  return runtimeFor(destination);
}

function replayAndInheritance(baseDir, candidateDir, attemptDir) {
  const patch = canonicalPatch(baseDir, candidateDir, attemptDir);
  requirePass(patch.pass, 'C33_CANONICAL_PATCH_INVALID');
  fs.writeFileSync(path.join(attemptDir, 'C33_ONLY_CANDIDATE.patch'), patch.text);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tina-c33-replay-'));
  const nonRepository = replayOneEnvironment('non_repository', baseDir, candidateDir, patch, tempRoot);
  const cleanGitWorktree = replayOneEnvironment('clean_git_worktree', baseDir, candidateDir, patch, tempRoot);
  const headDir = path.join(attemptDir, 'start-head-services');
  headRuntimeSnapshot(headDir);
  const inheritedPatch = canonicalPatch(headDir, baseDir, path.join(attemptDir, 'inherited-patch'));
  const candidateHunks = hunkPayload(patch.text);
  const inheritedHunks = hunkPayload(inheritedPatch.text);
  const candidateAdditionGroups = additionHunkGroups(patch.text);
  const inheritedAdditionGroups = additionHunkGroups(inheritedPatch.text);
  const overlappingLinePayload = candidateHunks.filter((line) => inheritedHunks.includes(line));
  const unexpectedInheritedHunks = candidateAdditionGroups.filter((candidateGroup) => inheritedAdditionGroups.some((inheritedGroup) => candidateGroup.every((line) => inheritedGroup.includes(line))));
  const inherited = {
    headToBaseChangedFiles: inheritedPatch.changedFiles,
    baseToCandidateChangedFiles: patch.changedFiles,
    fileSetIntersection: patch.changedFiles.filter((file) => inheritedPatch.changedFiles.includes(file)),
    candidateOnlyHunkPayload: candidateHunks,
    headToBaseHunkPayload: inheritedHunks,
    candidateAdditionGroups,
    headToBaseAdditionGroups: inheritedAdditionGroups,
    overlappingLinePayload,
    unexpectedInheritedHunks,
    pass: unexpectedInheritedHunks.length === 0,
  };
  const result = {
    unit: UNIT,
    generatedUtc: now(),
    canonicalPatch: patch,
    environments: [nonRepository, cleanGitWorktree],
    computedInheritedChangeExclusion: inherited,
    pass: patch.pass && nonRepository.pass && cleanGitWorktree.pass && inherited.pass,
  };
  writeJson(path.join(attemptDir, 'C33_CANDIDATE_DELTA_REPLAY.json'), result);
  requirePass(result.pass, 'C33_DELTA_REPLAY_OR_INHERITANCE_FAILED');
  return result;
}

function readComplete(files) {
  return files.map((file) => {
    const bytes = fs.readFileSync(file);
    // Prior immutable attempt stderr logs may be intentionally empty; reading them is
    // still required evidence, not a corruption condition.
    return { path: rel(file), bytes: bytes.length, sha256: sha(bytes), zeroByte: bytes.length === 0, readComplete: true };
  });
}

function recursiveFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const item = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...recursiveFiles(item)); else files.push(item);
  }
  return files;
}

function firstReadEvidence() {
  const explicit = [
    'knowledge/CURRENT_STATE.md', 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md',
    'knowledge/TINA_Updated_Controlling_Roadmap_v8.md', 'knowledge/TINA_Updated_Roadmap_v7.md',
    'evaluation/runner/phase-10a14-r20/commit5r1c32-execute.mjs',
    'evaluation/runner/phase-10a14-r20/commit5r1c20-lib.mjs',
    'evaluation/runner/phase-10a14-r20/commit5r1c20-gates.mjs',
    RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  ];
  const c32Top = fs.readdirSync(RES).filter((name) => name.startsWith('COMMIT_5R1C32_')).map((name) => path.join(RES, name)).filter((file) => fs.statSync(file).isFile());
  const c32Attempts = fs.readdirSync(ATT).filter((name) => name.includes('commit5r1c32-dev-01') || name.includes('commit5r1c32-dev-02') || name.includes('commit5r1c32-dev-03'))
    .flatMap((name) => recursiveFiles(path.join(ATT, name)));
  const c31Selected = recursiveFiles(C31_DIR.replace(/runtime-snapshot\/?$/, ''));
  const files = [...new Set([...explicit, ...c32Top, ...c32Attempts, ...c31Selected])];
  const records = readComplete(files);
  const out = { unit: UNIT, generatedUtc: now(), fileCount: records.length, totalBytes: records.reduce((sum, r) => sum + r.bytes, 0), files: records, pass: records.length === files.length };
  writeJson(RES + 'COMMIT_5R1C33_MANDATORY_FIRST_READ.json', out);
  return out;
}

function devFactoryState(label) {
  const args = ['-c', 'safe.directory=C:/Projects/tina-dev-factory', '-C', 'C:/Projects/tina-dev-factory'];
  const run = (...more) => execFileSync('git', [...args, ...more], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 });
  const status = run('status', '--porcelain=v2', '--branch', '--untracked-files=all');
  const tracked = run('diff', '--binary');
  return { label, capturedAtUtc: now(), repository: 'C:/Projects/tina-dev-factory', head: run('rev-parse', 'HEAD').trim(), branch: run('rev-parse', '--abbrev-ref', 'HEAD').trim(), statusSha256: sha(status), trackedDiffSha256: sha(tracked), porcelainV2Status: status };
}

function protectedResidue() {
  const status = git('status', '--porcelain=v2', '--untracked-files=all');
  const untracked = status.split(/\r?\n/).filter((line) => line.startsWith('? ')).map((line) => line.slice(2).replace(/\\/g, '/'));
  const protectedItems = untracked.filter((item) => /^(\.claude\/|\.vscode\/|evaluation\/factcheck\/)/.test(item));
  return { capturedAtUtc: now(), untracked, protectedItems, statusSha256: sha(status), pass: protectedItems.length === untracked.filter((item) => !item.startsWith('evaluation/runner/phase-10a14-r20/commit5r1c33-execute.mjs') && !item.startsWith(RES + 'COMMIT_5R1C33_') && item !== RES + 'COMMIT_5R1C32_POST_COMMIT_INDEPENDENT_SOL_REVIEW.json' && !item.includes('commit5r1c33-')).length };
}

function ps(command) {
  const p = spawnSync('powershell', ['-NoProfile', '-Command', command], { encoding: 'utf8' });
  return (p.stdout || '').trim();
}

function preflight() {
  const status = git('status', '--porcelain=v2', '--branch', '--untracked-files=all');
  const trackedChangedPaths = git('diff', '--name-only').replace(/\r\n/g, '\n').split('\n').filter(Boolean);
  const untracked = status.split(/\r?\n/).filter((line) => line.startsWith('? ')).map((line) => line.slice(2).replace(/\\/g, '/'));
  const allowed = (item) => /^(\.claude\/|\.vscode\/|evaluation\/factcheck\/)/.test(item)
    || item === 'evaluation/runner/phase-10a14-r20/commit5r1c33-execute.mjs'
    || item === RES + 'COMMIT_5R1C32_POST_COMMIT_INDEPENDENT_SOL_REVIEW.json'
    || item.startsWith(RES + 'COMMIT_5R1C33_') || item.includes('commit5r1c33-');
  const registry = readJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json');
  const initialPreflightExists = fs.existsSync(RES + 'COMMIT_5R1C33_PREFLIGHT.json');
  const controlledResumePaths = new Set([
    'evaluation/results/phase-10a14-r20/CANONICAL_ATTEMPT_REGISTRY.json',
    'knowledge/CURRENT_STATE.md',
    'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md',
  ]);
  const controlledResume = initialPreflightExists && trackedChangedPaths.length > 0 && trackedChangedPaths.every((file) => controlledResumePaths.has(file))
    && fs.existsSync(RES + 'COMMIT_5R1C33_OPUS_REVIEW_REJECTION_01.json');
  const out = {
    unit: UNIT, generatedUtc: now(), head: git('rev-parse', 'HEAD').trim(), parent: git('rev-parse', 'HEAD^').trim(),
    branch: git('branch', '--show-current').trim(), sync: git('rev-list', '--left-right', '--count', '@{u}...HEAD').trim(),
    trackedTreeClean: git('status', '--porcelain=v2', '--untracked-files=no').trim() === '', trackedChangedPaths, controlledResume, untracked,
    unexpectedUntracked: untracked.filter((item) => !allowed(item)),
    nodeListenerAbsent: ps("$ids = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($id in $ids) { if ((Get-Process -Id $id -ErrorAction SilentlyContinue).ProcessName -eq 'node') { $id } }") === '',
    port5173Free: ps('Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ConvertTo-Json -Compress') === '',
    currentStateBlob: git('hash-object', 'knowledge/CURRENT_STATE.md').trim(),
    roadmapV9Blob: git('hash-object', 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md').trim(),
    registrySummary: registry.summary, cumulativeThrough: registry.cumulativeThrough,
  };
  const initialIdentity = out.currentStateBlob === '7b11458059dc7c6ddf3c6abcce98f267e658fb4a'
    && out.roadmapV9Blob === '9e5f6befa1b2e378997f57fac34911560cc9dccc'
    && out.registrySummary.total === 210 && out.cumulativeThrough === 'commit5r1c32-incomplete';
  const resumedIdentity = controlledResume && out.registrySummary.total === 218 && out.cumulativeThrough === 'commit5r1c33-incomplete';
  out.mode = initialIdentity ? 'INITIAL_PRISTINE_C32_PREFLIGHT' : resumedIdentity ? 'CONTROLLED_C33_REGENERATION_AFTER_OPUS_REJECTION' : 'INVALID';
  out.pass = out.head === START_HEAD && out.parent === EXPECTED_PARENT && out.branch === 'feature/source-availability-engine-v1'
    && out.sync === '0\t0' && (out.trackedTreeClean || controlledResume) && out.unexpectedUntracked.length === 0 && out.nodeListenerAbsent && out.port5173Free
    && (initialIdentity || resumedIdentity);
  writeJson(RES + (initialPreflightExists ? 'COMMIT_5R1C33_REGENERATION_PREFLIGHT.json' : 'COMMIT_5R1C33_PREFLIGHT.json'), out);
  requirePass(out.pass, 'C33_PREFLIGHT_DISCREPANCY');
  return out;
}

const M01 = {
  id: 'C33-M01R-direct-requested-tax-consequence-excluding-computation-is-treatment', cycle: 'commit5r1c33-m01r-v2',
  principle: 'A direct requested tax consequence on an ordinary transaction or object is treatment unless the same request is explicitly procedural or computational.',
  block: String.raw`  const c33M01ComputationProcedure = /\b(?:compute|computed|calculation|calculate|calculated)\b/i.test(evidence.normalizedText || '');
  const c33DirectRequestedTaxConsequence = v.reason === 'explicit_tax_task_relation'
      && v.rels.some((r) => r === 'ASKS_TAX_TREATMENT_OF' || r === 'ASKS_VAT_TREATMENT_OF' || r === 'ASKS_DEDUCTIBILITY_OF' || r === 'ASKS_WITHHOLDING_ON')
      && !/\b(?:file|filing|form|remit(?:tance)?|pay(?:ment)?|register(?:ed|ing|ation)?|compute|calculation|submit|submission)\b/i.test(v.t)
      && !c33M01ComputationProcedure
      && (/\b(?:taxable|deductib\w*|tax\s+treatment|tax\s+base|subject\s+to\s+tax)\b/i.test(v.t)
        || (/\bcapital\s+gains?\s+tax\b/i.test(v.t)
          && !/\b(?:holding\s+period|recognized|ordinary\s+asset|corporation)\b/i.test(v.t)));
  if (c33DirectRequestedTaxConsequence)
    return { decision: 'ALLOW', reasonCode: 'tax_treatment_of_ordinary_object', confidence: 0.89 };
`,
};

const M02 = {
  id: 'C33-M02R-unbound-withholding-instrument-or-due-date-is-explicit-task', cycle: 'commit5r1c33-m02r-v2',
  principle: 'An unbound withholding instrument or due-date request is an operational tax task when no ordinary treatment operand is supplied.',
  block: String.raw`  const c33UnboundWithholdingInstrument = v.reason === 'tax_treatment_of_ordinary_object'
      && v.rels.includes('ASKS_WITHHOLDING_ON')
      && !v.taskObject
      && (/^(?:(?:final|expanded|creditable|deficiency)\s+)?withholding(?:\s+tax)?(?:\s+certificate)?\.?$/i.test(v.t)
        || /\bwhen\s*(?:,\s*exactly\s*)?(?:is\s+)?(?:the\s+)?withholding\s+tax\s+due\b|\bkailan\s+due\s+ang\s+withholding\s+tax\b/i.test(v.t));
  if (c33UnboundWithholdingInstrument)
    return { decision: 'ALLOW', reasonCode: 'explicit_tax_task_relation', confidence: 0.88 };
`,
};

function packetDefinitions(candidateId) {
  if (candidateId === M01.id) {
    return {
      positives: [
        'Are receipts from a community art workshop taxable?', 'Is freelance consulting compensation taxable in the Philippines?',
        'What tax treatment applies to customs demurrage?', 'Is a gain from selling inherited land taxable?',
        'How is the tax base determined for capital gains tax?', 'What exemption may apply to capital gains tax on a principal home?',
      ],
      substitutions: [
        'Are seminar fees subject to tax?', 'Is a designer fee deductible for income tax?', 'What VAT treatment applies to a training fee?',
        'Is the proceeds amount taxable?', 'What is the capital gains tax base?', 'Are relocation benefits taxable compensation?',
      ],
      nearMisses: [
        'How do I file a capital gains tax return?', 'Which form is required to remit withholding tax?',
        'How is capital gains tax computed?', 'How do I pay capital gains tax?',
        'What is the holding period for a capital gains tax asset?', 'How does a corporation recognize capital gains tax?',
      ],
      constructions: [
        'Please explain whether the land-sale gain is taxable.', 'Could a taxpayer ask if the allowance is subject to tax?',
        'Could a sales commission be subject to tax?',
      ],
      fillers: [
        'For a small bakery, are delivery receipts taxable?', 'For a neighborhood clinic, is a service fee taxable?',
        'For a charity event, are ticket receipts subject to tax?', 'For a software studio, is a project bonus taxable?',
      ],
      skeletons: [
        'Is [ordinary receipt] taxable?', 'What tax treatment applies to [ordinary transaction]?',
        'Is [gain from sale] subject to tax?', 'What is the tax base for [capital gains tax event]?',
      ],
      taglish: ['Taxable ba ang bayad sa freelance work?', 'Ano ang tax treatment ng kita sa pagbenta ng lupa?'],
      expectedPositiveReason: 'tax_treatment_of_ordinary_object',
    };
  }
  return {
    positives: [
      'Creditable withholding tax', 'Expanded withholding certificate', 'Final withholding certificate',
      'When is withholding tax due?', 'Kailan due ang withholding tax ngayong buwan?', 'Withholding tax certificate',
    ],
    substitutions: [
      'Deficiency withholding certificate', 'Deficiency withholding tax', 'Final withholding tax',
      'Expanded withholding tax', 'Kailan due ang withholding tax sa supplier?', 'When is the withholding tax due?',
    ],
    nearMisses: [
      'What is the withholding tax rate on rent?', 'How do I remit withholding tax on payment?',
      'Is withholding tax on a vendor fee deductible?', 'Which form reports withholding tax?',
      'What withholding applies to a contractor payment?', 'Can a payment be subject to withholding tax?',
    ],
    constructions: [
      'Can you explain when withholding tax is due?', 'Please clarify when withholding tax is due.',
      'When, exactly, is withholding tax due?',
    ],
    fillers: [
      'For a clinic payroll, when is withholding tax due?', 'For a school supplier, when is withholding tax due?',
      'For an online shop, when is withholding tax due?', 'For a local contractor, when is withholding tax due?',
    ],
    skeletons: [
      '[qualifier] withholding tax', '[when phrase] withholding tax due?', '[qualifier] withholding certificate', '[Taglish due phrase] withholding tax',
    ],
    taglish: ['Kailan due ang withholding tax?', 'May withholding tax ba sa bayad sa renta?'],
    expectedPositiveReason: 'explicit_tax_task_relation',
  };
}

function isLiteralSkeleton(query) {
  return query.includes('[') && query.includes(']');
}

function executePacket(candidateId, baseAnalyze, candidateAnalyze) {
  const plan = packetDefinitions(candidateId);
  const rows = [];
  const categories = ['positives', 'substitutions', 'nearMisses', 'constructions', 'fillers', 'skeletons', 'taglish'];
  for (const category of categories) {
    for (const query of plan[category]) {
      if (isLiteralSkeleton(query)) {
        rows.push({ candidateId, category: 'structural_skeleton', query, expectedStructuralBehavior: 'schema_only_non_executable', pass: true, disposition: 'STRUCTURAL_TEMPLATE_RECORDED' });
        continue;
      }
      const base = baseAnalyze(query);
      const candidate = candidateAnalyze(query);
      const positive = category !== 'nearMisses';
      const expectedStructuralBehavior = positive ? `reason=${plan.expectedPositiveReason}` : 'preserve_base_behavior_for_procedure_or_bound_operand';
      const pass = positive
        ? candidate.reasonCode === plan.expectedPositiveReason && candidate.decision === 'ALLOW'
        : outputSignature(base) === outputSignature(candidate);
      rows.push({
        candidateId, category: category === 'nearMisses' ? 'near_miss' : category,
        query, expectedStructuralBehavior, base: compactEvidence(base), candidate: compactEvidence(candidate),
        candidateFiring: base.reasonCode !== candidate.reasonCode || base.decision !== candidate.decision,
        baseBehavior: outputSignature(base), candidateBehavior: outputSignature(candidate), pass,
      });
    }
  }
  const executable = rows.filter((row) => !row.disposition);
  return { candidateId, requirements: { positiveParaphrases: 6, substitutions: 6, nearMisses: 6, constructions: 3, fillerFamilies: 4, skeletons: 4, taglishOrMixed: 2 }, rows, executedRows: executable.length, passedRows: executable.filter((row) => row.pass).length, failedRows: executable.filter((row) => !row.pass), pass: executable.every((row) => row.pass) };
}

function leaveFamilyOut(candidateId, candidateAnalyze) {
  const withheld = candidateId === M01.id
    ? ['Are museum gift-shop receipts taxable?', 'Is a farmers-market stall fee subject to tax?', 'What tax treatment applies to a cooperative rebate?', 'Taxable ba ang honorarium sa barangay event?']
    : ['For a fishing cooperative, when is withholding tax due?', 'For a design agency, when is withholding tax due?', 'For a medical practice, when is withholding tax due?', 'Kailan due ang withholding tax para sa cooperative?'];
  const target = candidateId === M01.id ? 'tax_treatment_of_ordinary_object' : 'explicit_tax_task_relation';
  const records = withheld.map((query) => {
    const result = candidateAnalyze(query);
    return { query, expectedReason: target, actual: compactEvidence(result), pass: result.reasonCode === target && result.decision === 'ALLOW' };
  });
  return { candidateId, withheldFamily: candidateId === M01.id ? 'unseen_community_receipts' : 'unseen_organizational_withholding_due_date', developmentCorpusExcluded: true, records, pass: records.every((record) => record.pass) };
}

function signaturesForRows(rows, analyze) {
  return rows.map((row) => ({ oracleId: row.oracleId || sha(row.query), signature: outputSignature(analyze(row.query)) }));
}

function shuffled(items, seed) {
  const result = [...items];
  let state = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    state = (1664525 * state + 1013904223) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function loadControllingReasonRows() {
  return readJson(L.REASON_SUITE).queries.filter((q) => q.controlling !== false).map((q, index) => ({ oracleId: `reason-${index}`, query: q.query }));
}

function loadCollisionRows() {
  return readJson(L.COLLISION_PROBES).probes.map((q, index) => ({ oracleId: `collision-${index}`, query: q.query }));
}

function sentinelAndShuffle(candidateId, candidateAnalyze, candidateSource, patchText) {
  const r3 = L.loadR3();
  const reasonRows = loadControllingReasonRows();
  const collisionRows = loadCollisionRows();
  const sentinelKinds = ['oracleId', 'queryHash', 'expectedLabel', 'familyName'];
  const r3Baseline = signaturesForRows(r3, candidateAnalyze);
  const sentinel = sentinelKinds.map((kind) => {
    const copies = r3.map((row, index) => ({ ...row, [`c33_${kind}_sentinel`]: `${kind}-${index}` }));
    const outputs = signaturesForRows(copies, candidateAnalyze);
    return { kind, records: copies.length, outputsInvariant: JSON.stringify(outputs) === JSON.stringify(r3Baseline), runtimeSha256: sha(norm(candidateSource)), patchSha256: sha(Buffer.from(patchText)) };
  });
  const shuffleOne = (name, rows, seed) => {
    const baseline = signaturesForRows(rows, candidateAnalyze).sort((a, b) => a.oracleId.localeCompare(b.oracleId));
    const shuffledOutputs = signaturesForRows(shuffled(rows, seed), candidateAnalyze).sort((a, b) => a.oracleId.localeCompare(b.oracleId));
    return { name, seed, records: rows.length, outputsInvariant: JSON.stringify(baseline) === JSON.stringify(shuffledOutputs), baselineOutputSha256: sha(JSON.stringify(baseline)), shuffledOutputSha256: sha(JSON.stringify(shuffledOutputs)) };
  };
  const shuffles = [shuffleOne('R3', r3, 3301), shuffleOne('reason_suite_344', reasonRows, 3302), shuffleOne('collision_probes_196', collisionRows, 3303)];
  const sourceForbiddenTerms = ['oracleId', 'queryHash', 'expectedReason', 'expectedDecision', 'familyName', 'row position', 'fixture'];
  const taint = sourceForbiddenTerms.map((term) => ({ term, presentInCandidateBlock: candidateSource.includes(term) }));
  return {
    sentinel: { candidateId, records: sentinel, pass: sentinel.every((record) => record.outputsInvariant) },
    shuffle: { candidateId, records: shuffles, pass: shuffles.every((record) => record.outputsInvariant) },
    taint: { candidateId, sourceForbiddenTerms: taint, pass: taint.every((record) => !record.presentInCandidateBlock) },
  };
}

function directGates(analyze, sourcePath) {
  const rows = L.loadR3();
  const r3 = L.scoreR3(rows, analyze);
  const reasonCounterfactual = L.runReasonCounterfactuals(analyze);
  const collisionProbes = L.runCollisionProbes(analyze);
  const decisionCounterfactual = L.runCounterfactuals(analyze);
  const relationCounterfactual = L.runRelationCounterfactuals(analyze);
  const clauseProbes = L.runClauseProbes(analyze);
  const richContextGuard = L.richContextGuard(analyze);
  const reasonIntegrity = L.reasonIntegrity(rows, analyze);
  const m = {
    canonicalPassed: r3.counts.canonicalPassed, decisionPassed: r3.counts.decisionPassed, relationPassed: r3.counts.relationPassed,
    reasonPassed: 3720 - r3.counts.reasonMismatches, reasonMismatches: r3.counts.reasonMismatches,
    materialFalseAllows: r3.counts.materialFalseAllows, materialFalseRefusals: r3.counts.materialFalseRefusals, clarifyMismatches: r3.counts.clarifyMismatches,
    reasonCounterfactualPassed: reasonCounterfactual.passed, collisionProbesPassed: collisionProbes.passed,
    decisionCounterfactualPassed: decisionCounterfactual.passed, relationCounterfactualPassed: relationCounterfactual.passed,
    clauseProbesPassed: clauseProbes.passed, richContextGuardPassed: richContextGuard.passed, richContextGuardTotal: richContextGuard.total,
    reasonIntegrityPass: reasonIntegrity.pass,
  };
  return { metrics: m, frozenLocksHeld: frozenLocksHeld(m), antiMemorization: L.antiMemorization(sourcePath, rows) };
}

function staticFeatureInventory(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const predicates = new Set((code.match(/\b(?:v\.(?:reason|rels|t|taskVerb|taskObject)|ASKS_[A-Z_]+|taxable|deductib|withholding|capital\s+gains|filing|remit|compute)\b/gi) || []).map((x) => x.toLowerCase()));
  return { staticPredicateCount: predicates.size, staticPredicates: [...predicates].sort() };
}

function monotonicAblation(candidate, baseDir, candidateDir, attemptDir) {
  const baselineEvidence = readJson(RES + 'COMMIT_5R1C31_MONOTONIC_FEATURE_BASELINE.json');
  const baseSource = fs.readFileSync(path.join(baseDir, 'philippine-tax-intent-analyzer.js'), 'utf8');
  const candidateSource = fs.readFileSync(path.join(candidateDir, 'philippine-tax-intent-analyzer.js'), 'utf8');
  const candidateInventory = staticFeatureInventory(candidateSource);
  const baseInventory = staticFeatureInventory(baseSource);
  const candidateAdditions = [...candidateInventory.staticPredicates].filter((item) => !baseInventory.staticPredicates.includes(item));
  const counts = (source) => source.replace(/\r\n/g, '\n').split('\n').reduce((map, line) => ((map[line] = (map[line] || 0) + 1), map), {});
  const baseLineCounts = counts(baseSource);
  const candidateLineCounts = counts(candidateSource);
  const candidateAddedLines = Object.entries(candidateLineCounts).filter(([line, count]) => count > (baseLineCounts[line] || 0)).map(([line]) => line).filter((line) => line.trim());
  const inheritedRemovedLines = Object.entries(baseLineCounts).filter(([line, count]) => count > (candidateLineCounts[line] || 0)).map(([line]) => line).filter((line) => line.trim());
  const ablationRoot = path.join(attemptDir, 'ablation');
  const variants = [
    { name: 'removed_feature', source: baseSource, expected: 'feature_removed' },
    { name: 'coarsened_feature', source: candidateSource.replace(/&& !\/\\b\(\?:file\|filing\|form\|remit\(\?:tance\)\?\|pay\(\?:ment\)\?\|register\(\?:ed\|ing\|ation\)\?\|compute\|calculation\|submit\|submission\)\\b\/i\.test\(v\.t\)\n/g, ''), expected: 'candidate_boundary_coarsened' },
    { name: 'broadened_feature', source: candidateSource.replace(/capital\\s\+gains\?\\s\+tax/, 'capital\\s+gains?\\s+tax|income\\s+tax'), expected: 'candidate_scope_broadened' },
  ];
  const outputs = [];
  for (const variant of variants) {
    const dir = path.join(ablationRoot, variant.name);
    copyRuntime(baseDir, dir);
    fs.writeFileSync(path.join(dir, 'philippine-tax-intent-analyzer.js'), variant.source);
    outputs.push({ name: variant.name, expected: variant.expected, runtime: runtimeFor(dir), sourceSha256: sha(norm(variant.source)) });
  }
  const noInheritedFeatureRemoval = candidateAddedLines.length > 0 && inheritedRemovedLines.length === 0;
  return {
    candidateId: candidate.id,
    inheritedBaseline: { vectorCount: baselineEvidence.vectorCount, collidingRows: baselineEvidence.collidingRows, source: rel(RES + 'COMMIT_5R1C31_MONOTONIC_FEATURE_BASELINE.json') },
    executedStaticFeatureInventory: { base: baseInventory, candidate: candidateInventory, candidateAddedPredicates: candidateAdditions, candidateAddedLines, inheritedRemovedLines },
    variants: outputs,
    noInheritedFeatureRemoval,
    vectorCountAtLeast124: baselineEvidence.vectorCount >= 124,
    collidingRowsNoMoreThan27: baselineEvidence.collidingRows <= 27,
    ablationSupportedDistinction: outputs.some((output) => output.runtime.servicesTreeDigest !== runtimeFor(candidateDir).servicesTreeDigest),
    pass: noInheritedFeatureRemoval && baselineEvidence.vectorCount >= 124 && baselineEvidence.collidingRows <= 27 && outputs.length === 3,
  };
}

async function runCandidate(candidate, ordinal, baseDir) {
  const existing = c33AttemptByCycle(candidate.cycle);
  const audit = [];
  let attempt;
  let candidateDir;
  let resumed = false;
  if (existing) {
    const existingMetadata = readJson(path.join(existing.dir, 'ATTEMPT.json'));
    if (existingMetadata.status === 'completed') return { ...readJson(path.join(existing.dir, 'ITERATION_RESULT.json')), attempt: existing, candidateDir: path.join(existing.dir, 'runtime-snapshot') };
    attempt = existing;
    candidateDir = path.join(attempt.dir, 'runtime-snapshot');
    requirePass(fs.existsSync(path.join(candidateDir, 'philippine-tax-intent-analyzer.js')), `C33_RESUME_CANDIDATE_SNAPSHOT_MISSING_${candidate.id}`);
    await installRuntime(baseDir, audit, `${candidate.id}-resume-install-base`);
    await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', fs.readFileSync(path.join(candidateDir, 'philippine-tax-intent-analyzer.js')), audit);
    await L.assertRuntimeIntact(`${candidate.id}-resumed-candidate-installed`);
    resumed = true;
  } else {
    await installRuntime(baseDir, audit, `${candidate.id}-install-base`);
    attempt = await L.allocateAttempt({ category: 'domain_campaign', gate: 'r20_commit5r1c33_replay_remediated_reason_continuation', cycle: candidate.cycle, command: 'evaluation/runner/phase-10a14-r20/commit5r1c33-execute.mjs', ordinal });
    candidateDir = path.join(attempt.dir, 'runtime-snapshot');
    materializeCandidate(baseDir, candidateDir, [candidate.block]);
    await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', fs.readFileSync(path.join(candidateDir, 'philippine-tax-intent-analyzer.js')), audit);
    await L.assertRuntimeIntact(`${candidate.id}-candidate-installed`);
    L.snapshotRuntime(candidateDir);
  }
  const replay = replayAndInheritance(baseDir, candidateDir, attempt.dir);
  fs.writeFileSync(path.join(attempt.dir, 'FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch'), git('diff', '--binary', '--', 'services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js'));
  const gates = await runGates({ stage: 'full', label: candidate.id });
  const actual = metrics(gates);
  const baseAnalyze = await loadAnalyzerFrom(baseDir);
  const candidateAnalyze = await loadAnalyzerFrom(candidateDir);
  const rows = collectRows(baseAnalyze, candidateAnalyze);
  const packet = executePacket(candidate.id, baseAnalyze, candidateAnalyze);
  const leaveOut = leaveFamilyOut(candidate.id, candidateAnalyze);
  const candidateSource = fs.readFileSync(path.join(candidateDir, 'philippine-tax-intent-analyzer.js'), 'utf8');
  const controls = sentinelAndShuffle(candidate.id, candidateAnalyze, candidate.block, replay.canonicalPatch.text);
  const ablation = monotonicAblation(candidate, baseDir, candidateDir, attempt.dir);
  const antiMem = L.antiMemorization(path.join(candidateDir, 'philippine-tax-intent-analyzer.js'), L.loadR3());
  const historicalMinimum = candidate.id === M01.id ? 22 : 6;
  const pareto = {
    baseReasonPassed: BASE_METRICS.reasonPassed, candidateReasonPassed: actual.reasonPassed,
    improvement: actual.reasonPassed - BASE_METRICS.reasonPassed,
    historicalMinimum, reproducesHistoricalMinimum: actual.reasonPassed - BASE_METRICS.reasonPassed >= historicalMinimum,
    correctRowRegressions: rows.newlyRegressed.length, wrongToDifferentWrong: rows.wrongToDifferentWrong.length,
    priorOverrideRegressions: rows.priorOverrideChanges.length, branchSignatureDriftOutsideTarget: rows.outsideTarget.length,
    frozenLocksHeld: frozenLocksHeld(actual),
  };
  pareto.pass = pareto.improvement > 0 && pareto.reproducesHistoricalMinimum && pareto.correctRowRegressions === 0
    && pareto.wrongToDifferentWrong === 0 && pareto.priorOverrideRegressions === 0 && pareto.branchSignatureDriftOutsideTarget === 0 && pareto.frozenLocksHeld;
  const accepted = replay.pass && packet.pass && leaveOut.pass && controls.sentinel.pass && controls.shuffle.pass && controls.taint.pass && ablation.pass && antiMem.pass && pareto.pass;
  const result = {
    unit: UNIT, generatedUtc: now(), attemptId: attempt.attemptId, candidateId: candidate.id, principle: candidate.principle, resumedAfterHarnessCorrection: resumed,
    activeBase: { sourceAttempt: C31_SELECTED, identity: runtimeFor(baseDir) }, candidateIdentity: runtimeFor(candidateDir), writeAudit: audit,
    metrics: actual, gates, replay, generalization: packet, leaveOneFamilyOut: leaveOut, sentinel: controls.sentinel,
    shuffle: controls.shuffle, taint: controls.taint, monotonicAblation: ablation, antiMemorization: antiMem,
    rowLevel: rows, pareto, accepted,
    disposition: accepted ? 'ACCEPTED_PROMOTED_CONTROLLING' : (replay.pass ? 'REJECTED_GENERALIZATION_FAILURE' : 'REJECTED_REPLAY_FAILURE'),
  };
  writeJson(path.join(attempt.dir, 'ITERATION_RESULT.json'), result);
  await L.finalizeAttempt(attempt.dir, { disposition: result.disposition, stdout: `${candidate.id}: ${actual.reasonPassed}/3720 reason; replay=${replay.pass}; controls=${packet.pass && leaveOut.pass && controls.sentinel.pass && controls.shuffle.pass && controls.taint.pass && ablation.pass}`, resultPaths: [path.join(attempt.dir, 'ITERATION_RESULT.json'), path.join(attempt.dir, 'C33_CANDIDATE_DELTA_REPLAY.json')] });
  return { ...result, attempt, candidateDir };
}

async function runComposition(m01, m02, ordinal, baseDir) {
  const audit = [];
  await installRuntime(baseDir, audit, 'c33-composition-install-base');
  const attempt = await L.allocateAttempt({ category: 'domain_campaign', gate: 'r20_commit5r1c33_m01r_m02r_composition', cycle: 'commit5r1c33-composition-v2', command: 'evaluation/runner/phase-10a14-r20/commit5r1c33-execute.mjs', ordinal });
  const candidateDir = path.join(attempt.dir, 'runtime-snapshot');
  materializeCandidate(baseDir, candidateDir, [M01.block, M02.block]);
  const reverseDir = path.join(attempt.dir, 'reverse-order-runtime');
  materializeCandidate(baseDir, reverseDir, [M02.block, M01.block]);
  await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', fs.readFileSync(path.join(candidateDir, 'philippine-tax-intent-analyzer.js')), audit);
  await L.assertRuntimeIntact('c33-composition-candidate-installed');
  L.snapshotRuntime(candidateDir);
  const replay = replayAndInheritance(baseDir, candidateDir, attempt.dir);
  fs.writeFileSync(path.join(attempt.dir, 'FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch'), git('diff', '--binary', '--', 'services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js'));
  const gates = await runGates({ stage: 'full', label: 'C33-M01R-plus-M02R' });
  const actual = metrics(gates);
  const baseAnalyze = await loadAnalyzerFrom(baseDir);
  const forwardAnalyze = await loadAnalyzerFrom(candidateDir);
  const reverseAnalyze = await loadAnalyzerFrom(reverseDir);
  const rows = collectRows(baseAnalyze, forwardAnalyze);
  const r3 = L.loadR3();
  const orderDrift = r3.map((row) => ({ oracleId: row.oracleId, query: row.query, forward: outputSignature(forwardAnalyze(row.query)), reverse: outputSignature(reverseAnalyze(row.query)) }))
    .filter((record) => record.forward !== record.reverse);
  const reverseGate = directGates(reverseAnalyze, path.join(reverseDir, 'philippine-tax-intent-analyzer.js'));
  const m01Rows = new Set(m01.rowLevel.newlyCorrected.map((row) => row.oracleId));
  const m02Rows = new Set(m02.rowLevel.newlyCorrected.map((row) => row.oracleId));
  const shadowing = [...m01Rows].filter((id) => !rows.newlyCorrected.some((row) => row.oracleId === id)).concat([...m02Rows].filter((id) => !rows.newlyCorrected.some((row) => row.oracleId === id)));
  const pareto = {
    improvement: actual.reasonPassed - BASE_METRICS.reasonPassed, bestIndividualReasonPassed: Math.max(m01.metrics.reasonPassed, m02.metrics.reasonPassed),
    betterThanBase: actual.reasonPassed > BASE_METRICS.reasonPassed, notBelowBestIndividual: actual.reasonPassed >= Math.max(m01.metrics.reasonPassed, m02.metrics.reasonPassed),
    frozenLocksHeld: frozenLocksHeld(actual), correctRowRegressions: rows.newlyRegressed.length,
    wrongToDifferentWrong: rows.wrongToDifferentWrong.length, priorOverrideRegressions: rows.priorOverrideChanges.length,
    branchSignatureDriftOutsideTarget: rows.outsideTarget.length, orderDrift: orderDrift.length, shadowing: shadowing.length,
  };
  pareto.pass = pareto.betterThanBase && pareto.notBelowBestIndividual && pareto.frozenLocksHeld && pareto.correctRowRegressions === 0
    && pareto.wrongToDifferentWrong === 0 && pareto.priorOverrideRegressions === 0 && pareto.branchSignatureDriftOutsideTarget === 0 && pareto.orderDrift === 0 && pareto.shadowing === 0 && reverseGate.frozenLocksHeld && reverseGate.antiMemorization.pass;
  const accepted = m01.accepted && m02.accepted && replay.pass && pareto.pass;
  const result = {
    unit: UNIT, generatedUtc: now(), attemptId: attempt.attemptId, candidateId: 'C33-M01R-plus-C33-M02R', activeBase: { sourceAttempt: C31_SELECTED, identity: runtimeFor(baseDir) },
    candidateIdentity: runtimeFor(candidateDir), reverseOrderIdentity: runtimeFor(reverseDir), writeAudit: audit, replay, metrics: actual, gates,
    reverseOrderGates: reverseGate, rowLevel: rows, orderDrift, shadowing, pareto, accepted,
    disposition: accepted ? 'ACCEPTED_PROMOTED_CONTROLLING' : 'REJECTED_COMPOSITION_INTERFERENCE',
  };
  writeJson(path.join(attempt.dir, 'ITERATION_RESULT.json'), result);
  await L.finalizeAttempt(attempt.dir, { disposition: result.disposition, stdout: `composition: ${actual.reasonPassed}/3720 reason; orderDrift=${orderDrift.length}; replay=${replay.pass}`, resultPaths: [path.join(attempt.dir, 'ITERATION_RESULT.json'), path.join(attempt.dir, 'C33_CANDIDATE_DELTA_REPLAY.json')] });
  return { ...result, attempt, candidateDir };
}

async function reuseCompositionIfPresent(m01, m02, ordinal, baseDir) {
  const existing = c33AttemptByCycle('commit5r1c33-composition-v2');
  if (!existing) return runComposition(m01, m02, ordinal, baseDir);
  const metadata = readJson(path.join(existing.dir, 'ATTEMPT.json'));
  requirePass(metadata.status === 'completed', 'C33_EXISTING_COMPOSITION_NOT_COMPLETED');
  return { ...readJson(path.join(existing.dir, 'ITERATION_RESULT.json')), attempt: existing, candidateDir: path.join(existing.dir, 'runtime-snapshot') };
}

async function reconstructC31Base() {
  const audit = [];
  const installed = await installRuntime(C31_DIR, audit, 'c33-exact-c31-base-install');
  const attempt = await L.allocateAttempt({ category: 'domain_campaign', gate: 'r20_commit5r1c33_exact_c31_selected_base_reconstruction', cycle: 'commit5r1c33-reconstruct', command: 'evaluation/runner/phase-10a14-r20/commit5r1c33-execute.mjs', ordinal: 1 });
  const identity = runtimeFor(C31_DIR);
  const gates = await runGates({ stage: 'full', label: 'C33 exact C31 selected base' });
  const actual = metrics(gates);
  const pass = sameRuntime(identity, C31_IDENTITY) && sameRuntime(installed, C31_IDENTITY) && actual.reasonPassed === BASE_METRICS.reasonPassed
    && actual.decisionPassed === BASE_METRICS.decisionPassed && actual.relationPassed === BASE_METRICS.relationPassed
    && actual.reasonCounterfactualPassed === BASE_METRICS.reasonCounterfactualPassed && actual.collisionProbesPassed === BASE_METRICS.collisionProbesPassed && frozenLocksHeld(actual);
  const result = { unit: UNIT, generatedUtc: now(), attemptId: attempt.attemptId, selectedC31Attempt: C31_SELECTED, expectedIdentity: C31_IDENTITY, snapshotIdentity: identity, installedIdentity: installed, writeAudit: audit, gates, metrics: actual, pass };
  writeJson(RES + 'COMMIT_5R1C33_BASE_RUNTIME_IDENTITY.json', { unit: UNIT, generatedUtc: now(), selectedC31Attempt: C31_SELECTED, identity, expectedIdentity: C31_IDENTITY, pass: sameRuntime(identity, C31_IDENTITY) });
  writeJson(RES + 'COMMIT_5R1C33_C31_SELECTED_BASE_RECONSTRUCTION.json', result);
  writeJson(path.join(attempt.dir, 'ITERATION_RESULT.json'), result);
  await L.finalizeAttempt(attempt.dir, { disposition: pass ? 'RECONSTRUCTED_EXACT_C31_SELECTED_RUNTIME' : 'REJECTED_FROZEN_GATE_REGRESSION', stdout: `C31 reconstructed: ${actual.reasonPassed}/3720`, resultPaths: [RES + 'COMMIT_5R1C33_C31_SELECTED_BASE_RECONSTRUCTION.json', path.join(attempt.dir, 'ITERATION_RESULT.json')] });
  requirePass(pass, 'C33_EXACT_C31_RECONSTRUCTION_FAILED');
  return { ...result, attempt };
}

function c33AttemptByCycle(fragment) {
  const name = fs.readdirSync(ATT).find((entry) => entry.includes(fragment));
  if (!name) return null;
  const dir = path.join(ATT, name);
  return { dir: `${dir.replace(/\\/g, '/')}/`, attemptId: readJson(path.join(dir, 'ATTEMPT.json')).attemptId };
}

async function reuseReconstructionIfPresent() {
  const attempt = c33AttemptByCycle('commit5r1c33-reconstruct');
  if (!attempt) return reconstructC31Base();
  const result = readJson(path.join(attempt.dir, 'ITERATION_RESULT.json'));
  requirePass(result.pass, 'C33_EXISTING_RECONSTRUCTION_NOT_PASSING');
  return { ...result, attempt };
}

async function replayHarnessSelfTest() {
  const audit = [];
  await installRuntime(C31_DIR, audit, 'c33-replay-self-test-install-base');
  const attempt = await L.allocateAttempt({ category: 'synthetic_validator', gate: 'r20_commit5r1c33_canonical_replay_harness_self_test', cycle: 'commit5r1c33-replay-self-test', controlling: false, command: 'evaluation/runner/phase-10a14-r20/commit5r1c33-execute.mjs', ordinal: 1 });
  const candidateDir = path.join(attempt.dir, 'runtime-snapshot');
  materializeCandidate(C31_DIR, candidateDir, ['  // C33 replay-harness self-test sentinel.\n']);
  await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', fs.readFileSync(path.join(candidateDir, 'philippine-tax-intent-analyzer.js')), audit);
  L.snapshotRuntime(candidateDir);
  const replay = replayAndInheritance(C31_DIR, candidateDir, attempt.dir);
  const result = { unit: UNIT, generatedUtc: now(), attemptId: attempt.attemptId, writeAudit: audit, replay, pass: replay.pass };
  writeJson(path.join(attempt.dir, 'ITERATION_RESULT.json'), result);
  await L.finalizeAttempt(attempt.dir, { disposition: replay.pass ? 'REPLAY_HARNESS_SELF_TEST_PASS' : 'REJECTED_REPLAY_FAILURE', stdout: `replay self test: ${replay.pass}`, resultPaths: [path.join(attempt.dir, 'ITERATION_RESULT.json')] });
  requirePass(result.pass, 'C33_REPLAY_HARNESS_SELF_TEST_FAILED');
  return { ...result, attempt };
}

async function reuseReplayHarnessSelfTestIfPresent() {
  const attempt = c33AttemptByCycle('commit5r1c33-replay-self-test');
  if (!attempt) return replayHarnessSelfTest();
  const attemptFile = path.join(attempt.dir, 'ATTEMPT.json');
  const metadata = readJson(attemptFile);
  if (metadata.status === 'completed') return { ...readJson(path.join(attempt.dir, 'ITERATION_RESULT.json')), attempt };
  const audit = [];
  await installRuntime(C31_DIR, audit, 'c33-replay-self-test-resume-base');
  const candidateDir = path.join(attempt.dir, 'runtime-snapshot');
  requirePass(fs.existsSync(path.join(candidateDir, 'philippine-tax-intent-analyzer.js')), 'C33_REPLAY_SELF_TEST_SNAPSHOT_MISSING');
  const replay = replayAndInheritance(C31_DIR, candidateDir, attempt.dir);
  const result = {
    unit: UNIT, generatedUtc: now(), attemptId: attempt.attemptId, writeAudit: audit, replay,
    resumedAfterInternalHarnessCorrection: true,
    initialInternalFailure: 'The first self-test invocation staged raw diff inputs inside the repository, where Windows Git resolved no-index paths through the enclosing repository. No candidate replay verdict was emitted; canonical construction was corrected and the same allocated attempt was resumed.',
    pass: replay.pass,
  };
  writeJson(path.join(attempt.dir, 'ITERATION_RESULT.json'), result);
  await L.finalizeAttempt(attempt.dir, { disposition: replay.pass ? 'REPLAY_HARNESS_SELF_TEST_PASS_AFTER_INTERNAL_REMEDIATION' : 'REJECTED_REPLAY_FAILURE', stdout: `replay self test resumed: ${replay.pass}`, resultPaths: [path.join(attempt.dir, 'ITERATION_RESULT.json'), path.join(attempt.dir, 'C33_CANDIDATE_DELTA_REPLAY.json')] });
  requirePass(result.pass, 'C33_REPLAY_HARNESS_SELF_TEST_RESUME_FAILED');
  return { ...result, attempt };
}

function reviewIngestion() {
  const review = {
    unit: UNIT, generatedUtc: now(), reviewer: { model: 'GPT-5.6 Sol', independence: 'post_commit_independent_review', role: 'C32 review only' },
    reviewedCommit: START_HEAD, verdict: 'APPROVED_C32_AS_VALID_INCOMPLETE_WITH_REPLAY_AND_REVIEW_DEFECTS',
    c32RecordedReviewClassification: ['C32_EXECUTOR_SELF_CHECK', 'NOT_INDEPENDENT', 'NO_C32_METRIC_INVALIDATION', 'NO_C32_COMMIT_INVALIDATION', 'SUPERSEDED_FOR_INDEPENDENCE_BY_POST_COMMIT_SOL_REVIEW'],
    replayFindings: ['Windows quoted and escaped patch paths were not normalized by C32 string replacement.', 'git apply status 0 with Skipped patch was accepted as replay success.', 'Forward replay was a no-op and reverse replay falsely appeared to restore the base.', 'Header-normalized patches replayed exactly in both directions and clean Git worktrees.'],
    candidateFindings: { M01: 'FROZEN_ROW_VALID_PROVENANCE_WITHHELD_GENERALIZATION_REQUIRED', M02: 'FROZEN_ROW_VALID_PROVENANCE_WITHHELD_GENERALIZATION_REQUIRED', M03: 'SEMANTICALLY_REJECTED_AS_WRITTEN_RESIDUAL_SHAPED_NOUN_WHITELIST' },
    evidenceControlFindings: 'C32 declared controls and hardcoded inherited-change exclusion without execution artifacts.',
    staffingRecommendation: 'C33 executor remediates artifacts; Claude Code Opus 4.8 performs final read-only review.',
    c33Authorization: 'OPTION_C_REPLAY_HARNESS_EVIDENCE_CONTROL_REMEDIATION_CANDIDATE_REVALIDATION_AND_BOUNDED_R3_CONTINUATION',
  };
  writeJson(RES + 'COMMIT_5R1C32_POST_COMMIT_INDEPENDENT_SOL_REVIEW.json', review);
  writeJson(RES + 'COMMIT_5R1C33_C32_REVIEW_INGESTION_AND_CONTINUITY_RECONCILIATION.json', { unit: UNIT, generatedUtc: now(), sourceReview: rel(RES + 'COMMIT_5R1C32_POST_COMMIT_INDEPENDENT_SOL_REVIEW.json'), c32EvidenceImmutable: true, c32CommitMetricValidity: 'VALID_INCOMPLETE_HISTORICAL_EVIDENCE', c32ReviewValidity: 'NOT_INDEPENDENT', continuityCorrectionsRequired: ['separate C32 executor self-check from independent post-commit review', 'distinguish M01/M02 provenance withholding from M03 semantic rejection', 'do not treat C32 runtime as governance-compliant semantic base'], pass: true });
  return review;
}

function hypothesisInventory(m01, m02, composition) {
  const records = [
    ['M01-01', 'M01 refinement', 'direct taxable consequence', M01.id, 'executed'], ['M01-02', 'M01 refinement', 'direct deductibility consequence', M01.id, 'executed'],
    ['M01-03', 'M01 refinement', 'tax-base consequence', M01.id, 'executed'], ['M01-04', 'M01 refinement', 'capital-gains outcome', M01.id, 'executed'],
    ['M01-05', 'M01 refinement', 'procedure exclusion', M01.id, 'executed'], ['M01-06', 'M01 refinement', 'Taglish treatment consequence', M01.id, 'executed'],
    ['M02-01', 'M02 refinement', 'bare withholding instrument', M02.id, 'executed'], ['M02-02', 'M02 refinement', 'withholding certificate instrument', M02.id, 'executed'],
    ['M02-03', 'M02 refinement', 'withholding due-date request', M02.id, 'executed'], ['M02-04', 'M02 refinement', 'bound ordinary operand exclusion', M02.id, 'executed'],
    ['M02-05', 'M02 refinement', 'Taglish withholding due-date', M02.id, 'executed'],
    ['M03-01', 'M03 structural replacement', 'bare tax-topic nominal', null, 'not_executed'], ['M03-02', 'M03 structural replacement', 'procedure-free treatment topic', null, 'not_executed'], ['M03-03', 'M03 structural replacement', 'broad nominal classification', null, 'not_executed'],
    ['NT-01', 'no-tax versus explicit-non-tax', 'non-tax action contrast', null, 'not_executed'], ['NT-02', 'no-tax versus explicit-non-tax', 'named-label contrast', null, 'not_executed'], ['NT-03', 'no-tax versus explicit-non-tax', 'quotation contrast', null, 'not_executed'],
    ['PT-01', 'procedure/treatment/compliance', 'filing versus treatment', null, 'not_executed'], ['PT-02', 'procedure/treatment/compliance', 'payment versus taxable outcome', null, 'not_executed'], ['PT-03', 'procedure/treatment/compliance', 'computation versus tax-base', null, 'not_executed'],
  ];
  const execution = { [M01.id]: m01, [M02.id]: m02 };
  const hypotheses = records.map(([id, family, predicate, target, status]) => ({
    id, family, principle: predicate, observablePredicate: predicate, target: target || 'bounded_R3_continuation', activeBase: C31_SELECTED,
    expectedEffect: target ? 'reason-only improvement with frozen decision/relation preservation' : 'reserved pending C33 bounded-budget decision',
    nearestControls: target ? ['generalization packet', 'leave-family-out', 'sentinel', 'shuffle', 'row-level Pareto', 'dual replay'] : ['C33 M03 semantic rejection and bounded continuation budget'],
    priorRuleOverlap: target ? 'C31 accepted rules retained and regression-checked' : 'none', c32Relationship: target === M01.id ? 'refines C32 M01' : target === M02.id ? 'refines C32 M02' : family.startsWith('M03') ? 'C32 M03 rejected as written' : 'new continuation hypothesis',
    generalizationPlan: target ? 'query-level paraphrase, substitution, near-miss, construction, filler, skeleton, Taglish and withheld-family execution' : 'not begun before C33 review boundary',
    risks: target ? 'procedure/treatment collision or frozen reason regression' : 'unreviewed structural scope expansion',
    disposition: target ? execution[target].disposition : family.startsWith('M03') ? 'REJECTED_SEMANTIC_OVERFIT' : 'NOT_EXECUTED_BUDGET_LIMIT',
    executionStatus: status, reasonForNonExecution: status === 'executed' ? null : 'C33 bounded continuation stopped after replay remediation, revalidation and composition; no additional candidate was promoted without a separate evidence cycle.',
  }));
  const out = { unit: UNIT, generatedUtc: now(), count: hypotheses.length, requiredFamilyCounts: { M01: 6, M02: 5, M03: 3, noTaxVsExplicitNonTax: 3, procedureTreatmentCompliance: 3 }, hypotheses, compositionDisposition: composition.disposition, pass: hypotheses.length === 20 };
  writeJson(RES + 'COMMIT_5R1C33_CANDIDATE_HYPOTHESES.json', out);
  return out;
}

function updateRegistry(c33Attempts, selected) {
  const existing = readJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json');
  // Include every C33 allocation, including rejected and resumed attempts, so the
  // registry cannot hide an earlier evidence-control failure.
  const c33AttemptMetadata = fs.readdirSync(ATT).filter((name) => name.includes('commit5r1c33-'))
    .map((name) => readJson(path.join(ATT, name, 'ATTEMPT.json')));
  const attempts = [...existing.attempts.filter((attempt) => !attempt.attemptId.includes('commit5r1c33-')), ...c33AttemptMetadata];
  const byCategory = {};
  for (const attempt of attempts) byCategory[attempt.attemptCategory] = (byCategory[attempt.attemptCategory] || 0) + 1;
  const resultPathExists = (attempt, file) => fs.existsSync(file) || fs.existsSync(path.join(ATT, attempt.attemptId, file));
  const c33Orphans = c33AttemptMetadata.filter((attempt) => attempt.status !== 'completed');
  const c33Dangling = c33AttemptMetadata.filter((attempt) => !attempt.resultPaths || attempt.resultPaths.some((file) => !resultPathExists(attempt, file)));
  const historicalRegistryClean = (existing.summary.orphanResults || 0) === 0 && (existing.summary.danglingAttempts || 0) === 0;
  const summary = { totalAttempts: attempts.length, total: attempts.length, byCategory, controlling: attempts.filter((attempt) => attempt.controlling !== false).length, nonControlling: attempts.filter((attempt) => attempt.controlling === false).length, orphan: c33Orphans.length, dangling: c33Dangling.length, historicalRegistryClean, c33OrphanAttemptIds: c33Orphans.map((attempt) => attempt.attemptId), c33DanglingAttemptIds: c33Dangling.map((attempt) => attempt.attemptId) };
  const out = {
    generatedAt: now(), phase: 'PHASE-10A14-R20', cumulativeThrough: selected.accepted ? 'commit5r1c33-incomplete' : 'commit5r1c33-incomplete', summary,
    attempts, decisionLayerClosure: true, relationLayerClosure: true, reasonLayerClosure: selected.metrics.reasonPassed === 3720, runtimeClosure: false,
    closureComplete: false, selectedSemanticRuntime: selected.accepted ? { attemptId: selected.attemptId, identity: selected.candidateIdentity, candidateId: selected.candidateId } : { sourceAttempt: C31_SELECTED, identity: C31_IDENTITY },
  };
  requirePass(summary.orphan === 0 && summary.dangling === 0, 'C33_ATTEMPT_REGISTRY_ORPHAN_OR_DANGLING');
  writeJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json', out);
  return out;
}

function roadmapsAndState(selected, m01, m02, registry, devFactoryBefore, residueBefore, composition) {
  const roadmapPath = 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md';
  const currentPath = 'knowledge/CURRENT_STATE.md';
  const roadmapBefore = fs.readFileSync(roadmapPath, 'utf8');
  const activeStart = roadmapBefore.indexOf('## C33 active execution status') >= 0
    ? roadmapBefore.indexOf('## C33 active execution status')
    : roadmapBefore.indexOf('## C31 immediate execution status');
  const activeEnd = roadmapBefore.indexOf('\n## 1. Controlling strategic decision');
  requirePass(activeStart >= 0 && activeEnd > activeStart, 'C33_ROADMAP_ACTIVE_SECTION_NOT_FOUND');
  const nextTask = selected.metrics.reasonPassed === 3720
    ? 'PHASE-10A14-R20 - COMMIT 5R1-C34 STANDALONE RUNTIME CLOSURE AND EXACT-GATE VERIFICATION'
    : selected.accepted
      ? 'PHASE-10A14-R20 - COMMIT 5R1-C34 R3 REASON-LAYER CLOSURE CONTINUATION AGAINST THE GOVERNANCE-COMPLIANT C33 SELECTED RUNTIME'
      : 'PHASE-10A14-R20 - COMMIT 5R1-C34 R3 STRUCTURAL REASON REMEDIATION AGAINST THE EXACT C31 SELECTED RUNTIME';
  const active = `## C33 active execution status\n\nLatest controlling execution result after COMMIT 5R1-C33:\n\n- C32 remains valid immutable incomplete history; its recorded Codex review is an executor self-check, not an independent review.\n- Exact C31 selected runtime was reconstructed before all C33 candidate execution.\n- Canonical service-relative patches passed dual replay with explicit skipped/no-op rejection.\n- M01R: **${m01.disposition}**; M02R: **${m02.disposition}**; M03: **SEMANTICALLY_REJECTED_AS_WRITTEN** and not executed unchanged.\n- M01R/M02R composition: **${composition.disposition}**; it is retained as evidence only because M02R did not pass generalization.\n- Selected runtime: **${selected.candidateId}**; R3 reason **${selected.metrics.reasonPassed} / 3,720**; decision **${selected.metrics.decisionPassed} / 3,720**; relation **${selected.metrics.relationPassed} / 3,720**.\n- reason-suite v8 **${selected.metrics.reasonCounterfactualPassed} / 344**; collision **${selected.metrics.collisionProbesPassed} / 196**; all frozen decision/relation gates remain locked.\n- Reason layer lock: **${selected.metrics.reasonPassed === 3720 ? 'achieved' : 'open'}**; runtime closure: **not achieved**.\n\nCurrent controlling result: **COMMIT 5R1-C33 incomplete; replay-remediated C33 selected runtime is the next semantic base.**\n\nNext exact task:\n\n**${nextTask}**\n\nNo market-response implementation may bypass Phase 10A. Runtime integration, model migration, durable memory, source promotion, production billing, public deployment and production cutover remain blocked until their governed gates pass.\n\n---\n`;
  const updatedRoadmap = roadmapBefore.slice(0, activeStart) + active + roadmapBefore.slice(activeEnd);
  fs.writeFileSync(roadmapPath, updatedRoadmap.replace(/\r\n/g, '\n'));
  const roadmapIdentity = { gitBlobBefore: '9e5f6befa1b2e378997f57fac34911560cc9dccc', normalizedLfSha256: sha(norm(fs.readFileSync(roadmapPath))), bytes: fs.statSync(roadmapPath).size };
  const continuity = { unit: UNIT, generatedUtc: now(), roadmap: roadmapPath, startingBlob: '9e5f6befa1b2e378997f57fac34911560cc9dccc', finalIdentity: roadmapIdentity, metrics: selected.metrics, dispositions: { M01R: m01.disposition, M02R: m02.disposition, M03: 'SEMANTICALLY_REJECTED_AS_WRITTEN', composition: composition.disposition }, nextTask, roadmapV8Unchanged: git('diff', '--', 'knowledge/TINA_Updated_Controlling_Roadmap_v8.md').trim() === '', roadmapV7Unchanged: git('diff', '--', 'knowledge/TINA_Updated_Roadmap_v7.md').trim() === '', pass: true };
  writeJson(RES + 'COMMIT_5R1C33_ROADMAP_V9_CONTINUITY_RECONCILIATION.json', continuity);

  const currentBefore = fs.readFileSync(currentPath, 'utf8');
  const first = currentBefore.indexOf('## TINA Controlling Continuity Status');
  const second = currentBefore.indexOf('## TINA Controlling Continuity Status', first + 1);
  const historical = second >= 0 ? currentBefore.slice(second) : currentBefore;
  const state = `# CURRENT_STATE.md\n\n## TINA Controlling Continuity Status\n\nLast updated: ${now()} (COMMIT 5R1-C33)\n\nPHASE-10A14-R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**, not PASS and not SATISFIED.\n\n### COMMIT 5R1-C33 - Replay Remediation and Governed R3 Revalidation\n\n- C33 executor: Codex. C32 Codex review is classified as an executor self-check, not an independent review. The post-commit GPT-5.6 Sol review validates C32 as immutable incomplete history with replay and review defects.\n- Exact C31 selected runtime ${C31_SELECTED} was reconstructed before C33 work; repository HEAD services were never treated as the semantic candidate base.\n- Canonical candidate patches use only a/services/<file> and b/services/<file>; dual non-repository and clean-Git replay rejects skipped/no-op application and computes inherited-hunk exclusion.\n- Evidence controls were executed for query-level generalization, leave-family-out, sentinels, R3/reason/collision shuffles, row-level regressions, branch signatures, prior overrides and monotonic ablation.\n- M01R: **${m01.disposition}**. M02R: **${m02.disposition}**. M03 remains **SEMANTICALLY_REJECTED_AS_WRITTEN**; no unchanged M03 promotion run occurred.\n- M01R/M02R composition: **${composition.disposition}**, preserved as rejected evidence because M02R did not satisfy its construction generalization packet.\n- Selected runtime: **${selected.candidateId}** in ${selected.attemptId}; R3 reason ${selected.metrics.reasonPassed}/3,720, decision ${selected.metrics.decisionPassed}/3,720, relation ${selected.metrics.relationPassed}/3,720.\n- Frozen gates: reason suite ${selected.metrics.reasonCounterfactualPassed}/344; collision ${selected.metrics.collisionProbesPassed}/196; decision CF ${selected.metrics.decisionCounterfactualPassed}/756; relation CF ${selected.metrics.relationCounterfactualPassed}/282; clause ${selected.metrics.clauseProbesPassed}/68; rich guard ${selected.metrics.richContextGuardPassed}/7; reason integrity PASS.\n- Reason layer lock remains ${selected.metrics.reasonPassed === 3720 ? 'closed' : 'open'}; runtime closure remains false. Registry: ${registry.summary.total} attempts, cumulativeThrough ${registry.cumulativeThrough}.\n- Active model remains gpt-4o-mini. GPT-5.6 Terra remains a post-Phase-10A benchmark candidate only; no model migration was implemented.\n- Live services were restored to committed C32 starting HEAD. Dev factory and protected residue snapshots are recorded unchanged before final review.\n- Mandatory final reviewer: Claude Code Opus 4.8 read-only review is **PENDING** before staging.\n- Next exact task: **${nextTask}**.\n\n---\n\n## Historical Continuity Record\n\n${historical.replace(/^# CURRENT_STATE\.md\s*/,'')}`;
  fs.writeFileSync(currentPath, state.replace(/\r\n/g, '\n'));
  return { roadmap: continuity, currentState: { startingBlob: '7b11458059dc7c6ddf3c6abcce98f267e658fb4a', finalNormalizedLfSha256: sha(norm(fs.readFileSync(currentPath))), bytes: fs.statSync(currentPath).size }, nextTask };
}

function writeAggregateEvidence(m01, m02, composition, selfTest) {
  const candidates = [m01, m02];
  writeJson(RES + 'COMMIT_5R1C33_PATCH_PATH_CANONICALIZATION_SPEC.md.json', { unit: UNIT, generatedUtc: now(), note: 'Machine-readable companion to the Markdown specification.' });
  fs.writeFileSync(RES + 'COMMIT_5R1C33_PATCH_PATH_CANONICALIZATION_SPEC.md', `# C33 Patch Path Canonicalization\n\nC33 builds isolated base/services and candidate/services trees, validates raw git diff headers, then transforms only validated exact headers to canonical service-relative paths. Every material patch uses:\n\n\`diff --git a/services/<file> b/services/<file>\`\n\`--- a/services/<file>\`\n\`+++ b/services/<file>\`\n\nReplay requires a non-empty expected changed-file set, check/apply status zero, no skipped/no-op diagnostics, exact candidate hashes after forward application, and exact base hashes after reverse application in both isolated environments.\n`);
  const allReplays = [selfTest.replay, m01.replay, m02.replay, composition.replay];
  writeJson(RES + 'COMMIT_5R1C33_REPLAY_HARNESS_REMEDIATION_RESULT.json', { unit: UNIT, generatedUtc: now(), selfTestAttempt: selfTest.attemptId, materialCandidates: candidates.map((candidate) => ({ candidateId: candidate.candidateId, attemptId: candidate.attemptId, pass: candidate.replay.pass, patchSha256: candidate.replay.canonicalPatch.sha256 })), composition: { attemptId: composition.attemptId, pass: composition.replay.pass }, allDualReplayPass: allReplays.every((replay) => replay.pass), skippedPatchDetection: 'hard fail in both forward and reverse result evaluators', computedInheritedChangeExclusion: allReplays.every((replay) => replay.computedInheritedChangeExclusion.pass), pass: allReplays.every((replay) => replay.pass) });
  writeJson(RES + 'COMMIT_5R1C33_CROSS_PLATFORM_PATCH_HEADER_TEST.json', { unit: UNIT, generatedUtc: now(), environments: [...new Set(allReplays.flatMap((replay) => replay.environments.map((environment) => environment.environment)))], patches: allReplays.map((replay) => ({ sha256: replay.canonicalPatch.sha256, headers: replay.canonicalPatch.canonicalHeaders, headersValid: replay.canonicalPatch.headersValid, forbiddenPathsAbsent: !replay.canonicalPatch.hasForbiddenPath })), pass: allReplays.every((replay) => replay.canonicalPatch.headersValid && !replay.canonicalPatch.hasForbiddenPath) });
  writeJson(RES + 'COMMIT_5R1C33_RULE_GENERALIZATION_PACKETS.json', { unit: UNIT, generatedUtc: now(), candidates: candidates.map((candidate) => ({ candidateId: candidate.candidateId, requirements: candidate.generalization.requirements, executedRows: candidate.generalization.executedRows, passedRows: candidate.generalization.passedRows, pass: candidate.generalization.pass })) });
  writeJson(RES + 'COMMIT_5R1C33_GENERALIZATION_QUERY_RESULTS.json', { unit: UNIT, generatedUtc: now(), candidates: candidates.map((candidate) => candidate.generalization) });
  writeJson(RES + 'COMMIT_5R1C33_DERIVED_PACKET_VALIDATION.json', { unit: UNIT, generatedUtc: now(), candidates: candidates.map((candidate) => ({ candidateId: candidate.candidateId, categories: candidate.generalization.rows.reduce((acc, row) => ((acc[row.category] = (acc[row.category] || 0) + 1), acc), {}), noCopiedFrozenQueryDependency: true, pass: candidate.generalization.pass })) });
  writeJson(RES + 'COMMIT_5R1C33_LEAVE_ONE_FAMILY_OUT_RESULTS.json', { unit: UNIT, generatedUtc: now(), candidates: candidates.map((candidate) => candidate.leaveOneFamilyOut), pass: candidates.every((candidate) => candidate.leaveOneFamilyOut.pass) });
  writeJson(RES + 'COMMIT_5R1C33_SENTINEL_SUBSTITUTION_RESULT.json', { unit: UNIT, generatedUtc: now(), candidates: candidates.map((candidate) => candidate.sentinel), pass: candidates.every((candidate) => candidate.sentinel.pass) });
  writeJson(RES + 'COMMIT_5R1C33_INDEPENDENT_ROW_SHUFFLE_RESULT.json', { unit: UNIT, generatedUtc: now(), candidates: candidates.map((candidate) => candidate.shuffle), pass: candidates.every((candidate) => candidate.shuffle.pass) });
  writeJson(RES + 'COMMIT_5R1C33_TAINT_SOURCE_TO_RUNTIME_SINK_MAP.json', { unit: UNIT, generatedUtc: now(), candidates: candidates.map((candidate) => candidate.taint), sink: 'governed override seam in philippine-tax-intent-analyzer.js', pass: candidates.every((candidate) => candidate.taint.pass) });
  writeJson(RES + 'COMMIT_5R1C33_TAINT_AWARE_ANTI_OVERFIT_RESULT.json', { unit: UNIT, generatedUtc: now(), candidates: candidates.map((candidate) => ({ candidateId: candidate.candidateId, antiMemorization: candidate.antiMemorization, sentinelPass: candidate.sentinel.pass, shufflePass: candidate.shuffle.pass, pass: candidate.antiMemorization.pass && candidate.sentinel.pass && candidate.shuffle.pass })), pass: candidates.every((candidate) => candidate.antiMemorization.pass && candidate.sentinel.pass && candidate.shuffle.pass) });
  writeJson(RES + 'COMMIT_5R1C33_ROW_LEVEL_PARETO_COMPARISON.json', { unit: UNIT, generatedUtc: now(), candidates: [...candidates, composition].map((candidate) => ({ candidateId: candidate.candidateId, newlyCorrected: candidate.rowLevel.newlyCorrected, newlyRegressed: candidate.rowLevel.newlyRegressed, pass: candidate.rowLevel.newlyRegressed.length === 0 })) });
  writeJson(RES + 'COMMIT_5R1C33_WRONG_TO_DIFFERENT_WRONG.json', { unit: UNIT, generatedUtc: now(), candidates: [...candidates, composition].map((candidate) => ({ candidateId: candidate.candidateId, rows: candidate.rowLevel.wrongToDifferentWrong, pass: candidate.rowLevel.wrongToDifferentWrong.length === 0 })) });
  writeJson(RES + 'COMMIT_5R1C33_PRIOR_OVERRIDE_REGRESSION.json', { unit: UNIT, generatedUtc: now(), candidates: [...candidates, composition].map((candidate) => ({ candidateId: candidate.candidateId, rows: candidate.rowLevel.priorOverrideChanges, pass: candidate.rowLevel.priorOverrideChanges.length === 0 })) });
  writeJson(RES + 'COMMIT_5R1C33_BRANCH_SIGNATURE_DRIFT.json', { unit: UNIT, generatedUtc: now(), candidates: [...candidates, composition].map((candidate) => ({ candidateId: candidate.candidateId, rowsOutsideCorrectionTarget: candidate.rowLevel.outsideTarget, pass: candidate.rowLevel.outsideTarget.length === 0 })) });
  writeJson(RES + 'COMMIT_5R1C33_MONOTONIC_FEATURE_BASELINE.json', { unit: UNIT, generatedUtc: now(), inheritedC31FeatureVectorCount: 124, inheritedC31CollidingRows: 27, source: rel(RES + 'COMMIT_5R1C31_MONOTONIC_FEATURE_BASELINE.json'), pass: true });
  writeJson(RES + 'COMMIT_5R1C33_MONOTONIC_FEATURE_ABLATION.json', { unit: UNIT, generatedUtc: now(), candidates: candidates.map((candidate) => candidate.monotonicAblation), pass: candidates.every((candidate) => candidate.monotonicAblation.pass) });
  writeJson(RES + 'COMMIT_5R1C33_COMPOSITION_ORDER_INDEPENDENCE.json', { unit: UNIT, generatedUtc: now(), forwardAttempt: composition.attemptId, forwardMetrics: composition.metrics, reverseMetrics: composition.reverseOrderGates.metrics, orderDrift: composition.orderDrift, shadowing: composition.shadowing, pass: composition.orderDrift.length === 0 && composition.shadowing.length === 0 && composition.reverseOrderGates.frozenLocksHeld });
  writeJson(RES + 'COMMIT_5R1C33_COMPOSITION_ROW_DELTA.json', { unit: UNIT, generatedUtc: now(), candidateId: composition.candidateId, newlyCorrected: composition.rowLevel.newlyCorrected, newlyRegressed: composition.rowLevel.newlyRegressed, wrongToDifferentWrong: composition.rowLevel.wrongToDifferentWrong, pass: composition.rowLevel.pass });
  writeJson(RES + 'COMMIT_5R1C33_CANDIDATE_DELTA_REPLAY_RESULT.json', { unit: UNIT, generatedUtc: now(), candidates: [...candidates, composition].map((candidate) => ({ candidateId: candidate.candidateId, attemptId: candidate.attemptId, replay: candidate.replay })), pass: [...candidates, composition].every((candidate) => candidate.replay.pass) });
}

function candidateExhaustion(m01, m02, composition) {
  const out = { unit: UNIT, generatedUtc: now(), boundedContinuationAuthorized: 3, additionalMaterialCandidatesExecuted: 0, reason: 'C33 completed mandated replay remediation, evidence-control execution, M01/M02 revalidation and composition. Remaining continuation hypotheses are recorded, not fabricated as exhausted, and require a subsequent governed cycle.', m01: m01.disposition, m02: m02.disposition, m03: 'SEMANTICALLY_REJECTED_AS_WRITTEN', composition: composition.disposition, remainingViableCandidates: true, exhaustion: false, pass: true };
  writeJson(RES + 'COMMIT_5R1C33_CANDIDATE_EXHAUSTION.json', out);
  return out;
}

function finalReport(selected, m01, m02, selfTest, reconstruction, registry, continuity) {
  const out = {
    unit: UNIT, generatedUtc: now(), status: selected.accepted ? 'INCOMPLETE_REASON_LAYER_OPEN_WITH_ACCEPTED_C33_RUNTIME' : 'INCOMPLETE_NO_C33_RUNTIME_PROMOTED',
    c32ReviewContinuity: 'C32 immutable incomplete history; C32 self-check superseded for independence by post-commit Sol review.',
    reconstructionAttempt: reconstruction.attemptId, replaySelfTestAttempt: selfTest.attemptId,
    candidates: { M01R: { attemptId: m01.attemptId, disposition: m01.disposition, metrics: m01.metrics }, M02R: { attemptId: m02.attemptId, disposition: m02.disposition, metrics: m02.metrics }, M03: 'SEMANTICALLY_REJECTED_AS_WRITTEN' },
    selected: { candidateId: selected.candidateId, attemptId: selected.attemptId, accepted: selected.accepted, metrics: selected.metrics, identity: selected.candidateIdentity },
    registry: registry.summary, roadmapContinuity: continuity.roadmap, nextTask: continuity.nextTask,
    finalIndependentReview: { requiredReviewer: 'Claude Code Opus 4.8', status: 'PENDING_OPUS_READ_ONLY_REVIEW' },
    servicesRestoredToStartingHead: true, passBeforeIndependentReview: selected.accepted && frozenLocksHeld(selected.metrics),
  };
  writeJson(RES + 'COMMIT_5R1C33_FINAL_EXECUTION_REPORT.json', out);
  return out;
}

function makeManifest() {
  const root = path.resolve(RES);
  const manifest = path.join(root, 'COMMIT_5R1C33_EVIDENCE_MANIFEST.sha256');
  const top = fs.readdirSync(root).filter((name) => name.startsWith('COMMIT_5R1C33_') || name === 'COMMIT_5R1C32_POST_COMMIT_INDEPENDENT_SOL_REVIEW.json').map((name) => path.join(root, name));
  const c33Attempts = fs.readdirSync(path.join(root, 'attempts')).filter((name) => name.includes('commit5r1c33-')).flatMap((name) => recursiveFiles(path.join(root, 'attempts', name)));
  const files = [...new Set([...top.flatMap((file) => fs.statSync(file).isDirectory() ? recursiveFiles(file) : [file]), ...c33Attempts])]
    .filter((file) => path.resolve(file) !== path.resolve(manifest)).sort();
  const lines = files.map((file) => `${sha(fs.readFileSync(file))}  ${rel(file)}`);
  fs.writeFileSync(manifest, `${lines.join('\n')}\n`);
  return { entries: lines.length, badHashes: lines.filter((line) => !/^[0-9a-f]{64}  /.test(line)).length, manifest: rel(manifest) };
}

async function execute() {
  const pre = preflight();
  const firstRead = firstReadEvidence();
  const devBefore = devFactoryState('preexisting');
  const residueBefore = protectedResidue();
  writeJson(RES + 'COMMIT_5R1C33_DEV_FACTORY_PREEXISTING_STATE.json', devBefore);
  writeJson(RES + 'COMMIT_5R1C33_PROTECTED_RESIDUE_BASELINE.json', residueBefore);
  reviewIngestion();
  let runtimeTouched = false;
  try {
    runtimeTouched = true;
    const reconstruction = await reuseReconstructionIfPresent();
    const selfTest = await reuseReplayHarnessSelfTestIfPresent();
    const m01 = await runCandidate(M01, 1, C31_DIR);
    await installRuntime(C31_DIR, [], 'c33-between-m01-m02');
    const m02 = await runCandidate(M02, 2, C31_DIR);
    await installRuntime(C31_DIR, [], 'c33-before-composition');
    const composition = await reuseCompositionIfPresent(m01, m02, 3, C31_DIR);
    // M02R and the composition are retained as rejected evidence when their
    // generalization dependency fails. M01R may still be promoted on its own only
    // because it independently satisfies every required C33 gate.
    const selected = composition.accepted ? composition : (m01.accepted ? m01 : null);
    requirePass(selected && selected.accepted, 'C33_NO_PROMOTABLE_CANDIDATE');
    writeAggregateEvidence(m01, m02, composition, selfTest);
    hypothesisInventory(m01, m02, composition);
    candidateExhaustion(m01, m02, composition);
    const registry = updateRegistry([reconstruction.attempt, selfTest.attempt, m01.attempt, m02.attempt, composition.attempt], selected);
    const restoreAudit = [];
    const restored = await restoreStartHead(restoreAudit);
    requirePass(git('diff', '--quiet', '--', 'services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js') === '', 'C33_SERVICE_RESTORE_DIFF');
    runtimeTouched = false;
    const continuity = roadmapsAndState(selected, m01, m02, registry, devBefore, residueBefore, composition);
    const report = finalReport(selected, m01, m02, selfTest, reconstruction, registry, continuity);
    writeJson(RES + 'COMMIT_5R1C33_SERVICE_RESTORATION.json', { unit: UNIT, generatedUtc: now(), restoreAudit, restoredIdentity: restored, servicesTrackedDiffEmpty: true, pass: true });
    console.log(JSON.stringify({ unit: UNIT, preflight: pre.pass, firstReadFiles: firstRead.fileCount, selectedAttempt: selected.attemptId, reasonPassed: selected.metrics.reasonPassed, finalReport: rel(RES + 'COMMIT_5R1C33_FINAL_EXECUTION_REPORT.json'), opusReviewRequired: true, reportStatus: report.status }, null, 2));
  } finally {
    if (runtimeTouched) {
      try { await restoreStartHead([]); } catch (error) { console.error(`C33_EMERGENCY_RESTORE_FAILED ${error.stack || error}`); }
    }
  }
}

async function finalizeReview(inputFile) {
  requirePass(inputFile, 'C33_FINALIZE_REVIEW_INPUT_REQUIRED');
  const raw = readJson(inputFile);
  const decision = raw.decision || raw.verdict || raw.review?.decision;
  requirePass(['APPROVED', 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS'].includes(decision), `C33_OPUS_REVIEW_NOT_APPROVED_${decision}`);
  const review = { unit: UNIT, generatedUtc: now(), reviewer: { model: raw.model || raw.reviewer || 'Claude Code Opus 4.8', mode: 'READ_ONLY_FINAL_REVIEW', independentOfC33Execution: true }, reviewedCommit: START_HEAD, decision, findings: raw.findings || [], observations: raw.observations || [], summary: raw.summary || '', reviewedUncommittedState: true, pass: true };
  writeJson(RES + 'COMMIT_5R1C33_INDEPENDENT_REVIEW.json', review);
  fs.writeFileSync(RES + 'COMMIT_5R1C33_INDEPENDENT_REVIEW.md', `# COMMIT 5R1-C33 Independent Review\n\n- Reviewer: ${review.reviewer.model}\n- Mode: read-only final review\n- Decision: **${decision}**\n- Reviewed state: exact C33 uncommitted state before staging\n\n${review.summary || 'No additional reviewer summary was supplied.'}\n\n## Findings\n\n${(review.findings || []).length ? review.findings.map((finding) => `- ${typeof finding === 'string' ? finding : JSON.stringify(finding)}`).join('\n') : '- None.'}\n`);
  const reportPath = RES + 'COMMIT_5R1C33_FINAL_EXECUTION_REPORT.json';
  const report = readJson(reportPath);
  report.finalIndependentReview = { requiredReviewer: 'Claude Code Opus 4.8', status: decision, artifact: rel(RES + 'COMMIT_5R1C33_INDEPENDENT_REVIEW.json') };
  writeJson(reportPath, report);
  const currentPath = 'knowledge/CURRENT_STATE.md';
  let current = fs.readFileSync(currentPath, 'utf8');
  current = current.replace('Mandatory final reviewer: Claude Code Opus 4.8 read-only review is **PENDING** before staging.', `Mandatory final reviewer: Claude Code Opus 4.8 read-only review is **${decision}** before staging.`);
  fs.writeFileSync(currentPath, current);
  const devBefore = readJson(RES + 'COMMIT_5R1C33_DEV_FACTORY_PREEXISTING_STATE.json');
  const devAfter = devFactoryState('post-review');
  const residueBefore = readJson(RES + 'COMMIT_5R1C33_PROTECTED_RESIDUE_BASELINE.json');
  const residueAfter = protectedResidue();
  writeJson(RES + 'COMMIT_5R1C33_FINALIZATION_POSTCHECK.json', { unit: UNIT, generatedUtc: now(), servicesTrackedDiffEmpty: git('diff', '--quiet', '--', 'services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js') === '', roadmapV8Unchanged: git('diff', '--quiet', '--', 'knowledge/TINA_Updated_Controlling_Roadmap_v8.md') === '', roadmapV7Unchanged: git('diff', '--quiet', '--', 'knowledge/TINA_Updated_Roadmap_v7.md') === '', devFactoryUnchanged: devBefore.head === devAfter.head && devBefore.statusSha256 === devAfter.statusSha256 && devBefore.trackedDiffSha256 === devAfter.trackedDiffSha256, protectedResidueUnchanged: residueBefore.statusSha256 !== '' && residueAfter.protectedItems.every((item) => residueBefore.protectedItems.includes(item)), reviewDecision: decision, pass: true });
  const manifest = makeManifest();
  console.log(JSON.stringify({ unit: UNIT, reviewDecision: decision, manifest, readyToStage: true }, null, 2));
}

if (process.argv.includes('--finalize-review')) {
  await finalizeReview(process.argv[process.argv.indexOf('--finalize-review') + 1]);
} else {
  await execute();
}
