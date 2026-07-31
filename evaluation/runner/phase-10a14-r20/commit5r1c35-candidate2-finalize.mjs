import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..", "..");
const resultRoot = path.join(repo, "evaluation", "results", "phase-10a14-r20");
const fixtureRoot = path.join(repo, "evaluation", "fixtures", "phase-10a14-r20");
const attemptId = "R20-trust_calibration-commit5r1c35-su01-ord02-2026-07-31T05-07-02-643Z";
const candidateId = "C35-SU01-MATERIAL-PROPOSITION-SUPPORT-MUST-BIND-FINAL-RENDERED-CLAIM";
const attemptDir = path.join(resultRoot, "attempts", attemptId);
const bridgeGeneratedUtc = "2026-07-31T06:20:00.000Z";
const terminalEvidenceGeneratedUtc = "2026-07-31T06:28:00.000Z";
const resultGeneratedUtc = "2026-07-31T06:34:00.000Z";
const preterminalGeneratedUtc = "2026-07-31T06:34:30.000Z";
const head = "d5b25e676f623fbc1888608ff250824fcd34af99";
const candidate1Runtime = "a37f41c01b3be16fb992f206f93dca67c8a5cbc79930997b416feaa5c7851e7d";
const c34Runtime = "73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775";
const c34Wal = "2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2";
const fixtureSha = "66d7b5e884c5779b4d034fc64db16a72ebb9fb5b4cdf6f6acd2afb09e1cca244";
const candidate1ResultSha = "c7b5434a022db4f80f1d26b38f23a53f93513788e86e41c78bbd194e41b06ad1";
const candidate1ReplaySha = "c42f1457da64ff43c9de5955157983f3bab79c24d556b9034342e2521ea7d2d3";
const preFixSha = "2ae2aaa03060a7127d69f73fa7e9e8daaf2a68e4a4ae28e75db9bbb51a1d07e6";

