# PHASE-10A14-R17 — FROZEN PASS CRITERIA

Self-assess **PASS** only where every criterion holds. Any material failure yields
**REVISIONS REQUIRED**. Conditional PASS language is prohibited.

## Domain (P1-R16-IR-003)

- all 30 customs strong-tax controls ALLOW, including the three exact independent-review
  failures;
- all 30 capital-gain strong-tax controls ALLOW, including the exact phase-10a8 F14
  question;
- all 30 private-contract non-tax controls do **not** ALLOW;
- all 30 court / labor / SEC controls do **not** ALLOW;
- all 30 weak-generic ambiguity controls do **not** falsely ALLOW;
- all 30 Filipino / Taglish controls match their frozen expectation;
- all 20 substring traps match, with `vat`-inside-`private` style traps closed;
- all 40 metamorphic rows (20 pairs) hold;
- the 7 prior named false-refusal probes remain ALLOW;
- the broader 10-case adjacency family remains ALLOW;
- the 10 explicit non-tax controls remain NOT ALLOW;
- **material false tax ALLOW = 0**;
- **material tax false refusal = 0**;
- the fix is category-based, **not** exact-question hardcoding.

## Deterministic gate (P1-R16-IR-001)

- `phase-10a8-trust-calibration-and-answer-correctness-remediation-1` passes, closing via
  the domain correction, with its expectation **unweakened**;
- `patch-07b-clarification-final-gate-1-track-closure` passes, and remains a meaningful
  scope guard: all markers, allowlists and protected patterns unchanged, and it still
  fails on unauthorized prompt, route, retrieval, reranker, source-card,
  sourceAvailability, DB, vector, indexing, frontend, memory-activation and orchestrator
  changes;
- deterministic cycle 1 exit **0**, syntax 10/0, zero failed suites;
- deterministic cycle 2 exit **0**, syntax 10/0, zero failed suites.

## Staging gate (P1-R16-IR-002)

- the phase-09r failure is classified as exactly one of the six permitted categories, with
  raw evidence;
- no outage is presented as a PASS;
- runtime is **not** patched unless a runtime regression is independently demonstrated;
- staging cycle 1: 7 suites, 0 failed, exit 0;
- staging cycle 2: 7 suites, 0 failed, exit 0;
- staging reachable, identity stable within each cycle, no mixed deployment.

## Provenance (P1-R16-IR-006)

- every controlling SHA is 40 hex, exists as a Git object, is type `commit`, resolves in
  this repository, and satisfies the required ancestry;
- the fabricated SHA `a802064a1b32e8a68a0b8c4dd1f8a1b0c9a5e2f7` is **detected**;
- attempts with invalid provenance are non-controlling;
- registry integrity cannot report clean while a controlling SHA is false.

## Recovery disposition (P1-R16-IR-004)

- recovery adjudication controls registry disposition, overriding raw terminal status;
- the R16 corrupted partial import is re-adjudicated **non-controlling** in the R17 layer;
- corruption is detectable in non-JSON files (NUL bytes, all-whitespace, zero-length);
- no corrupt or invalid evidence is counted as clean controlling evidence.

## Retry linkage (P1-R16-IR-005)

- every retry has a valid `retryOf` pointing at an existing prior attempt;
- unlinked reruns are **not** counted or described as retries;
- retry cycles are rejected;
- the retry ceiling (one attempt plus two linked technical retries per required cycle on
  an unchanged runtime) is computed **only** from valid links;
- retry counts in every report are truthful.

## Regression preservation

- journal suite: 5 standalone cycles and 3 concurrent cycles pass;
- real during-call SIGKILL preserved (`killReturned` true, `code` null, `signal` SIGKILL,
  allocated and started survive, no terminal event);
- R16 domain and tooling suites, R15 focused, R14, R13, R12, R11, R10, R9 all pass;
- deterministic all-26 remains 9 blocked / 17 preserved / 0 mismatch, run in a
  **non-mutating** mode that does not write into protected historical E1 evidence.

## Governance and hygiene

- counts in report, result JSON, CURRENT_STATE and summaries all derive from
  `CANONICAL_ATTEMPT_REGISTRY.json`; no manually typed competing total;
- no protected path in any R17 commit, verified by the index check before every commit;
- no historical R13/R14/R15/R16 evidence modified;
- final tracked tree clean; only protected untracked paths; sync `0 0`;
- no backend listener; port 5173 untouched.

## Governance statements

Report all three separately:

```
R15 historical governance: NOT SUPERSEDED
R16 prospective governance: NOT SATISFIED
R17 prospective governance: SATISFIED | NOT SATISFIED
```

`SATISFIED` only where every criterion above passes.
