const mongoose = require("mongoose");
const { formatDateOnly } = require("../utils/date");

const scoreSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    value: {
      type: Number,
      required: true,
      min: [1, "Score must be at least 1"],
      max: [45, "Score cannot exceed 45"],
      validate: { validator: Number.isInteger, message: "Score must be a whole number" },
    },
    date: { type: Date, required: true }, // stored at UTC midnight
  },
  { timestamps: true }
);

// Database-level guarantee: one score per user per date, even under concurrent requests.
// It also serves the "latest 5 for this user" query.
scoreSchema.index({ user: 1, date: -1 }, { unique: true });

scoreSchema.methods.toPublic = function () {
  return { id: this._id, value: this.value, date: formatDateOnly(this.date), createdAt: this.createdAt };
};

module.exports = mongoose.models.Score || mongoose.model("Score", scoreSchema);
