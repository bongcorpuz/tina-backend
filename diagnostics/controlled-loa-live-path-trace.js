// FILE: diagnostics/controlled-loa-live-path-trace.js
// PHASE-09ZG-CONTROLLED-LOA-LIVE-PATH-INSTRUMENTATION-DIAGNOSTIC-1
//
// Narrow, staging-only diagnostic trace collector for tracing the live /ask
// runtime path taken by controlled LOA/eLA procedural-help queries. Gated by
// TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC (default false). When disabled, every
// exported function is a deterministic no-op with zero behavioral, timing,
// or content side effects -- it never changes routing, classification,
// answer text, or responseType, and it never persists data (no database,
// no filesystem, no external service call). When enabled, it only logs
// sanitized, non-secret fields (branch labels, booleans, classification
// labels, responseType, and a truncated/hashed query fingerprint) to
// console.log under a single unique prefix. It never logs Authorization
// headers, JWTs, passwords, environment secrets, full request headers, or
// unrestricted request bodies.

import { createHash } from "node:crypto";

const TRACE_LOG_PREFIX = "[TINA_09ZG_LOA_PATH]";
const DIAGNOSTIC_FLAG_TRUE_VALUES = new Set(["1", "true", "on", "yes"]);
const QUERY_PREVIEW_MAX_CHARS = 60;

export function isControlledLoaLivePathDiagnosticEnabled(env = process.env) {
  const value = String(env?.TINA_ENABLE_09ZG_LOA_PATH_DIAGNOSTIC || "").trim().toLowerCase();
  return DIAGNOSTIC_FLAG_TRUE_VALUES.has(value);
}

// Sanitized fingerprint only: short non-reversible-length-limited preview plus
// a stable hash for exact-match comparison across trace events. This is NOT a
// general-purpose raw query logger -- it exists only inside this gated,
// staging-only diagnostic path, and the queries it is designed to observe
// (the fixed 09ZF/09ZG safe/excluded/unrelated matrices) contain no taxpayer
// data.
export function queryFingerprint(query = "") {
  const text = typeof query === "string" ? query : String(query || "");
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
  return {
    length: text.length,
    hash,
    preview: text.slice(0, QUERY_PREVIEW_MAX_CHARS)
  };
}

function generateDiagnosticId() {
  return `09zg-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
}

// Every event is logged immediately (not buffered-until-flush) so that if the
// live request throws or times out downstream, whatever events were recorded
// up to that point are still visible in the logs -- this is what lets the
// diagnostic distinguish "never reached the controlled LOA gate" from
// "reached it and it returned no match" from "matched but was overwritten
// later."
export function createControlledLoaLivePathTrace({ enabled = false, phase = "09ZG", correlationId = null } = {}) {
  const diagnosticId = generateDiagnosticId();
  const events = [];

  function record(eventName, fieldsOrFn = {}) {
    if (!enabled) return null;

    let fields;
    try {
      fields = typeof fieldsOrFn === "function" ? fieldsOrFn() : fieldsOrFn;
    } catch (e) {
      fields = { fieldBuilderError: e?.message || String(e) };
    }

    const event = {
      diagnosticId,
      phase,
      correlationId,
      event: eventName,
      seq: events.length,
      atMs: Date.now(),
      ...safeSanitizeFields(fields)
    };

    events.push(event);
    console.log(TRACE_LOG_PREFIX, event);
    return event;
  }

  return {
    enabled,
    diagnosticId,
    events,
    record
  };
}

// Defense-in-depth: even though every call site is expected to pass only
// sanitized fields, strip any key that looks like it could carry a secret or
// unrestricted request data before logging.
const FORBIDDEN_FIELD_KEY_PATTERN = /authorization|jwt|token|password|secret|cookie|headers|req(?:uest)?body|env(?:ironment)?vars?/i;

function safeSanitizeFields(fields) {
  if (!fields || typeof fields !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (FORBIDDEN_FIELD_KEY_PATTERN.test(key)) continue;
    out[key] = value;
  }
  return out;
}
