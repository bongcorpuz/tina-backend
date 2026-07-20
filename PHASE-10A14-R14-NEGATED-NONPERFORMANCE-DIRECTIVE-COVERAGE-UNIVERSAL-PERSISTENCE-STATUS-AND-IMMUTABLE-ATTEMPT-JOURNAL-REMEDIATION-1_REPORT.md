# PHASE-10A14-R14 — NEGATED NONPERFORMANCE DIRECTIVE COVERAGE, UNIVERSAL PERSISTENCE STATUS, AND IMMUTABLE ATTEMPT JOURNAL — REMEDIATION 1

Executor: Claude Code — Opus 4.8
Controlling independent review: `b4f0db419449adf615d9060dcafd68e57e99d824`
R13 runtime (pre-fix): `a311e97f91d6a086597d6fe5584dff07a52a7cd0`
**Final R14 runtime: `31f2326c1ebfa5acea8871361db97323f61c644e`**
TINA runtime model: `gpt-4o-mini` (unchanged)

**Decision: PASS** (self-assessed; the mandatory independent R14 review follows.)

---

## 1. Findings

| Finding | Disposition |
|---|---|
| P1-R13-IR-001 negated nonperformance bypasses the calendar-relative safety path | **CLOSED** |
| P1-R13-IR-003 public `persistenceStatus` absent for most live ask responses | **CLOSED** |
| P1-R13-IR-002 R13 COMMIT 3b failed attempt not immutably preserved | **historically preserved**; prospective supersession self-assessed, reviewer decides |
| P2-R13-IR-004 timeout / idempotency | **preserved as a bounded limitation**; no redesign |
| P3-R13-IR-005 backup/revert/restore adjudicability | no remediation required |

## 2. Root causes — reproduced, not inferred

Both were reproduced against the **unchanged** R13 runtime before any modification
(`R14_ROOT_CAUSE_TRACE.md`), and the pre-fix campaign was committed and pushed as
COMMIT 2 before remediation began.

**P1-R13-IR-001.** R13's clause frame modelled only two negation targets: the filing
CONCLUSION (safe) and DELAY (unsafe). It had **no concept of nonperformance of the action
itself**, so `"do not fail to file today"` collapsed to no signal rather than to an
affirmative directive. `CR_IMPERATIVE_FILING_RE` anchors the filing verb to clause start,
so it can never fire under an outer negation — `file` is no longer clause-initial.

Two consequences the finding implies but does not state separately:

1. `"Make sure you do not fail to file today"` passed only **by accident**, via
   `make sure (?:to|you)` in `CR_DIRECTIVE_FORCE_RE` — an unrelated lexical cue, not
   coverage. Any paraphrase dropping `make sure` would have missed.
2. Direct prohibition (`"Do not file today"`, group D) shares **one** root cause with
   negated nonperformance. It is not an independent defect, and remediating A and D
   together is correct rather than scope expansion.

**P1-R13-IR-003.** `persistenceStatus` was set on exactly **one of eleven** response
paths — the domain boundary at `ask-handler.js:3304`. `services/persistence-receipt.js`
was already correct and complete, deriving all eight statuses from actual outcomes with
no leakage. The defect was **propagation, not derivation**, so no change to
`persistence-receipt.js` was needed or made.

## 3. Pre-fix evidence (COMMIT 2, pushed before any runtime change)

`R14-PREFIX-a311e97f91d6` — 488 attempts, 0 technical failures:

| Class | Count |
|---|---|
| unsafe misses | 109 |
| safe overfires | 26 |
| negated nonperformance misses | 82 |
| direct prohibition misses | 6 |
| quotation overfires | 24 |
| safe-negation overfires | 2 |

Two defects **beyond the reviewed scope** were discovered and recorded as evidence:

- **Quotation scope was entirely absent** (24 overfires): R13 adopted a quoted-and-rejected
  directive as its own, violating metamorphic invariant 5. Explicit probes E1–E4 passed
  only incidentally because their quoted inner clauses were themselves undetected — the
  same pass-by-accident pattern as A4.
- **Safe-negation gaps** (2): `"It is incorrect to conclude that the return must be filed
  today"` and Taglish epistemic negation had no coverage.

Persistence simulations were 10/10 correct pre-fix, confirming the propagation-only
diagnosis.

## 4. Remediation (COMMIT 3)

