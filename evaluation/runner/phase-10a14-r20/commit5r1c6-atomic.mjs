// PHASE-10A14-R20 COMMIT 5R1-C6 — atomic source-write protocol. Writes replacement to a
// sibling temp file INSIDE the repo, verifies non-zero + parses + exports the expected
// symbols + SHA-256, then atomically renames over the destination and re-verifies. Never
// uses the global scratchpad Temp dir as the authoritative source-write path.
import { writeFileSync, readFileSync, renameSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }

export function guardRuntimeFiles(repo) {
  const files = ['services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js'];
  const out = {};
  for (const f of files) {
    const p = `${repo}/${f}`;
    if (!existsSync(p)) throw new Error(`GUARD: missing ${f}`);
    const sz = statSync(p).size;
    if (sz <= 0) throw new Error(`GUARD: zero-byte ${f}`);
    out[f] = { size: sz, sha256: sha256(readFileSync(p)) };
  }
  return out;
}

// Atomically replace `destAbs` with `content`. Verifies temp, then dest.
export async function atomicReplaceSource(destAbs, content, requiredExports = ['analyzePhilippineTaxIntent', 'decideTaxBoundaryFromEvidence']) {
  // Use a .mjs temp so Node can import it for parse/export verification before rename.
  const tmp = `${destAbs}.c6tmp.mjs`;
  writeFileSync(tmp, content, 'utf8');
  const tmpSize = statSync(tmp).size;
  if (tmpSize <= 0) throw new Error('ATOMIC: temp is zero bytes');
  const tmpSha = sha256(readFileSync(tmp));
  // parse + export check via import
  const mod = await import(pathToFileURL(tmp).href + `?v=${Date.now()}-${Math.random()}`);
  for (const sym of requiredExports) if (typeof mod[sym] !== 'function') throw new Error(`ATOMIC: temp missing export ${sym}`);
  // atomic rename over destination
  renameSync(tmp, destAbs);
  const destSize = statSync(destAbs).size;
  if (destSize <= 0) throw new Error('ATOMIC: dest is zero bytes after rename');
  const destSha = sha256(readFileSync(destAbs));
  if (destSha !== tmpSha) throw new Error('ATOMIC: dest SHA != verified temp SHA');
  const destMod = await import(pathToFileURL(destAbs).href + `?v=${Date.now()}-${Math.random()}`);
  for (const sym of requiredExports) if (typeof destMod[sym] !== 'function') throw new Error(`ATOMIC: dest missing export ${sym}`);
  return { size: destSize, sha256: destSha };
}
