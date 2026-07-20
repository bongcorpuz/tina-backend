# PHASE-10A14-R15 — EXACT STAGING IDENTITY AND GATE-ATTEMPT PRESERVATION (FROZEN)

## Part 1 — Exact staging runtime identity (remediates P2-R14-IR-009)

R14 proved the deployed runtime by **behavioural fingerprint**: it observed that
`persistenceStatus` was present, a field only R14 code emits. That shows *a* build
containing the change is live; it does not prove *which commit*. It cannot distinguish
the final runtime from any later or intermediate build carrying the same field.

R15 must prove the exact commit.

### Mechanism

A build/runtime identity module reports the commit SHA baked in at build time, exposed
through a minimal `/health` field:

```jsonc
{ "status": "ok", "service": "tina-backend", "runtimeCommit": "<40-hex>", "deploymentId": "<provider id or null>" }
```

Resolution order, first non-empty wins:

1. an immutable release manifest written at build time;
2. the approved provider's build-time commit environment variable
   (e.g. `RENDER_GIT_COMMIT`);
3. a repository read at boot, for local/dev only;
4. `null` — never a guess, never a fabricated value.

### Exposure limits

Expose **only** `runtimeCommit`, `deploymentId` and `service`. Never expose environment
values beyond the approved commit SHA, secrets, route inventory, internal paths,
credentials or build tokens.

### Live campaign identity rule

- **Before** the campaign: query identity; require an exact match to the final runtime SHA.
- **During** every record: store the server-reported `runtimeCommit` and `deploymentId`.
- **After** the campaign: query identity again; require the same SHA and deployment.
- If identity changes mid-campaign the campaign is **mixed** and cannot control PASS.

A harness-supplied `runtimeCommit` argument is **not** sufficient evidence.
Behavioural fingerprinting is supplementary only and may never stand alone.

### Honest constraint recorded in advance

The staging host must actually be running a build that contains the identity endpoint
before this evidence can exist. The first deploy carrying the endpoint is therefore a
prerequisite of the final live campaign, not of the pre-fix campaign. The pre-fix
campaign records whatever identity is available — including `runtimeCommit: null` or a
404 — as its truthful baseline, and that baseline is preserved rather than treated as a
failure to be hidden.

## Part 2 — Gate-attempt preservation (remediates P1-R14-IR-006)

R14 ran the deterministic gate, wrote its logs **into** the repository, and those logs
made the tree dirty, which several patch-scope guards observed as unexpected changes. The
gate exited non-zero. R14 then **deleted** those logs and re-ran with external output.
The final gates were valid, but the failed attempts were destroyed.

### Rule

Every runner invocation is a journaled attempt, including every failure. This covers:

- timeout;
- dirty-tree self-observation (the exact R14 case);
- restricted network;
- unavailable staging;
- syntax failure;
- suite failure;
- successful rerun.

**No attempt log may be deleted for any reason** — not because it is noisy, mistaken,
environmental, self-inflicted or non-controlling.

### Clean-tree-sensitive runners

Several suites shell out to `git diff --name-only` or compare against `HEAD`, so writing
a log into the repo while the runner executes causes the runner to observe its own
output. Therefore:

1. capture runner stdout/stderr to a path **outside** the repository;
2. let the runner finish;
3. **copy** every attempt log — successful and failed alike — into governed evidence;
4. record each as a journal attempt with its own lifecycle events and exit code.

Copying is mandatory. Discarding a failed attempt is prohibited.

### Required gate chronology

`R15_GATE_CHRONOLOGY.json` must list every runner attempt in order with: attemptId,
runner, argv, started/completed timestamps, exit code, outcome classification, log path
in evidence, and whether the attempt is controlling. The count of preserved gate logs
must equal the count of runner invocations. A gap is a governance failure.
