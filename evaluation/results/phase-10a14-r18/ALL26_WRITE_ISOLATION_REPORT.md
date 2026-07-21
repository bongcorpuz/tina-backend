# PHASE-10A14-R18 — ALL-26 WRITE ISOLATION REPORT (P1-R17-IR1-003)

## 1. Design

Per `ALL26_WRITE_ISOLATION_SPEC.md`, Options 2 + 1 (the narrowest viable pair):

- `computeAll26()` is **pure**. It opens no output file and has no knowledge of any
  destination. It returns an object.
- `replayAll26To(destination)` takes the destination as an **explicit required argument**.
  There is no default — a default is exactly how R17 acquired a hardcoded historical target.
- `assertWritableDestination()` rejects a forbidden destination **before any file handle is
  opened**. Nothing is written and then removed. Nothing is restored.

Option 3 (isolated worktree/copy) was not needed. The R17 script is not modified; R18
simply never calls its write path.

## 2. Proof

**Before replay:** historical all-26 artifacts hashed; active repository clean.

**During replay:** output written only to the single validated destination. The module has
exactly one `fs.writeFileSync` call site and it writes to the validated variable.

**After replay:**

| Artifact | Before | After | Result |
|---|---|---|---|
| `phase-10a14-r17/R17_ALL26_NONMUTATING.json` | `f27db506…3ba668` | `f27db506…3ba668` | identical |
| `phase-10a14-e1/WS8_DETERMINISTIC_ALL26.json` | `53baf579…f49443` | `53baf579…f49443` | identical |

`git status` on `evaluation/results` reported **no tracked change**. mtimes unchanged.

**No restore command was needed and none was issued.** This is the material difference from
R17, whose proof could only state that the file was restored afterwards.

Replay result: `blocked=9 preserved=17 mismatch=0 pass=true`, written to
`evaluation/results/phase-10a14-r18/ALL26_ISOLATED_RESULT.json`.

## 3. Negative control

Configured with the historical path
`evaluation/results/phase-10a14-r17/R17_ALL26_NONMUTATING.json`:

```
Error: all26 replay: refusing to write into historical evidence:
       evaluation/results/phase-10a14-r17
exit 1
```

The target's SHA-256 after the attempt is `f27db506…3ba668` — unchanged, and its mtime is
unchanged, proving nothing was opened. Every directory in `HISTORICAL_EVIDENCE_DIRS`
(E1, R13–R17, and the shared payload directory) is refused, as is any in-repository path
outside the R18 evidence directory.

Omitting the destination entirely exits 2 with
`no default destination by design`.

## 4. Concurrent control

Two isolated replays executed concurrently: different output paths, no race, no overwrite,
both independently hashable, equal content (the computation is deterministic), both
`pass=true`, and both historical artifacts byte-identical throughout.

## 5. Defect found and fixed during this work

The CLI entrypoint guard compared `import.meta.url` against a hand-built
`file://${process.argv[1]}`. On Windows that yields `file://C:/…` while `import.meta.url`
is `file:///C:/…`, so the comparison silently failed: the CLI became a **no-op that exited
0 without writing anything**. A silent success is worse than a crash, and it would have
been easy to record that exit 0 as a passing replay. It is fixed with `pathToFileURL`, and
all three CLI paths are now verified: positive run writes and exits 0, historical
destination exits 1, missing destination exits 2.

## 6. Suite

`tests/phase-10a14-r18-all26-write-isolation.test.mjs` — **10 passed, 0 failed,
51 assertions, exit 0.** It asserts the module contains no hardcoded historical write
target, has exactly one write site, and — after stripping comments — contains no restore
command, no write-then-remove, and no before/after hashing relied upon to claim isolation.
The R17 defect is documented in a comment only and is never relied on in code.
