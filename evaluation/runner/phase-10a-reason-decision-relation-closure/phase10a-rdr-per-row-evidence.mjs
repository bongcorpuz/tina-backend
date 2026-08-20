#!/usr/bin/env node
/**
 * PHASE-10A REASON / DECISION / RELATION PER-ROW CLOSURE EVIDENCE — V1 (CANDIDATE)
 *
 * PURPOSE
 * -------
 * A15 V1 reports `decisionClosure` and `relationClosure` as
 * BLOCKED_MISSING_EVIDENCE with this stated reason:
 *
 *   "No separate per-row decision-resolution manifest was located by the
 *    authoring unit; the runner therefore verifies only the total-count
 *    precondition."
 *
 * This runner produces exactly that missing artifact: a deterministic,
 * hash-bound, PER-ROW expected-vs-actual record for all 3,720 R20 oracle rows,
 * for decision, relation, and reason simultaneously.
 *
 * It does NOT invent, adjudicate, revise, or resolve any expectation. Every
 * `actual` value is computed by executing the committed frozen semantic-base
 * analyzer over the committed frozen oracle query text. Every `expected` value
 * is read verbatim from the sealed oracle.
 *
 * WHAT MAKES THIS EVIDENCE AND NOT AN ASSERTION
 * ---------------------------------------------
 * 1. Oracle inputs are byte-verified against their sealed SHA-256 values before
 *    use (LF-normalized, so a CRLF checkout cannot silently change identity).
 * 2. The semantic base is byte-verified against RUNTIME_IDENTITY.json AND
 *    against `servicesTreeDigest` = the value recorded in
 *    COMMIT_5R1C37_REASON_CONTRACT_SPECIFICATION.json `semanticBase`.
 * 3. The scoring function is IMPORTED VERBATIM from the committed governing
 *    library `commit5r1c13-lib.mjs` (`scoreR3`). It is not re-implemented,
 *    re-specified, or transcribed, so it cannot drift from the frozen scorer.
 * 4. Both the R3 baseline and the R4 candidate oracle are scored in the SAME
 *    process with the SAME analyzer, giving a true regression comparison rather
 *    than a count comparison against a remembered figure.
 *
 * WHAT THIS RUNNER DELIBERATELY DOES NOT DO
 * -----------------------------------------
 * - It does not write, patch, install, or restore anything under `services/`.
 *   The C13/C34 campaign harnesses install a candidate into the live
 *   `services/` tree; that is a runtime mutation and is NOT authorized here.
 *   This runner loads the snapshot analyzer directly from the committed
 *   attempt snapshot, in-process, read-only.
 * - It performs no network access, no subprocess execution other than `git`
 *   reads for provenance, no model invocation, and no oracle mutation.
 * - It does not modify knowledge/CURRENT_STATE.md, the roadmap, A15 V1, or any
 *   existing file. It only creates files under its own results directory.
 * - It does NOT itself declare reason/decision/relation closure SATISFIED.
 *   It emits evidence plus an explicit closureAdmissibility assessment that
 *   distinguishes development-governance algebra from independent/holdout
 *   closure evidence, per the R4/C38 record.
 *
 * USAGE
 * -----
 *   node evaluation/runner/phase-10a-reason-decision-relation-closure/phase10a-rdr-per-row-evidence.mjs --report
 *   node evaluation/runner/phase-10a-reason-decision-relation-closure/phase10a-rdr-per-row-evidence.mjs --out <dir>
 *
 * --report writes nothing. --out refuses to overwrite an existing directory.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ── Repository root (this file lives at <root>/evaluation/runner/<unit>/) ────
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

const ALLOWED_OUTPUT_ROOT = "evaluation/results/phase-10a-reason-decision-relation-closure";

// ── Sealed identities. Any drift is a hard stop, never a warning. ───────────
const SEALED = Object.freeze({
  r3: {
    path: "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json",
    sha256: "ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54",
    bytes: 6737848
  },
  r4: {
    path: "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r4/R20_DEVELOPMENT_ORACLE_FROZEN_R4.json",
    sha256: "d10252f139923627efcfbb45d2f2f9b208139c5b183f1a5d175d4a5a192f9566",
    bytes: 6738864
  },
  reasonContract: {
    path: "evaluation/results/phase-10a14-r20/COMMIT_5R1C37_REASON_CONTRACT_SPECIFICATION.json",
    sha256: "41d185be42aacca00fdc67cd13b075ef1348cf0c46c12b157c0d9fc8ad72ca93"
  },
  rowAdjudication: {
    path: "evaluation/results/phase-10a14-r20/COMMIT_5R1C37_145_ROW_CONTRACT_ADJUDICATION.json",
    sha256: "74f30ec7a0a6bb0696323323c259659191299e123dd648c823a0da101acb684d"
  },
  scorer: {
    path: "evaluation/runner/phase-10a14-r20/commit5r1c13-lib.mjs",
    sha256: "d15db1c99f392f51dac27ec87490fcdcdcce7b6b4d068107875848f6f53e2c9a"
  }
});

// The C34 attempt snapshot named as `semanticBase` by the C37 reason contract.
const SEMANTIC_BASE_DIR =
  "evaluation/results/phase-10a14-r20/attempts/" +
  "R20-domain_campaign-commit5r1c34-tr01-retry01-ord06-2026-07-30T03-24-56-403Z/runtime-snapshot";

// SERVICES order is significant: servicesTreeDigest is the SHA-256 of the
// LF-normalized bytes concatenated in exactly this order (commit5r1c13-lib.mjs
// `runtimeIdentity`). Reordering silently changes the digest.
const SERVICES = Object.freeze([
  "philippine-tax-intent-analyzer.js",
  "philippine-tax-domain-boundary.js",
  "philippine-tax-boundary-patterns.js"
]);

const SEMANTIC_BASE = Object.freeze({
  servicesTreeDigest: "73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775",
  files: {
    "philippine-tax-intent-analyzer.js": "bb48aa0f943fc1a5d081822f8661c356a0eb727c2e4b4cc0368fd42958d8a456",
    "philippine-tax-domain-boundary.js": "0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039",
    "philippine-tax-boundary-patterns.js": "3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa"
  },
  // Recorded in COMMIT_5R1C37_REASON_CONTRACT_SPECIFICATION.json semanticBase.
  declaredScores: { reason: "3575/3720", decision: "3720/3720", relation: "3720/3720" }
});

// ── Primitives. normLf matches commit5r1c13-lib.mjs exactly so that a CRLF
//    working-tree checkout produces the same identity as the committed blob.
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const normLf = (b) => Buffer.from(b.toString("binary").replace(/\r\n/g, "\n"), "binary");

function readVerified(rel, expectedSha, label) {
  const abs = path.join(ROOT, ...rel.split("/"));
  if (!fs.existsSync(abs)) throw new Error(`MISSING_INPUT ${label}: ${rel}`);
  const raw = fs.readFileSync(abs);
  const lf = normLf(raw);
  const got = sha256(lf);
  if (got !== expectedSha) {
    throw new Error(
      `INPUT_IDENTITY_DRIFT ${label} ${rel}\n  expected ${expectedSha}\n  actual   ${got}\n` +
        `  rawBytes ${raw.length} lfBytes ${lf.length}`
    );
  }
  return { rel, raw, lf, sha256: got, rawBytes: raw.length, lfBytes: lf.length, crlfCheckout: raw.length !== lf.length };
}

function gitBlobOid(rel) {
  try {
    return execSync(`git -C "${ROOT}" rev-parse HEAD:${rel}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function gitFact(args) {
  try {
    return execSync(`git -C "${ROOT}" ${args}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

// Canonical JSON for stable per-row hashing: sorted keys, no incidental spacing.
function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k])).join(",") + "}";
}

const relTypes = (rels) => (rels || []).map((x) => (typeof x === "string" ? x : x.relation));

/**
 * Build the per-row record set. Every `actual` comes from `analyze`; every
 * `expected` is copied verbatim from the sealed oracle row.
 *
 * relationScored distinguishes the two genuinely different populations that a
 * bare "relation 3720/3720" count conflates: rows that carry a non-empty
 * expectation and are therefore substantively tested, and rows whose empty
 * expectation passes vacuously under the frozen containment semantics
 * (`expectedRels.every(...)` on an empty array is true). Reporting only the
 * total would let 2,097 untested rows read as verified.
 */
