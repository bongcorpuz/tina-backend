// PHASE-10A14-R20 COMMIT 5R1-C15 — reason-focused counterfactual suite (v8).
// Expectations authored BEFORE any runtime change, from the immutable clause schema and
// precedence spec. Structural templates only; zero copying of R3, decision-suite,
// relation-suite or clause-probe text.
import fs from 'node:fs';
import * as L from './commit5r1c15-lib.mjs';

const queries = [];
let pairSeq = 0;
const pair = (family, a, b) => {
  const pairId = `${family}#${++pairSeq}`;
  queries.push({ ...a, family, pair: pairId, side: 'a' });
  queries.push({ ...b, family, pair: pairId, side: 'b' });
};

// Fillers invented for this suite; deliberately disjoint from every earlier suite.
const ORD = ['sailmaker fee', 'quarry haulage', 'orchard netting', 'foundry casting', 'bakery oven', 'cobbler bench', 'tannery lining', 'glazier panel', 'apiary frame', 'loom shuttle', 'ferry gangway', 'salt pan rake', 'copra dryer', 'abaca baler', 'rattan steamer', 'nipa thatching'];
const NEUTRAL = ['badminton net', 'harmonica case', 'sundial plinth', 'canoe paddle', 'lantern wick', 'trellis post', 'zither string', 'cairn marker', 'abacus bead', 'quilt batting', 'birdhouse perch', 'marble chute', 'kaleidoscope tube', 'pennant halyard', 'sled runner', 'wind chime rod'];
const ACR = ['VQZ', 'KRM', 'TBN', 'PLW', 'DGF', 'NSK', 'HRV', 'CMB', 'JYT', 'WFL', 'BXR', 'QNP', 'ZTM', 'FHD', 'LGV', 'MRC'];
const EXP = ['valley quiz zone', 'kite repair manual', 'timber bench notes', 'pillow loft warmer', 'dune glider frame', 'noodle stall kit', 'harvest rota view', 'compost bin marker', 'jetty yard tally', 'wool felt liner', 'bamboo raft plan', 'quarry noise log', 'zoo mural sketch', 'fern hedge guide', 'lagoon ferry chart', 'moss roof tally'];

// ---- 1. specific versus generic ALLOW reasons --------------------------------
for (let i = 0; i < 14; i++) {
  const o = ORD[i];
  pair('specific_vs_generic_allow', {
    // A governed tax predicate over a NAMED ordinary object -> ordinary-object treatment.
    query: `Is the ${o} subject to VAT?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_treatment_of_ordinary_object',
  }, {
    // A tax question with no ordinary object named -> residual explicit tax task.
    query: `How do we compute donor tax for a Philippine corporation?`,
    expectedDecision: 'ALLOW', expectedReason: 'explicit_tax_task_relation',
  });
}

// ---- 2. tax treatment of ordinary object versus direct tax task --------------
for (let i = 0; i < 12; i++) {
  const o = ORD[i];
  pair('ordinary_object_vs_direct_tax_task', {
    query: `Is the ${o} deductible against gross income?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_treatment_of_ordinary_object',
  }, {
    query: `How do we document net operating loss carry-over?`,
    expectedDecision: 'ALLOW', expectedReason: 'explicit_tax_task_relation',
  });
}

// ---- 3. compliance versus treatment ------------------------------------------
for (let i = 0; i < 12; i++) {
  const o = ORD[i];
  pair('compliance_vs_treatment', {
    query: `Which BIR form should we file for the ${o}?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_compliance_task',
    forbiddenReasons: ['tax_treatment_of_ordinary_object'],
  }, {
    query: `Is the ${o} subject to percentage tax?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_treatment_of_ordinary_object',
    forbiddenReasons: ['tax_compliance_task'],
  });
  pair('compliance_registration_vs_treatment', {
    query: `What is the deadline for remitting withholding tax on the ${o}?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_compliance_task',
  }, {
    query: `Is withholding tax due on the ${o}?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_treatment_of_ordinary_object',
  });
}

