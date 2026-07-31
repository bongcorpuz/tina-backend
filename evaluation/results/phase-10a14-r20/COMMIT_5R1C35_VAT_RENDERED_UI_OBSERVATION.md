# C35 VAT rendered UI observation

Captured at 2026-07-31T03:35:20.748Z through the production login, conversation-create, and `/ask` request contract used by `https://app.tina.bentoph.com/`, against `https://tina-backend-y11x.onrender.com`.

The live response contained:

- `conflictState = POTENTIAL_CONFLICT`
- `hasConflict = false`
- `authoritySupport = VERIFIED_CONTROLLING`
- `sourceState = AUTHORITY_FOUND`
- five displayed source cards: NIRC §§105–108 and RR 16-2005

The exact production frontend presentation code deterministically renders that captured trust object as:

- primary banner: **Possible authority conflict**
- severity: warning
- secondary banner: none
- source qualifier: **Controlling authority**

It does **not** render “Related authority only” for this live response, because that secondary label is conditional on `authoritySupport === RELATED_AUTHORITY_ONLY`. The historical combined display therefore represented two independent backend states; today’s live run reproduced only the conflict-state half.

This is a contract-rendered observation from the sanitized production response and the exact production frontend mapper, not a browser screenshot. No UI state was fabricated and no production write other than the ordinary authenticated conversation/query path was performed.

Evidence:

- `COMMIT_5R1C35_VAT_LIVE_REPRODUCTION.json` — SHA-256 `cd74ddf28616adbc385ae11aab471d122f70ca05cc3faf53f22b655bf323266c`
- `COMMIT_5R1C35_VAT_API_RESPONSE_SANITIZED.json` — SHA-256 `4b38cf1518f099fe9915f76c03eb76dc7c6588445ac6fdee3c3fb6f2f9086661`
- frontend `src/lib/trustPresentation.js` — SHA-256 `5c470c8bcbeee1b2ebf3623ab7b5c416b21758aa1845a9a0ef6c7d03de3c18da`

