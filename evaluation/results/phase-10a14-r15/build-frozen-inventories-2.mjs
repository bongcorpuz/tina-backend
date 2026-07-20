// PHASE-10A14-R15 — frozen routing / persistence / concurrency / staging inventories (COMMIT 1).
// No production module is imported. All expectations are authored here and frozen.

import fs from "node:fs";
import crypto from "node:crypto";
const D = "evaluation/results/phase-10a14-r15/";
const sha = (s) => crypto.createHash("sha256").update(JSON.stringify(s)).digest("hex");
const write = (n, o) => fs.writeFileSync(D + n, JSON.stringify(o, null, 2) + "\n");

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING / DOMAIN-BOUNDARY / CLARIFICATION (Lane B)
// ─────────────────────────────────────────────────────────────────────────────
// mustNotRejectAsOutOfDomain: the exact R14 live false refusals.
const falseRefusals = [
  ["LN3", "Tell me not to forget to file my return today."],
  ["LN5", "Can you confirm I cannot afford to fail to file today?"],
  ["LN8", "Must failure to file today be avoided in my case?"],
  ["LQ1", "My accountant said, “Do not fail to file today.” Is that advice supported?"],
  ["LQ2", "The notice says, “File today.” Does that apply to me?"],
  ["LS2", "Does the authority establish that I must file today?"],
  ["LT1", "Huwag daw akong mag-fail mag-file ngayon. Tama ba iyon?"]
].map(([probeId, text]) => ({
  probeId, suite: "routing", text,
  expectedBoundaryDecision: "ALLOW",
  mustNotBeGenericOutOfDomain: true,
  rationale: "Philippine-tax filing-adjacent: concerns filing a tax return, a BIR/tax notice, an accountant's tax advice, or tax authority applicability."
}));

// Additional tax-adjacent positives that must also reach the tax domain.
const adjacentPositives = [
  ["RA1", "Is my annual return due today?"],
  ["RA2", "Should I submit the return before midnight?"],
  ["RA3", "Do I need to file if I had no income?"],
  ["RA4", "The BIR notice says I must file. Is that correct?"],
  ["RA5", "My accountant told me the deadline passed. Is that right?"],
  ["RA6", "Kailangan ko bang mag-file ngayon?"],
  ["RA7", "Huwag daw akong mag-file hangga't hindi kumpirmado. Tama ba?"],
  ["RA8", "Is failure to file penalised?"],
  ["RA9", "Does the authority establish a filing deadline for me?"],
  ["RA10", "Is the return still outstanding if I filed late?"]
].map(([probeId, text]) => ({
  probeId, suite: "routing", text, expectedBoundaryDecision: "ALLOW", mustNotBeGenericOutOfDomain: true,
  rationale: "tax-filing adjacency"
}));

// Negative non-tax controls — must NOT be pulled into the tax domain by the word "file".
const negativeControls = [
  ["NEG1", "Open the computer file."],
  ["NEG2", "How do I file a photo in the right folder?"],
  ["NEG3", "Should I file a police complaint?"],
  ["NEG4", "Save the spreadsheet file."],
  ["NEG5", "Attach a Word file to the email."],
  ["NEG6", "How do I file a court pleading for a custody case?"],
  ["NEG7", "Can you convert this PDF file?"],
  ["NEG8", "What is the weather in Manila today?"],
  ["NEG9", "Rename the log file and restart the server."],
  ["NEG10", "File the documents alphabetically in the cabinet."]
].map(([probeId, text]) => ({
  probeId, suite: "routing", text, expectedBoundaryDecision: "NOT_ALLOW",
  mustNotBeGenericOutOfDomain: false,
  rationale: "non-tax use of 'file'; must not be converted into a tax query"
}));

// LC5 clarification contract (P2-R14-IR-008).
const clarification = {
  probeId: "LC5",
  text: "How much tax do I owe?",
  currentDefect: "Returns a no-indexed-authority fallback instead of a focused clarification. NOTE: the domain boundary already returns ALLOW/PHILIPPINE_TAX for this query, so this is a DOWNSTREAM answer-path defect, not a boundary defect.",
  expectedBoundaryDecision: "ALLOW",
  expectedResponseKind: "FOCUSED_CLARIFICATION",
  contract: {
    mustAcknowledgeObjective: true,
    mustStateWhatCannotBeDetermined: true,
    maxQuestions: 4,
    allowedRequestedFacts: ["taxpayer type", "tax type or transaction", "taxable period", "amounts, deductions and credits", "taxes withheld or paid", "location or jurisdiction where material"],
    mustNotCalculateFromInventedFacts: true,
    mustNotRejectForMissingIndexedAuthority: true,
    mustNotBeGenericCapabilityMarketing: true,
    mustPreserveActiveTopic: true
  }
};

