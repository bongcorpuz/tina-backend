# PHASE-10A1-CANONICAL-TRUST-CONTRACT-AND-API-FORWARDING-REMEDIATION-1

## A. Branch / starting commit

Branch: `feature/source-availability-engine-v1`
Starting commit: `32d3af553108b9db7ad3a44af072b9fcecaa754b` (PHASE-10A record independent review correction)
Code commit produced by this task: `c32feacce0d1a0fce1a30577a0e4584fe53d5c1c`

## B. Files inspected before implementation

`ask-handler.js` (both response-construction locations that build client-visible payloads), `pipeline.js` (`runPipeline`, `buildControlledLoaAskEarlyExitResponse`, `classifySourceAvailability`/SAE states, `ctx.conflictAnalysis`), `answer-renderer.js` (`applyVerifiedAuthorityGate`, `buildConflictMetadataBlock`, `getConflictMetadata`, `containsConflictLanguage`), `final-answer-compliance.js` (`validateConflictLabel`, `sanitizeConflictSection`, `normalizeConflictStatus`), `services/controlled-loa-legal-conclusion-safety.js` (`buildControlledLoaLegalConclusionLimitationResponse`), the prior `PHASE-10A-TRUST-LIMITATION-AUTHORITY-CONFIDENCE-RELEASE-GATE-1` fixture/report/test, and `knowledge/CURRENT_STATE.md`.

Exhaustive grep for `controlledLoaAnswer`, `controlled_loa_answer`, `controlled_loa_legal_conclusion_restricted`, `buildControlledLoaAskEarlyExitResponse`, `buildControlledLoaLegalConclusionLimitationResponse` inside `ask-handler.js` returned zero matches, confirming that both controlled-LOA-shaped responses are ultimately rendered through the same single `payload` object construction ask-handler.js already uses for every non-domain-boundary response -- there is no third, separate early-return path for these response types.

## C. Trust-contract design

`services/trust-contract.js` exports `buildTrustContract(result)`, a pure function with no I/O, no mutation, and no external/model calls. It derives, in order: `responseKind` -> `sourceState` -> `hasConflict` -> `authoritySupport` -> `legalConclusion` -> `humanReviewRequired` -> `filingReadyDocumentGenerated` -> `automaticSubmission` -> `limitations`, then runs a final `enforceInvariants()` pass that defensively re-asserts every required invariant regardless of how the candidate values were derived.

Categorical enums (`AUTHORITY_SUPPORT_VALUES`, `SOURCE_STATE_VALUES`, `LEGAL_CONCLUSION_VALUES`, `RESPONSE_KIND_VALUES`) are exported alongside the function for direct test verification. No numeric confidence value appears anywhere in the module.

## D. Field-mapping table

| trust field | Derived from | Notes |
|---|---|---|
| `responseKind` | `result.responseType` (`controlled_loa_answer` / `controlled_loa_legal_conclusion_restricted`), `result.domainBoundary`, `result.internalError`/`retrievalTimedOut`, else `sourceStatus`/`sourceAvailability`/`saeStatus` | `CONTROLLED_PROCEDURAL`, `RESTRICTED_LEGAL_CONCLUSION`, `DOMAIN_BOUNDARY`, `FALLBACK`, `GENERAL_TAX`, or `UNKNOWN` |
| `sourceState` | `result.sourceStatus` / `sourceAvailability` / `saeStatus`, forced to `NOT_APPLICABLE` for controlled-procedural/restricted/domain-boundary kinds | Verbatim SAE category when meaningful |
| `hasConflict` | `result.conflict?.hasConflict` or `result.conflictAnalysis?.hasConflict` (the existing, already-deterministic Four-Part Doctrine Test result) | Never inferred from source count |
| `authoritySupport` | `hasConflict` first, then `sourceState`, then `displayedSourceCount` for `AUTHORITY_FOUND` | `AUTHORITY_FOUND` + displayed cards > 0 -> `VERIFIED_CONTROLLING` (AUTHORITY_FOUND is only reachable via governing-authority cards surviving the SAE eligibility filter); `VERIFIED_SUPPORTING` is defined but not currently reachable -- see known limitation below |
| `legalConclusion` | `responseKind` | `RESTRICTED_LEGAL_CONCLUSION`->`RESTRICTED`, `GENERAL_TAX`->`ALLOWED`, `CONTROLLED_PROCEDURAL`/`DOMAIN_BOUNDARY`->`NOT_APPLICABLE`, else `UNKNOWN` |
| `humanReviewRequired` | `result.controlledLoaAnswer?.requiresHumanReview`, else true for `RESTRICTED_LEGAL_CONCLUSION`/`CONTROLLED_PROCEDURAL`, else false | |
| `filingReadyDocumentGenerated` | `result.controlledLoaAnswer?.filingReadyDocumentGenerated`, default false | |
| `automaticSubmission` | `result.controlledLoaAnswer?.automaticSubmission`, default false | |
| `limitations` | short categorical codes: `CONFLICTING_AUTHORITY`, the unsafe `sourceState` code, `RELATED_AUTHORITY_ONLY`, or `FALLBACK` | No free-text wording |

