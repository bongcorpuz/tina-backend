# PHASE-10A14-R16 — FROZEN SCOPE, PLAN AND VERIFIED ROOT CAUSES

Controlling independent review: `aa0550753d1a0a988503123b6bca853a2c193bac` — **REVISIONS REQUIRED**, governance **NOT SUPERSEDED** (P1×5, P2×3, P3×0)
R15 independent-review base: `721d8546b3b819e45dbc6baa4d4a87e878193026`
R15 final runtime (unchanged and inherited): `c38a073b814559d9e02139fcb7c61e310e46bc21`
Runtime model: `gpt-4o-mini` — unchanged, as are temperature, routing and provider config.

## Preflight (verified before this commit)

| Check | Result |
|---|---|
| Path / branch | `C:\Projects\tina-backend` · `feature/source-availability-engine-v1` |
| HEAD | `aa055075…` — exactly the independent-review commit |
| Sync | `0 0` |
| Tracked worktree | clean |
| Untracked | only `.vscode/`, `evaluation/factcheck/` (protected) |
| `721d8546` / `c38a073b` ancestors | yes |
| Runtime changed since R15 final runtime | none |
| Historical evidence changed since IR commit | none |
| Backend listener | none |

Pre-change hashes of all candidate files: `R16_PRE_CHANGE_HASHES.json`.

---

## Verified root causes (reproduced before any change)

### P1-R15-IR-001 + P1-R15-IR-002 — one shared root cause

Reproduced standalone: the R15 journal suite exits **13** with
`Detected unsettled top-level await` at line 85 (`await Promise.all([...])`).

Reproduced with an independent harness:

| kill point | ready | alive before kill | `kill()` returned | exit |
|---|---|---|---|---|
| after-allocated | true | true | **true** | `code:null, signal:SIGKILL` |
| after-started | true | true | **true** | `code:null, signal:SIGKILL` |
| **during-call** | true | true | **false** | **`code:0, signal:null`** |

Mechanism, confirmed in `evaluation/results/phase-10a14-r15/journal-crash-victim.mjs`:

1. `journal.run(...)` is invoked **without `await`**, so nothing holds the top-level alive.
2. The governed callback awaits `new Promise(() => {})`, which registers **no event-loop
   handle**. A pending promise alone does not keep Node running.
3. The event loop therefore drains and the process exits **normally, code 0**, before the
   parent issues the kill — so `child.kill("SIGKILL")` returns `false`.
4. In the parent, `await new Promise((r) => child.on("exit", r))` attaches its listener
   **after** the child has already exited, so `exit` never fires again and that promise
   never settles. That is the unsettled top-level await, and hence exit 13.

So IR-001 and IR-002 are the **same defect** observed from two ends. This is a
harness/victim defect: the journal's own allocation/started writes are correct and are
proven real by the two kill points that do work.

A third, separate defect in the same victim: it calls `journal.markStarted` on an outer
attempt and then `journal.run(probeId + "-inner", …)`, creating an **extra outer attempt**.
The authorization forbids this.

### P1-R15-IR-003 — non-tax false allows

Reproduced. Both independent probes ALLOW via `tax_keyword_match`, and a third
near-neighbour does too:

| probe | decision | reason |
|---|---|---|
| private lease payment / weekend deadline | **ALLOW** | `tax_keyword_match` |
| court filing deadline / holiday | **ALLOW** | `tax_keyword_match` |
| labor case filing deadline | **ALLOW** | `tax_keyword_match` |

Keyword-level cause, isolated:

- *"For a **pri·vat·e** lease payment…"* → matched keyword **`vat`**. `isTaxRelated`
  performs a raw `normalizedQuestion.includes(keyword)` with **no word boundary**, so
  `vat` matches inside `private`.
- *"court **filing deadline**…"* and *"**filing** a labor case"* → matched `filing`,
  `deadline` — generic compliance words carrying no Philippine-tax anchor.

**Scope decision — `tax-keywords.js` will NOT be modified.** The authorization permits it
only if a boundary-only fix cannot be correct. A boundary-only fix *is* correct here:
`isTaxRelated` is also consumed by `tax-classifier.js`, so changing its semantics has
blast radius beyond the domain boundary and beyond the five findings. The correct, narrow
fix is to stop treating a bare `isTaxRelated` hit as sufficient proof of tax domain, and
instead gate it inside the boundary with a strong/weak signal model that applies word
boundaries. The substring behaviour of `isTaxRelated` is therefore *contained* rather than
altered, and is recorded here as an observed characteristic.

Verified unaffected by the planned fix: the strong-tax controls
(`BIR filing deadline…`, `CTA deadline for appealing an FDDA`, `withholding tax on the
private lease payment`) already ALLOW at step 3 via `PH_TAX_ALLOW_PATTERNS`, before
`isTaxRelated` is consulted. The seven R15 false-refusal probes ALLOW via
`tax_filing_adjacency` at step 4b, also independent of `isTaxRelated`.

---

## Exact file allowlist (frozen)

R16 may modify only:

1. `services/philippine-tax-domain-boundary.js` — gate the weak-signal path.
2. `services/philippine-tax-boundary-patterns.js` — strong/weak/non-tax signal tables.
3. `tests/phase-10a14-r15-crash-visible-attempt-journal.test.mjs` — suite reliability.
4. New under `evaluation/results/phase-10a14-r16/` — R16 crash victim, evidence-capture
   tooling, canonical-registry tooling, runners, reports, evidence.
5. New focused R16 test files under `tests/`.
6. `knowledge/CURRENT_STATE.md`, the R16 report and result JSON.

**Explicitly NOT modified:** `tax-keywords.js`, `tax-classifier.js`, `ask-handler.js`,
`services/answer-support-validator.js`, `scripts/run-regressions.mjs` (the runner
auto-discovers `tests/*.test.mjs`, so no registration change is needed), and every R13/R14/R15
historical evidence artifact including the R15 journal victim and the stale R15 manifest.

---

## Lane mapping

| Lane | Findings | Commits |
|---|---|---|
| A — during-call kill + suite reliability | P1-R15-IR-001, P1-R15-IR-002 | 3 (repro) → 4 (fix) → 6 |
| B — non-tax domain boundary | P1-R15-IR-003 | 3 → 5 → 6 |
| C — immutable evidence + canonical accounting | P1-R15-IR-004, P1-R15-IR-005 | 1 (contract) → 2 (tooling) → 7 → 8 |
| D — historical errata | P2-R15-IR-006/007/008 | 3 → 8 |

## Preserved historical record

R15 remains historically **REVISIONS REQUIRED** and **NOT SUPERSEDED**, with an
inconsistent formal gate count, a mid-execution archive amendment, a stale pre-fix
manifest and a corrected protected-path violation. R16 rewrites none of it and seeks only
prospective governance sufficiency under its own frozen, unamended contract.
