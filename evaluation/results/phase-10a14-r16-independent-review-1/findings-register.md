# Findings Register

| ID | Severity | Status | Finding |
| --- | --- | --- | --- |
| P1-R16-IR-001 | P1 | Open | Independent deterministic gates failed twice; observed failures were `patch-07b-clarification-final-gate-1` and `phase-10a8`, not the executor-claimed six network suites. |
| P1-R16-IR-002 | P1 | Open | Independent staging gates failed twice, 7 run / 1 failed, in `phase-09r-tax-memo-runtime-staging-smoke-1`. |
| P1-R16-IR-003 | P1 | Open | Domain boundary still has material false-refusal risk: customs-duties prompts CLARIFY, and `phase-10a8` reports a valid capital-gain question no longer ALLOWs. |
| P1-R16-IR-004 | P1 | Open | Canonical registry counts corrupted partial import `R16-FOCUSED-r15-journal-crash-A3` as `COMPLETED_PASS` and `controlling:true` despite non-controlling recovery adjudication. |
| P1-R16-IR-005 | P1 | Open | Retry ceiling/retry accounting is invalid: report says retries, registry says `retries=0`, and deterministic attempts have `retryOf:null`. |
| P1-R16-IR-006 | P1 | Open | Fabricated SHA provenance is not caught by registry integrity; one invalid Git object appears in 11 attempts. |
| P2-R16-IR-007 | P2 | Open | Staging identity wording is imprecise: server SHA changed between cycles, though runtime files are byte-equivalent and deployment ID is stable. |
| P2-R16-IR-008 | P2 | Open | Direct all-26 replay was not rerun because the script writes into historical E1 evidence; R16 preserved all-26 attempt was audited instead. |

Decision: REVISIONS REQUIRED.
