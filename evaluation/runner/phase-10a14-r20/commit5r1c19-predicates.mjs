// PHASE-10A14-R20 COMMIT 5R1-C19 — §8 SHARED BRANCH PREDICATES.
//
// C18's controlling correction: the simulator condition and the runtime branch predicate
// must be the SAME predicate. C18 restated a condition in the simulator that the runtime
// branch did not use, forecast it clean, and regressed R3 448 -> 454.
//
// This module is the single source of truth. Each predicate is defined exactly once and
// is called by:
//   1. the rule-effect simulator
//   2. the runtime reason selection (injected verbatim by the patch script)
//   3. the branch-trace harness
//
// Every predicate takes ONE argument — a typed reason-evidence view — so the same call
// site works in all three contexts. No predicate reads an oracle expectation, category,
// source set, query id, template identity or complete query text.

/**
 * Build the evidence view a predicate sees. Derived only from the analyzer's own
 * output: the primary clause, the locked relation set, and the current reason.
 */
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
    clauseCount: (ev.clauses || []).length,
    ambiguity: ev.ambiguityFlags || [],
  };
}

// ─── shared feature helpers ──────────────────────────────────────────────────
export const IMPERATIVE_HEAD = /^(?:please\s+)?(?:change|rename|delete|draw|paint|compile|install|download|sort|cook|play|sing|design|render|print|debug|prepare|improve|buy|organi[sz]e|fix|build|write|update|configure|adjust|schedule|edit|make|create|summari[sz]e|list|translate|explain|tune|format|archive|move|copy|store|upload|export|attach|duplicate|count|repeat|spell|reverse|proofread|ayusin|linisin|palitan|ilagay|bilhin|gawin|isulat|tanggalin|ihanda|i-[a-z]+)\b/i;
export const INTERROGATIVE_OPENER = /^(?:what|which|who|whom|whose|when|where|why|how|is|are|was|were|do|does|did|can|could|should|would|may|might|will|shall|has|have|had|ano|alin|sino|paano|kailan|saan|bakit|may|magkano|kailangan)\b/i;

/** Speech act of the primary clause. */
export const speechAct = (v) => IMPERATIVE_HEAD.test(v.t) ? 'request'
  : INTERROGATIVE_OPENER.test(v.t) ? 'question'
  : /\?/.test(v.t) ? 'question_marked_assertion' : 'assertion';

/**
 * A DEFINITIONAL request: the requested outcome is the meaning of a TERM. Two surface
 * forms carry it — an explicit meaning question, and an explanatory verb taking a short
 * token as its direct object and scoped by an in/for/under context phrase.
 */
export const asksMeaningOfTerm = (v) =>
  (/\b(?:what does|what is the meaning of|meaning of|definition of)\b/i.test(v.t)
    && /\b(?:mean|means|meaning|refer to|refers to|stand for|stands for|define|defined|definition)\b/i.test(v.t))
  || /^(?:explain|clarify|describe|interpret|detail|define)\s+[a-z]{2,6}\s+(?:for|in|under|within)\b/i.test(v.t)
  || /\bwhat does\s+[a-z]{2,6}\s+(?:refer to|mean|stand for)\b/i.test(v.t)
  // "What is X within Y?" scopes the token to a containing regime and asks its meaning.
  // "What is X IN Y?" does not: measured against R3, that form is the residual tax task
  // ("What is MCIT in Philippine corporate income tax?"), so only `within` qualifies.
  || /\bwhat is\s+[a-z]{2,6}\s+within\b/i.test(v.t)
  || /^[a-z]{2,6}\s+in\b[^?.!]{2,60}\bmeans what\b/i.test(v.t);

/**
 * Genuine tax context for a definition: a named authority or instrument, or a named
 * Philippine tax. A bare "tax" token is not enough — the context must identify the
 * regime or instrument the term is being defined inside.
 */
