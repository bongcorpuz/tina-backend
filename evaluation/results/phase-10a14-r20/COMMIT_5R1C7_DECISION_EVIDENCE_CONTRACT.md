# PHASE-10A14-R20 — COMMIT 5R1-C7

## Decision Evidence Contract

The decision layer operates on typed evidence tied to the primary requested task and its
target. Reason codes never determine the boundary.

## Evidence classes in force

| Class | Structural test |
|---|---|
| `PRIMARY_TAX_TREATMENT_RELATION` | `ASKS_VAT_TREATMENT_OF`, `ASKS_DEDUCTIBILITY_OF`, `ASKS_WITHHOLDING_ON`, `ASKS_CUSTOMS_DUTY_ON`, `ASKS_TAX_TREATMENT_OF` over a concrete or resolved target |
| `PRIMARY_TAX_COMPLIANCE_RELATION` | `ASKS_TAX_COMPLIANCE_FOR` with a concrete or implicit procedural target |
| `PRIMARY_TAX_DEFINITION_RELATION` | `ASKS_DEFINITION_OF` with controlling tax context or an unambiguous PH tax term |
| `PRIMARY_NON_TAX_ACTION` | `REQUESTS_NON_TAX_ACTION_ON` |
| `PRIMARY_LABEL_BINDING` | `NAMES_AS_INTERNAL_LABEL`, including filename-with-extension and quoted column/field assignment |
| `PRIMARY_QUOTATION_ACTION` | `QUOTES_TERM` — a text operation over a quoted term |
| `PRIMARY_NON_TAX_EXPANSION` | `EXPANDS_AS_NON_TAX`, or an explicit in-query binding of a token to a non-tax meaning |
| `MATERIAL_BARE_ACRONYM_AMBIGUITY` | ambiguous acronym with no resolving context and no substantive tax subject matter |
| `NO_CONTROLLING_RELATION` | no relation survives extraction; frozen REFUSE/CLARIFY fallback |
| `CONTRADICTORY_PRIMARY_EVIDENCE` | resolved through the primary task and target, never by global token voting |

## Decision resolution

```text
label / quotation / non-tax expansion / non-tax action controlling the target -> REFUSE
tax treatment / compliance / definition relation over a concrete or resolved target -> ALLOW
materially ambiguous bare acronym with no controlling task relation -> CLARIFY
no controlling relation -> frozen REFUSE/CLARIFY fallback
```

## Structural discriminators introduced in C7

1. **Word-boundary domain matching.** Non-tax domain nouns previously matched as raw
   substrings, so `app` inside `applies` and `car` inside `carry` fired a global token
   veto that suppressed genuine tax relations. Matching is now whole-word. This removed
   the single largest source of ALLOW→REFUSE error and is the change the evidence
   contract most directly required, since a global token veto is prohibited.

2. **Scenario-tag invariance.** A trailing enumerated tag (an enumeration keyword plus an
   index, optionally letter-prefixed) is an enumeration device carrying no semantic
   content. It can neither add nor remove a tax relation; the decision is governed by the
   clause that remains once the tag is stripped.

3. **Non-tax controlling domain.** Private civil/contractual matters and non-tax
   institutional domains (labor, corporate registry, judicial, insurance, academic) own
   their own filings, deadlines, notices and prescriptive periods. Those procedural nouns
   are tax-shaped, but the controlling agency and subject matter are not tax. Defeated
   only by an explicit tax-instrument or BIR anchor — a target-domain test, not a veto.

4. **PH tax authority terms and unambiguous terminology.** A spelled-out Philippine tax
   instrument, remedy or doctrine is self-resolving and carries a governed tax relation.
   A bare acronym still requires substantive surrounding tax subject matter; a bare
   acronym with only an enumerated referent stays CLARIFY. Capitalization is never the
   controlling rule and no acronym expansion is ever invented.

5. **Explicit non-tax expansion binding.** When the query itself binds a token to a
   stated non-tax meaning, that binding controls the target regardless of whether the
   token is tax-shaped.

6. **Generic contentless questions.** A bare procedural or treatment attribute with no
   subject, agency or domain yields no controlling relation and takes the frozen fallback.

7. **Substring traps.** Tax-shaped substrings inside ordinary words, and tax-shaped
   procedural nouns in plainly non-tax settings, are lexical accidents and cannot anchor
   a tax relation.

8. **Tax predicate over an ordinary object.** An explicit tax-treatment predicate applied
   to an ordinary good is a genuine tax question about that good. The homograph guard
   exists for tax-shaped tokens used in a non-tax sense, not for a real tax relation whose
   target happens to be an ordinary object, so a governing tax predicate defeats it.

## Prohibitions observed

No exact-query, oracle-ID, source-set, category, fixture, metamorphic-marker or
scenario-number branch exists in runtime. No reason-code-driven decision shortcut. No
blanket "tax word + concrete noun = ALLOW" rule. No invented acronym expansion. No model,
network, I/O, time or randomness. Verified by the C7 static and anti-overfit validator,
which evaluates executable code with comments stripped.

## Status

The decision layer was **not** locked in C7. The contract above describes the architecture
in force in the best governed candidate (decision 3,623 / 3,720), which remains preserved
as an immutable attempt snapshot and was **not** integrated into the live runtime.
