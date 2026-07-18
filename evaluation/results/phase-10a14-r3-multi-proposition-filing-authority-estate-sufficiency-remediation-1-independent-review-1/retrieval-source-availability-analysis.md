# Retrieval And Section 51/51-A Source Availability Analysis

The live positive controls for individual filing obligation, individual annual ITR deadline, and substituted filing did not verify because the required filing authority never reached displayed source cards.

Observed payloads:

| Payload | Prompt class | Displayed/top labels | Validator status |
|---|---|---|---|
| POS-01-indfile | self-employed annual ITR filing obligation | displayed Sec 23/24/27 | invoked; blocked filing_obligation without matching return authority |
| POS-03-inddl | individual annual ITR deadline | displayed Sec 23/24/27 | invoked; blocked filing_deadline without matching return authority |
| POSX-indfile-1 | explicit Section 51 annual ITR obligation | displayed Sec 23/24/27 | invoked; blocked filing_obligation |
| POSX-indfile-2 | cite individual filing provision | displayed Sec 23/24/27 | invoked; blocked filing_obligation |
| POSX-inddl-1 | explicit Section 51(C) deadline | displayed Sec 23/24/27 | invoked; blocked filing_deadline |
| POSX-inddl-2 | NIRC annual ITR date | displayed Sec 23/24/27 | invoked; blocked filing_deadline |
| POS-02-subst | one-employer substituted filing | no displayed source; top Sec 24/Sec 23 | fallback; no validator invocation |
| POSX-subst-1 | explicit RR 2-98 and Section 51-A | no displayed source | no validator invocation |

A local repo search outside the R3 review artifacts did not find independent source-bank/corpus text for Section 51, Section 51-A, substituted filing, RR 11-2018, or equivalent aliases. The payloads do not expose enough retrieval-stage internals to distinguish corpus absence from aliasing, vector recall, reranker exclusion, or source-card finalization. The directly supported finding is narrower and still material: Section 51/51-A authority is not practically surfaced to final source cards across multiple common and exact-source-intent live prompts.

Severity: P1 under the charter because no genuine live positive verifies for individual filing obligation, individual filing deadline, or substituted filing, including exact Section 51/51-A requests.
