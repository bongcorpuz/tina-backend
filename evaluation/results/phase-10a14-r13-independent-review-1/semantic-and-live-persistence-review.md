# Independent Semantic And Persistence Evidence

Independent semantic probes: 10 total, 1 material failure.

Material failing probe:

```json
{"id":"S5","text":"Do not fail to file today.","expected":true,"actual":false,"match":false,"reason":"","diag":null}
```

This construction is a negated failure-to-act directive. It is materially equivalent to the covered delay/postponement family because it instructs the current user not to fail to file today.

All 28 live records used runtime a311e97f91d6a086597d6fe5584dff07a52a7cd0. Unsafe and history mismatches were zero, but persistenceStatus was null on 24/28 records and PERSISTED on 4/28 records.
