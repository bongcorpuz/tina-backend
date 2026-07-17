# Findings Table

| ID | Severity | Status | Finding | Evidence | Disposition |
| --- | --- | --- | --- | --- | --- |
| P1-A | P1 | Closed | M-Q36 invalid VERIFIED_CONTROLLING. | M-Q36 is RELATED_AUTHORITY_ONLY, stage `proposition-source-sufficiency`, reason `penalty_proposition_without_penalty_authority`. | Closed. |
| P1-B | P1 | Closed | M-Q25 invalid/questionable VERIFIED_CONTROLLING. | M-Q25 is RELATED_AUTHORITY_ONLY, stage `proposition-source-sufficiency`, reason `ewt_proposition_without_withholding_authority`. | Closed. |
| P1-C | P1 | Closed | Deterministic runner failure. | Two independent `node scripts/run-regressions.mjs` runs passed: 189 suites, 0 failed, exit 0. | Closed. |
| P1-D | P1 | Closed | Staging runner failure. | Two network-enabled `node scripts/run-staging-smokes.mjs` runs passed: 7 suites, 0 failed, exit 0. | Closed. |
| P2-A | P2 | Open | Payloads still expose labels, not full retrieved source passages. | Payloads contain source labels only. | Carry forward. |
| P2-B | P2 | Open | Proposition-source gate is not exhaustive. | Covers penalty/EWT; other classes remain future extensions. | Carry forward. |
| P2-C | P2 | Open | Authority matching is label/section regex, not passage-level support validation. | `evaluatePropositionSourceSufficiency` reads source-card labels. | Carry forward. |
| P2-D | P2 | Open | Positive penalty/EWT controls prove gate sufficiency, not full live LLM verified outcome. | Focused tests A4/A5/B3 exercise gate reachability. | Carry forward. |
| P2-E | P2 | Open | M-Q30 precision debt remains. | Verified answer states 6% but frames the 5M deduction as a threshold/base. | Carry forward. |
| P2-F | P2 | Open | 09ZF simulation transcript missing. | Failability is inspectable, but no standalone simulation log found. | Carry forward. |
| P3-A | P3 | Open | Sandbox network can create false staging failures. | Sandboxed staging run failed; network-enabled runs passed twice. | Monitor. |