/**
 * PATCH-027V Tests
 * OpenAI live transport hardening for ERR_STREAM_PREMATURE_CLOSE.
 *
 * Run: node tests/patch-027v-openai-live-transport-hardening.test.mjs
 */

import fs from "fs";
import { callOpenAIWithOrchestration } from "../context-orchestration-engine.js";

const PIPELINE_SRC = fs.readFileSync(new URL("../pipeline.js", import.meta.url), "utf8");
const ORCHESTRATION_SRC = fs.readFileSync(new URL("../context-orchestration-engine.js", import.meta.url), "utf8");

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed += 1;
  } else {
    console.error(`  FAIL  ${label}`);
    failed += 1;
    failures.push(label);
  }
}

async function group(name, fn) {
  console.log(`\n-- ${name}`);
  await fn();
}

function prematureCloseError() {
  const err = new Error("Invalid response body while trying to fetch https://api.openai.com/v1/chat/completions: Premature close");
  err.code = "ERR_STREAM_PREMATURE_CLOSE";
  err.type = "system";
  return err;
}

function networkError() {
  const err = new Error("fetch failed");
  err.code = "ECONNRESET";
  err.type = "system";
  return err;
}

function modelNotFoundError() {
  const err = new Error("The model does not exist or you do not have access to it.");
  err.code = "model_not_found";
  err.status = 404;
  return err;
}

function successfulCompletion(answer = "Generated answer.") {
  return {
    choices: [{ message: { content: answer } }],
    usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 }
  };
}

function fakeOpenAi(outcomes = [], label = "client", recorder = null) {
  let calls = 0;
  return {
    label,
    get calls() {
      return calls;
    },
    chat: {
      completions: {
        create: async (payload) => {
          const outcome = outcomes[calls];
          calls += 1;
          if (recorder) {
            recorder.payloads.push(JSON.stringify(payload));
          }
          if (outcome instanceof Error) throw outcome;
          return outcome || successfulCompletion();
        }
      }
    }
  };
}

const SECRET_PROMPT = "What does NIRC Sec. 57 provide on withholding tax? SECRET_SOURCE_TEXT_SHOULD_NOT_LOG";
const SECRET_API_KEY = "sk-secret-value-should-not-log";

function baseArgs(openai, extra = {}) {
  return {
    openai,
    model: "gpt-4o-mini",
    query: SECRET_PROMPT,
    userQuery: SECRET_PROMPT,
    retrievedSources: [
      {
        citation: "NIRC Sec. 57",
        normalizedReference: "NIRC Sec. 57",
        text: "SECRET_SOURCE_TEXT_SHOULD_NOT_LOG Section 57 provides withholding-at-source rules."
      }
    ],
    issueClassification: {
      primaryIssue: "WITHHOLDING",
      controllingAuthorities: ["NIRC Sec. 57"]
    },
    saeStatus: "AUTHORITY_FOUND",
    mode: "STANDARD_TAX",
    ...extra
  };
}

