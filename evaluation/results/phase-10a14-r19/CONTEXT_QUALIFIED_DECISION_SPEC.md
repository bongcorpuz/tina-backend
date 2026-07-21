# PHASE-10A14-R19 — CONTEXT-QUALIFIED DECISION SPECIFICATION

Frozen before implementation.

## Diagnosed root cause (see ROOT_CAUSE_TAXONOMY.json)

Every one of the 67 false allows and 12 metamorphic false-allow failures fired with
`reason: "strong_tax_signal"`. Two sub-defects:

1. **No veto pattern existed** for many non-tax object families (device, hobby, medicine,
   culture, code/software role, random-code labels, real-estate marketing, ...).
2. **Cosignals were over-permissive.** Bare 2-4 letter acronyms (`RMC`, `RMO`) were
   wrongly listed as cosignals, so the very acronym that IS the ambiguity defeated a
   correct veto. And a cosignal phrase could match as a bare substring anywhere in the
   sentence and defeat a veto match anywhere else, with no regard for which one describes
   the sentence's actual subject/role.

## New decision order

```
1. explicit coherent non-tax OBJECT/ROLE  (dominant veto — never defeated by any cosignal)
2. explicit coherent Philippine-tax phrase / strong signal, subject to the existing
   cosignal-defeatable non-tax-object veto (unchanged from R18)
3. tax-filing adjacency (unchanged from R15/R16/R17)
4. weak signal + non-tax context → REJECT; weak signal alone → CLARIFY (unchanged)
5. hook-specific strict rejection, non-tax reject patterns, tax-adjacent CLARIFY,
   fail-closed default (unchanged)
```

Step 1 is new. It is evaluated FIRST, before the strong-signal check and before the
existing (defeatable) non-tax-object veto, and its outcome is REJECT with reason
`non_tax_object_role_veto` when triggered. No pattern in step 2's cosignal list — no
matter how it matches — can override a step-1 match, because step 1 describes what kind
of THING the sentence is actually about (a variable, a fan, a board game), which is
independent of whichever tax-shaped word happens to be nearby.

## Reason codes

```
coherent_tax_phrase           — an existing STRONG_TAX_SIGNAL_PATTERNS match survives step 1
non_tax_object_role_veto      — step 1 dominant veto fired
non_tax_object_veto           — existing R18 cosignal-defeatable veto fired
tax_filing_adjacency          — unchanged from R15
weak_signal_with_non_tax_context
weak_tax_signal_needs_context
clearly_non_tax_domain
tax_adjacent_needs_context
fail_closed_no_tax_signal
bypass_hook / empty_query / quiz_review_requires_tax_topic / audit_mode_no_tax_signal
```

`strong_tax_signal` is retained as the underlying reason a step-2 ALLOW occurs (i.e. the
existing reason string is unchanged for backward evidence compatibility with R15–R18
regression suites, all of which assert on this exact string). The NEW distinguishing
signal for what changed is `non_tax_object_role_veto`, asserted explicitly wherever a
formerly-failing probe is now closed by the dominant tier.

## Dominant non-tax role veto — rule families

Organized by reusable OBJECT/ROLE family, not by exact sentence. Each family is a set of
noun phrases or role markers that, when present, make the sentence's true subject
non-tax regardless of any nearby tax-shaped token.

| Family | Covers |
|---|---|
| Software/code/UI role markers | variable/constant/identifier name, function/return value, form/input/text box, console/output, design token, colour token, hue token, icon design, CSS class/stylesheet, plugin, software flag, app log(s), code snippet, software project |
| Random/unknown code labels | random SKU, course code/ID, project code, training code, product code, field abbreviation, unknown acronym |
| Physical devices | cooling fan/device, cooking tool/utensil/pan, metal can, monitor/on-screen display |
| Audio/music | band of chords, music channel, radio, amplifier/audio equipment |
| Culture/tradition | cultural/social/local/traditional customs, culture class, wedding/dinner customs |
| Medicine | medical prescription, antibiotics, vitamin deficiency |
| Real estate/marketing | real-estate ads/marketing copy, landscaping |
| Hobbies/games | board game, game guild, game quest |
| School/class | exam grade, grammar class, negotiation class, alphabetical list (of names/students) |
| Office/generic mislabeling | novel list, spreadsheet field, club acronym, call-to-action button, delivery surcharge, building directions, generic conference agenda (no BIR/notice-for qualifier) |
| Explicit negation | "without tax", "not tax-related", "non-tax", "no tax involved" |

## Acronym / term definition intent

A bare acronym or polysemous term with NO surrounding object context at all (neither a
tax co-signal nor a dominant-veto object) and phrased as a definition question (`what
is X`, `define X`, `meaning of X`, `what does X mean`) is ALLOWed under
`reason: strong_tax_signal` via the existing acronym membership in
`STRONG_TAX_SIGNAL_PATTERNS` — this is unchanged from R17/R18 and is exercised by
`"What is MCIT?"` (ALLOW). If a dominant-veto object IS present alongside definition-
intent framing (`"What does SLSP mean in my software project?"`), the dominant veto still
wins — definition-intent phrasing never overrides an explicit non-tax object, matching
the independent review's `acronym_context` class exactly.

## Design constraints

- No exact-question strings in runtime patterns.
- Rule families are reusable across multiple acronyms/phrases, not one-off per sentence.
- Fail closed: an unrecognized combination reaches the existing CLARIFY/REJECT fallback,
  never a silently invented ALLOW.
- No dependency on model calls, network access, vector retrieval, uppercase-alone
  matching, or "TINA is a tax assistant" as a signal.
- Legitimate tax terms are not weakened globally — every accepted R15–R18 closure remains
  a regression gate.
