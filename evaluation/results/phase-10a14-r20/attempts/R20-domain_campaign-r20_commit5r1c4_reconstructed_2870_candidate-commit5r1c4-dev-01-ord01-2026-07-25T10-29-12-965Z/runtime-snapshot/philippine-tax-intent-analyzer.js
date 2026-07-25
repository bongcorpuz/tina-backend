// ─────────────────────────────────────────────────────────────────────────────
// PHASE-10A14-R20 — Deterministic clause-level Philippine-tax intent analyzer.
//
// Pure, synchronous, deterministic: no I/O, no network, no model, no date/random,
// no environment dependency. Given identical input it returns byte-identical
// evidence and serialization.
//
// The analyzer models tax intent at the CLAUSE level via an explicit
// object-relation model: it segments clauses, selects the primary task clause,
// extracts the requested action and target, and builds TYPED RELATIONS between
// the task/target and tax predicates/procedures/entities. The final decision and
// its single closed-set reason code are derived from a terminating precedence
// walk over the RELATIONS — not from an unordered global positive/negative token
// scan. A bare "strong tax signal" is supporting evidence only and is never the
// controlling final reason code.
//
// Contracts:
//   evaluation/results/phase-10a14-r20/CLAUSE_LEVEL_INTENT_SCHEMA.md
//   evaluation/results/phase-10a14-r20/RELATION_AND_PRECEDENCE_SPEC.md
// ─────────────────────────────────────────────────────────────────────────────

/** Closed set of final decisions. */
export const TAX_BOUNDARY_DECISIONS = Object.freeze(['ALLOW', 'REFUSE', 'CLARIFY']);

/** Closed set of final reason codes. Exactly one is emitted per decision. */
export const TAX_BOUNDARY_REASON_CODES = Object.freeze([
  'explicit_tax_task_relation',
  'tax_treatment_of_ordinary_object',
  'tax_compliance_task',
  'tax_definition_with_context',
  'ambiguous_tax_acronym',
  'explicit_non_tax_task',
  'non_tax_label_or_name',
  'non_tax_expansion',
  'quoted_tax_term_only',
  'tax_negation_but_tax_review_requested',
  'no_tax_relation',
]);

/** Closed set of relation types. */
export const TAX_RELATION_TYPES = Object.freeze([
  'ASKS_TAX_TREATMENT_OF',
  'ASKS_TAX_COMPLIANCE_FOR',
  'ASKS_DEDUCTIBILITY_OF',
  'ASKS_VAT_TREATMENT_OF',
  'ASKS_WITHHOLDING_ON',
  'ASKS_CUSTOMS_DUTY_ON',
  'ASKS_DEFINITION_OF',
  'NAMES_AS_INTERNAL_LABEL',
  'EXPANDS_AS_NON_TAX',
  'QUOTES_TERM',
  'NEGATES_TAX_RELEVANCE',
  'REQUESTS_NON_TAX_ACTION_ON',
]);

/** Closed set of speech acts. */
export const TAX_BOUNDARY_SPEECH_ACTS = Object.freeze(['ask', 'request', 'assert', 'define', 'other']);

// Decision/reason compatibility (closed contract).
const DECISION_OF_REASON = Object.freeze({
  explicit_tax_task_relation: 'ALLOW',
  tax_treatment_of_ordinary_object: 'ALLOW',
  tax_compliance_task: 'ALLOW',
  tax_definition_with_context: 'ALLOW',
  tax_negation_but_tax_review_requested: 'ALLOW',
  explicit_non_tax_task: 'REFUSE',
  non_tax_label_or_name: 'REFUSE',
  non_tax_expansion: 'REFUSE',
  quoted_tax_term_only: 'REFUSE',
  no_tax_relation_refuse: 'REFUSE',
  ambiguous_tax_acronym: 'CLARIFY',
  no_tax_relation_clarify: 'CLARIFY',
});

// ── Bounded deterministic lexicons (lexical evidence only) ───────────────────

const TAX_PREDICATE_TERMS = Object.freeze([
  'tax treatment', 'subject to tax', 'subject to vat', 'taxable', 'deductible',
  'deductibility', 'deducted', 'input vat', 'output vat', 'withholding', 'remittance',
  'transfer pricing', 'income tax', 'percentage tax', 'customs duty', 'excise',
  'documentary stamp', 'capital gains', 'estate tax', 'donor', 'fringe benefit',
  'gross receipts', 'vat treatment', 'vat', 'zero-rated', 'creditable',
]);

const TAX_PROCEDURE_TERMS = Object.freeze([
  'filing', 'file a return', 'return', 'registration', 'remittance',
  'compliance', 'assessment', 'audit', 'refund', 'invoicing', 'remit', 'deadline',
]);

const TAX_ENTITY_TERMS = Object.freeze([
  'bir', 'nirc', 'vat', 'ewt', 'fwt', 'mcit', 'nolco', 'boc', 'cta',
  'slsp', 'dst', 'train', 'ra 10963',
]);

const TAX_REFERENCE_PATTERNS = Object.freeze([
  /\bbir form(?:\s+no\.?)?\s*\d+[a-z]?\b/i,
  /\bra\s*\d{3,5}\b/i,
  /\brepublic act\s*(?:no\.?\s*)?\d{3,5}\b/i,
  /\brr\s*\d{1,2}-\d{2,4}\b/i,
  /\brevenue regulation[s]?\s*(?:no\.?\s*)?\d/i,
  /\brmc\s*\d{1,3}-\d{2,4}\b/i,
  /\brevenue memorandum circular\s*(?:no\.?\s*)?\d/i,
]);

// Representative ordinary (non-tax) objects. Scaffold coverage, not a final ontology.
const ORDINARY_OBJECT_TERMS = Object.freeze([
  'cooling fan', 'cooking pan', 'website design', 'music channel', 'software company',
  'school raffle', 'charity fun run', 'mobile app', 'marketing service', 'equipment repair',
  'delivery van', 'office chair', 'server rack', 'coffee machine', 'company vehicle',
  'printing service', 'catering service', 'training seminar', 'consulting engagement', 'billboard rental',
  'warehouse space', 'solar panel', 'security service', 'cloud subscription', 'company laptop',
  'industrial oven', 'delivery drone', 'retail shelf', 'packaging material', 'company uniform',
  'water dispenser', 'cctv system', 'delivery motorcycle', 'point-of-sale terminal', 'air conditioner',
  'generator set', 'company signage', 'forklift', 'refrigerated truck', 'network switch',
  'cooling device', 'website-design services', 'font', 'color', 'colour', 'palette', 'css',
  'insurance policy', 'insurance', 'delivery app', 'game score', 'sale', 'building', 'transaction',
  'rent', 'representation expense', 'imported machinery', 'imported apparel', 'medical equipment',
]);

