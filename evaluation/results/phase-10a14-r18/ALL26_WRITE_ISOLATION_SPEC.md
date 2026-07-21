# PHASE-10A14-R18 — ALL-26 WRITE ISOLATION SPECIFICATION

Frozen before implementation.

## 1. Defect being remediated (P1-R17-IR1-003)

R17's `all26-nonmutating.mjs` writes its result to a **hardcoded** path inside what is now
historical evidence:

```
evaluation/results/phase-10a14-r17/R17_ALL26_NONMUTATING.json   (line 58, unconditional)
```

When the independent reviewer executed it, that historical file was overwritten — multiple
rows changed from LLM/verified-eligible state to unavailable/false state. The file was
restored, but restoration is not isolation.

R17 named the script "non-mutating" because it avoided the *E1* artifact. It still had a
hardcoded historical write target of its own. The name described one avoided path, not a
property of the design.

## 2. Core rule

**The replay must be structurally unable to write to any historical evidence path.**

- "Write then restore" is prohibited.
- Mutation-detection-plus-restore must never be classified as non-mutating.
- Detection is not prevention.

## 3. Chosen implementation — Option 1 + Option 2

The narrowest viable design, per the authorization's preferred order:

- **Option 2 (pure computation extraction):** the all-26 computation is extracted as a pure
  function returning an object. It performs no writes and opens no output file.
- **Option 1 (explicit output injection):** the R18 wrapper receives its output destination
  as an explicit required argument and writes the returned object only there.

There is no default output path. Omitting the destination is an error, not a fallback — a
default is exactly how R17 acquired a hardcoded historical target.

Option 3 (isolated worktree/copy) is not used: Options 1 and 2 are materially less risky and
require no repository duplication.

Historical scripts retain their historical behavior and are not modified. R18 simply never
calls their write path.

## 4. Destination guard

Before opening any output file the wrapper rejects, **prior to opening**, any destination
that resolves inside:

- `evaluation/results/phase-10a14-e1/` … `-r17/` and every other R13–R17 evidence directory;
- any path outside the authorized R18 evidence directory or an external temporary directory.

Rejection occurs at argument-validation time. No file handle is opened. No file is created
and then removed.

## 5. Mandatory write-isolation proof

**Before replay:** hash every historical all-26 evidence file and the full protected
historical file list; verify the active repository is clean.

**During replay:** output only to the authorized R18 path or an external temporary location;
record every write destination the wrapper resolves.

**After replay:** all historical hashes identical; `git status` unchanged; no content or
mtime change on protected historical files; **no restore command was needed or issued**;
output exists only at the authorized destination.

The proof must state explicitly that no restore occurred — R17's failure is precisely that
its proof could only say the file was restored afterwards.

## 6. Negative control

The wrapper is deliberately configured with a historical output path
(`evaluation/results/phase-10a14-r17/R17_ALL26_NONMUTATING.json`). It must reject **before
opening or writing**, and the target file's hash must be unchanged afterwards.

## 7. Concurrent control

Two isolated replays run concurrently. They must use different output paths, not race, not
overwrite each other, not touch historical evidence, and produce independently hashable
outputs.
