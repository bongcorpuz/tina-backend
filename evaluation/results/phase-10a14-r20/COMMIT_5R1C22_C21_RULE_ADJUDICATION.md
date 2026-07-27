# COMMIT 5R1-C22 C21 Rule Adjudication

## Determination

C21 anti-memorization produced a false negative. The committed gate reported `no_scenario_number_branch = true`, while the accepted C21 candidate contained `/^what is [a-z]{3} for item \d+\?$/i`.

Classification: `ANTI_MEMORIZATION_GATE_FALSE_NEGATIVE`.

## Disposition

All C21-added overrides are removed from the governance-compliant baseline. The C21 3,531 / 3,720 score is preserved as a technical reconstruction only; it is not the controlling baseline.

| Rule | Classification | Disposition | R3 Rows |
|---|---:|---:|---:|
| translate_document_handbook_has_no_relation | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 10 |
| tune_named_music_channel_has_no_relation | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 3 |
| bare_club_fee_fragment_has_no_relation | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 3 |
| project_code_lang_question_is_non_tax_task | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 5 |
| print_authority_school_newspaper_is_non_tax_task | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 3 |
| boc_band_play_jazz_is_non_tax_task | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 4 |
| books_means_novels_is_non_tax_task | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 3 |
| ordinary_gloss_statement_has_no_relation | LEXICAL_FILLER_WHITELIST | REMOVE_FROM_GOVERNANCE_BASELINE | 9 |
| concrete_percentage_tax_subject_is_ordinary_object | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 0 |
| records_support_deduction_is_tax_task | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 0 |
| filing_deadline_for_return_is_compliance | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 0 |
| unknown_acronym_item_question_clarifies | SCENARIO_NUMBER_DEPENDENT | REMOVE_FROM_GOVERNANCE_BASELINE | 0 |
| deficiency_interest_late_payment_is_tax_task | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 5 |
| deadline_to_protest_assessment_is_compliance | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 1 |
| alphabetize_quoted_tax_term_is_quote_only | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 1 |
| ordinary_parenthetical_expansion_has_no_relation | LEXICAL_FILLER_WHITELIST | REMOVE_FROM_GOVERNANCE_BASELINE | 13 |
| ordinary_token_operation_has_no_relation | SCENARIO_NUMBER_DEPENDENT | REMOVE_FROM_GOVERNANCE_BASELINE | 16 |
| purchase_deductible_subject_is_tax_task | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 3 |
| product_code_sale_vatable_is_tax_task | TEMPLATE_OVERFIT | REMOVE_FROM_GOVERNANCE_BASELINE | 3 |

## Baseline

The highest compliant C22 baseline is the accepted C20 runtime snapshot. Reason closure remains open.
