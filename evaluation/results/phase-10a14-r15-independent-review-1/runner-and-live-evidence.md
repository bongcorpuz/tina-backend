# Runner And Live Evidence

## Deterministic Gate

`node scripts/run-regressions.mjs` was run twice by this review. Both cycles exited non-zero.

Cycle 1 raw log: `evaluation/results/phase-10a14-r15-independent-review-1/deterministic-cycle1.raw.txt`.

Cycle 2 raw log: `evaluation/results/phase-10a14-r15-independent-review-1/deterministic-cycle2.raw.txt`.

Both preserved logs show:

- Syntax checks: 10 run, 0 failed.
- Test suites: 206 run, 2 failed.
- `tests\phase-10a14-r15-crash-visible-attempt-journal.test.mjs` fails after the first three passes with Node's unsettled top-level await warning at line 85.
- The phase-09ZF dirty-tree guard also fails because the review raw log target was inside the repository. This is a review-harness limitation, not an R15 runtime defect, but it means neither deterministic cycle is a clean PASS.

The R15 journal suite also failed standalone:

- `node tests/phase-10a14-r15-crash-visible-attempt-journal.test.mjs` exited 1.
- Output stopped after 3 passes with the same unsettled top-level await warning.

Focused prior-closure suites:

- R15 semantic/persistence focused suite: 29 passed, 0 failed.
- R14 focused suite: 21 passed, 0 failed.
- R13 focused suite: 32 passed, 0 failed.
- R12 focused suite: 47 passed, 0 failed.
- R11 focused suite: 39 passed, 0 failed.
- R10 focused suite: 22 passed, 0 failed.
- R9 focused suite: 15 passed, 0 failed.

## Staging Gate

`node scripts/run-staging-smokes.mjs` was run twice with network approval. Both direct runs exited 0:

- Cycle 1: 7 run, 0 failed, staging gate passed.
- Cycle 2: 7 run, 0 failed, staging gate passed.

The first attempted file-capture wrapper failed before the staging runner emitted a log. The two direct staging runs are the controlling independent staging observations.

## Live Evidence Review

The executor's R15 live evidence was audited rather than rerun into the original R15 evidence tree. `LIVE_SUMMARY.json` records 40 live probes, identity before and after exactly `c38a073b814559d9e02139fcb7c61e310e46bc21`, 0 null persistence statuses, 0 persisted-without-receipt records, 0 history mismatches, 0 unsafe emissions, 0 false refusals, and 0 non-tax leaks.

I did not run the official R15 live harness as a new independent campaign because it writes into `evaluation/results/phase-10a14-r15/`, the executor evidence area. This limitation does not affect the decision because local deterministic, journal, semantic, and governance blockers independently force REVISIONS REQUIRED.
