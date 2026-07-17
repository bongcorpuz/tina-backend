# Count And Hash Reconciliation

| Artifact / logical set | Count / hash | Independent result |
| --- | --- | --- |
| Source-bank rows | 50 | Reused unchanged R5 governed snapshot. |
| Source-bank SHA-256 | `526106e594667705df227930dff3d9a4717ec99b171626bf708db43f4eac4bed` | Matched. |
| Canonical IDs | 30 | Matched frozen manifest. |
| Canonical-set SHA-256 | `8e019480b2e710f9575e5f47d72716d9e94680b8bb3caa904cfe27f05c0f6ea1` | Matched. |
| Mini payloads | 30 | Missing 0, extra 0, duplicate 0. |
| Mini payload runtime | `09751a6e038bde9324af9a05213d9c92295e3eb9` | All matched. |
| Mini payload persistence | 30/30 count=2 | Matched. |
| Mini verified | 4 | M-Q6, M-Q12, M-Q15, M-Q30. |
| Mini related | 16 | Includes M-Q25/M-Q36. |
| Mini no-verified | 10 | Matched. |
| WS8 payloads | 8 | All ok. |
| R6 focused suite | 16 tests / 30 assertions | Passed. |
| Deterministic runner | 189 suites x2 | Passed. |
| Staging runner | 7 suites x2 | Passed with network access. |
| R6 evidence manifest | 53 rows | 0 hash mismatches. |