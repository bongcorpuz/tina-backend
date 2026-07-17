# PHASE-10A13-R1-PROPOSITION-SOURCE-SUFFICIENCY-REMEDIATION-1-INDEPENDENT-REVIEW-1

Decision: PASS.

Reviewer: Codex GPT-5. I did not execute the remediation. This was an independent review only. I did not remediate, rewrite, optimize, expand runtime, run another full 50x3 fact-check, close Phase 10A, begin Phase 10B/10C, reindex, deploy, run adversarial testing, or modify frontend/Dev Factory.

## Bottom Line

The remediation genuinely closes the two A13-confirmed source-sufficiency classes at the deterministic validator layer:

- Q38-class registration/procedural propositions now fail closed when supported only by withholding, foundational, general, or topically adjacent authorities.
- Q46-class VAT exception / zero-rating / outside-scope propositions now fail closed when supported only by general VAT-imposition authority.

The implementation is class/provision based rather than question-ID or exact-prompt based. The deterministic gate runs before the model validator and cannot be reversed by model approval. Focused tests, all-30 replay, targeted live evidence, and regression gates support PASS.

Severity: P0=0, P1=0, P2=7, P3=1.

## Repository And Scope

Reviewed repository: `C:\Projects\tina-backend`

- Branch: `feature/source-availability-engine-v1`
- Start HEAD: `5d42a173ee96a9b30643f28c91b67d73b6afccb9`
- Sync at start: `0 0`
- Protected untracked paths preserved: `.claude/`, `.vscode/`, `evaluation/factcheck/`

Expected ancestry confirmed:

- `d6fbf2977d02c86c57dba85b44eea52220bd580f`
- `508a64dce8219d2dcfc82dcd226ed7fdbc015fb6`
- `f5bf024`
- `5d42a173ee96a9b30643f28c91b67d73b6afccb9`

Commit scopes:

- `508a64d`: validator runtime change plus focused/fixture tests.
- `f5bf024`: targeted live evidence and design/preservation artifacts.
- `5d42a17`: report, result JSON, evidence manifest, runner logs, CURRENT_STATE.

Changed files were limited to `services/answer-support-validator.js`, three test files, remediation evidence/report/result files, and `knowledge/CURRENT_STATE.md`. I found no corpus, vector, model, frontend, Dev Factory, schema, environment, database, deployment, or production change.

## Pre-Patch Defect Reproduction

Committed A13 payloads directly confirm the defects:

- `Q38-r1`, `Q38-r2`, and `Q38-r3` reached `VERIFIED_CONTROLLING`.
- `Q46-r1` reached `VERIFIED_CONTROLLING`.

The pre-patch blob at `d6fbf29` shows `evaluatePropositionSourceSufficiency` had only `penalty_procedural` and `withholding_ewt` classes. It did not contain `registration_procedural` or `vat_exception`, so Q38/Q46 were genuinely outside the deterministic gate. The executor's replay claim that the pre-patch gate returned `applicable=false` is consistent with the old code and committed payloads.

## Code Review

Runtime implementation reviewed in `services/answer-support-validator.js`.

Findings:

- The new registration class keys on registration/form/procedure proposition signals and registration-authority source labels.
- The new VAT-exception class keys on exemption/zero-rating/not-subject/outside-scope propositions and exception/zero-rating/source labels.
- Runtime contains no executable `Q38`/`Q46` branch, no exact prompt comparison, no exact defective-answer comparison, no Form 1902 special deny condition, and no BSP/gold pass/fail branch.
- Runtime comments mention Q38/Q46 as historical defect classes. The executable VAT context regex includes broad transaction words including `gold`; this is context detection only and does not itself pass or fail a payload.
- Deterministic failure returns immediately from `evaluateAnswerSupport` at `stage: "proposition-source-sufficiency"` before the LLM validator call.
- A failed deterministic gate cannot be upgraded by the model validator.

Fixture changes:

- The Q8 fixture now supplies `NIRC Sec. 109` in displayed source cards for a VAT-exempt residential lease answer. This strengthens consistency with the fixture prose and does not weaken the expected verified behavior.
- The older R6 non-applicability fixture was adjusted because registration is now an intentionally covered class; a positive registration reachability assertion was added. This is a legitimate expectation update, not laundering.

## Registration Gate

Confirmed behavior:

- Blocks Q38 exact class on withholding/foundational authority.
- Blocks business registration supported only by withholding authority.
- Blocks registration amendment/closure/transfer style propositions on unrelated VAT authority.
- Does not classify ordinary tax-return-form questions as registration acts.
- Allows the deterministic gate to pass when registration authority such as NIRC Sec. 236 / RR 7-2012 is supplied.

Independent extra probes confirmed branch-transfer bad authority fails closed; annual ITR Form 1701 does not overfire; a valid registration answer with Sec. 236/RR 7-2012 reaches the LLM stage and can verify with an approving schema-valid model response.

P2 caveat: the control remains source-card/provision-class based. It does not by itself prove passage-level support for every selected form. For example, a wrong form paired with a registration-authority label would still depend on downstream model validation or future passage grounding.

