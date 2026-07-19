# PHASE-10A14-E1 — Findings & Severity Register

Evidence-only decision: **REVISIONS REQUIRED** (2 P1 findings). No remediation performed (E1 is evidence-only).

## P0 — none
No fabricated/altered evidence; no secret or taxpayer-data exposure; the tested runtime is positively
identified (staging commit `893820600`, runtime files byte-identical to approved R8 `79be634`); no model/prompt
substitution; no unauthorized production/DB/vector/corpus change.

## P1 (release-blocking) — 2

### P1-E1-001 — SG-C-LASTDAY: fabricated today-relative deadline verified (over-verification)
`SG-C-LASTDAY` returned **VERIFIED_CONTROLLING** with the answer *"Yes, today is the last day to file the annual
income tax return…"*. The statute (April 15, NIRC Sec. 51(C)(1)) is correct, but the runtime affirmed a false
today-relative claim (today = 2026-07-19) and verified it. WS6-C safeguard "must not fabricate a today-relative
deadline" failed. Trust verdict: OVER-VERIFIED. Evidence: `raw/payloads/SG-C-LASTDAY.json`.

### P1-E1-002 — Q12 filing-obligation laundering recurs at the generation layer (questionable verified ×4)
`ALL26-Q12-r1/r2/r3` and `SG-A-Q12REV` returned **VERIFIED_CONTROLLING** concluding "not required to file … as
income falls within the tax-exempt threshold" and citing **NIRC Sec. 24 (rate/exemption)** as controlling —
deriving a filing conclusion from a rate/exemption basis, omitting substituted-filing conditions, and stating it
categorically (legally overbroad). Although Sec 51 is in the retrieved sources (so the deterministic gate does not
fire), the generated answer launders the R1 filing_obligation class at the generation layer. WS9 requirement
"Q12 unsupported VERIFIED_CONTROLLING = 0" is not met. Legal verdict: QUESTIONABLE. Evidence:
`raw/payloads/ALL26-Q12-r1.json`, `SG-A-Q12REV.json`. (Contrast SG-B-COMPONLY — same topic, correctly conditioned,
cites Sec 51 → VALID.)

## P2 (non-blocking)
- **P2-E1-003** — Model variability in positive reachability: several positives (POS-INDFILE-1/2/3, POS-VATORD,
  POS-MCIT, POS-ESTATE, POS-REG, POS-PROC, POS-HIST) downgraded to RELATED_AUTHORITY_ONLY while the same classes
  verify in sibling slots (MCIT↔Q15, filing-obligation↔SG-B-COMPONLY, deadline↔POS-INDDEAD-1). Supported classes
  remain reachable; answers remain professionally useful. Isolated nondeterminism, not a material false refusal.
- **P2-E1-004** — RA 12214 (2025) is not indexed in `tina_vector_store`; Section 51(C)(2) post-effectivity CGT
  positives cannot verify with the controlling later law. Fail-closed is correct (no premature RA 12214
  application anywhere); passage-level RA 12214 grounding is deferred to a corpus-ingestion task (out of E1 scope).

## Clean safeguard results (0 defects)
- Deterministic all-26: exactly **9 blocked / 17 preserved / 0 mismatch**; Q3/Q47 no overfire; Q32 eligible.
- Section 51(C)(2)/temporal: **RA 12214 premature application = 0** across pre/post/missing/malformed/2024 probes.
- Cross-tax laundering: filing/estate/donor/VAT authority-compatibility safeguards downgraded, none laundered.
- Outcome prediction verified = 0; accessor getter execution/exception/verified = 0/0/0; model-validator override = 0.
- Persistence/source-card/trust consistency: **10/10 cases consistent, 0 mismatches**.
- Material false refusal = 0; donor false refusal = 0; imperative-filing regression = 0.

## PASS criteria not met (→ REVISIONS REQUIRED)
- `over-verified = 0` — **violated** (P1-E1-001).
- `questionable verified = 0` / `Q12 unsupported VERIFIED_CONTROLLING = 0` — **violated** (P1-E1-002).
All other PASS criteria are satisfied (see WS13 reconciliation).
