// PHASE-10A14-R20 — build self-excluding COMMIT 5R1-C5 evidence manifest.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO, sha256File } from './identity.mjs';

const MANIFEST_REL = 'evaluation/results/phase-10a14-r20/COMMIT_5R1C5_EVIDENCE_MANIFEST.sha256';
function walk(dir, acc = []) { for (const e of readdirSync(dir)) { const p = join(dir, e); if (statSync(p).isDirectory()) walk(p, acc); else acc.push(p); } return acc; }

const roots = [join(REPO, 'evaluation/results/phase-10a14-r20'), join(REPO, 'evaluation/runner/phase-10a14-r20')];
const files = [];
for (const r of roots) files.push(...walk(r));
files.push(join(REPO, 'knowledge/CURRENT_STATE.md'));
const rels = files.map((p) => relative(REPO, p).replace(/\\/g, '/')).filter((rel) => rel !== MANIFEST_REL).sort();
const lines = rels.map((rel) => `${sha256File(join(REPO, rel))}  ${rel}`);
writeFileSync(join(REPO, MANIFEST_REL), lines.join('\n') + '\n');
console.log(`COMMIT 5R1-C5 manifest: ${lines.length} files (self-excluded)`);
