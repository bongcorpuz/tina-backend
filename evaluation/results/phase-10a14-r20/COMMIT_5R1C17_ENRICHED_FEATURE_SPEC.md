# PHASE-10A14-R20 — COMMIT 5R1-C17

## Enriched Reason-Observability Feature Specification (§7, §9)

Authored **before any runtime modification**. Every feature is derived by deterministic
parsing of the primary clause and the already-locked relation output. No external model,
no new dependency, no oracle metadata, no template identity, no complete query text.

---

## 1. The controlling result

C16 recorded 236 residual rows in colliding feature vectors and characterised that as a
ceiling. **C17 shows it was a feature-observability defect, exactly as §6 states.**
Recomputed over the current 535 residual rows:

```text
                          vectors   separable rows   colliding rows
C16 feature set                69              325              210
ENRICHED feature set          131              494               41
collision reduction                                             169
```

The reachable ceiling rises from 325 to **494 of 535 rows**. Only **41 rows in 4 vectors**
remain irreducible under deterministic parsing.

## 2. Per-feature collision reduction

Each enriched feature added **singly** to the C16 set, measured over all 535 residual rows:

| Feature | Colliding after | Reduction |
|---|---|---|
| `requestedOutcomeClass` | 100 | **110** |
| `requestOperationClass` | 126 | **84** |
| `targetSemanticRole` | 139 | **71** |
| `topicCompleteness` | 153 | 57 |
| `questionOperator` | 173 | 37 |
| `assertionClass` | 176 | 34 |
| `contextAttachment` | 184 | 26 |
| `predicateArgumentStructure` | 194 | 16 |
| `predicateAttachment` | 200 | 10 |
| `ambiguityObject` | 210 | 0 |

`ambiguityObject` reduces nothing on its own — it is fully determined by the existing
`unresolvedKind` for these rows — and is therefore **not implemented as a separate
control**. The three highest-yield features are the requested outcome, the request
operation class, and the target's semantic role.

## 3. Feature definitions and runtime derivation

```text
questionOperator          yes_no | wh_what | wh_how | wh_which | wh_when | wh_where
                          | wh_why | wh_filipino | none
                          derived from the clause-initial interrogative token.

requestOperationClass     transformation | retrieval | explanation | evaluation
                          | creative | naming | direct_imperative | none
                          derived from the clause-initial imperative head lemma class.

assertionClass            naming_assertion | equational | local_redefinition | denial
                          | topic_fragment | descriptive
                          derived from copular/equational surface structure.

predicateAttachment       subject | object_complement | proposition | no_tax_predicate
                          where the tax predicate attaches in the clause.

predicateArgumentStructure copular | transitive_action | process | other

requestedOutcomeClass     form_selection | deadline | penalty | registration
                          | remittance | filing | evidentiary | definition
                          | computation | status_treatment | transformation
                          | naming | explanation | none
                          WHAT the request asks to be produced.

targetSemanticRole        tax_concept | procedure | transaction | receipt_income
                          | service | asset | artefact | other
                          the semantic role of the governed target — NOT a noun
                          whitelist; role is decided by structural position and
                          category membership, and no specific R3 object is named.

targetSyntacticRole       subject | prepositional_object | direct_object | none

topicCompleteness         unresolved_referent | acronym_itself | bare_topic
                          | definite_target | topic_fragment | indefinite_target

contextAttachment         primary_only | concessive_context | subordinate_context
                          | multi_clause_primary_first
```

## 4. Constraints honoured

The layer is **read-only with respect to everything already locked**. It does not change
clause segmentation output, the decision, the relations, relation objects, or the
precedence order. No relation is altered to make reason selection easier (§9).

Prohibited controls, none used:

```text
primaryCategory or other oracle metadata     not used
expected reason                              not used
source set / query id / oracle id            not used
template identity / complete query text      not used
exact object-name lists                      not used
mere tax-token presence                      not used (rejected in C15)
mere homograph presence                      not used (rejected in C15)
```

## 5. §8 learnability stop condition — assessed

Four vectors totalling 41 rows remain identical across all enriched features while
requiring different reasons:

```text
n=23   no_tax_relation 3  | explicit_non_tax_task 20
n=11   no_tax_relation 1  | explicit_non_tax_task 10
n= 4   no_tax_relation 2  | explicit_non_tax_task  2
n= 3   no_tax_relation 2  | non_tax_expansion      1
```

Three of the four are **strongly dominated** by one reason; only the 4-row vector is
evenly split. Since the enrichment removed 169 of the 210 C16 collisions, the honest
reading is that these are **not yet demonstrated** to be oracle defects — a further
deterministic feature may still separate them. They are therefore recorded as
`POSSIBLE_R3_REASON_LEARNABILITY_CONFLICT` **candidates only**, preserved in full, with
**no exception added, no oracle change, and no closure claimed** on their account.

## 6. Rules to implement, in measured order

```text
P1  requestedOutcomeClass drives the ALLOW families (110 reduction)
      form_selection/registration/remittance/filing/deadline/penalty -> compliance
      status_treatment over an external target                       -> ordinary object
      evidentiary                                                    -> NOT compliance
P2  requestOperationClass drives the REFUSE families (84 reduction)
      naming            -> label family only when the act assigns a name
      transformation    -> quotation family when the operand is a term
      other imperatives -> explicit_non_tax_task
P3  targetSemanticRole separates the two ALLOW families (71 reduction)
      tax_concept / procedure as the requested subject -> explicit_tax_task_relation
      transaction / receipt / service / asset target   -> ordinary-object treatment
P4  NEGATES_TAX_RELEVANCE as the controlling relation with a denial assertion
      -> explicit_non_tax_task  (two separable vectors, 41 rows)
```

## 7. Expected ceiling, stated before coding

Best case is **494 of 535 rows**, leaving 41. Full closure (3,720/3,720) is **not**
reachable in C17 on this evidence. If the run ends short I will record the lane as open
with the enriched analysis carried forward, rather than add narrow rules.
