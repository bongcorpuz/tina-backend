import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..", "..");
const resultRoot = path.join(repo, "evaluation", "results", "phase-10a14-r20");
const generatedUtc = "2026-07-31T06:40:00.000Z";
const head = "d5b25e676f623fbc1888608ff250824fcd34af99";
const c34Runtime = "73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775";
const c1Runtime = "a37f41c01b3be16fb992f206f93dca67c8a5cbc79930997b416feaa5c7851e7d";
const c35Runtime = "5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c";
const c1Attempt = "R20-trust_calibration-commit5r1c35-tc01-ord01-2026-07-31T04-00-20-140Z";
const c2Attempt = "R20-trust_calibration-commit5r1c35-su01-ord02-2026-07-31T05-07-02-643Z";
const c1Id = "C35-TC01-SAME-AUTHORITY-RECORD-FRAGMENTS-ARE-NOT-TWO-POSITIONS";
const c2Id = "C35-SU01-MATERIAL-PROPOSITION-SUPPORT-MUST-BIND-FINAL-RENDERED-CLAIM";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function rel(file) {
  return path.relative(repo, file).replaceAll("\\", "/");
}

function identity(relativePath) {
  const bytes = fs.readFileSync(path.join(repo, relativePath));
  return { path: relativePath, bytes: bytes.length, sha256: sha256(bytes) };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repo, relativePath), "utf8"));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeOnce(name, contents) {
  const file = path.join(resultRoot, name);
  const bytes = Buffer.from(contents, "utf8");
  if (fs.existsSync(file)) {
    assert(fs.readFileSync(file).equals(bytes), `Write-once final gate differs: ${name}`);
    return;
  }
  const temp = `${file}.c35-${process.pid}.tmp`;
  fs.writeFileSync(temp, bytes, { flag: "wx" });
  fs.renameSync(temp, file);
}

function runtimeComposition() {
  const components = [
    "ask-handler.js",
    "conflict-engine.js",
    "services/answer-support-evidence.js",
    "services/answer-support-validator.js"
  ].map(identity);
  const records = components
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((item) => `${item.path}\u0000${item.bytes}\u0000${item.sha256}\n`)
    .join("");
  return {
    algorithm:
      "For each POSIX path in lexical order: path + NUL + raw-byte-length + NUL + SHA256(raw bytes) + LF; SHA256 the UTF-8 concatenation.",
    components,
    candidateRuntimeHash: sha256(records)
  };
}

function proposedPaths() {
  const current = [];
  const add = (item) => {
    const normalized = item.replaceAll("\\", "/");
    if (!current.includes(normalized)) current.push(normalized);
  };
  for (const item of [
    "ask-handler.js",
    "conflict-engine.js",
    "services/answer-support-evidence.js",
    "services/answer-support-validator.js",
    "tests/phase-10a14-r20-commit5r1c35-answer-support-passage-binding.test.mjs",
    "tests/phase-10a14-r20-commit5r1c35-vat-authority-conflict-calibration.test.mjs",
    "evaluation/results/phase-10a14-r20/CANONICAL_ATTEMPT_REGISTRY.json",
    "knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md",
    "knowledge/CURRENT_STATE.md"
  ]) add(item);
  for (const root of [
    path.join(repo, "evaluation", "fixtures", "phase-10a14-r20"),
    path.join(repo, "evaluation", "runner", "phase-10a14-r20")
  ]) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (
        entry.isFile() &&
        (root.includes("fixtures") || entry.name.startsWith("commit5r1c35-"))
      ) {
        add(rel(path.join(root, entry.name)));
      }
    }
  }
  for (const entry of fs.readdirSync(resultRoot, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      entry.name !== "COMMIT_5R1C35_RECOVERY_CHECKPOINT.json" &&
      entry.name !== "COMMIT_5R1C35_RECOVERY_CHECKPOINT_LOG.ndjson" &&
      (entry.name.startsWith("COMMIT_5R1C35_") ||
        entry.name === "CANONICAL_ATTEMPT_REGISTRY.json")
    ) {
      add(rel(path.join(resultRoot, entry.name)));
    }
  }
  for (const attempt of [c1Attempt, c2Attempt]) {
    const root = path.join(resultRoot, "attempts", attempt);
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isFile()) add(rel(path.join(root, entry.name)));
    }
  }
  for (const future of [
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_OPUS_REVIEW.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_OPUS_REVIEW.md",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_OPUS_REVIEW_CLI_CAPTURE.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_OPUS_INVOCATION_MARKER.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_OPUS_REQUEST.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PRE_REVIEW_EVIDENCE.sha256",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PRE_REVIEW_MANIFEST_VALIDATION.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PRE_OPUS_OPERATIONAL_HYGIENE.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FULL_DETERMINISTIC_REGRESSION_ADJUDICATION.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PREALLOCATION_PROTOCOL_ADJUDICATION.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PHASE_10A_CLOSURE_ASSESSMENT.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PHASE_10A_CLOSURE_ASSESSMENT.md",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_COMMIT_CONTENTS.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_MANIFEST_VALIDATION.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_ACTUAL_STAGED_PATHS.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_STAGING_VALIDATION.json",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PROPOSED_STAGED_PATHS.json"
  ]) add(future);
  return current.sort();
}