**Known, documented limitation:** the runtime does not expose a field distinguishing "verified supporting" from "verified controlling" authority within `AUTHORITY_FOUND`. Inventing a heuristic split was judged to violate this task's explicit prohibition on inventing semantics not backed by runtime evidence, so `VERIFIED_SUPPORTING` remains defined in the enum but unreachable until the runtime exposes that distinction.

## E. Files created / modified

Created:
- `services/trust-contract.js`
- `evaluation/fixtures/phase-10a1-canonical-trust-contract-and-api-forwarding-remediation-1.fixture.json`
- `tests/phase-10a1-canonical-trust-contract-and-api-forwarding-remediation-1.test.mjs`
- `PHASE-10A1-CANONICAL-TRUST-CONTRACT-AND-API-FORWARDING-REMEDIATION-1_REPORT.md` (this file)

Modified:
- `ask-handler.js` -- one new import line, plus two additive insertion points:
  1. The main `payload` object inside `handleControlledRagRoute` (~line 2232) gains `trust: buildTrustContract({...result, displayedSourceCount, sourceStatus})`, built from the same resolved `displayedSourceCount`/`sourceStatus` values the rest of `payload` already uses, so `trust` stays internally consistent with the sibling fields in the same response (Invariant 8).
  2. The Philippine Tax Domain Boundary early-return response (~line 3029) gains `trust: buildTrustContract({ domainBoundary: true, sourceStatus: _boundaryStatus })`.
- `knowledge/CURRENT_STATE.md` -- new PHASE-10A1 entry appended (does not mark Phase 10A complete).

No other file was modified. `pipeline.js`, `answer-renderer.js`, `final-answer-compliance.js`, `conflict-engine.js`, `server.js`, `services/controlled-loa-legal-conclusion-safety.js`, `services/controlled-loa-audit-procedure-boundary.js`, `workflow/controlled-loa-answer-runtime-scaffold.js`, `.env`, and `package.json` are unchanged.

## F. Local test commands + results

```
node tests/phase-10a1-canonical-trust-contract-and-api-forwarding-remediation-1.test.mjs
```
Result: 18/18 test blocks pass, 130+ assertions. Directly executes the real `buildTrustContract()` against all 15 material response paths and additional invariant edge cases from the fixture, plus dedicated tests for verified-authority mapping, unsafe source states, restricted conclusions, controlled-procedural responses, conflict independence from source count, domain boundary, legacy/missing-field safety (never throws, never mutates input), and static verification that `ask-handler.js` actually calls `buildTrustContract` at both response-construction locations while preserving pre-existing fields.

## G. Regression results

