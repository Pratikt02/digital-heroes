const bcrypt = require("bcryptjs");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { setAuthCookie, clearAuthCookie } = require("../utils/token");

// Hash of a throwaway string, generated once at startup. Compared against when the
// email is unknown so login takes the same time either way (blocks timing-based account enumeration).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.exists({ email })) throw new AppError("An account with this email already exists", 409);

  // Role is never taken from the request body, so public signup always creates a subscriber.
  const user = await User.create({ name, email, passwordHash: await User.hashPassword(password) });

  setAuthCookie(res, user._id);
  res.status(201).json({ user: user.toPublic() });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  const ok = user ? await user.comparePassword(password) : (await bcrypt.compare(password, DUMMY_HASH), false);

  if (!user || !ok) throw new AppError("Invalid email or password", 401);

  setAuthCookie(res, user._id);
  res.json({ user: user.toPublic() });
});

exports.logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
};

// The client calls this on app load to restore the session.
exports.me = (req, res) => {
  res.json({ user: req.user.toPublic() });
};
