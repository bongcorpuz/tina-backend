/**
 * PHASE-10A14-R20 — decision & reason-code precedence tests, plus the
 * REFUSE-vs-CLARIFY scoring-semantics distinction and no-invented-expansions.
 * Run: node --test tests/phase-10a14-r20/analyzer-decision-precedence.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePhilippineTaxIntent } from '../../services/philippine-tax-intent-analyzer.js';

function expect(text, decision, reasonCode) {
  const ev = analyzePhilippineTaxIntent(text);
  assert.equal(ev.decision, decision, `decision for "${text}": got ${ev.decision}/${ev.reasonCode}`);
  if (reasonCode) assert.equal(ev.reasonCode, reasonCode, `reason for "${text}": got ${ev.reasonCode}`);
}

// ── One positive test per final reason code ──────────────────────────────────

test('reason: explicit_tax_task_relation', () => expect('What is the tax treatment of the gain on our building?', 'ALLOW', 'explicit_tax_task_relation'));
test('reason: tax_treatment_of_ordinary_object', () => expect('Is the cooling fan deductible for income tax?', 'ALLOW', 'tax_treatment_of_ordinary_object'));
test('reason: tax_compliance_task', () => expect('What BIR filing applies to this transaction?', 'ALLOW', 'tax_compliance_task'));
test('reason: tax_definition_with_context', () => expect('What does NOLCO mean in Philippine income tax?', 'ALLOW', 'tax_definition_with_context'));
test('reason: ambiguous_tax_acronym', () => expect('What does PAN mean?', 'CLARIFY', 'ambiguous_tax_acronym'));
test('reason: explicit_non_tax_task', () => expect('Change the cooling fan speed.', 'REFUSE', 'explicit_non_tax_task'));
test('reason: non_tax_label_or_name', () => expect('Use MCIT as the product code.', 'REFUSE', 'non_tax_label_or_name'));
test('reason: non_tax_expansion', () => expect('RMC is the radio music channel.', 'REFUSE', 'non_tax_expansion'));
test('reason: quoted_tax_term_only', () => expect('Quote the words "withholding tax".', 'REFUSE', 'quoted_tax_term_only'));
test('reason: tax_negation_but_tax_review_requested', () => expect('Although this may be non-tax, please review its VAT treatment.', 'ALLOW', 'tax_negation_but_tax_review_requested'));
test('reason: no_tax_relation', () => expect('Draw a picture of a sunset.', 'REFUSE'));

// ── ALLOW examples from the frozen contract ──────────────────────────────────

for (const t of [
  'Is the cooling fan deductible for income tax?',
  'What is the input VAT treatment of a cooking pan purchased by the business?',
  'Does transfer pricing apply to our software company?',
  'Are website-design services subject to VAT?',
  'What customs duty applies to this cooling device?',
  'Although this may be non-tax, please review its VAT treatment.',
  'What does NOLCO mean in Philippine income tax?',
]) test(`ALLOW: ${t}`, () => assert.equal(analyzePhilippineTaxIntent(t).decision, 'ALLOW'));

// ── REFUSE examples from the frozen contract ─────────────────────────────────

for (const t of [
  'Change the cooling fan speed.',
  'Which cooking pan should I buy?',
  'Prepare a lesson about customs and traditions.',
  'Use FLD as the database field label.',
  'Use MCIT as the product code.',
  'RMC is the radio music channel.',
  'Quote the words "withholding tax".',
]) test(`REFUSE: ${t}`, () => assert.equal(analyzePhilippineTaxIntent(t).decision, 'REFUSE'));

// ── CLARIFY examples ─────────────────────────────────────────────────────────

for (const t of ['What does PAN mean?', 'What does FAN mean?', 'What is RR?', 'Is this deductible?']) {
  test(`CLARIFY: ${t}`, () => assert.equal(analyzePhilippineTaxIntent(t).decision, 'CLARIFY'));
}

// ── REFUSE != CLARIFY (scoring-semantics control) ────────────────────────────

test('REFUSE and CLARIFY are distinct canonical outcomes', () => {
  const refuse = analyzePhilippineTaxIntent('Change the cooling fan speed.').decision;
  const clarify = analyzePhilippineTaxIntent('What does PAN mean?').decision;
  assert.equal(refuse, 'REFUSE');
  assert.equal(clarify, 'CLARIFY');
  assert.notEqual(refuse, clarify);
});

// Divergence samples: explicit non-tax context -> REFUSE (documented per fixture).
// Each of these carries an explicit ordinary/non-tax context, so REFUSE is correct;
// they are NOT treated as generic CLARIFY.
for (const t of [
  'GitHub pull request labels',       // pull request = software artifact
  'basketball game score',            // sports
  'deadline for homework',            // schoolwork
  'penalty kick rule',                // football rule (penalty homograph)
  'surcharge in a delivery app',      // app fee (surcharge homograph)
  'deductible in insurance policy',   // insurance deductible (deductible homograph)
]) test(`divergence REFUSE: ${t}`, () => assert.equal(analyzePhilippineTaxIntent(t).decision, 'REFUSE'));

// ── No invented acronym expansions ───────────────────────────────────────────

test('bare PAN -> CLARIFY, no invented expansion', () => {
  const ev = analyzePhilippineTaxIntent('What does PAN mean?');
  assert.equal(ev.decision, 'CLARIFY');
  assert.equal(ev.acronymMentions.every((a) => !a.explicitExpansionProvided || a.expansion), true);
  const pan = ev.acronymMentions.find((a) => a.token === 'pan');
  assert.ok(pan && !pan.explicitExpansionProvided, 'PAN must not carry an invented expansion');
});

test('PAN with BIR context -> ALLOW definition-with-context', () => {
  expect('What does PAN mean in a BIR assessment?', 'ALLOW', 'tax_definition_with_context');
});

test('explicit personal area network expansion -> REFUSE non_tax_expansion', () => {
  expect('PAN means personal area network.', 'REFUSE', 'non_tax_expansion');
});

test('FAN as cooling device -> REFUSE', () => {
  assert.equal(analyzePhilippineTaxIntent('Change the cooling fan speed.').decision, 'REFUSE');
});

test('RMC with BIR context -> not a non_tax_expansion', () => {
  const ev = analyzePhilippineTaxIntent('What does RMC 50-2018 mean for BIR filing?');
  assert.notEqual(ev.reasonCode, 'non_tax_expansion');
});

test('MCIT as product code -> non_tax_label_or_name', () => {
  expect('Use MCIT as the product code.', 'REFUSE', 'non_tax_label_or_name');
});

test('acronym mentions never fabricate an expansion field', () => {
  for (const t of ['What is PAN?', 'What is FAN?', 'What is RR?']) {
    const ev = analyzePhilippineTaxIntent(t);
    for (const a of ev.acronymMentions) {
      if (!a.explicitExpansionProvided) assert.equal(a.expansion, null);
    }
  }
});
