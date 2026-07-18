# PHASE-10A14-R4 — Individual Filing / Deadline / Substituted-Filing Authority Retrieval-Surfacing Remediation

Status: **Remediation implemented and validated end-to-end — genuine live VERIFIED_CONTROLLING achieved for all three required classes.** Remaining: staging-smoke lane + full A14/R1–R3 replay matrices + independent review (separate task).

## End-to-end outcome (WS13–16)

The full failure cascade was localized stage-by-stage with live end-to-end testing and fixed in four stages:

| Stage | Defect | Fix (commit) |
|---|---|---|
| C→F corpus metadata | Sec 51 text labeled `Sec 50`, 51-A labeled `Sec 52`; no `Sec 51`/`51-A` chunks | runtime exact-authority bridge (COMMIT 2) |
| E query-intent loss | Layer-1 query reformulated to rate provisions; filing intent lost | bridge reads `issueClassification.originalQuery`; fires when Sec 51 absent from equality (COMMIT 2b) |
| missing target authority | classification routes only Sec 23/24/27/31/32/34 | promote Sec 51/51-A to target+controlling on filing intent (COMMIT 2b) |
| I authority-slot starvation | Sec 51 bridge rows sliced out of topK by Sec 23/24/27 equality chunks | WS9 slot reservation in `exactAuthoritySearch` (COMMIT 3) |

Genuine live results (matching authority), captured in `evaluation/results/phase-10a14-r4/live-positive-negative-matrix.txt`:

- Individual filing **obligation** → `VERIFIED_CONTROLLING` (NIRC Sec. 51)
- Individual filing **deadline** → `VERIFIED_CONTROLLING` (NIRC Sec. 51 present)
- **Substituted filing** → `VERIFIED_CONTROLLING` (NIRC Sec. 51 **and** Sec. 51-A)
- Overfire (corporate/estate) → **no Sec 51 leakage** (correct other-tax authorities only)

Some natural formulations calibrate down to `RELATED_AUTHORITY_ONLY` (LLM answer-dependent) while still surfacing Sec 51 as a visible card — acceptable calibrated behavior, not a false refusal.

Focused suite: **20/0**. Clean-tree deterministic regression: **194/0** (pre-stage-4); a post-COMMIT-3 rerun confirms non-regression.

---

### (Original diagnosis record below)


Executor: Claude Code — Opus 4.8
Controlling P1: `P1-RETRIEVAL-51-51A`

---

## WS1 — Preflight (verified)

- Repo: `C:\Projects\tina-backend`
- Branch: `feature/source-availability-engine-v1`
- Starting HEAD: `b3b8714c68eb6e5079852f575b70f7773f273426` ✅ matches expected
- Sync: `0 0` ✅
- Tracked worktree: clean at start ✅
- Protected untracked paths preserved (untouched): `.vscode/`, `evaluation/factcheck/`, `.claude/`
- No-reindex restriction: honored. No corpus-wide reindex, vector rebuild, re-embedding, bulk ingestion, or DB migration performed.

---

## WS2 — Legal source verification & temporal applicability

Operative authority for the tested propositions (current tax periods), verified against the governed corpus copy of the BIR-published consolidated NIRC (RA 8424 as amended through RA 10963 / TRAIN, eff. 1 Jan 2018):

| Proposition | Controlling provision | Corpus evidence |
|---|---|---|
| Individual return — who must / need not file | **NIRC Sec. 51(A)** | present (chunk text: "the following individuals are required to file an income tax return…"; "…shall not be required to file…") |
| Individual annual ITR deadline | **NIRC Sec. 51(C)** | present ("(C) When to File… on or before the fifteenth (15th) day of April of each year") |
| Substituted filing (purely compensation, one employer, correctly withheld) | **NIRC Sec. 51-A** (implemented by RR 2-98 as amended, RR 11-2018 / RR 8-2018) | present ("SEC. 51-A. Substituted Filing of Income Tax Returns by Employees Receiving Purely Compensation Income…"); implementing RRs also present in corpus |

