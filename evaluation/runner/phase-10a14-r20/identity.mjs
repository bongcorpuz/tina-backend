// PHASE-10A14-R20 governed tooling — identity capture.
// Deterministic runtime/harness identity from Git objects and environment.
// NO tax-domain decision logic. Reporting/identity only.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const REPO = 'C:/Projects/tina-backend';

function git(args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();
}

export function sha256File(absPath) {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

export function sha256Str(s) {
  return createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
}

export function gitObject(rev) {
  try { return git(['rev-parse', rev]); } catch { return 'ABSENT'; }
}

export function objectType(sha) {
  try { return git(['cat-file', '-t', sha]); } catch { return 'MISSING'; }
}

// Content digest of a tree's `ls-tree` listing (stable ordering by git).
export function treeContentDigest(pathSpec) {
  const listing = git(['ls-tree', '-r', 'HEAD', pathSpec]);
  return sha256Str(listing);
}

export function captureRuntimeIdentity() {
  return {
    startingCommit: gitObject('HEAD'),
    servicesTreeObject: gitObject('HEAD:services'),
    servicesTreeContentDigest: treeContentDigest('services'),
    runtimeBlobs: {
      'services/philippine-tax-boundary-patterns.js': gitObject('HEAD:services/philippine-tax-boundary-patterns.js'),
      'services/philippine-tax-domain-boundary.js': gitObject('HEAD:services/philippine-tax-domain-boundary.js'),
      'services/philippine-tax-intent-analyzer.js': gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
    },
    dependencyLock: {
      'package-lock.json': gitObject('HEAD:package-lock.json'),
      'package.json': gitObject('HEAD:package.json'),
    },
  };
}

export function captureHarnessIdentity() {
  return {
    testsTree: gitObject('HEAD:tests'),
    runnerTreeAtCommit1: '850ad78b9e094aa2288756d58b40838286d50fe6',
    governedToolingContentDigest: treeContentDigest('evaluation/runner/phase-10a14-r20'),
  };
}

export function captureEnvironmentFingerprint() {
  return {
    os: process.platform,
    osRelease: process.release?.name || 'node',
    nodeVersion: process.version,
    arch: process.arch,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cwd: REPO,
    // secrets deliberately excluded
  };
}

export function dependencyLockDigest() {
  return sha256File(`${REPO}/package-lock.json`);
}
