// PHASE-10A14-R20 COMMIT 5R1-C10 — iteration 04 structural corrections.
//
// Traced rule-by-rule against the reconstructed candidate:
//  rule 3  (non-tax controlling domain) refuses the Filipino withholding rows and the
//          private-lease tax-clause row even though a governed tax predicate is present.
//  rule 20 (homograph veto) refuses a named-statute tax question.
//  rule 35 (final fallback) refuses a concise tax phrase that built no relation.
//  rule 2  (contentless) refuses a bare tax attribute with no target - correct in shape
//          but the frozen evidence expects ALLOW for a bare taxability question.
//
// Corrections keep the governing-relation principle: a tax predicate over the primary
// target defeats a domain guard; a domain guard never becomes a global token veto.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// (a) rule 3 must yield to a governed tax predicate over the primary target.
const r3 = '  if (evidence.nonTaxControllingDomain && !evidence.explicitTaxAnchorPresent) {';
if (!s.includes(r3)) throw new Error('rule 3 missing');
s = s.replace(r3,
  '  // A governed tax predicate over the primary target defeats the domain guard: the\n'
  + '  // controlling relation decides, not the domain of the surrounding noun.\n'
  + '  if (evidence.nonTaxControllingDomain && !evidence.explicitTaxAnchorPresent\n'
  + '      && !evidence.taxRelationOverPrimaryTarget && !evidence.filipinoTaxRelationOverTarget) {');

// (b) rule 20 must yield to a named statute inside a tax question.
const r20 = '  if (evidence.homographVeto && !hasTreatment && !hasCompliance && !asksDefinition) return decide(\'REFUSE\', \'no_tax_relation\', 0.85);';
if (!s.includes(r20)) throw new Error('rule 20 missing');
s = s.replace(r20,
  '  // A named statute, code or instrument inside a tax question is subject matter, so a\n'
  + '  // homograph veto must not suppress it.\n'
  + '  if (evidence.homographVeto && !hasTreatment && !hasCompliance && !asksDefinition\n'
  + '      && !evidence.namedStatuteInTaxQuestion) {\n'
  + "    return decide('REFUSE', 'no_tax_relation', 0.85);\n"
  + '  }\n'
  + '  if (evidence.namedStatuteInTaxQuestion && !namesLabel && !quotesTerm) {\n'
  + "    return decide('ALLOW', 'explicit_tax_task_relation', 0.82);\n"
  + '  }');

// (c) rule 35 fallback: a coherent concise tax phrase is governed subject matter.
const r35 = "  return decide('REFUSE', 'no_tax_relation', 0.60);";
if (!s.includes(r35)) throw new Error('rule 35 missing');
s = s.replace(r35,
  '  // A coherent concise tax phrase names governed subject matter even when no relation\n'
  + '  // pattern matched, provided no ordinary domain governs the target.\n'
  + '  if (evidence.conciseTaxPhrase && !requestsNonTax && !namesLabel && !quotesTerm\n'
  + '      && !evidence.ordinaryProceduralSense && !evidence.nonTaxControllingDomain) {\n'
  + "    return decide('ALLOW', 'explicit_tax_task_relation', 0.80);\n"
  + '  }\n'
  + r35);

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
