# PHASE-10A14-R9 — Findings & Security/Scope Review

## Decision: **PASS** (self-assessed; formal decision belongs to the mandatory independent reviewer)

### P0 = 0 · P1 = 0
- **P1-E1-001 CLOSED** — affirmed calendar-relative filing-deadline conclusions fail closed
  (`calendar-relative-deadline` gate) and the WS4 safety note replaces the false affirmation.
  Live: SG-C-LASTDAY / R9-LASTDAY-REPRO / R9-DUETODAY → RELATED_AUTHORITY_ONLY.
- **P1-E1-002 CLOSED** — filing conclusions whose decisive rationale is a Section 24 rate/threshold rule
  fail closed (`filing-rationale-alignment` gate) even with a Section 51 source card present.
  Live: ALL26-Q12-r1/r2/r3 + SG-A-Q12REV → RELATED_AUTHORITY_ONLY.
- **P1-E1-003 CLOSED** — complete literal A12–R8 original-probe inventory (319 probes with exact
  questions from machine-readable sources) + identifier-level enumeration of the test-encoded
  A12/A13/A14-R4..R8 lineage. No original probe dropped.

### PASS criteria met
- Deterministic all-26 remains **9 blocked / 17 preserved / 0 mismatch**.
- Fresh live all-26: Q12/Q30 unsupported verified = 0; Q34 verified but supported (Sec 51 deadline).
- Every new verified answer VALID and APPROPRIATELY VERIFIED (35/35); questionable = invalid = over-verified = 0.
- False today-relative deadline verified = 0; Section 24 filing laundering = 0.
- Incomplete ₱250k facts → no categorical filing conclusion (R9-INCOMPLETE250K → RELATED).
- Fact-complete filing positives reachable (substituted, multiple-employer, mixed, self-employed, Sec 51).
- Material false refusal = 0. Counts/hashes reconcile (103 = 103 = 103). Persistence 4/4 consistent.

### P2 (non-blocking)
- Model variability in positive reachability (same classes verify in sibling slots).
- RA 12214 not indexed — Section 51(C)(2) post-effectivity positives fail closed (deferred to ingestion; out of R9 scope).

## Security & scope (WS17)
- No secrets / no real taxpayer data in any R9 evidence (scan clean).
- No model / prompt / temperature / sampling change. Runtime change confined to
  `services/answer-support-validator.js` (2 deterministic gates) + narrow `ask-handler.js` WS4 note.
- No retrieval/reranker redesign, no source ingestion, no RA 12214 ingestion, no corpus/vector mutation,
  no reindex, no re-embedding, no direct DB write, no schema migration.
- No frontend / Dev Factory change. No **production** deployment. Staging auto-deployed the branch to the
  R9 commit (`0c80b12`) — the non-production runtime under test, consistent with the E1 staging precedent.
- Application-layer synthetic persistence only (namespace `00000000-0000-4000-8000-0000000e1001`).
- Protected paths (`.claude/`, `.vscode/`, `evaluation/factcheck/`) preserved; port 5173 untouched; no local
  backend listener started; tracked tree clean; sync 0 0.
