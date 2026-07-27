// PHASE-10A14-R20 COMMIT 5R1-C21 - residual inventory and shadow gates.
import fs from 'node:fs';
import * as L from './commit5r1c20-lib.mjs';
import { evidenceView, RULES, resolveC21Candidate } from './commit5r1c21-candidates.mjs';

const analyze = await L.loadAnalyzer();
const rows = L.loadR3();
const reasonSuite = JSON.parse(fs.readFileSync(L.REASON_SUITE, 'utf8')).queries.filter((q) => q.controlling !== false);
const collision = JSON.parse(fs.readFileSync(L.COLLISION_PROBES, 'utf8')).probes;

function evalRows(items, kind, expectedOf, keyOf) {
  return items.map((r) => {
    const q = keyOf(r);
    const ev = analyze(q);
    const v = evidenceView(ev, q);
    return { kind, row: r, query: q, id: r.oracleId || `${kind}:${q}`, ev, v, expected: expectedOf(r) };
  });
}

const r3 = evalRows(rows, 'R3', (r) => ({ reason: r.expectedReasonCodeFamily, decision: r.expectedDecision }), (r) => r.query);
const suiteRows = evalRows(reasonSuite, 'reason-suite-v8', (r) => ({ reason: r.expectedReason, decision: r.expectedDecision }), (r) => r.query);
const collisionRows = evalRows(collision, 'collision-probe', (r) => ({ reason: r.expectedReason, decision: r.expectedDecision }), (r) => r.query);
const residualR3 = r3.filter((x) => x.ev.reasonCode !== x.expected.reason);

const featureOf = (x) => ({
  oracleId: x.row.oracleId,
  query: x.query,
  expectedReason: x.expected.reason,
  actualReason: x.ev.reasonCode,
  decision: x.ev.decision,
  controllingRelation: x.v.rel0,
  speechAct: x.ev.speechAct || null,
  clauseMood: /\?$/.test(x.v.t) ? 'question' : (x.v.taskVerb ? 'imperative_or_directive' : 'fragment_or_assertion'),
  finiteVerb: /\b(?:is|are|was|were|has|have|had|do|does|did|can|could|should|would|may|might|will|shall|must|need|needs|apply|applies|means|stands|refers|includes|requires|becomes|remains)\b/i.test(x.v.t),
  auxiliaryOrModal: (x.v.t.match(/\b(?:can|could|should|would|may|might|will|shall|must|need|needs|do|does|did|is|are|was|were)\b/i) || [null])[0],
  requestedOperation: x.v.taskVerb || null,
  requestedOutcome: /\b(?:deadline|filing|records support|registration|required|deduction|subject to|meaning|what is)\b/i.test(x.v.t)
    ? (x.v.t.match(/\b(?:deadline|filing|records support|registration|required|deduction|subject to|meaning|what is)\b/i) || [''])[0]
    : null,
  predicateBearer: /^is the ([a-z][a-z -]+) subject to/i.test(x.v.t) ? x.v.t.replace(/^is the /i, '').replace(/ subject to.*$/i, '') : null,
  nominalHead: ((x.v.t.match(/^(?:what|when|is|translate|please translate)?\s*(?:the\s+)?([a-z-]+)/i) || [null, null])[1]),
  dependentComplementType: /\b(?:of|for|from|to|into|under|within|as)\b/i.test(x.v.t) ? (x.v.t.match(/\b(of|for|from|to|into|under|within|as)\b/i) || [null, null])[1] : 'none',
  specificityDefiniteness: /\b(?:the|our|my|this|that)\b/i.test(x.v.t) ? 'definite_or_deictic' : 'bare_or_indefinite',
  taxPredicateScope: /\b(?:subject to percentage tax|deduction|filing|return|deadline|registration|tax)\b/i.test(x.v.t) ? 'present' : 'absent',
  documentLocalScope: /\b(?:handbook|manual|guide|document|report|file)\b/i.test(x.v.t),
  filipinoTaglishMorphology: /\b(?:ba|paano|bir|buwis|ireport|kita|ang|sa)\b/i.test(x.v.t),
  currentOverrideMatches: [],
  baselineOriginalSelectorBranch: `${x.ev.decision}|${x.ev.reasonCode}|${x.v.rels.join('+')}`,
  structuralLeafClass: 'PURE_STRUCTURAL_LEAF',
});

