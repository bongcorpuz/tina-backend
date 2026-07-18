# Repository, Scope, Runner, And Hash Evidence

- Branch: feature/source-availability-engine-v1.
- HEAD: 66b4d2773308a3be205c57967a57981f0f95fb02.
- Upstream sync: 0 0.
- Expected ancestry: d5cfceb -> f44490d -> ba08ae7 -> 8fcee26 -> 66b4d27.
- Tracked worktree: clean; only protected untracked .claude/, .vscode/, evaluation/factcheck/ appear.
- Diff scope: answer-support validator, one R3 focused test, R3 evidence/report/result files, CURRENT_STATE.
- git diff --check: clean.
- Executor EVIDENCE_MANIFEST.sha256: recomputed OK.

Fresh runner evidence:

- Focused R3 suite: 35 passed, 0 failed, 63 assertions.
- Deterministic runner: syntax checks 10/0; deterministic suites 193/0; exit 0.
- Staging sandbox run: 7 run, 1 failed because phase-09r staging reachability was unavailable in restricted sandbox.
- Staging network-enabled rerun: 7/0; exit 0.

Scope exclusions confirmed by diff inventory: no source-bank, corpus, vector, retrieval, reranker, prompt, question-bank, package, env, frontend, Dev Factory, production, database, schema, migration, reindex, or model change.
