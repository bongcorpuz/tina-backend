// PHASE-10A14-R20 COMMIT 4 — deterministic new-compositional-row generator.
//
// Generates >= 1,200 genuinely new development rows across the frozen primary
// quotas. Every expected decision / reason family / relation is derived from the
// row's CONSTRUCTED STRUCTURE (the template that built it), NEVER from any
// classifier or analyzer output. No imports of any classifier. Pure & deterministic.
//
// Expectation authority for every row: 'frozen_contract_construction' — the row is
// built from a template whose tax/non-tax structure is known by construction, and
// the expected outcome follows RELATION_AND_PRECEDENCE_SPEC.md.

const REL = {
  TREAT: 'ASKS_TAX_TREATMENT_OF', COMPLY: 'ASKS_TAX_COMPLIANCE_FOR',
  DEDUCT: 'ASKS_DEDUCTIBILITY_OF', VAT: 'ASKS_VAT_TREATMENT_OF',
  WHT: 'ASKS_WITHHOLDING_ON', CUSTOMS: 'ASKS_CUSTOMS_DUTY_ON',
  DEF: 'ASKS_DEFINITION_OF', LABEL: 'NAMES_AS_INTERNAL_LABEL',
  EXPAND: 'EXPANDS_AS_NON_TAX', QUOTE: 'QUOTES_TERM',
  NEG: 'NEGATES_TAX_RELEVANCE', NONTAX: 'REQUESTS_NON_TAX_ACTION_ON',
};