// ---- 4. definition versus ambiguous acronym ----------------------------------
for (let i = 0; i < 12; i++) {
  const a = ACR[i];
  pair('definition_vs_ambiguous_acronym', {
    // Definition asked WITH controlling tax context -> definition with context.
    query: `What does ${a} mean in a BIR assessment?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_definition_with_context',
  }, {
    // A recognised polysemous tax acronym with no controlling context -> CLARIFY.
    query: `RMC?`,
    expectedDecision: 'CLARIFY', expectedReason: 'ambiguous_tax_acronym',
  });
}

// ---- 5. non-tax action versus label/name -------------------------------------
for (let i = 0; i < 14; i++) {
  const n = NEUTRAL[i], a = ACR[i];
  pair('nontax_action_vs_label', {
    query: `Rename the ${n} folder.`,
    expectedDecision: 'REFUSE', expectedReason: 'explicit_non_tax_task',
    forbiddenReasons: ['non_tax_label_or_name'],
  }, {
    query: `The phrase ${a} is only an internal label for our ${n}.`,
    expectedDecision: 'REFUSE', expectedReason: 'non_tax_label_or_name',
    forbiddenReasons: ['explicit_non_tax_task'],
  });
}

// ---- 6. expansion versus definition ------------------------------------------
for (let i = 0; i < 14; i++) {
  const a = ACR[i], e = EXP[i];
  pair('expansion_vs_definition', {
    query: `In our system, ${a} stands for ${e}.`,
    expectedDecision: 'REFUSE', expectedReason: 'non_tax_expansion',
    forbiddenReasons: ['tax_definition_with_context'],
  }, {
    query: `What does ${a} refer to in Philippine tax rules?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_definition_with_context',
    forbiddenReasons: ['non_tax_expansion'],
  });
}

// ---- 7. quotation versus label ------------------------------------------------
for (let i = 0; i < 12; i++) {
  const n = NEUTRAL[i], a = ACR[i];
  pair('quotation_vs_label', {
    query: `Count the letters in the phrase "documentary stamp tax".`,
    expectedDecision: 'REFUSE', expectedReason: 'quoted_tax_term_only',
    forbiddenReasons: ['non_tax_label_or_name'],
  }, {
    query: `Our ${n} project is code-named ${a} in the tracker.`,
    expectedDecision: 'REFUSE', expectedReason: 'non_tax_label_or_name',
    forbiddenReasons: ['quoted_tax_term_only'],
  });
}

// ---- 8. negation-review versus ordinary negation ------------------------------
for (let i = 0; i < 12; i++) {
  const o = ORD[i], n = NEUTRAL[i];
  pair('negation_review_vs_ordinary_negation', {
    query: `This may be non-tax, but please review the VAT treatment of the ${o} anyway.`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_negation_but_tax_review_requested',
  }, {
    query: `I am not asking about tax; just describe the ${n}.`,
    expectedDecision: 'REFUSE',
    forbiddenReasons: ['tax_negation_but_tax_review_requested'],
  });
}

// ---- 9. no-tax REFUSE versus no-tax CLARIFY ----------------------------------
// R3 authorizes BOTH pairings for the no_tax_relation family.
for (let i = 0; i < 12; i++) {
  const n = NEUTRAL[i];
  pair('no_tax_refuse_vs_clarify', {
    // A request naming an ordinary subject with NO tax relation of any kind. R3 pairs
    // the no_tax_relation family with REFUSE in 463 rows.
    query: `Translate the ${n} handbook into plain English.`,
    expectedDecision: 'REFUSE', expectedReason: 'no_tax_relation',
    forbiddenReasons: ['ambiguous_tax_acronym'],
  }, {
    // An unresolved referent naming no subject of its own. R3 authorizes the SAME
    // family with CLARIFY in 100 rows; the family is decided by the absent relation,
    // the decision by the unresolved referent.
    query: `What about it for scenario ${20 + i}?`,
    expectedDecision: 'CLARIFY', expectedReason: 'no_tax_relation',
    forbiddenReasons: ['explicit_non_tax_task'],
  });
}

// ---- 10. primary task versus subordinate context -----------------------------
for (let i = 0; i < 12; i++) {
  const o = ORD[i], n = NEUTRAL[i];
  pair('primary_vs_subordinate_reason', {
    query: `Although the ${o} is taxable, rename the ${n} archive.`,
    expectedDecision: 'REFUSE', expectedReason: 'explicit_non_tax_task',
  }, {
    query: `Although the ${n} is ordinary, is the ${o} subject to VAT?`,
    expectedDecision: 'ALLOW',
    forbiddenReasons: ['explicit_non_tax_task'],
  });
}

