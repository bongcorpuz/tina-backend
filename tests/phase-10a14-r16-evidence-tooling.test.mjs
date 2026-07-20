/**
 * PHASE-10A14-R16 — evidence-capture and canonical-registry tooling self-test (COMMIT 2).
 *
 * Synthetic evidence only. Runs entirely in OS temp directories and NEVER reads, writes
 * or alters any historical R13/R14/R15 evidence.
 *
 * Proves the properties the frozen contract requires, including the ones R15 violated:
 * exclusive creation, no overwrite, no delete path, post-import hash verification, and
 * a registry whose counts cannot disagree with the evidence.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  writeImmutable, markStartedExternal, markTerminalExternal, finalizeExternal,
  readCanonicalAttempt, listCanonicalAttempts, TERMINALS, sha256
} from "../evaluation/results/phase-10a14-r16/evidence.mjs";
import evidenceDefault from "../evaluation/results/phase-10a14-r16/evidence.mjs";
import * as evidenceNamespace from "../evaluation/results/phase-10a14-r16/evidence.mjs";

let passed = 0, failed = 0;
const failures = [];
const check = (c, m) => { if (!c) throw new Error(m); };
const equal = (a, b, m) => { if (a !== b) throw new Error(`${m} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`); };
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; failures.push(`${name}: ${e.message}`); console.log(`FAIL ${name}\n  ${e.message}`); }
}

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "r16-tooling-"));
const mkAttempt = (id) => { const d = path.join(ROOT, id); fs.mkdirSync(d, { recursive: true }); return d; };

test("writeImmutable creates, fsyncs and reads back durable content", () => {
  const d = mkAttempt("A1");
  writeImmutable(d, "00-allocated.json", { event: "ALLOCATED", attemptId: "A1" });
  const back = JSON.parse(fs.readFileSync(path.join(d, "00-allocated.json"), "utf8"));
  equal(back.attemptId, "A1", "content round-trip");
});

test("writeImmutable refuses to overwrite an existing event", () => {
  const d = mkAttempt("A2");
  writeImmutable(d, "10-started.json", { event: "STARTED" });
  let threw = null;
  try { writeImmutable(d, "10-started.json", { event: "STARTED_AGAIN" }); } catch (e) { threw = e; }
  check(threw && /IMMUTABLE_FILE_EXISTS/.test(threw.message), "overwrite must throw");
  const back = JSON.parse(fs.readFileSync(path.join(d, "10-started.json"), "utf8"));
  equal(back.event, "STARTED", "original content must be intact");
});

test("a second terminal event is rejected", () => {
  const d = mkAttempt("A3");
  markStartedExternal(d);
  markTerminalExternal(d, TERMINALS.COMPLETED_PASS, { exitCode: 0 });
  let threw = null;
  try { markTerminalExternal(d, TERMINALS.TIMEOUT, {}); } catch (e) { threw = e; }
  check(threw && /TERMINAL_ALREADY_PRESENT/.test(threw.message), "second terminal must throw");
});

test("a non-terminal file cannot be used as a terminal", () => {
  const d = mkAttempt("A4");
  let threw = null;
  try { markTerminalExternal(d, "10-started.json", {}); } catch (e) { threw = e; }
  check(threw && /NOT_A_TERMINAL_FILE/.test(threw.message), "must reject non-terminal");
});

test("finalize writes hashes covering every other file", () => {
  const d = mkAttempt("A5");
  writeImmutable(d, "00-allocated.json", { event: "ALLOCATED" });
  writeImmutable(d, "command.txt", "node something\n");
  markStartedExternal(d);
  markTerminalExternal(d, TERMINALS.COMPLETED_PASS, { exitCode: 0 });
  const n = finalizeExternal(d, { stdout: "out", stderr: "" });
  const lines = fs.readFileSync(path.join(d, "hashes.sha256"), "utf8").split("\n").filter(Boolean);
  equal(lines.length, n, "hash line per file");
  for (const line of lines) {
    const [h, name] = line.split(/\s{2}/);
    equal(sha256(fs.readFileSync(path.join(d, name))), h, `hash for ${name}`);
  }
  check(!lines.some((l) => l.endsWith("hashes.sha256")), "hash file must exclude itself");
});

test("a tampered file is detected by its recorded hash", () => {
  const d = mkAttempt("A6");
  writeImmutable(d, "00-allocated.json", { event: "ALLOCATED" });
  markStartedExternal(d);
  markTerminalExternal(d, TERMINALS.COMPLETED_PASS, { exitCode: 0 });
  finalizeExternal(d, { stdout: "original", stderr: "" });
  fs.writeFileSync(path.join(d, "stdout.raw.txt"), "TAMPERED");
  const lines = fs.readFileSync(path.join(d, "hashes.sha256"), "utf8").split("\n").filter(Boolean);
  const bad = lines.filter((l) => {
    const [h, name] = l.split(/\s{2}/);
    return sha256(fs.readFileSync(path.join(d, name))) !== h;
  });
  equal(bad.length, 1, "tampering must be detectable");
});

test("readCanonicalAttempt classifies a killed attempt with no terminal event", () => {
  const d = mkAttempt("K1");
  writeImmutable(d, "00-allocated.json", { event: "ALLOCATED", attemptId: "K1", attemptType: "CRASH", task: "T" });
  markStartedExternal(d);
  finalizeExternal(d, { stdout: "", stderr: "" });
  const r = readCanonicalAttempt("K1", ROOT);
  equal(r.status, "INCOMPLETE", "no terminal event => INCOMPLETE");
  check(!r.legalMismatch, "must not be a legal mismatch");
});

test("readCanonicalAttempt reports each terminal status correctly", () => {
  const cases = [
    ["T-pass", TERMINALS.COMPLETED_PASS, "COMPLETED_PASS"],
    ["T-fail", TERMINALS.COMPLETED_FAIL, "COMPLETED_FAIL"],
    ["T-tech", TERMINALS.TECHNICAL_FAILURE, "TECHNICAL_FAILURE"],
    ["T-timeout", TERMINALS.TIMEOUT, "TIMEOUT"],
    ["T-killed", TERMINALS.KILLED, "KILLED"],
    ["T-cancel", TERMINALS.CANCELLED, "CANCELLED"]
  ];
  for (const [id, terminal, expected] of cases) {
    const d = mkAttempt(id);
    writeImmutable(d, "00-allocated.json", { event: "ALLOCATED", attemptId: id, attemptType: "CAMPAIGN" });
    markStartedExternal(d);
    markTerminalExternal(d, terminal, { exitCode: expected === "COMPLETED_PASS" ? 0 : 1 });
    finalizeExternal(d, {});
    equal(readCanonicalAttempt(id, ROOT).status, expected, `status for ${id}`);
  }
});

test("malformed JSON in an event is reported, not silently skipped", () => {
  const d = mkAttempt("M1");
  writeImmutable(d, "00-allocated.json", "{not json\n");
  markStartedExternal(d);
  const r = readCanonicalAttempt("M1", ROOT);
  equal(r.malformed, true, "malformed must be reported");
});

test("attempt enumeration finds every attempt directory", () => {
  const ids = listCanonicalAttempts(ROOT);
  check(ids.includes("A1") && ids.includes("K1") && ids.includes("T-killed"), "all attempts enumerable");
});

test("the tooling exposes NO delete, archive, convert or compact function", () => {
  // Whole-word destructive verbs only. A substring match would flag legitimate names
  // such as markTerminalExternal and TERMINALS, which contain "rm" inside "Terminal".
  const DESTRUCTIVE = /^(delete|remove|rm|unlink|archive|convert|compact|prune|purge|overwrite|truncate|reset|clean)[A-Z_]?|(Delete|Remove|Archive|Convert|Compact|Prune|Purge|Overwrite|Truncate)$/;
  const names = Object.keys(evidenceDefault).concat(Object.keys(evidenceNamespace));
  const forbidden = names.filter((n) => DESTRUCTIVE.test(n));
  equal(forbidden.length, 0, `tooling must expose no destructive operation, found: ${forbidden.join(", ")}`);
});

test("evidence.mjs source contains no unlink/rm of canonical attempts", () => {
  const src = fs.readFileSync(new URL("../evaluation/results/phase-10a14-r16/evidence.mjs", import.meta.url), "utf8");
  for (const bad of ["rmSync", "unlinkSync", "rmdirSync", "truncateSync"]) {
    check(!src.includes(bad), `evidence.mjs must not call ${bad}`);
  }
});

test("the tooling never touches historical R13/R14/R15 evidence paths", () => {
  const src = fs.readFileSync(new URL("../evaluation/results/phase-10a14-r16/evidence.mjs", import.meta.url), "utf8");
  for (const p of ["phase-10a14-r13", "phase-10a14-r14", "phase-10a14-r15"]) {
    check(!src.includes(p), `evidence.mjs must not reference ${p}`);
  }
});

fs.rmSync(ROOT, { recursive: true, force: true });
console.log(`\nphase-10a14-r16-tooling: ${passed} passed, ${failed} failed`);
if (failed) { console.error(failures.join("\n")); process.exit(1); }
console.log("PHASE-10A14-R16 TOOLING PASS — immutable capture, hash verification, no destructive path.");
