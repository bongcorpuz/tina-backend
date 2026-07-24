# DECISION AND STOP RULES — PHASE-10A14-R20

> Immutable at COMMIT 1.

## Permitted decisions

```text
PASS
REVISIONS REQUIRED
```

**No conditional PASS.**

## PASS requires ALL of

```text
P0 = 0
P1 = 0
exact 1,120 campaign passes
corrected 567 passes
>= 2,500 development corpus passes
zero material false allows
zero material false refusals
zero clarify mismatches
zero metamorphic failures
all mixed-domain controls pass
all explicit non-tax controls pass
capitalization / expansion controls pass
no executor holdout claim
complete invocation registry (closure-complete)
all failures preserved
focused suites pass
deterministic 2/2
staging 2/2
identities valid
manifest valid (self-excluding)
no unauthorized scope
```

Any single unmet condition ⇒ **REVISIONS REQUIRED**.

## Authority of the decision

The final R20 decision belongs to Codex 5.5 Independent Review 1. The executor MUST NOT report R20 PASS, MUST NOT report R20 governance SATISFIED, and MUST NOT perform, simulate, or pre-write the independent review. R20 remains prospective and NOT SATISFIED until the independent review issues PASS. Phase 10A remains OPEN.

## COMMIT 1 stop rule

> After COMMIT 1 is committed, pushed, synchronized, and verified, **STOP**. Do not begin COMMIT 2 in the same run.
