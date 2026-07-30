// PHASE-10A14-R20 COMMIT 5R1-C34
// Crash-safe runtime, attempt, replay, row-control, and anti-overfit helpers.
// This file contains no oracle-derived candidate predicates.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as L from './commit5r1c20-lib.mjs';

export const UNIT = 'COMMIT 5R1-C34';
export const REPO = L.REPO;
export const RES = L.RES;
export const ATT = L.ATT;
export const START_HEAD = '7c95019622d7174c8b1fd258b9a10137e59feb57';
export const EXPECTED_PARENT = '17f86896c9c6dcca860dbf038ee8b3b963817bcb';
export const RUNNER = 'evaluation/runner/phase-10a14-r20/commit5r1c34-execute.mjs';
export const SELECTED_C33_ATTEMPT =
  'R20-domain_campaign-r20_commit5r1c33_replay_remediated_reason_continuation-' +
  'commit5r1c33-m01r-v2-ord01-2026-07-28T05-27-05-812Z';
export const SELECTED_C33_SNAPSHOT =
  `${ATT}${SELECTED_C33_ATTEMPT}/runtime-snapshot/`;
export const SELECTED_C33_SNAPSHOT_REL =
  `evaluation/results/phase-10a14-r20/attempts/${SELECTED_C33_ATTEMPT}/runtime-snapshot/`;
export const SELECTED_C33_SNAPSHOT_TREE = '635ce6b5dd06b426cee05878a48659b484f2da28';
export const SELECTED_C33_SNAPSHOT_BLOBS = {
  'philippine-tax-intent-analyzer.js': 'a514ce189dfc76509ada1568bfa04a92b8785c98',
  'philippine-tax-domain-boundary.js': 'fceb7efbd8f9b8610c32f6f0973e83b593bfbd4d',
  'philippine-tax-boundary-patterns.js': '37592d64348d015a028f23465a7291ee5a49d4c1',
};
export const C33_IDENTITY = {
  'services/philippine-tax-intent-analyzer.js': {
    bytes: 179760,
    rawSha256: 'd28ebd235a786e77cbf7545111e28d8f9224114ce7dc018651dd8eb46282ef55',
    normalizedLfSha256: 'd28ebd235a786e77cbf7545111e28d8f9224114ce7dc018651dd8eb46282ef55',
  },
  'services/philippine-tax-domain-boundary.js': {
    bytes: 12192,
    rawSha256: '145954db84c07acb029d67082419a8ff2885201d93de65c313f08241c13cebb9',
    normalizedLfSha256: '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  },
  'services/philippine-tax-boundary-patterns.js': {
    bytes: 65451,
    rawSha256: '5d427c65ed4b35776fe9050ce918f9d1f9b20f3329cfa5899ff9b7285f413465',
    normalizedLfSha256: '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
  },
  servicesTreeDigest: '79ecf65483b9d04bb71ad3fcdb049a5d6ef7c5914ff272bb085f67e700d5f503',
};
export const BASE_METRICS = {
  canonicalPassed: 3504,
  reasonPassed: 3504,
  reasonMismatches: 216,
  decisionPassed: 3720,
  relationPassed: 3720,
  reasonCounterfactualPassed: 344,
  collisionProbesPassed: 196,
  decisionCounterfactualPassed: 756,
  relationCounterfactualPassed: 282,
  clauseProbesPassed: 68,
  richContextGuardPassed: 7,
  richContextGuardTotal: 7,
};

export const now = () => new Date().toISOString();
export const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const norm = (value) => L.normLf(Buffer.isBuffer(value) ? value : Buffer.from(value));
export const normHash = (file) => sha(norm(fs.readFileSync(file)));
export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
export const writeJson = (file, value) => L.writeJson(file, value);
export const rel = (file) => path.resolve(file).replace(/\\/g, '/').replace(/^C:\/Projects\/tina-backend\/?/i, '');
export const git = (...args) =>
  execFileSync('git', ['-C', REPO, ...args], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  });
export const requirePass = (condition, message) => {
  if (!condition) throw new Error(message);
};

function writeJsonAtomic(file, value, expectedPriorSha256 = null) {
  const absolute = path.resolve(file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const lock = `${absolute}.c34.lock`;
  const temporary = `${absolute}.c34-${process.pid}-${crypto.randomBytes(6).toString('hex')}.tmp`;
  let lockDescriptor = null;
  let lockAcquired = false;
  let temporaryExists = false;
  try {
    lockDescriptor = fs.openSync(lock, 'wx');
    lockAcquired = true;
    fs.writeFileSync(
      lockDescriptor,
      `${JSON.stringify({ pid: process.pid, createdAt: now(), target: rel(absolute) })}\n`,
    );
    if (expectedPriorSha256 != null) {
      requirePass(fs.existsSync(absolute), `C34_CAS_TARGET_MISSING_${rel(absolute)}`);
      requirePass(
        sha(fs.readFileSync(absolute)) === expectedPriorSha256,
        `C34_CAS_CONFLICT_${rel(absolute)}`,
      );
    }
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    temporaryExists = true;
    if (expectedPriorSha256 != null) {
      requirePass(
        sha(fs.readFileSync(absolute)) === expectedPriorSha256,
        `C34_CAS_CONFLICT_BEFORE_RENAME_${rel(absolute)}`,
      );
    }
    fs.renameSync(temporary, absolute);
    temporaryExists = false;
  } finally {
    if (temporaryExists && fs.existsSync(temporary)) fs.unlinkSync(temporary);
    if (lockDescriptor != null) fs.closeSync(lockDescriptor);
    if (lockAcquired && fs.existsSync(lock)) fs.unlinkSync(lock);
  }
}

function rowsFromQueryFile(file, source) {
  const parsed = readJson(file);
  const rows = Array.isArray(parsed.queries)
    ? parsed.queries
    : Array.isArray(parsed.probes)
      ? parsed.probes
      : [];
  return rows
    .filter((row) => typeof row?.query === 'string')
    .map((row) => ({ source, query: row.query }));
}

export function protectedQueryInventory() {
  return [
    ...L.loadR3().map((row) => ({ source: 'R3', query: row.query })),
    ...rowsFromQueryFile(L.REASON_SUITE, 'reason_counterfactual'),
    ...rowsFromQueryFile(L.COLLISION_PROBES, 'collision_probes'),
    ...L.SUITES.flatMap(([name, file]) => rowsFromQueryFile(file, `decision_counterfactual_${name}`)),
    ...rowsFromQueryFile(L.RELATION_SUITE, 'relation_counterfactual'),
    ...rowsFromQueryFile(L.CLAUSE_PROBES, 'clause_probes'),
    ...L.GUARD_SHAPES.map((row) => ({ source: 'rich_context_guard', query: row.query })),
  ];
}

function candidateDependencyAudit(candidateBlock) {
  const source = String(candidateBlock);
  const forbiddenPatterns = [
    ['oracleId', /\boracle[\s_-]*id\b/i],
    ['queryHash', /\bquery[\s_-]*hash\b/i],
    ['expectedLabel', /\bexpected[\s_-]*label\b/i],
    ['expectedReason', /\bexpected[\s_-]*reason\b/i],
    ['expectedDecision', /\bexpected[\s_-]*decision\b/i],
    ['familyName', /\bfamily[\s_-]*name\b/i],
    ['sourceSet', /\bsource[\s_-]*set\b/i],
    ['primaryCategory', /\bprimary[\s_-]*category\b/i],
    ['rowPosition', /\brow[\s_-]*(?:position|index|ordinal)\b/i],
    ['fixture', /\bfixture\b/i],
    ['governedEvidencePath', /evaluation[\\/](?:oracles|results|factcheck)|COMMIT_5R1C\d|_SUITE/i],
  ];
  const fixturePatterns = [
    ['filesystemApi', /\b(?:readFileSync|readFile|readdirSync|readdir|existsSync|statSync)\b/i],
    ['dynamicModuleLoad', /\b(?:require|import)\s*\(/i],
    ['processEnvironment', /\bprocess\.(?:cwd|env)\b/i],
    ['governedEvidencePath', /evaluation[\\/](?:oracles|results|factcheck)|COMMIT_5R1C\d|_SUITE/i],
  ];
  const forbiddenTerms = forbiddenPatterns.map(([term, expression]) => ({
    term,
    pattern: expression.source,
    presentInCandidateBlock: expression.test(source),
  }));
  const fixtureDependencyFindings = fixturePatterns
    .filter(([, expression]) => expression.test(source))
    .map(([term, expression]) => ({ term, pattern: expression.source }));
  return {
    forbiddenTerms,
    fixtureDependencyFindings,
    noForbiddenMetadataDependency:
      forbiddenTerms.every((record) => !record.presentInCandidateBlock),
    noFixtureDependency: fixtureDependencyFindings.length === 0,
    pass: forbiddenTerms.every((record) => !record.presentInCandidateBlock)
      && fixtureDependencyFindings.length === 0,
  };
}

export function recursiveFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...recursiveFiles(item));
    else files.push(item);
  }
  return files;
}

export function runtimeFor(directory) {
  const identity = {};
  const normalizedParts = [];
  for (const name of L.SERVICES) {
    const file = path.join(directory, name);
    const bytes = fs.readFileSync(file);
    normalizedParts.push(norm(bytes));
    identity[`services/${name}`] = {
      bytes: bytes.length,
      rawSha256: sha(bytes),
      normalizedLfSha256: sha(norm(bytes)),
    };
  }
  identity.servicesTreeDigest = sha(Buffer.concat(normalizedParts));
  return identity;
}

export function liveRuntimeIdentity() {
  return runtimeFor(path.join(REPO, 'services'));
}

export function sameRuntime(actual, expected) {
  return L.SERVICES.every((name) => {
    const key = `services/${name}`;
    return actual[key]?.bytes === expected[key]?.bytes
      && actual[key]?.rawSha256 === expected[key]?.rawSha256
      && actual[key]?.normalizedLfSha256 === expected[key]?.normalizedLfSha256;
  }) && actual.servicesTreeDigest === expected.servicesTreeDigest;
}

export function copyRuntime(sourceDirectory, destinationDirectory) {
  fs.mkdirSync(destinationDirectory, { recursive: true });
  for (const name of L.SERVICES) {
    fs.copyFileSync(path.join(sourceDirectory, name), path.join(destinationDirectory, name));
  }
}

export async function installRuntime(sourceDirectory, audit, stage) {
  for (const name of L.SERVICES) {
    await L.atomicWriteRuntime(
      `services/${name}`,
      fs.readFileSync(path.join(sourceDirectory, name)),
      audit,
    );
  }
  await L.assertRuntimeIntact(stage);
  return liveRuntimeIdentity();
}

export function gitShowBuffer(revision, repositoryRelativePath) {
  return execFileSync(
    'git',
    ['-C', REPO, 'show', `${revision}:${repositoryRelativePath}`],
    { maxBuffer: 1024 * 1024 * 1024 },
  );
}

export function reconstructCommittedSnapshot(destinationDirectory) {
  requirePass(!fs.existsSync(destinationDirectory), `C34_RECONSTRUCTION_TARGET_EXISTS_${destinationDirectory}`);
  fs.mkdirSync(destinationDirectory, { recursive: false });
  for (const name of L.SERVICES) {
    fs.writeFileSync(
      path.join(destinationDirectory, name),
      execFileSync(
        'git',
        ['-C', REPO, 'cat-file', 'blob', SELECTED_C33_SNAPSHOT_BLOBS[name]],
        { maxBuffer: 1024 * 1024 * 1024 },
      ),
    );
  }
  const identity = runtimeFor(destinationDirectory);
  requirePass(sameRuntime(identity, C33_IDENTITY), 'C34_COMMITTED_C33_SNAPSHOT_IDENTITY_MISMATCH');
  return identity;
}

