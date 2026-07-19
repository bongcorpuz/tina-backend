# Focused And Runner Evidence

Focused suites run independently:

- node tests/phase-10a14-r10-calendar-relative-public-answer-replacement.test.mjs: phase-10a14-r10 22 passed, 0 failed.
- node tests/phase-10a14-r9-calendar-relative-deadline-and-filing-rationale-alignment.test.mjs: phase-10a14-r9 15 passed, 0 failed.

Regression runner:

- Initial attempt with a 120-second tool timeout was not counted; it timed out before the runner summary.
- Cycle 1 with a 300-second timeout: exit 0; syntax checks 10 run, 0 failed; deterministic suites 200 run, 0 failed.
- Cycle 2 with a 300-second timeout: exit 0; syntax checks 10 run, 0 failed; deterministic suites 200 run, 0 failed.

Staging runner:

- Restricted-network attempt: 7 staging suites run, 1 failed; phase-09r reported staging temporarily unreachable.
- Network-enabled cycle 1: exit 0; staging-smoke suites 7 run, 0 failed.
- Network-enabled cycle 2: exit 0; staging-smoke suites 7 run, 0 failed.

The runner evidence supports the final-runtime regression claims but does not cure the missing mid-run defect-preservation evidence or the independent detector-completeness gap.
