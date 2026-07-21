// PHASE-10A14-R18 — all-26 write-isolation suite (P1-R17-IR1-003).
//
// Proves the replay is STRUCTURALLY unable to write historical evidence, rather than
// detecting a mutation and restoring afterwards.
import {
  computeAll26, replayAll26To, assertWritableDestination, HISTORICAL_EVIDENCE_DIRS
} from "../evaluation/results/phase-10a14-r18/all26-isolated.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const PATCH = "PHASE-10A14-R18-ALL26-WRITE-ISOLATION";
let passed = 0, failed = 0, assertions = 0;
const check = (cond, label) => { assertions++; if (!cond) throw new Error(`assertion failed: ${label}`); };
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}

const R17_ARTIFACT = "evaluation/results/phase-10a14-r17/R17_ALL26_NONMUTATING.json";
const E1_ARTIFACT = "evaluation/results/phase-10a14-e1/WS8_DETERMINISTIC_ALL26.json";
const hashOf = (f) => (fs.existsSync(f) ? crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex") : "ABSENT");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "r18-all26-"));

// ─── Negative control: a historical destination is refused before opening ────
await test("NEGATIVE CONTROL: a historical destination is rejected before any file is opened", () => {
  const before = hashOf(R17_ARTIFACT);
  const mtimeBefore = fs.statSync(R17_ARTIFACT).mtimeMs;
  let threw = false, message = "";
  try { assertWritableDestination(R17_ARTIFACT); } catch (e) { threw = true; message = e.message; }
  check(threw, "the guard throws");
  check(/refusing to write into historical evidence/.test(message), `message names the refusal: ${message}`);
  check(hashOf(R17_ARTIFACT) === before, "target content unchanged");
  check(fs.statSync(R17_ARTIFACT).mtimeMs === mtimeBefore, "target mtime unchanged — nothing was opened");
});

await test("NEGATIVE CONTROL: every historical evidence directory is refused", () => {
  for (const dir of HISTORICAL_EVIDENCE_DIRS) {
    let threw = false;
    try { assertWritableDestination(path.join(dir, "anything.json")); } catch { threw = true; }
    check(threw, `refused: ${dir}`);
  }
  let e1 = false;
  try { assertWritableDestination(E1_ARTIFACT); } catch { e1 = true; }
  check(e1, "the E1 artifact is refused");
});

await test("NEGATIVE CONTROL: there is no default destination", () => {
  for (const bad of [undefined, null, "", "   "]) {
    let threw = false, msg = "";
    try { assertWritableDestination(bad); } catch (e) { threw = true; msg = e.message; }
    check(threw, `no default for: ${JSON.stringify(bad)}`);
    check(/explicit output destination is required/.test(msg), "message states there is no default");
  }
});

await test("NEGATIVE CONTROL: an arbitrary in-repository path outside R18 is refused", () => {
  for (const bad of ["pipeline.js", "evaluation/results/somewhere-else/x.json", "knowledge/CURRENT_STATE.md"]) {
    let threw = false;
    try { assertWritableDestination(bad); } catch { threw = true; }
    check(threw, `refused in-repo non-R18 path: ${bad}`);
  }
});

await test("authorized destinations are accepted", () => {
  check(assertWritableDestination("evaluation/results/phase-10a14-r18/x.json").length > 0, "R18 evidence path accepted");
  check(assertWritableDestination(path.join(tmp, "x.json")).length > 0, "external temporary path accepted");
});

// ─── The computation is pure ─────────────────────────────────────────────────
await test("computeAll26 is pure: it writes nothing anywhere", async () => {
  const r17Before = hashOf(R17_ARTIFACT), e1Before = hashOf(E1_ARTIFACT);
  const statusBefore = execSync("git status --porcelain=v1 -- evaluation/results", { encoding: "utf8" });
  const result = await computeAll26();
  check(result.totalSlots === 26, "26 slots evaluated");
  check(hashOf(R17_ARTIFACT) === r17Before, "R17 artifact unchanged by the pure computation");
  check(hashOf(E1_ARTIFACT) === e1Before, "E1 artifact unchanged by the pure computation");
  const statusAfter = execSync("git status --porcelain=v1 -- evaluation/results", { encoding: "utf8" });
  check(statusAfter === statusBefore, "git status on evaluation/results is unchanged");
});

// ─── Full replay leaves historical evidence byte-identical ───────────────────
await test("a full replay to an external path leaves all historical evidence identical", async () => {
  const r17Before = hashOf(R17_ARTIFACT), e1Before = hashOf(E1_ARTIFACT);
  const r17MtimeBefore = fs.statSync(R17_ARTIFACT).mtimeMs;
  const statusBefore = execSync("git status --porcelain=v1 -- evaluation/results", { encoding: "utf8" });

  const dest = path.join(tmp, "external-replay.json");
  const { destination, result } = await replayAll26To(dest);

  check(fs.existsSync(destination), "output exists at the authorized destination");
  check(result.blockedCount === 9 && result.preservedCount === 17, "9 blocked / 17 preserved");
  check(result.mismatchCount === 0, "no mismatch");
  check(hashOf(R17_ARTIFACT) === r17Before, "R17 artifact byte-identical");
  check(fs.statSync(R17_ARTIFACT).mtimeMs === r17MtimeBefore, "R17 artifact mtime unchanged");
  check(hashOf(E1_ARTIFACT) === e1Before, "E1 artifact byte-identical");
  check(execSync("git status --porcelain=v1 -- evaluation/results", { encoding: "utf8" }) === statusBefore,
        "git status unchanged — no restore was needed and none was issued");
});

// ─── Concurrent control ──────────────────────────────────────────────────────
await test("CONCURRENT CONTROL: two isolated replays do not race, overwrite or touch history", async () => {
  const r17Before = hashOf(R17_ARTIFACT), e1Before = hashOf(E1_ARTIFACT);
  const d1 = path.join(tmp, "concurrent-a.json");
  const d2 = path.join(tmp, "concurrent-b.json");
  const [a, b] = await Promise.all([replayAll26To(d1), replayAll26To(d2)]);

  check(a.destination !== b.destination, "different output paths");
  check(fs.existsSync(d1) && fs.existsSync(d2), "both outputs exist");
  const h1 = hashOf(d1), h2 = hashOf(d2);
  check(h1 !== "ABSENT" && h2 !== "ABSENT", "both outputs independently hashable");
  check(h1 === h2, "same deterministic computation yields equal content in both");
  check(a.result.pass && b.result.pass, "both replays pass");
  check(hashOf(R17_ARTIFACT) === r17Before, "R17 artifact untouched under concurrency");
  check(hashOf(E1_ARTIFACT) === e1Before, "E1 artifact untouched under concurrency");
});

// ─── The R17 script's own defect is documented and not repeated ──────────────
await test("the R18 module contains no hardcoded historical write target", () => {
  const src = fs.readFileSync("evaluation/results/phase-10a14-r18/all26-isolated.mjs", "utf8");
  // The historical dirs appear only inside the REFUSAL list, never as a write target.
  check(!/writeFileSync\([^)]*phase-10a14-r1[3-7]/.test(src), "no write to R13-R17 paths");
  check(!/writeFileSync\([^)]*phase-10a14-e1/.test(src), "no write to E1 paths");
  const writes = src.match(/fs\.writeFileSync\([^,]+/g) || [];
  check(writes.length === 1, `exactly one write site, found ${writes.length}`);
  check(/abs/.test(writes[0]), "the single write site writes to the validated destination variable");
});

await test("mutation-detection-plus-restore is not used anywhere in the R18 replay", () => {
  const raw = fs.readFileSync("evaluation/results/phase-10a14-r18/all26-isolated.mjs", "utf8");
  // Strip comments: the header deliberately DESCRIBES R17's defect, including the words
  // it printed. The claim under test is about executable design, not about prose.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
  check(!/git checkout/.test(src), "no restore command in code");
  check(!/rmSync|unlinkSync/.test(src), "nothing is written and then removed");
  check(!/hashBefore|hashAfter|Untouched|createHash/.test(src),
        "the design does not rely on before/after hashing to claim isolation");
  check(/e1Untouched/.test(raw) && !/e1Untouched/.test(src),
        "the R17 defect is documented in a comment only, never relied on in code");
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
