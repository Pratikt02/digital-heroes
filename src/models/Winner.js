const mongoose = require("mongoose");

// Created when a draw is published, one per winning player. Phase 7 builds the workflow on top:
// proof upload -> admin review -> payout. The fields for it are declared now.
const winnerSchema = new mongoose.Schema(
  {
    draw: { type: mongoose.Schema.Types.ObjectId, ref: "Draw", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tier: { type: String, enum: ["match5", "match4", "match3"], required: true },
    matchCount: { type: Number, required: true },
    scores: { type: [Number], default: [] },
    prizeAmount: { type: Number, required: true, min: 0 }, // integer paise

    verificationStatus: { type: String, enum: ["awaiting_proof", "pending_review", "approved", "rejected"], default: "awaiting_proof" },
    proofUrl: { type: String, default: null },
    proofPublicId: { type: String, default: null },
    rejectionReason: { type: String, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },

    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

winnerSchema.index({ draw: 1, user: 1 }, { unique: true }); // a player wins at most once per draw
winnerSchema.index({ user: 1 });

module.exports = mongoose.models.Winner || mongoose.model("Winner", winnerSchema);
