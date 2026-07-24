// PHASE-10A14-R20 COMMIT 4 — deterministic development-oracle builder.
//
// Combines the four source sets into the frozen development oracle. Reads only
// immutable source oracles / accepted controls / the reviewed new-row source.
// Adds metadata, canonicalizes expectations from RAW EXPECTED VALUES (never from
// any classifier/analyzer output), preserves dual 567 scoring, tags the 56
// divergence rows. NO classifier import, NO analyzer execution, NO model/network.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { REPO, gitObject, sha256File } from './identity.mjs';
import { generateNewRows, generateMetamorphicGroups } from './commit4-new-rows.mjs';

const P = (rel) => `${REPO}/${rel}`;
const ORACLE_1120 = 'evaluation/results/phase-10a14-r19-independent-review-1/INDEPENDENT_SEMANTIC_ORACLE_1120_PLUS.json';
const ORACLE_567 = 'evaluation/results/phase-10a14-r19-independent-review-1/R18_CORRECTED_SEMANTIC_567_ORACLE.json';
const CONTROL_210 = 'evaluation/results/phase-10a14-r17-independent-review-1/06_INDEPENDENT_DOMAIN_CAMPAIGN.json';
const DIVERGENCE_IDS = 'evaluation/results/phase-10a14-r20/CORRECTED_SEMANTIC_567_RESULT.json';

const normExact = (s) => String(s).normalize('NFC').replace(/\s+/g, ' ').trim();
const rowHash = (s) => createHash('sha256').update(normExact(s)).digest('hex').slice(0, 24);

// Canonical decision from a raw expected value. Structural mapping only.
function canonicalDecision(raw) {
  if (raw === 'ALLOW') return 'ALLOW';
  if (raw === 'CLARIFY') return 'CLARIFY';
  if (raw === 'NOT_ALLOW' || raw === 'REFUSE' || raw === 'REJECT') return 'REFUSE';
  throw new Error(`unmappable raw expected: ${raw}`);
}
// Coarse expected reason family for inherited rows, derived from raw decision +
// coverage class (structural, contract-based; never analyzer output).
function inheritedReasonFamily(decision, coverageClass) {
  if (decision === 'CLARIFY') return 'ambiguous_tax_acronym';
  if (decision === 'ALLOW') {
    if (/mixed_domain/.test(coverageClass)) return 'tax_treatment_of_ordinary_object';
    return 'explicit_tax_task_relation';
  }
  return 'explicit_non_tax_task';
}

function baseRow(fields) {
  // Ensure every canonical schema field is present (null where N/A).
  return {
    oracleId: null, sourceSet: null, sourceRef: null, sourceRowHash: null, sourceFixtureId: null,
    query: null, coverageClass: null, primaryCategory: null, secondaryTags: [], language: 'en',
    expectedRaw: null, expectedDecision: null, expectedReasonCodeFamily: null, expectedRelations: [],
    historicalScoringMode: 'canonical_only', historicalExpectedPassRule: 'canonical',
    scoringSemanticsFlag: null, rationale: null, authorityOfExpectation: null,
    metamorphicGroup: null, metamorphicRole: null, disputed: false, disputeRecordId: null,
    probeId: null, primaryTaskClause: null, taskVerb: null, taskTarget: null,
    taxPredicates: [], taxEntities: [], nonTaxObjects: [], quotedTerms: [], negation: null,
    relationEvidence: [], rootCauseFamily: null, materiality: null,
    actualDecision: null, actualReason: null,
    ...fields,
  };
}

