// PHASE-10A14-R20 COMMIT 5R1-C16 — §7 pre-coding separability analysis.
// Derives RUNTIME-AVAILABLE structural features only, measures each candidate feature
// and conjunction by support / precision / coverage / counterexamples, and finds minimal
// pairs. No oracle-only feature (category, source set, rule id, template, query id) is
// ever used as a control; oracle fields appear solely to label the measurement.
import fs from 'node:fs';
import * as L from './commit5r1c16-lib.mjs';

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();

// ---------------------------------------------------------------- feature derivation
// Every field below is computable at runtime from the locked clause and relation
// evidence plus the normalized text. Nothing here reads an oracle expectation.
const TAX_CONCEPT = /\b(?:income tax|value[- ]added tax|\bvat\b|withholding tax|percentage tax|excise tax|documentary stamp|capital gains tax|estate tax|donor'?s? tax|customs dut\w*|import dut\w*|tariff|final tax|fringe benefit tax|minimum corporate income tax|regular corporate income tax|net operating loss|optional standard deduction|tax amnesty|deficiency interest|tax credit|tax refund|nolco|mcit|rcit|iaet|cgt|cwt|ewt|fwt|dst|fbt|osd)\b/i;
const TAX_PROCEDURE = /\b(?:bir form|filing|file|register\w*|registration|remit\w*|deadline|due date|penalty|alphalist|slsp|tax clearance|certificate of registration|books of account|substantiat\w*|reportorial|return)\b/i;
const EXTERNAL_OBJECT = /\b(?:purchase|sale|sales|transaction|payment|receipts?|income|expense|service|services|import|imports|asset|lease|rental|fee|fees|goods|supply|supplies|contract|billing|invoice|remuneration|compensation|commission|royalt\w*|dividend|interest income)\b/i;

const featuresOf = (q) => {
  const ev = analyze(q);
  const primary = (ev.clauses || []).find((c) => c.role === 'primary_task');
  const pt = String(primary ? primary.text : q).trim();
  const ptLo = pt.toLowerCase();
  const rels = (ev.relations || []).map((x) => x.relation);

  const interrogativeOpener = /^(?:what|which|who|whom|whose|when|where|why|how|is|are|was|were|do|does|did|can|could|should|would|may|might|will|shall|has|have|had|ano|alin|sino|paano|kailan|saan|bakit|may|magkano|kailangan)\b/i.test(ptLo);
  const imperativeOpener = /^(?:change|rename|delete|draw|paint|compile|install|download|sort|cook|play|sing|design|render|print|debug|prepare|improve|buy|organi[sz]e|fix|build|write|update|configure|adjust|schedule|edit|make|create|summari[sz]e|list|translate|explain|tune|format|archive|count|repeat|spell|reverse|proofread|ayusin|linisin|palitan|ilagay|bilhin|gawin|isulat|tanggalin|ihanda|i-[a-z]+)\b/i.test(ptLo);
  const hasQuestionMark = /\?/.test(pt);

  return {
    // speech act
    reasonSpeechAct: imperativeOpener ? 'request'
      : interrogativeOpener ? 'question'
      : hasQuestionMark ? 'question_marked_assertion' : 'assertion',
    // clause role / context scope
    clauseCount: (ev.clauses || []).length,
    reasonContextScope: (ev.clauses || []).length > 1 ? 'multi_clause' : 'single_clause',
    // primary task head
    primaryTaskHead: (ptLo.match(/^([a-z-]+)/) || [, ''])[1] || '',
    requestedActionExplicit: !!(primary && primary.taskVerb),
    requestedTargetPresent: !!(primary && primary.taskObject),
    // predicate class
    reasonPredicateClass: /\bdeductib\w*\b/i.test(ptLo) ? 'deductibility'
      : /\bvat\b|value[- ]added/i.test(ptLo) ? 'vat'
      : /\bwithhold\w*/i.test(ptLo) ? 'withholding'
      : /\bcustoms|tariff|dutiable/i.test(ptLo) ? 'customs'
      : /\btaxab\w*|subject to tax/i.test(ptLo) ? 'taxability'
      : TAX_PROCEDURE.test(ptLo) ? 'procedure'
      : TAX_CONCEPT.test(ptLo) ? 'tax_concept' : 'none',
    // relation evidence (already locked)
    reasonControllingRelation: rels.length ? rels[0] : '(none)',
    relationSet: rels.slice().sort().join('+') || '(none)',
    // target semantic role — the §9C distinction
    targetIsTaxConceptItself: TAX_CONCEPT.test(ptLo) && !EXTERNAL_OBJECT.test(ptLo),
    targetIsExternalObject: EXTERNAL_OBJECT.test(ptLo),
    targetIsTaxProcedure: TAX_PROCEDURE.test(ptLo),
    // acts
    definitionAct: /\b(?:mean|means|meaning|refer to|refers to|stand for|stands for|define|definition)\b/i.test(ptLo),
    namingAct: /\b(?:is (?:only |just )?(?:an?|our) (?:internal )?(?:label|name|code|codename)|code-?named|is called)\b/i.test(ptLo),
    quotationAct: /\b(?:count the (?:letters?|words?)|spell|repeat the|alphabeti[sz]e|proofread|into plain english|the (?:phrase|word|term))\b/i.test(ptLo),
    expansionAct: /\bstands for\b|\bi\.e\.\b|\s=\s|\bwe use\b.*\bfor\b/i.test(ptLo),
    // resolution
    reasonUnresolvedKind: (ev.ambiguityFlags || []).includes('ambiguous_acronym') ? 'acronym'
      : (ev.ambiguityFlags || []).includes('dangling_referent') ? 'referent' : 'none',
    // negation
    negationScope: rels.includes('NEGATES_TAX_RELEVANCE') ? 'present' : 'absent',
    decision: ev.decision,
    actualReason: ev.reasonCode,
  };
};

// -------------------------------------------------------------------- measurement
const residual = [];
for (const r of rows) {
  const ev = analyze(r.query);
  if (ev.reasonCode === r.expectedReasonCodeFamily) continue;
  residual.push({ row: r, f: featuresOf(r.query) });
}

/** Measure a boolean feature over the WHOLE oracle, by expected reason. */
const measure = (name, pred) => {
  const support = { total: 0, byExpected: {} };
  const negative = { total: 0, byExpected: {} };
  for (const r of rows) {
    const f = featuresOf(r.query);
    const bucket = pred(f, r) ? support : negative;
    bucket.total++;
    bucket.byExpected[r.expectedReasonCodeFamily] = (bucket.byExpected[r.expectedReasonCodeFamily] || 0) + 1;
  }
  const top = Object.entries(support.byExpected).sort((a, b) => b[1] - a[1])[0] || ['(none)', 0];
  const precision = support.total ? top[1] / support.total : 0;
  const totalOfTop = rows.filter((r) => r.expectedReasonCodeFamily === top[0]).length;
  return {
    feature: name,
    support: support.total,
    dominantExpectedReason: top[0],
    dominantCount: top[1],
    precision: Number(precision.toFixed(4)),
    coverageOfDominant: totalOfTop ? Number((top[1] / totalOfTop).toFixed(4)) : 0,
    counterexampleCount: support.total - top[1],
    supportByExpected: support.byExpected,
    negativeByExpected: negative.byExpected,
  };
};

const candidates = [
  ['speech_act_request', (f) => f.reasonSpeechAct === 'request'],
  ['speech_act_question', (f) => f.reasonSpeechAct === 'question'],
  ['speech_act_assertion', (f) => f.reasonSpeechAct === 'assertion'],
  ['explicit_action_head_and_target', (f) => f.requestedActionExplicit && f.requestedTargetPresent],
  ['explicit_action_head_only', (f) => f.requestedActionExplicit && !f.requestedTargetPresent],
  ['target_is_tax_concept_itself', (f) => f.targetIsTaxConceptItself],
  ['target_is_external_object', (f) => f.targetIsExternalObject],
  ['target_is_tax_procedure', (f) => f.targetIsTaxProcedure],
  ['tax_concept_and_no_external_object', (f) => f.targetIsTaxConceptItself && !f.targetIsExternalObject],
  ['external_object_under_tax_predicate', (f) => f.targetIsExternalObject && f.reasonPredicateClass !== 'none'],
  ['procedure_requested_outcome', (f) => f.targetIsTaxProcedure && f.reasonPredicateClass === 'procedure'],
  ['naming_act', (f) => f.namingAct],
  ['quotation_act', (f) => f.quotationAct],
  ['expansion_act', (f) => f.expansionAct],
  ['definition_act', (f) => f.definitionAct],
  ['unresolved_acronym', (f) => f.reasonUnresolvedKind === 'acronym'],
  ['unresolved_referent', (f) => f.reasonUnresolvedKind === 'referent'],
  ['negation_present', (f) => f.negationScope === 'present'],
  ['request_with_action_target', (f) => f.reasonSpeechAct === 'request' && f.requestedTargetPresent],
  ['question_no_tax_predicate', (f) => f.reasonSpeechAct === 'question' && f.reasonPredicateClass === 'none'],
  ['assertion_no_tax_predicate', (f) => f.reasonSpeechAct === 'assertion' && f.reasonPredicateClass === 'none'],
];

const measured = candidates.map(([n, p]) => measure(n, p)).sort((a, b) => b.precision - a.precision);

L.writeJson(L.RES + 'COMMIT_5R1C16_REASON_FEATURE_SEPARABILITY.json', {
  unit: 'COMMIT 5R1-C16', generatedUtc: new Date().toISOString(),
  method: 'Each candidate feature is computed from runtime-available clause/relation evidence only and measured over all 3,720 R3 rows. Precision is the share of the dominant expected reason within the feature support set; coverage is the share of that reason captured; counterexamples are support rows carrying any other expected reason.',
  prohibitedControls: ['mere tax-token presence', 'mere homograph-token presence on an imperative', 'primaryCategory or any oracle metadata', 'exact template/query/source-set/ID matching'],
  featureCount: measured.length,
  measured,
});

// ------------------------------------------------------------------ minimal pairs
// A minimal pair: two rows whose runtime feature vectors differ in exactly ONE field
// while the expected reason differs. These are the only rules worth implementing.
const KEYS = ['reasonSpeechAct', 'reasonPredicateClass', 'reasonControllingRelation', 'targetIsTaxConceptItself', 'targetIsExternalObject', 'targetIsTaxProcedure', 'namingAct', 'quotationAct', 'expansionAct', 'definitionAct', 'reasonUnresolvedKind', 'negationScope', 'requestedActionExplicit', 'requestedTargetPresent'];
const vec = (f) => KEYS.map((k) => `${k}=${f[k]}`);

const sample = rows.filter((_, i) => i % 3 === 0);
const cache = sample.map((r) => ({ r, f: featuresOf(r.query), v: vec(featuresOf(r.query)) }));
const pairs = [];
for (let i = 0; i < cache.length && pairs.length < 400; i++) {
  for (let j = i + 1; j < cache.length && pairs.length < 400; j++) {
    if (cache[i].r.expectedReasonCodeFamily === cache[j].r.expectedReasonCodeFamily) continue;
    let diff = -1, n = 0;
    for (let k = 0; k < KEYS.length; k++) if (cache[i].v[k] !== cache[j].v[k]) { diff = k; n++; if (n > 1) break; }
    if (n === 1) {
      pairs.push({
        discriminatingFeature: KEYS[diff],
        aValue: cache[i].f[KEYS[diff]], bValue: cache[j].f[KEYS[diff]],
        aExpectedReason: cache[i].r.expectedReasonCodeFamily, bExpectedReason: cache[j].r.expectedReasonCodeFamily,
        aActualReason: cache[i].f.actualReason, bActualReason: cache[j].f.actualReason,
        aOracleId: cache[i].r.oracleId, bOracleId: cache[j].r.oracleId,
      });
    }
  }
}
const byFeature = {};
for (const p of pairs) {
  byFeature[p.discriminatingFeature] ??= { count: 0, transitions: {} };
  byFeature[p.discriminatingFeature].count++;
  const t = `${p.aExpectedReason} | ${p.bExpectedReason}`;
  byFeature[p.discriminatingFeature].transitions[t] = (byFeature[p.discriminatingFeature].transitions[t] || 0) + 1;
}

// Residual coverage: are all 614 rows represented in the derived feature space?
const residualVectors = {};
for (const { row, f } of residual) {
  const key = `${f.reasonSpeechAct}|${f.reasonPredicateClass}|${f.reasonControllingRelation}|${f.reasonUnresolvedKind}`;
  residualVectors[key] ??= { count: 0, expected: {}, actual: {}, exampleOracleIds: [] };
  residualVectors[key].count++;
  residualVectors[key].expected[row.expectedReasonCodeFamily] = (residualVectors[key].expected[row.expectedReasonCodeFamily] || 0) + 1;
  residualVectors[key].actual[f.actualReason] = (residualVectors[key].actual[f.actualReason] || 0) + 1;
  if (residualVectors[key].exampleOracleIds.length < 3) residualVectors[key].exampleOracleIds.push(row.oracleId);
}
// A vector is SEPARABLE when all its residual rows share one expected reason.
const vectorSummary = Object.entries(residualVectors).map(([k, v]) => ({
  vector: k, count: v.count,
  distinctExpectedReasons: Object.keys(v.expected).length,
  separable: Object.keys(v.expected).length === 1,
  expected: v.expected, actual: v.actual, exampleOracleIds: v.exampleOracleIds,
})).sort((a, b) => b.count - a.count);

const separableRows = vectorSummary.filter((v) => v.separable).reduce((n, v) => n + v.count, 0);
const collidingRows = vectorSummary.filter((v) => !v.separable).reduce((n, v) => n + v.count, 0);

L.writeJson(L.RES + 'COMMIT_5R1C16_REASON_MINIMAL_PAIR_ANALYSIS.json', {
  unit: 'COMMIT 5R1-C16', generatedUtc: new Date().toISOString(),
  featureKeys: KEYS,
  minimalPairsFound: pairs.length,
  minimalPairsByDiscriminatingFeature: byFeature,
  residualRowsRepresented: residual.length,
  residualFeatureVectors: vectorSummary.length,
  residualRowsInSeparableVectors: separableRows,
  residualRowsInCollidingVectors: collidingRows,
  vectorSummary: vectorSummary.slice(0, 60),
  note: 'A residual row is separable only when every residual row sharing its runtime feature vector carries the same expected reason. Rows in colliding vectors cannot be fixed by any rule over these features and require a further feature, not a narrower regex.',
  oracleIdsAreAnalysisEvidenceOnly: true,
});

console.log('residual rows =', residual.length);
console.log('distinct residual feature vectors =', vectorSummary.length);
console.log('rows in SEPARABLE vectors =', separableRows);
console.log('rows in COLLIDING vectors =', collidingRows);
console.log('minimal pairs =', pairs.length);
console.log('\ntop features by precision:');
for (const m of measured.slice(0, 12)) {
  console.log(`  ${m.feature.padEnd(36)} support=${String(m.support).padStart(4)} prec=${m.precision.toFixed(3)} cov=${m.coverageOfDominant.toFixed(3)} ctr=${String(m.counterexampleCount).padStart(4)} -> ${m.dominantExpectedReason}`);
}
console.log('\nlargest residual vectors:');
for (const v of vectorSummary.slice(0, 12)) {
  console.log(`  n=${String(v.count).padStart(3)} sep=${v.separable ? 'Y' : 'N'}  ${v.vector}`);
  console.log(`        expected=${JSON.stringify(v.expected)}`);
}
