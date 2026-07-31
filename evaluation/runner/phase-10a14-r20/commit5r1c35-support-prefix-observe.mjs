import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  evaluateAnswerSupport,
  REQUIRED_POSITIVE_BOOLEANS,
  REQUIRED_NEGATIVE_BOOLEANS
} from "../../../services/answer-support-validator.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..", "..");
const fixturePath = path.join(
  repo,
  "evaluation",
  "fixtures",
  "phase-10a14-r20",
  "commit5r1c35-answer-support-passage-binding.json"
);
const fixtureBytes = fs.readFileSync(fixturePath);
const fixture = JSON.parse(fixtureBytes);
const case1 = fixture.generalizedCases.find((entry) => entry.id === "G1_LABELS_ONLY_CANNOT_VERIFY");
const live = fixture.liveObservation;
const calls = [];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeVerdict() {
  const verdict = {
    operativeClaim: "The answer states a governing tax treatment.",
    questionIntent: "A general explanation of the treatment.",
    requiredIssueKeys: ["treatment"],
    missingIssueKeys: [],
    identifiedError: "",
    reason: "Mock approval used only to expose whether the runtime can verify from labels without passages."
  };
  for (const field of REQUIRED_POSITIVE_BOOLEANS) verdict[field] = true;
  for (const field of REQUIRED_NEGATIVE_BOOLEANS) verdict[field] = false;
  return verdict;
}

const client = {
  chat: {
    completions: {
      async create(request) {
        calls.push(request);
        return {
          choices: [
            {
              message: {
                content: JSON.stringify(safeVerdict())
              }
            }
          ]
        };
      }
    }
  }
};

const labelOnlyResult = await evaluateAnswerSupport({
  question: case1.question,
  answer: case1.answer,
  sources: case1.displayedSources,
  model: "c35-controlled-mock",
  client
});
const firstPrompt = String(calls[0]?.messages?.find((message) => message.role === "user")?.content || "");

const liveCalls = [];
const liveClient = {
  chat: {
    completions: {
      async create(request) {
        liveCalls.push(request);
        return {
          choices: [
            {
              message: {
                content: JSON.stringify(safeVerdict())
              }
            }
          ]
        };
      }
    }
  }
};
const liveResult = await evaluateAnswerSupport({
  question: live.question,
  answer: live.answer,
  sources: live.publicSourceCards,
  model: "c35-controlled-mock",
  client: liveClient
});
const livePrompt = String(liveCalls[0]?.messages?.find((message) => message.role === "user")?.content || "");
const exactRetrievedPassage = live.retrievedPassages[0].text;

console.log(JSON.stringify({
  schemaVersion: 1,
  unit: fixture.unit,
  observation: "PRE_FIX",
  fixture: {
    path: path.relative(repo, fixturePath).replaceAll("\\", "/"),
    bytes: fixtureBytes.length,
    sha256: sha256(fixtureBytes)
  },
  labelOnlyCase: {
    id: case1.id,
    result: labelOnlyResult,
    clientCalls: calls.length,
    userPrompt: firstPrompt,
    promptContainsSourceCitationsHeading: firstPrompt.includes("SOURCE CITATIONS:"),
    promptContainsSourcePassagesHeading: firstPrompt.includes("SOURCE PASSAGES:"),
    promptContainsAnyPassageField: firstPrompt.includes("PASSAGE 1:"),
    defectReproduced:
      labelOnlyResult.verifiedEligible === true &&
      calls.length === 1 &&
      !firstPrompt.includes("SOURCE PASSAGES:")
  },
  liveVatCase: {
    result: liveResult,
    clientCalls: liveCalls.length,
    finalAnswerSha256: sha256(live.answer),
    validatorPromptSha256: sha256(livePrompt),
    promptContainsExactFinalAnswer: livePrompt.includes(live.answer),
    promptContainsExactRetrievedPassage: livePrompt.includes(exactRetrievedPassage),
    promptContainsBroadInputVatClaim: livePrompt.includes(live.unsupportedMaterialProposition),
    displayedAuthorityWithoutCapturedPassage: live.missingPassageForDisplayedAuthority,
    defectReproduced:
      liveResult.verifiedEligible === true &&
      livePrompt.includes(live.answer) &&
      !livePrompt.includes(exactRetrievedPassage)
  },
  expectedVerdict: "PRE_FIX_GENERALIZED_PASSAGE_BINDING_DEFECT_REPRODUCED",
  pass:
    labelOnlyResult.verifiedEligible === true &&
    liveResult.verifiedEligible === true &&
    !firstPrompt.includes("SOURCE PASSAGES:") &&
    !livePrompt.includes(exactRetrievedPassage)
}, null, 2));
