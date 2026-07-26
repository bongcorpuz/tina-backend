// PHASE-10A14-R20 COMMIT 5R1-C11 — iteration 05, applied by anchored line insertion.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let lines = fs.readFileSync(p, 'utf8').split('\n');
const before = lines.join('\n').length;

const findLine = (pred, label) => {
  const i = lines.findIndex(pred);
  if (i < 0) throw new Error('anchor not found: ' + label);
  return i;
};

// ── (1) additional governed-target shapes, inserted after the definite-NP definition
const npEnd = findLine((l) => /ORDINARY_PROCEDURAL_DOMAIN_RE\.test\(lo\);$/.test(l)
  && lines[lines.indexOf(l) - 5] && /const definiteNpSubjectUnderTaxPredicate =/.test(lines[lines.indexOf(l) - 5]), 'definiteNp end');
lines.splice(npEnd + 1, 0, [
  '  // A tax amount or rate whose target follows a preposition ("how much tax is due on X").',
  '  const taxAmountOverPrepositionalTarget =',
  '    /\\b(?:how much (?:tax|duty)|what (?:tax|duty|fee|rate))\\b[^?]*\\b(?:on|for|to|over)\\s+(?:a|an|the)?\\s*[a-z]/i.test(lo)',
  '    && !hasNonTaxDomainNounIn(lo) && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(lo)',
  '    && !METADATA_SUFFIX_RE.test(fullLo);',
  '  // A recognised tax concept in a treatment or application frame over an entity.',
  '  const taxConceptTreatmentOverEntity =',
  '    (TAX_CANONICAL_ACRONYM_RE.test(fullLo) || CONCISE_TAX_PHRASE_RE.test(fullLo) || UNAMBIGUOUS_PH_TAX_TERM_RE.test(fullLo))',
  '    && /\\b(?:treatment|computation|works|applies|application|rate|fee|change[sd]?|treat)\\b/i.test(lo)',
  '    && !hasNonTaxDomainNounIn(lo) && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(lo);',
  '  // A procedure scoped to a taxpayer or the revenue authority.',
  '  const taxpayerScopedProcedure =',
  '    /\\b(?:taxpayer|revenue district|bir)\\b/i.test(fullLo)',
  '    && /\\b(?:registration fee|annual fee|grace period|refund claim|prescription|entitled to)\\b/i.test(fullLo)',
  '    && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(lo);',
  '  // A statute named as the subject of a tax question is subject matter.',
  '  const statuteAsSubjectOfTaxQuestion = NAMED_STATUTE_RE.test(fullLo)',
  '    && /\\b(?:change|affect|govern|apply|applies|treat|cover|require|impose|allow)\\b/i.test(fullLo)',
  '    && !/\\b(?:title|name|label|tag|store|save)\\b/i.test(fullLo);',
  '  // A subordinate code clause under a governed tax predicate is not label binding.',
  '  const subordinateCodeUnderTaxPredicate =',
  '    /\\b(?:even though|although|though|when|while|if)\\b[^?]*\\b(?:filed|booked|stored|tagged|labelled|labeled|bears|carries)\\b[^?]*\\b(?:code|tag)\\b/i.test(fullLo)',
  '    && /\\b(?:deductib\\w*|taxab\\w*|dutiable|subject to (?:vat|tax|withholding|customs))\\b/i.test(fullLo);',
].join('\n'));

// ── widen the treatment branch condition
const branch = findLine((l) => l.includes('if (definiteNpSubjectUnderTaxPredicate) {'), 'treatment branch');
lines[branch] = lines[branch].replace('if (definiteNpSubjectUnderTaxPredicate) {',
  'if (definiteNpSubjectUnderTaxPredicate || taxAmountOverPrepositionalTarget || taxConceptTreatmentOverEntity || taxpayerScopedProcedure || statuteAsSubjectOfTaxQuestion) {');

// ── statute subject defeats the non-tax action reading
const gate = findLine((l) => l.startsWith('  const taskIsNonTaxAction = !namesTaxInstrument'), 'non-tax gate');
lines[gate] = lines[gate].replace('!namesTaxInstrument', '!namesTaxInstrument && !statuteAsSubjectOfTaxQuestion');

// ── subordinate code clause defeats label binding
const lb = findLine((l) => l.startsWith('  const labelBinding = namingActionAnyClause'), 'labelBinding');
lines[lb] = lines[lb].replace('const labelBinding = namingActionAnyClause',
  'const labelBinding = !subordinateCodeUnderTaxPredicate && namingActionAnyClause');

// ── personal/social frame evidence + decision rule
const ev = findLine((l) => l.includes('const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);'), 'evidence');
lines.splice(ev + 1, 0, [
  '  // A personal or social frame governs its own target and must refuse, not clarify.',
  '  const ordinaryPersonalOrSocialFrame = /\\b(?:birthday|anniversary|wedding|christening|reunion|party|calendar entry|social club|school club|paaralan|kaarawan|handaan)\\b/i.test(fullLo)',
  '    && !/\\b(?:bir|revenue|taxpayer|withholding tax|income tax|value[- ]added tax|customs)\\b/i.test(fullLo);',
].join('\n'));

const obj = findLine((l) => l.includes('metadataOnlyContentlessTarget };'), 'evidence object');
lines[obj] = lines[obj].replace('metadataOnlyContentlessTarget };', 'metadataOnlyContentlessTarget, ordinaryPersonalOrSocialFrame };');

const dec = findLine((l) => l.includes('0c-quinquies. A metadata-only contentless target'), 'decision anchor');
lines.splice(dec, 0, [
  '  // A personal or social frame governs its own target.',
  '  if (evidence.ordinaryPersonalOrSocialFrame) {',
  "    return decide('REFUSE', 'explicit_non_tax_task', 0.86);",
  '  }',
].join('\n'));

fs.writeFileSync(p, lines.join('\n'));
console.log('patched: +' + (lines.join('\n').length - before) + ' bytes');
