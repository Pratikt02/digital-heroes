// PURE winner-workflow rules: which actions are allowed in which state, and image validation.
//
//   verification:  awaiting_proof -> pending_review -> approved
//                                         \-> rejected -> (user re-uploads) -> pending_review
//   payment:       pending -> paid            (only after the proof is approved)
//
// Every check returns null when the action is allowed, or a human-readable reason when it is not.

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"];

// The player may (re)upload until the proof is approved. Replacing while "pending_review" is
// allowed so a wrong screenshot can be fixed before an admin looks at it.
function checkUploadProof(w) {
  if (w.paymentStatus === "paid") return "This prize has already been paid";
  if (w.verificationStatus === "approved") return "Your proof has already been approved";
  return null;
}

const checkApprove = (w) => (w.verificationStatus === "pending_review" ? null : w.verificationStatus === "approved" ? "Already approved" : "There is no proof waiting for review");
const checkReject = (w) => (w.verificationStatus === "pending_review" ? null : w.verificationStatus === "rejected" ? "Already rejected" : "There is no proof waiting for review");

function checkMarkPaid(w) {
  if (w.paymentStatus === "paid") return "Already marked as paid";
  if (w.verificationStatus !== "approved") return "Approve the winner's proof before paying";
  return null;
}

// Trust the file's bytes, not the browser-supplied Content-Type or filename. Returns the real
// MIME type of a JPEG / PNG / WebP image, or null for anything else.
function sniffImageType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

module.exports = { MAX_PROOF_BYTES, ALLOWED_PROOF_TYPES, checkUploadProof, checkApprove, checkReject, checkMarkPaid, sniffImageType };
