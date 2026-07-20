# PHASE-10A14-R15 — FROZEN PASS CRITERIA

R15 may self-assess **PASS** only where every criterion below holds. Any material
failure yields **REVISIONS REQUIRED**. Conditional PASS language is prohibited.

## Semantic (Lane A)

- all 30 independent-review probes pass — including all 12 known mismatches;
- all 90 manually authored probes pass;
- all 1331 generated composition cases pass;
- all 22 metamorphic invariants (39 variants) pass;
- unsafe misses = 0;
- safe overfires = 0;
- action-target mismatches = 0;
- compound-clause bypasses = 0;
- English / Filipino / Taglish material mismatches = 0.

## Routing and clarification (Lane B)

- LN3, LN5, LN8, LQ1, LQ2, LS2, LT1 are **not** rejected as out of domain;
- LC5 receives a focused clarification meeting the WS7 contract (≤4 questions, no
  invented facts, no rejection for missing indexed authority);
- all 10 tax-adjacent positives reach the tax domain;
- all 10 negative non-tax `file` controls remain outside the tax domain;
- material false refusals = 0.

## Persistence (Lane C)

- null public `persistenceStatus` = 0;
- `PERSISTED` without receipt or immutable receipt reference = 0;
- false `PERSISTED` = 0;
- status/receipt contradictions = 0;
- all 12 central-finalizer adversarial cases pass;
- public = persisted = history for every `PERSISTED` record;
- non-persisted records assert no history equality and produce no unexpected history entry;
- cross-request receipt leakage = 0 across all 10 concurrency cases.

## Journal and governance (Lane D)

- final contract frozen, committed and pushed **before** implementation, execution and
  evidence (COMMIT 1 → 2 → 3 ordering held);
- durable allocation proven before every governed action;
- process-kill visibility proven by real process kills (WS3 cases 4–6);
- all 18 journal harness tests pass;
- attempt deletions = 0;
- every gate attempt preserved, including failures, with a complete chronology;
- all retries linked and classified technical/environmental;
- incomplete attempts counted in every summary;
- best-answer retries = 0;
- final controlling evidence uses exactly one runtime;
- exact staging SHA proven by server-reported identity before and after the live campaign;
- no mixed deployment.

## Gates and closure

- focused R15 tests pass;
- prior suites pass: R14 focused, R13 32/0, R12 47/0, R11 39/0, R10 22/0, R9 15/0;
- deterministic all-26 remains 9 blocked / 17 preserved / 0 mismatch;
- deterministic runner passes twice from a clean tree, exit 0;
- staging runner passes twice, exit 0;
- manifests validate: self-excluding, zero missing, zero mismatched, zero duplicate;
- counts reconcile across every generation;
- security and scope pass;
- final sync `0 0`; tracked tree clean; only protected untracked paths remain;
- no backend listener remains; port 5173 untouched.

## Governance supersession

`SUPERSEDED BY COMPLETE R15 PROSPECTIVE ATTEMPT EVIDENCE` may be self-assessed **only**
if every criterion above passes independently. The independent R15 reviewer makes the
controlling decision. R14's classification `NOT SUPERSEDED` is preserved as historical
fact and is not revisited.

## Scope discipline

If a new P1 outside the authorized scope is discovered, R15 must preserve it, stop
runtime expansion into that area, report it, and must not silently broaden scope.
