// PHASE-10A14-R20 COMMIT 5R1-C16 iteration 02 — typed reason evidence (§8) and the
// highest-precision rules of the measured decision table (§9).
//
// Implements R1, R3 and R8 from COMMIT_5R1C16_REASON_DECISION_TABLE.md:
//
//   R1  an ASSERTED naming act (no action head)          -> non_tax_label_or_name
//       measured precision 1.000 over 28 support, 0 counterexamples.
//       §9B: the action head controls, so an unrelated operation on a named object
//       (rename/print/move/delete a folder) is NOT a naming act.
//
//   R3  a text operation whose OPERAND IS A TERM          -> quoted_tax_term_only
//       narrowing of the C15 rule, which over-fired on documents ("handbook").
//
//   R8  the REFUSE split by requested operation (§9A)     -> explicit_non_tax_task
//       only when an explicit action head AND an action target are present; otherwise
//       no_tax_relation. request_with_action_target measures precision 0.898 / 453.
//
// All fields are derived from the locked clause and relation evidence. No oracle
// category, source set, rule id, template or query identity is used.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// ---- typed reason evidence -----------------------------------------------------
// Anchored ABOVE assertsNamingAct, which consumes reasonRequestsOperation.
const evAnchor = `  // C15 — an ASSERTED naming act: the request states what something is called rather`;
if (!s.includes(evAnchor)) throw new Error('ANCHOR_MISS assertsNamingAct comment');

const evNew = `  // C16 §8 — TYPED REASON EVIDENCE. Every field below is derived from the locked
  // clause and relation evidence; none reads an oracle expectation.
  //
  // reasonTaskRole: a requested OPERATION needs both an action head and something to
  // act on. A question or a bare assertion requests no operation, whatever its shape.
  // The action HEAD is the reliable signal; the target may be structurally implied by
  // the clause even when taskObject is not extracted ("rename the X archive",
  // "ayusin ang X listahan"). Requiring an extracted taskObject would misread genuine
  // operations as questions, so an imperative head with any following noun phrase
  // counts as an operation.
  // An operation is requested when the clause OPENS with an imperative head and names
  // something to act on. The head must be clause-initial: a verb appearing mid-sentence
  // ("...records support input VAT") is not a requested operation. Measured as
  // request_with_action_target: precision 0.898 over 453 support.
  const reasonImperativeHead = /^(?:please\\s+)?(?:change|rename|delete|draw|paint|compile|install|download|sort|cook|play|sing|design|render|print|debug|prepare|improve|buy|organi[sz]e|fix|build|write|update|configure|adjust|schedule|edit|make|create|summari[sz]e|list|translate|explain|tune|format|archive|move|copy|store|upload|export|attach|duplicate|rearrange|relabel|reorder|count|repeat|spell|reverse|proofread|capitali[sz]e|alphabeti[sz]e|ayusin|linisin|palitan|ilagay|bilhin|gawin|isulat|tanggalin|ihanda|i-[a-z]+)\\b/i.test(primaryTextLo);
  const reasonActionHead = reasonImperativeHead ? (primaryTextLo.match(/^(?:please\\s+)?([a-z-]+)/i) || [, ''])[1] : '';
  // Something to act on: an extracted task object, or a following noun phrase.
  const reasonHasActionTarget = !!(primary && primary.taskObject)
    || (reasonImperativeHead && /^(?:please\\s+)?[a-z-]+\\s+\\S+/i.test(primaryTextLo));
  // An advice or creative question also requests an operation without an imperative
  // head ("which X brand is best?"). C15 measured this and it is preserved here rather
  // than discarded: the union is what "an operation was requested" actually means.
  const reasonRequestsOperation = (reasonImperativeHead && reasonHasActionTarget)
    || interrogativeRequestsAction;
  // reasonTargetRole: does the tax predicate govern the TAX CONCEPT itself, or an
  // EXTERNAL object/transaction whose treatment is being asked? This is the §9C
  // distinction, and it is a semantic role, never a noun list.
  const reasonExternalObjectRe = /\\b(?:purchase|sale|sales|transaction|payment|receipts?|income|expense|service|services|import|imports|asset|lease|rental|fee|fees|goods|suppl(?:y|ies)|contract|billing|remuneration|compensation|commission|royalt\\w*|dividend|interest income)\\b/i;
  const reasonTargetIsExternalObject = reasonExternalObjectRe.test(primaryTextLo);
  // reasonUnresolvedKind: what exactly is unresolved — the token, or the topic? (§9E)
  const reasonUnresolvedIsAcronym = acronymMentions.some((am) => am.ambiguous);
  // A DOCUMENT operand is not a term: translating a handbook is an operation on a
  // document, not a quotation of a term. This narrows the C15 text-operation rule.
  const reasonOperandIsDocument = /\\b(?:handbook|manual|guide|document|report|brochure|leaflet|booklet|file|letter|memo|notice|paper|deck|slide|page|chapter)\\b/i.test(primaryTextLo);
` + evAnchor;
s = s.replace(evAnchor, evNew);

