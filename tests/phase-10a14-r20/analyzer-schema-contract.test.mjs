/**
 * PHASE-10A14-R20 — analyzer schema & closed-set contract tests.
 * Run: node --test tests/phase-10a14-r20/analyzer-schema-contract.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzePhilippineTaxIntent,
  TAX_BOUNDARY_DECISIONS,
  TAX_BOUNDARY_REASON_CODES,
  TAX_RELATION_TYPES,
  TAX_BOUNDARY_SPEECH_ACTS,
} from '../../services/philippine-tax-intent-analyzer.js';

const TOP_FIELDS = [
  'normalizedText', 'clauses', 'primaryTaskClauseId', 'speechAct',
  'requestedAction', 'requestedTarget', 'taxPredicates', 'taxProcedures',
  'taxEntities', 'ordinaryObjects', 'acronymMentions', 'quotations',
  'negations', 'labelsAndNames', 'relations', 'ambiguityFlags',
  'decision', 'reasonCode', 'confidence',
];
const CLAUSE_FIELDS = [
  'clauseId', 'text', 'role', 'taskVerb', 'taskObject', 'taxSignals',
  'nonTaxSignals', 'definitionIntent', 'quotedOrMentionedOnly', 'explicitNegation',
];
const RELATION_FIELDS = ['source', 'relation', 'target', 'clauseId', 'evidenceSpan'];

const SAMPLES = [
  'Is the cooling fan deductible for income tax?',
  'Change the cooling fan speed.',
  'What does PAN mean?',
  'Are website-design services subject to VAT?',
  'Use MCIT as the product code.',
  'Quote the words "withholding tax".',
  'What BIR filing applies to this transaction?',
  'Ano ang VAT sa website design?',
  '',
  '   ',
  'gibberish zxqw',
];

test('all top-level schema fields always present', () => {
  for (const s of SAMPLES) {
    const ev = analyzePhilippineTaxIntent(s);
    for (const f of TOP_FIELDS) assert.ok(f in ev, `missing top field ${f} for "${s}"`);
    assert.equal(Object.keys(ev).length, TOP_FIELDS.length);
  }
});

test('all clause fields present', () => {
  for (const s of SAMPLES) {
    const ev = analyzePhilippineTaxIntent(s);
    for (const c of ev.clauses) {
      for (const f of CLAUSE_FIELDS) assert.ok(f in c, `missing clause field ${f}`);
    }
  }
});

test('all relation fields present and non-empty evidenceSpan', () => {
  for (const s of SAMPLES) {
    const ev = analyzePhilippineTaxIntent(s);
    for (const r of ev.relations) {
      for (const f of RELATION_FIELDS) assert.ok(f in r, `missing relation field ${f}`);
      assert.ok(typeof r.evidenceSpan === 'string' && r.evidenceSpan.length > 0, 'empty evidenceSpan');
      assert.ok(TAX_RELATION_TYPES.includes(r.relation), `illegal relation ${r.relation}`);
    }
  }
});

test('only allowed decisions', () => {
  for (const s of SAMPLES) assert.ok(TAX_BOUNDARY_DECISIONS.includes(analyzePhilippineTaxIntent(s).decision));
});

test('exactly one reason code, from the closed set, never strong_tax_signal', () => {
  for (const s of SAMPLES) {
    const ev = analyzePhilippineTaxIntent(s);
    assert.ok(TAX_BOUNDARY_REASON_CODES.includes(ev.reasonCode), `illegal reason ${ev.reasonCode}`);
    assert.notEqual(ev.reasonCode, 'strong_tax_signal');
  }
});

test('only allowed speech acts', () => {
  for (const s of SAMPLES) assert.ok(TAX_BOUNDARY_SPEECH_ACTS.includes(analyzePhilippineTaxIntent(s).speechAct));
});

test('primaryTaskClauseId references exactly one existing clause (or null on empty)', () => {
  for (const s of SAMPLES) {
    const ev = analyzePhilippineTaxIntent(s);
    if (ev.clauses.length === 0) { assert.equal(ev.primaryTaskClauseId, null); continue; }
    const ids = ev.clauses.map((c) => c.clauseId);
    assert.ok(ids.includes(ev.primaryTaskClauseId));
    assert.equal(ev.clauses.filter((c) => c.role === 'primary_task').length <= 1, true);
  }
});

test('confidence is a finite number within [0,1]', () => {
  for (const s of SAMPLES) {
    const c = analyzePhilippineTaxIntent(s).confidence;
    assert.ok(Number.isFinite(c) && c >= 0 && c <= 1, `bad confidence ${c}`);
  }
});

test('closed-set constants are frozen', () => {
  assert.ok(Object.isFrozen(TAX_BOUNDARY_DECISIONS));
  assert.ok(Object.isFrozen(TAX_BOUNDARY_REASON_CODES));
  assert.ok(Object.isFrozen(TAX_RELATION_TYPES));
  assert.ok(Object.isFrozen(TAX_BOUNDARY_SPEECH_ACTS));
});

test('exported closed sets match the frozen contract exactly', () => {
  assert.deepEqual([...TAX_BOUNDARY_DECISIONS], ['ALLOW', 'REFUSE', 'CLARIFY']);
  assert.equal(TAX_BOUNDARY_REASON_CODES.length, 11);
  assert.equal(TAX_RELATION_TYPES.length, 12);
});
