-- Migration: 20260526000000_create_tina_reindex_locks
-- Run ONCE in the Supabase SQL editor before the first reindex.
--
-- IMPORTANT: The TINA reindex lock code is FAIL-CLOSED.
-- If this table is missing, inaccessible (RLS), or the wrong Supabase project
-- is configured, reindex will REFUSE to run and return reason: "lock_error".
-- This prevents silent unlocked concurrent writes.
--
-- Purpose: DB-backed distributed reindex lock.
-- Guarantees at most one active reindex (full or targeted) across all Render
-- instances, hot-reload cycles, and concurrent HTTP calls.
--
-- Columns:
--   lock_name     — always 'global_reindex' (single-row mutex via PRIMARY KEY)
--   job_id        — unique per job: "reindex-<base36-ts>-<4byte-hex>"
--   mode          — 'full_drive_reindex' | 'targeted_reindex'
--   instance_id   — RENDER_INSTANCE_ID || RENDER_SERVICE_ID || random hex
--   started_at    — when the lock was first acquired (DEFAULT now())
--   heartbeat_at  — updated every 5 min while the job runs
--   expires_at    — lock TTL; extended +30 min on every heartbeat
--   metadata      — freeform JSON (pid, etc.)
--
-- Lock lifecycle:
--   1. acquireReindexLock:
--        a. SELECT expired row (expires_at < now()) — log [REINDEX LOCK STALE TAKEOVER] if found
--        b. DELETE expired row
--        c. INSERT new row — if 23505 (unique violation) → another job holds lock → denied
--   2. heartbeatReindexLock (every 5 minutes):
--        UPDATE heartbeat_at + expires_at WHERE lock_name AND job_id match
--        Returns rowsUpdated. If rowsUpdated = 0 → lock was taken → job aborts.
--   3. releaseReindexLock: DELETE WHERE lock_name AND job_id match (own job only).
--        Always runs in finally — even on error or throw.
--
-- Verification after running:
--   SELECT * FROM tina_reindex_locks;                              -- should return 0 rows
--   GET /debug/db-identity?secret=YOUR_SECRET                     -- lockTableStatus: "accessible"

CREATE TABLE IF NOT EXISTS tina_reindex_locks (
  lock_name    text        PRIMARY KEY,
  job_id       text        NOT NULL,
  mode         text        NOT NULL,
  instance_id  text,
  started_at   timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  metadata     jsonb       DEFAULT '{}'::jsonb
);

-- Index for expired-lock sweep query: DELETE WHERE expires_at < now()
CREATE INDEX IF NOT EXISTS idx_reindex_locks_expires_at
  ON tina_reindex_locks (expires_at);

-- Optional: if RLS is enabled on this table (not the default for service-role keys),
-- grant full access to the service role so heartbeat/acquire/release work.
-- Uncomment and run if you see permission errors:
-- ALTER TABLE tina_reindex_locks ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "service_role_full_access" ON tina_reindex_locks
--   FOR ALL TO service_role USING (true) WITH CHECK (true);
