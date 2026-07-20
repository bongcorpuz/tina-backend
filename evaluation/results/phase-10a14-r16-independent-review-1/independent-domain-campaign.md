# Independent Domain Campaign

Campaign script: `independent-domain-campaign.mjs`.

Final cleaned oracle size: 240 probes:

- 40 strong-tax controls.
- 40 weak generic controls.
- 40 explicit non-tax controls.
- 30 ambiguous controls.
- 30 Filipino/Taglish variants.
- 20 substring traps.
- 20 metamorphic pairs, represented as 40 probe rows.

Result:

- Total 240.
- Passed 226.
- Failed 14.

Meaningful failures:

- 4 strong-tax customs-duties controls were CLARIFY rather than ALLOW.
- 10 ambiguous gross-receipts/notice-deadline controls were ALLOW; these are recorded as over-broad but not used alone as P1 because several are tax-adjacent by local convention.

Accepted closures:

- Exact private-lease false allow closed.
- Exact court-filing deadline false allow closed.
- Explicit civil court, labor, SEC, passport, school, HR, insurance, software-file and police controls did not ALLOW.
- Substring traps containing `vat`, `bir`, `cta`, `rr` or form-number fragments did not ALLOW after the cleaned oracle removed explicit tax words.

Independent direct probes:

- `What customs duties apply to importing goods into the Philippines?` returned CLARIFY.
- `What is the BOC customs duty deadline for imported goods?` returned CLARIFY.
- `What are Philippine customs duties?` returned CLARIFY.

Adjudication: domain boundary still has material false-refusal risk for customs duties, a domain TINA's own boundary message lists as in scope.
