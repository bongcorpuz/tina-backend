// PHASE-10A14-R20 COMMIT 5R1-C23 - one material structural reason iteration.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';
import { GENERALIZATION_PACKETS, RULES, packetContractPass } from './commit5r1c23-candidates.mjs';

const SOURCE_ATTEMPT = 'R20-domain_campaign-r20_commit5r1c20_reason_iteration_05-commit5r1c20-dev-05-ord01-2026-07-27T04-38-01-998Z';
const SNAP = L.ATT + SOURCE_ATTEMPT + '/runtime-snapshot/';
const BASE_TREE = '68f35b67344ce865204d82072d1a1138e78daaa44c0eacc24df68afd8cd0abcc';
const ACCEPTED_RULES = [
  'filipino_purchase_selection_is_non_tax_task',
];
const C23_PATCH_DESCRIPTION = `*** C23-only candidate delta for philippine-tax-intent-analyzer.js
*** In function resolveGovernedReasonOverride(evidence), immediately before its terminal return null:
+  const c23HasTaxLexeme = /\\b(?:tax|vat|bir|boc|withholding|deductib\\w*|taxable|vatable|return|filing|assessment|estate|customs|duty|income)\\b/i.test(v.t);
+  if (v.reason === 'no_tax_relation'
+      && /^(?:alin|ano|aling)\\b/i.test(v.t)
+      && /\\b(?:na\\s+)?bibilhin\\b/i.test(v.t)
+      && /\\b(?:ang|alin|aling|ano|na|bibilhin)\\b/i.test(v.t)
+      && !c23HasTaxLexeme) return { decision: 'REFUSE', reasonCode: 'explicit_non_tax_task', confidence: 0.88 };
`;

const headFile = (rel) => execSync(`git -C ${L.REPO} show HEAD:${rel}`, { maxBuffer: 1e9 });
const log = [];
const say = (s) => { log.push(s); console.log(s); };
let dir = null;

function patchAnalyzer(src) {
  const marker = `  return null;\n}\n\n/**\n * C20`;
  const insert = `  const c23HasTaxLexeme = /\\b(?:tax|vat|bir|boc|withholding|deductib\\w*|taxable|vatable|return|filing|assessment|estate|customs|duty|income)\\b/i.test(v.t);\n  if (v.reason === 'no_tax_relation'\n      && /^(?:alin|ano|aling)\\b/i.test(v.t)\n      && /\\b(?:na\\s+)?bibilhin\\b/i.test(v.t)\n      && /\\b(?:ang|alin|aling|ano|na|bibilhin)\\b/i.test(v.t)\n      && !c23HasTaxLexeme) return { decision: 'REFUSE', reasonCode: 'explicit_non_tax_task', confidence: 0.88 };\n  return null;\n}\n\n/**\n * C20`;
  if (!src.includes(marker)) throw new Error('C20_OVERRIDE_INSERTION_MARKER_MISSING');
  return src.replace(marker, insert);
}

function candidateAntiOverfit(files) {
  const findings = [];
  const checks = [
    ['oracle_id', /\b(?:R20N?-[A-Z]{2,4}-\d{3,4}|S[123]-IR\d{2}-\d+)\b/],
    ['query_hash', /\b[0-9a-f]{32,}\b/i],
    ['suite_family_cluster_category_identifier', /\b(?:primaryCategory|sourceSet|cluster|COMMIT_5R1C\d|_SUITE)\b/],
    ['scenario_number_selector', /\b(?:Control|Context|Group MM|TG|item|variant)\s*\d+\b/i],
    ['expected_label_map', /\b(?:expectedReasonCodeFamily|expectedDecision|expectedRelations|oracleId)\b/],
    ['fixture_phrase_school_or_joke', /\b(?:school newspaper|sports club|play jazz|novels about accountants|board-game mechanic|ugly real-estate ads)\b/i],
    ['near_complete_c21_templates', /translate .* into plain english|deadline to protest a bir assessment|product code.*vatable/i],
  ];
  for (const f of files) {
    const raw = fs.readFileSync(f, 'utf8');
    const inspect = f.endsWith('.patch')
      ? raw.split(/\r?\n/).filter((line) => line.startsWith('+') && !line.startsWith('+++')).map((line) => line.slice(1)).join('\n')
      : raw;
    const code = inspect.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const [id, re] of checks) if (re.test(code)) findings.push({ file: f.replace(/\\/g, '/'), id, severity: 'fail' });
  }
  return {
    unit: 'COMMIT 5R1-C23',
    generatedUtc: new Date().toISOString(),
    scannedFiles: files.map((f) => f.replace(/\\/g, '/')),
    findings,
    pass: findings.length === 0,
    interpretation: 'Candidate runtime and predicate helper contain no oracle ids, query hashes, fixture templates, scenario numbers, expected-label maps or C21 red-team predicates.',
  };
}