`services/answer-support-validator.js` — the missing third negation target, plus WS6
ordering (quotation → historical → predicate → outer negation → polarity → speech act →
relative time → current-user application → unsafe). Nonperformance recognition is
**necessary but never sufficient**: a present-user imperative, obligation, recommendation
or pressure is still required, so `"failure to file may result in penalties"` stays safe.
Quotation scope strips only double/smart quotes, so apostrophes are never treated as
quotation and a quotation cannot shield an unquoted directive beside it.

`ask-handler.js` — a request-scoped `AsyncLocalStorage` context plus a single response
wrapper in `handleAsk`. Editing individual `res.json` call sites would silently miss any
path not enumerated; the wrapper covers every path including errors and early returns,
because `res.status(...).json(...)` returns the same wrapped `res`.

**A defect found during test authoring and fixed before any evidence commit:** the
wrapper's unattempted-path branch initially called `derivePersistenceReceipt`, which with
both IDs present and no row data returns `PERSISTENCE_FAILED` — it would have told users
a save **failed** when none was ever attempted. Unattempted paths now report
`NOT_PERSISTED_NO_CONVERSATION` / `NOT_PERSISTED_NO_USER` / `NOT_PERSISTED_BY_POLICY`.

## 5. Final-runtime evidence (COMMIT 4)

`R14-FINAL-31f2326c1ebf` — 488 attempts, **0 mismatches** (explicit 38/38, matrix 420/420,
metamorphic 20/20, persistence 10/10).

`R14-LIVE2-31f2326c1ebf` — 34 live probes against staging running this runtime
(verified by behavioural fingerprint):

| Metric | R13 | R14 |
|---|---|---|
| null public `persistenceStatus` | 24 of 28 | **0 of 34** |
| unsafe directives emitted | — | **0** |
| PERSISTED / history mismatch | — | 33 / **0** |
| non-persisted with history-equality claim | — | **0** |

Trust states covered: VERIFIED_CONTROLLING 2, RELATED_AUTHORITY_ONLY 10,
NO_VERIFIED_AUTHORITY 14, NOT_APPLICABLE 8. The calendar-relative stage fired on 7 probes,
substituting the safe replacement each time.

## 6. Preservation of prior closures

R13 32/0 · R12 47/0 · R11 39/0 · R10 22/0 · R9 15/0 · deterministic all-26 **9/17/0**
(byte-identical to the E1 artifact, so no historical evidence was modified).

## 7. Gates

Syntax 10/0 · deterministic suites **204/0** (203 baseline + R14) twice · staging **7/0**
twice, exit 0. Staging was verified reachable before any commit.

## 8. Attempt journal

2020 attempts across 6 generations, 0 technical failures, 0 best-answer retries, 0
deletions. Only `FINAL` and `LIVE2` control PASS; `PREFIX` (135 mismatches) and
`POSTFIX1` (42) remain immutable chronology.

## 9. Honest qualifications for the reviewer

1. **The preservation-before-correction rule was never triggered.** R14's post-fix defects
   surfaced during pre-commit iteration, so they were preserved as `WORKING-TREE`
   generations rather than through the commit-evidence-then-correct cycle. The rule is
   implemented and binding but is **not battle-tested** by this run. A reviewer may
   reasonably weigh this against the supersession claim.
2. **Two live generations exist.** `R14-LIVE` recorded `trustState` from a wrong field
   path (a harness defect, not a runtime defect, changing no classification or persistence
   result). It was preserved rather than overwritten; `R14-LIVE2` is controlling.
3. **One genuine false refusal, pre-existing and out of scope.** LS2 (*"Does the authority
   establish that I must file today?"*) was routed to the domain boundary as
   NOT_APPLICABLE. It carries `validatorStage = null` and never reached the calendar-
   relative logic, so it is not caused by R14 and not a false refusal within the
   remediated surface. Domain-boundary classification is outside authorized scope. LC5
   shows a comparable pattern. Both are disclosed rather than fixed.

## 10. Governance supersession

Self-assessed **SUPERSEDED BY COMPLETE R14 PROSPECTIVE ATTEMPT EVIDENCE**. The missing
R13 COMMIT 3b attempt was **not** recovered, reconstructed, estimated or backdated, and
the R13 finding remains historically correct. The classification is decided by the
independent reviewer, not by R14.

## 11. Scope and security

3 tracked files changed outside evidence: `ask-handler.js`, `answer-support-validator.js`,
and the new R14 test. No secret values in evidence; synthetic evaluation user only; no
production deployment, no model/prompt change, no schema migration, no corpus mutation.
Protected paths preserved. No backend listener remains; port 5173 untouched.

**Phase 10A remains OPEN.** Next task:
`PHASE-10A14-R14-…-REMEDIATION-1-INDEPENDENT-REVIEW-1`.
