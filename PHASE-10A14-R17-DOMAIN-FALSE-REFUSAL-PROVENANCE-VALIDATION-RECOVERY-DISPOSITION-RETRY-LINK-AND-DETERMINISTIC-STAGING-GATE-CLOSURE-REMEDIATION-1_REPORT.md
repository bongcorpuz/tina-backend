# PHASE-10A14-R17 — DOMAIN FALSE REFUSAL, PROVENANCE VALIDATION, RECOVERY DISPOSITION, RETRY LINK AND DETERMINISTIC/STAGING GATE CLOSURE — REMEDIATION 1

Executor: Claude Code — Opus 4.8
Controlling independent review: `0f2468bc4ac657eee4c8c1ee94ab3a0b9f0cc690` — REVISIONS REQUIRED (P1×6, P2×2)
**Final runtime: `345f2db5`** (the only commit touching a runtime file; all later commits are evidence-only and byte-identical)
Runtime model: `gpt-4o-mini` — unchanged, as are temperature, provider, prompt architecture and routing.

**Every count in this report derives from `CANONICAL_ATTEMPT_REGISTRY.json`.** None is typed by hand.

---

## Decision: REVISIONS REQUIRED

Governance, stated separately as required:

```
R15 historical governance:  NOT SUPERSEDED
R16 prospective governance: NOT SATISFIED
R17 prospective governance: NOT SATISFIED
```

The deterministic gate **did not pass**. It is not described as PASS anywhere, and its
failures are **not** all claimed to be environmental.

---

## 1. Findings

| Finding | Status |
|---|---|
| P1-R16-IR-001 deterministic gate failures | **PARTIALLY CLOSED** — both named suites fixed; the gate itself did not pass |
| P1-R16-IR-002 staging failure | **CLOSED** — adjudicated `STAGING_UNREACHABLE`; both R17 cycles pass 7/0 |
| P1-R16-IR-003 domain false refusals | **CLOSED** — 69 → 0 false refusals; all four exact probes ALLOW |
| P1-R16-IR-004 corrupted import counted controlling | **CLOSED** — adjudication now overrides raw status |
| P1-R16-IR-005 retry ceiling unsupported | **OPEN for this execution** — the validator tooling now detects the defect, but no valid retry chain exists here; see §4 |
| P1-R16-IR-006 fabricated SHA undetected | **CLOSED** — Git-object truth enforced |

## 2. What was fixed

**Domain (IR-003).** Customs, capital-gain, Filipino and BIR-enforcement vocabulary added
as strong signals, category-based rather than exact-question. Over the frozen 267-probe
inventory, false refusals went **69 → 0**, and all four exact independent-review probes
now ALLOW. Three narrowing corrections were required after a first pass raised false
allows: bare `tariff` and bare `holding period` now need customs/import and
capital/gain/asset context, and the authority/notice adjacency pattern now needs a
*filing* object rather than a bare "deadline" — each verified beforehand not to regress
LQ2, LS2, RA9 or RA4.

**phase-10a8 (IR-001 Lane A).** 24/0. Its F14 assertion covers **two** questions; the
review named only the capital-gain probe, but "What is Oplan Kandado and when can it be
applied?" was still failing after that fix and needed BIR-enforcement vocabulary.

**patch-07b (IR-001 Lane B).** The failure was **not** a scope violation. `git ls-files`
emits 1,053,632 bytes over Node's 1,048,576-byte `spawnSync` default, so `spawnSync`
returned `status: null` (ENOBUFS) and the guard died while *enumerating* files, never
evaluating a marker. `maxBuffer` was raised; no allowlist, marker or protected pattern
changed. **Proven still live**: a planted tracked file containing
`buildClarificationPrompt` made the guard fail with exit 1 and name the offender; the
probe was then removed. My own R15/R16 evidence commits are what broke it.

**Provenance, recovery, retry (IR-004/005/006).** Git-object validation (format,
existence, type `commit`, ancestry); a caller can no longer supply a controlling SHA, as
`runtimeCommit` is read from `git rev-parse HEAD` at allocation; recovery adjudication
overrides raw terminal status; corruption is detected in non-JSON files including the exact
186-NUL-byte shape. The fabricated SHA is rejected as `SHA_NOT_A_GIT_OBJECT`.

**Staging (IR-002).** Adjudicated `STAGING_UNREACHABLE` at review time. **No harness and no
runtime change** — the harness was found to be behaving correctly, refusing to let a
committed PASS fixture stand during an outage. Both R17 cycles pass **7/0, exit 0**, with
independent reachability probes before and after.

## 3. Evidence

- Focused campaign: **16/16 suites, exit 0**, single clean generation.
- Staging gate: **cycle 1 7/0 exit 0**, **cycle 2 7/0 exit 0**.
- Registry: **37 attempts, 33 controlling, 4 non-controlling, 0 corrupt,
  0 invalid provenance.**
- all-26: **9 blocked / 17 preserved / 0 mismatch**, non-mutating, E1 untouched.
- Prior closures preserved: R16 domain 15/0, R16 tooling 13/0, R15 journal 21/0,
  R15 focused 29/0, R14 21/0, R13 32/0, R12 47/0, R11 39/0, R10 22/0, R9 15/0.

## 4. Blockers — every one independently supported

**1. The deterministic gate achieved 0 of 2 required cycles.** Three attempts (A1, A2, A3)
on an unchanged runtime, each on a verified-clean tree, were executed and are preserved. The
gate is stopped.

