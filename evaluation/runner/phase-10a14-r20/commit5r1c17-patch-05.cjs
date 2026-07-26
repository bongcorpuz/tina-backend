// PHASE-10A14-R20 COMMIT 5R1-C17 iteration 05 — two enriched separable vectors.
//
// (a) n=23  rel=NAMES_AS_INTERNAL_LABEL assert=naming_assertion -> non_tax_label_or_name
//     "The phrase <code> is only an internal label." The label relation is already
//     emitted and the assertion class is a naming assertion, yet the generic non-tax
//     branch explains the refusal. §10B: the primary act ASSIGNS/reports a label, so the
//     label family controls. The C16 guard requires !reasonRequestsOperation, which this
//     shape satisfies, but an earlier branch returns first.
//
// (b) n=11  rel=REQUESTS_NON_TAX_ACTION_ON outcome=transformation ambiguityObject=acronym
//           -> quoted_tax_term_only
//     "Translate <expansion> <ACRONYM> into plain English." A transformation whose
//     operand is a recognised acronym treats that token AS TEXT, which is a quotation
//     act. The C16 rule required an explicit "the phrase/word/term" marker, so an
//     acronym operand was missed.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// ---- (b) a transformation over a recognised acronym is a quotation act ----------
const b1 = `  const textOperationOverTerm = /^(?:translate|spell|repeat|alphabeti[sz]e|proofread|capitali[sz]e|reverse|count the (?:letters?|words?))\\b/i.test(primaryTextLo)`;
if (!s.includes(b1)) throw new Error('ANCHOR_MISS textOperationOverTerm');
s = s.replace(b1, `  // C17 — a transformation whose operand is a RECOGNISED ACRONYM handles that token as
  // text, which is a quotation act. The term marker is one way to signal a term operand;
  // a bare acronym operand is another.
  const c17AcronymOperand = RECOGNIZED_TAX_ACRONYM_RE.test(primaryTextLo);
  const textOperationOverTerm = /^(?:translate|spell|repeat|alphabeti[sz]e|proofread|capitali[sz]e|reverse|count the (?:letters?|words?))\\b/i.test(primaryTextLo)`);

const b2 = `    && /\\bthe (?:phrase|word|term)\\b/i.test(primaryTextLo)
    && !reasonOperandIsDocument;`;
if (!s.includes(b2)) throw new Error('ANCHOR_MISS term marker');
s = s.replace(b2, `    && (/\\bthe (?:phrase|word|term)\\b/i.test(primaryTextLo) || c17AcronymOperand)
    && !reasonOperandIsDocument;`);

// ---- (a) an asserted naming act reaches the label family ------------------------
const a1 = `    // C17 P4 — an EXPLICIT DENIAL of tax relevance, with no tax review requested, is a`;
if (!s.includes(a1)) throw new Error('ANCHOR_MISS P4 branch');
s = s.replace(a1, `    // C17 (§10B) — an ASSERTED naming act is explained by the label relation. The
    // relation is already emitted; the assertion class confirms the primary act reports
    // what something is called rather than requesting an operation on it.
    if (namesLabel && evidence.assertsNamingAct && !evidence.reasonRequestsOperation) {
      return decide('REFUSE', 'non_tax_label_or_name', 0.90);
    }
    // C17 P4 — an EXPLICIT DENIAL of tax relevance, with no tax review requested, is a`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-05 applied; bytes', before.length, '->', s.length);
