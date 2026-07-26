// PHASE-10A14-R20 COMMIT 5R1-C11 — iteration 06 (final material iteration).
//
//  (1) The inlined subordinate-code guard only covered "filed/booked/... under a code";
//      it must also cover "filed it under a project code" and "bears a warehouse code",
//      and it must suppress the NAMES_AS_INTERNAL_LABEL relation, not just labelBinding.
//  (2) A naming/titling action over an uppercase token is label binding even when the
//      token is a statute abbreviation.
//  (3) A statute as the subject of a tax question reaches the relation but is refused at
//      the decision layer; it needs the same treatment path as other tax subjects.
//  (4) An imperative print/caption action governs its own target.
//  (5) An ordinary insurance/civil claim keeps its own domain.
//  (6) A definite-NP tax predicate must also fire when the subject follows an
//      antecedent clause ("We received royalty income... Is it subject to final tax?")
//      and for "the sale of X subject to Y".
//  (7) An explanatory verb over a tax-canonical acronym is a definition, not ambiguity.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let lines = fs.readFileSync(p, 'utf8').split('\n');
const before = lines.join('\n').length;
const bs = String.fromCharCode(92);
const find = (pred, label) => {
  const i = lines.findIndex(pred);
  if (i < 0) throw new Error('anchor not found: ' + label);
  return i;
};

// (1)+(2) widen the inlined subordinate-code guard and the naming-action test
const lbi = find((l) => l.startsWith('  const labelBinding = !('), 'labelBinding');
lines[lbi] = '  const labelBinding = !(/' + bs + 'b(?:even though|although|though|when|while|if)' + bs + 'b[^?]*'
  + bs + 'b(?:filed|booked|stored|tagged|labelled|labeled|bears|carries|under)' + bs + 'b[^?]*'
  + bs + 'b(?:code|tag)' + bs + 'b/i.test(fullLo) && /' + bs + 'b(?:deductib' + bs + 'w*|taxab' + bs + 'w*|dutiable|subject to (?:vat|tax|withholding|customs))'
  + bs + 'b/i.test(fullLo)) && (namingActionAnyClause || filenameBinding || columnOrFieldBinding || (labelNoun.test(fullLo)';

// naming action must also catch "title/name the <thing> <TOKEN>"
const nai = find((l) => l.startsWith('  const namingActionAnyClause ='), 'namingAction');
lines[nai] = '  const namingActionAnyClause = /' + bs + 'b(?:name|rename|label|tag|title|call|store|save)'
  + bs + 's+(?:the' + bs + 's+|this' + bs + 's+|our' + bs + 's+|an?' + bs + 's+)?(?:folder|file|sheet|tab|column|field|document|record|deck|invite|project|template|archive|drive|manifest|checklist|booking|shipping)'
  + bs + 'b/i.test(fullLo)';
lines.splice(nai + 1, 0, '    || /' + bs + 'b(?:title|name|label|tag|store|save)' + bs + 'b[^?]{0,40}' + bs + 'b[A-Z]{2,6}' + bs + 'b/.test(clauses.map((c) => c.text).join(" "));');

// (5)+(6) additional governed-target shapes and an ordinary-claim guard
const tspDecl = find((l) => l.startsWith('  const taxpayerScopedProcedure ='), 'taxpayerScoped decl');
let npEnd = tspDecl;
while (!/;\s*$/.test(lines[npEnd])) npEnd++;
lines.splice(npEnd + 1, 0, [
  '  // A deictic resolved by an antecedent clause under a tax predicate is a real target.',
  '  const antecedentResolvedTaxPredicate =',
  '    /\\b(?:received|bought|purchased|acquired|paid|sold|leased|imported)\\b/i.test(fullLo)',
  '    && /\\b(?:is|are)\\s+(?:it|that|this)\\s+(?:subject to|deductib\\w*|taxab\\w*|dutiable)\\b/i.test(fullLo)',
  '    && !hasNonTaxDomainNounIn(fullLo) && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(fullLo);',
  '  // "the sale/transfer/purchase of X subject to Y" names its own target.',
  '  const nominalisedTransactionUnderTaxPredicate =',
  '    /\\b(?:the\\s+)?(?:sale|transfer|purchase|lease|importation|disposal)\\s+of\\s+[a-z]/i.test(lo)',
  '    && /\\b(?:subject to|deductib\\w*|taxab\\w*|dutiable)\\b/i.test(lo)',
  '    && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(lo);',
].join('\n'));

