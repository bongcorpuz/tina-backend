// PHASE-10A14-R20 COMMIT 5R1-C16 iteration 05 — narrowing two over-broad C15 rules
// against measured evidence.
//
// (a) §9E: the object of ambiguity controls. The C15 "raised topic is a homograph" list
//     included `return`, `assessment` and `books`, which in a raised-topic frame are
//     ordinary tax-domain topics rather than materially ambiguous terms. R3 explains
//     those rows by the absent relation, not by acronym ambiguity. The list is narrowed
//     to terms with a genuine live NON-TAX sense.
//
// (b) §9F/R3: a text operation must act on a TERM. "Translate <ordinary noun phrase>
//     into plain English" operates on subject matter, not on a quoted term, so the
//     C15 rule is narrowed to require an explicit term marker or a tax-shaped token.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// --- (a) narrow the ambiguous-topic list ---------------------------------------
const a1 = `  const raisedTopicIsHomograph = /\\b(?:customs|estate|receipt|invoice|authority to print|books|return|prescription|assessment)\\b/i.test(raisedTopic)
    && !/\\b(?:gross|professional|filing|deficiency|withholding|input|output|percentage|documentary|capital)\\b/i.test(raisedTopic);`;
if (!s.includes(a1)) throw new Error('ANCHOR_MISS raisedTopicIsHomograph');
s = s.replace(a1, `  // Narrowed after measurement: a topic is materially ambiguous only when the term has
  // a live NON-TAX sense (customs/traditions, estate/property, receipt/proof, invoice,
  // authority to print, prescription/medicine). "return", "assessment" and "books" in a
  // raised-topic frame are ordinary tax-domain topics, and R3 explains those rows by the
  // absent relation rather than by ambiguity of the term.
  const raisedTopicIsHomograph = /\\b(?:customs|estate|receipt|invoice|authority to print|prescription)\\b/i.test(raisedTopic)
    && !/\\b(?:gross|professional|filing|deficiency|withholding|input|output|percentage|documentary|capital)\\b/i.test(raisedTopic);`);

// --- (b) a text operation must act on a TERM ------------------------------------
const b1 = `    && /\\binto plain english\\b|\\bthe (?:phrase|word|term)\\b/i.test(primaryTextLo)
    && !reasonOperandIsDocument;`;
if (!s.includes(b1)) throw new Error('ANCHOR_MISS textOperationOverTerm');
s = s.replace(b1, `    && /\\bthe (?:phrase|word|term)\\b/i.test(primaryTextLo)
    && !reasonOperandIsDocument;`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-05 applied; bytes', before.length, '->', s.length);