function buildPerRow(rows, analyze) {
  const perRow = [];
  const agg = {
    total: rows.length,
    decisionPass: 0,
    decisionFail: 0,
    relationPass: 0,
    relationFail: 0,
    relationScoredRows: 0,
    relationScoredPass: 0,
    relationVacuousRows: 0,
    reasonPass: 0,
    reasonFail: 0,
    allThreePass: 0
  };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const ev = analyze(r.query);
    const actualRels = relTypes(ev.relations);
    const expectedRels = relTypes(r.expectedRelations);
    const missing = expectedRels.filter((x) => !actualRels.includes(x));
    const extra = actualRels.filter((x) => !expectedRels.includes(x));

    const decisionPass = ev.decision === r.expectedDecision;
    const reasonPass = ev.reasonCode === r.expectedReasonCodeFamily;
    const relationPass = missing.length === 0; // frozen semantics: containment only
    const relationScored = expectedRels.length > 0;

    if (decisionPass) agg.decisionPass++;
    else agg.decisionFail++;
    if (relationPass) agg.relationPass++;
    else agg.relationFail++;
    if (relationScored) {
      agg.relationScoredRows++;
      if (relationPass) agg.relationScoredPass++;
    } else {
      agg.relationVacuousRows++;
    }
    if (reasonPass) agg.reasonPass++;
    else agg.reasonFail++;
    if (decisionPass && relationPass && reasonPass) agg.allThreePass++;

    const rec = {
      ordinal: i + 1,
      oracleId: r.oracleId,
      sourceSet: r.sourceSet,
      sourceRowHash: r.sourceRowHash ?? null,
      primaryCategory: r.primaryCategory ?? null,
      querySha256: sha256(Buffer.from(r.query, "utf8")),
      decision: { expected: r.expectedDecision, actual: ev.decision, pass: decisionPass },
      relation: {
        expected: expectedRels,
        actual: actualRels,
        missing,
        extra,
        pass: relationPass,
        scored: relationScored,
        semantics: "EXPECTED_SET_CONTAINMENT_ON_RELATION_FIELD_ONLY"
      },
      reason: { expected: r.expectedReasonCodeFamily, actual: ev.reasonCode, pass: reasonPass },
      allThreePass: decisionPass && relationPass && reasonPass
    };
    rec.rowEvidenceSha256 = sha256(Buffer.from(canonicalJson(rec), "utf8"));
    perRow.push(rec);
  }
  return { perRow, agg };
}

