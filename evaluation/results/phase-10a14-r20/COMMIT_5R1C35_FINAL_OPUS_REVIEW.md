# COMMIT 5R1-C35 final independent Opus review

- Decision: **APPROVED_WITH_NONBLOCKING_OBSERVATIONS**
- Reviewer: **Claude Code / claude-opus-4-8**
- Reviewed-state digest: `ccc5d1096ef29b156638366db2c89a7a0e992471fd2a4cc6be3ae6505e740b33`
- Independent: **true**
- Read-only: **true**
- Phase 10A classification: **OPEN**
- Commit safe after authorized postapproval finalization: **true**
- Output contract: **PASS**
- CLI exit: **0**

## Summary

Independent read-only final review of PHASE-10A14-R20 COMMIT 5R1-C35. Verified integrity via the single authorized `sha256sum -c` (all 121 manifest rows OK) and cross-checked primary evidence, the actual runtime source, WAL/registry, and fixtures. Checkpoint 61 continuity holds (HEAD=upstream d5b25e67, 0/0, safeToResume, activeAttemptId null). Candidate 1 (C35-TC01) resolves to a37f41c0…e7d exactly once — confirmed as conflict-engine.js at manifest line 2 (sha256sum -c OK), in the accepted rule chain (candidate1Occurrences 1), and in real source logic (same-source fragments are not distinct positions absent structured version/effectivity/supersession metadata). VAT proposition-to-passage revalidation is genuine: 10 propositions inventoried; broad input-VAT P9 is NOT_PROVEN_MATERIALLY_UNDERQUALIFIED and P10 NOT_ASSERTED; the captured packet lacks Sec 110/113/RR 4.110 passages, so the broad sentence is not promoted while generic VAT remains NO_CONFLICT with RELATED_AUTHORITY_ONLY support — conflict and support proven independent across all four trust-matrix quadrants. Candidate 2 (C35-SU01) was authorized only after a proven generalized proposition-to-passage binding defect (224.6 min remained > 130 min floor), is ACCEPTED_PROMOTED_CONTROLLING and terminal with no Candidate 3; its answer-support-validator.js implements substantive material-proposition/exact-passage binding with fail-closed behavior. Final cumulative active base reproduces as 5c94e610… from four independently hash-verified components (ask-handler.js, conflict-engine.js=a37f41c0, services/answer-support-evidence.js, services/answer-support-validator.js), order deterministic, no shadowing/drift/contamination. C34 frozen runtime 73601ff7 preserved (C35 touches none of the three philippine-tax-* files); metrics unchanged. Frozen gates: 0 target false conflicts, 0 genuine-conflict regressions, 0 unsupported promotions, 0 C34 regressions; Candidate 1 6/6, Candidate 2 25/25, isolated forward/reverse 31/31 each; replay/generalization PASS. Registry 229→230, C35 WAL 3→6 (verified 6-row 3-event lifecycles), C34 WAL 32 unchanged, orphan/dangling/running 0, terminalization idempotent. Protected residue (6 C34 attestations, .claude, .vscode, factcheck, Roadmap v7/v8, knowledge/ Roadmap v9 + CURRENT_STATE) unchanged; staging empty; port 5173 free; production still on committed d5b25e67 (undeployed). Phase 10A correctly OPEN: decision/relation 3720/3720, reason 3575/3720, 145 reason-only rows itemized (45/16/81/1/2=145); closure not forced; E2/A15 not executed. Roadmap v9 and CURRENT_STATE drafts are accurate, carry the {{OPUS_DECISION}} placeholder, and do not claim closure. Manifest is 121-row self-excluding, sha256 ccc5d10… (bad/missing/duplicates 0); staging proposal is explicit file-by-file with protected residue excluded and the Phase-10A-open commit message; stale checkpoint-61 FINAL_EVIDENCE.sha256 excluded and archived. No deployment, C36, Phase 10B, reindex, or model migration. All ten disclosed facts are adjudicated, not normalized, and are commit-safe. No blocking findings; observations are transparency-level only and require no runtime, disposition, composition, or reviewed-hash change. Postapproval-only steps (final manifest, closure assessment, decision docs with token substitution, explicit staging, commit, push) remain authorized after this approval.

