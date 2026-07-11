// FILE: tests/phase-10a3-r1-history-trust-persistence-accessibility-and-visual-validation-1.test.mjs
// PHASE-10A3-R1-HISTORY-TRUST-PERSISTENCE-ACCESSIBILITY-AND-VISUAL-VALIDATION-1

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getConversationMessages,
  normalizePersistedTrust,
  saveMessage
} from "../conversation-memory.js";
import { buildResponseTrust } from "../services/trust-contract.js";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

class Query {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.filters = [];
    this.payload = null;
    this.orderSpec = null;
    this.limitCount = null;
    this.mode = null;
  }

  insert(payload) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  select() {
    this.mode = this.mode || "select";
    return this;
  }

  eq(key, value) {
    this.filters.push([key, value]);
    return this;
  }

  order(key, { ascending = true } = {}) {
    this.orderSpec = { key, ascending };
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  async single() {
    if (this.mode === "insert") {
      const row = {
        id: `${this.table}-${this.db[this.table].length + 1}`,
        created_at: new Date(Date.UTC(2026, 6, 11, 0, this.db[this.table].length)).toISOString(),
        ...this.payload
      };
      this.db[this.table].push(row);
      return { data: row, error: null };
    }
    const rows = await this;
    return { data: rows.data[0] || null, error: null };
  }

  then(resolve, reject) {
    try {
      let rows = this.db[this.table] || [];
      if (this.mode === "update") {
        rows = rows.filter((row) => this.filters.every(([key, value]) => row[key] === value));
        for (const row of rows) Object.assign(row, this.payload);
        resolve({ data: rows, error: null });
        return;
      }
      rows = rows.filter((row) => this.filters.every(([key, value]) => row[key] === value));
      if (this.orderSpec) {
        const { key, ascending } = this.orderSpec;
        rows = [...rows].sort((a, b) => String(a[key] || "").localeCompare(String(b[key] || "")));
        if (!ascending) rows.reverse();
      }
      if (this.limitCount) rows = rows.slice(0, this.limitCount);
      resolve({ data: rows, error: null });
    } catch (error) {
      reject(error);
    }
  }
}

function createSupabaseDouble() {
  const db = {
    messages: [],
    conversations: [{ id: "conv-1", user_id: "user-1", title: "Test" }]
  };
  return {
    db,
    from(table) {
      return new Query(db, table);
    }
  };
}

const TRUST_CASES = [
  {
    id: "restricted",
    trust: buildResponseTrust(
      { responseType: "controlled_loa_legal_conclusion_restricted", controlledLoaAnswer: { requiresHumanReview: true } },
      0,
      "NOT_APPLICABLE"
    )
  },
  {
    id: "potential-conflict",
    trust: buildResponseTrust({ conflictAnalysis: { hasConflict: true, trueConflicts: [1], count: 1 } }, 1, "AUTHORITY_FOUND")
  },
  {
    id: "verified-conflict",
    trust: buildResponseTrust(
      {
        conflictAnalysis: {
          hasConflict: true,
          trueConflicts: [{ a: "A", b: "B", conflictType: "DIRECT_CONTRADICTION", severity: "HIGH" }],
          count: 1
        }
      },
      2,
      "AUTHORITY_FOUND"
    )
  },
  { id: "no-verified-authority", trust: buildResponseTrust({}, 0, "NO_INDEXED_SOURCE") },
  { id: "source-failure", trust: buildResponseTrust({ retrievalTimedOut: true }, 0, "RETRIEVAL_TIMEOUT") },
  { id: "procedural", trust: buildResponseTrust({ responseType: "controlled_loa_answer", controlledLoaAnswer: { requiresHumanReview: true } }, 0, "NOT_APPLICABLE") },
  { id: "verified-authority", trust: buildResponseTrust({}, 2, "AUTHORITY_FOUND") },
  { id: "related-authority", trust: buildResponseTrust({}, 1, "RELATED_AUTHORITY_ONLY") }
];

await test("conversation message persistence stores and reloads canonical trust without recomputing it", async () => {
  for (const item of TRUST_CASES) {
    const supabase = createSupabaseDouble();
    await saveMessage(supabase, {
      conversationId: "conv-1",
      userId: "user-1",
      role: "assistant",
      content: `answer for ${item.id}`,
      trustMetadata: item.trust
    });

    const rows = await getConversationMessages(supabase, { conversationId: "conv-1", userId: "user-1" });
    assert.equal(rows.length, 1, item.id);
    assert.deepEqual(rows[0].metadata.trust, item.trust, item.id);
    assert.deepEqual(rows[0].trust, item.trust, item.id);
  }
});

await test("legacy, malformed, and future trust payloads are backward compatible", async () => {
  const supabase = createSupabaseDouble();
  await saveMessage(supabase, { conversationId: "conv-1", userId: "user-1", role: "assistant", content: "legacy" });
  supabase.db.messages.push({
    id: "manual-1",
    conversation_id: "conv-1",
    user_id: "user-1",
    role: "assistant",
    content: "malformed",
    created_at: "2026-07-11T00:10:00.000Z",
    metadata: { trust: "bad" }
  });
  supabase.db.messages.push({
    id: "manual-2",
    conversation_id: "conv-1",
    user_id: "user-1",
    role: "assistant",
    content: "future",
    created_at: "2026-07-11T00:11:00.000Z",
    metadata: { trust: { version: "2.0", authoritySupport: "FUTURE_ENUM", extraFutureField: { ok: true } } }
  });

  const rows = await getConversationMessages(supabase, { conversationId: "conv-1", userId: "user-1" });
  assert.equal(rows[0].trust, null);
  assert.equal(rows[1].trust, null);
  assert.deepEqual(rows[2].trust, { version: "2.0", authoritySupport: "FUTURE_ENUM", extraFutureField: { ok: true } });
});

await test("trust is never inferred from answer prose", async () => {
  const supabase = createSupabaseDouble();
  await saveMessage(supabase, {
    conversationId: "conv-1",
    userId: "user-1",
    role: "assistant",
    content: "This answer mentions verified authority and conflict in prose only."
  });
  const rows = await getConversationMessages(supabase, { conversationId: "conv-1", userId: "user-1" });
  assert.equal(rows[0].trust, null);
});

await test("ask-handler save path passes the live payload trust object into persistence", () => {
  const src = readFileSync("ask-handler.js", "utf8");
  assert.match(src, /trust:\s*buildResponseTrust\(/);
  assert.match(src, /trust:\s*payload\.trust/);
  assert.match(src, /trustMetadata:\s*trust/);
});

await test("normalizePersistedTrust preserves JSON future fields and rejects non-object payloads", () => {
  assert.equal(normalizePersistedTrust(null), null);
  assert.equal(normalizePersistedTrust("bad"), null);
  assert.deepEqual(normalizePersistedTrust({ version: "2.0", nested: { value: true } }), { version: "2.0", nested: { value: true } });
});

console.log(`\nPHASE-10A3-R1 trust persistence tests: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
