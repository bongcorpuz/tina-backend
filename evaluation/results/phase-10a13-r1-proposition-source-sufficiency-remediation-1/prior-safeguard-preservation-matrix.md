# PHASE-10A13-R1 — Prior-Safeguard Preservation Matrix (WS8)

Runtime 508a64d. Live evidence from the targeted validation set + focused/regression suites.

| Safeguard | Result | Evidence |
|---|---|---|
| Q5 invalid verified = 0 | PASS (0/2 verified) | live Q5-a/b RELATED (material-exception-omission); incentive gate unchanged |
| Q8 invalid verified = 0 | PASS (0/1) | live Q8-a RELATED (treatment-contradiction) |
| Q25 invalid verified = 0 | PASS (0/1) | live Q25-a RELATED (proposition-source-sufficiency, EWT sub-gate) |
| Q36 invalid verified = 0 | PASS (0/1) | live Q36-a RELATED (proposition-source-sufficiency, penalty sub-gate) |
| valid verified reachability | PASS | live Q46-p1 VALID (exempt on Sec 109), Q47-a VALID (donor's 6%); focused reachability tests |
| Q5 unsafe approvals = 0 | PASS | live + incentive gate intact |
| accessor getter executions = 0 | PASS | A12-R2 suite (getter never executes) |
| accessor exceptions = 0 | PASS | A12-R2 suite |
| accessor verified = 0 | PASS | A12-R2 suite |
| unrestricted outcome prediction = 0 | PASS | live RES-a RELATED (outcome-prediction) |
| fabricated authority = 0 | PASS | adjudication: no fabricated authority in verified runs |
| false refusal = 0 | PASS | no valid answer wrongly refused; Q1-a RELATED this run was structural incompleteness (nondeterministic), not a false refusal |

The model validator did not override any failed deterministic gate: every Q38/Q46/Q25/Q36 fail-closed
occurred at the deterministic `proposition-source-sufficiency` stage before the LLM stage.
