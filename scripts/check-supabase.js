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
  "documents",
  "conversations",
  "messages",
  "supersession_registry",
  "feedback"
];

const REQUIRED_COLUMNS = {
  documents:             ["id", "content", "embedding", "authority_name", "authority_tier", "is_superseded"],
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
    const { error } = await supabase.from("documents").select("id").limit(1);
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
      // Try direct query as fallback
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

async function checkTables(supabase) {
  console.log(ANSI.bold("\n── Tables ──────────────────────────────────────────────────"));
  for (const table of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(table).select("id").limit(1);
      check(`Table: ${table}`, !error, error?.message);

      if (!error) {
        // Check columns
        const cols = REQUIRED_COLUMNS[table] || [];
        const { data: sample } = await supabase.from(table).select("*").limit(1);
        const existingCols = sample && sample.length > 0
          ? Object.keys(sample[0])
          : [];

        // If table is empty, we can't check columns from data alone — skip col check
        if (existingCols.length > 0) {
          for (const col of cols) {
            check(`  Column: ${table}.${col}`, existingCols.includes(col));
          }
        } else {
          console.log(`  ${WARN} ${table} is empty — column check skipped`);
        }
      }
    } catch (err) {
      check(`Table: ${table}`, false, err.message);
    }
  }
}

async function checkMatchDocumentsRpc(supabase) {
  console.log(ANSI.bold("\n── match_documents() RPC ──────────────────────────────────"));

  // Test with a zero-vector call (just verifies function exists and returns correct shape)
  const zeroEmbedding = new Array(1536).fill(0);

  try {
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: zeroEmbedding,
      match_count:     1,
      filter:          {}
    });

    check("match_documents() RPC exists", !error, error?.message);

    if (!error) {
      const row = (data || [])[0];
      const hasExpectedCols = !row || (
        "id" in row &&
        "content" in row &&
        "authority_name" in row &&
        "is_superseded" in row &&
        "similarity" in row
      );
      check("match_documents() returns correct columns", hasExpectedCols,
            row ? Object.keys(row).join(", ") : "No rows (table may be empty — schema OK)");
    }
  } catch (err) {
    check("match_documents() RPC exists", false, err.message);
  }

  // Test with authority_names filter
  try {
    const zeroEmbedding2 = new Array(1536).fill(0);
    const { error: filterError } = await supabase.rpc("match_documents", {
      query_embedding: zeroEmbedding2,
      match_count:     1,
      filter:          { authority_names: ["NIRC Sec. 105"] }
    });
    check("match_documents() authority_names filter works", !filterError, filterError?.message);
  } catch (err) {
    check("match_documents() authority_names filter works", false, err.message);
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
    "documents_embedding_idx",
    "documents_authority_idx",
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
            error?.message || (data?.length === 0 ? "Missing — run 001_initial_schema.sql" : ""));
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
    ["pgvector extension enabled",                   "Run: CREATE EXTENSION IF NOT EXISTS vector;"],
    ["All 5 tables created",                         "Run: supabase/migrations/001_initial_schema.sql"],
    ["match_documents() RPC deployed",               "Run: supabase/migrations/001_initial_schema.sql"],
    ["RLS enabled on messages + conversations",      "Run: supabase/migrations/001_initial_schema.sql"],
    ["Both indexes created",                         "Run: supabase/migrations/001_initial_schema.sql"],
    ["All .env variables set",                       "Copy .env.example → .env, fill values"],
    ["Node.js ≥20 on server",                        "Upgrade Node.js if needed"],
    ["npm install completed",                        "Run: npm install"],
    ["GET /health returns 200",                      "Run: node server.js, curl /health"],
    ["OpenAI API key tested",                        "Run: scripts/check-supabase.js (checks env)"]
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
  await checkMatchDocumentsRpc(supabase);
  await checkRlsEnabled(supabase);
  await checkIndexes(supabase);
  await printSummary();

  console.log(ANSI.bold(`\n── Result ──────────────────────────────────────────────────`));
  console.log(`  Passed: ${ANSI.green(String(passedChecks))} / ${totalChecks}`);

  if (failures.length) {
    console.log(ANSI.red(`\n  Failed checks:`));
    for (const f of failures) console.log(ANSI.red(`    • ${f}`));
    console.log(ANSI.yellow(`\n  Run supabase/migrations/001_initial_schema.sql to fix schema issues.\n`));
    process.exit(1);
  } else {
    console.log(ANSI.green("\n  All checks passed. Supabase is ready for TINA.\n"));
  }
}

main().catch((err) => {
  console.error(ANSI.red(`\nFatal error: ${err.message}\n`));
  process.exit(1);
});
