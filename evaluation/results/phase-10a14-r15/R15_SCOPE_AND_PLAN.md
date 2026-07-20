# PHASE-10A14-R15 — FROZEN SCOPE, PLAN AND ROOT-CAUSE PRE-ANALYSIS

Controlling independent review: `768059ccd5248f83fd29ce85be06c7d6f4921a43` — **REVISIONS REQUIRED** (P1×7, P2×2, P3×1)
R14 execution HEAD: `1aa7ca5defbfb028eede61cc849318f5378003b5`
R14 final runtime (pre-fix baseline for R15): `31f2326c1ebfa5acea8871361db97323f61c644e`
R13 final runtime: `a311e97f91d6a086597d6fe5584dff07a52a7cd0`
Runtime model: `gpt-4o-mini` (unchanged)

## Preflight (verified before this commit)

| Check | Result |
|---|---|
| Path / branch | `C:\Projects\tina-backend` · `feature/source-availability-engine-v1` |
| HEAD | `768059cc…` — exactly the independent-review commit |
| Sync | `0 0` |
| Tracked worktree | clean |
| Untracked | only `.vscode/`, `evaluation/factcheck/` (protected) |
| R14 runtime `31f2326c` ancestor | yes |
| R14 execution HEAD `1aa7ca5d` ancestor | yes |
| R13 runtime `a311e97f` ancestor | yes |
| Runtime files changed after `31f2326c` | none |
| Backend listener | none |

## Pre-fix runtime hashes (SHA-256, before any R15 modification)

| File | SHA-256 | Lines |
|---|---|---|
| `services/answer-support-validator.js` | `641f951ca44e8757a7e36b963124d9be53636a5d1778188d1103c6939d8970db` | 1659 |
| `services/persistence-receipt.js` | `a3a1fb51a3793fad8b4424c37426d9f3436dc7d1eec0cbda106a8740020b4e68` | 47 |
| `ask-handler.js` | `36e0f7e4893f8959838ac1cc5421f35f831e81b7faa8e5f15bf183961a526d55` | 3659 |
| `services/philippine-tax-domain-boundary.js` | *(hashed in `R15_PRE_FIX_HASHES.json`)* | 148 |
| `services/philippine-tax-boundary-patterns.js` | *(hashed in `R15_PRE_FIX_HASHES.json`)* | — |

## Exact runtime file allowlist

R15 may modify only:

1. `services/answer-support-validator.js` — Lane A semantic composition and action target.
2. `services/philippine-tax-boundary-patterns.js` — Lane B tax-filing adjacency patterns.
3. `services/philippine-tax-domain-boundary.js` — Lane B routing, only if pattern changes alone are insufficient.
4. `ask-handler.js` — Lane C central persistence finalizer; Lane B clarification routing for LC5.
5. `services/persistence-receipt.js` — **only** if an independently reproduced defect requires it.
6. A new staging runtime-identity module + its minimal `/health` exposure — Lane D (WS10).
7. New R15 test files, R15 evaluation scripts, R15 evidence/journal files.
8. `knowledge/CURRENT_STATE.md`, the R15 report and result JSON.

Any other runtime file requires a justified amendment to this frozen plan **before** modification.

---

## Root causes — reproduced against the unchanged R14 runtime

All reproductions were executed **before** this commit and before any modification.

### P1-R14-IR-001 — semantic (Lane A). Reproduced: 12/12 mismatches, 9 misses + 3 overfires.

Four distinct mechanisms, not one:

1. **Compound-clause bypass (IR-U6, IR-U7).** `splitCalendarClauses` splits only on
   `[.!?;]`, newlines and headings. It does **not** split on coordinators. So
   *"The authority does not establish today's deadline, but do not fail to file today"*
   is a **single** clause in which `CR_SAFE_NEGATION_RE` matches `does not establish`;
   the `safeNegation` branch then suppresses the entire clause, including the unsafe
   half. A safe clause is currently able to shield an unsafe one — the precise property
   R14's metamorphic invariant MM10 claimed to hold. MM10 passed only because its fixture
   used a **sentence** boundary (`.`), which does split. The invariant was real but the
   test fixture was too weak to exercise it.
2. **Action-target confusion (IR-S1).** *"Do not fail to verify whether filing is
   actually due today"* is scored unsafe because `CR_FILING_ACTION_RE` matches the noun
   `filing` anywhere in the clause. The governed action is **verify**, not **file**. The
   frame has no action-target concept, so any clause merely *mentioning* filing near a
   relative time can be treated as a filing directive.
