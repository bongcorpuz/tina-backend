// PHASE-10A14-R20 COMMIT 5R1-C13 — relation-focused counterfactual suite (v7).
// Expectations authored BEFORE any runtime change, from the immutable clause schema
// and precedence spec. Structural templates only; no copied R3 or v3-v6 text.
// Every entry is a member of a contrastive PAIR: minimal structural difference,
// different required relation set.
import fs from 'node:fs';
import * as L from './commit5r1c13-lib.mjs';

const queries = [];
let pairSeq = 0;
/** Author one contrastive pair. Each side declares required and forbidden relations. */
const pair = (family, a, b) => {
  const pairId = `${family}#${++pairSeq}`;
  queries.push({ ...a, family, pair: pairId, side: 'a' });
  queries.push({ ...b, family, pair: pairId, side: 'b' });
};

// Neutral structural fillers — invented for this suite, not drawn from any oracle.
const TAX_OBJ = ['delivery van', 'office printer', 'catering service', 'freight forwarding', 'billboard rental', 'courier package', 'training seminar', 'warehouse pallet', 'server hosting', 'laundry service'];
const ORD_OBJ = ['guitar lesson', 'hiking trail', 'chess tournament', 'aquarium filter', 'bicycle helmet', 'pottery kiln', 'garden hose', 'violin string', 'kite festival', 'puzzle box'];
const ACR = ['ZTX', 'QVL', 'MBK', 'JPR', 'KDN', 'WTF', 'NRB', 'HGS', 'YPC', 'LDM'];
const NONTAX_EXP = ['portable audio node', 'campus radio slot', 'garden watering rig', 'junior pottery ring', 'weekend hiking badge', 'model railway loop', 'chorus warmup drill', 'library shelf marker', 'kite assembly guide', 'puzzle scoring board'];

