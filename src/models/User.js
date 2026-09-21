const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MIN_CHARITY_PERCENT, MAX_CHARITY_PERCENT } = require("../services/charityRules");

const SUBSCRIPTION_STATUSES = ["inactive", "active", "past_due", "canceled", "lapsed"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["subscriber", "admin"], default: "subscriber" },

    // Charity preference. The minimum is enforced here AND in request validation.
    charityId: { type: mongoose.Schema.Types.ObjectId, ref: "Charity", default: null },
    charityPercentage: { type: Number, default: MIN_CHARITY_PERCENT, min: MIN_CHARITY_PERCENT, max: MAX_CHARITY_PERCENT },

    // Cached subscription state, kept fresh by payment webhooks + the verify/sync endpoints,
    // so we never call the payment provider on every request.
    subscription: {
      status: { type: String, enum: SUBSCRIPTION_STATUSES, default: "inactive" },
      plan: { type: String, enum: ["monthly", "yearly", null], default: null },
      providerSubscriptionId: { type: String, default: null }, // Razorpay sub_xxx
      currentPeriodEnd: { type: Date, default: null },
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

userSchema.index({ "subscription.providerSubscriptionId": 1 }, { sparse: true });

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 12);
};

// Entered into draws / allowed to use member features only while active and within the paid period.
userSchema.virtual("isSubscribed").get(function () {
  const s = this.subscription;
  return s.status === "active" && (!s.currentPeriodEnd || s.currentPeriodEnd > new Date());
});

// Public shape sent to the client. Never expose the hash or provider IDs.
userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    charityId: this.charityId,
    charityPercentage: this.charityPercentage,
    subscription: {
      status: this.subscription.status,
      plan: this.subscription.plan,
      currentPeriodEnd: this.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: this.subscription.cancelAtPeriodEnd,
    },
    isSubscribed: this.isSubscribed,
  };
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
