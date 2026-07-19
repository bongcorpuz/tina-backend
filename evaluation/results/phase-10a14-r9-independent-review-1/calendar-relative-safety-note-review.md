# Calendar-Relative Deadline And Safety-Note Review

P1-R9-IR-001: confirmed.

The deterministic gate blocks direct calendar-relative assertions, but the public safety behavior fails the packet's contradiction test.

Evidence:
- SG-C-LASTDAY: RELATED_AUTHORITY_ONLY and note present, but the answer still says yes, today is the last day and tells taxpayers to file by end of today.
- R9-LASTDAY-REPRO: RELATED_AUTHORITY_ONLY and note present, but the answer still says yes, today is the last day and says returns must be filed by today.
- R9-DUETODAY: RELATED_AUTHORITY_ONLY, no note, and says today is April 15 and the return is due today.
- SG-C-DUETODAY: RELATED_AUTHORITY_ONLY, no note, and gives a due-today answer conditioned on today being April 15 while still directing submission today.

ask-handler.js prepends the note and leaves the unsafe original body intact. The packet required removal or neutralization of the false assertion. P1-E1-001 is not fully closed.