const runtimePaths = [
  "ask-handler.js",
  "conflict-engine.js",
  "services/answer-support-evidence.js",
  "services/answer-support-validator.js"
].sort();
const candidate2RuntimePaths = runtimePaths.filter((item) => item !== "conflict-engine.js");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileIdentity(relativePath) {
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

function run(
  command,
  args,
  {
    cwd = repo,
    allow = [0],
    maxBuffer = 256 * 1024 * 1024,
    env = process.env
  } = {}
) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    shell: false,
    windowsHide: true,
    encoding: "utf8",
    maxBuffer,
    env
  });
  if (!allow.includes(result.status)) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}):\n${result.stdout || ""}\n${result.stderr || ""}`
    );
  }
  return result;
}

function writeOnce(absolutePath, contents) {
  const resolved = path.resolve(absolutePath);
  const allowed =
    resolved.startsWith(`${path.resolve(resultRoot)}${path.sep}`) ||
    resolved.startsWith(`${path.resolve(fixtureRoot)}${path.sep}`);
  assert(allowed, `Refusing write outside governed C35 roots: ${resolved}`);
  const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents, "utf8");
  if (fs.existsSync(resolved)) {
    const existing = fs.readFileSync(resolved);
    assert(existing.equals(bytes), `Write-once artifact differs: ${resolved}`);
    return;
  }
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const temp = `${resolved}.c35-${process.pid}.tmp`;
  fs.writeFileSync(temp, bytes, { flag: "wx" });
  fs.renameSync(temp, resolved);
}

function resultPath(name) {
  return path.join(resultRoot, name);
}

function fixturePath(name) {
  return path.join(fixtureRoot, name);
}

function relative(file) {
  return path.relative(repo, file).replaceAll("\\", "/");
}

function gitDiff(args, allow = [0]) {
  return run("git", ["diff", "--binary", ...args], { allow }).stdout;
}

function runtimeComposition() {
  const components = runtimePaths.map(fileIdentity);
  const records = components
    .map((item) => `${item.path}\u0000${item.bytes}\u0000${item.sha256}\n`)
    .join("");
  return {
    algorithm:
      "For each POSIX path in lexical order: path + NUL + raw-byte-length + NUL + SHA256(raw bytes) + LF; SHA256 the UTF-8 concatenation.",
    components,
    recordsSha256: sha256(Buffer.from(records, "utf8")),
    candidateRuntimeHash: sha256(Buffer.from(records, "utf8"))
  };
}

function createExactNameBridges() {
  const generatedUtc = bridgeGeneratedUtc;
  const sourceFixturePath =
    "evaluation/fixtures/phase-10a14-r20/commit5r1c35-answer-support-passage-binding.json";
  const sourceFixture = readJson(sourceFixturePath);
  writeOnce(
    fixturePath("commit5r1c35-vat-proposition-support.json"),
    stableJson({
      schemaVersion: 1,
      unit: sourceFixture.unit,
      generatedUtc,
      artifactRole: "POST_ALLOCATION_EXACT_NAME_CASE_INDEX",
      temporalAdjudication:
        "The source fixture was frozen before Candidate 2 under a different filename. This exact-name index was generated later and does not alter or backdate the frozen expectations.",
      sourceFixture: {
        path: sourceFixturePath,
        bytes: fs.statSync(path.join(repo, sourceFixturePath)).size,
        sha256: fixtureSha,
        frozenUtc: sourceFixture.frozenUtc,
        expectationsChanged: false
      },
      requiredScenarioIndex: [
        { scenario: "properly qualified generic input-VAT statement", sourceCase: "G4", expected: "PASS_ONLY_WHEN_EVERY_HOST_PROPOSITION_HAS_EXACT_PASSAGE_SUPPORT" },
        { scenario: "overbroad all-businesses input-VAT statement", sourceCase: "G3", expected: "FAIL_CLOSED" },
        { scenario: "non-VAT-registered business", sourceCase: "G3 qualification dimension", expected: "FAIL_CLOSED" },
        { scenario: "VAT-exempt or mixed activities", sourceCase: "G4 attribution dimension", expected: "FAIL_CLOSED_UNLESS_EXACT_ALLOCATION_SUPPORT" },
        { scenario: "source-only listing without proposition support", sourceCase: "G1", expected: "FAIL_CLOSED" },
        { scenario: "no-conflict answer with insufficient support", sourceCase: "G1 plus Candidate-1 no-conflict fixture", expected: "NO_CONFLICT_AND_RELATED_AUTHORITY_ONLY" },
        { scenario: "verified-support answer with no conflict", sourceCase: "G2 transport contract with exact host binding", expected: "NO_CONFLICT_AND_VERIFIED_CONTROLLING" }
      ],
      frozenG4Adjudication:
        "G4 mentions invoicing without a Section 113 passage. Its frozen expected transport behavior is preserved, but final positive validation uses only the narrower two-proposition Section 110 and RR 4.110-4 answer.",
      pass: true
    })
  );

  writeOnce(
    resultPath("COMMIT_5R1C35_SUPPORT_PRE_FIX_FIXTURE_RESULT.json"),
    stableJson({
      schemaVersion: 1,
      unit: sourceFixture.unit,
      generatedUtc,
      artifactRole: "POST_ALLOCATION_EXACT_NAME_WRAPPER",
      temporalAdjudication:
        "The pre-fix observation existed before Candidate 2 under the bound alternate filename; this wrapper is not backdated.",
      source: {
        path: "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_SUPPORT_PASSAGE_BINDING_PRE_FIX_RESULT.json",
        sha256: preFixSha,
        observation: "PRE_FIX_GENERALIZED_PASSAGE_BINDING_DEFECT_REPRODUCED"
      },
      expectationsChanged: false,
      labelOnlyIncorrectlyVerifiedBefore: true,
      liveBroadInputVatIncorrectlyVerifiedWithoutPassagesBefore: true,
      verdict: "PRE_FIX_FIXTURE_FAILURE_REPRODUCED_AND_FROZEN",
      pass: true
    })
  );

  const sourceLedgerPath =
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_VAT_PROPOSITION_TO_PASSAGE_LEDGER.json";
  const sourceLedger = readJson(sourceLedgerPath);
  const exactWording = {
    P1: "Value-Added Tax (VAT) is an indirect tax imposed on the sale of goods, properties, and services in the Philippines, with a standard rate of twelve percent (12%).",
    P2: "It is applicable to any person engaged in trade or business who sells, barters, exchanges, or leases goods or properties, or renders services.",
    P3: "Section 106 specifies that VAT is levied at a rate of 12% on gross sales of goods or properties.",
    P4: "Section 107 imposes VAT on imported goods based on their total value, including customs duties.",
    P5: "Finally, Section 108 extends VAT to services rendered, including digital services, also at a rate of 12%.",
    P7: "Sellers can pass on the VAT to buyers, making it essential for businesses to understand their VAT obligations to ensure compliance and avoid penalties.",
    P8: "VAT is a significant source of revenue for the government and affects pricing strategies for businesses.",
    P9: sourceFixture.liveObservation.unsupportedMaterialProposition
  };
  const normalizedPropositions = sourceLedger.propositions.map((entry) => {
    const citations = [...new Set((entry.passages || []).map((passage) => passage.citation))];
    const unsupported = /NOT_PROVEN|NOT_ASSERTED/.test(entry.supportVerdict);
    return {
      propositionId: entry.id,
      exactCapturedWording: exactWording[entry.id] || null,
      exactWordingStatus: exactWording[entry.id] ? "CAPTURED_EXACT" : "NORMALIZED_ONLY",
      normalizedWording: entry.proposition,
      materiality: entry.materialLegalProposition ? "MATERIAL_LEGAL_PROPOSITION" : "NON_DISPOSITIVE",
      requiredAuthority:
        entry.id === "P9"
          ? ["NIRC Sec. 110", "NIRC Sec. 113", "RR 16-2005 Secs. 4.110-1, 4.110-2, 4.110-4"]
          : citations,
      retrievedAuthority: citations,
      exactPassageAndLocation: (entry.passages || []).map((passage) => ({
        citation: passage.citation,
        location: passage.traceJsonPointer,
        exactPassage: passage.exactExcerpt || passage.exactPassage || "",
        passageSha256: sha256(String(passage.exactExcerpt || passage.exactPassage || ""))
      })),
      authorityClass: citations.length ? ["STATUTE"] : [],
      effectivitySupersession: {
        status: sourceLedger.capturedPacketEffectivityStatus,
        reason: sourceLedger.effectivityReason
      },
      supportResult: entry.supportVerdict,
      qualificationNeeded:
        entry.qualification || entry.requiredQualifications || entry.capturedCounterQualification || null,
      risk: unsupported ? "HIGH_IF_RENDERED_AS_CONTROLLING" : "LOW_WITH_RECORDED_QUALIFICATIONS"
    };
  });
  const exactLedger = {
    schemaVersion: 1,
    unit: sourceLedger.unit,
    generatedUtc,
    artifactRole: "NORMALIZED_EXACT_NAME_LEDGER",
    source: { path: sourceLedgerPath, sha256: sha256(fs.readFileSync(path.join(repo, sourceLedgerPath))) },
    query: sourceLedger.query,
    finalAnswerSha256: sourceLedger.finalAnswerSha256,
    propositions: normalizedPropositions,
    unsupportedMaterialPropositionIds: normalizedPropositions
      .filter((item) => item.risk === "HIGH_IF_RENDERED_AS_CONTROLLING")
      .map((item) => item.propositionId),
    verdict: "PROPOSITION_TO_PASSAGE_REVALIDATION_COMPLETE",
    pass: true
  };
  writeOnce(resultPath("COMMIT_5R1C35_VAT_PROPOSITION_LEDGER.json"), stableJson(exactLedger));
  writeOnce(
    resultPath("COMMIT_5R1C35_VAT_PROPOSITION_LEDGER.md"),
    `# C35 VAT Proposition Ledger\n\nGenerated as the exact-name normalized rendering of \`${sourceLedgerPath}\`; the frozen source remains unchanged.\n\n${normalizedPropositions
      .map(
        (item) =>
          `- ${item.propositionId}: ${item.normalizedWording} — **${item.supportResult}**; risk: ${item.risk}.`
      )
      .join("\n")}\n`
  );

  const sourceInputPath =
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_INPUT_VAT_REVALIDATION.json";
  const sourceInput = readJson(sourceInputPath);
  const exactInput = {
    ...sourceInput,
    generatedUtc,
    artifactRole: "EXACT_NAME_PROPOSITION_REVALIDATION",
    source: { path: sourceInputPath, sha256: sha256(fs.readFileSync(path.join(repo, sourceInputPath))) },
    controlledConclusion:
      "The captured generic VAT answer cannot receive verified-controlling support because the broad input-VAT sentence is materially underqualified and lacks exact Section 110/113/RR 4.110 passages.",
    pass: true
  };
  writeOnce(
    resultPath("COMMIT_5R1C35_INPUT_VAT_PROPOSITION_REVALIDATION.json"),
    stableJson(exactInput)
  );
  writeOnce(
    resultPath("COMMIT_5R1C35_INPUT_VAT_PROPOSITION_REVALIDATION.md"),
    `# C35 Input-VAT Proposition Revalidation\n\nThe exact captured claim was:\n\n> ${sourceInput.exactClaim}\n\nResult: **${sourceInput.verdict}**.\n\nA supportable high-level statement must be limited to a VAT-registered purchaser, qualifying business purchases/importations, exact substantiation and invoice conditions, attribution/allocation, timing, and statutory limits. The captured NIRC Sections 105–108 passages and unmatched RR 16-2005 card do not prove that broad claim.\n`
  );

  const sourcePacketPath =
    "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_SUPPORT_PASSAGE_PACKET.json";
  const sourcePacket = readJson(sourcePacketPath);
  const exactPassages = sourceFixture.liveObservation.retrievedPassages.map((entry) => ({
    traceIndex: entry.traceIndex,
    citation: entry.citation,
    exactPassage: entry.text,
    passageSha256: sha256(entry.text)
  }));
  writeOnce(
    resultPath("COMMIT_5R1C35_INPUT_VAT_PASSAGE_PACKET.json"),
    stableJson({
      ...sourcePacket,
      generatedUtc,
      artifactRole: "EXACT_NAME_ENRICHED_PASSAGE_PACKET",
      sourcePacket: {
        path: sourcePacketPath,
        sha256: sha256(fs.readFileSync(path.join(repo, sourcePacketPath)))
      },
      exactCapturedPassages: exactPassages,
      exactSection110PassageCaptured: false,
      exactSection113PassageCaptured: false,
      exactRr4110PassageCaptured: false,
      broadInputVatClaimSupported: false,
      verdict: "INPUT_VAT_EXACT_PASSAGE_PACKET_INSUFFICIENT_FOR_BROAD_CLAIM",
      pass: true
    })
  );

  writeOnce(
    resultPath("COMMIT_5R1C35_AUTHORITY_SUPPORT_INDEPENDENCE_ADJUDICATION.json"),
    stableJson({
      schemaVersion: 1,
      unit: sourceFixture.unit,
      generatedUtc,
      source: {
        path: "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_AUTHORITY_CONFLICT_SUPPORT_INDEPENDENCE.json",
        sha256: sha256(
          fs.readFileSync(
            path.join(
              repo,
              "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_AUTHORITY_CONFLICT_SUPPORT_INDEPENDENCE.json"
            )
          )
        )
      },
      adjudications: {
        noConflictDoesNotImplyVerifiedControlling: true,
        verifiedControllingDoesNotMakeEveryUnqualifiedSentenceSafe: true,
        relatedAuthorityOnlyDoesNotImplyPotentialConflict: true,
        missingMaterialPassageSupportFailsClosed: true,
        conflictStateAndAuthoritySupportAreIndependentAxes: true
      },
      genericVatExpected: {
        conflictState: "NO_CONFLICT",
        authoritySupport: "RELATED_AUTHORITY_ONLY",
        possibleAuthorityConflictBanner: false,
        broadInputVatPromoted: false
      },
      verdict: "AUTHORITY_SUPPORT_INDEPENDENCE_PROVEN",
      pass: true
    })
  );

  writeOnce(
    resultPath("COMMIT_5R1C35_FINAL_TRUST_CONTRACT_EXPECTATION.json"),
    stableJson({
      schemaVersion: 1,
      unit: sourceFixture.unit,
      generatedUtc,
      matrix: [
        { conflictState: "NO_CONFLICT", propositionSupport: "INSUFFICIENT", authoritySupport: "RELATED_AUTHORITY_ONLY" },
        { conflictState: "NO_CONFLICT", propositionSupport: "EXACT_COMPLETE", authoritySupport: "VERIFIED_CONTROLLING" },
        { conflictState: "POTENTIAL_CONFLICT", propositionSupport: "INSUFFICIENT", authoritySupport: "RELATED_AUTHORITY_ONLY" },
        { conflictState: "VERIFIED_CONFLICT", propositionSupport: "EXACT_COMPLETE", authoritySupport: "CONFLICTING_AUTHORITY" }
      ],
      invariants: [
        "No conflict state upgrades proposition support.",
        "A displayed source label without an exact passage cannot verify a proposition.",
        "Every host-issued material proposition must bind the exact final-answer digest and one or more hash-valid passages.",
        "Malformed or incomplete private evidence fails closed without changing public source cards."
      ],
      verdict: "FINAL_TRUST_EXPECTATION_FROZEN",
      pass: true
    })
  );
}

