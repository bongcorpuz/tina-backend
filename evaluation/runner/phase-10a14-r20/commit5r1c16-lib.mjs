// PHASE-10A14-R20 COMMIT 5R1-C16 — shared governed-campaign library for the relation lane.
// Inherits the C12 decision-lock gates unchanged and adds relation-lane scoring.
// In-repository sibling temp files ending in .js only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

export const REPO = 'C:/Projects/tina-backend';
export const RES = 'evaluation/results/phase-10a14-r20/';
export const ATT = RES + 'attempts/';
export const SERVICES = ['philippine-tax-intent-analyzer.js', 'philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js'];
export const CONTROLS = ['tax_compliance_task', 'acronym_homograph_control', 'ambiguous_clarification_control', 'internal_label_proper_name', 'quoted_term_only'];
export const REQUIRED_EXPORTS = ['TAX_BOUNDARY_DECISIONS', 'TAX_BOUNDARY_REASON_CODES', 'TAX_BOUNDARY_SPEECH_ACTS', 'TAX_RELATION_TYPES', 'analyzePhilippineTaxIntent', 'decideTaxBoundaryFromEvidence', 'normalizeTaxBoundaryText', 'segmentTaxBoundaryClauses', 'serializeTaxBoundaryEvidence'];
export const SUITES = [
  ['v3', RES + 'COMMIT_5R1C7_DECISION_COUNTERFACTUAL_V3_SUITE.json'],
  ['v4', RES + 'COMMIT_5R1C8_DECISION_COUNTERFACTUAL_V4_SUITE.json'],
  ['v5', RES + 'COMMIT_5R1C9_DECISION_COUNTERFACTUAL_V5_SUITE.json'],
  ['v6', RES + 'COMMIT_5R1C10_DECISION_COUNTERFACTUAL_V6_SUITE.json'],
];
// The controlling relation suite is FROZEN at the C13 file: 282 controlling queries
// plus 14 visible non-controlling probes. C16 must not edit, replace or extend it, and
// must not increase the denominator.
export const RELATION_SUITE = RES + 'COMMIT_5R1C13_RELATION_COUNTERFACTUAL_V7_SUITE.json';
/** Clause-segmentation probes: acceptance gate, but NOT part of the 282 denominator. */
export const CLAUSE_PROBES = RES + 'COMMIT_5R1C14_CLAUSE_PROBE_SUITE.json';
/** Reason-focused counterfactual suite (v8), authored in C16. */
export const REASON_SUITE = RES + 'COMMIT_5R1C15_REASON_COUNTERFACTUAL_V8_SUITE.json';

/** Closed relation set, per CLAUSE_LEVEL_INTENT_SCHEMA.md. Never extend. */
export const RELATION_TYPES = [
  'ASKS_TAX_TREATMENT_OF', 'ASKS_TAX_COMPLIANCE_FOR', 'ASKS_DEDUCTIBILITY_OF',
  'ASKS_VAT_TREATMENT_OF', 'ASKS_WITHHOLDING_ON', 'ASKS_CUSTOMS_DUTY_ON',
  'ASKS_DEFINITION_OF', 'NAMES_AS_INTERNAL_LABEL', 'EXPANDS_AS_NON_TAX',
  'QUOTES_TERM', 'NEGATES_TAX_RELEVANCE', 'REQUESTS_NON_TAX_ACTION_ON',
];

/** Closed reason-code set, per RELATION_AND_PRECEDENCE_SPEC.md. */
export const REASON_CODES = [
  'explicit_tax_task_relation', 'tax_treatment_of_ordinary_object', 'tax_compliance_task',
  'tax_definition_with_context', 'ambiguous_tax_acronym', 'explicit_non_tax_task',
  'non_tax_label_or_name', 'non_tax_expansion', 'quoted_tax_term_only',
  'tax_negation_but_tax_review_requested', 'no_tax_relation',
];

/**
 * Decision compatibility. The precedence spec lists one nominal decision per reason
 * code, but the frozen R3 oracle itself pairs `no_tax_relation` with CLARIFY in 100
 * rows (unresolved ambiguity routes to CLARIFY under precedence step 8 while the
 * controlling explanation remains "no relation links a tax predicate to the target").
 * The gate therefore admits every pairing R3 authorizes and rejects all others; it is
 * a validity check, not a stricter re-specification of the frozen contract.
 */
