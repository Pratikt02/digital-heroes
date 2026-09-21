const mongoose = require("mongoose");

// One row per successful charge. This ledger feeds the prize pool (Phase 6) and the
// admin reports. The charity/pool split is SNAPSHOTTED at payment time, so later changes
// to a user's charity or percentage never rewrite history.
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, default: "razorpay" },
    providerPaymentId: { type: String, required: true, unique: true }, // unique => webhook retries can't double count
    providerSubscriptionId: { type: String, default: null },
    plan: { type: String, enum: ["monthly", "yearly", null], default: null },

    amount: { type: Number, required: true, min: 0 }, // integer paise
    currency: { type: String, default: "INR" },
    coversMonths: { type: Number, default: 1 }, // 12 for yearly: its pool share is spread over 12 draws

    charityId: { type: mongoose.Schema.Types.ObjectId, ref: "Charity", default: null },
    charityPercentage: { type: Number, required: true },
    charityAmount: { type: Number, required: true },
    prizePoolAmount: { type: Number, required: true },
    platformAmount: { type: Number, required: true },

    paidAt: { type: Date, required: true },
  },
  { timestamps: true }
);

paymentSchema.index({ paidAt: -1 });

paymentSchema.methods.toPublic = function () {
  return { id: this._id, amount: this.amount, currency: this.currency, plan: this.plan, paidAt: this.paidAt, charityAmount: this.charityAmount };
};

module.exports = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
