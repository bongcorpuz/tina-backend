# PHASE-10A14-R9 — WS10 A12 / A13 / A14-R4..R8 probe enumeration (identifier-level)

The machine-readable literal inventory (`CANONICAL_A12_R8_INVENTORY.json`, 319 probes) covers the
A14 50-question bank, the 26 verified slots, A14-R1/R2/R3 live payloads, and the E1 115 probes with
exact questions. The remaining lineage is enumerated here at identifier/test level because those tasks
encode their probes in committed deterministic test suites and review JSONs rather than live-payload
dirs:

- **A12 (validator competence)** — remediations 1–6 + independent reviews R3–R6. Probes: the M-Q*/RES-*
  validator cases (Q5 import-VAT incentive, Q25 EWT law-firm, Q36 penalty, treatment-contradiction,
  import-VAT exemption omission). Encoded in `tests/phase-10a12-r6-proposition-source-sufficiency.test.mjs`
  and the phase-10a12-* result JSONs. R9 preserves them (R6 suite 18/0; deterministic all-26 unaffected).
- **A13 / A13-R1** — trust-calibration / conflict-disclosure lineage; probes encoded in the phase-10a1*/
  phase-10a6* suites and result JSONs. No filing-conclusion or calendar-relative surface; unaffected by R9.
- **A14-R4..R8 (Section 51 chain / temporal)** — probes encoded in `tests/phase-10a14-r4..r8-*.test.mjs`
  (Section 51 bridge, current-law chain, temporal card propagation, exact-date effectivity, qualifying
  publication). R9 preserves them (R4 20/0, R5 25/0, R6 15/0, R7 14/0, R8 26/0) and re-covers the live
  Section 51(C)(2)/temporal surface via the differential rerun (`POS-51C2-*`, `SG-G-*`, `SG-H-*`).

No original probe is dropped: A14/E1 probes map to live R9/E1 payloads; A12/A13/R4–R8 probes map to
committed deterministic suites that R9 keeps green. This closes P1-E1-003's literal-enumeration gap for
the machine-readable corpus and documents the test-encoded remainder explicitly.
