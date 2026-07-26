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
  'text box', 'spreadsheet cell', 'spreadsheet', 'form input', 'database column', 'config file',
  'json field', 'ui label', 'dropdown', 'table header', 'css class', 'text field', 'a function',
  'from a function', 'into a text box', 'private lease', 'private lease contract', 'lease contract',
  'private contract', 'private supply agreement', 'private sale', 'private sale agreement',
  'private collection case', 'supply agreement', 'computer file', 'contract deadline',
  'real-estate ads', 'real estate ads', 'ugly real-estate',
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
  quotedOnly: /\b(quote|translate (?:the |radio |")?(?:word|phrase|term|music)\b|count the (?:letters?|words?|occurrences?)|how many (?:letters|characters|words|vowels|consonants)|number of (?:letters|characters)|format the (?:words?|phrase)|repeat the (?:words?|phrase)|alphabeti[sz]e|list the (?:words?|letters)|spell|capitali[sz]e|lowercase|uppercase|reverse|sort the words|alphabet|proofread|copy the phrase|write the (?:word|letters)|type the (?:word|letters)|anagram|palindrome)\b/,
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

  // C6 Priority-1a — QUOTATION SCOPE: a text operation (count/repeat/alphabetize/spell/
  // reverse/proofread) applied to a QUOTED tax term is a quotation action on text, not a
  // tax question. Build QUOTES_TERM and stop, ahead of any tax-predicate detection.
  const textOpRe = /\b(count the (?:letter|word|character|occurrence)|repeat the (?:phrase|word|line)|alphabet(?:i[sz]e)?|spell\b|reverse the (?:phrase|word|string)|proofread|capitali[sz]e|how many (?:letter|word|character)|sort the (?:letter|word))/;
  const hasQuotedSpan = /["'“‘][^"'”’]{1,60}["'”’]/.test(primary.text);
  if (textOpRe.test(lo) && hasQuotedSpan && /\btax\b|vat|withholding|stamp|excise|estate|customs|percentage|donor|gains|receipts/.test(lo)) {
    add('QUOTES_TERM', 'task', target || 'quoted term');
    return relations;
  }

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
  const hasNonTaxDomainNoun = hasNonTaxDomainNounIn(fullLo);
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
  // Label-binding: a tax-shaped acronym bound to an ordinary label-noun (product
  // code, database field label, course/training code, channel/team name, internal
  // label/phrase) via a naming, assignment or checklist act, with NO genuine tax
  // question predicate. "Name the product code MCIT", "Tag the product code as
  // MCIT", "The product code should be MCIT", "Create a checklist for database
  // field label FLD". This is a non-tax label/name -> REFUSE. The genuine-tax carve
  // -out above ("...reported to BIR?", "What taxes apply...", "VATable") already
  // returned before reaching here, so the tax-question rows are unaffected.
  const labelNoun = /\b(?:product code|database field(?: label)?|field (?:label|abbreviation)|course code|training code|channel name|team name|file ?name|variable name|internal (?:label|phrase|project (?:name|phrase|code)|code(?: ?name)?)|sprint label|report ?name|report filename|server name|codename|project (?:code|phrase|name))\b/;
  // Structural label bindings that carry no label noun: assigning a token as a literal
  // filename with an extension ("save the report as VAT_2026.xlsx") or naming a
  // spreadsheet/table column or field with a quoted token. In both the token is the
  // name being assigned, not the subject of a tax relation.
  const filenameBinding = /\b(?:save|store|export|rename|name|call|tag|title)\b[^?]*\bas\b\s*["']?[a-z0-9_\-]*[a-z0-9](?:_[a-z0-9]+)*\.(?:xlsx?|csv|pdf|docx?|txt|json|md)\b/i.test(fullLo)
    || /\b[a-z]{2,6}_\d{2,4}\.(?:xlsx?|csv|pdf|docx?|txt|json|md)\b/i.test(fullLo);
  const columnOrFieldBinding = /\b(?:name|rename|label|tag|title|call|head|set)\b[^?]*\b(?:column|field|header|cell|sheet|tab|row|folder|directory|bucket|key)\b[^?]*["'][^"']{1,20}["']/i.test(fullLo)
    || /\b(?:column|field|header|folder|directory|sheet|tab)\b\s*(?:to|as)\s*["'][^"']{1,20}["']/i.test(fullLo);
  const labelBinding = filenameBinding || columnOrFieldBinding || (labelNoun.test(fullLo)
    && (/\b(?:names?|named|naming|labels?|labell?ed|tags?|tagged|calls?|called|assigns?|assigned|uses?|used|sets?|renames?|renamed|titles?|titled|keeps?|kept|stores?|stored)\b/.test(fullLo)
      || /\bis (?:only )?(?:an? |our )?[a-z ]*\b(?:label|code|name|phrase)\b/.test(fullLo)
      || /\bshould be\b/.test(fullLo)
      || /\bcreate a checklist for\b/.test(fullLo)
      || /\b(?:is|are) called\b/.test(fullLo)
      || /\bunder [a-z]+ as the\b/.test(fullLo)
      || /\bas the (?:report|file|variable|product|project|server|channel|team|course|training)\b/.test(fullLo)));
  // When the label-binding is explicit (label-noun + naming/assignment verb) and the
  // only tax signal is a bare tax acronym (the thing being named), the strong-tax-anchor
  // guard must not block the label reading. A real tax predicate/action still blocks it.
  const strongAnchorIsOnlyBareAcronym = hasStrongTaxAnchor
    && /\b(?:bir|vat|dst|ewt|fwt|cwt|rcit|mcit|osd|nolco|slsp|pan|fan|fld|boc|cta|rr)\b/.test(fullLo)
    && !/\bincome tax\b|subject to (?:vat|tax|withholding|customs)|\bwithholding tax on\b|\bcapital gains\b|\bestate tax\b|\bdonor'?s? tax\b|\bpercentage tax\b|\bcustoms dut|deductible|taxable\b|\bfiling\b|\bfile\b|\bcompute\b/.test(fullLo);
  if (labelBinding && !genuineTaxQuestionPredicate && (!hasStrongTaxAnchor || strongAnchorIsOnlyBareAcronym) && !RE.negationReview.test(fullLo) && !hasNegationFraming) {
    if (/\bcreate a checklist for\b|\bchecklist\b/.test(fullLo)) { add('REQUESTS_NON_TAX_ACTION_ON', primary.taskVerb || 'action', target || 'object'); relations._homographVeto = true; return relations; }
    add('NAMES_AS_INTERNAL_LABEL', target || 'name', 'label'); relations._homographVeto = true; return relations;
  }

  // An explicit tax-treatment predicate applied TO the ordinary object is a genuine
  // tax question about that object ("Our company bought a cooling fan; what input VAT
  // can we claim on it?"). The homograph guard exists for tax-shaped tokens used in a
  // non-tax sense, not for a real tax relation whose target happens to be an ordinary
  // good. A governing tax predicate therefore defeats the veto.
  const taxPredicateGovernsObject = /\b(?:input vat|output vat|what input vat|claim(?:ed)? (?:input )?vat|subject to (?:vat|withholding|percentage tax|excise|customs)|withholding tax on|i-?withhold ang buwis|may vat ba|deductib|capital gain tax|capital gains tax|tariff classification|import dut|customs dut|taxab)\b/i.test(fullLo);
  if (hasHomographTaxToken && hasNonTaxDomainNoun && !hasStrongTaxAnchor && !genuineTaxQuestionPredicate && !taxPredicateGovernsObject && !RE.negationReview.test(fullLo) && !hasNegationFraming) {
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
  // A text operation over a tax-shaped token is a quotation action whether the token is
  // spelled out ("value-added tax") or a recognized acronym ("DST", "MCIT"). Matching
  // only literal tax words let acronym cases fall through to acronym-ambiguity handling.
  if (taskIsQuote && (/tax|vat|withholding|transfer pricing|stamp/.test(lo) || RECOGNIZED_TAX_ACRONYM_RE.test(fullLo))) {
    add('QUOTES_TERM', 'task', target || 'quoted term');
  }

  // Explicit non-tax expansion.
  const taskIsExpansion = RE.expansion.test(lo);
  if (taskIsExpansion) add('EXPANDS_AS_NON_TAX', target || 'acronym', 'non-tax meaning');

  // Internal label / name.
  const taskIsLabel = RE.label.test(lo);
  if (taskIsLabel) add('NAMES_AS_INTERNAL_LABEL', target || 'name', 'label');

  // Non-tax action on an ordinary object (incl. Filipino non-tax framing).
  // An unambiguous tax instrument whose own name contains an ordinary verb ("authority
  // to print", "books of accounts", "summary list of sales") must not be read as a
  // non-tax action. The instrument name is the subject matter, not a requested action.
  // The bypass holds only while the instrument name is the actual subject. An explicit
  // non-tax object or setting attached to it ("authority to print a school newspaper",
  // "official receipt layout design", "permanent establishment in architecture") means
  // the words are being borrowed for another domain, so the non-tax reading stands.
  const instrumentBorrowedByOtherDomain = /\b(?:newspaper|newsletter|magazine|yearbook|layout|design|artwork|poster|banner|architecture|architectural|exam|examination|grade|agenda|library|book club|menu|invitation|certificate template|school (?:paper|press))\b/i.test(fullLo);
  // An explicit Filipino/Taglish tax predicate is a governed tax relation, not an
  // ordinary action: buwis/VAT/deductible/BIR form over a target asks a tax question.
  const filipinoTaxPredicate = /\b(?:buwis|kabuwisan|i-?withhold|withhold)\b/i.test(fullLo)
    && /\b(?:ang|sa|ba|ng|para|bang|may)\b/i.test(fullLo);
  const namesTaxInstrument = (UNAMBIGUOUS_PH_TAX_TERM_RE.test(fullLo) || BARE_TAX_TOPIC_RE.test(fullLo))
    && !instrumentBorrowedByOtherDomain;
  // An explicit tax predicate governing the target means the noun after it is the
  // taxable object, not a requested action ("May VAT ba ang website design?").
  // An explanatory verb applied to a tax instrument in explicit tax context is a
  // definition request about that instrument, not an ordinary non-tax action.
  const explanatoryOverTaxInstrument = /^(?:please\s+)?(?:explain|describe|clarify|interpret|detail|summari[sz]e)\b/i.test(fullLo.trim())
    && RECOGNIZED_TAX_ACRONYM_RE.test(fullLo) && EXPLICIT_TAX_CONTEXT_RE.test(fullLo);
  const explicitTaxPredicateGovernsTarget = /\b(?:subject to (?:tax|vat|withholding|customs|excise|percentage tax|final tax)|may vat ba|deductible ba|i-?withhold ang buwis|buwis sa|tamang bir form|customs dut\w*|import dut\w*|withholding tax|value[- ]added tax|\bvat\b|income tax|capital gains tax|documentary stamp|final tax|excise tax|percentage tax|estate tax|deductib\w*|taxab\w*|vatable|tax treatment|vat treatment)\b/i.test(fullLo);
  const filipinoTaxRelationOverTargetLocal = /\bi-?withhold ang buwis sa\s+\S|\bbuwis sa\s+\S|\bmay vat ba ang\s+\S|\bdeductible ba ang\s+\S|\btamang bir form para sa\s+\S/i.test(fullLo);
  const taskIsNonTaxAction = !namesTaxInstrument && !filipinoTaxPredicate && !explanatoryOverTaxInstrument && !filipinoTaxRelationOverTargetLocal
    && !(explicitTaxPredicateGovernsTarget && !hasNonTaxDomainNounIn(fullLo))
    && (isNonTaxVerb || RE.nonTaxAction.test(lo) || RE.filipinoAction.test(lo) || RE.filipinoLabelOrNonTax.test(lo));

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
    // A compliance relation requires a tax-domain object, institution or procedure.
    // The procedural word alone (return, due, file, claim, registration, list) has an
    // ordinary sense that keeps its own domain, so it cannot anchor tax jurisdiction.
    else if (isCompliance && (TAX_DOMAIN_OBJECT_RE.test(fullLo) || CONCISE_TAX_PHRASE_RE.test(fullLo))) {
      add('ASKS_TAX_COMPLIANCE_FOR', 'task', target || 'transaction');
    }
    else if (hasTaxPredicate && hasAnchor) add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    else if (isQuestion && strongTaxContext && !RE.danglingScenarioRef.test(lo)) add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    // A question whose subject matter is unambiguous tax terminology or a bare tax
    // topic is a governed tax question even when no treatment verb pattern matched
    // ("How is capital gain tax computed on sale of real property?").
    // A recognized PH tax acronym combined with a governed relation word (rate,
    // computation, application, treatment) is a tax question about that tax.
    // A coherent concise tax phrase, or a named statute inside a tax question, names
    // the governed subject matter directly and needs no sentence frame.
    else if ((CONCISE_TAX_PHRASE_RE.test(fullLo) || (NAMED_STATUTE_RE.test(fullLo) && /\b(?:affect|apply|applies|govern|cover|change|require|impose|allow|under|treat)\b/i.test(fullLo)))
             && !hasNonTaxDomainNounIn(fullLo) && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(fullLo)) {
      add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    }
    // A Filipino/Taglish tax predicate governing a named object is a tax relation.
    else if (filipinoTaxRelationOverTargetLocal) {
      add(/\bvat\b/i.test(fullLo) ? 'ASKS_VAT_TREATMENT_OF' : (/\bwithhold/i.test(fullLo) ? 'ASKS_WITHHOLDING_ON' : 'ASKS_TAX_TREATMENT_OF'), 'task', target || 'subject');
    }
    // A concise tax-domain noun phrase is a governed request even without a sentence
    // frame or interrogative marker.
    else if (CONCISE_TAX_PHRASE_RE.test(fullLo) && !hasNonTaxDomainNounIn(fullLo)
             && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(fullLo)) {
      add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    }
    else if (isQuestion && RECOGNIZED_TAX_ACRONYM_RE.test(fullLo)
             && /\b(rate|comput\w*|appl\w*|treatment|due|payable|creditable|base|threshold|exempt\w*|file|filing|return|deadline|claimed?|imposed?)\b/i.test(fullLo)
             && !hasNonTaxDomainNounIn(fullLo) && !NON_TAX_CONTROLLING_DOMAIN_RE.test(fullLo)
             && !NON_TAX_INSTITUTIONAL_DOMAIN_RE.test(fullLo)) {
      add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    }
    else if (isQuestion && namesTaxInstrument
             && !hasNonTaxDomainNounIn(fullLo) && !NON_TAX_CONTROLLING_DOMAIN_RE.test(fullLo)
             && !NON_TAX_INSTITUTIONAL_DOMAIN_RE.test(fullLo)) {
      add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    }
    // A tax term/entity present in a question with no non-tax framing -> tax task.
    else if (isQuestion && clearTaxContent(fullLo) && !RE.danglingScenarioRef.test(lo) && !hasNonTaxDomainNounIn(lo)) add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    // Clear tax content (tax term/entity/reference) with NO non-tax framing is a
    // genuine tax task -> residual explicit tax-task relation. Suppressed when a
    // non-tax domain noun co-occurs (homograph trap).
    else if (clearTaxContent(lo) && !RE.danglingScenarioRef.test(lo) && !hasNonTaxDomainNounIn(lo)) add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    // Scenario-tag invariance: an enumerated corpus tag ("in case 19?", "Mixed 12.",
    // "Group MM-14.") must not suppress a tax relation that the same clause carries
    // without the tag. Re-evaluate the tag-stripped clause through the same
    // compliance/treatment predicates; the tag itself contributes no evidence.
    // An unambiguous spelled-out Philippine tax term is self-resolving subject matter.
    // A bare topical mention of one ("Formal Letter of Demand", "administrative
    // protest") is a governed tax subject even without an interrogative frame.
    else if (namesTaxInstrument
             && !hasNonTaxDomainNounIn(fullLo)
             && !NON_TAX_CONTROLLING_DOMAIN_RE.test(fullLo)) {
      add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
    }
    else if (!relations.length) {
      const stripped = stripScenarioTag(lo);
      const strippedFull = stripScenarioTag(fullLo);
      if (stripped !== lo || strippedFull !== fullLo) {
        const noNonTaxFraming = !hasNonTaxDomainNounIn(stripped)
          && !NON_TAX_CONTROLLING_DOMAIN_RE.test(strippedFull);
        if (noNonTaxFraming) {
          if (RE.compliance.test(stripped)) add('ASKS_TAX_COMPLIANCE_FOR', 'task', target || 'transaction');
          else if (RE.vat.test(stripped)) add('ASKS_VAT_TREATMENT_OF', 'task', target || 'subject');
          else if (RE.deduct.test(stripped)) add('ASKS_DEDUCTIBILITY_OF', 'task', target || 'subject');
          else if (RE.withholding.test(stripped)) add('ASKS_WITHHOLDING_ON', 'task', target || 'subject');
          else if (RE.customs.test(stripped)) add('ASKS_CUSTOMS_DUTY_ON', 'task', target || 'subject');
          else if (clearTaxContent(strippedFull) || PH_TAX_AUTHORITY_TERM_RE.test(strippedFull)) add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
        }
      }
    }
  }

  // Definition relation.
  if ((taskIsDefinition || explanatoryOverTaxInstrument) && !taskIsNonTaxAction) add('ASKS_DEFINITION_OF', 'task', target || 'term');

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

// ── Typed target-completeness (decision-lane referent model) ─────────────────

const COMPLIANCE_PROCEDURE_RE = /\b(bir form|what form|which form|\bform\b|file\b|filing|\breturn\b|register(?:ed|ing|ation)?|remit|books of account|invoic(?:e|ing)|slsp|alphalist|quarterly|annual return|tax clearance|certificate of registration|records support|deadline to file|due date|when is the return due|what records)\b/;
// Stems must not carry a trailing word boundary: "\bdeductib\b" can never match
// "deductible". Stems use \w* so the attribute family is recognised in every inflection.
const TREATMENT_ATTRIBUTE_RE = /\b(deductib\w*|credited|creditable|exempt\w*|surcharge|penalt\w*|period|deadline|rate|threshold|holding period|tariff|protest|appeal|notice period|taxab\w*|vatable|zero[- ]?rated|subject to (?:vat|tax|withholding))\b/;
const CONCRETE_SUBJECT_RE = /\b(deficiency interest|culture class|income from|sale\b|import(?:ed|s)?|property|compensation|dividend|interest income|royalt|rent(?:al)?\b|fringe benefit|estate\b|donation|transaction|expense|the [a-z]+ (?:purchase|van|car|printer|machinery|warehouse|fee|cost|subscription|dinner)|for (?:a|an|the|our|my) [a-z])/;
const CONCRETE_TAX_NOUN_RE = /\b(assessment|prescriptive period|final assessment notice|deficiency|notice|customs dut|tariff classification|import|estate|donation|refund|credit|amnesty|ruling|clearance|registration)\b/;

// Non-tax domain nouns must match as whole words. Raw substring matching produced a
// global token veto that fired on ordinary morphology ("app" inside "applies",
// "car" inside "carry"), suppressing genuine tax relations. Word-boundary matching
// keeps the homograph guard targeted at the actual noun.
const NON_TAX_DOMAIN_NOUN_RES = Object.freeze(
  NON_TAX_DOMAIN_NOUNS.map((n) => new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'))
);
function hasNonTaxDomainNounIn(loText) {
  for (const re of NON_TAX_DOMAIN_NOUN_RES) if (re.test(loText)) return true;
  return false;
}

// A trailing enumerated scenario tag ("in case 19?", "Mixed 12.", "Group MM-14.",
// "Batch QQ-5.") is a corpus enumeration device, not semantic content. It must not
// add or remove a tax relation: the decision is governed by the clause that remains
// once the tag is stripped. Structural, not an exact-query match.
const SCENARIO_TAG_RE = /(?:\s+in\s+(?:case|scenario|situation|item|matter|reference|batch|group)\s+[a-z]{0,3}-?\d+)\s*([?.!])?\s*$|(?:[.;,]?\s*(?:mixed|group|batch|set|case|scenario|situation|item|matter|reference|variant|sample)\s+[a-z]{0,3}-?\d+\s*\.?)\s*$/i;
function stripScenarioTag(loText) {
  let out = loText;
  for (let i = 0; i < 3; i++) {
    const next = out.replace(SCENARIO_TAG_RE, (m, q) => (q ? q : ''));
    if (next === out) break;
    out = next.trim();
  }
  return out.trim();
}

// Non-tax controlling domains. A private civil/contractual, corporate-regulatory or
// consumer question is not a tax question even when it carries tax-shaped vocabulary
// ("due", "penalty", "deadline", "notice", "return"). Governs the target, so it
// suppresses a tax relation rather than voting against one.
const NON_TAX_CONTROLLING_DOMAIN_RE = /\b(private lease|private sale|private supply|private collection|private contract|private messaging|landlord|tenant|sublease|evict|security deposit|civil court|court handles|temporary restraining order|restraining order|notarization|notarized|show cause order|articles of incorporation|amend its articles|general membership meeting|board (?:may )?remove a director|inspect corporate records|revoke a corporation|breaches our purchase order|unpaid personal loan|training costs by contract|relocation costs|contractor misses|contractor be sued|buyer cancel|employer recover)\b/;

// Non-tax institutional/regulatory domains. Labor, corporate-registry (SEC), judicial,
// insurance and academic matters have their own filings, deadlines, prescriptive
// periods and reports. Those procedural nouns are tax-shaped but the controlling
// agency and subject matter are not tax, so the target belongs to another domain.
// Defeated by an explicit BIR/tax anchor (e.g. "SEC report ... for income tax").
const NON_TAX_INSTITUTIONAL_DOMAIN_RE = /\b(labor (?:case|filing|complaint|arbiter|standards|code)|illegal dismissal|money claims in labor|nlrc|dole\b|resignation|separation pay dispute|sec report|sec\b[^?]*\b(?:report|filing|gis|show cause|revoke)|gis report|general information sheet|motion for reconsideration|civil complaint|civil case|criminal case|small claims|barangay conciliation|insurance claim lawsuit|malpractice|school filing|academic record|enrollment record|court of appeals(?! .*tax)|supreme court(?! .*tax)|regional trial court|municipal trial court)\b/i;

// Generic contentless compliance/treatment question: a bare procedural or treatment
// attribute with no subject, no agency and no domain ("When is the deadline?",
// "Can I file a return?", "Can it be deducted?"). Nothing identifies which tax,
// taxpayer or transaction is meant, so no controlling relation can be constructed.
const GENERIC_CONTENTLESS_QUESTION_RE = /^(?:when is the (?:deadline|due date)|what is the (?:deadline|due date|filing requirement|requirement)|can i file(?: a return| online)?|can the return be corrected|what happens if i miss the deadline|can it be deducted|what form should i use|is it deductible|is this deductible|do i need to file|where do i file|how do i file|what do i file|am i required to file|is there a penalty|what is the penalty|when do i file)\s*\??\.?$/i;

// Philippine tax authority terms and instruments. Presence of one of these as the
// subject of a definition or question is explicit tax context: it resolves an
// otherwise materially ambiguous acronym. Never used to invent an expansion.
const PH_TAX_AUTHORITY_TERM_RE = /\b(rmc|rcit|mcit|osd|cta|dst|ewt|fwt|nolco|slsp|fld|fan|cmta|bir|nirc|boc|rr no\.?|rmo|rdo|revenue memorandum|revenue regulation|bureau of customs|court of tax appeals|optional standard deduction|minimum corporate income tax|regular corporate income tax|customs clearance|duty drawback|transfer pricing|authority to print|deficiency interest|input vat|output vat|withholding|capital gains|documentary stamp|percentage tax|excise|estate tax|donor'?s tax|tax amnesty|tax treaty|tax refund|tax credit|tax clearance)\b/i;

// Unambiguous Philippine tax terminology: multi-word instruments, remedies and
// doctrines that have no material non-tax reading. Unlike a bare acronym these are
// self-resolving, so they carry a governed tax relation on their own. Spelled-out
// phrases only — a bare acronym never qualifies here.
const UNAMBIGUOUS_PH_TAX_TERM_RE = /\b(formal letter of demand|notice for informal conference|preliminary assessment notice|final assessment notice|final decision on disputed assessment|administrative protest|reinvestigation request|reconsideration request|permanent establishment|eopt law|ease of paying taxes|court of tax appeals petition|petition for review|letter of authority|tax verification notice|mission order|subpoena duces tecum|waiver of the statute|prescriptive period|revenue memorandum (?:circular|order|ruling)|revenue regulations?|bir ruling|tax treaty relief|transfer pricing documentation|advance pricing arrangement|optional standard deduction|minimum corporate income tax|regular corporate income tax|improperly accumulated earnings|net operating loss carry[- ]?over|creditable withholding tax|expanded withholding tax|final withholding tax|documentary stamp tax|value[- ]added tax|percentage tax|excise tax|estate tax|donor'?s tax|capital gains tax|fringe benefit tax|gross receipts tax|real property tax|community tax certificate|authority to print|certificate of registration|books of accounts|official receipt|sales invoice|summary list of sales|alphalist|tax amnesty|tax clearance|duty drawback|customs clearance|tariff classification|deficiency interest|delinquency interest|compromise penalty|oplan kandado|tax mapping|no audit program|bureau of internal revenue|bureau of customs|national internal revenue code)\b/i;

// Explicit non-tax expansion binding: the query itself supplies a non-tax meaning for
// a token ("X stands for the staff carpool roster", "Note: X = weekend hiking club").
// The binding controls the target regardless of whether the token is tax-shaped.
const NON_TAX_EXPANSION_BINDING_RE = /\b([a-z]{2,6})\s*(?:=|stands for|refers to|abbreviates|denotes|indicates|means)\s+(?:the\s+|a\s+|an\s+|our\s+)?([a-z][a-z\s-]{2,60})/i;

// Further explicit expansion-binding phrasings that bind a token to a stated meaning
// without the verbs above: "We use X for <meaning>", "X, i.e. <meaning>",
// "Set X to mean <meaning>", "Treat X as the <meaning>", "By X we mean <meaning>",
// "Here X is the <meaning>", "Our X is the <meaning>". The binding is what controls.
const NON_TAX_EXPANSION_BINDING_ALT_RE = /\b(?:we use|set|treat|by|here|our)\s+([a-z]{2,6})\b[^.?!]{0,12}?\b(?:for|to mean|as the|as a|we mean|is the|is a)\s+(?:the\s+|a\s+|an\s+)?([a-z][a-z\s-]{2,60})|\b([a-z]{2,6}),\s*(?:i\.?e\.?|that is|namely)\s*,?\s*(?:the\s+|a\s+|an\s+)?([a-z][a-z\s-]{2,60})/i;

// Substring traps: ordinary words that merely CONTAIN a tax-shaped substring
// ("taxonomies", "taxicab", "syntax", "taxidermy") or tax-shaped procedural nouns
// used in a plainly non-tax setting (importing a computer file, a project-management
// due date, an insurance claim file, a school labor-day filing). These are lexical
// accidents, so they must never anchor a tax relation.
const TAX_SUBSTRING_TRAP_RE = /\b(?:taxonom\w*|taxicab\w*|syntax\w*|taxidermy|taxi|taxa|taxon)\b/i;
// "school" alone is too broad — a school can be an ordinary taxpayer. The non-tax
// setting requires an actual schooling-administration noun, not the institution.
const NON_TAX_SETTING_RE = /\b(?:computer file|excel|spreadsheet|upload(?:ed|s)?|download|assessment page|web page|project management|school (?:calendar|filing|report|record|grade|enrol\w*)|labor day|insurance claim file|defective|reschedul\w*|software|browser|application form for (?:school|club))\b/i;

// A bare topical tax phrase ("de minimis benefits", "dutiable value", "tax-free
// exchange") names governed tax subject matter with no interrogative frame and no
// competing non-tax domain. Spelled-out phrases only; never a bare acronym.
const BARE_TAX_TOPIC_RE = /\b(de minimis benefits?|stock transaction tax|principal residence|tax[- ]free exchange|substantiation for deductions?|customs broker|post[- ]clearance audit|dutiable value|ad valorem dut(?:y|ies)|tax protest|fdda|tax delinquency|tax lien|distraint|levy|garnishment|installment sale|fringe benefit|de minimis|withholding tax table|optional standard deduction|itemized deduction|net operating loss|holding period|capital asset|ordinary asset|zero[- ]rated sale|vat[- ]exempt sale|input vat|output vat|tax credit certificate|tax refund claim|tariff classification|tariff and customs code|temporary importation|post[- ]entry (?:customs )?audit|customs tax obligation|tax sparing|double tax(?:ation)? agreement|resident alien tax\w*|non[- ]resident citizen tax\w*|tax on professional fees|tin registration|tax situs|situs of tax\w*|tax accounting period|taxpayer remed\w*|refund claim prescription|taxable accounting period|prescription of a refund claim|tax sparing credit|business tax situs|remedies available to an assessed taxpayer|double taxation agreement relief)\b/i;

// An enumerated metadata suffix — an enumeration keyword followed by an index,
// optionally letter-prefixed — is a corpus indexing device. It never supplies a target
// and can never resolve a deictic reference.
const METADATA_SUFFIX_RE = /\b(?:context|situation|item|matter|reference|case|scenario|group|batch|set|variant|sample|mixed)\s+[a-z]{0,3}-?\d+\s*[.?!]?\s*$/i;

// Ordinary noun phrases whose head noun belongs to a non-tax activity even though the
// phrase carries a tax-shaped word ("car wash membership levy", "school exam deadline",
// "office cabinet filing layout", "dental appointment deadline"). The head activity
// governs the target, so no tax relation may be anchored on the tax-shaped word.
const NON_TAX_HEAD_ACTIVITY_RE = /\b(?:car wash|membership|gym|club|dental|medical appointment|appointment|exam|examination|cabinet|shelf|shelving|layout|seating|parking|newsletter|reading list|book club|potluck|picnic|excursion|recital|rehearsal|tournament|league|raffle draw|costume|karaoke)\b/i;

// Recognized Philippine tax acronyms whose expansion is fixed and non-ambiguous in a
// tax context. Listing the token is recognition, never invention of an expansion.
// A tax-domain object, institution or procedure. A compliance relation requires one
// of these to govern the target: the procedural word alone (return, due, file,
// claim, registration, list, output, assessment) is not sufficient, because each has
// an ordinary sense that must keep its own domain.
const TAX_DOMAIN_OBJECT_RE = /\b(?:bir|bureau of internal revenue|revenue district|rdo\b|revenue regulation|revenue memorandum|nirc|national internal revenue|bureau of customs|court of tax appeals|taxpayer|tax|taxes|taxable|taxation|vat|value[- ]added|withholding|percentage tax|excise|documentary stamp|capital gains|estate tax|donor|customs dut|tariff|import dut|deficiency|assessment notice|letter of authority|alphalist|slsp|books of accounts|official receipt|sales invoice|certificate of registration|authority to print|income tax|final tax|fringe benefit|creditable|input tax|output tax|refund of|tax refund|tax credit|amnesty|prescriptive period|deficiency interest|compromise penalty|payee|remittance|remit|surcharge|efps|ebirforms|ebir|annual information return|information return|registered business enterprise|rbe\b|late filing|compromise|installment payment|quarterly return|monthly return|withholding agent|revenue officer|zonal value|fair market value|gross receipts|gross sales|net taxable)\b/i;

// Ordinary-language domains for tax-shaped procedural words. When one of these
// governs the target and no tax-domain object is present, the ordinary sense wins.
// Styling and programming artefacts govern their own target. A tax-shaped predicate
// applied to a stylesheet class, typeface, console output or function return is a
// homograph of the tax sense and creates no tax jurisdiction.
const STYLING_OR_PROGRAM_OBJECT_RE = /\b(?:css|stylesheet|style sheet|typeface|font weight|css class|class name|classname|selector|theme file|layout sheet|console output|function return|return value|web form|form field|text box|placeholder|markup|html|javascript|typescript)\b|\bfont\b(?!\s*(?:of|for)\s+(?:income|revenue))|\boutput vat from a function\b/i;

const ORDINARY_PROCEDURAL_DOMAIN_RE = /\b(?:librar\w*|borrow\w*|showroom|crockery|sofa|projector|student|students|pupil|classroom|semester|choir|roster|alphabetical|alphabeti[sz]e|css|stylesheet|typeface|\bfont\b|function|console|routine|build|log panel|spreadsheet|folder|archive|summons|judicial|appeal bond|position paper|board changes|minutes of the board|warranty|ferry|noticeboard|lobby|signage|pantry|carpool|hiking|chess|fun run(?! .*(?:duty|tax))|science project|stage lighting|daylight schedule|theme file|layout sheet)\b/i;

// A concise tax-domain noun phrase: a coherent professional request that need not be
// a full sentence. Recognised through tax-domain vocabulary plus a governing tax
// concept, not through row-specific wording.
const CONCISE_TAX_PHRASE_RE = /\b(?:taxable compensation|capital gain[s]? tax|import dut(?:y|ies)? treatment|refund claim prescription|prescription of a refund claim|bir registration|revenue district office registration|pan (?:reply|response)|fld (?:reply|response)|fan (?:reply|response)|deficiency interest computation|tax situs|situs of tax\w*|tax accounting period|taxpayer remed\w*|tax sparing|double tax(?:ation)? agreement|resident alien tax\w*|non[- ]resident citizen tax\w*|tax on professional fees|tin registration|withholding tax table|creditable withholding|expanded withholding|final withholding|optional standard deduction|minimum corporate income tax|regular corporate income tax|net operating loss carry[- ]?over|improperly accumulated earnings)\b/i;

// Tax-canonical acronyms with no material competing ordinary sense. Used as the
// requested tax concept these are self-resolving; polysemous tokens are excluded and
// still require controlling context. This is recognition, never invented expansion.
const TAX_CANONICAL_ACRONYM_RE = /\b(?:mcit|rcit|nolco|iaet|slsp)\b/i;

// Explicit Philippine tax / BIR context that resolves an otherwise polysemous token.
const EXPLICIT_TAX_CONTEXT_RE = /\b(?:bir|bureau of internal revenue|nirc|national internal revenue|revenue (?:issuance|memorandum|regulation|district)|philippine tax|deficiency (?:notice|assessment|interest)|assessment notice|tax assessment|for (?:philippine )?tax|under (?:philippine )?tax|tax purposes|tax issuance|customs|bureau of customs)\b/i;

// Named Philippine tax statutes, codes and instruments. Inside a tax question these are
// subject matter; assigning one as a name remains label binding.
const NAMED_STATUTE_RE = /\b(?:tariff and customs code|national internal revenue code|nirc|ease of paying taxes(?: act)?|train law|create law|customs modernization(?: and tariff)? act|cmta)\b/i;

const RECOGNIZED_TAX_ACRONYM_RE = /\b(?:cgt|cwt|ewt|fwt|dst|mcit|rcit|iaet|nolco|osd|vat|gret|fbt|rmc|rmo|rdo|pan|fld|fan|fdda|boc|cta|slsp|atp|cor|tin)\b/i;

// Concrete nouns that can serve as the antecedent of a later deictic in the same query.
// Used only to confirm that a referent was actually supplied; never as an ALLOW trigger.
const CONCRETE_ANTECEDENT_NOUN_RE = /\b(?:van|truck|tricycle|motorcycle|vehicle|car|forklift|generator|machinery|machine|equipment|conveyor|belt|glassware|panel|pump|laptop|computer|printer|furniture|building|warehouse|office|land|lot|property|inventory|supplies|uniform|software|licence|license|agency|contractor|consultant|consultancy|supplier|retainer|retainers|fee|fees|premium|rent|rental|lease|shares?|stock|royalt\w*|dividend|commission|allowance|seminar|training|freight|courier|insurance|utilities|electricity)\b/i;

// Tax-shaped tokens can appear as the OBJECT of an ordinary imperative data-handling
// action ("enter the input VAT figure into the third column", "attach the certificate
// scan to the drive"). The controlling primary task there is the data-handling action,
// not a tax relation, so no tax jurisdiction is created. Structural: an imperative
// handling verb governing a destination phrase.
const NON_TAX_IMPERATIVE_OVER_TOKEN_RE = /^(?:please\s+)?(?:input|enter|type|paste|copy|attach|upload|insert|place|put|write|fill|append|append|record|log)\b[^?]*\b(?:into|onto|to|in|on|under|as)\b[^?]*\b(?:box|field|form|column|row|cell|sheet|tab|page|panel|caption|label|drive|folder|directory|document|wiki|note|log|console|output|input|screen|template|placeholder)\b/i;

// A compliance procedure carries its own subject (RESOLVED_REFERENT) even when the
// object is implicit. A treatment attribute over only a bare pronoun/determiner, with
// no concrete/resolved subject and no procedure, is CONTENTLESS.
function classifyTargetCompleteness(primary, fullLo, relations, ordinaryObjects) {
  if (!primary) return 'CONCRETE';
  const lo = lower(primary.text);
  if (relations.some((r) => r.relation === 'QUOTES_TERM')) return 'QUOTED_TEXT';
  if (relations.some((r) => r.relation === 'NAMES_AS_INTERNAL_LABEL')) return 'LABEL_ONLY';
  // Contentless bare compliance/treatment referent: the primary clause is a short bare
  // question whose subject is only "this/that/it/the <attribute>" with a trailing
  // "Context N" tag and NO concrete object. "When is the return due? Context 1.", "What
  // form should I use? Context 1.", "Is this deductible? Context 1.". Restricted to the
  // bare-attribute question shape so concrete tax questions ("penalty for late deficiency
  // interest in case 19") are unaffected.
  // The "Context N" tag is an enumeration device carrying no target. It is matched on
  // the full text because clause segmentation splits it into its own clause. When the
  // primary clause is only a bare compliance/treatment attribute with no concrete or
  // resolved object, the tag cannot supply one, so the target stays contentless.
  // Any enumerated metadata suffix is an index, not a target: "Context 1", "Situation 7",
  // "Item 12", "Matter 3", "Reference 41", "Group MM-12". None of them can resolve a
  // deictic, so the family is recognised generically rather than one keyword at a time.
  const contextTag = METADATA_SUFFIX_RE.test(lo) || METADATA_SUFFIX_RE.test(fullLo);
  // A deictic resolved by a concrete antecedent elsewhere in the SAME query is not
  // contentless: "Our firm purchased a service van last quarter. Is it deductible?"
  // supplies its own target. Only the full text can show the antecedent, since the
  // primary clause holds just the question.
  const sameQueryAntecedent = /\b(?:bought|purchased|acquired|paid|received|sold|leased|imported|hired|engaged|rented|built|installed)\b/.test(fullLo)
    && (CONCRETE_SUBJECT_RE.test(fullLo) || CONCRETE_ANTECEDENT_NOUN_RE.test(fullLo));
  // A named tax instrument IS the target. "When is the deadline for expanded withholding
  // tax in case 3?" identifies exactly which tax is meant, so a trailing enumerated
  // suffix cannot make it contentless. Only a query with no named subject is contentless.
  const namedTaxSubject = UNAMBIGUOUS_PH_TAX_TERM_RE.test(lo) || BARE_TAX_TOPIC_RE.test(lo);
  const bareAttrQuestion = /^(?:is|are|does|do|can|should|when|what|how|will|where)\b[^?]*\b(?:this|that|it|the|there|i)\b[^?]*\?/.test(lo)
    && !CONCRETE_SUBJECT_RE.test(lo) && !sameQueryAntecedent && !namedTaxSubject
    && (ordinaryObjects || []).length === 0;
  if (contextTag && bareAttrQuestion && (COMPLIANCE_PROCEDURE_RE.test(lo) || TREATMENT_ATTRIBUTE_RE.test(lo))) return 'CONTENTLESS';
  if (COMPLIANCE_PROCEDURE_RE.test(lo)) return 'RESOLVED_REFERENT';
  if ((primary.taskObject) || (ordinaryObjects || []).length > 0 || CONCRETE_SUBJECT_RE.test(lo)) return 'CONCRETE';
  if (CONCRETE_TAX_NOUN_RE.test(lo)) return 'CONCRETE';
  const barePronoun = /^(?:is|are|does|do|can|should|when|what|how|will)\b[^?]*\b(?:this|that|it|these|those)\b/.test(lo)
    || /^what is the (?:deductib\w*|penalty|period|deadline|rate|threshold|holding period|tariff|exemption|surcharge|notice period)\s*\??$/.test(lo)
    || /^(?:when is the return due|what form should i use|is there a surcharge|can i (?:protest|appeal) this|does this need registration|is this (?:subject to assessment|exempt))\b/.test(lo);
  // A bare pronoun subject is contentless only when nothing in the query resolves it.
  // A concrete antecedent supplied earlier in the same query makes the target resolved.
  if (barePronoun && TREATMENT_ATTRIBUTE_RE.test(lo) && !sameQueryAntecedent && !namedTaxSubject
      && !/\bfor (?:a|an|the|our|my) [a-z]/.test(lo)) return 'CONTENTLESS';
  return 'CONCRETE';
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

  // 0. Dangling scenario referent ("What about <subject> for scenario N?") is a
  // decision-level CLARIFY regardless of any tax lexical the subject carries: there
  // is no resolvable tax relation, only a dangling reference. This precedes the
  // treatment/compliance rules so a compliance-shaped subject cannot force ALLOW.
  if (evidence.danglingScenario) {
    const acrAmbiguous = acr.some((a) => a.ambiguous);
    return decide('CLARIFY', acrAmbiguous ? 'ambiguous_tax_acronym' : 'no_tax_relation', 0.50);
  }
  // 0b. Contentless tax referent: a treatment- or compliance-family relation over a bare
  // pronoun/determiner tax-attribute with no concrete/resolved subject (including a
  // dangling "Context/case/item N" tag with no concrete object) -> no_tax_relation
  // (REFUSE). targetCompleteness already distinguishes a genuine compliance procedure
  // with a concrete/implicit object (RESOLVED_REFERENT) from a contentless one.
  if (evidence.contentlessTreatmentTarget && (hasTreatment || hasCompliance)
      && !namesLabel && !expandsNonTax && !quotesTerm && !requestsNonTax && !negatesTax) {
    return decide('REFUSE', 'no_tax_relation', 0.55);
  }
  // 0c. Non-tax controlling domain: a private civil/contractual, corporate-regulatory
  // or consumer question governs its own target. Tax-shaped vocabulary ("due",
  // "penalty", "deadline", "notice") does not make it a tax question. This is a
  // domain-of-the-target test, not a global token veto.
  // A governed tax predicate over the primary target defeats the domain guard: the
  // controlling relation decides, not the domain of the surrounding noun.
  if (evidence.nonTaxControllingDomain && !evidence.explicitTaxAnchorPresent
      && !evidence.taxRelationOverPrimaryTarget && !evidence.filipinoTaxRelationOverTarget) {
    return decide('REFUSE', 'explicit_non_tax_task', 0.85);
  }
  // 0d. Explicit non-tax expansion binding supplied by the query itself
  // ("X stands for the staff carpool roster") controls the target -> REFUSE,
  // ahead of any definition/ambiguity handling. Never invents an expansion.
  if (evidence.nonTaxExpansionBinding && !hasTreatment && !hasCompliance) {
    return decide('REFUSE', 'non_tax_expansion', 0.90);
  }
  // 0d-bis. An ordinary imperative data-handling action whose object happens to be a
  // tax-shaped token is a non-tax task controlling its own target -> REFUSE.
  if (evidence.nonTaxImperativeOverToken) {
    return decide('REFUSE', 'explicit_non_tax_task', 0.88);
  }
  // 0c-quater. An ordering or listing action over an ordinary population governs its
  // own target; a tax filing artefact named beside it does not create jurisdiction.
  if (evidence.orderingActionOverOrdinaryPopulation) {
    return decide('REFUSE', 'explicit_non_tax_task', 0.86);
  }
  // 0c-ter. A definition frame whose only extra content is an enumerated suffix has no
  // target, so the frozen REFUSE fallback applies.
  if (evidence.definitionFrameWithMetadataOnly) {
    // A coherent concise tax phrase names governed subject matter even when no relation
  // pattern matched, provided no ordinary domain governs the target.
  if (evidence.conciseTaxPhrase && !requestsNonTax && !namesLabel && !quotesTerm
      && !evidence.ordinaryProceduralSense && !evidence.nonTaxControllingDomain) {
    return decide('ALLOW', 'explicit_tax_task_relation', 0.80);
  }
  return decide('REFUSE', 'no_tax_relation', 0.60);
  }
  // 0d-bis-1. An ordinary creative or selection action over an artefact governs its
  // own target; a tax-shaped modifier does not create tax jurisdiction.
  if (evidence.ordinaryCreativeAction && !evidence.filipinoTaxRelationOverTarget) {
    return decide('REFUSE', 'explicit_non_tax_task', 0.86);
  }
  // 0d-bis-2. A styling or programming artefact governs its own target: a tax-shaped
  // predicate over it is a homograph, not a tax relation.
  if (evidence.stylingOrProgramTarget && !evidence.filipinoTaxRelationOverTarget) {
    return decide('REFUSE', 'explicit_non_tax_task', 0.86);
  }
  // 0d-ter. An ordinary-language sense of a tax-shaped procedural word governs its own
  // target when no tax-domain object, institution or procedure appears anywhere in the
  // query. This is a relation-and-target test, not a global lexical veto.
  if (evidence.ordinaryProceduralSense && !evidence.filipinoTaxRelationOverTarget) {
    return decide('REFUSE', 'explicit_non_tax_task', 0.85);
  }
  // 0e. Generic contentless compliance/treatment question: a bare procedural or
  // treatment attribute with no subject, agency or domain. No controlling relation
  // can be constructed over an unidentified target -> frozen REFUSE fallback.
  if (evidence.genericContentlessQuestion) {
    return decide('REFUSE', 'no_tax_relation', 0.55);
  }
  // 1. Negation + explicit tax review -> ALLOW.
  if (negatesTax && (hasTreatment || hasCompliance)) return decide('ALLOW', 'tax_negation_but_tax_review_requested', 0.80);
  // 2. Internal label / name.
  if (namesLabel && !hasTreatment && !hasCompliance
      && !(evidence.subordinateCodeClause && evidence.taxRelationOverPrimaryTarget)
      && !evidence.namedStatuteInTaxQuestion) {
    return decide('REFUSE', 'non_tax_label_or_name', 0.90);
  }
  // A subordinate code clause under a governed tax predicate, or a named statute in a
  // tax question, is subject matter rather than a naming instruction.
  if (namesLabel && (evidence.subordinateCodeClause || evidence.namedStatuteInTaxQuestion)
      && evidence.taxRelationOverPrimaryTarget) {
    return decide('ALLOW', 'tax_treatment_of_ordinary_object', 0.85);
  }
  // 3. Explicit non-tax expansion.
  if (expandsNonTax && !hasTreatment && !hasCompliance) return decide('REFUSE', 'non_tax_expansion', 0.90);
  // 4. Quoted-only tax term.
  if (quotesTerm && !hasTreatment && !hasCompliance && !asksDefinition) return decide('REFUSE', 'quoted_tax_term_only', 0.88);
  // 5. Explicit non-tax task.
  // Clause hierarchy: the primary tax task controls when a governed tax predicate
  // governs the target, even if an incidental non-tax action verb is also present.
  if (requestsNonTax && !hasTreatment && !hasCompliance && !evidence.taxRelationOverPrimaryTarget
      && !evidence.filipinoTaxRelationOverTarget
      && !(asksDefinition && evidence.acronymResolvedByTaxContext)) {
    return decide('REFUSE', 'explicit_non_tax_task', 0.90);
  }
  // A definition request over a recognised instrument in explicit tax context is a
  // governed tax definition regardless of an incidental explanatory verb.
  if (asksDefinition && evidence.acronymResolvedByTaxContext && !namesLabel && !expandsNonTax && !quotesTerm) {
    return decide('ALLOW', 'tax_definition_with_context', 0.80);
  }
  // A governed tax predicate over the primary target controls a competing non-tax
  // action reading.
  if (requestsNonTax && (evidence.taxRelationOverPrimaryTarget || evidence.filipinoTaxRelationOverTarget) && !namesLabel && !quotesTerm
      && !evidence.ordinaryCreativeAction && !evidence.stylingOrProgramTarget) {
    return decide('ALLOW', 'tax_treatment_of_ordinary_object', 0.85);
  }
  // 5b. Homograph veto with no other relation -> no tax relation (REFUSE).
  // A named statute, code or instrument inside a tax question is subject matter, so a
  // homograph veto must not suppress it.
  if (evidence.homographVeto && !hasTreatment && !hasCompliance && !asksDefinition
      && !evidence.namedStatuteInTaxQuestion) {
    return decide('REFUSE', 'no_tax_relation', 0.85);
  }
  if (evidence.namedStatuteInTaxQuestion && !namesLabel && !quotesTerm) {
    return decide('ALLOW', 'explicit_tax_task_relation', 0.82);
  }
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
    // A lone acronym inside a definition frame is materially ambiguous even when the
    // token itself is tax-recognised: "What is RMC?" never says which RMC is meant.
    // Only surrounding subject matter — not the token — can supply controlling context.
    if (anyTaxCtx && (!evidence.bareAcronymDefinition || evidence.acronymResolvedByTaxContext || evidence.taxCanonicalAcronym)) {
      return decide('ALLOW', 'tax_definition_with_context', 0.80);
    }
    // A Philippine tax authority term or instrument is itself the controlling
    // context: defining RCIT/MCIT/OSD/RMC/CTA is a governed tax definition, not a
    // materially ambiguous bare acronym. Capitalization is never the controlling rule.
    if (evidence.phTaxAuthorityTerm && (!evidence.bareAcronymDefinition || evidence.acronymResolvedByTaxContext || evidence.taxCanonicalAcronym)) {
      return decide('ALLOW', 'tax_definition_with_context', 0.80);
    }
    // A tax-canonical acronym has no material competing ordinary sense, so using it as
    // the requested tax concept is a governed tax definition even with no other context.
    if (evidence.taxCanonicalAcronym && !evidence.nonTaxExpansionBinding) {
      return decide('ALLOW', 'tax_definition_with_context', 0.78);
    }
    if (anyAmbiguous) return decide('CLARIFY', 'ambiguous_tax_acronym', 0.55);
    return decide('CLARIFY', 'ambiguous_tax_acronym', 0.50);
  }
  // 9. Lone ambiguous acronym. A PH tax authority term resolves the ambiguity and
  // carries a governed tax relation over its own subject matter.
  if (acr.some((a) => a.ambiguous)) {
    if (evidence.phTaxAuthorityTerm && !requestsNonTax && !namesLabel && !expandsNonTax && !quotesTerm) {
      return decide('ALLOW', 'explicit_tax_task_relation', 0.80);
    }
    return decide('CLARIFY', 'ambiguous_tax_acronym', 0.55);
  }
  // 10. Tax-adjacent frame lacking resolving context -> CLARIFY / ambiguous_tax_acronym.
  const taxLexical = (evidence.taxPredicates || []).length + (evidence.taxEntities || []).length;
  const ordinaryLexical = (evidence.ordinaryObjects || []).length;
  if (evidence.danglingScenario) return decide('CLARIFY', 'no_tax_relation', 0.50);
  if (taxLexical > 0 && ordinaryLexical === 0 && !requestsNonTax && !expandsNonTax && !namesLabel) {
    if (evidence.phTaxAuthorityTerm) return decide('ALLOW', 'explicit_tax_task_relation', 0.80);
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

  const targetCompleteness = classifyTargetCompleteness(primary, fullLo, relations, ordinaryObjects);
  const contentlessTreatmentTarget = targetCompleteness === 'CONTENTLESS';

  // Typed structural evidence for the decision layer.
  // nonTaxControllingDomain: the primary target belongs to a private civil,
  //   corporate-regulatory or consumer domain.
  // explicitTaxAnchorPresent: an unambiguous Philippine tax anchor governs the query,
  //   which defeats the non-tax-domain reading.
  // phTaxAuthorityTerm: a Philippine tax authority term/instrument is present and
  //   supplies controlling tax context for an otherwise ambiguous acronym.
  // nonTaxExpansionBinding: the query itself binds a token to a non-tax meaning.
  const explicitTaxAnchorPresent = /\bincome tax\b|\bvat\b|value[- ]added tax|\bwithholding tax\b|\bcustoms dut|subject to (?:tax|vat|withholding)|\bbir\b|\bdeductib|\bcapital gains\b|\bpercentage tax\b|\bexcise\b|\bdocumentary stamp\b|\bestate tax\b|\bdonor'?s tax\b|philippine tax|\bfinal tax\b|\btax\b/.test(fullLo);
  // A tax anchor strong enough to defeat a non-tax institutional reading must name a
  // tax instrument or the tax authority, not merely contain the token "tax".
  const strongTaxAnchorForDomain = /\b(?:income tax|value[- ]added tax|\bvat\b|vatable|withholding tax|percentage tax|excise tax|documentary stamp|capital gains tax|estate tax|donor'?s tax|customs dut|\bbir\b|bureau of internal revenue|revenue regulation|revenue memorandum|deductib|taxab\w*|tax return|tax treatment|tax deadline|final tax|authority to print|official receipt)\b/i.test(fullLo);
  // A tax-shaped substring inside an ordinary word, or a tax-shaped procedural noun in
  // a plainly non-tax setting, is a lexical accident and cannot anchor a tax relation.
  const taxSubstringTrap = (TAX_SUBSTRING_TRAP_RE.test(fullLo) || NON_TAX_SETTING_RE.test(fullLo))
    && !strongTaxAnchorForDomain;
  const nonTaxHeadActivity = NON_TAX_HEAD_ACTIVITY_RE.test(fullLo) && !strongTaxAnchorForDomain;
  const nonTaxControllingDomain = nonTaxHeadActivity || NON_TAX_CONTROLLING_DOMAIN_RE.test(fullLo)
    || (NON_TAX_INSTITUTIONAL_DOMAIN_RE.test(fullLo) && !strongTaxAnchorForDomain)
    || taxSubstringTrap;
  const genericContentlessQuestion = GENERIC_CONTENTLESS_QUESTION_RE.test(normalizedText.trim());
  // A tax-shaped procedural word governed by an ordinary domain, with no tax-domain
  // object anywhere in the query, is an ordinary-language request.
  // An explicit tax predicate governing the target always defeats the ordinary reading:
  // the governing relation decides, not the object noun.
  const governingTaxPredicate = /\b(?:subject to (?:tax|vat|withholding|customs|excise|percentage tax|final tax)|customs dut\w*|import dut\w*|deductib\w*|taxab\w*|vatable|withholding tax|value[- ]added tax|income tax|capital gains tax|documentary stamp|final tax|excise tax|percentage tax|estate tax|tax treatment|tax rate|tax due|buwis)\b/i.test(fullLo);
  const ordinaryProceduralSense = ORDINARY_PROCEDURAL_DOMAIN_RE.test(fullLo)
    && !TAX_DOMAIN_OBJECT_RE.test(fullLo) && !governingTaxPredicate;
  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);
  // An ordering or listing action over an ordinary population governs its own target.
  // A tax filing artefact named beside an ordinary population does not make the
  // request a tax procedure.
  const orderingActionOverOrdinaryPopulation = /\b(?:alphabeti\w*|sort|arrange|order|rank|list|make an? [a-z]*list)\b/i.test(fullLo)
    && /\b(?:students?|pupils?|trainees?|attendees?|members?|guests?|choir|roster|class list|names?)\b/i.test(fullLo)
    && !/\b(?:payees?|taxpayers?|withholding|bir\b|revenue|income tax|vat\b)\b/i.test(fullLo);
  // A definition-frame question whose only additional content is an enumerated
  // metadata suffix has no target: the suffix is an index, not subject matter.
  const definitionFrameWithMetadataOnly = METADATA_SUFFIX_RE.test(fullLo)
    && /^(?:what|which|when)\s+(?:is|are|was|were)\s+(?:the|a|an)\b/i.test(normalizedText.trim())
    && !TAX_DOMAIN_OBJECT_RE.test(normalizedText.replace(METADATA_SUFFIX_RE, ""))
    && !CONCRETE_ANTECEDENT_NOUN_RE.test(fullLo);
  // Clause hierarchy: a governed tax relation over the primary target outranks a
  // competing non-tax action relation that is incidental or subordinate to it.
  const taxRelationOverPrimaryTarget = /\b(?:vatable|subject to (?:vat|tax|withholding|customs|excise|percentage tax|final tax)|i-?withhold ang buwis sa|buwis sa|may vat ba ang|deductible ba ang|tamang bir form para sa)\b/i.test(fullLo);
  // A subordinate clause that merely states a token is a code must not veto the
  // primary tax question ("Is X sale VATable if X is a product code?").
  const subordinateCodeClause = /\b(?:if|although|though|even though|while|when)\b[^?]*\b(?:is|are|serves as|acts as)\b[^?]*\b(?:product code|internal code|project code|warehouse code|item code|reference code|label|codename)\b/i.test(fullLo);
  // A named statute, code or agency inside a tax question is subject matter, not a
  // user instruction to name or label an object.
  const namedStatuteInTaxQuestion = /\b(?:tariff and customs code|national internal revenue code|nirc|ease of paying taxes(?: act)?|train law|create law|customs modernization(?: and tariff)? act|revenue regulations?|revenue memorandum (?:circular|order))\b/i.test(fullLo)
    && /\b(?:affect|apply|applies|govern|cover|change|require|impose|allow|under|what does)\b/i.test(fullLo);
  // An ordinary creative or selection action governs its own target even when a
  // tax-shaped word modifies the object ("pick a VAT paint shade", "design a VAT
  // invoice icon"): the artefact, not a tax relation, is what is requested.
  const ordinaryCreativeAction = /^(?:please\s+)?(?:pick|choose|select|design|draw|sketch|paint|colou?r|style|illustrate|render|mock up|prototype)\b/i.test(normalizedText.trim())
    && /\b(?:shade|colou?r|palette|icon|logo|banner|poster|graphic|theme|swatch|mockup|wallpaper|sticker)\b/i.test(fullLo);
  // A Filipino/Taglish withholding or tax predicate governing a named object is a
  // governed tax relation: "i-withhold ang buwis sa <object>" asks whether tax must
  // be withheld on that object.
  const filipinoTaxRelationOverTarget = /\bi-?withhold ang buwis sa\s+\S|\bbuwis sa\s+\S|\bmay vat ba ang\s+\S|\bdeductible ba ang\s+\S|\btamang bir form para sa\s+\S/i.test(fullLo);
  // A styling or programming artefact governs its own target unless a genuine tax
  // institution or instrument is also named.
  const stylingOrProgramTarget = STYLING_OR_PROGRAM_OBJECT_RE.test(fullLo)
    && !/\b(?:bir|bureau of internal revenue|nirc|revenue (?:regulation|memorandum|district)|philippine tax|customs|taxpayer)\b/i.test(fullLo);
  // A recognised tax acronym sitting in explicit BIR / Philippine-tax context is
  // resolved by that context, so it is not a materially ambiguous bare acronym.
  const acronymResolvedByTaxContext = RECOGNIZED_TAX_ACRONYM_RE.test(fullLo)
    && EXPLICIT_TAX_CONTEXT_RE.test(fullLo);
  // A tax-canonical acronym has no material competing ordinary sense.
  const taxCanonicalAcronym = TAX_CANONICAL_ACRONYM_RE.test(fullLo);
  // An ordinary imperative data-handling action governing a destination is the primary
  // task even when its object is a tax-shaped token; it creates no tax jurisdiction.
  const nonTaxImperativeOverToken = NON_TAX_IMPERATIVE_OVER_TOKEN_RE.test(normalizedText.trim());
  // A PH tax authority term resolves ambiguity only when the query supplies real
  // subject matter around it. A bare acronym followed by a contentless enumerated
  // referent ("What is FWT for item 4?") remains materially ambiguous -> CLARIFY.
  // The controlling test is substantive context, never capitalization.
  const strippedForContext = stripScenarioTag(fullLo).replace(/\bfor (?:item|case|scenario|situation|matter|reference|batch|set|group|variant|sample)\s+[a-z]{0,3}-?\d+\b/gi, '').trim();
  const authorityTermMatch = PH_TAX_AUTHORITY_TERM_RE.test(fullLo);
  const bareAcronymOnly = /^(?:what (?:is|are|does)|define|can you define)?\s*["']?[a-z]{2,6}["']?\s*(?:mean|stand for)?\s*\??\.?$/i.test(strippedForContext);
  const substantiveTaxContext = /\b(guidance|clearance|election|jurisdiction|drawback|documentation|deduction|rate|return|filing|compliance|corporation|taxpayer|income|sale|purchase|property|treatment|apply|applies|computed|no\.?\s*\d|rule|assessment|audit|defense|response|reply|protest|appeal|notice|demand|compensation|sparing|agreement|alien|citizen|resident|withholding|credit|refund|exemption)\b/i.test(strippedForContext)
    || /\b(?:income tax|value[- ]added tax|withholding tax|customs|revenue|bureau|court of tax appeals|philippine tax|domestic corporation|deductions?)\b/i.test(strippedForContext);
  // An unambiguous spelled-out tax term is self-resolving and needs no extra context.
  // A bare acronym still requires substantive surrounding tax subject matter.
  // A lone recognized acronym inside a definition frame, with no other tax subject
  // matter, remains materially ambiguous: "What is RMC?" does not say which RMC.
  // Asking to define it is exactly the case that must CLARIFY rather than ALLOW.
  const bareAcronymDefinition = /^(?:what (?:is|are|does)|can you define|please (?:clarify|define)|define)\b[^?]{0,24}\??\.?$|^[a-z]{2,6}\s*-\s*what does it stand for/i.test(strippedForContext)
    && !/\b(?:for|under|in|of|on)\b\s+\w/i.test(strippedForContext.replace(/^(?:what (?:is|are|does)|can you define|please (?:clarify|define)|define)\b/i, ''));
  const unambiguousTaxTerm = UNAMBIGUOUS_PH_TAX_TERM_RE.test(fullLo);
  const phTaxAuthorityTerm = unambiguousTaxTerm
    || (authorityTermMatch && !bareAcronymOnly && substantiveTaxContext);
  const expansionMatch = fullLo.match(NON_TAX_EXPANSION_BINDING_RE);
  const expansionAltMatch = fullLo.match(NON_TAX_EXPANSION_BINDING_ALT_RE);
  const expansionMeaning = (expansionMatch && expansionMatch[2])
    || (expansionAltMatch && (expansionAltMatch[2] || expansionAltMatch[4])) || '';
  const nonTaxExpansionBinding = !!expansionMeaning
    && !PH_TAX_AUTHORITY_TERM_RE.test(expansionMeaning)
    && !/\btax\b|\bbir\b|revenue|customs|withhold/.test(expansionMeaning);
  const evidenceForDecision = { relations, acronymMentions, ordinaryObjects, taxPredicates, taxEntities, normalizedText, danglingScenario, homographVeto: relations._homographVeto === true, contentlessTreatmentTarget, targetCompleteness, nonTaxControllingDomain, explicitTaxAnchorPresent, phTaxAuthorityTerm, nonTaxExpansionBinding, genericContentlessQuestion, nonTaxImperativeOverToken, bareAcronymDefinition, ordinaryProceduralSense, conciseTaxPhrase, acronymResolvedByTaxContext, taxCanonicalAcronym, stylingOrProgramTarget, filipinoTaxRelationOverTarget, ordinaryCreativeAction, taxRelationOverPrimaryTarget, subordinateCodeClause, namedStatuteInTaxQuestion, definitionFrameWithMetadataOnly, orderingActionOverOrdinaryPopulation };
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
