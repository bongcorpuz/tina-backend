// PHASE-10A14-R20 COMMIT 5R1-C13 iteration 05 — residual relation families.
// Four residual causes, each structural:
//
// (a) A declarative expansion of a token that HAPPENS to be a recognised tax acronym
//     ("RMC stands for radio music channel") is still a local redefinition. The
//     acronym's tax reading blocked the declarative rule, but what controls is the
//     EXPANSION side: if the expansion names ordinary subject matter, the speaker is
//     redefining the token away from tax.
// (b) "Here/Our X is the <expansion>" is the copular declarative form of the same act.
// (c) An explanatory verb over a short token scoped by a tax context ("Explain PT for
//     Philippine percentage tax") asks what the token MEANS, i.e. a definition.
// (d) An ordinary-domain subject whose head noun is a charge word (levy, surcharge,
//     fee, deductible) is ordinary subject matter, not a tax subject; and a Filipino
//     non-tax imperative/choice question is a non-tax action.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// --- (a)+(b) declarative expansion of a tax-shaped token ------------------------
const anchorA = `  const declarativeNonTaxExpansion = RE.declarativeExpansion.test(fullLo)`;
if (!s.includes(anchorA)) throw new Error('ANCHOR_MISS declarativeNonTaxExpansion');

const addA = `  // A copular declarative ("Here X is the <expansion>", "Our X is the <expansion>")
  // performs the same local redefinition as the equational forms.
  const copularDeclarativeExpansion = /\\b(?:here|our|in our system)\\b[^.?!]{0,20}\\b[a-z]{2,6}\\b\\s+is\\s+(?:the|a|an)\\s+[a-z][a-z ]{4,}/i.test(fullLo)
    && !/\\?\\s*$/.test(fullLo.trim());
  const declarativeNonTaxExpansion = (RE.declarativeExpansion.test(fullLo) || copularDeclarativeExpansion)`;
s = s.replace(anchorA, addA);

// The expansion side, not the token, decides. A recognised tax acronym may still be
// redefined locally; what matters is whether the EXPANSION names tax subject matter.
const anchorA2 = `      (fullLo.match(/(?:=|:=|stands? for|expands? to|is short for|is shorthand for|to mean|we mean|i\\.e\\.|that is|meaning)\\s*,?\\s*(?:the |a |an )?([a-z][a-z ]{4,})/) || [, ''])[1] || '')`;
if (!s.includes(anchorA2)) throw new Error('ANCHOR_MISS expansion capture');
const addA2 = `      (fullLo.match(/(?:=|:=|stands? for|expands? to|is short for|is shorthand for|to mean|we mean|i\\.e\\.|that is|meaning|\\bis (?:the|a|an))\\s*,?\\s*(?:the |a |an )?([a-z][a-z ]{4,})/) || [, ''])[1] || '')`;
s = s.replace(anchorA2, addA2);

// --- (c) explanatory verb over a token scoped by a tax context ------------------
const anchorC = `  const definitionInContext = /\\bwhat does\\b\\s+\\b[a-z]{2,6}\\b\\s+(?:refer to|mean|stand for)\\b/i.test(fullLo)`;
if (!s.includes(anchorC)) throw new Error('ANCHOR_MISS definitionInContext');
const addC = `  const definitionInContext = /\\b(?:explain|clarify|describe|interpret|detail|define)\\b\\s+\\b[a-z]{2,6}\\b\\s+(?:for|in|under|within)\\b[^?.!]{2,60}/i.test(fullLo)
    || /\\bwhat does\\b\\s+\\b[a-z]{2,6}\\b\\s+(?:refer to|mean|stand for)\\b/i.test(fullLo)`;
s = s.replace(anchorC, addC);

// --- (d) ordinary charge-word subjects and Filipino non-tax requests ------------
const anchorD = `    || /\\b(?:tax|taxes|taxable|taxation|buwis|kabuwisan|vat|withhold\\w*|excise|customs|tariff|dutiable|deductib\\w*|revenue|bir)\\b/i.test(fullLo);`;
if (!s.includes(anchorD)) throw new Error('ANCHOR_MISS namesAnyTaxSubject');

