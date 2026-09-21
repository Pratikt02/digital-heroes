// Database side of the draw system. All the maths lives in drawEngine.js (pure and tested).
const crypto = require("crypto");
const User = require("../models/User");
const Score = require("../models/Score");
const Payment = require("../models/Payment");
const Draw = require("../models/Draw");
const DrawEntry = require("../models/DrawEntry");
const Winner = require("../models/Winner");
const AppError = require("../utils/AppError");
const { MAX_SCORES } = require("./scoreRules");
const { buildSimulation, computeMonthlyPool, computePrizeTiers, MIN_SCORES_TO_ENTER } = require("./drawEngine");
const { monthKeyOf, addMonths, monthRange, previousMonthKey } = require("../utils/month");

const BATCH = 500;

// "Active subscriber right now", the same rule as User.isSubscribed, written as a query.
const activeFilter = (now) => ({
  role: "subscriber",
  "subscription.status": "active",
  $or: [{ "subscription.currentPeriodEnd": null }, { "subscription.currentPeriodEnd": { $gt: now } }],
});

// Every active subscriber with their latest scores (newest first), read in batches.
async function loadParticipants(now) {
  const participants = [];
  let batch = [];
  const flush = async () => {
    if (!batch.length) return;
    const scores = await Score.find({ user: { $in: batch } }).select("user value date").sort({ date: -1 }).lean();
    const byUser = new Map(batch.map((id) => [String(id), []]));
    for (const s of scores) {
      const list = byUser.get(String(s.user));
      if (list && list.length < MAX_SCORES) list.push(s.value);
    }
    for (const id of batch) participants.push({ userId: id, scores: byUser.get(String(id)) });
    batch = [];
  };
  for await (const u of User.find(activeFilter(now)).select("_id").lean().cursor()) {
    batch.push(u._id);
    if (batch.length >= BATCH) await flush();
  }
  await flush();
  return participants;
}

// Ledger rows that can fund `monthKey`: a yearly payment can cover a month up to 11 months later.
function loadPaymentsFor(monthKey) {
  const { start } = monthRange(addMonths(monthKey, -11));
  const { end } = monthRange(monthKey);
  return Payment.find({ paidAt: { $gte: start, $lt: end } }).select("prizePoolAmount coversMonths paidAt").lean();
}

// The jackpot carried in from the most recent PUBLISHED draw before this month.
async function rolloverInFor(monthKey) {
  const prev = await Draw.findOne({ status: "published", month: { $lt: monthKey } }).sort({ month: -1 });
  return prev?.result?.rolloverOut || 0;
}

async function getDraw(id) {
  const draw = await Draw.findById(id);
  if (!draw) throw new AppError("Draw not found", 404);
  return draw;
}

async function createDraw({ month, mode, algorithmBias }, adminId) {
  const draw = await Draw.create({
    month: month || monthKeyOf(new Date()),
    ...(mode && { mode }),
    ...(algorithmBias && { algorithmBias }),
    createdBy: adminId || null,
  });
  return draw;
}

async function clearSimulation(draw) {
  await Promise.all([DrawEntry.deleteMany({ draw: draw._id }), Winner.deleteMany({ draw: draw._id })]);
}

async function updateDraw(id, changes) {
  const draw = await getDraw(id);
  if (draw.status === "published") throw new AppError("A published draw cannot be changed", 409);
  const changed = (changes.mode && changes.mode !== draw.mode) || (changes.algorithmBias && changes.algorithmBias !== draw.algorithmBias);
  Object.assign(draw, changes);
  if (changed && draw.status === "simulated") {
    // The old preview no longer matches the configuration, so throw it away.
    draw.status = "draft";
    draw.result = undefined;
    await clearSimulation(draw);
  }
  await draw.save();
  return draw;
}

