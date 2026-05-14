// FILE: conflict-engine.js
"use strict";

/**
 * TINA CONFLICT ENGINE
 * Production-Grade Doctrinal + Hierarchy Conflict Resolver
 */

const {
  AUTHORITY_LABEL,
  BIR_TYPES,
  COURT_TYPES,
  compactSpaces,
  lower,
  getDocPath,
  getDocSource,
  getDocNormalizedReference,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} = require("./authority-engine.js");

const ENGINE_VERSION = "2.3.0";

const CONFLICT_TYPE = Object.freeze({
  NONE: "NO_CONFLICT",
  HIERARCHY: "HIERARCHY_CONFLICT",
  DOCTRINAL: "DOCTRINAL_CONFLICT",
  MIXED: "MIXED_HIERARCHY_AND_DOCTRINAL_CONFLICT",
  APPARENT: "APPARENT_CONFLICT_ONLY"
});

const DOCTRINE_DIMENSION = Object.freeze({
  SUBSTANTIVE: "substantive",
  PROCEDURAL: "procedural",
  EVIDENTIARY: "evidentiary",
  JURISDICTIONAL: "jurisdictional",
  TEMPORAL: "temporal",
  ADMINISTRATIVE: "administrative",
  FACTUAL: "factual",
  CONTRACTUAL: "contractual",
  ECONOMIC_SUBSTANCE: "economic_substance",
  AUDIT: "audit",
  TRANSACTION: "transaction",
  GENERAL: "general"
});

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .
