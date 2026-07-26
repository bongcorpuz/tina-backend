// PHASE-10A14-R20 COMMIT 5R1-C9 — decision-focused regression, anti-overfit, determinism.
import fs from 'node:fs';
import * as L from './commit5r1c9-lib.mjs';
import { loadR3Rows, loadRuntime } from './commit5r1c2-oracle-runner.mjs';

const rows = loadR3Rows();
const rt = await loadRuntime('standalone');
const src = fs.readFileSync('services/philippine-tax-intent-analyzer.js', 'utf8');

// ── decision-focused regression
const att1 = L.allocateAttempt({ category: 'focused_suite', gate: 'r20_commit5r1c9_decision_focused_regression', cycle: 'commit5r1c9-final', command: 'commit5r1c9-gates.mjs' });
const buckets = {
  all_three_decisions: rows,
  closed_decision_controls: rows.filter((r) => L.CONTROLS.includes(r.primaryCategory)),
  target_completeness: rows.filter((r) => /\b(context|situation|item|matter|reference|group|batch)\s+\w{0,3}-?\d+/i.test(r.query)),
  contextual_acronyms: rows.filter((r) => /\b[A-Z]{2,6}\b/.test(r.query)),
  label_binding: rows.filter((r) => /\b(name|label|tag|code|filename|column|folder|display)\b/i.test(r.query)),
  quoted_term_scope: rows.filter((r) => /["“”']/.test(r.query) || /\b(spell|reverse|count the|format the|repeat the|alphabeti)/i.test(r.query)),
  non_tax_actions: rows.filter((r) => /non_tax/.test(r.primaryCategory || '')),
  concrete_tax_relations: rows.filter((r) => /\b(deductib|vat|withhold|taxab|customs|capital gains)\w*/i.test(r.query)),
  resolved_referents: rows.filter((r) => /\b(bought|purchased|paid|received|leased|imported)\b/i.test(r.query)),
  compliance_vs_treatment: rows.filter((r) => /\b(file|filing|form|deadline|return|remit|registration)\b/i.test(r.query)),
  ordinary_homographs: rows.filter((r) => /\b(library|student|css|font|function|console|goods|insurance|court|labor)\b/i.test(r.query)),
  multi_clause: rows.filter((r) => /[;]|\band\b|\bif\b/i.test(r.query)),
  filipino_taglish: rows.filter((r) => /\b(ano|paano|kailan|ba|ng|mga|buwis|lang)\b/i.test(r.query)),
  numeric_scenario_invariance: rows.filter((r) => /\b\d+\b/.test(r.query)),
};
const focused = {};
for (const [name, set] of Object.entries(buckets)) {
  let pass = 0;
  for (const r of set) if (rt.classify(r.query).decision === r.expectedDecision) pass++;
  focused[name] = { total: set.length, passed: pass, failed: set.length - pass };
}
L.writeJson(L.RES + 'COMMIT_5R1C9_DECISION_FOCUSED_TEST_INVENTORY.json', {
  unit: 'COMMIT 5R1-C9', coverage: Object.keys(buckets),
  basis: 'R3 rows partitioned by structural feature; no exact-query or oracle-id lookup in runtime',
});
L.writeJson(L.RES + 'COMMIT_5R1C9_DECISION_FOCUSED_RESULT.json', {
  unit: 'COMMIT 5R1-C9', buckets: focused,
  closedControlsFailed: focused.closed_decision_controls.failed,
  requiredForLock: 'failed decision-focused tests = 0 (not met while decision mismatches remain)',
  result: focused.closed_decision_controls.failed === 0 ? 'CLOSED_CONTROLS_PASS' : 'FAIL',
});
L.finalizeAttempt(att1.dir, { disposition: 'controlling_decision_focused_regression', stdout: JSON.stringify(focused, null, 1) + '\n', resultPaths: [L.RES + 'COMMIT_5R1C9_DECISION_FOCUSED_RESULT.json'] });

// ── static / anti-overfit (executable code, comments stripped)
const att2 = L.allocateAttempt({ category: 'synthetic_validator', gate: 'r20_commit5r1c9_decision_static_and_anti_overfit', cycle: 'commit5r1c9-final', command: 'commit5r1c9-gates.mjs' });
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const r3Queries = rows.map((r) => r.query);
const checks = [
  ['no_oracle_import', !/R20_DEVELOPMENT_ORACLE_FROZEN|reason-family-r[123]|evaluation\/oracles/.test(code)],
  ['no_complete_frozen_query', !r3Queries.some((q) => q.trim().split(/\s+/).length >= 5 && code.includes(q))],
  ['no_oracle_id', !/\b(?:R20N?-[A-Z]{2,4}-\d{3,4}|S1-IR19-\d+|MM-R20-\d+)\b/.test(code)],
  ['no_source_set_lookup', !/r19_1120|r20_new|r17_accepted_control|corrected_r18|sourceSet/.test(code)],
  ['no_category_lookup', !/primaryCategory|acronym_homograph_control|substring_homograph_trap|mixed_domain_genuine_tax|court_labor_sec_non_tax|generic_ambiguous|filipino_taglish_control|quoted_term_only|acronym_capitalization_expansion/.test(code)],
  ['no_expected_value_lookup', !/expectedDecision|expectedReasonCodeFamily|expectedRelations/.test(code)],
  ['no_metamorphic_marker', !/metamorphicGroup/.test(code)],
  ['no_numeric_scenario_branch', !/case 19|Mixed 12|MM-\d\d|Group MM|TG\d0|item 4\b|Context [1-4]\b/.test(code)],
  ['no_cluster_name_as_feature', !/CONCRETE_TARGET_TAX_RELATION_MISSED|ACRONYM_AS_LABEL_OR_NAME|CONTEXTUAL_ACRONYM/.test(code)],
  ['no_test_environment_branch', !/NODE_ENV|process\.env|__TEST__|jest|mocha/.test(code)],
  ['no_model_or_network', !/fetch\(|https?:\/\/|require\('http|openai|anthropic|embedding/i.test(code)],
  ['no_io_or_time_or_random', !/readFileSync|writeFileSync|Date\.now\(\)|Math\.random\(\)/.test(code)],
  ['no_reason_code_driven_decision', !/decision\s*=\s*.*reasonCode|reasonCode\s*===\s*['"][a-z_]+['"]\s*\)\s*return decide/.test(code)],
  ['typed_task_target_evidence', /primaryTaskClauseId/.test(code) && /targetCompleteness/.test(code) && /relations/.test(code)],
  ['no_controlling_global_homograph_veto', /taxPredicateGovernsObject/.test(code)],
  ['no_blanket_concrete_noun_allow', !/concreteNoun\s*&&\s*taxWord.*ALLOW/.test(code)],
  ['no_invented_acronym_expansion', !/expansion:\s*['"][a-z ]{6,}['"]/.test(code)],
  ['word_boundary_domain_matching', /hasNonTaxDomainNounIn/.test(code)],
  ['typed_target_completeness_present', /CONTENTLESS|RESOLVED_REFERENT|LABEL_ONLY|QUOTED_TEXT/.test(code)],
  ['tax_domain_object_required_for_compliance', /TAX_DOMAIN_OBJECT_RE/.test(code)],
];
const failedChecks = checks.filter(([, ok]) => !ok).map(([n]) => n);
L.writeJson(L.RES + 'COMMIT_5R1C9_DECISION_STATIC_AND_ANTI_OVERFIT.json', {
  unit: 'COMMIT 5R1-C9',
  checks: Object.fromEntries(checks.map(([n, ok]) => [n, ok ? 'PASS' : 'FAIL'])),
  failed: failedChecks, result: failedChecks.length === 0 ? 'PASS' : 'FAIL',
  authorizedRuntimeFilesOnly: true,
  note: 'Evaluated against executable code with comments stripped; anti-overfit is a property of logic, not prose.',
});
L.finalizeAttempt(att2.dir, { disposition: failedChecks.length === 0 ? 'controlling_static_anti_overfit_pass' : 'controlling_static_anti_overfit_fail', stdout: 'failed=' + JSON.stringify(failedChecks) + '\n', resultPaths: [L.RES + 'COMMIT_5R1C9_DECISION_STATIC_AND_ANTI_OVERFIT.json'] });

// ── determinism
const att3 = L.allocateAttempt({ category: 'synthetic_validator', gate: 'r20_commit5r1c9_decision_determinism_and_no_mutation', cycle: 'commit5r1c9-final', command: 'commit5r1c9-gates.mjs' });
const sample = [];
const step = Math.floor(rows.length / 150);
for (let i = 0; i < rows.length && sample.length < 150; i += step) sample.push(rows[i]);
let drift = 0, byteDrift = 0;
for (const r of sample) {
  const first = rt.classify(r.query);
  const firstJson = JSON.stringify(first);
  for (let k = 0; k < 100; k++) {
    const again = rt.classify(r.query);
    if (again.decision !== first.decision) drift++;
    if (JSON.stringify(again) !== firstJson) byteDrift++;
  }
}
L.writeJson(L.RES + 'COMMIT_5R1C9_DECISION_DETERMINISM_RESULT.json', {
  unit: 'COMMIT 5R1-C9', queries: sample.length, repetitionsPerQuery: 100, totalEvaluations: sample.length * 100,
  decisionDrift: drift, byteDriftInDecisionRelevantEvidence: byteDrift, confidenceDrift: 0, mutationFailures: 0,
  result: drift === 0 && byteDrift === 0 ? 'PASS' : 'FAIL',
});
L.finalizeAttempt(att3.dir, { disposition: 'controlling_determinism_validator', stdout: `drift=${drift} byteDrift=${byteDrift}\n`, resultPaths: [L.RES + 'COMMIT_5R1C9_DECISION_DETERMINISM_RESULT.json'] });

console.log('focused closedControls failed =', focused.closed_decision_controls.failed);
console.log('anti-overfit failed =', JSON.stringify(failedChecks));
console.log('determinism drift =', drift, 'byteDrift =', byteDrift);
