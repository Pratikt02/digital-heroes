const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/charity.service");
const { MIN_CHARITY_PERCENT } = require("../services/charityRules");

const paged = (r, mapper) => ({
  charities: r.items.map(mapper),
  page: r.page,
  limit: r.limit,
  total: r.total,
  totalPages: r.totalPages,
});

// ---------- Public ----------
exports.list = asyncHandler(async (req, res) => {
  // Public visitors only ever see active charities, whatever ?active= says.
  const r = await service.listCharities({ ...req.validatedQuery, active: true });
  res.json(paged(r, (c) => c.toListItem()));
});

exports.featured = asyncHandler(async (req, res) => {
  const items = await service.featuredCharities();
  res.json({ charities: items.map((c) => c.toListItem()) });
});

exports.categories = asyncHandler(async (req, res) => {
  res.json({ categories: await service.listCategories() });
});

exports.detail = asyncHandler(async (req, res) => {
  const charity = await service.getCharity(req.params.idOrSlug, { publicOnly: true });
  res.json({ charity: charity.toDetail() });
});

// ---------- Admin ----------
exports.adminList = asyncHandler(async (req, res) => {
  const r = await service.listCharities(req.validatedQuery);
  res.json(paged(r, (c) => c.toAdmin()));
});

exports.adminCreate = asyncHandler(async (req, res) => {
  const charity = await service.createCharity(req.body);
  res.status(201).json({ charity: charity.toAdmin() });
});

exports.adminUpdate = asyncHandler(async (req, res) => {
  const charity = await service.updateCharity(req.params.id, req.body);
  res.json({ charity: charity.toAdmin() });
});

exports.adminDelete = asyncHandler(async (req, res) => {
  await service.deleteCharity(req.params.id);
  res.json({ message: "Charity deleted" });
});

// ---------- The signed-in user's own choice ----------
const myCharityResponse = async (user) => {
  const charity = await service.getUserCharity(user);
  return {
    charity: charity ? charity.toListItem() : null,
    available: charity ? charity.active : false, // false -> the user should pick a new one
    percentage: user.charityPercentage,
    minPercentage: MIN_CHARITY_PERCENT,
  };
};

exports.getMine = asyncHandler(async (req, res) => {
  res.json(await myCharityResponse(req.user));
});

exports.setMine = asyncHandler(async (req, res) => {
  await service.setUserCharity(req.user, req.body);
  res.json(await myCharityResponse(req.user));
});
