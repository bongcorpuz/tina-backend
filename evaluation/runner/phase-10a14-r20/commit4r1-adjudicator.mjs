// PHASE-10A14-R20 COMMIT 4R1 — deterministic inherited-row reason adjudicator.
//
// Assigns a fine-grained closed-set reason family to each inherited row from its
// QUERY TEXT + FROZEN DECISION only, by applying RF-01..RF-11 in precedence.
// NEVER imports or executes any classifier/analyzer; NEVER reads analyzer output.
// The frozen decision is authoritative and is NOT changed. Pure & deterministic.

const REASONS = {
  EXPLICIT_TAX: 'explicit_tax_task_relation',
  TREAT_ORDINARY: 'tax_treatment_of_ordinary_object',
  COMPLIANCE: 'tax_compliance_task',
  DEF_CONTEXT: 'tax_definition_with_context',
  AMBIG_ACRONYM: 'ambiguous_tax_acronym',
  NONTAX_TASK: 'explicit_non_tax_task',
  LABEL_NAME: 'non_tax_label_or_name',
  NONTAX_EXPANSION: 'non_tax_expansion',
  QUOTED_ONLY: 'quoted_tax_term_only',
  NEG_REVIEW: 'tax_negation_but_tax_review_requested',
  NO_RELATION: 'no_tax_relation',
};

const DECISION_REASON_COMPAT = {
  ALLOW: new Set([REASONS.EXPLICIT_TAX, REASONS.TREAT_ORDINARY, REASONS.COMPLIANCE, REASONS.DEF_CONTEXT, REASONS.NEG_REVIEW]),
  REFUSE: new Set([REASONS.NONTAX_TASK, REASONS.LABEL_NAME, REASONS.NONTAX_EXPANSION, REASONS.QUOTED_ONLY, REASONS.NO_RELATION]),
  CLARIFY: new Set([REASONS.AMBIG_ACRONYM, REASONS.NO_RELATION]),
};

const lc = (s) => String(s || '').toLowerCase();

