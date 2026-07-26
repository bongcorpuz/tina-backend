// PHASE-10A14-R20 COMMIT 5R1-C11 — iteration 04 structural corrections.
//
// (1) The metadata-contentless guard cannot be discriminated by "does a tax name appear",
//     because both "Is it subject to VAT? Situation 8." and "What did the RMC issuance
//     say about VAT? Group MM-06." name a tax. The real discriminator is whether the
//     stripped clause has a NON-DEICTIC subject: a query whose only subject is it/that/
//     the-bare-attribute is contentless; a query naming an actual entity is not.
// (2) A treatment predicate over a definite noun-phrase subject ("the interest income",
//     "the dividend", "the imported conveyor belt") must build a treatment relation.
// (3) A naming/titling action anywhere makes label binding primary, including over an
//     uppercase statute token.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// ── (1) rewrite the guard around a non-deictic subject test
const m = s.match(/ {2}const metadataOnlyContentlessTarget = [\s\S]*?;\n/);
if (!m) throw new Error('guard missing');
const guard = [
  '  // A metadata-suffixed query is contentless when the clause left after stripping the',
  '  // suffix has no subject of its own: its subject is only a deictic or a bare',
  '  // attribute. Naming a tax does not supply a subject - "Is it subject to VAT?" names',
  '  // a tax but still says nothing about what "it" is, whereas "What did the RMC',
  '  // issuance say about VAT?" names an actual entity as the subject.',
  '  const strippedSubjectIsDeicticOnly = /^(?:is|are|does|do|can|should|will)\\s+(?:it|that|this|they)\\b/i.test(strippedOfMetadata)',
  '    || /^(?:what|which)\\s+(?:is\\s+the|are\\s+the)?\\s*[a-z-]+(?:\\s+period|\\s+deadline|\\s+rate|\\s+threshold)?\\s*(?:applies|apply)?\\s*\\??$/i.test(strippedOfMetadata);',
  '  const metadataOnlyContentlessTarget = METADATA_SUFFIX_RE.test(fullLo)',
  '    && strippedSubjectIsDeicticOnly',
  '    && !CONCRETE_ANTECEDENT_NOUN_RE.test(strippedOfMetadata)',
  '    && !/\\b(?:bought|purchased|acquired|paid|received|sold|leased|imported|hired|engaged|rented)\\b/i.test(fullLo);',
  '',
].join('\n');
s = s.replace(m[0], guard);

// ── (2) treatment predicate over a definite noun-phrase subject
const treatAnchor = "    if (RE.vat.test(lo) && hasAnchor) add('ASKS_VAT_TREATMENT_OF', 'task', target || 'subject');";
if (!s.includes(treatAnchor)) throw new Error('treatment branch missing');
s = s.replace(treatAnchor,
  '    // A definite noun-phrase subject under a governed tax predicate is a concrete\n'
  + '    // target: "Is the interest income subject to final tax?" names its own subject.\n'
  + '    else if (definiteNpSubjectUnderTaxPredicate) {\n'
  + "      add(/\\bvat\\b|value[- ]added/i.test(fullLo) ? 'ASKS_VAT_TREATMENT_OF'\n"
  + "        : (/\\bdeductib/i.test(fullLo) ? 'ASKS_DEDUCTIBILITY_OF'\n"
  + "          : (/\\bwithhold/i.test(fullLo) ? 'ASKS_WITHHOLDING_ON'\n"
  + "            : (/\\bcustoms dut|import dut|dutiable\\b/i.test(fullLo) ? 'ASKS_CUSTOMS_DUTY_ON' : 'ASKS_TAX_TREATMENT_OF'))), 'task', target || 'subject');\n"
  + '    }\n'
  + treatAnchor.replace('    if (', '    else if ('));

// define the predicate just before the relation chain
const preAnchor = '  const taskIsNonTaxAction = !namesTaxInstrument';
if (!s.includes(preAnchor)) throw new Error('pre anchor missing');
s = s.replace(preAnchor,
  '  // A definite noun-phrase subject governed by an explicit tax predicate, with no\n'
  + '  // metadata-only framing and no ordinary domain governing the target.\n'
  + '  const definiteNpSubjectUnderTaxPredicate =\n'
  + '    /^(?:is|are|was|were|how much|what)\\b[^?]*\\b(?:the|a|an)\\s+[a-z][a-z\\- ]{2,44}?\\s+(?:subject to|deductib\\w*|dutiable|taxab\\w*|due|payable)\\b/i.test(lo)\n'
  + '    && /\\b(?:subject to (?:vat|value[- ]added tax|final tax|withholding|customs|excise|tax)|deductib\\w*|dutiable|taxab\\w*|tax is due|tax due)\\b/i.test(lo)\n'
  + '    && !METADATA_SUFFIX_RE.test(fullLo)\n'
  + '    && !hasNonTaxDomainNounIn(lo)\n'
  + '    && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(lo);\n'
  + preAnchor);

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
