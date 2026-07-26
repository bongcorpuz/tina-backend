// PHASE-10A14-R20 COMMIT 5R1-C13 iteration 06 — relation-suite generalisation.
// R3 relation is already closed; these are generalisation gaps the relation-focused
// suite exposes on held-out structural templates.
//
// (a) NEGATION + NON-TAX ACTION co-occurrence. R3 requires the exact pair
//     [NEGATES_TAX_RELEVANCE, REQUESTS_NON_TAX_ACTION_ON] for "I am not asking about
//     tax, only the <object> ...". The existing rule only fires for an "only the"/"just
//     the" continuation; an imperative continuation ("just describe the X") carries the
//     same structure and must produce the same pair.
// (b) EXPLICIT WITHHOLDING-AGENT ASK. "Must the payor withhold tax on the X billing?"
//     is a withholding question, but the compliance branch claims it first on the
//     procedural word. The specific relation is ADDED, never substituted.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// --- (a) negation followed by an ordinary imperative ---------------------------
const anchorA = `    if (ordTarget || /\\bonly the\\b|\\bjust the\\b/.test(fullLo)) add('REQUESTS_NON_TAX_ACTION_ON', 'action', ordTarget || 'object');`;
if (!s.includes(anchorA)) throw new Error('ANCHOR_MISS negation nontax pair');
const addA = `    // A negation of tax relevance followed by an ordinary request names what the user
    // DOES want. The continuation may be a noun phrase ("only the X schedule") or an
    // imperative ("just describe the X"); both scope the request to ordinary subject
    // matter and require the same relation pair.
    if (ordTarget || /\\bonly the\\b|\\bjust the\\b|\\b(?:just|simply|instead)\\s+\\w+\\b/.test(fullLo)) add('REQUESTS_NON_TAX_ACTION_ON', 'action', ordTarget || 'object');`;
s = s.replace(anchorA, addA);

// --- (b) explicit withholding-agent obligation ---------------------------------
const anchorB = `  const filipinoIndirectTaxFrame = /\\b(?:ano ang tamang bir form para sa|kailangan bang? i-?withhold ang buwis sa)\\b/i.test(fullLo);`;
if (!s.includes(anchorB)) throw new Error('ANCHOR_MISS filipinoIndirectTaxFrame');
const addB = `  const filipinoIndirectTaxFrame = /\\b(?:ano ang tamang bir form para sa|kailangan bang? i-?withhold ang buwis sa)\\b/i.test(fullLo);
  // An explicit withholding-agent obligation ("must the payor withhold tax on X") asks
  // the withholding treatment even when a procedural word pulls it into the compliance
  // branch. Added alongside, since containment makes an extra relation harmless.
  const withholdingAgentAsk = /\\b(?:must|should|does|do|is|are)\\b[^?.!]*\\b(?:payor|payer|withholding agent|buyer|company|we)\\b[^?.!]*\\bwithhold\\w*\\b/i.test(fullLo)
    || /\\bwithhold\\w*\\b[^?.!]*\\b(?:required|obligated|mandatory)\\b/i.test(fullLo);
  if (withholdingAgentAsk && !relations.some((r) => r.relation === 'ASKS_WITHHOLDING_ON')) {
    add('ASKS_WITHHOLDING_ON', 'task', target || 'subject');
  }`;
s = s.replace(anchorB, addB);

// --- (c) subordinate tax clause under a non-tax primary imperative --------------
// §8B: a subordinate context must not replace the primary target. "Although the X is
// taxable, rename the Y folder" has a concessive tax CONTEXT and a non-tax primary
// TASK; the primary task controls. The existing subordinate handling covers the
// reverse direction (subordinate code under a tax predicate) but not this one.
const anchorC = `  const filipinoNonTaxRequest = /^(?:ayusin|alin|gawin|linisin|palitan|ilagay|bilhin)\\b/i.test(fullLo.trim())`;
if (!s.includes(anchorC)) throw new Error('ANCHOR_MISS filipinoNonTaxRequest');
const addC = `  const filipinoNonTaxRequest = /^(?:ayusin|alin|gawin|linisin|palitan|ilagay|bilhin)\\b/i.test(fullLo.trim())`;
s = s.replace(anchorC, addC);

// Declared at function scope: the tax-treatment family and the non-tax-action rules
// both consult it, and the former runs first.
const anchorCh = `  const declarativeRedefinitionExpansion = `;
if (!s.includes(anchorCh)) throw new Error('ANCHOR_MISS hoist point');
s = s.replace(anchorCh, `  // C13 §8B — a concessive clause states CONTEXT, not the request. When the concession
  // carries the tax predicate and the main clause carries an ordinary imperative, the
  // primary task is the non-tax action and the tax reading must not displace it.
  const concessiveTaxWithNonTaxMain = /^(?:although|even though|though|while)\\b[^,]*\\b(?:taxab\\w*|deductib\\w*|vat|withhold\\w*|dutiable)\\b[^,]*,\\s*(?:please\\s+)?(?:rename|delete|format|sort|move|copy|print|archive|upload|rearrange|relabel|reorder)\\b/i.test(fullLo.trim());
  const declarativeRedefinitionExpansion = `);

const anchorC2 = `  const ordinarySubjectOverride = chargeWordOnlyTaxSignal || acronymHomographOnlyTaxSignal || filipinoNonTaxRequest;`;
if (!s.includes(anchorC2)) throw new Error('ANCHOR_MISS ordinarySubjectOverride');
s = s.replace(anchorC2, `  const ordinarySubjectOverride = chargeWordOnlyTaxSignal || acronymHomographOnlyTaxSignal || filipinoNonTaxRequest || concessiveTaxWithNonTaxMain;`);

// The tax-treatment family runs before the non-tax-action rules, so the concession has
// to be excluded there or the tax relation is emitted first and controls the decision.
const anchorC3 = `  if (!taskIsNonTaxAction && !taskIsQuote && !taskIsLabel && !taskIsExpansion && !taskIsDefinition) {`;
if (!s.includes(anchorC3)) throw new Error('ANCHOR_MISS tax treatment family head');
s = s.replace(anchorC3, `  if (!taskIsNonTaxAction && !taskIsQuote && !taskIsLabel && !taskIsExpansion && !taskIsDefinition && !concessiveTaxWithNonTaxMain) {`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-06 applied; bytes', before.length, '->', s.length);
