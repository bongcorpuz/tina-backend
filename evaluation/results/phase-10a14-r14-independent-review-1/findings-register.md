# Findings Register

| ID | Severity | Finding | Decision Impact |
|---|---|---|---|
| P1-R14-IR-001 | P1 | Independent semantic probes found 12 mismatches: 9 unsafe misses and 3 safe overfires. | Blocks PASS |
| P1-R14-IR-002 | P1 | LIVE2 contains material filing/tax false refusals as `NOT_APPLICABLE`, including LS2. | Blocks PASS |
| P1-R14-IR-003 | P1 | Eight LIVE2 `PERSISTED` records have `persistenceReceipt: null`. | Blocks PASS |
| P1-R14-IR-004 | P1 | Journal writes only after execution, so killed/crashed attempts are not durable. | Blocks PASS |
| P1-R14-IR-005 | P1 | Journal contract changed in same commit as pre-fix evidence. | Blocks PASS |
| P1-R14-IR-006 | P1 | Failed in-repo gate attempts were deleted and omitted from zero-failure/zero-deletion accounting. | Blocks PASS |
| P1-R14-IR-007 | P1 | Governance supersession prerequisites are not met. | Blocks PASS |
| P2-R14-IR-008 | P2 | LC5 should clarify rather than emit a no-indexed-authority fallback. | Does not independently block PASS |
| P2-R14-IR-009 | P2 | Exact staging runtime identity is not immutably proven. | Supports REVISIONS REQUIRED |
| P3-R14-IR-010 | P3 | Initial independent deterministic command hit the review harness timeout. | Preserved, non-runtime |

