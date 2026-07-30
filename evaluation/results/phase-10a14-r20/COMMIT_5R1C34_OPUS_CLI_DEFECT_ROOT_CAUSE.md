# C34 checkpoint-57 Opus CLI defect root cause

- Classification: **OPUS_CLI_INVOCATION_TRANSPORT_DEFECT**
- Prior disposition: **TECHNICAL_INCOMPLETE_REVIEW_INVOCATION**
- Source schema: valid JSON, 1934 characters,
  SHA-256 `10a328e79b179c6469cfd3a8a425e7ab3a035bfc2a1f36245310bcdabbc1dade`
- Failing boundary: Windows PowerShell 5.1 `claude.ps1` `$args` forwarding
  into native `claude.exe`
- Observed mutation: embedded JSON double quotes removed before native parsing
- Repair: direct Node `spawnSync(nativeClaudeExe, argv, { shell: false })`
- Semantic disposition: **NOT_A_REVIEW_REJECTION / NO_DECISION / NO_APPROVAL**
