# PHASE-10A14-R16 — CRASH-VISIBLE DURING-CALL JOURNAL, NON-TAX DOMAIN BOUNDARY, IMMUTABLE EVIDENCE CONTRACT AND CANONICAL GATE-ATTEMPT ACCOUNTING — REMEDIATION 1

Executor: Claude Code — Opus 4.8
Controlling independent review: `aa0550753d1a0a988503123b6bca853a2c193bac` — REVISIONS REQUIRED, governance NOT SUPERSEDED
**Final runtime: `0323bb91ac8383e1cbb6800637e4b9b896cdaff1`**
Runtime model: `gpt-4o-mini` — unchanged, as are temperature, routing and provider config.

**All counts below are derived from `CANONICAL_ATTEMPT_REGISTRY.json`.** No count in this
report is typed by hand.

## Decision: REVISIONS REQUIRED

Four of the five P1 findings are closed and the fifth is addressed prospectively. **One
blocking item**: the deterministic gate did not achieve two successful cycles. Its retry
ceiling was reached and the gate was stopped, as the frozen contract requires.

---

## 1. Findings

| Finding | Status |
|---|---|
| P1-R15-IR-001 deterministic gate / journal suite reliability | **CLOSED** (suite); gate blocked separately |
| P1-R15-IR-002 real during-call crash visibility | **CLOSED** |
| P1-R15-IR-003 two non-tax false allows | **CLOSED** |
| P1-R15-IR-004 governance supersession blocked | **ADDRESSED PROSPECTIVELY** |
| P1-R15-IR-005 gate/attempt accounting inconsistent | **CLOSED** |
| P2-R15-IR-006 historical protected-path violation | preserved, not denied |
| P2-R15-IR-007 stale R15 pre-fix manifest | preserved, deliberately not regenerated |
| P2-R15-IR-008 review log placement | **CLOSED** |

## 2. Root causes — reproduced before any change (COMMIT 3)

**IR-001 and IR-002 are one defect seen from two ends.** The R15 victim called
`journal.run(...)` **without `await`**, and its callback awaited `new Promise(() => {})`,
which registers **no event-loop handle**. The loop drained, the process exited **code 0**
before the parent's kill, so `kill()` returned `false`; the parent then attached its exit
listener *after* the child had already exited, so that promise never settled — the
unsettled top-level await behind exit 13. Reproduced exactly:

| stage | kill returned | exit |
|---|---|---|
| after-allocated | true | `code:null, signal:SIGKILL` |
| after-started | true | `code:null, signal:SIGKILL` |
| **during-call** | **false** | **`code:0, signal:null`** |

**IR-003.** `"For a pri·VAT·e lease payment…"` matched the keyword `vat` **inside
"private"**, because `isTaxRelated` uses raw `includes()` with no word boundary; the court
and labor probes matched only the generic words `filing` and `deadline`. Over the frozen
193-probe inventory this produced **88 false allows and 0 false refusals**.

A finding recorded *before* any repair: not every false allow came from `isTaxRelated` —
NN-15 was allowed by `ph_tax_pattern_match`. Gating only the keyword path would have been
insufficient, so both paths were gated.

## 3. Remediation

**Crash harness.** A new R16 victim (the R15 victim is historical evidence and untouched):
one governed attempt, awaited at the top level, with a live `setInterval` handle, and the
readiness marker written from inside the callback carrying PID, attemptId and stage. The
parent registers exit observation before killing, confirms liveness first, and bounds
every wait. `assertRealKill` requires `kill() === true`, `signal SIGKILL`, `code null`.
Two negative controls must fail for their expected reasons.

**Domain boundary.** A strong/weak/non-tax signal model. Strong anchors are
word-boundary matched and override a non-tax object; weak generic terms never allow alone;
explicit non-tax context vetoes a weak match; tax-filing adjacency is preserved but now
requires a co-signal. `tax-keywords.js` and `tax-classifier.js` were **not** modified —
`isTaxRelated` is shared, so its substring behaviour is *contained* rather than altered.