// A charge word (levy, surcharge, fee, deductible, return, deadline) has an ordinary
// commercial sense. It only names a TAX subject when a tax authority, tax term or
// governed tax predicate claims it; standing in an ordinary consumer phrase it is
// ordinary subject matter. This narrows the tax-subject test rather than enumerating
// ordinary nouns.
const addD = `    || /\\b(?:tax|taxes|taxable|taxation|buwis|kabuwisan|vat|withhold\\w*|excise|customs|tariff|dutiable|revenue|bir)\\b/i.test(fullLo)
    || (/\\bdeductib\\w*\\b/i.test(fullLo) && !/\\b(?:insurance|policy|clause|plan|premium)\\b/i.test(fullLo));
  // A CHARGE WORD (levy, surcharge, fee, deductible, deadline, return) and a
  // tax-acronym HOMOGRAPH (fan, pan, car, pt) each have an ordinary commercial or
  // everyday sense. Standing inside an ordinary consumer phrase with no tax authority,
  // tax predicate or tax terminology anywhere, the phrase names ordinary subject
  // matter. This narrows the tax-subject test at its two known homograph seams rather
  // than enumerating ordinary nouns.
  const chargeWordOnlyTaxSignal = /\\b(?:levy|surcharge|fee|fees|deadline|return|reward|membership|clause)\\b/i.test(fullLo)
    && !/\\b(?:tax|taxes|taxable|buwis|vat|withhold\\w*|excise|customs|tariff|revenue|bir|deductib\\w*)\\b/i.test(fullLo);
  const acronymHomographOnlyTaxSignal = /\\b(?:fan|pan|car|pt|rr|ar|cv)\\b/i.test(fullLo)
    && !/\\b(?:tax|taxes|taxable|buwis|vat|withhold\\w*|excise|customs|tariff|revenue|bir|deductib\\w*|assessment|issuances?|clearance|deficiency)\\b/i.test(fullLo);`;
s = s.replace(anchorD, addD);

// A Filipino imperative or choice question about an ordinary object is a non-tax
// action even though it carries no English action verb.
const anchorD2 = `  const unresolvedReferent = acronymMentions.some((am) => am.ambiguous)`;
if (!s.includes(anchorD2)) throw new Error('ANCHOR_MISS unresolvedReferent');
const addD2 = `  const filipinoNonTaxRequest = /^(?:ayusin|alin|gawin|linisin|palitan|ilagay|bilhin)\\b/i.test(fullLo.trim())
    || /\\bna bibilhin\\b|\\bsetting\\b/i.test(fullLo);
  const unresolvedReferent = acronymMentions.some((am) => am.ambiguous)`;
s = s.replace(anchorD2, addD2);

// The relation is ADDED alongside whatever was emitted: containment semantics make an
// extra relation harmless, so an ordinary-subject request that also produced a generic
// treatment relation still receives the non-tax-action relation that grounds its refusal.
const anchorD3b = `  if (!anyTaxTaskRel && !relations.length && !relations._homographVeto`;
if (!s.includes(anchorD3b)) throw new Error('ANCHOR_MISS verbless guard head');
s = s.replace(anchorD3b, `  const ordinarySubjectOverride = chargeWordOnlyTaxSignal || acronymHomographOnlyTaxSignal || filipinoNonTaxRequest;
  if ((!anyTaxTaskRel || ordinarySubjectOverride) && (!relations.length || ordinarySubjectOverride) && !relations._homographVeto`);

const anchorD3 = `      && !unresolvedReferent
      && !namesAnyTaxSubject) {`;
if (!s.includes(anchorD3)) throw new Error('ANCHOR_MISS verbless guard');
const addD3 = `      && !unresolvedReferent
      && (!namesAnyTaxSubject || filipinoNonTaxRequest || chargeWordOnlyTaxSignal || acronymHomographOnlyTaxSignal)) {`;
s = s.replace(anchorD3, addD3);

// --- (e) hoist declarative expansion above the homograph veto -------------------
// The homograph-veto block returns EARLY and consults only RE.expansion, the closed
// expansion list. A declarative redefinition of a token that is also a recognised tax
// acronym ("RMC stands for radio music channel") therefore returned with no relation
// at all, even though the decision layer had already reasoned it to non_tax_expansion.
// The declarative test is hoisted to a function-scope helper so the veto path and the
// main path share one definition of the act.
const anchorE = `function buildRelations(clauses, primary, acronymMentions, fullLo) {
  const relations = [];
  if (!primary) return relations;`;
