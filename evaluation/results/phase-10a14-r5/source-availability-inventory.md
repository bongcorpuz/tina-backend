# PHASE-10A14-R5 — Source-Availability Inventory (WS4, read-only)

Store: Supabase `tina_vector_store` (5346 rows). Read-only metadata inspection only; no mutation.

| Authority | In governed corpus? | Classification | Evidence |
|---|---|---|---|
| NIRC Sec. 51 / 51(C) / 51-A (consolidated) | ✅ | PRESENT_AND_RETRIEVABLE (via R4 bridge) | text indexed under lagged labels `Sec 50`/`Sec 52`; R4 bridge re-labels + surfaces |
| RA 11976 (EOPT) standalone document | ❌ | ABSENT_FROM_GOVERNED_SOURCES (as its own doc) | `source ~ %11976%` → 0 rows; cited only in NIRC footnote appendix + one court case |
| RA 12214 (CMEPA) standalone document | ❌ | ABSENT_FROM_GOVERNED_SOURCES (as its own doc) | `source ~ %12214%` → 0 rows; cited only in NIRC footnote appendix |
| RA 11976 / 12214 **effects on Section 51** | ✅ (embedded) | PRESENT (consolidated text) | Section 51 body already carries EOPT manner-of-filing language and CMEPA-updated 51(C)(2) cross-references; footnote appendix (ci≈743, 767) cites both laws |

## Remediation-path decision
The three tested propositions (ordinary obligation, ordinary Apr-15 deadline, substituted filing) are supported by the **already-consolidated** Section 51 text — no new source ingestion is required for them, and their operative rules are unchanged by RA 11976/12214.

Per WS4 preferred order, remediation uses:
- (2) exact-authority alias/routing preservation, and
- (3) a **narrow non-vector governed derived object** — `section51-authority-chain.js` — that links the official amendment identifiers (RA 8424/10963/11976/12214, with lawphil/OG/BIR canonical URLs) to each proposition, clearly labeled as a governed amendment-chain view (NOT an official consolidated statute).

**No broad reindex, DB write, or vector mutation is required or performed.** Where a proposition needs a later amendment as controlling (51(C)(2) → RA 12214), the derived object supplies the official RA 12214 identifier + URL for source-card presentation; the temporal-sufficiency gate requires it before VERIFIED_CONTROLLING for that sub-proposition.

`REQUIRES_SEPARATE_REINDEX_OR_DATABASE_AUTHORIZATION` is **not** triggered — the three tested propositions are fully supportable within the existing governed architecture.
