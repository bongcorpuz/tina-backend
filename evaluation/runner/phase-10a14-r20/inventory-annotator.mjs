// PHASE-10A14-R20 governed tooling — deterministic inventory annotation parser.
//
// Produces the pre-fix EVIDENCE ANNOTATIONS required by the frozen 1,120-row
// failure-inventory specification (primaryTaskClause, taskVerb, taskTarget,
// taxPredicates, taxEntities, nonTaxObjects, quotedTerms, negation,
// relationEvidence). These are EXECUTOR INVENTORY ANNOTATIONS describing failure
// structure. They are NOT runtime output and MUST NOT be represented as such.
// The current runtime does not implement the R20 clause-level analyzer.
//
// This annotator does NOT decide expected decisions and does NOT replace the
// classifier under test. It only describes the query surface deterministically.

export const ANNOTATION_VERSION = 'r20-commit2-inventory-annotator-1';
export const ANNOTATION_SOURCE = 'deterministic_inventory_parser';

const TAX_PREDICATE_TERMS = [
  'income tax', 'vat', 'withholding', 'documentary stamp', 'excise', 'percentage tax',
  'capital gains', 'estate tax', 'donor', 'customs duty', 'deductib', 'taxable',
  'tax treatment', 'bir', 'filing', 'return', 'compliance', 'nolco', 'slsp',
  'gross receipts', 'fringe benefit', 'tax', 'levy', 'assessment', 'remittance',
];
const TAX_ENTITY_TERMS = [
  'bir', 'vat', 'slsp', 'nolco', 'ra 10963', 'train', 'boc', 'sec', 'cta',
  'corporation', 'taxpayer', 'dst',
];
// Ordinary non-tax objects frequently used as homograph/role bait.
const NON_TAX_OBJECT_TERMS = [
  'font', 'color', 'colour', 'palette', 'css', 'file', 'folder', 'chord', 'band',
  'fan', 'cooling', 'project', 'variable', 'hobby', 'device', 'song', 'recipe',
  'game', 'movie', 'photo', 'image', 'video', 'directory', 'password', 'server',
];
const NON_TAX_VERBS = [
  'rename', 'translate', 'delete', 'draw', 'paint', 'compile', 'install',
  'download', 'sort', 'cook', 'play', 'sing', 'design', 'render', 'print',
];

function lower(s) { return String(s || '').toLowerCase(); }

function findTerms(q, terms) {
  const lo = lower(q);
  const hits = [];
  for (const t of terms) if (lo.includes(t)) hits.push(t);
  return [...new Set(hits)];
}

// Primary task clause: first sentence-like span (deterministic split on ? . ; ! and "Group ").
function primaryClause(q) {
  const cleaned = String(q || '').replace(/\s+Group\s+MM-\d+\.?\s*$/i, '').trim();
  const m = cleaned.split(/(?<=[?.!;])\s+/)[0];
  return (m || cleaned).trim();
}

// Task verb: first leading interrogative/imperative verb token, deterministically.
function taskVerb(q) {
  const lo = lower(primaryClause(q));
  const lead = lo.match(/^(how|what|when|where|which|who|why|is|are|do|does|can|should|rename|translate|delete|draw|paint|compile|install|download|sort|cook|play|sing|design|render|print|explain|compute|define|list|name)\b/);
  return lead ? lead[1] : null;
}

// Task target: heuristic head noun after the verb phrase (deterministic, coarse).
function taskTarget(q) {
  const pc = primaryClause(q);
  const nonTax = findTerms(pc, NON_TAX_OBJECT_TERMS);
  if (nonTax.length) return nonTax[0];
  const taxEnt = findTerms(pc, TAX_ENTITY_TERMS);
  if (taxEnt.length) return taxEnt[0];
  return null;
}

function quotedTerms(q) {
  const out = [];
  const re = /["'“‘]([^"'”’]{1,40})["'”’]/g;
  let m;
  while ((m = re.exec(String(q || '')))) out.push(m[1]);
  return out;
}

function negation(q) {
  return /\b(not|no|never|isn't|aren't|doesn't|don't|without|except)\b/i.test(String(q || ''));
}

// Coarse relation evidence linking tax predicates to the task target.
function relationEvidence(q, taxPredicates, target, verb) {
  const rels = [];
  const lo = lower(q);
  if (taxPredicates.length && target) {
    if (NON_TAX_VERBS.includes(verb)) {
      rels.push({ relation: 'REQUESTS_NON_TAX_ACTION_ON', target, evidenceSpan: primaryClause(q) });
    } else if (/subject to vat|vat treatment|vat on/.test(lo)) {
      rels.push({ relation: 'ASKS_VAT_TREATMENT_OF', target, evidenceSpan: primaryClause(q) });
    } else if (/deductib/.test(lo)) {
      rels.push({ relation: 'ASKS_DEDUCTIBILITY_OF', target, evidenceSpan: primaryClause(q) });
    } else if (/withholding/.test(lo)) {
      rels.push({ relation: 'ASKS_WITHHOLDING_ON', target, evidenceSpan: primaryClause(q) });
    } else if (/customs duty/.test(lo)) {
      rels.push({ relation: 'ASKS_CUSTOMS_DUTY_ON', target, evidenceSpan: primaryClause(q) });
    } else if (/filing|return|compliance|obligation/.test(lo)) {
      rels.push({ relation: 'ASKS_TAX_COMPLIANCE_FOR', target, evidenceSpan: primaryClause(q) });
    } else if (verb === 'what' && /mean|stand for|definition|define/.test(lo)) {
      rels.push({ relation: 'ASKS_DEFINITION_OF', target, evidenceSpan: primaryClause(q) });
    } else {
      rels.push({ relation: 'ASKS_TAX_TREATMENT_OF', target, evidenceSpan: primaryClause(q) });
    }
  }
  return rels;
}

export function annotateRow(row) {
  const q = row.text;
  const taxPredicates = findTerms(q, TAX_PREDICATE_TERMS);
  const taxEntities = findTerms(q, TAX_ENTITY_TERMS);
  const nonTaxObjects = findTerms(q, NON_TAX_OBJECT_TERMS);
  const verb = taskVerb(q);
  const target = taskTarget(q);
  return {
    primaryTaskClause: primaryClause(q),
    taskVerb: verb,
    taskTarget: target,
    taxPredicates,
    taxEntities,
    nonTaxObjects,
    quotedTerms: quotedTerms(q),
    negation: negation(q),
    relationEvidence: relationEvidence(q, taxPredicates, target, verb),
    annotationSource: ANNOTATION_SOURCE,
    annotationVersion: ANNOTATION_VERSION,
  };
}
