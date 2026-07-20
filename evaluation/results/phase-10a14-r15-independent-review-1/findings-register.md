# Findings Register

| ID | Severity | Status | Finding |
| --- | --- | --- | --- |
| P1-R15-IR-001 | P1 | Open | Mandatory deterministic gate did not pass twice. The R15 crash-visible journal suite fails standalone and inside `run-regressions` with an unsettled top-level await at line 85. |
| P1-R15-IR-002 | P1 | Open | Crash visibility during the governed action is not proven. The independent kill harness shows `during-call` exits `code: 0`, `signal: null`, and `killReturned: false`; only after-allocation and after-started are real SIGKILL cases. |
| P1-R15-IR-003 | P1 | Open | Independent semantic non-tax controls found 2/10 false allows: private lease payment and court filing deadline prompts were allowed as tax-related via `tax_keyword_match`. |
| P1-R15-IR-004 | P1 | Open | Governance supersession is blocked by the mid-execution journal contract amendment and removal of completed per-attempt directories, even though archive event hashes validate. |
| P1-R15-IR-005 | P1 | Open | Formal R15 gate and attempt counts are materially inconsistent: result JSON reports 4 runner invocations while executor narrative and gate directories show 5, and reconciliation counts exclude gate failures without clear scoping. |
| P2-R15-IR-006 | P2 | Open | A protected `evaluation/factcheck` path was committed in `7aba6039` and corrected in `721d8546`; final state is restored but the historical scope violation remains. |
| P2-R15-IR-007 | P2 | Open | `PRE_FIX_EVIDENCE_MANIFEST.sha256` is stale/invalid in the final tree after archive migration, despite final manifest and archive integrity checks passing. |
| P2-R15-IR-008 | P2 | Open | This review's deterministic raw-log placement inside the repo triggered an additional dirty-tree guard failure. It is preserved as a review limitation and is not attributed to R15 runtime behavior. |

Decision: REVISIONS REQUIRED.

Governance supersession: NOT SUPERSEDED.