export const hasControllingTaxContext = (v) =>
  /\b(?:bir|bureau of internal revenue|national internal revenue code|nirc|tax code|philippine tax|revenue regulation\w*|revenue memorandum\w*|assessment|deficiency notice|issuances?|tax rules?|taxation)\b/i.test(v.t)
  || /\b(?:income|percentage|excise|estate|donor'?s?|withholding|value[- ]added|documentary stamp|capital gains|final|franchise|amusement)\s+tax\b/i.test(v.t);

/** A LOCAL equational reassignment, asserted in document-local scope. */
export const localEquationalReassignment = (v) =>
  /\b(?:means|stands for|refers to|is short for|to mean)\b|\s=\s|\bi\.e\.\b/i.test(v.t)
  && /\b(?:here|in this|in our|our|namin|sa amin|locally|internally)\b/i.test(v.t)
  && speechAct(v) === 'assertion';

/** An AS-IDENTIFIER object complement: what makes an imperative a naming act. */
export const namingComplement = (v) =>
  /\b(?:as|under|to)\s+(?:the\s+|a\s+|an\s+|our\s+)?(?:[A-Z]{2,6}\b|product code|database field|field label|internal label|codename|project code|display name|identifier)/.test(v.normalized);

/** An operation is requested: an imperative head naming something to act on. */
export const requestsOperation = (v) =>
  IMPERATIVE_HEAD.test(v.t) && (!!v.taskObject || /^(?:please\s+)?[a-z-]+\s+\S+/i.test(v.t));

// ─── C19 CANDIDATE RULE PREDICATES ───────────────────────────────────────────
// Each entry is one atomic rule: a predicate, the reason it assigns, and its principle.
// The SAME `match` function is used by the simulator, the runtime and the trace harness.

export const RULES = {
  // §10D — a definitional request under genuine tax context is a tax definition, not a
  // residual tax task and not a compliance task. The requested OUTCOME is the meaning
  // of a term; surrounding procedural vocabulary does not change that.
  definition_outcome_under_tax_context: {
    principle: 'The requested outcome is the MEANING of a term, asked inside genuine tax context. Surrounding procedural or compliance vocabulary does not change the requested outcome.',
    assigns: 'tax_definition_with_context',
    match: (v) => asksMeaningOfTerm(v) && hasControllingTaxContext(v)
      && ['explicit_tax_task_relation', 'tax_compliance_task'].includes(v.reason),
  },

  // §10D — an explicit REGISTRATION outcome is a procedural compliance act, whatever
  // the grammatical subject. C18's bare-placeholder rule routes "Is the transaction
  // subject to X" to the residual tax task, which is right for a treatment predicate but
  // wrong when the predicate names a registration requirement: the requested outcome,
  // not the subject, decides the family.
  registration_outcome_is_compliance: {
    principle: 'An explicit registration requirement is a procedural compliance outcome. The requested outcome controls the family, not the grammatical subject of the question.',
    assigns: 'tax_compliance_task',
    match: (v) => /\bsubject to (?:bir )?registration\b|\bregistration required\b|\bneed(?:s)? to register\b/i.test(v.t)
      && v.reason === 'explicit_tax_task_relation',
  },

  // §10E — a local equational reassignment is an expansion. Anything that is not an
  // asserted document-local reassignment is not.
  // The label family currently claims bare 'TOKEN as <ordinary sense>' fragments. These
  // assert an alternate reading of a token; with no requested operation and no tax
  // relation, the absent relation is the controlling explanation.
  token_gloss_fragment_no_operation: {
    principle: 'A bare "TOKEN as <ordinary sense>" fragment glosses a token without requesting an operation and without establishing a tax relation; the absent relation controls.',
    assigns: 'no_tax_relation',
    match: (v) => v.reason === 'non_tax_label_or_name'
      && /^[a-z]{2,6}\s+as\s+/i.test(v.t)
      && !/\?/.test(v.t)
      && v.t.split(/\s+/).filter(Boolean).length <= 6,
  },

  expansion_requires_local_reassignment: {
    principle: 'An expansion is a LOCAL equational reassignment asserted in document-local scope. A question, denial or general-world assertion is not a reassignment.',
    assigns: 'no_tax_relation',
    match: (v) => v.reason === 'non_tax_expansion' && !localEquationalReassignment(v)
      && speechAct(v) === 'question',
  },

  // The expansion family also claims general-world glosses of the form "<token> means
  // <ordinary sense>" and "<token> is a <ordinary sense>". A local reassignment scopes
  // itself to the document ("here", "in our system", "namin"); without that scope the
  // utterance asserts a fact about the world and reassigns nothing locally, so no
  // relation links a tax predicate to any target.
  // A PARENTHETICAL gloss ("MCIT (my cool internal tool) joke expansion") supplies the
  // reading inline as an aside rather than predicating it of the token. A copular
  // expansion ("RMC is a music channel") asserts the reading as the sentence's claim and
  // remains an expansion. Measured over the expansion family: the parenthetical form
  // appears in 6 residual rows and in 0 currently-correct rows.
  parenthetical_gloss_not_expansion: {
    principle: 'A parenthetical gloss supplies a reading as an inline aside rather than predicating it of the token; it reassigns nothing, so the absent relation is the controlling explanation.',
    assigns: 'no_tax_relation',
    match: (v) => v.reason === 'non_tax_expansion' && /\([^)]{4,}\)/.test(v.t),
  },

  // §10E — an operation on an already named artefact is an action, not a naming act.
  // C18 landed this at the display-action branch; here it is generalised to any row the
  // label family currently claims where no as-identifier complement is present.
  operation_on_named_artefact: {
    principle: 'An operation performed on an already named, tagged or code-labelled artefact remains a non-tax action. The naming act requires an as-identifier object complement.',
    assigns: 'explicit_non_tax_task',
    match: (v) => v.reason === 'non_tax_label_or_name' && requestsOperation(v) && !namingComplement(v),
  },

  // §10B — a bare topic fragment with no requested operation and no tax relation is
  // explained by the absent relation, not by a requested action.
  bare_topic_fragment_no_operation: {
    principle: 'A bare topic fragment names subject matter without requesting an operation; with no tax relation the absent relation is the controlling explanation.',
    assigns: 'no_tax_relation',
    match: (v) => v.reason === 'explicit_non_tax_task'
      && speechAct(v) === 'assertion'
      && !requestsOperation(v)
      && v.rel0 === 'REQUESTS_NON_TAX_ACTION_ON'
      && v.t.split(/\s+/).filter(Boolean).length <= 5,
  },
};
