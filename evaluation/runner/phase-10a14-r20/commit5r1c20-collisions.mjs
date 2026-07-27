// PHASE-10A14-R20 COMMIT 5R1-C20 — §11 collision exhaustion v2 over the C19 residual.
// Reassesses the current collision vectors using deterministic features §11 lists that
// earlier units had not exhausted: question focus, propositional versus entity target,
// modal scope, verb valency, object-complement type, document-local operator scope,
// parenthetical form and token-initial position.
import * as L from './commit5r1c20-lib.mjs';
import { captureBaseline } from './commit5r1c20-placement.mjs';

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();
const expected = new Map(rows.map((r) => [r.query, r.expectedReasonCodeFamily]));
const cap = captureBaseline(rows, analyze, (r) => r.query);
const residual = [...cap.entries()].filter(([q, b]) => b.reason !== expected.get(q)).map(([q, b]) => ({ oracleId: b.id, expected: expected.get(q), actual: b.reason, v: b.v }));

const feat = (b) => {
  const t = b.v.t;
  return {
    speechAct: /^(?:please\s+)?(?:change|rename|delete|sort|debug|design|install|translate|summari[sz]e|format|list|explain|make|create|tune|print|write|update|improve|prepare|build|fix|play|cook|draw|paint|compile|download|buy|edit|adjust|schedule|render|organi[sz]e|archive|move|copy|store|upload|export|attach|duplicate|count|repeat|spell|reverse|proofread|ayusin|linisin|palitan|ilagay|bilhin|gawin|isulat|tanggalin|ihanda|i-[a-z]+)\b/i.test(t) ? 'request'
      : /^(?:what|which|who|when|where|why|how|is|are|do|does|can|could|should|would|may|will|ano|alin|paano|kailan|may|magkano|kailangan)\b/i.test(t) ? 'question'
      : /\?/.test(t) ? 'qm_assertion' : 'assertion',
    rel0: b.v.rel0,
    modalOperator: /\b(?:must|should|shall|need to|required to|kailangan)\b/i.test(t) ? 'deontic'
      : /\b(?:can|could|may|might)\b/i.test(t) ? 'epistemic' : 'none',
    polarity: /\b(?:not|hindi|never|no longer|walang)\b/i.test(t) ? 'negative' : 'positive',
    namingComplement: /\b(?:as|under|to)\s+(?:the\s+|a\s+|an\s+|our\s+)?(?:[a-z]{2,6}\b|product code|database field|field label|internal label|codename|project code)/i.test(t),
    localReassign: /\b(?:means|stands for|refers to|is short for|to mean)\b|\s=\s|\bi\.e\.\b/i.test(t),
    docLocal: /\b(?:here|in this|in our|our |namin|sa amin|locally|internally)\b/i.test(t),
    questionFocus: /^what\b/i.test(t) ? 'what' : /^which\b/i.test(t) ? 'which'
      : /^how\b/i.test(t) ? 'how' : /^(?:is|are|do|does|can|may|should)\b/i.test(t) ? 'polar' : 'none',
    propositionalTarget: /\bthat\b|\bwhether\b/i.test(t),
    verbValency: b.v.taskObject ? 'transitive' : (b.v.taskVerb ? 'intransitive' : 'none'),
    objectComplementType: /\bas (?:a|an|the)\b/i.test(t) ? 'as_np' : /\bto (?:a|an|the)\b/i.test(t) ? 'to_np' : 'none',
    parenForm: /\([^)]{4,}\)/.test(t),
    tokenInitial: /^[a-z]{2,6}\b/i.test(t),
  };
};

const KEYS = ['speechAct', 'rel0', 'modalOperator', 'polarity', 'namingComplement', 'localReassign',
  'docLocal', 'questionFocus', 'propositionalTarget', 'verbValency', 'objectComplementType',
  'parenForm', 'tokenInitial'];

const group = (keys) => {
  const g = {};
  for (const b of residual) {
    const f = feat(b);
    const k = keys.map((x) => `${x}=${f[x]}`).join('|');
    g[k] ??= { count: 0, expected: {}, examples: [] };
    g[k].count++;
    g[k].expected[b.expected] = (g[k].expected[b.expected] || 0) + 1;
    if (g[k].examples.length < 3) g[k].examples.push({ oracleId: b.oracleId, expected: b.expected, actual: b.actual });
  }
  const v = Object.entries(g).map(([k, x]) => ({ vector: k, ...x, separable: Object.keys(x.expected).length === 1 }))
    .sort((a, b) => b.count - a.count);
  return {
    vectors: v,
    separable: v.filter((x) => x.separable).reduce((n, x) => n + x.count, 0),
    colliding: v.filter((x) => !x.separable).reduce((n, x) => n + x.count, 0),
  };
};

const g = group(KEYS);
const colliding = g.vectors.filter((v) => !v.separable);

L.writeJson(L.RES + 'COMMIT_5R1C20_COLLISION_EXHAUSTION_V3.json', {
  unit: 'COMMIT 5R1-C20', generatedUtc: new Date().toISOString(),
  residualRows: residual.length,
  featureKeys: KEYS,
  featuresNewInC19: ['questionFocus', 'propositionalTarget', 'verbValency', 'objectComplementType', 'parenForm', 'tokenInitial', 'modalOperator', 'polarity'],
  separableRows: g.separable,
  collidingRows: g.colliding,
  collidingVectorCount: colliding.length,
  collidingVectors: colliding.slice(0, 30),
  note: 'Deterministic parsing only; no external model, no new dependency. Oracle ids are analysis evidence and never become runtime features.',
});

L.writeJson(L.RES + 'COMMIT_5R1C20_LEARNABILITY_CONFLICT_CANDIDATES.json', {
  unit: 'COMMIT 5R1-C20', generatedUtc: new Date().toISOString(),
  status: 'CANDIDATES_ONLY_NOT_CONFIRMED',
  rationale: 'C17 saw one declared ceiling fall to feature enrichment and C18 closed a 41-row group C17 had left colliding, so a shared vector is not evidence of an oracle defect. C19 added eight further deterministic features and the colliding count moved again. No exception was added, R3 was not modified, and no closure is claimed on their account.',
  collidingRows: g.colliding,
  collidingVectors: colliding.map((v) => ({ vector: v.vector, count: v.count, expected: v.expected, examples: v.examples })),
  requiresSeparatelyAuthorizedAdjudication: false,
});

console.log('residual rows =', residual.length);
console.log('separable =', g.separable, ' colliding =', g.colliding, ' collidingVectors =', colliding.length);
for (const v of colliding.slice(0, 6)) console.log(`  n=${String(v.count).padStart(3)}  expected=${JSON.stringify(v.expected)}`);
