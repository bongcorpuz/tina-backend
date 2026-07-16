# PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-5 — REPORT

**Model:** Claude Code — Opus 4.8 — Low speed.
**Governance:** LIVE EVIDENCE > THEORY > PATCH.
**Runner-fix commit:** `272d6bf`. **Freeze commit = runtime commit:** `cd046304111d26a439c4c37321881524acd41eb6`.
**Decision:** PHASE 10A12-R5 REVISIONS REQUIRED (authorized deliverables complete; live audit surfaced one P1 invalid verified).

Prospective only. Does NOT retroactively validate A12-R3 or A12-R4. Does NOT authorize A13, the
adversarial suite, Phase 10A closure, Phase 10B/10C, production, reindexing, or a model change.

---

## Part B — run-regressions.mjs exit-1 remediation (no coverage weakened)

The runner is a discover-and-run-all aggregator; failures come from individual suites. Two
remediations, neither removing/weakening/bypassing/silently-skipping/making-non-blocking any
coverage:

1. **phase-09zf "git diff scope is reported"** — the assertion required `pipeline.js` and the
   09ZF fixture to appear in the WORKING TREE or LAST commit; that holds only in the 09ZF landing
   commit and is necessarily false once later commits land (the exit-1 cause). It was **re-anchored
   to the CURRENT, FAILABLE state**: it now fails if the 09ZF gate-ordering remediation is no
   longer present in `pipeline.js` (marker + `Step 12.65`) or the fixture is deleted. It is **not**
   pinned to a fixed historical commit (which would be an unfailable tautology) — proven failable
   against a simulated reverted pipeline. Behavioral coverage (gate-ordering markers, static
   ordering scan, allowed-file scope guard) is unchanged.

2. **Network-dependent staging-smoke suites** — 7 suites (`*staging-smoke*`) fail their final
   "PASS decision requires staging reachable" assertion when staging is transiently down, making
   the deterministic gate non-deterministic. They were **SEPARATED into a dedicated MANDATORY
   blocking lane** (`scripts/run-staging-smokes.mjs`, run via `node scripts/run-staging-smokes.mjs`)
   that exits non-zero on any failure. `run-regressions.mjs` prints an explicit mandatory-lane
   notice listing every separated suite. They are NOT removed, optional, skipped, or non-blocking.

**`package.json` was intentionally NOT modified** (governance-protected; forbidden by many gate
suites — an early attempt to add npm scripts tripped ~30 gates and was reverted).

**Results (clean working tree, runtime `cd04630`):**
- Deterministic gate: syntax 10/0, suites **188/0**, **exit 0**.
- Mandatory staging gate: **7/7**, **exit 0** (including `phase-09r`, which the independent review
  saw fail under a transient outage).
- Total coverage preserved: 188 + 7 = **195** suites (the same total the review counted), split
  across the two lanes; nothing removed. Logs: `deterministic-gate.log`, `staging-gate.log`.

## Part A — governed canonical mini-30 (immutable snapshot, frozen before live)

**Pre-R3 membership:** proven unestablishable (A12-R4). This is a NEW prospective governed set.

Committed and pushed **before any live run** (`cd04630`):
- **Immutable source-bank snapshot** — a verbatim byte-for-byte copy of the master Q1–Q50 bank
  (`source-bank-snapshot/...SNAPSHOT.md`), byte-identical (trailing whitespace preserved).
  `sourceBankSnapshotSha256 = 526106e594667705df227930dff3d9a4717ec99b171626bf708db43f4eac4bed`.
- **Per-question text hashes** for the entire bank (Q1–Q50) + the selected 30
  (`canonical-mini-set-hashes.sha256`).
- **Selection rationale** (`selection-rationale.md`) and **canonical manifest**
  (`canonical-mini-set-manifest.json`).
