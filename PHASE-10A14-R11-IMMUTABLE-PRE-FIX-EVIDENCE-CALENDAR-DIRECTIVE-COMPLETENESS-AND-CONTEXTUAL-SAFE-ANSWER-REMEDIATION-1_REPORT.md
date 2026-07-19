# PHASE-10A14-R11 — Immutable Pre-Fix Evidence, Calendar-Directive Completeness & Contextual Safe-Answer Remediation 1

**Executor:** Claude Code — Opus 4.8 (low speed) · branch `feature/source-availability-engine-v1`
**Starting HEAD:** `ccebd06…` · sync `0 0` · **R11 runtime:** `90d70fe…` (staging auto-deployed, non-production)
**Decision (self-assessed):** **PASS** — formal decision belongs to the mandatory independent reviewer.

## Findings
| ID | Disposition |
|---|---|
| **P1-R10-IR-002** — detector missed answer-introduced filing directives | **CLOSED** — clause-level detection; pre-fix 18 misses → post-fix 0. |
| **P1-R10-IR-001** — R10 mid-run defect not preserved as raw evidence | **SUPERSEDED BY COMPLETE R11 PROSPECTIVE EVIDENCE** (self-assessed; reviewer decides). Original R10 intermediate payload **not recovered/reconstructed**; R10 finding remains historically accurate. |
| **P2-R10-IR-003** — contextual wording ("today" for a "tomorrow" question) | **CLOSED** — contextual safe-answer builder. |

## Immutable pre-fix evidence (WS3) — committed BEFORE remediation
A frozen 38-probe campaign (30 unsafe directives across categories A–G + 8 safe controls) was executed against
the **unchanged R10 runtime** (`05faa60`) and committed at **`16205d2`** (COMMIT 2), a strict ancestor of the
runtime fix `90d70fe`. It objectively preserved **18 unsafe detector misses** (polite/imperative "file now"/
"immediately"/tomorrow/yesterday/Taglish-bare-ngayon) and **1 safe false-positive** (F32 conditional tripping
"deadline has passed"). This is **new R11 pre-fix evidence — not the missing original R10 payload**, which is
not present and was not reconstructed (see `R11_HISTORICAL_R10_EVIDENCE_GAP.md`).

## Remediation (WS4–WS7)
- `services/answer-support-validator.js`: replaced the monolithic regex with **bounded clause-level analysis**
  (filing action + relative time + present application via directive force / sentence-initial imperative /
  Tagalog filing verb / affirmative assertion), suppressed only by subjunctive/counterfactual/non-conclusion
  guards and specific-year historical context. `buildCalendarRelativeSafeAnswer` is **contextualized** by the
  question's temporal reference via `deriveCalendarContext` (today/tomorrow/yesterday/already-late/still-on-time)
  and states April 15 only when a Sec 51 deadline authority is present.
- `ask-handler.js`: passes the question + detected relative-reference to the contextual builder.

## Post-fix rerun (WS9) — full frozen campaign against deployed R11 (`90d70fe`)
- Deterministic: **0 misses, 0 false-positives**; pre/post reconcile **1:1** over all 38 probes.
- Live handler subset (9 probes): **real unsafe public answer = 0, unsafe history = 0, rejected output exposed = 0,
  API = persistence = history**. Contextual replacement confirmed (tomorrow/yesterday/already-late phrasing).
  (G37's safe replacement negates "still on time"; F32 hit a domain-boundary NOT_APPLICABLE response — both
  measurement context, not runtime defects.)

## Preservation & gates
Focused `phase-10a14-r11` **39/0**; `phase-10a14-r10` 22/0, `phase-10a14-r9` 15/0; deterministic all-26 **9/17/0**;
Q12 filing-rationale + ordinary deadline reachability preserved. Deterministic **201/0 ×2** (clean tree);
staging **7/0 ×2**. No secrets/model/prompt/corpus/production change; protected paths preserved; port 5173
untouched; sync `0 0`. **P1-R9-IR-002 reserved for E2; P2-R9-IR-003 remains bounded.**

## Next task
PHASE-10A14-R11-…-INDEPENDENT-REVIEW-1. After an independent R11 PASS → PHASE-10A14-E2. Phase 10A remains OPEN.
