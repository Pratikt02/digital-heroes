const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/adminUser.service");
const report = require("../services/report.service");

// ---------- users ----------
exports.list = asyncHandler(async (req, res) => res.json(await service.listUsers(req.validatedQuery)));
exports.get = asyncHandler(async (req, res) => res.json(await service.userDetail(req.params.id)));
exports.update = asyncHandler(async (req, res) => res.json({ user: (await service.updateUser(req.user, req.params.id, req.body)).toPublic() }));

// ---------- subscriptions ----------
exports.overrideSubscription = asyncHandler(async (req, res) => res.json({ user: (await service.overrideSubscription(req.params.id, req.body)).toPublic() }));
exports.cancelSubscription = asyncHandler(async (req, res) => res.json({ user: (await service.cancelSubscription(req.params.id)).toPublic() }));
exports.syncSubscription = asyncHandler(async (req, res) => res.json({ user: (await service.syncSubscription(req.params.id)).toPublic() }));

// ---------- golf scores ----------
exports.addScore = asyncHandler(async (req, res) => res.status(201).json({ score: (await service.addScore(req.params.id, req.body)).toPublic() }));
exports.updateScore = asyncHandler(async (req, res) => res.json({ score: (await service.updateScore(req.params.id, req.params.scoreId, req.body)).toPublic() }));
exports.deleteScore = asyncHandler(async (req, res) => {
  await service.deleteScore(req.params.id, req.params.scoreId);
  res.json({ message: "Score deleted" });
});

// ---------- reports ----------
exports.overview = asyncHandler(async (req, res) => res.json(await report.overview()));
exports.charities = asyncHandler(async (req, res) => res.json(await report.charities()));
exports.revenue = asyncHandler(async (req, res) => res.json(await report.revenue()));
