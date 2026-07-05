// FILE: security/public-health.js
// PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1
//
// Pure, dependency-free helper for public/liveness health minimization. NO I/O,
// NO env reads, NO mutation of global state. The public health payload is a
// minimal liveness signal only; it never discloses commitSha, model name,
// vector-store counts, adaptive-stack readiness, config flags, or which secrets
// are configured. Richer diagnostics are intentionally not exposed on the public
// endpoint (a dedicated authenticated diagnostic-health endpoint is deferred).

"use strict";

export const PUBLIC_HEALTH_SERVICE = "tina-backend";

// Only these keys are permitted in the PUBLIC health payload.
export const PUBLIC_HEALTH_ALLOWED_FIELDS = Object.freeze(["status", "service"]);

// Fields that must NEVER appear in the public health payload (they are the
// disclosure surface removed by this patch).
export const PUBLIC_HEALTH_FORBIDDEN_FIELDS = Object.freeze([
  "commitSha",
  "version",
  "environment",
  "serviceName",
  "openaiModel",
  "openaiConfigured",
  "supabaseConfigured",
  "googleDriveConfigured",
  "googleDriveFolderIdPreview",
  "indexSecretEnabled",
  "vectorStore",
  "adaptiveStack",
  "routeModes",
  "engine"
]);

/**
 * The minimal public liveness payload. Liveness only — it discloses no internal
 * configuration and is safe to return unauthenticated to Render health polling.
 *
 * @returns {{status:"ok", service:string}} frozen minimal payload
 */
export function buildPublicHealth() {
  return Object.freeze({ status: "ok", service: PUBLIC_HEALTH_SERVICE });
}

/**
 * True only if `payload` is a minimal public health object: status "ok" and no
 * keys beyond the allowed set (and none of the forbidden disclosure fields).
 *
 * @param {any} payload
 * @returns {boolean}
 */
export function isPublicHealthMinimal(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.status !== "ok") return false;
  const keys = Object.keys(payload);
  const allowed = new Set(PUBLIC_HEALTH_ALLOWED_FIELDS);
  if (!keys.every((k) => allowed.has(k))) return false;
  return !keys.some((k) => PUBLIC_HEALTH_FORBIDDEN_FIELDS.includes(k));
}
