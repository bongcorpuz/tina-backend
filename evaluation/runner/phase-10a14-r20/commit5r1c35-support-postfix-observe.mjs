import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAnswerSupportEvidence } from "../../../services/answer-support-evidence.js";
import {
  buildHostMaterialPropositionInventory,
  evaluateAnswerSupport,
  REQUIRED_NEGATIVE_BOOLEANS,
  REQUIRED_POSITIVE_BOOLEANS
} from "../../../services/answer-support-validator.js";
import { sanitizePublicSourceCard } from "../../../services/ask-handler-public-source-sanitizer.js";

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

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeVerdict(extra = {}) {
  const value = {
    operativeClaim: "The material legal proposition is supported by the bound passage.",
    questionIntent: "A controlled legal explanation.",
    requiredIssueKeys: ["material-proposition-support"],
    missingIssueKeys: [],
    identifiedError: "",
    reason: "The final answer is bound to the exact supporting passage.",
    ...extra
  };
  for (const field of REQUIRED_POSITIVE_BOOLEANS) {
    if (!Object.hasOwn(value, field)) value[field] = true;
  }
  for (const field of REQUIRED_NEGATIVE_BOOLEANS) {
    if (!Object.hasOwn(value, field)) value[field] = false;
  }
  return value;
}

function rejectingVerdict(extra = {}) {
  return safeVerdict({
    propositionSupported: false,
    materiallyComplete: false,
    unsupportedMaterialProposition: true,
    eligibleForVerifiedControlling: false,
    reason: "A material proposition is not supported by the supplied passages.",
    ...extra
  });
}

function mockClient(factory) {
  const calls = [];
  return {
    calls,
    client: {
      chat: {
        completions: {
          async create(request) {
            calls.push(request);
            const value = typeof factory === "function" ? factory(request) : factory;
            return {
              choices: [{ message: { content: JSON.stringify(value) } }]
            };
          }
        }
      }
    }
  };
}

const labelCase = fixture.generalizedCases.find((entry) => entry.id === "G1_LABELS_ONLY_CANNOT_VERIFY");
const labelEvidence = buildAnswerSupportEvidence({
  displayedSources: labelCase.displayedSources,
  retrievedSources: labelCase.retrievedSources
});
const labelMock = mockClient(safeVerdict());
const labelResult = await evaluateAnswerSupport({
  question: labelCase.question,
  answer: labelCase.answer,
  sources: labelEvidence,
  model: "c35-controlled-mock",
  client: labelMock.client
});

const live = fixture.liveObservation;
const publicSourceCardsBefore = JSON.stringify(live.publicSourceCards);
const liveEvidence = buildAnswerSupportEvidence({
  displayedSources: live.publicSourceCards,
  retrievedSources: live.retrievedPassages.map((entry) => ({
    citation: entry.citation,
    text: entry.text
  }))
});
const liveMock = mockClient(safeVerdict());
const liveResult = await evaluateAnswerSupport({
  question: live.question,
  answer: live.answer,
  sources: liveEvidence,
  model: "c35-controlled-mock",
  client: liveMock.client
});

const supported = fixture.generalizedCases.find((entry) => entry.id === "G4_QUALIFIED_INPUT_VAT_SUPPORTED");
const supportedEvidence = buildAnswerSupportEvidence({
  displayedSources: supported.displayedSources,
  retrievedSources: supported.retrievedSources
});
const supportedAnswer =
  "Under NIRC Section 110, input tax on a domestic purchase of goods by a VAT-registered purchaser is creditable upon consummation of the sale. Under RR 16-2005 Section 4.110-4, an input tax that cannot be directly attributed must be prorated, and only the ratable portion pertaining to a transaction subject to VAT may be recognized as an input tax credit.";
const supportedInventory = buildHostMaterialPropositionInventory(supportedAnswer);
if (supportedInventory.overflow || supportedInventory.items.length !== 2) {
  throw new Error("controlled supported proposition inventory drifted");
}
const supportedVerdict = safeVerdict({
  answerSha256: sha256(supportedAnswer),
  materialPropositionCount: 2,
  supportedMaterialPropositionCount: 2,
  materialPropositionBindings: [
    {
      hostPropositionId: supportedInventory.items[0].id,
      hostPropositionSha256: supportedInventory.items[0].propositionSha256,
      answerQuote: supportedInventory.items[0].exactQuote,
      sourceCitation: supportedEvidence[0].citation,
      passageSha256: supportedEvidence[0].passages[0].passageSha256,
      passageQuote:
        "The input tax on domestic purchase or importation of goods or properties by a VAT-registered person shall be creditable to the purchaser upon consummation of sale"
    },
    {
      hostPropositionId: supportedInventory.items[1].id,
      hostPropositionSha256: supportedInventory.items[1].propositionSha256,
      answerQuote: supportedInventory.items[1].exactQuote,
      sourceCitation: supportedEvidence[1].citation,
      passageSha256: supportedEvidence[1].passages[0].passageSha256,
      passageQuote:
        "the input tax shall be pro-rated to the VAT taxable and VAT-exempt transactions and only the ratable portion pertaining to transactions subject to VAT may be recognized for input tax credit"
    }
  ]
});
const supportedMock = mockClient(supportedVerdict);
const supportedResult = await evaluateAnswerSupport({
  question: supported.question,
  answer: supportedAnswer,
  sources: supportedEvidence,
  model: "c35-controlled-mock",
  client: supportedMock.client
});
const supportedPrompt = String(
  supportedMock.calls[0]?.messages?.find((message) => message.role === "user")?.content || ""
);

