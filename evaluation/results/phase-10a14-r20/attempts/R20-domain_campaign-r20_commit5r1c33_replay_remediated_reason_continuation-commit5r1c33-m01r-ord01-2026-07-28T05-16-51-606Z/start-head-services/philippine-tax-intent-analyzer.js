// ─────────────────────────────────────────────────────────────────────────────
// PHASE-10A14-R20 — Deterministic clause-level Philippine-tax intent analyzer.
//
// Standalone scaffold. NOT integrated into production routing (that is COMMIT 5).
// Pure, synchronous, deterministic: no I/O, no network, no model, no date/random,
// no environment dependency. Given identical input it returns byte-identical
// evidence and serialization.
//
// The analyzer models tax intent at the CLAUSE level via an explicit
// object-relation model: it identifies the primary task clause, its verb and
// target, links tax predicates to that target through typed relations, and
// derives a decision + a single closed-set reason code from a terminating
// precedence walk. A bare "strong tax signal" is supporting evidence only and is
// never the controlling final reason code.
//
// See the frozen COMMIT 1 contracts:
//   evaluation/results/phase-10a14-r20/CLAUSE_LEVEL_INTENT_SCHEMA.md
//   evaluation/results/phase-10a14-r20/RELATION_AND_PRECEDENCE_SPEC.md
// ─────────────────────────────────────────────────────────────────────────────

/** Closed set of final decisions. @type {readonly string[]} */
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

// ── Bounded deterministic dictionaries (lexical evidence only) ───────────────
// These are lexical detectors. A lexical hit is EVIDENCE, never by itself an
// authorization. The decision comes from relations + precedence.

const TAX_PREDICATE_TERMS = Object.freeze([
  'tax treatment', 'subject to tax', 'subject to vat', 'taxable', 'deductible',
  'deductibility', 'input vat', 'output vat', 'withholding', 'remittance',
  'transfer pricing', 'income tax', 'percentage tax', 'customs duty', 'excise',
  'documentary stamp', 'capital gains', 'estate tax', 'donor', 'fringe benefit',
  'gross receipts', 'vat treatment', 'vat',
]);

const TAX_PROCEDURE_TERMS = Object.freeze([
  'filing', 'file a return', 'return', 'registration', 'remittance',
  'compliance', 'assessment', 'audit', 'refund',
]);

// Tax entities/authorities. Multi-word / reference patterns handled separately.
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
  'cooling fan', 'cooking pan', 'website design', 'music channel',
  'software company', 'school raffle', 'charity fun run', 'product code',
  'database field', 'board game', 'board-game', 'marketing slogan', 'lesson',
  'device', 'cooling device', 'font', 'color', 'colour', 'palette', 'css',
  'file', 'folder', 'chord', 'band', 'fan speed', 'basketball', 'game score',
  'homework', 'penalty kick', 'delivery app', 'insurance policy', 'railroad',
  'timetable', 'pull request', 'sermon', 'arraignment', 'recipe', 'song',
  'insurance policy', 'insurance', 'delivery app', 'game score',
]);

// Non-tax homograph contexts: when one of these ordinary contexts is present, a
// tax-shaped predicate token (e.g. "deductible", "surcharge", "penalty") is being
// used in its ordinary sense, not as a Philippine-tax question.
const NON_TAX_HOMOGRAPH_CONTEXTS = Object.freeze([
  'insurance policy', 'insurance', 'delivery app', 'basketball', 'game score',
  'homework', 'penalty kick', 'railroad', 'pull request', 'board game', 'board-game',
]);

// Non-tax action verbs (imperative task heads).
const NON_TAX_VERBS = Object.freeze([
  'rename', 'translate', 'delete', 'draw', 'paint', 'compile', 'install',
  'download', 'sort', 'cook', 'play', 'sing', 'design', 'render', 'print',
  'change', 'debug', 'prepare', 'improve', 'buy', 'organize', 'organise',
  'fix', 'build', 'write', 'update', 'configure', 'quote',
]);

