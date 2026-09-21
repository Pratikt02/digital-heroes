// Admin reports and analytics. All money is integer paise (INR).
const User = require("../models/User");
const Payment = require("../models/Payment");
const Charity = require("../models/Charity");
const Winner = require("../models/Winner");
const Draw = require("../models/Draw");
const { activeFilter } = require("./draw.service");
const { addMonths, monthKeyOf, monthRange } = require("../utils/month");

const toMap = (rows, key = "_id") => new Map(rows.map((r) => [String(r[key]), r]));

async function overview(now = new Date()) {
  const publishedDraws = await Draw.find({ status: "published" }).sort({ month: 1 }).select("month result.poolTotal result.eligibleCount result.rolloverOut result.tiers").lean();
  const publishedIds = publishedDraws.map((d) => d._id);

  const [subscriberTotal, adminTotal, activeCount, byStatus, activeByPlan, pay, winnerRows] = await Promise.all([
    User.countDocuments({ role: "subscriber" }),
    User.countDocuments({ role: "admin" }),
    User.countDocuments(activeFilter(now)), // active right now: status active AND inside the paid period
    User.aggregate([{ $match: { role: "subscriber" } }, { $group: { _id: "$subscription.status", n: { $sum: 1 } } }]),
    User.aggregate([{ $match: activeFilter(now) }, { $group: { _id: "$subscription.plan", n: { $sum: 1 } } }]),
    Payment.aggregate([
      { $group: { _id: null, revenue: { $sum: "$amount" }, prizePool: { $sum: "$prizePoolAmount" }, charity: { $sum: "$charityAmount" }, platform: { $sum: "$platformAmount" }, payments: { $sum: 1 } } },
    ]),
    Winner.aggregate([
      { $match: { draw: { $in: publishedIds } } },
      { $group: { _id: { v: "$verificationStatus", p: "$paymentStatus" }, amount: { $sum: "$prizeAmount" }, n: { $sum: 1 } } },
    ]),
  ]);

  const p = pay[0] || { revenue: 0, prizePool: 0, charity: 0, platform: 0, payments: 0 };
  const statusCounts = Object.fromEntries(byStatus.map((r) => [r._id || "unknown", r.n]));
  const planCounts = Object.fromEntries(activeByPlan.map((r) => [r._id || "unknown", r.n]));

  let totalPrizes = 0, paidOut = 0, awaitingPayout = 0, awaitingVerification = 0;
  for (const r of winnerRows) {
    totalPrizes += r.amount;
    if (r._id.p === "paid") paidOut += r.amount;
    else if (r._id.v === "approved") awaitingPayout += r.amount;
    else awaitingVerification += r.amount; // includes rejected proofs the player can still resubmit
  }

  const tierWinners = { match5: 0, match4: 0, match3: 0 };
  let totalPoolDrawn = 0, participantsTotal = 0;
  for (const d of publishedDraws) {
    totalPoolDrawn += d.result.poolTotal;
    participantsTotal += d.result.eligibleCount;
    for (const t of Object.keys(tierWinners)) tierWinners[t] += d.result.tiers[t].winners;
  }
  const latest = publishedDraws[publishedDraws.length - 1];

  return {
    currency: "INR",
    users: {
      subscribers: subscriberTotal,
      admins: adminTotal,
      activeSubscribers: activeCount,
      byStatus: statusCounts,
      activeByPlan: planCounts,
    },
    money: {
      revenue: p.revenue,
      prizePoolContributed: p.prizePool,
      charityContributed: p.charity,
      platformShare: p.platform,
      payments: p.payments,
      totalPrizesAwarded: totalPrizes,
      paidOut,
      awaitingPayout,
      awaitingVerification,
    },
    draws: {
      published: publishedDraws.length,
      totalPoolDrawn,
      averageParticipants: publishedDraws.length ? Math.round(participantsTotal / publishedDraws.length) : 0,
      winnersByTier: tierWinners,
      currentJackpotRollover: latest ? latest.result.rolloverOut : 0,
      recent: publishedDraws.slice(-12).map((d) => ({
        month: d.month,
        poolTotal: d.result.poolTotal,
        participants: d.result.eligibleCount,
        winners: d.result.tiers.match5.winners + d.result.tiers.match4.winners + d.result.tiers.match3.winners,
        rolloverOut: d.result.rolloverOut,
      })),
    },
  };
}

// How much each charity has received, and how many subscribers back it.
async function charities() {
  const [totals, backers, all] = await Promise.all([
    Payment.aggregate([{ $group: { _id: "$charityId", total: { $sum: "$charityAmount" }, payments: { $sum: 1 } } }]),
    User.aggregate([{ $match: { role: "subscriber", charityId: { $ne: null } } }, { $group: { _id: "$charityId", subscribers: { $sum: 1 } } }]),
    Charity.find().select("name slug active").lean(),
  ]);
  const totalMap = toMap(totals), backerMap = toMap(backers);
  const rows = all.map((c) => ({
    charityId: c._id,
    name: c.name,
    slug: c.slug,
    active: c.active,
    totalContributed: totalMap.get(String(c._id))?.total || 0,
    payments: totalMap.get(String(c._id))?.payments || 0,
    subscribers: backerMap.get(String(c._id))?.subscribers || 0,
  }));
  rows.sort((a, b) => b.totalContributed - a.totalContributed || a.name.localeCompare(b.name));
  const unassigned = totalMap.get("null") || totalMap.get("undefined");
  return {
    currency: "INR",
    charities: rows,
    unassignedContributions: unassigned ? unassigned.total : 0, // payments made by users who never chose a charity
    grandTotal: rows.reduce((t, r) => t + r.totalContributed, 0) + (unassigned ? unassigned.total : 0),
  };
}

// Month-by-month payments for the last 12 months (charts). One small indexed query per month, run
// in parallel: each is a date-range $match plus a $group, so no documents are transferred, months
// with no payments naturally come out as zeros, and it needs no date-formatting operators.
async function revenue(now = new Date()) {
  const first = addMonths(monthKeyOf(now), -11);
  const keys = Array.from({ length: 12 }, (_, i) => addMonths(first, i));
  const rows = await Promise.all(
    keys.map((key) => {
      const { start, end } = monthRange(key);
      return Payment.aggregate([
        { $match: { paidAt: { $gte: start, $lt: end } } },
        { $group: { _id: null, revenue: { $sum: "$amount" }, prizePool: { $sum: "$prizePoolAmount" }, charity: { $sum: "$charityAmount" }, payments: { $sum: 1 } } },
      ]);
    })
  );
  return {
    currency: "INR",
    months: keys.map((month, i) => {
      const r = rows[i][0];
      return { month, revenue: r?.revenue || 0, prizePool: r?.prizePool || 0, charity: r?.charity || 0, payments: r?.payments || 0 };
    }),
  };
}

module.exports = { overview, charities, revenue };
