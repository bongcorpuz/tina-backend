# PHASE-10A12-R4-INDEPENDENT-VALIDATOR-COMPETENCE-REVIEW-1

Reviewer: Codex GPT-5, high reasoning, low speed  
Date: 2026-07-16  
Repository: C:\Projects\tina-backend  
Branch: feature/source-availability-engine-v1  
Reviewed remediation: PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-4  
Expected manifest commit: 1b36eeadb26d69f2b9ae28c8422afcc3fdd5c6d2  
Expected final evidence HEAD reviewed: 987ada9275994bcfe74105b344055f24637e4328

## Decision

REVISIONS REQUIRED.

A13 is NOT AUTHORIZED. Phase 10A remains reopened. Phase 10B and Phase 10C remain blocked. The adversarial suite remains deferred.

This review did not execute PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-4 and did not modify remediation runtime or test code. The review modified only review artifacts and knowledge state.

## Summary

R4 materially improves the mini-set evidence by committing a deterministic frozen manifest before the committed live payload evidence. The selected 30 IDs reproduce exactly from the documented rule, canonicalSetSha256 independently matches the LF-joined `id<TAB>prompt` serialization, all 30 per-question hashes match, 30 committed payloads reconcile to the frozen manifest, and the mini-30 payloads show 5 VERIFIED_CONTROLLING + 16 RELATED_AUTHORITY_ONLY + 9 NO_VERIFIED_AUTHORITY = 30 with 0 invalid verified.

However, the controlling R4 review criteria are not satisfied. No governed evidence was found proving explicit owner authorization before prospective canonicalization; the referenced master bank is an untracked protected file with no source-bank commit; first live request timestamps are absent from payloads/runlog, so pushed-before-live chronology cannot be independently proven; and the exact repository-wide runner failed twice with exit code 1. The R4 executor's environmental characterization is not an accepted substitute for the required two clean exit-0 runs.

## Severity Summary

| Severity | Count | Summary |
| --- | ---: | --- |
| P0 | 0 | No emergency security or runtime-code corruption finding. |
| P1 | 2 | P1-A prospective-set authority/immutability not fully proven; P1-B repo-wide runner exits 1 twice. |
| P2 | 5 | Pre-R3 max-20 statement is overprecise; sourceExcerptGrounded remains false; guard architecture remains cluster-specific; Q5 period applicability remains diagnostic-only; placeholder/runtime-equivalence evidence remains incomplete. |
| P3 | 1 | Environmental/process noise remained: protected untracked paths and pre-existing 5173 listeners. |
| Security | 0 | No secret match in reviewed R4 evidence paths. |

## Positive Determinations

- Backend preflight matched the assignment: branch `feature/source-availability-engine-v1`, HEAD `987ada9275994bcfe74105b344055f24637e4328`, upstream `origin/feature/source-availability-engine-v1`, sync `0 0`.
- R4 commit scope is evidence-only. Commit `1b36eea` adds only `canonical-mini-set-hashes.sha256`, `canonical-mini-set-manifest.json`, and `mini-set-provenance-determination.md`. Commit `987ada9` adds report/result/evidence payloads and updates CURRENT_STATE; it does not change runtime or test code.
- Manifest commit `1b36eea` is an ancestor of evidence HEAD `987ada9`.
- Deterministic selection reproduces exactly: exclude `{5,8,28,32,34,35,41,46,47}`, sort remaining Q1-Q50 ascending, take first 30 => `M-Q1,M-Q2,M-Q3,M-Q4,M-Q6,M-Q7,M-Q9,M-Q10,M-Q11,M-Q12,M-Q13,M-Q14,M-Q15,M-Q16,M-Q17,M-Q18,M-Q19,M-Q20,M-Q21,M-Q22,M-Q23,M-Q24,M-Q25,M-Q26,M-Q27,M-Q29,M-Q30,M-Q31,M-Q33,M-Q36`.
- `canonicalSetSha256` independently verified as `8e019480b2e710f9575e5f47d72716d9e94680b8bb3caa904cfe27f05c0f6ea1` using SHA-256 over the 30 `id<TAB>prompt` rows joined by LF, no trailing LF.
- All 30 question hashes in `canonical-mini-set-hashes.sha256` match the manifest prompts.
- R4 evidence manifest verified: 42/42 file hashes matched.
- R4 payload reconciliation independently matched: 30 payload files, 30 manifest IDs, missing 0, extra 0, duplicate IDs 0, duplicate payload hashes 0, all runtime commits `1b36eeadb26d69f2b9ae28c8422afcc3fdd5c6d2`, persistence count 2 for all.
- Mini-30 classification reconciled: VERIFIED_CONTROLLING 5 (`M-Q1,M-Q6,M-Q12,M-Q15,M-Q30`), RELATED_AUTHORITY_ONLY 16, NO_VERIFIED_AUTHORITY 9. Manual/verified audit found 0 invalid verified, 0 false refusal, 0 fabricated authority, 0 unrestricted outcome prediction, 0 persistence failure.
- Focused tests passed: A12-R3 20/20, A12-R2 10/10, A12-R1 19/19, A10-R1 22/22, A10-R2 27/27, A10 verified 18/18, A8 24/24, outcome-prediction regression 9/9.
- Q5 source-sufficiency remediation was not weakened by R4; R4 changed no runtime code, and A12-R3 Q5 regression tests passed.

