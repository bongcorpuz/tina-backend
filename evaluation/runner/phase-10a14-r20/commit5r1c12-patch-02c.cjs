// PHASE-10A14-R20 COMMIT 5R1-C12 — iteration 02 second refinement.
//
// (1) The ordinary-artefact guard must also yield to Filipino/Taglish tax predicates and
//     to a negation-framed tax review request, which are governed tax relations in other
//     surface forms.
// (2) The tax-actor/remedy rule must require an actual tax proceeding or authority, not a
//     bare "appeal the assessment" with no tax-domain attachment.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
const lines = fs.readFileSync(p, 'utf8').split('\n');

const i = lines.findIndex((l) => l.startsWith('  const ordinaryOrProgramTargetControls ='));
if (i < 0) throw new Error('artefact guard not found');
const j = i + 2;
lines[j] = '    && !/\\b(?:bir|revenue|taxpayer|tax refund|input tax|input vat|output vat|withholding'
  + '|customs dut\\w*|import dut\\w*|deductib\\w*|taxab\\w*|vatable'
  + '|subject to (?:vat|tax|withholding|customs)|income tax|value[- ]added tax|claimed for'
  + '|may vat ba|buwis|i-?withhold|vat treatment|tax treatment)\\b/i.test(fullLo);';

const k = lines.findIndex((l) => l.startsWith('  const taxActorOrRemedyRelation ='));
if (k < 0) throw new Error('actor/remedy rule not found');
// Require a named tax authority, proceeding or instrument, not merely "assessment".
lines[k + 1] = '    /\\b(?:taxpayer|revenue district|revenue office|revenue issuance|assessed taxpayer'
  + '|deficiency assessment|tax assessment|bir\\b)\\b/i.test(fullLo)';

fs.writeFileSync(p, lines.join('\n'));
console.log('refined artefact guard (line ' + (j + 1) + ') and actor/remedy rule (line ' + (k + 2) + ')');
