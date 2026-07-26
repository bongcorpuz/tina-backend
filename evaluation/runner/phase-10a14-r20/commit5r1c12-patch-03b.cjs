// PHASE-10A14-R20 COMMIT 5R1-C12 — iteration 03, single-line regex literals throughout.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let lines = fs.readFileSync(p, 'utf8').split('\n');
const before = lines.join('\n').length;
const find = (pred, label) => {
  const i = lines.findIndex(pred);
  if (i < 0) throw new Error('anchor not found: ' + label);
  return i;
};

const PRED = '/\\b(?:deductib\\w*|taxab\\w*|dutiable|vatable|subject to (?:vat|tax|withholding|customs|excise|final tax)|value[- ]added tax|withholding tax|customs dut\\w*|import dut\\w*|capital gains? tax|final tax|documentary stamp|excise tax|percentage tax|estate tax|input vat|output vat|creditable)\\b/i';

// ── evidence
const evi = find((l) => l.startsWith('  const taxActorOrRemedyRelation ='), 'actor/remedy');
lines.splice(evi, 0, [
  '  // A governed tax predicate stated anywhere in the query. Used to stop the label,',
  '  // contentless and artefact guards from displacing a real tax question.',
  '  const governedTaxPredicateAnywhere = ' + PRED + '.test(fullLo);',
  '  // A named statute or code in a treatment or effect frame is governed subject matter,',
  '  // unless the main finite verb is a naming action.',
  '  const statuteInEffectFrame = NAMED_STATUTE_RE.test(fullLo)',
  '    && /\\b(?:change[sd]?|affect\\w*|govern\\w*|apply|applies|treat[sd]?|cover\\w*|require\\w*|impose[sd]?|allow[sd]?)\\b/i.test(fullLo)',
  '    && !/^(?:please\\s+)?(?:name|rename|label|tag|title|call|store|save)\\b/i.test(normalizedText.trim());',
  '  // A multi-clause query that explicitly flags its principal question: the flagged',
  '  // clause controls whatever its position.',
  '  const flaggedPrincipalQuestion = /\\b(?:the real question is|my main question is|the main question is|before anything else)\\b/i.test(fullLo)',
  '    && ' + PRED + '.test(fullLo);',
  '  // A bare tax topic carrying a claim, prescription or remedy relation.',
  '  const bareTaxClaimOrRemedyTopic = /\\b(?:refund|claim|prescription|remed\\w*|protest|appeal|relief)\\b/i.test(fullLo)',
  '    && /\\b(?:tax|taxpayer|refund|revenue|assessed)\\b/i.test(fullLo)',
  '    && normalizedText.trim().split(/\\s+/).length <= 6 && !/[?]/.test(normalizedText);',
].join('\n'));

const obj = find((l) => l.includes('taxActorOrRemedyRelation, issuanceChangesTaxRate'), 'evidence object');
lines[obj] = lines[obj].replace('taxActorOrRemedyRelation, issuanceChangesTaxRate',
  'taxActorOrRemedyRelation, issuanceChangesTaxRate, governedTaxPredicateAnywhere, statuteInEffectFrame, flaggedPrincipalQuestion, bareTaxClaimOrRemedyTopic');

// ── decision rules
const dec = find((l) => l.includes('// A primary label, print, caption or display action controls its own target.'), 'decision anchor');
lines.splice(dec, 0, [
  '  // A statute in an effect frame, a flagged principal tax question, or a bare tax',
  '  // claim/remedy topic is governed subject matter.',
  '  if ((evidence.statuteInEffectFrame || evidence.flaggedPrincipalQuestion || evidence.bareTaxClaimOrRemedyTopic)',
  '      && !evidence.primaryLabelOrDisplayAction && !quotesTerm) {',
  "    return decide('ALLOW', 'explicit_tax_task_relation', 0.82);",
  '  }',
].join('\n'));

// ── guards must yield to a governed tax predicate
const lbRule = find((l) => l.includes('if (namesLabel && !hasTreatment && !hasCompliance'), 'label rule');
lines[lbRule] = lines[lbRule].replace('if (namesLabel && !hasTreatment && !hasCompliance',
  'if (namesLabel && !hasTreatment && !hasCompliance && !evidence.governedTaxPredicateAnywhere');

const clRule = find((l) => l.includes('if (evidence.contentlessTreatmentTarget && (hasTreatment || hasCompliance)'), 'contentless rule');
lines[clRule] = lines[clRule].replace('if (evidence.contentlessTreatmentTarget && (hasTreatment || hasCompliance)',
  'if (evidence.contentlessTreatmentTarget && (hasTreatment || hasCompliance) && !evidence.governedTaxPredicateAnywhere');

const styRule = find((l) => l.includes('if (evidence.stylingOrProgramTarget'), 'styling rule');
lines[styRule] = lines[styRule].replace('if (evidence.stylingOrProgramTarget',
  'if (evidence.stylingOrProgramTarget && !evidence.governedTaxPredicateAnywhere');

// ── canonical acronym in an explanatory frame resolves the definition
const ambRule = find((l) => l.includes("if (anyAmbiguous) return decide('CLARIFY', 'ambiguous_tax_acronym', 0.55);"), 'ambiguity');
lines.splice(ambRule, 0, [
  '    if (evidence.taxCanonicalAcronym && !evidence.nonTaxExpansionBinding',
  '        && !evidence.definitionFrameWithMetadataOnly) {',
  "      return decide('ALLOW', 'tax_definition_with_context', 0.80);",
  '    }',
].join('\n'));

fs.writeFileSync(p, lines.join('\n'));
console.log('patched: +' + (lines.join('\n').length - before) + ' bytes');
