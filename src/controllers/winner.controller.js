const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/winner.service");

// ---------- the winning player ----------
exports.mine = asyncHandler(async (req, res) => res.json(await service.listMine(req.user._id)));

exports.uploadProof = asyncHandler(async (req, res) => {
  const winner = await service.submitProof(req.user, req.params.id, req.file);
  res.json({ winning: winner.toOwner() });
});

// ---------- admin ----------
exports.adminList = asyncHandler(async (req, res) => res.json(await service.listWinners(req.validatedQuery)));

exports.adminGet = asyncHandler(async (req, res) => res.json({ winner: (await service.getWinner(req.params.id)).toAdmin() }));

exports.adminApprove = asyncHandler(async (req, res) => res.json({ winner: (await service.approve(req.params.id, req.user._id)).toAdmin() }));

exports.adminReject = asyncHandler(async (req, res) => res.json({ winner: (await service.reject(req.params.id, req.user._id, req.body.reason)).toAdmin() }));

exports.adminMarkPaid = asyncHandler(async (req, res) => res.json({ winner: (await service.markPaid(req.params.id, req.user._id)).toAdmin() }));