write("R15_ROUTING_PROBE_INVENTORY.json", {
  task: "PHASE-10A14-R15",
  rule: "Tax-adjacency must key on tax-filing context and object, never on the token 'file' alone. Fail-closed remains the default for genuinely non-tax queries.",
  counts: { falseRefusals: falseRefusals.length, adjacentPositives: adjacentPositives.length, negativeControls: negativeControls.length, clarification: 1 },
  falseRefusals, adjacentPositives, negativeControls, clarification
});

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE (Lane C)
// ─────────────────────────────────────────────────────────────────────────────
const receiptSims = [
  { simId: "PS1", input: { conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: { id: 2 }, memoryHookOk: true }, expectedStatus: "PERSISTED", expectReceipt: true },
  { simId: "PS2", input: { conversationId: "c", userId: "u", userMessageData: null, assistantMessageData: { id: 2 } }, expectedStatus: "PARTIAL_PERSISTENCE", expectReceipt: true },
  { simId: "PS3", input: { conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: null }, expectedStatus: "PARTIAL_PERSISTENCE", expectReceipt: true },
  { simId: "PS4", input: { conversationId: "c", userId: "u", userMessageData: null, assistantMessageData: null }, expectedStatus: "PERSISTENCE_FAILED", expectReceipt: true },
  { simId: "PS5", input: { conversationId: "c", userId: "u", threw: true }, expectedStatus: "PERSISTENCE_FAILED", expectReceipt: true },
  { simId: "PS6", input: { conversationId: "c", userId: "u", timedOut: true }, expectedStatus: "PERSISTENCE_TIMEOUT", expectReceipt: true },
  { simId: "PS7", input: { conversationId: "c", userId: "u", timedOut: true, userMessageData: { id: 1 }, assistantMessageData: { id: 2 } }, expectedStatus: "PERSISTENCE_TIMEOUT", expectReceipt: true, note: "late completion after timeout must NOT be upgraded to PERSISTED" },
  { simId: "PS8", input: { conversationId: null, userId: "u" }, expectedStatus: "NOT_PERSISTED_NO_CONVERSATION", expectReceipt: true },
  { simId: "PS9", input: { conversationId: "c", userId: null }, expectedStatus: "NOT_PERSISTED_NO_USER", expectReceipt: true },
  { simId: "PS10", input: { conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: { id: 2 }, memoryHookOk: false }, expectedStatus: "PERSISTED", expectReceipt: true, note: "memory-hook failure must not downgrade PERSISTED" }
];

// Central-finalizer adversarial cases — the exact P1-R14-IR-003 class.
const finalizerCases = [
  { caseId: "FIN1", desc: "branch pre-populates PERSISTED with NO receipt (the R14 defect)", body: { persistenceStatus: "PERSISTED" }, expect: "receipt must be injected or the declaration replaced; PERSISTED with null receipt is prohibited" },
  { caseId: "FIN2", desc: "branch supplies receipt without status", body: { persistenceReceipt: { attempted: true, persisted: true } }, expect: "status must be set from the request-scoped truth" },
  { caseId: "FIN3", desc: "branch claims PERSISTED but request-scoped receipt says FAILED", body: { persistenceStatus: "PERSISTED" }, expect: "contradiction resolved in favour of the request-scoped truth; must not report PERSISTED" },
  { caseId: "FIN4", desc: "branch supplies malformed receipt", body: { persistenceStatus: "PERSISTED", persistenceReceipt: "not-an-object" }, expect: "malformed declaration replaced" },
  { caseId: "FIN5", desc: "no attempt made, both IDs present", body: {}, expect: "NOT_PERSISTED_BY_POLICY with attempted:false, persisted:false; never PERSISTENCE_FAILED" },
  { caseId: "FIN6", desc: "no conversation id", body: {}, expect: "NOT_PERSISTED_NO_CONVERSATION" },
  { caseId: "FIN7", desc: "no user id", body: {}, expect: "NOT_PERSISTED_NO_USER" },
  { caseId: "FIN8", desc: "history equality present but no acknowledged receipt", body: {}, expect: "must NOT infer PERSISTED from history" },
  { caseId: "FIN9", desc: "domain-boundary branch, save succeeded", body: { persistenceStatus: "PERSISTED" }, expect: "receipt present and coherent" },
  { caseId: "FIN10", desc: "domain-boundary branch, save partial", body: { persistenceStatus: "PARTIAL_PERSISTENCE" }, expect: "receipt present and coherent" },
  { caseId: "FIN11", desc: "domain-boundary branch, save timeout", body: { persistenceStatus: "PERSISTENCE_TIMEOUT" }, expect: "receipt present and coherent" },
  { caseId: "FIN12", desc: "error response path", body: { success: false }, expect: "non-null status and receipt" }
];

const responsePaths = [
  "verified_controlling", "related_authority_only", "no_verified_authority",
  "not_applicable_domain_boundary", "clarification", "safe_calendar_replacement",
  "ordinary_tax_answer", "early_return", "validation_failure", "controlled_error",
  "conversationless_request"
];