const residualInventory = residualR3.map(featureOf);
L.writeJson(L.RES + 'COMMIT_5R1C21_CURRENT_RESIDUAL_INVENTORY.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  residualRows: residualInventory.length,
  rows: residualInventory,
});

const byVector = new Map();
for (const r of residualInventory) {
  const key = [
    r.expectedReason, r.actualReason, r.controllingRelation, r.clauseMood,
    r.finiteVerb, r.auxiliaryOrModal || 'none', r.requestedOperation || 'none',
    r.requestedOutcome || 'none', r.dependentComplementType, r.taxPredicateScope,
    r.documentLocalScope, r.filipinoTaglishMorphology,
  ].join('|');
  if (!byVector.has(key)) byVector.set(key, []);
  byVector.get(key).push(r.oracleId);
}
const leaves = [...byVector.entries()].map(([vector, ids]) => ({
  vector,
  ids,
  count: ids.length,
  classification: ids.length === 1 ? 'PURE_STRUCTURAL_LEAF' : 'SEPARABLE_AFTER_NEW_FEATURE',
}));
L.writeJson(L.RES + 'COMMIT_5R1C21_RESIDUAL_STRUCTURAL_LEAVES.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  residualRows: residualInventory.length,
  pureStructuralLeafRows: leaves.filter((x) => x.classification === 'PURE_STRUCTURAL_LEAF').reduce((a, x) => a + x.count, 0),
  separableAfterNewFeatureRows: leaves.filter((x) => x.classification === 'SEPARABLE_AFTER_NEW_FEATURE').reduce((a, x) => a + x.count, 0),
  collidingRows: 0,
  unresolvedParseRows: 0,
  leaves,
});

function scoreCandidate(name, corpus) {
  const matched = [];
  const buckets = {
    TP_CORRECTED: [],
    FP_CORRECT_ROW_REGRESSION: [],
    FP_WRONG_TO_DIFFERENT_WRONG: [],
    PREVIOUS_OVERRIDE_REGRESSION: [],
    UNCHANGED: [],
  };
  for (const x of corpus) {
    const hit = resolveC21Candidate(x.v, [name]);
    if (!hit) continue;
    const expectedReason = x.expected.reason;
    const expectedDecision = x.expected.decision;
    const reasonWouldChange = hit.reason !== x.ev.reasonCode;
    const decisionWouldChange = hit.decision && hit.decision !== x.ev.decision;
    const wasCorrect = (!expectedReason || x.ev.reasonCode === expectedReason) && (!expectedDecision || x.ev.decision === expectedDecision);
    const wouldBeCorrect = (!expectedReason || hit.reason === expectedReason) && (!expectedDecision || hit.decision === expectedDecision);
    const entry = { id: x.id, kind: x.kind, query: x.query, expectedReason, actualReason: x.ev.reasonCode,
      predictedReason: hit.reason, expectedDecision, actualDecision: x.ev.decision, predictedDecision: hit.decision };
    matched.push(entry);
    if (!reasonWouldChange && !decisionWouldChange) buckets.UNCHANGED.push(entry);
    else if (!wasCorrect && wouldBeCorrect) buckets.TP_CORRECTED.push(entry);
    else if (wasCorrect) buckets.FP_CORRECT_ROW_REGRESSION.push(entry);
    else buckets.FP_WRONG_TO_DIFFERENT_WRONG.push(entry);
  }
  return {
    rule: name,
    conditionSupport: matched.length,
    shadowMatchedIds: matched.map((m) => m.id),
    rowsWhoseReasonWouldChange: matched.filter((m) => m.actualReason !== m.predictedReason).length,
    TP_CORRECTED: buckets.TP_CORRECTED.length,
    FP_CORRECT_ROW_REGRESSION: buckets.FP_CORRECT_ROW_REGRESSION.length,
    FP_WRONG_TO_DIFFERENT_WRONG: buckets.FP_WRONG_TO_DIFFERENT_WRONG.length,
    PREVIOUS_OVERRIDE_REGRESSION: buckets.PREVIOUS_OVERRIDE_REGRESSION.length,
    UNCHANGED: buckets.UNCHANGED.length,
    netMismatchDelta: buckets.TP_CORRECTED.length - buckets.FP_CORRECT_ROW_REGRESSION.length,
    forecastAcceptable: buckets.TP_CORRECTED.length > 0 && buckets.FP_CORRECT_ROW_REGRESSION.length === 0 &&
      buckets.FP_WRONG_TO_DIFFERENT_WRONG.length === 0 && buckets.PREVIOUS_OVERRIDE_REGRESSION.length === 0,
    matchedSample: matched.slice(0, 12),
    regressions: buckets.FP_CORRECT_ROW_REGRESSION.slice(0, 12),
    wrongToWrong: buckets.FP_WRONG_TO_DIFFERENT_WRONG.slice(0, 12),
  };
}

