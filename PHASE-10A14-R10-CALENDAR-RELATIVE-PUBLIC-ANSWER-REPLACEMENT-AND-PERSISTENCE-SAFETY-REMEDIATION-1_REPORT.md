# PHASE-10A14-R10 — Calendar-Relative Public-Answer Replacement & Persistence Safety Remediation 1

**Executor:** Claude Code — Opus 4.8 (low speed)
**Repository:** `C:\Projects\tina-backend` · branch `feature/source-availability-engine-v1`
**Starting HEAD:** `a6e6a54…` (expected) · sync `0 0` · **R10 runtime:** `05faa60…` (staging auto-deployed, non-production)
**Runtime model:** `gpt-4o-mini` (unchanged)
**Decision (self-assessed):** **PASS** — formal decision belongs to the mandatory independent reviewer.

## Finding — P1-R9-IR-001 CLOSED
The R9 calendar-relative safety note was **prepended while the unsafe model answer was retained**
(`SG-C-LASTDAY`, `R9-LASTDAY-REPRO` — "today is the last day / file today" stayed visible), and the
**due-today variants** (`R9-DUETODAY`, `SG-C-DUETODAY`) returned `proposition-source-sufficiency` **before**
the calendar-relative gate, so they received **no note at all** ("due today, April 15"). The unsafe text
propagated to the public API answer, persistence and history (both read `payload.answer`).

## Remediation (WS2–WS7)
- **`services/answer-support-validator.js`**: (1) the calendar-relative gate now runs **before**
  proposition-source-sufficiency, so any affirmed today/last-day/due-today conclusion resolves to the
  `calendar-relative-deadline` stage; (2) the detector is broadened to cover due today / file today /
  submit-by-end-of-day / today-is-April-15 / directives / conditional-with-immediate-directive / Taglish;
  (3) `buildCalendarRelativeSafeAnswer(sources)` returns a deterministic safe replacement that states the
  April 15 rule **only** when a Sec 51 deadline authority is present, otherwise omits the statutory
  statement and asks for the missing filing details.
- **`ask-handler.js`**: on the `calendar-relative-deadline` stage the public answer is **replaced** with the
  safe response (was prepend+retain); the rejected model output is kept only in an internal, non-public
  `result.rejectedModelAnswer`. Because `payload.answer` and the persisted `answerText` both read
  `result.answer`, the single replacement covers API + persistence + history.

## Evidence
- Focused suite `phase-10a14-r10` **22/0**; `phase-10a14-r9` **15/0** preserved; deterministic all-26 stays **9/17/0**.
- Differential live (final R10 runtime `05faa60`, 15 probes, 0 technical failures):
  **unsafe public answer = 0 · unsafe in history = 0 · rejected model output exposed = 0 · API ≠ persistence/history = 0 · trust inconsistent = 0**.
  The four affected R9 payloads plus new variants (due tomorrow, already late, still on time, file today,
  deadline passed, two Taglish, answer-introduced) are all replaced safely. Neutral April-15 deadline still
  verifies (VERIFIED_CONTROLLING); `R10-ALREADYLATE` returns a correct *conditional* rule (VALID).
- WS7: the replacement cites April 15 only when Sec 51 is present; where cards were Sec 23/24/27 only
  (e.g. R9-DUETODAY) the statutory statement is omitted and details are requested — no source fabricated.
- WS10 adjudication: every response SAFE & NON-CONTRADICTORY; invalid/questionable/over-verified = 0; material false refusal = 0.

## Prior-closure preservation & scope
Q12 filing-rationale closure preserved; deterministic all-26 unchanged; ordinary non-relative deadline
reachable; model-validator non-override intact. **P1-R9-IR-002** (strict canonical inventory) is deliberately
**reserved for a separate evidence-only task**; **P2-R9-IR-003** remains a bounded limitation.

## Gates & security (WS13/WS15)
Deterministic **200/0 ×2** (clean tree); staging **7/0 ×2**. No secrets/taxpayer data; no model/prompt/
temperature, filing-rationale redesign, retrieval/reranker, corpus/vector/reindex/re-embed, DB/schema,
frontend/Dev-Factory, or production change. Staging auto-deployed the branch to the R10 commit
(non-production, `NODE_ENV=staging`). Protected paths preserved; port 5173 untouched; sync `0 0`.

## Next task
PHASE-10A14-R10-…-INDEPENDENT-REVIEW-1 (Codex GPT-5, high reasoning, low speed; the reviewer must not execute R10).