// ---- 11. English versus Filipino/Taglish variants ----------------------------
for (let i = 0; i < 14; i++) {
  const o = ORD[i], n = NEUTRAL[i];
  pair('english_vs_filipino_reason', {
    query: `May VAT ba sa ${o}?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_treatment_of_ordinary_object',
  }, {
    query: `Ayusin ang ${n} listahan.`,
    expectedDecision: 'REFUSE', expectedReason: 'explicit_non_tax_task',
  });
}
for (let i = 0; i < 10; i++) {
  const o = ORD[i];
  pair('filipino_compliance_vs_treatment', {
    query: `Ano ang deadline sa pag-file ng withholding tax sa ${o}?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_compliance_task',
  }, {
    query: `Deductible ba ang ${o} para sa income tax?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_treatment_of_ordinary_object',
  });
}

// ---- 12. residual coverage for every remaining family -------------------------
for (let i = 0; i < 10; i++) {
  const a = ACR[i], o = ORD[i];
  pair('residual_family_coverage', {
    query: `What is ${a} under the National Internal Revenue Code?`,
    expectedDecision: 'ALLOW',
    forbiddenReasons: ['explicit_non_tax_task', 'non_tax_label_or_name'],
  }, {
    query: `How is the ${o} treated for Philippine tax purposes?`,
    expectedDecision: 'ALLOW',
    forbiddenReasons: ['explicit_non_tax_task', 'quoted_tax_term_only'],
  });
}

// -------------------------------------------------------------- integrity gates
const r3Queries = new Set(L.loadR3().map((r) => r.query.trim().toLowerCase()));
const otherSuites = new Set();
for (const [, p] of L.SUITES) for (const q of JSON.parse(fs.readFileSync(p, 'utf8')).queries) otherSuites.add(q.query.trim().toLowerCase());
for (const q of JSON.parse(fs.readFileSync(L.RELATION_SUITE, 'utf8')).queries) otherSuites.add(q.query.trim().toLowerCase());
for (const q of JSON.parse(fs.readFileSync(L.CLAUSE_PROBES, 'utf8')).probes) otherSuites.add(q.query.trim().toLowerCase());

const leakR3 = queries.filter((q) => r3Queries.has(q.query.trim().toLowerCase()));
const leakSuite = queries.filter((q) => otherSuites.has(q.query.trim().toLowerCase()));
const covered = new Set();
for (const q of queries) if (q.expectedReason) covered.add(q.expectedReason);
const uncovered = L.REASON_CODES.filter((c) => !covered.has(c));
const pairIds = new Set(queries.map((q) => q.pair));
const badReason = queries.flatMap((q) => [q.expectedReason, ...(q.forbiddenReasons || [])]).filter(Boolean).filter((r) => !L.REASON_CODES.includes(r));

if (leakR3.length) throw new Error('R3_LEAKAGE ' + JSON.stringify(leakR3.slice(0, 3).map((x) => x.query)));
if (leakSuite.length) throw new Error('SUITE_LEAKAGE ' + JSON.stringify(leakSuite.slice(0, 3).map((x) => x.query)));
if (badReason.length) throw new Error('REASON_OUTSIDE_CLOSED_SET ' + [...new Set(badReason)].join(','));
if (queries.length < 330) throw new Error('SUITE_TOO_SMALL ' + queries.length);
if (pairIds.size < 165) throw new Error('TOO_FEW_PAIRS ' + pairIds.size);
if (uncovered.length) throw new Error('REASON_FAMILIES_UNCOVERED ' + uncovered.join(','));

L.writeJson(L.REASON_SUITE, {
  suite: 'COMMIT_5R1C15_REASON_COUNTERFACTUAL_V8',
  unit: 'COMMIT 5R1-C15', generatedUtc: new Date().toISOString(),
  purpose: 'Reason-lane counterfactual closure. Structural templates only; expectations authored before any runtime change.',
  authority: 'CLAUSE_LEVEL_INTENT_SCHEMA.md + RELATION_AND_PRECEDENCE_SPEC.md',
  scoring: 'strict equality on the single controlling reason code (matching the frozen scorer), plus the declared decision; forbidden reasons must not be emitted',
  queryCount: queries.length, pairCount: pairIds.size,
  reasonFamiliesCovered: [...covered].sort(),
  exactR3Leakage: 0, exactOtherSuiteLeakage: 0,
  expectationsAuthoredBeforeExecution: true,
  denominatorFrozenAfterAuthoring: true,
  queries,
});
console.log('queries=' + queries.length, 'pairs=' + pairIds.size, 'familiesCovered=' + covered.size, 'leakR3=0 leakSuite=0');
