# WS13 — targeted live validation reconciliation

Runtime commit `ba08ae790021ac1e22f438a82372a643dd886de0`. Local server on port 10000;
each probe issued through `POST /ask` with a JWT; sanitized payloads under `payloads/`
(full displayed source labels captured; no raw conversation IDs / PII; persistence count
is not exposed in the `/ask` response body and is recorded as null, not fabricated).

## Invalid verified = 0 (all 8 live-verified results on MATCHING controlling authority)

| Verified id | Class / topic | Authority (matching) |
|---|---|---|
| POS-04-estdl, POS-12-q32est, XT-02, ES-01 | estate deadline / estate computation | Sec 84/86/90/91 (estate) |
| POS-13-q47donor | donor's tax | Sec 99–104 (donor) |
| POSX-vatdl-1 | VAT return deadline | Sec 114 (VAT) |
| POS-10-protest | protest deadline (non-return control) | Sec 228 (protest) |
| PR-Q25 | EWT on law-firm fees | RR 2-98 (withholding) |

No negative-family probe verified. No filing/deadline/estate result verified on wrong-type
or non-controlling authority. **Invalid verified = 0. Questionable verified = 0.**

## Negatives — all fail closed at the R3 gate

- **Mixed-object** (8): all fail closed as `filing_obligation` — the document/protest/
  refund clause never suppresses the return proposition (P1-1 fixed live).
- **Deadline** (10, incl. Taglish "pwede pa", "ihahabol", "hanggang kailan"): all fail
  closed as `filing_deadline` (P1-2 fixed live).
- **Cross-tax** (8): no laundering — a filing/deadline result verifies only when the full
  displayed set carries MATCHING-type authority (e.g. XT-02 estate deadline verified on
  Sec 91); otherwise fails closed with `..._without_matching_return_authority` (P1-3).
- **Estate** (10): misstatements fail closed (`estate_tax_base_deduction_threshold_
  conflation`); correct-but-unsupported fail closed (`estate_computation_without_estate_
  authority`); a correct estate answer with estate authority (ES-01) verifies.

## Donor false-refusal — caught live and fixed

The first live run misclassified a correct donor's-tax answer (250k exemption threshold)
that merely mentioned "estate planning" as an estate misstatement. The runtime was fixed
(estate context now requires a genuine estate-TAX marker and excludes donor/gift context;
commit `ba08ae7`, regression test E-donor). On the final runtime POS-08-donorthr is no
longer blocked at the estate gate (it reaches the LLM stage). **False refusal by the R3
gate = 0.**

## Positive reachability — DEMONSTRATED live

- estate-return deadline (POS-04, POS-12) — VERIFIED on Sec 90/91;
- correct estate computation (ES-01) — VERIFIED on Sec 84/86;
- donor's tax (POS-13) — VERIFIED on Sec 99–104;
- VAT return deadline (POSX-vatdl-1) — VERIFIED on Sec 114;
- protest deadline non-return control (POS-10) — VERIFIED on Sec 228;
- EWT prior safeguard, valid (PR-Q25) — VERIFIED on RR 2-98.

## Positive reachability — NOT demonstrable live (retrieval-surfacing limitation)

Per the packet's RETRIEVAL-SURFACING RULE, this is recorded honestly and NOT papered over.

- **individual filing obligation** (POS-01, POSX-indfile-1, POSX-indfile-2) — retrieval
  returned only income-tax **rate/residency** authority (Sec 23/24/27), never the filing
  provision **Sec 51**, even for a formulation that explicitly cites "Section 51". The R3
  gate then correctly fails closed (`filing_obligation_proposition_without_matching_return_
  authority`).
- **individual annual-return deadline** (POS-03, POSX-inddl-1, POSX-inddl-2) — same: only
  Sec 23/24/27 surfaced, never Sec 51/51-A(C).
- **substituted filing** (POS-02, POSX-subst-1) — no filing authority surfaced at all.

Across **three** bounded formulations per class (including explicit section citations),
the corpus/retrieval **systematically** fails to surface the individual filing/deadline/
substituted authority. The deterministic gate behaves correctly (unit reachability is
proven by focused tests C7/G3 with Sec 51/51-A present); the limitation is in retrieval /
source-surfacing, which this task is NOT authorized to modify.

## Classification

This is the pre-existing P2 retrieval-surfacing limitation (carried from R2), now shown to
be **material and systemic** for the individual-income filing/deadline/substituted classes:
no genuine live filing-OBLIGATION positive can verify because retrieval repeatedly returns
only rate/residency authority. Per the packet's retrieval-surfacing rule, this blocks a
clean PASS and warrants **REVISIONS REQUIRED**, with no retrieval modification performed here.

## Prior safeguards — intact

Q36 penalty + Q38 registration blocked by their classes; Q46 fail closed; Q25 verified on
proper withholding authority (RR 2-98) — a valid verified, not the A14 Q25 defect (which was
EWT on VAT authority). Invalid verified for Q5/Q8/Q25/Q36/Q38/Q46 = 0.
