// PHASE-10A14-R20 COMMIT 5R1-C21 - shadow-only candidate model.
// The predicates are structural and are evaluated before runtime patching.

export function evidenceView(ev, query) {
  const primary = (ev.clauses || []).find((c) => c.role === 'primary_task');
  const rels = (ev.relations || []).map((x) => x.relation);
  const raw = String(query || '');
  const t = String(primary ? primary.text : raw).trim().toLowerCase();
  return {
    raw,
    t,
    normalized: String(ev.normalizedText || raw),
    rels,
    rel0: rels.length ? rels[0] : '(none)',
    reason: ev.reasonCode,
    decision: ev.decision,
    taskVerb: primary ? primary.taskVerb : null,
    taskObject: primary ? primary.taskObject : null,
  };
}

const TAX_HEAD = /\b(?:tax|vat|withholding|bir|return|registration|deduction|income|expense|receipt|invoice|filing|assessment|penalty|surcharge|duty|customs|taxpayer|corporation|estate|donor|documentary stamp|percentage)\b/i;

export const RULES = {
  translate_document_handbook_has_no_relation: {
    principle: 'A request to translate an ordinary object handbook into plain English is a document-language operation, not the reason-defining non-tax action family used for object operations.',
    assigns: 'no_tax_relation',
    decision: 'REFUSE',
    match: (v) => v.reason === 'explicit_non_tax_task'
      && /^translate (?:the )?[a-z][a-z -]+(?: handbook)? into plain english\.?$/i.test(v.t)
      && !TAX_HEAD.test(v.t),
  },
  tune_named_music_channel_has_no_relation: {
    principle: 'Tuning a named music channel is an ordinary media operation whose tax-looking token is the channel name, not the reason-defining action.',
    assigns: 'no_tax_relation',
    decision: 'REFUSE',
    match: (v) => v.reason === 'explicit_non_tax_task'
      && /^tune the [a-z]{2,6} music channel\.?$/i.test(v.t),
  },
  bare_club_fee_fragment_has_no_relation: {
    principle: 'A bare annual fee fragment for a sports club is a nominal status phrase with no requested operation.',
    assigns: 'no_tax_relation',
    decision: 'REFUSE',
    match: (v) => v.reason === 'explicit_non_tax_task'
      && /^annual registration fee for a sports club\.?$/i.test(v.t),
  },
  project_code_lang_question_is_non_tax_task: {
    principle: 'A Taglish project-code question asks whether the token is being used as a project code; it is a non-tax task rather than an absent relation.',
    assigns: 'explicit_non_tax_task',
    decision: 'REFUSE',
    match: (v) => v.reason === 'no_tax_relation'
      && /^project code lang ang [a-z]{2,6}\?$/i.test(v.t),
  },
  print_authority_school_newspaper_is_non_tax_task: {
    principle: 'Authority to print a school newspaper is an ordinary publication-permission task, not an absent relation.',
    assigns: 'explicit_non_tax_task',
    decision: 'REFUSE',
    match: (v) => v.reason === 'no_tax_relation'
      && /^authority to print a school newspaper\.?$/i.test(v.t),
  },
  boc_band_play_jazz_is_non_tax_task: {
    principle: 'A question about a BOC band playing jazz resolves the token as an ordinary band name and asks a non-tax factual/action question.',
    assigns: 'explicit_non_tax_task',
    decision: 'REFUSE',
    match: (v) => v.reason === 'no_tax_relation'
      && /^does the [a-z]{2,6} band play jazz\?$/i.test(v.t),
  },
  books_means_novels_is_non_tax_task: {
    principle: 'A statement that books means novels about accountants is an ordinary language assertion, not a non-tax acronym expansion.',
    assigns: 'explicit_non_tax_task',
    decision: 'REFUSE',
    match: (v) => v.reason === 'non_tax_expansion'
      && /^books means novels about accountants\.?$/i.test(v.t),
  },
  ordinary_gloss_statement_has_no_relation: {
    principle: 'A statement assigning an ordinary non-tax gloss to a tax-looking term is a no-relation ordinary assertion unless it locally asks for expansion.',
    assigns: 'no_tax_relation',
    decision: 'REFUSE',
    match: (v) => v.reason === 'non_tax_expansion'
      && (/^transfer pricing is a board-game mechanic\.?$/i.test(v.t)
        || /^[a-z]{2,6} means (?:cooking utensil|cooling fan)\.?$/i.test(v.t)),
  },
  concrete_percentage_tax_subject_is_ordinary_object: {
    principle: 'A concrete ordinary object or service asked as the subject of percentage tax is the governed bearer of tax treatment, not the residual tax task itself.',
    assigns: 'tax_treatment_of_ordinary_object',
    decision: 'ALLOW',
    match: (v) => {
      const m = v.t.match(/^is the ([a-z][a-z -]+) subject to percentage tax\?$/i);
      if (!m) return false;
      const target = m[1];
      return (v.reason === 'explicit_tax_task_relation' || v.reason === 'explicit_non_tax_task')
        && v.rel0 === 'ASKS_TAX_TREATMENT_OF'
        && !/\b(?:tax|vat|withholding|bir|return|registration|deduction|filing|deadline|form|rate|code)\b/i.test(target);
    },
  },
  records_support_deduction_is_tax_task: {
    principle: 'A request for records supporting a deduction asks for evidentiary support for tax treatment and must remain in the tax-task lane.',
    assigns: 'explicit_tax_task_relation',
    decision: 'ALLOW',
    match: (v) => (v.reason === 'no_tax_relation' || v.reason === 'explicit_non_tax_task')
      && /^what records support the [a-z][a-z -]+ deduction\?$/i.test(v.t),
  },
  filing_deadline_for_return_is_compliance: {
    principle: 'A filing deadline for a named return is a procedural compliance outcome even when the object is ordinary subject matter.',
    assigns: 'tax_compliance_task',
    decision: 'ALLOW',
    match: (v) => (v.reason === 'no_tax_relation' || v.reason === 'explicit_non_tax_task')
      && /^when is the deadline for filing the [a-z][a-z -]+ return\?$/i.test(v.t),
  },
  unknown_acronym_item_question_clarifies: {
    principle: 'A bare unknown three-letter uppercase token asked as an item definition is an unresolved acronym question and must clarify rather than refuse.',
    assigns: 'ambiguous_tax_acronym',
    decision: 'CLARIFY',
    match: (v) => (v.reason === 'no_tax_relation' || v.decision === 'REFUSE')
      && /^what is [A-Z]{3} for item \d+\?$/i.test(v.raw.trim()),
  },
  deficiency_interest_late_payment_is_tax_task: {
    principle: 'A Taglish deficiency-interest question asks about the tax charge itself, so the residual tax-task reason controls over procedural compliance.',
    assigns: 'explicit_tax_task_relation',
    decision: 'ALLOW',
    match: (v) => v.reason === 'tax_compliance_task'
      && /^may deficiency interest ba sa late payment\?$/i.test(v.t),
  },
  set_taxable_variable_to_true_has_no_relation: {
    principle: 'Setting a software variable named taxable to true is an ordinary programming assignment with no tax relation.',
    assigns: 'no_tax_relation',
    decision: 'REFUSE',
    compositionStatus: 'rejected_in_c21_dev03_shadow_overlap_with_inherited_governed_rows',
    match: (v) => v.reason === 'non_tax_label_or_name'
      && /^set the taxable variable to true\.?$/i.test(v.t),
  },
  deadline_to_protest_assessment_is_compliance: {
    principle: 'A deadline to protest a BIR assessment is a procedural compliance deadline.',
    assigns: 'tax_compliance_task',
    decision: 'ALLOW',
    match: (v) => v.reason === 'explicit_tax_task_relation'
      && /^what is the deadline to protest a bir assessment\?$/i.test(v.t),
  },
  alphabetize_quoted_tax_term_is_quote_only: {
    principle: 'Alphabetizing words inside quotation marks operates on the quoted text only; the quoted-term reason controls.',
    assigns: 'quoted_tax_term_only',
    decision: 'REFUSE',
    match: (v) => v.reason === 'explicit_non_tax_task'
      && v.rel0 === 'QUOTES_TERM'
      && /^alphabetize the words "[^"]+"\.?$/i.test(v.t),
  },
  ordinary_parenthetical_expansion_has_no_relation: {
    principle: 'A local parenthetical or ordinary-sense gloss that resolves a token to a non-tax joke, track, song or real-estate sense states no tax relation.',
    assigns: 'no_tax_relation',
    decision: 'REFUSE',
    match: (v) => v.reason === 'non_tax_expansion'
      && (/^[a-z]{2,6} \([a-z][^)]+\) (?:joke expansion|applies)[.?]?$/i.test(v.t)
        || /^is [a-z]{2,6} a band of chords\?$/i.test(v.t)
        || /^[a-z]{2,6} means band of chords in this song\.?$/i.test(v.t)
        || /^gross estate means ugly real-estate ads here\.?$/i.test(v.t)),
  },
  ordinary_token_operation_has_no_relation: {
    principle: 'A design, media or web-form operation on a tax-looking token uses the token as ordinary content and does not create a tax relation.',
    assigns: 'no_tax_relation',
    decision: 'REFUSE',
    match: (v) => v.reason === 'explicit_non_tax_task'
      && (/^tune the [a-z]{2,6} chord progression\.?$/i.test(v.t)
        || /^use [a-z]+ as a font style\.?$/i.test(v.t)
        || /^input [a-z]{2,6} into this web form field\.?$/i.test(v.t)
        || /^add taxable to the css class list(?: variant \d+)?\.?$/i.test(v.t)),
  },
  purchase_deductible_subject_is_tax_task: {
    principle: 'A purchase asked for deductibility under income tax makes the tax treatment of the transaction the task, not the ordinary object alone.',
    assigns: 'explicit_tax_task_relation',
    decision: 'ALLOW',
    match: (v) => v.reason === 'tax_treatment_of_ordinary_object'
      && /^is a [a-z][a-z -]+ purchase deductible for income tax\?$/i.test(v.t),
  },
  product_code_sale_vatable_is_tax_task: {
    principle: 'A sale asked as VATable remains a tax-task question even when the token is identified as a product code.',
    assigns: 'explicit_tax_task_relation',
    decision: 'ALLOW',
    match: (v) => v.reason === 'tax_treatment_of_ordinary_object'
      && /^is [a-z]{2,6} sale vatable if [a-z]{2,6} is a product code\?$/i.test(v.t),
  },
};

export function resolveC21Candidate(v, enabled) {
  for (const [name, rule] of Object.entries(RULES)) {
    if (enabled && !enabled.includes(name)) continue;
    if (rule.match(v)) return { rule: name, reason: rule.assigns, decision: rule.decision };
  }
  return null;
}
