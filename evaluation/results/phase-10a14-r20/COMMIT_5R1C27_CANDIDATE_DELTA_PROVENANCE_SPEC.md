# COMMIT 5R1-C27 Candidate Delta Provenance Spec

Candidate-only deltas are base-relative only:

```text
diff(exact reconstructed controlling-base runtime snapshot, candidate runtime snapshot)
```

The full runtime diff from committed HEAD may contain inherited C7-C26 runtime changes
and is never labeled candidate-only. Every material attempt stores:

- `BASE_RUNTIME_IDENTITY.json`
- `C27_ONLY_CANDIDATE.patch`
- `FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch`

Replay is mandatory: applying the candidate-only patch to an exact copy of the base
snapshot must reproduce candidate hashes, and reverse-application must restore base
hashes. Any failure blocks material acceptance.