export const REASON_DECISION = {
  explicit_tax_task_relation: ['ALLOW'], tax_treatment_of_ordinary_object: ['ALLOW'],
  tax_compliance_task: ['ALLOW'], tax_definition_with_context: ['ALLOW'],
  ambiguous_tax_acronym: ['CLARIFY'], explicit_non_tax_task: ['REFUSE'],
  non_tax_label_or_name: ['REFUSE'], non_tax_expansion: ['REFUSE'],
  quoted_tax_term_only: ['REFUSE'], tax_negation_but_tax_review_requested: ['ALLOW'],
  no_tax_relation: ['REFUSE', 'CLARIFY'],
};

export const R3_PATH = 'evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json';
export const R3_SHA = 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54';

export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
export const normLf = (b) => Buffer.from(b.toString('binary').replace(/\r\n/g, '\n'), 'binary');
export const git = (a) => execSync(`git -C ${REPO} ${a}`, { maxBuffer: 1e9 }).toString();
export const writeJson = (p, o) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(o, null, 2).replace(/\r\n/g, '\n') + '\n');
};

export function loadR3() {
  const b = fs.readFileSync(R3_PATH);
  const got = sha256(b);
  if (got !== R3_SHA) throw new Error('R3_ORACLE_DRIFT ' + got);
  const rows = JSON.parse(b.toString('utf8')).rows;
  if (rows.length !== 3720) throw new Error('R3_ROW_COUNT ' + rows.length);
  return rows;
}

export async function assertRuntimeIntact(stage) {
  for (const n of SERVICES) {
    const b = fs.readFileSync('services/' + n);
    if (b.length === 0) throw new Error(`ZERO_BYTE_RUNTIME at ${stage}: ${n}`);
  }
  const m = await import('file:///' + REPO + '/services/philippine-tax-intent-analyzer.js?v=' + Date.now() + Math.random());
  for (const e of REQUIRED_EXPORTS) if (!(e in m)) throw new Error(`MISSING_EXPORT at ${stage}: ${e}`);
  return true;
}

export async function atomicWriteRuntime(relPath, content, auditLog) {
  const before = fs.readFileSync(relPath);
  const tmp = relPath.replace(/\.js$/, '.c16tmp.js');
  fs.writeFileSync(tmp, content);
  const tmpBuf = fs.readFileSync(tmp);
  if (tmpBuf.length === 0) { fs.unlinkSync(tmp); throw new Error('ZERO_BYTE_TEMP ' + relPath); }
  let exportsVerified = false;
  if (relPath.endsWith('philippine-tax-intent-analyzer.js')) {
    const m = await import('file:///' + REPO + '/' + tmp + '?v=' + Date.now() + Math.random());
    for (const e of REQUIRED_EXPORTS) {
      if (!(e in m)) { fs.unlinkSync(tmp); throw new Error('EXPORTS_MISSING ' + e); }
    }
    exportsVerified = true;
  }
  const tmpSha = sha256(normLf(tmpBuf));
  fs.renameSync(tmp, relPath);
  const after = fs.readFileSync(relPath);
  if (after.length === 0) throw new Error('ZERO_BYTE_DEST ' + relPath);
  const afterSha = sha256(normLf(after));
  if (afterSha !== tmpSha) throw new Error('POST_REPLACE_HASH_MISMATCH ' + relPath);
  auditLog.push({
    path: relPath, beforeSha256Normalized: sha256(normLf(before)), afterSha256Normalized: afterSha,
    beforeBytes: before.length, afterBytes: after.length, tempFileUsed: path.basename(tmp),
    tempInsideRepository: true, tempEndsWithJs: true, verifiedNonZero: true,
    parseAndExportsVerified: exportsVerified, atomicRename: true, postReplaceHashVerified: true,
    zeroByteIncident: false,
  });
  return afterSha;
}

export function runtimeIdentity() {
  const out = {};
  const parts = [];
  for (const n of SERVICES) {
    const p = 'services/' + n;
    const b = fs.readFileSync(p);
    parts.push(normLf(b));
    out[p] = { bytes: b.length, normalizedLfSha256: sha256(normLf(b)), gitBlobAtHead: git(`rev-parse HEAD:${p}`).trim() };
  }
  out.servicesTreeDigest = sha256(Buffer.concat(parts));
  return out;
}

