# PHASE-10A14-R3 Multi-Proposition Filing-Authority Compatibility and Estate-Computation Sufficiency Remediation 1 Independent Review 1

Reviewer: Codex GPT-5, independent review only.
Decision: REVISIONS REQUIRED.

## Executive Decision

The five R2 validator P1 defects are genuinely remediated by R3 at the deterministic gate. Repository evidence, code review, focused tests, reviewer-probe replay, all-26 replay, targeted live payloads, and fresh runner execution support closure of:

1. mixed-object filing suppression;
2. relative-period and Taglish filing-deadline under-detection;
3. cross-tax-type filing authority laundering;
4. correct estate computation verifying without positive estate computation authority;
5. estate base/deduction/threshold relationship errors passing through.

PASS is still unavailable. The individual filing-obligation, individual filing-deadline, and substituted-filing positive controls remain practically unreachable in live retrieval/source surfacing. Explicit Section 51, Section 51(C), and Section 51-A prompts surfaced only NIRC Sections 23/24/27 or no displayed source, never Section 51/51-A. Under the charter decision standard, this is material, systemic P1 and requires REVISIONS REQUIRED.

## Repository, Ancestry, And Scope

Verified:

- repository: C:\Projects\tina-backend;
- branch: feature/source-availability-engine-v1;
- HEAD: 66b4d2773308a3be205c57967a57981f0f95fb02;
- sync: 0 0 against origin/feature/source-availability-engine-v1;
- expected ancestry visible: d5cfceb -> f44490d -> ba08ae7 -> 8fcee26 -> 66b4d27;
- tracked worktree clean except protected untracked .claude/, .vscode/, and evaluation/factcheck/;
- diff scope from d5cfceb: services/answer-support-validator.js, tests/phase-10a14-r3-multi-proposition-filing-authority-estate-sufficiency.test.mjs, R3 evidence/report/result files, and knowledge/CURRENT_STATE.md.

No diff evidence of source-bank, corpus, vector, retrieval, reranker, prompt, model, frontend, Dev Factory, production, database, schema, migration, package, or env changes was found. git diff --check returned clean.

## Code Review

The runtime implementation in services/answer-support-validator.js segments clauses before proposition extraction, then records filing/deadline/estate propositions in a diagnostic ledger. Relevant implementation points:

- segmentClauses splits sentences, semicolons, colons, newlines, bullets/hyphens, but/however/although/while/whereas, and comma plus conjunction boundaries.
- detectFilingAndEstatePropositions builds per-clause filing_obligation and filing_deadline propositions, preserving source side, source clause, class, action, object, tax type, return type, taxpayer type, substituted flag, and decisive flag.
- classifyReturnContext resolves clause-first tax/return/taxpayer markers and falls back to broader context only for unresolved clauses.
- filingAuthorityCompatible requires exact return-type authority: individual, substituted, corporate, estate, donor, VAT, percentage, or false for unknown.
- analyzeEstateComputation requires real estate-tax context, excludes donor/gift context, models rate/base/deduction components, and flags amount-anchored plus relationship-based deduction-as-threshold/floor/sole-base errors.
- evaluatePropositionSourceSufficiency evaluates every decisive filing/deadline proposition and fails on the first unsupported one; estate computation then fails on relationship error or missing positive rate/base/deduction authority.

The architecture is source-card keyed, deterministic, fail-closed, and does not upgrade trust. It does not use question IDs, exact prompt strings, or fixed amounts/dates as the basis for the R3 decisions.

## Pre-R3 Reproduction Review

The committed pre-patch reproduction at d5cfceb is credible. The same validator entry point reproduces all five former P1 families as open:

- mixed-object filing suppression: OPEN:none;
- relative/Taglish filing deadline bypass: OPEN:none;
- cross-tax authority laundering: OPEN:filing_deadline with sufficient=true on wrong tax type;
- correct unsupported estate computation: OPEN:tax_computation_basis;
- relational standard-deduction threshold misstatement: OPEN:tax_computation_basis.

I found no indication these were harness-only artifacts. The post-R3 code directly addresses the reproduced failure mechanisms.

## Focused Suite And Replay Reconciliation

Fresh focused execution:

- node tests/phase-10a14-r3-multi-proposition-filing-authority-estate-sufficiency.test.mjs: 35 passed, 0 failed, 63 assertions.

Focused count reconciles as 34 to 35 after the donor false-refusal regression was added. The suite covers mixed objects, ordinary/Taglish deadline forms, cross-tax authority mismatch and matching controls, estate sufficiency, estate relationship errors, donor non-overfire, generic non-tax return senses, and compound ledger completeness.

Committed replay evidence reconciles:

- R1 probes: 16 closed;
- R2 probes: 9 closed;
- additional five-P1 family probes: 5 closed;
- all-26 A14 replay: exactly nine blocked, Q12/Q30/Q34 across three rounds; 17 valid verified slots unaffected; Q3/Q47 no over-fire; Q32 reachable.

## Independent Targeted Probes

I ran additional deterministic probes not copied verbatim from the R3 suite:

- ordinary deadline variants including lodged today, still time to submit ITR, filing window closed, annual return sent, filing period open, how long left to file;
- Taglish variants including ihabol, may oras pa, sarado na ba ang filing, puwede pa ba ngayong araw;
- no-tax-due and payment-deadline separation;
- mixed-object reverse controls;
- cross-tax individual deadline on estate authority;
- estate foundational-only, estate relationship error, and estate fully supported controls.

