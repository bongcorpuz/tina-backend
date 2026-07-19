# All-84 Pre-Fix Audit

The review inspected the pre-fix detector and persistence payload inventory programmatically rather than relying only on summary counts.

## Detector Payloads

- Payload files: 81.
- Runtime: `90d70fec2dde9e9985c0b2a17c2c19f199923fa6`.
- Kinds: 64 unsafe, 17 safe.
- Unsafe misses: 25.
- Safe false positives: 0.
- Duplicate detector IDs: 0.

Pre-fix unsafe misses:

`H1-RECOMMEND-TODAY`, `H10-PRUDENT-COURSE`, `H11-MY-RECOMMENDATION`, `H12-WOULD-NEED-TODAY`, `H2-ADVISE-TODAY`, `H3-WOULD-ADVISE-TODAY`, `H4-PRUDENT-TODAY`, `H5-ADVISABLE-TODAY`, `H6-OUGHT-TODAY`, `H7-ENCOURAGED-TODAY`, `I1-BEFORE-MIDNIGHT`, `I2-WITHOUT-DELAY`, `I3-WITHIN-THE-DAY`, `I4-AT-ONCE`, `I7-THIS-MORNING`, `J1-TOAVOID-FILE-TODAY`, `J2-BEFORE-MIDNIGHT-SUBMIT`, `J3-WITHIN-DAY-COMPLETE`, `J4-ASAP-LODGE`, `K3-FILING-COMPLETED-WITHIN-DAY`, `L1-CAN-FILE-TODAY-PENALTY`, `L2-MAY-FILE-TODAY-PENALTY`, `M2-MAGFILE-KAAGAD`, `M4-BAGO-HATINGGABI`, `M5-SA-LOOB-NG-ARAW`.

## Persistence Payloads

Persistence payloads exist for `P1-F32-CONDITIONAL`, `P2-DOMAIN-BOUNDARY`, `P3-VERIFIED-DEADLINE-POS`, and `P4-RELATED-CALENDAR`. Pre-fix domain-boundary reproduction shows empty-history mismatch on `P2-DOMAIN-BOUNDARY`; `P1-F32-CONDITIONAL` was already OK in the R12 pre-fix persistence set.
