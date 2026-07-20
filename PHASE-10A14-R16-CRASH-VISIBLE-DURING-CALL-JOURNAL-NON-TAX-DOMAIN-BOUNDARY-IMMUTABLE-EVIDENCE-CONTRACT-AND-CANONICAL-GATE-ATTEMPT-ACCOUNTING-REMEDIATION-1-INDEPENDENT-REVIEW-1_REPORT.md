# PHASE-10A14-R16 Independent Review 1 Report

Decision: REVISIONS REQUIRED.

R15 historical governance: NOT SUPERSEDED.

R16 prospective governance: NOT SATISFIED.

Reviewed repo: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`, HEAD `31a0630abef4ab864b1082ce55ed0a0f9dc95ba2`. Sync before review was `0 0`; final runtime `0323bb91ac8383e1cbb6800637e4b9b896cdaff1` and predecessor review `aa0550753d1a0a988503123b6bca853a2c193bac` are ancestors. Tracked tree was clean except protected untracked `.claude/`, `.vscode/`, `evaluation/factcheck/`. No Node listener was found.

## Findings

P1-R16-IR-001: independent deterministic gates failed twice. Both runs had syntax 10/0 and suites 208 run / 2 failed. The failed suites were `patch-07b-clarification-final-gate-1-track-closure` and `phase-10a8-trust-calibration-and-answer-correctness-remediation-1`. The six executor-claimed OpenAI/network suites passed in this review.

P1-R16-IR-002: independent staging gates failed twice. Both runs were 7 suites / 1 failed, with `phase-09r-tax-memo-runtime-staging-smoke-1` reporting staging temporarily unreachable and inconsistent fixture decision/reachability.

P1-R16-IR-003: domain boundary remains incomplete. Exact prior private-lease and court-filing false allows are closed, explicit non-tax controls are closed, and substring traps are closed. But customs-duties questions return CLARIFY rather than ALLOW, and standalone `phase-10a8` reports a valid capital-gain tax question no longer ALLOWs.

P1-R16-IR-004: canonical registry counts `R16-FOCUSED-r15-journal-crash-A3` as `COMPLETED_PASS` and `controlling:true`, while its recovery adjudication says `INVALID_PARTIAL_IMPORT_NON_CONTROLLING`; its `tree-before.txt` is 186 NUL bytes.

P1-R16-IR-005: retry ceiling is not validly supported. Registry `retries=0`; all deterministic gate attempts have `retryOf:null`, despite the report saying one attempt plus two retries reached a ceiling.

P1-R16-IR-006: fabricated SHA provenance remains outside registry integrity. Git rejects `a802064a1b32e8a68a0b8c4dd1f8a1b0c9a5e2f7`; it appears in 11 non-controlling attempts, yet registry integrity is `clean:true`.

## Accepted Closures

The corrected journal/SIGKILL work is accepted. Five standalone journal cycles and three concurrent cycles exited 0. Independent SIGKILL harness proved the during-call case is one awaited governed attempt with marker from inside the callback, child alive before kill, `killReturned=true`, exit `code:null`, `signal:SIGKILL`, allocated and started events preserved, no terminal event, and exactly one incomplete attempt.

R16 did not touch `evaluation/factcheck/`, and runtime files are byte-identical from final runtime to current HEAD and to the two executor staging SHAs.

## Next Remediation

Smallest next task: repair the R16 domain false refusals and canonical evidence registry/accounting defects, especially retry links and recovery-adjudication disposition handling; then rerun clean deterministic and staging gates until the frozen criteria are actually satisfied.