async function main() {
  const argv = process.argv.slice(2);
  const reportOnly = argv.includes("--report") || !argv.includes("--out");
  const outIdx = argv.indexOf("--out");
  const outRel = outIdx >= 0 ? argv[outIdx + 1] : null;

  const preflight = {
    root: ROOT,
    branch: gitFact("rev-parse --abbrev-ref HEAD"),
    head: gitFact("rev-parse HEAD"),
    worktreeCleanAtStart: gitFact("status --porcelain") === "",
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    networkUsed: false,
    servicesTreeMutated: false,
    modelInvoked: false
  };

  // ── inputs ───────────────────────────────────────────────────────────────
  const inR3 = readVerified(SEALED.r3.path, SEALED.r3.sha256, "R3_ORACLE");
  const inR4 = readVerified(SEALED.r4.path, SEALED.r4.sha256, "R4_ORACLE");
  const inContract = readVerified(SEALED.reasonContract.path, SEALED.reasonContract.sha256, "C37_REASON_CONTRACT");
  const inRowAdj = readVerified(SEALED.rowAdjudication.path, SEALED.rowAdjudication.sha256, "C37_145_ROW_ADJUDICATION");
  const inScorer = readVerified(SEALED.scorer.path, SEALED.scorer.sha256, "FROZEN_SCORER");

  // ── semantic base identity ───────────────────────────────────────────────
  const parts = [];
  const baseFiles = {};
  for (const name of SERVICES) {
    const v = readVerified(`${SEMANTIC_BASE_DIR}/${name}`, SEMANTIC_BASE.files[name], `SEMANTIC_BASE:${name}`);
    parts.push(v.lf);
    baseFiles[name] = { sha256: v.sha256, lfBytes: v.lfBytes, crlfCheckout: v.crlfCheckout };
  }
  const treeDigest = sha256(Buffer.concat(parts));
  if (treeDigest !== SEMANTIC_BASE.servicesTreeDigest) {
    throw new Error(`SEMANTIC_BASE_TREE_DIGEST_MISMATCH expected ${SEMANTIC_BASE.servicesTreeDigest} actual ${treeDigest}`);
  }

  // ── load the frozen scorer verbatim, and the snapshot analyzer read-only ─
  const scorerUrl = "file:///" + path.join(ROOT, ...SEALED.scorer.path.split("/")).replace(/\\/g, "/");
  const lib = await import(scorerUrl);
  if (typeof lib.scoreR3 !== "function") throw new Error("FROZEN_SCORER_MISSING_scoreR3");

  // The analyzer is self-contained ESM with no imports; loading it from the
  // snapshot path does not touch services/. `?mjs` is not usable on a .js
  // path outside a type:module package, so import the repository-relative
  // snapshot file directly — the repository package.json declares ESM.
  const analyzerUrl =
    "file:///" + path.join(ROOT, ...`${SEMANTIC_BASE_DIR}/${SERVICES[0]}`.split("/")).replace(/\\/g, "/");
  const mod = await import(analyzerUrl);
  if (typeof mod.analyzePhilippineTaxIntent !== "function") throw new Error("SEMANTIC_BASE_MISSING_ANALYZER_EXPORT");
  const analyze = (q) => mod.analyzePhilippineTaxIntent(q);

  const r3 = JSON.parse(inR3.lf.toString("utf8"));
  const r4 = JSON.parse(inR4.lf.toString("utf8"));
  if (r3.rows.length !== 3720 || r4.rows.length !== 3720) {
    throw new Error(`UNEXPECTED_ROW_COUNT r3=${r3.rows.length} r4=${r4.rows.length}`);
  }

  // ── frozen-scorer aggregate (authority for the headline counts) ──────────
  const frozenR3 = lib.scoreR3(r3.rows, analyze).counts;
  const frozenR4 = lib.scoreR3(r4.rows, analyze).counts;

  // ── independent per-row rebuild (authority for per-row evidence) ─────────
  const perR3 = buildPerRow(r3.rows, analyze);
  const perR4 = buildPerRow(r4.rows, analyze);

  // Cross-check: the per-row rebuild must agree with the frozen scorer on
  // every aggregate it can express. Disagreement means the per-row record is
  // not a faithful decomposition and must not be published as evidence.
  const crossCheck = [
    ["R3.decisionPassed", frozenR3.decisionPassed, perR3.agg.decisionPass],
    ["R3.relationPassed", frozenR3.relationPassed, perR3.agg.relationPass],
    ["R3.reasonPassed", frozenR3.total - frozenR3.reasonMismatches, perR3.agg.reasonPass],
    ["R3.canonicalPassed", frozenR3.canonicalPassed, perR3.agg.allThreePass],
    ["R3.relationRowsWithExpectations", frozenR3.relationRowsWithExpectations, perR3.agg.relationScoredRows],
    ["R3.relationRowsPassed", frozenR3.relationRowsPassed, perR3.agg.relationScoredPass],
    ["R4.decisionPassed", frozenR4.decisionPassed, perR4.agg.decisionPass],
    ["R4.relationPassed", frozenR4.relationPassed, perR4.agg.relationPass],
    ["R4.reasonPassed", frozenR4.total - frozenR4.reasonMismatches, perR4.agg.reasonPass],
    ["R4.canonicalPassed", frozenR4.canonicalPassed, perR4.agg.allThreePass],
    ["R4.relationRowsWithExpectations", frozenR4.relationRowsWithExpectations, perR4.agg.relationScoredRows],
    ["R4.relationRowsPassed", frozenR4.relationRowsPassed, perR4.agg.relationScoredPass]
  ].map(([metric, frozen, perRow]) => ({ metric, frozen, perRow, agree: frozen === perRow }));
  const crossCheckDisagreements = crossCheck.filter((c) => !c.agree);

  // ── R3 → R4 regression comparison (same analyzer, same process) ──────────
  const byIdR3 = new Map(perR3.perRow.map((x) => [x.oracleId, x]));
  const transitions = [];
  for (const b of perR4.perRow) {
    const a = byIdR3.get(b.oracleId);
    if (!a) throw new Error(`ROW_IDENTITY_MISSING_IN_R3 ${b.oracleId}`);
    if (a.reason.pass !== b.reason.pass || a.decision.pass !== b.decision.pass || a.relation.pass !== b.relation.pass) {
      transitions.push({
        oracleId: b.oracleId,
        ordinal: b.ordinal,
        reason: { r3Expected: a.reason.expected, r4Expected: b.reason.expected, actual: b.reason.actual, r3Pass: a.reason.pass, r4Pass: b.reason.pass },
        decision: { r3Pass: a.decision.pass, r4Pass: b.decision.pass },
        relation: { r3Pass: a.relation.pass, r4Pass: b.relation.pass }
      });
    }
  }
  const regressions = transitions.filter(
    (t) => (t.reason.r3Pass && !t.reason.r4Pass) || (t.decision.r3Pass && !t.decision.r4Pass) || (t.relation.r3Pass && !t.relation.r4Pass)
  );

  const residualR3 = perR3.perRow.filter((x) => !x.allThreePass).map((x) => x.oracleId);
  const residualR4 = perR4.perRow.filter((x) => !x.allThreePass).map((x) => x.oracleId);

  // ── expectation-provenance audit ─────────────────────────────────────────
  /**
   * The decisive question for reasonClosure is not "does R4 score 3720/3720"
   * — it plainly does — but "WHERE did the 145 newly-passing expectations come
   * from". If each revised expectation was set equal to the analyzer output it
   * is scored against, then the 3720/3720 figure is expectation-fitting and
   * carries no independent behavioral information, no matter how exactly it
   * reproduces.
   *
   * This audit answers that from committed bytes alone:
   *   a) the rows that fail under R3 against the semantic base,
   *   b) the rows whose expectation changed R3 -> R4,
   *   c) the identities sealed by the C37 145-row adjudication,
   * and whether each R4 revised expectation equals the sealed C37 `actual`
   * reason, i.e. equals observed analyzer behavior.
   *
   * It also proves the revision was bounded: any field other than
   * expectedReasonCodeFamily differing on any of the 3,720 rows is an
   * unauthorized change and is reported, not summarized away.
   */
  const adjudication = JSON.parse(inRowAdj.lf.toString("utf8"));
  const adjRows = Array.isArray(adjudication.rows) ? adjudication.rows : [];
  const adjById = new Map(adjRows.map((r) => [r.stableRowIdentity.oracleId, r]));
  const adjIds = new Set(adjById.keys());

  const r3ById = new Map(r3.rows.map((r) => [r.oracleId, r]));
  const r4ById = new Map(r4.rows.map((r) => [r.oracleId, r]));

  const expectationChanged = [];
  const unauthorizedFieldDiffs = [];
  for (const b of r4.rows) {
    const a = r3ById.get(b.oracleId);
    if (!a) throw new Error(`ROW_IDENTITY_MISSING_IN_R3 ${b.oracleId}`);
    if (a.expectedReasonCodeFamily !== b.expectedReasonCodeFamily) expectationChanged.push(b.oracleId);
    const ka = Object.keys(a).sort().join(",");
    const kb = Object.keys(b).sort().join(",");
    if (ka !== kb) unauthorizedFieldDiffs.push({ oracleId: b.oracleId, field: "__KEY_SET__" });
    for (const k of Object.keys(b)) {
      if (k === "expectedReasonCodeFamily") continue;
      if (canonicalJson(a[k]) !== canonicalJson(b[k])) unauthorizedFieldDiffs.push({ oracleId: b.oracleId, field: k });
    }
  }
  const changedSet = new Set(expectationChanged);
  const residualR3Set = new Set(residualR3);
  const setsEqual = (x, y) => x.size === y.size && [...x].every((v) => y.has(v));

  let revisedEqualsSealedActual = 0;
  const revisedNotEqualSealedActual = [];
  let sealedActualDifferedFromR3Expected = 0;
  for (const id of adjIds) {
    const sealedActual = adjById.get(id).actual.reason;
    const r4Expected = r4ById.get(id) ? r4ById.get(id).expectedReasonCodeFamily : undefined;
    const r3Expected = r3ById.get(id) ? r3ById.get(id).expectedReasonCodeFamily : undefined;
    if (sealedActual === r4Expected) revisedEqualsSealedActual++;
    else revisedNotEqualSealedActual.push({ oracleId: id, sealedActual, r4Expected });
    if (sealedActual !== r3Expected) sealedActualDifferedFromR3Expected++;
  }

  // Does each revised expectation equal the reason THIS run observed from the
  // semantic base? If yes, the expectation was fitted to the observation.
  const perR4ById = new Map(perR4.perRow.map((x) => [x.oracleId, x]));
  let revisedEqualsObservedThisRun = 0;
  for (const id of changedSet) {
    const rec = perR4ById.get(id);
    if (rec && rec.reason.expected === rec.reason.actual) revisedEqualsObservedThisRun++;
  }

  const expectationProvenanceAudit = {
    question:
      "Did reason 3575 -> 3720 result from changed runtime behavior, or from expectations being revised to equal observed behavior?",
    r3FailingRowCount: residualR3Set.size,
    c37AdjudicatedRowCount: adjIds.size,
    r3ToR4ExpectationChangeCount: changedSet.size,
    r3FailingRowsEqualC37AdjudicatedRows: setsEqual(residualR3Set, adjIds),
    expectationChangesEqualC37AdjudicatedRows: setsEqual(changedSet, adjIds),
    revisedExpectationEqualsSealedC37Actual: `${revisedEqualsSealedActual}/${adjIds.size}`,
    revisedExpectationNotEqualSealedC37Actual: revisedNotEqualSealedActual,
    sealedC37ActualDifferedFromR3Expectation: `${sealedActualDifferedFromR3Expected}/${adjIds.size}`,
    revisedExpectationEqualsReasonObservedInThisRun: `${revisedEqualsObservedThisRun}/${changedSet.size}`,
    unauthorizedFieldDiffCount: unauthorizedFieldDiffs.length,
    unauthorizedFieldDiffs: unauthorizedFieldDiffs.slice(0, 50),
    revisionWasBoundedToExpectedReasonCodeFamily: unauthorizedFieldDiffs.length === 0,
    expectedDecisionChangesR3ToR4: r3.rows.filter(
      (a) => r4ById.get(a.oracleId) && a.expectedDecision !== r4ById.get(a.oracleId).expectedDecision
    ).length,
    expectedRelationChangesR3ToR4: r3.rows.filter(
      (a) =>
        r4ById.get(a.oracleId) &&
        canonicalJson(a.expectedRelations) !== canonicalJson(r4ById.get(a.oracleId).expectedRelations)
    ).length,
    finding:
      "Determined by the fields above; see interpretation. This audit states measurements, and the interpretation is entailed by them, not asserted independently of them.",
    interpretation:
      revisedEqualsObservedThisRun === changedSet.size && changedSet.size > 0
        ? "EXPECTATION_FITTED_TO_OBSERVED_BEHAVIOR: every revised expectation equals the reason the semantic base emits for that row. The R4 reason score of 3720/3720 therefore carries no independent behavioral information about the 145 rows; it restates observed output as expectation. Runtime behavior is byte-identical between the R3 and R4 scoring runs (same servicesTreeDigest), so no behavioral improvement occurred."
        : "MIXED_OR_NON_FITTED: at least one revised expectation does not equal observed output; inspect revisedExpectationNotEqualSealedC37Actual and the per-row artifacts."
  };

  // ── residual enumeration (what is actually still unresolved) ─────────────

  const result = {
    schemaVersion: 1,
    unit: "PHASE-10A-REASON-DECISION-RELATION-PER-ROW-CLOSURE-EVIDENCE-V1",
    classification: "CANDIDATE_EVIDENCE_PENDING_OWNER_AUTHORIZATION_AND_INDEPENDENT_REVIEW",
    preflight,
    inputs: {
      r3: { ...SEALED.r3, gitBlobOid: gitBlobOid(SEALED.r3.path), verified: true, crlfCheckout: inR3.crlfCheckout },
      r4: { ...SEALED.r4, gitBlobOid: gitBlobOid(SEALED.r4.path), verified: true, crlfCheckout: inR4.crlfCheckout },
      reasonContract: { ...SEALED.reasonContract, gitBlobOid: gitBlobOid(SEALED.reasonContract.path), verified: true },
      rowAdjudication: { ...SEALED.rowAdjudication, gitBlobOid: gitBlobOid(SEALED.rowAdjudication.path), verified: true },
      frozenScorer: { ...SEALED.scorer, gitBlobOid: gitBlobOid(SEALED.scorer.path), verified: true, usedBy: "IMPORTED_VERBATIM_NOT_REIMPLEMENTED" }
    },
    semanticBase: {
      dir: SEMANTIC_BASE_DIR,
      servicesOrder: SERVICES,
      files: baseFiles,
      servicesTreeDigest: treeDigest,
      declaredServicesTreeDigest: SEMANTIC_BASE.servicesTreeDigest,
      digestVerified: true,
      declaredScores: SEMANTIC_BASE.declaredScores,
      note:
        "COMMIT_5R1C37_REASON_CONTRACT_SPECIFICATION.json names this snapshot the operative semantic base and states that the committed live services/ tree is a restored scaffold and NOT a substitute semantic base. Scoring against committed live services/ would therefore not reproduce the controlling metrics and must not be substituted."
    },
    frozenScorerCounts: { r3: frozenR3, r4: frozenR4 },
    perRowAggregate: { r3: perR3.agg, r4: perR4.agg },
    crossCheck,
    crossCheckDisagreements,
    perRowFaithfulDecomposition: crossCheckDisagreements.length === 0,
    reproductionOfDeclaredScores: {
      r3ReasonDeclared: SEMANTIC_BASE.declaredScores.reason,
      r3ReasonComputed: `${frozenR3.total - frozenR3.reasonMismatches}/${frozenR3.total}`,
      r3DecisionDeclared: SEMANTIC_BASE.declaredScores.decision,
      r3DecisionComputed: `${frozenR3.decisionPassed}/${frozenR3.total}`,
      r3RelationDeclared: SEMANTIC_BASE.declaredScores.relation,
      r3RelationComputed: `${frozenR3.relationPassed}/${frozenR3.total}`,
      exactReproduction:
        `${frozenR3.total - frozenR3.reasonMismatches}/${frozenR3.total}` === SEMANTIC_BASE.declaredScores.reason &&
        `${frozenR3.decisionPassed}/${frozenR3.total}` === SEMANTIC_BASE.declaredScores.decision &&
        `${frozenR3.relationPassed}/${frozenR3.total}` === SEMANTIC_BASE.declaredScores.relation
    },
    regressionComparison: {
      method: "SAME_ANALYZER_SAME_PROCESS_R3_BASELINE_VS_R4_CANDIDATE",
      transitionCount: transitions.length,
      regressionCount: regressions.length,
      regressions,
      newRegressionsIntroducedByR4: regressions.length > 0
    },
    expectationProvenanceAudit,
    residuals: {
      r3: { count: residualR3.length, oracleIds: residualR3 },
      r4: { count: residualR4.length, oracleIds: residualR4 }
    },
    closureAdmissibility: {
      decisionPerRowEvidenceNowExists: true,
      relationPerRowEvidenceNowExists: true,
      reasonPerRowEvidenceNowExists: true,
      relationSubstantiveCoverage: {
        rowsWithNonEmptyExpectation: perR4.agg.relationScoredRows,
        rowsPassingSubstantively: perR4.agg.relationScoredPass,
        rowsPassingVacuously: perR4.agg.relationVacuousRows,
        caution:
          "A bare 'relation 3720/3720' conflates substantively tested rows with rows whose empty expectation passes vacuously under containment semantics. Both figures are reported so neither can be mistaken for the other."
      },
      independent: false,
      holdout: false,
      unseen: false,
      blind: false,
      basis:
        "The R4 oracle revised expectedReasonCodeFamily on 145 rows to equal the sealed C37 actual reason values. R20_DEVELOPMENT_ORACLE_R4_INDEX.json records independent=false, holdout=false, blind=false, and CURRENT_STATE.md records the resulting 3720/3720 algebra as 'analyzer-informed expectation governance ... not independent, holdout, unseen, or blind closure evidence'. This runner reproduces that algebra from committed bytes; reproducing it does not convert it into independent evidence.",
      verdict:
        "PER_ROW_EVIDENCE_SUFFICIENT_FOR_DEVELOPMENT_GOVERNANCE_ALGEBRA; NOT_SUFFICIENT_FOR_INDEPENDENT_CLOSURE",
      whatIndependentClosureWouldStillRequire: [
        "An unseen/holdout query corpus not used to derive or revise any expectation, scored against the same semantic base.",
        "Or a runtime change that makes the semantic base emit the R3 expectations without expectation revision.",
        "Either path is a separately governed unit requiring explicit owner authorization; neither is performed here."
      ]
    },
    doNotInfer: [
      "This runner does not declare reasonClosure, decisionClosure, or relationClosure SATISFIED.",
      "This runner does not modify A15 V1, knowledge/CURRENT_STATE.md, or the controlling roadmap.",
      "This runner does not authorize any Phase 10A closure action."
    ]
  };

  if (reportOnly) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return crossCheckDisagreements.length === 0 && regressions.length === 0 ? 0 : 1;
  }

  // ── bounded, non-overwriting output ─────────────────────────────────────
  const outAbs = path.resolve(ROOT, outRel);
  const allowedAbs = path.resolve(ROOT, ALLOWED_OUTPUT_ROOT);
  const rel = path.relative(allowedAbs, outAbs);
  if (rel !== "" && (rel.startsWith("..") || path.isAbsolute(rel))) {
    throw new Error(`OUTPUT_OUTSIDE_ALLOWLIST ${outRel} (allowed: ${ALLOWED_OUTPUT_ROOT})`);
  }
  if (fs.existsSync(outAbs)) throw new Error(`OUTPUT_EXISTS_REFUSING_OVERWRITE ${outRel}`);
  fs.mkdirSync(outAbs, { recursive: true });

  const written = [];
  const writeArtifact = (name, obj) => {
    const body = JSON.stringify(obj, null, 2).replace(/\r\n/g, "\n") + "\n";
    fs.writeFileSync(path.join(outAbs, name), body, { flag: "wx" });
    written.push({ name, bytes: Buffer.byteLength(body, "utf8"), sha256: sha256(Buffer.from(body, "utf8")) });
  };

  writeArtifact("PER_ROW_EVIDENCE_R3.json", {
    unit: result.unit, oracle: "R3", oracleSha256: SEALED.r3.sha256,
    servicesTreeDigest: treeDigest, aggregate: perR3.agg, rows: perR3.perRow
  });
  writeArtifact("PER_ROW_EVIDENCE_R4.json", {
    unit: result.unit, oracle: "R4", oracleSha256: SEALED.r4.sha256,
    servicesTreeDigest: treeDigest, aggregate: perR4.agg, rows: perR4.perRow
  });
  writeArtifact("RESULT.json", result);

  const manifestLines = written.map((w) => `${w.sha256}  ${w.name}`).join("\n") + "\n";
  fs.writeFileSync(path.join(outAbs, "EVIDENCE_MANIFEST.sha256"), manifestLines, { flag: "wx" });

  process.stdout.write(
    JSON.stringify(
      { outDir: outRel, written, manifest: "EVIDENCE_MANIFEST.sha256", selfExcluded: true, result: { ...result, } },
      null,
      2
    ) + "\n"
  );
  return crossCheckDisagreements.length === 0 && regressions.length === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`FAIL_CLOSED ${err && err.message ? err.message : String(err)}\n`);
    process.exit(2);
  }
);
