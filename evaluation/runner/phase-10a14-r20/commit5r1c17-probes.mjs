// PHASE-10A14-R20 COMMIT 5R1-C17 — §11 collision-focused probes.
// Expectations authored BEFORE any runtime change. Acceptance gate only: these probes
// do NOT alter reason suite v8's denominator of 344. Structural templates only; zero
// exact leakage from R3 or any existing suite.
import fs from 'node:fs';
import * as L from './commit5r1c17-lib.mjs';

const probes = [];
let pairSeq = 0;
const pair = (family, a, b) => {
  const pairId = `${family}#${++pairSeq}`;
  probes.push({ ...a, family, pair: pairId, side: 'a' });
  probes.push({ ...b, family, pair: pairId, side: 'b' });
};

// Fillers invented for C17; deliberately disjoint from every earlier suite.
const EXT = ['pier docking charge', 'silo cleaning run', 'kiln relining job', 'trawler net repair', 'grain drying batch', 'ice plant output', 'copra press run', 'ferry hull survey', 'quarry blast permit fee', 'rattan drying rack'];
const ORD = ['tide chart poster', 'kite spool rack', 'lantern paper roll', 'mango crate liner', 'bamboo flute case', 'shell lamp shade', 'coral tank pump', 'reed mat binder', 'clay pot glaze', 'palm leaf fan'];
const ACR = ['XQD', 'BNV', 'RTK', 'PYW', 'GZL', 'MFH', 'JCT', 'VWS', 'KDP', 'NHB'];
const EXP = ['dock rope tally', 'kite spool index', 'lamp shade log', 'crate liner note', 'flute case chart', 'tank pump list', 'mat binder guide', 'pot glaze sheet', 'leaf fan roster', 'net repair board'];

// ---- 1. the three largest C16 collision vectors ------------------------------
// Vector: assertion|none|REQUESTS_NON_TAX_ACTION_ON|none — a bare topic fragment.
for (let i = 0; i < 10; i++) {
  pair('collision_topic_fragment_vs_operation', {
    // No operation requested: a bare descriptive topic. Nothing links a tax predicate
    // to any target, so the absent relation explains the refusal.
    query: `${ORD[i]} inventory notes`,
    expectedDecision: 'REFUSE', expectedReason: 'no_tax_relation',
    forbiddenReasons: ['explicit_non_tax_task'],
  }, {
    // An operation IS requested on the same subject matter.
    query: `Sort the ${ORD[i]} inventory notes.`,
    expectedDecision: 'REFUSE', expectedReason: 'explicit_non_tax_task',
    forbiddenReasons: ['no_tax_relation'],
  });
}
// Vector: request|none|REQUESTS_NON_TAX_ACTION_ON|none — request subtype decides.
for (let i = 0; i < 8; i++) {
  pair('collision_request_subtype', {
    query: `Translate the ${ORD[i]} handbook into plain English.`,
    expectedDecision: 'REFUSE', expectedReason: 'no_tax_relation',
    forbiddenReasons: ['quoted_tax_term_only'],
  }, {
    query: `Delete the ${ORD[i]} draft file.`,
    expectedDecision: 'REFUSE', expectedReason: 'explicit_non_tax_task',
  });
}
// Vector: question|none|REQUESTS_NON_TAX_ACTION_ON|none — question vs evaluation.
for (let i = 0; i < 8; i++) {
  pair('collision_question_vs_evaluation', {
    query: `What is the ${ORD[i]} storage depth?`,
    expectedDecision: 'REFUSE', expectedReason: 'no_tax_relation',
    forbiddenReasons: ['explicit_non_tax_task'],
  }, {
    query: `Which ${ORD[i]} brand is best?`,
    expectedDecision: 'REFUSE', expectedReason: 'explicit_non_tax_task',
    forbiddenReasons: ['no_tax_relation'],
  });
}

// ---- 2. same words, different predicate attachment ---------------------------
for (let i = 0; i < 8; i++) {
  pair('predicate_attachment', {
    // Predicate attaches to the SUBJECT: the external item's status is asked.
    query: `Is the ${EXT[i]} subject to percentage tax?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_treatment_of_ordinary_object',
  }, {
    // The tax concept itself is the requested subject.
    query: `How is percentage tax computed for a Philippine corporation?`,
    expectedDecision: 'ALLOW', expectedReason: 'explicit_tax_task_relation',
  });
}

// ---- 3. same target, different requested outcome -----------------------------
for (let i = 0; i < 8; i++) {
  pair('requested_outcome', {
    query: `Which BIR form applies to the ${EXT[i]}?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_compliance_task',
    forbiddenReasons: ['tax_treatment_of_ordinary_object'],
  }, {
    query: `Is the ${EXT[i]} subject to VAT?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_treatment_of_ordinary_object',
    forbiddenReasons: ['tax_compliance_task'],
  });
  pair('outcome_evidentiary_vs_filing', {
    // §10D: substantiation is evidentiary treatment, NOT a filing task.
    query: `What records support the ${EXT[i]} deduction?`,
    expectedDecision: 'ALLOW',
    forbiddenReasons: ['tax_compliance_task'],
  }, {
    query: `When is the deadline for filing the ${EXT[i]} return?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_compliance_task',
  });
}

// ---- 4. naming act versus operation on a named artefact ----------------------
for (let i = 0; i < 10; i++) {
  pair('naming_vs_operation_on_named', {
    query: `The phrase ${ACR[i]} is only an internal label for our ${ORD[i]}.`,
    expectedDecision: 'REFUSE', expectedReason: 'non_tax_label_or_name',
    forbiddenReasons: ['explicit_non_tax_task'],
  }, {
    // §10B: an operation on an already code-labelled artefact stays an action.
    query: `Delete the ${ACR[i]} project folder.`,
    expectedDecision: 'REFUSE', expectedReason: 'explicit_non_tax_task',
    forbiddenReasons: ['non_tax_label_or_name'],
  });
}