## Blocking Findings

### P1-A: Prospective canonical-set authority and pre-run immutability are not fully proven

R4's deterministic manifest and committed payload reconciliation are strong. The governed procedure is not fully proven under the assignment's stricter criteria.

Evidence:

- No governed evidence was found, before the manifest commit, explicitly authorizing creation of a new prospective canonical mini-30, deterministic selection from the master bank, pre-execution freezing, and fresh execution. The R4 report says "Under explicit R4 authorization", but the assignment forbids accepting executor claims as proof by themselves.
- The manifest references `evaluation/factcheck/TINA_Tax_FactCheck_Corrected_Validated_Master_v3_0.md`, but `git ls-files` shows no tracked source-bank file at that path and `git log --all -- evaluation/factcheck/TINA_Tax_FactCheck_Corrected_Validated_Master_v3_0.md` has no history. The file exists locally as protected untracked evidence, but there is no source-bank commit to prove immutability of the bank used for selection.
- The manifest and payload evidence prove commit ancestry: manifest commit `1b36eea` precedes evidence commit `987ada9`. But payloads and `set-r4mini30-runlog.json` do not contain first-live-request timestamps, and no remote push timestamp was found in committed evidence. Therefore the claim that the manifest was pushed before live execution is not independently provable from live committed evidence.

Determination: deterministic selection and committed manifest-payload matching pass; governed authorization/source-bank/chronology proof fails. P1-A remains open.

### P1-B: Repository-wide runner requirement remains unresolved

The exact command required by the assignment was run twice in clean Node processes:

`node scripts/run-regressions.mjs`

Both runs exited 1, not 0. Both runs reported 10 syntax checks run, 0 failed; 195 test suites run, 2 failed; gate failed.

Failing suites in both runs:

- `tests\phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs`: 35 passed, 1 failed, 115 assertions. Failure: `fixture staging validation summary is consistent with the decision and observed reachability`; the suite logged staging temporarily unreachable and then failed the PASS decision reachability consistency assertion.
- `tests\phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs`: 16 passed, 2 failed, 177 assertions. Failures: `no disallowed runtime, package, env, database, frontend, or production files changed`; `git diff scope is reported (encoded via allowed-file check above)`. Output included `.claude/settings.local.json` in allowed-file reporting and the assertion that `pipeline.js` is part of the reported diff scope.

The failures may be environmental or legacy-scope guard failures rather than answer-support-validator regressions. That does not satisfy the R4 acceptance criterion. The assignment explicitly says environmental characterization, focused tests, lack of imports, and no attributable functional regression are insufficient. Because the exact command did not exit 0 twice, P1-B remains open.

## P2 Findings

- P2-1: The R4 pre-R3 provenance claim that the maximum distinct mini IDs in any pre-R3 commit is exactly 20 is overprecise. A tree-wide scan before R3 found 22 distinct `M-Q*.json` payload IDs in commit `a976ba6` because accumulated earlier phase evidence includes `M-Q8` and `M-Q46`. The narrower A12-R2 phase directory contains 20, and no pre-R3 canonical 30 was found; the exact max-20 wording should be corrected.
- P2-2: `sourceExcerptGrounded=false` remains an honest carryover limitation.
- P2-3: `guardArchitecture=CLUSTER_SPECIFIC_WITH_FAIL_CLOSED_SCHEMA` remains cluster-specific.
- P2-4: Q5 period applicability remains diagnostic rather than independently hard-fail enforced.
- P2-5: Placeholder/retrieval runtime-equivalence evidence remains incomplete.

## Required Reconciliation

R4 cannot authorize A13 until all P1s are resolved:

1. Provide pre-execution owner authorization evidence or repeat the prospective canonicalization under explicitly captured owner authorization.
2. Commit or otherwise freeze the master question bank, or provide a source-bank commit/hash accepted by governance.
3. Capture immutable first-live-request timestamps or equivalent chronology evidence proving no live payload predates manifest freeze/push.
4. Satisfy the controlling repo-runner criterion with two exact `node scripts/run-regressions.mjs` runs exiting 0, or obtain explicit pre-existing owner governance that superseded that criterion before R4 execution.

## Explicit Gate Decisions

- Prospective canonical mini-30: FAIL as a governed procedure; PASS only for deterministic selection/hash/payload reconciliation.
- Validator functional remediation: PASS for R4 scope; R4 made no runtime code change, Q5 remediation remains intact, mini-30 has 0 invalid verified.
- Repository-wide runner requirement: FAIL.
- Overall decision: REVISIONS REQUIRED.
- A13 authorization: NOT AUTHORIZED.