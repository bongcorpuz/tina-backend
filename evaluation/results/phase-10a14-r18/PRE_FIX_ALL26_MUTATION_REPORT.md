# PHASE-10A14-R18 — PRE-FIX ALL-26 MUTATION PROOF (P1-R17-IR1-003)

Captured before any R18 change, on the mandatory starting HEAD `2108d447`.

## 1. What was run

```
node evaluation/results/phase-10a14-r17/all26-nonmutating.mjs
exit 0
```

This is the script R17 named "non-mutating".

## 2. Measured mutation

Target: `evaluation/results/phase-10a14-r17/R17_ALL26_NONMUTATING.json`

| Stage | SHA-256 |
|---|---|
| before | `f27db5062124c0642f75d9c7adefcb96ee3080f314a1d51a640d0ba1037ba668` |
| after | `dd66bcd5b71795172910234624a7bae78c7b86fcee92e079cb9fe56a79b39886` |

**Result: historical evidence was mutated.** `git status` reported the tracked historical
file as modified. `git diff --numstat` reported **31 lines added, 31 removed**.

The changed rows flip exactly as the independent review described:

```diff
-      "verifiedEligible": true,
-      "stage": "llm",
+      "verifiedEligible": false,
+      "stage": "unavailable",
```

The mutation is environmental: the committed artifact was generated with LLM reachability,
and this execution had none. That is precisely why a replay must never write to a historical
path — the historical record silently acquires the properties of whoever last ran it.

## 3. Root cause

`all26-nonmutating.mjs` line 58 writes unconditionally to a **hardcoded** historical path:

```js
fs.writeFileSync(path.join(REPO, "evaluation/results/phase-10a14-r17/R17_ALL26_NONMUTATING.json"), ...)
```

There is no output parameter and no destination guard. The script's own final line prints:

```
blocked=9 preserved=17 mismatch=0 pass=true e1Untouched=true
```

It reports `e1Untouched=true` — it verifies that it spared the *E1* artifact while silently
overwriting its own R17 artifact in the same run. R17 generalised "avoids one known
historical path" into the property name "non-mutating". The name described one avoided path,
not a property of the design.

This is the same defect class as R17's earlier E1 incident, and it confirms the review's
finding that detection-plus-restore is not isolation.

## 4. Restoration

Restored with `git checkout` of that single path. Post-restore SHA-256 is
`f27db506…3ba668`, identical to the before value, and `git status` on
`evaluation/results` is clean for tracked files.

Restoration was performed **only after** the exact mutation evidence above was captured, as
the authorization requires. No other historical file was modified: `git status` reported
exactly one modified tracked path throughout.

## 5. Disposition

This pre-fix attempt is **non-controlling**. It exists to prove the defect, not to produce a
result. The R18 remediation is specified in `ALL26_WRITE_ISOLATION_SPEC.md`: pure computation
extraction plus explicit output injection, with a destination guard that rejects historical
paths **before opening any file**, and no default destination at all.