| Suite | Result | Note |
|---|---|---|
| `phase-10a-trust-limitation-authority-confidence-release-gate-1.test.mjs` | 17/18 | 1 failure is that task's own "no runtime file changed since its checkpoint" self-check; no functional assertion failed |
| `patch-024c-verified-authority-gate.test.mjs` | 133/133 | pass |
| `patch-06f-005-exact-source-limitation-wording.test.mjs` | 10/10 | pass |
| `patch-07a-003-authority-state-response-policy-and-gate-compatibility.test.mjs` | 18/18 | pass |
| `patch-07a-008-source-limitation-mode-boundary-hardening.test.mjs` | 23/23 | pass |
| `phase-09z-controlled-loa-answer-ask-wiring-gate-1.test.mjs` | 24/25 | same self-referential diff-scope class |
| `phase-09zh-controlled-loa-live-path-remediation-1.test.mjs` | 20/20 | pass |
| `phase-09zi-controlled-loa-unsafe-legal-wording-remediation-1.test.mjs` | 20/22 | same self-referential diff-scope class (2 checks) |
| `phase-09-gate-closure-2.test.mjs` | 10/11 | same self-referential diff-scope class |
| `patch-025a-rev3-ask-handler-mapper.test.mjs` | 16/16 | pass |

Every failure above is the same class as the previously-classified 09ZF historical test debt: an earlier phase's own assertion that `ask-handler.js` must remain byte-identical to that phase's historical checkpoint, which necessarily breaks the moment any later, authorized, additive change touches that file again. No behavioral/functional assertion failed in any suite.

## H. Staging validation matrix

Service: `tina-backend-staging` only. Production was never called. Credentials read from local `.env` and never printed. Commit validated: `c32feac`.

| # | Category | Query | HTTP | responseType | sourceStatus | trust present | trust summary | Consistent w/ answer | PASS/FAIL |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Controlled LOA procedural | "How do I prepare a Letter of Authority for a BIR audit?" | 200 | `controlled_loa_answer` | AUTHORITY_FOUND | yes | responseKind CONTROLLED_PROCEDURAL, humanReviewRequired true, filing/auto false, authority/source/legal NOT_APPLICABLE | yes | PASS |
| 2 | Restricted legal-conclusion | "Is my Letter of Authority void because it was not served within 30 days?" | 200 | `controlled_loa_legal_conclusion_restricted` | RELATED_AUTHORITY_ONLY | yes | legalConclusion RESTRICTED, humanReviewRequired true, filing/auto false | yes | PASS |
| 3 | Verified statutory authority | "What is the VAT rate under the NIRC as amended by the TRAIN law?" | 200 | null | AUTHORITY_FOUND | yes | hasConflict true, authoritySupport CONFLICTING_AUTHORITY (see note below) | yes | PASS |
| 4 | Related authority only | "Is there jurisprudence on withholding tax and lease payments?" | 200 | null | RELATED_AUTHORITY_ONLY | yes | authoritySupport RELATED_AUTHORITY_ONLY, limitations ["RELATED_AUTHORITY_ONLY"] | yes | PASS |
| 5 | General tax | "What is the difference between input VAT and output VAT?" | 200 | null | AUTHORITY_FOUND | yes | hasConflict true, authoritySupport CONFLICTING_AUTHORITY (see note below) | yes | PASS |
| 6 | Non-tax domain boundary | "What is the capital of France?" | 200 | null (domainBoundary:true) | DOMAIN_BOUNDARY_REJECT | yes | responseKind DOMAIN_BOUNDARY, everything NOT_APPLICABLE/false/[] | yes | PASS |
| 7 | Safe fallback / no authority | "Is this taxable?" | 200 | null | NO_INDEXED_SOURCE | yes | responseKind FALLBACK, authoritySupport NO_VERIFIED_AUTHORITY, limitations ["NO_INDEXED_SOURCE"] | yes | PASS |

Note on #3/#5: the pipeline's internal conflict analysis (`ctx.conflictAnalysis`/`result.conflict`) flagged `hasConflict: true` for both queries. This is the existing, pre-existing Four-Part Doctrine Test's own determination -- it was previously invisible to API consumers because `ask-handler.js`'s public payload never exposed a top-level `conflict` field before this task. `buildTrustContract` forwards it faithfully; conflict-engine.js was not touched, re-evaluated, or second-guessed. Flagged as a known unresolved observation for separate investigation (see section L), not remediated here.

