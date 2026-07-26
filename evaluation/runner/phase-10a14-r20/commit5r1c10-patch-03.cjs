// PHASE-10A14-R20 COMMIT 5R1-C10 — iteration 03 structural corrections.
//
// (1) The Filipino rows already carry a VAT relation but the decision still returns
//     explicit_non_tax_task, so the relation is being outranked. A Filipino tax predicate
//     governing a named object must control the decision.
// (2) "alphalist of students alphabetically" gains a compliance relation because
//     "alphalist" is now a tax-domain object; an ordinary alphabetising action over a
//     non-tax population governs its own target.
// (3) A concise tax phrase and a named statute in a tax question need a relation.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// ---------------------------------------------------------------- (1) Filipino relation controls
const nonTaxRule = "  if (requestsNonTax && !hasTreatment && !hasCompliance && !evidence.taxRelationOverPrimaryTarget";
if (!s.includes(nonTaxRule)) throw new Error('non-tax rule missing');

// The governed-tax-predicate ALLOW must also fire on a Filipino relation over a target.
const allowRule = "  if (requestsNonTax && evidence.taxRelationOverPrimaryTarget && !namesLabel && !quotesTerm";
if (!s.includes(allowRule)) throw new Error('governed predicate allow rule missing');
s = s.replace(allowRule,
  "  if (requestsNonTax && (evidence.taxRelationOverPrimaryTarget || evidence.filipinoTaxRelationOverTarget) && !namesLabel && !quotesTerm");

// A tax relation already present on the evidence must not be overridden by the
// ordinary-creative / styling guards when a Filipino tax predicate governs the target.
s = s.replace('  if (evidence.ordinaryCreativeAction) {',
  '  if (evidence.ordinaryCreativeAction && !evidence.filipinoTaxRelationOverTarget) {');
s = s.replace('  if (evidence.stylingOrProgramTarget) {',
  '  if (evidence.stylingOrProgramTarget && !evidence.filipinoTaxRelationOverTarget) {');

// ---------------------------------------------------------------- (2) ordinary population for a list action
const evAnchor = '  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // An ordering or listing action over an ordinary population governs its own target.\n'
  + '  // A tax filing artefact named beside an ordinary population does not make the\n'
  + '  // request a tax procedure.\n'
  + '  const orderingActionOverOrdinaryPopulation = /\\b(?:alphabeti[sz]e|alphabetical|sort|arrange|order|rank|list)\\b/i.test(fullLo)\n'
  + '    && /\\b(?:students?|pupils?|trainees?|attendees?|members?|guests?|choir|roster|class list|names?)\\b/i.test(fullLo)\n'
  + '    && !/\\b(?:payees?|taxpayers?|withholding|bir\\b|revenue|income tax|vat\\b)\\b/i.test(fullLo);');

const objAnchor = 'namedStatuteInTaxQuestion, definitionFrameWithMetadataOnly };';
if (!s.includes(objAnchor)) throw new Error('evidence object anchor missing');
s = s.replace(objAnchor, 'namedStatuteInTaxQuestion, definitionFrameWithMetadataOnly, orderingActionOverOrdinaryPopulation };');

const decAnchor = '  // 0c-ter. A definition frame whose only extra content is an enumerated suffix has no';
if (!s.includes(decAnchor)) throw new Error('decision anchor missing');
s = s.replace(decAnchor,
  '  // 0c-quater. An ordering or listing action over an ordinary population governs its\n'
  + '  // own target; a tax filing artefact named beside it does not create jurisdiction.\n'
  + '  if (evidence.orderingActionOverOrdinaryPopulation) {\n'
  + "    return decide('REFUSE', 'explicit_non_tax_task', 0.86);\n"
  + '  }\n'
  + decAnchor);

// ---------------------------------------------------------------- (3) concise phrase / named statute relation
const relAnchor = '    // A Filipino/Taglish tax predicate governing a named object is a tax relation.';
if (!s.includes(relAnchor)) throw new Error('relation anchor missing');
s = s.replace(relAnchor,
  '    // A coherent concise tax phrase, or a named statute inside a tax question, names\n'
  + '    // the governed subject matter directly and needs no sentence frame.\n'
  + '    else if ((CONCISE_TAX_PHRASE_RE.test(fullLo) || namedStatuteInTaxQuestionLocal)\n'
  + '             && !hasNonTaxDomainNounIn(fullLo) && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(fullLo)) {\n'
  + "      add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');\n"
  + '    }\n'
  + relAnchor);

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
