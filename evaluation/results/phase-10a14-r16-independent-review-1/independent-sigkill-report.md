# Independent SIGKILL Report

Harness: `independent-sigkill-harness.mjs`.

Result: pass.

Observed:

- `after-allocated`: marker valid, child alive before kill, `killReturned=true`, exit `code:null`, `signal:SIGKILL`, allocated 1, started 0, completed 0, incomplete 1.
- `after-started`: marker valid, child alive before kill, `killReturned=true`, exit `code:null`, `signal:SIGKILL`, allocated 1, started 1, completed 0, incomplete 1.
- `during-call`: marker valid from inside the governed callback, child alive before kill, `killReturned=true`, exit `code:null`, `signal:SIGKILL`, allocated 1, started 1, completed 0, technical failures 0, incomplete 1.
- normal-exit negative control: exits `code:0`, `signal:null`; it is detected as not a real kill.
- marker-timeout negative control: marker absent and no attempt allocated; readiness failure is detected.

Adjudication: P1-R15-IR-002 is closed.
