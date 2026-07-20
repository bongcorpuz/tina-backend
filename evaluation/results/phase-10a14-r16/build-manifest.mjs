// PHASE-10A14-R16 — final self-excluding evidence manifest.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = "evaluation/results/phase-10a14-r16";
const NAME = process.argv[2] || "EVIDENCE_MANIFEST.sha256";
const mp = path.join(ROOT, NAME);

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

const files = walk(ROOT)
  .filter((f) => path.resolve(f) !== path.resolve(mp))
  .filter((f) => !/\.sha256$/.test(path.basename(f)))
  .sort();

const seen = new Set();
let duplicates = 0;
const lines = files.map((f) => {
  const rel = f.split(path.sep).join("/");
  if (seen.has(rel)) duplicates++;
  seen.add(rel);
  return `${crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex")}  ${rel}`;
});

fs.writeFileSync(mp, lines.join("\n") + "\n");

let ok = 0, mismatched = 0, missing = 0;
for (const line of fs.readFileSync(mp, "utf8").split("\n").filter(Boolean)) {
  const [h, f] = line.split(/\s{2}/);
  if (!fs.existsSync(f)) { missing++; continue; }
  if (crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex") === h) ok++; else mismatched++;
}

console.log(`${NAME}: ${lines.length} files, verified=${ok} mismatched=${mismatched} missing=${missing} duplicates=${duplicates}`);
if (mismatched || missing || duplicates) process.exit(1);
