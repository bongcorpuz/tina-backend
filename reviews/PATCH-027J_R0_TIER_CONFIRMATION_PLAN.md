# PATCH-027J-R0 TIER CONFIRMATION PLAN

## Status

PRE-IMPLEMENTATION VALIDATION

No code changes authorized.

No authority-gate modifications authorized.

Purpose is to obtain runtime evidence before PATCH-027J implementation.

---

# 1. Objective

Determine whether the remaining RELATED_AUTHORITY_ONLY failures are caused by:

A. Tier-3 authority matches being incorrectly rejected by authority-utils.js

or

B. Retrieval-engine assigning Tier-4 instead of Tier-3

before any production logic is modified.

---

# 2. Background

PATCH-027B-R3 successfully repaired self-reference metadata.

Results:

| Authority   | Result                 |
| ----------- | ---------------------- |
| RR 11-2018  | AUTHORITY_FOUND        |
| RR 8-2018   | AUTHORITY_FOUND        |
| RR 2-98     | RELATED_AUTHORITY_ONLY |
| RR 12-2018  | RELATED_AUTHORITY_ONLY |
| RMO 24-2013 | RELATED_AUTHORITY_ONLY |

PATCH-027H identified:

classifySourceAvailability()

as the live authority-status gate.

PATCH-027I identified a potential structural defect:

authority-utils.js

docOnSpecificAuthorityPlan()

accepts:

authorityMatchTier <= 2

while retrieval-engine already computes:

authorityMatchTier === 3

for confirmed instance-level RR/RMC/RMO matches.

The hypothesis is that valid Tier-3 authorities are being discarded before GOVERNING classification.

---

# 3. Decision Required

Before implementing PATCH-027J we must answer:

Do RR 2-98, RR 12-2018 and RMO 24-2013 reach authorityMatchTier 3?

If YES:

PATCH-027J proceeds.

If NO:

PATCH-027J must move upstream into retrieval-engine.js.

---

# 4. Runtime Queries

Execute against STAGING only.

Query 1

Explain RR 2-98

Expected current status:

RELATED_AUTHORITY_ONLY

Query 2

Explain RR 12-2018

Expected current status:

RELATED_AUTHORITY_ONLY

Query 3

Explain RMO 24-2013

Expected current status:

RELATED_AUTHORITY_ONLY

---

# 5. Required Diagnostic Logging

Temporary logging only.

Must not be committed.

Capture:

normalized_reference

source

document_title

authorityMatchTier

authorityRole

directlyGovernsIssue

isIndexed

isParsed

higherAuthorityMissing

Final:

saeStatus

---

# 6. Evidence Collection Method

Preferred path:

Frontend UI
→
/ask
→
Render staging logs

This exercises the actual production pipeline.

No synthetic harness.

No mocked retrieval.

No manually constructed candidates.

---

# 7. Success Criteria

For each candidate:

Record:

authorityMatchTier

and

authorityRole

at classification time.

Example:

[PATCH_027J_R0]
RR 12-2018
tier=3
role=RELATED
directlyGovernsIssue=false

---

# 8. Interpretation Matrix

Case A

tier=3
role=RELATED

Conclusion:

PATCH-027I hypothesis confirmed.

Authority annotation layer is discarding valid Tier-3 matches.

Proceed to PATCH-027J implementation.

Candidate fix:

authorityMatchTier <= 3

instead of

authorityMatchTier <= 2

inside docOnSpecificAuthorityPlan().

---

Case B

tier=4
role=RELATED

Conclusion:

Retrieval layer failed to produce a Tier-3 authority match.

PATCH-027J must be redesigned.

Investigate:

computeAuthorityMatchTier()

before changing authority-utils.js.

---

Case C

tier=3
role=GOVERNING

Conclusion:

Hypothesis disproven.

A different downstream gate is causing status degradation.

Open separate investigation.

---

# 9. Risk Controls

No production deployment.

No authority-lock modification.

No retrieval ranking modification.

No metadata modification.

No database writes.

Logging must be removed immediately after evidence capture.

---

# 10. Deliverable

Create:

PATCH-027J-R0_TIER_CONFIRMATION.md

containing:

1. Runtime logs
2. Tier observations
3. Per-query analysis
4. Final verdict
5. Go / No-Go recommendation for PATCH-027J

---

# 11. Go / No-Go Gate

GO

if at least one failing authority demonstrates:

authorityMatchTier = 3
authorityRole = RELATED

NO-GO

if all failing authorities demonstrate:

authorityMatchTier = 4

or higher.

---

# 12. Expected Outcome

Most likely outcome based on PATCH-027I:

RR 2-98 → Tier 3

RR 12-2018 → Tier 3

RMO 24-2013 → Tier 3

and all are being rejected by authority-utils.js.

This remains a hypothesis until runtime evidence is captured.

---

# 13. Release-Gate Constraint

PATCH-027J may not:

* Hardcode RR 2-98
* Hardcode RR 12-2018
* Hardcode RMO 24-2013
* Introduce query-specific bridges
* Weaken Authority Lock

Any fix must be generalized and apply to all RR/RMC/RMO authorities consistently.