export async function restoreStartingHead(audit = []) {
  for (const name of L.SERVICES) {
    await L.atomicWriteRuntime(
      `services/${name}`,
      gitShowBuffer(START_HEAD, `services/${name}`),
      audit,
    );
  }
  await L.assertRuntimeIntact('c34-restore-starting-head');
  requirePass(
    git(
      'diff',
      '--quiet',
      '--',
      ...L.SERVICES.map((name) => `services/${name}`),
    ) === '',
    'C34_STARTING_HEAD_SERVICE_RESTORE_DIFF',
  );
  return liveRuntimeIdentity();
}

export function metrics(gates) {
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
    reasonCounterfactualTotal: gates.reasonCounterfactual.total,
    reasonCounterfactualFailed: gates.reasonCounterfactual.failed,
    collisionProbesPassed: gates.collisionProbes.passed,
    collisionProbesTotal: gates.collisionProbes.total,
    collisionProbesFailed: gates.collisionProbes.failed,
    decisionCounterfactualPassed: gates.decisionCounterfactual.passed,
    decisionCounterfactualTotal: gates.decisionCounterfactual.total,
    decisionCounterfactualFailed: gates.decisionCounterfactual.failed,
    relationCounterfactualPassed: gates.relationCounterfactual.passed,
    relationCounterfactualTotal: gates.relationCounterfactual.total,
    relationCounterfactualFailed: gates.relationCounterfactual.failed,
    clauseProbesPassed: gates.clauseProbes.passed,
    clauseProbesTotal: gates.clauseProbes.total,
    clauseProbesFailed: gates.clauseProbes.failed,
    richContextGuardPassed: gates.richContextGuard.passed,
    richContextGuardTotal: gates.richContextGuard.total,
    reasonIntegrityPass: gates.reasonIntegrity.pass,
    decisionLockHeld: gates.decisionLockHeld,
    relationLockHeld: gates.relationLockHeld,
  };
}

export function frozenLocksHeld(value) {
  return value.decisionPassed === 3720
    && value.relationPassed === 3720
    && value.reasonCounterfactualPassed === 344
    && value.reasonCounterfactualTotal === 344
    && value.reasonCounterfactualFailed === 0
    && value.collisionProbesPassed === 196
    && value.collisionProbesTotal === 196
    && value.collisionProbesFailed === 0
    && value.decisionCounterfactualPassed === 756
    && value.decisionCounterfactualTotal === 756
    && value.decisionCounterfactualFailed === 0
    && value.relationCounterfactualPassed === 282
    && value.relationCounterfactualTotal === 282
    && value.relationCounterfactualFailed === 0
    && value.clauseProbesPassed === 68
    && value.clauseProbesTotal === 68
    && value.clauseProbesFailed === 0
    && value.richContextGuardPassed === 7
    && value.richContextGuardTotal === 7
    && value.reasonIntegrityPass === true
    && value.materialFalseAllows === 0
    && value.materialFalseRefusals === 0
    && value.clarifyMismatches === 0;
}

export async function loadAnalyzerFrom(directory, cacheKey = 'c34') {
  const source = path.resolve(directory, 'philippine-tax-intent-analyzer.js');
  const module = await import(
    `${pathToFileURL(source).href}?${cacheKey}=${Date.now()}-${Math.random()}`
  );
  return (query) => module.analyzePhilippineTaxIntent(query);
}

export function outputSignature(evidence) {
  return JSON.stringify({
    decision: evidence.decision,
    reasonCode: evidence.reasonCode,
    relations: (evidence.relations || []).map((relation) => [
      relation.source,
      relation.relation,
      relation.target,
      relation.clauseId,
      relation.evidenceSpan,
    ]),
  });
}

export function compactEvidence(evidence) {
  return {
    decision: evidence.decision,
    reasonCode: evidence.reasonCode,
    relations: (evidence.relations || []).map((relation) => relation.relation),
    requestedAction: evidence.requestedAction || null,
    requestedTarget: evidence.requestedTarget || null,
    speechAct: evidence.speechAct || null,
  };
}

export function rowPass(row, evidence) {
  const actualRelations = (evidence.relations || []).map((relation) => relation.relation);
  return evidence.decision === row.expectedDecision
    && evidence.reasonCode === row.expectedReasonCodeFamily
    && (row.expectedRelations || []).every((relation) =>
      actualRelations.includes(relation.relation));
}

export function collectRows(baseAnalyze, candidateAnalyze) {
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
    const baseSignature = outputSignature(base);
    const candidateSignature = outputSignature(candidate);
    const record = {
      oracleId: row.oracleId,
      query: row.query,
      expectedDecision: row.expectedDecision,
      expectedReason: row.expectedReasonCodeFamily,
      expectedRelations: (row.expectedRelations || []).map((relation) => relation.relation),
      base: compactEvidence(base),
      candidate: compactEvidence(candidate),
      baseCorrect,
      candidateCorrect,
    };
    if (!baseCorrect && candidateCorrect) newlyCorrected.push(record);
    if (baseCorrect && !candidateCorrect) newlyRegressed.push(record);
    if (!baseCorrect && !candidateCorrect && baseSignature !== candidateSignature) {
      wrongToDifferentWrong.push(record);
    }
    if (baseSignature !== candidateSignature) changedSignatures.push(record);
    if (baseCorrect && baseSignature !== candidateSignature) priorOverrideChanges.push(record);
  }
  const correctedIds = new Set(newlyCorrected.map((record) => record.oracleId));
  const outsideTarget = changedSignatures.filter((record) => !correctedIds.has(record.oracleId));
  return {
    totalRows: rows.length,
    baseCorrect: rows.length - rows.filter((row) => !rowPass(row, baseAnalyze(row.query))).length,
    candidateCorrect:
      rows.length - rows.filter((row) => !rowPass(row, candidateAnalyze(row.query))).length,
    newlyCorrected,
    newlyRegressed,
    wrongToDifferentWrong,
    priorOverrideChanges,
    changedSignatures,
    outsideTarget,
    pass: newlyRegressed.length === 0
      && wrongToDifferentWrong.length === 0
      && priorOverrideChanges.length === 0
      && outsideTarget.length === 0,
  };
}

export function insertRule(source, block) {
  const marker = '\n  return null;\n}\n\n/**\n * C20';
  requirePass(source.includes(marker), 'C34_OVERRIDE_INSERTION_POINT_NOT_FOUND');
  requirePass(!source.includes(block.trim()), 'C34_DUPLICATE_CANDIDATE_BLOCK');
  return source.replace(marker, `\n${block}${marker}`);
}

export function materializeCandidate(baseDirectory, destinationDirectory, blocks) {
  requirePass(!fs.existsSync(destinationDirectory), `C34_CANDIDATE_DIRECTORY_EXISTS_${destinationDirectory}`);
  copyRuntime(baseDirectory, destinationDirectory);
  const analyzerPath = path.join(destinationDirectory, 'philippine-tax-intent-analyzer.js');
  let source = fs.readFileSync(analyzerPath, 'utf8');
  for (const block of blocks) source = insertRule(source, block);
  fs.writeFileSync(analyzerPath, source.replace(/\r\n/g, '\n'));
  return runtimeFor(destinationDirectory);
}

function processResult(command, args, cwd, input) {
  const result = spawnSync(command, args, {
    cwd,
    input,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  });
  return {
    command: [command, ...args].join(' '),
    cwd: cwd.replace(/\\/g, '/'),
    status: result.status,
    signal: result.signal || null,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? String(result.error) : null,
  };
}

function treeFiles(root) {
  const output = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const item = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(item);
      else output.push(path.relative(root, item).replace(/\\/g, '/'));
    }
  }
  walk(root);
  return output.sort();
}

function serviceHashes(root) {
  return Object.fromEntries(
    L.SERVICES.map((name) => [
      `services/${name}`,
      (() => {
        const bytes = fs.readFileSync(path.join(root, 'services', name));
        return {
          bytes: bytes.length,
          rawSha256: sha(bytes),
          normalizedLfSha256: sha(norm(bytes)),
        };
      })(),
    ]),
  );
}