Result: 17/18 expectations passed. All ordinary and Taglish deadline probes classified as filing_deadline and failed closed on rate/residency authority. No-tax-due and payment-deadline controls did not invoke the filing-deadline gate. Cross-tax and estate probes behaved correctly. One non-blocking edge was found: a bare imperative answer, "Submit invoices to customers, and file the annual income tax return," produced no filing_obligation proposition because it lacks an obligation/exemption modal. Equivalent modal forms using must, required, need, or no annual return required were correctly gated. I classify this as P2 coverage debt, not a current P1, because the charter's former P1 was suppression of decisive obligation conclusions and the material modal forms are now covered.

## Live Evidence And Retrieval Diagnosis

The 60 committed live payloads reconcile:

- payload count: 60;
- VERIFIED_CONTROLLING count: 8;
- invalid verified: 0;
- questionable verified: 0;
- verified positives rest on matching displayed authority for estate, donor, VAT deadline, protest, and EWT controls.

Individual-filing positive reachability failed systemically:

- POS-01-indfile: self-employed annual ITR obligation displayed Sec 23/24/27, validator invoked, blocked as filing_obligation_proposition_without_matching_return_authority.
- POS-03-inddl: individual annual ITR deadline displayed Sec 23/24/27, validator invoked, blocked as filing_deadline_proposition_without_matching_return_authority.
- POSX-indfile-1: explicit Section 51 prompt still displayed Sec 23/24/27 and blocked.
- POSX-inddl-1: explicit Section 51(C) prompt still displayed Sec 23/24/27 and blocked.
- POS-02-subst: substituted filing returned NO_INDEXED_SOURCE with no displayed source; top retrieved labels were Sec 24/Sec 23.
- POSX-subst-1: explicit RR 2-98 and Section 51-A prompt had no displayed source and no validator invocation.

A repo search outside R3 review artifacts found no local source-bank/corpus text for Section 51, Section 51-A, substituted filing, or RR 11-2018. The payloads show retrievedSourceCount values but top/displayed source labels do not include the required provisions. The independently supported localization is therefore: Section 51/51-A authority is not practically available to final source cards; the observable failing stage is retrieval/source surfacing before validator compatibility. I cannot prove whether the root is corpus absence, aliasing, vector ranking, reranker exclusion, or source-card finalization from committed payloads alone, but the live symptom is systemic and material.

## Runner Verification

Fresh execution:

- node scripts/run-regressions.mjs: syntax checks 10/0, deterministic suites 193/0, exit 0.
- node scripts/run-staging-smokes.mjs in restricted sandbox: 7 run, 1 failed because staging was temporarily unreachable for the phase-09r tax memo runtime staging smoke.
- network-enabled rerun of node scripts/run-staging-smokes.mjs: staging suites 7/0, exit 0.

Combined governed runner count: 193 deterministic + 7 staging = 200. The suite delta is the R3 focused suite. I found no hidden skip or forced success in the runner output.

## Prior Safeguards, Hashes, Security, And Cleanup

Prior safeguards remained intact by committed matrix and payload inspection:

- Q5/Q8/Q25/Q36/Q38/Q46 invalid verified: 0;
- accessor getter executions/exceptions/verified: 0/0/0;
- unrestricted outcome prediction: 0;
- fabricated authority: 0;
- model-validator override of deterministic failure: 0;
- false refusal introduced by final R3 gate: 0;
- valid verified answers remain reachable outside the admitted individual-filing retrieval gap.

Hash reconciliation:

- executor EVIDENCE_MANIFEST.sha256 recomputed OK for all listed R3 evidence files.
- git diff --check clean.

Security/scope:

- No credential, API key, authorization header, cookie, private key, private deployment URL, raw conversation identifier, taxpayer/client data, env, corpus/source-bank/index/model/prompt/frontend/Dev Factory/production/database/schema change found in the R3 diff scope.
- Protected untracked paths remain untracked and unstaged.
- No backend server was left running on port 10000. I did not touch localhost 5173.

## Findings And Severity

P0: 0.

P1: 1.

- P1-RETRIEVAL-51-51A: Individual filing-obligation, individual filing-deadline, and substituted-filing live positives remain unreachable because Section 51/51-A or substituted-filing authority is not surfaced to displayed source cards, including explicit Section 51/51(C)/51-A prompts. This is systemic and material under the charter.

P2: 2.

- P2-IMPERATIVE-FILING: Bare imperative mixed-object answer "file the annual return" without an obligation modal is not classified as filing_obligation. Modal obligation/exemption forms are covered.
- P2-STAGE-LOCALIZATION: Committed payloads localize the failure to retrieval/source surfacing before compatible source cards, but do not expose enough stage internals to distinguish corpus absence, aliasing, vector recall, reranker exclusion, or finalization.

P3: 0 from this review.

## Decision

REVISIONS REQUIRED.

The R3 validator architecture is sound for the five former R2 P1 gate defects, and fresh deterministic plus staging runners pass. The final decision is nevertheless REVISIONS REQUIRED because the charter requires genuine live positive reachability for individual filing obligation, individual filing deadline, and substituted filing, and the live evidence shows Section 51/51-A authority is systematically unavailable to displayed source cards. Do not begin R4 without separate authorization.