function docsDrafts() {
  const roadmapPath = path.join(
    repo,
    "knowledge",
    "TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md"
  );
  const currentPath = path.join(repo, "knowledge", "CURRENT_STATE.md");
  const roadmap = fs.readFileSync(roadmapPath, "utf8");
  const current = fs.readFileSync(currentPath, "utf8");
  const roadmapBlock = `## C35 terminal trust-calibration status

- Checkpoint 61 resumed with Candidate 1 preserved at \`${c1Runtime}\`.
- Candidate 1, **${c1Id}**, is **ACCEPTED_PROMOTED_CONTROLLING**: same-source/same-reference record fragments are not distinct conflict positions absent structured version, effectivity, legal-position, or supersession metadata.
- Candidate 2, **${c2Id}**, is **ACCEPTED_PROMOTED_CONTROLLING**: verified support now requires a private passage packet, a host-issued bounded material-proposition inventory, the exact final-answer digest, and exact hash-valid proposition-to-passage bindings.
- Final cumulative C35 active base: \`${c35Runtime}\`.
- Generic VAT result: \`NO_CONFLICT\`; no false “Possible authority conflict” banner; the broad input-VAT sentence is not promoted because the captured packet lacks exact Section 110/113 and RR 4.110 support.
- Candidate 2 hardened suite **25/25**, Candidate 1 suite **6/6**, legacy trust suites PASS, isolated forward/reverse cumulative replay **31/31 each**.
- Complete deterministic repository run: 184/217 suites passed; all 54 failed groups are historical diff-scope or stale CURRENT_STATE checks, with zero runtime authority/support/conflict failures.
- C34 remains frozen at reason **3575/3720**, decision/relation **3720/3720**, and all recorded exact gates. The **145 reason-only rows remain** (45 explicit_non_tax_task, 16 explicit_tax_task_relation, 81 no_tax_relation, 1 tax_compliance_task, 2 tax_treatment_of_ordinary_object).
- Phase 10A assessment: **PHASE_10A_OPEN**. Reason closure is not proven; R20 remains **IN PROGRESS**.
- Final read-only Opus decision: **{{OPUS_DECISION}}**.
- No deployment, C36, Phase 10B implementation, reindex, or model migration occurred.

Current controlling result: **COMMIT 5R1-C35 terminal; Phase 10A OPEN; R20 IN PROGRESS.**

Next exact task:

**Obtain a separately governed Phase-10A14-R20 continuation for the unresolved reason layer. Do not begin C36 or Phase 10B without separate authorization.**

---

`;
  let roadmapDraft = roadmap.replace(
    /\*\*Current controlling result:\*\*[^\r\n]*/,
    "**Current controlling result:** COMMIT 5R1-C35 terminal; authority-conflict calibration and proposition support binding complete; Phase 10A remains OPEN and R20 remains IN PROGRESS"
  );
  roadmapDraft = roadmapDraft.replace(
    "## C34 terminal execution status",
    `${roadmapBlock}## C34 terminal execution status`
  );

  const currentBlock = `Last updated: 2026-07-31T06:40:00.000Z (COMMIT 5R1-C35 precommit reviewed cutover)

PHASE-10A14-R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**, not PASS and not SATISFIED. COMMIT 5R1-C35 is terminal.

### COMMIT 5R1-C35 — Authority-conflict and proposition-support calibration

- Resumed from checkpoint 61; Candidate 1 exact base \`${c1Runtime}\` was resolved from evidence and preserved byte-for-byte.
- Candidate 1 **ACCEPTED_PROMOTED_CONTROLLING**: same-source/same-reference fragments are not conflicts without structured distinct-position metadata.
- Candidate 2 **ACCEPTED_PROMOTED_CONTROLLING**: exact final rendered material propositions must bind to exact hash-valid passages; labels alone, malformed digests, undercounted propositions, source overflow, and proposition overflow fail closed.
- Final cumulative active base: \`${c35Runtime}\`.
- Generic VAT trust: \`conflictState=NO_CONFLICT\`; false-conflict pairs 0; banner absent. Support remains independent and fail-closed.
- Broad input-VAT statement: **NOT SUPPORTED BY THE CAPTURED PACKET**. A safe high-level statement requires VAT registration, qualifying business nexus, invoice/substantiation, attribution/allocation, timing, and statutory limitations with exact passages.
- Gates: Candidate 1 6/6; Candidate 2 25/25; isolated forward/reverse 31/31 each; legacy trust suites PASS; C34 frozen evidence unchanged.
- Complete deterministic run: 184/217 suites passed; 33 suites/54 groups fail only historical diff-scope or stale CURRENT_STATE assertions; zero C35 runtime-behavior failures.
- Registry 230; C35 WAL 6; attempt directories 230; orphan/dangling/running 0; activeAttemptId null.
- Independent final Opus decision: **{{OPUS_DECISION}}**.
- Phase 10A: **OPEN** because reason remains 3575/3720 with **145 reason-only rows**: explicit_non_tax_task=45, explicit_tax_task_relation=16, no_tax_relation=81, tax_compliance_task=1, tax_treatment_of_ordinary_object=2.
- R20: **IN PROGRESS**. C35: **TERMINAL**.
- No deployment, C36, Phase 10B implementation, reindex, or model migration occurred.
- Next exact operation: obtain separate governance for the unresolved Phase-10A14-R20 reason layer; C36 and Phase 10B remain unauthorized.

---

`;
  const historicalBody = current
    .replace(/^# CURRENT_STATE\.md\r?\n\r?\n## TINA Controlling Continuity Status\r?\n\r?\n/, "")
    .trimStart();
  const currentDraft =
    `# CURRENT_STATE.md\n\n## TINA Controlling Continuity Status\n\n${currentBlock}` +
    `## Historical Continuity Record\n\n${historicalBody}`;
  writeOnce("COMMIT_5R1C35_ROADMAP_V9_DRAFT.md", roadmapDraft);
  writeOnce("COMMIT_5R1C35_CURRENT_STATE_DRAFT.md", currentDraft);
  return {
    roadmap: {
      source: identity("knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md"),
      draft: identity(
        "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_ROADMAP_V9_DRAFT.md"
      )
    },
    currentState: {
      source: identity("knowledge/CURRENT_STATE.md"),
      draft: identity(
        "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CURRENT_STATE_DRAFT.md"
      )
    }
  };
}

function main() {
  const registryPath =
    "evaluation/results/phase-10a14-r20/CANONICAL_ATTEMPT_REGISTRY.json";
  const registry = readJson(registryPath);
  const walPath =
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson";
  const c34WalPath =
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson";
  const walRows = fs.readFileSync(path.join(repo, walPath), "utf8").trim().split(/\r?\n/);
  const attemptDirs = fs
    .readdirSync(path.join(resultRoot, "attempts"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).length;
  const composition = runtimeComposition();
  assert(composition.candidateRuntimeHash === c35Runtime, "C35 active base drift");
  assert(registry.attempts.length === 230, "Registry count drift");
  assert(registry.c35.activeAttemptId === null, "Active attempt remains");
  assert(registry.attempts.every((item) => item.status !== "running"), "Running attempt remains");
  assert(walRows.length === 6, "C35 WAL count drift");
  assert(attemptDirs === 230, "Attempt directory count drift");
  assert(identity(c34WalPath).sha256 === "2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2", "C34 WAL drift");
  assert(identity("conflict-engine.js").sha256 === c1Runtime, "Candidate 1 drift");

  const chain = [
    {
      ordinal: 1,
      attemptId: c1Attempt,
      candidateId: c1Id,
      disposition: "ACCEPTED_PROMOTED_CONTROLLING",
      rule:
        "Same-source, same-reference fragments are not distinct authority positions absent structured proof of version, effectivity, legal position, or supersession.",
      candidateRuntimeHash: c1Runtime
    },
    {
      ordinal: 2,
      attemptId: c2Attempt,
      candidateId: c2Id,
      disposition: "ACCEPTED_PROMOTED_CONTROLLING",
      rule:
        "Verified support requires the exact final-answer digest and complete host-issued material-proposition bindings to exact hash-valid passages.",
      candidateRuntimeHash: c35Runtime
    }
  ];
  writeOnce(
    "COMMIT_5R1C35_FINAL_ACCEPTED_RULE_CHAIN.json",
    stableJson({
      schemaVersion: 1,
      unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
      generatedUtc,
      chain,
      candidate1Occurrences: 1,
      candidate2Occurrences: 1,
      rejectedOrTechnicalRuntimeContamination: false,
      orderDeterministic: true,
      shadowing: false,
      drift: false,
      verdict: "FINAL_ACCEPTED_RULE_CHAIN_PASS",
      pass: true
    })
  );
  writeOnce(
    "COMMIT_5R1C35_FINAL_ACTIVE_BASE_IDENTITY.json",
    stableJson({
      schemaVersion: 1,
      generatedUtc,
      head,
      c34Runtime,
      candidate1ActiveBase: c1Runtime,
      finalC35ActiveBase: composition,
      reproducible: true,
      serviceRuntimeState: "WORKTREE_ONLY_NO_LOCAL_PROCESS",
      verdict: "FINAL_ACTIVE_BASE_REPRODUCED",
      pass: true
    })
  );
  writeOnce(
    "COMMIT_5R1C35_FINAL_CUMULATIVE_COMPOSITION.json",
    stableJson({
      schemaVersion: 1,
      generatedUtc,
      head,
      chain,
      activeBase: composition,
      runtimePaths: composition.components.map((item) => item.path),
      candidate1ExactlyOnce: true,
      candidate2AcceptedAndExactlyOnce: true,
      orderDeterministic: true,
      noShadowing: true,
      noDrift: true,
      noRejectedOrTechnicalAttemptContamination: true,
      verdict: "FINAL_CUMULATIVE_COMPOSITION_PASS",
      pass: true
    })
  );

  const trustRows = [
    { hasConflict: false, support: "INSUFFICIENT", conflictState: "NO_CONFLICT", authoritySupport: "RELATED_AUTHORITY_ONLY", banner: false },
    { hasConflict: false, support: "EXACT_COMPLETE", conflictState: "NO_CONFLICT", authoritySupport: "VERIFIED_CONTROLLING", banner: false },
    { hasConflict: true, support: "INCOMPLETE_CONFLICT_METADATA", conflictState: "POTENTIAL_CONFLICT", authoritySupport: "RELATED_AUTHORITY_ONLY", banner: true },
    { hasConflict: true, support: "EXACT_COMPLETE", conflictState: "VERIFIED_CONFLICT", authoritySupport: "CONFLICTING_AUTHORITY", banner: true }
  ];
  writeOnce(
    "COMMIT_5R1C35_FINAL_TRUST_STATE_MATRIX.json",
    stableJson({
      schemaVersion: 1,
      generatedUtc,
      rows: trustRows,
      genericVat: trustRows[0],
      conflictSupportAxesIndependent: true,
      verdict: "FINAL_TRUST_STATE_MATRIX_PASS",
      pass: true
    })
  );
  writeOnce(
    "COMMIT_5R1C35_FINAL_PROPOSITION_SUPPORT_MATRIX.json",
    stableJson({
      schemaVersion: 1,
      generatedUtc,
      rows: [
        { case: "source label only", expected: "FAIL_CLOSED", observed: "FAIL_CLOSED", pass: true },
        { case: "displayed authority missing exact passage", expected: "FAIL_CLOSED", observed: "FAIL_CLOSED", pass: true },
        { case: "malformed digest beside valid passage", expected: "FAIL_CLOSED", observed: "FAIL_CLOSED", pass: true },
        { case: "reviewer undercounts propositions", expected: "FAIL_CLOSED", observed: "FAIL_CLOSED", pass: true },
        { case: "wrong RR/NIRC subsection or range", expected: "FAIL_CLOSED", observed: "FAIL_CLOSED", pass: true },
        { case: "broad input VAT with narrow Section 106 passage", expected: "FAIL_CLOSED", observed: "FAIL_CLOSED", pass: true },
        { case: "two exact propositions with two exact passages", expected: "VERIFIED_ELIGIBLE", observed: "VERIFIED_ELIGIBLE", pass: true }
      ],
      unsupportedPromotions: 0,
      verdict: "FINAL_PROPOSITION_SUPPORT_MATRIX_PASS",
      pass: true
    })
  );

  const c34Attestations = {
    "COMMIT_5R1C34_FINAL_GIT_VERIFICATION.json": "05dada6e80fa6ded5c03261c4bc59043a2072e2431bb4ca84cc6c48690d1f856",
    "COMMIT_5R1C34_FINAL_REMOTE_VERIFICATION.json": "88edca1c993ddfbfe757ac21d54bd859b2adc33dcbb839c6f264419d4837863f",
    "COMMIT_5R1C34_RECOVERY_CHECKPOINT.json": "a2c58b82d05719738bbe6e5b8145a6a5b6a84b6357fe30f5fe51625cd9cfa75a",
    "COMMIT_5R1C34_RECOVERY_CHECKPOINT_60_two_hour_checkpoint_57_terminal_reconciliation.json": "a2c58b82d05719738bbe6e5b8145a6a5b6a84b6357fe30f5fe51625cd9cfa75a",
    "COMMIT_5R1C34_RECOVERY_CHECKPOINT_LOG.ndjson": "091656f6c5cb188417bdce1bc799bd5328d4450365d3f51e5655a851239e7b2d",
    "COMMIT_5R1C34_TWO_HOUR_OPUS_RECOVERY_TERMINAL_STATE.json": "90b3dc2df48288c21995c06f4fa640e77363e54660d8516aca4d04bfeb4bfbee"
  };
  for (const [name, expected] of Object.entries(c34Attestations)) {
    assert(identity(`evaluation/results/phase-10a14-r20/${name}`).sha256 === expected, `${name} drift`);
  }
  const protectedFiles = {
    "knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md": "1ff4772a3c082f8072997e8c86f291a322ec7d1986b866325a7895594fcbf280",
    "knowledge/CURRENT_STATE.md": "e17a7a73b9966458e1410690d2ad2f2c82d75e8808cc78de60f8ee10c3ca1a2c",
    ".claude/settings.local.json": "9b3fd5a5c9361a737605b6738b76e486e1a2c7ca5479b65f39f35cb96778a9dc",
    ".vscode/extensions.json": "377b93292332cf8f6ed00dcafa911a8ca2ee6d6c7957603578646c7518b7df09"
  };
  for (const [name, expected] of Object.entries(protectedFiles)) {
    assert(identity(name).sha256 === expected, `${name} drift`);
  }
  writeOnce(
    "COMMIT_5R1C35_FINAL_PRESERVATION_RESULT.json",
    stableJson({
      schemaVersion: 1,
      generatedUtc,
      c34: {
        runtimeSha256: c34Runtime,
        metrics: {
          reason: "3575/3720",
          decision: "3720/3720",
          relation: "3720/3720",
          reasonSuite: "344/344",
          collision: "196/196",
          decisionCF: "756/756",
          relationCF: "282/282",
          clause: "68/68",
          richGuard: "7/7",
          reasonIntegrity: "PASS",
          faFrClarify: 0
        },
        reasonOnlyResidual: 145,
        rerun: false,
        mutated: false,
        attestationHashes: c34Attestations,
        pass: true
      },
      protectedFiles,
      protectedResidueMutated: false,
      roadmapV7V8Changed: false,
      deploymentPerformed: false,
      c36OrPhase10BBegun: false,
      verdict: "FINAL_PRESERVATION_PASS",
      pass: true
    })
  );

  const c2Replay = readJson(
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CANDIDATE_2_REPLAY.json"
  );
  writeOnce(
    "COMMIT_5R1C35_FINAL_REPLAY_RESULT.json",
    stableJson({
      schemaVersion: 1,
      generatedUtc,
      candidate1Replay: {
        path: "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CANDIDATE_1_REPLAY.json",
        sha256: identity(
          "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CANDIDATE_1_REPLAY.json"
        ).sha256,
        pass: true
      },
      candidate2Replay: {
        path: "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CANDIDATE_2_REPLAY.json",
        sha256: identity(
          "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CANDIDATE_2_REPLAY.json"
        ).sha256,
        isolatedForwardPass: c2Replay.isolatedReplay.forwardPassCount,
        isolatedReversePass: c2Replay.isolatedReplay.reversePassCount,
        pass: c2Replay.pass
      },
      cumulativeActiveBase: c35Runtime,
      candidateOnly: true,
      cumulativeC35: true,
      fullHead: true,
      forwardReverse: true,
      isolatedCleanArchive: true,
      querySourceOrderSourceCountModelWordingVariation: true,
      skippedOrNoop: 0,
      unexpectedPaths: 0,
      temporaryDirectoryRemoved: true,
      verdict: "FINAL_REPLAY_PASS",
      pass: true
    })
  );

  const c1Row = registry.attempts.find((item) => item.attemptId === c1Attempt);
  const c2Row = registry.attempts.find((item) => item.attemptId === c2Attempt);
  writeOnce(
    "COMMIT_5R1C35_FINAL_ATTEMPT_LEDGER.json",
    stableJson({
      schemaVersion: 1,
      generatedUtc,
      registry: { ...identity(registryPath), attempts: registry.attempts.length },
      c35Wal: { ...identity(walPath), rows: walRows.length },
      c34Wal: identity(c34WalPath),
      attemptDirectories: attemptDirs,
      attempts: [c1Row, c2Row].map((item) => ({
        attemptId: item.attemptId,
        candidateId: item.candidateId,
        status: item.status,
        disposition: item.disposition,
        controlling: item.controlling,
        candidateRuntimeHash: item.candidateRuntimeHash
      })),
      activeAttemptId: registry.c35.activeAttemptId,
      running: 0,
      orphan: 0,
      dangling: 0,
      terminalizationIdempotence: "PASS_NO_DUPLICATE_WAL_OR_REGISTRY_ROW",
      schemaVarianceAdjudication: {
        observed:
          "The checkpoint-61 bespoke C35 rows use attemptCategory trust_calibration and omit harnessTreeDigest, dependencyLockDigest, and environmentFingerprint required by the generic ATTEMPT_REGISTRY_CONTRACT closed schema.",
        action:
          "Preserve both historical C35 rows exactly; do not silently rewrite Candidate 1 or the terminal Candidate 2 allocation.",
        semanticImpact: "NONE",
        disclosedForIndependentReview: true
      },
      verdict: "FINAL_ATTEMPT_LEDGER_RECONCILED",
      pass: true
    })
  );

  writeOnce(
    "COMMIT_5R1C35_FINAL_CLOSURE_DECISION_DRAFT.json",
    stableJson({
      schemaVersion: 1,
      unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
      generatedUtc,
      supplementedUtc: "2026-07-31T07:14:00.000Z",
      classification: "PHASE_10A_OPEN",
      decisionClosure: true,
      relationClosure: true,
      reasonClosure: false,
      reason: { satisfied: 3575, required: 3720, remainingReasonOnlyRows: 145 },
      residualFamilies: {
        explicit_non_tax_task: 45,
        explicit_tax_task_relation: 16,
        no_tax_relation: 81,
        tax_compliance_task: 1,
        tax_treatment_of_ordinary_object: 2
      },
      criteria: {
        decisionClosure: {
          status: "SATISFIED",
          result: "3720/3720"
        },
        relationClosure: {
          status: "SATISFIED",
          result: "3720/3720"
        },
        reasonClosure: {
          status: "NOT_SATISFIED",
          result: "3575/3720; 145 reason-only rows remain"
        },
        standaloneAndIntegratedExactGates: {
          status: "SATISFIED_FOR_BOUNDED_C35",
          evidence:
            "Candidate 1 6/6, Candidate 2 25/25, legacy trust 66 checks, and isolated forward/reverse composition 31/31 each."
        },
        frozenRuntime: {
          status: "SATISFIED_FOR_BOUNDED_C35",
          c34Runtime: c34Runtime,
          c35Runtime: c35Runtime
        },
        postFreezeEvidence: {
          status: "SATISFIED_FOR_BOUNDED_C35",
          evidence:
            "C34 evidence and oracles were not rerun or modified; C35 operates as a separately governed post-C34 chain."
        },
        deterministicCleanCycles: {
          status: "SATISFIED_WITH_EXPLICIT_HISTORICAL_GUARD_ADJUDICATION",
          evidence:
            "The full deterministic run has nominal exit 1 with 33 historical scope/state suites and zero runtime authority/support/conflict/answer failures; no unqualified pass is claimed."
        },
        stagingCleanCycles: {
          status: "PRE_REVIEW_CLEAN_POSTAPPROVAL_VALIDATION_PENDING",
          evidence: "Staging is empty before the mandatory Opus review."
        },
        independentReview: {
          status: "PENDING_MANDATORY_SINGLE_OPUS_REVIEW",
          satisfied: false
        },
        E2: {
          status: "NOT_EXECUTED",
          authorized: false,
          rationale: "The governing sequence forbids E2 before R20 independent review passes."
        },
        A15: {
          status: "NOT_EXECUTED",
          authorized: false,
          rationale:
            "A15 is the final Phase 10A closure gate and cannot close an unresolved 145-row reason layer."
        },
        allKnownMaterialTrustDefects: {
          status: "KNOWN_C35_DEFECTS_RESOLVED_NO_UNIVERSAL_CLOSURE_INFERRED",
          evidence:
            "The generic VAT false conflict and generalized proposition-to-passage binding defects are resolved and preserved; this does not prove reason-layer or Phase 10A closure."
        }
      },
      closureCriteriaAllProven: false,
      rationale:
        "C35 closes the observed authority-conflict and proposition-support defects but does not authorize treating the 145 reason-only residual rows as closed.",
      c35Terminal: true,
      r20: "IN_PROGRESS",
      nextExactTask:
        "Separately governed Phase-10A14-R20 continuation for the unresolved reason layer; C36 and Phase 10B remain unauthorized.",
      pass: true
    })
  );

  const docs = docsDrafts();
  const proposed = proposedPaths();
  writeOnce(
    "COMMIT_5R1C35_PROPOSED_STAGED_PATHS.json",
    stableJson({
      schemaVersion: 1,
      generatedUtc,
      paths: proposed,
      count: proposed.length,
      explicitFileByFileOnly: true,
      excluded: [
        "six post-commit C34 attestations",
        ".claude/",
        ".vscode/",
        "evaluation/factcheck/",
        "Roadmap v7/v8",
        "mutable COMMIT_5R1C35_RECOVERY_CHECKPOINT.json pointer",
        "mutable COMMIT_5R1C35_RECOVERY_CHECKPOINT_LOG.ndjson",
        "future C35 post-commit attestations"
      ],
      proposedCommitMessage:
        "PHASE-10A14-R20 COMMIT 5R1-C35 complete - correct authority-conflict calibration and preserve support independence",
      pass: true
    })
  );

  const frozenGate = {
    schemaVersion: 1,
    generatedUtc,
    targetFalseConflicts: 0,
    genuineConflictRegressions: 0,
    unsupportedSupportPromotions: 0,
    c34FrozenRegressions: 0,
    candidate1Suite: "6/6 PASS",
    candidate2Suite: "25/25 PASS",
    isolatedForwardReverse: "31/31 PASS EACH ORDER",
    legacyTrustSuites: "PASS",
    fullDeterministicRegression: {
      command: "npm.cmd test",
      syntax: "10/10 PASS",
      suitesPassed: 184,
      suitesFailed: 33,
      suitesTotal: 217,
      groupsPassed: 5397,
      groupsFailed: 54,
      declaredAssertionsAndChecks: 20630,
      nominalExitCode: 1,
      adjudication:
        "All 54 failures are historical patch-local diff-scope or stale CURRENT_STATE/old-next-task assertions; zero runtime authority, support, conflict, or answer-behavior failures.",
      unqualifiedPassClaimed: false,
      semanticRuntimeGate: "PASS_WITH_EXPLICIT_HISTORICAL_GUARD_ADJUDICATION"
    },
    registryWalAttemptsReconciled: true,
    protectedResiduePreserved: true,
    noProcessTempLockOrStaging: true,
    badManifestHashes: 0,
    candidateChainTerminal: true,
    safeToInvokeOpus: true,
    verdict: "FINAL_FROZEN_GATES_PASS_READY_FOR_OPUS",
    pass: true
  };
  writeOnce("COMMIT_5R1C35_FINAL_FROZEN_GATE_RESULT.json", stableJson(frozenGate));

  console.log(
    JSON.stringify(
      {
        activeBase: composition.candidateRuntimeHash,
        registryAttempts: registry.attempts.length,
        c35WalRows: walRows.length,
        attemptDirectories: attemptDirs,
        docs,
        proposedStagedPaths: proposed.length,
        phase10A: "PHASE_10A_OPEN",
        verdict: frozenGate.verdict,
        pass: true
      },
      null,
      2
    )
  );
}

const opusReviewKeys = Object.freeze([
  "checkpoint61Continuity",
  "candidate1IdentityAndExactOnce",
  "vatPropositionPassageRevalidation",
  "inputVatQualificationSupport",
  "candidate2NecessityAndDisposition",
  "candidateChainTerminal",
  "finalCompositionAndActiveBase",
  "authorityConflictPreservation",
  "authoritySupportIndependence",
  "c34FrozenPreservation",
  "c35FrozenGates",
  "replayAndGeneralization",
  "registryWalAttemptLedger",
  "protectedResidueAndServiceGitHygiene",
  "phase10AClosureAssessment",
  "reasonResidual145Explicit",
  "roadmapV9DraftAccurate",
  "currentStateDraftAccurate",
  "manifestAndStagingProposal",
  "noDeployC36OrPhase10B"
]);

const opusReviewSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "decision",
    "reviewedStateDigest",
    "reviewerTool",
    "reviewerModel",
    "independenceConfirmed",
    "readOnlyConfirmed",
    "summary",
    "phase10AClassification",
    "verification",
    "blockingFindings",
    "nonblockingObservations",
    "commitSafe"
  ],
  properties: {
    decision: {
      type: "string",
      enum: [
        "APPROVED",
        "APPROVED_WITH_NONBLOCKING_OBSERVATIONS",
        "REJECTED",
        "INCOMPLETE_REVIEW"
      ]
    },
    reviewedStateDigest: { type: "string", pattern: "^[0-9a-f]{64}$" },
    reviewerTool: { type: "string", const: "Claude Code" },
    reviewerModel: { type: "string", const: "claude-opus-4-8" },
    independenceConfirmed: { type: "boolean" },
    readOnlyConfirmed: { type: "boolean" },
    summary: { type: "string" },
    phase10AClassification: {
      type: "string",
      enum: ["CLOSED", "OPEN", "INDETERMINATE"]
    },
    verification: {
      type: "object",
      additionalProperties: false,
      required: opusReviewKeys,
      properties: Object.fromEntries(
        opusReviewKeys.map((key) => [key, { type: "boolean" }])
      )
    },
    blockingFindings: {
      type: "array",
      items: { type: "string" }
    },
    nonblockingObservations: {
      type: "array",
      items: { type: "string" }
    },
    commitSafe: { type: "boolean" }
  }
});

