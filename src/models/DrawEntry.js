const mongoose = require("mongoose");

// One row per eligible player per draw: the 5 scores they entered with and how many matched.
// Written by the simulation (so what the admin previews is what gets published) and hidden
// from players until the draw is published. Also powers "draws entered" on the dashboard.
const drawEntrySchema = new mongoose.Schema(
  {
    draw: { type: mongoose.Schema.Types.ObjectId, ref: "Draw", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scores: { type: [Number], required: true },
    matchCount: { type: Number, required: true, min: 0, max: 5 },
    tier: { type: String, enum: ["match5", "match4", "match3", null], default: null },
  },
  { timestamps: true }
);

drawEntrySchema.index({ draw: 1, user: 1 }, { unique: true });
drawEntrySchema.index({ draw: 1, matchCount: -1 });
drawEntrySchema.index({ user: 1 });

module.exports = mongoose.models.DrawEntry || mongoose.model("DrawEntry", drawEntrySchema);
