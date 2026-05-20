// FILE: document-conversion-service.js
"use strict";

/**
 * TINA Document Conversion Service
 * Version: 1.0.0
 *
 * Role:
 * - Convert XLSX and PPTX buffers to plain Markdown text
 * - Thin Node.js wrapper around the markitdown Python package
 * - Called only from drive-reader.js for unsupported binary formats
 *
 * Boundary:
 * - No OpenAI calls
 * - No answer generation
 * - No vector search
 * - No retrieval policy
 * - No legal reasoning
 * - No Drive API calls
 *
 * Security contract:
 * - Input is always a Buffer written to a crypto-random temp path (no user-controlled path)
 * - convert_local() is used — no URL fetching, no SSRF surface
 * - enable_plugins=False — no untrusted plugin execution
 * - Subprocess killed after CONVERSION_TIMEOUT_MS
 * - Temp file always deleted in finally block regardless of outcome
 * - File size checked against MAX_INPUT_BYTES before spawning Python
 * - Extension allowlist enforced — only xlsx and pptx reach markitdown
 * - Drive file names are never used as temp file paths (path traversal prevention)
 */

import { spawn } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";

const SERVICE_VERSION = "1.0.0";

const CONVERSION_TIMEOUT_MS = Number(
  process.env.MARKITDOWN_TIMEOUT_MS || 30000
);

// Hard limit before spawning Python. Protects against zip/XML bombs in XLSX/PPTX containers.
const MAX_INPUT_BYTES = Number(
  process.env.MARKITDOWN_MAX_BYTES || 50 * 1024 * 1024 // 50 MB
);

// Strict allowlist — no other extension reaches markitdown from this service.
const ALLOWED_EXTENSIONS = new Set(["xlsx", "pptx"]);

/**
 * Python inline script executed via python3 -c.
 * Receives the temp file path as sys.argv[1].
 * Security notes:
 *   - convert_local() is preferred (no URL dispatch); falls back to convert() if unavailable.
 *   - enable_plugins=False blocks any installed markitdown plugin execution.
 *   - os.path.isfile() guard rejects non-existent or non-file paths before conversion.
 *   - Sentinel strings on stdout let Node.js detect specific failure modes without
 *     parsing stderr, which may contain Python tracebacks with sensitive path info.
 */
const PYTHON_SCRIPT = `
import sys, os
try:
    from markitdown import MarkItDown
except ImportError:
    sys.stdout.write("__MARKITDOWN_NOT_INSTALLED__")
    sys.stdout.flush()
    sys.exit(2)
path = sys.argv[1] if len(sys.argv) > 1 else ""
if not path or not os.path.isfile(path):
    sys.stdout.write("__MARKITDOWN_FILE_NOT_FOUND__")
    sys.stdout.flush()
    sys.exit(3)
md = MarkItDown(enable_plugins=False)
if hasattr(md, "convert_local"):
    result = md.convert_local(path)
else:
    result = md.convert(path)
text = result.text_content if result and result.text_content else ""
sys.stdout.write(text)
sys.stdout.flush()
`.trim();

