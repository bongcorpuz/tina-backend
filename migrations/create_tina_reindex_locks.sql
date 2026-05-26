-- Migration: create_tina_reindex_locks
-- Run this ONCE in the Supabase SQL editor before the first reindex.
-- The TINA reindex lock code fails CLOSED — it will refuse to proceed
-- if this table is missing or inaccessible (RLS blocked, wrong project, etc.)
--
-- Purpose: DB-backed distributed reindex lock.
-- Prevents concurrent full or targeted reindex jobs from overlapping
-- across multiple Render instances or overlapping HTTP calls.
--
-- lock_name  — always 'global_reindex' (single-row mutex via PRIMARY KEY)
-- job_id     — unique per job, format: "reindex-<base36-ts>-<4byte-hex>"
-- mode       — 'full_drive_reindex' | 'targeted_reindex'
-- instance_id — RENDER_INSTANCE_ID (or RENDER_SERVICE_ID or random hex)
-- started_at — when the lock was first acquired (DEFAULT now())
-- heartbeat_at — updated every 5 minutes while the job runs
-- expires_at — lock TTL; extended by heartbeat; set 30 min from last heartbeat
-- metadata   — freeform JSON (pid, etc.)
--
-- Lock lifecycle:
--   1. acquireReindexLock: sweeps expired rows (expires_at < now()), then
--      INSERT. If INSERT hits 23505 (unique constraint) → denied.
--   2. heartbeatReindexLock: UPDATE heartbeat_at + extends expires_at +30 min.
--      Fires every 5 minutes on setInterval; prevents TTL expiry on long jobs.
--   3. releaseReindexLock: DELETE WHERE lock_name AND job_id match (own job only).
--      Runs in finally block — always executes even on error/throw.
--
-- After running this migration, verify via:
--   SELECT * FROM tina_reindex_locks;  -- should return 0 rows
--   GET /debug/db-identity?secret=YOUR_SECRET  -- lockTableStatus should be "accessible"

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

-- Optional: grant service-role access (required if RLS is enabled on this table).
-- The Supabase service-role key bypasses RLS by default; this is a safety net.
-- ALTER TABLE tina_reindex_locks ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "service_role_full_access" ON tina_reindex_locks
--   FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Optional: index for the expired-lock sweep query (expires_at < now()).
CREATE INDEX IF NOT EXISTS idx_reindex_locks_expires_at
  ON tina_reindex_locks (expires_at);

-- Verify:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'tina_reindex_locks';
