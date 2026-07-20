# Journal Contract And Crash Preservation Review

## HR-1 Contract Evolution

COMMIT 1 froze `evaluation/results/phase-10a14-r14/journal/<campaignId>/<attemptId>.json`, one immutable file per attempt.

COMMIT 2 changed the contract to `attempts.jsonl` while adding `journal.mjs`, `run-campaign.mjs`, and the 488 pre-fix attempts.

Classification: **MATERIAL FREEZE-SEQUENCE VIOLATION**.

Reason: the revised contract was not independently frozen and pushed before the evidence it controlled. The change also altered attempt identity/lifecycle mechanics from per-file artifacts to JSONL records.

## HR-2 Implementation

`AttemptJournal.run()` allocates an attempt ID and constructs a record before execution, but it does not append the skeleton before `fn(record)`:

1. allocate attempt ID
2. create in-memory record
3. call `fn(record)`
4. set completion/hashes
5. append complete record

Therefore a kill or crash during `fn` leaves no durable skeleton in `attempts.jsonl`.

Additional observations:

- duplicate IDs are prevented only within the current in-memory sequence and by reading existing parseable lines;
- malformed/partial lines are tolerated on constructor read but `summarize()` parses all non-empty lines and can throw on a partial tail;
- summaries omit any killed attempt that was never appended;
- JSONL files are append-mode in the helper, but filesystem permissions do not technically prevent truncation/regeneration by other code or shell actions.

Classification: P1 incomplete/non-crash-visible attempt evidence.

