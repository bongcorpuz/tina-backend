// PHASE-10A14-R20 COMMIT 5R1-C13 iteration 03 — non-tax action relation for
// verbless ordinary noun phrases and Filipino non-tax imperatives.
// Hypothesis: REQUESTS_NON_TAX_ACTION_ON is gated on RE.nonTaxAction, a VERB list.
// A request whose primary clause is an ordinary noun phrase in a non-tax domain has
// no verb at all, so the refusal carries no relation to explain it. The precedence
// spec requires every decision to be grounded in a relation; a non-tax subject matter
// with no tax relation IS a request for a non-tax action on that object.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

const anchor = `  if (anyNonTaxActionClause && !anyTaxTaskRel) {
    add('REQUESTS_NON_TAX_ACTION_ON', nonTaxActionVerb || 'action', nonTaxActionTarget || 'object');
  }`;
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS nonTaxActionClause');

// A verbless ordinary noun phrase in a non-tax domain is a request about that
// ordinary subject matter. Structural test: no tax relation was established, the
// text carries a recognised non-tax domain noun, and no governed tax predicate or
// tax-authority term claims the subject.
const replacement = `  if (anyNonTaxActionClause && !anyTaxTaskRel) {
    add('REQUESTS_NON_TAX_ACTION_ON', nonTaxActionVerb || 'action', nonTaxActionTarget || 'object');
  }
  // C13 relation lane — VERBLESS ORDINARY SUBJECT MATTER.
  // A request can name an ordinary object without any verb ("hotel resort fee
  // brochure"). The non-tax-action scan is verb-driven, so such a request produced no
  // relation at all and the refusal was ungrounded. Under the precedence spec every
  // decision must rest on a relation: an ordinary-domain subject with no tax relation
  // is a request for a non-tax action on that object. Guarded so that a governed tax
  // predicate, a tax-authority term or unambiguous tax terminology keeps its tax
  // reading, and so quotation/label/expansion/definition readings still control.
  // The controlling signal is the ABSENCE of any tax claim over the subject, not
  // membership of a non-tax vocabulary list: a closed list of ordinary nouns could
  // never generalise and would amount to memorisation. A request that establishes no
  // tax relation, names no tax authority or tax terminology, and is not a
  // quotation/label/expansion/definition, is a request about ordinary subject matter.
  const namesAnyTaxSubject = UNAMBIGUOUS_PH_TAX_TERM_RE.test(fullLo)
    || PH_TAX_AUTHORITY_TERM_RE.test(fullLo)
    || CONCISE_TAX_PHRASE_RE.test(fullLo)
    || BARE_TAX_TOPIC_RE.test(fullLo)
    || RECOGNIZED_TAX_ACRONYM_RE.test(fullLo)
    || /\\b(?:tax|taxes|taxable|taxation|buwis|kabuwisan|vat|withhold\\w*|excise|customs|tariff|dutiable|deductib\\w*|revenue|bir)\\b/i.test(fullLo);
  // An UNRESOLVED referent is not ordinary subject matter. A bare or ambiguous acronym
  // ("CAR?") and a contentless deictic name no subject at all, so they must stay in the
  // clarification lane rather than be grounded as a non-tax request. Requiring a
  // multi-word, contentful subject keeps this rule to requests that actually name
  // something ordinary.
  const subjectWordCount = fullLo.trim().replace(/[?.!,;:]/g, '').split(/\\s+/).filter(Boolean).length;
  const unresolvedReferent = acronymMentions.some((am) => am.ambiguous)
    || /^\\s*[a-z]{2,6}\\s*\\??\\s*$/i.test(fullLo.trim())
    || subjectWordCount < 2;
  if (!anyTaxTaskRel && !relations.length && !relations._homographVeto
      && !taskIsQuote && !taskIsLabel && !taskIsExpansion && !taskIsDefinition
      && !hasNegationScope
      && !unresolvedReferent
      && !namesAnyTaxSubject) {
    add('REQUESTS_NON_TAX_ACTION_ON', primary.taskVerb || 'action', target || 'object');
  }`;
s = s.replace(anchor, replacement);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-03 applied; bytes', before.length, '->', s.length);