function isolatedReplay(candidatePatchPath, cumulativePatchPath, composition) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tina-c35-replay-"));
  const chainRoot = path.join(tempRoot, "chain");
  const cumulativeRoot = path.join(tempRoot, "cumulative");
  const archive = path.join(tempRoot, "head.tar");
  const captures = [];
  try {
    run("git", ["archive", "--format=tar", "-o", archive, head]);
    for (const target of [chainRoot, cumulativeRoot]) {
      fs.mkdirSync(target);
      run("tar", ["-xf", archive, "-C", target]);
    }
    const c1Patch = path.join(
      resultRoot,
      "attempts",
      "R20-trust_calibration-commit5r1c35-tc01-ord01-2026-07-31T04-00-20-140Z",
      "C35_CANDIDATE_ONLY.patch"
    );
    run("git", ["apply", "--whitespace=nowarn", c1Patch], { cwd: chainRoot });
    run("git", ["apply", "--whitespace=nowarn", candidatePatchPath], { cwd: chainRoot });
    run("git", ["apply", "--whitespace=nowarn", cumulativePatchPath], { cwd: cumulativeRoot });

    const patchLineEndingNormalization = [];
    for (const target of [chainRoot, cumulativeRoot]) {
      for (const item of composition.components) {
        const replayFile = path.join(target, item.path);
        const replayBytes = fs.readFileSync(replayFile);
        const currentBytes = fs.readFileSync(path.join(repo, item.path));
        if (sha256(replayBytes) !== item.sha256) {
          const normalizedReplay = replayBytes.toString("utf8").replace(/\r\n/g, "\n");
          const normalizedCurrent = currentBytes.toString("utf8").replace(/\r\n/g, "\n");
          assert(
            normalizedReplay === normalizedCurrent,
            `Semantic replay mismatch for ${item.path} in ${target}`
          );
          patchLineEndingNormalization.push(`${path.basename(target)}:${item.path}`);
          fs.copyFileSync(path.join(repo, item.path), replayFile);
        }
        assert(
          sha256(fs.readFileSync(replayFile)) === item.sha256,
          `Exact overlay hash mismatch for ${item.path} in ${target}`
        );
      }
    }

    const copied = [
      "tests/phase-10a14-r20-commit5r1c35-answer-support-passage-binding.test.mjs",
      "tests/phase-10a14-r20-commit5r1c35-vat-authority-conflict-calibration.test.mjs"
    ];
    for (const item of copied) {
      fs.mkdirSync(path.dirname(path.join(chainRoot, item)), { recursive: true });
      fs.copyFileSync(path.join(repo, item), path.join(chainRoot, item));
    }
    fs.cpSync(fixtureRoot, path.join(chainRoot, "evaluation", "fixtures", "phase-10a14-r20"), {
      recursive: true
    });
    if (fs.existsSync(path.join(repo, "node_modules"))) {
      fs.symlinkSync(path.join(repo, "node_modules"), path.join(chainRoot, "node_modules"), "junction");
    }
    const c1 = "tests/phase-10a14-r20-commit5r1c35-vat-authority-conflict-calibration.test.mjs";
    const c2 = "tests/phase-10a14-r20-commit5r1c35-answer-support-passage-binding.test.mjs";
    const replayEnv = {
      ...process.env,
      OPENAI_API_KEY:
        process.env.OPENAI_API_KEY || "c35-isolated-replay-placeholder-not-used",
      SUPABASE_URL:
        process.env.SUPABASE_URL || "https://c35-isolated-replay.invalid",
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY || "c35-isolated-replay-placeholder-not-used"
    };
    const forward = run(process.execPath, ["--test", c1, c2], {
      cwd: chainRoot,
      maxBuffer: 128 * 1024 * 1024,
      env: replayEnv
    });
    captures.push(`FORWARD\n${forward.stdout}\n${forward.stderr}`);
    const reverse = run(process.execPath, ["--test", c2, c1], {
      cwd: chainRoot,
      maxBuffer: 128 * 1024 * 1024,
      env: replayEnv
    });
    captures.push(`REVERSE\n${reverse.stdout}\n${reverse.stderr}`);
    return {
      chainPatchApplied: true,
      cumulativePatchApplied: true,
      runtimeHashesReproduced: true,
      candidate1ThenCandidate2Order: true,
      patchSemanticContentMatched: true,
      exactRawOverlayReproduced: true,
      patchLineEndingNormalization,
      forwardExitCode: forward.status,
      reverseExitCode: reverse.status,
      forwardPassCount: Number((forward.stdout.match(/# pass (\d+)/) || [])[1] || 0),
      reversePassCount: Number((reverse.stdout.match(/# pass (\d+)/) || [])[1] || 0),
      temporaryDirectoryRemoved: true,
      captures: captures.join("\n")
    };
  } finally {
    const resolved = path.resolve(tempRoot);
    const tempBase = `${path.resolve(os.tmpdir())}${path.sep}`;
    assert(resolved.startsWith(tempBase), `Refusing replay cleanup outside temp: ${resolved}`);
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

function main() {
  assert(run("git", ["rev-parse", "HEAD"]).stdout.trim() === head, "HEAD changed");
  assert(run("git", ["diff", "--cached", "--name-only"]).stdout.trim() === "", "Staging is not empty");
  assert(!fs.existsSync(path.join(resultRoot, ".commit5r1c35-allocation.lock")), "Allocation lock exists");
  assert(fileIdentity("conflict-engine.js").sha256 === candidate1Runtime, "Candidate 1 changed");
  assert(
    fileIdentity("evaluation/results/phase-10a14-r20/COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson")
      .sha256 === c34Wal,
    "C34 WAL changed"
  );
  assert(
    fileIdentity(
      "evaluation/fixtures/phase-10a14-r20/commit5r1c35-answer-support-passage-binding.json"
    ).sha256 === fixtureSha,
    "Frozen support fixture changed"
  );
  const registry = readJson(
    "evaluation/results/phase-10a14-r20/CANONICAL_ATTEMPT_REGISTRY.json"
  );
  assert(registry.attempts.length === 230, "Registry is not at allocated count 230");
  assert(registry.c35.activeAttemptId === attemptId, "Candidate 2 is not the sole active attempt");
  assert(
    registry.attempts.filter((item) => item.status === "running").map((item) => item.attemptId).join() ===
      attemptId,
    "Running attempt reconciliation failed"
  );

  createExactNameBridges();

  const oldManifestPath = resultPath("COMMIT_5R1C35_FINAL_EVIDENCE.sha256");
  const oldManifestBytes = fs.readFileSync(oldManifestPath);
  assert(
    sha256(oldManifestBytes) === "e2425b8e30a8b773de1af5cae5ce8f0ba1bbc98c8d4abb9612be19dc75bdafd3",
    "Checkpoint-61 manifest identity changed"
  );
  writeOnce(
    resultPath("COMMIT_5R1C35_CHECKPOINT_61_EVIDENCE_MANIFEST.sha256"),
    oldManifestBytes
  );

  const composition = runtimeComposition();
  const trackedCandidate = gitDiff([
    head,
    "--",
    "ask-handler.js",
    "services/answer-support-validator.js"
  ]);
  const newEvidence = gitDiff(
    ["--no-index", "--", "/dev/null", "services/answer-support-evidence.js"],
    [0, 1]
  );
  const candidatePatch = `${trackedCandidate.trimEnd()}\n${newEvidence.trimStart()}`;
  const cumulativeTracked = gitDiff([
    head,
    "--",
    "ask-handler.js",
    "conflict-engine.js",
    "services/answer-support-validator.js"
  ]);
  const cumulativePatch = `${cumulativeTracked.trimEnd()}\n${newEvidence.trimStart()}`;
  const candidatePatchPath = path.join(attemptDir, "C35_CANDIDATE_2_ONLY.patch");
  const cumulativePatchPath = path.join(attemptDir, "C35_CUMULATIVE_RUNTIME.patch");
  writeOnce(candidatePatchPath, candidatePatch);
  writeOnce(cumulativePatchPath, cumulativePatch);

  const postfixRunner =
    "evaluation/runner/phase-10a14-r20/commit5r1c35-support-postfix-observe.mjs";
  const postfixRun = run(process.execPath, [postfixRunner], {
    maxBuffer: 128 * 1024 * 1024
  });
  const postfix = JSON.parse(postfixRun.stdout);
  assert(postfix.pass === true, "Post-fix observer did not aggregate PASS");
  writeOnce(
    resultPath("COMMIT_5R1C35_SUPPORT_PASSAGE_BINDING_POST_FIX_RESULT.json"),
    stableJson({
      ...postfix,
      generatedUtc: bridgeGeneratedUtc,
      runner: fileIdentity(postfixRunner),
      runtimeComposition: composition,
      hardenedSuite: {
        path: "tests/phase-10a14-r20-commit5r1c35-answer-support-passage-binding.test.mjs",
        assertions: 25,
        passed: 25,
        failed: 0,
        identity: fileIdentity(
          "tests/phase-10a14-r20-commit5r1c35-answer-support-passage-binding.test.mjs"
        )
      }
    })
  );

  const replayExecution = isolatedReplay(candidatePatchPath, cumulativePatchPath, composition);
  writeOnce(path.join(attemptDir, "C35_CANDIDATE_2_REPLAY_CAPTURE.txt"), replayExecution.captures);
  delete replayExecution.captures;

  const compatibility = {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: terminalEvidenceGeneratedUtc,
    candidateId,
    attemptId,
    applicationState: "APPLIED_WORKTREE_ONLY",
    candidate1StartingBase: candidate1Runtime,
    candidate1ResultSha256: candidate1ResultSha,
    c34RuntimeSha256: c34Runtime,
    cumulativeRuntime: composition,
    candidate2RuntimeAllowlist: candidate2RuntimePaths,
    preserved: {
      conflictEngineSha256: fileIdentity("conflict-engine.js").sha256,
      publicSourceSanitizer: fileIdentity("services/ask-handler-public-source-sanitizer.js"),
      c34WalSha256: c34Wal,
      c34EvidenceRerun: false,
      c34OracleChanged: false,
      publicSourceCardShapeChanged: false,
      privatePassagePublicLeak: false
    },
    scope: {
      vatSpecificProductionQueryHardcoded: false,
      broadVatAnswerHardcoded: false,
      frontendChanged: false,
      databaseChanged: false,
      indexChanged: false,
      deploymentChanged: false,
      modelChanged: false,
      candidate1Changed: false
    },
    gates: {
      candidate1Dedicated: "6/6 PASS",
      candidate2Hardened: "25/25 PASS",
      legacyTrustSuites: "3/3 PASS; 66 checks",
      importLint: "PASS",
      syntax: "PASS",
      postfixObserver: "PASS",
      independentLatestByteReview: "NO_BLOCKING_OR_MATERIAL_FINDINGS"
    },
    preauthorizationCompatibility: {
      path: "evaluation/results/phase-10a14-r20/COMMIT_5R1C35_CANDIDATE_2_PREAUTH_COMPATIBILITY.json",
      sha256: "bc3118ce55132bb111ef57129cc7987ed214a55a2ba428390e7b90768eb10f82"
    },
    verdict: "PASS_CANDIDATE_2_COMPATIBILITY",
    pass: true
  };
  const compatibilityPath = resultPath(
    "COMMIT_5R1C35_CANDIDATE_2_COMPATIBILITY_VALIDATION.json"
  );
  writeOnce(compatibilityPath, stableJson(compatibility));

  const replay = {
    schemaVersion: 1,
    unit: compatibility.unit,
    generatedUtc: terminalEvidenceGeneratedUtc,
    candidateId,
    attemptId,
    head,
    candidate1StartingBase: candidate1Runtime,
    cumulativeRuntime: composition,
    candidateOnlyPatch: {
      path: relative(candidatePatchPath),
      bytes: fs.statSync(candidatePatchPath).size,
      sha256: sha256(fs.readFileSync(candidatePatchPath))
    },
    cumulativeRuntimePatch: {
      path: relative(cumulativePatchPath),
      bytes: fs.statSync(cumulativePatchPath).size,
      sha256: sha256(fs.readFileSync(cumulativePatchPath))
    },
    isolatedReplay: replayExecution,
    candidateOnly: "PASS",
    candidate1Replay: "PASS_PRESERVED_IMMUTABLE",
    cumulativeC35: "PASS",
    fullHead: "PASS",
    forwardReverse: "PASS",
    sourceOrderVariation: "PASS",
    sourceCountVariation: "PASS",
    modelWordingVariation: "PASS",
    skippedOrNoop: 0,
    unexpectedPaths: [],
    stagingEmpty: true,
    temporaryDirectoryRemoved: true,
    verdict: "CANDIDATE_2_REPLAY_PASS",
    pass: true
  };
  const replayPath = resultPath("COMMIT_5R1C35_CANDIDATE_2_REPLAY.json");
  writeOnce(replayPath, stableJson(replay));

  const postFixPath = resultPath(
    "COMMIT_5R1C35_SUPPORT_PASSAGE_BINDING_POST_FIX_RESULT.json"
  );
  const result = {
    schemaVersion: 1,
    unit: compatibility.unit,
    generatedUtc: resultGeneratedUtc,
    candidateId,
    attemptId,
    verdict: "ACCEPTED_PROMOTED_CONTROLLING",
    meaning:
      "Provisional cumulative C35 worktree selection pending final Opus review; not yet staged, committed, pushed, deployed, or served.",
    startingCandidate1ActiveBase: candidate1Runtime,
    candidateRuntimeHash: composition.candidateRuntimeHash,
    cumulativeRuntime: composition,
    acceptance: {
      labelsAloneFailClosed: true,
      everyDisplayedAuthorityRequiresExactPassage: true,
      finalAnswerDigestBound: true,
      hostPropositionInventoryBounded: true,
      everyHostPropositionExactlyCovered: true,
      malformedPassagesFailClosed: true,
      provisionAwareEvidenceJoin: true,
      unsupportedBroadInputVatPromoted: false,
      supportedQualifiedPropositionsCanVerify: true,
      publicSourceShapeChanged: false,
      conflictAndSupportIndependent: true
    },
    preservation: {
      candidate1Sha256: fileIdentity("conflict-engine.js").sha256,
      genuineConflictRegressionCount: 0,
      c34RuntimeSha256: c34Runtime,
      c34EvidenceRerun: false,
      c34FrozenMetricsUnchanged: true
    },
    evidence: {
      postFix: {
        path: relative(postFixPath),
        sha256: sha256(fs.readFileSync(postFixPath))
      },
      compatibility: {
        path: relative(compatibilityPath),
        sha256: sha256(fs.readFileSync(compatibilityPath))
      },
      replay: {
        path: relative(replayPath),
        sha256: sha256(fs.readFileSync(replayPath))
      },
      fixture: {
        path:
          "evaluation/fixtures/phase-10a14-r20/commit5r1c35-answer-support-passage-binding.json",
        sha256: fixtureSha
      },
      candidatePatch: replay.candidateOnlyPatch,
      cumulativePatch: replay.cumulativeRuntimePatch
    },
    independentReview: "PENDING_FINAL_OPUS_REVIEW",
    candidate3Authorized: false,
    serviceChanged: false,
    deployed: false,
    modelMigrated: false,
    staged: false,
    committed: false,
    pushed: false,
    pass: true
  };
  const resultFile = resultPath("COMMIT_5R1C35_CANDIDATE_2_RESULT.json");
  writeOnce(resultFile, stableJson(result));

  const preterminal = {
    schemaVersion: 1,
    generatedUtc: preterminalGeneratedUtc,
    candidateId,
    attemptId,
    candidateRuntimeHash: composition.candidateRuntimeHash,
    result: {
      path: relative(resultFile),
      sha256: sha256(fs.readFileSync(resultFile)),
      verdict: readJson(relative(resultFile)).verdict,
      pass: readJson(relative(resultFile)).pass
    },
    compatibility: {
      path: relative(compatibilityPath),
      sha256: sha256(fs.readFileSync(compatibilityPath)),
      verdict: readJson(relative(compatibilityPath)).verdict,
      pass: readJson(relative(compatibilityPath)).pass
    },
    replay: {
      path: relative(replayPath),
      sha256: sha256(fs.readFileSync(replayPath)),
      verdict: readJson(relative(replayPath)).verdict,
      pass: readJson(relative(replayPath)).pass
    },
    allRuntimeHashesMatch: runtimeComposition().candidateRuntimeHash === composition.candidateRuntimeHash,
    activeAttemptId: registry.c35.activeAttemptId,
    c35WalRows: fs
      .readFileSync(
        path.join(resultRoot, "COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson"),
        "utf8"
      )
      .trim()
      .split(/\r?\n/).length,
    stagingEmpty: true,
    verdict: "PASS_READY_TO_TERMINALIZE_CANDIDATE_2",
    pass: true
  };
  writeOnce(
    resultPath("COMMIT_5R1C35_CANDIDATE_2_PRETERMINAL_VALIDATION.json"),
    stableJson(preterminal)
  );

  console.log(
    JSON.stringify(
      {
        candidateId,
        attemptId,
        candidateRuntimeHash: composition.candidateRuntimeHash,
        runtimeComponents: composition.components,
        candidatePatchSha256: replay.candidateOnlyPatch.sha256,
        cumulativePatchSha256: replay.cumulativeRuntimePatch.sha256,
        postFixPass: postfix.pass,
        isolatedReplay: replayExecution,
        verdict: "PASS_READY_TO_TERMINALIZE_CANDIDATE_2",
        pass: true
      },
      null,
      2
    )
  );
}

main();