- Deterministic rule (independently validated A12-R4): exclude reserved cluster/control IDs
  `{5,8,28,32,34,35,41,46,47}`, sort eligible ascending, first 30 →
  `1,2,3,4,6,7,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,30,31,33,36`.
  `canonicalSetSha256 = 8e019480…` (identical to A12-R4 → rule reproduces exactly against the
  frozen snapshot).

**Fresh live rerun (30/30, runtime `cd04630`):** membership EXACT match to the frozen manifest,
0 runtime-stamp mismatches, 0 prompt mismatches, `persistence.count = 2` for all. Counts:
VERIFIED_CONTROLLING 6 + RELATED_AUTHORITY_ONLY 14 + NO_VERIFIED_AUTHORITY 10 = 30. (M-Q10
produced an intermittently degenerate header-only generation across attempts; the committed
payload is a substantive NO_VERIFIED_AUTHORITY response — safe, not verified.)

## Verified audit — one P1 invalid verified

6 verified: 5 VALID (M-Q1, M-Q3, M-Q12, M-Q15, M-Q25) + **1 INVALID (M-Q36)**.

**M-Q36 (P1 INVALID VERIFIED):** "What penalties apply to late filing of a VAT return?" received
VERIFIED_CONTROLLING for a **fabricated** penalty rule — "25% of the tax due **for each month** of
delay, not exceeding 50%". The 25% surcharge (NIRC Sec 248) is **one-time**, not monthly; the
per-period charge is 12% p.a. interest (Sec 249). The cited authorities are the general
VAT-imposition sections (105–108) + RR 16-2005 — **not** the penalty provisions. The gpt-4o-mini
validator wrongly approved it. Root cause: validator-competence limitation on penalty computations
+ a penalty-question citation-relevance gap; the Q5/Q8 deterministic guards are cluster-specific
and do not cover penalties. **Remediation (a deterministic penalty/procedural source-sufficiency
guard, analogous to the Q5 import-VAT incentive gate) is beyond the narrow R5 authorization** and
is carried to the next remediation.

## Reconciliation, security, architecture

`count-reconciliation.json`: 6 + 14 + 10 = 30; validVerified 5, invalidVerified 1 (M-Q36),
fabricatedAuthorities 0, falseRefusals 0, persistenceFailures 0. Security: clean
(`security-scan.md`) — `sanitizedConversationRef` only. `sourceExcerptGrounded = false`;
`guardArchitecture = CLUSTER_SPECIFIC_WITH_FAIL_CLOSED_SCHEMA`.

## Final severity

| Severity | Count | Notes |
|---|---:|---|
| P0 | 0 | — |
| P1 | 1 | **M-Q36 invalid verified** (fabricated penalty rule on non-penalty authority) surfaced by the governed live rerun. Requires a penalty-question source-sufficiency guard (not authorized under R5). |
| P2 | 5 | No full operative source-excerpt grounding; cluster-specific guard architecture; Q5/Q8 guards cluster-specific (do not cover penalties — the M-Q36 class); safe-under-claim precision; gpt-4o-mini validator limitation + latency. |
| P3 | 1 | Intermittent degenerate generation (M-Q10 header-only) + transient truncation requiring bounded retry. |

## Decision

**PHASE 10A12-R5 REVISIONS REQUIRED.** The authorized structural deliverables are COMPLETE:
the governed canonical mini-30 is frozen against an immutable source-bank snapshot with
per-question hashes committed+pushed before any live run; the 30 were rerun fresh with exact
membership/runtime match; and both regression lanes pass (deterministic 188/0, mandatory staging
7/7) with no coverage removed or weakened. But the authorized live rerun surfaced one **P1 invalid
verified (M-Q36)**, so the governed mini set is established-but-not-clean and cannot be claimed as
validated. Phase 10A remains open; A13, the adversarial suite, 10B/10C, production, reindexing, and
model changes remain not authorized.

## Exact next task

Remediate the M-Q36 penalty-question invalid-verified defect with a deterministic
penalty/procedural source-sufficiency guard, then rerun the governed 30; then an independent R5
review.