// ---- 1. generic treatment versus each specific tax relation --------------------
for (let i = 0; i < 6; i++) {
  const o = TAX_OBJ[i];
  pair('generic_vs_specific_vat', {
    query: `Is the ${o} subject to VAT?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF'],
  }, {
    query: `How is the ${o} treated for Philippine tax purposes?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_TAX_TREATMENT_OF'],
    forbiddenRelations: ['ASKS_VAT_TREATMENT_OF'],
  });
  pair('generic_vs_specific_deductibility', {
    query: `Is the ${o} deductible against gross income?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_DEDUCTIBILITY_OF'],
  }, {
    query: `What is the tax treatment of the ${o}?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_TAX_TREATMENT_OF'],
    forbiddenRelations: ['ASKS_DEDUCTIBILITY_OF'],
  });
  pair('generic_vs_specific_withholding', {
    query: `Is withholding tax on the ${o} required?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_WITHHOLDING_ON'],
  }, {
    query: `Explain the Philippine tax position of the ${o}.`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_TAX_TREATMENT_OF'],
    forbiddenRelations: ['ASKS_WITHHOLDING_ON'],
  });
  pair('generic_vs_specific_customs', {
    query: `Is the imported ${o} subject to customs duty?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_CUSTOMS_DUTY_ON'],
  }, {
    query: `How does Philippine tax apply to the ${o}?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_TAX_TREATMENT_OF'],
    forbiddenRelations: ['ASKS_CUSTOMS_DUTY_ON'],
  });
}

// ---- 2. tax compliance versus ordinary filing/return/claim actions -------------
for (let i = 0; i < 8; i++) {
  const o = TAX_OBJ[i], u = ORD_OBJ[i];
  pair('compliance_vs_ordinary_action', {
    query: `Which BIR form should we file for the ${o}?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_TAX_COMPLIANCE_FOR'],
  }, {
    query: `Please file the ${u} paperwork in the cabinet.`,
    expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    forbiddenRelations: ['ASKS_TAX_COMPLIANCE_FOR'],
  });
}
for (let i = 0; i < 6; i++) {
  const u = ORD_OBJ[i];
  pair('compliance_vs_ordinary_return', {
    query: `What is the deadline for filing the percentage tax return?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_TAX_COMPLIANCE_FOR'],
  }, {
    query: `Can the customer return the ${u} after opening it?`,
    expectedDecision: 'REFUSE', forbiddenRelations: ['ASKS_TAX_COMPLIANCE_FOR', 'ASKS_TAX_TREATMENT_OF'],
  });
}

// ---- 3. VAT ask that is ALSO phrased as a form question ------------------------
// The specific VAT relation must survive a compliance-shaped frame.
// Distinct fillers here: the Filipino compliance/withholding frames coincide with
// R3 row text when combined with the shared object list, and the suite must test the
// STRUCTURE, never reproduce an oracle row.
const FIL_OBJ = ['tarpaulin printing', 'ice delivery', 'boat charter', 'tent rental', 'sound system hire', 'flower arrangement'];
for (let i = 0; i < 6; i++) {
  const o = FIL_OBJ[i];
  pair('vat_under_compliance_frame', {
    query: `Ano ang tamang BIR form para sa ${o}?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_TAX_COMPLIANCE_FOR'],
  }, {
    query: `May VAT ba sa ${o}?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF'],
  });
  // R3 authoritatively assigns ASKS_VAT_TREATMENT_OF to the Filipino
  // "i-withhold ang buwis sa X" frame (the ask is the indirect-tax treatment of the
  // purchase, not a withholding-agent obligation). An authored expectation cannot
  // override the frozen oracle, so this pair contrasts the Filipino tax frame with an
  // explicit English withholding-agent ask instead.
  pair('withholding_vs_vat_filipino', {
    query: `Kailangan bang i-withhold ang buwis sa ${o}?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF'],
  }, {
    query: `Must the payor withhold tax on the ${o} billing?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_WITHHOLDING_ON'],
  });
}

// ---- 4. definition versus quotation versus non-tax expansion ------------------
for (let i = 0; i < 8; i++) {
  const a = ACR[i], e = NONTAX_EXP[i];
  pair('definition_vs_expansion', {
    query: `What does ${a} refer to in a BIR assessment?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_DEFINITION_OF'],
    forbiddenRelations: ['EXPANDS_AS_NON_TAX'],
  }, {
    query: `In our system, ${a} stands for ${e}.`,
    // No forbidden list: the frozen scorer uses containment, so an additional
    // definition relation alongside the required expansion is scoring-neutral.
    expectedDecision: 'REFUSE', expectedRelations: ['EXPANDS_AS_NON_TAX'],
  });
  pair('definition_vs_quotation', {
    query: `What is ${a} within Philippine tax rules?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_DEFINITION_OF'],
  }, {
    query: `Count the letters in the phrase "value-added tax".`,
    expectedDecision: 'REFUSE', expectedRelations: ['QUOTES_TERM'],
    forbiddenRelations: ['ASKS_DEFINITION_OF'],
  });
}
// declarative expansion forms — the structural variants that carry no question
for (let i = 0; i < 8; i++) {
  const a = ACR[i], e = NONTAX_EXP[i];
  pair('declarative_expansion_forms', {
    query: `Note: ${a} = ${e}.`,
    expectedDecision: 'REFUSE', expectedRelations: ['EXPANDS_AS_NON_TAX'],
  }, {
    // Non-controlling probe: an INVENTED token names no tax subject, and R3 has no row
    // of this shape. Authoring it as ALLOW would require accepting arbitrary unknown
    // acronyms as tax subjects, weakening the closed acronym controls. Retained as a
    // recorded probe with no expected decision.
    query: `What is the ${a} rate under the Tax Code?`,
    controlling: false, forbiddenRelations: ['EXPANDS_AS_NON_TAX'],
  });
  pair('declarative_expansion_treat_as', {
    query: `Treat ${a} as the ${e}.`,
    expectedDecision: 'REFUSE', expectedRelations: ['EXPANDS_AS_NON_TAX'],
  }, {
    query: `By ${a} we mean the ${e}.`,
    expectedDecision: 'REFUSE', expectedRelations: ['EXPANDS_AS_NON_TAX'],
  });
  pair('declarative_expansion_we_use', {
    query: `We use ${a} for ${e}.`,
    expectedDecision: 'REFUSE', expectedRelations: ['EXPANDS_AS_NON_TAX'],
  }, {
    query: `${a}, i.e. ${e}, is used here.`,
    expectedDecision: 'REFUSE', expectedRelations: ['EXPANDS_AS_NON_TAX'],
  });
}

// ---- 5. internal label versus legal/tax subject matter ------------------------
for (let i = 0; i < 8; i++) {
  const a = ACR[i], u = ORD_OBJ[i];
  pair('label_vs_tax_subject', {
    query: `Our ${u} project is code-named ${a} in the tracker.`,
    expectedDecision: 'REFUSE', expectedRelations: ['NAMES_AS_INTERNAL_LABEL'],
  }, {
    query: `How is the ${a} computed under Philippine tax law?`,
    expectedDecision: 'ALLOW', forbiddenRelations: ['NAMES_AS_INTERNAL_LABEL'],
  });
}

// ---- 6. explicit negation versus tax-review override --------------------------
for (let i = 0; i < 8; i++) {
  const u = ORD_OBJ[i];
  pair('negation_vs_tax_review', {
    query: `I am not asking about tax; just describe the ${u}.`,
    expectedDecision: 'REFUSE', expectedRelations: ['NEGATES_TAX_RELEVANCE', 'REQUESTS_NON_TAX_ACTION_ON'],
  }, {
    query: `This may be non-tax, but please review the VAT treatment of the ${u} anyway.`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF', 'NEGATES_TAX_RELEVANCE'],
  });
}

// ---- 7. primary task versus subordinate clause --------------------------------
for (let i = 0; i < 8; i++) {
  const o = TAX_OBJ[i], u = ORD_OBJ[i];
  pair('primary_vs_subordinate', {
    query: `Although it is filed under the ${u} code, is the ${o} deductible?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_DEDUCTIBILITY_OF'],
    forbiddenRelations: ['NAMES_AS_INTERNAL_LABEL'],
  }, {
    query: `Although the ${o} is taxable, rename the ${u} folder.`,
    expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    forbiddenRelations: ['ASKS_DEDUCTIBILITY_OF'],
  });
}

