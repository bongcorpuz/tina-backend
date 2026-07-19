# Findings Register

Decision: REVISIONS REQUIRED

| ID | Severity | Title | Evidence | Status |
|---|---:|---|---|---|
| P1-R10-IR-001 | P1 | Mid-run DUETOMORROW defect preservation not proven | No raw/intermediate first-run DUETOMORROW payload or equivalent immutable defect record found; only final payload and narrative trace exist. | Blocks PASS |
| P1-R10-IR-002 | P1 | Detector misses material filing directives | evaluateCalendarRelativeDeadline does not catch "Please file your annual income tax return today" or "File now to avoid penalties" under neutral deadline forms. | Blocks PASS |
| P2-R10-IR-003 | P2 | DUETOMORROW replacement wording is mis-tailored | Final R10-DUETOMORROW no-Sec. 51 replacement says "today is that deadline" although question asks about tomorrow. | Non-blocking |

Accepted positive evidence:

- Final observed P1-R9-IR-001 payloads are safe and non-contradictory.
- Final API/history answers and hashes reconcile across all 15 payloads.
- Focused R10/R9 suites pass.
- Regression runner passes 200/0 twice.
- Network-enabled staging runner passes 7/0 twice.
- R10 manifest hashes validate.