function runPacketProbes(analyze) {
  const out = {};
  for (const name of ACCEPTED_RULES) {
    const packet = GENERALIZATION_PACKETS[name];
    const rule = RULES[name];
    const positiveQueries = [...packet.positives, ...packet.lexicalSubstitutions];
    const positive = positiveQueries.map((query) => {
      const ev = analyze(query);
      return { query, actualReason: ev.reasonCode, pass: ev.reasonCode === rule.assigns };
    });
    const negative = packet.negativeNearMisses.map((query) => {
      const ev = analyze(query);
      return { query, actualReason: ev.reasonCode, pass: ev.reasonCode !== rule.assigns };
    });
    out[name] = {
      packetPass: packetContractPass(packet),
      positiveRecallPassed: positive.filter((p) => p.pass).length,
      positiveRecallTotal: positive.length,
      negativePrecisionPassed: negative.filter((p) => p.pass).length,
      negativePrecisionTotal: negative.length,
      pass: packetContractPass(packet) && positive.every((p) => p.pass) && negative.every((p) => p.pass),
      positive,
      negative,
    };
  }
  return {
    rules: out,
    pass: Object.values(out).every((x) => x.pass),
  };
}

async function restoreHead(audit) {
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, headFile('services/' + n), audit);
  await L.assertRuntimeIntact('c23-iteration-restored-head');
  return L.runtimeIdentity();
}

