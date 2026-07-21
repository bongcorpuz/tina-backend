# PHASE-10A14-R18 — 09ZF CLEAN REPRODUCTION PLAN

Frozen before implementation. **The cause is not assumed before clean reproduction.**

## 1. What must be determined

The two independent R17 gate cycles each failed one suite of 210:

```
tests/phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs
FAIL no disallowed runtime, package, env, database, frontend, or production files changed
```

The independent gate evidence also showed an in-progress review directory and a modified R17
all-26 evidence file present during execution.

R18 must determine whether this is a true runtime/scope regression, evidence-capture
contamination, a scope-guard classification defect, or a combination. Four hypotheses are
live until the matrix decides between them.

## 2. Pre-fix matrix — run before any change

### Condition A — truly clean repository
No in-repo R18 evidence directory; logs captured outside the repository; no modified
historical evidence; only protected untracked paths present.

### Condition B — authorized untracked evidence directory present
One temporary R18 evidence path containing harmless text.

### Condition C — planted disallowed runtime change
One temporary disallowed runtime marker in a genuinely forbidden file, restored exactly
afterwards with hash proof before and after.

## 3. Decision rule

| A | B | C | Classification | Lane |
|---|---|---|---|---|
| PASS | FAIL | FAIL | Guard misclassifies evidence-only paths as runtime changes; not a runtime regression | A + B |
| PASS | PASS | FAIL | Pure execution-discipline problem in the review environment | A |
| FAIL | — | — | True runtime/ordering failure | C |
| — | — | PASS | Guard is not live; it cannot detect a real violation | blocker |

Condition C **must** fail. A guard that passes Condition C is a dead guard and is itself a
blocking finding, regardless of A and B.

## 4. Lane A remedy — execution discipline

Capture all gate output outside the repository. Import no evidence until the gate process has
terminated. Require a clean tracked tree and only protected untracked paths before each
cycle. Never run a gate with an in-progress evidence directory untracked in the tree.

## 5. Lane B remedy — narrow the classification, not the guard

Permitted only if the matrix proves the guard treats authorized evidence files as
runtime/package/env/database/frontend/production changes.

The guard must continue to fail on every one of:

`server.js`, `ask-handler.js`, routes, auth files, `package.json`, `package-lock.json`,
`.env`, database/migration files, retrieval/reranker files, frontend/public/deploy files,
the controlled LOA runtime scaffold where prohibited, and any planted forbidden runtime
marker.

It may ignore only a **closed, explicitly enumerated** set of evidence/report artifacts that
cannot affect runtime. Forbidden remedies: disabling the guard; excluding arbitrary runtime
files; ignoring whole directories by wildcard where runtime files could later appear;
treating every evidence path as automatically trustworthy.

Every ignored class requires an explicit negative control proving a real violation in or near
that class is still caught.

## 6. Lane C remedy — smallest authorized runtime fix

Only if safe LOA queries fail on a truly clean tree. Inspect `evaluateControlledLoaAskGate`,
the boundary decision, Step 12.65 placement and Step 12.6 clarification ordering. Preserve
excluded unsafe queries, unrelated tax-query routing, and the no-citation/no-final-conclusion
restrictions.

## 7. Required LOA regressions (all lanes)

Safe → `controlled_loa_answer`: received LOA; received eLA; replacement eLA; consolidated
eLA; document checklist; additional document request; reminder before subpoena.

Unsafe/final-conclusion → must **not** enter the controlled safe answer: LOA invalid; eLA
void; ignore LOA; FAN void; FDDA appealable; will I win; draft protest now; submit to BIR;
final legal opinion.

Unrelated tax queries must not enter the LOA branch.

## 8. Explicit scope limitation

The separate follow-up-memory issue shown by vague questions such as `Can you help me?`
belongs to Phase 10G-C / Phase 13C and is **out of R18 scope**. R18 does not expand into it.
