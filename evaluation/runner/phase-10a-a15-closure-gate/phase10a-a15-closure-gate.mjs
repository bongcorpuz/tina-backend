#!/usr/bin/env node
/*
 * PHASE-10A-A15-FINAL-CLOSURE-GATE-V1
 *
 * Deterministic, read-only, network-disabled evaluator for the Phase-10A
 * exit items named in the controlling roadmap (see A15_EXECUTION_CONTRACT.json).
 *
 * This runner NEVER performs network I/O, NEVER writes outside its own
 * allowlisted output directory, and NEVER writes knowledge/CURRENT_STATE.md.
 * It evaluates already-produced evidence only; it does not rerun, adjudicate,
 * or invent pass criteria for any of the items it checks. A PASS execution
 * status does not by itself close Phase 10A (see contract.phase10AClosure).
 */
"use strict";

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT_PATH = path.join(HERE, "A15_EXECUTION_CONTRACT.json");
const DEFAULT_ROOT = path.resolve(HERE, "../../..");
const ALLOWED_OUTPUT_PARENT = "evaluation/results/phase-10a-a15-closure-gate";
const PROHIBITED_WRITE_PATTERNS = [
  /^knowledge\/CURRENT_STATE\.md$/,
  /^server\.js$/,
  /^security\/public-health\.js$/,
  /^evaluation\/runner\/phase-10a14-r20\//,
  /^evaluation\/results\/phase-10a14-r20\//
];

export function loadContract() {
  const raw = fs.readFileSync(CONTRACT_PATH, "utf8");
  return JSON.parse(raw);
}

function readJsonUnderRoot(root, relPath) {
  const abs = path.join(root, ...relPath.split("/"));
  if (!abs.startsWith(path.resolve(root))) {
    throw new Error(`path traversal rejected: ${relPath}`);
  }
  if (!fs.existsSync(abs)) return { present: false, value: null };
  const raw = fs.readFileSync(abs, "utf8");
  return { present: true, value: JSON.parse(raw), raw };
}

function readTextUnderRoot(root, relPath) {
  const abs = path.join(root, ...relPath.split("/"));
  if (!abs.startsWith(path.resolve(root))) {
    throw new Error(`path traversal rejected: ${relPath}`);
  }
  if (!fs.existsSync(abs)) return { present: false, text: null };
  return { present: true, text: fs.readFileSync(abs, "utf8") };
}

function extractGateRowValue(currentStateText, rowLabel) {
  // Matches "| <rowLabel> | `VALUE` |" style rows used throughout CURRENT_STATE.md.
  const escaped = rowLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\|\\s*${escaped}\\s*\\|\\s*\`([^\`]+)\``, "i");
  const match = currentStateText.match(re);
  return match ? match[1] : null;
}

export function evaluateItem(item, root) {
  switch (item.checkMethod) {
    case "READ_JSON_FIELD_EQUALS": {
      const { present, value } = readJsonUnderRoot(root, item.evidenceSource);
      if (!present) {
        return { id: item.id, status: "BLOCKED", reason: "MISSING_EVIDENCE", detail: `not found: ${item.evidenceSource}` };
      }
      const actual = value[item.evidenceField];
      if (actual !== item.expectedValue) {
        return {
          id: item.id,
          status: "FAIL",
          reason: "EVIDENCE_HASH_OR_CONTENT_DRIFT",
          detail: `${item.evidenceField} expected ${item.expectedValue}, found ${actual}`
        };
      }
      return { id: item.id, status: "DEFINED_BUT_EVIDENCE_PARTIAL", reason: null, detail: item.statusNote };
    }

    case "STATIC_NOT_SATISFIED": {
      return { id: item.id, status: "FAIL", reason: "INHERITED_BASELINE_FAILURE", detail: item.statusNote };
    }

    case "STATIC_BLOCKED_NO_DEFINITION": {
      return { id: item.id, status: "BLOCKED", reason: "NO_EXECUTABLE_DEFINITION", detail: item.statusNote };
    }

    case "PRECONDITION_GATE": {
      const { present, text } = readTextUnderRoot(root, "knowledge/CURRENT_STATE.md");
      if (!present) {
        return { id: item.id, status: "BLOCKED", reason: "MISSING_EVIDENCE", detail: "knowledge/CURRENT_STATE.md not found" };
      }
      const value = extractGateRowValue(text, "Deterministic clean/staging closure");
      if (value === null) {
        return { id: item.id, status: "BLOCKED", reason: "MISSING_EVIDENCE", detail: "gate row not found in CURRENT_STATE.md" };
      }
      if (value !== "SATISFIED") {
        return { id: item.id, status: "BLOCKED", reason: "PRECONDITION_UNSATISFIED", detail: `Deterministic clean/staging closure = ${value}` };
      }
      return { id: item.id, status: "PASS", reason: null, detail: "Deterministic clean/staging closure = SATISFIED" };
    }

    case "STATIC_SATISFIED": {
      const { present, text } = readTextUnderRoot(root, "knowledge/CURRENT_STATE.md");
      if (!present) {
        return { id: item.id, status: "BLOCKED", reason: "MISSING_EVIDENCE", detail: "knowledge/CURRENT_STATE.md not found" };
      }
      const r4 = extractGateRowValue(text, "R4 bounded development-governance review");
      const postR4 = extractGateRowValue(text, "Post-R4 external-review gate");
      if (r4 === "ACCEPTED" && postR4 === "SATISFIED") {
        return { id: item.id, status: "PASS", reason: null, detail: `R4=${r4}, Post-R4=${postR4}` };
      }
      return { id: item.id, status: "BLOCKED", reason: "MISSING_EVIDENCE", detail: `R4=${r4}, Post-R4=${postR4}` };
    }

    case "READ_MANIFEST_AND_VERDICT": {
      const manifest = readTextUnderRoot(root, item.evidenceSource);
      const review = readTextUnderRoot(root, item.internalReviewSource);
      if (!manifest.present || !review.present) {
        return { id: item.id, status: "BLOCKED", reason: "MISSING_EVIDENCE", detail: "manifest or internal review file not found" };
      }
      if (!review.text.includes(item.expectedVerdict)) {
        return {
          id: item.id,
          status: "FAIL",
          reason: "EVIDENCE_HASH_OR_CONTENT_DRIFT",
          detail: `expected verdict '${item.expectedVerdict}' not found in internal review`
        };
      }
      return { id: item.id, status: "PASS", reason: null, detail: `verdict confirmed: ${item.expectedVerdict}` };
    }

    case "NOT_APPLICABLE":
      return { id: item.id, status: "NOT_APPLICABLE", reason: null, detail: "self-referential item" };

    default:
      throw new Error(`unknown checkMethod: ${item.checkMethod}`);
  }
}

