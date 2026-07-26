// PHASE-10A14-R20 COMMIT 5R1-C10 — iteration 02 structural corrections.
//
// (1) The ordinary-procedural guard is currently defeated by ANY governing tax predicate
//     anywhere in the query. "Can a supplier reject a return of goods?" and "What if a
//     payment due date falls on a weekend?" carry no tax-domain object at all, yet a
//     compliance relation is still built. Require a tax-domain object for a compliance
//     relation instead of relying on the decision-layer guard alone.
// (2) A tax attribute in a definition frame with only a metadata suffix has no target.
// (3) A Filipino tax predicate over a named object must survive the ordinary-domain and
//     non-tax-action guards.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// ---------------------------------------------------------------- (1) compliance needs a tax-domain object
const complAnchor = '    else if (isCompliance) add(\'ASKS_TAX_COMPLIANCE_FOR\', \'task\', target || \'transaction\');';
if (!s.includes(complAnchor)) throw new Error('compliance branch missing');
s = s.replace(complAnchor,
  '    // A compliance relation requires a tax-domain object, institution or procedure.\n'
  + '    // The procedural word alone (return, due, file, claim, registration, list) has an\n'
  + '    // ordinary sense that keeps its own domain, so it cannot anchor tax jurisdiction.\n'
  + '    else if (isCompliance && (TAX_DOMAIN_OBJECT_RE.test(fullLo) || CONCISE_TAX_PHRASE_RE.test(fullLo))) {\n'
  + '      add(\'ASKS_TAX_COMPLIANCE_FOR\', \'task\', target || \'transaction\');\n'
  + '    }');

// ---------------------------------------------------------------- (2) metadata-only definition frame
const evAnchor = '  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // A definition-frame question whose only additional content is an enumerated\n'
  + '  // metadata suffix has no target: the suffix is an index, not subject matter.\n'
  + '  const definitionFrameWithMetadataOnly = METADATA_SUFFIX_RE.test(fullLo)\n'
  + '    && /^(?:what|which|when)\\s+(?:is|are|was|were)\\s+(?:the|a|an)\\b/i.test(normalizedText.trim())\n'
  + '    && !TAX_DOMAIN_OBJECT_RE.test(normalizedText.replace(METADATA_SUFFIX_RE, ""))\n'
  + '    && !CONCRETE_ANTECEDENT_NOUN_RE.test(fullLo);');

const objAnchor = 'taxRelationOverPrimaryTarget, subordinateCodeClause, namedStatuteInTaxQuestion };';
if (!s.includes(objAnchor)) throw new Error('evidence object anchor missing');
s = s.replace(objAnchor, 'taxRelationOverPrimaryTarget, subordinateCodeClause, namedStatuteInTaxQuestion, definitionFrameWithMetadataOnly };');

const decAnchor = '  // 0d-bis-1. An ordinary creative or selection action over an artefact governs its';
if (!s.includes(decAnchor)) throw new Error('decision anchor missing');
s = s.replace(decAnchor,
  '  // 0c-ter. A definition frame whose only extra content is an enumerated suffix has no\n'
  + '  // target, so the frozen REFUSE fallback applies.\n'
  + '  if (evidence.definitionFrameWithMetadataOnly) {\n'
  + "    return decide('REFUSE', 'no_tax_relation', 0.60);\n"
  + '  }\n'
  + decAnchor);

// ---------------------------------------------------------------- (3) Filipino predicate survives guards
const ordRule = '  if (evidence.ordinaryProceduralSense) {';
if (!s.includes(ordRule)) throw new Error('ordinary procedural rule missing');
s = s.replace(ordRule, '  if (evidence.ordinaryProceduralSense && !evidence.filipinoTaxRelationOverTarget) {');
const nonTaxDecision = "  if (requestsNonTax && !hasTreatment && !hasCompliance && !evidence.taxRelationOverPrimaryTarget";
if (!s.includes(nonTaxDecision)) throw new Error('non-tax decision missing');
s = s.replace(nonTaxDecision,
  "  if (requestsNonTax && !hasTreatment && !hasCompliance && !evidence.taxRelationOverPrimaryTarget\n"
  + "      && !evidence.filipinoTaxRelationOverTarget");

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