## Verification

- checkpoint61Continuity: **PASS**
- candidate1IdentityAndExactOnce: **PASS**
- vatPropositionPassageRevalidation: **PASS**
- inputVatQualificationSupport: **PASS**
- candidate2NecessityAndDisposition: **PASS**
- candidateChainTerminal: **PASS**
- finalCompositionAndActiveBase: **PASS**
- authorityConflictPreservation: **PASS**
- authoritySupportIndependence: **PASS**
- c34FrozenPreservation: **PASS**
- c35FrozenGates: **PASS**
- replayAndGeneralization: **PASS**
- registryWalAttemptLedger: **PASS**
- protectedResidueAndServiceGitHygiene: **PASS**
- phase10AClosureAssessment: **PASS**
- reasonResidual145Explicit: **PASS**
- roadmapV9DraftAccurate: **PASS**
- currentStateDraftAccurate: **PASS**
- manifestAndStagingProposal: **PASS**
- noDeployC36OrPhase10B: **PASS**

## Blocking findings

- None

## Nonblocking observations

- Full deterministic regression (FULL_DETERMINISTIC_REGRESSION_ADJUDICATION) is a structured reconstruction transcribed from the canonical read-only replay agent's tool-call transcript (rawFilesystemCapturePresent=false; no raw stdout file emitted). The nominal exit 1 with 54 historical SCOPE/STATE guard failures across 33 suites (Phase 7B/8/9/early-10A) is explicitly disclosed, not claimed as an unqualified pass, and is corroborated by independently-evidenced focused suites (Candidate 1 6/6, Candidate 2 25/25, isolated 31/31); I judge the adjudication commit-safe. Recommend the postapproval final evidence retain this reconstruction-vs-raw-capture provenance note.
- Exact-prompt-named support artifacts (notably evaluation/fixtures/phase-10a14-r20/commit5r1c35-vat-proposition-support.json and COMMIT_5R1C35_SUPPORT_PRE_FIX_FIXTURE_RESULT.json, lastWrite 06:16:47Z) were generated after Candidate 2 allocation (05:07:02Z) as provenance-preserving wrappers/case-indexes over already-frozen alternate-name evidence (commit5r1c35-answer-support-passage-binding.json 04:58Z; SUPPORT_PASSAGE_BINDING_PRE_FIX_RESULT 05:03Z, both pre-allocation and referenced by the necessity/authorization chain). Explicitly not backdated; semantic runtime impact NONE (disclosed fact 4).
- Two bespoke C35 registry rows use attemptCategory trust_calibration and omit harnessTreeDigest/dependencyLockDigest/environmentFingerprint from the generic closed ATTEMPT_REGISTRY_CONTRACT schema. Preserved as terminal historical rows with semantic impact NONE; no silent mutation required (disclosed fact 5).
- Candidate 2's terminal WAL/registry event inherited result.generatedUtc (06:34:00Z), which is 30s earlier than its preterminal validation artifact (generatedUtc 06:34:30Z, lastWrite 06:34:34.59Z); filesystem terminalization occurred 06:35:19Z. Filesystem write order proves preterminal-then-terminal; this is disclosed timestamp-source variance, not evidence reordering (disclosed fact 6).
- Under the authorized read-only toolset (Read/Glob/Grep plus one sha256sum -c), the outer SHA-256 over the deterministic composition concatenation for 5c94e610… and the manifest digest ccc5d10… cannot be recomputed directly. Both are verified transitively: every component byte-length and per-file SHA-256 is confirmed via sha256sum -c against the manifest, the composition algorithm is fully specified, and 5c94e610… agrees across FINAL_CUMULATIVE_COMPOSITION, FINAL_ACTIVE_BASE_IDENTITY, FINAL_ACCEPTED_RULE_CHAIN, CANDIDATE_2_RESULT, FINAL_REPLAY_RESULT, and PRE_OPUS_OPERATIONAL_HYGIENE. This is the intended verification boundary, not an evidence gap.
