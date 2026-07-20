// PHASE-10A14-R15 — self-excluding evidence manifest.
// Usage: node evaluation/results/phase-10a14-r15/build-manifest.mjs [manifestName]
// Hashes every file under the R15 evidence tree EXCEPT the manifest being written and
// any sibling .sha256 manifest. Historical R13/R14 evidence is referenced, never rehashed.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = "evaluation/results/phase-10a14-r15";
const name = process.argv[2] || "EVIDENCE_MANIFEST.sha256";
const manifestPath = path.join(ROOT, name);

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

const files = walk(ROOT)
  .filter((f) => path.resolve(f) !== path.resolve(manifestPath))
  .filter((f) => !/\.sha256$/.test(path.basename(f)))
  .sort();

const seen = new Set(); let duplicates = 0;
const lines = files.map((f) => {
  const rel = f.replace(/\\/g, "/");
  if (seen.has(rel)) duplicates++;
  seen.add(rel);
  return `${crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex")}  ${rel}`;
});

fs.writeFileSync(manifestPath, lines.join("\n") + "\n");
console.log(`${name}: ${lines.length} files hashed (self-excluded), duplicates=${duplicates}`);

// Immediate self-validation
let ok = 0, bad = 0, missing = 0;
for (const line of fs.readFileSync(manifestPath, "utf8").split("\n").filter(Boolean)) {
  const [h, f] = line.split(/\s{2}/);
  if (!fs.existsSync(f)) { missing++; continue; }
  if (crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex") === h) ok++; else bad++;
}
console.log(`validation: verified=${ok} mismatched=${bad} missing=${missing}`);
if (bad || missing || duplicates) process.exit(1);
