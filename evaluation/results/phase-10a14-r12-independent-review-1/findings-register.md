# Findings Register

## P1-R12-IR-001

Severity: P1
Status: OPEN
Title: Semantic directive coverage remains incomplete

Independent equivalent advice/recommendation/urgency probes still bypass the calendar-relative replacement stage. Frozen campaign closure is accepted, but semantic completeness is not.

## P1-R12-IR-002

Severity: P1
Status: OPEN
Title: Safe negation overfire remains possible

Safe cautionary statements can be misclassified as calendar-relative unsafe directives/assertions, including authority-does-not-establish and do-not-assume forms.

## P1-R12-IR-003

Severity: P1
Status: OPEN
Title: Domain-boundary persistenceStatus can falsely claim PERSISTED on save failure

The implementation reports `PERSISTED` based on IDs rather than confirmed write success, while `saveConversationTurn` swallows persistence errors.

## P3-R12-IR-004

Severity: P3
Status: OPEN_NON_MATERIAL
Title: Non-material detector count label inconsistency

The result JSON says 80 detector probes, while actual detector evidence contains 81 payloads.
