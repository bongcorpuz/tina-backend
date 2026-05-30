-- ============================================================
-- TINA Backend — Active Vector Store Schema
-- Migration: 20260530000000_create_tina_vector_store
-- Run this in the Supabase SQL Editor or via supabase db push
-- ============================================================

-- ─── 1. Extensions ──────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 2. tina_vector_store ────────────────────────────────────────────────────
-- Full schema required by vector-store.js (buildSelectColumns, addDocumentToVectorStore,
-- metadataSearch, exactAuthoritySearch, quiz/review retrieval, reranker metadata,
-- and source card generation).
CREATE TABLE IF NOT EXISTS public.tina_vector_store (
  id                      UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
  source                  TEXT,
  original_source         TEXT,
  chunk_index             INTEGER          DEFAULT 0,
  text                    TEXT,
  metadata                JSONB            DEFAULT '{}'::jsonb,
  embedding               VECTOR(1536),
  authority_type          TEXT,
  authority_level         INTEGER,
  authority_score         DOUBLE PRECISION,
  authority_label         TEXT,
  controlling_precedence  INTEGER,
  normalized_reference    TEXT,
  normalized_aliases      TEXT[],
  recency_date            TEXT,
  jurisdiction            TEXT,
  source_category         TEXT,
  document_title          TEXT,
  effective_from          TEXT,
  effective_to            TEXT,
  is_superseded           BOOLEAN          DEFAULT false,
  superseded_by_reference TEXT,
  repealed_by_reference   TEXT,
  amended_by_reference    TEXT,
  created_at              TIMESTAMPTZ      DEFAULT now()
);

-- Add any columns that may be missing on a table created by an earlier migration.
-- All guards are safe to run repeatedly.
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS source                  TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS original_source         TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS chunk_index             INTEGER          DEFAULT 0;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS text                    TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS metadata                JSONB            DEFAULT '{}'::jsonb;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS embedding               VECTOR(1536);
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS authority_type          TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS authority_level         INTEGER;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS authority_score         DOUBLE PRECISION;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS authority_label         TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS controlling_precedence  INTEGER;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS normalized_reference    TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS normalized_aliases      TEXT[];
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS recency_date            TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS jurisdiction            TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS source_category         TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS document_title          TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS effective_from          TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS effective_to            TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS is_superseded           BOOLEAN          DEFAULT false;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS superseded_by_reference TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS repealed_by_reference   TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS amended_by_reference    TEXT;
ALTER TABLE public.tina_vector_store ADD COLUMN IF NOT EXISTS created_at              TIMESTAMPTZ      DEFAULT now();

-- ─── 3. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS tina_vector_store_embedding_idx
  ON public.tina_vector_store USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS tina_vector_store_normalized_reference_idx
  ON public.tina_vector_store (normalized_reference);

CREATE INDEX IF NOT EXISTS tina_vector_store_authority_level_idx
  ON public.tina_vector_store (authority_level);

-- ─── 4. match_tina_vectors() RPC ─────────────────────────────────────────────
-- DROP first: RETURNS TABLE signature changed — CREATE OR REPLACE cannot change
-- a function's output type, so we must drop-and-recreate.
DROP FUNCTION IF EXISTS public.match_tina_vectors(
  vector,
  double precision,
  integer,
  jsonb
);

CREATE OR REPLACE FUNCTION public.match_tina_vectors(
  query_embedding    vector(1536),
  match_threshold    double precision DEFAULT 0.0,
  match_count        integer          DEFAULT 10,
  filter_metadata    jsonb            DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  id                      uuid,
  source                  text,
  original_source         text,
  chunk_index             integer,
  text                    text,
  metadata                jsonb,
  authority_type          text,
  authority_level         integer,
  authority_score         double precision,
  authority_label         text,
  controlling_precedence  integer,
  normalized_reference    text,
  normalized_aliases      text[],
  recency_date            text,
  jurisdiction            text,
  source_category         text,
  document_title          text,
  effective_from          text,
  effective_to            text,
  is_superseded           boolean,
  superseded_by_reference text,
  repealed_by_reference   text,
  amended_by_reference    text,
  score                   double precision,
  similarity              double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.source,
    t.original_source,
    t.chunk_index,
    t.text,
    t.metadata,
    t.authority_type,
    t.authority_level,
    t.authority_score,
    t.authority_label,
    t.controlling_precedence,
    t.normalized_reference,
    t.normalized_aliases,
    t.recency_date,
    t.jurisdiction,
    t.source_category,
    t.document_title,
    t.effective_from,
    t.effective_to,
    t.is_superseded,
    t.superseded_by_reference,
    t.repealed_by_reference,
    t.amended_by_reference,
    (1 - (t.embedding <=> query_embedding))::double precision AS score,
    (1 - (t.embedding <=> query_embedding))::double precision AS similarity
  FROM public.tina_vector_store t
  WHERE
    t.embedding IS NOT NULL
    AND t.is_superseded IS NOT TRUE
    AND (1 - (t.embedding <=> query_embedding)) >= match_threshold
    AND (
      filter_metadata = '{}'::jsonb
      OR t.metadata @> filter_metadata
    )
  ORDER BY
    (t.embedding <=> query_embedding) ASC,
    t.authority_level ASC NULLS LAST,
    t.chunk_index ASC
  LIMIT LEAST(GREATEST(match_count, 1), 100);
END;
$$;

-- ─── DONE ─────────────────────────────────────────────────────────────────────
-- Run scripts/check-supabase.js after applying to verify all objects exist.