const narrow = live.retrievedPassages.find((entry) => entry.traceIndex === 5);
const broadEvidence = buildAnswerSupportEvidence({
  displayedSources: [{ label: narrow.citation, citation: narrow.citation, authorityType: "STATUTE" }],
  retrievedSources: [{ citation: narrow.citation, text: narrow.text }]
});
const broadMock = mockClient(rejectingVerdict({
  answerSha256: sha256(live.answer),
  materialPropositionCount: buildHostMaterialPropositionInventory(live.answer).items.length,
  supportedMaterialPropositionCount: 0,
  materialPropositionBindings: []
}));
const broadResult = await evaluateAnswerSupport({
  question: live.question,
  answer: live.answer,
  sources: broadEvidence,
  model: "c35-controlled-mock",
  client: broadMock.client
});
const broadPrompt = String(
  broadMock.calls[0]?.messages?.find((message) => message.role === "user")?.content || ""
);
const labelsPass =
  labelResult.verifiedEligible === false &&
  labelResult.stage === "passage-source-sufficiency" &&
  labelMock.calls.length === 0;
const livePass =
  liveResult.verifiedEligible === false &&
  liveResult.stage === "passage-source-sufficiency" &&
  liveMock.calls.length === 0;
const supportedPass =
  supportedResult.verifiedEligible === true &&
  supportedResult.passageBinding?.valid === true &&
  supportedPrompt.includes(supportedAnswer) &&
  supportedPrompt.includes(supported.retrievedSources[0].text) &&
  supportedPrompt.includes(supported.retrievedSources[1].text);
const broadPass =
  broadResult.verifiedEligible === false &&
  broadResult.stage === "llm" &&
  broadPrompt.includes(live.unsupportedMaterialProposition) &&
  broadPrompt.includes(narrow.text);
const publicSourceShapeChanged =
  JSON.stringify(live.publicSourceCards) !== publicSourceCardsBefore ||
  live.publicSourceCards.some((card) => Object.hasOwn(card, "passages") || Object.hasOwn(card, "text"));
const sanitizedEvidenceCards = liveEvidence.map((entry) => sanitizePublicSourceCard(entry));
const privatePassageLeakedToPublicShape = sanitizedEvidenceCards.some((card) =>
  live.retrievedPassages.some((entry) => JSON.stringify(card).includes(entry.text))
);
const conflictEngineTouchedByCandidate2 =
  sha256(fs.readFileSync(path.join(repo, "conflict-engine.js"))) !==
  "a37f41c01b3be16fb992f206f93dca67c8a5cbc79930997b416feaa5c7851e7d";
const aggregatePass =
  labelsPass &&
  livePass &&
  supportedPass &&
  broadPass &&
  !publicSourceShapeChanged &&
  !privatePassageLeakedToPublicShape &&
  !conflictEngineTouchedByCandidate2;

console.log(JSON.stringify({
  schemaVersion: 1,
  unit: fixture.unit,
  observation: "POST_FIX_CANDIDATE_2",
  fixture: {
    path: path.relative(repo, fixturePath).replaceAll("\\", "/"),
    bytes: fixtureBytes.length,
    sha256: sha256(fixtureBytes)
  },
  labelsOnly: {
    result: labelResult,
    clientCalls: labelMock.calls.length,
    pass: labelsPass
  },
  exactLiveVatPacket: {
    result: liveResult,
    clientCalls: liveMock.calls.length,
    unmatchedDisplayedAuthorities: liveEvidence
      .filter((entry) => entry.passages.length === 0)
      .map((entry) => entry.citation),
    broadInputVatStatementPromoted: liveResult.verifiedEligible === true,
    pass: livePass
  },
  supportedQualifiedInputVat: {
    frozenFixtureAnswerUsedAsPositiveControl: false,
    fixtureAnswerAdjudication:
      "The frozen G4 wording mentions invoicing and other limits without a Section 113 passage; the controlled positive narrows each proposition to the supplied Section 110 and RR 4.110-4 passages.",
    controlledAnswer: supportedAnswer,
    result: supportedResult,
    clientCalls: supportedMock.calls.length,
    promptSha256: sha256(supportedPrompt),
    promptContainsExactFinalAnswer: supportedPrompt.includes(supportedAnswer),
    promptContainsExactNirc110Passage: supportedPrompt.includes(supported.retrievedSources[0].text),
    promptContainsExactRrPassage: supportedPrompt.includes(supported.retrievedSources[1].text),
    pass: supportedPass
  },
  broadInputVatNarrowPassage: {
    result: broadResult,
    clientCalls: broadMock.calls.length,
    promptSha256: sha256(broadPrompt),
    promptContainsBroadClaim: broadPrompt.includes(live.unsupportedMaterialProposition),
    promptContainsNarrowPassage: broadPrompt.includes(narrow.text),
    pass: broadPass
  },
  publicSourceShapeChanged,
  privatePassageLeakedToPublicShape,
  conflictEngineTouchedByCandidate2,
  verdict: "POST_FIX_GENERALIZED_PASSAGE_BINDING_CONTRACT_PASSES",
  pass: aggregatePass
}, null, 2));
