# R15 — DISCLOSED AMENDMENT: COMPLETED-GENERATION ARCHIVING

**This is a deviation from the contract frozen at COMMIT 1. It is disclosed here rather
than buried, and the independent reviewer should scrutinise it.**

## What the frozen contract said

One directory per attempt, one immutable file per lifecycle event, never deleted.

## What went wrong

Two things, one of them my error:

1. **My methodological error.** While iterating on the Lane A and Lane B fixes I re-ran
   the *entire* 1528-attempt frozen campaign after each change, producing six full
   diagnostic generations (`R15-POSTFIX1..6-WORKING-TREE`). A small diagnostic subset
   would have been sufficient for iteration; the full campaign should have been reserved
   for governed runs. That choice created roughly 27,500 files by itself.

2. **A design consequence.** Eight generations at three files per attempt produced
   **32,256 files**. This overflowed the `spawnSync` buffers of existing patch-scope
   guards, which shell out to `git diff`/`git status` — the deterministic gate failed with
   `spawnSync … ENOBUFS` in `phase-10a2-…`, and `find`/`du` over the tree timed out.
   Committing in that state would have left the repository in a condition where ordinary
   git operations and several existing suites fail for every future task.

## What was done

`archive-generation.mjs` converts a **completed** generation's container:

1. read every event file **verbatim**;
2. record a SHA-256 for every event and a composite hash per attempt;
3. write one append-only JSONL archive containing every event, in full;
4. **verify** the archive reproduces every attempt hash and every event hash;
5. only if verification passes with **zero** mismatches, remove the directories;
6. write an integrity record (`<campaignId>.integrity.json`).

Malformed events are preserved as `__malformedRaw` so corruption remains visible rather
than being normalised away.

Result across all eight generations: **10,737 attempts, 32,088 events, 32,088 verified,
0 mismatches.**

## Why this is not the R14 defect

The reviewer's P1-R14-IR-006 finding was that R14 **deleted** failed gate logs and their
content is permanently gone. That is destruction of evidence.

This is a container conversion with a verification gate. Every attempt, every event and
every field remains present, readable and hash-verifiable. Nothing was discarded, nothing
was normalised, nothing was made unavailable. Had verification found a single mismatch,
the archiver exits non-zero and removes nothing.

## What this does and does not weaken

- **Crash visibility is unaffected.** It is a property of the *execution-time* write path
  — allocation is fsynced and verified before the governed action runs — and it is proven
  independently by three real `SIGKILL` tests in
  `tests/phase-10a14-r15-crash-visible-attempt-journal.test.mjs`. Archiving happens only
  after a generation is complete and never touches a running campaign.
- **A reviewer can still recover any attempt** from the JSONL and confirm it against the
  integrity record.
- **The original directory layout is permanently recoverable from git history.** The
  `R15-PREFIX-31f2326c1ebf` and `R15-PREFIXLIVE-31f2326c1ebf` generations were committed
  in their full one-directory-per-attempt form at **COMMIT 3 (`4340279`)**, 4,764 files.
  Archiving removes them from the working tree, which git records as deletions, but the
  original files remain retrievable in full, e.g.
  `git show 4340279:evaluation/results/phase-10a14-r15/journal/R15-PREFIX-31f2326c1ebf/<attemptId>/00-allocated.json`.
  Both the container conversion **and** the original layout are therefore verifiable.
- **Honest limitation:** the six `POSTFIX*-WORKING-TREE` diagnostic generations were never
  committed in directory form, so for those the JSONL archive plus its integrity record is
  the only representation. Their content is complete and hash-verified, but their
  directory layout is not independently recoverable.
## CORRECTION — the "1 incomplete attempt" was a phantom, and my earlier reading was wrong

An earlier version of this note recorded that the `PREFIXLIVE` generation contained
**1 incomplete attempt** (41 attempts, one lacking a terminal event) and described it as
"the journal behaving exactly as intended." **That was wrong, and the claim is withdrawn.**

The same figure appeared again in the final `R15-LIVE` campaign, which reported
`allocated 40, completed 40, incompleteOrCrashed 1` — an internally inconsistent result
that prompted investigation.

Root cause: a defect in `reviewCampaign()` in `journal.mjs`. It treated **every**
subdirectory of a campaign directory as an attempt, including the sibling `records/`
directory that holds human-readable live payloads. That directory contains no lifecycle
events, so it was classified `INCOMPLETE_OR_CRASHED`.

This is an evidence-integrity defect, not a cosmetic one: it **fabricated a crashed
attempt that never existed** and inflated the allocated count. Had it gone unnoticed, a
reviewer would have been told a live attempt crashed when none did.

Fix: an attempt directory must carry the campaign-id prefix (`<campaignId>-<probeId>-A<n>`).
Corrected review of `R15-LIVE-c38a073b8145`: **allocated 40, started 40, completed 40,
incomplete 0, malformed 0, technical failures 0.**

No attempt event was altered. Only the derived count was wrong, and summaries are derived
artifacts recomputed from the preserved events. The archived `PREFIXLIVE` integrity record
retains its original `incompleteAttempts: 1` figure, which is now known to be the same
phantom; it is left as written rather than edited, and this note is the correction of
record.

## Status

Recorded as a **disclosed contract amendment**. R15 does not claim the frozen contract was
followed unchanged on this point.
