// Winner verification and payout. State rules live in winnerRules.js (pure, tested).
const Winner = require("../models/Winner");
const Draw = require("../models/Draw");
const AppError = require("../utils/AppError");
const cloudinary = require("./cloudinary");
const { checkUploadProof, checkApprove, checkReject, checkMarkPaid, sniffImageType } = require("./winnerRules");

// Winner rows can briefly exist for a draw whose publish did not finish, so they only count
// once their draw is actually published.
async function publishedDraws() {
  const draws = await Draw.find({ status: "published" }).select("month").lean();
  return new Map(draws.map((d) => [String(d._id), d.month]));
}

// ---------- the winning player ----------

async function listMine(userId) {
  const months = await publishedDraws();
  const winners = await Winner.find({ user: userId, draw: { $in: [...months.keys()] } }).sort({ createdAt: -1 });

  const sum = (rows) => rows.reduce((t, w) => t + w.prizeAmount, 0);
  const paid = winners.filter((w) => w.paymentStatus === "paid");
  return {
    winnings: winners.map((w) => w.toOwner(months.get(String(w.draw)))),
    totals: {
      totalWon: sum(winners),
      totalPaid: sum(paid),
      totalOutstanding: sum(winners) - sum(paid),
      count: winners.length,
    },
  };
}

async function submitProof(user, winnerId, file) {
  const winner = await Winner.findOne({ _id: winnerId, user: user._id });
  if (!winner || !(await Draw.exists({ _id: winner.draw, status: "published" }))) throw new AppError("Winning not found", 404);

  const blocked = checkUploadProof(winner);
  if (blocked) throw new AppError(blocked, 409);

  if (!file) throw new AppError('Attach your screenshot in the "proof" field', 400);
  const type = sniffImageType(file.buffer);
  if (!type) throw new AppError("That file is not a valid JPG, PNG or WebP image", 400);

  const uploaded = await cloudinary.uploadImage(file.buffer, type);
  const previous = winner.proofPublicId;

  // Conditional update: if an admin approved (or it was paid) while we were uploading, we lose the race cleanly.
  const updated = await Winner.findOneAndUpdate(
    { _id: winner._id, user: user._id, verificationStatus: { $in: ["awaiting_proof", "pending_review", "rejected"] }, paymentStatus: "pending" },
    { $set: { proofUrl: uploaded.url, proofPublicId: uploaded.publicId, verificationStatus: "pending_review", rejectionReason: null } },
    { returnDocument: "after" }
  );
  if (!updated) {
    await cloudinary.destroyImage(uploaded.publicId);
    throw new AppError("This winning was just reviewed, so the proof could not be replaced", 409);
  }
  await cloudinary.destroyImage(previous); // remove the image we replaced
  return updated;
}

// ---------- admin ----------

async function listWinners({ verification, payment, month, page, limit }) {
  const months = await publishedDraws();
  let drawIds = [...months.keys()];
  if (month) drawIds = [...months.entries()].filter(([, m]) => m === month).map(([id]) => id);

  const filter = { draw: { $in: drawIds } };
  if (verification) filter.verificationStatus = verification;
  if (payment) filter.paymentStatus = payment;

  const [rows, total] = await Promise.all([
    Winner.find(filter)
      .sort({ createdAt: -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name email")
      .populate("draw", "month"),
    Winner.countDocuments(filter),
  ]);
  return { winners: rows.map((w) => w.toAdmin()), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

async function getWinner(id) {
  const winner = await Winner.findById(id).populate("user", "name email").populate("draw", "month");
  if (!winner) throw new AppError("Winner not found", 404);
  return winner;
}

// Runs an atomic, state-guarded update. If nothing matched, explain why using the pure rules.
async function transition(id, guard, update, check) {
  const updated = await Winner.findOneAndUpdate({ _id: id, ...guard }, { $set: update }, { returnDocument: "after" });
  if (updated) return getWinner(id);
  const current = await Winner.findById(id);
  if (!current) throw new AppError("Winner not found", 404);
  throw new AppError(check(current) || "This winner changed, please refresh", 409);
}

const approve = (id, adminId) =>
  transition(id, { verificationStatus: "pending_review" }, { verificationStatus: "approved", reviewedBy: adminId, reviewedAt: new Date(), rejectionReason: null }, checkApprove);

const reject = (id, adminId, reason) =>
  transition(id, { verificationStatus: "pending_review" }, { verificationStatus: "rejected", reviewedBy: adminId, reviewedAt: new Date(), rejectionReason: reason }, checkReject);

const markPaid = (id, adminId) =>
  transition(id, { verificationStatus: "approved", paymentStatus: "pending" }, { paymentStatus: "paid", paidAt: new Date(), paidBy: adminId }, checkMarkPaid);

module.exports = { listMine, submitProof, listWinners, getWinner, approve, reject, markPaid };