export function aggregate(itemResults) {
  const precondition = itemResults.find(
    (r) => r.reason === "PRECONDITION_UNSATISFIED"
  );
  if (precondition) {
    return { executionStatus: "BLOCKED", blockedReason: "PRECONDITION_UNSATISFIED" };
  }
  const anyFail = itemResults.some((r) => r.status === "FAIL");
  if (anyFail) {
    return { executionStatus: "FAIL", blockedReason: null };
  }
  const anyBlocked = itemResults.some((r) => r.status === "BLOCKED");
  if (anyBlocked) {
    const first = itemResults.find((r) => r.status === "BLOCKED");
    return { executionStatus: "BLOCKED", blockedReason: first.reason };
  }
  const anyPartial = itemResults.some((r) => r.status === "DEFINED_BUT_EVIDENCE_PARTIAL");
  if (anyPartial) {
    return { executionStatus: "BLOCKED", blockedReason: "MISSING_EVIDENCE" };
  }
  return { executionStatus: "PASS", blockedReason: null };
}

export function evaluate(root) {
  const contract = loadContract();
  const itemResults = contract.exitItems
    .filter((item) => item.checkMethod !== "NOT_APPLICABLE")
    .map((item) => evaluateItem(item, root));
  const { executionStatus, blockedReason } = aggregate(itemResults);

  return {
    contractIdentity: contract.identity,
    contractVersion: contract.version,
    executionStatus,
    blockedReason,
    reviewDisposition: "PENDING_INTERNAL_REVIEW",
    b2ThroughB6: contract.b2ThroughB6.disposition,
    phase10AClosure: "NOT_CLAIMED",
    phase10BAuthorization: "NOT_CLAIMED",
    itemResults
  };
}

export function assertWritePathAllowed(outDir) {
  const rel = path.relative(process.cwd(), outDir).split(path.sep).join("/");
  if (!rel.startsWith(ALLOWED_OUTPUT_PARENT)) {
    throw new Error(`refusing to write outside allowlisted output directory: ${rel}`);
  }
  for (const pattern of PROHIBITED_WRITE_PATTERNS) {
    if (pattern.test(rel)) {
      throw new Error(`refusing to write to prohibited path: ${rel}`);
    }
  }
}

function main(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      args.set(key, next && !next.startsWith("--") ? next : true);
    }
  }

  const root = args.has("root") ? path.resolve(String(args.get("root"))) : DEFAULT_ROOT;
  const result = evaluate(root);

  if (args.get("verify-only")) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else if (args.has("out")) {
    const outDir = path.resolve(String(args.get("out")));
    assertWritePathAllowed(outDir);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "A15_EXECUTION_RESULT.json"),
      JSON.stringify(result, null, 2) + "\n"
    );
    const manifest = createHash("sha256")
      .update(JSON.stringify(result))
      .digest("hex");
    fs.writeFileSync(
      path.join(outDir, "A15_EVIDENCE_MANIFEST.sha256"),
      `${manifest}  A15_EXECUTION_RESULT.json\n`
    );
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  }

  if (result.executionStatus === "FAIL") process.exitCode = 1;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main(process.argv.slice(2));
}

assert.ok(loadContract, "contract loader must be defined");
