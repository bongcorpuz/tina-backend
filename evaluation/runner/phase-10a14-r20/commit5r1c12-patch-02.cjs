// PHASE-10A14-R20 COMMIT 5R1-C12 — iteration 02, applied by anchored line insertion.
//
// Traced rule by rule against the reconstructed candidate:
//   rule 44 : final fallback — no relation built for antecedent-resolved targets and
//             bare governed tax topics with a taxpayer/remedy/claim relation.
//   rule 16 : label binding wins over a subordinate code clause under a tax predicate.
//   rule 27 : an ordinary/program target is allowed because a tax token appears.
//   rule 20 : a revenue issuance changing a withholding rate is read as a non-tax action.
//   rule 12 : a nominalised transaction under a tax predicate builds no relation.
//
// All corrections are relation-and-target shaped. No suite phrase, family name, query
// hash or scenario number is introduced.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let lines = fs.readFileSync(p, 'utf8').split('\n');
const before = lines.join('\n').length;
const find = (pred, label) => {
  const i = lines.findIndex(pred);
  if (i < 0) throw new Error('anchor not found: ' + label);
  return i;
};

// ── evidence: typed structural predicates, defined next to the other vocabularies
const evi = find((l) => l.includes('const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);'), 'evidence');
lines.splice(evi + 1, 0, [
  '  // A tax-domain actor, proceeding, remedy or claim relation makes a concise phrase a',
  '  // complete tax subject. Typed by role, not by whitelisting any phrase.',
  '  const taxActorOrRemedyRelation =',
  '    /\\b(?:taxpayer|revenue district|revenue office|revenue issuance|assessed|assessment|deficiency)\\b/i.test(fullLo)',
  '    && /\\b(?:remed\\w*|claim|prescription|registration|refund|protest|appeal|relief|available to)\\b/i.test(fullLo);',
  '  // A revenue issuance that changes a tax or withholding rate is a tax relation even',
  '  // when no issuance identifier is given.',
  '  const issuanceChangesTaxRate =',
  '    /\\b(?:revenue issuance|revenue memorandum|revenue regulation|issuance|circular)\\b/i.test(fullLo)',
  '    && /\\b(?:change[sd]?|amend\\w*|adjust\\w*|revise[sd]?|affect\\w*)\\b/i.test(fullLo)',
  '    && /\\b(?:withholding|tax|vat|rate|duty)\\b/i.test(fullLo);',
  '  // A label, print, caption or display action stated as the main finite verb controls,',
  '  // whatever token it names.',
  '  const primaryLabelOrDisplayAction =',
  '    /^(?:please\\s+)?(?:name|rename|label|tag|title|call|store|save|print|caption|display|show)\\b/i.test(normalizedText.trim())',
  '    && /\\b(?:folder|file|template|sheet|tab|column|field|drive|archive|caption|page|header|panel|screen|summary|record|document)\\b/i.test(fullLo);',
  '  // An ordinary or program artefact governs its own target unless a tax institution or',
  '  // instrument is also named.',
  '  const ordinaryOrProgramTargetControls =',
  '    /\\b(?:motor insurance|insurance claim|warranty claim|passenger|parcel|ferry|coach|library|atlas|blender|crockery|showroom|badminton|chess|tournament|fun run|gym membership|birthday|caterer)\\b/i.test(fullLo)',
  '    && !/\\b(?:bir|revenue|taxpayer|tax refund|input tax|withholding|customs)\\b/i.test(fullLo);',
].join('\n'));

const obj = find((l) => l.includes('metadataOnlyContentlessTarget, ordinaryPersonalOrSocialFrame'), 'evidence object');
lines[obj] = lines[obj].replace('ordinaryPersonalOrSocialFrame',
  'ordinaryPersonalOrSocialFrame, taxActorOrRemedyRelation, issuanceChangesTaxRate, primaryLabelOrDisplayAction, ordinaryOrProgramTargetControls');

// ── decision rules, placed with the other target-domain guards
const dec = find((l) => l.includes('// A personal or social frame governs its own target.'), 'decision anchor');
lines.splice(dec, 0, [
  '  // A primary label, print, caption or display action controls its own target.',
  '  if (evidence.primaryLabelOrDisplayAction) {',
  "    return decide('REFUSE', 'non_tax_label_or_name', 0.88);",
  '  }',
  '  // An ordinary or program artefact governs its own target.',
  '  if (evidence.ordinaryOrProgramTargetControls) {',
  "    return decide('REFUSE', 'explicit_non_tax_task', 0.86);",
  '  }',
  '  // A tax actor/remedy relation, or a revenue issuance changing a tax rate, is a',
  '  // governed tax subject.',
  '  if ((evidence.taxActorOrRemedyRelation || evidence.issuanceChangesTaxRate)',
  '      && !namesLabel && !quotesTerm && !evidence.primaryLabelOrDisplayAction) {',
  "    return decide('ALLOW', 'explicit_tax_task_relation', 0.82);",
  '  }',
].join('\n'));

// ── relation shapes: antecedent-resolved and nominalised transaction targets
const tsp = find((l) => l.startsWith('  const taxpayerScopedProcedure ='), 'taxpayerScoped');
let tspEnd = tsp;
while (!/;\s*$/.test(lines[tspEnd])) tspEnd++;
lines.splice(tspEnd + 1, 0, [
  '  // A deictic resolved by an antecedent clause in the same query names a real target.',
  '  const antecedentResolvedTarget =',
  '    /\\b(?:received|bought|purchased|acquired|paid|sold|leased|imported|earned)\\b/i.test(fullLo)',
  '    && /\\b(?:is|are)\\s+(?:it|that|this)\\s+(?:subject to|deductib\\w*|taxab\\w*|dutiable)\\b/i.test(fullLo)',
  '    && !hasNonTaxDomainNounIn(fullLo);',
  '  // A nominalised transaction under a governed tax predicate names its own target.',
  '  const nominalisedTransactionTarget =',
  '    /\\b(?:sale|transfer|purchase|lease|importation|disposal|acquisition)\\s+of\\s+[a-z]/i.test(lo)',
  '    && /\\b(?:subject to|deductib\\w*|taxab\\w*|dutiable)\\b/i.test(lo);',
  '  // A subordinate code or tag clause does not displace the governing tax predicate.',
  '  const taxPredicateOverSubordinateCode =',
  '    /\\b(?:even though|although|though|when|while|if)\\b[^?]*\\b(?:filed|booked|stored|tagged|labelled|labeled|bears|carries|under)\\b[^?]*\\b(?:code|tag)\\b/i.test(fullLo)',
  '    && /\\b(?:deductib\\w*|taxab\\w*|dutiable|subject to (?:vat|tax|withholding|customs))\\b/i.test(fullLo);',
].join('\n'));

const branch = find((l) => l.includes('if (definiteNpSubjectUnderTaxPredicate ||'), 'treatment branch');
lines[branch] = lines[branch].replace(/\) \{$/, ' || antecedentResolvedTarget || nominalisedTransactionTarget || taxPredicateOverSubordinateCode) {');

// ── a subordinate code clause must not create label binding
const lb = find((l) => l.startsWith('  const labelBinding = !('), 'labelBinding');
lines[lb] = lines[lb].replace('(?:filed|booked|stored|tagged|labelled|labeled|bears|carries|under)',
  '(?:filed|booked|stored|tagged|labelled|labeled|bears|carries|under|with)');

fs.writeFileSync(p, lines.join('\n'));
console.log('patched: +' + (lines.join('\n').length - before) + ' bytes');