// Interrogative / imperative leading tokens for speech-act + verb detection.
const INTERROGATIVES = Object.freeze(['how', 'what', 'when', 'where', 'which', 'who', 'why', 'is', 'are', 'do', 'does', 'can', 'should', 'may', 'will']);

// English + Filipino/Taglish coordinating/contrasting connectors for segmentation.
const CONNECTORS = Object.freeze(['however', 'although', 'but', 'and', 'pero', 'ngunit', 'kahit', 'at']);

// Known non-tax acronym expansions must be EXPLICITLY present in the text; the
// analyzer never invents an expansion. This maps a token to a regex that detects
// an explicit non-tax expansion the USER supplied.
const EXPLICIT_NON_TAX_EXPANSION_PATTERNS = Object.freeze([
  { token: 'pan', re: /\bpan\b[^.?!]*\b(personal area network)\b/i, expansion: 'personal area network' },
  { token: 'rmc', re: /\brmc\b[^.?!]*\b(radio music channel)\b/i, expansion: 'radio music channel' },
  { token: 'fan', re: /\bfan\b[^.?!]*\b(cooling (?:device|fan))\b/i, expansion: 'cooling device' },
]);

// Tax-ambiguous acronyms (could be tax or non-tax; need clarification when bare).
const AMBIGUOUS_TAX_ACRONYMS = Object.freeze(['pan', 'fan', 'rr', 'fld', 'rmc']);

// ── Small pure helpers ───────────────────────────────────────────────────────

function toStringSafe(x) {
  if (x === null || x === undefined) return '';
  return String(x);
}

function lower(s) { return s.toLowerCase(); }

function includesAny(loText, terms) {
  const hits = [];
  for (const t of terms) if (loText.includes(t)) hits.push(t);
  return hits;
}

function matchAny(text, patterns) {
  const hits = [];
  for (const re of patterns) { const m = text.match(re); if (m) hits.push(m[0]); }
  return hits;
}

// ── Normalization ────────────────────────────────────────────────────────────

/**
 * Deterministically normalize input for tax-boundary analysis.
 * - safe string coercion
 * - Unicode NFC
 * - CRLF/CR -> LF line endings
 * - trim ends
 * - collapse runs of non-semantic whitespace to a single space (evidence casing preserved)
 * Never invents text; never expands an acronym; locale/timezone independent.
 * @param {*} input
 * @returns {string}
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
 * Segment normalized text into deterministic, quote-aware clauses.
 * Splits on terminal punctuation (?.;), task-introducing colons, and comma +
 * coordinating/contrasting connector. Never splits inside a quotation or
 * parentheses. Every non-empty input yields >= 1 clause. IDs are positional
 * ("c01", "c02", ...).
 * @param {string} normalizedText
 * @returns {Array<{clauseId:string,text:string}>}
 */
export function segmentTaxBoundaryClauses(normalizedText) {
  const text = toStringSafe(normalizedText);
  if (!text) return [];

  const spans = [];
  let buf = '';
  let quote = null; // active quote char
  let depth = 0;    // parenthesis depth

  const pushBuf = () => {
    const t = buf.trim();
    if (t) spans.push(t);
    buf = '';
  };

  const isQuoteChar = (ch) => ch === '"' || ch === '\'' || ch === '“' || ch === '”' || ch === '‘' || ch === '’';
  const openMatch = { '“': '”', '‘': '’' };

  const words = text.split(' ');

  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (quote) {
        buf += ch;
        if (ch === quote || (openMatch[quote] && ch === openMatch[quote])) quote = null;
        continue;
      }
      if (isQuoteChar(ch)) { quote = ch; buf += ch; continue; }
      if (ch === '(') { depth++; buf += ch; continue; }
      if (ch === ')') { if (depth > 0) depth--; buf += ch; continue; }
      buf += ch;
      if (depth === 0 && (ch === '?' || ch === '.' || ch === ';' || ch === ':')) {
        pushBuf();
      }
    }
    // word boundary: consider comma+connector split
    if (!quote && depth === 0) {
      const next = words[wi + 1] ? lower(words[wi + 1].replace(/[^a-z]/gi, '')) : '';
      if (/,$/.test(buf.trim()) && CONNECTORS.includes(next)) {
        pushBuf();
        continue;
      }
    }
    if (wi < words.length - 1) buf += ' ';
  }
  pushBuf();

  if (spans.length === 0) spans.push(text.trim());

  return spans.map((t, idx) => ({ clauseId: `c${String(idx + 1).padStart(2, '0')}`, text: t }));
}

