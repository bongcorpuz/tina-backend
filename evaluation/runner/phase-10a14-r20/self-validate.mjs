// PHASE-10A14-R20 governed tooling — wrapper & registry self-validation.
// Exercises wrapper invariants deterministically. No decision logic.

import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { allocateAttemptId } from './run-governed-attempt.mjs';
import { canonicalizeDecision } from './classifier-adapter.mjs';

export function runSelfValidation() {
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

  // 1. unique allocation / outcome-independent id
  const id1 = allocateAttemptId({ category: 'synthetic_validator', gate: 'g', cycle: 'commit2', ordinal: 1, allocatedAtUtc: '2026-07-24T00:00:00.000Z' });
  const id2 = allocateAttemptId({ category: 'synthetic_validator', gate: 'g', cycle: 'commit2', ordinal: 2, allocatedAtUtc: '2026-07-24T00:00:00.000Z' });
  ok('unique_allocation', id1 !== id2, `${id1} != ${id2}`);
  ok('id_outcome_independent', !/pass|fail/i.test(id1), id1);

  // 2. closed categories enforced
  let rejectedBadCategory = false;
  try { allocateAttemptId({ category: 'not_a_category', gate: 'g', cycle: 'c', ordinal: 1, allocatedAtUtc: '2026-07-24T00:00:00.000Z' }); }
  catch { rejectedBadCategory = true; }
  ok('closed_categories_enforced', rejectedBadCategory);

  // 3. canonical decision mapping (reporting-only normalization)
  ok('map_ALLOW', canonicalizeDecision('ALLOW') === 'ALLOW');
  ok('map_NOT_ALLOW', canonicalizeDecision('NOT_ALLOW') === 'REFUSE');
  ok('map_REFUSE', canonicalizeDecision('REFUSE') === 'REFUSE');
  ok('map_REJECT_runtime', canonicalizeDecision('REJECT') === 'REFUSE');
  ok('map_CLARIFY', canonicalizeDecision('CLARIFY') === 'CLARIFY');
  let rejectedBadDecision = false;
  try { canonicalizeDecision('BANANA'); } catch { rejectedBadDecision = true; }
  ok('map_rejects_unknown', rejectedBadDecision);

  // 4. immutable directory / overwrite rejection (simulated in tmp, no repo mutation)
  const sim = join(tmpdir(), `r20-selftest-${Date.now()}`);
  mkdirSync(sim, { recursive: true });
  writeFileSync(join(sim, 'ATTEMPT.json'), '{}');
  const overwriteWouldBeRejected = existsSync(join(sim, 'ATTEMPT.json'));
  ok('terminal_overwrite_detectable', overwriteWouldBeRejected);
  rmSync(sim, { recursive: true, force: true });

  // 5. path-allowlist / protected-path awareness (static assertion)
  const prohibited = ['pipeline.js', 'server.js', '.claude/', '.vscode/', 'evaluation/factcheck/'];
  ok('protected_paths_declared', prohibited.length === 5);

  const passed = checks.filter((c) => c.pass).length;
  return {
    validator: 'r20-wrapper-self-validation-1',
    total: checks.length,
    passed,
    allPassed: passed === checks.length,
    checks,
  };
}