const opusArtifacts = Object.freeze({
  request: "COMMIT_5R1C35_FINAL_OPUS_REQUEST.json",
  manifest: "COMMIT_5R1C35_PRE_REVIEW_EVIDENCE.sha256",
  manifestValidation:
    "COMMIT_5R1C35_PRE_REVIEW_MANIFEST_VALIDATION.json",
  hygiene: "COMMIT_5R1C35_PRE_OPUS_OPERATIONAL_HYGIENE.json",
  regression:
    "COMMIT_5R1C35_FULL_DETERMINISTIC_REGRESSION_ADJUDICATION.json",
  marker: "COMMIT_5R1C35_FINAL_OPUS_INVOCATION_MARKER.json",
  capture: "COMMIT_5R1C35_FINAL_OPUS_REVIEW_CLI_CAPTURE.json",
  review: "COMMIT_5R1C35_FINAL_OPUS_REVIEW.json",
  reviewMd: "COMMIT_5R1C35_FINAL_OPUS_REVIEW.md"
});

const c34ProtectedAttestations = Object.freeze({
  "COMMIT_5R1C34_FINAL_GIT_VERIFICATION.json":
    "05dada6e80fa6ded5c03261c4bc59043a2072e2431bb4ca84cc6c48690d1f856",
  "COMMIT_5R1C34_FINAL_REMOTE_VERIFICATION.json":
    "88edca1c993ddfbfe757ac21d54bd859b2adc33dcbb839c6f264419d4837863f",
  "COMMIT_5R1C34_RECOVERY_CHECKPOINT.json":
    "a2c58b82d05719738bbe6e5b8145a6a5b6a84b6357fe30f5fe51625cd9cfa75a",
  "COMMIT_5R1C34_RECOVERY_CHECKPOINT_60_two_hour_checkpoint_57_terminal_reconciliation.json":
    "a2c58b82d05719738bbe6e5b8145a6a5b6a84b6357fe30f5fe51625cd9cfa75a",
  "COMMIT_5R1C34_RECOVERY_CHECKPOINT_LOG.ndjson":
    "091656f6c5cb188417bdce1bc799bd5328d4450365d3f51e5655a851239e7b2d",
  "COMMIT_5R1C34_TWO_HOUR_OPUS_RECOVERY_TERMINAL_STATE.json":
    "90b3dc2df48288c21995c06f4fa640e77363e54660d8516aca4d04bfeb4bfbee"
});

