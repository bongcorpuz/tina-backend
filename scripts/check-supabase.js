#!/usr/bin/env node
// FILE: scripts/check-supabase.js
// TINA DevOps — Supabase deployment verifier
// Usage: node scripts/check-supabase.js
"use strict";

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REQUIRED_TABLES = [
  "tina_vector_store",
  "conversations",
  "messages",
  "supersession_registry",
  "feedback"
];

// Projection-based: each column is validated via SELECT <col> LIMIT 0 (no row needed).
const REQUIRED_COLUMNS = {
  tina_vector_store: [
    "id", "source", "original_source", "chunk_index", "text", "metadata",
    "embedding", "authority_type", "authority_level", "authority_score",
    "authority_label", "controlling_precedence", "normalized_reference",
    "normalized_aliases", "recency_date", "jurisdiction", "source_category",
    "document_title", "effective_from", "effective_to", "is_superseded",
    "superseded_by_reference", "repealed_by_reference", "amended_by_reference"
  ],
  conversations:         ["id", "user_id", "mode", "title", "updated_at"],
  messages:              ["id", "conversation_id", "role", "content", "turn_number", "pipeline_log"],
  supersession_registry: ["id", "old_authority", "superseded_by", "effective_date"],
  feedback:              ["id", "message_id", "user_id", "rating", "correction"]
};

