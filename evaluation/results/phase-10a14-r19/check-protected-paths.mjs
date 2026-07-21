// PHASE-10A14-R17 — mandatory protected-path index check.
//
// The command pattern `git add evaluation/` is prohibited by the R17 authorization,
// because it swept evaluation/factcheck/ into the index in both R15 and R16. This guard
// runs before EVERY R17 commit and exits non-zero if any staged path is protected.
//
// Usage: node evaluation/results/phase-10a14-r17/check-protected-paths.mjs

import { execSync } from "node:child_process";

const PROTECTED_PREFIXES = [".claude/", ".vscode/", "evaluation/factcheck/"];

let staged = [];
try {
  staged = execSync("git diff --cached --name-only", { encoding: "utf8", maxBuffer: 1 << 28 })
    .split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
} catch (e) {
  console.error(`PROTECTED-PATH CHECK FAILED TO RUN: ${e.message}`);
  process.exit(2);
}

const offenders = staged.filter((f) => PROTECTED_PREFIXES.some((p) => f.startsWith(p)));

if (offenders.length) {
  console.error("PROTECTED PATH STAGED — COMMIT BLOCKED:");
  for (const o of offenders) console.error(`  ${o}`);
  process.exit(1);
}

console.log(`protected-path check OK (${staged.length} staged, 0 protected)`);
