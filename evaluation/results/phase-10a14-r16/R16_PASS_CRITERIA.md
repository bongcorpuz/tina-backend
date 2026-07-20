# PHASE-10A14-R16 — FROZEN PASS CRITERIA

Self-assess **PASS** only where every criterion holds. Any material failure yields
**REVISIONS REQUIRED**. Conditional PASS language is prohibited.

## Journal / crash visibility

- standalone journal suite exits **0** (currently exits 13);
- journal suite passes inside **both** full deterministic runner cycles;
- after-allocation kill real: `killReturned = true`, `code: null`, `signal: SIGKILL`;
- after-started kill real: same;
- **during-call kill real: `killReturned = true`, `code: null`, `signal: SIGKILL`**;
- allocated and started events survive the kill;
- **no** terminal event exists for a killed attempt;
- the killed/incomplete attempt is visible in review;
- **no extra outer attempt** is created by the victim;
- no unsettled top-level await;
- stress: 5 standalone cycles, 3 concurrent-load cycles, all pass;
- negative control `NEG-EARLY-EXIT` fails for its expected reason;
- negative control `NEG-MARKER-TIMEOUT` fails for its expected reason.

## Domain boundary

- both exact independent false allows closed (IR-1, IR-2);
- all 81 manual probes match their frozen expectation;
- all 112 generated near-neighbour permutations match;
- all 22 metamorphic invariants (35 variants) hold;
- **false tax ALLOW = 0**;
- **material tax false refusal = 0**;
- all seven named R15 false-refusal probes remain ALLOW;
- the broader R15 adjacency family remains ALLOW;
- strong-tax override failures = 0;
- weak-signal-only ALLOW = 0;
- non-tax file-object controls remain NOT_ALLOW;
- fail-closed default preserved for unrelated queries.

## Evidence governance

- R16 contract frozen at COMMIT 1 before implementation and execution;
- **no contract amendment** at any point;
- **no canonical evidence deleted, archived, converted, compacted or overwritten**;
- every attempt has a complete immutable directory;
- every retry links to its prior attempt via `30-retry-of.json`;
- canonical registry contains **every** attempt;
- zero duplicate attempts; zero missing attempts;
- **zero contradictory counts** — every reported count derives from the registry;
- R15 historical erratum accurate and non-destructive;
- R15 historical status remains **NOT SUPERSEDED**;
- `R16 prospective governance: SATISFIED` self-assessed only if all the above hold.

## Gates

- deterministic cycle 1 exit **0**;
- deterministic cycle 2 exit **0**;
- staging cycle 1 **7/0** exit 0, exact server-reported runtime SHA;
- staging cycle 2 **7/0** exit 0, same SHA, no mixed deployment;
- all focused R16 suites exit 0 (a printed PASS without exit 0 is insufficient);
- prior closures pass: R15 focused 29/0, R14 21/0, R13 32/0, R12 47/0, R11 39/0,
  R10 22/0, R9 15/0;
- deterministic all-26 remains **9 blocked / 17 preserved / 0 mismatch**;
- persistence receipt and LC5 regressions pass;
- exact staging identity regression passes;
- manifests validate: self-excluding, zero missing, zero mismatched, zero duplicate;
- final tracked tree clean; only protected untracked paths; sync `0 0`;
- no backend listener; port 5173 untouched.

## Retry ceiling

For the same gate on the same unchanged runtime: one initial attempt plus **at most two**
technical retries. After three unsuccessful clean attempts, self-assess REVISIONS REQUIRED
and stop that gate. No indefinite looping.

## Scope discipline

A new P1 outside this scope must be preserved and reported, runtime scope must not be
broadened, and R16 must stop after safe cleanup with REVISIONS REQUIRED.
