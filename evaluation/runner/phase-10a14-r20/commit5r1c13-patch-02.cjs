// PHASE-10A14-R20 COMMIT 5R1-C13 iteration 02 — declarative acronym expansion.
// Hypothesis: RE.expansion recognises interrogative/verb expansion forms but not the
// DECLARATIVE EQUATIONAL family, in which a short all-caps token is bound to a
// non-tax expansion by an equational connective. Generic structural rule; no
// expansion vocabulary and no oracle text is added.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

const anchor = "  nonTaxAction: /\\b(change|rename|delete|draw|paint|compile|install|download|sort|cook|play|sing|design|render|print|debug|prepare|improve|buy|organi[sz]e|fix|build|write|update|configure|adjust|schedule the|format the|edit the|make a|create a|summari[sz]e|list the|explain\\b|which .* (?:is best|brand|should i|to (?:buy|use))|best\\b.*\\?|poster about|novels? about|tune|sample|pick|add\\b)\\b/,";
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS nonTaxAction');

// A declarative expansion binds a short token to a spelled-out expansion via an
// equational connective, in an assertion rather than a question. The expansion side
// must be ordinary words, so a tax expansion keeps its tax reading.
const addition = anchor + `
  // C13 relation lane — DECLARATIVE EQUATIONAL EXPANSION.
  // "X stands for Y", "X = Y", "we use X for Y", "treat X as Y", "by X we mean Y",
  // "set X to mean Y", "X, i.e. Y". These ASSERT a local expansion instead of asking
  // about one, so the interrogative expansion patterns never matched them. Structural:
  // a short token bound to a spelled-out expansion by an equational connective in a
  // non-question. No expansion vocabulary is enumerated.
  declarativeExpansion: /\\b[a-z]{2,6}\\b\\s*(?:=|:=)\\s*[a-z][a-z ]{4,}|\\b(?:stands? for|expands? to|is short for|is shorthand for)\\b\\s+(?:the |a |an )?[a-z][a-z ]{4,}|\\bwe use\\b\\s+\\b[a-z]{2,6}\\b\\s+(?:for|to mean|as)\\s+(?:the |a |an )?[a-z][a-z ]{4,}|\\b(?:treat|set|define|read)\\b\\s+\\b[a-z]{2,6}\\b\\s+(?:as|to mean|to be)\\s+(?:the |a |an )?[a-z][a-z ]{4,}|\\bby\\b\\s+\\b[a-z]{2,6}\\b\\s+we mean\\b|\\b[a-z]{2,6}\\b\\s*,\\s*(?:i\\.e\\.|that is|meaning)\\s*,?\\s*[a-z][a-z ]{4,}/,`;

s = s.replace(anchor, addition);

// Wire the declarative form into the expansion decision, guarded so a genuine tax
// expansion or a tax question keeps its tax reading.
const relAnchor = `  // Explicit non-tax expansion.
  const taskIsExpansion = RE.expansion.test(lo);
  if (taskIsExpansion) add('EXPANDS_AS_NON_TAX', target || 'acronym', 'non-tax meaning');`;
if (!s.includes(relAnchor)) throw new Error('ANCHOR_MISS taskIsExpansion');

const relNew = `  // Explicit non-tax expansion. A declarative equational expansion counts too: the
  // speaker is redefining a token locally, which is an assertion about vocabulary and
  // not a tax question. It yields only when the expansion itself is tax-domain content
  // or the sentence actually asks a governed tax question.
  // A declarative expansion asserts a LOCAL redefinition. Two structural exclusions:
  // the expansion side must not itself be tax-domain content, and the sentence must not
  // be a request for a definition situated in a tax context ("Define X as used in a BIR
  // assessment") — that asks what the term means in tax, it does not redefine it.
  const asksDefinitionInTaxContext = /\\b(?:define|explain|what does|what is|meaning of)\\b[^.?!]*\\bas used in\\b/i.test(fullLo)
    || /\\b(?:as used in|within|in)\\b[^.?!]*\\b(?:tax|buwis|vat|withholding|excise|customs|revenue|bir|assessment|deficiency notice|issuances?|clearance)\\b/i.test(fullLo);
  const declarativeNonTaxExpansion = RE.declarativeExpansion.test(fullLo)
    && !/\\b(?:tax|buwis|vat|withholding|excise|customs|duty|revenue|bir|deductib|assessment|invoice|receipt|return)\\b/i.test(
      (fullLo.match(/(?:=|:=|stands? for|expands? to|is short for|is shorthand for|to mean|we mean|i\\.e\\.|that is|meaning)\\s*,?\\s*(?:the |a |an )?([a-z][a-z ]{4,})/) || [, ''])[1] || '')
    && !asksDefinitionInTaxContext
    && !/\\?\\s*$/.test(fullLo.trim());
  const taskIsExpansion = RE.expansion.test(lo) || declarativeNonTaxExpansion;
  if (taskIsExpansion) add('EXPANDS_AS_NON_TAX', target || 'acronym', 'non-tax meaning');`;
s = s.replace(relAnchor, relNew);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-02 applied; bytes', before.length, '->', s.length);