3. **Unrecognized nonperformance surfaces (IR-U1..U5).** `left unfiled` (vs `leave …
   unfiled`), `let today pass without filing`, `remain outstanding`, `unsubmitted`, and
   the deferral verb `hold` are all unmatched. `see to it that` is not a directive cue.
4. **Filipino gaps in both directions (IR-U8, IR-U9 missed; IR-S2, IR-S3 overfired).**
   `mapalampas`, `lumipas ang araw nang hindi nakakapag-file`, `siguraduhing` are
   unrecognized as unsafe; `hindi napatutunayan`, `huwag ipalagay` are unrecognized as
   safe epistemic negation.

A broader phrase list cannot fix (1) or (2). Both require structural change: independent
clause segmentation, and an explicit action-target field.

### P1-R14-IR-002 — routing (Lane B). Reproduced: 7/7 rejected.

All seven return `decision: REJECT`, `detectedDomain: UNCLASSIFIED`,
`reason: fail_closed_no_tax_signal`. They reference filing, returns, an accountant, a
notice or an authority, but contain **no explicit tax keyword**, so neither
`PH_TAX_ALLOW_PATTERNS` nor `isTaxRelated` fires and the fail-closed default rejects.

Important correction to the finding's framing: **LC5 is not a domain-boundary defect.**
`"How much tax do I owe?"` already returns `ALLOW / PHILIPPINE_TAX`. Its defect
(P2-R14-IR-008) is entirely downstream — the answer path returns a no-indexed-authority
fallback instead of a clarification. Lane B therefore has two independent sub-problems,
and fixing the classifier alone would not fix LC5.

Negative non-tax controls (`computer file`, `file a photo`, `police complaint`,
`spreadsheet file`, `Word file`) all currently REJECT. This is the baseline the Lane B
fix must not regress: adjacency must key on tax-filing **context and object**, never on
the word `file` alone.

### P1-R14-IR-003 — persistence (Lane C). Root cause confirmed in R14 code written by this executor.

`ask-handler.js:3366` (domain-boundary branch) sets `persistenceStatus` from
`_boundaryReceipt.status` but **never sets `persistenceReceipt`**. The R14 universal
wrapper injects only when `body.persistenceStatus == null`, so a pre-populated status
causes the wrapper to skip the body entirely — including receipt injection. Result:
`PERSISTED` with `persistenceReceipt: null` on all eight affected IDs.

This is a design error in R14, not an edge case: the wrapper's guard conflated *"status is
absent"* with *"persistence declaration is absent"*. R14 never tested a branch that
pre-populates status, which is why its own 21-test suite passed.

### P1-R14-IR-004 — journal not crash-visible. Confirmed by inspection of R14 `journal.mjs`.

`AttemptJournal.run()` builds the record in memory, executes `fn`, and calls `append()`
only afterwards. A `SIGKILL` during `fn` leaves **no** durable artifact. R14's contract
claimed the skeleton was "written to disk before the call is made"; the implementation
did not do this. The claim was false as written.

### P1-R14-IR-005 / IR-006 — governance sequence.

R14 COMMIT 1 froze one-file-per-attempt; COMMIT 2 changed the contract **and** shipped the
implementation **and** the evidence governed by it. R15 fixes the ordering by splitting
contract (COMMIT 1) from implementation (COMMIT 2) from pre-fix evidence (COMMIT 3).
R14 also deleted two failed gate logs; R15 preserves every attempt without exception.

---

## Lanes and commit mapping

| Lane | Findings | Commits |
|---|---|---|
| A semantic composition / action target | P1-R14-IR-001 | 1 (plan) → 4 (runtime) → 5 (evidence) |
| B tax adjacency / clarification | P1-R14-IR-002, P2-R14-IR-008 | 1 → 4 → 5 |
| C universal persistence receipt | P1-R14-IR-003 | 1 → 4 → 5 |
| D crash-visible governance evidence | P1-R14-IR-004/005/006/007, P2-R14-IR-009 | 1 (contract) → 2 (impl) → 3 (pre-fix) → 6 (gates) |

## Preserved historical record

R15 preserves as historically accurate and does not alter, delete, recreate or backdate:
the missing R13 COMMIT 3b attempt; the R14 journal freeze-sequence violation; the R14
non-crash-visible journal; the deleted R14 failed gate logs; the R14 false refusals; the
R14 `PERSISTED` records with null receipts; and the R14 governance classification
**NOT SUPERSEDED**. R15 seeks only prospective supersession through complete R15 evidence.