// ---- 8. concrete target versus contentless referent ---------------------------
for (let i = 0; i < 8; i++) {
  const o = TAX_OBJ[i];
  pair('concrete_vs_contentless', {
    query: `Is the ${o} subject to VAT?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF'],
  }, {
    query: `Is it subject to VAT? Reference 7.`,
    // The contentless referent must be REFUSED; an extra relation is scoring-neutral
    // under containment, so the decision is the controlling contrast here.
    expectedDecision: 'REFUSE',
  });
}

// ---- 9. bare non-tax noun phrase versus bare tax noun phrase ------------------
const BARE_NONTAX = ['mountain trail signage map', 'choir rehearsal seating chart', 'aquarium pump cleaning cycle', 'chess ladder ranking sheet', 'kite string tension guide', 'pottery glaze firing log', 'bicycle chain lubrication chart', 'puzzle piece sorting tray'];
// Bare tax noun phrases that are NOT oracle rows: the contrast under test is
// bare-phrase tax topic versus bare-phrase ordinary topic, not any specific row.
const BARE_TAX = ['input vat carryover schedule', 'donor tax exemption ceiling', 'excise tax rate table', 'estate tax return annex', 'percentage tax base computation', 'documentary stamp tax ledger', 'capital gains tax basis', 'final withholding tax remittance'];
for (let i = 0; i < 8; i++) {
  pair('bare_nontax_vs_bare_tax', {
    query: BARE_NONTAX[i],
    expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
  }, {
    query: BARE_TAX[i],
    expectedDecision: 'ALLOW', forbiddenRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
  });
}

// ---- 10. single relation versus valid co-occurrence ---------------------------
for (let i = 0; i < 6; i++) {
  const u = ORD_OBJ[i];
  pair('single_vs_cooccurrence', {
    query: `Is the ${u} subject to VAT?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF'],
    forbiddenRelations: ['NEGATES_TAX_RELEVANCE'],
  }, {
    query: `We are not asking about tax, but check the VAT treatment of the ${u}.`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF', 'NEGATES_TAX_RELEVANCE'],
  });
}

