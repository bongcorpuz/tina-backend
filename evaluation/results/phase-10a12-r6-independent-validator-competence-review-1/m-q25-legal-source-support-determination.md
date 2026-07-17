# M-Q25 Legal And Source-Support Determination

Prompt: Is EWT required on payments to a VAT-registered law firm?

## R6 Payload Result

- Classification: RELATED_AUTHORITY_ONLY
- Answer-support stage: `proposition-source-sufficiency`
- Reason: `ewt_proposition_without_withholding_authority`
- Verified eligible: false
- Source cards: NIRC Sec. 109, NIRC Sec. 236, RR No. 16-2005, RMC 75-2015

## Determination

PASS. VAT registration and invoicing authority cannot verify an EWT/legal-form conclusion. The R6 deterministic gate correctly blocks VERIFIED_CONTROLLING because no withholding authority is present in the displayed source cards.

RELATED_AUTHORITY_ONLY is appropriate and not over-conservative: the answer remains legally incomplete, but it is no longer marked verified.