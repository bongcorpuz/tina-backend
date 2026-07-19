# Findings And Security

## Findings Register

Decision: PASS.

| ID | Severity | Status | Finding |
| --- | --- | --- | --- |
| P1-R7-IR-001 | P1 | CLOSED | Qualifying publication is established and effectivity is 2025-06-19. |
| P1-R7-IR-002 | P1 | CLOSED | Malformed dates fail closed and cannot reach POST_EFFECTIVITY. |
| P1-R7-IR-003 | P1 | CLOSED | taxableYear/legalAsOfDate/filingEventDate cannot replace transactionDate/dispositionDate. |
| P1-R7-IR-004 | P1 | CLOSED | Failed temporal adjudications do not expose RA 12214 as applicable/current. |
| ENV-STAGING-RESTRICTED | P3 | CLOSED | Restricted-sandbox staging reachability failed once; two network-enabled cycles passed. |

P0 = 0. P1 = 0. P2 = 0. P3 = 1 closed environmental note.

## Security And Scope Review

No unauthorized remediation was performed by this independent review.

No runtime, test, fixture, prompt, model, retrieval, reranker, validator, database, vector metadata, reindexing, re-embedding, source-bank, corpus, frontend, Dev Factory, or production deployment change was made.

Protected paths were preserved:
- .claude/
- .vscode/
- evaluation/factcheck/

No localhost 5173 process was terminated.

No backend listener was intentionally left running by this review.

