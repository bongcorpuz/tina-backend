// FILE: security/index-secret-auth.js
// PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-1
//
// Pure, dependency-free helpers for INDEX_SECRET admin authorization. Secrets
// in URL query strings are unsafe: URLs can leak through access logs, browser
// history, proxies, referrers, screenshots, and monitoring tools. This module
// removes query-string acceptance and standardizes on header-based auth.
// NO I/O, NO network calls, NO logging of secret values or full URLs.

"use strict";

import crypto from "crypto";

// Recognized query-string aliases that must be rejected, not authorized, if present.
export const QUERY_SECRET_ALIASES = Object.freeze([
  "secret",
  "indexSecret",
  "INDEX_SECRET",
  "token",
  "key"
]);

export const PREFERRED_HEADER = "x-tina-index-secret";

/**
 * True if the request carries any recognized query-string secret alias,
 * regardless of whether the value is correct. Presence alone is disqualifying.
 *
 * @param {{query?: Record<string, any>}} req
 * @returns {boolean}
 */
export function hasQueryStringSecret(req) {
  const query = (req && req.query) || {};
  return QUERY_SECRET_ALIASES.some((key) => {
    const value = query[key];
    return value !== undefined && value !== null && value !== "";
  });
}

/**
 * Extracts a candidate secret from approved header sources only:
 * X-TINA-INDEX-SECRET (preferred) or Authorization: Bearer <secret>.
 * Never reads query parameters.
 *
 * @param {{headers?: Record<string, any>}} req
 * @returns {string|null}
 */
export function getIndexSecretFromHeaders(req) {
  const headers = (req && req.headers) || {};

  const preferred = headers[PREFERRED_HEADER];
  if (typeof preferred === "string" && preferred.length > 0) {
    return preferred;
  }

  const authHeader = headers["authorization"];
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token.length > 0) return token;
  }

  return null;
}

/**
 * Constant-time string comparison guarding against length-based timing
 * shortcuts. Returns false (never throws) for any non-string or mismatched
 * input.
 *
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
export function timingSafeEqualStrings(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length === 0 || b.length === 0) {
    return false;
  }

  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    // Still perform a same-length comparison so the absence of a match does
    // not short-circuit on length alone.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Evaluates whether `req` is authorized to perform a protected index/admin
 * operation via INDEX_SECRET. Query-string secrets are rejected outright,
 * even if the value is correct.
 *
 * @param {{query?: object, headers?: object}} req
 * @param {{configuredSecret?: string|null}} [options]
 * @returns {{authorized: boolean, reason: string}}
 */
export function validateIndexSecretRequest(req, options = {}) {
  const configuredSecret = Object.prototype.hasOwnProperty.call(options, "configuredSecret")
    ? options.configuredSecret
    : process.env.INDEX_SECRET;

  if (hasQueryStringSecret(req)) {
    return { authorized: false, reason: "query_string_secret_rejected" };
  }

  if (!configuredSecret) {
    return { authorized: false, reason: "not_configured" };
  }

  const headerSecret = getIndexSecretFromHeaders(req);
  if (!headerSecret) {
    return { authorized: false, reason: "missing_header" };
  }

  if (!timingSafeEqualStrings(headerSecret, configuredSecret)) {
    return { authorized: false, reason: "invalid_header" };
  }

  return { authorized: true, reason: "header_authorized" };
}

/**
 * Builds a safe rejection body. Never echoes any submitted secret/query
 * value regardless of reason.
 *
 * @param {string} [reason]
 * @returns {{error: string, message: string}}
 */
export function sanitizeIndexAuthFailure(reason) {
  return Object.freeze({
    error: "unauthorized",
    message: "Index authorization must be supplied using an approved header."
  });
}

/**
 * Express middleware: authorizes via INDEX_SECRET header only. On failure,
 * invokes `options.onUnauthorized(req, res, next, result)` if provided
 * (e.g. to fall back to session/JWT auth); otherwise responds 401 with a
 * safe body and does not call `next()`.
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @param {{configuredSecret?: string|null, onUnauthorized?: Function}} [options]
 */
export function requireIndexSecret(req, res, next, options = {}) {
  const result = validateIndexSecretRequest(req, options);

  if (result.authorized) {
    return next();
  }

  if (typeof options.onUnauthorized === "function") {
    return options.onUnauthorized(req, res, next, result);
  }

  return res.status(401).json(sanitizeIndexAuthFailure(result.reason));
}