// R3 — the operand must be a TERM. The C15 rule fired on any "into plain english"
// request, including one whose operand is a document, so it is narrowed at its own site.
const topAnchor = `    && /\\binto plain english\\b|\\bthe (?:phrase|word|term)\\b/i.test(primaryTextLo);`;
if (!s.includes(topAnchor)) throw new Error('ANCHOR_MISS textOperationOverTerm site');
s = s.replace(topAnchor, `    && /\\binto plain english\\b|\\bthe (?:phrase|word|term)\\b/i.test(primaryTextLo)
    && !reasonOperandIsDocument;`);

// R1 — an asserted naming act has NO action head. "Rename the X folder" has one, so it
// is an ordinary operation on a named object and must not read as a naming act.
const nameAnchor = `  const assertsNamingAct = /\\b(?:is (?:only |just )?(?:an?|our) (?:internal )?(?:label|name|code|codename|project code)|is only a (?:label|name|code)|code-?named|is called)\\b/i.test(primaryTextLo);`;
if (!s.includes(nameAnchor)) throw new Error('ANCHOR_MISS assertsNamingAct');
const nameNew = `  const assertsNamingAct = /\\b(?:is (?:only |just )?(?:an?|our) (?:internal )?(?:label|name|code|codename|project code)|is only a (?:label|name|code)|code-?named|is called)\\b/i.test(fullLo)
    && !reasonRequestsOperation;`;
s = s.replace(nameAnchor, nameNew);

const bagAnchor = `assertsNamingAct, textOperationOverTerm,`;
if (!s.includes(bagAnchor)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bagAnchor, `assertsNamingAct, textOperationOverTerm, reasonRequestsOperation, reasonTargetIsExternalObject, reasonUnresolvedIsAcronym, reasonOperandIsDocument,`);

// ---- R8: the REFUSE split by requested operation --------------------------------
// C15 split on speech act alone. The measured control is whether an OPERATION is
// actually requested: an explicit action head together with an action target.
const splitAnchor = `    if (evidence.primaryIsInterrogative) return decide('REFUSE', 'no_tax_relation', 0.88);
    return decide('REFUSE', 'explicit_non_tax_task', 0.90);`;
if (!s.includes(splitAnchor)) throw new Error('ANCHOR_MISS refuse split');
const splitNew = `    // C16 R8 (§9A) — an actual non-tax OPERATION requires an action head and an action
    // target. A question, assertion, description or topic request carrying no
    // controlling tax relation is explained by the absence of that relation.
    if (!evidence.reasonRequestsOperation) return decide('REFUSE', 'no_tax_relation', 0.88);
    return decide('REFUSE', 'explicit_non_tax_task', 0.90);`;
s = s.replace(splitAnchor, splitNew);

// The styling-artefact branch uses the same split, for one consistent explanation.
const styleAnchor = `    if (evidence.primaryIsInterrogative) return decide('REFUSE', 'no_tax_relation', 0.86);
    return decide('REFUSE', 'explicit_non_tax_task', 0.86);`;
if (!s.includes(styleAnchor)) throw new Error('ANCHOR_MISS styling split');
const styleNew = `    if (!evidence.reasonRequestsOperation) return decide('REFUSE', 'no_tax_relation', 0.86);
    return decide('REFUSE', 'explicit_non_tax_task', 0.86);`;
s = s.replace(styleAnchor, styleNew);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-02 applied; bytes', before.length, '->', s.length);
