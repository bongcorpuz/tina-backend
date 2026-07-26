// PHASE-10A14-R20 COMMIT 5R1-C12 — iteration 03 refinement.
//
// The governed-tax-predicate exemption was applied to the styling/program guard, which
// disabled it for CSS and function rows where the tax-shaped word IS the artefact's name
// ("taxable CSS class", "output VAT as console output label"). There the artefact governs
// the target and the tax word is a homograph, so the guard must stand. Restrict the
// exemption to queries where the artefact is the OBJECT of a tax predicate rather than
// the thing being named or defined.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
const lines = fs.readFileSync(p, 'utf8').split('\n');

const i = lines.findIndex((l) => l.includes('if (evidence.stylingOrProgramTarget && !evidence.governedTaxPredicateAnywhere'));
if (i < 0) throw new Error('styling rule not found');

// Only a sale/purchase/importation of the artefact, or a tax question whose subject is a
// commercial transaction, defeats the artefact guard.
lines[i] = lines[i].replace('&& !evidence.governedTaxPredicateAnywhere',
  '&& !evidence.artefactIsCommercialTaxTarget');

const evi = lines.findIndex((l) => l.startsWith('  const governedTaxPredicateAnywhere ='));
if (evi < 0) throw new Error('predicate evidence not found');
lines.splice(evi + 1, 0, [
  '  // The artefact guard yields only when the artefact is the OBJECT of a commercial tax',
  '  // transaction, not when a tax-shaped word is its name or definition.',
  '  const artefactIsCommercialTaxTarget = /\\b(?:sale|purchase|lease|importation|licence|license|subscription)\\s+of\\b/i.test(fullLo)',
  '    && /\\b(?:subject to|deductib\\w*|taxab\\w*|dutiable|value[- ]added tax|vat\\b)\\b/i.test(fullLo);',
].join('\n'));

const obj = lines.findIndex((l) => l.includes('governedTaxPredicateAnywhere, statuteInEffectFrame'));
if (obj < 0) throw new Error('evidence object not found');
lines[obj] = lines[obj].replace('governedTaxPredicateAnywhere, statuteInEffectFrame',
  'governedTaxPredicateAnywhere, artefactIsCommercialTaxTarget, statuteInEffectFrame');

fs.writeFileSync(p, lines.join('\n'));
console.log('restricted artefact-guard exemption to commercial tax targets');