const branch = find((l) => l.includes('if (definiteNpSubjectUnderTaxPredicate ||'), 'treatment branch');
lines[branch] = lines[branch].replace('taxpayerScopedProcedure || statuteAsSubjectOfTaxQuestion) {',
  'taxpayerScopedProcedure || statuteAsSubjectOfTaxQuestion || antecedentResolvedTaxPredicate || nominalisedTransactionUnderTaxPredicate) {');

// (3) statute subject must reach ALLOW at the decision layer
const evi = find((l) => l.includes('const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);'), 'evidence');
lines.splice(evi + 1, 0, [
  '  // A statute named as the subject of a tax question is governed subject matter.',
  '  const statuteSubjectOfTaxQuestion = NAMED_STATUTE_RE.test(fullLo)',
  '    && /\\b(?:change|affect|govern|apply|applies|treat|cover|require|impose|allow)\\b/i.test(fullLo)',
  '    && !/\\b(?:title|name|label|tag|store|save)\\b/i.test(fullLo);',
  '  // An ordinary insurance or civil claim keeps its own domain.',
  '  const ordinaryClaimDomain = /\\b(?:motor insurance|insurance claim|warranty claim|travel|passenger|parcel|delivery delay)\\b/i.test(fullLo)',
  '    && !/\\b(?:bir|revenue|taxpayer|tax refund|input tax|withholding)\\b/i.test(fullLo);',
  '  // An imperative print or caption action governs its own target.',
  '  const imperativePrintOrCaption = /^(?:please\\s+)?(?:print|caption|display|show|render|paste|write)\\b/i.test(normalizedText.trim())',
  '    && /\\b(?:caption|page|header|footer|banner|sheet|slide|panel|screen|summary)\\b/i.test(fullLo);',
].join('\n'));

const obj = find((l) => l.includes('metadataOnlyContentlessTarget, ordinaryPersonalOrSocialFrame };'), 'evidence object');
lines[obj] = lines[obj].replace('ordinaryPersonalOrSocialFrame };',
  'ordinaryPersonalOrSocialFrame, statuteSubjectOfTaxQuestion, ordinaryClaimDomain, imperativePrintOrCaption };');

const dec = find((l) => l.includes('// A personal or social frame governs its own target.'), 'decision anchor');
lines.splice(dec, 0, [
  '  // An ordinary claim domain and an imperative print/caption action govern their own',
  '  // targets; a statute named as the subject of a tax question is governed subject matter.',
  '  if (evidence.ordinaryClaimDomain || evidence.imperativePrintOrCaption) {',
  "    return decide('REFUSE', 'explicit_non_tax_task', 0.86);",
  '  }',
  '  if (evidence.statuteSubjectOfTaxQuestion && !namesLabel && !quotesTerm) {',
  "    return decide('ALLOW', 'explicit_tax_task_relation', 0.82);",
  '  }',
].join('\n'));

// (7) explanatory verb over a canonical acronym resolves the definition
const ambi = find((l) => l.includes("if (anyAmbiguous) return decide('CLARIFY', 'ambiguous_tax_acronym', 0.55);"), 'ambiguity fallback');
lines.splice(ambi, 0, [
  '    if (evidence.taxCanonicalAcronym && !evidence.nonTaxExpansionBinding',
  '        && !evidence.definitionFrameWithMetadataOnly) {',
  "      return decide('ALLOW', 'tax_definition_with_context', 0.80);",
  '    }',
].join('\n'));

fs.writeFileSync(p, lines.join('\n'));
console.log('patched: +' + (lines.join('\n').length - before) + ' bytes');
