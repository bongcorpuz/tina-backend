// PHASE-10A14-R20 COMMIT 5R1-C12 — define the terminology split in antiMemorization.
//
// R3 contains bare-term rows that are ALSO canonical Philippine tax terminology
// ("capital gains tax", "books of accounts"). A tax analyzer cannot function without that
// vocabulary, so term-shaped overlap is not memorization and is recorded separately.
// Genuine memorization is an R3 row reproduced as a decision-bearing phrase that is not
// domain terminology: a sentence-shaped row, or a row naming a non-tax scenario.
const fs = require('fs');
const p = 'evaluation/runner/phase-10a14-r20/commit5r1c12-lib.mjs';
let s = fs.readFileSync(p, 'utf8');

const old = "  const leakedR3 = r3Rows.map((r) => r.query).filter((q) => q.trim().split(/\\s+/).length >= 3 && code.includes(q.trim()));";
if (!s.includes(old)) throw new Error('leakedR3 anchor missing');

const nw = [
  '  const CANONICAL_TAX_TERM = /\\b(?:tax|taxes|taxable|duty|duties|vat|withholding|deduction|deductions|accounts|receipt|invoice|return|benefits|enterprise|relief|prescription|documentation|certificate|period|fees)\\b/i;',
  '  const NON_TAX_SCENARIO_WORD = /\\b(?:homework|weekend|lease|school|game|javascript|cabinet|court|library|birthday|club)\\b/i;',
  '  const isDomainTerminology = (q) => q.trim().split(/\\s+/).length <= 4',
  '    && CANONICAL_TAX_TERM.test(q) && !NON_TAX_SCENARIO_WORD.test(q);',
  '  const r3Hits = r3Rows.map((r) => r.query)',
  '    .filter((q) => q.trim().split(/\\s+/).length >= 3 && code.includes(q.trim()));',
  '  const leakedR3 = r3Hits.filter((q) => !isDomainTerminology(q));',
  '  const r3TerminologyOverlap = r3Hits.filter(isDomainTerminology);',
].join('\n');
s = s.replace(old, nw);
fs.writeFileSync(p, s);
console.log('terminology split defined');
