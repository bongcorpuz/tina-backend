# Findings and Severity

| ID | Severity | Finding | Evidence | Decision impact |
|---|---:|---|---|---|
| IR1-P1-001 | P1 | Filing-obligation detector materially under-detects ordinary Q12-class formulations. | Probes such as 'I earn PHP 250,000; tell me whether I still need an ITR', 'do I submit anything?', 'How about filing?', and answer-introduced no-filing conclusions returned applicable=false. | Blocks PASS |
| IR1-P1-002 | P1 | Filing-deadline detector materially under-detects ordinary Q34-class formulations. | Probes such as 'last day to submit', 'must be filed by what date', 'filing closes', 'what date applies', 'is May 15 late', and 'confirm the filing date' returned applicable=false. | Blocks PASS |
| IR1-P1-003 | P1 | Estate-tax computation-basis detector is materially phrase-dependent. | Probes '6% of the excess over PHP 5M', 'first PHP 5M tax-free', 'estate threshold is PHP 5M', and '6% of gross estate less PHP 5M' remained sufficient. | Blocks PASS |
| IR1-P2-001 | P2 | No direct live filing-obligation positive payload; deterministic reachability is shown. | Focused tests and independent Sec. 51 probe pass, but live retrieval proof is partial. | Non-blocking under REVISIONS REQUIRED |
| IR1-P2-002 | P2 | No direct live correct estate-computation positive payload; deterministic reachability is shown. | Focused net-estate probe passes, but live retrieval proof is partial. | Non-blocking under REVISIONS REQUIRED |

Severity counts: P0=0, P1=3, P2=2, P3=0.
Final decision: REVISIONS REQUIRED.