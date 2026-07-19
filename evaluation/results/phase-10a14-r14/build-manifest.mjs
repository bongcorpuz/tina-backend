// PHASE-10A14-R14 — self-excluding evidence manifest builder.
// Usage: node evaluation/results/phase-10a14-r14/build-manifest.mjs <manifestName>
// Hashes every file under the R14 evidence tree EXCEPT the manifest being written.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = "evaluation/results/phase-10a14-r14";
const manifestName = process.argv[2] || "EVIDENCE_MANIFEST.sha256";
const manifestPath = path.join(ROOT, manifestName);

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(ROOT)
  .filter((f) => path.resolve(f) !== path.resolve(manifestPath))
  .filter((f) => !/\.sha256$/.test(path.basename(f))) // never hash sibling manifests
  .sort();

const lines = files.map((f) => {
  const h = crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  return `${h}  ${f.replace(/\\/g, "/")}`;
});

fs.writeFileSync(manifestPath, lines.join("\n") + "\n");
console.log(`${manifestName}: ${lines.length} files hashed (self-excluded)`);
