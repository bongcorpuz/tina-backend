import assert from "node:assert/strict";
import { enrichSourceCardsWithVerifiedDocumentIdentity } from "../source-card-engine.js";

const taxCodeId = "1AbCdEfGhIjKlMnOpQrStUvWxYz_12345";
const ewtId = "1BcDeFgHiJkLmNoPqRsTuVwXyZ_12345";
const estateId = "1CdEfGhIjKlMnOpQrStUvWxYzA_12345";
const indexed = {
  "nircsec105": { metadata: { driveViewUrl: `https://drive.google.com/file/d/${taxCodeId}/view` } },
  "nircsec106": { metadata: { driveViewUrl: `https://drive.google.com/file/d/${taxCodeId}/view` } },
  "nircsec108": { metadata: { driveViewUrl: `https://drive.google.com/file/d/${taxCodeId}/view` } },
  "nircsec57": { metadata: { driveViewUrl: `https://drive.google.com/file/d/${ewtId}/view` } },
  "nircsec84": { metadata: { driveViewUrl: `https://drive.google.com/file/d/${estateId}/view` } }
};
const key = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const calls = [];
const cards = [
  "NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 108", "NIRC Sec. 57", "NIRC Sec. 84", "Unindexed Taxation Reference"
].map((citation) => ({ citation, normalizedReference: citation, authorityType: "STATUTE" }));
const enriched = await enrichSourceCardsWithVerifiedDocumentIdentity(cards, {
  exactAuthoritySearch: async ({ targetAuthorities }) => {
    const target = targetAuthorities[0]; calls.push(target);
    const doc = indexed[key(target)];
    return doc ? [doc] : [];
  },
  logger: { warn() {} }
});

assert.equal(enriched[0].documentId, taxCodeId, "VAT NIRC Sec. 105 resolves to the indexed Tax Code");
assert.equal(enriched[1].documentId, taxCodeId, "VAT NIRC Sec. 106 resolves to the indexed Tax Code");
assert.equal(enriched[2].documentId, taxCodeId, "VAT NIRC Sec. 108 resolves to the indexed Tax Code");
assert.equal(enriched[3].documentId, ewtId, "EWT reference resolves only through its indexed source");
assert.equal(enriched[4].documentId, estateId, "estate-tax reference resolves only through its indexed source");
assert.equal("documentId" in enriched[5], false, "unmatched taxation reference remains explicitly without a document identity");
assert.equal(enriched.filter((card) => Object.keys(card).some((field) => /drive|url|path|storage/i.test(field))).length, 0, "enrichment never adds raw source-system fields");
assert.equal(calls.length, 6, "each previously unresolved visible reference is verified through the indexed lookup");
console.log("TINA verified reference document contract checks: 8 assertions passed");