**Evidence.** One permanent directory per attempt; exclusive creation; fsync; durability
proven by byte read-back; external capture with canonical import verified after copy. The
tooling exposes **no** delete, archive, convert or compact path, and two tests assert that
by inspecting both the export surface and the source text.

## 4. Results at the final runtime

Focused/regression campaign — **11/11 suites, exit 0**: r16-domain 15/0, r16-tooling 13/0,
r15-journal-crash 21/0, r15-focused 29/0, r14 21/0, r13 32/0, r12 47/0, r11 39/0,
r10 22/0, r9 15/0, all-26 **9 blocked / 17 preserved / 0 mismatch**.

Domain inventory: **false tax ALLOW 88 → 0**, material false refusal **0**, metamorphic
**0 failures**.

Crash stress: **5/5 standalone**, **3/3 concurrent**.

Staging gate: **cycle 1 7/0 exit 0**, **cycle 2 7/0 exit 0**, identity stable across both.

Registry: **47 attempts**, integrity clean, 0 duplicates, 0 missing retry targets,
0 malformed, 0 incomplete, **0 deletions**.

## 5. The blocking item

The deterministic gate ran three times on the unchanged final runtime (A2, A3, A4), each
on a verified-clean tree with runtime equivalence IDENTICAL, and each failed with **exit 1,
208 suites run, 6 failed** — the identical set every time:
`patch-027u-openai-transient-retry`, `phase-10a10-r1`, `phase-10a10-r2`,
`phase-10a10-verified-controlling-residual`, `phase-10a12`, `phase-10a8`.

Each takes 4–10 seconds making real OpenAI calls. R15 recorded the concrete cause across
five of its own attempts as `ERR_STREAM_PREMATURE_CLOSE` on the OpenAI connection. These
six suites are untouched by the R16 boundary change, and all 11 R16 focused suites pass on
this same runtime.

The frozen ceiling is one attempt plus two technical retries per gate on an unchanged
runtime. That ceiling is now reached, so R16 **stopped the gate** rather than looping, and
self-assesses REVISIONS REQUIRED rather than fabricating a pass. The single outstanding
action is to complete the deterministic gate in a healthy network environment.

## 6. Three failures of my own, disclosed

1. **I fabricated a commit hash.** On the first focused campaign I passed a 40-hex value
   *constructed* from the short hash instead of reading `git rev-parse HEAD`; it does not
   exist as a git object. Eleven attempts recorded false provenance. They are preserved
   unmodified with `40-recovery-adjudication.json` marking them NON_CONTROLLING, and the
   campaign was re-run with a verified commit. **Nothing in the tooling caught this** — the
   registry and hash checks verify internal consistency, not the truth of a
   human-supplied field. A reviewer should treat that as a real gap; closing it would be a
   tooling change beyond the five authorized findings, so it is reported, not implemented.
2. **I introduced two false refusals.** My strong-signal list omitted named Philippine tax
   statutes (RA/TRAIN/CREATE) and `lessor`, so `patch-06e-003` and `phase-10a12-r2` began
   failing — the exact regression class the authorization warns against. Caught by the
   deterministic gate, **not** by my frozen inventory, which contains no such probe. The
   failed attempt was committed before the correction; the inventory was **not**
   retro-fitted, because that would disguise the limitation.
3. **My canonical copy could corrupt evidence.** `fs.cpSync` delivered a 186-byte file as
   186 spaces (an NTFS lazy-write artifact). Post-copy verification caught it and aborted.
   The copy now reads, writes, fsyncs and byte-compares each file. The aborted partial
   import is preserved with an adjudication rather than deleted.

## 7. Governance

```
R15 historical governance: NOT SUPERSEDED
R16 prospective governance: NOT SATISFIED
```

`NOT SATISFIED` follows from the unmet deterministic gate alone. The contract was frozen
before implementation and never amended, no canonical evidence was deleted or converted,
every attempt is in the registry, counts reconcile, failed attempts are preserved, no
best-answer retry occurred, and the real during-call kill is proven — but the frozen
criteria require the gates, and they are not met. R16 makes no claim that R15 became
superseded.

**Phase 10A remains OPEN.** Next task: the mandatory independent R16 review.
