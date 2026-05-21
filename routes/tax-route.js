// FILE: routes/tax-route.js
"use strict";

import { Router } from "express";
import { authenticate } from "../auth.js";
import { attachForcedHook } from "../shared/mode-guards.js";

/**
 * /tax — SENIOR_COUNSEL_MEMO
 * Formal tax memo and deep technical analysis.
 * Preserves authority hierarchy and full RAG pipeline.
 */
export function createTaxRoute({ askHandler }) {
  const router = Router();
  router.post("/", authenticate, attachForcedHook("/tax"), askHandler);
  return router;
}
