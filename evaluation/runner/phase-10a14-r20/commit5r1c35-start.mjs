import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import {
  RESULTS,
  extractPublicState,
  hashRecord,
  requirePreflight,
  sanitize,
  writeJsonOnce
} from "./commit5r1c35-lib.mjs";

const EXPECTED_FRONTEND = "https://app.tina.bentoph.com/";
const EXPECTED_BACKEND = "https://tina-backend-y11x.onrender.com";
const QUESTION = "tell me more about VAT";

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`C35_REQUIRED_ENV_MISSING:${name}`);
  return value;
}

async function requestJson(url, init, timeoutMs = 180_000) {
  const started = Date.now();
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { nonJsonResponse: true, text: text.slice(0, 2000) };
  }
  return {
    url,
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - started,
    body
  };
}

async function captureLive() {
  const { identity: preflightIdentity } = requirePreflight();
  const askUrl = required("TINA_PRODUCTION_ASK_URL");
  const parsedAsk = new URL(askUrl);
  const backend = `${parsedAsk.protocol}//${parsedAsk.host}`;
  if (backend !== EXPECTED_BACKEND || parsedAsk.pathname !== "/ask") {
    throw new Error("C35_PRODUCTION_ENDPOINT_MISMATCH");
  }

  const username = required("TINA_STAGING_TEST_USERNAME");
  const password = required("TINA_STAGING_TEST_PASSWORD");
  const capturedUtc = new Date().toISOString();

  const health = await requestJson(`${backend}/health`, { method: "GET" }, 60_000);
  const login = await requestJson(`${backend}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  }, 90_000);
  if (!login.ok || !login.body?.token) {
    throw new Error(`C35_PRODUCTION_LOGIN_FAILED:${login.status}`);
  }

  const authorization = `Bearer ${login.body.token}`;
  const conversation = await requestJson(`${backend}/conversations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization
    },
    body: JSON.stringify({ title: "C35 VAT live reproduction" })
  }, 90_000);
  const conversationId =
    conversation.body?.conversation?.id
    || conversation.body?.conversation?.conversationId
    || null;
  if (!conversation.ok || !conversationId) {
    throw new Error(`C35_PRODUCTION_CONVERSATION_FAILED:${conversation.status}`);
  }

  const requestBody = {
    question: QUESTION,
    cleanQuestion: QUESTION,
    detectedCommand: null,
    conversationId
  };
  const ask = await requestJson(askUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization,
      "x-tina-runtime-identity": "1"
    },
    body: JSON.stringify(requestBody)
  });

  const sanitizedBody = sanitize(ask.body);
  const apiFile = path.join(
    RESULTS,
    "COMMIT_5R1C35_VAT_API_RESPONSE_SANITIZED.json"
  );
  const apiArtifact = writeJsonOnce(apiFile, {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    capturedUtc,
    frontendUrl: EXPECTED_FRONTEND,
    backendUrl: backend,
    endpoint: "/ask",
    request: {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer [REDACTED]",
        "x-tina-runtime-identity": "1"
      },
      body: {
        ...requestBody,
        conversationId: "[REDACTED_FRESH_CONVERSATION_ID]"
      }
    },
    response: {
      status: ask.status,
      ok: ask.ok,
      durationMs: ask.durationMs,
      body: sanitizedBody
    }
  });

  const publicState = extractPublicState(ask.body);
  const reproductionFile = path.join(
    RESULTS,
    "COMMIT_5R1C35_VAT_LIVE_REPRODUCTION.json"
  );
  const reproductionArtifact = writeJsonOnce(reproductionFile, {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    capturedUtc,
    evidenceOrder: "LIVE_EVIDENCE_FIRST",
    frontendUrl: EXPECTED_FRONTEND,
    backendUrl: backend,
    query: QUESTION,
    userVisiblePath: {
      loginStatus: login.status,
      conversationCreateStatus: conversation.status,
      askStatus: ask.status,
      sameRequestContractAsFrontend: true,
      semanticQueryCount: 1
    },
    health: {
      status: health.status,
      body: sanitize(health.body)
    },
    publicState,
    observedDefect: {
      potentialConflict:
        publicState.conflictState === "POTENTIAL_CONFLICT",
      relatedAuthorityOnly:
        publicState.authoritySupport === "RELATED_AUTHORITY_ONLY",
      combined:
        publicState.conflictState === "POTENTIAL_CONFLICT"
        && publicState.authoritySupport === "RELATED_AUTHORITY_ONLY"
    },
    rawApiResponse: apiArtifact,
    preflight: preflightIdentity,
    secretsStored: false,
    pass: ask.ok
  });

  const runtimeFile = path.join(
    RESULTS,
    "COMMIT_5R1C35_VAT_RUNTIME_IDENTITY.json"
  );
  const runtimeArtifact = writeJsonOnce(runtimeFile, {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    capturedUtc,
    runtimeIdentity: publicState.runtimeIdentity,
    expectedCommittedC34Head:
      "d5b25e676f623fbc1888608ff250824fcd34af99",
    c34SelectedSemanticRuntime:
      "73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775",
    c34TrackedHeadServiceRuntime:
      "7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201",
    exactCommitMatch:
      publicState.runtimeIdentity?.runtimeCommit
      === "d5b25e676f623fbc1888608ff250824fcd34af99",
    semanticRuntimeDeploymentProven: false,
    reason:
      "A deployed Git commit identity does not prove installation of the isolated C34 selected semantic snapshot.",
    pass: Boolean(publicState.runtimeIdentity?.runtimeCommit)
  });

  const adjudicationFile = path.join(
    RESULTS,
    "COMMIT_5R1C35_DEPLOYMENT_IDENTITY_ADJUDICATION.json"
  );
  const adjudicationArtifact = writeJsonOnce(adjudicationFile, {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: new Date().toISOString(),
    liveRuntimeCommit:
      publicState.runtimeIdentity?.runtimeCommit ?? null,
    liveRuntimeCommitSource:
      publicState.runtimeIdentity?.runtimeCommitSource ?? null,
    liveDeploymentServiceIdentity:
      publicState.runtimeIdentity?.deploymentId ?? null,
    expectedCommittedC34Head:
      "d5b25e676f623fbc1888608ff250824fcd34af99",
    selectedC34SemanticRuntime:
      "73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775",
    trackedHeadServiceRuntime:
      "7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201",
    classification:
      publicState.runtimeIdentity?.runtimeCommit
        === "d5b25e676f623fbc1888608ff250824fcd34af99"
        ? "LIVE_GIT_COMMIT_MATCH_SEMANTIC_RUNTIME_NOT_DEPLOYED"
        : "LIVE_GIT_COMMIT_LAG_OR_MISMATCH",
    deploymentLagAtGitCommitLevel:
      publicState.runtimeIdentity?.runtimeCommit
      !== "d5b25e676f623fbc1888608ff250824fcd34af99",
    semanticRuntimeDeploymentLag: true,
    rationale: [
      "The C34 selected runtime exists in an immutable attempt snapshot.",
      "C34 records liveServicesWereSemanticBase=false.",
      "The deployed application starts the tracked root server and services.",
      "The tracked root service digest differs from the selected C34 semantic runtime."
    ],
    deploymentChanged: false,
    pass: Boolean(publicState.runtimeIdentity?.runtimeCommit)
  });

  console.log(JSON.stringify({
    status: "C35_LIVE_CAPTURE_COMPLETE",
    askStatus: ask.status,
    askDurationMs: ask.durationMs,
    conflictState: publicState.conflictState,
    hasConflict: publicState.hasConflict,
    authoritySupport: publicState.authoritySupport,
    sourceState: publicState.sourceState,
    displayedSourceCount: publicState.displayedSourceCount,
    runtimeCommit: publicState.runtimeIdentity?.runtimeCommit ?? null,
    artifacts: [
      apiArtifact,
      reproductionArtifact,
      runtimeArtifact,
      adjudicationArtifact
    ]
  }, null, 2));
}

const command = process.argv[2];
if (command !== "capture-live") {
  throw new Error("Usage: node commit5r1c35-start.mjs capture-live");
}
await captureLive();

