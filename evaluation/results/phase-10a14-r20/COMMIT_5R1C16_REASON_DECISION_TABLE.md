# PHASE-10A14-R20 — COMMIT 5R1-C16

## Reason Decision Table over Typed Reason Evidence

Derived **before any coding** from `COMMIT_5R1C16_REASON_FEATURE_SEPARABILITY.json` and
`COMMIT_5R1C16_REASON_MINIMAL_PAIR_ANALYSIS.json`, measured over all 3,720 R3 rows.
Every field is computed at runtime from the already-locked clause and relation evidence.
No oracle category, source set, RF rule id, template, query id or expected reason is a
control anywhere in this table.

---

## 1. Typed reason evidence (§8)

```text
reasonSpeechAct          request | question | question_marked_assertion | assertion
reasonPredicateClass     deductibility | vat | withholding | customs | taxability
                         | procedure | tax_concept | none
reasonControllingRelation  the first emitted relation (relation lane is locked)
reasonTargetRole         tax_concept_itself | external_object | tax_procedure | none
reasonUnresolvedKind     acronym | referent | none
reasonContextScope       single_clause | multi_clause
reasonTaskRole           explicit action head present / action target present
```

## 2. Measured feature separation

| Feature | Support | Precision | Coverage | Counterex. | Dominant reason |
|---|---|---|---|---|---|
| `naming_act` | 28 | **1.000** | 0.139 | 0 | `non_tax_label_or_name` |
| `expansion_act` | 18 | **1.000** | 0.204 | 0 | `non_tax_expansion` |
| `request_with_action_target` | 453 | 0.898 | 0.454 | 46 | `explicit_non_tax_task` |
| `speech_act_request` | 785 | 0.855 | 0.748 | 114 | `explicit_non_tax_task` |
| `quotation_act` | 120 | 0.750 | 0.750 | 30 | `quoted_tax_term_only` |
| `unresolved_referent` | 150 | 0.667 | 0.178 | 50 | `no_tax_relation` |
| `external_object_under_tax_predicate` | 602 | 0.651 | 0.500 | 210 | `tax_treatment_of_ordinary_object` |
| `target_is_tax_procedure` | 571 | 0.487 | 0.955 | 293 | `tax_compliance_task` |

Single features are **not** sufficient: only the two acts reach precision 1.000, and they
are already handled. The usable signal lies in **conjunctions**, which is what the
residual feature-vector analysis measures directly.

## 3. Residual separability — the controlling result

The 614 residual rows occupy **69 distinct runtime feature vectors**:

```text
rows in SEPARABLE vectors   378   every residual row sharing the vector has ONE expected reason
rows in COLLIDING vectors   236   the same vector carries two or more expected reasons
```

**This is the honest budget for C16.** A rule over these features can address at most the
378 separable rows. The 236 colliding rows are provably unreachable with this feature
set: two rows with identical runtime evidence require different reasons, so no rule over
that evidence can separate them. They need a *further feature*, not a narrower regex.

The three largest colliding vectors alone account for 176 rows:

```text
n=87  assertion|none|REQUESTS_NON_TAX_ACTION_ON|none   no_tax_relation 84 | explicit_non_tax_task 3
n=49  request  |none|REQUESTS_NON_TAX_ACTION_ON|none   explicit_non_tax_task 38 | no_tax_relation 11
n=40  question |none|REQUESTS_NON_TAX_ACTION_ON|none   no_tax_relation 26 | explicit_non_tax_task 13 | expansion 1
```

Note that each is **dominated** by one reason. Defaulting each vector to its dominant
reason is a measured structural choice, not memorization, and is worth 84 + 38 + 26 = 148
rows at the cost of 27 counterexamples — a net gain of 121. That trade is stated here in
advance so the result can be judged against it.

## 4. The decision table (applied in order)

Each rule cites its measured support, and every rule is a conjunction of typed evidence.

```text
R1  naming act asserted                                  -> non_tax_label_or_name
      precision 1.000, 0 counterexamples
      §9B: the action head controls; an unrelated action on a named object is R6.

R2  local non-tax redefinition asserted                  -> non_tax_expansion
      precision 1.000, 0 counterexamples

R3  text operation over a term                           -> quoted_tax_term_only
      precision 0.750; already partly implemented in C15

R4  unresolved item is the ACRONYM itself                -> ambiguous_tax_acronym
      unresolved item is the broader TOPIC/referent      -> no_tax_relation
      §9E: the object of ambiguity controls. Vector
      question|*|REQUESTS_NON_TAX_ACTION_ON|referent (n=20, n=10) is separable.

R5  specific tax predicate over the target, target is
    the TAX CONCEPT/procedure itself                     -> explicit_tax_task_relation
      vectors question|withholding|ASKS_WITHHOLDING_ON|none (33),
              question|deductibility|ASKS_DEDUCTIBILITY_OF|none (15),
              question|none|ASKS_TAX_TREATMENT_OF|acronym (27)
      §9C: the semantic role of the target decides, never a noun list.

R6  tax predicate governs an EXTERNAL object/transaction -> tax_treatment_of_ordinary_object
      vectors question|taxability|ASKS_TAX_TREATMENT_OF|none (21),
              question|tax_concept|ASKS_TAX_TREATMENT_OF|none (16)

R7  requested OUTCOME is a filing/registration/remittance
    /form/deadline/records act                           -> tax_compliance_task
      vector question|procedure|ASKS_TAX_TREATMENT_OF|acronym (10)
      §9D preserved: "what records support X" may be evidentiary treatment, not filing.

R8  REFUSE split (§9A), applied last:
      an explicit action head AND an action target       -> explicit_non_tax_task
      otherwise (question / assertion / description /
      topic request, no controlling tax relation)        -> no_tax_relation
      request_with_action_target precision 0.898.
      Vector question|procedure|REQUESTS_NON_TAX_ACTION_ON|none (26) and
      assertion|procedure|REQUESTS_NON_TAX_ACTION_ON|none (13) are separable.
```

## 5. Prohibited controls, restated

```text
mere tax-token presence                    rejected in C15 (24.4% vs 40.8%)
mere homograph-token on an imperative      rejected in C15 (16.7% vs 36.8%, wrong way)
primaryCategory or any oracle metadata     forbidden
exact template/query/source-set/ID match   forbidden
specific R3 objects (cooling fan, etc.)    forbidden
```

## 6. Counterexamples, listed explicitly

Every rule above carries counterexamples, recorded in the separability file:

```text
R8  request_with_action_target          46 counterexamples over 453 support
R5/R6 external_object_under_predicate  210 counterexamples over 602 support
R7  target_is_tax_procedure            293 counterexamples over 571 support
R4  unresolved_referent                 50 counterexamples over 150 support
```

R5, R6 and R7 are therefore implemented **only at the separable vectors**, never as
blanket single-feature rules. Where a vector collides, the dominant reason is used and
the counterexample cost is reported.

## 7. Expected ceiling, stated before coding

Best case with this feature set is **614 − 236 = 378 rows**, and only if every separable
vector is captured without disturbing the 3,106 rows already correct. Full closure
(3,720/3,720) is **not** reachable in C16 on this evidence. If the run ends short I will
record the lane as open and carry the colliding-vector analysis to C17, rather than add
narrow rules to close the gap.