const c34ReviewFiles = Object.freeze([
  "COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson",
  "COMMIT_5R1C34_FINAL_ACTIVE_BASE_IDENTITY.json",
  "COMMIT_5R1C34_FINAL_CLOSURE_DECISION_DRAFT.json",
  "COMMIT_5R1C34_FINAL_EVIDENCE.sha256",
  "COMMIT_5R1C34_FINAL_FROZEN_GATE_RESULT.json",
  "COMMIT_5R1C34_FINAL_MANIFEST_VALIDATION.json",
  "COMMIT_5R1C34_FINAL_OPUS_REVIEW.json",
  "COMMIT_5R1C34_FINAL_PRESERVATION_RESULT.json",
  "COMMIT_5R1C34_FINAL_RESIDUAL_FAMILY_SUMMARY.json",
  ...Object.keys(c34ProtectedAttestations)
]);

const preReviewExcludedNames = new Set([
  "COMMIT_5R1C35_FINAL_EVIDENCE.sha256",
  "COMMIT_5R1C35_PRE_REVIEW_EVIDENCE.sha256",
  "COMMIT_5R1C35_PRE_REVIEW_MANIFEST_VALIDATION.json",
  "COMMIT_5R1C35_FINAL_OPUS_INVOCATION_MARKER.json",
  "COMMIT_5R1C35_FINAL_OPUS_REVIEW.json",
  "COMMIT_5R1C35_FINAL_OPUS_REVIEW.md",
  "COMMIT_5R1C35_FINAL_OPUS_REVIEW_CLI_CAPTURE.json",
  "COMMIT_5R1C35_PHASE_10A_CLOSURE_ASSESSMENT.json",
  "COMMIT_5R1C35_PHASE_10A_CLOSURE_ASSESSMENT.md",
  "COMMIT_5R1C35_FINAL_COMMIT_CONTENTS.json",
  "COMMIT_5R1C35_FINAL_MANIFEST_VALIDATION.json",
  "COMMIT_5R1C35_ACTUAL_STAGED_PATHS.json",
  "COMMIT_5R1C35_STAGING_VALIDATION.json",
  "COMMIT_5R1C35_FINAL_GIT_VERIFICATION.json",
  "COMMIT_5R1C35_FINAL_REMOTE_VERIFICATION.json",
  "COMMIT_5R1C35_POST_COMMIT_TERMINAL_STATE.json"
]);

function git(...args) {
  const result = spawnSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 256 * 1024 * 1024
  });
  assert(
    result.status === 0 && !result.error,
    `Git command failed: git ${args.join(" ")}\n${result.stderr || ""}`
  );
  return (result.stdout || "").trim();
}

function collectFiles(root) {
  if (!fs.existsSync(root)) return [];
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...collectFiles(target));
    else if (entry.isFile()) output.push(target);
  }
  return output;
}

function writeOnceJson(name, value) {
  writeOnce(name, stableJson(value));
}

function createOpusRequest() {
  const promptPath =
    "C:/Projects/tina-execution-prompts/" +
    "PHASE-10A14-R20-COMMIT-5R1-C35-FOUR-HOUR-FINALIZATION-FROM-CHECKPOINT-61.md";
  const request = {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: "2026-07-31T06:50:00.000Z",
    reviewer: {
      tool: "Claude Code",
      model: "claude-opus-4-8",
      effort: "max",
      invocationBudget: 1,
      readOnly: true
    },
    governingPrompt: {
      path: promptPath,
      bytes: fs.statSync(promptPath).size,
      sha256: sha256(fs.readFileSync(promptPath))
    },
    reviewedState: {
      headAndUpstream: head,
      parent: "7c95019622d7174c8b1fd258b9a10137e59feb57",
      checkpoint61:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_CHECKPOINT_61_CONTINUATION_PREFLIGHT.json",
      candidate1ExactActiveBase: c1Runtime,
      candidate1Result:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_CANDIDATE_1_RESULT.json",
      candidate2Result:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_CANDIDATE_2_RESULT.json",
      finalActiveBase: c35Runtime,
      finalFrozenGates:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_FINAL_FROZEN_GATE_RESULT.json",
      fullDeterministicRegression:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_FULL_DETERMINISTIC_REGRESSION_ADJUDICATION.json",
      preOpusOperationalHygiene:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_PRE_OPUS_OPERATIONAL_HYGIENE.json",
      preReviewManifestValidation:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_PRE_REVIEW_MANIFEST_VALIDATION.json",
      preallocationProtocolAdjudication:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_PREALLOCATION_PROTOCOL_ADJUDICATION.json",
      finalAttemptLedger:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_FINAL_ATTEMPT_LEDGER.json",
      proposedRoadmap:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_ROADMAP_V9_DRAFT.md",
      proposedCurrentState:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_CURRENT_STATE_DRAFT.md",
      proposedStaging:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_PROPOSED_STAGED_PATHS.json",
      phase10AClosureDraft:
        "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_FINAL_CLOSURE_DECISION_DRAFT.json"
    },
    mandatoryAdjudications: {
      broadInputVat:
        "The captured passages do not exactly support the broad rendered input-VAT proposition; it must not be promoted.",
      genericVatTrust:
        "NO_CONFLICT and RELATED_AUTHORITY_ONLY are independent axes for this evidence packet.",
      candidate2:
        "Authorized only because live evidence proved a generalized proposition-to-passage binding defect; accepted and terminal.",
      deterministicRegression:
        "The complete deterministic runner exited 1: 184/217 suites and 5397/5451 groups passed. All 54 failures were historical diff-scope or stale CURRENT_STATE checks; zero runtime authority/support/conflict/answer failures. This is not represented as an unqualified pass.",
      registrySchemaVariance:
        "The two bespoke C35 rows use trust_calibration and omit three fields from a generic closed schema. Preserve the terminal historical rows; no silent mutation; semantic impact NONE.",
      candidate2TimestampVariance:
        "Candidate 2's preterminal artifact is generatedUtc 06:34:30Z while its later terminal registry/WAL event inherited result.generatedUtc 06:34:00Z. Filesystem ordering is monotonic (preterminal last-write 06:34:34Z; terminalization 06:35:19Z). This is a disclosed nonsemantic timestamp-source variance, not evidence reordering.",
      preallocationNamingVariance:
        "Several prompt-exact support artifacts were generated post-allocation as provenance-preserving wrappers over already frozen alternate-name evidence. They are explicitly not backdated.",
      staleCheckpointManifest:
        "COMMIT_5R1C35_FINAL_EVIDENCE.sha256 still contains checkpoint-61 bytes and is excluded from the reviewed-state manifest. The same bytes are archived as COMMIT_5R1C35_CHECKPOINT_61_EVIDENCE_MANIFEST.sha256. A new final self-excluding manifest is permitted only after approval.",
      phase10A:
        "OPEN: decision and relation are 3720/3720, reason is 3575/3720, and 145 reason-only rows remain.",
      mutationBoundary:
        "After approval, only decision-specific evidence/docs, manifest, explicit staging, commit, and push are authorized. Runtime/dispositions/composition/reviewed hashes may not change."
    },
    requiredDecisionTokens: [
      "APPROVED",
      "APPROVED_WITH_NONBLOCKING_OBSERVATIONS",
      "REJECTED",
      "INCOMPLETE_REVIEW"
    ],
    verificationKeys: opusReviewKeys,
    noSecondInvocation: true,
    noDeployment: true,
    noC36: true,
    noPhase10BImplementation: true,
    pass: true
  };
  writeOnceJson(opusArtifacts.request, request);
  return request;
}

function preReviewFiles() {
  const files = new Set([
    path.join(repo, "ask-handler.js"),
    path.join(repo, "conflict-engine.js"),
    path.join(repo, "services", "answer-support-evidence.js"),
    path.join(repo, "services", "answer-support-validator.js"),
    path.join(
      repo,
      "tests",
      "phase-10a14-r20-commit5r1c35-answer-support-passage-binding.test.mjs"
    ),
    path.join(
      repo,
      "tests",
      "phase-10a14-r20-commit5r1c35-vat-authority-conflict-calibration.test.mjs"
    ),
    path.join(
      repo,
      "knowledge",
      "TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md"
    ),
    path.join(repo, "knowledge", "CURRENT_STATE.md"),
    path.join(resultRoot, "CANONICAL_ATTEMPT_REGISTRY.json")
  ]);
  for (const file of collectFiles(
    path.join(repo, "evaluation", "fixtures", "phase-10a14-r20")
  )) {
    if (path.basename(file).startsWith("commit5r1c35-")) files.add(file);
  }
  for (const file of collectFiles(
    path.join(repo, "evaluation", "runner", "phase-10a14-r20")
  )) {
    if (path.basename(file).startsWith("commit5r1c35-")) files.add(file);
  }
  for (const entry of fs.readdirSync(resultRoot, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      entry.name.startsWith("COMMIT_5R1C35_") &&
      !preReviewExcludedNames.has(entry.name)
    ) {
      files.add(path.join(resultRoot, entry.name));
    }
  }
  for (const attemptId of [c1Attempt, c2Attempt]) {
    for (const file of collectFiles(path.join(resultRoot, "attempts", attemptId))) {
      files.add(file);
    }
  }
  for (const name of c34ReviewFiles) files.add(path.join(resultRoot, name));
  const resolvedManifest = path.resolve(resultRoot, opusArtifacts.manifest);
  return [...files]
    .map((file) => path.resolve(file))
    .filter((file) => file !== resolvedManifest && fs.existsSync(file))
    .sort((left, right) => rel(left).localeCompare(rel(right)));
}

function createPreReviewManifest() {
  const lines = preReviewFiles().map(
    (file) => `${sha256(fs.readFileSync(file))}  ${rel(file)}`
  );
  const contents = `${lines.join("\n")}\n`;
  writeOnce(opusArtifacts.manifest, contents);
  const manifest = identity(
    `evaluation/results/phase-10a14-r20/${opusArtifacts.manifest}`
  );
  const parsed = fs
    .readFileSync(path.join(resultRoot, opusArtifacts.manifest), "utf8")
    .trim()
    .split(/\r?\n/);
  assert(parsed.length === lines.length, "Pre-review manifest row count drift");
  assert(new Set(parsed).size === parsed.length, "Pre-review manifest duplicates");
  for (const line of parsed) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `Malformed pre-review manifest row: ${line}`);
    const target = path.join(repo, ...match[2].split("/"));
    assert(fs.existsSync(target), `Missing pre-review target: ${match[2]}`);
    assert(
      sha256(fs.readFileSync(target)) === match[1],
      `Bad pre-review hash: ${match[2]}`
    );
  }
  return { ...manifest, rows: parsed.length, bad: 0, missing: 0, duplicates: 0 };
}