function sanitizeExtension(ext = "") {
  // Strip everything that isn't a lowercase alphanumeric — prevents any injection
  // through the extension string into the temp file name.
  return String(ext || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function writeTempFile(buffer, ext) {
  const safeExt = sanitizeExtension(ext);

  if (!ALLOWED_EXTENSIONS.has(safeExt)) {
    throw new Error(
      `convertWithMarkitdown: extension '${safeExt}' not in allowlist [${[...ALLOWED_EXTENSIONS].join(", ")}]`
    );
  }

  // Crypto-random name — Drive file names are never used here.
  const name = `tina_conv_${randomBytes(16).toString("hex")}.${safeExt}`;
  const path = join(tmpdir(), name);

  // wx flag = exclusive create — fails if path already exists (race-condition-safe).
  await writeFile(path, buffer, { flag: "wx" });

  return path;
}

async function deleteTempFile(path) {
  try {
    await unlink(path);
  } catch {
    // Best-effort — temp files are ephemeral on Render; log nothing to avoid leaking path.
  }
}

function runPython(tempPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", ["-c", PYTHON_SCRIPT, tempPath], {
      stdio: ["ignore", "pipe", "pipe"]
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    proc.stdout.on("data", chunk => stdoutChunks.push(chunk));
    proc.stderr.on("data", chunk => stderrChunks.push(chunk));

    // Hard kill after timeout — prevents hung conversion from blocking the reindex.
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(
        new Error(
          `markitdown conversion timed out after ${CONVERSION_TIMEOUT_MS}ms`
        )
      );
    }, CONVERSION_TIMEOUT_MS);

    proc.on("close", code => {
      clearTimeout(timer);

      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8").slice(0, 400);

      if (stdout.startsWith("__MARKITDOWN_NOT_INSTALLED__")) {
        return reject(
          new Error(
            "markitdown Python package not installed. " +
            "Add pip install 'markitdown[xlsx,pptx]' to your Render build command."
          )
        );
      }

      if (stdout.startsWith("__MARKITDOWN_FILE_NOT_FOUND__")) {
        return reject(
          new Error("markitdown: temp file missing before conversion (internal error)")
        );
      }

      if (code !== 0) {
        return reject(
          new Error(`markitdown exited ${code}: ${stderr}`)
        );
      }

      resolve(stdout);
    });

    proc.on("error", err => {
      clearTimeout(timer);

      if (err.code === "ENOENT") {
        return reject(
          new Error(
            "python3 not found in PATH. " +
            "Ensure Python 3.10+ is installed on the runtime image."
          )
        );
      }

      reject(err);
    });
  });
}

/**
 * Convert a binary buffer (XLSX or PPTX) to Markdown text via markitdown.
 *
 * @param {Buffer} buffer  - Raw file bytes downloaded from Google Drive.
 * @param {string} ext     - File extension without dot: "xlsx" or "pptx".
 * @returns {Promise<string>} Markdown text content.
 */
export async function convertWithMarkitdown(buffer, ext) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("convertWithMarkitdown: input must be a Buffer");
  }

  if (buffer.length === 0) {
    throw new Error("convertWithMarkitdown: input buffer is empty");
  }

  if (buffer.length > MAX_INPUT_BYTES) {
    const limitMB = (MAX_INPUT_BYTES / 1024 / 1024).toFixed(0);
    const actualMB = (buffer.length / 1024 / 1024).toFixed(1);
    throw new Error(
      `convertWithMarkitdown: file is ${actualMB}MB — exceeds ${limitMB}MB limit`
    );
  }

  let tempPath = null;

  try {
    tempPath = await writeTempFile(buffer, ext);
    const markdown = await runPython(tempPath);
    return markdown.trim();
  } finally {
    if (tempPath) await deleteTempFile(tempPath);
  }
}

export function documentConversionHealthCheck() {
  return {
    ok: true,
    engine: "TINA_DOCUMENT_CONVERSION_SERVICE",
    version: SERVICE_VERSION,
    backend: "markitdown",
    installCommand: "pip install 'markitdown[xlsx,pptx]'",
    allowedExtensions: [...ALLOWED_EXTENSIONS],
    maxInputBytes: MAX_INPUT_BYTES,
    conversionTimeoutMs: CONVERSION_TIMEOUT_MS,
    security: {
      noUrlFetching: true,
      pluginsDisabled: true,
      cryptoRandomTempPath: true,
      driveFileNameNeverUsedAsTempPath: true,
      tempFileAutoDeletedInFinally: true,
      exclusiveFileCreateFlag: true,
      extensionAllowlist: true,
      fileSizeLimitEnforced: true,
      subprocessKilledOnTimeout: true
    }
  };
}

export default { convertWithMarkitdown, documentConversionHealthCheck };
