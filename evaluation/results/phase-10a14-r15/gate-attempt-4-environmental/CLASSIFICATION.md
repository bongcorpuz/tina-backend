# GATE ATTEMPT 4 — ENVIRONMENTAL FAILURE (OpenAI stream instability)

Tree clean before the run. Staging cycles PASS with identity MATCHES on both.

| Cycle | Exit | Outcome |
|---|---|---|
| deterministic-cycle1 | 1 | FAIL — 4 suites |
| deterministic-cycle2 | 1 | FAIL — 4 suites (same members) |
| staging-cycle1 | 0 | PASS, identity MATCHES |
| staging-cycle2 | 0 | PASS, identity MATCHES |

Failing suites (identical in both cycles):
`patch-027u-openai-transient-retry`, `phase-10a10-r1-validator-schema-fail-closed`,
`phase-10a10-r2-missing-answersupport-fail-closed`, `phase-10a12-validator-competence`.

## Direct evidence of the cause

The captured log shows the concrete fault:

```
errorCode: 'ERR_STREAM_PREMATURE_CLOSE'
[PATCH_027V_OPENAI_RETRY_ATTEMPT] { attempt: 1, nextAttempt: 2, maxAttempts: 3, ... }
[PATCH_027V_OPENAI_RETRY_SUCCESS] { attempt: 2, ... }
FAIL transient failure is attempted twice total
```

`patch-027u` asserts exact retry semantics against a real OpenAI connection. Repeated
`ERR_STREAM_PREMATURE_CLOSE` faults inject additional real retries, so the attempt counts
the suite asserts no longer hold. The three validator suites fail on
`malformed / unavailable validator -> fail closed` with reason `unavailable` — the LLM
validator stage being unreachable.

Every one of the four makes real OpenAI calls. All four pass standalone, verified
repeatedly (`phase-10a10-r1` 22/0 twice; `patch-027u` 19/0).

## Why this is not attributable to the R15 runtime change

- The identical runtime passed this gate **206/0 twice on a clean tree** immediately after
  COMMIT 4. No runtime file has changed since — proven by
  `R15_RUNTIME_EQUIVALENCE_PROOF.json`.
- The R15 semantic, routing and persistence campaigns are fully deterministic and pass
  1528/1528 against this runtime with no network dependency.
- The failures are confined to suites that depend on live OpenAI connectivity.

## Consequence — no PASS is fabricated

The mandatory deterministic gate did **not** complete cleanly twice. Under the frozen PASS
criteria that is a blocking failure, regardless of cause. R15 therefore self-assesses
**REVISIONS REQUIRED**, with the sole outstanding item being completion of the
deterministic gate in a healthy network environment.

No runtime change was made in response, because no runtime defect was demonstrated.
Attempts 1–4 are all preserved; none was deleted.