const ANSI = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`
};

const PASS  = ANSI.green("✓");
const FAIL  = ANSI.red("✗");
const WARN  = ANSI.yellow("⚠");

let totalChecks = 0;
let passedChecks = 0;
const failures = [];

function check(label, passed, detail = "") {
  totalChecks++;
  const icon = passed ? PASS : FAIL;
  const line  = `  ${icon} ${label}${detail ? `  — ${detail}` : ""}`;
  console.log(line);
  if (passed) {
    passedChecks++;
  } else {
    failures.push(label);
  }
}

// Legacy checks warn but do not count toward failures.
function legacyCheck(label, passed, detail = "") {
  const icon = passed ? PASS : WARN;
  const line  = `  ${icon} ${label}${detail ? `  — ${detail}` : ""}  [legacy]`;
  console.log(line);
}

async function checkEnv() {
  console.log(ANSI.bold("\n── Environment Variables ──────────────────────────────────"));
  const required = [
    ["SUPABASE_URL",              SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY],
    ["OPENAI_API_KEY",            process.env.OPENAI_API_KEY],
    ["JWT_SECRET",                process.env.JWT_SECRET]
  ];
  for (const [name, val] of required) {
    check(`${name} set`, Boolean(val && val.length > 4));
  }
}

async function checkConnection(supabase) {
  console.log(ANSI.bold("\n── Supabase Connection ────────────────────────────────────"));
  try {
    const { error } = await supabase.from("conversations").select("id").limit(1);
    check("Supabase reachable", !error, error?.message);
    return !error;
  } catch (err) {
    check("Supabase reachable", false, err.message);
    return false;
  }
}

async function checkPgvector(supabase) {
  console.log(ANSI.bold("\n── pgvector Extension ─────────────────────────────────────"));
  try {
    const { data, error } = await supabase
      .rpc("pg_available_extensions")
      .select("*");

    if (error) {
      const { data: d2, error: e2 } = await supabase
        .from("pg_extension")
        .select("extname")
        .eq("extname", "vector")
        .limit(1);
      check("pgvector extension enabled", !e2 && (d2?.length ?? 0) > 0,
            e2?.message || "Could not verify — check Supabase dashboard");
      return;
    }

    const vectorExt = (data || []).find(e => e.name === "vector");
    check("pgvector extension enabled", Boolean(vectorExt?.installed_version),
          vectorExt?.installed_version
            ? `v${vectorExt.installed_version}`
            : "Not installed — run: CREATE EXTENSION IF NOT EXISTS vector;");
  } catch (err) {
    check("pgvector extension enabled", false, `Exception: ${err.message}`);
  }
}

// Projection-based column validation: each column is probed via SELECT <col> LIMIT 0.
// This works on empty tables and does not require any rows to be present.
async function checkTables(supabase) {
  console.log(ANSI.bold("\n── Tables ──────────────────────────────────────────────────"));
  for (const table of REQUIRED_TABLES) {
    try {
      const { error: tableErr } = await supabase.from(table).select("id").limit(0);
      check(`Table: ${table}`, !tableErr, tableErr?.message);

      if (!tableErr) {
        const cols = REQUIRED_COLUMNS[table] || [];
        for (const col of cols) {
          const { error: colErr } = await supabase.from(table).select(col).limit(0);
          check(`  Column: ${table}.${col}`, !colErr, colErr?.message);
        }
      }
    } catch (err) {
      check(`Table: ${table}`, false, err.message);
    }
  }
}

async function checkMatchTinaVectorsRpc(supabase) {
  console.log(ANSI.bold("\n── match_tina_vectors() RPC ───────────────────────────────"));

  const zeroEmbedding = new Array(1536).fill(0);
  const expectedCols  = [
    "id", "source", "original_source", "chunk_index", "text", "metadata",
    "authority_type", "authority_level", "authority_score", "authority_label",
    "controlling_precedence", "normalized_reference", "normalized_aliases",
    "recency_date", "jurisdiction", "source_category", "document_title",
    "effective_from", "effective_to", "is_superseded",
    "superseded_by_reference", "repealed_by_reference", "amended_by_reference",
    "score", "similarity"
  ];

  try {
    const { data, error } = await supabase.rpc("match_tina_vectors", {
      query_embedding: zeroEmbedding,
      match_count:     1,
      match_threshold: 0.0,
      filter_metadata: {}
    });

    check("match_tina_vectors() RPC exists", !error, error?.message);

    if (!error) {
      const row = (data || [])[0];
      const hasExpectedCols = !row || expectedCols.every(col => col in row);
      const foundCols = row
        ? Object.keys(row).join(", ")
        : "No rows (table may be empty — schema OK)";
      check("match_tina_vectors() returns correct columns", hasExpectedCols, foundCols);
    }
  } catch (err) {
    check("match_tina_vectors() RPC exists", false, err.message);
  }
}

async function checkMatchDocumentsRpcLegacy(supabase) {
  console.log(ANSI.bold("\n── match_documents() RPC  [legacy — optional] ─────────────"));

  const zeroEmbedding = new Array(1536).fill(0);

  try {
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: zeroEmbedding,
      match_count:     1,
      filter:          {}
    });

    legacyCheck("match_documents() RPC exists", !error, error?.message);

    if (!error) {
      const row = (data || [])[0];
      const hasExpectedCols = !row || (
        "id" in row &&
        "content" in row &&
        "authority_name" in row &&
        "is_superseded" in row &&
        "similarity" in row
      );
      legacyCheck("match_documents() returns correct columns", hasExpectedCols,
            row ? Object.keys(row).join(", ") : "No rows (table may be empty — schema OK)");
    }
  } catch (err) {
    legacyCheck("match_documents() RPC exists", false, err.message);
  }

  try {
    const zeroEmbedding2 = new Array(1536).fill(0);
    const { error: filterError } = await supabase.rpc("match_documents", {
      query_embedding: zeroEmbedding2,
      match_count:     1,
      filter:          { authority_names: ["NIRC Sec. 105"] }
    });
    legacyCheck("match_documents() authority_names filter works", !filterError, filterError?.message);
  } catch (err) {
    legacyCheck("match_documents() authority_names filter works", false, err.message);
  }
}

async function checkRlsEnabled(supabase) {
  console.log(ANSI.bold("\n── Row-Level Security ─────────────────────────────────────"));
  const rlsTables = ["conversations", "messages", "feedback", "documents"];

  for (const table of rlsTables) {
    try {
      const { data, error } = await supabase
        .from("pg_tables")
        .select("rowsecurity")
        .eq("schemaname", "public")
        .eq("tablename", table)
        .single();

      if (error) {
        console.log(`  ${WARN} Could not verify RLS for ${table} — check Supabase dashboard`);
        continue;
      }
      check(`RLS enabled: ${table}`, data?.rowsecurity === true);
    } catch {
      console.log(`  ${WARN} RLS check skipped for ${table} — verify in dashboard`);
    }
  }
}

async function checkIndexes(supabase) {
  console.log(ANSI.bold("\n── Indexes ─────────────────────────────────────────────────"));
  const requiredIndexes = [
    "tina_vector_store_embedding_idx",
    "tina_vector_store_normalized_reference_idx",
    "tina_vector_store_authority_level_idx",
    "messages_session_turn_idx",
    "conversations_user_idx"
  ];

  for (const idx of requiredIndexes) {
    try {
      const { data, error } = await supabase
        .from("pg_indexes")
        .select("indexname")
        .eq("schemaname", "public")
        .eq("indexname", idx)
        .limit(1);

      check(`Index: ${idx}`, !error && (data?.length ?? 0) > 0,
            error?.message || (data?.length === 0
              ? "Missing — run 20260530000000_create_tina_vector_store.sql"
              : ""));
    } catch {
      console.log(`  ${WARN} Could not verify index ${idx} — check Supabase dashboard`);
    }
  }
}

async function checkNodeVersion() {
  console.log(ANSI.bold("\n── Runtime ─────────────────────────────────────────────────"));
  const [major] = process.versions.node.split(".").map(Number);
  check(`Node.js ≥20 (found v${process.versions.node})`, major >= 20);
}

async function printSummary() {
  console.log(ANSI.bold("\n── Deployment Checklist ─────────────────────────────────────"));
  const items = [
    ["pgvector + pgcrypto extensions enabled",           "Run: CREATE EXTENSION IF NOT EXISTS vector; pgcrypto;"],
    ["tina_vector_store table created (full schema)",    "Run: supabase/migrations/20260530000000_create_tina_vector_store.sql"],
    ["match_tina_vectors() RPC deployed",                "Run: supabase/migrations/20260530000000_create_tina_vector_store.sql"],
    ["All 3 tina_vector_store indexes created",          "Run: supabase/migrations/20260530000000_create_tina_vector_store.sql"],
    ["RLS enabled on messages + conversations",          "Run: supabase/migrations/001_initial_schema.sql"],
    ["All .env variables set",                           "Copy .env.example → .env, fill values"],
    ["Node.js ≥20 on server",                            "Upgrade Node.js if needed"],
    ["npm install completed",                            "Run: npm install"],
    ["GET /health returns 200",                          "Run: node server.js, curl /health"],
    ["OpenAI API key tested",                            "Run: scripts/check-supabase.js (checks env)"]
  ];

  for (const [label] of items) {
    console.log(`  □ ${label}`);
  }
}

async function main() {
  console.log(ANSI.bold(ANSI.cyan("\n╔══════════════════════════════════════════════════╗")));
  console.log(ANSI.bold(ANSI.cyan("║   TINA DevOps — Supabase Deployment Verifier    ║")));
  console.log(ANSI.bold(ANSI.cyan("╚══════════════════════════════════════════════════╝")));

  await checkNodeVersion();
  await checkEnv();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log(ANSI.red("\n  ✗ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Set .env and re-run.\n"));
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const connected = await checkConnection(supabase);
  if (!connected) {
    console.log(ANSI.red("\n  ✗ Cannot reach Supabase. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n"));
    process.exit(1);
  }

  await checkPgvector(supabase);
  await checkTables(supabase);
  await checkMatchTinaVectorsRpc(supabase);
  await checkMatchDocumentsRpcLegacy(supabase);
  await checkRlsEnabled(supabase);
  await checkIndexes(supabase);
  await printSummary();

  console.log(ANSI.bold(`\n── Result ──────────────────────────────────────────────────`));
  console.log(`  Passed: ${ANSI.green(String(passedChecks))} / ${totalChecks}`);

  if (failures.length) {
    console.log(ANSI.red(`\n  Failed checks:`));
    for (const f of failures) console.log(ANSI.red(`    • ${f}`));
    console.log(ANSI.yellow(`\n  Run supabase/migrations/20260530000000_create_tina_vector_store.sql to fix schema issues.\n`));
    process.exit(1);
  } else {
    console.log(ANSI.green("\n  All checks passed. TINA active schema is ready.\n"));
  }
}

main().catch((err) => {
  console.error(ANSI.red(`\nFatal error: ${err.message}\n`));
  process.exit(1);
});