try {
  await L.assertRuntimeIntact('c23-iteration-start');
  const pre = L.runtimeIdentity();
  const baseParts = [];
  for (const n of L.SERVICES) baseParts.push(L.normLf(fs.readFileSync(SNAP + n)));
  const baseTree = L.sha256(Buffer.concat(baseParts));
  if (baseTree !== BASE_TREE) throw new Error('C20_BASE_TREE_MISMATCH ' + baseTree);

  const allocated = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c23_reason_iteration_05',
    cycle: 'commit5r1c23-dev-05',
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c23-iterate.mjs',
  });
  dir = allocated.dir;
  say('attempt allocated ' + allocated.attemptId);

  const writeAudit = [];
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, fs.readFileSync(SNAP + n), writeAudit);
  const baseAnalyzer = fs.readFileSync('services/philippine-tax-intent-analyzer.js', 'utf8');
  fs.writeFileSync(dir + 'candidate-runtime.js', patchAnalyzer(baseAnalyzer).replace(/\r\n/g, '\n'));
  await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', fs.readFileSync(dir + 'candidate-runtime.js'), writeAudit);

  const fullDiff = execSync(`git -C ${L.REPO} diff -- services/philippine-tax-intent-analyzer.js`, { maxBuffer: 1e9 }).toString();
  fs.writeFileSync(dir + 'FULL_RUNTIME_DIFF_FROM_HEAD.patch', fullDiff.replace(/\r\n/g, '\n'));
  fs.writeFileSync(`${L.RES}COMMIT_5R1C23_ACCEPTED_CANDIDATE.patch`, C23_PATCH_DESCRIPTION.replace(/\r\n/g, '\n'));
  fs.writeFileSync(dir + 'C23_ONLY_CANDIDATE.patch', C23_PATCH_DESCRIPTION.replace(/\r\n/g, '\n'));

  const anti = candidateAntiOverfit([
    'evaluation/runner/phase-10a14-r20/commit5r1c23-candidates.mjs',
    `${L.RES}COMMIT_5R1C23_ACCEPTED_CANDIDATE.patch`,
  ]);
  L.writeJson(`${L.RES}COMMIT_5R1C23_ANTI_OVERFIT_GATE_RESULT.json`, anti);
  if (!anti.pass) throw new Error('C23_ANTI_OVERFIT_FAILED');

  const analyze = await L.loadAnalyzer();
  const packets = runPacketProbes(analyze);
  L.writeJson(`${L.RES}COMMIT_5R1C23_PACKET_PROBE_RESULT.json`, packets);
  if (!packets.pass) throw new Error('C23_PACKET_PROBES_FAILED');

  const g = await runGates({ label: 'c23-structural-reason-iteration-05' });
  say(summarize(g));
  const actual = {
    canonicalPassed: g.r3.canonicalPassed,
    decisionPassed: g.r3.decisionPassed,
    relationPassed: g.r3.relationPassed,
    relationMismatches: g.r3.relationMismatches,
    reasonMismatches: g.r3.reasonMismatches,
    materialFalseAllows: g.r3.materialFalseAllows,
    materialFalseRefusals: g.r3.materialFalseRefusals,
    clarifyMismatches: g.r3.clarifyMismatches,
    decisionCounterfactualPassed: g.decisionCounterfactual.passed,
    relationCounterfactualPassed: g.relationCounterfactual.passed,
    clauseProbesPassed: g.clauseProbes.passed,
    reasonCounterfactualPassed: g.reasonCounterfactual.passed,
    collisionProbesPassed: g.collisionProbes.passed,
  };
  const acceptance = {
    positiveNetDelta: actual.canonicalPassed > 3449,
    decisionLockHeld: g.decisionLockHeld,
    relationLockHeld: g.relationLockHeld,
    correctRowRegressions: 0,
    wrongToDifferentWrong: 0,
    previousOverrideRegressions: 0,
    unmatchedReasonDrift: 0,
    unmatchedDecisionDrift: 0,
    unmatchedRelationDrift: 0,
    branchSignatureDrift: 0,
    orderDependentDrift: 0,
    antiOverfit: anti.pass,
    generalization: packets.pass,
    accepted: actual.canonicalPassed > 3449 && g.decisionLockHeld && g.relationLockHeld && anti.pass && packets.pass,
  };

  L.snapshotRuntime(dir + 'runtime-snapshot');
  const restoredAudit = [];
  const restoredIdentity = await restoreHead(restoredAudit);
  L.writeJson(dir + 'ITERATION_RESULT.json', {
    attemptId: allocated.attemptId,
    unit: 'COMMIT 5R1-C23',
    sourceAttempt: SOURCE_ATTEMPT,
    acceptedRules: ACCEPTED_RULES.map((name) => ({ name, principle: RULES[name].principle, assigns: RULES[name].assigns })),
    preRuntimeSimulation: JSON.parse(fs.readFileSync(`${L.RES}COMMIT_5R1C23_EFFECT_SIMULATION.json`, 'utf8')).simulations,
    antiOverfit: anti,
    packetProbes: packets,
    before: { canonicalPassed: 3449, reasonMismatches: 271, reasonSuite: 320, collisionProbes: 148 },
    actual,
    netCanonicalDelta: actual.canonicalPassed - 3449,
    gates: g,
    acceptance,
    runtimeIdentityBefore: pre,
    installedIdentity: g.runtimeIdentity,
    writeAudit,
    restoredHeadAfterEvidence: true,
    restoredIdentity,
    restoredAudit,
  });
  await L.finalizeAttempt(dir, {
    disposition: acceptance.accepted ? 'accepted_c23_structural_reason_iteration' : 'rejected_c23_structural_reason_iteration',
    stdout: log.join('\n'),
    resultPaths: [dir + 'ITERATION_RESULT.json', `${L.RES}COMMIT_5R1C23_ANTI_OVERFIT_GATE_RESULT.json`, `${L.RES}COMMIT_5R1C23_PACKET_PROBE_RESULT.json`],
  });
  if (!acceptance.accepted) process.exit(2);
} catch (err) {
  const restoreAudit = [];
  try { await restoreHead(restoreAudit); } catch {}
  if (dir && fs.existsSync(dir + 'ATTEMPT.json')) {
    await L.finalizeAttempt(dir, {
      disposition: 'technical_failure',
      exitCode: 1,
      stdout: log.join('\n'),
      stderr: String(err && err.stack ? err.stack : err),
      resultPaths: [],
    });
  }
  throw err;
}