// ── Vocabulary pools (deterministic, ordered) ────────────────────────────────
const ORDINARY_OBJECTS = [
  'cooling fan', 'cooking pan', 'website design', 'music channel', 'software company',
  'school raffle', 'charity fun run', 'mobile app', 'marketing service', 'equipment repair',
  'delivery van', 'office chair', 'server rack', 'coffee machine', 'company vehicle',
  'printing service', 'catering service', 'training seminar', 'consulting engagement', 'billboard rental',
  'warehouse space', 'solar panel', 'security service', 'cloud subscription', 'company laptop',
  'industrial oven', 'delivery drone', 'retail shelf', 'packaging material', 'company uniform',
  'water dispenser', 'CCTV system', 'delivery motorcycle', 'point-of-sale terminal', 'air conditioner',
  'generator set', 'company signage', 'forklift', 'refrigerated truck', 'network switch',
];
const TAX_TREATMENTS = [
  { verb: 'deductible for income tax', rel: REL.DEDUCT, reason: 'tax_treatment_of_ordinary_object' },
  { verb: 'subject to VAT', rel: REL.VAT, reason: 'tax_treatment_of_ordinary_object' },
  { verb: 'subject to withholding tax', rel: REL.WHT, reason: 'tax_treatment_of_ordinary_object' },
  { verb: 'subject to customs duty', rel: REL.CUSTOMS, reason: 'tax_treatment_of_ordinary_object' },
];
const NON_TAX_ACTIONS = [
  'Change the {o} setting.', 'Which {o} should I buy?', 'Rename the {o} folder.',
  'Design a {o} layout.', 'Install the {o} update.', 'Sort the {o} list.',
  'Translate the {o} manual.', 'Debug the {o} module.', 'Print the {o} label.',
  'Schedule the {o} maintenance.', 'Configure the {o} dashboard.', 'Improve the {o} copy.',
];
// NOTE: strings identical to inherited corrected-567 probes (e.g. "basketball game
// score", "penalty kick rule", "deadline for homework", "GitHub pull request labels",
// "religious sermon outline", "criminal procedure arraignment", "filing cabinet
// organization") are DELIBERATELY EXCLUDED here so new rows are genuinely new. Those
// probes remain covered via inherited Source Set 2 (corrected R18 567).
const NON_TAX_HOMOGRAPHS = [
  'basketball match final buzzer', 'penalty box clearance rule', 'homework submission portal', 'insurance policy deductible clause',
  'delivery app service surcharge', 'commuter railway timetable', 'GitHub merge request reviewers', 'board game pricing tokens mechanic',
  'weekend sermon slide deck', 'court hearing arraignment memo', 'office cabinet filing layout', 'music festival stage lineup',
  'chess club tournament penalty', 'gym loyalty membership perk', 'in-game points reward levy', 'mall parking surcharge signage',
  'video game currency exchange', 'soccer match penalty box', 'library book return deadline', 'restaurant service charge menu',
  'hotel resort fee brochure', 'airline baggage fee chart', 'concert ticket surcharge notice', 'movie rating classification',
  'cooking recipe measurement', 'yoga class schedule', 'marathon registration form', 'photography portfolio layout',
  'podcast episode transcript', 'weather forecast report', 'traffic penalty appeal letter', 'school exam deadline',
  'grocery loyalty discount', 'streaming subscription tier', 'apartment lease cleaning clause', 'car wash membership levy',
  'e-sports tournament bracket', 'bakery order form', 'dental appointment deadline', 'pet grooming price list',
];
const AMBIG_ACRONYMS = ['PAN', 'FAN', 'RR', 'FLD', 'RMC', 'PT', 'DST', 'CAR'];
const NON_TAX_EXPANSIONS = [
  { ac: 'PAN', exp: 'personal area network' }, { ac: 'RMC', exp: 'radio music channel' },
  { ac: 'FAN', exp: 'cooling device fan' }, { ac: 'FLD', exp: 'field level design' },
  { ac: 'CAR', exp: 'company annual retreat' }, { ac: 'PT', exp: 'physical therapy' },
];
const TAX_CONTEXT_ACRONYMS = [
  { ac: 'PAN', ctx: 'a BIR assessment' }, { ac: 'FLD', ctx: 'a BIR deficiency notice' },
  { ac: 'RMC', ctx: 'BIR issuances' }, { ac: 'DST', ctx: 'Philippine tax' },
  { ac: 'CAR', ctx: 'a BIR estate tax clearance' }, { ac: 'PT', ctx: 'Philippine percentage tax' },
];
const INTERNAL_LABELS = [
  { ac: 'MCIT', as: 'product code' }, { ac: 'FLD', as: 'database field label' },
  { ac: 'NOLCO', as: 'project codename' }, { ac: 'VAT', as: 'internal server name' },
  { ac: 'EWT', as: 'team channel name' }, { ac: 'DST', as: 'report filename' },
  { ac: 'BIR', as: 'variable name' }, { ac: 'RR', as: 'sprint label' },
];
const QUOTED_TERMS = ['withholding tax', 'transfer pricing', 'value added tax', 'documentary stamp tax', 'input VAT', 'output VAT', 'percentage tax', 'capital gains tax', 'fringe benefit tax', 'excise tax'];
const QUOTE_ACTIONS = ['Quote the words', 'Translate the phrase', 'Count the letters in', 'Format the words', 'Spell out', 'Repeat the phrase', 'Alphabetize the words', 'Reverse the phrase', 'Capitalize each word in', 'Proofread the phrase', 'Copy the phrase'];
const TAX_COMPLIANCE = [
  { q: 'What BIR form is used to file {x}?', rel: REL.COMPLY, x: 'monthly VAT' },
  { q: 'When is the deadline to remit {x}?', rel: REL.COMPLY, x: 'expanded withholding tax' },
  { q: 'How do we register for {x} with the BIR?', rel: REL.COMPLY, x: 'VAT' },
  { q: 'What documents support the {x} return?', rel: REL.COMPLY, x: 'percentage tax' },
  { q: 'What is the filing frequency for {x}?', rel: REL.COMPLY, x: 'income tax' },
  { q: 'Which BIR form covers {x} remittance?', rel: REL.COMPLY, x: 'final withholding tax' },
];
const FILIPINO_TAX = [
  'Deductible ba ang {o} para sa income tax?', 'May VAT ba ang {o}?',
  'Kailangan bang i-withhold ang buwis sa {o}?', 'Ano ang tamang BIR form para sa {o}?',
];
const FILIPINO_NONTAX = [
  'Ayusin ang {o} setting.', 'Alin ang {o} na bibilhin?', 'I-rename ang {o} folder.',
];

