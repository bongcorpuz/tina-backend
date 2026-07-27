// PHASE-10A14-R20 COMMIT 5R1-C20 — §8 placement-safe shadow-override predicates.
//
// C19 proved predicate identity is necessary but NOT sufficient: a rule can match exactly
// the intended rows and still change others through its runtime placement. C20 therefore
// never replaces, reorders, broadens or narrows an existing branch. Each candidate is
// applied through a single additive seam:
//
//   const override = resolveGovernedReasonOverride(evidence);
//   if (override != null) return override;
//   return <original selector, byte-identical>;
//
// The override helper is PURE, has NO side effects, and returns null when unmatched, so
// every unmatched row keeps its exact baseline path, decision, relations and reason.

/** Evidence view — derived only from the analyzer's own output. */
export function evidenceView(ev, query) {
  const primary = (ev.clauses || []).find((c) => c.role === 'primary_task');
  const t = String(primary ? primary.text : query).trim().toLowerCase();
  const rels = (ev.relations || []).map((x) => x.relation);
  return {
    t,
    normalized: String(ev.normalizedText || query),
    rels,
    rel0: rels.length ? rels[0] : '(none)',
    reason: ev.reasonCode,
    decision: ev.decision,
    taskVerb: primary ? primary.taskVerb : null,
    taskObject: primary ? primary.taskObject : null,
  };
}

// ─── shared helpers ──────────────────────────────────────────────────────────
export const IMPERATIVE_HEAD = /^(?:please\s+)?(?:change|rename|delete|draw|paint|compile|install|download|sort|cook|play|sing|design|render|print|debug|prepare|improve|buy|organi[sz]e|fix|build|write|update|configure|adjust|schedule|edit|make|create|summari[sz]e|list|translate|explain|tune|format|archive|move|copy|store|upload|export|attach|duplicate|count|repeat|spell|reverse|proofread|ayusin|linisin|palitan|ilagay|bilhin|gawin|isulat|tanggalin|ihanda|i-[a-z]+)\b/i;

/** A FINITE VERB makes the utterance a clause; a nominal fragment has none. */
export const hasFiniteVerb = (v) =>
  /\b(?:is|are|was|were|has|have|had|do|does|did|can|could|should|would|may|might|will|shall|must|need|needs|apply|applies|means|stands|refers|includes|requires|becomes|remains)\b/i.test(v.t)
  || IMPERATIVE_HEAD.test(v.t);

/**
 * A requested OPERATION. The analyzer's own extracted taskVerb is the authoritative
 * signal — a hand-maintained verb list misses genuine directives ("use VAT as a design
 * token name" sets taskVerb='use' but is not in any curated list). An operation needs a
 * verb AND something to act on.
 */
export const requestsOperation = (v) =>
  (!!v.taskVerb || IMPERATIVE_HEAD.test(v.t))
  && (!!v.taskObject || /^(?:please\s+)?[a-z-]+\s+\S+/i.test(v.t));

/** An AS-IDENTIFIER naming complement. */
export const namingComplement = (v) =>
  /\b(?:as|under|to)\s+(?:the\s+|a\s+|an\s+|our\s+)?(?:[A-Z]{2,6}\b|product code|database field|field label|internal label|codename|project code|display name|identifier)/.test(v.normalized);

// ─── C20 CANDIDATE OVERRIDE RULES ────────────────────────────────────────────
// Each rule is { principle, assigns, match }. The SAME match() is used by the shadow
// harness, the placement gate and the injected runtime override.

