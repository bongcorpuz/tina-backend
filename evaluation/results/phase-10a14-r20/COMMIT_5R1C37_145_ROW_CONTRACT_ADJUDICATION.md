# C37 145-row contract adjudication

All 145 unique C36 residuals are adjudicated; none is a proven generalized runtime defect. The JSON companion preserves every complete trace and evidence binding.

| # | Row | Query | Cluster | Expected → actual reason | Primary category | Runtime separator |
|---:|---|---|---|---|---|---|
| 1 | S1-IR19-1007 | Is a cooling fan purchase deductible for income tax? Group MM-04. | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 2 | S1-IR19-1014 | Tune the RMC music channel. Group MM-07. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 3 | S1-IR19-1026 | Books means novels about accountants. Group MM-13. | local-redefinition-and-expansion-boundary | `explicit_non_tax_task` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 4 | S1-IR19-1028 | Transfer pricing is a board-game mechanic. Group MM-14. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 5 | S1-IR19-1030 | mcit (my cool internal tool) joke expansion. Group MM-15. | local-redefinition-and-expansion-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 6 | S1-IR19-1032 | RCIT (Regional Coding Internship Track) applies? Group MM-16. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 7 | S1-IR19-1033 | Is PAN sale VATable if PAN is a product code? Group MM-17. | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 8 | S1-IR19-1034 | PAN means cooking utensil. Group MM-17. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 9 | S1-IR19-1036 | FAN means cooling fan. Group MM-18. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 10 | S1-IR19-1038 | Authority to print a school newspaper. Group MM-19. | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 11 | S1-IR19-1040 | Annual registration fee for a sports club. Group MM-20. | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 12 | S1-IR19-1047 | Is a cooling fan purchase deductible for income tax? Group MM-24. | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 13 | S1-IR19-1054 | Tune the RMC music channel. Group MM-27. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 14 | S1-IR19-1066 | Books means novels about accountants. Group MM-33. | local-redefinition-and-expansion-boundary | `explicit_non_tax_task` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 15 | S1-IR19-1068 | Transfer pricing is a board-game mechanic. Group MM-34. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 16 | S1-IR19-1070 | mcit (my cool internal tool) joke expansion. Group MM-35. | local-redefinition-and-expansion-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 17 | S1-IR19-1072 | RCIT (Regional Coding Internship Track) applies? Group MM-36. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 18 | S1-IR19-1073 | Is PAN sale VATable if PAN is a product code? Group MM-37. | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 19 | S1-IR19-1074 | PAN means cooking utensil. Group MM-37. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 20 | S1-IR19-1076 | FAN means cooling fan. Group MM-38. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 21 | S1-IR19-1078 | Authority to print a school newspaper. Group MM-39. | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 22 | S1-IR19-1080 | Annual registration fee for a sports club. Group MM-40. | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 23 | S1-IR19-1087 | Is a cooling fan purchase deductible for income tax? Group MM-44. | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 24 | S1-IR19-1094 | Tune the RMC music channel. Group MM-47. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 25 | S1-IR19-1106 | Books means novels about accountants. Group MM-53. | local-redefinition-and-expansion-boundary | `explicit_non_tax_task` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 26 | S1-IR19-1108 | Transfer pricing is a board-game mechanic. Group MM-54. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 27 | S1-IR19-1110 | mcit (my cool internal tool) joke expansion. Group MM-55. | local-redefinition-and-expansion-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 28 | S1-IR19-1112 | RCIT (Regional Coding Internship Track) applies? Group MM-56. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 29 | S1-IR19-1113 | Is PAN sale VATable if PAN is a product code? Group MM-57. | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 30 | S1-IR19-1114 | PAN means cooking utensil. Group MM-57. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 31 | S1-IR19-1116 | FAN means cooling fan. Group MM-58. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 32 | S1-IR19-1118 | Authority to print a school newspaper. Group MM-59. | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 33 | S1-IR19-1120 | Annual registration fee for a sports club. Group MM-60. | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 34 | S2-IR18-DOM-007 | final withholding tax | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 35 | S2-IR18-DOM-021 | excise tax | bare-tax-topic-versus-treatment-boundary | `tax_treatment_of_ordinary_object` → `explicit_tax_task_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 36 | S2-IR18-DOM-059 | withholding certificate | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 37 | S2-IR18-DOM-061 | deductible representation expense | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 38 | S2-IR18-DOM-062 | fringe benefit tax | bare-tax-topic-versus-treatment-boundary | `tax_treatment_of_ordinary_object` → `explicit_tax_task_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 39 | S2-IR18-DOM-072 | deficiency withholding tax | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 40 | S2-IR18-DOM-073 | stock transaction tax | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 41 | S2-IR18-DOM-113 | CSS grid layout | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 42 | S2-IR18-DOM-115 | color palette selection | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 43 | S2-IR18-DOM-120 | software variable naming | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 44 | S2-IR18-DOM-121 | TypeScript interface design | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 45 | S2-IR18-DOM-134 | pharmacology trial design | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 46 | S2-IR18-DOM-159 | private lease weekend deadline | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 47 | S2-IR18-DOM-160 | office duty roster | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 48 | S2-IR18-DOM-166 | filing cabinet organization | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 49 | S2-IR18-DOM-192 | official receipt layout design | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 50 | S2-IR18-DOM-199 | reconsideration request for exam grade | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 51 | S2-IR18-DOM-204 | assessment in classroom rubric | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 52 | S2-IR18-DOM-214 | input VAT as form input label | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 53 | S2-IR18-DOM-221 | VAT paint swatch | ambiguous-tax-homograph-non-tax-sense-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 54 | S2-IR18-DOM-228 | deadline in school calendar | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 55 | S2-IR18-DOM-229 | return due in library books | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 56 | S2-IR18-DOM-233 | Set the taxable variable to true. Variant 1. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_label_or_name` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 57 | S2-IR18-DOM-240 | Is BOC a band of chords? Variant 1. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 58 | S2-IR18-DOM-243 | Does the BOC band play jazz? Variant 1. | ambiguous-tax-homograph-non-tax-sense-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 59 | S2-IR18-DOM-244 | Tune the BOC chord progression. Variant 1. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 60 | S2-IR18-DOM-247 | Use capital as a font style. Variant 1. | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 61 | S2-IR18-DOM-251 | Input VAT into this web form field. Variant 1. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 62 | S2-IR18-DOM-254 | Add taxable to the CSS class list Variant 1. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 63 | S2-IR18-DOM-258 | Set the taxable variable to true. Variant 2. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_label_or_name` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 64 | S2-IR18-DOM-265 | Is BOC a band of chords? Variant 2. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 65 | S2-IR18-DOM-268 | Does the BOC band play jazz? Variant 2. | ambiguous-tax-homograph-non-tax-sense-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 66 | S2-IR18-DOM-269 | Tune the BOC chord progression. Variant 2. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 67 | S2-IR18-DOM-272 | Use capital as a font style. Variant 2. | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 68 | S2-IR18-DOM-276 | Input VAT into this web form field. Variant 2. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 69 | S2-IR18-DOM-279 | Add taxable to the CSS class list Variant 2. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 70 | S2-IR18-DOM-283 | Set the taxable variable to true. Variant 3. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_label_or_name` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 71 | S2-IR18-DOM-290 | Is BOC a band of chords? Variant 3. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 72 | S2-IR18-DOM-293 | Does the BOC band play jazz? Variant 3. | ambiguous-tax-homograph-non-tax-sense-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 73 | S2-IR18-DOM-294 | Tune the BOC chord progression. Variant 3. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 74 | S2-IR18-DOM-297 | Use capital as a font style. Variant 3. | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 75 | S2-IR18-DOM-301 | Input VAT into this web form field. Variant 3. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 76 | S2-IR18-DOM-304 | Add taxable to the CSS class list Variant 3. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 77 | S2-IR18-DOM-308 | Set the taxable variable to true. Variant 4. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_label_or_name` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 78 | S2-IR18-DOM-315 | Is BOC a band of chords? Variant 4. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 79 | S2-IR18-DOM-318 | Does the BOC band play jazz? Variant 4. | ambiguous-tax-homograph-non-tax-sense-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 80 | S2-IR18-DOM-319 | Tune the BOC chord progression. Variant 4. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 81 | S2-IR18-DOM-322 | Use capital as a font style. Variant 4. | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 82 | S2-IR18-DOM-326 | Input VAT into this web form field. Variant 4. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 83 | S2-IR18-DOM-329 | Add taxable to the CSS class list Variant 4. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 84 | S2-IR18-DOM-348 | What form should I use? Context 1. | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 85 | S2-IR18-DOM-368 | What form should I use? Context 2. | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 86 | S2-IR18-DOM-388 | What form should I use? Context 3. | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 87 | S2-IR18-DOM-408 | What form should I use? Context 4. | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 88 | S2-IR18-DOM-412 | Kailan due ang withholding tax? Batch 1. | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `SEMANTICALLY_EQUIVALENT_REASON` | No |
| 89 | S2-IR18-DOM-432 | Kailan due ang withholding tax? Batch 2. | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `SEMANTICALLY_EQUIVALENT_REASON` | No |
| 90 | S2-IR18-DOM-452 | Kailan due ang withholding tax? Batch 3. | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `SEMANTICALLY_EQUIVALENT_REASON` | No |
| 91 | S2-IR18-DOM-475 | Is BOC a band of chords? | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 92 | S2-IR18-DOM-493 | Make an alphabetical list of names. | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 93 | S2-IR18-DOM-503 | Input VAT into a text box. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 94 | S2-IR18-DOM-506 | What expenses are deductible? | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 95 | S2-IR18-DOM-515 | Use MCIT as a random SKU. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 96 | S2-IR18-DOM-533 | RCIT is my robotics course ID; define it generically. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_label_or_name` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 97 | S2-IR18-DOM-541 | Make an alphalist of students alphabetically. | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 98 | S2-IR18-DOM-543 | BOC means band of chords in this song. | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 99 | S2-IR18-DOM-545 | VAT is a color token in my design system. | ambiguous-tax-homograph-non-tax-sense-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 100 | S2-IR18-DOM-549 | Gross estate means ugly real-estate ads here. | local-redefinition-and-expansion-boundary | `no_tax_relation` → `non_tax_expansion` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 101 | S2-IR18-DOM-565 | EFPS is a random software flag. | bare-ordinary-artifact-nominal-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 102 | S3-IR17-032 | How is capital gain tax computed on sale of real property? | tax-treatment-versus-explicit-tax-boundary | `explicit_tax_task_relation` → `tax_treatment_of_ordinary_object` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 103 | S3-IR17-073 | What is the deadline to protest a BIR assessment? | tax-administrative-deadline-terminal-rejection | `tax_compliance_task` → `explicit_tax_task_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 104 | S3-IR17-081 | When is rent due under a private lease contract? | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 105 | S3-IR17-095 | Can a buyer cancel a private sale agreement? | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 106 | S3-IR17-099 | How do I make an insurance claim under my policy? | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 107 | S3-IR17-127 | What is the prescriptive period for money claims in labor? | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 108 | S3-IR17-132 | What return date appears in a summons? | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 109 | S3-IR17-134 | What report must a corporation file after board changes? | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 110 | S3-IR17-136 | What is the due date for a position paper? | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 111 | S3-IR17-139 | What is the deadline for a labor appeal bond? | explicit-ordinary-task-versus-no-relation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_CONTRACT_INCONSISTENCY` | No |
| 112 | S3-IR17-181 | Kailan ang due date ng private lease rent? | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 113 | S3-IR17-186 | Pwede bang mag-return ng defective computer file? | ordinary-inquiry-without-operation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 114 | S3-IR17-188 | Paano ang insurance claim? | ordinary-inquiry-without-operation-boundary | `no_tax_relation` → `explicit_non_tax_task` | `UNDERDETERMINED_WITHOUT_CONTEXT` | No |
| 115 | S3-IR17-208 | When is a private lease car returned? | ambiguous-tax-homograph-non-tax-sense-boundary | `no_tax_relation` → `explicit_non_tax_task` | `ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED` | No |
| 116 | R20N-ENT-0521 | basketball match final buzzer | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 117 | R20N-ENT-0526 | penalty box clearance rule | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 118 | R20N-ENT-0531 | homework submission portal | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 119 | R20N-ENT-0536 | insurance policy deductible clause | ambiguous-tax-homograph-non-tax-sense-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 120 | R20N-ENT-0541 | delivery app service surcharge | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 121 | R20N-ENT-0546 | commuter railway timetable | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 122 | R20N-ENT-0551 | GitHub merge request reviewers | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 123 | R20N-ENT-0556 | board game pricing tokens mechanic | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 124 | R20N-ENT-0561 | weekend sermon slide deck | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 125 | R20N-ENT-0566 | court hearing arraignment memo | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 126 | R20N-ENT-0576 | music festival stage lineup | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 127 | R20N-ENT-0591 | in-game points reward levy | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 128 | R20N-ENT-0601 | video game currency exchange | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 129 | R20N-ENT-0606 | soccer match penalty box | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 130 | R20N-ENT-0616 | restaurant service charge menu | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 131 | R20N-ENT-0621 | hotel resort fee brochure | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 132 | R20N-ENT-0626 | airline baggage fee chart | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 133 | R20N-ENT-0631 | concert ticket surcharge notice | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 134 | R20N-ENT-0636 | movie rating classification | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 135 | R20N-ENT-0641 | cooking recipe measurement | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 136 | R20N-ENT-0646 | yoga class schedule | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 137 | R20N-ENT-0651 | marathon registration form | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 138 | R20N-ENT-0661 | podcast episode transcript | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 139 | R20N-ENT-0666 | weather forecast report | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 140 | R20N-ENT-0671 | traffic penalty appeal letter | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 141 | R20N-ENT-0681 | grocery loyalty discount | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 142 | R20N-ENT-0686 | streaming subscription tier | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 143 | R20N-ENT-0691 | apartment lease cleaning clause | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 144 | R20N-ENT-0706 | bakery order form | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
| 145 | R20N-ENT-0716 | pet grooming price list | bare-ordinary-artifact-nominal-boundary | `explicit_non_tax_task` → `no_tax_relation` | `ACCEPTED_FAIL_CLOSED_BEHAVIOR` | No |
