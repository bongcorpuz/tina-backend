// PHASE-10A14-R20 COMMIT 5R1-C12 — iteration 02 refinement.
// The ordinary-artefact guard must yield whenever a governed tax predicate governs the
// target: a VAT question about an ordinary activity is still a VAT question.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
const lines = fs.readFileSync(p, 'utf8').split('\n');

const i = lines.findIndex((l) => l.startsWith('  const ordinaryOrProgramTargetControls ='));
if (i < 0) throw new Error('guard declaration not found');
const j = i + 2;
if (!/&& !\/\\b\(\?:bir\|revenue\|taxpayer/.test(lines[j])) throw new Error('negative clause not at expected offset: ' + lines[j].slice(0, 80));

lines[j] = '    && !/\\b(?:bir|revenue|taxpayer|tax refund|input tax|input vat|output vat|withholding'
  + '|customs dut\\w*|import dut\\w*|deductib\\w*|taxab\\w*|vatable'
  + '|subject to (?:vat|tax|withholding|customs)|income tax|value[- ]added tax|claimed for)\\b/i.test(fullLo);';

fs.writeFileSync(p, lines.join('\n'));
console.log('narrowed ordinary-artefact guard at line', j + 1);
