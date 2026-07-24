/**
 * PHASE-10A14-R20 — normalization, clause segmentation & relation tests.
 * Run: node --test tests/phase-10a14-r20/analyzer-clause-and-relation.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzePhilippineTaxIntent,
  normalizeTaxBoundaryText,
  segmentTaxBoundaryClauses,
} from '../../services/philippine-tax-intent-analyzer.js';

// ── Normalization ────────────────────────────────────────────────────────────

test('normalization: safe coercion of non-strings', () => {
  assert.equal(normalizeTaxBoundaryText(null), '');
  assert.equal(normalizeTaxBoundaryText(undefined), '');
  assert.equal(normalizeTaxBoundaryText(42), '42');
});

test('normalization: CRLF and CR -> LF collapsed', () => {
  assert.equal(normalizeTaxBoundaryText('a\r\nb\rc'), 'a b c');
});

test('normalization: trims and collapses non-semantic whitespace', () => {
  assert.equal(normalizeTaxBoundaryText('   Is  the   VAT\t\tdue?  '), 'Is the VAT due?');
});

test('normalization: preserves meaningful punctuation and quotes', () => {
  assert.equal(normalizeTaxBoundaryText('Quote "withholding tax".'), 'Quote "withholding tax".');
});

test('normalization: preserves evidence casing', () => {
  assert.equal(normalizeTaxBoundaryText('BIR Form 2307'), 'BIR Form 2307');
});

test('normalization: NFC is idempotent', () => {
  const once = normalizeTaxBoundaryText('Is the VAT due?');
  assert.equal(normalizeTaxBoundaryText(once), once);
});

test('normalization: never invents or expands text', () => {
  assert.equal(normalizeTaxBoundaryText('PAN'), 'PAN');
});

// ── Clause segmentation ──────────────────────────────────────────────────────

test('segmentation: single clause', () => {
  const c = segmentTaxBoundaryClauses('Is the gain taxable?');
  assert.equal(c.length, 1);
  assert.equal(c[0].clauseId, 'c01');
});

test('segmentation: two clauses on terminal punctuation', () => {
  const c = segmentTaxBoundaryClauses('Rename the folder. What is the VAT due?');
  assert.equal(c.length, 2);
  assert.deepEqual(c.map((x) => x.clauseId), ['c01', 'c02']);
});

test('segmentation: semicolon splits', () => {
  const c = segmentTaxBoundaryClauses('Do not discuss tax; improve the slogan.');
  assert.equal(c.length, 2);
});

test('segmentation: contrasting connector (however) splits on comma', () => {
  const c = segmentTaxBoundaryClauses('This may be non-tax, however review its VAT treatment');
  assert.ok(c.length >= 2);
});

test('segmentation: English coordination and', () => {
  const c = segmentTaxBoundaryClauses('Register the business, and file the VAT return');
  assert.ok(c.length >= 2);
});

test('segmentation: Filipino/Taglish connector pero splits', () => {
  const c = segmentTaxBoundaryClauses('Ayusin ang slogan, pero huwag pag-usapan ang buwis');
  assert.ok(c.length >= 2);
});

test('segmentation: quote-aware — no split inside quotation', () => {
  const c = segmentTaxBoundaryClauses('Quote "withholding tax. income tax" now');
  assert.equal(c.length, 1);
});

test('segmentation: parentheses content preserved without splitting', () => {
  const c = segmentTaxBoundaryClauses('What is the VAT (value added tax) rate?');
  assert.equal(c.length, 1);
  assert.ok(c[0].text.includes('(value added tax)'));
});

test('segmentation: every non-empty input yields >= 1 clause', () => {
  for (const s of ['x', 'no punctuation here', 'Is it?', '...']) {
    assert.ok(segmentTaxBoundaryClauses(normalizeTaxBoundaryText(s)).length >= 1);
  }
});

test('segmentation: stable IDs across repeated calls', () => {
  const a = segmentTaxBoundaryClauses('A. B. C.').map((x) => x.clauseId);
  const b = segmentTaxBoundaryClauses('A. B. C.').map((x) => x.clauseId);
  assert.deepEqual(a, b);
  assert.deepEqual(a, ['c01', 'c02', 'c03']);
});

// ── Relations: at least one per closed relation type ─────────────────────────

const relCases = {
  ASKS_TAX_TREATMENT_OF: 'What is the tax treatment of the gain on our building?',
  ASKS_TAX_COMPLIANCE_FOR: 'What BIR filing applies to this transaction?',
  ASKS_DEDUCTIBILITY_OF: 'Is the cooling fan deductible for income tax?',
  ASKS_VAT_TREATMENT_OF: 'Are website-design services subject to VAT?',
  ASKS_WITHHOLDING_ON: 'What is the withholding tax on the cooling device rental?',
  ASKS_CUSTOMS_DUTY_ON: 'What customs duty applies to this cooling device?',
  ASKS_DEFINITION_OF: 'What does NOLCO mean in Philippine income tax?',
  NAMES_AS_INTERNAL_LABEL: 'Use MCIT as the product code.',
  EXPANDS_AS_NON_TAX: 'RMC is the radio music channel.',
  QUOTES_TERM: 'Quote the words "withholding tax".',
  NEGATES_TAX_RELEVANCE: 'Do not discuss tax; improve the marketing slogan.',
  REQUESTS_NON_TAX_ACTION_ON: 'Change the cooling fan speed.',
};

for (const [rel, text] of Object.entries(relCases)) {
  test(`relation present: ${rel}`, () => {
    const ev = analyzePhilippineTaxIntent(text);
    const rels = ev.relations.map((r) => r.relation);
    assert.ok(rels.includes(rel), `expected ${rel}, got [${rels.join(',')}] for "${text}"`);
  });
}

test('no relation from mere token co-occurrence without task structure', () => {
  // "font" + bare mention; ensure we do not fabricate a tax-treatment relation.
  const ev = analyzePhilippineTaxIntent('The font tax was a joke.');
  const taxTreat = ev.relations.filter((r) => r.relation.startsWith('ASKS_TAX_TREATMENT'));
  assert.equal(taxTreat.length, 0);
});
