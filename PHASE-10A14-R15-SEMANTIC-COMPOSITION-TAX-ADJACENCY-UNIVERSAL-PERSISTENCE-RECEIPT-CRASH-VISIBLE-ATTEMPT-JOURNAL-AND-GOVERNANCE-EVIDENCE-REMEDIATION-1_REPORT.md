# PHASE-10A14-R15 — SEMANTIC COMPOSITION, TAX ADJACENCY, UNIVERSAL PERSISTENCE RECEIPT, CRASH-VISIBLE ATTEMPT JOURNAL AND GOVERNANCE EVIDENCE — REMEDIATION 1

Executor: Claude Code — Opus 4.8
Controlling independent review: `768059ccd5248f83fd29ce85be06c7d6f4921a43` — REVISIONS REQUIRED (P1×7, P2×2, P3×1)
**Final runtime: `c38a073b814559d9e02139fcb7c61e310e46bc21`** (COMMIT 4 — the last commit changing any runtime file)
TINA runtime model: `gpt-4o-mini` (unchanged)

## Decision: REVISIONS REQUIRED

Every remediation criterion passes. **One** blocking item remains: the mandatory
deterministic gate did not complete cleanly twice, because four LLM-dependent suites fail
under sustained load with `ERR_STREAM_PREMATURE_CLOSE` on the OpenAI connection. No PASS
is claimed. Details in §7.

---

## 1. Findings disposition

| Finding | Status |
|---|---|
| P1-R14-IR-001 semantic bypasses and overfires | **CLOSED** |
| P1-R14-IR-002 live false refusals | **CLOSED** |
| P1-R14-IR-003 `PERSISTED` without receipt | **CLOSED** |
| P1-R14-IR-004 journal not crash-visible | **CLOSED** |
| P1-R14-IR-005 freeze-sequence violation | **CLOSED** |
| P1-R14-IR-006 failed gate attempts not preserved | **CLOSED** |
| P1-R14-IR-007 governance supersession | self-assessed SUPERSEDED; reviewer decides |
| P2-R14-IR-008 LC5 clarification-first | **CLOSED** |
| P2-R14-IR-009 exact staging identity | **CLOSED** |
| P3-R14-IR-010 review harness timeout | preserved as bounded lesson |

## 2. Root causes — reproduced before any change

All reproduced against the unchanged R14 runtime and committed as COMMIT 3 before
remediation began.

**P1-R14-IR-001** reproduced exactly 12/12 (9 misses, 3 overfires). Four distinct
mechanisms, not one:

1. **Compound-clause bypass.** `splitCalendarClauses` split only on sentence punctuation,
   never on coordinators, so *"The authority does not establish today's deadline, but do
   not fail to file today"* was a **single** clause whose safe-negation branch suppressed
   the unsafe half. R14's MM10 invariant asserted this could not happen; it passed only
   because its fixture used a sentence boundary, which does split. The invariant was real,
   the fixture too weak.
2. **Action-target confusion.** Any clause mentioning the noun *filing* near a relative
   time was treated as a filing directive, so *"do not fail to **verify** whether filing is
   due today"* was unsafe. The frame had no action-target concept.
3. **Unrecognized nonperformance surfaces**: `left unfiled`, `remain outstanding`,
   `unsubmitted`, `let the day pass without filing`, `hold` (deferral), `see to it that`.
4. **Filipino gaps in both directions.**

A broader phrase list could not fix (1) or (2); both required structural change.

**P1-R14-IR-002** reproduced 7/7 — all returning `fail_closed_no_tax_signal`. Live
reproduction showed **17**, not 7. Correction to the finding's framing: **LC5 is not a
domain-boundary defect** — it already returned `ALLOW / PHILIPPINE_TAX`; its defect is
entirely downstream, so fixing the classifier alone would not have fixed it.

**P1-R14-IR-003** — my own R14 defect. The wrapper injected only when
`persistenceStatus == null`; the domain-boundary branch pre-populates a status without a
receipt, so the wrapper skipped the body entirely. The guard conflated *"status is absent"*
with *"persistence declaration is absent"*. Live reproduction showed **21** affected
records, not 8, correlating exactly with out-of-domain responses.

**P1-R14-IR-004** — R14's journal built the record in memory and appended only after the
governed function returned. A `SIGKILL` left nothing. The contract claimed a pre-execution
durable write; the implementation did not do it.

## 3. Remediation

**Lane A** — independent clause segmentation on coordinators (evaluating **only** the
split clauses, since retaining the unsplit sentence let a verb in one clause combine with a
time in another and produced 7 false positives from two safe clauses); an explicit action
target; new nonperformance surfaces; day-pass and hold as their own temporal anchors;
Filipino coverage both ways; unquoted attribution scope distinguishing a reported
assertion from an adopted imperative.

**Lane B** — tax-filing adjacency keyed on context and object, with a non-tax file-object
veto checked first so the bare token *file* can never pull a query into the tax domain.
Fail-closed preserved as the default.

