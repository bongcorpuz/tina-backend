# M-Q36 Legal And Source-Support Determination

Prompt: What penalties apply to late filing of a VAT return?

## R6 Payload Result

- Classification: RELATED_AUTHORITY_ONLY
- Answer-support stage: `proposition-source-sufficiency`
- Reason: `penalty_proposition_without_penalty_authority`
- Verified eligible: false
- Source cards: NIRC Sec. 105, 106, 107, 108, RR 16-2005

## Determination

PASS. The prior unsafe M-Q36 verified defect is remediated because general VAT authority can no longer verify a penalty/procedural proposition. The R6 answer still contains penalty claims and even textually mentions NIRC sections 248/249, but those authorities are not in the retrieved source cards. The deterministic gate therefore correctly refuses VERIFIED_CONTROLLING.

RELATED_AUTHORITY_ONLY is appropriate: the system found VAT-related authority but not penalty/procedural authority sufficient to verify the answer.