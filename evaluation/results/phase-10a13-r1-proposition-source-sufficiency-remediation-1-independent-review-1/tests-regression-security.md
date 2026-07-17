# Tests, Regression, Security, And Cleanup

## Focused Suite

Command:

`node tests/phase-10a13-r1-proposition-source-sufficiency.test.mjs`

Result:

- 17 passed
- 0 failed
- 21 assertions

Coverage confirmed:

- Q38 exact fails closed.
- Registration negative and positive controls exist.
- Tax-return-form non-overfire is tested.
- Q46 exact fails closed.
- VAT exemption and zero-rating distinctions are tested.
- General VAT rule reachability/non-overfire is preserved.
- Specific exception reachability is preserved.
- Foundational-authority laundering is blocked.
- Same-tax-type wrong-proposition VAT authority is blocked.
- Gate never upgrades trust.

## Regression Lanes

Committed remediation logs:

- Deterministic cycle 1: 190 suites, 0 failed, exit 0.
- Deterministic cycle 2: 190 suites, 0 failed, exit 0.
- Staging cycle 1: 7 suites, 0 failed, exit 0.
- Staging cycle 2: 7 suites, 0 failed, exit 0.

Independent runs:

| command | result |
|---|---|
| `node scripts/run-regressions.mjs` | syntax 10/0; suites 190/0; exit 0 |
| `node scripts/run-staging-smokes.mjs` sandboxed | suites 7/1; staging reachability failure |
| `node scripts/run-staging-smokes.mjs` network-enabled | suites 7/0; exit 0 |

Suite accounting:

- 190 deterministic + 7 staging = 197.
- +1 versus prior 196 is the new A13-R1 focused suite.
- No removed suite, hidden skip, forced success, weakened assertion, or staging bypass found.

## Prior Safeguards

| safeguard | review result |
|---|---|
| Q5 invalid verified | 0 |
| Q8 invalid verified | 0 |
| Q25 invalid verified | 0 |
| Q36 invalid verified | 0 |
| Accessor getter executions | 0 |
| Accessor exceptions | 0 |
| Accessor verified | 0 |
| Unrestricted outcome prediction | 0 |
| Fabricated authority | 0 |
| False refusal | 0 |
| Model-validator override of deterministic failure | 0 |
| Valid verified reachable | yes: `Q46-p1`, `Q47-a` |

## Evidence Hash Integrity

Remediation `EVIDENCE_MANIFEST.sha256`:

- Entries: 33
- Hash mismatches: 0

Review artifact manifest is separate in this directory.

## Security And Cleanup

Credential-shaped scans found no OpenAI keys, Slack tokens, private keys, or literal Authorization Bearer values in the remediation artifacts reviewed.

No private deployment URL, raw conversation identifier, taxpayer/client data, environment change, corpus/index/model change, frontend/Dev Factory change, production deployment, or reindexing was found.

Process state:

- Existing Node processes were present before/after review.
- Only localhost `5173` listeners were observed in the checked port set.
- Review started no backend server and did not terminate unrelated processes.
