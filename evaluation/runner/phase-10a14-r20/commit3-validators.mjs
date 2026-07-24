// PHASE-10A14-R20 COMMIT 3 validators — static scope/exports, determinism,
// and evidence completeness. No tax-domain decision logic (it imports and
// exercises the analyzer, but makes no semantic ruling of its own).

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO, gitObject } from './identity.mjs';
import { loadAttemptRecords, reconcileCompleteness } from './registry.mjs';

const ANALYZER_REL = 'services/philippine-tax-intent-analyzer.js';

export async function staticScopeAndExports() {
  const src = readFileSync(join(REPO, ANALYZER_REL), 'utf8');
  const mod = await import(pathToFileURL(join(REPO, ANALYZER_REL)).href);
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

  // Required exports present.
  for (const fn of ['normalizeTaxBoundaryText', 'segmentTaxBoundaryClauses', 'analyzePhilippineTaxIntent', 'decideTaxBoundaryFromEvidence', 'serializeTaxBoundaryEvidence']) {
    ok(`export_${fn}`, typeof mod[fn] === 'function');
  }
  for (const c of ['TAX_BOUNDARY_DECISIONS', 'TAX_BOUNDARY_REASON_CODES', 'TAX_RELATION_TYPES']) {
    ok(`const_${c}`, Array.isArray(mod[c]) && Object.isFrozen(mod[c]));
  }

  // No I/O / network / model / date / random in the analyzer source.
  ok('no_fs_import', !/from\s+['"]node:fs['"]|require\(['"]fs['"]\)/.test(src));
  ok('no_network', !/openai|anthropic|node-fetch|axios|fetch\(|XMLHttpRequest|WebSocket|['"]https?['"]|['"]net['"]|['"]dns['"]/.test(src));
  ok('no_retrieval', !/embed|rerank|retriev/i.test(src));
  ok('no_env', !/process\.env/.test(src));
  ok('no_datetime_random', !/Date\.now|new Date\(|Math\.random|performance\.now/.test(src));
  ok('no_console', !/console\./.test(src));

  // No production integration.
  const domainSrc = readFileSync(join(REPO, 'services/philippine-tax-domain-boundary.js'), 'utf8');
  ok('no_production_integration', !/philippine-tax-intent-analyzer/.test(domainSrc));

  // Legacy blobs unchanged.
  ok('legacy_domain_blob', gitObject('HEAD:services/philippine-tax-domain-boundary.js') === '97986ed7c9a05f74db44b60c8766f9ab45b96a7d');
  ok('legacy_patterns_blob', gitObject('HEAD:services/philippine-tax-boundary-patterns.js') === 'd98e63992bfa7d4b21acea7bb03fa62ffbf9827a');

  // Closed sets enforced: every decision/reason/relation stays in-set on a sweep.
  const sweep = [
    'Is the cooling fan deductible for income tax?', 'Change the cooling fan speed.',
    'What does PAN mean?', 'Use MCIT as the product code.', 'Quote the words "withholding tax".',
    'Are website-design services subject to VAT?', 'RMC is the radio music channel.', '',
  ];
  let inSet = true;
  for (const q of sweep) {
    const ev = mod.analyzePhilippineTaxIntent(q);
    if (!mod.TAX_BOUNDARY_DECISIONS.includes(ev.decision)) inSet = false;
    if (!mod.TAX_BOUNDARY_REASON_CODES.includes(ev.reasonCode)) inSet = false;
    if (ev.reasonCode === 'strong_tax_signal') inSet = false;
    for (const r of ev.relations) if (!mod.TAX_RELATION_TYPES.includes(r.relation)) inSet = false;
  }
  ok('closed_sets_enforced', inSet);

  const passed = checks.filter((c) => c.pass).length;
  return { validator: 'r20-commit3-static-scope-and-exports', total: checks.length, passed, allPassed: passed === checks.length, checks };
}

export async function determinismAndSerialization() {
  const mod = await import(pathToFileURL(join(REPO, ANALYZER_REL)).href);
  const queries = [
    'Is the cooling fan deductible for income tax?',
    'Ano ang VAT sa website design, pero huwag pag-usapan ang pulitika?',
    'Quote the words "withholding tax".',
    'What is the input VAT treatment of a cooking pan purchased by the business? However, rename the folder.',
    'What does PAN mean?', 'Are website-design services subject to VAT?',
    'Change the cooling fan speed.', 'Use MCIT as the product code.',
  ];
  const REPEATS = 100;
  let byteMismatches = 0;
  let mutationFailures = 0;
  for (const q of queries) {
    const s0 = mod.serializeTaxBoundaryEvidence(mod.analyzePhilippineTaxIntent(q));
    for (let i = 0; i < REPEATS; i++) {
      if (mod.serializeTaxBoundaryEvidence(mod.analyzePhilippineTaxIntent(q)) !== s0) byteMismatches++;
    }
    const ev = mod.analyzePhilippineTaxIntent(q);
    try { ev.decision = 'X'; if (ev.decision === 'X') mutationFailures++; } catch { /* frozen: good */ }
  }
  return {
    validator: 'r20-commit3-determinism-and-serialization',
    representativeQueries: queries.length, repeatedRunsPerQuery: REPEATS,
    byteMismatches, mutationFailures,
    allPassed: byteMismatches === 0 && mutationFailures === 0,
  };
}

export function evidenceCompleteness() {
  const records = loadAttemptRecords();
  const recon = reconcileCompleteness(records);
  const commit2Immutable = records
    .filter((r) => r.cycle === 'commit2')
    .every((r) => existsSync(join(REPO, r.stdoutPath)));
  return {
    validator: 'r20-commit3-evidence-completeness',
    ...recon,
    commit2AttemptsPresent: records.filter((r) => r.cycle === 'commit2').length,
    commit3AttemptsPresent: records.filter((r) => r.cycle === 'commit3').length,
    commit2Immutable,
    allPassed: recon.closureComplete && commit2Immutable,
  };
}
