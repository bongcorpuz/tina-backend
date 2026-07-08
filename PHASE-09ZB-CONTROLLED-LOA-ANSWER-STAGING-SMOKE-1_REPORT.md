# PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1 Report

## Purpose

Verify the staging-only controlled LOA/eLA `/ask` branch from PHASE-09ZA when `TINA_ENABLE_CONTROLLED_LOA_ASK_GATE=true`, while preserving production and runtime boundaries.

## Base State

- Repository branch: `feature/source-availability-engine-v1`
- Base commit: `23eb7dd`
- Prior reports verified present: 09ZA, 09Z, 09Y, 09X, and 09 gate closure.
- Smoke type: controlled LOA answer staging smoke.

## Files Changed

- `evaluation/fixtures/phase-09zb-controlled-loa-answer-staging-smoke-1.fixture.json`
- `tests/phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs`
- `PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1_REPORT.md`
- `knowledge/CURRENT_STATE.md`

## Staging Preconditions

- Staging environment flag status: confirmed enabled. `TINA_ENABLE_CONTROLLED_LOA_ASK_GATE=true` is empirically confirmed on staging because the controlled branch correctly triggers for BIR-worded safe queries.
- Post-09ZE rerun deploy status: confirmed. Live staging deployed commit is `339c448aee0188ffd62beecc126567ee6a30a6b7`, satisfying the required `339c448` or later post-remediation deploy.
- Post-09ZE rerun auth status: confirmed using `Authorization: Bearer <staging JWT>` from ignored local `.env`; the JWT was not printed, committed, or written to evidence.
- Post-09ZE rerun flag status: confirmed empirically because BIR-worded safe LOA/eLA queries returned `responseType: "controlled_loa_answer"`.
- Staging deploy commit status: confirmed. Live staging deployed commit is `fde5e3968259fe6be050bd2fb33a6651569b504e`, at or later than the required `23eb7dd`.
- Required flag: `TINA_ENABLE_CONTROLLED_LOA_ASK_GATE=true` in staging only.
- Production boundary: production was not modified.
- Rerun status after blocker commit `57ba035`: still blocked because `RUN_TINA_STAGING_SMOKE`, `TINA_STAGING_ASK_URL`, `TINA_STAGING_AUTH_HEADER_NAME`, and `TINA_STAGING_AUTH_HEADER_VALUE` were not available in the process environment.
- Second rerun status after blocker update commit `71851c4`: still blocked because the same required live staging env vars were not available in the process environment.
- Live `.env` rerun status after commit `fde5e39` (x-index-secret attempt): still blocked. `.env` was present, ignored, untracked, and contained the required keys; the authenticated staging `/ask` probe using the provided `x-index-secret` header returned `401`, the same status as the unauthenticated probe.
- Live `.env` rerun status after commit `fde5e39` (Authorization Bearer JWT attempt): access unblocked. Switching the auth method to `Authorization: Bearer <staging JWT>` resolved the authentication blocker — authenticated `/ask` and `/debug/db-identity` both returned `200`, while unauthenticated `/ask` correctly returned `401`. With staging access, deploy commit, and feature flag all confirmed, the smoke matrix was run in full, revealing a genuine behavioral gap (see Smoke Evidence below).
- Prior blocker status: `BLOCKED_PENDING_STAGING_ACCESS`.
- Current status: `FAIL` (not blocked — staging access, deploy commit, and feature flag are all confirmed working; the smoke matrix ran to completion and 4 of 8 mandated safe queries did not trigger the controlled branch).
- Post-09ZE rerun current status: `FAIL` (not blocked -- staging access works, deploy commit is `339c448aee0188ffd62beecc126567ee6a30a6b7`, and the feature flag is confirmed empirically; however, the live smoke still fails on the first remediated safe-query case, `I received a replacement eLA, what should I check first?`).

## Smoke Evidence

