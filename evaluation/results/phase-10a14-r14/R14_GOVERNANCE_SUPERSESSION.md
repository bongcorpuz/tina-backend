# R14 — GOVERNANCE SUPERSESSION ANALYSIS (P1-R13-IR-002)

## Preserved historical conclusion

> **R13 COMMIT 3b FAILED ATTEMPT REMAINS UNAVAILABLE.**

R14 did not recover, reconstruct, estimate, backdate or simulate the missing R13 attempt.
The R13 independent-review finding remains historically correct and is not closed on
historical grounds. See `R14_R13_COMMIT3B_EVIDENCE_GAP.md`.

## Prospective test

WS16 asks whether R14 itself provides a complete attempt chain capable of superseding the
incomplete R13 record for release-gate purposes.

| Requirement | Evidence | Met |
|---|---|---|
| Immutable pre-fix evidence | `R14-PREFIX-a311e97f91d6`, 488 attempts, committed and pushed as COMMIT 2 **before** any runtime modification | yes |
| Immutable post-fix failures, if any | `R14-POSTFIX1-WORKING-TREE` (42 misses) and `R14-POSTFIX2-WORKING-TREE` (0) retained in full; neither deleted nor amended | yes |
| Append-only attempt journal | `journal.mjs`; O_APPEND JSONL, pre-allocated IDs, duplicate allocation is a hard error, technical vs legal failure never conflated | yes |
| Full rerun after each runtime correction | the complete 488-case frozen campaign was re-executed after every runtime change, never a subset | yes |
| Final single-runtime evidence | `R14-FINAL-31f2326c1ebf` (488/488) and `R14-LIVE2-31f2326c1ebf` (34 probes) both against `31f2326c` | yes |
| Complete persistence-status evidence | 0 null public `persistenceStatus` across 34 live probes; 10/10 receipt simulations; all 11 response categories covered | yes |

Total: **2020 attempts across six generations, 0 technical failures, 0 best-answer
retries, 0 deletions.**

## Honest qualifications

Two facts a reviewer should weigh rather than have buried:

1. **The intermediate failures were found before COMMIT 3, not after it.** R14's
   post-fix defects (42 residual misses) surfaced during pre-commit iteration, so they
   were preserved as journal generations labelled `WORKING-TREE` rather than through the
   commit-evidence-then-correct cycle the contract specifies for post-commit defects.
   The preservation-before-correction rule was therefore **never actually exercised under
   its triggering condition** during R14, because that condition did not arise. The rule
   is implemented and contractually binding; it is not battle-tested by this run.

2. **Two live generations exist.** `R14-LIVE` recorded `trustState` as null due to a
   harness field-path error. It was preserved rather than overwritten, and `R14-LIVE2`
   re-ran the identical probe set with complete capture. This is the append-only rule
   working as intended, but it means the controlling live evidence is the second
   generation, not the first.

Neither qualification involves a fabricated, deleted, backdated or amended attempt.

## Classification

Per WS16 the permitted values are `SUPERSEDED BY COMPLETE R14 PROSPECTIVE ATTEMPT
EVIDENCE`, `NOT SUPERSEDED`, or `NOT ADJUDICABLE`. R14 may self-assess `SUPERSEDED` only
where every required attempt is preserved and reconciled.

Every required attempt is preserved, pushed, and reconciles in
`R14_ATTEMPT_RECONCILIATION.json`. R14 self-assesses:

> **SUPERSEDED BY COMPLETE R14 PROSPECTIVE ATTEMPT EVIDENCE**

This is a self-assessment only. The classification is **decided by the mandatory
independent R14 reviewer**, who should weigh qualification (1) in particular: a reviewer
may reasonably hold that an untriggered preservation rule is insufficiently demonstrated
and return `NOT SUPERSEDED` or `NOT ADJUDICABLE`. R14 does not treat its own assessment
as controlling.