**Lane B / LC5** — a bounded clarification helper. The obstacle is missing **facts**, not
missing authority, so retrieval could never resolve it. Implemented in-scope
(`ask-handler.js` + new helper) because the fallback lives in `answer-renderer.js` /
`pipeline.js`, which are outside the authorized allowlist.

**Lane C** — a central finalizer that runs **unconditionally** on every public JSON body
and cannot be bypassed by a pre-populated status. Contradictory, malformed or partial
declarations are replaced with the request-scoped truth.

**Lane D** — `services/runtime-identity.js`. Identity is deliberately **not** on public
`/health`: PATCH-08S-FOLLOWUP lists `commitSha` as a forbidden public field, enforced by a
staging smoke test. The authorized alternative — a header-gated authenticated diagnostics
field — was used instead.

## 4. Final-runtime evidence

FINAL deterministic campaign (controlling), 1528 attempts, 0 incomplete, 0 malformed:
semantic **1490/1490** (30 independent, 90 manual, 1331 generated, 39 metamorphic
variants), routing **27/27**, persistence **10/10** — **0 failures**.

LIVE campaign (controlling), 40 probes, identity `c38a073b…` verified **before and after**:

| Metric | Pre-fix | Final |
|---|---|---|
| null `persistenceStatus` | 0 | **0** |
| `PERSISTED` without receipt | 21 | **0** |
| generic out-of-domain refusals | 17 | **0** |
| unsafe directives emitted | 0 | **0** |
| non-tax leaked into tax | 0 | **0** |
| history mismatches | 0 | **0** |

Prior closures at this runtime: R14 21/0, R13 32/0, R12 47/0, R11 39/0, R10 22/0, R9 15/0,
R15 focused 29/0, R15 journal 19/0, deterministic all-26 9/17/0.

## 5. Governance

Freeze sequence honoured across three commits: contract (COMMIT 1) → implementation
(COMMIT 2) → pre-fix evidence (COMMIT 3). Crash visibility proven by **three real
`SIGKILL` tests**. Reconciliation: 12,305 attempts, 32,248 events, 0 incomplete,
0 malformed, 0 technical failures, **0 deletions**.

## 6. Disclosed problems in my own work

1. **Contract amendment — archiving.** 32,256 journal files overflowed `spawnSync` buffers
   in existing scope guards. Six of eight generations existed only because I re-ran the
   entire campaign on each iteration — my methodological error. Completed generations were
   converted to verified JSONL archives (every event hash-checked before any removal;
   10,737 attempts / 32,088 events / 0 mismatches). Not the R14 defect: nothing was lost,
   and the pre-fix generations remain in full directory form at COMMIT 3.
2. **A phantom crashed attempt.** `reviewCampaign()` counted the sibling `records/`
   directory as an attempt, **fabricating a crashed attempt that never existed**. I
   initially documented that phantom as genuine. Both code and claim corrected.
3. **Gate attempt 1 repeated R14's mistake.** My runner wrote its journal inside the repo
   mid-run. **Attempt 2 was my error directly** — I created report files while the gates
   were running. Both preserved and pushed before any corrective re-run.
4. **A broken identity check.** `git cat-file -e <sha>^{commit}` was mangled by cmd.exe,
   where `^` is the escape character, so every commit read as absent. It produced a false
   **negative**; had it failed the other way, R15 would have claimed proven identity it did
   not have.
5. **Routing quality.** The seven probes now reach the tax domain, but four land on the
   no-indexed-authority message rather than a tailored answer. Truthful and no longer a
   domain rejection, so the finding is met — but improving it needs retrieval changes that
   are outside scope.

## 7. The blocking item

The deterministic gate was attempted **five** times; all five attempts are preserved.
Attempts 3–5 ran on a verified-clean tree with staging identity MATCHING, and each failed
with the same four LLM-dependent suites:
`patch-027u-openai-transient-retry`, `phase-10a10-r1`, `phase-10a10-r2`, `phase-10a12`.

The captured cause is `ERR_STREAM_PREMATURE_CLOSE` on the OpenAI connection, which injects
extra real retries so `patch-027u`'s exact retry-count assertions fail, and leaves the
validator stage `unavailable` for the other three.

Not attributable to the R15 change: all four pass standalone (verified repeatedly); the
identical runtime passed this gate **206/0 twice** immediately after COMMIT 4; no runtime
file has changed since (proven by byte-equality); and the R15 deterministic campaigns pass
1528/1528 with no network dependency.

**Staging gates passed 7/0 twice, exit 0, with exact identity proven.**

Under the frozen PASS criteria an incomplete deterministic gate is blocking regardless of
cause. R15 therefore self-assesses **REVISIONS REQUIRED**. The single outstanding action is
to complete the deterministic gate in a healthy network environment; no runtime change is
indicated, and none was made in response.

**Phase 10A remains OPEN.** Next task:
`PHASE-10A14-R15-…-REMEDIATION-1-INDEPENDENT-REVIEW-1`.