An initial run showed 2/7 queries (#1, #2) without `trust` present; retesting after allowing full Render instance rollout to complete showed `trust` present consistently across 3 repeated attempts for both. This was a deploy-propagation artifact, not a code defect -- confirmed by exhaustive grep showing no separate, unpatched response-construction path exists for those response types.

## I. API payload examples (secrets removed)

```json
{
  "responseType": "controlled_loa_legal_conclusion_restricted",
  "sourceStatus": "RELATED_AUTHORITY_ONLY",
  "trust": {
    "version": "1.0",
    "authoritySupport": "NOT_APPLICABLE",
    "sourceState": "NOT_APPLICABLE",
    "legalConclusion": "RESTRICTED",
    "humanReviewRequired": true,
    "filingReadyDocumentGenerated": false,
    "automaticSubmission": false,
    "hasConflict": false,
    "limitations": [],
    "responseKind": "RESTRICTED_LEGAL_CONCLUSION"
  }
}
```

```json
{
  "responseType": null,
  "sourceStatus": "NO_INDEXED_SOURCE",
  "trust": {
    "version": "1.0",
    "authoritySupport": "NO_VERIFIED_AUTHORITY",
    "sourceState": "NO_INDEXED_SOURCE",
    "legalConclusion": "UNKNOWN",
    "humanReviewRequired": false,
    "filingReadyDocumentGenerated": false,
    "automaticSubmission": false,
    "hasConflict": false,
    "limitations": ["NO_INDEXED_SOURCE"],
    "responseKind": "FALLBACK"
  }
}
```

## J. Backward-compatibility result

All previously existing top-level fields (`responseType`, `sourceStatus`, `sourceAvailability`, `saeStatus`, `sourceCards` and related fields, `domainBoundary` and related fields, `answer`, `sources`, etc.) are unchanged in both static source review and live staging responses. `trust` is the only new top-level field. `requiresHumanReview`/`filingReadyDocumentGenerated`/`automaticSubmission` are forwarded inside `trust` (as `humanReviewRequired`/`filingReadyDocumentGenerated`/`automaticSubmission`) rather than as new duplicate top-level fields, per this task's stated preference -- no compatibility requirement forces separate top-level exposure, and this avoids introducing redundant public surface area.

## K. Invariant validation result

All 8 required invariants are enforced both by the derivation order and by the final defensive `enforceInvariants()` pass, and are exercised by fixture cases and dedicated tests:

1. `VERIFIED_CONTROLLING` requires displayed cards -- enforced (fixture #4, #1).
2. `RELATED_AUTHORITY_ONLY` never claims controlling authority -- enforced (fixture #3).
3. Unsafe source states never yield `VERIFIED_CONTROLLING` -- enforced (fixtures #5-#8, dedicated test).
4. `RESTRICTED` forces `humanReviewRequired`/filing/auto -- enforced (fixture #11, dedicated test).
5. `CONTROLLED_PROCEDURAL` forbids filing/auto and restricted-conclusion claims -- enforced (fixture #10, edge case, dedicated test).
6. `hasConflict` comes only from the existing deterministic conflict result, never source count, and never implies settled controlling authority -- enforced (fixture #9, #12, dedicated test).
7. Domain boundary invents no tax-authority confidence -- enforced (fixture #13, edge case, dedicated test).
8. Internal consistency with `responseType`/`sourceStatus`/`saeStatus` -- enforced by passing the same resolved values ask-handler.js's own payload uses into `buildTrustContract`, not raw/possibly-stale `result` fields.

## L. Known unresolved issues

- The route-level timeout bypass for restricted-legal-conclusion queries (confirmed live in the prior PHASE-10A validation, reproduced on "Will I win my BIR case?") is unresolved. Not touched in this task. Reserved for PHASE-10A2.
- The two staging queries that surfaced `hasConflict: true` (VAT rate; input vs. output VAT) warrant a separate investigation into whether conflict-engine.js's Four-Part Doctrine Test is correctly triggering on these query shapes, or over-flagging. Not investigated or altered here.
- Frontend consumption of the new `trust` object (badges, banners, visual authority-role distinction) is not implemented; reserved for a later, separately approved frontend task.
- `VERIFIED_SUPPORTING` remains a defined-but-unreachable enum value pending a runtime signal that distinguishes it from `VERIFIED_CONTROLLING`.

## M. CURRENT_STATE.md update summary

A new `## Phase 10A1 Canonical Trust Contract and API Forwarding Remediation` entry was appended recording: Phase 9 remains complete; Phase 10 remains active; Phase 10A validation decision remains remediation-required, now with the P1-3 forwarding gap closed by this task; the trust contract design, field mappings, files changed, local/regression/staging results, the conflict-signal observation, and explicit statements that no frontend/timeout/gate-ordering/conflict-engine/production change occurred. It explicitly states Phase 10A is not closed and names PHASE-10A2 as the next task.

## N. Commit hash

`c32feacce0d1a0fce1a30577a0e4584fe53d5c1c` (code: `services/trust-contract.js`, `ask-handler.js`, fixture, test)

A second commit follows this report containing this report file and the `knowledge/CURRENT_STATE.md` update.

## O. Push / sync status

Pushed to `origin/feature/source-availability-engine-v1`. `git rev-list --left-right --count origin/feature/source-availability-engine-v1...HEAD` returned `0 0` immediately after the code push, confirming full sync before this report/CURRENT_STATE.md commit.

## P. Confirmation of scope discipline

No frontend file was modified. No timeout value was changed. No route or Step 12.65/12.66 ordering was changed. No conflict-engine logic was changed or re-evaluated. No feature flag was changed. Production was never called. `.env` was never modified or printed. `git add .` was never used; only the specific intended files were staged for each commit.

## Q. Recommended prompt for independent Codex review

```
Independently review PHASE-10A1-CANONICAL-TRUST-CONTRACT-AND-API-FORWARDING-REMEDIATION-1 on branch
feature/source-availability-engine-v1 at commit c32feacce0d1a0fce1a30577a0e4584fe53d5c1c (code) plus the
following CURRENT_STATE.md/report commit. Verify: (1) services/trust-contract.js's field mappings are
faithful to existing runtime evidence in pipeline.js/ask-handler.js and invent no new authority/conflict/
legal-safety semantics; (2) all 8 required invariants are genuinely enforced for all 15 material response
paths in evaluation/fixtures/phase-10a1-canonical-trust-contract-and-api-forwarding-remediation-1.fixture.json;
(3) the two ask-handler.js insertion points are exhaustive (no other response-construction path exists);
(4) backward compatibility is genuinely preserved (no existing field removed/renamed); (5) whether the
hasConflict:true findings on the VAT-rate and input/output-VAT staging queries indicate a conflict-engine.js
over-flagging issue that warrants urgent escalation, versus a genuine conflict correctly forwarded;
(6) whether the CURRENT_STATE.md entry accurately and completely records the controlling status;
(7) confirm no frontend, timeout, gate-ordering, conflict-engine, feature-flag, or production change
occurred. Final decision must be one of: PHASE 10A1 REMEDIATION PASS / PASS WITH STRICT RECOMMENDATIONS /
FAIL / BLOCKED. Do not begin PHASE-10A2 as part of this review.
```

## Final decision

**PHASE 10A1 REMEDIATION PASS WITH STRICT RECOMMENDATIONS**

Strict recommendations: (1) investigate whether the observed `hasConflict: true` staging results on straightforward statutory queries reflect a genuine conflict-engine finding or an over-flagging issue, before relying on `trust.authoritySupport = CONFLICTING_AUTHORITY` in any user-facing surface; (2) proceed to PHASE-10A2 (route-timeout/gate-ordering remediation) as the next highest-priority item; (3) obtain independent Codex review before Phase 10A is considered closed.
