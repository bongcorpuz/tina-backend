// PHASE-10A14-R20 COMMIT 5R1-C15 iteration 02 — speech act separates the two REFUSE
// families.
//
// Precedence spec, reason RF-05 vs RF-11:
//   explicit_non_tax_task  "primary task IS a non-tax ACTION"
//   no_tax_relation        "no relation links any tax predicate to the task target"
//
// The analyzer collapses both into explicit_non_tax_task whenever a
// REQUESTS_NON_TAX_ACTION_ON relation exists. But that relation is emitted for any
// request about ordinary subject matter, including a QUESTION. A question does not
// request an action on its subject — it asks about it — so when no tax predicate
// reaches the target the controlling explanation is that no tax relation exists,
// not that a non-tax action was requested.
//
// Measured over the frozen oracle, the speech act separates the families sharply:
//   explicit_non_tax_task    12.0% interrogative
//   no_tax_relation REFUSE   60.3% interrogative
//   no_tax_relation CLARIFY 100.0% interrogative
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

const anchor = `  if (requestsNonTax && !hasTreatment && !hasCompliance && !evidence.taxRelationOverPrimaryTarget
      && !evidence.filipinoTaxRelationOverTarget
      && !(asksDefinition && evidence.acronymResolvedByTaxContext)) {
    return decide('REFUSE', 'explicit_non_tax_task', 0.90);
  }`;
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS explicit_non_tax_task branch');

const replacement = `  if (requestsNonTax && !hasTreatment && !hasCompliance && !evidence.taxRelationOverPrimaryTarget
      && !evidence.filipinoTaxRelationOverTarget
      && !(asksDefinition && evidence.acronymResolvedByTaxContext)) {
    // C15 reason lane — SPEECH ACT SEPARATES THE TWO REFUSE FAMILIES.
    // A non-tax ACTION was requested only when the primary clause is an imperative or
    // an explicit request. A QUESTION about ordinary subject matter requests nothing;
    // its controlling explanation is that no tax predicate reaches the target.
    if (evidence.primaryIsInterrogative) return decide('REFUSE', 'no_tax_relation', 0.88);
    return decide('REFUSE', 'explicit_non_tax_task', 0.90);
  }`;
s = s.replace(anchor, replacement);

// Publish the speech-act evidence. Derived from the PRIMARY clause, so a leading
// concessive context cannot supply it (the clause layer is locked by C14).
const evAnchor = `  const taxRelationOverPrimaryTarget = TAX_OVER_TARGET_RE.test(fullLo) && !concessiveOnlyTaxContext;`;
if (!s.includes(evAnchor)) throw new Error('ANCHOR_MISS taxRelationOverPrimaryTarget');
const evNew = `  const taxRelationOverPrimaryTarget = TAX_OVER_TARGET_RE.test(fullLo) && !concessiveOnlyTaxContext;
  // C15 — speech act of the PRIMARY clause. An interrogative opener or a trailing
  // question mark makes the primary clause a question rather than a request for action.
  const primaryTextLo = primary ? lower(primary.text).trim() : '';
  // An interrogative FORM can still request an action: an advice/recommendation or
  // creative question ("which X brand is best?", "can you draw Y?") asks the assistant
  // to DO something about the subject. Those remain requests for a non-tax action; only
  // a genuine inquiry ABOUT a subject falls through to "no tax relation".
  const interrogativeRequestsAction = /\\b(?:is best|are best|magandang bilhin|should i (?:buy|use|pick|choose)|which .{0,40}(?:brand|slogan|design|colou?r|font|name)|recommend|suggest|help me|can you (?:draw|write|make|design|build|create|translate|summari[sz]e|list|sort|format|debug|install|render|print|compile|edit|update|configure))\\b/i.test(primaryTextLo)
    || NON_TAX_VERBS.includes(primary && primary.taskVerb);
  // A local-redefinition assertion ("X lang ang Y?") and a Filipino imperative carry a
  // question mark but request or assert rather than inquire; punctuation alone is not a
  // speech act. Require a genuine interrogative OPENER.
  const assertionWithQuestionMark = /\\blang ang\\b|\\blang ba\\b|^(?:ayusin|linisin|palitan|ilagay|bilhin|gawin|isulat|tanggalin|ihanda|i-[a-z]+)\\b/i.test(primaryTextLo);
  const primaryIsInterrogative = /^(?:what|which|who|whom|whose|when|where|why|how|is|are|was|were|do|does|did|can|could|should|would|may|might|will|shall|has|have|had|ano|alin|sino|paano|kailan|saan|bakit|may|magkano|kailangan)\\b/i.test(primaryTextLo)
    && !interrogativeRequestsAction && !assertionWithQuestionMark;`;
s = s.replace(evAnchor, evNew);

const bagAnchor = `taxRelationOverPrimaryTarget, subordinateCodeClause,`;
if (!s.includes(bagAnchor)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bagAnchor, `taxRelationOverPrimaryTarget, primaryIsInterrogative, subordinateCodeClause,`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-02 applied; bytes', before.length, '->', s.length);