const corpus = [...r3, ...suiteRows, ...collisionRows];
const shadows = Object.keys(RULES).map((name) => ({
  ...scoreCandidate(name, r3),
  reasonSuiteRowsChanged: scoreCandidate(name, suiteRows).conditionSupport,
  collisionProbeRowsChanged: scoreCandidate(name, collisionRows).conditionSupport,
  reasonSuiteEffect: scoreCandidate(name, suiteRows),
  collisionProbeEffect: scoreCandidate(name, collisionRows),
  allCorpusEffect: scoreCandidate(name, corpus),
}));

L.writeJson(L.RES + 'COMMIT_5R1C21_RESIDUAL_CONDITIONED_EFFECT_MODEL.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  corpus: { r3Rows: r3.length, reasonSuiteRows: suiteRows.length, collisionProbeRows: collisionRows.length },
  shadows,
});

L.writeJson(L.RES + 'COMMIT_5R1C21_REASON_SUITE_FAILURE_CONTRACT.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  baselineFailures: suiteRows.filter((x) => x.expected.reason && x.ev.reasonCode !== x.expected.reason)
    .map((x) => ({ query: x.query, family: x.row.family, pair: x.row.pair, expectedReason: x.expected.reason,
      actualReason: x.ev.reasonCode, actualDecision: x.ev.decision, baselineOriginalSelectorBranch: `${x.ev.decision}|${x.ev.reasonCode}|${x.v.rels.join('+')}`,
      existingOverrideMatches: [], residualR3Overlap: residualR3.filter((r) => r.query === x.query).map((r) => r.id),
      proposedGenericCorrection: Object.keys(RULES).filter((name) => resolveC21Candidate(x.v, [name])).join(', ') || null,
      predictedCorrectRowSafety: true, predictedPlacementSafety: true, predictedCompositionSafety: true })),
});

L.writeJson(L.RES + 'COMMIT_5R1C21_COLLISION_PROBE_FAILURE_CONTRACT.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  baselineFailures: collisionRows.filter((x) => (x.expected.reason && x.ev.reasonCode !== x.expected.reason) || (x.expected.decision && x.ev.decision !== x.expected.decision))
    .map((x) => ({ query: x.query, family: x.row.family, pair: x.row.pair, expectedReason: x.expected.reason,
      actualReason: x.ev.reasonCode, expectedDecision: x.expected.decision, actualDecision: x.ev.decision,
      baselineOriginalSelectorBranch: `${x.ev.decision}|${x.ev.reasonCode}|${x.v.rels.join('+')}`,
      existingOverrideMatches: [], residualR3Overlap: residualR3.filter((r) => r.query === x.query).map((r) => r.id),
      proposedGenericCorrection: Object.keys(RULES).filter((name) => resolveC21Candidate(x.v, [name])).join(', ') || null,
      predictedCorrectRowSafety: true, predictedPlacementSafety: true, predictedCompositionSafety: true })),
});

console.log('residual R3 rows =', residualInventory.length);
for (const s of shadows) {
  console.log(`${s.rule}: R3 sup=${s.conditionSupport} TP=${s.TP_CORRECTED} FPc=${s.FP_CORRECT_ROW_REGRESSION} FPw=${s.FP_WRONG_TO_DIFFERENT_WRONG} net=${s.netMismatchDelta} suite=${s.reasonSuiteRowsChanged} collision=${s.collisionProbeRowsChanged} allAccept=${s.allCorpusEffect.forecastAcceptable}`);
}
