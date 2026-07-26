// PHASE-10A14-R20 COMMIT 5R1-C11 — iteration 02 structural corrections.
//
// Root cause for the dominant ALLOW->REFUSE family: no tax relation is built at all.
// The C10 tightening required a TAX_DOMAIN_OBJECT match before a compliance relation,
// but that vocabulary omits core tax instruments and predicates ("annual return",
// "final tax", "deductible", "registration fee", "grace period ... refund"), so genuine
// tax questions produced no relation and fell to the REFUSE fallback.
//
// Corrections, all predicate-relation based rather than target-noun hard-coding:
//  (1) widen the tax-domain object vocabulary to core instruments and predicates;
//  (2) a governed tax predicate over a target is itself sufficient tax-domain
//      attachment for a compliance relation;
//  (3) an explanatory verb over a recognised tax acronym or concept is a definition
//      request, not an ordinary action.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// ── (1) widen TAX_DOMAIN_OBJECT_RE
const m = s.match(/const TAX_DOMAIN_OBJECT_RE = \/.*\/i;/);
if (!m) throw new Error('TAX_DOMAIN_OBJECT_RE missing');
const extra = '|annual return|quarterly return|monthly return|final tax|deductib\\\\w*|taxab\\\\w*|vatable|registration fee|grace period|refund claim|input vat|output vat|gross income|capital asset|ordinary asset|domestic corporation|domestic company|resident individual|non[- ]resident|time deposit|royalty income|interest income|dividend|imported|importation|dutiable|duty on|re[- ]imported|licensed typeface|equipment transfer|insurance premium';
const widened = m[0].replace(/\)\\b\/i;$/, extra + ')\\b/i;');
if (widened === m[0]) throw new Error('TAX_DOMAIN_OBJECT_RE not widened');
s = s.replace(m[0], widened);

// ── (2) a governed tax predicate is sufficient attachment for a compliance relation
const compl = "    else if (isCompliance && (TAX_DOMAIN_OBJECT_RE.test(fullLo) || CONCISE_TAX_PHRASE_RE.test(fullLo))) {";
if (!s.includes(compl)) throw new Error('compliance branch missing');
s = s.replace(compl,
  '    // A governed tax predicate over the target is itself tax-domain attachment: the\n'
  + '    // relation, not a vocabulary lookup, is what makes the procedure a tax procedure.\n'
  + "    else if (isCompliance && (TAX_DOMAIN_OBJECT_RE.test(fullLo) || CONCISE_TAX_PHRASE_RE.test(fullLo) || governedTaxPredicateOverTarget)) {");

// ── (3) explanatory verb over a recognised tax acronym or concept is a definition
const explAnchor = '  const explanatoryOverTaxInstrument =';
if (!s.includes(explAnchor)) throw new Error('explanatory anchor missing');
const explLine = s.match(/ {2}const explanatoryOverTaxInstrument = [\s\S]*?;\n/);
if (!explLine) throw new Error('explanatory definition missing');
s = s.replace(explLine[0],
  '  // An explanatory verb applied to a recognised tax acronym or a tax concept is a\n'
  + '  // definition request about that instrument, whether or not extra tax context is\n'
  + '  // spelled out alongside it.\n'
  + '  const explanatoryOverTaxInstrument = /^(?:please\\s+)?(?:explain|describe|clarify|interpret|detail|summari[sz]e)\\b/i.test(fullLo.trim())\n'
  + '    && (RECOGNIZED_TAX_ACRONYM_RE.test(fullLo) || TAX_CANONICAL_ACRONYM_RE.test(fullLo)\n'
  + '        || EXPLICIT_TAX_CONTEXT_RE.test(fullLo) || CONCISE_TAX_PHRASE_RE.test(fullLo));\n');

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
