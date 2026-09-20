// Database side of the score system. The decision rules live in scoreRules.js.
const Score = require("../models/Score");
const AppError = require("../utils/AppError");
const { MAX_SCORES, checkInsertAllowed, selectToEvict } = require("./scoreRules");

const DUPLICATE_MSG = "You already have a score for this date. Edit or delete it instead.";

const rejectMessages = {
  DUPLICATE_DATE: [DUPLICATE_MSG, 409],
  TOO_OLD: [`This date is older than all ${MAX_SCORES} of your stored scores, so it would not be kept.`, 422],
};

// Newest round first (reverse chronological), as the PRD requires.
function listScores(userId) {
  return Score.find({ user: userId }).sort({ date: -1 });
}

// After any insert, delete everything beyond the latest 5. Running this AFTER the insert
// (rather than trusting a pre-count) keeps the rule correct even if two requests race.
async function trimToLatest(userId) {
  const all = await Score.find({ user: userId }).select("_id date").lean();
  const evict = selectToEvict(all, MAX_SCORES);
  if (evict.length) await Score.deleteMany({ _id: { $in: evict.map((s) => s._id) } });
}

async function addScore(userId, { value, date }) {
  const existing = await Score.find({ user: userId }).select("date").lean();
  const problem = checkInsertAllowed(existing, date, MAX_SCORES);
  if (problem) throw new AppError(...rejectMessages[problem]);

  let created;
  try {
    created = await Score.create({ user: userId, value, date });
  } catch (err) {
    if (err.code === 11000) throw new AppError(DUPLICATE_MSG, 409); // lost a race to the unique index
    throw err;
  }
  await trimToLatest(userId);
  return created;
}

async function updateScore(userId, scoreId, changes) {
  // Filtering by user means people can only ever touch their own scores.
  const score = await Score.findOne({ _id: scoreId, user: userId });
  if (!score) throw new AppError("Score not found", 404);

  if (changes.date !== undefined) {
    const clash = await Score.exists({ user: userId, date: changes.date, _id: { $ne: scoreId } });
    if (clash) throw new AppError(DUPLICATE_MSG, 409);
    score.date = changes.date;
  }
  if (changes.value !== undefined) score.value = changes.value;

  try {
    await score.save();
  } catch (err) {
    if (err.code === 11000) throw new AppError(DUPLICATE_MSG, 409);
    throw err;
  }
  return score; // editing never changes how many scores exist, so no trim is needed
}

async function deleteScore(userId, scoreId) {
  const result = await Score.deleteOne({ _id: scoreId, user: userId });
  if (result.deletedCount === 0) throw new AppError("Score not found", 404);
}

module.exports = { listScores, addScore, updateScore, deleteScore };
