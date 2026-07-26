// PHASE-10A14-R20 COMMIT 5R1-C15 iteration 05 — label and quotation families reach
// their controlling explanation.
//
// (a) "The phrase <X> is only an internal label" emits NAMES_AS_INTERNAL_LABEL, but the
//     generic non-tax-action branch fires first and explains the refusal as an action.
//     The naming ASSERTION is the request, so the label family controls (§8C).
// (b) "Translate <term> into plain English" operates on the TERM as text. That is a
//     quotation/text-only operation, explained by quoted_tax_term_only, not by a
//     generic non-tax action (§8C).
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// --- evidence -------------------------------------------------------------------
const evAnchor = `  const asksAboutAmbiguousTopic = /\\bwhat about\\b/i.test(primaryTextLo) && raisedTopicIsHomograph;`;
if (!s.includes(evAnchor)) throw new Error('ANCHOR_MISS asksAboutAmbiguousTopic');
const evNew = evAnchor + `
  // C15 — an ASSERTED naming act: the request states what something is called rather
  // than asking for an action on it. "The phrase X is only an internal label."
  const assertsNamingAct = /\\b(?:is (?:only |just )?(?:an?|our) (?:internal )?(?:label|name|code|codename|project code)|is only a (?:label|name|code)|code-?named|is called)\\b/i.test(primaryTextLo);
  // C15 — a TEXT OPERATION over a named term treats the term as text rather than as
  // subject matter: translating, spelling or repeating the term itself.
  const textOperationOverTerm = /^(?:translate|spell|repeat|alphabeti[sz]e|proofread|capitali[sz]e|reverse|count the (?:letters?|words?))\\b/i.test(primaryTextLo)
    && /\\binto plain english\\b|\\bthe (?:phrase|word|term)\\b/i.test(primaryTextLo);`;
s = s.replace(evAnchor, evNew);

const bagAnchor = `asksAboutShortToken, asksAboutAmbiguousTopic, raisesTopicWithoutRelation,`;
if (!s.includes(bagAnchor)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bagAnchor, `asksAboutShortToken, asksAboutAmbiguousTopic, raisesTopicWithoutRelation, assertsNamingAct, textOperationOverTerm,`);

// --- decision: both families are tested before the generic non-tax branches -----
const anchorA = `  // C15 reason lane — an ASSERTED naming act is explained by the label relation even`;
if (!s.includes(anchorA)) throw new Error('ANCHOR_MISS iteration-04 label branch');
const addA = `  // C15 reason lane — a TEXT OPERATION over a named term is a quotation act. The term
  // is being handled as text, so the quotation family is the controlling explanation.
  if (evidence.textOperationOverTerm && !hasTreatment && !hasCompliance
      && !evidence.taxRelationOverPrimaryTarget) {
    return decide('REFUSE', 'quoted_tax_term_only', 0.88);
  }
  // C15 reason lane — an ASSERTED naming act is explained by the label relation.
  if (evidence.assertsNamingAct && !hasTreatment && !hasCompliance && !quotesTerm
      && !evidence.taxRelationOverPrimaryTarget) {
    return decide('REFUSE', 'non_tax_label_or_name', 0.90);
  }
  // C15 reason lane — an ASSERTED naming act is explained by the label relation even`;
s = s.replace(anchorA, addA);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-05 applied; bytes', before.length, '->', s.length);