export function snapshotRuntime(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const n of SERVICES) fs.copyFileSync('services/' + n, path.join(dir, n));
  writeJson(path.join(dir, 'RUNTIME_IDENTITY.json'), runtimeIdentity());
}

export async function restoreBaseline() {
  for (const n of SERVICES) git(`checkout -- services/${n}`);
  await assertRuntimeIntact('post-restore');
  return runtimeIdentity();
}

export async function restoreFromSnapshot(dir) {
  const audit = [];
  for (const n of SERVICES) await atomicWriteRuntime('services/' + n, fs.readFileSync(path.join(dir, n)), audit);
  await assertRuntimeIntact('post-snapshot-restore');
  return runtimeIdentity();
}

export async function allocateAttempt({ category, gate, cycle, controlling = true, command, ordinal = 1 }) {
  await assertRuntimeIntact('pre-allocate');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const attemptId = `R20-${category}-${gate}-${cycle}-ord0${ordinal}-${ts}`;
  const dir = ATT + attemptId + '/';
  fs.mkdirSync(dir, { recursive: true });
  const head = git('rev-parse HEAD').trim();
  const rid = runtimeIdentity();
  writeJson(dir + 'ATTEMPT.json', {
    attemptId, attemptCategory: category, gateName: gate, cycle, attemptOrdinal: ordinal,
    retryOf: null, retryReason: null,
    evidenceHeadAtAllocation: head, evidenceHeadAtStart: head, runtimeBaselineCommit: head,
    runtimeTreeDigest: rid.servicesTreeDigest,
    runtimeBlobs: Object.fromEntries(SERVICES.map((n) => ['services/' + n, rid['services/' + n].normalizedLfSha256])),
    environmentFingerprint: { os: process.platform, nodeVersion: process.version, arch: process.arch, cwd: REPO },
    command: 'node', commandArgs: [command], commandHash: sha256(Buffer.from(command)),
    startedAt: new Date().toISOString(), status: 'running', controlling,
    oracleVersion: 'R3', oracleSha256: R3_SHA,
  });
  return { attemptId, dir };
}

export async function finalizeAttempt(dir, { disposition, exitCode = 0, stdout = '', stderr = '', resultPaths = [] }) {
  await assertRuntimeIntact('pre-finalize');
  const a = JSON.parse(fs.readFileSync(dir + 'ATTEMPT.json', 'utf8'));
  a.endedAt = new Date().toISOString();
  a.exitCode = exitCode; a.status = 'completed'; a.disposition = disposition;
  a.evidenceHeadAtEnd = git('rev-parse HEAD').trim();
  a.resultPaths = resultPaths;
  a.stdoutPath = dir + 'stdout.txt'; a.stderrPath = dir + 'stderr.txt';
  fs.writeFileSync(dir + 'stdout.txt', stdout.replace(/\r\n/g, '\n'));
  fs.writeFileSync(dir + 'stderr.txt', stderr.replace(/\r\n/g, '\n'));
  a.stdoutSha256 = sha256(fs.readFileSync(dir + 'stdout.txt'));
  a.stderrSha256 = sha256(fs.readFileSync(dir + 'stderr.txt'));
  writeJson(dir + 'ATTEMPT.json', a);
  return a;
}

/** Load the analyzer in standalone mode, returning full evidence (relations included). */
export async function loadAnalyzer() {
  const m = await import('file:///' + REPO + '/services/philippine-tax-intent-analyzer.js?v=' + Date.now() + Math.random());
  return (q) => m.analyzePhilippineTaxIntent(q);
}

/**
 * Canonical R3 scoring, replicating commit5r1-oracle-runner.scoreRows exactly.
 * Relation semantics per the frozen scorer: expected-set CONTAINMENT on the
 * `relation` field only. Extras never fail a row; order and duplicates are
 * irrelevant; empty expectations pass trivially; source/target/clauseId/
 * evidenceSpan do not affect scoring.
 */
