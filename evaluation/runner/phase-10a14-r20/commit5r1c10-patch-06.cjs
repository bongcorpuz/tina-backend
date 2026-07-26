// PHASE-10A14-R20 COMMIT 5R1-C10 — iteration 05 (final material iteration).
//
//  rule 3 : a private-contract question ABOUT the tax treatment itself is a tax question.
//           The domain guard exists for contractual remedies, not for a question whose
//           requested subject is the tax clause. Structural test: an explicit tax noun
//           phrase is the object of the contract question.
//  rule 2 : a bare taxability predicate with a treatment relation and no competing
//           non-tax framing is a governed request about taxability itself, even though
//           the referent is unresolved. Restricted to the bare-predicate shape so
//           metadata-suffixed referents keep REFUSE.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// evidence
const evAnchor = '  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // A private-contract question whose requested subject is the tax treatment itself\n'
  + '  // ("may a lease allocate the VAT?") is a tax question; the domain guard exists for\n'
  + '  // contractual remedies, not for a tax clause that is the object of the question.\n'
  + '  const contractQuestionAboutTaxClause = /\\b(?:lease|contract|agreement|deed|arrangement)\\b/i.test(fullLo)\n'
  + '    && /\\b(?:taxable|tax|vat|value[- ]added|withholding|documentary stamp|capital gains)\\s+(?:costs?\\s+)?(?:clause|provision|allocation|treatment|liability|share|split)\\b/i.test(fullLo);\n'
  + '  // A bare taxability predicate with no competing non-tax framing asks about\n'
  + '  // taxability itself. A metadata suffix still leaves the referent contentless.\n'
  + '  const bareTaxabilityQuestion = /^(?:is|are)\\s+(?:it|this|that|they)\\s+(?:taxable|deductible|vatable|exempt)\\s*\\??$/i.test(normalizedText.trim())\n'
  + '    && !METADATA_SUFFIX_RE.test(fullLo);');

const objAnchor = 'definitionFrameWithMetadataOnly, orderingActionOverOrdinaryPopulation };';
if (!s.includes(objAnchor)) throw new Error('evidence object anchor missing');
s = s.replace(objAnchor, 'definitionFrameWithMetadataOnly, orderingActionOverOrdinaryPopulation, contractQuestionAboutTaxClause, bareTaxabilityQuestion };');

// rule 3: yield to a contract question about the tax clause
const r3 = '  if (evidence.nonTaxControllingDomain && !evidence.explicitTaxAnchorPresent\n      && !evidence.taxRelationOverPrimaryTarget && !evidence.filipinoTaxRelationOverTarget) {';
if (!s.includes(r3)) throw new Error('rule 3 missing');
s = s.replace(r3, r3.replace('&& !evidence.filipinoTaxRelationOverTarget) {', '&& !evidence.filipinoTaxRelationOverTarget && !evidence.contractQuestionAboutTaxClause) {'));

// rule 2: yield to a bare taxability question
const r2 = '  if (evidence.contentlessTreatmentTarget && (hasTreatment || hasCompliance)\n      && !namesLabel && !expandsNonTax && !quotesTerm && !requestsNonTax && !negatesTax) {';
if (!s.includes(r2)) throw new Error('rule 2 missing');
s = s.replace(r2, '  if (evidence.contentlessTreatmentTarget && (hasTreatment || hasCompliance)\n      && !evidence.bareTaxabilityQuestion\n      && !namesLabel && !expandsNonTax && !quotesTerm && !requestsNonTax && !negatesTax) {');

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
