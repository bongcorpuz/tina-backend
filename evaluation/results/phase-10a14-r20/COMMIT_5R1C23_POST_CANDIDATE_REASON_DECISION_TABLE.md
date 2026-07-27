# COMMIT 5R1-C23 Reason Decision Table

| Precedence | Structural predicate | Reason |
|---:|---|---|
| 1 | Text operation over a quoted operand, with no request to apply tax law | quoted_tax_term_only |
| 2 | Requested concrete non-tax operation on an external object | explicit_non_tax_task |
| 3 | Ordinary assertion/topic with no requested operation and no tax relation | no_tax_relation |
| 4 | Local expansion or equative definition to a non-tax meaning | non_tax_expansion |
| 5 | Identifier assignment, internal label or naming complement | non_tax_label_or_name |
| 6 | Tax compliance outcome such as filing, registration, remittance or protest deadline | tax_compliance_task |
| 7 | Tax definition outcome in controlling tax context | tax_definition_with_context |
| 8 | Tax rule, instrument or procedure as the requested subject | explicit_tax_task_relation |
| 9 | External transaction or item as tax-treatment bearer | tax_treatment_of_ordinary_object |
| 10 | Unresolved acronym or incomplete referent with plausible tax sense | ambiguous_tax_acronym |

Rows are structural only. No row may mention oracle ids, fixture nouns, query hashes,
scenario numbers, expected labels or source-set membership.
