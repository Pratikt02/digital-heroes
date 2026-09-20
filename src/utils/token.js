// JWT creation + httpOnly cookie helpers.
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const COOKIE_NAME = "token";
const maxAgeMs = env.JWT_EXPIRES_DAYS * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true, // not readable from JS, which blocks token theft via XSS
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, { expiresIn: `${env.JWT_EXPIRES_DAYS}d` });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

function setAuthCookie(res, userId) {
  res.cookie(COOKIE_NAME, signToken(userId), { ...cookieOptions, maxAge: maxAgeMs });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

module.exports = { COOKIE_NAME, signToken, verifyToken, setAuthCookie, clearAuthCookie };
