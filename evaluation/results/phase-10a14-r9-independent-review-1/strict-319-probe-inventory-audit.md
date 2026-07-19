# Strict 319-Probe Inventory Audit

P1-R9-IR-002: confirmed.

CANONICAL_A12_R8_INVENTORY.json has 319 rows and 319 unique IDs, but it is not strict-literal complete under the review packet.

Structured counts:
- A14: 50
- A14-slot: 26
- A14-R1: 26
- A14-R2: 42
- A14-R3: 60
- E1: 115
- A12 structured rows: 0
- A13 structured rows: 0

Null/material-field counts:
- propositionClass null: 204
- expectedTrustBehavior null: 319
- existingE1Payload null: 204
- finalR9ExecutionId null: 293
- neither finalR9ExecutionId nor existingE1Payload: 178

WS10_A12_A13_R4R8_TESTMAP.md provides identifier/test-level prose for A12/A13/R4-R8. That is not an individual per-probe machine-readable enumeration with exact final evidence mapping and justified null fields. PASS requires those conditions, so P1-E1-003 is not closed.
