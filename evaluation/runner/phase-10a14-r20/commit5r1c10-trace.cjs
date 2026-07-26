// PHASE-10A14-R20 COMMIT 5R1-C10 — diagnostic tracer (analysis only, not a runtime file).
// Writes an instrumented copy inside the repo runner directory, never over services/.
const fs = require('fs');
const src = fs.readFileSync('services/philippine-tax-intent-analyzer.js', 'utf8');
const start = src.indexOf('export function decideTaxBoundaryFromEvidence');
const end = src.indexOf('\n// ', start + 50);
let body = src.slice(start, end);
let n = 0;
body = body.replace(/return decide\(/g, () => {
  n++;
  return `return (globalThis.__RULE=${n}, decide)(`;
});
const out = 'evaluation/runner/phase-10a14-r20/.c10trace.mjs';
fs.writeFileSync(out, src.slice(0, start) + body + src.slice(end));
console.log('instrumented decide sites:', n, '->', out);
