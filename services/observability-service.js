// FILE: services/observability-service.js
"use strict";

/**
 * TINA Observability Service — Langfuse adapter with full no-op fallback.
 *
 * When LANGFUSE_PUBLIC_KEY is absent or LANGFUSE_ENABLED=false, every
 * exported function returns immediately without throwing. Observability
 * must NEVER block or break TINA's answer flow.
 *
 * Integration points (MVP):
 *   pipeline.js                   — startTrace / endTrace
 *   context-orchestration-engine.js — startGeneration / endGeneration
 */

import { Langfuse } from "langfuse";
import { randomUUID } from "crypto";

// ── Singleton Langfuse client ─────────────────────────────────────────────────

let _langfuse = null;

// Keeps live trace references (and names) so endTrace() can call tr.update()
// on the correct object AND re-supply the trace name.  Without the name,
// LangfuseTraceClient.update() enqueues a second "trace-create" event with no
// name field — the Langfuse server may overwrite the name with null, causing
// the trace to vanish from the Tracing table's default filtered view.
const _traceMap = new Map(); // traceId → { tr: LangfuseTraceClient, name: string }

function _isEnabled() {
  return (
    process.env.LANGFUSE_ENABLED !== "false" &&
    Boolean(process.env.LANGFUSE_PUBLIC_KEY) &&
    Boolean(process.env.LANGFUSE_SECRET_KEY)
  );
}

try {
  if (_isEnabled()) {
    _langfuse = new Langfuse({
      publicKey:     process.env.LANGFUSE_PUBLIC_KEY,
      secretKey:     process.env.LANGFUSE_SECRET_KEY,
      baseUrl:       process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
      flushInterval: 5000
    });
    console.log("[TINA OBSERVABILITY] Langfuse enabled — traces will be sent.");
  }
} catch (e) {
  console.error("[TINA OBSERVABILITY] Langfuse init failed (no-op mode):", e?.message);
  _langfuse = null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generates a stable UUID for a pipeline request.
 * Always returns a string even when Langfuse is disabled.
 */
export function generateTraceId() {
  return randomUUID();
}

/**
 * Opens a Langfuse trace for a single pipeline invocation.
 * Call at the very start of runPipeline().
 *
 * @param {object} opts
 * @param {string} opts.traceId      - UUID from generateTraceId()
 * @param {string} [opts.name]       - trace name shown in Langfuse UI
 * @param {string} [opts.hook]       - /ask, /quiz, /audit, etc.
 * @param {object} [opts.metadata]   - any extra key-value pairs
 */
export function startTrace({ traceId, name = "tina-pipeline", hook, metadata = {} }) {
  if (!_langfuse) return;
  try {
    const tr = _langfuse.trace({
      id:   traceId,
      name,
      tags: hook ? [hook] : [],
      metadata: { hook, ...metadata }
    });
    _traceMap.set(traceId, { tr, name });
  } catch {
    // non-fatal
  }
}

/**
 * Updates the trace with final metadata after the pipeline finishes.
 * Langfuse merges this into the existing trace record.
 *
 * @param {object} opts
 * @param {string} opts.traceId
 * @param {object} [opts.metadata]
 */
export function endTrace({ traceId, metadata = {} }) {
  if (!_langfuse || !traceId) return;
  try {
    const stored = _traceMap.get(traceId);
    if (stored) {
      // Re-supply name so the SDK's second "trace-create" event doesn't land
      // on the Langfuse server with a blank name and overwrite the original.
      stored.tr.update({ name: stored.name, metadata });
      _traceMap.delete(traceId);
    }
    // If the trace was never stored (e.g. startTrace was a no-op due to an
    // earlier error), silently skip — the partial trace is already queued.
  } catch {
    // non-fatal
  }
}

/**
 * Starts a Langfuse generation observation (an OpenAI call span).
 * Returns an opaque generation handle that must be passed to endGeneration().
 * Returns null when Langfuse is disabled — endGeneration() handles null safely.
 *
 * @param {object} opts
 * @param {string}  opts.traceId          - must match the trace from startTrace()
 * @param {string}  [opts.name]           - label shown in Langfuse UI
 * @param {string}  opts.model            - e.g. "gpt-4o-mini"
 * @param {string}  [opts.input]          - sanitized user query (not full prompt)
 * @param {object}  [opts.modelParameters]- { temperature, max_tokens }
 * @param {object}  [opts.metadata]       - { mode, estimatedInputTokens, … }
 * @returns generation handle | null
 */
export function startGeneration({ traceId, name = "openai-completion", model, input, modelParameters = {}, metadata = {} }) {
  if (!_langfuse || !traceId) return null;
  try {
    return _langfuse.generation({
      traceId,
      name,
      model,
      input,
      modelParameters,
      metadata,
      startTime: new Date()
    });
  } catch {
    return null;
  }
}

/**
 * Closes a generation observation with output + token usage.
 * Safe to call with a null handle (no-op).
 *
 * @param {object|null} gen             - handle from startGeneration()
 * @param {object} [opts]
 * @param {string}  [opts.output]       - sanitized answer text
 * @param {object}  [opts.usage]        - completion.usage from OpenAI
 * @param {number}  [opts.latencyMs]    - wall-clock time for the OpenAI call
 * @param {object}  [opts.metadata]     - { wasTrimmed, sourceCount, … }
 */
export function endGeneration(gen, { output, usage, latencyMs, metadata = {} } = {}) {
  if (!gen) return;
  try {
    gen.end({
      output,
      // endTime is omitted — LangfuseGenerationClient.end() always appends its
      // own endTime: new Date() after the spread, so any value we pass here
      // would be overwritten anyway.
      usage: {
        input:  usage?.prompt_tokens     ?? undefined,
        output: usage?.completion_tokens ?? undefined,
        total:  usage?.total_tokens      ?? undefined,
        unit:   "TOKENS"
      },
      metadata: { latencyMs, ...metadata }
    });
  } catch {
    // non-fatal
  }
}

/**
 * Flushes pending observations to Langfuse.
 * In a long-running Express server the SDK auto-flushes every flushInterval ms.
 * Call at the end of every pipeline run to force-flush before the HTTP response
 * is sent, so observations don't sit in the queue for up to flushInterval ms.
 *
 * Uses awaitAllQueuedAndPendingRequests() rather than flushAsync() because
 * flushAsync() only waits for ONE batch's HTTP callback; any other in-flight
 * HTTP promises from concurrent/background flushes would still be pending.
 * awaitAllQueuedAndPendingRequests() clears the timer, flushes, and awaits ALL
 * pendingIngestionPromises — ensuring the Langfuse server receives everything.
 */
export async function flushObservability() {
  if (!_langfuse) return;
  try {
    await _langfuse.awaitAllQueuedAndPendingRequests();
  } catch {
    // non-fatal
  }
}
