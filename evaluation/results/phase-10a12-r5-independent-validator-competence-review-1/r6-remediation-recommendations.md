# R6 Remediation Recommendations

1. Add deterministic source-sufficiency gates by proposition class.
2. Penalty/procedural gate: detect penalty, late filing, surcharge, interest, compromise penalty, filing deadline, and form obligation propositions; require penalty/procedure authorities, and fail closed on generic substantive VAT-only sources.
3. EWT/legal-form gate: detect EWT on professional/legal/accounting/service-firm payments; require withholding and legal-form authorities, and fail closed when VAT registration/invoicing sources are the only support.
4. Require cited source cards to support each material proposition, not merely the general tax topic.
5. Keep the LLM validator as a secondary check, not the sole source-sufficiency decision maker.
6. Preserve runner coverage: deterministic lane plus mandatory staging lane must both pass from the protected working state.
7. Record explicit owner authorization, source-bank snapshot hash, manifest hash, push chronology, first-live request timestamp, and final payload commit in one audit artifact.
8. Rerun the frozen canonical mini-30 only after remediation and require 0 invalid VERIFIED_CONTROLLING answers.