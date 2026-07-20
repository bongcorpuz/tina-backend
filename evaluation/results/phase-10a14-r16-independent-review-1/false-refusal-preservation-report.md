# False-Refusal Preservation Report

Executor-disclosed regression:

- COMMIT 5 introduced false refusals.
- The deterministic gate preserved a failed attempt before correction.
- COMMIT `0323bb91` corrected the introduced false refusals.

Independent observations:

- Standalone `phase-10a8-trust-calibration-and-answer-correctness-remediation-1.test.mjs` still fails at F14.
- Failing question: `What is the holding-period rule for an individual's capital gain on personal property?`
- The suite expected ALLOW, but final runtime does not ALLOW.
- Both independent full deterministic cycles reproduce this failure.

Adjudication:

- The executor-introduced false-refusal risk is not fully closed.
- The frozen R16 inventory missed at least this capital-gain question family.