export function scoreR3(rows, analyze) {
  const counts = {
    total: rows.length, canonicalPassed: 0,
    decisionMismatches: 0, reasonMismatches: 0, relationMismatches: 0,
    materialFalseAllows: 0, materialFalseRefusals: 0, clarifyMismatches: 0,
    relationRowsWithExpectations: 0, relationRowsPassed: 0,
  };
  const relationFailures = [];
  const decisionFailures = [];
  for (const r of rows) {
    const ev = analyze(r.query);
    const actualRels = (ev.relations || []).map((x) => x.relation);
    const expectedRels = (r.expectedRelations || []).map((x) => x.relation);
    const decisionPass = ev.decision === r.expectedDecision;
    const reasonPass = ev.reasonCode === r.expectedReasonCodeFamily;
    const relationPass = expectedRels.every((rt) => actualRels.includes(rt));
    if (decisionPass && reasonPass && relationPass) counts.canonicalPassed++;
    if (!decisionPass) {
      counts.decisionMismatches++;
      if (r.expectedDecision !== 'ALLOW' && ev.decision === 'ALLOW') counts.materialFalseAllows++;
      else if (r.expectedDecision === 'ALLOW' && ev.decision !== 'ALLOW') counts.materialFalseRefusals++;
      else counts.clarifyMismatches++;
      decisionFailures.push({ oracleId: r.oracleId, query: r.query, expected: r.expectedDecision, actual: ev.decision });
    }
    if (!reasonPass) counts.reasonMismatches++;
    if (expectedRels.length) counts.relationRowsWithExpectations++;
    if (relationPass) { if (expectedRels.length) counts.relationRowsPassed++; } else {
      counts.relationMismatches++;
      relationFailures.push({
        oracleId: r.oracleId, query: r.query, sourceSet: r.sourceSet, primaryCategory: r.primaryCategory,
        expectedDecision: r.expectedDecision, actualDecision: ev.decision,
        expectedReasonCodeFamily: r.expectedReasonCodeFamily, actualReason: ev.reasonCode,
        expectedRelations: expectedRels, actualRelations: actualRels,
        missing: expectedRels.filter((x) => !actualRels.includes(x)),
        extra: actualRels.filter((x) => !expectedRels.includes(x)),
        primaryTaskClause: r.primaryTaskClause, taskVerb: r.taskVerb, taskTarget: r.taskTarget,
        decisionPass, reasonPass,
      });
    }
  }
  counts.relationPassed = counts.total - counts.relationMismatches;
  counts.decisionPassed = counts.total - counts.decisionMismatches;
  return { counts, relationFailures, decisionFailures };
}

export function closedControls(rows, analyze) {
  const pass = {}, tot = {};
  for (const r of rows) {
    if (!CONTROLS.includes(r.primaryCategory)) continue;
    tot[r.primaryCategory] = (tot[r.primaryCategory] || 0) + 1;
    if (analyze(r.query).decision === r.expectedDecision) pass[r.primaryCategory] = (pass[r.primaryCategory] || 0) + 1;
  }
  const present = CONTROLS.filter((c) => tot[c]);
  return {
    controls: present.map((c) => ({ control: c, passed: pass[c] || 0, total: tot[c], closed: (pass[c] || 0) === tot[c] })),
    allClosed: present.every((c) => (pass[c] || 0) === tot[c]),
  };
}

export const GUARD_SHAPES = [
  { shape: 'bare_term', query: 'holding period', expected: 'ALLOW' },
  { shape: 'recognized_polysemous_acronym', query: 'RMC', expected: 'CLARIFY' },
  { shape: 'issuance_context', query: 'What did the RMC issuance say about VAT?', expected: 'ALLOW' },
  { shape: 'procedure_context', query: 'Explain RMC for BIR issuances.', expected: 'ALLOW' },
  { shape: 'ordinary_homograph', query: 'Can a supplier reject a return of goods?', expected: 'REFUSE' },
  { shape: 'richer_tax_sentence', query: 'How is the holding period applied to a capital gains tax computation on land?', expected: 'ALLOW' },
  { shape: 'metadata_suffixed_contentless', query: 'What is the holding period? Context 1.', expected: 'REFUSE' },
];
export function richContextGuard(analyze) {
  const probes = GUARD_SHAPES.map((g) => {
    const actual = analyze(g.query).decision;
    return { ...g, actual, pass: actual === g.expected };
  });
  return { probes, allPass: probes.every((p) => p.pass), passed: probes.filter((p) => p.pass).length, total: probes.length };
}