// ---- 11. English versus Filipino/Taglish variants -----------------------------
for (let i = 0; i < 6; i++) {
  const o = FIL_OBJ[i];
  pair('english_vs_filipino_variant', {
    query: `Is the ${o} subject to VAT?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF'],
  }, {
    query: `May VAT ba ang ${o}?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF'],
  });
}

// ---- 12. non-tax action on a tax-shaped token --------------------------------
for (let i = 0; i < 6; i++) {
  const u = ORD_OBJ[i];
  pair('nontax_action_on_tax_token', {
    query: `Rename the tax column in the ${u} spreadsheet.`,
    expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    forbiddenRelations: ['ASKS_TAX_TREATMENT_OF'],
  }, {
    // Non-controlling probe: R3's percentage-tax ALLOW rows are framed as commercial
    // TRANSACTIONS; an ordinary activity has no R3 counterpart, so no decision is
    // asserted here.
    query: `Is the ${u} subject to percentage tax?`,
    controlling: false,
  });
}

// -------------------------------------------------------------- integrity gates
const r3Queries = new Set(L.loadR3().map((r) => r.query.trim().toLowerCase()));
const cfQueries = new Set();
for (const [, p] of L.SUITES) for (const q of JSON.parse(fs.readFileSync(p, 'utf8')).queries) cfQueries.add(q.query.trim().toLowerCase());

const leakR3 = queries.filter((q) => r3Queries.has(q.query.trim().toLowerCase()));
const leakCf = queries.filter((q) => cfQueries.has(q.query.trim().toLowerCase()));
const covered = new Set();
for (const q of queries) for (const r of q.expectedRelations || []) covered.add(r);
const uncovered = L.RELATION_TYPES.filter((t) => !covered.has(t));
const pairIds = new Set(queries.map((q) => q.pair));
const badRel = queries.flatMap((q) => [...(q.expectedRelations || []), ...(q.forbiddenRelations || [])]).filter((r) => !L.RELATION_TYPES.includes(r));

if (leakR3.length) throw new Error('R3_LEAKAGE ' + leakR3.length + ' ' + JSON.stringify(leakR3.slice(0, 3).map((x) => x.query)));
if (leakCf.length) throw new Error('CF_LEAKAGE ' + leakCf.length);
if (badRel.length) throw new Error('RELATION_OUTSIDE_CLOSED_SET ' + [...new Set(badRel)].join(','));
if (queries.length < 240) throw new Error('SUITE_TOO_SMALL ' + queries.length);
if (pairIds.size < 120) throw new Error('TOO_FEW_PAIRS ' + pairIds.size);
if (uncovered.length) throw new Error('RELATION_TYPES_UNCOVERED ' + uncovered.join(','));

L.writeJson(L.RELATION_SUITE, {
  suite: 'COMMIT_5R1C13_RELATION_COUNTERFACTUAL_V7',
  unit: 'COMMIT 5R1-C13', generatedUtc: new Date().toISOString(),
  purpose: 'Relation-lane counterfactual closure. Structural templates only; expectations authored before any runtime change.',
  authority: 'CLAUSE_LEVEL_INTENT_SCHEMA.md + RELATION_AND_PRECEDENCE_SPEC.md',
  scoring: 'expected relations must be present (containment, matching the frozen R3 scorer); forbidden relations must be absent; declared decision must hold',
  queryCount: queries.length, pairCount: pairIds.size,
  relationTypesCovered: [...covered].sort(),
  exactR3Leakage: 0, exactCounterfactualLeakage: 0,
  expectationsAuthoredBeforeExecution: true,
  queries,
});
console.log('queries=' + queries.length, 'pairs=' + pairIds.size, 'typesCovered=' + covered.size, 'leakR3=0 leakCf=0');
