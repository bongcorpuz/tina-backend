// PHASE-10A14-R20 — build self-excluding COMMIT 4 evidence manifest.
// Covers the frozen oracle tree, the R20 results tree and the R20 runner tooling.
// Excludes itself; leaves COMMIT_2 / COMMIT_3 manifests intact (still listed as
// files, just not regenerated). No protected paths.

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO, sha256File } from './identity.mjs';

const MANIFEST_REL = 'evaluation/results/phase-10a14-r20/COMMIT_4_EVIDENCE_MANIFEST.sha256';

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const roots = [
  join(REPO, 'evaluation/oracles/phase-10a14-r20'),
  join(REPO, 'evaluation/results/phase-10a14-r20'),
  join(REPO, 'evaluation/runner/phase-10a14-r20'),
];

const files = [];
for (const r of roots) files.push(...walk(r));

const rels = files
  .map((p) => relative(REPO, p).replace(/\\/g, '/'))
  .filter((rel) => rel !== MANIFEST_REL) // self-exclusion
  .sort();

const lines = rels.map((rel) => `${sha256File(join(REPO, rel))}  ${rel}`);
writeFileSync(join(REPO, MANIFEST_REL), lines.join('\n') + '\n');
console.log(`COMMIT 4 manifest: ${lines.length} files (self-excluded)`);
