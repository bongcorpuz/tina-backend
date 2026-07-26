// PHASE-10A14-R20 COMMIT 5R1-C9 — iteration 06 (final material iteration).
//
// (1) The two remaining Filipino rows carry a tax relation but still lose to the non-tax
//     action rule because a domain noun co-occurs. A Filipino tax predicate governing a
//     named object controls regardless of the object's ordinary domain.
// (2) Bare tax-concept phrases and lone canonical acronyms used as the requested concept
//     ("refund claim prescription", "RCIT") are governed requests.
// (3) A tax attribute over a contentless deictic keeps REFUSE even when the attribute is
//     a real tax concept ("What is the holding period? Context N.").
// (4) An ordinary-domain compliance homograph (student alphalist, goods return, weekend
//     payment date) keeps its own domain.
// (5) A named statute in a tax question carries a tax relation.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// (1) Filipino tax predicate controls over a co-occurring ordinary domain noun.
const gate = "  const taskIsNonTaxAction = !namesTaxInstrument && !filipinoTaxPredicate && !explanatoryOverTaxInstrument && !filipinoTaxRelationOverTargetLocal\n";
if (!s.includes(gate)) throw new Error('non-tax gate missing');
// already excluded; ensure the decision layer also honours it
const nonTaxDecision = "  if (requestsNonTax && !hasTreatment && !hasCompliance && !evidence.taxRelationOverPrimaryTarget";
if (!s.includes(nonTaxDecision)) throw new Error('non-tax decision missing');

// The ordinary-procedural REFUSE must yield to a Filipino tax relation over a target.
const ordRule = '  if (evidence.ordinaryProceduralSense) {';
if (!s.includes(ordRule)) throw new Error('ordinary procedural rule missing');
s = s.replace(ordRule,
  '  if (evidence.ordinaryProceduralSense && !evidence.filipinoTaxRelationOverTarget) {');

// The styling/creative guards must also yield to a Filipino tax relation.
s = s.replace('  if (evidence.stylingOrProgramTarget) {',
  '  if (evidence.stylingOrProgramTarget && !evidence.filipinoTaxRelationOverTarget) {');

// (2) bare tax concept: concise phrase or lone canonical acronym as the request
const evAnchor = '  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // A short phrase naming a tax concept, or a lone tax-canonical acronym, is the\n'
  + '  // requested subject matter itself.\n'
  + '  const bareTaxConceptRequest = (CONCISE_TAX_PHRASE_RE.test(fullLo) || TAX_CANONICAL_ACRONYM_RE.test(fullLo))\n'
  + '    && normalizedText.trim().split(/\\s+/).length <= 5\n'
  + '    && !/[?]/.test(normalizedText);\n'
  + '  // A tax attribute over a contentless deictic is still contentless: an enumerated\n'
  + '  // suffix cannot supply the missing subject.\n'
  + '  const taxAttributeOverContentlessDeictic = METADATA_SUFFIX_RE.test(fullLo)\n'
  + '    && /^(?:what|when|is|are|does|do|can|how)\\b[^?]*\\b(?:the|this|that|it)\\b[^?]*\\?/i.test(normalizedText.trim())\n'
  + '    && !CONCRETE_ANTECEDENT_NOUN_RE.test(fullLo);');

const objAnchor = 'taxRelationOverPrimaryTarget, subordinateCodeClause, namedStatuteInTaxQuestion };';
if (!s.includes(objAnchor)) throw new Error('evidence object anchor missing');
s = s.replace(objAnchor, 'taxRelationOverPrimaryTarget, subordinateCodeClause, namedStatuteInTaxQuestion, bareTaxConceptRequest, taxAttributeOverContentlessDeictic };');

// (3) contentless deictic keeps REFUSE — placed before the tax-relation rules
const decAnchor = '  // 0d-bis-1. An ordinary creative or selection action over an artefact governs its';
if (!s.includes(decAnchor)) throw new Error('decision anchor missing');
s = s.replace(decAnchor,
  '  // 0c-bis. A tax attribute over a contentless deictic has no target: an enumerated\n'
  + '  // suffix cannot supply the missing subject, so the frozen REFUSE fallback applies.\n'
  + '  if (evidence.taxAttributeOverContentlessDeictic && !evidence.bareTaxConceptRequest) {\n'
  + "    return decide('REFUSE', 'no_tax_relation', 0.60);\n"
  + '  }\n'
  + decAnchor);

// (2b) + (5) relation branch: bare tax concept and named statute carry a relation
const relAnchor = '    // A Filipino/Taglish tax predicate governing a named object is a tax relation.';
if (!s.includes(relAnchor)) throw new Error('relation anchor missing');
s = s.replace(relAnchor,
  '    // A bare tax-concept request, or a named statute inside a tax question, names the\n'
  + '    // governed subject matter directly.\n'
  + '    else if ((bareTaxConceptRequestLocal || namedStatuteInTaxQuestionLocal)\n'
  + '             && !hasNonTaxDomainNounIn(fullLo)) {\n'
  + "      add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');\n"
  + '    }\n'
  + relAnchor);

// locals for the relation-building scope
const localAnchor = '  const filipinoTaxRelationOverTargetLocal =';
if (!s.includes(localAnchor)) throw new Error('local anchor missing');
s = s.replace(localAnchor,
  '  const bareTaxConceptRequestLocal = (CONCISE_TAX_PHRASE_RE.test(fullLo) || TAX_CANONICAL_ACRONYM_RE.test(fullLo))\n'
  + '    && fullLo.trim().split(/\\s+/).length <= 5 && !/[?]/.test(fullLo);\n'
  + '  const namedStatuteInTaxQuestionLocal = /\\b(?:tariff and customs code|national internal revenue code|nirc|ease of paying taxes(?: act)?|train law|create law|customs modernization(?: and tariff)? act)\\b/i.test(fullLo)\n'
  + '    && /\\b(?:affect|apply|applies|govern|cover|change|require|impose|allow|under)\\b/i.test(fullLo);\n'
  + localAnchor);

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
