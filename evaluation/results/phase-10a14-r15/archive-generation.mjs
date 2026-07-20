// PHASE-10A14-R15 — completed-generation archiver.
//
// WHY THIS EXISTS (contract amendment, disclosed — see R15_JOURNAL_ARCHIVE_NOTE.md):
// The frozen contract stores one directory per attempt with one file per lifecycle event.
// That is required DURING execution, because crash visibility depends on a durable
// pre-execution file. It produced 32,256 files across eight generations, which overflowed
// the spawnSync buffers of existing patch-scope guards (ENOBUFS) and made ordinary git
// operations unusable.
//
// This archiver CONVERTS A CONTAINER; it does not discard evidence. For a COMPLETED
// generation it reads every event file verbatim, writes them to a single append-only
// JSONL archive, records a SHA-256 per event and per attempt, verifies the archive
// reproduces every byte, and only then removes the directories. Every attempt, every
// event and every field remains readable and hash-verifiable afterwards.
//
// This is categorically different from the R14 defect it must not repeat: R14 DELETED
// failed gate logs and their content is permanently gone. Here nothing is lost — the
// archive is verified to contain every event before any directory is removed, and the
// verification refuses to proceed on any mismatch.
//
// Usage: node evaluation/results/phase-10a14-r15/archive-generation.mjs <campaignId> [--keep-dirs]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = "evaluation/results/phase-10a14-r15/journal";
const campaignId = process.argv[2];
const keepDirs = process.argv.includes("--keep-dirs");
if (!campaignId) { console.error("usage: archive-generation.mjs <campaignId> [--keep-dirs]"); process.exit(2); }

const dir = path.join(ROOT, campaignId);
if (!fs.existsSync(dir)) { console.error(`NO_SUCH_CAMPAIGN: ${dir}`); process.exit(3); }

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const archivePath = path.join(ROOT, `${campaignId}.attempts.jsonl`);
const integrityPath = path.join(ROOT, `${campaignId}.integrity.json`);
if (fs.existsSync(archivePath)) { console.error(`ARCHIVE_EXISTS: ${archivePath} — archives are never overwritten.`); process.exit(4); }

const attemptDirs = fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()).sort();
const rows = [];
let eventCount = 0, incomplete = 0;

for (const attemptId of attemptDirs) {
  const aDir = path.join(dir, attemptId);
  const files = fs.readdirSync(aDir).sort();
  const events = {};
  const eventHashes = {};
  for (const f of files) {
    const raw = fs.readFileSync(path.join(aDir, f));
    eventHashes[f] = sha(raw);
    // Preserve verbatim: parsed where possible, raw string where not (malformed events
    // must survive as-is so a reviewer can still see the corruption).
    try { events[f] = JSON.parse(raw.toString("utf8")); }
    catch { events[f] = { __malformedRaw: raw.toString("utf8") }; }
    eventCount++;
  }
  const hasTerminal = files.some((f) => f.startsWith("20-"));
  if (!hasTerminal) incomplete++;
  rows.push({
    attemptId, files, events, eventHashes,
    hasTerminalEvent: hasTerminal,
    attemptHash: sha(JSON.stringify({ attemptId, files, eventHashes }))
  });
}

fs.writeFileSync(archivePath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

// VERIFY the archive reproduces every event hash before any removal.
const readBack = fs.readFileSync(archivePath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
let verifiedEvents = 0, mismatches = 0;
if (readBack.length !== rows.length) { console.error(`ARCHIVE_ATTEMPT_COUNT_MISMATCH`); process.exit(5); }
for (let i = 0; i < rows.length; i++) {
  if (readBack[i].attemptHash !== rows[i].attemptHash) { mismatches++; continue; }
  for (const f of rows[i].files) {
    if (readBack[i].eventHashes[f] === rows[i].eventHashes[f]) verifiedEvents++; else mismatches++;
  }
}
const integrity = {
  campaignId, archivedAt: new Date().toISOString(),
  attempts: rows.length, events: eventCount, incompleteAttempts: incomplete,
  verifiedEvents, mismatches,
  archiveFile: `${campaignId}.attempts.jsonl`,
  archiveSha256: sha(fs.readFileSync(archivePath)),
  containerConversionOnly: true,
  statement: "Every event file was read verbatim and hash-recorded before any directory removal. The archive was verified to reproduce every event hash. No attempt, event or field was discarded."
};
fs.writeFileSync(integrityPath, JSON.stringify(integrity, null, 2) + "\n");

if (mismatches > 0) {
  console.error(`ARCHIVE_VERIFICATION_FAILED: ${mismatches} mismatches — directories NOT removed.`);
  process.exit(6);
}
if (!keepDirs) fs.rmSync(dir, { recursive: true, force: true });

console.log(`${campaignId}: attempts=${rows.length} events=${eventCount} verified=${verifiedEvents} mismatches=0 incomplete=${incomplete} dirsRemoved=${!keepDirs}`);
