const mongoose = require("mongoose");
const { formatDateOnly } = require("../utils/date");

// Created when a draw is published, one per winning player, then moved through the
// verification and payout workflow (see services/winnerRules.js for the allowed transitions).
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
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

winnerSchema.index({ draw: 1, user: 1 }, { unique: true }); // a player wins at most once per draw
winnerSchema.index({ user: 1 });
winnerSchema.index({ verificationStatus: 1, paymentStatus: 1 });

// What the winning player sees about their own prize.
winnerSchema.methods.toOwner = function (month) {
  return {
    id: this._id,
    month: month || null,
    tier: this.tier,
    matchCount: this.matchCount,
    scores: this.scores,
    prizeAmount: this.prizeAmount,
    verificationStatus: this.verificationStatus,
    proofUrl: this.proofUrl,
    rejectionReason: this.verificationStatus === "rejected" ? this.rejectionReason : null,
    paymentStatus: this.paymentStatus,
    paidAt: this.paidAt,
  };
};

// Admin view; `user` and `draw` are populated by the service.
winnerSchema.methods.toAdmin = function () {
  const u = this.user && this.user._id ? this.user : null;
  const d = this.draw && this.draw._id ? this.draw : null;
  return {
    id: this._id,
    user: u ? { id: u._id, name: u.name, email: u.email } : { id: this.user },
    draw: d ? { id: d._id, month: d.month } : { id: this.draw },
    tier: this.tier,
    matchCount: this.matchCount,
    scores: this.scores,
    prizeAmount: this.prizeAmount,
    verificationStatus: this.verificationStatus,
    proofUrl: this.proofUrl,
    rejectionReason: this.rejectionReason,
    reviewedAt: this.reviewedAt,
    paymentStatus: this.paymentStatus,
    paidAt: this.paidAt,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.models.Winner || mongoose.model("Winner", winnerSchema);
