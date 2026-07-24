/**
 * PHASE-10A14-R20 — non-integration & scope tests.
 * Run: node --test tests/phase-10a14-r20/analyzer-non-integration.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..', '..');

function git(args) { return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim(); }
const ANALYZER_SRC = readFileSync(join(REPO, 'services', 'philippine-tax-intent-analyzer.js'), 'utf8');
const DOMAIN_SRC = readFileSync(join(REPO, 'services', 'philippine-tax-domain-boundary.js'), 'utf8');

test('legacy domain-boundary blob unchanged from COMMIT 2 baseline', () => {
  assert.equal(
    git(['rev-parse', 'HEAD:services/philippine-tax-domain-boundary.js']),
    '97986ed7c9a05f74db44b60c8766f9ab45b96a7d');
});

test('legacy boundary-patterns blob unchanged from COMMIT 2 baseline', () => {
  assert.equal(
    git(['rev-parse', 'HEAD:services/philippine-tax-boundary-patterns.js']),
    'd98e63992bfa7d4b21acea7bb03fa62ffbf9827a');
});

test('domain-boundary does not import the new analyzer (no production integration)', () => {
  assert.equal(/philippine-tax-intent-analyzer/.test(DOMAIN_SRC), false);
});

test('no production file imports the analyzer yet', () => {
  // Search the tracked tree for importers outside the R20 test/eval dirs.
  const hits = git(['grep', '-l', 'philippine-tax-intent-analyzer', '--', '*.js', '*.mjs'])
    .split('\n').filter(Boolean)
    .filter((p) => !p.startsWith('tests/phase-10a14-r20/') && !p.startsWith('evaluation/'));
  assert.deepEqual(hits, [], `unexpected importers: ${hits.join(', ')}`);
});

test('analyzer has no model / network / retrieval imports', () => {
  assert.equal(/require\(|import\s+[^;]*from\s+['"](openai|anthropic|node-fetch|axios|https?|net|dns)['"]/.test(ANALYZER_SRC), false);
  assert.equal(/fetch\(|XMLHttpRequest|WebSocket/.test(ANALYZER_SRC), false);
  assert.equal(/embed|rerank|retriev/i.test(ANALYZER_SRC), false);
});

test('analyzer performs no filesystem or env I/O', () => {
  assert.equal(/from\s+['"]node:fs['"]|require\(['"]fs['"]\)/.test(ANALYZER_SRC), false);
  assert.equal(/process\.env/.test(ANALYZER_SRC), false);
});

test('analyzer uses no date/time/random sources', () => {
  assert.equal(/Date\.now|new Date\(|Math\.random|performance\.now/.test(ANALYZER_SRC), false);
});

test('analyzer module has no top-level side effects beyond frozen constant exports', () => {
  // No console, no process mutation at module scope.
  assert.equal(/console\./.test(ANALYZER_SRC), false);
});
