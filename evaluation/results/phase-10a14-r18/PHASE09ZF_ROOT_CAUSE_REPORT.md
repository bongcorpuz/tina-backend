# PHASE-10A14-R18 — 09ZF ROOT-CAUSE REPORT (P1-R17-IR1-004)

## 1. Matrix

The cause was not assumed. All three conditions were executed before any change.

| Condition | Pre-fix | Post-fix |
|---|---|---|
| A — truly clean repository | **PASS** exit 0, 18/0, 187 assertions | **PASS** exit 0, 18/0, 187 assertions |
| B — untracked harmless evidence file | **FAIL** exit 1 | **PASS** exit 0, 18/0, 187 assertions |
| C — planted `server.js` change | **FAIL** exit 1 | **FAIL** exit 1 (correct) |

Pre-fix Condition B failing detail:

```
FAIL no disallowed runtime, package, env, database, frontend, or production files changed
  changed file is allowed: evaluation/results/phase-10a14-r18-condB-probe/note.txt
```

That is the **exact assertion string** that failed both independent R17 gate cycles,
produced here by a file containing the word "harmless" and nothing else.

## 2. Classification — LANE A + LANE B

**Not a runtime regression.** Condition A passes every safe-LOA `controlled_loa_answer`
case, every excluded unsafe query and the unrelated-tax routing checks on a clean tree,
before and after. No LOA runtime or ordering change was warranted, and none was made.
`evaluateControlledLoaAskGate`, the boundary decision, Step 12.65 and Step 12.6 ordering
are untouched.

**Cause.** `diffNames()` unions `git diff --name-only` with **all** untracked files (minus a
hardcoded protected list). The allowed-file assertion then requires every entry to appear in
a seven-item allowlist. Any untracked file whatsoever is therefore reported as a disallowed
runtime/package/env/database/frontend/production change — including evidence that an
authorized reviewer necessarily writes while running the gate.

**Corroboration.** The independent gate evidence showed an in-progress review directory and
a modified R17 all-26 evidence file present during execution. Both are exactly the kind of
path Condition B proves sufficient, on its own, to fail the suite.

## 3. Remedy

**Lane A — execution discipline.** All gate output is captured outside the repository. No
evidence is imported until the gate process terminates. `run-gate-cycle.mjs` refuses to
start unless the tracked tree is clean and the only untracked paths are the protected ones.

**Lane B — narrowed classification.** Discipline alone fixes R18's own gates, but the
mandatory Codex 5.5 independent review must create evidence while running the gate — which
is what blocked two independent reviews. `isEvidenceArtifact()` is a **closed, explicit
list**: `evaluation/results/`, `reviews/`, and `PHASE-*_REPORT.md`.

It is applied **only** to the allowed-file check. The prohibited-class checks continue to
run against the **complete, unfiltered** change list, so a forbidden file is caught even
when placed inside an evidence directory — proven by three explicit controls.

## 4. The guard remains live

Still fails on every mandated class: `server.js`, `ask-handler.js`, routes, auth files,
`package.json`, `package-lock.json`, `.env`, database/migration files, supabase,
retrieval/reranker files, frontend, public, production, deploy, the controlled LOA runtime
scaffold, and any planted forbidden runtime marker.

Deliberately **not** exempt: fixtures, tests, `services/`, `scripts/`, arbitrary top-level
files, and report names lacking a `PHASE-` prefix. The guard is not disabled and no
arbitrary runtime file is excluded.

`tests/phase-10a14-r18-09zf-scope-guard.test.mjs` — 6 passed, 0 failed, 50 assertions,
exit 0 — provides a negative control for every ignored class.

## 5. Out of scope

The separate follow-up-memory issue shown by vague questions such as `Can you help me?`
belongs to Phase 10G-C / Phase 13C. R18 did not expand into it.
