# WS16 — Prior-safeguard preservation matrix

Runtime commit `f44490dffb3acac1b0ff7b0f1a88f90b534a213c`. Deterministic replay of the
committed A14 payloads plus targeted live probes.

| Safeguard | Requirement | Result |
|---|---|---|
| Q5 invalid verified | 0 | 0 (deterministic replay: not verified) |
| Q8 invalid verified | 0 | 0 |
| Q25 invalid verified (EWT on VAT auth) | 0 | 0 — live PR-Q25 not verified |
| Q36 invalid verified (penalty on VAT auth) | 0 | 0 — live PR-Q36 blocked `penalty_procedural` |
| Q38 invalid verified (registration) | 0 | 0 — live PR-Q38 blocked `registration_procedural` |
| Q46 invalid verified (VAT exception) | 0 | 0 — live PR-Q46 not verified |
| accessor getter executions / exceptions / verified | 0 / 0 / 0 | 0 / 0 / 0 (no accessor invocation path touched) |
| unrestricted outcome prediction verified | 0 | 0 (outcome-prediction guard unchanged) |
| fabricated authority | 0 | 0 |
| false refusal introduced by R3 | 0 | 0 — positive controls reachable (see live reconciliation) |
| deterministic failure overridable by model | no | no — gate fails closed before the LLM validator |
| valid VERIFIED_CONTROLLING reachable | yes | yes — individual/estate/donor/VAT positives verified live |

The R3 change touches only the filing/deadline/estate proposition classes; the
penalty/EWT/registration/VAT-exception classes and the outcome-prediction and
accessor safeguards are unchanged and pass their suites.
