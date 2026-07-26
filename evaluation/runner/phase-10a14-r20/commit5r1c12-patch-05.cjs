// PHASE-10A14-R20 COMMIT 5R1-C12 — iteration 05 (final material iteration).
//
// Two defects in the labelBinding expression:
//  (1) the subordinate-clause alternation omits "under" and "with", so
//      "filed it under a project code" is not recognised as subordinate;
//  (2) operator precedence: `!(...) && A || B || C` binds as `(!(...) && A) || B || C`,
//      so the negation only guards the first alternative and the remaining alternatives
//      can still set labelBinding. The alternation must be parenthesised as a whole.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
const lines = fs.readFileSync(p, 'utf8').split('\n');

const i = lines.findIndex((l) => l.startsWith('  const labelBinding = !('));
if (i < 0) throw new Error('labelBinding line not found');

const SUB = '/\\b(?:even though|although|though|when|while|if)\\b[^?]*\\b(?:filed|booked|stored|tagged|labelled|labeled|bears|carries|under|with)\\b[^?]*\\b(?:code|tag)\\b/i.test(fullLo)';
const PRED = '/\\b(?:deductib\\w*|taxab\\w*|dutiable|subject to (?:vat|tax|withholding|customs))\\b/i.test(fullLo)';

lines[i] = '  const labelBinding = !(' + SUB + ' && ' + PRED + ')'
  + ' && (namingActionAnyClause || filenameBinding || columnOrFieldBinding || (labelNoun.test(fullLo)';

// The alternation now opens one extra paren; close it on the final alternative line.
const tail = lines.findIndex((l, n) => n > i && l.includes("|| /\\bas the (?:report|file|variable|product|project|server|channel|team|course|training)\\b/.test(fullLo)"));
if (tail < 0) throw new Error('labelBinding tail not found');
if (!/\)\)\);\s*$/.test(lines[tail])) throw new Error('unexpected tail shape: ' + lines[tail].slice(-24));
lines[tail] = lines[tail].replace(/\)\)\);\s*$/, '))));');

fs.writeFileSync(p, lines.join('\n'));
console.log('fixed labelBinding subordinate alternation and precedence');
