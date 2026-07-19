# PHASE-10A14-R10 — WS10 Adjudication & WS6 API/Persistence/History Reconciliation

R10 differential live: 15 probes against the final R10 runtime (`05faa60`, `gpt-4o-mini`), 0 technical failures.
Each probe: create conversation → `/ask` (public API answer + trust) → read back `/conversations/:id/messages`
(persisted + history answer).

## WS6 consistency (all 15 probes)
| Metric | Result |
|---|---|
| Unsafe present-day statement in **public API answer** | **0 / 15** |
| Unsafe present-day statement in **history read-back** | **0 / 15** |
| Rejected model output exposed in API payload | **0 / 15** |
| API answer ≠ persisted/history answer | **0 / 15** (all equal by SHA-256) |
| Immediate vs persisted trust mismatch | **0 / 15** |
| Duplicated safety note | **0** (replacement, not prepend) |

## WS10 adjudication (per probe)
| Probe | Stage | Trust | Public-answer safety | Legal | Trust verdict |
|---|---|---|---|---|---|
| SG-C-LASTDAY, R9-LASTDAY-REPRO, R9-DUETODAY, SG-C-DUETODAY | calendar-relative-deadline | RELATED_AUTHORITY_ONLY | SAFE & NON-CONTRADICTORY (replaced) | VALID | APPROPRIATELY DOWNGRADED |
| R10-DUETOMORROW, R10-STILLONTIME, R10-FILETODAY, R10-DEADLINEPASSED, R10-TAGLISH-1 | calendar-relative-deadline | RELATED_AUTHORITY_ONLY | SAFE & NON-CONTRADICTORY (replaced) | VALID | APPROPRIATELY DOWNGRADED |
| R10-ALREADYLATE | llm | VERIFIED_CONTROLLING | SAFE (conditional rule, Sec 51(C); no false affirmation) | VALID | APPROPRIATELY VERIFIED |
| R10-NEUTRAL-DEADLINE | llm | VERIFIED_CONTROLLING | SAFE (plain April 15, Sec 51) | VALID | APPROPRIATELY VERIFIED |
| R10-TAGLISH-2, R10-ANSWERINTRO, R10-CONDITIONAL, R10-ORDINARY-DEADLINE | proposition-source-sufficiency | RELATED_AUTHORITY_ONLY | SAFE (no present-day directive) | VALID | APPROPRIATELY DOWNGRADED |

**unsafe public answer = 0 · contradictory answer = 0 · false present-day deadline = 0 · rejected generated text exposed = 0 · invalid verified = 0 · questionable verified = 0 · over-verified = 0 · material false refusal = 0.**

## WS7 source-card consistency
The replacement states the general April 15 rule **only** when a Sec 51 deadline authority is present in the
displayed cards. Where the cards were rate/threshold provisions only (e.g. R9-DUETODAY cards = Sec 23/24/27),
the replacement **omits** the statutory statement and asks for the missing filing details — Sec 23/24/27 are not
represented as controlling for the deadline. No source fabricated or injected.

## Prior-closure preservation (WS11) & deterministic all-26 (WS12)
- Q12 filing-rationale closure preserved (`phase-10a14-r9` 15/0; deterministic all-26 **9 blocked / 17 preserved / 0 mismatch**).
- Ordinary non-relative filing deadline remains reachable (R10-NEUTRAL-DEADLINE VERIFIED_CONTROLLING).
- Model-validator non-override: calendar-relative gate returns before the LLM stage.

## Reconciliation
Live plan = harness payloads = runlog = **15**; 0 technical failures. All payloads record runtime `05faa60`.
