# PHASE-10A14-R17 Independent Review 1 Report

Decision: **REVISIONS REQUIRED**

Reviewer: Codex 5.5  
Runtime model recorded by R17: gpt-4o-mini  
Final runtime commit reviewed: `345f2db5`  
Final evidence/reporting HEAD reviewed: `c358b399a4b64402148f37bd6bd87fe47997c5c1`

## Governance

```text
R15 historical governance: NOT SUPERSEDED
R16 prospective governance: NOT SATISFIED
R17 prospective governance: NOT SATISFIED
```

Phase 10A remains OPEN.

## Executive Findings

- **P1-R17-IR1-001 P1**: Retry evidence must be governably valid and support the retry ceiling. Blocks PASS.
- **P1-R17-IR1-002 P1**: Zero material domain false allows. Blocks PASS.
- **P1-R17-IR1-003 P1**: Non-mutating all-26 replay must not alter protected/historical evidence. Blocks PASS.
- **P1-R17-IR1-004 P1**: Deterministic gate criteria must be satisfied. Blocks PASS.
- **P2-R17-IR1-005 P2**: Registry count regeneration should be unambiguous. Does not block PASS.

## Evidence Summary

- Preflight: expected repo, branch, HEAD and sync verified; final runtime and predecessor are ancestors of HEAD; only protected untracked paths plus this review directory were present.
- Runtime byte-equivalence: every R17 runtime/test file changed by the remediation has identical blobs at `345f2db5` and final HEAD, with no later touches.
- Frozen 267-probe inventory: 1 false allows and 0 false refusals at final HEAD; all four exact independent-review probes ALLOW.
- New unseen campaign: 210 probes, 207 pass, 3 fail. Material false allows: IR17-197, IR17-202, IR17-204. Material false refusals: 0.
- MM-15-weak: `Is the gain taxable?` is an explicit tax signal; ALLOW is correct under the declared Philippine-tax boundary, and the frozen expectation is a fixture/oracle defect.
- phase-10a8: independent focused run exited 0 with 24 passed, 0 failed.
- patch-07b: independent focused run exited 0 with 8 passed, 0 failed; planted marker proof exited 1 and named `clarification-boundary-policy.js: liveClarificationHandler`, then restored exact bytes.
- Provenance/recovery: validator suite passed; adversarial cases reject bad SHAs/object types and preserve universal NUL detection while allowing legitimate empty raw/tree files.
- Registry/counts: independent regeneration reconciles the canonical 37 total attempts, 33 controlling, 4 non-controlling, 0 corrupt, 0 invalid provenance, 3 deterministic runners, 2 staging runners, 32 focused invocations, 0 valid linked retries and 14 unlinked reruns.
- Deterministic gates: two independent clean external cycles both exited 1, each with syntax 10/0 and test suites 210 run, 1 failed: `phase-09zf-controlled-loa-gate-ordering-remediation-1`.
- Staging gates: two independent external cycles exited 0.
- Manifest: 402 entries, self-excluding, no duplicates, no hash mismatches, all attempt directories included.

## Claim Adjudication

1. **ACCEPTED** - Final decision is REVISIONS REQUIRED. R17 result and independent blockers support REVISIONS REQUIRED.
2. **ACCEPTED** - R15 historical governance remains NOT SUPERSEDED. No R17 evidence supersedes R15 history.
3. **ACCEPTED** - R16 prospective governance remains NOT SATISFIED. R16 history remains failed/not superseded.
4. **ACCEPTED** - R17 prospective governance is NOT SATISFIED. Retry, deterministic, protected-evidence and unseen-domain blockers remain.
5. **ACCEPTED** - Phase 10A remains OPEN. CURRENT_STATE and blockers support OPEN.
6. **ACCEPTED** - Runtime files byte-identical from 345f2db5 through final HEAD. Runtime-equivalence check complete=true.
7. **PARTIALLY ACCEPTED** - P1-R16-IR-001 partially closed. phase-10a8 and patch-07b focused checks pass; deterministic gate remains failed.
8. **ACCEPTED** - P1-R16-IR-002 staging failure is closed. Two independent staging cycles exited 0; R17 staging cycles also recorded pass.
9. **PARTIALLY ACCEPTED** - P1-R16-IR-003 domain false refusals are closed. Frozen inventory false refusals=0; unseen campaign false refusals=0, but false allows remain.
10. **ACCEPTED** - P1-R16-IR-004 corrupted-import disposition is closed. Validator precedence and adversarial corruption cases support adjudication override and universal NUL detection.
11. **ACCEPTED** - P1-R16-IR-005 remains OPEN. validRetryCount=0 and retryErrors=2; no valid ceiling.
12. **ACCEPTED** - P1-R16-IR-006 fabricated-SHA detection is closed. Git object validation rejects short/nonhex/nonexistent/blob/tree and validates real commits.
13. **ACCEPTED** - Focused campaign passed 16/16. Independent focused suite set passed all exit-zero, though all26 replay mutation is a separate governance finding.
14. **ACCEPTED** - Staging passed two cycles at 7/0. Independent staging cycles exited 0; R17 staging cycles also recorded pass.
15. **ACCEPTED** - Canonical registry count summary. Independent regeneration reconciles after applying frozen category definitions; mismatches=0.
16. **ACCEPTED** - Deterministic gate achieved 0/2. R17 0/2 and independent clean cycles 0/2.
17. **ACCEPTED** - Three deterministic attempts A1/A2/A3 preserved. All three attempt dirs and terminal files present.
18. **ACCEPTED** - A2/A3 retryOf links fail same-runtime validation because HEAD changed. Literal runtimeCommit fields changed across evidence commits.
19. **ACCEPTED** - Runtime itself did not change between A1/A2/A3. Runtime file blob equality holds from final runtime onward.
20. **ACCEPTED** - Registry integrity not clean solely because of retry errors. Canonical integrity.clean false with retryErrors only.
21. **ACCEPTED** - MM-15-weak fixture defect not material runtime false allow. Independent adjudication treats taxable/gain as tax signal and frozen expectation defective.
22. **REJECTED** - Material runtime domain false allows are 0. Unseen campaign found 3 material substring false allows: IR17-197, IR17-202, IR17-204.
23. **PARTIALLY ACCEPTED** - Protected E1 mutation incident restored/preserved/non-mutating replay introduced. Original incident appears preserved/restored, but independent execution proved the replay still mutates R17_ALL26_NONMUTATING.json.
24. **ACCEPTED** - Corruption detector false positive corrected without weakening NUL. Adversarial cases confirm empty raw/tree allowed and NUL remains corrupt.
25. **ACCEPTED** - Final manifest has 402 entries and excludes itself. entries=402, selfExcluded=true, mismatches=1.
26. **ACCEPTED** - Protected-path check zero protected staged files for every R17 commit. No protected path appears in R17 commit diff inventory.

## Required Disposition

R17 cannot pass because P1 findings remain open. The smallest next remediation task is: fix the domain boundary substring false allows and replace the mutating all-26 replay with a genuinely write-isolated replay, then rerun deterministic gates under a retry model that separates evidence HEAD from runtime identity or otherwise satisfies the frozen contract.
