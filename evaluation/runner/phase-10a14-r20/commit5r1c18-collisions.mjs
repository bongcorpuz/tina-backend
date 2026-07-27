// PHASE-10A14-R20 COMMIT 5R1-C18 — §10 collision exhaustion over the C18 residual.
import * as L from './commit5r1c18-lib.mjs';
import { buildBaseline } from './commit5r1c18-simulator.mjs';

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();
const baseline = buildBaseline(rows, analyze);
const residual = baseline.filter((b) => !b.correct);

// Enriched feature vector, extended with the additional deterministic features §10 lists.
const KEYS = ['speechAct', 'controllingRelation', 'targetSemanticRole', 'modalOperator',
  'polarity', 'namingAssignment', 'localDefinitionOperator', 'documentLocalScope',
  'unresolvedKind', 'topicFragment', 'hasDirectObject', 'objectComplement', 'imperativeHead'];

const group = (keys) => {
  const g = {};
  for (const b of residual) {
    const k = keys.map((x) => `${x}=${b.f[x]}`).join('|');
    g[k] ??= { count: 0, expected: {}, examples: [] };
    g[k].count++;
    g[k].expected[b.expected] = (g[k].expected[b.expected] || 0) + 1;
    if (g[k].examples.length < 3) g[k].examples.push({ oracleId: b.oracleId, expected: b.expected, actual: b.actual });
  }
  const v = Object.entries(g).map(([k, x]) => ({ vector: k, ...x, separable: Object.keys(x.expected).length === 1 }))
    .sort((a, b) => b.count - a.count);
  return { vectors: v, separable: v.filter((x) => x.separable).reduce((n, x) => n + x.count, 0), colliding: v.filter((x) => !x.separable).reduce((n, x) => n + x.count, 0) };
};

const g = group(KEYS);
const collidingVectors = g.vectors.filter((v) => !v.separable);

L.writeJson(L.RES + 'COMMIT_5R1C18_COLLISION_EXHAUSTION_REPORT.json', {
  unit: 'COMMIT 5R1-C18', generatedUtc: new Date().toISOString(),
  residualRows: residual.length,
  featureKeys: KEYS,
  additionalFeaturesTestedBeyondC17: ['modalOperator', 'polarity', 'objectComplement', 'hasDirectObject', 'documentLocalScope', 'localDefinitionOperator', 'namingAssignment'],
  separableRows: g.separable,
  collidingRows: g.colliding,
  collidingVectorCount: collidingVectors.length,
  collidingVectors: collidingVectors.slice(0, 30),
  note: 'Deterministic parsing only; no external model or new dependency. Oracle ids are analysis evidence.',
});

L.writeJson(L.RES + 'COMMIT_5R1C18_POSSIBLE_LEARNABILITY_CONFLICTS.json', {
  unit: 'COMMIT 5R1-C18', generatedUtc: new Date().toISOString(),
  status: 'CANDIDATES_ONLY_NOT_CONFIRMED',
  rationale: 'C17 already showed that a "hard ceiling" fell once features were enriched, and C18 closed a further 70 rows including a 41-row group C17 had left colliding. Rows that still share a vector are therefore recorded as candidates, not adjudicated oracle defects. No exception was added, R3 was not modified, and no closure is claimed on their account.',
  collidingRows: g.colliding,
  collidingVectors: collidingVectors.map((v) => ({ vector: v.vector, count: v.count, expected: v.expected, examples: v.examples })),
  requiresSeparatelyAuthorizedAdjudication: false,
});

console.log('residual rows =', residual.length);
console.log('separable =', g.separable, ' colliding =', g.colliding, ' collidingVectors =', collidingVectors.length);
for (const v of collidingVectors.slice(0, 6)) console.log(`  n=${String(v.count).padStart(3)}  expected=${JSON.stringify(v.expected)}`);
