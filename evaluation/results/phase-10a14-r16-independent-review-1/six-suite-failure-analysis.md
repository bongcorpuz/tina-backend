# Six-Suite Failure Analysis

Executor claimed deterministic failures:

- `patch-027u-openai-transient-retry`
- `phase-10a10-r1`
- `phase-10a10-r2`
- `phase-10a10-verified-controlling-residual`
- `phase-10a12`
- `phase-10a8`

Independent deterministic cycles:

- `patch-027u-openai-transient-retry`: PASS.
- `phase-10a10-r1`: PASS.
- `phase-10a10-r2`: PASS.
- `phase-10a10-verified-controlling-residual`: PASS.
- `phase-10a12`: PASS.
- `phase-10a8`: FAIL.

Additional independently observed failure:

- `patch-07b-clarification-final-gate-1-track-closure`: FAIL.

Adjudication:

- The deterministic gate remains failed.
- The executor's failure-cause attribution to the R15 `ERR_STREAM_PREMATURE_CLOSE` class is not supported by this review's independent runs.
- At least one observed failure is a local deterministic false-refusal regression, not a network transport failure.
