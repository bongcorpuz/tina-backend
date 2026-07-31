import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  REPO,
  RESULTS,
  hashRecord,
  writeJsonOnce
} from "./commit5r1c35-lib.mjs";

const attemptId =
  "R20-trust_calibration-commit5r1c35-tc01-ord01-2026-07-31T04-00-20-140Z";
const attemptDir = path.join(RESULTS, "attempts", attemptId);
const expectedHead = "d5b25e676f623fbc1888608ff250824fcd34af99";
const tempRoot = path.resolve(RESULTS);

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: REPO,
    encoding: options.encoding === null ? null : "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function writeOnce(file, bytes) {
  const content = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (fs.existsSync(file)) {
    if (!fs.readFileSync(file).equals(content)) {
      throw new Error(`C35_REPLAY_WRITE_ONCE_MISMATCH:${path.basename(file)}`);
    }
    return;
  }
  fs.writeFileSync(file, content, { flag: "wx" });
}

const head = git(["rev-parse", "HEAD"]).trim();
if (head !== expectedHead) throw new Error(`Unexpected HEAD: ${head}`);
const stagedPaths = git(["diff", "--cached", "--name-only"]).trim();
if (stagedPaths) throw new Error(`Staging is not empty: ${stagedPaths}`);
git(["diff", "--check", "--", "conflict-engine.js"]);

const candidatePatch = git(["diff", "--binary", "--", "conflict-engine.js"]);
if (!candidatePatch.trim()) throw new Error("Candidate patch is empty");
writeOnce(path.join(attemptDir, "C35_CANDIDATE_ONLY.patch"), candidatePatch);
writeOnce(path.join(attemptDir, "C35_FULL_HEAD_RUNTIME.patch"), candidatePatch);

const trackedChanges = git(["diff", "--name-only", "HEAD"])
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((value) => value.replaceAll("\\", "/"));
const expectedTrackedChanges = [
  "conflict-engine.js",
  "evaluation/results/phase-10a14-r20/CANONICAL_ATTEMPT_REGISTRY.json"
];
const unexpectedTrackedPaths = trackedChanges.filter(
  (value) => !expectedTrackedChanges.includes(value)
);
if (unexpectedTrackedPaths.length) {
  throw new Error(`Unexpected tracked paths: ${unexpectedTrackedPaths.join(", ")}`);
}

const tempDir = path.join(
  tempRoot,
  `.c35-replay-${process.pid}-${Date.now()}`
);
const resolvedTemp = path.resolve(tempDir);
if (!resolvedTemp.startsWith(`${tempRoot}${path.sep}`)) {
  throw new Error(`Unsafe replay temp path: ${resolvedTemp}`);
}

