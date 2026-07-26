// PHASE-10A14-R20 COMMIT 5R1-C11 — iteration 05 structural corrections.
//
// (1) "How much tax is due ON <target>" and "<concept> treatment for <entity>" are tax
//     questions whose subject follows a preposition rather than sitting in subject
//     position; the definite-NP rule only covered the subject-position shape.
// (2) A subordinate code/label clause under a governed tax predicate must not turn the
//     question into label binding (already true for some shapes, not for "even though
//     we filed it under a project code").
// (3) A naming/titling action over an uppercase token is label binding even when the
//     token is a statute name.
// (4) A statute named as the SUBJECT of a tax question is subject matter.
// (5) An imperative print/caption action governs its own target.
// (6) An ordinary personal/social frame (birthday, calendar, school club) is not tax and
//     must REFUSE rather than clarify.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// ── (1) prepositional-object and concept-treatment shapes
const npAnchor = '  const definiteNpSubjectUnderTaxPredicate =';
if (!s.includes(npAnchor)) throw new Error('definite NP anchor missing');
const npLine = s.match(/ {2}const definiteNpSubjectUnderTaxPredicate = [\s\S]*?;\n/);
s = s.replace(npLine[0], npLine[0]
  + '  // A tax amount or concept whose target follows a preposition: "how much tax is due\n'
  + '  // on X", "X treatment for Y", "what fee applies to a taxpayer".\n'
  + '  const taxAmountOverPrepositionalTarget =\n'
  + '    /\\b(?:how much (?:tax|duty)|what (?:tax|duty|fee|rate))\\b[^?]*\\b(?:is due|applies|arises)?\\b[^?]*\\b(?:on|for|to|over)\\s+(?:a|an|the)?\\s*[a-z]/i.test(lo)\n'
  + '    && !hasNonTaxDomainNounIn(lo) && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(lo)\n'
  + '    && !METADATA_SUFFIX_RE.test(fullLo);\n'
  + '  // A recognised tax concept followed by a treatment/application frame over an entity.\n'
  + '  const taxConceptTreatmentOverEntity =\n'
  + '    (TAX_CANONICAL_ACRONYM_RE.test(fullLo) || CONCISE_TAX_PHRASE_RE.test(fullLo) || UNAMBIGUOUS_PH_TAX_TERM_RE.test(fullLo))\n'
  + '    && /\\b(?:treatment|computation|works|applies|application|rate|fee)\\b/i.test(lo)\n'
  + '    && !hasNonTaxDomainNounIn(lo) && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(lo);\n'
  + '  // An annual/registration fee or grace period tied to a taxpayer or refund claim.\n'
  + '  const taxpayerScopedProcedure =\n'
  + '    /\\b(?:taxpayer|revenue district|bir\\b)\\b/i.test(fullLo)\n'
  + '    && /\\b(?:registration fee|annual fee|grace period|refund claim|prescription|entitled to)\\b/i.test(fullLo)\n'
  + '    && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(lo);\n');

const treatBranch = '    if (definiteNpSubjectUnderTaxPredicate) {';
if (!s.includes(treatBranch)) throw new Error('treatment branch missing');
s = s.replace(treatBranch, '    if (definiteNpSubjectUnderTaxPredicate || taxAmountOverPrepositionalTarget || taxConceptTreatmentOverEntity || taxpayerScopedProcedure) {');

// ── (2) subordinate code clause under a tax predicate is not label binding
const lbAnchor = '  const labelBinding = namingActionAnyClause || filenameBinding || columnOrFieldBinding || (labelNoun.test(fullLo)';
if (!s.includes(lbAnchor)) throw new Error('labelBinding anchor missing');
s = s.replace(lbAnchor,
  '  // A subordinate clause stating that the target is filed or tagged under a code does\n'
  + '  // not make naming the primary task when a governed tax predicate controls.\n'
  + '  const subordinateCodeUnderTaxPredicate = /\\b(?:even though|although|though|when|while|if)\\b[^?]*\\b(?:filed|booked|stored|tagged|labelled|labeled|bears|carries)\\b[^?]*\\b(?:code|tag)\\b/i.test(fullLo)\n'
  + '    && /\\b(?:deductib\\w*|taxab\\w*|dutiable|subject to (?:vat|tax|withholding|customs))\\b/i.test(fullLo);\n'
  + '  const labelBinding = !subordinateCodeUnderTaxPredicate && (namingActionAnyClause || filenameBinding || columnOrFieldBinding || (labelNoun.test(fullLo)');