export function buildOracle() {
  const o1120 = JSON.parse(readFileSync(P(ORACLE_1120), 'utf8')).rows;
  const o567 = JSON.parse(readFileSync(P(ORACLE_567), 'utf8')).rows;
  const c210 = JSON.parse(readFileSync(P(CONTROL_210), 'utf8')).results;
  const divergenceIds = new Set(JSON.parse(readFileSync(P(DIVERGENCE_IDS), 'utf8')).divergence.strictFailureRows.map((r) => r.probeId));

  const rows = [];

  // Source Set 1 — exact 1,120 (unchanged content; wrapper metadata only).
  for (const r of o1120) {
    const dec = canonicalDecision(r.expected);
    rows.push(baseRow({
      oracleId: `S1-${r.id}`, sourceSet: 'r19_1120', sourceRef: ORACLE_1120,
      sourceFixtureId: r.id, probeId: r.id, sourceRowHash: rowHash(r.text),
      query: r.text, coverageClass: r.coverageClass, primaryCategory: r.coverageClass,
      expectedRaw: r.expected, expectedDecision: dec,
      expectedReasonCodeFamily: inheritedReasonFamily(dec, r.coverageClass),
      historicalScoringMode: 'canonical_only', historicalExpectedPassRule: 'canonical',
      rationale: 'Exact R19 1,120 controlling row, unchanged.', authorityOfExpectation: 'accepted_r19_controlling',
      metamorphicGroup: r.metamorphicGroup || null, metamorphicRole: r.metamorphicRole || null,
    }));
  }

  // Source Set 2 — corrected 567 with DUAL scoring + divergence tags.
  for (const r of o567) {
    const dec = canonicalDecision(r.expected);
    const isDivergence = divergenceIds.has(r.id);
    rows.push(baseRow({
      oracleId: `S2-${r.id}`, sourceSet: 'r18_corrected_567', sourceRef: ORACLE_567,
      sourceFixtureId: r.id, probeId: r.id, sourceRowHash: rowHash(r.text),
      query: r.text, coverageClass: r.coverageClass, primaryCategory: r.coverageClass,
      expectedRaw: r.expected, expectedDecision: dec,
      expectedReasonCodeFamily: inheritedReasonFamily(dec, r.coverageClass),
      historicalScoringMode: 'dual', historicalExpectedPassRule: 'historical_lenient_and_canonical',
      scoringSemanticsFlag: isDivergence ? 'SCORING_SEMANTICS_DIVERGENCE' : null,
      rationale: isDivergence
        ? 'Corrected R18 567 row; historical lenient scoring accepts any non-ALLOW (567/567). Canonical R20 lane expects REFUSE; runtime answers CLARIFY. Distinct canonical control.'
        : 'Corrected R18 567 row; historical 567/567 preserved; canonical lane matches historical.',
      authorityOfExpectation: 'accepted_r18_corrected',
      // dual-scoring preservation fields
      historicalExpectedRaw: r.expected,
      canonicalExpectedDecision: dec,
      canonicalExpectedReasonCodeFamily: inheritedReasonFamily(dec, r.coverageClass),
    }));
  }

  // Source Set 3 — accepted R17 210 controls (provenance; dedup vs 1120/567 by exact query).
  const inheritedExact = new Set([...o1120, ...o567].map((r) => normExact(r.text)));
  let s3New = 0, s3Dup = 0;
  for (const r of c210) {
    const dec = canonicalDecision(r.expected);
    const dup = inheritedExact.has(normExact(r.text));
    if (dup) s3Dup++; else s3New++;
    rows.push(baseRow({
      oracleId: `S3-${r.id}`, sourceSet: 'r17_accepted_control', sourceRef: CONTROL_210,
      sourceFixtureId: r.id, probeId: r.id, sourceRowHash: rowHash(r.text),
      query: r.text, coverageClass: r.group || 'accepted_control', primaryCategory: r.group || 'accepted_control',
      expectedRaw: r.expected, expectedDecision: dec,
      expectedReasonCodeFamily: inheritedReasonFamily(dec, r.group || ''),
      rationale: 'Accepted R17 independent-domain control, preserved as regression provenance.',
      authorityOfExpectation: 'accepted_r17_control',
      secondaryTags: dup ? ['inherited_duplicate'] : [],
      inheritedDuplicate: dup,
    }));
  }

  // Source Set 4 — new compositional rows.
  const newRows = generateNewRows();
  for (const r of newRows) {
    rows.push(baseRow({
      ...r,
      sourceRowHash: rowHash(r.query),
      historicalScoringMode: 'canonical_only',
      historicalExpectedPassRule: 'canonical',
      inheritedDuplicate: false,
    }));
  }

  // Metamorphic rows (belong to Source Set 4; carry group/role).
  const mmGroups = generateMetamorphicGroups();
  for (const g of mmGroups) {
    for (const mm of g.members) {
      rows.push(baseRow({
        oracleId: mm.oracleId, sourceSet: 'r20_new', sourceRef: 'R20_DEVELOPMENT_ORACLE_METAMORPHIC_REGISTER.json',
        sourceRowHash: rowHash(mm.query), query: mm.query,
        coverageClass: 'metamorphic', primaryCategory: 'metamorphic',
        secondaryTags: ['metamorphic', g.transformationType],
        expectedRaw: mm.expectedDecision, expectedDecision: mm.expectedDecision,
        expectedReasonCodeFamily: mm.expectedReasonCodeFamily,
        rationale: `Metamorphic ${g.transformationType} variant; invariant unless non-tax substitution.`,
        authorityOfExpectation: 'frozen_contract_construction',
        metamorphicGroup: g.group, metamorphicRole: mm.metamorphicRole,
        inheritedDuplicate: false,
      }));
    }
  }

  return { rows, mmGroups, s3New, s3Dup, sources: {
    o1120: o1120.length, o567: o567.length, c210: c210.length, newRows: newRows.length,
    mmRows: mmGroups.reduce((s, g) => s + g.members.length, 0),
  } };
}

export function sourceHashes() {
  return {
    r19_1120: { path: ORACLE_1120, sha256: sha256File(P(ORACLE_1120)), gitBlob: gitObject(`HEAD:${ORACLE_1120}`) },
    r18_567: { path: ORACLE_567, sha256: sha256File(P(ORACLE_567)), gitBlob: gitObject(`HEAD:${ORACLE_567}`) },
    r17_210: { path: CONTROL_210, sha256: sha256File(P(CONTROL_210)), gitBlob: gitObject(`HEAD:${CONTROL_210}`) },
  };
}
