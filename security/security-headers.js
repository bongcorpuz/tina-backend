// FILE: security/security-headers.js
// PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-1
//
// Pure, dependency-free backend security-header helpers. This module performs
// NO I/O, reads NO env values, mutates no global state, and starts nothing. It
// only computes a header map and returns an Express middleware that applies it.
//
// The backend is API/JSON-only, so the Content-Security-Policy is deliberately
// conservative (default-src 'none') and MUST NOT copy the frontend CSP — the
// frontend needs script/style/img sources; the API needs none. Cache-Control is
// no-store so authenticated JSON is not cached by shared proxies or browsers.

"use strict";

// Conservative API-only CSP. No script/style/img/font/connect sources are
// permitted because the backend never serves an HTML document or assets.
export const BACKEND_CSP =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

/**
 * The static security headers applied to every backend response. Values are
 * fixed and safe defaults; no env input is required or read.
 *
 * @returns {Record<string,string>} a frozen header name -> value map
 */
export function getSecurityHeaders(options = {}) {
  // The strict same-site default protects every local/staging/Production API.
  // Only server.js may opt a Render pull-request Preview into cross-origin delivery.
  const crossOriginResourcePolicy =
    options && options.crossOriginResourcePolicy === "cross-origin"
      ? "cross-origin"
      : "same-site";
  return Object.freeze({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": crossOriginResourcePolicy,
    "Content-Security-Policy": BACKEND_CSP,
    // The backend is API/JSON-only; do not let authenticated JSON be cached.
    "Cache-Control": "no-store"
  });
}

/**
 * Create the security-headers middleware. It sets the static header map on every
 * response and defensively removes the Express X-Powered-By disclosure header in
 * case app.disable("x-powered-by") is ever bypassed. It never blocks a request.
 *
 * @returns {(req: object, res: object, next: Function) => void}
 */
export function createSecurityHeadersMiddleware(options = {}) {
  const headers = getSecurityHeaders(options);
  return function securityHeadersMiddleware(req, res, next) {
    // Defensive: suppress framework disclosure even if app.disable missed it.
    if (typeof res.removeHeader === "function") {
      res.removeHeader("X-Powered-By");
    }
    for (const key of Object.keys(headers)) {
      if (typeof res.setHeader === "function") {
        res.setHeader(key, headers[key]);
      }
    }
    if (typeof next === "function") return next();
    return undefined;
  };
}
