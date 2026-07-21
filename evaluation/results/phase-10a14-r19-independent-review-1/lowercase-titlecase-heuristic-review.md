# Lowercase And Title-Case Heuristic Review

Acronym/homograph controls failed 110/200. Lowercase valid expansions are not the main failing pattern in the direct smoke subset, but the broader acronym/homograph matrix shows capitalization and parenthetical form remain unsafe.

Examples:
- expected ALLOW, got REJECT/non_tax_object_role_veto: MCIT (minimum corporate income tax) applies to our Philippine filing position 1.
- expected CLARIFY, got ALLOW/strong_tax_signal: What is FWT for item 4?
- expected ALLOW, got REJECT/non_tax_object_role_veto: RMC (revenue memorandum circular) applies to our Philippine filing position 5.
- expected CLARIFY, got ALLOW/strong_tax_signal: What is OSD for item 8?
- expected ALLOW, got REJECT/non_tax_object_role_veto: PAN (preliminary assessment notice) applies to our Philippine filing position 9.
- expected NOT_ALLOW, got ALLOW/strong_tax_signal: MCIT (Metro City Innovation Team) is only our internal project phrase 11.
- expected CLARIFY, got ALLOW/strong_tax_signal: What is RCIT for item 12?
- expected ALLOW, got REJECT/non_tax_object_role_veto: EWT (expanded withholding tax) applies to our Philippine filing position 13.
- expected ALLOW, got REJECT/non_tax_object_role_veto: SLSP (summary list of sales and purchases) applies to our Philippine filing position 17.
- expected NOT_ALLOW, got ALLOW/strong_tax_signal: PAN (Professional Artists Network) is only our internal project phrase 19.
- expected CLARIFY, got ALLOW/strong_tax_signal: What is FAN for item 20?
- expected ALLOW, got REJECT/non_tax_object_role_veto: MCIT (minimum corporate income tax) applies to our Philippine filing position 21.
