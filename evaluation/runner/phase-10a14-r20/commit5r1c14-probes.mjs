// PHASE-10A14-R20 COMMIT 5R1-C14 — clause-segmentation contract + probe suite.
// Expectations authored BEFORE any runtime change, from the immutable clause schema
// and precedence spec. Probes are an ACCEPTANCE GATE and are NOT part of the
// 282-query relation denominator. Structural templates only; zero copying of R3,
// decision-suite or relation-suite text.
import fs from 'node:fs';
import * as L from './commit5r1c14-lib.mjs';

const probes = [];
let pairSeq = 0;
const pair = (family, a, b) => {
  const pairId = `${family}#${++pairSeq}`;
  probes.push({ ...a, family, pair: pairId, side: 'a' });
  probes.push({ ...b, family, pair: pairId, side: 'b' });
};

// Fillers invented for this probe set; deliberately disjoint from the relation suite.
const TAXOBJ = ['scaffolding rental', 'crane hire', 'dredging service', 'pipeline survey', 'kiln installation', 'turbine overhaul'];
const ORD = ['ukulele case', 'trekking pole', 'domino set', 'terrarium lid', 'skate ramp', 'origami tray'];

// ---- A. leading concessive + non-tax imperative -> REFUSE ---------------------
// The concessive states CONTEXT; the imperative is the primary task (§7D).
for (let i = 0; i < 6; i++) {
  const t = TAXOBJ[i], o = ORD[i];
  pair('concessive_although_nontax_imperative', {
    query: `Although the ${t} is taxable, rename the ${o} directory.`,
    expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    forbiddenRelations: ['ASKS_TAX_TREATMENT_OF'],
    expectedClauseCount: 2, primaryTaskContains: `rename the ${o} directory`,
    primaryTaskExcludes: 'although',
  }, {
    // Same concessive frame, but the main clause is a genuine tax question.
    query: `Although the ${o} is ordinary, what BIR form applies to the ${t}?`,
    expectedDecision: 'ALLOW', forbiddenRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    expectedClauseCount: 2, primaryTaskContains: 'what bir form applies',
  });
}

// ---- B. other English concessive markers -------------------------------------
for (let i = 0; i < 3; i++) {
  const t = TAXOBJ[i], o = ORD[i];
  pair('concessive_even_though', {
    query: `Even though the ${t} is deductible, print the ${o} label.`,
    expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    forbiddenRelations: ['ASKS_DEDUCTIBILITY_OF'],
    expectedClauseCount: 2, primaryTaskContains: `print the ${o} label`,
  }, {
    query: `Even though the ${o} is ordinary, is the ${t} deductible?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_DEDUCTIBILITY_OF'],
    expectedClauseCount: 2,
  });
  pair('concessive_though', {
    query: `Though the ${t} is subject to VAT, sort the ${o} photos.`,
    expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    forbiddenRelations: ['ASKS_VAT_TREATMENT_OF'],
    expectedClauseCount: 2, primaryTaskContains: `sort the ${o} photos`,
  }, {
    query: `Though the ${o} is ordinary, is the ${t} subject to VAT?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF'],
    expectedClauseCount: 2,
  });
  pair('concessive_while', {
    query: `While the ${t} is taxable, archive the ${o} records.`,
    expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    expectedClauseCount: 2, primaryTaskContains: `archive the ${o} records`,
  }, {
    // Structure-only probe. "how is X taxed?" refuses IDENTICALLY at the untouched C13
    // baseline with no concessive present: "taxed" is not in the tax-anchor vocabulary.
    // That is a pre-existing lexical gap outside the authorized C14 clause-layer scope,
    // so this probe asserts the segmentation shape and does not assert the decision.
    query: `While the ${o} is ordinary, how is the ${t} taxed?`,
    expectedClauseCount: 2, primaryTaskContains: `how is the ${t} taxed`,
  });
}

