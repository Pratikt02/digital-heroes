const multer = require("multer");
const AppError = require("../utils/AppError");
const { MAX_PROOF_BYTES, ALLOWED_PROOF_TYPES } = require("../services/winnerRules");

// Files are held in memory (never written to disk) and streamed on to Cloudinary. This is the
// first, cheap filter; the service also checks the file's real bytes (see sniffImageType).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROOF_BYTES, files: 1, fields: 5 },
  fileFilter: (req, file, cb) => (ALLOWED_PROOF_TYPES.includes(file.mimetype) ? cb(null, true) : cb(new AppError("Proof must be a JPG, PNG or WebP image", 400))),
});

module.exports = upload.single("proof");