/** Locked 756-query decision counterfactual suite. Decision lane only. */
export function runCounterfactuals(analyze) {
  const bySuite = {}; const failures = [];
  let total = 0, passed = 0;
  for (const [name, p] of SUITES) {
    const s = JSON.parse(fs.readFileSync(p, 'utf8'));
    let k = 0;
    for (const q of s.queries) {
      const got = analyze(q.query).decision;
      if (got === q.expectedDecision) k++;
      else failures.push({ suite: name, family: q.family, query: q.query, expected: q.expectedDecision, actual: got, contrast: q.contrast });
    }
    bySuite[name] = { total: s.queries.length, passed: k, failed: s.queries.length - k };
    total += s.queries.length; passed += k;
  }
  const byFamily = {};
  for (const f of failures) byFamily[f.family] = (byFamily[f.family] || 0) + 1;
  return { total, passed, failed: failures.length, bySuite, byFamily, failures };
}

/**
 * Relation-focused counterfactual suite (v7). Scored on relation containment,
 * matching the frozen R3 scorer, plus a decision check where the entry declares one.
 */
export function runRelationCounterfactuals(analyze) {
  if (!fs.existsSync(RELATION_SUITE)) return { total: 0, passed: 0, failed: 0, byFamily: {}, failures: [], suiteMissing: true };
  const s = JSON.parse(fs.readFileSync(RELATION_SUITE, 'utf8'));
  const failures = []; const byFamily = {};
  let passed = 0; let total = 0; const probes = [];
  for (const q of s.queries) {
    const ev = analyze(q.query);
    const actual = (ev.relations || []).map((x) => x.relation);
    const missing = (q.expectedRelations || []).filter((rt) => !actual.includes(rt));
    const forbidden = (q.forbiddenRelations || []).filter((rt) => actual.includes(rt));
    const decisionOk = !q.expectedDecision || ev.decision === q.expectedDecision;
    // Non-controlling probes are recorded in full but do not score: their expectations
    // were withdrawn as unauthorized (no R3 row of that shape). They are never removed
    // from the file, so the withdrawal stays visible.
    if (q.controlling === false) {
      probes.push({ family: q.family, query: q.query, actualRelations: actual, actualDecision: ev.decision, missing, forbidden });
      continue;
    }
    total++;
    if (!missing.length && !forbidden.length && decisionOk) passed++;
    else {
      byFamily[q.family] = (byFamily[q.family] || 0) + 1;
      failures.push({
        family: q.family, pair: q.pair, query: q.query,
        expectedRelations: q.expectedRelations || [], forbiddenRelations: q.forbiddenRelations || [],
        actualRelations: actual, missing, forbidden,
        expectedDecision: q.expectedDecision, actualDecision: ev.decision, decisionOk,
      });
    }
  }
  return { total, passed, failed: failures.length, byFamily, failures, pairs: s.pairCount, authoredQueries: s.queries.length, nonControllingProbes: probes.length, probes };
}

/**
 * Structural integrity of emitted relation objects. Scoring ignores these fields,
 * so they are enforced here directly: every relation must carry a stable, meaningful
 * source/relation/target/clauseId/evidenceSpan, with no duplicate tuples, no
 * placeholder targets, no whole-query evidence spans, and no unknown relation type.
 */
export function relationObjectIntegrity(analyze, queries) {
  const viol = { unknownType: [], missingField: [], placeholderTarget: [], wholeQuerySpan: [], duplicateTuple: [], unstableOrder: [] };
  const PLACEHOLDER = /^(?:null|undefined|none|n\/a|unknown|target|object|placeholder|\?+|-+)$/i;
  for (const q of queries) {
    const ev = analyze(q);
    const rels = ev.relations || [];
    const seen = new Set();
    for (const r of rels) {
      if (!RELATION_TYPES.includes(r.relation)) viol.unknownType.push({ q, relation: r.relation });
      for (const f of ['source', 'relation', 'target', 'clauseId', 'evidenceSpan']) {
        if (r[f] === undefined || r[f] === null || String(r[f]).trim() === '') viol.missingField.push({ q, field: f, relation: r.relation });
      }
      if (r.target != null && PLACEHOLDER.test(String(r.target).trim())) viol.placeholderTarget.push({ q, target: r.target, relation: r.relation });
      const span = String(r.evidenceSpan ?? '').trim();
      const norm = String(ev.normalizedText ?? q).trim();
      if (span && norm && span.length === norm.length && span === norm && norm.split(/\s+/).length > 6) {
        viol.wholeQuerySpan.push({ q, relation: r.relation });
      }
      const key = [r.source, r.relation, r.target, r.clauseId, r.evidenceSpan].join('\u0001');
      if (seen.has(key)) viol.duplicateTuple.push({ q, relation: r.relation }); else seen.add(key);
    }
    const again = (analyze(q).relations || []).map((r) => [r.source, r.relation, r.target, r.clauseId, r.evidenceSpan].join('\u0001'));
    const first = rels.map((r) => [r.source, r.relation, r.target, r.clauseId, r.evidenceSpan].join('\u0001'));
    if (JSON.stringify(again) !== JSON.stringify(first)) viol.unstableOrder.push({ q });
  }
  const counts = Object.fromEntries(Object.entries(viol).map(([k, v]) => [k, v.length]));
  return { counts, violations: Object.fromEntries(Object.entries(viol).map(([k, v]) => [k, v.slice(0, 20)])), pass: Object.values(counts).every((n) => n === 0) };
}

