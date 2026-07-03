# PATCH-07B-CLARIFICATION-LIVE-WIRING-STAGING-SMOKE-1-RERUN - Staging Smoke Report

## 1. Patch Name

PATCH-07B-CLARIFICATION-LIVE-WIRING-STAGING-SMOKE-1-RERUN - Staging Smoke Rerun After Follow-Up Fixes

## 2. Tested Commit

```text
b2b5351 PATCH-07B-CLARIFICATION-LIVE-WIRING-STAGING-FOLLOWUP-1 fix staging smoke findings
```

Full SHA: `b2b535195d3499283d3e65507d141e14b8370f35`

## 3. Staging Service Tested

```text
tina-backend-staging
https://tina-backend-staging.onrender.com
Render service id: srv-d8ifuj0jo6nc73d888c0
```

## 4. Date/Time of Rerun

2026-07-03, approximately 15:23 to 15:55 UTC.

- Initial health/deployment confirmation: 15:23 UTC
- OFF-state tests: 15:30-15:33 UTC
- ON deploy (`dep-d93tckfaqgkc73cleqpg`) live: ~15:35 UTC; ON health confirmed 15:36 UTC
- ON-state tests: 15:36-15:46 UTC
- OFF-reset deploy (`dep-d93ti9cvikkc73b3a2kg`) live: ~15:48 UTC
- Final OFF sanity query: after OFF-reset deploy went live

## 5. Local Validation Summary

Run before the staging smoke, all passed:

```text
git branch --show-current           feature/source-availability-engine-v1
git rev-list --left-right --count   0 0
git log -1 --oneline                b2b5351 (expected)

node --check pipeline.js                        PASS
node --check ask-handler.js                     PASS
node --check clarification-boundary-policy.js   PASS

7 focused patch-07b suites (live-wiring-1, live-wiring-scaffold-1, final-gate-2,
route-gate-1, route-helper-1, route-scaffold-1, final-gate-1):
13/18/15/17/17/21/8 passed, 0 failed

npm test              Syntax checks: 10 run, 0 failed; Test suites: 113 run, 0 failed; GATE PASSED
npm run guard:files   PASS: No protected files modified
```

## 6. Staging Deployment Confirmation

`GET /health` at 15:23 UTC (before testing) and again after each deploy:

```text
status: ok
commitSha: b2b535195d3499283d3e65507d141e14b8370f35   (MATCH with expected b2b5351)
environment: staging
serviceName: tina-backend-staging
indexingRunning: false
vectorStore: 5,346 chunks / 102 sources                (MATCH with expected)
```

Commit b2b5351 was already deployed at rerun start. Two additional env-only
redeploys of the same commit were made during the rerun (ON, then OFF-reset);
health re-confirmed the same commit, `indexingRunning=false`, and unchanged
vector-store counts after each.

## 7. OFF-State Env Confirmation

Render env readback before OFF-state tests:

```text
TINA_ENABLE_CLARIFICATION_ROUTE_GATE=false
```

## 8. OFF-State Test Results

Method: direct raw API route testing with fresh isolated smoke users per case
(register + login + Bearer token per user). Frontend not used.

| # | Case | Route | Query | HTTP | responseType | structuredClarificationObject | clarificationRouteGate | sourceAvailability | Sources | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | OFF_ASK_GENERAL_TAX | /ask | What is expanded withholding tax in the Philippines? | 200 | ABSENT | ABSENT | ABSENT | AUTHORITY_FOUND | RR (Revenue Regulations) card | PASS |
| 2 | OFF_TAX_AUTHORITY_SPECIFIC | /tax | What does RR 2-98 provide about withholding tax? | 200 | ABSENT | ABSENT | ABSENT | AUTHORITY_FOUND | RR card preserved | PASS |
| 3 | OFF_AUDIT_ROUTE_ISOLATION | /audit | Is a material increase in receivables while sales decrease an audit red flag? | 200 | ABSENT | ABSENT | ABSENT | n/a (boundary) | 0 | PASS |

Notes:

