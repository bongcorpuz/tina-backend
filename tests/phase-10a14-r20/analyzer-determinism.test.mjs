/**
 * PHASE-10A14-R20 — determinism, stable serialization & no-mutation tests.
 * Run: node --test tests/phase-10a14-r20/analyzer-determinism.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzePhilippineTaxIntent,
  serializeTaxBoundaryEvidence,
  TAX_BOUNDARY_DECISIONS,
  TAX_BOUNDARY_REASON_CODES,
  TAX_RELATION_TYPES,
} from '../../services/philippine-tax-intent-analyzer.js';

const REPRESENTATIVE = [
  'Is the cooling fan deductible for income tax?',
  'Ano ang VAT sa website design, pero huwag pag-usapan ang pulitika?',
  'Quote the words "withholding tax".',
  'What is the input VAT treatment of a cooking pan purchased by the business? However, rename the folder.',
  'What does PAN mean?',
  'Are website-design services subject to VAT?',
  'Change the cooling fan speed.',
  'Use MCIT as the product code.',
];

test('serialization is byte-identical across 100 repeated runs per query', () => {
  for (const q of REPRESENTATIVE) {
    const s0 = serializeTaxBoundaryEvidence(analyzePhilippineTaxIntent(q));
    for (let i = 0; i < 100; i++) {
      assert.equal(serializeTaxBoundaryEvidence(analyzePhilippineTaxIntent(q)), s0, `mismatch on run ${i} for "${q}"`);
    }
  }
});

test('serialization has fixed top-level key order', () => {
  const s = serializeTaxBoundaryEvidence(analyzePhilippineTaxIntent(REPRESENTATIVE[0]));
  const parsed = JSON.parse(s);
  assert.deepEqual(Object.keys(parsed), [
    'normalizedText', 'clauses', 'primaryTaskClauseId', 'speechAct',
    'requestedAction', 'requestedTarget', 'taxPredicates', 'taxProcedures',
    'taxEntities', 'ordinaryObjects', 'acronymMentions', 'quotations',
    'negations', 'labelsAndNames', 'relations', 'ambiguityFlags',
    'decision', 'reasonCode', 'confidence',
  ]);
});

test('serialization contains no timestamps or obvious random values', () => {
  const s = serializeTaxBoundaryEvidence(analyzePhilippineTaxIntent(REPRESENTATIVE[3]));
  assert.equal(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s), false, 'ISO timestamp leaked');
  assert.equal(/"(uuid|random|nonce)"/i.test(s), false);
});

test('repeated analysis returns deeply-equal objects', () => {
  for (const q of REPRESENTATIVE) {
    assert.deepEqual(analyzePhilippineTaxIntent(q), analyzePhilippineTaxIntent(q));
  }
});

test('returned evidence and nested objects are frozen (no post-hoc mutation)', () => {
  const ev = analyzePhilippineTaxIntent(REPRESENTATIVE[0]);
  assert.ok(Object.isFrozen(ev));
  assert.ok(Object.isFrozen(ev.clauses));
  assert.ok(Object.isFrozen(ev.relations));
  assert.throws(() => { ev.decision = 'HACKED'; }, TypeError);
});

test('exported constants cannot be mutated', () => {
  assert.throws(() => { TAX_BOUNDARY_DECISIONS.push('X'); }, TypeError);
  assert.throws(() => { TAX_BOUNDARY_REASON_CODES.push('X'); }, TypeError);
  assert.throws(() => { TAX_RELATION_TYPES.push('X'); }, TypeError);
});

test('input object is not mutated', () => {
  const opts = { flag: 1 };
  const before = JSON.stringify(opts);
  analyzePhilippineTaxIntent('Is the gain taxable?', opts);
  assert.equal(JSON.stringify(opts), before);
});

test('no shared-state leakage across interleaved calls', () => {
  const a1 = serializeTaxBoundaryEvidence(analyzePhilippineTaxIntent('Change the cooling fan speed.'));
  const b1 = serializeTaxBoundaryEvidence(analyzePhilippineTaxIntent('Is the cooling fan deductible for income tax?'));
  const a2 = serializeTaxBoundaryEvidence(analyzePhilippineTaxIntent('Change the cooling fan speed.'));
  const b2 = serializeTaxBoundaryEvidence(analyzePhilippineTaxIntent('Is the cooling fan deductible for income tax?'));
  assert.equal(a1, a2);
  assert.equal(b1, b2);
  assert.notEqual(a1, b1);
});

test('decision and reasonCode are stable across 50 runs', () => {
  for (const q of REPRESENTATIVE) {
    const ev0 = analyzePhilippineTaxIntent(q);
    for (let i = 0; i < 50; i++) {
      const ev = analyzePhilippineTaxIntent(q);
      assert.equal(ev.decision, ev0.decision);
      assert.equal(ev.reasonCode, ev0.reasonCode);
    }
  }
});

test('clause IDs are stable and positional across runs', () => {
  const q = 'Register the business. File the VAT return. Rename the folder.';
  const ids0 = analyzePhilippineTaxIntent(q).clauses.map((c) => c.clauseId);
  for (let i = 0; i < 20; i++) {
    assert.deepEqual(analyzePhilippineTaxIntent(q).clauses.map((c) => c.clauseId), ids0);
  }
});
