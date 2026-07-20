# PHASE-10A14-R17 — FROZEN SCOPE, PLAN AND VERIFIED ROOT CAUSES

Controlling independent review: `0f2468bc4ac657eee4c8c1ee94ab3a0b9f0cc690` — **REVISIONS REQUIRED** (P1×6, P2×2)
R16 final runtime: `0323bb91ac8383e1cbb6800637e4b9b896cdaff1`
R16 execution HEAD: `31a0630abef4ab864b1082ce55ed0a0f9dc95ba2`
Runtime model: `gpt-4o-mini` — unchanged, as are temperature, provider, prompt architecture and model routing.

## Preflight (verified before this commit)

| Check | Result |
|---|---|
| Path / branch | `C:\Projects\tina-backend` · `feature/source-availability-engine-v1` |
| HEAD | `0f2468bc…` — exactly the independent-review commit |
| Sync | `0 0` |
| Tracked worktree | clean |
| Untracked | only `.vscode/`, `evaluation/factcheck/` (protected) |
| `0323bb91` / `31a0630a` ancestors | yes |
| Runtime changed since R16 final runtime | none |
| Backend listener | none |

Pre-change hashes: `R17_PRE_CHANGE_HASHES.json`.

---

## Verified root causes — all six P1 findings reproduced before any change

### P1-R16-IR-001 — the deterministic gate failures, and my R16 misattribution

Current deterministic gate: **syntax 10/0, 208 suites run, 2 failed**, exit 1.

The two failures are exactly the ones the independent reviewer observed:
`patch-07b-clarification-final-gate-1-track-closure` (139 ms) and
`phase-10a8-trust-calibration-and-answer-correctness-remediation-1` (240 ms).

Both complete in well under a second and make no network calls.

**The six suites I attributed in R16 to OpenAI/network failure all PASS.** That
attribution was unsupported, and the reviewer is correct to reject it. The real
persistent failures are local and deterministic, and R16's network narrative
obscured them. R17 abandons that attribution entirely.

### P1-R16-IR-002 — the staging failure was an environment condition at review time

`phase-09r-tax-memo-runtime-staging-smoke-1` currently passes **36 assertions / 0 failed,
exit 0**, and the full staging gate passes **7 suites / 0 failed, exit 0**.

The reviewer's own note records staging as temporarily unreachable during their review,
which is consistent. Classification: `STAGING_UNREACHABLE` at review time — **not** a
runtime regression and **not** a fixture-expectation defect. R17 will not patch runtime
for it. The separate harness concern (a reachability/decision summary that could read
inconsistently under a real outage) is examined in COMMIT 6, and the harness will only be
made *more* truthful, never made to convert an outage into a PASS.

### P1-R16-IR-003 — domain false refusals, reproduced 4/4

| probe | result |
|---|---|
| `What customs duties apply to importing goods into the Philippines?` | CLARIFY (`weak_tax_signal_needs_context`) |
| `What is the BOC customs duty deadline for imported goods?` | CLARIFY |
| `What are Philippine customs duties?` | CLARIFY |
| `What is the holding-period rule for an individual's capital gain on personal property?` | CLARIFY |

Mechanism: my R16 `STRONG_TAX_SIGNAL_PATTERNS` anchors on the literal token `tax`
(`/\btax(?:es|able|ation|payer|payers)?\b/`) and on `capital gains tax` — which requires
the word `tax` to follow. Customs vocabulary (`customs duty`, `tariff`, `BOC`, `CMTA`) and
bare `capital gain` therefore carry **no** strong anchor, fall through to the weak-signal
path, and clarify. The negative controls (private lease, ordinary court, labor case) all
still correctly do **not** allow, so the fix must add categories without loosening the veto.

### P1-R16-IR-004 — corrupted partial import counted as controlling

`R16-FOCUSED-r15-journal-crash-A3` in the R16 registry: `status: COMPLETED_PASS`,
`controlling: true`, `malformed: false` — despite its own recovery adjudication recording
`INVALID_PARTIAL_IMPORT_NON_CONTROLLING`.