- Post-09ZE safe LOA/eLA query smoke evidence: **FAIL** -- 4 of 8 mandated safe queries triggered the controlled branch (`I received a BIR LOA, what should I do?`, `I received a BIR eLA, what should I do?`, `What should I do after receiving a Letter of Authority from BIR?`, `What documents should I prepare after receiving a BIR LOA?`). The remaining 4 did not trigger the controlled branch on live staging after `339c448`: `I received a replacement eLA, what should I check first?`, `I received a consolidated eLA, what should I do?`, `I received a notice for presentation/submission of documents.`, and `I received a reminder before subpoena.` Each returned the generic Philippine-tax fallback instead of `responseType: "controlled_loa_answer"`.
- Post-09ZE excluded unsafe query smoke evidence: **PASS** -- all 12 excluded unsafe queries did not trigger the controlled safe LOA answer before the safe-query failure stopped the formal rerun harness.
- Post-09ZE unrelated query non-trigger evidence: **PASS** -- all 5 unrelated queries did not trigger the controlled LOA branch before the safe-query failure stopped the formal rerun harness.
- Post-09ZE runtime/security smoke evidence: not completed in the formal rerun after the first failing safe-query assertion; prior 09ZB runtime/security evidence remains PASS and no runtime/security files were changed in this rerun.
- Safe LOA/eLA query smoke evidence: 4 of 8 mandated safe queries **PASS** ("I received a BIR LOA, what should I do?", "I received a BIR eLA, what should I do?", "What should I do after receiving a Letter of Authority from BIR?", "What documents should I prepare after receiving a BIR LOA?") — each triggers the controlled branch with the full required procedural content and no filing-ready/automatic-submission/verified-citation language. The remaining 4 **FAIL** ("I received a replacement eLA, what should I check first?", "I received a consolidated eLA, what should I do?", "I received a notice for presentation/submission of documents.", "I received a reminder before subpoena.") — each is intercepted by a pre-existing, out-of-scope Philippine-tax-domain-boundary check in `pipeline.js` that runs before the Step 12.65 controlled-LOA gate and rejects/redirects queries lacking a recognizable Philippine-tax/BIR keyword, so the controlled-LOA gate is never reached. Confirmed via isolated `evaluateControlledLoaAskGate()` calls that the gate itself classifies all 4 affected queries correctly — the failure is upstream of the gate, not in the gate's own logic.
- Excluded unsafe query smoke evidence: all 12 mandated excluded queries **PASS** — none trigger the controlled safe LOA answer on live staging.
- Unrelated query non-trigger evidence: all 5 mandated unrelated queries **PASS** — none trigger the controlled LOA branch on live staging.
- Runtime/security smoke evidence: all **PASS** — `/health` returns `200` (`{"status":"ok","service":"tina-backend"}`); `OPTIONS /ask` returns `204` with CORS methods header present; unauthenticated `POST /ask` returns `401` (`{"error":"Authentication required"}`); `/routes` returns `404` (not exposed).

## Boundary Evidence

- Source-card/citation discipline evidence: source-card verification remains `not_performed`; legal citation allowed remains `false`; no verified controlling authority claim is made in any live response observed, including the 4 passing safe queries.
- Response shape/metadata evidence: the live `/ask` response does not forward an explicit `controlledLoaAnswer` metadata object to the client; the controlled branch is externally observable only via `responseType: "controlled_loa_answer"` and the composed answer text, both of which were verified directly against live responses. `sourceCardVerification: not_performed`, `legalCitationAllowed: false`, `filingReadyDocumentGenerated: false`, and `automaticSubmission: false` all hold for every triggered response observed.
- Runtime scope boundary evidence: this phase adds only fixture/report/test/state evidence.
- External operation boundary evidence: no external search, live retrieval, scraping, download, ingestion, embedding, database writes, or authority retrieval performed.
- Privacy boundary evidence: no real taxpayer data, secrets, auth tokens, or raw auth headers included.
- Legal-safety boundary evidence: no final legal conclusions; no filing-ready output; no automatic submission; human tax/legal review remains required.
- Production boundary evidence: no production activation and no production deployment changes.
- Future 09ZC production activation gate boundary: do not proceed to 09ZC until this staging smoke passes.
- Phase 10 boundary: broader evaluation/fact-check/legal-tax QA remains a separate alternative phase.
- Authority ingestion boundary: deferred unless separately approved.
- Memory/persistence boundary: no memory activation and no persistence.
- MCP deferral evidence: MCP remains deferred until after final planned phase.
- Mobile app deferral evidence: mobile app remains deferred until after Phase 13.

