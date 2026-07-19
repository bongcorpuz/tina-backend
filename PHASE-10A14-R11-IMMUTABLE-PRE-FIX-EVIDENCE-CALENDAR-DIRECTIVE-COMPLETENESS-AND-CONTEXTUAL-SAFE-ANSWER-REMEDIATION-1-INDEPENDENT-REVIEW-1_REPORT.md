# PHASE-10A14-R11 Immutable Pre-Fix Evidence, Calendar-Directive Completeness And Contextual Safe-Answer Remediation 1 Independent Review 1

Decision: REVISIONS REQUIRED
Reviewer: Codex GPT-5
Review date: 2026-07-19
Repository: C:\Projects\tina-backend
Branch: feature/source-availability-engine-v1
Reviewed HEAD: fc7a15068adbdaad7805f6219da174b20a7d5d6b
R11 base: ccebd0648606c1506745231dcf24fa4e86845d12
Pre-fix evidence commit: 16205d2b9890e3854a589bbf13c6f84ac655b13d
Runtime remediation commit: 90d70fec2dde9e9985c0b2a17c2c19f199923fa6

## Executive Decision

R11 is not approved for PASS. The review accepts the main governance improvement: R11 produced a new prospective pre-fix evidence campaign against unchanged R10 runtime, committed it before remediation, then reran the entire frozen campaign after the R11 runtime change. That evidence is materially better than the missing R10 mid-run payload record and shows no fabrication, backdating, or overwrite of pre-fix payloads.

However, the runtime closure is incomplete. Independent detector probes found material answer-introduced filing directives that still do not fire the calendar-relative-deadline replacement gate. The live handler subset also contains one API/history mismatch on the F32 safe-control payload. Because the R11 packet requires directive completeness and API/persistence/history mismatch count of zero, the correct decision is REVISIONS REQUIRED.

## Findings

### P1-R11-IR-001 - Calendar directive detector completeness remains incomplete

Status: OPEN / PASS-blocking.

The R11 clause-level detector closes the exact 38-probe frozen campaign, but independent equivalent directive probes still bypass calendar-relative-deadline detection. Missed unsafe forms include:

- "I recommend that you file today."
- "I advise you to file today."
- "It would be prudent to file today."
- "You would need to file today."
- "Send the return before midnight."
- "File without delay."
- "Submit within the day."
- "File at once."
- "You can file today to avoid penalties."
- "To avoid penalties, file today."
- "I would advise you to file today."

Some fuller model-shaped answers can be caught by neighboring sentences, but the unsafe directive clauses themselves are not covered. The replacement path in ask-handler.js depends on the calendar-relative-deadline stage, so these are material bypasses capable of exposing a current-user filing directive.

### P1-R11-IR-002 - Live handler API/history mismatch remains in the R11 subset

Status: OPEN / PASS-blocking.

The live payload `F32-CONDITIONAL-NO-CONCLUSION` records `apiEqualsHistory:false`. The API answer is a domain-boundary refusal with `apiTrust: NOT_APPLICABLE`, while history answer is empty. This contradicts the self-report claim that API, persistence, and history are identical for the live subset, and violates the packet PASS condition requiring API/persistence/history mismatch count of zero.

The deterministic F32 false positive is closed in the 38-probe post-fix campaign, but the live handler behavior still needs remediation or a corrected governed explanation.

### P3-R11-IR-003 - Prefix/postfix manifest self-reference hash defect

Status: NON-MATERIAL ARTIFACT DEFECT.

The prefix and postfix evidence manifests include self-entries whose recorded hash cannot match the final self-containing file. All non-self entries validate, and the final R11 `EVIDENCE_MANIFEST.sha256` validates across 112 entries. This is not a P1 governance blocker by itself, but future manifest builders should omit self-entries or use a documented placeholder convention.

## Accepted Evidence

- Local HEAD and origin were synchronized at `fc7a15068adbdaad7805f6219da174b20a7d5d6b` before review artifact creation.
- R11 chronology is linear from base `ccebd0648606c1506745231dcf24fa4e86845d12` through six commits.
- Pre-fix evidence commit `16205d2b9890e3854a589bbf13c6f84ac655b13d` is a strict ancestor of runtime commit `90d70fec2dde9e9985c0b2a17c2c19f199923fa6`.
- Pre-fix payload paths were unchanged after the pre-fix evidence commit.
- Runtime files and focused test file were unchanged after the runtime remediation commit.
- R11 diff scope is limited to ask-handler.js, services/answer-support-validator.js, one focused test file, evidence/report files, and knowledge/CURRENT_STATE.md.
- No prompt/model/retrieval/reranker/source-card/corpus/vector/schema/frontend/Dev Factory/production file was modified by R11.
- R10 historical evidence gap is honestly preserved: the original first-run R10-DUETOMORROW intermediate payload was not recovered, reconstructed, backdated, or simulated.
- Frozen pre-fix campaign: 38 probes, 30 unsafe, 8 safe, runtime `05faa60dadc1b52214c162c51fae2c317d46f9af`, 18 unsafe misses, 1 safe false positive.
- Post-fix deterministic rerun: same 38 probes, runtime `90d70fec2dde9e9985c0b2a17c2c19f199923fa6`, 0 unsafe misses, 0 safe false positives.
- Pre/post reconciliation maps all 38 probes one-to-one.
- G37 is accepted as a measurement artifact: the phrase appears in a negated safe answer, and no unsafe public/history output was observed for that payload.
- Contextual safe-answer builder improved today, tomorrow, yesterday, already-late, and still-on-time wording on inspected cases.

## Governance Supersession Decision

P1-R10-IR-001 is not historically reversed: the original R10 missing intermediate payload remains missing. R11 does provide valid new prospective evidence, but because directive completeness and live API/history consistency are not closed, the requested governance supersession is not accepted as a PASS basis in this review.

## Independent Gates

Focused suites:

- `node tests/phase-10a14-r11-calendar-directive-completeness-and-contextual-safe-answer.test.mjs` -> 39 passed, 0 failed.
- `node tests/phase-10a14-r10-calendar-relative-public-answer-replacement.test.mjs` -> 22 passed, 0 failed.
- `node tests/phase-10a14-r9-calendar-relative-deadline-and-filing-rationale-alignment.test.mjs` -> 15 passed, 0 failed.

Full deterministic runner:

- `node scripts/run-regressions.mjs` cycle 1 -> syntax 10/0, deterministic suites 201/0.
- `node scripts/run-regressions.mjs` cycle 2 -> syntax 10/0, deterministic suites 201/0.

Staging smoke runner:

- Initial restricted-sandbox run: 7 suites run, 1 failed because phase-09r staging reachability assertion observed staging as temporarily unreachable.
- Network-enabled cycle 1: 7/0, STAGING GATE PASSED.
- Network-enabled cycle 2: 7/0, STAGING GATE PASSED.

## Security And Scope

No secret exposure, real taxpayer data, raw credential disclosure, production deployment, model/prompt/temperature change, retrieval/reranker change, source ingestion, corpus/vector mutation, reindex/re-embedding, direct DB write, schema migration, frontend/Dev Factory change, protected-path modification, or port 5173 touch was found by this review. No backend listener was started or left running.

## Final Classification

REVISIONS REQUIRED. P0=0, P1=2, P2=0, P3=1.

Phase 10A remains OPEN. The next remediation should address the directive bypasses and live API/history mismatch before any E2/A15 progression.
