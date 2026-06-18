/**
 * PATCH-027X Tests
 * Disable compressed OpenAI response-body handling by requesting identity encoding.
 *
 * Run: node tests/patch-027x-openai-identity-encoding.test.mjs
 */

import fs from "fs";
import { callOpenAIWithOrchestration } from "../context-orchestration-engine.js";

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

function successfulCompletion(answer = "Generated answer.") {
  return {
    choices: [{ message: { content: answer } }],
    usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 }
  };
}

function prematureCloseError() {
  const err = new Error("Invalid response body while trying to fetch https://api.openai.com/v1/chat/completions: Premature close");
  err.name = "FetchError";
  err.code = "ERR_STREAM_PREMATURE_CLOSE";
  err.type = "system";
  return err;
}

function modelNotFoundError() {
  const err = new Error("The model does not exist or you do not have access to it.");
  err.code = "model_not_found";
  err.status = 404;
  return err;
}

function fakeOpenAi(outcomes = [], recorder = null, label = "client") {
  let calls = 0;
  return {
    label,
    get calls() {
      return calls;
    },
    chat: {
      completions: {
        create: async (payload, options) => {
          const outcome = outcomes[calls];
          calls += 1;
          if (recorder) {
            recorder.calls.push({
              label,
              payload,
              options
            });
          }
          if (outcome instanceof Error) throw outcome;
          return outcome || successfulCompletion();
        }
      }
    }
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
    markerObjects(marker) {
      return entries.filter((entry) => entry[0] === marker).map((entry) => entry[1]);
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

const SECRET_PROMPT = "SECRET_PROMPT_SHOULD_NOT_LOG";
const SECRET_SOURCE = "SECRET_SOURCE_TEXT_SHOULD_NOT_LOG";
const SECRET_API_KEY = "sk-secret-value-should-not-log";

function baseArgs(openai, extra = {}) {
  return {
    openai,
    model: "gpt-4o-mini",
    query: `What does NIRC Sec. 57 provide on withholding tax? ${SECRET_PROMPT}`,
    userQuery: `What does NIRC Sec. 57 provide on withholding tax? ${SECRET_PROMPT}`,
    retrievedSources: [
      {
        citation: "NIRC Sec. 57",
        normalizedReference: "NIRC Sec. 57",
        text: `${SECRET_SOURCE} Section 57 provides withholding-at-source rules.`
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

function identityHeader(call = {}) {
  return call.options?.headers?.["Accept-Encoding"] || call.options?.headers?.["accept-encoding"] || null;
}

await group("OpenAI request uses Accept-Encoding identity", async () => {
  const recorder = { calls: [] };
  const client = fakeOpenAi([successfulCompletion("Identity answer.")], recorder);
  const warnings = captureWarnings();

  const result = await callOpenAIWithOrchestration(baseArgs(client));
  warnings.restore();

  const marker = warnings.markerObjects("[PATCH_027X_OPENAI_IDENTITY_ENCODING_ENABLED]")[0];

  assert(result.answer === "Identity answer.", "successful answer is returned");
  assert(client.calls === 1, "one OpenAI call is made");
  assert(identityHeader(recorder.calls[0]) === "identity", "request options include Accept-Encoding identity");
  assert(marker?.enabled === true, "identity encoding marker is emitted");
  assert(marker?.attempt === 1, "marker records attempt number");
  assert(marker?.clientType === "shared", "normal attempt records shared client type");
});

await group("fresh retry clients also use Accept-Encoding identity", async () => {
  const recorder = { calls: [] };
  const client1 = fakeOpenAi([prematureCloseError()], recorder, "client1");
  const client2 = fakeOpenAi([prematureCloseError()], recorder, "client2");
  const client3 = fakeOpenAi([successfulCompletion("Third attempt answer.")], recorder, "client3");
  const freshClients = [client2, client3];
  const warnings = captureWarnings();

  const result = await callOpenAIWithOrchestration(baseArgs(client1, {
    openaiClientFactory: () => freshClients.shift()
  }));
  warnings.restore();

  const markers = warnings.markerObjects("[PATCH_027X_OPENAI_IDENTITY_ENCODING_ENABLED]");

  assert(result.answer === "Third attempt answer.", "third attempt succeeds");
  assert(recorder.calls.length === 3, "three OpenAI calls are recorded");
  assert(recorder.calls.every((call) => identityHeader(call) === "identity"), "all attempts include Accept-Encoding identity");
  assert(recorder.calls.map((call) => call.label).join(",") === "client1,client2,client3", "fresh retry clients are used");
  assert(markers.length === 3, "identity marker emits once per attempt");
  assert(markers[0].clientType === "shared", "attempt 1 marker records shared client");
  assert(markers.slice(1).every((marker) => marker.clientType === "fresh"), "retry markers record fresh client");
});

await group("PATCH-027V retry behavior is preserved", async () => {
  const recorder = { calls: [] };
  const client1 = fakeOpenAi([prematureCloseError()], recorder, "client1");
  const client2 = fakeOpenAi([prematureCloseError()], recorder, "client2");
  const client3 = fakeOpenAi([prematureCloseError()], recorder, "client3");
  const freshClients = [client2, client3];
  const diagnostics = [];
  let thrown = null;

  try {
    await callOpenAIWithOrchestration(baseArgs(client1, {
      openaiDiagnostics: diagnostics,
      openaiClientFactory: () => freshClients.shift()
    }));
  } catch (error) {
    thrown = error;
  }

  assert(thrown?.code === "ERR_STREAM_PREMATURE_CLOSE", "premature close is rethrown after retries");
  assert(recorder.calls.length === 3, "premature close still attempts three times total");
  assert(diagnostics[0].retryExhausted === true, "retry exhaustion remains recorded");
  assert(diagnostics[0].attempts.map((attempt) => attempt.attempt).join(",") === "1,2,3", "attempt sequence remains unchanged");
});

await group("identity diagnostics do not log prompt source or API key", async () => {
  const recorder = { calls: [] };
  const client = fakeOpenAi([successfulCompletion("Normal answer.")], recorder);
  const warnings = captureWarnings();

  await callOpenAIWithOrchestration(baseArgs(client, {
    openaiApiKeyForTestOnly: SECRET_API_KEY
  }));
  warnings.restore();

  const warningText = warnings.text();

  assert(warningText.includes("[PATCH_027X_OPENAI_IDENTITY_ENCODING_ENABLED]"), "identity marker is present");
  assert(!warningText.includes(SECRET_PROMPT), "identity marker log does not include full prompt");
  assert(!warningText.includes(SECRET_SOURCE), "identity marker log does not include source text");
  assert(!warningText.includes(SECRET_API_KEY), "identity marker log does not include API key");
  assert(!/authorization/i.test(warningText), "identity marker log does not include authorization headers");
});

await group("successful first attempt is unchanged", async () => {
  const recorder = { calls: [] };
  const client = fakeOpenAi([successfulCompletion("Normal answer.")], recorder);
  const diagnostics = [];

  const result = await callOpenAIWithOrchestration(baseArgs(client, { openaiDiagnostics: diagnostics }));

  assert(client.calls === 1, "normal success makes one call");
  assert(result.answer === "Normal answer.", "normal answer is preserved");
  assert(diagnostics[0].retrySucceeded !== true, "normal success does not set retry success");
  assert(identityHeader(recorder.calls[0]) === "identity", "normal success uses identity encoding");
});

await group("non-transient errors are unchanged", async () => {
  const recorder = { calls: [] };
  const client = fakeOpenAi([modelNotFoundError()], recorder);
  const diagnostics = [];
  let thrown = null;

  try {
    await callOpenAIWithOrchestration(baseArgs(client, { openaiDiagnostics: diagnostics }));
  } catch (error) {
    thrown = error;
  }

  assert(client.calls === 1, "non-transient error does not retry");
  assert(thrown?.code === "model_not_found", "non-transient error is surfaced");
  assert(diagnostics[0].attempts.length === 1, "diagnostics still records one failed attempt");
  assert(identityHeader(recorder.calls[0]) === "identity", "non-transient request still uses identity encoding");
});

await group("static implementation uses SDK request options and fresh-client defaults", async () => {
  assert(ORCHESTRATION_SRC.includes("\"Accept-Encoding\": \"identity\""), "identity header constant is present");
  assert(ORCHESTRATION_SRC.includes("defaultHeaders: OPENAI_IDENTITY_ENCODING_HEADERS"), "internally-created OpenAI clients use default identity headers");
  assert(ORCHESTRATION_SRC.includes("OPENAI_IDENTITY_ENCODING_REQUEST_OPTIONS"), "chat completion call uses request options");
  assert(ORCHESTRATION_SRC.includes("[PATCH_027X_OPENAI_IDENTITY_ENCODING_ENABLED]"), "identity diagnostic marker is present");
});

console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-027X  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const failure of failures) console.log(`  - ${failure}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
