const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/score.service");
const { MAX_SCORES } = require("../services/scoreRules");

exports.list = asyncHandler(async (req, res) => {
  const scores = await service.listScores(req.user._id);
  res.json({ scores: scores.map((s) => s.toPublic()), max: MAX_SCORES });
});

exports.create = asyncHandler(async (req, res) => {
  const score = await service.addScore(req.user._id, req.body);
  res.status(201).json({ score: score.toPublic() });
});

exports.update = asyncHandler(async (req, res) => {
  const score = await service.updateScore(req.user._id, req.params.id, req.body);
  res.json({ score: score.toPublic() });
});

exports.remove = asyncHandler(async (req, res) => {
  await service.deleteScore(req.user._id, req.params.id);
  res.json({ message: "Score deleted" });
});