// ── Structural signal detectors (query text only) ────────────────────────────
const RE = {
  compliance: /\b(bir form|what form|which form|file(?:s|d|ing)?\b|filing|return\b|what return|register(?:ed|ing|ation)?|remit(?:s|ted|tance)?|withhold(?:ing)? (?:tax )?(?:on|deadline|remit)|deadline|due date|books of account|invoic(?:e|ing)|documentary (?:requirement|submission|stamp filing)|substantiat|reportorial|slsp|alphalist|quarterly|monthly filing|annual return|tax clearance|certificate of registration)\b/,
  treatmentVerb: /\b(deductib|subject to (?:vat|tax|withholding|percentage|excise|dst|customs)|vat treatment|tax treatment|input vat|output vat|withholding tax on|customs dut(?:y|ies)|tariff|excise|documentary stamp tax on|capital gains|taxable\b|zero-?rated|vat-?exempt|creditable|fringe benefit)\b/,
  definition: /\b(what does .* mean|what is the meaning|define\b|meaning of|stand[s]? for|what is [a-z]{2,5}\??$|explain (?:the )?(?:term|acronym))\b/,
  quotedOnly: /\b(quote|translate (?:the |radio |")?(?:word|phrase|term|music|.*into plain english)|count the (?:letter|word|occurrence)|format the (?:word|phrase)|spell|capitali[sz]e (?:the )?(?:word|each)|alphabet|reverse the phrase|proofread|copy the phrase)\b/,
  label: /\b(as (?:the |a |an |our )?(?:product code|database field|field label|field abbreviation|course code|variable|filename|file name|team name|channel name|internal label|project code|codename|label|sprint label|report ?name|server name))|internal (?:label|project phrase|project name|code name|codename)|only (?:an?|our) (?:internal )?(?:label|name|code|project phrase|phrase)|is (?:only )?(?:an? |our )?(?:project|product|internal)? ?(?:code|name|label|phrase)\b|only our .* (?:project )?code\b|good project name|as (?:a |the )?project name|typo for\b/,
  expansion: /\b(means (?:the )?(?:personal area network|radio music channel|cooling device|field level design|physical therapy|company annual retreat)|stands for the|expands to|i\.e\.|refers to the|denotes the|is (?:a|the|an|only a) (?:radio )?(?:music channel|cooling (?:device|fan)|personal area network))\b|is (?:a|an|only an?) [a-z ]*(?:abbreviation|acronym)\b|(?:abbreviation|acronym) (?:for|in|with)\b/,
  nonTaxAction: /\b(change|rename|delete|draw|paint|compile|install|download|sort|cook|play|sing|design|render|print|debug|prepare|improve|buy|organi[sz]e|fix|build|write|update|configure|make a|create a|summari[sz]e|list the|explain\b|adjust|schedule the|format the|edit the|which .* (?:is best|brand|should i|to (?:buy|use))|best\b.*\?|poster about|novels? about)\b/,
  negationReview: /\b(although|even if|may be non-?tax|not tax|non-?tax).{0,60}(review|vat treatment|tax treatment|deductib|withholding|is (?:it|this) taxable|subject to)/,
  bareAcronym: /^\s*(?:what (?:is|does)\s+)?["']?[a-z]{2,5}["']?\??\s*(?:mean\??)?\s*$/i,
  taxContext: /\b(bir|nirc|tax|vat|assessment|filing|withholding|customs|revenue|deficiency|estate tax|percentage tax|income tax|ra ?\d{3,5}|republic act|revenue regulation|rmc|department of finance)\b/,
  filipinoTax: /\b(buwis|kabuwisan|deductible ba|may vat ba|magkano ang buwis|i-withhold)\b/,
  filipinoAction: /\b(ayusin|i-rename|alin ang|gawin|i-print|i-download|anong .* (?:magandang )?bilhin|magandang bilhin)\b/,
  // Filipino "X lang ang Y" / "lang ... namin" = it is only/just X (a label or non-tax sense).
  filipinoLabelOrNonTax: /\blang ang\b|\blang\b.*\bnamin\b|\bibig kong sabihin\b|lang ang (?:rmc|slsp|osd|project code|radio|game|reading|display)/,
};

// Adjudicate one inherited row -> { reason, ruleId, rationale }.
export function adjudicateReason(row) {
  const q = lc(row.query);
  const dec = row.expectedDecision;

  const pick = (reason, ruleId, rationale) => ({ reason, ruleId, rationale });

  if (dec === 'CLARIFY') {
    // RF-04: bare/ambiguous acronym or ambiguous tax-adjacent frame.
    return pick(REASONS.AMBIG_ACRONYM, 'RF-04', 'CLARIFY row: materially ambiguous acronym/term lacking resolving context.');
  }

  if (dec === 'REFUSE') {
    // RF-09 pre-empt not applicable to REFUSE. Precedence: label > expansion > quoted > non-tax action > no relation.
    if (RE.label.test(q)) return pick(REASONS.LABEL_NAME, 'RF-06', 'Tax-shaped term used as an internal label/name.');
    if (RE.expansion.test(q)) return pick(REASONS.NONTAX_EXPANSION, 'RF-07', 'Explicit non-tax expansion of an acronym/term.');
    if (RE.quotedOnly.test(q)) return pick(REASONS.QUOTED_ONLY, 'RF-08', 'Quoted/metalinguistic manipulation of a tax-shaped phrase.');
    if (RE.nonTaxAction.test(q) || RE.filipinoAction.test(q) || RE.filipinoLabelOrNonTax.test(q)) return pick(REASONS.NONTAX_TASK, 'RF-05', 'Primary requested action/assertion is non-tax on an ordinary target (incl. Filipino "X lang ang Y" non-tax framing).');
    return pick(REASONS.NO_RELATION, 'RF-11', 'No tax-task relation; not more precisely a label, expansion or quoted-only task.');
  }

  // dec === 'ALLOW'
  // RF-09: negation/non-tax framing but explicit tax review requested.
  if (RE.negationReview.test(q)) return pick(REASONS.NEG_REVIEW, 'RF-09', 'Negation/non-tax framing with an explicit tax-review request.');
  // RF-03: definition with tax context.
  if (RE.definition.test(q) && RE.taxContext.test(q)) return pick(REASONS.DEF_CONTEXT, 'RF-03', 'Definition/explanation of a tax term resolved by explicit tax context.');
  // RF-01: tax compliance task.
  if (RE.compliance.test(q)) return pick(REASONS.COMPLIANCE, 'RF-01', 'Requested action is a tax filing/registration/remittance/compliance task.');
  // RF-02: tax treatment of an ordinary object/service/activity/business target.
  if (RE.treatmentVerb.test(q) || RE.filipinoTax.test(q)) return pick(REASONS.TREAT_ORDINARY, 'RF-02', 'Requests tax/VAT/deductibility/withholding/customs treatment of an object, service or activity.');
  // RF-10: residual general explicit tax relation.
  return pick(REASONS.EXPLICIT_TAX, 'RF-10', 'Explicit tax-task relation not captured by a more specific RF rule.');
}

export function validateCompatibility(decision, reason) {
  return DECISION_REASON_COMPAT[decision]?.has(reason) === true;
}

export { REASONS, DECISION_REASON_COMPAT };