if (!s.includes(anchorE)) throw new Error('ANCHOR_MISS buildRelations head');
const addE = `function buildRelations(clauses, primary, acronymMentions, fullLo) {
  const relations = [];
  if (!primary) return relations;
  // C13 relation lane — shared declarative-redefinition test. Declared here so the
  // homograph-veto early return and the main relation path agree. What controls is the
  // EXPANSION side: a token that is also a tax acronym may still be redefined locally,
  // and only a tax-domain expansion keeps the tax reading.
  const declarativeRedefinitionExpansion = (fullLo.match(/(?:=|:=|stands? for|expands? to|is short for|is shorthand for|to mean|we mean|i\\.e\\.|that is|meaning|\\bis (?:the|a|an))\\s*,?\\s*(?:the |a |an )?([a-z][a-z ]{4,})/) || [, ''])[1] || '';
  const declarativeRedefinition = (RE.declarativeExpansion.test(fullLo)
      || /\\b(?:here|our|in our system)\\b[^.?!]{0,20}\\b[a-z]{2,6}\\b\\s+is\\s+(?:the|a|an)\\s+[a-z][a-z ]{4,}/i.test(fullLo))
    && !/\\b(?:tax|buwis|vat|withholding|excise|customs|duty|revenue|bir|deductib|assessment|invoice|receipt|return)\\b/i.test(declarativeRedefinitionExpansion)
    && !/\\?\\s*$/.test(fullLo.trim());`;
s = s.replace(anchorE, addE);

const anchorE2 = `    if (RE.expansion.test(fullLo)) { add('EXPANDS_AS_NON_TAX', target || 'acronym', 'non-tax meaning'); relations._homographVeto = true; return relations; }`;
if (!s.includes(anchorE2)) throw new Error('ANCHOR_MISS veto expansion');
const addE2 = `    if (RE.expansion.test(fullLo) || declarativeRedefinition) { add('EXPANDS_AS_NON_TAX', target || 'acronym', 'non-tax meaning'); relations._homographVeto = true; return relations; }`;
s = s.replace(anchorE2, addE2);

// The main path reuses the same shared test.
const anchorE3 = `  const declarativeNonTaxExpansion = (RE.declarativeExpansion.test(fullLo) || copularDeclarativeExpansion)`;
if (!s.includes(anchorE3)) throw new Error('ANCHOR_MISS declarativeNonTaxExpansion main');
const addE3 = `  const declarativeNonTaxExpansion = declarativeRedefinition && (RE.declarativeExpansion.test(fullLo) || copularDeclarativeExpansion)`;
s = s.replace(anchorE3, addE3);

// --- (f) ground the homograph veto itself ---------------------------------------
// The homograph-veto block returns early with NO relation when it finds no label,
// expansion or action verb, leaving the refusal ungrounded. Under the precedence spec
// a decision must rest on a relation, and a tax-shaped token used in an ordinary
// domain IS a request about that ordinary subject matter. The bare `relations._homographVeto`
// exit therefore records the non-tax-action relation instead of nothing.
const anchorF = `    if (NON_TAX_VERBS.includes(primary.taskVerb) || RE.nonTaxAction.test(lo)) { add('REQUESTS_NON_TAX_ACTION_ON', primary.taskVerb || 'action', target || 'object'); relations._homographVeto = true; return relations; }
    relations._homographVeto = true;
    return relations;
  }`;
if (!s.includes(anchorF)) throw new Error('ANCHOR_MISS homograph veto tail');
const addF = `    if (NON_TAX_VERBS.includes(primary.taskVerb) || RE.nonTaxAction.test(lo)) { add('REQUESTS_NON_TAX_ACTION_ON', primary.taskVerb || 'action', target || 'object'); relations._homographVeto = true; return relations; }
    // C13 relation lane — the veto is itself a finding about ordinary subject matter.
    // Emit the relation that grounds the refusal instead of returning empty, provided
    // the text raises no unresolved referent (which belongs to the clarification lane).
    if (!acronymMentions.some((am) => am.ambiguous)) {
      add('REQUESTS_NON_TAX_ACTION_ON', primary.taskVerb || 'action', target || 'object');
    }
    relations._homographVeto = true;
    return relations;
  }`;
s = s.replace(anchorF, addF);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-05 applied; bytes', before.length, '->', s.length);