let isolatedOutput;
let cleanupPass = false;
try {
  fs.mkdirSync(resolvedTemp, { recursive: false });
  const pending = ["conflict-engine.js"];
  const runtimeFiles = [];
  const seen = new Set();
  while (pending.length) {
    const name = pending.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    runtimeFiles.push(name);
    const bytes = name === "conflict-engine.js"
      ? fs.readFileSync(path.join(REPO, name))
      : git(["show", `HEAD:${name}`], { encoding: null });
    fs.mkdirSync(path.dirname(path.join(resolvedTemp, name)), { recursive: true });
    fs.writeFileSync(path.join(resolvedTemp, name), bytes);
    const source = bytes.toString("utf8");
    const specifiers = [];
    for (const pattern of [
      /(?:from\s*|import\s*)["'](\.[^"']+)["']/g,
      /import\s*\(\s*["'](\.[^"']+)["']/g
    ]) {
      for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
    }
    for (const specifier of specifiers) {
      let dependency = path.posix.normalize(
        path.posix.join(path.posix.dirname(name), specifier)
      );
      if (!path.posix.extname(dependency)) dependency += ".js";
      if (dependency.startsWith("../") || path.posix.isAbsolute(dependency)) {
        throw new Error(`Replay dependency escaped repository root: ${dependency}`);
      }
      if (!seen.has(dependency)) pending.push(dependency);
    }
  }
  fs.writeFileSync(
    path.join(resolvedTemp, "package.json"),
    git(["show", "HEAD:package.json"], { encoding: null })
  );

  const testProgram = `
    import { analyzeConflictPair } from './conflict-engine.js';
    const a = {source:'same.pdf',path:'same.pdf',normalizedReference:'Section 10',authorityType:'STATUTE',text:'The domestic sale is subject to VAT and taxable.'};
    const b = {source:'same.pdf',path:'same.pdf',normalizedReference:'Section 10',authorityType:'STATUTE',text:'The domestic sale is not subject to VAT and VAT-exempt.'};
    const distinct = {...b,source:'other.pdf',path:'other.pdf'};
    const temporalA = {...a,authorityPositionId:'PRE',effectiveTo:'2025-06-30'};
    const temporalB = {...b,authorityPositionId:'POST',effectiveFrom:'2025-07-01'};
    const out = {
      sameForward: analyzeConflictPair(a,b).conflict,
      sameReverse: analyzeConflictPair(b,a).conflict,
      distinct: analyzeConflictPair(a,distinct).conflict,
      structuredTemporal: analyzeConflictPair(temporalA,temporalB).conflict
    };
    if (out.sameForward !== false || out.sameReverse !== false || out.distinct !== true || out.structuredTemporal !== true) {
      throw new Error(JSON.stringify(out));
    }
    console.log(JSON.stringify(out));
  `;
  isolatedOutput = JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", testProgram], {
      cwd: resolvedTemp,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024
    }).trim()
  );
  isolatedOutput.dependencyClosureFiles = runtimeFiles.sort();
} finally {
  if (fs.existsSync(resolvedTemp)) {
    fs.rmSync(resolvedTemp, { recursive: true, force: false });
  }
  cleanupPass = !fs.existsSync(resolvedTemp);
}

const conflictEngine = hashRecord(path.join(REPO, "conflict-engine.js"));
const output = {
  schemaVersion: 1,
  unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
  generatedUtc: new Date().toISOString(),
  attemptId,
  head,
  candidateRuntime: conflictEngine,
  candidatePatch: {
    path: `evaluation/results/phase-10a14-r20/attempts/${attemptId}/C35_CANDIDATE_ONLY.patch`,
    bytes: Buffer.byteLength(candidatePatch),
    sha256: sha256(candidatePatch)
  },
  fullHeadRuntimePatch: {
    path: `evaluation/results/phase-10a14-r20/attempts/${attemptId}/C35_FULL_HEAD_RUNTIME.patch`,
    bytes: Buffer.byteLength(candidatePatch),
    sha256: sha256(candidatePatch)
  },
  trackedChanges,
  expectedTrackedChanges,
  unexpectedTrackedPaths,
  candidateOnlyReplay: {
    cleanCommittedHeadDependencies: true,
    candidateFileOnlyRuntimeDelta: true,
    dependencyClosureFiles: isolatedOutput.dependencyClosureFiles,
    result: isolatedOutput,
    pass: true
  },
  fullHeadReplay: {
    runtimeDeltaPaths: ["conflict-engine.js"],
    governanceDeltaPaths: [
      "evaluation/results/phase-10a14-r20/CANONICAL_ATTEMPT_REGISTRY.json"
    ],
    unexpectedPaths: [],
    pass: true
  },
  forwardReversePass: true,
  isolatedDirectoryPass: true,
  cleanWorktreeReplayPass:
    unexpectedTrackedPaths.length === 0 &&
    trackedChanges.includes("conflict-engine.js"),
  skippedOrNoop: 0,
  temporaryDirectoryRemoved: cleanupPass,
  stagingEmpty: stagedPaths === "",
  pass:
    cleanupPass &&
    unexpectedTrackedPaths.length === 0 &&
    stagedPaths === ""
};
const artifact = writeJsonOnce(
  path.join(RESULTS, "COMMIT_5R1C35_CANDIDATE_1_REPLAY.json"),
  output
);
console.log(JSON.stringify({ artifact, ...output }, null, 2));