async function deleteDraw(id) {
  const draw = await getDraw(id);
  if (draw.status === "published") throw new AppError("A published draw cannot be deleted", 409);
  await clearSimulation(draw);
  await draw.deleteOne();
}

// Run (or re-run) a simulation. Nothing becomes visible to players until publish.
async function simulateDraw(id, now = new Date()) {
  const draw = await getDraw(id);
  if (draw.status === "published") throw new AppError("This draw is already published", 409);

  const [participants, payments, rolloverIn] = await Promise.all([loadParticipants(now), loadPaymentsFor(draw.month), rolloverInFor(draw.month)]);
  const seed = crypto.randomBytes(16).toString("hex");
  const { result, entries } = buildSimulation({
    monthKey: draw.month,
    mode: draw.mode,
    bias: draw.algorithmBias,
    seed,
    participants,
    payments,
    rolloverIn,
    now,
  });

  await clearSimulation(draw); // a re-run replaces the previous preview completely
  for (let i = 0; i < entries.length; i += 1000) {
    const rows = entries.slice(i, i + 1000).map((e) => ({ draw: draw._id, user: e.userId, scores: e.scores, matchCount: e.matchCount, tier: e.tier }));
    await DrawEntry.insertMany(rows, { ordered: false });
  }

  draw.result = result;
  draw.status = "simulated";
  draw.simulationCount += 1;
  await draw.save();
  return draw;
}

const isDuplicateBulkError = (err) =>
  err?.code === 11000 || (Array.isArray(err?.writeErrors) && err.writeErrors.length > 0 && err.writeErrors.every((w) => (w.code ?? w.err?.code) === 11000));

// Make the previewed result official. Safe to retry: winners are created first (duplicates are
// ignored thanks to the unique index) and the status flips last, atomically.
async function publishDraw(id, adminId) {
  const draw = await getDraw(id);
  if (draw.status === "published") throw new AppError("This draw is already published", 409);
  if (draw.status !== "simulated" || !draw.result) throw new AppError("Run a simulation before publishing", 409);

  // Draws must be published in order, or the jackpot rollover chain would be wrong.
  const earlier = await Draw.findOne({ month: { $lt: draw.month }, status: { $ne: "published" } }).sort({ month: 1 });
  if (earlier) throw new AppError(`Publish the ${earlier.month} draw first`, 409);
  // ...and never backwards: a later month already used the rollover this one would change.
  const later = await Draw.findOne({ month: { $gt: draw.month }, status: "published" });
  if (later) throw new AppError(`The ${later.month} draw is already published, so ${draw.month} can no longer be published`, 409);

  // The rollover this simulation used must still be the current one.
  if ((await rolloverInFor(draw.month)) !== draw.result.rolloverIn) {
    throw new AppError("The carried-over jackpot changed since this simulation. Run it again.", 409);
  }
  // The stored player rows must be complete (a simulation could have failed halfway).
  if ((await DrawEntry.countDocuments({ draw: draw._id })) !== draw.result.eligibleCount) {
    throw new AppError("The simulation data is incomplete. Run it again.", 409);
  }

  const winning = await DrawEntry.find({ draw: draw._id, matchCount: { $gte: 3 } }).lean();
  const winners = winning.map((e) => ({
    draw: draw._id,
    user: e.user,
    tier: e.tier,
    matchCount: e.matchCount,
    scores: e.scores,
    prizeAmount: draw.result.tiers[e.tier].prizeEach,
  }));
  if (winners.length) {
    try {
      await Winner.insertMany(winners, { ordered: false });
    } catch (err) {
      if (!isDuplicateBulkError(err)) throw err;
    }
  }

  const published = await Draw.findOneAndUpdate(
    { _id: draw._id, status: "simulated" },
    { status: "published", publishedAt: new Date(), publishedBy: adminId },
    { returnDocument: "after" }
  );
  if (!published) throw new AppError("This draw changed while publishing. Please check its status.", 409);
  return published;
}

// ---------- reads ----------

