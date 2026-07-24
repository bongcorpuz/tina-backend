# CLAUSE-LEVEL INTENT SCHEMA — PHASE-10A14-R20

> Immutable at COMMIT 1. Deterministic evidence schema for the clause-level tax-intent / object-relation analyzer.

## Top-level object: `TaxBoundaryEvidence`

```text
TaxBoundaryEvidence
  normalizedText          normalized input text
  clauses[]               array of Clause objects
  primaryTaskClauseId     clauseId of the primary task clause
  speechAct               ask | request | assert | define | other
  requestedAction         the action the user requests
  requestedTarget         the target the action applies to
  taxPredicates[]         tax predicates across all clauses
  taxProcedures[]         tax procedures (filing, withholding, remittance, ...)
  taxEntities[]           tax entities (BIR, VAT, RA numbers, taxpayer types, ...)
  ordinaryObjects[]       non-tax objects mentioned
  acronymMentions[]       acronyms with detected expansion intent
  quotations[]            quoted-only spans
  negations[]             negation spans and scope
  labelsAndNames[]        internal labels / proper names
  relations[]             array of Relation objects
  ambiguityFlags[]        ambiguity markers
  decision                ALLOW | REFUSE | CLARIFY
  reasonCode              one of the final reason codes (see RELATION_AND_PRECEDENCE_SPEC.md)
  confidence              0.0–1.0
```

## Clause object

```text
clauseId                stable id within the evidence object
text                    clause text span
role                    primary_task | modifier | context | quotation | other
taskVerb                verb of the clause task (nullable)
taskObject              object/target of the clause task (nullable)
taxSignals              tax signals within the clause
nonTaxSignals           non-tax signals within the clause
definitionIntent        boolean — is this a definition/acronym-expansion request
quotedOrMentionedOnly   boolean — term is quoted/mentioned, not used
explicitNegation        boolean — explicit negation of tax relevance
```

## Relation object

```text
source                  clause/entity id
relation                one of the relation types below
target                  clause/entity/object id
clauseId                clause in which the relation holds
evidenceSpan            text span supporting the relation
```

## Relation types (closed set)

```text
ASKS_TAX_TREATMENT_OF
ASKS_TAX_COMPLIANCE_FOR
ASKS_DEDUCTIBILITY_OF
ASKS_VAT_TREATMENT_OF
ASKS_WITHHOLDING_ON
ASKS_CUSTOMS_DUTY_ON
ASKS_DEFINITION_OF
NAMES_AS_INTERNAL_LABEL
EXPANDS_AS_NON_TAX
QUOTES_TERM
NEGATES_TAX_RELEVANCE
REQUESTS_NON_TAX_ACTION_ON
```

## Determinism requirement

Given identical `normalizedText`, the analyzer MUST produce byte-identical `TaxBoundaryEvidence` (stable ordering of arrays, stable ids). The final `decision` and `reasonCode` MUST be derivable solely from the relations and precedence order in `RELATION_AND_PRECEDENCE_SPEC.md`.
