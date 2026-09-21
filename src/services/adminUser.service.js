// Admin: manage users, their subscriptions and their golf scores.
const User = require("../models/User");
const Charity = require("../models/Charity");
const Payment = require("../models/Payment");
const Winner = require("../models/Winner");
const AppError = require("../utils/AppError");
const scoreService = require("./score.service");
const subscriptionService = require("./subscription.service");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listItem = (u) => ({
  ...u.toPublic(),
  createdAt: u.createdAt,
});

async function listUsers({ search, role, status, page, limit }) {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter["subscription.status"] = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  return { users: users.map(listItem), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

async function getUser(id) {
  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404);
  return user;
}

async function userDetail(id) {
  const user = await getUser(id);
  const [scores, payments, winnings, charity] = await Promise.all([
    scoreService.listScores(user._id),
    Payment.find({ user: user._id }).sort({ paidAt: -1 }).limit(10),
    Winner.find({ user: user._id }),
    user.charityId ? Charity.findById(user.charityId).select("name slug") : null,
  ]);
  const won = winnings.reduce((t, w) => t + w.prizeAmount, 0);
  const paid = winnings.filter((w) => w.paymentStatus === "paid").reduce((t, w) => t + w.prizeAmount, 0);
  return {
    user: listItem(user),
    charity: charity ? { id: charity._id, name: charity.name, slug: charity.slug } : null,
    scores: scores.map((s) => s.toPublic()),
    payments: payments.map((p) => p.toPublic()),
    winnings: { count: winnings.length, totalWon: won, totalPaid: paid },
  };
}

async function updateUser(actor, id, changes) {
  const user = await getUser(id);
  // An admin cannot change their own role: that guarantees there is always at least one admin.
  if (changes.role && String(user._id) === String(actor._id) && changes.role !== user.role) {
    throw new AppError("You cannot change your own role", 409);
  }
  if (changes.charityId) {
    if (!(await Charity.exists({ _id: changes.charityId, active: true }))) throw new AppError("Charity not found or no longer available", 404);
  }
  // Friendly, backend-independent check. The unique index still guards against a race,
  // and a violation there becomes a 409 through the central error handler.
  if (changes.email && changes.email !== user.email && (await User.exists({ email: changes.email, _id: { $ne: user._id } }))) {
    throw new AppError("That email is already in use", 409);
  }
  Object.assign(user, changes);
  await user.save();
  return user;
}

// Manual override. Clearing the period end / plan for non-active states keeps the record tidy.
async function overrideSubscription(id, { status, plan, currentPeriodEnd }) {
  const user = await getUser(id);
  const s = user.subscription;
  s.status = status;
  if (plan !== undefined) s.plan = plan;
  if (currentPeriodEnd !== undefined) s.currentPeriodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  if (status !== "active") s.cancelAtPeriodEnd = false;
  await user.save();
  return user;
}

const cancelSubscription = async (id) => subscriptionService.cancelAtPeriodEnd(await getUser(id));
const syncSubscription = async (id) => subscriptionService.syncSubscription(await getUser(id));

// Score editing reuses the exact same rules as the player-facing endpoints (one per date, rolling 5).
async function addScore(id, data) {
  return scoreService.addScore((await getUser(id))._id, data);
}
async function updateScore(id, scoreId, changes) {
  return scoreService.updateScore((await getUser(id))._id, scoreId, changes);
}
async function deleteScore(id, scoreId) {
  return scoreService.deleteScore((await getUser(id))._id, scoreId);
}

module.exports = { listUsers, userDetail, updateUser, overrideSubscription, cancelSubscription, syncSubscription, addScore, updateScore, deleteScore };
