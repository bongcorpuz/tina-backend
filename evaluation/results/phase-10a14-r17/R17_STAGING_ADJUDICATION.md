# PHASE-10A14-R17 — STAGING FAILURE ADJUDICATION (P1-R16-IR-002)

## Classification

**`STAGING_UNREACHABLE`** — an environment condition at independent-review time.

Explicitly **not**: `RUNTIME_REGRESSION`, `FIXTURE_EXPECTATION_DEFECT`,
`HARNESS_CLASSIFICATION_DEFECT`, `TRANSPORT_FAILURE` (as a persistent condition), or
`UNKNOWN`.

## Evidence

### Independent review observed

Two staging cycles, 7 suites run, 1 failed each, exit 1 each. The repeated failure was
`phase-09r-tax-memo-runtime-staging-smoke-1`. The review itself recorded staging as
temporarily unreachable and noted an inconsistent fixture decision / reachability summary.

### R17 observes now

| Check | Result |
|---|---|
| Staging config present | yes (URL and JWT secret resolved from environment; values never printed) |
| `GET /health` | **200**, `{"status":"ok","service":"tina-backend"}`, 4,104 ms |
| Transport / DNS | no error |
| `phase-09r` standalone | **36 assertions passed, 0 failed, exit 0** |
| Full staging gate | **7 suites run, 0 failed, exit 0** |

The 4.1-second health response indicates a cold start on the hosting platform, which is
the ordinary behaviour of a suspended free-tier service and is consistent with a
transient unavailability window during the review.

## Why this is not a harness classification defect

The reviewer's observation of an "inconsistent fixture decision/reachability summary" is
explained by this assertion in `phase-09r`:

```js
if (isPass()) {
  check(stagingReachable === true,
    "PASS decision requires staging to have been reachable during this test run");
  …
}
```

The committed fixture records a `PASS` decision. When staging is unreachable at run time,
`stagingReachable` is `false`, and the harness **refuses to let the committed PASS stand**.
It fails.

That is the correct and truthful behaviour. The harness is **not** converting an outage
into a PASS — it is doing the opposite, and doing it deliberately. What the reviewer saw
was a fixture-consistency failure message rather than a plainly-worded "staging is
unreachable" message; the *classification* was sound even though the wording could read
obliquely.

## Decision: the harness is NOT modified

The authorization permits a narrow harness change **only if** the classification is
demonstrably inconsistent. It is not. The demonstration runs the other way: the harness
correctly refuses a false PASS during an outage.

Changing it would mean either weakening a guard that is working, or rewording a message
for cosmetic reasons while touching a staging smoke test — neither is justified by
evidence, and both carry regression risk against an accepted closure.

**No runtime change is made either**, because no runtime regression is demonstrated: the
identical runtime now passes all seven staging suites.

## Consequence

`phase-09r` and the staging gate are expected to pass in the R17 gate cycles. If staging
becomes unreachable during those cycles, the attempt will be preserved, classified
`STAGING_UNREACHABLE`, and **not** presented as a PASS — and R17 will self-assess
REVISIONS REQUIRED rather than disguise an outage.