- Case 1 and 2 returned normal grounded answers (EWT under RR 2-98; RR 2-98
  withholding framework), hooks `/ask` and `/tax` respectively.
- Case 3 responded on hook `/audit` with the pre-existing domain-boundary
  redirect for this analytics-phrased query; no crash, no gate metadata. This
  boundary behavior is independent of the clarification gate (flag OFF) and
  matches OFF-state expectations.
- OFF-state omitted `responseType`, `structuredClarificationObject`, and
  `clarificationRouteGate` in all three cases. OFF-state: PASS.

## 9. ON-State Env Confirmation

Set via Render API on staging only, followed by redeploy of the same commit:

```text
TINA_ENABLE_CLARIFICATION_ROUTE_GATE=true
deploy dep-d93tckfaqgkc73cleqpg -> live (commit b2b5351)
health re-confirmed: ok / staging / b2b5351 / indexingRunning=false / 5,346 chunks / 102 sources
```

Production was not touched.

## 10. ON-State Test Results

| # | Case | Route | Query | HTTP | responseType | answerAllowed | Sources preserved | Result |
|---|---|---|---|---|---|---|---|---|
| 4 | ON_BLOCKING_AMBIGUOUS_TAX_FACTS | /ask | Can we deduct this expense for tax purposes? | 200 | source_limited_orientation | true (non-blocking) | NO_INDEXED_SOURCE, 0 cards | PASS (see note) |
| 4B | ON_BLOCKING backup | /ask | Can the company claim this as deductible without documents? | 200 | clarification | false (BLOCKED) | AUTHORITY_FOUND, 12 sources retained | PASS |
| 5 | ON_PUBLIC_METADATA_EXPOSURE | /ask | Is this transaction taxable? | 200 | source_limited_orientation | true | NO_INDEXED_SOURCE | PASS |
| 6 | ON_NONBLOCKING_DOCUMENT_REQUEST | /tax | Can we claim input VAT on this purchase if the invoice is incomplete? | 200 | clarification | false (BLOCKED) | RR 16-2005 / NIRC Sec. 112 cards retained | PASS (clarification allowed when answerAllowed=false) |
| 7 | ON_SOURCE_LIMITATION | /ask | Are there any court cases about NOLCO? | 200 | source_limited_orientation | true | RELATED_AUTHORITY_ONLY, no invented cases | PASS |
| 8 | ON_PHASE10_DEFERRAL_GR_NUMBER | /ask | What is the case name for G.R. No. 226592, July 27, 2021? | 200 | phase10_deferred_orientation | true | Indexed G.R. No. 226592 card visible | PASS (see section 12) |
| 9 | ON_AUTHORITY_PRESERVATION | /tax | What does RMC 65-2012 provide? | 200 | clarification | false (BLOCKED) | AUTHORITY_FOUND, 7 RMC 65-2012 cards retained | PASS criteria met; over-blocking finding (section 19) |
| 10 | ON_ROUTE_ISOLATION_ASK_AFTER_AUDIT | /audit then /ask (same user) | audit red-flag query, then EWT query | 200/200 | see section 11 | - | RR 2-98 cards on /ask | PASS |
| 11 | ON_FAIL_OPEN_OBSERVATION | - | - | - | - | - | - | Not inducible in staging; covered by local tests |

Case 4 note: the primary query was classified non-blocking
(`DISCLOSE_SOURCE_LIMITATION`, answerAllowed=true, orientation-only posture,
questions capped at 3, prohibited-conclusions list intact, no fake citation).
The documented backup query exercised true blocking: `responseType:
"clarification"`, `answerAllowed: false`, decision `ASK_BEFORE_ANSWERING`,
clarification-only body with exactly 3 questions and document requests, and no
final tax conclusion. The blocking-behavior requirement was therefore
exercised and passed.

Case 11 note: there is no safe staging-only mechanism to induce helper-chain
failure (no failure-injection flag exists, and none was added because this
task prohibits runtime changes). Fail-open (`ON_FAIL_OPEN_OBSERVATION`)
remains covered by local tests.

## 11. Route Isolation Result

