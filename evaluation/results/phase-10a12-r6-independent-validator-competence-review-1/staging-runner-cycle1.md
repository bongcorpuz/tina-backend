# Staging Runner Cycle 1

Command: `node scripts/run-staging-smokes.mjs`

Environment note: the sandboxed network run failed 7/1 on the 09R reachability-consistency condition. The same command was rerun with network access to avoid mistaking sandbox networking for product evidence.

Network-enabled result:

- Exit code: 0
- Staging-smoke suites: 7 run, 0 failed
- Decision: PASS