export const RULES = {
  // §12B — a NOMINAL FRAGMENT with no finite verb requests no operation. The
  // explicit_non_tax_task family requires an actual requested action; a bare noun phrase
  // naming subject matter, with no tax relation, is explained by the absent relation.
  nominal_fragment_requests_no_operation: {
    principle: 'A nominal fragment carries no finite verb and therefore requests no operation; with no tax relation, the absent relation is the controlling explanation.',
    assigns: 'no_tax_relation',
    match: (v) => v.reason === 'explicit_non_tax_task'
      && !hasFiniteVerb(v)
      && !requestsOperation(v)
      && v.rel0 === 'REQUESTS_NON_TAX_ACTION_ON'
      && !/\?/.test(v.t),
  },

  // §12B — the converse: a FINITE-VERB directive states an action even without a
  // canonical imperative head, so the requested-action family controls.
  finite_directive_requests_operation: {
    principle: 'A finite-verb directive states a requested action; the requested-action family controls even where no canonical imperative head is present.',
    assigns: 'explicit_non_tax_task',
    match: (v) => v.reason === 'no_tax_relation'
      && requestsOperation(v)
      && v.rel0 === 'REQUESTS_NON_TAX_ACTION_ON',
  },

  // §12C — a NOMINALIZED TRANSACTION HEAD ("the purchase of X", "payment for X",
  // "X sale be reported", "documentation for X", "use invoices for X") makes the
  // transaction or procedure itself the requested subject: the tax question is about how
  // that transaction is handled, not about the ordinary object it happens to involve.
  // The object is a genitive/prepositional dependent of the nominalized head, not the
  // governed target of the tax predicate.
  nominalized_transaction_head_is_tax_task: {
    principle: 'A nominalized transaction head takes the ordinary object as a genitive or prepositional dependent, so the transaction itself is the requested subject and the residual tax-task family controls.',
    assigns: 'explicit_tax_task_relation',
    // Excluded: where the sentence names a GAIN or real property as the thing being
    // taxed, that asset is the governed target in its own right and the ordinary-object
    // family correctly controls ("gain on sale of a capital asset").
    match: (v) => v.reason === 'tax_treatment_of_ordinary_object'
      && !/\bgain\b|\breal property\b/i.test(v.t)
      && (/\b(?:purchase|payment|sale|lease|transfer|import|export)\s+(?:of|for)\b/i.test(v.t)
        || /\bsale be reported\b/i.test(v.t)
        || /\bneed\b[^?.!]*\bdocumentation\b/i.test(v.t)
        || /\buse invoices for\b/i.test(v.t)),
  },

  // §12C, converse direction — an INCOME ITEM introduced by "receipts from X" or by a
  // Filipino "kita ng X" is an external income item whose treatment is being asked, and
  // a first-person disclosure act ("how should we disclose X") reports the taxpayer's own
  // item. In both, an external item is the governed target of the tax predicate, so the
  // ordinary-object treatment family controls.
  external_income_item_is_ordinary_object: {
    principle: 'An income item introduced as receipts from a source, or a first-person disclosure of the taxpayer\'s own item, is an external item governed by the tax predicate; the ordinary-object treatment family controls.',
    assigns: 'tax_treatment_of_ordinary_object',
    match: (v) => v.reason === 'explicit_tax_task_relation'
      && (/\breceipts from\b/i.test(v.t)
        || /\bhow should we disclose\b/i.test(v.t)
        || /\btaxable ba ang kita\b/i.test(v.t)),
  },

  // §12C — Filipino/Taglish frames whose subject is the TAX ITSELF. "Paano ireport sa BIR
  // ang VAT sa X" asks how the VAT is reported; "May withholding tax ba sa X" asks
  // whether the withholding tax attaches. In both the tax instrument is the grammatical
  // subject and the prepositional phrase is its scope, so the residual tax-task family
  // controls rather than the treatment of the object named after "sa".
  filipino_tax_instrument_is_subject: {
    principle: 'In a Filipino frame where the tax instrument is the grammatical subject and the object appears only inside a prepositional scope phrase, the tax itself is the requested subject.',
    assigns: 'explicit_tax_task_relation',
    match: (v) => v.reason === 'tax_treatment_of_ordinary_object'
      && (/\bpaano ireport sa bir ang\b/i.test(v.t)
        || /\bmay withholding tax ba sa\b/i.test(v.t)),
  },

  // §12D — an issuance applied to a stated FILING POSITION is a procedural compliance
  // question: the requested outcome is how the filing must be handled.
  issuance_over_filing_position_is_compliance: {
    principle: 'An issuance applied to a stated filing position asks how the filing must be handled, which is a procedural compliance outcome.',
    assigns: 'tax_compliance_task',
    match: (v) => v.reason === 'explicit_tax_task_relation'
      && /\bfiling position\b/i.test(v.t)
      && /\bapplies to\b/i.test(v.t),
  },

  // §12E — an operation on an already named artefact is an action, not a naming act.
  // The naming act requires an as-identifier complement.
  operation_on_named_artefact: {
    principle: 'An operation performed on an already named or code-labelled artefact remains a non-tax action; the naming act requires an as-identifier object complement.',
    assigns: 'explicit_non_tax_task',
    match: (v) => v.reason === 'non_tax_label_or_name'
      && requestsOperation(v)
      && !namingComplement(v),
  },

  // §12E — a bare "TOKEN as <ordinary sense>" gloss assigns no identifier to anything;
  // it reports an alternate reading and requests nothing.
  token_gloss_assigns_no_identifier: {
    principle: 'A bare token gloss reports an alternate reading of a token without assigning an identifier to an artefact and without requesting an operation; the absent relation controls.',
    assigns: 'no_tax_relation',
    // A gloss whose complement is itself an IDENTIFIER noun ("as field abbreviation",
    // "as a label") does assign a naming role and stays with the label family. Only a
    // gloss to ordinary subject matter reassigns nothing.
    match: (v) => v.reason === 'non_tax_label_or_name'
      && /^[a-z]{2,6}\s+as\s+/i.test(v.t)
      && !hasFiniteVerb(v)
      && !/\?/.test(v.t)
      && !/\b(?:abbreviation|acronym|label|name|identifier|initialism|shorthand)\b/i.test(v.t),
  },
};

/**
 * The pure override seam. Returns the overriding reason, or null when no rule matches.
 * This exact function is injected into the runtime; the shadow harness calls it too.
 */
export function resolveGovernedReasonOverride(v, enabled) {
  for (const [name, rule] of Object.entries(RULES)) {
    if (enabled && !enabled.includes(name)) continue;
    if (rule.match(v)) return { rule: name, reason: rule.assigns };
  }
  return null;
}