## Impact Statements

Runtime impact: Staging smoke only.
Ask-handler impact: None.
Pipeline implementation impact: None.
Route impact: None.
Server impact: None.
Feature flag impact: Staging flag required.
Memory impact: None.
Persistence impact: None.
External search impact: None.
Live retrieval impact: None.
Scraping/download/ingestion impact: None.
Database/embedding impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.
Production impact: None.
Filing-ready document impact: None.
Automatic submission impact: None.
Live staging LOA /ask behavior verified: FAIL.

## Validation Summary

- Local static/unit harness added.
- Live staging smoke is optional and gated by `RUN_TINA_STAGING_SMOKE=true`, `TINA_STAGING_ASK_URL`, `TINA_STAGING_AUTH_HEADER_NAME`, and `TINA_STAGING_AUTH_HEADER_VALUE`.
- If live smoke is requested without staging URL/auth, the test fails with `BLOCKED_PENDING_STAGING_ACCESS`.
- If live smoke is not requested, local static/unit checks run and the test reports that live staging smoke was skipped.
- Rerun pre-checks: branch `feature/source-availability-engine-v1`, sync `0 0`, latest commit before rerun `57ba035`.
- Rerun env presence check: required live staging env vars were missing; no secret values were printed or committed.
- Rerun local static test: `node tests/phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs` - PASS / 7 / 0 / 44; live staging smoke skipped because required staging env vars were not provided.
- Rerun missing-access live gate: `RUN_TINA_STAGING_SMOKE=true` without URL/auth env vars failed as expected with `BLOCKED_PENDING_STAGING_ACCESS`.
- Second rerun pre-checks: branch `feature/source-availability-engine-v1`, sync `0 0`, latest commit before second rerun `71851c4`.
- Second rerun local static test: `node tests/phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs` - PASS / 7 / 0 / 44; live staging smoke skipped because required staging env vars were not provided.
- Second rerun missing-access live gate: `RUN_TINA_STAGING_SMOKE=true` without URL/auth env vars failed as expected with `BLOCKED_PENDING_STAGING_ACCESS`.
- Live `.env` rerun pre-checks (x-index-secret attempt): branch `feature/source-availability-engine-v1`, sync `0 0`, latest commit before rerun `fde5e39`; `.env` confirmed ignored and untracked.
- Live `.env` rerun (x-index-secret attempt): `node tests/phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs` loaded `.env` and attempted staging `/ask`; the authenticated safe LOA query did not return 2xx.
- Sanitized auth evidence (x-index-secret attempt): authenticated POST `/ask` with the configured header returned `401`; unauthenticated POST `/ask` also returned `401`; no secret values were printed or committed.
- Access conclusion (x-index-secret attempt): blocked because the provided `x-index-secret` header was not accepted by the deployed `/ask` route auth path.
- Live `.env` rerun pre-checks (Authorization Bearer JWT attempt): branch `feature/source-availability-engine-v1`, sync `0 0`, latest pushed commit `fde5e39`; `.env` confirmed ignored and untracked before and after the auth-method switch.
- Live `.env` rerun (Authorization Bearer JWT attempt): auth method switched to `Authorization: Bearer <staging JWT>` per instruction. Authenticated `/debug/db-identity` returned `200` and confirmed the deployed staging commit `fde5e3968259fe6be050bd2fb33a6651569b504e` (at or later than the required `23eb7dd`). Authenticated POST `/ask` returned `200`. Unauthenticated POST `/ask` returned `401` as expected. No secret value was printed or committed at any point.
- Full smoke matrix run against live staging with the working Authorization Bearer JWT: 4 of 8 mandated safe queries PASS (full controlled procedural content, no filing-ready/automatic-submission/verified-citation language), 4 of 8 FAIL to trigger the controlled branch at all; all 12 excluded queries PASS (controlled branch correctly not triggered); all 5 unrelated queries PASS (controlled branch correctly not triggered); all runtime/security checks PASS (`/health` 200, `OPTIONS /ask` 204, unauthenticated `POST /ask` 401, `/routes` 404).
- Root cause of the 4 safe-query failures: a pre-existing, out-of-scope `detectPhilippineTaxBoundary()` check in `pipeline.js`, invoked well before the Step 12.65 controlled-LOA gate, intercepts queries that lack a recognizable Philippine-tax/BIR keyword and returns a generic fallback before the gate is ever reached. Confirmed via isolated `evaluateControlledLoaAskGate()` calls that the gate's own classification logic is correct for all 4 affected queries — this is not a bug introduced by 09ZA/09ZB.
- `node tests/phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs` - 6 passed / 1 failed / 124 assertions; the single failing test is the live staging smoke block, which fails at the first unmet safe-query assertion as designed (reproducible: confirmed failing consistently on repeated runs).
- Post-09ZE rerun pre-checks: branch `feature/source-availability-engine-v1`, sync `0 0`, latest local commit before rerun `339c448`.
- Post-09ZE deploy pre-check: authenticated `/debug/db-identity` returned `200` with deployed commit `339c448aee0188ffd62beecc126567ee6a30a6b7` on `tina-backend-staging`; no secret value was printed.
- Post-09ZE live smoke command: `node tests/phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs` - FAIL / 6 passed / 1 failed / 120 assertions. The first failing assertion was `safe variant triggers controlled LOA branch: I received a replacement eLA, what should I check first?`.
- Post-09ZE sanitized safe matrix probe: 4 of 8 safe queries returned `responseType: "controlled_loa_answer"`; replacement eLA, consolidated eLA, notice for presentation/submission, and reminder before subpoena returned the generic Philippine-tax fallback with no controlled response type.
- `node tests/phase-09za-controlled-loa-answer-ask-wiring-implementation-1.test.mjs` - PASS / 20 / 0 / 273.
- `node tests/phase-09z-controlled-loa-answer-ask-wiring-gate-1.test.mjs` - PASS / 25 / 0 / 320.
- `node tests/phase-09y-controlled-loa-answer-runtime-wiring-scaffold-1.test.mjs` - PASS / 30 / 0 / 629.
- `node tests/phase-09x-controlled-loa-answer-runtime-wiring-design-1.test.mjs` - PASS / 30 / 0 / 180.
- `node tests/phase-09-gate-closure-1.test.mjs` - PASS / 29 / 0 / 1620.
- `npm run guard:files` - PASS.

