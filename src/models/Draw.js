const mongoose = require("mongoose");
const { MONTH_RE } = require("../utils/month");

const tierSchema = new mongoose.Schema(
  { pool: Number, winners: Number, prizeEach: Number, distributed: Number, unclaimed: Number },
  { _id: false }
);

// Everything a simulation produces. Stored on the draw, and FROZEN: publishing copies this
// exactly as the admin previewed it. Per-player rows live in DrawEntry.
const resultSchema = new mongoose.Schema(
  {
    seed: String,
    mode: String,
    algorithmBias: String,
    numbers: [Number],
    ranAt: Date,
    activeSubscribers: Number,
    eligibleCount: Number,
    distribution: mongoose.Schema.Types.Mixed, // { "0": n, ..., "5": n }
    poolTotal: Number,
    rolloverIn: Number,
    rolloverOut: Number,
    retained: Number,
    tiers: { match5: tierSchema, match4: tierSchema, match3: tierSchema },
    frequency: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const drawSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true, match: MONTH_RE }, // one draw per month
    mode: { type: String, enum: ["random", "algorithmic"], default: "random" },
    algorithmBias: { type: String, enum: ["frequent", "rare"], default: "frequent" },
    status: { type: String, enum: ["draft", "simulated", "published"], default: "draft" },
    simulationCount: { type: Number, default: 0 },
    result: { type: resultSchema, default: undefined },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null = created by the cron job
  },
  { timestamps: true }
);

const plain = (r) => (r ? (typeof r.toObject === "function" ? r.toObject() : r) : null);
const tierPublic = (t) => ({ pool: t.pool, winners: t.winners, prizeEach: t.prizeEach });

// What visitors and subscribers may see: published draws only, no player data.
drawSchema.methods.toPublic = function () {
  const r = plain(this.result);
  return {
    id: this._id,
    month: this.month,
    mode: r.mode,
    numbers: r.numbers,
    publishedAt: this.publishedAt,
    seed: r.seed, // revealed only after publishing, so random draws can be re-checked
    participants: r.eligibleCount,
    pool: { total: r.poolTotal, rolloverIn: r.rolloverIn, rolloverOut: r.rolloverOut },
    tiers: { match5: tierPublic(r.tiers.match5), match4: tierPublic(r.tiers.match4), match3: tierPublic(r.tiers.match3) },
  };
};

drawSchema.methods.toAdmin = function () {
  return {
    id: this._id,
    month: this.month,
    mode: this.mode,
    algorithmBias: this.algorithmBias,
    status: this.status,
    simulationCount: this.simulationCount,
    publishedAt: this.publishedAt,
    createdAt: this.createdAt,
    result: plain(this.result),
  };
};

module.exports = mongoose.models.Draw || mongoose.model("Draw", drawSchema);
