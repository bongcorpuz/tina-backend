# C37 replacement Opus MCP root cause

The prior failure was caused by the C37 driver’s process-scoped argument `--mcp-config {}`. Claude Code 2.1.212 requires the top-level `mcpServers` field to be a record, so it exited locally with `mcpServers: Invalid input: expected record, received undefined` before model review.

The malformed value did not come from user, project, managed, VS Code, or global configuration. The supported minimum isolation is a temporary UTF-8 JSON file containing `{"mcpServers":{}}`, supplied by absolute path through `--mcp-config`, with `--strict-mcp-config` placed after the variadic config argument. This excludes all inherited MCP servers without changing authentication, TLS, or persistent configuration.

The authoritative correction remains controlling: no model response or provider API envelope was observed, complete child-stdin acceptance was not confirmed, confirmed evidence bytes transmitted to Anthropic were zero, and exact provider wire traffic was not observable.