/** Reason-code validity and decision/reason compatibility. Invalid codes reject a candidate. */
export function reasonIntegrity(rows, analyze) {
  const invalidCode = []; const incompatible = [];
  for (const r of rows) {
    const ev = analyze(r.query);
    if (!REASON_CODES.includes(ev.reasonCode)) invalidCode.push({ oracleId: r.oracleId, reasonCode: ev.reasonCode });
    else if (!REASON_DECISION[ev.reasonCode].includes(ev.decision)) incompatible.push({ oracleId: r.oracleId, reasonCode: ev.reasonCode, decision: ev.decision });
  }
  return { invalidCodeCount: invalidCode.length, incompatibleCount: incompatible.length, invalidCode: invalidCode.slice(0, 20), incompatible: incompatible.slice(0, 20), pass: !invalidCode.length && !incompatible.length };
}

/**
 * Anti-memorization scan over executable runtime logic (comments stripped).
 * Extended for C16 to cover the relation suite. A candidate failing any check is
 * rejected regardless of score.
 */
export function antiMemorization(srcPath, r3Rows) {
  const src = fs.readFileSync(srcPath, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const suiteQueries = [];
  for (const [, p] of SUITES) for (const q of JSON.parse(fs.readFileSync(p, 'utf8')).queries) suiteQueries.push(q.query);
  if (fs.existsSync(RELATION_SUITE)) for (const q of JSON.parse(fs.readFileSync(RELATION_SUITE, 'utf8')).queries) suiteQueries.push(q.query);
  const leakedCf = suiteQueries.filter((q) => q.trim().split(/\s+/).length >= 3 && code.includes(q.trim()));
  const CANONICAL_TAX_TERM = /\b(?:tax|taxes|taxable|duty|duties|vat|withholding|deduction|deductions|accounts|receipt|invoice|return|benefits|enterprise|relief|prescription|documentation|certificate|period|fees)\b/i;
  const NON_TAX_SCENARIO_WORD = /\b(?:homework|weekend|lease|school|game|javascript|cabinet|court|library|birthday|club)\b/i;
  const isDomainTerminology = (q) => q.trim().split(/\s+/).length <= 4
    && CANONICAL_TAX_TERM.test(q) && !NON_TAX_SCENARIO_WORD.test(q);
  const r3Hits = r3Rows.map((r) => r.query)
    .filter((q) => q.trim().split(/\s+/).length >= 3 && code.includes(q.trim()));
  const leakedR3 = r3Hits.filter((q) => !isDomainTerminology(q));
  const r3TerminologyOverlap = r3Hits.filter(isDomainTerminology);
  const checks = {
    no_complete_counterfactual_query: leakedCf.length === 0,
    no_complete_r3_query: leakedR3.length === 0,
    no_query_hash_or_oracle_id: !/\b(?:R20N?-[A-Z]{2,4}-\d{3,4}|S1-IR19-\d+|MM-R20-\d+|[0-9a-f]{16,})\b/.test(code),
    no_suite_or_family_feature: !/COMMIT_5R1C\d|_SUITE|governed_tax_relations|legal_title_vs_internal_label|primary_tax_vs_subordinate|unambiguous_vs_polysemous|richer_issuance_vs_bare|tax_claim_vs_ordinary|taxable_output_vs_console|antecedent_vs_metadata|multiclause_reversal|bare_tax_topic/.test(code),
    no_cluster_or_category_feature: !/primaryCategory|acronym_homograph_control|mixed_domain_genuine_tax|CONCRETE_TARGET_TAX_RELATION_MISSED|ACRONYM_AS_LABEL_OR_NAME/.test(code),
    no_scenario_number_branch: !/case 19|Mixed 12|MM-\d\d|Group MM|Situation \d|Matter 3\b|Reference 4\d|Context [1-4]\b|item 12\b/.test(code),
    no_expected_decision_map: !/expectedDecision|expectedReasonCodeFamily|expectedRelations/.test(code),
    no_oracle_relation_backfill: !/expectedRelation|oracleRelation|relationExpectation/.test(code),
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  return {
    checks, failed, pass: failed.length === 0,
    leakedCounterfactualQueries: leakedCf,
    leakedR3Queries: leakedR3,
    r3TerminologyOverlap: [...new Set(r3TerminologyOverlap)],
    terminologyNote: "Canonical Philippine tax terms that coincide with bare-term R3 rows are recorded as domain vocabulary, not memorization. Sentence-shaped rows and non-tax-scenario rows are flagged as leakage.",
  };
}

/**
 * Clause-segmentation probes. Acceptance gate for C16; NOT part of the 282-query
 * relation denominator. Each probe may assert a decision, required/forbidden
 * relations, and the expected primary-task clause shape.
 */
export function runClauseProbes(analyze) {
  if (!fs.existsSync(CLAUSE_PROBES)) return { total: 0, passed: 0, failed: 0, failures: [], byFamily: {}, suiteMissing: true };
  const s = JSON.parse(fs.readFileSync(CLAUSE_PROBES, 'utf8'));
  const failures = []; const byFamily = {};
  let passed = 0;
  for (const q of s.probes) {
    const ev = analyze(q.query);
    const rels = (ev.relations || []).map((x) => x.relation);
    const primary = (ev.clauses || []).find((c) => c.role === 'primary_task');
    const problems = [];
    if (q.expectedDecision && ev.decision !== q.expectedDecision) problems.push(`decision ${ev.decision}!=${q.expectedDecision}`);
    for (const r of q.expectedRelations || []) if (!rels.includes(r)) problems.push(`missing ${r}`);
    for (const r of q.forbiddenRelations || []) if (rels.includes(r)) problems.push(`forbidden ${r}`);
    if (q.expectedClauseCount != null && (ev.clauses || []).length !== q.expectedClauseCount) {
      problems.push(`clauseCount ${(ev.clauses || []).length}!=${q.expectedClauseCount}`);
    }
    if (q.primaryTaskContains && !(primary && lowerish(primary.text).includes(lowerish(q.primaryTaskContains)))) {
      problems.push(`primaryTask ${JSON.stringify(primary && primary.text)} lacks ${JSON.stringify(q.primaryTaskContains)}`);
    }
    if (q.primaryTaskExcludes && primary && lowerish(primary.text).includes(lowerish(q.primaryTaskExcludes))) {
      problems.push(`primaryTask still contains ${JSON.stringify(q.primaryTaskExcludes)}`);
    }
    if (!problems.length) passed++;
    else {
      byFamily[q.family] = (byFamily[q.family] || 0) + 1;
      failures.push({
        family: q.family, pair: q.pair, query: q.query, problems,
        actualDecision: ev.decision, actualRelations: rels,
        clauses: (ev.clauses || []).map((c) => ({ id: c.clauseId, role: c.role, text: c.text })),
      });
    }
  }
  return { total: s.probes.length, passed, failed: failures.length, byFamily, failures, pairs: s.pairCount };
}
const lowerish = (x) => String(x == null ? '' : x).toLowerCase();

/**
 * Clause-schema regression: segmentation must stay deterministic, stably ordered and
 * positionally identified, with exactly one primary_task clause and no empty spans.
 */
export function clauseSchemaRegression(analyze, queries) {
  const viol = { emptyClause: [], idNotPositional: [], notExactlyOnePrimary: [], unstable: [], roleOutsideSchema: [] };
  const ROLES = ['primary_task', 'modifier', 'context', 'quotation', 'other'];
  for (const q of queries) {
    const ev = analyze(q);
    const cs = ev.clauses || [];
    cs.forEach((c, i) => {
      if (!String(c.text || '').trim()) viol.emptyClause.push({ q, id: c.clauseId });
      if (c.clauseId !== `c${String(i + 1).padStart(2, '0')}`) viol.idNotPositional.push({ q, id: c.clauseId, i });
      if (!ROLES.includes(c.role)) viol.roleOutsideSchema.push({ q, role: c.role });
    });
    if (cs.filter((c) => c.role === 'primary_task').length !== 1) viol.notExactlyOnePrimary.push({ q, n: cs.filter((c) => c.role === 'primary_task').length });
    const again = (analyze(q).clauses || []).map((c) => c.clauseId + '' + c.role + '' + c.text);
    const first = cs.map((c) => c.clauseId + '' + c.role + '' + c.text);
    if (JSON.stringify(again) !== JSON.stringify(first)) viol.unstable.push({ q });
  }
  const counts = Object.fromEntries(Object.entries(viol).map(([k, v]) => [k, v.length]));
  return { counts, violations: Object.fromEntries(Object.entries(viol).map(([k, v]) => [k, v.slice(0, 15)])), pass: Object.values(counts).every((n) => n === 0) };
}

/**
 * Reason-focused counterfactual suite (v8). Scored on the single controlling reason
 * code by strict equality, matching the frozen scorer, plus the declared decision.
 */
export function runReasonCounterfactuals(analyze) {
  if (!fs.existsSync(REASON_SUITE)) return { total: 0, passed: 0, failed: 0, byFamily: {}, failures: [], suiteMissing: true };
  const s = JSON.parse(fs.readFileSync(REASON_SUITE, 'utf8'));
  const failures = []; const byFamily = {};
  let passed = 0; let total = 0; const probes = [];
  for (const q of s.queries) {
    const ev = analyze(q.query);
    if (q.controlling === false) {
      probes.push({ family: q.family, query: q.query, actualReason: ev.reasonCode, actualDecision: ev.decision });
      continue;
    }
    total++;
    const reasonOk = !q.expectedReason || ev.reasonCode === q.expectedReason;
    const decisionOk = !q.expectedDecision || ev.decision === q.expectedDecision;
    const forbiddenHit = (q.forbiddenReasons || []).includes(ev.reasonCode);
    if (reasonOk && decisionOk && !forbiddenHit) passed++;
    else {
      byFamily[q.family] = (byFamily[q.family] || 0) + 1;
      failures.push({
        family: q.family, pair: q.pair, query: q.query,
        expectedReason: q.expectedReason, actualReason: ev.reasonCode,
        expectedDecision: q.expectedDecision, actualDecision: ev.decision,
        forbiddenReasons: q.forbiddenReasons || [], forbiddenHit,
        actualRelations: (ev.relations || []).map((x) => x.relation),
      });
    }
  }
  return { total, passed, failed: failures.length, byFamily, failures, pairs: s.pairCount, authoredQueries: s.queries.length, nonControllingProbes: probes.length, probes };
}

/**
 * Focused reason regression: every reason family required anywhere in R3 must be
 * fully satisfied, bucket by bucket.
 */
export function focusedReasonRegression(rows, analyze) {
  const perFamily = {};
  for (const r of rows) {
    const fam = r.expectedReasonCodeFamily;
    perFamily[fam] ??= { required: 0, satisfied: 0 };
    perFamily[fam].required++;
    if (analyze(r.query).reasonCode === fam) perFamily[fam].satisfied++;
  }
  return { perFamily, allBucketsPass: Object.values(perFamily).every((v) => v.required === v.satisfied) };
}

/** Determinism over decision, reason and the full relation tuple list. */
export function determinism(queries, reps, analyze) {
  let drift = 0; let relDrift = 0;
  for (const q of queries) {
    const ev0 = analyze(q);
    const base = ev0.decision + '\u0001' + ev0.reasonCode;
    const relBase = JSON.stringify((ev0.relations || []).map((r) => [r.source, r.relation, r.target, r.clauseId, r.evidenceSpan]));
    for (let i = 1; i < reps; i++) {
      const ev = analyze(q);
      if (ev.decision + '\u0001' + ev.reasonCode !== base) drift++;
      if (JSON.stringify((ev.relations || []).map((r) => [r.source, r.relation, r.target, r.clauseId, r.evidenceSpan])) !== relBase) relDrift++;
    }
  }
  return { queries: queries.length, reps, evaluations: queries.length * reps, decisionDrift: drift, relationDrift: relDrift, pass: drift === 0 && relDrift === 0 };
}
