// FILE: security/cors-policy.js
// PATCH-08S-CORS-STAGING-REMEDIATION-1
//
// Pure, deterministic CORS policy helpers that make staging/production fail
// closed. This module performs NO I/O, prints NO env values, and mutates no
// global state. It only reads the provided `env` object (defaulting to
// process.env) to classify the environment and derive an allowlist.
//
// Security rule (root-cause fix):
//   The previous inline server.js CORS config returned callback(null, true)
//   whenever the allowlist resolved to "*" (the default when CORS_ORIGIN /
//   ALLOWED_ORIGINS were unset), while credentials:true was enabled. That
//   reflected ARBITRARY origins with credentials. Outside local/dev, this
//   module never reflects an unlisted origin and never grants credentialed
//   CORS to an unlisted origin.

"use strict";

const LOCAL_LOOPBACK_RE = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

/**
 * Parse a raw CORS_ORIGIN / ALLOWED_ORIGINS value into an explicit allowlist.
 * Comma-separated; whitespace trimmed; empty entries ignored. "*" is treated
 * as a wildcard REQUEST, not an explicit origin.
 *
 * @param {string|undefined|null} raw
 * @returns {{ wildcard: boolean, origins: string[] }}
 */
export function parseAllowedOrigins(raw) {
  if (raw === undefined || raw === null) return { wildcard: false, origins: [] };
  const text = String(raw).trim();
  if (text === "") return { wildcard: false, origins: [] };
  if (text === "*") return { wildcard: true, origins: [] };

  const origins = text
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .filter((o) => o !== "*");
  const wildcard = text.split(",").map((o) => o.trim()).includes("*");
  return { wildcard, origins };
}

/**
 * Classify whether the runtime is a genuine local development environment.
 * Any Render marker forces a NON-local (production/staging-like) classification
 * so that missing env config fails closed on hosted infrastructure.
 *
 * @param {object} [env=process.env]
 * @returns {boolean}
 */
export function isLocalDevelopmentEnvironment(env = process.env) {
  const e = env || {};
  const renderMarkerPresent = Boolean(
    e.RENDER || e.RENDER_SERVICE_NAME || e.RENDER_EXTERNAL_URL || e.RENDER_INSTANCE_ID
  );
  if (renderMarkerPresent) return false;

  const nodeEnv = String(e.NODE_ENV || "").toLowerCase();
  const appEnv = String(e.APP_ENV || "").toLowerCase();

  if (nodeEnv === "production" || nodeEnv === "staging") return false;
  if (appEnv === "production" || appEnv === "staging") return false;

  // Treat development/test/unset as local. server.js defaults NODE_ENV to
  // "development" when unset, so a bare local checkout is local by default.
  if (appEnv === "development") return true;
  if (nodeEnv === "development" || nodeEnv === "test" || nodeEnv === "") return true;

  // Ambiguous non-local value with no render markers: fail closed (non-local).
  return false;
}

/**
 * Resolve the effective CORS policy from the environment.
 *
 * @param {object} [env=process.env]
 * @returns {{ environmentClass: string, isLocal: boolean, wildcardRequested: boolean, allowlist: string[], credentials: boolean }}
 */
export function resolveCorsPolicy(env = process.env) {
  const e = env || {};
  const isLocal = isLocalDevelopmentEnvironment(e);
  const parsed = parseAllowedOrigins(e.CORS_ORIGIN || e.ALLOWED_ORIGINS);
  return Object.freeze({
    environmentClass: isLocal ? "local" : "production_staging",
    isLocal,
    wildcardRequested: parsed.wildcard || (!parsed.origins.length && !e.CORS_ORIGIN && !e.ALLOWED_ORIGINS),
    allowlist: parsed.origins,
    credentials: true
  });
}

function isLoopbackOrigin(origin) {
  return typeof origin === "string" && LOCAL_LOOPBACK_RE.test(origin);
}

/**
 * Pure origin decision. Never reflects an unlisted origin outside local/dev and
 * never grants credentialed CORS to an unlisted origin.
 *
 * @param {string|undefined|null} origin  the request Origin header (may be absent)
 * @param {{ isLocal: boolean, wildcardRequested: boolean, allowlist: string[] }} policy
 * @returns {{ allow: boolean, credentials: boolean, reflect: boolean, reason: string }}
 */
export function corsOriginDecision(origin, policy) {
  const p = policy || {};
  const allowlist = Array.isArray(p.allowlist) ? p.allowlist : [];

  // No Origin header: non-browser / server-to-server / same-origin. Allow the
  // request but do NOT grant credentialed browser CORS (there is no origin to
  // reflect, so no Access-Control-Allow-Origin is emitted).
  if (!origin) {
    return { allow: true, credentials: false, reflect: false, reason: "NO_ORIGIN_NON_BROWSER" };
  }

  if (allowlist.includes(origin)) {
    return { allow: true, credentials: true, reflect: true, reason: p.isLocal ? "EXPLICIT_ALLOWLIST_MATCH_LOCAL" : "EXPLICIT_ALLOWLIST_MATCH" };
  }

  if (p.isLocal) {
    if (isLoopbackOrigin(origin)) {
      return { allow: true, credentials: true, reflect: true, reason: "LOCAL_LOOPBACK" };
    }
    if (p.wildcardRequested) {
      return { allow: true, credentials: true, reflect: true, reason: "LOCAL_WILDCARD_DEV_ONLY" };
    }
    return { allow: false, credentials: false, reflect: false, reason: "LOCAL_ORIGIN_NOT_ALLOWED" };
  }

  // Production/staging-like: fail closed for anything not explicitly allowlisted.
  if (p.wildcardRequested || allowlist.length === 0) {
    return { allow: false, credentials: false, reflect: false, reason: "WILDCARD_OR_MISSING_ALLOWLIST_FAIL_CLOSED" };
  }
  return { allow: false, credentials: false, reflect: false, reason: "UNKNOWN_ORIGIN_REJECTED" };
}

/**
 * Build a per-request CORS options delegate compatible with `cors(delegate)`.
 * For denied origins it returns { origin:false, credentials:false } so neither
 * Access-Control-Allow-Origin nor Access-Control-Allow-Credentials is emitted.
 *
 * @param {object} [env=process.env]
 * @returns {(req: object, callback: Function) => void}
 */
export function buildCorsOptionsDelegate(env = process.env) {
  const policy = resolveCorsPolicy(env);
  return function corsOptionsDelegate(req, callback) {
    const origin = req && req.headers ? req.headers.origin : undefined;
    const decision = corsOriginDecision(origin, policy);
    if (!decision.allow) {
      return callback(null, { origin: false, credentials: false });
    }
    const options = { credentials: decision.credentials === true };
    // Reflect only the specific, already-validated origin (never a wildcard
    // with credentials). No origin header -> allow without reflection.
    options.origin = decision.reflect && origin ? origin : true;
    return callback(null, options);
  };
}

/**
 * Non-sensitive policy summary for health/diagnostics. Contains NO env values
 * and NO raw allowlist values (only counts and booleans).
 *
 * @param {object} [env=process.env]
 * @returns {{ environmentClass: string, failClosed: boolean, wildcardRequested: boolean, allowlistCount: number, credentials: boolean }}
 */
export function summarizeCorsPolicy(env = process.env) {
  const p = resolveCorsPolicy(env);
  const failClosed = !p.isLocal && (p.wildcardRequested || p.allowlist.length === 0);
  return {
    environmentClass: p.environmentClass,
    failClosed,
    wildcardRequested: p.wildcardRequested,
    allowlistCount: p.allowlist.length,
    credentials: p.credentials
  };
}
