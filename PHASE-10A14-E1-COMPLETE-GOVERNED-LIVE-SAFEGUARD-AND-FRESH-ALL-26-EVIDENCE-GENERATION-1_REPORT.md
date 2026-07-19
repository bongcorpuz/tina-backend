# PHASE-10A14-E1 — Complete Governed Live Safeguard & Fresh All-26 Evidence Generation 1

**Executor:** Claude Code — Opus 4.8 (low speed) · evidence-only
**Repository:** `C:\Projects\tina-backend` · branch `feature/source-availability-engine-v1`
**Starting HEAD:** `893820600ec2cb58c939817f0a04f8dc4afff4c3` (matches expected) · sync `0 0`
**Reviewed R8 runtime:** `79be634…` — staging deployed commit `893820600…`, runtime files **byte-identical** to R8 (diff is evidence-only).
**Model:** `gpt-4o-mini` · **Corpus:** `tina_vector_store` (5346 chunks) · **NODE_ENV:** staging

## Decision: **REVISIONS REQUIRED** (evidence-only; no remediation performed)
Two release-blocking P1 trust/legal defects were surfaced by genuine live evidence. Per governance
("LIVE EVIDENCE > THEORY > CLAIMS"; no CONDITIONAL/EVIDENCE PASS), no PASS is claimed.

## What was executed
- **WS1 preflight & runtime hash-lock** — HEAD/ancestry/sync/clean-tree verified; staging commit + corpus (5346) +
  model (gpt-4o-mini) confirmed via authenticated `/debug/db-identity`; runtime hashes match R8.
- **WS2–WS5** — canonical prior-probe inventory, frozen `E1_PRE_EXECUTION_MANIFEST.json` (**115 probes**:
  26 all-26 live + 29 main positive + 60 R1–R8 safeguards), plans, and a checkpointed evidence-only harness.
  Committed + pushed **before the first matrix call** (COMMIT 1).
- **WS6/WS7/WS9 live matrix** — **115/115 probes executed, 0 technical failures, 0 retries**. Trust:
  29 VERIFIED_CONTROLLING · 69 RELATED_AUTHORITY_ONLY · 12 NO_VERIFIED_AUTHORITY · 5 NOT_APPLICABLE.
- **WS8 deterministic all-26** — **9 blocked / 17 preserved / 0 mismatch** (Q12/Q30/Q34 ×3 block at
  proposition-source-sufficiency; Q3/Q47 no overfire; Q32 eligible).
- **WS10** — every VERIFIED_CONTROLLING answer adjudicated individually (29/29, no sampling): **24 VALID**,
  **5 QUESTIONABLE/OVER-VERIFIED**.
- **WS11** — false-refusal review: **material false refusal = 0**; donor false refusal = 0.
- **WS12** — persistence & history consistency: **10/10 cases consistent, 0 mismatches**.
- **WS13** — reconciliation: payloads = runlog = manifest = **115**; all counts/hashes agree.

## Findings
| ID | Sev | Summary |
|---|---|---|
| P1-E1-001 | P1 | `SG-C-LASTDAY` verified a fabricated *"today is the last day"* deadline (over-verification). |
| P1-E1-002 | P1 | `ALL26-Q12-r1/r2/r3` + `SG-A-Q12REV` verified a filing conclusion laundered from the Sec 24 rate/exemption threshold (questionable verified ×4). |
| P2-E1-003 | P2 | Model variability in positive reachability (supported classes remain reachable). |
| P2-E1-004 | P2 | RA 12214 (2025) not indexed; Section 51(C)(2) post-effectivity positives cannot verify (fail-closed; deferred to ingestion). |

**Clean:** deterministic all-26 (9/17); RA 12214 premature application = 0; cross-tax laundering = 0; outcome
prediction verified = 0; accessor exec/exception/verified = 0/0/0; model-validator override = 0; persistence
consistency proven; required positive classes (filing obligation / deadline / substituted filing) all reachable
with VALID verifieds.

## Why REVISIONS REQUIRED
PASS requires `over-verified = 0` and `questionable verified = 0`. P1-E1-001 and P1-E1-002 violate these.
All other PASS criteria are met. These are runtime behaviors for a future remediation task (out of E1's
evidence-only scope), not E1 defects.

## Gates & scope
Deterministic **198/0 ×2** (clean tree); staging **7/0 ×2**. No runtime/test/model/prompt/retrieval/validator
change; app-layer synthetic persistence only; no vector/DB/corpus/production change; protected paths preserved;
port 5173 untouched; sync `0 0`. See `WS15_SECURITY_AND_SCOPE.md`.

## Next task
PHASE-10A14-E1-…-INDEPENDENT-REVIEW-1 (Codex GPT-5, high reasoning, low speed). The E1 reviewer must not execute E1.
