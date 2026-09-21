// Signature checks. Both use HMAC-SHA256 hex and a constant-time comparison.
const crypto = require("crypto");

const hmacHex = (secret, data) => crypto.createHmac("sha256", secret).update(data).digest("hex");

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B); // timingSafeEqual throws on length mismatch, hence the check
}

// After the Checkout popup succeeds. IMPORTANT: subscriptionId must come from OUR database,
// never from the browser, otherwise a customer could swap in someone else's subscription.
function verifyCheckoutSignature({ paymentId, subscriptionId, signature, secret }) {
  return safeEqual(hmacHex(secret, `${paymentId}|${subscriptionId}`), signature);
}

// For webhooks: HMAC of the RAW request body (bytes exactly as received).
function verifyWebhookSignature(rawBody, signature, secret) {
  return safeEqual(hmacHex(secret, rawBody), signature);
}

module.exports = { hmacHex, safeEqual, verifyCheckoutSignature, verifyWebhookSignature };
