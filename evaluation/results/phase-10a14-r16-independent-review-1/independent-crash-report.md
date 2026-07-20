# Independent Crash Report

Journal suite cycles:

- Standalone cycles: 5/5 exited 0.
- Concurrent job cycles: 3/3 exited 0.
- Focused R15 journal run: exit 0, 21 passed, 0 failed.
- Full deterministic runner: R15 journal suite passed in both independent cycles.

No unsettled top-level await was observed in the corrected R16-backed suite.

Relevant logs:

- `journal-cycles-summary.json`
- `journal-concurrent-job-summary.json`
- `focused-r15-journal-crash.raw.txt`
- `deterministic-cycle-1.raw.txt`
- `deterministic-cycle-2.raw.txt`