function changedKeys(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .sort()
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

function sameObject(first, second) {
  return [...new Set([...Object.keys(first), ...Object.keys(second)])]
    .every((key) => JSON.stringify(first[key]) === JSON.stringify(second[key]));
}

export function validateCanonicalPatchHeaders(text, changedServiceFiles) {
  const normalizedChangedFiles = changedServiceFiles.map((file) =>
    file.startsWith('services/') ? file : `services/${file}`);
  const names = normalizedChangedFiles.map((file) => file.replace(/^services\//, ''));
  const safeChangedFiles = normalizedChangedFiles.length > 0
    && new Set(normalizedChangedFiles).size === normalizedChangedFiles.length
    && normalizedChangedFiles.every((file) =>
      /^services\/[^/\\]+$/.test(file)
        && !file.includes('..'));
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const diffIndices = lines
    .map((line, index) => (line.startsWith('diff --git ') ? index : -1))
    .filter((index) => index >= 0);
  const headers = [];
  const headerParseErrors = [];
  for (let blockIndex = 0; blockIndex < diffIndices.length; blockIndex++) {
    const start = diffIndices[blockIndex];
    const end = diffIndices[blockIndex + 1] ?? lines.length;
    const block = lines.slice(start, end);
    const hunkIndex = block.findIndex((line) => line.startsWith('@@'));
    const preHunk = hunkIndex >= 0 ? block.slice(0, hunkIndex) : block;
    const oldHeaders = preHunk.filter((line) => line.startsWith('--- '));
    const newHeaders = preHunk.filter((line) => line.startsWith('+++ '));
    headers.push(block[0]);
    if (oldHeaders.length === 1 && newHeaders.length === 1) {
      const oldIndex = preHunk.indexOf(oldHeaders[0]);
      const newIndex = preHunk.indexOf(newHeaders[0]);
      if (newIndex === oldIndex + 1) {
        headers.push(oldHeaders[0], newHeaders[0]);
      } else {
        headerParseErrors.push(`BLOCK_${blockIndex + 1}_FILE_HEADERS_NOT_ADJACENT`);
      }
    } else {
      headerParseErrors.push(
        `BLOCK_${blockIndex + 1}_FILE_HEADER_COUNTS_${oldHeaders.length}_${newHeaders.length}`,
      );
    }
    if (hunkIndex < 0) headerParseErrors.push(`BLOCK_${blockIndex + 1}_HUNK_MISSING`);
  }
  const expectedHeaders = names.flatMap((name) => [
    `diff --git a/services/${name} b/services/${name}`,
    `--- a/services/${name}`,
    `+++ b/services/${name}`,
  ]);
  const forbidden =
    /(?:[A-Za-z]:[\\/]|evaluation\/results\/|runtime-snapshot|attempts\/|\\\\)/i;
  const forbiddenPathHeaders = headers.filter((header) => forbidden.test(header));
  const headersValid = safeChangedFiles
    && diffIndices.length === names.length
    && headerParseErrors.length === 0
    && headers.length === expectedHeaders.length
    && headers.every((header, index) => header === expectedHeaders[index]);
  return {
    canonicalHeaders: headers,
    expectedHeaders,
    diffBlockCount: diffIndices.length,
    expectedDiffBlockCount: names.length,
    safeChangedFiles,
    headerParseErrors,
    forbiddenPathHeaders,
    hasForbiddenPath: forbiddenPathHeaders.length > 0,
    headersValid,
    pass: names.length > 0 && headersValid && forbiddenPathHeaders.length === 0,
  };
}

export function canonicalPatch(baseDirectory, candidateDirectory) {
  const patchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tina-c34-patch-'));
  const baseRoot = path.join(patchRoot, 'base', 'services');
  const candidateRoot = path.join(patchRoot, 'candidate', 'services');
  copyRuntime(baseDirectory, baseRoot);
  copyRuntime(candidateDirectory, candidateRoot);
  const changedFiles = L.SERVICES.filter(
    (name) => normHash(path.join(baseDirectory, name))
      !== normHash(path.join(candidateDirectory, name)),
  );
  const parts = [];
  const rawHeaders = [];
  const diffCommands = [];
  for (const name of changedFiles) {
    const before = `base/services/${name}`;
    const after = `candidate/services/${name}`;
    const result = processResult(
      'git',
      ['diff', '--no-index', '--binary', '--src-prefix=a/', '--dst-prefix=b/', before, after],
      patchRoot,
    );
    requirePass(result.status === 1, `C34_PATCH_DIFF_FAILED_${name}_${result.status}`);
    diffCommands.push({
      command: result.command,
      cwd: result.cwd,
      status: result.status,
      signal: result.signal,
      stdoutBytes: Buffer.byteLength(result.stdout),
      stdoutSha256: sha(Buffer.from(result.stdout)),
      stderr: result.stderr,
      error: result.error,
      statusMeaning: 'git diff --no-index returns 1 when differences were emitted',
    });
    const lines = result.stdout.replace(/\r\n/g, '\n').split('\n');
    const expected = {
      diff: `diff --git a/${before} b/${after}`,
      old: `--- a/${before}`,
      next: `+++ b/${after}`,
    };
    requirePass(lines[0] === expected.diff, `C34_PATCH_UNEXPECTED_DIFF_HEADER_${name}`);
    const oldIndex = lines.indexOf(expected.old);
    const newIndex = lines.indexOf(expected.next);
    requirePass(oldIndex > 0 && newIndex === oldIndex + 1, `C34_PATCH_FILE_HEADER_${name}`);
    rawHeaders.push({ name, diff: lines[0], old: lines[oldIndex], next: lines[newIndex] });
    lines[0] = `diff --git a/services/${name} b/services/${name}`;
    lines[oldIndex] = `--- a/services/${name}`;
    lines[newIndex] = `+++ b/services/${name}`;
    parts.push(lines.join('\n'));
  }
  const text = parts.join('');
  const headerValidation = validateCanonicalPatchHeaders(text, changedFiles);
  const result = {
    text,
    sha256: sha(Buffer.from(text)),
    bytes: Buffer.byteLength(text),
    changedFiles: changedFiles.map((name) => `services/${name}`),
    rawHeaders,
    diffCommands,
    canonicalHeaders: headerValidation.canonicalHeaders,
    expectedHeaders: headerValidation.expectedHeaders,
    diffBlockCount: headerValidation.diffBlockCount,
    expectedDiffBlockCount: headerValidation.expectedDiffBlockCount,
    safeChangedFiles: headerValidation.safeChangedFiles,
    headerParseErrors: headerValidation.headerParseErrors,
    isolatedPatchSource: patchRoot.replace(/\\/g, '/'),
    isolatedPatchSourceRemoved: false,
    forbiddenPathHeaders: headerValidation.forbiddenPathHeaders,
    hasForbiddenPath: headerValidation.hasForbiddenPath,
    headersValid: headerValidation.headersValid,
    pass: headerValidation.pass,
  };
  const resolvedPatchRoot = path.resolve(patchRoot);
  const resolvedSystemTemp = path.resolve(os.tmpdir());
  requirePass(
    resolvedPatchRoot.startsWith(`${resolvedSystemTemp}${path.sep}`)
      && path.basename(resolvedPatchRoot).startsWith('tina-c34-patch-'),
    'C34_REFUSING_UNOWNED_PATCH_TEMP_REMOVAL',
  );
  fs.rmSync(resolvedPatchRoot, { recursive: true, force: true });
  result.isolatedPatchSourceRemoved = !fs.existsSync(resolvedPatchRoot);
  return result;
}

function replayOneEnvironment(
  kind,
  baseDirectory,
  candidateDirectory,
  patch,
  tempRoot,
  identityPolicy,
) {
  const work = path.join(
    tempRoot,
    kind === 'non_repository' ? 'non-repository' : 'clean-git-worktree',
  );
  fs.mkdirSync(work, { recursive: true });
  let gitInit = null;
  if (kind === 'clean_git_worktree') {
    gitInit = [
      processResult('git', ['init', '--quiet'], work),
      processResult('git', ['config', 'core.longpaths', 'true'], work),
      processResult('git', ['config', 'core.autocrlf', 'false'], work),
      processResult('git', ['config', 'user.email', 'c34@example.invalid'], work),
      processResult('git', ['config', 'user.name', 'C34 replay'], work),
    ];
    requirePass(
      gitInit.every((result) => result.status === 0),
      `C34_REPLAY_GIT_SETUP_${gitInit.map((result) => ({
        command: result.command,
        status: result.status,
        stderr: result.stderr.trim(),
      })).map((item) => JSON.stringify(item)).join('_')}`,
    );
  } else {
    fs.mkdirSync(path.join(work, 'services'), { recursive: true });
  }
  fs.mkdirSync(path.join(work, 'services'), { recursive: true });
  for (const name of L.SERVICES) {
    fs.copyFileSync(path.join(baseDirectory, name), path.join(work, 'services', name));
  }
  if (kind === 'clean_git_worktree') {
    const baseCommit = [
      processResult('git', ['add', 'services'], work),
      processResult('git', ['commit', '--quiet', '-m', 'C34 isolated semantic base'], work),
    ];
    gitInit.push(...baseCommit);
    requirePass(baseCommit.every((result) => result.status === 0), 'C34_REPLAY_SEMANTIC_BASE_COMMIT');
  }
  const preHashes = serviceHashes(work);
  const preFiles = treeFiles(work);
  const forwardCheck = processResult(
    'git',
    ['-c', 'core.autocrlf=false', 'apply', '--check', '--binary', '-'],
    work,
    patch.text,
  );
  const forwardApply = forwardCheck.status === 0
    ? processResult(
      'git',
      ['-c', 'core.autocrlf=false', 'apply', '--binary', '-'],
      work,
      patch.text,
    )
    : null;
  const forwardOutput = [
    forwardCheck.stdout,
    forwardCheck.stderr,
    forwardApply?.stdout || '',
    forwardApply?.stderr || '',
  ].join('\n');
  const postForwardHashes = serviceHashes(work);
  const postForwardFiles = treeFiles(work);
  const forwardChangedFiles = changedKeys(preHashes, postForwardHashes);
  const expectedCandidateHashes = Object.fromEntries(
    L.SERVICES.map((name) => [
      `services/${name}`,
      (() => {
        const bytes = fs.readFileSync(path.join(candidateDirectory, name));
        return {
          bytes: bytes.length,
          rawSha256: sha(bytes),
          normalizedLfSha256: sha(norm(bytes)),
        };
      })(),
    ]),
  );
  const expectedCandidateIdentity = runtimeFor(candidateDirectory);
  const forwardIdentity = runtimeFor(path.join(work, 'services'));
  const forwardRawHashMatchAll = sameObject(postForwardHashes, expectedCandidateHashes);
  const forwardNormalizedHashMatch = L.SERVICES.every((name) => {
    const key = `services/${name}`;
    return postForwardHashes[key]?.normalizedLfSha256
      === expectedCandidateHashes[key]?.normalizedLfSha256;
  });
  const changedFileRawIdentityMatch = patch.changedFiles.every((key) =>
    postForwardHashes[key]?.rawSha256 === expectedCandidateHashes[key]?.rawSha256
      && postForwardHashes[key]?.bytes === expectedCandidateHashes[key]?.bytes);
  const forwardServicesTreeMatch =
    forwardIdentity.servicesTreeDigest === expectedCandidateIdentity.servicesTreeDigest;
  const forwardCandidateIdentityPass = identityPolicy === 'exact_raw_all'
    ? forwardRawHashMatchAll
    : forwardNormalizedHashMatch
      && changedFileRawIdentityMatch
      && forwardServicesTreeMatch;
  const skippedPatchMatches = forwardOutput.match(
    /(?:skipped patch|outside repository|filename too long)/gi,
  ) || [];
  const skippedPatchCount = skippedPatchMatches.length;
  const unexpectedFiles = [...new Set([...preFiles, ...postForwardFiles])]
    .filter((file) => !preFiles.includes(file) || !postForwardFiles.includes(file));
  const unexpectedFileCount = unexpectedFiles.length;
  const noOp = forwardChangedFiles.length === 0;
  const noOpCount = noOp ? 1 : 0;
  const forwardPass = forwardCheck.status === 0
    && forwardApply?.status === 0
    && skippedPatchCount === 0
    && patch.changedFiles.length > 0
    && noOpCount === 0
    && JSON.stringify([...forwardChangedFiles].sort()) === JSON.stringify([...patch.changedFiles].sort())
    && forwardCandidateIdentityPass
    && unexpectedFileCount === 0;
  let reverseCheck = null;
  let reverseApply = null;
  let postReverseHashes = null;
  let postReverseFiles = null;
  let reverseChangedFiles = null;
  let reverseSkippedPatchCount = null;
  let reverseUnexpectedFiles = null;
  let reverseUnexpectedFileCount = null;
  let reversePass = false;
  if (forwardPass) {
    reverseCheck = processResult(
      'git',
      ['-c', 'core.autocrlf=false', 'apply', '--check', '--binary', '-R', '-'],
      work,
      patch.text,
    );
    reverseApply = reverseCheck.status === 0
      ? processResult(
        'git',
        ['-c', 'core.autocrlf=false', 'apply', '--binary', '-R', '-'],
        work,
        patch.text,
      )
      : null;
    postReverseHashes = serviceHashes(work);
    postReverseFiles = treeFiles(work);
    reverseChangedFiles = changedKeys(preHashes, postReverseHashes);
    const reverseOutput = [
      reverseCheck.stdout,
      reverseCheck.stderr,
      reverseApply?.stdout || '',
      reverseApply?.stderr || '',
    ].join('\n');
    reverseSkippedPatchCount = (
      reverseOutput.match(/(?:skipped patch|outside repository|filename too long)/gi) || []
    ).length;
    reverseUnexpectedFiles = [...new Set([...preFiles, ...postReverseFiles])]
      .filter((file) => !preFiles.includes(file) || !postReverseFiles.includes(file));
    reverseUnexpectedFileCount = reverseUnexpectedFiles.length;
    reversePass = reverseCheck.status === 0
      && reverseApply?.status === 0
      && reverseSkippedPatchCount === 0
      && reverseChangedFiles.length === 0
      && sameObject(preHashes, postReverseHashes)
      && reverseUnexpectedFileCount === 0;
  }
  return {
    environment: kind,
    cwd: work.replace(/\\/g, '/'),
    gitRepository: kind === 'clean_git_worktree',
    cleanGitWorktreeKind: kind === 'clean_git_worktree'
      ? 'isolated repository worktree committed from exact active-base bytes'
      : null,
    detachedStartingHeadWorktreeNotUsed: kind === 'clean_git_worktree'
      ? {
        reason:
          'The governed source repository contains Windows-invalid historical paths (nul.txt and CON); a detached checkout cannot be materialized on this platform.',
        compensatingControl:
          'Exact committed C33 blobs are reconstructed with git cat-file, then committed in this isolated clean repository before forward/reverse replay.',
      }
      : null,
    gitInit,
    patchSha256: patch.sha256,
    preHashes,
    postForwardHashes,
    postReverseHashes,
    preFiles,
    postForwardFiles,
    postReverseFiles,
    expectedChangedFiles: patch.changedFiles,
    forwardChangedFiles,
    reverseChangedFiles,
    forwardCheck,
    forwardApply,
    reverseCheck: reverseCheck || { status: null, disposition: 'NOT_EXECUTED' },
    reverseApply: reverseApply || { status: null, disposition: 'NOT_EXECUTED' },
    expectedCandidateIdentity,
    forwardIdentity,
    identityPolicy,
    forwardRawHashMatchAll,
    forwardNormalizedHashMatch,
    changedFileRawIdentityMatch,
    forwardServicesTreeMatch,
    forwardCandidateIdentityPass,
    rawIdentityNote: forwardRawHashMatchAll
      ? 'All raw bytes and normalized identities match the candidate snapshot.'
      : identityPolicy === 'normalized_all_changed_raw_exact'
        ? 'The full-HEAD replay intentionally preserves HEAD bytes for normalized-unchanged files; every normalized identity and every changed-file raw identity matches the candidate snapshot.'
        : 'Raw candidate identity mismatch under exact_raw_all policy.',
    skippedPatchCount,
    noOp,
    noOpCount,
    unexpectedFiles,
    unexpectedFileCount,
    reverseSkippedPatchCount,
    reverseUnexpectedFiles,
    reverseUnexpectedFileCount,
    forwardNormalizedReplayMatchesCandidate:
      forwardNormalizedHashMatch && changedFileRawIdentityMatch && forwardServicesTreeMatch,
    forwardReplayMatchesCandidate: forwardCandidateIdentityPass,
    forwardPass,
    reversePass,
    pass: forwardPass && reversePass,
  };
}

export function dualEnvironmentReplay(
  baseDirectory,
  candidateDirectory,
  patch,
  label = 'canonical_patch',
  { identityPolicy = 'exact_raw_all', throwOnFailure = true } = {},
) {
  requirePass(
    ['exact_raw_all', 'normalized_all_changed_raw_exact'].includes(identityPolicy),
    `C34_${label.toUpperCase()}_REPLAY_IDENTITY_POLICY_INVALID_${identityPolicy}`,
  );
  requirePass(
    patch?.pass === true,
    `C34_${label.toUpperCase()}_PATCH_INVALID_${JSON.stringify({
      changedFiles: patch?.changedFiles,
      canonicalHeaders: patch?.canonicalHeaders,
      expectedHeaders: patch?.expectedHeaders,
      diffBlockCount: patch?.diffBlockCount,
      expectedDiffBlockCount: patch?.expectedDiffBlockCount,
      safeChangedFiles: patch?.safeChangedFiles,
      headerParseErrors: patch?.headerParseErrors,
      hasForbiddenPath: patch?.hasForbiddenPath,
      headersValid: patch?.headersValid,
    })}`,
  );
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tina-c34-replay-'));
  let nonRepository;
  let cleanGitWorktree;
  const result = {
    unit: UNIT,
    generatedUtc: now(),
    label,
    identityPolicy,
    patch: { ...patch, text: undefined },
    environments: [],
    temporaryRootRemoved: false,
    pass: false,
  };
  try {
    nonRepository = replayOneEnvironment(
      'non_repository',
      baseDirectory,
      candidateDirectory,
      patch,
      tempRoot,
      identityPolicy,
    );
    cleanGitWorktree = replayOneEnvironment(
      'clean_git_worktree',
      baseDirectory,
      candidateDirectory,
      patch,
      tempRoot,
      identityPolicy,
    );
    result.environments = [nonRepository, cleanGitWorktree];
    result.skippedPatchCount = result.environments
      .reduce((sum, environment) =>
        sum + environment.skippedPatchCount + (environment.reverseSkippedPatchCount || 0), 0);
    result.noOpCount = result.environments
      .reduce((sum, environment) => sum + environment.noOpCount, 0);
    result.unexpectedFileCount = result.environments
      .reduce((sum, environment) =>
        sum + environment.unexpectedFileCount
          + (environment.reverseUnexpectedFileCount || 0), 0);
    result.pass = patch.changedFiles.length > 0
      && result.skippedPatchCount === 0
      && result.noOpCount === 0
      && result.unexpectedFileCount === 0
      && result.environments.every((environment) => environment.pass);
  } finally {
    const resolvedTempRoot = path.resolve(tempRoot);
    const resolvedSystemTemp = path.resolve(os.tmpdir());
    requirePass(
      resolvedTempRoot.startsWith(`${resolvedSystemTemp}${path.sep}`)
        && path.basename(resolvedTempRoot).startsWith('tina-c34-replay-'),
      'C34_REFUSING_UNOWNED_REPLAY_TEMP_REMOVAL',
    );
    fs.rmSync(resolvedTempRoot, { recursive: true, force: true });
    result.temporaryRootRemoved = !fs.existsSync(resolvedTempRoot);
  }
  result.pass = result.pass && result.temporaryRootRemoved;
  if (throwOnFailure) {
    requirePass(result.pass, `C34_${label.toUpperCase()}_DUAL_REPLAY_FAILED`);
  }
  return result;
}

function hunkPayload(patchText) {
  return patchText.replace(/\r\n/g, '\n').split('\n')
    .filter((line) =>
      /^[+-]/.test(line)
      && !/^(---|\+\+\+)/.test(line)
      && line.slice(1).trim().length > 0)
    .map((line) => line.trimEnd());
}

function additionHunkGroups(patchText) {
  const groups = [];
  let current = [];
  for (const line of patchText.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith('@@')) {
      if (current.length) groups.push(current);
      current = [];
    } else if (line.startsWith('+') && !line.startsWith('+++') && line.slice(1).trim()) {
      current.push(line.trimEnd());
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

export function replayAndInheritance(baseDirectory, candidateDirectory, attemptDirectory) {
  const patch = canonicalPatch(baseDirectory, candidateDirectory);
  requirePass(patch.pass, 'C34_CANONICAL_PATCH_INVALID');
  fs.writeFileSync(path.join(attemptDirectory, 'C34_ONLY_CANDIDATE.patch'), patch.text);
  const dualReplay = dualEnvironmentReplay(
    baseDirectory,
    candidateDirectory,
    patch,
    'candidate_only',
    { throwOnFailure: false },
  );
  writeJson(
    path.join(attemptDirectory, 'C34_CANDIDATE_ONLY_DUAL_REPLAY.json'),
    dualReplay,
  );
  requirePass(dualReplay.pass, 'C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED');
  const startingHeadDirectory = path.join(attemptDirectory, 'starting-head-services');
  fs.mkdirSync(startingHeadDirectory, { recursive: false });
  for (const name of L.SERVICES) {
    fs.writeFileSync(
      path.join(startingHeadDirectory, name),
      gitShowBuffer(START_HEAD, `services/${name}`),
    );
  }
  const inheritedPatch = canonicalPatch(startingHeadDirectory, baseDirectory);
  const candidateHunks = hunkPayload(patch.text);
  const inheritedHunks = hunkPayload(inheritedPatch.text);
  const candidateAdditionGroups = additionHunkGroups(patch.text);
  const inheritedAdditionGroups = additionHunkGroups(inheritedPatch.text);
  const overlappingLinePayload = candidateHunks.filter((line) => inheritedHunks.includes(line));
  const unexpectedInheritedHunks = candidateAdditionGroups.filter((candidateGroup) =>
    inheritedAdditionGroups.some((inheritedGroup) =>
      candidateGroup.every((line) => inheritedGroup.includes(line))));
  const inherited = {
    headToBaseChangedFiles: inheritedPatch.changedFiles,
    baseToCandidateChangedFiles: patch.changedFiles,
    fileSetIntersection: patch.changedFiles.filter((file) =>
      inheritedPatch.changedFiles.includes(file)),
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
    canonicalPatch: { ...patch, text: undefined },
    environments: dualReplay.environments,
    skippedPatchCount: dualReplay.skippedPatchCount,
    noOpCount: dualReplay.noOpCount,
    unexpectedFileCount: dualReplay.unexpectedFileCount,
    computedInheritedChangeExclusion: inherited,
    pass: patch.pass && dualReplay.pass && inherited.pass,
    temporaryRootRemoved: dualReplay.temporaryRootRemoved,
  };
  writeJson(path.join(attemptDirectory, 'C34_CANDIDATE_DELTA_REPLAY.json'), result);
  requirePass(result.pass, 'C34_DELTA_REPLAY_OR_INHERITANCE_FAILED');
  return { ...result, patchText: patch.text };
}

function harnessDigest() {
  const paths = [
    'evaluation/runner/phase-10a14-r20/commit5r1c34-execute.mjs',
    'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs',
    'evaluation/runner/phase-10a14-r20/commit5r1c20-lib.mjs',
    'evaluation/runner/phase-10a14-r20/commit5r1c20-gates.mjs',
  ];
  return sha(Buffer.concat(paths.flatMap((file) => {
    const bytes = fs.readFileSync(path.join(REPO, file));
    return [Buffer.from(`${file}\0${bytes.length}\0`), bytes];
  })));
}

function dependencyDigest() {
  return sha(fs.readFileSync(path.join(REPO, 'package-lock.json')));
}

function canonicalAttemptPath(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\\/g, '/').replace(/^C:\/Projects\/tina-backend\/?/i, '');
}

function resultPathExists(value) {
  const canonical = canonicalAttemptPath(value);
  const absolute = path.resolve(REPO, canonical);
  return absolute.startsWith(path.resolve(RES) + path.sep) && fs.existsSync(absolute);
}

function refreshRegistrySummary(registry) {
  const byCategory = {};
  let controlling = 0;
  let nonControlling = 0;
  for (const attempt of registry.attempts) {
    byCategory[attempt.attemptCategory] = (byCategory[attempt.attemptCategory] || 0) + 1;
    if (attempt.controlling) controlling++;
    else nonControlling++;
  }
  const c34RegistryAttempts = registry.attempts.filter((attempt) =>
    attempt.attemptId.includes('commit5r1c34-'));
  const c34AttemptDirectories = fs.readdirSync(ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name);
  const registryIds = new Set(c34RegistryAttempts.map((attempt) => attempt.attemptId));
  const directoryIds = new Set(c34AttemptDirectories);
  const orphanDirectories = c34AttemptDirectories.filter((attemptId) => {
    const attemptPath = path.join(ATT, attemptId, 'ATTEMPT.json');
    return !registryIds.has(attemptId) || !fs.existsSync(attemptPath);
  });
  const orphanRegistryRecords = c34RegistryAttempts
    .filter((attempt) => !directoryIds.has(attempt.attemptId))
    .map((attempt) => attempt.attemptId);
  const completedDangling = c34RegistryAttempts.filter(
    (attempt) =>
      attempt.status === 'completed'
      && (
        (attempt.resultPaths || []).length === 0
        || (attempt.resultPaths || []).some((item) => !resultPathExists(item))
      ),
  );
  const running = c34RegistryAttempts
    .filter((attempt) => attempt.status === 'running')
    .map((attempt) => attempt.attemptId);
  const technical = c34RegistryAttempts
    .filter((attempt) => attempt.status === 'technical_failure')
    .map((attempt) => attempt.attemptId);
  registry.summary = {
    ...registry.summary,
    totalAttempts: registry.attempts.length,
    total: registry.attempts.length,
    byCategory,
    controlling,
    nonControlling,
    orphan: orphanDirectories.length + orphanRegistryRecords.length,
    dangling: completedDangling.length,
    historicalRegistryClean: registry.summary?.historicalRegistryClean !== false,
    c34OrphanAttemptIds: [...orphanDirectories, ...orphanRegistryRecords],
    c34DanglingAttemptIds: completedDangling.map((attempt) => attempt.attemptId),
    c34RunningAttemptIds: running,
    c34TechnicalFailureAttemptIds: technical,
  };
  registry.generatedAt = now();
  return registry;
}

function validateRetryLink(registry, record) {
  const hasRetryOf = record.retryOf != null;
  const hasRetryReason = record.retryReason != null;
  const hasRetryType = record.retryType != null;
  requirePass(
    hasRetryOf === hasRetryReason && hasRetryOf === hasRetryType,
    `C34_RETRY_LINK_PAIR_REQUIRED_${record.attemptId || 'prospective'}`,
  );
  if (!hasRetryOf) return;
  requirePass(
    [
      'C34_FULL_HEAD_PATCH_INVALID',
      'C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED',
    ].includes(record.retryReason),
    `C34_RETRY_REASON_INVALID_${record.attemptId || 'prospective'}`,
  );
  requirePass(
    record.retryType === 'TECHNICAL_LINKED_RETRY',
    `C34_RETRY_TYPE_INVALID_${record.attemptId || 'prospective'}`,
  );
  const predecessor = registry.attempts.find((attempt) => attempt.attemptId === record.retryOf);
  requirePass(predecessor, `C34_RETRY_PREDECESSOR_MISSING_${record.retryOf}`);
  requirePass(
    ['technical_failure', 'transient_failure'].includes(predecessor.status),
    `C34_RETRY_PREDECESSOR_NOT_RETRYABLE_${record.retryOf}_${predecessor.status}`,
  );
  for (const field of [
    'attemptCategory',
    'gateName',
    'runtimeTreeDigest',
    'semanticBase',
    'controlling',
    'oracleVersion',
    'oracleSha256',
  ]) {
    requirePass(
      JSON.stringify(predecessor[field]) === JSON.stringify(record[field]),
      `C34_RETRY_LINEAGE_FIELD_MISMATCH_${record.retryOf}_${field}`,
    );
  }
  requirePass(
    record.attemptOrdinal === predecessor.attemptOrdinal + 1,
    `C34_RETRY_ORDINAL_NOT_NEW_${record.retryOf}_${record.attemptOrdinal}`,
  );
  requirePass(
    predecessor.cycle !== record.cycle,
    `C34_RETRY_CYCLE_MUST_BE_DISTINCT_${record.retryOf}`,
  );
  const priorRetries = registry.attempts.filter((attempt) =>
    attempt.retryOf === record.retryOf && attempt.attemptId !== record.attemptId);
  requirePass(
    priorRetries.length === 0,
    `C34_RETRY_ALREADY_ALLOCATED_${record.retryOf}_${priorRetries.map((item) => item.attemptId).join(',')}`,
  );
  const walPath = path.join(RES, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson');
  const priorWalRetries = fs.existsSync(walPath)
    ? fs.readFileSync(walPath, 'utf8').split(/\r?\n/).filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((row) =>
        row.event === 'ALLOCATION_PLANNED'
          && row.retryOf === record.retryOf
          && row.attemptId !== record.attemptId)
    : [];
  requirePass(
    priorWalRetries.length === 0,
    `C34_RETRY_ALREADY_PLANNED_IN_WAL_${record.retryOf}_${priorWalRetries.map((item) => item.attemptId).join(',')}`,
  );
}

export function syncAttemptRecord(record) {
  const registryPath = path.join(RES, 'CANONICAL_ATTEMPT_REGISTRY.json');
  const priorBytes = fs.readFileSync(registryPath);
  const priorSha256 = sha(priorBytes);
  const registry = JSON.parse(priorBytes.toString('utf8').replace(/^\uFEFF/, ''));
  const canonicalRecord = {
    ...record,
    stdoutPath: canonicalAttemptPath(record.stdoutPath),
    stderrPath: canonicalAttemptPath(record.stderrPath),
    resultPaths: (record.resultPaths || []).map(canonicalAttemptPath),
  };
  const index = registry.attempts.findIndex(
    (attempt) => attempt.attemptId === canonicalRecord.attemptId,
  );
  if (index === -1) {
    requirePass(
      canonicalRecord.status === 'running',
      `C34_REGISTRY_NEW_ATTEMPT_NOT_RUNNING_${canonicalRecord.attemptId}`,
    );
    validateRetryLink(registry, canonicalRecord);
    registry.attempts.push(canonicalRecord);
  } else {
    const prior = registry.attempts[index];
    requirePass(
      prior.status === 'running',
      `C34_REGISTRY_TERMINAL_ATTEMPT_IMMUTABLE_${canonicalRecord.attemptId}`,
    );
    for (const field of [
      'attemptId',
      'attemptCategory',
      'gateName',
      'cycle',
      'attemptOrdinal',
      'retryOf',
      'retryReason',
      'retryType',
      'evidenceHeadAtAllocation',
      'evidenceHeadAtStart',
      'runtimeBaselineCommit',
      'runtimeTreeDigest',
      'runtimeBlobs',
      'runtimeRawBlobs',
      'runtimeBytes',
      'semanticBase',
      'executionMode',
      'harnessTreeDigest',
      'dependencyLockDigest',
      'command',
      'commandArgs',
      'commandHash',
      'environmentFingerprint',
      'startedAt',
      'controlling',
      'oracleVersion',
      'oracleSha256',
    ]) {
      requirePass(
        JSON.stringify(prior[field]) === JSON.stringify(canonicalRecord[field]),
        `C34_REGISTRY_ALLOCATION_FIELD_MUTATED_${canonicalRecord.attemptId}_${field}`,
      );
    }
    requirePass(
      ['completed', 'technical_failure', 'transient_failure'].includes(canonicalRecord.status),
      `C34_REGISTRY_INVALID_TERMINAL_STATUS_${canonicalRecord.status}`,
    );
    registry.attempts[index] = canonicalRecord;
  }
  refreshRegistrySummary(registry);
  registry.cumulativeThrough = 'commit5r1c34-in-progress';
  requirePass(
    sha(fs.readFileSync(registryPath)) === priorSha256,
    'C34_REGISTRY_COMPARE_AND_SWAP_CONFLICT',
  );
  writeJsonAtomic(registryPath, registry, priorSha256);
  return registry;
}

export function adjudicateTechnicalAttempt({
  attemptId,
  historicDisposition,
  effectiveDisposition,
  blocker,
  semanticDisposition,
  recoveryArtifact,
  adjudicatedAt,
}) {
  requirePass(
    effectiveDisposition === 'TECHNICAL_INCOMPLETE_EXECUTOR_STOP'
      || effectiveDisposition === 'TECHNICAL_INCOMPLETE_PATCH_GENERATION_FAILURE'
      || effectiveDisposition === 'TECHNICAL_INCOMPLETE_DUAL_REPLAY_FAILURE',
    `C34_TECHNICAL_ADJUDICATION_DISPOSITION_INVALID_${effectiveDisposition}`,
  );
  requirePass(
    [
      'C34_FULL_HEAD_PATCH_INVALID',
      'C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED',
    ].includes(blocker),
    `C34_TECHNICAL_ADJUDICATION_BLOCKER_INVALID_${blocker}`,
  );
  requirePass(
    semanticDisposition === 'NOT_A_SEMANTIC_REJECTION',
    `C34_TECHNICAL_ADJUDICATION_SEMANTIC_DISPOSITION_INVALID_${semanticDisposition}`,
  );
  const attemptDirectory = path.resolve(ATT, attemptId);
  const attemptRoot = path.resolve(ATT);
  const attemptFile = path.join(attemptDirectory, 'ATTEMPT.json');
  const recoveryAbsolute = path.resolve(recoveryArtifact);
  requirePass(
    attemptDirectory.startsWith(`${attemptRoot}${path.sep}`)
      && path.dirname(recoveryAbsolute) === attemptDirectory,
    `C34_TECHNICAL_ADJUDICATION_PATH_INVALID_${attemptId}`,
  );
  requirePass(fs.existsSync(attemptFile), `C34_TECHNICAL_ADJUDICATION_ATTEMPT_MISSING_${attemptId}`);
  requirePass(
    fs.existsSync(recoveryAbsolute),
    `C34_TECHNICAL_ADJUDICATION_RECOVERY_ARTIFACT_MISSING_${rel(recoveryAbsolute)}`,
  );
  const attemptRecord = readJson(attemptFile);
  requirePass(
    attemptRecord.status === 'technical_failure'
      && attemptRecord.disposition === historicDisposition,
    `C34_TECHNICAL_ADJUDICATION_HISTORIC_RECORD_MISMATCH_${attemptId}`,
  );
  const recovery = readJson(recoveryAbsolute);
  const overlay = {
    originalAttemptId: attemptId,
    historicDisposition,
    effectiveDisposition,
    blocker,
    semanticDisposition,
    allocationConsumed: true,
    semanticResultConsumed: false,
    originalAttemptRecordPreserved: true,
    originalTerminalWalEventPreserved: true,
    recoveryArtifact: rel(recoveryAbsolute),
    recoveryArtifactSha256: sha(fs.readFileSync(recoveryAbsolute)),
    adjudicatedAt: adjudicatedAt || recovery.generatedUtc || now(),
  };
  const registryPath = path.join(RES, 'CANONICAL_ATTEMPT_REGISTRY.json');
  const registryPriorBytes = fs.readFileSync(registryPath);
  const registryPriorSha256 = sha(registryPriorBytes);
  const registry = JSON.parse(registryPriorBytes.toString('utf8').replace(/^\uFEFF/, ''));
  const registryRecord = registry.attempts.find((attempt) => attempt.attemptId === attemptId);
  requirePass(registryRecord, `C34_TECHNICAL_ADJUDICATION_REGISTRY_RECORD_MISSING_${attemptId}`);
  requirePass(
    registryRecord.status === attemptRecord.status
      && registryRecord.disposition === attemptRecord.disposition
      && registryRecord.exitCode === attemptRecord.exitCode,
    `C34_TECHNICAL_ADJUDICATION_REGISTRY_RECORD_DRIFT_${attemptId}`,
  );
  registry.technicalAdjudications = registry.technicalAdjudications || [];
  const existingOverlay = registry.technicalAdjudications.find(
    (item) => item.originalAttemptId === attemptId,
  );
  if (existingOverlay) {
    requirePass(
      JSON.stringify(existingOverlay) === JSON.stringify(overlay),
      `C34_TECHNICAL_ADJUDICATION_OVERLAY_CONFLICT_${attemptId}`,
    );
  } else {
    registry.technicalAdjudications.push(overlay);
    refreshRegistrySummary(registry);
    registry.summary.c34TechnicalAdjudicationCount = registry.technicalAdjudications.length;
    registry.generatedAt = now();
    writeJsonAtomic(registryPath, registry, registryPriorSha256);
  }
  const walPath = path.join(RES, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson');
  const walRows = fs.readFileSync(walPath, 'utf8').split(/\r?\n/).filter(Boolean)
    .map((line) => JSON.parse(line));
  const walEvent = {
    event: 'ATTEMPT_TECHNICAL_ADJUDICATED',
    at: overlay.adjudicatedAt,
    attemptId,
    ...overlay,
  };
  const existingWalEvent = walRows.find((row) =>
    row.event === walEvent.event && row.originalAttemptId === attemptId);
  if (existingWalEvent) {
    requirePass(
      JSON.stringify(existingWalEvent) === JSON.stringify(walEvent),
      `C34_TECHNICAL_ADJUDICATION_WAL_CONFLICT_${attemptId}`,
    );
  } else {
    fs.appendFileSync(walPath, `${JSON.stringify(walEvent)}\n`);
  }
  return {
    overlay,
    registrySha256: sha(fs.readFileSync(registryPath)),
    walSha256: sha(fs.readFileSync(walPath)),
    registryOverlayPresent: true,
    walAdjudicationPresent: true,
    pass: true,
  };
}

export function reconcileC34AttemptLedger({ throwOnFailure = true } = {}) {
  const registryPath = path.join(RES, 'CANONICAL_ATTEMPT_REGISTRY.json');
  const walPath = path.join(RES, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson');
  const registry = readJson(registryPath);
  const walRows = fs.readFileSync(walPath, 'utf8').split(/\r?\n/).filter(Boolean)
    .map((line, index) => ({ line: index + 1, ...JSON.parse(line) }));
  const attempts = registry.attempts.filter((attempt) =>
    attempt.attemptId.includes('commit5r1c34-'));
  const directories = fs.readdirSync(ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  const walAttemptIds = [...new Set(
    walRows
      .filter((row) =>
        ['ALLOCATION_PLANNED', 'ALLOCATION_REGISTERED', 'ATTEMPT_TERMINAL']
          .includes(row.event)
          && typeof row.attemptId === 'string'
          && row.attemptId.includes('commit5r1c34-'))
      .map((row) => row.attemptId),
  )].sort();
  const records = attempts.map((registryRecord) => {
    const attemptFile = path.join(ATT, registryRecord.attemptId, 'ATTEMPT.json');
    const attemptRecord = fs.existsSync(attemptFile) ? readJson(attemptFile) : null;
    const planned = walRows.filter((row) =>
      row.event === 'ALLOCATION_PLANNED' && row.attemptId === registryRecord.attemptId);
    const registered = walRows.filter((row) =>
      row.event === 'ALLOCATION_REGISTERED' && row.attemptId === registryRecord.attemptId);
    const terminal = walRows.filter((row) =>
      row.event === 'ATTEMPT_TERMINAL' && row.attemptId === registryRecord.attemptId);
    const pathsCanonical = attemptRecord
      && JSON.stringify({
        ...attemptRecord,
        stdoutPath: canonicalAttemptPath(attemptRecord.stdoutPath),
        stderrPath: canonicalAttemptPath(attemptRecord.stderrPath),
        resultPaths: (attemptRecord.resultPaths || []).map(canonicalAttemptPath),
      }) === JSON.stringify(registryRecord);
    const ordered = planned.length === 1
      && registered.length === 1
      && terminal.length === 1
      && planned[0].line < registered[0].line
      && registered[0].line < terminal[0].line;
    const terminalMatches = terminal.length === 1
      && terminal[0].status === registryRecord.status
      && terminal[0].disposition === registryRecord.disposition;
    const plannedLinkageMatches = planned.length === 1
      && (planned[0].retryOf ?? null) === (registryRecord.retryOf ?? null)
      && (planned[0].retryReason ?? null) === (registryRecord.retryReason ?? null)
      && (planned[0].retryType ?? null) === (registryRecord.retryType ?? null);
    return {
      attemptId: registryRecord.attemptId,
      status: registryRecord.status,
      plannedLines: planned.map((row) => row.line),
      registeredLines: registered.map((row) => row.line),
      terminalLines: terminal.map((row) => row.line),
      attemptRecordPresent: attemptRecord != null,
      attemptAndRegistryMatch: pathsCanonical,
      ordered,
      terminalMatches,
      plannedLinkageMatches,
      pass: attemptRecord != null
        && pathsCanonical
        && ordered
        && terminalMatches
        && plannedLinkageMatches,
    };
  });
  const attemptIds = attempts.map((attempt) => attempt.attemptId).sort();
  const adjudicationRecords = (registry.technicalAdjudications || []).map((overlay) => {
    const events = walRows.filter((row) =>
      row.event === 'ATTEMPT_TECHNICAL_ADJUDICATED'
        && row.originalAttemptId === overlay.originalAttemptId);
    const event = events[0] || null;
    const originalTerminal = walRows.filter((row) =>
      row.event === 'ATTEMPT_TERMINAL'
        && row.attemptId === overlay.originalAttemptId);
    const retryPlans = walRows.filter((row) =>
      row.event === 'ALLOCATION_PLANNED'
        && row.retryOf === overlay.originalAttemptId);
    const recoveryAbsolute = path.resolve(REPO, canonicalAttemptPath(overlay.recoveryArtifact));
    const recoveryExists = recoveryAbsolute.startsWith(`${path.resolve(RES)}${path.sep}`)
      && fs.existsSync(recoveryAbsolute);
    const recoveryHashMatches = recoveryExists
      && sha(fs.readFileSync(recoveryAbsolute)) === overlay.recoveryArtifactSha256;
    const matchingFields = [
      'originalAttemptId',
      'historicDisposition',
      'effectiveDisposition',
      'blocker',
      'semanticDisposition',
      'allocationConsumed',
      'semanticResultConsumed',
      'originalAttemptRecordPreserved',
      'originalTerminalWalEventPreserved',
      'recoveryArtifact',
      'recoveryArtifactSha256',
      'adjudicatedAt',
    ];
    return {
      originalAttemptId: overlay.originalAttemptId,
      walLines: events.map((row) => row.line),
      oneWalEvent: events.length === 1,
      attemptIdMatches: event?.attemptId === overlay.originalAttemptId,
      originalTerminalLines: originalTerminal.map((row) => row.line),
      retryPlannedLines: retryPlans.map((row) => row.line),
      orderedAfterOriginalTerminal: events.length === 1
        && originalTerminal.length === 1
        && originalTerminal[0].line < events[0].line,
      orderedBeforeEveryRetryPlan: events.length === 1
        && retryPlans.every((row) => events[0].line < row.line),
      recoveryArtifactExists: recoveryExists,
      recoveryArtifactHashMatches: recoveryHashMatches,
      fieldsMatch: event != null
        && matchingFields.every((field) =>
          JSON.stringify(event[field]) === JSON.stringify(overlay[field])),
      pass: events.length === 1
        && event?.attemptId === overlay.originalAttemptId
        && originalTerminal.length === 1
        && originalTerminal[0].line < events[0].line
        && retryPlans.every((row) => events[0].line < row.line)
        && recoveryHashMatches
        && matchingFields.every((field) =>
          JSON.stringify(event[field]) === JSON.stringify(overlay[field])),
    };
  });
  const result = {
    unit: UNIT,
    generatedUtc: now(),
    registrySha256: sha(fs.readFileSync(registryPath)),
    walSha256: sha(fs.readFileSync(walPath)),
    registryAttemptIds: attemptIds,
    attemptDirectoryIds: directories,
    walAttemptIds,
    records,
    adjudicationRecords,
    orphan: registry.summary?.orphan,
    dangling: registry.summary?.dangling,
    running: registry.summary?.c34RunningAttemptIds || [],
    technicalAdjudications: registry.technicalAdjudications || [],
  };
  result.pass = JSON.stringify(attemptIds) === JSON.stringify(directories)
    && JSON.stringify(attemptIds) === JSON.stringify(walAttemptIds)
    && new Set(attemptIds).size === attemptIds.length
    && records.every((record) => record.pass)
    && adjudicationRecords.every((record) => record.pass)
    && result.orphan === 0
    && result.dangling === 0
    && result.running.length === 0;
  if (throwOnFailure) requirePass(result.pass, 'C34_ATTEMPT_LEDGER_RECONCILIATION_FAILED');
  return result;
}

export function finalizeRegistryState({
  cumulativeThrough,
  selectedSemanticRuntime,
  reasonLayerClosure,
  runtimeClosure = false,
  expectedStartingAttemptCount = 218,
  expectedC34AttemptIds = [],
}) {
  const registryPath = path.join(RES, 'CANONICAL_ATTEMPT_REGISTRY.json');
  const priorBytes = fs.readFileSync(registryPath);
  const priorSha256 = sha(priorBytes);
  const registry = JSON.parse(priorBytes.toString('utf8').replace(/^\uFEFF/, ''));
  requirePass(
    registry.attempts.slice(0, expectedStartingAttemptCount)
      .every((attempt) => !attempt.attemptId.includes('commit5r1c34-')),
    'C34_PRIOR_REGISTRY_PREFIX_MUTATED',
  );
  const c34Attempts = registry.attempts.filter((attempt) =>
    attempt.attemptId.includes('commit5r1c34-'));
  requirePass(
    JSON.stringify(c34Attempts.map((attempt) => attempt.attemptId).sort())
      === JSON.stringify([...expectedC34AttemptIds].sort()),
    'C34_REGISTRY_ATTEMPT_SET_MISMATCH',
  );
  requirePass(
    c34Attempts.every((attempt) =>
      ['completed', 'technical_failure', 'transient_failure'].includes(attempt.status)),
    'C34_REGISTRY_NONTERMINAL_ATTEMPT',
  );
  refreshRegistrySummary(registry);
  requirePass(registry.summary.orphan === 0, 'C34_REGISTRY_ORPHAN');
  requirePass(registry.summary.dangling === 0, 'C34_REGISTRY_DANGLING');
  requirePass(registry.summary.c34RunningAttemptIds.length === 0, 'C34_REGISTRY_RUNNING');
  registry.phase = 'PHASE-10A14-R20';
  registry.cumulativeThrough = cumulativeThrough;
  registry.decisionLayerClosure = true;
  registry.relationLayerClosure = true;
  registry.reasonLayerClosure = reasonLayerClosure;
  registry.runtimeClosure = runtimeClosure;
  registry.closureComplete = reasonLayerClosure && runtimeClosure;
  registry.selectedSemanticRuntime = selectedSemanticRuntime;
  requirePass(
    sha(fs.readFileSync(registryPath)) === priorSha256,
    'C34_REGISTRY_FINAL_COMPARE_AND_SWAP_CONFLICT',
  );
  writeJsonAtomic(registryPath, registry, priorSha256);
  return registry;
}

export function allocateAttempt({
  category,
  gate,
  cycle,
  ordinal,
  controlling = true,
  semanticBase,
  runtimeDirectory,
  retryOf = null,
  retryReason = null,
  retryType = null,
  command = process.execPath,
  commandArgs = process.argv.slice(1),
}) {
  for (const [name, value] of Object.entries({ category, gate, cycle })) {
    requirePass(
      typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value),
      `C34_ATTEMPT_COMPONENT_UNSAFE_${name}_${JSON.stringify(value)}`,
    );
  }
  requirePass(
    Number.isInteger(ordinal) && ordinal >= 1 && ordinal <= 99,
    `C34_ATTEMPT_ORDINAL_UNSAFE_${ordinal}`,
  );
  requirePass(runtimeDirectory, 'C34_ATTEMPT_RUNTIME_DIRECTORY_REQUIRED');
  requirePass(
    semanticBase && (typeof semanticBase === 'string' || Object.keys(semanticBase).length > 0),
    'C34_ATTEMPT_SEMANTIC_BASE_REQUIRED',
  );
  requirePass(
    L.SERVICES.every((name) => fs.existsSync(path.join(runtimeDirectory, name))),
    'C34_ATTEMPT_RUNTIME_DIRECTORY_INCOMPLETE',
  );
  requirePass(
    (retryOf == null) === (retryReason == null)
      && (retryOf == null) === (retryType == null),
    'C34_RETRY_LINK_PAIR_REQUIRED_BEFORE_ALLOCATION',
  );
  const runtime = runtimeFor(runtimeDirectory);
  const registryPath = path.join(RES, 'CANONICAL_ATTEMPT_REGISTRY.json');
  const allocationRegistry = readJson(registryPath);
  validateRetryLink(allocationRegistry, {
    attemptId: null,
    attemptCategory: category,
    gateName: gate,
    cycle,
    attemptOrdinal: ordinal,
    retryOf,
    retryReason,
    retryType,
    runtimeTreeDigest: runtime.servicesTreeDigest,
    semanticBase,
    controlling,
    oracleVersion: 'R3',
    oracleSha256: L.R3_SHA,
  });
  const allocatedAt = now();
  const timestamp = allocatedAt.replace(/[:.]/g, '-');
  const attemptId =
    `R20-${category}-${gate}-${cycle}-ord${String(ordinal).padStart(2, '0')}-${timestamp}`;
  const attemptRoot = path.resolve(ATT);
  const directory = path.resolve(attemptRoot, attemptId);
  requirePass(
    path.dirname(directory) === attemptRoot
      && directory.startsWith(`${attemptRoot}${path.sep}`)
      && attemptId.length <= 120
      && directory.length <= 220,
    `C34_ATTEMPT_PATH_UNSAFE_${attemptId}`,
  );
  requirePass(!fs.existsSync(directory), `C34_ATTEMPT_ID_COLLISION_${attemptId}`);
  const walPath = path.join(RES, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson');
  fs.appendFileSync(
    walPath,
    `${JSON.stringify({
      event: 'ALLOCATION_PLANNED',
      at: allocatedAt,
      attemptId,
      runtimeDirectory: rel(runtimeDirectory),
      semanticBase,
      retryOf,
      retryReason,
      retryType,
    })}\n`,
  );
  fs.mkdirSync(directory, { recursive: false });
  const head = git('rev-parse', 'HEAD').trim();
  const commandEnvelope = JSON.stringify({ command, commandArgs });
  const record = {
    attemptId,
    attemptCategory: category,
    gateName: gate,
    cycle,
    attemptOrdinal: ordinal,
    retryOf,
    retryReason,
    retryType,
    evidenceHeadAtAllocation: head,
    evidenceHeadAtStart: head,
    evidenceHeadAtEnd: null,
    runtimeBaselineCommit: START_HEAD,
    runtimeTreeDigest: runtime.servicesTreeDigest,
    runtimeBlobs: Object.fromEntries(
      L.SERVICES.map((name) => [
        `services/${name}`,
        runtime[`services/${name}`].normalizedLfSha256,
      ]),
    ),
    runtimeRawBlobs: Object.fromEntries(
      L.SERVICES.map((name) => [
        `services/${name}`,
        runtime[`services/${name}`].rawSha256,
      ]),
    ),
    runtimeBytes: Object.fromEntries(
      L.SERVICES.map((name) => [
        `services/${name}`,
        runtime[`services/${name}`].bytes,
      ]),
    ),
    semanticBase,
    executionMode: 'isolated_immutable_runtime_snapshot',
    harnessTreeDigest: harnessDigest(),
    dependencyLockDigest: dependencyDigest(),
    environmentFingerprint: {
      os: process.platform,
      osRelease: os.release(),
      nodeVersion: process.version,
      arch: process.arch,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cwd: REPO,
    },
    command,
    commandArgs,
    commandHash: sha(Buffer.from(commandEnvelope)),
    startedAt: allocatedAt,
    endedAt: null,
    exitCode: null,
    signal: null,
    status: 'running',
    disposition: null,
    controlling,
    stdoutPath: `${rel(directory)}/stdout.txt`,
    stderrPath: `${rel(directory)}/stderr.txt`,
    resultPaths: [],
    oracleVersion: 'R3',
    oracleSha256: L.R3_SHA,
  };
  fs.writeFileSync(
    path.join(directory, 'ATTEMPT.json'),
    `${JSON.stringify(record, null, 2)}\n`,
    { flag: 'wx' },
  );
  fs.writeFileSync(path.join(directory, 'stdout.txt'), '', { flag: 'wx' });
  fs.writeFileSync(path.join(directory, 'stderr.txt'), '', { flag: 'wx' });
  syncAttemptRecord(record);
  fs.appendFileSync(
    walPath,
    `${JSON.stringify({ event: 'ALLOCATION_REGISTERED', at: now(), attemptId })}\n`,
  );
  return { attemptId, dir: directory.replace(/\\/g, '/') + '/', record };
}

export function appendAttemptLog(attempt, stream, message) {
  requirePass(['stdout', 'stderr'].includes(stream), `C34_INVALID_ATTEMPT_STREAM_${stream}`);
  const record = readJson(path.join(attempt.dir, 'ATTEMPT.json'));
  requirePass(record.status === 'running', `C34_ATTEMPT_LOG_AFTER_TERMINAL_${attempt.attemptId}`);
  const file = path.join(attempt.dir, `${stream}.txt`);
  requirePass(fs.existsSync(file), `C34_ATTEMPT_STREAM_MISSING_${rel(file)}`);
  fs.appendFileSync(file, `${String(message).replace(/\r\n/g, '\n')}\n`);
}

export function finalizeAttempt(
  attempt,
  {
    disposition,
    resultPaths = [],
    exitCode = 0,
    signal = null,
    status = 'completed',
  },
) {
  requirePass(
    ['completed', 'technical_failure', 'transient_failure'].includes(status),
    `C34_INVALID_TERMINAL_STATUS_${status}`,
  );
  if (status === 'completed' && attempt.record.controlling !== false) {
    requirePass(resultPaths.length > 0, `C34_COMPLETED_ATTEMPT_WITHOUT_RESULTS_${attempt.attemptId}`);
  }
  const attemptFile = path.join(attempt.dir, 'ATTEMPT.json');
  const priorBytes = fs.readFileSync(attemptFile);
  const priorSha256 = sha(priorBytes);
  const record = JSON.parse(priorBytes.toString('utf8').replace(/^\uFEFF/, ''));
  requirePass(record.status === 'running', `C34_ATTEMPT_NOT_RUNNING_${attempt.attemptId}`);
  for (const item of resultPaths) {
    const absolute = path.resolve(item);
    requirePass(
      absolute.startsWith(path.resolve(RES) + path.sep),
      `C34_ATTEMPT_RESULT_OUTSIDE_RESULTS_${rel(absolute)}`,
    );
    requirePass(fs.existsSync(absolute), `C34_ATTEMPT_RESULT_MISSING_${rel(absolute)}`);
  }
  record.endedAt = now();
  record.exitCode = exitCode;
  record.signal = signal;
  record.status = status;
  record.disposition = disposition;
  record.evidenceHeadAtEnd = git('rev-parse', 'HEAD').trim();
  record.resultPaths = resultPaths.map((item) => rel(item));
  record.stdoutSha256 = sha(fs.readFileSync(path.join(attempt.dir, 'stdout.txt')));
  record.stderrSha256 = sha(fs.readFileSync(path.join(attempt.dir, 'stderr.txt')));
  requirePass(
    sha(fs.readFileSync(attemptFile)) === priorSha256,
    `C34_ATTEMPT_COMPARE_AND_SWAP_CONFLICT_${attempt.attemptId}`,
  );
  writeJsonAtomic(attemptFile, record, priorSha256);
  syncAttemptRecord(record);
  fs.appendFileSync(
    path.join(RES, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson'),
    `${JSON.stringify({
      event: 'ATTEMPT_TERMINAL',
      at: now(),
      attemptId: attempt.attemptId,
      status,
      disposition,
    })}\n`,
  );
  return record;
}

export function executePacket(candidate, baseAnalyze, candidateAnalyze) {
  const normalizeQuery = (query) => String(query).trim().replace(/\s+/g, ' ').toLowerCase();
  const protectedQueries = protectedQueryInventory();
  const frozenQueries = new Set(protectedQueries.map((row) => normalizeQuery(row.query)));
  const dependencyAudit = candidateDependencyAudit(candidate.block);
  const rows = [];
  for (const [category, queries] of Object.entries(candidate.packet)) {
    for (const query of queries) {
      const base = baseAnalyze(query);
      const actual = candidateAnalyze(query);
      const preserve = category === 'nearMisses';
      const pass = preserve
        ? outputSignature(base) === outputSignature(actual)
        : actual.reasonCode === candidate.expectedReason
          && actual.decision === candidate.expectedDecision;
      rows.push({
        candidateId: candidate.id,
        category,
        query,
        expectedStructuralBehavior: preserve
          ? 'preserve active-base behavior'
          : `decision=${candidate.expectedDecision}; reason=${candidate.expectedReason}`,
        base: compactEvidence(base),
        candidate: compactEvidence(actual),
        candidateFiring: outputSignature(base) !== outputSignature(actual),
        pass,
      });
    }
  }
  const counts = Object.fromEntries(
    Object.keys(candidate.packet).map((category) => [
      category,
      candidate.packet[category].length,
    ]),
  );
  const positiveRows = rows.filter((row) => row.category !== 'nearMisses');
  const packetQueries = rows.map((row) => normalizeQuery(row.query));
  const copiedFrozenQueries = [...new Set(
    rows.filter((row) => frozenQueries.has(normalizeQuery(row.query))).map((row) => row.query),
  )];
  const duplicatedQueries = [...new Set(
    packetQueries.filter((query, index) => packetQueries.indexOf(query) !== index),
  )];
  return {
    candidateId: candidate.id,
    requirements: {
      positives: 8,
      substitutions: 8,
      nearMisses: 8,
      constructions: 4,
      fillers: 5,
      skeletons: 5,
      taglish: candidate.taglishApplicable === false ? 0 : 3,
      copiedFrozenQueries: copiedFrozenQueries.length,
      fixtureDependency: 0,
    },
    counts,
    rows,
    executedRows: rows.length,
    passedRows: rows.filter((row) => row.pass).length,
    failedRows: rows.filter((row) => !row.pass),
    positiveCandidateFirings: positiveRows.filter((row) => row.candidateFiring).length,
    copiedFrozenQueries,
    duplicatedQueries,
    noCopiedFrozenQueries: copiedFrozenQueries.length === 0,
    protectedQuerySources: [...new Set(protectedQueries.map((row) => row.source))],
    dependencyAudit,
    noFixtureDependency: dependencyAudit.noFixtureDependency,
    pass: counts.positives >= 8
      && counts.substitutions >= 8
      && counts.nearMisses >= 8
      && counts.constructions >= 4
      && counts.fillers >= 5
      && counts.skeletons >= 5
      && (candidate.taglishApplicable === false || counts.taglish >= 3)
      && rows.every((row) => row.pass)
      && positiveRows.filter((row) => row.candidateFiring).length >= 8
      && copiedFrozenQueries.length === 0
      && duplicatedQueries.length === 0
      && dependencyAudit.pass,
  };
}

export function leaveFamilyOut(candidate, candidateAnalyze) {
  const normalizeQuery = (query) => String(query).trim().replace(/\s+/g, ' ').toLowerCase();
  const protectedQueries = protectedQueryInventory();
  const frozenQueries = new Set(protectedQueries.map((row) => normalizeQuery(row.query)));
  const dependencyAudit = candidateDependencyAudit(candidate.block);
  const records = candidate.leaveFamilyOut.map((query) => {
    const actual = candidateAnalyze(query);
    return {
      query,
      expectedDecision: candidate.expectedDecision,
      expectedReason: candidate.expectedReason,
      actual: compactEvidence(actual),
      copiedFrozenQuery: frozenQueries.has(normalizeQuery(query)),
      pass: actual.decision === candidate.expectedDecision
        && actual.reasonCode === candidate.expectedReason
        && !frozenQueries.has(normalizeQuery(query)),
    };
  });
  return {
    candidateId: candidate.id,
    withheldFamily: candidate.leaveFamilyName,
    developmentCorpusExcluded: dependencyAudit.pass,
    dependencyAudit,
    records,
    pass: records.length >= 5
      && new Set(records.map((record) => normalizeQuery(record.query))).size === records.length
      && records.every((record) => record.pass)
      && dependencyAudit.pass,
  };
}

function signaturesForRows(rows, analyze, inputForRow = (row) => row.query) {
  return rows.map((row) => ({
    recordId: sha(Buffer.from(String(row.query))),
    signature: outputSignature(analyze(inputForRow(row))),
  }));
}

function shuffled(items, seed) {
  const output = [...items];
  let state = seed >>> 0;
  for (let index = output.length - 1; index > 0; index--) {
    state = (1664525 * state + 1013904223) >>> 0;
    const target = state % (index + 1);
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

export function sentinelShuffleAndTaint(candidate, candidateAnalyze, patchText) {
  const r3 = L.loadR3();
  const reasonRows = readJson(L.REASON_SUITE).queries
    .filter((query) => query.controlling !== false)
    .map((query, index) => ({ oracleId: `reason-${index}`, query: query.query }));
  const collisionRows = readJson(L.COLLISION_PROBES).probes
    .map((query, index) => ({ oracleId: `collision-${index}`, query: query.query }));
  const baseline = signaturesForRows(r3, candidateAnalyze);
  const sentinelKinds = [
    'oracleId',
    'queryHash',
    'expectedLabel',
    'expectedReason',
    'expectedDecision',
    'familyName',
    'sourceSet',
    'primaryCategory',
    'rowPosition',
    'fixture',
  ];
  const decoratedInput = (row, kind, sentinel) => {
    const input = new String(row.query);
    Object.defineProperties(input, {
      [kind]: { value: sentinel, enumerable: true },
      [`c34_${kind}`]: { value: sentinel, enumerable: true },
    });
    return input;
  };
  const sentinelRecords = sentinelKinds.map((kind) => {
    const first = signaturesForRows(
      r3,
      candidateAnalyze,
      (row) => decoratedInput(row, kind, `${kind}-sentinel-a-${sha(Buffer.from(row.query)).slice(0, 12)}`),
    );
    const second = signaturesForRows(
      r3,
      candidateAnalyze,
      (row) => decoratedInput(row, kind, `${kind}-sentinel-b-${sha(Buffer.from(row.query)).slice(0, 12)}`),
    );
    return {
      kind,
      records: r3.length,
      primitiveToFirstInvariant: JSON.stringify(first) === JSON.stringify(baseline),
      primitiveToSecondInvariant: JSON.stringify(second) === JSON.stringify(baseline),
      sentinelToSentinelInvariant: JSON.stringify(first) === JSON.stringify(second),
      outputsInvariant: JSON.stringify(first) === JSON.stringify(baseline)
        && JSON.stringify(second) === JSON.stringify(baseline)
        && JSON.stringify(first) === JSON.stringify(second),
      patchSha256: sha(Buffer.from(patchText)),
    };
  });
  const shuffleOne = (name, rows, seed) => {
    const first = signaturesForRows(rows, candidateAnalyze)
      .sort((a, b) => a.recordId.localeCompare(b.recordId));
    const second = signaturesForRows(shuffled(rows, seed), candidateAnalyze)
      .sort((a, b) => a.recordId.localeCompare(b.recordId));
    return {
      name,
      seed,
      records: rows.length,
      outputsInvariant: JSON.stringify(first) === JSON.stringify(second),
      baselineOutputSha256: sha(Buffer.from(JSON.stringify(first))),
      shuffledOutputSha256: sha(Buffer.from(JSON.stringify(second))),
    };
  };
  const shuffleRecords = [
    shuffleOne('R3', r3, 3401),
    shuffleOne('reason_suite_344', reasonRows, 3402),
    shuffleOne('collision_probes_196', collisionRows, 3403),
  ];
  const dependencyAudit = candidateDependencyAudit(candidate.block);
  return {
    sentinel: {
      candidateId: candidate.id,
      records: sentinelRecords,
      pass: sentinelRecords.every((record) => record.outputsInvariant),
    },
    shuffle: {
      candidateId: candidate.id,
      records: shuffleRecords,
      pass: shuffleRecords.every((record) => record.outputsInvariant),
    },
    taint: {
      candidateId: candidate.id,
      forbiddenTerms: dependencyAudit.forbiddenTerms,
      fixtureDependencyFindings: dependencyAudit.fixtureDependencyFindings,
      noFixtureDependency: dependencyAudit.noFixtureDependency,
      pass: dependencyAudit.pass,
    },
  };
}

export async function featureAblation(
  candidate,
  activeBaseDirectory,
  candidateDirectory,
  attemptDirectory,
) {
  const activeSource = fs.readFileSync(
    path.join(activeBaseDirectory, 'philippine-tax-intent-analyzer.js'),
    'utf8',
  );
  const candidateSource = fs.readFileSync(
    path.join(candidateDirectory, 'philippine-tax-intent-analyzer.js'),
    'utf8',
  );
  const lineCounts = (source) => {
    const counts = new Map();
    for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
      if (!line.trim()) continue;
      counts.set(line, (counts.get(line) || 0) + 1);
    }
    return counts;
  };
  const inheritedLines = lineCounts(activeSource);
  const candidateLines = lineCounts(candidateSource);
  const inheritedRemovedLines = [...inheritedLines.entries()]
    .flatMap(([line, count]) =>
      Array(Math.max(0, count - (candidateLines.get(line) || 0))).fill(line));
  const candidateAddedLines = [...candidateLines.entries()]
    .flatMap(([line, count]) =>
      Array(Math.max(0, count - (inheritedLines.get(line) || 0))).fill(line));
  const ablatedDirectory = path.join(attemptDirectory, 'ablation', 'feature-removed');
  copyRuntime(activeBaseDirectory, ablatedDirectory);
  const candidateAnalyze = await loadAnalyzerFrom(candidateDirectory, 'c34-ablation-candidate');
  const ablatedAnalyze = await loadAnalyzerFrom(ablatedDirectory, 'c34-ablation-removed');
  const probes = [
    ...candidate.packet.positives,
    ...candidate.packet.substitutions,
    ...candidate.leaveFamilyOut,
  ].map((query) => {
    const candidateEvidence = candidateAnalyze(query);
    const ablatedEvidence = ablatedAnalyze(query);
    return {
      query,
      candidate: compactEvidence(candidateEvidence),
      featureRemoved: compactEvidence(ablatedEvidence),
      distinctionObserved:
        candidateEvidence.reasonCode === candidate.expectedReason
        && candidateEvidence.decision === candidate.expectedDecision
        && outputSignature(candidateEvidence) !== outputSignature(ablatedEvidence),
    };
  });
  const candidateIdentity = runtimeFor(candidateDirectory);
  const ablatedIdentity = runtimeFor(ablatedDirectory);
  const [candidateGates, featureRemovedGates] = await Promise.all([
    directGatesForDirectory(candidateDirectory),
    directGatesForDirectory(ablatedDirectory),
  ]);
  const rowEffect = collectRows(ablatedAnalyze, candidateAnalyze);
  return {
    candidateId: candidate.id,
    activeBaseIdentity: runtimeFor(activeBaseDirectory),
    candidateIdentity,
    ablatedIdentity,
    candidateAddedLines,
    inheritedRemovedLines,
    candidateGates,
    featureRemovedGates,
    rowEffect: {
      newlyCorrected: rowEffect.newlyCorrected,
      newlyRegressed: rowEffect.newlyRegressed,
      wrongToDifferentWrong: rowEffect.wrongToDifferentWrong,
    },
    probes,
    distinguishedProbeCount: probes.filter((probe) => probe.distinctionObserved).length,
    candidateChangesRuntime: candidateIdentity.servicesTreeDigest
      !== ablatedIdentity.servicesTreeDigest,
    noInheritedFeatureRemoval: inheritedRemovedLines.length === 0,
    pass: candidateAddedLines.length > 0
      && inheritedRemovedLines.length === 0
      && probes.filter((probe) => probe.distinctionObserved).length >= 8
      && candidateIdentity.servicesTreeDigest !== ablatedIdentity.servicesTreeDigest
      && sameRuntime(ablatedIdentity, runtimeFor(activeBaseDirectory))
      && candidateGates.frozenLocksHeld
      && featureRemovedGates.frozenLocksHeld
      && rowEffect.newlyCorrected.length > 0
      && rowEffect.newlyRegressed.length === 0
      && rowEffect.wrongToDifferentWrong.length === 0,
  };
}

export async function directGatesForDirectory(directory) {
  const analyze = await loadAnalyzerFrom(directory, 'c34-direct-gates');
  const rows = L.loadR3();
  const scoredR3 = L.scoreR3(rows, analyze);
  const reasonCounterfactual = L.runReasonCounterfactuals(analyze);
  const collisionProbes = L.runCollisionProbes(analyze);
  const decisionCounterfactual = L.runCounterfactuals(analyze);
  const relationCounterfactual = L.runRelationCounterfactuals(analyze);
  const clauseProbes = L.runClauseProbes(analyze);
  const richContextGuard = L.richContextGuard(analyze);
  const reasonIntegrity = L.reasonIntegrity(rows, analyze);
  const focusedReasonRegression = L.focusedReasonRegression(rows, analyze);
  const closedControls = L.closedControls(rows, analyze);
  const integrityQueries = rows.slice(0, 400).map((row) => row.query);
  const relationObjectIntegrity = L.relationObjectIntegrity(analyze, integrityQueries);
  const clauseSchemaRegression = L.clauseSchemaRegression(analyze, integrityQueries);
  const antiMemorization = L.antiMemorization(
    path.join(directory, 'philippine-tax-intent-analyzer.js'),
    rows,
  );
  const r3 = scoredR3.counts;
  const decisionLockHeld = r3.decisionMismatches === 0
    && r3.materialFalseAllows === 0
    && r3.materialFalseRefusals === 0
    && r3.clarifyMismatches === 0
    && decisionCounterfactual.passed === decisionCounterfactual.total
    && closedControls.allClosed
    && richContextGuard.allPass
    && antiMemorization.pass;
  const relationLockHeld = r3.relationMismatches === 0
    && relationCounterfactual.failed === 0
    && clauseProbes.failed === 0
    && clauseSchemaRegression.pass;
  const value = {
    canonicalPassed: r3.canonicalPassed,
    decisionPassed: r3.decisionPassed,
    relationPassed: r3.relationPassed,
    reasonPassed: 3720 - r3.reasonMismatches,
    reasonMismatches: r3.reasonMismatches,
    materialFalseAllows: r3.materialFalseAllows,
    materialFalseRefusals: r3.materialFalseRefusals,
    clarifyMismatches: r3.clarifyMismatches,
    reasonCounterfactualPassed: reasonCounterfactual.passed,
    reasonCounterfactualTotal: reasonCounterfactual.total,
    reasonCounterfactualFailed: reasonCounterfactual.failed,
    collisionProbesPassed: collisionProbes.passed,
    collisionProbesTotal: collisionProbes.total,
    collisionProbesFailed: collisionProbes.failed,
    decisionCounterfactualPassed: decisionCounterfactual.passed,
    decisionCounterfactualTotal: decisionCounterfactual.total,
    decisionCounterfactualFailed: decisionCounterfactual.failed,
    relationCounterfactualPassed: relationCounterfactual.passed,
    relationCounterfactualTotal: relationCounterfactual.total,
    relationCounterfactualFailed: relationCounterfactual.failed,
    clauseProbesPassed: clauseProbes.passed,
    clauseProbesTotal: clauseProbes.total,
    clauseProbesFailed: clauseProbes.failed,
    richContextGuardPassed: richContextGuard.passed,
    richContextGuardTotal: richContextGuard.total,
    reasonIntegrityPass: reasonIntegrity.pass,
    focusedReasonFamilies: focusedReasonRegression.perFamily,
    closedControlsPass: closedControls.allClosed,
    relationObjectIntegrityPass: relationObjectIntegrity.pass,
    clauseSchemaRegressionPass: clauseSchemaRegression.pass,
    antiMemorizationPass: antiMemorization.pass,
    decisionLockHeld,
    relationLockHeld,
  };
  const gates = {
    runtimeIdentity: runtimeFor(directory),
    r3,
    reasonPassed: value.reasonPassed,
    decisionFailures: scoredR3.decisionFailures,
    relationFailures: scoredR3.relationFailures,
    reasonCounterfactual,
    collisionProbes,
    decisionCounterfactual,
    relationCounterfactual,
    clauseProbes,
    richContextGuard,
    reasonIntegrity,
    focusedReasonRegression,
    closedControls,
    relationObjectIntegrity,
    clauseSchemaRegression,
    antiMemorization,
    decisionLockHeld,
    relationLockHeld,
  };
  return {
    metrics: value,
    gates,
    structuralDiagnostics: {
      relationObjectIntegrityCounts: relationObjectIntegrity.counts,
      clauseSchemaRegressionCounts: clauseSchemaRegression.counts,
    },
    frozenLocksHeld: frozenLocksHeld(value)
      && value.closedControlsPass
      && value.clauseSchemaRegressionPass
      && value.antiMemorizationPass
      && value.decisionLockHeld
      && value.relationLockHeld,
    antiMemorization,
  };
}