## Decision

PHASE 09ZB CONTROLLED LOA ANSWER STAGING SMOKE FAIL

## Strict Recommendations

1. Do not proceed to 09ZC. The controlled-LOA gate implementation itself is correct, but 4 of 8 mandated real-world safe phrasings never reach it on live staging.
2. Root cause: a pre-existing, out-of-scope Philippine-tax-domain-boundary check in `pipeline.js` runs before the Step 12.65 controlled-LOA gate and rejects queries lacking a recognizable Philippine-tax/BIR keyword (e.g. "replacement eLA", "consolidated eLA", "notice for presentation", "reminder before subpoena").
3. Scope a dedicated follow-up patch to remediate this gap — either move the controlled-LOA gate earlier than the domain-boundary check, or extend the domain-boundary keyword list to recognize eLA/subpoena/notice-for-presentation phrasing without a literal BIR/LOA token. This is out of scope for 09ZB's allowed file list (`pipeline.js` and the domain-boundary service are not included).
4. Do not enable production until the full 8-query safe smoke matrix passes on staging.
5. All other smoke dimensions (excluded queries, unrelated queries, runtime/security) are clean and do not need remediation.

## Next Task

Resolve domain-boundary gap and rerun PHASE-09ZB-CONTROLLED-LOA-ANSWER-STAGING-SMOKE-1.

## Alternative Next Phase

PHASE 10 -- Evaluation / Fact-Check / Legal-Tax QA System.
