// PHASE-10A14-R20 COMMIT 5R1-C9 — iteration 03 structural corrections.
//
// (1) An explicit tax predicate governing the target defeats a non-tax ACTION reading.
//     "May VAT ba ang website design?" asks about VAT on a design service; "design" is
//     the taxable object, not a requested action. Same for an explanatory verb over a
//     tax instrument in explicit BIR context.
// (2) A recognised tax acronym in explicit BIR / Philippine-tax context is resolved, so
//     the bare-acronym ambiguity guard must not fire.
// (3) A tax-canonical acronym with no material competing ordinary sense is a tax concept.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// ---------------------------------------------------------------- vocabularies
const anchor = 'const RECOGNIZED_TAX_ACRONYM_RE =';
if (!s.includes(anchor)) throw new Error('anchor missing');
const block = [
  '// Tax-canonical acronyms with no material competing ordinary sense. Used as the',
  '// requested tax concept these are self-resolving; polysemous tokens are excluded and',
  '// still require controlling context. This is recognition, never invented expansion.',
  'const TAX_CANONICAL_ACRONYM_RE = /\\b(?:mcit|rcit|nolco|cwt|ewt|fwt|iaet|slsp|dst|cgt|fbt|vat)\\b/i;',
  '',
  '// Explicit Philippine tax / BIR context that resolves an otherwise polysemous token.',
  'const EXPLICIT_TAX_CONTEXT_RE = /\\b(?:bir|bureau of internal revenue|nirc|national internal revenue|revenue (?:issuance|memorandum|regulation|district)|philippine tax|deficiency (?:notice|assessment|interest)|assessment notice|tax assessment|for (?:philippine )?tax|under (?:philippine )?tax|tax purposes|tax issuance|customs|bureau of customs)\\b/i;',
  '',
  anchor,
].join('\n');
s = s.replace(anchor, block);

// ---------------------------------------------------------------- evidence wiring
const evAnchor = '  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // A recognised tax acronym sitting in explicit BIR / Philippine-tax context is\n'
  + '  // resolved by that context, so it is not a materially ambiguous bare acronym.\n'
  + '  const acronymResolvedByTaxContext = RECOGNIZED_TAX_ACRONYM_RE.test(fullLo)\n'
  + '    && EXPLICIT_TAX_CONTEXT_RE.test(fullLo);\n'
  + '  // A tax-canonical acronym has no material competing ordinary sense.\n'
  + '  const taxCanonicalAcronym = TAX_CANONICAL_ACRONYM_RE.test(fullLo);');

const objAnchor = 'bareAcronymDefinition, ordinaryProceduralSense, conciseTaxPhrase };';
if (!s.includes(objAnchor)) throw new Error('evidence object anchor missing');
s = s.replace(objAnchor, 'bareAcronymDefinition, ordinaryProceduralSense, conciseTaxPhrase, acronymResolvedByTaxContext, taxCanonicalAcronym };');

// ---------------------------------------------------------------- relation extraction
// An explicit tax predicate governing the target defeats the non-tax ACTION reading.
const naAnchor = '  const taskIsNonTaxAction = !namesTaxInstrument && !filipinoTaxPredicate\n';
if (!s.includes(naAnchor)) throw new Error('non-tax-action gate missing');
const newNa = [
  '  // An explicit tax predicate governing the target means the noun after it is the',
  '  // taxable object, not a requested action ("May VAT ba ang website design?").',
  '  const explicitTaxPredicateGovernsTarget = /\\b(?:subject to (?:tax|vat|withholding|customs|excise|percentage tax|final tax)|may vat ba|deductible ba|i-?withhold ang buwis|buwis sa|tamang bir form|customs dut\\w*|import dut\\w*|withholding tax|value[- ]added tax|\\bvat\\b|income tax|capital gains tax|documentary stamp|final tax|excise tax|percentage tax|estate tax|deductib\\w*|taxab\\w*|vatable|tax treatment|vat treatment)\\b/i.test(fullLo);',
  '  const taskIsNonTaxAction = !namesTaxInstrument && !filipinoTaxPredicate',
  '    && !(explicitTaxPredicateGovernsTarget && !hasNonTaxDomainNounIn(fullLo))',
  '',
].join('\n');
s = s.replace(naAnchor, newNa);

// ---------------------------------------------------------------- decision rules
// Resolved-by-context acronyms and tax-canonical acronyms are not bare ambiguity.
const d1 = "    if (anyTaxCtx && !evidence.bareAcronymDefinition) return decide('ALLOW', 'tax_definition_with_context', 0.80);";
if (!s.includes(d1)) throw new Error('definition rule 1 missing');
s = s.replace(d1,
  "    if (anyTaxCtx && (!evidence.bareAcronymDefinition || evidence.acronymResolvedByTaxContext || evidence.taxCanonicalAcronym)) {\n"
  + "      return decide('ALLOW', 'tax_definition_with_context', 0.80);\n"
  + "    }");

const d2 = "    if (evidence.phTaxAuthorityTerm && !evidence.bareAcronymDefinition) return decide('ALLOW', 'tax_definition_with_context', 0.80);";
if (!s.includes(d2)) throw new Error('definition rule 2 missing');
s = s.replace(d2,
  "    if (evidence.phTaxAuthorityTerm && (!evidence.bareAcronymDefinition || evidence.acronymResolvedByTaxContext || evidence.taxCanonicalAcronym)) {\n"
  + "      return decide('ALLOW', 'tax_definition_with_context', 0.80);\n"
  + "    }");

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
