# Registration Reachability Analysis

Q38 failed closed 3/3 on non-registration authority, as intended.
Registration reachability is not blanket-suppressed because Q1-r3 reached VERIFIED_CONTROLLING on a VAT-registration threshold answer with NIRC Sec. 236 displayed.

Sidecar SIDE-REG-POS produced a correct registration answer but surfaced only NIRC Sec. 2 and Sec. 3, so it correctly failed closed as RELATED_AUTHORITY_ONLY. This is a retrieval/source-surfacing limitation, not proof of runtime gate overblocking.

Severity: P2 retrieval/surfacing limitation, not P1 standing alone.
