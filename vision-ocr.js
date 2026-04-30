import vision from "@google-cloud/vision";

let visionClient = null;

function getVisionClient() {
  if (visionClient) {
    return visionClient;
  }

  const rawServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!rawServiceAccount) {
    console.warn(
      "GOOGLE_SERVICE_ACCOUNT_JSON is missing. Google Vision OCR is disabled."
    );
    return null;
  }

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch (error) {
    console.error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Google Vision OCR is disabled."
    );
    return null;
  }

  visionClient = new vision.ImageAnnotatorClient({
    credentials: serviceAccount,
  });

  return visionClient;
}

export async function ocrImageWithVision(filePath) {
  if (!filePath) {
    throw new Error("filePath is required for OCR.");
  }

  const client = getVisionClient();

  if (!client) {
    return "";
  }

  try {
    const [result] = await client.documentTextDetection(filePath);
    return result.fullTextAnnotation?.text || "";
  } catch (error) {
    console.error("Google Vision OCR failed:", error.message);
    return "";
  }
}

export function isVisionOcrEnabled() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}