function captureWarnings() {
  const originalWarn = console.warn;
  const entries = [];
  console.warn = (...args) => {
    entries.push(args);
  };
  return {
    entries,
    restore() {
      console.warn = originalWarn;
    },
    text() {
      return entries.map((args) => args.map((arg) => {
        try {
          return typeof arg === "string" ? arg : JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }).join(" ")).join("\n");
    }
  };
}

await group("ERR_STREAM_PREMATURE_CLOSE fails twice then succeeds on third attempt", async () => {
  const diagnostics = [];
  const recorder = { payloads: [] };
  const client1 = fakeOpenAi([prematureCloseError()], "client1", recorder);
  const client2 = fakeOpenAi([prematureCloseError()], "client2", recorder);
  const client3 = fakeOpenAi([successfulCompletion("Third attempt answer.")], "client3", recorder);
  const freshClients = [client2, client3];

  const result = await callOpenAIWithOrchestration(baseArgs(client1, {
    openaiDiagnostics: diagnostics,
    openaiClientFactory: () => freshClients.shift()
  }));

  assert(result.answer === "Third attempt answer.", "third attempt returns generated answer");
  assert(client1.calls === 1, "attempt 1 uses injected client");
  assert(client2.calls === 1, "attempt 2 uses first fresh client");
  assert(client3.calls === 1, "attempt 3 uses second fresh client");
  assert(diagnostics[0].attempts.length === 3, "diagnostics records three attempts");
  assert(diagnostics[0].attempts[1].freshClientUsed === true, "attempt 2 marks fresh client");
  assert(diagnostics[0].attempts[2].freshClientUsed === true, "attempt 3 marks fresh client");
  assert(diagnostics[0].retrySucceeded === true, "retry success is recorded");
  assert(new Set(recorder.payloads).size === 1, "same requestPayload is reused exactly across attempts");
});

await group("ERR_STREAM_PREMATURE_CLOSE fails all three attempts and emits sanitized metrics", async () => {
  const diagnostics = [];
  const recorder = { payloads: [] };
  const client1 = fakeOpenAi([prematureCloseError()], "client1", recorder);
  const client2 = fakeOpenAi([prematureCloseError()], "client2", recorder);
  const client3 = fakeOpenAi([prematureCloseError()], "client3", recorder);
  const freshClients = [client2, client3];
  const warnings = captureWarnings();
  let thrown = null;

  try {
    await callOpenAIWithOrchestration(baseArgs(client1, {
      openaiDiagnostics: diagnostics,
      openaiClientFactory: () => freshClients.shift()
    }));
  } catch (error) {
    thrown = error;
  } finally {
    warnings.restore();
  }

  const metrics = diagnostics[0].payloadMetricsOnFailure;
  const warningText = warnings.text();

  assert(thrown?.code === "ERR_STREAM_PREMATURE_CLOSE", "premature close is rethrown after three failed attempts");
  assert(client1.calls === 1 && client2.calls === 1 && client3.calls === 1, "all three clients are used once");
  assert(new Set(recorder.payloads).size === 1, "failing retries preserve identical requestPayload");
  assert(diagnostics[0].retryExhausted === true, "retry exhaustion is recorded");
  assert(metrics?.messageCount === 2, "sanitized metrics include message count");
  assert(Array.isArray(metrics?.roleSequence) && metrics.roleSequence.join(",") === "system,user", "sanitized metrics include role sequence");
  assert(metrics?.totalChars > 0, "sanitized metrics include total chars");
  assert(metrics?.jsonByteSize > 0, "sanitized metrics include JSON byte size");
  assert(metrics?.errorCodes.every((code) => code === "ERR_STREAM_PREMATURE_CLOSE"), "metrics include error codes per attempt");
  assert(warningText.includes("[PATCH_027V_OPENAI_PAYLOAD_METRICS_ON_FAILURE]"), "failure metrics marker is emitted");
  assert(!warningText.includes(SECRET_PROMPT), "metrics log does not include full user prompt");
  assert(!warningText.includes("SECRET_SOURCE_TEXT_SHOULD_NOT_LOG"), "metrics log does not include source text");
  assert(!warningText.includes(SECRET_API_KEY), "metrics log does not include API key");
});

await group("retry attempts 2 and 3 use fresh OpenAI client path", async () => {
  const diagnostics = [];
  const client1 = fakeOpenAi([prematureCloseError()], "client1");
  const created = [
    fakeOpenAi([prematureCloseError()], "fresh2"),
    fakeOpenAi([successfulCompletion("Fresh success.")], "fresh3")
  ];
  const used = [];

  await callOpenAIWithOrchestration(baseArgs(client1, {
    openaiDiagnostics: diagnostics,
    openaiClientFactory: () => {
      const next = created[used.length];
      used.push(next.label);
      return next;
    }
  }));

  assert(used.join(",") === "fresh2,fresh3", "fresh factory is called for attempts 2 and 3");
  assert(diagnostics[0].attempts.slice(1).every((attempt) => attempt.freshClientUsed === true), "retry attempts are marked fresh");
});

await group("non-transient error does not retry", async () => {
  const diagnostics = [];
  const client = fakeOpenAi([modelNotFoundError()], "client");
  let thrown = null;

  try {
    await callOpenAIWithOrchestration(baseArgs(client, { openaiDiagnostics: diagnostics }));
  } catch (error) {
    thrown = error;
  }

  assert(client.calls === 1, "model_not_found makes one call");
  assert(thrown?.code === "model_not_found", "non-transient error is surfaced");
  assert(diagnostics[0].attempts.length === 1, "diagnostics records one attempt");
});

await group("other transient error keeps PATCH-027U two-attempt behavior", async () => {
  const diagnostics = [];
  const client = fakeOpenAi([networkError(), networkError()], "client");
  let thrown = null;

  try {
    await callOpenAIWithOrchestration(baseArgs(client, { openaiDiagnostics: diagnostics }));
  } catch (error) {
    thrown = error;
  }

  assert(client.calls === 2, "non-premature transient still attempts twice total");
  assert(thrown?.code === "ECONNRESET", "non-premature transient error is surfaced after existing retry policy");
});

await group("successful first attempt behavior is unchanged", async () => {
  const diagnostics = [];
  const client = fakeOpenAi([successfulCompletion("Normal answer.")], "client");

  const result = await callOpenAIWithOrchestration(baseArgs(client, { openaiDiagnostics: diagnostics }));

  assert(client.calls === 1, "normal success makes one call");
  assert(result.answer === "Normal answer.", "normal answer is preserved");
  assert(diagnostics[0].retrySucceeded !== true, "normal success does not set retry success");
  assert(!diagnostics[0].payloadMetricsOnFailure, "normal success does not emit failure metrics");
});

await group("fallback still preserves retrieved source-card context", async () => {
  assert(
    PIPELINE_SRC.includes("TINA retrieved indexed legal sources, but the answer-generation request failed due to a temporary model connection issue. Please retry the question."),
    "pipeline fallback wording remains PATCH-027U improved text"
  );
  assert(
    PIPELINE_SRC.includes("Governing indexed authority was retrieved: ${sourceLabels.join(\", \")}."),
    "fallback still preserves retrieved governing authority labels"
  );
  assert(
    PIPELINE_SRC.includes("Please use the source cards shown with this response to review the retrieved governing authority."),
    "fallback still points to preserved source cards"
  );
});

await group("diagnostic markers are present", async () => {
  assert(ORCHESTRATION_SRC.includes("[PATCH_027V_OPENAI_RETRY_ATTEMPT]"), "retry attempt marker is present");
  assert(ORCHESTRATION_SRC.includes("[PATCH_027V_OPENAI_RETRY_SUCCESS]"), "retry success marker is present");
  assert(ORCHESTRATION_SRC.includes("[PATCH_027V_OPENAI_RETRY_EXHAUSTED]"), "retry exhausted marker is present");
  assert(ORCHESTRATION_SRC.includes("[PATCH_027V_OPENAI_PAYLOAD_METRICS_ON_FAILURE]"), "payload metrics marker is present");
});

console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-027V  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const failure of failures) console.log(`  - ${failure}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
