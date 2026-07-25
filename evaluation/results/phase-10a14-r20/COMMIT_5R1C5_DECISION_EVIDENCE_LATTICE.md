# COMMIT 5R1-C5 — Decision Evidence Lattice

Replaces ad-hoc precedence branches with a deterministic evidence lattice. Each evidence
item is tied to the primary task clause, requested action span, requested target span, a
typed relation, a supporting evidence span and a confidence. The decision is resolved from
the controlling evidence class, never from global token voting.

## Evidence classes

| Class | Structural trigger | Target type |
|---|---|---|
| `PRIMARY_TAX_RELATION` | tax predicate/procedure governing the requested target | CONCRETE / RESOLVED_REFERENT |
| `PRIMARY_NON_TAX_ACTION` | ordinary/homograph action verb on the requested target | any |
| `PRIMARY_LABEL_BINDING` | tax-shaped token bound to a naming/assignment action | LABEL_ONLY |
| `PRIMARY_QUOTATION_ACTION` | text operation (count/spell/translate/repeat/alphabetize) on a quoted tax term | QUOTED_TEXT |
| `PRIMARY_NON_TAX_EXPANSION` | acronym explicitly expanded to a non-tax meaning | any |
| `MATERIAL_BARE_ACRONYM_AMBIGUITY` | bare ambiguous acronym, no controlling action/expansion/context | AMBIGUOUS |
| `NO_CONTROLLING_RELATION` | tax attribute on a CONTENTLESS target, or no resolvable relation | CONTENTLESS |
| `CONTRADICTORY_EVIDENCE` | multiple candidate controllers | resolved by task-clause + target |

## Resolution order (deterministic)

```
PRIMARY_LABEL_BINDING / PRIMARY_QUOTATION_ACTION / PRIMARY_NON_TAX_EXPANSION /
PRIMARY_NON_TAX_ACTION  controlling the requested target
    -> REFUSE

PRIMARY_TAX_RELATION controlling a CONCRETE or RESOLVED_REFERENT target
    -> ALLOW

MATERIAL_BARE_ACRONYM_AMBIGUITY with no controlling action relation
    -> CLARIFY

NO_CONTROLLING_RELATION
    -> frozen REFUSE/CLARIFY rule (dangling-scenario -> CLARIFY; else REFUSE no_tax_relation)

CONTRADICTORY_EVIDENCE
    -> resolve by primary task clause + target completeness; never global token voting
```

The evidence classes are NOT unordered regex flags: a homograph token elsewhere cannot veto
a `PRIMARY_TAX_RELATION` on the requested target, and a tax term elsewhere cannot convert a
`PRIMARY_NON_TAX_ACTION`/`PRIMARY_LABEL_BINDING` on the requested target to ALLOW.

## Lane decoupling

The lattice governs the DECISION lane. `NO_CONTROLLING_RELATION` on a CONTENTLESS treatment
attribute yields REFUSE for the decision, but the RELATION lane independently attaches
`ASKS_TAX_COMPLIANCE_FOR` when an explicit compliance procedure (RESOLVED_REFERENT) is
present, so genuine compliance rows keep their reason/relation (avoiding the dev-03
tax_compliance_task reason regression).
