// PHASE-10A14-R20 COMMIT 5R1-C11 — diagnostic probe (analysis only, not a runtime file).
const fs = require('fs');
const src = fs.readFileSync('services/philippine-tax-intent-analyzer.js', 'utf8');
const grab = (name, flags) => {
  const m = src.match(new RegExp('const ' + name + ' = (\\/.*\\/' + (flags || '') + ');'));
  return m ? eval(m[1]) : null;
};
const ORD = grab('ORDINARY_PROCEDURAL_DOMAIN_RE', 'i');
const TAXOBJ = grab('TAX_DOMAIN_OBJECT_RE', 'i');
const NONTAXCTRL = grab('NON_TAX_CONTROLLING_DOMAIN_RE', '');
const INST = grab('NON_TAX_INSTITUTIONAL_DOMAIN_RE', 'i');
const STYLE = grab('STYLING_OR_PROGRAM_OBJECT_RE', 'i');
const CONCISE = grab('CONCISE_TAX_PHRASE_RE', 'i');
const dn = src.match(/const NON_TAX_DOMAIN_NOUNS = Object\.freeze\(\[([\s\S]*?)\]\);/);
const list = eval('[' + dn[1] + ']');
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const domainHits = (t) => list.filter((x) => new RegExp('\\b' + esc(x) + '\\b').test(t));

const cases = [
  'is a delivery motorcycle deductible against gross income?',
  'is the interest income subject to final tax?',
  'is the insurance premium deductible?',
  'what is the deadline to file the annual return?',
  'describe how cwt works for a domestic company.',
  'explain car in a bir deficiency assessment.',
  'does the customs modernization and tariff act change the duty on this shipment?',
  'when is the return due for the imported machinery we purchased?',
];
for (const t of cases) {
  console.log(JSON.stringify(t.slice(0, 56)));
  console.log('   domainNouns=' + JSON.stringify(domainHits(t))
    + ' ordinary=' + (ORD ? ORD.test(t) : 'n/a')
    + ' taxObj=' + (TAXOBJ ? TAXOBJ.test(t) : 'n/a')
    + ' nonTaxCtrl=' + (NONTAXCTRL ? NONTAXCTRL.test(t) : 'n/a')
    + ' inst=' + (INST ? INST.test(t) : 'n/a')
    + ' style=' + (STYLE ? STYLE.test(t) : 'n/a')
    + ' concise=' + (CONCISE ? CONCISE.test(t) : 'n/a'));
}
