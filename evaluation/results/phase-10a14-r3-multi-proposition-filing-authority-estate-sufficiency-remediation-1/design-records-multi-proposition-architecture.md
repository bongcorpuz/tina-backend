# PHASE-10A14-R3 — Design records: clause-scoped multi-proposition architecture

Start HEAD `d5cfceb`. Runtime commit `f44490dffb3acac1b0ff7b0f1a88f90b534a213c`.
All runtime change is confined to `services/answer-support-validator.js`.

## Root cause (from the R2 independent review, 5 P1)

R2 detected filing/deadline/estate propositions over COMBINED question+answer text with
a single global `wrongFilingObject` flag and a single POOLED filing-deadline authority
regex. This produced five P1 defects: mixed-object suppression (P1-1), unclassified
relative/Taglish deadlines (P1-2), cross-tax-type authority laundering (P1-3), correct-
but-unsupported estate computations passing (P1-4), and a missed relational standard-
deduction-as-threshold misstatement (P1-5).

## WS2 — clause-scoped multi-proposition ledger

`segmentClauses(text)` splits question and answer into bounded clause spans on
sentence/semicolon/colon/bullet/newline boundaries and contrastive/coordinating
conjunctions ("but/however/although/while/whereas", ", and ", ", or "). Propositions are
detected PER CLAUSE and collected into a ledger; each entry carries `propositionId`,
`sourceSide`, `sourceClause`, `propositionClass`, `action`, `objectType`, `taxType`,
`returnType`, `taxpayerType`, `substituted`, `decisive`. A non-return object
(documents/protest/refund/registration/appeal) only affects ITS OWN clause and never
suppresses a return proposition detected in another clause (fixes P1-1).

## WS3 — object-scoped filing-obligation detection

Per clause: a filing obligation requires a return object + an obligation/exemption
concept (or an answer-introduced filing conclusion) and the clause's object is a tax
return, not a wrong/assessment object. Bare "return" counts only with a filing act or
tax context and is excluded for non-tax senses (`return of capital`, `rate of return`,
`sales return`, `return the document`, `goods returned`, `investment return`).

## WS4 — relative-period / Taglish deadline model

Object-aware temporal detection: general deadline signals (deadline/due date/last day/
on or before/still file/file today/filing period open/how many days/until <month>/final
date) plus RETURN-SCOPED "due/overdue/already late/late for/too late" (so "the return
was due" is a deadline while "no tax is due" and penalty "late filing" are not). Bounded
Taglish is normalized (`mag-file`→file, `pwede pa`→can still, `ihahabol`→file late,
`hanggang kailan`→deadline, `huli na`→already late). Answer-introduced dates/periods are
detected even when the question is vague (fixes P1-2).

## WS5 — tax/taxpayer/return classification (clause-first)

`resolveTypeMarkers` classifies tax type (individual/corporate income, estate, donor,
VAT, percentage), taxpayer type (individual/employee/self-employed/mixed/corporation/
estate/donor/VAT), and return type (individual annual/quarterly, corporate annual/
quarterly, estate, donor, VAT, percentage, substituted, unknown). `classifyReturnContext`
is CLAUSE-FIRST: a clause's own markers win; broader context is consulted only when the
clause is ambiguous, so a different tax type elsewhere in the text cannot bleed in.
Unknown/unresolved return type is insufficient for VERIFIED_CONTROLLING.

## WS6 — authority-compatibility matrix

`classifyAuthorities(labels)` buckets DISPLAYED source-card authority by tax type:
individual filing (Sec 51/51-A/56/74; RR 2-98/11-2018/8-2018), substituted (Sec 51-A;
RR 2-98/11-2018), corporate (Sec 52/75/76/77), estate (Sec 90/91), donor (Sec 99/103),
VAT (Sec 114), percentage (Sec 116/128). `filingAuthorityCompatible(returnType, auth)`
requires the DISPLAYED authority to match the proposition's EXACT return type; a filing
authority of a different tax type is related but not controlling. Substituted filing
requires substituted-filing authority (fixes P1-3).

## WS7 — estate computation component + relationship model

`analyzeEstateComputation(answer, context)` extracts components (rate, netEstate,
grossEstate, deduction, standardDeduction, threshold). A base misstatement is detected by
legal RELATIONSHIP, independent of any fixed amount or one preferred phrase:
- deduction / first amount treated as a boundary (above/over/excess-over/beyond/begins-
  after a deduction);
- deduction described as threshold/exemption/tax-free/floor/base;
- a first amount outside the tax base / tax-free;
- gross estate less a SINGLE (standard/basic) deduction equated to the taxable/net estate;
- subtract one deduction then apply the rate to the balance;
- a "threshold" claim in an estate computation (estate tax is a flat 6% on the net
  estate — it has no threshold bracket);
- amount-anchored forms (rate on estate value exceeding an amount, excess-over an amount,
  first-amount tax-free, gross-less-amount) from the Q30 family (fixes P1-5).
The correct relation (net estate = gross LESS ALL allowable deductions) is NOT matched.

## WS8 — positive estate authority sufficiency

A correct estate computation is NOT sufficient merely because no misstatement fired. It
requires POSITIVE authority for each decisive component actually asserted: a rate claim
requires estate rate authority (Sec 84); a base/deduction claim requires estate base/
deduction authority (Sec 85/86). Foundational-only (Sec 1/6), rate-only, or unrelated
authority fails closed. An answer asserting only the rate needs only Sec 84 (fixes P1-4).

## WS9 — compound completeness

`evaluatePropositionSourceSufficiency` evaluates every decisive filing/deadline
proposition in the ledger; the FIRST unsupported one fails closed (a strong component
cannot launder a weak unsupported one). The full ledger is preserved in diagnostics
(`propositionLedger`, `authorityClasses`, `failedProposition`) so later components are not
claimed supported merely because evaluation returned on an earlier failure. The gate runs
before the gpt-4o-mini validator, fails closed, and never upgrades trust.

## Non-negotiables preserved

No question IDs, exact prompts, income amounts, dates, or reviewer-phrase deny lists
govern runtime. Penalty/EWT/registration/VAT-exception classes are unchanged. The gate
withholds only; it never forces VERIFIED_CONTROLLING.