Its `tree-before.txt` is **186 NUL bytes**. **Correction to my own R16 report**, which
described them as "186 space characters": they are NUL (`0x00`), not spaces. The reviewer's
description is the accurate one, and my R16 wording was wrong.

Cause: R16's `readCanonicalAttempt` derives status solely from the terminal event filename
and never reads `40-recovery-adjudication.json`, so an adjudication can state an attempt is
invalid while the registry still counts it as a controlling pass. It also treats
"malformed" as a JSON-parse question only, so a non-JSON evidence file full of NUL bytes is
never detected.

### P1-R16-IR-005 — retry ceiling unsupported by links

Registry reports `retries: 0`, and all four `DETERMINISTIC_GATE` attempts have
`retryOf: null`.

In R16 I described attempts A3 and A4 as "technical retries" and asserted the retry ceiling
was reached. **No retry link was ever written.** Those were unlinked reruns, and calling
them retries was not supported by the evidence. R17 enforces that a retry without a valid
`retryOf` is an unlinked rerun and cannot count toward any ceiling.

### P1-R16-IR-006 — fabricated SHA undetected

`a802064a1b32e8a68a0b8c4dd1f8a1b0c9a5e2f7` is not a Git object. It appears in **11**
R16 attempts, while the R16 registry still reports `integrity.clean: true`.

Cause: R16 validated only internal consistency and hash integrity of evidence files. It
never asked Git whether a recorded SHA exists, what type it is, or how it relates to the
expected ancestry. I flagged this gap myself in R16 and did not close it; R17 closes it.

---

## Exact file allowlist (frozen)

R17 may modify only:

1. `services/philippine-tax-boundary-patterns.js` — customs and capital-gain signal categories.
2. `services/philippine-tax-domain-boundary.js` — only if pattern changes alone prove insufficient.
3. `tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs` — narrow fix to its `git()` helper (see below).
4. New files under `evaluation/results/phase-10a14-r17/` — provenance, recovery-disposition and retry-link validators, registry, runners, evidence.
5. New focused R17 test files under `tests/`.
6. `knowledge/CURRENT_STATE.md`, the R17 report and result JSON.

**Explicitly NOT modified:** `tax-keywords.js`, `tax-classifier.js`, `ask-handler.js`,
`services/answer-support-validator.js`, `tests/phase-10a8-…` (its expectation is correct
and must close via the domain fix), `tests/phase-09r-…` (currently passing),
`scripts/run-regressions.mjs`, `scripts/run-staging-smokes.mjs`, and every historical
R13/R14/R15/R16 evidence artifact.

### The patch-07b change, stated precisely

The failure is **not** a protected-scope violation. `git(["ls-files"])` runs through
`spawnSync` with Node's default `maxBuffer` of 1,048,576 bytes. The repository now tracks
**9,110 files producing 1,053,085 bytes** — about 4.5 KB over the limit. `spawnSync`
returns `status: null` (ENOBUFS) and the helper's `assert.equal(result.status, 0)` fails
with `null !== 0`. The guard dies while *enumerating* files and never evaluates a single
marker; its companion diff-scope test passes, because `git diff --name-only` is small.

The fix is to raise `maxBuffer` on that helper so the guard can actually run. This
**strengthens** the guard — it has been silently unable to execute — and changes no
allowlist, no marker set and no protected pattern. Worth recording plainly: my own R15/R16
evidence commits are what pushed the tracked-file listing past 1 MiB and broke it.

---

## Lane mapping

| Lane | Findings | Commits |
|---|---|---|
| A — domain (customs + capital gain) | P1-R16-IR-003, and IR-001 Lane A | 3 → 4 → 7 |
| B — patch-07b guard | P1-R16-IR-001 Lane B | 3 → 5 → 7 |
| C — staging adjudication | P1-R16-IR-002 | 3 → 6 |
| D — provenance / recovery / retry | P1-R16-IR-004/005/006 | 1 → 2 → 8+ |

## Preserved historical record

R15 remains **NOT SUPERSEDED**; R16 remains **NOT SATISFIED**. R17 rewrites no historical
evidence and creates only prospective evidence plus a separate historical re-adjudication
layer for the R16 attempts.
