# WS1 pre-patch reproduction (HEAD d5cfceb) — all five P1 defects OPEN

Method: reviewer P1 probes replayed through the pre-R3 evaluatePropositionSourceSufficiency.
Each line: probe -> disposition (OPEN=not blocked, the defect; CLOSED=blocked).
```
== P1-1 mixed-object filing suppression (all SHOULD close filing_obligation) ==
MO-1	OPEN:none
MO-2	OPEN:none
MO-3	OPEN:none
== P1-2 relative/Taglish deadline (SHOULD close filing_deadline) ==
DL-1	OPEN:none
DL-2	OPEN:none
== P1-3 cross-tax-type authority laundering (SHOULD close filing_deadline) ==
XT-1	OPEN:filing_deadline
XT-2	OPEN:filing_deadline
== P1-4 correct-but-unsupported estate computation (SHOULD close tax_computation_basis) ==
EU-1	OPEN:tax_computation_basis
== P1-5 relational standard-deduction-as-threshold (SHOULD close tax_computation_basis) ==
ER-1	OPEN:tax_computation_basis
```

P1-1 (MO-*): a wrong object (documents/protest/refund claim) in combined text suppresses a separate decisive filing_obligation -> OPEN:none.
P1-2 (DL-*): relative-period/Taglish deadline forms unclassified -> OPEN:none.
P1-3 (XT-*): pooled filing-deadline authority accepts wrong tax type (estate auth for individual ITR deadline; individual auth for estate return) -> OPEN:filing_deadline (applicable but sufficient=true = cross-tax laundering).
P1-4 (EU-1): a correct estate computation on foundational-only authority (Sec 1/6) is sufficient -> OPEN:tax_computation_basis.
P1-5 (ER-1): standard-deduction-as-threshold misstatement not detected (estateBaseMisstatement=false) -> OPEN:tax_computation_basis.
