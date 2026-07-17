# Findings Table

| severity | id | finding | disposition |
|---|---|---|---|
| P0 | none | No P0 security, production, data, or unauthorized-scope issue found. | Clean. |
| P1 | none | No material blocker found. Q38/Q46 deterministic source-sufficiency classes are closed without hardcoded runtime branches; prior safeguards and valid reachability are preserved. | PASS. |
| P2 | R1-IR-P2-001 | Passage-level proposition support is still not implemented. The gate remains source-card-label/provision-class based. | Carry forward to Phase 10C / future grounding work. |
| P2 | R1-IR-P2-002 | The gate is class-enumerated and not exhaustive across all possible legal proposition classes. | Acceptable for this remediation; monitor future classes. |
| P2 | R1-IR-P2-003 | A wrong proposition paired with a superficially matching authority label may still depend on the LLM validator until passage-level grounding exists. | Carry forward; not a Q38/Q46 blocker here. |
| P2 | R1-IR-P2-004 | Runtime diagnostics returned in `gates` still expose only penalty/EWT booleans, with new class diagnostics nested under `propositionSufficiency`. | Non-blocking observability limitation. |
| P2 | R1-IR-P2-005 | The committed 23 live payloads did not include a full live VERIFIED registration-positive control; focused tests and mocked validator probe demonstrate deterministic reachability. | Evidence limitation, not overfire. |
| P2 | R1-IR-P2-006 | Prior A13 citation-precision carryovers remain outside this remediation. | Unchanged. |
| P2 | R1-IR-P2-007 | `gold` appears in the executable VAT-context regex as broad transaction context. It does not pass/fail sufficiency and is not Q46 hardcoding, but should be watched if the class expands. | Non-blocking code-review note. |
| P3 | R1-IR-P3-001 | Sandboxed staging run can falsely fail on network reachability; network-enabled staging passed. | Environment caveat. |

Severity totals: P0=0, P1=0, P2=7, P3=1.