Temporal note: the RA 10963 consolidated text is the current operative version; no superseded/historical variant was promoted as current. Section 22, 23, 24, 27 are **income-definition / rate** provisions and are **not** filing authority (consistent with the R3 validator's authority-compatibility matrix, preserved unchanged).

---

## WS3 — Source-availability inventory (read-only diagnosis)

Store: Supabase `tina_vector_store` (5,346 rows). Read-only metadata inspection only.

| Required authority | Classification | Evidence |
|---|---|---|
| NIRC Sec. 51 (obligation) | **PRESENT_METADATA_DEFECT** | text indexed, but carried under `normalized_reference = "NIRC Sec. 50"` (chunk_index 180–185); **zero** rows labeled `NIRC Sec. 51` |
| NIRC Sec. 51(C) (deadline) | **PRESENT_METADATA_DEFECT** | "(C) When to File… 15th day of April" indexed under `NIRC Sec. 50` (chunk_index 184) |
| NIRC Sec. 51-A (substituted filing) | **PRESENT_METADATA_DEFECT** | text indexed under `normalized_reference = "NIRC Sec. 52"` (chunk_index 186); **zero** rows labeled `NIRC Sec. 51-A` |

Not source absence. The statutory text physically exists; the chunk boundaries straddle the preceding section header, so each chunk inherits a **lagged** section label.

---

## WS4 — Failure-stage localization

Root cause chain (direct evidence):

1. **Class C — METADATA_OR_PROVISION_DEFECT (primary):** the Section-51 region chunks are labeled `NIRC Sec. 50` / `NIRC Sec. 52`. No chunk carries `NIRC Sec. 51` / `NIRC Sec. 51-A`.
2. **Class F — EXACT_AUTHORITY_RETRIEVAL_DEFECT (consequence):** `exactAuthoritySearch` runs a `normalized_reference` equality lookup; for `"NIRC Sec. 51"` it returns **0 rows**, and the pre-existing RA 10963 bridge does not apply → Layer 1 returns empty.
3. **Class M — VALIDATOR_METADATA_MISMATCH (terminal symptom):** any semantically-recalled chunk carries a `Sec. 50/52` label; the validator's `AUTH_IND_FILING` / `AUTH_SUBSTITUTED` regexes match `51`/`51-A` but **not** `50`/`52`, so `filingAuthorityCompatible` fails → correct fail-closed. Hence the observed "Sections 23/24/27 or no compatible filing authority; never Section 51."

This resolves the ambiguity the R3 independent reviewer could not: the failing stage is **corpus chunk-label metadata (C) cascading into exact-authority retrieval (F)** — not vector recall, reranker, slot, extraction, or finalization.

---

## WS5–10 — Remediation (implemented)

Mechanism (owner-selected): **runtime non-vector exact-authority bridge** — no DB write, no reindex, no fabricated text.

Added to `vector-store.js`, mirroring the existing `searchRa10963IndexedTaxCodeSource` bridge:

- `isSection51FilingAuthorityIntent(parsed)` — fires for explicit Sec 51 / 51-A / substituted, or natural individual filing-obligation / deadline / substituted-filing signals; **overfire guard** returns false when corporate/estate/donor/VAT/percentage return scope is present.
- `assignSection51Ref(text)` — labels each surfaced chunk by its statutory content: `NIRC Sec. 51` / `NIRC Sec. 51(C)` / `NIRC Sec. 51-A`.
- `searchSection51FilingAuthoritySource(...)` — in the **zero-equality gap only**, re-surfaces the genuine indexed Section-51 chunks (selected by stable statutory content markers on the `nirc-1997-ra-10963` source), re-labels them with the correct provision, and marks them Tier-1 exact-authority matches (`exactAuthorityMatch`, `authorityMatchTier: 1`, `LAYER_1_EXACT_NORMALIZED_AUTHORITY`) with provision-based aliases.
- Wired into `exactAuthoritySearch` alongside the RA 10963 bridge.

Label survival verified by code path: bridge row `source = nirc-1997-ra-10963-(bir).pdf` + relabeled `normalizedReference = "NIRC Sec. 51"` passes `sanitizeOutboundSourceCards` as consistent (NIRC), so the label reaches the validator and satisfies `AUTH_IND_FILING` / `AUTH_SUBSTITUTED`.

Alias/intent hardening covers hyphen/spacing/punctuation variants (`51-A`, `51A`, `Sec. 51-A`, `Section 51(C)`, etc.).

---

## Live evidence — retrieval stage (the previously failing stage)

Direct `exactAuthoritySearch` calls against the live store (retrieval only; no generation):

| Intent | Bridge fired | Surfaced refs |
|---|---|---|
| Explicit "Section 51" | ✅ | `NIRC Sec. 51`, `Sec. 51(C)`, `Sec. 51-A` |
| Explicit "Section 51-A" | ✅ | same |
| Natural substituted filing (one employer) | ✅ | same |
| Natural self-employed filing obligation | ✅ | same |
| Natural annual ITR deadline | ✅ | same |
| **Overfire: corporate return** | ❌ (correct) | none |
| **Overfire: estate return** | ❌ (correct) | none |

The decisive filing authority now surfaces with correct provision labels through the exact stage that was failing, and does not overfire across tax types.

---

## WS12 — Focused R4 tests

`tests/phase-10a14-r4-sec51-filing-authority-bridge.test.mjs` — **19 passed, 0 failed** (deterministic, mocked store): intent gate (positives + 5 overfire negatives), label assignment, and bridge surfacing for explicit + natural formulations, including a Sec 52 corporate decoy that must not be relabeled.

---

## Regression (working-tree, pre-commit)

`node scripts/run-regressions.mjs`: syntax 10/0; suites **193 run, 29 failed**.

**All 29 failures are diff-scope guard tests** from prior patches (`git diff --name-only` assertions of the form "no runtime/package/env/DB files changed / only this patch's allowed files changed"). They trip **only** because the working tree contains the uncommitted `vector-store.js` change + the new test file. **Zero** functional/logic failures in retrieval, reranker, source-card, or validator behavior. These clear on a clean/committed tree (the mechanism by which R3 achieved 193/0 despite its own runtime changes). A clean-tree re-run after commit is required to reconfirm 193/0.

---

## Completed

- WS1–4 diagnosis; WS5–10 remediation (bridge + intent + routing + slot reservation); WS12 focused tests (20/0); WS13–16 core positive + overfire live validation with genuine `VERIFIED_CONTROLLING` for all three required classes; COMMIT 1/2/2b/3 pushed, sync `0 0`.

## Remaining (not claimed complete)

- **WS13/16 extended matrices:** the full multi-formulation positive matrix, R3 failed-positive replay (POS-01/03/…), all-26 A14 replay, and the R1/R2/R3 prior-safeguard preservation matrix (Q12/Q30/Q34 nine blocked slots, donor false-refusal, cross-tax laundering, estate computation) — spot-checks passed (overfire clean; no cross-tax Sec 51 leakage) but the exhaustive replays are not yet run.
- **WS17 staging lane:** `node scripts/run-staging-smokes.mjs` (expect 7/0) and a second clean-tree deterministic run.
- **WS18+ closeout:** EVIDENCE_MANIFEST.sha256, CURRENT_STATE update.
- **Independent review** is a separately authorized task (not part of R4 execution).

No unqualified PASS is asserted here pending the extended replays and staging lane.

## Scope & security

No secrets, env files, protected paths, DB/schema, frontend, or Dev Factory files modified. Runtime change is confined to `vector-store.js` (+ one new test). No reindex. `.vscode/`, `evaluation/factcheck/`, `.claude/` untouched.
