// Minimal Cloudinary client over the REST API (no SDK). Only this file knows about Cloudinary.
// Signing follows Cloudinary's docs: sort the parameters alphabetically, join as name=value with
// "&", append the API secret, SHA-1 hex. (file, cloud_name, resource_type and api_key are not signed.)
const crypto = require("crypto");
const AppError = require("../utils/AppError");

const FOLDER = "digital-heroes/winner-proofs";

function signParams(params, secret) {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + secret).digest("hex");
}

function config() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new AppError("File uploads are not configured yet", 503);
  return { cloudName, apiKey, apiSecret };
}

async function uploadImage(buffer, mimeType) {
  const { cloudName, apiKey, apiSecret } = config();
  const timestamp = Math.floor(Date.now() / 1000);

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), "proof");
  form.append("folder", FOLDER);
  form.append("timestamp", String(timestamp));
  form.append("api_key", apiKey);
  form.append("signature", signParams({ folder: FOLDER, timestamp }, apiSecret));

  let res;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form, signal: AbortSignal.timeout(30000) });
  } catch {
    throw new AppError("Could not reach the image service, please try again", 502);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) throw new AppError(`Image upload failed: ${data?.error?.message || res.status}`, 502);
  return { url: data.secure_url, publicId: data.public_id };
}

// Best effort cleanup of a replaced or orphaned image. Never throws: a leftover file is harmless.
async function destroyImage(publicId) {
  if (!publicId) return;
  try {
    const { cloudName, apiKey, apiSecret } = config();
    const timestamp = Math.floor(Date.now() / 1000);
    const form = new FormData();
    form.append("public_id", publicId);
    form.append("timestamp", String(timestamp));
    form.append("api_key", apiKey);
    form.append("signature", signParams({ public_id: publicId, timestamp }, apiSecret));
    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: "POST", body: form, signal: AbortSignal.timeout(15000) });
  } catch {
    /* ignore */
  }
}

module.exports = { FOLDER, signParams, uploadImage, destroyImage };
