# PHASE-10A14-R15 Independent Review 1 Report

Decision: REVISIONS REQUIRED.

Governance supersession: NOT SUPERSEDED.

Reviewed repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`, HEAD `721d8546b3b819e45dbc6baa4d4a87e878193026`. Expected final runtime commit `c38a073b814559d9e02139fcb7c61e310e46bc21` and predecessor review commit `768059ccd5248f83fd29ce85be06c7d6f4921a43` are both ancestors. Pre-review sync was `0 0`. No backend listener was found. Protected untracked `.claude/`, `.vscode/`, and `evaluation/factcheck/` were preserved.

## Findings

P1-R15-IR-001: The mandatory deterministic gate did not pass. Two independent `node scripts/run-regressions.mjs` cycles exited non-zero. The R15 crash-visible journal suite fails inside the runner and standalone with Node's unsettled top-level await warning at `tests/phase-10a14-r15-crash-visible-attempt-journal.test.mjs:85`. The full-run logs also include a review-induced dirty-tree guard failure because my raw log target was inside the repo, but the standalone R15 journal failure is independent of that limitation.

P1-R15-IR-002: Crash visibility during the governed action is not proven. The independent kill harness reproduced real `SIGKILL` visibility after allocation and after start, but the `during-call` case returned `code: 0`, `signal: null`, and `killReturned: false`. This contradicts the formal claim that three real SIGKILL cases prove crash visibility.

P1-R15-IR-003: Independent semantic/non-tax controls found 2 false allows out of 10 unseen probes. "For a private lease payment, does the weekend rule automatically extend my deadline?" and "Can a court filing deadline that falls on a holiday be moved to the next business day?" were allowed as tax-related via `tax_keyword_match`.

P1-R15-IR-004: Governance supersession is blocked by the mid-execution journal contract amendment and removal of completed per-attempt directories. Archive event hashes validate, but the final evidence no longer preserves the originally frozen per-attempt directory form for several completed generations.

P1-R15-IR-005: Formal gate/attempt accounting is materially inconsistent. The result JSON reports four runner invocations and four preserved logs, while the executor narrative and evidence directories describe five deterministic gate attempts. Attempt reconciliation also excludes gate attempts/failures without clear formal scoping.

P2-R15-IR-006: A protected `evaluation/factcheck` path was briefly committed in `7aba6039` and then untracked in `721d8546`. Final state is restored, but the historical protected-path scope violation remains.

P2-R15-IR-007: `PRE_FIX_EVIDENCE_MANIFEST.sha256` is stale/invalid in the final tree after archive migration. Final manifest and archive integrity checks pass, so this is evidence hygiene debt, not proof of content tampering.

P2-R15-IR-008: This review's deterministic raw logs were written inside the repo, which triggered an additional dirty-tree guard failure in the full runner. The limitation is disclosed and preserved; it is not attributed to R15 runtime behavior.

## Positive Adjudication

R15 did materially improve several R14 findings. The submitted R15 focused semantic/persistence suite passed 29/0. Prior focused suites passed: R14 21/0, R13 32/0, R12 47/0, R11 39/0, R10 22/0, R9 15/0. The executor's final live summary records 40 probes against exact runtime `c38a073b814559d9e02139fcb7c61e310e46bc21` before and after, with 0 null persistence statuses, 0 persisted-without-receipt records, 0 unsafe emissions, 0 history mismatches, 0 false refusals, and 0 non-tax leaks. Two independent staging smoke cycles passed 7/0.

The R15 final evidence manifest validates with 4876 entries, 0 missing files, and 0 hash mismatches. Archive integrity files for the converted generations validate: archive hashes match and event hash mismatches are 0.

## Closure Adjudication

- P1-R14-IR-001 remains not fully closed because independent semantic controls found non-tax over-allowance.
- P1-R14-IR-002 is accepted as closed for the submitted seven false-refusal probes and audited live summary.
- P1-R14-IR-003 is accepted as closed for the submitted live and focused receipt evidence.
- P1-R14-IR-004 remains open because real `during-call` crash visibility is not proven.
- P1-R14-IR-005 remains open for governance because the frozen journal evidence contract was amended mid-execution.
- P1-R14-IR-006 remains open because gate/attempt preservation accounting is materially inconsistent.
- P1-R14-IR-007 is NOT SUPERSEDED.
- P2-R14-IR-008 is accepted as closed for LC5 clarification behavior.
- P2-R14-IR-009 is accepted for final live runtime identity and byte-equivalence evidence.

## Next Remediation

Smallest viable remediation: fix the R15 crash-visible journal harness/victim so the `during-call` case is a real awaited governed action and the R15 journal suite completes; reconcile formal gate counts and attempt accounting; adjudicate or repair the archive/no-delete governance contract; tighten non-tax semantic controls; then rerun clean deterministic gates twice and staging gates twice without placing logs inside the dirty-tree guard scope.
