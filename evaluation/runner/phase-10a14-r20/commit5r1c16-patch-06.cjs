// PHASE-10A14-R20 COMMIT 5R1-C16 iteration 06 — §9D: the requested OUTCOME controls
// the compliance family.
//
// R3 explains "What BIR form applies to X", "Is the transaction subject to BIR
// registration" and "What penalty applies for late X" as tax_compliance_task: in each
// the requested outcome is a form, a registration status or a penalty — a procedural
// compliance act — even though no filing verb appears.
//
// The C15 procedural frame was deliberately narrowed to explicit filing/remittance
// wording after "what records support X" proved to be TREATMENT rather than compliance.
// That finding is preserved (§9D): substantiation wording is still excluded, and only
// the three outcome forms measured above are added.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

const anchor = `  const proceduralComplianceFrame = /\\b(?:deadline|due date)\\b[^?.!]*\\b(?:for|sa)\\b[^?.!]*\\b(?:filing|file|remit\\w*|payment|registration|return)\\b/i.test(primaryTextLo)
    || /\\bdeadline for remitting\\b/i.test(primaryTextLo)
    || /\\bpag-?file\\b/i.test(primaryTextLo);`;
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS proceduralComplianceFrame');

const replacement = `  const proceduralComplianceFrame = /\\b(?:deadline|due date)\\b[^?.!]*\\b(?:for|sa)\\b[^?.!]*\\b(?:filing|file|remit\\w*|payment|registration|return)\\b/i.test(primaryTextLo)
    || /\\bdeadline for remitting\\b/i.test(primaryTextLo)
    || /\\bpag-?file\\b/i.test(primaryTextLo)
    // C16 §9D — the requested OUTCOME controls. Asking which form applies, whether
    // registration is required, or what penalty attaches to late compliance are all
    // procedural compliance acts, whatever verb carries them. Substantiation wording
    // ("what records support X") stays excluded: C15 measured it as treatment.
    || /\\bwhat (?:bir )?form applies\\b|\\bwhich (?:bir )?form applies\\b/i.test(primaryTextLo)
    || /\\bsubject to (?:bir )?registration\\b/i.test(primaryTextLo)
    || /\\bwhat penalty applies\\b/i.test(primaryTextLo);`;
s = s.replace(anchor, replacement);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-06 applied; bytes', before.length, '->', s.length);