**The frozen retry ceiling was not validly reached.** The frozen validator rejects A2 and A3
as `RETRY_RUNTIME_CHANGED`, so `validRetryCount` remains **0** and `retryErrors` remains
**2**. No attempt after A1 counts as a linked retry, and the retry-chain and retry-ceiling
requirement is therefore **not satisfied**. This report does not claim the ceiling was
validly reached.

**Per-suite classification from captured evidence only** (the detail was in `stderr`):

| Suite | Failing assertion | `ERR_STREAM_PREMATURE_CLOSE` in its own block |
|---|---|---|
| `patch-027u` | retry-count assertions | **yes** — attributable to OpenAI stream instability |
| `phase-10a10-r1` | S18-S20 malformed / unavailable validator → fail closed | no |
| `phase-10a10-r2` | A19-A21 validator timeout-shape / unavailable / malformed | no |
| `phase-10a12` | C13-C14 malformed / unavailable validator → not verified | no |
| `phase-10a8` | validator: unavailable client fails closed | no |

For those four the cause is recorded **`UNATTRIBUTED_FROM_CAPTURED_EVIDENCE`**. It is *not*
inferred to be `ERR_STREAM_PREMATURE_CLOSE` merely because another suite showed it. R16 was
faulted for exactly that unsupported attribution and I am not repeating it.

**phase-10a8 F14 explicitly PASSED inside A3** — the R17 remediation held even in the
failing cycle; a different assertion failed.

**2. My own validator rejects my own retry chain.** `validRetryCount: 0`, with two
`RETRY_RUNTIME_CHANGED` errors: `runtimeCommit` records git HEAD, and HEAD moved between
attempts because the mandatory sequence requires committing each failed attempt first. The
*runtime* is unchanged — all runtime files byte-identical to `345f2db5` — but by the letter
of the frozen contract these are not validated same-runtime retries. The retry-chain and
retry-ceiling requirement is consequently **not satisfied**, and **P1-R16-IR-005 remains
OPEN for this execution** even though the validator tooling now detects the defect. I did
**not** relax the validator: changing a counting
definition after seeing it reject my own claim is the retrofitting the contract forbids,
and is the very defect class P1-R16-IR-005 was raised for.

**3. Registry integrity is not clean** (`retryErrors: 2`), following directly from blocker 2.

**4. One frozen domain expectation is unmet — as an evidence-fixture defect, not a runtime
defect.** `MM-15-weak` — "Is the gain taxable?" — is recorded with the frozen expectation
`CLARIFY_OR_NOT_ALLOW` but resolves to ALLOW via `strong_tax_signal`.

The probe text **contains an explicit tax signal** ("taxable"). The runtime's ALLOW is the
correct decision for that text; it is the frozen expectation that is wrong. Accordingly:

- This ALLOW is **not a material runtime false allow**.
- The mismatch is a **frozen oracle / inventory-authoring defect** in my own fixture.
- The final runtime must **not** be described as having a material domain false allow on the
  basis of `MM-15-weak`. Material domain false allows in the final runtime: **0**.
- The probe is **neither retrofitted nor deleted**, per the frozen contract, and the
  "taxable" pattern is not weakened.
- It is recorded separately as an **unresolved evidence-fixture / governance defect**
  (`R17-FIXTURE-001`, status OPEN, in `evidenceFixtureDefects` of the result JSON) and is
  carried forward rather than closed.

It failed identically pre-fix, so it neither supports nor qualifies the IR-003 remediation.

## 4a. Supported conclusions

These stand on the captured evidence and are not withdrawn by the blockers above:

- Customs-duty and capital-gain **false refusals are remediated** (69 → 0 over the frozen
  267-probe inventory).
- **All four exact independent-review probes ALLOW.**
- **phase-10a8 F14 passes** — including inside the failing A3 cycle.
- The **patch-07b guard is restored** and proven still live against a planted violation.
- **Provenance and recovery validators are implemented** and enforced against Git itself.
- **Staging passed twice at 7/0**, exit 0, with independent reachability probes.
- **Runtime files remain byte-identical to final runtime `345f2db5`**; every later commit is
  evidence-only.

And, equally supported:

- **Registry integrity is NOT clean**, because `retryErrors` = 2.
- **The deterministic gate remains failed** — 0 of 2 required successful cycles.

## 5. Other disclosures

**I mutated protected E1 evidence.** The first all-26 attempt ran the E1 runner, which
writes into `WS8_DETERMINISTIC_ALL26.json`. My "non-mutating mode" only *detected* the
mutation afterwards — detection is not prevention. The file was restored via `git checkout`
of that single path, a dedicated non-mutating replay was written, and the failed attempt is
preserved as non-controlling.

**My corruption detector had a false-positive rule**, flagging all 32 attempts because
`stderr.raw.txt` is legitimately empty for a passing suite and `tree-before.txt` is
whitespace-only on a clean tree. `ZERO_LENGTH`/`ALL_WHITESPACE` now exempt `*.raw.txt` and
`tree-*.txt`; the NUL rule is exempted nowhere, and its test still passes.

## 6. Scope and cleanup

Two files changed outside evidence, both in the frozen allowlist.
`services/philippine-tax-domain-boundary.js`, `tax-keywords.js` and `tax-classifier.js`
were not modified. `git add evaluation/` was never used; the protected-path check ran
before every commit and reported `0 protected` every time. No listener remains; port 5173
untouched; no repository-local capture directory. Full detail in
`R17_SECURITY_AND_CLEANUP.md`.

**Phase 10A remains OPEN.** Next task: the mandatory independent R17 review.
