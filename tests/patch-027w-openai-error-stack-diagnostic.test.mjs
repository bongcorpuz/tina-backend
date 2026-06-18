/**
 * PATCH-027W-DIAG Tests
 * Sanitized OpenAI transport error stack diagnostics.
 *
 * Run: node tests/patch-027w-openai-error-stack-diagnostic.test.mjs
 */

import { callOpenAIWithOrchestration } from "../context-orchestration-engine.js";

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

function fakeOpenAi(outcomes = []) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    chat: {
      completions: {
        create: async () => {
          const outcome = outcomes[calls];
          calls += 1;
          if (outcome instanceof Error) throw outcome;
          return outcome || successfulCompletion();
        }
      }
    }
  };
}

function transportError({
  code = "ECONNRESET",
  message = "fetch failed",
  type = "system",
  name = "FetchError",
  cause = null,
  stackLines = 12
} = {}) {
  const err = new Error(message);
  err.name = name;
  err.code = code;
  err.type = type;
  if (cause) err.cause = cause;
  err.stack = Array.from({ length: stackLines }, (_, index) => `${name}: stack-line-${index + 1}`).join("\n");
  return err;
}

function modelNotFoundError() {
  const err = new Error("The model does not exist or you do not have access to it.");
  err.code = "model_not_found";
  err.status = 404;
  return err;
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

await group("stack diagnostic emits first eight stack lines only", async () => {
  const client = fakeOpenAi([transportError({ stackLines: 12 }), successfulCompletion("Recovered.")]);
  const warnings = captureWarnings();

  try {
    await callOpenAIWithOrchestration(baseArgs(client));
  } finally {
    warnings.restore();
  }

  const diagnostic = warnings.markerObjects("[PATCH_027W_OPENAI_ERROR_STACK_DIAGNOSTIC]")[0];

  assert(client.calls === 2, "transient transport error still retries once");
  assert(Array.isArray(diagnostic?.errorStack), "diagnostic includes stack array");
  assert(diagnostic.errorStack.length === 8, "error stack is capped at eight lines");
  assert(diagnostic.errorStack[0].includes("stack-line-1"), "first stack line is preserved");
  assert(diagnostic.errorStack[7].includes("stack-line-8"), "eighth stack line is preserved");
  assert(!diagnostic.errorStack.join("\n").includes("stack-line-9"), "ninth stack line is omitted");
});

await group("cause diagnostic emits sanitized cause", async () => {
  const cause = transportError({
    code: "ERR_STREAM_PREMATURE_CLOSE",
    message: "Premature close",
    name: "PrematureCloseError",
    stackLines: 10
  });
  const client = fakeOpenAi([transportError({ cause }), successfulCompletion("Recovered.")]);
  const warnings = captureWarnings();

  try {
    await callOpenAIWithOrchestration(baseArgs(client));
  } finally {
    warnings.restore();
  }

  const diagnostic = warnings.markerObjects("[PATCH_027W_OPENAI_ERROR_STACK_DIAGNOSTIC]")[0];

  assert(diagnostic.causeName === "PrematureCloseError", "cause name is logged");
  assert(diagnostic.causeCode === "ERR_STREAM_PREMATURE_CLOSE", "cause code is logged");
  assert(diagnostic.causeMessage === "Premature close", "cause message is logged");
  assert(diagnostic.causeStack.length === 8, "cause stack is capped at eight lines");
  assert(diagnostic.causeConstructorName === "Error", "cause constructor name is logged");
  assert(diagnostic.isCauseErrorInstance === true, "cause Error instance flag is logged");
});

await group("message is truncated to 300 characters", async () => {
  const client = fakeOpenAi([
    transportError({ message: "x".repeat(420) }),
    successfulCompletion("Recovered.")
  ]);
  const warnings = captureWarnings();

  try {
    await callOpenAIWithOrchestration(baseArgs(client));
  } finally {
    warnings.restore();
  }

  const diagnostic = warnings.markerObjects("[PATCH_027W_OPENAI_ERROR_STACK_DIAGNOSTIC]")[0];

  assert(diagnostic.errorMessage.length === 300, "error message is truncated to 300 characters");
  assert(/^x+$/.test(diagnostic.errorMessage), "truncated message preserves sanitized text");
});

await group("diagnostic log does not include prompt source or API key", async () => {
  const client = fakeOpenAi([transportError(), successfulCompletion("Recovered.")]);
  const warnings = captureWarnings();

  try {
    await callOpenAIWithOrchestration(baseArgs(client, {
      openaiApiKeyForTestOnly: SECRET_API_KEY
    }));
  } finally {
    warnings.restore();
  }

  const warningText = warnings.text();

  assert(warningText.includes("[PATCH_027W_OPENAI_ERROR_STACK_DIAGNOSTIC]"), "diagnostic marker is emitted");
  assert(!warningText.includes(SECRET_PROMPT), "diagnostic log does not include full prompt");
  assert(!warningText.includes(SECRET_SOURCE), "diagnostic log does not include source text");
  assert(!warningText.includes(SECRET_API_KEY), "diagnostic log does not include API key");
});

await group("retry behavior is unchanged for transient and non-transient errors", async () => {
  const transientClient = fakeOpenAi([transportError(), transportError()]);
  const transientWarnings = captureWarnings();
  let transientThrown = null;

  try {
    await callOpenAIWithOrchestration(baseArgs(transientClient));
  } catch (error) {
    transientThrown = error;
  } finally {
    transientWarnings.restore();
  }

  const nonTransientClient = fakeOpenAi([modelNotFoundError()]);
  const nonTransientWarnings = captureWarnings();
  let nonTransientThrown = null;

  try {
    await callOpenAIWithOrchestration(baseArgs(nonTransientClient));
  } catch (error) {
    nonTransientThrown = error;
  } finally {
    nonTransientWarnings.restore();
  }

  const successClient = fakeOpenAi([successfulCompletion("Normal answer.")]);
  const successWarnings = captureWarnings();
  const successResult = await callOpenAIWithOrchestration(baseArgs(successClient));
  successWarnings.restore();

  assert(transientClient.calls === 2, "non-premature transient still attempts twice total");
  assert(transientThrown?.code === "ECONNRESET", "transient error is surfaced after existing retry policy");
  assert(transientWarnings.markerObjects("[PATCH_027W_OPENAI_ERROR_STACK_DIAGNOSTIC]").length === 2, "transient failures emit diagnostics per failed attempt");
  assert(nonTransientClient.calls === 1, "non-transient error does not retry");
  assert(nonTransientThrown?.code === "model_not_found", "non-transient error is surfaced");
  assert(nonTransientWarnings.markerObjects("[PATCH_027W_OPENAI_ERROR_STACK_DIAGNOSTIC]").length === 0, "non-transient error does not emit transport diagnostic");
  assert(successClient.calls === 1, "successful first attempt still calls once");
  assert(successResult.answer === "Normal answer.", "successful first attempt result is unchanged");
  assert(successWarnings.markerObjects("[PATCH_027W_OPENAI_ERROR_STACK_DIAGNOSTIC]").length === 0, "successful first attempt emits no failure diagnostic");
});

console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-027W-DIAG  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const failure of failures) console.log(`  - ${failure}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
