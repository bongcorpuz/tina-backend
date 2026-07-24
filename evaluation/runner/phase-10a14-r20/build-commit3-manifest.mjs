// PHASE-10A14-R20 — build self-excluding COMMIT 3 evidence manifest.
// Covers the R20 results tree, the new analyzer, and the focused tests.
// Excludes itself and the immutable COMMIT_2 manifest. No protected paths.

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO, sha256File } from './identity.mjs';

const MANIFEST_REL = 'evaluation/results/phase-10a14-r20/COMMIT_3_EVIDENCE_MANIFEST.sha256';

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const roots = [
  join(REPO, 'evaluation/results/phase-10a14-r20'),
  join(REPO, 'services/philippine-tax-intent-analyzer.js'),
  join(REPO, 'tests/phase-10a14-r20'),
];

const files = [];
for (const r of roots) {
  if (statSync(r).isDirectory()) files.push(...walk(r));
  else files.push(r);
}

const rels = files
  .map((p) => relative(REPO, p).replace(/\\/g, '/'))
  .filter((rel) => rel !== MANIFEST_REL) // self-exclusion
  .sort();

const lines = rels.map((rel) => `${sha256File(join(REPO, rel))}  ${rel}`);
writeFileSync(join(REPO, MANIFEST_REL), lines.join('\n') + '\n');
console.log(`COMMIT 3 manifest: ${lines.length} files (self-excluded; COMMIT_2 manifest left untouched)`);
