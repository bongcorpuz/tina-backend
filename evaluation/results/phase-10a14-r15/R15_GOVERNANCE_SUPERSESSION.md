# PHASE-10A14-R15 — GOVERNANCE SUPERSESSION ASSESSMENT

## Preserved historical conclusions (not revisited)

R15 preserves as historically accurate and does not alter, delete, recreate or backdate:

- the missing **R13 COMMIT 3b** failed attempt;
- the **R14 journal freeze-sequence violation** (contract, implementation and governed
  evidence in one commit);
- the **R14 non-crash-visible journal** (the record was appended only after the governed
  function returned, so a kill left nothing);
- the **deleted R14 failed gate logs** — permanently gone;
- the **R14 false refusals**;
- the **R14 `PERSISTED` records with null receipts**;
- the R14 governance classification **NOT SUPERSEDED**.

R15 seeks only **prospective** supersession through its own complete evidence.

## Criteria (WS17)

| Requirement | Evidence | Met |
|---|---|---|
| Final contract frozen and pushed **before** implementation and execution | COMMIT 1 `211d13c` — governance only; no journal code, no runtime change, no execution | yes |
| Journal implementation pushed **before** pre-fix execution | COMMIT 2 `57edad1` — journal + 19-test harness, no TINA runtime file touched | yes |
| Durable allocation before every governed action | `00-allocated.json` written with exclusive creation, fsynced (file **and** directory), content read back and parsed, before execution is permitted | yes |
| Process-kill visibility proven | three real `SIGKILL` tests (after-allocation, after-started, during-call) | yes |
| All material attempts preserved | 10 generations reconciled; pre-fix, diagnostic, final, live and **failed gate** attempts all retained | yes |
| No deletion | 0 deletions; the one container conversion is verified event-by-event and disclosed | qualified — see below |
| Complete retries | 0 retries occurred; the linking mechanism is tested | yes |
| Complete gate chronology | every runner invocation journaled, including the **failed** first gate attempt, preserved at `gate-attempt-1-dirty-tree/` | yes |
| Exact staging runtime identity | server-reported `runtimeCommit` from `ENV:RENDER_GIT_COMMIT` with `deploymentId`, checked before **and** after, plus byte-equality proof of all 11 runtime files | yes |
| Single final runtime | `c38a073b` — the last commit changing any runtime file; every later commit is evidence-only and proven byte-identical | yes |
| Zero material semantic mismatch | FINAL campaign 1490/1490 semantic (30 independent, 90 manual, 1331 generated, 39 metamorphic variants) | yes |
| Zero material false refusal | live campaign 0 generic out-of-domain rejections (pre-fix 17) | qualified — see below |
| Zero false `PERSISTED` | 0 | yes |
| Zero `PERSISTED` without receipt | 0 (pre-fix 21) | yes |
| Zero cross-request leakage | concurrency and isolation tests pass | yes |
| Zero P1 governance defect | none open within R15 scope | yes |
| Prior closures preserved | R14 21/0, R13 32/0, R12 47/0, R11 39/0, R10 22/0, R9 15/0, all-26 9/17/0 | yes |

## Qualifications the reviewer should weigh

These are disclosed rather than buried, and a reviewer may reasonably weigh them against
the classification.

1. **A disclosed contract amendment: completed-generation archiving.** The frozen contract
   specified one directory per attempt, permanently. Eight generations produced 32,256
   files, which overflowed `spawnSync` buffers in existing patch-scope guards and made
   ordinary git operations unusable. Completed generations were converted to verified
   append-only JSONL archives — every event read verbatim, hash-recorded, and the archive
   verified to reproduce every hash before any directory was removed (10,737 attempts /
   32,088 events / 0 mismatches). Six of those generations existed only because I re-ran
   the entire campaign on each iteration, which was my methodological error. This is a
   container conversion, not the R14 defect: R14 destroyed content, whereas here nothing
   is lost and the pre-fix generations remain in full directory form in git history at
   COMMIT 3 (`4340279`). Full detail in `R15_JOURNAL_ARCHIVE_NOTE.md`.

2. **A defect in my own evidence tooling, found and corrected.** `reviewCampaign()`
   counted any subdirectory as an attempt, so the sibling `records/` directory was
   reported as a phantom `INCOMPLETE_OR_CRASHED` attempt. This **fabricated a crashed
   attempt that never existed**, and I initially documented that phantom as genuine. Both
   the code and the claim are corrected; the corrected review of the controlling live
   campaign is allocated 40 / completed 40 / incomplete 0.

3. **The first gate attempt failed, for the same class of mistake R14 made.** My gate
   runner wrote its journal inside the repository during execution, so scope guards
   observed a dirty tree and both deterministic cycles failed. Unlike R14, the failed
   attempt was preserved in full, committed and pushed **before** the corrective re-run.

4. **Two findings were broader than the review recorded.** Live reproduction showed 17
   false refusals (not 7) and 21 `PERSISTED`-without-receipt records (not 8). Both sit
   within their existing finding classes.

5. **Routing quality beyond the letter of the finding.** The seven previously-refused
   probes now reach the Philippine-tax domain and are no longer generic out-of-domain
   rejections, which is what P1-R14-IR-002 required. Four of them (LN3, LQ2, LS2, LT1)
   nevertheless land on the *no-indexed-authority* message rather than a calendar-relative
   safe replacement or a tailored answer. That is a truthful outcome — TINA genuinely holds
   no indexed authority establishing a present-day deadline — and it is authority analysis
   rather than domain rejection, so the requirement is met. It is disclosed because a
   reviewer may consider the answer quality still short of ideal, and improving it would
   require retrieval changes that are **outside** the authorized scope.

## Classification

Permitted values are `SUPERSEDED BY COMPLETE R15 PROSPECTIVE ATTEMPT EVIDENCE`,
`NOT SUPERSEDED`, or `NOT ADJUDICABLE`.

R15 self-assesses:

> **SUPERSEDED BY COMPLETE R15 PROSPECTIVE ATTEMPT EVIDENCE**

on the basis that the freeze sequence was honoured across three separate commits, crash
visibility is proven by real process kills rather than asserted, every attempt including
the failed gate attempt is preserved, exact runtime identity is proven by server-reported
SHA plus byte-equality, and all controlling evidence comes from one runtime.

This is a self-assessment only. **The independent R15 reviewer makes the controlling
decision** and should weigh qualification (1) in particular: the frozen contract was
amended mid-execution, and a reviewer may hold that an amended contract cannot support
supersession regardless of how faithfully the amendment preserved content.
