// FILE: pdf-to-images.js
"use strict";

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";

const DEFAULT_SCALE = Number(process.env.PDF_IMAGE_SCALE || 2.0);
const DEFAULT_OUTPUT_DIR = process.env.PDF_IMAGE_OUTPUT_DIR || os.tmpdir();
const MAX_PAGES = Number(process.env.PDF_IMAGE_MAX_PAGES || 100);

function ensureFileExists(filePath) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("pdfPath is required.");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found: ${filePath}`);
  }

  const stat = fs.statSync(filePath);

  if (!stat.isFile()) {
    throw new Error(`PDF path is not a file: ${filePath}`);
  }
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safePositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function buildImagePath(outputDir, pageNumber) {
  const uniqueId = crypto.randomUUID();

  return path.join(
    outputDir,
    `tina-pdf-page-${uniqueId}-${String(pageNumber).padStart(4, "0")}.png`
  );
}

export async function convertPdfToImages(
  pdfPath,
  {
    outputDir = DEFAULT_OUTPUT_DIR,
    scale = DEFAULT_SCALE,
    maxPages = MAX_PAGES
  } = {}
) {
  ensureFileExists(pdfPath);
  ensureDirectory(outputDir);

  const safeScale = safePositiveNumber(scale, DEFAULT_SCALE);
  const safeMaxPages = Math.max(1, Number(maxPages) || MAX_PAGES);

  const data = new Uint8Array(fs.readFileSync(pdfPath));

  const loadingTask = pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    disableWorker: true
  });

  const pdf = await loadingTask.promise;
  const outputPaths = [];

  const totalPages = Math.min(pdf.numPages, safeMaxPages);

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: safeScale });

    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );

    const context = canvas.getContext("2d");

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    const imagePath = buildImagePath(outputDir, pageNumber);
    const buffer = canvas.toBuffer("image/png");

    fs.writeFileSync(imagePath, buffer);
    outputPaths.push(imagePath);

    page.cleanup?.();
  }

  await pdf.destroy?.();

  return outputPaths;
}

export default {
  convertPdfToImages
};
