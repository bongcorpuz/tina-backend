/**
 * PATCH-027U Tests
 * OpenAI transient transport retry and fallback wording.
 *
 * Run: node tests/patch-027u-openai-transient-retry.test.mjs
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

function group(name, fn) {
  console.log(`\n-- ${name}`);
  return fn();
}

function transientError() {
  const err = new Error("Invalid response body while trying to fetch https://api.openai.com/v1/chat/completions: Premature close");
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
          return outcome || {
            choices: [{ message: { content: "Generated answer." } }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
          };
        }
      }
    }
  };
}

function baseArgs(openai, openaiDiagnostics = []) {
  return {
    openai,
    model: "gpt-4o-mini",
    query: "What does NIRC Sec. 57 provide on withholding tax?",
    userQuery: "What does NIRC Sec. 57 provide on withholding tax?",
    retrievedSources: [
      {
        citation: "NIRC Sec. 57",
        normalizedReference: "NIRC Sec. 57",
        text: "Section 57 provides rules on withholding of tax at source."
      }
    ],
    issueClassification: {
      primaryIssue: "WITHHOLDING",
      controllingAuthorities: ["NIRC Sec. 57"]
    },
    saeStatus: "AUTHORITY_FOUND",
    mode: "STANDARD_TAX",
    openaiDiagnostics
  };
}

await group("simulated ERR_STREAM_PREMATURE_CLOSE succeeds on retry", async () => {
  const diagnostics = [];
  const client = fakeOpenAi([
    transientError(),
    {
      choices: [{ message: { content: "NIRC Sec. 57 provides withholding-at-source rules." } }],
      usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 }
    }
  ]);

  const result = await callOpenAIWithOrchestration(baseArgs(client, diagnostics));

  assert(client.calls === 2, "transient failure is retried exactly once");
  assert(result.answer.includes("NIRC Sec. 57"), "successful retry returns generated answer");
  assert(diagnostics[0].status === "success", "diagnostic record ends as success");
  assert(diagnostics[0].retrySucceeded === true, "diagnostic marks retry success");
  assert(diagnostics[0].attempts.length === 2, "diagnostic records both attempts");
});

await group("simulated ERR_STREAM_PREMATURE_CLOSE fails after retry", async () => {
  const diagnostics = [];
  const client = fakeOpenAi([transientError(), transientError()]);
  let thrown = null;

  try {
    await callOpenAIWithOrchestration(baseArgs(client, diagnostics));
  } catch (error) {
    thrown = error;
  }

  assert(client.calls === 2, "transient failure is attempted twice total");
  assert(thrown?.code === "ERR_STREAM_PREMATURE_CLOSE", "original transient error is rethrown after retry exhaustion");
  assert(diagnostics[0].status === "error", "diagnostic record ends as error");
  assert(diagnostics[0].retryExhausted === true, "diagnostic marks retry exhaustion");
});

await group("no retry for non-transient errors", async () => {
  const diagnostics = [];
  const client = fakeOpenAi([modelNotFoundError()]);
  let thrown = null;

  try {
    await callOpenAIWithOrchestration(baseArgs(client, diagnostics));
  } catch (error) {
    thrown = error;
  }

  assert(client.calls === 1, "model_not_found is not retried");
  assert(thrown?.code === "model_not_found", "non-transient error is surfaced");
  assert(diagnostics[0].retryExhausted !== true, "non-transient error does not mark retry exhaustion");
});

await group("normal successful generation is unchanged", async () => {
  const diagnostics = [];
  const client = fakeOpenAi([
    {
      choices: [{ message: { content: "Normal answer." } }],
      usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 }
    }
  ]);

  const result = await callOpenAIWithOrchestration(baseArgs(client, diagnostics));

  assert(client.calls === 1, "normal success makes one OpenAI call");
  assert(result.answer === "Normal answer.", "normal answer is preserved");
  assert(diagnostics[0].retrySucceeded !== true, "normal success does not set retry success flag");
});

group("fallback text and source preservation wiring", () => {
  assert(
    PIPELINE_SRC.includes("TINA retrieved indexed legal sources, but the answer-generation request failed due to a temporary model connection issue. Please retry the question."),
    "pipeline fallback uses improved temporary connection wording"
  );
  assert(
    PIPELINE_SRC.includes("Governing indexed authority was retrieved: ${sourceLabels.join(\", \")}."),
    "fallback still preserves retrieved authority labels"
  );
  assert(
    PIPELINE_SRC.includes("Please use the source cards shown with this response to review the retrieved governing authority."),
    "fallback still directs user to preserved source cards"
  );
  assert(
    ORCHESTRATION_SRC.includes("[PATCH_027U_OPENAI_TRANSIENT_RETRY]"),
    "retry diagnostic marker is present"
  );
});

console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-027U  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const failure of failures) console.log(`  - ${failure}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