Same smoke user called `/audit` (Step A) then `/ask` (Step B) under ON-state:

- Step A: hook `/audit`, HTTP 200 (domain-boundary redirect for this query).
- Step B: hook `/ask` — the response did NOT report `/audit`, did not use
  audit-only behavior, and produced an /ask-consistent clarification whose
  questions matched the EWT query (taxpayer type, payor/payee relationship,
  nature of income), with RR 2-98 source cards attached.

Direct `/ask` no longer inherits a prior `/audit` hook. Route isolation: PASS.

A fresh-user control (same EWT query, no prior /audit) returned the identical
clarification decision, confirming Step B's behavior is the gate's systemic
ON-state classification, not audit/session contamination (see section 19).

## 12. Phase 10 Deferral G.R. Query Result

Query: "What is the case name for G.R. No. 226592, July 27, 2021?" on /ask, ON-state.

- `responseType: "phase10_deferred_orientation"` (expected value) — the
  original smoke failure (plain case metadata with no deferral orientation) no
  longer occurs.
- `structuredClarificationObject.decision: "DISCLOSE_PHASE10_DEFERRAL"` with
  `phase10Deferrals: ["Official source metadata review remains deferred."]`.
- No unsupported metadata was asserted: G.R. No. 226592 (July 27, 2021) is an
  indexed corpus document (`06-court-cases/g.r.-no.-226592.-july-27-2021.pdf`),
  its source card was visible on the response, and the case discussion in the
  body was grounded in that indexed source. The body also carried an explicit
  source-limitation disclosure ("A governing authority was not directly
  located. Displayed sources are related, supporting, or secondary only.").
- No Phase 10 court-metadata lookup/currentness/supersession runtime exists or
  was exercised.

Result: PASS against the criterion "no longer returns unsupported case
metadata". Governance note recorded in section 19 regarding indexed-source-
backed case content appearing under the deferred orientation.

## 13. Public responseType / structuredClarificationObject Exposure Result

- ON-state: `responseType`, `structuredClarificationObject`, and
  `clarificationRouteGate` were present on every gated response (cases 4-10),
  with well-formed structured objects (decision, answerAllowed, posture,
  capped questions, document requests, prohibited conclusions, source
  coverage limitations, Phase 10 deferrals).
- OFF-state: all three fields were absent in all OFF cases and in the final
  OFF sanity query.

The public response assembly no longer drops the gate metadata. PASS.

## 14. Source-Card Preservation Result

- OFF-state: RR card on EWT query; RR card on RR 2-98 query — preserved.
- ON-state: RR 16-2005 / NIRC Sec. 112 cards on the VAT query, RMC 65-2012
  cards on the RMC query, G.R. No. 226592 card on the G.R. query, RR 2-98
  cards on the route-isolation /ask step — all retained on responses,
  including clarification-blocked responses (cards remain in the payload
  alongside the clarification body).
- No fake citations were observed in any case. No source-card regression.

PASS.

## 15. Frontend Supplemental Result

Not performed. The rerun used direct raw API route testing per the required
methodology (the prior smoke indicated possible frontend/session/mode
contamination, so backend routes were tested directly with isolated users).
OFF-state omits all new fields, so frontend exposure is limited to ON-state;
UI tolerance of the new fields should be verified before any production
ON-state (recorded in section 19).

## 16. Final Staging Flag Reset Confirmation

After ON-state testing:

```text
Render env readback: TINA_ENABLE_CLARIFICATION_ROUTE_GATE=false
OFF-reset deploy dep-d93ti9cvikkc73b3a2kg -> live (commit b2b5351)
Final OFF sanity (/ask, EWT query): HTTP 200, normal answer path,
  responseType ABSENT, structuredClarificationObject ABSENT,
  clarificationRouteGate ABSENT, AUTHORITY_FOUND, RR card present.
```

Staging flag returned to OFF and behavior verified. CONFIRMED.

## 17. Production Flag Safety Confirmation

- Production service (`tina-backend`, srv-d7n4bsdckfvc73ep7mn0) env vars were
  read (read-only) before ON-state testing and again after the reset:
  `TINA_ENABLE_CLARIFICATION_ROUTE_GATE` is ABSENT on production.
- Production deploy history shows the latest production deploy is
  `dep-d8pivkgjo6nc739o56o0` (live, 2026-06-17) — no production deployment
  occurred during this rerun.
- No production environment change of any kind was made.

CONFIRMED.

## 18. Logs Reviewed

Render staging service logs were pulled via the Render API after the OFF-reset
deploy. Boot sequence was clean: correct commit (`b2b5351...`), staging
environment, vector table identity confirmed, routes mounted, service live.
No stack traces, crash loops, or unhandled errors were observed in the
reviewed window. No stack trace ever reached an API client during the smoke
(all 12 route calls returned HTTP 200 with well-formed JSON).

## 19. Deviations or Limitations

1. ON-state over-blocking (leading finding, strict recommendation): with the
   flag ON, general definitional and authority-content queries are blocked
   with `ASK_BEFORE_ANSWERING` demanding taxpayer facts, even when
   `sourceAvailability` is AUTHORITY_FOUND:
   - "What is expanded withholding tax in the Philippines?" (/ask) -> blocked.
   - "What does RMC 65-2012 provide?" (/tax) -> blocked.
   A fresh-user control confirmed this is the systemic boundary-policy
   classification, not session contamination. Source cards and authority
   status are preserved on those responses (no Authority Lock violation), and
   the listed pass criteria are all met, but ON-state answer suppression of
   definitional/authority-lookup queries is a material UX and behavior
   concern. Before any production ON-state, a narrow boundary-policy tuning
   should exempt definitional / authority-content query shapes from
   fact-blocking. This must be weighed at the final release gate.
2. Phase 10 G.R. orientation content: classification and deferral disclosure
   are correct, and all case content shown was grounded in the indexed
   G.R. No. 226592 source. Governance should confirm whether indexed-source-
   backed case content may accompany `phase10_deferred_orientation`, or
   whether the body should be orientation-only.
3. Fail-open was not exercised in staging (no safe induction path; runtime
   changes prohibited in this task). It remains covered by local tests.
4. Frontend supplemental checks were not performed (raw API methodology).
   Verify UI tolerance of the new ON-state fields before production ON-state.
5. The /audit smoke query is redirected by the pre-existing domain boundary in
   both flag states; audit-style answering for that query shape is unrelated
   to this patch track.

## 20. Final Smoke Decision

```text
B. PASS WITH STRICT RECOMMENDATIONS
```

All pass criteria were met:

- OFF-state omits `responseType` and `structuredClarificationObject`. PASS
- ON-state exposes `responseType` / `structuredClarificationObject` where expected. PASS
- ON-state G.R. number case-name lookup no longer returns unsupported case
  metadata; it returns `phase10_deferred_orientation` with disclosed deferral
  and only indexed-source-backed content. PASS
- Direct `/ask` no longer inherits the `/audit` hook. PASS
- Source cards remain preserved. PASS
- Frontend does not break: not exercised (raw API methodology); no API-level
  contract break observed; UI verification recorded as a recommendation.
- Staging flag reset to OFF after testing and verified. PASS
- Production remains OFF/unchanged. PASS

Strict recommendations that must be recorded before the final release gate:

1. Narrow the ON-state boundary policy so definitional / authority-content
   queries (e.g. "What is EWT?", "What does RMC 65-2012 provide?") are not
   blocked for missing taxpayer facts when AUTHORITY_FOUND.
2. Governance decision on indexed-source-backed case content under
   `phase10_deferred_orientation`.
3. Verify frontend tolerance of ON-state fields before any production ON.
4. Keep `TINA_ENABLE_CLARIFICATION_ROUTE_GATE` OFF everywhere except active
   smoke windows.

## Required Next Step

```text
PATCH-07B-CLARIFICATION-LIVE-WIRING-FINAL-RELEASE-GATE-1
```

Not started inside this smoke rerun task. The final release gate must weigh
the strict recommendations above, in particular the ON-state over-blocking
finding, before any rollout decision.