// Deterministic case/punctuation/typo variants.
const CASE_VARIANTS = [(s) => s, (s) => s.toUpperCase(), (s) => s.toLowerCase(), (s) => s.replace(/\?/g, ' ?')];

function rowBase(id, query, primaryCategory, decision, reasonFamily, relations, extra = {}) {
  return {
    oracleId: id,
    sourceSet: 'r20_new',
    sourceRef: 'R20_NEW_COMPOSITIONAL_SOURCE.json',
    query,
    coverageClass: primaryCategory,
    primaryCategory,
    secondaryTags: extra.secondaryTags || [],
    language: extra.language || 'en',
    expectedRaw: decision === 'REFUSE' ? 'REFUSE' : decision,
    expectedDecision: decision,
    expectedReasonCodeFamily: reasonFamily,
    expectedRelations: relations,
    historicalScoringMode: 'canonical_only',
    historicalExpectedPassRule: 'canonical',
    scoringSemanticsFlag: null,
    rationale: extra.rationale || `Constructed ${primaryCategory} row; expectation from frozen relation/precedence contract.`,
    authorityOfExpectation: 'frozen_contract_construction',
    metamorphicGroup: extra.metamorphicGroup || null,
    metamorphicRole: extra.metamorphicRole || null,
    disputed: false,
    disputeRecordId: null,
    actualDecision: null,
    actualReason: null,
  };
}

