# Mini-30 Payload Reconciliation

## Result

The committed R5 payload mechanics reconcile cleanly, but the legal quality of verified answers does not.

| Check | Result |
| --- | --- |
| Payload files | 30 |
| Missing IDs | 0 |
| Extra IDs | 0 |
| Duplicate IDs | 0 |
| Unique payload hashes | 30 |
| Prompt mismatches against canonical manifest | 0 |
| Runtime mismatches | 0 |
| Runtime commit recorded by payloads | `cd046304111d26a439c4c37321881524acd41eb6` |
| Persistence count | 2 for all committed final payloads |
| Evidence manifest hashes | 43/43 matched |

## Counts

| Status | Count |
| --- | ---: |
| VERIFIED_CONTROLLING | 6 |
| RELATED_AUTHORITY_ONLY | 14 |
| NO_VERIFIED_AUTHORITY | 10 |
| Total | 30 |

Verified IDs: M-Q1, M-Q3, M-Q12, M-Q15, M-Q25, M-Q36.

Invalid verified IDs: M-Q36 and M-Q25.

## Retry Trail

`set-r5mini30-runlog.json` contains 32 entries: 29 ok and 3 failed M-Q10 attempts with transient header-only generations. `set-r5-q10-runlog.json` then contains 2 entries, with the final successful M-Q10 payload matching the committed payload. The retry trail is acceptable as long as it remains disclosed.