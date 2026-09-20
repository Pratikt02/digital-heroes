const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { COOKIE_NAME, verifyToken } = require("../utils/token");

// Loads the user from the JWT cookie. Reads fresh from the DB so role and
// subscription changes (for example a webhook marking a lapse) apply immediately.
const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new AppError("Authentication required", 401);

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError("Session expired, please log in again", 401);
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new AppError("Account no longer exists", 401);

  req.user = user;
  next();
});

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") return next(new AppError("Admin access required", 403));
  next();
};

// Used in Phase 5+ to gate subscriber-only features (score entry, draws).
const requireSubscription = (req, res, next) => {
  if (!req.user?.isSubscribed) return next(new AppError("An active subscription is required", 402));
  next();
};

module.exports = { requireAuth, requireAdmin, requireSubscription };
