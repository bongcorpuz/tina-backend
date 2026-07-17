# Findings Table

| ID | Severity | Affected slots | Finding | Decision impact |
|---|---:|---|---|---|
| IR1-P1-001 | P1 | Q12-r1/r2/r3 | Filing-obligation answer verified on income-rate/classification sources rather than filing-return authority; conditions for no filing are omitted or unsupported. | Blocks PASS |
| IR1-P1-002 | P1 | Q30-r1/r2/r3 | Estate tax rate/base answer conflates 6% net-estate rate with a PHP 5M threshold and omits taxpayer/deduction distinctions. | Blocks PASS |
| IR1-P1-003 | P1 | Q34-r1/r2/r3 | Individual AITR deadline verified on Sec. 23/24/27 source cards that do not establish filing deadline. | Blocks PASS |
| IR1-P2-001 | P2 | SIDE-REG-POS | Correct positive registration answer failed verification because retrieval surfaced only foundational non-registration authority. | Non-blocking |
| IR1-P2-002 | P2 | SIDE-VATEXC-POS | Correct positive VAT-exemption answer failed verification because retrieval surfaced general VAT authority rather than Sec. 109 exemption authority. | Non-blocking |
| IR1-P2-003 | P2 | Q3-r1/r3 | Exporter input-VAT refund answer verified with broad RR 16-2005/source labels; citation precision should improve. | Non-blocking by itself |
| IR1-P3-001 | P3 | Q10 retries | Degenerate 16-character generations were retried under policy and preserved. | Non-blocking |
