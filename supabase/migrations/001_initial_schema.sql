-- ============================================================
-- TINA Backend — Initial Supabase Schema
-- Migration: 001_initial_schema
-- Run this in the Supabase SQL Editor or via supabase db push
-- ============================================================

-- ─── 1. pgvector extension ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── 2. documents (vector store) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  content        TEXT        NOT NULL,
  embedding      VECTOR(1536),
  metadata       JSONB       DEFAULT '{}',
  authority_name TEXT,
  authority_tier INTEGER,
  is_superseded  BOOLEAN     DEFAULT false,
  superseded_by  TEXT,
  document_type  TEXT,
  effective_date DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS documents_authority_idx
  ON documents (authority_name, authority_tier, is_superseded);

-- ─── 3. conversations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  mode                 TEXT        DEFAULT 'ANALYSIS',
  title                TEXT,
  last_message_preview TEXT,
  metadata             JSONB       DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_user_idx
  ON conversations (user_id, updated_at DESC);

-- ─── 4. messages (persistent memory — CRITICAL for Law 5) ────────────────────
-- turn_number defaults to 0 so legacy saveMessage() calls without it still work.
CREATE TABLE IF NOT EXISTS messages (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID        REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT        NOT NULL,
  metadata        JSONB       DEFAULT '{}',
  sources_used    JSONB,
  fallback_references JSONB,
  turn_number     INTEGER     NOT NULL DEFAULT 0,
  pipeline_log    JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_session_turn_idx
  ON messages (conversation_id, turn_number DESC);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages (conversation_id, created_at ASC);

-- ─── 5. supersession_registry ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supersession_registry (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  old_authority  TEXT        NOT NULL,
  superseded_by  TEXT        NOT NULL,
  effective_date DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supersession_old_authority_idx
  ON supersession_registry (old_authority);

-- ─── 6. feedback ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id            UUID    REFERENCES messages(id) ON DELETE CASCADE,
  user_id               UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  rating                INTEGER CHECK (rating IN (-1, 0, 1)),
  correction            TEXT,
  authority_corrections JSONB,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_message_idx
  ON feedback (message_id);

-- ─── 7. match_documents() RPC ────────────────────────────────────────────────
-- LAW E: mandatory authority_names filter.
-- Returns only non-superseded documents.
-- authority_names filter uses ILIKE ANY for prefix/partial matches.
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding  VECTOR(1536),
  match_count      INT     DEFAULT 20,
  filter           JSONB   DEFAULT '{}'
)
RETURNS TABLE(
  id             UUID,
  content        TEXT,
  metadata       JSONB,
  authority_name TEXT,
  authority_tier INT,
  is_superseded  BOOL,
  similarity     FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    d.authority_name,
    d.authority_tier,
    d.is_superseded,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE
    d.is_superseded = false
    AND (
      filter->>'authority_names' IS NULL
      OR d.authority_name ILIKE ANY(
           ARRAY(
             SELECT jsonb_array_elements_text(filter->'authority_names')
           )
         )
    )
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── 8. Row-Level Security ────────────────────────────────────────────────────

-- conversations: users see only their own rows
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversations_owner ON conversations;
CREATE POLICY conversations_owner ON conversations
  FOR ALL
  USING (user_id = auth.uid());

-- messages: users see only messages in their own conversations
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_owner ON messages;
CREATE POLICY messages_owner ON messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- feedback: users see only their own feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_owner ON feedback;
CREATE POLICY feedback_owner ON feedback
  FOR ALL
  USING (user_id = auth.uid());

-- documents: readable by all authenticated users (service role bypasses RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_authenticated_read ON documents;
CREATE POLICY documents_authenticated_read ON documents
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- supersession_registry: readable by all authenticated users
ALTER TABLE supersession_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supersession_authenticated_read ON supersession_registry;
CREATE POLICY supersession_authenticated_read ON supersession_registry
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─── 9. Service-role bypass (for server-side inserts via service key) ─────────
-- The service role key bypasses RLS by default in Supabase.
-- No additional policy needed — service role has full access.

-- ─── DONE ─────────────────────────────────────────────────────────────────────
-- Run scripts/check-supabase.js after applying to verify all objects exist.