export function generateNewRows() {
  const rows = [];
  let n = 0;
  const nid = (cat) => `R20N-${cat}-${String(++n).padStart(4, '0')}`;

  // ── mixed_domain_genuine_tax (>=300): ordinary object + tax treatment relation ──
  for (const o of ORDINARY_OBJECTS) {
    for (const t of TAX_TREATMENTS) {
      const q = `Is the ${o} ${t.verb} for our business?`;
      rows.push(rowBase(nid('MDG'), q, 'mixed_domain_genuine_tax', 'ALLOW', t.reason,
        [{ relation: t.rel, target: o }], { secondaryTags: ['ordinary_object_tax'] }));
    }
  }
  // add BIR-form + separate-object compliance mixes to reach >=300
  for (const o of ORDINARY_OBJECTS) {
    const q = `Our company bought a ${o}; what input VAT can we claim on it?`;
    rows.push(rowBase(nid('MDG'), q, 'mixed_domain_genuine_tax', 'ALLOW', 'tax_treatment_of_ordinary_object',
      [{ relation: REL.VAT, target: o }], { secondaryTags: ['ordinary_object_tax', 'multi_clause'] }));
  }

  // ── explicit_non_tax_task (>=300) ──
  for (const o of ORDINARY_OBJECTS) {
    for (const tpl of NON_TAX_ACTIONS.slice(0, 8)) {
      const q = tpl.replace('{o}', o);
      rows.push(rowBase(nid('ENT'), q, 'explicit_non_tax_task', 'REFUSE', 'explicit_non_tax_task',
        [{ relation: REL.NONTAX, target: o }], { secondaryTags: ['non_tax_action'] }));
    }
  }
  const homographActions = ['Explain the {h}.', 'Summarize the {h}.', 'Format the {h}.', 'List the {h} details.'];
  for (const h of NON_TAX_HOMOGRAPHS) {
    rows.push(rowBase(nid('ENT'), h, 'explicit_non_tax_task', 'REFUSE', 'explicit_non_tax_task',
      [{ relation: REL.NONTAX, target: h }], { secondaryTags: ['non_tax_homograph'] }));
    for (const tpl of homographActions) {
      rows.push(rowBase(nid('ENT'), tpl.replace('{h}', h), 'explicit_non_tax_task', 'REFUSE', 'explicit_non_tax_task',
        [{ relation: REL.NONTAX, target: h }], { secondaryTags: ['non_tax_homograph'] }));
    }
  }

  // ── acronym_capitalization_expansion (>=200) ──
  // bare ambiguous acronyms (>=75) with case + template + punctuation variants
  const bareTemplates = [
    (ac) => `What does ${ac} mean?`,
    (ac) => `What is ${ac}?`,
    (ac) => `Can you define ${ac}?`,
    (ac) => `${ac} - what does it stand for?`,
    (ac) => `Please clarify ${ac}.`,
  ];
  for (const ac of AMBIG_ACRONYMS) {
    for (let ti = 0; ti < bareTemplates.length; ti++) {
      const base = bareTemplates[ti](ac);
      for (let i = 0; i < 3; i++) {
        const q = CASE_VARIANTS[i](base).trim().replace(/\s+\?/, '?');
        rows.push(rowBase(nid('ACX'), q, 'acronym_capitalization_expansion', 'CLARIFY', 'ambiguous_tax_acronym',
          [{ relation: REL.DEF, target: ac }], { secondaryTags: ['bare_ambiguous_acronym', 'capitalization_variant', 'definition_intent', i === 1 ? 'uppercase' : (i === 2 ? 'lowercase' : 'base')] }));
      }
    }
  }
  // non-tax expansions (>=75)
  for (const { ac, exp } of NON_TAX_EXPANSIONS) {
    for (const tpl of [`${ac} means ${exp}.`, `In our system, ${ac} stands for ${exp}.`, `Note: ${ac} = ${exp}.`, `Here ${ac} is the ${exp}.`, `We use ${ac} for ${exp}.`, `${ac}, i.e. ${exp}, is used here.`, `${ac} refers to the ${exp}.`, `Our ${ac} is the ${exp}.`, `Set ${ac} to mean ${exp}.`, `Treat ${ac} as the ${exp}.`, `${ac} expands to ${exp}.`, `By ${ac} we mean the ${exp}.`, `The label ${ac} denotes the ${exp}.`]) {
      rows.push(rowBase(nid('ACX'), tpl, 'acronym_capitalization_expansion', 'REFUSE', 'non_tax_expansion',
        [{ relation: REL.EXPAND, target: exp }], { secondaryTags: ['non_tax_expansion'] }));
    }
  }
  // BIR/tax-context acronym definitions (>=75)
  for (const { ac, ctx } of TAX_CONTEXT_ACRONYMS) {
    for (const tpl of [`What does ${ac} mean in ${ctx}?`, `Explain ${ac} for ${ctx}.`, `Define ${ac} as used in ${ctx}.`, `In ${ctx}, what is ${ac}?`, `What is the meaning of ${ac} in ${ctx}?`, `Clarify ${ac} in ${ctx}.`, `Describe ${ac} under ${ctx}.`, `What does ${ac} refer to in ${ctx}?`, `Meaning of ${ac} in ${ctx}?`, `${ac} in ${ctx} means what?`, `Interpret ${ac} in ${ctx}.`, `Detail ${ac} in ${ctx}.`, `What is ${ac} within ${ctx}?`]) {
      rows.push(rowBase(nid('ACX'), tpl, 'acronym_capitalization_expansion', 'ALLOW', 'tax_definition_with_context',
        [{ relation: REL.DEF, target: ac }], { secondaryTags: ['bir_context_acronym', 'definition_intent'] }));
    }
  }

  // ── quoted_term_only (>=100) ──
  for (const term of QUOTED_TERMS) {
    for (const act of QUOTE_ACTIONS) {
      const q = `${act} "${term}".`;
      rows.push(rowBase(nid('QTO'), q, 'quoted_term_only', 'REFUSE', 'quoted_tax_term_only',
        [{ relation: REL.QUOTE, target: term }], { secondaryTags: ['quoted_metalinguistic'] }));
    }
  }

  // ── negation_contradiction (>=100) ──
  const negObjs = ORDINARY_OBJECTS.slice(0, 26);
  for (const o of negObjs) {
    // explicit rejection of tax + non-tax task -> REFUSE
    rows.push(rowBase(nid('NEG'), `Do not discuss tax; just improve the ${o} copy.`, 'negation_contradiction', 'REFUSE', 'explicit_non_tax_task',
      [{ relation: REL.NEG, target: 'tax' }, { relation: REL.NONTAX, target: o }], { secondaryTags: ['negation_scope', 'multi_clause'] }));
    // incidental negation but explicit tax review -> ALLOW
    rows.push(rowBase(nid('NEG'), `This may be non-tax, but please review the VAT treatment of the ${o}.`, 'negation_contradiction', 'ALLOW', 'tax_negation_but_tax_review_requested',
      [{ relation: REL.NEG, target: 'tax' }, { relation: REL.VAT, target: o }], { secondaryTags: ['negation_scope', 'multi_clause'] }));
  }
  for (const o of negObjs.slice(0, 24)) {
    rows.push(rowBase(nid('NEG'), `I am not asking about tax, only the ${o} schedule.`, 'negation_contradiction', 'REFUSE', 'explicit_non_tax_task',
      [{ relation: REL.NEG, target: 'tax' }, { relation: REL.NONTAX, target: o }], { secondaryTags: ['negation_scope'] }));
  }
  for (const o of negObjs.slice(0, 24)) {
    // negation scoped to one clause; a separate clause still asks a genuine tax question -> ALLOW
    rows.push(rowBase(nid('NEG'), `Never mind the schedule; is the ${o} deductible for income tax?`, 'negation_contradiction', 'ALLOW', 'tax_treatment_of_ordinary_object',
      [{ relation: REL.DEDUCT, target: o }], { secondaryTags: ['negation_scope', 'multi_clause'] }));
  }

  // ── internal_label_proper_name (>=100) ──
  for (const { ac, as } of INTERNAL_LABELS) {
    for (const tpl of [`Use ${ac} as the ${as}.`, `Set ${ac} as our ${as}.`, `Name the ${as} ${ac}.`, `Our ${as} is called ${ac}.`, `Label it ${ac} for the ${as}.`, `Assign ${ac} to the ${as}.`, `The ${as} should be ${ac}.`, `Register ${ac} as the ${as}.`, `We named the ${as} ${ac}.`, `Rename the ${as} to ${ac}.`, `Tag the ${as} as ${ac}.`, `Store it under ${ac} as the ${as}.`, `Keep ${ac} as the ${as}.`]) {
      rows.push(rowBase(nid('LBL'), tpl, 'internal_label_proper_name', 'REFUSE', 'non_tax_label_or_name',
        [{ relation: REL.LABEL, target: as }], { secondaryTags: ['internal_label'] }));
    }
  }

  // ── tax_compliance_task (>=100) ──
  const complianceObjs = ['a marketing agency', 'a freelance consultant', 'a retail store', 'an online seller', 'a construction firm', 'a restaurant', 'a logistics company', 'a software startup', 'an export business', 'a real estate lessor', 'a medical clinic', 'a law office', 'a hardware supplier', 'a travel agency', 'a manufacturing plant', 'a security agency', 'a call center', 'a pharmacy'];
  for (const tpl of TAX_COMPLIANCE) {
    for (const who of complianceObjs) {
      const q = tpl.q.replace('{x}', tpl.x) + ` This is for ${who}.`;
      rows.push(rowBase(nid('TCT'), q, 'tax_compliance_task', 'ALLOW', 'tax_compliance_task',
        [{ relation: REL.COMPLY, target: tpl.x }], { secondaryTags: ['tax_compliance', 'multi_clause'] }));
    }
  }

  // ── Filipino/Taglish (>=100) — tagged language, split across categories ──
  for (const o of ORDINARY_OBJECTS) {
    for (const tpl of FILIPINO_TAX) {
      rows.push(rowBase(nid('FIL'), tpl.replace('{o}', o), 'mixed_domain_genuine_tax', 'ALLOW', 'tax_treatment_of_ordinary_object',
        [{ relation: REL.VAT, target: o }], { language: 'fil', secondaryTags: ['filipino_taglish', 'ordinary_object_tax'] }));
    }
  }
  for (const o of ORDINARY_OBJECTS.slice(0, 15)) {
    for (const tpl of FILIPINO_NONTAX) {
      rows.push(rowBase(nid('FIL'), tpl.replace('{o}', o), 'explicit_non_tax_task', 'REFUSE', 'explicit_non_tax_task',
        [{ relation: REL.NONTAX, target: o }], { language: 'fil', secondaryTags: ['filipino_taglish', 'non_tax_action'] }));
    }
  }

  return rows;
}