// ---- 5. tax concept versus external transaction target -----------------------
for (let i = 0; i < 8; i++) {
  pair('tax_concept_vs_external_target', {
    query: `How is improperly accumulated earnings tax applied to a domestic corporation?`,
    expectedDecision: 'ALLOW', expectedReason: 'explicit_tax_task_relation',
    forbiddenReasons: ['tax_treatment_of_ordinary_object'],
  }, {
    query: `Are receipts from the ${EXT[i]} taxable?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_treatment_of_ordinary_object',
    forbiddenReasons: ['explicit_tax_task_relation'],
  });
}

// ---- 6. acronym itself versus broader unresolved topic -----------------------
for (let i = 0; i < 8; i++) {
  pair('acronym_vs_topic_ambiguity', {
    query: `What is ${ACR[i]} for item ${40 + i}?`,
    expectedDecision: 'CLARIFY', expectedReason: 'ambiguous_tax_acronym',
  }, {
    query: `What about professional fees for matter ${40 + i}?`,
    expectedDecision: 'CLARIFY', expectedReason: 'no_tax_relation',
    forbiddenReasons: ['ambiguous_tax_acronym'],
  });
}

// ---- 7. compliance outcome versus evidentiary explanation --------------------
for (let i = 0; i < 6; i++) {
  pair('compliance_vs_explanation', {
    query: `Is the ${EXT[i]} subject to BIR registration?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_compliance_task',
  }, {
    query: `Explain how the ${EXT[i]} is treated for Philippine tax purposes.`,
    expectedDecision: 'ALLOW',
    forbiddenReasons: ['tax_compliance_task'],
  });
}

// ---- 8. Filipino / Taglish forms ---------------------------------------------
for (let i = 0; i < 8; i++) {
  pair('filipino_operation_vs_topic', {
    query: `Ayusin ang ${ORD[i]} talaan.`,
    expectedDecision: 'REFUSE', expectedReason: 'explicit_non_tax_task',
  }, {
    query: `May VAT ba sa ${EXT[i]}?`,
    expectedDecision: 'ALLOW', expectedReason: 'tax_treatment_of_ordinary_object',
  });
}

// ---- 9. expansion and quotation stay closed (§10F) ---------------------------
for (let i = 0; i < 8; i++) {
  pair('closed_family_preservation', {
    query: `In our system, ${ACR[i]} stands for ${EXP[i]}.`,
    expectedDecision: 'REFUSE', expectedReason: 'non_tax_expansion',
  }, {
    query: `Count the letters in the phrase "estate tax".`,
    expectedDecision: 'REFUSE', expectedReason: 'quoted_tax_term_only',
  });
}

// -------------------------------------------------------------- integrity gates
const r3Queries = new Set(L.loadR3().map((r) => r.query.trim().toLowerCase()));
const other = new Set();
for (const [, p] of L.SUITES) for (const q of JSON.parse(fs.readFileSync(p, 'utf8')).queries) other.add(q.query.trim().toLowerCase());
for (const q of JSON.parse(fs.readFileSync(L.RELATION_SUITE, 'utf8')).queries) other.add(q.query.trim().toLowerCase());
for (const q of JSON.parse(fs.readFileSync(L.CLAUSE_PROBES, 'utf8')).probes) other.add(q.query.trim().toLowerCase());
for (const q of JSON.parse(fs.readFileSync(L.REASON_SUITE, 'utf8')).queries) other.add(q.query.trim().toLowerCase());

const leakR3 = probes.filter((q) => r3Queries.has(q.query.trim().toLowerCase()));
const leakOther = probes.filter((q) => other.has(q.query.trim().toLowerCase()));
const pairIds = new Set(probes.map((q) => q.pair));
const badReason = probes.flatMap((q) => [q.expectedReason, ...(q.forbiddenReasons || [])]).filter(Boolean).filter((r) => !L.REASON_CODES.includes(r));

if (leakR3.length) throw new Error('R3_LEAKAGE ' + JSON.stringify(leakR3.slice(0, 3).map((x) => x.query)));
if (leakOther.length) throw new Error('SUITE_LEAKAGE ' + JSON.stringify(leakOther.slice(0, 3).map((x) => x.query)));
if (badReason.length) throw new Error('REASON_OUTSIDE_CLOSED_SET ' + [...new Set(badReason)].join(','));
if (probes.length < 160) throw new Error('TOO_FEW_PROBES ' + probes.length);
if (pairIds.size < 80) throw new Error('TOO_FEW_PAIRS ' + pairIds.size);

L.writeJson(L.COLLISION_PROBES, {
  suite: 'COMMIT_5R1C17_COLLISION_PROBE_SUITE',
  unit: 'COMMIT 5R1-C17', generatedUtc: new Date().toISOString(),
  purpose: 'Collision-focused acceptance gate for the enriched reason-observability layer.',
  notPartOfReasonSuiteDenominator: true,
  reasonSuiteDenominatorUnchanged: '344 controlling queries',
  authority: 'CLAUSE_LEVEL_INTENT_SCHEMA.md + RELATION_AND_PRECEDENCE_SPEC.md',
  expectationsAuthoredBeforeExecution: true,
  exactR3Leakage: 0, exactOtherSuiteLeakage: 0,
  probeCount: probes.length, pairCount: pairIds.size,
  probes,
});
console.log('probes=' + probes.length, 'pairs=' + pairIds.size, 'leakR3=0 leakOther=0');