const listAllDraws = () => Draw.find().sort({ month: -1 }).limit(60);

async function drawWithWinners(id) {
  const draw = await getDraw(id);
  const rows = await DrawEntry.find({ draw: draw._id, matchCount: { $gte: 3 } }).populate("user", "name email").sort({ matchCount: -1 }).lean();
  const winners = rows.map((e) => ({
    userId: e.user?._id,
    name: e.user?.name,
    email: e.user?.email,
    matchCount: e.matchCount,
    tier: e.tier,
    prizeEach: draw.result?.tiers?.[e.tier]?.prizeEach ?? 0,
    scores: e.scores,
  }));
  return { draw, winners };
}

const listPublished = () => Draw.find({ status: "published" }).sort({ month: -1 }).limit(24);

async function getPublishedByMonth(month) {
  const draw = await Draw.findOne({ month, status: "published" });
  if (!draw) throw new AppError("No published draw for that month", 404);
  return draw;
}

// The next draw the public can look forward to, with a live estimate of the jackpot.
async function nextDrawInfo(now = new Date()) {
  let month = monthKeyOf(now);
  if (await Draw.exists({ month, status: "published" })) month = addMonths(month, 1);

  const [payments, rolloverIn, activeSubscribers] = await Promise.all([loadPaymentsFor(month), rolloverInFor(month), User.countDocuments(activeFilter(now))]);
  const poolSoFar = computeMonthlyPool(payments, month);
  const { tiers } = computePrizeTiers({ poolTotal: poolSoFar, rolloverIn, winnerCounts: {} });
  return {
    month,
    drawnAfter: monthRange(month).end, // the draw for a month runs once that month has ended
    activeSubscribers,
    poolSoFar,
    rolloverIn,
    jackpot: tiers.match5.pool,
    tierPools: { match4: tiers.match4.pool, match3: tiers.match3.pool },
  };
}

// Dashboard: the signed-in player's own draw history and what they need to do to enter next.
async function myParticipation(user) {
  const draws = await listPublished();
  const byId = new Map(draws.map((d) => [String(d._id), d]));
  const entries = await DrawEntry.find({ user: user._id, draw: { $in: draws.map((d) => d._id) } }).lean();

  const history = entries
    .map((e) => {
      const d = byId.get(String(e.draw));
      return {
        month: d.month,
        drawNumbers: d.result.numbers,
        yourScores: e.scores,
        matchCount: e.matchCount,
        tier: e.tier,
        prize: e.tier ? d.result.tiers[e.tier].prizeEach : 0,
      };
    })
    .sort((a, b) => (a.month < b.month ? 1 : -1));

  const scoreCount = await Score.countDocuments({ user: user._id });
  return {
    drawsEntered: history.length,
    history,
    upcoming: await nextDrawInfo(),
    eligibleForNext: user.isSubscribed && scoreCount >= MIN_SCORES_TO_ENTER,
    scoresStored: scoreCount,
    scoresNeeded: MIN_SCORES_TO_ENTER,
  };
}

// Used by the monthly cron job. Only ever creates + simulates. A human always publishes.
async function ensureMonthlyDraw(now = new Date()) {
  const month = previousMonthKey(now);
  const existing = await Draw.findOne({ month });
  if (existing) return { month, action: "exists", status: existing.status };
  const mode = process.env.DRAW_DEFAULT_MODE === "algorithmic" ? "algorithmic" : "random";
  const draw = await createDraw({ month, mode }, null);
  await simulateDraw(draw._id, now);
  return { month, action: "created_and_simulated", status: "simulated" };
}

module.exports = {
  createDraw,
  updateDraw,
  deleteDraw,
  simulateDraw,
  publishDraw,
  listAllDraws,
  drawWithWinners,
  listPublished,
  getPublishedByMonth,
  nextDrawInfo,
  myParticipation,
  ensureMonthlyDraw,
};