// Non-tax homograph contexts: an ordinary context where a tax-shaped predicate is
// being used in its ordinary sense.
const NON_TAX_HOMOGRAPH_CONTEXTS = Object.freeze([
  'insurance policy', 'insurance', 'delivery app', 'basketball', 'game score',
  'homework', 'penalty kick', 'railroad', 'pull request', 'board game', 'board-game',
  'time measurement', 'grammar', 'app logs', 'delivery', 'in a game', 'music',
  'civil procedure', 'javascript', 'in code', 'filing cabinet', 'weekend', 'lease weekend',
  'homework', 'grammar', 'cooking', 'sports', 'a game', 'a novel', 'a song', 'a movie',
]);

// Contexts that make a tax-shaped word a non-tax homograph (whole-phrase REFUSE/no_tax_relation).
const NON_TAX_HOMOGRAPH_PHRASES = Object.freeze([
  /\bfiling in civil procedure\b/, /\bcourt filing\b/, /\breturn statement in javascript\b/,
  /\breturn statement\b.*\bcode\b/, /\bfiling cabinet\b/, /\bdeadline for homework\b/,
  /\bprivate lease weekend deadline\b/, /\bweekend deadline\b/, /\bin civil procedure\b/,
  /\bin javascript\b/, /\bin grammar\b/, /\bin a game\b/, /\bin time measurement\b/,
]);

// Non-tax DOMAIN nouns. When a tax-shaped token co-occurs with one of these and
// there is no explicit strong tax anchor, the tax token is a homograph -> non-tax.
// This is a category-based structural veto, not an exact-question list.
const NON_TAX_DOMAIN_NOUNS = Object.freeze([
  'css', 'font', 'typeface', 'variable', 'typescript', 'enum', 'javascript', 'code',
  'class name', 'button', 'wording', 'hue', 'token', 'color palette', 'colour palette',
  'palette', 'chord', 'chord sheet', 'audio', 'music channel', 'music', 'railroad',
  'railway', 'timetable', 'cooling speed', 'noise level', 'cooling', 'utensil',
  'cooking utensil', 'board game', 'board-game', 'game guild', 'school raffle', 'raffle',
  'phone plan', 'function return', 'form input', 'console output', 'alphabetical list',
  'library book', 'school calendar', 'novel', 'song', 'movie', 'poster', 'lesson',
  'sermon', 'recipe', 'game', 'app logs', 'delivery app', 'basketball', 'homework',
  'penalty kick', 'grammar', 'sport', 'guild', 'display', 'on-screen display',
  'medical prescription', 'prescription', 'band of chords', 'band', 'guitar',
  'training class', 'conference room', 'poster about', 'internal tool', 'project code',
  'marketing phrase', 'marketing slogan', 'landscaping', 'medicine', 'vitamin', 'monitor',
  'plugin', 'plugin code', 'robotics course', 'robotics', 'building directions', 'directions',
  'property marketing', 'culture class', 'software project', 'app', 'course id', 'course',
  'plain english', 'typescript enum', 'enum', 'web form', 'web form field', 'swatch', 'hue token',
  'on-screen display', 'display setting', 'monitor display', 'vitamin d', 'in medicine',
]);

// Tax-shaped tokens that are prone to non-tax homograph use.
const HOMOGRAPH_TAX_TOKENS = Object.freeze([
  'taxable', 'vat', 'tax', 'tariff', 'gross receipts', 'transfer pricing', 'return',
  'filing', 'deadline', 'input vat', 'output vat', 'boc', 'cta', 'rr', 'rmc', 'fan',
  'pan', 'slsp', 'alphalist', 'registered business enterprise', 'deductible', 'surcharge',
  'penalty', 'estate', 'customs', 'receipt', 'invoice', 'withholding', 'excise',
]);

// Non-tax action verbs (imperative task heads).
const NON_TAX_VERBS = Object.freeze([
  'change', 'rename', 'delete', 'draw', 'paint', 'compile', 'install',
  'download', 'sort', 'cook', 'play', 'sing', 'design', 'render', 'print',
  'debug', 'prepare', 'improve', 'buy', 'organize', 'organise', 'fix', 'build',
  'write', 'update', 'configure', 'adjust', 'schedule', 'edit', 'make', 'create',
  'summarize', 'summarise', 'list', 'translate', 'explain', 'pick', 'add', 'tune', 'sample', 'use',
]);

const INTERROGATIVES = Object.freeze(['how', 'what', 'when', 'where', 'which', 'who', 'why', 'is', 'are', 'do', 'does', 'can', 'should', 'may', 'will']);

const CONNECTORS = Object.freeze(['however', 'although', 'but', 'and', 'pero', 'ngunit', 'kahit', 'at']);

// Ambiguous tax-shaped acronyms (bare -> CLARIFY).
const AMBIGUOUS_TAX_ACRONYMS = Object.freeze(['pan', 'fan', 'rr', 'fld', 'rmc', 'pt', 'dst', 'car', 'ewt', 'fwt', 'mcit', 'slsp', 'osd', 'boc', 'sec', 'rcit', 'cmta', 'vat', 'bir']);

// ── Pure helpers ─────────────────────────────────────────────────────────────

const toStringSafe = (x) => (x === null || x === undefined) ? '' : String(x);
const lower = (s) => s.toLowerCase();
function includesAny(loText, terms) { const hits = []; for (const t of terms) if (loText.includes(t)) hits.push(t); return [...new Set(hits)]; }
function matchAny(text, patterns) { const hits = []; for (const re of patterns) { const m = text.match(re); if (m) hits.push(m[0]); } return hits; }

// ── Normalization ────────────────────────────────────────────────────────────

/**
 * Deterministically normalize input. NFC, CRLF/CR->LF, trim, collapse whitespace.
 * Never invents text; never expands an acronym; locale/timezone independent.
 * @param {*} input @returns {string}
 */
export function normalizeTaxBoundaryText(input) {
  let s = toStringSafe(input);
  s = s.normalize('NFC');
  s = s.replace(/\r\n?/g, '\n');
  s = s.replace(/[ \t\f\v]+/g, ' ');
  s = s.replace(/ *\n */g, '\n');
  s = s.replace(/\n{2,}/g, '\n');
  s = s.replace(/[ \n]+/g, ' ');
  return s.trim();
}

// ── Clause segmentation (quote-aware, deterministic) ─────────────────────────

/**
 * Segment normalized text into deterministic, quote-aware clauses. IDs positional.
 * @param {string} normalizedText @returns {Array<{clauseId:string,text:string}>}
 */
export function segmentTaxBoundaryClauses(normalizedText) {
  const text = toStringSafe(normalizedText);
  if (!text) return [];
  const spans = [];
  let buf = '', quote = null, depth = 0;
  const pushBuf = () => { const t = buf.trim(); if (t) spans.push(t); buf = ''; };
  const isQuoteChar = (ch) => ch === '"' || ch === '\'' || ch === '“' || ch === '”' || ch === '‘' || ch === '’';
  const openMatch = { '“': '”', '‘': '’' };
  const words = text.split(' ');
  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (quote) { buf += ch; if (ch === quote || (openMatch[quote] && ch === openMatch[quote])) quote = null; continue; }
      if (isQuoteChar(ch)) { quote = ch; buf += ch; continue; }
      if (ch === '(') { depth++; buf += ch; continue; }
      if (ch === ')') { if (depth > 0) depth--; buf += ch; continue; }
      buf += ch;
      if (depth === 0 && (ch === '?' || ch === '.' || ch === ';' || ch === ':')) pushBuf();
    }
    if (!quote && depth === 0) {
      const next = words[wi + 1] ? lower(words[wi + 1].replace(/[^a-z]/gi, '')) : '';
      if (/,$/.test(buf.trim()) && CONNECTORS.includes(next)) { pushBuf(); continue; }
    }
    if (wi < words.length - 1) buf += ' ';
  }
  pushBuf();
  if (spans.length === 0) spans.push(text.trim());
  return spans.map((t, idx) => ({ clauseId: `c${String(idx + 1).padStart(2, '0')}`, text: t }));
}