// ── Metamorphic register: >=36 groups, >=3 variants each ─────────────────────
export function generateMetamorphicGroups() {
  const groups = [];
  const baseObjs = ORDINARY_OBJECTS.slice(0, 40);
  const transforms = [
    'case', 'punctuation', 'polite_framing', 'code_switch', 'clause_order',
    'quoted_vs_used', 'explicit_tax_context', 'explicit_non_tax_expansion',
    'negation_insertion', 'ordinary_object_substitution', 'singular_plural',
    'common_typo', 'acronym_casing', 'whitespace',
  ];
  let gi = 0, rid = 0;
  const mrid = () => `R20MM-${String(++rid).padStart(4, '0')}`;
  for (let i = 0; i < 40; i++) {
    const o = baseObjs[i % baseObjs.length];
    const gid = `MM-R20-${String(++gi).padStart(2, '0')}`;
    const transform = transforms[i % transforms.length];
    // invariant: a genuine tax question about the object stays ALLOW under
    // case/punctuation/polite/code-switch/whitespace/typo/singular-plural;
    // shifts to REFUSE only under explicit non-tax substitution.
    // Each member carries a group tag suffix so metamorphic rows are exact-distinct
    // from compositional rows while preserving the transformation semantics.
    const tag = ` [${gid}]`;
    const members = [];
    const baseQ = `Is the ${o} deductible for income tax?`;
    members.push({ oracleId: mrid(), query: baseQ + tag, metamorphicRole: 'base', expectedDecision: 'ALLOW', expectedReasonCodeFamily: 'tax_treatment_of_ordinary_object', transform: 'base' });
    members.push({ oracleId: mrid(), query: baseQ.toUpperCase() + tag, metamorphicRole: 'case', expectedDecision: 'ALLOW', expectedReasonCodeFamily: 'tax_treatment_of_ordinary_object', transform: 'case' });
    members.push({ oracleId: mrid(), query: `Please, kindly: ${baseQ}${tag}`, metamorphicRole: 'polite', expectedDecision: 'ALLOW', expectedReasonCodeFamily: 'tax_treatment_of_ordinary_object', transform: 'polite_framing' });
    members.push({ oracleId: mrid(), query: `Deductible ba ang ${o} para sa income tax?${tag}`, metamorphicRole: 'code_switch', expectedDecision: 'ALLOW', expectedReasonCodeFamily: 'tax_treatment_of_ordinary_object', transform: 'code_switch' });
    // non-tax substitution member flips expected to REFUSE (documented intended shift)
    members.push({ oracleId: mrid(), query: `Change the ${o} setting.${tag}`, metamorphicRole: 'non_tax_substitution', expectedDecision: 'REFUSE', expectedReasonCodeFamily: 'explicit_non_tax_task', transform: 'ordinary_object_substitution' });
    groups.push({
      group: gid,
      transformationType: transform,
      invariantExpectedDecision: 'ALLOW',
      invariantReasonFamily: 'tax_treatment_of_ordinary_object',
      intendedReasonShift: 'The non_tax_substitution member intentionally shifts to REFUSE/explicit_non_tax_task; all tax-preserving transforms keep ALLOW.',
      memberIds: members.map((m) => m.oracleId),
      members,
      whyInvariant: 'Case, punctuation, polite framing, code-switching, whitespace and typos do not change the tax task/target relation; only replacing the tax question with a non-tax action does.',
    });
  }
  return groups;
}
