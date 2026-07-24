// PHASE-10A14-R20 — build self-excluding COMMIT 2 evidence manifest.
// Enumerates every file under evaluation/results/phase-10a14-r20/ (recursively)
// and writes SHA-256 lines, EXCLUDING the manifest file itself.

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO, sha256File } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const MANIFEST_REL = 'evaluation/results/phase-10a14-r20/COMMIT_2_EVIDENCE_MANIFEST.sha256';

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk(R20)
  .map((p) => p.replace(/\\/g, '/'))
  .filter((p) => relative(REPO, p).replace(/\\/g, '/') !== MANIFEST_REL)
  .sort();

const lines = files.map((abs) => {
  const rel = relative(REPO, abs).replace(/\\/g, '/');
  return `${sha256File(abs)}  ${rel}`;
});

writeFileSync(join(R20, 'COMMIT_2_EVIDENCE_MANIFEST.sha256'), lines.join('\n') + '\n');
console.log(`manifest: ${lines.length} files (self-excluded)`);
