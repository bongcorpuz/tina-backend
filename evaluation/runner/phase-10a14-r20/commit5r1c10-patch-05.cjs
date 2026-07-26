// PHASE-10A14-R20 COMMIT 5R1-C10 — iteration 04 corrections, placed by traced rule.
//
//  rule 32 : a bare tax-canonical acronym used as the requested concept must ALLOW.
//  rule 37 : the true final fallback must let a coherent concise tax phrase through.
//  rule 3  : a tax-domain object inside a private-contract question defeats the domain
//            guard when the question is about the tax treatment itself.
//  rule 2  : a bare taxability question with a treatment relation is a governed request.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
const lines = fs.readFileSync(p, 'utf8').split('\n');
const before = lines.join('\n').length;

const at = (n) => n - 1; // 1-based -> 0-based

// --- rule 32 (line 1091): bare canonical acronym as the requested tax concept
if (!/ambiguous_tax_acronym/.test(lines[at(1091)])) throw new Error('rule 32 line moved');
lines[at(1091)] =
  "    if (evidence.taxCanonicalAcronym && !evidence.nonTaxExpansionBinding) {\n"
  + "      return decide('ALLOW', 'explicit_tax_task_relation', 0.80);\n"
  + "    }\n"
  + lines[at(1091)];

// --- rule 37 (line 1103): final fallback admits a coherent concise tax phrase
if (!/return decide\('REFUSE', 'no_tax_relation', 0\.60\);/.test(lines[at(1103)])) throw new Error('rule 37 line moved');
lines[at(1103)] =
  "  if (evidence.conciseTaxPhrase && !requestsNonTax && !namesLabel && !quotesTerm\n"
  + "      && !evidence.ordinaryProceduralSense && !evidence.nonTaxControllingDomain) {\n"
  + "    return decide('ALLOW', 'explicit_tax_task_relation', 0.80);\n"
  + "  }\n"
  + lines[at(1103)];

fs.writeFileSync(p, lines.join('\n'));
console.log('patched rules 32 and 37; delta +' + (lines.join('\n').length - before) + ' bytes');
