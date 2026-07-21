# Findings Register

## P1-IR19-001 - P1 - Independent semantic campaign failed
Requirement: Independent 1,120+ campaign must have zero material false allows, zero material false refusals and zero metamorphic failures.

Evidence: INDEPENDENT_SEMANTIC_CAMPAIGN_RESULT.json: 729/1120, falseAllows=179, falseRefusals=162, metamorphicFailures=36.

Impact: Blocks PASS and R19 prospective governance.

Disposition: OPEN. Blocks PASS: yes.

## P1-IR19-002 - P1 - Dominant veto rejects genuine mixed-domain tax questions
Requirement: Ordinary objects remain ALLOW or tax-appropriate CLARIFY when the user asks a Philippine-tax question about them.

Evidence: mixed-domain-genuine-tax-report.json: 102/210 failed.

Impact: Material false refusals on deductible fan purchases, music-channel income, raffles, fun runs, prescriptions, customs duty and similar tax questions.

Disposition: OPEN. Blocks PASS: yes.

## P1-IR19-003 - P1 - Tax-shaped anchors still create false allows for explicit non-tax meanings
Requirement: Explicit non-tax expansions and ordinary non-tax controls must remain NOT_ALLOW.

Evidence: explicit-non-tax-report.json: 74/260 failed; lowercase-titlecase-heuristic-review.json: 110/200 failed.

Impact: The boundary still admits non-tax uses of FLD, customs lessons, transfer-pricing game mechanics, title-case false acronym expansions and similar controls.

Disposition: OPEN. Blocks PASS: yes.

## P1-IR19-004 - P1 - Executor unseen campaign is not independent for the final runtime
Requirement: A campaign used to refine final runtime is not an unseen holdout for that runtime.

Evidence: Commit b3e879b1 message states runtime refinements were discovered while building and iterating the executor unseen campaign; commit 23f71a39 later records the 726-row unseen evidence.

Impact: The 726-row campaign may be useful development coverage, but it cannot support statistical holdout or unseen-governance claims for b3e879b1.

Disposition: OPEN. Blocks PASS: yes.

## P1-IR19-005 - P1 - Governed attempt registry omits required invocations
Requirement: Frozen plan section 9 requires every governed invocation, including pre-fix, development, unseen, focused batches, gates and retries, to be registered.

Evidence: CANONICAL_ATTEMPT_REGISTRY.json counts: total=4, domain_campaign=0, focused_suite=0; executor report separately relies on three domain campaigns and 22 focused suites.

Impact: The claim that every count derives from the registry is misleading; failed/transient and non-gate evidence is not immutably attempted in the registry.

Disposition: OPEN. Blocks PASS: yes.

## P2-IR19-006 - P2 - R18 assertion was widened to accept either veto family
Requirement: Regression assertions should preserve material reason family and precedence where required.

Evidence: tests/phase-10a14-r18-domain-hardening.test.mjs now accepts non_tax_object_veto or non_tax_object_role_veto. It still rejects ALLOW and still requires a veto reason.

Impact: Bounded weakening/ambiguity in precedence protection, but not the primary blocker because semantic campaign exposes direct failures.

Disposition: OPEN. Blocks PASS: no.