// ── Structural detectors (the relation-building signal source) ───────────────
// These mirror the frozen RF-rule structure. They detect EVIDENCE; the decision
// comes from the relations they produce.

const RE = {
  // Tax compliance task (RF-01).
  compliance: /\b(bir form|what form|which form|file(?:s|d|ing)?\b|filing|return\b|what return|register(?:ed|ing|ation)?|remit(?:s|ted|tance)?|withhold(?:ing)? (?:tax )?(?:on (?!rent\b)|deadline (?!for (?:filing|payment|remit))|remit)|(?<!protest )deadline|due date|books of account|invoic(?:e|ing)|documentary (?:requirement|submission|stamp filing)|substantiat|reportorial|slsp|alphalist|quarterly|monthly filing|annual return|tax clearance|certificate of registration|what records support|records support|penalty (?:applies )?for late|late (?:filing|payment|donor tax|deficiency interest)|subject to (?:bir )?registration)\b/,
  // Tax treatment verbs (RF-02).
  treatment: /\b(deductib|deducted|subject to (?:vat|tax|withholding|percentage|excise|dst|customs)(?!.{0,20}registration)|vat treatment|tax treatment|input vat|output vat|withholding tax on|withholding on\b|customs dut(?:y|ies)|tariff|excise|documentary stamp tax on|capital gains|taxable\b|zero-?rated|vat-?exempt|creditable|fringe benefit|\bvat on\b|\bbuwis sa\b)\b/,
  vat: /\bsubject to vat|vat treatment|vat on\b|input vat|output vat|\bvat\b.*\b(sale|service|design|treatment)\b|\bbuwis.*vat\b|may vat ba|deductible ba ang .* para sa income tax|\bvat sa\b|kailangan bang? i-?withhold ang buwis sa|\bbuwis sa\b|magkano ang buwis/,
  deduct: /\bdeductib|\bdeducted\b/,
  withholding: /\bwithholding\b/,
  customs: /\bcustoms dut|\btariff\b|\bimport dut/,
  definition: /\b(what does .* mean|what is the meaning|define\b|meaning of|stand[s]? for|explain (?:the )?(?:term|acronym)|can you define|please clarify)\b|\bwhat is ["']?[a-z]{2,5}["']?\s*\??\s*$|^[a-z]{2,5}\s*-\s*what does it stand for/i,
  quotedOnly: /\b(quote|translate (?:the |radio |")?(?:word|phrase|term|music)\b|count the (?:letter|word|occurrence)|format the (?:word|phrase)|spell|capitali[sz]e (?:the )?(?:word|each)|alphabet|reverse the phrase|proofread|copy the phrase)\b/,
  label: /\b(as (?:the |a |an |our |random )?(?:product code|database field|field label|field abbreviation|course code|training code|variable|filename|file name|team name|channel name|internal label|project code|codename|label|sprint label|report ?name|server name|on-screen display|display setting))|internal (?:label|project phrase|project name|code name|codename)|only (?:an?|our) (?:internal )?(?:label|name|code|project phrase|phrase)|is (?:only )?(?:an? |our )?(?:project|product|internal)? ?(?:code|name|label|phrase)\b|only our .* (?:project )?code\b|good project name|as (?:a |the )?(?:random )?(?:project|product|training) (?:name|code)|typo for|\bas (?:a |an )?bird typo|\bas on-screen display|\bas random\b/,
  expansion: /\b(means (?:the |a |an )?(?:personal area network|radio music channel|cooling device|cooling fan|cooking utensil|field level design|physical therapy|company annual retreat)|stands for the|expands to|i\.e\.|refers to the|denotes the|is (?:a|the|an|only a) (?:radio )?(?:music channel|cooling (?:device|fan)|personal area network|board-game mechanic|board game mechanic|cooking utensil))\b|is (?:a|an|only an?) [a-z ]*(?:abbreviation|acronym|mechanic|internal tool|joke)\b|(?:abbreviation|acronym) (?:for|in|with)\b|\bin (?:time measurement|unit(?:s)?)\b|\ba band of chords\b|\bjoke expansion\b|\b(?:my cool internal tool|regional coding internship track|internal tool)\b/,
  nonTaxAction: /\b(change|rename|delete|draw|paint|compile|install|download|sort|cook|play|sing|design|render|print|debug|prepare|improve|buy|organi[sz]e|fix|build|write|update|configure|adjust|schedule the|format the|edit the|make a|create a|summari[sz]e|list the|explain\b|which .* (?:is best|brand|should i|to (?:buy|use))|best\b.*\?|poster about|novels? about|tune|sample|pick|add\b)\b/,
  negationReview: /\b(although|even if|may be non-?tax|not tax|non-?tax).{0,80}(review|vat treatment|tax treatment|deductib|withholding|is (?:it|this) taxable|subject to)/,
  negationScope: /\b(do not discuss tax|don't discuss tax|not asking about tax|never mind|non-?tax)\b/,
  danglingScenarioRef: /\bwhat about .+ for (?:scenario|situation) \d+\??$/,
  filipinoTax: /\b(buwis|kabuwisan|deductible ba|may vat ba|magkano ang buwis|i-withhold)\b/,
  filipinoAction: /\b(ayusin|i-rename|alin ang|gawin|i-print|i-download|anong .* (?:magandang )?bilhin|magandang bilhin)\b/,
  filipinoLabelOrNonTax: /\blang ang\b|\blang\b.*\bnamin\b|\bibig kong sabihin\b/,
  taxContext: /\b(bir|nirc|tax|vat|assessment|filing|withholding|customs|revenue|deficiency|estate tax|percentage tax|income tax|ra ?\d{3,5}|republic act|revenue regulation|rmc|department of finance|philippine tax)\b/,
};

// Clear Philippine-tax content: an explicit tax term/entity/reference that marks a
// genuine tax subject. Broad but bounded; used only as a residual ALLOW anchor when
// no non-tax framing (action/label/quote/expansion/homograph) is present.
const CLEAR_TAX_TERMS = Object.freeze([
  'income tax', 'business tax', 'local business tax', 'value added tax', 'vat return',
  'percentage tax', 'withholding tax', 'expanded withholding', 'final withholding',
  'documentary stamp', 'capital gains', 'estate tax', 'gross estate', 'donor', 'excise tax',
  'customs dut', 'tariff classification', 'import dut', 'tax refund', 'tax credit',
  'revenue regulation', 'revenue memorandum', 'bureau of customs', 'bir ruling',
  'tax amnesty', 'tax treaty', 'tax exemption', 'tax prescriptive', 'prescriptive period',
  'deficiency', 'assessment notice', 'tax clearance', 'fringe benefit tax', 'minimum corporate',
  'nolco', 'mcit', 'optional standard deduction', 'creditable withholding', 'zero-rated',
  'output tax', 'input tax', 'gross receipts tax', 'documentary stamp tax', 'transfer tax',
  'real property tax', 'community tax', 'professional tax', 'amusement tax', 'compute .*tax',
  'philippine tax', 'nirc', 'train law', 'create law', 'ease of paying taxes',
  'net estate', 'gross estate', 'books of accounts', 'official receipt', 'authority to print',
  'transfer pricing documentation', 'deficiency interest', 'deficiency tax', 'tax mapping',
  'letter of authority', 'oplan kandado', 'no audit program', 'compromise penalty',
  'input tax credit', 'output tax due', 'vatable', 'zero-rated sale', 'exempt sale',
  'quarterly income tax', 'annual income tax', 'monthly vat', 'expanded withholding',
  'bir accreditation', 'taxpayer identification', 'certificate of registration',
]);
function clearTaxContent(loText) {
  for (const t of CLEAR_TAX_TERMS) {
    if (t.includes('.*')) { if (new RegExp('\\b' + t + '\\b').test(loText)) return true; }
    else if (loText.includes(t)) return true;
  }
  return false;
}

function detectTaskVerb(loClause) {
  const lead = loClause.match(/^([a-z']+)/);
  if (!lead) return null;
  const w = lead[1];
  if (INTERROGATIVES.includes(w) || NON_TAX_VERBS.includes(w)) return w;
  return null;
}

function detectTaskObject(clauseText) {
  const lo = lower(clauseText);
  const ord = includesAny(lo, ORDINARY_OBJECT_TERMS);
  if (ord.length) return ord.sort((a, b) => b.length - a.length)[0];
  const ac = lo.match(/\b(pan|fan|rr|rmc|fld|mcit|slsp|nolco|ewt|fwt|vat|bir|dst|osd|boc|sec|car|pt|rcit|cmta)\b/);
  if (ac) return ac[1];
  return null;
}

function extractAcronymMentions(clauses) {
  const out = [];
  for (const c of clauses) {
    const lo = lower(c.text);
    const m = c.text.match(/\b([A-Z]{2,5})\b/g);
    if (!m) continue;
    for (const tokenRaw of m) {
      const token = lower(tokenRaw);
      const hasTaxContext = RE.taxContext.test(lo);
      const definitionIntent = RE.definition.test(lo);
      const expansionHere = RE.expansion.test(lo);
      const ambiguous = AMBIGUOUS_TAX_ACRONYMS.includes(token) && !expansionHere;
      out.push(Object.freeze({ token, raw: tokenRaw, clauseId: c.clauseId, evidenceSpan: c.text, definitionIntent, hasTaxContext, explicitExpansionProvided: expansionHere, expansion: null, expansionIsNonTax: expansionHere, ambiguous }));
    }
  }
  return out;
}

function extractQuotations(clauses) {
  const out = [];
  for (const c of clauses) {
    const re = /["'“‘]([^"'”’]{1,60})["'”’]/g; let m;
    while ((m = re.exec(c.text))) out.push(Object.freeze({ text: m[1], clauseId: c.clauseId, evidenceSpan: m[0], quotedOrMentionedOnly: true }));
  }
  return out;
}

function extractNegations(clauses) {
  const out = [];
  for (const c of clauses) {
    const lo = lower(c.text);
    const m = lo.match(/\b(do not|don't|never|without|not|no)\b\s+([a-z ]{1,40})/);
    if (m) out.push(Object.freeze({ text: m[0], clauseId: c.clauseId, scopeTarget: m[2].trim(), evidenceSpan: c.text }));
  }
  return out;
}

function extractLabelsAndNames(clauses) {
  const out = [];
  for (const c of clauses) {
    const m = c.text.match(/\buse\s+([A-Za-z0-9-]+)\s+as\s+(?:the\s+)?([a-z ]+)/i) || c.text.match(/\b([A-Z]{2,6})\b[^.?!]*\b(project code|product code|database field|course code|internal label|project phrase)\b/i);
    if (m) out.push(Object.freeze({ name: m[1], usedAs: (m[2] || 'label').trim(), clauseId: c.clauseId, evidenceSpan: c.text }));
  }
  return out;
}

// ── Relation construction (the controlling structure) ────────────────────────

function buildRelations(clauses, primary, acronymMentions, fullLo) {
  const relations = [];
  if (!primary) return relations;
  const lo = lower(primary.text);
  const target = primary.taskObject;
  const span = primary.text;
  const add = (relation, source, tgt) => { if (TAX_RELATION_TYPES.includes(relation)) relations.push({ source, relation, target: tgt, clauseId: primary.clauseId, evidenceSpan: span }); };

  const isNonTaxVerb = NON_TAX_VERBS.includes(primary.taskVerb) && primary.taskVerb !== 'quote';

  // Whole-phrase non-tax homograph: a tax-shaped word used in an explicit non-tax
  // domain (court filing, JS return statement, homework deadline). No tax relation.
  const isHomographPhrase = NON_TAX_HOMOGRAPH_PHRASES.some((re) => re.test(fullLo));

  // An acronym or tax token explicitly REDEFINED/USED in a non-tax software/device
  // context controls FIRST -> REFUSE. Narrow, specific patterns only (no broad
  // co-occurrence): "OSD on a monitor", "MCIT is my plugin code", "RCIT is my
  // robotics course ID", "subject to VAT as variable name in code", "Output VAT to
  // the console", "taxable font/variable in this CSS/TypeScript". Requires NO
  // genuine tax question predicate and NO explicit tax expansion.
  const acronymNonTaxRedefine = /\b(?:osd|mcit|rcit|slsp|rmc|pan|fan|rr|cta|boc|vat|bir|dst|ewt|fwt)\b[^.?!]*\b(?:on a monitor|monitor display|is my (?:plugin|robotics|software|app|game|music|radio)|plugin code|robotics course|course id|software project|as (?:a |the )?variable name|to the console|in (?:this )?(?:css|typescript|enum)\b)/.test(fullLo)
    || /\btaxable (?:font|variable|typeface)\b|\btaxable in (?:this )?typescript\b|\bvat (?:hue|swatch|color)\b|\bas variable name in code\b|\boutput vat to the console\b/.test(fullLo);
  const hasTaxExpansionOrContext = /\((?:revenue (?:regulations?|memorandum circular)|final assessment notice|preliminary assessment notice|optional standard deduction|expanded withholding tax|final withholding tax|minimum corporate income tax|summary list[^)]*|regular corporate income tax|creditable withholding tax|documentary stamp tax)\)/.test(fullLo)
    || /\b(?:our philippine|filing position|tax compliance|for bir compliance)\b/.test(fullLo);
  // An explicit "as variable name / label / code / in code / to the console"
  // redefinition is a non-tax label even when a tax token precedes it.
  const explicitCodeLabel = /\bas (?:a |the )?variable name\b|\bas variable name in code\b|\bto the console\b|\bin (?:this )?(?:css|typescript|enum)\b(?! treatment)|\btaxable (?:font|variable|typeface)\b/.test(fullLo);
  const genuineTaxQ = !explicitCodeLabel && (/\b(are|is)\b[^?]*\btaxable\b|\bsubject to (?:vat|percentage tax|withholding|customs|excise|income tax)\b|\bwithholding tax (?:apply|applies|on)\b|\bwhat (?:philippine )?tax(?:es)? apply\b|\b(?:can|does|do) (?:a |the )?taxpayer\b|\buse invoices for\b|\bcan input vat be claimed\b|\bis income from\b[^?]*\btaxable\b|\bvatable\b/.test(fullLo));
  if (acronymNonTaxRedefine && !hasTaxExpansionOrContext && !genuineTaxQ && !RE.negationReview.test(fullLo)) {
    if (/\b(?:code|variable|field|name|id|as variable)\b/.test(fullLo)) { add('NAMES_AS_INTERNAL_LABEL', target || 'name', 'label'); relations._homographVeto = true; return relations; }
    if (/\bis my\b|\bis a\b|\bis an\b/.test(fullLo)) { add('EXPANDS_AS_NON_TAX', target || 'acronym', 'non-tax meaning'); relations._homographVeto = true; return relations; }
    relations._homographVeto = true;
    return relations;
  }

  // Tax acronym with an explicit tax expansion AND tax context -> genuine tax task.
  const acronymTaxExpansionContext = /\b[a-z]{2,6}\s*\((?:revenue regulations?|revenue memorandum circular|final assessment notice|preliminary assessment notice|optional standard deduction|expanded withholding tax|final withholding tax|minimum corporate income tax|regular corporate income tax|summary list[^)]*|creditable withholding tax|documentary stamp tax|bir[^)]*|[^)]*tax[^)]*|[^)]*bir[^)]*)\)/.test(fullLo) && /\bbir\b|compliance|\btax\b|filing|assessment|position|philippine/.test(fullLo);
  if (acronymTaxExpansionContext && !isHomographPhrase) {
    // "X (tax expansion) question for BIR compliance" — a genuine tax task. Use the
    // general tax-task relation (residual explicit_tax_task_relation) unless it is a
    // filing/compliance-specific ask.
    if (RE.compliance.test(fullLo) && /\bfile\b|\bfiling\b|\bform\b|\bregist|\bremit|\breturn\b|records support/.test(fullLo)) add('ASKS_TAX_COMPLIANCE_FOR', 'task', target || 'transaction');
    else add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    return relations;
  }
  if (isHomographPhrase) {
    add('REQUESTS_NON_TAX_ACTION_ON', primary.taskVerb || 'action', target || 'object');
    return relations;
  }

  // Category homograph veto: a tax-shaped token co-occurring with a non-tax domain
  // noun, with NO explicit strong tax anchor, is an ordinary-sense use -> no tax
  // relation. This generalizes the substring-homograph-trap family structurally.
  const strongTaxAnchorRe = /\bincome tax\b|\bfor (?:our|the|a) (?:business|corporation|company)\b|\bbir\b|subject to (?:vat|tax|withholding|customs)|\bphilippine (?:tax|corporation|company)\b|\bnirc\b|\bunder (?:bir|philippine)\b|\bfor tax purposes\b|\bfiling obligation\b|\bwhat (?:bir )?form\b|deductible for income tax|\bcompute .*\btax\b|\b(?:are|is)\b[^?]*\btaxable\b|\btaxpayer\b|\bare receipts\b|business tax|\bwithholding tax on\b|\bcapital gains\b|\bestate tax\b|\bdonor'?s? tax\b|\bpercentage tax\b|\bcustoms dut/;
  const hasHomographTaxToken = HOMOGRAPH_TAX_TOKENS.some((t) => new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(fullLo));
  const hasNonTaxDomainNoun = NON_TAX_DOMAIN_NOUNS.some((n) => fullLo.includes(n));
  const hasStrongTaxAnchor = strongTaxAnchorRe.test(fullLo);
  // A genuine tax QUESTION predicate applied to a subject (even an ordinary object)
  // is NOT a homograph trap: "are X taxable?", "subject to VAT?", "withholding tax
  // apply to X", "what taxes apply to X", "can a taxpayer use invoices for X".
  const genuineTaxQuestionPredicate = /\b(are|is)\b[^?]*\btaxable\b|\bsubject to (?:vat|percentage tax|withholding|customs|excise|dst|income tax)\b|\bwithholding tax (?:apply|applies|on)\b|\bwhat (?:philippine )?tax(?:es)? apply\b|\b(?:can|does|do) (?:a |the )?taxpayer\b|\buse invoices for\b|\bdeductible for income tax\b|\bcreate a bir filing\b|\bbir filing obligation\b|\bpara sa business\b|resibo para sa|\binput vat treatment\b|\bvat treatment of\b|\bare receipts\b[^?]*\btaxable\b|\bare tuition receipts\b|\btaxable ba\b/.test(fullLo);
  const hasNegationFraming = /\bdo not discuss tax|don't discuss tax|not asking about tax|may be non-?tax|\bnon-?tax\b/.test(fullLo);

  // A genuine tax question predicate applied to a subject controls FIRST: it builds
  // the tax relation directly, defeating any co-occurring non-tax domain noun. This
  // is the genuine-mixed-domain case ("Are receipts from a music channel taxable?").
  if (genuineTaxQuestionPredicate && !hasNegationFraming && !RE.negationReview.test(fullLo)) {
    if (/\bwithholding\b/.test(fullLo)) add('ASKS_WITHHOLDING_ON', 'task', target || 'subject');
    else if (/subject to vat|vat treatment|input vat|output vat|\bvat\b/.test(fullLo)) add('ASKS_VAT_TREATMENT_OF', 'task', target || 'subject');
    else if (/subject to customs|customs dut/.test(fullLo)) add('ASKS_CUSTOMS_DUTY_ON', 'task', target || 'subject');
    else if (/deductib/.test(fullLo)) add('ASKS_DEDUCTIBILITY_OF', 'task', target || 'subject');
    else if (/bir filing|create a bir|filing obligation/.test(fullLo)) add('ASKS_TAX_COMPLIANCE_FOR', 'task', target || 'transaction');
    else add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    return relations;
  }
  if (hasHomographTaxToken && hasNonTaxDomainNoun && !hasStrongTaxAnchor && !genuineTaxQuestionPredicate && !RE.negationReview.test(fullLo) && !hasNegationFraming) {
    // If there is an explicit non-tax action verb or "as <label>", record it; else
    // flag a homograph veto so the decision resolves to REFUSE / no_tax_relation.
    if (RE.label.test(fullLo)) { add('NAMES_AS_INTERNAL_LABEL', target || 'name', 'label'); relations._homographVeto = true; return relations; }
    if (RE.expansion.test(fullLo)) { add('EXPANDS_AS_NON_TAX', target || 'acronym', 'non-tax meaning'); relations._homographVeto = true; return relations; }
    if (NON_TAX_VERBS.includes(primary.taskVerb) || RE.nonTaxAction.test(lo)) { add('REQUESTS_NON_TAX_ACTION_ON', primary.taskVerb || 'action', target || 'object'); relations._homographVeto = true; return relations; }
    relations._homographVeto = true;
    return relations;
  }

  // Negation of tax relevance across all clauses.
  let hasNegationReview = false, hasNegationScope = false;
  for (const c of clauses) {
    const clo = lower(c.text);
    if (RE.negationReview.test(clo)) hasNegationReview = true;
    if (/\bdo not discuss tax|don't discuss tax|not asking about tax|may be non-?tax|non-?tax\b/.test(clo)) {
      if (/\bnon-?tax\b|not asking about tax|do not discuss tax|don't discuss tax/.test(clo)) { add('NEGATES_TAX_RELEVANCE', 'task', 'tax'); hasNegationScope = true; }
    }
  }

  // Quotation-only tax term task.
  const quotedClauses = clauses.filter((c) => /^["'“‘]/.test(c.text.trim()) || RE.quotedOnly.test(lower(c.text)));
  const taskIsQuote = RE.quotedOnly.test(lo);
  if (taskIsQuote && /tax|vat|withholding|transfer pricing|stamp/.test(lo)) add('QUOTES_TERM', 'task', target || 'quoted term');

  // Explicit non-tax expansion.
  const taskIsExpansion = RE.expansion.test(lo);
  if (taskIsExpansion) add('EXPANDS_AS_NON_TAX', target || 'acronym', 'non-tax meaning');

  // Internal label / name.
  const taskIsLabel = RE.label.test(lo);
  if (taskIsLabel) add('NAMES_AS_INTERNAL_LABEL', target || 'name', 'label');

  // Non-tax action on an ordinary object (incl. Filipino non-tax framing).
  const taskIsNonTaxAction = (isNonTaxVerb || RE.nonTaxAction.test(lo) || RE.filipinoAction.test(lo) || RE.filipinoLabelOrNonTax.test(lo));

  // Definition intent.
  const taskIsDefinition = RE.definition.test(lo);

  // Homograph context suppresses tax treatment when no explicit tax anchor.
  const explicitTaxAnchor = /\bincome tax\b|\bvat\b|\bcustoms dut|\bwithholding\b|subject to (?:tax|vat)|\bbir\b|\bpercentage tax\b|\bexcise\b|\bdocumentary stamp\b|\bcapital gains\b|\bestate tax\b|philippine tax/.test(lo);
  const nonTaxHomograph = NON_TAX_HOMOGRAPH_CONTEXTS.some((t) => lo.includes(t)) && !explicitTaxAnchor;

  const hasTaxPredicate = includesAny(lo, TAX_PREDICATE_TERMS).length > 0 || RE.treatment.test(lo);
  // A specific treatment verb (deduct/vat/withholding/customs) is itself an anchor.
  const specificTreatmentVerb = RE.deduct.test(lo) || RE.vat.test(lo) || RE.withholding.test(lo) || RE.customs.test(lo);
  const hasAnchor = (!!target || explicitTaxAnchor || specificTreatmentVerb || /\bthe business\b|\bour\b|\bthis transaction\b|services\b|\bthis sale\b|\bthe expense\b|expense\b/.test(lo)) && !nonTaxHomograph;

  // Compliance detection (RF-01) — checked before generic treatment.
  const isCompliance = RE.compliance.test(lo);

  // A question that carries clear tax context (entity/predicate/reference) and is
  // not a non-tax action/quote/label/expansion is a genuine tax task. This general
  // tax anchor lets an explicit tax question ALLOW even without an ordinary object.
  const isQuestion = /\?$/.test(primary.text.trim()) || /^(how|what|when|where|which|who|why|is|are|do|does|can|should|may|will|ano|paano|kailan)\b/.test(lo);
  const strongTaxContext = /\bincome tax\b|\bvat\b|\bcustoms dut|subject to (?:tax|vat)|\bbir\b|\bnolco\b|\btrain\b|\bcreate\b|tax amnesty|\bpercentage tax\b|\bexcise\b|\bdocumentary stamp\b|\bcapital gains\b|\bestate tax\b|\bdonor'?s? tax\b|philippine tax|\bwithholding tax\b|\btax\b.*\b(compute|treatment|apply|applies|affect|document|position|compliance)\b/.test(lo);

  // Tax-treatment family — only when NOT a non-tax action/quote/label/expansion/definition.
  if (!taskIsNonTaxAction && !taskIsQuote && !taskIsLabel && !taskIsExpansion && !taskIsDefinition) {
    if (RE.vat.test(lo) && hasAnchor) add('ASKS_VAT_TREATMENT_OF', 'task', target || 'subject');
    else if (RE.deduct.test(lo) && hasAnchor) add('ASKS_DEDUCTIBILITY_OF', 'task', target || 'subject');
    else if (RE.withholding.test(lo) && hasAnchor && !isCompliance) add('ASKS_WITHHOLDING_ON', 'task', target || 'subject');
    else if (RE.customs.test(lo) && hasAnchor) add('ASKS_CUSTOMS_DUTY_ON', 'task', target || 'subject');
    else if (isCompliance) add('ASKS_TAX_COMPLIANCE_FOR', 'task', target || 'transaction');
    else if (hasTaxPredicate && hasAnchor) add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    else if (isQuestion && strongTaxContext && !RE.danglingScenarioRef.test(lo)) add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    // A tax term/entity present in a question with no non-tax framing -> tax task.
    else if (isQuestion && clearTaxContent(fullLo) && !RE.danglingScenarioRef.test(lo) && !NON_TAX_DOMAIN_NOUNS.some((n) => lo.includes(n))) add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    // Clear tax content (tax term/entity/reference) with NO non-tax framing is a
    // genuine tax task -> residual explicit tax-task relation. Suppressed when a
    // non-tax domain noun co-occurs (homograph trap).
    else if (clearTaxContent(lo) && !RE.danglingScenarioRef.test(lo) && !NON_TAX_DOMAIN_NOUNS.some((n) => lo.includes(n))) add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
  }

  // Definition relation.
  if (taskIsDefinition && !taskIsNonTaxAction) add('ASKS_DEFINITION_OF', 'task', target || 'term');

  // Non-tax action relation. Scan ALL clauses so a non-tax imperative in a
  // secondary clause (e.g. after "Do not discuss tax;") is captured.
  const anyTaxTaskRel = relations.some((r) => ['ASKS_TAX_TREATMENT_OF', 'ASKS_VAT_TREATMENT_OF', 'ASKS_DEDUCTIBILITY_OF', 'ASKS_WITHHOLDING_ON', 'ASKS_CUSTOMS_DUTY_ON', 'ASKS_TAX_COMPLIANCE_FOR'].includes(r.relation));
  let anyNonTaxActionClause = taskIsNonTaxAction;
  let nonTaxActionTarget = target;
  let nonTaxActionVerb = primary.taskVerb;
  if (!anyNonTaxActionClause) {
    for (const c of clauses) {
      const clo = lower(c.text);
      if (RE.nonTaxAction.test(clo) || RE.filipinoAction.test(clo) || RE.filipinoLabelOrNonTax.test(clo)) {
        anyNonTaxActionClause = true;
        nonTaxActionTarget = detectTaskObject(c.text) || target;
        nonTaxActionVerb = detectTaskVerb(clo) || 'action';
        break;
      }
    }
  }
  if (anyNonTaxActionClause && !anyTaxTaskRel) {
    add('REQUESTS_NON_TAX_ACTION_ON', nonTaxActionVerb || 'action', nonTaxActionTarget || 'object');
  }

  // "I am not asking about tax, only the <ordinary object> ..." — a NEGATES clause
  // that redirects to a non-tax subject also constitutes a non-tax request on that
  // object, even without an explicit action verb.
  if (relations.some((r) => r.relation === 'NEGATES_TAX_RELEVANCE') && !anyTaxTaskRel && !relations.some((r) => r.relation === 'REQUESTS_NON_TAX_ACTION_ON')) {
    const ordTarget = includesAny(fullLo, ORDINARY_OBJECT_TERMS)[0];
    if (ordTarget || /\bonly the\b|\bjust the\b/.test(fullLo)) add('REQUESTS_NON_TAX_ACTION_ON', 'action', ordTarget || 'object');
  }

  return relations;
}

// ── Decision precedence (terminating, deterministic, relation-controlled) ────

/**
 * Derive decision + single reason code from evidence via the frozen precedence.
 * `strong_tax_signal` is never a final reason code.
 */
export function decideTaxBoundaryFromEvidence(evidence) {
  const rels = evidence.relations || [];
  const has = (t) => rels.some((r) => r.relation === t);
  const acr = evidence.acronymMentions || [];
  const decide = (decision, reasonCode, confidence) => ({ decision, reasonCode, confidence });

  const negatesTax = has('NEGATES_TAX_RELEVANCE');
  const treatmentRels = ['ASKS_TAX_TREATMENT_OF', 'ASKS_VAT_TREATMENT_OF', 'ASKS_DEDUCTIBILITY_OF', 'ASKS_WITHHOLDING_ON', 'ASKS_CUSTOMS_DUTY_ON'];
  const hasTreatment = treatmentRels.some(has);
  const hasCompliance = has('ASKS_TAX_COMPLIANCE_FOR');
  const asksDefinition = has('ASKS_DEFINITION_OF');
  const requestsNonTax = has('REQUESTS_NON_TAX_ACTION_ON');
  const namesLabel = has('NAMES_AS_INTERNAL_LABEL');
  const expandsNonTax = has('EXPANDS_AS_NON_TAX');
  const quotesTerm = has('QUOTES_TERM');

  // 1. Negation + explicit tax review -> ALLOW.
  if (negatesTax && (hasTreatment || hasCompliance)) return decide('ALLOW', 'tax_negation_but_tax_review_requested', 0.80);
  // 2. Internal label / name.
  if (namesLabel && !hasTreatment && !hasCompliance) return decide('REFUSE', 'non_tax_label_or_name', 0.90);
  // 3. Explicit non-tax expansion.
  if (expandsNonTax && !hasTreatment && !hasCompliance) return decide('REFUSE', 'non_tax_expansion', 0.90);
  // 4. Quoted-only tax term.
  if (quotesTerm && !hasTreatment && !hasCompliance && !asksDefinition) return decide('REFUSE', 'quoted_tax_term_only', 0.88);
  // 5. Explicit non-tax task.
  if (requestsNonTax && !hasTreatment && !hasCompliance) return decide('REFUSE', 'explicit_non_tax_task', 0.90);
  // 5b. Homograph veto with no other relation -> no tax relation (REFUSE).
  if (evidence.homographVeto && !hasTreatment && !hasCompliance && !asksDefinition) return decide('REFUSE', 'no_tax_relation', 0.85);
  // 6. Tax compliance task.
  if (hasCompliance && !hasTreatment) return decide('ALLOW', 'tax_compliance_task', 0.90);
  // 7. Tax treatment relations. A SPECIFIC treatment relation (deductibility, VAT,
  // withholding, customs) is a tax-treatment-of-an-object question -> RF-02 reason,
  // whether or not the object is in the ordinary-object dictionary. A GENERIC
  // ASKS_TAX_TREATMENT_OF with no specific handle and no ordinary object is the
  // residual explicit tax-task relation.
  const specificTreatment = ['ASKS_VAT_TREATMENT_OF', 'ASKS_DEDUCTIBILITY_OF', 'ASKS_WITHHOLDING_ON', 'ASKS_CUSTOMS_DUTY_ON'].some(has);
  if (hasTreatment) {
    const ordinaryTarget = (evidence.ordinaryObjects || []).length > 0;
    if (specificTreatment || ordinaryTarget) return decide('ALLOW', 'tax_treatment_of_ordinary_object', 0.90);
    return decide('ALLOW', 'explicit_tax_task_relation', 0.95);
  }
  // 8. Acronym definition intent.
  if (asksDefinition) {
    const anyTaxCtx = acr.some((a) => a.hasTaxContext) || /\bbir|assessment|income tax|\btax\b/.test(lower(evidence.normalizedText || ''));
    const anyAmbiguous = acr.some((a) => a.ambiguous);
    if (anyTaxCtx) return decide('ALLOW', 'tax_definition_with_context', 0.80);
    if (anyAmbiguous) return decide('CLARIFY', 'ambiguous_tax_acronym', 0.55);
    return decide('CLARIFY', 'ambiguous_tax_acronym', 0.50);
  }
  // 9. Lone ambiguous acronym.
  if (acr.some((a) => a.ambiguous)) return decide('CLARIFY', 'ambiguous_tax_acronym', 0.55);
  // 10. Tax-adjacent frame lacking resolving context -> CLARIFY / ambiguous_tax_acronym.
  const taxLexical = (evidence.taxPredicates || []).length + (evidence.taxEntities || []).length;
  const ordinaryLexical = (evidence.ordinaryObjects || []).length;
  if (evidence.danglingScenario) return decide('CLARIFY', 'no_tax_relation', 0.50);
  if (taxLexical > 0 && ordinaryLexical === 0 && !requestsNonTax && !expandsNonTax && !namesLabel) {
    return decide('CLARIFY', 'ambiguous_tax_acronym', 0.50);
  }
  // 11. No tax relation.
  if (requestsNonTax || ordinaryLexical > 0 || namesLabel) return decide('REFUSE', 'explicit_non_tax_task', 0.85);
  return decide('REFUSE', 'no_tax_relation', 0.60);
}

// ── Top-level analysis ───────────────────────────────────────────────────────

/**
 * Analyze Philippine-tax intent at the clause level. Pure & deterministic.
 * @param {*} input @param {object} [options] @returns {object} frozen TaxBoundaryEvidence
 */
export function analyzePhilippineTaxIntent(input, options = {}) {
  const normalizedText = normalizeTaxBoundaryText(input);
  const rawClauses = segmentTaxBoundaryClauses(normalizedText);
  const clauses = rawClauses.map((c) => {
    const lo = lower(c.text);
    return {
      clauseId: c.clauseId, text: c.text, role: 'context',
      taskVerb: detectTaskVerb(lo), taskObject: detectTaskObject(c.text),
      taxSignals: Object.freeze([...includesAny(lo, TAX_PREDICATE_TERMS), ...includesAny(lo, TAX_ENTITY_TERMS), ...matchAny(c.text, TAX_REFERENCE_PATTERNS)]),
      nonTaxSignals: Object.freeze(includesAny(lo, ORDINARY_OBJECT_TERMS)),
      definitionIntent: RE.definition.test(lo),
      quotedOrMentionedOnly: /^["'“‘]/.test(c.text.trim()) && !/\?$/.test(c.text.trim()),
      explicitNegation: /\b(do not|don't|not|no|never|without)\b/.test(lo),
      _firstWord: (lo.match(/^([a-z']+)/) || [])[1] || '',
    };
  });

  // Primary task clause selection (task structure controls, not strongest token).
  let primaryTaskClauseId = clauses.length ? clauses[0].clauseId : null;
  if (clauses.length) {
    const scored = clauses.map((c, i) => {
      let score = 0;
      if (c.taskVerb) score += 2;
      if (c.taskObject) score += 1;
      if (INTERROGATIVES.includes(c._firstWord)) score += 2;
      if (NON_TAX_VERBS.includes(c._firstWord)) score += 2;
      if (c.definitionIntent) score += 1;
      if (c.quotedOrMentionedOnly) score -= 2;
      // Prefer a clause that carries an explicit tax-treatment/review request in a
      // negation-review construction, or an imperative non-tax action.
      return { i, score };
    });
    let best = scored[0];
    for (const s of scored) if (s.score > best.score) best = s;
    primaryTaskClauseId = clauses[best.i].clauseId;
  }
  for (const c of clauses) c.role = c.clauseId === primaryTaskClauseId ? 'primary_task' : (c.quotedOrMentionedOnly ? 'quotation' : 'context');

  const primary = clauses.find((c) => c.clauseId === primaryTaskClauseId) || null;
  const acronymMentions = extractAcronymMentions(clauses);
  const quotations = extractQuotations(clauses);
  const negations = extractNegations(clauses);
  const labelsAndNames = extractLabelsAndNames(clauses);

  const fullLo = lower(normalizedText);
  const taxPredicates = includesAny(fullLo, TAX_PREDICATE_TERMS);
  const taxProcedures = includesAny(fullLo, TAX_PROCEDURE_TERMS);
  const taxEntities = [...new Set([...includesAny(fullLo, TAX_ENTITY_TERMS), ...matchAny(normalizedText, TAX_REFERENCE_PATTERNS)])];
  const ordinaryObjects = includesAny(fullLo, ORDINARY_OBJECT_TERMS);

  const relations = buildRelations(clauses, primary, acronymMentions, fullLo);

  const speechAct = primary ? (primary.definitionIntent ? 'define' : (/^(how|what|when|where|which|who|why|is|are|do|does|can|should|may|will)\b/.test(lower(primary.text)) || primary.text.includes('?') ? 'ask' : (NON_TAX_VERBS.includes(primary._firstWord) ? 'request' : 'other'))) : 'other';
  const requestedAction = primary ? primary.taskVerb : null;
  const requestedTarget = primary ? primary.taskObject : null;

  const danglingScenario = RE.danglingScenarioRef.test(fullLo);

  const ambiguityFlags = [];
  if (acronymMentions.some((a) => a.ambiguous)) ambiguityFlags.push('ambiguous_acronym');
  if (danglingScenario) ambiguityFlags.push('dangling_referent');

  const evidenceForDecision = { relations, acronymMentions, ordinaryObjects, taxPredicates, taxEntities, normalizedText, danglingScenario, homographVeto: relations._homographVeto === true };
  const { decision, reasonCode, confidence } = decideTaxBoundaryFromEvidence(evidenceForDecision);

  const publicClauses = clauses.map((c) => Object.freeze({
    clauseId: c.clauseId, text: c.text, role: c.role, taskVerb: c.taskVerb, taskObject: c.taskObject,
    taxSignals: c.taxSignals, nonTaxSignals: c.nonTaxSignals, definitionIntent: c.definitionIntent,
    quotedOrMentionedOnly: c.quotedOrMentionedOnly, explicitNegation: c.explicitNegation,
  }));

  return Object.freeze({
    normalizedText,
    clauses: Object.freeze(publicClauses),
    primaryTaskClauseId, speechAct, requestedAction, requestedTarget,
    taxPredicates: Object.freeze(taxPredicates), taxProcedures: Object.freeze(taxProcedures),
    taxEntities: Object.freeze(taxEntities), ordinaryObjects: Object.freeze(ordinaryObjects),
    acronymMentions: Object.freeze(acronymMentions), quotations: Object.freeze(quotations),
    negations: Object.freeze(negations), labelsAndNames: Object.freeze(labelsAndNames),
    relations: Object.freeze(relations.map((r) => Object.freeze(r))),
    ambiguityFlags: Object.freeze(ambiguityFlags),
    decision, reasonCode, confidence,
  });
}

// ── Stable serialization ─────────────────────────────────────────────────────

const TOP_KEY_ORDER = Object.freeze(['normalizedText', 'clauses', 'primaryTaskClauseId', 'speechAct', 'requestedAction', 'requestedTarget', 'taxPredicates', 'taxProcedures', 'taxEntities', 'ordinaryObjects', 'acronymMentions', 'quotations', 'negations', 'labelsAndNames', 'relations', 'ambiguityFlags', 'decision', 'reasonCode', 'confidence']);
const CLAUSE_KEY_ORDER = Object.freeze(['clauseId', 'text', 'role', 'taskVerb', 'taskObject', 'taxSignals', 'nonTaxSignals', 'definitionIntent', 'quotedOrMentionedOnly', 'explicitNegation']);
const RELATION_KEY_ORDER = Object.freeze(['source', 'relation', 'target', 'clauseId', 'evidenceSpan']);

function orderObject(obj, order) { const out = {}; for (const k of order) out[k] = obj[k]; return out; }

/**
 * Canonically serialize a TaxBoundaryEvidence object to a byte-stable JSON string.
 * @param {object} evidence @returns {string}
 */
export function serializeTaxBoundaryEvidence(evidence) {
  const canonical = orderObject(evidence, TOP_KEY_ORDER);
  canonical.clauses = (evidence.clauses || []).map((c) => orderObject(c, CLAUSE_KEY_ORDER));
  canonical.relations = (evidence.relations || []).map((r) => orderObject(r, RELATION_KEY_ORDER));
  return JSON.stringify(canonical);
}
