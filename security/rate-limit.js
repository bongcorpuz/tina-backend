// FILE: security/rate-limit.js
// PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-1
//
// Dependency-free, in-memory, fixed-window rate limiter. NO external packages
// (no express-rate-limit), NO Redis, NO I/O, NO env reads required. This is a
// per-instance limiter intended for staging protection against accidental
// bursts and trivial abuse — it is NOT a distributed limiter and is explicitly
// documented as such. Production scale should move to a shared store.
//
// Safety properties:
//   - OPTIONS (CORS preflight) is never counted or blocked.
//   - /health is exempt so Render health polling is never throttled.
//   - The limiter never logs IPs, tokens, headers, cookies, or bodies.
//   - The key prefers an already-present req.user.id, else req.ip (no new
//     trust-proxy behavior is introduced here).

"use strict";

export const RATE_LIMIT_TIERS = Object.freeze({
  general:   Object.freeze({ windowMs: 60_000, max: 120 }),
  expensive: Object.freeze({ windowMs: 60_000, max: 20 }),
  admin:     Object.freeze({ windowMs: 60_000, max: 10 })
});

// Expensive model/retrieval mode routes (mounted by routes/index.js).
const EXPENSIVE_ROUTE_PREFIXES = [
  "/ask", "/tax", "/review", "/quiz", "/diagnostic", "/source",
  "/audit", "/case", "/debug", "/patch", "/progress", "/feedback"
];

// Admin / indexing / drive-read routes.
const ADMIN_ROUTE_PREFIXES = [
  "/index-drive", "/reindex", "/admin", "/reindex-targeted", "/index-status",
  "/debug/db-identity", "/list", "/read-drive", "/vector-stats"
];

function normalizePath(path) {
  const raw = typeof path === "string" ? path : "";
  const noQuery = raw.split("?")[0];
  return noQuery.length > 1 ? noQuery.replace(/\/+$/, "") : noQuery;
}

function matchesPrefix(path, prefixes) {
  const p = normalizePath(path);
  return prefixes.some((prefix) => p === prefix || p.startsWith(prefix + "/"));
}

/**
 * @param {string} path
 * @returns {boolean} true for expensive model/retrieval routes.
 */
export function isExpensiveRoute(path) {
  return matchesPrefix(path, EXPENSIVE_ROUTE_PREFIXES);
}

/**
 * @param {string} path
 * @returns {boolean} true for admin/indexing/drive routes.
 */
export function isAdminRoute(path) {
  return matchesPrefix(path, ADMIN_ROUTE_PREFIXES);
}

/**
 * @param {string} path
 * @returns {boolean} true for the health route (exempt from limiting).
 */
export function isHealthRoute(path) {
  return normalizePath(path) === "/health";
}

/**
 * Resolve the tier name for a request path. Admin routes are matched before
 * expensive routes so /debug/db-identity (admin) is not misread as /debug
 * (expensive). Everything else is general.
 *
 * @param {object} req  an object with a `path` (or `originalUrl`) string.
 * @returns {"admin"|"expensive"|"general"}
 */
export function getRateLimitTier(req) {
  const path = (req && (req.path || req.originalUrl || req.url)) || "";
  if (isAdminRoute(path)) return "admin";
  if (isExpensiveRoute(path)) return "expensive";
  return "general";
}

/**
 * Derive a non-sensitive rate-limit key. Prefers an authenticated user id if
 * already present on the request; otherwise falls back to req.ip. The key is
 * used only as a Map lookup and is never logged.
 *
 * @param {object} req
 * @returns {string}
 */
export function getRateLimitKey(req) {
  const userId = req && req.user && req.user.id;
  if (userId) return `u:${userId}`;
  const ip = (req && (req.ip || (req.connection && req.connection.remoteAddress))) || "unknown";
  return `ip:${ip}`;
}

/**
 * Pure fixed-window accounting step. Given the current store entry (or none),
 * returns the updated entry and whether the request is allowed.
 *
 * @param {{count:number,resetAt:number}|undefined} entry
 * @param {number} now      current epoch ms
 * @param {number} windowMs window length ms
 * @param {number} max      max requests per window
 * @returns {{entry:{count:number,resetAt:number}, allowed:boolean, remaining:number, retryAfterMs:number}}
 */
export function accountRequest(entry, now, windowMs, max) {
  let current = entry;
  if (!current || now >= current.resetAt) {
    current = { count: 0, resetAt: now + windowMs };
  }
  current = { count: current.count + 1, resetAt: current.resetAt };
  const allowed = current.count <= max;
  const remaining = Math.max(0, max - current.count);
  const retryAfterMs = allowed ? 0 : Math.max(0, current.resetAt - now);
  return { entry: current, allowed, remaining, retryAfterMs };
}

/**
 * Create the rate-limit middleware. Store and clock are injectable for
 * deterministic testing; defaults are a module-local Map and Date.now.
 *
 * @param {{ tiers?: object, store?: Map<string,object>, now?: () => number }} [options]
 * @returns {(req: object, res: object, next: Function) => any}
 */
export function createRateLimitMiddleware(options = {}) {
  const tiers = options.tiers || RATE_LIMIT_TIERS;
  const store = options.store || new Map();
  const now = typeof options.now === "function" ? options.now : () => Date.now();

  return function rateLimitMiddleware(req, res, next) {
    const method = (req && req.method) || "GET";

    // Never count or block CORS preflight — it carries no credentials/body.
    if (method === "OPTIONS") return next();

    const path = (req && (req.path || req.originalUrl || req.url)) || "";
    // Exempt health checks so Render polling is never throttled.
    if (isHealthRoute(path)) return next();

    const tierName = getRateLimitTier(req);
    const tier = tiers[tierName] || tiers.general;
    const key = `${tierName}:${getRateLimitKey(req)}`;

    const result = accountRequest(store.get(key), now(), tier.windowMs, tier.max);
    store.set(key, result.entry);

    const resetUnix = Math.ceil(result.entry.resetAt / 1000);
    if (typeof res.setHeader === "function") {
      res.setHeader("X-RateLimit-Limit", String(tier.max));
      res.setHeader("X-RateLimit-Remaining", String(result.remaining));
      res.setHeader("X-RateLimit-Reset", String(resetUnix));
    }

    if (!result.allowed) {
      const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);
      if (typeof res.setHeader === "function") {
        res.setHeader("Retry-After", String(retryAfterSeconds));
      }
      return res.status(429).json({
        error: "rate_limited",
        message: "Too many requests. Please try again later.",
        retryAfterSeconds
      });
    }

    return next();
  };
}
