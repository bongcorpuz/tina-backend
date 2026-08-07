# C37 operative reason-layer contract

The controlling semantic base is the selected C34 snapshot `73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775` at reason 3575/3720, decision 3720/3720, and relation 3720/3720. The live tracked service tree `7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201` is the deliberately restored scaffold, not the semantic candidate base.

## Contract

- Exactly one closed-set scalar reason is emitted for each terminal decision.
- Typed clause, task, target, object, and relation evidence controls; a tax-like token or benchmark identity never authorizes a reason.
- Reason work may not change the frozen decision or relation score, user routing, or downstream behavior.
- The original total terminating selector runs first; accepted governed overrides are narrow, baseline-reason-gated, and return null for unmatched rows.
- Unmatched rows preserve their original one-clause serialization, decision, relation, reason, and branch signature byte-for-byte.
- Labels, expansions, quotations, explicit non-tax actions, treatment, compliance, definitions, ambiguity, and no-relation are distinct explanatory families whose precedence cannot be collapsed for benchmark gain.
- Fail-closed ambiguity and non-promotion are preferred when the query omits a causal operation, bearer, or context.

## Closed reasons

| Reason | Decision | Meaning |
|---|---|---|
| `explicit_tax_task_relation` | ALLOW | Direct tax task linked to a target by a typed tax relation. |
| `tax_treatment_of_ordinary_object` | ALLOW | Requested tax consequence or treatment of an ordinary bearer. |
| `tax_compliance_task` | ALLOW | Filing, withholding, remittance, registration, or other typed compliance operation. |
| `tax_definition_with_context` | ALLOW | Definition request resolved by tax context. |
| `ambiguous_tax_acronym` | CLARIFY | Unresolved acronym or weak tax-adjacent ambiguity. |
| `explicit_non_tax_task` | REFUSE | A requested non-tax action controls the primary task. |
| `non_tax_label_or_name` | REFUSE | A tax-like token is used as an internal label or proper name. |
| `non_tax_expansion` | REFUSE | An acronym or phrase is explicitly expanded into a non-tax sense. |
| `quoted_tax_term_only` | REFUSE | A tax term is quoted or mentioned without becoming the task. |
| `tax_negation_but_tax_review_requested` | ALLOW | A typed tax-review request controls despite incidental negation. |
| `no_tax_relation` | REFUSE | No typed relation connects a tax predicate to the requested target. |

## Accepted precedence

1. `C33-M01R-direct-requested-tax-consequence-excluding-computation-is-treatment`
2. `C34-NT01-typed-ordinary-domain-inquiry-without-operation-is-no-tax-relation`
3. `C34-NT02-local-identifier-redefinition-is-explicit-non-tax-task`
4. `C34-TX01-copular-resolved-tax-topic-is-explicit-tax-task`
5. `C34-TX02-import-duty-instrument-excluding-rate-classification-and-computation`
6. `C34-TR01-legal-rule-effect-or-contract-tax-clause-is-treatment`
7. `BASELINE_TOTAL_TERMINATING_PRECEDENCE`

C34-CP01 remains terminally rejected: its feature-ablation result was 7/8 and its precedence check failed. It may not be rerun, renamed, or reintroduced. A strict reason-label mismatch is not by itself a user-visible error or proof of a causal runtime defect.
