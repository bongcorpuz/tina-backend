# Runtime Byte-Equivalence Report

Final runtime commit: `0323bb91ac8383e1cbb6800637e4b9b896cdaff1`.

Current reviewed HEAD: `31a0630abef4ab864b1082ce55ed0a0f9dc95ba2`.

Checks:

- `0323bb91` is an ancestor of HEAD.
- No runtime files changed from `0323bb91` to HEAD across `ask-handler.js`, `services/`, `tax-keywords.js`, `tax-classifier.js`, `pipeline.js`, `server.js`, `package.json`, and `package-lock.json`.
- No runtime-file diffs were found between final runtime `0323bb91` and staging server SHAs `bc395985f37ee05bbfe6618f4c72fcdc25098e3e` / `bd98ee3bbae1e4b9d25c680a7e1ab35b0fc4a2ad`.

Adjudication:

- Runtime byte-equivalence for later evidence/staging commits is accepted.
- The phrase "identity stable across both" is misleading if read as one server SHA across both staging cycles. The deployment ID was the same, but the server-reported runtime SHA differed between cycles and corresponds to byte-equivalent descendant evidence commits.
