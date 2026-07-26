// PHASE-10A14-R20 COMMIT 5R1-C9 — diagnostic probe (analysis only; not a runtime file).
const fs = require('fs');
const src = fs.readFileSync('services/philippine-tax-intent-analyzer.js', 'utf8');

const grab = (name, flags) => {
  const m = src.match(new RegExp('const ' + name + ' = (\\/.*\\/' + flags + ');'));
  return m ? eval(m[1]) : null;
};

const RECOG = grab('RECOGNIZED_TAX_ACRONYM_RE', 'i');
const CTX = grab('EXPLICIT_TAX_CONTEXT_RE', 'i');
const NA = src.match(/  nonTaxAction: (\/.*\/),/);
const nonTaxAction = eval(NA[1]);

const cases = [
  'explain rmc for bir issuances.',
  'explain pan for a bir assessment.',
  'clarify rmc in bir issuances.',
  'kailangan bang i-withhold ang buwis sa delivery van?',
  'pick a vat paint shade. variant 1.',
];
for (const t of cases) {
  const explanatory = /^(?:please\s+)?(?:explain|describe|clarify|interpret|detail|summari[sz]e)\b/i.test(t.trim());
  console.log(JSON.stringify(t));
  console.log('   explanatoryLead=' + explanatory,
    '| recogAcronym=' + (RECOG ? RECOG.test(t) : 'n/a'),
    '| explicitTaxCtx=' + (CTX ? CTX.test(t) : 'n/a'),
    '| nonTaxActionHit=' + (nonTaxAction.test(t) ? JSON.stringify((t.match(nonTaxAction) || [])[0]) : 'none'));
}

const g = src.match(/const NON_TAX_DOMAIN_NOUNS = Object\.freeze\(\[([\s\S]*?)\]\);/);
const list = eval('[' + g[1] + ']');
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const t of ['kailangan bang i-withhold ang buwis sa delivery van?', 'pick a vat paint shade. variant 1.']) {
  console.log('domainNouns in ' + JSON.stringify(t.slice(0, 40)) + ':',
    list.filter((x) => new RegExp('\\b' + esc(x) + '\\b').test(t)));
}