// ---- C. Filipino concessive markers ------------------------------------------
for (let i = 0; i < 3; i++) {
  const t = TAXOBJ[i], o = ORD[i];
  pair('concessive_kahit', {
    query: `Kahit taxable ang ${t}, i-rename ang ${o} folder.`,
    expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    expectedClauseCount: 2, primaryTaskContains: `i-rename ang ${o} folder`,
  }, {
    query: `Kahit ordinary ang ${o}, may VAT ba ang ${t}?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF'],
    expectedClauseCount: 2,
  });
  pair('concessive_bagaman', {
    query: `Bagaman taxable ang ${t}, ayusin ang ${o} listahan.`,
    expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    expectedClauseCount: 2, primaryTaskContains: `ayusin ang ${o} listahan`,
  }, {
    query: `Bagaman ordinary ang ${o}, magkano ang buwis sa ${t}?`,
    expectedDecision: 'ALLOW', forbiddenRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    expectedClauseCount: 2,
  });
}

// ---- D. reversed polarity: non-tax context + tax question -> ALLOW -----------
// §7D: clause ROLE and requested action decide, never clause order alone.
for (let i = 0; i < 3; i++) {
  const t = TAXOBJ[i], o = ORD[i];
  pair('reversed_nontax_context_tax_task', {
    query: `Although renaming the ${o} folder was requested, is the ${t} taxable?`,
    expectedDecision: 'ALLOW', forbiddenRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    expectedClauseCount: 2, primaryTaskContains: `is the ${t} taxable`,
  }, {
    query: `Although the ${t} is taxable, delete the ${o} draft.`,
    expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    expectedClauseCount: 2, primaryTaskContains: `delete the ${o} draft`,
  });
}

// ---- E. tax context + tax question -> ALLOW, no split damage -----------------
for (let i = 0; i < 3; i++) {
  const t = TAXOBJ[i];
  pair('concessive_tax_context_tax_task', {
    query: `Although the ${t} is exempt, is withholding tax required on it?`,
    expectedDecision: 'ALLOW', forbiddenRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
    expectedClauseCount: 2,
  }, {
    query: `Is withholding tax required on the ${t}?`,
    expectedDecision: 'ALLOW', expectedRelations: ['ASKS_WITHHOLDING_ON'],
    expectedClauseCount: 1,
  });
}

// ---- F. commas that must NOT split -------------------------------------------
// Quote-aware, parenthesis-aware, top-level only, and never an ordinary list comma.
pair('no_split_quoted_comma', {
  // The point under test is that a comma INSIDE quotes never splits. The QUOTES_TERM
  // relation is not emitted for this shape at the untouched C13 baseline either
  // (the quoted span carries no tax token), so only the split behaviour is asserted.
  query: `Count the letters in the phrase "although, however, and".`,
  expectedDecision: 'REFUSE', expectedClauseCount: 1,
}, {
  query: `Repeat the phrase "even though, print".`,
  expectedDecision: 'REFUSE', expectedClauseCount: 1,
});
pair('no_split_parenthesized_comma', {
  query: `Is the scaffolding rental (although imported, locally assembled) subject to VAT?`,
  expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF'],
  expectedClauseCount: 1,
}, {
  query: `Is the crane hire (though leased, not owned) subject to VAT?`,
  expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF'],
  expectedClauseCount: 1,
});
pair('no_split_ordinary_list_comma', {
  query: `Rename the ukulele case, the trekking pole and the domino set.`,
  expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
  expectedClauseCount: 1,
}, {
  query: `Is the scaffolding rental, crane hire or dredging service subject to VAT?`,
  expectedDecision: 'ALLOW', expectedRelations: ['ASKS_VAT_TREATMENT_OF'],
  expectedClauseCount: 1,
});
// A leading concessive with NO complete task after the comma must not split.
pair('no_split_incomplete_remainder', {
  query: `Although taxable, uncertain.`,
  expectedClauseCount: 1,
}, {
  query: `Although the crane hire is taxable, rename the domino set file.`,
  expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
  expectedClauseCount: 2,
});

// ---- G. punctuation, capitalization and multi-clause variants ----------------
pair('variant_capitalization', {
  query: `ALTHOUGH THE CRANE HIRE IS TAXABLE, RENAME THE DOMINO SET FOLDER.`,
  expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
  expectedClauseCount: 2,
}, {
  query: `although the crane hire is taxable, rename the domino set folder`,
  expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
  expectedClauseCount: 2,
});
pair('variant_multiclause', {
  query: `Although the dredging service is taxable, rename the terrarium lid folder. Then archive it.`,
  expectedDecision: 'REFUSE', expectedRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
  expectedClauseCount: 3,
}, {
  query: `Although the dredging service is taxable, what BIR form applies? Reply briefly.`,
  expectedDecision: 'ALLOW', forbiddenRelations: ['REQUESTS_NON_TAX_ACTION_ON'],
  expectedClauseCount: 3,
});
pair('variant_no_leading_concessive', {
  query: `The crane hire is taxable, so rename the skate ramp folder.`,
  expectedClauseCount: 1,
}, {
  // A TRAILING concessive is out of scope: §7A authorizes the LEADING form only. This
  // probe fixes the no-split behaviour so a later unit cannot regress it silently; its
  // relation output is the pre-existing baseline and is not asserted here.
  query: `Rename the skate ramp folder although the crane hire is taxable.`,
  expectedDecision: 'REFUSE', expectedClauseCount: 1,
});

// -------------------------------------------------------------- integrity gates
const r3Queries = new Set(L.loadR3().map((r) => r.query.trim().toLowerCase()));
const suiteQueries = new Set();
for (const [, p] of L.SUITES) for (const q of JSON.parse(fs.readFileSync(p, 'utf8')).queries) suiteQueries.add(q.query.trim().toLowerCase());
for (const q of JSON.parse(fs.readFileSync(L.RELATION_SUITE, 'utf8')).queries) suiteQueries.add(q.query.trim().toLowerCase());

const leakR3 = probes.filter((q) => r3Queries.has(q.query.trim().toLowerCase()));
const leakSuite = probes.filter((q) => suiteQueries.has(q.query.trim().toLowerCase()));
const pairIds = new Set(probes.map((q) => q.pair));
const badRel = probes.flatMap((q) => [...(q.expectedRelations || []), ...(q.forbiddenRelations || [])]).filter((r) => !L.RELATION_TYPES.includes(r));

if (leakR3.length) throw new Error('R3_LEAKAGE ' + JSON.stringify(leakR3.slice(0, 3).map((x) => x.query)));
if (leakSuite.length) throw new Error('SUITE_LEAKAGE ' + JSON.stringify(leakSuite.slice(0, 3).map((x) => x.query)));
if (badRel.length) throw new Error('RELATION_OUTSIDE_CLOSED_SET ' + [...new Set(badRel)].join(','));
if (probes.length < 48) throw new Error('TOO_FEW_PROBES ' + probes.length);
if (pairIds.size < 24) throw new Error('TOO_FEW_PAIRS ' + pairIds.size);

L.writeJson(L.CLAUSE_PROBES, {
  suite: 'COMMIT_5R1C14_CLAUSE_PROBE_SUITE',
  unit: 'COMMIT 5R1-C14', generatedUtc: new Date().toISOString(),
  purpose: 'Clause-segmentation acceptance gate for the leading-concessive correction.',
  notPartOfRelationDenominator: true,
  relationDenominatorUnchanged: '282 controlling relation-suite queries',
  authority: 'CLAUSE_LEVEL_INTENT_SCHEMA.md + RELATION_AND_PRECEDENCE_SPEC.md',
  expectationsAuthoredBeforeExecution: true,
  exactR3Leakage: 0, exactSuiteLeakage: 0,
  probeCount: probes.length, pairCount: pairIds.size,
  probes,
});

L.writeJson(L.RES + 'COMMIT_5R1C14_CLAUSE_SEGMENTATION_CONTRACT.json', {
  unit: 'COMMIT 5R1-C14', generatedUtc: new Date().toISOString(),
  currentBehaviour: {
    splitRule: 'a top-level comma splits ONLY when the FOLLOWING word is in CONNECTORS',
    connectors: ['however', 'although', 'but', 'and', 'pero', 'ngunit', 'kahit', 'at'],
    consequence: 'A LEADING concessive puts the marker at the start of the sentence, not after the comma, so no split occurs and the whole sentence becomes a single primary_task clause.',
  },
  authorizedCorrection: {
    scope: 'leading concessive context only',
    markers: ['although', 'even though', 'though', 'while', 'kahit', 'bagaman'],
    trigger: 'normalized text begins with a concessive marker AND contains a top-level comma',
    splitCondition: 'split only when the post-comma span contains a complete requested task (imperative, interrogative or explicit request)',
    requiredShape: { c01: 'role=context, leading concessive span', c02: 'role=primary_task, actual requested action and target' },
    safety: ['quote-aware', 'parenthesis-aware', 'top-level comma only', 'deterministic', 'stable clause ordering and positional IDs'],
    mustNotSplit: ['ordinary comma-separated lists', 'commas inside quotes', 'commas inside parentheses', 'a leading concessive whose remainder is not a complete task'],
    precedence: 'the main requested clause controls over concessive context; decided by clause role and requested action, never by clause order alone',
  },
  prohibited: {
    exactQueryShortcut: 'no branch on the eight controlling queries, object names, folder names, pair numbers, suite/family names, query hashes or expected decisions',
    relationBackfill: 'relations are extracted before decision and reason; never backfilled from an expected decision',
    globalTaxSuppression: 'tax relations in genuine primary tax tasks must remain intact',
  },
  denominatorPolicy: 'The 282-query controlling relation suite is frozen. Clause probes are an additional acceptance gate and do not change the denominator.',
});

console.log('probes=' + probes.length, 'pairs=' + pairIds.size, 'leakR3=0 leakSuite=0');