## VAT-Exception Gate

Confirmed behavior:

- Blocks Q46 exact class on general VAT-imposition authority.
- Blocks VAT-exempt and zero-rated claims on general VAT authority alone.
- Allows VAT-exempt treatment when NIRC Sec. 109 / RA 11256 style exception authority is supplied.
- Preserves general VAT rule reachability because ordinary 12 percent VAT-imposition answers are not exception propositions.
- Does not misclassify income-tax exemption as VAT exception.
- Preserves Q5-style incentive reachability when incentive authority is supplied.

P2 caveat: the class is enumerated and label/provision based. It is acceptable for this remediation but not a substitute for Phase 10C passage-level proposition grounding.

## All-30 A13 Verified Replay

I independently replayed all 30 A13 `VERIFIED_CONTROLLING` payloads through the current deterministic proposition gate. Newly blocked:

- `Q38-r1`
- `Q38-r2`
- `Q38-r3`
- `Q46-r1`

The other 26 previously valid verified results were not blocked by the deterministic gate. False refusal introduced by the new deterministic gate: 0.

## Targeted Live Evidence

The 23 committed targeted payloads reconcile:

- Runtime commit: `508a64dce8219d2dcfc82dcd226ed7fdbc015fb6`
- Payloads: 23
- Runlog entries: 23
- Payload/runlog hash mismatches: 0
- Persistence failures: 0
- Verified payloads: `Q46-p1`, `Q47-a`
- Invalid verified: 0
- Questionable verified: 0

Targeted outcomes:

- Q38 exact x5 + paraphrases x3: 0 verified.
- Q46 exact x5: 0 verified.
- Q46 specific exemption control: verified on `NIRC Sec. 109`.
- Q5/Q8/Q25/Q36: 0 verified.
- Q47 valid control: verified.
- Outcome-prediction restriction: active.

Live-registration reachability note: the 23 live payloads did not include a full verified registration-positive control. `Q1-a` failed structurally, not because of the registration gate. Focused tests and an independent mocked validator probe demonstrate the deterministic gate does not suppress a valid registration answer with Sec. 236/RR 7-2012 authority. I classify the lack of a live verified registration-positive payload as a P2 evidence limitation, not a P1 blocker, because overfire is disproven at the deterministic control layer and the task did not authorize generating replacement live evidence.

## Focused Tests And Regression

Focused suite:

- `node tests/phase-10a13-r1-proposition-source-sufficiency.test.mjs`
- Result: 17 passed, 0 failed, 21 assertions.

Independent regression:

- `node scripts/run-regressions.mjs`
- Result: syntax 10/0, suites 190/0, exit 0.

Independent staging:

- Sandboxed `node scripts/run-staging-smokes.mjs`: 7 suites, 1 failure caused by staging reachability in the restricted sandbox.
- Network-enabled rerun: 7 suites, 0 failures, exit 0.

Suite accounting reconciles: 190 deterministic + 7 staging = 197. The +1 versus the prior 196 is the new A13-R1 focused suite. I found no removed suite, hidden skip, forced success, or staging bypass.

## Prior Safeguards

Confirmed:

- Q5 invalid verified = 0.
- Q8 invalid verified = 0.
- Q25 invalid verified = 0.
- Q36 invalid verified = 0.
- Accessor getter executions = 0.
- Accessor exceptions = 0.
- Accessor verified = 0.
- Unrestricted outcome prediction = 0.
- Fabricated authority = 0.
- False refusal = 0.
- Model-validator override of deterministic failure = 0.
- Valid verified remains reachable (`Q46-p1`, `Q47-a`).

## Evidence Hashes, Security, And Cleanup

Remediation evidence manifest:

- Entries: 33
- Hash mismatches: 0

Security/scope:

- No credential-shaped OpenAI keys, Slack tokens, private keys, or literal Authorization Bearer values found in remediation artifacts.
- No raw conversation identifiers, taxpayer/client data, private deployment URL, environment file change, corpus/index/model change, frontend/Dev Factory change, reindexing, deployment, or production change found.
- Review did not create a backend server. Existing localhost `5173` Node listeners were present before and after review; I did not terminate unrelated processes.

## Architectural Caveat

The implementation is acceptable for this narrowly defined remediation. It is deterministic, extensible, and blocks the two material A13 classes without blanket suppression. It does not complete passage-level proposition grounding, and it remains possible for a future unsupported proposition class or a wrong proposition paired with a superficially matching source-card label to require later controls. That limitation remains P2 and should not be represented as Phase 10C completion.

## Final Status

PHASE-10A13-R1-PROPOSITION-SOURCE-SUFFICIENCY-REMEDIATION-1-INDEPENDENT-REVIEW-1 = PASS.

Phase 10A remains open pending separate authorization for the next action. This review does not authorize another full 50x3 rerun, Phase 10A closure, adversarial testing, Phase 10B, Phase 10C, model migration, reindexing, deployment, production work, frontend work, or Dev Factory changes.
