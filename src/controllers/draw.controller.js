const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const service = require("../services/draw.service");
const { isValidMonthKey } = require("../utils/month");
const { safeEqual } = require("../utils/razorpaySignature");

// ---------- public / subscriber ----------
exports.listPublished = asyncHandler(async (req, res) => {
  const draws = await service.listPublished();
  res.json({ draws: draws.map((d) => d.toPublic()) });
});

exports.next = asyncHandler(async (req, res) => res.json(await service.nextDrawInfo()));

exports.getByMonth = asyncHandler(async (req, res) => {
  if (!isValidMonthKey(req.params.month)) throw new AppError("Month must look like 2026-09", 400);
  res.json({ draw: (await service.getPublishedByMonth(req.params.month)).toPublic() });
});

exports.mine = asyncHandler(async (req, res) => res.json(await service.myParticipation(req.user)));

// ---------- admin ----------
exports.adminList = asyncHandler(async (req, res) => {
  const draws = await service.listAllDraws();
  // The list omits per-draw detail; open one draw to see its full result.
  res.json({
    draws: draws.map((d) => {
      const a = d.toAdmin();
      return { ...a, result: a.result && { numbers: a.result.numbers, poolTotal: a.result.poolTotal, eligibleCount: a.result.eligibleCount } };
    }),
  });
});

exports.adminGet = asyncHandler(async (req, res) => {
  const { draw, winners } = await service.drawWithWinners(req.params.id);
  res.json({ draw: draw.toAdmin(), winners });
});

exports.adminCreate = asyncHandler(async (req, res) => {
  const draw = await service.createDraw(req.body, req.user._id);
  res.status(201).json({ draw: draw.toAdmin() });
});

exports.adminUpdate = asyncHandler(async (req, res) => {
  res.json({ draw: (await service.updateDraw(req.params.id, req.body)).toAdmin() });
});

exports.adminSimulate = asyncHandler(async (req, res) => {
  await service.simulateDraw(req.params.id);
  const { draw, winners } = await service.drawWithWinners(req.params.id);
  res.json({ draw: draw.toAdmin(), winners });
});

exports.adminPublish = asyncHandler(async (req, res) => {
  const draw = await service.publishDraw(req.params.id, req.user._id);
  res.json({ draw: draw.toAdmin() });
});

exports.adminDelete = asyncHandler(async (req, res) => {
  await service.deleteDraw(req.params.id);
  res.json({ message: "Draw deleted" });
});

// ---------- cron ----------
// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>". It only creates and
// simulates last month's draw; publishing is always a deliberate admin action.
exports.cronMonthly = asyncHandler(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new AppError("Cron is not configured", 503);
  if (!safeEqual(req.get("authorization") || "", `Bearer ${secret}`)) throw new AppError("Unauthorized", 401);
  res.json(await service.ensureMonthlyDraw());
});
