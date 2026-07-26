// PHASE-10A14-R20 COMMIT 5R1-C8 — patch helper: a Filipino/Taglish tax predicate is a
// governed tax relation. "Kailangan bang i-withhold ang buwis sa X?" asks whether tax
// must be withheld on X; the verb-like "i-withhold" is the tax act itself, not an
// ordinary non-tax action, so it must not be read as a non-tax task.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');

const anchor = '  const namesTaxInstrument = (UNAMBIGUOUS_PH_TAX_TERM_RE.test(fullLo) || BARE_TAX_TOPIC_RE.test(fullLo))';
if (!s.includes(anchor)) throw new Error('anchor not found');

const addition = '  // An explicit Filipino/Taglish tax predicate is a governed tax relation, not an\n'
  + '  // ordinary action: buwis/VAT/deductible/BIR form over a target asks a tax question.\n'
  + '  const filipinoTaxPredicate = /\\b(?:buwis|kabuwisan|i-?withhold|withhold)\\b/i.test(fullLo)\n'
  + '    && /\\b(?:ang|sa|ba|ng|para|bang|may)\\b/i.test(fullLo);\n'
  + anchor;
s = s.replace(anchor, addition);

// The Filipino tax predicate defeats the non-tax-action reading.
const gate = '  const taskIsNonTaxAction = !namesTaxInstrument\n';
if (!s.includes(gate)) throw new Error('gate not found');
s = s.replace(gate, '  const taskIsNonTaxAction = !namesTaxInstrument && !filipinoTaxPredicate\n');

fs.writeFileSync(p, s);
console.log('wired filipinoTaxPredicate');
