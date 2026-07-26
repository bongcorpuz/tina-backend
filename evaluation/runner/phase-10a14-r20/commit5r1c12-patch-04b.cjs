// PHASE-10A14-R20 COMMIT 5R1-C12 — iteration 04 refinement.
//
// The homograph-veto exemption used governedTaxPredicateAnywhere, which is too broad:
// "Output VAT to the console" has a tax predicate but the console governs the target, so
// the veto must stand. Only a subordinate code or tag clause under a governed tax
// predicate may defeat the veto.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
const lines = fs.readFileSync(p, 'utf8').split('\n');

const hv = lines.findIndex((l) => l.includes('evidence.homographVeto && !hasTreatment && !hasCompliance && !evidence.governedTaxPredicateAnywhere'));
if (hv < 0) throw new Error('homograph veto line not found');
lines[hv] = lines[hv].replace('&& !evidence.governedTaxPredicateAnywhere', '&& !evidence.taxPredicateOverSubordinateCodeClause');

const evi = lines.findIndex((l) => l.startsWith('  const governedTaxPredicateAnywhere ='));
if (evi < 0) throw new Error('predicate evidence not found');
lines.splice(evi + 1, 0, [
  '  // Only a subordinate code or tag clause under a governed tax predicate defeats the',
  '  // homograph veto; a program artefact governing the target keeps it.',
  '  const taxPredicateOverSubordinateCodeClause = /\\b(?:even though|although|though|when|while|if)\\b[^?]*\\b(?:filed|booked|stored|tagged|labelled|labeled|bears|carries|under|with)\\b[^?]*\\b(?:code|tag)\\b/i.test(fullLo)',
  '    && /\\b(?:deductib\\w*|taxab\\w*|dutiable|subject to (?:vat|tax|withholding|customs))\\b/i.test(fullLo);',
].join('\n'));

const obj = lines.findIndex((l) => l.includes('governedTaxPredicateAnywhere, artefactIsCommercialTaxTarget'));
if (obj < 0) throw new Error('evidence object not found');
lines[obj] = lines[obj].replace('governedTaxPredicateAnywhere, artefactIsCommercialTaxTarget',
  'governedTaxPredicateAnywhere, taxPredicateOverSubordinateCodeClause, artefactIsCommercialTaxTarget');

fs.writeFileSync(p, lines.join('\n'));
console.log('narrowed homograph exemption to subordinate-code clauses');