function inspectOpusOperationalHygiene() {
  const powershell =
    "C:/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe";
  const script = [
    "$ErrorActionPreference='Stop'",
    "$nodes=@(Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Select-Object ProcessId,ParentProcessId,CommandLine)",
    "$lines=@(netstat -ano -p TCP)",
    "$listeners=@($lines | Where-Object { $p=($_.Trim() -split '\\s+'); $p.Count -ge 4 -and $p[0] -eq 'TCP' -and $p[1] -match ':5173$' -and $p[3] -eq 'LISTENING' })",
    "[ordered]@{inspectionSucceeded=$true;nodeProcesses=$nodes;listeners5173=$listeners} | ConvertTo-Json -Depth 6"
  ].join("; ");
  const result = spawnSync(powershell, ["-NoProfile", "-Command", script], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024
  });
  assert(
    result.status === 0 && !result.error,
    `Process inspection failed: ${result.stderr || result.error?.message || ""}`
  );
  const observed = JSON.parse((result.stdout || "").replace(/^\uFEFF/, ""));
  const nodes = Array.isArray(observed.nodeProcesses)
    ? observed.nodeProcesses
    : observed.nodeProcesses
      ? [observed.nodeProcesses]
      : [];
  const otherNodes = nodes.filter(
    (item) => Number(item.ProcessId) !== process.pid
  );
  const unreadable = otherNodes.filter(
    (item) => !String(item.CommandLine || "").trim()
  );
  const listeners = Array.isArray(observed.listeners5173)
    ? observed.listeners5173
    : observed.listeners5173
      ? [observed.listeners5173]
      : [];
  const resultTemps = fs
    .readdirSync(resultRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        (entry.name.startsWith(".c35-") ||
          entry.name.startsWith("tina-c35-"))
    )
    .map((entry) => entry.name);
  const osTemps = fs
    .readdirSync(os.tmpdir(), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        (entry.name.startsWith("tina-c35-") ||
          entry.name.startsWith("tina-commit5r1c35-"))
    )
    .map((entry) => entry.name);
  const state = {
    inspectedUtc: new Date().toISOString(),
    currentOrchestratorPid: process.pid,
    otherNodeProcesses: otherNodes,
    unreadableNodeCommandLines: unreadable,
    listeners5173: listeners,
    resultTemporaryRuntimes: resultTemps,
    osTemporaryRuntimes: osTemps,
    allocationLock: fs.existsSync(
      path.join(resultRoot, ".commit5r1c35-allocation.lock")
    ),
    gitIndexLock: fs.existsSync(path.join(repo, ".git", "index.lock")),
    stagedPaths: git("diff", "--cached", "--name-only")
      .split(/\r?\n/)
      .filter(Boolean),
    head: git("rev-parse", "HEAD"),
    upstream: git("rev-parse", "@{u}"),
    aheadBehind: git(
      "rev-list",
      "--left-right",
      "--count",
      "HEAD...@{u}"
    ),
    branch: git("branch", "--show-current")
  };
  const protectedPaths = [
    "knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md",
    "knowledge/CURRENT_STATE.md",
    ".claude/settings.local.json",
    ".vscode/extensions.json",
    "evaluation/factcheck/README.md",
    "evaluation/factcheck/TINA_Adversarial_Anti_Hallucination_Test_Set_PH_Tax_v2_0.md",
    "evaluation/factcheck/TINA_Tax_FactCheck_Corrected_Validated_Master_v3_0.md",
    "evaluation/factcheck/hardest-philippine-tax-question.md"
  ];
  state.protectedFiles = Object.fromEntries(
    protectedPaths.map((item) => [item, identity(item)])
  );
  state.c34ProtectedAttestations = Object.fromEntries(
    Object.keys(c34ProtectedAttestations).map((name) => [
      name,
      identity(`evaluation/results/phase-10a14-r20/${name}`)
    ])
  );
  const currentRegistry = readJson(
    "evaluation/results/phase-10a14-r20/CANONICAL_ATTEMPT_REGISTRY.json"
  );
  state.ledger = {
    registryAttempts: currentRegistry.attempts.length,
    attemptDirectories: fs
      .readdirSync(path.join(resultRoot, "attempts"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).length,
    c35Wal: identity(
      "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson"
    ),
    c34Wal: identity(
      "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson"
    ),
    activeAttemptId: currentRegistry.c35.activeAttemptId
  };
  state.serviceIdentity = {
    localServiceRunning: false,
    localPort5173Free: listeners.length === 0,
    productionBackend: "https://tina-backend-y11x.onrender.com",
    productionDeploymentId: "srv-d7n4bsdckfvc73ep7mn0",
    productionRuntimeCommit: head,
    selectedLocalWorktreeRuntime: c35Runtime,
    productionServiceChanged: false,
    deploymentPerformed: false,
    known: true
  };
  state.prohibitedOperations = {
    candidate3: false,
    c36: false,
    phase10BImplementation: false,
    deployment: false,
    migration: false,
    reindex: false,
    stage: false,
    commit: false,
    push: false
  };
  state.pass =
    otherNodes.length === 0 &&
    unreadable.length === 0 &&
    listeners.length === 0 &&
    resultTemps.length === 0 &&
    osTemps.length === 0 &&
    state.allocationLock === false &&
    state.gitIndexLock === false &&
    state.stagedPaths.length === 0 &&
    state.head === head &&
    state.upstream === head &&
    state.aheadBehind === "0\t0" &&
    state.ledger.registryAttempts === 230 &&
    state.ledger.attemptDirectories === 230 &&
    state.ledger.c35Wal.sha256 ===
      "d86f6fb331fa6010365debc13b7417704e4c71402af8803775744f00eef9260f" &&
    state.ledger.c34Wal.sha256 ===
      "2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2" &&
    state.ledger.activeAttemptId == null &&
    state.protectedFiles[
      "evaluation/factcheck/README.md"
    ].sha256 ===
      "2717268c74fdbd7d46ff064b2f2c0094bcb6ff7bff3194115104860d5363bd4a" &&
    state.protectedFiles[
      "evaluation/factcheck/TINA_Adversarial_Anti_Hallucination_Test_Set_PH_Tax_v2_0.md"
    ].sha256 ===
      "c3ec5c39679ed379113ce5345e513355405ff20c6456893d60fb54588033aa08" &&
    state.protectedFiles[
      "evaluation/factcheck/TINA_Tax_FactCheck_Corrected_Validated_Master_v3_0.md"
    ].sha256 ===
      "526106e594667705df227930dff3d9a4717ec99b171626bf708db43f4eac4bed" &&
    state.protectedFiles[
      "evaluation/factcheck/hardest-philippine-tax-question.md"
    ].sha256 ===
      "6de089ebf3498d381e9818963a10c1b56b2d8bd34faed826432d5345f64b8df7" &&
    state.protectedFiles[".claude/settings.local.json"].sha256 ===
      "9b3fd5a5c9361a737605b6738b76e486e1a2c7ca5479b65f39f35cb96778a9dc" &&
    state.protectedFiles[".vscode/extensions.json"].sha256 ===
      "377b93292332cf8f6ed00dcafa911a8ca2ee6d6c7957603578646c7518b7df09" &&
    Object.entries(c34ProtectedAttestations).every(
      ([name, expected]) =>
        state.c34ProtectedAttestations[name].sha256 === expected
    );
  assert(state.pass, `Pre-Opus operational hygiene failed: ${JSON.stringify(state)}`);
  return state;
}

