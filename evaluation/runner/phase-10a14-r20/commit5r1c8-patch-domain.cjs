// PHASE-10A14-R20 COMMIT 5R1-C8 — patch helper: wire the non-tax head-activity guard
// into the controlling-domain evidence. The head activity of an ordinary noun phrase
// governs its own target, so a tax-shaped modifier cannot anchor a tax relation.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');

const anchor = '  const nonTaxControllingDomain = NON_TAX_CONTROLLING_DOMAIN_RE.test(fullLo)';
if (!s.includes(anchor)) throw new Error('anchor not found');

const replacement = '  const nonTaxHeadActivity = NON_TAX_HEAD_ACTIVITY_RE.test(fullLo) && !strongTaxAnchorForDomain;\n'
  + '  const nonTaxControllingDomain = nonTaxHeadActivity || NON_TAX_CONTROLLING_DOMAIN_RE.test(fullLo)';
s = s.replace(anchor, replacement);

fs.writeFileSync(p, s);
console.log('wired nonTaxHeadActivity');
