// Database side of the charity system. Pure rules live in charityRules.js.
const Charity = require("../models/Charity");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const { slugify } = require("./charityRules");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // stops users injecting regex into search

async function uniqueSlug(name) {
  const base = slugify(name);
  let slug = base;
  for (let n = 2; await Charity.exists({ slug }); n++) slug = `${base}-${n}`;
  return slug;
}

async function listCharities({ search, category, featured, active, page, limit }) {
  const filter = {};
  if (active !== undefined) filter.active = active;
  if (category) filter.category = category;
  if (featured !== undefined) filter.featured = featured;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { shortDescription: rx }, { description: rx }];
  }

  const [items, total] = await Promise.all([
    Charity.find(filter)
      .sort({ featured: -1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Charity.countDocuments(filter),
  ]);
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

const featuredCharities = () => Charity.find({ active: true, featured: true }).sort({ name: 1 }).limit(6);

async function listCategories() {
  const cats = await Charity.distinct("category", { active: true });
  return cats.sort();
}

// Accepts a Mongo id or a slug. Public callers only ever see active charities.
async function getCharity(idOrSlug, { publicOnly = false } = {}) {
  const isId = /^[a-f\d]{24}$/i.test(idOrSlug);
  const charity = await (isId ? Charity.findById(idOrSlug) : Charity.findOne({ slug: idOrSlug.toLowerCase() }));
  if (!charity || (publicOnly && !charity.active)) throw new AppError("Charity not found", 404);
  return charity;
}

async function createCharity(data) {
  const slug = await uniqueSlug(data.name);
  try {
    return await Charity.create({ ...data, slug });
  } catch (err) {
    if (err.code === 11000) throw new AppError("A charity with that name already exists", 409);
    throw err;
  }
}

async function updateCharity(id, changes) {
  const charity = await getCharity(id);
  Object.assign(charity, changes); // slug is deliberately never changed, so public links stay stable
  await charity.save();
  return charity;
}

// A charity that subscribers have chosen can't be deleted (it would orphan their choice
// and the contribution history). Deactivate it instead, which hides it publicly.
async function deleteCharity(id) {
  const charity = await getCharity(id);
  const inUse = await User.countDocuments({ charityId: charity._id });
  if (inUse > 0) {
    throw new AppError(`${inUse} subscriber(s) have selected this charity. Set it to inactive instead of deleting it.`, 409);
  }
  await charity.deleteOne();
}

// The user's own choice. The 10% minimum is enforced by the Zod schema AND the Mongoose model.
async function setUserCharity(user, { charityId, percentage }) {
  if (charityId) {
    const charity = await Charity.findOne({ _id: charityId, active: true });
    if (!charity) throw new AppError("Charity not found or no longer available", 404);
    user.charityId = charity._id;
  }
  if (percentage !== undefined) user.charityPercentage = percentage;
  await user.save();
  return user;
}

const getUserCharity = (user) => (user.charityId ? Charity.findById(user.charityId) : null);

module.exports = {
  listCharities,
  featuredCharities,
  listCategories,
  getCharity,
  createCharity,
  updateCharity,
  deleteCharity,
  setUserCharity,
  getUserCharity,
};
