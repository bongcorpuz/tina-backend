# PHASE-10A14-R2 — Design records: semantic proposition layer

Runtime commit: `22b845afe1fe16bfa4821804d528f469366e4f8c`
Start HEAD: `7736ceecc96e5dad99250bd0ea43c813dce3204f`

## Problem (from the A14-R1 independent review, REVISIONS REQUIRED)

A14-R1 detected `filing_obligation`, `filing_deadline`, and `tax_computation_basis`
(estate) with brittle **phrase-oriented** regexes. Independent probes bypassed all three:

- filing_obligation missed paraphrase / statement / short follow-up / answer-introduced
  formulations ("tell me whether I still need an ITR", "do I submit anything?",
  "Explain why no return is needed", follow-up "How about filing?").
- filing_deadline missed common deadline formulations ("last day to submit", "must be
  filed by what date", "filing closes", "what date applies", "already late?",
  "how many days do I have?", "Confirm the filing date").
- tax_computation_basis missed equivalent estate base misstatements ("6% of the excess
  over 5,000,000", "first 5,000,000 is tax-free", "estate threshold is 5,000,000",
  "6% of gross estate less 5,000,000").

The remediation must recognize the **concept** across surface forms, not add the
reviewer's phrases to a deny list.

## Design: deterministic semantic proposition layer

All changes are confined to `evaluatePropositionSourceSufficiency` and a new exported
helper `detectFilingAndEstatePropositions(question, answer)` in
`services/answer-support-validator.js`. It runs **before** the gpt-4o-mini validator,
**fails closed**, keys authority on **displayed source cards** (not prose), and never
upgrades trust.

### 1. Normalization (`normalizeTaxText`)

Lowercases; expands `ITR`/`itr` → "income tax return"; expands contractions; collapses
whitespace; and maps a **bounded** Taglish vocabulary to English concepts
(`mag-file`→"file", `kailangan … ba`→"required/need", `hanggang kailan`→"deadline/until
when", `huling araw`→"last day", `late na`→"already late", `kailan`→"when"). Bounded —
not a general translator — so the surface of a probe cannot hide the concept.

### 2. Concept signals (regexes over normalized text)

- `C_FILING_ACT` — file/submit/furnish/lodge/send/report/accomplish/declare.
- `C_RETURN_OBJECT` — (income tax / annual / estate / donor's / VAT / percentage) return.
- `C_OBLIGATION` — required / must / need / have to / exempt from filing / no return / substituted filing.
- `C_TEMPORAL` — genuine deadline frames only (deadline, due date, last day, on or before,
  filing closes, how many days, until when, already late, "when … due", "return … due").
  Bare "due"/"late" are **excluded**: they collide with the liability sense ("no tax is
  **due**") and the penalty sense ("**late** filing of a VAT return").
- `A_FILING_CONCLUSION` / `A_DEADLINE_CONCLUSION` — answer-introduced no-filing / deadline
  conclusions, so a vague question with a decisive answer is still gated.

### 3. Object disambiguation (only return-filing invokes the gates)

The **object** of the action is identified so non-return objects do not fire the gates:

- `C_WRONG_FILING_OBJECT` — protest / invoice / receipt / document / financial statement /
  refund claim / court / appeal / registration paperwork.
- `C_PAYMENT_OBJECT` — pay / remit / settle the tax.
- `C_ASSESSMENT_OBJECT` — assessment period / prescriptive period / prescription / right to assess.
- `C_PROTEST_REG_OBJECT` — protest / register / appeal to CTA / reply to PAN/FAN.

`deadlineObject` resolves to `assessment_or_prescription` / `payment` /
`protest_or_registration` / `return_filing`; **only** `return_filing` sets `filingDeadline`.
`filingObligation` requires a filing/return concept **and** an obligation, excluding wrong
and assessment objects (question-led), OR an answer-introduced no-filing conclusion.

### 4. Estate computation basis (concept, not phrase)

`ESTATE_BASE_MISSTATEMENT_RE` recognizes the base misstatement concept in any of:
rate-on-value-**exceeding** an amount, **excess over / in excess of / over / above** a 4+
digit amount, **first amount tax-free**, **estate-tax threshold**, **gross estate less**
an amount, **only the balance**, standard-deduction-as-exemption/zero-rate. Guarded by an
estate-tax context test so donor's-tax "6% over 250,000" (a real Sec 99 threshold) is not
misclassified.

## Authority mapping (unchanged from A14-R1; source-card keyed)

| Class | Requires (displayed source cards) | Fails closed on |
|---|---|---|
| filing_obligation | Sec 51/52/56/74/75, substituted-filing RRs (2-98/11-2018/8-2018) | rate/residency/corporate/withholding only |
| filing_deadline | Sec 51 (indiv), 52/77 (corp), 90/91 (estate), 103 (donor), 114 (VAT) | rate/residency only |
| tax_computation_basis (estate) | base-misstatement fails closed regardless; correct net-estate computation reachable | — |

## Properties preserved

- Runs before the LLM validator; the model validator cannot override a failed gate.
- Never upgrades trust (a sufficient result is not forced to VERIFIED).
- No question IDs, exact prompts, income amounts, dates, or reviewer-phrase deny lists.
- Valid filing/deadline/estate conclusions on controlling authority remain reachable.