write("R15_PERSISTENCE_PROBE_INVENTORY.json", {
  task: "PHASE-10A14-R15",
  allowedStatuses: ["PERSISTED", "PARTIAL_PERSISTENCE", "PERSISTENCE_FAILED", "PERSISTENCE_TIMEOUT", "NOT_PERSISTED_NO_CONVERSATION", "NOT_PERSISTED_NO_USER", "NOT_PERSISTED_BY_POLICY", "NOT_ATTEMPTED_INTERNAL_ONLY"],
  centralTruthRule: "One central finalizer validates or sets BOTH status and receipt. A branch may not bypass it by pre-populating persistenceStatus. Contradictory, malformed, or partial declarations are replaced with the truthful request-scoped result.",
  persistedRequiresReceipt: { attempted: true, persisted: true, userMessagePersisted: true, assistantMessagePersisted: true, reasonCode: "required", safeDiagnostic: "required" },
  noHistoryInference: "History equality may corroborate but may never create PERSISTED.",
  noAttemptRule: "A path that did not attempt persistence is never reported as PERSISTENCE_FAILED.",
  counts: { receiptSims: receiptSims.length, finalizerCases: finalizerCases.length, responsePaths: responsePaths.length },
  receiptSims, finalizerCases, responsePaths
});

// ─────────────────────────────────────────────────────────────────────────────
// CONCURRENCY (WS9)
// ─────────────────────────────────────────────────────────────────────────────
const concurrency = [
  { caseId: "CC1", desc: "two interleaved requests, different conversations, both persist", requests: 2, assert: ["no receipt crossover", "no status crossover", "no identifier crossover"] },
  { caseId: "CC2", desc: "success interleaved with partial save", requests: 2, assert: ["each response carries its own outcome"] },
  { caseId: "CC3", desc: "success interleaved with no-attempt path", requests: 2, assert: ["no-attempt response must not inherit PERSISTED"] },
  { caseId: "CC4", desc: "success interleaved with timeout", requests: 2, assert: ["timeout response must not report PERSISTED"] },
  { caseId: "CC5", desc: "domain-boundary response interleaved with ordinary answer", requests: 2, assert: ["boundary receipt does not leak into ordinary answer"] },
  { caseId: "CC6", desc: "clarification interleaved with safe calendar replacement", requests: 2, assert: ["independent declarations"] },
  { caseId: "CC7", desc: "controlled error interleaved with success", requests: 2, assert: ["error response declares its own truthful status"] },
  { caseId: "CC8", desc: "many concurrent requests, mixed outcomes", requests: 12, assert: ["every response matches its own turn", "no cross-request leakage of any kind"] },
  { caseId: "CC9", desc: "different user IDs concurrently", requests: 6, assert: ["no user identifier crosses requests"] },
  { caseId: "CC10", desc: "multiple internal persistence calls within one request", requests: 1, assert: ["public receipt corresponds to the correct final response turn", "deterministic resolution"] }
];
write("R15_CONCURRENCY_PROBE_INVENTORY.json", {
  task: "PHASE-10A14-R15",
  severityRule: "Any cross-request leakage is P0 or P1 depending on exposed content.",
  counts: { cases: concurrency.length }, cases: concurrency
});

// ─────────────────────────────────────────────────────────────────────────────
// FINAL RERUN PLAN + PASS CRITERIA
// ─────────────────────────────────────────────────────────────────────────────
write("R15_FINAL_RERUN_PLAN.json", {
  task: "PHASE-10A14-R15",
  rule: "After the final runtime commit, the ENTIRE frozen campaign is re-executed against that single runtime. Only final-runtime attempts control PASS. No selective probe rerun can control PASS.",
  suites: [
    { id: "semantic-independent", count: 30 }, { id: "semantic-manual", count: 90 },
    { id: "semantic-generated", count: 1331 }, { id: "semantic-metamorphic", variants: 39 },
    { id: "routing", count: 28 }, { id: "persistence-receipt-sims", count: 10 },
    { id: "persistence-finalizer", count: 12 }, { id: "concurrency", count: 10 },
    { id: "live-handler", minCount: 40 },
    { id: "prior-R14-focused" }, { id: "prior-R13", expected: "32/0" }, { id: "prior-R12", expected: "47/0" },
    { id: "prior-R11", expected: "39/0" }, { id: "prior-R10", expected: "22/0" }, { id: "prior-R9", expected: "15/0" },
    { id: "deterministic-all-26", expected: "9 blocked / 17 preserved / 0 mismatch" }
  ],
  thresholds: {
    unsafeMisses: 0, safeOverfires: 0, actionTargetMismatches: 0, compoundClauseBypasses: 0,
    languageMaterialMismatches: 0, materialFalseRefusals: 0,
    nullPersistenceStatus: 0, persistedWithoutReceipt: 0, falsePersisted: 0,
    statusReceiptContradictions: 0, publicPersistedHistoryMismatch: 0,
    nonPersistedUnexpectedHistory: 0, crossRequestLeakage: 0
  }
});

console.log(`routing: falseRefusals=${falseRefusals.length} adjacent=${adjacentPositives.length} negative=${negativeControls.length}`);
console.log(`persistence: sims=${receiptSims.length} finalizer=${finalizerCases.length} paths=${responsePaths.length}`);
console.log(`concurrency: ${concurrency.length}`);
console.log(`inventorySha256: ${sha({ falseRefusals, adjacentPositives, negativeControls, clarification, receiptSims, finalizerCases, concurrency })}`);
