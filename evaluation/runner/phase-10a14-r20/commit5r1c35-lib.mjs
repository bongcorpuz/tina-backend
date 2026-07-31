import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const REPO = path.resolve(import.meta.dirname, "../../..");
export const RESULTS = path.join(REPO, "evaluation", "results", "phase-10a14-r20");
export const FIXTURES = path.join(REPO, "evaluation", "fixtures", "phase-10a14-r20");
export const PREFLIGHT = path.join(RESULTS, "COMMIT_5R1C35_GOVERNED_START_PREFLIGHT.json");

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashRecord(file) {
  const bytes = fs.readFileSync(file);
  return {
    path: path.relative(REPO, file).replaceAll("\\", "/"),
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

export function writeJsonOnce(file, value) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file);
    if (!existing.equals(bytes)) {
      throw new Error(`C35_WRITE_ONCE_MISMATCH:${path.basename(file)}`);
    }
    return { ...hashRecord(file), created: false };
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes, { flag: "wx" });
  return { ...hashRecord(file), created: true };
}

export function writeTextOnce(file, value) {
  const bytes = Buffer.from(value.endsWith("\n") ? value : `${value}\n`);
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file);
    if (!existing.equals(bytes)) {
      throw new Error(`C35_WRITE_ONCE_MISMATCH:${path.basename(file)}`);
    }
    return { ...hashRecord(file), created: false };
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes, { flag: "wx" });
  return { ...hashRecord(file), created: true };
}

const SENSITIVE_KEY = /^(?:authorization|cookie|set-cookie|token|accessToken|refreshToken|password|email|mobile|username|userId|conversationId|sessionId|messageId|requestId)$/i;

export function sanitize(value, key = "") {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        sanitize(childValue, childKey)
      ])
    );
  }
  if (typeof value === "string") {
    return value
      .replace(/\bBearer\s+[A-Za-z0-9._~-]+\b/gi, "Bearer [REDACTED]")
      .replace(
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
        "[REDACTED_UUID]"
      );
  }
  return value;
}

export function requirePreflight() {
  const preflight = readJson(PREFLIGHT);
  if (
    preflight.verdict !== "PASS_READY_TO_INITIALIZE_C35"
    || preflight.pass !== true
    || preflight.git?.head !== "d5b25e676f623fbc1888608ff250824fcd34af99"
    || preflight.checkpoint60?.ordinal !== 60
    || preflight.checkpoint60?.safeToResume !== true
    || preflight.checkpoint60?.activeAttemptId != null
  ) {
    throw new Error("C35_START_CONTINUITY_MISMATCH");
  }
  return { preflight, identity: hashRecord(PREFLIGHT) };
}

export function pickSourceCards(body) {
  const cards = Array.isArray(body?.sourceCards)
    ? body.sourceCards
    : Array.isArray(body?.sources)
      ? body.sources
      : [];
  return cards.map((card) => sanitize(card));
}

export function extractPublicState(body) {
  const trust = body?.trust && typeof body.trust === "object" ? body.trust : {};
  return {
    responseType: body?.responseType ?? null,
    responseMode: body?.responseMode ?? null,
    sourceOnlyFallback: body?.sourceOnlyFallback === true,
    retrievedSourceCount: body?.retrievedSourceCount ?? null,
    displayedSourceCount: body?.displayedSourceCount ?? null,
    sourceStatus: body?.sourceStatus ?? null,
    sourceAvailability: body?.sourceAvailability ?? null,
    saeStatus: body?.saeStatus ?? null,
    trust: sanitize(trust),
    conflictState: trust.conflictState ?? null,
    hasConflict: trust.hasConflict ?? null,
    authoritySupport: trust.authoritySupport ?? null,
    sourceState: trust.sourceState ?? null,
    answerSupport: sanitize(body?.answerSupport ?? null),
    runtimeIdentity: sanitize(body?.runtimeIdentity ?? null),
    answer: sanitize(body?.answer ?? ""),
    sourceCards: pickSourceCards(body)
  };
}

