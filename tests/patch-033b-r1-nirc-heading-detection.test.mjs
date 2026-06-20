/**
 * PATCH-033B-R1 Tests
 * NIRC compact structural section-heading detection.
 *
 * Keeps the detector logic self-contained so this test can run without live
 * OpenAI/Supabase credentials required by vector-store.js module import.
 *
 * Run: node tests/patch-033b-r1-nirc-heading-detection.test.mjs
 */

function detectNircSectionHeading(chunkText = "") {
  const directMatch = chunkText.match(
    /(?:^|[\r\n]|\.\s*|\s{2,})\s*(?:SEC(?:TION)?\.?)\s+([0-9]+[A-Z]?)\./i
  );
  if (directMatch) return `NIRC Sec. ${directMatch[1]}`;

  const compactStructuralMatch = chunkText.match(
    /\b(?:TITLE|CHAPTER|SUBTITLE)\s+(?:[IVXLC]+|[0-9]+|[A-Z])\b(?:(?!\bSEC(?:TION)?\.?\s+[0-9]+[A-Z]?\.).){0,180}\b(?:SEC(?:TION)?\.?)\s+([0-9]+[A-Z]?)\./i
  );
  if (compactStructuralMatch) return `NIRC Sec. ${compactStructuralMatch[1]}`;

  return null;
}

function simulateNircScope(chunks = []) {
  let lastNircSection = null;
  return chunks.map((chunk, chunkIndex) => {
    const detected = detectNircSectionHeading(chunk);
    let normalizedReference = null;
    let sectionHeading = null;
    if (detected) {
      lastNircSection = detected;
      normalizedReference = detected;
      sectionHeading = detected;
    } else if (lastNircSection) {
      normalizedReference = lastNircSection;
    }
    return { chunkIndex, normalizedReference, sectionHeading };
  });
}

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
    failures.push(label);
  }
}

function group(name, fn) {
  console.log(`\n-- ${name}`);
  fn();
}

group("Group 1: compact CHAPTER headings are detected", () => {
  assert(
    detectNircSectionHeading("TITLE II TAX ON INCOME CHAPTER I DEFINITIONS SEC. 22. Definitions. - When used in this Title:") === "NIRC Sec. 22",
    "CHAPTER I DEFINITIONS SEC. 22. -> NIRC Sec. 22"
  );
  assert(
    detectNircSectionHeading("CHAPTER II GENERAL PRINCIPLES SEC. 23. General Principles of Income Taxation in the Philippines.") === "NIRC Sec. 23",
    "CHAPTER II GENERAL PRINCIPLES SEC. 23. -> NIRC Sec. 23"
  );
  assert(
    detectNircSectionHeading("TITLE IV VALUE- ADDED TAX TITLE IV VALUE ADDED TAX CHAPTER I IMPOSITION OF TAX SEC. 105. Persons Liable.") === "NIRC Sec. 105",
    "CHAPTER I IMPOSITION OF TAX SEC. 105. -> NIRC Sec. 105"
  );
});

group("Group 2: ordinary heading detection remains unchanged", () => {
  assert(
    detectNircSectionHeading("SEC. 106. Value-Added Tax on Sale of Goods or Properties.") === "NIRC Sec. 106",
    "start-of-chunk SEC. 106. still detected"
  );
  assert(
    detectNircSectionHeading("Prior sentence. SEC. 107. Value-Added Tax on Importation of Goods.") === "NIRC Sec. 107",
    "sentence-boundary SEC. 107. still detected"
  );
  assert(
    detectNircSectionHeading("Some text\nSection 108. Value-Added Tax on Sale of Services.") === "NIRC Sec. 108",
    "newline Section 108. still detected"
  );
});

group("Group 3: inline citations remain out of scope", () => {
  assert(
    detectNircSectionHeading("The taxpayer is liable under Sec. 105 of the Code and related regulations.") === null,
    "inline Sec. 105 without trailing section-number period is not a heading"
  );
  assert(
    detectNircSectionHeading("This rule applies pursuant to Section 23 of the NIRC.") === null,
    "inline Section 23 without trailing section-number period is not a heading"
  );
});

group("Group 4: compact headings reset carry-forward scope", () => {
  const results = simulateNircScope([
    "SEC. 21. Sources of Revenue.",
    "Continuation under Section 21.",
    "TITLE II TAX ON INCOME CHAPTER I DEFINITIONS SEC. 22. Definitions. - When used in this Title:",
    "(E) The term 'nonresident citizen' means a citizen abroad.",
    "CHAPTER II GENERAL PRINCIPLES SEC. 23. General Principles of Income Taxation in the Philippines.",
    "(A) A citizen residing therein is taxable on all income.",
    "TITLE IV VALUE ADDED TAX CHAPTER I IMPOSITION OF TAX SEC. 105. Persons Liable.",
    "The value-added tax is an indirect tax.",
    "SEC. 106. Value-Added Tax on Sale of Goods or Properties."
  ]);

  assert(results[0].normalizedReference === "NIRC Sec. 21", "chunk 0 starts as NIRC Sec. 21");
  assert(results[1].normalizedReference === "NIRC Sec. 21", "chunk 1 inherits NIRC Sec. 21");
  assert(results[2].normalizedReference === "NIRC Sec. 22", "chunk 2 resets to NIRC Sec. 22");
  assert(results[3].normalizedReference === "NIRC Sec. 22", "chunk 3 inherits NIRC Sec. 22");
  assert(results[4].normalizedReference === "NIRC Sec. 23", "chunk 4 resets to NIRC Sec. 23");
  assert(results[5].normalizedReference === "NIRC Sec. 23", "chunk 5 inherits NIRC Sec. 23");
  assert(results[6].normalizedReference === "NIRC Sec. 105", "chunk 6 resets to NIRC Sec. 105");
  assert(results[7].normalizedReference === "NIRC Sec. 105", "chunk 7 inherits NIRC Sec. 105");
  assert(results[8].normalizedReference === "NIRC Sec. 106", "chunk 8 resets to NIRC Sec. 106");
});

console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-033B-R1  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const f of failures) console.log(`  - ${f}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