// close the extra paren opened above
const lbTail = s.match(/ {6}\|\| \/\\bas the \(\?:report\|file\|variable\|product\|project\|server\|channel\|team\|course\|training\)\\b\/\.test\(fullLo\)\)\);\n/);
if (!lbTail) throw new Error('labelBinding tail missing');
s = s.replace(lbTail[0], lbTail[0].replace(')));\n', '))));\n'));

// ── (3) naming/titling over an uppercase token
const nameLine = s.match(/ {2}const namingActionAnyClause = [\s\S]*?;\n/);
if (!nameLine) throw new Error('naming anchor missing');
s = s.replace(nameLine[0], nameLine[0].replace(/;\n$/, '\n')
  + '    || /\\b(?:title|name|label|tag|store|save)\\b[^?]*\\b[A-Z]{2,6}\\b/.test(normalizedTextForLabel);\n');

// provide the raw-case text inside buildRelations
const rawAnchor = '  const lo = lower(primary.text);';
if (!s.includes(rawAnchor)) throw new Error('raw anchor missing');
s = s.replace(rawAnchor, rawAnchor + '\n  const normalizedTextForLabel = clauses.map((c) => c.text).join(" ");');

// ── (4) statute as the subject of a tax question
const statAnchor = '  const namesTaxInstrument =';
if (!s.includes(statAnchor)) throw new Error('statute anchor missing');
s = s.replace(statAnchor,
  '  // A statute named as the SUBJECT of a tax question ("does the X Act change the duty")\n'
  + '  // is subject matter, not an ordinary action.\n'
  + '  const statuteAsSubjectOfTaxQuestion = NAMED_STATUTE_RE.test(fullLo)\n'
  + '    && /\\b(?:change|affect|govern|apply|applies|treat|cover|require|impose|allow)\\b/i.test(fullLo)\n'
  + '    && !/\\b(?:title|name|label|tag|store|save)\\b/i.test(fullLo);\n'
  + statAnchor);

const gate = '  const taskIsNonTaxAction = !namesTaxInstrument';
if (!s.includes(gate)) throw new Error('non-tax gate missing');
s = s.replace(gate, '  const taskIsNonTaxAction = !namesTaxInstrument && !statuteAsSubjectOfTaxQuestion');

// ── (5) imperative print/caption action governs its own target
const impAnchor = '  const ordinaryCreativeAction =';
if (!s.includes(impAnchor)) throw new Error('creative anchor missing');
const impLine = s.match(/ {2}const ordinaryCreativeAction = [\s\S]*?;\n/);
s = s.replace(impLine[0], impLine[0].replace(/;\n$/, '\n')
  + '    || (/^(?:please\\s+)?(?:print|caption|display|show|render|paste|write)\\b/i.test(normalizedText.trim())\n'
  + '        && /\\b(?:caption|page|header|footer|banner|label|sheet|slide|panel|screen)\\b/i.test(fullLo));\n');

// ── (6) ordinary personal/social frame is not tax
const evAnchor = '  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // A personal or social frame is not a tax question, and must refuse rather than\n'
  + '  // clarify, even when a treatment-shaped word appears in an unrelated position.\n'
  + '  const ordinaryPersonalOrSocialFrame = /\\b(?:birthday|anniversary|wedding|christening|reunion|party|calendar entry|social club|school club|paaralan|kaarawan|handaan)\\b/i.test(fullLo)\n'
  + '    && !/\\b(?:bir\\b|revenue|taxpayer|withholding tax|income tax|value[- ]added tax|customs)\\b/i.test(fullLo);');

const objAnchor = 'acronymInTaxProcedureQuestion, metadataOnlyContentlessTarget };';
if (!s.includes(objAnchor)) throw new Error('evidence object anchor missing');
s = s.replace(objAnchor, 'acronymInTaxProcedureQuestion, metadataOnlyContentlessTarget, ordinaryPersonalOrSocialFrame };');

const decAnchor = '  // 0c-quinquies. A metadata-only contentless target supplies no subject';
if (!s.includes(decAnchor)) throw new Error('decision anchor missing');
s = s.replace(decAnchor,
  '  // 0c-sexies. A personal or social frame governs its own target.\n'
  + '  if (evidence.ordinaryPersonalOrSocialFrame) {\n'
  + "    return decide('REFUSE', 'explicit_non_tax_task', 0.86);\n"
  + '  }\n'
  + decAnchor);

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
