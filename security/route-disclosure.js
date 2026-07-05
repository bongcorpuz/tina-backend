// FILE: security/route-disclosure.js
// PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1
//
// Pure, dependency-free helpers for public route-disclosure minimization. The
// public /routes endpoint previously returned a full route inventory and an
// internal module list, enabling endpoint enumeration. Publicly it now returns a
// minimal 404 with no inventory. NO I/O, NO env reads, NO mutation.

"use strict";

// Return 404 (not 401/403) so the public surface does not confirm the endpoint
// exists — this reduces endpoint enumeration.
export const ROUTE_NOT_FOUND_STATUS = 404;

/**
 * The minimal public route-disclosure body. Contains no route inventory, no
 * method list, no module list, and no internal file paths.
 *
 * @returns {{error:"not_found"}} frozen minimal body
 */
export function buildRouteNotFound() {
  return Object.freeze({ error: "not_found" });
}

/**
 * True if `body` is a minimal, non-disclosing route response: it carries an
 * error marker and none of the disclosure fields the old /routes response had.
 *
 * @param {any} body
 * @returns {boolean}
 */
export function isRouteResponseMinimal(body) {
  if (!body || typeof body !== "object") return false;
  const disclosureFields = ["routes", "modeSupport", "adaptiveModules", "usefulRoutes"];
  if (disclosureFields.some((f) => Object.prototype.hasOwnProperty.call(body, f))) return false;
  return typeof body.error === "string";
}