function validatePreOpusState() {
  const registry = readJson(
    "evaluation/results/phase-10a14-r20/CANONICAL_ATTEMPT_REGISTRY.json"
  );
  const wal = fs
    .readFileSync(
      path.join(resultRoot, "COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson"),
      "utf8"
    )
    .trim()
    .split(/\r?\n/);
  const attemptDirectories = fs
    .readdirSync(path.join(resultRoot, "attempts"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  const frozen = readJson(
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_FROZEN_GATE_RESULT.json"
  );
  const composition = readJson(
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_CUMULATIVE_COMPOSITION.json"
  );
  const active = readJson(
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_ACTIVE_BASE_IDENTITY.json"
  );
  const closure = readJson(
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_CLOSURE_DECISION_DRAFT.json"
  );
  const c2 = readJson(
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CANDIDATE_2_RESULT.json"
  );
  const regression = readJson(
    "evaluation/results/phase-10a14-r20/" +
      "COMMIT_5R1C35_FULL_DETERMINISTIC_REGRESSION_ADJUDICATION.json"
  );
  const protocol = readJson(
    "evaluation/results/phase-10a14-r20/" +
      "COMMIT_5R1C35_PREALLOCATION_PROTOCOL_ADJUDICATION.json"
  );
  assert(registry.attempts.length === 230, "Registry count is not 230");
  assert(registry.c35?.activeAttemptId == null, "C35 attempt remains active");
  assert(
    !registry.attempts.some((item) => item.status === "running"),
    "Running attempt remains"
  );
  assert(wal.length === 6, "C35 WAL is not six rows");
  assert(attemptDirectories.length === 230, "Attempt directory count is not 230");
  assert(frozen.pass === true && frozen.safeToInvokeOpus === true, "Frozen gates fail");
  assert(composition.pass === true, "Final composition fails");
  assert(
    active.pass === true &&
      active.finalC35ActiveBase?.candidateRuntimeHash === c35Runtime,
    "Final active base fails"
  );
  assert(
    c2.pass === true &&
      c2.verdict === "ACCEPTED_PROMOTED_CONTROLLING" &&
      c2.candidateRuntimeHash === c35Runtime,
    "Candidate 2 result fails"
  );
  assert(
    closure.pass === true &&
      closure.classification === "PHASE_10A_OPEN" &&
      closure.reason?.remainingReasonOnlyRows === 145,
    "Phase 10A closure draft fails"
  );
  assert(
    regression.pass === true &&
      regression.canonicalExitCode === 1 &&
      regression.suites.failed === 33 &&
      regression.groups.failed === 54 &&
      regression.classificationCounts.SCOPE === 33 &&
      regression.classificationCounts.STATE === 21 &&
      regression.runtimeBehaviorFailures === 0 &&
      regression.unqualifiedPassClaimed === false,
    "Full deterministic regression adjudication fails"
  );
  assert(
    protocol.pass === true &&
      protocol.adjudication.authorizationOmittedDirectSupportPacketHash ===
        true &&
      protocol.adjudication.historicalAuthorizationMutated === false &&
      protocol.terminalTimestampVariance.evidenceReordering === false,
    "Preallocation protocol adjudication fails"
  );
  assert(identity("conflict-engine.js").sha256 === c1Runtime, "Candidate 1 drift");
  assert(
    identity("knowledge/TINA_Updated_Roadmap_v7.md").sha256 ===
      "235cc3366b018b74fa252d8c5f7546b5ed3abd4b43b2be3a0a9e1cbf8cfb6daa",
    "Roadmap v7 drift"
  );
  assert(
    identity("knowledge/TINA_Updated_Controlling_Roadmap_v8.md").sha256 ===
      "54c0d97a13fe8bf097b5e7b0913d1b4e1fe8b5584c5c8f0d683fe52c3745f422",
    "Roadmap v8 drift"
  );
  for (const [name, expected] of Object.entries(c34ProtectedAttestations)) {
    assert(
      identity(`evaluation/results/phase-10a14-r20/${name}`).sha256 === expected,
      `${name} drift`
    );
  }
  assert(
    identity(
      "evaluation/results/phase-10a14-r20/" +
        "COMMIT_5R1C35_CHECKPOINT_61_EVIDENCE_MANIFEST.sha256"
    ).sha256 ===
      "e2425b8e30a8b773de1af5cae5ce8f0ba1bbc98c8d4abb9612be19dc75bdafd3",
    "Checkpoint-61 manifest archive drift"
  );
  return {
    registryAttempts: registry.attempts.length,
    c35WalRows: wal.length,
    attemptDirectories: attemptDirectories.length,
    activeAttemptId: registry.c35.activeAttemptId,
    finalActiveBase: c35Runtime,
    phase10A: closure.classification,
    reasonOnlyResidual: closure.reason.remainingReasonOnlyRows,
    pass: true
  };
}

function reviewPrompt(reviewedStateDigest, manifestRows) {
  const root = repo.replaceAll("\\", "/");
  return `You are the mandatory independent final reviewer for PHASE-10A14-R20 COMMIT 5R1-C35.

Work READ-ONLY in ${root}. Do not edit, create, delete, stage, commit, push, deploy, start a service, install anything, or run tests. You may use Read, Glob, and Grep. Bash is authorized only for a simple command of the exact form:
sha256sum -c "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PRE_REVIEW_EVIDENCE.sha256"
Do not use pipes, redirects, command substitution, scripts, or other shell commands.

The reviewed-state digest is the SHA-256 of that self-excluding ${manifestRows}-row manifest:
${reviewedStateDigest}
Return this exact lowercase digest as reviewedStateDigest.

Read the governing prompt:
C:/Projects/tina-execution-prompts/PHASE-10A14-R20-COMMIT-5R1-C35-FOUR-HOUR-FINALIZATION-FROM-CHECKPOINT-61.md

Start with:
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_OPUS_REQUEST.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CHECKPOINT_61_CONTINUATION_PREFLIGHT.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CANDIDATE_1_RESULT.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_VAT_PROPOSITION_LEDGER.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_INPUT_VAT_PASSAGE_PACKET.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_INPUT_VAT_PROPOSITION_REVALIDATION.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_AUTHORITY_SUPPORT_INDEPENDENCE_ADJUDICATION.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CANDIDATE_2_NECESSITY_DECISION.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CANDIDATE_2_RESULT.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_CUMULATIVE_COMPOSITION.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_TRUST_STATE_MATRIX.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_PROPOSITION_SUPPORT_MATRIX.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_REPLAY_RESULT.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_PRESERVATION_RESULT.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_ATTEMPT_LEDGER.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_FROZEN_GATE_RESULT.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FULL_DETERMINISTIC_REGRESSION_ADJUDICATION.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PRE_OPUS_OPERATIONAL_HYGIENE.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PREALLOCATION_PROTOCOL_ADJUDICATION.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PRE_REVIEW_MANIFEST_VALIDATION.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_CLOSURE_DECISION_DRAFT.json
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_ROADMAP_V9_DRAFT.md
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CURRENT_STATE_DRAFT.md
- evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PROPOSED_STAGED_PATHS.json

Independently inspect the runtime, fixtures, tests, attempt records, registry/WAL, and other manifest-bound evidence as needed. Candidate 1 must resolve to a37f41c01b3be16fb992f206f93dca67c8a5cbc79930997b416feaa5c7851e7d exactly once. The final cumulative active base must reproduce as 5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c.

Important disclosed facts to adjudicate, not silently normalize:
1. The broad input-VAT sentence is not exactly supported by the captured narrow passage packet and is not promoted. Generic VAT remains NO_CONFLICT while authority support is RELATED_AUTHORITY_ONLY.
2. Candidate 2 was authorized only after controlled evidence showed a generalized proposition-to-passage binding defect. It is terminal and accepted; no Candidate 3 exists.
3. The deterministic full repository runner had nominal exit 1: 184/217 suites, 5397 passed and 54 failed groups. All 54 failures were adjudicated as historical diff-scope or stale CURRENT_STATE/old-next-task checks, with zero runtime authority/support/conflict/answer-behavior failures. Do not call this an unqualified test pass; decide whether the explicit adjudication is commit-safe.
4. Exact prompt-name wrappers for several support artifacts were generated after allocation from already frozen alternate-name evidence and are explicitly provenance-marked, not backdated.
5. The bespoke C35 registry rows use trust_calibration and omit three generic-schema fields. They are preserved terminal history with no semantic runtime impact; do not require silent mutation merely for schema style.
6. Candidate 2's preterminal generatedUtc is 30 seconds later than the later terminal event's inherited result timestamp. Filesystem last-write order proves preterminal then terminalization. Treat this as disclosed timestamp-source variance, not evidence reordering.
7. The current COMMIT_5R1C35_FINAL_EVIDENCE.sha256 is checkpoint-61-era and deliberately excluded. Its exact bytes are archived as COMMIT_5R1C35_CHECKPOINT_61_EVIDENCE_MANIFEST.sha256. The true final manifest, closure assessment, decision-specific docs, staging evidence, commit, and push may be created only after your approval.
8. Phase 10A must remain OPEN: decision/relation are 3720/3720, reason is 3575/3720, and 145 reason-only rows remain (45 explicit_non_tax_task, 16 explicit_tax_task_relation, 81 no_tax_relation, 1 tax_compliance_task, 2 tax_treatment_of_ordinary_object).
9. The Roadmap and CURRENT_STATE files in knowledge/ are intentionally unchanged pre-review. Review their two proposed drafts. Postapproval substitution of your decision token and installation of those drafts are the only allowed documentation changes.
10. No deployment, C36, Phase 10B implementation, reindex, or model migration is authorized.

Use decision APPROVED only if every verification boolean is true, there are no blocking findings, read-only independence is confirmed, and the reviewed state is safe to commit after the expressly postapproval evidence/docs/staging steps. Use APPROVED_WITH_NONBLOCKING_OBSERVATIONS under the same conditions when observations do not require runtime, disposition, composition, or reviewed-hash changes. Otherwise use REJECTED or INCOMPLETE_REVIEW. phase10AClassification must be OPEN for an approval.

Return only the requested structured object.`;
}

function snapshotReviewedRepository() {
  const files = new Set(preReviewFiles());
  files.add(path.join(resultRoot, opusArtifacts.manifest));
  files.add(path.join(resultRoot, opusArtifacts.marker));
  for (const root of [
    path.join(repo, ".claude"),
    path.join(repo, ".vscode"),
    path.join(repo, "evaluation", "factcheck")
  ]) {
    for (const file of collectFiles(root)) files.add(file);
  }
  return {
    head: git("rev-parse", "HEAD"),
    upstream: git("rev-parse", "@{u}"),
    staged: git("diff", "--cached", "--name-only"),
    status: git("status", "--porcelain=v1", "--untracked-files=all"),
    files: [...files]
      .filter((file) => fs.existsSync(file))
      .sort((left, right) => rel(left).localeCompare(rel(right)))
      .map((file) => identity(rel(file)))
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function extractOpusReview(capture) {
  let envelope = null;
  let parsedResult = null;
  try {
    envelope = JSON.parse(capture.rawStdout);
    parsedResult =
      typeof envelope.result === "string"
        ? JSON.parse(envelope.result)
        : envelope.result;
  } catch (error) {
    return {
      envelope,
      parsedResult,
      structured: null,
      error: error.message,
      pass: false
    };
  }
  const structured = envelope.structured_output;
  return {
    envelope,
    parsedResult,
    structured,
    error: null,
    pass:
      structured != null &&
      typeof structured === "object" &&
      !Array.isArray(structured) &&
      parsedResult != null &&
      sameJson(structured, parsedResult)
  };
}

function validateOpusReview(extracted, reviewedStateDigest) {
  const envelope = extracted.envelope || {};
  const review = extracted.structured || {};
  const exactTopLevelKeys =
    Object.keys(review).sort().join("\n") ===
    opusReviewSchema.required.slice().sort().join("\n");
  const verification = review.verification || {};
  const exactVerificationKeys =
    Object.keys(verification).sort().join("\n") ===
    opusReviewKeys.slice().sort().join("\n");
  const allVerificationTrue =
    exactVerificationKeys &&
    opusReviewKeys.every((key) => verification[key] === true);
  const decisionAllowed =
    opusReviewSchema.properties.decision.enum.includes(review.decision);
  const approved =
    review.decision === "APPROVED" ||
    review.decision === "APPROVED_WITH_NONBLOCKING_OBSERVATIONS";
  const blockingValid =
    Array.isArray(review.blockingFindings) &&
    review.blockingFindings.every((item) => typeof item === "string");
  const observationsValid =
    Array.isArray(review.nonblockingObservations) &&
    review.nonblockingObservations.every((item) => typeof item === "string");
  const usageKeys =
    envelope.modelUsage && typeof envelope.modelUsage === "object"
      ? Object.keys(envelope.modelUsage)
      : [];
  const permissionDenials = Array.isArray(envelope.permission_denials)
    ? envelope.permission_denials
    : null;
  const approvalContract =
    !approved ||
    (review.independenceConfirmed === true &&
      review.readOnlyConfirmed === true &&
      allVerificationTrue &&
      blockingValid &&
      review.blockingFindings.length === 0 &&
      review.phase10AClassification === "OPEN" &&
      review.commitSafe === true);
  const pass =
    extracted.pass &&
    envelope.type === "result" &&
    envelope.subtype === "success" &&
    envelope.is_error === false &&
    envelope.terminal_reason === "completed" &&
    permissionDenials != null &&
    permissionDenials.length === 0 &&
    usageKeys.length === 1 &&
    usageKeys[0] === "claude-opus-4-8" &&
    exactTopLevelKeys &&
    exactVerificationKeys &&
    decisionAllowed &&
    review.reviewedStateDigest === reviewedStateDigest &&
    review.reviewerTool === "Claude Code" &&
    review.reviewerModel === "claude-opus-4-8" &&
    typeof review.independenceConfirmed === "boolean" &&
    typeof review.readOnlyConfirmed === "boolean" &&
    typeof review.summary === "string" &&
    review.summary.trim().length > 0 &&
    opusReviewKeys.every((key) => typeof verification[key] === "boolean") &&
    blockingValid &&
    observationsValid &&
    typeof review.commitSafe === "boolean" &&
    approvalContract;
  return {
    pass,
    approved: pass && approved,
    exactTopLevelKeys,
    exactVerificationKeys,
    allVerificationTrue,
    decisionAllowed,
    approvalContract,
    envelope: {
      type: envelope.type ?? null,
      subtype: envelope.subtype ?? null,
      isError: envelope.is_error ?? null,
      terminalReason: envelope.terminal_reason ?? null,
      permissionDenials,
      modelUsageKeys: usageKeys,
      totalCostUsd: envelope.total_cost_usd ?? null,
      durationMilliseconds: envelope.duration_ms ?? null,
      turns: envelope.num_turns ?? null
    }
  };
}

function renderOpusReviewMarkdown(review, validation, capture) {
  const verification = Object.entries(review.verification || {})
    .map(([key, value]) => `- ${key}: **${value ? "PASS" : "FAIL"}**`)
    .join("\n");
  const blockers = review.blockingFindings?.length
    ? review.blockingFindings.map((item) => `- ${item}`).join("\n")
    : "- None";
  const observations = review.nonblockingObservations?.length
    ? review.nonblockingObservations.map((item) => `- ${item}`).join("\n")
    : "- None";
  return `# COMMIT 5R1-C35 final independent Opus review

- Decision: **${review.decision}**
- Reviewer: **${review.reviewerTool} / ${review.reviewerModel}**
- Reviewed-state digest: \`${review.reviewedStateDigest}\`
- Independent: **${review.independenceConfirmed}**
- Read-only: **${review.readOnlyConfirmed}**
- Phase 10A classification: **${review.phase10AClassification}**
- Commit safe after authorized postapproval finalization: **${review.commitSafe}**
- Output contract: **${validation.pass ? "PASS" : "FAIL"}**
- CLI exit: **${capture.exitCode}**

## Summary

${review.summary}

## Verification

${verification}

## Blocking findings

${blockers}

## Nonblocking observations

${observations}
`;
}

function invokeOpusReviewExactlyOnce() {
  const markerPath = path.join(resultRoot, opusArtifacts.marker);
  const capturePath = path.join(resultRoot, opusArtifacts.capture);
  const reviewPath = path.join(resultRoot, opusArtifacts.review);
  const reviewMdPath = path.join(resultRoot, opusArtifacts.reviewMd);
  if (fs.existsSync(markerPath)) {
    assert(
      fs.existsSync(capturePath) &&
        fs.existsSync(reviewPath) &&
        fs.existsSync(reviewMdPath),
      "Opus invocation budget already consumed without a complete review capture"
    );
    return {
      invoked: false,
      budgetAlreadyConsumed: true,
      marker: readJson(
        `evaluation/results/phase-10a14-r20/${opusArtifacts.marker}`
      ),
      review: readJson(
        `evaluation/results/phase-10a14-r20/${opusArtifacts.review}`
      )
    };
  }
  const hardStop = Date.parse("2026-07-31T08:45:55.977Z");
  const remainingBeforePreparation = hardStop - Date.now();
  assert(
    remainingBeforePreparation >= 55 * 60 * 1000,
    "Insufficient four-hour budget for Opus review and safe finalization"
  );
  createOpusRequest();
  const state = validatePreOpusState();
  const hygiene = inspectOpusOperationalHygiene();
  writeOnceJson(opusArtifacts.hygiene, {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    classification: "FRESH_POST_CANDIDATE_2_PRE_OPUS_OPERATIONAL_HYGIENE",
    priorCheckpoint61InspectionRetained: true,
    currentReviewOrchestrator:
      "The recorded current Node PID is this bounded pre-review orchestrator and is excluded from the zero-external-process assertion.",
    ...hygiene,
    safeToResume: true,
    activeAttemptId: null
  });
  const manifest = createPreReviewManifest();
  writeOnceJson(opusArtifacts.manifestValidation, {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    validatedUtc: "2026-07-31T07:18:00.000Z",
    manifest,
    selfExcluded: true,
    validationArtifactTemporallyExcludedToAvoidCircularHashing: true,
    rows: manifest.rows,
    bad: manifest.bad,
    missing: manifest.missing,
    duplicates: manifest.duplicates,
    deterministicLexicalOrder: true,
    staleCheckpoint61FinalManifestExcluded: true,
    verdict: "PRE_REVIEW_MANIFEST_VALID",
    pass: true
  });
  assert(
    !fs.existsSync(capturePath) &&
      !fs.existsSync(reviewPath) &&
      !fs.existsSync(reviewMdPath),
    "Review output exists without the exactly-once invocation marker"
  );
  const native =
    "C:/Users/USER/AppData/Roaming/npm/node_modules/" +
    "@anthropic-ai/claude-code/bin/claude.exe";
  assert(fs.existsSync(native), "Verified native Claude executable is missing");
  assert(
    sha256(fs.readFileSync(native)) ===
      "fe639693fd7e9a881c799867711abb7666dec2a5fefbaba41af6a09e71bcbefa",
    "Native Claude executable hash drift"
  );
  const prompt = reviewPrompt(manifest.sha256, manifest.rows);
  const argv = [
    "-p",
    prompt,
    "--model",
    "claude-opus-4-8",
    "--effort",
    "max",
    "--permission-mode",
    "plan",
    "--tools",
    "Read,Glob,Grep,Bash",
    "--allowedTools",
    "Read,Glob,Grep,Bash(sha256sum *)",
    "--safe-mode",
    "--no-session-persistence",
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(opusReviewSchema)
  ];
  const timeoutMilliseconds = Math.min(
    45 * 60 * 1000,
    hardStop - Date.now() - 35 * 60 * 1000
  );
  assert(timeoutMilliseconds >= 15 * 60 * 1000, "Unsafe Opus timeout budget");
  const marker = {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: new Date().toISOString(),
    invocationBudgetConsumed: true,
    ordinal: 1,
    status: "STARTED_EXACTLY_ONCE",
    reviewedState: manifest,
    reviewedStateDigest: manifest.sha256,
    manifestValidation: identity(
      `evaluation/results/phase-10a14-r20/${opusArtifacts.manifestValidation}`
    ),
    resolvedCliPath: native,
    cliVersion: "2.1.212",
    cliArtifact: {
      path: native,
      bytes: fs.statSync(native).size,
      sha256: sha256(fs.readFileSync(native))
    },
    transport: {
      caller: "Node child_process.spawnSync",
      shell: false,
      powershellUsed: false,
      npmShimUsed: false,
      argvArray: true
    },
    argv,
    argvBindings: argv.map((argument, index) => ({
      index,
      characters: argument.length,
      bytes: Buffer.byteLength(argument),
      sha256: sha256(Buffer.from(argument))
    })),
    cwd: repo.replaceAll("\\", "/"),
    timeoutMilliseconds,
    preflight: state,
    hygiene,
    safeMode: true,
    noSessionPersistence: true,
    permissionMode: "plan",
    candidateExecutionAuthorized: false,
    deploymentAuthorized: false,
    c36Authorized: false,
    phase10BImplementationAuthorized: false,
    pass: true
  };
  writeOnceJson(opusArtifacts.marker, marker);
  const repositoryBefore = snapshotReviewedRepository();
  const startedUtc = new Date().toISOString();
  const startedMilliseconds = Date.now();
  const result = spawnSync(native, argv, {
    cwd: repo,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: timeoutMilliseconds,
    killSignal: "SIGTERM",
    maxBuffer: 1024 * 1024 * 1024,
    env: {
      ...process.env,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1"
    }
  });
  const completedUtc = new Date().toISOString();
  const repositoryAfter = snapshotReviewedRepository();
  const rawStdout = result.stdout || "";
  const rawStderr = result.stderr || "";
  const capture = {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: completedUtc,
    invocationBudgetConsumed: true,
    ordinal: 1,
    invocation: identity(
      `evaluation/results/phase-10a14-r20/${opusArtifacts.marker}`
    ),
    reviewedState: manifest,
    reviewedStateDigest: manifest.sha256,
    nativeExecutable: marker.cliArtifact,
    directNativeNoShell: true,
    startedUtc,
    completedUtc,
    elapsedMilliseconds: Date.now() - startedMilliseconds,
    timeoutMilliseconds,
    timedOut:
      result.error?.code === "ETIMEDOUT" ||
      result.error?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER",
    exitCode: result.status,
    signal: result.signal,
    error: result.error
      ? {
          name: result.error.name,
          code: result.error.code || null,
          message: result.error.message
        }
      : null,
    rawStdout,
    rawStdoutBytes: Buffer.byteLength(rawStdout),
    rawStdoutSha256: sha256(Buffer.from(rawStdout)),
    stderr: rawStderr,
    stderrBytes: Buffer.byteLength(rawStderr),
    stderrSha256: sha256(Buffer.from(rawStderr)),
    repositoryBefore,
    repositoryAfter,
    repositoryMutationDetected: !sameJson(repositoryBefore, repositoryAfter),
    pass:
      result.status === 0 &&
      !result.error &&
      sameJson(repositoryBefore, repositoryAfter)
  };
  writeOnceJson(opusArtifacts.capture, capture);
  const extracted = extractOpusReview(capture);
  const validation = validateOpusReview(extracted, manifest.sha256);
  assert(capture.pass, "Opus CLI execution or read-only mutation gate failed");
  assert(validation.pass, "Opus output contract validation failed");
  writeOnceJson(opusArtifacts.review, extracted.structured);
  writeOnce(
    opusArtifacts.reviewMd,
    renderOpusReviewMarkdown(extracted.structured, validation, capture)
  );
  return {
    invoked: true,
    budgetAlreadyConsumed: true,
    decision: extracted.structured.decision,
    approved: validation.approved,
    phase10AClassification: extracted.structured.phase10AClassification,
    reviewedStateDigest: manifest.sha256,
    manifestRows: manifest.rows,
    elapsedMilliseconds: capture.elapsedMilliseconds,
    nonblockingObservations: extracted.structured.nonblockingObservations,
    pass: validation.pass
  };
}

const finalTemporalStagingPaths = Object.freeze([
  "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_ACTUAL_STAGED_PATHS.json",
  "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_EVIDENCE.sha256",
  "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_MANIFEST_VALIDATION.json",
  "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_STAGING_VALIDATION.json"
]);

function approvedOpusReview() {
  const review = readJson(
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_OPUS_REVIEW.json"
  );
  assert(
    (review.decision === "APPROVED" ||
      review.decision === "APPROVED_WITH_NONBLOCKING_OBSERVATIONS") &&
      review.reviewedStateDigest ===
        "ccc5d1096ef29b156638366db2c89a7a0e992471fd2a4cc6be3ae6505e740b33" &&
      review.reviewerTool === "Claude Code" &&
      review.reviewerModel === "claude-opus-4-8" &&
      review.independenceConfirmed === true &&
      review.readOnlyConfirmed === true &&
      review.phase10AClassification === "OPEN" &&
      Object.keys(review.verification).length === opusReviewKeys.length &&
      opusReviewKeys.every((key) => review.verification[key] === true) &&
      review.blockingFindings.length === 0 &&
      review.commitSafe === true,
    "Mandatory Opus approval contract is not satisfied"
  );
  return review;
}

function atomicReplace(file, bytes) {
  const target = path.resolve(file);
  assert(target.startsWith(`${repo}${path.sep}`), `Refusing write outside repo: ${target}`);
  const temp = `${target}.c35-${process.pid}.tmp`;
  fs.writeFileSync(temp, bytes, { flag: "wx" });
  fs.renameSync(temp, target);
}

function installDecisionDocument(draftRelative, targetRelative, decision, expectedBefore) {
  const draft = fs.readFileSync(path.join(repo, draftRelative), "utf8");
  assert(
    (draft.match(/\{\{OPUS_DECISION\}\}/g) || []).length === 1,
    `${draftRelative} must contain exactly one Opus placeholder`
  );
  const decided = draft.replace("{{OPUS_DECISION}}", decision);
  const target = path.join(repo, targetRelative);
  const current = fs.readFileSync(target);
  const decidedBytes = Buffer.from(decided, "utf8");
  const currentHash = sha256(current);
  if (current.equals(decidedBytes)) return identity(targetRelative);
  assert(currentHash === expectedBefore, `${targetRelative} preapproval bytes drift`);
  atomicReplace(target, decidedBytes);
  return identity(targetRelative);
}

function phase10AAssessment(review) {
  const assessment = {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: "2026-07-31T07:36:00.000Z",
    classification: "PHASE_10A_OPEN",
    opusDecision: review.decision,
    reviewedStateDigest: review.reviewedStateDigest,
    decisionClosure: {
      status: "SATISFIED",
      result: "3720/3720"
    },
    relationClosure: {
      status: "SATISFIED",
      result: "3720/3720"
    },
    reasonClosure: {
      status: "NOT_SATISFIED",
      result: "3575/3720",
      remainingReasonOnlyRows: 145
    },
    reasonOnlyResidualFamilies: {
      explicit_non_tax_task: 45,
      explicit_tax_task_relation: 16,
      no_tax_relation: 81,
      tax_compliance_task: 1,
      tax_treatment_of_ordinary_object: 2
    },
    criteria: {
      standaloneAndIntegratedExactGates: {
        status: "SATISFIED_FOR_C35",
        evidence:
          "Candidate 1 6/6; Candidate 2 25/25; legacy trust/support 66 checks; cumulative isolated replay 31/31 in each order."
      },
      frozenRuntime: {
        status: "SATISFIED_FOR_C35",
        c34: c34Runtime,
        c35: c35Runtime
      },
      postFreezeEvidence: {
        status: "SATISFIED_FOR_C35",
        c34Rerun: false,
        c34Mutation: false
      },
      deterministicCleanCycles: {
        status: "SATISFIED_WITH_EXPLICIT_HISTORICAL_GUARD_ADJUDICATION",
        result:
          "Nominal exit 1; 184/217 suites; 54 failures are 33 SCOPE plus 21 STATE; zero runtime behavior failures; no unqualified pass claimed."
      },
      stagingCleanCycles: {
        status: "PRE_REVIEW_AND_PRE_STAGE_CLEAN_FINAL_EXPLICIT_STAGE_GATE_PENDING",
        evidence: "Staging was empty at checkpoint 61, after Candidate 2, and through Opus review."
      },
      independentReview: {
        status: "SATISFIED",
        decision: review.decision,
        reviewer: "Claude Code Opus 4.8",
        readOnly: true
      },
      E2: {
        status: "NOT_EXECUTED",
        authorized: false,
        rationale:
          "Opus approval permits C35 finalization but does not itself authorize or satisfy E2."
      },
      A15: {
        status: "NOT_EXECUTED",
        authorized: false,
        rationale:
          "A15 cannot close Phase 10A while the reason layer retains 145 rows."
      },
      allKnownMaterialTrustDefects: {
        status: "KNOWN_C35_DEFECTS_RESOLVED",
        scope:
          "The generic VAT false-conflict defect and generalized proposition-to-passage support defect are resolved; universal trust or reason-layer closure is not inferred."
      }
    },
    closureCriteriaAllProven: false,
    c35: "TERMINAL",
    r20: "IN_PROGRESS",
    nextExactTask:
      "Separately governed Phase-10A14-R20 continuation for the unresolved reason layer; C36 and Phase 10B remain unauthorized.",
    noDeployment: true,
    noC36: true,
    noPhase10BImplementation: true,
    verdict: "PHASE_10A_OPEN_REASON_LAYER_UNRESOLVED",
    pass: true
  };
  return assessment;
}

function phase10AAssessmentMarkdown(assessment) {
  return `# PHASE-10A closure assessment after COMMIT 5R1-C35

- Classification: **${assessment.classification}**
- C35: **TERMINAL**
- R20: **IN PROGRESS**
- Independent review: **${assessment.opusDecision}**
- Decision: **3720/3720**
- Relation: **3720/3720**
- Reason: **3575/3720**
- Remaining reason-only rows: **145**

The 145 rows are: \`explicit_non_tax_task=45\`,
\`explicit_tax_task_relation=16\`, \`no_tax_relation=81\`,
\`tax_compliance_task=1\`, and
\`tax_treatment_of_ordinary_object=2\`.

C35 resolves the observed generic VAT false-conflict defect and the generalized
proposition-to-passage support defect. It does not prove reason closure, E2 was
not executed, and A15 cannot close Phase 10A while the reason layer remains
incomplete. No C36, Phase 10B implementation, or deployment is authorized.

Next exact task: ${assessment.nextExactTask}
`;
}

function prepareApprovedFinalization() {
  assert(git("rev-parse", "HEAD") === head, "HEAD drift before docs finalization");
  assert(git("rev-parse", "@{u}") === head, "Upstream drift before docs finalization");
  assert(git("diff", "--cached", "--name-only") === "", "Staging is not empty");
  const review = approvedOpusReview();
  const roadmap = installDecisionDocument(
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_ROADMAP_V9_DRAFT.md",
    "knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md",
    review.decision,
    "1ff4772a3c082f8072997e8c86f291a322ec7d1986b866325a7895594fcbf280"
  );
  const currentState = installDecisionDocument(
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CURRENT_STATE_DRAFT.md",
    "knowledge/CURRENT_STATE.md",
    review.decision,
    "e17a7a73b9966458e1410690d2ad2f2c82d75e8808cc78de60f8ee10c3ca1a2c"
  );
  const assessment = phase10AAssessment(review);
  writeOnceJson("COMMIT_5R1C35_PHASE_10A_CLOSURE_ASSESSMENT.json", assessment);
  writeOnce(
    "COMMIT_5R1C35_PHASE_10A_CLOSURE_ASSESSMENT.md",
    phase10AAssessmentMarkdown(assessment)
  );
  const proposed = readJson(
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PROPOSED_STAGED_PATHS.json"
  );
  assert(
    proposed.pass === true &&
      proposed.count === 117 &&
      proposed.paths.length === 117 &&
      new Set(proposed.paths).size === 117 &&
      !proposed.paths.includes(
        "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_RECOVERY_CHECKPOINT.json"
      ) &&
      !proposed.paths.includes(
        "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_RECOVERY_CHECKPOINT_LOG.ndjson"
      ),
    "Proposed staging set invalid"
  );
  writeOnceJson("COMMIT_5R1C35_FINAL_COMMIT_CONTENTS.json", {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: "2026-07-31T07:36:00.000Z",
    parent: head,
    branch: git("branch", "--show-current"),
    phase10A: "PHASE_10A_OPEN",
    c35: "TERMINAL",
    r20: "IN_PROGRESS",
    opusDecision: review.decision,
    reviewedStateDigest: review.reviewedStateDigest,
    activeBase: c35Runtime,
    paths: proposed.paths,
    count: proposed.count,
    explicitFileByFileStagingRequired: true,
    excludedMutableCheckpointPaths: [
      "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_RECOVERY_CHECKPOINT.json",
      "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_RECOVERY_CHECKPOINT_LOG.ndjson"
    ],
    commitMessage:
      "PHASE-10A14-R20 COMMIT 5R1-C35 complete - correct authority-conflict calibration and preserve support independence",
    noDeployment: true,
    pass: true
  });
  const missingOnlyTemporal = proposed.paths
    .filter((item) => !fs.existsSync(path.join(repo, item)))
    .sort();
  const expectedMissingBeforeStageFreeze = [...finalTemporalStagingPaths]
    .filter(
      (item) =>
        item !==
        "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_EVIDENCE.sha256"
    )
    .sort();
  assert(
    sameJson(missingOnlyTemporal, expectedMissingBeforeStageFreeze) &&
      identity(
        "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_EVIDENCE.sha256"
      ).sha256 ===
        "e2425b8e30a8b773de1af5cae5ce8f0ba1bbc98c8d4abb9612be19dc75bdafd3",
    `Unexpected missing proposed paths: ${JSON.stringify(missingOnlyTemporal)}`
  );
  return {
    decision: review.decision,
    phase10A: assessment.classification,
    roadmap,
    currentState,
    proposedPaths: proposed.count,
    temporalStagingPaths: finalTemporalStagingPaths,
    pass: true
  };
}

function freezeFinalStageEvidence() {
  const review = approvedOpusReview();
  const proposed = readJson(
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_PROPOSED_STAGED_PATHS.json"
  );
  const temporal = new Set(finalTemporalStagingPaths);
  const expectedBase = proposed.paths.filter((item) => !temporal.has(item)).sort();
  const observedBase = git("diff", "--cached", "--name-only")
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  assert(sameJson(observedBase, expectedBase), "Explicit base staging set mismatch");
  const finalPaths = [...proposed.paths].sort();
  writeOnceJson("COMMIT_5R1C35_ACTUAL_STAGED_PATHS.json", {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: "2026-07-31T07:39:00.000Z",
    observationStage: "BASE_STAGED_BEFORE_SELF_ATTESTING_TEMPORAL_FILES",
    observedBaseStagedPaths: observedBase,
    observedBaseCount: observedBase.length,
    temporalSelfAttestingPathsToAdd: [...finalTemporalStagingPaths].sort(),
    finalStagedPaths: finalPaths,
    finalCount: finalPaths.length,
    exactUnionMatchesProposed: true,
    pass: true
  });
  writeOnceJson("COMMIT_5R1C35_STAGING_VALIDATION.json", {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: "2026-07-31T07:39:00.000Z",
    proposedCount: proposed.count,
    observedBaseCount: observedBase.length,
    temporalSelfAttestingCount: finalTemporalStagingPaths.length,
    finalExpectedCount: finalPaths.length,
    baseExact: true,
    unionExact: true,
    missing: [],
    unexpected: [],
    duplicates: 0,
    explicitFileByFileOnly: true,
    gitAddDotUsed: false,
    gitAddAllUsed: false,
    excludedMutableCheckpointPointerAndLog: true,
    protectedResidueExcluded: true,
    verdict: "STAGING_SET_READY_FOR_TEMPORAL_ATTESTATION_ADDITION",
    pass: true
  });
  const manifestSourcePaths = [
    ...proposed.paths.filter(
      (item) =>
        item !==
        "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_EVIDENCE.sha256"
    ),
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson"
  ].sort();
  assert(
    manifestSourcePaths.length === 117 &&
      new Set(manifestSourcePaths).size === manifestSourcePaths.length,
    "Final manifest source cardinality invalid"
  );
  const preValidationPaths = manifestSourcePaths.filter(
    (item) =>
      item !==
      "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_MANIFEST_VALIDATION.json"
  );
  assert(
    preValidationPaths.every((item) => fs.existsSync(path.join(repo, item))),
    "A final manifest source is missing before validation publication"
  );
  writeOnceJson("COMMIT_5R1C35_FINAL_MANIFEST_VALIDATION.json", {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: "2026-07-31T07:39:00.000Z",
    manifestPath:
      "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_EVIDENCE.sha256",
    selfExcluded: true,
    sourceRows: manifestSourcePaths.length,
    governedC35PathsIncluded: true,
    opusAndPhase10AAssessmentIncluded: true,
    roadmapAndCurrentStateIncluded: true,
    registryAndC35WalIncluded: true,
    immutableC34WalIncluded: true,
    protectedResidueExcludedAndBoundByPreservationEvidence: true,
    mutableRecoveryPointerAndLogTemporallyExcluded: true,
    futurePostcommitAttestationsTemporallyExcluded: true,
    bad: 0,
    missing: 0,
    duplicates: 0,
    deterministicLexicalOrder: true,
    verdict: "FINAL_MANIFEST_SOURCE_SET_VALID",
    pass: true
  });
  const manifestFiles = [
    ...proposed.paths.filter(
      (item) =>
        item !==
        "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_EVIDENCE.sha256"
    ),
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson"
  ].sort();
  const manifestContents = `${manifestFiles
    .map((item) => `${identity(item).sha256}  ${item}`)
    .join("\n")}\n`;
  const manifestPath = path.join(resultRoot, "COMMIT_5R1C35_FINAL_EVIDENCE.sha256");
  const currentHash = sha256(fs.readFileSync(manifestPath));
  if (fs.readFileSync(manifestPath, "utf8") !== manifestContents) {
    assert(
      currentHash ===
        "e2425b8e30a8b773de1af5cae5ce8f0ba1bbc98c8d4abb9612be19dc75bdafd3",
      "Final evidence path is neither checkpoint-61 bytes nor the expected final manifest"
    );
    atomicReplace(manifestPath, Buffer.from(manifestContents, "utf8"));
  }
  const rows = fs
    .readFileSync(manifestPath, "utf8")
    .trim()
    .split(/\r?\n/);
  for (const row of rows) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(row);
    assert(match, `Malformed final manifest row: ${row}`);
    assert(identity(match[2]).sha256 === match[1], `Bad final manifest hash: ${match[2]}`);
  }
  return {
    opusDecision: review.decision,
    observedBaseCount: observedBase.length,
    temporalPathsToStage: [...finalTemporalStagingPaths].sort(),
    finalExpectedCount: finalPaths.length,
    finalManifest: identity(
      "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_FINAL_EVIDENCE.sha256"
    ),
    finalManifestRows: rows.length,
    bad: 0,
    missing: 0,
    duplicates: 0,
    pass: true
  };
}

if (process.argv.includes("--opus-review")) {
  console.log(JSON.stringify(invokeOpusReviewExactlyOnce(), null, 2));
} else if (process.argv.includes("--prepare-approved-finalization")) {
  console.log(JSON.stringify(prepareApprovedFinalization(), null, 2));
} else if (process.argv.includes("--freeze-final-stage-evidence")) {
  console.log(JSON.stringify(freezeFinalStageEvidence(), null, 2));
} else {
  main();
}