// ── Per-clause analysis ──────────────────────────────────────────────────────

function detectTaskVerb(loClause) {
  const lead = loClause.match(/^([a-z']+)/);
  if (!lead) return null;
  const w = lead[1];
  if (INTERROGATIVES.includes(w)) return w;
  if (NON_TAX_VERBS.includes(w)) return w;
  return null;
}

function detectSpeechAct(loClause, definitionIntent) {
  if (definitionIntent) return 'define';
  if (/^(how|what|when|where|which|who|why|is|are|do|does|can|should|may|will)\b/.test(loClause) || loClause.includes('?')) return 'ask';
  const firstWord = (loClause.match(/^([a-z']+)/) || [])[1];
  if (firstWord && NON_TAX_VERBS.includes(firstWord)) return 'request';
  if (/\b(is|are|means|equals)\b/.test(loClause)) return 'assert';
  return 'other';
}

function detectDefinitionIntent(loClause) {
  // Definition intent is a request for the MEANING of a term, e.g. "what does X
  // mean", "define X", "what is <ACRONYM>". "what is the VAT treatment of ..." is
  // NOT a definition request — it asks for tax treatment. Restrict accordingly.
  if (/\b(what does|define|meaning of|stand for)\b/.test(loClause)) return true;
  if (/\bwhat is\b/.test(loClause)) {
    // only a definition if it targets a bare acronym/term, not a "<tax> treatment/
    // of/for" construction.
    if (/\bwhat is\b\s+(the\s+)?[a-z]*\s*(treatment|deductib|filing|return|vat|withholding|customs)/.test(loClause)) return false;
    if (/\bwhat is\s+["'“]?[a-z]{2,5}["'”]?\s*\??$/.test(loClause)) return true;
    return false;
  }
  return false;
}

function detectTaskObject(clauseText) {
  const lo = lower(clauseText);
  const ord = includesAny(lo, ORDINARY_OBJECT_TERMS);
  if (ord.length) return ord[0];
  // an acronym token used as object
  const ac = lo.match(/\b(pan|fan|rr|rmc|fld|mcit|slsp|nolco|ewt|fwt|vat|bir)\b/);
  if (ac) return ac[1];
  return null;
}

function analyzeClause(clause, index, total) {
  const text = clause.text;
  const lo = lower(text);
  const definitionIntent = detectDefinitionIntent(lo);
  const taxSignals = [
    ...includesAny(lo, TAX_PREDICATE_TERMS),
    ...includesAny(lo, TAX_ENTITY_TERMS),
    ...matchAny(text, TAX_REFERENCE_PATTERNS),
  ];
  const nonTaxSignals = includesAny(lo, ORDINARY_OBJECT_TERMS);
  const firstWord = (lo.match(/^([a-z']+)/) || [])[1] || '';
  const quotedOnly = /^["'“‘]/.test(text.trim()) && !/\?$/.test(text.trim());
  const explicitNegation = /\b(do not|don't|not|no|never|without)\b/.test(lo);

  // Role: the primary_task role is assigned later by the selector. Provisional here.
  return {
    clauseId: clause.clauseId,
    text,
    role: 'context',
    taskVerb: detectTaskVerb(lo),
    taskObject: detectTaskObject(text),
    taxSignals: Object.freeze([...new Set(taxSignals)]),
    nonTaxSignals: Object.freeze([...new Set(nonTaxSignals)]),
    definitionIntent,
    quotedOrMentionedOnly: quotedOnly,
    explicitNegation,
    _firstWord: firstWord,
  };
}

// Select the primary task clause deterministically: prefer an interrogative or
// imperative clause; among candidates prefer the one whose task structure (verb
// + object) is most complete; tie-break by earliest position. The task structure
// controls — NOT the strongest tax token.
function selectPrimaryClause(clauses) {
  if (clauses.length === 0) return null;
  const scored = clauses.map((c, i) => {
    let score = 0;
    if (c.taskVerb) score += 2;
    if (c.taskObject) score += 1;
    if (INTERROGATIVES.includes(c._firstWord)) score += 2;
    if (NON_TAX_VERBS.includes(c._firstWord)) score += 2;
    if (c.definitionIntent) score += 1;
    // prefer non-quoted clauses as the task
    if (c.quotedOrMentionedOnly) score -= 2;
    return { i, score };
  });
  let best = scored[0];
  for (const s of scored) if (s.score > best.score) best = s;
  return clauses[best.i].clauseId;
}

// ── Relation construction ────────────────────────────────────────────────────

function buildRelations(clauses, primaryId, acronymMentions) {
  const relations = [];
  const primary = clauses.find((c) => c.clauseId === primaryId);
  if (!primary) return relations;
  const lo = lower(primary.text);
  const target = primary.taskObject;
  const span = primary.text;

  const add = (relation, source, tgt) => {
    if (!TAX_RELATION_TYPES.includes(relation)) return;
    relations.push({ source, relation, target: tgt, clauseId: primaryId, evidenceSpan: span });
  };

  const hasTaxPredicate = primary.taxSignals.length > 0;
  const isNonTaxVerb = NON_TAX_VERBS.includes(primary.taskVerb) && primary.taskVerb !== 'quote';

  // Negation of tax relevance across clauses: an explicit statement that the
  // matter is/‑may‑be non-tax, or a directive not to discuss tax.
  for (const c of clauses) {
    const clo = lower(c.text);
    if (/\b(do not|don't)\b[^.?!]*\btax\b/.test(clo)
      || /\bnot?\b[^.?!]*\btax\b[^.?!]*(discuss|talk|mention)/.test(clo)
      || /\bnon-?tax\b/.test(clo)
      || /\bmay be non-?tax\b/.test(clo)) {
      add('NEGATES_TAX_RELEVANCE', 'task', 'tax');
    }
  }

  // Quotation-only tax term. A "quote/print/repeat the words ..." task treats the
  // tax term as mentioned text, not as a tax question — regardless of quote marks.
  const quoted = clauses.filter((c) => c.quotedOrMentionedOnly);
  for (const q of quoted) {
    if (lower(q.text).match(/tax|vat|withholding|transfer pricing/)) {
      relations.push({ source: 'task', relation: 'QUOTES_TERM', target: q.text.replace(/^["'“‘]|["'”’]$/g, ''), clauseId: q.clauseId, evidenceSpan: q.text });
    }
  }
  if (/\b(quote|print|repeat|spell)\b[^.?!]*(["'“][^"'”]*["'”]|\btransfer pricing\b|\bwithholding(?:\s+tax)?\b|\bvat\b|\btax\b)/.test(lo)) {
    add('QUOTES_TERM', 'task', target || 'quoted term');
  }

  // Explicit non-tax expansion (user-supplied) — never invented.
  for (const a of acronymMentions) {
    if (a.explicitExpansionProvided && a.expansionIsNonTax) {
      relations.push({ source: a.token, relation: 'EXPANDS_AS_NON_TAX', target: a.expansion, clauseId: a.clauseId, evidenceSpan: a.evidenceSpan });
    }
  }

  // Internal label / name: "use X as the product code / database field label".
  const labelMatch = primary.text.match(/\buse\s+([A-Za-z0-9-]+)\s+as\s+(?:the\s+)?([a-z ]+?)(?:\.|$|label)/i);
  if (labelMatch) {
    add('NAMES_AS_INTERNAL_LABEL', labelMatch[1], labelMatch[2].trim() || 'label');
  }

  // Non-tax action on an ordinary object.
  if (isNonTaxVerb && target) {
    add('REQUESTS_NON_TAX_ACTION_ON', primary.taskVerb, target);
  }

  // Definition intent.
  if (primary.definitionIntent && !isNonTaxVerb) {
    add('ASKS_DEFINITION_OF', 'task', target || 'term');
  }

  // If the task is fundamentally a quotation or an internal-label assignment, the
  // tax-shaped token is not a tax question — suppress tax-treatment relations.
  const taskIsQuote = relations.some((r) => r.relation === 'QUOTES_TERM');
  const taskIsLabel = relations.some((r) => r.relation === 'NAMES_AS_INTERNAL_LABEL');

  // A tax-treatment relation requires a concrete target: either an explicit object
  // (ordinary or named subject) or an anchoring tax entity/reference. A bare
  // predicate with no target ("Is this deductible?") stays ambiguous -> CLARIFY.
  const explicitTaxAnchor = primary.taxSignals.some((s) => TAX_ENTITY_TERMS.includes(s))
    || TAX_REFERENCE_PATTERNS.some((re) => re.test(primary.text))
    || /\bincome tax\b|\bvat\b|\bcustoms duty\b|\bwithholding\b|subject to (?:tax|vat)|\bbir\b/.test(lo);
  // If the predicate sits in an explicit non-tax homograph context with NO explicit
  // tax anchor, it is an ordinary-sense use, not a Philippine-tax question.
  const nonTaxHomograph = NON_TAX_HOMOGRAPH_CONTEXTS.some((t) => lo.includes(t)) && !explicitTaxAnchor;
  const hasAnchor = (!!target || explicitTaxAnchor || /\bthe business\b|\bour\b|\bthis transaction\b|services\b/.test(lo)) && !nonTaxHomograph;

  // Tax-treatment family relations (only when NOT a non-tax action / quote / label task).
  if (hasTaxPredicate && !isNonTaxVerb && !primary.definitionIntent && !taskIsQuote && !taskIsLabel && hasAnchor) {
    if (/subject to vat|vat treatment|vat on|input vat|output vat/.test(lo)) add('ASKS_VAT_TREATMENT_OF', 'task', target || 'subject');
    else if (/deductib/.test(lo)) add('ASKS_DEDUCTIBILITY_OF', 'task', target || 'subject');
    else if (/withholding/.test(lo)) add('ASKS_WITHHOLDING_ON', 'task', target || 'subject');
    else if (/customs duty/.test(lo)) add('ASKS_CUSTOMS_DUTY_ON', 'task', target || 'subject');
    else if (/\bfiling\b|\breturn\b|\bregistration\b|\bcompliance\b|filing obligation|bir form/.test(lo)) add('ASKS_TAX_COMPLIANCE_FOR', 'task', target || 'transaction');
    else add('ASKS_TAX_TREATMENT_OF', 'task', target || 'subject');
  }

  return relations;
}

// ── Acronym / quotation / negation extraction ────────────────────────────────

function extractAcronymMentions(clauses) {
  const out = [];
  const fullTextLo = lower(clauses.map((c) => c.text).join(' '));
  for (const c of clauses) {
    const lo = lower(c.text);
    const m = c.text.match(/\b([A-Z]{2,5})\b/g);
    if (!m) continue;
    for (const tokenRaw of m) {
      const token = lower(tokenRaw);
      const hasTaxContext = includesAny(lo, TAX_ENTITY_TERMS.filter((t) => t !== token)).length > 0
        || /\bbir\b|\bassessment\b|\bincome tax\b|\btax\b/.test(lo);
      let explicitExpansionProvided = false;
      let expansion = null;
      let expansionIsNonTax = false;
      for (const p of EXPLICIT_NON_TAX_EXPANSION_PATTERNS) {
        if (p.token === token && p.re.test(clauses.map((x) => x.text).join(' '))) {
          explicitExpansionProvided = true; expansion = p.expansion; expansionIsNonTax = true;
        }
      }
      const definitionIntent = detectDefinitionIntent(lo);
      const ambiguous = AMBIGUOUS_TAX_ACRONYMS.includes(token) && !explicitExpansionProvided;
      out.push(Object.freeze({
        token, raw: tokenRaw, clauseId: c.clauseId, evidenceSpan: c.text,
        definitionIntent, hasTaxContext,
        explicitExpansionProvided, expansion, expansionIsNonTax,
        ambiguous,
      }));
    }
  }
  return out;
}

function extractQuotations(clauses) {
  const out = [];
  for (const c of clauses) {
    const re = /["'“‘]([^"'”’]{1,60})["'”’]/g;
    let m;
    while ((m = re.exec(c.text))) {
      out.push(Object.freeze({ text: m[1], clauseId: c.clauseId, evidenceSpan: m[0], quotedOrMentionedOnly: true }));
    }
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
    const m = c.text.match(/\buse\s+([A-Za-z0-9-]+)\s+as\s+(?:the\s+)?([a-z ]+)/i);
    if (m) out.push(Object.freeze({ name: m[1], usedAs: m[2].trim(), clauseId: c.clauseId, evidenceSpan: c.text }));
  }
  return out;
}

// ── Decision precedence (terminating, deterministic) ─────────────────────────

/**
 * Derive the final decision + single reason code from evidence via the frozen
 * precedence walk. Terminating and deterministic. `strong_tax_signal` is never a
 * final reason code.
 * @param {object} evidence
 * @returns {{decision:string, reasonCode:string, confidence:number}}
 */
export function decideTaxBoundaryFromEvidence(evidence) {
  const rels = evidence.relations || [];
  const has = (t) => rels.some((r) => r.relation === t);
  const acr = evidence.acronymMentions || [];
  const negatesTax = has('NEGATES_TAX_RELEVANCE');
  const requestsNonTax = has('REQUESTS_NON_TAX_ACTION_ON');
  const namesLabel = has('NAMES_AS_INTERNAL_LABEL');
  const expandsNonTax = has('EXPANDS_AS_NON_TAX');
  const quotesTerm = has('QUOTES_TERM');
  const asksDefinition = has('ASKS_DEFINITION_OF');
  const taxTreatmentRels = ['ASKS_TAX_TREATMENT_OF', 'ASKS_VAT_TREATMENT_OF', 'ASKS_DEDUCTIBILITY_OF', 'ASKS_WITHHOLDING_ON', 'ASKS_CUSTOMS_DUTY_ON'];
  const hasTaxTreatment = taxTreatmentRels.some(has);
  const hasCompliance = has('ASKS_TAX_COMPLIANCE_FOR');

  const decide = (decision, reasonCode, confidence) => ({ decision, reasonCode, confidence });

  // 7 (early): explicit tax review requested despite negation.
  if (negatesTax && (hasTaxTreatment || hasCompliance)) {
    return decide('ALLOW', 'tax_negation_but_tax_review_requested', 0.80);
  }
  // 5: internal label / name.
  if (namesLabel && !hasTaxTreatment && !hasCompliance) {
    return decide('REFUSE', 'non_tax_label_or_name', 0.90);
  }
  // 5: explicit non-tax expansion.
  if (expandsNonTax && !hasTaxTreatment && !hasCompliance) {
    return decide('REFUSE', 'non_tax_expansion', 0.90);
  }
  // 5: quoted-only tax term with no tax task.
  if (quotesTerm && !hasTaxTreatment && !hasCompliance && !asksDefinition) {
    return decide('REFUSE', 'quoted_tax_term_only', 0.88);
  }
  // 4: explicit non-tax task (non-tax action on an object), no tax relation.
  if (requestsNonTax && !hasTaxTreatment && !hasCompliance) {
    return decide('REFUSE', 'explicit_non_tax_task', 0.90);
  }
  // 3: tax treatment relations.
  if (hasTaxTreatment) {
    const ordinaryTarget = (evidence.ordinaryObjects || []).length > 0;
    if (ordinaryTarget) return decide('ALLOW', 'tax_treatment_of_ordinary_object', 0.90);
    return decide('ALLOW', 'explicit_tax_task_relation', 0.95);
  }
  // 2: tax compliance task.
  if (hasCompliance) {
    return decide('ALLOW', 'tax_compliance_task', 0.90);
  }
  // 6: acronym definition intent.
  if (asksDefinition) {
    const anyTaxCtx = acr.some((a) => a.hasTaxContext);
    const anyAmbiguous = acr.some((a) => a.ambiguous);
    if (anyTaxCtx && !anyAmbiguous) return decide('ALLOW', 'tax_definition_with_context', 0.80);
    if (anyTaxCtx && anyAmbiguous) return decide('ALLOW', 'tax_definition_with_context', 0.75);
    if (anyAmbiguous) return decide('CLARIFY', 'ambiguous_tax_acronym', 0.55);
    // definition of a clearly non-tax or unknown term
    return decide('CLARIFY', 'ambiguous_tax_acronym', 0.50);
  }
  // 8: ambiguity — a lone ambiguous acronym or a bare tax-adjacent frame.
  if (acr.some((a) => a.ambiguous)) {
    return decide('CLARIFY', 'ambiguous_tax_acronym', 0.55);
  }
  const taxLexical = (evidence.taxPredicates || []).length + (evidence.taxEntities || []).length;
  const ordinaryLexical = (evidence.ordinaryObjects || []).length;
  if (taxLexical > 0 && ordinaryLexical === 0 && !requestsNonTax) {
    // weak tax-adjacent frame with no explicit non-tax context -> clarify
    return decide('CLARIFY', 'ambiguous_tax_acronym', 0.50);
  }
  // 9: no tax relation.
  if (requestsNonTax || ordinaryLexical > 0) {
    return decide('REFUSE', 'explicit_non_tax_task', 0.85);
  }
  return decide('REFUSE', 'no_tax_relation', 0.60);
}

// ── Top-level analysis ───────────────────────────────────────────────────────

/**
 * Analyze Philippine-tax intent at the clause level. Pure & deterministic.
 * @param {*} input raw query text
 * @param {object} [options] reserved; must not affect determinism
 * @returns {object} a complete frozen-schema TaxBoundaryEvidence object
 */
export function analyzePhilippineTaxIntent(input, options = {}) {
  const normalizedText = normalizeTaxBoundaryText(input);
  const rawClauses = segmentTaxBoundaryClauses(normalizedText);
  const clauses = rawClauses.map((c, i) => analyzeClause(c, i, rawClauses.length));

  const primaryTaskClauseId = selectPrimaryClause(clauses);
  // Assign roles.
  for (const c of clauses) {
    c.role = c.clauseId === primaryTaskClauseId ? 'primary_task'
      : (c.quotedOrMentionedOnly ? 'quotation' : (/(^| )(is|are|means)( |$)/.test(lower(c.text)) ? 'assert' : 'context'));
  }

  const acronymMentions = extractAcronymMentions(clauses);
  const quotations = extractQuotations(clauses);
  const negations = extractNegations(clauses);
  const labelsAndNames = extractLabelsAndNames(clauses);

  const fullLo = lower(normalizedText);
  const taxPredicates = [...new Set(includesAny(fullLo, TAX_PREDICATE_TERMS))];
  const taxProcedures = [...new Set(includesAny(fullLo, TAX_PROCEDURE_TERMS))];
  const taxEntities = [...new Set([...includesAny(fullLo, TAX_ENTITY_TERMS), ...matchAny(normalizedText, TAX_REFERENCE_PATTERNS)])];
  const ordinaryObjects = [...new Set(includesAny(fullLo, ORDINARY_OBJECT_TERMS))];

  const primary = clauses.find((c) => c.clauseId === primaryTaskClauseId) || clauses[0] || null;
  const relations = buildRelations(clauses, primaryTaskClauseId, acronymMentions);

  const speechAct = primary ? detectSpeechAct(lower(primary.text), primary.definitionIntent) : 'other';
  const requestedAction = primary ? primary.taskVerb : null;
  const requestedTarget = primary ? primary.taskObject : null;

  const ambiguityFlags = [];
  if (acronymMentions.some((a) => a.ambiguous)) ambiguityFlags.push('ambiguous_acronym');
  if (taxPredicates.length && ordinaryObjects.length && !relations.length) ambiguityFlags.push('mixed_tax_and_ordinary');

  // Strip internal helper field before assembling evidence.
  const publicClauses = clauses.map((c) => Object.freeze({
    clauseId: c.clauseId, text: c.text, role: c.role,
    taskVerb: c.taskVerb, taskObject: c.taskObject,
    taxSignals: c.taxSignals, nonTaxSignals: c.nonTaxSignals,
    definitionIntent: c.definitionIntent,
    quotedOrMentionedOnly: c.quotedOrMentionedOnly,
    explicitNegation: c.explicitNegation,
  }));

  const evidenceForDecision = {
    relations, acronymMentions, ordinaryObjects, taxPredicates, taxEntities,
  };
  const { decision, reasonCode, confidence } = decideTaxBoundaryFromEvidence(evidenceForDecision);

  return Object.freeze({
    normalizedText,
    clauses: Object.freeze(publicClauses),
    primaryTaskClauseId,
    speechAct,
    requestedAction,
    requestedTarget,
    taxPredicates: Object.freeze(taxPredicates),
    taxProcedures: Object.freeze(taxProcedures),
    taxEntities: Object.freeze(taxEntities),
    ordinaryObjects: Object.freeze(ordinaryObjects),
    acronymMentions: Object.freeze(acronymMentions),
    quotations: Object.freeze(quotations),
    negations: Object.freeze(negations),
    labelsAndNames: Object.freeze(labelsAndNames),
    relations: Object.freeze(relations.map((r) => Object.freeze(r))),
    ambiguityFlags: Object.freeze(ambiguityFlags),
    decision,
    reasonCode,
    confidence,
  });
}

// ── Stable serialization ─────────────────────────────────────────────────────

const TOP_KEY_ORDER = Object.freeze([
  'normalizedText', 'clauses', 'primaryTaskClauseId', 'speechAct',
  'requestedAction', 'requestedTarget', 'taxPredicates', 'taxProcedures',
  'taxEntities', 'ordinaryObjects', 'acronymMentions', 'quotations',
  'negations', 'labelsAndNames', 'relations', 'ambiguityFlags',
  'decision', 'reasonCode', 'confidence',
]);
const CLAUSE_KEY_ORDER = Object.freeze([
  'clauseId', 'text', 'role', 'taskVerb', 'taskObject', 'taxSignals',
  'nonTaxSignals', 'definitionIntent', 'quotedOrMentionedOnly', 'explicitNegation',
]);
const RELATION_KEY_ORDER = Object.freeze(['source', 'relation', 'target', 'clauseId', 'evidenceSpan']);

function orderObject(obj, order) {
  const out = {};
  for (const k of order) out[k] = obj[k];
  return out;
}

/**
 * Canonically serialize a TaxBoundaryEvidence object to a byte-stable JSON string.
 * Fixed key ordering, stable arrays, no timestamps/random/env values, no mutation.
 * @param {object} evidence
 * @returns {string}
 */
export function serializeTaxBoundaryEvidence(evidence) {
  const canonical = orderObject(evidence, TOP_KEY_ORDER);
  canonical.clauses = (evidence.clauses || []).map((c) => orderObject(c, CLAUSE_KEY_ORDER));
  canonical.relations = (evidence.relations || []).map((r) => orderObject(r, RELATION_KEY_ORDER));
  return JSON.stringify(canonical);
}
